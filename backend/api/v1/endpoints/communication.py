"""
Communication API Endpoints
============================

Endpoints para el sistema de comunicación inteligente:
- Webhooks para canales (WhatsApp, Telegram, etc.)
- Gestión de agentes humanos
- Estado de colas
- Métricas y analytics
"""

import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ....database.deps import get_db
from ....communication.multi_channel_gateway import MultiChannelGateway, Channel
from ....communication.intelligent_router import IntelligentRouter, Department
from ....communication.ai_sales_agent import AISalesAgent
from ....communication.human_agent_queue import HumanAgentQueue, AgentStatus
from ....ai.intelligent_chatbot import IntelligentChatbot

logger = logging.getLogger(__name__)

router = APIRouter()

# Instancias globales (en producción, usar dependency injection)
_gateway: Optional[MultiChannelGateway] = None
_router: Optional[IntelligentRouter] = None
_sales_agent: Optional[AISalesAgent] = None
_human_queue: Optional[HumanAgentQueue] = None
_chatbot: Optional[IntelligentChatbot] = None


def get_gateway() -> MultiChannelGateway:
    """Obtiene instancia del gateway"""
    global _gateway, _router, _sales_agent, _human_queue, _chatbot
    
    if _gateway is None:
        # Inicializar componentes
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
    
    return _gateway


def get_human_queue() -> HumanAgentQueue:
    """Obtiene instancia de la cola de humanos"""
    global _human_queue
    
    if _human_queue is None:
        _human_queue = HumanAgentQueue()
    
    return _human_queue


# ========================================
# Webhooks para Canales
# ========================================

@router.post("/webhook/whatsapp")
async def whatsapp_webhook(
    request: Request,
    gateway: MultiChannelGateway = Depends(get_gateway),
):
    """
    Webhook para WhatsApp Business API
    
    Recibe mensajes entrantes de WhatsApp
    """
    try:
        data = await request.json()
        
        result = await gateway.process_incoming_message(
            channel=Channel.WHATSAPP,
            raw_message=data,
        )
        
        return {"status": "success", "result": result}
        
    except Exception as e:
        logger.error(f"Error processing WhatsApp webhook: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/webhook/whatsapp")
async def whatsapp_webhook_verify(
    request: Request,
    gateway: MultiChannelGateway = Depends(get_gateway),
):
    """
    Verificación de webhook de WhatsApp
    
    Facebook requiere verificación GET en setup
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    # Verificar token (debería venir de configuración)
    # Por ahora, aceptar cualquier token
    if mode == "subscribe" and challenge:
        logger.info("WhatsApp webhook verified")
        return int(challenge)
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid verification"
    )


@router.post("/webhook/telegram")
async def telegram_webhook(
    request: Request,
    gateway: MultiChannelGateway = Depends(get_gateway),
):
    """Webhook para Telegram Bot API"""
    try:
        data = await request.json()
        
        result = await gateway.process_incoming_message(
            channel=Channel.TELEGRAM,
            raw_message=data,
        )
        
        return {"ok": True}
        
    except Exception as e:
        logger.error(f"Error processing Telegram webhook: {e}", exc_info=True)
        return {"ok": False, "error": str(e)}


@router.post("/webhook/facebook")
async def facebook_webhook(
    request: Request,
    gateway: MultiChannelGateway = Depends(get_gateway),
):
    """Webhook para Facebook Messenger"""
    try:
        data = await request.json()
        
        result = await gateway.process_incoming_message(
            channel=Channel.FACEBOOK,
            raw_message=data,
        )
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Error processing Facebook webhook: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ========================================
# Gestión de Agentes Humanos
# ========================================

@router.post("/agents/register")
async def register_agent(
    agent_data: Dict[str, Any],
    queue: HumanAgentQueue = Depends(get_human_queue),
):
    """
    Registra un nuevo agente humano
    
    Payload:
    {
        "agent_id": "agent_001",
        "name": "Juan Pérez",
        "email": "juan@example.com",
        "departments": ["customer_service", "sales"],
        "max_concurrent": 3,
        "skills": ["spanish", "english", "sales"]
    }
    """
    try:
        departments = [Department(d) for d in agent_data.get("departments", [])]
        
        agent = await queue.register_agent(
            agent_id=agent_data["agent_id"],
            name=agent_data["name"],
            email=agent_data["email"],
            departments=departments,
            max_concurrent=agent_data.get("max_concurrent", 3),
            skills=agent_data.get("skills", []),
        )
        
        return {
            "status": "registered",
            "agent": {
                "agent_id": agent.agent_id,
                "name": agent.name,
                "departments": [d.value for d in agent.departments],
                "status": agent.status.value,
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
    status_data: Dict[str, str],
    queue: HumanAgentQueue = Depends(get_human_queue),
):
    """
    Actualiza el estado de un agente
    
    Payload:
    {
        "status": "available" | "busy" | "away" | "offline"
    }
    """
    try:
        new_status = AgentStatus(status_data["status"])
        
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


@router.post("/conversations/{conversation_id}/complete")
async def complete_conversation(
    conversation_id: str,
    completion_data: Dict[str, Any],
    queue: HumanAgentQueue = Depends(get_human_queue),
):
    """
    Marca una conversación como completada
    
    Payload:
    {
        "success": true,
        "notes": "Cliente realizó reserva"
    }
    """
    try:
        await queue.complete_conversation(
            conversation_id=conversation_id,
            success=completion_data.get("success", True),
            notes=completion_data.get("notes"),
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
    message_data: Dict[str, Any],
    gateway: MultiChannelGateway = Depends(get_gateway),
):
    """
    Envía mensaje desde un agente humano
    
    Payload:
    {
        "agent_id": "agent_001",
        "message": "Texto del mensaje"
    }
    """
    try:
        result = await gateway.send_agent_message(
            conversation_id=conversation_id,
            agent_id=message_data["agent_id"],
            message=message_data["message"],
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error sending agent message: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ========================================
# Estado y Métricas
# ========================================

@router.get("/queue/status")
async def get_queue_status(
    department: Optional[str] = None,
    queue: HumanAgentQueue = Depends(get_human_queue),
):
    """
    Obtiene el estado actual de las colas
    
    Query params:
    - department: Filtrar por departamento (opcional)
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


@router.get("/agents/performance")
async def get_agent_performance(
    agent_id: Optional[str] = None,
    queue: HumanAgentQueue = Depends(get_human_queue),
):
    """
    Obtiene métricas de performance de agentes
    
    Query params:
    - agent_id: Filtrar por agente (opcional)
    """
    try:
        performance = await queue.get_agent_performance(agent_id)
        
        return performance
        
    except Exception as e:
        logger.error(f"Error getting agent performance: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/conversations/{conversation_id}/history")
async def get_conversation_history(
    conversation_id: str,
    limit: int = 50,
    gateway: MultiChannelGateway = Depends(get_gateway),
):
    """Obtiene historial de una conversación"""
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
# Configuración y Testing
# ========================================

@router.post("/test/route-message")
async def test_route_message(
    test_data: Dict[str, Any],
    gateway: MultiChannelGateway = Depends(get_gateway),
):
    """
    Endpoint de testing para probar routing
    
    Payload:
    {
        "message": "Quiero reservar un viaje a Cancún",
        "user_id": "test_user_123",
        "channel": "whatsapp"
    }
    """
    try:
        # Simular mensaje normalizado
        from ....communication.multi_channel_gateway import NormalizedMessage
        from datetime import datetime
        
        normalized = NormalizedMessage(
            message_id="test_" + str(datetime.now().timestamp()),
            channel=Channel(test_data.get("channel", "whatsapp")),
            user_id=test_data["user_id"],
            username=test_data.get("username"),
            message_text=test_data["message"],
            timestamp=datetime.now(),
            attachments=[],
            metadata={},
            channel_user_id=test_data["user_id"],
            channel_conversation_id=test_data["user_id"],
        )
        
        # Procesar
        context = await gateway._get_or_create_context(normalized)
        routing_decision = await gateway.router.route_message(
            message=normalized.message_text,
            user_id=normalized.user_id,
            session_id=context.session_id,
            metadata={"channel": normalized.channel.value},
        )
        
        return {
            "status": "success",
            "routing_decision": routing_decision,
            "context": context.to_dict(),
        }
        
    except Exception as e:
        logger.error(f"Error in test route: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
