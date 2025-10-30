#!/usr/bin/env python3
"""
Operations Models for Reservation Control and Group Management
Modelos para Control de Reservas y Gestión de Grupos Operativos
"""

from typing import List, Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table, Text, DateTime, JSON, Enum as SQLEnum, DECIMAL, Float, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid
import enum
from decimal import Decimal
from pydantic import BaseModel, Field

# Import base from existing models
from .rbac_models import Base

# ============================
# ENUMS
# ============================

class ServiceType(enum.Enum):
    """Tipos de servicios disponibles"""
    HOTEL = "hotel"
    TRANSPORT = "transport"
    FLIGHT = "flight"
    ENTRANCE = "entrance"
    GUIDE = "guide"
    RESTAURANT = "restaurant"
    ACTIVITY = "activity"
    INSURANCE = "insurance"
    OTHER = "other"

class ReservationStatus(enum.Enum):
    """Estados de una reserva"""
    DRAFT = "draft"
    PENDING = "pending"
    CONFIRMED = "confirmed"
    MODIFIED = "modified"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"

class PaymentStatus(enum.Enum):
    """Estados de pago"""
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    REFUNDED = "refunded"
    OVERDUE = "overdue"
    DISPUTED = "disputed"

class AgentType(enum.Enum):
    """Tipos de agente"""
    EMPLOYEE = "employee"
    AI_AGENT = "ai_agent"
    EXTERNAL = "external"
    SYSTEM = "system"

class OperationalStatus(enum.Enum):
    """Estado operativo de un grupo"""
    PLANNING = "planning"
    CONFIRMED = "confirmed"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ClosureStatus(enum.Enum):
    """Estado de cierre de un grupo"""
    OPEN = "open"
    IN_REVIEW = "in_review"
    PENDING_INVOICES = "pending_invoices"
    PENDING_VALIDATION = "pending_validation"
    CLOSED = "closed"
    REOPENED = "reopened"

class ValidationStatus(enum.Enum):
    """Estado de validación"""
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    OVERRIDE = "override"

class ValidationType(enum.Enum):
    """Tipos de validación"""
    ROOMING_LIST = "rooming_list"
    INVOICE = "invoice"
    QUANTITY = "quantity"
    PRICE = "price"
    DATES = "dates"
    DUPLICATE = "duplicate"
    FRAUD = "fraud"

class AlertSeverity(enum.Enum):
    """Severidad de alertas"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class AlertType(enum.Enum):
    """Tipos de alerta"""
    MISSING_INVOICE = "missing_invoice"
    PAYMENT_PENDING = "payment_pending"
    ANOMALY_DETECTED = "anomaly_detected"
    DEADLINE_APPROACHING = "deadline_approaching"
    GROUP_NOT_CLOSED = "group_not_closed"
    VALIDATION_FAILED = "validation_failed"
    CANCELLATION_DEADLINE = "cancellation_deadline"
    PRICE_VARIANCE = "price_variance"

# ============================
# PROVIDER MODELS
# ============================

class Provider(Base):
    """Proveedores de servicios (hoteles, transporte, etc.)"""
    __tablename__ = 'providers'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Información básica
    name = Column(String(200), nullable=False)
    legal_name = Column(String(200))
    tax_id = Column(String(50), unique=True)
    provider_type = Column(SQLEnum(ServiceType), nullable=False)
    
    # Contacto
    email = Column(String(100))
    phone = Column(String(50))
    contact_person = Column(String(200))
    contact_email = Column(String(100))
    contact_phone = Column(String(50))
    
    # Dirección
    address = Column(Text)
    city = Column(String(100))
    country = Column(String(100))
    
    # Términos comerciales
    payment_terms = Column(Integer, default=30)  # días
    commission_rate = Column(DECIMAL(5, 2))
    currency = Column(String(3), default='EUR')
    
    # Políticas
    cancellation_policy = Column(JSON)
    modification_policy = Column(JSON)
    
    # Control
    active = Column(Boolean, default=True)
    rating = Column(Float)
    notes = Column(Text)
    
    # Notification settings
    notification_settings = Column(JSON, default=dict)  # WhatsApp, email preferences
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    reservations = relationship('ProviderReservation', back_populates='provider')
    contracts = relationship('ProviderContract', back_populates='provider')
    
    # Índices
    __table_args__ = (
        Index('idx_provider_type', 'provider_type'),
        Index('idx_provider_active', 'active'),
    )

# ============================
# GROUP MODELS
# ============================

class TourGroup(Base):
    """Grupos turísticos"""
    __tablename__ = 'tour_groups'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    
    # Cliente
    client_type = Column(String(50))  # B2B, B2C, etc.
    client_id = Column(UUID(as_uuid=True))  # ID del tour operator, agencia, etc.
    client_name = Column(String(200))
    
    # Fechas
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    booking_date = Column(DateTime(timezone=True))
    
    # Participantes
    total_participants = Column(Integer, default=0)
    adults = Column(Integer, default=0)
    children = Column(Integer, default=0)
    infants = Column(Integer, default=0)
    
    # Estado
    operational_status = Column(SQLEnum(OperationalStatus), default=OperationalStatus.PLANNING)
    closure_status = Column(SQLEnum(ClosureStatus), default=ClosureStatus.OPEN)
    closure_date = Column(DateTime(timezone=True))
    closed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Checklist
    closure_checklist = Column(JSON, default=dict)
    closure_progress = Column(Integer, default=0)  # 0-100%
    
    # Financiero
    total_revenue = Column(DECIMAL(12, 2), default=Decimal('0.00'))
    total_cost = Column(DECIMAL(12, 2), default=Decimal('0.00'))
    total_commission = Column(DECIMAL(12, 2), default=Decimal('0.00'))
    currency = Column(String(3), default='EUR')
    
    # Notas
    description = Column(Text)
    internal_notes = Column(Text)
    special_requirements = Column(Text)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Relaciones
    reservations = relationship('ProviderReservation', back_populates='group')
    closure_items = relationship('GroupClosureItem', back_populates='group')
    alerts = relationship('OperationalAlert', back_populates='group')
    participants = relationship('GroupParticipant', back_populates='group')
    
    # Índices
    __table_args__ = (
        Index('idx_group_dates', 'start_date', 'end_date'),
        Index('idx_group_status', 'operational_status', 'closure_status'),
        Index('idx_group_client', 'client_type', 'client_id'),
    )

# ============================
# RESERVATION MODELS
# ============================

class ProviderReservation(Base):
    """Reservas con proveedores"""
    __tablename__ = 'provider_reservations'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id = Column(UUID(as_uuid=True), ForeignKey('providers.id'), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey('tour_groups.id'), nullable=False)
    service_type = Column(SQLEnum(ServiceType), nullable=False)
    
    # Confirmación
    confirmation_number = Column(String(100))
    confirmation_date = Column(DateTime(timezone=True))
    confirmed_by_name = Column(String(200))
    confirmed_by_email = Column(String(200))
    confirmed_by_phone = Column(String(50))
    
    # Servicio
    service_date_start = Column(DateTime(timezone=True), nullable=False)
    service_date_end = Column(DateTime(timezone=True), nullable=False)
    service_description = Column(Text)
    
    # Cantidades (según tipo de servicio)
    quantity = Column(Integer, default=1)  # habitaciones, asientos, tickets
    quantity_details = Column(JSON)  # detalles específicos por tipo
    
    # Precios
    unit_price = Column(DECIMAL(12, 2))
    total_price = Column(DECIMAL(12, 2))
    currency = Column(String(3), default='EUR')
    price_includes = Column(Text)
    price_excludes = Column(Text)
    
    # Políticas
    cancellation_policy = Column(JSON)
    cancellation_deadline = Column(DateTime(timezone=True))
    modification_deadline = Column(DateTime(timezone=True))
    cancellation_fee = Column(DECIMAL(12, 2))
    
    # Control interno
    agent_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    agent_type = Column(SQLEnum(AgentType), default=AgentType.EMPLOYEE)
    agent_name = Column(String(200))
    
    # Notas
    notes = Column(Text)
    internal_notes = Column(Text)
    special_requests = Column(Text)
    
    # Estado
    status = Column(SQLEnum(ReservationStatus), default=ReservationStatus.PENDING)
    payment_status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    
    # Facturación
    invoice_number = Column(String(100))
    invoice_date = Column(DateTime(timezone=True))
    invoice_amount = Column(DECIMAL(12, 2))
    invoice_validated = Column(Boolean, default=False)
    invoice_validated_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    invoice_validated_at = Column(DateTime(timezone=True))
    
    # Validación
    validation_status = Column(SQLEnum(ValidationStatus), default=ValidationStatus.PENDING)
    validation_score = Column(Float)  # 0-1
    anomalies_detected = Column(JSON)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    updated_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Relaciones
    provider = relationship('Provider', back_populates='reservations')
    group = relationship('TourGroup', back_populates='reservations')
    agent = relationship('User', foreign_keys=[agent_id])
    attachments = relationship('ReservationAttachment', back_populates='reservation')
    validation_logs = relationship('ValidationLog', back_populates='reservation')
    
    # Índices
    __table_args__ = (
        Index('idx_reservation_group', 'group_id'),
        Index('idx_reservation_provider', 'provider_id'),
        Index('idx_reservation_dates', 'service_date_start', 'service_date_end'),
        Index('idx_reservation_status', 'status', 'payment_status'),
        UniqueConstraint('provider_id', 'confirmation_number', name='uq_provider_confirmation'),
    )

# ============================
# CLOSURE MODELS
# ============================

class GroupClosureItem(Base):
    """Items del checklist de cierre de grupo"""
    __tablename__ = 'group_closure_items'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey('tour_groups.id'), nullable=False)
    reservation_id = Column(UUID(as_uuid=True), ForeignKey('provider_reservations.id'))
    
    # Item
    item_type = Column(String(50), nullable=False)  # invoice, payment, validation, etc.
    item_name = Column(String(200), nullable=False)
    service_type = Column(SQLEnum(ServiceType))
    
    # Estado
    required = Column(Boolean, default=True)
    completed = Column(Boolean, default=False)
    completed_date = Column(DateTime(timezone=True))
    completed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Validación
    validated = Column(Boolean, default=False)
    validation_notes = Column(Text)
    validation_issues = Column(JSON)
    
    # Documentos
    has_invoice = Column(Boolean, default=False)
    has_payment_proof = Column(Boolean, default=False)
    documents = Column(JSON)  # URLs o referencias a documentos
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    group = relationship('TourGroup', back_populates='closure_items')
    reservation = relationship('ProviderReservation')

# ============================
# VALIDATION MODELS
# ============================

class ValidationLog(Base):
    """Logs de validación automática y manual"""
    __tablename__ = 'validation_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reservation_id = Column(UUID(as_uuid=True), ForeignKey('provider_reservations.id'))
    group_id = Column(UUID(as_uuid=True), ForeignKey('tour_groups.id'))
    
    # Tipo de validación
    validation_type = Column(SQLEnum(ValidationType), nullable=False)
    validation_method = Column(String(50))  # automatic, manual, ai_assisted
    
    # Resultados
    status = Column(SQLEnum(ValidationStatus), nullable=False)
    confidence_score = Column(Float)  # 0-1 para validaciones automáticas
    
    # Detalles
    expected_values = Column(JSON)
    actual_values = Column(JSON)
    discrepancies = Column(JSON)
    anomalies = Column(JSON)
    
    # Resolución
    action_required = Column(Text)
    action_taken = Column(Text)
    resolved = Column(Boolean, default=False)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    resolved_at = Column(DateTime(timezone=True))
    resolution_notes = Column(Text)
    
    # AI Analysis
    ai_analysis = Column(JSON)
    ai_recommendations = Column(JSON)
    
    # Auditoría
    validated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    validated_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Relaciones
    reservation = relationship('ProviderReservation', back_populates='validation_logs')
    group = relationship('TourGroup')
    
    # Índices
    __table_args__ = (
        Index('idx_validation_status', 'status'),
        Index('idx_validation_type', 'validation_type'),
        Index('idx_validation_resolved', 'resolved'),
    )

# ============================
# ALERT MODELS
# ============================

class OperationalAlert(Base):
    """Alertas operativas"""
    __tablename__ = 'operational_alerts'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Contexto
    group_id = Column(UUID(as_uuid=True), ForeignKey('tour_groups.id'))
    reservation_id = Column(UUID(as_uuid=True), ForeignKey('provider_reservations.id'))
    provider_id = Column(UUID(as_uuid=True), ForeignKey('providers.id'))
    
    # Alerta
    alert_type = Column(SQLEnum(AlertType), nullable=False)
    severity = Column(SQLEnum(AlertSeverity), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    
    # Acción
    action_required = Column(Text)
    action_deadline = Column(DateTime(timezone=True))
    assigned_to = Column(JSON)  # Lista de user_ids
    
    # Estado
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    acknowledged_at = Column(DateTime(timezone=True))
    resolved = Column(Boolean, default=False)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    resolved_at = Column(DateTime(timezone=True))
    resolution_notes = Column(Text)
    
    # Notificaciones
    notifications_sent = Column(JSON)  # email, whatsapp, dashboard, etc.
    last_notification = Column(DateTime(timezone=True))
    notification_count = Column(Integer, default=0)
    
    # Metadata
    metadata = Column(JSON)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    group = relationship('TourGroup', back_populates='alerts')
    reservation = relationship('ProviderReservation')
    provider = relationship('Provider')
    
    # Índices
    __table_args__ = (
        Index('idx_alert_severity', 'severity'),
        Index('idx_alert_type', 'alert_type'),
        Index('idx_alert_status', 'acknowledged', 'resolved'),
        Index('idx_alert_deadline', 'action_deadline'),
    )

# ============================
# ATTACHMENT MODELS
# ============================

class ReservationAttachment(Base):
    """Archivos adjuntos a reservas"""
    __tablename__ = 'reservation_attachments'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reservation_id = Column(UUID(as_uuid=True), ForeignKey('provider_reservations.id'), nullable=False)
    
    # Archivo
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50))  # pdf, jpg, xlsx, etc.
    file_size = Column(Integer)  # bytes
    file_url = Column(Text, nullable=False)
    
    # Tipo de documento
    document_type = Column(String(50))  # invoice, rooming_list, voucher, etc.
    description = Column(Text)
    
    # Metadata
    metadata = Column(JSON)
    
    # Auditoría
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Relaciones
    reservation = relationship('ProviderReservation', back_populates='attachments')

# ============================
# PARTICIPANT MODELS
# ============================

class GroupParticipant(Base):
    """Participantes de un grupo"""
    __tablename__ = 'group_participants'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey('tour_groups.id'), nullable=False)
    
    # Datos personales
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    document_type = Column(String(20))  # passport, dni, etc.
    document_number = Column(String(50))
    nationality = Column(String(100))
    birth_date = Column(DateTime(timezone=True))
    
    # Categoría
    participant_type = Column(String(20))  # adult, child, infant
    
    # Contacto
    email = Column(String(100))
    phone = Column(String(50))
    emergency_contact = Column(String(200))
    emergency_phone = Column(String(50))
    
    # Requisitos especiales
    dietary_requirements = Column(Text)
    medical_conditions = Column(Text)
    special_needs = Column(Text)
    
    # Room assignment
    room_number = Column(String(50))
    room_type = Column(String(50))
    roommate = Column(String(200))
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    group = relationship('TourGroup', back_populates='participants')
    
    # Índices
    __table_args__ = (
        Index('idx_participant_group', 'group_id'),
        Index('idx_participant_document', 'document_type', 'document_number'),
    )

# ============================
# CONTRACT MODELS
# ============================

class ProviderContract(Base):
    """Contratos con proveedores"""
    __tablename__ = 'provider_contracts'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id = Column(UUID(as_uuid=True), ForeignKey('providers.id'), nullable=False)
    
    # Contrato
    contract_number = Column(String(100), unique=True)
    contract_name = Column(String(200))
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    
    # Términos
    payment_terms = Column(Integer)  # días
    commission_rate = Column(DECIMAL(5, 2))
    volume_discounts = Column(JSON)
    special_rates = Column(JSON)
    
    # Políticas
    cancellation_policy = Column(JSON)
    modification_policy = Column(JSON)
    
    # Estado
    active = Column(Boolean, default=True)
    auto_renew = Column(Boolean, default=False)
    
    # Documentos
    contract_url = Column(Text)
    attachments = Column(JSON)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Relaciones
    provider = relationship('Provider', back_populates='contracts')
    
    # Índices
    __table_args__ = (
        Index('idx_contract_dates', 'start_date', 'end_date'),
        Index('idx_contract_active', 'active'),
    )

# ============================
# NOTIFICATION LOG MODELS
# ============================

class NotificationLog(Base):
    """Logs de notificaciones enviadas"""
    __tablename__ = 'notification_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Notification details
    notification_type = Column(String(50), nullable=False)  # whatsapp, email, sms
    recipient = Column(String(200), nullable=False)
    template_name = Column(String(100))
    
    # Status
    status = Column(String(20), nullable=False)  # sent, failed, delivered, read
    message_id = Column(String(200))  # External message ID
    error_message = Column(Text)
    
    # Context
    provider_id = Column(UUID(as_uuid=True), ForeignKey('providers.id'))
    group_id = Column(UUID(as_uuid=True), ForeignKey('tour_groups.id'))
    reservation_id = Column(UUID(as_uuid=True), ForeignKey('provider_reservations.id'))
    
    # Metadata
    metadata = Column(JSON)
    
    # Timestamps
    sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    delivered_at = Column(DateTime(timezone=True))
    read_at = Column(DateTime(timezone=True))
    
    # Índices
    __table_args__ = (
        Index('idx_notification_type', 'notification_type'),
        Index('idx_notification_status', 'status'),
        Index('idx_notification_sent_at', 'sent_at'),
    )

# ============================
# PYDANTIC SCHEMAS
# ============================

# Request/Response models for API

class ProviderCreate(BaseModel):
    name: str
    legal_name: Optional[str]
    tax_id: str
    provider_type: ServiceType
    email: Optional[str]
    phone: Optional[str]
    contact_person: Optional[str]
    address: Optional[str]
    city: Optional[str]
    country: Optional[str]
    payment_terms: Optional[int] = 30
    commission_rate: Optional[Decimal]
    cancellation_policy: Optional[Dict[str, Any]]

class ProviderResponse(BaseModel):
    id: uuid.UUID
    name: str
    provider_type: ServiceType
    email: Optional[str]
    phone: Optional[str]
    active: bool
    rating: Optional[float]
    
    class Config:
        orm_mode = True

class ReservationCreate(BaseModel):
    provider_id: uuid.UUID
    group_id: uuid.UUID
    service_type: ServiceType
    service_date_start: datetime
    service_date_end: datetime
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    confirmation_number: Optional[str]
    notes: Optional[str]

class ReservationResponse(BaseModel):
    id: uuid.UUID
    provider_id: uuid.UUID
    group_id: uuid.UUID
    service_type: ServiceType
    confirmation_number: Optional[str]
    status: ReservationStatus
    payment_status: PaymentStatus
    validation_status: ValidationStatus
    total_price: Decimal
    service_date_start: datetime
    service_date_end: datetime
    
    class Config:
        orm_mode = True

class GroupCreate(BaseModel):
    code: str
    name: str
    client_type: str
    client_name: str
    start_date: datetime
    end_date: datetime
    total_participants: int
    adults: Optional[int] = 0
    children: Optional[int] = 0
    infants: Optional[int] = 0
    description: Optional[str]

class GroupResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    start_date: datetime
    end_date: datetime
    total_participants: int
    operational_status: OperationalStatus
    closure_status: ClosureStatus
    closure_progress: int
    
    class Config:
        orm_mode = True

class ValidationRequest(BaseModel):
    reservation_id: uuid.UUID
    validation_type: ValidationType
    expected_values: Dict[str, Any]
    actual_values: Dict[str, Any]

class ValidationResponse(BaseModel):
    id: uuid.UUID
    status: ValidationStatus
    confidence_score: Optional[float]
    discrepancies: Optional[Dict[str, Any]]
    anomalies: Optional[Dict[str, Any]]
    action_required: Optional[str]
    
    class Config:
        orm_mode = True

class AlertCreate(BaseModel):
    group_id: Optional[uuid.UUID]
    reservation_id: Optional[uuid.UUID]
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    action_required: Optional[str]
    action_deadline: Optional[datetime]
    assigned_to: Optional[List[uuid.UUID]]

class AlertResponse(BaseModel):
    id: uuid.UUID
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    acknowledged: bool
    resolved: bool
    created_at: datetime
    
    class Config:
        orm_mode = True

class ClosureChecklistResponse(BaseModel):
    group_id: uuid.UUID
    total_items: int
    completed_items: int
    progress_percentage: int
    pending_items: List[Dict[str, Any]]
    issues: List[Dict[str, Any]]
    can_close: bool
    
    class Config:
        orm_mode = True

# Export all models and schemas
__all__ = [
    # Enums
    'ServiceType', 'ReservationStatus', 'PaymentStatus', 'AgentType',
    'OperationalStatus', 'ClosureStatus', 'ValidationStatus', 'ValidationType',
    'AlertSeverity', 'AlertType',
    
    # Models
    'Provider', 'TourGroup', 'ProviderReservation', 'GroupClosureItem',
    'ValidationLog', 'OperationalAlert', 'ReservationAttachment',
    'GroupParticipant', 'ProviderContract',
    
    # Schemas
    'ProviderCreate', 'ProviderResponse', 'ReservationCreate', 'ReservationResponse',
    'GroupCreate', 'GroupResponse', 'ValidationRequest', 'ValidationResponse',
    'AlertCreate', 'AlertResponse', 'ClosureChecklistResponse'
]