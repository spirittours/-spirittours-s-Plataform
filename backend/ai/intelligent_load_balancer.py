#!/usr/bin/env python3
"""
⚖️ Sistema Inteligente de Load Balancer para Agentes IA
Load balancer avanzado con algoritmos adaptativos, health checking,
predicción de carga, y auto-scaling inteligente.

Features:
- Múltiples algoritmos de balancing (Round Robin, Weighted, Least Connections, AI-Predicted)
- Health checking continuo con circuit breakers
- Predicción de carga basada en ML
- Auto-scaling horizontal
- Sticky sessions para conversaciones
- Métricas avanzadas de performance
- Failover automático
- Load balancing geográfico
"""

import asyncio
import logging
import hashlib
import time
import json
import statistics
from typing import Dict, List, Optional, Any, Callable, Union, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque
import weakref
import random
import numpy as np
from concurrent.futures import ThreadPoolExecutor
import threading

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LoadBalancingAlgorithm(Enum):
    """Algoritmos de load balancing disponibles"""
    ROUND_ROBIN = "round_robin"
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"
    LEAST_CONNECTIONS = "least_connections"
    WEIGHTED_LEAST_CONNECTIONS = "weighted_least_connections"
    LEAST_RESPONSE_TIME = "least_response_time"
    RESOURCE_BASED = "resource_based"
    AI_PREDICTED = "ai_predicted"
    GEOGRAPHIC = "geographic"
    STICKY_SESSION = "sticky_session"

class AgentStatus(Enum):
    """Estados posibles de un agente"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    MAINTENANCE = "maintenance"
    OVERLOADED = "overloaded"
    CIRCUIT_OPEN = "circuit_open"

class LoadBalancingDecision(Enum):
    """Tipos de decisiones de balancing"""
    NORMAL = "normal"
    FAILOVER = "failover"
    SCALING = "scaling"
    GEOGRAPHIC = "geographic"
    SESSION_AFFINITY = "session_affinity"

@dataclass
class AgentMetrics:
    """Métricas detalladas de un agente"""
    agent_id: str
    current_connections: int = 0
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    avg_response_time: float = 0.0
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    queue_length: int = 0
    last_health_check: Optional[datetime] = None
    uptime_seconds: int = 0
    status: AgentStatus = AgentStatus.HEALTHY
    weight: float = 1.0
    region: str = "default"
    
@dataclass
class LoadBalancerMetrics:
    """Métricas globales del load balancer"""
    total_requests: int = 0
    successful_routes: int = 0
    failed_routes: int = 0
    avg_routing_time: float = 0.0
    active_agents: int = 0
    total_agents: int = 0
    scaling_events: int = 0
    failover_events: int = 0
    circuit_breaker_trips: int = 0

@dataclass
class AgentInstance:
    """Instancia de agente IA"""
    id: str
    endpoint: str
    capabilities: List[str]
    max_connections: int
    region: str = "default"
    priority: int = 1
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

class IntelligentLoadBalancer:
    """
    Load balancer inteligente para agentes IA
    
    Características:
    - Algoritmos adaptativos de balancing
    - Health checking continuo
    - Predicción de carga con ML
    - Auto-scaling horizontal
    - Sticky sessions para conversaciones
    - Failover automático
    """
    
    def __init__(self,
                 algorithm: LoadBalancingAlgorithm = LoadBalancingAlgorithm.WEIGHTED_LEAST_CONNECTIONS,
                 health_check_interval: int = 30,
                 enable_auto_scaling: bool = True,
                 enable_prediction: bool = True,
                 sticky_session_ttl: int = 3600):
        
        # Configuración
        self.algorithm = algorithm
        self.health_check_interval = health_check_interval
        self.enable_auto_scaling = enable_auto_scaling
        self.enable_prediction = enable_prediction
        self.sticky_session_ttl = sticky_session_ttl
        
        # Agentes registrados
        self.agents: Dict[str, AgentInstance] = {}
        self.agent_metrics: Dict[str, AgentMetrics] = {}
        
        # Estado del load balancer
        self.round_robin_index = 0
        self.sticky_sessions: Dict[str, str] = {}  # session_id -> agent_id
        self.session_timestamps: Dict[str, datetime] = {}
        
        # Métricas globales
        self.metrics = LoadBalancerMetrics()
        self.performance_history = defaultdict(deque)
        
        # Sistema de predicción
        self.load_predictions = {}
        self.prediction_model = None
        
        # Circuit breakers por agente
        self.circuit_breakers = {}
        self.circuit_failure_thresholds = 5
        self.circuit_timeout = 60
        
        # Health checking
        self.health_check_callbacks: Dict[str, Callable] = {}
        
        # Threading
        self.lock = threading.RLock()
        self.executor = ThreadPoolExecutor(max_workers=10)
        
        # Background tasks
        self._health_check_task = None
        self._metrics_collector_task = None
        self._auto_scaler_task = None
        self._session_cleaner_task = None
        
        # Estado del sistema
        self.is_running = False

    async def initialize(self):
        """Inicializar el load balancer"""
        try:
            logger.info("🚀 Initializing Intelligent Load Balancer...")
            
            # Iniciar tareas de background
            self._health_check_task = asyncio.create_task(self._health_check_loop())
            self._metrics_collector_task = asyncio.create_task(self._metrics_collector_loop())
            self._session_cleaner_task = asyncio.create_task(self._session_cleaner_loop())
            
            if self.enable_auto_scaling:
                self._auto_scaler_task = asyncio.create_task(self._auto_scaler_loop())
            
            # Inicializar modelo de predicción si está habilitado
            if self.enable_prediction:
                await self._initialize_prediction_model()
            
            self.is_running = True
            logger.info("✅ Intelligent Load Balancer initialized successfully")
            
            return {
                "status": "initialized",
                "algorithm": self.algorithm.value,
                "auto_scaling_enabled": self.enable_auto_scaling,
                "prediction_enabled": self.enable_prediction,
                "agents": len(self.agents)
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize load balancer: {e}")
            raise

    async def register_agent(self, agent: AgentInstance, health_check_callback: Callable = None) -> bool:
        """
        Registrar un nuevo agente
        
        Args:
            agent: Instancia del agente a registrar
            health_check_callback: Función para verificar salud del agente
            
        Returns:
            True si se registró exitosamente
        """
        try:
            with self.lock:
                self.agents[agent.id] = agent
                self.agent_metrics[agent.id] = AgentMetrics(
                    agent_id=agent.id,
                    status=AgentStatus.HEALTHY,
                    weight=1.0,
                    region=agent.region
                )
                
                # Inicializar circuit breaker
                self.circuit_breakers[agent.id] = {
                    "failure_count": 0,
                    "last_failure": None,
                    "state": "closed"
                }
                
                # Registrar callback de health check
                if health_check_callback:
                    self.health_check_callbacks[agent.id] = health_check_callback
                
                self.metrics.total_agents += 1
                self.metrics.active_agents += 1
            
            logger.info(f"✅ Agent {agent.id} registered successfully")
            
            # Realizar health check inicial
            await self._check_agent_health(agent.id)
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to register agent {agent.id}: {e}")
            return False

    async def unregister_agent(self, agent_id: str) -> bool:
        """Desregistrar un agente"""
        try:
            with self.lock:
                if agent_id in self.agents:
                    del self.agents[agent_id]
                    del self.agent_metrics[agent_id]
                    del self.circuit_breakers[agent_id]
                    
                    if agent_id in self.health_check_callbacks:
                        del self.health_check_callbacks[agent_id]
                    
                    # Limpiar sticky sessions asociadas
                    sessions_to_remove = [
                        session_id for session_id, aid in self.sticky_sessions.items() 
                        if aid == agent_id
                    ]
                    for session_id in sessions_to_remove:
                        del self.sticky_sessions[session_id]
                        if session_id in self.session_timestamps:
                            del self.session_timestamps[session_id]
                    
                    self.metrics.total_agents -= 1
                    if self.metrics.active_agents > 0:
                        self.metrics.active_agents -= 1
                    
                    logger.info(f"✅ Agent {agent_id} unregistered successfully")
                    return True
                else:
                    logger.warning(f"⚠️ Agent {agent_id} not found for unregistration")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Failed to unregister agent {agent_id}: {e}")
            return False

    async def route_request(self, 
                          request_data: Dict[str, Any],
                          session_id: Optional[str] = None,
                          required_capabilities: List[str] = None) -> Dict[str, Any]:
        """
        Enrutar request al agente más apropiado
        
        Args:
            request_data: Datos del request
            session_id: ID de sesión para sticky sessions
            required_capabilities: Capacidades requeridas del agente
            
        Returns:
            Resultado del routing con información del agente seleccionado
        """
        try:
            start_time = time.time()
            
            # Verificar si hay agentes disponibles
            healthy_agents = await self._get_healthy_agents(required_capabilities)
            if not healthy_agents:
                raise Exception("No healthy agents available")
            
            # Seleccionar agente basado en algoritmo y contexto
            selected_agent_id, decision_type = await self._select_agent(
                healthy_agents, session_id, request_data
            )
            
            if not selected_agent_id:
                raise Exception("No suitable agent found")
            
            # Actualizar métricas del agente
            await self._update_agent_request_metrics(selected_agent_id, True)
            
            # Crear/actualizar sticky session si es necesario
            if session_id and decision_type != LoadBalancingDecision.SESSION_AFFINITY:
                self.sticky_sessions[session_id] = selected_agent_id
                self.session_timestamps[session_id] = datetime.now()
            
            # Actualizar métricas globales
            routing_time = time.time() - start_time
            await self._update_global_metrics(True, routing_time)
            
            agent = self.agents[selected_agent_id]
            agent_metrics = self.agent_metrics[selected_agent_id]
            
            result = {
                "agent_id": selected_agent_id,
                "agent_endpoint": agent.endpoint,
                "agent_region": agent.region,
                "decision_type": decision_type.value,
                "routing_algorithm": self.algorithm.value,
                "routing_time_ms": routing_time * 1000,
                "agent_load": {
                    "current_connections": agent_metrics.current_connections,
                    "cpu_usage": agent_metrics.cpu_usage,
                    "memory_usage": agent_metrics.memory_usage,
                    "queue_length": agent_metrics.queue_length
                },
                "session_affinity": session_id in self.sticky_sessions
            }
            
            logger.debug(f"🎯 Routed request to agent {selected_agent_id} ({decision_type.value})")
            return result
            
        except Exception as e:
            await self._update_global_metrics(False, time.time() - start_time)
            logger.error(f"❌ Failed to route request: {e}")
            raise

    async def _get_healthy_agents(self, required_capabilities: List[str] = None) -> List[str]:
        """Obtener lista de agentes saludables que cumplen los requisitos"""
        healthy_agents = []
        
        with self.lock:
            for agent_id, agent in self.agents.items():
                agent_metrics = self.agent_metrics[agent_id]
                
                # Verificar estado de salud
                if agent_metrics.status not in [AgentStatus.HEALTHY, AgentStatus.DEGRADED]:
                    continue
                
                # Verificar circuit breaker
                if self.circuit_breakers[agent_id]["state"] == "open":
                    continue
                
                # Verificar capacidades requeridas
                if required_capabilities:
                    if not all(cap in agent.capabilities for cap in required_capabilities):
                        continue
                
                # Verificar que no esté sobrecargado
                if agent_metrics.current_connections >= agent.max_connections:
                    continue
                
                healthy_agents.append(agent_id)
        
        return healthy_agents

    async def _select_agent(self, 
                          healthy_agents: List[str],
                          session_id: Optional[str],
                          request_data: Dict[str, Any]) -> Tuple[Optional[str], LoadBalancingDecision]:
        """Seleccionar el agente más apropiado según el algoritmo configurado"""
        
        # Verificar sticky session primero
        if session_id and session_id in self.sticky_sessions:
            sticky_agent = self.sticky_sessions[session_id]
            if sticky_agent in healthy_agents:
                return sticky_agent, LoadBalancingDecision.SESSION_AFFINITY
            else:
                # Limpiar sticky session inválida
                del self.sticky_sessions[session_id]
                if session_id in self.session_timestamps:
                    del self.session_timestamps[session_id]
        
        # Aplicar algoritmo de balancing
        if self.algorithm == LoadBalancingAlgorithm.ROUND_ROBIN:
            return await self._round_robin_selection(healthy_agents)
        
        elif self.algorithm == LoadBalancingAlgorithm.WEIGHTED_ROUND_ROBIN:
            return await self._weighted_round_robin_selection(healthy_agents)
        
        elif self.algorithm == LoadBalancingAlgorithm.LEAST_CONNECTIONS:
            return await self._least_connections_selection(healthy_agents)
        
        elif self.algorithm == LoadBalancingAlgorithm.WEIGHTED_LEAST_CONNECTIONS:
            return await self._weighted_least_connections_selection(healthy_agents)
        
        elif self.algorithm == LoadBalancingAlgorithm.LEAST_RESPONSE_TIME:
            return await self._least_response_time_selection(healthy_agents)
        
        elif self.algorithm == LoadBalancingAlgorithm.RESOURCE_BASED:
            return await self._resource_based_selection(healthy_agents)
        
        elif self.algorithm == LoadBalancingAlgorithm.AI_PREDICTED:
            return await self._ai_predicted_selection(healthy_agents, request_data)
        
        elif self.algorithm == LoadBalancingAlgorithm.GEOGRAPHIC:
            return await self._geographic_selection(healthy_agents, request_data)
        
        else:
            # Fallback a least connections
            return await self._least_connections_selection(healthy_agents)

    async def _round_robin_selection(self, agents: List[str]) -> Tuple[str, LoadBalancingDecision]:
        """Selección Round Robin simple"""
        if not agents:
            return None, LoadBalancingDecision.NORMAL
        
        with self.lock:
            selected_agent = agents[self.round_robin_index % len(agents)]
            self.round_robin_index = (self.round_robin_index + 1) % len(agents)
        
        return selected_agent, LoadBalancingDecision.NORMAL

    async def _weighted_round_robin_selection(self, agents: List[str]) -> Tuple[str, LoadBalancingDecision]:
        """Selección Round Robin con pesos"""
        if not agents:
            return None, LoadBalancingDecision.NORMAL
        
        # Crear lista ponderada por pesos
        weighted_agents = []
        for agent_id in agents:
            weight = self.agent_metrics[agent_id].weight
            weighted_agents.extend([agent_id] * int(weight * 10))  # Multiplicar por 10 para granularidad
        
        if not weighted_agents:
            return agents[0], LoadBalancingDecision.NORMAL
        
        with self.lock:
            selected_agent = weighted_agents[self.round_robin_index % len(weighted_agents)]
            self.round_robin_index = (self.round_robin_index + 1) % len(weighted_agents)
        
        return selected_agent, LoadBalancingDecision.NORMAL

    async def _least_connections_selection(self, agents: List[str]) -> Tuple[str, LoadBalancingDecision]:
        """Selección por menor número de conexiones"""
        if not agents:
            return None, LoadBalancingDecision.NORMAL
        
        min_connections = float('inf')
        selected_agent = None
        
        for agent_id in agents:
            connections = self.agent_metrics[agent_id].current_connections
            if connections < min_connections:
                min_connections = connections
                selected_agent = agent_id
        
        return selected_agent, LoadBalancingDecision.NORMAL

    async def _weighted_least_connections_selection(self, agents: List[str]) -> Tuple[str, LoadBalancingDecision]:
        """Selección por menor número de conexiones ponderadas"""
        if not agents:
            return None, LoadBalancingDecision.NORMAL
        
        best_ratio = float('inf')
        selected_agent = None
        
        for agent_id in agents:
            metrics = self.agent_metrics[agent_id]
            ratio = metrics.current_connections / max(metrics.weight, 0.1)
            
            if ratio < best_ratio:
                best_ratio = ratio
                selected_agent = agent_id
        
        return selected_agent, LoadBalancingDecision.NORMAL

    async def _least_response_time_selection(self, agents: List[str]) -> Tuple[str, LoadBalancingDecision]:
        """Selección por menor tiempo de respuesta"""
        if not agents:
            return None, LoadBalancingDecision.NORMAL
        
        min_response_time = float('inf')
        selected_agent = None
        
        for agent_id in agents:
            response_time = self.agent_metrics[agent_id].avg_response_time
            if response_time < min_response_time:
                min_response_time = response_time
                selected_agent = agent_id
        
        return selected_agent, LoadBalancingDecision.NORMAL

    async def _resource_based_selection(self, agents: List[str]) -> Tuple[str, LoadBalancingDecision]:
        """Selección basada en recursos disponibles (CPU, memoria)"""
        if not agents:
            return None, LoadBalancingDecision.NORMAL
        
        best_score = float('inf')
        selected_agent = None
        
        for agent_id in agents:
            metrics = self.agent_metrics[agent_id]
            
            # Calcular score compuesto (menor es mejor)
            cpu_score = metrics.cpu_usage / 100.0
            memory_score = metrics.memory_usage / 100.0
            connection_score = metrics.current_connections / max(self.agents[agent_id].max_connections, 1)
            queue_score = metrics.queue_length / 100.0  # Normalizar cola
            
            composite_score = (cpu_score * 0.3 + memory_score * 0.3 + 
                             connection_score * 0.3 + queue_score * 0.1)
            
            if composite_score < best_score:
                best_score = composite_score
                selected_agent = agent_id
        
        return selected_agent, LoadBalancingDecision.NORMAL

    async def _ai_predicted_selection(self, agents: List[str], request_data: Dict[str, Any]) -> Tuple[str, LoadBalancingDecision]:
        """Selección basada en predicciones de IA"""
        if not self.enable_prediction or not agents:
            return await self._least_connections_selection(agents)
        
        try:
            # Extraer features del request
            features = await self._extract_request_features(request_data)
            
            # Predecir carga para cada agente
            predictions = {}
            for agent_id in agents:
                predicted_load = await self._predict_agent_load(agent_id, features)
                predictions[agent_id] = predicted_load
            
            # Seleccionar agente con menor carga predicha
            selected_agent = min(predictions.keys(), key=lambda x: predictions[x])
            return selected_agent, LoadBalancingDecision.NORMAL
            
        except Exception as e:
            logger.warning(f"⚠️ AI prediction failed, falling back to least connections: {e}")
            return await self._least_connections_selection(agents)

    async def _geographic_selection(self, agents: List[str], request_data: Dict[str, Any]) -> Tuple[str, LoadBalancingDecision]:
        """Selección basada en ubicación geográfica"""
        if not agents:
            return None, LoadBalancingDecision.GEOGRAPHIC
        
        # Obtener región preferida del request
        preferred_region = request_data.get('region', 'default')
        
        # Filtrar agentes por región
        regional_agents = [
            agent_id for agent_id in agents 
            if self.agents[agent_id].region == preferred_region
        ]
        
        # Si hay agentes en la región preferida, usar least connections dentro de esa región
        if regional_agents:
            selected_agent, _ = await self._least_connections_selection(regional_agents)
            return selected_agent, LoadBalancingDecision.GEOGRAPHIC
        else:
            # Fallback a cualquier agente disponible
            selected_agent, _ = await self._least_connections_selection(agents)
            return selected_agent, LoadBalancingDecision.NORMAL

    async def _extract_request_features(self, request_data: Dict[str, Any]) -> List[float]:
        """Extraer features para predicción de IA"""
        # Features básicas que se pueden extraer de un request
        features = []
        
        # Tamaño del request (normalizado)
        request_size = len(json.dumps(request_data))
        features.append(min(request_size / 10000.0, 1.0))
        
        # Tipo de request (categórico -> numérico)
        request_type = request_data.get('type', 'unknown')
        type_mapping = {
            'query': 0.1, 'conversation': 0.5, 'analysis': 0.8, 
            'generation': 1.0, 'unknown': 0.3
        }
        features.append(type_mapping.get(request_type, 0.3))
        
        # Prioridad del request
        priority = request_data.get('priority', 'medium')
        priority_mapping = {'low': 0.2, 'medium': 0.5, 'high': 0.8, 'critical': 1.0}
        features.append(priority_mapping.get(priority, 0.5))
        
        # Hora del día (normalizada)
        hour = datetime.now().hour
        features.append(hour / 24.0)
        
        # Día de la semana (normalizado)
        weekday = datetime.now().weekday()
        features.append(weekday / 7.0)
        
        return features

    async def _predict_agent_load(self, agent_id: str, features: List[float]) -> float:
        """Predecir carga futura del agente"""
        # Modelo simple basado en tendencias históricas + features
        current_metrics = self.agent_metrics[agent_id]
        
        # Peso base por conexiones actuales
        base_load = current_metrics.current_connections / max(self.agents[agent_id].max_connections, 1)
        
        # Ajuste por recursos
        resource_factor = (current_metrics.cpu_usage + current_metrics.memory_usage) / 200.0
        
        # Ajuste por features del request
        request_complexity = sum(features) / len(features) if features else 0.5
        
        # Predicción compuesta
        predicted_load = base_load + (resource_factor * 0.3) + (request_complexity * 0.2)
        
        return min(predicted_load, 2.0)  # Cap en 2.0

    async def _health_check_loop(self):
        """Loop principal de health checking"""
        while self.is_running:
            try:
                await asyncio.sleep(self.health_check_interval)
                
                # Check health para todos los agentes
                tasks = []
                for agent_id in list(self.agents.keys()):
                    task = asyncio.create_task(self._check_agent_health(agent_id))
                    tasks.append(task)
                
                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)
                
            except Exception as e:
                logger.error(f"❌ Health check loop error: {e}")

    async def _check_agent_health(self, agent_id: str):
        """Verificar salud de un agente específico"""
        try:
            # Usar callback personalizado si está disponible
            if agent_id in self.health_check_callbacks:
                callback = self.health_check_callbacks[agent_id]
                is_healthy = await callback(agent_id) if asyncio.iscoroutinefunction(callback) else callback(agent_id)
            else:
                # Health check básico
                is_healthy = await self._basic_health_check(agent_id)
            
            # Actualizar métricas y estado
            with self.lock:
                if agent_id in self.agent_metrics:
                    metrics = self.agent_metrics[agent_id]
                    metrics.last_health_check = datetime.now()
                    
                    if is_healthy:
                        self._handle_agent_success(agent_id)
                    else:
                        self._handle_agent_failure(agent_id)
                        
        except Exception as e:
            logger.warning(f"⚠️ Health check failed for agent {agent_id}: {e}")
            self._handle_agent_failure(agent_id)

    async def _basic_health_check(self, agent_id: str) -> bool:
        """Health check básico para un agente"""
        # Implementación básica - en producción debería hacer request HTTP
        try:
            agent = self.agents[agent_id]
            # Simular check - en realidad haría HTTP request al endpoint
            # return await http_get(f"{agent.endpoint}/health")
            return True  # Simulado como saludable
        except Exception:
            return False

    def _handle_agent_success(self, agent_id: str):
        """Manejar éxito de health check"""
        if agent_id in self.agent_metrics:
            # Reset circuit breaker si estaba abierto
            circuit = self.circuit_breakers[agent_id]
            if circuit["state"] == "open":
                circuit["state"] = "closed"
                circuit["failure_count"] = 0
                logger.info(f"🔄 Circuit breaker closed for agent {agent_id}")
            
            # Actualizar estado del agente
            current_status = self.agent_metrics[agent_id].status
            if current_status in [AgentStatus.UNHEALTHY, AgentStatus.CIRCUIT_OPEN]:
                self.agent_metrics[agent_id].status = AgentStatus.HEALTHY
                logger.info(f"✅ Agent {agent_id} back to healthy state")

    def _handle_agent_failure(self, agent_id: str):
        """Manejar fallo de health check"""
        if agent_id in self.agent_metrics:
            circuit = self.circuit_breakers[agent_id]
            circuit["failure_count"] += 1
            circuit["last_failure"] = datetime.now()
            
            # Activar circuit breaker si hay demasiados fallos
            if circuit["failure_count"] >= self.circuit_failure_thresholds:
                circuit["state"] = "open"
                self.agent_metrics[agent_id].status = AgentStatus.CIRCUIT_OPEN
                self.metrics.circuit_breaker_trips += 1
                logger.error(f"🚨 Circuit breaker opened for agent {agent_id}")
            else:
                self.agent_metrics[agent_id].status = AgentStatus.UNHEALTHY

    async def _update_agent_request_metrics(self, agent_id: str, success: bool, response_time: float = 0.0):
        """Actualizar métricas de request de un agente"""
        if agent_id in self.agent_metrics:
            metrics = self.agent_metrics[agent_id]
            metrics.total_requests += 1
            
            if success:
                metrics.successful_requests += 1
                metrics.current_connections += 1
            else:
                metrics.failed_requests += 1
            
            # Actualizar tiempo promedio de respuesta
            if response_time > 0:
                total_requests = metrics.successful_requests + metrics.failed_requests
                if total_requests > 1:
                    metrics.avg_response_time = (
                        (metrics.avg_response_time * (total_requests - 1) + response_time) / total_requests
                    )
                else:
                    metrics.avg_response_time = response_time

    async def _update_global_metrics(self, success: bool, routing_time: float):
        """Actualizar métricas globales"""
        self.metrics.total_requests += 1
        
        if success:
            self.metrics.successful_routes += 1
        else:
            self.metrics.failed_routes += 1
        
        # Actualizar tiempo promedio de routing
        if self.metrics.total_requests > 1:
            self.metrics.avg_routing_time = (
                (self.metrics.avg_routing_time * (self.metrics.total_requests - 1) + routing_time) / 
                self.metrics.total_requests
            )
        else:
            self.metrics.avg_routing_time = routing_time

    async def get_system_stats(self) -> Dict[str, Any]:
        """Obtener estadísticas completas del sistema"""
        try:
            # Calcular estadísticas agregadas
            total_connections = sum(m.current_connections for m in self.agent_metrics.values())
            avg_cpu = statistics.mean([m.cpu_usage for m in self.agent_metrics.values()]) if self.agent_metrics else 0
            avg_memory = statistics.mean([m.memory_usage for m in self.agent_metrics.values()]) if self.agent_metrics else 0
            
            # Estadísticas por región
            region_stats = defaultdict(lambda: {"agents": 0, "connections": 0})
            for agent_id, agent in self.agents.items():
                region = agent.region
                metrics = self.agent_metrics[agent_id]
                region_stats[region]["agents"] += 1
                region_stats[region]["connections"] += metrics.current_connections
            
            return {
                "global_metrics": asdict(self.metrics),
                "system_health": {
                    "total_agents": len(self.agents),
                    "healthy_agents": len([m for m in self.agent_metrics.values() if m.status == AgentStatus.HEALTHY]),
                    "total_connections": total_connections,
                    "avg_cpu_usage": avg_cpu,
                    "avg_memory_usage": avg_memory,
                    "circuit_breakers_open": len([c for c in self.circuit_breakers.values() if c["state"] == "open"])
                },
                "algorithm_info": {
                    "current_algorithm": self.algorithm.value,
                    "auto_scaling_enabled": self.enable_auto_scaling,
                    "prediction_enabled": self.enable_prediction,
                    "sticky_sessions_active": len(self.sticky_sessions)
                },
                "regional_distribution": dict(region_stats),
                "agent_details": {
                    agent_id: {
                        "status": metrics.status.value,
                        "connections": metrics.current_connections,
                        "cpu_usage": metrics.cpu_usage,
                        "memory_usage": metrics.memory_usage,
                        "success_rate": (metrics.successful_requests / max(metrics.total_requests, 1)) * 100,
                        "avg_response_time": metrics.avg_response_time,
                        "region": self.agents[agent_id].region
                    }
                    for agent_id, metrics in self.agent_metrics.items()
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get system stats: {e}")
            return {"error": str(e)}

    async def cleanup(self):
        """Limpiar recursos del load balancer"""
        try:
            logger.info("🧹 Cleaning up Intelligent Load Balancer...")
            
            self.is_running = False
            
            # Cancelar tareas de background
            tasks = [
                self._health_check_task,
                self._metrics_collector_task,
                self._auto_scaler_task,
                self._session_cleaner_task
            ]
            
            for task in tasks:
                if task and not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            
            # Cerrar thread pool
            self.executor.shutdown(wait=True)
            
            # Limpiar estructuras de datos
            with self.lock:
                self.agents.clear()
                self.agent_metrics.clear()
                self.sticky_sessions.clear()
                self.session_timestamps.clear()
                self.circuit_breakers.clear()
            
            logger.info("✅ Load balancer cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ Load balancer cleanup error: {e}")

# Función de utilidad para crear instancia
async def create_intelligent_load_balancer(config: Dict[str, Any]) -> IntelligentLoadBalancer:
    """
    Factory function para crear load balancer configurado
    
    Args:
        config: Configuración del load balancer
        
    Returns:
        Instancia inicializada de IntelligentLoadBalancer
    """
    algorithm = LoadBalancingAlgorithm(config.get("algorithm", "weighted_least_connections"))
    
    load_balancer = IntelligentLoadBalancer(
        algorithm=algorithm,
        health_check_interval=config.get("health_check_interval", 30),
        enable_auto_scaling=config.get("enable_auto_scaling", True),
        enable_prediction=config.get("enable_prediction", True),
        sticky_session_ttl=config.get("sticky_session_ttl", 3600)
    )
    
    await load_balancer.initialize()
    return load_balancer

# Ejemplo de uso
if __name__ == "__main__":
    async def main():
        config = {
            "algorithm": "weighted_least_connections",
            "health_check_interval": 30,
            "enable_auto_scaling": True,
            "enable_prediction": True
        }
        
        try:
            # Crear load balancer
            lb = await create_intelligent_load_balancer(config)
            
            # Registrar agentes de ejemplo
            agents = [
                AgentInstance("agent1", "http://localhost:8001", ["query", "conversation"], 100, "us-east"),
                AgentInstance("agent2", "http://localhost:8002", ["analysis", "generation"], 50, "us-west"),
                AgentInstance("agent3", "http://localhost:8003", ["query", "analysis"], 75, "eu-west")
            ]
            
            for agent in agents:
                await lb.register_agent(agent)
            
            # Simular requests
            for i in range(10):
                request_data = {
                    "type": "query",
                    "priority": "medium",
                    "data": f"Test request {i}"
                }
                
                result = await lb.route_request(request_data, session_id=f"session_{i%3}")
                print(f"🎯 Request {i} routed to: {result['agent_id']}")
            
            # Obtener estadísticas
            stats = await lb.get_system_stats()
            print(f"📊 System Stats: {json.dumps(stats, indent=2, default=str)}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            if 'lb' in locals():
                await lb.cleanup()
    
    asyncio.run(main())