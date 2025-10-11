"""
Database models for raffle system, points, and social media engagement
"""
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, Text, JSON,
    ForeignKey, UniqueConstraint, Index, Enum as SQLEnum, DECIMAL, CheckConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timedelta
import enum

Base = declarative_base()

class RaffleStatus(enum.Enum):
    DRAFT = "draft"
    UPCOMING = "upcoming"
    ACTIVE = "active"
    CLOSED = "closed"
    DRAWING = "drawing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ParticipationType(enum.Enum):
    FREE = "free"
    POINTS = "points"
    PURCHASE = "purchase"
    SOCIAL = "social"
    REFERRAL = "referral"
    MIXED = "mixed"

class SocialPlatform(enum.Enum):
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    WHATSAPP = "whatsapp"

class ActionType(enum.Enum):
    FOLLOW = "follow"
    LIKE = "like"
    SHARE = "share"
    COMMENT = "comment"
    VIEW = "view"
    SUBSCRIBE = "subscribe"
    REFERRAL = "referral"
    PURCHASE = "purchase"
    CHECK_IN = "check_in"
    REVIEW = "review"
    SURVEY = "survey"
    QUIZ = "quiz"

class PrizeStatus(enum.Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    CLAIMED = "claimed"
    EXPIRED = "expired"
    TRANSFERRED = "transferred"

class Raffle(Base):
    """Main raffle/sweepstakes table"""
    __tablename__ = 'raffles'
    
    id = Column(Integer, primary_key=True)
    
    # Basic Information
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True)
    description = Column(Text)
    terms_conditions = Column(Text)
    
    # Visual Elements
    banner_image = Column(String(500))
    thumbnail_image = Column(String(500))
    video_url = Column(String(500))
    gallery_images = Column(JSON)  # Array of image URLs
    
    # Raffle Type and Requirements
    raffle_type = Column(SQLEnum(ParticipationType), default=ParticipationType.FREE)
    entry_requirements = Column(JSON)  # {social_follow: true, min_points: 100, etc}
    
    # Dates
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    draw_date = Column(DateTime)
    announcement_date = Column(DateTime)
    
    # Entry Limits
    max_entries_per_user = Column(Integer, default=1)
    max_total_entries = Column(Integer)
    allow_multiple_entries = Column(Boolean, default=False)
    points_per_entry = Column(Integer, default=0)
    
    # Social Requirements
    require_social_follow = Column(JSON)  # {facebook: true, youtube: true, etc}
    require_social_share = Column(Boolean, default=False)
    require_email_verification = Column(Boolean, default=True)
    require_phone_verification = Column(Boolean, default=False)
    
    # Geographic Restrictions
    allowed_countries = Column(JSON)  # Array of country codes
    blocked_countries = Column(JSON)  # Array of country codes
    allowed_regions = Column(JSON)  # Array of regions/states
    
    # Statistics
    total_entries = Column(Integer, default=0)
    total_participants = Column(Integer, default=0)
    total_prizes_value = Column(DECIMAL(10, 2), default=0)
    
    # Status
    status = Column(SQLEnum(RaffleStatus), default=RaffleStatus.DRAFT, index=True)
    featured = Column(Boolean, default=False)
    priority = Column(Integer, default=0)  # Higher number = higher priority
    
    # QR Code
    qr_code_url = Column(String(500))
    qr_code_data = Column(Text)
    short_url = Column(String(100), unique=True)
    
    # Notification Settings
    notify_on_entry = Column(Boolean, default=True)
    notify_on_draw = Column(Boolean, default=True)
    reminder_days_before = Column(Integer, default=3)
    
    # Legal
    legal_disclaimer = Column(Text)
    sponsor_info = Column(JSON)
    license_number = Column(String(100))
    
    # Metadata
    tags = Column(JSON)  # Array of tags for categorization
    custom_fields = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey('users.id'))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    prizes = relationship("RafflePrize", back_populates="raffle")
    entries = relationship("RaffleEntry", back_populates="raffle")
    winners = relationship("RaffleWinner", back_populates="raffle")
    
    __table_args__ = (
        CheckConstraint('end_date > start_date', name='check_raffle_dates'),
        Index('idx_raffle_status_dates', 'status', 'start_date', 'end_date'),
    )

class RafflePrize(Base):
    """Prizes for raffles"""
    __tablename__ = 'raffle_prizes'
    
    id = Column(Integer, primary_key=True)
    raffle_id = Column(Integer, ForeignKey('raffles.id'), nullable=False, index=True)
    
    # Prize Information
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))  # trip, product, voucher, cash, experience
    
    # Prize Details
    retail_value = Column(DECIMAL(10, 2), nullable=False)
    cash_alternative = Column(DECIMAL(10, 2))  # Cash value if winner prefers cash
    quantity = Column(Integer, default=1)
    prize_rank = Column(Integer, default=1)  # 1st, 2nd, 3rd prize etc
    
    # Images
    image_url = Column(String(500))
    gallery = Column(JSON)
    
    # Travel Specific (if prize is a trip)
    destination = Column(String(255))
    travel_dates = Column(JSON)  # {from: date, to: date, flexible: bool}
    includes = Column(JSON)  # Array of what's included
    excludes = Column(JSON)  # Array of what's not included
    travelers_count = Column(Integer, default=1)
    
    # Validity
    valid_from = Column(Date)
    valid_until = Column(Date)
    blackout_dates = Column(JSON)
    
    # Redemption
    redemption_instructions = Column(Text)
    voucher_code = Column(String(100))
    partner_info = Column(JSON)
    
    # Status
    status = Column(SQLEnum(PrizeStatus), default=PrizeStatus.AVAILABLE)
    claimed = Column(Boolean, default=False)
    claimed_date = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    raffle = relationship("Raffle", back_populates="prizes")
    winners = relationship("RaffleWinner", back_populates="prize")

class RaffleParticipant(Base):
    """Participants in the raffle system"""
    __tablename__ = 'raffle_participants'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True)
    
    # Personal Information
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50), index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date)
    
    # Address
    address = Column(String(255))
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    
    # Social Media Profiles
    social_profiles = Column(JSON)  # {facebook: profile_id, instagram: handle, etc}
    social_verified = Column(JSON)  # {facebook: true, youtube: false, etc}
    
    # Points System
    total_points = Column(Integer, default=0)
    available_points = Column(Integer, default=0)
    lifetime_points = Column(Integer, default=0)
    points_expiry_date = Column(DateTime)
    tier = Column(String(50), default='bronze')  # bronze, silver, gold, platinum, diamond
    
    # Engagement Metrics
    total_shares = Column(Integer, default=0)
    total_likes = Column(Integer, default=0)
    total_referrals = Column(Integer, default=0)
    engagement_score = Column(Float, default=0)  # 0-100
    
    # Limits and Restrictions
    daily_points_earned = Column(Integer, default=0)
    last_points_reset = Column(DateTime, default=datetime.utcnow)
    suspended_until = Column(DateTime)
    suspension_reason = Column(Text)
    
    # Verification
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    identity_verified = Column(Boolean, default=False)
    verification_date = Column(DateTime)
    
    # Preferences
    marketing_consent = Column(Boolean, default=False)
    newsletter_subscribed = Column(Boolean, default=False)
    notification_preferences = Column(JSON)
    language = Column(String(10), default='es')
    
    # Statistics
    raffles_entered = Column(Integer, default=0)
    raffles_won = Column(Integer, default=0)
    last_activity_date = Column(DateTime)
    
    # Fraud Detection
    risk_score = Column(Float, default=0)  # 0-100, higher = more risky
    fraud_flags = Column(JSON)  # Array of suspicious activities
    ip_addresses = Column(JSON)  # Track IPs used
    device_fingerprints = Column(JSON)  # Track devices used
    
    # Referral
    referred_by = Column(Integer, ForeignKey('raffle_participants.id'))
    referral_code = Column(String(50), unique=True, index=True)
    referral_count = Column(Integer, default=0)
    
    # Account Status
    active = Column(Boolean, default=True)
    blocked = Column(Boolean, default=False)
    blocked_reason = Column(Text)
    deleted = Column(Boolean, default=False)
    
    # Dates
    registration_date = Column(DateTime, default=datetime.utcnow)
    first_entry_date = Column(DateTime)
    last_entry_date = Column(DateTime)
    year_started = Column(Integer)  # For seniority calculation
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    entries = relationship("RaffleEntry", back_populates="participant")
    points_history = relationship("PointsTransaction", back_populates="participant")
    social_actions = relationship("SocialAction", back_populates="participant")
    wins = relationship("RaffleWinner", back_populates="participant")
    
    __table_args__ = (
        Index('idx_participant_points', 'total_points', 'tier'),
        Index('idx_participant_verification', 'email_verified', 'phone_verified'),
    )

class RaffleEntry(Base):
    """Individual entries to raffles"""
    __tablename__ = 'raffle_entries'
    
    id = Column(Integer, primary_key=True)
    raffle_id = Column(Integer, ForeignKey('raffles.id'), nullable=False, index=True)
    participant_id = Column(Integer, ForeignKey('raffle_participants.id'), nullable=False, index=True)
    
    # Entry Information
    entry_number = Column(String(100), unique=True, nullable=False, index=True)
    entry_method = Column(String(50))  # social, points, purchase, qr_code
    points_used = Column(Integer, default=0)
    
    # Source Tracking
    source = Column(String(100))  # website, mobile, qr, social
    campaign = Column(String(100))
    referrer = Column(String(255))
    qr_code_scanned = Column(String(100))
    
    # Social Requirements Met
    social_requirements = Column(JSON)  # {facebook_followed: true, youtube_subscribed: true}
    social_shares = Column(JSON)  # Array of share links/posts
    
    # Validation
    validated = Column(Boolean, default=False)
    validation_date = Column(DateTime)
    disqualified = Column(Boolean, default=False)
    disqualification_reason = Column(Text)
    
    # Device and Location
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    device_fingerprint = Column(String(255))
    location = Column(JSON)  # {country, city, coordinates}
    
    # Timestamps
    entry_date = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    raffle = relationship("Raffle", back_populates="entries")
    participant = relationship("RaffleParticipant", back_populates="entries")
    
    __table_args__ = (
        UniqueConstraint('raffle_id', 'participant_id', 'entry_number', name='uq_raffle_entry'),
        Index('idx_entry_validation', 'validated', 'disqualified'),
    )

class PointsTransaction(Base):
    """Points earned and spent by participants"""
    __tablename__ = 'points_transactions'
    
    id = Column(Integer, primary_key=True)
    participant_id = Column(Integer, ForeignKey('raffle_participants.id'), nullable=False, index=True)
    
    # Transaction Details
    points = Column(Integer, nullable=False)  # Positive for earned, negative for spent
    transaction_type = Column(String(50))  # earned, spent, expired, bonus, penalty
    category = Column(String(50))  # social, purchase, referral, raffle_entry
    
    # Source Information
    source = Column(SQLEnum(ActionType))
    source_id = Column(String(255))  # ID of the related action/purchase/etc
    platform = Column(SQLEnum(SocialPlatform))
    
    # Description
    description = Column(String(500))
    details = Column(JSON)
    
    # Validation
    verified = Column(Boolean, default=False)
    verification_date = Column(DateTime)
    
    # Anti-Fraud
    suspicious = Column(Boolean, default=False)
    fraud_check_result = Column(JSON)
    reversed = Column(Boolean, default=False)
    reversal_reason = Column(Text)
    
    # Expiration
    expires_at = Column(DateTime)
    expired = Column(Boolean, default=False)
    
    # Balance Tracking
    balance_before = Column(Integer)
    balance_after = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    participant = relationship("RaffleParticipant", back_populates="points_history")
    
    __table_args__ = (
        Index('idx_points_participant_date', 'participant_id', 'created_at'),
        Index('idx_points_type_category', 'transaction_type', 'category'),
    )

class SocialAction(Base):
    """Track social media actions for points"""
    __tablename__ = 'social_actions'
    
    id = Column(Integer, primary_key=True)
    participant_id = Column(Integer, ForeignKey('raffle_participants.id'), nullable=False, index=True)
    
    # Action Details
    platform = Column(SQLEnum(SocialPlatform), nullable=False)
    action_type = Column(SQLEnum(ActionType), nullable=False)
    
    # Target Information
    target_url = Column(String(500))
    target_id = Column(String(255))  # Post ID, video ID, etc
    target_type = Column(String(50))  # post, video, page, profile
    
    # Verification
    verified = Column(Boolean, default=False)
    verification_method = Column(String(50))  # api, manual, webhook
    verification_data = Column(JSON)
    
    # Points
    points_awarded = Column(Integer, default=0)
    points_transaction_id = Column(Integer, ForeignKey('points_transactions.id'))
    
    # Anti-Fraud
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    duplicate_check = Column(String(255))  # Hash to prevent duplicates
    
    # Rate Limiting
    daily_count = Column(Integer, default=1)
    hourly_count = Column(Integer, default=1)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    participant = relationship("RaffleParticipant", back_populates="social_actions")
    
    __table_args__ = (
        UniqueConstraint('participant_id', 'platform', 'action_type', 'target_id', 'duplicate_check', 
                        name='uq_social_action'),
        Index('idx_social_action_daily', 'participant_id', 'created_at', 'platform'),
    )

class RaffleWinner(Base):
    """Winners of raffles"""
    __tablename__ = 'raffle_winners'
    
    id = Column(Integer, primary_key=True)
    raffle_id = Column(Integer, ForeignKey('raffles.id'), nullable=False, index=True)
    participant_id = Column(Integer, ForeignKey('raffle_participants.id'), nullable=False, index=True)
    prize_id = Column(Integer, ForeignKey('raffle_prizes.id'), nullable=False, index=True)
    entry_id = Column(Integer, ForeignKey('raffle_entries.id'))
    
    # Winner Information
    position = Column(Integer)  # 1st, 2nd, 3rd place
    alternate = Column(Boolean, default=False)  # Alternate winner
    
    # Selection Process
    draw_date = Column(DateTime, nullable=False)
    draw_method = Column(String(50))  # random, points_based, jury
    draw_seed = Column(String(255))  # For verifiable randomness
    
    # Notification
    notified = Column(Boolean, default=False)
    notification_date = Column(DateTime)
    notification_method = Column(String(50))  # email, phone, mail
    response_deadline = Column(DateTime)
    
    # Acceptance
    accepted = Column(Boolean)
    acceptance_date = Column(DateTime)
    declined = Column(Boolean, default=False)
    decline_reason = Column(Text)
    
    # Prize Delivery
    prize_delivered = Column(Boolean, default=False)
    delivery_date = Column(DateTime)
    delivery_method = Column(String(100))
    tracking_number = Column(String(255))
    delivery_address = Column(JSON)
    
    # Legal
    affidavit_signed = Column(Boolean, default=False)
    tax_form_completed = Column(Boolean, default=False)
    publicity_release_signed = Column(Boolean, default=False)
    
    # Verification
    identity_verified = Column(Boolean, default=False)
    eligibility_verified = Column(Boolean, default=False)
    verification_notes = Column(Text)
    
    # Public Display
    display_name = Column(String(255))  # How winner name appears publicly
    testimonial = Column(Text)
    photo_url = Column(String(500))
    video_testimonial_url = Column(String(500))
    public_announcement = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    raffle = relationship("Raffle", back_populates="winners")
    participant = relationship("RaffleParticipant", back_populates="wins")
    prize = relationship("RafflePrize", back_populates="winners")
    
    __table_args__ = (
        UniqueConstraint('raffle_id', 'participant_id', 'prize_id', name='uq_winner'),
    )

class PointsConfiguration(Base):
    """Configuration for points system"""
    __tablename__ = 'points_configuration'
    
    id = Column(Integer, primary_key=True)
    
    # Action Points Values
    action_type = Column(SQLEnum(ActionType), nullable=False)
    platform = Column(SQLEnum(SocialPlatform))
    points_value = Column(Integer, nullable=False)
    
    # Limits
    daily_limit = Column(Integer, default=10)
    hourly_limit = Column(Integer, default=5)
    monthly_limit = Column(Integer, default=300)
    
    # Cooldown
    cooldown_minutes = Column(Integer, default=0)  # Minutes before same action can earn points again
    
    # Multipliers
    multiplier_events = Column(JSON)  # Special events that multiply points
    tier_multipliers = Column(JSON)  # {bronze: 1.0, silver: 1.2, gold: 1.5, etc}
    
    # Requirements
    min_account_age_days = Column(Integer, default=0)
    requires_verification = Column(Boolean, default=False)
    requires_purchase = Column(Boolean, default=False)
    
    # Validity
    active = Column(Boolean, default=True)
    valid_from = Column(DateTime)
    valid_until = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('action_type', 'platform', name='uq_points_config'),
    )

class LeaderBoard(Base):
    """Leaderboard snapshots"""
    __tablename__ = 'leaderboards'
    
    id = Column(Integer, primary_key=True)
    
    # Period
    year = Column(Integer, nullable=False)
    month = Column(Integer)  # NULL for yearly leaderboard
    week = Column(Integer)  # NULL for monthly/yearly
    
    # Participant
    participant_id = Column(Integer, ForeignKey('raffle_participants.id'), nullable=False)
    
    # Scores
    points_earned = Column(Integer, default=0)
    total_points = Column(Integer, default=0)
    shares_count = Column(Integer, default=0)
    likes_count = Column(Integer, default=0)
    referrals_count = Column(Integer, default=0)
    engagement_score = Column(Float, default=0)
    
    # Ranking
    overall_rank = Column(Integer)
    category_rank = Column(Integer)
    tier_rank = Column(Integer)
    country_rank = Column(Integer)
    
    # Achievements
    badges_earned = Column(JSON)
    milestones_reached = Column(JSON)
    
    snapshot_date = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('year', 'month', 'week', 'participant_id', name='uq_leaderboard_period'),
        Index('idx_leaderboard_ranking', 'year', 'overall_rank'),
    )

# Create indexes for better performance
Index('idx_raffle_active', Raffle.status, Raffle.start_date, Raffle.end_date)
Index('idx_participant_active', RaffleParticipant.active, RaffleParticipant.blocked)
Index('idx_entry_raffle_participant', RaffleEntry.raffle_id, RaffleEntry.participant_id)
Index('idx_points_daily_reset', PointsTransaction.participant_id, PointsTransaction.created_at)
Index('idx_social_verification', SocialAction.verified, SocialAction.created_at)
Index('idx_winner_raffle', RaffleWinner.raffle_id, RaffleWinner.position)