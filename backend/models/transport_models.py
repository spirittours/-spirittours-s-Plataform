#!/usr/bin/env python3
"""
Transport Provider Management System Models
Sistema Avanzado de Gestión de Proveedores de Transporte
Incluye: Proveedores, Vehículos, Conductores, Cotizaciones, Asignaciones
"""

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text, JSON, 
    ForeignKey, DECIMAL, Enum as SQLEnum, Index, UniqueConstraint,
    CheckConstraint, Table, Float, Date, Time
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from backend.database import Base
import uuid
import enum
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from decimal import Decimal

# ===== ENUMS =====

class ProviderStatus(enum.Enum):
    """Estado del proveedor de transporte"""
    PENDING_APPROVAL = "pending_approval"  # Pendiente de aprobación
    ACTIVE = "active"  # Activo
    SUSPENDED = "suspended"  # Suspendido
    BLACKLISTED = "blacklisted"  # Lista negra
    INACTIVE = "inactive"  # Inactivo

class VehicleType(enum.Enum):
    """Tipos de vehículos"""
    SEDAN = "sedan"  # Sedán (1-4 pasajeros)
    SUV = "suv"  # SUV (1-6 pasajeros)
    VAN = "van"  # Van (7-15 pasajeros)
    MINIBUS = "minibus"  # Minibús (16-35 pasajeros)
    BUS = "bus"  # Autobús (36-55 pasajeros)
    COACH = "coach"  # Autobús de lujo (36-55 pasajeros)
    DOUBLE_DECKER = "double_decker"  # Autobús de dos pisos (56-80 pasajeros)
    LUXURY_SEDAN = "luxury_sedan"  # Sedán de lujo
    LIMOUSINE = "limousine"  # Limusina
    WHEELCHAIR_VAN = "wheelchair_van"  # Van adaptada para sillas de ruedas

class VehicleStatus(enum.Enum):
    """Estado del vehículo"""
    AVAILABLE = "available"  # Disponible
    ASSIGNED = "assigned"  # Asignado
    IN_SERVICE = "in_service"  # En servicio
    MAINTENANCE = "maintenance"  # En mantenimiento
    REPAIR = "repair"  # En reparación
    OUT_OF_SERVICE = "out_of_service"  # Fuera de servicio
    RESERVED = "reserved"  # Reservado

class DriverStatus(enum.Enum):
    """Estado del conductor"""
    AVAILABLE = "available"  # Disponible
    ON_DUTY = "on_duty"  # En servicio
    OFF_DUTY = "off_duty"  # Fuera de servicio
    VACATION = "vacation"  # Vacaciones
    SICK_LEAVE = "sick_leave"  # Baja por enfermedad
    SUSPENDED = "suspended"  # Suspendido
    TERMINATED = "terminated"  # Terminado

class ServiceRequestStatus(enum.Enum):
    """Estado de solicitud de servicio"""
    DRAFT = "draft"  # Borrador
    PENDING_QUOTES = "pending_quotes"  # Esperando cotizaciones
    QUOTES_RECEIVED = "quotes_received"  # Cotizaciones recibidas
    QUOTE_SELECTED = "quote_selected"  # Cotización seleccionada
    PENDING_CONFIRMATION = "pending_confirmation"  # Esperando confirmación
    CONFIRMED = "confirmed"  # Confirmado
    IN_PROGRESS = "in_progress"  # En progreso
    COMPLETED = "completed"  # Completado
    CANCELLED = "cancelled"  # Cancelado
    DISPUTED = "disputed"  # En disputa

class QuoteStatus(enum.Enum):
    """Estado de cotización"""
    DRAFT = "draft"  # Borrador
    SENT = "sent"  # Enviada
    VIEWED = "viewed"  # Vista
    ACCEPTED = "accepted"  # Aceptada
    REJECTED = "rejected"  # Rechazada
    EXPIRED = "expired"  # Expirada
    WITHDRAWN = "withdrawn"  # Retirada

class ServiceType(enum.Enum):
    """Tipos de servicio"""
    TRANSFER = "transfer"  # Transfer (punto a punto)
    TOUR = "tour"  # Tour turístico
    EXCURSION = "excursion"  # Excursión
    SHUTTLE = "shuttle"  # Servicio shuttle
    CHARTER = "charter"  # Charter
    HOURLY = "hourly"  # Por horas
    DAILY = "daily"  # Por día
    WEEKLY = "weekly"  # Por semana
    AIRPORT = "airport"  # Servicio aeropuerto
    CORPORATE = "corporate"  # Servicio corporativo

class PriorityLevel(enum.Enum):
    """Nivel de prioridad"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"

# ===== TABLAS DE ASOCIACIÓN =====

provider_services = Table(
    'provider_services_association',
    Base.metadata,
    Column('provider_id', UUID(as_uuid=True), ForeignKey('transport_providers.id')),
    Column('service_type', SQLEnum(ServiceType)),
    Column('created_at', DateTime(timezone=True), default=func.now())
)

provider_coverage_areas = Table(
    'provider_coverage_areas',
    Base.metadata,
    Column('provider_id', UUID(as_uuid=True), ForeignKey('transport_providers.id')),
    Column('area_id', UUID(as_uuid=True), ForeignKey('coverage_areas.id')),
    Column('created_at', DateTime(timezone=True), default=func.now())
)

# ===== MODELOS PRINCIPALES =====

class TransportProvider(Base):
    """
    Proveedor de servicios de transporte
    """
    __tablename__ = 'transport_providers'
    
    # Identificadores
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False, index=True)
    
    # Información básica de la empresa
    company_name = Column(String(200), nullable=False)
    trade_name = Column(String(200))  # Nombre comercial
    tax_id = Column(String(50), unique=True, nullable=False)  # NIF/CIF
    license_number = Column(String(100))  # Licencia de transporte
    license_expiry = Column(Date)
    
    # Contacto principal
    primary_contact_name = Column(String(200), nullable=False)
    primary_contact_position = Column(String(100))
    primary_email = Column(String(255), nullable=False)
    primary_phone = Column(String(50), nullable=False)
    primary_mobile = Column(String(50))
    
    # Contacto de emergencia 24/7
    emergency_contact_name = Column(String(200), nullable=False)
    emergency_phone = Column(String(50), nullable=False)
    emergency_email = Column(String(255))
    available_24_7 = Column(Boolean, default=False)
    
    # Contacto operaciones
    operations_contact_name = Column(String(200))
    operations_phone = Column(String(50))
    operations_email = Column(String(255))
    
    # Dirección
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    state_province = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(100), nullable=False)
    
    # Capacidades y servicios
    fleet_size = Column(Integer, default=0)
    drivers_count = Column(Integer, default=0)
    services_offered = relationship('ServiceType', secondary=provider_services)
    coverage_areas = relationship('CoverageArea', secondary=provider_coverage_areas)
    
    # Información financiera
    payment_terms = Column(Integer, default=30)  # Días de pago
    credit_limit = Column(DECIMAL(12, 2))
    currency = Column(String(3), default='EUR')
    bank_account = Column(String(100))
    insurance_policy = Column(String(100))
    insurance_expiry = Column(Date)
    insurance_coverage = Column(DECIMAL(12, 2))  # Cobertura en euros
    
    # Calificación y rendimiento
    rating = Column(Float, default=0.0)
    total_services = Column(Integer, default=0)
    completed_services = Column(Integer, default=0)
    cancelled_services = Column(Integer, default=0)
    on_time_rate = Column(Float, default=100.0)  # Porcentaje de puntualidad
    response_time_hours = Column(Float, default=24.0)  # Tiempo promedio de respuesta
    
    # Configuración
    auto_accept_requests = Column(Boolean, default=False)
    max_advance_booking_days = Column(Integer, default=365)
    min_advance_booking_hours = Column(Integer, default=24)
    cancellation_policy = Column(JSON)
    pricing_rules = Column(JSON)  # Reglas de precios personalizadas
    commission_rate = Column(Float, default=10.0)  # Porcentaje de comisión
    
    # Estado y control
    status = Column(SQLEnum(ProviderStatus), default=ProviderStatus.PENDING_APPROVAL, nullable=False)
    approved_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    approved_at = Column(DateTime(timezone=True))
    suspension_reason = Column(Text)
    notes = Column(Text)
    
    # Documentación
    documents = Column(JSON)  # Lista de documentos subidos
    certifications = Column(JSON)  # Certificaciones especiales
    
    # Metadatos
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Relaciones
    vehicles = relationship('Vehicle', back_populates='provider', cascade='all, delete-orphan')
    drivers = relationship('Driver', back_populates='provider', cascade='all, delete-orphan')
    quotes = relationship('TransportQuote', back_populates='provider')
    services = relationship('TransportService', back_populates='provider')
    
    # Índices
    __table_args__ = (
        Index('idx_provider_status', 'status'),
        Index('idx_provider_rating', 'rating'),
        Index('idx_provider_city', 'city'),
    )


class Vehicle(Base):
    """
    Vehículos de los proveedores
    """
    __tablename__ = 'vehicles'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id = Column(UUID(as_uuid=True), ForeignKey('transport_providers.id'), nullable=False)
    
    # Identificación del vehículo
    plate_number = Column(String(20), unique=True, nullable=False)
    internal_code = Column(String(50))  # Código interno del proveedor
    
    # Características del vehículo
    vehicle_type = Column(SQLEnum(VehicleType), nullable=False)
    brand = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    color = Column(String(50))
    
    # Capacidad
    passenger_capacity = Column(Integer, nullable=False)
    luggage_capacity = Column(Integer)  # Número de maletas
    wheelchair_accessible = Column(Boolean, default=False)
    baby_seats_available = Column(Integer, default=0)
    
    # Comodidades
    amenities = Column(JSON)  # AC, WiFi, USB, TV, etc.
    """
    Ejemplo de amenities:
    {
        "air_conditioning": true,
        "wifi": true,
        "usb_ports": true,
        "tv_screens": false,
        "microphone": true,
        "minibar": false,
        "toilet": false,
        "reclining_seats": true,
        "tables": false,
        "power_outlets": true
    }
    """
    
    # Documentación
    registration_date = Column(Date)
    registration_expiry = Column(Date)
    insurance_policy = Column(String(100))
    insurance_expiry = Column(Date)
    last_inspection_date = Column(Date)
    next_inspection_date = Column(Date)
    
    # Mantenimiento
    odometer_reading = Column(Integer)  # Kilómetros
    last_maintenance_date = Column(Date)
    next_maintenance_date = Column(Date)
    maintenance_history = Column(JSON)
    
    # Estado y disponibilidad
    status = Column(SQLEnum(VehicleStatus), default=VehicleStatus.AVAILABLE)
    current_location = Column(String(500))
    current_driver_id = Column(UUID(as_uuid=True), ForeignKey('drivers.id'))
    
    # Fotos
    photos = Column(JSON)  # URLs de fotos del vehículo
    
    # Tracking
    gps_enabled = Column(Boolean, default=False)
    gps_device_id = Column(String(100))
    last_gps_update = Column(DateTime(timezone=True))
    last_known_position = Column(JSON)  # {lat, lng, address}
    
    # Metadatos
    active = Column(Boolean, default=True)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    provider = relationship('TransportProvider', back_populates='vehicles')
    current_driver = relationship('Driver', foreign_keys=[current_driver_id])
    assignments = relationship('VehicleAssignment', back_populates='vehicle')
    
    # Índices
    __table_args__ = (
        Index('idx_vehicle_type', 'vehicle_type'),
        Index('idx_vehicle_status', 'status'),
        Index('idx_vehicle_capacity', 'passenger_capacity'),
    )


class Driver(Base):
    """
    Conductores de los proveedores
    """
    __tablename__ = 'drivers'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id = Column(UUID(as_uuid=True), ForeignKey('transport_providers.id'), nullable=False)
    
    # Información personal
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    full_name = Column(String(200))  # Computed
    identification_number = Column(String(50), unique=True, nullable=False)  # DNI/Pasaporte
    
    # Contacto
    phone = Column(String(50), nullable=False)
    mobile = Column(String(50))
    email = Column(String(255))
    emergency_contact_name = Column(String(200))
    emergency_contact_phone = Column(String(50))
    
    # Licencias y permisos
    license_number = Column(String(50), nullable=False)
    license_type = Column(String(20))  # B, C, D, etc.
    license_expiry = Column(Date, nullable=False)
    professional_card_number = Column(String(50))  # CAP
    professional_card_expiry = Column(Date)
    
    # Información laboral
    employee_code = Column(String(50))  # Código del empleado en la empresa
    hire_date = Column(Date)
    birth_date = Column(Date)
    nationality = Column(String(100))
    
    # Idiomas
    languages = Column(JSON)  # ["es", "en", "de", etc.]
    
    # Cualificaciones
    certifications = Column(JSON)
    """
    Ejemplo:
    [
        {"name": "First Aid", "expiry": "2024-12-31"},
        {"name": "Defensive Driving", "expiry": "2025-06-30"}
    ]
    """
    
    # Experiencia y rendimiento
    years_experience = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    total_trips = Column(Integer, default=0)
    accidents_count = Column(Integer, default=0)
    complaints_count = Column(Integer, default=0)
    compliments_count = Column(Integer, default=0)
    
    # Disponibilidad
    status = Column(SQLEnum(DriverStatus), default=DriverStatus.AVAILABLE)
    working_hours = Column(JSON)  # Horario de trabajo
    """
    Ejemplo:
    {
        "monday": {"start": "08:00", "end": "18:00"},
        "tuesday": {"start": "08:00", "end": "18:00"},
        ...
    }
    """
    
    # Preferencias
    preferred_routes = Column(JSON)
    preferred_vehicle_types = Column(JSON)
    max_daily_hours = Column(Integer, default=10)
    
    # Foto y documentos
    photo_url = Column(String(500))
    documents = Column(JSON)
    
    # Estado
    active = Column(Boolean, default=True)
    notes = Column(Text)
    last_medical_check = Column(Date)
    next_medical_check = Column(Date)
    
    # Metadatos
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    provider = relationship('TransportProvider', back_populates='drivers')
    assignments = relationship('VehicleAssignment', back_populates='driver')
    
    # Índices
    __table_args__ = (
        Index('idx_driver_status', 'status'),
        Index('idx_driver_provider', 'provider_id'),
    )


class ServiceRequest(Base):
    """
    Solicitud de servicio de transporte por parte del empleado de operaciones
    """
    __tablename__ = 'service_requests'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_number = Column(String(50), unique=True, nullable=False)
    
    # Solicitante
    requested_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    department = Column(String(100))
    
    # Detalles del servicio
    service_type = Column(SQLEnum(ServiceType), nullable=False)
    tour_id = Column(UUID(as_uuid=True), ForeignKey('tours.id'))  # Si está asociado a un tour
    booking_id = Column(UUID(as_uuid=True), ForeignKey('bookings.id'))  # Si está asociado a una reserva
    
    # Fechas y horarios
    service_date = Column(Date, nullable=False)
    pickup_time = Column(Time, nullable=False)
    return_time = Column(Time)
    duration_hours = Column(Float)
    
    # Ubicaciones
    pickup_location = Column(String(500), nullable=False)
    pickup_coordinates = Column(JSON)  # {lat, lng}
    dropoff_location = Column(String(500))
    dropoff_coordinates = Column(JSON)
    stops = Column(JSON)  # Lista de paradas intermedias
    
    # Requerimientos
    passengers_count = Column(Integer, nullable=False)
    luggage_count = Column(Integer, default=0)
    vehicle_type_required = Column(SQLEnum(VehicleType))
    vehicle_types_acceptable = Column(JSON)  # Lista de tipos aceptables
    
    # Requerimientos especiales
    wheelchair_required = Column(Boolean, default=False)
    baby_seats_required = Column(Integer, default=0)
    amenities_required = Column(JSON)
    special_requirements = Column(Text)
    
    # Idiomas
    languages_required = Column(JSON)  # ["es", "en", etc.]
    guide_required = Column(Boolean, default=False)
    
    # Presupuesto
    budget_min = Column(DECIMAL(10, 2))
    budget_max = Column(DECIMAL(10, 2))
    currency = Column(String(3), default='EUR')
    
    # Configuración de cotización
    quote_deadline = Column(DateTime(timezone=True))  # Fecha límite para recibir cotizaciones
    auto_select_best_quote = Column(Boolean, default=False)
    selection_criteria = Column(JSON)  # Criterios de selección automática
    
    # Proveedores
    send_to_all_providers = Column(Boolean, default=False)
    selected_providers = Column(JSON)  # Lista de IDs de proveedores
    excluded_providers = Column(JSON)  # Lista de proveedores excluidos
    
    # Prioridad y urgencia
    priority = Column(SQLEnum(PriorityLevel), default=PriorityLevel.MEDIUM)
    confirmation_required_by = Column(DateTime(timezone=True))  # Fecha límite de confirmación
    
    # Estado
    status = Column(SQLEnum(ServiceRequestStatus), default=ServiceRequestStatus.DRAFT)
    quotes_received_count = Column(Integer, default=0)
    
    # Selección
    selected_quote_id = Column(UUID(as_uuid=True), ForeignKey('transport_quotes.id'))
    selected_at = Column(DateTime(timezone=True))
    selected_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Notas y comunicación
    internal_notes = Column(Text)
    provider_notes = Column(Text)
    
    # Seguimiento
    sent_to_providers_at = Column(DateTime(timezone=True))
    first_quote_received_at = Column(DateTime(timezone=True))
    all_quotes_received_at = Column(DateTime(timezone=True))
    
    # Metadatos
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    cancelled_at = Column(DateTime(timezone=True))
    cancelled_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    cancellation_reason = Column(Text)
    
    # Relaciones
    quotes = relationship('TransportQuote', back_populates='service_request')
    selected_quote = relationship('TransportQuote', foreign_keys=[selected_quote_id])
    service = relationship('TransportService', back_populates='service_request', uselist=False)
    
    # Índices
    __table_args__ = (
        Index('idx_request_status', 'status'),
        Index('idx_request_date', 'service_date'),
        Index('idx_request_priority', 'priority'),
    )


class TransportQuote(Base):
    """
    Cotizaciones de los proveedores para las solicitudes
    """
    __tablename__ = 'transport_quotes'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quote_number = Column(String(50), unique=True, nullable=False)
    
    # Referencias
    service_request_id = Column(UUID(as_uuid=True), ForeignKey('service_requests.id'), nullable=False)
    provider_id = Column(UUID(as_uuid=True), ForeignKey('transport_providers.id'), nullable=False)
    
    # Vehículo y conductor propuesto
    proposed_vehicle_id = Column(UUID(as_uuid=True), ForeignKey('vehicles.id'))
    proposed_driver_id = Column(UUID(as_uuid=True), ForeignKey('drivers.id'))
    
    # Alternativas
    alternative_vehicles = Column(JSON)  # Lista de vehículos alternativos
    alternative_drivers = Column(JSON)  # Lista de conductores alternativos
    
    # Precios
    base_price = Column(DECIMAL(10, 2), nullable=False)
    taxes = Column(DECIMAL(10, 2), default=Decimal('0.00'))
    total_price = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(3), default='EUR')
    
    # Desglose de costos
    price_breakdown = Column(JSON)
    """
    Ejemplo:
    {
        "vehicle": 200.00,
        "driver": 100.00,
        "fuel": 50.00,
        "tolls": 20.00,
        "parking": 10.00,
        "extras": 0.00
    }
    """
    
    # Condiciones
    payment_terms = Column(String(500))
    cancellation_terms = Column(String(500))
    included_services = Column(JSON)
    excluded_services = Column(JSON)
    
    # Validez
    valid_until = Column(DateTime(timezone=True), nullable=False)
    response_time_minutes = Column(Integer)  # Tiempo que tardó en responder
    
    # Estado
    status = Column(SQLEnum(QuoteStatus), default=QuoteStatus.DRAFT)
    
    # Disponibilidad confirmada
    vehicle_available = Column(Boolean, default=True)
    driver_available = Column(Boolean, default=True)
    availability_confirmed_at = Column(DateTime(timezone=True))
    
    # Notas
    provider_notes = Column(Text)
    internal_notes = Column(Text)
    
    # Puntuación (para comparación)
    price_score = Column(Float)  # Puntuación basada en precio
    quality_score = Column(Float)  # Puntuación basada en calidad
    total_score = Column(Float)  # Puntuación total
    
    # Metadatos
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True))
    viewed_at = Column(DateTime(timezone=True))
    accepted_at = Column(DateTime(timezone=True))
    rejected_at = Column(DateTime(timezone=True))
    rejection_reason = Column(Text)
    
    # Relaciones
    service_request = relationship('ServiceRequest', back_populates='quotes', foreign_keys=[service_request_id])
    provider = relationship('TransportProvider', back_populates='quotes')
    proposed_vehicle = relationship('Vehicle')
    proposed_driver = relationship('Driver')
    
    # Índices
    __table_args__ = (
        Index('idx_quote_request', 'service_request_id'),
        Index('idx_quote_provider', 'provider_id'),
        Index('idx_quote_status', 'status'),
    )


class TransportService(Base):
    """
    Servicio de transporte confirmado y en ejecución
    """
    __tablename__ = 'transport_services'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_number = Column(String(50), unique=True, nullable=False)
    
    # Referencias
    service_request_id = Column(UUID(as_uuid=True), ForeignKey('service_requests.id'), nullable=False)
    quote_id = Column(UUID(as_uuid=True), ForeignKey('transport_quotes.id'), nullable=False)
    provider_id = Column(UUID(as_uuid=True), ForeignKey('transport_providers.id'), nullable=False)
    
    # Asignaciones confirmadas
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey('vehicles.id'), nullable=False)
    driver_id = Column(UUID(as_uuid=True), ForeignKey('drivers.id'), nullable=False)
    
    # Confirmación
    confirmed_at = Column(DateTime(timezone=True))
    confirmed_by_provider = Column(Boolean, default=False)
    provider_confirmation_at = Column(DateTime(timezone=True))
    provider_confirmation_code = Column(String(50))
    
    # Detalles del servicio confirmado
    final_price = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(3), default='EUR')
    
    # Ejecución del servicio
    actual_pickup_time = Column(DateTime(timezone=True))
    actual_dropoff_time = Column(DateTime(timezone=True))
    actual_duration_hours = Column(Float)
    
    # Tracking
    tracking_enabled = Column(Boolean, default=False)
    tracking_url = Column(String(500))
    current_location = Column(JSON)  # {lat, lng, timestamp}
    route_taken = Column(JSON)  # Lista de coordenadas
    
    # Pasajeros
    passenger_manifest = Column(JSON)  # Lista de pasajeros
    actual_passenger_count = Column(Integer)
    no_shows = Column(JSON)  # Lista de no-shows
    
    # Incidencias
    incidents = Column(JSON)
    delays = Column(JSON)
    
    # Evaluación
    service_rating = Column(Integer)  # 1-5
    driver_rating = Column(Integer)  # 1-5
    vehicle_rating = Column(Integer)  # 1-5
    punctuality_rating = Column(Integer)  # 1-5
    feedback = Column(Text)
    complaints = Column(JSON)
    
    # Estado
    status = Column(String(50), default='pending')  # pending, confirmed, in_progress, completed, cancelled
    
    # Facturación
    invoice_number = Column(String(50))
    invoice_date = Column(Date)
    payment_status = Column(String(50), default='pending')  # pending, paid, overdue
    payment_date = Column(Date)
    
    # Metadatos
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Relaciones
    service_request = relationship('ServiceRequest', back_populates='service')
    provider = relationship('TransportProvider', back_populates='services')
    vehicle = relationship('Vehicle')
    driver = relationship('Driver')
    assignment = relationship('VehicleAssignment', back_populates='service', uselist=False)
    
    # Índices
    __table_args__ = (
        Index('idx_service_status', 'status'),
        Index('idx_service_date', 'created_at'),
        Index('idx_service_provider', 'provider_id'),
    )


class VehicleAssignment(Base):
    """
    Asignaciones de vehículos y conductores
    """
    __tablename__ = 'vehicle_assignments'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Referencias
    service_id = Column(UUID(as_uuid=True), ForeignKey('transport_services.id'), nullable=False)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey('vehicles.id'), nullable=False)
    driver_id = Column(UUID(as_uuid=True), ForeignKey('drivers.id'), nullable=False)
    
    # Período
    start_datetime = Column(DateTime(timezone=True), nullable=False)
    end_datetime = Column(DateTime(timezone=True), nullable=False)
    
    # Estado
    status = Column(String(50), default='assigned')  # assigned, in_progress, completed, cancelled
    
    # Confirmaciones
    driver_confirmed = Column(Boolean, default=False)
    driver_confirmation_at = Column(DateTime(timezone=True))
    vehicle_ready = Column(Boolean, default=False)
    vehicle_ready_at = Column(DateTime(timezone=True))
    
    # Kilometraje
    start_odometer = Column(Integer)
    end_odometer = Column(Integer)
    total_kilometers = Column(Integer)
    
    # Combustible
    fuel_start = Column(Float)  # Porcentaje o litros
    fuel_end = Column(Float)
    fuel_consumed = Column(Float)
    
    # Notas
    pre_trip_inspection = Column(JSON)
    post_trip_inspection = Column(JSON)
    driver_notes = Column(Text)
    
    # Metadatos
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    service = relationship('TransportService', back_populates='assignment')
    vehicle = relationship('Vehicle', back_populates='assignments')
    driver = relationship('Driver', back_populates='assignments')
    
    # Índices
    __table_args__ = (
        Index('idx_assignment_dates', 'start_datetime', 'end_datetime'),
        Index('idx_assignment_vehicle', 'vehicle_id'),
        Index('idx_assignment_driver', 'driver_id'),
    )


class CoverageArea(Base):
    """
    Áreas de cobertura para los proveedores
    """
    __tablename__ = 'coverage_areas'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    area_type = Column(String(50))  # city, region, country, zone
    
    # Definición geográfica
    country = Column(String(100))
    state_province = Column(String(100))
    city = Column(String(100))
    zone = Column(String(100))
    
    # Polígono o radio
    coordinates = Column(JSON)  # Polígono de coordenadas o centro + radio
    
    # Metadatos
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Índices
    __table_args__ = (
        Index('idx_coverage_area_name', 'name'),
        Index('idx_coverage_area_city', 'city'),
    )


class TransportNotification(Base):
    """
    Notificaciones del sistema de transporte
    """
    __tablename__ = 'transport_notifications'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Destinatario
    recipient_type = Column(String(50))  # user, provider, driver
    recipient_id = Column(UUID(as_uuid=True))
    
    # Tipo de notificación
    notification_type = Column(String(50))
    # new_request, quote_received, quote_accepted, service_confirmed, 
    # service_started, service_completed, deadline_approaching, etc.
    
    # Contenido
    title = Column(String(200))
    message = Column(Text)
    data = Column(JSON)  # Datos adicionales
    
    # Estado
    sent = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True))
    read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True))
    
    # Canal
    channel = Column(String(50))  # email, sms, push, in_app
    
    # Referencias
    service_request_id = Column(UUID(as_uuid=True), ForeignKey('service_requests.id'))
    quote_id = Column(UUID(as_uuid=True), ForeignKey('transport_quotes.id'))
    service_id = Column(UUID(as_uuid=True), ForeignKey('transport_services.id'))
    
    # Metadatos
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Índices
    __table_args__ = (
        Index('idx_notification_recipient', 'recipient_type', 'recipient_id'),
        Index('idx_notification_sent', 'sent'),
        Index('idx_notification_read', 'read'),
    )