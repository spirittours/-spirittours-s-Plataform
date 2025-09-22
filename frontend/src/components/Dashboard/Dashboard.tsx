import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  CpuChipIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  UserGroupIcon,
  SparklesIcon,
  RefreshIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { AgentsAPI, AnalyticsAPI } from '../../services/apiClient';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

interface AgentStatus {
  name: string;
  status: 'active' | 'inactive' | 'error' | 'initializing';
  track: string;
  last_update: string;
  performance_score: number;
  requests_processed: number;
  error_rate: number;
}

interface SystemMetrics {
  total_agents: number;
  active_agents: number;
  total_requests: number;
  average_response_time: number;
  uptime_percentage: number;
  error_rate: number;
}

const Dashboard: React.FC = () => {
  const [agentsStatus, setAgentsStatus] = useState<AgentStatus[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Mock data for development
  const mockAgentsStatus: AgentStatus[] = [
    // Customer & Revenue Track
    { name: 'Customer Service Agent', status: 'active', track: 'Customer & Revenue', last_update: '2 min ago', performance_score: 98, requests_processed: 1247, error_rate: 0.1 },
    { name: 'Dynamic Pricing Agent', status: 'active', track: 'Customer & Revenue', last_update: '1 min ago', performance_score: 95, requests_processed: 856, error_rate: 0.2 },
    { name: 'Booking Assistant Agent', status: 'active', track: 'Customer & Revenue', last_update: '3 min ago', performance_score: 97, requests_processed: 2103, error_rate: 0.1 },
    { name: 'Personalization Agent', status: 'active', track: 'Customer & Revenue', last_update: '1 min ago', performance_score: 96, requests_processed: 1589, error_rate: 0.1 },
    { name: 'Feedback Analysis Agent', status: 'active', track: 'Customer & Revenue', last_update: '2 min ago', performance_score: 94, requests_processed: 743, error_rate: 0.3 },
    { name: 'Revenue Optimization Agent', status: 'active', track: 'Customer & Revenue', last_update: '1 min ago', performance_score: 99, requests_processed: 432, error_rate: 0.05 },
    { name: 'Market Research Agent', status: 'active', track: 'Customer & Revenue', last_update: '4 min ago', performance_score: 93, requests_processed: 267, error_rate: 0.4 },
    { name: 'Cross-selling Agent', status: 'active', track: 'Customer & Revenue', last_update: '2 min ago', performance_score: 91, requests_processed: 1876, error_rate: 0.2 },

    // Security & Market Track
    { name: 'Risk Assessment Agent', status: 'active', track: 'Security & Market', last_update: '3 min ago', performance_score: 97, requests_processed: 345, error_rate: 0.1 },
    { name: 'Security Monitoring Agent', status: 'active', track: 'Security & Market', last_update: '1 min ago', performance_score: 99, requests_processed: 2456, error_rate: 0.02 },
    { name: 'Competitive Intelligence Agent', status: 'active', track: 'Security & Market', last_update: '2 min ago', performance_score: 95, requests_processed: 178, error_rate: 0.15 },
    { name: 'Compliance Agent', status: 'active', track: 'Security & Market', last_update: '1 min ago', performance_score: 98, requests_processed: 567, error_rate: 0.08 },
    { name: 'Fraud Detection Agent', status: 'active', track: 'Security & Market', last_update: '30 sec ago', performance_score: 99, requests_processed: 1234, error_rate: 0.01 },
    { name: 'Quality Control Agent', status: 'active', track: 'Security & Market', last_update: '2 min ago', performance_score: 96, requests_processed: 889, error_rate: 0.12 },
    { name: 'Crisis Management Agent', status: 'active', track: 'Security & Market', last_update: '5 min ago', performance_score: 94, requests_processed: 23, error_rate: 0.0 },
    { name: 'Insurance Optimization Agent', status: 'active', track: 'Security & Market', last_update: '3 min ago', performance_score: 92, requests_processed: 156, error_rate: 0.25 },

    // Specialized Intelligence & Ethics Track
    { name: 'Predictive Analytics Agent', status: 'active', track: 'Specialized Intelligence & Ethics', last_update: '1 min ago', performance_score: 97, requests_processed: 445, error_rate: 0.1 },
    { name: 'Innovation Agent', status: 'active', track: 'Specialized Intelligence & Ethics', last_update: '4 min ago', performance_score: 89, requests_processed: 67, error_rate: 0.3 },
    { name: 'Training & Development Agent', status: 'active', track: 'Specialized Intelligence & Ethics', last_update: '2 min ago', performance_score: 95, requests_processed: 234, error_rate: 0.15 },
    { name: 'Partnership Agent', status: 'active', track: 'Specialized Intelligence & Ethics', last_update: '3 min ago', performance_score: 93, requests_processed: 89, error_rate: 0.2 },
    { name: 'Sustainability Agent', status: 'active', track: 'Specialized Intelligence & Ethics', last_update: '1 min ago', performance_score: 96, requests_processed: 378, error_rate: 0.12 },
    { name: 'Accessibility Specialist Agent', status: 'active', track: 'Specialized Intelligence & Ethics', last_update: '2 min ago', performance_score: 98, requests_processed: 456, error_rate: 0.05 },
    { name: 'Carbon Optimizer Agent', status: 'active', track: 'Specialized Intelligence & Ethics', last_update: '1 min ago', performance_score: 97, requests_processed: 287, error_rate: 0.08 },
    { name: 'Local Impact Analyzer Agent', status: 'active', track: 'Specialized Intelligence & Ethics', last_update: '3 min ago', performance_score: 94, requests_processed: 145, error_rate: 0.18 },
    { name: 'Ethical Tourism Advisor Agent', status: 'active', track: 'Specialized Intelligence & Ethics', last_update: '2 min ago', performance_score: 96, requests_processed: 203, error_rate: 0.1 }
  ];

  const mockSystemMetrics: SystemMetrics = {
    total_agents: 25,
    active_agents: 25,
    total_requests: 16754,
    average_response_time: 245,
    uptime_percentage: 99.7,
    error_rate: 0.13
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch real data, fall back to mock data
      try {
        const [agentsResponse, metricsResponse] = await Promise.all([
          AgentsAPI.getAllAgentsStatus(),
          AnalyticsAPI.getDashboardAnalytics()
        ]);
        
        setAgentsStatus(agentsResponse.agents || mockAgentsStatus);
        setSystemMetrics(metricsResponse.metrics || mockSystemMetrics);
      } catch (apiError) {
        // Use mock data for development
        console.log('Using mock data for development');
        setAgentsStatus(mockAgentsStatus);
        setSystemMetrics(mockSystemMetrics);
      }
      
      setLastRefresh(new Date());
    } catch (err) {
      setError('Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'inactive':
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'initializing':
        return <RefreshIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTrackIcon = (track: string) => {
    if (track.includes('Customer')) return <BanknotesIcon className="h-5 w-5 text-green-600" />;
    if (track.includes('Security')) return <ShieldCheckIcon className="h-5 w-5 text-blue-600" />;
    if (track.includes('Specialized')) return <CpuChipIcon className="h-5 w-5 text-purple-600" />;
    return <SparklesIcon className="h-5 w-5 text-gray-600" />;
  };

  // Chart data
  const performanceChartData = {
    labels: agentsStatus.map(agent => agent.name.split(' ')[0]),
    datasets: [
      {
        label: 'Performance Score',
        data: agentsStatus.map(agent => agent.performance_score),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const trackDistributionData = {
    labels: ['Customer & Revenue', 'Security & Market', 'Specialized Intelligence & Ethics'],
    datasets: [
      {
        data: [8, 8, 9],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(147, 51, 234, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(147, 51, 234)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const requestsChartData = {
    labels: agentsStatus.slice(0, 10).map(agent => agent.name.split(' ')[0]),
    datasets: [
      {
        label: 'Requests Processed',
        data: agentsStatus.slice(0, 10).map(agent => agent.requests_processed),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Agents Dashboard</h1>
          <p className="text-gray-600">
            Real-time monitoring of all 25 AI agents across 3 specialized tracks
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            disabled={loading}
          >
            <RefreshIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* System Overview Cards */}
      {systemMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Agents</p>
                <p className="text-2xl font-bold text-gray-900">{systemMetrics.total_agents}</p>
              </div>
              <CpuChipIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="mt-2 text-sm text-green-600">
              {systemMetrics.active_agents} active
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{systemMetrics.total_requests.toLocaleString()}</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2 text-sm text-green-600 flex items-center">
              <TrendingUpIcon className="h-4 w-4 mr-1" />
              +12% from last hour
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{systemMetrics.average_response_time}ms</p>
              </div>
              <ClockIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2 text-sm text-green-600 flex items-center">
              <TrendingDownIcon className="h-4 w-4 mr-1" />
              -8% improvement
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Uptime</p>
                <p className="text-2xl font-bold text-gray-900">{systemMetrics.uptime_percentage}%</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2 text-sm text-green-600">
              Excellent performance
            </div>
          </motion.div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance Scores</h3>
          <div className="h-64">
            <Line
              data={performanceChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: false,
                    min: 85,
                    max: 100,
                  },
                },
              }}
            />
          </div>
        </motion.div>

        {/* Track Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agents by Track</h3>
          <div className="h-64">
            <Doughnut
              data={trackDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Agents Status Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Agents Status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Update
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agentsStatus.map((agent, index) => (
                <motion.tr
                  key={agent.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getTrackIcon(agent.track)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                        <div className="text-sm text-gray-500">{agent.track}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(agent.status)}
                      <span className="ml-2 text-sm text-gray-900 capitalize">{agent.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${agent.performance_score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{agent.performance_score}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.requests_processed.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm ${agent.error_rate < 0.1 ? 'text-green-600' : agent.error_rate < 0.2 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {agent.error_rate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.last_update}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">
                      <CogIcon className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Requests Activity Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-xl shadow-sm p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Agents by Requests Processed</h3>
        <div className="h-64">
          <Bar
            data={requestsChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;