"""
Human Agent Queue Management
=============================

Sistema de cola para agentes humanos que:
1. Gestiona múltiples agentes y su disponibilidad
2. Asigna conversaciones según prioridad y carga
3. Maneja handoff de AI a humano
4. Provee contexto completo al agente
5. Trackea métricas de performance
"""

import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import asyncio
from collections import defaultdict

from .intelligent_router import ConversationContext, Department, CustomerType

logger = logging.getLogger(__name__)


class AgentStatus(str, Enum):
    """Estado del agente humano"""
    AVAILABLE = "available"
    BUSY = "busy"
    AWAY = "away"
    OFFLINE = "offline"


@dataclass
class HumanAgent:
    """Representación de un agente humano"""
    agent_id: str
    name: str
    email: str
    departments: List[Department]
    status: AgentStatus = AgentStatus.OFFLINE
    current_conversations: Set[str] = field(default_factory=set)
    max_concurrent: int = 3
    skills: List[str] = field(default_factory=list)
    performance_rating: float = 5.0  # 0-10
    total_conversations: int = 0
    successful_closures: int = 0
    average_response_time: float = 0.0  # seconds
    last_activity: Optional[datetime] = None


@dataclass
class QueuedConversation:
    """Conversación en cola esperando agente"""
    conversation_id: str
    context: ConversationContext
    department: Department
    priority: int  # 1 (urgent) - 5 (low)
    queued_at: datetime
    estimated_wait_time: Optional[float] = None  # seconds
    assigned_agent_id: Optional[str] = None
    ai_summary: Optional[str] = None
    customer_mood: Optional[str] = None  # "happy", "neutral", "frustrated", "angry"


class HumanAgentQueue:
    """
    Sistema de gestión de cola para agentes humanos
    """
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        
        # Storage
        self.agents: Dict[str, HumanAgent] = {}
        self.queues: Dict[Department, List[QueuedConversation]] = defaultdict(list)
        self.active_conversations: Dict[str, QueuedConversation] = {}
        
        # Configuración
        self.priority_weights = {
            1: 10.0,  # Urgent (VIP, complaints)
            2: 5.0,   # High (purchase intent)
            3: 2.0,   # Normal
            4: 1.0,   # Low
            5: 0.5,   # Very low
        }
        
        # Métricas
        self.total_queued = 0
        self.total_assigned = 0
        self.total_completed = 0
        self.average_wait_time = 0.0
        
    async def register_agent(
        self,
        agent_id: str,
        name: str,
        email: str,
        departments: List[Department],
        max_concurrent: int = 3,
        skills: Optional[List[str]] = None,
    ) -> HumanAgent:
        """Registra un nuevo agente humano"""
        agent = HumanAgent(
            agent_id=agent_id,
            name=name,
            email=email,
            departments=departments,
            max_concurrent=max_concurrent,
            skills=skills or [],
        )
        
        self.agents[agent_id] = agent
        logger.info(f"Registered agent {name} ({agent_id}) for departments: {departments}")
        
        return agent
    
    async def update_agent_status(self, agent_id: str, status: AgentStatus):
        """Actualiza el estado de un agente"""
        if agent_id not in self.agents:
            raise ValueError(f"Agent {agent_id} not found")
        
        old_status = self.agents[agent_id].status
        self.agents[agent_id].status = status
        self.agents[agent_id].last_activity = datetime.utcnow()
        
        logger.info(f"Agent {agent_id} status changed: {old_status} -> {status}")
        
        # Si el agente vuelve a estar disponible, asignar conversaciones pendientes
        if status == AgentStatus.AVAILABLE and old_status != AgentStatus.AVAILABLE:
            await self._assign_pending_conversations(agent_id)
    
    async def queue_conversation(
        self,
        conversation_id: str,
        context: ConversationContext,
        department: Department,
        priority: int = 3,
        ai_summary: Optional[str] = None,
    ) -> QueuedConversation:
        """Encola una conversación para atención humana"""
        
        # Determinar mood del cliente basado en contexto
        customer_mood = self._determine_customer_mood(context)
        
        # Crear conversación encolada
        queued = QueuedConversation(
            conversation_id=conversation_id,
            context=context,
            department=department,
            priority=priority,
            queued_at=datetime.utcnow(),
            ai_summary=ai_summary,
            customer_mood=customer_mood,
        )
        
        # Agregar a cola del departamento
        self.queues[department].append(queued)
        self.total_queued += 1
        
        # Ordenar por prioridad
        self.queues[department].sort(
            key=lambda x: (x.priority, x.queued_at)
        )
        
        # Calcular tiempo estimado de espera
        queued.estimated_wait_time = self._calculate_estimated_wait_time(department, priority)
        
        logger.info(
            f"Queued conversation {conversation_id} for {department.value} "
            f"(priority: {priority}, estimated wait: {queued.estimated_wait_time}s)"
        )
        
        # Intentar asignar inmediatamente si hay agentes disponibles
        await self._try_immediate_assignment(queued)
        
        return queued
    
    async def _try_immediate_assignment(self, queued: QueuedConversation):
        """Intenta asignar inmediatamente si hay agente disponible"""
        
        # Buscar agente disponible para el departamento
        available_agent = await self._find_available_agent(
            queued.department,
            queued.priority,
        )
        
        if available_agent:
            await self._assign_conversation(queued, available_agent)
    
    async def _find_available_agent(
        self,
        department: Department,
        priority: int,
    ) -> Optional[HumanAgent]:
        """Encuentra el mejor agente disponible para el departamento"""
        
        available_agents = []
        
        for agent in self.agents.values():
            # Debe estar disponible o ocupado pero no al máximo
            if agent.status == AgentStatus.AVAILABLE or \
               (agent.status == AgentStatus.BUSY and len(agent.current_conversations) < agent.max_concurrent):
                
                # Debe atender el departamento
                if department in agent.departments:
                    available_agents.append(agent)
        
        if not available_agents:
            return None
        
        # Ordenar por mejor candidato
        available_agents.sort(
            key=lambda a: (
                len(a.current_conversations),  # Menos carga primero
                -a.performance_rating,  # Mejor rating primero
                a.average_response_time,  # Más rápido primero
            )
        )
        
        return available_agents[0]
    
    async def _assign_conversation(
        self,
        queued: QueuedConversation,
        agent: HumanAgent,
    ):
        """Asigna una conversación a un agente"""
        
        # Remover de cola
        if queued in self.queues[queued.department]:
            self.queues[queued.department].remove(queued)
        
        # Asignar
        queued.assigned_agent_id = agent.agent_id
        agent.current_conversations.add(queued.conversation_id)
        self.active_conversations[queued.conversation_id] = queued
        
        # Actualizar estado del agente
        if len(agent.current_conversations) > 0:
            agent.status = AgentStatus.BUSY
        
        # Métricas
        wait_time = (datetime.utcnow() - queued.queued_at).total_seconds()
        self._update_wait_time_metrics(wait_time)
        self.total_assigned += 1
        
        logger.info(
            f"Assigned conversation {queued.conversation_id} to agent {agent.name} "
            f"(wait time: {wait_time:.1f}s)"
        )
        
        # Notificar al agente
        await self._notify_agent(agent, queued)
    
    async def _notify_agent(self, agent: HumanAgent, queued: QueuedConversation):
        """Notifica al agente sobre la nueva conversación"""
        
        notification = {
            "type": "new_conversation",
            "conversation_id": queued.conversation_id,
            "department": queued.department.value,
            "priority": queued.priority,
            "customer_type": queued.context.customer_type.value,
            "customer_name": queued.context.contact_info.name,
            "customer_email": queued.context.contact_info.email,
            "customer_phone": queued.context.contact_info.phone,
            "ai_summary": queued.ai_summary,
            "customer_mood": queued.customer_mood,
            "context": queued.context.to_dict(),
        }
        
        # En producción, esto se enviaría vía WebSocket, email, etc.
        # Por ahora, solo logeamos
        logger.info(f"Notification to {agent.name}: {notification}")
        
        # Si tenemos Redis, publicar evento
        if self.redis_client:
            await self.redis_client.publish(
                f"agent:{agent.agent_id}:notifications",
                notification
            )
    
    async def _assign_pending_conversations(self, agent_id: str):
        """Asigna conversaciones pendientes cuando un agente se hace disponible"""
        
        agent = self.agents[agent_id]
        
        # Buscar en las colas de los departamentos que atiende
        for department in agent.departments:
            if not self.queues[department]:
                continue
            
            # Mientras tenga capacidad, asignar conversaciones
            while len(agent.current_conversations) < agent.max_concurrent:
                if not self.queues[department]:
                    break
                
                # Tomar la primera conversación (mayor prioridad)
                queued = self.queues[department][0]
                await self._assign_conversation(queued, agent)
    
    async def complete_conversation(
        self,
        conversation_id: str,
        success: bool = True,
        notes: Optional[str] = None,
    ):
        """Marca una conversación como completada"""
        
        if conversation_id not in self.active_conversations:
            logger.warning(f"Conversation {conversation_id} not found in active conversations")
            return
        
        queued = self.active_conversations[conversation_id]
        agent = self.agents.get(queued.assigned_agent_id)
        
        if not agent:
            logger.error(f"Agent {queued.assigned_agent_id} not found")
            return
        
        # Remover de conversaciones activas
        agent.current_conversations.discard(conversation_id)
        del self.active_conversations[conversation_id]
        
        # Actualizar métricas del agente
        agent.total_conversations += 1
        if success:
            agent.successful_closures += 1
        
        # Actualizar estado si quedó libre
        if len(agent.current_conversations) == 0:
            agent.status = AgentStatus.AVAILABLE
        
        # Métricas globales
        self.total_completed += 1
        
        logger.info(
            f"Completed conversation {conversation_id} with agent {agent.name} "
            f"(success: {success})"
        )
        
        # Intentar asignar siguiente conversación
        await self._assign_pending_conversations(agent.agent_id)
    
    def _determine_customer_mood(self, context: ConversationContext) -> str:
        """Determina el mood del cliente basado en el contexto"""
        
        # Basado en tipo de cliente
        if context.customer_type == CustomerType.VIP:
            return "expectant"  # VIPs tienen altas expectativas
        
        if context.customer_type == CustomerType.TIME_WASTER:
            return "undecided"
        
        # Basado en señales de compra vs frustración
        if context.purchase_signals > 3:
            return "enthusiastic"
        
        if context.question_count > 5 and context.purchase_signals == 0:
            return "curious"
        
        # Basado en tiempo en conversación
        if context.message_count > 10 and context.purchase_signals < 2:
            return "frustrated"
        
        return "neutral"
    
    def _calculate_estimated_wait_time(self, department: Department, priority: int) -> float:
        """Calcula el tiempo estimado de espera"""
        
        # Contar agentes disponibles para el departamento
        available_capacity = 0
        for agent in self.agents.values():
            if department in agent.departments:
                if agent.status == AgentStatus.AVAILABLE:
                    available_capacity += agent.max_concurrent
                elif agent.status == AgentStatus.BUSY:
                    available_capacity += (agent.max_concurrent - len(agent.current_conversations))
        
        if available_capacity == 0:
            # Sin capacidad, estimar basado en promedio
            return self.average_wait_time * (1 + len(self.queues[department]))
        
        # Contar cuántas conversaciones hay antes en la cola
        position = len(self.queues[department])
        
        # Tiempo base por posición
        base_time = (position / max(available_capacity, 1)) * 60  # 60 segundos por conversación
        
        # Ajustar por prioridad (mayor prioridad = menor tiempo)
        priority_factor = (6 - priority) / 5  # 1 = 1.0x, 5 = 0.2x
        
        return base_time * priority_factor
    
    def _update_wait_time_metrics(self, wait_time: float):
        """Actualiza las métricas de tiempo de espera"""
        
        # Promedio móvil
        if self.average_wait_time == 0:
            self.average_wait_time = wait_time
        else:
            self.average_wait_time = (self.average_wait_time * 0.9) + (wait_time * 0.1)
    
    async def get_queue_status(self, department: Optional[Department] = None) -> Dict[str, Any]:
        """Obtiene el estado de las colas"""
        
        if department:
            departments = [department]
        else:
            departments = list(Department)
        
        status = {
            "timestamp": datetime.utcnow().isoformat(),
            "departments": {},
            "agents": {
                "total": len(self.agents),
                "available": len([a for a in self.agents.values() if a.status == AgentStatus.AVAILABLE]),
                "busy": len([a for a in self.agents.values() if a.status == AgentStatus.BUSY]),
                "away": len([a for a in self.agents.values() if a.status == AgentStatus.AWAY]),
                "offline": len([a for a in self.agents.values() if a.status == AgentStatus.OFFLINE]),
            },
            "metrics": {
                "total_queued": self.total_queued,
                "total_assigned": self.total_assigned,
                "total_completed": self.total_completed,
                "average_wait_time": self.average_wait_time,
                "active_conversations": len(self.active_conversations),
            }
        }
        
        for dept in departments:
            queue = self.queues[dept]
            status["departments"][dept.value] = {
                "queue_length": len(queue),
                "priorities": {
                    "urgent": len([q for q in queue if q.priority == 1]),
                    "high": len([q for q in queue if q.priority == 2]),
                    "normal": len([q for q in queue if q.priority == 3]),
                    "low": len([q for q in queue if q.priority == 4]),
                },
                "estimated_wait_time": self._calculate_estimated_wait_time(dept, 3),
            }
        
        return status
    
    async def get_agent_performance(self, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """Obtiene métricas de performance de agentes"""
        
        if agent_id:
            if agent_id not in self.agents:
                raise ValueError(f"Agent {agent_id} not found")
            agents = [self.agents[agent_id]]
        else:
            agents = list(self.agents.values())
        
        performance = {
            "timestamp": datetime.utcnow().isoformat(),
            "agents": []
        }
        
        for agent in agents:
            success_rate = 0.0
            if agent.total_conversations > 0:
                success_rate = (agent.successful_closures / agent.total_conversations) * 100
            
            performance["agents"].append({
                "agent_id": agent.agent_id,
                "name": agent.name,
                "status": agent.status.value,
                "departments": [d.value for d in agent.departments],
                "current_load": len(agent.current_conversations),
                "max_concurrent": agent.max_concurrent,
                "total_conversations": agent.total_conversations,
                "successful_closures": agent.successful_closures,
                "success_rate": success_rate,
                "performance_rating": agent.performance_rating,
                "average_response_time": agent.average_response_time,
                "last_activity": agent.last_activity.isoformat() if agent.last_activity else None,
            })
        
        return performance
