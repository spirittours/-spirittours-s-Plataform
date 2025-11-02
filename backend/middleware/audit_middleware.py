"""
Audit Middleware - Logging Automático
Middleware para capturar automáticamente todas las acciones de usuarios
"""

import json
import time
import logging
from typing import Dict, Any, Optional, Callable
from functools import wraps
from datetime import datetime
from fastapi import Request, Response
from fastapi.routing import APIRoute
from starlette.middleware.base import BaseHTTPMiddleware
import asyncio

from services.enhanced_audit_service import EnhancedAuditService, get_audit_service
from models.enhanced_audit_models import ActionType, RiskLevel
from models.rbac_models import User

logger = logging.getLogger(__name__)

class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware para auditoría automática de todas las requests"""
    
    def __init__(self, app, exclude_paths: list = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or [
            "/docs", "/redoc", "/openapi.json", "/health", "/favicon.ico"
        ]
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Skip logging for excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)
        
        # Capture request information
        request_info = {
            "method": request.method,
            "url": str(request.url),
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client_ip": request.client.host,
            "user_agent": request.headers.get("user-agent", ""),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Try to get request body for POST/PUT requests
        request_body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                # Read body without consuming the stream
                body = await request.body()
                if body:
                    request_body = body.decode('utf-8')[:1000]  # Limit to 1000 chars
            except Exception as e:
                logger.warning(f"Could not read request body: {e}")
        
        # Process the request
        response = None
        error = None
        try:
            response = await call_next(request)
        except Exception as e:
            error = str(e)
            logger.error(f"Request failed: {request.method} {request.url.path} - {error}")
            raise
        finally:
            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Log the request asynchronously
            asyncio.create_task(
                self._log_request_async(
                    request_info, request_body, response, error, duration_ms
                )
            )
        
        return response
    
    async def _log_request_async(self, request_info: Dict[str, Any], 
                               request_body: Optional[str], response: Optional[Response],
                               error: Optional[str], duration_ms: int):
        """Log request asynchronously"""
        try:
            # This would need a database session - in production, use a proper async session
            # For now, just log to file/console
            log_data = {
                "request": request_info,
                "response_status": response.status_code if response else None,
                "error": error,
                "duration_ms": duration_ms,
                "request_body_preview": request_body[:200] if request_body else None
            }
            
            logger.info(f"API Request: {json.dumps(log_data, default=str)}")
            
        except Exception as e:
            logger.error(f"Error logging request: {e}")

# Decoradores para logging automático de acciones específicas
def audit_booking_action(action_type: str):
    """Decorator para auditar acciones de reservas automáticamente"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract parameters
            current_user = None
            db = None
            request = None
            
            for arg in args:
                if isinstance(arg, User):
                    current_user = arg
                elif hasattr(arg, 'query'):  # Database session
                    db = arg
                elif hasattr(arg, 'client'):  # Request object
                    request = arg
            
            # Check kwargs as well
            current_user = current_user or kwargs.get('current_user')
            db = db or kwargs.get('db')
            request = request or kwargs.get('request')
            
            start_time = time.time()
            result = None
            error = None
            
            try:
                result = await func(*args, **kwargs)
                
                # Log successful action
                if current_user and db:
                    await _log_booking_action_success(
                        current_user, db, action_type, result, request, 
                        int((time.time() - start_time) * 1000)
                    )
                
                return result
                
            except Exception as e:
                error = str(e)
                
                # Log failed action
                if current_user and db:
                    await _log_booking_action_error(
                        current_user, db, action_type, error, request
                    )
                
                raise
        
        return wrapper
    return decorator

def audit_ai_agent_access(agent_name: str):
    """Decorator para auditar acceso a agentes AI"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            request = kwargs.get('request')
            
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                
                # Log AI agent usage
                if current_user and db:
                    audit_service = get_audit_service(db)
                    await audit_service.log_ai_agent_usage(
                        user_id=str(current_user.id),
                        agent_name=agent_name,
                        query_text=str(kwargs.get('query', ''))[:500],
                        response_summary=str(result)[:200] if result else None,
                        response_time_ms=int((time.time() - start_time) * 1000),
                        ip_address=request.client.host if request else None
                    )
                
                return result
                
            except Exception as e:
                # Log failed access
                if current_user and db:
                    audit_service = get_audit_service(db)
                    await audit_service.create_enhanced_audit_log(
                        user_id=str(current_user.id),
                        action_type=ActionType.AI_AGENT_ACCESSED,
                        resource_type="ai_agent",
                        resource_id=agent_name,
                        description=f"Error accessing AI agent {agent_name}: {str(e)}",
                        risk_level=RiskLevel.MEDIUM,
                        ip_address=request.client.host if request else None
                    )
                raise
        
        return wrapper
    return decorator

def audit_data_access(data_type: str, access_type: str = "read"):
    """Decorator para auditar acceso a datos"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            request = kwargs.get('request')
            
            try:
                result = await func(*args, **kwargs)
                
                # Determine records count
                records_count = 1
                if isinstance(result, list):
                    records_count = len(result)
                elif isinstance(result, dict) and 'total_count' in result:
                    records_count = result['total_count']
                
                # Log data access
                if current_user and db:
                    audit_service = get_audit_service(db)
                    await audit_service.log_data_access(
                        user_id=str(current_user.id),
                        data_type=data_type,
                        records_count=records_count,
                        access_type=access_type,
                        endpoint=request.url.path if request else None,
                        query_parameters=dict(request.query_params) if request else None,
                        ip_address=request.client.host if request else None
                    )
                
                return result
                
            except Exception as e:
                raise
        
        return wrapper
    return decorator

def audit_user_action(action_type: ActionType, resource_type: str = None, 
                     risk_level: RiskLevel = RiskLevel.LOW):
    """Decorator genérico para auditar acciones de usuario"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            request = kwargs.get('request')
            
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                
                # Log action
                if current_user and db:
                    audit_service = get_audit_service(db)
                    await audit_service.create_enhanced_audit_log(
                        user_id=str(current_user.id),
                        action_type=action_type,
                        resource_type=resource_type or func.__name__,
                        description=f"User executed {func.__name__}",
                        business_context={
                            "function": func.__name__,
                            "module": func.__module__,
                            "args_count": len(args),
                            "kwargs_keys": list(kwargs.keys())
                        },
                        risk_level=risk_level,
                        duration_ms=int((time.time() - start_time) * 1000),
                        ip_address=request.client.host if request else None
                    )
                
                return result
                
            except Exception as e:
                # Log error
                if current_user and db:
                    audit_service = get_audit_service(db)
                    await audit_service.create_enhanced_audit_log(
                        user_id=str(current_user.id),
                        action_type=ActionType.SECURITY_VIOLATION,
                        resource_type="system_error",
                        description=f"Error in {func.__name__}: {str(e)}",
                        risk_level=RiskLevel.MEDIUM,
                        requires_review=True,
                        ip_address=request.client.host if request else None
                    )
                raise
        
        return wrapper
    return decorator

# Helper functions
async def _log_booking_action_success(current_user: User, db, action_type: str, 
                                    result: Any, request, duration_ms: int):
    """Log successful booking action"""
    try:
        audit_service = get_audit_service(db)
        
        # Determine action type
        if action_type == "create":
            audit_action = ActionType.BOOKING_CREATED
        elif action_type == "modify":
            audit_action = ActionType.BOOKING_MODIFIED
        elif action_type == "cancel":
            audit_action = ActionType.BOOKING_CANCELLED
        else:
            audit_action = ActionType.BOOKING_CONFIRMED
        
        await audit_service.create_enhanced_audit_log(
            user_id=str(current_user.id),
            action_type=audit_action,
            resource_type="booking",
            description=f"Booking action '{action_type}' completed successfully",
            business_context={
                "action": action_type,
                "result_type": type(result).__name__,
                "duration_ms": duration_ms
            },
            risk_level=RiskLevel.MEDIUM if action_type in ["cancel", "modify"] else RiskLevel.LOW,
            duration_ms=duration_ms,
            ip_address=request.client.host if request else None
        )
        
    except Exception as e:
        logger.error(f"Error logging booking action success: {e}")

async def _log_booking_action_error(current_user: User, db, action_type: str, 
                                  error: str, request):
    """Log failed booking action"""
    try:
        audit_service = get_audit_service(db)
        
        await audit_service.create_enhanced_audit_log(
            user_id=str(current_user.id),
            action_type=ActionType.SECURITY_VIOLATION,
            resource_type="booking_error",
            description=f"Booking action '{action_type}' failed: {error}",
            business_context={
                "action": action_type,
                "error": error
            },
            risk_level=RiskLevel.MEDIUM,
            requires_review=True,
            ip_address=request.client.host if request else None
        )
        
    except Exception as e:
        logger.error(f"Error logging booking action error: {e}")

# Context manager for automatic audit logging
class AuditContext:
    """Context manager para logging automático de operaciones"""
    
    def __init__(self, user_id: str, db, action_description: str, 
                 action_type: ActionType = None, resource_type: str = None,
                 risk_level: RiskLevel = RiskLevel.LOW):
        self.user_id = user_id
        self.db = db
        self.action_description = action_description
        self.action_type = action_type or ActionType.DASHBOARD_VIEWED
        self.resource_type = resource_type or "general"
        self.risk_level = risk_level
        self.start_time = None
        self.audit_service = None
    
    async def __aenter__(self):
        self.start_time = time.time()
        self.audit_service = get_audit_service(self.db)
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        duration_ms = int((time.time() - self.start_time) * 1000)
        
        if exc_type is not None:
            # Log error
            await self.audit_service.create_enhanced_audit_log(
                user_id=self.user_id,
                action_type=ActionType.SECURITY_VIOLATION,
                resource_type=f"{self.resource_type}_error",
                description=f"Error in {self.action_description}: {str(exc_val)}",
                risk_level=RiskLevel.MEDIUM,
                requires_review=True,
                duration_ms=duration_ms
            )
        else:
            # Log success
            await self.audit_service.create_enhanced_audit_log(
                user_id=self.user_id,
                action_type=self.action_type,
                resource_type=self.resource_type,
                description=f"Completed: {self.action_description}",
                risk_level=self.risk_level,
                duration_ms=duration_ms
            )

# Usage examples:
"""
# 1. Using decorators
@audit_booking_action("create")
async def create_booking(booking_data, current_user, db):
    # Your booking creation logic
    pass

@audit_ai_agent_access("ethical_tourism")
async def query_ethical_tourism_agent(query, current_user, db):
    # AI agent logic
    pass

@audit_data_access("customer_data", "export")
async def export_customer_data(filters, current_user, db):
    # Export logic
    pass

# 2. Using context manager
async def complex_operation(user_id, db):
    async with AuditContext(user_id, db, "Complex booking operation", 
                           ActionType.BOOKING_CREATED, "booking", 
                           RiskLevel.MEDIUM):
        # Your complex operation here
        pass
"""