"""
Payment Database Models

SQLAlchemy models for payment system.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Column, Integer, String, Text, Numeric, DateTime, 
    Boolean, ForeignKey, Enum as SQLEnum, Index, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

from ..payments.payment_service import (
    PaymentProvider, PaymentStatus, PaymentMethod, Currency
)


Base = declarative_base()


class Payment(Base):
    """
    Payment transaction model.
    
    Stores all payment transactions including successful and failed payments.
    """
    __tablename__ = 'payments'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Payment identification
    payment_id = Column(String(100), unique=True, nullable=False, index=True)
    provider_payment_id = Column(String(200), index=True)  # Provider's transaction ID
    
    # Payment details
    provider = Column(SQLEnum(PaymentProvider), nullable=False, index=True)
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    status = Column(SQLEnum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING, index=True)
    
    # Amounts
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(SQLEnum(Currency), nullable=False, default=Currency.USD)
    fee_amount = Column(Numeric(10, 2), default=Decimal('0'))  # Transaction fee
    net_amount = Column(Numeric(10, 2))  # Amount after fees
    
    # References
    booking_id = Column(Integer, ForeignKey('bookings.id'), nullable=True, index=True)
    customer_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    # Customer information
    customer_email = Column(String(255), nullable=False)
    customer_name = Column(String(255))
    
    # Description
    description = Column(Text, nullable=False)
    
    # URLs
    checkout_url = Column(String(500))  # Payment checkout URL
    return_url = Column(String(500))
    cancel_url = Column(String(500))
    
    # Metadata
    metadata = Column(JSON, default=dict)  # Additional provider-specific data
    
    # Error handling
    error_code = Column(String(100))
    error_message = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)  # When payment was completed
    failed_at = Column(DateTime)  # When payment failed
    
    # Relationships
    booking = relationship("Booking", back_populates="payments")
    customer = relationship("User", back_populates="payments")
    refunds = relationship("Refund", back_populates="payment", cascade="all, delete-orphan")
    webhook_events = relationship("WebhookEvent", back_populates="payment", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_payment_provider_status', 'provider', 'status'),
        Index('idx_payment_customer_created', 'customer_id', 'created_at'),
        Index('idx_payment_booking', 'booking_id'),
    )
    
    def __repr__(self):
        return f"<Payment(id={self.id}, payment_id={self.payment_id}, status={self.status}, amount={self.amount})>"
    
    @property
    def is_completed(self) -> bool:
        """Check if payment is completed"""
        return self.status == PaymentStatus.COMPLETED
    
    @property
    def is_pending(self) -> bool:
        """Check if payment is pending"""
        return self.status in [PaymentStatus.PENDING, PaymentStatus.PROCESSING]
    
    @property
    def is_failed(self) -> bool:
        """Check if payment failed"""
        return self.status in [PaymentStatus.FAILED, PaymentStatus.CANCELLED]
    
    @property
    def is_refunded(self) -> bool:
        """Check if payment is refunded"""
        return self.status in [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED]
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'payment_id': self.payment_id,
            'provider': self.provider.value if self.provider else None,
            'status': self.status.value if self.status else None,
            'amount': float(self.amount) if self.amount else 0,
            'currency': self.currency.value if self.currency else None,
            'customer_email': self.customer_email,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }


class Refund(Base):
    """
    Payment refund model.
    
    Stores refund transactions (full or partial).
    """
    __tablename__ = 'refunds'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Refund identification
    refund_id = Column(String(100), unique=True, nullable=False, index=True)
    provider_refund_id = Column(String(200))  # Provider's refund ID
    
    # Reference to payment
    payment_id = Column(Integer, ForeignKey('payments.id'), nullable=False, index=True)
    
    # Refund details
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(SQLEnum(Currency), nullable=False)
    status = Column(String(50), nullable=False, default='pending', index=True)
    
    # Reason
    reason = Column(Text)
    notes = Column(Text)
    
    # Initiated by
    initiated_by = Column(Integer, ForeignKey('users.id'))
    
    # Metadata
    metadata = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    payment = relationship("Payment", back_populates="refunds")
    initiator = relationship("User", foreign_keys=[initiated_by])
    
    # Indexes
    __table_args__ = (
        Index('idx_refund_payment', 'payment_id'),
        Index('idx_refund_status', 'status'),
    )
    
    def __repr__(self):
        return f"<Refund(id={self.id}, refund_id={self.refund_id}, amount={self.amount})>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'refund_id': self.refund_id,
            'payment_id': self.payment_id,
            'amount': float(self.amount) if self.amount else 0,
            'currency': self.currency.value if self.currency else None,
            'status': self.status,
            'reason': self.reason,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class WebhookEvent(Base):
    """
    Webhook event log.
    
    Stores all incoming webhook events from payment providers.
    """
    __tablename__ = 'webhook_events'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Event identification
    event_id = Column(String(100), unique=True, nullable=False, index=True)
    provider = Column(SQLEnum(PaymentProvider), nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    
    # Reference to payment (if applicable)
    payment_id = Column(Integer, ForeignKey('payments.id'), nullable=True, index=True)
    
    # Event data
    payload = Column(JSON, nullable=False)  # Full webhook payload
    headers = Column(JSON)  # HTTP headers
    
    # Processing
    processed = Column(Boolean, default=False, nullable=False, index=True)
    processed_at = Column(DateTime)
    processing_error = Column(Text)
    
    # Verification
    signature = Column(String(500))
    signature_verified = Column(Boolean, default=False)
    
    # Timestamps
    received_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    payment = relationship("Payment", back_populates="webhook_events")
    
    # Indexes
    __table_args__ = (
        Index('idx_webhook_provider_type', 'provider', 'event_type'),
        Index('idx_webhook_processed', 'processed', 'received_at'),
    )
    
    def __repr__(self):
        return f"<WebhookEvent(id={self.id}, provider={self.provider}, event_type={self.event_type})>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'event_id': self.event_id,
            'provider': self.provider.value if self.provider else None,
            'event_type': self.event_type,
            'processed': self.processed,
            'received_at': self.received_at.isoformat() if self.received_at else None
        }


class PaymentMethod(Base):
    """
    Saved payment method (for repeat customers).
    
    Stores tokenized payment methods for future use.
    """
    __tablename__ = 'payment_methods'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # User reference
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    # Provider details
    provider = Column(SQLEnum(PaymentProvider), nullable=False)
    provider_method_id = Column(String(200), nullable=False)  # Tokenized payment method ID
    
    # Method type
    method_type = Column(String(50), nullable=False)  # card, paypal_account, etc.
    
    # Card details (if applicable)
    card_brand = Column(String(50))  # visa, mastercard, etc.
    card_last4 = Column(String(4))
    card_exp_month = Column(Integer)
    card_exp_year = Column(Integer)
    
    # PayPal details (if applicable)
    paypal_email = Column(String(255))
    
    # Status
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Metadata
    metadata = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="payment_methods")
    
    # Indexes
    __table_args__ = (
        Index('idx_payment_method_user', 'user_id'),
        Index('idx_payment_method_provider', 'provider'),
    )
    
    def __repr__(self):
        return f"<PaymentMethod(id={self.id}, user_id={self.user_id}, provider={self.provider})>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'provider': self.provider.value if self.provider else None,
            'method_type': self.method_type,
            'card_brand': self.card_brand,
            'card_last4': self.card_last4,
            'is_default': self.is_default,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class PaymentPlan(Base):
    """
    Payment plan for installment payments.
    
    Allows customers to pay in multiple installments.
    """
    __tablename__ = 'payment_plans'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Plan identification
    plan_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # References
    booking_id = Column(Integer, ForeignKey('bookings.id'), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    # Plan details
    total_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(SQLEnum(Currency), nullable=False)
    number_of_installments = Column(Integer, nullable=False)
    installment_amount = Column(Numeric(10, 2), nullable=False)
    
    # Status
    status = Column(String(50), nullable=False, default='active', index=True)
    
    # Paid tracking
    paid_installments = Column(Integer, default=0)
    paid_amount = Column(Numeric(10, 2), default=Decimal('0'))
    remaining_amount = Column(Numeric(10, 2))
    
    # Metadata
    metadata = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)
    
    # Relationships
    booking = relationship("Booking", back_populates="payment_plans")
    customer = relationship("User", back_populates="payment_plans")
    installments = relationship("Installment", back_populates="payment_plan", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<PaymentPlan(id={self.id}, plan_id={self.plan_id}, status={self.status})>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'plan_id': self.plan_id,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'installment_amount': float(self.installment_amount) if self.installment_amount else 0,
            'number_of_installments': self.number_of_installments,
            'paid_installments': self.paid_installments,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Installment(Base):
    """
    Individual installment payment.
    """
    __tablename__ = 'installments'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Reference to payment plan
    payment_plan_id = Column(Integer, ForeignKey('payment_plans.id'), nullable=False, index=True)
    
    # Installment details
    installment_number = Column(Integer, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(SQLEnum(Currency), nullable=False)
    
    # Due date
    due_date = Column(DateTime, nullable=False, index=True)
    
    # Status
    status = Column(String(50), nullable=False, default='pending', index=True)
    
    # Payment reference
    payment_id = Column(Integer, ForeignKey('payments.id'), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    paid_at = Column(DateTime)
    
    # Relationships
    payment_plan = relationship("PaymentPlan", back_populates="installments")
    payment = relationship("Payment")
    
    # Indexes
    __table_args__ = (
        Index('idx_installment_plan_number', 'payment_plan_id', 'installment_number'),
        Index('idx_installment_due_date', 'due_date'),
    )
    
    def __repr__(self):
        return f"<Installment(id={self.id}, plan_id={self.payment_plan_id}, number={self.installment_number})>"
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'installment_number': self.installment_number,
            'amount': float(self.amount) if self.amount else 0,
            'currency': self.currency.value if self.currency else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'status': self.status,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None
        }
