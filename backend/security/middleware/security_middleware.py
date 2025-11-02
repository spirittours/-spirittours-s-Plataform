#!/usr/bin/env python3
"""
Comprehensive Security Middleware for Spirit Tours
Integrates authentication, authorization, encryption, audit logging, and attack protection
"""

import asyncio
import hashlib
import hmac
import json
import logging
import re
import secrets
import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Callable, Set
from dataclasses import dataclass
from urllib.parse import unquote

from fastapi import Request, Response, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import bleach
from sqlalchemy.orm import Session

# Import our security components
from security.authentication.jwt_manager import AdvancedJWTManager, TokenType, TokenStatus
from security.authorization.rbac_system import RBACManager, AccessRequest, AccessResponse
from security.audit.security_audit_system import AdvancedSecurityAuditor, SecurityEvent, EventType, EventSeverity
from security.encryption.end_to_end_encryption import AdvancedEncryptionManager, EncryptionAlgorithm


@dataclass
class SecurityConfig:
    """Security middleware configuration"""
    # Authentication settings
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    token_expiry_minutes: int = 15
    refresh_token_expiry_days: int = 30
    
    # Rate limiting
    rate_limit_requests_per_minute: int = 100
    rate_limit_burst_size: int = 150
    
    # CSRF protection
    csrf_token_expiry_minutes: int = 60
    csrf_cookie_name: str = "csrf_token"
    
    # Content Security Policy
    csp_policy: str = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    
    # Security headers
    security_headers: Dict[str, str] = None
    
    # Attack protection
    sql_injection_protection: bool = True
    xss_protection: bool = True
    path_traversal_protection: bool = True
    
    # Audit logging
    audit_all_requests: bool = True
    audit_sensitive_endpoints: Set[str] = None
    
    def __post_init__(self):
        if self.security_headers is None:
            self.security_headers = {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'Content-Security-Policy': self.csp_policy
            }
        
        if self.audit_sensitive_endpoints is None:
            self.audit_sensitive_endpoints = {
                '/api/admin', '/api/auth', '/api/users', '/api/financial',
                '/api/reports', '/api/config', '/api/audit'
            }


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive security middleware that provides:
    - Authentication and authorization
    - Attack protection (XSS, CSRF, SQL Injection)
    - Audit logging
    - Rate limiting
    - Security headers
    """
    
    def __init__(self, app, config: SecurityConfig, db_session_factory, redis_client):
        super().__init__(app)
        self.config = config
        self.db_session_factory = db_session_factory
        self.redis_client = redis_client
        self.logger = logging.getLogger(__name__)
        
        # Initialize security components
        self.jwt_manager = AdvancedJWTManager(config.jwt_secret_key, redis_client)
        self.encryption_manager = AdvancedEncryptionManager()
        
        # Rate limiting storage
        self.rate_limits = {}
        
        # CSRF token storage
        self.csrf_tokens = {}
        
        # Attack detection patterns
        self._initialize_attack_patterns()
        
        # Security event queue for async processing
        self.security_event_queue = asyncio.Queue()
        
        # Start background tasks
        asyncio.create_task(self._process_security_events())
    
    def _initialize_attack_patterns(self):
        """Initialize patterns for detecting various attacks"""
        # SQL Injection patterns
        self.sql_patterns = [
            r"(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)",
            r"('|(\\'))+.*(or|and|exec|union|select|insert|update|delete)",
            r"(script.*alert|javascript:|vbscript:|onload|onerror)",
            r"(\|\||&&|--|/\*|\*/)",
        ]
        
        # XSS patterns  
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>.*?</iframe>",
            r"<object[^>]*>.*?</object>",
            r"<embed[^>]*>",
            r"<applet[^>]*>.*?</applet>",
        ]
        
        # Path traversal patterns
        self.path_traversal_patterns = [
            r"\.\./",
            r"\.\.\\",
            r"%2e%2e%2f",
            r"%2e%2e/",
            r"..%2f",
            r"%2e%2e%5c",
        ]
        
        # LDAP injection patterns
        self.ldap_patterns = [
            r"[()&|!]",
            r"\*",
            r"[\x00-\x1f\x7f-\xff]",
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Main middleware dispatch method"""
        start_time = time.time()
        
        try:
            # Initialize request context
            request_id = str(uuid.uuid4())
            request.state.request_id = request_id
            request.state.start_time = start_time
            
            # Pre-processing security checks
            security_check_result = await self._pre_security_checks(request)
            if security_check_result:
                return security_check_result
            
            # Process request through security layers
            response = await call_next(request)
            
            # Post-processing security enhancements
            response = await self._post_security_processing(request, response)
            
            # Log successful request
            await self._log_request_success(request, response, time.time() - start_time)
            
            return response
            
        except HTTPException as e:
            # Log security-related HTTP exceptions
            await self._log_security_exception(request, e, time.time() - start_time)
            raise
        except Exception as e:
            # Log unexpected errors
            await self._log_unexpected_error(request, e, time.time() - start_time)
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error", "request_id": request_id}
            )
    
    async def _pre_security_checks(self, request: Request) -> Optional[Response]:
        """Perform pre-processing security checks"""
        try:
            client_ip = self._get_client_ip(request)
            
            # Rate limiting check
            if await self._check_rate_limit(client_ip):
                await self._log_security_event(
                    request, EventType.RATE_LIMIT_EXCEEDED, EventSeverity.MEDIUM,
                    {"reason": "Rate limit exceeded", "ip": client_ip}
                )
                return JSONResponse(
                    status_code=429,
                    content={"error": "Rate limit exceeded"},
                    headers={"Retry-After": "60"}
                )
            
            # Attack detection
            attack_detected = await self._detect_attacks(request)
            if attack_detected:
                return attack_detected
            
            # Authentication check (for protected routes)
            auth_result = await self._check_authentication(request)
            if auth_result:
                return auth_result
            
            # Authorization check (for authenticated requests)
            authz_result = await self._check_authorization(request)
            if authz_result:
                return authz_result
            
            # CSRF protection (for state-changing requests)
            csrf_result = await self._check_csrf_protection(request)
            if csrf_result:
                return csrf_result
            
            return None
            
        except Exception as e:
            self.logger.error(f"Pre-security check failed: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"error": "Security check failed"}
            )
    
    async def _post_security_processing(self, request: Request, response: Response) -> Response:
        """Apply post-processing security enhancements"""
        try:
            # Add security headers
            for header, value in self.config.security_headers.items():
                response.headers[header] = value
            
            # Add CSRF token for GET requests that need it
            if request.method == "GET" and self._needs_csrf_token(request):
                csrf_token = await self._generate_csrf_token(request)
                response.set_cookie(
                    self.config.csrf_cookie_name,
                    csrf_token,
                    max_age=self.config.csrf_token_expiry_minutes * 60,
                    httponly=True,
                    secure=True,
                    samesite="strict"
                )
            
            # Encrypt sensitive response data (if configured)
            if self._contains_sensitive_data(request.url.path):
                response = await self._encrypt_response_data(request, response)
            
            # Add request ID to response
            response.headers["X-Request-ID"] = request.state.request_id
            
            return response
            
        except Exception as e:
            self.logger.error(f"Post-security processing failed: {str(e)}")
            return response
    
    async def _check_rate_limit(self, client_ip: str) -> bool:
        """Check if client IP has exceeded rate limit"""
        try:
            current_time = time.time()
            rate_key = f"rate_limit:{client_ip}"
            
            if rate_key not in self.rate_limits:
                self.rate_limits[rate_key] = []
            
            # Clean old entries
            self.rate_limits[rate_key] = [
                timestamp for timestamp in self.rate_limits[rate_key]
                if current_time - timestamp < 60  # 1 minute window
            ]
            
            # Check if limit exceeded
            if len(self.rate_limits[rate_key]) >= self.config.rate_limit_requests_per_minute:
                return True
            
            # Add current request
            self.rate_limits[rate_key].append(current_time)
            
            return False
            
        except Exception as e:
            self.logger.error(f"Rate limit check failed: {str(e)}")
            return False
    
    async def _detect_attacks(self, request: Request) -> Optional[Response]:
        """Detect various types of attacks"""
        try:
            # Get request data for analysis
            request_data = await self._extract_request_data(request)
            
            # SQL Injection detection
            if self.config.sql_injection_protection:
                if self._detect_sql_injection(request_data):
                    await self._log_security_event(
                        request, EventType.SQL_INJECTION_ATTEMPT, EventSeverity.HIGH,
                        {"attack_type": "sql_injection", "request_data": request_data}
                    )
                    return JSONResponse(
                        status_code=400,
                        content={"error": "Invalid request"}
                    )
            
            # XSS detection
            if self.config.xss_protection:
                if self._detect_xss(request_data):
                    await self._log_security_event(
                        request, EventType.XSS_ATTEMPT, EventSeverity.HIGH,
                        {"attack_type": "xss", "request_data": request_data}
                    )
                    return JSONResponse(
                        status_code=400,
                        content={"error": "Invalid request"}
                    )
            
            # Path traversal detection
            if self.config.path_traversal_protection:
                if self._detect_path_traversal(request.url.path + str(request.query_params)):
                    await self._log_security_event(
                        request, EventType.SUSPICIOUS_ACTIVITY, EventSeverity.MEDIUM,
                        {"attack_type": "path_traversal", "path": request.url.path}
                    )
                    return JSONResponse(
                        status_code=400,
                        content={"error": "Invalid path"}
                    )
            
            return None
            
        except Exception as e:
            self.logger.error(f"Attack detection failed: {str(e)}")
            return None
    
    def _detect_sql_injection(self, request_data: str) -> bool:
        """Detect SQL injection attempts"""
        request_data_lower = request_data.lower()
        for pattern in self.sql_patterns:
            if re.search(pattern, request_data_lower, re.IGNORECASE):
                return True
        return False
    
    def _detect_xss(self, request_data: str) -> bool:
        """Detect XSS attempts"""
        for pattern in self.xss_patterns:
            if re.search(pattern, request_data, re.IGNORECASE):
                return True
        return False
    
    def _detect_path_traversal(self, path_data: str) -> bool:
        """Detect path traversal attempts"""
        decoded_path = unquote(path_data)
        for pattern in self.path_traversal_patterns:
            if re.search(pattern, decoded_path, re.IGNORECASE):
                return True
        return False
    
    async def _check_authentication(self, request: Request) -> Optional[Response]:
        """Check JWT token authentication"""
        try:
            # Skip authentication for public endpoints
            if self._is_public_endpoint(request.url.path):
                return None
            
            # Get authorization header
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                await self._log_security_event(
                    request, EventType.ACCESS_DENIED, EventSeverity.MEDIUM,
                    {"reason": "Missing or invalid authorization header"}
                )
                return JSONResponse(
                    status_code=401,
                    content={"error": "Authentication required"}
                )
            
            # Extract token
            token = auth_header.split(" ", 1)[1]
            
            # Validate token
            device_info = self._extract_device_info(request)
            status, claims = await self.jwt_manager.validate_token(
                token, TokenType.ACCESS, device_info
            )
            
            if status != TokenStatus.VALID or not claims:
                await self._log_security_event(
                    request, EventType.ACCESS_DENIED, EventSeverity.MEDIUM,
                    {"reason": f"Token validation failed: {status.value}"}
                )
                return JSONResponse(
                    status_code=401,
                    content={"error": "Invalid or expired token"}
                )
            
            # Store user context in request
            request.state.user_id = claims.user_id
            request.state.user_email = claims.email
            request.state.user_roles = claims.roles
            request.state.user_permissions = claims.permissions
            request.state.session_id = claims.session_id
            
            return None
            
        except Exception as e:
            self.logger.error(f"Authentication check failed: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"error": "Authentication system error"}
            )
    
    async def _check_authorization(self, request: Request) -> Optional[Response]:
        """Check RBAC authorization"""
        try:
            # Skip authorization for public endpoints
            if self._is_public_endpoint(request.url.path):
                return None
            
            # Skip if not authenticated
            if not hasattr(request.state, 'user_id'):
                return None
            
            # Create access request
            access_request = AccessRequest(
                user_id=request.state.user_id,
                resource=self._extract_resource_name(request.url.path),
                action=self._map_http_method_to_action(request.method),
                context={
                    'path': request.url.path,
                    'method': request.method,
                    'ip_address': self._get_client_ip(request)
                },
                ip_address=self._get_client_ip(request),
                user_agent=request.headers.get('User-Agent')
            )
            
            # Check authorization (would need RBAC manager instance)
            # This would be initialized with database session in a real implementation
            db_session = self.db_session_factory()
            try:
                rbac_manager = RBACManager(db_session, self.redis_client)
                access_response = await rbac_manager.check_access(access_request)
                
                if not access_response.granted:
                    await self._log_security_event(
                        request, EventType.ACCESS_DENIED, EventSeverity.MEDIUM,
                        {"reason": access_response.reason, "resource": access_request.resource}
                    )
                    return JSONResponse(
                        status_code=403,
                        content={"error": "Access denied", "reason": access_response.reason}
                    )
                
                # Store authorization context
                request.state.authorization_granted = True
                request.state.permissions_used = access_response.permissions_used
                
                return None
                
            finally:
                db_session.close()
            
        except Exception as e:
            self.logger.error(f"Authorization check failed: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"error": "Authorization system error"}
            )
    
    async def _check_csrf_protection(self, request: Request) -> Optional[Response]:
        """Check CSRF token for state-changing requests"""
        try:
            # Only check CSRF for state-changing methods
            if request.method in ["GET", "HEAD", "OPTIONS"]:
                return None
            
            # Skip CSRF check for API endpoints with proper authentication
            if request.url.path.startswith("/api/") and hasattr(request.state, 'user_id'):
                # API requests with valid JWT tokens are considered safe
                return None
            
            # Get CSRF token from header or form data
            csrf_token = request.headers.get("X-CSRF-Token")
            if not csrf_token:
                # Try to get from form data
                if request.headers.get("content-type", "").startswith("application/x-www-form-urlencoded"):
                    form_data = await request.form()
                    csrf_token = form_data.get("csrf_token")
            
            # Get expected token from cookie
            expected_token = request.cookies.get(self.config.csrf_cookie_name)
            
            if not csrf_token or not expected_token or csrf_token != expected_token:
                await self._log_security_event(
                    request, EventType.CSRF_ATTEMPT, EventSeverity.HIGH,
                    {"reason": "CSRF token validation failed"}
                )
                return JSONResponse(
                    status_code=403,
                    content={"error": "CSRF token validation failed"}
                )
            
            return None
            
        except Exception as e:
            self.logger.error(f"CSRF protection check failed: {str(e)}")
            return None
    
    async def _generate_csrf_token(self, request: Request) -> str:
        """Generate CSRF token for the session"""
        try:
            # Create token based on session and timestamp
            session_id = getattr(request.state, 'session_id', 'anonymous')
            timestamp = str(int(time.time()))
            
            # Create HMAC-based token
            message = f"{session_id}:{timestamp}".encode()
            signature = hmac.new(
                self.config.jwt_secret_key.encode(),
                message,
                hashlib.sha256
            ).hexdigest()
            
            csrf_token = f"{timestamp}:{signature}"
            
            # Store token with expiry
            token_key = f"csrf:{session_id}"
            if self.redis_client:
                await self.redis_client.setex(
                    token_key,
                    self.config.csrf_token_expiry_minutes * 60,
                    csrf_token
                )
            
            return csrf_token
            
        except Exception as e:
            self.logger.error(f"CSRF token generation failed: {str(e)}")
            return secrets.token_urlsafe(32)
    
    def _is_public_endpoint(self, path: str) -> bool:
        """Check if endpoint is public (doesn't require authentication)"""
        public_endpoints = [
            "/health",
            "/docs",
            "/openapi.json",
            "/auth/login",
            "/auth/register",
            "/auth/forgot-password",
            "/public/"
        ]
        
        return any(path.startswith(endpoint) for endpoint in public_endpoints)
    
    def _needs_csrf_token(self, request: Request) -> bool:
        """Check if request needs CSRF token"""
        # Web pages that will submit forms need CSRF tokens
        csrf_paths = [
            "/admin/",
            "/dashboard/",
            "/forms/"
        ]
        
        return any(request.url.path.startswith(path) for path in csrf_paths)
    
    def _contains_sensitive_data(self, path: str) -> bool:
        """Check if response might contain sensitive data"""
        sensitive_paths = [
            "/api/users",
            "/api/financial",
            "/api/reports",
            "/api/admin"
        ]
        
        return any(path.startswith(sensitive_path) for sensitive_path in sensitive_paths)
    
    def _extract_resource_name(self, path: str) -> str:
        """Extract resource name from API path"""
        # Remove API prefix and extract resource
        if path.startswith("/api/"):
            parts = path.split("/")[2:]  # Skip empty and 'api'
            if parts:
                return parts[0]  # First part is usually the resource
        
        return "unknown"
    
    def _map_http_method_to_action(self, method: str) -> str:
        """Map HTTP methods to RBAC actions"""
        method_mapping = {
            "GET": "read",
            "POST": "create",
            "PUT": "update",
            "PATCH": "update", 
            "DELETE": "delete"
        }
        
        return method_mapping.get(method.upper(), "unknown")
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request"""
        # Check for forwarded headers first
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection
        if hasattr(request.client, 'host'):
            return request.client.host
        
        return "unknown"
    
    def _extract_device_info(self, request: Request) -> Dict[str, str]:
        """Extract device information from request"""
        return {
            "ip_address": self._get_client_ip(request),
            "user_agent": request.headers.get("User-Agent", ""),
            "accept_language": request.headers.get("Accept-Language", ""),
            "platform": request.headers.get("Sec-CH-UA-Platform", ""),
        }
    
    async def _extract_request_data(self, request: Request) -> str:
        """Extract request data for attack detection"""
        try:
            request_data = ""
            
            # Add URL and query parameters
            request_data += str(request.url)
            
            # Add headers (excluding sensitive ones)
            safe_headers = ["User-Agent", "Accept", "Accept-Language", "Content-Type"]
            for header in safe_headers:
                if header in request.headers:
                    request_data += f" {request.headers[header]}"
            
            # Add body for POST/PUT requests (limit size)
            if request.method in ["POST", "PUT", "PATCH"]:
                try:
                    body = await request.body()
                    if body and len(body) < 10000:  # Limit to 10KB
                        request_data += f" {body.decode('utf-8', errors='ignore')}"
                except:
                    pass
            
            return request_data
            
        except Exception as e:
            self.logger.error(f"Failed to extract request data: {str(e)}")
            return ""
    
    async def _encrypt_response_data(self, request: Request, response: Response) -> Response:
        """Encrypt sensitive response data"""
        try:
            # This is a simplified example - in practice, you'd need to:
            # 1. Check if client supports encryption
            # 2. Use appropriate encryption keys
            # 3. Handle different response types
            
            # For now, just add encryption headers to indicate capability
            response.headers["X-Encryption-Available"] = "true"
            
            return response
            
        except Exception as e:
            self.logger.error(f"Response encryption failed: {str(e)}")
            return response
    
    async def _log_security_event(self, request: Request, event_type: EventType, severity: EventSeverity, details: Dict[str, Any]):
        """Log security event asynchronously"""
        try:
            security_event = SecurityEvent(
                event_id=f"{event_type.value}_{int(time.time())}_{secrets.token_hex(4)}",
                event_type=event_type,
                severity=severity,
                timestamp=datetime.now(timezone.utc),
                user_id=getattr(request.state, 'user_id', None),
                session_id=getattr(request.state, 'session_id', None),
                ip_address=self._get_client_ip(request),
                user_agent=request.headers.get('User-Agent'),
                resource=self._extract_resource_name(request.url.path),
                action=self._map_http_method_to_action(request.method),
                outcome="blocked" if severity in [EventSeverity.HIGH, EventSeverity.CRITICAL] else "allowed",
                details=details
            )
            
            # Add to queue for async processing
            await self.security_event_queue.put(security_event)
            
        except Exception as e:
            self.logger.error(f"Failed to log security event: {str(e)}")
    
    async def _log_request_success(self, request: Request, response: Response, duration: float):
        """Log successful request"""
        try:
            # Only log if configured or for sensitive endpoints
            should_log = (
                self.config.audit_all_requests or
                any(request.url.path.startswith(endpoint) for endpoint in self.config.audit_sensitive_endpoints)
            )
            
            if should_log:
                await self._log_security_event(
                    request, EventType.DATA_ACCESS, EventSeverity.LOW,
                    {
                        "response_status": response.status_code,
                        "duration_ms": duration * 1000,
                        "response_size": len(getattr(response, 'body', b'')),
                    }
                )
        
        except Exception as e:
            self.logger.error(f"Failed to log request success: {str(e)}")
    
    async def _log_security_exception(self, request: Request, exception: HTTPException, duration: float):
        """Log security-related HTTP exceptions"""
        try:
            event_type = EventType.ACCESS_DENIED if exception.status_code in [401, 403] else EventType.SUSPICIOUS_ACTIVITY
            severity = EventSeverity.MEDIUM if exception.status_code in [401, 403] else EventSeverity.LOW
            
            await self._log_security_event(
                request, event_type, severity,
                {
                    "exception_status": exception.status_code,
                    "exception_detail": str(exception.detail),
                    "duration_ms": duration * 1000
                }
            )
            
        except Exception as e:
            self.logger.error(f"Failed to log security exception: {str(e)}")
    
    async def _log_unexpected_error(self, request: Request, exception: Exception, duration: float):
        """Log unexpected errors"""
        try:
            await self._log_security_event(
                request, EventType.SYSTEM_CONFIG_CHANGE, EventSeverity.HIGH,
                {
                    "exception_type": type(exception).__name__,
                    "exception_message": str(exception),
                    "duration_ms": duration * 1000
                }
            )
            
        except Exception as e:
            self.logger.error(f"Failed to log unexpected error: {str(e)}")
    
    async def _process_security_events(self):
        """Background task to process security events"""
        while True:
            try:
                # Get event from queue
                security_event = await self.security_event_queue.get()
                
                # Initialize auditor with database session
                db_session = self.db_session_factory()
                try:
                    auditor = AdvancedSecurityAuditor(db_session, self.redis_client)
                    await auditor.log_event(security_event)
                finally:
                    db_session.close()
                
                # Mark task as done
                self.security_event_queue.task_done()
                
            except Exception as e:
                self.logger.error(f"Error processing security event: {str(e)}")
                await asyncio.sleep(1)  # Brief pause before continuing


# Input sanitization utilities
class InputSanitizer:
    """Utilities for sanitizing user input"""
    
    @staticmethod
    def sanitize_html(html_input: str) -> str:
        """Sanitize HTML input to prevent XSS"""
        allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li']
        allowed_attributes = {}
        
        return bleach.clean(
            html_input,
            tags=allowed_tags,
            attributes=allowed_attributes,
            strip=True
        )
    
    @staticmethod
    def sanitize_sql_input(sql_input: str) -> str:
        """Basic SQL input sanitization"""
        # Remove potentially dangerous SQL keywords and characters
        dangerous_patterns = [
            r"'", r'"', r";", r"--", r"/\*", r"\*/",
            r"\bunion\b", r"\bselect\b", r"\binsert\b", r"\bupdate\b",
            r"\bdelete\b", r"\bdrop\b", r"\bcreate\b", r"\balter\b"
        ]
        
        sanitized = sql_input
        for pattern in dangerous_patterns:
            sanitized = re.sub(pattern, "", sanitized, flags=re.IGNORECASE)
        
        return sanitized.strip()
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename to prevent path traversal"""
        # Remove path separators and dangerous characters
        sanitized = re.sub(r'[<>:"/\\|?*]', '', filename)
        sanitized = re.sub(r'\.\.', '', sanitized)
        
        # Remove leading/trailing dots and spaces
        sanitized = sanitized.strip('. ')
        
        return sanitized[:255]  # Limit length
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email address format"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_pattern, email))
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Validate phone number format"""
        # Simple international phone number validation
        phone_pattern = r'^\+?[1-9]\d{1,14}$'
        # Remove spaces, dashes, parentheses
        cleaned_phone = re.sub(r'[\s\-\(\)]', '', phone)
        return bool(re.match(phone_pattern, cleaned_phone))


# FastAPI dependencies for security
class SecurityDependencies:
    """FastAPI dependencies for security checks"""
    
    def __init__(self, security_middleware: SecurityMiddleware):
        self.security_middleware = security_middleware
        self.security = HTTPBearer()
    
    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
        """Dependency to get current authenticated user"""
        try:
            device_info = {}  # Would extract from request in real implementation
            status, claims = await self.security_middleware.jwt_manager.validate_token(
                credentials.credentials, TokenType.ACCESS, device_info
            )
            
            if status != TokenStatus.VALID or not claims:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid authentication credentials"
                )
            
            return {
                "user_id": claims.user_id,
                "email": claims.email,
                "roles": claims.roles,
                "permissions": claims.permissions
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail="Authentication failed"
            )
    
    async def require_permission(self, permission: str):
        """Dependency to require specific permission"""
        def _check_permission(current_user: dict = Depends(self.get_current_user)):
            if permission not in current_user.get("permissions", []):
                raise HTTPException(
                    status_code=403,
                    detail=f"Permission required: {permission}"
                )
            return current_user
        
        return _check_permission
    
    async def require_role(self, role: str):
        """Dependency to require specific role"""
        def _check_role(current_user: dict = Depends(self.get_current_user)):
            if role not in current_user.get("roles", []):
                raise HTTPException(
                    status_code=403,
                    detail=f"Role required: {role}"
                )
            return current_user
        
        return _check_role


# Example usage in FastAPI application
"""
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

app = FastAPI()

# Initialize security configuration
security_config = SecurityConfig(
    jwt_secret_key="your-secret-key",
    rate_limit_requests_per_minute=100,
    audit_all_requests=True
)

# Initialize database session factory
def get_db_session():
    # Return SQLAlchemy session
    pass

# Initialize Redis client
redis_client = None  # Initialize your Redis client

# Add security middleware
security_middleware = SecurityMiddleware(
    app, 
    security_config, 
    get_db_session, 
    redis_client
)
app.add_middleware(SecurityMiddleware, **middleware_params)

# Initialize security dependencies
security_deps = SecurityDependencies(security_middleware)

# Example protected endpoint
@app.get("/api/users")
async def get_users(current_user: dict = Depends(security_deps.get_current_user)):
    return {"users": []}

# Example endpoint requiring specific permission
@app.post("/api/admin/users")
async def create_user(
    user_data: dict,
    current_user: dict = Depends(security_deps.require_permission("create_users"))
):
    return {"message": "User created"}
"""