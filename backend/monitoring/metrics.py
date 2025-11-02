"""
Prometheus Metrics.

This module provides Prometheus metrics collection for the application.

Features:
- Request metrics (latency, count, errors)
- Business metrics (bookings, revenue, etc.)
- System metrics (CPU, memory, connections)
- Custom metrics support

Author: GenSpark AI Developer
Phase: 10 - Monitoring & Observability
"""

from typing import Dict, Any, Optional
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    Summary,
    Info,
    generate_latest,
    REGISTRY
)
from functools import wraps
import time
import psutil
import asyncio

from utils.logger import get_logger

logger = get_logger(__name__)


# Request metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0)
)

http_request_size_bytes = Summary(
    'http_request_size_bytes',
    'HTTP request size in bytes',
    ['method', 'endpoint']
)

http_response_size_bytes = Summary(
    'http_response_size_bytes',
    'HTTP response size in bytes',
    ['method', 'endpoint']
)

http_errors_total = Counter(
    'http_errors_total',
    'Total HTTP errors',
    ['method', 'endpoint', 'error_type']
)

# Business metrics
bookings_total = Counter(
    'bookings_total',
    'Total bookings created',
    ['product_type', 'status']
)

bookings_revenue_total = Counter(
    'bookings_revenue_total',
    'Total revenue from bookings',
    ['product_type', 'currency']
)

commissions_total = Counter(
    'commissions_total',
    'Total commissions paid',
    ['agent_tier', 'product_type']
)

active_users_gauge = Gauge(
    'active_users',
    'Number of currently active users',
    ['user_type']
)

# Database metrics
database_connections_active = Gauge(
    'database_connections_active',
    'Number of active database connections'
)

database_connections_idle = Gauge(
    'database_connections_idle',
    'Number of idle database connections'
)

database_query_duration_seconds = Histogram(
    'database_query_duration_seconds',
    'Database query duration in seconds',
    ['query_type'],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0)
)

# Cache metrics
cache_hits_total = Counter(
    'cache_hits_total',
    'Total cache hits',
    ['cache_type']
)

cache_misses_total = Counter(
    'cache_misses_total',
    'Total cache misses',
    ['cache_type']
)

cache_size_bytes = Gauge(
    'cache_size_bytes',
    'Current cache size in bytes',
    ['cache_type']
)

# System metrics
system_cpu_usage_percent = Gauge(
    'system_cpu_usage_percent',
    'System CPU usage percentage'
)

system_memory_usage_bytes = Gauge(
    'system_memory_usage_bytes',
    'System memory usage in bytes'
)

system_disk_usage_bytes = Gauge(
    'system_disk_usage_bytes',
    'System disk usage in bytes',
    ['device']
)

# Application info
application_info = Info(
    'application',
    'Application information'
)


class MetricsCollector:
    """
    Central metrics collector.
    
    Provides methods to track and export metrics.
    """
    
    def __init__(self):
        """Initialize metrics collector."""
        self._start_time = time.time()
        
        # Set application info
        application_info.info({
            'name': 'B2B2B Platform',
            'version': '1.0.0',
            'environment': 'production'
        })
        
        logger.info("Metrics collector initialized")
    
    def track_request(
        self,
        method: str,
        endpoint: str,
        status: int,
        duration: float,
        request_size: Optional[int] = None,
        response_size: Optional[int] = None
    ) -> None:
        """
        Track HTTP request metrics.
        
        Args:
            method: HTTP method
            endpoint: Request endpoint
            status: Response status code
            duration: Request duration in seconds
            request_size: Request size in bytes
            response_size: Response size in bytes
        """
        # Increment request counter
        http_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status=status
        ).inc()
        
        # Track duration
        http_request_duration_seconds.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
        
        # Track sizes
        if request_size:
            http_request_size_bytes.labels(
                method=method,
                endpoint=endpoint
            ).observe(request_size)
        
        if response_size:
            http_response_size_bytes.labels(
                method=method,
                endpoint=endpoint
            ).observe(response_size)
        
        # Track errors
        if status >= 400:
            error_type = 'client_error' if status < 500 else 'server_error'
            http_errors_total.labels(
                method=method,
                endpoint=endpoint,
                error_type=error_type
            ).inc()
    
    def track_booking(
        self,
        product_type: str,
        status: str,
        amount: float,
        currency: str = 'EUR'
    ) -> None:
        """
        Track booking metrics.
        
        Args:
            product_type: Type of product (flight, hotel, etc.)
            status: Booking status
            amount: Booking amount
            currency: Currency code
        """
        bookings_total.labels(
            product_type=product_type,
            status=status
        ).inc()
        
        if status == 'confirmed':
            bookings_revenue_total.labels(
                product_type=product_type,
                currency=currency
            ).inc(amount)
    
    def track_commission(
        self,
        agent_tier: str,
        product_type: str,
        amount: float
    ) -> None:
        """Track commission metrics."""
        commissions_total.labels(
            agent_tier=agent_tier,
            product_type=product_type
        ).inc(amount)
    
    def update_active_users(self, user_type: str, count: int) -> None:
        """Update active users gauge."""
        active_users_gauge.labels(user_type=user_type).set(count)
    
    def update_database_metrics(
        self,
        active_connections: int,
        idle_connections: int
    ) -> None:
        """Update database metrics."""
        database_connections_active.set(active_connections)
        database_connections_idle.set(idle_connections)
    
    def track_database_query(self, query_type: str, duration: float) -> None:
        """Track database query."""
        database_query_duration_seconds.labels(
            query_type=query_type
        ).observe(duration)
    
    def track_cache_hit(self, cache_type: str = 'redis') -> None:
        """Track cache hit."""
        cache_hits_total.labels(cache_type=cache_type).inc()
    
    def track_cache_miss(self, cache_type: str = 'redis') -> None:
        """Track cache miss."""
        cache_misses_total.labels(cache_type=cache_type).inc()
    
    def update_cache_size(self, cache_type: str, size_bytes: int) -> None:
        """Update cache size."""
        cache_size_bytes.labels(cache_type=cache_type).set(size_bytes)
    
    def update_system_metrics(self) -> None:
        """Update system metrics."""
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        system_cpu_usage_percent.set(cpu_percent)
        
        # Memory usage
        memory = psutil.virtual_memory()
        system_memory_usage_bytes.set(memory.used)
        
        # Disk usage
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                system_disk_usage_bytes.labels(
                    device=partition.device
                ).set(usage.used)
            except PermissionError:
                pass
    
    def get_uptime_seconds(self) -> float:
        """Get application uptime in seconds."""
        return time.time() - self._start_time
    
    def export_metrics(self) -> bytes:
        """
        Export metrics in Prometheus format.
        
        Returns:
            Metrics in Prometheus text format
        """
        return generate_latest(REGISTRY)


# Singleton instance
_metrics_collector: Optional[MetricsCollector] = None


def get_metrics_collector() -> MetricsCollector:
    """
    Get global metrics collector.
    
    Returns:
        MetricsCollector instance
    """
    global _metrics_collector
    if _metrics_collector is None:
        _metrics_collector = MetricsCollector()
    return _metrics_collector


def track_request_metrics():
    """
    Decorator to automatically track request metrics.
    
    Example:
        @track_request_metrics()
        async def my_endpoint():
            return {"status": "ok"}
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            collector = get_metrics_collector()
            
            # Extract request info (simplified)
            method = "GET"  # Would come from request object
            endpoint = func.__name__
            
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                
                collector.track_request(
                    method=method,
                    endpoint=endpoint,
                    status=200,
                    duration=duration
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                collector.track_request(
                    method=method,
                    endpoint=endpoint,
                    status=500,
                    duration=duration
                )
                
                raise
        
        return wrapper
    return decorator


async def collect_system_metrics_periodically(interval: int = 60):
    """
    Collect system metrics periodically.
    
    Args:
        interval: Collection interval in seconds
    """
    collector = get_metrics_collector()
    
    while True:
        try:
            collector.update_system_metrics()
            logger.debug("System metrics collected")
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
        
        await asyncio.sleep(interval)
