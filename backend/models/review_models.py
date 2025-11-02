"""
Review and Rating System Models
Comprehensive review system with ratings, moderation, and analytics
"""

from sqlalchemy import (
    Column, Integer, String, ForeignKey, DateTime, Date, Boolean,
    Text, Numeric, Enum as SQLEnum, JSON, CheckConstraint,
    UniqueConstraint, Index, Float
)
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any

from backend.database import Base


class ReviewStatus(str, Enum):
    """Review status enumeration"""
    PENDING = "pending"  # Awaiting moderation
    APPROVED = "approved"  # Published
    REJECTED = "rejected"  # Rejected by moderator
    FLAGGED = "flagged"  # Flagged by users
    HIDDEN = "hidden"  # Hidden by admin/author


class ReviewFlag(str, Enum):
    """Review flag reason enumeration"""
    SPAM = "spam"
    INAPPROPRIATE = "inappropriate"
    FAKE = "fake"
    OFF_TOPIC = "off_topic"
    HARASSMENT = "harassment"
    OTHER = "other"


class MediaType(str, Enum):
    """Review media type"""
    IMAGE = "image"
    VIDEO = "video"


class Review(Base):
    """
    Tour reviews with ratings and detailed feedback
    """
    __tablename__ = 'reviews'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    tour_id = Column(Integer, ForeignKey('tours.id'), nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey('bookings.id'), nullable=True, index=True)
    
    # Overall rating (1-5 stars)
    rating = Column(Integer, nullable=False, index=True)
    
    # Detailed ratings (1-5 scale)
    value_rating = Column(Integer, nullable=True)  # Value for money
    guide_rating = Column(Integer, nullable=True)  # Tour guide quality
    organization_rating = Column(Integer, nullable=True)  # Organization
    experience_rating = Column(Integer, nullable=True)  # Overall experience
    
    # Review content
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    
    # Traveler information
    traveler_type = Column(String(50), nullable=True)  # solo, couple, family, business, friends
    travel_date = Column(Date, nullable=True)  # When they took the tour
    
    # Pros and cons
    pros = Column(Text, nullable=True)
    cons = Column(Text, nullable=True)
    
    # Status and moderation
    status = Column(SQLEnum(ReviewStatus), default=ReviewStatus.PENDING, nullable=False, index=True)
    moderation_notes = Column(Text, nullable=True)
    moderated_at = Column(DateTime, nullable=True)
    moderated_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Verification
    is_verified_purchase = Column(Boolean, default=False, nullable=False, index=True)
    
    # Engagement metrics
    helpful_count = Column(Integer, default=0, nullable=False)
    not_helpful_count = Column(Integer, default=0, nullable=False)
    flag_count = Column(Integer, default=0, nullable=False)
    response_count = Column(Integer, default=0, nullable=False)
    
    # SEO and visibility
    is_featured = Column(Boolean, default=False, nullable=False, index=True)
    featured_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime, nullable=True, index=True)
    
    # Language
    language = Column(String(10), default='en', nullable=False, index=True)
    
    # Metadata
    metadata = Column(JSON, nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="reviews")
    tour = relationship("Tour", back_populates="reviews")
    booking = relationship("Booking", back_populates="review")
    moderator = relationship("User", foreign_keys=[moderated_by])
    media = relationship("ReviewMedia", back_populates="review", cascade="all, delete-orphan")
    responses = relationship("ReviewResponse", back_populates="review", cascade="all, delete-orphan")
    votes = relationship("ReviewVote", back_populates="review", cascade="all, delete-orphan")
    flags = relationship("ReviewFlag", back_populates="review", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='check_valid_rating'),
        CheckConstraint('value_rating IS NULL OR (value_rating >= 1 AND value_rating <= 5)', name='check_valid_value_rating'),
        CheckConstraint('guide_rating IS NULL OR (guide_rating >= 1 AND guide_rating <= 5)', name='check_valid_guide_rating'),
        CheckConstraint('organization_rating IS NULL OR (organization_rating >= 1 AND organization_rating <= 5)', name='check_valid_organization_rating'),
        CheckConstraint('experience_rating IS NULL OR (experience_rating >= 1 AND experience_rating <= 5)', name='check_valid_experience_rating'),
        CheckConstraint('helpful_count >= 0', name='check_non_negative_helpful'),
        CheckConstraint('not_helpful_count >= 0', name='check_non_negative_not_helpful'),
        CheckConstraint('flag_count >= 0', name='check_non_negative_flags'),
        UniqueConstraint('user_id', 'tour_id', 'booking_id', name='uq_user_tour_booking_review'),
        Index('idx_review_tour_status', 'tour_id', 'status'),
        Index('idx_review_tour_rating', 'tour_id', 'rating'),
        Index('idx_review_verified_featured', 'is_verified_purchase', 'is_featured'),
    )
    
    def __repr__(self):
        return f"<Review(id={self.id}, tour_id={self.tour_id}, rating={self.rating}, status={self.status})>"
    
    def calculate_helpfulness_score(self) -> float:
        """Calculate review helpfulness score (0-1)"""
        total_votes = self.helpful_count + self.not_helpful_count
        if total_votes == 0:
            return 0.0
        return self.helpful_count / total_votes
    
    def calculate_average_detailed_rating(self) -> Optional[float]:
        """Calculate average of detailed ratings"""
        ratings = [
            r for r in [
                self.value_rating,
                self.guide_rating,
                self.organization_rating,
                self.experience_rating
            ] if r is not None
        ]
        if not ratings:
            return None
        return sum(ratings) / len(ratings)


class ReviewMedia(Base):
    """
    Photos and videos attached to reviews
    """
    __tablename__ = 'review_media'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key
    review_id = Column(Integer, ForeignKey('reviews.id'), nullable=False, index=True)
    
    # Media details
    media_type = Column(SQLEnum(MediaType), nullable=False)
    file_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    
    # Metadata
    file_size = Column(Integer, nullable=True)  # in bytes
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    duration = Column(Integer, nullable=True)  # for videos, in seconds
    
    # Caption
    caption = Column(String(500), nullable=True)
    
    # Order
    display_order = Column(Integer, default=0, nullable=False)
    
    # Moderation
    is_approved = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    review = relationship("Review", back_populates="media")
    
    def __repr__(self):
        return f"<ReviewMedia(id={self.id}, review_id={self.review_id}, type={self.media_type})>"


class ReviewResponse(Base):
    """
    Responses from tour operators to reviews
    """
    __tablename__ = 'review_responses'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    review_id = Column(Integer, ForeignKey('reviews.id'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)  # Responder
    
    # Response content
    content = Column(Text, nullable=False)
    
    # Status
    is_official = Column(Boolean, default=False, nullable=False)  # From tour operator
    is_visible = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    review = relationship("Review", back_populates="responses")
    user = relationship("User", back_populates="review_responses")
    
    def __repr__(self):
        return f"<ReviewResponse(id={self.id}, review_id={self.review_id}, official={self.is_official})>"


class ReviewVote(Base):
    """
    User votes on review helpfulness
    """
    __tablename__ = 'review_votes'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    review_id = Column(Integer, ForeignKey('reviews.id'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    # Vote
    is_helpful = Column(Boolean, nullable=False)  # True = helpful, False = not helpful
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    review = relationship("Review", back_populates="votes")
    user = relationship("User", back_populates="review_votes")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('review_id', 'user_id', name='uq_review_user_vote'),
        Index('idx_vote_review_helpful', 'review_id', 'is_helpful'),
    )
    
    def __repr__(self):
        return f"<ReviewVote(id={self.id}, review_id={self.review_id}, helpful={self.is_helpful})>"


class ReviewFlagReport(Base):
    """
    User reports/flags on inappropriate reviews
    """
    __tablename__ = 'review_flags'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    review_id = Column(Integer, ForeignKey('reviews.id'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    
    # Flag details
    flag_reason = Column(SQLEnum(ReviewFlag), nullable=False)
    description = Column(Text, nullable=True)
    
    # Status
    is_resolved = Column(Boolean, default=False, nullable=False, index=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    review = relationship("Review", back_populates="flags")
    reporter = relationship("User", foreign_keys=[user_id])
    resolver = relationship("User", foreign_keys=[resolved_by])
    
    # Constraints
    __table_args__ = (
        Index('idx_flag_review_resolved', 'review_id', 'is_resolved'),
    )
    
    def __repr__(self):
        return f"<ReviewFlagReport(id={self.id}, review_id={self.review_id}, reason={self.flag_reason})>"


class TourRatingAggregate(Base):
    """
    Aggregated rating statistics for tours
    Denormalized for performance
    """
    __tablename__ = 'tour_rating_aggregates'
    
    # Primary key
    tour_id = Column(Integer, ForeignKey('tours.id'), primary_key=True, index=True)
    
    # Overall statistics
    total_reviews = Column(Integer, default=0, nullable=False)
    average_rating = Column(Numeric(3, 2), default=0, nullable=False, index=True)
    
    # Rating distribution
    rating_5_count = Column(Integer, default=0, nullable=False)
    rating_4_count = Column(Integer, default=0, nullable=False)
    rating_3_count = Column(Integer, default=0, nullable=False)
    rating_2_count = Column(Integer, default=0, nullable=False)
    rating_1_count = Column(Integer, default=0, nullable=False)
    
    # Detailed rating averages
    average_value_rating = Column(Numeric(3, 2), nullable=True)
    average_guide_rating = Column(Numeric(3, 2), nullable=True)
    average_organization_rating = Column(Numeric(3, 2), nullable=True)
    average_experience_rating = Column(Numeric(3, 2), nullable=True)
    
    # Verified reviews
    verified_reviews_count = Column(Integer, default=0, nullable=False)
    
    # Featured reviews
    featured_reviews_count = Column(Integer, default=0, nullable=False)
    
    # Recent activity
    last_review_date = Column(DateTime, nullable=True)
    
    # Timestamps
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    tour = relationship("Tour", back_populates="rating_aggregate")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('total_reviews >= 0', name='check_non_negative_total_reviews'),
        CheckConstraint('average_rating >= 0 AND average_rating <= 5', name='check_valid_average_rating'),
        CheckConstraint('rating_5_count >= 0', name='check_non_negative_5'),
        CheckConstraint('rating_4_count >= 0', name='check_non_negative_4'),
        CheckConstraint('rating_3_count >= 0', name='check_non_negative_3'),
        CheckConstraint('rating_2_count >= 0', name='check_non_negative_2'),
        CheckConstraint('rating_1_count >= 0', name='check_non_negative_1'),
    )
    
    def __repr__(self):
        return f"<TourRatingAggregate(tour_id={self.tour_id}, avg={self.average_rating}, total={self.total_reviews})>"
    
    def get_rating_distribution(self) -> Dict[int, int]:
        """Get rating distribution as dictionary"""
        return {
            5: self.rating_5_count,
            4: self.rating_4_count,
            3: self.rating_3_count,
            2: self.rating_2_count,
            1: self.rating_1_count
        }
    
    def get_rating_percentages(self) -> Dict[int, float]:
        """Get rating distribution as percentages"""
        if self.total_reviews == 0:
            return {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
        
        return {
            5: (self.rating_5_count / self.total_reviews) * 100,
            4: (self.rating_4_count / self.total_reviews) * 100,
            3: (self.rating_3_count / self.total_reviews) * 100,
            2: (self.rating_2_count / self.total_reviews) * 100,
            1: (self.rating_1_count / self.total_reviews) * 100
        }


class ReviewInsight(Base):
    """
    AI-generated insights from reviews
    Common themes, sentiment analysis, etc.
    """
    __tablename__ = 'review_insights'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key
    tour_id = Column(Integer, ForeignKey('tours.id'), nullable=False, index=True)
    
    # Insight type
    insight_type = Column(String(50), nullable=False, index=True)  # theme, sentiment, trend
    
    # Insight data
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    
    # Metrics
    frequency = Column(Integer, nullable=True)  # How often mentioned
    sentiment_score = Column(Float, nullable=True)  # -1 to 1
    
    # Tags
    tags = Column(JSON, nullable=True)  # Related keywords
    
    # Period
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tour = relationship("Tour", back_populates="review_insights")
    
    def __repr__(self):
        return f"<ReviewInsight(id={self.id}, tour_id={self.tour_id}, type={self.insight_type})>"


class ReviewAnalytics(Base):
    """
    Daily/weekly/monthly review analytics
    """
    __tablename__ = 'review_analytics'
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign key
    tour_id = Column(Integer, ForeignKey('tours.id'), nullable=True, index=True)  # NULL = global
    
    # Period
    date = Column(Date, nullable=False, index=True)
    period_type = Column(String(20), nullable=False)  # daily, weekly, monthly
    
    # Metrics
    new_reviews = Column(Integer, default=0, nullable=False)
    total_reviews = Column(Integer, default=0, nullable=False)
    average_rating = Column(Numeric(3, 2), nullable=True)
    
    # Engagement
    total_votes = Column(Integer, default=0, nullable=False)
    total_responses = Column(Integer, default=0, nullable=False)
    total_flags = Column(Integer, default=0, nullable=False)
    
    # Verification
    verified_reviews = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    tour = relationship("Tour", back_populates="review_analytics")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('tour_id', 'date', 'period_type', name='uq_tour_date_period'),
        Index('idx_analytics_date_period', 'date', 'period_type'),
    )
    
    def __repr__(self):
        return f"<ReviewAnalytics(tour_id={self.tour_id}, date={self.date}, period={self.period_type})>"
