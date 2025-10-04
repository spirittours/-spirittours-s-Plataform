"""
Email System Models for Spirit Tours Intelligent Email Management
Comprehensive models for email processing, classification, and analytics

Author: Spirit Tours Development Team
Created: 2025-10-04
Phase: 1 - Email Foundation
"""

from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, 
    ForeignKey, DateTime, JSON, Enum as SQLEnum, Index
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from pydantic import BaseModel, EmailStr

from .rbac_models import Base


# ============================================================================
# ENUMS
# ============================================================================

class EmailCategory(enum.Enum):
    """Email category classification"""
    SALES = "sales"                          # sales@, general sales inquiries
    B2B = "b2b"                              # b2b@, partner communications
    OTA = "ota"                              # ota@, OTA relationships
    WHOLESALE = "wholesale"                  # wholesale@, wholesaler partners
    PARTNERSHIPS = "partnerships"            # partnerships@, new partnerships
    REGIONAL_MEXICO = "regional_mexico"      # mexico@, Mexico operations
    REGIONAL_USA = "regional_usa"            # usa@, USA operations
    REGIONAL_JORDAN = "regional_jordan"      # jordan@, Jordan operations
    REGIONAL_ISRAEL = "regional_israel"      # israel@, Israel operations
    REGIONAL_SPAIN = "regional_spain"        # spain@, Spain operations
    REGIONAL_EUROPE = "regional_europe"      # europe@, Europe operations
    REGIONAL_LATAM = "regional_latam"        # latam@, Latin America operations
    RESERVATIONS = "reservations"            # reservations@, bookings@
    OPERATIONS = "operations"                # operations@, operational matters
    ITINERARY = "itinerary"                  # itinerary@, itinerary requests
    GROUPS = "groups"                        # groups@, group bookings
    CONFIRMATION = "confirmation"            # confirmation@, booking confirmations
    SUPPORT = "support"                      # support@, customer service
    FEEDBACK = "feedback"                    # feedback@, customer feedback
    SUPPLIERS_HOTELS = "suppliers_hotels"    # hotels@, hotel suppliers
    SUPPLIERS_TRANSPORT = "suppliers_transport"  # transport@, transportation
    SUPPLIERS_GUIDES = "suppliers_guides"    # guides@, tour guides
    SUPPLIERS_VENDORS = "suppliers_vendors"  # vendors@, general vendors
    CORPORATE_INFO = "corporate_info"        # info@, contact@
    CORPORATE_FINANCE = "corporate_finance"  # finance@, accounts@
    CORPORATE_HR = "corporate_hr"            # hr@, human resources
    CORPORATE_LEGAL = "corporate_legal"      # legal@, legal matters
    MARKETING = "marketing"                  # marketing@, marketing campaigns
    SOCIAL_MEDIA = "social_media"            # socialmedia@, social media
    PRESS = "press"                          # press@, press inquiries
    NEWSLETTER = "newsletter"                # newsletter@, newsletter
    PILGRIMAGES = "pilgrimages"              # pilgrimages@, religious tourism
    RELIGIOUS_TOURS = "religious_tours"      # religious.tours@, faith-based
    FAITH = "faith"                          # faith@, spiritual tourism
    HOLYLAND = "holyland"                    # holyland@, Holy Land tours
    OTHER = "other"                          # Uncategorized


class EmailIntent(enum.Enum):
    """User intent classification"""
    QUERY = "query"                    # Information request
    COMPLAINT = "complaint"            # Customer complaint
    BOOKING = "booking"                # New booking request
    MODIFICATION = "modification"      # Booking modification
    CANCELLATION = "cancellation"      # Booking cancellation
    INFORMATION = "information"        # General information
    PARTNERSHIP = "partnership"        # Partnership inquiry
    QUOTATION = "quotation"           # Price quotation request
    CONFIRMATION = "confirmation"      # Booking confirmation
    FEEDBACK = "feedback"             # Customer feedback
    URGENT = "urgent"                 # Urgent matter
    OTHER = "other"                   # Other intent


class EmailPriority(enum.Enum):
    """Email priority levels"""
    URGENT = "urgent"          # < 2 hours response time
    HIGH = "high"              # < 4 hours response time
    NORMAL = "normal"          # < 24 hours response time
    LOW = "low"                # < 48 hours response time


class EmailStatus(enum.Enum):
    """Email processing status"""
    RECEIVED = "received"              # Email received
    CLASSIFIED = "classified"          # Category/intent classified
    ANALYZING = "analyzing"            # Sentiment/entity analysis in progress
    ANALYZED = "analyzed"              # Analysis complete
    ROUTED = "routed"                  # Routed to appropriate agent/team
    ASSIGNED = "assigned"              # Assigned to specific user
    IN_PROGRESS = "in_progress"        # Being processed
    PENDING_RESPONSE = "pending_response"  # Awaiting response
    RESPONDED = "responded"            # Response sent
    AUTO_RESPONDED = "auto_responded"  # Auto-response sent
    RESOLVED = "resolved"              # Issue resolved
    CLOSED = "closed"                  # Email closed
    ARCHIVED = "archived"              # Archived


class ResponseType(enum.Enum):
    """Type of response sent"""
    MANUAL = "manual"                  # Manual human response
    AUTO_TEMPLATE = "auto_template"    # Automatic template response
    AI_GENERATED = "ai_generated"      # AI-generated response
    HYBRID = "hybrid"                  # AI-assisted human response


class EmailLanguage(enum.Enum):
    """Supported languages"""
    SPANISH = "es"
    ENGLISH = "en"
    PORTUGUESE = "pt"
    FRENCH = "fr"
    ITALIAN = "it"
    GERMAN = "de"
    HEBREW = "he"
    ARABIC = "ar"
    OTHER = "other"


# ============================================================================
# DATABASE MODELS
# ============================================================================

class EmailAccount(Base):
    """Email accounts configured for the system"""
    __tablename__ = 'email_accounts'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_address = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    category = Column(SQLEnum(EmailCategory), nullable=False)
    description = Column(Text, nullable=True)
    
    # Account Configuration
    is_active = Column(Boolean, default=True)
    auto_response_enabled = Column(Boolean, default=False)
    ai_processing_enabled = Column(Boolean, default=True)
    
    # API Configuration (encrypted in production)
    provider = Column(String(50), nullable=False)  # gmail, microsoft365
    api_credentials = Column(JSON, nullable=True)  # Encrypted credentials
    webhook_url = Column(String(500), nullable=True)
    
    # SLA Configuration
    sla_response_time_hours = Column(Integer, default=24)
    
    # Assignment Configuration
    assigned_team_id = Column(UUID(as_uuid=True), nullable=True)
    assigned_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Statistics
    total_received = Column(Integer, default=0)
    total_sent = Column(Integer, default=0)
    avg_response_time_minutes = Column(Float, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    emails = relationship("EmailMessage", back_populates="account", cascade="all, delete-orphan")


class EmailMessage(Base):
    """Email messages received and sent"""
    __tablename__ = 'email_messages'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Account
    account_id = Column(UUID(as_uuid=True), ForeignKey('email_accounts.id'), nullable=False, index=True)
    
    # Email Headers
    message_id = Column(String(500), unique=True, nullable=False, index=True)  # External message ID
    thread_id = Column(String(500), nullable=True, index=True)  # Conversation thread
    in_reply_to = Column(String(500), nullable=True)
    references = Column(ARRAY(String), nullable=True)
    
    # From/To
    from_email = Column(String(255), nullable=False, index=True)
    from_name = Column(String(255), nullable=True)
    to_emails = Column(ARRAY(String), nullable=False)
    cc_emails = Column(ARRAY(String), nullable=True)
    bcc_emails = Column(ARRAY(String), nullable=True)
    
    # Content
    subject = Column(Text, nullable=False)
    body_text = Column(Text, nullable=True)
    body_html = Column(Text, nullable=True)
    attachments = Column(JSON, nullable=True)  # [{name, size, type, url}]
    
    # Metadata
    received_at = Column(DateTime(timezone=True), nullable=False, index=True)
    size_bytes = Column(Integer, nullable=True)
    language = Column(SQLEnum(EmailLanguage), nullable=True)
    
    # Classification
    category = Column(SQLEnum(EmailCategory), nullable=True, index=True)
    intent = Column(SQLEnum(EmailIntent), nullable=True, index=True)
    priority = Column(SQLEnum(EmailPriority), default=EmailPriority.NORMAL, index=True)
    status = Column(SQLEnum(EmailStatus), default=EmailStatus.RECEIVED, index=True)
    
    # Sentiment Analysis (reusing existing service)
    sentiment = Column(String(20), nullable=True)  # positive, negative, neutral
    sentiment_score = Column(Float, nullable=True)
    sentiment_confidence = Column(Float, nullable=True)
    
    # Entity Extraction
    extracted_entities = Column(JSON, nullable=True)  # {dates, destinations, travelers, budget, etc.}
    keywords = Column(ARRAY(String), nullable=True)
    
    # Assignment & Routing
    assigned_agent_type = Column(String(100), nullable=True)  # SalesAgent, SupportAgent, etc.
    assigned_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True, index=True)
    routed_to_email = Column(String(255), nullable=True)
    
    # Response Management
    requires_response = Column(Boolean, default=True)
    auto_response_sent = Column(Boolean, default=False)
    response_deadline = Column(DateTime(timezone=True), nullable=True)
    
    # Flags
    is_spam = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    is_important = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    
    # Processing Metadata
    classification_confidence = Column(Float, nullable=True)
    processing_errors = Column(JSON, nullable=True)
    ai_processing_metadata = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    classified_at = Column(DateTime(timezone=True), nullable=True)
    analyzed_at = Column(DateTime(timezone=True), nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    account = relationship("EmailAccount", back_populates="emails")
    classifications = relationship("EmailClassification", back_populates="email", cascade="all, delete-orphan")
    responses = relationship("EmailResponse", back_populates="email", cascade="all, delete-orphan")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_email_account_received', 'account_id', 'received_at'),
        Index('idx_email_status_priority', 'status', 'priority'),
        Index('idx_email_assigned_user', 'assigned_user_id', 'status'),
        Index('idx_email_category_intent', 'category', 'intent'),
    )


class EmailClassification(Base):
    """Email classification history and confidence scores"""
    __tablename__ = 'email_classifications'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_id = Column(UUID(as_uuid=True), ForeignKey('email_messages.id'), nullable=False, index=True)
    
    # Classification Results
    category = Column(SQLEnum(EmailCategory), nullable=False)
    category_confidence = Column(Float, nullable=False)
    intent = Column(SQLEnum(EmailIntent), nullable=False)
    intent_confidence = Column(Float, nullable=False)
    priority = Column(SQLEnum(EmailPriority), nullable=False)
    
    # Classification Method
    classifier_version = Column(String(50), nullable=False)
    classification_method = Column(String(100), nullable=False)  # rule_based, ml_model, hybrid
    
    # Detailed Scores
    category_scores = Column(JSON, nullable=True)  # All category scores
    intent_scores = Column(JSON, nullable=True)    # All intent scores
    
    # Keywords and Features
    keywords_detected = Column(ARRAY(String), nullable=True)
    features_used = Column(JSON, nullable=True)
    
    # Validation
    is_validated = Column(Boolean, default=False)
    validated_by_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    validated_at = Column(DateTime(timezone=True), nullable=True)
    is_correct = Column(Boolean, nullable=True)  # Human feedback
    
    # Metadata
    processing_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    email = relationship("EmailMessage", back_populates="classifications")


class EmailResponse(Base):
    """Email responses sent"""
    __tablename__ = 'email_responses'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email_id = Column(UUID(as_uuid=True), ForeignKey('email_messages.id'), nullable=False, index=True)
    
    # Response Details
    response_type = Column(SQLEnum(ResponseType), nullable=False)
    response_body_text = Column(Text, nullable=True)
    response_body_html = Column(Text, nullable=True)
    attachments = Column(JSON, nullable=True)
    
    # Response Metadata
    template_id = Column(UUID(as_uuid=True), nullable=True)  # If template used
    ai_model_used = Column(String(100), nullable=True)
    generation_confidence = Column(Float, nullable=True)
    
    # Approval Workflow
    requires_approval = Column(Boolean, default=False)
    approved_by_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Response Status
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    sent_by_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # External Message ID
    sent_message_id = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    email = relationship("EmailMessage", back_populates="responses")


class EmailAnalytics(Base):
    """Daily email analytics aggregation"""
    __tablename__ = 'email_analytics'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Time Period
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    account_id = Column(UUID(as_uuid=True), ForeignKey('email_accounts.id'), nullable=True, index=True)
    category = Column(SQLEnum(EmailCategory), nullable=True, index=True)
    
    # Volume Metrics
    total_received = Column(Integer, default=0)
    total_sent = Column(Integer, default=0)
    total_auto_responses = Column(Integer, default=0)
    
    # Response Time Metrics (in minutes)
    avg_response_time = Column(Float, nullable=True)
    median_response_time = Column(Float, nullable=True)
    min_response_time = Column(Float, nullable=True)
    max_response_time = Column(Float, nullable=True)
    
    # SLA Compliance
    within_sla_count = Column(Integer, default=0)
    breached_sla_count = Column(Integer, default=0)
    sla_compliance_rate = Column(Float, nullable=True)  # Percentage
    
    # Status Distribution
    status_distribution = Column(JSON, nullable=True)  # {status: count}
    
    # Priority Distribution
    priority_distribution = Column(JSON, nullable=True)  # {priority: count}
    
    # Sentiment Distribution
    sentiment_positive_count = Column(Integer, default=0)
    sentiment_negative_count = Column(Integer, default=0)
    sentiment_neutral_count = Column(Integer, default=0)
    avg_sentiment_score = Column(Float, nullable=True)
    
    # Intent Distribution
    intent_distribution = Column(JSON, nullable=True)  # {intent: count}
    
    # Language Distribution
    language_distribution = Column(JSON, nullable=True)  # {language: count}
    
    # Team Performance
    assigned_users = Column(JSON, nullable=True)  # {user_id: metrics}
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Unique constraint to prevent duplicate analytics
    __table_args__ = (
        Index('idx_analytics_unique', 'date', 'account_id', 'category', unique=True),
    )


class EmailTemplate(Base):
    """Email response templates"""
    __tablename__ = 'email_templates'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Template Details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(SQLEnum(EmailCategory), nullable=True, index=True)
    intent = Column(SQLEnum(EmailIntent), nullable=True, index=True)
    language = Column(SQLEnum(EmailLanguage), nullable=False, default=EmailLanguage.ENGLISH)
    
    # Template Content
    subject_template = Column(Text, nullable=True)
    body_text_template = Column(Text, nullable=False)
    body_html_template = Column(Text, nullable=True)
    
    # Template Variables
    variables = Column(JSON, nullable=True)  # {var_name: description}
    
    # Usage Configuration
    is_active = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=False)
    auto_send_enabled = Column(Boolean, default=False)
    
    # Conditions for Auto-Use
    trigger_conditions = Column(JSON, nullable=True)  # Conditions for automatic template selection
    
    # Statistics
    usage_count = Column(Integer, default=0)
    success_rate = Column(Float, nullable=True)
    avg_response_rating = Column(Float, nullable=True)
    
    # Metadata
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


# ============================================================================
# PYDANTIC MODELS FOR API
# ============================================================================

class EmailAccountResponse(BaseModel):
    """Email account response model"""
    id: str
    email_address: EmailStr
    display_name: str
    category: EmailCategory
    description: Optional[str]
    is_active: bool
    auto_response_enabled: bool
    ai_processing_enabled: bool
    total_received: int
    total_sent: int
    avg_response_time_minutes: Optional[float]
    created_at: datetime
    last_sync_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class EmailMessageResponse(BaseModel):
    """Email message response model"""
    id: str
    account_id: str
    message_id: str
    thread_id: Optional[str]
    from_email: EmailStr
    from_name: Optional[str]
    to_emails: List[EmailStr]
    subject: str
    body_text: Optional[str]
    received_at: datetime
    category: Optional[EmailCategory]
    intent: Optional[EmailIntent]
    priority: EmailPriority
    status: EmailStatus
    sentiment: Optional[str]
    sentiment_score: Optional[float]
    assigned_user_id: Optional[str]
    requires_response: bool
    auto_response_sent: bool
    is_read: bool
    is_important: bool
    response_deadline: Optional[datetime]
    
    class Config:
        from_attributes = True


class EmailClassificationResponse(BaseModel):
    """Email classification response model"""
    category: EmailCategory
    category_confidence: float
    intent: EmailIntent
    intent_confidence: float
    priority: EmailPriority
    keywords_detected: Optional[List[str]]
    classification_method: str
    processing_time_ms: Optional[int]
    
    class Config:
        from_attributes = True


class EmailAnalyticsResponse(BaseModel):
    """Email analytics response model"""
    date: datetime
    account_id: Optional[str]
    category: Optional[EmailCategory]
    total_received: int
    total_sent: int
    total_auto_responses: int
    avg_response_time: Optional[float]
    sla_compliance_rate: Optional[float]
    sentiment_positive_count: int
    sentiment_negative_count: int
    sentiment_neutral_count: int
    status_distribution: Optional[Dict[str, int]]
    priority_distribution: Optional[Dict[str, int]]
    intent_distribution: Optional[Dict[str, int]]
    
    class Config:
        from_attributes = True


class EmailDashboardResponse(BaseModel):
    """Email dashboard summary response"""
    total_received_today: int
    total_pending_response: int
    total_urgent: int
    avg_response_time_today: Optional[float]
    sla_compliance_rate_today: Optional[float]
    sentiment_distribution: Dict[str, int]
    category_distribution: Dict[str, int]
    intent_distribution: Dict[str, int]
    priority_distribution: Dict[str, int]
    recent_emails: List[EmailMessageResponse]
    top_performing_accounts: List[EmailAccountResponse]


class ClassifyEmailRequest(BaseModel):
    """Request to classify an email"""
    email_id: str


class SendResponseRequest(BaseModel):
    """Request to send email response"""
    email_id: str
    response_body_text: str
    response_body_html: Optional[str] = None
    response_type: ResponseType = ResponseType.MANUAL
    attachments: Optional[List[Dict[str, Any]]] = None


class CreateEmailTemplateRequest(BaseModel):
    """Request to create email template"""
    name: str
    description: Optional[str]
    category: Optional[EmailCategory]
    intent: Optional[EmailIntent]
    language: EmailLanguage = EmailLanguage.ENGLISH
    subject_template: Optional[str]
    body_text_template: str
    body_html_template: Optional[str]
    variables: Optional[Dict[str, str]]
    requires_approval: bool = False
    auto_send_enabled: bool = False
