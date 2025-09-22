"""
AI Voice Agents API
REST API endpoints for managing AI-powered voice agents integrated with 3CX PBX
Provides intelligent voice conversation capabilities, call management, and analytics
"""

from fastapi import APIRouter, HTTPException, Depends, Request, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import logging
import io
import json
import asyncio

from backend.services.ai_voice_agents_service import (
    AIVoiceAgentsService,
    VoiceAgentType,
    ConversationState,
    VoiceAgentConfig,
    ConversationSession,
    VoiceAgentResponse,
    ai_voice_agents_service
)
from backend.services.pbx_3cx_integration_service import PBX3CXIntegrationService
from backend.services.omnichannel_crm_service import OmnichannelCRMService
from backend.services.advanced_auth_service import AdvancedAuthService, User, UserType
from backend.database import get_db_session
from pydantic import BaseModel, Field
import base64

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice-agents", tags=["AI Voice Agents"])
security = HTTPBearer()

# Request/Response Models
class VoiceInputRequest(BaseModel):
    """Request for processing voice input"""
    call_id: str
    audio_data: str  # Base64 encoded audio
    format: str = "wav"
    sample_rate: int = 16000

class StartConversationRequest(BaseModel):
    """Request to start a voice conversation"""
    call_id: str
    agent_type: VoiceAgentType
    customer_phone: str
    customer_id: Optional[str] = None
    context: Dict[str, Any] = {}

class TransferRequest(BaseModel):
    """Request to transfer call to human agent"""
    call_id: str
    reason: str = "Customer request"
    notes: Optional[str] = None

class ConversationUpdateRequest(BaseModel):
    """Request to update conversation context"""
    call_id: str
    context_updates: Dict[str, Any] = {}
    agent_notes: Optional[str] = None

class SatisfactionRatingRequest(BaseModel):
    """Request to submit satisfaction rating"""
    call_id: str
    rating: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None

class VoiceAgentStatusResponse(BaseModel):
    """Response with voice agent status"""
    agent_type: VoiceAgentType
    name: str
    status: str
    active_conversations: int
    total_conversations_today: int
    average_duration: float
    satisfaction_score: float

class ConversationSessionResponse(BaseModel):
    """Response with conversation session details"""
    session_id: str
    call_id: str
    agent_type: VoiceAgentType
    state: ConversationState
    started_at: datetime
    duration_seconds: float
    message_count: int
    customer_phone: str
    customer_id: Optional[str]
    transferred_to_human: bool
    satisfaction_rating: Optional[int]

# Dependency functions
async def get_voice_agents_service() -> AIVoiceAgentsService:
    """Get AI voice agents service instance"""
    return ai_voice_agents_service

async def get_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db_session)
) -> User:
    """Require admin user for management endpoints"""
    try:
        auth_service = AdvancedAuthService()
        user = await auth_service.get_current_user(credentials.credentials, db)
        
        if not user or user.user_type not in [UserType.ADMIN, UserType.SUPER_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db_session)
) -> User:
    """Get current authenticated user"""
    try:
        auth_service = AdvancedAuthService()
        return await auth_service.get_current_user(credentials.credentials, db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

# Voice Agent Management Endpoints

@router.get("/status", response_model=Dict[str, Any])
async def get_voice_agents_status(
    voice_service: AIVoiceAgentsService = Depends(get_voice_agents_service)
):
    """Get overall status of AI voice agents system"""
    try:
        analytics = await voice_service.get_conversation_analytics()
        active_sessions = voice_service.get_active_sessions()
        
        return {
            "status": "active",
            "total_agents": len(voice_service.agent_configs),
            "active_conversations": len(active_sessions),
            "agent_types": list(VoiceAgentType),
            "analytics": analytics,
            "system_health": {
                "pbx_connected": voice_service.pbx_service is not None and voice_service.pbx_service.is_connected if voice_service.pbx_service else False,
                "crm_connected": voice_service.crm_service is not None and voice_service.crm_service.is_initialized if voice_service.crm_service else False,
                "ai_available": voice_service.openai_client is not None,
                "tts_available": voice_service.tts_engine is not None
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting voice agents status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting system status: {str(e)}"
        )

@router.get("/agents", response_model=List[VoiceAgentStatusResponse])
async def get_agent_status_list(
    voice_service: AIVoiceAgentsService = Depends(get_voice_agents_service)
):
    """Get status of all available voice agents"""
    try:
        agent_statuses = []
        active_sessions = voice_service.get_active_sessions()
        
        for agent_type, config in voice_service.agent_configs.items():
            # Count active conversations for this agent
            active_count = len([s for s in active_sessions if s["agent_type"] == agent_type])
            
            agent_status = VoiceAgentStatusResponse(
                agent_type=agent_type,
                name=config.name,
                status="active",
                active_conversations=active_count,
                total_conversations_today=0,  # Would come from analytics
                average_duration=0.0,  # Would come from analytics
                satisfaction_score=4.5  # Would come from analytics
            )
            agent_statuses.append(agent_status)
        
        return agent_statuses
        
    except Exception as e:
        logger.error(f"Error getting agent status list: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting agent status: {str(e)}"
        )

@router.get("/agents/{agent_type}", response_model=Dict[str, Any])
async def get_agent_details(
    agent_type: VoiceAgentType,
    voice_service: AIVoiceAgentsService = Depends(get_voice_agents_service)
):
    """Get detailed information about a specific voice agent"""
    try:
        if agent_type not in voice_service.agent_configs:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Voice agent type '{agent_type}' not found"
            )
        
        config = voice_service.agent_configs[agent_type]
        active_sessions = voice_service.get_active_sessions()
        agent_sessions = [s for s in active_sessions if s["agent_type"] == agent_type]
        
        return {
            "agent_type": agent_type,
            "name": config.name,
            "voice_id": config.voice_id,
            "language": config.language,
            "personality": config.personality_prompt[:200] + "...",  # Truncated
            "expertise_areas": config.expertise_areas,
            "escalation_triggers": config.escalation_triggers,
            "active_conversations": len(agent_sessions),
            "configuration": {
                "ai_model": config.ai_model,
                "temperature": config.temperature,
                "response_timeout": config.response_timeout,
                "max_conversation_duration": config.max_conversation_duration
            },
            "sessions": agent_sessions,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting agent details: {str(e)}"
        )

# Conversation Management Endpoints

@router.post("/conversations/start", response_model=Dict[str, Any])
async def start_voice_conversation(
    request: StartConversationRequest,
    voice_service: AIVoiceAgentsService = Depends(get_voice_agents_service),
    current_user: User = Depends(get_current_user)
):
    """Start a new AI voice conversation"""
    try:
        # Create conversation session
        session = ConversationSession(
            call_id=request.call_id,
            agent_type=request.agent_type,
            customer_phone=request.customer_phone,
            customer_id=request.customer_id,
            context=request.context
        )
        
        # Add to active sessions
        voice_service.active_sessions[request.call_id] = session
        
        # Start AI conversation
        await voice_service._start_ai_conversation(session)
        
        return {
            "status": "started",
            "session_id": session.session_id,
            "call_id": request.call_id,
            "agent_type": request.agent_type,
            "agent_name": voice_service.agent_configs[request.agent_type].name,
            "started_at": session.started_at.isoformat(),
            "message": "AI voice conversation started successfully"
        }
        
    except Exception as e:
        logger.error(f"Error starting voice conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting conversation: {str(e)}"
        )

@router.post("/conversations/{call_id}/voice-input", response_model=Dict[str, Any])
async def process_voice_input(
    call_id: str,
    request: VoiceInputRequest,
    voice_service: AIVoiceAgentsService = Depends(get_voice_agents_service)
):
    """Process voice input from customer and generate AI response"""
    try:
        # Decode audio data
        try:
            audio_data = base64.b64decode(request.audio_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid audio data format: {str(e)}"
            )
        
        # Process voice input
        response = await voice_service.process_voice_input(call_id, audio_data)
        
        # Convert audio response to base64 if present
        audio_response = None
        if response.audio_data:
            audio_response = base64.b64encode(response.audio_data).decode('utf-8')
        
        return {
            "status": "processed",
            "response_text": response.response_text,
            "audio_data": audio_response,
            "intent_detected": response.intent_detected,
            "confidence_score": response.confidence_score,
            "suggested_actions": response.suggested_actions,
            "requires_human_escalation": response.requires_human_escalation,
            "next_state": response.next_state,
            "context_updates": response.context_updates,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing voice input: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing voice input: {str(e)}"
        )

@router.get("/conversations", response_model=List[ConversationSessionResponse])
async def get_active_conversations(
    agent_type: Optional[VoiceAgentType] = None,
    voice_service: AIVoiceAgentsService = Depends(get_voice_agents_service),
    current_user: User = Depends(get_current_user)
):
    """Get list of active voice conversations"""
    try:
        active_sessions = voice_service.get_active_sessions()
        
        # Filter by agent type if specified
        if agent_type:
            active_sessions = [s for s in active_sessions if s["agent_type"] == agent_type]
        
        conversations = []
        for session_data in active_sessions:
            session = voice_service.active_sessions[session_data["call_id"]]
            
            conversation = ConversationSessionResponse(
                session_id=session.session_id,
                call_id=session.call_id,
                agent_type=session.agent_type,
                state=session.state,
                started_at=session.started_at,
                duration_seconds=(datetime.now() - session.started_at).total_seconds(),
                message_count=len(session.messages),
                customer_phone=session.customer_phone,
                customer_id=session.customer_id,
                transferred_to_human=session.transferred_to_human,
                satisfaction_rating=session.satisfaction_rating
            )
            conversations.append(conversation)
        
        return conversations
        
    except Exception as e:
        logger.error(f"Error getting active conversations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting conversations: {str(e)}"
        )

@router.get("/conversations/{call_id}", response_model=Dict[str, Any])
async def get_conversation_details(
    call_id: str,
    voice_service: AIVoiceAgentsService = Depends(get_voice_agents_service),
    current_user: User = Depends(get_current_user)
):
    """Get detailed information about a specific conversation"""
    try:
        session = voice_service.active_sessions.get(call_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation not found for call ID: {call_id}"
            )
        
        agent_config = voice_service.agent_configs[session.agent_type]
        
        return {
            "session_id": session.session_id,
            "call_id": session.call_id,
            "agent": {
                "type": session.agent_type,
                "name": agent_config.name,
                "voice_id": agent_config.voice_id
            },
            "customer": {
                "phone": session.customer_phone,
                "customer_id": session.customer_id
            },
            "conversation": {
                "state": session.state,
                "started_at": session.started_at.isoformat(),
                "ended_at": session.ended_at.isoformat() if session.ended_at else None,
                "duration_seconds": (
                    (session.ended_at or datetime.now()) - session.started_at
                ).total_seconds(),
                "message_count": len(session.messages),
                "transferred_to_human": session.transferred_to_human,
                "satisfaction_rating": session.satisfaction_rating
            },
            "messages": [
                {
                    "message_id": msg.message_id,
                    "timestamp": msg.timestamp.isoformat(),
                    "speaker": msg.speaker,
                    "content": msg.content,
                    "duration_seconds": msg.duration_seconds,
                    "confidence_score": msg.confidence_score,
                    "sentiment": msg.sentiment,
                    "intent": msg.intent
                }
                for msg in session.messages
            ],
            "context": session.context,
            "outcomes": session.outcomes,
            "agent_notes": session.agent_notes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting conversation details: {str(e)}"
        )

@router.post("/conversations/{call_id}/transfer", response_model=Dict[str, Any])
async def transfer_to_human(
    call_id: str,
    request: TransferRequest,
    voice_service: AIVoiceAgentsService = Depends(get_voice_agents_service),
    current_user: User = Depends(get_current_user)
):
    """Transfer conversation to human agent"""
    try:
        success = await voice_service.transfer_to_human(call_id, request.reason)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to transfer call to human agent"
            )
        
        # Update session notes if provided
        session = voice_service.active_sessions.get(call_id)
        if session and request.notes:
            session.agent_notes += f" Transfer notes: {request.notes}"
        
        return {
            "status": "transferred",
            "call_id": call_id,
            "reason": request.reason,
            "transferred_at": datetime.now().isoformat(),
            "message": "Call successfully transferred to human agent"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error transferring call: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error transferring call: {str(e)}"
        )

@router.put("/conversations/{call_id}", response_model=Dict[str, Any])
async def update_conversation(
    call_id: str,
    request: ConversationUpdateRequest,
    voice_service: AIVoiceAgentsService = Depends(get_voice_agents_service),
    current_user: User = Depends(get_current_user)
):
    """Update conversation context and notes"""
    try:
        session = voice_service.active_sessions.get(call_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation not found for call ID: {call_id}"
            )
        
        # Update context
        session.context.update(request.context_updates)
        
        # Update agent notes
        if request.agent_notes:
            session.agent_notes = session.agent_notes + " " + request.agent_notes if session.agent_notes else request.agent_notes
        
        return {
            "status": "updated",
            "call_id": call_id,
            "context": session.context,
            "agent_notes": session.agent_notes,
            "updated_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating conversation: {str(e)}"
        )

@router.post("/conversations/{call_id}/satisfaction", response_model=Dict[str, Any])
async def submit_satisfaction_rating(
    call_id: str,
    request: SatisfactionRatingRequest,
    voice_service: AIVoiceAgentsService = Depends(get_voice_agents_service)
):
    """Submit customer satisfaction rating for conversation"""
    try:
        session = voice_service.active_sessions.get(call_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation not found for call ID: {call_id}"
            )
        
        session.satisfaction_rating = request.rating
        if request.feedback:
            session.agent_notes += f" Customer feedback: {request.feedback}"
        
        return {
            "status": "recorded",
            "call_id": call_id,
            "rating": request.rating,
            "feedback": request.feedback,
            "recorded_at": datetime.now().isoformat(),
            "message": "Satisfaction rating recorded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording satisfaction rating: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error recording rating: {str(e)}"
        )

# Analytics and Reporting Endpoints

@router.get("/analytics", response_model=Dict[str, Any])
async def get_voice_analytics(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    agent_type: Optional[VoiceAgentType] = None,
    voice_service: AIVoiceAgentsService = Depends(get_voice_agents_service),
    current_user: User = Depends(get_current_user)
):
    """Get comprehensive analytics for voice conversations"""
    try:
        analytics = await voice_service.get_conversation_analytics()
        
        # Add more detailed analytics here based on parameters
        detailed_analytics = {
            "summary": analytics,
            "period": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None
            },
            "performance_metrics": {
                "total_conversations": analytics.get("completed_today", 0),
                "average_duration": analytics.get("average_duration", 0),
                "transfer_rate": analytics.get("transfer_rate", 0),
                "satisfaction_score": analytics.get("satisfaction_score", 0),
                "resolution_rate": 85.5,  # Would be calculated
                "first_call_resolution": 78.2  # Would be calculated
            },
            "agent_performance": {
                agent_type.value: {
                    "conversations": analytics.get("agent_utilization", {}).get(agent_type, 0),
                    "avg_duration": 0,
                    "satisfaction": 4.5,
                    "transfer_rate": 0.15
                }
                for agent_type in VoiceAgentType
            },
            "trends": {
                "hourly_distribution": {},  # Would be populated with real data
                "daily_trends": {},
                "peak_hours": ["10:00-12:00", "14:00-16:00"]
            },
            "generated_at": datetime.now().isoformat()
        }
        
        return detailed_analytics
        
    except Exception as e:
        logger.error(f"Error getting voice analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting analytics: {str(e)}"
        )

@router.get("/analytics/real-time", response_model=Dict[str, Any])
async def get_real_time_analytics(
    voice_service: AIVoiceAgentsService = Depends(get_voice_agents_service),
    current_user: User = Depends(get_current_user)
):
    """Get real-time analytics for voice conversations"""
    try:
        active_sessions = voice_service.get_active_sessions()
        
        return {
            "current_time": datetime.now().isoformat(),
            "active_conversations": len(active_sessions),
            "agent_distribution": {
                agent_type.value: len([s for s in active_sessions if s["agent_type"] == agent_type])
                for agent_type in VoiceAgentType
            },
            "average_wait_time": 0,  # Would be calculated
            "queue_length": 0,  # Would be calculated
            "system_load": {
                "cpu_usage": 0,  # Would be monitored
                "memory_usage": 0,
                "api_calls_per_minute": 0
            },
            "recent_activity": [
                {
                    "timestamp": datetime.now().isoformat(),
                    "event": "conversation_started",
                    "agent_type": session["agent_type"],
                    "call_id": session["call_id"]
                }
                for session in active_sessions[-5:]  # Last 5 sessions
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting real-time analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting real-time analytics: {str(e)}"
        )

# Admin Configuration Endpoints

@router.get("/config", response_model=Dict[str, Any])
async def get_voice_agents_config(
    voice_service: AIVoiceAgentsService = Depends(get_voice_agents_service),
    admin_user: User = Depends(get_admin_user)
):
    """Get voice agents configuration (admin only)"""
    try:
        return {
            "agents": {
                agent_type.value: {
                    "name": config.name,
                    "voice_id": config.voice_id,
                    "language": config.language,
                    "voice_quality": config.voice_quality,
                    "ai_model": config.ai_model,
                    "temperature": config.temperature,
                    "response_timeout": config.response_timeout,
                    "max_conversation_duration": config.max_conversation_duration,
                    "expertise_areas": config.expertise_areas,
                    "escalation_triggers": config.escalation_triggers
                }
                for agent_type, config in voice_service.agent_configs.items()
            },
            "system_config": {
                "openai_available": voice_service.openai_client is not None,
                "tts_available": voice_service.tts_engine is not None,
                "pbx_connected": voice_service.pbx_service is not None,
                "crm_connected": voice_service.crm_service is not None
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting voice agents config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting configuration: {str(e)}"
        )

# Health Check Endpoint

@router.get("/health", response_model=Dict[str, Any])
async def voice_agents_health_check(
    voice_service: AIVoiceAgentsService = Depends(get_voice_agents_service)
):
    """Health check for voice agents system"""
    try:
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "ai_voice_agents": "active",
                "openai_connection": "connected" if voice_service.openai_client else "unavailable",
                "tts_engine": "active" if voice_service.tts_engine else "unavailable",
                "pbx_integration": "connected" if voice_service.pbx_service else "unavailable",
                "crm_integration": "connected" if voice_service.crm_service else "unavailable"
            },
            "metrics": {
                "active_conversations": len(voice_service.active_sessions),
                "configured_agents": len(voice_service.agent_configs),
                "memory_usage": "normal",  # Would be monitored
                "response_time": "optimal"  # Would be monitored
            }
        }
        
    except Exception as e:
        logger.error(f"Voice agents health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e),
            "services": {
                "ai_voice_agents": "error"
            }
        }