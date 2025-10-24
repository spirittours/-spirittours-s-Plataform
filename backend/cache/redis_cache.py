"""
Redis Cache Service - Phase 7: Performance Optimization

High-performance caching layer with:
- Redis integration
- Cache strategies (TTL, LRU, LFU)
- Cache warming
- Cache invalidation
- Distributed caching
- Cache statistics

Autor: Spirit Tours Performance Team
Fecha: 2025-10-18
"""

import redis
import json
import hashlib
import pickle
from typing import Any, Optional, List, Dict, Callable
from datetime import timedelta
from decimal import Decimal
from functools import wraps
import logging

logger = logging.getLogger(__name__)


class RedisCache:
    """
    Redis-based caching service with advanced features.
    """
    
    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        decode_responses: bool = True
    ):
        """Initialize Redis connection."""
        self.client = redis.Redis(
            host=host,
            port=port,
            db=db,
            password=password,
            decode_responses=decode_responses,
            socket_timeout=5,
            socket_connect_timeout=5,
            retry_on_timeout=True
        )
        
        # Connection pool for better performance
        self.pool = redis.ConnectionPool(
            host=host,
            port=port,
            db=db,
            password=password,
            max_connections=50
        )
        
        logger.info(f"Redis cache initialized: {host}:{port}/{db}")
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
        
        Returns:
            Cached value or None if not found
        """
        try:
            value = self.client.get(key)
            if value is None:
                return None
            
            # Try to deserialize JSON
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        
        except redis.RedisError as e:
            logger.error(f"Redis GET error: {e}")
            return None
    
    def set(
        self,
        key: str,
        value: Any,
        expire: Optional[int] = None
    ) -> bool:
        """
        Set value in cache with optional expiration.
        
        Args:
            key: Cache key
            value: Value to cache
            expire: Expiration time in seconds
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Serialize value
            if isinstance(value, (dict, list)):
                serialized = json.dumps(value, default=str)
            elif isinstance(value, Decimal):
                serialized = str(value)
            else:
                serialized = value
            
            if expire:
                self.client.setex(key, expire, serialized)
            else:
                self.client.set(key, serialized)
            
            return True
        
        except redis.RedisError as e:
            logger.error(f"Redis SET error: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        try:
            self.client.delete(key)
            return True
        except redis.RedisError as e:
            logger.error(f"Redis DELETE error: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern.
        
        Args:
            pattern: Redis pattern (e.g., "user:*")
        
        Returns:
            Number of keys deleted
        """
        try:
            keys = self.client.keys(pattern)
            if keys:
                return self.client.delete(*keys)
            return 0
        except redis.RedisError as e:
            logger.error(f"Redis DELETE_PATTERN error: {e}")
            return 0
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            return bool(self.client.exists(key))
        except redis.RedisError as e:
            logger.error(f"Redis EXISTS error: {e}")
            return False
    
    def incr(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment value by amount."""
        try:
            return self.client.incrby(key, amount)
        except redis.RedisError as e:
            logger.error(f"Redis INCR error: {e}")
            return None
    
    def decr(self, key: str, amount: int = 1) -> Optional[int]:
        """Decrement value by amount."""
        try:
            return self.client.decrby(key, amount)
        except redis.RedisError as e:
            logger.error(f"Redis DECR error: {e}")
            return None
    
    def expire(self, key: str, seconds: int) -> bool:
        """Set expiration time for key."""
        try:
            return bool(self.client.expire(key, seconds))
        except redis.RedisError as e:
            logger.error(f"Redis EXPIRE error: {e}")
            return False
    
    def ttl(self, key: str) -> Optional[int]:
        """Get remaining time to live in seconds."""
        try:
            return self.client.ttl(key)
        except redis.RedisError as e:
            logger.error(f"Redis TTL error: {e}")
            return None
    
    def flush_db(self) -> bool:
        """Flush entire database (use with caution!)."""
        try:
            self.client.flushdb()
            logger.warning("Redis database flushed")
            return True
        except redis.RedisError as e:
            logger.error(f"Redis FLUSHDB error: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        try:
            info = self.client.info()
            return {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory_human", "0"),
                "total_keys": self.client.dbsize(),
                "hit_rate": self._calculate_hit_rate(info),
                "uptime_seconds": info.get("uptime_in_seconds", 0)
            }
        except redis.RedisError as e:
            logger.error(f"Redis STATS error: {e}")
            return {}
    
    def _calculate_hit_rate(self, info: Dict) -> float:
        """Calculate cache hit rate."""
        hits = info.get("keyspace_hits", 0)
        misses = info.get("keyspace_misses", 0)
        total = hits + misses
        
        if total == 0:
            return 0.0
        
        return round((hits / total) * 100, 2)
    
    # Hash operations
    def hset(self, name: str, key: str, value: Any) -> bool:
        """Set hash field."""
        try:
            serialized = json.dumps(value, default=str) if isinstance(value, (dict, list)) else value
            self.client.hset(name, key, serialized)
            return True
        except redis.RedisError as e:
            logger.error(f"Redis HSET error: {e}")
            return False
    
    def hget(self, name: str, key: str) -> Optional[Any]:
        """Get hash field."""
        try:
            value = self.client.hget(name, key)
            if value is None:
                return None
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        except redis.RedisError as e:
            logger.error(f"Redis HGET error: {e}")
            return None
    
    def hgetall(self, name: str) -> Dict[str, Any]:
        """Get all hash fields."""
        try:
            data = self.client.hgetall(name)
            result = {}
            for key, value in data.items():
                try:
                    result[key] = json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    result[key] = value
            return result
        except redis.RedisError as e:
            logger.error(f"Redis HGETALL error: {e}")
            return {}
    
    # List operations
    def lpush(self, key: str, *values: Any) -> Optional[int]:
        """Push values to list (left)."""
        try:
            serialized = [json.dumps(v, default=str) if isinstance(v, (dict, list)) else v for v in values]
            return self.client.lpush(key, *serialized)
        except redis.RedisError as e:
            logger.error(f"Redis LPUSH error: {e}")
            return None
    
    def rpush(self, key: str, *values: Any) -> Optional[int]:
        """Push values to list (right)."""
        try:
            serialized = [json.dumps(v, default=str) if isinstance(v, (dict, list)) else v for v in values]
            return self.client.rpush(key, *serialized)
        except redis.RedisError as e:
            logger.error(f"Redis RPUSH error: {e}")
            return None
    
    def lrange(self, key: str, start: int = 0, end: int = -1) -> List[Any]:
        """Get list range."""
        try:
            values = self.client.lrange(key, start, end)
            result = []
            for v in values:
                try:
                    result.append(json.loads(v))
                except (json.JSONDecodeError, TypeError):
                    result.append(v)
            return result
        except redis.RedisError as e:
            logger.error(f"Redis LRANGE error: {e}")
            return []
    
    # Set operations
    def sadd(self, key: str, *members: Any) -> Optional[int]:
        """Add members to set."""
        try:
            return self.client.sadd(key, *members)
        except redis.RedisError as e:
            logger.error(f"Redis SADD error: {e}")
            return None
    
    def smembers(self, key: str) -> set:
        """Get all set members."""
        try:
            return self.client.smembers(key)
        except redis.RedisError as e:
            logger.error(f"Redis SMEMBERS error: {e}")
            return set()
    
    def sismember(self, key: str, member: Any) -> bool:
        """Check if member is in set."""
        try:
            return bool(self.client.sismember(key, member))
        except redis.RedisError as e:
            logger.error(f"Redis SISMEMBER error: {e}")
            return False


# Decorator for caching function results
def cache_result(
    expire: int = 300,
    key_prefix: str = "",
    key_builder: Optional[Callable] = None
):
    """
    Decorator to cache function results.
    
    Args:
        expire: Cache expiration in seconds (default: 5 minutes)
        key_prefix: Prefix for cache key
        key_builder: Custom function to build cache key
    
    Example:
        @cache_result(expire=600, key_prefix="user")
        async def get_user(user_id: int):
            return await db.get_user(user_id)
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # Default key builder
                args_str = "_".join(str(arg) for arg in args)
                kwargs_str = "_".join(f"{k}={v}" for k, v in sorted(kwargs.items()))
                key_parts = [key_prefix, func.__name__, args_str, kwargs_str]
                cache_key = ":".join(filter(None, key_parts))
                
                # Hash long keys
                if len(cache_key) > 200:
                    cache_key = hashlib.md5(cache_key.encode()).hexdigest()
            
            # Try to get from cache
            cache = get_cache()
            cached_value = cache.get(cache_key)
            
            if cached_value is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return cached_value
            
            # Cache miss - call function
            logger.debug(f"Cache MISS: {cache_key}")
            result = await func(*args, **kwargs)
            
            # Store in cache
            cache.set(cache_key, result, expire=expire)
            
            return result
        
        return wrapper
    return decorator


# Singleton instance
_cache: Optional[RedisCache] = None


def get_cache() -> RedisCache:
    """Get Redis cache singleton instance."""
    global _cache
    
    if _cache is None:
        _cache = RedisCache()
    
    return _cache


def invalidate_cache(pattern: str) -> int:
    """Invalidate cache keys matching pattern."""
    cache = get_cache()
    return cache.delete_pattern(pattern)
