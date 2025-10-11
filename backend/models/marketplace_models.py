"""
Database models for P2P Points Marketplace
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, 
    ForeignKey, Text, JSON, Enum, Numeric, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class ListingStatus(enum.Enum):
    """Status for marketplace listings"""
    ACTIVE = "active"
    PENDING = "pending"
    SOLD = "sold"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    IN_ESCROW = "in_escrow"
    SUSPENDED = "suspended"

class OfferStatus(enum.Enum):
    """Status for trading offers"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COUNTER_OFFERED = "counter_offered"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"
    AUTO_REJECTED = "auto_rejected"

class TransactionStatus(enum.Enum):
    """Status for transactions"""
    PENDING = "pending"
    IN_ESCROW = "in_escrow"
    PROCESSING = "processing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"
    REFUNDED = "refunded"
    FAILED = "failed"

class TransactionType(enum.Enum):
    """Types of marketplace transactions"""
    DIRECT_SALE = "direct_sale"
    AUCTION = "auction"
    EXCHANGE = "exchange"
    BUNDLE = "bundle"
    SUBSCRIPTION = "subscription"
    P2P_TRADE = "p2p_trade"

class PaymentMethod(enum.Enum):
    """Supported payment methods"""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    CRYPTO = "crypto"
    BANK_TRANSFER = "bank_transfer"
    PLATFORM_CREDIT = "platform_credit"
    WIRE_TRANSFER = "wire_transfer"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"

class DisputeStatus(enum.Enum):
    """Status for disputes"""
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    RESOLVED = "resolved"
    ESCALATED = "escalated"
    CLOSED = "closed"

class MarketplaceListing(Base):
    """Points listing in the marketplace"""
    __tablename__ = 'marketplace_listings'
    
    id = Column(String(20), primary_key=True)
    seller_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    points_amount = Column(Integer, nullable=False)
    points_remaining = Column(Integer, nullable=False)
    price_per_point = Column(Numeric(10, 4), nullable=False)
    currency = Column(String(3), default='USD')
    total_price = Column(Numeric(10, 2), nullable=False)
    platform_fee = Column(Numeric(10, 2))
    seller_receives = Column(Numeric(10, 2))
    
    # Listing details
    title = Column(String(200))
    description = Column(Text)
    status = Column(Enum(ListingStatus), default=ListingStatus.PENDING)
    auto_accept = Column(Boolean, default=True)
    min_purchase = Column(Integer, default=1)
    max_purchase = Column(Integer)
    
    # Payment and delivery
    payment_methods = Column(JSON)  # List of accepted payment methods
    instant_delivery = Column(Boolean, default=True)
    delivery_time_hours = Column(Integer, default=0)
    
    # Pricing options
    bundle_discount = Column(JSON)  # {quantity: discount_percentage}
    bulk_pricing = Column(JSON)  # [{min_qty: x, max_qty: y, price: z}]
    negotiable = Column(Boolean, default=False)
    
    # Categorization
    tags = Column(JSON)  # List of tags
    category = Column(String(50))
    subcategory = Column(String(50))
    
    # Escrow
    escrow_id = Column(String(20))
    escrow_release_conditions = Column(JSON)
    
    # Analytics
    views = Column(Integer, default=0)
    watchers = Column(JSON)  # List of user IDs watching
    favorite_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    expires_at = Column(DateTime)
    last_bump_at = Column(DateTime)
    sold_at = Column(DateTime)
    
    # Performance metrics
    avg_response_time = Column(Integer)  # in minutes
    completion_rate = Column(Float)
    
    # Verification
    verified = Column(Boolean, default=False)
    verification_date = Column(DateTime)
    featured = Column(Boolean, default=False)
    featured_until = Column(DateTime)
    
    # Relations
    seller = relationship("User", backref="marketplace_listings")
    offers = relationship("MarketplaceOffer", backref="listing")
    transactions = relationship("MarketplaceTransaction", backref="listing")
    
    # Indexes
    __table_args__ = (
        Index('idx_listing_status', 'status'),
        Index('idx_listing_seller', 'seller_id'),
        Index('idx_listing_price', 'price_per_point'),
        Index('idx_listing_created', 'created_at'),
        Index('idx_listing_expires', 'expires_at'),
    )

class MarketplaceOffer(Base):
    """Offers made on listings"""
    __tablename__ = 'marketplace_offers'
    
    id = Column(String(20), primary_key=True)
    listing_id = Column(String(20), ForeignKey('marketplace_listings.id'), nullable=False)
    seller_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    offerer_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Offer details
    points_amount = Column(Integer, nullable=False)
    original_price = Column(Numeric(10, 4), nullable=False)
    offered_price = Column(Numeric(10, 4), nullable=False)
    total_offer = Column(Numeric(10, 2), nullable=False)
    discount_percentage = Column(Float)
    
    # Communication
    message = Column(Text)
    conditions = Column(JSON)  # List of conditions
    seller_response = Column(Text)
    
    # Status
    status = Column(Enum(OfferStatus), default=OfferStatus.PENDING)
    auto_rejected_reason = Column(String(200))
    
    # Counter offers
    is_counter_offer = Column(Boolean, default=False)
    parent_offer_id = Column(String(20), ForeignKey('marketplace_offers.id'))
    counter_offer_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    responded_at = Column(DateTime)
    accepted_at = Column(DateTime)
    rejected_at = Column(DateTime)
    
    # Relations
    seller = relationship("User", foreign_keys=[seller_id], backref="received_offers")
    offerer = relationship("User", foreign_keys=[offerer_id], backref="made_offers")
    counter_offers = relationship("MarketplaceOffer", backref=backref("parent_offer", remote_side=[id]))
    
    # Indexes
    __table_args__ = (
        Index('idx_offer_listing', 'listing_id'),
        Index('idx_offer_status', 'status'),
        Index('idx_offer_offerer', 'offerer_id'),
        Index('idx_offer_expires', 'expires_at'),
    )

class MarketplaceTransaction(Base):
    """Completed transactions in the marketplace"""
    __tablename__ = 'marketplace_transactions'
    
    id = Column(String(20), primary_key=True)
    type = Column(Enum(TransactionType), nullable=False)
    listing_id = Column(String(20), ForeignKey('marketplace_listings.id'))
    offer_id = Column(String(20), ForeignKey('marketplace_offers.id'))
    
    # Parties
    seller_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    buyer_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Transaction details
    points_amount = Column(Integer, nullable=False)
    price_per_point = Column(Numeric(10, 4), nullable=False)
    base_price = Column(Numeric(10, 2), nullable=False)
    discount = Column(Numeric(10, 2), default=0)
    total_price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default='USD')
    
    # Fees
    platform_fee = Column(Numeric(10, 2))
    payment_processing_fee = Column(Numeric(10, 2))
    seller_receives = Column(Numeric(10, 2))
    
    # Payment
    payment_method = Column(Enum(PaymentMethod))
    payment_reference = Column(String(100))
    payment_status = Column(String(50))
    
    # Delivery
    delivery_method = Column(String(50))
    delivered = Column(Boolean, default=False)
    delivery_confirmed_at = Column(DateTime)
    
    # Status
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    
    # Escrow
    escrow_id = Column(String(20))
    escrow_released = Column(Boolean, default=False)
    escrow_release_at = Column(DateTime)
    
    # Blockchain (for high-value transactions)
    blockchain_tx_hash = Column(String(100))
    smart_contract_address = Column(String(100))
    nft_token_id = Column(String(100))
    
    # Ratings and feedback
    seller_rating = Column(Integer)
    buyer_rating = Column(Integer)
    seller_feedback = Column(Text)
    buyer_feedback = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime)
    completed_at = Column(DateTime)
    cancelled_at = Column(DateTime)
    refunded_at = Column(DateTime)
    
    # Relations
    seller = relationship("User", foreign_keys=[seller_id], backref="sold_transactions")
    buyer = relationship("User", foreign_keys=[buyer_id], backref="bought_transactions")
    dispute = relationship("MarketplaceDispute", backref="transaction", uselist=False)
    
    # Indexes
    __table_args__ = (
        Index('idx_transaction_status', 'status'),
        Index('idx_transaction_seller', 'seller_id'),
        Index('idx_transaction_buyer', 'buyer_id'),
        Index('idx_transaction_created', 'created_at'),
        Index('idx_transaction_type', 'type'),
    )

class MarketplaceEscrow(Base):
    """Escrow management for secure transactions"""
    __tablename__ = 'marketplace_escrow'
    
    id = Column(String(20), primary_key=True)
    transaction_id = Column(String(20), ForeignKey('marketplace_transactions.id'))
    listing_id = Column(String(20), ForeignKey('marketplace_listings.id'))
    
    # Escrow details
    seller_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    buyer_id = Column(Integer, ForeignKey('users.id'))
    points_amount = Column(Integer, nullable=False)
    funds_amount = Column(Numeric(10, 2))
    currency = Column(String(3), default='USD')
    
    # Status
    status = Column(String(50), default='locked')  # locked, released, refunded, disputed
    
    # Release conditions
    release_conditions = Column(JSON)
    auto_release = Column(Boolean, default=True)
    auto_release_hours = Column(Integer, default=24)
    
    # Verification
    seller_confirmed = Column(Boolean, default=False)
    buyer_confirmed = Column(Boolean, default=False)
    admin_override = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    locked_at = Column(DateTime)
    scheduled_release_at = Column(DateTime)
    released_at = Column(DateTime)
    refunded_at = Column(DateTime)
    
    # Relations
    seller = relationship("User", foreign_keys=[seller_id], backref="seller_escrows")
    buyer = relationship("User", foreign_keys=[buyer_id], backref="buyer_escrows")
    
    # Indexes
    __table_args__ = (
        Index('idx_escrow_status', 'status'),
        Index('idx_escrow_seller', 'seller_id'),
        Index('idx_escrow_buyer', 'buyer_id'),
    )

class MarketplaceDispute(Base):
    """Dispute resolution for transactions"""
    __tablename__ = 'marketplace_disputes'
    
    id = Column(String(20), primary_key=True)
    transaction_id = Column(String(20), ForeignKey('marketplace_transactions.id'), unique=True)
    
    # Parties
    initiator_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    respondent_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Dispute details
    reason = Column(String(200), nullable=False)
    description = Column(Text)
    evidence = Column(JSON)  # List of evidence items
    
    # Status and resolution
    status = Column(Enum(DisputeStatus), default=DisputeStatus.OPEN)
    resolution = Column(Text)
    resolution_type = Column(String(50))  # refund, partial_refund, release_to_seller, split
    refund_amount = Column(Numeric(10, 2))
    
    # Mediator
    mediator_id = Column(Integer, ForeignKey('users.id'))
    mediator_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime)
    escalated_at = Column(DateTime)
    
    # Relations
    initiator = relationship("User", foreign_keys=[initiator_id], backref="initiated_disputes")
    respondent = relationship("User", foreign_keys=[respondent_id], backref="responded_disputes")
    mediator = relationship("User", foreign_keys=[mediator_id], backref="mediated_disputes")
    messages = relationship("DisputeMessage", backref="dispute")
    
    # Indexes
    __table_args__ = (
        Index('idx_dispute_status', 'status'),
        Index('idx_dispute_transaction', 'transaction_id'),
    )

class DisputeMessage(Base):
    """Messages in dispute resolution"""
    __tablename__ = 'dispute_messages'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    dispute_id = Column(String(20), ForeignKey('marketplace_disputes.id'), nullable=False)
    sender_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Message content
    message = Column(Text, nullable=False)
    attachments = Column(JSON)  # List of attachment URLs
    is_system_message = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime)
    
    # Relations
    sender = relationship("User", backref="dispute_messages")

class MarketplacePriceHistory(Base):
    """Historical price data for analytics"""
    __tablename__ = 'marketplace_price_history'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Price data
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    average_price = Column(Numeric(10, 4), nullable=False)
    median_price = Column(Numeric(10, 4))
    min_price = Column(Numeric(10, 4))
    max_price = Column(Numeric(10, 4))
    
    # Volume data
    total_volume = Column(Integer)  # Total points traded
    transaction_count = Column(Integer)
    
    # Market metrics
    bid_ask_spread = Column(Numeric(10, 4))
    volatility = Column(Float)
    liquidity_index = Column(Float)
    
    # Indexes
    __table_args__ = (
        Index('idx_price_history_timestamp', 'timestamp'),
    )

class MarketplaceUserStats(Base):
    """User statistics for marketplace participation"""
    __tablename__ = 'marketplace_user_stats'
    
    user_id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    
    # Trading stats
    total_points_sold = Column(Integer, default=0)
    total_points_bought = Column(Integer, default=0)
    total_sales_value = Column(Numeric(12, 2), default=0)
    total_purchase_value = Column(Numeric(12, 2), default=0)
    
    # Transaction counts
    completed_sales = Column(Integer, default=0)
    completed_purchases = Column(Integer, default=0)
    cancelled_transactions = Column(Integer, default=0)
    disputed_transactions = Column(Integer, default=0)
    
    # Ratings
    seller_rating = Column(Float)
    buyer_rating = Column(Float)
    seller_rating_count = Column(Integer, default=0)
    buyer_rating_count = Column(Integer, default=0)
    
    # Performance metrics
    avg_response_time_minutes = Column(Integer)
    completion_rate = Column(Float)
    dispute_rate = Column(Float)
    
    # Trust and verification
    trust_score = Column(Float)
    verified_seller = Column(Boolean, default=False)
    verified_buyer = Column(Boolean, default=False)
    kyc_verified = Column(Boolean, default=False)
    power_seller = Column(Boolean, default=False)
    
    # Activity
    last_sale_at = Column(DateTime)
    last_purchase_at = Column(DateTime)
    member_since = Column(DateTime, default=datetime.utcnow)
    
    # Preferences
    preferred_payment_methods = Column(JSON)
    notification_preferences = Column(JSON)
    
    # Relations
    user = relationship("User", backref="marketplace_stats", uselist=False)
    
    # Indexes
    __table_args__ = (
        Index('idx_user_stats_rating', 'seller_rating', 'buyer_rating'),
        Index('idx_user_stats_trust', 'trust_score'),
    )

class MarketplaceWatchlist(Base):
    """User watchlists for tracking listings"""
    __tablename__ = 'marketplace_watchlist'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    listing_id = Column(String(20), ForeignKey('marketplace_listings.id'), nullable=False)
    
    # Preferences
    price_alert_threshold = Column(Numeric(10, 4))  # Alert when price drops below
    quantity_alert_threshold = Column(Integer)  # Alert when quantity drops below
    
    # Timestamps
    added_at = Column(DateTime, default=datetime.utcnow)
    last_notified_at = Column(DateTime)
    
    # Relations
    user = relationship("User", backref="watchlist")
    listing = relationship("MarketplaceListing", backref="watchers_list")
    
    # Indexes and constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'listing_id'),
        Index('idx_watchlist_user', 'user_id'),
        Index('idx_watchlist_listing', 'listing_id'),
    )

class MarketplacePromotion(Base):
    """Promotional campaigns for listings"""
    __tablename__ = 'marketplace_promotions'
    
    id = Column(String(20), primary_key=True)
    listing_id = Column(String(20), ForeignKey('marketplace_listings.id'))
    seller_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Promotion details
    type = Column(String(50))  # featured, discount, bundle, flash_sale
    title = Column(String(200))
    description = Column(Text)
    
    # Discount information
    discount_type = Column(String(20))  # percentage, fixed
    discount_value = Column(Numeric(10, 2))
    min_purchase = Column(Integer)
    max_discount = Column(Numeric(10, 2))
    
    # Promotion codes
    promo_code = Column(String(50), unique=True)
    usage_limit = Column(Integer)
    usage_count = Column(Integer, default=0)
    
    # Timing
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Targeting
    target_users = Column(JSON)  # List of user IDs or criteria
    
    # Performance
    views = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    revenue_generated = Column(Numeric(12, 2), default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relations
    seller = relationship("User", backref="promotions")
    
    # Indexes
    __table_args__ = (
        Index('idx_promotion_active', 'is_active'),
        Index('idx_promotion_dates', 'start_date', 'end_date'),
        Index('idx_promotion_code', 'promo_code'),
    )