import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

// RBAC Store
import { useRBACStore } from './store/rbacStore';

// Main Components
import LoginPage from './components/Auth/LoginPage';
import CRMDashboard from './components/CRM/CRMDashboard';
import UserManagement from './components/CRM/UserManagement';

// AI Agents Components
import AIAgentsRouter from './components/AIAgents/AIAgentsRouter';

// Analytics Components
import AnalyticsRouter from './components/Analytics/AnalyticsRouter';

// Portals Components
import PortalsRouter from './components/Portals/PortalsRouter';

// Payments Components
import PaymentsRouter from './components/Payments/PaymentsRouter';

// File Manager Components
import FileManagerRouter from './components/FileManager/FileManagerRouter';

// Notifications Components
import NotificationsRouter from './components/Notifications/NotificationsRouter';

// Legacy Components for gradual migration
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Dashboard from './components/Dashboard/Dashboard';
import ComingSoon from './components/Placeholder/ComingSoon';

// RBAC Components
import { AgentGate, AdminGate } from './components/RBAC/PermissionGate';

// Styles
import './App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App: React.FC = () => {
  const { isAuthenticated, isLoading, user, isAdmin, initializeAuth } = useRBACStore();

  // Initialize authentication on app startup
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800">Iniciando Spirit Tours CRM...</h2>
          <p className="text-gray-600">Verificando permisos y configuración del sistema</p>
          <p className="text-sm text-gray-500 mt-2">25 Agentes AI • Control RBAC • Gestión Integral</p>
        </motion.div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          
          <Routes>
            {/* Authentication Routes - Only show when not authenticated */}
            {!isAuthenticated && (
              <>
                <Route path="/" element={<LoginPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<LoginPage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            )}
            
            {/* Protected CRM Routes - Only show when authenticated */}
            {isAuthenticated && (
              <>
                {/* Root redirect to CRM */}
                <Route path="/" element={<Navigate to="/crm" replace />} />
                <Route path="/login" element={<Navigate to="/crm" replace />} />
                <Route path="/register" element={<Navigate to="/crm" replace />} />
                
                {/* Main CRM Dashboard */}
                <Route path="/crm" element={<CRMDashboard />} />
                
                {/* AI Agents Routes */}
                <Route path="/ai-agents/*" element={<AIAgentsRouter />} />
                
                {/* Analytics Routes */}
                <Route path="/analytics/*" element={<AnalyticsRouter />} />
                
                {/* Portals Routes */}
                <Route path="/portals/*" element={<PortalsRouter />} />
                
                {/* Payments Routes */}
                <Route path="/payments/*" element={<PaymentsRouter />} />
                
                {/* File Manager Routes */}
                <Route path="/files/*" element={<FileManagerRouter />} />
                
                {/* Notifications Routes */}
                <Route path="/notifications/*" element={<NotificationsRouter />} />
                
                {/* CRM Module Routes with RBAC Protection */}
                <Route 
                  path="/crm/user-management" 
                  element={
                    <AdminGate fallback={<UnauthorizedAccess />}>
                      <UserManagement isAdmin={isAdmin} />
                    </AdminGate>
                  } 
                />
                
                {/* AI Agents Routes - Protected by specific permissions */}
                <Route 
                  path="/crm/agents/ethical-tourism" 
                  element={
                    <AgentGate 
                      requiredScope="ethical_tourism" 
                      fallback={<UnauthorizedAccess />}
                    >
                      <ComingSoon 
                        title="Asesor Turismo Ético" 
                        agentName="Planificación de viajes sostenibles" 
                        description="Sistema avanzado para turismo responsable y ético con análisis de impacto social." 
                      />
                    </AgentGate>
                  } 
                />
                
                <Route 
                  path="/crm/agents/sustainable-travel" 
                  element={
                    <AgentGate 
                      requiredScope="sustainable_travel" 
                      fallback={<UnauthorizedAccess />}
                    >
                      <ComingSoon 
                        title="Planificador Sostenible" 
                        agentName="Viajes ecológicos carbono neutral" 
                        description="Optimización de rutas sostenibles con cálculo de huella de carbono." 
                      />
                    </AgentGate>
                  } 
                />
                
                <Route 
                  path="/crm/agents/cultural-immersion" 
                  element={
                    <AgentGate 
                      requiredScope="cultural_immersion" 
                      fallback={<UnauthorizedAccess />}
                    >
                      <ComingSoon 
                        title="Guía Inmersión Cultural" 
                        agentName="Experiencias culturales auténticas" 
                        description="Conexión profunda con culturas locales y tradiciones." 
                      />
                    </AgentGate>
                  } 
                />
                
                <Route 
                  path="/crm/agents/adventure-planner" 
                  element={
                    <AgentGate 
                      requiredScope="adventure_planner" 
                      fallback={<UnauthorizedAccess />}
                    >
                      <ComingSoon 
                        title="Planificador Aventura" 
                        agentName="Actividades extremas y deportes" 
                        description="Planificación de actividades de aventura con protocolos de seguridad." 
                      />
                    </AgentGate>
                  } 
                />
                
                <Route 
                  path="/crm/agents/luxury-concierge" 
                  element={
                    <AgentGate 
                      requiredScope="luxury_concierge" 
                      fallback={<UnauthorizedAccess />}
                    >
                      <ComingSoon 
                        title="Concierge Lujo" 
                        agentName="Servicios VIP exclusivos" 
                        description="Experiencias de lujo personalizadas y servicios concierge premium." 
                      />
                    </AgentGate>
                  } 
                />
                
                <Route 
                  path="/crm/agents/budget-optimizer" 
                  element={
                    <AgentGate 
                      requiredScope="budget_optimizer" 
                      fallback={<UnauthorizedAccess />}
                    >
                      <ComingSoon 
                        title="Optimizador Presupuesto" 
                        agentName="Viajes económicos inteligentes" 
                        description="Optimización de presupuestos con máximo valor por dinero invertido." 
                      />
                    </AgentGate>
                  } 
                />
                
                {/* Business Module Routes */}
                <Route 
                  path="/crm/bookings" 
                  element={
                    <PermissionGate permission="booking_management:read:booking">
                      <ComingSoon 
                        title="Gestión de Reservas" 
                        description="Sistema completo de gestión de reservas y bookings." 
                      />
                    </PermissionGate>
                  } 
                />
                
                <Route 
                  path="/crm/customers" 
                  element={
                    <PermissionGate permission="customer_database:read:customer">
                      <ComingSoon 
                        title="Base de Datos Clientes" 
                        description="Gestión integral de la base de datos de clientes." 
                      />
                    </PermissionGate>
                  } 
                />
                
                <Route 
                  path="/crm/analytics" 
                  element={
                    <PermissionGate permission="analytics_dashboard:read:dashboard">
                      <Navigate to="/analytics" replace />
                    </PermissionGate>
                  } 
                />
                
                <Route 
                  path="/crm/financial-reports" 
                  element={
                    <PermissionGate permission="financial_reports:read:report">
                      <ComingSoon 
                        title="Reportes Financieros" 
                        description="Análisis financiero y reportes de rentabilidad." 
                      />
                    </PermissionGate>
                  } 
                />
                
                {/* System Administration Routes */}
                <Route 
                  path="/crm/system-config" 
                  element={
                    <AdminGate fallback={<UnauthorizedAccess />}>
                      <ComingSoon 
                        title="Configuración del Sistema" 
                        description="Configuraciones avanzadas del sistema CRM." 
                      />
                    </AdminGate>
                  } 
                />
                
                <Route 
                  path="/crm/audit-logs" 
                  element={
                    <AdminGate fallback={<UnauthorizedAccess />}>
                      <ComingSoon 
                        title="Logs de Auditoría" 
                        description="Sistema de auditoría y monitoreo de actividades." 
                      />
                    </AdminGate>
                  } 
                />
                
                <Route 
                  path="/crm/database-admin" 
                  element={
                    <PermissionGate permission="database_access:execute:database">
                      <ComingSoon 
                        title="Administración Base de Datos" 
                        description="Acceso directo y gestión de base de datos." 
                      />
                    </PermissionGate>
                  } 
                />
                
                {/* Legacy Routes for backward compatibility */}
                <Route path="/dashboard" element={<Navigate to="/crm" replace />} />
                
                <Route 
                  path="/legacy" 
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/crm" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                </Route>
                
                {/* Catch all authenticated routes */}
                <Route path="*" element={<Navigate to="/crm" replace />} />
              </>
            )}
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
};

// Component for unauthorized access
const UnauthorizedAccess: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center max-w-md mx-auto p-6">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
        <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso No Autorizado</h2>
      <p className="text-gray-600 mb-4">
        No tienes permisos suficientes para acceder a esta sección del sistema.
      </p>
      <p className="text-sm text-gray-500 mb-6">
        Contacta a tu administrador si necesitas acceso a esta funcionalidad.
      </p>
      <button
        onClick={() => window.history.back()}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Volver
      </button>
    </div>
  </div>
);

// Simple Permission Gate Component
interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
}

const PermissionGate: React.FC<PermissionGateProps> = ({ permission, children }) => {
  const { hasPermission, isAdmin } = useRBACStore();
  
  if (isAdmin || hasPermission(permission)) {
    return <>{children}</>;
  }
  
  return <UnauthorizedAccess />;
};

export default App;