"""
SQLAlchemy Models for Spirit Tours Platform
Complete database schema with all tables
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, 
    Numeric, ForeignKey, CheckConstraint, UniqueConstraint,
    JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()


class User(Base):
    """User model for authentication and profiles"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255))
    phone = Column(String(50))
    role = Column(String(50), default="customer")
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    avatar_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    email_logs = relationship("EmailLog", back_populates="user", cascade="all, delete-orphan")
    analytics_events = relationship("AnalyticsEvent", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"


class Tour(Base):
    """Tour/Product catalog"""
    __tablename__ = "tours"
    
    id = Column(String(50), primary_key=True)  # e.g., "TOUR-001"
    name = Column(String(255), nullable=False)
    description = Column(Text)
    destination = Column(String(255))
    duration_days = Column(Integer)
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="USD")
    max_participants = Column(Integer)
    difficulty_level = Column(String(50))
    category = Column(String(100))
    highlights = Column(JSON)  # Array of strings
    included = Column(JSON)  # Array of strings
    not_included = Column(JSON)  # Array of strings
    itinerary = Column(JSON)  # Array of day objects
    images = Column(JSON)  # Array of image URLs
    is_active = Column(Boolean, default=True)
    featured = Column(Boolean, default=False)
    rating_average = Column(Numeric(3, 2), default=0.0)
    review_count = Column(Integer, default=0)
    booking_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    bookings = relationship("Booking", back_populates="tour", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="tour", cascade="all, delete-orphan")
    analytics_events = relationship("AnalyticsEvent", back_populates="tour")
    
    def __repr__(self):
        return f"<Tour(id='{self.id}', name='{self.name}', price={self.price})>"


class Booking(Base):
    """Booking/Reservation model"""
    __tablename__ = "bookings"
    
    id = Column(String(100), primary_key=True)  # e.g., "BK-2024-001"
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tour_id = Column(String(50), ForeignKey("tours.id"), nullable=False, index=True)
    travel_date = Column(DateTime(timezone=True), nullable=False)
    participants = Column(Integer, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="USD")
    status = Column(String(50), default="pending")  # pending, confirmed, cancelled, completed
    
    # Customer details
    customer_name = Column(String(255))
    customer_email = Column(String(255))
    customer_phone = Column(String(50))
    
    # Booking details
    special_requests = Column(Text)
    emergency_contact = Column(String(255))
    dietary_requirements = Column(Text)
    
    # Payment info
    stripe_payment_intent = Column(String(255), index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="bookings")
    tour = relationship("Tour", back_populates="bookings")
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="booking", cascade="all, delete-orphan")
    email_logs = relationship("EmailLog", back_populates="booking", cascade="all, delete-orphan")
    analytics_events = relationship("AnalyticsEvent", back_populates="booking")
    
    def __repr__(self):
        return f"<Booking(id='{self.id}', tour_id='{self.tour_id}', status='{self.status}')>"


class Review(Base):
    """Review and rating model"""
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tour_id = Column(String(50), ForeignKey("tours.id"), nullable=False, index=True)
    booking_id = Column(String(100), ForeignKey("bookings.id"), index=True)
    
    # Review content
    rating = Column(Integer, nullable=False)  # 1-5 stars
    title = Column(String(255))
    comment = Column(Text)
    photos = Column(JSON)  # Array of photo URLs
    
    # Metadata
    helpful_count = Column(Integer, default=0)
    verified_purchase = Column(Boolean, default=False)
    status = Column(String(50), default="pending")  # pending, approved, rejected
    moderator_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Constraints
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='check_rating_range'),
        UniqueConstraint('user_id', 'tour_id', name='unique_user_tour_review'),
    )
    
    # Relationships
    user = relationship("User", back_populates="reviews")
    tour = relationship("Tour", back_populates="reviews")
    booking = relationship("Booking", back_populates="reviews")
    
    def __repr__(self):
        return f"<Review(id={self.id}, tour_id='{self.tour_id}', rating={self.rating})>"


class Payment(Base):
    """Payment transaction model"""
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    booking_id = Column(String(100), ForeignKey("bookings.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Stripe details
    stripe_payment_intent = Column(String(255), unique=True, index=True)
    stripe_charge_id = Column(String(255))
    
    # Payment details
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="USD")
    status = Column(String(50), nullable=False)  # succeeded, pending, failed, refunded
    payment_method = Column(String(100))
    receipt_url = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="payments")
    booking = relationship("Booking", back_populates="payments")
    
    def __repr__(self):
        return f"<Payment(id={self.id}, amount={self.amount}, status='{self.status}')>"


class EmailLog(Base):
    """Email notification log"""
    __tablename__ = "email_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    booking_id = Column(String(100), ForeignKey("bookings.id"), index=True)
    
    # Email details
    email_type = Column(String(100), nullable=False)  # welcome, booking_confirmation, etc.
    recipient_email = Column(String(255), nullable=False)
    subject = Column(String(500))
    status = Column(String(50), nullable=False)  # sent, failed, pending
    sent_at = Column(DateTime(timezone=True))
    error_message = Column(Text)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="email_logs")
    booking = relationship("Booking", back_populates="email_logs")
    
    def __repr__(self):
        return f"<EmailLog(id={self.id}, type='{self.email_type}', status='{self.status}')>"


class AnalyticsEvent(Base):
    """Analytics and tracking events"""
    __tablename__ = "analytics_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(100), nullable=False, index=True)  # page_view, booking_created, etc.
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    tour_id = Column(String(50), ForeignKey("tours.id"), index=True)
    booking_id = Column(String(100), ForeignKey("bookings.id"), index=True)
    
    # Event data
    event_data = Column(JSON)  # Flexible JSON for event-specific data (renamed from 'metadata' to avoid SQLAlchemy conflict)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User", back_populates="analytics_events")
    tour = relationship("Tour", back_populates="analytics_events")
    booking = relationship("Booking", back_populates="analytics_events")
    
    def __repr__(self):
        return f"<AnalyticsEvent(id={self.id}, type='{self.event_type}')>"


# Export all models
__all__ = [
    'Base',
    'User',
    'Tour',
    'Booking',
    'Review',
    'Payment',
    'EmailLog',
    'AnalyticsEvent',
]
