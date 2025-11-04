import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SystemConfigDashboard from '../system-config/SystemConfigDashboard';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="px-4 py-6 sm:px-6">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-600 mt-1">Bienvenido {user?.first_name}</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="px-4 flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Estadísticas
            </button>
            <button
              onClick={() => setActiveTab('system-config')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'system-config'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚙️ Configuración del Sistema
            </button>
          </nav>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Estadísticas del Sistema</h2>
            <p className="text-gray-600 mb-4">Panel administrativo en construcción...</p>
            <button 
              onClick={logout} 
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
            >
              Cerrar Sesión
            </button>
          </div>
        )}
        
        {/* System Configuration Tab */}
        {activeTab === 'system-config' && (
          <SystemConfigDashboard />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;