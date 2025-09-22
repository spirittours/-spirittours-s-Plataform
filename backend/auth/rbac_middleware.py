"""
RBAC Middleware and Authentication System
Advanced role-based access control with hierarchical permissions
"""

from typing import List, Optional, Dict, Any, Callable
from fastapi import HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import jwt
from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from functools import wraps
import logging

from backend.models.rbac_models import (
    User, Role, Permission, Branch, AuditLog, SessionToken,
    PermissionScope, UserLevel, PermissionChecker
)
from backend.database import get_db_session

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET = "your-super-secret-jwt-key-change-in-production"
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Security
security = HTTPBearer()

class AuthenticationError(HTTPException):
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)

class AuthorizationError(HTTPException):
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

class RBACManager:
    """Central RBAC management class"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_access_token(self, user: User) -> str:
        """Create JWT access token"""
        payload = {
            "sub": str(user.id),
            "username": user.username,
            "email": user.email,
            "roles": [role.name for role in user.roles],
            "permissions": self._get_user_permissions(user),
            "branch_id": str(user.branch_id) if user.branch_id else None,
            "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            "iat": datetime.utcnow(),
            "type": "access"
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    def create_refresh_token(self, user: User) -> str:
        """Create JWT refresh token"""
        payload = {
            "sub": str(user.id),
            "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            "iat": datetime.utcnow(),
            "type": "refresh"
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    def verify_token(self, token: str, token_type: str = "access") -> Dict[str, Any]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            
            if payload.get("type") != token_type:
                raise AuthenticationError("Invalid token type")
            
            # Check if token is expired
            exp = payload.get("exp")
            if exp and datetime.utcnow() > datetime.fromtimestamp(exp):
                raise AuthenticationError("Token has expired")
            
            return payload
        
        except jwt.InvalidTokenError:
            raise AuthenticationError("Invalid token")
    
    def get_current_user(self, token: str) -> User:
        """Get current user from token"""
        payload = self.verify_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise AuthenticationError("Invalid token payload")
        
        user = self.db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise AuthenticationError("User not found or inactive")
        
        # Check if user is locked
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise AuthenticationError("Account is temporarily locked")
        
        return user
    
    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Authenticate user with username/password"""
        user = self.db.query(User).filter(
            or_(User.username == username, User.email == username),
            User.is_active == True
        ).first()
        
        if not user:
            return None
        
        # Check if account is locked
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise AuthenticationError("Account is temporarily locked")
        
        # Verify password
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        if user.password_hash != password_hash:
            # Increment failed login attempts
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.utcnow() + timedelta(minutes=30)
            self.db.commit()
            return None
        
        # Reset failed attempts on successful login
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login = datetime.utcnow()
        self.db.commit()
        
        return user
    
    def _get_user_permissions(self, user: User) -> List[str]:
        """Get all permissions for a user (direct + role-based)"""
        permissions = set()
        
        # Direct permissions
        for permission in user.direct_permissions:
            permissions.add(f"{permission.scope.value}:{permission.action}:{permission.resource}")
        
        # Role-based permissions
        for role in user.roles:
            for permission in role.permissions:
                permissions.add(f"{permission.scope.value}:{permission.action}:{permission.resource}")
        
        return list(permissions)
    
    def check_permission(self, user: User, scope: PermissionScope, action: str, resource: str) -> bool:
        """Check if user has specific permission"""
        return PermissionChecker.user_has_permission(user, scope, action, resource)
    
    def log_user_action(self, user: User, action: str, resource_type: str, 
                       resource_id: Optional[str] = None, details: Optional[Dict] = None,
                       request: Optional[Request] = None):
        """Log user action for audit trail"""
        audit_log = AuditLog(
            user_id=user.id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=request.client.host if request else None,
            user_agent=request.headers.get("user-agent") if request else None
        )
        self.db.add(audit_log)
        self.db.commit()

# Dependency functions for FastAPI
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db_session)
) -> User:
    """FastAPI dependency to get current authenticated user"""
    rbac_manager = RBACManager(db)
    return rbac_manager.get_current_user(credentials.credentials)

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """FastAPI dependency to get current active user"""
    if not current_user.is_active:
        raise AuthenticationError("User account is deactivated")
    return current_user

# Permission decorators
def require_permission(scope: PermissionScope, action: str, resource: str):
    """Decorator to require specific permission"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs (injected by FastAPI dependency)
            current_user = kwargs.get('current_user')
            if not current_user:
                raise AuthenticationError("Authentication required")
            
            rbac_manager = RBACManager(kwargs.get('db'))
            if not rbac_manager.check_permission(current_user, scope, action, resource):
                raise AuthorizationError(f"Permission denied: {scope.value}:{action}:{resource}")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_admin():
    """Decorator to require admin access"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise AuthenticationError("Authentication required")
            
            if not PermissionChecker.user_has_admin_access(current_user):
                raise AuthorizationError("Administrative access required")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_role(required_roles: List[UserLevel]):
    """Decorator to require specific roles"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise AuthenticationError("Authentication required")
            
            user_roles = [role.level for role in current_user.roles]
            if not any(role in required_roles for role in user_roles):
                raise AuthorizationError("Insufficient role permissions")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_branch_access(allow_admin_override: bool = True):
    """Decorator to require branch-specific access"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise AuthenticationError("Authentication required")
            
            # Admin override
            if allow_admin_override and PermissionChecker.user_has_admin_access(current_user):
                return await func(*args, **kwargs)
            
            # Check branch access
            accessible_branches = PermissionChecker.get_user_accessible_branches(current_user)
            requested_branch = kwargs.get('branch_id')
            
            if requested_branch and accessible_branches and requested_branch not in accessible_branches:
                raise AuthorizationError("Branch access denied")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Permission checking utilities for route handlers
class PermissionRequiredDep:
    """FastAPI dependency for permission checking"""
    
    def __init__(self, scope: PermissionScope, action: str, resource: str):
        self.scope = scope
        self.action = action
        self.resource = resource
    
    def __call__(self, current_user: User = Depends(get_current_active_user),
                 db: Session = Depends(get_db_session)):
        rbac_manager = RBACManager(db)
        if not rbac_manager.check_permission(current_user, self.scope, self.action, self.resource):
            raise AuthorizationError(f"Permission denied: {self.scope.value}:{self.action}:{self.resource}")
        return current_user

class AdminRequiredDep:
    """FastAPI dependency for admin checking"""
    
    def __call__(self, current_user: User = Depends(get_current_active_user)):
        if not PermissionChecker.user_has_admin_access(current_user):
            raise AuthorizationError("Administrative access required")
        return current_user

class RoleRequiredDep:
    """FastAPI dependency for role checking"""
    
    def __init__(self, required_roles: List[UserLevel]):
        self.required_roles = required_roles
    
    def __call__(self, current_user: User = Depends(get_current_active_user)):
        user_roles = [role.level for role in current_user.roles]
        if not any(role in self.required_roles for role in user_roles):
            raise AuthorizationError("Insufficient role permissions")
        return current_user

# Middleware for request logging
class AuditMiddleware:
    """Middleware to log all API requests for audit trail"""
    
    def __init__(self):
        pass
    
    async def __call__(self, request: Request, call_next):
        # Log request
        start_time = datetime.utcnow()
        
        try:
            response = await call_next(request)
            
            # Log successful request (if authenticated)
            if hasattr(request.state, 'user'):
                duration = (datetime.utcnow() - start_time).total_seconds()
                logger.info(
                    f"User {request.state.user.username} accessed {request.method} {request.url.path} "
                    f"- Status: {response.status_code} - Duration: {duration:.3f}s"
                )
            
            return response
            
        except Exception as e:
            # Log failed request
            if hasattr(request.state, 'user'):
                logger.error(
                    f"User {request.state.user.username} failed to access {request.method} {request.url.path} "
                    f"- Error: {str(e)}"
                )
            raise

# Helper functions for common permission checks
def can_access_agent(user: User, agent_scope: PermissionScope) -> bool:
    """Check if user can access a specific AI agent"""
    rbac_manager = RBACManager(Session())  # Note: In production, pass proper db session
    return rbac_manager.check_permission(user, agent_scope, "read", "agent")

def can_manage_bookings(user: User) -> bool:
    """Check if user can manage bookings"""
    rbac_manager = RBACManager(Session())
    return rbac_manager.check_permission(user, PermissionScope.BOOKING_MANAGEMENT, "update", "booking")

def can_view_analytics(user: User) -> bool:
    """Check if user can view analytics dashboard"""
    rbac_manager = RBACManager(Session())
    return rbac_manager.check_permission(user, PermissionScope.ANALYTICS_DASHBOARD, "read", "dashboard")

def can_export_data(user: User) -> bool:
    """Check if user can export data"""
    rbac_manager = RBACManager(Session())
    return rbac_manager.check_permission(user, PermissionScope.DATA_EXPORT, "execute", "export")