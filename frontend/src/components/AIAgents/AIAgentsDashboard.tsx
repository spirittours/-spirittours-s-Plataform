import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tab } from '@headlessui/react';
import {
  ChartBarIcon,
  CpuChipIcon,
  SparklesIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  BeakerIcon,
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { 
  AGENTS_CONFIG, 
  AgentTrack, 
  AIAgent, 
  getAgentsByTrack,
  getAgentColor,
  getAgentGradient,
  AgentStatus
} from './types';
import aiAgentsService from '../../services/aiAgentsService';
import toast from 'react-hot-toast';

interface AgentCardProps {
  agent: AIAgent;
  onClick: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onClick }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [agent.id]);

  const loadMetrics = async () => {
    try {
      const response = await aiAgentsService.getAgentMetrics(agent.id, 'hourly');
      if (response.status === 'success') {
        setMetrics(response.data);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const getStatusIcon = () => {
    switch (agent.status) {
      case AgentStatus.ACTIVE:
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case AgentStatus.PROCESSING:
        return <ClockIcon className="w-5 h-5 text-yellow-500 animate-spin" />;
      case AgentStatus.ERROR:
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case AgentStatus.MAINTENANCE:
        return <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <div className="w-5 h-5 bg-gray-300 rounded-full" />;
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-xl bg-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Gradient Header */}
      <div className={`h-2 bg-gradient-to-r ${getAgentGradient(agent)}`} />
      
      <div className="p-6">
        {/* Agent Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${getAgentColor(agent)} bg-opacity-10`}>
              <span className="text-2xl">{agent.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
              <p className="text-sm text-gray-500">{agent.track.replace(/_/g, ' ')}</p>
            </div>
          </div>
          {getStatusIcon()}
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {agent.description}
        </p>

        {/* Capabilities */}
        <div className="flex flex-wrap gap-2 mb-4">
          {agent.capabilities.slice(0, 3).map((cap, idx) => (
            <span
              key={idx}
              className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
            >
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 3 && (
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
              +{agent.capabilities.length - 3} more
            </span>
          )}
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {metrics.requestsProcessed || 0}
              </div>
              <div className="text-xs text-gray-500">Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {metrics.avgResponseTime || 0}ms
              </div>
              <div className="text-xs text-gray-500">Avg Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics.successRate || 0}%
              </div>
              <div className="text-xs text-gray-500">Success</div>
            </div>
          </div>
        )}

        {/* Status Bar */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Performance</span>
            <span className="text-xs font-medium text-gray-900">
              {metrics?.performanceScore || 'N/A'}%
            </span>
          </div>
          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full bg-gradient-to-r ${getAgentGradient(agent)}`}
              style={{ width: `${metrics?.performanceScore || 0}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AIAgentsDashboard: React.FC = () => {
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | 'all'>('all');
  const [overallMetrics, setOverallMetrics] = useState<any>(null);

  const tracks = [
    {
      id: AgentTrack.TRACK_1,
      name: 'Customer & Revenue Excellence',
      icon: <ArrowTrendingUpIcon className="w-5 h-5" />,
      description: 'Optimize customer experience and maximize revenue',
      color: 'blue'
    },
    {
      id: AgentTrack.TRACK_2,
      name: 'Security & Market Intelligence',
      icon: <ShieldCheckIcon className="w-5 h-5" />,
      description: 'Ensure security and expand market reach',
      color: 'purple'
    },
    {
      id: AgentTrack.TRACK_3,
      name: 'Ethics & Sustainability',
      icon: <GlobeAltIcon className="w-5 h-5" />,
      description: 'Promote ethical and sustainable tourism',
      color: 'green'
    }
  ];

  useEffect(() => {
    loadOverallMetrics();
    const interval = setInterval(loadOverallMetrics, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadOverallMetrics = async () => {
    try {
      const response = await aiAgentsService.getAllAgentsStatus();
      if (response.status === 'success') {
        setOverallMetrics(response.data);
      }
    } catch (error) {
      console.error('Error loading overall metrics:', error);
    }
  };

  const getFilteredAgents = (track: AgentTrack) => {
    let agents = getAgentsByTrack(track);
    
    // Apply status filter
    if (statusFilter !== 'all') {
      agents = agents.filter(a => a.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      agents = agents.filter(a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.capabilities.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return agents;
  };

  const handleAgentClick = (agent: AIAgent) => {
    setSelectedAgent(agent);
    // Navigate to agent detail page
    window.location.href = `/ai-agents/${agent.id}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <CpuChipIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  AI Agents Command Center
                </h1>
                <p className="text-gray-600 mt-1">
                  25 Specialized AI Agents at Your Service
                </p>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AgentStatus | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value={AgentStatus.ACTIVE}>Active</option>
                <option value={AgentStatus.INACTIVE}>Inactive</option>
                <option value={AgentStatus.PROCESSING}>Processing</option>
                <option value={AgentStatus.ERROR}>Error</option>
                <option value={AgentStatus.MAINTENANCE}>Maintenance</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Agents</p>
                <p className="text-3xl font-bold text-gray-900">21/25</p>
              </div>
              <CheckCircleIcon className="w-10 h-10 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Requests</p>
                <p className="text-3xl font-bold text-gray-900">15.2K</p>
              </div>
              <ChartBarIcon className="w-10 h-10 text-blue-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response</p>
                <p className="text-3xl font-bold text-gray-900">124ms</p>
              </div>
              <ClockIcon className="w-10 h-10 text-purple-500" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-md p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-green-600">98.5%</p>
              </div>
              <SparklesIcon className="w-10 h-10 text-yellow-500" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tracks Tab */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Tab.Group selectedIndex={selectedTrack} onChange={setSelectedTrack}>
          <Tab.List className="flex space-x-2 rounded-xl bg-white/20 p-1 backdrop-blur-lg">
            {tracks.map((track, idx) => (
              <Tab
                key={track.id}
                className={({ selected }) =>
                  `w-full rounded-lg py-3 px-4 text-sm font-medium leading-5 transition-all
                  ${selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-gray-700 hover:bg-white/[0.5] hover:text-gray-900'
                  }`
                }
              >
                <div className="flex items-center justify-center space-x-2">
                  {track.icon}
                  <span>{track.name}</span>
                </div>
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels className="mt-6">
            <AnimatePresence mode="wait">
              {tracks.map((track, idx) => (
                <Tab.Panel
                  key={track.id}
                  className="focus:outline-none"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Track Description */}
                    <div className="mb-6 p-4 bg-white rounded-xl shadow-md">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {track.name}
                      </h2>
                      <p className="text-gray-600 mt-1">
                        {track.description}
                      </p>
                    </div>

                    {/* Agents Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getFilteredAgents(track.id).map((agent) => (
                        <AgentCard
                          key={agent.id}
                          agent={agent}
                          onClick={() => handleAgentClick(agent)}
                        />
                      ))}
                    </div>

                    {/* Empty State */}
                    {getFilteredAgents(track.id).length === 0 && (
                      <div className="text-center py-12">
                        <BeakerIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">
                          No agents found
                        </h3>
                        <p className="text-gray-600 mt-2">
                          Try adjusting your search or filter criteria
                        </p>
                      </div>
                    )}
                  </motion.div>
                </Tab.Panel>
              ))}
            </AnimatePresence>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default AIAgentsDashboard;