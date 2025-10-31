"""
Intelligent Communication API
==============================

API endpoints for intelligent multi-channel communication system with:
- Time waster detection ("preguntones")
- Smart department routing
- Dual routing modes (AI_FIRST vs HUMAN_DIRECT)
- Contact information collection
- AI sales agent with escalation
- Human agent queue management
"""

import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.models.rbac_models import User
from backend.auth.rbac_middleware import get_current_active_user, PermissionRequiredDep
from backend.config.database import get_db
from backend.communication.multi_channel_gateway import MultiChannelGateway, Channel
from backend.communication.intelligent_router import IntelligentRouter, Department, RoutingMode
from backend.communication.ai_sales_agent import AISalesAgent
from backend.communication.human_agent_queue import HumanAgentQueue, AgentStatus
from backend.ai.intelligent_chatbot import IntelligentChatbot

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intelligent-communication", tags=["Intelligent Communication"])

# Global instances (in production, use proper DI)
_gateway: Optional[MultiChannelGateway] = None
_router: Optional[IntelligentRouter] = None
_sales_agent: Optional[AISalesAgent] = None
_human_queue: Optional[HumanAgentQueue] = None
_chatbot: Optional[IntelligentChatbot] = None


def initialize_communication_system():
    """Initialize communication system components"""
    global _gateway, _router, _sales_agent, _human_queue, _chatbot
    
    if _gateway is None:
        _chatbot = IntelligentChatbot()
        _router = IntelligentRouter.get_instance()
        _sales_agent = AISalesAgent(_chatbot)
        _human_queue = HumanAgentQueue()
        _gateway = MultiChannelGateway(
            router=_router,
            chatbot=_chatbot,
            sales_agent=_sales_agent,
            human_queue=_human_queue,
        )
        logger.info("Communication system initialized")


def get_gateway() -> MultiChannelGateway:
    """Get gateway instance"""
    initialize_communication_system()
    return _gateway


def get_human_queue() -> HumanAgentQueue:
    """Get human queue instance"""
    initialize_communication_system()
    return _human_queue


# Pydantic Models
class AgentRegistration(BaseModel):
    agent_id: str
    name: str
    email: str
    departments: List[str]
    max_concurrent: int = 3
    skills: Optional[List[str]] = []


class AgentStatusUpdate(BaseModel):
    status: str  # available, busy, away, offline


class ConversationCompletion(BaseModel):
    success: bool = True
    notes: Optional[str] = None


class AgentMessage(BaseModel):
    agent_id: str
    message: str


class TestMessage(BaseModel):
    message: str
    user_id: str
    channel: str = "whatsapp"
    username: Optional[str] = None


class ConfigUpdate(BaseModel):
    routing_mode: str  # ai_first, human_direct, ai_only, hybrid
    time_waster_threshold: Optional[float] = None
    max_ai_attempts: Optional[int] = None


# ========================================
# Webhooks for Channels
# ========================================

@router.post("/webhook/whatsapp", include_in_schema=False)
async def whatsapp_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    gateway: MultiChannelGateway = Depends(get_gateway),
):
    """
    WhatsApp Business API webhook
    Receives incoming messages from WhatsApp
    """
    try:
        data = await request.json()
        
        # Process in background to return 200 quickly
        background_tasks.add_task(
            gateway.process_incoming_message,
            Channel.WHATSAPP,
            data
        )
        
        return {"status": "received"}
        
    except Exception as e:
        logger.error(f"Error processing WhatsApp webhook: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}


@router.get("/webhook/whatsapp", include_in_schema=False)
async def whatsapp_webhook_verify(request: Request):
    """WhatsApp webhook verification (required by Facebook)"""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    # TODO: Verify token against configuration
    if mode == "subscribe" and challenge:
        logger.info("WhatsApp webhook verified")
        return int(challenge)
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid verification"
    )


@router.post("/webhook/telegram", include_in_schema=False)
async def telegram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    gateway: MultiChannelGateway = Depends(get_gateway),
):
    """Telegram Bot API webhook"""
    try:
        data = await request.json()
        
        background_tasks.add_task(
            gateway.process_incoming_message,
            Channel.TELEGRAM,
            data
        )
        
        return {"ok": True}
        
    except Exception as e:
        logger.error(f"Error processing Telegram webhook: {e}", exc_info=True)
        return {"ok": False}


@router.post("/webhook/facebook", include_in_schema=False)
async def facebook_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    gateway: MultiChannelGateway = Depends(get_gateway),
):
    """Facebook Messenger webhook"""
    try:
        data = await request.json()
        
        background_tasks.add_task(
            gateway.process_incoming_message,
            Channel.FACEBOOK,
            data
        )
        
        return {"status": "received"}
        
    except Exception as e:
        logger.error(f"Error processing Facebook webhook: {e}", exc_info=True)
        return {"status": "error"}


# ========================================
# Agent Management
# ========================================

@router.post("/agents/register")
async def register_agent(
    agent_data: AgentRegistration,
    current_user: User = Depends(PermissionRequiredDep("user_management", "create", "agents")),
    queue: HumanAgentQueue = Depends(get_human_queue),
):
    """
    Register a new human agent
    
    Departments:
    - customer_service: Customer service, reservations, client support
    - groups_quotes: Group bookings and quotations
    - general_info: General information queries
    - sales: Direct sales and purchase intent
    - technical_support: Technical issues
    - vip_service: VIP customer service
    """
    try:
        departments = [Department(d) for d in agent_data.departments]
        
        agent = await queue.register_agent(
            agent_id=agent_data.agent_id,
            name=agent_data.name,
            email=agent_data.email,
            departments=departments,
            max_concurrent=agent_data.max_concurrent,
            skills=agent_data.skills,
        )
        
        return {
            "status": "registered",
            "agent": {
                "agent_id": agent.agent_id,
                "name": agent.name,
                "email": agent.email,
                "departments": [d.value for d in agent.departments],
                "status": agent.status.value,
                "max_concurrent": agent.max_concurrent,
            }
        }
        
    except Exception as e:
        logger.error(f"Error registering agent: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/agents/{agent_id}/status")
async def update_agent_status(
    agent_id: str,
    status_update: AgentStatusUpdate,
    current_user: User = Depends(get_current_active_user),
    queue: HumanAgentQueue = Depends(get_human_queue),
):
    """
    Update agent status
    
    Status options:
    - available: Ready to receive conversations
    - busy: Handling conversations (automatic)
    - away: Temporarily unavailable
    - offline: Not available
    """
    try:
        new_status = AgentStatus(status_update.status)
        
        await queue.update_agent_status(agent_id, new_status)
        
        return {
            "status": "updated",
            "agent_id": agent_id,
            "new_status": new_status.value,
        }
        
    except Exception as e:
        logger.error(f"Error updating agent status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/agents/list")
async def list_agents(
    current_user: User = Depends(PermissionRequiredDep("user_management", "read", "agents")),
    queue: HumanAgentQueue = Depends(get_human_queue),
):
    """List all registered agents"""
    try:
        performance = await queue.get_agent_performance()
        return performance
        
    except Exception as e:
        logger.error(f"Error listing agents: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/agents/{agent_id}/performance")
async def get_agent_performance(
    agent_id: str,
    current_user: User = Depends(PermissionRequiredDep("analytics", "read", "agent_performance")),
    queue: HumanAgentQueue = Depends(get_human_queue),
):
    """Get performance metrics for specific agent"""
    try:
        performance = await queue.get_agent_performance(agent_id)
        return performance
        
    except Exception as e:
        logger.error(f"Error getting agent performance: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# ========================================
# Conversation Management
# ========================================

@router.post("/conversations/{conversation_id}/complete")
async def complete_conversation(
    conversation_id: str,
    completion: ConversationCompletion,
    current_user: User = Depends(get_current_active_user),
    queue: HumanAgentQueue = Depends(get_human_queue),
):
    """Mark conversation as completed"""
    try:
        await queue.complete_conversation(
            conversation_id=conversation_id,
            success=completion.success,
            notes=completion.notes,
        )
        
        return {
            "status": "completed",
            "conversation_id": conversation_id,
        }
        
    except Exception as e:
        logger.error(f"Error completing conversation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/conversations/{conversation_id}/message")
async def send_agent_message(
    conversation_id: str,
    message: AgentMessage,
    current_user: User = Depends(get_current_active_user),
    gateway: MultiChannelGateway = Depends(get_gateway),
):
    """Send message from human agent to customer"""
    try:
        result = await gateway.send_agent_message(
            conversation_id=conversation_id,
            agent_id=message.agent_id,
            message=message.message,
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error sending agent message: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/conversations/{conversation_id}/history")
async def get_conversation_history(
    conversation_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    gateway: MultiChannelGateway = Depends(get_gateway),
):
    """Get conversation history"""
    try:
        history = await gateway.get_conversation_history(
            conversation_id=conversation_id,
            limit=limit,
        )
        
        return {
            "conversation_id": conversation_id,
            "messages": history,
        }
        
    except Exception as e:
        logger.error(f"Error getting conversation history: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# ========================================
# Queue Status and Metrics
# ========================================

@router.get("/queue/status")
async def get_queue_status(
    department: Optional[str] = None,
    current_user: User = Depends(PermissionRequiredDep("system_monitoring", "read", "queue_status")),
    queue: HumanAgentQueue = Depends(get_human_queue),
):
    """
    Get current queue status
    
    Shows waiting customers, agent availability, and wait times per department
    """
    try:
        dept = Department(department) if department else None
        status_data = await queue.get_queue_status(dept)
        return status_data
        
    except Exception as e:
        logger.error(f"Error getting queue status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/metrics/routing")
async def get_routing_metrics(
    current_user: User = Depends(PermissionRequiredDep("analytics", "read", "routing_metrics")),
    gateway: MultiChannelGateway = Depends(get_gateway),
):
    """
    Get routing metrics
    
    Shows:
    - Total messages processed
    - Time wasters detected
    - AI vs Human routing distribution
    - Escalation rates
    - Department distribution
    """
    # TODO: Implement metrics collection
    return {
        "status": "not_implemented",
        "message": "Metrics collection will be implemented in next phase"
    }


# ========================================
# Configuration
# ========================================

@router.put("/config/routing-mode")
async def update_routing_mode(
    config: ConfigUpdate,
    current_user: User = Depends(PermissionRequiredDep("system_configuration", "update", "routing")),
):
    """
    Update routing configuration
    
    Routing modes:
    - ai_first: AI attempts to handle first, escalates if needed
    - human_direct: High-intent customers go directly to human
    - ai_only: Only AI (for testing or low-priority)
    - hybrid: AI and human work in parallel
    """
    try:
        initialize_communication_system()
        
        # Update router config
        mode = RoutingMode(config.routing_mode)
        
        # TODO: Persist configuration to database
        
        return {
            "status": "updated",
            "routing_mode": mode.value,
            "message": f"Routing mode updated to {mode.value}"
        }
        
    except Exception as e:
        logger.error(f"Error updating routing mode: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ========================================
# Testing
# ========================================

@router.post("/test/route-message")
async def test_route_message(
    test_message: TestMessage,
    current_user: User = Depends(PermissionRequiredDep("system_configuration", "execute", "testing")),
    gateway: MultiChannelGateway = Depends(get_gateway),
):
    """
    Test routing system with sample message
    
    Useful for testing:
    - Time waster detection
    - Department classification
    - Purchase intent scoring
    - Contact extraction
    - Routing decisions
    """
    try:
        from backend.communication.multi_channel_gateway import NormalizedMessage
        from datetime import datetime
        
        # Create normalized message
        normalized = NormalizedMessage(
            message_id=f"test_{datetime.now().timestamp()}",
            channel=Channel(test_message.channel),
            user_id=test_message.user_id,
            username=test_message.username,
            message_text=test_message.message,
            timestamp=datetime.now(),
            attachments=[],
            metadata={},
            channel_user_id=test_message.user_id,
            channel_conversation_id=test_message.user_id,
        )
        
        # Get or create context
        context = await gateway._get_or_create_context(normalized)
        
        # Route message
        routing_decision = await gateway.router.route_message(
            message=normalized.message_text,
            user_id=normalized.user_id,
            session_id=context.session_id,
            metadata={"channel": normalized.channel.value},
        )
        
        return {
            "status": "success",
            "test_message": test_message.message,
            "routing_decision": routing_decision,
            "context_summary": {
                "customer_type": context.customer_type.value,
                "department": context.department.value,
                "intent": context.intent.value,
                "purchase_signals": context.purchase_signals,
                "time_waster_score": context.time_waster_score,
                "contact_info": {
                    "name": context.contact_info.name,
                    "email": context.contact_info.email,
                    "phone": context.contact_info.phone,
                },
            }
        }
        
    except Exception as e:
        logger.error(f"Error in test route: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# Health check
@router.get("/health")
async def health_check():
    """Health check for communication system"""
    initialize_communication_system()
    
    return {
        "status": "healthy",
        "gateway": "initialized" if _gateway else "not_initialized",
        "router": "initialized" if _router else "not_initialized",
        "sales_agent": "initialized" if _sales_agent else "not_initialized",
        "human_queue": "initialized" if _human_queue else "not_initialized",
        "chatbot": "initialized" if _chatbot else "not_initialized",
    }
