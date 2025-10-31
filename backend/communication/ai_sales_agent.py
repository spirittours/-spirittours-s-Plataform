"""
AI Sales Agent
===============

Agente de IA especializado en cierre de ventas que:
1. Califica leads automáticamente
2. Responde preguntas sobre productos/servicios
3. Intenta cerrar ventas directamente
4. Escala a humano cuando no sabe la respuesta
5. Mantiene contexto de conversación completo
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, field

from ..ai.intelligent_chatbot import IntelligentChatbot
from .intelligent_router import (
    ConversationContext,
    CustomerType,
    AgentType,
    Intent,
    Department,
)

logger = logging.getLogger(__name__)


@dataclass
class SalesQualification:
    """Calificación del lead para ventas"""
    is_qualified: bool = False
    budget_range: Optional[str] = None
    timeline: Optional[str] = None  # "inmediato", "1-2 semanas", "1-3 meses", "más de 3 meses"
    decision_maker: bool = False
    group_size: Optional[int] = None
    destination_interest: List[str] = field(default_factory=list)
    specific_needs: List[str] = field(default_factory=list)
    qualification_score: float = 0.0  # 0-10
    ready_to_buy: bool = False


@dataclass
class SalesAttempt:
    """Intento de cierre de ventas"""
    timestamp: datetime
    question_asked: str
    response_given: str
    success: bool = False
    escalation_needed: bool = False
    reason: Optional[str] = None


class AISalesAgent:
    """
    Agente IA especializado en ventas que intenta cerrar antes de escalar a humano
    """
    
    def __init__(self, chatbot: IntelligentChatbot):
        self.chatbot = chatbot
        
        # Preguntas de calificación
        self.qualification_questions = {
            "budget": [
                "¿Cuál es su presupuesto aproximado para este viaje?",
                "¿Tiene un rango de presupuesto en mente?",
            ],
            "timeline": [
                "¿Para cuándo está planeando viajar?",
                "¿Cuál es su fecha ideal de viaje?",
            ],
            "group_size": [
                "¿Cuántas personas viajarían?",
                "¿Es un viaje individual, en pareja, o en grupo?",
            ],
            "destination": [
                "¿Qué destino le interesa?",
                "¿Tiene algún destino en particular en mente?",
            ],
            "needs": [
                "¿Qué tipo de experiencia está buscando?",
                "¿Hay algo específico que le gustaría incluir en su viaje?",
            ],
        }
        
        # Indicadores de conocimiento insuficiente (debe escalar)
        self.escalation_triggers = [
            r'\b(política de cancelación|cancelar reserva)\b',
            r'\b(problema con pago|reembolso)\b',
            r'\b(modificar reserva existente)\b',
            r'\b(disponibilidad específica|fecha exacta)\b',
            r'\b(precio final|cotización exacta)\b',
            r'\b(términos y condiciones|contrato)\b',
            r'\b(seguro de viaje|cobertura)\b',
            r'\b(documentación necesaria|visa|pasaporte)\b',
        ]
        
        # Indicadores de compra inmediata
        self.closing_signals = [
            r'\b(quiero reservar|deseo reservar|voy a reservar)\b',
            r'\b(acepto|de acuerdo|está bien)\b',
            r'\b(cómo pago|forma de pago|método de pago)\b',
            r'\b(cuándo puedo pagar|listo para pagar)\b',
            r'\b(confirmar|confirmación|confirmado)\b',
        ]
        
        # Límites de intentos antes de escalar
        self.max_qualification_attempts = 3
        self.max_sales_attempts = 5
        
    async def process_sales_conversation(
        self,
        message: str,
        context: ConversationContext,
        qualification: SalesQualification,
    ) -> Tuple[Dict[str, Any], SalesQualification, bool]:
        """
        Procesa una conversación de ventas
        
        Returns:
            (response_dict, updated_qualification, should_escalate)
        """
        message_lower = message.lower()
        
        # 1. Verificar si debe escalar inmediatamente
        should_escalate = await self._check_escalation_needed(message, context, qualification)
        if should_escalate:
            return (
                await self._generate_escalation_response(context, qualification),
                qualification,
                True
            )
        
        # 2. Detectar señales de cierre
        if self._detect_closing_signal(message):
            qualification.ready_to_buy = True
            return (
                await self._attempt_closing(context, qualification),
                qualification,
                False
            )
        
        # 3. Continuar calificación si no está completa
        if not qualification.is_qualified:
            return (
                await self._continue_qualification(message, context, qualification),
                qualification,
                False
            )
        
        # 4. Responder pregunta y empujar hacia cierre
        response = await self._respond_and_push_sale(message, context, qualification)
        
        # 5. Verificar si ya llegó al límite de intentos
        attempt_count = len([a for a in context.sales_attempts if not a.success])
        if attempt_count >= self.max_sales_attempts and not qualification.ready_to_buy:
            return (response, qualification, True)  # Escalar a humano
        
        return (response, qualification, False)
    
    async def _check_escalation_needed(
        self,
        message: str,
        context: ConversationContext,
        qualification: SalesQualification,
    ) -> bool:
        """Verifica si la pregunta requiere escalación a humano"""
        import re
        
        message_lower = message.lower()
        
        # Trigger patterns que el AI no puede manejar
        for trigger in self.escalation_triggers:
            if re.search(trigger, message_lower):
                logger.info(f"Escalation trigger detected: {trigger}")
                return True
        
        # Si pregunta algo muy específico y ya intentó varias veces
        if '?' in message and context.question_count > 3:
            # Intentar responder con chatbot
            response = await self.chatbot.process_message(
                message_text=message,
                user_id=context.user_id,
                session_id=context.session_id,
            )
            
            # Si el chatbot tiene baja confianza, escalar
            if response.get('confidence', 1.0) < 0.5:
                logger.info(f"Low confidence response, escalating to human")
                return True
        
        return False
    
    def _detect_closing_signal(self, message: str) -> bool:
        """Detecta si el cliente está listo para comprar"""
        import re
        
        message_lower = message.lower()
        for signal in self.closing_signals:
            if re.search(signal, message_lower):
                return True
        return False
    
    async def _continue_qualification(
        self,
        message: str,
        context: ConversationContext,
        qualification: SalesQualification,
    ) -> Dict[str, Any]:
        """Continúa el proceso de calificación del lead"""
        import re
        
        message_lower = message.lower()
        
        # Extraer información de la respuesta actual
        self._extract_qualification_data(message, qualification)
        
        # Calcular score de calificación
        qualification.qualification_score = self._calculate_qualification_score(qualification)
        
        # Si ya tiene suficiente información, marcar como calificado
        if qualification.qualification_score >= 6.0:
            qualification.is_qualified = True
            response_text = (
                f"¡Perfecto! Entiendo que busca un viaje {self._summarize_needs(qualification)}. "
                f"Tengo excelentes opciones para usted. "
            )
            
            # Si tiene presupuesto, ofrecer opciones
            if qualification.budget_range:
                response_text += (
                    f"Dentro de su presupuesto de {qualification.budget_range}, "
                    f"puedo ofrecerle paquetes exclusivos con todo incluido. "
                )
            
            response_text += "¿Le gustaría que le muestre nuestras mejores ofertas?"
            
            return {
                "response": response_text,
                "intent": Intent.PURCHASE_INTENT.value,
                "requires_action": True,
                "action": "show_offers",
                "context": context.to_dict(),
            }
        
        # Si no, hacer siguiente pregunta de calificación
        next_question = self._get_next_qualification_question(qualification)
        
        return {
            "response": next_question,
            "intent": Intent.SALES_QUALIFICATION.value,
            "requires_action": False,
            "context": context.to_dict(),
        }
    
    def _extract_qualification_data(self, message: str, qualification: SalesQualification):
        """Extrae datos de calificación del mensaje"""
        import re
        
        message_lower = message.lower()
        
        # Budget
        budget_patterns = [
            r'\$?\s*(\d+[\d,]*)\s*(?:mil|k|dólares|pesos)?',
            r'\bentre\s+\$?(\d+[\d,]*)\s+y\s+\$?(\d+[\d,]*)\b',
        ]
        for pattern in budget_patterns:
            match = re.search(pattern, message_lower)
            if match:
                qualification.budget_range = match.group(0)
                break
        
        # Timeline
        timeline_keywords = {
            "inmediato": ["esta semana", "este fin de semana", "mañana", "hoy", "urgente"],
            "1-2 semanas": ["próxima semana", "siguiente semana", "en una semana", "en dos semanas"],
            "1-3 meses": ["próximo mes", "siguiente mes", "en un mes", "en dos meses", "en tres meses"],
            "más de 3 meses": ["más adelante", "todavía no", "estoy planeando", "fin de año"],
        }
        for timeline, keywords in timeline_keywords.items():
            if any(kw in message_lower for kw in keywords):
                qualification.timeline = timeline
                break
        
        # Group size
        group_match = re.search(r'\b(\d+)\s*personas?\b', message_lower)
        if group_match:
            qualification.group_size = int(group_match.group(1))
        elif any(word in message_lower for word in ["solo", "individual", "yo solo"]):
            qualification.group_size = 1
        elif any(word in message_lower for word in ["pareja", "dos personas", "mi esposa", "mi esposo"]):
            qualification.group_size = 2
        elif any(word in message_lower for word in ["familia", "mis hijos", "con niños"]):
            qualification.group_size = 4  # Aproximación
        
        # Destination
        common_destinations = [
            "cancún", "riviera maya", "playa del carmen", "tulum",
            "puerto vallarta", "los cabos", "acapulco",
            "caribe", "europa", "asia", "sudamérica",
        ]
        for dest in common_destinations:
            if dest in message_lower:
                if dest not in qualification.destination_interest:
                    qualification.destination_interest.append(dest)
        
        # Decision maker
        if any(word in message_lower for word in ["yo decido", "soy quien", "es mi decisión"]):
            qualification.decision_maker = True
    
    def _calculate_qualification_score(self, qualification: SalesQualification) -> float:
        """Calcula score de calificación (0-10)"""
        score = 0.0
        
        # Presupuesto definido: +2.5
        if qualification.budget_range:
            score += 2.5
        
        # Timeline definido: +2.0
        if qualification.timeline:
            score += 2.0
            # Bonus si es inmediato
            if qualification.timeline == "inmediato":
                score += 1.0
        
        # Tamaño de grupo: +1.5
        if qualification.group_size:
            score += 1.5
        
        # Destino de interés: +1.5
        if qualification.destination_interest:
            score += 1.5
        
        # Decision maker: +1.5
        if qualification.decision_maker:
            score += 1.5
        
        return min(score, 10.0)
    
    def _get_next_qualification_question(self, qualification: SalesQualification) -> str:
        """Obtiene la siguiente pregunta de calificación"""
        import random
        
        # Priorizar preguntas según lo que falta
        if not qualification.destination_interest:
            return random.choice(self.qualification_questions["destination"])
        
        if not qualification.timeline:
            return random.choice(self.qualification_questions["timeline"])
        
        if not qualification.group_size:
            return random.choice(self.qualification_questions["group_size"])
        
        if not qualification.budget_range:
            return random.choice(self.qualification_questions["budget"])
        
        # Si tiene lo básico, preguntar por necesidades específicas
        return random.choice(self.qualification_questions["needs"])
    
    def _summarize_needs(self, qualification: SalesQualification) -> str:
        """Resume las necesidades del cliente"""
        parts = []
        
        if qualification.destination_interest:
            parts.append(f"a {', '.join(qualification.destination_interest)}")
        
        if qualification.group_size:
            if qualification.group_size == 1:
                parts.append("individual")
            elif qualification.group_size == 2:
                parts.append("en pareja")
            else:
                parts.append(f"para {qualification.group_size} personas")
        
        if qualification.timeline:
            parts.append(f"para {qualification.timeline}")
        
        return " ".join(parts) if parts else "personalizado"
    
    async def _respond_and_push_sale(
        self,
        message: str,
        context: ConversationContext,
        qualification: SalesQualification,
    ) -> Dict[str, Any]:
        """Responde pregunta e intenta empujar hacia cierre"""
        
        # Usar chatbot para responder
        response = await self.chatbot.process_message(
            message_text=message,
            user_id=context.user_id,
            session_id=context.session_id,
        )
        
        base_response = response.get('response', '')
        
        # Agregar push hacia cierre
        push_phrases = [
            " ¿Le gustaría proceder con la reserva?",
            " ¿Desea que le prepare una cotización personalizada?",
            " Tengo disponibilidad inmediata. ¿Confirmamos su viaje?",
            " ¿Le parece si procedemos con los siguientes pasos?",
        ]
        
        import random
        push = random.choice(push_phrases)
        
        # Registrar intento de venta
        attempt = SalesAttempt(
            timestamp=datetime.utcnow(),
            question_asked=message,
            response_given=base_response + push,
            success=False,
        )
        context.sales_attempts.append(attempt)
        
        return {
            "response": base_response + push,
            "intent": response.get('intent', Intent.UNKNOWN.value),
            "requires_action": True,
            "action": "push_sale",
            "context": context.to_dict(),
        }
    
    async def _attempt_closing(
        self,
        context: ConversationContext,
        qualification: SalesQualification,
    ) -> Dict[str, Any]:
        """Intenta cerrar la venta"""
        
        # Verificar que tenga información de contacto
        if not (context.contact_info.email or context.contact_info.phone):
            return {
                "response": (
                    "¡Excelente! Para proceder con su reserva, "
                    "necesito confirmar sus datos de contacto. "
                    "¿Puede proporcionarme su correo electrónico y número de teléfono?"
                ),
                "intent": Intent.COLLECT_INFO.value,
                "requires_action": True,
                "action": "collect_contact",
                "context": context.to_dict(),
            }
        
        # Si tiene todo, intentar cerrar
        closing_response = (
            f"¡Perfecto! Voy a preparar su reserva {self._summarize_needs(qualification)}. "
            f"Le enviaré los detalles y el proceso de pago a {context.contact_info.email or context.contact_info.phone}. "
        )
        
        # Si es un caso complejo o de alto valor, escalar a humano
        if (qualification.group_size and qualification.group_size > 5) or \
           (qualification.budget_range and any(x in qualification.budget_range.lower() for x in ["mil", "k", "000"])):
            closing_response += (
                "Por el valor y complejidad de su solicitud, "
                "uno de nuestros especialistas se pondrá en contacto con usted "
                "en los próximos 15 minutos para finalizar los detalles. "
                "¿Le parece bien?"
            )
            return {
                "response": closing_response,
                "intent": Intent.ESCALATE.value,
                "requires_action": True,
                "action": "escalate_high_value",
                "context": context.to_dict(),
            }
        
        # Caso simple, procesar con AI
        closing_response += "¿Confirma que desea proceder?"
        
        return {
            "response": closing_response,
            "intent": Intent.PURCHASE_INTENT.value,
            "requires_action": True,
            "action": "process_booking",
            "context": context.to_dict(),
        }
    
    async def _generate_escalation_response(
        self,
        context: ConversationContext,
        qualification: SalesQualification,
    ) -> Dict[str, Any]:
        """Genera respuesta de escalación a humano"""
        
        response_text = (
            "Entiendo su consulta. Para poder darle la información más precisa "
            "y asegurarme de que todo esté perfecto, voy a conectarlo con uno de "
            "nuestros especialistas que podrá ayudarle mejor. "
        )
        
        if context.contact_info.name:
            response_text += f"{context.contact_info.name}, "
        
        response_text += (
            "un agente estará con usted en un momento. "
            "Mientras tanto, ¿hay algo más que le gustaría que le comunique al especialista?"
        )
        
        return {
            "response": response_text,
            "intent": Intent.ESCALATE.value,
            "requires_action": True,
            "action": "escalate_to_human",
            "qualification": {
                "score": qualification.qualification_score,
                "is_qualified": qualification.is_qualified,
                "budget_range": qualification.budget_range,
                "timeline": qualification.timeline,
                "group_size": qualification.group_size,
                "destinations": qualification.destination_interest,
                "ready_to_buy": qualification.ready_to_buy,
            },
            "context": context.to_dict(),
        }
