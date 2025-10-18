"""
Advanced Package Quotation Models for Complete Tour Itineraries
Includes transport, guides, tickets, and all tourism services
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

class PackageType(Enum):
    """Tipos de paquetes turísticos"""
    CULTURAL = "CULTURAL"
    ADVENTURE = "ADVENTURE"
    BEACH = "BEACH"
    BUSINESS = "BUSINESS"
    RELIGIOUS = "RELIGIOUS"
    EDUCATIONAL = "EDUCATIONAL"
    LUXURY = "LUXURY"
    BUDGET = "BUDGET"
    CUSTOM = "CUSTOM"


class TransportType(Enum):
    """Tipos de transporte"""
    BUS = "BUS"
    MINIBUS = "MINIBUS"
    VAN = "VAN"
    CAR = "CAR"
    TRAIN = "TRAIN"
    BOAT = "BOAT"
    PLANE = "PLANE"
    HELICOPTER = "HELICOPTER"
    BICYCLE = "BICYCLE"
    WALKING = "WALKING"


class GuideType(Enum):
    """Tipos de guías turísticos"""
    LICENSED_NATIONAL = "LICENSED_NATIONAL"  # Guía licenciado nacional
    LICENSED_LOCAL = "LICENSED_LOCAL"        # Guía licenciado local
    TOUR_LEADER = "TOUR_LEADER"              # Guía acompañante/Tour leader
    SPECIALIZED = "SPECIALIZED"              # Guía especializado (arqueología, naturaleza, etc)
    INTERPRETER = "INTERPRETER"              # Intérprete
    DRIVER_GUIDE = "DRIVER_GUIDE"           # Conductor-guía


class ServiceCategory(Enum):
    """Categorías de servicios adicionales"""
    ENTRANCE_TICKET = "ENTRANCE_TICKET"      # Entradas a sitios
    MEAL = "MEAL"                           # Comidas
    ACTIVITY = "ACTIVITY"                   # Actividades
    EQUIPMENT = "EQUIPMENT"                 # Equipo especializado
    INSURANCE = "INSURANCE"                 # Seguros
    PERMIT = "PERMIT"                       # Permisos especiales
    TRANSFER = "TRANSFER"                   # Traslados
    OTHER = "OTHER"                         # Otros servicios


class QuotationMethod(Enum):
    """Método de cotización"""
    AUTOMATIC = "AUTOMATIC"      # Precio automático del sistema
    MANUAL_EMAIL = "MANUAL_EMAIL"  # Cotización manual por email
    MANUAL_FORM = "MANUAL_FORM"    # Formulario web para proveedor
    API = "API"                     # Integración API directa
    FIXED = "FIXED"                 # Precio fijo en sistema


# ==================== TABLAS DE ASOCIACIÓN ====================

# Relación muchos a muchos entre paquetes y servicios
package_services = Table(
    'package_services',
    Base.metadata,
    Column('package_id', String, ForeignKey('package_quotations.id')),
    Column('service_id', String, ForeignKey('tourism_services.id')),
    Column('quantity', Integer, default=1),
    Column('day_number', Integer),  # Día del itinerario cuando aplica el servicio
    Column('notes', Text)
)

# Relación entre itinerarios y guías asignados
itinerary_guides = Table(
    'itinerary_guides',
    Base.metadata,
    Column('itinerary_day_id', String, ForeignKey('itinerary_days.id')),
    Column('guide_id', String, ForeignKey('tour_guides.id')),
    Column('hours_assigned', Float),
    Column('special_rate', DECIMAL(10, 2))
)


# ==================== MODELO PRINCIPAL DE PAQUETE ====================

class PackageQuotation(Base):
    """
    Modelo principal para cotización de paquetes turísticos completos
    """
    __tablename__ = 'package_quotations'
    
    # Identificación
    id = Column(String, primary_key=True, default=lambda: f"PKG-{uuid.uuid4().hex[:8].upper()}")
    quotation_id = Column(String, ForeignKey('group_quotations.id'))  # Relación con cotización grupal base
    
    # Información básica del paquete
    package_name = Column(String(200), nullable=False)
    package_type = Column(SQLEnum(PackageType), default=PackageType.CUSTOM)
    description = Column(Text)
    
    # Duración y fechas
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_days = Column(Integer)
    total_nights = Column(Integer)
    
    # Participantes
    num_passengers = Column(Integer, nullable=False)
    num_adults = Column(Integer)
    num_children = Column(Integer)
    num_infants = Column(Integer, default=0)
    
    # Origen y destino principal
    departure_city = Column(String(100))
    main_destination = Column(String(100))
    destinations_visited = Column(JSON)  # Lista de todos los destinos
    
    # Cálculo de costos
    base_cost = Column(DECIMAL(12, 2), default=0)  # Costo base total
    transport_cost = Column(DECIMAL(12, 2), default=0)
    accommodation_cost = Column(DECIMAL(12, 2), default=0)
    guides_cost = Column(DECIMAL(12, 2), default=0)
    tickets_cost = Column(DECIMAL(12, 2), default=0)
    meals_cost = Column(DECIMAL(12, 2), default=0)
    other_services_cost = Column(DECIMAL(12, 2), default=0)
    
    # Márgenes y precios finales
    operational_margin = Column(Float, default=0.15)  # 15% margen operacional
    agency_commission = Column(Float, default=0.10)   # 10% comisión agencia
    taxes_percentage = Column(Float, default=0.16)    # IVA/Taxes
    
    total_cost = Column(DECIMAL(12, 2))      # Costo total
    selling_price = Column(DECIMAL(12, 2))   # Precio de venta
    price_per_person = Column(DECIMAL(10, 2)) # Precio por persona
    currency = Column(String(3), default='USD')
    
    # Configuración de cotización
    quotation_method = Column(SQLEnum(QuotationMethod), default=QuotationMethod.AUTOMATIC)
    requires_manual_review = Column(Boolean, default=False)
    auto_calculate_price = Column(Boolean, default=True)
    include_insurance = Column(Boolean, default=True)
    include_tips = Column(Boolean, default=False)
    
    # Estados y validez
    is_confirmed = Column(Boolean, default=False)
    valid_until = Column(DateTime)
    booking_deadline = Column(DateTime)
    cancellation_policy = Column(JSON)
    
    # Metadatos
    created_by = Column(String, ForeignKey('users.id'))
    approved_by = Column(String, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    itinerary_days = relationship("ItineraryDay", back_populates="package", order_by="ItineraryDay.day_number")
    transport_quotes = relationship("TransportQuote", back_populates="package")
    guide_assignments = relationship("GuideAssignment", back_populates="package")
    service_items = relationship("TourismService", secondary=package_services, backref="packages")
    
    # Índices
    __table_args__ = (
        Index('idx_package_dates', 'start_date', 'end_date'),
        Index('idx_package_destination', 'main_destination'),
        CheckConstraint('end_date >= start_date', name='check_dates'),
        CheckConstraint('selling_price >= total_cost', name='check_price'),
    )


# ==================== ITINERARIO DÍA POR DÍA ====================

class ItineraryDay(Base):
    """
    Modelo para cada día del itinerario
    """
    __tablename__ = 'itinerary_days'
    
    id = Column(String, primary_key=True, default=lambda: f"DAY-{uuid.uuid4().hex[:8].upper()}")
    package_id = Column(String, ForeignKey('package_quotations.id'), nullable=False)
    
    # Información del día
    day_number = Column(Integer, nullable=False)
    date = Column(Date)
    title = Column(String(200))
    description = Column(Text)
    
    # Ubicaciones
    starting_location = Column(String(150))
    ending_location = Column(String(150))
    places_visited = Column(JSON)  # Lista de lugares visitados
    
    # Horarios importantes
    start_time = Column(Time, default=time(8, 0))  # Hora de inicio
    end_time = Column(Time, default=time(20, 0))   # Hora de fin
    
    # Comidas incluidas
    breakfast_included = Column(Boolean, default=True)
    lunch_included = Column(Boolean, default=True)
    dinner_included = Column(Boolean, default=True)
    
    # Transporte del día
    transport_type = Column(SQLEnum(TransportType))
    transport_provider_id = Column(String, ForeignKey('transport_providers.id'))
    distance_km = Column(Float)
    driving_hours = Column(Float)
    
    # Alojamiento
    accommodation_id = Column(String, ForeignKey('hotel_providers.id'))
    accommodation_notes = Column(Text)
    
    # Actividades y entradas
    activities = Column(JSON)  # Lista de actividades del día
    entrance_tickets = Column(JSON)  # Entradas necesarias
    
    # Costos del día
    transport_cost = Column(DECIMAL(10, 2), default=0)
    guides_cost = Column(DECIMAL(10, 2), default=0)
    tickets_cost = Column(DECIMAL(10, 2), default=0)
    meals_cost = Column(DECIMAL(10, 2), default=0)
    accommodation_cost = Column(DECIMAL(10, 2), default=0)
    total_day_cost = Column(DECIMAL(10, 2), default=0)
    
    # Notas especiales
    special_requirements = Column(JSON)
    warnings = Column(Text)  # Advertencias o consideraciones
    
    # Relaciones
    package = relationship("PackageQuotation", back_populates="itinerary_days")
    assigned_guides = relationship("TourGuide", secondary=itinerary_guides, backref="working_days")
    
    # Validaciones
    __table_args__ = (
        UniqueConstraint('package_id', 'day_number', name='unique_day_number'),
        Index('idx_itinerary_date', 'date'),
    )


# ==================== PROVEEDORES DE TRANSPORTE ====================

class TransportProvider(Base):
    """
    Modelo para operadores de transporte
    """
    __tablename__ = 'transport_providers'
    
    id = Column(String, primary_key=True, default=lambda: f"TRP-{uuid.uuid4().hex[:8].upper()}")
    
    # Información básica
    company_name = Column(String(200), nullable=False)
    trade_name = Column(String(200))
    tax_id = Column(String(50))
    license_number = Column(String(100))
    
    # Contacto
    email = Column(String(150), nullable=False)
    phone = Column(String(50))
    emergency_phone = Column(String(50))
    website = Column(String(200))
    
    # Ubicación
    address = Column(String(300))
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    service_areas = Column(JSON)  # Áreas donde opera
    
    # Flota y capacidad
    fleet_size = Column(Integer)
    vehicle_types = Column(JSON)  # Tipos de vehículos disponibles
    max_capacity = Column(Integer)
    
    # Configuración de cotización
    quotation_method = Column(SQLEnum(QuotationMethod), default=QuotationMethod.MANUAL_EMAIL)
    auto_quote_enabled = Column(Boolean, default=False)
    response_time_hours = Column(Integer, default=24)
    
    # Tarifas base (si usa cotización automática)
    price_per_km = Column(DECIMAL(8, 2))
    price_per_hour = Column(DECIMAL(8, 2))
    minimum_charge = Column(DECIMAL(8, 2))
    currency = Column(String(3), default='USD')
    
    # Configuración de precios por tipo de vehículo
    vehicle_rates = Column(JSON)  # {vehicle_type: {per_km, per_hour, per_day}}
    
    # Performance
    rating = Column(Float, default=5.0)
    completed_services = Column(Integer, default=0)
    on_time_percentage = Column(Float, default=100.0)
    
    # Estado
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    insurance_valid_until = Column(Date)
    
    # Preferencias de notificación
    notification_email = Column(String(150))
    accepts_instant_booking = Column(Boolean, default=False)
    requires_advance_days = Column(Integer, default=2)
    
    # Metadatos
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    transport_quotes = relationship("TransportQuote", back_populates="provider")
    route_prices = relationship("RoutePrice", back_populates="provider")


# ==================== COTIZACIONES DE TRANSPORTE ====================

class TransportQuote(Base):
    """
    Modelo para cotizaciones de transporte
    """
    __tablename__ = 'transport_quotes'
    
    id = Column(String, primary_key=True, default=lambda: f"TQ-{uuid.uuid4().hex[:8].upper()}")
    package_id = Column(String, ForeignKey('package_quotations.id'))
    provider_id = Column(String, ForeignKey('transport_providers.id'))
    
    # Detalles del servicio
    service_date = Column(Date)
    pickup_time = Column(Time)
    pickup_location = Column(String(200))
    dropoff_location = Column(String(200))
    
    # Vehículos
    vehicle_type = Column(SQLEnum(TransportType))
    vehicle_quantity = Column(Integer, default=1)
    total_capacity = Column(Integer)
    
    # Itinerario
    route_description = Column(Text)
    total_distance_km = Column(Float)
    estimated_duration_hours = Column(Float)
    stops = Column(JSON)  # Lista de paradas
    
    # Precios
    base_price = Column(DECIMAL(10, 2))
    driver_tip = Column(DECIMAL(8, 2), default=0)
    tolls_parking = Column(DECIMAL(8, 2), default=0)
    additional_charges = Column(DECIMAL(8, 2), default=0)
    total_price = Column(DECIMAL(10, 2))
    currency = Column(String(3), default='USD')
    
    # Estado de cotización
    quote_status = Column(String(20), default='PENDING')  # PENDING, SENT, RECEIVED, ACCEPTED, REJECTED
    quoted_at = Column(DateTime)
    valid_until = Column(DateTime)
    
    # Método de cotización usado
    quotation_method = Column(SQLEnum(QuotationMethod))
    manual_quote_link = Column(String(500))  # Link para cotización manual
    
    # Respuesta del proveedor
    provider_notes = Column(Text)
    includes = Column(JSON)  # Qué incluye
    excludes = Column(JSON)  # Qué no incluye
    
    # Confirmación
    is_confirmed = Column(Boolean, default=False)
    confirmed_at = Column(DateTime)
    confirmation_number = Column(String(100))
    
    # Relaciones
    package = relationship("PackageQuotation", back_populates="transport_quotes")
    provider = relationship("TransportProvider", back_populates="transport_quotes")


# ==================== PRECIOS DE RUTAS PREDEFINIDAS ====================

class RoutePrice(Base):
    """
    Modelo para precios de rutas predefinidas
    """
    __tablename__ = 'route_prices'
    
    id = Column(String, primary_key=True, default=lambda: f"RT-{uuid.uuid4().hex[:8].upper()}")
    provider_id = Column(String, ForeignKey('transport_providers.id'))
    
    # Ruta
    origin = Column(String(150), nullable=False)
    destination = Column(String(150), nullable=False)
    route_name = Column(String(200))
    distance_km = Column(Float)
    estimated_time_hours = Column(Float)
    
    # Precios por tipo de vehículo
    vehicle_type = Column(SQLEnum(TransportType))
    price_one_way = Column(DECIMAL(10, 2))
    price_round_trip = Column(DECIMAL(10, 2))
    price_per_hour_waiting = Column(DECIMAL(8, 2))
    
    # Variaciones de precio
    season_prices = Column(JSON)  # Precios por temporada
    weekend_surcharge = Column(Float, default=0)  # Porcentaje extra fin de semana
    night_surcharge = Column(Float, default=0)     # Porcentaje extra nocturno
    
    # Validez
    valid_from = Column(Date)
    valid_until = Column(Date)
    is_active = Column(Boolean, default=True)
    
    # Relación
    provider = relationship("TransportProvider", back_populates="route_prices")
    
    # Índices
    __table_args__ = (
        Index('idx_route_origin_dest', 'origin', 'destination'),
        UniqueConstraint('provider_id', 'origin', 'destination', 'vehicle_type', name='unique_route'),
    )


# ==================== GUÍAS TURÍSTICOS ====================

class TourGuide(Base):
    """
    Modelo para guías turísticos
    """
    __tablename__ = 'tour_guides'
    
    id = Column(String, primary_key=True, default=lambda: f"GD-{uuid.uuid4().hex[:8].upper()}")
    
    # Información personal
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    phone = Column(String(50))
    emergency_contact = Column(JSON)
    
    # Documentación
    identification_number = Column(String(50))
    license_number = Column(String(100))  # Número de licencia de guía
    license_type = Column(SQLEnum(GuideType))
    license_expiry = Column(Date)
    
    # Cualificaciones
    languages = Column(JSON)  # Lista de idiomas que habla
    specializations = Column(JSON)  # Arqueología, naturaleza, etc.
    certifications = Column(JSON)  # Certificaciones adicionales
    years_experience = Column(Integer, default=0)
    
    # Ubicación y disponibilidad
    base_city = Column(String(100))
    working_areas = Column(JSON)  # Áreas donde puede trabajar
    availability_calendar = Column(JSON)  # Calendario de disponibilidad
    
    # Tarifas
    rate_half_day = Column(DECIMAL(8, 2))  # Tarifa medio día
    rate_full_day = Column(DECIMAL(8, 2))  # Tarifa día completo
    rate_per_hour = Column(DECIMAL(8, 2))  # Tarifa por hora
    overtime_rate = Column(DECIMAL(8, 2))  # Tarifa horas extra
    currency = Column(String(3), default='USD')
    
    # Tarifas especiales
    special_rates = Column(JSON)  # Tarifas para tours específicos
    group_size_rates = Column(JSON)  # Tarifas según tamaño del grupo
    
    # Performance
    rating = Column(Float, default=5.0)
    total_tours = Column(Integer, default=0)
    customer_reviews = Column(Integer, default=0)
    
    # Estado
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    background_check = Column(Boolean, default=False)
    
    # Preferencias
    max_group_size = Column(Integer)
    preferred_tour_types = Column(JSON)
    blackout_dates = Column(JSON)  # Fechas no disponibles
    
    # Metadatos
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    assignments = relationship("GuideAssignment", back_populates="guide")
    
    # Índices
    __table_args__ = (
        Index('idx_guide_city', 'base_city'),
        Index('idx_guide_type', 'license_type'),
        Index('idx_guide_rating', 'rating'),
    )


# ==================== ASIGNACIÓN DE GUÍAS ====================

class GuideAssignment(Base):
    """
    Modelo para asignación de guías a paquetes
    """
    __tablename__ = 'guide_assignments'
    
    id = Column(String, primary_key=True, default=lambda: f"GA-{uuid.uuid4().hex[:8].upper()}")
    package_id = Column(String, ForeignKey('package_quotations.id'))
    guide_id = Column(String, ForeignKey('tour_guides.id'))
    
    # Detalles de asignación
    assignment_type = Column(SQLEnum(GuideType))
    start_date = Column(Date)
    end_date = Column(Date)
    total_days = Column(Integer)
    
    # Horarios
    daily_hours = Column(Float, default=8)
    total_hours = Column(Float)
    
    # Costos
    daily_rate = Column(DECIMAL(8, 2))
    total_fee = Column(DECIMAL(10, 2))
    expenses_included = Column(Boolean, default=False)
    estimated_expenses = Column(DECIMAL(8, 2), default=0)
    
    # Estado
    status = Column(String(20), default='PENDING')  # PENDING, CONFIRMED, CANCELLED
    confirmed_at = Column(DateTime)
    confirmation_sent = Column(Boolean, default=False)
    
    # Notas
    special_instructions = Column(Text)
    guide_notes = Column(Text)
    
    # Relaciones
    package = relationship("PackageQuotation", back_populates="guide_assignments")
    guide = relationship("TourGuide", back_populates="assignments")


# ==================== SERVICIOS TURÍSTICOS (ENTRADAS, ETC) ====================

class TourismService(Base):
    """
    Modelo para servicios turísticos (entradas, actividades, etc)
    """
    __tablename__ = 'tourism_services'
    
    id = Column(String, primary_key=True, default=lambda: f"SRV-{uuid.uuid4().hex[:8].upper()}")
    
    # Información básica
    service_name = Column(String(200), nullable=False)
    category = Column(SQLEnum(ServiceCategory))
    description = Column(Text)
    
    # Ubicación
    location = Column(String(200))
    city = Column(String(100))
    country = Column(String(100))
    coordinates = Column(JSON)  # {lat, lng}
    
    # Proveedor
    provider_name = Column(String(200))
    provider_contact = Column(JSON)
    booking_required = Column(Boolean, default=True)
    advance_booking_days = Column(Integer, default=1)
    
    # Precios
    price_adult = Column(DECIMAL(8, 2))
    price_child = Column(DECIMAL(8, 2))
    price_senior = Column(DECIMAL(8, 2))
    price_group = Column(DECIMAL(8, 2))  # Precio para grupos
    group_size_minimum = Column(Integer, default=10)
    currency = Column(String(3), default='USD')
    
    # Variaciones de precio
    season_prices = Column(JSON)  # Precios por temporada
    special_dates_prices = Column(JSON)  # Precios en fechas especiales
    
    # Horarios
    opening_hours = Column(JSON)  # Horarios por día de la semana
    duration_hours = Column(Float)  # Duración estimada de la visita
    
    # Restricciones
    min_age = Column(Integer)
    max_age = Column(Integer)
    accessibility = Column(JSON)  # Información de accesibilidad
    restrictions = Column(JSON)  # Restricciones especiales
    
    # Comisiones
    commission_percentage = Column(Float, default=0.10)  # 10% comisión
    net_price = Column(Boolean, default=False)  # Si el precio es neto
    
    # Control de acceso
    price_locked = Column(Boolean, default=False)  # Solo admin puede cambiar
    last_price_update = Column(DateTime)
    updated_by = Column(String, ForeignKey('users.id'))
    
    # Estado
    is_active = Column(Boolean, default=True)
    requires_confirmation = Column(Boolean, default=True)
    
    # Metadatos
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Índices
    __table_args__ = (
        Index('idx_service_location', 'city', 'country'),
        Index('idx_service_category', 'category'),
        Index('idx_service_name', 'service_name'),
    )


# ==================== FUNCIONES DE CÁLCULO ====================

def calculate_package_cost(package: PackageQuotation) -> Decimal:
    """
    Calcula el costo total del paquete
    """
    total = Decimal('0')
    
    # Sumar costos por día
    for day in package.itinerary_days:
        total += day.total_day_cost or Decimal('0')
    
    # Agregar costos de transporte cotizados
    for quote in package.transport_quotes:
        if quote.is_confirmed:
            total += quote.total_price or Decimal('0')
    
    # Agregar costos de guías
    for assignment in package.guide_assignments:
        if assignment.status == 'CONFIRMED':
            total += assignment.total_fee or Decimal('0')
            total += assignment.estimated_expenses or Decimal('0')
    
    return total


def calculate_selling_price(package: PackageQuotation) -> Decimal:
    """
    Calcula el precio de venta con márgenes
    """
    cost = calculate_package_cost(package)
    
    # Aplicar margen operacional
    price = cost * Decimal(1 + package.operational_margin)
    
    # Aplicar comisión de agencia
    price = price * Decimal(1 + package.agency_commission)
    
    # Aplicar impuestos
    price = price * Decimal(1 + package.taxes_percentage)
    
    return price.quantize(Decimal('0.01'))  # Redondear a 2 decimales