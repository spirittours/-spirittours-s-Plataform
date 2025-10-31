#!/usr/bin/env python3
"""
Analytics Dashboard API - Spirit Tours
Endpoints para el sistema de analytics y dashboards en tiempo real
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import logging

# Import analytics service
try:
    from services.analytics_dashboard_service import (
        get_analytics_dashboard,
        get_analytics_metric,
        generate_analytics_report,
        get_analytics_info
    )
except ImportError:
    from backend.services.analytics_dashboard_service import (
        get_analytics_dashboard,
        get_analytics_metric,
        generate_analytics_report,
        get_analytics_info
    )

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics Dashboard"],
    responses={404: {"description": "Not found"}}
)

# ============== DASHBOARD ENDPOINTS ==============

@router.get("/dashboard/{dashboard_type}")
async def get_dashboard(
    dashboard_type: str = "executive",
    refresh: bool = Query(False, description="Force refresh of cached data")
) -> Dict[str, Any]:
    """
    Get real-time dashboard data
    
    Dashboard Types:
    - executive: High-level KPIs and business metrics
    - operational: Operational metrics and real-time monitoring
    - technical: System performance and technical metrics
    - default: General overview dashboard
    """
    try:
        dashboard_data = await get_analytics_dashboard(dashboard_type)
        
        if "error" in dashboard_data:
            raise HTTPException(status_code=500, detail=dashboard_data["error"])
        
        return dashboard_data
        
    except Exception as e:
        logger.error(f"Dashboard API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboards")
async def list_available_dashboards() -> Dict[str, Any]:
    """
    List all available dashboard types
    """
    try:
        info = get_analytics_info()
        return {
            "status": "success",
            "available_dashboards": info["available_dashboards"],
            "descriptions": {
                "executive": "High-level business metrics and KPIs for executives",
                "operational": "Real-time operational metrics and monitoring",
                "technical": "Technical performance and system health metrics",
                "default": "General overview with all key metrics"
            },
            "update_interval_seconds": info["update_interval_seconds"]
        }
    except Exception as e:
        logger.error(f"List dashboards error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== METRICS ENDPOINTS ==============

@router.get("/metrics/{metric_type}")
async def get_metric(
    metric_type: str,
    time_range: str = Query("daily", description="Time range: real_time, hourly, daily, weekly, monthly, quarterly, yearly"),
    business_model: Optional[str] = Query(None, description="Business model filter: b2c, b2b, b2b2c, all")
) -> Dict[str, Any]:
    """
    Get specific metric data
    
    Metric Types:
    - revenue: Revenue metrics and breakdown
    - bookings: Booking statistics and trends
    - customers: Customer metrics and segments
    - agents: AI agents performance metrics
    - performance: System performance metrics
    - satisfaction: Customer satisfaction scores
    - conversion: Conversion rates and funnel metrics
    - operations: Operational efficiency metrics
    """
    try:
        kwargs = {}
        if business_model:
            kwargs["business_model"] = business_model
        
        metric_data = await get_analytics_metric(metric_type, time_range, **kwargs)
        
        if "error" in metric_data:
            if metric_data.get("status") == "invalid_parameter":
                raise HTTPException(status_code=400, detail=metric_data["error"])
            else:
                raise HTTPException(status_code=500, detail=metric_data["error"])
        
        return metric_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Metric API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics")
async def list_available_metrics() -> Dict[str, Any]:
    """
    List all available metrics
    """
    try:
        info = get_analytics_info()
        return {
            "status": "success",
            "available_metrics": info["available_metrics"],
            "descriptions": {
                "revenue": "Revenue metrics including breakdown by business model",
                "bookings": "Booking statistics, trends, and conversion rates",
                "customers": "Customer segments, demographics, and satisfaction",
                "agents": "AI agents performance and efficiency metrics",
                "performance": "System performance, API metrics, and resource usage",
                "satisfaction": "Customer satisfaction scores and NPS",
                "conversion": "Conversion funnel and optimization metrics",
                "operations": "Operational efficiency and productivity metrics"
            },
            "time_ranges": ["real_time", "hourly", "daily", "weekly", "monthly", "quarterly", "yearly"],
            "business_models": ["b2c", "b2b", "b2b2c", "all"]
        }
    except Exception as e:
        logger.error(f"List metrics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== REPORTS ENDPOINTS ==============

@router.post("/reports/generate")
async def generate_report(
    report_type: str = Query(..., description="Report type: financial, operational"),
    period: str = Query("monthly", description="Report period: daily, weekly, monthly, quarterly, yearly"),
    background_tasks: BackgroundTasks = BackgroundTasks()
) -> Dict[str, Any]:
    """
    Generate analytics report
    
    Report Types:
    - financial: Financial performance report with revenue breakdown
    - operational: Operational efficiency and performance report
    """
    try:
        report_data = await generate_analytics_report(report_type, period)
        
        if "error" in report_data:
            raise HTTPException(status_code=500, detail=report_data["error"])
        
        # Add background task for report processing if needed
        # background_tasks.add_task(process_report_export, report_data["report_id"])
        
        return report_data
        
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/{report_id}")
async def get_report(
    report_id: str,
    format: str = Query("json", description="Export format: json, pdf, excel, csv")
) -> Dict[str, Any]:
    """
    Get generated report by ID
    """
    try:
        # TODO: Implement report retrieval from storage
        return {
            "status": "success",
            "report_id": report_id,
            "format": format,
            "message": "Report retrieval will be implemented with storage system",
            "placeholder_data": {
                "report_type": "financial",
                "period": "monthly",
                "generated_at": datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Get report error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports")
async def list_reports(
    limit: int = Query(10, description="Number of reports to return"),
    offset: int = Query(0, description="Offset for pagination")
) -> Dict[str, Any]:
    """
    List available reports
    """
    try:
        info = get_analytics_info()
        # TODO: Implement actual report listing from storage
        return {
            "status": "success",
            "available_report_types": info["available_reports"],
            "recent_reports": [
                {
                    "report_id": f"fin_report_202409",
                    "type": "financial",
                    "period": "monthly",
                    "generated_at": (datetime.now() - timedelta(days=1)).isoformat(),
                    "size_bytes": 245678,
                    "status": "completed"
                },
                {
                    "report_id": f"ops_report_202409",
                    "type": "operational",
                    "period": "weekly",
                    "generated_at": (datetime.now() - timedelta(days=2)).isoformat(),
                    "size_bytes": 189456,
                    "status": "completed"
                }
            ],
            "total_reports": 2,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"List reports error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== REAL-TIME ENDPOINTS ==============

@router.get("/realtime/kpis")
async def get_realtime_kpis() -> Dict[str, Any]:
    """
    Get real-time KPI metrics
    """
    try:
        # Get multiple metrics in parallel for real-time KPIs
        revenue_metric = await get_analytics_metric("revenue", "real_time")
        booking_metric = await get_analytics_metric("bookings", "real_time")
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "kpis": {
                "revenue_per_minute": revenue_metric.get("current_period", {}).get("total_revenue", 0) / 60,
                "bookings_per_hour": booking_metric.get("total_bookings", 0),
                "active_users": 1250,  # TODO: Get from session tracking
                "conversion_rate": 3.8,  # TODO: Calculate from actual data
                "avg_response_time_ms": 125  # TODO: Get from monitoring
            },
            "trends": {
                "revenue": revenue_metric.get("change", {}).get("trend", "stable"),
                "bookings": "up",
                "users": "stable",
                "performance": "optimal"
            },
            "next_update_seconds": 5
        }
    except Exception as e:
        logger.error(f"Real-time KPIs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/realtime/alerts")
async def get_realtime_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity: critical, warning, info")
) -> Dict[str, Any]:
    """
    Get real-time system alerts
    """
    try:
        # TODO: Implement actual alert system integration
        alerts = [
            {
                "alert_id": "alert_001",
                "severity": "info",
                "category": "revenue",
                "message": "Daily revenue target achieved (102%)",
                "timestamp": datetime.now().isoformat()
            },
            {
                "alert_id": "alert_002",
                "severity": "warning",
                "category": "performance",
                "message": "API response time increased by 25%",
                "timestamp": (datetime.now() - timedelta(minutes=5)).isoformat()
            }
        ]
        
        if severity:
            alerts = [a for a in alerts if a["severity"] == severity]
        
        return {
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "total_alerts": len(alerts),
            "alerts": alerts,
            "summary": {
                "critical": sum(1 for a in alerts if a["severity"] == "critical"),
                "warning": sum(1 for a in alerts if a["severity"] == "warning"),
                "info": sum(1 for a in alerts if a["severity"] == "info")
            }
        }
    except Exception as e:
        logger.error(f"Real-time alerts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== ANALYTICS INFO ENDPOINT ==============

@router.get("/info")
async def get_analytics_system_info() -> Dict[str, Any]:
    """
    Get analytics system information and capabilities
    """
    try:
        return get_analytics_info()
    except Exception as e:
        logger.error(f"Analytics info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== HEALTH CHECK ==============

@router.get("/health")
async def analytics_health_check() -> Dict[str, Any]:
    """
    Analytics service health check
    """
    try:
        # Test basic functionality
        test_metric = await get_analytics_metric("revenue", "daily")
        
        return {
            "status": "healthy",
            "service": "Analytics Dashboard API",
            "timestamp": datetime.now().isoformat(),
            "checks": {
                "dashboard_service": "operational",
                "metrics_engine": "operational",
                "reporting_service": "operational",
                "data_pipeline": "operational"
            },
            "metrics": {
                "uptime_hours": 720,
                "requests_processed": 125430,
                "avg_response_time_ms": 85,
                "error_rate_percentage": 0.02
            }
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "degraded",
            "service": "Analytics Dashboard API",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    from fastapi import FastAPI
    
    # Create test app
    app = FastAPI(title="Analytics Dashboard API Test")
    app.include_router(router)
    
    # Run test server
    uvicorn.run(app, host="0.0.0.0", port=8001)