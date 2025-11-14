"""
Review Repository - Database operations for Review model
Handles all CRUD operations and business logic for reviews
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime

from database.models import Review as ReviewModel, Tour as TourModel, Booking as BookingModel


class ReviewRepository:
    """
    Repository pattern for Review database operations
    Handles CRUD, statistics, and business logic
    """
    
    @staticmethod
    def create_review(
        db: Session,
        user_id: int,
        tour_id: str,
        rating: int,
        title: str = None,
        comment: str = None,
        booking_id: str = None,
        photos: List[str] = None,
        verified_purchase: bool = False
    ) -> ReviewModel:
        """
        Create a new review
        
        Args:
            db: Database session
            user_id: User ID who is creating the review
            tour_id: Tour ID being reviewed
            rating: Rating (1-5)
            title: Review title
            comment: Review comment
            booking_id: Associated booking ID
            photos: List of photo URLs
            verified_purchase: Whether this is a verified purchase
            
        Returns:
            Created Review model
        """
        review = ReviewModel(
            user_id=user_id,
            tour_id=tour_id,
            rating=rating,
            title=title,
            comment=comment,
            booking_id=booking_id,
            photos=photos or [],
            verified_purchase=verified_purchase,
            status="pending"  # All reviews start as pending moderation
        )
        
        db.add(review)
        db.commit()
        db.refresh(review)
        
        # Update tour statistics
        ReviewRepository._update_tour_stats(db, tour_id)
        
        return review
    
    
    @staticmethod
    def get_review_by_id(db: Session, review_id: int) -> Optional[ReviewModel]:
        """
        Get review by ID
        
        Args:
            db: Database session
            review_id: Review ID
            
        Returns:
            Review model or None if not found
        """
        return db.query(ReviewModel).filter(ReviewModel.id == review_id).first()
    
    
    @staticmethod
    def get_reviews_by_tour(
        db: Session,
        tour_id: str,
        skip: int = 0,
        limit: int = 20,
        status: str = "approved",
        min_rating: int = None
    ) -> List[ReviewModel]:
        """
        Get all reviews for a tour
        
        Args:
            db: Database session
            tour_id: Tour ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            status: Review status filter (approved, pending, rejected)
            min_rating: Minimum rating filter
            
        Returns:
            List of Review models
        """
        query = db.query(ReviewModel).filter(ReviewModel.tour_id == tour_id)
        
        if status:
            query = query.filter(ReviewModel.status == status)
        
        if min_rating:
            query = query.filter(ReviewModel.rating >= min_rating)
        
        return query.order_by(ReviewModel.created_at.desc()).offset(skip).limit(limit).all()
    
    
    @staticmethod
    def get_reviews_by_user(
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 20
    ) -> List[ReviewModel]:
        """
        Get all reviews by a user
        
        Args:
            db: Database session
            user_id: User ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            List of Review models
        """
        return db.query(ReviewModel).filter(
            ReviewModel.user_id == user_id
        ).order_by(ReviewModel.created_at.desc()).offset(skip).limit(limit).all()
    
    
    @staticmethod
    def update_review(
        db: Session,
        review_id: int,
        **kwargs
    ) -> Optional[ReviewModel]:
        """
        Update review data
        
        Args:
            db: Database session
            review_id: Review ID to update
            **kwargs: Fields to update
            
        Returns:
            Updated Review model or None if not found
        """
        review = db.query(ReviewModel).filter(ReviewModel.id == review_id).first()
        
        if not review:
            return None
        
        # Update allowed fields
        allowed_fields = ['rating', 'title', 'comment', 'photos']
        for field, value in kwargs.items():
            if field in allowed_fields and value is not None:
                setattr(review, field, value)
        
        review.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(review)
        
        # Update tour statistics if rating changed
        if 'rating' in kwargs:
            ReviewRepository._update_tour_stats(db, review.tour_id)
        
        return review
    
    
    @staticmethod
    def delete_review(db: Session, review_id: int) -> bool:
        """
        Delete a review
        
        Args:
            db: Database session
            review_id: Review ID to delete
            
        Returns:
            True if deleted, False if not found
        """
        review = db.query(ReviewModel).filter(ReviewModel.id == review_id).first()
        
        if not review:
            return False
        
        tour_id = review.tour_id
        
        db.delete(review)
        db.commit()
        
        # Update tour statistics
        ReviewRepository._update_tour_stats(db, tour_id)
        
        return True
    
    
    @staticmethod
    def moderate_review(
        db: Session,
        review_id: int,
        status: str,
        moderator_notes: str = None
    ) -> Optional[ReviewModel]:
        """
        Moderate a review (approve/reject)
        
        Args:
            db: Database session
            review_id: Review ID to moderate
            status: New status (approved, rejected)
            moderator_notes: Optional moderator notes
            
        Returns:
            Updated Review model or None if not found
        """
        review = db.query(ReviewModel).filter(ReviewModel.id == review_id).first()
        
        if not review:
            return None
        
        review.status = status
        if moderator_notes:
            review.moderator_notes = moderator_notes
        review.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(review)
        
        # Update tour statistics
        ReviewRepository._update_tour_stats(db, review.tour_id)
        
        return review
    
    
    @staticmethod
    def add_helpful_vote(db: Session, review_id: int) -> Optional[ReviewModel]:
        """
        Add a helpful vote to a review
        
        Args:
            db: Database session
            review_id: Review ID
            
        Returns:
            Updated Review model or None if not found
        """
        review = db.query(ReviewModel).filter(ReviewModel.id == review_id).first()
        
        if not review:
            return None
        
        review.helpful_count += 1
        db.commit()
        db.refresh(review)
        
        return review
    
    
    @staticmethod
    def check_user_can_review(
        db: Session,
        user_id: int,
        tour_id: str
    ) -> tuple[bool, str]:
        """
        Check if user can review a tour
        
        Args:
            db: Database session
            user_id: User ID
            tour_id: Tour ID
            
        Returns:
            Tuple of (can_review, reason_if_not)
        """
        # Check if user already reviewed this tour
        existing_review = db.query(ReviewModel).filter(
            and_(
                ReviewModel.user_id == user_id,
                ReviewModel.tour_id == tour_id
            )
        ).first()
        
        if existing_review:
            return False, "You have already reviewed this tour"
        
        # Check if user has a completed booking for this tour
        completed_booking = db.query(BookingModel).filter(
            and_(
                BookingModel.user_id == user_id,
                BookingModel.tour_id == tour_id,
                BookingModel.status == "completed"
            )
        ).first()
        
        if not completed_booking:
            return False, "You must complete a booking for this tour before reviewing"
        
        return True, ""
    
    
    @staticmethod
    def get_tour_stats(db: Session, tour_id: str) -> dict:
        """
        Get review statistics for a tour
        
        Args:
            db: Database session
            tour_id: Tour ID
            
        Returns:
            Dictionary with statistics
        """
        # Get all approved reviews
        reviews = db.query(ReviewModel).filter(
            and_(
                ReviewModel.tour_id == tour_id,
                ReviewModel.status == "approved"
            )
        ).all()
        
        if not reviews:
            return {
                "total_reviews": 0,
                "average_rating": 0.0,
                "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            }
        
        # Calculate statistics
        total_reviews = len(reviews)
        total_rating = sum(r.rating for r in reviews)
        average_rating = round(total_rating / total_reviews, 2)
        
        # Rating distribution
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for review in reviews:
            rating_distribution[review.rating] += 1
        
        return {
            "total_reviews": total_reviews,
            "average_rating": average_rating,
            "rating_distribution": rating_distribution
        }
    
    
    @staticmethod
    def _update_tour_stats(db: Session, tour_id: str):
        """
        Internal method to update tour rating statistics
        
        Args:
            db: Database session
            tour_id: Tour ID to update
        """
        # Get approved reviews only
        result = db.query(
            func.avg(ReviewModel.rating).label('avg_rating'),
            func.count(ReviewModel.id).label('review_count')
        ).filter(
            and_(
                ReviewModel.tour_id == tour_id,
                ReviewModel.status == "approved"
            )
        ).first()
        
        # Update tour
        tour = db.query(TourModel).filter(TourModel.id == tour_id).first()
        if tour:
            tour.rating_average = round(result.avg_rating or 0.0, 2)
            tour.review_count = result.review_count or 0
            db.commit()


# Export
__all__ = ['ReviewRepository']
