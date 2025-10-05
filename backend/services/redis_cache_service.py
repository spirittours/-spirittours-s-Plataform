"""
Redis Cache Service - Distributed caching for high performance
Provides caching layer for APIs, sessions, and frequent queries
"""

import redis
import json
import pickle
from typing import Any, Optional, Union, Dict, List
from datetime import timedelta
import hashlib
import asyncio
from functools import wraps
import logging

logger = logging.getLogger(__name__)


class RedisCache:
    """
    Redis cache manager for distributed caching
    """
    
    def __init__(self, 
                 host: str = 'localhost',
                 port: int = 6379,
                 db: int = 0,
                 password: Optional[str] = None,
                 decode_responses: bool = False,
                 connection_pool_kwargs: Optional[Dict] = None):
        """
        Initialize Redis cache connection
        """
        pool_kwargs = connection_pool_kwargs or {
            'max_connections': 50,
            'socket_connect_timeout': 5,
            'socket_timeout': 5
        }
        
        if password:
            pool_kwargs['password'] = password
            
        self.pool = redis.ConnectionPool(
            host=host,
            port=port,
            db=db,
            decode_responses=decode_responses,
            **pool_kwargs
        )
        
        self.redis_client = redis.Redis(connection_pool=self.pool)
        self.async_redis = None  # Will be initialized for async operations
        
        # Cache configuration
        self.default_ttl = 3600  # 1 hour default
        self.cache_prefix = "spirit_tours:"
        
        # Cache statistics
        self.stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0
        }
        
    def _make_key(self, key: str, prefix: Optional[str] = None) -> str:
        """
        Create a namespaced cache key
        """
        prefix = prefix or self.cache_prefix
        return f"{prefix}{key}"
    
    def _serialize(self, value: Any) -> bytes:
        """
        Serialize value for storage
        """
        try:
            # Try JSON first (faster)
            return json.dumps(value).encode('utf-8')
        except (TypeError, ValueError):
            # Fall back to pickle for complex objects
            return pickle.dumps(value)
    
    def _deserialize(self, value: bytes) -> Any:
        """
        Deserialize value from storage
        """
        if value is None:
            return None
            
        try:
            # Try JSON first
            return json.loads(value.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            # Fall back to pickle
            return pickle.loads(value)
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get value from cache
        """
        try:
            cache_key = self._make_key(key)
            value = self.redis_client.get(cache_key)
            
            if value is not None:
                self.stats["hits"] += 1
                return self._deserialize(value)
            else:
                self.stats["misses"] += 1
                return default
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            return default
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set value in cache with optional TTL
        """
        try:
            cache_key = self._make_key(key)
            ttl = ttl or self.default_ttl
            
            serialized = self._serialize(value)
            result = self.redis_client.setex(cache_key, ttl, serialized)
            
            if result:
                self.stats["sets"] += 1
            return bool(result)
        except Exception as e:
            logger.error(f"Redis set error: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """
        Delete key from cache
        """
        try:
            cache_key = self._make_key(key)
            result = self.redis_client.delete(cache_key)
            
            if result:
                self.stats["deletes"] += 1
            return bool(result)
        except Exception as e:
            logger.error(f"Redis delete error: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """
        Check if key exists in cache
        """
        try:
            cache_key = self._make_key(key)
            return bool(self.redis_client.exists(cache_key))
        except Exception as e:
            logger.error(f"Redis exists error: {e}")
            return False
    
    def mget(self, keys: List[str]) -> Dict[str, Any]:
        """
        Get multiple values at once
        """
        try:
            cache_keys = [self._make_key(k) for k in keys]
            values = self.redis_client.mget(cache_keys)
            
            result = {}
            for key, value in zip(keys, values):
                if value is not None:
                    result[key] = self._deserialize(value)
                    self.stats["hits"] += 1
                else:
                    self.stats["misses"] += 1
                    
            return result
        except Exception as e:
            logger.error(f"Redis mget error: {e}")
            return {}
    
    def mset(self, mapping: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """
        Set multiple values at once
        """
        try:
            ttl = ttl or self.default_ttl
            pipe = self.redis_client.pipeline()
            
            for key, value in mapping.items():
                cache_key = self._make_key(key)
                serialized = self._serialize(value)
                pipe.setex(cache_key, ttl, serialized)
                
            results = pipe.execute()
            self.stats["sets"] += len([r for r in results if r])
            
            return all(results)
        except Exception as e:
            logger.error(f"Redis mset error: {e}")
            return False
    
    def increment(self, key: str, amount: int = 1) -> int:
        """
        Increment a counter
        """
        try:
            cache_key = self._make_key(key)
            return self.redis_client.incrby(cache_key, amount)
        except Exception as e:
            logger.error(f"Redis increment error: {e}")
            return 0
    
    def decrement(self, key: str, amount: int = 1) -> int:
        """
        Decrement a counter
        """
        try:
            cache_key = self._make_key(key)
            return self.redis_client.decrby(cache_key, amount)
        except Exception as e:
            logger.error(f"Redis decrement error: {e}")
            return 0
    
    def expire(self, key: str, ttl: int) -> bool:
        """
        Set expiration time for a key
        """
        try:
            cache_key = self._make_key(key)
            return bool(self.redis_client.expire(cache_key, ttl))
        except Exception as e:
            logger.error(f"Redis expire error: {e}")
            return False
    
    def ttl(self, key: str) -> int:
        """
        Get remaining TTL for a key
        """
        try:
            cache_key = self._make_key(key)
            return self.redis_client.ttl(cache_key)
        except Exception as e:
            logger.error(f"Redis ttl error: {e}")
            return -1
    
    def clear_pattern(self, pattern: str) -> int:
        """
        Clear all keys matching a pattern
        """
        try:
            cache_pattern = self._make_key(pattern)
            keys = self.redis_client.keys(cache_pattern)
            
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Redis clear_pattern error: {e}")
            return 0
    
    def clear_all(self) -> bool:
        """
        Clear all cache (use with caution)
        """
        try:
            return bool(self.redis_client.flushdb())
        except Exception as e:
            logger.error(f"Redis clear_all error: {e}")
            return False
    
    def get_stats(self) -> Dict:
        """
        Get cache statistics
        """
        info = self.redis_client.info()
        
        return {
            "cache_stats": self.stats,
            "redis_info": {
                "used_memory": info.get('used_memory_human'),
                "connected_clients": info.get('connected_clients'),
                "total_connections": info.get('total_connections_received'),
                "keyspace_hits": info.get('keyspace_hits'),
                "keyspace_misses": info.get('keyspace_misses'),
                "evicted_keys": info.get('evicted_keys'),
                "expired_keys": info.get('expired_keys')
            },
            "hit_rate": (self.stats["hits"] / 
                        max(self.stats["hits"] + self.stats["misses"], 1)) * 100
        }
    
    # Session management methods
    def set_session(self, session_id: str, data: Dict, ttl: int = 3600) -> bool:
        """
        Store user session data
        """
        key = f"session:{session_id}"
        return self.set(key, data, ttl)
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """
        Get user session data
        """
        key = f"session:{session_id}"
        return self.get(key)
    
    def delete_session(self, session_id: str) -> bool:
        """
        Delete user session
        """
        key = f"session:{session_id}"
        return self.delete(key)
    
    def extend_session(self, session_id: str, ttl: int = 3600) -> bool:
        """
        Extend session TTL
        """
        key = f"session:{session_id}"
        return self.expire(key, ttl)
    
    # API response caching
    def cache_api_response(self, endpoint: str, params: Dict, 
                          response: Any, ttl: int = 300) -> bool:
        """
        Cache API response
        """
        # Create cache key from endpoint and params
        param_str = json.dumps(params, sort_keys=True)
        key_hash = hashlib.md5(param_str.encode()).hexdigest()
        key = f"api:{endpoint}:{key_hash}"
        
        return self.set(key, response, ttl)
    
    def get_api_response(self, endpoint: str, params: Dict) -> Optional[Any]:
        """
        Get cached API response
        """
        param_str = json.dumps(params, sort_keys=True)
        key_hash = hashlib.md5(param_str.encode()).hexdigest()
        key = f"api:{endpoint}:{key_hash}"
        
        return self.get(key)
    
    # Query result caching
    def cache_query_result(self, query: str, result: Any, ttl: int = 600) -> bool:
        """
        Cache database query result
        """
        query_hash = hashlib.md5(query.encode()).hexdigest()
        key = f"query:{query_hash}"
        
        return self.set(key, result, ttl)
    
    def get_query_result(self, query: str) -> Optional[Any]:
        """
        Get cached query result
        """
        query_hash = hashlib.md5(query.encode()).hexdigest()
        key = f"query:{query_hash}"
        
        return self.get(key)
    
    # Rate limiting
    def check_rate_limit(self, identifier: str, limit: int = 100, 
                         window: int = 60) -> tuple[bool, int]:
        """
        Check if rate limit is exceeded
        Returns (is_allowed, remaining_requests)
        """
        key = f"rate_limit:{identifier}"
        
        try:
            current = self.increment(key)
            
            if current == 1:
                # First request in window
                self.expire(key, window)
            
            if current > limit:
                return False, 0
            
            return True, limit - current
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            return True, limit  # Allow on error
    
    # Distributed locking
    def acquire_lock(self, resource: str, ttl: int = 10) -> bool:
        """
        Acquire a distributed lock
        """
        key = f"lock:{resource}"
        
        try:
            return bool(self.redis_client.set(
                self._make_key(key),
                "locked",
                nx=True,
                ex=ttl
            ))
        except Exception as e:
            logger.error(f"Lock acquisition error: {e}")
            return False
    
    def release_lock(self, resource: str) -> bool:
        """
        Release a distributed lock
        """
        key = f"lock:{resource}"
        return self.delete(key)
    
    def is_locked(self, resource: str) -> bool:
        """
        Check if resource is locked
        """
        key = f"lock:{resource}"
        return self.exists(key)
    
    # Pub/Sub functionality
    def publish(self, channel: str, message: Any) -> int:
        """
        Publish message to channel
        """
        try:
            serialized = self._serialize(message)
            return self.redis_client.publish(
                self._make_key(f"channel:{channel}"),
                serialized
            )
        except Exception as e:
            logger.error(f"Publish error: {e}")
            return 0
    
    def subscribe(self, channels: List[str]):
        """
        Subscribe to channels
        """
        pubsub = self.redis_client.pubsub()
        channel_names = [self._make_key(f"channel:{ch}") for ch in channels]
        pubsub.subscribe(*channel_names)
        return pubsub
    
    # Cache warming
    def warm_cache(self, data: Dict[str, Any], ttl: Optional[int] = None) -> int:
        """
        Pre-populate cache with data
        """
        success_count = 0
        
        for key, value in data.items():
            if self.set(key, value, ttl):
                success_count += 1
        
        logger.info(f"Cache warmed with {success_count}/{len(data)} items")
        return success_count
    
    def __del__(self):
        """
        Clean up connection pool
        """
        try:
            self.pool.disconnect()
        except:
            pass


def cache_decorator(ttl: int = 300, prefix: str = ""):
    """
    Decorator for caching function results
    
    Usage:
        @cache_decorator(ttl=600)
        def expensive_function(param1, param2):
            return result
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            key_parts = [func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
            
            cache_key = ":".join(key_parts)
            if prefix:
                cache_key = f"{prefix}:{cache_key}"
            
            # Try to get from cache
            cache = kwargs.pop('_cache', None)
            if cache:
                cached = cache.get(cache_key)
                if cached is not None:
                    return cached
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            if cache and result is not None:
                cache.set(cache_key, result, ttl)
            
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Similar logic for synchronous functions
            key_parts = [func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
            
            cache_key = ":".join(key_parts)
            if prefix:
                cache_key = f"{prefix}:{cache_key}"
            
            cache = kwargs.pop('_cache', None)
            if cache:
                cached = cache.get(cache_key)
                if cached is not None:
                    return cached
            
            result = func(*args, **kwargs)
            
            if cache and result is not None:
                cache.set(cache_key, result, ttl)
            
            return result
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


# Global cache instance
_cache_instance = None

def get_cache() -> RedisCache:
    """
    Get or create global cache instance
    """
    global _cache_instance
    
    if _cache_instance is None:
        import os
        _cache_instance = RedisCache(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=int(os.getenv('REDIS_DB', 0)),
            password=os.getenv('REDIS_PASSWORD')
        )
    
    return _cache_instance