"""
Communication Dashboard API
============================

API endpoints para el dashboard de monitoreo en tiempo real del sistema de comunicación:
- Métricas en tiempo real
- Estadísticas de routing
- Performance de agentes
- Estado de colas
- Analytics y reportes
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel
import asyncio
import json

from backend.models.rbac_models import User
from backend.auth.rbac_middleware import get_current_active_user, PermissionRequiredDep
from backend.config.database import get_db
from backend.communication.intelligent_router import IntelligentRouter, Department, CustomerType
from backend.communication.human_agent_queue import HumanAgentQueue
from backend.communication.multi_channel_gateway import MultiChannelGateway

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/communication-dashboard", tags=["Communication Dashboard"])

# Global instances
_router: Optional[IntelligentRouter] = None
_human_queue: Optional[HumanAgentQueue] = None
_gateway: Optional[MultiChannelGateway] = None

# WebSocket connections for real-time updates
active_websockets: List[WebSocket] = []


def get_instances():
    """Get or initialize instances"""
    global _router, _human_queue, _gateway
    
    if _router is None:
        _router = IntelligentRouter.get_instance()
    if _human_queue is None:
        _human_queue = HumanAgentQueue()
    # Gateway would be initialized by communication system
    
    return _router, _human_queue, _gateway


# Pydantic Models
class DateRangeQuery(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    department: Optional[str] = None


class RealtimeMetrics(BaseModel):
    timestamp: datetime
    active_conversations: int
    queued_conversations: int
    available_agents: int
    busy_agents: int
    messages_per_minute: float
    avg_response_time: float


# ========================================
# Real-time Metrics
# ========================================

@router.get("/metrics/realtime")
async def get_realtime_metrics(
    current_user: User = Depends(PermissionRequiredDep("analytics", "read", "dashboard")),
) -> Dict[str, Any]:
    """
    Obtiene métricas en tiempo real del sistema
    
    Returns:
        - Active conversations
        - Queued conversations
        - Agent availability
        - Messages per minute
        - Average response time
    """
    
    router_instance, human_queue, gateway = get_instances()
    
    # Queue status
    queue_status = await human_queue.get_queue_status()
    
    # Calculate messages per minute (would come from metrics collector)
    messages_per_minute = 0.0  # TODO: Implement from metrics
    
    # Calculate avg response time
    agents = await human_queue.get_agent_performance()
    avg_response_time = 0.0
    if agents["agents"]:
        response_times = [a["average_response_time"] for a in agents["agents"]]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0.0
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "active_conversations": queue_status["metrics"]["active_conversations"],
        "queued_conversations": sum(
            dept["queue_length"] 
            for dept in queue_status["departments"].values()
        ),
        "agents": {
            "available": queue_status["agents"]["available"],
            "busy": queue_status["agents"]["busy"],
            "away": queue_status["agents"]["away"],
            "offline": queue_status["agents"]["offline"],
            "total": queue_status["agents"]["total"],
        },
        "messages_per_minute": messages_per_minute,
        "avg_response_time": avg_response_time,
        "avg_wait_time": queue_status["metrics"]["average_wait_time"],
    }


@router.get("/metrics/routing-stats")
async def get_routing_stats(
    period: str = "today",  # today, week, month
    current_user: User = Depends(PermissionRequiredDep("analytics", "read", "routing_stats")),
) -> Dict[str, Any]:
    """
    Obtiene estadísticas de routing
    
    Args:
        period: Período de tiempo (today, week, month)
    
    Returns:
        - Total messages routed
        - AI vs Human distribution
        - Time wasters detected
        - Department distribution
        - Customer type distribution
    """
    
    # TODO: Implement actual metrics collection
    # For now, return simulated data structure
    
    return {
        "period": period,
        "timestamp": datetime.utcnow().isoformat(),
        "routing": {
            "total_messages": 1250,
            "ai_handled": 850,
            "human_handled": 400,
            "ai_percentage": 68.0,
            "human_percentage": 32.0,
        },
        "time_wasters": {
            "detected": 125,
            "percentage": 10.0,
            "avg_score": 8.2,
        },
        "departments": {
            "customer_service": 450,
            "sales": 380,
            "groups_quotes": 220,
            "general_info": 150,
            "vip_service": 30,
            "technical_support": 20,
        },
        "customer_types": {
            "new": 500,
            "returning": 350,
            "vip": 30,
            "group": 220,
            "potential": 125,
            "time_waster": 25,
        },
        "purchase_intent": {
            "high": 320,
            "medium": 480,
            "low": 450,
        },
    }


@router.get("/metrics/agent-performance")
async def get_agent_performance_metrics(
    period: str = "today",
    current_user: User = Depends(PermissionRequiredDep("analytics", "read", "agent_performance")),
) -> Dict[str, Any]:
    """
    Obtiene métricas de performance de todos los agentes
    
    Returns:
        - Success rates
        - Response times
        - Conversations handled
        - Customer satisfaction (if available)
    """
    
    router_instance, human_queue, gateway = get_instances()
    
    performance = await human_queue.get_agent_performance()
    
    # Add period filtering and additional metrics
    return {
        "period": period,
        "timestamp": datetime.utcnow().isoformat(),
        "agents": performance["agents"],
        "summary": {
            "total_agents": len(performance["agents"]),
            "avg_success_rate": sum(a["success_rate"] for a in performance["agents"]) / len(performance["agents"]) if performance["agents"] else 0,
            "avg_response_time": sum(a["average_response_time"] for a in performance["agents"]) / len(performance["agents"]) if performance["agents"] else 0,
            "total_conversations": sum(a["total_conversations"] for a in performance["agents"]),
        }
    }


@router.get("/metrics/channel-stats")
async def get_channel_stats(
    period: str = "today",
    current_user: User = Depends(PermissionRequiredDep("analytics", "read", "channel_stats")),
) -> Dict[str, Any]:
    """
    Obtiene estadísticas por canal de comunicación
    
    Returns:
        - Messages per channel
        - Response rates
        - Popular channels
    """
    
    # TODO: Implement actual channel metrics
    
    return {
        "period": period,
        "timestamp": datetime.utcnow().isoformat(),
        "channels": {
            "whatsapp": {
                "messages": 650,
                "active_conversations": 45,
                "avg_response_time": 35.2,
                "satisfaction_rate": 4.5,
            },
            "telegram": {
                "messages": 280,
                "active_conversations": 18,
                "avg_response_time": 28.5,
                "satisfaction_rate": 4.7,
            },
            "facebook": {
                "messages": 220,
                "active_conversations": 12,
                "avg_response_time": 42.1,
                "satisfaction_rate": 4.3,
            },
            "instagram": {
                "messages": 100,
                "active_conversations": 8,
                "avg_response_time": 31.8,
                "satisfaction_rate": 4.6,
            },
        },
        "most_popular": "whatsapp",
        "fastest_response": "telegram",
        "highest_satisfaction": "telegram",
    }


# ========================================
# Queue Monitoring
# ========================================

@router.get("/queue/detailed-status")
async def get_detailed_queue_status(
    current_user: User = Depends(PermissionRequiredDep("system_monitoring", "read", "queue_detailed")),
) -> Dict[str, Any]:
    """
    Obtiene estado detallado de todas las colas
    
    Includes:
        - Queue length per department
        - Wait times
        - Priority distribution
        - Oldest conversation in queue
    """
    
    router_instance, human_queue, gateway = get_instances()
    
    status = await human_queue.get_queue_status()
    
    # Add additional details
    for dept_name, dept_data in status["departments"].items():
        dept_enum = Department(dept_name)
        queue = human_queue.queues[dept_enum]
        
        if queue:
            oldest = min(queue, key=lambda x: x.queued_at)
            wait_duration = (datetime.utcnow() - oldest.queued_at).total_seconds()
            
            dept_data["oldest_wait"] = wait_duration
            dept_data["conversations"] = [
                {
                    "conversation_id": conv.conversation_id,
                    "priority": conv.priority,
                    "customer_type": conv.context.customer_type.value,
                    "wait_time": (datetime.utcnow() - conv.queued_at).total_seconds(),
                    "estimated_wait": conv.estimated_wait_time,
                }
                for conv in queue[:10]  # First 10
            ]
        else:
            dept_data["oldest_wait"] = 0
            dept_data["conversations"] = []
    
    return status


@router.get("/queue/history")
async def get_queue_history(
    hours: int = 24,
    current_user: User = Depends(PermissionRequiredDep("analytics", "read", "queue_history")),
) -> Dict[str, Any]:
    """
    Obtiene historial de cola (últimas X horas)
    
    Returns:
        - Queue length over time
        - Wait time trends
        - Peak hours
    """
    
    # TODO: Implement actual history tracking
    
    return {
        "period_hours": hours,
        "timestamp": datetime.utcnow().isoformat(),
        "data_points": [
            {
                "time": (datetime.utcnow() - timedelta(hours=i)).isoformat(),
                "queue_length": max(0, 15 - i * 2),  # Simulated
                "avg_wait_time": max(60, 300 - i * 20),  # Simulated
                "messages_processed": 50 + i * 5,  # Simulated
            }
            for i in range(hours, 0, -1)
        ],
        "peak_hour": "14:00",
        "lowest_hour": "03:00",
    }


# ========================================
# AI Performance
# ========================================

@router.get("/ai/performance")
async def get_ai_performance(
    period: str = "today",
    current_user: User = Depends(PermissionRequiredDep("analytics", "read", "ai_performance")),
) -> Dict[str, Any]:
    """
    Obtiene métricas de performance del AI
    
    Returns:
        - Success rate (completed without escalation)
        - Escalation rate
        - Avg qualification score
        - Common escalation reasons
    """
    
    # TODO: Implement actual AI metrics tracking
    
    return {
        "period": period,
        "timestamp": datetime.utcnow().isoformat(),
        "sales_agent": {
            "total_conversations": 850,
            "successful_closures": 425,
            "success_rate": 50.0,
            "escalations": 425,
            "escalation_rate": 50.0,
            "avg_qualification_score": 6.5,
            "avg_attempts_before_escalation": 3.2,
        },
        "escalation_reasons": {
            "low_confidence": 180,
            "policy_questions": 85,
            "payment_issues": 60,
            "complex_booking": 55,
            "max_attempts": 45,
        },
        "time_waster_detection": {
            "detected": 125,
            "accuracy": 92.0,
            "false_positives": 10,
            "resources_saved": "15.5 agent-hours",
        },
    }


@router.get("/ai/intent-distribution")
async def get_intent_distribution(
    period: str = "today",
    current_user: User = Depends(PermissionRequiredDep("analytics", "read", "intent_distribution")),
) -> Dict[str, Any]:
    """Obtiene distribución de intenciones detectadas por el AI"""
    
    # TODO: Implement actual intent tracking
    
    return {
        "period": period,
        "timestamp": datetime.utcnow().isoformat(),
        "intents": {
            "search_destination": 320,
            "purchase_intent": 280,
            "request_quotation": 220,
            "greeting": 180,
            "modify_booking": 120,
            "complaint": 80,
            "general_inquiry": 50,
        },
        "top_intent": "search_destination",
        "purchase_conversion_rate": 42.5,
    }


# ========================================
# WebSocket for Real-time Updates
# ========================================

@router.websocket("/ws/realtime")
async def websocket_realtime_updates(websocket: WebSocket):
    """
    WebSocket para actualizaciones en tiempo real
    
    Envía actualizaciones cada 5 segundos con:
    - Queue status
    - Agent status
    - New messages
    - Alerts
    """
    
    await websocket.accept()
    active_websockets.append(websocket)
    
    try:
        while True:
            # Get current metrics
            router_instance, human_queue, gateway = get_instances()
            
            queue_status = await human_queue.get_queue_status()
            
            update = {
                "type": "metrics_update",
                "timestamp": datetime.utcnow().isoformat(),
                "data": {
                    "active_conversations": queue_status["metrics"]["active_conversations"],
                    "queued_total": sum(
                        dept["queue_length"] 
                        for dept in queue_status["departments"].values()
                    ),
                    "agents_available": queue_status["agents"]["available"],
                    "agents_busy": queue_status["agents"]["busy"],
                }
            }
            
            await websocket.send_json(update)
            
            # Wait 5 seconds before next update
            await asyncio.sleep(5)
            
    except WebSocketDisconnect:
        active_websockets.remove(websocket)
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        if websocket in active_websockets:
            active_websockets.remove(websocket)


async def broadcast_update(update: Dict[str, Any]):
    """Broadcast update to all connected WebSocket clients"""
    
    disconnected = []
    
    for websocket in active_websockets:
        try:
            await websocket.send_json(update)
        except:
            disconnected.append(websocket)
    
    # Remove disconnected clients
    for ws in disconnected:
        if ws in active_websockets:
            active_websockets.remove(ws)


# ========================================
# Reports
# ========================================

@router.get("/reports/summary")
async def get_summary_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(PermissionRequiredDep("analytics", "read", "reports")),
) -> Dict[str, Any]:
    """
    Genera reporte resumen del sistema
    
    Args:
        start_date: Fecha de inicio (default: hoy)
        end_date: Fecha fin (default: hoy)
    
    Returns:
        Reporte completo con todas las métricas
    """
    
    if not start_date:
        start_date = datetime.utcnow().replace(hour=0, minute=0, second=0)
    if not end_date:
        end_date = datetime.utcnow()
    
    # Gather all metrics
    routing_stats = await get_routing_stats("custom")
    agent_performance = await get_agent_performance_metrics("custom")
    ai_performance = await get_ai_performance("custom")
    channel_stats = await get_channel_stats("custom")
    
    return {
        "report_generated": datetime.utcnow().isoformat(),
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
        },
        "summary": {
            "total_messages": routing_stats["routing"]["total_messages"],
            "total_conversations": agent_performance["summary"]["total_conversations"],
            "ai_success_rate": ai_performance["sales_agent"]["success_rate"],
            "avg_agent_success_rate": agent_performance["summary"]["avg_success_rate"],
            "time_wasters_detected": routing_stats["time_wasters"]["detected"],
        },
        "routing": routing_stats,
        "agents": agent_performance,
        "ai": ai_performance,
        "channels": channel_stats,
    }


@router.get("/reports/export")
async def export_report(
    format: str = "json",  # json, csv, pdf
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(PermissionRequiredDep("analytics", "export", "reports")),
) -> Dict[str, Any]:
    """
    Exporta reporte en diferentes formatos
    
    Args:
        format: Formato de exportación (json, csv, pdf)
        start_date: Fecha de inicio
        end_date: Fecha fin
    """
    
    report = await get_summary_report(start_date, end_date, current_user)
    
    # TODO: Implement actual file generation
    
    return {
        "status": "generated",
        "format": format,
        "download_url": f"/api/communication-dashboard/reports/download/{format}",
        "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
    }


# ========================================
# Alerts and Notifications
# ========================================

@router.get("/alerts/active")
async def get_active_alerts(
    current_user: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    """
    Obtiene alertas activas del sistema
    
    Returns:
        - Queue overflow alerts
        - Agent availability alerts
        - System performance alerts
    """
    
    alerts = []
    
    router_instance, human_queue, gateway = get_instances()
    queue_status = await human_queue.get_queue_status()
    
    # Check for queue overflow
    for dept_name, dept_data in queue_status["departments"].items():
        if dept_data["queue_length"] > 10:
            alerts.append({
                "severity": "warning",
                "type": "queue_overflow",
                "department": dept_name,
                "message": f"Queue length in {dept_name} is {dept_data['queue_length']} (> 10)",
                "timestamp": datetime.utcnow().isoformat(),
            })
    
    # Check for agent availability
    if queue_status["agents"]["available"] == 0 and queue_status["agents"]["total"] > 0:
        alerts.append({
            "severity": "critical",
            "type": "no_agents_available",
            "message": "No agents available to handle conversations",
            "timestamp": datetime.utcnow().isoformat(),
        })
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "alerts": alerts,
        "count": len(alerts),
    }
