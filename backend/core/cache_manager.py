"""
Advanced Redis Cache Manager
Implements intelligent caching strategies
"""

from typing import Any, Optional, Callable
import redis
from redis.client import Redis
import json
import hashlib
from functools import wraps
from datetime import timedelta
import pickle

class RedisCacheManager:
    """Advanced Redis caching with strategies"""
    
    def __init__(self, host: str = 'localhost', port: int = 6379, db: int = 0):
        self.redis: Redis = redis.Redis(
            host=host,
            port=port,
            db=db,
            decode_responses=False  # For pickle support
        )
        self.default_ttl = 300  # 5 minutes
        
    def get(self, key: str) -> Optional[Any]:
        """Get cached value"""
        try:
            value = self.redis.get(key)
            if value:
                return pickle.loads(value)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set cached value with TTL"""
        try:
            serialized = pickle.dumps(value)
            if ttl:
                return self.redis.setex(key, ttl, serialized)
            return self.redis.set(key, serialized)
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete cached value"""
        try:
            return bool(self.redis.delete(key))
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        try:
            keys = self.redis.keys(pattern)
            if keys:
                return self.redis.delete(*keys)
            return 0
        except Exception as e:
            print(f"Cache delete pattern error: {e}")
            return 0
    
    def exists(self, key: str) -> bool:
        """Check if key exists"""
        return bool(self.redis.exists(key))
    
    def get_ttl(self, key: str) -> int:
        """Get remaining TTL for key"""
        return self.redis.ttl(key)
    
    def cache_aside(
        self,
        key: str,
        fetch_func: Callable,
        ttl: Optional[int] = None
    ) -> Any:
        """
        Cache-Aside Pattern (Lazy Loading)
        Check cache first, fetch from DB if miss
        """
        cached = self.get(key)
        if cached is not None:
            return cached
        
        # Cache miss - fetch from source
        value = fetch_func()
        if value is not None:
            self.set(key, value, ttl or self.default_ttl)
        return value
    
    def write_through(self, key: str, value: Any, write_func: Callable) -> bool:
        """
        Write-Through Pattern
        Write to cache and DB simultaneously
        """
        try:
            # Write to DB first
            write_func(value)
            # Then update cache
            return self.set(key, value)
        except Exception as e:
            print(f"Write-through error: {e}")
            return False
    
    def write_behind(self, key: str, value: Any) -> bool:
        """
        Write-Behind Pattern (Write-Back)
        Write to cache immediately, DB async later
        """
        # Add to queue for async DB write
        queue_key = f"write_queue:{key}"
        self.redis.rpush(queue_key, pickle.dumps(value))
        return self.set(key, value)
    
    def cache_warming(self, keys_data: dict[str, tuple[Callable, int]]):
        """
        Cache Warming Strategy
        Pre-populate cache with frequently accessed data
        """
        for key, (fetch_func, ttl) in keys_data.items():
            try:
                value = fetch_func()
                if value:
                    self.set(key, value, ttl)
            except Exception as e:
                print(f"Cache warming error for {key}: {e}")
    
    def invalidate_related(self, tag: str):
        """
        Tag-based Invalidation
        Invalidate all caches with specific tag
        """
        tag_key = f"tag:{tag}"
        keys = self.redis.smembers(tag_key)
        if keys:
            self.redis.delete(*keys)
            self.redis.delete(tag_key)
    
    def add_tag(self, key: str, tag: str):
        """Add tag to cache key for group invalidation"""
        tag_key = f"tag:{tag}"
        self.redis.sadd(tag_key, key)


# Decorator for automatic caching
def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator for function result caching
    Usage: @cached(ttl=600, key_prefix="tours")
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_manager = RedisCacheManager()
            key_parts = [key_prefix or func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            
            cache_key = ":".join(key_parts)
            cache_key_hash = hashlib.md5(cache_key.encode()).hexdigest()
            
            # Try to get from cache
            result = cache_manager.get(cache_key_hash)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(cache_key_hash, result, ttl)
            return result
        
        return wrapper
    return decorator


# Global cache manager instance
cache_manager = RedisCacheManager()
