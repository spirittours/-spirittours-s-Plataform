/**
 * Operations Dashboard Component
 * Main dashboard for operations management
 */

import React, { useState, useEffect } from 'react';
import { operationsApi } from '@/services/operationsApi';
import {
  Calendar,
  AlertTriangle,
  TrendingUp,
  Users,
  Package,
  DollarSign,
  CheckCircle,
  Clock,
  MessageSquare
} from 'lucide-react';

interface DashboardMetrics {
  active_groups: number;
  pending_reservations: number;
  upcoming_services: number;
  pending_payments: number;
  alerts: {
    total: number;
    critical: number;
  };
  groups_to_close: number;
  validation_failures: number;
  timestamp: string;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  created_at: string;
}

const OperationsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'calendar' | 'alerts'>('overview');

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [metricsData, alertsData] = await Promise.all([
        operationsApi.getDashboardMetrics(),
        operationsApi.getAlerts({ resolved: false, limit: 10 })
      ]);
      setMetrics(metricsData);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dashboard de Operaciones
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Control central de reservas y grupos
              </p>
            </div>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Actualizar
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setSelectedView('overview')}
                className={`${
                  selectedView === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Vista General
              </button>
              <button
                onClick={() => setSelectedView('calendar')}
                className={`${
                  selectedView === 'calendar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Calendario
              </button>
              <button
                onClick={() => setSelectedView('alerts')}
                className={`${
                  selectedView === 'alerts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                Alertas
                {metrics && metrics.alerts.critical > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full">
                    {metrics.alerts.critical}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedView === 'overview' && metrics && (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Grupos Activos"
                value={metrics.active_groups}
                icon={<Users className="w-6 h-6" />}
                color="blue"
              />
              <MetricCard
                title="Reservas Pendientes"
                value={metrics.pending_reservations}
                icon={<Clock className="w-6 h-6" />}
                color="yellow"
              />
              <MetricCard
                title="Próximos Servicios (7d)"
                value={metrics.upcoming_services}
                icon={<Calendar className="w-6 h-6" />}
                color="green"
              />
              <MetricCard
                title="Pagos Pendientes"
                value={metrics.pending_payments}
                icon={<DollarSign className="w-6 h-6" />}
                color="red"
              />
            </div>

            {/* Alerts Section */}
            {metrics.alerts.total > 0 && (
              <div className="bg-white rounded-lg shadow mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Alertas Recientes
                    </h2>
                    {metrics.alerts.critical > 0 && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                        {metrics.alerts.critical} Críticas
                      </span>
                    )}
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-start">
                        <AlertTriangle
                          className={`w-5 h-5 mr-3 mt-0.5 ${
                            alert.severity === 'critical' ? 'text-red-500' : 
                            alert.severity === 'high' ? 'text-orange-500' : 
                            'text-yellow-500'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {alert.title}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {alert.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                        <button className="ml-4 px-3 py-1 text-sm text-blue-600 hover:text-blue-800">
                          Ver detalles
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {alerts.length > 5 && (
                  <div className="px-6 py-3 bg-gray-50 text-center">
                    <button
                      onClick={() => setSelectedView('alerts')}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Ver todas las alertas ({alerts.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <QuickActionCard
                title="Nueva Reserva"
                description="Crear una nueva reserva con proveedor"
                icon={<Package className="w-8 h-8" />}
                link="/operations/reservations/new"
              />
              <QuickActionCard
                title="Cerrar Grupos"
                description={`${metrics.groups_to_close} grupos pendientes de cierre`}
                icon={<CheckCircle className="w-8 h-8" />}
                link="/operations/groups/closure"
                badge={metrics.groups_to_close}
              />
              <QuickActionCard
                title="Validar Facturas"
                description={`${metrics.validation_failures} validaciones pendientes`}
                icon={<TrendingUp className="w-8 h-8" />}
                link="/operations/validations"
                badge={metrics.validation_failures}
              />
            </div>
          </>
        )}

        {selectedView === 'calendar' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Calendario de Servicios
            </h2>
            <p className="text-gray-500">
              Vista de calendario en desarrollo...
            </p>
          </div>
        )}

        {selectedView === 'alerts' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Todas las Alertas
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <div key={alert.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1">
                      <AlertTriangle
                        className={`w-5 h-5 mr-3 mt-0.5 ${
                          alert.severity === 'critical' ? 'text-red-500' : 
                          alert.severity === 'high' ? 'text-orange-500' : 
                          'text-yellow-500'
                        }`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {alert.title}
                          </p>
                          <span
                            className={`ml-2 px-2 py-1 text-xs font-medium rounded ${getSeverityColor(
                              alert.severity
                            )}`}
                          >
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                        Resolver
                      </button>
                      <button className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                        Detalles
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Chatbot Button */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition flex items-center justify-center">
        <MessageSquare className="w-6 h-6" />
      </button>
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'yellow' | 'green' | 'red';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
};

// Quick Action Card Component
interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  badge?: number;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon,
  link,
  badge,
}) => {
  return (
    <a
      href={link}
      className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">{icon}</div>
        {badge !== undefined && badge > 0 && (
          <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  );
};

export default OperationsDashboard;