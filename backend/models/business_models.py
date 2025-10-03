#!/usr/bin/env python3
"""
Business Models for B2C/B2B/B2B2C Operations
Modelos completos para operadores turísticos, agencias y distribuidores
"""

from typing import List, Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table, Text, DateTime, JSON, Enum as SQLEnum, DECIMAL, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid
import enum
from decimal import Decimal
from pydantic import BaseModel

# Use the same Base as rbac_models
try:
    from .rbac_models import Base
except ImportError:
    # Fallback for when rbac_models is not available
    from sqlalchemy.ext.declarative import declarative_base
    Base = declarative_base()

class CustomerType(enum.Enum):
    """Tipos de cliente en el sistema"""
    B2C_DIRECT = "b2c_direct"  # Cliente directo de Spirit Tours
    B2B_TOUR_OPERATOR = "b2b_tour_operator"  # Operador turístico
    B2B_TRAVEL_AGENCY = "b2b_travel_agency"  # Agencia de viajes
    B2B_DISTRIBUTOR = "b2b_distributor"  # Distribuidor/Partner
    B2B2C_RESELLER = "b2b2c_reseller"  # Revendedor B2B2C

class CommissionType(enum.Enum):
    """Tipos de comisión"""
    PERCENTAGE = "percentage"  # Porcentaje sobre venta
    FIXED_AMOUNT = "fixed_amount"  # Cantidad fija
    TIERED = "tiered"  # Por niveles de volumen
    OVERRIDE = "override"  # Comisión adicional por volumen

class PaymentTerms(enum.Enum):
    """Términos de pago"""
    IMMEDIATE = "immediate"  # Pago inmediato
    NET_7 = "net_7"  # 7 días
    NET_15 = "net_15"  # 15 días  
    NET_30 = "net_30"  # 30 días
    NET_45 = "net_45"  # 45 días
    NET_60 = "net_60"  # 60 días

class BookingChannel(enum.Enum):
    """Canales de reserva"""
    DIRECT_WEBSITE = "direct_website"  # Web directa Spirit Tours
    DIRECT_PHONE = "direct_phone"  # Teléfono directo
    TOUR_OPERATOR_API = "tour_operator_api"  # API Tour Operator
    AGENCY_PORTAL = "agency_portal"  # Portal agencia
    DISTRIBUTOR_SYSTEM = "distributor_system"  # Sistema distribuidor
    MOBILE_APP = "mobile_app"  # App móvil
    THIRD_PARTY_OTA = "third_party_ota"  # OTA terceros

# ============================
# TOUR OPERATORS (B2B)
# ============================

class TourOperator(Base):
    """Operadores turísticos que manejan múltiples agencias"""
    __tablename__ = 'tour_operators'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic Information
    company_name = Column(String(200), nullable=False)
    business_name = Column(String(200), nullable=True)  # Razón social
    tax_id = Column(String(50), unique=True, nullable=False)  # NIF/CIF
    registration_number = Column(String(100), nullable=True)
    
    # Contact Information
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20), nullable=False)
    website = Column(String(200), nullable=True)
    
    # Address
    address_line1 = Column(String(200), nullable=False)
    address_line2 = Column(String(200), nullable=True)
    city = Column(String(100), nullable=False)
    state_province = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=False)
    country = Column(String(100), nullable=False)
    
    # Business Details
    license_number = Column(String(100), nullable=True)  # Licencia turística
    license_expiry = Column(DateTime(timezone=True), nullable=True)
    insurance_policy = Column(String(100), nullable=True)
    insurance_expiry = Column(DateTime(timezone=True), nullable=True)
    
    # Commercial Terms
    credit_limit = Column(DECIMAL(12, 2), default=Decimal('0.00'))
    payment_terms = Column(SQLEnum(PaymentTerms), default=PaymentTerms.NET_30)
    currency = Column(String(3), default='EUR')
    
    # Status and Control
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    max_agencies = Column(Integer, default=10)  # Máximo de agencias
    total_agencies = Column(Integer, default=0)  # Agencias registradas
    
    # Performance Metrics
    total_bookings = Column(Integer, default=0)
    total_revenue = Column(DECIMAL(12, 2), default=Decimal('0.00'))
    total_commission = Column(DECIMAL(12, 2), default=Decimal('0.00'))
    
    # Dates
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_activity = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    travel_agencies = relationship("TravelAgency", back_populates="tour_operator", cascade="all, delete-orphan")
    commission_rules = relationship("CommissionRule", back_populates="tour_operator")
    bookings = relationship("BusinessBooking", back_populates="tour_operator")

# ============================
# TRAVEL AGENCIES (B2B)
# ============================

class TravelAgency(Base):
    """Agencias de viaje bajo operadores turísticos"""
    __tablename__ = 'travel_agencies'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tour_operator_id = Column(UUID(as_uuid=True), ForeignKey('tour_operators.id'), nullable=False)
    
    # Basic Information
    agency_name = Column(String(200), nullable=False)
    business_name = Column(String(200), nullable=True)
    agency_code = Column(String(20), unique=True, nullable=False)  # Código único
    tax_id = Column(String(50), nullable=True)
    
    # Contact Information
    email = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    website = Column(String(200), nullable=True)
    
    # Address
    address_line1 = Column(String(200), nullable=False)
    address_line2 = Column(String(200), nullable=True)
    city = Column(String(100), nullable=False)
    state_province = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=False)
    country = Column(String(100), nullable=False)
    
    # Commercial Terms
    credit_limit = Column(DECIMAL(12, 2), default=Decimal('0.00'))
    payment_terms = Column(SQLEnum(PaymentTerms), default=PaymentTerms.NET_15)
    
    # Status and Control
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    max_agents = Column(Integer, default=5)  # Máximo de agentes
    total_agents = Column(Integer, default=0)  # Agentes registrados
    
    # Performance Metrics
    total_bookings = Column(Integer, default=0)
    total_revenue = Column(DECIMAL(12, 2), default=Decimal('0.00'))
    total_commission = Column(DECIMAL(12, 2), default=Decimal('0.00'))
    
    # Dates
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_activity = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    tour_operator = relationship("TourOperator", back_populates="travel_agencies")
    sales_agents = relationship("SalesAgent", back_populates="travel_agency", cascade="all, delete-orphan")
    bookings = relationship("BusinessBooking", back_populates="travel_agency")

# ============================
# SALES AGENTS (B2B)
# ============================

class SalesAgent(Base):
    """Agentes de ventas de las agencias"""
    __tablename__ = 'sales_agents'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    travel_agency_id = Column(UUID(as_uuid=True), ForeignKey('travel_agencies.id'), nullable=False)
    
    # Personal Information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    agent_code = Column(String(20), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20), nullable=False)
    
    # Professional Details
    employee_id = Column(String(50), nullable=True)
    hire_date = Column(DateTime(timezone=True), nullable=True)
    territory = Column(String(100), nullable=True)
    specialization = Column(String(100), nullable=True)  # Cruceros, Europa, etc.
    
    # Performance Metrics
    sales_target_monthly = Column(DECIMAL(10, 2), default=Decimal('0.00'))
    total_bookings = Column(Integer, default=0)
    total_sales = Column(DECIMAL(12, 2), default=Decimal('0.00'))
    total_commission = Column(DECIMAL(12, 2), default=Decimal('0.00'))
    
    # Status
    is_active = Column(Boolean, default=True)
    can_create_bookings = Column(Boolean, default=True)
    can_modify_bookings = Column(Boolean, default=False)
    can_cancel_bookings = Column(Boolean, default=False)
    
    # Dates
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    travel_agency = relationship("TravelAgency", back_populates="sales_agents")
    bookings = relationship("BusinessBooking", back_populates="sales_agent")

# ============================
# COMMISSION RULES
# ============================

class CommissionRule(Base):
    """Reglas de comisión por operador/agencia"""
    __tablename__ = 'commission_rules'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tour_operator_id = Column(UUID(as_uuid=True), ForeignKey('tour_operators.id'), nullable=False)
    
    # Rule Details
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    commission_type = Column(SQLEnum(CommissionType), nullable=False)
    
    # Commission Values
    percentage_rate = Column(Float, nullable=True)  # Para percentage type
    fixed_amount = Column(DECIMAL(10, 2), nullable=True)  # Para fixed_amount type
    tier_rules = Column(JSON, nullable=True)  # Para tiered type
    
    # Conditions
    min_booking_amount = Column(DECIMAL(10, 2), default=Decimal('0.00'))
    max_booking_amount = Column(DECIMAL(12, 2), nullable=True)
    applicable_products = Column(JSON, nullable=True)  # Product IDs
    applicable_destinations = Column(JSON, nullable=True)
    
    # Validity
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Dates
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tour_operator = relationship("TourOperator", back_populates="commission_rules")

# ============================
# BUSINESS BOOKINGS
# ============================

class BusinessBooking(Base):
    """Reservas con información de canal B2B/B2C"""
    __tablename__ = 'business_bookings'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Original Booking Reference
    original_booking_id = Column(String(100), nullable=False)  # Del booking_system.py
    booking_reference = Column(String(20), unique=True, nullable=False)
    
    # Customer Type and Channel
    customer_type = Column(SQLEnum(CustomerType), nullable=False)
    booking_channel = Column(SQLEnum(BookingChannel), nullable=False)
    
    # B2B Information (nullable for B2C)
    tour_operator_id = Column(UUID(as_uuid=True), ForeignKey('tour_operators.id'), nullable=True)
    travel_agency_id = Column(UUID(as_uuid=True), ForeignKey('travel_agencies.id'), nullable=True)
    sales_agent_id = Column(UUID(as_uuid=True), ForeignKey('sales_agents.id'), nullable=True)
    
    # Financial Information
    gross_amount = Column(DECIMAL(12, 2), nullable=False)  # Precio bruto
    net_amount = Column(DECIMAL(12, 2), nullable=False)    # Precio neto (después comisión)
    commission_amount = Column(DECIMAL(12, 2), default=Decimal('0.00'))  # Comisión
    commission_percentage = Column(Float, default=0.0)
    currency = Column(String(3), default='EUR')
    
    # Customer Information
    customer_email = Column(String(100), nullable=False)
    customer_name = Column(String(200), nullable=False)
    customer_phone = Column(String(20), nullable=True)
    
    # Booking Details
    product_name = Column(String(200), nullable=False)
    destination = Column(String(100), nullable=False)
    travel_date = Column(DateTime(timezone=True), nullable=False)
    participants = Column(Integer, nullable=False)
    
    # Status and Payments
    booking_status = Column(String(20), nullable=False)  # pending, confirmed, cancelled, etc.
    payment_status = Column(String(20), nullable=False)
    commission_paid = Column(Boolean, default=False)
    
    # Dates
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    tour_operator = relationship("TourOperator", back_populates="bookings")
    travel_agency = relationship("TravelAgency", back_populates="bookings")
    sales_agent = relationship("SalesAgent", back_populates="bookings")

# ============================
# PAYMENT STATEMENTS
# ============================

class PaymentStatement(Base):
    """Extractos de pago para operadores/agencias"""
    __tablename__ = 'payment_statements'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Statement Details
    statement_number = Column(String(50), unique=True, nullable=False)
    tour_operator_id = Column(UUID(as_uuid=True), ForeignKey('tour_operators.id'), nullable=True)
    travel_agency_id = Column(UUID(as_uuid=True), ForeignKey('travel_agencies.id'), nullable=True)
    
    # Period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Financial Summary
    total_bookings = Column(Integer, default=0)
    gross_revenue = Column(DECIMAL(12, 2), default=Decimal('0.00'))
    total_commission = Column(DECIMAL(12, 2), default=Decimal('0.00'))
    net_amount = Column(DECIMAL(12, 2), default=Decimal('0.00'))
    
    # Booking Details (JSON)
    booking_details = Column(JSON, nullable=True)  # Lista de reservas del período
    
    # Status
    is_finalized = Column(Boolean, default=False)
    payment_due_date = Column(DateTime(timezone=True), nullable=True)
    payment_status = Column(String(20), default='pending')  # pending, paid, overdue
    
    # Dates
    generated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    paid_at = Column(DateTime(timezone=True), nullable=True)

# ============================
# PYDANTIC MODELS FOR API
# ============================

class TourOperatorCreate(BaseModel):
    company_name: str
    business_name: Optional[str] = None
    tax_id: str
    email: str
    phone: str
    website: Optional[str] = None
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state_province: Optional[str] = None
    postal_code: str
    country: str
    credit_limit: Optional[Decimal] = Decimal('0.00')
    payment_terms: PaymentTerms = PaymentTerms.NET_30

class TravelAgencyCreate(BaseModel):
    tour_operator_id: str
    agency_name: str
    business_name: Optional[str] = None
    agency_code: str
    email: str
    phone: str
    address_line1: str
    city: str
    postal_code: str
    country: str
    max_agents: int = 5

class SalesAgentCreate(BaseModel):
    travel_agency_id: str
    first_name: str
    last_name: str
    agent_code: str
    email: str
    phone: str
    territory: Optional[str] = None
    specialization: Optional[str] = None
    sales_target_monthly: Optional[Decimal] = Decimal('0.00')

class BusinessBookingCreate(BaseModel):
    original_booking_id: str
    customer_type: CustomerType
    booking_channel: BookingChannel
    tour_operator_id: Optional[str] = None
    travel_agency_id: Optional[str] = None
    sales_agent_id: Optional[str] = None
    gross_amount: Decimal
    customer_email: str
    customer_name: str
    product_name: str
    destination: str
    travel_date: datetime
    participants: int

class TourOperatorResponse(BaseModel):
    id: str
    company_name: str
    email: str
    phone: str
    city: str
    country: str
    is_active: bool
    is_verified: bool
    total_agencies: int
    total_bookings: int
    total_revenue: Decimal
    created_at: datetime

class PaymentStatementResponse(BaseModel):
    id: str
    statement_number: str
    period_start: datetime
    period_end: datetime
    total_bookings: int
    gross_revenue: Decimal
    total_commission: Decimal
    net_amount: Decimal
    payment_status: str
    generated_at: datetime