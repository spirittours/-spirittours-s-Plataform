/**
 * Advanced Analytics Dashboard Component
 * 
 * Features:
 * - Real-time metrics visualization
 * - Interactive charts and graphs
 * - Tour performance analysis
 * - Guide performance tracking
 * - Revenue forecasting
 * - Alert management
 * - Export functionality
 * - Drill-down capabilities
 */

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  MapPin,
  Star,
  AlertTriangle,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Clock,
  Award,
} from 'lucide-react';

interface RealTimeMetrics {
  current: {
    revenue: number;
    tours: number;
    passengers: number;
    activeUsers: number;
    conversionRate: number;
    averageOrderValue: number;
  };
  hourly: Array<{
    hour: number;
    revenue: number;
    tours: number;
  }>;
  timestamp: string;
}

interface TourPerformance {
  tours: any[];
  summary: {
    totalTours: number;
    totalRevenue: number;
    totalPassengers: number;
    averageRating: string;
    averageDuration: number;
    averageRevenuePerTour: string;
  };
}

interface GuidePerformance {
  guideId: string;
  timeRange: string;
  summary: {
    totalTours: number;
    totalPassengers: number;
    totalRevenue: number;
    averageRating: string;
    hoursWorked: string;
    efficiencyScore: string;
    excellentToursRate: string;
    poorToursRate: string;
  };
  dailyBreakdown: any[];
}

interface RevenueForecast {
  forecasts: Array<{
    date: string;
    predictedRevenue: string;
    lowerBound: string;
    upperBound: string;
    confidence: number;
  }>;
  model: string;
  historicalDataPoints: number;
  trend: string;
  generatedAt: string;
}

interface Alert {
  id: number;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  metric_type: string;
  threshold_value: number;
  current_value: number;
  triggered_at: string;
  acknowledged: boolean;
}

interface AnalyticsDashboardProps {
  userRole: 'admin' | 'manager' | 'guide';
  guideId?: string;
  onExport?: (dataType: string, format: string) => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  userRole,
  guideId,
  onExport,
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'tours' | 'guides' | 'revenue' | 'alerts'>('overview');
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [tourPerformance, setTourPerformance] = useState<TourPerformance | null>(null);
  const [guidePerformance, setGuidePerformance] = useState<GuidePerformance | null>(null);
  const [revenueForecast, setRevenueForecast] = useState<RevenueForecast | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch real-time metrics
  const fetchRealTimeMetrics = useCallback(async () => {
    try {
      const response = await axios.get('/api/analytics/realtime');
      if (response.data.success) {
        setRealTimeMetrics(response.data);
      }
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
    }
  }, []);

  // Fetch tour performance
  const fetchTourPerformance = useCallback(async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      } else if (timeRange === '90d') {
        startDate.setDate(startDate.getDate() - 90);
      }

      const response = await axios.get('/api/analytics/tours/performance', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 100,
        },
      });

      if (response.data.success) {
        setTourPerformance(response.data);
      }
    } catch (error) {
      console.error('Error fetching tour performance:', error);
    }
  }, [timeRange]);

  // Fetch guide performance
  const fetchGuidePerformance = useCallback(async () => {
    if (!guideId && userRole !== 'admin') return;

    try {
      const targetGuideId = guideId || 'current_guide';
      const response = await axios.get(`/api/analytics/guides/${targetGuideId}/performance`, {
        params: { timeRange },
      });

      if (response.data.success) {
        setGuidePerformance(response.data);
      }
    } catch (error) {
      console.error('Error fetching guide performance:', error);
    }
  }, [guideId, userRole, timeRange]);

  // Fetch revenue forecast
  const fetchRevenueForecast = useCallback(async () => {
    try {
      const response = await axios.post('/api/analytics/revenue/forecast', {
        daysAhead: 7,
      });

      if (response.data.success) {
        setRevenueForecast(response.data);
      }
    } catch (error) {
      console.error('Error fetching revenue forecast:', error);
    }
  }, []);

  // Fetch active alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await axios.get('/api/analytics/alerts/active');

      if (response.data.success) {
        setAlerts(response.data.alerts);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchRealTimeMetrics(),
        fetchTourPerformance(),
        fetchGuidePerformance(),
        fetchRevenueForecast(),
        fetchAlerts(),
      ]);
      setLoading(false);
    };

    loadData();
  }, [fetchRealTimeMetrics, fetchTourPerformance, fetchGuidePerformance, fetchRevenueForecast, fetchAlerts]);

  // Auto-refresh real-time metrics
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchRealTimeMetrics();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchRealTimeMetrics]);

  // Handle alert acknowledgment
  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await axios.post(`/api/analytics/alerts/${alertId}/acknowledge`, {
        acknowledgedBy: 'current_user',
      });

      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  // Handle data export
  const handleExport = (dataType: string, format: string) => {
    if (onExport) {
      onExport(dataType, format);
    } else {
      // Default export behavior
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      window.location.href = `/api/analytics/export/csv?dataType=${dataType}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
    }
  };

  // Render metric card
  const renderMetricCard = (
    icon: React.ReactNode,
    label: string,
    value: string | number,
    change?: number,
    changeLabel?: string
  ) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="text-gray-500">{icon}</div>
        {change !== undefined && (
          <div className={`flex items-center text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 mr-1 ${change < 0 ? 'transform rotate-180' : ''}`} />
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600 mt-1">{label}</div>
        {changeLabel && (
          <div className="text-xs text-gray-500 mt-1">{changeLabel}</div>
        )}
      </div>
    </div>
  );

  // Render overview tab
  const renderOverview = () => {
    if (!realTimeMetrics) return null;

    return (
      <div className="space-y-6">
        {/* Real-time metrics grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderMetricCard(
            <DollarSign className="w-8 h-8 text-green-600" />,
            'Revenue Today',
            `$${realTimeMetrics.current.revenue.toFixed(2)}`,
            12.5,
            'vs. yesterday'
          )}
          {renderMetricCard(
            <MapPin className="w-8 h-8 text-blue-600" />,
            'Tours Completed',
            realTimeMetrics.current.tours,
            8.3,
            'vs. yesterday'
          )}
          {renderMetricCard(
            <Users className="w-8 h-8 text-purple-600" />,
            'Total Passengers',
            realTimeMetrics.current.passengers,
            15.2,
            'vs. yesterday'
          )}
          {renderMetricCard(
            <Activity className="w-8 h-8 text-orange-600" />,
            'Active Users',
            realTimeMetrics.current.activeUsers,
            -3.5,
            'vs. yesterday'
          )}
          {renderMetricCard(
            <Target className="w-8 h-8 text-indigo-600" />,
            'Conversion Rate',
            `${realTimeMetrics.current.conversionRate}%`,
            2.1,
            'vs. last week'
          )}
          {renderMetricCard(
            <TrendingUp className="w-8 h-8 text-pink-600" />,
            'Avg. Order Value',
            `$${realTimeMetrics.current.averageOrderValue.toFixed(2)}`,
            5.7,
            'vs. last week'
          )}
        </div>

        {/* Hourly revenue chart (simplified visualization) */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            Hourly Revenue Today
          </h3>
          <div className="flex items-end justify-between h-64 space-x-2">
            {realTimeMetrics.hourly.map((data, index) => {
              const maxRevenue = Math.max(...realTimeMetrics.hourly.map(d => d.revenue));
              const height = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;

              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                    style={{ height: `${height}%` }}
                    title={`Hour ${data.hour}: $${data.revenue.toFixed(2)}`}
                  />
                  <div className="text-xs text-gray-600 mt-2">{data.hour}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue forecast */}
        {revenueForecast && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-green-600" />
              7-Day Revenue Forecast
              <span className={`ml-3 text-sm font-normal ${
                revenueForecast.trend === 'increasing' ? 'text-green-600' :
                revenueForecast.trend === 'decreasing' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                Trend: {revenueForecast.trend}
              </span>
            </h3>
            <div className="space-y-3">
              {revenueForecast.forecasts.map((forecast, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-600" />
                    <span className="text-sm font-medium">{forecast.date}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      ${forecast.lowerBound} - ${forecast.upperBound}
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      ${forecast.predictedRevenue}
                    </span>
                    <span className="text-xs text-gray-500">
                      {(forecast.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Model: {revenueForecast.model} | Based on {revenueForecast.historicalDataPoints} data points
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render tours tab
  const renderTours = () => {
    if (!tourPerformance) return null;

    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {renderMetricCard(
            <MapPin className="w-6 h-6 text-blue-600" />,
            'Total Tours',
            tourPerformance.summary.totalTours
          )}
          {renderMetricCard(
            <DollarSign className="w-6 h-6 text-green-600" />,
            'Total Revenue',
            `$${tourPerformance.summary.totalRevenue.toFixed(2)}`
          )}
          {renderMetricCard(
            <Users className="w-6 h-6 text-purple-600" />,
            'Total Passengers',
            tourPerformance.summary.totalPassengers
          )}
          {renderMetricCard(
            <Star className="w-6 h-6 text-yellow-600" />,
            'Avg. Rating',
            tourPerformance.summary.averageRating
          )}
          {renderMetricCard(
            <Clock className="w-6 h-6 text-orange-600" />,
            'Avg. Duration',
            `${tourPerformance.summary.averageDuration} min`
          )}
          {renderMetricCard(
            <TrendingUp className="w-6 h-6 text-indigo-600" />,
            'Avg. Revenue/Tour',
            `$${tourPerformance.summary.averageRevenuePerTour}`
          )}
        </div>

        {/* Tours table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
              <span className="flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                Recent Tours
              </span>
              <button
                onClick={() => handleExport('tours', 'csv')}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tour ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guide
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Passengers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tourPerformance.tours.slice(0, 20).map((tour) => (
                  <tr key={tour.tour_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tour.tour_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tour.route_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tour.guide_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tour.passengers_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ${parseFloat(tour.revenue).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                        {parseFloat(tour.rating).toFixed(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        tour.status === 'completed' ? 'bg-green-100 text-green-800' :
                        tour.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {tour.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render guides tab
  const renderGuides = () => {
    if (!guidePerformance) return null;

    return (
      <div className="space-y-6">
        {/* Guide summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-yellow-600" />
            Guide Performance - {guidePerformance.guideId}
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {guidePerformance.summary.totalTours}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Tours</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">
                ${guidePerformance.summary.totalRevenue.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Revenue</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-600">
                {guidePerformance.summary.averageRating}
              </div>
              <div className="text-sm text-gray-600 mt-1">Average Rating</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">
                {guidePerformance.summary.efficiencyScore}
              </div>
              <div className="text-sm text-gray-600 mt-1">Efficiency Score</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Total Passengers</div>
              <div className="text-xl font-semibold text-gray-900 mt-1">
                {guidePerformance.summary.totalPassengers}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Hours Worked</div>
              <div className="text-xl font-semibold text-gray-900 mt-1">
                {guidePerformance.summary.hoursWorked}
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded">
              <div className="text-sm text-gray-600">Excellent Tours</div>
              <div className="text-xl font-semibold text-green-600 mt-1">
                {guidePerformance.summary.excellentToursRate}%
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded">
              <div className="text-sm text-gray-600">Poor Tours</div>
              <div className="text-xl font-semibold text-red-600 mt-1">
                {guidePerformance.summary.poorToursRate}%
              </div>
            </div>
          </div>
        </div>

        {/* Daily breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Passengers</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {guidePerformance.dailyBreakdown.map((day, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(day.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {day.tours}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ${parseFloat(day.revenue).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                        {parseFloat(day.avg_rating).toFixed(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {day.passengers}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render alerts tab
  const renderAlerts = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
          Active Alerts ({alerts.length})
        </h3>

        {alerts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No active alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'critical' ? 'border-red-600 bg-red-50' :
                  alert.severity === 'warning' ? 'border-yellow-600 bg-yellow-50' :
                  'border-blue-600 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <AlertTriangle className={`w-5 h-5 mr-2 ${
                        alert.severity === 'critical' ? 'text-red-600' :
                        alert.severity === 'warning' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                      <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                      <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                        alert.severity === 'critical' ? 'bg-red-200 text-red-800' :
                        alert.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">{alert.message}</p>
                    {alert.metric_type && (
                      <div className="text-xs text-gray-600 mt-2">
                        Metric: {alert.metric_type} | 
                        Threshold: {alert.threshold_value} | 
                        Current: {alert.current_value}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(alert.triggered_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                    className="ml-4 px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time insights and performance metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Time range selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>

            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg flex items-center ${
                autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-refresh
            </button>

            {/* Manual refresh */}
            <button
              onClick={fetchRealTimeMetrics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {['overview', 'tours', 'guides', 'alerts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                selectedTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'tours' && renderTours()}
        {selectedTab === 'guides' && renderGuides()}
        {selectedTab === 'alerts' && renderAlerts()}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
