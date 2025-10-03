import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaSpinner } from 'react-icons/fa';

const PrivateRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verificar rol si es necesario
  if (requiredRole) {
    const userRole = user?.role || 'customer';
    
    // Admin tiene acceso a todo
    if (userRole === 'admin') {
      return children;
    }
    
    // Verificar rol específico
    if (userRole !== requiredRole) {
      // Redirigir al dashboard correspondiente del usuario
      const redirectPath = {
        customer: '/dashboard',
        agent: '/agent/dashboard',
        operator: '/operator/dashboard',
        admin: '/admin/dashboard'
      }[userRole] || '/dashboard';
      
      return <Navigate to={redirectPath} replace />;
    }
  }

  return children;
};

export default PrivateRoute;