#!/usr/bin/env python3
"""
Role-Based Access Control (RBAC) System for Spirit Tours
Comprehensive authorization system with roles, permissions, and dynamic access control
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Set, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import redis
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.dialects.postgresql import JSON


# Database models
Base = declarative_base()

# Many-to-many relationship tables
user_roles = Table('user_roles', Base.metadata,
    Column('user_id', String, ForeignKey('users.id'), primary_key=True),
    Column('role_id', String, ForeignKey('roles.id'), primary_key=True),
    Column('assigned_at', DateTime, default=datetime.utcnow),
    Column('assigned_by', String, ForeignKey('users.id')),
    Column('expires_at', DateTime, nullable=True)
)

role_permissions = Table('role_permissions', Base.metadata,
    Column('role_id', String, ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', String, ForeignKey('permissions.id'), primary_key=True),
    Column('granted_at', DateTime, default=datetime.utcnow),
    Column('granted_by', String, ForeignKey('users.id'))
)

user_permissions = Table('user_permissions', Base.metadata,
    Column('user_id', String, ForeignKey('users.id'), primary_key=True),
    Column('permission_id', String, ForeignKey('permissions.id'), primary_key=True),
    Column('granted_at', DateTime, default=datetime.utcnow),
    Column('granted_by', String, ForeignKey('users.id')),
    Column('expires_at', DateTime, nullable=True)
)


class User(Base):
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    username = Column(String, unique=True, nullable=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # RBAC relationships
    roles = relationship('Role', secondary=user_roles, back_populates='users')
    direct_permissions = relationship('Permission', secondary=user_permissions, back_populates='direct_users')
    
    # Audit relationships
    granted_roles = relationship('Role', secondary=user_roles, 
                               primaryjoin="User.id == user_roles.c.assigned_by",
                               back_populates='granted_by_users')
    granted_permissions = relationship('Permission', secondary=user_permissions,
                                     primaryjoin="User.id == user_permissions.c.granted_by",
                                     back_populates='granted_by_users')


class Role(Base):
    __tablename__ = 'roles'
    
    id = Column(String, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    is_system_role = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Hierarchy
    parent_role_id = Column(String, ForeignKey('roles.id'), nullable=True)
    parent_role = relationship('Role', remote_side=[id], back_populates='child_roles')
    child_roles = relationship('Role', back_populates='parent_role')
    
    # RBAC relationships
    users = relationship('User', secondary=user_roles, back_populates='roles')
    permissions = relationship('Permission', secondary=role_permissions, back_populates='roles')
    
    # Audit relationships
    granted_by_users = relationship('User', secondary=user_roles,
                                  primaryjoin="Role.id == user_roles.c.role_id",
                                  back_populates='granted_roles')


class Permission(Base):
    __tablename__ = 'permissions'
    
    id = Column(String, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    resource = Column(String, nullable=False)  # e.g., 'calls', 'bookings', 'users'
    action = Column(String, nullable=False)    # e.g., 'read', 'write', 'delete'
    conditions = Column(JSON, nullable=True)   # Dynamic conditions
    is_system_permission = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # RBAC relationships
    roles = relationship('Role', secondary=role_permissions, back_populates='permissions')
    direct_users = relationship('User', secondary=user_permissions, back_populates='direct_permissions')
    
    # Audit relationships
    granted_by_users = relationship('User', secondary=user_permissions,
                                  primaryjoin="Permission.id == user_permissions.c.permission_id",
                                  back_populates='granted_permissions')


class AccessLog(Base):
    __tablename__ = 'access_logs'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    resource = Column(String, nullable=False)
    action = Column(String, nullable=False)
    permission_used = Column(String, nullable=True)
    access_granted = Column(Boolean, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    additional_context = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


# Enums and data classes
class AccessResult(Enum):
    GRANTED = "granted"
    DENIED = "denied"
    CONDITIONAL = "conditional"


class ResourceAction(Enum):
    # Generic actions
    READ = "read"
    WRITE = "write"
    UPDATE = "update"
    DELETE = "delete"
    CREATE = "create"
    
    # Call management actions
    VIEW_CALLS = "view_calls"
    MANAGE_CALLS = "manage_calls"
    ASSIGN_CALLS = "assign_calls"
    
    # Booking actions
    VIEW_BOOKINGS = "view_bookings"
    CREATE_BOOKING = "create_booking"
    MODIFY_BOOKING = "modify_booking"
    CANCEL_BOOKING = "cancel_booking"
    
    # User management actions
    VIEW_USERS = "view_users"
    CREATE_USERS = "create_users"
    MODIFY_USERS = "modify_users"
    DEACTIVATE_USERS = "deactivate_users"
    
    # Administrative actions
    VIEW_ADMIN_PANEL = "view_admin_panel"
    MANAGE_ROLES = "manage_roles"
    MANAGE_PERMISSIONS = "manage_permissions"
    VIEW_AUDIT_LOGS = "view_audit_logs"
    
    # Financial actions
    VIEW_FINANCIALS = "view_financials"
    PROCESS_PAYMENTS = "process_payments"
    GENERATE_REPORTS = "generate_reports"


@dataclass
class AccessRequest:
    """Represents an access request for authorization"""
    user_id: str
    resource: str
    action: str
    context: Dict[str, Any] = field(default_factory=dict)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class AccessResponse:
    """Represents the result of an authorization check"""
    granted: bool
    reason: str
    permissions_used: List[str] = field(default_factory=list)
    conditions: Dict[str, Any] = field(default_factory=dict)
    expires_at: Optional[datetime] = None


@dataclass
class RoleDefinition:
    """Standard role definition"""
    id: str
    name: str
    display_name: str
    description: str
    permissions: List[str]
    parent_role: Optional[str] = None
    is_system_role: bool = False


class RBACManager:
    """
    Comprehensive Role-Based Access Control Manager
    Handles roles, permissions, and authorization decisions
    """
    
    def __init__(self, db_session, redis_client: Optional[redis.Redis] = None):
        self.db_session = db_session
        self.redis_client = redis_client
        self.logger = logging.getLogger(__name__)
        
        # Cache settings
        self.CACHE_TTL = 300  # 5 minutes
        self.PERMISSION_CACHE_PREFIX = "perm:"
        self.ROLE_CACHE_PREFIX = "role:"
        
        # Initialize system roles and permissions if needed
        asyncio.create_task(self._initialize_system_rbac())
    
    async def _initialize_system_rbac(self):
        """Initialize system roles and permissions"""
        try:
            # Define system roles
            system_roles = [
                RoleDefinition(
                    id="super_admin",
                    name="super_admin",
                    display_name="Super Administrator",
                    description="Full system access with all permissions",
                    permissions=["*"],
                    is_system_role=True
                ),
                RoleDefinition(
                    id="admin",
                    name="admin", 
                    display_name="Administrator",
                    description="Administrative access to most system functions",
                    permissions=[
                        "view_admin_panel", "manage_users", "view_audit_logs",
                        "manage_roles", "view_financials", "generate_reports"
                    ],
                    is_system_role=True
                ),
                RoleDefinition(
                    id="manager",
                    name="manager",
                    display_name="Manager",
                    description="Management access to team and operations",
                    permissions=[
                        "view_calls", "manage_calls", "assign_calls",
                        "view_bookings", "modify_booking", "view_users",
                        "generate_reports"
                    ],
                    parent_role="admin",
                    is_system_role=True
                ),
                RoleDefinition(
                    id="sales_agent",
                    name="sales_agent",
                    display_name="Sales Agent",
                    description="Sales agent with call and booking management",
                    permissions=[
                        "view_calls", "manage_calls", "view_bookings",
                        "create_booking", "modify_booking"
                    ],
                    parent_role="manager",
                    is_system_role=True
                ),
                RoleDefinition(
                    id="customer_service",
                    name="customer_service",
                    display_name="Customer Service",
                    description="Customer service representative",
                    permissions=[
                        "view_calls", "view_bookings", "modify_booking"
                    ],
                    is_system_role=True
                ),
                RoleDefinition(
                    id="viewer",
                    name="viewer",
                    display_name="Viewer",
                    description="Read-only access to basic information",
                    permissions=[
                        "view_calls", "view_bookings"
                    ],
                    is_system_role=True
                )
            ]
            
            # Define system permissions
            system_permissions = [
                # Administrative permissions
                ("view_admin_panel", "View Admin Panel", "admin", "read"),
                ("manage_roles", "Manage Roles", "roles", "write"),
                ("manage_permissions", "Manage Permissions", "permissions", "write"), 
                ("view_audit_logs", "View Audit Logs", "audit", "read"),
                
                # User management permissions
                ("view_users", "View Users", "users", "read"),
                ("create_users", "Create Users", "users", "create"),
                ("modify_users", "Modify Users", "users", "update"),
                ("deactivate_users", "Deactivate Users", "users", "delete"),
                
                # Call management permissions
                ("view_calls", "View Calls", "calls", "read"),
                ("manage_calls", "Manage Calls", "calls", "write"),
                ("assign_calls", "Assign Calls", "calls", "assign"),
                
                # Booking management permissions
                ("view_bookings", "View Bookings", "bookings", "read"),
                ("create_booking", "Create Booking", "bookings", "create"),
                ("modify_booking", "Modify Booking", "bookings", "update"),
                ("cancel_booking", "Cancel Booking", "bookings", "delete"),
                
                # Financial permissions
                ("view_financials", "View Financials", "financials", "read"),
                ("process_payments", "Process Payments", "payments", "write"),
                ("generate_reports", "Generate Reports", "reports", "create")
            ]
            
            # Create system permissions
            for perm_id, display_name, resource, action in system_permissions:
                await self._ensure_permission_exists(
                    permission_id=perm_id,
                    name=perm_id,
                    display_name=display_name,
                    description=f"{display_name} permission",
                    resource=resource,
                    action=action,
                    is_system_permission=True
                )
            
            # Create system roles
            for role_def in system_roles:
                await self._ensure_role_exists(role_def)
            
            self.logger.info("System RBAC initialization completed")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize system RBAC: {str(e)}")
    
    async def check_access(self, request: AccessRequest) -> AccessResponse:
        """
        Check if user has access to perform action on resource
        """
        try:
            # Log access attempt
            await self._log_access_attempt(request)
            
            # Get user permissions (with caching)
            user_permissions = await self._get_user_permissions(request.user_id)
            
            # Check for wildcard permission (super admin)
            if "*" in user_permissions:
                response = AccessResponse(
                    granted=True,
                    reason="Super admin access",
                    permissions_used=["*"]
                )
                await self._log_access_result(request, response)
                return response
            
            # Check specific permission
            permission_key = f"{request.resource}:{request.action}"
            if permission_key in user_permissions:
                # Check conditions if any
                permission_data = user_permissions[permission_key]
                if await self._evaluate_conditions(permission_data.get('conditions'), request):
                    response = AccessResponse(
                        granted=True,
                        reason=f"Permission granted: {permission_key}",
                        permissions_used=[permission_key],
                        conditions=permission_data.get('conditions', {}),
                        expires_at=permission_data.get('expires_at')
                    )
                    await self._log_access_result(request, response)
                    return response
            
            # Check resource-level permissions
            resource_permissions = [p for p in user_permissions.keys() if p.startswith(f"{request.resource}:")]
            if resource_permissions:
                # Check if user has general access to resource
                general_permission = f"{request.resource}:read"
                if general_permission in user_permissions or f"{request.resource}:write" in user_permissions:
                    # Apply conditional access based on action sensitivity
                    if request.action in ["read", "view"]:
                        response = AccessResponse(
                            granted=True,
                            reason=f"Resource read access: {request.resource}",
                            permissions_used=resource_permissions
                        )
                        await self._log_access_result(request, response)
                        return response
            
            # Access denied
            response = AccessResponse(
                granted=False,
                reason=f"No permission for {request.action} on {request.resource}",
                permissions_used=[]
            )
            await self._log_access_result(request, response)
            return response
            
        except Exception as e:
            self.logger.error(f"Access check error: {str(e)}")
            response = AccessResponse(
                granted=False,
                reason=f"Authorization system error: {str(e)}",
                permissions_used=[]
            )
            await self._log_access_result(request, response)
            return response
    
    async def assign_role_to_user(self, 
                                 user_id: str, 
                                 role_id: str, 
                                 assigned_by: str,
                                 expires_at: Optional[datetime] = None) -> bool:
        """
        Assign role to user
        """
        try:
            # Check if role exists
            role = self.db_session.query(Role).filter(Role.id == role_id).first()
            if not role:
                self.logger.error(f"Role {role_id} not found")
                return False
            
            # Check if user exists
            user = self.db_session.query(User).filter(User.id == user_id).first()
            if not user:
                self.logger.error(f"User {user_id} not found")
                return False
            
            # Check if assignment already exists
            existing_assignment = self.db_session.execute(
                user_roles.select().where(
                    (user_roles.c.user_id == user_id) & 
                    (user_roles.c.role_id == role_id)
                )
            ).first()
            
            if existing_assignment:
                self.logger.warning(f"Role {role_id} already assigned to user {user_id}")
                return True
            
            # Create assignment
            assignment_data = {
                'user_id': user_id,
                'role_id': role_id,
                'assigned_at': datetime.utcnow(),
                'assigned_by': assigned_by,
                'expires_at': expires_at
            }
            
            self.db_session.execute(user_roles.insert().values(assignment_data))
            self.db_session.commit()
            
            # Clear user permission cache
            await self._clear_user_cache(user_id)
            
            self.logger.info(f"Assigned role {role_id} to user {user_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to assign role {role_id} to user {user_id}: {str(e)}")
            self.db_session.rollback()
            return False
    
    async def revoke_role_from_user(self, user_id: str, role_id: str) -> bool:
        """
        Revoke role from user
        """
        try:
            # Remove assignment
            self.db_session.execute(
                user_roles.delete().where(
                    (user_roles.c.user_id == user_id) & 
                    (user_roles.c.role_id == role_id)
                )
            )
            self.db_session.commit()
            
            # Clear user permission cache
            await self._clear_user_cache(user_id)
            
            self.logger.info(f"Revoked role {role_id} from user {user_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to revoke role {role_id} from user {user_id}: {str(e)}")
            self.db_session.rollback()
            return False
    
    async def grant_permission_to_user(self,
                                     user_id: str,
                                     permission_id: str,
                                     granted_by: str,
                                     expires_at: Optional[datetime] = None) -> bool:
        """
        Grant permission directly to user
        """
        try:
            # Check if permission exists
            permission = self.db_session.query(Permission).filter(Permission.id == permission_id).first()
            if not permission:
                self.logger.error(f"Permission {permission_id} not found")
                return False
            
            # Check if user exists
            user = self.db_session.query(User).filter(User.id == user_id).first()
            if not user:
                self.logger.error(f"User {user_id} not found")
                return False
            
            # Check if permission already granted
            existing_grant = self.db_session.execute(
                user_permissions.select().where(
                    (user_permissions.c.user_id == user_id) & 
                    (user_permissions.c.permission_id == permission_id)
                )
            ).first()
            
            if existing_grant:
                self.logger.warning(f"Permission {permission_id} already granted to user {user_id}")
                return True
            
            # Create grant
            grant_data = {
                'user_id': user_id,
                'permission_id': permission_id,
                'granted_at': datetime.utcnow(),
                'granted_by': granted_by,
                'expires_at': expires_at
            }
            
            self.db_session.execute(user_permissions.insert().values(grant_data))
            self.db_session.commit()
            
            # Clear user permission cache
            await self._clear_user_cache(user_id)
            
            self.logger.info(f"Granted permission {permission_id} to user {user_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to grant permission {permission_id} to user {user_id}: {str(e)}")
            self.db_session.rollback()
            return False
    
    async def revoke_permission_from_user(self, user_id: str, permission_id: str) -> bool:
        """
        Revoke permission from user
        """
        try:
            # Remove grant
            self.db_session.execute(
                user_permissions.delete().where(
                    (user_permissions.c.user_id == user_id) & 
                    (user_permissions.c.permission_id == permission_id)
                )
            )
            self.db_session.commit()
            
            # Clear user permission cache
            await self._clear_user_cache(user_id)
            
            self.logger.info(f"Revoked permission {permission_id} from user {user_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to revoke permission {permission_id} from user {user_id}: {str(e)}")
            self.db_session.rollback()
            return False
    
    async def get_user_roles(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all roles assigned to user
        """
        try:
            # Try cache first
            if self.redis_client:
                cache_key = f"{self.ROLE_CACHE_PREFIX}user:{user_id}"
                cached_roles = await self.redis_client.get(cache_key)
                if cached_roles:
                    return json.loads(cached_roles)
            
            # Query database
            user_role_query = self.db_session.query(Role).join(
                user_roles, Role.id == user_roles.c.role_id
            ).filter(user_roles.c.user_id == user_id)
            
            roles = []
            for role in user_role_query.all():
                roles.append({
                    'id': role.id,
                    'name': role.name,
                    'display_name': role.display_name,
                    'description': role.description,
                    'is_system_role': role.is_system_role,
                    'is_active': role.is_active
                })
            
            # Cache result
            if self.redis_client:
                await self.redis_client.setex(
                    cache_key, 
                    self.CACHE_TTL, 
                    json.dumps(roles)
                )
            
            return roles
            
        except Exception as e:
            self.logger.error(f"Failed to get roles for user {user_id}: {str(e)}")
            return []
    
    async def get_user_permissions(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all permissions for user (from roles and direct grants)
        """
        try:
            user_perms = await self._get_user_permissions(user_id)
            
            permissions = []
            for perm_key, perm_data in user_perms.items():
                if perm_key != "*":  # Skip wildcard
                    resource, action = perm_key.split(":", 1)
                    permissions.append({
                        'permission': perm_key,
                        'resource': resource,
                        'action': action,
                        'source': perm_data.get('source', 'unknown'),
                        'conditions': perm_data.get('conditions', {}),
                        'expires_at': perm_data.get('expires_at')
                    })
                else:
                    permissions.append({
                        'permission': '*',
                        'resource': '*',
                        'action': '*',
                        'source': 'super_admin',
                        'conditions': {},
                        'expires_at': None
                    })
            
            return permissions
            
        except Exception as e:
            self.logger.error(f"Failed to get permissions for user {user_id}: {str(e)}")
            return []
    
    async def create_role(self, role_definition: RoleDefinition, created_by: str) -> bool:
        """
        Create a new role
        """
        try:
            # Check if role already exists
            existing_role = self.db_session.query(Role).filter(Role.id == role_definition.id).first()
            if existing_role:
                self.logger.warning(f"Role {role_definition.id} already exists")
                return False
            
            # Create role
            role = Role(
                id=role_definition.id,
                name=role_definition.name,
                display_name=role_definition.display_name,
                description=role_definition.description,
                is_system_role=role_definition.is_system_role,
                parent_role_id=role_definition.parent_role
            )
            
            self.db_session.add(role)
            self.db_session.commit()
            
            # Assign permissions to role
            for permission_id in role_definition.permissions:
                if permission_id != "*":  # Handle wildcard separately
                    await self._assign_permission_to_role(role_definition.id, permission_id, created_by)
            
            self.logger.info(f"Created role {role_definition.id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to create role {role_definition.id}: {str(e)}")
            self.db_session.rollback()
            return False
    
    async def create_permission(self,
                              permission_id: str,
                              name: str,
                              display_name: str,
                              description: str,
                              resource: str,
                              action: str,
                              conditions: Optional[Dict[str, Any]] = None,
                              created_by: str = "system") -> bool:
        """
        Create a new permission
        """
        return await self._ensure_permission_exists(
            permission_id=permission_id,
            name=name,
            display_name=display_name,
            description=description,
            resource=resource,
            action=action,
            conditions=conditions,
            is_system_permission=False
        )
    
    async def _get_user_permissions(self, user_id: str) -> Dict[str, Dict[str, Any]]:
        """
        Get all effective permissions for user (cached)
        """
        try:
            # Try cache first
            if self.redis_client:
                cache_key = f"{self.PERMISSION_CACHE_PREFIX}user:{user_id}"
                cached_permissions = await self.redis_client.get(cache_key)
                if cached_permissions:
                    return json.loads(cached_permissions)
            
            permissions = {}
            
            # Get permissions from roles
            user_roles_query = self.db_session.query(Role).join(
                user_roles, Role.id == user_roles.c.role_id
            ).filter(user_roles.c.user_id == user_id)
            
            for role in user_roles_query.all():
                role_permissions = self.db_session.query(Permission).join(
                    role_permissions, Permission.id == role_permissions.c.permission_id
                ).filter(role_permissions.c.role_id == role.id)
                
                for perm in role_permissions.all():
                    perm_key = f"{perm.resource}:{perm.action}"
                    permissions[perm_key] = {
                        'source': f'role:{role.name}',
                        'conditions': perm.conditions or {},
                        'expires_at': None  # Role permissions don't expire
                    }
            
            # Get direct permissions
            user_perms_query = self.db_session.query(Permission).join(
                user_permissions, Permission.id == user_permissions.c.permission_id
            ).filter(user_permissions.c.user_id == user_id)
            
            for perm in user_perms_query.all():
                perm_key = f"{perm.resource}:{perm.action}"
                permissions[perm_key] = {
                    'source': 'direct',
                    'conditions': perm.conditions or {},
                    'expires_at': None  # Get from junction table if needed
                }
            
            # Check for super admin (wildcard permission)
            super_admin_role = self.db_session.query(Role).filter(Role.name == "super_admin").first()
            if super_admin_role:
                user_has_super_admin = self.db_session.execute(
                    user_roles.select().where(
                        (user_roles.c.user_id == user_id) & 
                        (user_roles.c.role_id == super_admin_role.id)
                    )
                ).first()
                
                if user_has_super_admin:
                    permissions["*"] = {
                        'source': 'role:super_admin',
                        'conditions': {},
                        'expires_at': None
                    }
            
            # Cache result
            if self.redis_client:
                await self.redis_client.setex(
                    cache_key,
                    self.CACHE_TTL,
                    json.dumps(permissions, default=str)
                )
            
            return permissions
            
        except Exception as e:
            self.logger.error(f"Failed to get user permissions for {user_id}: {str(e)}")
            return {}
    
    async def _evaluate_conditions(self, conditions: Optional[Dict[str, Any]], request: AccessRequest) -> bool:
        """
        Evaluate conditional permissions
        """
        if not conditions:
            return True
        
        try:
            # Time-based conditions
            if 'time_range' in conditions:
                current_time = datetime.now(timezone.utc).time()
                start_time = datetime.strptime(conditions['time_range']['start'], '%H:%M').time()
                end_time = datetime.strptime(conditions['time_range']['end'], '%H:%M').time()
                
                if not (start_time <= current_time <= end_time):
                    return False
            
            # IP-based conditions
            if 'allowed_ips' in conditions and request.ip_address:
                if request.ip_address not in conditions['allowed_ips']:
                    return False
            
            # Context-based conditions
            if 'required_context' in conditions:
                for key, value in conditions['required_context'].items():
                    if request.context.get(key) != value:
                        return False
            
            # Resource ownership conditions
            if 'owner_only' in conditions and conditions['owner_only']:
                resource_owner = request.context.get('resource_owner')
                if resource_owner != request.user_id:
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to evaluate conditions: {str(e)}")
            return False
    
    async def _ensure_permission_exists(self,
                                      permission_id: str,
                                      name: str,
                                      display_name: str,
                                      description: str,
                                      resource: str,
                                      action: str,
                                      conditions: Optional[Dict[str, Any]] = None,
                                      is_system_permission: bool = False) -> bool:
        """
        Ensure permission exists in database
        """
        try:
            existing_permission = self.db_session.query(Permission).filter(Permission.id == permission_id).first()
            if existing_permission:
                return True
            
            permission = Permission(
                id=permission_id,
                name=name,
                display_name=display_name,
                description=description,
                resource=resource,
                action=action,
                conditions=conditions,
                is_system_permission=is_system_permission
            )
            
            self.db_session.add(permission)
            self.db_session.commit()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to create permission {permission_id}: {str(e)}")
            self.db_session.rollback()
            return False
    
    async def _ensure_role_exists(self, role_definition: RoleDefinition) -> bool:
        """
        Ensure role exists in database
        """
        try:
            existing_role = self.db_session.query(Role).filter(Role.id == role_definition.id).first()
            if existing_role:
                return True
            
            role = Role(
                id=role_definition.id,
                name=role_definition.name,
                display_name=role_definition.display_name,
                description=role_definition.description,
                is_system_role=role_definition.is_system_role,
                parent_role_id=role_definition.parent_role
            )
            
            self.db_session.add(role)
            self.db_session.commit()
            
            # Assign permissions to role
            for permission_id in role_definition.permissions:
                if permission_id != "*":
                    await self._assign_permission_to_role(role_definition.id, permission_id, "system")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to create role {role_definition.id}: {str(e)}")
            self.db_session.rollback()
            return False
    
    async def _assign_permission_to_role(self, role_id: str, permission_id: str, granted_by: str) -> bool:
        """
        Assign permission to role
        """
        try:
            # Check if assignment already exists
            existing_assignment = self.db_session.execute(
                role_permissions.select().where(
                    (role_permissions.c.role_id == role_id) & 
                    (role_permissions.c.permission_id == permission_id)
                )
            ).first()
            
            if existing_assignment:
                return True
            
            # Create assignment
            assignment_data = {
                'role_id': role_id,
                'permission_id': permission_id,
                'granted_at': datetime.utcnow(),
                'granted_by': granted_by
            }
            
            self.db_session.execute(role_permissions.insert().values(assignment_data))
            self.db_session.commit()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to assign permission {permission_id} to role {role_id}: {str(e)}")
            self.db_session.rollback()
            return False
    
    async def _clear_user_cache(self, user_id: str):
        """
        Clear user permission cache
        """
        if self.redis_client:
            await self.redis_client.delete(f"{self.PERMISSION_CACHE_PREFIX}user:{user_id}")
            await self.redis_client.delete(f"{self.ROLE_CACHE_PREFIX}user:{user_id}")
    
    async def _log_access_attempt(self, request: AccessRequest):
        """
        Log access attempt for audit
        """
        try:
            access_log = AccessLog(
                user_id=request.user_id,
                resource=request.resource,
                action=request.action,
                access_granted=False,  # Will be updated later
                ip_address=request.ip_address,
                user_agent=request.user_agent,
                additional_context=request.context,
                timestamp=request.timestamp
            )
            
            self.db_session.add(access_log)
            self.db_session.commit()
            
        except Exception as e:
            self.logger.error(f"Failed to log access attempt: {str(e)}")
    
    async def _log_access_result(self, request: AccessRequest, response: AccessResponse):
        """
        Log access result for audit
        """
        try:
            # Update the most recent access log entry
            access_log = self.db_session.query(AccessLog).filter(
                AccessLog.user_id == request.user_id,
                AccessLog.resource == request.resource,
                AccessLog.action == request.action,
                AccessLog.timestamp == request.timestamp
            ).first()
            
            if access_log:
                access_log.access_granted = response.granted
                access_log.permission_used = ",".join(response.permissions_used) if response.permissions_used else None
                self.db_session.commit()
            
        except Exception as e:
            self.logger.error(f"Failed to log access result: {str(e)}")


# Utility decorators for FastAPI integration
def require_permission(resource: str, action: str, context_extractor=None):
    """
    Decorator to require specific permission for endpoint access
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # This would be integrated with FastAPI dependency injection
            # For now, it's a placeholder for the integration pattern
            pass
        return wrapper
    return decorator


def require_role(required_roles: Union[str, List[str]]):
    """
    Decorator to require specific role(s) for endpoint access
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # This would be integrated with FastAPI dependency injection
            pass
        return wrapper
    return decorator


# Example usage
async def main():
    """
    Example usage of the RBAC system
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    import redis.asyncio as redis
    
    # Database setup
    engine = create_engine('sqlite:///rbac_test.db')
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db_session = Session()
    
    # Redis setup
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    
    # Initialize RBAC manager
    rbac = RBACManager(db_session, redis_client)
    
    try:
        # Wait for system initialization
        await asyncio.sleep(1)
        
        # Create a test user (this would normally be done during user registration)
        test_user = User(
            id="user123",
            email="test@spirittours.com",
            first_name="Test",
            last_name="User"
        )
        db_session.add(test_user)
        db_session.commit()
        
        # Assign sales_agent role to user
        await rbac.assign_role_to_user("user123", "sales_agent", "system")
        
        # Test access check - should be granted
        access_request = AccessRequest(
            user_id="user123",
            resource="calls",
            action="view",
            context={"department": "sales"},
            ip_address="192.168.1.100"
        )
        
        response = await rbac.check_access(access_request)
        print(f"Access check result: {response.granted}")
        print(f"Reason: {response.reason}")
        print(f"Permissions used: {response.permissions_used}")
        
        # Test access check - should be denied
        admin_request = AccessRequest(
            user_id="user123",
            resource="admin",
            action="manage_users",
            ip_address="192.168.1.100"
        )
        
        admin_response = await rbac.check_access(admin_request)
        print(f"\nAdmin access check result: {admin_response.granted}")
        print(f"Reason: {admin_response.reason}")
        
        # Get user roles and permissions
        user_roles = await rbac.get_user_roles("user123")
        print(f"\nUser roles: {[role['name'] for role in user_roles]}")
        
        user_permissions = await rbac.get_user_permissions("user123")
        print(f"User permissions: {[perm['permission'] for perm in user_permissions]}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
    
    finally:
        await redis_client.close()
        db_session.close()


if __name__ == "__main__":
    asyncio.run(main())