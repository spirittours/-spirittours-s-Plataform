"""
Analytics API endpoints for real-time business intelligence
"""

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import asyncio
import json

from database import get_db
from auth import get_current_user
from services.analytics_service import AnalyticsService
from models import User


router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard")
async def get_dashboard_metrics(
    start_date: Optional[datetime] = Query(None, description="Start date for metrics"),
    end_date: Optional[datetime] = Query(None, description="End date for metrics"),
    business_model: Optional[str] = Query(None, description="Filter by business model (b2c/b2b/b2b2c)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive dashboard metrics
    """
    # Check permissions
    if current_user.role not in ['admin', 'operator', 'agency']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    analytics_service = AnalyticsService(db)
    
    try:
        metrics = await analytics_service.get_dashboard_metrics(
            start_date=start_date,
            end_date=end_date,
            business_model=business_model
        )
        
        return {
            "success": True,
            "data": metrics,
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/realtime")
async def get_realtime_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get real-time metrics for live dashboard
    """
    if current_user.role not in ['admin', 'operator']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    analytics_service = AnalyticsService(db)
    
    try:
        metrics = await analytics_service.get_realtime_metrics()
        return {
            "success": True,
            "data": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws/realtime")
async def websocket_realtime_metrics(
    websocket: WebSocket,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time metrics streaming
    """
    await websocket.accept()
    analytics_service = AnalyticsService(db)
    
    try:
        while True:
            # Send metrics every 5 seconds
            metrics = await analytics_service.get_realtime_metrics()
            await websocket.send_json(metrics)
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"error": str(e)})
        await websocket.close()


@router.get("/reports/{report_type}")
async def get_custom_report(
    report_type: str,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    group_by: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate custom reports
    
    Available report types:
    - revenue_by_operator: Revenue breakdown by tour operator
    - agent_performance: Sales agent performance metrics
    - tour_profitability: Tour profitability analysis
    - customer_acquisition: Customer acquisition funnel
    """
    if current_user.role not in ['admin', 'operator', 'agency']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    analytics_service = AnalyticsService(db)
    
    filters = {
        "start_date": start_date or datetime.utcnow() - timedelta(days=30),
        "end_date": end_date or datetime.utcnow()
    }
    
    try:
        report = await analytics_service.get_custom_report(
            report_type=report_type,
            filters=filters,
            group_by=group_by
        )
        
        return {
            "success": True,
            "report_type": report_type,
            "data": report,
            "filters": filters,
            "generated_at": datetime.utcnow().isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kpis")
async def get_key_performance_indicators(
    period: str = Query("month", description="Period for KPIs (day/week/month/quarter/year)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get key performance indicators (KPIs)
    """
    if current_user.role not in ['admin', 'operator']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Calculate period dates
    end_date = datetime.utcnow()
    if period == "day":
        start_date = end_date - timedelta(days=1)
    elif period == "week":
        start_date = end_date - timedelta(weeks=1)
    elif period == "month":
        start_date = end_date - timedelta(days=30)
    elif period == "quarter":
        start_date = end_date - timedelta(days=90)
    elif period == "year":
        start_date = end_date - timedelta(days=365)
    else:
        raise HTTPException(status_code=400, detail="Invalid period")
    
    analytics_service = AnalyticsService(db)
    
    try:
        # Get comprehensive metrics
        metrics = await analytics_service.get_dashboard_metrics(
            start_date=start_date,
            end_date=end_date
        )
        
        # Calculate KPIs
        kpis = {
            "financial": {
                "total_revenue": metrics["revenue"]["total_revenue"],
                "net_revenue": metrics["revenue"]["net_revenue"],
                "revenue_growth": metrics["revenue"]["revenue_growth_rate"],
                "average_order_value": metrics["overview"]["average_order_value"],
                "refund_rate": (metrics["revenue"]["total_refunds"] / 
                               max(metrics["revenue"]["total_revenue"], 1)) * 100
            },
            "operational": {
                "total_bookings": metrics["bookings"]["total_bookings"],
                "conversion_rate": metrics["overview"]["conversion_rate"],
                "cancellation_rate": metrics["bookings"]["cancellation_rate"],
                "active_users": metrics["overview"]["active_users"],
                "system_uptime": metrics["operational"]["system_uptime"]
            },
            "customer": {
                "new_customers": metrics["customers"]["new_customers"],
                "retention_rate": metrics["customers"]["retention_rate"],
                "customer_lifetime_value": metrics["customers"]["customer_lifetime_value"],
                "repeat_customers": metrics["customers"]["repeat_customers"]
            },
            "ai_performance": {
                "total_queries": metrics["ai_usage"]["total_queries"],
                "success_rate": metrics["ai_usage"]["success_rate"],
                "avg_response_time": metrics["ai_usage"]["average_response_time"]
            }
        }
        
        return {
            "success": True,
            "period": period,
            "kpis": kpis,
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends")
async def get_trend_analysis(
    metric: str = Query(..., description="Metric to analyze (revenue/bookings/users)"),
    period: int = Query(30, description="Number of days to analyze"),
    forecast_days: int = Query(7, description="Number of days to forecast"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get trend analysis and forecasting
    """
    if current_user.role not in ['admin', 'operator']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    analytics_service = AnalyticsService(db)
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=period)
    
    try:
        metrics = await analytics_service.get_dashboard_metrics(
            start_date=start_date,
            end_date=end_date
        )
        
        trend_data = {
            "historical": metrics["trends"],
            "forecast": metrics["trends"]["growth_forecast"],
            "seasonality": metrics["trends"]["seasonality_index"],
            "metric": metric,
            "period_analyzed": period,
            "forecast_period": forecast_days
        }
        
        return {
            "success": True,
            "data": trend_data,
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/{format}")
async def export_analytics(
    format: str,
    report_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export analytics data in various formats
    
    Supported formats: json, csv, excel
    """
    if current_user.role not in ['admin', 'operator']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    if format not in ['json', 'csv', 'excel']:
        raise HTTPException(status_code=400, detail="Invalid export format")
    
    analytics_service = AnalyticsService(db)
    
    try:
        # Get data based on report type
        if report_type:
            data = await analytics_service.get_custom_report(
                report_type=report_type,
                filters={
                    "start_date": start_date or datetime.utcnow() - timedelta(days=30),
                    "end_date": end_date or datetime.utcnow()
                }
            )
        else:
            data = await analytics_service.get_dashboard_metrics(
                start_date=start_date,
                end_date=end_date
            )
        
        # Format data based on export type
        if format == 'json':
            return {
                "success": True,
                "data": data,
                "export_format": "json",
                "generated_at": datetime.utcnow().isoformat()
            }
        elif format == 'csv':
            # Convert to CSV format (simplified for example)
            csv_data = "metric,value\n"
            for key, value in data.get("overview", {}).items():
                csv_data += f"{key},{value}\n"
            
            return {
                "success": True,
                "data": csv_data,
                "export_format": "csv",
                "generated_at": datetime.utcnow().isoformat()
            }
        elif format == 'excel':
            # For Excel, we'd typically use openpyxl or xlsxwriter
            # Returning structured data that can be converted to Excel
            return {
                "success": True,
                "data": data,
                "export_format": "excel",
                "note": "Excel export requires additional processing",
                "generated_at": datetime.utcnow().isoformat()
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/benchmarks")
async def get_industry_benchmarks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get industry benchmarks for comparison
    """
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Industry standard benchmarks for tourism
    benchmarks = {
        "conversion_rate": {
            "industry_average": 2.5,
            "top_performers": 5.0,
            "description": "Visitor to booking conversion rate (%)"
        },
        "cancellation_rate": {
            "industry_average": 15.0,
            "top_performers": 8.0,
            "description": "Booking cancellation rate (%)"
        },
        "customer_retention": {
            "industry_average": 25.0,
            "top_performers": 40.0,
            "description": "Customer retention rate (%)"
        },
        "average_order_value": {
            "industry_average": 850.0,
            "top_performers": 1500.0,
            "description": "Average booking value (USD)"
        },
        "customer_lifetime_value": {
            "industry_average": 2500.0,
            "top_performers": 5000.0,
            "description": "Customer lifetime value (USD)"
        },
        "ai_adoption": {
            "industry_average": 35.0,
            "top_performers": 75.0,
            "description": "AI feature utilization rate (%)"
        }
    }
    
    # Get current performance
    analytics_service = AnalyticsService(db)
    current_metrics = await analytics_service.get_dashboard_metrics(
        start_date=datetime.utcnow() - timedelta(days=30)
    )
    
    # Compare with benchmarks
    comparison = {}
    for metric, benchmark in benchmarks.items():
        current_value = 0
        if metric == "conversion_rate":
            current_value = current_metrics["overview"]["conversion_rate"]
        elif metric == "cancellation_rate":
            current_value = current_metrics["bookings"]["cancellation_rate"]
        elif metric == "customer_retention":
            current_value = current_metrics["customers"]["retention_rate"]
        elif metric == "average_order_value":
            current_value = current_metrics["overview"]["average_order_value"]
        elif metric == "customer_lifetime_value":
            current_value = current_metrics["customers"]["customer_lifetime_value"]
        
        comparison[metric] = {
            "current": current_value,
            "benchmark": benchmark,
            "performance": "above_average" if current_value > benchmark["industry_average"] else "below_average",
            "gap_to_average": current_value - benchmark["industry_average"],
            "gap_to_top": benchmark["top_performers"] - current_value
        }
    
    return {
        "success": True,
        "benchmarks": benchmarks,
        "comparison": comparison,
        "generated_at": datetime.utcnow().isoformat()
    }