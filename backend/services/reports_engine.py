"""
Advanced Report Generation Engine
Motor central para generación de reportes con ML y filtros de seguridad
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import select, func, and_, or_, case, desc
from sqlalchemy.orm import Session, selectinload
from redis import Redis
import pandas as pd
import numpy as np
from decimal import Decimal
import hashlib

from ..models.reports_models import (
    ReportTemplate, GeneratedReport, AccessLevel, 
    ReportType, EmployeeMetrics, ReportPermission
)
from ..models.business_models import Sale, Booking, Payment, Product
from ..models.crm_models import Customer, Employee, Branch
from .cache_service import CacheService
from .security_service import SecurityService
from .audit_service import AuditService

class ReportEngine:
    """Motor principal de generación de reportes"""
    
    def __init__(self, db: Session, redis_client: Redis, current_user: Dict):
        self.db = db
        self.redis = redis_client
        self.current_user = current_user
        self.cache = CacheService(redis_client)
        self.security = SecurityService(db)
        self.audit = AuditService(db)
        
    async def generate_report(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Genera un reporte basado en la solicitud
        
        Args:
            request: Diccionario con parámetros del reporte
            
        Returns:
            Dict con el reporte generado
        """
        try:
            # Validar permisos
            if not await self._check_permissions(request):
                raise PermissionError("No tiene permisos para generar este reporte")
            
            # Verificar cache
            cache_key = self._generate_cache_key(request)
            cached_report = await self.cache.get(cache_key)
            if cached_report and not request.get('force_refresh'):
                return cached_report
            
            # Aplicar filtros de seguridad
            request = await self._apply_security_filters(request)
            
            # Generar reporte según tipo
            report_type = ReportType(request['type'])
            
            if report_type == ReportType.SALES_NET:
                report_data = await self._generate_sales_net_report(request)
            elif report_type == ReportType.SALES_GROSS:
                report_data = await self._generate_sales_gross_report(request)
            elif report_type == ReportType.COMMISSIONS:
                report_data = await self._generate_commissions_report(request)
            elif report_type == ReportType.PASSENGERS:
                report_data = await self._generate_passengers_report(request)
            elif report_type == ReportType.PROFITABILITY:
                report_data = await self._generate_profitability_report(request)
            elif report_type == ReportType.COMPARATIVE:
                report_data = await self._generate_comparative_report(request)
            elif report_type == ReportType.GEOGRAPHIC:
                report_data = await self._generate_geographic_report(request)
            elif report_type == ReportType.BENCHMARKING:
                report_data = await self._generate_benchmarking_report(request)
            elif report_type == ReportType.CUSTOM:
                report_data = await self._generate_custom_report(request)
            else:
                report_data = await self._generate_predictive_report(request)
            
            # Enriquecer con metadatos
            report = await self._enrich_report(report_data, request)
            
            # Guardar en base de datos
            saved_report = await self._save_report(report, request)
            
            # Cachear resultado
            await self.cache.set(cache_key, report, ttl=3600)  # 1 hora
            
            # Auditar
            await self.audit.log_report_generation(
                self.current_user['id'],
                saved_report.id,
                request
            )
            
            return report
            
        except Exception as e:
            await self.audit.log_error(
                self.current_user['id'],
                f"Error generando reporte: {str(e)}",
                request
            )
            raise
    
    async def _check_permissions(self, request: Dict) -> bool:
        """Verifica si el usuario tiene permisos para el reporte"""
        user_id = self.current_user['id']
        user_role = self.current_user.get('role')
        user_access_level = AccessLevel[self.current_user.get('access_level', 'SALES_AGENT')]
        
        # Admin siempre tiene acceso
        if user_access_level == AccessLevel.ADMIN:
            return True
        
        # Verificar permisos específicos
        permission = self.db.query(ReportPermission).filter(
            and_(
                ReportPermission.user_id == user_id,
                ReportPermission.report_type == ReportType(request['type']),
                ReportPermission.is_active == True,
                or_(
                    ReportPermission.valid_until == None,
                    ReportPermission.valid_until > datetime.utcnow()
                )
            )
        ).first()
        
        if permission and permission.can_generate:
            return True
        
        # Verificar nivel de acceso mínimo
        template = None
        if request.get('template_id'):
            template = self.db.query(ReportTemplate).get(request['template_id'])
            if template and user_access_level.value <= template.min_access_level.value:
                return True
        
        # Verificar acceso por rol
        if user_role in ['admin', 'director', 'manager']:
            return True
        
        return False
    
    async def _apply_security_filters(self, request: Dict) -> Dict:
        """Aplica filtros de seguridad basados en permisos del usuario"""
        user_access_level = AccessLevel[self.current_user.get('access_level', 'SALES_AGENT')]
        filters = request.get('filters', {})
        
        # Aplicar restricciones según nivel de acceso
        if user_access_level == AccessLevel.SALES_AGENT:
            # Solo puede ver sus propias ventas
            filters['employee_id'] = self.current_user['id']
            
        elif user_access_level == AccessLevel.SUPERVISOR:
            # Solo puede ver su equipo
            team_members = await self._get_team_members(self.current_user['id'])
            filters['employee_id'] = {'$in': team_members}
            
        elif user_access_level == AccessLevel.BRANCH_DIRECTOR:
            # Solo puede ver su sucursal
            filters['branch_id'] = self.current_user.get('branch_id')
            
        elif user_access_level == AccessLevel.REGIONAL_MANAGER:
            # Solo puede ver su región
            filters['region_id'] = self.current_user.get('region_id')
        
        # Aplicar restricciones de permisos específicos
        permission = self.db.query(ReportPermission).filter(
            and_(
                ReportPermission.user_id == self.current_user['id'],
                ReportPermission.is_active == True
            )
        ).first()
        
        if permission and permission.data_filters:
            filters.update(permission.data_filters)
        
        if permission and permission.branch_restriction:
            filters['branch_id'] = {'$in': permission.branch_restriction}
        
        if permission and permission.date_restriction:
            if permission.date_restriction.get('max_days_back'):
                max_date = datetime.utcnow()
                min_date = max_date - timedelta(days=permission.date_restriction['max_days_back'])
                filters['date_from'] = max(
                    filters.get('date_from', min_date),
                    min_date
                )
        
        request['filters'] = filters
        return request
    
    async def _generate_sales_net_report(self, request: Dict) -> Dict:
        """Genera reporte de ventas netas (sin comisiones)"""
        filters = request.get('filters', {})
        date_from = datetime.fromisoformat(request['date_from'])
        date_to = datetime.fromisoformat(request['date_to'])
        
        # Query principal
        query = self.db.query(
            Sale.id,
            Sale.total_amount,
            Sale.commission_amount,
            Sale.net_amount,
            Sale.employee_id,
            Sale.product_id,
            Sale.branch_id,
            Sale.created_at,
            Employee.name.label('employee_name'),
            Product.name.label('product_name'),
            Branch.name.label('branch_name')
        ).join(
            Employee, Sale.employee_id == Employee.id
        ).join(
            Product, Sale.product_id == Product.id
        ).join(
            Branch, Sale.branch_id == Branch.id
        ).filter(
            and_(
                Sale.created_at >= date_from,
                Sale.created_at <= date_to,
                Sale.status == 'completed'
            )
        )
        
        # Aplicar filtros adicionales
        if filters.get('employee_id'):
            if isinstance(filters['employee_id'], dict) and '$in' in filters['employee_id']:
                query = query.filter(Sale.employee_id.in_(filters['employee_id']['$in']))
            else:
                query = query.filter(Sale.employee_id == filters['employee_id'])
        
        if filters.get('branch_id'):
            if isinstance(filters['branch_id'], dict) and '$in' in filters['branch_id']:
                query = query.filter(Sale.branch_id.in_(filters['branch_id']['$in']))
            else:
                query = query.filter(Sale.branch_id == filters['branch_id'])
        
        if filters.get('product_id'):
            query = query.filter(Sale.product_id == filters['product_id'])
        
        # Ejecutar query
        sales = query.all()
        
        # Procesar datos
        total_sales_gross = sum(s.total_amount for s in sales)
        total_commissions = sum(s.commission_amount for s in sales)
        total_sales_net = total_sales_gross - total_commissions
        
        # Agrupar por empleado
        by_employee = {}
        for sale in sales:
            emp_id = sale.employee_id
            if emp_id not in by_employee:
                by_employee[emp_id] = {
                    'employee_id': emp_id,
                    'name': sale.employee_name,
                    'sales_gross': 0,
                    'sales_net': 0,
                    'commission': 0,
                    'count': 0
                }
            by_employee[emp_id]['sales_gross'] += float(sale.total_amount)
            by_employee[emp_id]['sales_net'] += float(sale.net_amount)
            by_employee[emp_id]['commission'] += float(sale.commission_amount)
            by_employee[emp_id]['count'] += 1
        
        # Agrupar por producto
        by_product = {}
        for sale in sales:
            prod_id = sale.product_id
            if prod_id not in by_product:
                by_product[prod_id] = {
                    'product_id': prod_id,
                    'name': sale.product_name,
                    'total': 0,
                    'count': 0
                }
            by_product[prod_id]['total'] += float(sale.net_amount)
            by_product[prod_id]['count'] += 1
        
        # Agrupar por sucursal
        by_branch = {}
        for sale in sales:
            branch_id = sale.branch_id
            if branch_id not in by_branch:
                by_branch[branch_id] = {
                    'branch_id': branch_id,
                    'name': sale.branch_name,
                    'total': 0,
                    'count': 0
                }
            by_branch[branch_id]['total'] += float(sale.net_amount)
            by_branch[branch_id]['count'] += 1
        
        # Calcular tendencia (últimos 7 días vs 7 días anteriores)
        week_ago = date_to - timedelta(days=7)
        two_weeks_ago = date_to - timedelta(days=14)
        
        recent_sales = self.db.query(func.sum(Sale.net_amount)).filter(
            and_(
                Sale.created_at >= week_ago,
                Sale.created_at <= date_to,
                Sale.status == 'completed'
            )
        ).scalar() or 0
        
        previous_sales = self.db.query(func.sum(Sale.net_amount)).filter(
            and_(
                Sale.created_at >= two_weeks_ago,
                Sale.created_at < week_ago,
                Sale.status == 'completed'
            )
        ).scalar() or 0
        
        trend = 'stable'
        trend_percentage = 0
        if previous_sales > 0:
            trend_percentage = ((recent_sales - previous_sales) / previous_sales) * 100
            if trend_percentage > 5:
                trend = 'increasing'
            elif trend_percentage < -5:
                trend = 'decreasing'
        
        return {
            'summary': {
                'total_sales_gross': float(total_sales_gross),
                'total_sales_net': float(total_sales_net),
                'total_commissions': float(total_commissions),
                'total_transactions': len(sales),
                'average_transaction': float(total_sales_net / len(sales)) if sales else 0,
                'trend': trend,
                'trend_percentage': float(trend_percentage)
            },
            'by_employee': list(by_employee.values()),
            'by_product': list(by_product.values()),
            'by_branch': list(by_branch.values()),
            'daily_breakdown': await self._get_daily_breakdown(sales),
            'top_performers': sorted(
                by_employee.values(), 
                key=lambda x: x['sales_net'], 
                reverse=True
            )[:10]
        }
    
    async def _generate_sales_gross_report(self, request: Dict) -> Dict:
        """Genera reporte de ventas brutas (con comisiones)"""
        # Similar a sales_net pero incluyendo comisiones
        base_report = await self._generate_sales_net_report(request)
        
        # Ajustar para incluir comisiones en los totales
        for emp in base_report['by_employee']:
            emp['total'] = emp['sales_gross']
        
        return base_report
    
    async def _generate_commissions_report(self, request: Dict) -> Dict:
        """Genera reporte de comisiones"""
        filters = request.get('filters', {})
        date_from = datetime.fromisoformat(request['date_from'])
        date_to = datetime.fromisoformat(request['date_to'])
        
        # Query para comisiones
        query = self.db.query(
            Sale.employee_id,
            Employee.name.label('employee_name'),
            func.sum(Sale.commission_amount).label('total_commission'),
            func.count(Sale.id).label('sales_count'),
            func.avg(Sale.commission_amount).label('avg_commission'),
            func.max(Sale.commission_amount).label('max_commission'),
            func.min(Sale.commission_amount).label('min_commission')
        ).join(
            Employee, Sale.employee_id == Employee.id
        ).filter(
            and_(
                Sale.created_at >= date_from,
                Sale.created_at <= date_to,
                Sale.status == 'completed'
            )
        )
        
        # Aplicar filtros
        if filters.get('employee_id'):
            query = query.filter(Sale.employee_id == filters['employee_id'])
        if filters.get('branch_id'):
            query = query.filter(Sale.branch_id == filters['branch_id'])
        
        # Agrupar por empleado
        query = query.group_by(Sale.employee_id, Employee.name)
        
        results = query.all()
        
        # Procesar resultados
        commission_data = []
        total_commissions = 0
        
        for row in results:
            total_commissions += float(row.total_commission or 0)
            commission_data.append({
                'employee_id': row.employee_id,
                'employee_name': row.employee_name,
                'total_commission': float(row.total_commission or 0),
                'sales_count': row.sales_count,
                'avg_commission': float(row.avg_commission or 0),
                'max_commission': float(row.max_commission or 0),
                'min_commission': float(row.min_commission or 0)
            })
        
        # Ordenar por comisión total
        commission_data.sort(key=lambda x: x['total_commission'], reverse=True)
        
        # Calcular distribución de comisiones
        commission_ranges = {
            '0-100': 0,
            '100-500': 0,
            '500-1000': 0,
            '1000-5000': 0,
            '5000+': 0
        }
        
        for item in commission_data:
            commission = item['total_commission']
            if commission < 100:
                commission_ranges['0-100'] += 1
            elif commission < 500:
                commission_ranges['100-500'] += 1
            elif commission < 1000:
                commission_ranges['500-1000'] += 1
            elif commission < 5000:
                commission_ranges['1000-5000'] += 1
            else:
                commission_ranges['5000+'] += 1
        
        return {
            'summary': {
                'total_commissions': total_commissions,
                'total_employees': len(commission_data),
                'average_commission': total_commissions / len(commission_data) if commission_data else 0,
                'top_earner': commission_data[0] if commission_data else None
            },
            'by_employee': commission_data,
            'commission_distribution': commission_ranges,
            'top_10': commission_data[:10]
        }
    
    async def _generate_passengers_report(self, request: Dict) -> Dict:
        """Genera reporte de número de pasajeros"""
        filters = request.get('filters', {})
        date_from = datetime.fromisoformat(request['date_from'])
        date_to = datetime.fromisoformat(request['date_to'])
        
        # Query para bookings y pasajeros
        query = self.db.query(
            Booking.id,
            Booking.passenger_count,
            Booking.product_type,
            Booking.employee_id,
            Booking.branch_id,
            Booking.created_at,
            Employee.name.label('employee_name'),
            Branch.name.label('branch_name')
        ).join(
            Employee, Booking.employee_id == Employee.id
        ).join(
            Branch, Booking.branch_id == Branch.id
        ).filter(
            and_(
                Booking.created_at >= date_from,
                Booking.created_at <= date_to,
                Booking.status.in_(['confirmed', 'completed'])
            )
        )
        
        # Aplicar filtros
        if filters.get('employee_id'):
            query = query.filter(Booking.employee_id == filters['employee_id'])
        if filters.get('branch_id'):
            query = query.filter(Booking.branch_id == filters['branch_id'])
        if filters.get('product_type'):
            query = query.filter(Booking.product_type == filters['product_type'])
        
        bookings = query.all()
        
        # Procesar datos
        total_passengers = sum(b.passenger_count for b in bookings)
        
        # Por tipo de producto
        by_product = {}
        for booking in bookings:
            prod_type = booking.product_type
            if prod_type not in by_product:
                by_product[prod_type] = {
                    'type': prod_type,
                    'passengers': 0,
                    'bookings': 0
                }
            by_product[prod_type]['passengers'] += booking.passenger_count
            by_product[prod_type]['bookings'] += 1
        
        # Por empleado
        by_employee = {}
        for booking in bookings:
            emp_id = booking.employee_id
            if emp_id not in by_employee:
                by_employee[emp_id] = {
                    'employee_id': emp_id,
                    'name': booking.employee_name,
                    'passengers': 0,
                    'bookings': 0
                }
            by_employee[emp_id]['passengers'] += booking.passenger_count
            by_employee[emp_id]['bookings'] += 1
        
        return {
            'summary': {
                'total_passengers': total_passengers,
                'total_bookings': len(bookings),
                'average_passengers_per_booking': total_passengers / len(bookings) if bookings else 0
            },
            'by_product_type': list(by_product.values()),
            'by_employee': sorted(
                by_employee.values(), 
                key=lambda x: x['passengers'], 
                reverse=True
            ),
            'daily_passengers': await self._get_daily_passengers(bookings)
        }
    
    async def _get_daily_breakdown(self, sales: List) -> List[Dict]:
        """Obtiene desglose diario de ventas"""
        daily = {}
        
        for sale in sales:
            date = sale.created_at.date()
            if date not in daily:
                daily[date] = {
                    'date': date.isoformat(),
                    'sales_count': 0,
                    'total_amount': 0
                }
            daily[date]['sales_count'] += 1
            daily[date]['total_amount'] += float(sale.net_amount)
        
        return sorted(daily.values(), key=lambda x: x['date'])
    
    async def _get_daily_passengers(self, bookings: List) -> List[Dict]:
        """Obtiene desglose diario de pasajeros"""
        daily = {}
        
        for booking in bookings:
            date = booking.created_at.date()
            if date not in daily:
                daily[date] = {
                    'date': date.isoformat(),
                    'bookings': 0,
                    'passengers': 0
                }
            daily[date]['bookings'] += 1
            daily[date]['passengers'] += booking.passenger_count
        
        return sorted(daily.values(), key=lambda x: x['date'])
    
    async def _get_team_members(self, supervisor_id: str) -> List[str]:
        """Obtiene IDs de miembros del equipo de un supervisor"""
        members = self.db.query(Employee.id).filter(
            Employee.supervisor_id == supervisor_id
        ).all()
        return [m.id for m in members]
    
    def _generate_cache_key(self, request: Dict) -> str:
        """Genera clave única para cache"""
        # Crear string con parámetros ordenados
        params = json.dumps(request, sort_keys=True)
        # Agregar ID de usuario para seguridad
        params += f"_user_{self.current_user['id']}"
        # Generar hash
        return f"report:{hashlib.sha256(params.encode()).hexdigest()}"
    
    async def _enrich_report(self, report_data: Dict, request: Dict) -> Dict:
        """Enriquece el reporte con metadatos"""
        return {
            'report_id': f"RPT-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
            'type': request['type'],
            'generated_at': datetime.utcnow().isoformat(),
            'generated_by': self.current_user['name'],
            'period': {
                'from': request['date_from'],
                'to': request['date_to']
            },
            'filters_applied': request.get('filters', {}),
            'data': report_data,
            'metadata': {
                'version': '2.0',
                'engine': 'ReportEngine',
                'cache_ttl': 3600,
                'permissions_checked': True
            }
        }
    
    async def _save_report(self, report: Dict, request: Dict) -> GeneratedReport:
        """Guarda el reporte en la base de datos"""
        generated_report = GeneratedReport(
            report_number=report['report_id'],
            template_id=request.get('template_id'),
            date_from=datetime.fromisoformat(request['date_from']),
            date_to=datetime.fromisoformat(request['date_to']),
            data=report['data'],
            summary=report['data'].get('summary', {}),
            generated_by=self.current_user['id'],
            generation_time=0.5  # TODO: Medir tiempo real
        )
        
        # Extraer métricas si están disponibles
        if 'summary' in report['data']:
            summary = report['data']['summary']
            generated_report.total_sales_gross = summary.get('total_sales_gross', 0)
            generated_report.total_sales_net = summary.get('total_sales_net', 0)
            generated_report.total_commissions = summary.get('total_commissions', 0)
            generated_report.total_passengers = summary.get('total_passengers', 0)
        
        self.db.add(generated_report)
        self.db.commit()
        
        return generated_report
    
    async def _generate_profitability_report(self, request: Dict) -> Dict:
        """Genera reporte de análisis de rentabilidad"""
        # Implementación pendiente
        return {'message': 'Profitability report generation pending'}
    
    async def _generate_comparative_report(self, request: Dict) -> Dict:
        """Genera reporte comparativo histórico"""
        # Implementación pendiente
        return {'message': 'Comparative report generation pending'}
    
    async def _generate_geographic_report(self, request: Dict) -> Dict:
        """Genera reporte de análisis geográfico"""
        # Implementación pendiente
        return {'message': 'Geographic report generation pending'}
    
    async def _generate_benchmarking_report(self, request: Dict) -> Dict:
        """Genera reporte de benchmarking competitivo"""
        # Implementación pendiente
        return {'message': 'Benchmarking report generation pending'}
    
    async def _generate_custom_report(self, request: Dict) -> Dict:
        """Genera reporte personalizado"""
        # Implementación pendiente
        return {'message': 'Custom report generation pending'}
    
    async def _generate_predictive_report(self, request: Dict) -> Dict:
        """Genera reporte con predicciones ML"""
        # Se integrará con reports_ml_predictive.py
        return {'message': 'Predictive report generation pending'}