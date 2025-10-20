# Provider Management Models
# Sistema avanzado de gestión de proveedores para Spirit Tours

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey, Date, Time, Enum, Numeric, UniqueConstraint, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

class ProviderType(enum.Enum):
    """Tipos de proveedores en el sistema"""
    TRANSPORT = "transport"
    TOUR_GUIDE = "tour_guide"
    HOTEL = "hotel"
    RESTAURANT = "restaurant"
    ATTRACTION = "attraction"
    GUIDE_COMPANY = "guide_company"
    OTHER = "other"

class VehicleType(enum.Enum):
    """Tipos de vehículos disponibles"""
    BUS_STANDARD = "bus_standard"
    BUS_LUXURY = "bus_luxury"
    MINIBUS = "minibus"
    VAN = "van"
    SUV = "suv"
    SEDAN = "sedan"
    LIMOUSINE = "limousine"
    OTHER = "other"

class BookingStatus(enum.Enum):
    """Estados de las reservas"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    IN_PROGRESS = "in_progress"

class ConfirmationStatus(enum.Enum):
    """Estados de confirmación"""
    PENDING = "pending"
    AUTO_CONFIRMED = "auto_confirmed"
    MANUALLY_CONFIRMED = "manually_confirmed"
    REJECTED = "rejected"
    TIMEOUT = "timeout"

# Tabla de Proveedores
class Provider(Base):
    __tablename__ = 'providers'
    
    id = Column(Integer, primary_key=True)
    company_name = Column(String(255), nullable=False)
    provider_type = Column(Enum(ProviderType), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50))
    address = Column(Text)
    city = Column(String(100))
    country = Column(String(100))
    tax_id = Column(String(50))
    
    # Configuración de confirmaciones
    auto_confirm_enabled = Column(Boolean, default=False)
    confirmation_timeout_hours = Column(Integer, default=24)
    max_pending_bookings = Column(Integer, default=10)
    
    # Políticas de cancelación
    cancellation_policy = Column(JSON)  # {hours_before: percentage_refund}
    cancellation_enabled = Column(Boolean, default=True)
    
    # Información financiera
    commission_percentage = Column(Float, default=0)
    payment_terms = Column(String(100))
    
    # Metadatos
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    vehicles = relationship("Vehicle", back_populates="provider")
    guides = relationship("TourGuide", back_populates="provider")
    bookings = relationship("ProviderBooking", back_populates="provider")
    calendar_events = relationship("ProviderCalendar", back_populates="provider")
    reports = relationship("ProviderReport", back_populates="provider")

# Tabla de Vehículos para compañías de transporte
class Vehicle(Base):
    __tablename__ = 'vehicles'
    
    id = Column(Integer, primary_key=True)
    provider_id = Column(Integer, ForeignKey('providers.id'))
    vehicle_type = Column(Enum(VehicleType), nullable=False)
    brand = Column(String(100))
    model = Column(String(100))
    year = Column(Integer)
    license_plate = Column(String(50), unique=True)
    capacity = Column(Integer, nullable=False)
    
    # Características
    has_wifi = Column(Boolean, default=False)
    has_ac = Column(Boolean, default=True)
    has_bathroom = Column(Boolean, default=False)
    has_tv = Column(Boolean, default=False)
    is_accessible = Column(Boolean, default=False)
    
    # Tarifas
    price_per_day = Column(Numeric(10, 2))
    price_per_km = Column(Numeric(10, 2))
    price_per_hour = Column(Numeric(10, 2))
    
    # Estado
    is_available = Column(Boolean, default=True)
    maintenance_date = Column(Date)
    insurance_expiry = Column(Date)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    provider = relationship("Provider", back_populates="vehicles")
    assignments = relationship("VehicleAssignment", back_populates="vehicle")

# Tabla de Conductores
class Driver(Base):
    __tablename__ = 'drivers'
    
    id = Column(Integer, primary_key=True)
    provider_id = Column(Integer, ForeignKey('providers.id'))
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(255))
    license_number = Column(String(50), unique=True)
    license_expiry = Column(Date)
    
    # Idiomas
    languages = Column(JSON)  # ["es", "en", "he", "ar"]
    
    # Estado
    is_available = Column(Boolean, default=True)
    years_experience = Column(Integer)
    rating = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    assignments = relationship("VehicleAssignment", back_populates="driver")

# Tabla de Guías Turísticos
class TourGuide(Base):
    __tablename__ = 'tour_guides'
    
    id = Column(Integer, primary_key=True)
    provider_id = Column(Integer, ForeignKey('providers.id'), nullable=True)  # NULL si es independiente
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), unique=True)
    
    # Especialización
    specializations = Column(JSON)  # ["religious", "historical", "adventure", "culinary"]
    languages = Column(JSON)  # ["es", "en", "fr", "de"]
    destinations = Column(JSON)  # ["Jerusalem", "Tel Aviv", "Bethlehem"]
    
    # Certificaciones
    license_number = Column(String(50), unique=True)
    license_expiry = Column(Date)
    certifications = Column(JSON)
    
    # Tarifas
    price_per_day = Column(Numeric(10, 2))
    price_half_day = Column(Numeric(10, 2))
    price_per_person = Column(Numeric(10, 2))
    
    # Estado y calidad
    is_available = Column(Boolean, default=True)
    years_experience = Column(Integer)
    rating = Column(Float)
    total_tours = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    provider = relationship("Provider", back_populates="guides")
    calendar = relationship("GuideCalendar", back_populates="guide")
    assignments = relationship("GuideAssignment", back_populates="guide")

# Tabla de Calendario de Proveedores
class ProviderCalendar(Base):
    __tablename__ = 'provider_calendar'
    
    id = Column(Integer, primary_key=True)
    provider_id = Column(Integer, ForeignKey('providers.id'))
    booking_id = Column(Integer, ForeignKey('provider_bookings.id'))
    
    # Información del evento
    event_date = Column(Date, nullable=False)
    start_time = Column(Time)
    end_time = Column(Time)
    event_type = Column(String(50))  # "booking", "maintenance", "blocked"
    
    # Detalles del grupo
    group_name = Column(String(255))
    group_size = Column(Integer)
    contact_person = Column(String(255))
    contact_phone = Column(String(50))
    
    # Estado
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING)
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    provider = relationship("Provider", back_populates="calendar_events")
    booking = relationship("ProviderBooking", back_populates="calendar_events")
    
    # Índices para búsquedas rápidas
    __table_args__ = (
        Index('idx_provider_date', 'provider_id', 'event_date'),
    )

# Tabla de Calendario de Guías (previene duplicados)
class GuideCalendar(Base):
    __tablename__ = 'guide_calendar'
    
    id = Column(Integer, primary_key=True)
    guide_id = Column(Integer, ForeignKey('tour_guides.id'))
    assignment_id = Column(Integer, ForeignKey('guide_assignments.id'))
    
    # Fecha y hora
    date = Column(Date, nullable=False)
    start_time = Column(Time)
    end_time = Column(Time)
    
    # Información del tour
    tour_type = Column(String(100))
    group_name = Column(String(255))
    group_size = Column(Integer)
    destinations = Column(JSON)  # Lista de destinos del día
    
    # Estado
    is_confirmed = Column(Boolean, default=False)
    is_blocked = Column(Boolean, default=False)  # Para bloquear fechas personales
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    guide = relationship("TourGuide", back_populates="calendar")
    assignment = relationship("GuideAssignment", back_populates="calendar_entries")
    
    # Restricción única para evitar duplicados
    __table_args__ = (
        UniqueConstraint('guide_id', 'date', 'start_time', name='unique_guide_booking'),
        Index('idx_guide_date', 'guide_id', 'date'),
    )

# Tabla de Reservas con Proveedores
class ProviderBooking(Base):
    __tablename__ = 'provider_bookings'
    
    id = Column(Integer, primary_key=True)
    provider_id = Column(Integer, ForeignKey('providers.id'))
    tour_id = Column(Integer, ForeignKey('tours.id'))
    
    # Información de la reserva
    booking_reference = Column(String(50), unique=True)
    booking_date = Column(DateTime, default=datetime.utcnow)
    service_date = Column(Date, nullable=False)
    
    # Detalles del servicio
    service_type = Column(String(100))
    service_details = Column(JSON)
    group_size = Column(Integer)
    
    # Información del cliente/grupo
    client_name = Column(String(255))
    client_contact = Column(String(255))
    special_requirements = Column(Text)
    
    # Precios y costos
    total_cost = Column(Numeric(10, 2))
    commission_amount = Column(Numeric(10, 2))
    net_amount = Column(Numeric(10, 2))
    
    # Estados y confirmación
    booking_status = Column(Enum(BookingStatus), default=BookingStatus.PENDING)
    confirmation_status = Column(Enum(ConfirmationStatus), default=ConfirmationStatus.PENDING)
    confirmed_at = Column(DateTime)
    confirmation_deadline = Column(DateTime)
    
    # Cancelación
    is_cancelled = Column(Boolean, default=False)
    cancelled_at = Column(DateTime)
    cancellation_reason = Column(Text)
    refund_amount = Column(Numeric(10, 2))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    provider = relationship("Provider", back_populates="bookings")
    calendar_events = relationship("ProviderCalendar", back_populates="booking")
    vehicle_assignments = relationship("VehicleAssignment", back_populates="booking")
    guide_assignments = relationship("GuideAssignment", back_populates="booking")

# Tabla de Asignación de Vehículos
class VehicleAssignment(Base):
    __tablename__ = 'vehicle_assignments'
    
    id = Column(Integer, primary_key=True)
    booking_id = Column(Integer, ForeignKey('provider_bookings.id'))
    vehicle_id = Column(Integer, ForeignKey('vehicles.id'))
    driver_id = Column(Integer, ForeignKey('drivers.id'))
    
    # Detalles de la asignación
    assignment_date = Column(Date, nullable=False)
    pickup_time = Column(Time)
    pickup_location = Column(String(255))
    dropoff_location = Column(String(255))
    
    # Ruta e itinerario
    route_details = Column(JSON)  # Lista de paradas y horarios
    total_km = Column(Float)
    estimated_duration_hours = Column(Float)
    
    # Estado
    is_confirmed = Column(Boolean, default=False)
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    booking = relationship("ProviderBooking", back_populates="vehicle_assignments")
    vehicle = relationship("Vehicle", back_populates="assignments")
    driver = relationship("Driver", back_populates="assignments")

# Tabla de Asignación de Guías
class GuideAssignment(Base):
    __tablename__ = 'guide_assignments'
    
    id = Column(Integer, primary_key=True)
    booking_id = Column(Integer, ForeignKey('provider_bookings.id'))
    guide_id = Column(Integer, ForeignKey('tour_guides.id'))
    
    # Detalles de la asignación
    tour_date = Column(Date, nullable=False)
    start_time = Column(Time)
    end_time = Column(Time)
    meeting_point = Column(String(255))
    
    # Información del tour
    tour_type = Column(String(100))
    destinations = Column(JSON)
    special_instructions = Column(Text)
    
    # Estado
    is_confirmed = Column(Boolean, default=False)
    guide_confirmed_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    booking = relationship("ProviderBooking", back_populates="guide_assignments")
    guide = relationship("TourGuide", back_populates="assignments")
    calendar_entries = relationship("GuideCalendar", back_populates="assignment")

# Tabla de Reportes de Proveedores
class ProviderReport(Base):
    __tablename__ = 'provider_reports'
    
    id = Column(Integer, primary_key=True)
    provider_id = Column(Integer, ForeignKey('providers.id'))
    
    # Período del reporte
    report_type = Column(String(50))  # "monthly", "quarterly", "annual", "custom"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Métricas generales
    total_bookings = Column(Integer)
    completed_bookings = Column(Integer)
    cancelled_bookings = Column(Integer)
    total_revenue = Column(Numeric(12, 2))
    total_commission = Column(Numeric(12, 2))
    
    # Métricas específicas por tipo
    metrics_by_vehicle = Column(JSON)  # {vehicle_id: {bookings, revenue, km}}
    metrics_by_driver = Column(JSON)   # {driver_id: {bookings, hours, rating}}
    metrics_by_guide = Column(JSON)    # {guide_id: {tours, revenue, rating}}
    metrics_by_destination = Column(JSON)  # {destination: {visits, revenue}}
    
    # Análisis de rendimiento
    average_group_size = Column(Float)
    average_booking_value = Column(Numeric(10, 2))
    occupancy_rate = Column(Float)  # Para vehículos
    confirmation_rate = Column(Float)
    cancellation_rate = Column(Float)
    
    # Datos adicionales
    top_destinations = Column(JSON)
    peak_days = Column(JSON)
    customer_feedback_summary = Column(JSON)
    
    generated_at = Column(DateTime, default=datetime.utcnow)
    generated_by = Column(Integer, ForeignKey('users.id'))
    
    # Relaciones
    provider = relationship("Provider", back_populates="reports")

# Tabla de Configuración de Notificaciones
class ProviderNotificationSettings(Base):
    __tablename__ = 'provider_notification_settings'
    
    id = Column(Integer, primary_key=True)
    provider_id = Column(Integer, ForeignKey('providers.id'), unique=True)
    
    # Canales de notificación
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)
    whatsapp_enabled = Column(Boolean, default=False)
    push_enabled = Column(Boolean, default=False)
    
    # Tipos de notificaciones
    notify_new_booking = Column(Boolean, default=True)
    notify_booking_confirmation = Column(Boolean, default=True)
    notify_booking_cancellation = Column(Boolean, default=True)
    notify_payment = Column(Boolean, default=True)
    notify_reminder = Column(Boolean, default=True)
    
    # Tiempos de notificación
    reminder_hours_before = Column(Integer, default=24)
    daily_summary_time = Column(Time)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Índices adicionales para optimización
Index('idx_booking_dates', ProviderBooking.service_date)
Index('idx_vehicle_availability', Vehicle.is_available, Vehicle.provider_id)
Index('idx_guide_availability', TourGuide.is_available)
Index('idx_report_period', ProviderReport.start_date, ProviderReport.end_date)