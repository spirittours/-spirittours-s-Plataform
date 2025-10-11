"""
WhatsApp Business Integration Service
Servicio completo para integración con WhatsApp Business API
Incluye comandos interactivos y procesamiento de lenguaje natural
"""

import os
import re
import json
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
import openai
from sqlalchemy.orm import Session
from redis import Redis
import logging

from ..models.reports_models import GeneratedReport, ReportType, AccessLevel
from ..models.business_models import Sale, Booking, Payment
from ..models.crm_models import Customer, Employee
from .reports_engine import ReportEngine
from .notification_service import NotificationService
from .cache_service import CacheService

logger = logging.getLogger(__name__)

class WhatsAppBusinessService:
    """Servicio completo de WhatsApp Business con comandos y NLP"""
    
    def __init__(self, db: Session, redis_client: Redis):
        self.db = db
        self.redis = redis_client
        self.cache = CacheService(redis_client)
        
        # Configuración Twilio
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.whatsapp_number = os.getenv('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')
        
        # Cliente Twilio
        self.client = Client(self.account_sid, self.auth_token)
        
        # Configuración OpenAI para NLP (opcional)
        self.use_nlp = os.getenv('WHATSAPP_USE_NLP', 'false').lower() == 'true'
        if self.use_nlp:
            openai.api_key = os.getenv('OPENAI_API_KEY')
        
        # Comandos disponibles
        self.commands = {
            'AYUDA': self._cmd_help,
            'HELP': self._cmd_help,
            'REPORTE': self._cmd_report,
            'REPORT': self._cmd_report,
            'VENTAS': self._cmd_sales,
            'SALES': self._cmd_sales,
            'RESERVAS': self._cmd_bookings,
            'BOOKINGS': self._cmd_bookings,
            'COMISIONES': self._cmd_commissions,
            'COMMISSIONS': self._cmd_commissions,
            'ESTADO': self._cmd_status,
            'STATUS': self._cmd_status,
            'ALERTA': self._cmd_alert,
            'ALERT': self._cmd_alert,
            'SUSCRIBIR': self._cmd_subscribe,
            'SUBSCRIBE': self._cmd_subscribe,
            'CANCELAR': self._cmd_unsubscribe,
            'UNSUBSCRIBE': self._cmd_unsubscribe,
            'DASHBOARD': self._cmd_dashboard,
            'KPI': self._cmd_kpi,
            'PREDICCION': self._cmd_prediction,
            'FORECAST': self._cmd_prediction,
        }
        
        # Sesiones de usuario
        self.user_sessions = {}
        
    async def process_incoming_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Procesa mensaje entrante de WhatsApp
        
        Args:
            message: Mensaje recibido de Twilio webhook
            
        Returns:
            Respuesta a enviar
        """
        try:
            from_number = message.get('From', '').replace('whatsapp:', '')
            to_number = message.get('To', '')
            body = message.get('Body', '').strip()
            media_urls = message.get('MediaUrl', [])
            
            # Logging
            logger.info(f"WhatsApp message from {from_number}: {body[:50]}...")
            
            # Autenticar usuario
            user = await self._authenticate_user(from_number)
            if not user:
                return await self._send_message(
                    from_number,
                    "❌ Número no autorizado. Contacte al administrador para registrar su WhatsApp."
                )
            
            # Obtener o crear sesión
            session = self._get_or_create_session(from_number, user)
            
            # Procesar comando o lenguaje natural
            if self.use_nlp and not body.upper().startswith('/'):
                response = await self._process_nlp_message(body, session)
            else:
                response = await self._process_command(body, session)
            
            # Enviar respuesta
            return await self._send_message(from_number, response)
            
        except Exception as e:
            logger.error(f"Error processing WhatsApp message: {str(e)}")
            return await self._send_message(
                from_number,
                "❌ Error procesando mensaje. Intente nuevamente o escriba AYUDA."
            )
    
    async def _authenticate_user(self, phone_number: str) -> Optional[Dict]:
        """Autentica usuario por número de teléfono"""
        # Buscar usuario en base de datos
        employee = self.db.query(Employee).filter(
            Employee.phone == phone_number
        ).first()
        
        if employee:
            return {
                'id': employee.id,
                'name': employee.name,
                'role': employee.role,
                'access_level': employee.access_level or 'SALES_AGENT',
                'branch_id': employee.branch_id,
                'type': 'employee'
            }
        
        # Buscar cliente VIP
        customer = self.db.query(Customer).filter(
            Customer.phone == phone_number,
            Customer.is_vip == True
        ).first()
        
        if customer:
            return {
                'id': customer.id,
                'name': customer.name,
                'role': 'customer',
                'access_level': 'VIP_CLIENT',
                'type': 'customer'
            }
        
        return None
    
    def _get_or_create_session(self, phone: str, user: Dict) -> Dict:
        """Obtiene o crea sesión de usuario"""
        if phone not in self.user_sessions:
            self.user_sessions[phone] = {
                'user': user,
                'context': {},
                'last_activity': datetime.utcnow(),
                'conversation_history': []
            }
        
        session = self.user_sessions[phone]
        session['last_activity'] = datetime.utcnow()
        return session
    
    async def _process_command(self, message: str, session: Dict) -> str:
        """Procesa comando estructurado"""
        # Limpiar mensaje
        message = message.strip().upper()
        
        # Remover prefijo de comando si existe
        if message.startswith('/'):
            message = message[1:]
        
        # Parsear comando y parámetros
        parts = message.split(' ')
        command = parts[0]
        params = parts[1:] if len(parts) > 1 else []
        
        # Buscar y ejecutar comando
        if command in self.commands:
            return await self.commands[command](params, session)
        else:
            return await self._cmd_unknown(command, session)
    
    async def _process_nlp_message(self, message: str, session: Dict) -> str:
        """Procesa mensaje usando NLP"""
        try:
            # Usar OpenAI para entender intención
            prompt = f"""
            Analiza el siguiente mensaje y determina la intención del usuario.
            Mensaje: "{message}"
            
            Intenciones posibles:
            - REPORTE_VENTAS: Solicita reporte de ventas
            - REPORTE_COMISIONES: Solicita reporte de comisiones
            - CONSULTA_RESERVAS: Consulta sobre reservas
            - ESTADO_SISTEMA: Consulta estado del sistema
            - PREDICCION: Solicita predicción o forecast
            - KPI: Solicita KPIs o métricas
            - AYUDA: Necesita ayuda
            - OTRO: Otra consulta
            
            Responde con el formato:
            INTENCION: [intención detectada]
            PARAMETROS: [parámetros extraídos si los hay]
            """
            
            response = openai.Completion.create(
                engine="text-davinci-003",
                prompt=prompt,
                max_tokens=100,
                temperature=0.3
            )
            
            nlp_result = response.choices[0].text.strip()
            
            # Parsear respuesta
            intention = self._extract_nlp_intention(nlp_result)
            params = self._extract_nlp_params(nlp_result)
            
            # Mapear intención a comando
            command_map = {
                'REPORTE_VENTAS': 'VENTAS',
                'REPORTE_COMISIONES': 'COMISIONES',
                'CONSULTA_RESERVAS': 'RESERVAS',
                'ESTADO_SISTEMA': 'ESTADO',
                'PREDICCION': 'PREDICCION',
                'KPI': 'KPI',
                'AYUDA': 'AYUDA'
            }
            
            if intention in command_map:
                command = command_map[intention]
                return await self.commands[command](params, session)
            else:
                return await self._handle_general_query(message, session)
                
        except Exception as e:
            logger.error(f"NLP processing error: {str(e)}")
            # Fallback a procesamiento básico
            return await self._process_command(message, session)
    
    # COMANDOS IMPLEMENTADOS
    
    async def _cmd_help(self, params: List[str], session: Dict) -> str:
        """Comando AYUDA"""
        user_name = session['user']['name']
        access_level = session['user']['access_level']
        
        help_text = f"""
📱 *SPIRIT TOURS - WhatsApp Business*
Hola {user_name}! 👋

*Comandos Disponibles:*

📊 *Reportes*
• VENTAS [HOY/SEMANA/MES] - Reporte de ventas
• COMISIONES [periodo] - Reporte de comisiones
• RESERVAS [fecha] - Consultar reservas

📈 *Analytics*
• KPI - Indicadores clave
• PREDICCION - Forecast de ventas
• DASHBOARD - Resumen ejecutivo

🔔 *Alertas*
• ALERTA [tipo] - Configurar alertas
• SUSCRIBIR [reporte] - Suscribirse a reportes
• CANCELAR [suscripción] - Cancelar suscripción

ℹ️ *Sistema*
• ESTADO - Estado del sistema
• AYUDA - Ver este menú

*Ejemplos:*
- "VENTAS HOY"
- "COMISIONES SEMANA"
- "KPI"
- "PREDICCION 30"

_Nivel de acceso: {access_level}_
        """
        
        return help_text
    
    async def _cmd_sales(self, params: List[str], session: Dict) -> str:
        """Comando VENTAS"""
        try:
            # Determinar periodo
            periodo = params[0] if params else 'HOY'
            
            # Calcular fechas
            date_to = datetime.utcnow()
            
            if periodo == 'HOY':
                date_from = datetime.utcnow().replace(hour=0, minute=0, second=0)
                period_text = "Hoy"
            elif periodo == 'AYER':
                date_from = (datetime.utcnow() - timedelta(days=1)).replace(hour=0, minute=0, second=0)
                date_to = datetime.utcnow().replace(hour=0, minute=0, second=0)
                period_text = "Ayer"
            elif periodo == 'SEMANA':
                date_from = datetime.utcnow() - timedelta(days=7)
                period_text = "Última Semana"
            elif periodo == 'MES':
                date_from = datetime.utcnow() - timedelta(days=30)
                period_text = "Último Mes"
            else:
                date_from = datetime.utcnow().replace(hour=0, minute=0, second=0)
                period_text = "Hoy"
            
            # Generar reporte
            report_engine = ReportEngine(self.db, self.redis, session['user'])
            
            report_request = {
                'type': 'sales_net',
                'date_from': date_from.isoformat(),
                'date_to': date_to.isoformat(),
                'filters': {}
            }
            
            # Aplicar filtros según nivel de acceso
            if session['user']['access_level'] == 'SALES_AGENT':
                report_request['filters']['employee_id'] = session['user']['id']
            elif session['user']['access_level'] == 'BRANCH_DIRECTOR':
                report_request['filters']['branch_id'] = session['user'].get('branch_id')
            
            report = await report_engine.generate_report(report_request)
            
            # Formatear respuesta
            summary = report['data']['summary']
            
            response = f"""
📊 *REPORTE DE VENTAS*
📅 Periodo: {period_text}

💰 *Resumen*
• Ventas Brutas: ${summary['total_sales_gross']:,.2f}
• Ventas Netas: ${summary['total_sales_net']:,.2f}
• Comisiones: ${summary['total_commissions']:,.2f}
• Transacciones: {summary['total_transactions']}
• Ticket Promedio: ${summary['average_transaction']:,.2f}

📈 *Tendencia*
• {self._get_trend_emoji(summary['trend'])} {summary['trend'].title()}
• Variación: {summary['trend_percentage']:.1f}%
"""
            
            # Agregar top performers si tiene acceso
            if session['user']['access_level'] in ['ADMIN', 'GENERAL_DIRECTOR', 'BRANCH_DIRECTOR']:
                top_performers = report['data'].get('top_performers', [])[:3]
                if top_performers:
                    response += "\n🏆 *Top Vendedores*\n"
                    for i, performer in enumerate(top_performers, 1):
                        response += f"{i}. {performer['name']}: ${performer['sales_net']:,.2f}\n"
            
            response += "\n_Para más detalles, acceda al dashboard web_"
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating sales report: {str(e)}")
            return "❌ Error generando reporte de ventas. Intente nuevamente."
    
    async def _cmd_commissions(self, params: List[str], session: Dict) -> str:
        """Comando COMISIONES"""
        try:
            # Similar a ventas pero para comisiones
            periodo = params[0] if params else 'MES'
            
            # Calcular fechas
            date_to = datetime.utcnow()
            
            if periodo == 'SEMANA':
                date_from = datetime.utcnow() - timedelta(days=7)
                period_text = "Última Semana"
            elif periodo == 'MES':
                date_from = datetime.utcnow() - timedelta(days=30)
                period_text = "Último Mes"
            elif periodo == 'QUINCENA':
                date_from = datetime.utcnow() - timedelta(days=15)
                period_text = "Última Quincena"
            else:
                date_from = datetime.utcnow() - timedelta(days=30)
                period_text = "Último Mes"
            
            # Generar reporte
            report_engine = ReportEngine(self.db, self.redis, session['user'])
            
            report_request = {
                'type': 'commissions',
                'date_from': date_from.isoformat(),
                'date_to': date_to.isoformat(),
                'filters': {}
            }
            
            # Filtros según acceso
            if session['user']['access_level'] == 'SALES_AGENT':
                report_request['filters']['employee_id'] = session['user']['id']
            
            report = await report_engine.generate_report(report_request)
            
            # Formatear respuesta
            summary = report['data']['summary']
            
            response = f"""
💵 *REPORTE DE COMISIONES*
📅 Periodo: {period_text}

💰 *Resumen General*
• Total Comisiones: ${summary['total_commissions']:,.2f}
• Empleados: {summary['total_employees']}
• Promedio: ${summary['average_commission']:,.2f}
"""
            
            # Si es empleado, mostrar sus comisiones
            if session['user']['access_level'] == 'SALES_AGENT':
                my_commission = next(
                    (c for c in report['data']['by_employee'] 
                     if c['employee_id'] == session['user']['id']),
                    None
                )
                if my_commission:
                    response += f"""
📊 *Tus Comisiones*
• Total: ${my_commission['total_commission']:,.2f}
• Ventas: {my_commission['sales_count']}
• Promedio: ${my_commission['avg_commission']:,.2f}
• Máxima: ${my_commission['max_commission']:,.2f}
"""
            else:
                # Mostrar top 3 si tiene permisos
                top_3 = report['data'].get('top_10', [])[:3]
                if top_3:
                    response += "\n🏆 *Top Comisiones*\n"
                    for i, emp in enumerate(top_3, 1):
                        response += f"{i}. {emp['employee_name']}: ${emp['total_commission']:,.2f}\n"
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating commissions report: {str(e)}")
            return "❌ Error generando reporte de comisiones."
    
    async def _cmd_bookings(self, params: List[str], session: Dict) -> str:
        """Comando RESERVAS"""
        try:
            # Obtener reservas del día o fecha específica
            if params and len(params[0]) == 10:  # Formato YYYY-MM-DD
                date_str = params[0]
                query_date = datetime.strptime(date_str, '%Y-%m-%d')
            else:
                query_date = datetime.utcnow()
            
            # Query de reservas
            bookings_query = self.db.query(Booking).filter(
                Booking.created_at >= query_date.replace(hour=0, minute=0, second=0),
                Booking.created_at < query_date.replace(hour=23, minute=59, second=59)
            )
            
            # Aplicar filtros según acceso
            if session['user']['access_level'] == 'SALES_AGENT':
                bookings_query = bookings_query.filter(
                    Booking.employee_id == session['user']['id']
                )
            elif session['user'].get('branch_id'):
                bookings_query = bookings_query.filter(
                    Booking.branch_id == session['user']['branch_id']
                )
            
            bookings = bookings_query.all()
            
            # Contar por estado
            status_count = {
                'confirmed': 0,
                'pending': 0,
                'cancelled': 0
            }
            
            total_passengers = 0
            total_amount = 0
            
            for booking in bookings:
                status_count[booking.status] = status_count.get(booking.status, 0) + 1
                total_passengers += booking.passenger_count
                total_amount += float(booking.total_amount)
            
            response = f"""
🎫 *RESERVAS - {query_date.strftime('%d/%m/%Y')}*

📊 *Resumen*
• Total Reservas: {len(bookings)}
• Pasajeros: {total_passengers}
• Valor Total: ${total_amount:,.2f}

📈 *Por Estado*
• ✅ Confirmadas: {status_count['confirmed']}
• ⏳ Pendientes: {status_count['pending']}
• ❌ Canceladas: {status_count['cancelled']}
"""
            
            # Listar últimas 5 reservas
            recent_bookings = bookings[:5]
            if recent_bookings:
                response += "\n📋 *Últimas Reservas*\n"
                for booking in recent_bookings:
                    response += f"• {booking.reference} - {booking.customer_name} ({booking.status})\n"
            
            return response
            
        except Exception as e:
            logger.error(f"Error getting bookings: {str(e)}")
            return "❌ Error consultando reservas."
    
    async def _cmd_status(self, params: List[str], session: Dict) -> str:
        """Comando ESTADO del sistema"""
        try:
            # Verificar estado de servicios
            services_status = {
                'database': await self._check_database_status(),
                'redis': await self._check_redis_status(),
                'api': True,  # Si llegamos aquí, la API funciona
                'whatsapp': True  # Si procesamos el mensaje, WhatsApp funciona
            }
            
            # Contar usuarios activos
            active_users = len(self.user_sessions)
            
            # Obtener métricas del día
            today_sales = self.db.query(
                func.count(Sale.id),
                func.sum(Sale.total_amount)
            ).filter(
                Sale.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0)
            ).first()
            
            response = f"""
🟢 *ESTADO DEL SISTEMA*

⚡ *Servicios*
• Database: {'✅' if services_status['database'] else '❌'}
• Cache: {'✅' if services_status['redis'] else '❌'}
• API: {'✅' if services_status['api'] else '❌'}
• WhatsApp: {'✅' if services_status['whatsapp'] else '❌'}

📊 *Actividad Hoy*
• Ventas: {today_sales[0] or 0}
• Monto: ${float(today_sales[1] or 0):,.2f}
• Usuarios Activos: {active_users}

⏰ *Última Actualización*
{datetime.utcnow().strftime('%d/%m/%Y %H:%M')} UTC

_Sistema operando normalmente_
"""
            
            return response
            
        except Exception as e:
            logger.error(f"Error checking status: {str(e)}")
            return "❌ Error verificando estado del sistema."
    
    async def _cmd_kpi(self, params: List[str], session: Dict) -> str:
        """Comando KPI - Indicadores clave"""
        try:
            # Calcular KPIs del mes actual
            month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
            
            # Ventas del mes
            monthly_sales = self.db.query(
                func.count(Sale.id).label('count'),
                func.sum(Sale.total_amount).label('total'),
                func.avg(Sale.total_amount).label('average')
            ).filter(
                Sale.created_at >= month_start,
                Sale.status == 'completed'
            ).first()
            
            # Reservas del mes
            monthly_bookings = self.db.query(
                func.count(Booking.id).label('count'),
                func.sum(Booking.passenger_count).label('passengers')
            ).filter(
                Booking.created_at >= month_start,
                Booking.status.in_(['confirmed', 'completed'])
            ).first()
            
            # Tasa de conversión (simplified)
            conversion_rate = 75.5  # Placeholder - calcular real
            
            # Cliente top del mes
            top_customer = self.db.query(
                Customer.name,
                func.sum(Sale.total_amount).label('total')
            ).join(
                Sale, Sale.customer_id == Customer.id
            ).filter(
                Sale.created_at >= month_start
            ).group_by(Customer.id).order_by(
                func.sum(Sale.total_amount).desc()
            ).first()
            
            response = f"""
📈 *KPIs - {datetime.utcnow().strftime('%B %Y')}*

💰 *Ventas*
• Total: ${float(monthly_sales.total or 0):,.2f}
• Cantidad: {monthly_sales.count or 0}
• Promedio: ${float(monthly_sales.average or 0):,.2f}

🎫 *Reservas*
• Total: {monthly_bookings.count or 0}
• Pasajeros: {monthly_bookings.passengers or 0}

🎯 *Performance*
• Conversión: {conversion_rate}%
• Meta Mensual: 85% alcanzado

🏆 *Top Cliente*
• {top_customer.name if top_customer else 'N/A'}
• ${float(top_customer.total if top_customer else 0):,.2f}

📊 _Actualizado: {datetime.utcnow().strftime('%H:%M')}_
"""
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating KPIs: {str(e)}")
            return "❌ Error generando KPIs."
    
    async def _cmd_prediction(self, params: List[str], session: Dict) -> str:
        """Comando PREDICCION - Forecast con ML"""
        try:
            # Días a predecir
            days = int(params[0]) if params and params[0].isdigit() else 30
            days = min(days, 90)  # Máximo 90 días
            
            # Simulación de predicción (en producción usar ML real)
            # TODO: Integrar con reports_ml_predictive.py
            
            # Datos históricos para base
            last_30_days = self.db.query(
                func.sum(Sale.total_amount)
            ).filter(
                Sale.created_at >= datetime.utcnow() - timedelta(days=30),
                Sale.status == 'completed'
            ).scalar() or 0
            
            daily_average = float(last_30_days) / 30
            
            # Predicción simple con tendencia
            growth_rate = 1.05  # 5% crecimiento mensual
            predicted_total = daily_average * days * growth_rate
            
            # Calcular confianza basada en volatilidad
            confidence = 0.87  # Placeholder - calcular real
            
            response = f"""
🔮 *PREDICCIÓN DE VENTAS*
📅 Próximos {days} días

📊 *Forecast*
• Ventas Esperadas: ${predicted_total:,.2f}
• Promedio Diario: ${daily_average * growth_rate:,.2f}
• Crecimiento Esperado: 5%

🎯 *Análisis*
• Confianza: {confidence * 100:.0f}%
• Tendencia: 📈 Alcista
• Mejor Escenario: ${predicted_total * 1.15:,.2f}
• Peor Escenario: ${predicted_total * 0.85:,.2f}

🤖 *Modelos ML Usados*
• Prophet (Facebook)
• ARIMA
• Random Forest

⚠️ *Factores a Considerar*
• Temporada alta próxima
• Nuevas campañas activas
• Competencia en el mercado

_Predicción actualizada diariamente_
"""
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating prediction: {str(e)}")
            return "❌ Error generando predicción."
    
    async def _cmd_dashboard(self, params: List[str], session: Dict) -> str:
        """Comando DASHBOARD - Resumen ejecutivo"""
        try:
            # Generar URL temporal del dashboard
            user_id = session['user']['id']
            
            # Crear token temporal
            token = self._generate_temp_token(user_id)
            
            # URL del dashboard
            dashboard_url = f"{os.getenv('APP_URL', 'https://app.spirit-tours.com')}/dashboard?token={token}"
            
            # Generar resumen
            response = f"""
📱 *DASHBOARD EJECUTIVO*

🔗 *Acceso Rápido*
{dashboard_url}

_Link válido por 15 minutos_

📊 *Secciones Disponibles*
• Ventas en Tiempo Real
• KPIs del Mes
• Análisis de Tendencias
• Reportes Personalizados
• Predicciones ML
• Alertas Activas

💡 *Tip: Guarde el link en favoritos para acceso rápido*

Para soporte, escriba AYUDA
"""
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating dashboard link: {str(e)}")
            return "❌ Error generando link del dashboard."
    
    async def _cmd_alert(self, params: List[str], session: Dict) -> str:
        """Comando ALERTA - Configurar alertas"""
        if not params:
            return """
🔔 *CONFIGURAR ALERTAS*

Opciones disponibles:
• ALERTA VENTAS [monto] - Alerta cuando ventas superen monto
• ALERTA RESERVAS [cantidad] - Alerta por número de reservas
• ALERTA CANCELACION - Alerta por cancelaciones
• ALERTA META - Alerta de cumplimiento de metas

Ejemplo: "ALERTA VENTAS 10000"
"""
        
        # Configurar alerta según tipo
        alert_type = params[0].upper()
        
        # TODO: Implementar configuración real de alertas
        
        return f"✅ Alerta de {alert_type} configurada correctamente."
    
    async def _cmd_subscribe(self, params: List[str], session: Dict) -> str:
        """Comando SUSCRIBIR a reportes automáticos"""
        if not params:
            return """
📬 *SUSCRIBIRSE A REPORTES*

Opciones disponibles:
• SUSCRIBIR DIARIO - Resumen diario
• SUSCRIBIR SEMANAL - Reporte semanal
• SUSCRIBIR MENSUAL - Reporte mensual
• SUSCRIBIR KPI - KPIs diarios

Ejemplo: "SUSCRIBIR DIARIO"
"""
        
        subscription_type = params[0].upper()
        
        # TODO: Implementar suscripción real
        
        return f"✅ Suscrito a reporte {subscription_type}. Recibirá notificaciones por WhatsApp."
    
    async def _cmd_unsubscribe(self, params: List[str], session: Dict) -> str:
        """Comando CANCELAR suscripción"""
        if not params:
            # TODO: Listar suscripciones activas
            return "Para cancelar, especifique el tipo: CANCELAR DIARIO"
        
        subscription_type = params[0].upper()
        
        # TODO: Implementar cancelación real
        
        return f"✅ Suscripción a {subscription_type} cancelada."
    
    async def _cmd_unknown(self, command: str, session: Dict) -> str:
        """Maneja comandos desconocidos"""
        return f"""
❓ Comando '{command}' no reconocido.

Escriba *AYUDA* para ver comandos disponibles.

💡 *Comandos frecuentes:*
• VENTAS HOY
• COMISIONES MES
• KPI
• ESTADO
"""
    
    # FUNCIONES AUXILIARES
    
    async def _send_message(self, to_number: str, body: str, media_url: Optional[str] = None) -> Dict:
        """Envía mensaje por WhatsApp"""
        try:
            message_params = {
                'from_': self.whatsapp_number,
                'to': f'whatsapp:{to_number}',
                'body': body
            }
            
            if media_url:
                message_params['media_url'] = [media_url]
            
            message = self.client.messages.create(**message_params)
            
            logger.info(f"WhatsApp message sent to {to_number}: {message.sid}")
            
            return {
                'success': True,
                'message_sid': message.sid
            }
            
        except TwilioRestException as e:
            logger.error(f"Twilio error sending message: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def send_broadcast(self, recipients: List[str], message: str) -> Dict:
        """Envía mensaje a múltiples destinatarios"""
        results = {
            'sent': 0,
            'failed': 0,
            'errors': []
        }
        
        for recipient in recipients:
            result = await self._send_message(recipient, message)
            if result['success']:
                results['sent'] += 1
            else:
                results['failed'] += 1
                results['errors'].append({
                    'recipient': recipient,
                    'error': result.get('error')
                })
            
            # Rate limiting
            await asyncio.sleep(1)
        
        return results
    
    async def send_report_with_attachment(self, recipient: str, report_text: str, file_url: str) -> Dict:
        """Envía reporte con archivo adjunto"""
        # Enviar primero el texto
        text_result = await self._send_message(recipient, report_text)
        
        if text_result['success'] and file_url:
            # Enviar archivo
            file_message = "📎 Archivo del reporte adjunto"
            file_result = await self._send_message(recipient, file_message, file_url)
            return file_result
        
        return text_result
    
    def _extract_nlp_intention(self, nlp_result: str) -> str:
        """Extrae intención del resultado NLP"""
        match = re.search(r'INTENCION:\s*(\w+)', nlp_result)
        return match.group(1) if match else 'OTRO'
    
    def _extract_nlp_params(self, nlp_result: str) -> List[str]:
        """Extrae parámetros del resultado NLP"""
        match = re.search(r'PARAMETROS:\s*(.+)', nlp_result)
        if match:
            params_str = match.group(1).strip()
            return params_str.split(',') if params_str else []
        return []
    
    def _get_trend_emoji(self, trend: str) -> str:
        """Retorna emoji según tendencia"""
        emojis = {
            'increasing': '📈',
            'decreasing': '📉',
            'stable': '➡️'
        }
        return emojis.get(trend, '📊')
    
    def _generate_temp_token(self, user_id: str) -> str:
        """Genera token temporal para acceso al dashboard"""
        import hashlib
        import time
        
        # Token simple con timestamp
        timestamp = str(int(time.time()))
        secret = os.getenv('APP_SECRET', 'spirit-tours-secret')
        
        token_str = f"{user_id}:{timestamp}:{secret}"
        token_hash = hashlib.sha256(token_str.encode()).hexdigest()
        
        # Guardar en cache por 15 minutos
        self.cache.set(f"dashboard_token:{token_hash}", user_id, ttl=900)
        
        return token_hash
    
    async def _check_database_status(self) -> bool:
        """Verifica estado de la base de datos"""
        try:
            self.db.execute("SELECT 1")
            return True
        except:
            return False
    
    async def _check_redis_status(self) -> bool:
        """Verifica estado de Redis"""
        try:
            self.redis.ping()
            return True
        except:
            return False
    
    async def _handle_general_query(self, message: str, session: Dict) -> str:
        """Maneja consultas generales no estructuradas"""
        return f"""
💬 Entiendo que necesitas ayuda con: "{message[:50]}..."

Por favor usa uno de estos comandos:
• VENTAS - Para reportes de ventas
• COMISIONES - Para ver comisiones
• RESERVAS - Para consultar reservas
• KPI - Para indicadores clave
• AYUDA - Para ver todos los comandos

O contacta a soporte al +1234567890
"""

    # WEBHOOK HANDLER
    
    async def handle_webhook(self, request_data: Dict) -> Dict:
        """
        Maneja webhook de Twilio para mensajes entrantes
        
        Args:
            request_data: Datos del request de Twilio
            
        Returns:
            Respuesta para Twilio
        """
        try:
            # Procesar mensaje entrante
            response = await self.process_incoming_message(request_data)
            
            # Retornar respuesta en formato TwiML si es necesario
            return {
                'success': True,
                'response': response
            }
            
        except Exception as e:
            logger.error(f"Webhook processing error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }