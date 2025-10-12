"""
API Routes for Advanced Raffle System
Rutas para sistema de sorteos con múltiples modalidades
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Body, BackgroundTasks, File, UploadFile
from fastapi.responses import JSONResponse, HTMLResponse
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, validator
import logging
from sqlalchemy.orm import Session
import qrcode
import io
import base64

from ..services.advanced_raffle_system import (
    AdvancedRaffleSystem,
    RaffleType, EntryMethod, RaffleStatus, PrizeType
)
from ..auth import get_current_user
from ..database import get_db
from ..utils.redis_client import get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/raffles", tags=["raffles"])

# Pydantic models for validation

class CreateRaffleRequest(BaseModel):
    """Request model for creating a raffle"""
    type: str = Field(..., description="Type of raffle")
    title: str = Field(..., max_length=200, description="Raffle title")
    description: str = Field(..., max_length=2000, description="Raffle description")
    prizes: List[Dict[str, Any]] = Field(..., description="List of prizes")
    entry_methods: List[str] = Field(..., description="Methods to enter raffle")
    start_date: datetime = Field(..., description="Start date")
    end_date: datetime = Field(..., description="End date")
    event_location: Optional[str] = Field(None, description="Event location for QR raffles")
    event_name: Optional[str] = Field(None, description="Event name")
    max_participants: Optional[int] = Field(None, ge=1, description="Maximum participants")
    entry_requirements: Optional[Dict] = Field(default={}, description="Entry requirements")
    social_requirements: Optional[Dict] = Field(default={}, description="Social media requirements")
    auto_draw: bool = Field(default=True, description="Auto draw winner when ended")
    visibility: str = Field(default="public", description="public|private|event_only")
    tags: Optional[List[str]] = Field(default=[], description="Raffle tags")
    sponsor_info: Optional[Dict] = Field(None, description="Sponsor information")
    
    @validator('type')
    def validate_type(cls, v):
        valid_types = [e.value for e in RaffleType]
        if v not in valid_types:
            raise ValueError(f"Invalid raffle type. Must be one of: {valid_types}")
        return v
    
    @validator('entry_methods')
    def validate_entry_methods(cls, v):
        valid_methods = [e.value for e in EntryMethod]
        for method in v:
            if method not in valid_methods:
                raise ValueError(f"Invalid entry method: {method}")
        return v
    
    @validator('end_date')
    def validate_dates(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError("End date must be after start date")
        return v

class EventRegistrationRequest(BaseModel):
    """Request model for event registration via QR"""
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., regex=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    phone: str = Field(..., min_length=10, max_length=20)
    social_profiles: Optional[Dict[str, str]] = Field(default={})
    qr_scan_location: Optional[str] = Field(None)
    accept_terms: bool = Field(..., description="Must accept terms")
    newsletter: bool = Field(default=False, description="Subscribe to newsletter")
    
    @validator('accept_terms')
    def must_accept_terms(cls, v):
        if not v:
            raise ValueError("Must accept terms and conditions")
        return v

class SocialActionRequest(BaseModel):
    """Request model for social media actions"""
    platform: str = Field(..., description="Social platform")
    action: str = Field(..., description="Action type: share|like|follow|comment")
    url: Optional[str] = Field(None, description="URL of the action")
    reach: Optional[int] = Field(None, ge=0, description="Estimated reach")
    friends_engaged: Optional[List[str]] = Field(default=[], description="Friends who engaged")
    proof: Optional[str] = Field(None, description="Screenshot or proof of action")

class DrawWinnerRequest(BaseModel):
    """Request model for drawing winners"""
    method: str = Field(default="random", description="Selection method: random|weighted|verified")
    video_proof: bool = Field(default=False, description="Record video proof")
    notify_immediately: bool = Field(default=True, description="Notify winners immediately")
    public_announcement: bool = Field(default=True, description="Make public announcement")

# API Endpoints

@router.post("/create", response_model=Dict)
async def create_raffle(
    request: CreateRaffleRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Create a new raffle/sweepstakes
    
    - Multiple raffle types: travel, souvenir, christmas, events, etc.
    - Various entry methods: purchase, social share, QR scan, etc.
    - Automatic winner selection available
    - Event raffles with QR code registration
    """
    try:
        service = AdvancedRaffleSystem(db, redis_client)
        
        raffle_data = request.dict()
        
        # Create raffle
        result = await service.create_raffle(current_user['id'], raffle_data)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        # Schedule background tasks
        if raffle_data['type'] == RaffleType.EVENT.value:
            background_tasks.add_task(
                setup_event_infrastructure,
                result['raffle_id'],
                result['event_code']
            )
        
        # Schedule social media announcements
        background_tasks.add_task(
            announce_raffle_on_social_media,
            result['raffle']
        )
        
        return {
            'success': True,
            'raffle_id': result['raffle_id'],
            'raffle': result['raffle'],
            'event_code': result.get('event_code'),
            'qr_code': result.get('qr_code'),
            'share_links': result.get('share_links'),
            'predictions': result.get('predictions')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating raffle: {e}")
        raise HTTPException(status_code=500, detail="Failed to create raffle")

@router.get("/", response_model=Dict)
async def get_raffles(
    type: Optional[str] = Query(None, description="Filter by raffle type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Get list of active raffles
    
    - Browse all public raffles
    - Filter by type and status
    - Paginated results
    """
    try:
        service = AdvancedRaffleSystem(db, redis_client)
        
        filters = {
            'type': type,
            'status': status or RaffleStatus.ACTIVE.value,
            'visibility': 'public',
            'page': page,
            'limit': limit
        }
        
        result = await service.get_raffles(filters)
        
        return {
            'success': True,
            'raffles': result['raffles'],
            'pagination': result['pagination'],
            'featured': result.get('featured', []),
            'ending_soon': result.get('ending_soon', [])
        }
        
    except Exception as e:
        logger.error(f"Error getting raffles: {e}")
        raise HTTPException(status_code=500, detail="Failed to get raffles")

@router.get("/{raffle_id}", response_model=Dict)
async def get_raffle_details(
    raffle_id: str,
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Get detailed information about a specific raffle
    
    - Full raffle details
    - Current statistics
    - Entry methods and requirements
    - Prize information
    """
    try:
        service = AdvancedRaffleSystem(db, redis_client)
        
        raffle = await service.get_raffle_details(raffle_id)
        
        if not raffle:
            raise HTTPException(status_code=404, detail="Raffle not found")
        
        # Increment view count
        await service.increment_raffle_views(raffle_id)
        
        return {
            'success': True,
            'raffle': raffle,
            'time_remaining': (raffle['end_date'] - datetime.utcnow()).total_seconds(),
            'entry_options': await service.get_entry_options(raffle_id),
            'leaderboard': await service.get_raffle_leaderboard(raffle_id, limit=10)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting raffle details: {e}")
        raise HTTPException(status_code=500, detail="Failed to get raffle details")

@router.post("/event/{event_code}/register", response_model=Dict)
async def register_for_event_raffle(
    event_code: str,
    request: EventRegistrationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Register for event raffle via QR code
    
    - Scan QR code at events (FITUR, etc.)
    - Get unique ticket number
    - Automatic entry into raffle
    - Must follow social media for extra entries
    """
    try:
        service = AdvancedRaffleSystem(db, redis_client)
        
        participant_data = {
            'name': request.name,
            'email': request.email,
            'phone': request.phone,
            'social_profiles': request.social_profiles,
            'qr_scan_location': request.qr_scan_location,
            'newsletter': request.newsletter,
            'device_info': {
                'timestamp': datetime.utcnow().isoformat(),
                'source': 'qr_scan'
            }
        }
        
        result = await service.register_event_participant(event_code, participant_data)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        # Send ticket via email
        background_tasks.add_task(
            send_event_ticket_email,
            participant_data['email'],
            result['ticket_number'],
            result['digital_ticket']
        )
        
        return {
            'success': True,
            'ticket_number': result['ticket_number'],
            'entry_id': result['entry_id'],
            'total_entries': result['total_entries'],
            'bonus_entries': result['bonus_entries'],
            'points_earned': result['points_earned'],
            'digital_ticket': result['digital_ticket'],
            'qr_code': result['qr_code'],
            'share_links': result['share_links'],
            'raffle_info': result['raffle_info']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering for event: {e}")
        raise HTTPException(status_code=500, detail="Failed to register")

@router.post("/{raffle_id}/enter/social", response_model=Dict)
async def enter_via_social_action(
    raffle_id: str,
    request: SocialActionRequest,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Enter raffle via social media action
    
    - Share on social media for entries
    - Like Facebook page for 1 point
    - Follow on Instagram/Twitter for extra entries
    - Get bonus for viral spread
    """
    try:
        service = AdvancedRaffleSystem(db, redis_client)
        
        social_action = {
            'platform': request.platform,
            'action': request.action,
            'url': request.url,
            'reach': request.reach,
            'friends_engaged': request.friends_engaged,
            'proof': request.proof
        }
        
        result = await service.add_social_entry(
            current_user['id'],
            raffle_id,
            social_action
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding social entry: {e}")
        raise HTTPException(status_code=500, detail="Failed to add entry")

@router.post("/{raffle_id}/enter/points", response_model=Dict)
async def enter_with_points(
    raffle_id: str,
    points_to_spend: int = Body(..., ge=1, le=1000),
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Enter raffle using accumulated points
    
    - Spend points for raffle entries
    - More points = more entries
    - Points are non-refundable
    """
    try:
        service = AdvancedRaffleSystem(db, redis_client)
        
        result = await service.enter_with_points(
            current_user['id'],
            raffle_id,
            points_to_spend
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error entering with points: {e}")
        raise HTTPException(status_code=500, detail="Failed to enter raffle")

@router.post("/{raffle_id}/draw", response_model=Dict)
async def draw_winners(
    raffle_id: str,
    request: DrawWinnerRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Draw winners for a raffle (admin only)
    
    - Random, weighted, or verified selection
    - Optional video proof recording
    - Automatic winner notification
    - NFT generation for winners
    """
    try:
        # Verify admin privileges
        if not current_user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Admin access required")
        
        service = AdvancedRaffleSystem(db, redis_client)
        
        result = await service.draw_winner(
            raffle_id,
            current_user['id'],
            request.method,
            request.video_proof
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        # Background tasks
        if request.notify_immediately:
            background_tasks.add_task(
                notify_raffle_winners,
                result['winners']
            )
        
        if request.public_announcement:
            background_tasks.add_task(
                announce_winners_publicly,
                raffle_id,
                result['winners']
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error drawing winners: {e}")
        raise HTTPException(status_code=500, detail="Failed to draw winners")

@router.get("/{raffle_id}/analytics", response_model=Dict)
async def get_raffle_analytics(
    raffle_id: str,
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Get comprehensive analytics for a raffle
    
    - Participation metrics
    - Viral coefficient and social reach
    - Demographics analysis
    - ROI and business metrics
    - ML-powered predictions
    """
    try:
        # Verify ownership or admin
        service = AdvancedRaffleSystem(db, redis_client)
        
        raffle = await service.get_raffle(raffle_id)
        if not raffle:
            raise HTTPException(status_code=404, detail="Raffle not found")
        
        if raffle['creator_id'] != current_user['id'] and not current_user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Access denied")
        
        analytics = await service.get_raffle_analytics(raffle_id)
        
        return analytics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get analytics")

@router.get("/{raffle_id}/participants", response_model=Dict)
async def get_raffle_participants(
    raffle_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Get list of raffle participants (admin/owner only)
    
    - Full participant list
    - Entry counts per participant
    - Export options available
    """
    try:
        service = AdvancedRaffleSystem(db, redis_client)
        
        # Verify permissions
        raffle = await service.get_raffle(raffle_id)
        if not raffle:
            raise HTTPException(status_code=404, detail="Raffle not found")
        
        if raffle['creator_id'] != current_user['id'] and not current_user.get('is_admin'):
            raise HTTPException(status_code=403, detail="Access denied")
        
        result = await service.get_participants(
            raffle_id,
            page=page,
            limit=limit
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting participants: {e}")
        raise HTTPException(status_code=500, detail="Failed to get participants")

@router.get("/my/entries", response_model=Dict)
async def get_my_entries(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Get current user's raffle entries
    
    - All raffles entered
    - Entry counts and status
    - Won/pending results
    """
    try:
        service = AdvancedRaffleSystem(db, redis_client)
        
        result = await service.get_user_entries(
            current_user['id'],
            status=status,
            page=page,
            limit=limit
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting user entries: {e}")
        raise HTTPException(status_code=500, detail="Failed to get entries")

@router.get("/my/wins", response_model=Dict)
async def get_my_wins(
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Get user's raffle wins
    
    - All prizes won
    - Claim status
    - Verification codes
    """
    try:
        service = AdvancedRaffleSystem(db, redis_client)
        
        result = await service.get_user_wins(current_user['id'])
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting user wins: {e}")
        raise HTTPException(status_code=500, detail="Failed to get wins")

@router.post("/claim/{verification_code}", response_model=Dict)
async def claim_prize(
    verification_code: str,
    shipping_info: Optional[Dict] = Body(None),
    current_user: Dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis_client)
):
    """
    Claim a won prize
    
    - Verify winner identity
    - Provide shipping information if needed
    - Generate claim receipt
    """
    try:
        service = AdvancedRaffleSystem(db, redis_client)
        
        result = await service.claim_prize(
            current_user['id'],
            verification_code,
            shipping_info
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error claiming prize: {e}")
        raise HTTPException(status_code=500, detail="Failed to claim prize")

# Background task functions

async def setup_event_infrastructure(raffle_id: str, event_code: str):
    """Setup event infrastructure for QR-based raffles"""
    try:
        logger.info(f"Setting up event infrastructure for {raffle_id} with code {event_code}")
        # Implementation would setup event systems
    except Exception as e:
        logger.error(f"Error setting up event: {e}")

async def announce_raffle_on_social_media(raffle: Dict):
    """Announce new raffle on social media platforms"""
    try:
        logger.info(f"Announcing raffle {raffle['id']} on social media")
        # Implementation would post to social media
    except Exception as e:
        logger.error(f"Error announcing raffle: {e}")

async def send_event_ticket_email(email: str, ticket_number: str, ticket_url: str):
    """Send event ticket via email"""
    try:
        logger.info(f"Sending ticket {ticket_number} to {email}")
        # Implementation would send email
    except Exception as e:
        logger.error(f"Error sending ticket: {e}")

async def notify_raffle_winners(winners: List[Dict]):
    """Notify raffle winners"""
    try:
        logger.info(f"Notifying {len(winners)} winners")
        # Implementation would notify winners
    except Exception as e:
        logger.error(f"Error notifying winners: {e}")

async def announce_winners_publicly(raffle_id: str, winners: List[Dict]):
    """Make public announcement of winners"""
    try:
        logger.info(f"Announcing winners for raffle {raffle_id}")
        # Implementation would make public announcement
    except Exception as e:
        logger.error(f"Error announcing winners: {e}")

# Add router to main app
def include_router(app):
    app.include_router(router)