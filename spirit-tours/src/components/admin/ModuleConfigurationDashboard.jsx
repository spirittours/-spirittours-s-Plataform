import React, { useState, useEffect } from 'react';
import {
  FaCog,
  FaToggleOn,
  FaToggleOff,
  FaRobot,
  FaCreditCard,
  FaComments,
  FaChartLine,
  FaShieldAlt,
  FaPlug,
  FaBullhorn,
  FaHeadset,
  FaFlask,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaDownload,
  FaUpload,
  FaPlus,
  FaTrash,
  FaSync,
  FaInfoCircle,
  FaServer,
  FaMemory,
  FaDatabase,
  FaEdit,
  FaSave,
  FaTimes,
  FaSearch,
  FaFilter,
  FaClock,
  FaChartPie,
  FaNetworkWired,
  FaEye,
  FaLock,
  FaUnlock
} from 'react-icons/fa';

const ModuleConfigurationDashboard = () => {
  const [modules, setModules] = useState([]);
  const [filteredModules, setFilteredModules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedModule, setSelectedModule] = useState(null);
  const [resourceUsage, setResourceUsage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModule, setShowAddModule] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Category icons mapping
  const categoryIcons = {
    ai_agents: <FaRobot className="text-purple-500" />,
    payment: <FaCreditCard className="text-green-500" />,
    communication: <FaComments className="text-blue-500" />,
    booking: <FaCalendar className="text-orange-500" />,
    analytics: <FaChartLine className="text-indigo-500" />,
    security: <FaShieldAlt className="text-red-500" />,
    integration: <FaPlug className="text-yellow-500" />,
    marketing: <FaBullhorn className="text-pink-500" />,
    support: <FaHeadset className="text-teal-500" />,
    experimental: <FaFlask className="text-gray-500" />
  };

  // Status colors
  const statusColors = {
    active: 'text-green-500',
    inactive: 'text-gray-400',
    maintenance: 'text-yellow-500',
    beta: 'text-blue-500',
    deprecated: 'text-red-500'
  };

  // Fetch modules on mount
  useEffect(() => {
    fetchModules();
    fetchCategories();
    fetchResourceUsage();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchResourceUsage();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Filter modules when search or category changes
  useEffect(() => {
    let filtered = modules;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredModules(filtered);
  }, [modules, selectedCategory, searchTerm]);

  const fetchModules = async () => {
    try {
      const response = await fetch('/api/v1/modules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setModules(data);
        setFilteredModules(data);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
      showMessage('Error al cargar módulos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/v1/modules/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchResourceUsage = async () => {
    try {
      const response = await fetch('/api/v1/modules/resource-usage', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResourceUsage(data);
      }
    } catch (error) {
      console.error('Error fetching resource usage:', error);
    }
  };

  const toggleModule = async (moduleId) => {
    try {
      const response = await fetch(`/api/v1/modules/${moduleId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        showMessage(result.message, 'success');
        fetchModules();
        fetchResourceUsage();
      } else {
        const error = await response.json();
        showMessage(error.detail || 'Error al cambiar estado del módulo', 'error');
      }
    } catch (error) {
      console.error('Error toggling module:', error);
      showMessage('Error al cambiar estado del módulo', 'error');
    }
  };

  const saveModuleSettings = async (moduleId, settings) => {
    try {
      const response = await fetch(`/api/v1/modules/${moduleId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ settings })
      });
      
      if (response.ok) {
        showMessage('Configuración guardada exitosamente', 'success');
        setEditingModule(null);
        fetchModules();
      } else {
        showMessage('Error al guardar configuración', 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('Error al guardar configuración', 'error');
    }
  };

  const restartModule = async (moduleId) => {
    try {
      const response = await fetch(`/api/v1/modules/${moduleId}/restart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        showMessage('Módulo reiniciado exitosamente', 'success');
        fetchModules();
      }
    } catch (error) {
      console.error('Error restarting module:', error);
      showMessage('Error al reiniciar módulo', 'error');
    }
  };

  const exportConfiguration = async () => {
    try {
      const response = await fetch('/api/v1/modules/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.configuration, null, 2)], 
          { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `module_config_${new Date().toISOString()}.json`;
        a.click();
        showMessage('Configuración exportada exitosamente', 'success');
      }
    } catch (error) {
      console.error('Error exporting configuration:', error);
      showMessage('Error al exportar configuración', 'error');
    }
  };

  const importConfiguration = async (file) => {
    try {
      const text = await file.text();
      const configuration = JSON.parse(text);
      
      const response = await fetch('/api/v1/modules/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(configuration)
      });
      
      if (response.ok) {
        showMessage('Configuración importada exitosamente', 'success');
        fetchModules();
        fetchResourceUsage();
      } else {
        showMessage('Error al importar configuración', 'error');
      }
    } catch (error) {
      console.error('Error importing configuration:', error);
      showMessage('Error al importar configuración', 'error');
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const getHealthIcon = (health) => {
    if (!health) return null;
    
    switch (health.status) {
      case 'healthy':
        return <FaCheckCircle className="text-green-500" />;
      case 'warning':
        return <FaExclamationTriangle className="text-yellow-500" />;
      case 'error':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaInfoCircle className="text-gray-500" />;
    }
  };

  const ModuleCard = ({ module }) => {
    const isEditing = editingModule === module.id;
    const [settings, setSettings] = useState(module.settings);

    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 border-2 ${
        module.enabled ? 'border-green-200' : 'border-gray-200'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {categoryIcons[module.category] || <FaCog />}
            </div>
            <div>
              <h3 className="text-lg font-bold">{module.name}</h3>
              <p className="text-sm text-gray-600">{module.description}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs font-medium ${statusColors[module.status]}`}>
                  {module.status.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">v{module.version}</span>
                {module.health_status && getHealthIcon(module.health_status)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => toggleModule(module.id)}
              className={`p-2 rounded-lg transition ${
                module.enabled 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={module.enabled ? 'Desactivar' : 'Activar'}
            >
              {module.enabled ? <FaToggleOn size={24} /> : <FaToggleOff size={24} />}
            </button>
            
            {module.enabled && (
              <button
                onClick={() => restartModule(module.id)}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                title="Reiniciar módulo"
              >
                <FaSync />
              </button>
            )}
            
            <button
              onClick={() => setEditingModule(isEditing ? null : module.id)}
              className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition"
              title="Configurar"
            >
              {isEditing ? <FaTimes /> : <FaEdit />}
            </button>
            
            <button
              onClick={() => setSelectedModule(module)}
              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
              title="Ver detalles"
            >
              <FaEye />
            </button>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex items-center space-x-1 text-xs">
            <FaServer className="text-gray-500" />
            <span>CPU: {module.resource_usage.cpu}%</span>
          </div>
          <div className="flex items-center space-x-1 text-xs">
            <FaMemory className="text-gray-500" />
            <span>RAM: {module.resource_usage.memory}MB</span>
          </div>
          <div className="flex items-center space-x-1 text-xs">
            <FaDatabase className="text-gray-500" />
            <span>Storage: {module.resource_usage.storage}MB</span>
          </div>
        </div>

        {/* Dependencies */}
        {module.dependencies.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1">Dependencias:</p>
            <div className="flex flex-wrap gap-1">
              {module.dependencies.map(dep => (
                <span key={dep} className="px-2 py-1 bg-gray-100 text-xs rounded">
                  {dep}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Edit Settings */}
        {isEditing && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-semibold mb-3">Configuración del Módulo</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(settings).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                  </label>
                  {typeof value === 'boolean' ? (
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setSettings({
                        ...settings,
                        [key]: e.target.checked
                      })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  ) : typeof value === 'number' ? (
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setSettings({
                        ...settings,
                        [key]: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : typeof value === 'object' && !Array.isArray(value) ? (
                    <textarea
                      value={JSON.stringify(value, null, 2)}
                      onChange={(e) => {
                        try {
                          setSettings({
                            ...settings,
                            [key]: JSON.parse(e.target.value)
                          });
                        } catch (error) {
                          // Invalid JSON, don't update
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                      rows={4}
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setSettings({
                        ...settings,
                        [key]: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setEditingModule(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => saveModuleSettings(module.id, settings)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center space-x-2"
              >
                <FaSave />
                <span>Guardar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center space-x-3">
          <FaCog className="text-indigo-600" />
          <span>Configuración de Módulos</span>
        </h1>
        <p className="text-gray-600 mt-2">
          Gestiona y configura todos los módulos del sistema de forma dinámica
        </p>
      </div>

      {/* Messages */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Resource Usage Overview */}
      {resourceUsage && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
            <FaChartPie className="text-indigo-600" />
            <span>Uso de Recursos del Sistema</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">CPU</p>
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all ${
                      resourceUsage.usage_percentages?.cpu > 80 
                        ? 'bg-red-500' 
                        : resourceUsage.usage_percentages?.cpu > 60 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${resourceUsage.usage_percentages?.cpu || 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-700 mt-1">
                  {resourceUsage.cpu_percent}% / {resourceUsage.limits?.cpu_percent}%
                </span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Memoria</p>
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all ${
                      resourceUsage.usage_percentages?.memory > 80 
                        ? 'bg-red-500' 
                        : resourceUsage.usage_percentages?.memory > 60 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${resourceUsage.usage_percentages?.memory || 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-700 mt-1">
                  {resourceUsage.memory_mb}MB / {resourceUsage.limits?.memory_mb}MB
                </span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Almacenamiento</p>
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all ${
                      resourceUsage.usage_percentages?.storage > 80 
                        ? 'bg-red-500' 
                        : resourceUsage.usage_percentages?.storage > 60 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${resourceUsage.usage_percentages?.storage || 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-700 mt-1">
                  {resourceUsage.storage_gb}GB / {resourceUsage.limits?.storage_gb}GB
                </span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Módulos</p>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-indigo-600">
                  {resourceUsage.modules_active}
                </span>
                <span className="text-sm text-gray-500">/ {resourceUsage.modules_total} activos</span>
              </div>
            </div>
          </div>
          
          {resourceUsage.warnings && resourceUsage.warnings.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-center space-x-2">
                <FaExclamationTriangle />
                <span>{resourceUsage.warnings[0]}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar módulos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          
          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <FaFilter className="text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={exportConfiguration}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
            >
              <FaDownload />
              <span>Exportar</span>
            </button>
            
            <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center space-x-2 cursor-pointer">
              <FaUpload />
              <span>Importar</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files[0]) {
                    importConfiguration(e.target.files[0]);
                  }
                }}
              />
            </label>
            
            <button
              onClick={() => setShowAddModule(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center space-x-2"
            >
              <FaPlus />
              <span>Añadir Módulo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredModules.map(module => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>
      
      {filteredModules.length === 0 && (
        <div className="text-center py-12">
          <FaInfoCircle className="text-6xl text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No se encontraron módulos</p>
        </div>
      )}

      {/* Module Details Modal */}
      {selectedModule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">Detalles del Módulo</h2>
                <button
                  onClick={() => setSelectedModule(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes size={24} />
                </button>
              </div>
              
              {/* Module info */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedModule.name}</h3>
                  <p className="text-gray-600">{selectedModule.description}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className={`font-medium ${statusColors[selectedModule.status]}`}>
                      {selectedModule.status.toUpperCase()}
                    </span>
                    <span className="text-gray-500">v{selectedModule.version}</span>
                    <span className="text-gray-500">ID: {selectedModule.id}</span>
                  </div>
                </div>
                
                {/* Settings */}
                <div>
                  <h4 className="font-semibold mb-2">Configuración Actual</h4>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    {JSON.stringify(selectedModule.settings, null, 2)}
                  </pre>
                </div>
                
                {/* Dependencies */}
                <div>
                  <h4 className="font-semibold mb-2">Dependencias</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedModule.dependencies.length > 0 ? (
                      selectedModule.dependencies.map(dep => (
                        <span key={dep} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                          {dep}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">Sin dependencias</span>
                    )}
                  </div>
                </div>
                
                {/* Permissions */}
                <div>
                  <h4 className="font-semibold mb-2">Permisos Requeridos</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedModule.permissions_required.map(perm => (
                      <span key={perm} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Resource Usage */}
                <div>
                  <h4 className="font-semibold mb-2">Uso de Recursos</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <FaServer className="text-gray-500 mb-2" />
                      <p className="text-sm text-gray-600">CPU</p>
                      <p className="text-lg font-semibold">{selectedModule.resource_usage.cpu}%</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <FaMemory className="text-gray-500 mb-2" />
                      <p className="text-sm text-gray-600">Memoria</p>
                      <p className="text-lg font-semibold">{selectedModule.resource_usage.memory}MB</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <FaDatabase className="text-gray-500 mb-2" />
                      <p className="text-sm text-gray-600">Almacenamiento</p>
                      <p className="text-lg font-semibold">{selectedModule.resource_usage.storage}MB</p>
                    </div>
                  </div>
                </div>
                
                {/* Timestamps */}
                <div>
                  <h4 className="font-semibold mb-2">Información de Tiempo</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Creado: {new Date(selectedModule.created_at).toLocaleString()}</p>
                    <p>Última actualización: {new Date(selectedModule.last_updated).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleConfigurationDashboard;