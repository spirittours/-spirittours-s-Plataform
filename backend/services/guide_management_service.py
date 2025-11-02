"""
Guide Management Service for Tourism Operations
Manages licensed guides, tour leaders, and local guides
"""

import asyncio
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple, Any
from decimal import Decimal
from sqlalchemy import select, func, and_, or_, between, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
import logging
from enum import Enum
import uuid
import json

from models.package_quotation import (
    TourGuide, GuideType, GuideAssignment,
    GuideAvailability, GuideLanguage,
    GuideSpecialization, GuideCertification,
    GuideRate, GuidePaymentType,
    ItineraryDay, PackageQuotation
)
from services.email_service import EmailService
from services.notification_service import NotificationService
from core.cache import cache_manager
from core.exceptions import BusinessLogicError

logger = logging.getLogger(__name__)


class GuideStatus(Enum):
    """Estado del guía"""
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    ON_VACATION = "ON_VACATION"
    UNAVAILABLE = "UNAVAILABLE"
    PENDING_CONFIRMATION = "PENDING_CONFIRMATION"


class GuideManagementService:
    """
    Servicio completo para gestión de guías turísticos
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_service = EmailService()
        self.notification_service = NotificationService(db)
        
    # ==================== GESTIÓN DE GUÍAS ====================
    
    async def create_tour_guide(
        self,
        guide_data: Dict[str, Any],
        user_id: str
    ) -> TourGuide:
        """
        Crear un nuevo guía turístico en el sistema
        """
        try:
            # Validar datos requeridos
            required_fields = ['first_name', 'last_name', 'email', 'phone', 'guide_type']
            for field in required_fields:
                if field not in guide_data:
                    raise BusinessLogicError(f"Campo requerido: {field}")
            
            # Verificar si el email ya existe
            existing = await self.db.execute(
                select(TourGuide).where(TourGuide.email == guide_data['email'])
            )
            if existing.scalar_one_or_none():
                raise BusinessLogicError("Ya existe un guía con este email")
            
            # Crear el guía
            guide = TourGuide(
                id=f"GUIDE-{uuid.uuid4().hex[:8].upper()}",
                first_name=guide_data['first_name'],
                last_name=guide_data['last_name'],
                email=guide_data['email'],
                phone=guide_data['phone'],
                guide_type=GuideType[guide_data['guide_type']],
                license_number=guide_data.get('license_number'),
                license_expiry=guide_data.get('license_expiry'),
                specializations=guide_data.get('specializations', []),
                languages=guide_data.get('languages', ['Spanish']),
                years_experience=guide_data.get('years_experience', 0),
                rating=5.0,
                is_active=True,
                created_by=user_id,
                created_at=datetime.utcnow()
            )
            
            self.db.add(guide)
            
            # Crear tarifas base
            if 'base_rates' in guide_data:
                await self._create_guide_rates(guide.id, guide_data['base_rates'])
            
            # Crear disponibilidad inicial
            if 'availability' in guide_data:
                await self._set_guide_availability(guide.id, guide_data['availability'])
            
            await self.db.commit()
            
            # Enviar email de bienvenida
            await self._send_welcome_email(guide)
            
            logger.info(f"Guía creado: {guide.id} - {guide.full_name}")
            return guide
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creando guía: {str(e)}")
            raise
    
    async def update_tour_guide(
        self,
        guide_id: str,
        update_data: Dict[str, Any]
    ) -> TourGuide:
        """
        Actualizar información del guía
        """
        try:
            # Obtener el guía
            result = await self.db.execute(
                select(TourGuide).where(TourGuide.id == guide_id)
            )
            guide = result.scalar_one_or_none()
            
            if not guide:
                raise BusinessLogicError(f"Guía no encontrado: {guide_id}")
            
            # Actualizar campos permitidos
            allowed_fields = [
                'first_name', 'last_name', 'phone', 'address',
                'emergency_contact', 'license_number', 'license_expiry',
                'specializations', 'languages', 'bank_account',
                'tax_id', 'photo_url', 'bio', 'is_active'
            ]
            
            for field in allowed_fields:
                if field in update_data:
                    setattr(guide, field, update_data[field])
            
            guide.updated_at = datetime.utcnow()
            
            await self.db.commit()
            
            # Limpiar caché
            await cache_manager.delete(f"guide:{guide_id}")
            
            return guide
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error actualizando guía {guide_id}: {str(e)}")
            raise
    
    async def get_guide_by_id(self, guide_id: str) -> Optional[TourGuide]:
        """
        Obtener guía por ID con información completa
        """
        # Intentar obtener del caché
        cached = await cache_manager.get(f"guide:{guide_id}")
        if cached:
            return cached
        
        result = await self.db.execute(
            select(TourGuide)
            .options(
                selectinload(TourGuide.certifications),
                selectinload(TourGuide.rates),
                selectinload(TourGuide.assignments),
                selectinload(TourGuide.availability)
            )
            .where(TourGuide.id == guide_id)
        )
        
        guide = result.scalar_one_or_none()
        
        if guide:
            # Guardar en caché
            await cache_manager.set(f"guide:{guide_id}", guide, ttl=300)
        
        return guide
    
    # ==================== DISPONIBILIDAD ====================
    
    async def check_guide_availability(
        self,
        guide_id: str,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Verificar disponibilidad del guía para un período
        """
        try:
            # Obtener disponibilidad y asignaciones del guía
            availability_query = await self.db.execute(
                select(GuideAvailability)
                .where(
                    and_(
                        GuideAvailability.guide_id == guide_id,
                        GuideAvailability.date >= start_date,
                        GuideAvailability.date <= end_date
                    )
                )
            )
            availability = availability_query.scalars().all()
            
            # Obtener asignaciones existentes
            assignments_query = await self.db.execute(
                select(GuideAssignment)
                .where(
                    and_(
                        GuideAssignment.guide_id == guide_id,
                        GuideAssignment.assignment_date >= start_date,
                        GuideAssignment.assignment_date <= end_date,
                        GuideAssignment.status.in_(['CONFIRMED', 'PENDING'])
                    )
                )
            )
            assignments = assignments_query.scalars().all()
            
            # Construir calendario de disponibilidad
            calendar = {}
            current_date = start_date
            
            while current_date <= end_date:
                # Verificar si hay disponibilidad específica para esta fecha
                day_availability = next(
                    (a for a in availability if a.date == current_date),
                    None
                )
                
                # Verificar asignaciones del día
                day_assignments = [
                    a for a in assignments 
                    if a.assignment_date == current_date
                ]
                
                # Calcular horas disponibles
                if day_availability and day_availability.is_available:
                    available_hours = day_availability.available_hours or 8
                    assigned_hours = sum(a.hours for a in day_assignments)
                    remaining_hours = max(0, available_hours - assigned_hours)
                    status = 'AVAILABLE' if remaining_hours > 0 else 'FULLY_BOOKED'
                else:
                    remaining_hours = 0
                    status = 'UNAVAILABLE'
                
                calendar[current_date.isoformat()] = {
                    'date': current_date.isoformat(),
                    'status': status,
                    'available_hours': remaining_hours,
                    'assignments': len(day_assignments),
                    'notes': day_availability.notes if day_availability else None
                }
                
                current_date += timedelta(days=1)
            
            # Calcular resumen
            total_days = (end_date - start_date).days + 1
            available_days = sum(
                1 for day in calendar.values() 
                if day['status'] == 'AVAILABLE'
            )
            
            return {
                'guide_id': guide_id,
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'summary': {
                    'total_days': total_days,
                    'available_days': available_days,
                    'availability_percentage': (available_days / total_days * 100) if total_days > 0 else 0
                },
                'calendar': calendar
            }
            
        except Exception as e:
            logger.error(f"Error verificando disponibilidad: {str(e)}")
            raise
    
    async def set_guide_availability(
        self,
        guide_id: str,
        availability_data: List[Dict[str, Any]]
    ) -> List[GuideAvailability]:
        """
        Establecer disponibilidad del guía para múltiples fechas
        """
        try:
            created_availability = []
            
            for day_data in availability_data:
                # Verificar si ya existe disponibilidad para esta fecha
                existing = await self.db.execute(
                    select(GuideAvailability)
                    .where(
                        and_(
                            GuideAvailability.guide_id == guide_id,
                            GuideAvailability.date == day_data['date']
                        )
                    )
                )
                availability = existing.scalar_one_or_none()
                
                if availability:
                    # Actualizar existente
                    availability.is_available = day_data.get('is_available', True)
                    availability.available_hours = day_data.get('available_hours', 8)
                    availability.notes = day_data.get('notes')
                else:
                    # Crear nueva
                    availability = GuideAvailability(
                        id=f"AVAIL-{uuid.uuid4().hex[:8].upper()}",
                        guide_id=guide_id,
                        date=day_data['date'],
                        is_available=day_data.get('is_available', True),
                        available_hours=day_data.get('available_hours', 8),
                        notes=day_data.get('notes')
                    )
                    self.db.add(availability)
                
                created_availability.append(availability)
            
            await self.db.commit()
            
            return created_availability
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error estableciendo disponibilidad: {str(e)}")
            raise
    
    # ==================== ASIGNACIONES ====================
    
    async def assign_guide_to_itinerary(
        self,
        assignment_data: Dict[str, Any]
    ) -> GuideAssignment:
        """
        Asignar un guía a un día específico del itinerario
        """
        try:
            # Validar disponibilidad
            availability = await self.check_guide_availability(
                assignment_data['guide_id'],
                assignment_data['assignment_date'],
                assignment_data['assignment_date']
            )
            
            if availability['calendar'][assignment_data['assignment_date'].isoformat()]['status'] != 'AVAILABLE':
                raise BusinessLogicError("El guía no está disponible para esta fecha")
            
            # Obtener información del guía
            guide = await self.get_guide_by_id(assignment_data['guide_id'])
            if not guide:
                raise BusinessLogicError("Guía no encontrado")
            
            # Calcular costo
            cost = await self.calculate_guide_cost(
                guide_id=assignment_data['guide_id'],
                hours=assignment_data.get('hours', 8),
                service_type=assignment_data.get('service_type', 'FULL_DAY')
            )
            
            # Crear asignación
            assignment = GuideAssignment(
                id=f"ASSIGN-{uuid.uuid4().hex[:8].upper()}",
                guide_id=assignment_data['guide_id'],
                package_id=assignment_data.get('package_id'),
                itinerary_day_id=assignment_data.get('itinerary_day_id'),
                assignment_date=assignment_data['assignment_date'],
                start_time=assignment_data.get('start_time'),
                end_time=assignment_data.get('end_time'),
                hours=assignment_data.get('hours', 8),
                service_type=assignment_data.get('service_type', 'FULL_DAY'),
                languages_required=assignment_data.get('languages_required', ['Spanish']),
                special_requirements=assignment_data.get('special_requirements'),
                meeting_point=assignment_data.get('meeting_point'),
                cost=cost['total'],
                status='PENDING',
                created_at=datetime.utcnow()
            )
            
            self.db.add(assignment)
            await self.db.commit()
            
            # Enviar notificación al guía
            await self._notify_guide_assignment(guide, assignment)
            
            logger.info(f"Guía asignado: {assignment.id}")
            return assignment
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error asignando guía: {str(e)}")
            raise
    
    async def confirm_guide_assignment(
        self,
        assignment_id: str,
        confirmed_by_guide: bool = False
    ) -> GuideAssignment:
        """
        Confirmar asignación del guía
        """
        try:
            result = await self.db.execute(
                select(GuideAssignment)
                .options(selectinload(GuideAssignment.guide))
                .where(GuideAssignment.id == assignment_id)
            )
            assignment = result.scalar_one_or_none()
            
            if not assignment:
                raise BusinessLogicError("Asignación no encontrada")
            
            assignment.status = 'CONFIRMED'
            assignment.confirmed_at = datetime.utcnow()
            assignment.confirmed_by_guide = confirmed_by_guide
            
            await self.db.commit()
            
            # Notificar confirmación
            await self._notify_assignment_confirmation(assignment)
            
            return assignment
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error confirmando asignación: {str(e)}")
            raise
    
    # ==================== BÚSQUEDA Y FILTRADO ====================
    
    async def search_available_guides(
        self,
        search_criteria: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Buscar guías disponibles según criterios específicos
        """
        try:
            # Construir query base
            query = select(TourGuide).where(TourGuide.is_active == True)
            
            # Aplicar filtros
            if 'guide_type' in search_criteria:
                query = query.where(TourGuide.guide_type == GuideType[search_criteria['guide_type']])
            
            if 'languages' in search_criteria:
                # Filtrar por idiomas (JSON array)
                for lang in search_criteria['languages']:
                    query = query.where(
                        func.json_contains(TourGuide.languages, f'"{lang}"')
                    )
            
            if 'specializations' in search_criteria:
                # Filtrar por especializaciones
                for spec in search_criteria['specializations']:
                    query = query.where(
                        func.json_contains(TourGuide.specializations, f'"{spec}"')
                    )
            
            if 'min_experience' in search_criteria:
                query = query.where(TourGuide.years_experience >= search_criteria['min_experience'])
            
            if 'min_rating' in search_criteria:
                query = query.where(TourGuide.rating >= search_criteria['min_rating'])
            
            if 'city' in search_criteria:
                query = query.where(TourGuide.city == search_criteria['city'])
            
            # Ejecutar query
            result = await self.db.execute(query)
            guides = result.scalars().all()
            
            # Si se especifican fechas, verificar disponibilidad
            if 'start_date' in search_criteria and 'end_date' in search_criteria:
                available_guides = []
                
                for guide in guides:
                    availability = await self.check_guide_availability(
                        guide.id,
                        search_criteria['start_date'],
                        search_criteria['end_date']
                    )
                    
                    if availability['summary']['availability_percentage'] >= search_criteria.get('min_availability', 50):
                        guide_data = {
                            'id': guide.id,
                            'name': guide.full_name,
                            'type': guide.guide_type.value,
                            'languages': guide.languages,
                            'specializations': guide.specializations,
                            'experience': guide.years_experience,
                            'rating': guide.rating,
                            'availability': availability['summary']
                        }
                        
                        # Obtener tarifas
                        rates = await self.get_guide_rates(guide.id)
                        guide_data['rates'] = rates
                        
                        available_guides.append(guide_data)
                
                return available_guides
            else:
                # Retornar todos los guías que cumplen criterios básicos
                return [
                    {
                        'id': guide.id,
                        'name': guide.full_name,
                        'type': guide.guide_type.value,
                        'languages': guide.languages,
                        'specializations': guide.specializations,
                        'experience': guide.years_experience,
                        'rating': guide.rating
                    }
                    for guide in guides
                ]
            
        except Exception as e:
            logger.error(f"Error buscando guías: {str(e)}")
            raise
    
    # ==================== TARIFAS Y COSTOS ====================
    
    async def create_guide_rate(
        self,
        guide_id: str,
        rate_data: Dict[str, Any]
    ) -> GuideRate:
        """
        Crear tarifa para un guía
        """
        try:
            rate = GuideRate(
                id=f"RATE-{uuid.uuid4().hex[:8].upper()}",
                guide_id=guide_id,
                payment_type=GuidePaymentType[rate_data['payment_type']],
                amount=Decimal(str(rate_data['amount'])),
                currency=rate_data.get('currency', 'USD'),
                min_hours=rate_data.get('min_hours', 4),
                valid_from=rate_data.get('valid_from', date.today()),
                valid_until=rate_data.get('valid_until'),
                applies_to_languages=rate_data.get('applies_to_languages'),
                applies_to_specializations=rate_data.get('applies_to_specializations'),
                is_active=True
            )
            
            self.db.add(rate)
            await self.db.commit()
            
            return rate
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creando tarifa: {str(e)}")
            raise
    
    async def get_guide_rates(
        self,
        guide_id: str,
        service_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """
        Obtener tarifas del guía
        """
        query = select(GuideRate).where(
            and_(
                GuideRate.guide_id == guide_id,
                GuideRate.is_active == True
            )
        )
        
        if service_date:
            query = query.where(
                and_(
                    GuideRate.valid_from <= service_date,
                    or_(
                        GuideRate.valid_until.is_(None),
                        GuideRate.valid_until >= service_date
                    )
                )
            )
        
        result = await self.db.execute(query)
        rates = result.scalars().all()
        
        return [
            {
                'id': rate.id,
                'payment_type': rate.payment_type.value,
                'amount': float(rate.amount),
                'currency': rate.currency,
                'min_hours': rate.min_hours,
                'valid_from': rate.valid_from.isoformat() if rate.valid_from else None,
                'valid_until': rate.valid_until.isoformat() if rate.valid_until else None
            }
            for rate in rates
        ]
    
    async def calculate_guide_cost(
        self,
        guide_id: str,
        hours: float,
        service_type: str = 'FULL_DAY',
        service_date: Optional[date] = None,
        languages: Optional[List[str]] = None,
        specializations: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Calcular costo del servicio del guía
        """
        try:
            # Obtener tarifas aplicables
            rates = await self.get_guide_rates(guide_id, service_date or date.today())
            
            if not rates:
                raise BusinessLogicError("No hay tarifas configuradas para este guía")
            
            # Determinar tipo de pago según servicio
            if service_type == 'FULL_DAY':
                payment_type = 'PER_DAY'
            elif service_type == 'HALF_DAY':
                payment_type = 'HALF_DAY'
            else:
                payment_type = 'PER_HOUR'
            
            # Buscar tarifa aplicable
            applicable_rate = None
            for rate in rates:
                if rate['payment_type'] == payment_type:
                    applicable_rate = rate
                    break
            
            # Si no hay tarifa específica, usar tarifa por hora
            if not applicable_rate:
                for rate in rates:
                    if rate['payment_type'] == 'PER_HOUR':
                        applicable_rate = rate
                        break
            
            if not applicable_rate:
                raise BusinessLogicError("No se encontró tarifa aplicable")
            
            # Calcular costo base
            if applicable_rate['payment_type'] == 'PER_HOUR':
                base_cost = applicable_rate['amount'] * hours
            elif applicable_rate['payment_type'] == 'HALF_DAY':
                base_cost = applicable_rate['amount']
            elif applicable_rate['payment_type'] == 'PER_DAY':
                base_cost = applicable_rate['amount']
            else:
                base_cost = applicable_rate['amount']
            
            # Aplicar recargos
            surcharges = Decimal('0')
            
            # Recargo por idiomas especiales
            if languages and len(languages) > 1:
                surcharges += base_cost * Decimal('0.15')  # 15% por multilingüe
            
            # Recargo por especialización
            if specializations:
                surcharges += base_cost * Decimal('0.20')  # 20% por especialización
            
            # Calcular total
            total = base_cost + surcharges
            
            return {
                'guide_id': guide_id,
                'base_cost': float(base_cost),
                'surcharges': float(surcharges),
                'total': float(total),
                'currency': applicable_rate['currency'],
                'rate_applied': applicable_rate,
                'calculation_details': {
                    'hours': hours,
                    'service_type': service_type,
                    'languages': languages,
                    'specializations': specializations
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculando costo de guía: {str(e)}")
            raise
    
    # ==================== REPORTES Y ESTADÍSTICAS ====================
    
    async def get_guide_statistics(
        self,
        guide_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Obtener estadísticas del guía
        """
        try:
            # Período por defecto: último año
            if not start_date:
                start_date = date.today() - timedelta(days=365)
            if not end_date:
                end_date = date.today()
            
            # Obtener asignaciones
            assignments_query = await self.db.execute(
                select(GuideAssignment)
                .where(
                    and_(
                        GuideAssignment.guide_id == guide_id,
                        GuideAssignment.assignment_date >= start_date,
                        GuideAssignment.assignment_date <= end_date
                    )
                )
            )
            assignments = assignments_query.scalars().all()
            
            # Calcular estadísticas
            total_assignments = len(assignments)
            confirmed_assignments = len([a for a in assignments if a.status == 'CONFIRMED'])
            completed_assignments = len([a for a in assignments if a.status == 'COMPLETED'])
            cancelled_assignments = len([a for a in assignments if a.status == 'CANCELLED'])
            
            total_hours = sum(a.hours for a in assignments if a.status in ['CONFIRMED', 'COMPLETED'])
            total_earnings = sum(float(a.cost) for a in assignments if a.status == 'COMPLETED')
            
            # Calcular ocupación por mes
            monthly_stats = {}
            for assignment in assignments:
                month_key = assignment.assignment_date.strftime('%Y-%m')
                if month_key not in monthly_stats:
                    monthly_stats[month_key] = {
                        'assignments': 0,
                        'hours': 0,
                        'earnings': 0
                    }
                
                monthly_stats[month_key]['assignments'] += 1
                monthly_stats[month_key]['hours'] += assignment.hours
                if assignment.status == 'COMPLETED':
                    monthly_stats[month_key]['earnings'] += float(assignment.cost)
            
            # Obtener evaluaciones
            guide = await self.get_guide_by_id(guide_id)
            
            return {
                'guide_id': guide_id,
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'summary': {
                    'total_assignments': total_assignments,
                    'confirmed': confirmed_assignments,
                    'completed': completed_assignments,
                    'cancelled': cancelled_assignments,
                    'completion_rate': (completed_assignments / confirmed_assignments * 100) if confirmed_assignments > 0 else 0,
                    'total_hours': total_hours,
                    'total_earnings': total_earnings,
                    'average_rating': guide.rating if guide else 0
                },
                'monthly_stats': monthly_stats,
                'performance': {
                    'punctuality_score': guide.punctuality_score if guide else 100,
                    'customer_satisfaction': guide.rating if guide else 5.0,
                    'total_reviews': guide.total_reviews if guide else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas: {str(e)}")
            raise
    
    # ==================== NOTIFICACIONES ====================
    
    async def _send_welcome_email(self, guide: TourGuide):
        """
        Enviar email de bienvenida al nuevo guía
        """
        try:
            email_content = f"""
            <h2>¡Bienvenido a Spirit Tours!</h2>
            <p>Hola {guide.first_name},</p>
            <p>Tu registro como guía turístico ha sido completado exitosamente.</p>
            
            <h3>Información de tu cuenta:</h3>
            <ul>
                <li><strong>ID de Guía:</strong> {guide.id}</li>
                <li><strong>Tipo:</strong> {guide.guide_type.value}</li>
                <li><strong>Email:</strong> {guide.email}</li>
            </ul>
            
            <p>Pronto recibirás notificaciones sobre asignaciones de tours.</p>
            
            <p>Saludos,<br>
            El equipo de Spirit Tours</p>
            """
            
            await self.email_service.send_email(
                to_email=guide.email,
                subject="Bienvenido a Spirit Tours - Registro de Guía Completado",
                html_content=email_content
            )
            
        except Exception as e:
            logger.error(f"Error enviando email de bienvenida: {str(e)}")
    
    async def _notify_guide_assignment(
        self,
        guide: TourGuide,
        assignment: GuideAssignment
    ):
        """
        Notificar al guía sobre nueva asignación
        """
        try:
            email_content = f"""
            <h2>Nueva Asignación de Tour</h2>
            <p>Hola {guide.first_name},</p>
            <p>Has sido asignado a un nuevo tour.</p>
            
            <h3>Detalles de la asignación:</h3>
            <ul>
                <li><strong>Fecha:</strong> {assignment.assignment_date}</li>
                <li><strong>Hora de inicio:</strong> {assignment.start_time}</li>
                <li><strong>Duración:</strong> {assignment.hours} horas</li>
                <li><strong>Punto de encuentro:</strong> {assignment.meeting_point}</li>
                <li><strong>Idiomas requeridos:</strong> {', '.join(assignment.languages_required)}</li>
            </ul>
            
            <p><strong>Por favor confirma tu disponibilidad lo antes posible.</strong></p>
            
            <p>Saludos,<br>
            El equipo de Spirit Tours</p>
            """
            
            await self.email_service.send_email(
                to_email=guide.email,
                subject=f"Nueva Asignación de Tour - {assignment.assignment_date}",
                html_content=email_content
            )
            
            # También crear notificación en el sistema
            await self.notification_service.create_notification(
                user_id=guide.user_id if hasattr(guide, 'user_id') else None,
                title="Nueva Asignación de Tour",
                message=f"Has sido asignado a un tour el {assignment.assignment_date}",
                type="GUIDE_ASSIGNMENT",
                priority="HIGH",
                data={'assignment_id': assignment.id}
            )
            
        except Exception as e:
            logger.error(f"Error notificando asignación: {str(e)}")
    
    async def _notify_assignment_confirmation(self, assignment: GuideAssignment):
        """
        Notificar confirmación de asignación
        """
        try:
            guide = assignment.guide
            
            email_content = f"""
            <h2>Asignación Confirmada</h2>
            <p>Hola {guide.first_name},</p>
            <p>Tu asignación para el tour ha sido confirmada.</p>
            
            <h3>Recordatorio de detalles:</h3>
            <ul>
                <li><strong>Fecha:</strong> {assignment.assignment_date}</li>
                <li><strong>Hora de inicio:</strong> {assignment.start_time}</li>
                <li><strong>Punto de encuentro:</strong> {assignment.meeting_point}</li>
                <li><strong>Compensación:</strong> ${assignment.cost}</li>
            </ul>
            
            <p>¡Gracias por tu confirmación!</p>
            
            <p>Saludos,<br>
            El equipo de Spirit Tours</p>
            """
            
            await self.email_service.send_email(
                to_email=guide.email,
                subject=f"Confirmación de Tour - {assignment.assignment_date}",
                html_content=email_content
            )
            
        except Exception as e:
            logger.error(f"Error notificando confirmación: {str(e)}")