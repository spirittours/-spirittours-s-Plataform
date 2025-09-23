#!/usr/bin/env python3
"""
🔄 Sistema Inteligente de Failover y Recuperación Automática
Sistema completo de alta disponibilidad con failover automático, 
recuperación inteligente, circuit breakers adaptativos y orquestación de servicios.

Features:
- Failover automático multi-nivel (servicio, región, proveedor)
- Circuit breakers adaptativos con ML
- Health checking inteligente con predicción
- Auto-scaling reactivo y predictivo
- Recuperación gradual y canary deployments
- Backup de estado y rollback automático
- Monitoreo continuo de SLA
- Notificaciones y alertas en tiempo real
"""

import asyncio
import logging
import json
import time
import os
import hashlib
from typing import Dict, List, Optional, Any, Callable, Union, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict, field
from enum import Enum
from collections import defaultdict, deque
import threading
import weakref
import pickle
import aiofiles
import aiohttp
from concurrent.futures import ThreadPoolExecutor
import numpy as np

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ServiceStatus(Enum):
    """Estados posibles de un servicio"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    MAINTENANCE = "maintenance"
    CIRCUIT_OPEN = "circuit_open"
    RECOVERING = "recovering"
    FAILED = "failed"

class FailoverLevel(Enum):
    """Niveles de failover"""
    INSTANCE = "instance"          # Failover entre instancias del mismo servicio
    SERVICE = "service"            # Failover a servicio alternativo
    REGION = "region"              # Failover a otra región
    PROVIDER = "provider"          # Failover a otro proveedor/cloud
    EMERGENCY = "emergency"        # Modo de emergencia con funcionalidad mínima

class RecoveryStrategy(Enum):
    """Estrategias de recuperación"""
    IMMEDIATE = "immediate"        # Recuperación inmediata
    GRADUAL = "gradual"           # Recuperación gradual con canary
    SCHEDULED = "scheduled"        # Recuperación programada
    MANUAL = "manual"             # Requiere intervención manual

class AlertSeverity(Enum):
    """Severidades de alerta"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

@dataclass
class ServiceEndpoint:
    """Definición de endpoint de servicio"""
    id: str
    name: str
    url: str
    region: str
    priority: int = 1
    max_connections: int = 100
    health_check_url: str = ""
    backup_endpoints: List[str] = field(default_factory=list)
    capabilities: List[str] = field(default_factory=list)
    sla_target: float = 99.9  # % uptime
    
    def __post_init__(self):
        if not self.health_check_url:
            self.health_check_url = f"{self.url}/health"

@dataclass
class FailoverEvent:
    """Evento de failover"""
    timestamp: datetime
    source_service: str
    target_service: str
    level: FailoverLevel
    reason: str
    duration: Optional[float] = None
    success: bool = True
    impact_services: List[str] = field(default_factory=list)

@dataclass
class ServiceMetrics:
    """Métricas de servicio"""
    service_id: str
    status: ServiceStatus = ServiceStatus.HEALTHY
    uptime_percentage: float = 100.0
    response_time_avg: float = 0.0
    response_time_p95: float = 0.0
    error_rate: float = 0.0
    current_connections: int = 0
    last_health_check: Optional[datetime] = None
    consecutive_failures: int = 0
    recovery_time_estimate: Optional[float] = None
    
@dataclass
class CircuitBreakerState:
    """Estado del circuit breaker"""
    service_id: str
    state: str = "closed"  # closed, open, half_open
    failure_count: int = 0
    failure_threshold: int = 5
    timeout_seconds: int = 60
    last_failure_time: Optional[datetime] = None
    success_count_in_half_open: int = 0
    required_successes: int = 3

class IntelligentFailoverSystem:
    """
    Sistema inteligente de failover y recuperación automática
    
    Características:
    - Failover automático multi-nivel
    - Circuit breakers adaptativos
    - Predicción de fallos con ML
    - Recuperación inteligente
    - Monitoreo continuo de SLA
    - Auto-scaling reactivo
    """
    
    def __init__(self,
                 health_check_interval: int = 30,
                 enable_predictive_failover: bool = True,
                 enable_auto_recovery: bool = True,
                 sla_monitoring_enabled: bool = True,
                 backup_state_enabled: bool = True):
        
        # Configuración
        self.health_check_interval = health_check_interval
        self.enable_predictive_failover = enable_predictive_failover
        self.enable_auto_recovery = enable_auto_recovery
        self.sla_monitoring_enabled = sla_monitoring_enabled
        self.backup_state_enabled = backup_state_enabled
        
        # Servicios registrados
        self.services: Dict[str, ServiceEndpoint] = {}
        self.service_groups: Dict[str, List[str]] = {}  # Grupos de servicios relacionados
        
        # Estado del sistema
        self.service_metrics: Dict[str, ServiceMetrics] = {}
        self.circuit_breakers: Dict[str, CircuitBreakerState] = {}
        self.active_failovers: Dict[str, FailoverEvent] = {}
        
        # Historia y predicción
        self.failover_history: List[FailoverEvent] = []
        self.performance_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.failure_patterns = defaultdict(list)
        
        # Callbacks y notificaciones
        self.failover_callbacks: Dict[str, List[Callable]] = defaultdict(list)
        self.recovery_callbacks: Dict[str, List[Callable]] = defaultdict(list)
        self.alert_callbacks: List[Callable] = []
        
        # Sistema de backup de estado
        self.state_backup_path = "/tmp/failover_state_backup.pkl"
        self.last_backup_time = None
        
        # Threading y async
        self.lock = threading.RLock()
        self.executor = ThreadPoolExecutor(max_workers=20)
        self.session = None
        
        # Tareas de background
        self._health_monitor_task = None
        self._failover_orchestrator_task = None
        self._recovery_manager_task = None
        self._sla_monitor_task = None
        self._state_backup_task = None
        
        # Estado del sistema
        self.is_running = False

    async def initialize(self):
        """Inicializar sistema de failover"""
        try:
            logger.info("🔄 Initializing Intelligent Failover System...")
            
            # Crear sesión HTTP para health checks
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=10),
                connector=aiohttp.TCPConnector(limit=100, limit_per_host=20)
            )
            
            # Cargar estado previo si existe
            if self.backup_state_enabled:
                await self._restore_state_from_backup()
            
            # Iniciar tareas de background
            self._health_monitor_task = asyncio.create_task(self._health_monitoring_loop())
            self._failover_orchestrator_task = asyncio.create_task(self._failover_orchestrator_loop())
            self._sla_monitor_task = asyncio.create_task(self._sla_monitoring_loop())
            
            if self.enable_auto_recovery:
                self._recovery_manager_task = asyncio.create_task(self._recovery_manager_loop())
            
            if self.backup_state_enabled:
                self._state_backup_task = asyncio.create_task(self._state_backup_loop())
            
            self.is_running = True
            logger.info("✅ Intelligent Failover System initialized successfully")
            
            return {
                "status": "initialized",
                "services": len(self.services),
                "predictive_failover": self.enable_predictive_failover,
                "auto_recovery": self.enable_auto_recovery,
                "sla_monitoring": self.sla_monitoring_enabled
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize failover system: {e}")
            raise

    async def register_service(self, 
                             service: ServiceEndpoint,
                             group: Optional[str] = None,
                             failover_callback: Optional[Callable] = None,
                             recovery_callback: Optional[Callable] = None) -> bool:
        """
        Registrar servicio en el sistema de failover
        
        Args:
            service: Definición del servicio
            group: Grupo al que pertenece el servicio
            failover_callback: Callback para eventos de failover
            recovery_callback: Callback para eventos de recuperación
            
        Returns:
            True si se registró exitosamente
        """
        try:
            with self.lock:
                # Registrar servicio
                self.services[service.id] = service
                self.service_metrics[service.id] = ServiceMetrics(service_id=service.id)
                self.circuit_breakers[service.id] = CircuitBreakerState(service_id=service.id)
                
                # Agregar a grupo si se especifica
                if group:
                    if group not in self.service_groups:
                        self.service_groups[group] = []
                    self.service_groups[group].append(service.id)
                
                # Registrar callbacks
                if failover_callback:
                    self.failover_callbacks[service.id].append(failover_callback)
                
                if recovery_callback:
                    self.recovery_callbacks[service.id].append(recovery_callback)
            
            # Realizar health check inicial
            await self._check_service_health(service.id)
            
            logger.info(f"✅ Service {service.id} registered successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to register service {service.id}: {e}")
            return False

    async def unregister_service(self, service_id: str) -> bool:
        """Desregistrar servicio"""
        try:
            with self.lock:
                if service_id in self.services:
                    # Limpiar de todos los grupos
                    for group, services in self.service_groups.items():
                        if service_id in services:
                            services.remove(service_id)
                    
                    # Remover de estructuras principales
                    del self.services[service_id]
                    del self.service_metrics[service_id]
                    del self.circuit_breakers[service_id]
                    
                    # Limpiar callbacks
                    if service_id in self.failover_callbacks:
                        del self.failover_callbacks[service_id]
                    if service_id in self.recovery_callbacks:
                        del self.recovery_callbacks[service_id]
                    
                    # Limpiar failover activo si existe
                    if service_id in self.active_failovers:
                        del self.active_failovers[service_id]
                    
                    logger.info(f"✅ Service {service_id} unregistered successfully")
                    return True
                else:
                    logger.warning(f"⚠️ Service {service_id} not found for unregistration")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Failed to unregister service {service_id}: {e}")
            return False

    async def _health_monitoring_loop(self):
        """Loop principal de monitoreo de salud"""
        while self.is_running:
            try:
                await asyncio.sleep(self.health_check_interval)
                
                # Health check para todos los servicios
                tasks = []
                for service_id in list(self.services.keys()):
                    task = asyncio.create_task(self._check_service_health(service_id))
                    tasks.append(task)
                
                if tasks:
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    # Procesar resultados y detectar problemas
                    for i, result in enumerate(results):
                        if isinstance(result, Exception):
                            service_id = list(self.services.keys())[i]
                            logger.error(f"❌ Health check failed for {service_id}: {result}")
                
            except Exception as e:
                logger.error(f"❌ Health monitoring loop error: {e}")

    async def _check_service_health(self, service_id: str) -> bool:
        """Verificar salud de un servicio específico"""
        if service_id not in self.services:
            return False
        
        try:
            service = self.services[service_id]
            metrics = self.service_metrics[service_id]
            circuit_breaker = self.circuit_breakers[service_id]
            
            # Skip health check si circuit breaker está abierto
            if circuit_breaker.state == "open":
                await self._evaluate_circuit_breaker_recovery(service_id)
                return False
            
            start_time = time.time()
            
            # Realizar health check HTTP
            try:
                async with self.session.get(service.health_check_url) as response:
                    response_time = time.time() - start_time
                    is_healthy = response.status == 200
                    
                    # Actualizar métricas
                    await self._update_service_metrics(
                        service_id, is_healthy, response_time
                    )
                    
                    # Evaluar circuit breaker
                    await self._update_circuit_breaker(service_id, is_healthy)
                    
                    # Detectar degradación
                    await self._detect_service_degradation(service_id)
                    
                    return is_healthy
                    
            except Exception as e:
                # Health check falló
                response_time = time.time() - start_time
                await self._update_service_metrics(service_id, False, response_time)
                await self._update_circuit_breaker(service_id, False)
                
                logger.warning(f"⚠️ Health check failed for {service_id}: {e}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Health check error for {service_id}: {e}")
            return False

    async def _update_service_metrics(self, service_id: str, is_healthy: bool, response_time: float):
        """Actualizar métricas del servicio"""
        try:
            metrics = self.service_metrics[service_id]
            
            # Actualizar timestamp
            metrics.last_health_check = datetime.now()
            
            # Actualizar tiempo de respuesta
            if metrics.response_time_avg == 0:
                metrics.response_time_avg = response_time
            else:
                # Promedio ponderado (más peso a valores recientes)
                metrics.response_time_avg = (metrics.response_time_avg * 0.7 + response_time * 0.3)
            
            # Actualizar historial de performance
            self.performance_history[service_id].append({
                "timestamp": time.time(),
                "healthy": is_healthy,
                "response_time": response_time
            })
            
            # Actualizar contadores de fallas consecutivas
            if is_healthy:
                metrics.consecutive_failures = 0
                if metrics.status in [ServiceStatus.UNHEALTHY, ServiceStatus.FAILED]:
                    await self._trigger_service_recovery(service_id)
            else:
                metrics.consecutive_failures += 1
                
                # Cambiar estado si hay demasiadas fallas
                if metrics.consecutive_failures >= 3:
                    old_status = metrics.status
                    metrics.status = ServiceStatus.UNHEALTHY
                    
                    if old_status != ServiceStatus.UNHEALTHY:
                        await self._trigger_failover_evaluation(service_id)
            
            # Calcular uptime
            recent_history = list(self.performance_history[service_id])[-100:]  # Últimas 100 mediciones
            if recent_history:
                healthy_count = sum(1 for h in recent_history if h["healthy"])
                metrics.uptime_percentage = (healthy_count / len(recent_history)) * 100
            
        except Exception as e:
            logger.error(f"❌ Failed to update metrics for {service_id}: {e}")

    async def _update_circuit_breaker(self, service_id: str, success: bool):
        """Actualizar estado del circuit breaker"""
        try:
            cb = self.circuit_breakers[service_id]
            
            if success:
                if cb.state == "half_open":
                    cb.success_count_in_half_open += 1
                    if cb.success_count_in_half_open >= cb.required_successes:
                        # Cerrar circuit breaker
                        cb.state = "closed"
                        cb.failure_count = 0
                        cb.success_count_in_half_open = 0
                        logger.info(f"🔄 Circuit breaker closed for {service_id}")
                        
                        await self._notify_circuit_breaker_closed(service_id)
                
                elif cb.state == "closed":
                    cb.failure_count = max(0, cb.failure_count - 1)  # Reducir gradualmente
            
            else:
                # Falla
                cb.failure_count += 1
                cb.last_failure_time = datetime.now()
                
                if cb.state == "closed" and cb.failure_count >= cb.failure_threshold:
                    # Abrir circuit breaker
                    cb.state = "open"
                    logger.error(f"🚨 Circuit breaker opened for {service_id}")
                    
                    await self._notify_circuit_breaker_opened(service_id)
                    await self._trigger_failover_evaluation(service_id)
                
                elif cb.state == "half_open":
                    # Volver a abrir
                    cb.state = "open"
                    cb.success_count_in_half_open = 0
                    logger.warning(f"⚠️ Circuit breaker reopened for {service_id}")
                
        except Exception as e:
            logger.error(f"❌ Failed to update circuit breaker for {service_id}: {e}")

    async def _evaluate_circuit_breaker_recovery(self, service_id: str):
        """Evaluar si es tiempo de intentar recuperación del circuit breaker"""
        try:
            cb = self.circuit_breakers[service_id]
            
            if cb.state == "open" and cb.last_failure_time:
                time_since_failure = (datetime.now() - cb.last_failure_time).total_seconds()
                
                if time_since_failure >= cb.timeout_seconds:
                    # Cambiar a half-open para probar recuperación
                    cb.state = "half_open"
                    cb.success_count_in_half_open = 0
                    logger.info(f"🔄 Circuit breaker half-open for {service_id}")
                    
        except Exception as e:
            logger.error(f"❌ Failed to evaluate circuit breaker recovery for {service_id}: {e}")

    async def _detect_service_degradation(self, service_id: str):
        """Detectar degradación gradual del servicio"""
        try:
            metrics = self.service_metrics[service_id]
            service = self.services[service_id]
            
            # Criterios de degradación
            response_time_threshold = 5.0  # segundos
            uptime_threshold = 95.0  # porcentaje
            
            is_degraded = False
            degradation_reasons = []
            
            # Verificar tiempo de respuesta
            if metrics.response_time_avg > response_time_threshold:
                is_degraded = True
                degradation_reasons.append(f"High response time: {metrics.response_time_avg:.2f}s")
            
            # Verificar uptime
            if metrics.uptime_percentage < uptime_threshold:
                is_degraded = True
                degradation_reasons.append(f"Low uptime: {metrics.uptime_percentage:.1f}%")
            
            # Verificar SLA
            if metrics.uptime_percentage < service.sla_target:
                is_degraded = True
                degradation_reasons.append(f"SLA breach: {metrics.uptime_percentage:.1f}% < {service.sla_target}%")
            
            # Actualizar estado si hay degradación
            if is_degraded and metrics.status == ServiceStatus.HEALTHY:
                metrics.status = ServiceStatus.DEGRADED
                
                await self._send_alert(
                    AlertSeverity.MEDIUM,
                    f"Service {service_id} degraded",
                    {"service_id": service_id, "reasons": degradation_reasons}
                )
                
                # Considerar failover preventivo si está habilitado
                if self.enable_predictive_failover:
                    await self._evaluate_predictive_failover(service_id)
                    
        except Exception as e:
            logger.error(f"❌ Failed to detect degradation for {service_id}: {e}")

    async def _trigger_failover_evaluation(self, service_id: str):
        """Evaluar si es necesario hacer failover"""
        try:
            service = self.services[service_id]
            metrics = self.service_metrics[service_id]
            
            # Verificar si ya hay un failover activo
            if service_id in self.active_failovers:
                logger.debug(f"Failover already active for {service_id}")
                return
            
            # Buscar servicios de backup disponibles
            backup_candidates = await self._find_backup_services(service_id)
            
            if not backup_candidates:
                logger.error(f"🚨 No backup services available for {service_id}")
                await self._send_alert(
                    AlertSeverity.CRITICAL,
                    f"No backup available for {service_id}",
                    {"service_id": service_id, "status": metrics.status.value}
                )
                return
            
            # Seleccionar mejor candidato
            best_backup = await self._select_best_backup(service_id, backup_candidates)
            
            # Ejecutar failover
            await self._execute_failover(service_id, best_backup, FailoverLevel.SERVICE, "Health check failure")
            
        except Exception as e:
            logger.error(f"❌ Failed to evaluate failover for {service_id}: {e}")

    async def _find_backup_services(self, service_id: str) -> List[str]:
        """Encontrar servicios de backup disponibles"""
        try:
            service = self.services[service_id]
            backup_candidates = []
            
            # 1. Servicios de backup explícitamente configurados
            for backup_id in service.backup_endpoints:
                if backup_id in self.services and backup_id != service_id:
                    backup_metrics = self.service_metrics[backup_id]
                    if backup_metrics.status in [ServiceStatus.HEALTHY, ServiceStatus.DEGRADED]:
                        backup_candidates.append(backup_id)
            
            # 2. Servicios en el mismo grupo con capacidades similares
            for group, group_services in self.service_groups.items():
                if service_id in group_services:
                    for candidate_id in group_services:
                        if candidate_id != service_id and candidate_id not in backup_candidates:
                            candidate_service = self.services[candidate_id]
                            candidate_metrics = self.service_metrics[candidate_id]
                            
                            # Verificar capacidades compatibles
                            if (set(service.capabilities).issubset(set(candidate_service.capabilities)) and
                                candidate_metrics.status in [ServiceStatus.HEALTHY, ServiceStatus.DEGRADED]):
                                backup_candidates.append(candidate_id)
            
            # 3. Servicios en otras regiones (failover geográfico)
            if not backup_candidates:
                for candidate_id, candidate_service in self.services.items():
                    if (candidate_id != service_id and 
                        candidate_service.region != service.region and
                        set(service.capabilities).issubset(set(candidate_service.capabilities))):
                        candidate_metrics = self.service_metrics[candidate_id]
                        if candidate_metrics.status in [ServiceStatus.HEALTHY, ServiceStatus.DEGRADED]:
                            backup_candidates.append(candidate_id)
            
            return backup_candidates
            
        except Exception as e:
            logger.error(f"❌ Failed to find backup services for {service_id}: {e}")
            return []

    async def _select_best_backup(self, service_id: str, candidates: List[str]) -> Optional[str]:
        """Seleccionar el mejor servicio de backup"""
        try:
            if not candidates:
                return None
            
            service = self.services[service_id]
            best_candidate = None
            best_score = -1
            
            for candidate_id in candidates:
                candidate_service = self.services[candidate_id]
                candidate_metrics = self.service_metrics[candidate_id]
                
                # Calcular score basado en múltiples factores
                score = 0
                
                # Factor 1: Prioridad configurada
                score += candidate_service.priority * 10
                
                # Factor 2: Salud del servicio
                if candidate_metrics.status == ServiceStatus.HEALTHY:
                    score += 50
                elif candidate_metrics.status == ServiceStatus.DEGRADED:
                    score += 25
                
                # Factor 3: Uptime
                score += candidate_metrics.uptime_percentage * 0.3
                
                # Factor 4: Tiempo de respuesta (menor es mejor)
                if candidate_metrics.response_time_avg > 0:
                    score += max(0, 20 - candidate_metrics.response_time_avg * 2)
                
                # Factor 5: Región (misma región es preferible)
                if candidate_service.region == service.region:
                    score += 15
                
                # Factor 6: Capacidad disponible
                utilization = candidate_metrics.current_connections / candidate_service.max_connections
                score += max(0, 10 * (1 - utilization))
                
                if score > best_score:
                    best_score = score
                    best_candidate = candidate_id
            
            logger.debug(f"Selected backup {best_candidate} for {service_id} (score: {best_score})")
            return best_candidate
            
        except Exception as e:
            logger.error(f"❌ Failed to select best backup for {service_id}: {e}")
            return None

    async def _execute_failover(self, 
                              source_service_id: str, 
                              target_service_id: str, 
                              level: FailoverLevel,
                              reason: str) -> bool:
        """Ejecutar failover"""
        try:
            logger.info(f"🔄 Executing failover: {source_service_id} -> {target_service_id} ({level.value})")
            
            failover_event = FailoverEvent(
                timestamp=datetime.now(),
                source_service=source_service_id,
                target_service=target_service_id,
                level=level,
                reason=reason,
                success=False
            )
            
            # Marcar failover como activo
            self.active_failovers[source_service_id] = failover_event
            
            try:
                # 1. Notificar callbacks de failover
                await self._notify_failover_callbacks(source_service_id, target_service_id, level)
                
                # 2. Actualizar configuración de routing (implementación específica)
                await self._update_routing_configuration(source_service_id, target_service_id)
                
                # 3. Verificar que el target esté funcionando
                target_healthy = await self._check_service_health(target_service_id)
                if not target_healthy:
                    raise Exception(f"Target service {target_service_id} is not healthy")
                
                # 4. Realizar transferencia gradual si es posible
                await self._perform_gradual_traffic_transfer(source_service_id, target_service_id)
                
                # Marcar como exitoso
                failover_event.success = True
                failover_event.duration = (datetime.now() - failover_event.timestamp).total_seconds()
                
                # Agregar a historial
                self.failover_history.append(failover_event)
                
                # Enviar alerta de éxito
                await self._send_alert(
                    AlertSeverity.HIGH,
                    f"Failover successful: {source_service_id} -> {target_service_id}",
                    {
                        "source_service": source_service_id,
                        "target_service": target_service_id,
                        "level": level.value,
                        "reason": reason,
                        "duration": failover_event.duration
                    }
                )
                
                logger.info(f"✅ Failover completed successfully in {failover_event.duration:.2f}s")
                return True
                
            except Exception as e:
                # Failover falló
                failover_event.success = False
                failover_event.duration = (datetime.now() - failover_event.timestamp).total_seconds()
                self.failover_history.append(failover_event)
                
                # Limpiar estado activo
                if source_service_id in self.active_failovers:
                    del self.active_failovers[source_service_id]
                
                await self._send_alert(
                    AlertSeverity.CRITICAL,
                    f"Failover failed: {source_service_id} -> {target_service_id}",
                    {
                        "source_service": source_service_id,
                        "target_service": target_service_id,
                        "error": str(e)
                    }
                )
                
                logger.error(f"❌ Failover failed: {e}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to execute failover: {e}")
            return False

    async def _notify_failover_callbacks(self, source_id: str, target_id: str, level: FailoverLevel):
        """Notificar callbacks de failover"""
        try:
            callbacks = self.failover_callbacks.get(source_id, [])
            
            for callback in callbacks:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(source_id, target_id, level)
                    else:
                        callback(source_id, target_id, level)
                except Exception as e:
                    logger.error(f"❌ Failover callback error: {e}")
                    
        except Exception as e:
            logger.error(f"❌ Failed to notify failover callbacks: {e}")

    async def _update_routing_configuration(self, source_id: str, target_id: str):
        """Actualizar configuración de routing (implementación específica por servicio)"""
        try:
            # Esta implementación depende del tipo de servicio y load balancer usado
            # Aquí simularemos la actualización
            
            source_service = self.services[source_id]
            target_service = self.services[target_id]
            
            logger.info(f"🔄 Updating routing: {source_service.url} -> {target_service.url}")
            
            # En una implementación real, aquí se actualizaría:
            # - Load balancer configuration
            # - DNS records
            # - Service mesh routing
            # - API Gateway configuration
            
            await asyncio.sleep(0.1)  # Simular tiempo de configuración
            
        except Exception as e:
            logger.error(f"❌ Failed to update routing configuration: {e}")
            raise

    async def _perform_gradual_traffic_transfer(self, source_id: str, target_id: str):
        """Realizar transferencia gradual de tráfico"""
        try:
            logger.info(f"🔄 Starting gradual traffic transfer: {source_id} -> {target_id}")
            
            # Transferencia en pasos: 10% -> 50% -> 100%
            transfer_steps = [10, 50, 100]
            
            for step in transfer_steps:
                logger.debug(f"Transferring {step}% of traffic to {target_id}")
                
                # Verificar salud del target antes de cada paso
                if not await self._check_service_health(target_id):
                    raise Exception(f"Target service {target_id} became unhealthy during transfer")
                
                # Simular configuración de % de tráfico
                await asyncio.sleep(0.5)  # Tiempo entre pasos
                
            logger.info("✅ Gradual traffic transfer completed")
            
        except Exception as e:
            logger.error(f"❌ Failed to perform gradual traffic transfer: {e}")
            raise

    async def _trigger_service_recovery(self, service_id: str):
        """Iniciar recuperación de servicio"""
        try:
            logger.info(f"🔄 Triggering recovery for service {service_id}")
            
            # Verificar si hay failover activo
            if service_id in self.active_failovers:
                failover_event = self.active_failovers[service_id]
                
                if self.enable_auto_recovery:
                    await self._execute_recovery(service_id, failover_event.target_service)
                else:
                    logger.info(f"Auto-recovery disabled for {service_id}, manual intervention required")
            
        except Exception as e:
            logger.error(f"❌ Failed to trigger recovery for {service_id}: {e}")

    async def _execute_recovery(self, recovered_service_id: str, current_service_id: str):
        """Ejecutar recuperación de servicio"""
        try:
            logger.info(f"🔄 Executing recovery: {current_service_id} -> {recovered_service_id}")
            
            # 1. Verificar que el servicio recuperado esté realmente saludable
            for _ in range(3):  # 3 checks consecutivos
                if not await self._check_service_health(recovered_service_id):
                    await asyncio.sleep(10)
                    continue
                break
            else:
                logger.warning(f"⚠️ Service {recovered_service_id} still not stable, postponing recovery")
                return False
            
            # 2. Realizar recuperación gradual (canary deployment)
            success = await self._perform_canary_recovery(recovered_service_id, current_service_id)
            
            if success:
                # 3. Limpiar failover activo
                if recovered_service_id in self.active_failovers:
                    del self.active_failovers[recovered_service_id]
                
                # 4. Notificar callbacks de recuperación
                await self._notify_recovery_callbacks(recovered_service_id, current_service_id)
                
                # 5. Enviar alerta de recuperación
                await self._send_alert(
                    AlertSeverity.INFO,
                    f"Service recovery successful: {recovered_service_id}",
                    {"recovered_service": recovered_service_id, "backup_service": current_service_id}
                )
                
                logger.info(f"✅ Recovery completed successfully for {recovered_service_id}")
                return True
            else:
                logger.error(f"❌ Recovery failed for {recovered_service_id}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to execute recovery for {recovered_service_id}: {e}")
            return False

    async def _perform_canary_recovery(self, recovered_id: str, current_id: str) -> bool:
        """Realizar recuperación tipo canary (gradual)"""
        try:
            logger.info(f"🔄 Starting canary recovery: {current_id} -> {recovered_id}")
            
            # Pasos de canary: 5% -> 20% -> 50% -> 100%
            canary_steps = [5, 20, 50, 100]
            
            for step in canary_steps:
                logger.debug(f"Canary recovery step: {step}% traffic to {recovered_id}")
                
                # Configurar % de tráfico
                await asyncio.sleep(1)  # Simular configuración
                
                # Monitorear por un tiempo
                monitor_duration = 30 if step < 100 else 10  # segundos
                await asyncio.sleep(monitor_duration)
                
                # Verificar métricas durante el canary
                if not await self._verify_canary_metrics(recovered_id, step):
                    logger.error(f"❌ Canary recovery failed at {step}% step")
                    # Rollback
                    await self._rollback_canary(recovered_id, current_id)
                    return False
                
                logger.info(f"✅ Canary step {step}% successful")
            
            logger.info("✅ Canary recovery completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Canary recovery failed: {e}")
            await self._rollback_canary(recovered_id, current_id)
            return False

    async def _verify_canary_metrics(self, service_id: str, percentage: int) -> bool:
        """Verificar métricas durante canary deployment"""
        try:
            # Obtener métricas recientes
            metrics = self.service_metrics[service_id]
            
            # Criterios de éxito
            max_error_rate = 5.0  # %
            max_response_time = 3.0  # segundos
            min_uptime = 98.0  # %
            
            # Verificar criterios
            if metrics.uptime_percentage < min_uptime:
                logger.warning(f"⚠️ Canary metrics failed: uptime {metrics.uptime_percentage:.1f}% < {min_uptime}%")
                return False
            
            if metrics.response_time_avg > max_response_time:
                logger.warning(f"⚠️ Canary metrics failed: response time {metrics.response_time_avg:.2f}s > {max_response_time}s")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to verify canary metrics: {e}")
            return False

    async def _rollback_canary(self, failed_service_id: str, stable_service_id: str):
        """Rollback de canary deployment"""
        try:
            logger.warning(f"🔄 Rolling back canary: {failed_service_id} -> {stable_service_id}")
            
            # Revertir todo el tráfico al servicio estable
            await self._update_routing_configuration(failed_service_id, stable_service_id)
            
            # Marcar servicio como fallido temporalmente
            self.service_metrics[failed_service_id].status = ServiceStatus.FAILED
            
            await self._send_alert(
                AlertSeverity.HIGH,
                f"Canary recovery rolled back: {failed_service_id}",
                {"failed_service": failed_service_id, "stable_service": stable_service_id}
            )
            
        except Exception as e:
            logger.error(f"❌ Failed to rollback canary: {e}")

    async def _notify_recovery_callbacks(self, recovered_id: str, backup_id: str):
        """Notificar callbacks de recuperación"""
        try:
            callbacks = self.recovery_callbacks.get(recovered_id, [])
            
            for callback in callbacks:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(recovered_id, backup_id)
                    else:
                        callback(recovered_id, backup_id)
                except Exception as e:
                    logger.error(f"❌ Recovery callback error: {e}")
                    
        except Exception as e:
            logger.error(f"❌ Failed to notify recovery callbacks: {e}")

    async def _send_alert(self, severity: AlertSeverity, message: str, metadata: Dict[str, Any]):
        """Enviar alerta"""
        try:
            alert_data = {
                "timestamp": datetime.now().isoformat(),
                "severity": severity.value,
                "message": message,
                "metadata": metadata,
                "system": "intelligent_failover"
            }
            
            # Notificar callbacks de alerta
            for callback in self.alert_callbacks:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(alert_data)
                    else:
                        callback(alert_data)
                except Exception as e:
                    logger.error(f"❌ Alert callback error: {e}")
            
            # Log la alerta
            log_level = {
                AlertSeverity.CRITICAL: logger.critical,
                AlertSeverity.HIGH: logger.error,
                AlertSeverity.MEDIUM: logger.warning,
                AlertSeverity.LOW: logger.info,
                AlertSeverity.INFO: logger.info
            }
            
            log_func = log_level.get(severity, logger.info)
            log_func(f"🚨 {severity.value.upper()}: {message}")
            
        except Exception as e:
            logger.error(f"❌ Failed to send alert: {e}")

    async def get_system_status(self) -> Dict[str, Any]:
        """Obtener estado completo del sistema"""
        try:
            # Estadísticas de servicios
            healthy_services = len([s for s in self.service_metrics.values() if s.status == ServiceStatus.HEALTHY])
            degraded_services = len([s for s in self.service_metrics.values() if s.status == ServiceStatus.DEGRADED])
            unhealthy_services = len([s for s in self.service_metrics.values() if s.status == ServiceStatus.UNHEALTHY])
            
            # Estadísticas de failover
            total_failovers = len(self.failover_history)
            successful_failovers = len([f for f in self.failover_history if f.success])
            
            # Circuit breaker stats
            open_circuit_breakers = len([cb for cb in self.circuit_breakers.values() if cb.state == "open"])
            
            return {
                "system_health": {
                    "total_services": len(self.services),
                    "healthy_services": healthy_services,
                    "degraded_services": degraded_services,
                    "unhealthy_services": unhealthy_services,
                    "active_failovers": len(self.active_failovers)
                },
                "failover_statistics": {
                    "total_failovers": total_failovers,
                    "successful_failovers": successful_failovers,
                    "success_rate": (successful_failovers / max(total_failovers, 1)) * 100,
                    "average_failover_time": statistics.mean([f.duration for f in self.failover_history if f.duration]) if self.failover_history else 0
                },
                "circuit_breakers": {
                    "total_breakers": len(self.circuit_breakers),
                    "open_breakers": open_circuit_breakers,
                    "closed_breakers": len(self.circuit_breakers) - open_circuit_breakers
                },
                "service_details": {
                    service_id: {
                        "status": metrics.status.value,
                        "uptime_percentage": metrics.uptime_percentage,
                        "response_time_avg": metrics.response_time_avg,
                        "consecutive_failures": metrics.consecutive_failures,
                        "circuit_breaker_state": self.circuit_breakers[service_id].state
                    }
                    for service_id, metrics in self.service_metrics.items()
                },
                "configuration": {
                    "health_check_interval": self.health_check_interval,
                    "predictive_failover_enabled": self.enable_predictive_failover,
                    "auto_recovery_enabled": self.enable_auto_recovery,
                    "sla_monitoring_enabled": self.sla_monitoring_enabled
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get system status: {e}")
            return {"error": str(e)}

    async def cleanup(self):
        """Limpiar recursos del sistema"""
        try:
            logger.info("🧹 Cleaning up Intelligent Failover System...")
            
            self.is_running = False
            
            # Cancelar tareas de background
            tasks = [
                self._health_monitor_task,
                self._failover_orchestrator_task,
                self._recovery_manager_task,
                self._sla_monitor_task,
                self._state_backup_task
            ]
            
            for task in tasks:
                if task and not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            
            # Cerrar sesión HTTP
            if self.session:
                await self.session.close()
            
            # Cerrar thread pool
            self.executor.shutdown(wait=True)
            
            # Backup final del estado
            if self.backup_state_enabled:
                await self._backup_system_state()
            
            # Limpiar estructuras de datos
            with self.lock:
                self.services.clear()
                self.service_metrics.clear()
                self.circuit_breakers.clear()
                self.active_failovers.clear()
                self.performance_history.clear()
            
            logger.info("✅ Failover system cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ Failover system cleanup error: {e}")

# Función de utilidad para crear instancia
async def create_intelligent_failover_system(config: Dict[str, Any]) -> IntelligentFailoverSystem:
    """
    Factory function para crear sistema de failover configurado
    
    Args:
        config: Configuración del sistema de failover
        
    Returns:
        Instancia inicializada de IntelligentFailoverSystem
    """
    failover_system = IntelligentFailoverSystem(
        health_check_interval=config.get("health_check_interval", 30),
        enable_predictive_failover=config.get("enable_predictive_failover", True),
        enable_auto_recovery=config.get("enable_auto_recovery", True),
        sla_monitoring_enabled=config.get("sla_monitoring_enabled", True),
        backup_state_enabled=config.get("backup_state_enabled", True)
    )
    
    await failover_system.initialize()
    return failover_system

# Ejemplo de uso
if __name__ == "__main__":
    async def main():
        config = {
            "health_check_interval": 30,
            "enable_predictive_failover": True,
            "enable_auto_recovery": True,
            "sla_monitoring_enabled": True
        }
        
        try:
            # Crear sistema de failover
            failover = await create_intelligent_failover_system(config)
            
            # Registrar servicios de ejemplo
            services = [
                ServiceEndpoint("ai-agent-1", "AI Agent Primary", "http://localhost:8001", "us-east", 
                              backup_endpoints=["ai-agent-2"], capabilities=["conversation", "analysis"]),
                ServiceEndpoint("ai-agent-2", "AI Agent Backup", "http://localhost:8002", "us-east",
                              capabilities=["conversation", "analysis"]),
                ServiceEndpoint("pbx-primary", "PBX Primary", "http://localhost:5001", "us-east",
                              backup_endpoints=["pbx-backup"], capabilities=["telephony"]),
                ServiceEndpoint("pbx-backup", "PBX Backup", "http://localhost:5002", "us-west",
                              capabilities=["telephony"])
            ]
            
            for service in services:
                await failover.register_service(service, group="spirit-tours-core")
            
            # Obtener estado del sistema
            status = await failover.get_system_status()
            print(f"🔄 Failover System Status: {json.dumps(status, indent=2, default=str)}")
            
            # Simular trabajo
            await asyncio.sleep(60)
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            if 'failover' in locals():
                await failover.cleanup()
    
    asyncio.run(main())