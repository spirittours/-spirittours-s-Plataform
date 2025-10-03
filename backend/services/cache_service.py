"""
Advanced Redis Cache Service for Enterprise Booking Platform
Provides distributed caching, session management, and performance optimization
"""

import asyncio
import json
import logging
import pickle
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union, Callable
from dataclasses import dataclass
from enum import Enum
import hashlib
import redis.asyncio as redis
from redis.asyncio import Redis
import aioredis
from pydantic import BaseModel
import msgpack

# Configure logging
logger = logging.getLogger(__name__)

class CacheStrategy(str, Enum):
    """Cache strategies for different data types"""
    WRITE_THROUGH = "write_through"
    WRITE_BEHIND = "write_behind"
    WRITE_AROUND = "write_around"
    READ_THROUGH = "read_through"
    REFRESH_AHEAD = "refresh_ahead"

class SerializationMethod(str, Enum):
    """Serialization methods for cached data"""
    JSON = "json"
    PICKLE = "pickle"
    MSGPACK = "msgpack"
    STRING = "string"

@dataclass
class CacheConfig:
    """Redis cache configuration"""
    host: str = "localhost"
    port: int = 6379
    password: Optional[str] = None
    db: int = 0
    
    # Connection pooling
    max_connections: int = 100
    retry_on_timeout: bool = True
    socket_keepalive: bool = True
    socket_keepalive_options: Dict = None
    
    # Default TTL settings (seconds)
    default_ttl: int = 3600  # 1 hour
    session_ttl: int = 86400  # 24 hours
    query_cache_ttl: int = 1800  # 30 minutes
    user_cache_ttl: int = 7200  # 2 hours
    
    # Compression and serialization
    compress_threshold: int = 1024  # Compress data larger than 1KB
    default_serialization: SerializationMethod = SerializationMethod.JSON
    
    # Key prefixes
    session_prefix: str = "session:"
    user_prefix: str = "user:"
    query_prefix: str = "query:"
    api_prefix: str = "api:"
    booking_prefix: str = "booking:"
    notification_prefix: str = "notification:"
    
    # Performance settings
    pipeline_size: int = 100
    enable_monitoring: bool = True
    
    def __post_init__(self):
        if self.socket_keepalive_options is None:
            self.socket_keepalive_options = {}

class CacheItem(BaseModel):
    """Cache item with metadata"""
    key: str
    value: Any
    ttl: Optional[int] = None
    created_at: datetime
    accessed_at: datetime
    access_count: int = 0
    serialization_method: SerializationMethod = SerializationMethod.JSON
    compressed: bool = False
    tags: List[str] = []

class CacheStats(BaseModel):
    """Cache statistics"""
    total_keys: int
    memory_usage: int
    hits: int
    misses: int
    hit_ratio: float
    operations_per_second: float
    connected_clients: int
    uptime_seconds: int

class RedisCache:
    """Advanced Redis cache with enterprise features"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.redis_pool: Optional[Redis] = None
        self.stats = {
            "hits": 0,
            "misses": 0,
            "operations": 0,
            "errors": 0
        }
        
    async def initialize(self):
        """Initialize Redis connection pool"""
        try:
            self.redis_pool = redis.Redis(
                host=self.config.host,
                port=self.config.port,
                password=self.config.password,
                db=self.config.db,
                max_connections=self.config.max_connections,
                retry_on_timeout=self.config.retry_on_timeout,
                socket_keepalive=self.config.socket_keepalive,
                socket_keepalive_options=self.config.socket_keepalive_options,
                decode_responses=False  # We handle encoding/decoding manually
            )
            
            # Test connection
            await self.redis_pool.ping()
            logger.info(f"✅ Redis cache initialized: {self.config.host}:{self.config.port}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Redis cache initialization failed: {str(e)}")
            return False
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_pool:
            await self.redis_pool.close()
            logger.info("Redis connection closed")
    
    def _serialize_data(self, data: Any, method: SerializationMethod = None) -> bytes:
        """Serialize data for storage"""
        if method is None:
            method = self.config.default_serialization
        
        try:
            if method == SerializationMethod.JSON:
                return json.dumps(data, default=str).encode('utf-8')
            elif method == SerializationMethod.PICKLE:
                return pickle.dumps(data)
            elif method == SerializationMethod.MSGPACK:
                return msgpack.packb(data, default=str)
            elif method == SerializationMethod.STRING:
                return str(data).encode('utf-8')
            else:
                raise ValueError(f"Unsupported serialization method: {method}")
                
        except Exception as e:
            logger.error(f"Serialization failed: {str(e)}")
            raise
    
    def _deserialize_data(self, data: bytes, method: SerializationMethod = None) -> Any:
        """Deserialize data from storage"""
        if method is None:
            method = self.config.default_serialization
        
        try:
            if method == SerializationMethod.JSON:
                return json.loads(data.decode('utf-8'))
            elif method == SerializationMethod.PICKLE:
                return pickle.loads(data)
            elif method == SerializationMethod.MSGPACK:
                return msgpack.unpackb(data, raw=False)
            elif method == SerializationMethod.STRING:
                return data.decode('utf-8')
            else:
                raise ValueError(f"Unsupported serialization method: {method}")
                
        except Exception as e:
            logger.error(f"Deserialization failed: {str(e)}")
            raise
    
    def _generate_cache_key(self, key: str, prefix: str = "") -> str:
        """Generate standardized cache key"""
        if prefix:
            return f"{prefix}{key}"
        return key
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None,
        prefix: str = "",
        serialization: SerializationMethod = None,
        tags: List[str] = None
    ) -> bool:
        """Set cache value with optional TTL and metadata"""
        
        if not self.redis_pool:
            logger.warning("Redis not initialized")
            return False
        
        try:
            cache_key = self._generate_cache_key(key, prefix)
            
            # Serialize data
            serialized_data = self._serialize_data(value, serialization)
            
            # Set TTL
            if ttl is None:
                ttl = self.config.default_ttl
            
            # Store in Redis
            success = await self.redis_pool.setex(cache_key, ttl, serialized_data)
            
            # Store metadata if tags provided
            if tags:
                metadata_key = f"meta:{cache_key}"
                metadata = {
                    "tags": tags,
                    "serialization": serialization or self.config.default_serialization,
                    "created_at": datetime.utcnow().isoformat(),
                    "ttl": ttl
                }
                await self.redis_pool.setex(
                    metadata_key, 
                    ttl + 60,  # Keep metadata slightly longer
                    json.dumps(metadata)
                )
            
            if success:
                self.stats["operations"] += 1
                logger.debug(f"Cache SET: {cache_key} (TTL: {ttl}s)")
            
            return success
            
        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"Cache SET failed for key {key}: {str(e)}")
            return False
    
    async def get(
        self, 
        key: str, 
        prefix: str = "",
        serialization: SerializationMethod = None,
        default: Any = None
    ) -> Any:
        """Get cache value with automatic deserialization"""
        
        if not self.redis_pool:
            logger.warning("Redis not initialized")
            return default
        
        try:
            cache_key = self._generate_cache_key(key, prefix)
            
            # Get data from Redis
            data = await self.redis_pool.get(cache_key)
            
            if data is None:
                self.stats["misses"] += 1
                logger.debug(f"Cache MISS: {cache_key}")
                return default
            
            # Deserialize data
            result = self._deserialize_data(data, serialization)
            
            self.stats["hits"] += 1
            self.stats["operations"] += 1
            logger.debug(f"Cache HIT: {cache_key}")
            
            return result
            
        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"Cache GET failed for key {key}: {str(e)}")
            return default
    
    async def get_or_set(
        self,
        key: str,
        func: Callable,
        ttl: Optional[int] = None,
        prefix: str = "",
        serialization: SerializationMethod = None,
        force_refresh: bool = False
    ) -> Any:
        """Get value from cache or execute function and cache result"""
        
        cache_key = self._generate_cache_key(key, prefix)
        
        # Try to get from cache first (unless force refresh)
        if not force_refresh:
            cached_value = await self.get(key, prefix, serialization)
            if cached_value is not None:
                return cached_value
        
        # Execute function to get fresh data
        try:
            if asyncio.iscoroutinefunction(func):
                fresh_value = await func()
            else:
                fresh_value = func()
            
            # Cache the result
            await self.set(key, fresh_value, ttl, prefix, serialization)
            
            return fresh_value
            
        except Exception as e:
            logger.error(f"Function execution failed for cache key {key}: {str(e)}")
            # Return cached value if function fails and we have one
            return await self.get(key, prefix, serialization)
    
    async def delete(self, key: str, prefix: str = "") -> bool:
        """Delete cache entry"""
        
        if not self.redis_pool:
            return False
        
        try:
            cache_key = self._generate_cache_key(key, prefix)
            
            # Delete main key and metadata
            result = await self.redis_pool.delete(cache_key)
            await self.redis_pool.delete(f"meta:{cache_key}")
            
            if result:
                self.stats["operations"] += 1
                logger.debug(f"Cache DELETE: {cache_key}")
            
            return bool(result)
            
        except Exception as e:
            self.stats["errors"] += 1
            logger.error(f"Cache DELETE failed for key {key}: {str(e)}")
            return False
    
    async def delete_by_pattern(self, pattern: str, prefix: str = "") -> int:
        """Delete multiple keys matching pattern"""
        
        if not self.redis_pool:
            return 0
        
        try:
            full_pattern = self._generate_cache_key(pattern, prefix)
            
            # Get all matching keys
            keys = []
            async for key in self.redis_pool.scan_iter(match=full_pattern):
                keys.append(key)
            
            if keys:
                deleted = await self.redis_pool.delete(*keys)
                logger.info(f"Cache BULK DELETE: {deleted} keys matching pattern {full_pattern}")
                return deleted
            
            return 0
            
        except Exception as e:
            logger.error(f"Cache BULK DELETE failed for pattern {pattern}: {str(e)}")
            return 0
    
    async def delete_by_tags(self, tags: List[str]) -> int:
        """Delete cache entries by tags"""
        
        if not self.redis_pool:
            return 0
        
        try:
            deleted_count = 0
            
            # Find all metadata keys
            async for meta_key in self.redis_pool.scan_iter(match="meta:*"):
                try:
                    meta_data = await self.redis_pool.get(meta_key)
                    if meta_data:
                        metadata = json.loads(meta_data)
                        item_tags = metadata.get("tags", [])
                        
                        # Check if any of the target tags match
                        if any(tag in item_tags for tag in tags):
                            # Delete both the main key and metadata
                            main_key = meta_key.decode().replace("meta:", "")
                            await self.redis_pool.delete(main_key, meta_key)
                            deleted_count += 1
                            
                except Exception as e:
                    logger.warning(f"Error processing metadata key {meta_key}: {str(e)}")
                    continue
            
            logger.info(f"Cache DELETE BY TAGS: {deleted_count} keys deleted for tags {tags}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Cache DELETE BY TAGS failed: {str(e)}")
            return 0
    
    async def exists(self, key: str, prefix: str = "") -> bool:
        """Check if key exists in cache"""
        
        if not self.redis_pool:
            return False
        
        try:
            cache_key = self._generate_cache_key(key, prefix)
            result = await self.redis_pool.exists(cache_key)
            return bool(result)
            
        except Exception as e:
            logger.error(f"Cache EXISTS check failed for key {key}: {str(e)}")
            return False
    
    async def ttl(self, key: str, prefix: str = "") -> int:
        """Get time-to-live for key"""
        
        if not self.redis_pool:
            return -1
        
        try:
            cache_key = self._generate_cache_key(key, prefix)
            return await self.redis_pool.ttl(cache_key)
            
        except Exception as e:
            logger.error(f"Cache TTL check failed for key {key}: {str(e)}")
            return -1
    
    async def extend_ttl(self, key: str, additional_seconds: int, prefix: str = "") -> bool:
        """Extend TTL for existing key"""
        
        if not self.redis_pool:
            return False
        
        try:
            cache_key = self._generate_cache_key(key, prefix)
            current_ttl = await self.redis_pool.ttl(cache_key)
            
            if current_ttl > 0:
                new_ttl = current_ttl + additional_seconds
                result = await self.redis_pool.expire(cache_key, new_ttl)
                return bool(result)
            
            return False
            
        except Exception as e:
            logger.error(f"Cache TTL extend failed for key {key}: {str(e)}")
            return False
    
    async def get_stats(self) -> CacheStats:
        """Get cache statistics"""
        
        if not self.redis_pool:
            return CacheStats(
                total_keys=0, memory_usage=0, hits=0, misses=0,
                hit_ratio=0.0, operations_per_second=0.0,
                connected_clients=0, uptime_seconds=0
            )
        
        try:
            # Get Redis info
            info = await self.redis_pool.info()
            
            # Calculate hit ratio
            total_requests = self.stats["hits"] + self.stats["misses"]
            hit_ratio = (self.stats["hits"] / total_requests * 100) if total_requests > 0 else 0.0
            
            return CacheStats(
                total_keys=info.get("db0", {}).get("keys", 0),
                memory_usage=info.get("used_memory", 0),
                hits=self.stats["hits"],
                misses=self.stats["misses"],
                hit_ratio=round(hit_ratio, 2),
                operations_per_second=info.get("instantaneous_ops_per_sec", 0),
                connected_clients=info.get("connected_clients", 0),
                uptime_seconds=info.get("uptime_in_seconds", 0)
            )
            
        except Exception as e:
            logger.error(f"Failed to get cache stats: {str(e)}")
            return CacheStats(
                total_keys=0, memory_usage=0, 
                hits=self.stats["hits"], misses=self.stats["misses"],
                hit_ratio=0.0, operations_per_second=0.0,
                connected_clients=0, uptime_seconds=0
            )
    
    async def flush_all(self) -> bool:
        """Clear all cache entries (use with caution)"""
        
        if not self.redis_pool:
            return False
        
        try:
            await self.redis_pool.flushdb()
            logger.warning("🗑️ All cache entries cleared!")
            
            # Reset stats
            self.stats = {"hits": 0, "misses": 0, "operations": 0, "errors": 0}
            
            return True
            
        except Exception as e:
            logger.error(f"Cache flush failed: {str(e)}")
            return False
    
    async def pipeline_operations(self, operations: List[Dict[str, Any]]) -> List[Any]:
        """Execute multiple cache operations in pipeline for better performance"""
        
        if not self.redis_pool:
            return []
        
        try:
            pipe = self.redis_pool.pipeline()
            
            for op in operations:
                operation = op.get("operation")
                key = op.get("key")
                value = op.get("value")
                ttl = op.get("ttl")
                prefix = op.get("prefix", "")
                
                cache_key = self._generate_cache_key(key, prefix)
                
                if operation == "set":
                    serialized_data = self._serialize_data(value)
                    if ttl:
                        pipe.setex(cache_key, ttl, serialized_data)
                    else:
                        pipe.set(cache_key, serialized_data)
                elif operation == "get":
                    pipe.get(cache_key)
                elif operation == "delete":
                    pipe.delete(cache_key)
                elif operation == "exists":
                    pipe.exists(cache_key)
            
            results = await pipe.execute()
            self.stats["operations"] += len(operations)
            
            return results
            
        except Exception as e:
            logger.error(f"Pipeline operations failed: {str(e)}")
            return []

class SessionCache:
    """Specialized cache for user sessions"""
    
    def __init__(self, redis_cache: RedisCache):
        self.cache = redis_cache
        self.prefix = redis_cache.config.session_prefix
    
    async def create_session(self, user_id: str, session_data: Dict[str, Any], ttl: Optional[int] = None) -> str:
        """Create new user session"""
        
        import uuid
        session_id = str(uuid.uuid4())
        
        session_info = {
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "last_accessed": datetime.utcnow().isoformat(),
            "data": session_data
        }
        
        ttl = ttl or self.cache.config.session_ttl
        success = await self.cache.set(
            session_id, session_info, ttl, self.prefix,
            tags=["session", f"user:{user_id}"]
        )
        
        return session_id if success else None
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data and update last accessed time"""
        
        session_info = await self.cache.get(session_id, self.prefix)
        
        if session_info:
            # Update last accessed time
            session_info["last_accessed"] = datetime.utcnow().isoformat()
            await self.cache.set(
                session_id, session_info, 
                self.cache.config.session_ttl, self.prefix
            )
        
        return session_info
    
    async def update_session(self, session_id: str, data: Dict[str, Any]) -> bool:
        """Update session data"""
        
        session_info = await self.cache.get(session_id, self.prefix)
        
        if session_info:
            session_info["data"].update(data)
            session_info["last_accessed"] = datetime.utcnow().isoformat()
            
            return await self.cache.set(
                session_id, session_info,
                self.cache.config.session_ttl, self.prefix
            )
        
        return False
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session"""
        return await self.cache.delete(session_id, self.prefix)
    
    async def delete_user_sessions(self, user_id: str) -> int:
        """Delete all sessions for a user"""
        return await self.cache.delete_by_tags([f"user:{user_id}"])

class QueryCache:
    """Specialized cache for API query results"""
    
    def __init__(self, redis_cache: RedisCache):
        self.cache = redis_cache
        self.prefix = redis_cache.config.query_prefix
    
    def _generate_query_key(self, endpoint: str, params: Dict[str, Any], user_id: str = None) -> str:
        """Generate cache key for query"""
        
        # Create deterministic key from endpoint and params
        param_str = json.dumps(params, sort_keys=True, default=str)
        key_data = f"{endpoint}:{param_str}"
        
        if user_id:
            key_data += f":user:{user_id}"
        
        # Use hash to keep keys short
        return hashlib.md5(key_data.encode()).hexdigest()
    
    async def get_query_result(
        self, 
        endpoint: str, 
        params: Dict[str, Any], 
        user_id: str = None
    ) -> Optional[Any]:
        """Get cached query result"""
        
        query_key = self._generate_query_key(endpoint, params, user_id)
        return await self.cache.get(query_key, self.prefix)
    
    async def cache_query_result(
        self,
        endpoint: str,
        params: Dict[str, Any],
        result: Any,
        ttl: Optional[int] = None,
        user_id: str = None
    ) -> bool:
        """Cache query result"""
        
        query_key = self._generate_query_key(endpoint, params, user_id)
        ttl = ttl or self.cache.config.query_cache_ttl
        
        tags = ["query", f"endpoint:{endpoint}"]
        if user_id:
            tags.append(f"user:{user_id}")
        
        return await self.cache.set(query_key, result, ttl, self.prefix, tags=tags)
    
    async def invalidate_endpoint_cache(self, endpoint: str) -> int:
        """Invalidate all cached results for an endpoint"""
        return await self.cache.delete_by_tags([f"endpoint:{endpoint}"])
    
    async def invalidate_user_cache(self, user_id: str) -> int:
        """Invalidate all cached results for a user"""
        return await self.cache.delete_by_tags([f"user:{user_id}"])

class CacheService:
    """Main cache service with enterprise features"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.redis_cache = RedisCache(config)
        self.session_cache = SessionCache(self.redis_cache)
        self.query_cache = QueryCache(self.redis_cache)
        
    async def initialize(self) -> bool:
        """Initialize cache service"""
        return await self.redis_cache.initialize()
    
    async def close(self):
        """Close cache service"""
        await self.redis_cache.close()
    
    def cache_decorator(self, ttl: int = None, prefix: str = "", key_func: Callable = None):
        """Decorator for caching function results"""
        
        def decorator(func):
            async def wrapper(*args, **kwargs):
                # Generate cache key
                if key_func:
                    cache_key = key_func(*args, **kwargs)
                else:
                    # Default key generation
                    key_parts = [func.__name__]
                    key_parts.extend([str(arg) for arg in args])
                    key_parts.extend([f"{k}:{v}" for k, v in kwargs.items()])
                    cache_key = ":".join(key_parts)
                
                # Try to get from cache
                cached_result = await self.redis_cache.get(cache_key, prefix)
                if cached_result is not None:
                    return cached_result
                
                # Execute function
                result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
                
                # Cache result
                await self.redis_cache.set(cache_key, result, ttl, prefix)
                
                return result
            
            return wrapper
        return decorator

# Utility functions
def create_cache_service(
    host: str = "localhost",
    port: int = 6379,
    password: str = None,
    db: int = 0
) -> CacheService:
    """Create cache service with default configuration"""
    
    config = CacheConfig(
        host=host,
        port=port,
        password=password,
        db=db
    )
    
    return CacheService(config)

# Export main classes
__all__ = [
    "CacheService",
    "RedisCache", 
    "SessionCache",
    "QueryCache",
    "CacheConfig",
    "CacheStrategy",
    "SerializationMethod",
    "CacheStats",
    "create_cache_service"
]