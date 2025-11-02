"""
Performance Optimization Module.

This module provides performance optimization tools and utilities.

Components:
- Redis caching service
- Query optimizer
- Connection pool manager
- CDN configuration

Author: GenSpark AI Developer
Phase: 7 - Performance Optimization
"""

from performance.redis_cache import (
    RedisCache,
    get_cache,
    init_cache,
    cache_result
)
from performance.query_optimizer import (
    QueryOptimizer,
    get_optimizer,
    init_optimizer,
    QueryAnalysis,
    IndexRecommendation
)
from performance.connection_pool import (
    ConnectionPool,
    ConnectionConfig,
    ConnectionStats,
    get_connection_pool,
    init_connection_pool,
    get_pool_statistics
)
from performance.cdn_config import (
    CDNManager,
    CDNConfig,
    CDNProvider,
    CacheStrategy,
    CacheRule,
    ImageOptimizationConfig,
    get_cdn,
    init_cdn
)

__all__ = [
    # Redis Cache
    'RedisCache',
    'get_cache',
    'init_cache',
    'cache_result',
    
    # Query Optimizer
    'QueryOptimizer',
    'get_optimizer',
    'init_optimizer',
    'QueryAnalysis',
    'IndexRecommendation',
    
    # Connection Pool
    'ConnectionPool',
    'ConnectionConfig',
    'ConnectionStats',
    'get_connection_pool',
    'init_connection_pool',
    'get_pool_statistics',
    
    # CDN
    'CDNManager',
    'CDNConfig',
    'CDNProvider',
    'CacheStrategy',
    'CacheRule',
    'ImageOptimizationConfig',
    'get_cdn',
    'init_cdn',
]
