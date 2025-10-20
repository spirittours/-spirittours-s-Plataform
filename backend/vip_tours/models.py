# VIP Tours Models
# Sistema de cotización automática para tours privados VIP

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey, Date, Numeric, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

class QuoteStatus(enum.Enum):
    """Estados de las cotizaciones"""
    DRAFT = "draft"
    PENDING = "pending"
    SENT = "sent"
    CONFIRMED = "confirmed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class ServiceAvailability(enum.Enum):
    """Disponibilidad de servicios"""
    IMMEDIATE = "immediate"  # Disponible inmediatamente
    UPON_REQUEST = "upon_request"  # Requiere solicitud
    NOT_AVAILABLE = "not_available"  # No disponible

class ClientType(enum.Enum):
    """Tipos de clientes"""
    B2C = "b2c"  # Cliente directo
    B2B = "b2b"  # Agencia/Tour operador
    B2B2C = "b2b2c"  # Agencia vendiendo a cliente final
    INTERNAL = "internal"  # Empleado de Spirit Tours

class TourType(enum.Enum):
    """Tipos de tours"""
    VIP_PRIVATE = "vip_private"
    SMALL_GROUP = "small_group"
    CUSTOM = "custom"

# Tabla de Itinerarios VIP
class VIPItinerary(Base):
    __tablename__ = 'vip_itineraries'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Países y combinaciones
    countries = Column(JSON)  # ["Israel", "Jordan", "Egypt"]
    duration_days = Column(Integer, nullable=False)
    
    # Configuración del itinerario
    daily_schedule = Column(JSON)  # Estructura detallada día por día
    included_services = Column(JSON)  # Servicios incluidos
    optional_services = Column(JSON)  # Servicios opcionales
    
    # Categorías de alojamiento disponibles
    hotel_categories = Column(JSON)  # ["3star", "4star", "5star", "boutique"]
    
    # Tamaños de grupo
    min_group_size = Column(Integer, default=1)
    max_group_size = Column(Integer, default=15)
    
    # Precios base (por persona)
    base_price_single = Column(Numeric(10, 2))
    base_price_double = Column(Numeric(10, 2))
    base_price_triple = Column(Numeric(10, 2))
    
    # Metadatos
    is_active = Column(Boolean, default=True)
    popularity_score = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    quotes = relationship("VIPQuote", back_populates="itinerary")
    daily_programs = relationship("VIPDailyProgram", back_populates="itinerary")

# Tabla de Programas Diarios
class VIPDailyProgram(Base):
    __tablename__ = 'vip_daily_programs'
    
    id = Column(Integer, primary_key=True)
    itinerary_id = Column(Integer, ForeignKey('vip_itineraries.id'))
    day_number = Column(Integer, nullable=False)
    
    # Detalles del día
    title = Column(String(255))
    description = Column(Text)
    destinations = Column(JSON)  # Lista de destinos del día
    
    # Servicios del día
    included_meals = Column(JSON)  # ["breakfast", "lunch", "dinner"]
    transportation_type = Column(String(100))
    guide_required = Column(Boolean, default=True)
    
    # Entradas y actividades
    entrance_fees = Column(JSON)  # Lista de entradas requeridas
    activities = Column(JSON)  # Actividades del día
    
    # Horarios estimados
    start_time = Column(String(10))  # "08:00"
    end_time = Column(String(10))  # "18:00"
    total_distance_km = Column(Float)
    
    # Opciones y extras
    optional_activities = Column(JSON)
    special_notes = Column(Text)
    
    # Relaciones
    itinerary = relationship("VIPItinerary", back_populates="daily_programs")

# Tabla de Cotizaciones VIP
class VIPQuote(Base):
    __tablename__ = 'vip_quotes'
    
    id = Column(Integer, primary_key=True)
    quote_number = Column(String(50), unique=True, nullable=False)
    itinerary_id = Column(Integer, ForeignKey('vip_itineraries.id'))
    
    # Información del cliente
    client_type = Column(Enum(ClientType), nullable=False)
    client_id = Column(Integer)  # ID del cliente/agencia/empleado
    client_name = Column(String(255), nullable=False)
    client_email = Column(String(255))
    client_phone = Column(String(50))
    client_company = Column(String(255))
    
    # Detalles del tour
    tour_type = Column(Enum(TourType), default=TourType.VIP_PRIVATE)
    travel_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    group_size = Column(Integer, nullable=False)
    
    # Personalización
    customizations = Column(JSON)  # Modificaciones al itinerario estándar
    special_requests = Column(Text)
    dietary_restrictions = Column(JSON)
    accessibility_requirements = Column(JSON)
    
    # Servicios seleccionados
    selected_hotels = Column(JSON)  # Hotels por noche/ciudad
    selected_transport = Column(JSON)  # Tipo de transporte por día
    selected_guides = Column(JSON)  # Guías asignados/solicitados
    selected_extras = Column(JSON)  # Servicios adicionales
    
    # Disponibilidad y confirmación
    services_availability = Column(JSON)  # Estado de cada servicio
    all_services_confirmed = Column(Boolean, default=False)
    requires_manual_review = Column(Boolean, default=False)
    
    # Precios y costos
    total_hotel_cost = Column(Numeric(12, 2))
    total_transport_cost = Column(Numeric(12, 2))
    total_guide_cost = Column(Numeric(12, 2))
    total_entrance_fees = Column(Numeric(12, 2))
    total_meals_cost = Column(Numeric(12, 2))
    total_extras_cost = Column(Numeric(12, 2))
    
    subtotal = Column(Numeric(12, 2))
    markup_percentage = Column(Float)
    discount_percentage = Column(Float, default=0)
    discount_amount = Column(Numeric(12, 2), default=0)
    
    total_price = Column(Numeric(12, 2), nullable=False)
    price_per_person = Column(Numeric(10, 2))
    
    # Comisiones (para B2B/B2B2C)
    agent_commission_percentage = Column(Float, default=0)
    agent_commission_amount = Column(Numeric(10, 2), default=0)
    
    # Estados y validez
    status = Column(Enum(QuoteStatus), default=QuoteStatus.DRAFT)
    valid_until = Column(DateTime)
    confirmation_deadline = Column(DateTime)
    
    # IA y validación
    ai_validation_status = Column(String(50))
    ai_suggestions = Column(JSON)
    ai_error_checks = Column(JSON)
    manual_review_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime)
    confirmed_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    itinerary = relationship("VIPItinerary", back_populates="quotes")
    service_requests = relationship("VIPServiceRequest", back_populates="quote")
    price_calculations = relationship("VIPPriceCalculation", back_populates="quote")

# Tabla de Solicitudes de Servicios
class VIPServiceRequest(Base):
    __tablename__ = 'vip_service_requests'
    
    id = Column(Integer, primary_key=True)
    quote_id = Column(Integer, ForeignKey('vip_quotes.id'))
    
    # Tipo de servicio
    service_type = Column(String(50))  # "hotel", "transport", "guide", "entrance"
    service_date = Column(Date, nullable=False)
    
    # Detalles del servicio
    service_details = Column(JSON)
    quantity = Column(Integer)
    special_requirements = Column(Text)
    
    # Proveedor
    provider_id = Column(Integer, ForeignKey('providers.id'))
    provider_response = Column(JSON)
    
    # Estado de la solicitud
    availability = Column(Enum(ServiceAvailability), default=ServiceAvailability.UPON_REQUEST)
    is_confirmed = Column(Boolean, default=False)
    confirmed_at = Column(DateTime)
    
    # Precio
    quoted_price = Column(Numeric(10, 2))
    confirmed_price = Column(Numeric(10, 2))
    currency = Column(String(3), default='USD')
    
    # Tiempos
    request_sent_at = Column(DateTime)
    response_received_at = Column(DateTime)
    response_deadline = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    quote = relationship("VIPQuote", back_populates="service_requests")

# Tabla de Cálculos de Precios
class VIPPriceCalculation(Base):
    __tablename__ = 'vip_price_calculations'
    
    id = Column(Integer, primary_key=True)
    quote_id = Column(Integer, ForeignKey('vip_quotes.id'))
    
    # Componente del precio
    component_type = Column(String(50))  # "hotel", "transport", "guide", etc.
    component_description = Column(String(255))
    
    # Detalles del cálculo
    quantity = Column(Integer)
    unit_price = Column(Numeric(10, 2))
    subtotal = Column(Numeric(10, 2))
    
    # Ajustes
    markup_percentage = Column(Float)
    markup_amount = Column(Numeric(10, 2))
    discount_percentage = Column(Float)
    discount_amount = Column(Numeric(10, 2))
    
    final_price = Column(Numeric(10, 2))
    
    # Notas
    calculation_notes = Column(Text)
    is_optional = Column(Boolean, default=False)
    is_included = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    quote = relationship("VIPQuote", back_populates="price_calculations")

# Tabla de Configuración de Precios Dinámicos
class DynamicPricingRules(Base):
    __tablename__ = 'dynamic_pricing_rules'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Aplicación
    applies_to = Column(String(50))  # "all", "vip", "group", "b2b"
    client_type = Column(String(50))  # "b2c", "b2b", "b2b2c"
    
    # Condiciones
    min_group_size = Column(Integer)
    max_group_size = Column(Integer)
    min_advance_days = Column(Integer)  # Días de anticipación
    season_dates = Column(JSON)  # Fechas de temporada
    
    # Ajustes de precio
    adjustment_type = Column(String(20))  # "percentage", "fixed"
    adjustment_value = Column(Float)  # Porcentaje o monto fijo
    
    # Prioridad y estado
    priority = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Validez
    valid_from = Column(Date)
    valid_until = Column(Date)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Tabla de Tarifas de Transporte por Ruta
class TransportRoutePricing(Base):
    __tablename__ = 'transport_route_pricing'
    
    id = Column(Integer, primary_key=True)
    
    # Ruta
    origin = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    route_type = Column(String(50))  # "transfer", "tour", "multi-stop"
    
    # Distancia y tiempo
    distance_km = Column(Float)
    estimated_duration_hours = Column(Float)
    
    # Precios por tipo de vehículo
    price_sedan = Column(Numeric(10, 2))
    price_van = Column(Numeric(10, 2))
    price_minibus = Column(Numeric(10, 2))
    price_bus = Column(Numeric(10, 2))
    
    # Ajustes
    long_day_surcharge = Column(Numeric(10, 2))  # Suplemento por día largo
    night_surcharge_percentage = Column(Float)  # Suplemento nocturno
    
    # Estado
    is_active = Column(Boolean, default=True)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Tabla de Configuración de IA
class AIValidationConfig(Base):
    __tablename__ = 'ai_validation_config'
    
    id = Column(Integer, primary_key=True)
    
    # Configuración de validación
    enable_ai_validation = Column(Boolean, default=True)
    auto_fix_errors = Column(Boolean, default=False)
    require_manual_review_threshold = Column(Float, default=0.7)  # Umbral de confianza
    
    # Reglas de validación
    validation_rules = Column(JSON)  # Reglas personalizadas
    error_patterns = Column(JSON)  # Patrones de error comunes
    
    # Configuración de sugerencias
    enable_ai_suggestions = Column(Boolean, default=True)
    suggestion_categories = Column(JSON)  # Categorías de sugerencias
    
    # Límites y umbrales
    max_price_deviation_percentage = Column(Float, default=20)  # Desviación máxima de precio
    min_profit_margin_percentage = Column(Float, default=15)  # Margen mínimo
    
    # Notificaciones
    notify_on_high_value_quotes = Column(Boolean, default=True)
    high_value_threshold = Column(Numeric(10, 2), default=10000)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)