#!/usr/bin/env python3
"""
🚀 Enhanced 3CX Integration System
Sistema avanzado de integración con 3CX PBX con connection pooling, 
cache inteligente y manejo optimizado de conexiones.

Features:
- Connection pooling avanzado
- Cache TTL para operaciones frecuentes
- Retry logic con backoff exponencial
- Circuit breaker pattern
- Métricas de performance en tiempo real
- Failover automático
"""

import asyncio
import aiohttp
import logging
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import json
import time
from collections import defaultdict
import weakref
from cachetools import TTLCache, LRUCache
import hashlib

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConnectionState(Enum):
    """Estados de conexión del sistema"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    CIRCUIT_OPEN = "circuit_open"
    RECOVERING = "recovering"

@dataclass
class ConnectionMetrics:
    """Métricas de conexión y performance"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    avg_response_time: float = 0.0
    last_success: Optional[datetime] = None
    last_failure: Optional[datetime] = None
    circuit_breaker_trips: int = 0
    current_connections: int = 0
    max_connections_reached: int = 0

@dataclass
class PBXCallEvent:
    """Evento de llamada del PBX"""
    call_id: str
    extension: str
    caller_number: str
    called_number: str
    call_state: str
    timestamp: datetime
    duration: Optional[int] = None
    recording_url: Optional[str] = None
    metadata: Dict[str, Any] = None

class Enhanced3CXIntegration:
    """
    Sistema mejorado de integración con 3CX PBX
    
    Características:
    - Connection pooling optimizado
    - Cache inteligente con TTL
    - Circuit breaker para failover
    - Métricas de performance
    - Retry logic avanzado
    """
    
    def __init__(self, 
                 pbx_host: str,
                 pbx_port: int = 5001,
                 username: str = None,
                 password: str = None,
                 max_connections: int = 100,
                 max_connections_per_host: int = 20,
                 connection_timeout: int = 30,
                 keepalive_timeout: int = 300):
        
        self.pbx_host = pbx_host
        self.pbx_port = pbx_port
        self.username = username
        self.password = password
        
        # Connection pooling configuration
        self.max_connections = max_connections
        self.max_connections_per_host = max_connections_per_host
        self.connection_timeout = connection_timeout
        self.keepalive_timeout = keepalive_timeout
        
        # Cache systems
        self.extension_cache = TTLCache(maxsize=1000, ttl=3600)  # 1 hora
        self.call_data_cache = TTLCache(maxsize=5000, ttl=900)   # 15 minutos
        self.route_cache = TTLCache(maxsize=2000, ttl=1800)      # 30 minutos
        
        # Circuit breaker configuration
        self.circuit_failure_threshold = 5
        self.circuit_timeout = 60  # segundos
        self.circuit_state = ConnectionState.HEALTHY
        self.circuit_failure_count = 0
        self.circuit_last_failure = None
        
        # Métricas
        self.metrics = ConnectionMetrics()
        self.performance_history = defaultdict(list)
        
        # Session y connector
        self.connector = None
        self.session = None
        
        # Callbacks registrados
        self.event_callbacks: Dict[str, List[Callable]] = defaultdict(list)
        
        # Estado del sistema
        self.is_initialized = False
        self.health_check_interval = 30  # segundos
        self._health_check_task = None

    async def initialize(self):
        """Inicializar el sistema de conexiones"""
        try:
            logger.info("🚀 Initializing Enhanced 3CX Integration System...")
            
            # Crear connector con pooling avanzado
            self.connector = aiohttp.TCPConnector(
                limit=self.max_connections,
                limit_per_host=self.max_connections_per_host,
                ttl_dns_cache=300,
                use_dns_cache=True,
                keepalive_timeout=self.keepalive_timeout,
                enable_cleanup_closed=True,
                force_close=False,
                limit_per_pool=10
            )
            
            # Crear sesión con timeouts optimizados
            timeout = aiohttp.ClientTimeout(
                total=self.connection_timeout,
                connect=10,
                sock_read=20,
                sock_connect=10
            )
            
            self.session = aiohttp.ClientSession(
                connector=self.connector,
                timeout=timeout,
                headers={
                    'User-Agent': 'Enhanced-3CX-Integration/2.0',
                    'Connection': 'keep-alive',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            )
            
            # Autenticación inicial
            await self._authenticate()
            
            # Iniciar monitoreo de salud
            self._health_check_task = asyncio.create_task(self._health_check_loop())
            
            # Cargar configuración inicial en cache
            await self._preload_cache()
            
            self.is_initialized = True
            logger.info("✅ Enhanced 3CX Integration initialized successfully")
            
            return {
                "status": "initialized",
                "max_connections": self.max_connections,
                "cache_size": {
                    "extensions": len(self.extension_cache),
                    "call_data": len(self.call_data_cache),
                    "routes": len(self.route_cache)
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize 3CX integration: {e}")
            raise

    async def _authenticate(self):
        """Autenticación con 3CX"""
        if not self.username or not self.password:
            logger.warning("⚠️ No credentials provided, using anonymous access")
            return
            
        try:
            auth_url = f"http://{self.pbx_host}:{self.pbx_port}/api/auth/login"
            auth_data = {
                "username": self.username,
                "password": self.password
            }
            
            start_time = time.time()
            async with self.session.post(auth_url, json=auth_data) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    auth_result = await response.json()
                    token = auth_result.get('token')
                    
                    if token:
                        # Agregar token a headers de sesión
                        self.session.headers.update({
                            'Authorization': f'Bearer {token}'
                        })
                        
                        logger.info(f"✅ Authenticated successfully (response time: {response_time:.3f}s)")
                        self._update_metrics(success=True, response_time=response_time)
                        return token
                        
                else:
                    raise Exception(f"Authentication failed: {response.status}")
                    
        except Exception as e:
            self._update_metrics(success=False)
            logger.error(f"❌ Authentication failed: {e}")
            raise

    async def _preload_cache(self):
        """Precargar datos frecuentemente utilizados en cache"""
        try:
            logger.info("📦 Preloading frequently accessed data...")
            
            # Cargar lista de extensiones
            extensions = await self.get_extensions(use_cache=False)
            if extensions:
                cache_key = "all_extensions"
                self.extension_cache[cache_key] = extensions
                logger.info(f"📱 Preloaded {len(extensions)} extensions")
            
            # Cargar rutas de llamadas activas
            active_calls = await self.get_active_calls(use_cache=False)
            if active_calls:
                for call in active_calls:
                    cache_key = f"call_{call.get('call_id')}"
                    self.call_data_cache[cache_key] = call
                
                logger.info(f"📞 Preloaded {len(active_calls)} active calls")
                
        except Exception as e:
            logger.warning(f"⚠️ Preload cache failed (non-critical): {e}")

    async def _health_check_loop(self):
        """Loop de monitoreo de salud del sistema"""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                await self._perform_health_check()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Health check error: {e}")

    async def _perform_health_check(self):
        """Realizar verificación de salud"""
        try:
            start_time = time.time()
            health_url = f"http://{self.pbx_host}:{self.pbx_port}/api/health"
            
            async with self.session.get(health_url) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    self._handle_circuit_breaker_success()
                    self.metrics.current_connections = len(self.connector._conns)
                    
                    # Log métricas cada 5 minutos
                    if int(time.time()) % 300 == 0:
                        await self._log_performance_metrics()
                        
                else:
                    await self._handle_circuit_breaker_failure()
                    
        except Exception as e:
            await self._handle_circuit_breaker_failure()
            logger.warning(f"⚠️ Health check failed: {e}")

    async def _log_performance_metrics(self):
        """Log de métricas de performance"""
        metrics_summary = {
            "total_requests": self.metrics.total_requests,
            "success_rate": (self.metrics.successful_requests / max(self.metrics.total_requests, 1)) * 100,
            "avg_response_time": self.metrics.avg_response_time,
            "current_connections": self.metrics.current_connections,
            "circuit_state": self.circuit_state.value,
            "cache_hit_rates": {
                "extensions": len(self.extension_cache),
                "call_data": len(self.call_data_cache),
                "routes": len(self.route_cache)
            }
        }
        
        logger.info(f"📊 Performance Metrics: {json.dumps(metrics_summary, indent=2)}")

    def _update_metrics(self, success: bool, response_time: float = 0.0):
        """Actualizar métricas del sistema"""
        self.metrics.total_requests += 1
        
        if success:
            self.metrics.successful_requests += 1
            self.metrics.last_success = datetime.now()
        else:
            self.metrics.failed_requests += 1
            self.metrics.last_failure = datetime.now()
        
        # Calcular promedio de tiempo de respuesta
        if response_time > 0:
            total_time = self.metrics.avg_response_time * (self.metrics.total_requests - 1)
            self.metrics.avg_response_time = (total_time + response_time) / self.metrics.total_requests

    async def _handle_circuit_breaker_failure(self):
        """Manejar fallo en circuit breaker"""
        self.circuit_failure_count += 1
        self.circuit_last_failure = datetime.now()
        
        if self.circuit_failure_count >= self.circuit_failure_threshold:
            if self.circuit_state != ConnectionState.CIRCUIT_OPEN:
                self.circuit_state = ConnectionState.CIRCUIT_OPEN
                self.metrics.circuit_breaker_trips += 1
                logger.error(f"🚨 Circuit breaker OPEN - Too many failures ({self.circuit_failure_count})")

    def _handle_circuit_breaker_success(self):
        """Manejar éxito en circuit breaker"""
        if self.circuit_state == ConnectionState.CIRCUIT_OPEN:
            # Verificar si ha pasado suficiente tiempo para recuperación
            if (datetime.now() - self.circuit_last_failure).seconds >= self.circuit_timeout:
                self.circuit_state = ConnectionState.RECOVERING
                logger.info("🔄 Circuit breaker entering RECOVERY mode")
        
        elif self.circuit_state == ConnectionState.RECOVERING:
            # Resetear contador en modo recuperación
            self.circuit_failure_count = 0
            self.circuit_state = ConnectionState.HEALTHY
            logger.info("✅ Circuit breaker back to HEALTHY state")

    def _is_circuit_open(self) -> bool:
        """Verificar si el circuit breaker está abierto"""
        return self.circuit_state == ConnectionState.CIRCUIT_OPEN

    async def _make_request(self, method: str, url: str, **kwargs) -> Dict[str, Any]:
        """
        Hacer request con circuit breaker y retry logic
        """
        if self._is_circuit_open():
            raise Exception("Circuit breaker is OPEN - Service temporarily unavailable")
        
        max_retries = 3
        base_delay = 1.0
        
        for attempt in range(max_retries + 1):
            try:
                start_time = time.time()
                
                async with self.session.request(method, url, **kwargs) as response:
                    response_time = time.time() - start_time
                    
                    if response.status < 400:
                        self._update_metrics(success=True, response_time=response_time)
                        self._handle_circuit_breaker_success()
                        
                        result = await response.json() if response.content_type == 'application/json' else await response.text()
                        return {
                            "status": response.status,
                            "data": result,
                            "response_time": response_time
                        }
                    else:
                        raise aiohttp.ClientResponseError(
                            request_info=response.request_info,
                            history=response.history,
                            status=response.status
                        )
                        
            except Exception as e:
                self._update_metrics(success=False)
                
                if attempt == max_retries:
                    await self._handle_circuit_breaker_failure()
                    raise
                
                # Exponential backoff
                delay = base_delay * (2 ** attempt)
                await asyncio.sleep(delay)
                logger.warning(f"⚠️ Request failed (attempt {attempt + 1}/{max_retries + 1}), retrying in {delay}s...")

    async def get_extensions(self, use_cache: bool = True) -> List[Dict[str, Any]]:
        """Obtener lista de extensiones con cache"""
        cache_key = "all_extensions"
        
        if use_cache and cache_key in self.extension_cache:
            logger.debug("📦 Cache hit for extensions")
            return self.extension_cache[cache_key]
        
        try:
            url = f"http://{self.pbx_host}:{self.pbx_port}/api/extensions"
            response = await self._make_request("GET", url)
            
            extensions = response["data"]
            self.extension_cache[cache_key] = extensions
            
            logger.info(f"📱 Retrieved {len(extensions)} extensions")
            return extensions
            
        except Exception as e:
            logger.error(f"❌ Failed to get extensions: {e}")
            raise

    async def get_active_calls(self, use_cache: bool = True) -> List[Dict[str, Any]]:
        """Obtener llamadas activas con cache"""
        cache_key = "active_calls"
        
        if use_cache and cache_key in self.call_data_cache:
            # Cache más corto para datos en tiempo real
            cache_entry_time = getattr(self.call_data_cache, '_TTLCache__data', {}).get(cache_key)
            if cache_entry_time and (time.time() - cache_entry_time[1]) < 30:  # 30 segundos
                logger.debug("📦 Cache hit for active calls")
                return self.call_data_cache[cache_key]
        
        try:
            url = f"http://{self.pbx_host}:{self.pbx_port}/api/calls/active"
            response = await self._make_request("GET", url)
            
            calls = response["data"]
            self.call_data_cache[cache_key] = calls
            
            logger.info(f"📞 Retrieved {len(calls)} active calls")
            return calls
            
        except Exception as e:
            logger.error(f"❌ Failed to get active calls: {e}")
            raise

    async def make_call(self, from_extension: str, to_number: str, 
                       call_options: Optional[Dict] = None) -> Dict[str, Any]:
        """Realizar llamada saliente"""
        try:
            url = f"http://{self.pbx_host}:{self.pbx_port}/api/calls/make"
            
            call_data = {
                "from": from_extension,
                "to": to_number,
                "timestamp": datetime.now().isoformat(),
                **(call_options or {})
            }
            
            response = await self._make_request("POST", url, json=call_data)
            
            call_result = response["data"]
            call_id = call_result.get("call_id")
            
            # Cache call data
            if call_id:
                cache_key = f"call_{call_id}"
                self.call_data_cache[cache_key] = call_result
            
            logger.info(f"📞 Call initiated: {from_extension} -> {to_number} (ID: {call_id})")
            
            # Disparar callbacks
            await self._trigger_callbacks("call_initiated", {
                "call_id": call_id,
                "from": from_extension,
                "to": to_number,
                "data": call_result
            })
            
            return call_result
            
        except Exception as e:
            logger.error(f"❌ Failed to make call: {e}")
            raise

    async def transfer_call(self, call_id: str, target_extension: str) -> Dict[str, Any]:
        """Transferir llamada"""
        try:
            url = f"http://{self.pbx_host}:{self.pbx_port}/api/calls/{call_id}/transfer"
            
            transfer_data = {
                "target": target_extension,
                "timestamp": datetime.now().isoformat()
            }
            
            response = await self._make_request("POST", url, json=transfer_data)
            
            result = response["data"]
            
            # Update cache
            cache_key = f"call_{call_id}"
            if cache_key in self.call_data_cache:
                self.call_data_cache[cache_key].update({
                    "transferred_to": target_extension,
                    "transfer_time": datetime.now().isoformat()
                })
            
            logger.info(f"🔄 Call {call_id} transferred to {target_extension}")
            
            # Disparar callbacks
            await self._trigger_callbacks("call_transferred", {
                "call_id": call_id,
                "target": target_extension,
                "data": result
            })
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to transfer call: {e}")
            raise

    async def register_callback(self, event_type: str, callback: Callable):
        """Registrar callback para eventos del PBX"""
        self.event_callbacks[event_type].append(callback)
        logger.info(f"📝 Registered callback for event: {event_type}")

    async def _trigger_callbacks(self, event_type: str, event_data: Dict[str, Any]):
        """Disparar callbacks registrados"""
        callbacks = self.event_callbacks.get(event_type, [])
        
        for callback in callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event_data)
                else:
                    callback(event_data)
            except Exception as e:
                logger.error(f"❌ Callback error for {event_type}: {e}")

    async def get_system_metrics(self) -> Dict[str, Any]:
        """Obtener métricas del sistema"""
        return {
            "connection_metrics": asdict(self.metrics),
            "circuit_state": self.circuit_state.value,
            "cache_stats": {
                "extensions": {
                    "size": len(self.extension_cache),
                    "maxsize": self.extension_cache.maxsize,
                    "ttl": getattr(self.extension_cache, 'ttl', 'N/A')
                },
                "call_data": {
                    "size": len(self.call_data_cache),
                    "maxsize": self.call_data_cache.maxsize,
                    "ttl": getattr(self.call_data_cache, 'ttl', 'N/A')
                },
                "routes": {
                    "size": len(self.route_cache),
                    "maxsize": self.route_cache.maxsize,
                    "ttl": getattr(self.route_cache, 'ttl', 'N/A')
                }
            },
            "connection_pool": {
                "current_connections": len(self.connector._conns) if self.connector else 0,
                "max_connections": self.max_connections,
                "max_per_host": self.max_connections_per_host
            },
            "performance": {
                "success_rate": (self.metrics.successful_requests / max(self.metrics.total_requests, 1)) * 100,
                "avg_response_time_ms": self.metrics.avg_response_time * 1000,
                "uptime": (datetime.now() - self.metrics.last_success).total_seconds() if self.metrics.last_success else 0
            }
        }

    async def cleanup(self):
        """Limpiar recursos"""
        try:
            logger.info("🧹 Cleaning up Enhanced 3CX Integration...")
            
            # Cancelar health check task
            if self._health_check_task:
                self._health_check_task.cancel()
                try:
                    await self._health_check_task
                except asyncio.CancelledError:
                    pass
            
            # Cerrar sesión
            if self.session:
                await self.session.close()
            
            # Cerrar connector
            if self.connector:
                await self.connector.close()
            
            # Limpiar caches
            self.extension_cache.clear()
            self.call_data_cache.clear()
            self.route_cache.clear()
            
            logger.info("✅ Cleanup completed successfully")
            
        except Exception as e:
            logger.error(f"❌ Cleanup error: {e}")

# Función de utilidad para crear instancia
async def create_enhanced_3cx_integration(config: Dict[str, Any]) -> Enhanced3CXIntegration:
    """
    Factory function para crear instancia configurada
    
    Args:
        config: Diccionario con configuración del PBX
        
    Returns:
        Instancia inicializada de Enhanced3CXIntegration
    """
    integration = Enhanced3CXIntegration(
        pbx_host=config.get("pbx_host", "localhost"),
        pbx_port=config.get("pbx_port", 5001),
        username=config.get("username"),
        password=config.get("password"),
        max_connections=config.get("max_connections", 100),
        max_connections_per_host=config.get("max_connections_per_host", 20),
        connection_timeout=config.get("connection_timeout", 30),
        keepalive_timeout=config.get("keepalive_timeout", 300)
    )
    
    await integration.initialize()
    return integration

# Ejemplo de uso
if __name__ == "__main__":
    async def main():
        config = {
            "pbx_host": "pbx.company.com",
            "pbx_port": 5001,
            "username": "api_user",
            "password": "secure_password",
            "max_connections": 150,
            "max_connections_per_host": 30
        }
        
        try:
            # Crear e inicializar sistema mejorado
            pbx = await create_enhanced_3cx_integration(config)
            
            # Registrar callback de ejemplo
            async def handle_call_event(event_data):
                print(f"🎯 Call event received: {event_data}")
            
            await pbx.register_callback("call_initiated", handle_call_event)
            
            # Obtener extensiones con cache
            extensions = await pbx.get_extensions()
            print(f"📱 Extensions: {len(extensions)}")
            
            # Obtener métricas del sistema
            metrics = await pbx.get_system_metrics()
            print(f"📊 System Metrics: {json.dumps(metrics, indent=2, default=str)}")
            
            # Simular trabajo
            await asyncio.sleep(60)
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            if 'pbx' in locals():
                await pbx.cleanup()
    
    asyncio.run(main())