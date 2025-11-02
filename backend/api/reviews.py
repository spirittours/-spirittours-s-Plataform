"""
Review and Rating API
REST endpoints for review management, voting, and analytics
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel, Field, validator
from decimal import Decimal

from backend.database import get_db
from backend.services.review_service import (
    ReviewService, ReviewValidationError, ReviewPermissionError
)
from backend.models.review_models import ReviewStatus, ReviewFlag, MediaType
from backend.auth import get_current_user, require_admin
from backend.models.user import User

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


# ==================== REQUEST/RESPONSE MODELS ====================

class CreateReviewRequest(BaseModel):
    """Request model for creating a review"""
    tour_id: int
    booking_id: Optional[int] = None
    rating: int = Field(ge=1, le=5)
    title: str = Field(min_length=5, max_length=200)
    content: str = Field(min_length=20, max_length=5000)
    value_rating: Optional[int] = Field(None, ge=1, le=5)
    guide_rating: Optional[int] = Field(None, ge=1, le=5)
    organization_rating: Optional[int] = Field(None, ge=1, le=5)
    experience_rating: Optional[int] = Field(None, ge=1, le=5)
    traveler_type: Optional[str] = None
    travel_date: Optional[date] = None
    pros: Optional[str] = None
    cons: Optional[str] = None
    language: str = 'en'


class UpdateReviewRequest(BaseModel):
    """Request model for updating a review"""
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    content: Optional[str] = Field(None, min_length=20, max_length=5000)
    pros: Optional[str] = None
    cons: Optional[str] = None


class VoteReviewRequest(BaseModel):
    """Request model for voting on review helpfulness"""
    is_helpful: bool


class FlagReviewRequest(BaseModel):
    """Request model for flagging a review"""
    flag_reason: ReviewFlag
    description: Optional[str] = None


class AddResponseRequest(BaseModel):
    """Request model for adding a response to a review"""
    content: str = Field(min_length=10, max_length=2000)


class ModerateReviewRequest(BaseModel):
    """Request model for moderating a review"""
    action: str  # approve, reject
    reason: Optional[str] = None


class ReviewResponse(BaseModel):
    """Response model for review details"""
    id: int
    user_id: int
    tour_id: int
    rating: int
    title: str
    content: str
    status: ReviewStatus
    is_verified_purchase: bool
    helpful_count: int
    not_helpful_count: int
    response_count: int
    created_at: datetime
    published_at: Optional[datetime]
    user_name: str
    tour_name: str
    
    class Config:
        orm_mode = True


class RatingSummaryResponse(BaseModel):
    """Response model for rating summary"""
    total_reviews: int
    average_rating: float
    rating_distribution: Dict[int, int]
    rating_percentages: Dict[int, float]
    verified_count: int
    featured_count: int
    detailed_ratings: Dict[str, Optional[float]]
    last_review_date: Optional[str]


# ==================== REVIEW ENDPOINTS ====================

@router.post("/", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    request: CreateReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new review
    
    Requires authentication. Reviews are subject to moderation.
    """
    service = ReviewService(db)
    
    try:
        review = await service.create_review(
            user_id=current_user.id,
            tour_id=request.tour_id,
            rating=request.rating,
            title=request.title,
            content=request.content,
            booking_id=request.booking_id,
            value_rating=request.value_rating,
            guide_rating=request.guide_rating,
            organization_rating=request.organization_rating,
            experience_rating=request.experience_rating,
            traveler_type=request.traveler_type,
            travel_date=request.travel_date,
            pros=request.pros,
            cons=request.cons,
            language=request.language
        )
        
        # Fetch tour name
        from backend.models.tour import Tour
        tour = db.query(Tour).filter(Tour.id == review.tour_id).first()
        
        return ReviewResponse(
            id=review.id,
            user_id=review.user_id,
            tour_id=review.tour_id,
            rating=review.rating,
            title=review.title,
            content=review.content,
            status=review.status,
            is_verified_purchase=review.is_verified_purchase,
            helpful_count=review.helpful_count,
            not_helpful_count=review.not_helpful_count,
            response_count=review.response_count,
            created_at=review.created_at,
            published_at=review.published_at,
            user_name=f"{current_user.first_name} {current_user.last_name}",
            tour_name=tour.name if tour else "Unknown"
        )
        
    except ReviewValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/tour/{tour_id}")
async def get_tour_reviews(
    tour_id: int,
    min_rating: Optional[int] = Query(None, ge=1, le=5),
    verified_only: bool = False,
    with_media: bool = False,
    sort_by: str = Query('recent', regex='^(recent|helpful|rating_high|rating_low)$'),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Get reviews for a tour with filtering and sorting
    
    Sort options:
    - recent: Most recent first
    - helpful: Most helpful first
    - rating_high: Highest rating first
    - rating_low: Lowest rating first
    """
    service = ReviewService(db)
    
    reviews, total = await service.get_reviews(
        tour_id=tour_id,
        status=ReviewStatus.APPROVED,
        min_rating=min_rating,
        verified_only=verified_only,
        with_media=with_media,
        sort_by=sort_by,
        limit=limit,
        offset=offset
    )
    
    # Format response
    from backend.models.tour import Tour
    tour = db.query(Tour).filter(Tour.id == tour_id).first()
    
    formatted_reviews = []
    for review in reviews:
        formatted_reviews.append({
            'id': review.id,
            'user_id': review.user_id,
            'user_name': f"{review.user.first_name} {review.user.last_name[0]}." if review.user else "Anonymous",
            'rating': review.rating,
            'title': review.title,
            'content': review.content,
            'pros': review.pros,
            'cons': review.cons,
            'traveler_type': review.traveler_type,
            'travel_date': review.travel_date.isoformat() if review.travel_date else None,
            'is_verified_purchase': review.is_verified_purchase,
            'is_featured': review.is_featured,
            'helpful_count': review.helpful_count,
            'not_helpful_count': review.not_helpful_count,
            'response_count': review.response_count,
            'helpfulness_score': review.calculate_helpfulness_score(),
            'created_at': review.created_at.isoformat(),
            'published_at': review.published_at.isoformat() if review.published_at else None,
            'media_count': len(review.media) if review.media else 0,
            'has_response': review.response_count > 0,
            'detailed_ratings': {
                'value': review.value_rating,
                'guide': review.guide_rating,
                'organization': review.organization_rating,
                'experience': review.experience_rating
            }
        })
    
    return {
        'reviews': formatted_reviews,
        'total': total,
        'limit': limit,
        'offset': offset,
        'tour_name': tour.name if tour else None
    }


@router.get("/{review_id}")
async def get_review_details(
    review_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific review"""
    from backend.models.review_models import Review
    
    review = db.query(Review).filter(Review.id == review_id).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Only show approved reviews to public
    if review.status != ReviewStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not available"
        )
    
    return {
        'id': review.id,
        'user_name': f"{review.user.first_name} {review.user.last_name[0]}." if review.user else "Anonymous",
        'tour_id': review.tour_id,
        'tour_name': review.tour.name if review.tour else None,
        'rating': review.rating,
        'title': review.title,
        'content': review.content,
        'pros': review.pros,
        'cons': review.cons,
        'traveler_type': review.traveler_type,
        'travel_date': review.travel_date.isoformat() if review.travel_date else None,
        'is_verified_purchase': review.is_verified_purchase,
        'is_featured': review.is_featured,
        'helpful_count': review.helpful_count,
        'not_helpful_count': review.not_helpful_count,
        'helpfulness_score': review.calculate_helpfulness_score(),
        'created_at': review.created_at.isoformat(),
        'published_at': review.published_at.isoformat() if review.published_at else None,
        'detailed_ratings': {
            'value': review.value_rating,
            'guide': review.guide_rating,
            'organization': review.organization_rating,
            'experience': review.experience_rating,
            'average': review.calculate_average_detailed_rating()
        },
        'media': [
            {
                'id': m.id,
                'type': m.media_type.value,
                'url': m.file_url,
                'thumbnail': m.thumbnail_url,
                'caption': m.caption
            }
            for m in review.media
        ] if review.media else [],
        'responses': [
            {
                'id': r.id,
                'content': r.content,
                'is_official': r.is_official,
                'user_name': f"{r.user.first_name} {r.user.last_name[0]}." if r.user else "Tour Operator",
                'created_at': r.created_at.isoformat()
            }
            for r in review.responses if r.is_visible
        ] if review.responses else []
    }


@router.put("/{review_id}")
async def update_review(
    review_id: int,
    request: UpdateReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update own review"""
    from backend.models.review_models import Review
    
    review = db.query(Review).filter(Review.id == review_id).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Check ownership
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this review"
        )
    
    # Update fields
    if request.title:
        review.title = request.title
    if request.content:
        review.content = request.content
    if request.pros is not None:
        review.pros = request.pros
    if request.cons is not None:
        review.cons = request.cons
    
    review.updated_at = datetime.utcnow()
    
    # Reset status to pending if approved (requires re-moderation)
    if review.status == ReviewStatus.APPROVED:
        review.status = ReviewStatus.PENDING
        review.published_at = None
    
    db.commit()
    
    return {"success": True, "message": "Review updated successfully"}


@router.delete("/{review_id}")
async def delete_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete own review"""
    from backend.models.review_models import Review
    
    review = db.query(Review).filter(Review.id == review_id).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Check ownership or admin
    if review.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this review"
        )
    
    # Soft delete by hiding
    review.status = ReviewStatus.HIDDEN
    db.commit()
    
    # Update tour rating aggregate
    service = ReviewService(db)
    await service._update_tour_rating_aggregate(review.tour_id)
    
    return {"success": True, "message": "Review deleted successfully"}


# ==================== VOTING ENDPOINTS ====================

@router.post("/{review_id}/vote")
async def vote_on_review(
    review_id: int,
    request: VoteReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Vote on review helpfulness"""
    service = ReviewService(db)
    
    try:
        vote = await service.vote_review(
            review_id=review_id,
            user_id=current_user.id,
            is_helpful=request.is_helpful
        )
        
        return {
            "success": True,
            "message": "Vote recorded",
            "is_helpful": vote.is_helpful
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# ==================== FLAGGING ENDPOINTS ====================

@router.post("/{review_id}/flag")
async def flag_review(
    review_id: int,
    request: FlagReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Flag a review as inappropriate"""
    service = ReviewService(db)
    
    try:
        flag = await service.flag_review(
            review_id=review_id,
            user_id=current_user.id,
            flag_reason=request.flag_reason,
            description=request.description
        )
        
        return {
            "success": True,
            "message": "Review flagged for moderation",
            "flag_id": flag.id
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# ==================== RESPONSE ENDPOINTS ====================

@router.post("/{review_id}/response")
async def add_review_response(
    review_id: int,
    request: AddResponseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a response to a review"""
    service = ReviewService(db)
    
    # Check if user is tour operator (simplified - would check tour ownership)
    is_official = current_user.is_admin  # In production, check tour operator role
    
    try:
        response = await service.add_response(
            review_id=review_id,
            user_id=current_user.id,
            content=request.content,
            is_official=is_official
        )
        
        return {
            "success": True,
            "message": "Response added successfully",
            "response_id": response.id
        }
        
    except (ValueError, ReviewValidationError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ==================== RATING SUMMARY ENDPOINTS ====================

@router.get("/tour/{tour_id}/summary", response_model=RatingSummaryResponse)
async def get_tour_rating_summary(
    tour_id: int,
    db: Session = Depends(get_db)
):
    """Get rating summary and statistics for a tour"""
    service = ReviewService(db)
    
    summary = await service.get_tour_rating_summary(tour_id)
    
    return summary


# ==================== USER REVIEWS ENDPOINTS ====================

@router.get("/user/me")
async def get_my_reviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all reviews by current user"""
    service = ReviewService(db)
    
    reviews, total = await service.get_reviews(
        user_id=current_user.id,
        status=None,  # Include all statuses
        limit=100,
        offset=0
    )
    
    return {
        'reviews': [
            {
                'id': r.id,
                'tour_id': r.tour_id,
                'tour_name': r.tour.name if r.tour else None,
                'rating': r.rating,
                'title': r.title,
                'status': r.status.value,
                'is_verified_purchase': r.is_verified_purchase,
                'helpful_count': r.helpful_count,
                'created_at': r.created_at.isoformat(),
                'published_at': r.published_at.isoformat() if r.published_at else None
            }
            for r in reviews
        ],
        'total': total
    }


# ==================== ADMIN ENDPOINTS ====================

@router.post("/{review_id}/moderate", dependencies=[Depends(require_admin)])
async def moderate_review(
    review_id: int,
    request: ModerateReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Moderate a review (admin only)"""
    service = ReviewService(db)
    
    try:
        if request.action == 'approve':
            review = await service.approve_review(
                review_id=review_id,
                moderator_id=current_user.id
            )
            return {
                "success": True,
                "message": "Review approved",
                "status": review.status.value
            }
        elif request.action == 'reject':
            if not request.reason:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Reason required for rejection"
                )
            review = await service.reject_review(
                review_id=review_id,
                moderator_id=current_user.id,
                reason=request.reason
            )
            return {
                "success": True,
                "message": "Review rejected",
                "status": review.status.value
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid action. Must be 'approve' or 'reject'"
            )
            
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/admin/pending", dependencies=[Depends(require_admin)])
async def get_pending_reviews(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get reviews pending moderation (admin only)"""
    service = ReviewService(db)
    
    reviews, total = await service.get_reviews(
        status=ReviewStatus.PENDING,
        limit=limit,
        offset=offset
    )
    
    return {
        'reviews': [
            {
                'id': r.id,
                'tour_id': r.tour_id,
                'tour_name': r.tour.name if r.tour else None,
                'user_id': r.user_id,
                'user_name': f"{r.user.first_name} {r.user.last_name}" if r.user else "Unknown",
                'rating': r.rating,
                'title': r.title,
                'content': r.content[:200] + '...' if len(r.content) > 200 else r.content,
                'is_verified_purchase': r.is_verified_purchase,
                'created_at': r.created_at.isoformat()
            }
            for r in reviews
        ],
        'total': total
    }


@router.get("/admin/flagged", dependencies=[Depends(require_admin)])
async def get_flagged_reviews(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get flagged reviews (admin only)"""
    service = ReviewService(db)
    
    reviews, total = await service.get_reviews(
        status=ReviewStatus.FLAGGED,
        limit=limit,
        offset=offset
    )
    
    return {
        'reviews': [
            {
                'id': r.id,
                'tour_id': r.tour_id,
                'tour_name': r.tour.name if r.tour else None,
                'rating': r.rating,
                'title': r.title,
                'flag_count': r.flag_count,
                'created_at': r.created_at.isoformat()
            }
            for r in reviews
        ],
        'total': total
    }
