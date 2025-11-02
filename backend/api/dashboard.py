"""
Dashboard API

API endpoints for admin dashboard and analytics.
"""

from typing import Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database import get_db
from backend.analytics.analytics_service import analytics_service


router = APIRouter(prefix='/api/dashboard', tags=['dashboard'])


# Response Models
class DashboardOverviewResponse(BaseModel):
    """Dashboard overview response"""
    period: dict
    revenue: dict
    bookings: dict
    customers: dict
    performance: dict


@router.get('/overview')
async def get_dashboard_overview(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get dashboard overview with key metrics.
    
    Query Parameters:
    - start_date: Start date (YYYY-MM-DD)
    - end_date: End date (YYYY-MM-DD)
    
    Returns comprehensive dashboard metrics including:
    - Revenue metrics
    - Booking metrics
    - Customer metrics
    - Performance metrics
    """
    try:
        # Parse dates
        end_dt = date.fromisoformat(end_date) if end_date else date.today()
        start_dt = date.fromisoformat(start_date) if start_date else end_dt - timedelta(days=30)
        
        overview = await analytics_service.get_dashboard_overview(db, start_dt, end_dt)
        return overview
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/revenue')
async def get_revenue_metrics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get revenue metrics"""
    try:
        end_dt = date.fromisoformat(end_date) if end_date else date.today()
        start_dt = date.fromisoformat(start_date) if start_date else end_dt - timedelta(days=30)
        
        metrics = await analytics_service.get_revenue_metrics(db, start_dt, end_dt)
        return metrics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/bookings')
async def get_booking_metrics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get booking metrics"""
    try:
        end_dt = date.fromisoformat(end_date) if end_date else date.today()
        start_dt = date.fromisoformat(start_date) if start_date else end_dt - timedelta(days=30)
        
        metrics = await analytics_service.get_booking_metrics(db, start_dt, end_dt)
        return metrics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/customers')
async def get_customer_metrics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get customer metrics"""
    try:
        end_dt = date.fromisoformat(end_date) if end_date else date.today()
        start_dt = date.fromisoformat(start_date) if start_date else end_dt - timedelta(days=30)
        
        metrics = await analytics_service.get_customer_metrics(db, start_dt, end_dt)
        return metrics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/charts/revenue')
async def get_revenue_chart(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    granularity: str = Query(default='daily'),
    db: Session = Depends(get_db)
):
    """Get revenue chart data"""
    try:
        end_dt = date.fromisoformat(end_date) if end_date else date.today()
        start_dt = date.fromisoformat(start_date) if start_date else end_dt - timedelta(days=30)
        
        data = await analytics_service.get_revenue_chart_data(db, start_dt, end_dt, granularity)
        return {'data': data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/charts/bookings')
async def get_bookings_chart(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get bookings chart data"""
    try:
        end_dt = date.fromisoformat(end_date) if end_date else date.today()
        start_dt = date.fromisoformat(start_date) if start_date else end_dt - timedelta(days=30)
        
        data = await analytics_service.get_booking_chart_data(db, start_dt, end_dt)
        return {'data': data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/top-tours')
async def get_top_tours(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(default=10, le=50),
    db: Session = Depends(get_db)
):
    """Get top performing tours"""
    try:
        end_dt = date.fromisoformat(end_date) if end_date else date.today()
        start_dt = date.fromisoformat(start_date) if start_date else end_dt - timedelta(days=30)
        
        tours = await analytics_service.get_top_tours(db, start_dt, end_dt, limit)
        return {'tours': tours, 'total': len(tours)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/snapshot')
async def create_snapshot(
    snapshot_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Create dashboard snapshot"""
    try:
        snap_date = date.fromisoformat(snapshot_date) if snapshot_date else date.today()
        
        result = await analytics_service.create_dashboard_snapshot(db, snap_date)
        
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error'))
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/health')
async def dashboard_health_check():
    """Dashboard service health check"""
    return {
        'status': 'healthy',
        'service': 'dashboard',
        'features': {
            'revenue_analytics': True,
            'booking_analytics': True,
            'customer_analytics': True,
            'tour_performance': True,
            'snapshots': True
        }
    }
