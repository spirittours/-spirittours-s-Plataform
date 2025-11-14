"""
Review Pydantic models for request/response validation
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


class ReviewBase(BaseModel):
    """Base review model"""
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    title: Optional[str] = Field(None, max_length=255, description="Review title")
    comment: Optional[str] = Field(None, description="Review comment/text")
    photos: Optional[List[str]] = Field(default_factory=list, description="List of photo URLs")


class ReviewCreate(ReviewBase):
    """Review creation model"""
    tour_id: str = Field(..., description="Tour ID being reviewed")
    booking_id: Optional[str] = Field(None, description="Associated booking ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "tour_id": "TOUR-001",
                "rating": 5,
                "title": "Amazing experience!",
                "comment": "The tour exceeded all my expectations. The guide was knowledgeable and friendly.",
                "photos": ["https://example.com/photo1.jpg"],
                "booking_id": "BK-2024-001"
            }
        }


class ReviewUpdate(BaseModel):
    """Review update model"""
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, max_length=255)
    comment: Optional[str] = None
    photos: Optional[List[str]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "rating": 4,
                "title": "Updated: Great tour",
                "comment": "Updated my review after some reflection..."
            }
        }


class ReviewModerate(BaseModel):
    """Review moderation model"""
    status: str = Field(..., description="New status: approved or rejected")
    moderator_notes: Optional[str] = Field(None, description="Optional moderator notes")
    
    @validator('status')
    def validate_status(cls, v):
        if v not in ['approved', 'rejected']:
            raise ValueError('Status must be either "approved" or "rejected"')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "approved",
                "moderator_notes": "Review is appropriate and helpful"
            }
        }


class ReviewResponse(ReviewBase):
    """Review response model"""
    id: int
    user_id: int
    tour_id: str
    booking_id: Optional[str]
    helpful_count: int
    verified_purchase: bool
    status: str
    moderator_notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Optional user info (can be populated with join)
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 123,
                "tour_id": "TOUR-001",
                "rating": 5,
                "title": "Amazing experience!",
                "comment": "The tour exceeded all my expectations.",
                "photos": ["https://example.com/photo1.jpg"],
                "booking_id": "BK-2024-001",
                "helpful_count": 15,
                "verified_purchase": True,
                "status": "approved",
                "created_at": "2024-11-14T10:30:00",
                "user_name": "John Doe",
                "user_avatar": "https://example.com/avatar.jpg"
            }
        }


class ReviewStats(BaseModel):
    """Review statistics model"""
    total_reviews: int
    average_rating: float
    rating_distribution: dict
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_reviews": 156,
                "average_rating": 4.7,
                "rating_distribution": {
                    "1": 2,
                    "2": 3,
                    "3": 15,
                    "4": 45,
                    "5": 91
                }
            }
        }


class ReviewListResponse(BaseModel):
    """Paginated review list response"""
    reviews: List[ReviewResponse]
    total: int
    page: int
    page_size: int
    has_more: bool
    
    class Config:
        json_schema_extra = {
            "example": {
                "reviews": [],
                "total": 156,
                "page": 1,
                "page_size": 20,
                "has_more": True
            }
        }


# Export all models
__all__ = [
    'ReviewBase',
    'ReviewCreate',
    'ReviewUpdate',
    'ReviewModerate',
    'ReviewResponse',
    'ReviewStats',
    'ReviewListResponse',
]
