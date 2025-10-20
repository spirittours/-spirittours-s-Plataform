"""
Database Models for Access Control System
SQLAlchemy models for persisting access grants, fraud attempts, and behavioral profiles
"""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, 
    Text, JSON, Enum as SQLEnum, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

from ..database import Base

# Enums for database
class AccessLevelDB(enum.Enum):
    BLOCKED = "blocked"
    DEMO = "demo"
    BASIC = "basic"
    STANDARD = "standard"
    PREMIUM = "premium"
    VIP = "vip"
    AGENCY = "agency"
    UNLIMITED = "unlimited"
    DEVELOPER = "developer"

class AccessTypeDB(enum.Enum):
    TRIP_BASED = "trip_based"
    TIME_LIMITED = "time_limited"
    USAGE_LIMITED = "usage_limited"
    FEATURE_LIMITED = "feature_limited"
    LOCATION_LIMITED = "location_limited"
    SUBSCRIPTION = "subscription"
    PROMOTIONAL = "promotional"
    AGENCY_DELEGATED = "agency_delegated"

class AccessStatusDB(enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    SUSPENDED = "suspended"
    EXHAUSTED = "exhausted"

class FraudSeverityDB(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

# Main Models

class AccessGrant(Base):
    """Access grant model for Virtual Guide AI access control"""
    __tablename__ = 'access_grants'
    
    # Primary key
    grant_id = Column(String(100), primary_key=True)
    
    # User information
    user_id = Column(String(100), ForeignKey('users.id'), nullable=True)
    user_email = Column(String(255), nullable=False, index=True)
    
    # Access configuration
    access_level = Column(SQLEnum(AccessLevelDB), nullable=False, default=AccessLevelDB.BASIC)
    access_type = Column(SQLEnum(AccessTypeDB), nullable=False, default=AccessTypeDB.TIME_LIMITED)
    status = Column(SQLEnum(AccessStatusDB), nullable=False, default=AccessStatusDB.PENDING, index=True)
    
    # Temporal controls
    activation_date = Column(DateTime, nullable=False)
    expiration_date = Column(DateTime, nullable=True)
    pre_trip_days = Column(Integer, default=14)
    post_trip_days = Column(Integer, default=14)
    
    # Trip-based controls
    trip_id = Column(String(100), ForeignKey('trips.id'), nullable=True)
    booking_id = Column(String(100), ForeignKey('bookings.id'), nullable=True)
    allowed_destinations = Column(JSON, nullable=True)  # List of destination IDs
    
    # Usage controls
    usage_limit = Column(Integer, nullable=True)
    usage_count = Column(Integer, default=0)
    daily_limit = Column(Integer, nullable=True)
    daily_usage = Column(Integer, default=0)
    last_usage_date = Column(DateTime, nullable=True)
    
    # Feature controls
    allowed_features = Column(JSON, nullable=True)  # List of feature strings
    blocked_features = Column(JSON, nullable=True)  # List of blocked features
    allowed_personalities = Column(JSON, nullable=True)  # List of personality IDs
    
    # Agency controls
    agency_id = Column(String(100), ForeignKey('agencies.id'), nullable=True)
    granted_by = Column(String(100), ForeignKey('users.id'), nullable=True)
    
    # Security settings
    ip_whitelist = Column(JSON, nullable=True)  # List of allowed IPs
    device_whitelist = Column(JSON, nullable=True)  # List of allowed device IDs
    require_2fa = Column(Boolean, default=False)
    watermark_enabled = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="access_grants")
    trip = relationship("Trip", back_populates="access_grants")
    booking = relationship("Booking", back_populates="access_grants")
    agency = relationship("Agency", back_populates="granted_accesses")
    granter = relationship("User", foreign_keys=[granted_by])
    usage_logs = relationship("AccessUsageLog", back_populates="grant", cascade="all, delete-orphan")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_user_status', 'user_id', 'status'),
        Index('idx_activation_expiration', 'activation_date', 'expiration_date'),
        Index('idx_agency_grants', 'agency_id', 'status'),
    )

class AccessUsageLog(Base):
    """Log of access grant usage"""
    __tablename__ = 'access_usage_logs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    grant_id = Column(String(100), ForeignKey('access_grants.grant_id'), nullable=False)
    user_id = Column(String(100), ForeignKey('users.id'), nullable=False)
    
    # Usage details
    access_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    destination_id = Column(Integer, nullable=True)
    feature_used = Column(String(100), nullable=True)
    personality_used = Column(String(50), nullable=True)
    
    # Location and device
    ip_address = Column(String(45), nullable=True)
    device_id = Column(String(100), nullable=True)
    device_type = Column(String(50), nullable=True)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    
    # Session information
    session_id = Column(String(100), nullable=True)
    session_duration = Column(Integer, nullable=True)  # seconds
    
    # Relationships
    grant = relationship("AccessGrant", back_populates="usage_logs")
    user = relationship("User")
    
    # Index for quick lookups
    __table_args__ = (
        Index('idx_grant_usage', 'grant_id', 'access_time'),
        Index('idx_user_usage', 'user_id', 'access_time'),
    )

class FraudAttempt(Base):
    """Record of fraud attempts and suspicious activities"""
    __tablename__ = 'fraud_attempts'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(100), ForeignKey('users.id'), nullable=False, index=True)
    
    # Fraud details
    fraud_type = Column(String(50), nullable=False)  # 'location_spoofing', 'access_sharing', etc
    severity = Column(SQLEnum(FraudSeverityDB), nullable=False, default=FraudSeverityDB.MEDIUM)
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Detection details
    detection_method = Column(String(100), nullable=True)
    confidence_score = Column(Float, nullable=True)  # 0-100
    details = Column(JSON, nullable=True)  # Additional detection data
    
    # Location and device
    ip_address = Column(String(45), nullable=True)
    device_id = Column(String(100), nullable=True)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    
    # Action taken
    action_taken = Column(String(50), nullable=True)  # 'warning', 'suspended', 'blocked'
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(100), ForeignKey('users.id'), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="fraud_attempts")
    resolver = relationship("User", foreign_keys=[resolved_by])
    
    # Index for analytics
    __table_args__ = (
        Index('idx_fraud_user_time', 'user_id', 'detected_at'),
        Index('idx_fraud_type_severity', 'fraud_type', 'severity'),
    )

class BehavioralProfile(Base):
    """Behavioral biometrics profile for users"""
    __tablename__ = 'behavioral_profiles'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(100), ForeignKey('users.id'), unique=True, nullable=False)
    
    # Trust score
    trust_score = Column(Float, default=50.0)  # 0-100
    last_calculated = Column(DateTime, default=datetime.utcnow)
    
    # Typing patterns
    typing_speed_wpm = Column(Float, nullable=True)
    typing_rhythm_pattern = Column(JSON, nullable=True)
    
    # Navigation patterns
    avg_scroll_speed = Column(Float, nullable=True)
    click_patterns = Column(JSON, nullable=True)
    navigation_style = Column(String(50), nullable=True)
    
    # Usage patterns
    typical_session_duration = Column(Integer, nullable=True)  # minutes
    preferred_times = Column(JSON, nullable=True)  # List of hours
    preferred_days = Column(JSON, nullable=True)  # List of weekdays
    feature_usage_frequency = Column(JSON, nullable=True)
    
    # Voice patterns (if applicable)
    voice_signature = Column(JSON, nullable=True)
    speech_tempo = Column(Float, nullable=True)
    
    # Device patterns
    common_devices = Column(JSON, nullable=True)  # List of device IDs
    common_locations = Column(JSON, nullable=True)  # List of location coordinates
    common_ip_ranges = Column(JSON, nullable=True)  # List of IP ranges
    
    # Anomaly tracking
    anomaly_count = Column(Integer, default=0)
    last_anomaly_date = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    profile_version = Column(Integer, default=1)
    
    # Relationships
    user = relationship("User", back_populates="behavioral_profile")

class HoneypotTrigger(Base):
    """Record of honeypot trap triggers"""
    __tablename__ = 'honeypot_triggers'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    honeypot_id = Column(String(100), nullable=False, index=True)
    user_id = Column(String(100), ForeignKey('users.id'), nullable=False)
    
    # Trigger details
    honeypot_type = Column(String(50), nullable=False)  # 'content', 'api', 'download', etc
    triggered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    trigger_action = Column(String(100), nullable=False)  # What user tried to do
    
    # Context
    ip_address = Column(String(45), nullable=True)
    device_id = Column(String(100), nullable=True)
    session_id = Column(String(100), nullable=True)
    request_details = Column(JSON, nullable=True)
    
    # Response
    alert_sent = Column(Boolean, default=True)
    action_taken = Column(String(50), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="honeypot_triggers")
    
    # Index for detection
    __table_args__ = (
        Index('idx_honeypot_user_time', 'user_id', 'triggered_at'),
        Index('idx_honeypot_type', 'honeypot_type', 'triggered_at'),
    )

class CanaryToken(Base):
    """Canary tokens for detecting data leaks"""
    __tablename__ = 'canary_tokens'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    token_id = Column(String(100), unique=True, nullable=False)
    
    # Token configuration
    token_type = Column(String(50), nullable=False)  # 'url', 'email', 'api_key', 'file'
    token_value = Column(String(500), nullable=False)
    embedded_in = Column(String(100), nullable=True)  # Content or location ID
    
    # Assignment
    user_id = Column(String(100), ForeignKey('users.id'), nullable=True)
    content_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Trigger tracking
    triggered = Column(Boolean, default=False)
    triggered_at = Column(DateTime, nullable=True)
    trigger_source = Column(String(100), nullable=True)
    trigger_details = Column(JSON, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="canary_tokens")
    
    # Index for monitoring
    __table_args__ = (
        Index('idx_canary_token_value', 'token_value'),
        Index('idx_canary_user', 'user_id', 'triggered'),
    )

class AdminAction(Base):
    """Audit log for administrative actions"""
    __tablename__ = 'admin_actions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    admin_id = Column(String(100), ForeignKey('users.id'), nullable=False)
    
    # Action details
    action_type = Column(String(50), nullable=False)  # 'grant_access', 'revoke_access', 'killswitch', etc
    target_type = Column(String(50), nullable=False)  # 'user', 'agency', 'global'
    target_id = Column(String(100), nullable=True)
    
    # Context
    action_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Details
    action_details = Column(JSON, nullable=True)
    reason = Column(Text, nullable=True)
    
    # Relationships
    admin = relationship("User", back_populates="admin_actions")
    
    # Index for audit
    __table_args__ = (
        Index('idx_admin_action_time', 'admin_id', 'action_time'),
        Index('idx_action_type', 'action_type', 'action_time'),
    )