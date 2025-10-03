"""
Monitoring API Endpoints for Spirit Tours System
Provides REST API endpoints for accessing monitoring data, metrics, and analytics.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime, timedelta
from ..services.monitoring_service import (
    get_monitoring_service, 
    AdvancedMonitoringService, 
    ServiceMetric, 
    MetricType
)
from ..core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1/monitoring", tags=["monitoring"])

@router.get("/health/dashboard")
async def get_health_dashboard():
    """
    Get comprehensive system health dashboard
    
    Returns:
        - Current system performance metrics
        - External service health status
        - Performance trends
        - Recent alerts
    """
    try:
        monitoring_service = await get_monitoring_service()
        dashboard = await monitoring_service.get_system_health_dashboard()
        return JSONResponse(content=dashboard)
    
    except Exception as e:
        logger.error(f"Error getting health dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get health dashboard: {str(e)}")

@router.get("/health/services")
async def get_services_health():
    """
    Get health status of all external services
    
    Returns:
        - Service status (healthy/degraded/unhealthy)
        - Response times
        - Error rates
        - Uptime percentages
    """
    try:
        monitoring_service = await get_monitoring_service()
        dashboard = await monitoring_service.get_system_health_dashboard()
        
        return JSONResponse(content={
            "services": dashboard.get("service_health", {}),
            "summary": {
                "total_services": len(dashboard.get("service_health", {})),
                "healthy_services": len([
                    s for s in dashboard.get("service_health", {}).values()
                    if s.get("status") == "healthy"
                ]),
                "degraded_services": len([
                    s for s in dashboard.get("service_health", {}).values()
                    if s.get("status") == "degraded"
                ]),
                "unhealthy_services": len([
                    s for s in dashboard.get("service_health", {}).values()
                    if s.get("status") == "unhealthy"
                ])
            },
            "last_updated": dashboard.get("last_updated")
        })
    
    except Exception as e:
        logger.error(f"Error getting services health: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get services health: {str(e)}")

@router.get("/analytics/calls")
async def get_call_analytics():
    """
    Get call analytics dashboard
    
    Returns:
        - Total calls, success/failure rates
        - Call duration statistics
        - Geographic distribution
        - Sentiment analysis results
        - Appointment requests and follow-ups
    """
    try:
        monitoring_service = await get_monitoring_service()
        analytics = await monitoring_service.get_call_analytics_dashboard()
        
        if not analytics:
            return JSONResponse(content={
                "message": "No call analytics data available",
                "data": None
            })
        
        return JSONResponse(content={
            "analytics": analytics,
            "last_updated": datetime.utcnow().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error getting call analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get call analytics: {str(e)}")

@router.get("/analytics/scheduling")
async def get_scheduling_analytics():
    """
    Get scheduling system analytics
    
    Returns:
        - Total appointments scheduled
        - Success/failure rates
        - Timezone distribution
        - Appointment types breakdown
        - Performance metrics
    """
    try:
        monitoring_service = await get_monitoring_service()
        analytics = await monitoring_service.get_scheduling_analytics_dashboard()
        
        if not analytics:
            return JSONResponse(content={
                "message": "No scheduling analytics data available",
                "data": None
            })
        
        return JSONResponse(content={
            "analytics": analytics,
            "last_updated": datetime.utcnow().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error getting scheduling analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get scheduling analytics: {str(e)}")

@router.get("/performance/current")
async def get_current_performance():
    """
    Get current system performance metrics
    
    Returns:
        - CPU, Memory, Disk usage
        - Network I/O statistics
        - Database connection pool status
        - Active sessions count
        - API response times
    """
    try:
        monitoring_service = await get_monitoring_service()
        dashboard = await monitoring_service.get_system_health_dashboard()
        
        performance = dashboard.get("current_performance", {})
        trends = dashboard.get("trends", {})
        
        return JSONResponse(content={
            "current": performance,
            "trends": trends,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error getting current performance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get current performance: {str(e)}")

@router.get("/alerts/recent")
async def get_recent_alerts(
    limit: int = Query(10, ge=1, le=100, description="Number of recent alerts to return")
):
    """
    Get recent system alerts
    
    Parameters:
        - limit: Number of alerts to return (1-100)
    
    Returns:
        - Recent alerts with severity levels
        - Alert timestamps and messages
        - Affected metrics and values
    """
    try:
        monitoring_service = await get_monitoring_service()
        dashboard = await monitoring_service.get_system_health_dashboard()
        
        alerts = dashboard.get("alerts", [])[:limit]
        
        # Count alerts by severity
        alert_counts = {
            "critical": len([a for a in alerts if a.get("type") == "critical"]),
            "warning": len([a for a in alerts if a.get("type") == "warning"]),
            "info": len([a for a in alerts if a.get("type") == "info"])
        }
        
        return JSONResponse(content={
            "alerts": alerts,
            "summary": {
                "total_alerts": len(alerts),
                "alert_counts": alert_counts
            },
            "last_updated": datetime.utcnow().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error getting recent alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get recent alerts: {str(e)}")

@router.post("/metrics/custom")
async def record_custom_metric(
    name: str,
    value: float,
    metric_type: str = "gauge",
    labels: Optional[Dict[str, str]] = None,
    description: Optional[str] = None
):
    """
    Record a custom metric
    
    Parameters:
        - name: Metric name
        - value: Metric value
        - metric_type: Type of metric (counter, gauge, histogram, timer)
        - labels: Optional labels for the metric
        - description: Optional description
    """
    try:
        # Validate metric type
        valid_types = ["counter", "gauge", "histogram", "timer"]
        if metric_type not in valid_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid metric type. Must be one of: {valid_types}"
            )
        
        monitoring_service = await get_monitoring_service()
        
        metric = ServiceMetric(
            name=name,
            value=value,
            metric_type=MetricType(metric_type.upper()),
            timestamp=datetime.utcnow(),
            labels=labels or {},
            description=description
        )
        
        await monitoring_service.record_custom_metric(metric)
        
        return JSONResponse(content={
            "message": "Custom metric recorded successfully",
            "metric": {
                "name": name,
                "value": value,
                "type": metric_type,
                "timestamp": metric.timestamp.isoformat()
            }
        })
    
    except Exception as e:
        logger.error(f"Error recording custom metric: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to record custom metric: {str(e)}")

@router.get("/metrics/custom/{metric_name}")
async def get_custom_metrics(
    metric_name: str,
    limit: int = Query(100, ge=1, le=1000, description="Number of metric points to return")
):
    """
    Get custom metrics by name
    
    Parameters:
        - metric_name: Name of the metric to retrieve
        - limit: Number of metric points to return (1-1000)
    
    Returns:
        - List of metric points with timestamps and values
        - Metric metadata
    """
    try:
        monitoring_service = await get_monitoring_service()
        metrics = await monitoring_service.get_custom_metrics(metric_name, limit)
        
        if not metrics:
            return JSONResponse(content={
                "message": f"No metrics found for '{metric_name}'",
                "metrics": []
            })
        
        # Convert metrics to dict format
        metrics_data = []
        for metric in metrics:
            metrics_data.append({
                "name": metric.name,
                "value": metric.value,
                "type": metric.metric_type.value if hasattr(metric.metric_type, 'value') else str(metric.metric_type),
                "timestamp": metric.timestamp.isoformat() if hasattr(metric.timestamp, 'isoformat') else str(metric.timestamp),
                "labels": metric.labels,
                "description": metric.description
            })
        
        return JSONResponse(content={
            "metric_name": metric_name,
            "metrics": metrics_data,
            "total_points": len(metrics_data),
            "last_updated": datetime.utcnow().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error getting custom metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get custom metrics: {str(e)}")

@router.get("/summary")
async def get_monitoring_summary():
    """
    Get comprehensive monitoring summary
    
    Returns:
        - System health overview
        - Service status summary
        - Key performance indicators
        - Alert counts by severity
        - Recent trends
    """
    try:
        monitoring_service = await get_monitoring_service()
        dashboard = await monitoring_service.get_system_health_dashboard()
        call_analytics = await monitoring_service.get_call_analytics_dashboard()
        scheduling_analytics = await monitoring_service.get_scheduling_analytics_dashboard()
        
        # Extract key metrics
        performance = dashboard.get("current_performance", {})
        services = dashboard.get("service_health", {})
        alerts = dashboard.get("alerts", [])
        
        # Calculate overall system health score
        healthy_services = len([s for s in services.values() if s.get("status") == "healthy"])
        total_services = len(services)
        service_health_score = (healthy_services / max(total_services, 1)) * 100
        
        # System performance score
        cpu_usage = performance.get("cpu_usage", 0)
        memory_usage = performance.get("memory_usage", 0)
        disk_usage = performance.get("disk_usage", 0)
        
        performance_score = 100 - (cpu_usage * 0.4 + memory_usage * 0.4 + disk_usage * 0.2)
        performance_score = max(0, min(100, performance_score))
        
        # Overall health score
        overall_health_score = (service_health_score * 0.6 + performance_score * 0.4)
        
        # Health status
        if overall_health_score >= 90:
            health_status = "excellent"
        elif overall_health_score >= 75:
            health_status = "good"
        elif overall_health_score >= 60:
            health_status = "fair"
        else:
            health_status = "poor"
        
        summary = {
            "overall_health": {
                "status": health_status,
                "score": round(overall_health_score, 1),
                "service_health_score": round(service_health_score, 1),
                "performance_score": round(performance_score, 1)
            },
            "system_performance": {
                "cpu_usage": cpu_usage,
                "memory_usage": memory_usage,
                "disk_usage": disk_usage,
                "status": "healthy" if performance_score > 75 else "degraded" if performance_score > 50 else "critical"
            },
            "services_status": {
                "total": total_services,
                "healthy": healthy_services,
                "degraded": len([s for s in services.values() if s.get("status") == "degraded"]),
                "unhealthy": len([s for s in services.values() if s.get("status") == "unhealthy"])
            },
            "alerts_summary": {
                "total": len(alerts),
                "critical": len([a for a in alerts if a.get("type") == "critical"]),
                "warning": len([a for a in alerts if a.get("type") == "warning"]),
                "info": len([a for a in alerts if a.get("type") == "info"])
            },
            "call_analytics": {
                "total_calls_24h": call_analytics.get("total_calls", 0) if call_analytics else 0,
                "success_rate": round(
                    (call_analytics.get("successful_calls", 0) / max(call_analytics.get("total_calls", 1), 1)) * 100, 1
                ) if call_analytics else 0,
                "appointment_requests": call_analytics.get("appointment_requests", 0) if call_analytics else 0
            },
            "scheduling_analytics": {
                "total_appointments_24h": scheduling_analytics.get("total_appointments", 0) if scheduling_analytics else 0,
                "scheduling_success_rate": round(
                    (scheduling_analytics.get("successful_schedules", 0) / max(scheduling_analytics.get("total_appointments", 1), 1)) * 100, 1
                ) if scheduling_analytics else 0
            },
            "last_updated": datetime.utcnow().isoformat()
        }
        
        return JSONResponse(content=summary)
    
    except Exception as e:
        logger.error(f"Error getting monitoring summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get monitoring summary: {str(e)}")

@router.get("/health")
async def health_check():
    """Simple health check endpoint for the monitoring API itself"""
    return JSONResponse(content={
        "status": "healthy",
        "service": "Spirit Tours Monitoring API",
        "timestamp": datetime.utcnow().isoformat()
    })

# Include the router in the main FastAPI application
def get_monitoring_router() -> APIRouter:
    """Get the monitoring router for inclusion in the main FastAPI app"""
    return router