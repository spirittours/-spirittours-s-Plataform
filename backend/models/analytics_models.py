"""
Analytics Models

Database models for analytics, metrics, and dashboard data.
"""

from datetime import datetime
from typing import Optional
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, String, Integer, DateTime, Boolean, Text, JSON,
    Float, Numeric, Date, ForeignKey, Enum as SQLEnum, Index
)
from sqlalchemy.orm import relationship
from backend.database import Base


class MetricType(str, PyEnum):
    """Metric types"""
    REVENUE = "revenue"
    BOOKINGS = "bookings"
    CUSTOMERS = "customers"
    TOURS = "tours"
    REVIEWS = "reviews"
    CONVERSION = "conversion"
    TRAFFIC = "traffic"
    PERFORMANCE = "performance"


class TimeGranularity(str, PyEnum):
    """Time granularity for metrics"""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class DashboardMetric(Base):
    """
    Dashboard metrics for analytics.
    
    Stores aggregated metrics for performance monitoring.
    """
    __tablename__ = 'dashboard_metrics'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Metric identification
    metric_id = Column(String(100), unique=True, nullable=False, index=True)
    metric_type = Column(SQLEnum(MetricType), nullable=False, index=True)
    metric_name = Column(String(200), nullable=False)
    
    # Time information
    date = Column(Date, nullable=False, index=True)
    granularity = Column(SQLEnum(TimeGranularity), default=TimeGranularity.DAILY, index=True)
    
    # Metric values
    value = Column(Numeric(15, 2), nullable=False)
    count = Column(Integer, default=0)
    
    # Additional dimensions
    dimension_1 = Column(String(100), nullable=True, index=True)  # e.g., tour_id, category
    dimension_2 = Column(String(100), nullable=True, index=True)  # e.g., location, source
    
    # Metadata
    metadata = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('ix_dashboard_metrics_type_date', 'metric_type', 'date'),
        Index('ix_dashboard_metrics_date_granularity', 'date', 'granularity'),
        Index('ix_dashboard_metrics_dimensions', 'dimension_1', 'dimension_2'),
    )
    
    def __repr__(self):
        return f"<DashboardMetric(id={self.id}, type='{self.metric_type}', date='{self.date}')>"


class RevenueAnalytics(Base):
    """
    Revenue analytics tracking.
    
    Detailed revenue breakdown by various dimensions.
    """
    __tablename__ = 'revenue_analytics'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Time information
    date = Column(Date, nullable=False, index=True)
    
    # Revenue metrics
    total_revenue = Column(Numeric(15, 2), default=0, nullable=False)
    booking_revenue = Column(Numeric(15, 2), default=0)
    addon_revenue = Column(Numeric(15, 2), default=0)
    
    # Transaction counts
    total_transactions = Column(Integer, default=0)
    successful_transactions = Column(Integer, default=0)
    failed_transactions = Column(Integer, default=0)
    refunded_transactions = Column(Integer, default=0)
    
    # Refunds
    total_refunds = Column(Numeric(15, 2), default=0)
    refund_count = Column(Integer, default=0)
    
    # Average metrics
    average_transaction_value = Column(Numeric(10, 2), default=0)
    average_booking_value = Column(Numeric(10, 2), default=0)
    
    # Currency
    currency = Column(String(3), default='USD')
    
    # Dimensions
    tour_id = Column(Integer, ForeignKey('tours.id'), nullable=True, index=True)
    category = Column(String(100), nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('ix_revenue_analytics_date', 'date'),
        Index('ix_revenue_analytics_tour_date', 'tour_id', 'date'),
    )
    
    def __repr__(self):
        return f"<RevenueAnalytics(date='{self.date}', revenue={self.total_revenue})>"


class BookingAnalytics(Base):
    """
    Booking analytics tracking.
    
    Detailed booking metrics and trends.
    """
    __tablename__ = 'booking_analytics'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Time information
    date = Column(Date, nullable=False, index=True)
    
    # Booking counts
    total_bookings = Column(Integer, default=0, nullable=False)
    confirmed_bookings = Column(Integer, default=0)
    pending_bookings = Column(Integer, default=0)
    cancelled_bookings = Column(Integer, default=0)
    
    # Guest metrics
    total_guests = Column(Integer, default=0)
    average_guests_per_booking = Column(Float, default=0)
    
    # Timing metrics
    average_lead_time_days = Column(Float, default=0)  # Days between booking and tour
    
    # Conversion metrics
    page_views = Column(Integer, default=0)
    inquiries = Column(Integer, default=0)
    conversion_rate = Column(Float, default=0)  # Percentage
    
    # Cancellation metrics
    cancellation_rate = Column(Float, default=0)
    average_cancellation_lead_time = Column(Float, default=0)
    
    # Dimensions
    tour_id = Column(Integer, ForeignKey('tours.id'), nullable=True, index=True)
    source = Column(String(100), nullable=True, index=True)  # web, mobile, api
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('ix_booking_analytics_date', 'date'),
        Index('ix_booking_analytics_tour_date', 'tour_id', 'date'),
    )
    
    def __repr__(self):
        return f"<BookingAnalytics(date='{self.date}', bookings={self.total_bookings})>"


class CustomerAnalytics(Base):
    """
    Customer analytics tracking.
    
    Customer acquisition, retention, and segmentation metrics.
    """
    __tablename__ = 'customer_analytics'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Time information
    date = Column(Date, nullable=False, index=True)
    
    # Customer counts
    new_customers = Column(Integer, default=0, nullable=False)
    returning_customers = Column(Integer, default=0)
    active_customers = Column(Integer, default=0)
    churned_customers = Column(Integer, default=0)
    
    # Lifetime value
    average_customer_lifetime_value = Column(Numeric(10, 2), default=0)
    total_customer_lifetime_value = Column(Numeric(15, 2), default=0)
    
    # Engagement metrics
    average_bookings_per_customer = Column(Float, default=0)
    repeat_customer_rate = Column(Float, default=0)  # Percentage
    
    # Retention metrics
    retention_rate = Column(Float, default=0)  # Percentage
    churn_rate = Column(Float, default=0)  # Percentage
    
    # Acquisition metrics
    acquisition_cost = Column(Numeric(10, 2), default=0)
    acquisition_source = Column(String(100), nullable=True, index=True)
    
    # Segmentation
    segment = Column(String(100), nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('ix_customer_analytics_date', 'date'),
        Index('ix_customer_analytics_segment_date', 'segment', 'date'),
    )
    
    def __repr__(self):
        return f"<CustomerAnalytics(date='{self.date}', new={self.new_customers})>"


class TourPerformance(Base):
    """
    Tour performance analytics.
    
    Detailed performance metrics for individual tours.
    """
    __tablename__ = 'tour_performance'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Tour reference
    tour_id = Column(Integer, ForeignKey('tours.id'), nullable=False, index=True)
    
    # Time information
    date = Column(Date, nullable=False, index=True)
    
    # Booking metrics
    views = Column(Integer, default=0)
    bookings = Column(Integer, default=0)
    revenue = Column(Numeric(15, 2), default=0)
    
    # Performance metrics
    occupancy_rate = Column(Float, default=0)  # Percentage
    conversion_rate = Column(Float, default=0)  # Percentage
    average_rating = Column(Float, default=0)
    review_count = Column(Integer, default=0)
    
    # Guest metrics
    total_guests = Column(Integer, default=0)
    capacity_utilization = Column(Float, default=0)  # Percentage
    
    # Ranking
    popularity_rank = Column(Integer, nullable=True)
    revenue_rank = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('ix_tour_performance_tour_date', 'tour_id', 'date'),
        Index('ix_tour_performance_date', 'date'),
    )
    
    def __repr__(self):
        return f"<TourPerformance(tour_id={self.tour_id}, date='{self.date}')>"


class DashboardSnapshot(Base):
    """
    Dashboard snapshot for quick access to key metrics.
    
    Stores pre-calculated dashboard data for fast loading.
    """
    __tablename__ = 'dashboard_snapshots'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Snapshot identification
    snapshot_id = Column(String(100), unique=True, nullable=False, index=True)
    snapshot_date = Column(Date, nullable=False, index=True)
    
    # Key metrics
    total_revenue = Column(Numeric(15, 2), default=0)
    total_bookings = Column(Integer, default=0)
    total_customers = Column(Integer, default=0)
    active_tours = Column(Integer, default=0)
    
    # Growth metrics
    revenue_growth = Column(Float, default=0)  # Percentage
    booking_growth = Column(Float, default=0)  # Percentage
    customer_growth = Column(Float, default=0)  # Percentage
    
    # Performance indicators
    average_rating = Column(Float, default=0)
    conversion_rate = Column(Float, default=0)
    customer_satisfaction = Column(Float, default=0)
    
    # Snapshot data
    snapshot_data = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<DashboardSnapshot(date='{self.snapshot_date}', revenue={self.total_revenue})>"


class AnalyticsEvent(Base):
    """
    Analytics event tracking.
    
    Tracks user interactions and events for analytics.
    """
    __tablename__ = 'analytics_events'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Event identification
    event_id = Column(String(100), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    event_category = Column(String(100), nullable=True, index=True)
    
    # Event details
    event_data = Column(JSON, nullable=True)
    
    # User information
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    session_id = Column(String(100), nullable=True, index=True)
    
    # Page/source information
    page_url = Column(String(500), nullable=True)
    referrer_url = Column(String(500), nullable=True)
    source = Column(String(100), nullable=True, index=True)
    
    # Device information
    device_type = Column(String(50), nullable=True)
    browser = Column(String(100), nullable=True)
    os = Column(String(100), nullable=True)
    
    # Location information
    ip_address = Column(String(50), nullable=True)
    country = Column(String(100), nullable=True, index=True)
    city = Column(String(100), nullable=True)
    
    # Timestamp
    occurred_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Indexes
    __table_args__ = (
        Index('ix_analytics_events_type_date', 'event_type', 'occurred_at'),
        Index('ix_analytics_events_user_date', 'user_id', 'occurred_at'),
    )
    
    def __repr__(self):
        return f"<AnalyticsEvent(type='{self.event_type}', occurred_at='{self.occurred_at}')>"
