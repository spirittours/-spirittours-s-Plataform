"""
Security Middleware.

This module provides comprehensive security middleware for the application.

Features:
- CORS configuration
- Security headers (HSTS, CSP, etc.)
- Rate limiting
- IP whitelisting/blacklisting
- Request validation
- SQL injection prevention
- XSS protection
- CSRF token validation

Author: GenSpark AI Developer
Phase: 8 - Security & Compliance
"""

import time
import hashlib
import secrets
from typing import Callable, Dict, List, Optional, Set, Any
from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.datastructures import Headers

from utils.logger import get_logger

logger = get_logger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    
    Implements OWASP recommendations for secure headers.
    """
    
    def __init__(
        self,
        app,
        enable_hsts: bool = True,
        enable_csp: bool = True,
        enable_referrer_policy: bool = True,
        enable_permissions_policy: bool = True,
        hsts_max_age: int = 31536000,  # 1 year
        hsts_include_subdomains: bool = True,
        hsts_preload: bool = True
    ):
        """
        Initialize security headers middleware.
        
        Args:
            app: FastAPI application
            enable_hsts: Enable HTTP Strict Transport Security
            enable_csp: Enable Content Security Policy
            enable_referrer_policy: Enable Referrer-Policy
            enable_permissions_policy: Enable Permissions-Policy
            hsts_max_age: HSTS max-age in seconds
            hsts_include_subdomains: Include subdomains in HSTS
            hsts_preload: Enable HSTS preload
        """
        super().__init__(app)
        self.enable_hsts = enable_hsts
        self.enable_csp = enable_csp
        self.enable_referrer_policy = enable_referrer_policy
        self.enable_permissions_policy = enable_permissions_policy
        self.hsts_max_age = hsts_max_age
        self.hsts_include_subdomains = hsts_include_subdomains
        self.hsts_preload = hsts_preload
        
        logger.info("Security headers middleware initialized")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add security headers to response."""
        response = await call_next(request)
        
        # X-Content-Type-Options
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # X-Frame-Options
        response.headers['X-Frame-Options'] = 'DENY'
        
        # X-XSS-Protection
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # HTTP Strict Transport Security
        if self.enable_hsts:
            hsts_value = f'max-age={self.hsts_max_age}'
            if self.hsts_include_subdomains:
                hsts_value += '; includeSubDomains'
            if self.hsts_preload:
                hsts_value += '; preload'
            response.headers['Strict-Transport-Security'] = hsts_value
        
        # Content Security Policy
        if self.enable_csp:
            csp_directives = [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com",
                "img-src 'self' data: https:",
                "connect-src 'self' https://api.example.com",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'"
            ]
            response.headers['Content-Security-Policy'] = '; '.join(csp_directives)
        
        # Referrer-Policy
        if self.enable_referrer_policy:
            response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions-Policy (formerly Feature-Policy)
        if self.enable_permissions_policy:
            permissions = [
                'geolocation=(self)',
                'microphone=()',
                'camera=()',
                'payment=(self)',
                'usb=()',
                'magnetometer=()',
                'gyroscope=()',
                'accelerometer=()'
            ]
            response.headers['Permissions-Policy'] = ', '.join(permissions)
        
        # Remove server header
        if 'server' in response.headers:
            del response.headers['server']
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware with token bucket algorithm.
    
    Prevents abuse by limiting requests per IP address.
    """
    
    def __init__(
        self,
        app,
        requests_per_minute: int = 60,
        burst_size: int = 10,
        enable_ip_blacklist: bool = True,
        blacklist_threshold: int = 1000,
        blacklist_duration: int = 3600  # 1 hour
    ):
        """
        Initialize rate limit middleware.
        
        Args:
            app: FastAPI application
            requests_per_minute: Maximum requests per minute per IP
            burst_size: Maximum burst requests
            enable_ip_blacklist: Enable automatic IP blacklisting
            blacklist_threshold: Requests threshold for blacklisting
            blacklist_duration: Blacklist duration in seconds
        """
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.burst_size = burst_size
        self.enable_ip_blacklist = enable_ip_blacklist
        self.blacklist_threshold = blacklist_threshold
        self.blacklist_duration = blacklist_duration
        
        # Rate limit storage: {ip: {'tokens': float, 'last_update': float}}
        self._rate_limits: Dict[str, Dict[str, Any]] = {}
        
        # Blacklist: {ip: expiry_timestamp}
        self._blacklist: Dict[str, float] = {}
        
        # Request counts for blacklist detection
        self._request_counts: Dict[str, int] = defaultdict(int)
        
        logger.info("Rate limit middleware initialized", extra={
            'requests_per_minute': requests_per_minute,
            'burst_size': burst_size
        })
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address."""
        # Check for forwarded IP
        forwarded = request.headers.get('X-Forwarded-For')
        if forwarded:
            return forwarded.split(',')[0].strip()
        
        # Check for real IP
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        # Use direct client
        if request.client:
            return request.client.host
        
        return 'unknown'
    
    def _is_blacklisted(self, ip: str) -> bool:
        """Check if IP is blacklisted."""
        if ip in self._blacklist:
            if time.time() < self._blacklist[ip]:
                return True
            else:
                # Blacklist expired
                del self._blacklist[ip]
                if ip in self._request_counts:
                    del self._request_counts[ip]
        return False
    
    def _check_rate_limit(self, ip: str) -> bool:
        """
        Check if request is within rate limit using token bucket.
        
        Returns:
            True if allowed, False if rate limited
        """
        now = time.time()
        
        # Initialize rate limit data for new IPs
        if ip not in self._rate_limits:
            self._rate_limits[ip] = {
                'tokens': self.burst_size,
                'last_update': now
            }
        
        # Calculate tokens to add based on time elapsed
        rate_limit_data = self._rate_limits[ip]
        time_elapsed = now - rate_limit_data['last_update']
        tokens_to_add = time_elapsed * (self.requests_per_minute / 60.0)
        
        # Update tokens
        rate_limit_data['tokens'] = min(
            self.burst_size,
            rate_limit_data['tokens'] + tokens_to_add
        )
        rate_limit_data['last_update'] = now
        
        # Check if we have tokens
        if rate_limit_data['tokens'] >= 1:
            rate_limit_data['tokens'] -= 1
            return True
        
        return False
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Check rate limits and process request."""
        ip = self._get_client_ip(request)
        
        # Check blacklist
        if self._is_blacklisted(ip):
            logger.warning(f"Blocked blacklisted IP: {ip}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="IP address is blacklisted"
            )
        
        # Check rate limit
        if not self._check_rate_limit(ip):
            logger.warning(f"Rate limit exceeded for IP: {ip}")
            
            # Increment request count for blacklist detection
            if self.enable_ip_blacklist:
                self._request_counts[ip] += 1
                
                # Blacklist if threshold exceeded
                if self._request_counts[ip] >= self.blacklist_threshold:
                    self._blacklist[ip] = time.time() + self.blacklist_duration
                    logger.error(f"IP blacklisted due to excessive requests: {ip}")
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded"
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        rate_limit_data = self._rate_limits.get(ip, {})
        remaining = int(rate_limit_data.get('tokens', 0))
        response.headers['X-RateLimit-Limit'] = str(self.requests_per_minute)
        response.headers['X-RateLimit-Remaining'] = str(remaining)
        
        return response
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get rate limiting statistics."""
        return {
            'total_ips_tracked': len(self._rate_limits),
            'blacklisted_ips': len(self._blacklist),
            'requests_per_minute_limit': self.requests_per_minute,
            'burst_size': self.burst_size,
            'blacklist_enabled': self.enable_ip_blacklist
        }


class InputValidationMiddleware(BaseHTTPMiddleware):
    """
    Input validation middleware for security.
    
    Validates and sanitizes incoming requests to prevent attacks.
    """
    
    def __init__(
        self,
        app,
        max_json_size: int = 1024 * 1024,  # 1MB
        max_query_params: int = 100,
        enable_sql_injection_detection: bool = True,
        enable_xss_detection: bool = True
    ):
        """
        Initialize input validation middleware.
        
        Args:
            app: FastAPI application
            max_json_size: Maximum JSON body size
            max_query_params: Maximum number of query parameters
            enable_sql_injection_detection: Detect SQL injection attempts
            enable_xss_detection: Detect XSS attempts
        """
        super().__init__(app)
        self.max_json_size = max_json_size
        self.max_query_params = max_query_params
        self.enable_sql_injection_detection = enable_sql_injection_detection
        self.enable_xss_detection = enable_xss_detection
        
        # SQL injection patterns
        self.sql_injection_patterns = [
            "union select",
            "or 1=1",
            "'; drop table",
            "exec(",
            "execute(",
            "script>",
            "<script",
            "javascript:",
            "onerror=",
            "onload="
        ]
        
        # XSS patterns
        self.xss_patterns = [
            "<script",
            "javascript:",
            "onerror=",
            "onload=",
            "<iframe",
            "<object",
            "<embed"
        ]
        
        logger.info("Input validation middleware initialized")
    
    def _check_sql_injection(self, value: str) -> bool:
        """Check for SQL injection patterns."""
        value_lower = value.lower()
        for pattern in self.sql_injection_patterns:
            if pattern in value_lower:
                return True
        return False
    
    def _check_xss(self, value: str) -> bool:
        """Check for XSS patterns."""
        value_lower = value.lower()
        for pattern in self.xss_patterns:
            if pattern in value_lower:
                return True
        return False
    
    def _validate_query_params(self, request: Request) -> None:
        """Validate query parameters."""
        # Check number of parameters
        if len(request.query_params) > self.max_query_params:
            logger.warning(f"Too many query parameters: {len(request.query_params)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many query parameters"
            )
        
        # Check for malicious content
        for key, value in request.query_params.items():
            if self.enable_sql_injection_detection and self._check_sql_injection(value):
                logger.error(f"SQL injection attempt detected in query param: {key}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected"
                )
            
            if self.enable_xss_detection and self._check_xss(value):
                logger.error(f"XSS attempt detected in query param: {key}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected"
                )
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Validate request input."""
        # Validate query parameters
        self._validate_query_params(request)
        
        # Check content length
        content_length = request.headers.get('content-length')
        if content_length and int(content_length) > self.max_json_size:
            logger.warning(f"Request body too large: {content_length}")
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Request body too large"
            )
        
        return await call_next(request)


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    CSRF (Cross-Site Request Forgery) protection middleware.
    
    Implements double-submit cookie pattern for CSRF protection.
    """
    
    def __init__(
        self,
        app,
        cookie_name: str = 'csrf_token',
        header_name: str = 'X-CSRF-Token',
        exempt_methods: Set[str] = {'GET', 'HEAD', 'OPTIONS', 'TRACE'}
    ):
        """
        Initialize CSRF protection middleware.
        
        Args:
            app: FastAPI application
            cookie_name: Name of CSRF cookie
            header_name: Name of CSRF header
            exempt_methods: HTTP methods exempt from CSRF check
        """
        super().__init__(app)
        self.cookie_name = cookie_name
        self.header_name = header_name
        self.exempt_methods = exempt_methods
        
        logger.info("CSRF protection middleware initialized")
    
    def _generate_csrf_token(self) -> str:
        """Generate a new CSRF token."""
        return secrets.token_urlsafe(32)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Validate CSRF token."""
        # Skip CSRF check for exempt methods
        if request.method in self.exempt_methods:
            response = await call_next(request)
            
            # Set CSRF cookie if not present
            if self.cookie_name not in request.cookies:
                token = self._generate_csrf_token()
                response.set_cookie(
                    key=self.cookie_name,
                    value=token,
                    httponly=True,
                    secure=True,
                    samesite='strict'
                )
            
            return response
        
        # Validate CSRF token for state-changing requests
        cookie_token = request.cookies.get(self.cookie_name)
        header_token = request.headers.get(self.header_name)
        
        if not cookie_token or not header_token:
            logger.warning("CSRF token missing")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing"
            )
        
        if cookie_token != header_token:
            logger.error("CSRF token mismatch")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token invalid"
            )
        
        return await call_next(request)


def setup_cors(
    app,
    allowed_origins: List[str],
    allow_credentials: bool = True,
    allowed_methods: List[str] = ['*'],
    allowed_headers: List[str] = ['*']
):
    """
    Setup CORS middleware.
    
    Args:
        app: FastAPI application
        allowed_origins: List of allowed origins
        allow_credentials: Allow credentials
        allowed_methods: Allowed HTTP methods
        allowed_headers: Allowed headers
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=allow_credentials,
        allow_methods=allowed_methods,
        allow_headers=allowed_headers,
        expose_headers=['X-Total-Count', 'X-Page-Count']
    )
    
    logger.info("CORS middleware configured", extra={
        'allowed_origins': allowed_origins
    })
