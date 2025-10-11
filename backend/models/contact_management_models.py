"""
Contact Management System Models
Sistema completo de gestión de contactos con seguridad avanzada
Includes: Phonebook, Import/Export controls, Sharing, Fraud prevention
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Date, 
    ForeignKey, Table, JSON, DECIMAL, Enum as SQLEnum,
    UniqueConstraint, Index, CheckConstraint, func, and_, or_, select
)
from sqlalchemy.orm import relationship, backref, validates
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, INET, BYTEA
from backend.database.session import Base
import uuid
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import json
from typing import Optional, List, Dict, Any
from cryptography.fernet import Fernet
import phonenumbers
import re

# ===== ENUMS =====

class ContactType(str, Enum):
    """Tipos de contacto"""
    CUSTOMER = "CUSTOMER"           # Cliente
    PASSENGER = "PASSENGER"          # Pasajero
    AGENCY = "AGENCY"               # Agencia
    SUPPLIER = "SUPPLIER"           # Proveedor
    EMPLOYEE = "EMPLOYEE"           # Empleado
    AFFILIATE = "AFFILIATE"         # Afiliado
    PARTNER = "PARTNER"             # Socio comercial
    GOVERNMENT = "GOVERNMENT"       # Gobierno/Oficial
    MEDIA = "MEDIA"                 # Prensa/Media
    INFLUENCER = "INFLUENCER"       # Influencer
    EMERGENCY = "EMERGENCY"         # Contacto de emergencia
    OTHER = "OTHER"                 # Otro

class ContactSource(str, Enum):
    """Fuente del contacto"""
    MANUAL = "MANUAL"               # Entrada manual
    GOOGLE = "GOOGLE"               # Google Contacts Sync
    OUTLOOK = "OUTLOOK"             # Outlook/Exchange
    APPLE = "APPLE"                 # iCloud Contacts
    FACEBOOK = "FACEBOOK"           # Facebook
    INSTAGRAM = "INSTAGRAM"         # Instagram
    LINKEDIN = "LINKEDIN"           # LinkedIn
    WHATSAPP = "WHATSAPP"           # WhatsApp
    CSV_IMPORT = "CSV_IMPORT"       # Importación CSV
    API = "API"                     # API externa
    BOOKING = "BOOKING"             # Sistema de reservas
    CRM = "CRM"                     # CRM externo
    WEBSITE = "WEBSITE"             # Formulario web
    SHARED = "SHARED"               # Compartido por cliente
    EMAIL_SCAN = "EMAIL_SCAN"       # Escaneo de emails
    MIGRATION = "MIGRATION"         # Migración de datos

class ContactStatus(str, Enum):
    """Estado del contacto"""
    ACTIVE = "ACTIVE"               # Activo
    INACTIVE = "INACTIVE"           # Inactivo
    BLOCKED = "BLOCKED"             # Bloqueado
    PENDING = "PENDING"             # Pendiente de verificación
    MERGED = "MERGED"               # Fusionado con otro
    DELETED = "DELETED"             # Eliminado (soft delete)
    SUSPENDED = "SUSPENDED"         # Suspendido temporalmente
    VIP = "VIP"                     # Cliente VIP
    BLACKLISTED = "BLACKLISTED"     # Lista negra

class SharePermission(str, Enum):
    """Permisos de compartir"""
    VIEW = "VIEW"                   # Solo ver
    EDIT = "EDIT"                   # Ver y editar
    SHARE = "SHARE"                 # Ver, editar y compartir
    DELETE = "DELETE"               # Todos los permisos
    RESTRICTED = "RESTRICTED"       # Vista limitada (sin datos sensibles)

class AccessLevel(str, Enum):
    """Nivel de acceso a contactos"""
    OWNER = "OWNER"                 # Propietario (todos los permisos)
    ADMIN = "ADMIN"                 # Administrador (ver todos)
    MANAGER = "MANAGER"             # Gerente (ver su equipo)
    EMPLOYEE = "EMPLOYEE"           # Empleado (ver asignados)
    READONLY = "READONLY"           # Solo lectura
    RESTRICTED = "RESTRICTED"       # Restringido (sin exportar)

class SyncStatus(str, Enum):
    """Estado de sincronización"""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"
    SCHEDULED = "SCHEDULED"

class ExportRequest(str, Enum):
    """Estado de solicitud de exportación"""
    PENDING = "PENDING"             # Pendiente de aprobación
    APPROVED = "APPROVED"           # Aprobada
    REJECTED = "REJECTED"           # Rechazada
    PROCESSING = "PROCESSING"       # Procesando
    COMPLETED = "COMPLETED"         # Completada
    EXPIRED = "EXPIRED"             # Expirada

class CommunicationChannel(str, Enum):
    """Canal de comunicación preferido"""
    EMAIL = "EMAIL"
    PHONE = "PHONE"
    SMS = "SMS"
    WHATSAPP = "WHATSAPP"
    TELEGRAM = "TELEGRAM"
    FACEBOOK = "FACEBOOK"
    INSTAGRAM = "INSTAGRAM"
    MAIL = "MAIL"                   # Correo postal

# ===== ASSOCIATION TABLES =====

contact_tags = Table(
    'contact_tags',
    Base.metadata,
    Column('contact_id', UUID(as_uuid=True), ForeignKey('contacts.id')),
    Column('tag_id', UUID(as_uuid=True), ForeignKey('contact_tag_definitions.id'))
)

contact_groups = Table(
    'contact_groups_association',
    Base.metadata,
    Column('contact_id', UUID(as_uuid=True), ForeignKey('contacts.id')),
    Column('group_id', UUID(as_uuid=True), ForeignKey('contact_groups.id'))
)

# ===== MAIN MODELS =====

class Contact(Base):
    """
    Modelo principal de contactos con seguridad avanzada
    """
    __tablename__ = 'contacts'
    
    # Identificadores
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    internal_code = Column(String(50), unique=True, nullable=False, index=True)
    legacy_id = Column(Integer, nullable=True, index=True)  # Para migración
    
    # Información básica
    contact_type = Column(SQLEnum(ContactType), default=ContactType.CUSTOMER, nullable=False, index=True)
    salutation = Column(String(20))  # Sr., Sra., Dr., etc.
    first_name = Column(String(100), nullable=False)
    middle_name = Column(String(100))
    last_name = Column(String(100), nullable=False)
    full_name = Column(String(300), nullable=False, index=True)  # Computed
    display_name = Column(String(200))  # Nombre para mostrar
    nickname = Column(String(100))
    
    # Información de empresa (para contactos comerciales)
    company_name = Column(String(200), index=True)
    job_title = Column(String(150))
    department = Column(String(100))
    
    # Contacto principal
    email = Column(String(255), index=True)
    email_verified = Column(Boolean, default=False)
    phone = Column(String(50), index=True)
    phone_verified = Column(Boolean, default=False)
    phone_country_code = Column(String(10))
    mobile = Column(String(50), index=True)
    mobile_verified = Column(Boolean, default=False)
    mobile_country_code = Column(String(10))
    
    # Contactos adicionales
    email_secondary = Column(String(255))
    phone_secondary = Column(String(50))
    fax = Column(String(50))
    website = Column(String(255))
    
    # Redes sociales (encriptado)
    social_media = Column(JSONB)  # {facebook: '', instagram: '', linkedin: '', etc}
    
    # Dirección principal
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100))
    state_province = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100), index=True)
    latitude = Column(DECIMAL(10, 7))
    longitude = Column(DECIMAL(10, 7))
    
    # Dirección secundaria
    billing_address = Column(JSONB)  # Dirección de facturación si es diferente
    shipping_address = Column(JSONB)  # Dirección de envío si es diferente
    
    # Información personal (encriptada)
    date_of_birth = Column(Date)
    gender = Column(String(20))
    nationality = Column(String(100))
    passport_number_encrypted = Column(BYTEA)  # Encriptado
    national_id_encrypted = Column(BYTEA)      # Encriptado
    tax_id_encrypted = Column(BYTEA)           # Encriptado
    
    # Preferencias
    preferred_language = Column(String(10), default='es')
    preferred_currency = Column(String(3), default='USD')
    preferred_channel = Column(SQLEnum(CommunicationChannel), default=CommunicationChannel.EMAIL)
    timezone = Column(String(50))
    
    # Marketing y comunicación
    accepts_marketing = Column(Boolean, default=True)
    accepts_sms = Column(Boolean, default=True)
    accepts_whatsapp = Column(Boolean, default=True)
    do_not_call = Column(Boolean, default=False)
    do_not_email = Column(Boolean, default=False)
    
    # Clasificación y segmentación
    customer_segment = Column(String(50))  # VIP, Regular, New, etc.
    lifetime_value = Column(DECIMAL(12, 2), default=0)
    rating = Column(Integer, CheckConstraint('rating >= 1 AND rating <= 5'))
    priority_level = Column(Integer, default=0)  # 0-10
    
    # Origen y tracking
    source = Column(SQLEnum(ContactSource), default=ContactSource.MANUAL, nullable=False)
    source_detail = Column(String(255))  # Detalles específicos del origen
    acquisition_date = Column(Date, default=func.current_date())
    acquisition_campaign = Column(String(100))
    referrer_contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'))
    
    # Estado y validación
    status = Column(SQLEnum(ContactStatus), default=ContactStatus.ACTIVE, nullable=False, index=True)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'))
    merge_history = Column(JSONB)  # Historial de fusiones
    
    # Seguridad y privacidad
    access_level = Column(SQLEnum(AccessLevel), default=AccessLevel.EMPLOYEE, nullable=False)
    is_sensitive = Column(Boolean, default=False)  # Requiere permisos especiales
    is_protected = Column(Boolean, default=False)  # No se puede eliminar
    data_retention_date = Column(Date)  # Fecha límite de retención (GDPR)
    consent_date = Column(DateTime(timezone=True))
    consent_ip = Column(INET)
    
    # Control de acceso
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id'))
    visible_to = Column(ARRAY(UUID(as_uuid=True)))  # Lista de usuarios con acceso
    
    # Sincronización externa
    google_contact_id = Column(String(255), unique=True)
    outlook_contact_id = Column(String(255), unique=True)
    apple_contact_id = Column(String(255), unique=True)
    external_ids = Column(JSONB)  # {system: id} para otros sistemas
    last_sync_at = Column(DateTime(timezone=True))
    sync_status = Column(SQLEnum(SyncStatus))
    sync_errors = Column(JSONB)
    
    # Notas y campos personalizados
    notes = Column(Text)
    internal_notes = Column(Text)  # Solo visible para empleados
    custom_fields = Column(JSONB)  # Campos personalizados {key: value}
    attachments = Column(JSONB)  # Lista de archivos adjuntos
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    updated_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    deleted_at = Column(DateTime(timezone=True))  # Soft delete
    deleted_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Estadísticas (computed)
    total_bookings = Column(Integer, default=0)
    total_spent = Column(DECIMAL(12, 2), default=0)
    last_booking_date = Column(Date)
    last_interaction_date = Column(DateTime(timezone=True))
    interaction_count = Column(Integer, default=0)
    
    # Relaciones
    tags = relationship('ContactTag', secondary=contact_tags, back_populates='contacts')
    groups = relationship('ContactGroup', secondary=contact_groups, back_populates='contacts')
    shares = relationship('ContactShare', back_populates='contact', cascade='all, delete-orphan')
    activities = relationship('ContactActivity', back_populates='contact', cascade='all, delete-orphan')
    communications = relationship('ContactCommunication', back_populates='contact')
    export_logs = relationship('ContactExportLog', back_populates='contact')
    access_logs = relationship('ContactAccessLog', back_populates='contact')
    referrer = relationship('Contact', remote_side=[id], backref='referrals')
    duplicate_of = relationship('Contact', remote_side=[id], backref='duplicates')
    
    # Indexes
    __table_args__ = (
        Index('idx_contact_search', 'full_name', 'email', 'phone', 'company_name'),
        Index('idx_contact_type_status', 'contact_type', 'status'),
        Index('idx_contact_owner_assigned', 'owner_id', 'assigned_to_id'),
        Index('idx_contact_source', 'source', 'acquisition_date'),
        UniqueConstraint('email', 'contact_type', name='uq_email_type'),
    )
    
    @validates('email', 'email_secondary')
    def validate_email(self, key, value):
        """Valida formato de email"""
        if value and not re.match(r'^[^@]+@[^@]+\.[^@]+$', value):
            raise ValueError(f'Invalid email format: {value}')
        return value.lower() if value else value
    
    @validates('phone', 'mobile', 'phone_secondary')
    def validate_phone(self, key, value):
        """Valida y formatea número de teléfono"""
        if value:
            try:
                parsed = phonenumbers.parse(value, None)
                return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            except:
                return value
        return value
    
    @hybrid_property
    def is_exportable(self):
        """Determina si el contacto puede ser exportado"""
        return not self.is_sensitive and self.status == ContactStatus.ACTIVE
    
    def encrypt_sensitive_data(self, key: bytes):
        """Encripta datos sensibles"""
        f = Fernet(key)
        if self.passport_number_encrypted:
            self.passport_number_encrypted = f.encrypt(self.passport_number_encrypted.encode())
        if self.national_id_encrypted:
            self.national_id_encrypted = f.encrypt(self.national_id_encrypted.encode())
        if self.tax_id_encrypted:
            self.tax_id_encrypted = f.encrypt(self.tax_id_encrypted.encode())


class ContactGroup(Base):
    """
    Grupos de contactos para organización
    """
    __tablename__ = 'contact_groups'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    group_type = Column(String(50))  # Static, Dynamic, Smart
    
    # Reglas para grupos dinámicos
    filter_rules = Column(JSONB)  # Criterios de filtrado automático
    
    # Control de acceso
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    is_public = Column(Boolean, default=False)
    is_system = Column(Boolean, default=False)  # Grupos del sistema, no editables
    
    # Configuración
    color = Column(String(7))  # Color hex para UI
    icon = Column(String(50))  # Icono para UI
    sort_order = Column(Integer, default=0)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    contacts = relationship('Contact', secondary=contact_groups, back_populates='groups')


class ContactTag(Base):
    """
    Etiquetas para clasificar contactos
    """
    __tablename__ = 'contact_tag_definitions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False, unique=True)
    category = Column(String(50))  # Categoría de la etiqueta
    color = Column(String(7))  # Color hex
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Relaciones
    contacts = relationship('Contact', secondary=contact_tags, back_populates='tags')


class ContactShare(Base):
    """
    Control de compartir contactos entre usuarios
    """
    __tablename__ = 'contact_shares'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), nullable=False)
    
    # Compartir con
    shared_with_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    shared_with_team_id = Column(UUID(as_uuid=True), ForeignKey('teams.id'))
    shared_with_email = Column(String(255))  # Para compartir externos
    
    # Permisos
    permission = Column(SQLEnum(SharePermission), default=SharePermission.VIEW, nullable=False)
    can_reshare = Column(Boolean, default=False)
    
    # Validez
    valid_from = Column(DateTime(timezone=True), default=func.now())
    valid_until = Column(DateTime(timezone=True))  # Null = permanente
    
    # Token para compartir externo
    share_token = Column(String(100), unique=True)
    token_used_at = Column(DateTime(timezone=True))
    
    # Notas
    message = Column(Text)  # Mensaje al compartir
    
    # Auditoría
    shared_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    shared_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_at = Column(DateTime(timezone=True))
    revoked_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    revoke_reason = Column(Text)
    
    # Relaciones
    contact = relationship('Contact', back_populates='shares')
    
    __table_args__ = (
        UniqueConstraint('contact_id', 'shared_with_user_id', name='uq_contact_user_share'),
        UniqueConstraint('contact_id', 'shared_with_team_id', name='uq_contact_team_share'),
    )


class ContactActivity(Base):
    """
    Registro de actividades con contactos
    """
    __tablename__ = 'contact_activities'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), nullable=False)
    
    activity_type = Column(String(50), nullable=False)  # call, email, meeting, note, etc.
    activity_subtype = Column(String(50))
    
    # Detalles
    subject = Column(String(255))
    description = Column(Text)
    outcome = Column(String(100))  # Resultado de la actividad
    
    # Fechas
    activity_date = Column(DateTime(timezone=True), nullable=False, default=func.now())
    duration_minutes = Column(Integer)
    
    # Seguimiento
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(Date)
    follow_up_completed = Column(Boolean, default=False)
    
    # Referencias
    related_booking_id = Column(UUID(as_uuid=True))
    related_invoice_id = Column(UUID(as_uuid=True))
    
    # Auditoría
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    contact = relationship('Contact', back_populates='activities')


class ContactCommunication(Base):
    """
    Historial de comunicaciones con contactos
    """
    __tablename__ = 'contact_communications'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), nullable=False)
    
    # Tipo de comunicación
    channel = Column(SQLEnum(CommunicationChannel), nullable=False)
    direction = Column(String(20))  # inbound, outbound
    
    # Contenido
    subject = Column(String(255))
    content = Column(Text)
    template_used = Column(String(100))
    
    # Metadatos
    from_address = Column(String(255))
    to_address = Column(String(255))
    cc_addresses = Column(ARRAY(String))
    
    # Estado
    status = Column(String(50))  # sent, delivered, read, failed
    error_message = Column(Text)
    
    # Tracking
    sent_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    read_at = Column(DateTime(timezone=True))
    clicked_links = Column(JSONB)
    
    # Referencias
    campaign_id = Column(UUID(as_uuid=True))
    itinerary_id = Column(UUID(as_uuid=True))
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Relaciones
    contact = relationship('Contact', back_populates='communications')


class ContactImportJob(Base):
    """
    Trabajos de importación de contactos
    """
    __tablename__ = 'contact_import_jobs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Configuración de importación
    source = Column(SQLEnum(ContactSource), nullable=False)
    source_config = Column(JSONB)  # Configuración específica del origen
    
    # Archivo (para CSV)
    file_name = Column(String(255))
    file_size = Column(Integer)
    file_hash = Column(String(64))
    
    # Mapeo de campos
    field_mapping = Column(JSONB, nullable=False)  # {source_field: target_field}
    
    # Opciones
    duplicate_strategy = Column(String(50))  # skip, update, merge
    validate_emails = Column(Boolean, default=True)
    validate_phones = Column(Boolean, default=True)
    auto_tag = Column(ARRAY(String))  # Tags automáticas
    assign_to_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Estado
    status = Column(String(50), nullable=False, default='pending')
    total_records = Column(Integer, default=0)
    processed_records = Column(Integer, default=0)
    successful_records = Column(Integer, default=0)
    failed_records = Column(Integer, default=0)
    duplicate_records = Column(Integer, default=0)
    
    # Resultados
    error_log = Column(JSONB)
    imported_contact_ids = Column(ARRAY(UUID(as_uuid=True)))
    
    # Tiempo
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    
    # Auditoría
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ContactExportLog(Base):
    """
    Registro de exportaciones de contactos (para control anti-fraude)
    """
    __tablename__ = 'contact_export_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Qué se exportó
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'))  # Si es individual
    contact_ids = Column(ARRAY(UUID(as_uuid=True)))  # Si son múltiples
    export_query = Column(JSONB)  # Query utilizado para la exportación
    record_count = Column(Integer, nullable=False)
    
    # Formato y contenido
    export_format = Column(String(20))  # csv, excel, json, pdf, vcard
    fields_exported = Column(ARRAY(String))  # Campos incluidos
    
    # Solicitud y aprobación
    request_status = Column(SQLEnum(ExportRequest), default=ExportRequest.PENDING)
    request_reason = Column(Text)
    approved_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    approved_at = Column(DateTime(timezone=True))
    rejection_reason = Column(Text)
    
    # Archivo
    file_name = Column(String(255))
    file_hash = Column(String(64))  # SHA-256 del archivo
    file_size = Column(Integer)
    download_url = Column(String(500))
    download_expires_at = Column(DateTime(timezone=True))
    
    # Seguridad
    ip_address = Column(INET)
    user_agent = Column(String(500))
    device_fingerprint = Column(String(100))
    
    # Alertas
    is_suspicious = Column(Boolean, default=False)
    alert_sent = Column(Boolean, default=False)
    alert_reason = Column(Text)
    
    # Auditoría
    exported_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    exported_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    contact = relationship('Contact', back_populates='export_logs')
    
    __table_args__ = (
        Index('idx_export_user_date', 'exported_by_id', 'exported_at'),
        CheckConstraint('record_count > 0', name='check_positive_record_count'),
    )


class ContactAccessLog(Base):
    """
    Registro de acceso a contactos (para auditoría)
    """
    __tablename__ = 'contact_access_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), nullable=False)
    
    # Acción
    action = Column(String(50), nullable=False)  # view, edit, delete, export, share
    action_detail = Column(JSONB)  # Detalles específicos de la acción
    
    # Contexto
    access_reason = Column(Text)
    module = Column(String(50))  # Desde qué módulo se accedió
    
    # Seguridad
    ip_address = Column(INET)
    session_id = Column(String(100))
    
    # Tiempo
    accessed_at = Column(DateTime(timezone=True), server_default=func.now())
    duration_ms = Column(Integer)  # Tiempo de visualización
    
    # Usuario
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Relaciones
    contact = relationship('Contact', back_populates='access_logs')
    
    __table_args__ = (
        Index('idx_access_contact_user', 'contact_id', 'user_id'),
        Index('idx_access_timestamp', 'accessed_at'),
    )


class ContactSyncConfiguration(Base):
    """
    Configuración de sincronización con servicios externos
    """
    __tablename__ = 'contact_sync_configurations'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Servicio
    service = Column(SQLEnum(ContactSource), nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Credenciales (encriptadas)
    credentials = Column(BYTEA)  # Tokens OAuth, API keys, etc.
    
    # Configuración
    sync_direction = Column(String(20))  # import, export, bidirectional
    sync_frequency = Column(String(20))  # manual, hourly, daily, realtime
    field_mapping = Column(JSONB)
    filters = Column(JSONB)  # Filtros para sincronización selectiva
    
    # Estado
    last_sync_at = Column(DateTime(timezone=True))
    last_sync_status = Column(SQLEnum(SyncStatus))
    last_sync_count = Column(Integer, default=0)
    next_sync_at = Column(DateTime(timezone=True))
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('user_id', 'service', name='uq_user_service'),
    )


class ContactMergeHistory(Base):
    """
    Historial de fusión de contactos duplicados
    """
    __tablename__ = 'contact_merge_history'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Contactos involucrados
    master_contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), nullable=False)
    merged_contact_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    
    # Datos antes de la fusión
    pre_merge_data = Column(JSONB)  # Snapshot de los datos originales
    
    # Estrategia de fusión
    merge_strategy = Column(JSONB)  # Qué campos se tomaron de cada contacto
    conflicts_resolved = Column(JSONB)  # Conflictos y cómo se resolvieron
    
    # Resultado
    post_merge_data = Column(JSONB)  # Datos después de la fusión
    
    # Reversión
    can_revert = Column(Boolean, default=True)
    reverted_at = Column(DateTime(timezone=True))
    reverted_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Auditoría
    merged_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    merged_at = Column(DateTime(timezone=True), server_default=func.now())


class ContactPrivacyRequest(Base):
    """
    Solicitudes de privacidad (GDPR, etc.)
    """
    __tablename__ = 'contact_privacy_requests'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), nullable=False)
    
    # Tipo de solicitud
    request_type = Column(String(50), nullable=False)  # access, rectification, deletion, portability
    
    # Estado
    status = Column(String(50), nullable=False, default='pending')
    
    # Detalles
    request_details = Column(Text)
    response = Column(Text)
    
    # Verificación
    verification_method = Column(String(50))  # email, document, phone
    verification_completed = Column(Boolean, default=False)
    
    # Tiempo
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    deadline = Column(Date)  # Fecha límite legal
    
    # Auditoría
    processed_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))


# ===== FUNCIONES Y TRIGGERS =====

"""
-- Función para actualizar full_name automáticamente
CREATE OR REPLACE FUNCTION update_contact_full_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.full_name = CONCAT_WS(' ', 
        NEW.first_name, 
        NEW.middle_name, 
        NEW.last_name
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contact_full_name
BEFORE INSERT OR UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION update_contact_full_name();

-- Función para detectar duplicados potenciales
CREATE OR REPLACE FUNCTION check_contact_duplicates()
RETURNS TRIGGER AS $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM contacts
    WHERE id != NEW.id
    AND (
        (email IS NOT NULL AND email = NEW.email)
        OR (phone IS NOT NULL AND phone = NEW.phone)
        OR (mobile IS NOT NULL AND mobile = NEW.mobile)
        OR (
            LOWER(REPLACE(full_name, ' ', '')) = 
            LOWER(REPLACE(NEW.full_name, ' ', ''))
            AND date_of_birth = NEW.date_of_birth
        )
    );
    
    IF duplicate_count > 0 THEN
        NEW.is_duplicate = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_contact_duplicates
BEFORE INSERT OR UPDATE ON contacts
FOR EACH ROW
EXECUTE FUNCTION check_contact_duplicates();

-- Función para auditar exportaciones masivas
CREATE OR REPLACE FUNCTION audit_bulk_export()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.record_count > 100 THEN
        NEW.is_suspicious = TRUE;
        -- Aquí se podría enviar una notificación
    END IF;
    
    IF NEW.record_count > 1000 AND NEW.request_status = 'PENDING' THEN
        -- Requiere aprobación para exportaciones grandes
        NEW.request_status = 'PENDING';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_bulk_export
BEFORE INSERT ON contact_export_logs
FOR EACH ROW
EXECUTE FUNCTION audit_bulk_export();
"""