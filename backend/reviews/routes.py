"""
Review API Routes
Handles all review-related endpoints including CRUD, moderation, and statistics
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from .repository import ReviewRepository
from .models import (
    ReviewCreate,
    ReviewUpdate,
    ReviewModerate,
    ReviewResponse,
    ReviewStats,
    ReviewListResponse
)
from auth.jwt import get_current_user
from auth.models import User
from database.connection import get_db
from database.models import User as UserModel

# Configure logging
logger = logging.getLogger(__name__)

# Create router with prefix and tags
router = APIRouter(
    prefix="/api/v1/reviews",
    tags=["⭐ Reviews & Ratings"]
)


# ==================== CREATE REVIEW ====================

@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new review for a tour
    
    - **Protected endpoint** - Requires authentication
    - User must have completed a booking for the tour
    - One review per user per tour
    - All reviews start as 'pending' for moderation
    """
    try:
        # Check if user can review this tour
        can_review, reason = ReviewRepository.check_user_can_review(
            db, current_user.id, review_data.tour_id
        )
        
        if not can_review:
            raise HTTPException(status_code=400, detail=reason)
        
        # Determine if this is a verified purchase
        verified = review_data.booking_id is not None
        
        # Create review
        review = ReviewRepository.create_review(
            db=db,
            user_id=current_user.id,
            tour_id=review_data.tour_id,
            rating=review_data.rating,
            title=review_data.title,
            comment=review_data.comment,
            booking_id=review_data.booking_id,
            photos=review_data.photos,
            verified_purchase=verified
        )
        
        logger.info(f"✅ Review created: ID {review.id} by user {current_user.id}")
        
        return ReviewResponse(
            **review.__dict__,
            user_name=current_user.full_name,
            user_avatar=current_user.avatar_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating review: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create review")


# ==================== GET REVIEWS ====================

@router.get("/tour/{tour_id}", response_model=ReviewListResponse)
async def get_reviews_by_tour(
    tour_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    min_rating: Optional[int] = Query(None, ge=1, le=5, description="Minimum rating filter"),
    status: str = Query("approved", description="Review status filter"),
    db: Session = Depends(get_db)
):
    """
    Get all reviews for a tour
    
    - **Public endpoint** - No authentication required
    - Returns approved reviews by default
    - Supports pagination and filtering
    """
    try:
        skip = (page - 1) * page_size
        
        # Get reviews
        reviews = ReviewRepository.get_reviews_by_tour(
            db=db,
            tour_id=tour_id,
            skip=skip,
            limit=page_size,
            status=status,
            min_rating=min_rating
        )
        
        # Get user info for each review
        review_responses = []
        for review in reviews:
            user = db.query(UserModel).filter(UserModel.id == review.user_id).first()
            review_responses.append(
                ReviewResponse(
                    **review.__dict__,
                    user_name=user.full_name if user else "Anonymous",
                    user_avatar=user.avatar_url if user else None
                )
            )
        
        # Count total reviews
        total = len(ReviewRepository.get_reviews_by_tour(
            db, tour_id, skip=0, limit=10000, status=status, min_rating=min_rating
        ))
        
        has_more = (skip + page_size) < total
        
        return ReviewListResponse(
            reviews=review_responses,
            total=total,
            page=page,
            page_size=page_size,
            has_more=has_more
        )
        
    except Exception as e:
        logger.error(f"❌ Error getting reviews: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve reviews")


@router.get("/user/me", response_model=List[ReviewResponse])
async def get_my_reviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all reviews by current user
    
    - **Protected endpoint** - Requires authentication
    - Returns all user's reviews regardless of status
    """
    try:
        reviews = ReviewRepository.get_reviews_by_user(db, current_user.id)
        
        return [
            ReviewResponse(
                **review.__dict__,
                user_name=current_user.full_name,
                user_avatar=current_user.avatar_url
            )
            for review in reviews
        ]
        
    except Exception as e:
        logger.error(f"❌ Error getting user reviews: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve reviews")


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(
    review_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific review by ID
    
    - **Public endpoint** - No authentication required
    """
    review = ReviewRepository.get_review_by_id(db, review_id)
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Get user info
    user = db.query(UserModel).filter(UserModel.id == review.user_id).first()
    
    return ReviewResponse(
        **review.__dict__,
        user_name=user.full_name if user else "Anonymous",
        user_avatar=user.avatar_url if user else None
    )


# ==================== UPDATE REVIEW ====================

@router.put("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: int,
    review_data: ReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a review
    
    - **Protected endpoint** - Requires authentication
    - User can only update their own reviews
    - Cannot update approved/rejected reviews
    """
    # Get review
    review = ReviewRepository.get_review_by_id(db, review_id)
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check ownership
    if review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this review")
    
    # Check status
    if review.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Cannot update a review that has been moderated"
        )
    
    # Update review
    updated_review = ReviewRepository.update_review(
        db, review_id, **review_data.dict(exclude_unset=True)
    )
    
    logger.info(f"✅ Review updated: ID {review_id} by user {current_user.id}")
    
    return ReviewResponse(
        **updated_review.__dict__,
        user_name=current_user.full_name,
        user_avatar=current_user.avatar_url
    )


# ==================== DELETE REVIEW ====================

@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a review
    
    - **Protected endpoint** - Requires authentication
    - User can only delete their own reviews
    """
    # Get review
    review = ReviewRepository.get_review_by_id(db, review_id)
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Check ownership (or admin role)
    if review.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this review")
    
    # Delete review
    success = ReviewRepository.delete_review(db, review_id)
    
    if success:
        logger.info(f"✅ Review deleted: ID {review_id} by user {current_user.id}")
        return None
    else:
        raise HTTPException(status_code=500, detail="Failed to delete review")


# ==================== MODERATION ENDPOINTS ====================

@router.post("/{review_id}/moderate", response_model=ReviewResponse)
async def moderate_review(
    review_id: int,
    moderation_data: ReviewModerate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Moderate a review (approve/reject)
    
    - **Protected endpoint** - Requires admin role
    - Changes review status to approved or rejected
    """
    # Check admin role
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get review
    review = ReviewRepository.get_review_by_id(db, review_id)
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Moderate review
    moderated_review = ReviewRepository.moderate_review(
        db,
        review_id,
        moderation_data.status,
        moderation_data.moderator_notes
    )
    
    logger.info(f"✅ Review moderated: ID {review_id} - Status: {moderation_data.status}")
    
    # Get user info
    user = db.query(UserModel).filter(UserModel.id == moderated_review.user_id).first()
    
    return ReviewResponse(
        **moderated_review.__dict__,
        user_name=user.full_name if user else "Anonymous",
        user_avatar=user.avatar_url if user else None
    )


@router.get("/pending/all", response_model=List[ReviewResponse])
async def get_pending_reviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all pending reviews (for moderation)
    
    - **Protected endpoint** - Requires admin role
    - Returns all reviews with status 'pending'
    """
    # Check admin role
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Get all pending reviews across all tours
        from database.models import Review as ReviewModel
        pending_reviews = db.query(ReviewModel).filter(
            ReviewModel.status == "pending"
        ).order_by(ReviewModel.created_at.desc()).all()
        
        # Get user info for each review
        review_responses = []
        for review in pending_reviews:
            user = db.query(UserModel).filter(UserModel.id == review.user_id).first()
            review_responses.append(
                ReviewResponse(
                    **review.__dict__,
                    user_name=user.full_name if user else "Anonymous",
                    user_avatar=user.avatar_url if user else None
                )
            )
        
        return review_responses
        
    except Exception as e:
        logger.error(f"❌ Error getting pending reviews: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve pending reviews")


# ==================== HELPFUL VOTE ====================

@router.post("/{review_id}/helpful", response_model=ReviewResponse)
async def mark_review_helpful(
    review_id: int,
    db: Session = Depends(get_db)
):
    """
    Mark a review as helpful
    
    - **Public endpoint** - No authentication required
    - Increments helpful_count by 1
    """
    review = ReviewRepository.add_helpful_vote(db, review_id)
    
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Get user info
    user = db.query(UserModel).filter(UserModel.id == review.user_id).first()
    
    return ReviewResponse(
        **review.__dict__,
        user_name=user.full_name if user else "Anonymous",
        user_avatar=user.avatar_url if user else None
    )


# ==================== STATISTICS ====================

@router.get("/stats/{tour_id}", response_model=ReviewStats)
async def get_tour_review_stats(
    tour_id: str,
    db: Session = Depends(get_db)
):
    """
    Get review statistics for a tour
    
    - **Public endpoint** - No authentication required
    - Returns total reviews, average rating, and rating distribution
    """
    stats = ReviewRepository.get_tour_stats(db, tour_id)
    return ReviewStats(**stats)


# ==================== HEALTH CHECK ====================

@router.get("/health")
async def review_health_check():
    """
    Review service health check
    
    - **Public endpoint** - No authentication required
    """
    return {
        "service": "reviews",
        "status": "healthy",
        "version": "1.0.0"
    }
