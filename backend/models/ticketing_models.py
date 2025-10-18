"""
Sistema de Ticketing y Gestión de Tareas
Modelos completos para asignación, seguimiento y escalación de tareas
"""

from typing import List, Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime, Numeric, Enum as SQLEnum, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timezone
import uuid
import enum
from pydantic import BaseModel, Field
from .rbac_models import Base

# ============================================================================
# ENUMS
# ============================================================================

class TicketPriority(enum.Enum):
    """Prioridades de tickets"""
    CRITICAL = "critical"  # Emergencia, atender inmediatamente
    HIGH = "high"          # Alta prioridad, atender hoy
    MEDIUM = "medium"      # Prioridad media, atender esta semana
    LOW = "low"            # Baja prioridad, cuando sea posible
    BACKLOG = "backlog"    # Para futuro, sin fecha definida

class TicketStatus(enum.Enum):
    """Estados del ciclo de vida del ticket"""
    DRAFT = "draft"                    # Borrador
    OPEN = "open"                      # Abierto, listo para asignar
    ASSIGNED = "assigned"              # Asignado a un trabajador
    IN_PROGRESS = "in_progress"        # En progreso
    PENDING_REVIEW = "pending_review"  # Pendiente de revisión
    BLOCKED = "blocked"                # Bloqueado por dependencias
    ESCALATED = "escalated"            # Escalado a supervisor/gerente
    RESOLVED = "resolved"              # Resuelto, esperando confirmación
    CLOSED = "closed"                  # Cerrado y completado
    CANCELLED = "cancelled"            # Cancelado

class TicketType(enum.Enum):
    """Tipos de tickets"""
    TASK = "task"                      # Tarea general
    BUG = "bug"                        # Reporte de error
    FEATURE = "feature"                # Nueva funcionalidad
    IMPROVEMENT = "improvement"        # Mejora
    SUPPORT = "support"                # Soporte a cliente
    MAINTENANCE = "maintenance"        # Mantenimiento
    DOCUMENTATION = "documentation"    # Documentación
    RESEARCH = "research"              # Investigación

class EscalationReason(enum.Enum):
    """Razones de escalación"""
    OVERDUE = "overdue"                # Vencido
    BLOCKED = "blocked"                # Bloqueado
    COMPLEXITY = "complexity"          # Muy complejo
    EXPERTISE = "expertise"            # Requiere expertise
    PRIORITY = "priority"              # Cambio de prioridad
    CUSTOMER = "customer"              # Solicitud del cliente
    MANUAL = "manual"                  # Escalación manual

class CommentType(enum.Enum):
    """Tipos de comentarios"""
    COMMENT = "comment"                # Comentario general
    STATUS_CHANGE = "status_change"    # Cambio de estado
    ASSIGNMENT = "assignment"          # Asignación/reasignación
    ESCALATION = "escalation"          # Escalación
    RESOLUTION = "resolution"          # Resolución
    SYSTEM = "system"                  # Mensaje del sistema/IA

# ============================================================================
# MODELOS PRINCIPALES
# ============================================================================

class Department(Base):
    """Departamentos de la organización"""
    __tablename__ = 'departments'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    manager_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    parent_department_id = Column(UUID(as_uuid=True), ForeignKey('departments.id'))
    is_active = Column(Boolean, default=True)
    metadata_json = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    manager = relationship("User", foreign_keys=[manager_id], back_populates="managed_departments")
    parent_department = relationship("Department", remote_side=[id], back_populates="sub_departments")
    sub_departments = relationship("Department", back_populates="parent_department")
    tickets = relationship("Ticket", back_populates="department")

class Ticket(Base):
    """Ticket principal - representa una tarea o trabajo"""
    __tablename__ = 'tickets'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_number = Column(String(20), unique=True, nullable=False)  # TKT-2024-00001
    title = Column(String(200), nullable=False)
    description = Column(Text)
    ticket_type = Column(SQLEnum(TicketType), nullable=False, default=TicketType.TASK)
    priority = Column(SQLEnum(TicketPriority), nullable=False, default=TicketPriority.MEDIUM)
    status = Column(SQLEnum(TicketStatus), nullable=False, default=TicketStatus.OPEN)
    
    # Asignación
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    department_id = Column(UUID(as_uuid=True), ForeignKey('departments.id'))
    
    # Fechas y plazos
    due_date = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    estimated_hours = Column(Numeric(5, 2))  # Horas estimadas
    actual_hours = Column(Numeric(5, 2))     # Horas reales trabajadas
    
    # Progreso
    completion_percentage = Column(Integer, default=0)
    __table_args__ = (
        CheckConstraint('completion_percentage >= 0 AND completion_percentage <= 100', name='check_completion_percentage'),
    )
    
    # IA - Scores y predicciones
    ai_priority_score = Column(Numeric(5, 2))  # Score de prioridad calculado por IA (0-100)
    ai_suggested_assignee_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    ai_estimated_completion = Column(DateTime(timezone=True))  # Predicción de finalización
    ai_complexity_score = Column(Numeric(5, 2))  # Score de complejidad (0-100)
    ai_risk_score = Column(Numeric(5, 2))  # Score de riesgo (0-100)
    
    # Relaciones con otros tickets
    parent_ticket_id = Column(UUID(as_uuid=True), ForeignKey('tickets.id'))
    blocked_by_ticket_id = Column(UUID(as_uuid=True), ForeignKey('tickets.id'))
    
    # Relaciones con otras entidades del sistema
    customer_id = Column(UUID(as_uuid=True))  # Referencia a cliente (opcional)
    booking_id = Column(UUID(as_uuid=True))   # Referencia a reserva (opcional)
    invoice_id = Column(UUID(as_uuid=True))   # Referencia a factura (opcional)
    email_message_id = Column(UUID(as_uuid=True), ForeignKey('email_messages.id'))  # Ticket creado desde email
    
    # Metadata y configuración
    tags = Column(JSONB, default=[])  # ["urgente", "cliente-vip", "billing"]
    custom_fields = Column(JSONB, default={})  # Campos personalizados
    is_template = Column(Boolean, default=False)  # Para tickets plantilla
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="created_tickets")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_tickets")
    ai_suggested_assignee = relationship("User", foreign_keys=[ai_suggested_assignee_id])
    department = relationship("Department", back_populates="tickets")
    parent_ticket = relationship("Ticket", remote_side=[id], foreign_keys=[parent_ticket_id], back_populates="sub_tickets")
    sub_tickets = relationship("Ticket", foreign_keys=[parent_ticket_id], back_populates="parent_ticket")
    blocked_by_ticket = relationship("Ticket", remote_side=[id], foreign_keys=[blocked_by_ticket_id])
    email_message = relationship("EmailMessage", foreign_keys=[email_message_id])
    
    assignments = relationship("TicketAssignment", back_populates="ticket", cascade="all, delete-orphan")
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")
    watchers = relationship("TicketWatcher", back_populates="ticket", cascade="all, delete-orphan")
    history = relationship("TicketHistory", back_populates="ticket", cascade="all, delete-orphan")
    checklists = relationship("TicketChecklist", back_populates="ticket", cascade="all, delete-orphan")
    reminders = relationship("TicketReminder", back_populates="ticket", cascade="all, delete-orphan")
    attachments = relationship("TicketAttachment", back_populates="ticket", cascade="all, delete-orphan")

class TicketAssignment(Base):
    """Historial de asignaciones de tickets"""
    __tablename__ = 'ticket_assignments'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey('tickets.id'), nullable=False)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    assigned_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    assignment_reason = Column(Text)
    is_active = Column(Boolean, default=True)  # Solo una asignación activa por ticket
    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True))
    
    # IA - Razón de asignación automática
    ai_assigned = Column(Boolean, default=False)
    ai_assignment_reason = Column(Text)  # Explicación de por qué la IA eligió este usuario
    ai_confidence_score = Column(Numeric(5, 2))  # Confianza de la IA (0-100)
    
    # Relationships
    ticket = relationship("Ticket", back_populates="assignments")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])

class TicketComment(Base):
    """Comentarios y actualizaciones en tickets"""
    __tablename__ = 'ticket_comments'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey('tickets.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    comment_type = Column(SQLEnum(CommentType), nullable=False, default=CommentType.COMMENT)
    content = Column(Text, nullable=False)
    
    # Para cambios de estado y asignaciones
    old_value = Column(String(100))  # Valor anterior (status, assignee, etc)
    new_value = Column(String(100))  # Nuevo valor
    
    # Metadata
    is_internal = Column(Boolean, default=False)  # No visible para clientes
    is_ai_generated = Column(Boolean, default=False)  # Generado por IA
    metadata_json = Column(JSONB, default={})
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    ticket = relationship("Ticket", back_populates="comments")
    user = relationship("User")

class TicketWatcher(Base):
    """Usuarios que siguen/observan un ticket (jefes, colaboradores)"""
    __tablename__ = 'ticket_watchers'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey('tickets.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    added_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    watch_reason = Column(String(100))  # "manager", "collaborator", "escalated"
    notify_on_update = Column(Boolean, default=True)
    notify_on_comment = Column(Boolean, default=True)
    notify_on_status_change = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    added_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    ticket = relationship("Ticket", back_populates="watchers")
    user = relationship("User", foreign_keys=[user_id])
    added_by = relationship("User", foreign_keys=[added_by_id])

class TicketHistory(Base):
    """Historial completo de cambios en el ticket"""
    __tablename__ = 'ticket_history'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey('tickets.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    action = Column(String(50), nullable=False)  # "created", "assigned", "status_changed", etc
    field_name = Column(String(50))  # Campo que cambió
    old_value = Column(Text)
    new_value = Column(Text)
    description = Column(Text)  # Descripción legible del cambio
    is_ai_action = Column(Boolean, default=False)  # Acción realizada por IA
    metadata_json = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    ticket = relationship("Ticket", back_populates="history")
    user = relationship("User")

class TicketChecklist(Base):
    """Checklist de tareas dentro de un ticket"""
    __tablename__ = 'ticket_checklists'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey('tickets.id'), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    is_completed = Column(Boolean, default=False)
    completed_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    completed_at = Column(DateTime(timezone=True))
    position = Column(Integer, default=0)  # Orden en la lista
    is_required = Column(Boolean, default=False)  # Requerido para cerrar ticket
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    ticket = relationship("Ticket", back_populates="checklists")
    completed_by = relationship("User")

class TicketReminder(Base):
    """Recordatorios automáticos para tickets"""
    __tablename__ = 'ticket_reminders'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey('tickets.id'), nullable=False)
    remind_at = Column(DateTime(timezone=True), nullable=False)
    message = Column(Text, nullable=False)
    notify_users = Column(JSONB, default=[])  # Lista de user_ids a notificar
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True))
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    ticket = relationship("Ticket", back_populates="reminders")
    created_by = relationship("User")

class TicketAttachment(Base):
    """Archivos adjuntos a tickets"""
    __tablename__ = 'ticket_attachments'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey('tickets.id'), nullable=False)
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)  # Ruta en S3 o storage
    file_size = Column(Integer)  # Bytes
    mime_type = Column(String(100))
    description = Column(Text)
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    ticket = relationship("Ticket", back_populates="attachments")
    uploaded_by = relationship("User")

class TicketEscalation(Base):
    """Historial de escalaciones de tickets"""
    __tablename__ = 'ticket_escalations'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(UUID(as_uuid=True), ForeignKey('tickets.id'), nullable=False)
    escalated_from_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))  # De quién se escaló
    escalated_to_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))    # A quién se escaló
    escalated_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)  # Quién escaló
    reason = Column(SQLEnum(EscalationReason), nullable=False)
    description = Column(Text)
    previous_priority = Column(SQLEnum(TicketPriority))
    new_priority = Column(SQLEnum(TicketPriority))
    is_ai_escalated = Column(Boolean, default=False)  # Escalado automáticamente por IA
    ai_escalation_reason = Column(Text)
    escalated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True))
    resolution_notes = Column(Text)
    
    # Relationships
    escalated_from = relationship("User", foreign_keys=[escalated_from_id])
    escalated_to = relationship("User", foreign_keys=[escalated_to_id])
    escalated_by = relationship("User", foreign_keys=[escalated_by_id])

# ============================================================================
# PYDANTIC SCHEMAS - REQUEST/RESPONSE
# ============================================================================

class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    manager_id: Optional[uuid.UUID] = None
    parent_department_id: Optional[uuid.UUID] = None
    is_active: bool = True

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TicketBase(BaseModel):
    title: str
    description: Optional[str] = None
    ticket_type: TicketType = TicketType.TASK
    priority: TicketPriority = TicketPriority.MEDIUM
    assigned_to_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    tags: List[str] = []
    custom_fields: Dict[str, Any] = {}

class TicketCreate(TicketBase):
    customer_id: Optional[uuid.UUID] = None
    booking_id: Optional[uuid.UUID] = None
    invoice_id: Optional[uuid.UUID] = None
    email_message_id: Optional[uuid.UUID] = None
    parent_ticket_id: Optional[uuid.UUID] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TicketPriority] = None
    status: Optional[TicketStatus] = None
    assigned_to_id: Optional[uuid.UUID] = None
    department_id: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    completion_percentage: Optional[int] = Field(None, ge=0, le=100)
    tags: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None

class TicketResponse(TicketBase):
    id: uuid.UUID
    ticket_number: str
    status: TicketStatus
    created_by_id: uuid.UUID
    completion_percentage: int
    ai_priority_score: Optional[float] = None
    ai_suggested_assignee_id: Optional[uuid.UUID] = None
    ai_estimated_completion: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class TicketAssignRequest(BaseModel):
    assigned_to_id: uuid.UUID
    assignment_reason: Optional[str] = None

class TicketEscalateRequest(BaseModel):
    escalated_to_id: uuid.UUID
    reason: EscalationReason
    description: Optional[str] = None
    change_priority: Optional[TicketPriority] = None

class TicketCommentCreate(BaseModel):
    content: str
    is_internal: bool = False

class TicketCommentResponse(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    user_id: uuid.UUID
    comment_type: CommentType
    content: str
    is_internal: bool
    is_ai_generated: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class TicketWatcherAdd(BaseModel):
    user_id: uuid.UUID
    watch_reason: Optional[str] = None
    notify_on_update: bool = True
    notify_on_comment: bool = True
    notify_on_status_change: bool = True

class ChecklistItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    is_required: bool = False
    position: int = 0

class ChecklistItemResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    is_completed: bool
    completed_by_id: Optional[uuid.UUID] = None
    completed_at: Optional[datetime] = None
    position: int
    is_required: bool
    
    class Config:
        from_attributes = True

class TicketStatsResponse(BaseModel):
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    completed_tickets: int
    overdue_tickets: int
    high_priority_tickets: int
    assigned_to_me: int
    created_by_me: int
    avg_completion_time: Optional[float] = None  # En horas
    completion_rate: Optional[float] = None  # Porcentaje

class TicketDetailedResponse(TicketResponse):
    """Respuesta detallada con relaciones"""
    created_by: Optional[Dict[str, Any]] = None
    assigned_to: Optional[Dict[str, Any]] = None
    department: Optional[Dict[str, Any]] = None
    comments: List[TicketCommentResponse] = []
    watchers: List[Dict[str, Any]] = []
    checklists: List[ChecklistItemResponse] = []
    sub_tickets: List[TicketResponse] = []
    
    class Config:
        from_attributes = True
