"""
Automated Posting Scheduler API Endpoints

RESTful API for:
- Scheduling posts (single and bulk)
- Managing scheduled posts (cancel, reschedule)
- Optimal posting time suggestions
- Task status tracking

Requires admin authentication for all endpoints.

Author: Spirit Tours Development Team
Created: 2025-10-04
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
import logging

from backend.database import get_db
from backend.services.scheduling_service import SchedulingService
# from backend.dependencies import get_current_admin_user  # Uncomment when auth ready

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scheduler", tags=["Automated Scheduler"])


# ===== Request/Response Models =====

class SchedulePostRequest(BaseModel):
    """Request model for scheduling a post"""
    platform: str = Field(..., description="Platform name")
    content: str = Field(..., description="Post content", min_length=1)
    scheduled_time: str = Field(..., description="ISO format datetime")
    media_urls: Optional[List[str]] = Field(None, description="Media URLs")
    hashtags: Optional[List[str]] = Field(None, description="Hashtags")
    recurring: bool = Field(default=False, description="Is recurring post")
    recurrence_pattern: Optional[str] = Field(None, description="Cron pattern")
    timezone: str = Field(default="UTC", description="Timezone")
    
    @validator('scheduled_time')
    def validate_datetime(cls, v):
        try:
            datetime.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError('Invalid datetime format. Use ISO format (YYYY-MM-DDTHH:MM:SS)')
    
    class Config:
        json_schema_extra = {
            "example": {
                "platform": "instagram",
                "content": "Beautiful sunset at our retreat! 🌅 #wellness #mindfulness",
                "scheduled_time": "2025-10-10T14:00:00",
                "media_urls": ["https://example.com/image.jpg"],
                "hashtags": ["#wellness", "#mindfulness"],
                "recurring": False,
                "timezone": "America/Los_Angeles"
            }
        }


class ScheduleWithAIRequest(BaseModel):
    """Request model for AI-generated scheduled post"""
    prompt: str = Field(..., description="Content generation prompt", min_length=10)
    platform: str = Field(..., description="Target platform")
    scheduled_time: str = Field(..., description="ISO format datetime")
    language: str = Field(default="en", description="Content language")
    tone: str = Field(default="friendly", description="Content tone")
    timezone: str = Field(default="UTC", description="Timezone")
    
    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "Create an Instagram post about our new yoga retreat in Bali",
                "platform": "instagram",
                "scheduled_time": "2025-10-10T18:00:00",
                "language": "en",
                "tone": "enthusiastic",
                "timezone": "America/Los_Angeles"
            }
        }


class BulkScheduleRequest(BaseModel):
    """Request model for bulk scheduling"""
    posts: List[dict] = Field(..., description="List of posts to schedule", min_items=1, max_items=50)
    
    class Config:
        json_schema_extra = {
            "example": {
                "posts": [
                    {
                        "platform": "facebook",
                        "content": "Post 1 content...",
                        "scheduled_time": "2025-10-10T14:00:00",
                        "generate_with_ai": False
                    },
                    {
                        "platform": "instagram",
                        "prompt": "Generate post about wellness",
                        "scheduled_time": "2025-10-10T16:00:00",
                        "generate_with_ai": True
                    }
                ]
            }
        }


class RescheduleRequest(BaseModel):
    """Request model for rescheduling a post"""
    new_scheduled_time: str = Field(..., description="New ISO format datetime")
    
    @validator('new_scheduled_time')
    def validate_datetime(cls, v):
        try:
            datetime.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError('Invalid datetime format')


class OptimalTimesRequest(BaseModel):
    """Request model for optimal times suggestion"""
    platform: str = Field(..., description="Platform name")
    date: str = Field(..., description="Target date (YYYY-MM-DD)")
    timezone: str = Field(default="UTC", description="Timezone")
    count: int = Field(default=3, ge=1, le=10, description="Number of suggestions")


# ===== API Endpoints =====

@router.post("/schedule")
async def schedule_post(
    request: SchedulePostRequest,
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)  # Uncomment when auth ready
):
    """
    Schedule a post for future publication
    
    **Authentication**: Admin only
    
    **Features:**
    - Schedule posts for any future time
    - Platform-specific content
    - Media attachment support
    - Recurring posts with cron patterns
    - Timezone-aware scheduling
    
    **Recurring Posts Example:**
    - Daily at 2 PM: "0 14 * * *"
    - Every Monday at 9 AM: "0 9 * * 1"
    - Every hour: "0 * * * *"
    """
    try:
        service = SchedulingService(db)
        
        # Parse datetime
        scheduled_time = datetime.fromisoformat(request.scheduled_time)
        
        result = await service.schedule_post(
            platform=request.platform,
            content=request.content,
            scheduled_time=scheduled_time,
            admin_id=1,  # Replace with current_admin.id
            media_urls=request.media_urls,
            hashtags=request.hashtags,
            recurring=request.recurring,
            recurrence_pattern=request.recurrence_pattern,
            timezone=request.timezone
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Scheduling failed')
            )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Schedule post endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/schedule-with-ai")
async def schedule_with_ai(
    request: ScheduleWithAIRequest,
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)
):
    """
    Generate content with AI and schedule for publication
    
    **Authentication**: Admin only
    
    **Use Case**: Create content automatically and schedule it
    for optimal posting time without manual writing.
    
    **Process:**
    1. Queues AI content generation task
    2. Once generated, schedules for publication
    3. Returns task ID for status tracking
    """
    try:
        service = SchedulingService(db)
        
        scheduled_time = datetime.fromisoformat(request.scheduled_time)
        
        result = await service.schedule_with_ai(
            prompt=request.prompt,
            platform=request.platform,
            scheduled_time=scheduled_time,
            admin_id=1,  # Replace with current_admin.id
            language=request.language,
            tone=request.tone,
            timezone=request.timezone
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'AI scheduling failed')
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Schedule with AI endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/bulk-schedule")
async def bulk_schedule(
    request: BulkScheduleRequest,
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)
):
    """
    Schedule multiple posts at once
    
    **Authentication**: Admin only
    
    **Use Case**: Batch schedule an entire week or month of content
    in one operation. Supports mix of pre-written and AI-generated content.
    
    **Limit**: Maximum 50 posts per batch
    """
    try:
        if len(request.posts) > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 50 posts per batch"
            )
        
        service = SchedulingService(db)
        
        result = await service.bulk_schedule(
            posts=request.posts,
            admin_id=1  # Replace with current_admin.id
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Bulk scheduling failed')
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Bulk schedule endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/scheduled-posts")
async def get_scheduled_posts(
    platform: Optional[str] = Query(None, description="Filter by platform"),
    status: Optional[str] = Query(None, description="Filter by status"),
    start_date: Optional[str] = Query(None, description="Start date (ISO)"),
    end_date: Optional[str] = Query(None, description="End date (ISO)"),
    limit: int = Query(100, ge=1, le=500, description="Maximum results"),
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)
):
    """
    Get list of scheduled posts
    
    **Authentication**: Admin only
    
    **Filters:**
    - platform: Filter by specific platform
    - status: pending, processing, published, failed, cancelled
    - start_date: Beginning of date range
    - end_date: End of date range
    - limit: Maximum number of results
    
    **Returns**: List of scheduled posts with details
    """
    try:
        service = SchedulingService(db)
        
        # Parse dates if provided
        start = datetime.fromisoformat(start_date) if start_date else None
        end = datetime.fromisoformat(end_date) if end_date else None
        
        posts = await service.get_scheduled_posts(
            platform=platform,
            status=status,
            start_date=start,
            end_date=end,
            limit=limit
        )
        
        return {
            'success': True,
            'posts': posts,
            'count': len(posts),
            'filters': {
                'platform': platform,
                'status': status,
                'start_date': start_date,
                'end_date': end_date
            }
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Get scheduled posts endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.put("/reschedule/{post_id}")
async def reschedule_post(
    post_id: int,
    request: RescheduleRequest,
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)
):
    """
    Reschedule a pending post to a new time
    
    **Authentication**: Admin only
    
    **Requirements:**
    - Post must be in 'pending' status
    - New time must be in the future
    
    **Returns**: Updated post details
    """
    try:
        service = SchedulingService(db)
        
        new_time = datetime.fromisoformat(request.new_scheduled_time)
        
        result = await service.reschedule_post(
            post_id=post_id,
            new_scheduled_time=new_time
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Rescheduling failed')
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Reschedule endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/cancel/{post_id}")
async def cancel_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)
):
    """
    Cancel a scheduled post
    
    **Authentication**: Admin only
    
    **Requirements:**
    - Post must be in 'pending' status
    - Cannot cancel posts already published or processing
    
    **Note**: This marks the post as cancelled, doesn't delete it
    """
    try:
        service = SchedulingService(db)
        
        result = await service.cancel_scheduled_post(post_id)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Cancellation failed')
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Cancel post endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/optimal-times")
async def get_optimal_times(
    request: OptimalTimesRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Get optimal posting time suggestions for a platform
    
    **Authentication**: Admin only
    
    **Use Case**: Find the best times to post on each platform
    based on research and engagement patterns.
    
    **Returns**: List of suggested datetime objects
    """
    try:
        service = SchedulingService(db)
        
        # Parse date
        target_date = datetime.fromisoformat(request.date + "T00:00:00")
        
        suggestions = service.suggest_optimal_times(
            platform=request.platform,
            date=target_date,
            timezone=request.timezone,
            count=request.count
        )
        
        return {
            'success': True,
            'platform': request.platform,
            'date': request.date,
            'timezone': request.timezone,
            'suggestions': [dt.isoformat() for dt in suggestions],
            'count': len(suggestions)
        }
        
    except Exception as e:
        logger.error(f"Optimal times endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/posting-frequency/{platform}")
async def get_posting_frequency(
    platform: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get recommended posting frequency for a platform
    
    **Authentication**: Admin only
    
    **Returns:**
    - Minimum posts per day
    - Maximum posts per day
    - Optimal posts per day
    - Recommendations
    """
    try:
        service = SchedulingService(db)
        
        recommendation = service.get_posting_frequency_recommendation(platform)
        
        return {
            'success': True,
            **recommendation
        }
        
    except Exception as e:
        logger.error(f"Posting frequency endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/task-status/{task_id}")
async def get_task_status(
    task_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get status of a Celery task
    
    **Authentication**: Admin only
    
    **Use Case**: Track progress of AI generation or publication tasks
    
    **Returns**: Task status, progress, result, and any errors
    """
    try:
        from backend.celery_config import celery_app
        
        task = celery_app.AsyncResult(task_id)
        
        return {
            'success': True,
            'task_id': task_id,
            'status': task.status,
            'ready': task.ready(),
            'successful': task.successful() if task.ready() else None,
            'result': task.result if task.ready() else None,
            'info': task.info
        }
        
    except Exception as e:
        logger.error(f"Task status endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/config")
async def get_scheduler_config():
    """
    Get scheduler configuration
    
    **Returns:**
    - Optimal posting times per platform
    - Posting frequency recommendations
    - Timezone information
    - Supported cron patterns
    """
    from backend.services.scheduling_service import SchedulingService
    
    return {
        'success': True,
        'config': {
            'optimal_times': SchedulingService.OPTIMAL_TIMES,
            'posting_frequency': SchedulingService.POSTING_FREQUENCY,
            'supported_timezones': ['UTC', 'America/Los_Angeles', 'America/New_York', 'Europe/London'],
            'cron_patterns': {
                'daily_2pm': '0 14 * * *',
                'every_monday_9am': '0 9 * * 1',
                'every_hour': '0 * * * *',
                'twice_daily': '0 9,17 * * *'
            }
        }
    }


@router.get("/health")
async def health_check():
    """
    Health check endpoint for scheduler service
    
    **Returns:** Service status and Celery worker status
    """
    try:
        from backend.celery_config import celery_app
        
        # Check if Celery is running
        inspector = celery_app.control.inspect()
        active_workers = inspector.active()
        
        return {
            'status': 'healthy',
            'service': 'Automated Scheduler',
            'celery_workers': len(active_workers) if active_workers else 0,
            'celery_available': active_workers is not None,
            'version': '1.0.0',
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'degraded',
            'service': 'Automated Scheduler',
            'celery_available': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }
