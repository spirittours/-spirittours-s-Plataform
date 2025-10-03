import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="px-4 py-6 sm:px-6">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p>Bienvenido {user?.first_name}</p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Estadísticas del Sistema</h2>
          <p>Panel administrativo en construcción...</p>
          <button onClick={logout} className="mt-4 bg-red-600 text-white px-4 py-2 rounded">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;