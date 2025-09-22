"""
Admin API Endpoints
Complete administrative control for user, role, and permission management
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
import hashlib
from datetime import datetime, timedelta, timezone
import uuid

from backend.models.rbac_models import (
    User, Role, Permission, Branch, AuditLog, SessionToken,
    PermissionScope, UserLevel, PermissionChecker,
    UserResponse, CreateUserRequest, UpdateUserRequest,
    RoleResponse, PermissionResponse, BranchResponse
)
from backend.auth.rbac_middleware import (
    get_current_active_user, AdminRequiredDep, PermissionRequiredDep,
    RBACManager, AuthorizationError, require_admin
)
from backend.database import get_db_session

router = APIRouter(prefix="/admin", tags=["Admin Management"])

# User Management Endpoints
@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    role_name: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Get all users with filtering and pagination - Admin only"""
    
    query = db.query(User).options(
        joinedload(User.roles),
        joinedload(User.direct_permissions),
        joinedload(User.branch)
    )
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.first_name.ilike(f"%{search}%"),
                User.last_name.ilike(f"%{search}%")
            )
        )
    
    if branch_id:
        query = query.filter(User.branch_id == branch_id)
    
    if role_name:
        query = query.join(User.roles).filter(Role.name.ilike(f"%{role_name}%"))
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    # Pagination
    offset = (page - 1) * limit
    users = query.offset(offset).limit(limit).all()
    
    # Convert to response format
    return [_user_to_response(user) for user in users]

@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: CreateUserRequest,
    request: Request,
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Create a new user - Admin only"""
    
    # Check if username or email already exists
    existing_user = db.query(User).filter(
        or_(User.username == user_data.username, User.email == user_data.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )
    
    # Hash password
    password_hash = hashlib.sha256(user_data.password.encode()).hexdigest()
    
    # Create user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=password_hash,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        branch_id=user_data.branch_id,
        created_by=current_user.id,
        force_password_change=True  # Force new users to change password
    )
    
    db.add(new_user)
    db.flush()  # Get the user ID
    
    # Assign roles
    if user_data.role_ids:
        roles = db.query(Role).filter(Role.id.in_(user_data.role_ids)).all()
        new_user.roles = roles
    
    # Assign direct permissions
    if user_data.permission_ids:
        permissions = db.query(Permission).filter(Permission.id.in_(user_data.permission_ids)).all()
        new_user.direct_permissions = permissions
    
    db.commit()
    
    # Log action
    rbac_manager = RBACManager(db)
    rbac_manager.log_user_action(
        current_user, "create_user", "user", str(new_user.id),
        {"username": new_user.username, "email": new_user.email}, request
    )
    
    # Reload user with relationships
    db.refresh(new_user)
    return _user_to_response(new_user)

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Get user by ID - Admin only"""
    
    user = db.query(User).options(
        joinedload(User.roles),
        joinedload(User.direct_permissions),
        joinedload(User.branch)
    ).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return _user_to_response(user)

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UpdateUserRequest,
    request: Request,
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Update user - Admin only"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deactivation for super admins
    if (user.id == current_user.id and 
        user_data.is_active is False and 
        any(role.level == UserLevel.SUPER_ADMINISTRATOR for role in current_user.roles)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super administrators cannot deactivate themselves"
        )
    
    # Update fields
    update_fields = {}
    if user_data.email is not None:
        # Check email uniqueness
        existing = db.query(User).filter(User.email == user_data.email, User.id != user_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )
        user.email = user_data.email
        update_fields['email'] = user_data.email
    
    if user_data.first_name is not None:
        user.first_name = user_data.first_name
        update_fields['first_name'] = user_data.first_name
    
    if user_data.last_name is not None:
        user.last_name = user_data.last_name
        update_fields['last_name'] = user_data.last_name
    
    if user_data.phone is not None:
        user.phone = user_data.phone
        update_fields['phone'] = user_data.phone
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
        update_fields['is_active'] = user_data.is_active
    
    if user_data.branch_id is not None:
        user.branch_id = user_data.branch_id
        update_fields['branch_id'] = user_data.branch_id
    
    # Update roles
    if user_data.role_ids is not None:
        roles = db.query(Role).filter(Role.id.in_(user_data.role_ids)).all()
        user.roles = roles
        update_fields['roles'] = [role.name for role in roles]
    
    # Update permissions
    if user_data.permission_ids is not None:
        permissions = db.query(Permission).filter(Permission.id.in_(user_data.permission_ids)).all()
        user.direct_permissions = permissions
        update_fields['permissions'] = [perm.name for perm in permissions]
    
    user.updated_at = datetime.utcnow()
    db.commit()
    
    # Log action
    rbac_manager = RBACManager(db)
    rbac_manager.log_user_action(
        current_user, "update_user", "user", str(user.id),
        {"updated_fields": update_fields}, request
    )
    
    # Reload user with relationships
    db.refresh(user)
    return _user_to_response(user)

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Delete user - Admin only"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deletion
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Prevent deletion of super administrators
    if any(role.level == UserLevel.SUPER_ADMINISTRATOR for role in user.roles):
        super_admin_count = db.query(User).join(User.roles).filter(
            Role.level == UserLevel.SUPER_ADMINISTRATOR,
            User.is_active == True
        ).count()
        
        if super_admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last super administrator"
            )
    
    username = user.username
    db.delete(user)
    db.commit()
    
    # Log action
    rbac_manager = RBACManager(db)
    rbac_manager.log_user_action(
        current_user, "delete_user", "user", user_id,
        {"username": username}, request
    )
    
    return {"message": "User deleted successfully"}

@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    new_password: str,
    request: Request,
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Reset user password - Admin only"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Hash new password
    password_hash = hashlib.sha256(new_password.encode()).hexdigest()
    user.password_hash = password_hash
    user.force_password_change = True
    user.failed_login_attempts = 0
    user.locked_until = None
    user.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Log action
    rbac_manager = RBACManager(db)
    rbac_manager.log_user_action(
        current_user, "reset_password", "user", str(user.id),
        {"username": user.username}, request
    )
    
    return {"message": "Password reset successfully"}

# Role Management Endpoints
@router.get("/roles", response_model=List[RoleResponse])
async def get_all_roles(
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Get all roles - Admin only"""
    
    roles = db.query(Role).options(joinedload(Role.permissions)).all()
    return [_role_to_response(role) for role in roles]

@router.post("/roles", response_model=RoleResponse)
async def create_role(
    name: str,
    description: str,
    level: UserLevel,
    permission_ids: List[str],
    request: Request,
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Create a new role - Admin only"""
    
    # Check if role name already exists
    existing_role = db.query(Role).filter(Role.name == name).first()
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role name already exists"
        )
    
    # Create role
    new_role = Role(
        name=name,
        description=description,
        level=level,
        hierarchy_level=_get_hierarchy_level(level),
        is_system_role=False
    )
    
    db.add(new_role)
    db.flush()
    
    # Assign permissions
    permissions = db.query(Permission).filter(Permission.id.in_(permission_ids)).all()
    new_role.permissions = permissions
    
    db.commit()
    
    # Log action
    rbac_manager = RBACManager(db)
    rbac_manager.log_user_action(
        current_user, "create_role", "role", str(new_role.id),
        {"name": name, "level": level.value}, request
    )
    
    db.refresh(new_role)
    return _role_to_response(new_role)

# Permission Management Endpoints
@router.get("/permissions", response_model=List[PermissionResponse])
async def get_all_permissions(
    scope: Optional[PermissionScope] = Query(None),
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Get all permissions - Admin only"""
    
    query = db.query(Permission)
    
    if scope:
        query = query.filter(Permission.scope == scope)
    
    permissions = query.all()
    return [_permission_to_response(perm) for perm in permissions]

# Branch Management Endpoints
@router.get("/branches", response_model=List[BranchResponse])
async def get_all_branches(
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Get all branches - Admin only"""
    
    branches = db.query(Branch).all()
    return [_branch_to_response(branch) for branch in branches]

@router.post("/branches", response_model=BranchResponse)
async def create_branch(
    name: str,
    code: str,
    country: str,
    city: str,
    request: Request,
    region: Optional[str] = None,
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Create a new branch - Admin only"""
    
    # Check if branch code already exists
    existing_branch = db.query(Branch).filter(Branch.code == code).first()
    if existing_branch:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Branch code already exists"
        )
    
    new_branch = Branch(
        name=name,
        code=code,
        country=country,
        city=city,
        region=region
    )
    
    db.add(new_branch)
    db.commit()
    
    # Log action
    rbac_manager = RBACManager(db)
    rbac_manager.log_user_action(
        current_user, "create_branch", "branch", str(new_branch.id),
        {"name": name, "code": code}, request
    )
    
    db.refresh(new_branch)
    return _branch_to_response(new_branch)

# Audit and Monitoring Endpoints
@router.get("/audit-logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Get audit logs - Admin only"""
    
    query = db.query(AuditLog).options(joinedload(AuditLog.user))
    
    # Apply filters
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    
    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)
    
    if end_date:
        query = query.filter(AuditLog.timestamp <= end_date)
    
    # Order by timestamp desc
    query = query.order_by(AuditLog.timestamp.desc())
    
    # Pagination
    offset = (page - 1) * limit
    logs = query.offset(offset).limit(limit).all()
    
    return [
        {
            "id": str(log.id),
            "user": {
                "id": str(log.user.id),
                "username": log.user.username,
                "email": log.user.email
            },
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp
        }
        for log in logs
    ]

# System Analytics Endpoints
@router.get("/analytics/users")
async def get_user_analytics(
    current_user: User = Depends(AdminRequiredDep()),
    db: Session = Depends(get_db_session)
):
    """Get user analytics - Admin only"""
    
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    verified_users = db.query(User).filter(User.is_verified == True).count()
    
    # Users by role
    role_stats = db.query(
        Role.name,
        func.count(User.id).label('count')
    ).join(User.roles).group_by(Role.name).all()
    
    # Users by branch
    branch_stats = db.query(
        Branch.name,
        func.count(User.id).label('count')
    ).outerjoin(User).group_by(Branch.name).all()
    
    # Recent login activity
    recent_logins = db.query(User).filter(
        User.last_login >= datetime.utcnow() - timedelta(days=30)
    ).count()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "verified_users": verified_users,
        "recent_logins_30d": recent_logins,
        "users_by_role": [{"role": role, "count": count} for role, count in role_stats],
        "users_by_branch": [{"branch": branch, "count": count} for branch, count in branch_stats]
    }

# Helper functions
def _user_to_response(user: User) -> UserResponse:
    """Convert User model to UserResponse"""
    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        phone=user.phone,
        is_active=user.is_active,
        is_verified=user.is_verified,
        branch=_branch_to_response(user.branch) if user.branch else None,
        roles=[_role_to_response(role) for role in user.roles],
        permissions=[_permission_to_response(perm) for perm in user.direct_permissions],
        last_login=user.last_login
    )

def _role_to_response(role: Role) -> RoleResponse:
    """Convert Role model to RoleResponse"""
    return RoleResponse(
        id=str(role.id),
        name=role.name,
        description=role.description,
        level=role.level.value,
        hierarchy_level=role.hierarchy_level,
        permissions=[_permission_to_response(perm) for perm in role.permissions]
    )

def _permission_to_response(permission: Permission) -> PermissionResponse:
    """Convert Permission model to PermissionResponse"""
    return PermissionResponse(
        id=str(permission.id),
        name=permission.name,
        description=permission.description,
        scope=permission.scope.value,
        action=permission.action,
        resource=permission.resource,
        conditions=permission.conditions
    )

def _branch_to_response(branch: Branch) -> BranchResponse:
    """Convert Branch model to BranchResponse"""
    return BranchResponse(
        id=str(branch.id),
        name=branch.name,
        code=branch.code,
        country=branch.country,
        city=branch.city,
        region=branch.region,
        is_headquarters=branch.is_headquarters,
        is_active=branch.is_active
    )

def _get_hierarchy_level(user_level: UserLevel) -> int:
    """Get numeric hierarchy level for user level"""
    hierarchy_map = {
        UserLevel.VIEWER: 1,
        UserLevel.COORDINATOR: 5,
        UserLevel.ANALYST: 10,
        UserLevel.CUSTOMER_SERVICE: 15,
        UserLevel.MARKETING_SPECIALIST: 20,
        UserLevel.TRAVEL_AGENT: 25,
        UserLevel.SENIOR_AGENT: 30,
        UserLevel.DEPARTMENT_HEAD: 40,
        UserLevel.BRANCH_MANAGER: 50,
        UserLevel.REGIONAL_DIRECTOR: 60,
        UserLevel.GENERAL_MANAGER: 70,
        UserLevel.SYSTEM_ADMINISTRATOR: 85,
        UserLevel.SUPER_ADMINISTRATOR: 100
    }
    return hierarchy_map.get(user_level, 1)