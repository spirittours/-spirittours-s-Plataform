/**
 * Tour Operators B2B Dashboard
 * Panel de control unificado para gestión de operadores turísticos
 * Integrado en el dashboard principal del CRM
 * 
 * Features:
 * - Role-based UI (system_admin vs operator_admin)
 * - Credential management with security
 * - Real-time health monitoring
 * - Integration testing
 * - Search and booking interface
 */

import React, { useState, useEffect } from 'react';
import {
  FiGlobe, FiSettings, FiActivity, FiCheckCircle, FiXCircle,
  FiAlertTriangle, FiEye, FiEyeOff, FiSave, FiTrash2, FiPlus,
  FiRefreshCw, FiSearch, FiLock, FiUnlock, FiEdit, FiZap,
  FiServer, FiShield, FiUsers, FiDollarSign, FiTrendingUp
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useRBACStore } from '../../store/rbacStore';
import toast from 'react-hot-toast';
import api from '../../services/api';

// Types
interface TourOperator {
  _id: string;
  name: string;
  code: string;
  businessName: string;
  type: 'receptive' | 'wholesaler' | 'dmc' | 'bedbank' | 'aggregator';
  relationship: 'supplier' | 'buyer' | 'both';
  status: 'pending_approval' | 'active' | 'inactive' | 'suspended';
  apiSystem: {
    type: string;
    credentials?: {
      username?: string;
      password?: string;
      apiKey?: string;
      agencyCode?: string;
    };
    endpoints: {
      production?: string;
      sandbox?: string;
      wsdl?: string;
    };
    config: {
      environment: 'production' | 'sandbox';
      timeout: number;
      retryAttempts: number;
    };
  };
  integrationStatus: {
    isConfigured: boolean;
    isActive: boolean;
    healthStatus: 'healthy' | 'warning' | 'error' | 'unknown';
    lastHealthCheck?: string;
  };
  businessTerms: {
    defaultCommission: {
      type: 'percentage' | 'fixed';
      value: number;
    };
    currency: string;
  };
  contact: {
    primaryName: string;
    primaryEmail: string;
    primaryPhone: string;
  };
}

interface MaskedCredentials {
  operatorId: string;
  operatorName: string;
  apiSystem: {
    type: string;
    credentials: {
      [key: string]: string;
    };
    endpoints: any;
    config: any;
  };
  integrationStatus: any;
  isConfigured: boolean;
}

const TourOperatorsDashboard: React.FC = () => {
  const { user, isAdmin } = useRBACStore();
  const [operators, setOperators] = useState<TourOperator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<TourOperator | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'details' | 'credentials' | 'search'>('list');
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [editingCredentials, setEditingCredentials] = useState(false);
  const [newCredentials, setNewCredentials] = useState<any>({});

  // Role-based permissions
  const isSystemAdmin = user?.role === 'system_admin';
  const isOperatorAdmin = user?.role === 'operator_admin';
  const canManageAll = isSystemAdmin;
  const canManageOwn = isSystemAdmin || isOperatorAdmin;

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/tour-operators');
      setOperators(response.data.data);
      toast.success(`${response.data.count} operadores cargados`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error cargando operadores');
    } finally {
      setLoading(false);
    }
  };

  const loadCredentials = async (operatorId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/tour-operators/${operatorId}/credentials`);
      setCredentials(response.data.data);
      setNewCredentials(response.data.data.apiSystem.credentials);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error cargando credenciales');
    } finally {
      setLoading(false);
    }
  };

  const updateCredentials = async () => {
    if (!selectedOperator) return;

    try {
      setLoading(true);
      await api.put(`/admin/tour-operators/${selectedOperator._id}/credentials`, {
        apiSystem: {
          credentials: newCredentials,
          endpoints: credentials?.apiSystem.endpoints,
          config: credentials?.apiSystem.config,
        }
      });
      toast.success('Credenciales actualizadas exitosamente');
      setEditingCredentials(false);
      loadCredentials(selectedOperator._id);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error actualizando credenciales');
    } finally {
      setLoading(false);
    }
  };

  const activateOperator = async (operatorId: string) => {
    try {
      setLoading(true);
      await api.post(`/admin/tour-operators/${operatorId}/activate`);
      toast.success('Operador activado');
      loadOperators();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error activando operador');
    } finally {
      setLoading(false);
    }
  };

  const deactivateOperator = async (operatorId: string, reason?: string) => {
    try {
      setLoading(true);
      await api.post(`/admin/tour-operators/${operatorId}/deactivate`, { reason });
      toast.success('Operador desactivado');
      loadOperators();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error desactivando operador');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (operatorId: string) => {
    try {
      setLoading(true);
      const response = await api.post(`/admin/tour-operators/${operatorId}/test`);
      if (response.data.success) {
        toast.success(`✅ Conexión exitosa (${response.data.data.responseTime}ms)`);
      } else {
        toast.error('❌ Conexión fallida');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error probando conexión');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <FiCheckCircle className="text-green-500" />;
      case 'warning': return <FiAlertTriangle className="text-yellow-500" />;
      case 'error': return <FiXCircle className="text-red-500" />;
      default: return <FiActivity className="text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FiGlobe className="text-blue-600" />
              Tour Operators B2B
            </h1>
            <p className="text-gray-600 mt-2">
              {isSystemAdmin 
                ? 'Gestión completa de operadores turísticos' 
                : 'Gestión de tu operador turístico'}
            </p>
          </div>
          <div className="flex gap-3">
            {isSystemAdmin && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:bg-blue-700"
                onClick={() => {/* Crear nuevo operador */}}
              >
                <FiPlus /> Nuevo Operador
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-white text-gray-700 rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:bg-gray-50"
              onClick={loadOperators}
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Actualizar
            </motion.button>
          </div>
        </div>

        {/* Role Badge */}
        <div className="mt-4">
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
            isSystemAdmin 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {isSystemAdmin ? '🔐 System Administrator' : '👤 Operator Administrator'}
          </span>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Operators List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-4 bg-white rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FiServer /> Operadores
          </h2>

          {loading && !operators.length ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {operators.map(operator => (
                <motion.div
                  key={operator._id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    setSelectedOperator(operator);
                    setActiveView('details');
                  }}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedOperator?._id === operator._id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{operator.name}</h3>
                      <p className="text-sm text-gray-600">{operator.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getHealthStatusIcon(operator.integrationStatus.healthStatus)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(operator.status)}`}>
                      {operator.status}
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                      {operator.apiSystem.type}
                    </span>
                  </div>

                  {operator.integrationStatus.isActive && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                      <FiCheckCircle /> Integración activa
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Details Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="col-span-8 bg-white rounded-xl shadow-lg p-6"
        >
          {selectedOperator ? (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b">
                {['details', 'credentials', 'search'].map(view => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view as any)}
                    className={`px-4 py-2 font-semibold transition-colors ${
                      activeView === view
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {view === 'details' && 'Detalles'}
                    {view === 'credentials' && 'Credenciales'}
                    {view === 'search' && 'Búsqueda'}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* Details View */}
                {activeView === 'details' && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      {selectedOperator.name}
                    </h2>

                    <div className="grid grid-cols-2 gap-6">
                      {/* Basic Info */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Código</label>
                          <p className="text-gray-900">{selectedOperator.code}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Razón Social</label>
                          <p className="text-gray-900">{selectedOperator.businessName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Tipo</label>
                          <p className="text-gray-900">{selectedOperator.type}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Relación</label>
                          <p className="text-gray-900">{selectedOperator.relationship}</p>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Contacto</label>
                          <p className="text-gray-900">{selectedOperator.contact.primaryName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Email</label>
                          <p className="text-gray-900">{selectedOperator.contact.primaryEmail}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Teléfono</label>
                          <p className="text-gray-900">{selectedOperator.contact.primaryPhone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Integration Status */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FiActivity /> Estado de Integración
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm text-gray-600">Configurado</label>
                          <p className="font-semibold">
                            {selectedOperator.integrationStatus.isConfigured ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <FiCheckCircle /> Sí
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center gap-1">
                                <FiXCircle /> No
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Activo</label>
                          <p className="font-semibold">
                            {selectedOperator.integrationStatus.isActive ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <FiCheckCircle /> Sí
                              </span>
                            ) : (
                              <span className="text-gray-600 flex items-center gap-1">
                                <FiXCircle /> No
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Salud</label>
                          <p className="font-semibold flex items-center gap-1">
                            {getHealthStatusIcon(selectedOperator.integrationStatus.healthStatus)}
                            {selectedOperator.integrationStatus.healthStatus}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex gap-3">
                      {canManageOwn && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => testConnection(selectedOperator._id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700"
                            disabled={loading}
                          >
                            <FiZap /> Probar Conexión
                          </motion.button>

                          {selectedOperator.integrationStatus.isActive ? (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => deactivateOperator(selectedOperator._id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-red-700"
                              disabled={loading}
                            >
                              <FiUnlock /> Desactivar
                            </motion.button>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => activateOperator(selectedOperator._id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-green-700"
                              disabled={loading || !selectedOperator.integrationStatus.isConfigured}
                            >
                              <FiLock /> Activar
                            </motion.button>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Credentials View */}
                {activeView === 'credentials' && (
                  <motion.div
                    key="credentials"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onViewportEnter={() => {
                      if (!credentials && canManageOwn) {
                        loadCredentials(selectedOperator._id);
                      }
                    }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FiShield /> Credenciales de Integración
                    </h2>

                    {!canManageOwn ? (
                      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800 flex items-center gap-2">
                          <FiLock /> No tienes permisos para ver las credenciales
                        </p>
                      </div>
                    ) : loading && !credentials ? (
                      <div className="animate-pulse space-y-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-12 bg-gray-200 rounded-lg"></div>
                        ))}
                      </div>
                    ) : credentials ? (
                      <div className="space-y-4">
                        {/* API System Type */}
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Sistema API</label>
                          <p className="text-gray-900 font-mono">{credentials.apiSystem.type}</p>
                        </div>

                        {/* Credentials Fields */}
                        {Object.entries(credentials.apiSystem.credentials).map(([key, value]: [string, any]) => (
                          <div key={key}>
                            <label className="text-sm font-semibold text-gray-600 capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                            {editingCredentials ? (
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={newCredentials[key] || ''}
                                onChange={(e) => setNewCredentials({ ...newCredentials, [key]: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Ingresar nuevo valor"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <p className="flex-1 px-4 py-2 bg-gray-100 rounded-lg font-mono text-sm">
                                  {showPassword ? value : value}
                                </p>
                                <button
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                  {showPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                          {editingCredentials ? (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={updateCredentials}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-green-700"
                                disabled={loading}
                              >
                                <FiSave /> Guardar
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setEditingCredentials(false);
                                  setNewCredentials(credentials.apiSystem.credentials);
                                }}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700"
                              >
                                Cancelar
                              </motion.button>
                            </>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setEditingCredentials(true)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700"
                            >
                              <FiEdit /> Editar Credenciales
                            </motion.button>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                )}

                {/* Search View */}
                {activeView === 'search' && (
                  <motion.div
                    key="search"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FiSearch /> Búsqueda de Disponibilidad
                    </h2>
                    <p className="text-gray-600">
                      Próximamente: interfaz de búsqueda de hoteles y paquetes
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <FiGlobe className="mx-auto text-6xl mb-4 text-gray-300" />
                <p className="text-lg">Selecciona un operador para ver los detalles</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TourOperatorsDashboard;
