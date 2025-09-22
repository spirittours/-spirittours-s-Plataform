"""
Security Alerts API
API para gestionar alertas de seguridad y actividades sospechosas
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from backend.models.rbac_models import User
from backend.auth.rbac_middleware import get_current_active_user, AdminRequiredDep
from backend.database import get_db_session
from backend.services.alert_service import AlertService, AlertSeverity, AlertType, get_alert_service

router = APIRouter(prefix="/alerts", tags=["Security Alerts"])

class AlertResponse(BaseModel):
    alert_id: str
    alert_type: str
    severity: str
    user_id: str
    username: str
    description: str
    details: Dict[str, Any]
    affected_resources: List[str]
    timestamp: datetime

@router.get("/active")
async def get_active_alerts(
    severity: Optional[str] = None,
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Obtener alertas activas (Solo Admin)"""
    try:
        alert_service = get_alert_service(db)
        
        severity_filter = None
        if severity:
            severity_filter = AlertSeverity(severity)
        
        alerts = alert_service.get_active_alerts(severity_filter)
        
        return {
            "active_alerts": alerts,
            "total_alerts": len(alerts),
            "severity_filter": severity,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving alerts: {str(e)}")

@router.post("/run-security-check")
async def run_security_check(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Ejecutar verificación de seguridad manual (Solo Admin)"""
    try:
        alert_service = get_alert_service(db)
        
        # Run security checks in background
        background_tasks.add_task(alert_service.check_all_security_rules)
        
        return {
            "success": True,
            "message": "Security check initiated",
            "initiated_by": current_user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running security check: {str(e)}")

@router.post("/clear-old")
async def clear_old_alerts(
    hours: int = 24,
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Limpiar alertas antiguas (Solo Admin)"""
    try:
        alert_service = get_alert_service(db)
        
        initial_count = len(alert_service.active_alerts)
        alert_service.clear_old_alerts(hours)
        final_count = len(alert_service.active_alerts)
        
        return {
            "success": True,
            "message": f"Cleared {initial_count - final_count} old alerts",
            "alerts_before": initial_count,
            "alerts_after": final_count,
            "hours_threshold": hours,
            "cleared_by": current_user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing alerts: {str(e)}")

@router.get("/summary")
async def get_alerts_summary(
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Obtener resumen de alertas por severidad (Solo Admin)"""
    try:
        alert_service = get_alert_service(db)
        alerts = alert_service.get_active_alerts()
        
        summary = {
            "total_alerts": len(alerts),
            "by_severity": {
                "critical": len([a for a in alerts if a["severity"] == "critical"]),
                "high": len([a for a in alerts if a["severity"] == "high"]),
                "medium": len([a for a in alerts if a["severity"] == "medium"]),
                "low": len([a for a in alerts if a["severity"] == "low"])
            },
            "by_type": {}
        }
        
        # Count by alert type
        for alert in alerts:
            alert_type = alert["alert_type"]
            if alert_type not in summary["by_type"]:
                summary["by_type"][alert_type] = 0
            summary["by_type"][alert_type] += 1
        
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting alerts summary: {str(e)}")