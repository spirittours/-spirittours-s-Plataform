"""
Cache Management API for Enterprise Booking Platform
Provides cache administration and monitoring capabilities
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from ..config.database import get_db
from ..services.cache_service import (
    CacheService, CacheConfig, CacheStats, SerializationMethod,
    create_cache_service
)
from ..auth.dependencies import get_current_user
from pydantic import BaseModel, Field
import os

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/cache", tags=["cache"])

# Pydantic models
class CacheItemRequest(BaseModel):
    key: str = Field(..., description="Cache key")
    value: Any = Field(..., description="Value to cache")
    ttl: Optional[int] = Field(None, description="Time to live in seconds")
    prefix: str = Field("", description="Key prefix")
    tags: List[str] = Field(default_factory=list, description="Cache tags for grouping")

class CacheGetRequest(BaseModel):
    key: str = Field(..., description="Cache key")
    prefix: str = Field("", description="Key prefix")
    default: Any = Field(None, description="Default value if key not found")

class CacheDeleteRequest(BaseModel):
    keys: List[str] = Field(..., description="Keys to delete")
    prefix: str = Field("", description="Key prefix")

class CachePatternDeleteRequest(BaseModel):
    pattern: str = Field(..., description="Pattern to match for deletion (supports wildcards)")
    prefix: str = Field("", description="Key prefix")

class CacheTagsDeleteRequest(BaseModel):
    tags: List[str] = Field(..., description="Tags to delete")

class CacheResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
    error: Optional[str] = None

class SessionCreateRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    session_data: Dict[str, Any] = Field(..., description="Session data")
    ttl: Optional[int] = Field(None, description="Session TTL in seconds")

class SessionUpdateRequest(BaseModel):
    session_id: str = Field(..., description="Session ID")
    data: Dict[str, Any] = Field(..., description="Data to update")

class QueryCacheRequest(BaseModel):
    endpoint: str = Field(..., description="API endpoint")
    params: Dict[str, Any] = Field(..., description="Request parameters")
    result: Any = Field(..., description="Result to cache")
    ttl: Optional[int] = Field(None, description="TTL in seconds")
    user_id: Optional[str] = Field(None, description="User ID for personalized cache")

class CacheStatsResponse(BaseModel):
    total_keys: int
    memory_usage: int
    hits: int
    misses: int
    hit_ratio: float
    operations_per_second: float
    connected_clients: int
    uptime_seconds: int
    service_stats: Dict[str, int]

class PipelineOperation(BaseModel):
    operation: str = Field(..., description="Operation type: set, get, delete, exists")
    key: str = Field(..., description="Cache key")
    value: Optional[Any] = Field(None, description="Value for set operations")
    ttl: Optional[int] = Field(None, description="TTL for set operations")
    prefix: str = Field("", description="Key prefix")

class PipelineRequest(BaseModel):
    operations: List[PipelineOperation] = Field(..., description="List of operations to execute")

# Dependency to get cache service
def get_cache_service() -> CacheService:
    """Get cache service with configuration from environment"""
    
    config = CacheConfig(
        host=os.environ.get("REDIS_HOST", "localhost"),
        port=int(os.environ.get("REDIS_PORT", "6379")),
        password=os.environ.get("REDIS_PASSWORD"),
        db=int(os.environ.get("REDIS_DB", "0")),
        max_connections=int(os.environ.get("REDIS_MAX_CONNECTIONS", "100")),
        default_ttl=int(os.environ.get("CACHE_DEFAULT_TTL", "3600")),
        session_ttl=int(os.environ.get("CACHE_SESSION_TTL", "86400")),
        query_cache_ttl=int(os.environ.get("CACHE_QUERY_TTL", "1800"))
    )
    
    return CacheService(config)

# Basic Cache Operations
@router.post("/set", response_model=CacheResponse)
async def set_cache_item(
    request: CacheItemRequest,
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Set a cache item"""
    
    try:
        # Check permissions
        user_role = current_user.get("role", "")
        if user_role not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions for cache management")
        
        success = await cache_service.redis_cache.set(
            key=request.key,
            value=request.value,
            ttl=request.ttl,
            prefix=request.prefix,
            tags=request.tags
        )
        
        if success:
            logger.info(f"Cache SET by user {current_user.get('user_id')}: {request.key}")
            return CacheResponse(
                success=True,
                message=f"Cache item '{request.key}' set successfully",
                data={"key": request.key, "ttl": request.ttl}
            )
        else:
            return CacheResponse(
                success=False,
                message="Failed to set cache item",
                error="Redis operation failed"
            )
            
    except Exception as e:
        logger.error(f"Cache SET failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/get", response_model=CacheResponse)
async def get_cache_item(
    request: CacheGetRequest,
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Get a cache item"""
    
    try:
        value = await cache_service.redis_cache.get(
            key=request.key,
            prefix=request.prefix,
            default=request.default
        )
        
        return CacheResponse(
            success=True,
            message=f"Cache item retrieved",
            data={"key": request.key, "value": value, "found": value is not None}
        )
        
    except Exception as e:
        logger.error(f"Cache GET failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete", response_model=CacheResponse)
async def delete_cache_items(
    request: CacheDeleteRequest,
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Delete cache items"""
    
    try:
        # Check permissions
        user_role = current_user.get("role", "")
        if user_role not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions for cache management")
        
        deleted_count = 0
        for key in request.keys:
            success = await cache_service.redis_cache.delete(key, request.prefix)
            if success:
                deleted_count += 1
        
        logger.info(f"Cache DELETE by user {current_user.get('user_id')}: {deleted_count} keys")
        
        return CacheResponse(
            success=True,
            message=f"Deleted {deleted_count} cache items",
            data={"deleted_count": deleted_count, "requested_count": len(request.keys)}
        )
        
    except Exception as e:
        logger.error(f"Cache DELETE failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete-pattern", response_model=CacheResponse)
async def delete_cache_pattern(
    request: CachePatternDeleteRequest,
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Delete cache items matching pattern"""
    
    try:
        # Check permissions - only admins can use pattern deletion
        user_role = current_user.get("role", "")
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Admin role required for pattern deletion")
        
        deleted_count = await cache_service.redis_cache.delete_by_pattern(
            request.pattern, request.prefix
        )
        
        logger.info(f"Cache PATTERN DELETE by user {current_user.get('user_id')}: {deleted_count} keys")
        
        return CacheResponse(
            success=True,
            message=f"Deleted {deleted_count} cache items matching pattern",
            data={"deleted_count": deleted_count, "pattern": request.pattern}
        )
        
    except Exception as e:
        logger.error(f"Cache PATTERN DELETE failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete-tags", response_model=CacheResponse)
async def delete_cache_by_tags(
    request: CacheTagsDeleteRequest,
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Delete cache items by tags"""
    
    try:
        # Check permissions
        user_role = current_user.get("role", "")
        if user_role not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions for cache management")
        
        deleted_count = await cache_service.redis_cache.delete_by_tags(request.tags)
        
        logger.info(f"Cache TAGS DELETE by user {current_user.get('user_id')}: {deleted_count} keys")
        
        return CacheResponse(
            success=True,
            message=f"Deleted {deleted_count} cache items with specified tags",
            data={"deleted_count": deleted_count, "tags": request.tags}
        )
        
    except Exception as e:
        logger.error(f"Cache TAGS DELETE failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Session Management
@router.post("/sessions", response_model=CacheResponse)
async def create_session(
    request: SessionCreateRequest,
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Create a new user session"""
    
    try:
        session_id = await cache_service.session_cache.create_session(
            user_id=request.user_id,
            session_data=request.session_data,
            ttl=request.ttl
        )
        
        if session_id:
            logger.info(f"Session created for user {request.user_id} by {current_user.get('user_id')}")
            return CacheResponse(
                success=True,
                message="Session created successfully",
                data={"session_id": session_id, "user_id": request.user_id}
            )
        else:
            return CacheResponse(
                success=False,
                message="Failed to create session",
                error="Session creation failed"
            )
            
    except Exception as e:
        logger.error(f"Session creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{session_id}", response_model=CacheResponse)
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Get session data"""
    
    try:
        session_data = await cache_service.session_cache.get_session(session_id)
        
        return CacheResponse(
            success=True,
            message="Session retrieved" if session_data else "Session not found",
            data={"session_id": session_id, "session_data": session_data}
        )
        
    except Exception as e:
        logger.error(f"Session retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/sessions", response_model=CacheResponse)
async def update_session(
    request: SessionUpdateRequest,
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Update session data"""
    
    try:
        success = await cache_service.session_cache.update_session(
            session_id=request.session_id,
            data=request.data
        )
        
        if success:
            return CacheResponse(
                success=True,
                message="Session updated successfully",
                data={"session_id": request.session_id}
            )
        else:
            return CacheResponse(
                success=False,
                message="Session not found or update failed",
                error="Session update failed"
            )
            
    except Exception as e:
        logger.error(f"Session update failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}", response_model=CacheResponse)
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Delete a session"""
    
    try:
        success = await cache_service.session_cache.delete_session(session_id)
        
        return CacheResponse(
            success=success,
            message="Session deleted" if success else "Session not found",
            data={"session_id": session_id}
        )
        
    except Exception as e:
        logger.error(f"Session deletion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Query Cache Management
@router.post("/queries", response_model=CacheResponse)
async def cache_query_result(
    request: QueryCacheRequest,
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Cache a query result"""
    
    try:
        success = await cache_service.query_cache.cache_query_result(
            endpoint=request.endpoint,
            params=request.params,
            result=request.result,
            ttl=request.ttl,
            user_id=request.user_id
        )
        
        return CacheResponse(
            success=success,
            message="Query result cached" if success else "Failed to cache query result",
            data={"endpoint": request.endpoint, "user_id": request.user_id}
        )
        
    except Exception as e:
        logger.error(f"Query cache failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queries/{endpoint}", response_model=CacheResponse)
async def get_cached_query(
    endpoint: str,
    params: str = Query(..., description="JSON string of parameters"),
    user_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Get cached query result"""
    
    try:
        import json
        params_dict = json.loads(params)
        
        result = await cache_service.query_cache.get_query_result(
            endpoint=endpoint,
            params=params_dict,
            user_id=user_id
        )
        
        return CacheResponse(
            success=True,
            message="Query result retrieved" if result else "No cached result found",
            data={"endpoint": endpoint, "result": result, "found": result is not None}
        )
        
    except Exception as e:
        logger.error(f"Query cache retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/queries/endpoint/{endpoint}", response_model=CacheResponse)
async def invalidate_endpoint_cache(
    endpoint: str,
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Invalidate all cached results for an endpoint"""
    
    try:
        # Check permissions
        user_role = current_user.get("role", "")
        if user_role not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        deleted_count = await cache_service.query_cache.invalidate_endpoint_cache(endpoint)
        
        logger.info(f"Endpoint cache invalidated by user {current_user.get('user_id')}: {endpoint}")
        
        return CacheResponse(
            success=True,
            message=f"Invalidated {deleted_count} cached queries for endpoint",
            data={"endpoint": endpoint, "deleted_count": deleted_count}
        )
        
    except Exception as e:
        logger.error(f"Endpoint cache invalidation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Cache Statistics and Monitoring
@router.get("/stats", response_model=CacheStatsResponse)
async def get_cache_statistics(
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Get cache statistics and performance metrics"""
    
    try:
        stats = await cache_service.redis_cache.get_stats()
        
        return CacheStatsResponse(
            total_keys=stats.total_keys,
            memory_usage=stats.memory_usage,
            hits=stats.hits,
            misses=stats.misses,
            hit_ratio=stats.hit_ratio,
            operations_per_second=stats.operations_per_second,
            connected_clients=stats.connected_clients,
            uptime_seconds=stats.uptime_seconds,
            service_stats=cache_service.redis_cache.stats
        )
        
    except Exception as e:
        logger.error(f"Cache statistics failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pipeline", response_model=CacheResponse)
async def execute_pipeline(
    request: PipelineRequest,
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Execute multiple cache operations in pipeline for better performance"""
    
    try:
        # Check permissions for write operations
        write_ops = ["set", "delete"]
        has_write_ops = any(op.operation in write_ops for op in request.operations)
        
        if has_write_ops:
            user_role = current_user.get("role", "")
            if user_role not in ["admin", "manager"]:
                raise HTTPException(status_code=403, detail="Insufficient permissions for write operations")
        
        # Convert to format expected by pipeline
        operations = []
        for op in request.operations:
            operations.append({
                "operation": op.operation,
                "key": op.key,
                "value": op.value,
                "ttl": op.ttl,
                "prefix": op.prefix
            })
        
        results = await cache_service.redis_cache.pipeline_operations(operations)
        
        logger.info(f"Pipeline executed by user {current_user.get('user_id')}: {len(operations)} operations")
        
        return CacheResponse(
            success=True,
            message=f"Pipeline executed successfully with {len(operations)} operations",
            data={"results": results, "operation_count": len(operations)}
        )
        
    except Exception as e:
        logger.error(f"Pipeline execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Cache Management
@router.post("/flush", response_model=CacheResponse)
async def flush_cache(
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Flush all cache entries (ADMIN ONLY)"""
    
    try:
        # Only admins can flush cache
        user_role = current_user.get("role", "")
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Admin role required for cache flush")
        
        success = await cache_service.redis_cache.flush_all()
        
        if success:
            logger.warning(f"Cache FLUSHED by admin user {current_user.get('user_id')}")
            return CacheResponse(
                success=True,
                message="All cache entries cleared successfully"
            )
        else:
            return CacheResponse(
                success=False,
                message="Failed to flush cache",
                error="Redis flush operation failed"
            )
            
    except Exception as e:
        logger.error(f"Cache flush failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def cache_health_check(
    cache_service: CacheService = Depends(get_cache_service)
):
    """Check cache service health"""
    
    try:
        # Test basic operations
        test_key = "health_check"
        test_value = {"timestamp": datetime.utcnow().isoformat(), "status": "ok"}
        
        # Set test value
        set_success = await cache_service.redis_cache.set(test_key, test_value, ttl=60)
        
        # Get test value
        retrieved_value = await cache_service.redis_cache.get(test_key)
        
        # Delete test value
        delete_success = await cache_service.redis_cache.delete(test_key)
        
        # Get cache stats
        stats = await cache_service.redis_cache.get_stats()
        
        return {
            "status": "healthy" if set_success and retrieved_value else "unhealthy",
            "redis_connection": set_success,
            "cache_operations": {
                "set": set_success,
                "get": retrieved_value is not None,
                "delete": delete_success
            },
            "statistics": {
                "total_keys": stats.total_keys,
                "memory_usage_mb": round(stats.memory_usage / 1024 / 1024, 2),
                "hit_ratio": stats.hit_ratio,
                "connected_clients": stats.connected_clients,
                "uptime_hours": round(stats.uptime_seconds / 3600, 2)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Cache health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# Utility endpoints
@router.get("/info")
async def get_cache_info(
    current_user: dict = Depends(get_current_user),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Get cache service information"""
    
    return {
        "service": "Redis Cache Service",
        "version": "1.0.0",
        "configuration": {
            "host": cache_service.config.host,
            "port": cache_service.config.port,
            "db": cache_service.config.db,
            "max_connections": cache_service.config.max_connections,
            "default_ttl": cache_service.config.default_ttl,
            "session_ttl": cache_service.config.session_ttl,
            "query_cache_ttl": cache_service.config.query_cache_ttl
        },
        "features": [
            "Distributed caching",
            "Session management", 
            "Query result caching",
            "Tag-based invalidation",
            "Pipeline operations",
            "Performance monitoring",
            "Multi-serialization support"
        ],
        "timestamp": datetime.utcnow().isoformat()
    }

# Export router
__all__ = ["router"]