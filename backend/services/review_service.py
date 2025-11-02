"""
Review Service
Comprehensive review management with validation, moderation, and aggregation
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, case
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from decimal import Decimal
import logging
import re

from backend.models.review_models import (
    Review, ReviewMedia, ReviewResponse, ReviewVote, ReviewFlagReport,
    TourRatingAggregate, ReviewInsight, ReviewAnalytics,
    ReviewStatus, ReviewFlag, MediaType
)
from backend.models.booking_models import Booking, BookingStatus
from backend.models.tour import Tour
from backend.models.user import User

logger = logging.getLogger(__name__)


class ReviewValidationError(Exception):
    """Raised when review validation fails"""
    pass


class ReviewPermissionError(Exception):
    """Raised when user doesn't have permission"""
    pass


class ReviewService:
    """Service for managing tour reviews and ratings"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== REVIEW CREATION ====================
    
    async def create_review(
        self,
        user_id: int,
        tour_id: int,
        rating: int,
        title: str,
        content: str,
        booking_id: Optional[int] = None,
        value_rating: Optional[int] = None,
        guide_rating: Optional[int] = None,
        organization_rating: Optional[int] = None,
        experience_rating: Optional[int] = None,
        traveler_type: Optional[str] = None,
        travel_date: Optional[date] = None,
        pros: Optional[str] = None,
        cons: Optional[str] = None,
        language: str = 'en',
        media_urls: Optional[List[Dict[str, Any]]] = None
    ) -> Review:
        """
        Create a new review with validation
        
        Validates:
        - User hasn't already reviewed this tour (from same booking)
        - Rating is valid (1-5)
        - Content meets minimum requirements
        - Booking exists and is completed (if specified)
        """
        # Validate rating
        if rating < 1 or rating > 5:
            raise ReviewValidationError("Rating must be between 1 and 5")
        
        # Validate detailed ratings
        for detailed_rating in [value_rating, guide_rating, organization_rating, experience_rating]:
            if detailed_rating is not None and (detailed_rating < 1 or detailed_rating > 5):
                raise ReviewValidationError("Detailed ratings must be between 1 and 5")
        
        # Validate content
        if len(title.strip()) < 5:
            raise ReviewValidationError("Title must be at least 5 characters")
        if len(content.strip()) < 20:
            raise ReviewValidationError("Review content must be at least 20 characters")
        
        # Check for inappropriate content
        if await self._contains_inappropriate_content(title) or \
           await self._contains_inappropriate_content(content):
            raise ReviewValidationError("Review contains inappropriate content")
        
        # Check if user already reviewed this tour from this booking
        if booking_id:
            existing = self.db.query(Review).filter(
                Review.user_id == user_id,
                Review.tour_id == tour_id,
                Review.booking_id == booking_id
            ).first()
            
            if existing:
                raise ReviewValidationError("You have already reviewed this tour from this booking")
        
        # Verify booking if specified
        is_verified = False
        if booking_id:
            booking = self.db.query(Booking).filter(
                Booking.id == booking_id,
                Booking.user_id == user_id,
                Booking.tour_id == tour_id
            ).first()
            
            if not booking:
                raise ReviewValidationError("Invalid booking")
            
            if booking.status not in [BookingStatus.COMPLETED, BookingStatus.CONFIRMED]:
                raise ReviewValidationError("Can only review completed or confirmed bookings")
            
            is_verified = True
        
        # Create review
        review = Review(
            user_id=user_id,
            tour_id=tour_id,
            booking_id=booking_id,
            rating=rating,
            value_rating=value_rating,
            guide_rating=guide_rating,
            organization_rating=organization_rating,
            experience_rating=experience_rating,
            title=title.strip(),
            content=content.strip(),
            traveler_type=traveler_type,
            travel_date=travel_date,
            pros=pros.strip() if pros else None,
            cons=cons.strip() if cons else None,
            language=language,
            is_verified_purchase=is_verified,
            status=ReviewStatus.PENDING  # Requires moderation
        )
        
        self.db.add(review)
        self.db.flush()  # Get review ID
        
        # Add media if provided
        if media_urls:
            for idx, media_data in enumerate(media_urls):
                media = ReviewMedia(
                    review_id=review.id,
                    media_type=MediaType(media_data['type']),
                    file_url=media_data['url'],
                    thumbnail_url=media_data.get('thumbnail'),
                    caption=media_data.get('caption'),
                    display_order=idx
                )
                self.db.add(media)
        
        self.db.commit()
        self.db.refresh(review)
        
        # Auto-approve verified reviews with good content
        if is_verified and not await self._requires_manual_review(review):
            await self.approve_review(review.id, auto_approved=True)
        
        logger.info(f"Created review {review.id} for tour {tour_id} by user {user_id}")
        
        return review
    
    async def _contains_inappropriate_content(self, text: str) -> bool:
        """Check for inappropriate content using simple keyword matching"""
        # In production, this would use a more sophisticated content moderation API
        inappropriate_patterns = [
            r'\b(spam|scam|fake)\b',
            r'http[s]?://',  # No URLs in reviews
            r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',  # Phone numbers
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'  # Emails
        ]
        
        text_lower = text.lower()
        for pattern in inappropriate_patterns:
            if re.search(pattern, text_lower):
                return True
        
        return False
    
    async def _requires_manual_review(self, review: Review) -> bool:
        """Determine if review requires manual moderation"""
        # Check for suspicious patterns
        if review.rating == 5 and len(review.content) < 50:
            return True  # Suspiciously short 5-star review
        
        if review.rating == 1 and len(review.content) > 1000:
            return True  # Very long 1-star review (potential harassment)
        
        # Check user's review history
        user_review_count = self.db.query(func.count(Review.id)).filter(
            Review.user_id == review.user_id
        ).scalar()
        
        if user_review_count == 0:
            return True  # First-time reviewer
        
        return False
    
    # ==================== REVIEW MODERATION ====================
    
    async def approve_review(
        self,
        review_id: int,
        moderator_id: Optional[int] = None,
        auto_approved: bool = False
    ) -> Review:
        """Approve a review for publication"""
        review = self.db.query(Review).filter(Review.id == review_id).first()
        
        if not review:
            raise ValueError("Review not found")
        
        if review.status == ReviewStatus.APPROVED:
            return review
        
        review.status = ReviewStatus.APPROVED
        review.published_at = datetime.utcnow()
        
        if not auto_approved:
            review.moderated_at = datetime.utcnow()
            review.moderated_by = moderator_id
        
        self.db.commit()
        
        # Update tour rating aggregate
        await self._update_tour_rating_aggregate(review.tour_id)
        
        # Update analytics
        await self._update_review_analytics(review.tour_id, datetime.utcnow().date())
        
        logger.info(f"Approved review {review_id} (auto={auto_approved})")
        
        return review
    
    async def reject_review(
        self,
        review_id: int,
        moderator_id: int,
        reason: str
    ) -> Review:
        """Reject a review"""
        review = self.db.query(Review).filter(Review.id == review_id).first()
        
        if not review:
            raise ValueError("Review not found")
        
        review.status = ReviewStatus.REJECTED
        review.moderated_at = datetime.utcnow()
        review.moderated_by = moderator_id
        review.moderation_notes = reason
        
        self.db.commit()
        
        logger.info(f"Rejected review {review_id}: {reason}")
        
        return review
    
    # ==================== REVIEW VOTING ====================
    
    async def vote_review(
        self,
        review_id: int,
        user_id: int,
        is_helpful: bool
    ) -> ReviewVote:
        """Vote on review helpfulness"""
        review = self.db.query(Review).filter(Review.id == review_id).first()
        
        if not review:
            raise ValueError("Review not found")
        
        # Check for existing vote
        existing_vote = self.db.query(ReviewVote).filter(
            ReviewVote.review_id == review_id,
            ReviewVote.user_id == user_id
        ).first()
        
        if existing_vote:
            # Update vote if changed
            if existing_vote.is_helpful != is_helpful:
                # Decrement old count
                if existing_vote.is_helpful:
                    review.helpful_count = max(0, review.helpful_count - 1)
                else:
                    review.not_helpful_count = max(0, review.not_helpful_count - 1)
                
                # Increment new count
                if is_helpful:
                    review.helpful_count += 1
                else:
                    review.not_helpful_count += 1
                
                existing_vote.is_helpful = is_helpful
                self.db.commit()
                
                return existing_vote
            else:
                return existing_vote
        
        # Create new vote
        vote = ReviewVote(
            review_id=review_id,
            user_id=user_id,
            is_helpful=is_helpful
        )
        
        self.db.add(vote)
        
        # Update review counts
        if is_helpful:
            review.helpful_count += 1
        else:
            review.not_helpful_count += 1
        
        self.db.commit()
        
        return vote
    
    # ==================== REVIEW FLAGGING ====================
    
    async def flag_review(
        self,
        review_id: int,
        user_id: int,
        flag_reason: ReviewFlag,
        description: Optional[str] = None
    ) -> ReviewFlagReport:
        """Flag a review as inappropriate"""
        review = self.db.query(Review).filter(Review.id == review_id).first()
        
        if not review:
            raise ValueError("Review not found")
        
        # Create flag report
        flag = ReviewFlagReport(
            review_id=review_id,
            user_id=user_id,
            flag_reason=flag_reason,
            description=description
        )
        
        self.db.add(flag)
        
        # Update review flag count
        review.flag_count += 1
        
        # Auto-flag review if threshold exceeded
        if review.flag_count >= 3 and review.status == ReviewStatus.APPROVED:
            review.status = ReviewStatus.FLAGGED
        
        self.db.commit()
        
        logger.info(f"Flagged review {review_id} by user {user_id}: {flag_reason}")
        
        return flag
    
    async def resolve_flag(
        self,
        flag_id: int,
        resolver_id: int,
        resolution_notes: str
    ) -> ReviewFlagReport:
        """Resolve a flag report"""
        flag = self.db.query(ReviewFlagReport).filter(
            ReviewFlagReport.id == flag_id
        ).first()
        
        if not flag:
            raise ValueError("Flag not found")
        
        flag.is_resolved = True
        flag.resolved_at = datetime.utcnow()
        flag.resolved_by = resolver_id
        flag.resolution_notes = resolution_notes
        
        self.db.commit()
        
        return flag
    
    # ==================== REVIEW RESPONSES ====================
    
    async def add_response(
        self,
        review_id: int,
        user_id: int,
        content: str,
        is_official: bool = False
    ) -> ReviewResponse:
        """Add a response to a review"""
        review = self.db.query(Review).filter(Review.id == review_id).first()
        
        if not review:
            raise ValueError("Review not found")
        
        if len(content.strip()) < 10:
            raise ReviewValidationError("Response must be at least 10 characters")
        
        response = ReviewResponse(
            review_id=review_id,
            user_id=user_id,
            content=content.strip(),
            is_official=is_official
        )
        
        self.db.add(response)
        
        # Update review response count
        review.response_count += 1
        
        self.db.commit()
        
        logger.info(f"Added response to review {review_id} by user {user_id}")
        
        return response
    
    # ==================== RATING AGGREGATION ====================
    
    async def _update_tour_rating_aggregate(self, tour_id: int):
        """Update aggregated rating statistics for a tour"""
        # Get or create aggregate
        aggregate = self.db.query(TourRatingAggregate).filter(
            TourRatingAggregate.tour_id == tour_id
        ).first()
        
        if not aggregate:
            aggregate = TourRatingAggregate(tour_id=tour_id)
            self.db.add(aggregate)
        
        # Calculate statistics from approved reviews
        reviews = self.db.query(Review).filter(
            Review.tour_id == tour_id,
            Review.status == ReviewStatus.APPROVED
        ).all()
        
        if not reviews:
            aggregate.total_reviews = 0
            aggregate.average_rating = Decimal('0.00')
            aggregate.rating_5_count = 0
            aggregate.rating_4_count = 0
            aggregate.rating_3_count = 0
            aggregate.rating_2_count = 0
            aggregate.rating_1_count = 0
            self.db.commit()
            return
        
        # Total and average
        aggregate.total_reviews = len(reviews)
        aggregate.average_rating = Decimal(str(round(
            sum(r.rating for r in reviews) / len(reviews), 2
        )))
        
        # Rating distribution
        aggregate.rating_5_count = sum(1 for r in reviews if r.rating == 5)
        aggregate.rating_4_count = sum(1 for r in reviews if r.rating == 4)
        aggregate.rating_3_count = sum(1 for r in reviews if r.rating == 3)
        aggregate.rating_2_count = sum(1 for r in reviews if r.rating == 2)
        aggregate.rating_1_count = sum(1 for r in reviews if r.rating == 1)
        
        # Detailed rating averages
        value_ratings = [r.value_rating for r in reviews if r.value_rating is not None]
        guide_ratings = [r.guide_rating for r in reviews if r.guide_rating is not None]
        org_ratings = [r.organization_rating for r in reviews if r.organization_rating is not None]
        exp_ratings = [r.experience_rating for r in reviews if r.experience_rating is not None]
        
        aggregate.average_value_rating = Decimal(str(round(
            sum(value_ratings) / len(value_ratings), 2
        ))) if value_ratings else None
        
        aggregate.average_guide_rating = Decimal(str(round(
            sum(guide_ratings) / len(guide_ratings), 2
        ))) if guide_ratings else None
        
        aggregate.average_organization_rating = Decimal(str(round(
            sum(org_ratings) / len(org_ratings), 2
        ))) if org_ratings else None
        
        aggregate.average_experience_rating = Decimal(str(round(
            sum(exp_ratings) / len(exp_ratings), 2
        ))) if exp_ratings else None
        
        # Verified and featured counts
        aggregate.verified_reviews_count = sum(1 for r in reviews if r.is_verified_purchase)
        aggregate.featured_reviews_count = sum(1 for r in reviews if r.is_featured)
        
        # Last review date
        aggregate.last_review_date = max(r.published_at for r in reviews if r.published_at)
        
        aggregate.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        logger.info(f"Updated rating aggregate for tour {tour_id}: {aggregate.average_rating} ({aggregate.total_reviews} reviews)")
    
    async def get_tour_rating_summary(self, tour_id: int) -> Dict[str, Any]:
        """Get rating summary for a tour"""
        aggregate = self.db.query(TourRatingAggregate).filter(
            TourRatingAggregate.tour_id == tour_id
        ).first()
        
        if not aggregate:
            return {
                'total_reviews': 0,
                'average_rating': 0.0,
                'rating_distribution': {5: 0, 4: 0, 3: 0, 2: 0, 1: 0},
                'rating_percentages': {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
            }
        
        return {
            'total_reviews': aggregate.total_reviews,
            'average_rating': float(aggregate.average_rating),
            'rating_distribution': aggregate.get_rating_distribution(),
            'rating_percentages': aggregate.get_rating_percentages(),
            'verified_count': aggregate.verified_reviews_count,
            'featured_count': aggregate.featured_reviews_count,
            'detailed_ratings': {
                'value': float(aggregate.average_value_rating) if aggregate.average_value_rating else None,
                'guide': float(aggregate.average_guide_rating) if aggregate.average_guide_rating else None,
                'organization': float(aggregate.average_organization_rating) if aggregate.average_organization_rating else None,
                'experience': float(aggregate.average_experience_rating) if aggregate.average_experience_rating else None
            },
            'last_review_date': aggregate.last_review_date.isoformat() if aggregate.last_review_date else None
        }
    
    # ==================== REVIEW ANALYTICS ====================
    
    async def _update_review_analytics(self, tour_id: int, analytics_date: date):
        """Update daily review analytics"""
        # Get or create daily analytics
        analytics = self.db.query(ReviewAnalytics).filter(
            ReviewAnalytics.tour_id == tour_id,
            ReviewAnalytics.date == analytics_date,
            ReviewAnalytics.period_type == 'daily'
        ).first()
        
        if not analytics:
            analytics = ReviewAnalytics(
                tour_id=tour_id,
                date=analytics_date,
                period_type='daily'
            )
            self.db.add(analytics)
        
        # Calculate metrics for the day
        reviews_today = self.db.query(Review).filter(
            Review.tour_id == tour_id,
            Review.status == ReviewStatus.APPROVED,
            func.date(Review.published_at) == analytics_date
        ).all()
        
        analytics.new_reviews = len(reviews_today)
        
        # Total reviews up to this date
        total_reviews = self.db.query(func.count(Review.id)).filter(
            Review.tour_id == tour_id,
            Review.status == ReviewStatus.APPROVED,
            func.date(Review.published_at) <= analytics_date
        ).scalar()
        
        analytics.total_reviews = total_reviews
        
        # Average rating
        if reviews_today:
            analytics.average_rating = Decimal(str(round(
                sum(r.rating for r in reviews_today) / len(reviews_today), 2
            )))
        
        # Engagement metrics
        analytics.total_votes = sum(r.helpful_count + r.not_helpful_count for r in reviews_today)
        analytics.total_responses = sum(r.response_count for r in reviews_today)
        analytics.total_flags = sum(r.flag_count for r in reviews_today)
        
        # Verified count
        analytics.verified_reviews = sum(1 for r in reviews_today if r.is_verified_purchase)
        
        self.db.commit()
    
    # ==================== REVIEW RETRIEVAL ====================
    
    async def get_reviews(
        self,
        tour_id: Optional[int] = None,
        user_id: Optional[int] = None,
        status: Optional[ReviewStatus] = ReviewStatus.APPROVED,
        min_rating: Optional[int] = None,
        verified_only: bool = False,
        with_media: bool = False,
        sort_by: str = 'recent',  # recent, helpful, rating_high, rating_low
        limit: int = 20,
        offset: int = 0
    ) -> Tuple[List[Review], int]:
        """Get reviews with filtering and sorting"""
        query = self.db.query(Review)
        
        # Filters
        if tour_id:
            query = query.filter(Review.tour_id == tour_id)
        if user_id:
            query = query.filter(Review.user_id == user_id)
        if status:
            query = query.filter(Review.status == status)
        if min_rating:
            query = query.filter(Review.rating >= min_rating)
        if verified_only:
            query = query.filter(Review.is_verified_purchase == True)
        if with_media:
            query = query.filter(Review.media.any())
        
        # Count total
        total = query.count()
        
        # Sorting
        if sort_by == 'recent':
            query = query.order_by(desc(Review.published_at))
        elif sort_by == 'helpful':
            query = query.order_by(desc(Review.helpful_count))
        elif sort_by == 'rating_high':
            query = query.order_by(desc(Review.rating), desc(Review.published_at))
        elif sort_by == 'rating_low':
            query = query.order_by(Review.rating, desc(Review.published_at))
        
        # Pagination
        reviews = query.limit(limit).offset(offset).all()
        
        return reviews, total
