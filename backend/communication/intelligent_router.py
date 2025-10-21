"""
Sistema Inteligente de Routing y Filtrado de Conversaciones Multi-Canal.

Este módulo implementa un sistema avanzado de enrutamiento de conversaciones
que filtra automáticamente preguntas, clasifica clientes y dirige al departamento
correcto con opción de IA primero o humano directo.

Características:
- Filtrado inteligente de "preguntones"
- Clasificación automática de departamentos
- Routing dual: IA primero o humano directo
- Escalamiento inteligente de IA a humano
- Captura de información de contacto
- Multi-canal (WhatsApp, Telegram, Facebook, Instagram, etc.)
- Sistema de priorización

Departamentos:
1. Atención al cliente / Servicios al cliente
2. Grupos y cotizaciones
3. Información general (FAQ)
4. Ventas directas (agente humano o IA)

Author: GenSpark AI Developer
Phase: 12 - Communication Enhancement
"""

import asyncio
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field
import re
from collections import defaultdict

from backend.utils.logger import get_logger

logger = get_logger(__name__)


class Department(str, Enum):
    """Departamentos disponibles."""
    CUSTOMER_SERVICE = "customer_service"  # Atención al cliente / Reservas
    GROUPS_QUOTES = "groups_quotes"  # Grupos y cotizaciones
    GENERAL_INFO = "general_info"  # Información general
    SALES = "sales"  # Ventas directas
    TECHNICAL_SUPPORT = "technical_support"  # Soporte técnico
    VIP_SERVICE = "vip_service"  # Servicio VIP
    UNKNOWN = "unknown"  # No clasificado


class ConversationChannel(str, Enum):
    """Canales de conversación."""
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"
    FACEBOOK = "facebook_messenger"
    INSTAGRAM = "instagram_dm"
    TWITTER = "twitter_dm"
    LINKEDIN = "linkedin"
    WEBCHAT = "webchat"
    SMS = "sms"
    EMAIL = "email"


class CustomerIntent(str, Enum):
    """Intención del cliente."""
    BOOKING = "booking"  # Quiere reservar
    QUOTE = "quote"  # Quiere cotización
    INFO = "info"  # Solo información
    COMPLAINT = "complaint"  # Queja
    MODIFICATION = "modification"  # Modificar reserva
    CANCELLATION = "cancellation"  # Cancelar
    QUESTION = "question"  # Pregunta general
    BROWSING = "browsing"  # Solo mirando
    UNKNOWN = "unknown"


class CustomerType(str, Enum):
    """Tipo de cliente."""
    NEW = "new"  # Cliente nuevo
    RETURNING = "returning"  # Cliente recurrente
    VIP = "vip"  # Cliente VIP
    GROUP = "group"  # Grupo/empresa
    POTENTIAL = "potential"  # Cliente potencial
    TIME_WASTER = "time_waster"  # "Preguntón" sin intención real


class RoutingMode(str, Enum):
    """Modo de enrutamiento."""
    AI_FIRST = "ai_first"  # IA primero, humano si necesario
    HUMAN_DIRECT = "human_direct"  # Directo a humano
    AI_ONLY = "ai_only"  # Solo IA
    HYBRID = "hybrid"  # IA y humano en paralelo


class AgentType(str, Enum):
    """Tipo de agente."""
    AI = "ai"
    HUMAN = "human"
    HYBRID = "hybrid"


@dataclass
class ContactInfo:
    """Información de contacto del cliente."""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    language: Optional[str] = "es"
    verified: bool = False
    collected_at: Optional[datetime] = None


@dataclass
class ConversationContext:
    """Contexto de la conversación."""
    conversation_id: str
    user_id: str
    channel: ConversationChannel
    department: Department = Department.UNKNOWN
    intent: CustomerIntent = CustomerIntent.UNKNOWN
    customer_type: CustomerType = CustomerType.NEW
    routing_mode: RoutingMode = RoutingMode.AI_FIRST
    current_agent: Optional[str] = None
    agent_type: AgentType = AgentType.AI
    contact_info: ContactInfo = field(default_factory=ContactInfo)
    
    # Métricas
    message_count: int = 0
    question_count: int = 0
    info_provided_count: int = 0
    purchase_signals: int = 0
    time_waster_score: float = 0.0
    
    # Estado
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    escalated: bool = False
    escalation_reason: Optional[str] = None
    resolved: bool = False
    
    # Historial
    messages: List[Dict[str, Any]] = field(default_factory=list)
    agents_involved: List[str] = field(default_factory=list)
    
    # Prioridad
    priority: int = 5  # 1 (más alto) - 10 (más bajo)


class IntelligentRouter:
    """
    Router inteligente para direccionar conversaciones.
    
    Analiza mensajes, clasifica intenciones, detecta "preguntones"
    y dirige al departamento y agente correcto (IA o humano).
    """
    
    def __init__(self):
        """Inicializar router."""
        self.active_conversations: Dict[str, ConversationContext] = {}
        
        # Patrones de detección
        self.intent_patterns = self._load_intent_patterns()
        self.department_patterns = self._load_department_patterns()
        self.purchase_signals = self._load_purchase_signals()
        self.time_waster_indicators = self._load_time_waster_indicators()
        self.contact_patterns = self._load_contact_patterns()
        
        # Configuración
        self.ai_confidence_threshold = 0.7  # Umbral para que IA maneje solo
        self.time_waster_threshold = 7.0  # Umbral para detectar preguntones
        self.max_ai_attempts = 3  # Intentos de IA antes de escalar
        self.vip_keywords = ["vip", "premium", "ejecutivo", "corporate"]
        
        # Agentes disponibles
        self.available_agents = {
            AgentType.AI: ["ai_sales", "ai_support", "ai_info"],
            AgentType.HUMAN: []  # Se actualiza dinámicamente
        }
        
        # Métricas
        self.routing_stats = defaultdict(int)
        
        logger.info("Intelligent Router initialized")
    
    def _load_intent_patterns(self) -> Dict[CustomerIntent, List[str]]:
        """Cargar patrones de intención."""
        return {
            CustomerIntent.BOOKING: [
                r'\b(reservar|apartar|reserva|booking|book)\b',
                r'\b(quiero viajar|necesito viaje|viajar)\b',
                r'\b(disponibilidad para|cuándo puedo)\b',
                r'\b(confirmar|lo tomo|me interesa definitivo)\b',
            ],
            CustomerIntent.QUOTE: [
                r'\b(cotización|cotizar|presupuesto|precio)\b',
                r'\b(cuánto cuesta|cuánto sale|qué precio)\b',
                r'\b(para grupo|para empresa|corporativo)\b',
                r'\b(paquete para|viaje para)\b',
            ],
            CustomerIntent.INFO: [
                r'\b(información|informar|detalles|saber)\b',
                r'\b(qué incluye|qué trae|qué tiene)\b',
                r'\b(horarios|itinerario|programa)\b',
                r'\b(cómo es|cómo funciona)\b',
            ],
            CustomerIntent.COMPLAINT: [
                r'\b(queja|reclamo|problema|mal)\b',
                r'\b(no funciona|no sirve|pesimo)\b',
                r'\b(devolver dinero|reembolso)\b',
                r'\b(insatisfecho|molesto|enojado)\b',
            ],
            CustomerIntent.MODIFICATION: [
                r'\b(modificar|cambiar|actualizar)\b',
                r'\b(cambio de fecha|cambiar fecha)\b',
                r'\b(cambio de nombre|cambiar nombre)\b',
            ],
            CustomerIntent.CANCELLATION: [
                r'\b(cancelar|anular|desistir)\b',
                r'\b(ya no puedo|no voy a poder)\b',
                r'\b(devolver|reintegro)\b',
            ],
        }
    
    def _load_department_patterns(self) -> Dict[Department, List[str]]:
        """Cargar patrones de departamento."""
        return {
            Department.CUSTOMER_SERVICE: [
                r'\b(mi reserva|mi viaje|mi booking)\b',
                r'\b(modificar reserva|cambiar reserva)\b',
                r'\b(problema con|ayuda con)\b',
                r'\b(servicio al cliente|atención)\b',
            ],
            Department.GROUPS_QUOTES: [
                r'\b(grupo|grupos|grupal)\b',
                r'\b(empresa|empresarial|corporativo)\b',
                r'\b(cotización para|presupuesto para)\b',
                r'\b(\d{2,})\s+personas?\b',  # 10+ personas
                r'\b(evento|convención|congreso)\b',
            ],
            Department.GENERAL_INFO: [
                r'\b(información|informar|info)\b',
                r'\b(qué es|cómo funciona|explicar)\b',
                r'\b(horarios|abierto|cerrado)\b',
                r'\b(ubicación|dónde están|dirección)\b',
            ],
            Department.SALES: [
                r'\b(comprar|adquirir|contratar)\b',
                r'\b(quiero reservar|deseo viajar)\b',
                r'\b(estoy interesado|me interesa)\b',
                r'\b(listo para|proceder con)\b',
            ],
        }
    
    def _load_purchase_signals(self) -> List[str]:
        """Señales de intención de compra."""
        return [
            r'\b(quiero|necesito|busco)\b.*\b(viajar|viaje|tour)\b',
            r'\b(cuándo puedo|disponibilidad)\b',
            r'\b(confirmar|reservar|apartar)\b',
            r'\b(lo tomo|me conviene|perfecto)\b',
            r'\b(proceder|siguiente paso|continuar)\b',
            r'\b(pagar|payment|tarjeta)\b',
            r'\b(urgente|pronto|rápido)\b',
        ]
    
    def _load_time_waster_indicators(self) -> List[str]:
        """Indicadores de "preguntones"."""
        return [
            r'\b(solo preguntaba|solo quería saber)\b',
            r'\b(tal vez|quizás|no sé)\b',
            r'\b(solo info|solo información)\b',
            r'\b(más adelante|otro día|después)\b',
            r'\b(estoy viendo|estoy mirando)\b',
            r'\b(solo curiosidad|por curiosidad)\b',
        ]
    
    def _load_contact_patterns(self) -> Dict[str, str]:
        """Patrones para extraer información de contacto."""
        return {
            'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
            'phone': r'(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}',
            'name': r'(me llamo|mi nombre es|soy)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)',
        }
    
    async def route_message(
        self,
        message: str,
        user_id: str,
        channel: ConversationChannel,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Enrutar mensaje al departamento y agente correcto.
        
        Args:
            message: Mensaje del usuario
            user_id: ID del usuario
            channel: Canal de comunicación
            metadata: Metadatos adicionales
            
        Returns:
            Diccionario con decisión de routing
        """
        logger.info(f"Routing message from {user_id} via {channel.value}")
        
        # Obtener o crear contexto
        context = self._get_or_create_context(user_id, channel)
        
        # Actualizar contexto con nuevo mensaje
        context.message_count += 1
        context.last_activity = datetime.now()
        context.messages.append({
            'text': message,
            'timestamp': datetime.now().isoformat(),
            'sender': 'user'
        })
        
        # Extraer información de contacto
        contact_extracted = self._extract_contact_info(message, context)
        
        # Analizar mensaje
        intent = self._detect_intent(message)
        department = self._detect_department(message, intent)
        customer_type = self._classify_customer_type(context, message)
        
        # Detectar señales de compra
        purchase_score = self._calculate_purchase_score(message)
        if purchase_score > 0:
            context.purchase_signals += purchase_score
        
        # Detectar "preguntón"
        time_waster_score = self._calculate_time_waster_score(context, message)
        context.time_waster_score = time_waster_score
        
        # Actualizar contexto
        context.intent = intent
        context.department = department
        context.customer_type = customer_type
        
        # Determinar modo de routing
        routing_decision = await self._determine_routing(context, message)
        
        # Actualizar métricas
        self._update_metrics(routing_decision)
        
        return routing_decision
    
    def _get_or_create_context(
        self,
        user_id: str,
        channel: ConversationChannel
    ) -> ConversationContext:
        """Obtener o crear contexto de conversación."""
        conversation_id = f"{user_id}:{channel.value}"
        
        if conversation_id not in self.active_conversations:
            self.active_conversations[conversation_id] = ConversationContext(
                conversation_id=conversation_id,
                user_id=user_id,
                channel=channel
            )
        
        return self.active_conversations[conversation_id]
    
    def _extract_contact_info(
        self,
        message: str,
        context: ConversationContext
    ) -> bool:
        """Extraer información de contacto del mensaje."""
        extracted = False
        
        # Email
        email_match = re.search(self.contact_patterns['email'], message, re.IGNORECASE)
        if email_match and not context.contact_info.email:
            context.contact_info.email = email_match.group(0)
            extracted = True
            logger.info(f"Email extracted: {context.contact_info.email}")
        
        # Teléfono
        phone_match = re.search(self.contact_patterns['phone'], message)
        if phone_match and not context.contact_info.phone:
            context.contact_info.phone = phone_match.group(0)
            extracted = True
            logger.info(f"Phone extracted: {context.contact_info.phone}")
        
        # Nombre
        name_match = re.search(self.contact_patterns['name'], message, re.IGNORECASE)
        if name_match and not context.contact_info.name:
            context.contact_info.name = name_match.group(2)
            extracted = True
            logger.info(f"Name extracted: {context.contact_info.name}")
        
        if extracted and not context.contact_info.collected_at:
            context.contact_info.collected_at = datetime.now()
        
        return extracted
    
    def _detect_intent(self, message: str) -> CustomerIntent:
        """Detectar intención del cliente."""
        message_lower = message.lower()
        
        best_intent = CustomerIntent.UNKNOWN
        best_score = 0
        
        for intent, patterns in self.intent_patterns.items():
            score = sum(1 for pattern in patterns if re.search(pattern, message_lower))
            if score > best_score:
                best_score = score
                best_intent = intent
        
        return best_intent
    
    def _detect_department(
        self,
        message: str,
        intent: CustomerIntent
    ) -> Department:
        """Detectar departamento apropiado."""
        message_lower = message.lower()
        
        # Búsqueda directa en patrones
        for department, patterns in self.department_patterns.items():
            for pattern in patterns:
                if re.search(pattern, message_lower):
                    return department
        
        # Mapeo basado en intención
        intent_to_department = {
            CustomerIntent.BOOKING: Department.SALES,
            CustomerIntent.QUOTE: Department.GROUPS_QUOTES,
            CustomerIntent.INFO: Department.GENERAL_INFO,
            CustomerIntent.COMPLAINT: Department.CUSTOMER_SERVICE,
            CustomerIntent.MODIFICATION: Department.CUSTOMER_SERVICE,
            CustomerIntent.CANCELLATION: Department.CUSTOMER_SERVICE,
        }
        
        return intent_to_department.get(intent, Department.GENERAL_INFO)
    
    def _classify_customer_type(
        self,
        context: ConversationContext,
        message: str
    ) -> CustomerType:
        """Clasificar tipo de cliente."""
        message_lower = message.lower()
        
        # VIP detection
        if any(keyword in message_lower for keyword in self.vip_keywords):
            return CustomerType.VIP
        
        # Grupo detection (10+ personas)
        group_match = re.search(r'(\d+)\s+personas?', message_lower)
        if group_match and int(group_match.group(1)) >= 10:
            return CustomerType.GROUP
        
        # Time waster detection
        if context.time_waster_score >= self.time_waster_threshold:
            return CustomerType.TIME_WASTER
        
        # Cliente potencial con señales de compra
        if context.purchase_signals >= 2:
            return CustomerType.POTENTIAL
        
        # Por defecto, cliente nuevo
        return context.customer_type if context.customer_type != CustomerType.NEW else CustomerType.NEW
    
    def _calculate_purchase_score(self, message: str) -> int:
        """Calcular score de intención de compra."""
        message_lower = message.lower()
        score = 0
        
        for signal in self.purchase_signals:
            if re.search(signal, message_lower):
                score += 1
        
        return score
    
    def _calculate_time_waster_score(
        self,
        context: ConversationContext,
        message: str
    ) -> float:
        """Calcular score de "preguntón"."""
        score = context.time_waster_score
        message_lower = message.lower()
        
        # Muchas preguntas sin avanzar
        if '?' in message:
            context.question_count += 1
            if context.question_count > 5 and context.purchase_signals == 0:
                score += 0.5
        
        # Indicadores de no compra
        for indicator in self.time_waster_indicators:
            if re.search(indicator, message_lower):
                score += 1.0
        
        # Muchos mensajes sin información de contacto
        if context.message_count > 8 and not any([
            context.contact_info.email,
            context.contact_info.phone,
            context.contact_info.name
        ]):
            score += 1.5
        
        # Mucho tiempo sin decisión
        if context.message_count > 15 and context.purchase_signals < 2:
            score += 2.0
        
        return score
    
    async def _determine_routing(
        self,
        context: ConversationContext,
        message: str
    ) -> Dict[str, Any]:
        """
        Determinar routing: IA primero, humano directo, o híbrido.
        
        Returns:
            Decisión de routing con agente asignado
        """
        # VIPs siempre a humano directo
        if context.customer_type == CustomerType.VIP:
            return await self._route_to_human(
                context,
                Department.VIP_SERVICE,
                reason="VIP customer",
                priority=1
            )
        
        # Quejas directas a humano
        if context.intent == CustomerIntent.COMPLAINT:
            return await self._route_to_human(
                context,
                Department.CUSTOMER_SERVICE,
                reason="Complaint",
                priority=2
            )
        
        # Grupos grandes a humano de cotizaciones
        if context.customer_type == CustomerType.GROUP:
            return await self._route_to_human(
                context,
                Department.GROUPS_QUOTES,
                reason="Group booking",
                priority=3
            )
        
        # Time wasters a IA solo (no gastar recursos humanos)
        if context.customer_type == CustomerType.TIME_WASTER:
            return await self._route_to_ai(
                context,
                allow_escalation=False,
                reason="Time waster detected"
            )
        
        # Clientes con alta intención de compra
        if context.purchase_signals >= 3:
            # Verificar si tenemos contacto
            if context.contact_info.email or context.contact_info.phone:
                # OPCIÓN 1: IA primero para calificar, luego humano
                if context.routing_mode == RoutingMode.AI_FIRST:
                    if context.agent_type == AgentType.AI:
                        # IA ya intentó, escalar a humano
                        if context.message_count >= 5:
                            return await self._escalate_to_human(
                                context,
                                reason="AI qualification complete"
                            )
                    return await self._route_to_ai(
                        context,
                        allow_escalation=True,
                        reason="High purchase intent - AI first"
                    )
                else:
                    # OPCIÓN 2: Directo a humano
                    return await self._route_to_human(
                        context,
                        Department.SALES,
                        reason="High purchase intent - direct to human",
                        priority=2
                    )
            else:
                # Sin contacto, IA para recopilar info
                return await self._route_to_ai(
                    context,
                    allow_escalation=True,
                    reason="Collect contact info first"
                )
        
        # Información general simple - IA solo
        if context.intent == CustomerIntent.INFO and context.department == Department.GENERAL_INFO:
            return await self._route_to_ai(
                context,
                allow_escalation=False,
                reason="Simple information request"
            )
        
        # Por defecto: IA primero con posibilidad de escalamiento
        return await self._route_to_ai(
            context,
            allow_escalation=True,
            reason="Default routing"
        )
    
    async def _route_to_ai(
        self,
        context: ConversationContext,
        allow_escalation: bool = True,
        reason: str = ""
    ) -> Dict[str, Any]:
        """Enrutar a agente de IA."""
        # Seleccionar agente IA apropiado
        ai_agent = self._select_ai_agent(context.department)
        
        context.current_agent = ai_agent
        context.agent_type = AgentType.AI
        
        if ai_agent not in context.agents_involved:
            context.agents_involved.append(ai_agent)
        
        logger.info(f"Routing to AI: {ai_agent} - Reason: {reason}")
        
        return {
            'success': True,
            'agent_type': AgentType.AI.value,
            'agent_id': ai_agent,
            'department': context.department.value,
            'allow_escalation': allow_escalation,
            'escalation_triggers': self._get_escalation_triggers(context) if allow_escalation else None,
            'routing_reason': reason,
            'priority': context.priority,
            'contact_info_complete': self._is_contact_info_complete(context),
            'message': self._get_ai_greeting(context),
            'suggestions': self._get_quick_replies(context)
        }
    
    async def _route_to_human(
        self,
        context: ConversationContext,
        department: Department,
        reason: str = "",
        priority: int = 5
    ) -> Dict[str, Any]:
        """Enrutar a agente humano."""
        # Seleccionar agente humano disponible
        human_agent = await self._select_human_agent(department, priority)
        
        context.current_agent = human_agent or "pending"
        context.agent_type = AgentType.HUMAN
        context.department = department
        context.priority = priority
        
        if human_agent and human_agent not in context.agents_involved:
            context.agents_involved.append(human_agent)
        
        logger.info(f"Routing to HUMAN: {human_agent or 'queue'} - Department: {department.value} - Reason: {reason}")
        
        return {
            'success': True,
            'agent_type': AgentType.HUMAN.value,
            'agent_id': human_agent,
            'department': department.value,
            'waiting_for_agent': human_agent is None,
            'routing_reason': reason,
            'priority': priority,
            'estimated_wait_time': await self._estimate_wait_time(department),
            'contact_info': {
                'name': context.contact_info.name,
                'email': context.contact_info.email,
                'phone': context.contact_info.phone,
                'complete': self._is_contact_info_complete(context)
            },
            'conversation_summary': self._generate_summary(context),
            'message': self._get_human_transfer_message(context, human_agent),
        }
    
    async def _escalate_to_human(
        self,
        context: ConversationContext,
        reason: str = ""
    ) -> Dict[str, Any]:
        """Escalar de IA a humano."""
        context.escalated = True
        context.escalation_reason = reason
        
        # Aumentar prioridad en escalamientos
        if context.purchase_signals >= 2:
            context.priority = min(context.priority, 3)
        
        logger.info(f"Escalating to human - Reason: {reason}")
        
        return await self._route_to_human(
            context,
            context.department,
            reason=f"Escalated from AI: {reason}",
            priority=context.priority
        )
    
    def _select_ai_agent(self, department: Department) -> str:
        """Seleccionar agente IA apropiado."""
        ai_agents = {
            Department.SALES: "ai_sales_specialist",
            Department.CUSTOMER_SERVICE: "ai_support_agent",
            Department.GENERAL_INFO: "ai_info_bot",
            Department.GROUPS_QUOTES: "ai_groups_specialist",
        }
        
        return ai_agents.get(department, "ai_general")
    
    async def _select_human_agent(
        self,
        department: Department,
        priority: int
    ) -> Optional[str]:
        """Seleccionar agente humano disponible."""
        # TODO: Implementar lógica de selección de agente humano real
        # Por ahora, retorna None indicando que debe ir a cola
        
        # En producción:
        # 1. Consultar agentes disponibles en el departamento
        # 2. Verificar carga de trabajo
        # 3. Considerar especialización
        # 4. Asignar según prioridad
        
        return None  # Va a cola de espera
    
    async def _estimate_wait_time(self, department: Department) -> int:
        """Estimar tiempo de espera en segundos."""
        # TODO: Implementar estimación real basada en cola y agentes
        wait_times = {
            Department.VIP_SERVICE: 30,
            Department.SALES: 60,
            Department.CUSTOMER_SERVICE: 120,
            Department.GROUPS_QUOTES: 180,
            Department.GENERAL_INFO: 300,
        }
        
        return wait_times.get(department, 180)
    
    def _get_escalation_triggers(self, context: ConversationContext) -> List[str]:
        """Obtener triggers para escalamiento."""
        triggers = [
            "no sé la respuesta",
            "no puedo ayudarte con eso",
            "necesito ayuda de un humano",
            "prefiero hablar con una persona",
        ]
        
        # Agregar trigger automático después de N mensajes
        if context.message_count >= self.max_ai_attempts:
            triggers.append("automatic_escalation_after_attempts")
        
        return triggers
    
    def _is_contact_info_complete(self, context: ConversationContext) -> bool:
        """Verificar si la información de contacto está completa."""
        return bool(
            context.contact_info.name and
            (context.contact_info.email or context.contact_info.phone)
        )
    
    def _get_ai_greeting(self, context: ConversationContext) -> str:
        """Obtener mensaje de saludo de IA."""
        if context.message_count == 1:
            return "¡Hola! 👋 Soy tu asistente virtual de Spirit Tours. ¿En qué puedo ayudarte hoy?"
        else:
            return None  # No greeting, continuar conversación
    
    def _get_quick_replies(self, context: ConversationContext) -> List[str]:
        """Obtener respuestas rápidas sugeridas."""
        if not self._is_contact_info_complete(context):
            return []
        
        quick_replies = {
            CustomerIntent.BOOKING: [
                "Ver destinos disponibles",
                "Consultar precios",
                "Confirmar reserva",
                "Hablar con un agente"
            ],
            CustomerIntent.QUOTE: [
                "Cotización express",
                "Enviar por email",
                "Llamada con asesor",
                "Ver paquetes"
            ],
            CustomerIntent.INFO: [
                "Destinos populares",
                "Ofertas actuales",
                "Preguntas frecuentes",
                "Contactar agente"
            ],
        }
        
        return quick_replies.get(context.intent, [])
    
    def _get_human_transfer_message(
        self,
        context: ConversationContext,
        agent_id: Optional[str]
    ) -> str:
        """Obtener mensaje de transferencia a humano."""
        if agent_id:
            return f"Te estoy conectando con {agent_id}, uno de nuestros especialistas. Por favor espera un momento..."
        else:
            wait_time = asyncio.run(self._estimate_wait_time(context.department))
            return f"Te voy a conectar con un agente especializado. Tiempo estimado de espera: {wait_time//60} minutos. Gracias por tu paciencia."
    
    def _generate_summary(self, context: ConversationContext) -> Dict[str, Any]:
        """Generar resumen de conversación para el agente humano."""
        return {
            'conversation_id': context.conversation_id,
            'customer_type': context.customer_type.value,
            'intent': context.intent.value,
            'department': context.department.value,
            'message_count': context.message_count,
            'purchase_signals': context.purchase_signals,
            'time_waster_score': round(context.time_waster_score, 2),
            'contact_info': {
                'name': context.contact_info.name,
                'email': context.contact_info.email,
                'phone': context.contact_info.phone,
                'verified': context.contact_info.verified
            },
            'key_points': self._extract_key_points(context),
            'duration_minutes': (datetime.now() - context.created_at).total_seconds() / 60,
            'escalated': context.escalated,
            'escalation_reason': context.escalation_reason
        }
    
    def _extract_key_points(self, context: ConversationContext) -> List[str]:
        """Extraer puntos clave de la conversación."""
        key_points = []
        
        if context.intent != CustomerIntent.UNKNOWN:
            key_points.append(f"Intent: {context.intent.value}")
        
        if context.customer_type == CustomerType.VIP:
            key_points.append("⭐ VIP Customer")
        
        if context.purchase_signals >= 3:
            key_points.append("🔥 High purchase intent")
        
        if context.customer_type == CustomerType.GROUP:
            key_points.append("👥 Group booking")
        
        if context.time_waster_score >= self.time_waster_threshold:
            key_points.append("⚠️ Possible time waster")
        
        return key_points
    
    def _update_metrics(self, routing_decision: Dict[str, Any]):
        """Actualizar métricas de routing."""
        agent_type = routing_decision.get('agent_type')
        department = routing_decision.get('department')
        
        self.routing_stats[f"total_{agent_type}"] += 1
        self.routing_stats[f"dept_{department}"] += 1
        
        if routing_decision.get('escalated'):
            self.routing_stats['escalations'] += 1
    
    def get_routing_stats(self) -> Dict[str, Any]:
        """Obtener estadísticas de routing."""
        return dict(self.routing_stats)
    
    async def mark_conversation_resolved(self, conversation_id: str, outcome: str):
        """Marcar conversación como resuelta."""
        if conversation_id in self.active_conversations:
            context = self.active_conversations[conversation_id]
            context.resolved = True
            
            # Actualizar métricas
            self.routing_stats[f"outcome_{outcome}"] += 1
            
            logger.info(f"Conversation {conversation_id} resolved with outcome: {outcome}")


# Singleton instance
_router: Optional[IntelligentRouter] = None


def get_router() -> IntelligentRouter:
    """Obtener instancia singleton del router."""
    global _router
    if _router is None:
        _router = IntelligentRouter()
    return _router
