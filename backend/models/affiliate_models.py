"""
Affiliate Models for TAAP (Travel Agency Affiliate Program)
Complete models for affiliate system with multi-tier commissions
"""

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table, Text, DateTime, JSON, Enum as SQLEnum, DECIMAL, Float, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum
from decimal import Decimal

from backend.models.rbac_models import Base

# ========================================
# ENUMS
# ========================================

class AffiliateType(enum.Enum):
    """Types of affiliates in the system"""
    INDIVIDUAL = "individual"  # Bloggers, influencers
    PROFESSIONAL_AGENT = "professional_agent"  # Certified travel agents
    AGENCY_PARTNER = "agency_partner"  # Established agencies
    ENTERPRISE_PARTNER = "enterprise_partner"  # OTAs, corporates
    TECHNOLOGY_PARTNER = "technology_partner"  # Apps, metasearch

class AffiliateTier(enum.Enum):
    """Performance tiers with different commission rates"""
    STARTER = "starter"  # < $10k/month
    SILVER = "silver"  # $10k-50k/month
    GOLD = "gold"  # $50k-200k/month
    PLATINUM = "platinum"  # > $200k/month
    DIAMOND = "diamond"  # Elite partners

class AffiliateStatus(enum.Enum):
    """Affiliate account status"""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"
    ON_HOLD = "on_hold"

class ConversionStatus(enum.Enum):
    """Conversion/sale status"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PAID = "paid"

class PaymentStatus(enum.Enum):
    """Payment status"""
    PENDING = "pending"
    PROCESSING = "processing"
    PAID = "paid"
    FAILED = "failed"
    CANCELLED = "cancelled"

class PaymentMethod(enum.Enum):
    """Available payment methods"""
    BANK_TRANSFER = "bank_transfer"
    PAYPAL = "paypal"
    STRIPE = "stripe"
    CRYPTO_USDT = "crypto_usdt"
    CRYPTO_USDC = "crypto_usdc"
    CHECK = "check"
    WIRE = "wire"

class AttributionModel(enum.Enum):
    """Attribution models for multi-touch journeys"""
    LAST_CLICK = "last_click"
    FIRST_CLICK = "first_click"
    LINEAR = "linear"
    TIME_DECAY = "time_decay"
    POSITION_BASED = "position_based"

# ========================================
# MAIN MODELS
# ========================================

class Affiliate(Base):
    """Main affiliate model"""
    __tablename__ = 'affiliates'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    affiliate_code = Column(String(50), unique=True, nullable=False, index=True)
    
    # Type and Tier
    type = Column(SQLEnum(AffiliateType), default=AffiliateType.INDIVIDUAL, nullable=False)
    tier = Column(SQLEnum(AffiliateTier), default=AffiliateTier.STARTER, nullable=False)
    
    # Personal/Company Information
    name = Column(String(200), nullable=False)
    company_name = Column(String(200))
    tax_id = Column(String(50))
    website = Column(String(500))
    social_media = Column(JSON)  # {facebook: url, instagram: url, etc}
    bio = Column(Text)
    
    # Contact Information
    email = Column(String(200), unique=True, nullable=False, index=True)
    phone = Column(String(50))
    whatsapp = Column(String(50))
    telegram = Column(String(100))
    
    # Address
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    
    # Commission Configuration
    base_commission_rate = Column(DECIMAL(5, 2), default=8.00)
    tier_commission_rate = Column(DECIMAL(5, 2))  # Calculated based on tier
    custom_commission = Column(JSON)  # Product-specific rates
    bonus_rate = Column(DECIMAL(5, 2), default=0.00)
    
    # Payment Configuration
    payment_method = Column(SQLEnum(PaymentMethod), default=PaymentMethod.BANK_TRANSFER)
    payment_details = Column(JSON)  # Bank details, PayPal email, crypto wallet, etc
    payment_terms = Column(String(50), default='NET_30')
    minimum_payout = Column(DECIMAL(10, 2), default=100.00)
    currency = Column(String(3), default='USD')
    auto_payout = Column(Boolean, default=True)
    
    # Preferences
    language = Column(String(10), default='es')
    timezone = Column(String(50), default='America/Mexico_City')
    notification_preferences = Column(JSON)
    
    # Tracking Configuration
    referral_source = Column(String(200))
    utm_params = Column(JSON)
    signup_ip = Column(String(45))
    cookie_duration_days = Column(Integer, default=30)
    attribution_model = Column(SQLEnum(AttributionModel), default=AttributionModel.LAST_CLICK)
    
    # Status and Verification
    status = Column(SQLEnum(AffiliateStatus), default=AffiliateStatus.PENDING, nullable=False, index=True)
    verified = Column(Boolean, default=False)
    verification_date = Column(DateTime)
    verified_by = Column(String(200))
    
    # Documents
    documents = Column(JSON)  # {type: url, ...}
    contracts = Column(JSON)  # {contract_id: {url, signed_date, expires}, ...}
    w9_on_file = Column(Boolean, default=False)
    
    # API Access
    api_key = Column(String(64), unique=True)
    api_secret = Column(String(128))
    api_permissions = Column(JSON)  # ['read', 'write', 'delete']
    webhook_url = Column(String(500))
    webhook_secret = Column(String(128))
    
    # 2-Tier Program (referral of affiliates)
    referred_by_id = Column(UUID(as_uuid=True), ForeignKey('affiliates.id'))
    referral_commission_rate = Column(DECIMAL(5, 2), default=2.00)
    
    # Statistics (cached for performance)
    total_clicks = Column(Integer, default=0)
    total_conversions = Column(Integer, default=0)
    total_sales = Column(DECIMAL(15, 2), default=0.00)
    total_commission_earned = Column(DECIMAL(15, 2), default=0.00)
    total_commission_paid = Column(DECIMAL(15, 2), default=0.00)
    conversion_rate = Column(DECIMAL(5, 2), default=0.00)
    average_order_value = Column(DECIMAL(12, 2), default=0.00)
    lifetime_value = Column(DECIMAL(15, 2), default=0.00)
    
    # Monthly Statistics (for tier calculation)
    current_month_sales = Column(DECIMAL(15, 2), default=0.00)
    current_month_conversions = Column(Integer, default=0)
    last_month_sales = Column(DECIMAL(15, 2), default=0.00)
    
    # Gamification
    points = Column(Integer, default=0)
    level = Column(Integer, default=1)
    badges = Column(JSON)  # ['first_sale', 'weekend_warrior', etc]
    achievements = Column(JSON)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    last_activity = Column(DateTime)
    last_login = Column(DateTime)
    
    # Relationships
    clicks = relationship("AffiliateClick", back_populates="affiliate")
    conversions = relationship("AffiliateConversion", back_populates="affiliate")
    payments = relationship("AffiliatePayment", back_populates="affiliate")
    materials = relationship("AffiliateMaterial", secondary="affiliate_materials_used")
    sub_affiliates = relationship("Affiliate", backref="referrer")
    
    # Indexes
    __table_args__ = (
        Index('idx_affiliate_type_tier', 'type', 'tier'),
        Index('idx_affiliate_status_verified', 'status', 'verified'),
        Index('idx_affiliate_created_at', 'created_at'),
    )


class AffiliateClick(Base):
    """Track all clicks from affiliates"""
    __tablename__ = 'affiliate_clicks'
    
    id = Column(Integer, primary_key=True)
    click_id = Column(String(100), unique=True, nullable=False, index=True)
    affiliate_id = Column(UUID(as_uuid=True), ForeignKey('affiliates.id'), nullable=False, index=True)
    
    # Session tracking
    session_id = Column(String(100), index=True)
    visitor_id = Column(String(100))  # Cookie ID for return visitors
    
    # Source tracking
    source_url = Column(Text)
    landing_page = Column(Text)
    referrer = Column(Text)
    
    # Campaign tracking
    campaign = Column(String(200))
    medium = Column(String(100))
    content = Column(Text)
    term = Column(String(200))
    
    # UTM Parameters
    utm_source = Column(String(200))
    utm_medium = Column(String(200))
    utm_campaign = Column(String(200))
    utm_term = Column(String(200))
    utm_content = Column(Text)
    
    # Device information
    ip_address = Column(String(45))
    user_agent = Column(Text)
    device_type = Column(String(50))  # mobile, tablet, desktop
    device_brand = Column(String(100))
    os = Column(String(50))
    os_version = Column(String(50))
    browser = Column(String(50))
    browser_version = Column(String(50))
    is_bot = Column(Boolean, default=False)
    
    # Geographic information
    country = Column(String(100))
    country_code = Column(String(2))
    region = Column(String(100))
    city = Column(String(100))
    postal_code = Column(String(20))
    latitude = Column(Float)
    longitude = Column(Float)
    timezone = Column(String(50))
    
    # Conversion tracking
    converted = Column(Boolean, default=False)
    conversion_id = Column(Integer, ForeignKey('affiliate_conversions.id'))
    
    # Timestamps
    clicked_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    expires_at = Column(DateTime)
    
    # Relationships
    affiliate = relationship("Affiliate", back_populates="clicks")
    conversion = relationship("AffiliateConversion", back_populates="click")


class AffiliateConversion(Base):
    """Track conversions/sales from affiliate clicks"""
    __tablename__ = 'affiliate_conversions'
    
    id = Column(Integer, primary_key=True)
    affiliate_id = Column(UUID(as_uuid=True), ForeignKey('affiliates.id'), nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey('bookings.id'), index=True)
    
    # Tracking
    click_id = Column(String(100), ForeignKey('affiliate_clicks.click_id'))
    session_id = Column(String(100))
    
    # Conversion details
    conversion_type = Column(String(50))  # booking, inquiry, signup, download
    product_type = Column(String(50))  # tour, package, activity, hotel
    product_id = Column(Integer)
    product_name = Column(String(500))
    
    # Financial
    booking_value = Column(DECIMAL(12, 2), nullable=False)
    currency = Column(String(3), default='USD')
    commission_rate = Column(DECIMAL(5, 2), nullable=False)
    commission_amount = Column(DECIMAL(12, 2), nullable=False)
    bonus_amount = Column(DECIMAL(10, 2), default=0.00)
    tier_bonus = Column(DECIMAL(10, 2), default=0.00)
    total_payout = Column(DECIMAL(12, 2), nullable=False)
    
    # 2-Tier commission (if applicable)
    referrer_commission = Column(DECIMAL(10, 2), default=0.00)
    referrer_id = Column(UUID(as_uuid=True), ForeignKey('affiliates.id'))
    
    # Customer info (snapshot)
    customer_email = Column(String(200))
    customer_country = Column(String(100))
    is_new_customer = Column(Boolean, default=True)
    
    # Status
    status = Column(SQLEnum(ConversionStatus), default=ConversionStatus.PENDING, nullable=False, index=True)
    confirmation_date = Column(DateTime)
    cancellation_date = Column(DateTime)
    payment_date = Column(DateTime)
    
    # Attribution
    attribution_model = Column(SQLEnum(AttributionModel), default=AttributionModel.LAST_CLICK)
    attribution_weight = Column(DECIMAL(5, 2), default=100.00)
    touchpoints = Column(JSON)  # List of all touchpoints in customer journey
    
    # Time metrics
    time_to_conversion = Column(Integer)  # Seconds from click to conversion
    days_since_click = Column(Integer)
    
    # Timestamps
    converted_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    affiliate = relationship("Affiliate", foreign_keys=[affiliate_id], back_populates="conversions")
    click = relationship("AffiliateClick", back_populates="conversion")
    payment = relationship("AffiliatePayment", secondary="payment_conversions")


class AffiliatePayment(Base):
    """Track payments to affiliates"""
    __tablename__ = 'affiliate_payments'
    
    id = Column(Integer, primary_key=True)
    affiliate_id = Column(UUID(as_uuid=True), ForeignKey('affiliates.id'), nullable=False, index=True)
    
    # Payment identification
    payment_number = Column(String(50), unique=True, nullable=False, index=True)
    invoice_number = Column(String(50), unique=True)
    
    # Period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Statistics
    total_bookings = Column(Integer, default=0)
    total_clicks = Column(Integer, default=0)
    total_conversions = Column(Integer, default=0)
    
    # Financial
    gross_sales = Column(DECIMAL(15, 2), default=0.00)
    base_commission = Column(DECIMAL(12, 2), default=0.00)
    tier_bonus = Column(DECIMAL(10, 2), default=0.00)
    performance_bonus = Column(DECIMAL(10, 2), default=0.00)
    referral_commission = Column(DECIMAL(10, 2), default=0.00)
    adjustments = Column(DECIMAL(10, 2), default=0.00)  # Refunds, chargebacks
    tax_withholding = Column(DECIMAL(10, 2), default=0.00)
    processing_fee = Column(DECIMAL(10, 2), default=0.00)
    total_payment = Column(DECIMAL(12, 2), nullable=False)
    currency = Column(String(3), default='USD')
    
    # Payment method
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    payment_details = Column(JSON)
    transaction_id = Column(String(200))
    transaction_hash = Column(String(100))  # For crypto payments
    
    # Status
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False, index=True)
    paid_at = Column(DateTime)
    failed_reason = Column(Text)
    
    # Documents
    invoice_url = Column(String(500))
    receipt_url = Column(String(500))
    statement_url = Column(String(500))
    
    # Notes
    notes = Column(Text)
    internal_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    due_date = Column(DateTime)
    
    # Relationships
    affiliate = relationship("Affiliate", back_populates="payments")


class AffiliateMaterial(Base):
    """Marketing materials available for affiliates"""
    __tablename__ = 'affiliate_materials'
    
    id = Column(Integer, primary_key=True)
    
    # Material identification
    code = Column(String(50), unique=True)
    type = Column(String(50))  # banner, widget, email, social, video, landing
    name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Content
    content_url = Column(String(500))
    thumbnail_url = Column(String(500))
    preview_url = Column(String(500))
    html_code = Column(Text)
    embed_code = Column(Text)
    
    # Dimensions (for banners/images)
    width = Column(Integer)
    height = Column(Integer)
    file_size = Column(Integer)
    format = Column(String(50))  # jpg, png, gif, mp4, html5
    
    # Targeting
    languages = Column(JSON)  # ['es', 'en', 'pt']
    countries = Column(JSON)  # ['MX', 'US', 'BR']
    categories = Column(JSON)  # ['adventure', 'cultural', 'beach']
    products = Column(JSON)  # Specific product IDs
    
    # Performance metrics (cached)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    click_through_rate = Column(DECIMAL(5, 2), default=0.00)
    conversion_rate = Column(DECIMAL(5, 2), default=0.00)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    priority = Column(Integer, default=0)
    
    # Validity
    valid_from = Column(DateTime)
    valid_until = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)


# ========================================
# ASSOCIATION TABLES
# ========================================

# Many-to-many: Affiliates using materials
affiliate_materials_used = Table(
    'affiliate_materials_used',
    Base.metadata,
    Column('affiliate_id', UUID(as_uuid=True), ForeignKey('affiliates.id')),
    Column('material_id', Integer, ForeignKey('affiliate_materials.id')),
    Column('first_used', DateTime, default=datetime.utcnow),
    Column('last_used', DateTime),
    Column('times_used', Integer, default=0),
    Column('clicks_generated', Integer, default=0),
    Column('conversions_generated', Integer, default=0)
)

# Many-to-many: Conversions in payments
payment_conversions = Table(
    'payment_conversions',
    Base.metadata,
    Column('payment_id', Integer, ForeignKey('affiliate_payments.id')),
    Column('conversion_id', Integer, ForeignKey('affiliate_conversions.id'))
)

# ========================================
# HELPER MODELS
# ========================================

class AffiliatePromoCode(Base):
    """Promo codes exclusive to affiliates"""
    __tablename__ = 'affiliate_promo_codes'
    
    id = Column(Integer, primary_key=True)
    affiliate_id = Column(UUID(as_uuid=True), ForeignKey('affiliates.id'), nullable=False)
    
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    discount_type = Column(String(50))  # percentage, fixed
    discount_value = Column(DECIMAL(10, 2))
    
    valid_from = Column(DateTime)
    valid_until = Column(DateTime)
    usage_limit = Column(Integer)
    times_used = Column(Integer, default=0)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AffiliateNotification(Base):
    """Notifications for affiliates"""
    __tablename__ = 'affiliate_notifications'
    
    id = Column(Integer, primary_key=True)
    affiliate_id = Column(UUID(as_uuid=True), ForeignKey('affiliates.id'), nullable=False)
    
    type = Column(String(50))  # conversion, payment, achievement, announcement
    title = Column(String(200))
    message = Column(Text)
    data = Column(JSON)
    
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)