"""
WebRTC Signaling API - Spirit Tours Omnichannel Platform
API REST para gestionar conexiones WebRTC y estado del servicio de señalización
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

from ..services.webrtc_signaling_service import (
    webrtc_signaling_service,
    CallStatus,
    SignalingMessageType
)

# Configure logging
logger = logging.getLogger(__name__)

# Create API router
router = APIRouter(
    prefix="/api/v1/webrtc",
    tags=["WebRTC Signaling"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"}
    }
)

# ============== REQUEST/RESPONSE MODELS ==============

class CallRequestModel(BaseModel):
    """Modelo para solicitar una llamada WebRTC"""
    agent_type: Optional[str] = Field(default="sales", description="Tipo de agente AI solicitado")
    customer_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Datos del cliente")
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Preferencias de llamada")
    
    class Config:
        schema_extra = {
            "example": {
                "agent_type": "sales",
                "customer_data": {
                    "name": "Juan Pérez",
                    "email": "juan@email.com",
                    "language": "es",
                    "location": "Madrid"
                },
                "preferences": {
                    "audio_quality": "high",
                    "language": "es"
                }
            }
        }

class SessionStatusModel(BaseModel):
    """Modelo para estado de sesión WebRTC"""
    session_id: str
    client_id: str
    call_status: CallStatus
    ai_agent_type: Optional[str] = None
    ai_agent_id: Optional[str] = None
    created_at: datetime
    connected_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None

class WebRTCStatsModel(BaseModel):
    """Modelo para estadísticas WebRTC"""
    service_name: str
    is_running: bool
    server_info: Dict[str, Any]
    session_stats: Dict[str, Any]
    connection_stats: Dict[str, Any]
    call_stats: Dict[str, Any]

class AgentInfoModel(BaseModel):
    """Modelo para información de agente IA"""
    name: str
    description: str
    capabilities: List[str]
    languages: List[str]
    availability: str = "available"

# ============== API ENDPOINTS ==============

@router.get("/status", response_model=Dict[str, Any])
async def get_webrtc_service_status():
    """Obtener estado del servicio WebRTC Signaling"""
    try:
        if not webrtc_signaling_service.is_running:
            return {
                "status": "stopped",
                "message": "WebRTC Signaling Service is not running",
                "is_running": False
            }
        
        stats = webrtc_signaling_service.get_service_stats()
        
        return {
            "status": "running",
            "message": "WebRTC Signaling Service is operational",
            "timestamp": datetime.now().isoformat(),
            "service_info": stats,
            "websocket_url": f"ws://{webrtc_signaling_service.host}:{webrtc_signaling_service.port}",
            "supported_agents": ["sales", "support", "booking", "consultant"]
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting WebRTC service status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Service status error: {str(e)}")

@router.post("/start-service", response_model=Dict[str, Any])
async def start_webrtc_service(background_tasks: BackgroundTasks):
    """Iniciar servicio WebRTC Signaling"""
    try:
        if webrtc_signaling_service.is_running:
            return {
                "status": "already_running",
                "message": "WebRTC Signaling Service is already running",
                "websocket_url": f"ws://{webrtc_signaling_service.host}:{webrtc_signaling_service.port}"
            }
        
        # Inicializar servicio en background
        background_tasks.add_task(webrtc_signaling_service.initialize)
        
        return {
            "status": "starting",
            "message": "WebRTC Signaling Service is starting",
            "websocket_url": f"ws://{webrtc_signaling_service.host}:{webrtc_signaling_service.port}",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error starting WebRTC service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Service start error: {str(e)}")

@router.post("/stop-service", response_model=Dict[str, Any])
async def stop_webrtc_service(background_tasks: BackgroundTasks):
    """Detener servicio WebRTC Signaling"""
    try:
        if not webrtc_signaling_service.is_running:
            return {
                "status": "already_stopped",
                "message": "WebRTC Signaling Service is not running"
            }
        
        # Detener servicio en background
        background_tasks.add_task(webrtc_signaling_service.stop_server)
        
        return {
            "status": "stopping",
            "message": "WebRTC Signaling Service is stopping",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error stopping WebRTC service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Service stop error: {str(e)}")

@router.get("/sessions", response_model=Dict[str, Any])
async def get_active_sessions():
    """Obtener lista de sesiones WebRTC activas"""
    try:
        sessions = []
        
        for session_id, session in webrtc_signaling_service.active_sessions.items():
            # Calcular duración si está conectada
            duration = None
            if session.connected_at:
                end_time = session.ended_at or datetime.now()
                duration = (end_time - session.connected_at).total_seconds()
            
            session_info = {
                "session_id": session.session_id,
                "client_id": session.client_id,
                "call_status": session.call_status.value,
                "ai_agent_type": session.ai_agent_type,
                "ai_agent_id": session.ai_agent_id,
                "created_at": session.created_at.isoformat(),
                "connected_at": session.connected_at.isoformat() if session.connected_at else None,
                "ended_at": session.ended_at.isoformat() if session.ended_at else None,
                "duration_seconds": duration,
                "client_metadata": session.client_metadata
            }
            sessions.append(session_info)
        
        return {
            "status": "success",
            "total_active_sessions": len(sessions),
            "sessions": sessions,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting active sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Sessions retrieval error: {str(e)}")

@router.get("/sessions/{session_id}", response_model=Dict[str, Any])
async def get_session_details(session_id: str):
    """Obtener detalles de una sesión WebRTC específica"""
    try:
        session = webrtc_signaling_service.active_sessions.get(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        
        # Calcular duración
        duration = None
        if session.connected_at:
            end_time = session.ended_at or datetime.now()
            duration = (end_time - session.connected_at).total_seconds()
        
        return {
            "status": "success",
            "session": {
                "session_id": session.session_id,
                "client_id": session.client_id,
                "call_status": session.call_status.value,
                "ai_agent_type": session.ai_agent_type,
                "ai_agent_id": session.ai_agent_id,
                "created_at": session.created_at.isoformat(),
                "connected_at": session.connected_at.isoformat() if session.connected_at else None,
                "ended_at": session.ended_at.isoformat() if session.ended_at else None,
                "duration_seconds": duration,
                "client_metadata": session.client_metadata
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting session details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Session details error: {str(e)}")

@router.delete("/sessions/{session_id}", response_model=Dict[str, Any])
async def end_session(session_id: str):
    """Finalizar una sesión WebRTC específica"""
    try:
        session = webrtc_signaling_service.active_sessions.get(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        
        # Finalizar sesión
        if session.call_status not in [CallStatus.ENDED, CallStatus.FAILED]:
            from ..services.webrtc_signaling_service import SignalingMessage
            
            await webrtc_signaling_service.handle_call_ended(
                session.websocket,
                SignalingMessage(
                    type=SignalingMessageType.CALL_ENDED,
                    session_id=session_id,
                    client_id=session.client_id
                )
            )
        
        return {
            "status": "success",
            "message": f"Session {session_id} ended successfully",
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error ending session: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Session end error: {str(e)}")

@router.get("/agents", response_model=Dict[str, Any])
async def get_available_agents():
    """Obtener información de agentes IA disponibles"""
    try:
        agents = {}
        agent_types = ["sales", "support", "booking", "consultant"]
        
        for agent_type in agent_types:
            agent_info = await webrtc_signaling_service.get_agent_info(agent_type)
            agents[agent_type] = agent_info
        
        return {
            "status": "success",
            "total_agents": len(agents),
            "agents": agents,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting available agents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Agents retrieval error: {str(e)}")

@router.get("/agents/{agent_type}", response_model=Dict[str, Any])
async def get_agent_info(agent_type: str):
    """Obtener información de un agente IA específico"""
    try:
        valid_agents = ["sales", "support", "booking", "consultant"]
        
        if agent_type not in valid_agents:
            raise HTTPException(
                status_code=404, 
                detail=f"Agent type '{agent_type}' not found. Available: {valid_agents}"
            )
        
        agent_info = await webrtc_signaling_service.get_agent_info(agent_type)
        
        return {
            "status": "success",
            "agent_type": agent_type,
            "agent_info": agent_info,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting agent info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Agent info error: {str(e)}")

@router.get("/stats", response_model=WebRTCStatsModel)
async def get_webrtc_statistics():
    """Obtener estadísticas detalladas del servicio WebRTC"""
    try:
        if not webrtc_signaling_service.is_running:
            raise HTTPException(status_code=503, detail="WebRTC Signaling Service is not running")
        
        stats = webrtc_signaling_service.get_service_stats()
        
        return WebRTCStatsModel(**stats)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting WebRTC statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Statistics error: {str(e)}")

@router.post("/test-connection", response_model=Dict[str, Any])
async def test_webrtc_connection():
    """Probar conectividad del servicio WebRTC"""
    try:
        if not webrtc_signaling_service.is_running:
            return {
                "status": "failed",
                "message": "WebRTC Signaling Service is not running",
                "websocket_url": None,
                "is_reachable": False
            }
        
        # Test básico de conectividad
        stats = webrtc_signaling_service.get_service_stats()
        
        return {
            "status": "success",
            "message": "WebRTC Signaling Service is reachable",
            "websocket_url": f"ws://{webrtc_signaling_service.host}:{webrtc_signaling_service.port}",
            "is_reachable": True,
            "server_info": stats["server_info"],
            "test_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error testing WebRTC connection: {str(e)}")
        return {
            "status": "failed",
            "message": f"Connection test failed: {str(e)}",
            "websocket_url": None,
            "is_reachable": False,
            "test_timestamp": datetime.now().isoformat()
        }

@router.get("/connection-info", response_model=Dict[str, Any])
async def get_connection_info():
    """Obtener información de conexión WebRTC para clientes"""
    try:
        return {
            "websocket_url": f"ws://{webrtc_signaling_service.host}:{webrtc_signaling_service.port}",
            "supported_protocols": ["WebSocket"],
            "supported_codecs": ["OPUS", "PCMU", "PCMA"],
            "max_concurrent_sessions": 1000,
            "connection_timeout": 30,
            "ping_interval": 20,
            "supported_message_types": [msg_type.value for msg_type in SignalingMessageType],
            "available_agents": ["sales", "support", "booking", "consultant"],
            "service_status": "running" if webrtc_signaling_service.is_running else "stopped",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting connection info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Connection info error: {str(e)}")

# ============== HEALTH CHECK ENDPOINTS ==============

@router.get("/health", response_model=Dict[str, Any])
async def webrtc_health_check():
    """Health check específico para WebRTC Signaling"""
    try:
        health_status = {
            "service": "WebRTC Signaling Service",
            "status": "healthy" if webrtc_signaling_service.is_running else "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "checks": {
                "service_running": webrtc_signaling_service.is_running,
                "websocket_server": webrtc_signaling_service.server is not None,
                "active_sessions": len(webrtc_signaling_service.active_sessions),
                "total_sessions_handled": webrtc_signaling_service.stats.get("total_sessions", 0)
            }
        }
        
        if webrtc_signaling_service.is_running:
            stats = webrtc_signaling_service.get_service_stats()
            health_status["performance_metrics"] = {
                "success_rate": stats["connection_stats"]["success_rate"],
                "average_call_duration": stats["call_stats"]["average_call_duration"],
                "active_calls": stats["session_stats"]["active_calls"]
            }
        
        return health_status
        
    except Exception as e:
        logger.error(f"❌ Error in WebRTC health check: {str(e)}")
        return {
            "service": "WebRTC Signaling Service",
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# ============== ERROR HANDLERS ==============

@router.get("/debug/sessions-dump", response_model=Dict[str, Any])
async def debug_sessions_dump():
    """DEBUG: Volcar todas las sesiones para debugging (solo desarrollo)"""
    try:
        sessions_data = {}
        
        for session_id, session in webrtc_signaling_service.active_sessions.items():
            sessions_data[session_id] = {
                "session_id": session.session_id,
                "client_id": session.client_id,
                "call_status": session.call_status.value,
                "ai_agent_type": session.ai_agent_type,
                "ai_agent_id": session.ai_agent_id,
                "created_at": session.created_at.isoformat(),
                "connected_at": session.connected_at.isoformat() if session.connected_at else None,
                "ended_at": session.ended_at.isoformat() if session.ended_at else None,
                "client_metadata": session.client_metadata,
                "websocket_open": not session.websocket.closed if hasattr(session.websocket, 'closed') else "unknown"
            }
        
        return {
            "status": "success",
            "debug_info": {
                "total_active_sessions": len(sessions_data),
                "sessions": sessions_data,
                "client_sessions_map": webrtc_signaling_service.client_sessions,
                "websocket_sessions_count": len(webrtc_signaling_service.websocket_sessions),
                "service_stats": webrtc_signaling_service.stats
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error in debug sessions dump: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Debug error: {str(e)}")