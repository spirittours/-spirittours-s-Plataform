"""
Email System Models - Advanced Email Queue and Provider Management
Sistema de gestión de colas de email, proveedores, y monitoreo avanzado

Incluye:
- EmailQueue: Cola de emails con prioridades
- EmailProvider: Configuración de múltiples proveedores (SMTP, SendGrid, Mailgun, SES)
- EmailLog: Logs detallados de envíos
- EmailMetric: Métricas y analytics en tiempo real
- EmailTemplate: Plantillas HTML profesionales
- EmailBounce: Gestión de rebotes
- EmailWebhook: Webhooks para eventos

Author: Spirit Tours Development Team
Created: October 18, 2025
Phase: Email System Enhancement
"""

from typing import Optional, Dict, Any, List
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, 
    ForeignKey, DateTime, JSON, Enum as SQLEnum, Index, BigInteger
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import enum
from pydantic import BaseModel, EmailStr, Field, validator

from .rbac_models import Base

# ============================================================================
# ENUMS
# ============================================================================

class EmailQueueStatus(enum.Enum):
    """Estado de la cola de email"""
    PENDING = "pending"           # En cola esperando envío
    PROCESSING = "processing"     # Siendo procesado
    SENT = "sent"                 # Enviado exitosamente
    FAILED = "failed"             # Falló el envío
    RETRY = "retry"               # Reintentando envío
    CANCELLED = "cancelled"       # Cancelado por usuario/sistema
    SCHEDULED = "scheduled"       # Programado para envío futuro

class EmailPriority(enum.Enum):
    """Prioridad de email"""
    URGENT = "urgent"             # Envío inmediato (transaccionales críticos)
    HIGH = "high"                 # Alta prioridad (confirmaciones, alertas)
    NORMAL = "normal"             # Normal (newsletters, marketing)
    LOW = "low"                   # Baja prioridad (reportes, notificaciones)

class EmailProviderType(enum.Enum):
    """Tipo de proveedor de email"""
    SMTP_OWN = "smtp_own"         # Servidor SMTP propio (postfix, exim)
    SMTP_EXTERNAL = "smtp_external"  # SMTP externo (Gmail, Outlook)
    SENDGRID = "sendgrid"         # SendGrid API
    MAILGUN = "mailgun"           # Mailgun API
    AWS_SES = "aws_ses"           # Amazon SES
    MAILCHIMP = "mailchimp"       # Mailchimp
    MAILJET = "mailjet"           # Mailjet

class EmailProviderStatus(enum.Enum):
    """Estado del proveedor"""
    ACTIVE = "active"             # Activo y funcionando
    INACTIVE = "inactive"         # Inactivo (deshabilitado)
    ERROR = "error"               # Error de conexión/configuración
    RATE_LIMITED = "rate_limited"  # Límite de rate alcanzado
    QUOTA_EXCEEDED = "quota_exceeded"  # Cuota mensual excedida
    TESTING = "testing"           # En pruebas

class EmailEventType(enum.Enum):
    """Tipos de eventos de email"""
    QUEUED = "queued"             # Email agregado a cola
    SENT = "sent"                 # Email enviado
    DELIVERED = "delivered"       # Email entregado
    OPENED = "opened"             # Email abierto
    CLICKED = "clicked"           # Link clickeado
    BOUNCED = "bounced"           # Rebotado
    SPAM = "spam"                 # Marcado como spam
    UNSUBSCRIBED = "unsubscribed"  # Usuario se dio de baja
    FAILED = "failed"             # Falló envío

class BounceType(enum.Enum):
    """Tipos de rebote"""
    HARD = "hard"                 # Rebote permanente (email no existe)
    SOFT = "soft"                 # Rebote temporal (buzón lleno)
    COMPLAINT = "complaint"       # Queja de spam
    SUPPRESSION = "suppression"   # Lista de supresión

class EmailTemplateCategory(enum.Enum):
    """Categorías de templates"""
    TRANSACTIONAL = "transactional"  # Transaccionales (confirmaciones)
    MARKETING = "marketing"       # Marketing (newsletters)
    NOTIFICATION = "notification"  # Notificaciones (alertas)
    TRAINING = "training"         # Capacitación (recordatorios)
    SYSTEM = "system"             # Sistema (reportes)

# ============================================================================
# DATABASE MODELS
# ============================================================================

class EmailProvider(Base):
    """Configuración de proveedores de email"""
    __tablename__ = 'email_providers'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Provider info
    provider_type = Column(SQLEnum(EmailProviderType), nullable=False)
    name = Column(String(100), nullable=False)  # e.g., "SendGrid Production"
    description = Column(Text)
    
    # Configuration (encrypted for sensitive data)
    config_encrypted = Column(Text)  # Encrypted JSON with credentials
    config_plain = Column(JSONB)     # Non-sensitive config (host, port, etc.)
    
    # Connection settings (for SMTP)
    smtp_host = Column(String(255))
    smtp_port = Column(Integer, default=587)
    smtp_username = Column(String(255))
    smtp_password_encrypted = Column(Text)
    smtp_use_tls = Column(Boolean, default=True)
    smtp_use_ssl = Column(Boolean, default=False)
    
    # API settings (for API-based providers)
    api_key_encrypted = Column(Text)
    api_endpoint = Column(String(500))
    api_version = Column(String(20))
    
    # Sender information
    from_email = Column(String(255), nullable=False)
    from_name = Column(String(255), default="Spirit Tours")
    reply_to_email = Column(String(255))
    
    # Limits and quotas
    max_emails_per_hour = Column(Integer, default=100)
    max_emails_per_day = Column(Integer, default=1000)
    max_emails_per_month = Column(Integer, default=10000)
    monthly_cost_usd = Column(Float, default=0.0)  # Costo mensual
    cost_per_email_usd = Column(Float, default=0.0)  # Costo por email
    
    # Priority and routing
    priority = Column(Integer, default=0)  # Higher = preferred
    weight = Column(Integer, default=100)  # For load balancing (0-100)
    fallback_provider_id = Column(UUID(as_uuid=True), ForeignKey('email_providers.id'))
    
    # Health and status
    status = Column(SQLEnum(EmailProviderStatus), default=EmailProviderStatus.INACTIVE)
    is_active = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)
    last_health_check = Column(DateTime(timezone=True))
    health_check_result = Column(JSONB)
    consecutive_failures = Column(Integer, default=0)
    
    # Usage tracking
    emails_sent_today = Column(Integer, default=0)
    emails_sent_this_month = Column(Integer, default=0)
    total_emails_sent = Column(BigInteger, default=0)
    total_emails_failed = Column(BigInteger, default=0)
    success_rate = Column(Float, default=100.0)  # Percentage
    
    # Advanced features
    supports_tracking = Column(Boolean, default=False)
    supports_templates = Column(Boolean, default=False)
    supports_webhooks = Column(Boolean, default=False)
    supports_attachments = Column(Boolean, default=True)
    supports_bulk_send = Column(Boolean, default=False)
    
    # DKIM/SPF/DMARC (for own SMTP)
    dkim_enabled = Column(Boolean, default=False)
    dkim_selector = Column(String(100))
    dkim_private_key_encrypted = Column(Text)
    spf_record = Column(Text)
    dmarc_policy = Column(String(50))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_used_at = Column(DateTime(timezone=True))
    
    # Relationships
    fallback_provider = relationship('EmailProvider', remote_side=[id], foreign_keys=[fallback_provider_id])
    queued_emails = relationship('EmailQueue', back_populates='provider', foreign_keys='EmailQueue.provider_id')
    logs = relationship('EmailLog', back_populates='provider')

class EmailQueue(Base):
    """Cola de emails con prioridades y reintentos"""
    __tablename__ = 'email_queue'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Email details
    to_email = Column(String(255), nullable=False, index=True)
    to_name = Column(String(255))
    from_email = Column(String(255), nullable=False)
    from_name = Column(String(255))
    reply_to_email = Column(String(255))
    cc_emails = Column(ARRAY(String))
    bcc_emails = Column(ARRAY(String))
    
    # Content
    subject = Column(String(500), nullable=False)
    body_html = Column(Text)
    body_text = Column(Text)
    template_id = Column(UUID(as_uuid=True), ForeignKey('email_templates.id'))
    template_variables = Column(JSONB)  # Variables for template
    
    # Attachments
    attachments = Column(JSONB)  # List of attachment URLs/paths
    
    # Priority and scheduling
    priority = Column(SQLEnum(EmailPriority), default=EmailPriority.NORMAL, index=True)
    status = Column(SQLEnum(EmailQueueStatus), default=EmailQueueStatus.PENDING, index=True)
    scheduled_at = Column(DateTime(timezone=True))  # For scheduled emails
    
    # Provider selection
    provider_id = Column(UUID(as_uuid=True), ForeignKey('email_providers.id'), index=True)
    provider_preference = Column(ARRAY(String))  # Preferred providers order
    
    # Retry logic
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    next_retry_at = Column(DateTime(timezone=True))
    last_error = Column(Text)
    error_details = Column(JSONB)
    
    # Tracking
    tracking_enabled = Column(Boolean, default=True)
    tracking_id = Column(String(100), unique=True, index=True)  # For open/click tracking
    
    # Metadata
    campaign_id = Column(UUID(as_uuid=True))  # Link to campaign
    category = Column(String(100))  # transactional, marketing, etc.
    tags = Column(ARRAY(String))
    metadata = Column(JSONB)  # Additional custom data
    
    # User tracking
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    sent_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    
    # Relationships
    provider = relationship('EmailProvider', back_populates='queued_emails', foreign_keys=[provider_id])
    template = relationship('EmailTemplate', back_populates='queued_emails')
    logs = relationship('EmailLog', back_populates='email_queue')
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_email_queue_status_priority', 'status', 'priority'),
        Index('idx_email_queue_scheduled', 'scheduled_at', 'status'),
        Index('idx_email_queue_tracking', 'tracking_id'),
    )

class EmailLog(Base):
    """Logs detallados de todos los eventos de email"""
    __tablename__ = 'email_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Email reference
    email_queue_id = Column(UUID(as_uuid=True), ForeignKey('email_queue.id'), index=True)
    tracking_id = Column(String(100), index=True)
    
    # Event details
    event_type = Column(SQLEnum(EmailEventType), nullable=False, index=True)
    event_timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    
    # Provider info
    provider_id = Column(UUID(as_uuid=True), ForeignKey('email_providers.id'))
    provider_message_id = Column(String(255))  # ID del proveedor (SendGrid, etc.)
    
    # Email details
    to_email = Column(String(255), index=True)
    from_email = Column(String(255))
    subject = Column(String(500))
    
    # Status and error handling
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    error_code = Column(String(50))
    error_details = Column(JSONB)
    
    # Tracking details (for opens/clicks)
    user_agent = Column(Text)
    ip_address = Column(String(50))
    location = Column(JSONB)  # Country, city, etc.
    clicked_url = Column(Text)  # For click events
    
    # Performance metrics
    send_duration_ms = Column(Integer)  # Time to send
    queue_duration_ms = Column(Integer)  # Time in queue
    
    # Metadata
    metadata = Column(JSONB)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    email_queue = relationship('EmailQueue', back_populates='logs')
    provider = relationship('EmailProvider', back_populates='logs')
    
    # Indexes
    __table_args__ = (
        Index('idx_email_logs_event_timestamp', 'event_type', 'event_timestamp'),
        Index('idx_email_logs_to_email', 'to_email', 'event_type'),
    )

class EmailMetric(Base):
    """Métricas agregadas de emails (diarias, mensuales)"""
    __tablename__ = 'email_metrics'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Time period
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    period_type = Column(String(20), nullable=False)  # hourly, daily, weekly, monthly
    
    # Provider
    provider_id = Column(UUID(as_uuid=True), ForeignKey('email_providers.id'), index=True)
    provider_name = Column(String(100))
    
    # Category
    category = Column(String(100), index=True)  # transactional, marketing, etc.
    
    # Counts
    total_queued = Column(Integer, default=0)
    total_sent = Column(Integer, default=0)
    total_delivered = Column(Integer, default=0)
    total_opened = Column(Integer, default=0)
    total_clicked = Column(Integer, default=0)
    total_bounced = Column(Integer, default=0)
    total_failed = Column(Integer, default=0)
    total_spam = Column(Integer, default=0)
    total_unsubscribed = Column(Integer, default=0)
    
    # Rates (percentages)
    delivery_rate = Column(Float, default=0.0)
    open_rate = Column(Float, default=0.0)
    click_rate = Column(Float, default=0.0)
    bounce_rate = Column(Float, default=0.0)
    spam_rate = Column(Float, default=0.0)
    
    # Performance
    avg_send_time_ms = Column(Integer, default=0)
    avg_queue_time_ms = Column(Integer, default=0)
    
    # Costs
    total_cost_usd = Column(Float, default=0.0)
    cost_per_email_usd = Column(Float, default=0.0)
    
    # Metadata
    metadata = Column(JSONB)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Indexes
    __table_args__ = (
        Index('idx_email_metrics_date_provider', 'date', 'provider_id'),
        Index('idx_email_metrics_category', 'category', 'date'),
    )

class EmailTemplate(Base):
    """Templates de email profesionales"""
    __tablename__ = 'email_templates'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Template info
    name = Column(String(200), nullable=False, unique=True)
    description = Column(Text)
    category = Column(SQLEnum(EmailTemplateCategory), nullable=False)
    
    # Template content
    subject = Column(String(500), nullable=False)
    body_html = Column(Text, nullable=False)
    body_text = Column(Text)  # Plain text version
    
    # Variables
    required_variables = Column(ARRAY(String))  # List of required vars
    optional_variables = Column(ARRAY(String))  # List of optional vars
    sample_data = Column(JSONB)  # Sample data for preview
    
    # Design
    thumbnail_url = Column(String(500))
    preview_url = Column(String(500))
    
    # Status
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    
    # Usage tracking
    times_used = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True))
    
    # Version control
    version = Column(Integer, default=1)
    parent_template_id = Column(UUID(as_uuid=True), ForeignKey('email_templates.id'))
    
    # Metadata
    tags = Column(ARRAY(String))
    metadata = Column(JSONB)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Relationships
    queued_emails = relationship('EmailQueue', back_populates='template')

class EmailBounce(Base):
    """Gestión de rebotes de email"""
    __tablename__ = 'email_bounces'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Email info
    email_address = Column(String(255), nullable=False, index=True, unique=True)
    bounce_type = Column(SQLEnum(BounceType), nullable=False)
    
    # Bounce details
    first_bounce_at = Column(DateTime(timezone=True), nullable=False)
    last_bounce_at = Column(DateTime(timezone=True), nullable=False)
    bounce_count = Column(Integer, default=1)
    
    # Error details
    bounce_reason = Column(Text)
    smtp_code = Column(String(10))
    smtp_message = Column(Text)
    
    # Provider info
    provider_id = Column(UUID(as_uuid=True), ForeignKey('email_providers.id'))
    
    # Status
    is_suppressed = Column(Boolean, default=False)  # No enviar más emails
    suppressed_until = Column(DateTime(timezone=True))
    
    # Metadata
    metadata = Column(JSONB)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class EmailWebhook(Base):
    """Webhooks de proveedores de email (SendGrid, Mailgun, etc.)"""
    __tablename__ = 'email_webhooks'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Provider info
    provider_id = Column(UUID(as_uuid=True), ForeignKey('email_providers.id'), index=True)
    provider_type = Column(SQLEnum(EmailProviderType), nullable=False)
    
    # Webhook data
    event_type = Column(String(100), nullable=False)
    tracking_id = Column(String(100), index=True)
    provider_message_id = Column(String(255))
    
    # Raw webhook data
    raw_data = Column(JSONB, nullable=False)
    
    # Processing
    processed = Column(Boolean, default=False, index=True)
    processed_at = Column(DateTime(timezone=True))
    processing_error = Column(Text)
    
    # Timestamps
    received_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_email_webhooks_processed', 'processed', 'received_at'),
    )

class EmailCampaign(Base):
    """Campañas de email marketing"""
    __tablename__ = 'email_campaigns'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Campaign info
    name = Column(String(200), nullable=False)
    description = Column(Text)
    campaign_type = Column(String(50), nullable=False)  # newsletter, promotion, announcement
    
    # Template
    template_id = Column(UUID(as_uuid=True), ForeignKey('email_templates.id'))
    
    # Targeting
    recipient_count = Column(Integer, default=0)
    recipient_segments = Column(JSONB)  # Segmentation rules
    
    # Scheduling
    scheduled_at = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Status
    status = Column(String(50), default='draft')  # draft, scheduled, sending, completed, cancelled
    
    # Metrics
    emails_sent = Column(Integer, default=0)
    emails_delivered = Column(Integer, default=0)
    emails_opened = Column(Integer, default=0)
    emails_clicked = Column(Integer, default=0)
    emails_bounced = Column(Integer, default=0)
    emails_unsubscribed = Column(Integer, default=0)
    
    # Budget
    estimated_cost_usd = Column(Float, default=0.0)
    actual_cost_usd = Column(Float, default=0.0)
    
    # Metadata
    tags = Column(ARRAY(String))
    metadata = Column(JSONB)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))

# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class EmailProviderBase(BaseModel):
    """Base para configuración de proveedor"""
    provider_type: str
    name: str
    description: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    api_key: Optional[str] = None
    api_endpoint: Optional[str] = None
    from_email: str
    from_name: str = "Spirit Tours"
    reply_to_email: Optional[str] = None
    max_emails_per_hour: int = 100
    max_emails_per_day: int = 1000
    max_emails_per_month: int = 10000
    monthly_cost_usd: float = 0.0
    cost_per_email_usd: float = 0.0
    priority: int = 0
    weight: int = 100
    supports_tracking: bool = False
    supports_templates: bool = False
    supports_webhooks: bool = False

class EmailProviderCreate(EmailProviderBase):
    """Crear proveedor de email"""
    pass

class EmailProviderUpdate(BaseModel):
    """Actualizar proveedor de email"""
    name: Optional[str] = None
    description: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    api_key: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None

class EmailProviderResponse(BaseModel):
    """Response de proveedor (sin credenciales sensibles)"""
    id: str
    provider_type: str
    name: str
    description: Optional[str]
    from_email: str
    from_name: str
    priority: int
    weight: int
    status: str
    is_active: bool
    is_default: bool
    emails_sent_today: int
    emails_sent_this_month: int
    total_emails_sent: int
    success_rate: float
    last_health_check: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True

class EmailQueueCreate(BaseModel):
    """Crear email en cola"""
    to_email: EmailStr
    to_name: Optional[str] = None
    subject: str
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    template_id: Optional[str] = None
    template_variables: Optional[Dict[str, Any]] = None
    priority: str = "normal"
    scheduled_at: Optional[datetime] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None

class EmailQueueResponse(BaseModel):
    """Response de email en cola"""
    id: str
    to_email: str
    subject: str
    priority: str
    status: str
    retry_count: int
    created_at: datetime
    sent_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class EmailMetricResponse(BaseModel):
    """Response de métricas"""
    date: datetime
    period_type: str
    provider_name: Optional[str]
    category: Optional[str]
    total_sent: int
    total_delivered: int
    total_opened: int
    total_clicked: int
    total_bounced: int
    delivery_rate: float
    open_rate: float
    click_rate: float
    bounce_rate: float
    total_cost_usd: float
    
    class Config:
        from_attributes = True

class EmailTemplateCreate(BaseModel):
    """Crear template de email"""
    name: str
    description: Optional[str] = None
    category: str
    subject: str
    body_html: str
    body_text: Optional[str] = None
    required_variables: List[str] = []
    optional_variables: List[str] = []
    sample_data: Optional[Dict[str, Any]] = None

class EmailTemplateResponse(BaseModel):
    """Response de template"""
    id: str
    name: str
    description: Optional[str]
    category: str
    subject: str
    is_active: bool
    times_used: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class SendEmailRequest(BaseModel):
    """Request para enviar email directo (bypass queue)"""
    to_email: EmailStr
    to_name: Optional[str] = None
    subject: str
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    template_id: Optional[str] = None
    template_variables: Optional[Dict[str, Any]] = None
    provider_id: Optional[str] = None  # Specify provider, otherwise use router

class SendEmailResponse(BaseModel):
    """Response de envío de email"""
    success: bool
    message: str
    email_queue_id: Optional[str] = None
    provider_used: Optional[str] = None
    timestamp: datetime

class EmailStatistics(BaseModel):
    """Estadísticas generales del sistema de email"""
    total_emails_sent: int
    total_emails_queued: int
    total_emails_failed: int
    success_rate: float
    avg_send_time_ms: int
    total_cost_this_month_usd: float
    active_providers: int
    providers: List[Dict[str, Any]]
    
class ProviderHealthCheck(BaseModel):
    """Health check de proveedor"""
    provider_id: str
    provider_name: str
    status: str
    last_check: datetime
    consecutive_failures: int
    success_rate: float
    response_time_ms: Optional[int] = None
