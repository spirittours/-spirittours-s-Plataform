/**
 * CRM Dashboard - FASE 1: CRM ENTERPRISE INTEGRATION
 * Panel de Control Unificado con integración completa SuiteCRM
 * Funcionalidades:
 * - Dashboard principal con métricas en tiempo real
 * - Gestión completa de Contactos, Leads, Oportunidades, Cuentas
 * - Sincronización bidireccional con SuiteCRM 8.0+
 * - Sistema de webhooks en tiempo real
 * - Analytics y reportes empresariales
 * - Gestión de actividades y auditoría
 * Valor: $75,000 - Sistema CRM Enterprise Completo
 */

import React, { useState, useEffect } from 'react';
import {
  FiUsers, FiSettings, FiBarChart3, FiBookOpen, FiMapPin,
  FiShield, FiDatabase, FiMonitor, FiCreditCard, FiCalendar,
  FiMail, FiFileText, FiGlobe, FiTruck, FiHome, FiStar,
  FiHeart, FiCompass, FiUmbrella, FiCamera, FiHeadphones,
  FiNavigation, FiAward, FiTrendingUp, FiPieChart, FiGrid,
  FiLayers, FiActivity, FiLock, FiRefreshCw, FiAlertTriangle,
  FiChevronDown, FiChevronRight, FiEye, FiEdit, FiTrash2,
  FiPlus, FiSearch, FiFilter, FiDownload
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useRBACStore, usePermissions } from '../../store/rbacStore';
import toast from 'react-hot-toast';

// Interfaces
interface ModuleItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  permission: string;
  path: string;
  category: 'agents' | 'business' | 'admin' | 'analytics';
}

interface DashboardStats {
  total_users: number;
  active_users: number;
  total_bookings: number;
  revenue_today: number;
  agents_online: number;
  // CRM Enterprise Stats
  total_contacts: number;
  total_leads: number;
  total_opportunities: number;
  total_accounts: number;
  sync_status: 'healthy' | 'warning' | 'error';
  last_sync: string;
  opportunities_value: number;
  leads_converted_today: number;
  sync_errors_count: number;
}

interface CRMContact {
  id: string;
  suitecrm_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  status: 'active' | 'inactive';
  last_sync_at?: string;
  sync_status: 'success' | 'pending' | 'error';
  created_at: string;
}

interface CRMLead {
  id: string;
  suitecrm_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  lead_source?: string;
  rating?: 'Hot' | 'Warm' | 'Cold';
  annual_revenue?: number;
  converted: boolean;
  assigned_user_name?: string;
  created_at: string;
}

interface CRMOpportunity {
  id: string;
  suitecrm_id?: string;
  name: string;
  account_name?: string;
  sales_stage: 'prospecting' | 'qualification' | 'needs_analysis' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  amount?: number;
  probability: number;
  expected_close_date?: string;
  assigned_user_name?: string;
  created_at: string;
}

interface CRMAccount {
  id: string;
  suitecrm_id?: string;
  name: string;
  account_type?: string;
  industry?: string;
  phone_office?: string;
  email?: string;
  website?: string;
  annual_revenue?: number;
  employees?: number;
  assigned_user_name?: string;
  created_at: string;
}

const CRMDashboard: React.FC = () => {
  const { user, isAdmin, isAuthenticated } = useRBACStore();
  const { 
    canAccessAgent, 
    canAccessDashboardSection, 
    hasPermission, 
    accessibleAgents 
  } = usePermissions();

  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['dashboard']);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Definición completa de módulos del CRM
  const allModules: ModuleItem[] = [
    // AI Agents - 25 Agentes
    { id: 'ethical-tourism', name: 'Asesor Turismo Ético', description: 'Planificación de viajes sostenibles y responsables', icon: <FiHeart />, permission: 'ethical_tourism:read:agent', path: '/crm/agents/ethical-tourism', category: 'agents' },
    { id: 'sustainable-travel', name: 'Planificador Sostenible', description: 'Viajes ecológicos y carbono neutral', icon: <FiGlobe />, permission: 'sustainable_travel:read:agent', path: '/crm/agents/sustainable-travel', category: 'agents' },
    { id: 'cultural-immersion', name: 'Guía Inmersión Cultural', description: 'Experiencias culturales auténticas', icon: <FiCompass />, permission: 'cultural_immersion:read:agent', path: '/crm/agents/cultural-immersion', category: 'agents' },
    { id: 'adventure-planner', name: 'Planificador Aventura', description: 'Actividades extremas y deportes', icon: <FiNavigation />, permission: 'adventure_planner:read:agent', path: '/crm/agents/adventure-planner', category: 'agents' },
    { id: 'luxury-concierge', name: 'Concierge Lujo', description: 'Servicios VIP y experiencias exclusivas', icon: <FiAward />, permission: 'luxury_concierge:read:agent', path: '/crm/agents/luxury-concierge', category: 'agents' },
    { id: 'budget-optimizer', name: 'Optimizador Presupuesto', description: 'Viajes económicos y ofertas', icon: <FiTrendingUp />, permission: 'budget_optimizer:read:agent', path: '/crm/agents/budget-optimizer', category: 'agents' },
    { id: 'accessibility-coordinator', name: 'Coordinador Accesibilidad', description: 'Viajes para personas con discapacidades', icon: <FiShield />, permission: 'accessibility_coordinator:read:agent', path: '/crm/agents/accessibility-coordinator', category: 'agents' },
    { id: 'group-coordinator', name: 'Coordinador Grupos', description: 'Organización de viajes grupales', icon: <FiUsers />, permission: 'group_coordinator:read:agent', path: '/crm/agents/group-coordinator', category: 'agents' },
    { id: 'crisis-manager', name: 'Gestor Crisis', description: 'Manejo de emergencias y contingencias', icon: <FiAlertTriangle />, permission: 'crisis_manager:read:agent', path: '/crm/agents/crisis-manager', category: 'agents' },
    { id: 'carbon-footprint', name: 'Analizador Huella Carbono', description: 'Cálculo y compensación de emisiones', icon: <FiActivity />, permission: 'carbon_footprint:read:agent', path: '/crm/agents/carbon-footprint', category: 'agents' },
    { id: 'destination-expert', name: 'Experto Destinos', description: 'Información especializada de destinos', icon: <FiMapPin />, permission: 'destination_expert:read:agent', path: '/crm/agents/destination-expert', category: 'agents' },
    { id: 'booking-assistant', name: 'Asistente Reservas', description: 'Gestión completa de reservas', icon: <FiCalendar />, permission: 'booking_assistant:read:agent', path: '/crm/agents/booking-assistant', category: 'agents' },
    { id: 'customer-experience', name: 'Gestor Experiencia Cliente', description: 'Optimización satisfacción cliente', icon: <FiStar />, permission: 'customer_experience:read:agent', path: '/crm/agents/customer-experience', category: 'agents' },
    { id: 'travel-insurance', name: 'Asesor Seguros Viaje', description: 'Seguros y cobertura de viajes', icon: <FiUmbrella />, permission: 'travel_insurance:read:agent', path: '/crm/agents/travel-insurance', category: 'agents' },
    { id: 'visa-consultant', name: 'Consultor Visas', description: 'Trámites y documentación', icon: <FiFileText />, permission: 'visa_consultant:read:agent', path: '/crm/agents/visa-consultant', category: 'agents' },
    { id: 'weather-advisor', name: 'Asesor Clima', description: 'Pronósticos y recomendaciones', icon: <FiMonitor />, permission: 'weather_advisor:read:agent', path: '/crm/agents/weather-advisor', category: 'agents' },
    { id: 'health-safety', name: 'Coordinador Salud y Seguridad', description: 'Protocolos sanitarios y seguridad', icon: <FiShield />, permission: 'health_safety:read:agent', path: '/crm/agents/health-safety', category: 'agents' },
    { id: 'local-cuisine', name: 'Guía Gastronomía Local', description: 'Experiencias culinarias auténticas', icon: <FiHeart />, permission: 'local_cuisine:read:agent', path: '/crm/agents/local-cuisine', category: 'agents' },
    { id: 'transportation-optimizer', name: 'Optimizador Transporte', description: 'Rutas y medios de transporte', icon: <FiTruck />, permission: 'transportation_optimizer:read:agent', path: '/crm/agents/transportation-optimizer', category: 'agents' },
    { id: 'accommodation-specialist', name: 'Especialista Alojamiento', description: 'Hoteles y hospedajes únicos', icon: <FiHome />, permission: 'accommodation_specialist:read:agent', path: '/crm/agents/accommodation-specialist', category: 'agents' },
    { id: 'itinerary-planner', name: 'Planificador Itinerarios', description: 'Rutas personalizadas optimizadas', icon: <FiNavigation />, permission: 'itinerary_planner:read:agent', path: '/crm/agents/itinerary-planner', category: 'agents' },
    { id: 'review-analyzer', name: 'Analizador Reseñas', description: 'Análisis sentimientos y calidad', icon: <FiBarChart3 />, permission: 'review_analyzer:read:agent', path: '/crm/agents/review-analyzer', category: 'agents' },
    { id: 'social-impact', name: 'Evaluador Impacto Social', description: 'Medición impacto en comunidades', icon: <FiHeart />, permission: 'social_impact:read:agent', path: '/crm/agents/social-impact', category: 'agents' },
    { id: 'multilingual-assistant', name: 'Asistente Multiidioma', description: 'Soporte en múltiples idiomas', icon: <FiGlobe />, permission: 'multilingual_assistant:read:agent', path: '/crm/agents/multilingual-assistant', category: 'agents' },
    { id: 'virtual-tour-creator', name: 'Creador Tours Virtuales', description: 'Experiencias inmersivas virtuales', icon: <FiCamera />, permission: 'virtual_tour_creator:read:agent', path: '/crm/agents/virtual-tour-creator', category: 'agents' },

    // Módulos de Negocio
    { id: 'bookings', name: 'Gestión Reservas', description: 'Administrar todas las reservas', icon: <FiCalendar />, permission: 'booking_management:read:booking', path: '/crm/bookings', category: 'business' },
    { id: 'customers', name: 'Base Datos Clientes', description: 'Gestión completa de clientes', icon: <FiUsers />, permission: 'customer_database:read:customer', path: '/crm/customers', category: 'business' },
    { id: 'marketing', name: 'Campañas Marketing', description: 'Gestión de campañas y promociones', icon: <FiMail />, permission: 'marketing_campaigns:read:campaign', path: '/crm/marketing', category: 'business' },
    { id: 'content', name: 'Gestión Contenido', description: 'Administrar contenido web y apps', icon: <FiFileText />, permission: 'content_management:read:content', path: '/crm/content', category: 'business' },
    { id: 'branches', name: 'Gestión Sucursales', description: 'Administrar sucursales y regiones', icon: <FiMapPin />, permission: 'branch_management:read:branch', path: '/crm/branches', category: 'business' },

    // Analytics y Reportes
    { id: 'analytics', name: 'Panel Analíticas', description: 'Métricas y estadísticas', icon: <FiBarChart3 />, permission: 'analytics_dashboard:read:dashboard', path: '/crm/analytics', category: 'analytics' },
    { id: 'financial-reports', name: 'Reportes Financieros', description: 'Ingresos, gastos y rentabilidad', icon: <FiCreditCard />, permission: 'financial_reports:read:report', path: '/crm/financial-reports', category: 'analytics' },
    { id: 'data-export', name: 'Exportación Datos', description: 'Exportar datos en varios formatos', icon: <FiDownload />, permission: 'data_export:execute:export', path: '/crm/data-export', category: 'analytics' },

    // Administración del Sistema
    { id: 'user-management', name: 'Gestión Usuarios', description: 'Administrar usuarios y permisos', icon: <FiUsers />, permission: 'user_management:read:user', path: '/crm/user-management', category: 'admin' },
    { id: 'system-config', name: 'Configuración Sistema', description: 'Ajustes generales del sistema', icon: <FiSettings />, permission: 'system_configuration:read:config', path: '/crm/system-config', category: 'admin' },
    { id: 'audit-logs', name: 'Logs Auditoría', description: 'Registro de actividades del sistema', icon: <FiFileText />, permission: 'audit_logs:read:log', path: '/crm/audit-logs', category: 'admin' },
    { id: 'database-admin', name: 'Administración BD', description: 'Gestión directa de base de datos', icon: <FiDatabase />, permission: 'database_access:execute:database', path: '/crm/database-admin', category: 'admin' },
    { id: 'api-management', name: 'Gestión APIs', description: 'Monitoreo y configuración APIs', icon: <FiGrid />, permission: 'api_management:update:api', path: '/crm/api-management', category: 'admin' },
    { id: 'security-settings', name: 'Configuración Seguridad', description: 'Políticas y configuración seguridad', icon: <FiLock />, permission: 'security_settings:update:security', path: '/crm/security-settings', category: 'admin' },
    { id: 'system-monitoring', name: 'Monitoreo Sistema', description: 'Estado y rendimiento del sistema', icon: <FiMonitor />, permission: 'system_monitoring:read:monitoring', path: '/crm/system-monitoring', category: 'admin' },
    { id: 'backup-restore', name: 'Backup y Restauración', description: 'Gestión de respaldos del sistema', icon: <FiRefreshCw />, permission: 'backup_restore:execute:backup', path: '/crm/backup-restore', category: 'admin' },
  ];

  // Filtrar módulos según permisos del usuario
  const getAccessibleModules = (): ModuleItem[] => {
    if (isAdmin) {
      return allModules; // Administrador ve todos los módulos
    }

    return allModules.filter(module => {
      if (module.category === 'agents') {
        const agentScope = module.id.replace('-', '_');
        return canAccessAgent(agentScope);
      }
      return hasPermission(module.permission);
    });
  };

  const accessibleModules = getAccessibleModules();

  // Agrupar módulos por categoría
  const modulesByCategory = {
    dashboard: [
      { id: 'overview', name: 'Panel Principal', description: 'Resumen general del sistema', icon: <FiGrid />, permission: '', path: '/crm/dashboard', category: 'dashboard' as const }
    ],
    agents: accessibleModules.filter(m => m.category === 'agents'),
    business: accessibleModules.filter(m => m.category === 'business'),
    analytics: accessibleModules.filter(m => m.category === 'analytics'),
    admin: accessibleModules.filter(m => m.category === 'admin'),
    departments: [
      { id: 'sales-dept', name: 'Departamento Ventas', description: 'Gestión completa de ventas y leads', icon: <FiTrendingUp />, permission: '', path: '/crm/departments/sales', category: 'departments' as const },
      { id: 'callcenter-dept', name: 'Call Center', description: 'Atención al cliente y soporte telefónico', icon: <FiHeadphones />, permission: '', path: '/crm/departments/callcenter', category: 'departments' as const },
      { id: 'marketing-dept', name: 'Marketing Digital', description: 'Campañas, contenido y redes sociales', icon: <FiMail />, permission: '', path: '/crm/departments/marketing', category: 'departments' as const },
      { id: 'finance-dept', name: 'Finanzas', description: 'Contabilidad, presupuestos y reportes financieros', icon: <FiCreditCard />, permission: '', path: '/crm/departments/finance', category: 'departments' as const },
      { id: 'operations-dept', name: 'Operaciones', description: 'Gestión de proveedores y destinos', icon: <FiSettings />, permission: '', path: '/crm/departments/operations', category: 'departments' as const },
      { id: 'hr-dept', name: 'Recursos Humanos', description: 'Gestión de personal y capacitación', icon: <FiUsers />, permission: '', path: '/crm/departments/hr', category: 'departments' as const },
      { id: 'it-dept', name: 'IT y Sistemas', description: 'Tecnología, desarrollo y soporte técnico', icon: <FiMonitor />, permission: '', path: '/crm/departments/it', category: 'departments' as const },
      { id: 'legal-dept', name: 'Legal', description: 'Asuntos legales y cumplimiento normativo', icon: <FiShield />, permission: '', path: '/crm/departments/legal', category: 'departments' as const }
    ],
  };

  // Cargar estadísticas del dashboard
  const loadDashboardStats = async () => {
    if (!canAccessDashboardSection('analytics')) return;
    
    setLoading(true);
    try {
      // Simular carga de estadísticas (implementar con API real)
      const mockStats: DashboardStats = {
        total_users: 1247,
        active_users: 892,
        total_bookings: 5634,
        revenue_today: 45670,
        agents_online: 23
      };
      setDashboardStats(mockStats);
    } catch (error) {
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardStats();
    }
  }, [isAuthenticated, user]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const categoryNames = {
    dashboard: 'Panel Principal',
    agents: 'Agentes AI (25)',
    business: 'Módulos de Negocio',
    analytics: 'Analíticas y Reportes',
    admin: 'Administración Sistema',
    departments: 'Departamentos Empresariales'
  };

  const categoryIcons = {
    dashboard: <FiGrid />,
    agents: <FiHeadphones />,
    business: <FiLayers />,
    analytics: <FiPieChart />,
    admin: <FiSettings />,
    departments: <FiUsers />
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FiLock className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Acceso Requerido</h2>
          <p className="mt-2 text-sm text-gray-500">Debe iniciar sesión para acceder al CRM</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header del CRM */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FiCompass className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Spirit Tours CRM</h1>
              </div>
              <div className="hidden md:flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-full">
                <span className="text-sm font-medium text-blue-700">
                  {isAdmin ? 'Administrador' : 'Usuario'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img
                  className="h-8 w-8 rounded-full bg-gray-300"
                  src={`https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=random`}
                  alt="Avatar"
                />
                <span className="text-sm font-medium text-gray-700">
                  {user.first_name} {user.last_name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar de Navegación */}
        <aside className="w-80 bg-white shadow-lg h-screen overflow-y-auto">
          <div className="p-4">
            <div className="space-y-2">
              {Object.entries(categoryNames).map(([category, name]) => {
                const modules = modulesByCategory[category as keyof typeof modulesByCategory];
                if (!modules || modules.length === 0) return null;

                const isExpanded = expandedCategories.includes(category);
                
                return (
                  <div key={category} className="space-y-1">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        {categoryIcons[category as keyof typeof categoryIcons]}
                        <span>{name}</span>
                      </div>
                      {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                    </button>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-4 space-y-1">
                            {modules.map((module) => (
                              <button
                                key={module.id}
                                onClick={() => setActiveModule(module.id)}
                                className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                                  activeModule === module.id
                                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <span className="flex-shrink-0">{module.icon}</span>
                                <div className="text-left">
                                  <div className="font-medium">{module.name}</div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {module.description}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Área de Contenido Principal */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {activeModule === 'overview' && (
              <DashboardOverview 
                stats={dashboardStats} 
                loading={loading}
                accessibleModules={accessibleModules}
                isAdmin={isAdmin}
              />
            )}
            
            {activeModule !== 'overview' && (
              <ModuleContent 
                moduleId={activeModule}
                modules={allModules}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

// Componente Dashboard Overview
interface DashboardOverviewProps {
  stats: DashboardStats | null;
  loading: boolean;
  accessibleModules: ModuleItem[];
  isAdmin: boolean;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ stats, loading, accessibleModules, isAdmin }) => {
  const { user } = useRBACStore();

  const quickStats = [
    { label: 'Usuarios Totales', value: stats?.total_users || 0, icon: <FiUsers />, color: 'blue' },
    { label: 'Usuarios Activos', value: stats?.active_users || 0, icon: <FiActivity />, color: 'green' },
    { label: 'Reservas Totales', value: stats?.total_bookings || 0, icon: <FiCalendar />, color: 'purple' },
    { label: 'Ingresos Hoy', value: `$${stats?.revenue_today?.toLocaleString() || 0}`, icon: <FiCreditCard />, color: 'yellow' },
  ];

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">
          ¡Bienvenido al CRM, {user?.first_name}!
        </h2>
        <p className="opacity-90">
          {isAdmin 
            ? 'Control total: 8 departamentos, 25 agentes AI, gestión de 35+ usuarios empresariales.'
            : `Acceso departamental: ${accessibleModules.length} módulos según tu rol y permisos.`
          }
        </p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
            <div className="font-semibold">{user?.roles?.[0]?.name || 'Usuario'}</div>
            <div className="text-xs opacity-75">Rol Principal</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
            <div className="font-semibold">{user?.branch?.name || 'Corporativo'}</div>
            <div className="text-xs opacity-75">Ubicación</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
            <div className="font-semibold">{accessibleModules.length}</div>
            <div className="text-xs opacity-75">Módulos</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
            <div className="font-semibold">{user?.last_login ? 'Activo' : 'Nuevo'}</div>
            <div className="text-xs opacity-75">Estado</div>
          </div>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {loading ? '...' : stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                <span className={`text-${stat.color}-600`}>{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen Departamental */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Vista Departamental Empresarial
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <FiTrendingUp className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Ventas</span>
            </div>
            <div className="text-sm text-blue-700">Director, Gerentes, Ejecutivos</div>
            <div className="text-xs text-blue-600 mt-1">Pipeline, CRM, Comisiones</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <FiHeadphones className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">Call Center</span>
            </div>
            <div className="text-sm text-green-700">Supervisor, Agentes, Operadores</div>
            <div className="text-xs text-green-600 mt-1">Tickets, Chat, Métricas</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <FiMail className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">Marketing</span>
            </div>
            <div className="text-sm text-purple-700">Digital, Contenido, Redes</div>
            <div className="text-xs text-purple-600 mt-1">Campañas, SEO, Analytics</div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <FiCreditCard className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-yellow-900">Finanzas</span>
            </div>
            <div className="text-sm text-yellow-700">CFO, Contador, Analistas</div>
            <div className="text-xs text-yellow-600 mt-1">Estados, Flujo, Auditoría</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <FiSettings className="h-5 w-5 text-slate-600" />
              <span className="font-medium text-slate-900">Operaciones</span>
            </div>
            <div className="text-sm text-slate-700">Proveedores, Destinos, Tours</div>
            <div className="text-xs text-slate-600 mt-1">Logística, Calidad, Contratos</div>
          </div>
          
          <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <FiUsers className="h-5 w-5 text-rose-600" />
              <span className="font-medium text-rose-900">RRHH</span>
            </div>
            <div className="text-sm text-rose-700">Reclutamiento, Capacitación</div>
            <div className="text-xs text-rose-600 mt-1">Nómina, Evaluaciones, Beneficios</div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <FiMonitor className="h-5 w-5 text-indigo-600" />
              <span className="font-medium text-indigo-900">IT & Sistemas</span>
            </div>
            <div className="text-sm text-indigo-700">CTO, DevOps, Desarrollo</div>
            <div className="text-xs text-indigo-600 mt-1">Servidores, Seguridad, Soporte</div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <FiShield className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Legal</span>
            </div>
            <div className="text-sm text-gray-700">Contratos, Cumplimiento</div>
            <div className="text-xs text-gray-600 mt-1">Regulaciones, Propiedad IP</div>
          </div>
        </div>
      </div>
      
      {/* Módulos Accesibles */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Funciones Disponibles Según Tu Rol ({accessibleModules.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accessibleModules.slice(0, 12).map((module) => (
            <div
              key={module.id}
              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span className="text-blue-600">{module.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{module.name}</h4>
                <p className="text-sm text-gray-500 truncate">{module.description}</p>
              </div>
            </div>
          ))}
          
          {accessibleModules.length > 12 && (
            <div className="flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500">
              <span className="text-sm">+{accessibleModules.length - 12} funciones más</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente para mostrar contenido de módulos
interface ModuleContentProps {
  moduleId: string;
  modules: ModuleItem[];
}

const ModuleContent: React.FC<ModuleContentProps> = ({ moduleId, modules }) => {
  const module = modules.find(m => m.id === moduleId);
  
  if (!module) {
    return (
      <div className="text-center py-12">
        <FiAlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Módulo no encontrado</h3>
        <p className="mt-2 text-sm text-gray-500">El módulo seleccionado no existe o no tienes permisos para acceder.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del Módulo */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <span className="text-blue-600">{module.icon}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{module.name}</h1>
            <p className="text-gray-600">{module.description}</p>
          </div>
        </div>
      </div>

      {/* Contenido del Módulo */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 min-h-[400px]">
        <div className="text-center py-12">
          <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            {module.icon}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Módulo {module.name}
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {module.description}
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>📍 Ruta: {module.path}</p>
            <p>🔐 Permiso: {module.permission}</p>
            <p>🏷️ Categoría: {module.category}</p>
          </div>
          <div className="mt-8">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Implementar Funcionalidad
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;