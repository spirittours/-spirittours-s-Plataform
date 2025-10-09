"""
Metrics Collector for Prometheus
Spirit Tours Platform - Monitoring System
"""

import time
import psutil
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from prometheus_client import (
    Counter, Histogram, Gauge, Summary, Info,
    generate_latest, CollectorRegistry, CONTENT_TYPE_LATEST,
    start_http_server, push_to_gateway
)
from functools import wraps
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import redis
import json

# Configure logging
logger = logging.getLogger(__name__)

# Create metrics registry
registry = CollectorRegistry()

# ====================
# System Metrics
# ====================

# CPU and Memory metrics
cpu_usage_gauge = Gauge(
    'system_cpu_usage_percent',
    'CPU usage percentage',
    registry=registry
)

memory_usage_gauge = Gauge(
    'system_memory_usage_bytes',
    'Memory usage in bytes',
    registry=registry
)

memory_percent_gauge = Gauge(
    'system_memory_usage_percent',
    'Memory usage percentage',
    registry=registry
)

disk_usage_gauge = Gauge(
    'system_disk_usage_percent',
    'Disk usage percentage',
    ['mount_point'],
    registry=registry
)

# ====================
# API Metrics
# ====================

# Request metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status'],
    registry=registry
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
    registry=registry
)

http_request_size_bytes = Summary(
    'http_request_size_bytes',
    'HTTP request size in bytes',
    ['method', 'endpoint'],
    registry=registry
)

http_response_size_bytes = Summary(
    'http_response_size_bytes',
    'HTTP response size in bytes',
    ['method', 'endpoint'],
    registry=registry
)

active_requests = Gauge(
    'http_active_requests',
    'Number of active HTTP requests',
    registry=registry
)

# ====================
# Business Metrics
# ====================

# Booking metrics
bookings_created = Counter(
    'bookings_created_total',
    'Total bookings created',
    ['tour_type', 'payment_method'],
    registry=registry
)

booking_revenue = Counter(
    'booking_revenue_total',
    'Total booking revenue',
    ['currency', 'tour_type'],
    registry=registry
)

bookings_cancelled = Counter(
    'bookings_cancelled_total',
    'Total bookings cancelled',
    ['reason'],
    registry=registry
)

active_bookings = Gauge(
    'active_bookings_count',
    'Number of active bookings',
    ['status'],
    registry=registry
)

# User metrics
users_registered = Counter(
    'users_registered_total',
    'Total users registered',
    ['registration_source'],
    registry=registry
)

active_users = Gauge(
    'active_users_count',
    'Number of active users in last 24 hours',
    registry=registry
)

user_sessions = Gauge(
    'user_sessions_active',
    'Number of active user sessions',
    registry=registry
)

# Tour metrics
tours_viewed = Counter(
    'tours_viewed_total',
    'Total tour views',
    ['tour_id', 'source'],
    registry=registry
)

tour_searches = Counter(
    'tour_searches_total',
    'Total tour searches',
    ['destination', 'category'],
    registry=registry
)

tour_availability = Gauge(
    'tour_availability_spots',
    'Available spots per tour',
    ['tour_id', 'date'],
    registry=registry
)

# ====================
# Cache Metrics
# ====================

cache_hits = Counter(
    'cache_hits_total',
    'Total cache hits',
    ['cache_type'],
    registry=registry
)

cache_misses = Counter(
    'cache_misses_total',
    'Total cache misses',
    ['cache_type'],
    registry=registry
)

cache_evictions = Counter(
    'cache_evictions_total',
    'Total cache evictions',
    ['reason'],
    registry=registry
)

cache_size = Gauge(
    'cache_size_bytes',
    'Current cache size in bytes',
    ['cache_type'],
    registry=registry
)

# ====================
# Database Metrics
# ====================

db_connections_active = Gauge(
    'database_connections_active',
    'Number of active database connections',
    registry=registry
)

db_connections_idle = Gauge(
    'database_connections_idle',
    'Number of idle database connections',
    registry=registry
)

db_query_duration = Histogram(
    'database_query_duration_seconds',
    'Database query duration in seconds',
    ['query_type', 'table'],
    buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0),
    registry=registry
)

db_transactions = Counter(
    'database_transactions_total',
    'Total database transactions',
    ['status'],
    registry=registry
)

# ====================
# AI Agent Metrics
# ====================

ai_agent_requests = Counter(
    'ai_agent_requests_total',
    'Total AI agent requests',
    ['agent_name', 'request_type'],
    registry=registry
)

ai_agent_response_time = Histogram(
    'ai_agent_response_time_seconds',
    'AI agent response time',
    ['agent_name'],
    buckets=(0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0),
    registry=registry
)

ai_agent_errors = Counter(
    'ai_agent_errors_total',
    'Total AI agent errors',
    ['agent_name', 'error_type'],
    registry=registry
)

ai_tokens_used = Counter(
    'ai_tokens_used_total',
    'Total AI tokens consumed',
    ['model', 'agent_name'],
    registry=registry
)

# ====================
# Payment Metrics
# ====================

payments_processed = Counter(
    'payments_processed_total',
    'Total payments processed',
    ['provider', 'status'],
    registry=registry
)

payment_amount = Counter(
    'payment_amount_total',
    'Total payment amount',
    ['currency', 'provider'],
    registry=registry
)

payment_processing_time = Histogram(
    'payment_processing_time_seconds',
    'Payment processing time',
    ['provider'],
    buckets=(0.5, 1.0, 2.0, 5.0, 10.0, 30.0),
    registry=registry
)

payment_failures = Counter(
    'payment_failures_total',
    'Total payment failures',
    ['provider', 'reason'],
    registry=registry
)


class MetricsCollector:
    """Main metrics collector class"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.registry = registry
        self._start_time = time.time()
        self._initialize_info_metrics()
        
    def _initialize_info_metrics(self):
        """Initialize application info metrics"""
        app_info = Info('app_info', 'Application information', registry=self.registry)
        app_info.info({
            'version': '1.0.0',
            'name': 'Spirit Tours Platform',
            'environment': 'production',
            'python_version': '3.9'
        })
    
    def collect_system_metrics(self):
        """Collect system-level metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_usage_gauge.set(cpu_percent)
            
            # Memory metrics
            memory = psutil.virtual_memory()
            memory_usage_gauge.set(memory.used)
            memory_percent_gauge.set(memory.percent)
            
            # Disk metrics
            for partition in psutil.disk_partitions():
                try:
                    usage = psutil.disk_usage(partition.mountpoint)
                    disk_usage_gauge.labels(mount_point=partition.mountpoint).set(usage.percent)
                except:
                    pass
                    
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
    
    def track_request(self, method: str, endpoint: str, status: int, duration: float, 
                     request_size: int = 0, response_size: int = 0):
        """Track HTTP request metrics"""
        http_requests_total.labels(method=method, endpoint=endpoint, status=str(status)).inc()
        http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(duration)
        
        if request_size:
            http_request_size_bytes.labels(method=method, endpoint=endpoint).observe(request_size)
        if response_size:
            http_response_size_bytes.labels(method=method, endpoint=endpoint).observe(response_size)
    
    def track_booking(self, tour_type: str, payment_method: str, amount: float, currency: str = "USD"):
        """Track booking metrics"""
        bookings_created.labels(tour_type=tour_type, payment_method=payment_method).inc()
        booking_revenue.labels(currency=currency, tour_type=tour_type).inc(amount)
    
    def track_booking_cancellation(self, reason: str):
        """Track booking cancellation"""
        bookings_cancelled.labels(reason=reason).inc()
    
    def track_user_registration(self, source: str = "website"):
        """Track user registration"""
        users_registered.labels(registration_source=source).inc()
    
    def track_tour_view(self, tour_id: str, source: str = "website"):
        """Track tour view"""
        tours_viewed.labels(tour_id=tour_id, source=source).inc()
    
    def track_tour_search(self, destination: str, category: str = "all"):
        """Track tour search"""
        tour_searches.labels(destination=destination, category=category).inc()
    
    def track_cache_hit(self, cache_type: str = "redis"):
        """Track cache hit"""
        cache_hits.labels(cache_type=cache_type).inc()
    
    def track_cache_miss(self, cache_type: str = "redis"):
        """Track cache miss"""
        cache_misses.labels(cache_type=cache_type).inc()
    
    def track_db_query(self, query_type: str, table: str, duration: float):
        """Track database query"""
        db_query_duration.labels(query_type=query_type, table=table).observe(duration)
    
    def track_ai_agent_request(self, agent_name: str, request_type: str, response_time: float, tokens: int = 0):
        """Track AI agent request"""
        ai_agent_requests.labels(agent_name=agent_name, request_type=request_type).inc()
        ai_agent_response_time.labels(agent_name=agent_name).observe(response_time)
        
        if tokens:
            ai_tokens_used.labels(model="gpt-4", agent_name=agent_name).inc(tokens)
    
    def track_payment(self, provider: str, status: str, amount: float, processing_time: float, currency: str = "USD"):
        """Track payment processing"""
        payments_processed.labels(provider=provider, status=status).inc()
        payment_amount.labels(currency=currency, provider=provider).inc(amount)
        payment_processing_time.labels(provider=provider).observe(processing_time)
        
        if status == "failed":
            payment_failures.labels(provider=provider, reason="unknown").inc()
    
    def update_active_metrics(self, active_bookings_count: Dict[str, int], 
                            active_users_count: int, active_sessions: int):
        """Update gauge metrics"""
        # Update active bookings by status
        for status, count in active_bookings_count.items():
            active_bookings.labels(status=status).set(count)
        
        # Update active users and sessions
        active_users.set(active_users_count)
        user_sessions.set(active_sessions)
    
    def get_metrics(self) -> bytes:
        """Generate metrics in Prometheus format"""
        self.collect_system_metrics()
        return generate_latest(self.registry)
    
    async def start_metrics_server(self, port: int = 9090):
        """Start Prometheus metrics server"""
        start_http_server(port, registry=self.registry)
        logger.info(f"Metrics server started on port {port}")
        
        # Start background metrics collection
        while True:
            self.collect_system_metrics()
            await asyncio.sleep(10)  # Collect every 10 seconds


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Middleware to track HTTP metrics"""
    
    def __init__(self, app, metrics_collector: MetricsCollector):
        super().__init__(app)
        self.metrics = metrics_collector
        
    async def dispatch(self, request: Request, call_next):
        # Track active requests
        active_requests.inc()
        
        # Start timer
        start_time = time.time()
        
        # Get request size
        request_size = int(request.headers.get('content-length', 0))
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Get response size
            response_size = int(response.headers.get('content-length', 0))
            
            # Track metrics
            self.metrics.track_request(
                method=request.method,
                endpoint=request.url.path,
                status=response.status_code,
                duration=duration,
                request_size=request_size,
                response_size=response_size
            )
            
            return response
            
        except Exception as e:
            # Track error
            duration = time.time() - start_time
            self.metrics.track_request(
                method=request.method,
                endpoint=request.url.path,
                status=500,
                duration=duration,
                request_size=request_size
            )
            raise
            
        finally:
            # Decrease active requests
            active_requests.dec()


def monitor_performance(func):
    """Decorator to monitor function performance"""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            logger.debug(f"{func.__name__} executed in {duration:.3f}s")
            return result
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"{func.__name__} failed after {duration:.3f}s: {e}")
            raise
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            logger.debug(f"{func.__name__} executed in {duration:.3f}s")
            return result
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"{func.__name__} failed after {duration:.3f}s: {e}")
            raise
    
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper


# Create global metrics instance
metrics_collector = MetricsCollector()


if __name__ == "__main__":
    # Start metrics server for testing
    asyncio.run(metrics_collector.start_metrics_server())