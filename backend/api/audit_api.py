"""
Audit and Logging API
API completa para auditoría, logs y monitoreo de actividad de usuarios
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import json

from backend.models.rbac_models import User
from backend.auth.rbac_middleware import get_current_active_user, AdminRequiredDep, PermissionRequiredDep
from backend.database import get_db_session
from backend.services.enhanced_audit_service import EnhancedAuditService, get_audit_service
from backend.models.enhanced_audit_models import (
    EnhancedAuditLog, BookingAuditLog, AIAgentUsageLog, LoginActivityLog, DataAccessLog,
    AuditLogResponse, BookingAuditResponse, AIAgentUsageResponse, AuditSearchFilters,
    ActionType, RiskLevel
)

router = APIRouter(prefix="/audit", tags=["Audit & Monitoring"])

# Pydantic Models for Requests
class BookingActionRequest(BaseModel):
    booking_id: str
    action: str  # created, modified, cancelled
    booking_data: Dict[str, Any]
    old_data: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    customer_id: Optional[str] = None

class AIAgentUsageRequest(BaseModel):
    agent_name: str
    query_text: str
    response_summary: Optional[str] = None
    customer_id: Optional[str] = None
    booking_id: Optional[str] = None
    action_taken: Optional[str] = None
    response_time_ms: Optional[int] = None

class DataAccessRequest(BaseModel):
    data_type: str
    record_id: Optional[str] = None
    records_count: int = 1
    access_type: str = "view"  # view, export, print, modify
    business_justification: Optional[str] = None

# === LOGGING ENDPOINTS ===

@router.post("/booking/log-action")
async def log_booking_action(
    booking_request: BookingActionRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Registrar acción en reserva (crear, modificar, cancelar)"""
    try:
        audit_service = get_audit_service(db)
        ip_address = request.client.host
        
        if booking_request.action == "created":
            await audit_service.log_booking_created(
                user_id=str(current_user.id),
                booking_data=booking_request.booking_data,
                customer_id=booking_request.customer_id,
                ip_address=ip_address
            )
        elif booking_request.action == "modified":
            await audit_service.log_booking_modified(
                user_id=str(current_user.id),
                booking_id=booking_request.booking_id,
                old_values=booking_request.old_data or {},
                new_values=booking_request.booking_data,
                reason=booking_request.reason,
                ip_address=ip_address
            )
        elif booking_request.action == "cancelled":
            await audit_service.log_booking_cancelled(
                user_id=str(current_user.id),
                booking_id=booking_request.booking_id,
                booking_data=booking_request.booking_data,
                reason=booking_request.reason,
                refund_amount=booking_request.booking_data.get("refund_amount"),
                ip_address=ip_address
            )
        
        return {
            "success": True,
            "message": f"Booking action '{booking_request.action}' logged successfully",
            "booking_id": booking_request.booking_id,
            "user": current_user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error logging booking action: {str(e)}")

@router.post("/ai-agent/log-usage")
async def log_ai_agent_usage(
    usage_request: AIAgentUsageRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Registrar uso de agente AI"""
    try:
        audit_service = get_audit_service(db)
        ip_address = request.client.host
        
        await audit_service.log_ai_agent_usage(
            user_id=str(current_user.id),
            agent_name=usage_request.agent_name,
            query_text=usage_request.query_text,
            response_summary=usage_request.response_summary,
            customer_id=usage_request.customer_id,
            booking_id=usage_request.booking_id,
            action_taken=usage_request.action_taken,
            response_time_ms=usage_request.response_time_ms,
            session_id=request.headers.get("session-id"),
            ip_address=ip_address
        )
        
        return {
            "success": True,
            "message": "AI agent usage logged successfully",
            "agent_name": usage_request.agent_name,
            "user": current_user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error logging AI agent usage: {str(e)}")

@router.post("/data-access/log")
async def log_data_access(
    access_request: DataAccessRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Registrar acceso a datos sensibles"""
    try:
        audit_service = get_audit_service(db)
        ip_address = request.client.host
        
        await audit_service.log_data_access(
            user_id=str(current_user.id),
            data_type=access_request.data_type,
            record_id=access_request.record_id,
            records_count=access_request.records_count,
            access_type=access_request.access_type,
            business_justification=access_request.business_justification,
            endpoint=str(request.url.path),
            query_parameters=dict(request.query_params),
            ip_address=ip_address
        )
        
        return {
            "success": True,
            "message": "Data access logged successfully",
            "data_type": access_request.data_type,
            "access_type": access_request.access_type,
            "user": current_user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error logging data access: {str(e)}")

# === QUERY ENDPOINTS ===

@router.get("/logs/enhanced")
async def get_enhanced_audit_logs(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    start_date: Optional[datetime] = Query(None, description="Start date for filtering"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    current_user: User = Depends(PermissionRequiredDep("audit_logs", "read", "system_logs")),
    db: Session = Depends(get_db_session)
):
    """Obtener logs de auditoría mejorados con filtros"""
    try:
        query = db.query(EnhancedAuditLog).join(User, EnhancedAuditLog.user_id == User.id)
        
        # Apply filters
        if user_id:
            query = query.filter(EnhancedAuditLog.user_id == user_id)
        if action_type:
            query = query.filter(EnhancedAuditLog.action_type == ActionType(action_type))
        if resource_type:
            query = query.filter(EnhancedAuditLog.resource_type == resource_type)
        if risk_level:
            query = query.filter(EnhancedAuditLog.risk_level == RiskLevel(risk_level))
        if start_date:
            query = query.filter(EnhancedAuditLog.timestamp >= start_date)
        if end_date:
            query = query.filter(EnhancedAuditLog.timestamp <= end_date)
        
        # Execute query with pagination
        total_count = query.count()
        logs = query.order_by(EnhancedAuditLog.timestamp.desc()).offset(offset).limit(limit).all()
        
        # Format response
        logs_data = []
        for log in logs:
            user = db.query(User).filter_by(id=log.user_id).first()
            logs_data.append({
                "id": str(log.id),
                "user_id": str(log.user_id),
                "username": user.username if user else "Unknown",
                "action_type": log.action_type.value,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "resource_name": log.resource_name,
                "description": log.description,
                "old_values": log.old_values,
                "new_values": log.new_values,
                "changed_fields": log.changed_fields,
                "business_context": log.business_context,
                "risk_level": log.risk_level.value,
                "is_sensitive": log.is_sensitive,
                "requires_review": log.requires_review,
                "amount": log.amount,
                "currency": log.currency,
                "ip_address": log.ip_address,
                "timestamp": log.timestamp.isoformat(),
                "correlation_id": log.correlation_id
            })
        
        return {
            "logs": logs_data,
            "pagination": {
                "total_count": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total_count
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving audit logs: {str(e)}")

@router.get("/logs/bookings")
async def get_booking_audit_logs(
    booking_id: Optional[str] = Query(None, description="Filter by booking ID"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(PermissionRequiredDep("booking_management", "read", "booking_logs")),
    db: Session = Depends(get_db_session)
):
    """Obtener logs específicos de reservas"""
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        query = db.query(BookingAuditLog).filter(BookingAuditLog.timestamp >= start_date)
        
        if booking_id:
            query = query.filter(BookingAuditLog.booking_id == booking_id)
        if user_id:
            query = query.filter(BookingAuditLog.user_id == user_id)
        if action:
            query = query.filter(BookingAuditLog.action == action)
        
        logs = query.order_by(BookingAuditLog.timestamp.desc()).limit(limit).all()
        
        logs_data = []
        for log in logs:
            user = db.query(User).filter_by(id=log.user_id).first()
            logs_data.append({
                "id": str(log.id),
                "booking_id": log.booking_id,
                "user_id": str(log.user_id),
                "username": user.username if user else "Unknown",
                "customer_id": log.customer_id,
                "action": log.action,
                "booking_status_before": log.booking_status_before,
                "booking_status_after": log.booking_status_after,
                "amount_before": log.amount_before,
                "amount_after": log.amount_after,
                "currency": log.currency,
                "service_type": log.service_type,
                "destination": log.destination,
                "travel_dates": log.travel_dates,
                "changes_made": log.changes_made,
                "reason": log.reason,
                "customer_notified": log.customer_notified,
                "requires_approval": log.requires_approval,
                "approved_by": str(log.approved_by) if log.approved_by else None,
                "timestamp": log.timestamp.isoformat()
            })
        
        return {
            "booking_logs": logs_data,
            "total_logs": len(logs_data),
            "period_days": days
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving booking logs: {str(e)}")

@router.get("/logs/ai-agents")
async def get_ai_agent_usage_logs(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    agent_name: Optional[str] = Query(None, description="Filter by agent name"),
    days: int = Query(7, ge=1, le=90, description="Number of days to look back"),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(PermissionRequiredDep("analytics_dashboard", "read", "ai_usage_logs")),
    db: Session = Depends(get_db_session)
):
    """Obtener logs de uso de agentes AI"""
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        query = db.query(AIAgentUsageLog).filter(AIAgentUsageLog.timestamp >= start_date)
        
        if user_id:
            query = query.filter(AIAgentUsageLog.user_id == user_id)
        if agent_name:
            query = query.filter(AIAgentUsageLog.agent_name == agent_name)
        
        logs = query.order_by(AIAgentUsageLog.timestamp.desc()).limit(limit).all()
        
        logs_data = []
        for log in logs:
            user = db.query(User).filter_by(id=log.user_id).first()
            logs_data.append({
                "id": str(log.id),
                "user_id": str(log.user_id),
                "username": user.username if user else "Unknown",
                "agent_name": log.agent_name,
                "agent_type": log.agent_type,
                "query_text": log.query_text[:200] + "..." if log.query_text and len(log.query_text) > 200 else log.query_text,
                "response_summary": log.response_summary,
                "response_time_ms": log.response_time_ms,
                "customer_id": log.customer_id,
                "booking_id": log.booking_id,
                "action_taken": log.action_taken,
                "timestamp": log.timestamp.isoformat()
            })
        
        return {
            "ai_usage_logs": logs_data,
            "total_logs": len(logs_data),
            "period_days": days
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving AI usage logs: {str(e)}")

@router.get("/dashboard/user-activity/{user_id}")
async def get_user_activity_dashboard(
    user_id: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(PermissionRequiredDep("user_management", "read", "user_activity")),
    db: Session = Depends(get_db_session)
):
    """Obtener dashboard de actividad de usuario específico"""
    try:
        audit_service = get_audit_service(db)
        
        activity_summary = await audit_service.get_user_activity_summary(user_id, days)
        
        # Get user details
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get recent high-risk activities
        start_date = datetime.utcnow() - timedelta(days=days)
        high_risk_activities = db.query(EnhancedAuditLog).filter(
            EnhancedAuditLog.user_id == user_id,
            EnhancedAuditLog.timestamp >= start_date,
            EnhancedAuditLog.risk_level == RiskLevel.HIGH
        ).order_by(EnhancedAuditLog.timestamp.desc()).limit(10).all()
        
        return {
            "user_info": {
                "user_id": user_id,
                "username": user.username,
                "email": user.email,
                "is_active": user.is_active,
                "last_login": user.last_login.isoformat() if user.last_login else None
            },
            "activity_summary": activity_summary,
            "high_risk_activities": [
                {
                    "action_type": activity.action_type.value,
                    "resource_type": activity.resource_type,
                    "description": activity.description,
                    "timestamp": activity.timestamp.isoformat()
                }
                for activity in high_risk_activities
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving user activity dashboard: {str(e)}")

@router.get("/dashboard/system-overview")
async def get_system_audit_dashboard(
    days: int = Query(7, ge=1, le=30, description="Number of days to analyze"),
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Obtener dashboard general de auditoría del sistema (Solo Admin)"""
    try:
        audit_service = get_audit_service(db)
        
        dashboard_data = await audit_service.get_system_audit_dashboard(days)
        
        # Additional system statistics
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Most used AI agents
        popular_agents = db.query(
            AIAgentUsageLog.agent_name,
            func.count(AIAgentUsageLog.id).label('usage_count')
        ).filter(
            AIAgentUsageLog.timestamp >= start_date
        ).group_by(AIAgentUsageLog.agent_name).order_by(desc('usage_count')).limit(10).all()
        
        # Recent booking activities
        recent_bookings = db.query(
            BookingAuditLog.action,
            func.count(BookingAuditLog.id).label('count')
        ).filter(
            BookingAuditLog.timestamp >= start_date
        ).group_by(BookingAuditLog.action).all()
        
        dashboard_data.update({
            "popular_ai_agents": [
                {"agent_name": agent, "usage_count": count}
                for agent, count in popular_agents
            ],
            "booking_activities": [
                {"action": action, "count": count}
                for action, count in recent_bookings
            ]
        })
        
        return dashboard_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving system dashboard: {str(e)}")

@router.get("/alerts/suspicious-activity")
async def get_suspicious_activity_alerts(
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Obtener alertas de actividad sospechosa (Solo Admin)"""
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Multiple failed logins
        failed_logins = db.query(
            LoginActivityLog.username,
            LoginActivityLog.ip_address,
            func.count(LoginActivityLog.id).label('failed_count')
        ).filter(
            LoginActivityLog.timestamp >= start_date,
            LoginActivityLog.success == False
        ).group_by(LoginActivityLog.username, LoginActivityLog.ip_address).having(
            func.count(LoginActivityLog.id) >= 5
        ).all()
        
        # High-risk activities
        high_risk_activities = db.query(EnhancedAuditLog).join(User).filter(
            EnhancedAuditLog.timestamp >= start_date,
            EnhancedAuditLog.risk_level == RiskLevel.HIGH
        ).order_by(EnhancedAuditLog.timestamp.desc()).limit(20).all()
        
        # Activities requiring review
        review_required = db.query(EnhancedAuditLog).join(User).filter(
            EnhancedAuditLog.timestamp >= start_date,
            EnhancedAuditLog.requires_review == True
        ).order_by(EnhancedAuditLog.timestamp.desc()).limit(20).all()
        
        return {
            "period_days": days,
            "suspicious_logins": [
                {
                    "username": username,
                    "ip_address": ip_address,
                    "failed_attempts": count
                }
                for username, ip_address, count in failed_logins
            ],
            "high_risk_activities": [
                {
                    "id": str(activity.id),
                    "user_id": str(activity.user_id),
                    "username": activity.user.username,
                    "action_type": activity.action_type.value,
                    "resource_type": activity.resource_type,
                    "description": activity.description,
                    "risk_level": activity.risk_level.value,
                    "timestamp": activity.timestamp.isoformat()
                }
                for activity in high_risk_activities
            ],
            "activities_requiring_review": [
                {
                    "id": str(activity.id),
                    "user_id": str(activity.user_id),
                    "username": activity.user.username,
                    "action_type": activity.action_type.value,
                    "description": activity.description,
                    "timestamp": activity.timestamp.isoformat()
                }
                for activity in review_required
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving suspicious activity alerts: {str(e)}")

# === UTILITY ENDPOINTS ===

@router.get("/search")
async def search_audit_logs(
    q: str = Query(..., min_length=3, description="Search query"),
    types: Optional[List[str]] = Query(None, description="Log types to search"),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(PermissionRequiredDep("audit_logs", "read", "search")),
    db: Session = Depends(get_db_session)
):
    """Buscar en logs de auditoría"""
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Search in enhanced audit logs
        query = db.query(EnhancedAuditLog).join(User).filter(
            EnhancedAuditLog.timestamp >= start_date
        )
        
        # Text search in description and resource_name
        search_filter = or_(
            EnhancedAuditLog.description.contains(q),
            EnhancedAuditLog.resource_name.contains(q),
            User.username.contains(q)
        )
        query = query.filter(search_filter)
        
        results = query.order_by(EnhancedAuditLog.timestamp.desc()).limit(limit).all()
        
        search_results = []
        for result in results:
            search_results.append({
                "id": str(result.id),
                "type": "enhanced_audit",
                "user_id": str(result.user_id),
                "username": result.user.username,
                "action_type": result.action_type.value,
                "resource_type": result.resource_type,
                "description": result.description,
                "risk_level": result.risk_level.value,
                "timestamp": result.timestamp.isoformat()
            })
        
        return {
            "search_query": q,
            "results": search_results,
            "total_results": len(search_results),
            "period_days": days
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching audit logs: {str(e)}")

@router.get("/export")
async def export_audit_logs(
    format: str = Query("json", description="Export format: json, csv"),
    filters: Optional[str] = Query(None, description="JSON string of filters"),
    current_user: User = Depends(PermissionRequiredDep("data_export", "execute", "audit_logs")),
    db: Session = Depends(get_db_session)
):
    """Exportar logs de auditoría"""
    try:
        # Log the export action
        audit_service = get_audit_service(db)
        await audit_service.log_data_access(
            user_id=str(current_user.id),
            data_type="audit_logs",
            access_type="export",
            business_justification="Audit log export for analysis"
        )
        
        # For now, return a simple response
        # In production, this would generate and return actual file
        return {
            "success": True,
            "message": "Audit log export initiated",
            "format": format,
            "user": current_user.username,
            "timestamp": datetime.utcnow().isoformat(),
            "note": "Export functionality would generate actual file in production"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting audit logs: {str(e)}")