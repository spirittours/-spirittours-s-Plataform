"""
Advanced Redis Cache Manager for Spirit Tours
Implements multi-layer caching with intelligent invalidation
"""

import json
import hashlib
import pickle
from typing import Any, Optional, Union, List, Dict, Callable
from datetime import datetime, timedelta
from functools import wraps
from enum import Enum
import asyncio
import redis.asyncio as redis
from redis.asyncio import Redis
from redis.exceptions import RedisError
import logging
from dataclasses import dataclass, asdict
import msgpack

logger = logging.getLogger(__name__)

class CacheLayer(Enum):
    """Cache layer definitions"""
    L1_MEMORY = "l1_memory"  # In-memory cache (fastest)
    L2_REDIS = "l2_redis"    # Redis cache (fast)
    L3_DATABASE = "l3_database"  # Database cache (persistent)

class CacheStrategy(Enum):
    """Cache strategies"""
    WRITE_THROUGH = "write_through"  # Write to cache and DB simultaneously
    WRITE_BEHIND = "write_behind"    # Write to cache first, DB later
    READ_THROUGH = "read_through"    # Read from cache, fetch from DB if miss
    CACHE_ASIDE = "cache_aside"      # Application manages cache

@dataclass
class CacheConfig:
    """Cache configuration"""
    ttl: int = 3600  # Default TTL in seconds
    max_size: int = 10000  # Maximum cache size
    compression: bool = True  # Enable compression
    serialization: str = "msgpack"  # msgpack, json, pickle
    namespace: str = "spirit_tours"  # Cache namespace
    version: str = "v1"  # Cache version

@dataclass
class CacheStats:
    """Cache statistics"""
    hits: int = 0
    misses: int = 0
    evictions: int = 0
    errors: int = 0
    total_requests: int = 0
    hit_rate: float = 0.0
    avg_response_time: float = 0.0
    memory_usage: int = 0
    last_reset: datetime = None

class CacheManager:
    """
    Advanced cache manager with multi-layer caching,
    intelligent invalidation, and performance monitoring
    """
    
    def __init__(self, config: CacheConfig = None):
        self.config = config or CacheConfig()
        self.redis_client: Optional[Redis] = None
        self.memory_cache: Dict[str, Any] = {}
        self.stats = CacheStats(last_reset=datetime.now())
        self.invalidation_patterns: List[str] = []
        self.cache_warmup_tasks: List[Callable] = []
        
        # Circuit breaker for Redis failures
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=60,
            expected_exception=RedisError
        )
        
    async def initialize(self):
        """Initialize cache connections"""
        try:
            # Initialize Redis connection pool
            self.redis_client = await redis.from_url(
                "redis://localhost:6379",
                encoding="utf-8",
                decode_responses=False,
                max_connections=50,
                socket_keepalive=True,
                socket_keepalive_options={
                    1: 1,  # TCP_KEEPIDLE
                    2: 1,  # TCP_KEEPINTVL
                    3: 3,  # TCP_KEEPCNT
                }
            )
            
            # Test connection
            await self.redis_client.ping()
            logger.info("Redis cache initialized successfully")
            
            # Start background tasks
            asyncio.create_task(self._stats_reporter())
            asyncio.create_task(self._cache_warmer())
            asyncio.create_task(self._memory_cache_cleaner())
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis: {e}")
            # Fall back to memory-only cache
            self.redis_client = None
    
    def cache(
        self,
        ttl: Optional[int] = None,
        key_prefix: Optional[str] = None,
        layer: CacheLayer = CacheLayer.L2_REDIS,
        strategy: CacheStrategy = CacheStrategy.READ_THROUGH,
        tags: Optional[List[str]] = None,
        condition: Optional[Callable] = None
    ):
        """
        Decorator for caching function results
        """
        def decorator(func):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                # Check if caching should be applied
                if condition and not condition(*args, **kwargs):
                    return await func(*args, **kwargs)
                
                # Generate cache key
                cache_key = self._generate_cache_key(
                    func.__name__,
                    args,
                    kwargs,
                    prefix=key_prefix
                )
                
                # Try to get from cache
                cached_value = await self.get(cache_key, layer=layer)
                if cached_value is not None:
                    self.stats.hits += 1
                    return cached_value
                
                # Cache miss - execute function
                self.stats.misses += 1
                result = await func(*args, **kwargs)
                
                # Store in cache
                if result is not None:
                    await self.set(
                        cache_key,
                        result,
                        ttl=ttl or self.config.ttl,
                        layer=layer,
                        tags=tags
                    )
                
                return result
            
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                # Synchronous version for non-async functions
                loop = asyncio.get_event_loop()
                return loop.run_until_complete(async_wrapper(*args, **kwargs))
            
            return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
        
        return decorator
    
    async def get(
        self,
        key: str,
        layer: CacheLayer = CacheLayer.L2_REDIS,
        default: Any = None
    ) -> Optional[Any]:
        """Get value from cache"""
        self.stats.total_requests += 1
        full_key = self._make_key(key)
        
        try:
            # L1: Memory cache
            if layer == CacheLayer.L1_MEMORY or full_key in self.memory_cache:
                if full_key in self.memory_cache:
                    value, expiry = self.memory_cache[full_key]
                    if expiry > datetime.now():
                        return value
                    else:
                        del self.memory_cache[full_key]
            
            # L2: Redis cache
            if self.redis_client and layer in [CacheLayer.L2_REDIS, CacheLayer.L3_DATABASE]:
                async with self.circuit_breaker:
                    value = await self.redis_client.get(full_key)
                    if value:
                        return self._deserialize(value)
            
            return default
            
        except Exception as e:
            self.stats.errors += 1
            logger.error(f"Cache get error: {e}")
            return default
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        layer: CacheLayer = CacheLayer.L2_REDIS,
        tags: Optional[List[str]] = None
    ) -> bool:
        """Set value in cache"""
        full_key = self._make_key(key)
        ttl = ttl or self.config.ttl
        
        try:
            serialized_value = self._serialize(value)
            
            # L1: Memory cache
            if layer == CacheLayer.L1_MEMORY or self.config.max_size > len(self.memory_cache):
                expiry = datetime.now() + timedelta(seconds=ttl)
                self.memory_cache[full_key] = (value, expiry)
            
            # L2: Redis cache
            if self.redis_client and layer in [CacheLayer.L2_REDIS, CacheLayer.L3_DATABASE]:
                async with self.circuit_breaker:
                    # Set value with TTL
                    await self.redis_client.set(full_key, serialized_value, ex=ttl)
                    
                    # Add tags for invalidation
                    if tags:
                        for tag in tags:
                            tag_key = f"{self.config.namespace}:tag:{tag}"
                            await self.redis_client.sadd(tag_key, full_key)
                            await self.redis_client.expire(tag_key, ttl)
            
            return True
            
        except Exception as e:
            self.stats.errors += 1
            logger.error(f"Cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        full_key = self._make_key(key)
        
        try:
            # Remove from memory cache
            if full_key in self.memory_cache:
                del self.memory_cache[full_key]
            
            # Remove from Redis
            if self.redis_client:
                async with self.circuit_breaker:
                    await self.redis_client.delete(full_key)
            
            return True
            
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    async def invalidate_by_tags(self, tags: List[str]) -> int:
        """Invalidate cache entries by tags"""
        invalidated = 0
        
        try:
            if self.redis_client:
                for tag in tags:
                    tag_key = f"{self.config.namespace}:tag:{tag}"
                    
                    # Get all keys with this tag
                    keys = await self.redis_client.smembers(tag_key)
                    
                    if keys:
                        # Delete all tagged keys
                        await self.redis_client.delete(*keys)
                        invalidated += len(keys)
                        
                        # Remove from memory cache
                        for key in keys:
                            if key in self.memory_cache:
                                del self.memory_cache[key]
                    
                    # Delete the tag set
                    await self.redis_client.delete(tag_key)
            
            logger.info(f"Invalidated {invalidated} cache entries for tags: {tags}")
            return invalidated
            
        except Exception as e:
            logger.error(f"Cache invalidation error: {e}")
            return 0
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache entries by pattern"""
        invalidated = 0
        
        try:
            if self.redis_client:
                # Find matching keys
                cursor = 0
                while True:
                    cursor, keys = await self.redis_client.scan(
                        cursor,
                        match=f"{self.config.namespace}:{pattern}",
                        count=100
                    )
                    
                    if keys:
                        await self.redis_client.delete(*keys)
                        invalidated += len(keys)
                    
                    if cursor == 0:
                        break
            
            # Clear matching keys from memory cache
            memory_keys = list(self.memory_cache.keys())
            for key in memory_keys:
                if pattern in key:
                    del self.memory_cache[key]
                    invalidated += 1
            
            return invalidated
            
        except Exception as e:
            logger.error(f"Pattern invalidation error: {e}")
            return 0
    
    async def clear_all(self) -> bool:
        """Clear all cache entries"""
        try:
            # Clear memory cache
            self.memory_cache.clear()
            
            # Clear Redis cache
            if self.redis_client:
                await self.redis_client.flushdb()
            
            logger.info("Cache cleared successfully")
            return True
            
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if self.stats.total_requests > 0:
            self.stats.hit_rate = self.stats.hits / self.stats.total_requests
        
        stats = asdict(self.stats)
        
        # Add Redis stats
        if self.redis_client:
            try:
                info = await self.redis_client.info("stats")
                stats["redis_stats"] = {
                    "connected_clients": info.get("connected_clients"),
                    "used_memory": info.get("used_memory_human"),
                    "total_commands": info.get("total_commands_processed"),
                    "keyspace_hits": info.get("keyspace_hits"),
                    "keyspace_misses": info.get("keyspace_misses"),
                }
            except:
                pass
        
        stats["memory_cache_size"] = len(self.memory_cache)
        stats["circuit_breaker_state"] = self.circuit_breaker.state
        
        return stats
    
    async def warmup(self, tasks: List[Callable]) -> None:
        """Warmup cache with predefined data"""
        logger.info("Starting cache warmup...")
        
        for task in tasks:
            try:
                await task()
            except Exception as e:
                logger.error(f"Cache warmup task failed: {e}")
        
        logger.info("Cache warmup completed")
    
    # Private methods
    
    def _make_key(self, key: str) -> str:
        """Create full cache key with namespace and version"""
        return f"{self.config.namespace}:{self.config.version}:{key}"
    
    def _generate_cache_key(
        self,
        func_name: str,
        args: tuple,
        kwargs: dict,
        prefix: Optional[str] = None
    ) -> str:
        """Generate cache key from function arguments"""
        # Create a unique key from function name and arguments
        key_parts = [func_name]
        
        if prefix:
            key_parts.insert(0, prefix)
        
        # Add positional arguments
        for arg in args:
            if hasattr(arg, "id"):  # Handle model instances
                key_parts.append(f"{arg.__class__.__name__}:{arg.id}")
            else:
                key_parts.append(str(arg))
        
        # Add keyword arguments
        for k, v in sorted(kwargs.items()):
            key_parts.append(f"{k}:{v}")
        
        # Hash the key to avoid length issues
        key_str = ":".join(key_parts)
        if len(key_str) > 200:  # Redis key length limit
            key_hash = hashlib.md5(key_str.encode()).hexdigest()
            return f"{func_name}:{key_hash}"
        
        return key_str
    
    def _serialize(self, value: Any) -> bytes:
        """Serialize value for storage"""
        if self.config.serialization == "msgpack":
            return msgpack.packb(value, use_bin_type=True)
        elif self.config.serialization == "json":
            return json.dumps(value).encode()
        else:  # pickle
            return pickle.dumps(value)
    
    def _deserialize(self, data: bytes) -> Any:
        """Deserialize value from storage"""
        if self.config.serialization == "msgpack":
            return msgpack.unpackb(data, raw=False)
        elif self.config.serialization == "json":
            return json.loads(data.decode())
        else:  # pickle
            return pickle.loads(data)
    
    async def _stats_reporter(self):
        """Background task to report cache statistics"""
        while True:
            await asyncio.sleep(300)  # Report every 5 minutes
            stats = await self.get_stats()
            logger.info(f"Cache stats: {stats}")
    
    async def _cache_warmer(self):
        """Background task to warm cache"""
        while True:
            await asyncio.sleep(3600)  # Warm every hour
            if self.cache_warmup_tasks:
                await self.warmup(self.cache_warmup_tasks)
    
    async def _memory_cache_cleaner(self):
        """Background task to clean expired memory cache entries"""
        while True:
            await asyncio.sleep(60)  # Clean every minute
            now = datetime.now()
            expired_keys = [
                k for k, (_, expiry) in self.memory_cache.items()
                if expiry < now
            ]
            
            for key in expired_keys:
                del self.memory_cache[key]
                self.stats.evictions += 1


class CircuitBreaker:
    """Circuit breaker pattern for Redis failures"""
    
    def __init__(self, failure_threshold=5, recovery_timeout=60, expected_exception=Exception):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half-open
    
    async def __aenter__(self):
        if self.state == "open":
            if datetime.now().timestamp() - self.last_failure_time > self.recovery_timeout:
                self.state = "half-open"
                self.failure_count = 0
            else:
                raise Exception("Circuit breaker is open")
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            if self.state == "half-open":
                self.state = "closed"
            self.failure_count = 0
        elif issubclass(exc_type, self.expected_exception):
            self.failure_count += 1
            self.last_failure_time = datetime.now().timestamp()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "open"
                logger.warning(f"Circuit breaker opened after {self.failure_count} failures")
        
        return False  # Don't suppress exceptions


# Singleton cache manager instance
cache_manager = CacheManager()


# Cache decorators for common use cases

def cached_result(ttl: int = 3600, tags: Optional[List[str]] = None):
    """Simple cache decorator for function results"""
    return cache_manager.cache(ttl=ttl, tags=tags)


def cached_api_response(ttl: int = 300):
    """Cache decorator for API responses"""
    return cache_manager.cache(
        ttl=ttl,
        layer=CacheLayer.L2_REDIS,
        strategy=CacheStrategy.READ_THROUGH
    )


def cached_db_query(ttl: int = 600):
    """Cache decorator for database queries"""
    return cache_manager.cache(
        ttl=ttl,
        layer=CacheLayer.L2_REDIS,
        strategy=CacheStrategy.READ_THROUGH,
        tags=["database"]
    )


def cached_user_data(user_id: str, ttl: int = 1800):
    """Cache decorator for user-specific data"""
    return cache_manager.cache(
        ttl=ttl,
        key_prefix=f"user:{user_id}",
        tags=[f"user:{user_id}"]
    )


# Cache warmup tasks

async def warmup_popular_tours():
    """Warmup cache with popular tours"""
    from backend.services.tour_service import TourService
    
    tours = await TourService.get_popular_tours(limit=50)
    for tour in tours:
        key = f"tour:{tour.id}"
        await cache_manager.set(key, tour.to_dict(), ttl=3600)


async def warmup_categories():
    """Warmup cache with categories"""
    from backend.services.category_service import CategoryService
    
    categories = await CategoryService.get_all_categories()
    await cache_manager.set("categories:all", categories, ttl=7200)


# Initialize cache on module import
asyncio.create_task(cache_manager.initialize())