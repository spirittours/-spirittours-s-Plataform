"""
Enhanced Guide Management Models
Complete models for tour guides, certifications, rates, and assignments
"""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Date,
    Text, JSON, ForeignKey, Enum as SQLEnum, DECIMAL, Time,
    Table, UniqueConstraint, Index, CheckConstraint
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, date, time
from decimal import Decimal
from enum import Enum
import uuid

Base = declarative_base()


# ==================== ENUMS ====================

class GuideType(Enum):
    """Tipos de guías turísticos"""
    LICENSED_NATIONAL = "LICENSED_NATIONAL"  # Guía licenciado nacional
    LICENSED_LOCAL = "LICENSED_LOCAL"        # Guía licenciado local  
    TOUR_LEADER = "TOUR_LEADER"              # Guía acompañante/Tour leader
    SPECIALIZED = "SPECIALIZED"              # Guía especializado
    INTERPRETER = "INTERPRETER"              # Intérprete
    DRIVER_GUIDE = "DRIVER_GUIDE"           # Conductor-guía
    ASSISTANT = "ASSISTANT"                  # Asistente de guía


class GuideSpecializationType(Enum):
    """Especializaciones de guías"""
    ARCHAEOLOGY = "ARCHAEOLOGY"
    NATURE = "NATURE"
    ADVENTURE = "ADVENTURE"
    CULTURAL = "CULTURAL"
    HISTORICAL = "HISTORICAL"
    GASTRONOMIC = "GASTRONOMIC"
    RELIGIOUS = "RELIGIOUS"
    PHOTOGRAPHY = "PHOTOGRAPHY"
    BIRDWATCHING = "BIRDWATCHING"
    DIVING = "DIVING"
    TREKKING = "TREKKING"
    WINE = "WINE"


class CertificationType(Enum):
    """Tipos de certificaciones"""
    NATIONAL_LICENSE = "NATIONAL_LICENSE"
    LOCAL_LICENSE = "LOCAL_LICENSE"
    LANGUAGE = "LANGUAGE"
    FIRST_AID = "FIRST_AID"
    SPECIALIZED_TRAINING = "SPECIALIZED_TRAINING"
    SAFETY = "SAFETY"
    COVID_PROTOCOL = "COVID_PROTOCOL"


class GuidePaymentType(Enum):
    """Tipos de pago para guías"""
    PER_HOUR = "PER_HOUR"
    HALF_DAY = "HALF_DAY"
    PER_DAY = "PER_DAY"
    PER_WEEK = "PER_WEEK"
    PER_GROUP = "PER_GROUP"
    PER_PERSON = "PER_PERSON"
    FIXED_RATE = "FIXED_RATE"


class AssignmentStatus(Enum):
    """Estados de asignación"""
    PENDING = "PENDING"              # Pendiente de confirmación
    CONFIRMED = "CONFIRMED"          # Confirmado
    IN_PROGRESS = "IN_PROGRESS"      # En progreso
    COMPLETED = "COMPLETED"          # Completado
    CANCELLED = "CANCELLED"          # Cancelado
    NO_SHOW = "NO_SHOW"             # No se presentó


# ==================== TABLAS DE ASOCIACIÓN ====================

# Relación entre guías y idiomas
guide_languages = Table(
    'guide_languages',
    Base.metadata,
    Column('guide_id', String, ForeignKey('tour_guides.id')),
    Column('language_id', String, ForeignKey('guide_language_skills.id')),
    Column('proficiency_level', String),  # Native, Fluent, Intermediate, Basic
    Column('certified', Boolean, default=False)
)

# Relación entre guías y especializaciones
guide_specializations = Table(
    'guide_specializations',
    Base.metadata,
    Column('guide_id', String, ForeignKey('tour_guides.id')),
    Column('specialization_id', String, ForeignKey('guide_specialization_types.id')),
    Column('years_experience', Integer),
    Column('certification', String)
)


# ==================== MODELO PRINCIPAL DE GUÍA ====================

class TourGuide(Base):
    """
    Modelo completo para guías turísticos
    """
    __tablename__ = 'tour_guides'
    
    id = Column(String, primary_key=True, default=lambda: f"GUIDE-{uuid.uuid4().hex[:8].upper()}")
    
    # Información personal
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    full_name = Column(String(200), nullable=False)  # Computed: first_name + last_name
    date_of_birth = Column(Date)
    nationality = Column(String(100))
    
    # Información de contacto
    email = Column(String(150), nullable=False, unique=True, index=True)
    phone = Column(String(50), nullable=False)
    alternate_phone = Column(String(50))
    emergency_contact = Column(JSON)  # {name, relationship, phone}
    
    # Dirección
    address = Column(String(300))
    city = Column(String(100), index=True)
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    
    # Información profesional
    guide_type = Column(SQLEnum(GuideType), nullable=False, index=True)
    license_number = Column(String(100), unique=True, index=True)
    license_issued_by = Column(String(200))
    license_issue_date = Column(Date)
    license_expiry = Column(Date)
    
    # Experiencia y calificaciones
    years_experience = Column(Integer, default=0)
    bio = Column(Text)  # Biografía profesional
    languages = Column(JSON)  # Lista de idiomas hablados
    specializations = Column(JSON)  # Lista de especializaciones
    
    # Información bancaria y fiscal
    tax_id = Column(String(50))
    bank_name = Column(String(100))
    bank_account = Column(String(100))
    bank_routing = Column(String(50))
    payment_method_preference = Column(String(50))  # Transfer, Check, Cash
    
    # Documentación
    photo_url = Column(String(500))
    id_document_url = Column(String(500))
    license_document_url = Column(String(500))
    insurance_policy_number = Column(String(100))
    insurance_expiry = Column(Date)
    
    # Performance y ratings
    rating = Column(Float, default=5.0)
    total_reviews = Column(Integer, default=0)
    total_tours = Column(Integer, default=0)
    total_hours_worked = Column(Float, default=0)
    punctuality_score = Column(Float, default=100.0)
    
    # Preferencias de trabajo
    max_group_size = Column(Integer)
    preferred_tour_types = Column(JSON)
    unavailable_dates = Column(JSON)  # Lista de fechas no disponibles
    working_radius_km = Column(Integer)  # Radio de trabajo desde ciudad base
    has_vehicle = Column(Boolean, default=False)
    vehicle_capacity = Column(Integer)
    
    # Control y estado
    is_active = Column(Boolean, default=True, index=True)
    is_verified = Column(Boolean, default=False)
    verification_date = Column(DateTime)
    last_training_date = Column(Date)
    next_training_due = Column(Date)
    
    # Auditoría
    created_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_active = Column(DateTime)
    
    # Relaciones
    certifications = relationship("GuideCertification", back_populates="guide", cascade="all, delete-orphan")
    rates = relationship("GuideRate", back_populates="guide", cascade="all, delete-orphan")
    availability = relationship("GuideAvailability", back_populates="guide", cascade="all, delete-orphan")
    assignments = relationship("GuideAssignment", back_populates="guide")
    reviews = relationship("GuideReview", back_populates="guide")
    emergency_contacts = relationship("GuideEmergencyContact", back_populates="guide")
    
    # Índices y constraints
    __table_args__ = (
        Index('idx_guide_type_city', 'guide_type', 'city'),
        Index('idx_guide_active_rating', 'is_active', 'rating'),
        CheckConstraint('rating >= 0 AND rating <= 5', name='check_rating_range'),
    )
    
    def __repr__(self):
        return f"<TourGuide {self.full_name} ({self.guide_type.value})>"


# ==================== CERTIFICACIONES ====================

class GuideCertification(Base):
    """
    Certificaciones y licencias del guía
    """
    __tablename__ = 'guide_certifications'
    
    id = Column(String, primary_key=True, default=lambda: f"CERT-{uuid.uuid4().hex[:8].upper()}")
    guide_id = Column(String, ForeignKey('tour_guides.id'), nullable=False)
    
    certification_type = Column(SQLEnum(CertificationType), nullable=False)
    certification_name = Column(String(200), nullable=False)
    issuing_organization = Column(String(200))
    certification_number = Column(String(100))
    
    issue_date = Column(Date, nullable=False)
    expiry_date = Column(Date)
    is_expired = Column(Boolean, default=False)
    
    document_url = Column(String(500))
    verification_status = Column(String(50))  # Pending, Verified, Rejected
    verified_by = Column(String(100))
    verified_at = Column(DateTime)
    
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relación
    guide = relationship("TourGuide", back_populates="certifications")
    
    __table_args__ = (
        Index('idx_cert_guide_type', 'guide_id', 'certification_type'),
        UniqueConstraint('guide_id', 'certification_number', name='unique_guide_cert_number'),
    )


# ==================== IDIOMAS ====================

class GuideLanguage(Base):
    """
    Habilidades lingüísticas del guía
    """
    __tablename__ = 'guide_language_skills'
    
    id = Column(String, primary_key=True, default=lambda: f"LANG-{uuid.uuid4().hex[:8].upper()}")
    guide_id = Column(String, ForeignKey('tour_guides.id'), nullable=False)
    
    language_code = Column(String(10), nullable=False)  # ISO 639-1
    language_name = Column(String(100), nullable=False)
    proficiency_level = Column(String(50))  # Native, Fluent, Professional, Conversational, Basic
    
    is_certified = Column(Boolean, default=False)
    certification_name = Column(String(200))
    certification_score = Column(String(50))
    certification_date = Column(Date)
    
    # Habilidades específicas
    can_interpret = Column(Boolean, default=True)
    can_translate_documents = Column(Boolean, default=False)
    specialized_vocabulary = Column(JSON)  # Technical, Medical, Legal, etc.
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('guide_id', 'language_code', name='unique_guide_language'),
    )


# ==================== ESPECIALIZACIONES ====================

class GuideSpecialization(Base):
    """
    Especializaciones y expertise del guía
    """
    __tablename__ = 'guide_specialization_types'
    
    id = Column(String, primary_key=True, default=lambda: f"SPEC-{uuid.uuid4().hex[:8].upper()}")
    guide_id = Column(String, ForeignKey('tour_guides.id'), nullable=False)
    
    specialization_type = Column(SQLEnum(GuideSpecializationType), nullable=False)
    specialization_name = Column(String(200))
    description = Column(Text)
    
    years_experience = Column(Integer, default=0)
    certification = Column(String(200))
    certification_date = Column(Date)
    
    # Conocimiento específico
    specific_knowledge = Column(JSON)  # Lista de temas específicos
    notable_sites = Column(JSON)  # Sitios o lugares de expertise
    
    is_primary = Column(Boolean, default=False)  # Especialización principal
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('guide_id', 'specialization_type', name='unique_guide_specialization'),
    )


# ==================== TARIFAS ====================

class GuideRate(Base):
    """
    Tarifas y precios del guía
    """
    __tablename__ = 'guide_rates'
    
    id = Column(String, primary_key=True, default=lambda: f"RATE-{uuid.uuid4().hex[:8].upper()}")
    guide_id = Column(String, ForeignKey('tour_guides.id'), nullable=False)
    
    payment_type = Column(SQLEnum(GuidePaymentType), nullable=False)
    amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(3), default='USD')
    
    # Aplicabilidad
    min_hours = Column(Float, default=4)  # Mínimo de horas para esta tarifa
    max_hours = Column(Float)  # Máximo de horas (para tarifas por día)
    min_group_size = Column(Integer, default=1)
    max_group_size = Column(Integer)
    
    # Condiciones especiales
    applies_to_languages = Column(JSON)  # Lista de idiomas para esta tarifa
    applies_to_specializations = Column(JSON)  # Especializaciones aplicables
    applies_to_tour_types = Column(JSON)  # Tipos de tour aplicables
    
    # Recargos y descuentos
    weekend_surcharge_percent = Column(Float, default=0)
    holiday_surcharge_percent = Column(Float, default=0)
    night_surcharge_percent = Column(Float, default=0)  # Tours nocturnos
    high_season_surcharge_percent = Column(Float, default=0)
    
    # Validez
    valid_from = Column(Date, default=date.today)
    valid_until = Column(Date)
    is_active = Column(Boolean, default=True, index=True)
    
    # Notas
    notes = Column(Text)
    includes = Column(JSON)  # Qué incluye esta tarifa
    excludes = Column(JSON)  # Qué no incluye
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relación
    guide = relationship("TourGuide", back_populates="rates")
    
    __table_args__ = (
        Index('idx_rate_guide_active', 'guide_id', 'is_active'),
        Index('idx_rate_validity', 'valid_from', 'valid_until'),
        CheckConstraint('amount > 0', name='check_positive_amount'),
    )


# ==================== DISPONIBILIDAD ====================

class GuideAvailability(Base):
    """
    Calendario de disponibilidad del guía
    """
    __tablename__ = 'guide_availability'
    
    id = Column(String, primary_key=True, default=lambda: f"AVAIL-{uuid.uuid4().hex[:8].upper()}")
    guide_id = Column(String, ForeignKey('tour_guides.id'), nullable=False)
    
    date = Column(Date, nullable=False, index=True)
    is_available = Column(Boolean, default=True)
    
    # Horarios específicos
    available_from = Column(Time)
    available_until = Column(Time)
    available_hours = Column(Float, default=8)
    
    # Restricciones
    max_hours = Column(Float, default=10)
    preferred_start_time = Column(Time)
    blackout_periods = Column(JSON)  # Períodos no disponibles [{from: time, to: time}]
    
    # Ubicación
    available_in_city = Column(String(100))
    available_for_travel = Column(Boolean, default=True)
    max_travel_distance_km = Column(Integer)
    
    # Notas y razones
    unavailability_reason = Column(String(200))  # Vacation, Training, Personal, etc.
    notes = Column(Text)
    
    # Reservas del día
    hours_booked = Column(Float, default=0)
    assignments_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relación
    guide = relationship("TourGuide", back_populates="availability")
    
    __table_args__ = (
        UniqueConstraint('guide_id', 'date', name='unique_guide_date'),
        Index('idx_availability_date', 'date', 'is_available'),
    )


# ==================== ASIGNACIONES ====================

class GuideAssignment(Base):
    """
    Asignaciones de guías a tours/paquetes
    """
    __tablename__ = 'guide_assignments'
    
    id = Column(String, primary_key=True, default=lambda: f"ASSIGN-{uuid.uuid4().hex[:8].upper()}")
    guide_id = Column(String, ForeignKey('tour_guides.id'), nullable=False)
    package_id = Column(String, ForeignKey('package_quotations.id'))
    itinerary_day_id = Column(String, ForeignKey('itinerary_days.id'))
    
    # Detalles de la asignación
    assignment_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time)
    end_time = Column(Time)
    hours = Column(Float, nullable=False)
    
    # Tipo de servicio
    service_type = Column(String(50))  # FULL_DAY, HALF_DAY, HOURLY, TRANSFER
    tour_type = Column(String(100))
    group_size = Column(Integer)
    
    # Requerimientos
    languages_required = Column(JSON)  # Idiomas requeridos para el tour
    specialization_required = Column(String(100))
    special_requirements = Column(Text)
    
    # Ubicación
    meeting_point = Column(String(300))
    meeting_coordinates = Column(JSON)  # {lat, lng}
    tour_route = Column(JSON)  # Lista de lugares a visitar
    ending_point = Column(String(300))
    
    # Compensación
    payment_type = Column(SQLEnum(GuidePaymentType))
    rate_applied = Column(DECIMAL(10, 2))
    hours_calculated = Column(Float)
    cost = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(3), default='USD')
    
    # Gastos adicionales
    transportation_provided = Column(Boolean, default=False)
    meals_provided = Column(Boolean, default=False)
    expenses_reimbursable = Column(DECIMAL(10, 2), default=0)
    
    # Estado
    status = Column(SQLEnum(AssignmentStatus), default=AssignmentStatus.PENDING, index=True)
    confirmed_by_guide = Column(Boolean, default=False)
    confirmed_at = Column(DateTime)
    
    # Ejecución
    actual_start_time = Column(Time)
    actual_end_time = Column(Time)
    actual_hours = Column(Float)
    
    # Evaluación post-tour
    client_rating = Column(Float)
    client_feedback = Column(Text)
    guide_feedback = Column(Text)
    incidents = Column(JSON)
    
    # Pago
    payment_status = Column(String(50))  # Pending, Processing, Paid
    payment_date = Column(Date)
    payment_reference = Column(String(100))
    
    # Notificaciones
    notification_sent = Column(Boolean, default=False)
    reminder_sent = Column(Boolean, default=False)
    
    # Auditoría
    created_by = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    cancelled_at = Column(DateTime)
    cancelled_by = Column(String(100))
    cancellation_reason = Column(Text)
    
    # Relación
    guide = relationship("TourGuide", back_populates="assignments")
    
    __table_args__ = (
        Index('idx_assignment_guide_date', 'guide_id', 'assignment_date'),
        Index('idx_assignment_status', 'status', 'assignment_date'),
        CheckConstraint('hours > 0', name='check_positive_hours'),
        CheckConstraint('cost >= 0', name='check_non_negative_cost'),
    )


# ==================== EVALUACIONES ====================

class GuideReview(Base):
    """
    Evaluaciones y reseñas de guías
    """
    __tablename__ = 'guide_reviews'
    
    id = Column(String, primary_key=True, default=lambda: f"REVIEW-{uuid.uuid4().hex[:8].upper()}")
    guide_id = Column(String, ForeignKey('tour_guides.id'), nullable=False)
    assignment_id = Column(String, ForeignKey('guide_assignments.id'))
    
    # Evaluador
    reviewer_type = Column(String(50))  # Client, Agency, Peer
    reviewer_id = Column(String(100))
    reviewer_name = Column(String(200))
    
    # Calificaciones (1-5)
    overall_rating = Column(Float, nullable=False)
    punctuality_rating = Column(Float)
    knowledge_rating = Column(Float)
    communication_rating = Column(Float)
    professionalism_rating = Column(Float)
    friendliness_rating = Column(Float)
    
    # Feedback
    review_text = Column(Text)
    highlights = Column(JSON)  # Aspectos positivos
    improvements = Column(JSON)  # Áreas de mejora
    
    # Respuesta del guía
    guide_response = Column(Text)
    guide_response_date = Column(DateTime)
    
    # Control
    is_verified = Column(Boolean, default=False)
    is_visible = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relación
    guide = relationship("TourGuide", back_populates="reviews")
    
    __table_args__ = (
        Index('idx_review_guide_rating', 'guide_id', 'overall_rating'),
        CheckConstraint('overall_rating >= 1 AND overall_rating <= 5', name='check_review_rating'),
    )


# ==================== CONTACTOS DE EMERGENCIA ====================

class GuideEmergencyContact(Base):
    """
    Contactos de emergencia del guía
    """
    __tablename__ = 'guide_emergency_contacts'
    
    id = Column(String, primary_key=True, default=lambda: f"EMRG-{uuid.uuid4().hex[:8].upper()}")
    guide_id = Column(String, ForeignKey('tour_guides.id'), nullable=False)
    
    contact_name = Column(String(200), nullable=False)
    relationship = Column(String(100))
    phone_primary = Column(String(50), nullable=False)
    phone_secondary = Column(String(50))
    email = Column(String(150))
    address = Column(String(300))
    
    is_primary = Column(Boolean, default=False)
    speaks_languages = Column(JSON)
    
    medical_notes = Column(Text)  # Alergias, condiciones médicas del guía
    blood_type = Column(String(10))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relación
    guide = relationship("TourGuide", back_populates="emergency_contacts")
    
    __table_args__ = (
        Index('idx_emergency_guide', 'guide_id', 'is_primary'),
    )