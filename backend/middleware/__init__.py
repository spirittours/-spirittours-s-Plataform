"""
Middleware Module.

This module provides various middleware components for the application.

Components:
- Performance middleware
- Request size limit middleware

Author: GenSpark AI Developer
Phase: 7 - Performance Optimization
"""

from middleware.performance_middleware import (
    PerformanceMiddleware,
    RequestSizeLimitMiddleware,
    get_performance_stats
)

__all__ = [
    'PerformanceMiddleware',
    'RequestSizeLimitMiddleware',
    'get_performance_stats',
]
