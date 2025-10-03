"""
Performance Optimization Service for Spirit Tours System
Provides database query optimization, connection pooling management,
caching strategies, and system performance tuning for production deployment.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import json
from dataclasses import dataclass
from enum import Enum
import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from sqlalchemy.pool import QueuePool
import redis.asyncio as redis
from collections import defaultdict, deque
import psutil
import threading
import weakref

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OptimizationType(Enum):
    DATABASE = "database"
    CACHE = "cache"
    MEMORY = "memory"
    CPU = "cpu"
    NETWORK = "network"

class CacheStrategy(Enum):
    WRITE_THROUGH = "write_through"
    WRITE_BACK = "write_back"
    WRITE_AROUND = "write_around"
    READ_THROUGH = "read_through"

@dataclass
class QueryPerformance:
    """Query performance metrics"""
    query_id: str
    query_text: str
    execution_time: float
    rows_returned: int
    rows_examined: int
    timestamp: datetime
    optimization_suggestions: List[str]

@dataclass
class CacheStats:
    """Cache performance statistics"""
    cache_name: str
    hit_rate: float
    miss_rate: float
    total_requests: int
    memory_usage: int
    evictions: int
    avg_response_time: float

@dataclass
class ConnectionPoolStats:
    """Database connection pool statistics"""
    pool_name: str
    pool_size: int
    checked_out: int
    checked_in: int
    overflow: int
    invalidated: int
    utilization_rate: float

@dataclass
class PerformanceMetrics:
    """System performance metrics"""
    cpu_usage: float
    memory_usage: float
    disk_io: Dict[str, float]
    network_io: Dict[str, float]
    database_performance: Dict[str, Any]
    cache_performance: Dict[str, CacheStats]
    response_times: Dict[str, float]

class QueryOptimizer:
    """Database query optimization engine"""
    
    def __init__(self):
        self.query_cache = {}
        self.slow_query_log = deque(maxlen=1000)
        self.optimization_rules = self._initialize_optimization_rules()
    
    def _initialize_optimization_rules(self) -> Dict[str, List[str]]:
        """Initialize query optimization rules"""
        return {
            "missing_indexes": [
                "Consider adding indexes on frequently queried columns",
                "Add composite indexes for multi-column WHERE clauses",
                "Consider partial indexes for filtered queries"
            ],
            "inefficient_joins": [
                "Use INNER JOIN instead of subqueries where possible",
                "Ensure JOIN conditions use indexed columns",
                "Consider denormalizing for frequently joined tables"
            ],
            "large_result_sets": [
                "Add LIMIT clauses to restrict result size",
                "Use pagination for large datasets",
                "Consider result caching for expensive queries"
            ],
            "expensive_functions": [
                "Avoid using functions in WHERE clauses",
                "Pre-compute values where possible",
                "Use functional indexes for computed columns"
            ]
        }
    
    async def analyze_query_performance(self, query: str, execution_time: float, 
                                      rows_returned: int, rows_examined: int) -> QueryPerformance:
        """Analyze query performance and provide optimization suggestions"""
        query_id = hash(query.strip().lower())
        suggestions = []
        
        # Analyze execution time
        if execution_time > 1.0:  # Slow query threshold
            suggestions.extend(self.optimization_rules["expensive_functions"])
            
        # Analyze efficiency ratio
        if rows_examined > 0 and rows_returned > 0:
            efficiency_ratio = rows_returned / rows_examined
            if efficiency_ratio < 0.1:  # Less than 10% efficiency
                suggestions.extend(self.optimization_rules["inefficient_joins"])
        
        # Analyze result set size
        if rows_returned > 10000:
            suggestions.extend(self.optimization_rules["large_result_sets"])
        
        # Check for missing indexes (simplified heuristic)
        if "WHERE" in query.upper() and execution_time > 0.5:
            suggestions.extend(self.optimization_rules["missing_indexes"])
        
        performance = QueryPerformance(
            query_id=str(query_id),
            query_text=query[:200] + "..." if len(query) > 200 else query,
            execution_time=execution_time,
            rows_returned=rows_returned,
            rows_examined=rows_examined,
            timestamp=datetime.utcnow(),
            optimization_suggestions=list(set(suggestions))  # Remove duplicates
        )
        
        # Log slow queries
        if execution_time > 1.0:
            self.slow_query_log.append(performance)
        
        return performance
    
    def get_slow_queries(self, limit: int = 10) -> List[QueryPerformance]:
        """Get recent slow queries"""
        return list(self.slow_query_log)[-limit:]
    
    def get_optimization_recommendations(self) -> Dict[str, List[str]]:
        """Get general optimization recommendations"""
        recommendations = {
            "database_design": [
                "Normalize data structure to reduce redundancy",
                "Use appropriate data types for columns",
                "Implement proper foreign key constraints",
                "Consider partitioning for large tables"
            ],
            "indexing_strategy": [
                "Create indexes on frequently queried columns",
                "Use composite indexes for multi-column queries",
                "Remove unused indexes to improve write performance",
                "Consider covering indexes for read-heavy workloads"
            ],
            "query_patterns": [
                "Use prepared statements to reduce parsing overhead",
                "Batch similar operations together",
                "Avoid N+1 query problems",
                "Use EXISTS instead of IN for subqueries"
            ],
            "connection_management": [
                "Implement connection pooling",
                "Configure appropriate pool sizes",
                "Use read replicas for read-only operations",
                "Monitor connection utilization"
            ]
        }
        return recommendations

class CacheManager:
    """Advanced caching system manager"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client
        self.local_cache = {}
        self.cache_stats = defaultdict(lambda: CacheStats(
            cache_name="",
            hit_rate=0.0,
            miss_rate=0.0,
            total_requests=0,
            memory_usage=0,
            evictions=0,
            avg_response_time=0.0
        ))
        self.cache_strategies = {}
    
    async def set_cache_strategy(self, cache_name: str, strategy: CacheStrategy, ttl: int = 300):
        """Set caching strategy for a specific cache"""
        self.cache_strategies[cache_name] = {
            "strategy": strategy,
            "ttl": ttl,
            "created_at": datetime.utcnow()
        }
    
    async def get(self, cache_name: str, key: str) -> Optional[Any]:
        """Get value from cache with performance tracking"""
        start_time = time.time()
        
        try:
            # Try Redis first if available
            if self.redis_client:
                cached_value = await self.redis_client.get(f"{cache_name}:{key}")
                if cached_value:
                    self._update_cache_stats(cache_name, hit=True, response_time=(time.time() - start_time) * 1000)
                    return json.loads(cached_value)
            
            # Fallback to local cache
            cache_key = f"{cache_name}:{key}"
            if cache_key in self.local_cache:
                entry = self.local_cache[cache_key]
                if entry["expires_at"] > datetime.utcnow():
                    self._update_cache_stats(cache_name, hit=True, response_time=(time.time() - start_time) * 1000)
                    return entry["value"]
                else:
                    del self.local_cache[cache_key]
            
            self._update_cache_stats(cache_name, hit=False, response_time=(time.time() - start_time) * 1000)
            return None
            
        except Exception as e:
            logger.error(f"Cache get error for {cache_name}:{key}: {e}")
            self._update_cache_stats(cache_name, hit=False, response_time=(time.time() - start_time) * 1000)
            return None
    
    async def set(self, cache_name: str, key: str, value: Any, ttl: Optional[int] = None):
        """Set value in cache with performance tracking"""
        try:
            strategy_config = self.cache_strategies.get(cache_name, {"ttl": 300})
            ttl = ttl or strategy_config["ttl"]
            
            # Store in Redis if available
            if self.redis_client:
                await self.redis_client.setex(
                    f"{cache_name}:{key}",
                    ttl,
                    json.dumps(value, default=str)
                )
            
            # Also store in local cache as backup
            self.local_cache[f"{cache_name}:{key}"] = {
                "value": value,
                "expires_at": datetime.utcnow() + timedelta(seconds=ttl)
            }
            
            # Limit local cache size
            if len(self.local_cache) > 10000:
                # Remove oldest entries
                oldest_keys = sorted(
                    self.local_cache.keys(),
                    key=lambda k: self.local_cache[k]["expires_at"]
                )[:1000]
                for k in oldest_keys:
                    del self.local_cache[k]
            
        except Exception as e:
            logger.error(f"Cache set error for {cache_name}:{key}: {e}")
    
    async def delete(self, cache_name: str, key: str):
        """Delete value from cache"""
        try:
            if self.redis_client:
                await self.redis_client.delete(f"{cache_name}:{key}")
            
            cache_key = f"{cache_name}:{key}"
            if cache_key in self.local_cache:
                del self.local_cache[cache_key]
                
        except Exception as e:
            logger.error(f"Cache delete error for {cache_name}:{key}: {e}")
    
    async def clear_cache(self, cache_name: str):
        """Clear entire cache"""
        try:
            if self.redis_client:
                # Get all keys for this cache
                keys = await self.redis_client.keys(f"{cache_name}:*")
                if keys:
                    await self.redis_client.delete(*keys)
            
            # Clear local cache
            keys_to_remove = [k for k in self.local_cache.keys() if k.startswith(f"{cache_name}:")]
            for k in keys_to_remove:
                del self.local_cache[k]
                
        except Exception as e:
            logger.error(f"Cache clear error for {cache_name}: {e}")
    
    def _update_cache_stats(self, cache_name: str, hit: bool, response_time: float):
        """Update cache performance statistics"""
        stats = self.cache_stats[cache_name]
        stats.cache_name = cache_name
        stats.total_requests += 1
        
        if hit:
            # Update hit rate
            hit_count = stats.hit_rate * (stats.total_requests - 1) + 1
            stats.hit_rate = hit_count / stats.total_requests
        
        stats.miss_rate = 1.0 - stats.hit_rate
        
        # Update average response time
        total_time = stats.avg_response_time * (stats.total_requests - 1) + response_time
        stats.avg_response_time = total_time / stats.total_requests
    
    def get_cache_stats(self) -> Dict[str, CacheStats]:
        """Get cache performance statistics"""
        return dict(self.cache_stats)

class ConnectionPoolOptimizer:
    """Database connection pool optimization"""
    
    def __init__(self):
        self.pool_monitors = {}
        self.optimization_history = deque(maxlen=1000)
    
    async def analyze_pool_performance(self, pool_name: str, pool_stats: Dict[str, Any]) -> ConnectionPoolStats:
        """Analyze connection pool performance"""
        pool_size = pool_stats.get("pool_size", 0)
        checked_out = pool_stats.get("checked_out", 0)
        checked_in = pool_stats.get("checked_in", 0)
        overflow = pool_stats.get("overflow", 0)
        invalidated = pool_stats.get("invalidated", 0)
        
        utilization_rate = (checked_out / max(pool_size, 1)) * 100
        
        stats = ConnectionPoolStats(
            pool_name=pool_name,
            pool_size=pool_size,
            checked_out=checked_out,
            checked_in=checked_in,
            overflow=overflow,
            invalidated=invalidated,
            utilization_rate=utilization_rate
        )
        
        return stats
    
    def get_pool_optimization_recommendations(self, stats: ConnectionPoolStats) -> List[str]:
        """Get connection pool optimization recommendations"""
        recommendations = []
        
        # High utilization
        if stats.utilization_rate > 80:
            recommendations.append("Consider increasing pool size - high utilization detected")
            recommendations.append("Monitor for connection bottlenecks")
        
        # Overflow usage
        if stats.overflow > 0:
            recommendations.append("Overflow connections being used - consider increasing pool size")
        
        # High invalidation rate
        if stats.invalidated > stats.pool_size * 0.1:  # More than 10% invalidated
            recommendations.append("High connection invalidation rate - check network stability")
            recommendations.append("Consider reducing connection timeout settings")
        
        # Low utilization
        if stats.utilization_rate < 20:
            recommendations.append("Low pool utilization - consider reducing pool size")
        
        return recommendations

class PerformanceOptimizationService:
    """
    Comprehensive performance optimization service for Spirit Tours system
    """
    
    def __init__(self, db_session: AsyncSession, redis_client: Optional[redis.Redis] = None):
        self.db_session = db_session
        self.redis_client = redis_client
        
        # Initialize components
        self.query_optimizer = QueryOptimizer()
        self.cache_manager = CacheManager(redis_client)
        self.pool_optimizer = ConnectionPoolOptimizer()
        
        # Performance monitoring
        self.metrics_history = deque(maxlen=1000)
        self.optimization_tasks = []
        self.monitoring_active = False
        
        # Optimization configurations
        self._initialize_optimization_configs()
    
    def _initialize_optimization_configs(self):
        """Initialize optimization configurations"""
        # Cache strategies for different data types
        asyncio.create_task(self.cache_manager.set_cache_strategy("user_sessions", CacheStrategy.WRITE_THROUGH, 1800))
        asyncio.create_task(self.cache_manager.set_cache_strategy("api_responses", CacheStrategy.READ_THROUGH, 300))
        asyncio.create_task(self.cache_manager.set_cache_strategy("call_reports", CacheStrategy.WRITE_BACK, 600))
        asyncio.create_task(self.cache_manager.set_cache_strategy("scheduling_data", CacheStrategy.WRITE_THROUGH, 900))
    
    async def start_optimization_monitoring(self):
        """Start performance optimization monitoring"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        
        # Start optimization tasks
        self.optimization_tasks.extend([
            asyncio.create_task(self._monitor_query_performance()),
            asyncio.create_task(self._optimize_cache_performance()),
            asyncio.create_task(self._monitor_system_resources()),
            asyncio.create_task(self._cleanup_expired_data())
        ])
        
        logger.info("Performance optimization monitoring started")
    
    async def stop_optimization_monitoring(self):
        """Stop performance optimization monitoring"""
        self.monitoring_active = False
        
        for task in self.optimization_tasks:
            task.cancel()
        
        await asyncio.gather(*self.optimization_tasks, return_exceptions=True)
        self.optimization_tasks.clear()
        
        logger.info("Performance optimization monitoring stopped")
    
    async def _monitor_query_performance(self):
        """Monitor database query performance"""
        while self.monitoring_active:
            try:
                # This would typically hook into SQLAlchemy events
                # For now, simulate monitoring
                await asyncio.sleep(60)  # Check every minute
                
                # Get slow queries from the optimizer
                slow_queries = self.query_optimizer.get_slow_queries()
                
                if slow_queries:
                    logger.info(f"Found {len(slow_queries)} slow queries in the last period")
                    
                    # Store slow query information for analysis
                    if self.redis_client:
                        await self.redis_client.setex(
                            "performance:slow_queries",
                            3600,
                            json.dumps([
                                {
                                    "query_id": q.query_id,
                                    "execution_time": q.execution_time,
                                    "suggestions": q.optimization_suggestions
                                }
                                for q in slow_queries
                            ], default=str)
                        )
                
            except Exception as e:
                logger.error(f"Error in query performance monitoring: {e}")
                await asyncio.sleep(60)
    
    async def _optimize_cache_performance(self):
        """Optimize cache performance"""
        while self.monitoring_active:
            try:
                # Analyze cache performance
                cache_stats = self.cache_manager.get_cache_stats()
                
                for cache_name, stats in cache_stats.items():
                    # Optimize based on hit rates
                    if stats.hit_rate < 0.7:  # Less than 70% hit rate
                        logger.info(f"Low hit rate for cache '{cache_name}': {stats.hit_rate:.2%}")
                        
                        # Suggest increasing TTL for low hit rate caches
                        current_strategy = self.cache_manager.cache_strategies.get(cache_name, {})
                        if current_strategy.get("ttl", 300) < 600:
                            await self.cache_manager.set_cache_strategy(
                                cache_name, 
                                current_strategy.get("strategy", CacheStrategy.READ_THROUGH),
                                min(current_strategy.get("ttl", 300) * 1.5, 1800)
                            )
                
                await asyncio.sleep(300)  # Optimize every 5 minutes
                
            except Exception as e:
                logger.error(f"Error in cache optimization: {e}")
                await asyncio.sleep(300)
    
    async def _monitor_system_resources(self):
        """Monitor system resource usage"""
        while self.monitoring_active:
            try:
                # Collect system metrics
                cpu_usage = psutil.cpu_percent(interval=1)
                memory = psutil.virtual_memory()
                disk = psutil.disk_usage('/')
                network = psutil.net_io_counters()
                
                metrics = PerformanceMetrics(
                    cpu_usage=cpu_usage,
                    memory_usage=memory.percent,
                    disk_io={
                        "read_bytes": disk.used,
                        "write_bytes": disk.free
                    },
                    network_io={
                        "bytes_sent": network.bytes_sent,
                        "bytes_recv": network.bytes_recv
                    },
                    database_performance={
                        "active_connections": 10,  # Would get from actual pool
                        "query_count": 100
                    },
                    cache_performance=self.cache_manager.get_cache_stats(),
                    response_times={
                        "api_avg": 150.0,
                        "db_avg": 50.0,
                        "cache_avg": 5.0
                    }
                )
                
                self.metrics_history.append(metrics)
                
                # Store in Redis for dashboard
                if self.redis_client:
                    await self.redis_client.setex(
                        "performance:current_metrics",
                        300,
                        json.dumps({
                            "cpu_usage": cpu_usage,
                            "memory_usage": memory.percent,
                            "disk_usage": (disk.used / disk.total) * 100,
                            "timestamp": datetime.utcnow().isoformat()
                        }, default=str)
                    )
                
                await asyncio.sleep(30)  # Collect every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in system resource monitoring: {e}")
                await asyncio.sleep(60)
    
    async def _cleanup_expired_data(self):
        """Cleanup expired data and optimize storage"""
        while self.monitoring_active:
            try:
                # Clean up local caches
                current_time = datetime.utcnow()
                expired_keys = [
                    k for k, v in self.cache_manager.local_cache.items()
                    if v["expires_at"] < current_time
                ]
                
                for key in expired_keys:
                    del self.cache_manager.local_cache[key]
                
                if expired_keys:
                    logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")
                
                # Cleanup old performance metrics
                if len(self.metrics_history) > 500:
                    # Keep only recent metrics
                    for _ in range(100):
                        self.metrics_history.popleft()
                
                await asyncio.sleep(3600)  # Cleanup every hour
                
            except Exception as e:
                logger.error(f"Error in data cleanup: {e}")
                await asyncio.sleep(3600)
    
    # Public API methods
    
    async def get_performance_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive performance dashboard"""
        current_metrics = list(self.metrics_history)[-1] if self.metrics_history else None
        cache_stats = self.cache_manager.get_cache_stats()
        slow_queries = self.query_optimizer.get_slow_queries(5)
        
        return {
            "current_metrics": {
                "cpu_usage": current_metrics.cpu_usage if current_metrics else 0,
                "memory_usage": current_metrics.memory_usage if current_metrics else 0,
                "cache_performance": cache_stats,
                "response_times": current_metrics.response_times if current_metrics else {}
            },
            "optimization_recommendations": self.get_optimization_recommendations(),
            "slow_queries": [
                {
                    "query_id": q.query_id,
                    "execution_time": q.execution_time,
                    "suggestions": q.optimization_suggestions
                }
                for q in slow_queries
            ],
            "cache_recommendations": self._get_cache_recommendations(cache_stats),
            "last_updated": datetime.utcnow().isoformat()
        }
    
    def get_optimization_recommendations(self) -> Dict[str, List[str]]:
        """Get comprehensive optimization recommendations"""
        recommendations = self.query_optimizer.get_optimization_recommendations()
        
        # Add system-level recommendations
        if self.metrics_history:
            recent_metrics = list(self.metrics_history)[-10:]  # Last 10 metrics
            avg_cpu = sum(m.cpu_usage for m in recent_metrics) / len(recent_metrics)
            avg_memory = sum(m.memory_usage for m in recent_metrics) / len(recent_metrics)
            
            if avg_cpu > 80:
                recommendations["system_optimization"] = [
                    "High CPU usage detected - consider scaling horizontally",
                    "Optimize CPU-intensive operations",
                    "Consider using async processing for heavy tasks"
                ]
            
            if avg_memory > 80:
                recommendations["memory_optimization"] = [
                    "High memory usage detected - check for memory leaks",
                    "Optimize data structures and algorithms",
                    "Consider increasing available memory"
                ]
        
        return recommendations
    
    def _get_cache_recommendations(self, cache_stats: Dict[str, CacheStats]) -> Dict[str, List[str]]:
        """Get cache-specific optimization recommendations"""
        recommendations = {}
        
        for cache_name, stats in cache_stats.items():
            cache_recommendations = []
            
            if stats.hit_rate < 0.5:  # Less than 50% hit rate
                cache_recommendations.append("Consider increasing cache TTL")
                cache_recommendations.append("Review cache key strategy")
            
            if stats.avg_response_time > 100:  # More than 100ms
                cache_recommendations.append("Cache response time is high - check Redis performance")
                cache_recommendations.append("Consider using local caching for frequently accessed data")
            
            if cache_recommendations:
                recommendations[cache_name] = cache_recommendations
        
        return recommendations
    
    async def optimize_query(self, query: str) -> Dict[str, Any]:
        """Analyze and optimize a specific query"""
        start_time = time.time()
        
        try:
            # Execute query with performance tracking
            result = await self.db_session.execute(text(query))
            rows = result.fetchall()
            
            execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            rows_returned = len(rows)
            rows_examined = rows_returned  # Simplified - would need actual explain plan
            
            # Analyze performance
            performance = await self.query_optimizer.analyze_query_performance(
                query, execution_time, rows_returned, rows_examined
            )
            
            return {
                "performance_metrics": {
                    "execution_time_ms": execution_time,
                    "rows_returned": rows_returned,
                    "rows_examined": rows_examined,
                    "efficiency_ratio": rows_returned / max(rows_examined, 1)
                },
                "optimization_suggestions": performance.optimization_suggestions,
                "query_classification": self._classify_query_performance(execution_time),
                "recommended_indexes": self._suggest_indexes(query)
            }
            
        except Exception as e:
            logger.error(f"Error optimizing query: {e}")
            return {
                "error": str(e),
                "optimization_suggestions": ["Query execution failed - check syntax and permissions"]
            }
    
    def _classify_query_performance(self, execution_time: float) -> str:
        """Classify query performance level"""
        if execution_time < 100:  # Less than 100ms
            return "excellent"
        elif execution_time < 500:  # Less than 500ms
            return "good"
        elif execution_time < 1000:  # Less than 1s
            return "acceptable"
        else:
            return "needs_optimization"
    
    def _suggest_indexes(self, query: str) -> List[str]:
        """Suggest indexes based on query pattern"""
        suggestions = []
        query_upper = query.upper()
        
        # Simple heuristics for index suggestions
        if "WHERE" in query_upper:
            suggestions.append("Consider adding indexes on WHERE clause columns")
        
        if "ORDER BY" in query_upper:
            suggestions.append("Consider adding indexes on ORDER BY columns")
        
        if "GROUP BY" in query_upper:
            suggestions.append("Consider adding indexes on GROUP BY columns")
        
        if "JOIN" in query_upper:
            suggestions.append("Ensure JOIN columns are indexed")
        
        return suggestions

# Global performance optimization service instance
performance_service = None

async def get_performance_service() -> PerformanceOptimizationService:
    """Get the global performance optimization service instance"""
    global performance_service
    if performance_service is None:
        raise RuntimeError("Performance optimization service not initialized")
    return performance_service

async def initialize_performance_service(db_session: AsyncSession, redis_client: Optional[redis.Redis] = None):
    """Initialize the global performance optimization service"""
    global performance_service
    performance_service = PerformanceOptimizationService(db_session, redis_client)
    await performance_service.start_optimization_monitoring()
    logger.info("Performance optimization service initialized and started")

async def shutdown_performance_service():
    """Shutdown the global performance optimization service"""
    global performance_service
    if performance_service:
        await performance_service.stop_optimization_monitoring()
        performance_service = None
        logger.info("Performance optimization service shutdown completed")