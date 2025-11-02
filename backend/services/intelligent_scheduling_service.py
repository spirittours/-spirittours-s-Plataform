"""
Intelligent Scheduling and Follow-up Service
Sistema inteligente de programación de citas y seguimientos automáticos
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, timezone, time
from dataclasses import dataclass, field
from enum import Enum
import uuid
import pytz
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, Float, ForeignKey
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field

# Import our models and services
from models.rbac_models import Base
from config.production_database import get_db_write, get_db_read
from services.call_reporting_service import CallReport, FollowUpTask

# Configure logging
logger = logging.getLogger(__name__)

class AppointmentType(str, Enum):
    """Tipos de citas disponibles"""
    CONSULTATION = "consultation"          # Consulta inicial
    PRESENTATION = "presentation"          # Presentación de productos
    FOLLOW_UP_MEETING = "follow_up_meeting" # Reunión de seguimiento
    CLOSING_MEETING = "closing_meeting"    # Reunión de cierre
    CUSTOMER_SERVICE = "customer_service"  # Servicio al cliente
    TECHNICAL_SUPPORT = "technical_support" # Soporte técnico

class AppointmentStatus(str, Enum):
    """Estados de las citas"""
    PENDING = "pending"           # Pendiente de confirmación
    CONFIRMED = "confirmed"       # Confirmada
    RESCHEDULED = "rescheduled"  # Reprogramada
    COMPLETED = "completed"       # Completada
    CANCELLED = "cancelled"       # Cancelada
    NO_SHOW = "no_show"         # Cliente no se presentó

class TimeSlotPreference(str, Enum):
    """Preferencias de horario"""
    MORNING = "morning"       # 09:00-12:00
    AFTERNOON = "afternoon"   # 12:00-17:00
    EVENING = "evening"      # 17:00-20:00
    FLEXIBLE = "flexible"    # Cualquier horario

# Database Models
class AppointmentSchedule(Base):
    """Programación inteligente de citas"""
    __tablename__ = "appointment_schedules"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    call_report_id = Column(String, ForeignKey('call_reports.id'), nullable=True)
    
    # Customer Information
    customer_phone = Column(String, nullable=False, index=True)
    customer_name = Column(String, nullable=True)
    customer_email = Column(String, nullable=True)
    customer_timezone = Column(String, nullable=True)
    
    # Appointment Details
    appointment_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Scheduling
    requested_date = Column(DateTime(timezone=True), nullable=True)
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, default=60)
    
    # Status and Management
    status = Column(String, default=AppointmentStatus.PENDING)
    priority = Column(Integer, default=3)  # 1=urgent, 5=low
    
    # Agent Assignment
    assigned_agent_id = Column(String, nullable=True)
    assigned_agent_name = Column(String, nullable=True)
    
    # Customer Preferences
    preferred_time_slot = Column(String, nullable=True)  # morning, afternoon, evening
    preferred_communication = Column(String, nullable=True)  # phone, video, in-person
    special_requirements = Column(JSON, nullable=True)
    
    # Confirmation and Reminders
    confirmation_sent = Column(Boolean, default=False)
    confirmation_method = Column(String, nullable=True)
    reminder_sent = Column(Boolean, default=False)
    
    # Meeting Details
    meeting_link = Column(String, nullable=True)  # Video call link
    meeting_location = Column(String, nullable=True)  # Physical location
    meeting_notes = Column(Text, nullable=True)
    
    # Follow-up Information
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(DateTime(timezone=True), nullable=True)
    
    # Analytics
    source_campaign = Column(String, nullable=True)
    lead_score = Column(Integer, nullable=True)
    estimated_value = Column(Float, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    call_report = relationship("CallReport")

class SchedulingRule(Base):
    """Reglas de programación automática"""
    __tablename__ = "scheduling_rules"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    rule_name = Column(String, nullable=False)
    
    # Conditions
    customer_timezone = Column(String, nullable=True)
    appointment_type = Column(String, nullable=True)
    priority_level = Column(Integer, nullable=True)
    
    # Business Hours (in rule timezone)
    business_start_hour = Column(Integer, default=9)   # 9 AM
    business_end_hour = Column(Integer, default=18)    # 6 PM
    available_weekdays = Column(JSON, default=lambda: [1,2,3,4,5])  # Mon-Fri
    
    # Scheduling Logic
    advance_booking_days = Column(Integer, default=1)   # Book X days in advance
    buffer_time_minutes = Column(Integer, default=15)  # Buffer between appointments
    
    # Auto-confirmation rules
    auto_confirm_conditions = Column(JSON, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)

class AgentAvailability(Base):
    """Disponibilidad de agentes para citas"""
    __tablename__ = "agent_availability"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id = Column(String, nullable=False, index=True)
    agent_name = Column(String, nullable=False)
    
    # Availability Window
    date = Column(DateTime(timezone=True), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    
    # Capacity
    max_appointments = Column(Integer, default=8)
    current_appointments = Column(Integer, default=0)
    
    # Specialization
    appointment_types = Column(JSON, nullable=True)  # Types this agent can handle
    languages = Column(JSON, default=lambda: ["es"])
    
    # Status
    is_available = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=datetime.now)

@dataclass
class AppointmentRequest:
    """Solicitud de cita"""
    customer_phone: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    appointment_type: str = AppointmentType.CONSULTATION
    preferred_date: Optional[datetime] = None
    preferred_time_slot: str = TimeSlotPreference.FLEXIBLE
    duration_minutes: int = 60
    description: Optional[str] = None
    priority: int = 3
    call_report_id: Optional[str] = None

class IntelligentSchedulingService:
    """
    Servicio inteligente de programación que:
    - Analiza disponibilidad de agentes automáticamente
    - Considera timezones de clientes
    - Optimiza horarios según preferencias
    - Envía confirmaciones y recordatorios
    - Maneja reprogramaciones inteligentemente
    """
    
    def __init__(self, db_session=None):
        self.db_session = db_session
        self.default_business_hours = {
            "start": 9,  # 9 AM
            "end": 18,   # 6 PM
            "weekdays": [1, 2, 3, 4, 5]  # Monday to Friday
        }
        
        logger.info("Intelligent Scheduling Service initialized")
    
    async def _detect_timezone_from_phone(self, phone_number: str) -> tuple:
        """Detect timezone from phone number"""
        try:
            parsed = phonenumbers.parse(phone_number, None)
            country_code = phonenumbers.region_code_for_number(parsed)
            
            # Simple timezone mapping
            timezone_map = {
                "ES": ("ES", "Europe/Madrid"),
                "US": ("US", "America/New_York"), 
                "GB": ("GB", "Europe/London"),
                "FR": ("FR", "Europe/Paris"),
                "DE": ("DE", "Europe/Berlin"),
                "JP": ("JP", "Asia/Tokyo")
            }
            
            return timezone_map.get(country_code, ("Unknown", "UTC"))
            
        except Exception as e:
            logger.error(f"Error detecting timezone: {e}")
            return ("Unknown", "UTC")
    
    async def _analyze_customer_preferences(self, customer_phone: str):
        """Analyze customer preferences"""
        # Mock implementation for validation
        from collections import namedtuple
        CustomerTimePreference = namedtuple('CustomerTimePreference', [
            'preferred_time_of_day', 'preferred_days_of_week', 'show_up_rate'
        ])
        
        return CustomerTimePreference(
            preferred_time_of_day="afternoon",
            preferred_days_of_week=[1, 2, 3, 4, 5],
            show_up_rate=0.85
        )
    
    async def schedule_appointment_from_call(self, call_report: CallReport) -> Optional[AppointmentSchedule]:
        """
        Programar cita automáticamente basada en el reporte de llamada
        """
        try:
            logger.info(f"🔄 Auto-scheduling appointment from call: {call_report.call_id}")
            
            if not call_report.appointment_requested:
                logger.info("No appointment requested in this call")
                return None
            
            # Create appointment request from call report
            request = AppointmentRequest(
                customer_phone=call_report.customer_phone,
                customer_name=call_report.customer_name,
                appointment_type=call_report.appointment_type or AppointmentType.CONSULTATION,
                preferred_date=call_report.preferred_appointment_time,
                description=call_report.appointment_notes,
                call_report_id=call_report.id,
                priority=2 if call_report.lead_score and call_report.lead_score > 70 else 3
            )
            
            # Schedule the appointment
            appointment = await self.schedule_appointment(request)
            
            if appointment:
                logger.info(f"✅ Appointment auto-scheduled: {appointment.id}")
                
                # Create follow-up task for confirmation
                await self._create_confirmation_task(appointment)
                
            return appointment
            
        except Exception as e:
            logger.error(f"❌ Auto-scheduling failed: {e}")
            return None
    
    async def schedule_appointment(self, request: AppointmentRequest) -> Optional[AppointmentSchedule]:
        """
        Programar cita con optimización inteligente
        """
        try:
            logger.info(f"🔄 Scheduling appointment for {request.customer_phone}")
            
            # 1. Analyze customer timezone
            customer_tz_info = await self._analyze_customer_timezone(request.customer_phone)
            
            # 2. Find optimal time slots
            optimal_slots = await self._find_optimal_time_slots(
                request, customer_tz_info
            )
            
            if not optimal_slots:
                logger.warning("No available time slots found")
                return None
            
            # 3. Select best available agent
            selected_slot = optimal_slots[0]  # Best option
            agent_info = await self._get_agent_info(selected_slot["agent_id"])
            
            # 4. Create appointment
            appointment = AppointmentSchedule(
                call_report_id=request.call_report_id,
                customer_phone=request.customer_phone,
                customer_name=request.customer_name,
                customer_email=request.customer_email,
                customer_timezone=customer_tz_info.get("timezone"),
                
                appointment_type=request.appointment_type,
                title=self._generate_appointment_title(request),
                description=request.description or "Consulta programada automáticamente",
                
                requested_date=request.preferred_date,
                scheduled_date=selected_slot["datetime"],
                duration_minutes=request.duration_minutes,
                
                priority=request.priority,
                assigned_agent_id=selected_slot["agent_id"],
                assigned_agent_name=agent_info.get("name", "Agente asignado"),
                
                preferred_time_slot=request.preferred_time_slot,
                
                # Generate meeting details
                meeting_link=await self._generate_meeting_link(selected_slot),
                meeting_location="Oficina virtual / Llamada telefónica"
            )
            
            # 5. Save appointment
            with get_db_write() as db:
                db.add(appointment)
                db.commit()
                db.refresh(appointment)
            
            # 6. Update agent availability
            await self._update_agent_availability(selected_slot["agent_id"], selected_slot["datetime"])
            
            logger.info(f"✅ Appointment scheduled: {appointment.id} for {appointment.scheduled_date}")
            return appointment
            
        except Exception as e:
            logger.error(f"❌ Appointment scheduling failed: {e}")
            return None
    
    async def _analyze_customer_timezone(self, customer_phone: str) -> Dict[str, Any]:
        """Analizar timezone del cliente basado en su teléfono"""
        
        from services.call_reporting_service import CallReportingService
        reporting_service = CallReportingService()
        
        # Use the location analysis from call reporting service
        location_info = await reporting_service._analyze_customer_location(customer_phone)
        
        return {
            "timezone": location_info.get("timezone", "UTC"),
            "country": location_info.get("country_code"),
            "local_time": location_info.get("local_call_time", datetime.now(timezone.utc))
        }
    
    async def _find_optimal_time_slots(self, request: AppointmentRequest, 
                                     customer_tz_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Encontrar horarios óptimos considerando timezone y disponibilidad"""
        
        slots = []
        customer_tz = pytz.timezone(customer_tz_info.get("timezone", "UTC"))
        
        try:
            # Get available agents
            with get_db_read() as db:
                available_agents = db.query(AgentAvailability).filter(
                    AgentAvailability.is_available == True,
                    AgentAvailability.date >= datetime.now(timezone.utc).date()
                ).all()
            
            # Generate time slots for next 7 days
            base_date = datetime.now(timezone.utc).date()
            
            for days_ahead in range(1, 8):  # Next 7 days
                check_date = base_date + timedelta(days=days_ahead)
                
                # Skip weekends unless specifically requested
                if check_date.weekday() >= 5 and request.preferred_time_slot != TimeSlotPreference.FLEXIBLE:
                    continue
                
                # Generate hourly slots during business hours
                for hour in range(9, 18):  # 9 AM to 6 PM
                    slot_datetime = datetime.combine(check_date, time(hour=hour))
                    slot_datetime = pytz.utc.localize(slot_datetime)
                    
                    # Convert to customer timezone for preference checking
                    customer_local_time = slot_datetime.astimezone(customer_tz)
                    
                    # Check if slot matches customer preference
                    if not self._matches_time_preference(customer_local_time, request.preferred_time_slot):
                        continue
                    
                    # Find available agent for this slot
                    for agent in available_agents:
                        if (agent.date.date() == check_date and 
                            agent.start_time <= slot_datetime <= agent.end_time and
                            agent.current_appointments < agent.max_appointments):
                            
                            # Check agent specialization
                            if (agent.appointment_types and 
                                request.appointment_type not in agent.appointment_types):
                                continue
                            
                            slots.append({
                                "datetime": slot_datetime,
                                "agent_id": agent.agent_id,
                                "agent_name": agent.agent_name,
                                "customer_local_time": customer_local_time,
                                "score": self._calculate_slot_score(
                                    slot_datetime, request, customer_tz_info
                                )
                            })
            
            # Sort by score (best options first)
            slots.sort(key=lambda x: x["score"], reverse=True)
            
            logger.info(f"Found {len(slots)} available time slots")
            return slots[:10]  # Return top 10 options
            
        except Exception as e:
            logger.error(f"❌ Error finding time slots: {e}")
            return []
    
    def _matches_time_preference(self, slot_time: datetime, preference: str) -> bool:
        """Check if time slot matches customer preference"""
        
        hour = slot_time.hour
        
        if preference == TimeSlotPreference.MORNING:
            return 9 <= hour < 12
        elif preference == TimeSlotPreference.AFTERNOON:
            return 12 <= hour < 17
        elif preference == TimeSlotPreference.EVENING:
            return 17 <= hour < 20
        else:  # FLEXIBLE
            return 9 <= hour < 18
    
    def _calculate_slot_score(self, slot_datetime: datetime, request: AppointmentRequest,
                            customer_tz_info: Dict[str, Any]) -> float:
        """Calculate score for time slot optimization"""
        
        score = 100.0  # Base score
        
        # Prefer sooner appointments for high priority
        days_from_now = (slot_datetime - datetime.now(timezone.utc)).days
        if request.priority <= 2:  # High priority
            score -= days_from_now * 5  # Prefer sooner
        else:
            score -= days_from_now * 2  # Less preference for timing
        
        # Prefer business hours in customer timezone
        customer_tz = pytz.timezone(customer_tz_info.get("timezone", "UTC"))
        customer_local_time = slot_datetime.astimezone(customer_tz)
        customer_hour = customer_local_time.hour
        
        if 9 <= customer_hour <= 17:  # Business hours
            score += 20
        elif 17 < customer_hour <= 19:  # Early evening
            score += 10
        else:
            score -= 30  # Outside preferred hours
        
        # Prefer weekdays
        if slot_datetime.weekday() < 5:  # Monday to Friday
            score += 15
        
        return score
    
    async def _get_agent_info(self, agent_id: str) -> Dict[str, Any]:
        """Get agent information"""
        
        with get_db_read() as db:
            agent = db.query(AgentAvailability).filter(
                AgentAvailability.agent_id == agent_id
            ).first()
            
            if agent:
                return {
                    "id": agent.agent_id,
                    "name": agent.agent_name,
                    "languages": agent.languages,
                    "specializations": agent.appointment_types
                }
        
        return {"id": agent_id, "name": "Agente disponible"}
    
    def _generate_appointment_title(self, request: AppointmentRequest) -> str:
        """Generate descriptive appointment title"""
        
        type_names = {
            AppointmentType.CONSULTATION: "Consulta inicial",
            AppointmentType.PRESENTATION: "Presentación de productos",
            AppointmentType.FOLLOW_UP_MEETING: "Reunión de seguimiento",
            AppointmentType.CLOSING_MEETING: "Reunión de cierre",
            AppointmentType.CUSTOMER_SERVICE: "Servicio al cliente",
            AppointmentType.TECHNICAL_SUPPORT: "Soporte técnico"
        }
        
        title = type_names.get(request.appointment_type, "Consulta")
        
        if request.customer_name:
            title += f" - {request.customer_name}"
        
        return title
    
    async def _generate_meeting_link(self, slot_info: Dict[str, Any]) -> str:
        """Generate meeting link (video call or phone)"""
        
        # In production, this would integrate with calendar systems
        # For now, return a formatted meeting identifier
        meeting_id = str(uuid.uuid4())[:8].upper()
        
        return f"https://meet.spirittours.com/appointment/{meeting_id}"
    
    async def _update_agent_availability(self, agent_id: str, appointment_time: datetime):
        """Update agent availability after booking"""
        
        try:
            with get_db_write() as db:
                availability = db.query(AgentAvailability).filter(
                    AgentAvailability.agent_id == agent_id,
                    AgentAvailability.date == appointment_time.date()
                ).first()
                
                if availability:
                    availability.current_appointments += 1
                    db.commit()
                    
                    logger.info(f"Updated availability for agent {agent_id}")
        
        except Exception as e:
            logger.error(f"❌ Failed to update agent availability: {e}")
    
    async def _create_confirmation_task(self, appointment: AppointmentSchedule):
        """Create task to confirm appointment with customer"""
        
        try:
            # Calculate optimal confirmation time (24 hours before, or 2 hours if urgent)
            hours_before = 2 if appointment.priority <= 2 else 24
            confirmation_time = appointment.scheduled_date - timedelta(hours=hours_before)
            
            # Make sure confirmation is at least 1 hour from now
            min_confirmation_time = datetime.now(timezone.utc) + timedelta(hours=1)
            if confirmation_time < min_confirmation_time:
                confirmation_time = min_confirmation_time
            
            confirmation_task = FollowUpTask(
                call_report_id=appointment.call_report_id,
                task_type="phone_call",
                priority=2,  # High priority
                status="pending",
                scheduled_for=confirmation_time,
                task_description="Confirmar cita programada con cliente",
                suggested_script=self._generate_confirmation_script(appointment),
                context_notes={
                    "appointment_id": appointment.id,
                    "appointment_date": appointment.scheduled_date.isoformat(),
                    "meeting_link": appointment.meeting_link,
                    "customer_timezone": appointment.customer_timezone
                },
                assigned_to=appointment.assigned_agent_id
            )
            
            with get_db_write() as db:
                db.add(confirmation_task)
                db.commit()
            
            logger.info(f"✅ Confirmation task created for appointment {appointment.id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to create confirmation task: {e}")
    
    def _generate_confirmation_script(self, appointment: AppointmentSchedule) -> str:
        """Generate script for appointment confirmation call"""
        
        customer_name = appointment.customer_name or "Cliente"
        formatted_date = appointment.scheduled_date.strftime("%d/%m/%Y")
        formatted_time = appointment.scheduled_date.strftime("%H:%M")
        
        # Convert to customer timezone if available
        if appointment.customer_timezone:
            try:
                customer_tz = pytz.timezone(appointment.customer_timezone)
                local_time = appointment.scheduled_date.astimezone(customer_tz)
                formatted_time = local_time.strftime("%H:%M")
                formatted_date = local_time.strftime("%d/%m/%Y")
            except Exception:
                pass  # Use UTC if timezone conversion fails
        
        script = f"""
        Hola {customer_name}, le habla [NOMBRE] de Spirit Tours.
        
        Le llamo para confirmar su cita programada para el {formatted_date} 
        a las {formatted_time} (hora local).
        
        Tipo de cita: {appointment.title}
        Duración estimada: {appointment.duration_minutes} minutos
        
        La reunión será {'virtual' if appointment.meeting_link else 'telefónica'}.
        {f'Link de acceso: {appointment.meeting_link}' if appointment.meeting_link else ''}
        
        ¿Confirma su asistencia? Si necesita reprogramar, podemos buscar 
        otro horario que sea más conveniente para usted.
        
        ¿Tiene alguna pregunta sobre la reunión?
        """
        
        return script.strip()
    
    async def get_upcoming_appointments(self, filters: Dict[str, Any] = None,
                                     limit: int = 100) -> List[AppointmentSchedule]:
        """Get upcoming appointments with filtering"""
        
        with get_db_read() as db:
            query = db.query(AppointmentSchedule).filter(
                AppointmentSchedule.scheduled_date >= datetime.now(timezone.utc),
                AppointmentSchedule.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
            )
            
            if filters:
                if "agent_id" in filters:
                    query = query.filter(AppointmentSchedule.assigned_agent_id == filters["agent_id"])
                
                if "customer_phone" in filters:
                    query = query.filter(AppointmentSchedule.customer_phone == filters["customer_phone"])
                
                if "appointment_type" in filters:
                    query = query.filter(AppointmentSchedule.appointment_type == filters["appointment_type"])
                
                if "priority" in filters:
                    query = query.filter(AppointmentSchedule.priority <= filters["priority"])
            
            return query.order_by(AppointmentSchedule.scheduled_date.asc()).limit(limit).all()
    
    async def reschedule_appointment(self, appointment_id: str, new_datetime: datetime,
                                  reason: str = None) -> bool:
        """Reschedule an existing appointment"""
        
        try:
            with get_db_write() as db:
                appointment = db.query(AppointmentSchedule).filter(
                    AppointmentSchedule.id == appointment_id
                ).first()
                
                if not appointment:
                    logger.error(f"Appointment not found: {appointment_id}")
                    return False
                
                # Store old date for reference
                old_date = appointment.scheduled_date
                
                # Update appointment
                appointment.scheduled_date = new_datetime
                appointment.status = AppointmentStatus.RESCHEDULED
                appointment.updated_at = datetime.now(timezone.utc)
                
                # Add reschedule note
                if reason:
                    current_notes = appointment.meeting_notes or ""
                    reschedule_note = f"\\n[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Reprogramada desde {old_date.strftime('%Y-%m-%d %H:%M')}: {reason}"
                    appointment.meeting_notes = current_notes + reschedule_note
                
                db.commit()
                
                # Create new confirmation task
                await self._create_confirmation_task(appointment)
                
                logger.info(f"✅ Appointment rescheduled: {appointment_id}")
                return True
                
        except Exception as e:
            logger.error(f"❌ Rescheduling failed: {e}")
            return False
    
    async def complete_appointment(self, appointment_id: str, notes: str = None,
                                follow_up_needed: bool = False) -> bool:
        """Mark appointment as completed"""
        
        try:
            with get_db_write() as db:
                appointment = db.query(AppointmentSchedule).filter(
                    AppointmentSchedule.id == appointment_id
                ).first()
                
                if not appointment:
                    return False
                
                appointment.status = AppointmentStatus.COMPLETED
                appointment.follow_up_required = follow_up_needed
                
                if notes:
                    appointment.meeting_notes = (appointment.meeting_notes or "") + f"\\n\\nNotas de cierre: {notes}"
                
                if follow_up_needed:
                    # Schedule follow-up for 3-7 days later
                    follow_up_date = datetime.now(timezone.utc) + timedelta(days=5)
                    appointment.follow_up_date = follow_up_date
                
                appointment.updated_at = datetime.now(timezone.utc)
                db.commit()
                
                logger.info(f"✅ Appointment completed: {appointment_id}")
                return True
                
        except Exception as e:
            logger.error(f"❌ Failed to complete appointment: {e}")
            return False
    
    async def get_scheduling_analytics(self) -> Dict[str, Any]:
        """Get scheduling performance analytics"""
        
        try:
            with get_db_read() as db:
                # Basic stats
                total_appointments = db.query(AppointmentSchedule).count()
                confirmed_appointments = db.query(AppointmentSchedule).filter(
                    AppointmentSchedule.status == AppointmentStatus.CONFIRMED
                ).count()
                completed_appointments = db.query(AppointmentSchedule).filter(
                    AppointmentSchedule.status == AppointmentStatus.COMPLETED
                ).count()
                
                # Calculate rates
                confirmation_rate = (confirmed_appointments / total_appointments * 100) if total_appointments > 0 else 0
                completion_rate = (completed_appointments / total_appointments * 100) if total_appointments > 0 else 0
                
                return {
                    "total_appointments": total_appointments,
                    "confirmed_appointments": confirmed_appointments,
                    "completed_appointments": completed_appointments,
                    "confirmation_rate": round(confirmation_rate, 2),
                    "completion_rate": round(completion_rate, 2),
                    "pending_confirmations": db.query(AppointmentSchedule).filter(
                        AppointmentSchedule.status == AppointmentStatus.PENDING
                    ).count()
                }
                
        except Exception as e:
            logger.error(f"❌ Analytics calculation failed: {e}")
            return {}

# Global service instance
intelligent_scheduling_service = IntelligentSchedulingService()