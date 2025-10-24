"""
Redis Cache Fine-Tuning and Optimization
=========================================
Sistema avanzado de optimización de caché con Redis para máximo rendimiento.

Features:
- Multi-tier caching strategy
- Intelligent cache warming
- Auto-eviction policies
- Memory optimization
- Cache analytics
- Distributed caching
- Cache invalidation patterns
- Performance monitoring
"""

import asyncio
import json
import hashlib
import pickle
import zlib
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
import logging

import redis.asyncio as redis
from redis.asyncio.sentinel import Sentinel
from redis.asyncio.cluster import RedisCluster
from redis.asyncio.lock import Lock
import msgpack
import numpy as np
from bloom_filter2 import BloomFilter

logger = logging.getLogger(__name__)

# ================== Configuration ==================

@dataclass
class CacheConfig:
    """Cache configuration with optimal settings"""
    # Connection
    host: str = "localhost"
    port: int = 6379
    password: Optional[str] = None
    db: int = 0
    
    # Cluster configuration
    cluster_enabled: bool = False
    cluster_nodes: List[Dict[str, Any]] = field(default_factory=list)
    
    # Sentinel configuration
    sentinel_enabled: bool = False
    sentinels: List[tuple] = field(default_factory=list)
    sentinel_service_name: str = "mymaster"
    
    # Performance
    max_connections: int = 100
    connection_pool_class: str = "BlockingConnectionPool"
    socket_connect_timeout: float = 5.0
    socket_timeout: float = 5.0
    socket_keepalive: bool = True
    socket_keepalive_options: Dict = field(default_factory=dict)
    
    # Memory management
    max_memory: str = "4gb"
    max_memory_policy: str = "allkeys-lru"  # LRU eviction
    
    # TTL strategies (in seconds)
    ttl_default: int = 3600  # 1 hour
    ttl_short: int = 300     # 5 minutes
    ttl_medium: int = 3600   # 1 hour
    ttl_long: int = 86400    # 24 hours
    ttl_permanent: int = 0   # No expiration
    
    # Compression
    compression_enabled: bool = True
    compression_threshold: int = 1024  # Compress if > 1KB
    compression_level: int = 6
    
    # Serialization
    serialization: str = "msgpack"  # msgpack, pickle, json
    
    # Cache warming
    warm_cache_on_startup: bool = True
    warm_cache_patterns: List[str] = field(default_factory=list)
    
    # Monitoring
    enable_monitoring: bool = True
    metrics_interval: int = 60  # seconds

class CacheLevel(Enum):
    """Cache levels for multi-tier caching"""
    L1_MEMORY = "l1_memory"     # In-process memory cache
    L2_REDIS_LOCAL = "l2_local"  # Local Redis instance
    L3_REDIS_CLUSTER = "l3_cluster"  # Redis cluster
    L4_PERSISTENT = "l4_persistent"  # Persistent storage

class EvictionPolicy(Enum):
    """Cache eviction policies"""
    LRU = "allkeys-lru"          # Least Recently Used
    LFU = "allkeys-lfu"          # Least Frequently Used
    RANDOM = "allkeys-random"    # Random eviction
    TTL = "volatile-ttl"         # Evict by TTL
    NOEVICTION = "noeviction"    # No eviction (errors on memory limit)

# ================== Advanced Redis Cache Manager ==================

class AdvancedRedisCacheManager:
    """Advanced Redis cache manager with optimization features"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.redis_client: Optional[redis.Redis] = None
        self.cluster_client: Optional[RedisCluster] = None
        self.sentinel_client: Optional[Sentinel] = None
        
        # Multi-tier cache
        self.l1_cache: Dict[str, Any] = {}  # In-memory cache
        self.l1_metadata: Dict[str, Dict] = {}  # L1 cache metadata
        
        # Bloom filter for existence checking
        self.bloom_filter = BloomFilter(
            max_elements=1000000,
            error_rate=0.001
        )
        
        # Cache statistics
        self.stats = CacheStatistics()
        
        # Serializers
        self.serializers = {
            'msgpack': MsgPackSerializer(),
            'pickle': PickleSerializer(),
            'json': JsonSerializer()
        }
        self.serializer = self.serializers[config.serialization]
        
        # Cache patterns
        self.cache_patterns = CachePatterns(self)
        
        # Background tasks
        self.background_tasks = set()
    
    async def initialize(self):
        """Initialize Redis connections"""
        try:
            if self.config.cluster_enabled:
                await self._init_cluster()
            elif self.config.sentinel_enabled:
                await self._init_sentinel()
            else:
                await self._init_standalone()
            
            # Configure Redis settings
            await self._configure_redis()
            
            # Warm cache if enabled
            if self.config.warm_cache_on_startup:
                asyncio.create_task(self._warm_cache())
            
            # Start monitoring
            if self.config.enable_monitoring:
                asyncio.create_task(self._monitor_performance())
            
            logger.info("Redis cache manager initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis cache: {e}")
            raise
    
    async def _init_standalone(self):
        """Initialize standalone Redis connection"""
        pool = redis.ConnectionPool(
            host=self.config.host,
            port=self.config.port,
            password=self.config.password,
            db=self.config.db,
            max_connections=self.config.max_connections,
            socket_connect_timeout=self.config.socket_connect_timeout,
            socket_timeout=self.config.socket_timeout,
            socket_keepalive=self.config.socket_keepalive,
            socket_keepalive_options=self.config.socket_keepalive_options,
            decode_responses=False  # We handle encoding/decoding
        )
        
        self.redis_client = redis.Redis(connection_pool=pool)
        await self.redis_client.ping()
    
    async def _init_cluster(self):
        """Initialize Redis cluster connection"""
        self.cluster_client = RedisCluster(
            startup_nodes=self.config.cluster_nodes,
            password=self.config.password,
            skip_full_coverage_check=True,
            max_connections=self.config.max_connections,
            decode_responses=False
        )
        await self.cluster_client.ping()
        self.redis_client = self.cluster_client
    
    async def _init_sentinel(self):
        """Initialize Redis Sentinel connection"""
        self.sentinel_client = Sentinel(
            self.config.sentinels,
            socket_timeout=self.config.socket_timeout,
            password=self.config.password
        )
        
        # Get master connection
        self.redis_client = self.sentinel_client.master_for(
            self.config.sentinel_service_name,
            socket_timeout=self.config.socket_timeout,
            password=self.config.password,
            db=self.config.db
        )
        await self.redis_client.ping()
    
    async def _configure_redis(self):
        """Configure Redis settings for optimization"""
        try:
            # Set memory policy
            await self.redis_client.config_set(
                'maxmemory-policy', 
                self.config.max_memory_policy
            )
            
            # Set max memory
            if self.config.max_memory:
                await self.redis_client.config_set(
                    'maxmemory', 
                    self.config.max_memory
                )
            
            # Enable keyspace notifications
            await self.redis_client.config_set(
                'notify-keyspace-events', 
                'Ex'  # Expired events
            )
            
            # Optimize for performance
            await self.redis_client.config_set('tcp-keepalive', '60')
            await self.redis_client.config_set('timeout', '300')
            await self.redis_client.config_set('tcp-backlog', '511')
            
            # Persistence optimization
            await self.redis_client.config_set('save', '')  # Disable RDB
            await self.redis_client.config_set('appendonly', 'no')  # Disable AOF for cache
            
        except Exception as e:
            logger.warning(f"Could not configure all Redis settings: {e}")
    
    # ================== Core Cache Operations ==================
    
    async def get(
        self, 
        key: str, 
        default: Any = None,
        deserialize: bool = True,
        track_stats: bool = True
    ) -> Any:
        """Get value from cache with multi-tier lookup"""
        start_time = time.time()
        
        # Normalize key
        key = self._normalize_key(key)
        
        # L1 cache check (in-memory)
        if key in self.l1_cache:
            if track_stats:
                self.stats.record_hit('l1')
            return self.l1_cache[key]
        
        # Check bloom filter for existence
        if key not in self.bloom_filter:
            if track_stats:
                self.stats.record_miss('bloom')
            return default
        
        # L2 Redis check
        try:
            value = await self.redis_client.get(key)
            
            if value is None:
                if track_stats:
                    self.stats.record_miss('l2')
                return default
            
            # Deserialize if needed
            if deserialize:
                value = self._deserialize(value)
            
            # Update L1 cache
            self._update_l1_cache(key, value)
            
            if track_stats:
                self.stats.record_hit('l2')
                self.stats.record_latency('get', time.time() - start_time)
            
            return value
            
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            if track_stats:
                self.stats.record_error('get')
            return default
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        serialize: bool = True,
        track_stats: bool = True
    ) -> bool:
        """Set value in cache with optimizations"""
        start_time = time.time()
        
        # Normalize key
        key = self._normalize_key(key)
        
        # Use default TTL if not specified
        if ttl is None:
            ttl = self.config.ttl_default
        
        try:
            # Serialize value
            if serialize:
                value = self._serialize(value)
            
            # Set in Redis
            if ttl > 0:
                result = await self.redis_client.setex(key, ttl, value)
            else:
                result = await self.redis_client.set(key, value)
            
            # Update bloom filter
            self.bloom_filter.add(key)
            
            # Update L1 cache
            if serialize:
                # Store deserialized version in L1
                self._update_l1_cache(key, self._deserialize(value))
            else:
                self._update_l1_cache(key, value)
            
            if track_stats:
                self.stats.record_set()
                self.stats.record_latency('set', time.time() - start_time)
            
            return result
            
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            if track_stats:
                self.stats.record_error('set')
            return False
    
    async def delete(self, *keys: str, track_stats: bool = True) -> int:
        """Delete keys from cache"""
        if not keys:
            return 0
        
        # Normalize keys
        keys = [self._normalize_key(k) for k in keys]
        
        try:
            # Delete from Redis
            deleted = await self.redis_client.delete(*keys)
            
            # Remove from L1 cache and bloom filter
            for key in keys:
                self.l1_cache.pop(key, None)
                self.l1_metadata.pop(key, None)
                # Note: Can't remove from bloom filter
            
            if track_stats:
                self.stats.record_delete(deleted)
            
            return deleted
            
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            if track_stats:
                self.stats.record_error('delete')
            return 0
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        key = self._normalize_key(key)
        
        # Check L1 first
        if key in self.l1_cache:
            return True
        
        # Check bloom filter
        if key not in self.bloom_filter:
            return False
        
        # Check Redis
        return await self.redis_client.exists(key) > 0
    
    # ================== Advanced Operations ==================
    
    async def get_many(self, keys: List[str]) -> Dict[str, Any]:
        """Get multiple values efficiently"""
        if not keys:
            return {}
        
        keys = [self._normalize_key(k) for k in keys]
        results = {}
        
        # Check L1 cache first
        redis_keys = []
        for key in keys:
            if key in self.l1_cache:
                results[key] = self.l1_cache[key]
                self.stats.record_hit('l1')
            else:
                redis_keys.append(key)
        
        # Get remaining from Redis
        if redis_keys:
            try:
                values = await self.redis_client.mget(redis_keys)
                for key, value in zip(redis_keys, values):
                    if value is not None:
                        deserialized = self._deserialize(value)
                        results[key] = deserialized
                        self._update_l1_cache(key, deserialized)
                        self.stats.record_hit('l2')
                    else:
                        self.stats.record_miss('l2')
            except Exception as e:
                logger.error(f"Multi-get error: {e}")
                self.stats.record_error('mget')
        
        return results
    
    async def set_many(
        self, 
        items: Dict[str, Any], 
        ttl: Optional[int] = None
    ) -> bool:
        """Set multiple values efficiently"""
        if not items:
            return True
        
        if ttl is None:
            ttl = self.config.ttl_default
        
        try:
            pipe = self.redis_client.pipeline()
            
            for key, value in items.items():
                key = self._normalize_key(key)
                serialized = self._serialize(value)
                
                if ttl > 0:
                    pipe.setex(key, ttl, serialized)
                else:
                    pipe.set(key, serialized)
                
                # Update bloom filter and L1
                self.bloom_filter.add(key)
                self._update_l1_cache(key, value)
            
            results = await pipe.execute()
            
            self.stats.record_set(len(items))
            return all(results)
            
        except Exception as e:
            logger.error(f"Multi-set error: {e}")
            self.stats.record_error('mset')
            return False
    
    async def increment(
        self, 
        key: str, 
        amount: int = 1,
        ttl: Optional[int] = None
    ) -> int:
        """Atomic increment operation"""
        key = self._normalize_key(key)
        
        try:
            result = await self.redis_client.incrby(key, amount)
            
            if ttl is not None and ttl > 0:
                await self.redis_client.expire(key, ttl)
            
            # Update L1 cache
            self.l1_cache[key] = result
            
            return result
            
        except Exception as e:
            logger.error(f"Increment error for key {key}: {e}")
            return 0
    
    # ================== Cache Patterns ==================
    
    async def cache_aside(
        self,
        key: str,
        loader: Callable,
        ttl: Optional[int] = None,
        force_refresh: bool = False
    ) -> Any:
        """Cache-aside pattern with automatic loading"""
        if not force_refresh:
            # Try to get from cache
            cached = await self.get(key)
            if cached is not None:
                return cached
        
        # Load from source
        value = await loader()
        
        # Store in cache
        if value is not None:
            await self.set(key, value, ttl)
        
        return value
    
    async def write_through(
        self,
        key: str,
        value: Any,
        writer: Callable,
        ttl: Optional[int] = None
    ) -> bool:
        """Write-through pattern"""
        try:
            # Write to backend first
            await writer(value)
            
            # Then update cache
            return await self.set(key, value, ttl)
            
        except Exception as e:
            logger.error(f"Write-through error: {e}")
            # Invalidate cache on error
            await self.delete(key)
            raise
    
    async def write_behind(
        self,
        key: str,
        value: Any,
        writer: Callable,
        ttl: Optional[int] = None,
        delay: float = 1.0
    ):
        """Write-behind pattern with async write"""
        # Update cache immediately
        await self.set(key, value, ttl)
        
        # Schedule backend write
        async def delayed_write():
            await asyncio.sleep(delay)
            try:
                await writer(value)
            except Exception as e:
                logger.error(f"Write-behind error: {e}")
                # Could implement retry logic here
        
        task = asyncio.create_task(delayed_write())
        self.background_tasks.add(task)
        task.add_done_callback(self.background_tasks.discard)
    
    # ================== Cache Warming ==================
    
    async def _warm_cache(self):
        """Warm cache with frequently accessed data"""
        logger.info("Starting cache warming...")
        
        warm_tasks = []
        
        # Warm based on patterns
        for pattern in self.config.warm_cache_patterns:
            if pattern == 'tours':
                warm_tasks.append(self._warm_tours())
            elif pattern == 'hotels':
                warm_tasks.append(self._warm_hotels())
            elif pattern == 'users':
                warm_tasks.append(self._warm_users())
            elif pattern == 'configs':
                warm_tasks.append(self._warm_configs())
        
        if warm_tasks:
            await asyncio.gather(*warm_tasks, return_exceptions=True)
        
        logger.info("Cache warming completed")
    
    async def _warm_tours(self):
        """Warm tour data cache"""
        # Example: Load popular tours
        try:
            from backend.models import Tour
            from backend.database import get_db
            
            async with get_db() as db:
                # Get top 100 tours
                tours = await db.query(Tour).filter(
                    Tour.is_active == True
                ).order_by(Tour.popularity.desc()).limit(100).all()
                
                for tour in tours:
                    key = f"tour:{tour.id}"
                    await self.set(key, tour.to_dict(), ttl=self.config.ttl_long)
                
                logger.info(f"Warmed {len(tours)} tours in cache")
                
        except Exception as e:
            logger.error(f"Error warming tours cache: {e}")
    
    async def _warm_hotels(self):
        """Warm hotel data cache"""
        # Similar implementation for hotels
        pass
    
    async def _warm_users(self):
        """Warm active user sessions"""
        # Load active user sessions
        pass
    
    async def _warm_configs(self):
        """Warm configuration cache"""
        configs = {
            'app:config': {'version': '2.0', 'features': {}},
            'payment:config': {'providers': ['stripe', 'paypal']},
            'email:config': {'provider': 'sendgrid'}
        }
        
        for key, value in configs.items():
            await self.set(key, value, ttl=self.config.ttl_permanent)
    
    # ================== Cache Invalidation ==================
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern"""
        try:
            # Use SCAN for efficient pattern matching
            cursor = 0
            deleted = 0
            
            while True:
                cursor, keys = await self.redis_client.scan(
                    cursor, 
                    match=pattern,
                    count=100
                )
                
                if keys:
                    deleted += await self.delete(*keys, track_stats=False)
                
                if cursor == 0:
                    break
            
            self.stats.record_delete(deleted)
            return deleted
            
        except Exception as e:
            logger.error(f"Pattern invalidation error: {e}")
            return 0
    
    async def invalidate_tags(self, tags: List[str]) -> int:
        """Invalidate all keys with specific tags"""
        deleted = 0
        
        for tag in tags:
            tag_key = f"tag:{tag}"
            
            # Get all keys with this tag
            keys = await self.redis_client.smembers(tag_key)
            
            if keys:
                deleted += await self.delete(*keys, track_stats=False)
                
                # Delete the tag set itself
                await self.redis_client.delete(tag_key)
        
        self.stats.record_delete(deleted)
        return deleted
    
    async def tag_key(self, key: str, tags: List[str]):
        """Tag a key for group invalidation"""
        key = self._normalize_key(key)
        
        for tag in tags:
            tag_key = f"tag:{tag}"
            await self.redis_client.sadd(tag_key, key)
    
    # ================== Memory Optimization ==================
    
    def _serialize(self, value: Any) -> bytes:
        """Serialize value with compression if needed"""
        # Serialize
        serialized = self.serializer.serialize(value)
        
        # Compress if enabled and above threshold
        if self.config.compression_enabled:
            if len(serialized) > self.config.compression_threshold:
                serialized = zlib.compress(
                    serialized, 
                    level=self.config.compression_level
                )
                # Add compression marker
                serialized = b'Z' + serialized
        
        return serialized
    
    def _deserialize(self, value: bytes) -> Any:
        """Deserialize value with decompression if needed"""
        if not value:
            return None
        
        # Check for compression marker
        if value.startswith(b'Z'):
            value = zlib.decompress(value[1:])
        
        return self.serializer.deserialize(value)
    
    def _normalize_key(self, key: str) -> str:
        """Normalize cache key"""
        # Add prefix to avoid collisions
        return f"spirit:{key}"
    
    def _update_l1_cache(self, key: str, value: Any):
        """Update L1 in-memory cache with LRU eviction"""
        # Simple size-based eviction
        max_l1_size = 1000
        
        if len(self.l1_cache) >= max_l1_size and key not in self.l1_cache:
            # Evict oldest entry (simple FIFO for now)
            oldest_key = next(iter(self.l1_cache))
            del self.l1_cache[oldest_key]
            del self.l1_metadata[oldest_key]
        
        self.l1_cache[key] = value
        self.l1_metadata[key] = {
            'timestamp': time.time(),
            'hits': 0
        }
    
    # ================== Monitoring ==================
    
    async def _monitor_performance(self):
        """Monitor cache performance metrics"""
        while True:
            try:
                await asyncio.sleep(self.config.metrics_interval)
                
                # Get Redis info
                info = await self.redis_client.info('stats', 'memory')
                
                # Extract key metrics
                metrics = {
                    'used_memory': info.get('used_memory', 0),
                    'used_memory_human': info.get('used_memory_human', 'N/A'),
                    'connected_clients': info.get('connected_clients', 0),
                    'total_connections_received': info.get('total_connections_received', 0),
                    'total_commands_processed': info.get('total_commands_processed', 0),
                    'keyspace_hits': info.get('keyspace_hits', 0),
                    'keyspace_misses': info.get('keyspace_misses', 0),
                    'evicted_keys': info.get('evicted_keys', 0),
                    'expired_keys': info.get('expired_keys', 0)
                }
                
                # Calculate hit ratio
                hits = metrics['keyspace_hits']
                misses = metrics['keyspace_misses']
                if hits + misses > 0:
                    metrics['hit_ratio'] = hits / (hits + misses) * 100
                else:
                    metrics['hit_ratio'] = 0
                
                # Log metrics
                logger.info(f"Cache metrics: {metrics}")
                
                # Send to monitoring system
                await self._send_metrics_to_monitoring(metrics)
                
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
    
    async def _send_metrics_to_monitoring(self, metrics: Dict[str, Any]):
        """Send metrics to monitoring system (Prometheus, DataDog, etc.)"""
        # Implementation depends on monitoring system
        pass
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        redis_info = await self.redis_client.info()
        
        return {
            'cache_stats': self.stats.get_stats(),
            'redis_info': redis_info,
            'l1_cache_size': len(self.l1_cache),
            'bloom_filter_size': len(self.bloom_filter)
        }
    
    async def cleanup(self):
        """Cleanup connections and resources"""
        # Cancel background tasks
        for task in self.background_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.background_tasks:
            await asyncio.gather(*self.background_tasks, return_exceptions=True)
        
        # Close Redis connections
        if self.redis_client:
            await self.redis_client.close()
        
        logger.info("Cache manager cleaned up")

# ================== Serializers ==================

class MsgPackSerializer:
    """MessagePack serializer for efficient binary serialization"""
    
    def serialize(self, value: Any) -> bytes:
        return msgpack.packb(value, use_bin_type=True)
    
    def deserialize(self, data: bytes) -> Any:
        return msgpack.unpackb(data, raw=False)

class PickleSerializer:
    """Pickle serializer for Python objects"""
    
    def serialize(self, value: Any) -> bytes:
        return pickle.dumps(value, protocol=pickle.HIGHEST_PROTOCOL)
    
    def deserialize(self, data: bytes) -> Any:
        return pickle.loads(data)

class JsonSerializer:
    """JSON serializer for compatibility"""
    
    def serialize(self, value: Any) -> bytes:
        return json.dumps(value, default=str).encode('utf-8')
    
    def deserialize(self, data: bytes) -> Any:
        return json.loads(data.decode('utf-8'))

# ================== Cache Statistics ==================

class CacheStatistics:
    """Track cache performance statistics"""
    
    def __init__(self):
        self.hits = {'l1': 0, 'l2': 0}
        self.misses = {'bloom': 0, 'l1': 0, 'l2': 0}
        self.sets = 0
        self.deletes = 0
        self.errors = {'get': 0, 'set': 0, 'delete': 0}
        self.latencies = {'get': [], 'set': []}
        self.start_time = time.time()
    
    def record_hit(self, level: str):
        self.hits[level] = self.hits.get(level, 0) + 1
    
    def record_miss(self, level: str):
        self.misses[level] = self.misses.get(level, 0) + 1
    
    def record_set(self, count: int = 1):
        self.sets += count
    
    def record_delete(self, count: int = 1):
        self.deletes += count
    
    def record_error(self, operation: str):
        self.errors[operation] = self.errors.get(operation, 0) + 1
    
    def record_latency(self, operation: str, latency: float):
        if operation in self.latencies:
            self.latencies[operation].append(latency)
            # Keep only last 1000 samples
            if len(self.latencies[operation]) > 1000:
                self.latencies[operation] = self.latencies[operation][-1000:]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get current statistics"""
        total_hits = sum(self.hits.values())
        total_misses = sum(self.misses.values())
        
        hit_rate = 0
        if total_hits + total_misses > 0:
            hit_rate = total_hits / (total_hits + total_misses) * 100
        
        # Calculate average latencies
        avg_latencies = {}
        for op, latencies in self.latencies.items():
            if latencies:
                avg_latencies[op] = {
                    'avg': np.mean(latencies),
                    'p50': np.percentile(latencies, 50),
                    'p95': np.percentile(latencies, 95),
                    'p99': np.percentile(latencies, 99)
                }
        
        return {
            'uptime': time.time() - self.start_time,
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': hit_rate,
            'sets': self.sets,
            'deletes': self.deletes,
            'errors': self.errors,
            'latencies': avg_latencies
        }

# ================== Cache Patterns ==================

class CachePatterns:
    """Common cache patterns implementation"""
    
    def __init__(self, cache_manager: AdvancedRedisCacheManager):
        self.cache = cache_manager
    
    async def lazy_loading(
        self,
        key: str,
        loader: Callable,
        ttl: Optional[int] = None
    ) -> Any:
        """Lazy loading pattern"""
        return await self.cache.cache_aside(key, loader, ttl)
    
    async def refresh_ahead(
        self,
        key: str,
        loader: Callable,
        ttl: int,
        refresh_threshold: float = 0.8
    ) -> Any:
        """Refresh-ahead pattern for hot data"""
        # Get value and TTL
        value = await self.cache.get(key)
        
        if value is not None:
            # Check remaining TTL
            remaining_ttl = await self.cache.redis_client.ttl(key)
            
            # Refresh if close to expiration
            if remaining_ttl < ttl * (1 - refresh_threshold):
                # Async refresh in background
                async def refresh():
                    new_value = await loader()
                    await self.cache.set(key, new_value, ttl)
                
                task = asyncio.create_task(refresh())
                self.cache.background_tasks.add(task)
                task.add_done_callback(self.cache.background_tasks.discard)
            
            return value
        
        # Load and cache if not found
        value = await loader()
        await self.cache.set(key, value, ttl)
        return value

# ================== Usage Example ==================

async def example_usage():
    """Example usage of advanced cache manager"""
    
    # Configure cache
    config = CacheConfig(
        host='localhost',
        port=6379,
        max_memory='2gb',
        max_memory_policy='allkeys-lru',
        compression_enabled=True,
        warm_cache_on_startup=True,
        warm_cache_patterns=['tours', 'hotels', 'configs']
    )
    
    # Initialize cache manager
    cache = AdvancedRedisCacheManager(config)
    await cache.initialize()
    
    # Basic operations
    await cache.set('user:123', {'name': 'John', 'email': 'john@example.com'})
    user = await cache.get('user:123')
    
    # Bulk operations
    items = {
        'tour:1': {'name': 'Paris Tour', 'price': 999},
        'tour:2': {'name': 'Rome Tour', 'price': 899}
    }
    await cache.set_many(items, ttl=3600)
    
    # Cache patterns
    async def load_tour():
        # Simulate database query
        await asyncio.sleep(0.1)
        return {'name': 'Barcelona Tour', 'price': 799}
    
    # Cache-aside pattern
    tour = await cache.cache_aside('tour:3', load_tour, ttl=3600)
    
    # Invalidation
    await cache.invalidate_pattern('tour:*')
    
    # Get statistics
    stats = await cache.get_stats()
    print(f"Cache statistics: {stats}")
    
    # Cleanup
    await cache.cleanup()

if __name__ == "__main__":
    asyncio.run(example_usage())