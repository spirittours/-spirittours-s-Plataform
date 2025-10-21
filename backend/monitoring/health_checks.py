"""
Health Check System.

This module provides comprehensive health checks for the application.

Features:
- Liveness probes (is the app running?)
- Readiness probes (is the app ready to serve traffic?)
- Dependency checks (database, cache, external services)
- Detailed health reports

Author: GenSpark AI Developer
Phase: 10 - Monitoring & Observability
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum
import asyncio
import time

from backend.utils.logger import get_logger

logger = get_logger(__name__)


class HealthStatus(str, Enum):
    """Health check status."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class DependencyType(str, Enum):
    """Types of dependencies."""
    DATABASE = "database"
    CACHE = "cache"
    EXTERNAL_API = "external_api"
    STORAGE = "storage"
    QUEUE = "queue"


class HealthCheck:
    """Individual health check."""
    
    def __init__(
        self,
        name: str,
        check_function,
        dependency_type: DependencyType,
        critical: bool = True,
        timeout: float = 5.0
    ):
        """
        Initialize health check.
        
        Args:
            name: Health check name
            check_function: Async function to execute check
            dependency_type: Type of dependency
            critical: If True, failure means unhealthy app
            timeout: Check timeout in seconds
        """
        self.name = name
        self.check_function = check_function
        self.dependency_type = dependency_type
        self.critical = critical
        self.timeout = timeout
    
    async def execute(self) -> Dict[str, Any]:
        """
        Execute health check.
        
        Returns:
            Dictionary with check results
        """
        start_time = time.time()
        
        try:
            # Execute check with timeout
            result = await asyncio.wait_for(
                self.check_function(),
                timeout=self.timeout
            )
            
            duration = time.time() - start_time
            
            return {
                'name': self.name,
                'status': HealthStatus.HEALTHY.value,
                'duration_ms': round(duration * 1000, 2),
                'critical': self.critical,
                'dependency_type': self.dependency_type.value,
                'details': result
            }
            
        except asyncio.TimeoutError:
            duration = time.time() - start_time
            logger.error(f"Health check timeout: {self.name}")
            
            return {
                'name': self.name,
                'status': HealthStatus.UNHEALTHY.value,
                'duration_ms': round(duration * 1000, 2),
                'critical': self.critical,
                'dependency_type': self.dependency_type.value,
                'error': 'Timeout exceeded',
                'details': {}
            }
            
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"Health check failed: {self.name} - {e}")
            
            return {
                'name': self.name,
                'status': HealthStatus.UNHEALTHY.value,
                'duration_ms': round(duration * 1000, 2),
                'critical': self.critical,
                'dependency_type': self.dependency_type.value,
                'error': str(e),
                'details': {}
            }


class HealthCheckManager:
    """
    Manager for all health checks.
    
    Coordinates multiple health checks and provides overall health status.
    """
    
    def __init__(self):
        """Initialize health check manager."""
        self.checks: List[HealthCheck] = []
        self._start_time = datetime.now()
        self._last_check_time: Optional[datetime] = None
        self._last_check_result: Optional[Dict[str, Any]] = None
        
        logger.info("Health check manager initialized")
    
    def register_check(self, check: HealthCheck) -> None:
        """
        Register a health check.
        
        Args:
            check: HealthCheck to register
        """
        self.checks.append(check)
        logger.info(f"Registered health check: {check.name}")
    
    async def check_liveness(self) -> Dict[str, Any]:
        """
        Liveness probe.
        
        Simple check to verify the application is running.
        Used by orchestrators to restart unhealthy containers.
        
        Returns:
            Liveness status
        """
        return {
            'status': HealthStatus.HEALTHY.value,
            'timestamp': datetime.now().isoformat(),
            'uptime_seconds': (datetime.now() - self._start_time).total_seconds()
        }
    
    async def check_readiness(self) -> Dict[str, Any]:
        """
        Readiness probe.
        
        Comprehensive check to verify the application is ready to serve traffic.
        Used by load balancers to route traffic.
        
        Returns:
            Readiness status with all dependency checks
        """
        start_time = time.time()
        
        # Execute all checks concurrently
        check_tasks = [check.execute() for check in self.checks]
        check_results = await asyncio.gather(*check_tasks, return_exceptions=True)
        
        # Process results
        all_checks = []
        critical_failures = 0
        non_critical_failures = 0
        
        for result in check_results:
            if isinstance(result, Exception):
                logger.error(f"Health check exception: {result}")
                all_checks.append({
                    'name': 'unknown',
                    'status': HealthStatus.UNHEALTHY.value,
                    'error': str(result)
                })
                critical_failures += 1
            else:
                all_checks.append(result)
                
                if result['status'] != HealthStatus.HEALTHY.value:
                    if result.get('critical', True):
                        critical_failures += 1
                    else:
                        non_critical_failures += 1
        
        # Determine overall status
        if critical_failures > 0:
            overall_status = HealthStatus.UNHEALTHY
        elif non_critical_failures > 0:
            overall_status = HealthStatus.DEGRADED
        else:
            overall_status = HealthStatus.HEALTHY
        
        duration = time.time() - start_time
        
        result = {
            'status': overall_status.value,
            'timestamp': datetime.now().isoformat(),
            'duration_ms': round(duration * 1000, 2),
            'checks': all_checks,
            'summary': {
                'total_checks': len(all_checks),
                'healthy_checks': len([c for c in all_checks if c['status'] == HealthStatus.HEALTHY.value]),
                'unhealthy_checks': len([c for c in all_checks if c['status'] == HealthStatus.UNHEALTHY.value]),
                'critical_failures': critical_failures,
                'non_critical_failures': non_critical_failures
            }
        }
        
        # Cache result
        self._last_check_time = datetime.now()
        self._last_check_result = result
        
        return result
    
    async def get_detailed_health(self) -> Dict[str, Any]:
        """
        Get detailed health report with additional information.
        
        Returns:
            Comprehensive health report
        """
        readiness = await self.check_readiness()
        
        return {
            **readiness,
            'application': {
                'name': 'B2B2B Platform',
                'version': '1.0.0',
                'uptime_seconds': (datetime.now() - self._start_time).total_seconds(),
                'started_at': self._start_time.isoformat()
            },
            'last_check': {
                'timestamp': self._last_check_time.isoformat() if self._last_check_time else None,
                'status': self._last_check_result.get('status') if self._last_check_result else None
            }
        }


# Example health check functions
async def check_database_health() -> Dict[str, Any]:
    """Check database health."""
    # TODO: Implement actual database check
    # Example: execute simple query like SELECT 1
    await asyncio.sleep(0.01)  # Simulate query
    
    return {
        'connected': True,
        'response_time_ms': 10,
        'active_connections': 5,
        'idle_connections': 10
    }


async def check_redis_health() -> Dict[str, Any]:
    """Check Redis health."""
    # TODO: Implement actual Redis check
    # Example: execute PING command
    await asyncio.sleep(0.005)  # Simulate ping
    
    return {
        'connected': True,
        'response_time_ms': 5,
        'used_memory_mb': 128,
        'connected_clients': 3
    }


async def check_external_api_health() -> Dict[str, Any]:
    """Check external API health."""
    # TODO: Implement actual API check
    # Example: call health endpoint of external service
    await asyncio.sleep(0.1)  # Simulate API call
    
    return {
        'available': True,
        'response_time_ms': 100
    }


async def check_disk_space() -> Dict[str, Any]:
    """Check available disk space."""
    import psutil
    
    disk = psutil.disk_usage('/')
    
    # Check if less than 10% free
    if disk.percent > 90:
        raise Exception(f"Low disk space: {disk.percent}% used")
    
    return {
        'total_gb': round(disk.total / (1024**3), 2),
        'used_gb': round(disk.used / (1024**3), 2),
        'free_gb': round(disk.free / (1024**3), 2),
        'percent_used': disk.percent
    }


async def check_memory() -> Dict[str, Any]:
    """Check available memory."""
    import psutil
    
    memory = psutil.virtual_memory()
    
    # Check if less than 10% free
    if memory.percent > 90:
        raise Exception(f"Low memory: {memory.percent}% used")
    
    return {
        'total_gb': round(memory.total / (1024**3), 2),
        'used_gb': round(memory.used / (1024**3), 2),
        'available_gb': round(memory.available / (1024**3), 2),
        'percent_used': memory.percent
    }


# Singleton instance
_health_manager: Optional[HealthCheckManager] = None


def get_health_manager() -> HealthCheckManager:
    """
    Get global health check manager.
    
    Returns:
        HealthCheckManager instance
    """
    global _health_manager
    if _health_manager is None:
        _health_manager = HealthCheckManager()
        
        # Register default health checks
        _health_manager.register_check(HealthCheck(
            name="database",
            check_function=check_database_health,
            dependency_type=DependencyType.DATABASE,
            critical=True,
            timeout=5.0
        ))
        
        _health_manager.register_check(HealthCheck(
            name="redis",
            check_function=check_redis_health,
            dependency_type=DependencyType.CACHE,
            critical=True,
            timeout=3.0
        ))
        
        _health_manager.register_check(HealthCheck(
            name="external_api",
            check_function=check_external_api_health,
            dependency_type=DependencyType.EXTERNAL_API,
            critical=False,
            timeout=10.0
        ))
        
        _health_manager.register_check(HealthCheck(
            name="disk_space",
            check_function=check_disk_space,
            dependency_type=DependencyType.STORAGE,
            critical=False,
            timeout=2.0
        ))
        
        _health_manager.register_check(HealthCheck(
            name="memory",
            check_function=check_memory,
            dependency_type=DependencyType.STORAGE,
            critical=False,
            timeout=2.0
        ))
    
    return _health_manager
