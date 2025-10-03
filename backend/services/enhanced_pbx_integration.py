"""
Enhanced PBX 3CX Integration Service with Improved Performance and Resilience
Mejoras críticas implementadas para alta disponibilidad y performance
"""

import asyncio
import logging
import json
import aiohttp
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import uuid
from cachetools import TTLCache
import time

# Configure logging
logger = logging.getLogger(__name__)

class ConnectionHealth(Enum):
    """Connection health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    RECONNECTING = "reconnecting"

@dataclass
class PerformanceMetrics:
    """Performance metrics tracking"""
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    avg_response_time: float = 0.0
    last_health_check: datetime = field(default_factory=datetime.now)
    connection_health: ConnectionHealth = ConnectionHealth.HEALTHY

class EnhancedPBX3CXIntegration:
    """
    Enhanced 3CX PBX Integration with:
    - Connection pooling and keep-alive
    - Automatic failover and recovery
    - Performance monitoring and metrics
    - Circuit breaker pattern
    - Intelligent caching
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.metrics = PerformanceMetrics()
        
        # Enhanced connection management
        self.connection_pool = None
        self.session = None
        self.backup_endpoints = config.get("backup_endpoints", [])
        self.current_endpoint_index = 0
        
        # Caching for performance
        self.extension_cache = TTLCache(maxsize=1000, ttl=3600)  # 1 hour
        self.call_cache = TTLCache(maxsize=5000, ttl=900)        # 15 minutes
        
        # Circuit breaker
        self.circuit_breaker = {
            "failure_count": 0,
            "failure_threshold": 5,
            "recovery_timeout": 60,
            "last_failure_time": None,
            "state": "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        }
        
        # Performance monitoring
        self.response_times = []
        self.health_check_interval = 30  # seconds
        self.last_health_check = None
        
        logger.info("Enhanced PBX 3CX Integration initialized")
    
    async def initialize_connection(self) -> bool:
        """Initialize enhanced connection with pooling and keep-alive"""
        try:
            # Create connection pool with optimized settings
            self.connection_pool = aiohttp.TCPConnector(
                limit=100,                    # Max total connections
                limit_per_host=20,           # Max connections per host
                keepalive_timeout=300,       # Keep connections alive for 5 minutes
                enable_cleanup_closed=True,  # Clean up closed connections
                ttl_dns_cache=300,          # DNS cache for 5 minutes
                use_dns_cache=True
            )
            
            # Create session with timeout and retry configuration
            timeout = aiohttp.ClientTimeout(
                total=30,      # Total timeout
                connect=5,     # Connection timeout
                sock_read=10   # Socket read timeout
            )
            
            self.session = aiohttp.ClientSession(
                connector=self.connection_pool,
                timeout=timeout,
                headers={
                    "User-Agent": "SpiritTours-PBX-Integration/2.0",
                    "Connection": "keep-alive"
                }
            )
            
            # Test initial connection
            connection_success = await self._test_connection()
            
            if connection_success:
                # Start background health monitoring
                asyncio.create_task(self._health_monitor_loop())
                logger.info("✅ Enhanced PBX connection established with monitoring")
                return True
            else:
                logger.error("❌ Failed to establish initial PBX connection")
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize enhanced PBX connection: {e}")
            return False
    
    async def _test_connection(self) -> bool:
        """Test connection to PBX with circuit breaker"""
        if self._is_circuit_open():
            logger.warning("🔴 Circuit breaker is OPEN - skipping connection test")
            return False
        
        try:
            start_time = time.time()
            
            # Test connection to current endpoint
            current_endpoint = self._get_current_endpoint()
            
            async with self.session.get(
                f"{current_endpoint}/api/health",
                ssl=False  # Adjust based on your 3CX setup
            ) as response:
                response_time = time.time() - start_time
                self._record_response_time(response_time)
                
                if response.status == 200:
                    self._record_success()
                    self.metrics.connection_health = ConnectionHealth.HEALTHY
                    return True
                else:
                    self._record_failure()
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Connection test failed: {e}")
            self._record_failure()
            
            # Try failover to backup endpoint
            if await self._try_failover():
                return True
                
            return False
    
    def _get_current_endpoint(self) -> str:
        """Get current active endpoint"""
        endpoints = [self.config["primary_endpoint"]] + self.backup_endpoints
        return endpoints[self.current_endpoint_index % len(endpoints)]
    
    async def _try_failover(self) -> bool:
        """Try to failover to backup endpoint"""
        if not self.backup_endpoints:
            return False
        
        logger.warning("🔄 Attempting failover to backup endpoint...")
        
        # Try next endpoint
        self.current_endpoint_index += 1
        new_endpoint = self._get_current_endpoint()
        
        try:
            async with self.session.get(f"{new_endpoint}/api/health") as response:
                if response.status == 200:
                    logger.info(f"✅ Failover successful to: {new_endpoint}")
                    self.metrics.connection_health = ConnectionHealth.DEGRADED
                    return True
        except Exception as e:
            logger.error(f"❌ Failover failed: {e}")
        
        self.metrics.connection_health = ConnectionHealth.UNHEALTHY
        return False
    
    def _is_circuit_open(self) -> bool:
        """Check if circuit breaker is open"""
        if self.circuit_breaker["state"] != "OPEN":
            return False
        
        # Check if recovery timeout has passed
        if self.circuit_breaker["last_failure_time"]:
            time_since_failure = time.time() - self.circuit_breaker["last_failure_time"]
            if time_since_failure > self.circuit_breaker["recovery_timeout"]:
                self.circuit_breaker["state"] = "HALF_OPEN"
                logger.info("🟡 Circuit breaker moved to HALF_OPEN state")
                return False
        
        return True
    
    def _record_success(self):
        """Record successful operation"""
        self.metrics.successful_calls += 1
        self.circuit_breaker["failure_count"] = 0
        
        if self.circuit_breaker["state"] == "HALF_OPEN":
            self.circuit_breaker["state"] = "CLOSED"
            logger.info("✅ Circuit breaker CLOSED - service recovered")
    
    def _record_failure(self):
        """Record failed operation"""
        self.metrics.failed_calls += 1
        self.circuit_breaker["failure_count"] += 1
        self.circuit_breaker["last_failure_time"] = time.time()
        
        if self.circuit_breaker["failure_count"] >= self.circuit_breaker["failure_threshold"]:
            self.circuit_breaker["state"] = "OPEN"
            logger.error("🔴 Circuit breaker OPENED - too many failures")
    
    def _record_response_time(self, response_time: float):
        """Record response time for metrics"""
        self.response_times.append(response_time)
        
        # Keep only last 100 response times
        if len(self.response_times) > 100:
            self.response_times = self.response_times[-100:]
        
        # Calculate average
        self.metrics.avg_response_time = sum(self.response_times) / len(self.response_times)
    
    async def _health_monitor_loop(self):
        """Background health monitoring loop"""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                
                # Perform health check
                health_ok = await self._test_connection()
                self.last_health_check = datetime.now()
                
                if not health_ok:
                    logger.warning("⚠️ Health check failed - connection issues detected")
                    
                    # Try to recover connection
                    if self.metrics.connection_health == ConnectionHealth.UNHEALTHY:
                        await self._attempt_recovery()
                
                # Log metrics periodically
                if self.metrics.total_calls > 0:
                    success_rate = (self.metrics.successful_calls / self.metrics.total_calls) * 100
                    logger.info(
                        f"📊 PBX Metrics: {success_rate:.1f}% success rate, "
                        f"{self.metrics.avg_response_time:.3f}s avg response time, "
                        f"Health: {self.metrics.connection_health.value}"
                    )
                    
            except Exception as e:
                logger.error(f"❌ Health monitor error: {e}")
    
    async def _attempt_recovery(self):
        """Attempt to recover from unhealthy state"""
        logger.info("🔄 Attempting connection recovery...")
        
        # Reset to primary endpoint
        self.current_endpoint_index = 0
        
        # Try to reinitialize connection
        if self.session:
            await self.session.close()
        
        await self.initialize_connection()
    
    async def create_extension_cached(self, extension_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create extension with caching and enhanced error handling"""
        try:
            cache_key = f"ext_create_{extension_data.get('extension_number')}"
            
            # Check cache first
            if cache_key in self.extension_cache:
                logger.info(f"📋 Extension creation served from cache: {cache_key}")
                return self.extension_cache[cache_key]
            
            # Circuit breaker check
            if self._is_circuit_open():
                raise Exception("Service unavailable - circuit breaker is open")
            
            start_time = time.time()
            
            # Make API call
            endpoint = self._get_current_endpoint()
            async with self.session.post(
                f"{endpoint}/api/extensions",
                json=extension_data,
                headers={"Authorization": f"Bearer {self.config['api_token']}"}
            ) as response:
                
                response_time = time.time() - start_time
                self._record_response_time(response_time)
                self.metrics.total_calls += 1
                
                if response.status == 200:
                    result = await response.json()
                    
                    # Cache successful result
                    self.extension_cache[cache_key] = result
                    self._record_success()
                    
                    logger.info(f"✅ Extension created successfully: {extension_data.get('extension_number')}")
                    return result
                else:
                    self._record_failure()
                    error_text = await response.text()
                    raise Exception(f"API error {response.status}: {error_text}")
                    
        except Exception as e:
            logger.error(f"❌ Failed to create extension: {e}")
            raise
    
    async def initiate_call_enhanced(self, call_data: Dict[str, Any]) -> Dict[str, Any]:
        """Initiate call with enhanced error handling and monitoring"""
        try:
            call_id = call_data.get("call_id", str(uuid.uuid4()))
            
            # Circuit breaker check
            if self._is_circuit_open():
                return {
                    "success": False,
                    "error": "Service temporarily unavailable",
                    "call_id": call_id
                }
            
            start_time = time.time()
            
            # Make API call with retry logic
            result = await self._make_api_call_with_retry(
                "POST",
                "/api/calls/initiate",
                data=call_data,
                max_retries=3
            )
            
            response_time = time.time() - start_time
            self._record_response_time(response_time)
            
            if result.get("success"):
                self._record_success()
                
                # Cache call information
                cache_key = f"call_{call_id}"
                self.call_cache[cache_key] = result
                
                logger.info(f"✅ Call initiated successfully: {call_id}")
                return result
            else:
                self._record_failure()
                logger.error(f"❌ Failed to initiate call: {result.get('error')}")
                return result
                
        except Exception as e:
            logger.error(f"❌ Call initiation error: {e}")
            self._record_failure()
            return {
                "success": False,
                "error": str(e),
                "call_id": call_data.get("call_id")
            }
    
    async def _make_api_call_with_retry(self, method: str, endpoint: str, 
                                      data: Dict = None, max_retries: int = 3) -> Dict[str, Any]:
        """Make API call with automatic retry and exponential backoff"""
        
        for attempt in range(max_retries + 1):
            try:
                url = f"{self._get_current_endpoint()}{endpoint}"
                
                kwargs = {
                    "headers": {"Authorization": f"Bearer {self.config['api_token']}"},
                }
                
                if data:
                    kwargs["json"] = data
                
                async with self.session.request(method, url, **kwargs) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        error_text = await response.text()
                        raise aiohttp.ClientError(f"HTTP {response.status}: {error_text}")
                        
            except Exception as e:
                if attempt < max_retries:
                    # Exponential backoff
                    wait_time = (2 ** attempt) * 0.1
                    logger.warning(f"⏳ API call failed (attempt {attempt + 1}), retrying in {wait_time}s: {e}")
                    await asyncio.sleep(wait_time)
                else:
                    raise
        
        raise Exception(f"API call failed after {max_retries} retries")
    
    async def get_system_metrics(self) -> Dict[str, Any]:
        """Get comprehensive system metrics"""
        return {
            "connection_health": self.metrics.connection_health.value,
            "total_calls": self.metrics.total_calls,
            "successful_calls": self.metrics.successful_calls,
            "failed_calls": self.metrics.failed_calls,
            "success_rate": (
                (self.metrics.successful_calls / max(self.metrics.total_calls, 1)) * 100
            ),
            "avg_response_time": self.metrics.avg_response_time,
            "current_endpoint": self._get_current_endpoint(),
            "circuit_breaker_state": self.circuit_breaker["state"],
            "cache_stats": {
                "extension_cache_size": len(self.extension_cache),
                "call_cache_size": len(self.call_cache)
            },
            "last_health_check": self.last_health_check.isoformat() if self.last_health_check else None
        }
    
    async def cleanup(self):
        """Clean up resources"""
        try:
            if self.session:
                await self.session.close()
            if self.connection_pool:
                await self.connection_pool.close()
            logger.info("✅ Enhanced PBX integration cleaned up successfully")
        except Exception as e:
            logger.error(f"❌ Cleanup error: {e}")