#!/usr/bin/env python3
"""
Redis Cache Service - Spirit Tours
Servicio de caché distribuido para optimización de rendimiento
"""

import asyncio
import json
import logging
import pickle
from typing import Dict, List, Optional, Any, Union, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from enum import Enum
import hashlib
import redis.asyncio as redis
from redis.asyncio import Redis, ConnectionPool
from redis.exceptions import RedisError, ConnectionError as RedisConnectionError
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== CONFIGURATION ==============

class CacheConfig:
    """Redis cache configuration"""
    # Redis connection settings
    REDIS_HOST = "localhost"
    REDIS_PORT = 6379
    REDIS_DB = 0
    REDIS_PASSWORD = None
    REDIS_SSL = False
    
    # Connection pool settings
    MAX_CONNECTIONS = 50
    CONNECTION_TIMEOUT = 20
    SOCKET_TIMEOUT = 5
    SOCKET_KEEPALIVE = True
    SOCKET_KEEPALIVE_OPTIONS = {
        1: 1,  # TCP_KEEPIDLE
        2: 3,  # TCP_KEEPINTVL
        3: 5   # TCP_KEEPCNT
    }
    
    # Cache settings
    DEFAULT_TTL = 3600  # 1 hour
    MAX_TTL = 86400  # 24 hours
    MIN_TTL = 60  # 1 minute
    
    # Key prefixes
    PREFIX_API = "api:"
    PREFIX_SESSION = "session:"
    PREFIX_USER = "user:"
    PREFIX_BOOKING = "booking:"
    PREFIX_AI = "ai:"
    PREFIX_METRIC = "metric:"
    PREFIX_REPORT = "report:"
    PREFIX_TEMP = "temp:"

# ============== ENUMS & DATA CLASSES ==============

class CacheStrategy(Enum):
    """Cache strategies"""
    CACHE_ASIDE = "cache_aside"  # Read from cache, if miss read from DB and update cache
    WRITE_THROUGH = "write_through"  # Write to cache and DB simultaneously
    WRITE_BEHIND = "write_behind"  # Write to cache first, then DB asynchronously
    REFRESH_AHEAD = "refresh_ahead"  # Refresh cache before expiration

class CacheKeyType(Enum):
    """Types of cache keys"""
    STRING = "string"
    HASH = "hash"
    LIST = "list"
    SET = "set"
    SORTED_SET = "zset"
    STREAM = "stream"

@dataclass
class CacheEntry:
    """Cache entry metadata"""
    key: str
    value: Any
    ttl: int
    created_at: datetime
    accessed_at: datetime
    access_count: int = 0
    tags: List[str] = field(default_factory=list)

@dataclass
class CacheStats:
    """Cache statistics"""
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    errors: int = 0
    hit_ratio: float = 0.0
    avg_response_time_ms: float = 0.0
    memory_usage_mb: float = 0.0

# ============== REDIS CACHE SERVICE ==============

class RedisCacheService:
    """Main Redis cache service"""
    
    def __init__(self, config: CacheConfig = None):
        self.config = config or CacheConfig()
        self.redis_client: Optional[Redis] = None
        self.connection_pool: Optional[ConnectionPool] = None
        self.is_connected = False
        self.stats = CacheStats()
        self.cache_strategies = {}
        
    async def connect(self) -> bool:
        """Connect to Redis server"""
        try:
            # Create connection pool
            self.connection_pool = ConnectionPool(
                host=self.config.REDIS_HOST,
                port=self.config.REDIS_PORT,
                db=self.config.REDIS_DB,
                password=self.config.REDIS_PASSWORD,
                max_connections=self.config.MAX_CONNECTIONS,
                socket_connect_timeout=self.config.CONNECTION_TIMEOUT,
                socket_timeout=self.config.SOCKET_TIMEOUT,
                socket_keepalive=self.config.SOCKET_KEEPALIVE,
                socket_keepalive_options=self.config.SOCKET_KEEPALIVE_OPTIONS,
                decode_responses=False  # We'll handle encoding/decoding
            )
            
            # Create Redis client
            self.redis_client = Redis(connection_pool=self.connection_pool)
            
            # Test connection
            await self.redis_client.ping()
            
            self.is_connected = True
            logger.info("✅ Redis cache service connected successfully")
            return True
            
        except (RedisError, RedisConnectionError) as e:
            logger.error(f"❌ Redis connection failed: {e}")
            self.is_connected = False
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error connecting to Redis: {e}")
            self.is_connected = False
            return False
    
    async def disconnect(self):
        """Disconnect from Redis server"""
        try:
            if self.redis_client:
                await self.redis_client.close()
            if self.connection_pool:
                await self.connection_pool.disconnect()
            self.is_connected = False
            logger.info("🔌 Redis cache service disconnected")
        except Exception as e:
            logger.error(f"Error disconnecting from Redis: {e}")
    
    # ============== BASIC CACHE OPERATIONS ==============
    
    async def get(self, key: str, default: Any = None) -> Any:
        """Get value from cache"""
        if not self.is_connected:
            await self.connect()
            if not self.is_connected:
                return default
        
        try:
            start_time = time.time()
            full_key = self._make_key(key)
            
            value = await self.redis_client.get(full_key)
            
            elapsed_ms = (time.time() - start_time) * 1000
            self._update_stats(hit=value is not None, response_time=elapsed_ms)
            
            if value is None:
                return default
            
            # Try to deserialize
            return self._deserialize(value)
            
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            self.stats.errors += 1
            return default
    
    async def set(self, key: str, value: Any, ttl: int = None) -> bool:
        """Set value in cache"""
        if not self.is_connected:
            await self.connect()
            if not self.is_connected:
                return False
        
        try:
            start_time = time.time()
            full_key = self._make_key(key)
            ttl = ttl or self.config.DEFAULT_TTL
            
            # Serialize value
            serialized = self._serialize(value)
            
            # Set with expiration
            result = await self.redis_client.setex(full_key, ttl, serialized)
            
            elapsed_ms = (time.time() - start_time) * 1000
            self.stats.sets += 1
            self._update_stats(response_time=elapsed_ms)
            
            return result
            
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            self.stats.errors += 1
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.is_connected:
            await self.connect()
            if not self.is_connected:
                return False
        
        try:
            full_key = self._make_key(key)
            result = await self.redis_client.delete(full_key)
            self.stats.deletes += 1
            return result > 0
            
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            self.stats.errors += 1
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.is_connected:
            await self.connect()
            if not self.is_connected:
                return False
        
        try:
            full_key = self._make_key(key)
            return await self.redis_client.exists(full_key) > 0
        except Exception as e:
            logger.error(f"Cache exists error for key {key}: {e}")
            return False
    
    async def expire(self, key: str, ttl: int) -> bool:
        """Set expiration for key"""
        if not self.is_connected:
            return False
        
        try:
            full_key = self._make_key(key)
            return await self.redis_client.expire(full_key, ttl)
        except Exception as e:
            logger.error(f"Cache expire error for key {key}: {e}")
            return False
    
    # ============== ADVANCED CACHE OPERATIONS ==============
    
    async def get_many(self, keys: List[str]) -> Dict[str, Any]:
        """Get multiple values from cache"""
        if not self.is_connected:
            await self.connect()
            if not self.is_connected:
                return {}
        
        try:
            full_keys = [self._make_key(k) for k in keys]
            values = await self.redis_client.mget(full_keys)
            
            result = {}
            for key, value in zip(keys, values):
                if value is not None:
                    result[key] = self._deserialize(value)
                    self.stats.hits += 1
                else:
                    self.stats.misses += 1
            
            return result
            
        except Exception as e:
            logger.error(f"Cache get_many error: {e}")
            self.stats.errors += 1
            return {}
    
    async def set_many(self, data: Dict[str, Any], ttl: int = None) -> bool:
        """Set multiple values in cache"""
        if not self.is_connected:
            await self.connect()
            if not self.is_connected:
                return False
        
        try:
            ttl = ttl or self.config.DEFAULT_TTL
            pipe = self.redis_client.pipeline()
            
            for key, value in data.items():
                full_key = self._make_key(key)
                serialized = self._serialize(value)
                pipe.setex(full_key, ttl, serialized)
            
            results = await pipe.execute()
            self.stats.sets += len(data)
            
            return all(results)
            
        except Exception as e:
            logger.error(f"Cache set_many error: {e}")
            self.stats.errors += 1
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not self.is_connected:
            return 0
        
        try:
            full_pattern = self._make_key(pattern)
            keys = []
            
            # Use SCAN to get keys (safer than KEYS for production)
            async for key in self.redis_client.scan_iter(match=full_pattern):
                keys.append(key)
            
            if keys:
                deleted = await self.redis_client.delete(*keys)
                self.stats.deletes += deleted
                return deleted
            
            return 0
            
        except Exception as e:
            logger.error(f"Cache delete_pattern error: {e}")
            return 0
    
    async def clear_all(self) -> bool:
        """Clear all cache (use with caution!)"""
        if not self.is_connected:
            return False
        
        try:
            await self.redis_client.flushdb()
            logger.warning("⚠️ All cache cleared!")
            return True
        except Exception as e:
            logger.error(f"Cache clear_all error: {e}")
            return False
    
    # ============== HASH OPERATIONS ==============
    
    async def hget(self, key: str, field: str) -> Any:
        """Get field from hash"""
        if not self.is_connected:
            return None
        
        try:
            full_key = self._make_key(key)
            value = await self.redis_client.hget(full_key, field)
            return self._deserialize(value) if value else None
        except Exception as e:
            logger.error(f"Cache hget error: {e}")
            return None
    
    async def hset(self, key: str, field: str, value: Any, ttl: int = None) -> bool:
        """Set field in hash"""
        if not self.is_connected:
            return False
        
        try:
            full_key = self._make_key(key)
            serialized = self._serialize(value)
            result = await self.redis_client.hset(full_key, field, serialized)
            
            if ttl:
                await self.redis_client.expire(full_key, ttl)
            
            return True
        except Exception as e:
            logger.error(f"Cache hset error: {e}")
            return False
    
    async def hgetall(self, key: str) -> Dict[str, Any]:
        """Get all fields from hash"""
        if not self.is_connected:
            return {}
        
        try:
            full_key = self._make_key(key)
            data = await self.redis_client.hgetall(full_key)
            
            result = {}
            for field, value in data.items():
                field_str = field.decode('utf-8') if isinstance(field, bytes) else field
                result[field_str] = self._deserialize(value)
            
            return result
        except Exception as e:
            logger.error(f"Cache hgetall error: {e}")
            return {}
    
    # ============== LIST OPERATIONS ==============
    
    async def lpush(self, key: str, *values, ttl: int = None) -> int:
        """Push values to list head"""
        if not self.is_connected:
            return 0
        
        try:
            full_key = self._make_key(key)
            serialized = [self._serialize(v) for v in values]
            result = await self.redis_client.lpush(full_key, *serialized)
            
            if ttl:
                await self.redis_client.expire(full_key, ttl)
            
            return result
        except Exception as e:
            logger.error(f"Cache lpush error: {e}")
            return 0
    
    async def lrange(self, key: str, start: int = 0, end: int = -1) -> List[Any]:
        """Get range from list"""
        if not self.is_connected:
            return []
        
        try:
            full_key = self._make_key(key)
            values = await self.redis_client.lrange(full_key, start, end)
            return [self._deserialize(v) for v in values]
        except Exception as e:
            logger.error(f"Cache lrange error: {e}")
            return []
    
    # ============== SET OPERATIONS ==============
    
    async def sadd(self, key: str, *values, ttl: int = None) -> int:
        """Add values to set"""
        if not self.is_connected:
            return 0
        
        try:
            full_key = self._make_key(key)
            serialized = [self._serialize(v) for v in values]
            result = await self.redis_client.sadd(full_key, *serialized)
            
            if ttl:
                await self.redis_client.expire(full_key, ttl)
            
            return result
        except Exception as e:
            logger.error(f"Cache sadd error: {e}")
            return 0
    
    async def smembers(self, key: str) -> Set[Any]:
        """Get all members from set"""
        if not self.is_connected:
            return set()
        
        try:
            full_key = self._make_key(key)
            values = await self.redis_client.smembers(full_key)
            return {self._deserialize(v) for v in values}
        except Exception as e:
            logger.error(f"Cache smembers error: {e}")
            return set()
    
    # ============== CACHE DECORATORS ==============
    
    def cached(self, ttl: int = None, key_prefix: str = None):
        """Decorator for caching function results"""
        def decorator(func):
            async def wrapper(*args, **kwargs):
                # Generate cache key from function name and arguments
                cache_key = self._generate_cache_key(func.__name__, args, kwargs, key_prefix)
                
                # Try to get from cache
                cached_value = await self.get(cache_key)
                if cached_value is not None:
                    logger.debug(f"Cache hit for {func.__name__}")
                    return cached_value
                
                # Execute function
                result = await func(*args, **kwargs)
                
                # Store in cache
                await self.set(cache_key, result, ttl or self.config.DEFAULT_TTL)
                
                return result
            
            return wrapper
        return decorator
    
    def invalidate(self, pattern: str = None):
        """Decorator for cache invalidation"""
        def decorator(func):
            async def wrapper(*args, **kwargs):
                # Execute function
                result = await func(*args, **kwargs)
                
                # Invalidate cache
                if pattern:
                    await self.delete_pattern(pattern)
                
                return result
            
            return wrapper
        return decorator
    
    # ============== UTILITY METHODS ==============
    
    def _make_key(self, key: str) -> str:
        """Create full cache key with prefix"""
        if key.startswith((self.config.PREFIX_API, self.config.PREFIX_SESSION, 
                          self.config.PREFIX_USER, self.config.PREFIX_BOOKING,
                          self.config.PREFIX_AI, self.config.PREFIX_METRIC,
                          self.config.PREFIX_REPORT, self.config.PREFIX_TEMP)):
            return key
        return f"{self.config.PREFIX_API}{key}"
    
    def _serialize(self, value: Any) -> bytes:
        """Serialize value for storage"""
        try:
            # Try JSON first (faster)
            if isinstance(value, (dict, list, str, int, float, bool, type(None))):
                return json.dumps(value).encode('utf-8')
            # Fall back to pickle for complex objects
            return pickle.dumps(value)
        except Exception as e:
            logger.error(f"Serialization error: {e}")
            return str(value).encode('utf-8')
    
    def _deserialize(self, value: bytes) -> Any:
        """Deserialize value from storage"""
        if value is None:
            return None
        
        try:
            # Try JSON first
            return json.loads(value.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            try:
                # Try pickle
                return pickle.loads(value)
            except Exception:
                # Return as string
                return value.decode('utf-8', errors='ignore')
    
    def _generate_cache_key(self, func_name: str, args: tuple, kwargs: dict, prefix: str = None) -> str:
        """Generate cache key from function name and arguments"""
        # Create a string representation of arguments
        key_parts = [func_name]
        
        # Add args
        for arg in args:
            if isinstance(arg, (str, int, float, bool)):
                key_parts.append(str(arg))
            else:
                # Hash complex objects
                key_parts.append(hashlib.md5(str(arg).encode()).hexdigest()[:8])
        
        # Add kwargs
        for k, v in sorted(kwargs.items()):
            if isinstance(v, (str, int, float, bool)):
                key_parts.append(f"{k}={v}")
            else:
                key_parts.append(f"{k}={hashlib.md5(str(v).encode()).hexdigest()[:8]}")
        
        key = ":".join(key_parts)
        
        if prefix:
            key = f"{prefix}:{key}"
        
        return key
    
    def _update_stats(self, hit: bool = None, response_time: float = None):
        """Update cache statistics"""
        if hit is not None:
            if hit:
                self.stats.hits += 1
            else:
                self.stats.misses += 1
            
            total = self.stats.hits + self.stats.misses
            if total > 0:
                self.stats.hit_ratio = self.stats.hits / total
        
        if response_time is not None:
            # Update average response time (simple moving average)
            total_requests = self.stats.hits + self.stats.misses + self.stats.sets
            if total_requests > 0:
                self.stats.avg_response_time_ms = (
                    (self.stats.avg_response_time_ms * (total_requests - 1) + response_time) / total_requests
                )
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        stats = asdict(self.stats)
        
        # Add Redis server info if connected
        if self.is_connected:
            try:
                info = await self.redis_client.info("memory")
                stats["memory_usage_mb"] = info.get("used_memory", 0) / (1024 * 1024)
                stats["memory_peak_mb"] = info.get("used_memory_peak", 0) / (1024 * 1024)
                stats["connected_clients"] = await self.redis_client.client_list()
            except Exception as e:
                logger.error(f"Error getting Redis info: {e}")
        
        return stats

# ============== CACHE MANAGER ==============

class CacheManager:
    """High-level cache management"""
    
    def __init__(self, config: CacheConfig = None):
        self.cache_service = RedisCacheService(config)
        self.is_initialized = False
        
    async def initialize(self) -> bool:
        """Initialize cache manager"""
        try:
            connected = await self.cache_service.connect()
            if connected:
                self.is_initialized = True
                logger.info("✅ Cache Manager initialized successfully")
            return connected
        except Exception as e:
            logger.error(f"Cache Manager initialization failed: {e}")
            return False
    
    async def cache_api_response(self, endpoint: str, response: Any, ttl: int = 300) -> bool:
        """Cache API response"""
        key = f"{CacheConfig.PREFIX_API}{endpoint}"
        return await self.cache_service.set(key, response, ttl)
    
    async def get_cached_api_response(self, endpoint: str) -> Any:
        """Get cached API response"""
        key = f"{CacheConfig.PREFIX_API}{endpoint}"
        return await self.cache_service.get(key)
    
    async def cache_user_session(self, user_id: str, session_data: Dict, ttl: int = 3600) -> bool:
        """Cache user session"""
        key = f"{CacheConfig.PREFIX_SESSION}{user_id}"
        return await self.cache_service.set(key, session_data, ttl)
    
    async def get_user_session(self, user_id: str) -> Dict:
        """Get user session"""
        key = f"{CacheConfig.PREFIX_SESSION}{user_id}"
        return await self.cache_service.get(key, {})
    
    async def invalidate_user_session(self, user_id: str) -> bool:
        """Invalidate user session"""
        key = f"{CacheConfig.PREFIX_SESSION}{user_id}"
        return await self.cache_service.delete(key)
    
    async def cache_booking_data(self, booking_id: str, data: Dict, ttl: int = 7200) -> bool:
        """Cache booking data"""
        key = f"{CacheConfig.PREFIX_BOOKING}{booking_id}"
        return await self.cache_service.set(key, data, ttl)
    
    async def get_booking_data(self, booking_id: str) -> Dict:
        """Get booking data"""
        key = f"{CacheConfig.PREFIX_BOOKING}{booking_id}"
        return await self.cache_service.get(key, {})
    
    async def cache_ai_response(self, agent_id: str, query: str, response: Any, ttl: int = 1800) -> bool:
        """Cache AI agent response"""
        key = f"{CacheConfig.PREFIX_AI}{agent_id}:{hashlib.md5(query.encode()).hexdigest()[:16]}"
        return await self.cache_service.set(key, response, ttl)
    
    async def get_ai_response(self, agent_id: str, query: str) -> Any:
        """Get cached AI agent response"""
        key = f"{CacheConfig.PREFIX_AI}{agent_id}:{hashlib.md5(query.encode()).hexdigest()[:16]}"
        return await self.cache_service.get(key)
    
    async def cache_metric(self, metric_name: str, value: Any, ttl: int = 60) -> bool:
        """Cache metric value"""
        key = f"{CacheConfig.PREFIX_METRIC}{metric_name}"
        return await self.cache_service.set(key, value, ttl)
    
    async def get_metric(self, metric_name: str) -> Any:
        """Get cached metric"""
        key = f"{CacheConfig.PREFIX_METRIC}{metric_name}"
        return await self.cache_service.get(key)
    
    async def warmup_cache(self, keys: List[str], data_loader) -> int:
        """Warmup cache with preloaded data"""
        loaded = 0
        for key in keys:
            data = await data_loader(key)
            if data and await self.cache_service.set(key, data):
                loaded += 1
        
        logger.info(f"🔥 Cache warmup completed: {loaded}/{len(keys)} keys loaded")
        return loaded
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return await self.cache_service.get_stats()
    
    async def cleanup(self):
        """Cleanup cache manager"""
        await self.cache_service.disconnect()
        self.is_initialized = False

# ============== SINGLETON INSTANCE ==============

_cache_manager_instance = None

def get_cache_manager(config: CacheConfig = None) -> CacheManager:
    """Get singleton cache manager instance"""
    global _cache_manager_instance
    if _cache_manager_instance is None:
        _cache_manager_instance = CacheManager(config)
    return _cache_manager_instance

# ============== HELPER FUNCTIONS ==============

async def setup_redis_cache(config: CacheConfig = None) -> CacheManager:
    """Setup and initialize Redis cache"""
    manager = get_cache_manager(config)
    await manager.initialize()
    return manager

async def cache_get(key: str, default: Any = None) -> Any:
    """Quick helper to get from cache"""
    manager = get_cache_manager()
    if not manager.is_initialized:
        await manager.initialize()
    return await manager.cache_service.get(key, default)

async def cache_set(key: str, value: Any, ttl: int = None) -> bool:
    """Quick helper to set in cache"""
    manager = get_cache_manager()
    if not manager.is_initialized:
        await manager.initialize()
    return await manager.cache_service.set(key, value, ttl)

async def cache_delete(key: str) -> bool:
    """Quick helper to delete from cache"""
    manager = get_cache_manager()
    if not manager.is_initialized:
        await manager.initialize()
    return await manager.cache_service.delete(key)

if __name__ == "__main__":
    # Test Redis cache
    async def test_cache():
        print("\n🧑 Testing Redis Cache Service...\n")
        
        # Initialize cache
        cache_manager = await setup_redis_cache()
        
        if not cache_manager.is_initialized:
            print("⚠️ Redis not available, using mock mode")
            return
        
        # Test basic operations
        print("🧪 Testing basic operations...")
        
        # Set and get
        await cache_set("test:key1", {"data": "test value"}, ttl=60)
        value = await cache_get("test:key1")
        print(f"✅ Set/Get: {value}")
        
        # Cache API response
        await cache_manager.cache_api_response(
            "/api/test", 
            {"status": "success", "data": [1, 2, 3]},
            ttl=300
        )
        api_data = await cache_manager.get_cached_api_response("/api/test")
        print(f"✅ API Cache: {api_data}")
        
        # Cache user session
        await cache_manager.cache_user_session(
            "user123",
            {"username": "test_user", "role": "admin"},
            ttl=3600
        )
        session = await cache_manager.get_user_session("user123")
        print(f"✅ Session Cache: {session}")
        
        # Get statistics
        stats = await cache_manager.get_stats()
        print(f"\n📊 Cache Statistics:")
        print(f"  Hits: {stats['hits']}")
        print(f"  Misses: {stats['misses']}")
        print(f"  Hit Ratio: {stats['hit_ratio']:.2%}")
        print(f"  Avg Response Time: {stats['avg_response_time_ms']:.2f}ms")
        
        # Cleanup
        await cache_manager.cleanup()
        print("\n✅ Redis Cache tests completed!")
    
    # Run test
    asyncio.run(test_cache())