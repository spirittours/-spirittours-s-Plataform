"""
Database models for agencies and tour operators
"""
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, Text, JSON,
    ForeignKey, UniqueConstraint, Index, Enum as SQLEnum, DECIMAL
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class BusinessType(enum.Enum):
    AGENCY = "agency"
    TOUR_OPERATOR = "tour_operator" 
    BOTH = "both"

class AgencyStatus(enum.Enum):
    PENDING_REVIEW = "pending_review"
    DOCUMENTS_PENDING = "documents_pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"

class PaymentTerms(enum.Enum):
    PREPAYMENT = "prepayment"
    DAYS_7 = "7days"
    DAYS_15 = "15days"
    DAYS_30 = "30days"
    DAYS_45 = "45days"
    DAYS_60 = "60days"

class Currency(enum.Enum):
    USD = "USD"
    EUR = "EUR"
    MXN = "MXN"
    PEN = "PEN"
    COP = "COP"
    BRL = "BRL"
    ARS = "ARS"
    CLP = "CLP"

class Agency(Base):
    """Main agency/tour operator table"""
    __tablename__ = 'agencies'
    
    id = Column(Integer, primary_key=True)
    
    # Company Information
    company_name = Column(String(255), nullable=False, index=True)
    commercial_name = Column(String(255))
    registration_number = Column(String(100), unique=True)
    tax_id = Column(String(50), unique=True, nullable=False, index=True)
    business_type = Column(SQLEnum(BusinessType), default=BusinessType.AGENCY)
    years_in_business = Column(Integer, default=0)
    iata_number = Column(String(50))
    license_number = Column(String(100))
    
    # Address
    address_street = Column(String(255))
    address_city = Column(String(100))
    address_state = Column(String(100))
    address_country = Column(String(100))
    address_postal_code = Column(String(20))
    address_latitude = Column(Float)
    address_longitude = Column(Float)
    
    # Owner/Director Information  
    owner_name = Column(String(255), nullable=False)
    owner_position = Column(String(100))
    owner_email = Column(String(255), nullable=False, index=True)
    owner_phone = Column(String(50))
    owner_mobile = Column(String(50))
    owner_passport_number = Column(String(50))
    owner_passport_country = Column(String(100))
    owner_passport_expiry = Column(Date)
    owner_id_number = Column(String(50))
    
    # Contact Information
    company_email = Column(String(255), nullable=False)
    sales_email = Column(String(255))
    sales_contact = Column(String(255))
    sales_phone = Column(String(50))
    accounting_email = Column(String(255))
    accounting_contact = Column(String(255))
    accounting_phone = Column(String(50))
    operations_email = Column(String(255))
    operations_contact = Column(String(255))
    operations_phone = Column(String(50))
    emergency_contact = Column(String(255))
    emergency_phone = Column(String(50))
    
    # Online Presence
    website = Column(String(255))
    social_media = Column(JSON)  # {facebook, instagram, linkedin, twitter}
    
    # Financial Information
    bank_name = Column(String(255))
    bank_country = Column(String(100))
    bank_account = Column(String(100))
    bank_routing = Column(String(50))
    swift_code = Column(String(20))
    iban = Column(String(50))
    preferred_currency = Column(SQLEnum(Currency), default=Currency.USD)
    
    # Credit and Payment Terms
    credit_limit_requested = Column(DECIMAL(10, 2), default=0)
    credit_limit_approved = Column(DECIMAL(10, 2), default=0)
    credit_used = Column(DECIMAL(10, 2), default=0)
    payment_terms_requested = Column(SQLEnum(PaymentTerms), default=PaymentTerms.PREPAYMENT)
    payment_terms_approved = Column(SQLEnum(PaymentTerms), default=PaymentTerms.PREPAYMENT)
    monthly_volume_estimate = Column(String(100))
    
    # Commission and Pricing
    commission_rate = Column(Float, default=10.0)  # Percentage
    markup_allowed = Column(Boolean, default=True)
    net_rates_access = Column(Boolean, default=False)
    special_rates = Column(JSON)  # Custom rates for specific services
    
    # References and Validation
    commercial_references = Column(JSON)  # Array of reference companies
    documents_verified = Column(Boolean, default=False)
    verification_date = Column(DateTime)
    verified_by = Column(Integer, ForeignKey('users.id'))
    
    # Contract Information
    contract_signed = Column(Boolean, default=False)
    contract_date = Column(DateTime)
    contract_number = Column(String(100))
    contract_expiry = Column(Date)
    
    # Status and Dates
    status = Column(SQLEnum(AgencyStatus), default=AgencyStatus.PENDING_REVIEW, index=True)
    registration_date = Column(DateTime, default=datetime.utcnow)
    approval_date = Column(DateTime)
    approved_by = Column(Integer, ForeignKey('users.id'))
    rejection_date = Column(DateTime)
    rejection_reason = Column(Text)
    rejected_by = Column(Integer, ForeignKey('users.id'))
    suspension_date = Column(DateTime)
    suspension_reason = Column(Text)
    
    # Activity Tracking
    last_booking_date = Column(DateTime)
    total_bookings = Column(Integer, default=0)
    total_passengers = Column(Integer, default=0)
    total_revenue = Column(DECIMAL(12, 2), default=0)
    total_commission_earned = Column(DECIMAL(10, 2), default=0)
    performance_score = Column(Float, default=0)  # 0-100
    
    # System Fields
    active = Column(Boolean, default=False, index=True)
    notes = Column(Text)
    internal_notes = Column(Text)  # Not visible to agency
    tags = Column(JSON)  # Array of tags for categorization
    custom_fields = Column(JSON)
    api_access = Column(Boolean, default=False)
    api_key = Column(String(255))
    webhook_url = Column(String(255))
    
    # Audit Fields
    registration_ip = Column(String(50))
    last_login_date = Column(DateTime)
    last_login_ip = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    documents = relationship("AgencyDocument", back_populates="agency")
    contracts = relationship("AgencyContract", back_populates="agency")
    users = relationship("AgencyUser", back_populates="agency")
    payments = relationship("AgencyPayment", back_populates="agency")
    commissions = relationship("AgencyCommission", back_populates="agency")
    bookings = relationship("Booking", back_populates="agency")
    credit_requests = relationship("AgencyCreditRequest", back_populates="agency")
    
    # Indexes
    __table_args__ = (
        Index('idx_agency_status_active', 'status', 'active'),
        Index('idx_agency_country_city', 'address_country', 'address_city'),
        Index('idx_agency_performance', 'performance_score', 'total_revenue'),
    )

class AgencyDocument(Base):
    """Documents uploaded by agencies"""
    __tablename__ = 'agency_documents'
    
    id = Column(Integer, primary_key=True)
    agency_id = Column(Integer, ForeignKey('agencies.id'), nullable=False, index=True)
    
    document_type = Column(String(100), nullable=False)  # business_license, tax_registration, etc.
    file_name = Column(String(255))
    file_path = Column(String(500))
    file_size = Column(Integer)
    file_hash = Column(String(64))  # SHA-256 hash for verification
    
    uploaded_date = Column(DateTime, default=datetime.utcnow)
    expiry_date = Column(Date)
    
    verified = Column(Boolean, default=False)
    verification_date = Column(DateTime)
    verified_by = Column(Integer, ForeignKey('users.id'))
    verification_notes = Column(Text)
    
    status = Column(String(50), default='pending_verification')  # pending, verified, rejected, expired
    rejection_reason = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    agency = relationship("Agency", back_populates="documents")

class AgencyContract(Base):
    """Contracts between Spirit Tours and agencies"""
    __tablename__ = 'agency_contracts'
    
    id = Column(Integer, primary_key=True)
    agency_id = Column(Integer, ForeignKey('agencies.id'), nullable=False, index=True)
    
    contract_number = Column(String(100), unique=True, nullable=False)
    contract_type = Column(String(50))  # standard, premium, custom
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    auto_renewal = Column(Boolean, default=True)
    
    # Terms
    payment_terms = Column(SQLEnum(PaymentTerms))
    commission_rate = Column(Float)
    credit_limit = Column(DECIMAL(10, 2))
    cancellation_policy = Column(Text)
    special_conditions = Column(Text)
    
    # Signature
    signed_date = Column(DateTime)
    signature_method = Column(String(50))  # digital, physical
    signature_hash = Column(String(255))
    signature_ip = Column(String(50))
    signed_by_name = Column(String(255))
    signed_by_title = Column(String(100))
    
    # Counter-signature (Spirit Tours)
    countersigned_date = Column(DateTime)
    countersigned_by = Column(Integer, ForeignKey('users.id'))
    
    status = Column(String(50), default='draft')  # draft, sent, signed, active, expired, terminated
    termination_date = Column(DateTime)
    termination_reason = Column(Text)
    
    # File Storage
    contract_file_path = Column(String(500))
    signed_file_path = Column(String(500))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    agency = relationship("Agency", back_populates="contracts")

class AgencyUser(Base):
    """Users associated with agencies"""
    __tablename__ = 'agency_users'
    
    id = Column(Integer, primary_key=True)
    agency_id = Column(Integer, ForeignKey('agencies.id'), nullable=False, index=True)
    
    user_email = Column(String(255), unique=True, nullable=False, index=True)
    user_name = Column(String(255), nullable=False)
    password_hash = Column(String(255))
    
    role = Column(String(50), default='agent')  # admin, manager, agent, accountant
    department = Column(String(100))
    position = Column(String(100))
    
    phone = Column(String(50))
    mobile = Column(String(50))
    
    # Permissions
    can_book = Column(Boolean, default=True)
    can_modify = Column(Boolean, default=False)
    can_cancel = Column(Boolean, default=False)
    can_view_financials = Column(Boolean, default=False)
    booking_limit_daily = Column(Integer, default=50)
    booking_limit_monthly = Column(Integer, default=500)
    
    # Activity
    last_login = Column(DateTime)
    last_login_ip = Column(String(50))
    login_count = Column(Integer, default=0)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime)
    
    # Password Management
    temp_password = Column(String(255))
    password_reset_token = Column(String(255))
    password_reset_expiry = Column(DateTime)
    must_change_password = Column(Boolean, default=True)
    
    active = Column(Boolean, default=True)
    created_date = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    deactivated_date = Column(DateTime)
    deactivated_reason = Column(Text)
    
    # Two-Factor Authentication
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    agency = relationship("Agency", back_populates="users")
    
    __table_args__ = (
        UniqueConstraint('agency_id', 'user_email', name='uq_agency_user'),
    )

class AgencyCommission(Base):
    """Commission structure for agencies"""
    __tablename__ = 'agency_commissions'
    
    id = Column(Integer, primary_key=True)
    agency_id = Column(Integer, ForeignKey('agencies.id'), nullable=False, index=True)
    
    service_type = Column(String(100), nullable=False)  # tours, transfers, hotels, all
    product_category = Column(String(100))  # specific categories
    
    commission_rate = Column(Float, nullable=False)  # Percentage
    commission_type = Column(String(50), default='percentage')  # percentage, fixed_amount
    fixed_amount = Column(DECIMAL(10, 2))  # If fixed commission
    
    # Tiered Commission
    is_tiered = Column(Boolean, default=False)
    tier_structure = Column(JSON)  # {min_volume: rate} structure
    
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date)
    
    # Special Conditions
    minimum_volume = Column(DECIMAL(10, 2))  # Minimum volume for commission
    maximum_commission = Column(DECIMAL(10, 2))  # Cap on commission amount
    
    notes = Column(Text)
    active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    agency = relationship("Agency", back_populates="commissions")
    
    __table_args__ = (
        Index('idx_commission_agency_service', 'agency_id', 'service_type', 'active'),
    )

class AgencyPayment(Base):
    """Payment records from agencies"""
    __tablename__ = 'agency_payments'
    
    id = Column(Integer, primary_key=True)
    agency_id = Column(Integer, ForeignKey('agencies.id'), nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey('bookings.id'), index=True)
    
    # Payment Details
    amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(SQLEnum(Currency), default=Currency.USD)
    exchange_rate = Column(DECIMAL(10, 4), default=1.0)
    amount_usd = Column(DECIMAL(10, 2))  # Converted amount in USD
    
    payment_date = Column(DateTime, nullable=False)
    payment_method = Column(String(50))  # transfer, credit_card, check, cash
    
    # Bank Transfer Details
    bank_reference = Column(String(255))
    sender_bank = Column(String(255))
    sender_account = Column(String(100))
    
    # Credit Card Details (if applicable)
    card_last_four = Column(String(4))
    card_brand = Column(String(50))
    
    # Payment Status
    status = Column(String(50), default='pending')  # pending, processing, completed, failed, refunded
    confirmation_date = Column(DateTime)
    confirmed_by = Column(Integer, ForeignKey('users.id'))
    
    # References
    reference_number = Column(String(100), unique=True, index=True)
    invoice_number = Column(String(100))
    receipt_number = Column(String(100))
    
    # Commission Deduction
    commission_amount = Column(DECIMAL(10, 2), default=0)
    net_amount = Column(DECIMAL(10, 2))  # Amount after commission
    
    # Files
    payment_proof_path = Column(String(500))
    invoice_path = Column(String(500))
    receipt_path = Column(String(500))
    
    notes = Column(Text)
    internal_notes = Column(Text)
    
    # Reconciliation
    reconciled = Column(Boolean, default=False)
    reconciliation_date = Column(DateTime)
    reconciled_by = Column(Integer, ForeignKey('users.id'))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    agency = relationship("Agency", back_populates="payments")
    
    __table_args__ = (
        Index('idx_payment_agency_date', 'agency_id', 'payment_date'),
        Index('idx_payment_status', 'status', 'reconciled'),
    )

class AgencyCreditRequest(Base):
    """Credit limit increase requests"""
    __tablename__ = 'agency_credit_requests'
    
    id = Column(Integer, primary_key=True)
    agency_id = Column(Integer, ForeignKey('agencies.id'), nullable=False, index=True)
    
    current_limit = Column(DECIMAL(10, 2), nullable=False)
    requested_limit = Column(DECIMAL(10, 2), nullable=False)
    justification = Column(Text)
    
    # Supporting Documents
    financial_statements_path = Column(String(500))
    bank_references_path = Column(String(500))
    additional_documents = Column(JSON)
    
    # Financial Analysis
    average_monthly_volume = Column(DECIMAL(10, 2))
    payment_history_score = Column(Float)  # 0-100
    risk_assessment = Column(String(50))  # low, medium, high
    
    request_date = Column(DateTime, default=datetime.utcnow)
    requested_by = Column(String(255))
    
    # Review Process
    status = Column(String(50), default='pending')  # pending, under_review, approved, rejected
    review_date = Column(DateTime)
    reviewed_by = Column(Integer, ForeignKey('users.id'))
    review_notes = Column(Text)
    
    # Decision
    approved_limit = Column(DECIMAL(10, 2))
    approval_date = Column(DateTime)
    approved_by = Column(Integer, ForeignKey('users.id'))
    rejection_reason = Column(Text)
    
    # Conditions
    conditions = Column(Text)
    valid_until = Column(Date)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    agency = relationship("Agency", back_populates="credit_requests")

# Create indexes for better query performance
Index('idx_agency_search', Agency.company_name, Agency.commercial_name, Agency.tax_id)
Index('idx_agency_location', Agency.address_country, Agency.address_city)
Index('idx_document_expiry', AgencyDocument.expiry_date, AgencyDocument.verified)
Index('idx_contract_expiry', AgencyContract.end_date, AgencyContract.status)
Index('idx_user_agency_active', AgencyUser.agency_id, AgencyUser.active)
Index('idx_payment_reconciliation', AgencyPayment.reconciled, AgencyPayment.payment_date)