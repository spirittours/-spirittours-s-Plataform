"""
Role-Based Access Control (RBAC) Models
Comprehensive permission system for Spirit Tours AI Platform
"""

from typing import List, Optional, Dict, Any
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table, Text, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Session
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid
import enum
from pydantic import BaseModel

Base = declarative_base()

# Association tables for many-to-many relationships
user_roles_association = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id')),
    Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id'))
)

role_permissions_association = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', UUID(as_uuid=True), ForeignKey('roles.id')),
    Column('permission_id', UUID(as_uuid=True), ForeignKey('permissions.id'))
)

user_permissions_association = Table(
    'user_permissions',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id')),
    Column('permission_id', UUID(as_uuid=True), ForeignKey('permissions.id'))
)

class UserLevel(enum.Enum):
    """Hierarchical user levels with increasing privileges"""
    # Support Levels (1-10)
    VIEWER = "viewer"
    COORDINATOR = "coordinator"
    ANALYST = "analyst"
    
    # Operational Levels (11-30)
    CUSTOMER_SERVICE = "customer_service"
    MARKETING_SPECIALIST = "marketing_specialist"
    TRAVEL_AGENT = "travel_agent"
    SENIOR_AGENT = "senior_agent"
    
    # Management Levels (31-50)
    DEPARTMENT_HEAD = "department_head"
    BRANCH_MANAGER = "branch_manager"
    REGIONAL_DIRECTOR = "regional_director"
    
    # Administrative Levels (51-100)
    GENERAL_MANAGER = "general_manager"
    SYSTEM_ADMINISTRATOR = "system_administrator"
    SUPER_ADMINISTRATOR = "super_administrator"

class PermissionScope(enum.Enum):
    """Permission scopes for different areas of the system"""
    # AI Agents Access
    ETHICAL_TOURISM = "ethical_tourism"
    SUSTAINABLE_TRAVEL = "sustainable_travel"
    CULTURAL_IMMERSION = "cultural_immersion"
    ADVENTURE_PLANNER = "adventure_planner"
    LUXURY_CONCIERGE = "luxury_concierge"
    BUDGET_OPTIMIZER = "budget_optimizer"
    ACCESSIBILITY_COORDINATOR = "accessibility_coordinator"
    GROUP_COORDINATOR = "group_coordinator"
    CRISIS_MANAGER = "crisis_manager"
    CARBON_FOOTPRINT = "carbon_footprint"
    DESTINATION_EXPERT = "destination_expert"
    BOOKING_ASSISTANT = "booking_assistant"
    CUSTOMER_EXPERIENCE = "customer_experience"
    TRAVEL_INSURANCE = "travel_insurance"
    VISA_CONSULTANT = "visa_consultant"
    WEATHER_ADVISOR = "weather_advisor"
    HEALTH_SAFETY = "health_safety"
    LOCAL_CUISINE = "local_cuisine"
    TRANSPORTATION_OPTIMIZER = "transportation_optimizer"
    ACCOMMODATION_SPECIALIST = "accommodation_specialist"
    ITINERARY_PLANNER = "itinerary_planner"
    REVIEW_ANALYZER = "review_analyzer"
    SOCIAL_IMPACT = "social_impact"
    MULTILINGUAL_ASSISTANT = "multilingual_assistant"
    VIRTUAL_TOUR_CREATOR = "virtual_tour_creator"
    
    # Business Functions
    USER_MANAGEMENT = "user_management"
    ANALYTICS_DASHBOARD = "analytics_dashboard"
    FINANCIAL_REPORTS = "financial_reports"
    BOOKING_MANAGEMENT = "booking_management"
    CUSTOMER_DATABASE = "customer_database"
    MARKETING_CAMPAIGNS = "marketing_campaigns"
    CONTENT_MANAGEMENT = "content_management"
    SYSTEM_CONFIGURATION = "system_configuration"
    AUDIT_LOGS = "audit_logs"
    DATA_EXPORT = "data_export"
    BRANCH_MANAGEMENT = "branch_management"
    
    # System Administration
    DATABASE_ACCESS = "database_access"
    API_MANAGEMENT = "api_management"
    SECURITY_SETTINGS = "security_settings"
    BACKUP_RESTORE = "backup_restore"
    SYSTEM_MONITORING = "system_monitoring"

class Permission(Base):
    __tablename__ = 'permissions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    scope = Column(SQLEnum(PermissionScope), nullable=False)
    action = Column(String(50), nullable=False)  # create, read, update, delete, execute
    resource = Column(String(100), nullable=False)  # specific resource or endpoint
    conditions = Column(JSON, nullable=True)  # Additional conditions (e.g., branch restrictions)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    roles = relationship("Role", secondary=role_permissions_association, back_populates="permissions")
    users = relationship("User", secondary=user_permissions_association, back_populates="direct_permissions")

class Role(Base):
    __tablename__ = 'roles'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    level = Column(SQLEnum(UserLevel), nullable=False)
    hierarchy_level = Column(Integer, nullable=False)  # 1-100 for permission hierarchy
    is_system_role = Column(Boolean, default=False)  # Cannot be deleted
    branch_restricted = Column(Boolean, default=False)  # Role limited to specific branches
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = relationship("User", secondary=user_roles_association, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions_association, back_populates="roles")

class Branch(Base):
    __tablename__ = 'branches'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    code = Column(String(10), unique=True, nullable=False)
    country = Column(String(50), nullable=False)
    city = Column(String(50), nullable=False)
    region = Column(String(50), nullable=True)
    is_headquarters = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = relationship("User", back_populates="branch")

class User(Base):
    __tablename__ = 'users'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    phone = Column(String(20), nullable=True)
    
    # Access Control
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    force_password_change = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    
    # Branch Assignment
    branch_id = Column(UUID(as_uuid=True), ForeignKey('branches.id'), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
    
    # Relationships
    roles = relationship("Role", secondary=user_roles_association, back_populates="users")
    direct_permissions = relationship("Permission", secondary=user_permissions_association, back_populates="users")
    branch = relationship("Branch", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")

class SessionToken(Base):
    __tablename__ = 'session_tokens'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    token_hash = Column(String(255), nullable=False)
    refresh_token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

# Pydantic Models for API
class PermissionResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    scope: str
    action: str
    resource: str
    conditions: Optional[Dict[str, Any]] = None

class RoleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    level: str
    hierarchy_level: int
    permissions: List[PermissionResponse] = []

class BranchResponse(BaseModel):
    id: str
    name: str
    code: str
    country: str
    city: str
    region: Optional[str]
    is_headquarters: bool
    is_active: bool

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    is_active: bool
    is_verified: bool
    branch: Optional[BranchResponse]
    roles: List[RoleResponse] = []
    permissions: List[PermissionResponse] = []
    last_login: Optional[datetime]

class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    branch_id: Optional[str] = None
    role_ids: List[str] = []
    permission_ids: List[str] = []

class UpdateUserRequest(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    branch_id: Optional[str] = None
    role_ids: Optional[List[str]] = None
    permission_ids: Optional[List[str]] = None

# Permission Checking Utilities
class PermissionChecker:
    """Utility class for checking user permissions"""
    
    @staticmethod
    def user_has_permission(user: User, scope: PermissionScope, action: str, resource: str) -> bool:
        """Check if user has specific permission"""
        # Check direct permissions
        for permission in user.direct_permissions:
            if (permission.scope == scope and 
                permission.action == action and 
                permission.resource == resource):
                return True
        
        # Check role-based permissions
        for role in user.roles:
            for permission in role.permissions:
                if (permission.scope == scope and 
                    permission.action == action and 
                    permission.resource == resource):
                    return True
        
        return False
    
    @staticmethod
    def user_has_admin_access(user: User) -> bool:
        """Check if user has administrative access"""
        admin_levels = [
            UserLevel.SUPER_ADMINISTRATOR,
            UserLevel.SYSTEM_ADMINISTRATOR,
            UserLevel.GENERAL_MANAGER
        ]
        
        for role in user.roles:
            if role.level in admin_levels:
                return True
        
        return False
    
    @staticmethod
    def user_can_manage_users(user: User) -> bool:
        """Check if user can manage other users"""
        return PermissionChecker.user_has_permission(
            user, PermissionScope.USER_MANAGEMENT, "create", "user"
        ) or PermissionChecker.user_has_admin_access(user)
    
    @staticmethod
    def get_user_accessible_branches(user: User) -> List[str]:
        """Get list of branch IDs user can access"""
        if PermissionChecker.user_has_admin_access(user):
            return []  # Empty list means access to all branches
        
        accessible_branches = []
        if user.branch_id:
            accessible_branches.append(str(user.branch_id))
        
        # Check for regional access through roles
        for role in user.roles:
            if role.level == UserLevel.REGIONAL_DIRECTOR:
                # Regional directors can access multiple branches
                # This would be configured based on business logic
                pass
        
        return accessible_branches