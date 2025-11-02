"""
RBAC Database Initialization
Set up default roles, permissions, and super administrator
"""

from typing import List, Dict, Any
from sqlalchemy.orm import Session
import hashlib
import uuid
from datetime import datetime

from models.rbac_models import (
    User, Role, Permission, Branch,
    PermissionScope, UserLevel
)

class RBACInitializer:
    """Initialize RBAC system with default data"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def initialize_all(self):
        """Initialize complete RBAC system"""
        print("Initializing RBAC system...")
        
        # Create permissions first
        self.create_permissions()
        
        # Create default branches
        self.create_default_branches()
        
        # Create roles with permissions
        self.create_roles()
        
        # Create super administrator
        self.create_super_admin()
        
        print("RBAC system initialization completed!")
    
    def create_permissions(self):
        """Create all system permissions"""
        print("Creating permissions...")
        
        permissions_data = [
            # AI Agents Permissions
            {"name": "View Ethical Tourism", "scope": PermissionScope.ETHICAL_TOURISM, "action": "read", "resource": "agent"},
            {"name": "Execute Ethical Tourism", "scope": PermissionScope.ETHICAL_TOURISM, "action": "execute", "resource": "agent"},
            {"name": "View Sustainable Travel", "scope": PermissionScope.SUSTAINABLE_TRAVEL, "action": "read", "resource": "agent"},
            {"name": "Execute Sustainable Travel", "scope": PermissionScope.SUSTAINABLE_TRAVEL, "action": "execute", "resource": "agent"},
            {"name": "View Cultural Immersion", "scope": PermissionScope.CULTURAL_IMMERSION, "action": "read", "resource": "agent"},
            {"name": "Execute Cultural Immersion", "scope": PermissionScope.CULTURAL_IMMERSION, "action": "execute", "resource": "agent"},
            {"name": "View Adventure Planner", "scope": PermissionScope.ADVENTURE_PLANNER, "action": "read", "resource": "agent"},
            {"name": "Execute Adventure Planner", "scope": PermissionScope.ADVENTURE_PLANNER, "action": "execute", "resource": "agent"},
            {"name": "View Luxury Concierge", "scope": PermissionScope.LUXURY_CONCIERGE, "action": "read", "resource": "agent"},
            {"name": "Execute Luxury Concierge", "scope": PermissionScope.LUXURY_CONCIERGE, "action": "execute", "resource": "agent"},
            {"name": "View Budget Optimizer", "scope": PermissionScope.BUDGET_OPTIMIZER, "action": "read", "resource": "agent"},
            {"name": "Execute Budget Optimizer", "scope": PermissionScope.BUDGET_OPTIMIZER, "action": "execute", "resource": "agent"},
            {"name": "View Accessibility Coordinator", "scope": PermissionScope.ACCESSIBILITY_COORDINATOR, "action": "read", "resource": "agent"},
            {"name": "Execute Accessibility Coordinator", "scope": PermissionScope.ACCESSIBILITY_COORDINATOR, "action": "execute", "resource": "agent"},
            {"name": "View Group Coordinator", "scope": PermissionScope.GROUP_COORDINATOR, "action": "read", "resource": "agent"},
            {"name": "Execute Group Coordinator", "scope": PermissionScope.GROUP_COORDINATOR, "action": "execute", "resource": "agent"},
            {"name": "View Crisis Manager", "scope": PermissionScope.CRISIS_MANAGER, "action": "read", "resource": "agent"},
            {"name": "Execute Crisis Manager", "scope": PermissionScope.CRISIS_MANAGER, "action": "execute", "resource": "agent"},
            {"name": "View Carbon Footprint", "scope": PermissionScope.CARBON_FOOTPRINT, "action": "read", "resource": "agent"},
            {"name": "Execute Carbon Footprint", "scope": PermissionScope.CARBON_FOOTPRINT, "action": "execute", "resource": "agent"},
            {"name": "View Destination Expert", "scope": PermissionScope.DESTINATION_EXPERT, "action": "read", "resource": "agent"},
            {"name": "Execute Destination Expert", "scope": PermissionScope.DESTINATION_EXPERT, "action": "execute", "resource": "agent"},
            {"name": "View Booking Assistant", "scope": PermissionScope.BOOKING_ASSISTANT, "action": "read", "resource": "agent"},
            {"name": "Execute Booking Assistant", "scope": PermissionScope.BOOKING_ASSISTANT, "action": "execute", "resource": "agent"},
            {"name": "View Customer Experience", "scope": PermissionScope.CUSTOMER_EXPERIENCE, "action": "read", "resource": "agent"},
            {"name": "Execute Customer Experience", "scope": PermissionScope.CUSTOMER_EXPERIENCE, "action": "execute", "resource": "agent"},
            {"name": "View Travel Insurance", "scope": PermissionScope.TRAVEL_INSURANCE, "action": "read", "resource": "agent"},
            {"name": "Execute Travel Insurance", "scope": PermissionScope.TRAVEL_INSURANCE, "action": "execute", "resource": "agent"},
            {"name": "View Visa Consultant", "scope": PermissionScope.VISA_CONSULTANT, "action": "read", "resource": "agent"},
            {"name": "Execute Visa Consultant", "scope": PermissionScope.VISA_CONSULTANT, "action": "execute", "resource": "agent"},
            {"name": "View Weather Advisor", "scope": PermissionScope.WEATHER_ADVISOR, "action": "read", "resource": "agent"},
            {"name": "Execute Weather Advisor", "scope": PermissionScope.WEATHER_ADVISOR, "action": "execute", "resource": "agent"},
            {"name": "View Health Safety", "scope": PermissionScope.HEALTH_SAFETY, "action": "read", "resource": "agent"},
            {"name": "Execute Health Safety", "scope": PermissionScope.HEALTH_SAFETY, "action": "execute", "resource": "agent"},
            {"name": "View Local Cuisine", "scope": PermissionScope.LOCAL_CUISINE, "action": "read", "resource": "agent"},
            {"name": "Execute Local Cuisine", "scope": PermissionScope.LOCAL_CUISINE, "action": "execute", "resource": "agent"},
            {"name": "View Transportation Optimizer", "scope": PermissionScope.TRANSPORTATION_OPTIMIZER, "action": "read", "resource": "agent"},
            {"name": "Execute Transportation Optimizer", "scope": PermissionScope.TRANSPORTATION_OPTIMIZER, "action": "execute", "resource": "agent"},
            {"name": "View Accommodation Specialist", "scope": PermissionScope.ACCOMMODATION_SPECIALIST, "action": "read", "resource": "agent"},
            {"name": "Execute Accommodation Specialist", "scope": PermissionScope.ACCOMMODATION_SPECIALIST, "action": "execute", "resource": "agent"},
            {"name": "View Itinerary Planner", "scope": PermissionScope.ITINERARY_PLANNER, "action": "read", "resource": "agent"},
            {"name": "Execute Itinerary Planner", "scope": PermissionScope.ITINERARY_PLANNER, "action": "execute", "resource": "agent"},
            {"name": "View Review Analyzer", "scope": PermissionScope.REVIEW_ANALYZER, "action": "read", "resource": "agent"},
            {"name": "Execute Review Analyzer", "scope": PermissionScope.REVIEW_ANALYZER, "action": "execute", "resource": "agent"},
            {"name": "View Social Impact", "scope": PermissionScope.SOCIAL_IMPACT, "action": "read", "resource": "agent"},
            {"name": "Execute Social Impact", "scope": PermissionScope.SOCIAL_IMPACT, "action": "execute", "resource": "agent"},
            {"name": "View Multilingual Assistant", "scope": PermissionScope.MULTILINGUAL_ASSISTANT, "action": "read", "resource": "agent"},
            {"name": "Execute Multilingual Assistant", "scope": PermissionScope.MULTILINGUAL_ASSISTANT, "action": "execute", "resource": "agent"},
            {"name": "View Virtual Tour Creator", "scope": PermissionScope.VIRTUAL_TOUR_CREATOR, "action": "read", "resource": "agent"},
            {"name": "Execute Virtual Tour Creator", "scope": PermissionScope.VIRTUAL_TOUR_CREATOR, "action": "execute", "resource": "agent"},
            
            # Business Function Permissions
            {"name": "View Users", "scope": PermissionScope.USER_MANAGEMENT, "action": "read", "resource": "user"},
            {"name": "Create Users", "scope": PermissionScope.USER_MANAGEMENT, "action": "create", "resource": "user"},
            {"name": "Update Users", "scope": PermissionScope.USER_MANAGEMENT, "action": "update", "resource": "user"},
            {"name": "Delete Users", "scope": PermissionScope.USER_MANAGEMENT, "action": "delete", "resource": "user"},
            
            {"name": "View Analytics Dashboard", "scope": PermissionScope.ANALYTICS_DASHBOARD, "action": "read", "resource": "dashboard"},
            {"name": "Export Analytics", "scope": PermissionScope.ANALYTICS_DASHBOARD, "action": "export", "resource": "dashboard"},
            
            {"name": "View Financial Reports", "scope": PermissionScope.FINANCIAL_REPORTS, "action": "read", "resource": "report"},
            {"name": "Create Financial Reports", "scope": PermissionScope.FINANCIAL_REPORTS, "action": "create", "resource": "report"},
            {"name": "Export Financial Reports", "scope": PermissionScope.FINANCIAL_REPORTS, "action": "export", "resource": "report"},
            
            {"name": "View Bookings", "scope": PermissionScope.BOOKING_MANAGEMENT, "action": "read", "resource": "booking"},
            {"name": "Create Bookings", "scope": PermissionScope.BOOKING_MANAGEMENT, "action": "create", "resource": "booking"},
            {"name": "Update Bookings", "scope": PermissionScope.BOOKING_MANAGEMENT, "action": "update", "resource": "booking"},
            {"name": "Cancel Bookings", "scope": PermissionScope.BOOKING_MANAGEMENT, "action": "delete", "resource": "booking"},
            
            {"name": "View Customers", "scope": PermissionScope.CUSTOMER_DATABASE, "action": "read", "resource": "customer"},
            {"name": "Create Customers", "scope": PermissionScope.CUSTOMER_DATABASE, "action": "create", "resource": "customer"},
            {"name": "Update Customers", "scope": PermissionScope.CUSTOMER_DATABASE, "action": "update", "resource": "customer"},
            {"name": "Export Customer Data", "scope": PermissionScope.CUSTOMER_DATABASE, "action": "export", "resource": "customer"},
            
            {"name": "View Marketing Campaigns", "scope": PermissionScope.MARKETING_CAMPAIGNS, "action": "read", "resource": "campaign"},
            {"name": "Create Marketing Campaigns", "scope": PermissionScope.MARKETING_CAMPAIGNS, "action": "create", "resource": "campaign"},
            {"name": "Update Marketing Campaigns", "scope": PermissionScope.MARKETING_CAMPAIGNS, "action": "update", "resource": "campaign"},
            {"name": "Delete Marketing Campaigns", "scope": PermissionScope.MARKETING_CAMPAIGNS, "action": "delete", "resource": "campaign"},
            
            {"name": "View Content", "scope": PermissionScope.CONTENT_MANAGEMENT, "action": "read", "resource": "content"},
            {"name": "Create Content", "scope": PermissionScope.CONTENT_MANAGEMENT, "action": "create", "resource": "content"},
            {"name": "Update Content", "scope": PermissionScope.CONTENT_MANAGEMENT, "action": "update", "resource": "content"},
            {"name": "Delete Content", "scope": PermissionScope.CONTENT_MANAGEMENT, "action": "delete", "resource": "content"},
            
            {"name": "View System Config", "scope": PermissionScope.SYSTEM_CONFIGURATION, "action": "read", "resource": "config"},
            {"name": "Update System Config", "scope": PermissionScope.SYSTEM_CONFIGURATION, "action": "update", "resource": "config"},
            
            {"name": "View Audit Logs", "scope": PermissionScope.AUDIT_LOGS, "action": "read", "resource": "log"},
            {"name": "Export Audit Logs", "scope": PermissionScope.AUDIT_LOGS, "action": "export", "resource": "log"},
            
            {"name": "Export Data", "scope": PermissionScope.DATA_EXPORT, "action": "execute", "resource": "export"},
            
            {"name": "View Branch Info", "scope": PermissionScope.BRANCH_MANAGEMENT, "action": "read", "resource": "branch"},
            {"name": "Create Branch", "scope": PermissionScope.BRANCH_MANAGEMENT, "action": "create", "resource": "branch"},
            {"name": "Update Branch", "scope": PermissionScope.BRANCH_MANAGEMENT, "action": "update", "resource": "branch"},
            
            # System Administration Permissions
            {"name": "Database Access", "scope": PermissionScope.DATABASE_ACCESS, "action": "execute", "resource": "database"},
            {"name": "API Management", "scope": PermissionScope.API_MANAGEMENT, "action": "update", "resource": "api"},
            {"name": "Security Settings", "scope": PermissionScope.SECURITY_SETTINGS, "action": "update", "resource": "security"},
            {"name": "Backup System", "scope": PermissionScope.BACKUP_RESTORE, "action": "execute", "resource": "backup"},
            {"name": "Restore System", "scope": PermissionScope.BACKUP_RESTORE, "action": "execute", "resource": "restore"},
            {"name": "System Monitoring", "scope": PermissionScope.SYSTEM_MONITORING, "action": "read", "resource": "monitoring"}
        ]
        
        created_permissions = {}
        for perm_data in permissions_data:
            # Check if permission already exists
            existing = self.db.query(Permission).filter_by(name=perm_data["name"]).first()
            if not existing:
                permission = Permission(
                    name=perm_data["name"],
                    description=f"{perm_data['action'].title()} access to {perm_data['resource']} in {perm_data['scope'].value}",
                    scope=perm_data["scope"],
                    action=perm_data["action"],
                    resource=perm_data["resource"]
                )
                self.db.add(permission)
                self.db.flush()
                created_permissions[perm_data["name"]] = permission
                print(f"  Created permission: {perm_data['name']}")
            else:
                created_permissions[perm_data["name"]] = existing
        
        self.db.commit()
        return created_permissions
    
    def create_default_branches(self):
        """Create default branches"""
        print("Creating default branches...")
        
        branches_data = [
            {"name": "Headquarters", "code": "HQ", "country": "USA", "city": "New York", "region": "North America", "is_headquarters": True},
            {"name": "Europe Branch", "code": "EU", "country": "UK", "city": "London", "region": "Europe"},
            {"name": "Asia Pacific Branch", "code": "AP", "country": "Singapore", "city": "Singapore", "region": "Asia Pacific"},
            {"name": "Latin America Branch", "code": "LA", "country": "Brazil", "city": "São Paulo", "region": "Latin America"}
        ]
        
        created_branches = {}
        for branch_data in branches_data:
            existing = self.db.query(Branch).filter_by(code=branch_data["code"]).first()
            if not existing:
                branch = Branch(**branch_data)
                self.db.add(branch)
                self.db.flush()
                created_branches[branch_data["code"]] = branch
                print(f"  Created branch: {branch_data['name']}")
            else:
                created_branches[branch_data["code"]] = existing
        
        self.db.commit()
        return created_branches
    
    def create_roles(self):
        """Create all system roles with appropriate permissions"""
        print("Creating roles...")
        
        # Get all permissions
        all_permissions = self.db.query(Permission).all()
        perm_dict = {p.name: p for p in all_permissions}
        
        # Define role configurations
        roles_config = {
            # Support Levels
            "Viewer": {
                "level": UserLevel.VIEWER,
                "description": "Read-only access to basic information",
                "permissions": [
                    "View Analytics Dashboard",
                    "View Bookings",
                    "View Customers"
                ]
            },
            "Coordinator": {
                "level": UserLevel.COORDINATOR,
                "description": "Basic operational coordination",
                "permissions": [
                    "View Analytics Dashboard",
                    "View Bookings",
                    "View Customers",
                    "Update Bookings"
                ]
            },
            "Analyst": {
                "level": UserLevel.ANALYST,
                "description": "Data analysis and reporting",
                "permissions": [
                    "View Analytics Dashboard",
                    "Export Analytics",
                    "View Financial Reports",
                    "View Bookings",
                    "View Customers",
                    "Export Customer Data"
                ]
            },
            
            # Operational Levels
            "Customer Service": {
                "level": UserLevel.CUSTOMER_SERVICE,
                "description": "Customer support and basic booking assistance",
                "permissions": [
                    "View Booking Assistant",
                    "Execute Booking Assistant",
                    "View Customer Experience",
                    "Execute Customer Experience",
                    "View Travel Insurance",
                    "Execute Travel Insurance",
                    "View Visa Consultant",
                    "Execute Visa Consultant",
                    "View Bookings",
                    "Create Bookings",
                    "Update Bookings",
                    "View Customers",
                    "Create Customers",
                    "Update Customers"
                ]
            },
            "Marketing Specialist": {
                "level": UserLevel.MARKETING_SPECIALIST,
                "description": "Marketing campaign and content management",
                "permissions": [
                    "View Marketing Campaigns",
                    "Create Marketing Campaigns",
                    "Update Marketing Campaigns",
                    "View Content",
                    "Create Content",
                    "Update Content",
                    "View Virtual Tour Creator",
                    "Execute Virtual Tour Creator",
                    "View Review Analyzer",
                    "Execute Review Analyzer",
                    "View Analytics Dashboard",
                    "View Customers"
                ]
            },
            "Travel Agent": {
                "level": UserLevel.TRAVEL_AGENT,
                "description": "Full booking and customer service capabilities",
                "permissions": [
                    # Basic AI Agents
                    "View Destination Expert",
                    "Execute Destination Expert",
                    "View Booking Assistant",
                    "Execute Booking Assistant",
                    "View Itinerary Planner",
                    "Execute Itinerary Planner",
                    "View Weather Advisor",
                    "Execute Weather Advisor",
                    "View Transportation Optimizer",
                    "Execute Transportation Optimizer",
                    "View Accommodation Specialist",
                    "Execute Accommodation Specialist",
                    "View Travel Insurance",
                    "Execute Travel Insurance",
                    "View Visa Consultant",
                    "Execute Visa Consultant",
                    
                    # Business functions
                    "View Bookings",
                    "Create Bookings",
                    "Update Bookings",
                    "View Customers",
                    "Create Customers",
                    "Update Customers",
                    "View Analytics Dashboard"
                ]
            },
            "Senior Agent": {
                "level": UserLevel.SENIOR_AGENT,
                "description": "Advanced agent with specialized capabilities",
                "permissions": [
                    # All basic agent permissions plus specialized ones
                    "View Ethical Tourism",
                    "Execute Ethical Tourism",
                    "View Sustainable Travel",
                    "Execute Sustainable Travel",
                    "View Cultural Immersion",
                    "Execute Cultural Immersion",
                    "View Adventure Planner",
                    "Execute Adventure Planner",
                    "View Luxury Concierge",
                    "Execute Luxury Concierge",
                    "View Budget Optimizer",
                    "Execute Budget Optimizer",
                    "View Accessibility Coordinator",
                    "Execute Accessibility Coordinator",
                    "View Group Coordinator",
                    "Execute Group Coordinator",
                    "View Carbon Footprint",
                    "Execute Carbon Footprint",
                    "View Social Impact",
                    "Execute Social Impact",
                    
                    # Enhanced business functions
                    "View Bookings",
                    "Create Bookings",
                    "Update Bookings",
                    "Cancel Bookings",
                    "View Customers",
                    "Create Customers",
                    "Update Customers",
                    "Export Customer Data",
                    "View Analytics Dashboard",
                    "Export Analytics"
                ]
            },
            
            # Management Levels
            "Department Head": {
                "level": UserLevel.DEPARTMENT_HEAD,
                "description": "Department management with team oversight",
                "permissions": [
                    # All agent access
                ] + [perm.name for perm in all_permissions if "agent" in perm.resource] + [
                    "View Users",
                    "Create Users",
                    "Update Users",
                    "View Analytics Dashboard",
                    "Export Analytics",
                    "View Financial Reports",
                    "View Bookings",
                    "Create Bookings",
                    "Update Bookings",
                    "Cancel Bookings",
                    "View Customers",
                    "Create Customers",
                    "Update Customers",
                    "Export Customer Data",
                    "View Marketing Campaigns",
                    "Create Marketing Campaigns",
                    "Update Marketing Campaigns"
                ]
            },
            "Branch Manager": {
                "level": UserLevel.BRANCH_MANAGER,
                "description": "Complete branch management authority",
                "permissions": [
                    # Almost all permissions except system administration
                ] + [perm.name for perm in all_permissions if perm.scope not in [
                    PermissionScope.DATABASE_ACCESS,
                    PermissionScope.SECURITY_SETTINGS,
                    PermissionScope.BACKUP_RESTORE,
                    PermissionScope.SYSTEM_MONITORING
                ]]
            },
            "Regional Director": {
                "level": UserLevel.REGIONAL_DIRECTOR,
                "description": "Multi-branch regional oversight",
                "permissions": [
                    # All permissions except system administration
                ] + [perm.name for perm in all_permissions if perm.scope not in [
                    PermissionScope.DATABASE_ACCESS,
                    PermissionScope.SECURITY_SETTINGS,
                    PermissionScope.BACKUP_RESTORE
                ]]
            },
            
            # Administrative Levels
            "General Manager": {
                "level": UserLevel.GENERAL_MANAGER,
                "description": "Senior business management authority",
                "permissions": [perm.name for perm in all_permissions if perm.scope != PermissionScope.DATABASE_ACCESS]
            },
            "System Administrator": {
                "level": UserLevel.SYSTEM_ADMINISTRATOR,
                "description": "Technical system administration",
                "permissions": [perm.name for perm in all_permissions]
            },
            "Super Administrator": {
                "level": UserLevel.SUPER_ADMINISTRATOR,
                "description": "Complete system authority",
                "permissions": [perm.name for perm in all_permissions]
            }
        }
        
        created_roles = {}
        for role_name, config in roles_config.items():
            existing = self.db.query(Role).filter_by(name=role_name).first()
            if not existing:
                role = Role(
                    name=role_name,
                    description=config["description"],
                    level=config["level"],
                    hierarchy_level=self._get_hierarchy_level(config["level"]),
                    is_system_role=True
                )
                
                # Assign permissions
                role_permissions = []
                for perm_name in config["permissions"]:
                    if perm_name in perm_dict:
                        role_permissions.append(perm_dict[perm_name])
                
                role.permissions = role_permissions
                
                self.db.add(role)
                self.db.flush()
                created_roles[role_name] = role
                print(f"  Created role: {role_name} ({len(role_permissions)} permissions)")
            else:
                created_roles[role_name] = existing
        
        self.db.commit()
        return created_roles
    
    def create_super_admin(self):
        """Create the initial super administrator"""
        print("Creating super administrator...")
        
        # Check if super admin already exists
        existing_admin = self.db.query(User).join(User.roles).filter(
            Role.level == UserLevel.SUPER_ADMINISTRATOR
        ).first()
        
        if existing_admin:
            print(f"  Super administrator already exists: {existing_admin.username}")
            return existing_admin
        
        # Get headquarters branch
        hq_branch = self.db.query(Branch).filter_by(is_headquarters=True).first()
        
        # Get super admin role
        super_admin_role = self.db.query(Role).filter_by(
            level=UserLevel.SUPER_ADMINISTRATOR
        ).first()
        
        if not super_admin_role:
            raise Exception("Super Administrator role not found. Run create_roles first.")
        
        # Create super admin user
        password_hash = hashlib.sha256("Admin123!".encode()).hexdigest()
        
        super_admin = User(
            username="admin",
            email="admin@spirittours.com",
            password_hash=password_hash,
            first_name="System",
            last_name="Administrator",
            is_active=True,
            is_verified=True,
            branch_id=hq_branch.id if hq_branch else None
        )
        
        super_admin.roles = [super_admin_role]
        
        self.db.add(super_admin)
        self.db.commit()
        
        print(f"  Created super administrator: admin / Admin123!")
        print(f"  ⚠️  IMPORTANT: Change default password after first login!")
        
        return super_admin
    
    def _get_hierarchy_level(self, user_level: UserLevel) -> int:
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

def initialize_rbac_system(db: Session):
    """Main function to initialize RBAC system"""
    initializer = RBACInitializer(db)
    initializer.initialize_all()
    
    print("\n" + "="*50)
    print("RBAC SYSTEM INITIALIZATION COMPLETE")
    print("="*50)
    print("Default Login Credentials:")
    print("Username: admin")
    print("Password: Admin123!")
    print("⚠️  CHANGE DEFAULT PASSWORD AFTER FIRST LOGIN!")
    print("="*50)