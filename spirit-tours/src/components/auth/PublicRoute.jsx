import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    // Redirigir al dashboard correspondiente según el rol
    const redirectPath = {
      customer: '/dashboard',
      agent: '/agent/dashboard',
      operator: '/operator/dashboard',
      admin: '/admin/dashboard'
    }[user?.role || 'customer'] || '/dashboard';
    
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default PublicRoute;