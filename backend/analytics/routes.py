"""
Analytics API Routes
Handles all analytics and business intelligence endpoints
Provides metrics, dashboards, reports, and data export
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import logging
import csv
import json
import io

from .repository import AnalyticsRepository
from .models import (
    DateRangeRequest,
    OverviewMetrics,
    SalesAnalytics,
    TopToursResponse,
    UserGrowthResponse,
    UserEngagement,
    TourPerformance,
    BookingStats,
    RevenueBreakdown,
    ExportRequest,
    ExportFormat,
    PeriodEnum
)
from auth.jwt import get_current_user
from auth.models import User
from database.connection import get_db

# Configure logging
logger = logging.getLogger(__name__)

# Create router with prefix and tags
router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["📊 Analytics Dashboard"]
)


# ==================== UTILITY FUNCTIONS ====================

def _check_admin_role(current_user: User):
    """
    Check if user has admin privileges
    
    Args:
        current_user: Current authenticated user
        
    Raises:
        HTTPException: If user is not admin
    """
    if current_user.role != "admin":
        logger.warning(f"⚠️ Non-admin user {current_user.id} attempted to access analytics")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required for analytics"
        )


def _parse_date_range(start_date: Optional[datetime], end_date: Optional[datetime]):
    """
    Parse and validate date range
    
    Args:
        start_date: Start date
        end_date: End date
        
    Returns:
        Tuple of (start_date, end_date)
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="Start date must be before end date"
        )
    
    return start_date, end_date


# ==================== OVERVIEW METRICS ====================

@router.get("/overview", response_model=OverviewMetrics)
async def get_overview_metrics(
    start_date: Optional[datetime] = Query(None, description="Start date for filtering"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get high-level overview metrics for dashboard
    
    - **Protected endpoint** - Requires admin authentication
    - Returns KPIs: total users, bookings, revenue, reviews
    - Default period: Last 30 days
    - Includes period-over-period comparison
    
    **Example Response:**
    ```json
    {
        "users": {"total": 1250, "new": 145},
        "bookings": {"total": 523, "in_period": 67},
        "revenue": {"total": 125430.50, "in_period": 18920.00, "currency": "USD"},
        "reviews": {"total": 342, "average_rating": 4.7},
        "period": {"start": "2024-01-01", "end": "2024-01-31"}
    }
    ```
    """
    try:
        _check_admin_role(current_user)
        
        start_date, end_date = _parse_date_range(start_date, end_date)
        
        metrics = AnalyticsRepository.get_overview_metrics(
            db=db,
            start_date=start_date,
            end_date=end_date
        )
        
        logger.info(f"📊 Overview metrics retrieved by admin {current_user.id}")
        
        return OverviewMetrics(**metrics)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching overview metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch overview metrics")


# ==================== SALES ANALYTICS ====================

@router.get("/sales", response_model=SalesAnalytics)
async def get_sales_analytics(
    start_date: datetime = Query(..., description="Start date"),
    end_date: datetime = Query(..., description="End date"),
    group_by: PeriodEnum = Query(PeriodEnum.day, description="Group by period (day/week/month)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get sales analytics grouped by time period
    
    - **Protected endpoint** - Requires admin authentication
    - Returns sales data with count and revenue per period
    - Includes summary statistics
    - Supports daily, weekly, or monthly grouping
    
    **Example Response:**
    ```json
    {
        "data": [
            {"period": "2024-01-15", "count": 12, "total": 3580.00}
        ],
        "summary": {
            "total_sales": 45230.00,
            "average_sale": 289.50,
            "total_count": 156
        }
    }
    ```
    """
    try:
        _check_admin_role(current_user)
        
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
        
        data = AnalyticsRepository.get_sales_by_period(
            db=db,
            start_date=start_date,
            end_date=end_date,
            group_by=group_by.value
        )
        
        # Calculate summary
        total_sales = sum(point['total'] for point in data)
        total_count = sum(point['count'] for point in data)
        average_sale = total_sales / total_count if total_count > 0 else 0
        
        summary = {
            "total_sales": round(total_sales, 2),
            "average_sale": round(average_sale, 2),
            "total_count": total_count
        }
        
        logger.info(f"📈 Sales analytics retrieved by admin {current_user.id}")
        
        return SalesAnalytics(data=data, summary=summary)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching sales analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch sales analytics")


# ==================== TOP SELLING TOURS ====================

@router.get("/tours/top", response_model=TopToursResponse)
async def get_top_selling_tours(
    limit: int = Query(10, ge=1, le=50, description="Number of top tours to return"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get top selling tours by booking count
    
    - **Protected endpoint** - Requires admin authentication
    - Returns top N tours with booking count and revenue
    - Optional date filtering
    - Sorted by booking count (descending)
    
    **Example Response:**
    ```json
    {
        "tours": [
            {
                "tour_id": "TOUR-001",
                "tour_name": "Machu Picchu Adventure",
                "price": 599.99,
                "booking_count": 45,
                "revenue": 26999.55
            }
        ],
        "total_revenue": 125430.50
    }
    ```
    """
    try:
        _check_admin_role(current_user)
        
        tours = AnalyticsRepository.get_top_selling_tours(
            db=db,
            limit=limit,
            start_date=start_date
        )
        
        total_revenue = sum(tour['revenue'] for tour in tours)
        
        logger.info(f"🏆 Top tours retrieved by admin {current_user.id}")
        
        return TopToursResponse(tours=tours, total_revenue=total_revenue)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching top tours: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch top tours")


# ==================== USER GROWTH ====================

@router.get("/users/growth", response_model=UserGrowthResponse)
async def get_user_growth(
    start_date: datetime = Query(..., description="Start date"),
    end_date: datetime = Query(..., description="End date"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user growth analytics over time
    
    - **Protected endpoint** - Requires admin authentication
    - Returns daily new user count and cumulative total
    - Includes growth summary statistics
    - Ideal for growth charts
    
    **Example Response:**
    ```json
    {
        "data": [
            {"date": "2024-01-15", "new_users": 8, "total_users": 1258}
        ],
        "summary": {
            "start_count": 1200,
            "end_count": 1350,
            "net_growth": 150,
            "growth_rate": 12.5
        }
    }
    ```
    """
    try:
        _check_admin_role(current_user)
        
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
        
        data = AnalyticsRepository.get_user_growth(
            db=db,
            start_date=start_date,
            end_date=end_date
        )
        
        # Calculate summary
        start_count = data[0]['total_users'] - data[0]['new_users'] if data else 0
        end_count = data[-1]['total_users'] if data else 0
        net_growth = end_count - start_count
        growth_rate = (net_growth / start_count * 100) if start_count > 0 else 0
        
        summary = {
            "start_count": start_count,
            "end_count": end_count,
            "net_growth": net_growth,
            "growth_rate": round(growth_rate, 2)
        }
        
        logger.info(f"📈 User growth retrieved by admin {current_user.id}")
        
        return UserGrowthResponse(data=data, summary=summary)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching user growth: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user growth")


# ==================== USER ENGAGEMENT ====================

@router.get("/users/engagement", response_model=UserEngagement)
async def get_user_engagement(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user engagement metrics
    
    - **Protected endpoint** - Requires admin authentication
    - Returns user activity statistics
    - Includes engagement rate calculation
    - Shows average bookings per user
    
    **Example Response:**
    ```json
    {
        "total_users": 1250,
        "users_with_bookings": 523,
        "users_with_reviews": 342,
        "engagement_rate": 41.84,
        "avg_bookings_per_user": 1.8
    }
    ```
    """
    try:
        _check_admin_role(current_user)
        
        metrics = AnalyticsRepository.get_user_engagement(db)
        
        logger.info(f"👥 User engagement retrieved by admin {current_user.id}")
        
        return UserEngagement(**metrics)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching user engagement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user engagement")


# ==================== TOUR PERFORMANCE ====================

@router.get("/tours/{tour_id}/performance", response_model=TourPerformance)
async def get_tour_performance(
    tour_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed performance metrics for a specific tour
    
    - **Protected endpoint** - Requires admin authentication
    - Returns comprehensive tour statistics
    - Includes bookings, revenue, and review metrics
    - Useful for tour optimization decisions
    
    **Example Response:**
    ```json
    {
        "tour_id": "TOUR-001",
        "tour_name": "Machu Picchu Adventure",
        "bookings": {"total": 45, "confirmed": 42},
        "revenue": {"total": 26999.55, "currency": "USD"},
        "reviews": {"count": 38, "average_rating": 4.8}
    }
    ```
    """
    try:
        _check_admin_role(current_user)
        
        performance = AnalyticsRepository.get_tour_performance(db, tour_id)
        
        if not performance:
            raise HTTPException(status_code=404, detail="Tour not found")
        
        logger.info(f"🎯 Tour performance for {tour_id} retrieved by admin {current_user.id}")
        
        return TourPerformance(**performance)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching tour performance: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch tour performance")


# ==================== BOOKING STATISTICS ====================

@router.get("/bookings/stats", response_model=BookingStats)
async def get_booking_stats(
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get booking statistics and conversion metrics
    
    - **Protected endpoint** - Requires admin authentication
    - Returns booking status breakdown
    - Includes average booking value and participants
    - Calculates conversion rate
    
    **Example Response:**
    ```json
    {
        "status_breakdown": {
            "pending": 12,
            "confirmed": 523,
            "cancelled": 34,
            "completed": 489
        },
        "average_value": 389.50,
        "average_participants": 2.3,
        "conversion_rate": 92.4
    }
    ```
    """
    try:
        _check_admin_role(current_user)
        
        start_date, end_date = _parse_date_range(start_date, end_date)
        
        stats = AnalyticsRepository.get_booking_stats(
            db=db,
            start_date=start_date,
            end_date=end_date
        )
        
        logger.info(f"📊 Booking stats retrieved by admin {current_user.id}")
        
        return BookingStats(**stats)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching booking stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch booking stats")


# ==================== REVENUE BREAKDOWN ====================

@router.get("/revenue/breakdown", response_model=RevenueBreakdown)
async def get_revenue_breakdown(
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed revenue breakdown
    
    - **Protected endpoint** - Requires admin authentication
    - Returns revenue by currency
    - Includes payment method distribution
    - Optional date range filtering
    
    **Example Response:**
    ```json
    {
        "total_revenue": 125430.50,
        "by_currency": {"USD": 125430.50, "EUR": 0},
        "payment_methods": {"card": 456, "paypal": 67}
    }
    ```
    """
    try:
        _check_admin_role(current_user)
        
        start_date, end_date = _parse_date_range(start_date, end_date)
        
        breakdown = AnalyticsRepository.get_revenue_breakdown(
            db=db,
            start_date=start_date,
            end_date=end_date
        )
        
        logger.info(f"💰 Revenue breakdown retrieved by admin {current_user.id}")
        
        return RevenueBreakdown(**breakdown)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching revenue breakdown: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch revenue breakdown")


# ==================== DATA EXPORT ====================

@router.post("/export")
async def export_analytics_data(
    export_request: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export analytics data in various formats
    
    - **Protected endpoint** - Requires admin authentication
    - Supports CSV, Excel, and JSON formats
    - Allows filtering by date range
    - Available report types: overview, sales, users, tours, bookings, revenue
    
    **Example Request:**
    ```json
    {
        "report_type": "sales",
        "format": "csv",
        "start_date": "2024-01-01T00:00:00",
        "end_date": "2024-01-31T23:59:59"
    }
    ```
    
    **Returns:** File download with appropriate content-type
    """
    try:
        _check_admin_role(current_user)
        
        start_date, end_date = _parse_date_range(
            export_request.start_date,
            export_request.end_date
        )
        
        # Get data based on report type
        data = None
        report_name = export_request.report_type
        
        if report_name == "overview":
            data = AnalyticsRepository.get_overview_metrics(db, start_date, end_date)
        elif report_name == "sales":
            data = AnalyticsRepository.get_sales_by_period(
                db, start_date, end_date, group_by="day"
            )
        elif report_name == "users":
            data = AnalyticsRepository.get_user_growth(db, start_date, end_date)
        elif report_name == "tours":
            data = AnalyticsRepository.get_top_selling_tours(db, limit=50)
        elif report_name == "bookings":
            data = AnalyticsRepository.get_booking_stats(db, start_date, end_date)
        elif report_name == "revenue":
            data = AnalyticsRepository.get_revenue_breakdown(db, start_date, end_date)
        else:
            raise HTTPException(status_code=400, detail=f"Invalid report type: {report_name}")
        
        # Export based on format
        if export_request.format == ExportFormat.json:
            # JSON export
            json_data = json.dumps(data, indent=2, default=str)
            response = StreamingResponse(
                io.StringIO(json_data),
                media_type="application/json"
            )
            response.headers["Content-Disposition"] = f"attachment; filename={report_name}_export.json"
            
        elif export_request.format == ExportFormat.csv:
            # CSV export
            output = io.StringIO()
            
            if isinstance(data, list) and data:
                # List of dictionaries
                writer = csv.DictWriter(output, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
            elif isinstance(data, dict):
                # Single dictionary - flatten it
                writer = csv.writer(output)
                for key, value in data.items():
                    if isinstance(value, dict):
                        for sub_key, sub_value in value.items():
                            writer.writerow([f"{key}.{sub_key}", sub_value])
                    else:
                        writer.writerow([key, value])
            
            response = StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv"
            )
            response.headers["Content-Disposition"] = f"attachment; filename={report_name}_export.csv"
            
        elif export_request.format == ExportFormat.excel:
            # Excel export (simplified - would need openpyxl for real Excel)
            # For now, return CSV with xlsx extension
            output = io.StringIO()
            
            if isinstance(data, list) and data:
                writer = csv.DictWriter(output, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
            
            response = StreamingResponse(
                iter([output.getvalue()]),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            response.headers["Content-Disposition"] = f"attachment; filename={report_name}_export.xlsx"
        
        logger.info(f"📤 Analytics data exported by admin {current_user.id}: {report_name} ({export_request.format})")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error exporting analytics data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to export analytics data")


# ==================== HEALTH CHECK ====================

@router.get("/health")
async def analytics_health_check():
    """
    Health check endpoint for analytics module
    
    - **Public endpoint** - No authentication required
    - Returns system status
    - Useful for monitoring and alerts
    
    **Example Response:**
    ```json
    {
        "status": "healthy",
        "module": "analytics",
        "version": "1.0.0"
    }
    ```
    """
    return {
        "status": "healthy",
        "module": "analytics",
        "version": "1.0.0",
        "endpoints": {
            "overview": "/api/v1/analytics/overview",
            "sales": "/api/v1/analytics/sales",
            "top_tours": "/api/v1/analytics/tours/top",
            "user_growth": "/api/v1/analytics/users/growth",
            "engagement": "/api/v1/analytics/users/engagement",
            "tour_performance": "/api/v1/analytics/tours/{tour_id}/performance",
            "booking_stats": "/api/v1/analytics/bookings/stats",
            "revenue": "/api/v1/analytics/revenue/breakdown",
            "export": "/api/v1/analytics/export"
        }
    }


# Export router
__all__ = ['router']
