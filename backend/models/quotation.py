"""
Database models for Group Quotation System
PostgreSQL with SQLAlchemy ORM
"""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, 
    Text, JSON, ForeignKey, Enum as SQLEnum, DECIMAL,
    Table, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from enum import Enum
import uuid

Base = declarative_base()


# Enums
class QuotationStatus(Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    IN_PROGRESS = "IN_PROGRESS"
    RESPONSES_RECEIVED = "RESPONSES_RECEIVED"
    UNDER_REVIEW = "UNDER_REVIEW"
    AWARDED = "AWARDED"
    DEPOSIT_PAID = "DEPOSIT_PAID"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class ResponseStatus(Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UPDATED = "UPDATED"
    SELECTED = "SELECTED"
    NOT_SELECTED = "NOT_SELECTED"
    WITHDRAWN = "WITHDRAWN"


class PaymentStatus(Enum):
    PENDING = "PENDING"
    DEPOSIT_REQUIRED = "DEPOSIT_REQUIRED"
    DEPOSIT_RECEIVED = "DEPOSIT_RECEIVED"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    FULLY_PAID = "FULLY_PAID"
    REFUNDED = "REFUNDED"


class MealPlan(Enum):
    RO = "RO"  # Room Only
    BB = "BB"  # Bed & Breakfast
    HB = "HB"  # Half Board
    FB = "FB"  # Full Board
    AI = "AI"  # All Inclusive


# Association table for many-to-many relationship between quotations and hotels
quotation_hotels = Table(
    'quotation_hotels',
    Base.metadata,
    Column('quotation_id', String, ForeignKey('group_quotations.id')),
    Column('hotel_id', String, ForeignKey('hotel_providers.id')),
    Column('invited_at', DateTime, default=datetime.utcnow),
    Column('invitation_status', String, default='pending')
)


class GroupQuotation(Base):
    """
    Modelo principal para cotizaciones grupales
    """
    __tablename__ = 'group_quotations'
    
    # Identificación
    id = Column(String, primary_key=True, default=lambda: f"GQ-{uuid.uuid4().hex[:8].upper()}")
    company_id = Column(String, ForeignKey('companies.id'), nullable=False)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    
    # Información básica
    title = Column(String(200), nullable=False)
    description = Column(Text)
    reference_number = Column(String(50), unique=True)
    
    # Detalles del viaje
    destination = Column(String(200), nullable=False)
    check_in_date = Column(DateTime, nullable=False)
    check_out_date = Column(DateTime, nullable=False)
    num_nights = Column(Integer)
    num_rooms = Column(Integer, nullable=False)
    num_guests = Column(Integer, nullable=False)
    num_adults = Column(Integer)
    num_children = Column(Integer)
    children_ages = Column(JSON)  # Array de edades
    
    # Configuración de habitaciones
    room_types = Column(JSON)  # ['single', 'double', 'triple', 'suite']
    room_configuration = Column(JSON)  # Detalle por tipo de habitación
    meal_plan = Column(SQLEnum(MealPlan), default=MealPlan.BB)
    
    # Requerimientos especiales
    special_requirements = Column(JSON)  # Array de requerimientos
    accessibility_needs = Column(JSON)
    preferred_floor = Column(String(50))
    smoking_preference = Column(String(20))
    
    # Presupuesto
    budget_min = Column(DECIMAL(10, 2))
    budget_max = Column(DECIMAL(10, 2))
    currency = Column(String(3), default='USD')
    price_includes_taxes = Column(Boolean, default=True)
    
    # Configuración de depósito
    deposit_config = Column(JSON)  # {required, amount, percentage, received, payment_date}
    deposit_deadline = Column(DateTime)
    
    # Configuración de selección de hoteles
    hotel_selection = Column(JSON)  # {mode, selected_hotels, criteria}
    auto_award = Column(Boolean, default=False)
    auto_award_criteria = Column(JSON)
    
    # Configuración de privacidad
    privacy_settings = Column(JSON)  # {hide_competitor_prices, show_own_ranking, etc}
    
    # Deadlines y extensiones
    deadline = Column(DateTime, nullable=False)
    deadline_extensions_used = Column(Integer, default=0)
    max_extensions_allowed = Column(Integer, default=2)
    extension_history = Column(JSON)  # Array de extensiones
    
    # Estados y fechas
    status = Column(SQLEnum(QuotationStatus), default=QuotationStatus.DRAFT)
    payment_status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING)
    selected_response_id = Column(String, ForeignKey('quotation_responses.id'))
    selection_mode = Column(String(20))  # 'manual' o 'automatic'
    selected_at = Column(DateTime)
    
    # Scoring y análisis
    scoring_weights = Column(JSON)  # Pesos para scoring automático
    min_responses_required = Column(Integer, default=3)
    
    # Notificaciones
    notification_settings = Column(JSON)  # Configuración de notificaciones
    reminder_sent_count = Column(Integer, default=0)
    last_reminder_sent = Column(DateTime)
    
    # Archivos adjuntos
    attachments = Column(JSON)  # Array de URLs de archivos
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime)
    closed_at = Column(DateTime)
    
    # Relaciones
    company = relationship("Company", backref="quotations")
    user = relationship("User", backref="created_quotations")
    responses = relationship("QuotationResponse", back_populates="quotation", 
                           foreign_keys="QuotationResponse.quotation_id")
    invited_hotels = relationship("HotelProvider", secondary=quotation_hotels, 
                                 backref="invited_quotations")
    selected_response = relationship("QuotationResponse", 
                                    foreign_keys=[selected_response_id],
                                    post_update=True)
    
    # Índices
    __table_args__ = (
        Index('idx_quotation_company', 'company_id'),
        Index('idx_quotation_status', 'status'),
        Index('idx_quotation_deadline', 'deadline'),
        Index('idx_quotation_destination', 'destination'),
    )
    
    def to_dict(self):
        """Convertir a diccionario para API responses"""
        return {
            'id': self.id,
            'company_id': self.company_id,
            'title': self.title,
            'description': self.description,
            'destination': self.destination,
            'check_in_date': self.check_in_date.isoformat() if self.check_in_date else None,
            'check_out_date': self.check_out_date.isoformat() if self.check_out_date else None,
            'num_rooms': self.num_rooms,
            'num_guests': self.num_guests,
            'meal_plan': self.meal_plan.value if self.meal_plan else None,
            'budget_min': float(self.budget_min) if self.budget_min else None,
            'budget_max': float(self.budget_max) if self.budget_max else None,
            'currency': self.currency,
            'deposit_config': self.deposit_config,
            'hotel_selection': self.hotel_selection,
            'privacy_settings': self.privacy_settings,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'status': self.status.value if self.status else None,
            'payment_status': self.payment_status.value if self.payment_status else None,
            'responses_count': len(self.responses) if self.responses else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class QuotationResponse(Base):
    """
    Modelo para respuestas de hoteles a cotizaciones
    """
    __tablename__ = 'quotation_responses'
    
    # Identificación
    id = Column(String, primary_key=True, default=lambda: f"QR-{uuid.uuid4().hex[:8].upper()}")
    quotation_id = Column(String, ForeignKey('group_quotations.id'), nullable=False)
    hotel_id = Column(String, ForeignKey('hotel_providers.id'), nullable=False)
    
    # Precios
    base_price = Column(DECIMAL(10, 2), nullable=False)  # Precio por habitación por noche
    final_price = Column(DECIMAL(10, 2), nullable=False)  # Precio final con descuentos
    total_price = Column(DECIMAL(10, 2))  # Precio total de la estancia
    currency = Column(String(3), default='USD')
    
    # Descuentos y ofertas
    discount_percentage = Column(Float, default=0)
    discount_amount = Column(DECIMAL(10, 2))
    special_offers = Column(JSON)  # Array de ofertas especiales
    promo_code = Column(String(50))
    
    # Servicios
    included_services = Column(JSON)  # Array de servicios incluidos
    excluded_services = Column(JSON)  # Array de servicios no incluidos
    optional_services = Column(JSON)  # Array de servicios opcionales con precios
    
    # Políticas
    cancellation_policy = Column(Text)
    payment_terms = Column(Text)
    modification_policy = Column(Text)
    no_show_policy = Column(Text)
    
    # Términos de pago
    deposit_required = Column(Boolean, default=True)
    deposit_amount = Column(DECIMAL(10, 2))
    deposit_percentage = Column(Float)
    payment_schedule = Column(JSON)  # Calendario de pagos
    accepted_payment_methods = Column(JSON)  # Métodos de pago aceptados
    
    # Validez
    validity_days = Column(Integer, default=7)
    valid_until = Column(DateTime)
    
    # Disponibilidad
    rooms_available = Column(Integer)
    guaranteed_availability = Column(Boolean, default=False)
    waitlist_available = Column(Boolean, default=False)
    
    # Configuración de precios y competencia
    pricing_strategy = Column(String(50))  # 'competitive', 'aggressive', 'premium'
    can_see_competitor_prices = Column(Boolean, default=False)  # CRÍTICO: Por defecto NO
    price_update_attempts = Column(Integer, default=0)  # Contador de actualizaciones
    max_price_updates = Column(Integer, default=2)  # Máximo permitido
    
    # Visibilidad administrativa
    visibility_changed_at = Column(DateTime)
    visibility_changed_by = Column(String(50))
    
    # Notas y comunicación
    notes = Column(Text)
    internal_notes = Column(Text)  # Notas internas del hotel
    questions_for_client = Column(JSON)  # Preguntas para el cliente
    
    # Scoring automático
    auto_score = Column(Float)  # Score calculado automáticamente
    score_breakdown = Column(JSON)  # Desglose del score
    ranking_position = Column(Integer)  # Posición en el ranking
    
    # Estados y fechas
    status = Column(SQLEnum(ResponseStatus), default=ResponseStatus.DRAFT)
    submitted_at = Column(DateTime)
    selected_at = Column(DateTime)
    rejected_at = Column(DateTime)
    rejection_reason = Column(Text)
    
    # Archivos adjuntos
    attachments = Column(JSON)  # Array de URLs de archivos
    images = Column(JSON)  # Array de URLs de imágenes
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    quotation = relationship("GroupQuotation", back_populates="responses", 
                           foreign_keys=[quotation_id])
    hotel = relationship("HotelProvider", backref="quotation_responses")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('quotation_id', 'hotel_id', name='unique_hotel_response'),
        Index('idx_response_quotation', 'quotation_id'),
        Index('idx_response_hotel', 'hotel_id'),
        Index('idx_response_status', 'status'),
    )
    
    def to_dict(self, hide_prices=False):
        """Convertir a diccionario con control de privacidad"""
        data = {
            'id': self.id,
            'quotation_id': self.quotation_id,
            'hotel_id': self.hotel_id,
            'included_services': self.included_services,
            'excluded_services': self.excluded_services,
            'cancellation_policy': self.cancellation_policy,
            'payment_terms': self.payment_terms,
            'validity_days': self.validity_days,
            'valid_until': self.valid_until.isoformat() if self.valid_until else None,
            'rooms_available': self.rooms_available,
            'status': self.status.value if self.status else None,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'notes': self.notes
        }
        
        # Ocultar precios si es necesario
        if not hide_prices:
            data.update({
                'base_price': float(self.base_price) if self.base_price else None,
                'final_price': float(self.final_price) if self.final_price else None,
                'total_price': float(self.total_price) if self.total_price else None,
                'discount_percentage': self.discount_percentage,
                'special_offers': self.special_offers,
                'pricing_strategy': self.pricing_strategy,
                'ranking_position': self.ranking_position
            })
        else:
            data['prices_hidden'] = True
        
        return data


class HotelProvider(Base):
    """
    Modelo para proveedores de hotel
    """
    __tablename__ = 'hotel_providers'
    
    # Identificación
    id = Column(String, primary_key=True, default=lambda: f"HTL-{uuid.uuid4().hex[:8].upper()}")
    code = Column(String(50), unique=True)
    tax_id = Column(String(50))
    
    # Información básica
    name = Column(String(200), nullable=False)
    legal_name = Column(String(200))
    brand = Column(String(100))
    chain = Column(String(100))
    
    # Contacto
    email = Column(String(150), nullable=False)
    phone = Column(String(50))
    fax = Column(String(50))
    website = Column(String(200))
    
    # Ubicación
    address = Column(String(300))
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    latitude = Column(Float)
    longitude = Column(Float)
    timezone = Column(String(50))
    
    # Categorización
    category = Column(String(50))  # 'luxury', 'premium', 'standard', 'budget'
    star_rating = Column(Float)
    rating = Column(Float)  # Rating promedio
    total_reviews = Column(Integer, default=0)
    
    # Capacidad
    total_rooms = Column(Integer)
    room_types_available = Column(JSON)  # Tipos de habitación disponibles
    max_occupancy = Column(Integer)
    
    # Servicios y amenidades
    amenities = Column(JSON)  # Array de amenidades
    services = Column(JSON)  # Array de servicios
    meal_plans_available = Column(JSON)  # Planes de comida disponibles
    
    # Configuración de respuestas
    auto_response_enabled = Column(Boolean, default=False)
    response_time_hours = Column(Integer)  # Tiempo promedio de respuesta
    preferred_communication = Column(String(50))  # 'email', 'api', 'portal'
    
    # Integración
    api_enabled = Column(Boolean, default=False)
    api_endpoint = Column(String(200))
    api_key = Column(String(100))
    integration_type = Column(String(50))  # 'direct', 'channel_manager', 'gds'
    
    # Comisiones y tarifas
    commission_percentage = Column(Float)
    base_commission = Column(DECIMAL(10, 2))
    preferred_partner = Column(Boolean, default=False)
    contract_valid_until = Column(DateTime)
    
    # Performance
    response_rate = Column(Float)  # Porcentaje de respuestas a cotizaciones
    acceptance_rate = Column(Float)  # Porcentaje de cotizaciones ganadas
    cancellation_rate = Column(Float)  # Porcentaje de cancelaciones
    quality_score = Column(Float)  # Score de calidad general
    
    # Contacto principal
    contact_person = Column(String(150))
    contact_position = Column(String(100))
    contact_email = Column(String(150))
    contact_phone = Column(String(50))
    
    # Estado
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_custom = Column(Boolean, default=False)  # Hotel agregado manualmente
    verification_date = Column(DateTime)
    suspension_reason = Column(Text)
    
    # Configuración de notificaciones
    notification_preferences = Column(JSON)
    
    # Documentos
    documents = Column(JSON)  # URLs de documentos (contratos, certificados, etc)
    certifications = Column(JSON)  # Certificaciones (ISO, etc)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_activity_at = Column(DateTime)
    
    # Índices
    __table_args__ = (
        Index('idx_hotel_city', 'city'),
        Index('idx_hotel_country', 'country'),
        Index('idx_hotel_category', 'category'),
        Index('idx_hotel_rating', 'rating'),
        Index('idx_hotel_active', 'is_active'),
    )
    
    def to_dict(self):
        """Convertir a diccionario para API responses"""
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'city': self.city,
            'country': self.country,
            'category': self.category,
            'star_rating': self.star_rating,
            'rating': self.rating,
            'amenities': self.amenities,
            'services': self.services,
            'total_rooms': self.total_rooms,
            'is_verified': self.is_verified,
            'response_rate': self.response_rate,
            'quality_score': self.quality_score
        }


class Company(Base):
    """
    Modelo para empresas B2B/B2B2C
    """
    __tablename__ = 'companies'
    
    id = Column(String, primary_key=True, default=lambda: f"CMP-{uuid.uuid4().hex[:8].upper()}")
    name = Column(String(200), nullable=False)
    type = Column(String(50))  # 'B2B', 'B2B2C', 'CORPORATE'
    email = Column(String(150))
    phone = Column(String(50))
    address = Column(String(300))
    tax_id = Column(String(50))
    credit_limit = Column(DECIMAL(10, 2))
    payment_terms = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class User(Base):
    """
    Modelo para usuarios del sistema
    """
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True, default=lambda: f"USR-{uuid.uuid4().hex[:8].upper()}")
    company_id = Column(String, ForeignKey('companies.id'))
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(200))
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(String(50))  # 'admin', 'manager', 'agent', 'client'
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relación
    company = relationship("Company", backref="users")