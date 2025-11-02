"""
Booking Management System Models
Comprehensive booking and calendar system for Spirit Tours
"""

from sqlalchemy import (
    Column, Integer, String, ForeignKey, DateTime, Date, Time,
    Boolean, Text, Numeric, Enum as SQLEnum, JSON, CheckConstraint,
    UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from datetime import datetime, date, time, timedelta
from enum import Enum
from typing import Optional, List, Dict, Any

from backend.database import Base


class BookingStatus(str, Enum):
    """Booking status enumeration"""
    PENDING = "pending"  # Awaiting confirmation
    CONFIRMED = "confirmed"  # Confirmed booking
    CANCELLED = "cancelled"  # Cancelled by user or admin
    COMPLETED = "completed"  # Tour completed
    NO_SHOW = "no_show"  # Customer didn't show up
    REFUNDED = "refunded"  # Payment refunded


class RecurrencePattern(str, Enum):
    """Schedule recurrence patterns"""
    NONE = "none"  # No recurrence
    DAILY = "daily"  # Every day
    WEEKLY = "weekly"  # Every week (same day)
    BIWEEKLY = "biweekly"  # Every 2 weeks
    MONTHLY = "monthly"  # Every month (same date)
    CUSTOM = "custom"  # Custom pattern (defined in recurrence_rule)


class WaitlistStatus(str, Enum):
    """Waitlist entry status"""
    ACTIVE = "active"  # Waiting for availability
    NOTIFIED = "notified"  # User notified of availability
    CONVERTED = "converted"  # Converted to booking
    EXPIRED = "expired"  # Expired without conversion
    CANCELLED = "cancelled"  # User cancelled waitlist


class BlackoutType(str, Enum):
    """Blackout date type"""
    HOLIDAY = "holiday"  # Public holiday
    MAINTENANCE = "maintenance"  # Tour maintenance
    WEATHER = "weather"  # Weather-related closure
    CUSTOM = "custom"  # Custom closure


class TourSchedule(Base):
    """
    Recurring schedule for tours
    Defines when tours are available
    """
    __tablename__ = 'tour_schedules'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    tour_id = Column(Integer, ForeignKey('tours.id'), nullable=False, index=True)
    
    # Schedule information
    name = Column(String(200), nullable=False)  # e.g., "Summer Morning Tours"
    description = Column(Text, nullable=True)
    
    # Time configuration
    start_time = Column(Time, nullable=False)  # Daily start time (e.g., 09:00)
    duration_minutes = Column(Integer, nullable=False)  # Tour duration
    
    # Recurrence pattern
    recurrence = Column(SQLEnum(RecurrencePattern), default=RecurrencePattern.WEEKLY, nullable=False)
    recurrence_rule = Column(JSON, nullable=True)  # RRULE-like structure for complex patterns
    
    # Days of week (for weekly/biweekly patterns)
    monday = Column(Boolean, default=False)
    tuesday = Column(Boolean, default=False)
    wednesday = Column(Boolean, default=False)
    thursday = Column(Boolean, default=False)
    friday = Column(Boolean, default=False)
    saturday = Column(Boolean, default=False)
    sunday = Column(Boolean, default=False)
    
    # Capacity
    max_capacity = Column(Integer, nullable=False, default=10)
    min_capacity = Column(Integer, nullable=False, default=1)  # Minimum to run tour
    
    # Validity period
    valid_from = Column(Date, nullable=False)
    valid_until = Column(Date, nullable=True)  # NULL = indefinite
    
    # Pricing override (optional)
    price_override = Column(Numeric(10, 2), nullable=True)  # Override tour base price
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tour = relationship("Tour", back_populates="schedules")
    booking_slots = relationship("BookingSlot", back_populates="schedule", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('min_capacity <= max_capacity', name='check_capacity_range'),
        CheckConstraint('duration_minutes > 0', name='check_positive_duration'),
        Index('idx_tour_schedule_active', 'tour_id', 'is_active'),
    )
    
    def __repr__(self):
        return f"<TourSchedule(id={self.id}, tour_id={self.tour_id}, name='{self.name}')>"


class BookingSlot(Base):
    """
    Individual time slots for bookings
    Generated from TourSchedule based on recurrence rules
    """
    __tablename__ = 'booking_slots'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    tour_id = Column(Integer, ForeignKey('tours.id'), nullable=False, index=True)
    schedule_id = Column(Integer, ForeignKey('tour_schedules.id'), nullable=True, index=True)
    
    # Slot information
    slot_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    
    # Capacity tracking
    max_capacity = Column(Integer, nullable=False)
    current_bookings = Column(Integer, default=0, nullable=False)
    available_spots = Column(Integer, nullable=False)  # Denormalized for performance
    
    # Pricing
    price_per_person = Column(Numeric(10, 2), nullable=False)
    
    # Status
    is_available = Column(Boolean, default=True, nullable=False, index=True)
    is_cancelled = Column(Boolean, default=False, nullable=False)
    cancellation_reason = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tour = relationship("Tour", back_populates="booking_slots")
    schedule = relationship("TourSchedule", back_populates="booking_slots")
    bookings = relationship("Booking", back_populates="booking_slot")
    waitlist_entries = relationship("WaitlistEntry", back_populates="booking_slot", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('current_bookings >= 0', name='check_non_negative_bookings'),
        CheckConstraint('available_spots >= 0', name='check_non_negative_spots'),
        CheckConstraint('current_bookings <= max_capacity', name='check_bookings_within_capacity'),
        UniqueConstraint('tour_id', 'slot_date', 'start_time', name='uq_tour_slot_datetime'),
        Index('idx_slot_availability', 'slot_date', 'is_available'),
        Index('idx_slot_tour_date', 'tour_id', 'slot_date'),
    )
    
    def __repr__(self):
        return f"<BookingSlot(id={self.id}, tour_id={self.tour_id}, date={self.slot_date}, available={self.available_spots}/{self.max_capacity})>"
    
    def is_full(self) -> bool:
        """Check if slot is fully booked"""
        return self.current_bookings >= self.max_capacity or self.available_spots <= 0
    
    def has_availability(self, num_people: int = 1) -> bool:
        """Check if slot has availability for given number of people"""
        return self.is_available and not self.is_cancelled and self.available_spots >= num_people


class BlackoutDate(Base):
    """
    Dates when tours are not available
    Can be specific to a tour or global
    """
    __tablename__ = 'blackout_dates'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key (nullable for global blackouts)
    tour_id = Column(Integer, ForeignKey('tours.id'), nullable=True, index=True)
    
    # Date range
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    
    # Blackout information
    blackout_type = Column(SQLEnum(BlackoutType), default=BlackoutType.CUSTOM, nullable=False)
    name = Column(String(200), nullable=False)  # e.g., "Christmas Holiday"
    description = Column(Text, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Relationships
    tour = relationship("Tour", back_populates="blackout_dates")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('start_date <= end_date', name='check_valid_date_range'),
        Index('idx_blackout_date_range', 'start_date', 'end_date'),
    )
    
    def __repr__(self):
        tour_info = f"tour_id={self.tour_id}" if self.tour_id else "GLOBAL"
        return f"<BlackoutDate(id={self.id}, {tour_info}, {self.start_date} to {self.end_date})>"
    
    def is_date_blocked(self, check_date: date) -> bool:
        """Check if a specific date is blocked"""
        return self.is_active and self.start_date <= check_date <= self.end_date


class Booking(Base):
    """
    Enhanced booking model with calendar integration
    Tracks individual tour bookings with full lifecycle
    """
    __tablename__ = 'bookings'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    tour_id = Column(Integer, ForeignKey('tours.id'), nullable=False, index=True)
    booking_slot_id = Column(Integer, ForeignKey('booking_slots.id'), nullable=True, index=True)
    payment_id = Column(Integer, ForeignKey('payments.id'), nullable=True)
    
    # Booking reference
    booking_reference = Column(String(50), unique=True, nullable=False, index=True)
    
    # Booking details
    booking_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    tour_date = Column(Date, nullable=False, index=True)
    tour_time = Column(Time, nullable=True)
    
    # Party information
    num_adults = Column(Integer, default=1, nullable=False)
    num_children = Column(Integer, default=0, nullable=False)
    num_infants = Column(Integer, default=0, nullable=False)
    total_people = Column(Integer, nullable=False)  # Denormalized
    
    # Pricing
    price_per_adult = Column(Numeric(10, 2), nullable=False)
    price_per_child = Column(Numeric(10, 2), default=0, nullable=False)
    price_per_infant = Column(Numeric(10, 2), default=0, nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0, nullable=False)
    tax_amount = Column(Numeric(10, 2), default=0, nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    
    # Customer information
    customer_name = Column(String(200), nullable=False)
    customer_email = Column(String(255), nullable=False, index=True)
    customer_phone = Column(String(50), nullable=True)
    
    # Special requirements
    special_requirements = Column(Text, nullable=True)
    dietary_restrictions = Column(Text, nullable=True)
    accessibility_needs = Column(Text, nullable=True)
    
    # Status tracking
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PENDING, nullable=False, index=True)
    
    # Cancellation information
    cancelled_at = Column(DateTime, nullable=True)
    cancelled_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    refund_amount = Column(Numeric(10, 2), nullable=True)
    
    # Modification tracking
    modified_at = Column(DateTime, nullable=True)
    modification_notes = Column(Text, nullable=True)
    original_booking_id = Column(Integer, ForeignKey('bookings.id'), nullable=True)
    
    # Confirmation
    confirmed_at = Column(DateTime, nullable=True)
    confirmation_sent_at = Column(DateTime, nullable=True)
    reminder_sent_at = Column(DateTime, nullable=True)
    
    # Completion
    completed_at = Column(DateTime, nullable=True)
    no_show = Column(Boolean, default=False, nullable=False)
    
    # Review tracking
    review_requested_at = Column(DateTime, nullable=True)
    review_id = Column(Integer, ForeignKey('reviews.id'), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    metadata = Column(JSON, nullable=True)  # Additional flexible data
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="bookings")
    tour = relationship("Tour", back_populates="bookings")
    booking_slot = relationship("BookingSlot", back_populates="bookings")
    payment = relationship("Payment", back_populates="booking")
    modifications = relationship("Booking", foreign_keys=[original_booking_id])
    
    # Constraints
    __table_args__ = (
        CheckConstraint('num_adults >= 0', name='check_non_negative_adults'),
        CheckConstraint('num_children >= 0', name='check_non_negative_children'),
        CheckConstraint('num_infants >= 0', name='check_non_negative_infants'),
        CheckConstraint('total_people > 0', name='check_positive_total_people'),
        CheckConstraint('total_amount >= 0', name='check_non_negative_total'),
        Index('idx_booking_status_date', 'status', 'tour_date'),
        Index('idx_booking_user_date', 'user_id', 'tour_date'),
        Index('idx_booking_tour_date', 'tour_id', 'tour_date'),
    )
    
    def __repr__(self):
        return f"<Booking(id={self.id}, reference='{self.booking_reference}', status={self.status})>"
    
    def is_modifiable(self) -> bool:
        """Check if booking can be modified"""
        return self.status in [BookingStatus.PENDING, BookingStatus.CONFIRMED]
    
    def is_cancellable(self) -> bool:
        """Check if booking can be cancelled"""
        return self.status in [BookingStatus.PENDING, BookingStatus.CONFIRMED]
    
    def calculate_total_people(self) -> int:
        """Calculate total number of people"""
        return self.num_adults + self.num_children + self.num_infants


class WaitlistEntry(Base):
    """
    Waitlist for fully booked tours
    Allows customers to be notified when spots become available
    """
    __tablename__ = 'waitlist_entries'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    tour_id = Column(Integer, ForeignKey('tours.id'), nullable=False, index=True)
    booking_slot_id = Column(Integer, ForeignKey('booking_slots.id'), nullable=True, index=True)
    
    # Waitlist information
    requested_date = Column(Date, nullable=False, index=True)
    requested_time = Column(Time, nullable=True)
    num_people = Column(Integer, nullable=False)
    
    # Contact information
    customer_name = Column(String(200), nullable=False)
    customer_email = Column(String(255), nullable=False, index=True)
    customer_phone = Column(String(50), nullable=True)
    
    # Status
    status = Column(SQLEnum(WaitlistStatus), default=WaitlistStatus.ACTIVE, nullable=False, index=True)
    priority = Column(Integer, default=0, nullable=False)  # Higher = higher priority
    
    # Notification tracking
    notified_at = Column(DateTime, nullable=True)
    notification_expires_at = Column(DateTime, nullable=True)
    
    # Conversion tracking
    converted_at = Column(DateTime, nullable=True)
    booking_id = Column(Integer, ForeignKey('bookings.id'), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="waitlist_entries")
    tour = relationship("Tour", back_populates="waitlist_entries")
    booking_slot = relationship("BookingSlot", back_populates="waitlist_entries")
    booking = relationship("Booking", foreign_keys=[booking_id])
    
    # Constraints
    __table_args__ = (
        CheckConstraint('num_people > 0', name='check_positive_waitlist_people'),
        Index('idx_waitlist_status_date', 'status', 'requested_date'),
        Index('idx_waitlist_tour_date', 'tour_id', 'requested_date'),
        Index('idx_waitlist_priority', 'priority', 'created_at'),
    )
    
    def __repr__(self):
        return f"<WaitlistEntry(id={self.id}, tour_id={self.tour_id}, status={self.status})>"
    
    def is_expired(self) -> bool:
        """Check if waitlist entry has expired"""
        if self.status == WaitlistStatus.NOTIFIED and self.notification_expires_at:
            return datetime.utcnow() > self.notification_expires_at
        return False


class BookingModificationLog(Base):
    """
    Audit log for booking modifications
    Tracks all changes to bookings for accountability
    """
    __tablename__ = 'booking_modification_logs'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    booking_id = Column(Integer, ForeignKey('bookings.id'), nullable=False, index=True)
    modified_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Modification details
    modification_type = Column(String(50), nullable=False)  # e.g., "status_change", "date_change", "cancellation"
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    
    # Metadata
    reason = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    booking = relationship("Booking")
    
    def __repr__(self):
        return f"<BookingModificationLog(id={self.id}, booking_id={self.booking_id}, type='{self.modification_type}')>"
