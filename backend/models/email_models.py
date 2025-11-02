"""
Email Notification System Models

Database models for email templates, notifications, and tracking.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, String, Integer, DateTime, Boolean, Text, JSON,
    ForeignKey, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship
from backend.database import Base


class EmailTemplateType(str, PyEnum):
    """Email template types"""
    BOOKING_CONFIRMATION = "booking_confirmation"
    BOOKING_REMINDER = "booking_reminder"
    BOOKING_CANCELLATION = "booking_cancellation"
    BOOKING_MODIFICATION = "booking_modification"
    PAYMENT_RECEIPT = "payment_receipt"
    PAYMENT_FAILED = "payment_failed"
    REFUND_NOTIFICATION = "refund_notification"
    WELCOME_EMAIL = "welcome_email"
    PASSWORD_RESET = "password_reset"
    EMAIL_VERIFICATION = "email_verification"
    TOUR_UPDATE = "tour_update"
    PROMOTIONAL = "promotional"
    NEWSLETTER = "newsletter"
    REVIEW_REQUEST = "review_request"
    CUSTOM = "custom"


class EmailStatus(str, PyEnum):
    """Email delivery status"""
    PENDING = "pending"
    QUEUED = "queued"
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"
    FAILED = "failed"
    COMPLAINED = "complained"


class EmailPriority(str, PyEnum):
    """Email sending priority"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class EmailProvider(str, PyEnum):
    """Email service providers"""
    SMTP = "smtp"
    SENDGRID = "sendgrid"
    AWS_SES = "aws_ses"
    MAILGUN = "mailgun"
    POSTMARK = "postmark"


class EmailTemplate(Base):
    """
    Email template model for storing reusable email designs.
    
    Supports:
    - Multiple template types (booking, payment, promotional, etc.)
    - Multi-language templates
    - Variable substitution with Jinja2
    - HTML and plain text versions
    - Active/inactive status
    - Template versioning
    """
    __tablename__ = 'email_templates'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Template identification
    template_id = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(SQLEnum(EmailTemplateType), nullable=False, index=True)
    
    # Template content
    subject = Column(String(500), nullable=False)
    html_content = Column(Text, nullable=False)
    text_content = Column(Text, nullable=True)
    
    # Template configuration
    language = Column(String(10), default='en', index=True)
    variables = Column(JSON, nullable=True)  # List of required variables
    default_values = Column(JSON, nullable=True)  # Default variable values
    
    # Status and versioning
    is_active = Column(Boolean, default=True, index=True)
    version = Column(Integer, default=1)
    
    # Metadata
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    emails = relationship('Email', back_populates='template')
    
    # Indexes
    __table_args__ = (
        Index('ix_email_templates_type_language', 'type', 'language'),
        Index('ix_email_templates_active_type', 'is_active', 'type'),
    )
    
    def __repr__(self):
        return f"<EmailTemplate(id={self.id}, name='{self.name}', type='{self.type}')>"


class Email(Base):
    """
    Email record for tracking all sent emails.
    
    Tracks:
    - Email content and recipients
    - Delivery status
    - Open and click tracking
    - Error messages
    - Template used
    """
    __tablename__ = 'emails'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Email identification
    email_id = Column(String(100), unique=True, nullable=False, index=True)
    message_id = Column(String(200), nullable=True, index=True)  # Provider message ID
    
    # Recipients
    to_email = Column(String(255), nullable=False, index=True)
    to_name = Column(String(200), nullable=True)
    cc = Column(JSON, nullable=True)  # List of CC recipients
    bcc = Column(JSON, nullable=True)  # List of BCC recipients
    
    # Sender
    from_email = Column(String(255), nullable=False)
    from_name = Column(String(200), nullable=True)
    reply_to = Column(String(255), nullable=True)
    
    # Content
    subject = Column(String(500), nullable=False)
    html_body = Column(Text, nullable=True)
    text_body = Column(Text, nullable=True)
    
    # Template reference
    template_id = Column(Integer, ForeignKey('email_templates.id'), nullable=True)
    template_variables = Column(JSON, nullable=True)
    
    # Delivery configuration
    priority = Column(SQLEnum(EmailPriority), default=EmailPriority.NORMAL, index=True)
    provider = Column(SQLEnum(EmailProvider), default=EmailProvider.SMTP)
    
    # Status tracking
    status = Column(SQLEnum(EmailStatus), default=EmailStatus.PENDING, nullable=False, index=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Scheduling
    scheduled_at = Column(DateTime, nullable=True, index=True)
    sent_at = Column(DateTime, nullable=True, index=True)
    delivered_at = Column(DateTime, nullable=True)
    
    # Tracking
    opened_at = Column(DateTime, nullable=True)
    open_count = Column(Integer, default=0)
    clicked_at = Column(DateTime, nullable=True)
    click_count = Column(Integer, default=0)
    bounced_at = Column(DateTime, nullable=True)
    complained_at = Column(DateTime, nullable=True)
    
    # Metadata
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    booking_id = Column(Integer, ForeignKey('bookings.id'), nullable=True, index=True)
    metadata = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    template = relationship('EmailTemplate', back_populates='emails')
    events = relationship('EmailEvent', back_populates='email', cascade='all, delete-orphan')
    attachments = relationship('EmailAttachment', back_populates='email', cascade='all, delete-orphan')
    
    # Indexes
    __table_args__ = (
        Index('ix_emails_status_priority', 'status', 'priority'),
        Index('ix_emails_user_status', 'user_id', 'status'),
        Index('ix_emails_scheduled_status', 'scheduled_at', 'status'),
    )
    
    def __repr__(self):
        return f"<Email(id={self.id}, to='{self.to_email}', status='{self.status}')>"


class EmailEvent(Base):
    """
    Email event tracking for detailed analytics.
    
    Tracks all events:
    - Sent, delivered, opened, clicked
    - Bounced, failed, complained
    - Provider webhooks
    """
    __tablename__ = 'email_events'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Event identification
    event_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # Email reference
    email_id = Column(Integer, ForeignKey('emails.id'), nullable=False, index=True)
    
    # Event details
    event_type = Column(String(50), nullable=False, index=True)
    event_data = Column(JSON, nullable=True)
    
    # Provider information
    provider = Column(String(50), nullable=True)
    provider_event_id = Column(String(200), nullable=True)
    
    # User interaction
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(50), nullable=True)
    location = Column(String(200), nullable=True)
    device_type = Column(String(50), nullable=True)
    
    # Link tracking
    link_url = Column(String(1000), nullable=True)
    link_label = Column(String(200), nullable=True)
    
    # Timestamp
    occurred_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship
    email = relationship('Email', back_populates='events')
    
    # Indexes
    __table_args__ = (
        Index('ix_email_events_email_type', 'email_id', 'event_type'),
        Index('ix_email_events_occurred', 'occurred_at'),
    )
    
    def __repr__(self):
        return f"<EmailEvent(id={self.id}, type='{self.event_type}', email_id={self.email_id})>"


class EmailAttachment(Base):
    """
    Email attachments model.
    
    Supports:
    - File attachments
    - Content type specification
    - Base64 encoded content or file path
    """
    __tablename__ = 'email_attachments'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Email reference
    email_id = Column(Integer, ForeignKey('emails.id'), nullable=False, index=True)
    
    # Attachment details
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    
    # Content (one of these should be set)
    file_path = Column(String(500), nullable=True)  # Path to file on disk
    content_base64 = Column(Text, nullable=True)  # Base64 encoded content
    url = Column(String(1000), nullable=True)  # External URL
    
    # Metadata
    is_inline = Column(Boolean, default=False)
    content_id = Column(String(100), nullable=True)  # For inline images
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship
    email = relationship('Email', back_populates='attachments')
    
    def __repr__(self):
        return f"<EmailAttachment(id={self.id}, filename='{self.filename}')>"


class EmailQueue(Base):
    """
    Email queue for managing batch sending and scheduling.
    
    Features:
    - Priority-based queue
    - Scheduled sending
    - Batch processing
    - Retry logic
    """
    __tablename__ = 'email_queue'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Queue identification
    queue_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # Email reference
    email_id = Column(Integer, ForeignKey('emails.id'), nullable=False, index=True)
    
    # Queue configuration
    priority = Column(SQLEnum(EmailPriority), default=EmailPriority.NORMAL, index=True)
    scheduled_at = Column(DateTime, nullable=True, index=True)
    
    # Processing status
    is_processed = Column(Boolean, default=False, index=True)
    processed_at = Column(DateTime, nullable=True)
    
    # Retry configuration
    retry_count = Column(Integer, default=0)
    last_retry_at = Column(DateTime, nullable=True)
    next_retry_at = Column(DateTime, nullable=True, index=True)
    
    # Metadata
    batch_id = Column(String(100), nullable=True, index=True)
    metadata = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('ix_email_queue_processing', 'is_processed', 'priority', 'scheduled_at'),
        Index('ix_email_queue_retry', 'is_processed', 'next_retry_at'),
    )
    
    def __repr__(self):
        return f"<EmailQueue(id={self.id}, email_id={self.email_id}, priority='{self.priority}')>"


class EmailCampaign(Base):
    """
    Email campaign model for managing bulk email campaigns.
    
    Features:
    - Campaign management
    - Recipient lists
    - Performance tracking
    - A/B testing support
    """
    __tablename__ = 'email_campaigns'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Campaign identification
    campaign_id = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Campaign configuration
    template_id = Column(Integer, ForeignKey('email_templates.id'), nullable=False)
    
    # Recipient configuration
    recipient_list = Column(JSON, nullable=True)  # List of recipient filters
    total_recipients = Column(Integer, default=0)
    
    # Scheduling
    scheduled_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_completed = Column(Boolean, default=False)
    
    # Performance metrics
    emails_sent = Column(Integer, default=0)
    emails_delivered = Column(Integer, default=0)
    emails_opened = Column(Integer, default=0)
    emails_clicked = Column(Integer, default=0)
    emails_bounced = Column(Integer, default=0)
    emails_failed = Column(Integer, default=0)
    
    # A/B Testing
    ab_test_enabled = Column(Boolean, default=False)
    ab_test_config = Column(JSON, nullable=True)
    
    # Metadata
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    metadata = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('ix_email_campaigns_active_scheduled', 'is_active', 'scheduled_at'),
    )
    
    def __repr__(self):
        return f"<EmailCampaign(id={self.id}, name='{self.name}')>"
