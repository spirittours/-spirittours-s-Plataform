"""
CRM Enterprise Models
Base de datos completa para integración SuiteCRM y sistema empresarial
Incluye sync_history, crm_activities, contactos, leads y oportunidades
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, ForeignKey, Numeric, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime

Base = declarative_base()

# Enumeraciones para el CRM
class CRMEntityType(enum.Enum):
    CONTACT = "contact"
    LEAD = "lead" 
    OPPORTUNITY = "opportunity"
    ACCOUNT = "account"
    TASK = "task"
    MEETING = "meeting"
    CALL = "call"
    EMAIL = "email"
    NOTE = "note"

class SyncStatus(enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"
    SKIPPED = "skipped"

class ActivityType(enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    VIEW = "view"
    SYNC = "sync"
    EXPORT = "export"
    IMPORT = "import"
    EMAIL_SENT = "email_sent"
    CALL_MADE = "call_made"
    MEETING_SCHEDULED = "meeting_scheduled"

class LeadStatus(enum.Enum):
    NEW = "new"
    CONTACTED = "contacted" 
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"

class OpportunityStage(enum.Enum):
    PROSPECTING = "prospecting"
    QUALIFICATION = "qualification"
    NEEDS_ANALYSIS = "needs_analysis"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"

# ===== TABLA PRINCIPAL DE SINCRONIZACIÓN =====

class CRMSyncHistory(Base):
    """
    Historial completo de sincronización con SuiteCRM
    Tracking de todos los cambios bidireccionales
    """
    __tablename__ = 'crm_sync_history'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Identificación de la sincronización
    sync_batch_id = Column(String(255), nullable=False, index=True)
    entity_type = Column(Enum(CRMEntityType), nullable=False, index=True)
    entity_id = Column(String(255), nullable=False, index=True)  # ID interno
    suitecrm_id = Column(String(255), nullable=True, index=True)  # ID en SuiteCRM
    
    # Tipo de operación
    operation = Column(String(50), nullable=False)  # create, update, delete, sync
    sync_direction = Column(String(50), nullable=False)  # to_suitecrm, from_suitecrm, bidirectional
    
    # Estado de la sincronización
    status = Column(Enum(SyncStatus), nullable=False, default=SyncStatus.PENDING)
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    
    # Datos de la sincronización
    data_before = Column(JSON, nullable=True)  # Estado antes de sincronizar
    data_after = Column(JSON, nullable=True)   # Estado después de sincronizar
    changes_detected = Column(JSON, nullable=True)  # Cambios detectados
    
    # Metadatos
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    next_retry_at = Column(DateTime(timezone=True), nullable=True)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    error_code = Column(String(100), nullable=True)
    error_details = Column(JSON, nullable=True)
    
    # Tracking de usuario
    triggered_by_user_id = Column(Integer, nullable=True)
    triggered_by_system = Column(Boolean, default=False)
    
    # Configuración de sincronización
    sync_config = Column(JSON, nullable=True)
    priority = Column(Integer, default=5)  # 1-10, siendo 10 máxima prioridad
    
    # Índices para consultas rápidas
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )

# ===== TABLA DE ACTIVIDADES CRM =====

class CRMActivity(Base):
    """
    Registro de todas las actividades del CRM
    Auditoría completa de acciones de usuarios y sistema
    """
    __tablename__ = 'crm_activities'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Identificación de la actividad
    activity_id = Column(String(255), nullable=False, unique=True, index=True)
    activity_type = Column(Enum(ActivityType), nullable=False, index=True)
    
    # Entidad relacionada
    entity_type = Column(Enum(CRMEntityType), nullable=False, index=True)
    entity_id = Column(String(255), nullable=False, index=True)
    suitecrm_id = Column(String(255), nullable=True, index=True)
    
    # Usuario y contexto
    user_id = Column(Integer, nullable=True, index=True)
    user_email = Column(String(255), nullable=True)
    user_name = Column(String(255), nullable=True)
    user_role = Column(String(100), nullable=True)
    
    # Detalles de la actividad
    activity_title = Column(String(500), nullable=False)
    activity_description = Column(Text, nullable=True)
    activity_data = Column(JSON, nullable=True)
    
    # Metadatos
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    session_id = Column(String(255), nullable=True)
    
    # Contexto empresarial
    department = Column(String(100), nullable=True)
    branch_id = Column(Integer, nullable=True)
    campaign_id = Column(String(255), nullable=True)
    
    # Resultados y métricas
    result_status = Column(String(50), nullable=True)  # success, failed, pending
    duration_ms = Column(Integer, nullable=True)
    response_size_bytes = Column(Integer, nullable=True)
    
    # Clasificación y tags
    tags = Column(JSON, nullable=True)
    priority = Column(String(20), nullable=True)
    sensitivity = Column(String(20), nullable=True)  # public, internal, confidential
    
    __table_args__ = (
        {'mysql_engine': 'InnoDB'},
    )

# ===== MODELOS DE ENTIDADES CRM =====

class CRMContact(Base):
    """
    Contactos empresariales sincronizados con SuiteCRM
    """
    __tablename__ = 'crm_contacts'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # IDs de sincronización
    suitecrm_id = Column(String(255), nullable=True, unique=True, index=True)
    external_id = Column(String(255), nullable=True, index=True)
    
    # Datos personales
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    full_name = Column(String(255), nullable=True)
    salutation = Column(String(50), nullable=True)  # Dr., Mr., Ms., etc.
    
    # Contacto
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    mobile = Column(String(50), nullable=True)
    fax = Column(String(50), nullable=True)
    
    # Información profesional
    title = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    account_name = Column(String(255), nullable=True)
    account_id = Column(String(255), nullable=True, index=True)
    
    # Dirección
    primary_address_street = Column(String(255), nullable=True)
    primary_address_city = Column(String(100), nullable=True)
    primary_address_state = Column(String(100), nullable=True)
    primary_address_country = Column(String(100), nullable=True)
    primary_address_postalcode = Column(String(20), nullable=True)
    
    # Datos adicionales
    lead_source = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    birthdate = Column(DateTime, nullable=True)
    
    # Estados y flags
    is_active = Column(Boolean, default=True)
    do_not_call = Column(Boolean, default=False)
    email_opt_out = Column(Boolean, default=False)
    
    # Sincronización
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    sync_status = Column(Enum(SyncStatus), default=SyncStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Datos personalizados
    custom_fields = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)
    
    # Relaciones
    activities = relationship("CRMActivity", foreign_keys="[CRMActivity.entity_id]", 
                             primaryjoin="and_(CRMContact.suitecrm_id == foreign(CRMActivity.entity_id), "
                                        "CRMActivity.entity_type == 'contact')", 
                             viewonly=True)

class CRMLead(Base):
    """
    Leads empresariales sincronizados con SuiteCRM
    """
    __tablename__ = 'crm_leads'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # IDs de sincronización
    suitecrm_id = Column(String(255), nullable=True, unique=True, index=True)
    external_id = Column(String(255), nullable=True, index=True)
    
    # Datos básicos
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    full_name = Column(String(255), nullable=True)
    salutation = Column(String(50), nullable=True)
    
    # Contacto
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True)
    mobile = Column(String(50), nullable=True)
    
    # Información profesional
    title = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    industry = Column(String(100), nullable=True)
    
    # Estado del lead
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW, index=True)
    lead_source = Column(String(255), nullable=True)
    rating = Column(String(50), nullable=True)  # Hot, Warm, Cold
    
    # Datos financieros
    annual_revenue = Column(Numeric(15, 2), nullable=True)
    employees = Column(Integer, nullable=True)
    
    # Dirección
    primary_address_street = Column(String(255), nullable=True)
    primary_address_city = Column(String(100), nullable=True)
    primary_address_state = Column(String(100), nullable=True)
    primary_address_country = Column(String(100), nullable=True)
    primary_address_postalcode = Column(String(20), nullable=True)
    
    # Descripción e intereses
    description = Column(Text, nullable=True)
    campaign_id = Column(String(255), nullable=True, index=True)
    
    # Asignación
    assigned_user_id = Column(String(255), nullable=True, index=True)
    assigned_user_name = Column(String(255), nullable=True)
    
    # Estados y flags
    is_active = Column(Boolean, default=True)
    converted = Column(Boolean, default=False)
    do_not_call = Column(Boolean, default=False)
    email_opt_out = Column(Boolean, default=False)
    
    # Conversión
    contact_id = Column(String(255), nullable=True, index=True)
    account_id = Column(String(255), nullable=True, index=True)
    opportunity_id = Column(String(255), nullable=True, index=True)
    converted_date = Column(DateTime(timezone=True), nullable=True)
    
    # Sincronización
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    sync_status = Column(Enum(SyncStatus), default=SyncStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Datos personalizados
    custom_fields = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)

class CRMOpportunity(Base):
    """
    Oportunidades de negocio sincronizadas con SuiteCRM
    """
    __tablename__ = 'crm_opportunities'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # IDs de sincronización
    suitecrm_id = Column(String(255), nullable=True, unique=True, index=True)
    external_id = Column(String(255), nullable=True, index=True)
    
    # Datos básicos
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Relaciones
    account_id = Column(String(255), nullable=True, index=True)
    account_name = Column(String(255), nullable=True)
    contact_id = Column(String(255), nullable=True, index=True)
    lead_id = Column(String(255), nullable=True, index=True)
    
    # Estado y progreso
    sales_stage = Column(Enum(OpportunityStage), default=OpportunityStage.PROSPECTING, index=True)
    probability = Column(Integer, default=0)  # 0-100%
    
    # Datos financieros
    amount = Column(Numeric(15, 2), nullable=True)
    currency = Column(String(3), default='USD')
    
    # Fechas importantes
    date_closed = Column(DateTime, nullable=True)
    expected_close_date = Column(DateTime, nullable=True, index=True)
    
    # Asignación
    assigned_user_id = Column(String(255), nullable=True, index=True)
    assigned_user_name = Column(String(255), nullable=True)
    
    # Origen y clasificación
    lead_source = Column(String(255), nullable=True)
    opportunity_type = Column(String(100), nullable=True)
    campaign_id = Column(String(255), nullable=True, index=True)
    
    # Estado
    is_active = Column(Boolean, default=True)
    is_closed = Column(Boolean, default=False)
    is_won = Column(Boolean, default=False)
    
    # Sincronización
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    sync_status = Column(Enum(SyncStatus), default=SyncStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Datos personalizados
    custom_fields = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)

class CRMAccount(Base):
    """
    Cuentas empresariales sincronizadas con SuiteCRM
    """
    __tablename__ = 'crm_accounts'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # IDs de sincronización
    suitecrm_id = Column(String(255), nullable=True, unique=True, index=True)
    external_id = Column(String(255), nullable=True, index=True)
    
    # Datos básicos
    name = Column(String(255), nullable=False, index=True)
    account_type = Column(String(100), nullable=True)
    industry = Column(String(100), nullable=True)
    
    # Contacto
    phone_office = Column(String(50), nullable=True)
    phone_fax = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    
    # Dirección de facturación
    billing_address_street = Column(String(255), nullable=True)
    billing_address_city = Column(String(100), nullable=True)
    billing_address_state = Column(String(100), nullable=True)
    billing_address_country = Column(String(100), nullable=True)
    billing_address_postalcode = Column(String(20), nullable=True)
    
    # Dirección de envío
    shipping_address_street = Column(String(255), nullable=True)
    shipping_address_city = Column(String(100), nullable=True)
    shipping_address_state = Column(String(100), nullable=True)
    shipping_address_country = Column(String(100), nullable=True)
    shipping_address_postalcode = Column(String(20), nullable=True)
    
    # Datos financieros
    annual_revenue = Column(Numeric(15, 2), nullable=True)
    employees = Column(Integer, nullable=True)
    
    # Información adicional
    description = Column(Text, nullable=True)
    rating = Column(String(50), nullable=True)
    
    # Asignación
    assigned_user_id = Column(String(255), nullable=True, index=True)
    assigned_user_name = Column(String(255), nullable=True)
    
    # Estado
    is_active = Column(Boolean, default=True)
    
    # Sincronización
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    sync_status = Column(Enum(SyncStatus), default=SyncStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Datos personalizados
    custom_fields = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)

# ===== TABLAS DE CONFIGURACIÓN =====

class CRMWebhookConfig(Base):
    """
    Configuración de webhooks para sincronización bidireccional
    """
    __tablename__ = 'crm_webhook_config'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Identificación
    webhook_id = Column(String(255), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Configuración del webhook
    entity_type = Column(Enum(CRMEntityType), nullable=False)
    event_types = Column(JSON, nullable=False)  # ['create', 'update', 'delete']
    endpoint_url = Column(String(500), nullable=False)
    
    # Autenticación
    auth_type = Column(String(50), nullable=False, default='bearer')  # bearer, basic, oauth2
    auth_config = Column(JSON, nullable=True)
    
    # Configuración de envío
    retry_attempts = Column(Integer, default=3)
    retry_delay_seconds = Column(Integer, default=60)
    timeout_seconds = Column(Integer, default=30)
    
    # Filtros y transformaciones
    filters = Column(JSON, nullable=True)
    field_mapping = Column(JSON, nullable=True)
    transform_rules = Column(JSON, nullable=True)
    
    # Estado
    is_active = Column(Boolean, default=True)
    is_bidirectional = Column(Boolean, default=False)
    
    # Métricas
    total_calls = Column(Integer, default=0)
    successful_calls = Column(Integer, default=0)
    failed_calls = Column(Integer, default=0)
    last_success_at = Column(DateTime(timezone=True), nullable=True)
    last_failure_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadatos
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_user_id = Column(Integer, nullable=True)
    
class CRMSyncSettings(Base):
    """
    Configuración global de sincronización CRM
    """
    __tablename__ = 'crm_sync_settings'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Identificación
    setting_key = Column(String(255), nullable=False, unique=True)
    setting_name = Column(String(255), nullable=False)
    setting_description = Column(Text, nullable=True)
    
    # Valor de configuración
    setting_value = Column(JSON, nullable=False)
    default_value = Column(JSON, nullable=True)
    
    # Metadatos
    setting_type = Column(String(50), nullable=False)  # string, integer, boolean, json, array
    is_encrypted = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    
    # Validación
    validation_rules = Column(JSON, nullable=True)
    allowed_values = Column(JSON, nullable=True)
    
    # Estado
    is_active = Column(Boolean, default=True)
    
    # Tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    updated_by_user_id = Column(Integer, nullable=True)