"""
Multi-Channel Communication Gateway
====================================

Gateway unificado que:
1. Abstrae diferencias entre canales (WhatsApp, Telegram, etc.)
2. Normaliza mensajes entrantes a formato común
3. Enruta a través del IntelligentRouter
4. Envía respuestas al canal apropiado
5. Maneja webhooks y callbacks
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

from .intelligent_router import IntelligentRouter, ConversationContext
from .ai_sales_agent import AISalesAgent, SalesQualification
from .human_agent_queue import HumanAgentQueue
from ..ai.intelligent_chatbot import IntelligentChatbot

logger = logging.getLogger(__name__)


class Channel(str, Enum):
    """Canales de comunicación soportados"""
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    WEBCHAT = "webchat"
    SMS = "sms"
    EMAIL = "email"


@dataclass
class NormalizedMessage:
    """Mensaje normalizado de cualquier canal"""
    message_id: str
    channel: Channel
    user_id: str
    username: Optional[str]
    message_text: str
    timestamp: datetime
    attachments: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    
    # Información del canal
    channel_user_id: str  # ID en el canal específico
    channel_conversation_id: str  # ID de conversación en el canal


class MultiChannelGateway:
    """
    Gateway unificado para comunicación multicanal
    """
    
    def __init__(
        self,
        router: IntelligentRouter,
        chatbot: IntelligentChatbot,
        sales_agent: AISalesAgent,
        human_queue: HumanAgentQueue,
        redis_client=None,
    ):
        self.router = router
        self.chatbot = chatbot
        self.sales_agent = sales_agent
        self.human_queue = human_queue
        self.redis_client = redis_client
        
        # Channel connectors (serán inyectados)
        self.connectors: Dict[Channel, Any] = {}
        
        # Contextos activos
        self.active_contexts: Dict[str, ConversationContext] = {}
        self.sales_qualifications: Dict[str, SalesQualification] = {}
        
    def register_connector(self, channel: Channel, connector: Any):
        """Registra un conector de canal"""
        self.connectors[channel] = connector
        logger.info(f"Registered connector for {channel.value}")
    
    async def process_incoming_message(
        self,
        channel: Channel,
        raw_message: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Procesa un mensaje entrante de cualquier canal
        
        Flow:
        1. Normalizar mensaje
        2. Obtener o crear contexto de conversación
        3. Pasar por IntelligentRouter
        4. Si AI: procesar con AISalesAgent o Chatbot
        5. Si Humano: encolar para agente
        6. Enviar respuesta por el canal
        """
        
        try:
            # 1. Normalizar mensaje
            normalized = await self._normalize_message(channel, raw_message)
            
            # 2. Obtener contexto
            context = await self._get_or_create_context(normalized)
            
            # 3. Pasar por router inteligente
            routing_decision = await self.router.route_message(
                message=normalized.message_text,
                user_id=normalized.user_id,
                session_id=context.session_id,
                metadata={
                    "channel": channel.value,
                    "channel_user_id": normalized.channel_user_id,
                    "channel_conversation_id": normalized.channel_conversation_id,
                }
            )
            
            # 4. Procesar según decisión de routing
            response = await self._process_routing_decision(
                normalized,
                context,
                routing_decision,
            )
            
            # 5. Enviar respuesta
            await self._send_response(channel, normalized, response)
            
            # 6. Guardar contexto actualizado
            self.active_contexts[context.session_id] = context
            
            return {
                "status": "success",
                "routing_decision": routing_decision,
                "response": response,
            }
            
        except Exception as e:
            logger.error(f"Error processing message from {channel.value}: {e}", exc_info=True)
            
            # Enviar mensaje de error genérico
            error_response = {
                "response": (
                    "Disculpe, hemos experimentado un error técnico. "
                    "Por favor, intente nuevamente en un momento."
                ),
                "error": True,
            }
            
            try:
                await self._send_response(channel, normalized, error_response)
            except:
                pass
            
            return {
                "status": "error",
                "error": str(e),
            }
    
    async def _normalize_message(
        self,
        channel: Channel,
        raw_message: Dict[str, Any],
    ) -> NormalizedMessage:
        """Normaliza un mensaje de cualquier canal a formato común"""
        
        if channel not in self.connectors:
            raise ValueError(f"No connector registered for {channel.value}")
        
        connector = self.connectors[channel]
        
        # Cada conector implementa su propia normalización
        normalized = await connector.normalize_message(raw_message)
        
        return normalized
    
    async def _get_or_create_context(
        self,
        normalized: NormalizedMessage,
    ) -> ConversationContext:
        """Obtiene o crea un contexto de conversación"""
        
        # Usar channel_conversation_id como session_id
        session_id = f"{normalized.channel.value}:{normalized.channel_conversation_id}"
        
        if session_id in self.active_contexts:
            context = self.active_contexts[session_id]
            context.message_count += 1
            return context
        
        # Crear nuevo contexto
        context = ConversationContext(
            session_id=session_id,
            user_id=normalized.user_id,
            channel=normalized.channel.value,
        )
        
        # Si tenemos username, usarlo como nombre
        if normalized.username:
            context.contact_info.name = normalized.username
        
        return context
    
    async def _process_routing_decision(
        self,
        normalized: NormalizedMessage,
        context: ConversationContext,
        routing_decision: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Procesa la decisión de routing"""
        
        action = routing_decision.get("action")
        
        if action == "route_to_ai":
            # Determinar si usar sales agent o chatbot general
            if routing_decision.get("allow_escalation") and context.purchase_signals >= 2:
                # Usar AI Sales Agent
                return await self._process_with_sales_agent(normalized, context)
            else:
                # Usar chatbot general
                return await self._process_with_chatbot(normalized, context)
        
        elif action == "route_to_human":
            # Encolar para agente humano
            return await self._queue_for_human(normalized, context, routing_decision)
        
        elif action == "escalate_to_human":
            # Escalar desde AI a humano
            return await self._escalate_to_human(normalized, context, routing_decision)
        
        else:
            # Acción desconocida, usar chatbot
            return await self._process_with_chatbot(normalized, context)
    
    async def _process_with_sales_agent(
        self,
        normalized: NormalizedMessage,
        context: ConversationContext,
    ) -> Dict[str, Any]:
        """Procesa con AI Sales Agent"""
        
        # Obtener o crear qualification
        if context.session_id not in self.sales_qualifications:
            self.sales_qualifications[context.session_id] = SalesQualification()
        
        qualification = self.sales_qualifications[context.session_id]
        
        # Procesar
        response, updated_qualification, should_escalate = await self.sales_agent.process_sales_conversation(
            message=normalized.message_text,
            context=context,
            qualification=qualification,
        )
        
        # Actualizar qualification
        self.sales_qualifications[context.session_id] = updated_qualification
        
        # Si debe escalar, hacerlo
        if should_escalate:
            return await self._escalate_to_human(
                normalized,
                context,
                {
                    "reason": "AI sales agent escalation",
                    "qualification": qualification,
                }
            )
        
        return response
    
    async def _process_with_chatbot(
        self,
        normalized: NormalizedMessage,
        context: ConversationContext,
    ) -> Dict[str, Any]:
        """Procesa con chatbot general"""
        
        response = await self.chatbot.process_message(
            message_text=normalized.message_text,
            user_id=normalized.user_id,
            session_id=context.session_id,
            metadata={
                "channel": normalized.channel.value,
                "context": context.to_dict(),
            }
        )
        
        return response
    
    async def _queue_for_human(
        self,
        normalized: NormalizedMessage,
        context: ConversationContext,
        routing_decision: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Encola conversación para agente humano"""
        
        department = routing_decision.get("department")
        priority = routing_decision.get("priority", 3)
        reason = routing_decision.get("reason", "User request")
        
        # Generar resumen de la conversación
        ai_summary = self._generate_conversation_summary(context)
        
        # Encolar
        queued = await self.human_queue.queue_conversation(
            conversation_id=context.session_id,
            context=context,
            department=department,
            priority=priority,
            ai_summary=ai_summary,
        )
        
        # Generar respuesta para el usuario
        wait_time_minutes = int(queued.estimated_wait_time / 60) if queued.estimated_wait_time else 5
        
        response_text = (
            f"Gracias por su paciencia. Un especialista de nuestro equipo "
            f"atenderá su consulta en aproximadamente {wait_time_minutes} minutos. "
        )
        
        if context.contact_info.name:
            response_text = f"{context.contact_info.name}, " + response_text.lower()
        
        response_text += (
            "Mientras tanto, puede seguir enviando mensajes que serán "
            "revisados por el agente cuando lo atienda."
        )
        
        return {
            "response": response_text,
            "queued": True,
            "estimated_wait_time": queued.estimated_wait_time,
            "department": department.value,
        }
    
    async def _escalate_to_human(
        self,
        normalized: NormalizedMessage,
        context: ConversationContext,
        escalation_info: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Escala conversación de AI a humano"""
        
        reason = escalation_info.get("reason", "AI escalation")
        qualification = escalation_info.get("qualification")
        
        # Determinar departamento y prioridad
        if qualification and qualification.ready_to_buy:
            from .intelligent_router import Department
            department = Department.SALES
            priority = 2  # High priority
        else:
            department = escalation_info.get("department", context.department)
            priority = escalation_info.get("priority", 3)
        
        # Generar resumen detallado
        ai_summary = self._generate_conversation_summary(context, qualification)
        
        # Encolar
        queued = await self.human_queue.queue_conversation(
            conversation_id=context.session_id,
            context=context,
            department=department,
            priority=priority,
            ai_summary=ai_summary,
        )
        
        # Respuesta al usuario
        response_text = (
            "Entiendo su consulta. Para brindarle la mejor atención, "
            "voy a conectarlo con uno de nuestros especialistas. "
        )
        
        if queued.estimated_wait_time and queued.estimated_wait_time < 300:  # < 5 minutos
            response_text += "Estará con usted en un momento."
        else:
            wait_minutes = int(queued.estimated_wait_time / 60) if queued.estimated_wait_time else 5
            response_text += f"El tiempo estimado de espera es de {wait_minutes} minutos."
        
        return {
            "response": response_text,
            "escalated": True,
            "reason": reason,
            "estimated_wait_time": queued.estimated_wait_time,
        }
    
    def _generate_conversation_summary(
        self,
        context: ConversationContext,
        qualification: Optional[SalesQualification] = None,
    ) -> str:
        """Genera resumen de conversación para agente humano"""
        
        summary_parts = []
        
        # Info del cliente
        summary_parts.append(f"Cliente: {context.contact_info.name or 'Desconocido'}")
        if context.contact_info.email:
            summary_parts.append(f"Email: {context.contact_info.email}")
        if context.contact_info.phone:
            summary_parts.append(f"Teléfono: {context.contact_info.phone}")
        
        # Tipo de cliente
        summary_parts.append(f"Tipo: {context.customer_type.value}")
        
        # Departamento e intención
        summary_parts.append(f"Departamento: {context.department.value}")
        summary_parts.append(f"Intención: {context.intent.value}")
        
        # Métricas de conversación
        summary_parts.append(f"Mensajes: {context.message_count}")
        summary_parts.append(f"Señales de compra: {context.purchase_signals}")
        summary_parts.append(f"Preguntas: {context.question_count}")
        
        # Calificación de ventas si existe
        if qualification:
            summary_parts.append("\nCalificación de ventas:")
            summary_parts.append(f"- Score: {qualification.qualification_score:.1f}/10")
            if qualification.budget_range:
                summary_parts.append(f"- Presupuesto: {qualification.budget_range}")
            if qualification.timeline:
                summary_parts.append(f"- Timeline: {qualification.timeline}")
            if qualification.group_size:
                summary_parts.append(f"- Grupo: {qualification.group_size} personas")
            if qualification.destination_interest:
                summary_parts.append(f"- Destinos: {', '.join(qualification.destination_interest)}")
            summary_parts.append(f"- Listo para comprar: {'Sí' if qualification.ready_to_buy else 'No'}")
        
        # Contexto adicional
        if context.last_ai_response:
            summary_parts.append(f"\nÚltima respuesta AI: {context.last_ai_response[:100]}...")
        
        return "\n".join(summary_parts)
    
    async def _send_response(
        self,
        channel: Channel,
        normalized: NormalizedMessage,
        response: Dict[str, Any],
    ):
        """Envía respuesta a través del canal apropiado"""
        
        if channel not in self.connectors:
            logger.error(f"No connector for {channel.value}")
            return
        
        connector = self.connectors[channel]
        
        # Cada conector implementa su propio envío
        await connector.send_message(
            recipient_id=normalized.channel_user_id,
            message=response.get("response", ""),
            metadata=response,
        )
    
    async def send_agent_message(
        self,
        conversation_id: str,
        agent_id: str,
        message: str,
    ) -> Dict[str, Any]:
        """Envía mensaje desde un agente humano"""
        
        # Buscar conversación activa
        if conversation_id not in self.active_contexts:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        context = self.active_contexts[conversation_id]
        
        # Determinar canal
        channel_str, channel_conv_id = context.session_id.split(":", 1)
        channel = Channel(channel_str)
        
        if channel not in self.connectors:
            raise ValueError(f"No connector for {channel.value}")
        
        connector = self.connectors[channel]
        
        # Enviar mensaje
        await connector.send_message(
            recipient_id=context.user_id,  # Esto debería ser channel_user_id
            message=message,
            metadata={"from_agent": agent_id},
        )
        
        return {"status": "sent"}
    
    async def get_conversation_history(
        self,
        conversation_id: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Obtiene historial de conversación"""
        
        # En producción, esto vendría de base de datos
        # Por ahora, retornar del contexto
        if conversation_id not in self.active_contexts:
            return []
        
        context = self.active_contexts[conversation_id]
        
        return [
            {
                "timestamp": datetime.utcnow().isoformat(),
                "context": context.to_dict(),
            }
        ]
