"""
API Routes for P2P Points Marketplace
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, validator
import logging
from sqlalchemy.orm import Session

from ..services.points_marketplace_service import PointsMarketplaceService
from ..models.marketplace_models import (
    ListingStatus, OfferStatus, TransactionType, PaymentMethod
)
from ..auth import get_current_user
from ..database import get_db
from ..utils.redis_client import get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])

# Pydantic models for request/response validation

class CreateListingRequest(BaseModel):
    """Request model for creating a listing"""
    points_amount: int = Field(..., ge=10, le=10000, description="Amount of points to sell")
    price_per_point: float = Field(..., ge=0.01, le=10.0, description="Price per point in USD")
    currency: str = Field(default="USD", description="Currency code")
    description: Optional[str] = Field(None, max_length=1000, description="Listing description")
    title: Optional[str] = Field(None, max_length=200, description="Listing title")
    auto_accept: bool = Field(default=True, description="Auto-accept purchases at listed price")
    min_purchase: Optional[int] = Field(1, ge=1, description="Minimum points per purchase")
    max_purchase: Optional[int] = Field(None, description="Maximum points per purchase")
    expires_in_days: Optional[int] = Field(30, ge=1, le=90, description="Days until listing expires")
    payment_methods: List[str] = Field(default=["credit_card"], description="Accepted payment methods")
    bundle_discount: Optional[Dict[int, float]] = Field(None, description="Bulk purchase discounts")
    tags: Optional[List[str]] = Field(default=[], description="Listing tags")
    negotiable: bool = Field(default=False, description="Allow price negotiation")
    
    @validator('payment_methods')
    def validate_payment_methods(cls, v):
        valid_methods = [e.value for e in PaymentMethod]
        for method in v:
            if method not in valid_methods:
                raise ValueError(f"Invalid payment method: {method}")
        return v
    
    @validator('max_purchase')
    def validate_max_purchase(cls, v, values):
        if v and 'points_amount' in values and v > values['points_amount']:
            raise ValueError("max_purchase cannot exceed points_amount")
        return v

class BuyPointsRequest(BaseModel):
    """Request model for buying points"""
    points_amount: int = Field(..., ge=1, description="Amount of points to buy")
    payment_method: str = Field(..., description="Payment method")
    payment_token: Optional[str] = Field(None, description="Payment token for processing")
    promo_code: Optional[str] = Field(None, description="Promotional code")

class CreateOfferRequest(BaseModel):
    """Request model for creating an offer"""
    points_amount: int = Field(..., ge=1, description="Amount of points to offer for")
    price_per_point: float = Field(..., ge=0.01, le=10.0, description="Offered price per point")
    expires_in_hours: int = Field(default=24, ge=1, le=168, description="Hours until offer expires")
    message: Optional[str] = Field(None, max_length=500, description="Message to seller")
    conditions: Optional[List[str]] = Field(default=[], description="Offer conditions")

class CounterOfferRequest(BaseModel):
    """Request model for counter-offering"""
    new_price_per_point: float = Field(..., ge=0.01, le=10.0, description="Counter-offered price")
    new_points_amount: Optional[int] = Field(None, ge=1, description="Counter-offered amount")
    message: Optional[str] = Field(None, max_length=500, description="Counter-offer message")
    expires_in_hours: int = Field(default=24, ge=1, le=72, description="Hours until counter-offer expires")

class CreateExchangeRequest(BaseModel):
    """Request model for creating a points exchange"""
    partner_user_id: int = Field(..., description="User ID to exchange with")
    my_points: int = Field(..., ge=1, description="Points I'm offering")
    partner_points: int = Field(..., ge=1, description="Points I want from partner")
    additional_payment: Optional[float] = Field(None, ge=0, description="Additional payment if needed")
    payment_from: Optional[str] = Field(None, description="Who pays additional: 'me' or 'partner'")
    conditions: Optional[List[str]] = Field(default=[], description="Exchange conditions")
    expires_in_hours: int = Field(default=24, ge=1, le=72, description="Hours until exchange expires")
    message: Optional[str] = Field(None, max_length=500, description="Message to partner")

class UpdateListingRequest(BaseModel):
    """Request model for updating a listing"""
    price_per_point: Optional[float] = Field(None, ge=0.01, le=10.0)
    description: Optional[str] = Field(None, max_length=1000)
    min_purchase: Optional[int] = Field(None, ge=1)
    max_purchase: Optional[int] = Field(None, ge=1)
    payment_methods: Optional[List[str]] = Field(None)
    bundle_discount: Optional[Dict[int, float]] = Field(None)
    tags: Optional[List[str]] = Field(None)
    auto_accept: Optional[bool] = Field(None)
    negotiable: Optional[bool] = Field(None)

class SearchFilters(BaseModel):
    """Search filters for marketplace listings"""
    min_points: Optional[int] = Field(None, ge=1)
    max_points: Optional[int] = Field(None, le=10000)
    min_price: Optional[float] = Field(None, ge=0.01)
    max_price: Optional[float] = Field(None, le=10.0)
    seller_rating: Optional[float] = Field(None, ge=0, le=5)
    payment_methods: Optional[List[str]] = Field(None)
    tags: Optional[List[str]] = Field(None)
    category: Optional[str] = Field(None)
    verified_only: bool = Field(default=False)
    instant_delivery: bool = Field(default=False)
    sort_by: str = Field(default="newest", description="price|points|rating|newest|popular")
    order: str = Field(default="desc", description="asc|desc")

# API Endpoints

@router.post("/listings", response_model=Dict)
async def create_listing(
    request: CreateListingRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Create a new points listing in the marketplace
    
    - Requires authenticated user
    - Points are locked in escrow until sold or listing expires
    - Platform fee is deducted from sale proceeds
    """
    try:
        service = PointsMarketplaceService(db, redis_client)
        
        listing_data = {
            'points_amount': request.points_amount,
            'price_per_point': request.price_per_point,
            'currency': request.currency,
            'description': request.description,
            'title': request.title,
            'auto_accept': request.auto_accept,
            'min_purchase': request.min_purchase,
            'max_purchase': request.max_purchase or request.points_amount,
            'expires_at': datetime.utcnow() + timedelta(days=request.expires_in_days),
            'payment_methods': request.payment_methods,
            'bundle_discount': request.bundle_discount,
            'tags': request.tags,
            'negotiable': request.negotiable
        }
        
        result = await service.create_listing(current_user['id'], listing_data)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        # Schedule background tasks
        background_tasks.add_task(
            notify_potential_buyers,
            result['listing_id'],
            current_user['id']
        )
        
        return {
            'success': True,
            'listing': result['listing'],
            'listing_id': result['listing_id'],
            'estimated_sale_time': result.get('estimated_sale_time'),
            'market_price': result.get('market_price'),
            'visibility_score': result.get('visibility_score')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating listing: {e}")
        raise HTTPException(status_code=500, detail="Failed to create listing")

@router.get("/listings", response_model=Dict)
async def search_listings(
    filters: SearchFilters = Depends(),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Search and browse marketplace listings
    
    - No authentication required for browsing
    - Results are paginated
    - Multiple filters and sorting options available
    """
    try:
        service = PointsMarketplaceService(db, redis_client)
        
        search_params = {
            'min_points': filters.min_points,
            'max_points': filters.max_points,
            'min_price': filters.min_price,
            'max_price': filters.max_price,
            'seller_rating': filters.seller_rating,
            'payment_methods': filters.payment_methods,
            'tags': filters.tags,
            'category': filters.category,
            'verified_only': filters.verified_only,
            'instant_delivery': filters.instant_delivery,
            'sort_by': filters.sort_by,
            'order': filters.order,
            'page': page,
            'limit': limit
        }
        
        # Remove None values
        search_params = {k: v for k, v in search_params.items() if v is not None}
        
        result = await service.search_listings(search_params)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('error'))
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching listings: {e}")
        raise HTTPException(status_code=500, detail="Failed to search listings")

@router.get("/listings/{listing_id}", response_model=Dict)
async def get_listing_details(
    listing_id: str,
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Get detailed information about a specific listing
    
    - No authentication required
    - Increments view count
    - Returns seller information and market comparison
    """
    try:
        service = PointsMarketplaceService(db, redis_client)
        
        listing = await service.get_listing_with_details(listing_id)
        
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        # Increment view count
        await service.increment_listing_views(listing_id)
        
        return {
            'success': True,
            'listing': listing
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting listing details: {e}")
        raise HTTPException(status_code=500, detail="Failed to get listing details")

@router.post("/listings/{listing_id}/buy", response_model=Dict)
async def buy_points(
    listing_id: str,
    request: BuyPointsRequest,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Purchase points from a listing
    
    - Requires authenticated user
    - Processes payment and transfers points
    - Points are delivered instantly after payment confirmation
    """
    try:
        service = PointsMarketplaceService(db, redis_client)
        
        purchase_data = {
            'points_amount': request.points_amount,
            'payment_method': request.payment_method,
            'payment_token': request.payment_token,
            'promo_code': request.promo_code
        }
        
        result = await service.buy_points(
            current_user['id'],
            listing_id,
            purchase_data
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error buying points: {e}")
        raise HTTPException(status_code=500, detail="Failed to complete purchase")

@router.post("/listings/{listing_id}/offer", response_model=Dict)
async def make_offer(
    listing_id: str,
    request: CreateOfferRequest,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Make an offer on a listing (for negotiable listings)
    
    - Requires authenticated user
    - Seller will be notified of the offer
    - Offer expires after specified time
    """
    try:
        service = PointsMarketplaceService(db, redis_client)
        
        offer_data = {
            'points_amount': request.points_amount,
            'price_per_point': request.price_per_point,
            'expires_in_hours': request.expires_in_hours,
            'message': request.message,
            'conditions': request.conditions
        }
        
        result = await service.create_offer(
            current_user['id'],
            listing_id,
            offer_data
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating offer: {e}")
        raise HTTPException(status_code=500, detail="Failed to create offer")

@router.post("/offers/{offer_id}/accept", response_model=Dict)
async def accept_offer(
    offer_id: str,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Accept an offer on your listing
    
    - Only the seller can accept offers
    - Completes the transaction immediately
    - Points are transferred and payment is processed
    """
    try:
        service = PointsMarketplaceService(db, redis_client)
        
        result = await service.accept_offer(current_user['id'], offer_id)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accepting offer: {e}")
        raise HTTPException(status_code=500, detail="Failed to accept offer")

@router.post("/offers/{offer_id}/reject", response_model=Dict)
async def reject_offer(
    offer_id: str,
    reason: Optional[str] = Body(None),
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Reject an offer on your listing
    
    - Only the seller can reject offers
    - Optionally provide a reason for rejection
    """
    try:
        service = PointsMarketplaceService(db, redis_client)
        
        result = await service.reject_offer(
            current_user['id'],
            offer_id,
            reason
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting offer: {e}")
        raise HTTPException(status_code=500, detail="Failed to reject offer")

@router.post("/offers/{offer_id}/counter", response_model=Dict)
async def counter_offer(
    offer_id: str,
    request: CounterOfferRequest,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Create a counter-offer to an existing offer
    
    - Only the seller can counter-offer
    - Creates a new offer with updated terms
    """
    try:
        service = PointsMarketplaceService(db, redis_client)
        
        counter_data = {
            'new_price_per_point': request.new_price_per_point,
            'new_points_amount': request.new_points_amount,
            'message': request.message,
            'expires_in_hours': request.expires_in_hours
        }
        
        result = await service.create_counter_offer(
            current_user['id'],
            offer_id,
            counter_data
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating counter-offer: {e}")
        raise HTTPException(status_code=500, detail="Failed to create counter-offer")

@router.post("/exchange", response_model=Dict)
async def create_exchange(
    request: CreateExchangeRequest,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Create a points exchange proposal with another user
    
    - Both users must confirm the exchange
    - Points are locked in escrow until confirmation
    - Can include additional payment if points values differ
    """
    try:
        service = PointsMarketplaceService(db, redis_client)
        
        # Determine payment direction
        payment_from = None
        if request.payment_from == 'me':
            payment_from = current_user['id']
        elif request.payment_from == 'partner':
            payment_from = request.partner_user_id
        
        exchange_data = {
            'user1_points': request.my_points,
            'user2_points': request.partner_points,
            'additional_payment': request.additional_payment,
            'payment_from': payment_from,
            'conditions': request.conditions,
            'expires_in_hours': request.expires_in_hours,
            'message': request.message
        }
        
        result = await service.create_exchange(
            current_user['id'],
            request.partner_user_id,
            exchange_data
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating exchange: {e}")
        raise HTTPException(status_code=500, detail="Failed to create exchange")

@router.get("/statistics", response_model=Dict)
async def get_market_statistics(
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Get current market statistics and analytics
    
    - Public endpoint (no authentication required)
    - Includes price trends, volume, predictions
    - Cached for performance
    """
    try:
        service = PointsMarketplaceService(db, redis_client)
        
        stats = await service.get_market_statistics()
        
        return {
            'success': True,
            'statistics': stats
        }
        
    except Exception as e:
        logger.error(f"Error getting market statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")

@router.get("/my/listings", response_model=Dict)
async def get_my_listings(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Get current user's listings
    
    - Returns all listings created by the authenticated user
    - Can filter by status
    """
    try:
        service = PointsMarketplaceService(db, redis_client)
        
        result = await service.get_user_listings(
            current_user['id'],
            status=status,
            page=page,
            limit=limit
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting user listings: {e}")
        raise HTTPException(status_code=500, detail="Failed to get listings")

@router.get("/my/transactions", response_model=Dict)
async def get_my_transactions(
    type: Optional[str] = Query(None, description="Filter by transaction type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Get current user's transaction history
    
    - Returns both buying and selling transactions
    - Can filter by type and status
    """
    try:
        service = PointsMarketplaceService(db, redis_client)
        
        result = await service.get_user_transactions(
            current_user['id'],
            transaction_type=type,
            status=status,
            page=page,
            limit=limit
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting user transactions: {e}")
        raise HTTPException(status_code=500, detail="Failed to get transactions")

@router.post("/transactions/{transaction_id}/rate", response_model=Dict)
async def rate_transaction(
    transaction_id: str,
    rating: int = Body(..., ge=1, le=5),
    feedback: Optional[str] = Body(None),
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Rate and provide feedback for a completed transaction
    
    - Both buyer and seller can rate each other
    - Ratings affect user trust scores
    """
    try:
        service = PointsMarketplaceService(db, redis_client)
        
        result = await service.rate_transaction(
            current_user['id'],
            transaction_id,
            rating,
            feedback
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rating transaction: {e}")
        raise HTTPException(status_code=500, detail="Failed to rate transaction")

@router.post("/transactions/{transaction_id}/dispute", response_model=Dict)
async def create_dispute(
    transaction_id: str,
    reason: str = Body(...),
    description: str = Body(...),
    evidence: Optional[List[str]] = Body(None),
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Create a dispute for a transaction
    
    - Can be initiated by buyer or seller
    - Locks funds in escrow during resolution
    - Requires evidence and detailed description
    """
    try:
        service = PointsMarketplaceService(db, redis_client)
        
        dispute_data = {
            'reason': reason,
            'description': description,
            'evidence': evidence or []
        }
        
        result = await service.create_dispute(
            current_user['id'],
            transaction_id,
            dispute_data
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating dispute: {e}")
        raise HTTPException(status_code=500, detail="Failed to create dispute")

# Background task functions

async def notify_potential_buyers(listing_id: str, seller_id: int):
    """Background task to notify potential buyers of new listing"""
    try:
        # Implementation would send notifications to users watching similar listings
        logger.info(f"Notifying potential buyers about listing {listing_id}")
    except Exception as e:
        logger.error(f"Error notifying buyers: {e}")

# Add router to main app
def include_router(app):
    app.include_router(router)