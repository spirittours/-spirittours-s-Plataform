"""
Expanded RBAC Database Initialization
Complete enterprise-level roles, departments, and users
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

class ExpandedRBACInitializer:
    """Initialize complete enterprise RBAC system with all departments"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def initialize_enterprise_system(self):
        """Initialize complete enterprise RBAC system"""
        print("🏢 Initializing Enterprise RBAC System...")
        
        # Create expanded permissions
        self.create_expanded_permissions()
        
        # Create enterprise branches
        self.create_enterprise_branches()
        
        # Create all departmental roles
        self.create_enterprise_roles()
        
        # Create demo users for each department
        self.create_enterprise_users()
        
        print("✅ Enterprise RBAC System initialized successfully!")
    
    def create_expanded_permissions(self):
        """Create comprehensive enterprise permissions"""
        print("📝 Creating comprehensive enterprise permissions...")
        
        expanded_permissions = [
            # SALES DEPARTMENT PERMISSIONS
            {"name": "Acceso Dashboard Ventas", "scope": PermissionScope.ANALYTICS_DASHBOARD, "action": "read", "resource": "sales_dashboard"},
            {"name": "Gestión Leads", "scope": PermissionScope.CUSTOMER_DATABASE, "action": "create", "resource": "lead"},
            {"name": "Conversión Leads", "scope": PermissionScope.CUSTOMER_DATABASE, "action": "update", "resource": "lead"},
            {"name": "Acceso CRM Ventas", "scope": PermissionScope.CUSTOMER_DATABASE, "action": "read", "resource": "sales_crm"},
            {"name": "Crear Cotizaciones", "scope": PermissionScope.BOOKING_MANAGEMENT, "action": "create", "resource": "quote"},
            {"name": "Gestión Pipeline", "scope": PermissionScope.ANALYTICS_DASHBOARD, "action": "read", "resource": "sales_pipeline"},
            {"name": "Reportes Ventas", "scope": PermissionScope.FINANCIAL_REPORTS, "action": "read", "resource": "sales_report"},
            {"name": "Comisiones Ventas", "scope": PermissionScope.FINANCIAL_REPORTS, "action": "read", "resource": "commission"},
            {"name": "Territorio Ventas", "scope": PermissionScope.BRANCH_MANAGEMENT, "action": "read", "resource": "territory"},
            
            # CALL CENTER PERMISSIONS
            {"name": "Sistema Telefónico", "scope": PermissionScope.SYSTEM_CONFIGURATION, "action": "read", "resource": "phone_system"},
            {"name": "Cola Llamadas", "scope": PermissionScope.CUSTOMER_EXPERIENCE, "action": "read", "resource": "call_queue"},
            {"name": "Script Llamadas", "scope": PermissionScope.CONTENT_MANAGEMENT, "action": "read", "resource": "call_script"},
            {"name": "Grabaciones Llamadas", "scope": PermissionScope.AUDIT_LOGS, "action": "read", "resource": "call_recording"},
            {"name": "Métricas Call Center", "scope": PermissionScope.ANALYTICS_DASHBOARD, "action": "read", "resource": "call_metrics"},
            {"name": "Gestión Tickets", "scope": PermissionScope.CUSTOMER_EXPERIENCE, "action": "create", "resource": "support_ticket"},
            {"name": "Base Conocimiento", "scope": PermissionScope.CONTENT_MANAGEMENT, "action": "read", "resource": "knowledge_base"},
            {"name": "Chat en Vivo", "scope": PermissionScope.CUSTOMER_EXPERIENCE, "action": "execute", "resource": "live_chat"},
            
            # MARKETING PERMISSIONS
            {"name": "Gestión Campañas", "scope": PermissionScope.MARKETING_CAMPAIGNS, "action": "create", "resource": "campaign"},
            {"name": "Redes Sociales", "scope": PermissionScope.MARKETING_CAMPAIGNS, "action": "update", "resource": "social_media"},
            {"name": "Email Marketing", "scope": PermissionScope.MARKETING_CAMPAIGNS, "action": "execute", "resource": "email_campaign"},
            {"name": "SEO/SEM", "scope": PermissionScope.MARKETING_CAMPAIGNS, "action": "update", "resource": "seo_sem"},
            {"name": "Analíticas Marketing", "scope": PermissionScope.ANALYTICS_DASHBOARD, "action": "read", "resource": "marketing_analytics"},
            {"name": "Gestión Contenido Web", "scope": PermissionScope.CONTENT_MANAGEMENT, "action": "update", "resource": "web_content"},
            {"name": "Promociones y Descuentos", "scope": PermissionScope.MARKETING_CAMPAIGNS, "action": "create", "resource": "promotion"},
            {"name": "Eventos y Ferias", "scope": PermissionScope.MARKETING_CAMPAIGNS, "action": "create", "resource": "event"},
            
            # FINANCE PERMISSIONS
            {"name": "Contabilidad General", "scope": PermissionScope.FINANCIAL_REPORTS, "action": "read", "resource": "accounting"},
            {"name": "Estados Financieros", "scope": PermissionScope.FINANCIAL_REPORTS, "action": "create", "resource": "financial_statement"},
            {"name": "Flujo de Caja", "scope": PermissionScope.FINANCIAL_REPORTS, "action": "read", "resource": "cash_flow"},
            {"name": "Presupuestos", "scope": PermissionScope.FINANCIAL_REPORTS, "action": "create", "resource": "budget"},
            {"name": "Conciliación Bancaria", "scope": PermissionScope.FINANCIAL_REPORTS, "action": "execute", "resource": "bank_reconciliation"},
            {"name": "Facturación", "scope": PermissionScope.FINANCIAL_REPORTS, "action": "create", "resource": "invoice"},
            {"name": "Pagos y Cobranzas", "scope": PermissionScope.FINANCIAL_REPORTS, "action": "update", "resource": "payment"},
            {"name": "Auditoría Financiera", "scope": PermissionScope.AUDIT_LOGS, "action": "read", "resource": "financial_audit"},
            
            # OPERATIONS PERMISSIONS
            {"name": "Gestión Proveedores", "scope": PermissionScope.BOOKING_MANAGEMENT, "action": "update", "resource": "supplier"},
            {"name": "Control Inventario", "scope": PermissionScope.BOOKING_MANAGEMENT, "action": "read", "resource": "inventory"},
            {"name": "Coordinación Tours", "scope": PermissionScope.BOOKING_MANAGEMENT, "action": "execute", "resource": "tour_coordination"},
            {"name": "Logística Destinos", "scope": PermissionScope.BOOKING_MANAGEMENT, "action": "update", "resource": "destination_logistics"},
            {"name": "Control Calidad", "scope": PermissionScope.CUSTOMER_EXPERIENCE, "action": "read", "resource": "quality_control"},
            {"name": "Gestión Contingencias", "scope": PermissionScope.CRISIS_MANAGER, "action": "execute", "resource": "contingency"},
            {"name": "Contratos Proveedores", "scope": PermissionScope.BOOKING_MANAGEMENT, "action": "create", "resource": "supplier_contract"},
            
            # HR PERMISSIONS
            {"name": "Gestión Empleados", "scope": PermissionScope.USER_MANAGEMENT, "action": "read", "resource": "employee"},
            {"name": "Reclutamiento", "scope": PermissionScope.USER_MANAGEMENT, "action": "create", "resource": "recruitment"},
            {"name": "Nómina", "scope": PermissionScope.FINANCIAL_REPORTS, "action": "read", "resource": "payroll"},
            {"name": "Evaluaciones Desempeño", "scope": PermissionScope.USER_MANAGEMENT, "action": "update", "resource": "performance"},
            {"name": "Capacitación", "scope": PermissionScope.CONTENT_MANAGEMENT, "action": "create", "resource": "training"},
            {"name": "Políticas RRHH", "scope": PermissionScope.CONTENT_MANAGEMENT, "action": "update", "resource": "hr_policy"},
            {"name": "Beneficios Empleados", "scope": PermissionScope.USER_MANAGEMENT, "action": "read", "resource": "benefits"},
            
            # IT PERMISSIONS
            {"name": "Administración Servidor", "scope": PermissionScope.SYSTEM_MONITORING, "action": "execute", "resource": "server"},
            {"name": "Gestión Redes", "scope": PermissionScope.SYSTEM_CONFIGURATION, "action": "update", "resource": "network"},
            {"name": "Desarrollo Software", "scope": PermissionScope.API_MANAGEMENT, "action": "create", "resource": "software"},
            {"name": "Base de Datos", "scope": PermissionScope.DATABASE_ACCESS, "action": "execute", "resource": "database"},
            {"name": "Seguridad IT", "scope": PermissionScope.SECURITY_SETTINGS, "action": "update", "resource": "it_security"},
            {"name": "Soporte Técnico", "scope": PermissionScope.SYSTEM_MONITORING, "action": "read", "resource": "tech_support"},
            {"name": "Backup y Recuperación", "scope": PermissionScope.BACKUP_RESTORE, "action": "execute", "resource": "backup"},
            
            # LEGAL PERMISSIONS
            {"name": "Contratos Legales", "scope": PermissionScope.CONTENT_MANAGEMENT, "action": "create", "resource": "legal_contract"},
            {"name": "Cumplimiento Normativo", "scope": PermissionScope.AUDIT_LOGS, "action": "read", "resource": "compliance"},
            {"name": "Propiedad Intelectual", "scope": PermissionScope.CONTENT_MANAGEMENT, "action": "update", "resource": "intellectual_property"},
            {"name": "Litigios", "scope": PermissionScope.AUDIT_LOGS, "action": "create", "resource": "litigation"},
            {"name": "Regulaciones Turismo", "scope": PermissionScope.AUDIT_LOGS, "action": "read", "resource": "tourism_regulation"},
        ]
        
        # Add existing AI agent permissions (previously created)
        ai_agents = [
            "ethical_tourism", "sustainable_travel", "cultural_immersion", "adventure_planner",
            "luxury_concierge", "budget_optimizer", "accessibility_coordinator", "group_coordinator",
            "crisis_manager", "carbon_footprint", "destination_expert", "booking_assistant",
            "customer_experience", "travel_insurance", "visa_consultant", "weather_advisor",
            "health_safety", "local_cuisine", "transportation_optimizer", "accommodation_specialist",
            "itinerary_planner", "review_analyzer", "social_impact", "multilingual_assistant",
            "virtual_tour_creator"
        ]
        
        for agent in ai_agents:
            expanded_permissions.extend([
                {"name": f"Ver {agent.replace('_', ' ').title()}", "scope": getattr(PermissionScope, agent.upper()), "action": "read", "resource": "agent"},
                {"name": f"Ejecutar {agent.replace('_', ' ').title()}", "scope": getattr(PermissionScope, agent.upper()), "action": "execute", "resource": "agent"}
            ])
        
        created_permissions = {}
        for perm_data in expanded_permissions:
            existing = self.db.query(Permission).filter_by(name=perm_data["name"]).first()
            if not existing:
                permission = Permission(
                    name=perm_data["name"],
                    description=f"Permiso para {perm_data['action']} en {perm_data['resource']}",
                    scope=perm_data["scope"],
                    action=perm_data["action"],
                    resource=perm_data["resource"]
                )
                self.db.add(permission)
                self.db.flush()
                created_permissions[perm_data["name"]] = permission
                print(f"  ✅ {perm_data['name']}")
            else:
                created_permissions[perm_data["name"]] = existing
        
        self.db.commit()
        return created_permissions
    
    def create_enterprise_branches(self):
        """Create comprehensive branch structure"""
        print("🌍 Creating enterprise branch structure...")
        
        branches_data = [
            # Global Headquarters
            {"name": "Sede Principal", "code": "HQ", "country": "Colombia", "city": "Bogotá", "region": "Andina", "is_headquarters": True},
            
            # National Branches
            {"name": "Sucursal Medellín", "code": "MDE", "country": "Colombia", "city": "Medellín", "region": "Antioquia"},
            {"name": "Sucursal Cali", "code": "CLO", "country": "Colombia", "city": "Cali", "region": "Valle del Cauca"},
            {"name": "Sucursal Cartagena", "code": "CTG", "country": "Colombia", "city": "Cartagena", "region": "Caribe"},
            {"name": "Sucursal Barranquilla", "code": "BAQ", "country": "Colombia", "city": "Barranquilla", "region": "Caribe"},
            
            # Regional Branches  
            {"name": "Oficina Miami", "code": "MIA", "country": "Estados Unidos", "city": "Miami", "region": "Norte América"},
            {"name": "Oficina Madrid", "code": "MAD", "country": "España", "city": "Madrid", "region": "Europa"},
            {"name": "Oficina México DF", "code": "MEX", "country": "México", "city": "Ciudad de México", "region": "Norte América"},
            {"name": "Oficina Buenos Aires", "code": "BUE", "country": "Argentina", "city": "Buenos Aires", "region": "Sur América"},
            {"name": "Oficina São Paulo", "code": "SAO", "country": "Brasil", "city": "São Paulo", "region": "Sur América"},
            
            # Strategic Locations
            {"name": "Oficina Cusco", "code": "CUZ", "country": "Perú", "city": "Cusco", "region": "Turismo Cultural"},
            {"name": "Oficina Cancún", "code": "CUN", "country": "México", "city": "Cancún", "region": "Turismo Playa"},
            {"name": "Oficina San José", "code": "SJO", "country": "Costa Rica", "city": "San José", "region": "Centro América"},
        ]
        
        created_branches = {}
        for branch_data in branches_data:
            existing = self.db.query(Branch).filter_by(code=branch_data["code"]).first()
            if not existing:
                branch = Branch(**branch_data)
                self.db.add(branch)
                self.db.flush()
                created_branches[branch_data["code"]] = branch
                print(f"  🏢 {branch_data['name']} ({branch_data['code']})")
            else:
                created_branches[branch_data["code"]] = existing
        
        self.db.commit()
        return created_branches
    
    def create_enterprise_roles(self):
        """Create comprehensive enterprise roles"""
        print("👔 Creating enterprise departmental roles...")
        
        # Get all permissions for role assignment
        all_permissions = self.db.query(Permission).all()
        perm_dict = {p.name: p for p in all_permissions}
        
        enterprise_roles = {
            # EXECUTIVE LEVEL
            "CEO": {
                "level": UserLevel.SUPER_ADMINISTRATOR,
                "description": "Chief Executive Officer - Acceso total",
                "permissions": list(perm_dict.keys())
            },
            "COO": {
                "level": UserLevel.GENERAL_MANAGER,
                "description": "Chief Operating Officer - Operaciones generales",
                "permissions": [p for p in perm_dict.keys() if not any(x in p for x in ["Base de Datos", "Seguridad IT"])]
            },
            
            # SALES DEPARTMENT
            "Director Ventas": {
                "level": UserLevel.DEPARTMENT_HEAD,
                "description": "Director del Departamento de Ventas",
                "permissions": [p for p in perm_dict.keys() if any(x in p for x in ["Ventas", "Lead", "CRM", "Cotizaci", "Pipeline", "Comision", "Cliente"])]
            },
            "Gerente Regional Ventas": {
                "level": UserLevel.BRANCH_MANAGER,
                "description": "Gerente Regional de Ventas",
                "permissions": ["Acceso Dashboard Ventas", "Gestión Leads", "Conversión Leads", "Acceso CRM Ventas", "Crear Cotizaciones", "Gestión Pipeline", "Reportes Ventas"]
            },
            "Supervisor Ventas": {
                "level": UserLevel.SENIOR_AGENT,
                "description": "Supervisor de Equipo Ventas",
                "permissions": ["Acceso Dashboard Ventas", "Gestión Leads", "Conversión Leads", "Acceso CRM Ventas", "Crear Cotizaciones"]
            },
            "Ejecutivo Ventas Senior": {
                "level": UserLevel.TRAVEL_AGENT,
                "description": "Ejecutivo de Ventas Senior",
                "permissions": ["Acceso Dashboard Ventas", "Gestión Leads", "Conversión Leads", "Crear Cotizaciones"]
            },
            "Ejecutivo Ventas Junior": {
                "level": UserLevel.CUSTOMER_SERVICE,
                "description": "Ejecutivo de Ventas Junior",
                "permissions": ["Acceso Dashboard Ventas", "Gestión Leads", "Ver Booking Assistant", "Ejecutar Booking Assistant"]
            },
            
            # CALL CENTER DEPARTMENT
            "Director Call Center": {
                "level": UserLevel.DEPARTMENT_HEAD,
                "description": "Director del Call Center",
                "permissions": [p for p in perm_dict.keys() if any(x in p for x in ["Call", "Ticket", "Chat", "Teléfon", "Llamada", "Soporte"])]
            },
            "Supervisor Turno": {
                "level": UserLevel.SENIOR_AGENT,
                "description": "Supervisor de Turno Call Center",
                "permissions": ["Sistema Telefónico", "Cola Llamadas", "Métricas Call Center", "Gestión Tickets", "Script Llamadas"]
            },
            "Agente Call Center Senior": {
                "level": UserLevel.TRAVEL_AGENT,
                "description": "Agente Senior Call Center",
                "permissions": ["Sistema Telefónico", "Cola Llamadas", "Gestión Tickets", "Base Conocimiento", "Chat en Vivo"]
            },
            "Agente Call Center": {
                "level": UserLevel.CUSTOMER_SERVICE,
                "description": "Agente Call Center",
                "permissions": ["Sistema Telefónico", "Gestión Tickets", "Base Conocimiento", "Chat en Vivo"]
            },
            "Operador Telefónico": {
                "level": UserLevel.COORDINATOR,
                "description": "Operador Telefónico Básico",
                "permissions": ["Sistema Telefónico", "Base Conocimiento"]
            },
            
            # MARKETING DEPARTMENT
            "Director Marketing": {
                "level": UserLevel.DEPARTMENT_HEAD,
                "description": "Director de Marketing y Comunicaciones",
                "permissions": [p for p in perm_dict.keys() if any(x in p for x in ["Marketing", "Campaña", "Contenido", "Social", "Email", "SEO", "Promocion", "Evento"])]
            },
            "Gerente Campañas": {
                "level": UserLevel.BRANCH_MANAGER,
                "description": "Gerente de Campañas Digitales",
                "permissions": ["Gestión Campañas", "Email Marketing", "Analíticas Marketing", "Promociones y Descuentos", "Eventos y Ferias"]
            },
            "Especialista Marketing Digital": {
                "level": UserLevel.MARKETING_SPECIALIST,
                "description": "Especialista en Marketing Digital",
                "permissions": ["Gestión Campañas", "Redes Sociales", "Email Marketing", "SEO/SEM", "Analíticas Marketing"]
            },
            "Content Creator": {
                "level": UserLevel.MARKETING_SPECIALIST,
                "description": "Creador de Contenido",
                "permissions": ["Gestión Contenido Web", "Redes Sociales", "Gestión Campañas"]
            },
            "Community Manager": {
                "level": UserLevel.CUSTOMER_SERVICE,
                "description": "Community Manager",
                "permissions": ["Redes Sociales", "Gestión Contenido Web"]
            },
            
            # FINANCE DEPARTMENT
            "Director Financiero": {
                "level": UserLevel.DEPARTMENT_HEAD,
                "description": "Director Financiero (CFO)",
                "permissions": [p for p in perm_dict.keys() if any(x in p for x in ["Financier", "Contabil", "Presupuest", "Flujo", "Factur", "Pago", "Auditor"])]
            },
            "Contador": {
                "level": UserLevel.SENIOR_AGENT,
                "description": "Contador Principal",
                "permissions": ["Contabilidad General", "Estados Financieros", "Facturación", "Conciliación Bancaria", "Auditoría Financiera"]
            },
            "Analista Financiero": {
                "level": UserLevel.ANALYST,
                "description": "Analista Financiero",
                "permissions": ["Contabilidad General", "Flujo de Caja", "Presupuestos", "Estados Financieros"]
            },
            "Tesorero": {
                "level": UserLevel.TRAVEL_AGENT,
                "description": "Tesorero",
                "permissions": ["Flujo de Caja", "Pagos y Cobranzas", "Conciliación Bancaria"]
            },
            
            # OPERATIONS DEPARTMENT
            "Director Operaciones": {
                "level": UserLevel.DEPARTMENT_HEAD,
                "description": "Director de Operaciones",
                "permissions": [p for p in perm_dict.keys() if any(x in p for x in ["Proveedor", "Tour", "Inventario", "Logística", "Calidad", "Contingencia"])]
            },
            "Coordinador Destinos": {
                "level": UserLevel.SENIOR_AGENT,
                "description": "Coordinador de Destinos",
                "permissions": ["Coordinación Tours", "Logística Destinos", "Gestión Proveedores", "Control Calidad"]
            },
            "Especialista Proveedores": {
                "level": UserLevel.TRAVEL_AGENT,
                "description": "Especialista en Proveedores",
                "permissions": ["Gestión Proveedores", "Contratos Proveedores", "Control Inventario"]
            },
            
            # HR DEPARTMENT
            "Director RRHH": {
                "level": UserLevel.DEPARTMENT_HEAD,
                "description": "Director de Recursos Humanos",
                "permissions": [p for p in perm_dict.keys() if any(x in p for x in ["Empleado", "Reclutamiento", "Nómina", "Evaluacion", "Capacitaci", "RRHH", "Beneficio"])]
            },
            "Especialista Reclutamiento": {
                "level": UserLevel.SENIOR_AGENT,
                "description": "Especialista en Reclutamiento",
                "permissions": ["Gestión Empleados", "Reclutamiento", "Evaluaciones Desempeño"]
            },
            "Coordinador Capacitación": {
                "level": UserLevel.TRAVEL_AGENT,
                "description": "Coordinador de Capacitación",
                "permissions": ["Capacitación", "Gestión Empleados", "Evaluaciones Desempeño"]
            },
            
            # IT DEPARTMENT
            "CTO": {
                "level": UserLevel.SYSTEM_ADMINISTRATOR,
                "description": "Chief Technology Officer",
                "permissions": [p for p in perm_dict.keys() if any(x in p for x in ["Sistema", "Servidor", "Red", "Software", "Base de Datos", "Seguridad IT", "Soporte", "Backup", "API"])]
            },
            "Arquitecto Sistemas": {
                "level": UserLevel.SYSTEM_ADMINISTRATOR,
                "description": "Arquitecto de Sistemas",
                "permissions": ["Administración Servidor", "Gestión Redes", "Base de Datos", "Seguridad IT", "Desarrollo Software"]
            },
            "DevOps Engineer": {
                "level": UserLevel.SENIOR_AGENT,
                "description": "Ingeniero DevOps",
                "permissions": ["Administración Servidor", "Gestión Redes", "Backup y Recuperación", "Desarrollo Software"]
            },
            "Desarrollador": {
                "level": UserLevel.TRAVEL_AGENT,
                "description": "Desarrollador de Software",
                "permissions": ["Desarrollo Software", "Base de Datos", "Soporte Técnico"]
            },
            "Soporte Técnico": {
                "level": UserLevel.CUSTOMER_SERVICE,
                "description": "Especialista Soporte Técnico",
                "permissions": ["Soporte Técnico", "Gestión Redes"]
            },
            "Analista Datos": {
                "level": UserLevel.ANALYST,
                "description": "Analista de Datos",
                "permissions": ["Base de Datos", "Desarrollo Software", "Soporte Técnico"]
            },
            
            # LEGAL DEPARTMENT
            "Director Legal": {
                "level": UserLevel.DEPARTMENT_HEAD,
                "description": "Director Legal",
                "permissions": [p for p in perm_dict.keys() if any(x in p for x in ["Legal", "Contrato", "Cumplimiento", "Propiedad", "Litigio", "Regulacion"])]
            },
            "Abogado": {
                "level": UserLevel.SENIOR_AGENT,
                "description": "Abogado Corporativo",
                "permissions": ["Contratos Legales", "Litigios", "Cumplimiento Normativo", "Propiedad Intelectual"]
            },
            "Especialista Cumplimiento": {
                "level": UserLevel.ANALYST,
                "description": "Especialista en Cumplimiento",
                "permissions": ["Cumplimiento Normativo", "Regulaciones Turismo", "Contratos Legales"]
            },
        }
        
        created_roles = {}
        for role_name, config in enterprise_roles.items():
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
                print(f"  👔 {role_name} ({len(role_permissions)} permisos)")
            else:
                created_roles[role_name] = existing
        
        self.db.commit()
        return created_roles
    
    def create_enterprise_users(self):
        """Create comprehensive demo users for each department"""
        print("👥 Creating enterprise demo users...")
        
        # Get branches and roles
        branches = {b.code: b for b in self.db.query(Branch).all()}
        roles = {r.name: r for r in self.db.query(Role).all()}
        
        demo_users = [
            # EXECUTIVE LEVEL
            {"username": "ceo", "password": "CEO123!", "first_name": "Carlos", "last_name": "Ejecutivo", "email": "ceo@spirittours.com", "role": "CEO", "branch": "HQ"},
            {"username": "coo", "password": "COO123!", "first_name": "Ana", "last_name": "Operaciones", "email": "coo@spirittours.com", "role": "COO", "branch": "HQ"},
            
            # SALES DEPARTMENT
            {"username": "sales.director", "password": "Sales123!", "first_name": "Miguel", "last_name": "Ventas", "email": "sales.director@spirittours.com", "role": "Director Ventas", "branch": "HQ"},
            {"username": "sales.manager", "password": "Sales123!", "first_name": "Laura", "last_name": "Regional", "email": "sales.manager@spirittours.com", "role": "Gerente Regional Ventas", "branch": "MDE"},
            {"username": "sales.supervisor", "password": "Sales123!", "first_name": "Pedro", "last_name": "Supervisor", "email": "sales.supervisor@spirittours.com", "role": "Supervisor Ventas", "branch": "CLO"},
            {"username": "sales.senior", "password": "Sales123!", "first_name": "María", "last_name": "Ejecutiva", "email": "sales.senior@spirittours.com", "role": "Ejecutivo Ventas Senior", "branch": "CTG"},
            {"username": "sales.junior", "password": "Sales123!", "first_name": "Juan", "last_name": "Novato", "email": "sales.junior@spirittours.com", "role": "Ejecutivo Ventas Junior", "branch": "BAQ"},
            
            # CALL CENTER DEPARTMENT
            {"username": "callcenter.director", "password": "Call123!", "first_name": "Carmen", "last_name": "Centro", "email": "callcenter.director@spirittours.com", "role": "Director Call Center", "branch": "HQ"},
            {"username": "callcenter.supervisor", "password": "Call123!", "first_name": "Roberto", "last_name": "Turno", "email": "callcenter.supervisor@spirittours.com", "role": "Supervisor Turno", "branch": "HQ"},
            {"username": "agent.senior", "password": "Call123!", "first_name": "Sofia", "last_name": "Agente", "email": "agent.senior@spirittours.com", "role": "Agente Call Center Senior", "branch": "MDE"},
            {"username": "agent.standard", "password": "Call123!", "first_name": "Diego", "last_name": "Servicio", "email": "agent.standard@spirittours.com", "role": "Agente Call Center", "branch": "CLO"},
            {"username": "operator", "password": "Call123!", "first_name": "Lucía", "last_name": "Teléfono", "email": "operator@spirittours.com", "role": "Operador Telefónico", "branch": "CTG"},
            
            # MARKETING DEPARTMENT
            {"username": "marketing.director", "password": "Mark123!", "first_name": "Andrea", "last_name": "Marketing", "email": "marketing.director@spirittours.com", "role": "Director Marketing", "branch": "HQ"},
            {"username": "campaigns.manager", "password": "Mark123!", "first_name": "Fernando", "last_name": "Campañas", "email": "campaigns.manager@spirittours.com", "role": "Gerente Campañas", "branch": "HQ"},
            {"username": "digital.specialist", "password": "Mark123!", "first_name": "Valentina", "last_name": "Digital", "email": "digital.specialist@spirittours.com", "role": "Especialista Marketing Digital", "branch": "MIA"},
            {"username": "content.creator", "password": "Mark123!", "first_name": "Sebastián", "last_name": "Contenido", "email": "content.creator@spirittours.com", "role": "Content Creator", "branch": "MAD"},
            {"username": "community.manager", "password": "Mark123!", "first_name": "Isabella", "last_name": "Community", "email": "community.manager@spirittours.com", "role": "Community Manager", "branch": "MEX"},
            
            # FINANCE DEPARTMENT
            {"username": "finance.director", "password": "Finance123!", "first_name": "Ricardo", "last_name": "Finanzas", "email": "finance.director@spirittours.com", "role": "Director Financiero", "branch": "HQ"},
            {"username": "accountant", "password": "Finance123!", "first_name": "Patricia", "last_name": "Contador", "email": "accountant@spirittours.com", "role": "Contador", "branch": "HQ"},
            {"username": "financial.analyst", "password": "Finance123!", "first_name": "Andrés", "last_name": "Analista", "email": "financial.analyst@spirittours.com", "role": "Analista Financiero", "branch": "MDE"},
            {"username": "treasurer", "password": "Finance123!", "first_name": "Mónica", "last_name": "Tesorería", "email": "treasurer@spirittours.com", "role": "Tesorero", "branch": "CLO"},
            
            # OPERATIONS DEPARTMENT
            {"username": "operations.director", "password": "Ops123!", "first_name": "Alejandro", "last_name": "Operaciones", "email": "operations.director@spirittours.com", "role": "Director Operaciones", "branch": "HQ"},
            {"username": "destinations.coordinator", "password": "Ops123!", "first_name": "Gabriela", "last_name": "Destinos", "email": "destinations.coordinator@spirittours.com", "role": "Coordinador Destinos", "branch": "CUZ"},
            {"username": "suppliers.specialist", "password": "Ops123!", "first_name": "Mauricio", "last_name": "Proveedores", "email": "suppliers.specialist@spirittours.com", "role": "Especialista Proveedores", "branch": "CUN"},
            
            # HR DEPARTMENT
            {"username": "hr.director", "password": "HR123!", "first_name": "Natalia", "last_name": "RecursosH", "email": "hr.director@spirittours.com", "role": "Director RRHH", "branch": "HQ"},
            {"username": "recruitment.specialist", "password": "HR123!", "first_name": "Camilo", "last_name": "Reclutamiento", "email": "recruitment.specialist@spirittours.com", "role": "Especialista Reclutamiento", "branch": "HQ"},
            {"username": "training.coordinator", "password": "HR123!", "first_name": "Daniela", "last_name": "Capacitación", "email": "training.coordinator@spirittours.com", "role": "Coordinador Capacitación", "branch": "BUE"},
            
            # IT DEPARTMENT
            {"username": "cto", "password": "Tech123!", "first_name": "Santiago", "last_name": "Tecnología", "email": "cto@spirittours.com", "role": "CTO", "branch": "HQ"},
            {"username": "systems.architect", "password": "Tech123!", "first_name": "Carolina", "last_name": "Arquitecta", "email": "systems.architect@spirittours.com", "role": "Arquitecto Sistemas", "branch": "HQ"},
            {"username": "devops", "password": "Tech123!", "first_name": "Emilio", "last_name": "DevOps", "email": "devops@spirittours.com", "role": "DevOps Engineer", "branch": "SAO"},
            {"username": "developer", "password": "Tech123!", "first_name": "Mariana", "last_name": "Desarrolla", "email": "developer@spirittours.com", "role": "Desarrollador", "branch": "HQ"},
            {"username": "support.tech", "password": "Tech123!", "first_name": "Felipe", "last_name": "Soporte", "email": "support.tech@spirittours.com", "role": "Soporte Técnico", "branch": "MDE"},
            {"username": "data.analyst", "password": "Tech123!", "first_name": "Juliana", "last_name": "Datos", "email": "data.analyst@spirittours.com", "role": "Analista Datos", "branch": "SJO"},
            
            # LEGAL DEPARTMENT
            {"username": "legal.director", "password": "Legal123!", "first_name": "Rodrigo", "last_name": "Legal", "email": "legal.director@spirittours.com", "role": "Director Legal", "branch": "HQ"},
            {"username": "lawyer", "password": "Legal123!", "first_name": "Esperanza", "last_name": "Abogada", "email": "lawyer@spirittours.com", "role": "Abogado", "branch": "HQ"},
            {"username": "compliance.specialist", "password": "Legal123!", "first_name": "Nicolás", "last_name": "Cumplimiento", "email": "compliance.specialist@spirittours.com", "role": "Especialista Cumplimiento", "branch": "MAD"},
        ]
        
        created_users = []
        for user_data in demo_users:
            existing = self.db.query(User).filter_by(username=user_data["username"]).first()
            if not existing:
                # Hash password
                password_hash = hashlib.sha256(user_data["password"].encode()).hexdigest()
                
                # Get branch and role
                branch = branches.get(user_data["branch"])
                role = roles.get(user_data["role"])
                
                new_user = User(
                    username=user_data["username"],
                    email=user_data["email"],
                    password_hash=password_hash,
                    first_name=user_data["first_name"],
                    last_name=user_data["last_name"],
                    branch_id=branch.id if branch else None,
                    is_active=True,
                    is_verified=True
                )
                
                if role:
                    new_user.roles = [role]
                
                self.db.add(new_user)
                self.db.flush()
                created_users.append(new_user)
                print(f"  👤 {user_data['username']} - {user_data['role']} ({user_data['branch']})")
        
        self.db.commit()
        return created_users
    
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

def initialize_enterprise_rbac_system(db: Session):
    """Main function to initialize complete enterprise RBAC system"""
    initializer = ExpandedRBACInitializer(db)
    initializer.initialize_enterprise_system()
    
    print("\n" + "="*80)
    print("🏢 ENTERPRISE RBAC SYSTEM INITIALIZATION COMPLETE")
    print("="*80)
    print("📊 DEPARTAMENTOS CREADOS:")
    print("  💰 Ventas: 5 roles (Director → Ejecutivo Junior)")
    print("  📞 Call Center: 5 roles (Director → Operador)")
    print("  📊 Marketing: 5 roles (Director → Community Manager)")
    print("  💳 Finanzas: 4 roles (Director → Tesorero)")
    print("  🎯 Operaciones: 3 roles (Director → Especialista)")
    print("  👥 RRHH: 3 roles (Director → Coordinador)")
    print("  🔧 IT: 6 roles (CTO → Analista Datos)")
    print("  ⚖️ Legal: 3 roles (Director → Especialista)")
    print()
    print("🌍 SUCURSALES: 13 ubicaciones globales")
    print("👥 USUARIOS DEMO: 35+ usuarios con credenciales completas")
    print()
    print("🔐 CREDENCIALES DE ACCESO:")
    print("  🏆 Ejecutivos: ceo/CEO123!, coo/COO123!")
    print("  💰 Ventas: sales.director/Sales123!, sales.manager/Sales123!")  
    print("  📞 Call Center: callcenter.director/Call123!, agent.senior/Call123!")
    print("  📊 Marketing: marketing.director/Mark123!, digital.specialist/Mark123!")
    print("  💳 Finanzas: finance.director/Finance123!, accountant/Finance123!")
    print("  🎯 Operaciones: operations.director/Ops123!")
    print("  👥 RRHH: hr.director/HR123!, recruitment.specialist/HR123!")
    print("  🔧 IT: cto/Tech123!, developer/Tech123!, support.tech/Tech123!")
    print("  ⚖️ Legal: legal.director/Legal123!, lawyer/Legal123!")
    print()
    print("✅ Sistema empresarial completo con control RBAC granular")
    print("="*80)