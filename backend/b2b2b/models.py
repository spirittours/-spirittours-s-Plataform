"""
B2B2B Multi-tier Agent Data Models.

Comprehensive data models for agent hierarchy, commissions, and bookings.
"""
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, EmailStr, validator
from decimal import Decimal


class AgentTier(str, Enum):
    """Agent tier levels."""
    MASTER = "master"  # Top-level master agent
    SUPER = "super"  # Super agent (can have sub-agents)
    STANDARD = "standard"  # Standard agent
    SUB = "sub"  # Sub-agent (lowest level)


class AgentStatus(str, Enum):
    """Agent account status."""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"
    INACTIVE = "inactive"


class CommissionType(str, Enum):
    """Commission calculation type."""
    PERCENTAGE = "percentage"  # Percentage of booking value
    FIXED = "fixed"  # Fixed amount per booking
    TIERED = "tiered"  # Tiered based on volume
    HYBRID = "hybrid"  # Combination of percentage and fixed


class CommissionStatus(str, Enum):
    """Commission payment status."""
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class PaymentMethod(str, Enum):
    """Payment methods for commission."""
    BANK_TRANSFER = "bank_transfer"
    CREDIT_NOTE = "credit_note"
    WALLET = "wallet"
    CHECK = "check"


class Agent(BaseModel):
    """
    Agent model representing B2B2B agent hierarchy.
    
    Supports unlimited depth hierarchy with parent-child relationships.
    """
    id: Optional[int] = None
    agent_code: str = Field(..., description="Unique agent code", min_length=3, max_length=20)
    
    # Company Information
    company_name: str = Field(..., description="Legal company name")
    trade_name: Optional[str] = Field(None, description="Trading name")
    legal_entity_type: str = Field(..., description="Legal entity type")
    tax_id: str = Field(..., description="Tax identification number")
    
    # Contact Information
    email: EmailStr = Field(..., description="Primary email")
    phone: str = Field(..., description="Primary phone")
    address: str = Field(..., description="Full address")
    city: str = Field(..., description="City")
    country: str = Field(..., description="Country code", min_length=2, max_length=2)
    postal_code: str = Field(..., description="Postal code")
    
    # Contact Person
    contact_name: str = Field(..., description="Primary contact person")
    contact_position: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    
    # Agent Hierarchy
    tier: AgentTier = Field(..., description="Agent tier level")
    parent_agent_id: Optional[int] = Field(None, description="Parent agent ID")
    parent_agent_code: Optional[str] = Field(None, description="Parent agent code")
    depth_level: int = Field(0, description="Depth in hierarchy (0=master)")
    
    # Status and Permissions
    status: AgentStatus = Field(AgentStatus.PENDING, description="Account status")
    is_verified: bool = Field(False, description="Email/document verification status")
    can_create_sub_agents: bool = Field(False, description="Can create sub-agents")
    max_sub_agents: Optional[int] = Field(None, description="Maximum sub-agents allowed")
    
    # Financial Settings
    credit_limit: Decimal = Field(Decimal("0"), description="Credit limit")
    current_credit: Decimal = Field(Decimal("0"), description="Current credit used")
    payment_terms_days: int = Field(30, description="Payment terms in days")
    currency: str = Field("EUR", description="Primary currency")
    
    # Commission Settings
    commission_type: CommissionType = Field(CommissionType.PERCENTAGE)
    commission_rate: Decimal = Field(Decimal("0"), description="Commission percentage/amount")
    override_parent_commission: bool = Field(False, description="Override parent commission")
    
    # White Label Settings
    white_label_enabled: bool = Field(False, description="White label enabled")
    custom_domain: Optional[str] = Field(None, description="Custom domain")
    brand_name: Optional[str] = Field(None, description="Brand name")
    logo_url: Optional[str] = Field(None, description="Logo URL")
    primary_color: Optional[str] = Field(None, description="Primary brand color")
    secondary_color: Optional[str] = Field(None, description="Secondary brand color")
    
    # API Access
    api_enabled: bool = Field(False, description="API access enabled")
    api_key: Optional[str] = Field(None, description="API key")
    api_secret: Optional[str] = Field(None, description="API secret")
    xml_feed_enabled: bool = Field(False, description="XML feed enabled")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[int] = None
    
    # Computed fields
    total_bookings: Optional[int] = Field(0, description="Total bookings count")
    total_revenue: Optional[Decimal] = Field(Decimal("0"), description="Total revenue")
    total_commission: Optional[Decimal] = Field(Decimal("0"), description="Total commission earned")
    
    class Config:
        json_schema_extra = {
            "example": {
                "agent_code": "AG001",
                "company_name": "Travel Agency Ltd",
                "email": "contact@travelagency.com",
                "phone": "+34912345678",
                "address": "123 Main St",
                "city": "Madrid",
                "country": "ES",
                "postal_code": "28001",
                "contact_name": "John Doe",
                "tier": "standard",
                "commission_type": "percentage",
                "commission_rate": "10.0"
            }
        }


class AgentCreateRequest(BaseModel):
    """Request to create new agent."""
    agent_code: str = Field(..., min_length=3, max_length=20)
    company_name: str
    trade_name: Optional[str] = None
    legal_entity_type: str
    tax_id: str
    email: EmailStr
    phone: str
    address: str
    city: str
    country: str = Field(..., min_length=2, max_length=2)
    postal_code: str
    contact_name: str
    contact_position: Optional[str] = None
    tier: AgentTier
    parent_agent_code: Optional[str] = None
    credit_limit: Decimal = Decimal("0")
    commission_type: CommissionType = CommissionType.PERCENTAGE
    commission_rate: Decimal = Decimal("0")
    white_label_enabled: bool = False
    api_enabled: bool = False


class AgentUpdateRequest(BaseModel):
    """Request to update agent."""
    company_name: Optional[str] = None
    trade_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    contact_name: Optional[str] = None
    status: Optional[AgentStatus] = None
    credit_limit: Optional[Decimal] = None
    commission_type: Optional[CommissionType] = None
    commission_rate: Optional[Decimal] = None
    white_label_enabled: Optional[bool] = None


class Commission(BaseModel):
    """
    Commission record for agent bookings.
    
    Tracks commission earned, calculated, and paid to agents.
    """
    id: Optional[int] = None
    commission_code: str = Field(..., description="Unique commission code")
    
    # Agent Information
    agent_id: int = Field(..., description="Agent ID")
    agent_code: str = Field(..., description="Agent code")
    agent_tier: AgentTier = Field(..., description="Agent tier")
    
    # Booking Reference
    booking_id: int = Field(..., description="Related booking ID")
    booking_reference: str = Field(..., description="Booking reference")
    booking_type: str = Field(..., description="Booking type (flight, hotel, etc)")
    
    # Financial Details
    booking_amount: Decimal = Field(..., description="Total booking amount")
    commission_type: CommissionType = Field(..., description="Commission type")
    commission_rate: Decimal = Field(..., description="Commission rate/amount")
    commission_amount: Decimal = Field(..., description="Calculated commission")
    parent_commission_amount: Optional[Decimal] = Field(None, description="Parent agent commission")
    net_commission: Decimal = Field(..., description="Net commission (after parent)")
    
    # Currency
    currency: str = Field("EUR", description="Currency code")
    
    # Status
    status: CommissionStatus = Field(CommissionStatus.PENDING)
    payment_method: Optional[PaymentMethod] = None
    
    # Payment Details
    approved_at: Optional[datetime] = None
    approved_by: Optional[int] = None
    paid_at: Optional[datetime] = None
    paid_by: Optional[int] = None
    payment_reference: Optional[str] = None
    payment_notes: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "commission_code": "COM-001",
                "agent_id": 1,
                "agent_code": "AG001",
                "booking_id": 100,
                "booking_reference": "BKG-001",
                "booking_amount": "1000.00",
                "commission_rate": "10.0",
                "commission_amount": "100.00",
                "status": "pending"
            }
        }


class AgentBooking(BaseModel):
    """
    Booking created by agent through B2B2B system.
    
    Links bookings to agents for commission tracking.
    """
    id: Optional[int] = None
    booking_reference: str = Field(..., description="Booking reference")
    
    # Agent Information
    agent_id: int = Field(..., description="Agent ID")
    agent_code: str = Field(..., description="Agent code")
    agent_tier: AgentTier = Field(..., description="Agent tier")
    
    # Booking Details
    booking_type: str = Field(..., description="Booking type")
    booking_date: datetime = Field(default_factory=datetime.utcnow)
    travel_date: date = Field(..., description="Travel date")
    
    # Passenger Details
    passenger_count: int = Field(..., description="Number of passengers")
    passenger_names: List[str] = Field(..., description="Passenger names")
    
    # Financial Details
    total_amount: Decimal = Field(..., description="Total booking amount")
    agent_price: Decimal = Field(..., description="Price for agent")
    markup: Decimal = Field(..., description="Agent markup")
    currency: str = Field("EUR", description="Currency")
    
    # Commission Details
    commission_eligible: bool = Field(True, description="Eligible for commission")
    commission_calculated: bool = Field(False, description="Commission calculated")
    commission_id: Optional[int] = Field(None, description="Related commission ID")
    
    # Payment Status
    payment_status: str = Field("pending", description="Payment status")
    paid_at: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[int] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "booking_reference": "BKG-001",
                "agent_id": 1,
                "agent_code": "AG001",
                "booking_type": "flight",
                "travel_date": "2025-12-01",
                "passenger_count": 2,
                "total_amount": "1000.00",
                "agent_price": "900.00",
                "markup": "100.00"
            }
        }


class AgentHierarchyNode(BaseModel):
    """Agent hierarchy tree node."""
    agent: Agent
    children: List['AgentHierarchyNode'] = []
    depth: int = 0
    
    class Config:
        # Enable recursive models
        arbitrary_types_allowed = True


class AgentPerformanceMetrics(BaseModel):
    """Agent performance metrics."""
    agent_id: int
    agent_code: str
    period_start: date
    period_end: date
    
    # Booking Metrics
    total_bookings: int = 0
    total_passengers: int = 0
    total_revenue: Decimal = Decimal("0")
    average_booking_value: Decimal = Decimal("0")
    
    # Commission Metrics
    total_commission: Decimal = Decimal("0")
    pending_commission: Decimal = Decimal("0")
    paid_commission: Decimal = Decimal("0")
    
    # Sub-Agent Metrics (if applicable)
    total_sub_agents: int = 0
    active_sub_agents: int = 0
    sub_agent_revenue: Decimal = Decimal("0")
    sub_agent_commission: Decimal = Decimal("0")
    
    # Growth Metrics
    booking_growth_rate: Optional[Decimal] = None
    revenue_growth_rate: Optional[Decimal] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "agent_id": 1,
                "agent_code": "AG001",
                "period_start": "2025-01-01",
                "period_end": "2025-01-31",
                "total_bookings": 50,
                "total_revenue": "50000.00",
                "total_commission": "5000.00"
            }
        }


class WhiteLabelConfig(BaseModel):
    """White label branding configuration."""
    agent_id: int
    agent_code: str
    
    # Domain Settings
    custom_domain: str = Field(..., description="Custom domain")
    ssl_enabled: bool = Field(True, description="SSL enabled")
    
    # Branding
    brand_name: str = Field(..., description="Brand name")
    logo_url: str = Field(..., description="Logo URL")
    favicon_url: Optional[str] = None
    
    # Colors
    primary_color: str = Field(..., description="Primary color hex")
    secondary_color: str = Field(..., description="Secondary color hex")
    accent_color: Optional[str] = None
    
    # Contact Information
    support_email: EmailStr
    support_phone: str
    
    # Social Media
    facebook_url: Optional[str] = None
    twitter_url: Optional[str] = None
    instagram_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    
    # Legal
    terms_url: Optional[str] = None
    privacy_url: Optional[str] = None
    
    # Custom CSS
    custom_css: Optional[str] = Field(None, description="Custom CSS")
    
    # Metadata
    enabled: bool = Field(True, description="White label enabled")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "agent_id": 1,
                "agent_code": "AG001",
                "custom_domain": "travel.example.com",
                "brand_name": "Example Travel",
                "logo_url": "https://cdn.example.com/logo.png",
                "primary_color": "#FF6B35",
                "secondary_color": "#004E89",
                "support_email": "support@example.com",
                "support_phone": "+34912345678"
            }
        }


# Enable forward references for recursive models
AgentHierarchyNode.model_rebuild()
