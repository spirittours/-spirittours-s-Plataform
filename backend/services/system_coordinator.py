"""
System Coordinator Service
Coordina y optimiza las interacciones entre todos los módulos del sistema
Implementa patrones de resilience, monitoring y performance optimization
"""

import asyncio
import logging
import json
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import uuid
from contextlib import asynccontextmanager
import time

# Import our enhanced services
from .enhanced_pbx_integration import EnhancedPBX3CXIntegration
from .ai_voice_agents_service import AIVoiceAgentsService
from .advanced_voice_service import AdvancedVoiceService
from .webrtc_signaling_service import WebRTCSignalingService
from .omnichannel_crm_service import OmnichannelCRMService

# Configure logging
logger = logging.getLogger(__name__)

class ServiceStatus(Enum):
    """Service status enumeration"""
    STARTING = "starting"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    STOPPED = "stopped"

class OperationType(Enum):
    """Types of operations being coordinated"""
    INCOMING_CALL = "incoming_call"
    OUTBOUND_CALL = "outbound_call"
    VOICE_SYNTHESIS = "voice_synthesis"
    VOICE_RECOGNITION = "voice_recognition"
    CRM_UPDATE = "crm_update"
    NOTIFICATION_SEND = "notification_send"

@dataclass
class ServiceHealth:
    """Health status of a service"""
    service_name: str
    status: ServiceStatus
    last_check: datetime
    response_time: float = 0.0
    error_count: int = 0
    success_count: int = 0
    
    @property
    def success_rate(self) -> float:
        total = self.success_count + self.error_count
        return (self.success_count / total * 100) if total > 0 else 0.0

@dataclass
class OperationContext:
    """Context for a coordinated operation"""
    operation_id: str
    operation_type: OperationType
    start_time: datetime
    services_involved: List[str]
    metadata: Dict[str, Any] = field(default_factory=dict)
    timeout_seconds: int = 30

class SystemCoordinator:
    """
    Central coordinator for all system services
    Provides:
    - Service health monitoring
    - Operation coordination
    - Performance optimization
    - Failure recovery
    - Load balancing
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.services: Dict[str, Any] = {}
        self.service_health: Dict[str, ServiceHealth] = {}
        self.active_operations: Dict[str, OperationContext] = {}
        
        # Performance tracking
        self.operation_metrics: Dict[str, List[float]] = {}
        self.service_dependencies: Dict[str, List[str]] = {}
        
        # Circuit breakers for each service
        self.circuit_breakers: Dict[str, Dict[str, Any]] = {}
        
        # Event handlers
        self.event_handlers: Dict[str, List[Callable]] = {}
        
        logger.info("System Coordinator initialized")
    
    async def initialize_system(self) -> bool:
        """Initialize all system services in the correct order"""
        try:
            logger.info("🚀 Starting system initialization...")
            
            # Define service initialization order (respecting dependencies)
            initialization_order = [
                ("database", None),
                ("cache", None), 
                ("enhanced_pbx", self._init_enhanced_pbx),
                ("advanced_voice", self._init_advanced_voice),
                ("webrtc_signaling", self._init_webrtc_signaling),
                ("omnichannel_crm", self._init_omnichannel_crm),
                ("ai_voice_agents", self._init_ai_voice_agents),
            ]
            
            # Initialize services in order
            for service_name, init_func in initialization_order:
                logger.info(f"🔄 Initializing {service_name}...")
                
                # Update service status
                self.service_health[service_name] = ServiceHealth(
                    service_name=service_name,
                    status=ServiceStatus.STARTING,
                    last_check=datetime.now()
                )
                
                # Initialize service
                if init_func:
                    success = await init_func()
                    if success:
                        self.service_health[service_name].status = ServiceStatus.HEALTHY
                        logger.info(f"✅ {service_name} initialized successfully")
                    else:
                        self.service_health[service_name].status = ServiceStatus.UNHEALTHY
                        logger.error(f"❌ {service_name} initialization failed")
                        return False
                else:
                    # Assume external service (database, cache) is available
                    self.service_health[service_name].status = ServiceStatus.HEALTHY
                    logger.info(f"✅ {service_name} assumed available")
            
            # Start health monitoring
            asyncio.create_task(self._health_monitor_loop())
            
            # Start operation cleanup
            asyncio.create_task(self._operation_cleanup_loop())
            
            logger.info("🎉 System initialization completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ System initialization failed: {e}")
            return False
    
    async def _init_enhanced_pbx(self) -> bool:
        """Initialize enhanced PBX service"""
        try:
            pbx_config = self.config.get("pbx", {})
            self.services["enhanced_pbx"] = EnhancedPBX3CXIntegration(pbx_config)
            success = await self.services["enhanced_pbx"].initialize_connection()
            
            # Set up circuit breaker
            self.circuit_breakers["enhanced_pbx"] = {
                "failure_count": 0,
                "failure_threshold": 5,
                "state": "CLOSED"
            }
            
            return success
        except Exception as e:
            logger.error(f"❌ PBX initialization error: {e}")
            return False
    
    async def _init_advanced_voice(self) -> bool:
        """Initialize advanced voice service"""
        try:
            voice_config = self.config.get("voice", {})
            self.services["advanced_voice"] = AdvancedVoiceService()
            await self.services["advanced_voice"].initialize(voice_config)
            return True
        except Exception as e:
            logger.error(f"❌ Voice service initialization error: {e}")
            return False
    
    async def _init_webrtc_signaling(self) -> bool:
        """Initialize WebRTC signaling service"""
        try:
            webrtc_config = self.config.get("webrtc", {})
            self.services["webrtc_signaling"] = WebRTCSignalingService()
            await self.services["webrtc_signaling"].initialize(webrtc_config)
            return True
        except Exception as e:
            logger.error(f"❌ WebRTC initialization error: {e}")
            return False
    
    async def _init_omnichannel_crm(self) -> bool:
        """Initialize omnichannel CRM service"""
        try:
            crm_config = self.config.get("crm", {})
            self.services["omnichannel_crm"] = OmnichannelCRMService()
            await self.services["omnichannel_crm"].initialize(crm_config)
            return True
        except Exception as e:
            logger.error(f"❌ CRM initialization error: {e}")
            return False
    
    async def _init_ai_voice_agents(self) -> bool:
        """Initialize AI voice agents service"""
        try:
            self.services["ai_voice_agents"] = AIVoiceAgentsService()
            success = await self.services["ai_voice_agents"].initialize(
                self.services.get("enhanced_pbx"),
                self.services.get("omnichannel_crm")
            )
            return success
        except Exception as e:
            logger.error(f"❌ AI Voice Agents initialization error: {e}")
            return False
    
    @asynccontextmanager
    async def coordinate_operation(self, operation_type: OperationType, 
                                 services_needed: List[str],
                                 metadata: Dict[str, Any] = None,
                                 timeout: int = 30):
        """Context manager for coordinated operations"""
        
        operation_id = str(uuid.uuid4())
        operation_context = OperationContext(
            operation_id=operation_id,
            operation_type=operation_type,
            start_time=datetime.now(),
            services_involved=services_needed,
            metadata=metadata or {},
            timeout_seconds=timeout
        )
        
        self.active_operations[operation_id] = operation_context
        
        try:
            # Check service availability
            unavailable_services = []
            for service_name in services_needed:
                if not self._is_service_available(service_name):
                    unavailable_services.append(service_name)
            
            if unavailable_services:
                raise Exception(f"Services unavailable: {unavailable_services}")
            
            logger.info(f"🔄 Starting coordinated operation: {operation_type.value} ({operation_id})")
            
            yield operation_context
            
            # Record successful operation
            self._record_operation_success(operation_context)
            logger.info(f"✅ Operation completed: {operation_type.value} ({operation_id})")
            
        except Exception as e:
            # Record failed operation
            self._record_operation_failure(operation_context, str(e))
            logger.error(f"❌ Operation failed: {operation_type.value} ({operation_id}) - {e}")
            raise
            
        finally:
            # Clean up
            if operation_id in self.active_operations:
                del self.active_operations[operation_id]
    
    def _is_service_available(self, service_name: str) -> bool:
        """Check if a service is available"""
        health = self.service_health.get(service_name)
        if not health:
            return False
        
        return health.status in [ServiceStatus.HEALTHY, ServiceStatus.DEGRADED]
    
    def _record_operation_success(self, context: OperationContext):
        """Record successful operation metrics"""
        operation_time = (datetime.now() - context.start_time).total_seconds()
        
        # Update operation metrics
        op_type = context.operation_type.value
        if op_type not in self.operation_metrics:
            self.operation_metrics[op_type] = []
        
        self.operation_metrics[op_type].append(operation_time)
        
        # Keep only last 100 measurements
        if len(self.operation_metrics[op_type]) > 100:
            self.operation_metrics[op_type] = self.operation_metrics[op_type][-100:]
        
        # Update service health
        for service_name in context.services_involved:
            if service_name in self.service_health:
                self.service_health[service_name].success_count += 1
    
    def _record_operation_failure(self, context: OperationContext, error: str):
        """Record failed operation"""
        # Update service health for involved services
        for service_name in context.services_involved:
            if service_name in self.service_health:
                self.service_health[service_name].error_count += 1
                
                # Update circuit breaker
                if service_name in self.circuit_breakers:
                    self.circuit_breakers[service_name]["failure_count"] += 1
    
    async def handle_incoming_call(self, call_data: Dict[str, Any]) -> Dict[str, Any]:
        """Coordinate handling of incoming call"""
        
        async with self.coordinate_operation(
            OperationType.INCOMING_CALL,
            ["enhanced_pbx", "ai_voice_agents", "advanced_voice", "webrtc_signaling"],
            metadata=call_data
        ) as operation:
            
            try:
                # Step 1: Process call through PBX
                pbx_service = self.services.get("enhanced_pbx")
                call_processed = await pbx_service.process_incoming_call(call_data)
                
                if not call_processed.get("success"):
                    raise Exception("PBX call processing failed")
                
                # Step 2: Determine if AI agent should handle
                should_use_ai = await self._should_route_to_ai(call_data)
                
                if should_use_ai:
                    # Step 3: Initialize AI voice agent
                    ai_service = self.services.get("ai_voice_agents")
                    agent_session = await ai_service.create_session(call_data)
                    
                    # Step 4: Set up WebRTC for real-time communication
                    webrtc_service = self.services.get("webrtc_signaling")
                    webrtc_session = await webrtc_service.create_session(
                        call_data["call_id"],
                        agent_session["session_id"]
                    )
                    
                    return {
                        "success": True,
                        "call_id": call_data["call_id"],
                        "handling_method": "ai_agent",
                        "agent_session": agent_session,
                        "webrtc_session": webrtc_session
                    }
                else:
                    # Route to human agent
                    return {
                        "success": True,
                        "call_id": call_data["call_id"],
                        "handling_method": "human_agent",
                        "routing_info": await self._get_human_agent_routing(call_data)
                    }
                    
            except Exception as e:
                logger.error(f"❌ Incoming call handling failed: {e}")
                raise
    
    async def _should_route_to_ai(self, call_data: Dict[str, Any]) -> bool:
        """Determine if call should be routed to AI agent"""
        # Implement intelligent routing logic
        
        # Check business hours
        current_hour = datetime.now().hour
        if not (9 <= current_hour <= 18):  # Outside business hours
            return True
        
        # Check agent availability
        human_agents_available = await self._check_human_agent_availability()
        if not human_agents_available:
            return True
        
        # Check call complexity prediction
        customer_history = await self._get_customer_history(call_data.get("caller_number"))
        if customer_history and customer_history.get("complexity_score", 0) < 0.5:
            return True  # Simple queries can be handled by AI
        
        return False  # Default to human agent for complex cases
    
    async def _check_human_agent_availability(self) -> bool:
        """Check if human agents are available"""
        try:
            pbx_service = self.services.get("enhanced_pbx")
            if pbx_service:
                agent_status = await pbx_service.get_agent_status()
                available_agents = [a for a in agent_status if a["status"] == "available"]
                return len(available_agents) > 0
            return False
        except Exception:
            return False
    
    async def _get_customer_history(self, phone_number: str) -> Optional[Dict[str, Any]]:
        """Get customer history from CRM"""
        try:
            crm_service = self.services.get("omnichannel_crm")
            if crm_service:
                return await crm_service.get_customer_by_phone(phone_number)
            return None
        except Exception:
            return None
    
    async def _get_human_agent_routing(self, call_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get routing information for human agents"""
        # Implement intelligent human agent routing
        return {
            "department": "sales",  # Could be determined by call analysis
            "priority": "normal",
            "estimated_wait_time": 120  # seconds
        }
    
    async def _health_monitor_loop(self):
        """Background health monitoring for all services"""
        while True:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                for service_name, service in self.services.items():
                    await self._check_service_health(service_name, service)
                
                # Log system status
                healthy_services = len([h for h in self.service_health.values() 
                                     if h.status == ServiceStatus.HEALTHY])
                total_services = len(self.service_health)
                
                logger.info(f"📊 System Health: {healthy_services}/{total_services} services healthy")
                
            except Exception as e:
                logger.error(f"❌ Health monitor error: {e}")
    
    async def _check_service_health(self, service_name: str, service: Any):
        """Check health of individual service"""
        try:
            start_time = time.time()
            
            # Call service-specific health check
            if hasattr(service, 'health_check'):
                health_ok = await service.health_check()
            elif hasattr(service, 'get_system_metrics'):
                metrics = await service.get_system_metrics()
                health_ok = metrics.get("connection_health") == "healthy"
            else:
                # Basic availability check
                health_ok = service is not None
            
            response_time = time.time() - start_time
            
            # Update health status
            if service_name in self.service_health:
                health = self.service_health[service_name]
                health.last_check = datetime.now()
                health.response_time = response_time
                
                if health_ok:
                    health.status = ServiceStatus.HEALTHY
                else:
                    health.status = ServiceStatus.DEGRADED if health.status == ServiceStatus.HEALTHY else ServiceStatus.UNHEALTHY
                    
        except Exception as e:
            logger.error(f"❌ Health check failed for {service_name}: {e}")
            if service_name in self.service_health:
                self.service_health[service_name].status = ServiceStatus.UNHEALTHY
    
    async def _operation_cleanup_loop(self):
        """Clean up stale operations"""
        while True:
            try:
                await asyncio.sleep(60)  # Clean up every minute
                
                current_time = datetime.now()
                stale_operations = []
                
                for op_id, context in self.active_operations.items():
                    age = (current_time - context.start_time).total_seconds()
                    if age > context.timeout_seconds:
                        stale_operations.append(op_id)
                
                # Remove stale operations
                for op_id in stale_operations:
                    del self.active_operations[op_id]
                    logger.warning(f"🧹 Cleaned up stale operation: {op_id}")
                    
            except Exception as e:
                logger.error(f"❌ Operation cleanup error: {e}")
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status"""
        
        # Calculate overall health
        healthy_count = len([h for h in self.service_health.values() 
                           if h.status == ServiceStatus.HEALTHY])
        total_count = len(self.service_health)
        overall_health = (healthy_count / total_count * 100) if total_count > 0 else 0
        
        # Calculate average operation times
        avg_operation_times = {}
        for op_type, times in self.operation_metrics.items():
            if times:
                avg_operation_times[op_type] = sum(times) / len(times)
        
        return {
            "system_health": {
                "overall_health_percentage": overall_health,
                "healthy_services": healthy_count,
                "total_services": total_count,
                "service_details": {
                    name: {
                        "status": health.status.value,
                        "success_rate": health.success_rate,
                        "last_check": health.last_check.isoformat(),
                        "response_time": health.response_time
                    }
                    for name, health in self.service_health.items()
                }
            },
            "performance_metrics": {
                "active_operations": len(self.active_operations),
                "average_operation_times": avg_operation_times
            },
            "circuit_breakers": {
                name: breaker["state"] 
                for name, breaker in self.circuit_breakers.items()
            }
        }

# Global system coordinator instance
system_coordinator = SystemCoordinator({})