"""
Contact Management System Models
Sistema completo de gestión de contactos con seguridad y sincronización
"""

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text, JSON, 
    ForeignKey, DECIMAL, Enum as SQLEnum, Index, UniqueConstraint,
    CheckConstraint, Table, Float
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from backend.database import Base
import uuid
import enum
from datetime import datetime
import re
from typing import Optional, Dict, List

# ===== ENUMS =====

class ContactType(enum.Enum):
    """Tipos de contacto"""
    CUSTOMER = "customer"
    PASSENGER = "passenger"
    AGENCY = "agency"
    SUPPLIER = "supplier"
    EMPLOYEE = "employee"
    AFFILIATE = "affiliate"
    PARTNER = "partner"
    LEAD = "lead"
    VIP = "vip"
    BLACKLIST = "blacklist"
    OTHER = "other"

class ContactSource(enum.Enum):
    """Origen del contacto"""
    MANUAL = "manual"
    WEBSITE = "website"
    BOOKING = "booking"
    GOOGLE_SYNC = "google_sync"
    OUTLOOK_SYNC = "outlook_sync"
    ICLOUD_SYNC = "icloud_sync"
    WHATSAPP = "whatsapp"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    EMAIL_IMPORT = "email_import"
    CSV_IMPORT = "csv_import"
    API = "api"
    REFERRAL = "referral"
    SHARED = "shared"

class ContactVisibility(enum.Enum):
    """Niveles de visibilidad del contacto"""
    PRIVATE = "private"  # Solo el creador
    TEAM = "team"  # Equipo del creador
    DEPARTMENT = "department"  # Departamento
    COMPANY = "company"  # Toda la empresa
    PUBLIC = "public"  # Público (clientes pueden ver)

class SyncStatus(enum.Enum):
    """Estado de sincronización"""
    PENDING = "pending"
    SYNCING = "syncing"
    COMPLETED = "completed"
    FAILED = "failed"
    CONFLICT = "conflict"

class SharePermission(enum.Enum):
    """Permisos de compartición"""
    VIEW = "view"
    EDIT = "edit"
    SHARE = "share"
    DELETE = "delete"
    FULL = "full"

class DataSensitivity(enum.Enum):
    """Nivel de sensibilidad de datos"""
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"
    TOP_SECRET = "top_secret"

# ===== TABLAS DE ASOCIACIÓN =====

contact_groups = Table(
    'contact_groups_association',
    Base.metadata,
    Column('contact_id', UUID(as_uuid=True), ForeignKey('contacts.id')),
    Column('group_id', UUID(as_uuid=True), ForeignKey('contact_groups.id')),
    Column('added_at', DateTime(timezone=True), default=func.now()),
    Column('added_by', UUID(as_uuid=True), ForeignKey('users.id'))
)

contact_tags = Table(
    'contact_tags_association',
    Base.metadata,
    Column('contact_id', UUID(as_uuid=True), ForeignKey('contacts.id')),
    Column('tag_id', UUID(as_uuid=True), ForeignKey('contact_tags.id')),
    Column('tagged_at', DateTime(timezone=True), default=func.now()),
    Column('tagged_by', UUID(as_uuid=True), ForeignKey('users.id'))
)

# ===== MODELOS PRINCIPALES =====

class Contact(Base):
    """
    Modelo principal de contactos con seguridad avanzada
    """
    __tablename__ = 'contacts'
    
    # Identificadores
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id = Column(String(100), unique=True, index=True)
    legacy_id = Column(String(100), index=True)  # ID del sistema anterior
    
    # Información básica
    type = Column(SQLEnum(ContactType), nullable=False, index=True)
    source = Column(SQLEnum(ContactSource), default=ContactSource.MANUAL)
    
    # Datos personales
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    full_name = Column(String(200), index=True)  # Computed
    display_name = Column(String(200))
    nickname = Column(String(50))
    salutation = Column(String(20))  # Mr., Mrs., Dr., etc.
    
    # Información de contacto
    email = Column(String(255), index=True)
    email_secondary = Column(String(255))
    phone = Column(String(50), index=True)
    phone_secondary = Column(String(50))
    mobile = Column(String(50), index=True)
    whatsapp = Column(String(50))
    telegram = Column(String(50))
    fax = Column(String(50))
    
    # Redes sociales
    facebook = Column(String(255))
    instagram = Column(String(255))
    twitter = Column(String(255))
    linkedin = Column(String(255))
    tiktok = Column(String(255))
    youtube = Column(String(255))
    
    # Información empresarial
    company = Column(String(255), index=True)
    job_title = Column(String(100))
    department = Column(String(100))
    industry = Column(String(100))
    website = Column(String(255))
    tax_id = Column(String(50))  # RUC, DNI, etc.
    
    # Dirección principal
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100), index=True)
    postal_code = Column(String(20))
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Dirección secundaria
    billing_address_line1 = Column(String(255))
    billing_address_line2 = Column(String(255))
    billing_city = Column(String(100))
    billing_state = Column(String(100))
    billing_country = Column(String(100))
    billing_postal_code = Column(String(20))
    
    # Información personal
    birthdate = Column(DateTime)
    anniversary = Column(DateTime)
    gender = Column(String(20))
    nationality = Column(String(100))
    language_preference = Column(String(10), default='es')
    timezone = Column(String(50))
    
    # Información de viaje
    passport_number = Column(String(50))  # Encriptado
    passport_expiry = Column(DateTime)
    passport_country = Column(String(100))
    frequent_flyer_numbers = Column(JSON)  # {"airline": "number"}
    dietary_restrictions = Column(Text)
    medical_conditions = Column(Text)  # Encriptado
    emergency_contact = Column(JSON)  # {"name": "", "phone": "", "relationship": ""}
    
    # Preferencias
    travel_preferences = Column(JSON)  # {"seat": "window", "meal": "vegetarian", etc.}
    communication_preferences = Column(JSON)  # {"email": true, "sms": false, etc.}
    marketing_consent = Column(Boolean, default=False)
    newsletter_subscription = Column(Boolean, default=False)
    
    # Seguridad y privacidad
    visibility = Column(SQLEnum(ContactVisibility), default=ContactVisibility.COMPANY)
    data_sensitivity = Column(SQLEnum(DataSensitivity), default=DataSensitivity.INTERNAL)
    is_verified = Column(Boolean, default=False)
    verification_date = Column(DateTime(timezone=True))
    verification_method = Column(String(50))
    
    # Control de acceso
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    can_export = Column(Boolean, default=False)  # Permiso especial para exportar
    is_protected = Column(Boolean, default=False)  # No se puede eliminar
    is_blacklisted = Column(Boolean, default=False)
    blacklist_reason = Column(Text)
    
    # Métricas y scoring
    quality_score = Column(Integer, default=0)  # 0-100
    engagement_score = Column(Integer, default=0)  # 0-100
    lifetime_value = Column(DECIMAL(10, 2), default=0)
    total_bookings = Column(Integer, default=0)
    last_interaction = Column(DateTime(timezone=True))
    last_booking = Column(DateTime(timezone=True))
    
    # Sincronización
    google_contact_id = Column(String(255), unique=True)
    outlook_contact_id = Column(String(255), unique=True)
    icloud_contact_id = Column(String(255), unique=True)
    sync_enabled = Column(Boolean, default=False)
    last_sync = Column(DateTime(timezone=True))
    sync_status = Column(SQLEnum(SyncStatus))
    sync_errors = Column(JSON)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))  # Soft delete
    deleted_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Campos personalizados
    custom_fields = Column(JSON)  # {"field1": "value1", "field2": "value2"}
    notes = Column(Text)
    internal_notes = Column(Text)  # Solo visible para staff
    
    # Relaciones
    owner = relationship("User", foreign_keys=[owner_id], backref="owned_contacts")
    creator = relationship("User", foreign_keys=[created_by])
    groups = relationship("ContactGroup", secondary=contact_groups, back_populates="contacts")
    tags = relationship("ContactTag", secondary=contact_tags, back_populates="contacts")
    shares = relationship("ContactShare", back_populates="contact", cascade="all, delete-orphan")
    activities = relationship("ContactActivity", back_populates="contact", cascade="all, delete-orphan")
    imports = relationship("ContactImport", back_populates="contacts")
    exports = relationship("ContactExport", back_populates="contacts")
    
    # Índices compuestos
    __table_args__ = (
        Index('idx_contact_search', 'full_name', 'email', 'phone', 'company'),
        Index('idx_contact_type_visibility', 'type', 'visibility'),
        Index('idx_contact_owner_type', 'owner_id', 'type'),
        Index('idx_contact_sync', 'sync_enabled', 'sync_status'),
    )
    
    @validates('email')
    def validate_email(self, key, email):
        if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValueError(f"Invalid email format: {email}")
        return email.lower() if email else None
    
    @validates('phone', 'mobile', 'whatsapp')
    def validate_phone(self, key, phone):
        if phone:
            # Remove all non-numeric characters
            cleaned = re.sub(r'\D', '', phone)
            if len(cleaned) < 7 or len(cleaned) > 15:
                raise ValueError(f"Invalid phone number: {phone}")
            return cleaned
        return None
    
    def __repr__(self):
        return f"<Contact {self.full_name} ({self.type.value})>"

class ContactGroup(Base):
    """
    Grupos de contactos para organización
    """
    __tablename__ = 'contact_groups'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(7))  # Hex color
    icon = Column(String(50))
    
    # Control de acceso
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    visibility = Column(SQLEnum(ContactVisibility), default=ContactVisibility.PRIVATE)
    is_system = Column(Boolean, default=False)  # Grupos del sistema
    is_smart = Column(Boolean, default=False)  # Grupo dinámico con filtros
    smart_filters = Column(JSON)  # Filtros para grupos inteligentes
    
    # Estadísticas
    contact_count = Column(Integer, default=0)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    owner = relationship("User", backref="contact_groups")
    contacts = relationship("Contact", secondary=contact_groups, back_populates="groups")
    
    __table_args__ = (
        UniqueConstraint('name', 'owner_id', name='uq_group_name_owner'),
    )

class ContactTag(Base):
    """
    Etiquetas para categorizar contactos
    """
    __tablename__ = 'contact_tags'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False, unique=True)
    color = Column(String(7))  # Hex color
    category = Column(String(50))
    
    # Estadísticas
    usage_count = Column(Integer, default=0)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Relaciones
    contacts = relationship("Contact", secondary=contact_tags, back_populates="tags")

class ContactShare(Base):
    """
    Compartición de contactos entre usuarios
    """
    __tablename__ = 'contact_shares'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), nullable=False)
    
    # Compartir con usuario o grupo
    shared_with_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    shared_with_group_id = Column(UUID(as_uuid=True), ForeignKey('user_groups.id'))
    shared_with_email = Column(String(255))  # Para compartir con externos
    
    # Permisos
    permission = Column(SQLEnum(SharePermission), default=SharePermission.VIEW)
    can_reshare = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True))
    
    # Token para compartición externa
    share_token = Column(String(100), unique=True, index=True)
    token_used = Column(Boolean, default=False)
    
    # Mensaje opcional
    message = Column(Text)
    
    # Auditoría
    shared_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    shared_at = Column(DateTime(timezone=True), server_default=func.now())
    accessed_at = Column(DateTime(timezone=True))
    access_count = Column(Integer, default=0)
    
    # Relaciones
    contact = relationship("Contact", back_populates="shares")
    sharer = relationship("User", foreign_keys=[shared_by])
    recipient_user = relationship("User", foreign_keys=[shared_with_user_id])
    
    __table_args__ = (
        CheckConstraint(
            "(shared_with_user_id IS NOT NULL) OR (shared_with_group_id IS NOT NULL) OR (shared_with_email IS NOT NULL)",
            name="check_share_recipient"
        ),
    )

class ContactActivity(Base):
    """
    Registro de actividades sobre contactos
    """
    __tablename__ = 'contact_activities'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), nullable=False)
    
    # Tipo de actividad
    activity_type = Column(String(50), nullable=False)  # view, edit, export, share, call, email, etc.
    activity_detail = Column(JSON)
    
    # Contexto
    ip_address = Column(String(45))
    user_agent = Column(String(255))
    location = Column(String(255))
    
    # Auditoría
    performed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    performed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    contact = relationship("Contact", back_populates="activities")
    user = relationship("User")
    
    __table_args__ = (
        Index('idx_activity_contact_date', 'contact_id', 'performed_at'),
        Index('idx_activity_user_type', 'performed_by', 'activity_type'),
    )

class ContactImport(Base):
    """
    Registro de importaciones de contactos
    """
    __tablename__ = 'contact_imports'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Información de importación
    source = Column(SQLEnum(ContactSource), nullable=False)
    source_details = Column(JSON)  # Google account, file name, etc.
    
    # Estadísticas
    total_contacts = Column(Integer, default=0)
    imported_contacts = Column(Integer, default=0)
    updated_contacts = Column(Integer, default=0)
    failed_contacts = Column(Integer, default=0)
    duplicate_contacts = Column(Integer, default=0)
    
    # Estado
    status = Column(SQLEnum(SyncStatus), default=SyncStatus.PENDING)
    error_log = Column(JSON)
    
    # Configuración
    import_settings = Column(JSON)  # mapping, duplicate handling, etc.
    auto_sync = Column(Boolean, default=False)
    sync_frequency = Column(String(50))  # daily, weekly, monthly
    
    # Auditoría
    imported_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Relaciones
    user = relationship("User")
    contacts = relationship("Contact", back_populates="imports")

class ContactExport(Base):
    """
    Registro y control de exportaciones de contactos
    """
    __tablename__ = 'contact_exports'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Información de exportación
    export_format = Column(String(20))  # csv, xlsx, json, vcard
    export_filters = Column(JSON)  # Filtros aplicados
    
    # Seguridad
    contact_count = Column(Integer, nullable=False)
    contact_ids = Column(JSON)  # IDs exportados (para auditoría)
    fields_exported = Column(JSON)  # Campos incluidos
    
    # Razón y aprobación
    export_reason = Column(Text, nullable=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    approval_date = Column(DateTime(timezone=True))
    approval_notes = Column(Text)
    
    # Archivo
    file_path = Column(String(500))
    file_size = Column(Integer)
    file_hash = Column(String(64))  # SHA256
    download_count = Column(Integer, default=0)
    expires_at = Column(DateTime(timezone=True))
    
    # Auditoría
    exported_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    exported_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String(45))
    
    # Relaciones
    exporter = relationship("User", foreign_keys=[exported_by])
    approver = relationship("User", foreign_keys=[approved_by])
    contacts = relationship("Contact", back_populates="exports")
    
    __table_args__ = (
        Index('idx_export_user_date', 'exported_by', 'exported_at'),
    )

class ContactSyncSettings(Base):
    """
    Configuración de sincronización por usuario
    """
    __tablename__ = 'contact_sync_settings'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), unique=True, nullable=False)
    
    # Google Contacts
    google_sync_enabled = Column(Boolean, default=False)
    google_account = Column(String(255))
    google_refresh_token = Column(Text)  # Encriptado
    google_sync_groups = Column(JSON)  # Grupos a sincronizar
    google_last_sync = Column(DateTime(timezone=True))
    
    # Outlook/Exchange
    outlook_sync_enabled = Column(Boolean, default=False)
    outlook_account = Column(String(255))
    outlook_refresh_token = Column(Text)  # Encriptado
    outlook_sync_folders = Column(JSON)
    outlook_last_sync = Column(DateTime(timezone=True))
    
    # iCloud
    icloud_sync_enabled = Column(Boolean, default=False)
    icloud_account = Column(String(255))
    icloud_app_password = Column(Text)  # Encriptado
    icloud_last_sync = Column(DateTime(timezone=True))
    
    # WhatsApp Business
    whatsapp_sync_enabled = Column(Boolean, default=False)
    whatsapp_business_id = Column(String(255))
    whatsapp_access_token = Column(Text)  # Encriptado
    
    # Configuración general
    sync_direction = Column(String(20), default='bidirectional')  # import, export, bidirectional
    conflict_resolution = Column(String(20), default='newest')  # newest, oldest, manual
    sync_frequency = Column(String(20), default='daily')
    auto_merge_duplicates = Column(Boolean, default=False)
    
    # Filtros
    sync_only_verified = Column(Boolean, default=False)
    sync_types = Column(JSON)  # Lista de ContactType a sincronizar
    exclude_blacklisted = Column(Boolean, default=True)
    
    # Auditoría
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    user = relationship("User", backref="contact_sync_settings")

class ContactDuplicateCandidate(Base):
    """
    Candidatos a duplicados detectados por el sistema
    """
    __tablename__ = 'contact_duplicate_candidates'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Contactos potencialmente duplicados
    contact1_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), nullable=False)
    contact2_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'), nullable=False)
    
    # Análisis
    similarity_score = Column(Float, nullable=False)  # 0.0 - 1.0
    matching_fields = Column(JSON)  # Campos que coinciden
    confidence_level = Column(String(20))  # high, medium, low
    
    # Estado
    status = Column(String(20), default='pending')  # pending, merged, rejected, ignored
    merged_to_id = Column(UUID(as_uuid=True), ForeignKey('contacts.id'))
    
    # Decisión
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    reviewed_at = Column(DateTime(timezone=True))
    review_notes = Column(Text)
    
    # Auditoría
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relaciones
    contact1 = relationship("Contact", foreign_keys=[contact1_id])
    contact2 = relationship("Contact", foreign_keys=[contact2_id])
    merged_to = relationship("Contact", foreign_keys=[merged_to_id])
    reviewer = relationship("User")
    
    __table_args__ = (
        UniqueConstraint('contact1_id', 'contact2_id', name='uq_duplicate_pair'),
        Index('idx_duplicate_status', 'status', 'confidence_level'),
    )

class ContactPermission(Base):
    """
    Permisos especiales para acceso a contactos
    """
    __tablename__ = 'contact_permissions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Usuario o rol con permiso especial
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id'))
    
    # Permisos
    can_view_all = Column(Boolean, default=False)
    can_export_all = Column(Boolean, default=False)
    can_delete_any = Column(Boolean, default=False)
    can_bypass_restrictions = Column(Boolean, default=False)
    max_export_limit = Column(Integer)  # Límite de contactos por exportación
    
    # Restricciones
    restricted_types = Column(JSON)  # Tipos de contacto restringidos
    restricted_fields = Column(JSON)  # Campos que no puede ver/exportar
    
    # Vigencia
    valid_from = Column(DateTime(timezone=True), default=func.now())
    valid_until = Column(DateTime(timezone=True))
    
    # Auditoría
    granted_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    granted_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    revoked_at = Column(DateTime(timezone=True))
    reason = Column(Text)
    
    # Relaciones
    user = relationship("User", foreign_keys=[user_id])
    role = relationship("Role")
    granter = relationship("User", foreign_keys=[granted_by])
    revoker = relationship("User", foreign_keys=[revoked_by])
    
    __table_args__ = (
        CheckConstraint(
            "(user_id IS NOT NULL) OR (role_id IS NOT NULL)",
            name="check_permission_target"
        ),
    )