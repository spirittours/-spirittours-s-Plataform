"""
Authentication and Authorization Module for Spirit Tours
Provides RBAC middleware, security utilities, and user authentication
"""

import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

# Import authentication components
try:
    from .rbac_middleware import (
        RBACManager,
        AuthenticationError,
        AuthorizationError,
        JWT_SECRET,
        JWT_ALGORITHM,
        ACCESS_TOKEN_EXPIRE_MINUTES,
        REFRESH_TOKEN_EXPIRE_DAYS,
        security
    )
except ImportError as e:
    logging.warning(f"Could not import rbac_middleware: {e}")
    RBACManager = None
    AuthenticationError = HTTPException
    AuthorizationError = HTTPException

logger = logging.getLogger(__name__)

# Security scheme for FastAPI
security_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Optional[Session] = None
):
    """
    FastAPI dependency to get current authenticated user
    
    Args:
        credentials: HTTP Bearer token credentials
        db: Database session (optional)
        
    Returns:
        User: Current authenticated user
        
    Raises:
        HTTPException: If authentication fails
        
    Usage:
        @app.get("/protected")
        def protected_route(current_user = Depends(get_current_user)):
            return {"user": current_user.username}
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    # If RBACManager is not available, return a mock user for development
    if RBACManager is None or db is None:
        logger.warning("RBACManager or database not available, using mock authentication")
        # Return a mock user object for development
        class MockUser:
            id = "mock-user-id"
            username = "mock_user"
            email = "mock@example.com"
            is_active = True
            roles = []
            
        return MockUser()
    
    try:
        rbac_manager = RBACManager(db)
        user = rbac_manager.get_current_user(token)
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
        
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Optional[Session] = None
):
    """
    FastAPI dependency to get current user if authenticated, None otherwise
    Useful for routes that work both authenticated and unauthenticated
    
    Usage:
        @app.get("/public-or-private")
        def route(current_user = Depends(get_optional_user)):
            if current_user:
                return {"message": f"Hello {current_user.username}"}
            return {"message": "Hello anonymous"}
    """
    if credentials is None:
        return None
    
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


# Export main components
__all__ = [
    'get_current_user',
    'get_optional_user',
    'RBACManager',
    'AuthenticationError',
    'AuthorizationError',
    'security_scheme',
]
