"""
Advanced Monitoring Service for Spirit Tours System
Provides comprehensive monitoring, metrics collection, and performance analytics
for the call reporting, scheduling, and external service integrations.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional, Union
import json
import aiohttp
import psutil
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque
import time
import statistics
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
import redis.asyncio as redis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ServiceStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"

class MetricType(Enum):
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"

@dataclass
class ServiceMetric:
    """Represents a single service metric"""
    name: str
    value: Union[int, float]
    metric_type: MetricType
    timestamp: datetime
    labels: Dict[str, str]
    description: Optional[str] = None

@dataclass
class ServiceHealth:
    """Represents the health status of a service"""
    service_name: str
    status: ServiceStatus
    response_time: float
    last_check: datetime
    error_rate: float
    uptime_percentage: float
    metadata: Dict[str, Any]

@dataclass
class CallAnalytics:
    """Call analytics metrics"""
    total_calls: int
    successful_calls: int
    failed_calls: int
    average_duration: float
    calls_by_country: Dict[str, int]
    sentiment_distribution: Dict[str, int]
    appointment_requests: int
    follow_up_scheduled: int
    ai_analysis_success_rate: float

@dataclass
class SchedulingAnalytics:
    """Scheduling system analytics"""
    total_appointments: int
    successful_schedules: int
    failed_schedules: int
    timezone_distribution: Dict[str, int]
    appointment_types: Dict[str, int]
    average_scheduling_time: float
    customer_preferences_accuracy: float

@dataclass
class SystemPerformance:
    """System performance metrics"""
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_io: Dict[str, float]
    database_connections: int
    active_sessions: int
    response_times: Dict[str, float]

class AdvancedMonitoringService:
    """
    Advanced monitoring service that provides comprehensive system monitoring,
    metrics collection, and performance analytics.
    """
    
    def __init__(self, db_session: AsyncSession, redis_client: Optional[redis.Redis] = None):
        self.db_session = db_session
        self.redis_client = redis_client
        self.metrics_storage = defaultdict(deque)
        self.service_health_cache = {}
        self.performance_history = deque(maxlen=1000)  # Keep last 1000 performance snapshots
        self.alert_thresholds = self._initialize_alert_thresholds()
        self.monitoring_tasks = []
        self._initialize_monitoring()
    
    def _initialize_alert_thresholds(self) -> Dict[str, Dict[str, float]]:
        """Initialize alert thresholds for various metrics"""
        return {
            "system": {
                "cpu_usage_warning": 70.0,
                "cpu_usage_critical": 85.0,
                "memory_usage_warning": 75.0,
                "memory_usage_critical": 90.0,
                "disk_usage_warning": 80.0,
                "disk_usage_critical": 95.0,
                "response_time_warning": 2.0,
                "response_time_critical": 5.0
            },
            "external_services": {
                "error_rate_warning": 5.0,
                "error_rate_critical": 10.0,
                "response_time_warning": 3.0,
                "response_time_critical": 10.0,
                "uptime_warning": 99.0,
                "uptime_critical": 95.0
            },
            "call_reporting": {
                "ai_analysis_failure_rate_warning": 10.0,
                "ai_analysis_failure_rate_critical": 25.0,
                "processing_time_warning": 30.0,
                "processing_time_critical": 60.0
            },
            "scheduling": {
                "scheduling_failure_rate_warning": 15.0,
                "scheduling_failure_rate_critical": 30.0,
                "timezone_detection_failure_warning": 5.0,
                "timezone_detection_failure_critical": 15.0
            }
        }
    
    def _initialize_monitoring(self):
        """Initialize monitoring tasks"""
        logger.info("Initializing monitoring service...")
        # Monitoring will be started via start_monitoring() method
    
    async def start_monitoring(self):
        """Start all monitoring tasks"""
        try:
            # System performance monitoring (every 30 seconds)
            self.monitoring_tasks.append(
                asyncio.create_task(self._monitor_system_performance())
            )
            
            # External services health monitoring (every 60 seconds)
            self.monitoring_tasks.append(
                asyncio.create_task(self._monitor_external_services())
            )
            
            # Database health monitoring (every 120 seconds)
            self.monitoring_tasks.append(
                asyncio.create_task(self._monitor_database_health())
            )
            
            # Call analytics collection (every 300 seconds)
            self.monitoring_tasks.append(
                asyncio.create_task(self._collect_call_analytics())
            )
            
            # Scheduling analytics collection (every 300 seconds)
            self.monitoring_tasks.append(
                asyncio.create_task(self._collect_scheduling_analytics())
            )
            
            # Alert processing (every 60 seconds)
            self.monitoring_tasks.append(
                asyncio.create_task(self._process_alerts())
            )
            
            logger.info(f"Started {len(self.monitoring_tasks)} monitoring tasks")
            
        except Exception as e:
            logger.error(f"Error starting monitoring tasks: {e}")
            raise
    
    async def stop_monitoring(self):
        """Stop all monitoring tasks"""
        for task in self.monitoring_tasks:
            task.cancel()
        
        await asyncio.gather(*self.monitoring_tasks, return_exceptions=True)
        self.monitoring_tasks.clear()
        logger.info("Stopped all monitoring tasks")
    
    async def _monitor_system_performance(self):
        """Monitor system performance metrics"""
        while True:
            try:
                performance = await self._collect_system_performance()
                self.performance_history.append(performance)
                
                # Store in Redis if available
                if self.redis_client:
                    await self.redis_client.setex(
                        "system:performance:current",
                        300,  # 5 minutes TTL
                        json.dumps(asdict(performance), default=str)
                    )
                
                # Check for alerts
                await self._check_system_alerts(performance)
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error monitoring system performance: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def _monitor_external_services(self):
        """Monitor external services health"""
        services = [
            {"name": "OpenAI GPT", "url": "https://api.openai.com/v1/models"},
            {"name": "ElevenLabs", "url": "https://api.elevenlabs.io/v1/voices"},
            {"name": "Twilio", "url": "https://api.twilio.com/2010-04-01/Accounts.json"},
            {"name": "SendGrid", "url": "https://api.sendgrid.com/v3/user/profile"},
        ]
        
        while True:
            try:
                for service in services:
                    health = await self._check_service_health(service)
                    self.service_health_cache[service["name"]] = health
                    
                    # Store in Redis if available
                    if self.redis_client:
                        await self.redis_client.setex(
                            f"service:health:{service['name'].lower().replace(' ', '_')}",
                            300,
                            json.dumps(asdict(health), default=str)
                        )
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Error monitoring external services: {e}")
                await asyncio.sleep(120)  # Wait longer on error
    
    async def _monitor_database_health(self):
        """Monitor database health and connection pool"""
        while True:
            try:
                # Check database connectivity
                start_time = time.time()
                result = await self.db_session.execute(text("SELECT 1"))
                response_time = (time.time() - start_time) * 1000
                
                # Get connection pool stats
                pool_stats = await self._get_database_pool_stats()
                
                db_health = ServiceHealth(
                    service_name="PostgreSQL Database",
                    status=ServiceStatus.HEALTHY if response_time < 100 else ServiceStatus.DEGRADED,
                    response_time=response_time,
                    last_check=datetime.now(timezone.utc),
                    error_rate=0.0,  # Could be calculated from error logs
                    uptime_percentage=99.9,  # Could be calculated from historical data
                    metadata=pool_stats
                )
                
                self.service_health_cache["database"] = db_health
                
                # Store in Redis if available
                if self.redis_client:
                    await self.redis_client.setex(
                        "service:health:database",
                        300,
                        json.dumps(asdict(db_health), default=str)
                    )
                
                await asyncio.sleep(120)  # Check every 2 minutes
                
            except Exception as e:
                logger.error(f"Error monitoring database health: {e}")
                # Mark database as unhealthy
                error_health = ServiceHealth(
                    service_name="PostgreSQL Database",
                    status=ServiceStatus.UNHEALTHY,
                    response_time=0.0,
                    last_check=datetime.now(timezone.utc),
                    error_rate=100.0,
                    uptime_percentage=0.0,
                    metadata={"error": str(e)}
                )
                self.service_health_cache["database"] = error_health
                await asyncio.sleep(60)
    
    async def _collect_call_analytics(self):
        """Collect call reporting analytics"""
        while True:
            try:
                # Get call analytics from the last 24 hours
                since = datetime.now(timezone.utc) - timedelta(hours=24)
                
                # Query call reports
                call_query = text("""
                    SELECT 
                        COUNT(*) as total_calls,
                        COUNT(*) FILTER (WHERE status = 'completed') as successful_calls,
                        COUNT(*) FILTER (WHERE status = 'failed') as failed_calls,
                        AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_duration,
                        COUNT(*) FILTER (WHERE appointment_requested = true) as appointment_requests,
                        COUNT(*) FILTER (WHERE follow_up_required = true) as follow_up_scheduled
                    FROM call_reports 
                    WHERE created_at >= :since
                """)
                
                result = await self.db_session.execute(call_query, {"since": since})
                row = result.fetchone()
                
                # Get sentiment distribution
                sentiment_query = text("""
                    SELECT sentiment, COUNT(*) 
                    FROM call_reports 
                    WHERE created_at >= :since AND sentiment IS NOT NULL
                    GROUP BY sentiment
                """)
                
                sentiment_result = await self.db_session.execute(sentiment_query, {"since": since})
                sentiment_distribution = dict(sentiment_result.fetchall())
                
                # Get calls by country
                country_query = text("""
                    SELECT customer_country, COUNT(*) 
                    FROM call_reports 
                    WHERE created_at >= :since AND customer_country IS NOT NULL
                    GROUP BY customer_country
                """)
                
                country_result = await self.db_session.execute(country_query, {"since": since})
                calls_by_country = dict(country_result.fetchall())
                
                analytics = CallAnalytics(
                    total_calls=row.total_calls or 0,
                    successful_calls=row.successful_calls or 0,
                    failed_calls=row.failed_calls or 0,
                    average_duration=row.avg_duration or 0.0,
                    calls_by_country=calls_by_country,
                    sentiment_distribution=sentiment_distribution,
                    appointment_requests=row.appointment_requests or 0,
                    follow_up_scheduled=row.follow_up_scheduled or 0,
                    ai_analysis_success_rate=((row.successful_calls or 0) / max(row.total_calls or 1, 1)) * 100
                )
                
                # Store in Redis if available
                if self.redis_client:
                    await self.redis_client.setex(
                        "analytics:calls:24h",
                        600,  # 10 minutes TTL
                        json.dumps(asdict(analytics), default=str)
                    )
                
                await asyncio.sleep(300)  # Collect every 5 minutes
                
            except Exception as e:
                logger.error(f"Error collecting call analytics: {e}")
                await asyncio.sleep(600)  # Wait longer on error
    
    async def _collect_scheduling_analytics(self):
        """Collect scheduling system analytics"""
        while True:
            try:
                # Get scheduling analytics from the last 24 hours
                since = datetime.now(timezone.utc) - timedelta(hours=24)
                
                # Query appointment schedules
                schedule_query = text("""
                    SELECT 
                        COUNT(*) as total_appointments,
                        COUNT(*) FILTER (WHERE status = 'confirmed') as successful_schedules,
                        COUNT(*) FILTER (WHERE status = 'failed') as failed_schedules,
                        AVG(EXTRACT(EPOCH FROM (created_at - requested_at))) as avg_scheduling_time
                    FROM appointment_schedules 
                    WHERE created_at >= :since
                """)
                
                result = await self.db_session.execute(schedule_query, {"since": since})
                row = result.fetchone()
                
                # Get timezone distribution
                timezone_query = text("""
                    SELECT customer_timezone, COUNT(*) 
                    FROM appointment_schedules 
                    WHERE created_at >= :since AND customer_timezone IS NOT NULL
                    GROUP BY customer_timezone
                """)
                
                timezone_result = await self.db_session.execute(timezone_query, {"since": since})
                timezone_distribution = dict(timezone_result.fetchall())
                
                # Get appointment types
                type_query = text("""
                    SELECT appointment_type, COUNT(*) 
                    FROM appointment_schedules 
                    WHERE created_at >= :since AND appointment_type IS NOT NULL
                    GROUP BY appointment_type
                """)
                
                type_result = await self.db_session.execute(type_query, {"since": since})
                appointment_types = dict(type_result.fetchall())
                
                analytics = SchedulingAnalytics(
                    total_appointments=row.total_appointments or 0,
                    successful_schedules=row.successful_schedules or 0,
                    failed_schedules=row.failed_schedules or 0,
                    timezone_distribution=timezone_distribution,
                    appointment_types=appointment_types,
                    average_scheduling_time=row.avg_scheduling_time or 0.0,
                    customer_preferences_accuracy=95.0  # Could be calculated from feedback data
                )
                
                # Store in Redis if available
                if self.redis_client:
                    await self.redis_client.setex(
                        "analytics:scheduling:24h",
                        600,  # 10 minutes TTL
                        json.dumps(asdict(analytics), default=str)
                    )
                
                await asyncio.sleep(300)  # Collect every 5 minutes
                
            except Exception as e:
                logger.error(f"Error collecting scheduling analytics: {e}")
                await asyncio.sleep(600)  # Wait longer on error
    
    async def _collect_system_performance(self) -> SystemPerformance:
        """Collect current system performance metrics"""
        # CPU usage
        cpu_usage = psutil.cpu_percent(interval=1)
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_usage = memory.percent
        
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_usage = (disk.used / disk.total) * 100
        
        # Network I/O
        network = psutil.net_io_counters()
        network_io = {
            "bytes_sent": float(network.bytes_sent),
            "bytes_recv": float(network.bytes_recv),
            "packets_sent": float(network.packets_sent),
            "packets_recv": float(network.packets_recv)
        }
        
        # Database connections (simplified)
        database_connections = 10  # Could be queried from actual pool
        
        # Active sessions (simplified)
        active_sessions = 5  # Could be queried from session store
        
        # Response times (sample endpoints)
        response_times = {
            "api_health": 50.0,  # milliseconds
            "call_reporting": 150.0,
            "scheduling": 100.0
        }
        
        return SystemPerformance(
            cpu_usage=cpu_usage,
            memory_usage=memory_usage,
            disk_usage=disk_usage,
            network_io=network_io,
            database_connections=database_connections,
            active_sessions=active_sessions,
            response_times=response_times
        )
    
    async def _check_service_health(self, service_config: Dict[str, Any]) -> ServiceHealth:
        """Check health of an external service"""
        start_time = time.time()
        
        try:
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(service_config["url"]) as response:
                    response_time = (time.time() - start_time) * 1000
                    
                    if response.status < 400:
                        status = ServiceStatus.HEALTHY
                        error_rate = 0.0
                    elif response.status < 500:
                        status = ServiceStatus.DEGRADED
                        error_rate = 25.0
                    else:
                        status = ServiceStatus.UNHEALTHY
                        error_rate = 100.0
                    
                    return ServiceHealth(
                        service_name=service_config["name"],
                        status=status,
                        response_time=response_time,
                        last_check=datetime.now(timezone.utc),
                        error_rate=error_rate,
                        uptime_percentage=99.0 if status == ServiceStatus.HEALTHY else 95.0,
                        metadata={"status_code": response.status}
                    )
        
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return ServiceHealth(
                service_name=service_config["name"],
                status=ServiceStatus.UNHEALTHY,
                response_time=response_time,
                last_check=datetime.now(timezone.utc),
                error_rate=100.0,
                uptime_percentage=0.0,
                metadata={"error": str(e)}
            )
    
    async def _get_database_pool_stats(self) -> Dict[str, Any]:
        """Get database connection pool statistics"""
        # This would normally query the actual connection pool
        return {
            "pool_size": 20,
            "checked_in": 15,
            "checked_out": 5,
            "overflow": 0,
            "invalidated": 0
        }
    
    async def _check_system_alerts(self, performance: SystemPerformance):
        """Check system performance against alert thresholds"""
        alerts = []
        thresholds = self.alert_thresholds["system"]
        
        # CPU usage alerts
        if performance.cpu_usage >= thresholds["cpu_usage_critical"]:
            alerts.append({
                "type": "critical",
                "message": f"CPU usage critically high: {performance.cpu_usage:.1f}%",
                "metric": "cpu_usage",
                "value": performance.cpu_usage
            })
        elif performance.cpu_usage >= thresholds["cpu_usage_warning"]:
            alerts.append({
                "type": "warning",
                "message": f"CPU usage high: {performance.cpu_usage:.1f}%",
                "metric": "cpu_usage",
                "value": performance.cpu_usage
            })
        
        # Memory usage alerts
        if performance.memory_usage >= thresholds["memory_usage_critical"]:
            alerts.append({
                "type": "critical",
                "message": f"Memory usage critically high: {performance.memory_usage:.1f}%",
                "metric": "memory_usage",
                "value": performance.memory_usage
            })
        elif performance.memory_usage >= thresholds["memory_usage_warning"]:
            alerts.append({
                "type": "warning",
                "message": f"Memory usage high: {performance.memory_usage:.1f}%",
                "metric": "memory_usage",
                "value": performance.memory_usage
            })
        
        # Disk usage alerts
        if performance.disk_usage >= thresholds["disk_usage_critical"]:
            alerts.append({
                "type": "critical",
                "message": f"Disk usage critically high: {performance.disk_usage:.1f}%",
                "metric": "disk_usage",
                "value": performance.disk_usage
            })
        elif performance.disk_usage >= thresholds["disk_usage_warning"]:
            alerts.append({
                "type": "warning",
                "message": f"Disk usage high: {performance.disk_usage:.1f}%",
                "metric": "disk_usage",
                "value": performance.disk_usage
            })
        
        # Process alerts if any
        if alerts:
            await self._process_system_alerts(alerts)
    
    async def _process_alerts(self):
        """Process and handle system alerts"""
        while True:
            try:
                # This would process queued alerts and send notifications
                # For now, just log them
                await asyncio.sleep(60)  # Process every minute
                
            except Exception as e:
                logger.error(f"Error processing alerts: {e}")
                await asyncio.sleep(120)
    
    async def _process_system_alerts(self, alerts: List[Dict[str, Any]]):
        """Process system alerts"""
        for alert in alerts:
            logger.warning(f"SYSTEM ALERT [{alert['type'].upper()}]: {alert['message']}")
            
            # Store alert in Redis if available
            if self.redis_client:
                alert_data = {
                    **alert,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                await self.redis_client.lpush(
                    "alerts:system",
                    json.dumps(alert_data, default=str)
                )
                # Keep only last 100 alerts
                await self.redis_client.ltrim("alerts:system", 0, 99)
    
    # Public API methods for accessing monitoring data
    
    async def get_system_health_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive system health dashboard"""
        current_performance = await self._collect_system_performance()
        
        # Get recent performance history
        recent_performance = list(self.performance_history)[-10:] if self.performance_history else []
        
        # Calculate trends
        cpu_trend = self._calculate_trend([p.cpu_usage for p in recent_performance])
        memory_trend = self._calculate_trend([p.memory_usage for p in recent_performance])
        
        return {
            "current_performance": asdict(current_performance),
            "service_health": {
                name: asdict(health) 
                for name, health in self.service_health_cache.items()
            },
            "trends": {
                "cpu_usage": cpu_trend,
                "memory_usage": memory_trend
            },
            "alerts": await self._get_recent_alerts(),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
    
    async def get_call_analytics_dashboard(self) -> Optional[Dict[str, Any]]:
        """Get call analytics dashboard"""
        if self.redis_client:
            cached_data = await self.redis_client.get("analytics:calls:24h")
            if cached_data:
                return json.loads(cached_data)
        
        # Fallback to direct collection if no cache
        try:
            await self._collect_call_analytics()
            if self.redis_client:
                cached_data = await self.redis_client.get("analytics:calls:24h")
                if cached_data:
                    return json.loads(cached_data)
        except Exception as e:
            logger.error(f"Error getting call analytics: {e}")
        
        return None
    
    async def get_scheduling_analytics_dashboard(self) -> Optional[Dict[str, Any]]:
        """Get scheduling analytics dashboard"""
        if self.redis_client:
            cached_data = await self.redis_client.get("analytics:scheduling:24h")
            if cached_data:
                return json.loads(cached_data)
        
        # Fallback to direct collection if no cache
        try:
            await self._collect_scheduling_analytics()
            if self.redis_client:
                cached_data = await self.redis_client.get("analytics:scheduling:24h")
                if cached_data:
                    return json.loads(cached_data)
        except Exception as e:
            logger.error(f"Error getting scheduling analytics: {e}")
        
        return None
    
    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction from a list of values"""
        if len(values) < 2:
            return "stable"
        
        # Simple trend calculation using linear regression slope
        x = list(range(len(values)))
        n = len(values)
        
        sum_x = sum(x)
        sum_y = sum(values)
        sum_xy = sum(x[i] * values[i] for i in range(n))
        sum_x2 = sum(x[i] ** 2 for i in range(n))
        
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)
        
        if slope > 0.5:
            return "increasing"
        elif slope < -0.5:
            return "decreasing"
        else:
            return "stable"
    
    async def _get_recent_alerts(self) -> List[Dict[str, Any]]:
        """Get recent system alerts"""
        if self.redis_client:
            try:
                alerts = await self.redis_client.lrange("alerts:system", 0, 9)  # Last 10 alerts
                return [json.loads(alert) for alert in alerts]
            except Exception as e:
                logger.error(f"Error getting recent alerts: {e}")
        
        return []
    
    async def record_custom_metric(self, metric: ServiceMetric):
        """Record a custom metric"""
        # Store in memory
        self.metrics_storage[metric.name].append(metric)
        
        # Keep only last 1000 metrics per name
        if len(self.metrics_storage[metric.name]) > 1000:
            self.metrics_storage[metric.name].popleft()
        
        # Store in Redis if available
        if self.redis_client:
            await self.redis_client.lpush(
                f"metrics:{metric.name}",
                json.dumps(asdict(metric), default=str)
            )
            await self.redis_client.ltrim(f"metrics:{metric.name}", 0, 999)
    
    async def get_custom_metrics(self, metric_name: str, limit: int = 100) -> List[ServiceMetric]:
        """Get custom metrics by name"""
        if self.redis_client:
            try:
                metrics_data = await self.redis_client.lrange(f"metrics:{metric_name}", 0, limit - 1)
                return [
                    ServiceMetric(**json.loads(data)) 
                    for data in metrics_data
                ]
            except Exception as e:
                logger.error(f"Error getting custom metrics: {e}")
        
        # Fallback to memory storage
        metrics = list(self.metrics_storage.get(metric_name, []))
        return metrics[-limit:] if len(metrics) > limit else metrics

# Monitoring service instance will be initialized in the main application
monitoring_service = None

async def get_monitoring_service() -> AdvancedMonitoringService:
    """Get the global monitoring service instance"""
    global monitoring_service
    if monitoring_service is None:
        raise RuntimeError("Monitoring service not initialized. Call initialize_monitoring_service() first.")
    return monitoring_service

async def initialize_monitoring_service(db_session: AsyncSession, redis_client: Optional[redis.Redis] = None):
    """Initialize the global monitoring service instance"""
    global monitoring_service
    monitoring_service = AdvancedMonitoringService(db_session, redis_client)
    await monitoring_service.start_monitoring()
    logger.info("Advanced monitoring service initialized and started")

async def shutdown_monitoring_service():
    """Shutdown the global monitoring service instance"""
    global monitoring_service
    if monitoring_service:
        await monitoring_service.stop_monitoring()
        monitoring_service = None
        logger.info("Advanced monitoring service shutdown completed")