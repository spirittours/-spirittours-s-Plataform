"""
Performance Middleware.

This module provides middleware for monitoring and optimizing request/response performance.

Features:
- Request timing and metrics
- Response compression
- Performance headers
- Slow request detection
- Request size limits
- Response caching headers
- CORS optimization

Author: GenSpark AI Developer
Phase: 7 - Performance Optimization
"""

import time
import gzip
from typing import Callable, Optional, Dict, Any
from fastapi import Request, Response
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.datastructures import Headers, MutableHeaders

from backend.utils.logger import get_logger

logger = get_logger(__name__)


class PerformanceMiddleware(BaseHTTPMiddleware):
    """
    Middleware for performance monitoring and optimization.
    
    This middleware tracks request timing, adds performance headers,
    and provides compression for responses.
    """
    
    def __init__(
        self,
        app,
        slow_request_threshold: float = 1.0,
        enable_compression: bool = True,
        compression_level: int = 6,
        min_compression_size: int = 1000,
        enable_timing_headers: bool = True,
        enable_cache_headers: bool = True
    ):
        """
        Initialize performance middleware.
        
        Args:
            app: FastAPI application
            slow_request_threshold: Threshold in seconds for slow request logging
            enable_compression: Enable response compression
            compression_level: Gzip compression level (1-9)
            min_compression_size: Minimum response size for compression
            enable_timing_headers: Add timing headers to responses
            enable_cache_headers: Add cache control headers
        """
        super().__init__(app)
        self.slow_request_threshold = slow_request_threshold
        self.enable_compression = enable_compression
        self.compression_level = compression_level
        self.min_compression_size = min_compression_size
        self.enable_timing_headers = enable_timing_headers
        self.enable_cache_headers = enable_cache_headers
        
        # Statistics
        self._stats = {
            'total_requests': 0,
            'slow_requests': 0,
            'compressed_responses': 0,
            'total_response_time': 0.0,
            'max_response_time': 0.0,
            'min_response_time': float('inf')
        }
        
        logger.info("Performance middleware initialized", extra={
            'slow_threshold': slow_request_threshold,
            'compression_enabled': enable_compression
        })
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and add performance optimizations.
        
        Args:
            request: Incoming request
            call_next: Next middleware/handler
            
        Returns:
            Response with performance optimizations
        """
        # Record start time
        start_time = time.time()
        
        # Add request ID for tracing
        request_id = request.headers.get('X-Request-ID', f"req_{int(start_time * 1000)}")
        
        # Process request
        try:
            response = await call_next(request)
        except Exception as e:
            logger.error(f"Error processing request: {e}", extra={
                'request_id': request_id,
                'path': request.url.path
            })
            raise
        
        # Calculate response time
        response_time = time.time() - start_time
        response_time_ms = response_time * 1000
        
        # Update statistics
        self._update_statistics(response_time, response_time_ms)
        
        # Log slow requests
        if response_time > self.slow_request_threshold:
            self._stats['slow_requests'] += 1
            logger.warning("Slow request detected", extra={
                'request_id': request_id,
                'path': request.url.path,
                'method': request.method,
                'response_time_ms': round(response_time_ms, 2),
                'status_code': response.status_code
            })
        
        # Add performance headers
        if self.enable_timing_headers:
            response.headers['X-Response-Time'] = f"{response_time_ms:.2f}ms"
            response.headers['X-Request-ID'] = request_id
        
        # Add cache headers for static content
        if self.enable_cache_headers:
            response = self._add_cache_headers(request, response)
        
        # Compress response if applicable
        if self.enable_compression:
            response = await self._compress_response(request, response)
        
        # Add security and performance headers
        response = self._add_security_headers(response)
        
        return response
    
    def _update_statistics(self, response_time: float, response_time_ms: float) -> None:
        """Update middleware statistics."""
        self._stats['total_requests'] += 1
        self._stats['total_response_time'] += response_time
        self._stats['max_response_time'] = max(self._stats['max_response_time'], response_time)
        self._stats['min_response_time'] = min(self._stats['min_response_time'], response_time)
    
    def _add_cache_headers(self, request: Request, response: Response) -> Response:
        """
        Add cache control headers based on request path.
        
        Args:
            request: Incoming request
            response: Response to modify
            
        Returns:
            Response with cache headers
        """
        path = request.url.path
        
        # Static assets - cache for 1 year
        if any(path.endswith(ext) for ext in ['.js', '.css', '.jpg', '.png', '.gif', '.ico', '.woff', '.woff2']):
            response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
        
        # API endpoints - no cache by default
        elif path.startswith('/api/'):
            # Check for specific cacheable endpoints
            if any(endpoint in path for endpoint in ['/countries', '/airports', '/airlines']):
                response.headers['Cache-Control'] = 'public, max-age=3600'  # 1 hour
            else:
                response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                response.headers['Pragma'] = 'no-cache'
                response.headers['Expires'] = '0'
        
        # HTML pages - cache for 5 minutes
        else:
            response.headers['Cache-Control'] = 'public, max-age=300'
        
        return response
    
    async def _compress_response(self, request: Request, response: Response) -> Response:
        """
        Compress response body if applicable.
        
        Args:
            request: Incoming request
            response: Response to compress
            
        Returns:
            Potentially compressed response
        """
        # Check if client accepts gzip
        accept_encoding = request.headers.get('accept-encoding', '')
        if 'gzip' not in accept_encoding.lower():
            return response
        
        # Check if response is already compressed
        if response.headers.get('content-encoding'):
            return response
        
        # Check content type
        content_type = response.headers.get('content-type', '')
        compressible_types = [
            'text/',
            'application/json',
            'application/javascript',
            'application/xml',
            'application/x-javascript'
        ]
        
        if not any(ct in content_type for ct in compressible_types):
            return response
        
        # Get response body
        body = b''
        async for chunk in response.body_iterator:
            body += chunk
        
        # Check minimum size
        if len(body) < self.min_compression_size:
            # Return uncompressed
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )
        
        # Compress body
        compressed_body = gzip.compress(body, compresslevel=self.compression_level)
        
        # Check if compression actually reduced size
        if len(compressed_body) >= len(body):
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )
        
        # Update statistics
        self._stats['compressed_responses'] += 1
        compression_ratio = (1 - len(compressed_body) / len(body)) * 100
        
        logger.debug(f"Response compressed: {len(body)} -> {len(compressed_body)} bytes ({compression_ratio:.1f}% reduction)")
        
        # Create compressed response
        headers = MutableHeaders(response.headers)
        headers['content-encoding'] = 'gzip'
        headers['content-length'] = str(len(compressed_body))
        headers['vary'] = 'Accept-Encoding'
        
        return Response(
            content=compressed_body,
            status_code=response.status_code,
            headers=dict(headers),
            media_type=response.media_type
        )
    
    def _add_security_headers(self, response: Response) -> Response:
        """
        Add security and performance headers.
        
        Args:
            response: Response to modify
            
        Returns:
            Response with security headers
        """
        # Add security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # Add performance headers
        response.headers['X-DNS-Prefetch-Control'] = 'on'
        
        return response
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get middleware statistics.
        
        Returns:
            Dictionary with statistics
        """
        avg_response_time = 0.0
        if self._stats['total_requests'] > 0:
            avg_response_time = (
                self._stats['total_response_time'] / self._stats['total_requests']
            ) * 1000
        
        compression_rate = 0.0
        if self._stats['total_requests'] > 0:
            compression_rate = (
                self._stats['compressed_responses'] / self._stats['total_requests']
            ) * 100
        
        slow_request_rate = 0.0
        if self._stats['total_requests'] > 0:
            slow_request_rate = (
                self._stats['slow_requests'] / self._stats['total_requests']
            ) * 100
        
        return {
            'total_requests': self._stats['total_requests'],
            'slow_requests': self._stats['slow_requests'],
            'slow_request_rate': round(slow_request_rate, 2),
            'compressed_responses': self._stats['compressed_responses'],
            'compression_rate': round(compression_rate, 2),
            'avg_response_time_ms': round(avg_response_time, 2),
            'max_response_time_ms': round(self._stats['max_response_time'] * 1000, 2),
            'min_response_time_ms': round(self._stats['min_response_time'] * 1000, 2)
            if self._stats['min_response_time'] != float('inf') else 0
        }


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to limit request body size.
    
    This prevents memory exhaustion from large requests.
    """
    
    def __init__(self, app, max_request_size: int = 10 * 1024 * 1024):  # 10MB default
        """
        Initialize request size limit middleware.
        
        Args:
            app: FastAPI application
            max_request_size: Maximum request size in bytes
        """
        super().__init__(app)
        self.max_request_size = max_request_size
        logger.info(f"Request size limit middleware initialized: {max_request_size} bytes")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Check request size and process.
        
        Args:
            request: Incoming request
            call_next: Next middleware/handler
            
        Returns:
            Response or error
        """
        # Check content length
        content_length = request.headers.get('content-length')
        
        if content_length:
            content_length = int(content_length)
            if content_length > self.max_request_size:
                logger.warning(f"Request size exceeds limit: {content_length} > {self.max_request_size}")
                return Response(
                    content='{"error": "Request body too large"}',
                    status_code=413,
                    media_type='application/json'
                )
        
        return await call_next(request)


# Statistics endpoint helper
def get_performance_stats() -> Dict[str, Any]:
    """
    Get performance statistics from all middleware instances.
    
    Returns:
        Dictionary with performance statistics
    """
    # This would be called from a FastAPI endpoint
    # In a real implementation, we'd store middleware instances in app state
    return {
        'status': 'Performance statistics not available',
        'message': 'Use app.state.performance_middleware.get_statistics() in endpoint'
    }
