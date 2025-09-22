"""
Authentication API Endpoints
Login, logout, token refresh, and user profile management
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, EmailStr
import hashlib
from datetime import datetime, timedelta

from backend.models.rbac_models import (
    User, Role, Permission, Branch,
    UserResponse, PermissionScope, UserLevel
)
from backend.auth.rbac_middleware import (
    RBACManager, get_current_active_user,
    AuthenticationError, AuthorizationError
)
from backend.database import get_db_session

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Request/Response Models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
    expires_in: int

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db_session)
):
    """User login endpoint"""
    
    rbac_manager = RBACManager(db)
    
    # Authenticate user
    user = rbac_manager.authenticate_user(login_data.username, login_data.password)
    if not user:
        raise AuthenticationError("Invalid credentials")
    
    # Check if user is verified
    if not user.is_verified:
        raise AuthenticationError("Account not verified. Please contact administrator.")
    
    # Generate tokens
    access_token = rbac_manager.create_access_token(user)
    refresh_token = rbac_manager.create_refresh_token(user)
    
    # Log successful login
    rbac_manager.log_user_action(
        user, "login", "session", None, 
        {"ip_address": request.client.host}, request
    )
    
    # Load user with relationships for response
    user_with_relations = db.query(User).options(
        joinedload(User.roles).joinedload(Role.permissions),
        joinedload(User.direct_permissions),
        joinedload(User.branch)
    ).filter(User.id == user.id).first()
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_to_response(user_with_relations),
        expires_in=30 * 60  # 30 minutes in seconds
    )

@router.post("/refresh", response_model=Dict[str, Any])
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db_session)
):
    """Refresh access token"""
    
    rbac_manager = RBACManager(db)
    
    try:
        # Verify refresh token
        payload = rbac_manager.verify_token(refresh_data.refresh_token, "refresh")
        user_id = payload.get("sub")
        
        # Get user
        user = db.query(User).filter(
            User.id == user_id, 
            User.is_active == True
        ).first()
        
        if not user:
            raise AuthenticationError("User not found or inactive")
        
        # Generate new access token
        access_token = rbac_manager.create_access_token(user)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": 30 * 60
        }
        
    except Exception as e:
        raise AuthenticationError("Invalid refresh token")

@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """User logout endpoint"""
    
    rbac_manager = RBACManager(db)
    
    # Log logout action
    rbac_manager.log_user_action(
        current_user, "logout", "session", None,
        {"ip_address": request.client.host}, request
    )
    
    # In a production system, you would invalidate the token here
    # by adding it to a blacklist or removing it from active sessions
    
    return {"message": "Successfully logged out"}

@router.get("/profile", response_model=UserResponse)
async def get_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Get current user profile"""
    
    # Load user with all relationships
    user_with_relations = db.query(User).options(
        joinedload(User.roles).joinedload(Role.permissions),
        joinedload(User.direct_permissions),
        joinedload(User.branch)
    ).filter(User.id == current_user.id).first()
    
    return _user_to_response(user_with_relations)

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UpdateProfileRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Update current user profile"""
    
    rbac_manager = RBACManager(db)
    
    # Update fields
    update_fields = {}
    
    if profile_data.first_name is not None:
        current_user.first_name = profile_data.first_name
        update_fields['first_name'] = profile_data.first_name
    
    if profile_data.last_name is not None:
        current_user.last_name = profile_data.last_name
        update_fields['last_name'] = profile_data.last_name
    
    if profile_data.phone is not None:
        current_user.phone = profile_data.phone
        update_fields['phone'] = profile_data.phone
    
    if profile_data.email is not None:
        # Check email uniqueness
        existing = db.query(User).filter(
            User.email == profile_data.email,
            User.id != current_user.id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
        
        current_user.email = profile_data.email
        current_user.is_verified = False  # Re-verify email
        update_fields['email'] = profile_data.email
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    # Log action
    rbac_manager.log_user_action(
        current_user, "update_profile", "user", str(current_user.id),
        {"updated_fields": update_fields}, request
    )
    
    # Reload with relationships
    user_with_relations = db.query(User).options(
        joinedload(User.roles).joinedload(Role.permissions),
        joinedload(User.direct_permissions),
        joinedload(User.branch)
    ).filter(User.id == current_user.id).first()
    
    return _user_to_response(user_with_relations)

@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Change user password"""
    
    rbac_manager = RBACManager(db)
    
    # Verify current password
    current_password_hash = hashlib.sha256(password_data.current_password.encode()).hexdigest()
    if current_user.password_hash != current_password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password (add your password policy here)
    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Update password
    new_password_hash = hashlib.sha256(password_data.new_password.encode()).hexdigest()
    current_user.password_hash = new_password_hash
    current_user.force_password_change = False
    current_user.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Log action
    rbac_manager.log_user_action(
        current_user, "change_password", "user", str(current_user.id),
        {"changed_by": "self"}, request
    )
    
    return {"message": "Password changed successfully"}

@router.get("/permissions")
async def get_user_permissions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Get current user's permissions"""
    
    permissions = set()
    
    # Direct permissions
    for permission in current_user.direct_permissions:
        permissions.add({
            "scope": permission.scope.value,
            "action": permission.action,
            "resource": permission.resource,
            "source": "direct"
        })
    
    # Role-based permissions
    for role in current_user.roles:
        for permission in role.permissions:
            permissions.add({
                "scope": permission.scope.value,
                "action": permission.action,
                "resource": permission.resource,
                "source": f"role:{role.name}"
            })
    
    return {
        "user_id": str(current_user.id),
        "username": current_user.username,
        "permissions": list(permissions),
        "is_admin": any(
            role.level in [
                UserLevel.SUPER_ADMINISTRATOR,
                UserLevel.SYSTEM_ADMINISTRATOR,
                UserLevel.GENERAL_MANAGER
            ]
            for role in current_user.roles
        )
    }

@router.get("/check-permission/{scope}/{action}/{resource}")
async def check_permission(
    scope: str,
    action: str,
    resource: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Check if current user has specific permission"""
    
    try:
        permission_scope = PermissionScope(scope)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid permission scope"
        )
    
    rbac_manager = RBACManager(db)
    has_permission = rbac_manager.check_permission(
        current_user, permission_scope, action, resource
    )
    
    return {
        "has_permission": has_permission,
        "scope": scope,
        "action": action,
        "resource": resource
    }

@router.get("/accessible-agents")
async def get_accessible_agents(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Get list of AI agents current user can access"""
    
    rbac_manager = RBACManager(db)
    accessible_agents = []
    
    # Define all available agents
    agent_scopes = [
        ("Ethical Tourism Advisor", PermissionScope.ETHICAL_TOURISM),
        ("Sustainable Travel Planner", PermissionScope.SUSTAINABLE_TRAVEL),
        ("Cultural Immersion Guide", PermissionScope.CULTURAL_IMMERSION),
        ("Adventure Planner", PermissionScope.ADVENTURE_PLANNER),
        ("Luxury Concierge", PermissionScope.LUXURY_CONCIERGE),
        ("Budget Optimizer", PermissionScope.BUDGET_OPTIMIZER),
        ("Accessibility Coordinator", PermissionScope.ACCESSIBILITY_COORDINATOR),
        ("Group Coordinator", PermissionScope.GROUP_COORDINATOR),
        ("Crisis Manager", PermissionScope.CRISIS_MANAGER),
        ("Carbon Footprint Analyzer", PermissionScope.CARBON_FOOTPRINT),
        ("Destination Expert", PermissionScope.DESTINATION_EXPERT),
        ("Booking Assistant", PermissionScope.BOOKING_ASSISTANT),
        ("Customer Experience Manager", PermissionScope.CUSTOMER_EXPERIENCE),
        ("Travel Insurance Advisor", PermissionScope.TRAVEL_INSURANCE),
        ("Visa Consultant", PermissionScope.VISA_CONSULTANT),
        ("Weather Advisor", PermissionScope.WEATHER_ADVISOR),
        ("Health & Safety Coordinator", PermissionScope.HEALTH_SAFETY),
        ("Local Cuisine Guide", PermissionScope.LOCAL_CUISINE),
        ("Transportation Optimizer", PermissionScope.TRANSPORTATION_OPTIMIZER),
        ("Accommodation Specialist", PermissionScope.ACCOMMODATION_SPECIALIST),
        ("Itinerary Planner", PermissionScope.ITINERARY_PLANNER),
        ("Review Analyzer", PermissionScope.REVIEW_ANALYZER),
        ("Social Impact Assessor", PermissionScope.SOCIAL_IMPACT),
        ("Multilingual Assistant", PermissionScope.MULTILINGUAL_ASSISTANT),
        ("Virtual Tour Creator", PermissionScope.VIRTUAL_TOUR_CREATOR)
    ]
    
    # Check access for each agent
    for agent_name, agent_scope in agent_scopes:
        if rbac_manager.check_permission(current_user, agent_scope, "read", "agent"):
            accessible_agents.append({
                "name": agent_name,
                "scope": agent_scope.value,
                "can_execute": rbac_manager.check_permission(current_user, agent_scope, "execute", "agent")
            })
    
    return {
        "user_id": str(current_user.id),
        "accessible_agents": accessible_agents,
        "total_agents": len(accessible_agents)
    }

@router.get("/dashboard-access")
async def get_dashboard_access(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db_session)
):
    """Get dashboard sections current user can access"""
    
    rbac_manager = RBACManager(db)
    
    dashboard_sections = {
        "analytics": rbac_manager.check_permission(
            current_user, PermissionScope.ANALYTICS_DASHBOARD, "read", "dashboard"
        ),
        "financial_reports": rbac_manager.check_permission(
            current_user, PermissionScope.FINANCIAL_REPORTS, "read", "report"
        ),
        "booking_management": rbac_manager.check_permission(
            current_user, PermissionScope.BOOKING_MANAGEMENT, "read", "booking"
        ),
        "customer_database": rbac_manager.check_permission(
            current_user, PermissionScope.CUSTOMER_DATABASE, "read", "customer"
        ),
        "marketing_campaigns": rbac_manager.check_permission(
            current_user, PermissionScope.MARKETING_CAMPAIGNS, "read", "campaign"
        ),
        "user_management": rbac_manager.check_permission(
            current_user, PermissionScope.USER_MANAGEMENT, "read", "user"
        ),
        "system_configuration": rbac_manager.check_permission(
            current_user, PermissionScope.SYSTEM_CONFIGURATION, "read", "config"
        ),
        "audit_logs": rbac_manager.check_permission(
            current_user, PermissionScope.AUDIT_LOGS, "read", "log"
        )
    }
    
    return {
        "user_id": str(current_user.id),
        "dashboard_access": dashboard_sections,
        "is_admin": any(
            role.level in [
                UserLevel.SUPER_ADMINISTRATOR,
                UserLevel.SYSTEM_ADMINISTRATOR,
                UserLevel.GENERAL_MANAGER
            ]
            for role in current_user.roles
        )
    }

# Helper functions
def _user_to_response(user: User) -> UserResponse:
    """Convert User model to UserResponse"""
    from backend.api.admin_api import _user_to_response as admin_user_to_response
    return admin_user_to_response(user)