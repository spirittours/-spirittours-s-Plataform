"""
API Routes for AI Tour Designer Generativo
Endpoints para generación de tours personalizados con GPT-4/5
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from fastapi.responses import JSONResponse, StreamingResponse
from typing import List, Dict, Optional, Any
from datetime import datetime
from pydantic import BaseModel
import json
import asyncio
import os
from sqlalchemy.ext.asyncio import AsyncSession

from ai.generative.tour_designer import (
    GenerativeTourDesigner,
    UserProfile,
    TourPreferences,
    BudgetRange,
    GeneratedTour,
    TourDesignerAPI
)
from core.database import get_db
from core.auth import get_current_user
from core.cache_manager import CacheManager
from models.user import User

# Initialize router
router = APIRouter(prefix="/api/ai/tour-designer", tags=["AI Tour Designer"])

# Initialize services
tour_designer = GenerativeTourDesigner(
    api_key=os.getenv("OPENAI_API_KEY"),
    model="gpt-4-turbo-preview"
)
tour_api = TourDesignerAPI(tour_designer)
cache = CacheManager()

# Request/Response Models
class GenerateTourRequest(BaseModel):
    """Request model for tour generation"""
    profile: Dict[str, Any]
    preferences: Dict[str, Any]
    budget: Dict[str, Any]
    constraints: Optional[List[str]] = []

class RegenerateSectionRequest(BaseModel):
    """Request model for section regeneration"""
    tour_id: str
    section: str
    feedback: str

class TourResponse(BaseModel):
    """Response model for generated tour"""
    status: str
    tour: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
    generation_time: Optional[float] = None

class TourListResponse(BaseModel):
    """Response model for tour list"""
    tours: List[Dict[str, Any]]
    total: int
    page: int
    per_page: int

# Endpoints
@router.post("/generate", response_model=TourResponse)
async def generate_tour(
    request: GenerateTourRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a personalized tour using AI
    
    This endpoint uses GPT-4/5 to create a completely customized tour itinerary
    based on user profile, preferences, and budget constraints.
    """
    try:
        start_time = datetime.now()
        
        # Parse request data
        user_profile = UserProfile(
            user_id=str(current_user.id),
            **request.profile
        )
        
        # Convert date strings to datetime objects
        preferences_dict = request.preferences.copy()
        if 'startDate' in preferences_dict:
            preferences_dict['start_date'] = datetime.fromisoformat(preferences_dict.pop('startDate'))
        if 'endDate' in preferences_dict:
            preferences_dict['end_date'] = datetime.fromisoformat(preferences_dict.pop('endDate'))
        
        tour_preferences = TourPreferences(**preferences_dict)
        budget_range = BudgetRange(**request.budget)
        
        # Check cache for similar request
        cache_key = f"tour_{current_user.id}_{tour_preferences.destination}_{tour_preferences.start_date}"
        cached_tour = await cache.get(cache_key)
        
        if cached_tour:
            return TourResponse(
                status="success",
                tour=cached_tour,
                message="Tour retrieved from cache",
                generation_time=0.1
            )
        
        # Generate tour
        generated_tour = await tour_designer.generate_custom_tour(
            user_profile=user_profile,
            preferences=tour_preferences,
            budget=budget_range,
            constraints=request.constraints
        )
        
        # Save to database
        tour_id = await tour_designer.save_tour(generated_tour, db)
        
        # Cache the result
        await cache.set(cache_key, generated_tour.dict(), ttl=3600)  # Cache for 1 hour
        
        # Track analytics
        background_tasks.add_task(
            track_tour_generation,
            user_id=str(current_user.id),
            tour_id=tour_id,
            destination=tour_preferences.destination,
            duration_days=generated_tour.duration_days
        )
        
        generation_time = (datetime.now() - start_time).total_seconds()
        
        return TourResponse(
            status="success",
            tour=generated_tour.dict(),
            message="Tour generated successfully",
            generation_time=generation_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/regenerate", response_model=TourResponse)
async def regenerate_section(
    request: RegenerateSectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Regenerate a specific section of the tour based on user feedback
    
    Allows users to refine specific parts of their generated tour
    while maintaining consistency with the rest of the itinerary.
    """
    try:
        # Load tour from database
        query = "SELECT * FROM generated_tours WHERE tour_id = $1 AND user_id = $2"
        tour_data = await db.fetchrow(query, request.tour_id, str(current_user.id))
        
        if not tour_data:
            raise HTTPException(status_code=404, detail="Tour not found")
        
        # Parse tour data
        tour_json = json.loads(tour_data['itinerary_json'])
        tour = GeneratedTour(**tour_json)
        
        # Regenerate section
        updated_tour = await tour_designer.regenerate_section(
            tour=tour,
            section=request.section,
            feedback=request.feedback
        )
        
        # Update database
        update_query = """
        UPDATE generated_tours 
        SET itinerary_json = $1, updated_at = NOW()
        WHERE tour_id = $2
        """
        await db.execute(update_query, json.dumps(updated_tour.dict()), request.tour_id)
        
        # Clear cache
        cache_key = f"tour_{current_user.id}_{tour.destination}_{tour.start_date}"
        await cache.delete(cache_key)
        
        return TourResponse(
            status="success",
            tour=updated_tour.dict(),
            message=f"{request.section} section regenerated successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tours", response_model=TourListResponse)
async def get_user_tours(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    destination: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of tours generated by the current user
    
    Returns paginated list of tours with optional filtering by destination.
    """
    try:
        # Build query
        base_query = """
        SELECT tour_id, destination, title, duration_days, 
               start_date, end_date, total_budget_estimate,
               sustainability_score, personalization_score,
               generated_at
        FROM generated_tours
        WHERE user_id = $1
        """
        
        params = [str(current_user.id)]
        
        if destination:
            base_query += " AND destination ILIKE $2"
            params.append(f"%{destination}%")
        
        base_query += " ORDER BY generated_at DESC"
        
        # Add pagination
        offset = (page - 1) * per_page
        base_query += f" LIMIT {per_page} OFFSET {offset}"
        
        # Execute query
        tours = await db.fetch(base_query, *params)
        
        # Get total count
        count_query = "SELECT COUNT(*) FROM generated_tours WHERE user_id = $1"
        if destination:
            count_query += " AND destination ILIKE $2"
        
        total = await db.fetchval(count_query, *params)
        
        return TourListResponse(
            tours=[dict(tour) for tour in tours],
            total=total,
            page=page,
            per_page=per_page
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tour/{tour_id}")
async def get_tour_details(
    tour_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information for a specific tour
    
    Returns complete tour itinerary with all activities, tips, and practical information.
    """
    try:
        # Check cache first
        cache_key = f"tour_details_{tour_id}"
        cached = await cache.get(cache_key)
        
        if cached:
            return JSONResponse(content=cached)
        
        # Load from database
        query = """
        SELECT itinerary_json 
        FROM generated_tours 
        WHERE tour_id = $1 AND user_id = $2
        """
        
        result = await db.fetchval(query, tour_id, str(current_user.id))
        
        if not result:
            raise HTTPException(status_code=404, detail="Tour not found")
        
        tour_data = json.loads(result)
        
        # Cache for 1 hour
        await cache.set(cache_key, tour_data, ttl=3600)
        
        return JSONResponse(content=tour_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/tour/{tour_id}")
async def delete_tour(
    tour_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a generated tour
    
    Permanently removes a tour from the user's saved tours.
    """
    try:
        query = """
        DELETE FROM generated_tours 
        WHERE tour_id = $1 AND user_id = $2
        RETURNING tour_id
        """
        
        deleted = await db.fetchval(query, tour_id, str(current_user.id))
        
        if not deleted:
            raise HTTPException(status_code=404, detail="Tour not found")
        
        # Clear cache
        cache_key = f"tour_details_{tour_id}"
        await cache.delete(cache_key)
        
        return {"status": "success", "message": "Tour deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tour/{tour_id}/share")
async def share_tour(
    tour_id: str,
    share_with: List[str],  # List of email addresses
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Share a tour with other users
    
    Sends tour details to specified email addresses.
    """
    try:
        # Verify tour ownership
        query = "SELECT title, destination FROM generated_tours WHERE tour_id = $1 AND user_id = $2"
        tour_info = await db.fetchrow(query, tour_id, str(current_user.id))
        
        if not tour_info:
            raise HTTPException(status_code=404, detail="Tour not found")
        
        # Create shareable link
        share_link = f"https://spirittours.com/shared-tour/{tour_id}"
        
        # Send emails (would integrate with email service)
        for email in share_with:
            # await send_tour_share_email(email, tour_info, share_link)
            pass
        
        # Log sharing activity
        await db.execute(
            "INSERT INTO tour_shares (tour_id, shared_by, shared_with, share_link) VALUES ($1, $2, $3, $4)",
            tour_id, str(current_user.id), json.dumps(share_with), share_link
        )
        
        return {
            "status": "success",
            "message": f"Tour shared with {len(share_with)} recipients",
            "share_link": share_link
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tour/{tour_id}/export")
async def export_tour(
    tour_id: str,
    format: str = Query("pdf", regex="^(pdf|json|ics)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export tour in different formats
    
    Supports PDF, JSON, and ICS (calendar) formats.
    """
    try:
        # Load tour data
        query = "SELECT itinerary_json FROM generated_tours WHERE tour_id = $1 AND user_id = $2"
        result = await db.fetchval(query, tour_id, str(current_user.id))
        
        if not result:
            raise HTTPException(status_code=404, detail="Tour not found")
        
        tour_data = json.loads(result)
        
        if format == "json":
            return JSONResponse(
                content=tour_data,
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=tour_{tour_id}.json"}
            )
        
        elif format == "pdf":
            # Generate PDF (would use library like ReportLab)
            pdf_content = await generate_tour_pdf(tour_data)
            return StreamingResponse(
                pdf_content,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=tour_{tour_id}.pdf"}
            )
        
        elif format == "ics":
            # Generate ICS calendar file
            ics_content = await generate_tour_calendar(tour_data)
            return StreamingResponse(
                ics_content,
                media_type="text/calendar",
                headers={"Content-Disposition": f"attachment; filename=tour_{tour_id}.ics"}
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics")
async def get_tour_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get analytics for user's generated tours
    
    Returns statistics about tour generation patterns and preferences.
    """
    try:
        analytics = await tour_designer.get_tour_analytics(str(current_user.id))
        
        # Additional analytics from database
        query = """
        SELECT 
            COUNT(*) as total_tours,
            AVG(personalization_score) as avg_personalization,
            AVG(sustainability_score) as avg_sustainability,
            AVG(duration_days) as avg_duration,
            AVG(total_budget_estimate) as avg_budget,
            array_agg(DISTINCT destination) as destinations
        FROM generated_tours
        WHERE user_id = $1
        """
        
        stats = await db.fetchrow(query, str(current_user.id))
        
        analytics.update({
            "total_tours_generated": stats['total_tours'],
            "average_personalization_score": float(stats['avg_personalization'] or 0),
            "average_sustainability_score": float(stats['avg_sustainability'] or 0),
            "average_duration": float(stats['avg_duration'] or 0),
            "average_budget": float(stats['avg_budget'] or 0),
            "unique_destinations": len(stats['destinations'] or [])
        })
        
        return analytics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback")
async def submit_feedback(
    tour_id: str,
    rating: int = Query(..., ge=1, le=5),
    feedback: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit feedback for a generated tour
    
    Helps improve future tour generation with user feedback.
    """
    try:
        # Verify tour ownership
        verify_query = "SELECT tour_id FROM generated_tours WHERE tour_id = $1 AND user_id = $2"
        exists = await db.fetchval(verify_query, tour_id, str(current_user.id))
        
        if not exists:
            raise HTTPException(status_code=404, detail="Tour not found")
        
        # Save feedback
        insert_query = """
        INSERT INTO tour_feedback (tour_id, user_id, rating, feedback, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        """
        
        await db.execute(
            insert_query,
            tour_id,
            str(current_user.id),
            rating,
            feedback
        )
        
        return {
            "status": "success",
            "message": "Thank you for your feedback!"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions
async def track_tour_generation(user_id: str, tour_id: str, destination: str, duration_days: int):
    """Track tour generation for analytics"""
    # Implementation would log to analytics service
    pass

async def generate_tour_pdf(tour_data: Dict[str, Any]) -> bytes:
    """Generate PDF version of tour"""
    # Implementation would use ReportLab or similar
    return b"PDF content"

async def generate_tour_calendar(tour_data: Dict[str, Any]) -> bytes:
    """Generate ICS calendar file for tour"""
    # Implementation would create ICS format
    return b"ICS content"

# WebSocket endpoint for real-time tour generation updates
@router.websocket("/ws/generate")
async def websocket_generate_tour(websocket):
    """
    WebSocket endpoint for real-time tour generation updates
    
    Provides live progress updates during tour generation.
    """
    await websocket.accept()
    try:
        while True:
            # Receive generation request
            data = await websocket.receive_json()
            
            # Send progress updates
            await websocket.send_json({
                "status": "processing",
                "progress": 10,
                "message": "Analyzing your preferences..."
            })
            
            # Generate tour with progress updates
            # ... implementation ...
            
            await websocket.send_json({
                "status": "completed",
                "progress": 100,
                "tour": {}  # Generated tour data
            })
            
    except Exception as e:
        await websocket.send_json({
            "status": "error",
            "message": str(e)
        })
    finally:
        await websocket.close()