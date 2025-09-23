"""
Enterprise Analytics API
Comprehensive REST API for real-time analytics, KPIs, and business intelligence.

Features:
- Real-time KPI dashboards
- Booking and payment analytics
- AI agent performance metrics
- User engagement tracking
- Custom report generation
- WebSocket support for live updates
- Export capabilities (JSON, CSV, PDF)
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import pandas as pd
import io
import csv

from ..services.analytics_service import (
    AnalyticsService, get_analytics_service, TimeFrame, BusinessModel, 
    MetricType, KPIMetrics, AnalyticsReport
)
from ..auth.auth_manager import get_current_user, require_permission
from ..database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

# Pydantic Models for API
class KPIResponse(BaseModel):
    """KPI metrics response model"""
    total_bookings: int
    total_revenue: float
    average_booking_value: float
    conversion_rate: float
    user_retention_rate: float
    ai_satisfaction_score: float
    system_uptime: float
    response_time: float
    timestamp: str
    
class AnalyticsQuery(BaseModel):
    """Analytics query request model"""
    time_frame: TimeFrame = Field(default=TimeFrame.DAY, description="Time frame for analytics")
    start_date: Optional[datetime] = Field(default=None, description="Custom start date")
    end_date: Optional[datetime] = Field(default=None, description="Custom end date")
    business_model: Optional[BusinessModel] = Field(default=None, description="Filter by business model")
    metrics: Optional[List[MetricType]] = Field(default=None, description="Specific metrics to include")

class BookingAnalyticsResponse(BaseModel):
    """Booking analytics response model"""
    time_frame: str
    period_data: List[Dict[str, Any]]
    top_destinations: List[Dict[str, Any]]
    booking_sources: List[Dict[str, Any]]
    summary: Optional[Dict[str, Any]] = None

class PaymentAnalyticsResponse(BaseModel):
    """Payment analytics response model"""
    time_frame: str
    period_data: List[Dict[str, Any]]
    payment_methods: Dict[str, Any]
    refund_analytics: Dict[str, Any]
    commission_breakdown: List[Dict[str, Any]]

class AIUsageAnalyticsResponse(BaseModel):
    """AI usage analytics response model"""
    time_frame: str
    agent_performance: List[Dict[str, Any]]
    usage_trends: List[Dict[str, Any]]
    popular_query_types: List[Dict[str, Any]]

class UserEngagementResponse(BaseModel):
    """User engagement analytics response model"""
    time_frame: str
    activity_trends: List[Dict[str, Any]]
    user_segmentation: List[Dict[str, Any]]
    notification_engagement: List[Dict[str, Any]]

class ReportGenerationRequest(BaseModel):
    """Report generation request model"""
    report_type: str = Field(..., description="Type of report to generate")
    time_frame: TimeFrame = Field(default=TimeFrame.DAY)
    business_model: Optional[BusinessModel] = None
    include_charts: bool = Field(default=True, description="Include chart data")
    format: str = Field(default="json", description="Output format: json, csv, pdf")

class DashboardConfig(BaseModel):
    """Dashboard configuration model"""
    name: str = Field(..., description="Dashboard name")
    widgets: List[Dict[str, Any]] = Field(..., description="Widget configurations")
    refresh_interval: int = Field(default=60, description="Auto-refresh interval in seconds")
    filters: Optional[Dict[str, Any]] = Field(default=None)

# WebSocket connection manager for real-time updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast_update(self, data: dict):
        """Broadcast analytics update to all connected clients"""
        if not self.active_connections:
            return
        
        message = json.dumps(data)
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to WebSocket: {str(e)}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

manager = ConnectionManager()

# API Endpoints

@router.get("/health", response_model=Dict[str, str])
async def health_check():
    """Health check for analytics service"""
    return {"status": "healthy", "service": "analytics", "timestamp": datetime.now(timezone.utc).isoformat()}

@router.get("/kpis", response_model=KPIResponse)
async def get_real_time_kpis(
    time_frame: TimeFrame = Query(default=TimeFrame.DAY, description="Time frame for KPIs"),
    current_user: dict = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get real-time Key Performance Indicators"""
    try:
        # Check permissions
        await require_permission(current_user, "analytics.read")
        
        kpis = await analytics_service.get_real_time_kpis(time_frame)
        
        return KPIResponse(
            total_bookings=kpis.total_bookings,
            total_revenue=float(kpis.total_revenue),
            average_booking_value=float(kpis.average_booking_value),
            conversion_rate=kpis.conversion_rate,
            user_retention_rate=kpis.user_retention_rate,
            ai_satisfaction_score=kpis.ai_satisfaction_score,
            system_uptime=kpis.system_uptime,
            response_time=kpis.response_time,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error getting KPIs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get KPIs: {str(e)}")

@router.post("/query", response_model=Dict[str, Any])
async def query_analytics(
    query: AnalyticsQuery,
    current_user: dict = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Execute custom analytics query"""
    try:
        await require_permission(current_user, "analytics.read")
        
        result = {}
        
        # Get requested metrics or all if none specified
        if not query.metrics:
            query.metrics = [MetricType.BOOKING, MetricType.PAYMENT, MetricType.USER, MetricType.AI_USAGE]
        
        for metric_type in query.metrics:
            if metric_type == MetricType.BOOKING:
                result["bookings"] = await analytics_service.get_booking_analytics(
                    query.time_frame, query.business_model
                )
            elif metric_type == MetricType.PAYMENT:
                result["payments"] = await analytics_service.get_payment_analytics(query.time_frame)
            elif metric_type == MetricType.AI_USAGE:
                result["ai_usage"] = await analytics_service.get_ai_usage_analytics(query.time_frame)
            elif metric_type == MetricType.USER:
                result["user_engagement"] = await analytics_service.get_user_engagement_analytics(query.time_frame)
        
        return {
            "query": query.dict(),
            "results": result,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error executing analytics query: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

@router.get("/bookings", response_model=BookingAnalyticsResponse)
async def get_booking_analytics(
    time_frame: TimeFrame = Query(default=TimeFrame.DAY),
    business_model: Optional[BusinessModel] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get comprehensive booking analytics"""
    try:
        await require_permission(current_user, "analytics.read")
        
        data = await analytics_service.get_booking_analytics(time_frame, business_model)
        
        # Calculate summary statistics
        if "period_data" in data and data["period_data"]:
            total_bookings = sum(p.get("booking_count", 0) for p in data["period_data"])
            total_revenue = sum(p.get("total_revenue", 0) for p in data["period_data"])
            avg_conversion = sum(p.get("confirmation_rate", 0) for p in data["period_data"]) / len(data["period_data"])
            
            data["summary"] = {
                "total_bookings": total_bookings,
                "total_revenue": total_revenue,
                "average_conversion_rate": avg_conversion,
                "periods_analyzed": len(data["period_data"])
            }
        
        return BookingAnalyticsResponse(**data)
        
    except Exception as e:
        logger.error(f"Error getting booking analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get booking analytics: {str(e)}")

@router.get("/payments", response_model=PaymentAnalyticsResponse)
async def get_payment_analytics(
    time_frame: TimeFrame = Query(default=TimeFrame.DAY),
    current_user: dict = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get comprehensive payment analytics"""
    try:
        await require_permission(current_user, "analytics.read")
        
        data = await analytics_service.get_payment_analytics(time_frame)
        return PaymentAnalyticsResponse(**data)
        
    except Exception as e:
        logger.error(f"Error getting payment analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get payment analytics: {str(e)}")

@router.get("/ai-usage", response_model=AIUsageAnalyticsResponse)
async def get_ai_usage_analytics(
    time_frame: TimeFrame = Query(default=TimeFrame.DAY),
    current_user: dict = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get AI agent usage and performance analytics"""
    try:
        await require_permission(current_user, "analytics.read")
        
        data = await analytics_service.get_ai_usage_analytics(time_frame)
        return AIUsageAnalyticsResponse(**data)
        
    except Exception as e:
        logger.error(f"Error getting AI usage analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get AI usage analytics: {str(e)}")

@router.get("/user-engagement", response_model=UserEngagementResponse)
async def get_user_engagement_analytics(
    time_frame: TimeFrame = Query(default=TimeFrame.DAY),
    current_user: dict = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get user engagement and behavioral analytics"""
    try:
        await require_permission(current_user, "analytics.read")
        
        data = await analytics_service.get_user_engagement_analytics(time_frame)
        return UserEngagementResponse(**data)
        
    except Exception as e:
        logger.error(f"Error getting user engagement analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get engagement analytics: {str(e)}")

@router.post("/reports/generate", response_model=Dict[str, Any])
async def generate_analytics_report(
    request: ReportGenerationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Generate comprehensive analytics report"""
    try:
        await require_permission(current_user, "analytics.reports")
        
        # Generate report
        report = await analytics_service.generate_comprehensive_report(
            request.report_type,
            request.time_frame,
            request.business_model
        )
        
        if request.format == "json":
            return {
                "report": report.to_dict(),
                "generation_time": datetime.now(timezone.utc).isoformat(),
                "format": "json"
            }
        elif request.format == "csv":
            # Convert to CSV format
            csv_data = await _convert_report_to_csv(report)
            return StreamingResponse(
                io.StringIO(csv_data),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={report.report_id}.csv"}
            )
        else:
            return {"report_id": report.report_id, "format": request.format, "status": "generated"}
        
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@router.get("/reports/{report_id}", response_model=Dict[str, Any])
async def get_analytics_report(
    report_id: str,
    format: str = Query(default="json", description="Output format"),
    current_user: dict = Depends(get_current_user)
):
    """Retrieve generated analytics report"""
    try:
        await require_permission(current_user, "analytics.read")
        
        # In a real implementation, reports would be stored in database or cache
        # For now, return placeholder
        return {
            "report_id": report_id,
            "status": "available",
            "format": format,
            "message": "Report retrieval from storage not implemented in this demo"
        }
        
    except Exception as e:
        logger.error(f"Error retrieving report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve report: {str(e)}")

@router.get("/dashboard/config", response_model=Dict[str, Any])
async def get_dashboard_config(
    dashboard_name: str = Query(..., description="Dashboard name"),
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard configuration"""
    try:
        await require_permission(current_user, "analytics.read")
        
        # Default dashboard configurations
        default_configs = {
            "executive": {
                "name": "Executive Dashboard",
                "widgets": [
                    {"type": "kpi", "metric": "total_revenue", "size": "large"},
                    {"type": "kpi", "metric": "total_bookings", "size": "medium"},
                    {"type": "kpi", "metric": "conversion_rate", "size": "medium"},
                    {"type": "chart", "metric": "booking_trends", "size": "large"},
                    {"type": "chart", "metric": "revenue_by_model", "size": "medium"}
                ],
                "refresh_interval": 60
            },
            "operations": {
                "name": "Operations Dashboard",
                "widgets": [
                    {"type": "kpi", "metric": "system_uptime", "size": "medium"},
                    {"type": "kpi", "metric": "ai_satisfaction", "size": "medium"},
                    {"type": "chart", "metric": "ai_agent_performance", "size": "large"},
                    {"type": "chart", "metric": "payment_success_rates", "size": "medium"},
                    {"type": "table", "metric": "recent_bookings", "size": "large"}
                ],
                "refresh_interval": 30
            },
            "finance": {
                "name": "Financial Dashboard",
                "widgets": [
                    {"type": "kpi", "metric": "total_revenue", "size": "large"},
                    {"type": "kpi", "metric": "commission_earnings", "size": "medium"},
                    {"type": "chart", "metric": "revenue_trends", "size": "large"},
                    {"type": "chart", "metric": "payment_methods", "size": "medium"},
                    {"type": "table", "metric": "refund_analysis", "size": "medium"}
                ],
                "refresh_interval": 120
            }
        }
        
        config = default_configs.get(dashboard_name)
        if not config:
            raise HTTPException(status_code=404, detail=f"Dashboard '{dashboard_name}' not found")
        
        return config
        
    except Exception as e:
        logger.error(f"Error getting dashboard config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard config: {str(e)}")

@router.post("/dashboard/config", response_model=Dict[str, str])
async def save_dashboard_config(
    config: DashboardConfig,
    current_user: dict = Depends(get_current_user)
):
    """Save custom dashboard configuration"""
    try:
        await require_permission(current_user, "analytics.write")
        
        # In a real implementation, save to database
        logger.info(f"Saving dashboard config: {config.name}")
        
        return {
            "message": f"Dashboard '{config.name}' configuration saved successfully",
            "dashboard_id": f"custom_{config.name.lower().replace(' ', '_')}"
        }
        
    except Exception as e:
        logger.error(f"Error saving dashboard config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save dashboard config: {str(e)}")

# WebSocket endpoint for real-time analytics
@router.websocket("/ws/real-time")
async def websocket_real_time_analytics(
    websocket: WebSocket,
    token: Optional[str] = Query(None, description="Authentication token")
):
    """WebSocket endpoint for real-time analytics updates"""
    try:
        # In a real implementation, validate token here
        await manager.connect(websocket)
        
        # Send initial data
        analytics_service = await get_analytics_service()
        kpis = await analytics_service.get_real_time_kpis(TimeFrame.HOUR)
        
        await websocket.send_text(json.dumps({
            "type": "initial_data",
            "data": kpis.to_dict(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }))
        
        # Keep connection alive and send periodic updates
        while True:
            try:
                # Wait for client message or send periodic update
                await asyncio.sleep(30)  # Update every 30 seconds
                
                # Get fresh KPIs
                fresh_kpis = await analytics_service.get_real_time_kpis(TimeFrame.HOUR)
                
                update_data = {
                    "type": "kpi_update",
                    "data": fresh_kpis.to_dict(),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                
                await websocket.send_text(json.dumps(update_data))
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in WebSocket update: {str(e)}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": f"Update error: {str(e)}",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        manager.disconnect(websocket)

@router.get("/export/{metric_type}")
async def export_analytics_data(
    metric_type: MetricType,
    format: str = Query(default="csv", description="Export format: csv, json, excel"),
    time_frame: TimeFrame = Query(default=TimeFrame.DAY),
    current_user: dict = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Export analytics data in various formats"""
    try:
        await require_permission(current_user, "analytics.export")
        
        # Get data based on metric type
        if metric_type == MetricType.BOOKING:
            data = await analytics_service.get_booking_analytics(time_frame)
        elif metric_type == MetricType.PAYMENT:
            data = await analytics_service.get_payment_analytics(time_frame)
        elif metric_type == MetricType.AI_USAGE:
            data = await analytics_service.get_ai_usage_analytics(time_frame)
        elif metric_type == MetricType.USER:
            data = await analytics_service.get_user_engagement_analytics(time_frame)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported metric type: {metric_type}")
        
        if format == "json":
            return data
        elif format == "csv":
            csv_data = await _convert_to_csv(data, metric_type)
            return StreamingResponse(
                io.StringIO(csv_data),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={metric_type}_{time_frame}.csv"}
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
        
    except Exception as e:
        logger.error(f"Error exporting data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")

# Background task for sending real-time updates
async def broadcast_analytics_update():
    """Background task to broadcast analytics updates"""
    try:
        analytics_service = await get_analytics_service()
        kpis = await analytics_service.get_real_time_kpis(TimeFrame.HOUR)
        
        update_data = {
            "type": "scheduled_update",
            "data": kpis.to_dict(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await manager.broadcast_update(update_data)
        
    except Exception as e:
        logger.error(f"Error broadcasting update: {str(e)}")

# Helper functions
async def _convert_report_to_csv(report: AnalyticsReport) -> str:
    """Convert analytics report to CSV format"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["Report ID", "Type", "Time Frame", "Generated At"])
    writer.writerow([report.report_id, report.report_type, report.time_frame.value, report.generated_at.isoformat()])
    writer.writerow([])  # Empty row
    
    # Write summary
    writer.writerow(["Summary"])
    for key, value in report.summary.items():
        writer.writerow([key, value])
    writer.writerow([])  # Empty row
    
    # Write metrics data
    for metric_name, metric_values in report.metrics.items():
        writer.writerow([f"{metric_name.title()} Data"])
        writer.writerow(["Timestamp", "Value"])
        for metric_value in metric_values:
            writer.writerow([metric_value.timestamp.isoformat(), str(metric_value.value)])
        writer.writerow([])  # Empty row
    
    return output.getvalue()

async def _convert_to_csv(data: Dict[str, Any], metric_type: MetricType) -> str:
    """Convert analytics data to CSV format"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write based on metric type
    if metric_type == MetricType.BOOKING and "period_data" in data:
        writer.writerow(["Period", "Booking Count", "Total Revenue", "Avg Booking Value", "Confirmation Rate"])
        for period in data["period_data"]:
            writer.writerow([
                period.get("period", ""),
                period.get("booking_count", 0),
                period.get("total_revenue", 0),
                period.get("avg_booking_value", 0),
                period.get("confirmation_rate", 0)
            ])
    elif metric_type == MetricType.AI_USAGE and "agent_performance" in data:
        writer.writerow(["Agent Name", "Query Count", "Avg Response Time", "Success Rate", "Satisfaction"])
        for agent in data["agent_performance"]:
            writer.writerow([
                agent.get("agent_name", ""),
                agent.get("query_count", 0),
                agent.get("avg_response_time_ms", 0),
                agent.get("success_rate", 0),
                agent.get("avg_satisfaction", 0)
            ])
    else:
        # Generic format
        writer.writerow(["Key", "Value"])
        for key, value in data.items():
            if isinstance(value, (str, int, float)):
                writer.writerow([key, value])
    
    return output.getvalue()

# Startup event to initialize periodic updates
@router.on_event("startup")
async def startup_event():
    """Initialize analytics service on startup"""
    logger.info("Analytics API initialized with real-time capabilities")
    
    # Start background task for periodic updates (would use proper task queue in production)
    asyncio.create_task(_periodic_update_task())

async def _periodic_update_task():
    """Periodic task to send analytics updates"""
    while True:
        try:
            await asyncio.sleep(60)  # Every minute
            await broadcast_analytics_update()
        except Exception as e:
            logger.error(f"Error in periodic update task: {str(e)}")
            await asyncio.sleep(60)  # Continue despite errors