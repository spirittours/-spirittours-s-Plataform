#!/usr/bin/env python3
"""
🎫 Sistema Avanzado de Ticketing para Spirit Tours
Sistema completo de tickets para seguimiento de ventas, gestión de procesos
y automatización del customer journey desde lead hasta cierre de venta.

Features:
- Ticketing multi-etapa para proceso de ventas completo
- SLA automático y escalamiento de tickets
- Templates de procesos personalizables
- Automatización de tareas y seguimientos
- Integración completa con CRM y agentes (IA/Humanos)
- Dashboard en tiempo real de tickets activos
- Reportes de performance y conversión
- Workflows configurables por tipo de cliente
"""

import asyncio
import logging
import json
import time
from typing import Dict, List, Optional, Any, Callable, Union, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from enum import Enum
from collections import defaultdict, deque
import uuid
import threading
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Float, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, Session
from sqlalchemy.dialects.postgresql import UUID
import jinja2

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base = declarative_base()

class TicketType(Enum):
    """Tipos de tickets"""
    SALES_INQUIRY = "sales_inquiry"           # Consulta inicial de ventas
    QUOTE_REQUEST = "quote_request"           # Solicitud de cotización
    BOOKING_PROCESS = "booking_process"       # Proceso de reserva
    PAYMENT_PROCESSING = "payment_processing" # Procesamiento de pago
    BOOKING_CONFIRMATION = "booking_confirmation" # Confirmación de reserva
    CUSTOMER_SUPPORT = "customer_support"     # Soporte al cliente
    COMPLAINT = "complaint"                   # Reclamo o queja
    REFUND_REQUEST = "refund_request"         # Solicitud de reembolso
    CANCELLATION = "cancellation"             # Cancelación
    MODIFICATION = "modification"             # Modificación de reserva

class TicketStatus(Enum):
    """Estados de tickets"""
    OPEN = "open"                    # Ticket abierto
    IN_PROGRESS = "in_progress"      # En progreso
    PENDING_CUSTOMER = "pending_customer"  # Esperando respuesta del cliente
    PENDING_INTERNAL = "pending_internal"  # Esperando acción interna
    ESCALATED = "escalated"          # Escalado a supervisor
    RESOLVED = "resolved"            # Resuelto
    CLOSED = "closed"                # Cerrado
    CANCELLED = "cancelled"          # Cancelado

class TicketPriority(Enum):
    """Prioridades de tickets"""
    LOW = "low"                      # Prioridad baja
    NORMAL = "normal"                # Prioridad normal
    HIGH = "high"                    # Prioridad alta
    URGENT = "urgent"                # Urgente
    CRITICAL = "critical"            # Crítico

class SalesStage(Enum):
    """Etapas del proceso de ventas"""
    INITIAL_CONTACT = "initial_contact"           # Contacto inicial
    NEEDS_ASSESSMENT = "needs_assessment"         # Evaluación de necesidades
    PROPOSAL_PREPARATION = "proposal_preparation" # Preparación de propuesta
    PROPOSAL_PRESENTED = "proposal_presented"     # Propuesta presentada
    NEGOTIATION = "negotiation"                   # Negociación
    DECISION_PENDING = "decision_pending"         # Decisión pendiente
    CONTRACT_PREPARATION = "contract_preparation" # Preparación de contrato
    PAYMENT_PROCESSING = "payment_processing"     # Procesamiento de pago
    BOOKING_CONFIRMED = "booking_confirmed"       # Reserva confirmada
    DELIVERY_COMPLETE = "delivery_complete"       # Entrega completada
    CLOSED_WON = "closed_won"                     # Venta ganada
    CLOSED_LOST = "closed_lost"                   # Venta perdida

class WorkflowAction(Enum):
    """Acciones de workflow"""
    ASSIGN_AGENT = "assign_agent"
    SEND_EMAIL = "send_email"
    SEND_SMS = "send_sms"
    CREATE_TASK = "create_task"
    UPDATE_STATUS = "update_status"
    ESCALATE = "escalate"
    SET_REMINDER = "set_reminder"
    TRIGGER_AUTOMATION = "trigger_automation"

class SLALevel(Enum):
    """Niveles de SLA"""
    STANDARD = "standard"            # 24 horas
    PRIORITY = "priority"            # 8 horas
    VIP = "vip"                      # 4 horas
    ENTERPRISE = "enterprise"        # 2 horas
    EMERGENCY = "emergency"          # 1 hora

# Modelos de Base de Datos Adicionales
class TicketTemplate(Base):
    """Templates de tickets para diferentes procesos"""
    __tablename__ = 'ticket_templates'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Información básica
    name = Column(String(200), nullable=False)
    description = Column(Text)
    ticket_type = Column(String(50), nullable=False)
    
    # Configuración del template
    default_priority = Column(String(20), default=TicketPriority.NORMAL.value)
    estimated_duration_hours = Column(Float, default=24.0)
    sla_level = Column(String(20), default=SLALevel.STANDARD.value)
    
    # Workflow y automatización
    workflow_stages = Column(JSON)  # Lista de etapas del workflow
    automation_rules = Column(JSON) # Reglas de automatización
    
    # Templates de contenido
    title_template = Column(String(500))
    description_template = Column(Text)
    
    # Asignación
    default_team = Column(String(100))
    default_agent_type = Column(String(20))  # 'human', 'ai', 'auto'
    
    # Estado
    is_active = Column(Boolean, default=True)

class TicketWorkflow(Base):
    """Workflows configurables para tickets"""
    __tablename__ = 'ticket_workflows'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey('tickets.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Configuración del workflow
    workflow_name = Column(String(200))
    current_stage = Column(String(100))
    stage_order = Column(JSON)  # Orden de las etapas
    
    # Estado
    is_active = Column(Boolean, default=True)
    completed_at = Column(DateTime)
    
    # Metadata
    stage_history = Column(JSON)  # Historial de cambios de etapa
    automation_data = Column(JSON) # Datos para automatización
    
    # Relaciones
    ticket = relationship("Ticket")
    stages = relationship("WorkflowStage", back_populates="workflow", cascade="all, delete-orphan")

class WorkflowStage(Base):
    """Etapas individuales del workflow"""
    __tablename__ = 'workflow_stages'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey('ticket_workflows.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Información de la etapa
    stage_name = Column(String(100), nullable=False)
    stage_order = Column(Integer, nullable=False)
    
    # Estado
    status = Column(String(50), default='pending')  # pending, in_progress, completed, skipped
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Configuración
    estimated_duration_hours = Column(Float)
    required_actions = Column(JSON)  # Acciones requeridas para completar
    automation_triggers = Column(JSON)  # Triggers automáticos
    
    # Asignación
    assigned_agent_id = Column(String(100))
    assigned_team = Column(String(100))
    
    # Resultados
    completion_notes = Column(Text)
    outcome = Column(String(100))
    
    # Relaciones
    workflow = relationship("TicketWorkflow", back_populates="stages")

class TicketSLA(Base):
    """SLA tracking para tickets"""
    __tablename__ = 'ticket_sla'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey('tickets.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Configuración SLA
    sla_level = Column(String(20), nullable=False)
    target_first_response_minutes = Column(Integer)
    target_resolution_hours = Column(Integer)
    
    # Tracking de tiempos
    first_response_at = Column(DateTime)
    first_response_time_minutes = Column(Integer)
    resolution_at = Column(DateTime)
    resolution_time_hours = Column(Float)
    
    # Estado SLA
    first_response_breached = Column(Boolean, default=False)
    resolution_breached = Column(Boolean, default=False)
    sla_met = Column(Boolean)
    
    # Escalamiento
    escalation_triggered = Column(Boolean, default=False)
    escalation_level = Column(Integer, default=0)
    
    # Relaciones
    ticket = relationship("Ticket")

class TicketAutomation(Base):
    """Reglas de automatización para tickets"""
    __tablename__ = 'ticket_automation'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Configuración básica
    name = Column(String(200), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Condiciones trigger
    trigger_conditions = Column(JSON)  # Condiciones que activan la regla
    trigger_events = Column(JSON)      # Eventos que pueden activarla
    
    # Acciones
    actions = Column(JSON)             # Acciones a ejecutar
    
    # Configuración de ejecución
    execution_delay_minutes = Column(Integer, default=0)
    max_executions = Column(Integer)   # Límite de ejecuciones
    execution_count = Column(Integer, default=0)
    
    # Filtros
    applicable_ticket_types = Column(JSON)
    applicable_priorities = Column(JSON)
    applicable_teams = Column(JSON)

@dataclass
class SLAConfiguration:
    """Configuración de SLA"""
    level: SLALevel
    first_response_minutes: int
    resolution_hours: int
    escalation_threshold_hours: int
    business_hours_only: bool = True

@dataclass
class WorkflowStageConfig:
    """Configuración de etapa de workflow"""
    name: str
    order: int
    estimated_duration_hours: float
    required_actions: List[str]
    automation_triggers: List[Dict[str, Any]]
    assigned_team: Optional[str] = None

@dataclass
class TicketMetrics:
    """Métricas de tickets"""
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    resolved_tickets: int
    average_resolution_time_hours: float
    sla_compliance_rate: float
    first_response_time_avg_minutes: float
    escalation_rate: float

class AdvancedTicketingSystem:
    """
    Sistema avanzado de ticketing para Spirit Tours
    
    Características:
    - Gestión completa del ciclo de vida de tickets
    - Workflows configurables por tipo de proceso
    - SLA automático con escalamiento
    - Automatización de tareas y seguimientos
    - Templates personalizables
    - Integración con CRM y agentes
    - Analytics y reportes avanzados
    """
    
    def __init__(self, database_url: str = "sqlite:///spirit_tours_ticketing.db"):
        self.database_url = database_url
        self.engine = create_engine(database_url, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
        # Crear tablas
        Base.metadata.create_all(bind=self.engine)
        
        # Configuración SLA por defecto
        self.sla_configs = {
            SLALevel.STANDARD: SLAConfiguration(SLALevel.STANDARD, 60, 24, 20),
            SLALevel.PRIORITY: SLAConfiguration(SLALevel.PRIORITY, 30, 8, 6),
            SLALevel.VIP: SLAConfiguration(SLALevel.VIP, 15, 4, 3),
            SLALevel.ENTERPRISE: SLAConfiguration(SLALevel.ENTERPRISE, 10, 2, 1),
            SLALevel.EMERGENCY: SLAConfiguration(SLALevel.EMERGENCY, 5, 1, 0.5)
        }
        
        # Templates Jinja2 para contenido
        self.jinja_env = jinja2.Environment(
            loader=jinja2.DictLoader({})
        )
        
        # Cache de datos
        self.ticket_cache = {}
        self.workflow_cache = {}
        
        # Callbacks y eventos
        self.event_callbacks = defaultdict(list)
        self.automation_rules = []
        
        # Estado del sistema
        self.is_running = False

    async def initialize(self):
        """Inicializar sistema de ticketing"""
        try:
            logger.info("🎫 Initializing Advanced Ticketing System...")
            
            # Cargar templates por defecto
            await self._load_default_templates()
            
            # Cargar reglas de automatización
            await self._load_automation_rules()
            
            # Iniciar tareas de background
            asyncio.create_task(self._sla_monitor_loop())
            asyncio.create_task(self._automation_processor_loop())
            asyncio.create_task(self._workflow_processor_loop())
            
            self.is_running = True
            logger.info("✅ Advanced Ticketing System initialized successfully")
            
            return {
                "status": "initialized",
                "database_url": self.database_url.replace("://", "://***@") if "@" in self.database_url else self.database_url,
                "sla_levels": len(self.sla_configs),
                "automation_rules": len(self.automation_rules)
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize ticketing system: {e}")
            raise

    async def create_ticket_from_lead(self, lead_id: str, ticket_type: TicketType, 
                                    template_name: Optional[str] = None, 
                                    custom_data: Dict[str, Any] = None) -> str:
        """Crear ticket desde lead"""
        try:
            # Generar número de ticket único
            ticket_number = await self._generate_ticket_number()
            
            # Obtener template si se especifica
            template = None
            if template_name:
                template = await self._get_template(template_name)
            
            # Determinar SLA level basado en tipo de ticket y lead
            sla_level = await self._determine_sla_level(lead_id, ticket_type)
            
            with self.SessionLocal() as session:
                # Crear ticket
                ticket = Ticket(
                    ticket_number=ticket_number,
                    lead_id=lead_id,
                    ticket_type=ticket_type.value,
                    title=await self._generate_ticket_title(lead_id, ticket_type, template, custom_data),
                    description=await self._generate_ticket_description(lead_id, ticket_type, template, custom_data),
                    priority=template.default_priority if template else TicketPriority.NORMAL.value,
                    status=TicketStatus.OPEN.value,
                    estimated_deal_value=custom_data.get('estimated_value', 0.0) if custom_data else 0.0,
                    probability=custom_data.get('probability', 0.5) if custom_data else 0.5,
                    source_channel=custom_data.get('source_channel') if custom_data else None,
                    custom_fields=custom_data or {}
                )
                
                session.add(ticket)
                session.commit()
                session.refresh(ticket)
                
                ticket_id = str(ticket.id)
            
            # Crear SLA tracking
            await self._create_sla_tracking(ticket_id, sla_level)
            
            # Crear workflow si hay template
            if template and template.workflow_stages:
                await self._create_workflow(ticket_id, template.workflow_stages)
            
            # Asignar agente automáticamente
            await self._auto_assign_ticket(ticket_id, ticket_type)
            
            # Registrar actividad inicial
            await self._add_ticket_activity(
                ticket_id,
                'ticket_created',
                f"Ticket created from lead with type {ticket_type.value}",
                'system'
            )
            
            # Disparar eventos de automatización
            await self._trigger_ticket_event('ticket_created', {
                'ticket_id': ticket_id,
                'ticket_type': ticket_type.value,
                'lead_id': lead_id,
                'priority': ticket.priority
            })
            
            logger.info(f"✅ Ticket created: {ticket_number} for lead {lead_id}")
            
            return ticket_id
            
        except Exception as e:
            logger.error(f"❌ Failed to create ticket from lead: {e}")
            raise

    async def update_ticket_status(self, ticket_id: str, new_status: TicketStatus, 
                                 agent_id: str, notes: str = None) -> bool:
        """Actualizar estado del ticket"""
        try:
            with self.SessionLocal() as session:
                ticket = session.query(Ticket).filter(Ticket.id == ticket_id).first()
                
                if not ticket:
                    raise ValueError(f"Ticket {ticket_id} not found")
                
                old_status = ticket.status
                ticket.status = new_status.value
                ticket.updated_at = datetime.utcnow()
                ticket.last_activity = datetime.utcnow()
                
                # Actualizar tiempos de resolución
                if new_status == TicketStatus.RESOLVED:
                    await self._update_sla_resolution_time(ticket_id)
                
                session.commit()
            
            # Registrar actividad
            await self._add_ticket_activity(
                ticket_id,
                'status_changed',
                f"Status changed from {old_status} to {new_status.value}",
                agent_id,
                notes
            )
            
            # Actualizar workflow si existe
            await self._update_workflow_on_status_change(ticket_id, new_status.value)
            
            # Disparar eventos
            await self._trigger_ticket_event('ticket_status_changed', {
                'ticket_id': ticket_id,
                'old_status': old_status,
                'new_status': new_status.value,
                'agent_id': agent_id
            })
            
            logger.info(f"✅ Ticket {ticket_id} status updated: {old_status} → {new_status.value}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to update ticket status: {e}")
            return False

    async def advance_sales_stage(self, ticket_id: str, stage: SalesStage, 
                                agent_id: str, notes: str = None) -> bool:
        """Avanzar etapa de ventas"""
        try:
            with self.SessionLocal() as session:
                ticket = session.query(Ticket).filter(Ticket.id == ticket_id).first()
                
                if not ticket:
                    raise ValueError(f"Ticket {ticket_id} not found")
                
                old_stage = ticket.stage
                ticket.stage = stage.value
                ticket.updated_at = datetime.utcnow()
                ticket.last_activity = datetime.utcnow()
                
                # Actualizar progreso basado en la etapa
                progress_mapping = {
                    SalesStage.INITIAL_CONTACT: 10,
                    SalesStage.NEEDS_ASSESSMENT: 20,
                    SalesStage.PROPOSAL_PREPARATION: 35,
                    SalesStage.PROPOSAL_PRESENTED: 50,
                    SalesStage.NEGOTIATION: 65,
                    SalesStage.DECISION_PENDING: 75,
                    SalesStage.CONTRACT_PREPARATION: 85,
                    SalesStage.PAYMENT_PROCESSING: 95,
                    SalesStage.BOOKING_CONFIRMED: 100,
                    SalesStage.CLOSED_WON: 100,
                    SalesStage.CLOSED_LOST: 0
                }
                
                ticket.progress_percentage = progress_mapping.get(stage, 0)
                
                session.commit()
            
            # Registrar actividad
            await self._add_ticket_activity(
                ticket_id,
                'stage_advanced',
                f"Sales stage advanced from {old_stage} to {stage.value}",
                agent_id,
                notes
            )
            
            # Actualizar workflow
            await self._advance_workflow_stage(ticket_id, stage.value)
            
            # Automatización basada en etapa
            await self._trigger_stage_automation(ticket_id, stage.value)
            
            # Disparar eventos
            await self._trigger_ticket_event('sales_stage_advanced', {
                'ticket_id': ticket_id,
                'old_stage': old_stage,
                'new_stage': stage.value,
                'progress': ticket.progress_percentage,
                'agent_id': agent_id
            })
            
            logger.info(f"✅ Ticket {ticket_id} stage advanced: {old_stage} → {stage.value}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to advance sales stage: {e}")
            return False

    async def get_agent_dashboard(self, agent_id: str) -> Dict[str, Any]:
        """Obtener dashboard del agente"""
        try:
            with self.SessionLocal() as session:
                # Tickets asignados al agente
                assigned_tickets = session.query(Ticket)\
                    .filter(Ticket.assigned_agent_id == agent_id)\
                    .filter(Ticket.status.in_([
                        TicketStatus.OPEN.value,
                        TicketStatus.IN_PROGRESS.value,
                        TicketStatus.PENDING_CUSTOMER.value
                    ]))\
                    .order_by(Ticket.priority.desc(), Ticket.created_at.asc())\
                    .all()
                
                # Tickets por prioridad
                priority_counts = defaultdict(int)
                status_counts = defaultdict(int)
                
                tickets_data = []
                for ticket in assigned_tickets:
                    priority_counts[ticket.priority] += 1
                    status_counts[ticket.status] += 1
                    
                    # Obtener información adicional
                    sla_info = await self._get_ticket_sla_info(str(ticket.id))
                    
                    tickets_data.append({
                        'id': str(ticket.id),
                        'number': ticket.ticket_number,
                        'title': ticket.title,
                        'type': ticket.ticket_type,
                        'status': ticket.status,
                        'priority': ticket.priority,
                        'stage': ticket.stage,
                        'progress': ticket.progress_percentage,
                        'estimated_value': ticket.estimated_deal_value,
                        'created_at': ticket.created_at.isoformat(),
                        'last_activity': ticket.last_activity.isoformat() if ticket.last_activity else None,
                        'sla_deadline': sla_info.get('sla_deadline'),
                        'sla_status': sla_info.get('sla_status'),
                        'time_remaining_hours': sla_info.get('time_remaining_hours')
                    })
                
                # Métricas del agente
                today = datetime.utcnow().date()
                
                # Tickets resueltos hoy
                resolved_today = session.query(Ticket)\
                    .filter(Ticket.assigned_agent_id == agent_id)\
                    .filter(Ticket.status == TicketStatus.RESOLVED.value)\
                    .filter(Ticket.updated_at >= datetime.combine(today, datetime.min.time()))\
                    .count()
                
                # Tickets escalados
                escalated_count = session.query(Ticket)\
                    .filter(Ticket.assigned_agent_id == agent_id)\
                    .filter(Ticket.status == TicketStatus.ESCALATED.value)\
                    .count()
                
                return {
                    'agent_id': agent_id,
                    'summary': {
                        'total_assigned': len(assigned_tickets),
                        'resolved_today': resolved_today,
                        'escalated': escalated_count,
                        'priority_breakdown': dict(priority_counts),
                        'status_breakdown': dict(status_counts)
                    },
                    'tickets': tickets_data,
                    'urgent_actions': await self._get_urgent_actions(agent_id),
                    'upcoming_deadlines': await self._get_upcoming_deadlines(agent_id)
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to get agent dashboard: {e}")
            return {}

    async def get_ticket_analytics(self, date_from: datetime = None, 
                                 date_to: datetime = None) -> Dict[str, Any]:
        """Obtener analytics de tickets"""
        try:
            if not date_from:
                date_from = datetime.utcnow() - timedelta(days=30)
            if not date_to:
                date_to = datetime.utcnow()
            
            with self.SessionLocal() as session:
                # Tickets en el período
                tickets = session.query(Ticket)\
                    .filter(Ticket.created_at >= date_from)\
                    .filter(Ticket.created_at <= date_to)\
                    .all()
                
                if not tickets:
                    return {"error": "No tickets found in the specified period"}
                
                # Métricas básicas
                total_tickets = len(tickets)
                resolved_tickets = len([t for t in tickets if t.status == TicketStatus.RESOLVED.value])
                
                # Tiempo promedio de resolución
                resolved_with_times = []
                for ticket in tickets:
                    if ticket.status == TicketStatus.RESOLVED.value:
                        resolution_time = (ticket.updated_at - ticket.created_at).total_seconds() / 3600
                        resolved_with_times.append(resolution_time)
                
                avg_resolution_time = sum(resolved_with_times) / len(resolved_with_times) if resolved_with_times else 0
                
                # SLA compliance
                sla_compliant = 0
                total_with_sla = 0
                
                for ticket in tickets:
                    sla_info = await self._get_ticket_sla_info(str(ticket.id))
                    if sla_info.get('sla_tracked'):
                        total_with_sla += 1
                        if sla_info.get('sla_met'):
                            sla_compliant += 1
                
                sla_compliance_rate = (sla_compliant / max(total_with_sla, 1)) * 100
                
                # Analytics por tipo
                type_analytics = defaultdict(lambda: {'count': 0, 'resolved': 0, 'avg_value': 0})
                
                for ticket in tickets:
                    ticket_type = ticket.ticket_type
                    type_analytics[ticket_type]['count'] += 1
                    
                    if ticket.status == TicketStatus.RESOLVED.value:
                        type_analytics[ticket_type]['resolved'] += 1
                    
                    if ticket.estimated_deal_value:
                        current_avg = type_analytics[ticket_type]['avg_value']
                        current_count = type_analytics[ticket_type]['count']
                        type_analytics[ticket_type]['avg_value'] = (
                            (current_avg * (current_count - 1) + ticket.estimated_deal_value) / current_count
                        )
                
                # Top agentes
                agent_performance = defaultdict(lambda: {'assigned': 0, 'resolved': 0, 'total_value': 0})
                
                for ticket in tickets:
                    if ticket.assigned_agent_id:
                        agent_id = ticket.assigned_agent_id
                        agent_performance[agent_id]['assigned'] += 1
                        
                        if ticket.status == TicketStatus.RESOLVED.value:
                            agent_performance[agent_id]['resolved'] += 1
                            agent_performance[agent_id]['total_value'] += ticket.estimated_deal_value or 0
                
                # Convertir a lista ordenada
                top_agents = sorted(
                    [{'agent_id': k, **v} for k, v in agent_performance.items()],
                    key=lambda x: x['resolved'],
                    reverse=True
                )[:10]
                
                return {
                    'period': {
                        'from': date_from.isoformat(),
                        'to': date_to.isoformat()
                    },
                    'summary': {
                        'total_tickets': total_tickets,
                        'resolved_tickets': resolved_tickets,
                        'resolution_rate': (resolved_tickets / total_tickets) * 100,
                        'avg_resolution_time_hours': round(avg_resolution_time, 2),
                        'sla_compliance_rate': round(sla_compliance_rate, 2)
                    },
                    'by_type': dict(type_analytics),
                    'top_performing_agents': top_agents,
                    'ticket_volume_by_day': await self._calculate_daily_volume(tickets),
                    'priority_distribution': self._calculate_priority_distribution(tickets),
                    'stage_conversion_rates': await self._calculate_stage_conversion_rates(tickets)
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to get ticket analytics: {e}")
            return {}

    async def _load_default_templates(self):
        """Cargar templates por defecto"""
        try:
            default_templates = [
                {
                    "name": "Sales Inquiry Template",
                    "ticket_type": TicketType.SALES_INQUIRY.value,
                    "title_template": "Sales Inquiry - {{lead_name}} - {{tour_interest}}",
                    "description_template": "New sales inquiry from {{lead_name}} ({{email}}) interested in {{tour_interest}}. Source: {{source}}",
                    "workflow_stages": [
                        {"name": "Initial Contact", "order": 1, "duration": 2, "actions": ["contact_lead", "assess_needs"]},
                        {"name": "Needs Assessment", "order": 2, "duration": 4, "actions": ["understand_requirements", "propose_solutions"]},
                        {"name": "Proposal Creation", "order": 3, "duration": 8, "actions": ["create_proposal", "calculate_pricing"]},
                        {"name": "Follow-up", "order": 4, "duration": 24, "actions": ["send_proposal", "schedule_follow_up"]}
                    ]
                },
                {
                    "name": "Booking Process Template", 
                    "ticket_type": TicketType.BOOKING_PROCESS.value,
                    "title_template": "Booking Process - {{lead_name}} - {{tour_package}}",
                    "description_template": "Booking process initiated for {{lead_name}} for {{tour_package}}. Estimated value: ${{estimated_value}}",
                    "workflow_stages": [
                        {"name": "Booking Details", "order": 1, "duration": 1, "actions": ["collect_details", "verify_availability"]},
                        {"name": "Documentation", "order": 2, "duration": 2, "actions": ["collect_documents", "verify_identity"]},
                        {"name": "Payment Processing", "order": 3, "duration": 1, "actions": ["process_payment", "send_confirmation"]},
                        {"name": "Confirmation", "order": 4, "duration": 0.5, "actions": ["send_vouchers", "provide_instructions"]}
                    ]
                }
            ]
            
            with self.SessionLocal() as session:
                for template_data in default_templates:
                    existing = session.query(TicketTemplate)\
                        .filter(TicketTemplate.name == template_data["name"])\
                        .first()
                    
                    if not existing:
                        template = TicketTemplate(
                            name=template_data["name"],
                            ticket_type=template_data["ticket_type"],
                            title_template=template_data["title_template"],
                            description_template=template_data["description_template"],
                            workflow_stages=template_data["workflow_stages"]
                        )
                        session.add(template)
                
                session.commit()
            
            logger.info("📋 Default ticket templates loaded")
            
        except Exception as e:
            logger.error(f"❌ Failed to load default templates: {e}")

    async def cleanup(self):
        """Limpiar recursos del sistema de ticketing"""
        try:
            logger.info("🧹 Cleaning up Advanced Ticketing System...")
            
            self.is_running = False
            
            # Cerrar conexiones de base de datos
            if hasattr(self, 'engine'):
                self.engine.dispose()
            
            # Limpiar caches
            self.ticket_cache.clear()
            self.workflow_cache.clear()
            
            logger.info("✅ Ticketing system cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ Ticketing system cleanup error: {e}")

# Función de utilidad para crear instancia
async def create_advanced_ticketing_system(config: Dict[str, Any]) -> AdvancedTicketingSystem:
    """
    Factory function para crear sistema de ticketing configurado
    """
    ticketing_system = AdvancedTicketingSystem(
        database_url=config.get("database_url", "sqlite:///spirit_tours_ticketing.db")
    )
    
    await ticketing_system.initialize()
    return ticketing_system

# Ejemplo de uso
if __name__ == "__main__":
    async def main():
        config = {
            "database_url": "sqlite:///spirit_tours_ticketing.db"
        }
        
        try:
            # Crear sistema de ticketing
            ticketing = await create_advanced_ticketing_system(config)
            
            # Crear ticket de ejemplo
            ticket_id = await ticketing.create_ticket_from_lead(
                lead_id="550e8400-e29b-41d4-a716-446655440000",
                ticket_type=TicketType.SALES_INQUIRY,
                template_name="Sales Inquiry Template",
                custom_data={
                    "estimated_value": 2500.0,
                    "source_channel": "website"
                }
            )
            print(f"✅ Ticket created: {ticket_id}")
            
            # Avanzar etapa de ventas
            success = await ticketing.advance_sales_stage(
                ticket_id,
                SalesStage.NEEDS_ASSESSMENT,
                "agent_001",
                "Completed initial needs assessment call"
            )
            print(f"✅ Sales stage advanced: {success}")
            
            # Obtener analytics
            analytics = await ticketing.get_ticket_analytics()
            print(f"📊 Analytics: {analytics['summary']['total_tickets']} total tickets")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            if 'ticketing' in locals():
                await ticketing.cleanup()
    
    asyncio.run(main())