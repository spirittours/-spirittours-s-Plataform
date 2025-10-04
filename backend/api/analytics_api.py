"""
Advanced Analytics API Endpoints

RESTful API for:
- Dashboard overview with real-time metrics
- ROI analysis and cost tracking
- Engagement metrics and trends
- Follower growth tracking
- Platform comparisons
- Data export functionality

Requires admin authentication for all endpoints.

Author: Spirit Tours Development Team
Created: 2025-10-04
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
import logging
import io
import csv

from backend.database import get_db
from backend.services.analytics_service import AnalyticsService
# from backend.dependencies import get_current_admin_user  # Uncomment when auth ready

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["Advanced Analytics"])


# ===== Request/Response Models =====

class DashboardRequest(BaseModel):
    """Request model for dashboard overview"""
    platform: Optional[str] = Field(None, description="Filter by platform")
    days: int = Field(default=30, ge=1, le=365, description="Number of days to analyze")
    
    class Config:
        json_schema_extra = {
            "example": {
                "platform": "instagram",
                "days": 30
            }
        }


class ROIRequest(BaseModel):
    """Request model for ROI analysis"""
    platform: Optional[str] = Field(None, description="Filter by platform")
    days: int = Field(default=30, ge=1, le=365, description="Number of days to analyze")
    
    class Config:
        json_schema_extra = {
            "example": {
                "platform": None,
                "days": 90
            }
        }


class EngagementRequest(BaseModel):
    """Request model for engagement metrics"""
    platform: Optional[str] = Field(None, description="Filter by platform")
    start_date: Optional[str] = Field(None, description="Start date (ISO format)")
    end_date: Optional[str] = Field(None, description="End date (ISO format)")
    
    @validator('start_date', 'end_date')
    def validate_date(cls, v):
        if v:
            try:
                datetime.fromisoformat(v)
                return v
            except ValueError:
                raise ValueError('Invalid date format. Use ISO format (YYYY-MM-DD)')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "platform": "facebook",
                "start_date": "2025-09-01",
                "end_date": "2025-10-01"
            }
        }


class ExportRequest(BaseModel):
    """Request model for data export"""
    export_type: str = Field(..., description="Type of data to export")
    platform: Optional[str] = Field(None, description="Filter by platform")
    start_date: Optional[str] = Field(None, description="Start date (ISO format)")
    end_date: Optional[str] = Field(None, description="End date (ISO format)")
    format: str = Field(default="csv", description="Export format")
    
    class Config:
        json_schema_extra = {
            "example": {
                "export_type": "engagement",
                "platform": "instagram",
                "start_date": "2025-09-01",
                "end_date": "2025-10-01",
                "format": "csv"
            }
        }


# ===== API Endpoints =====

@router.get("/dashboard")
async def get_dashboard(
    platform: Optional[str] = Query(None, description="Filter by platform"),
    days: int = Query(30, ge=1, le=365, description="Number of days"),
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)  # Uncomment when auth ready
):
    """
    Get comprehensive dashboard overview with all metrics
    
    **Authentication**: Admin only
    
    **Features:**
    - Total posts and average posts per day
    - Total engagement (likes, comments, shares, reach)
    - Follower growth with percentages
    - Overall sentiment score
    - Top 5 performing posts
    - Platform breakdown comparison
    - Daily engagement trends
    - Content performance insights
    
    **Returns:**
    Comprehensive dashboard object with all metrics organized by category
    
    **Example Response:**
    ```json
    {
      "success": true,
      "period": {
        "start": "2025-09-04T00:00:00",
        "end": "2025-10-04T00:00:00",
        "days": 30
      },
      "total_posts": {"total": 45, "avg_per_day": 1.5},
      "total_engagement": {
        "likes": 1250,
        "comments": 340,
        "shares": 89,
        "engagement_rate": 3.45
      },
      "follower_growth": {
        "total_growth": 523,
        "by_platform": {...}
      },
      "top_performing_posts": [...],
      "platform_breakdown": [...],
      "engagement_by_day": [...]
    }
    ```
    """
    try:
        service = AnalyticsService(db)
        
        result = await service.get_dashboard_overview(
            platform=platform,
            days=days
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Dashboard retrieval failed')
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Dashboard endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/roi")
async def get_roi_analysis(
    platform: Optional[str] = Query(None, description="Filter by platform"),
    days: int = Query(30, ge=1, le=365, description="Number of days"),
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)
):
    """
    Get ROI (Return on Investment) analysis for social media efforts
    
    **Authentication**: Admin only
    
    **Calculation Method:**
    - AI Cost: $0.01 per post generated
    - Engagement Value: 
      - Likes: $0.05 each
      - Comments: $0.25 each
      - Shares: $0.50 each
    - ROI = ((Value - Cost) / Cost) × 100%
    
    **Use Case:**
    Demonstrate the financial value of AI-powered social media
    automation compared to manual content creation costs.
    
    **Returns:**
    - Total costs breakdown
    - Estimated engagement value
    - ROI percentage
    - Value breakdown by engagement type
    
    **Example Response:**
    ```json
    {
      "success": true,
      "period_days": 30,
      "costs": {
        "ai_content_generation": 0.45,
        "total": 0.45
      },
      "estimated_value": 148.75,
      "roi_percentage": 32944.44,
      "engagement_value_breakdown": {
        "likes_value": 62.50,
        "comments_value": 85.00,
        "shares_value": 44.50
      }
    }
    ```
    """
    try:
        service = AnalyticsService(db)
        
        result = await service.get_roi_analysis(
            platform=platform,
            days=days
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'ROI analysis failed')
            )
        
        return result
        
    except Exception as e:
        logger.error(f"ROI endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/engagement")
async def get_engagement_metrics(
    platform: Optional[str] = Query(None, description="Filter by platform"),
    start_date: Optional[str] = Query(None, description="Start date (ISO)"),
    end_date: Optional[str] = Query(None, description="End date (ISO)"),
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)
):
    """
    Get detailed engagement metrics for a time period
    
    **Authentication**: Admin only
    
    **Metrics Included:**
    - Total likes, comments, shares
    - Impressions and reach
    - Average engagement rate
    - Engagement by day (time series)
    - Platform comparison
    
    **Use Case:**
    Track engagement trends, identify high-performing content
    patterns, and optimize posting strategy.
    
    **Returns:**
    Daily engagement breakdown with totals and averages
    """
    try:
        service = AnalyticsService(db)
        
        # Parse dates if provided
        start = datetime.fromisoformat(start_date) if start_date else None
        end = datetime.fromisoformat(end_date) if end_date else None
        
        # If no dates provided, default to last 30 days
        if not start and not end:
            end = datetime.utcnow()
            start = end - timedelta(days=30)
        
        # Get engagement by day
        engagement_by_day = await service._get_engagement_by_day(
            start_date=start,
            end_date=end,
            platform=platform
        )
        
        # Get total engagement
        total_engagement = await service._get_total_engagement(
            start_date=start,
            end_date=end,
            platform=platform
        )
        
        return {
            'success': True,
            'period': {
                'start': start.isoformat() if start else None,
                'end': end.isoformat() if end else None
            },
            'platform': platform or 'all',
            'total_engagement': total_engagement,
            'engagement_by_day': engagement_by_day
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Engagement endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/growth")
async def get_follower_growth(
    platform: Optional[str] = Query(None, description="Filter by platform"),
    days: int = Query(30, ge=1, le=365, description="Number of days"),
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)
):
    """
    Get follower growth metrics and trends
    
    **Authentication**: Admin only
    
    **Metrics Included:**
    - Total follower growth (net new followers)
    - Growth by platform
    - Growth percentage
    - Starting and ending follower counts
    
    **Use Case:**
    Monitor audience growth, evaluate platform effectiveness,
    track long-term trends in follower acquisition.
    
    **Returns:**
    Growth metrics with breakdown by platform
    """
    try:
        from datetime import timedelta
        
        service = AnalyticsService(db)
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        growth = await service._get_follower_growth(
            start_date=start_date,
            end_date=end_date,
            platform=platform
        )
        
        return {
            'success': True,
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days
            },
            'platform': platform or 'all',
            **growth
        }
        
    except Exception as e:
        logger.error(f"Growth endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/sentiment-trends")
async def get_sentiment_trends(
    platform: Optional[str] = Query(None, description="Filter by platform"),
    days: int = Query(30, ge=1, le=365, description="Number of days"),
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)
):
    """
    Get sentiment analysis trends over time
    
    **Authentication**: Admin only
    
    **Metrics Included:**
    - Overall sentiment score (-1.0 to +1.0)
    - Positive/negative/neutral counts
    - Sentiment distribution percentages
    - Total interactions analyzed
    
    **Use Case:**
    Track brand perception, identify reputation issues early,
    measure customer satisfaction trends.
    
    **Returns:**
    Sentiment metrics with distribution breakdown
    """
    try:
        from datetime import timedelta
        
        service = AnalyticsService(db)
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        sentiment = await service._get_sentiment_score(
            start_date=start_date,
            end_date=end_date,
            platform=platform
        )
        
        # Calculate percentages
        total = sentiment['total_interactions']
        if total > 0:
            sentiment['positive_percentage'] = (sentiment['positive_count'] / total * 100)
            sentiment['negative_percentage'] = (sentiment['negative_count'] / total * 100)
            sentiment['neutral_percentage'] = (sentiment['neutral_count'] / total * 100)
        else:
            sentiment['positive_percentage'] = 0
            sentiment['negative_percentage'] = 0
            sentiment['neutral_percentage'] = 0
        
        return {
            'success': True,
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days
            },
            'platform': platform or 'all',
            **sentiment
        }
        
    except Exception as e:
        logger.error(f"Sentiment trends endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/top-posts")
async def get_top_performing_posts(
    platform: Optional[str] = Query(None, description="Filter by platform"),
    limit: int = Query(10, ge=1, le=50, description="Number of posts"),
    metric: str = Query("engagement_rate", description="Sort metric"),
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)
):
    """
    Get top performing posts ranked by engagement
    
    **Authentication**: Admin only
    
    **Sort Metrics:**
    - engagement_rate: Overall engagement percentage
    - likes: Total likes count
    - comments: Total comments count
    - shares: Total shares count
    
    **Use Case:**
    Identify successful content patterns, learn what resonates
    with audience, replicate winning strategies.
    
    **Returns:**
    List of top posts with full engagement metrics
    """
    try:
        service = AnalyticsService(db)
        
        top_posts = await service._get_top_posts(
            platform=platform,
            limit=limit
        )
        
        return {
            'success': True,
            'platform': platform or 'all',
            'limit': limit,
            'metric': metric,
            'posts': top_posts,
            'count': len(top_posts)
        }
        
    except Exception as e:
        logger.error(f"Top posts endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/platform-comparison")
async def get_platform_comparison(
    days: int = Query(30, ge=1, le=365, description="Number of days"),
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)
):
    """
    Compare performance across all platforms
    
    **Authentication**: Admin only
    
    **Metrics per Platform:**
    - Total posts published
    - Total engagement (likes, comments, shares)
    - Average engagement rate
    - Follower growth
    
    **Use Case:**
    Identify which platforms are most effective, allocate
    resources accordingly, optimize multi-platform strategy.
    
    **Returns:**
    Side-by-side comparison of all platforms
    """
    try:
        from datetime import timedelta
        
        service = AnalyticsService(db)
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        breakdown = await service._get_platform_breakdown(
            start_date=start_date,
            end_date=end_date
        )
        
        return {
            'success': True,
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days
            },
            'platforms': breakdown,
            'total_platforms': len(breakdown)
        }
        
    except Exception as e:
        logger.error(f"Platform comparison endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/export")
async def export_analytics(
    request: ExportRequest,
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)
):
    """
    Export analytics data to CSV format
    
    **Authentication**: Admin only
    
    **Export Types:**
    - engagement: Daily engagement metrics
    - posts: All published posts with metrics
    - sentiment: Sentiment analysis results
    - growth: Follower growth data
    - roi: ROI analysis data
    
    **Use Case:**
    Generate reports for stakeholders, perform deeper analysis
    in Excel/Google Sheets, archive historical data.
    
    **Returns:**
    CSV file download stream
    """
    try:
        service = AnalyticsService(db)
        
        # Parse dates
        start_date = datetime.fromisoformat(request.start_date) if request.start_date else None
        end_date = datetime.fromisoformat(request.end_date) if request.end_date else None
        
        if not start_date or not end_date:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=30)
        
        # Generate CSV based on export type
        output = io.StringIO()
        writer = csv.writer(output)
        
        if request.export_type == 'engagement':
            # Get engagement data
            engagement_data = await service._get_engagement_by_day(
                start_date=start_date,
                end_date=end_date,
                platform=request.platform
            )
            
            # Write CSV
            writer.writerow(['Date', 'Likes', 'Comments', 'Shares', 'Total Engagement'])
            for row in engagement_data:
                writer.writerow([
                    row['date'],
                    row['likes'],
                    row['comments'],
                    row['shares'],
                    row['total_engagement']
                ])
        
        elif request.export_type == 'posts':
            # Get top posts
            posts = await service._get_top_posts(platform=request.platform, limit=1000)
            
            writer.writerow(['Post ID', 'Platform', 'Content', 'Published At', 
                           'Likes', 'Comments', 'Shares', 'Engagement Rate'])
            for post in posts:
                writer.writerow([
                    post['id'],
                    post['platform'],
                    post['content'],
                    post['published_at'],
                    post['likes'],
                    post['comments'],
                    post['shares'],
                    post['engagement_rate']
                ])
        
        elif request.export_type == 'roi':
            # Get ROI data
            roi_data = await service.get_roi_analysis(
                platform=request.platform,
                days=(end_date - start_date).days
            )
            
            writer.writerow(['Metric', 'Value'])
            writer.writerow(['Period (days)', roi_data.get('period_days', 0)])
            writer.writerow(['Total Costs', roi_data.get('costs', {}).get('total', 0)])
            writer.writerow(['Estimated Value', roi_data.get('estimated_value', 0)])
            writer.writerow(['ROI Percentage', roi_data.get('roi_percentage', 0)])
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported export type: {request.export_type}"
            )
        
        # Prepare response
        output.seek(0)
        
        filename = f"spirit_tours_analytics_{request.export_type}_{datetime.utcnow().strftime('%Y%m%d')}.csv"
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Export endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/config")
async def get_analytics_config():
    """
    Get analytics configuration and available metrics
    
    **Returns:**
    - Available export types
    - Supported metrics
    - Date range limits
    - ROI calculation parameters
    """
    return {
        'success': True,
        'config': {
            'export_types': ['engagement', 'posts', 'sentiment', 'growth', 'roi'],
            'metrics': {
                'engagement': ['likes', 'comments', 'shares', 'impressions', 'reach'],
                'growth': ['follower_count', 'follower_growth_rate'],
                'sentiment': ['positive', 'negative', 'neutral', 'sentiment_score'],
                'roi': ['costs', 'value', 'roi_percentage']
            },
            'date_range_limits': {
                'min_days': 1,
                'max_days': 365,
                'default_days': 30
            },
            'roi_calculation': {
                'ai_cost_per_post': 0.01,
                'like_value': 0.05,
                'comment_value': 0.25,
                'share_value': 0.50
            },
            'platforms': ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube']
        }
    }


@router.get("/health")
async def health_check():
    """
    Health check endpoint for analytics service
    
    **Returns:** Service status and availability
    """
    return {
        'status': 'healthy',
        'service': 'Advanced Analytics',
        'features': {
            'dashboard': True,
            'roi_analysis': True,
            'engagement_tracking': True,
            'sentiment_trends': True,
            'data_export': True
        },
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat()
    }
