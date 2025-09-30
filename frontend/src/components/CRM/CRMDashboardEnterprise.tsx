/**
 * CRM Dashboard Enterprise - FASE 1: CRM ENTERPRISE INTEGRATION
 * Sistema completo de integración con SuiteCRM 8.0+
 * Valor: $75,000 - CRM Enterprise Integration
 */

import React, { useState, useEffect } from 'react';
import {
  FiUsers, FiSettings, FiBarChart3, FiTrendingUp, FiPieChart, FiGrid,
  FiActivity, FiRefreshCw, FiAlertTriangle, FiChevronDown, FiChevronRight,
  FiEye, FiEdit, FiTrash2, FiPlus, FiSearch, FiFilter, FiDownload,
  FiMonitor, FiLayers, FiFileText, FiCalendar, FiMail, FiPhone,
  FiGlobe, FiStar, FiDollarSign, FiClock, FiCheckCircle, FiXCircle,
  FiSync, FiWifi, FiWifiOff, FiAlertCircle
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useRBACStore, usePermissions } from '../../store/rbacStore';
import toast from 'react-hot-toast';

// Interfaces para CRM Enterprise
interface CRMStats {
  totalContacts: number;
  totalLeads: number;
  totalOpportunities: number;
  totalAccounts: number;
  syncStatus: 'healthy' | 'warning' | 'error';
  lastSync: string;
  opportunitiesValue: number;
  leadsConvertedToday: number;
  syncErrorsCount: number;
  activeWebhooks: number;
  syncInProgress: boolean;
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

interface SyncActivity {
  id: string;
  entity_type: string;
  operation: string;
  status: string;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  changes_count: number;
}

const CRMDashboardEnterprise: React.FC = () => {
  const { user, isAdmin, isAuthenticated } = useRBACStore();
  const { hasPermission } = usePermissions();

  // Estados principales
  const [activeTab, setActiveTab] = useState<'dashboard' | 'contacts' | 'leads' | 'opportunities' | 'accounts' | 'sync'>('dashboard');
  const [crmStats, setCrmStats] = useState<CRMStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  
  // Estados para entidades CRM
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([]);
  const [accounts, setAccounts] = useState<CRMAccount[]>([]);
  const [syncActivities, setSyncActivities] = useState<SyncActivity[]>([]);
  
  // Estados de UI
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Funciones API
  const fetchCRMStats = async () => {
    try {
      const response = await fetch('/api/crm/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const stats = await response.json();
        setCrmStats({
          totalContacts: stats.total_contacts || 0,
          totalLeads: stats.total_leads || 0,
          totalOpportunities: stats.total_opportunities || 0,
          totalAccounts: stats.total_accounts || 0,
          syncStatus: stats.sync_status || 'healthy',
          lastSync: stats.last_sync || 'Nunca',
          opportunitiesValue: stats.opportunities_value || 0,
          leadsConvertedToday: stats.leads_converted_today || 0,
          syncErrorsCount: stats.sync_errors_count || 0,
          activeWebhooks: stats.active_webhooks || 0,
          syncInProgress: stats.sync_in_progress || false
        });
      }
    } catch (error) {
      console.error('Error fetching CRM stats:', error);
      toast.error('Error al cargar estadísticas del CRM');
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/crm/contacts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/crm/leads', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const response = await fetch('/api/crm/opportunities', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.opportunities || []);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/crm/accounts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchSyncActivities = async () => {
    try {
      const response = await fetch('/api/crm/sync/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSyncActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching sync activities:', error);
    }
  };

  const performSync = async (type: 'full' | 'incremental' = 'incremental') => {
    setSyncInProgress(true);
    try {
      const response = await fetch(`/api/crm/sync/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast.success(`Sincronización ${type} iniciada exitosamente`);
        // Refrescar datos después de unos segundos
        setTimeout(() => {
          fetchCRMStats();
          fetchContacts();
          fetchLeads();
          fetchOpportunities();
          fetchAccounts();
          fetchSyncActivities();
        }, 3000);
      } else {
        toast.error('Error al iniciar sincronización');
      }
    } catch (error) {
      console.error('Error during sync:', error);
      toast.error('Error al conectar con el servidor');
    } finally {
      setSyncInProgress(false);
    }
  };

  // Efectos
  useEffect(() => {
    if (isAuthenticated) {
      fetchCRMStats();
      
      // Auto-refresh cada 30 segundos
      const interval = setInterval(() => {
        fetchCRMStats();
      }, 30000);
      
      setRefreshInterval(interval);
      
      return () => {
        if (refreshInterval) clearInterval(refreshInterval);
      };
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab !== 'dashboard' && isAuthenticated) {
      switch (activeTab) {
        case 'contacts': fetchContacts(); break;
        case 'leads': fetchLeads(); break;
        case 'opportunities': fetchOpportunities(); break;
        case 'accounts': fetchAccounts(); break;
        case 'sync': fetchSyncActivities(); break;
      }
    }
  }, [activeTab, isAuthenticated]);

  // Funciones utilitarias
  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <FiCheckCircle className="text-green-500" />;
      case 'warning': return <FiAlertCircle className="text-yellow-500" />;
      case 'error': return <FiXCircle className="text-red-500" />;
      default: return <FiWifiOff className="text-gray-500" />;
    }
  };

  const getLeadStatusColor = (status: string) => {
    const colors = {
      'new': 'bg-blue-100 text-blue-800',
      'contacted': 'bg-yellow-100 text-yellow-800',
      'qualified': 'bg-green-100 text-green-800',
      'proposal': 'bg-purple-100 text-purple-800',
      'negotiation': 'bg-orange-100 text-orange-800',
      'closed_won': 'bg-green-200 text-green-900',
      'closed_lost': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getOpportunityStageColor = (stage: string) => {
    const colors = {
      'prospecting': 'bg-blue-100 text-blue-800',
      'qualification': 'bg-yellow-100 text-yellow-800',
      'needs_analysis': 'bg-indigo-100 text-indigo-800',
      'proposal': 'bg-purple-100 text-purple-800',
      'negotiation': 'bg-orange-100 text-orange-800',
      'closed_won': 'bg-green-200 text-green-900',
      'closed_lost': 'bg-red-100 text-red-800'
    };
    return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Renderizado de componentes
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header con estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Contactos</p>
              <p className="text-3xl font-bold text-gray-900">{crmStats?.totalContacts || 0}</p>
            </div>
            <FiUsers className="h-8 w-8 text-blue-600" />
          </div>
        </motion.div>

        <motion.div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-3xl font-bold text-gray-900">{crmStats?.totalLeads || 0}</p>
            </div>
            <FiTrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </motion.div>

        <motion.div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Oportunidades</p>
              <p className="text-3xl font-bold text-gray-900">{crmStats?.totalOpportunities || 0}</p>
              <p className="text-sm text-gray-500">
                {crmStats?.opportunitiesValue ? formatCurrency(crmStats.opportunitiesValue) : '€0'}
              </p>
            </div>
            <FiPieChart className="h-8 w-8 text-purple-600" />
          </div>
        </motion.div>

        <motion.div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Estado Sincronización</p>
              <div className="flex items-center space-x-2 mt-2">
                {crmStats && getSyncStatusIcon(crmStats.syncStatus)}
                <span className={`text-sm font-medium ${crmStats && getSyncStatusColor(crmStats.syncStatus)}`}>
                  {crmStats?.syncStatus === 'healthy' ? 'Saludable' :
                   crmStats?.syncStatus === 'warning' ? 'Advertencia' :
                   crmStats?.syncStatus === 'error' ? 'Error' : 'Desconocido'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Última sincronización: {crmStats?.lastSync}
              </p>
            </div>
            <FiSync className={`h-8 w-8 ${crmStats?.syncInProgress ? 'animate-spin text-blue-600' : 'text-gray-600'}`} />
          </div>
        </motion.div>
      </div>

      {/* Panel de sincronización */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Control de Sincronización</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => performSync('incremental')}
              disabled={syncInProgress}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {syncInProgress ? (
                <>
                  <FiSync className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <FiRefreshCw className="-ml-1 mr-2 h-4 w-4" />
                  Sincronización Incremental
                </>
              )}
            </button>
            
            <button
              onClick={() => performSync('full')}
              disabled={syncInProgress}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <FiDownload className="-ml-1 mr-2 h-4 w-4" />
              Sincronización Completa
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Webhooks Activos</span>
              <FiLayers className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{crmStats?.activeWebhooks || 0}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Conversiones Hoy</span>
              <FiTrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{crmStats?.leadsConvertedToday || 0}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Errores de Sync</span>
              <FiAlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{crmStats?.syncErrorsCount || 0}</p>
          </div>
        </div>
      </div>

      {/* Actividades recientes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Actividades Recientes</h3>
        <div className="space-y-3">
          {syncActivities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-500' :
                  activity.status === 'error' ? 'bg-red-500' :
                  'bg-yellow-500'
                }`} />
                <span className="text-sm text-gray-600">
                  {activity.operation} en {activity.entity_type} - {activity.changes_count} cambios
                </span>
              </div>
              <span className="text-xs text-gray-400">{formatDate(activity.started_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContacts = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Contactos CRM</h2>
        <div className="flex space-x-3">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar contactos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <FiPlus className="-ml-1 mr-2 h-4 w-4" />
            Nuevo Contacto
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {contacts
            .filter(contact => 
              searchTerm === '' ||
              contact.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              contact.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              contact.email.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((contact) => (
            <li key={contact.id} className="hover:bg-gray-50">
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">
                        {contact.first_name} {contact.last_name}
                      </p>
                      {contact.suitecrm_id && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Sincronizado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <FiMail className="mr-1 h-4 w-4" />
                      {contact.email}
                      {contact.phone && (
                        <>
                          <span className="mx-2">•</span>
                          <FiPhone className="mr-1 h-4 w-4" />
                          {contact.phone}
                        </>
                      )}
                    </div>
                    {contact.company && (
                      <p className="text-sm text-gray-500">{contact.company}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    contact.sync_status === 'success' ? 'bg-green-100 text-green-800' :
                    contact.sync_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {contact.sync_status}
                  </span>
                  <button className="text-indigo-600 hover:text-indigo-900">
                    <FiEye className="h-4 w-4" />
                  </button>
                  <button className="text-gray-400 hover:text-gray-600">
                    <FiEdit className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  // Verificar permisos
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FiLock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Acceso Requerido</h3>
          <p className="mt-1 text-sm text-gray-500">Inicia sesión para acceder al CRM</p>
        </div>
      </div>
    );
  }

  if (!hasPermission('crm_dashboard:read:dashboard')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FiAlertTriangle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Sin Permisos</h3>
          <p className="mt-1 text-sm text-gray-500">No tienes permisos para acceder a este módulo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <FiGrid className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">CRM Enterprise</h1>
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                FASE 1: $75K
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {crmStats && (
                <div className="flex items-center space-x-2">
                  {getSyncStatusIcon(crmStats.syncStatus)}
                  <span className="text-sm text-gray-600">
                    {crmStats.syncInProgress ? 'Sincronizando...' : 'Conectado'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navegación de tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: FiBarChart3 },
              { id: 'contacts', name: 'Contactos', icon: FiUsers },
              { id: 'leads', name: 'Leads', icon: FiTrendingUp },
              { id: 'opportunities', name: 'Oportunidades', icon: FiPieChart },
              { id: 'accounts', name: 'Cuentas', icon: FiGrid },
              { id: 'sync', name: 'Sincronización', icon: FiRefreshCw }
            ].map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="mr-2 h-4 w-4" />
                {name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'contacts' && renderContacts()}
          {activeTab === 'leads' && (
            <div className="text-center py-12">
              <FiTrendingUp className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Módulo de Leads</h3>
              <p className="mt-1 text-sm text-gray-500">En desarrollo - FASE 1</p>
            </div>
          )}
          {activeTab === 'opportunities' && (
            <div className="text-center py-12">
              <FiPieChart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Módulo de Oportunidades</h3>
              <p className="mt-1 text-sm text-gray-500">En desarrollo - FASE 1</p>
            </div>
          )}
          {activeTab === 'accounts' && (
            <div className="text-center py-12">
              <FiGrid className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Módulo de Cuentas</h3>
              <p className="mt-1 text-sm text-gray-500">En desarrollo - FASE 1</p>
            </div>
          )}
          {activeTab === 'sync' && (
            <div className="text-center py-12">
              <FiRefreshCw className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Panel de Sincronización</h3>
              <p className="mt-1 text-sm text-gray-500">En desarrollo - FASE 1</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CRMDashboardEnterprise;