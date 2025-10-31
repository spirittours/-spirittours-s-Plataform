import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import {
  BuildingOffice2Icon,
  UserGroupIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  ChartBarIcon,
  SparklesIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { LocalImpactAnalysis } from '../types';
import aiAgentsService from '../../../services/aiAgentsService';
import toast from 'react-hot-toast';
import { Radar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale
} from 'chart.js';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale
);

interface ImpactCategoryProps {
  title: string;
  data: any;
  icon: React.ReactNode;
  color: string;
}

const ImpactCategoryCard: React.FC<ImpactCategoryProps> = ({ title, data, icon, color }) => {
  const getTrendIcon = (trend: string) => {
    if (trend === 'positive' || trend === 'improving') {
      return <TrendingUpIcon className="w-5 h-5 text-green-500" />;
    } else if (trend === 'negative' || trend === 'concerning') {
      return <TrendingDownIcon className="w-5 h-5 text-red-500" />;
    }
    return <span className="w-5 h-5 text-gray-400">—</span>;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-2xl font-bold ${getScoreColor(data.score)}`}>
            {data.score.toFixed(1)}
          </span>
          {getTrendIcon(data.trends)}
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(data).map(([key, value]) => {
          if (key === 'score' || key === 'trends') return null;
          return (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </span>
              <span className="font-medium text-gray-900">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LocalImpactAnalyzer: React.FC = () => {
  const [destinationId, setDestinationId] = useState('');
  const [touristVolume, setTouristVolume] = useState(10000);
  const [impactData, setImpactData] = useState<LocalImpactAnalysis | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'stakeholders' | 'recommendations'>('overview');

  const analyzeMutation = useMutation({
    mutationFn: async (data: { destinationId: string; volume: number }) => {
      const response = await aiAgentsService.analyzeLocalImpact(
        data.destinationId,
        data.volume
      );
      if (response.status === 'error') {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (data) => {
      setImpactData(data);
      toast.success('Local impact analysis completed!');
    },
    onError: (error: Error) => {
      toast.error(`Analysis failed: ${error.message}`);
    }
  });

  const handleAnalyze = () => {
    if (!destinationId) {
      toast.error('Please enter a destination');
      return;
    }
    analyzeMutation.mutate({ destinationId, volume: touristVolume });
  };

  const getRadarData = () => {
    if (!impactData) return null;
    
    return {
      labels: ['Economic', 'Social', 'Environmental', 'Cultural'],
      datasets: [{
        label: 'Impact Score',
        data: [
          impactData.impact_assessment.economic.score,
          impactData.impact_assessment.social.score,
          impactData.impact_assessment.environmental.score,
          impactData.impact_assessment.cultural.score
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
      }]
    };
  };

  const getCapacityData = () => {
    if (!impactData) return null;
    
    const current = impactData.community_capacity.current_visitors;
    const optimal = impactData.community_capacity.optimal_capacity;
    const percentage = (current / optimal) * 100;
    
    return {
      current,
      optimal,
      percentage,
      status: percentage > 100 ? 'over-capacity' : percentage > 80 ? 'near-capacity' : 'sustainable'
    };
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-100 text-green-700';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-700';
      case 'high':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const exportReport = () => {
    if (!impactData) return;
    
    const report = {
      analysis: impactData,
      destination: destinationId,
      tourist_volume: touristVolume,
      generated_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `local-impact-${destinationId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-500 bg-opacity-10 rounded-xl">
                <BuildingOffice2Icon className="w-10 h-10 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Local Impact Analyzer AI
                </h1>
                <p className="text-gray-600 mt-1">
                  Community impact assessment and stakeholder benefit analysis
                </p>
              </div>
            </div>
            {impactData && (
              <button
                onClick={exportReport}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                <span>Export Report</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Analysis Parameters
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination
                </label>
                <input
                  type="text"
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  placeholder="e.g., Barcelona, Madrid, Mallorca"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Tourist Volume
                </label>
                <input
                  type="number"
                  value={touristVolume}
                  onChange={(e) => setTouristVolume(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  min="0"
                  step="1000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Estimated annual visitors to the destination
                </p>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <ChartBarIcon className="w-5 h-5" />
                    <span>Analyze Local Impact</span>
                  </>
                )}
              </button>

              {/* Community Capacity Indicator */}
              {impactData && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Community Capacity
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Current: {getCapacityData()?.current.toLocaleString()}</span>
                      <span>Optimal: {getCapacityData()?.optimal.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          getCapacityData()?.status === 'over-capacity' ? 'bg-red-500' :
                          getCapacityData()?.status === 'near-capacity' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(getCapacityData()?.percentage || 0, 100)}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        getRiskColor(impactData.community_capacity.overcrowding_risk)
                      }`}>
                        {impactData.community_capacity.overcrowding_risk} overcrowding risk
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {impactData ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Overall Impact Score */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Overall Impact Assessment
                    </h2>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-orange-600">
                        {impactData.overall_impact_score.toFixed(1)}
                      </div>
                      <p className="text-sm text-gray-600">Impact Score</p>
                    </div>
                  </div>

                  {/* Radar Chart */}
                  {getRadarData() && (
                    <div className="h-64">
                      <Radar
                        data={getRadarData()!}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            r: {
                              beginAtZero: true,
                              max: 100,
                              ticks: {
                                stepSize: 20
                              }
                            }
                          },
                          plugins: {
                            legend: {
                              display: false
                            }
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Sustainable Tourism Index */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">
                        Sustainable Tourism Index
                      </span>
                      <span className="text-xl font-bold text-blue-600">
                        {impactData.sustainable_tourism_index.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="border-b border-gray-200">
                    <div className="flex">
                      {['overview', 'stakeholders', 'recommendations'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setSelectedTab(tab as any)}
                          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            selectedTab === tab
                              ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Overview Tab */}
                    {selectedTab === 'overview' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ImpactCategoryCard
                          title="Economic Impact"
                          data={impactData.impact_assessment.economic}
                          icon={<CurrencyDollarIcon className="w-6 h-6 text-green-600" />}
                          color="bg-green-500"
                        />
                        <ImpactCategoryCard
                          title="Social Impact"
                          data={impactData.impact_assessment.social}
                          icon={<UserGroupIcon className="w-6 h-6 text-blue-600" />}
                          color="bg-blue-500"
                        />
                        <ImpactCategoryCard
                          title="Environmental Impact"
                          data={impactData.impact_assessment.environmental}
                          icon={<GlobeAltIcon className="w-6 h-6 text-emerald-600" />}
                          color="bg-emerald-500"
                        />
                        <ImpactCategoryCard
                          title="Cultural Impact"
                          data={impactData.impact_assessment.cultural}
                          icon={<SparklesIcon className="w-6 h-6 text-purple-600" />}
                          color="bg-purple-500"
                        />
                      </div>
                    )}

                    {/* Stakeholders Tab */}
                    {selectedTab === 'stakeholders' && (
                      <div className="space-y-4">
                        {Object.entries(impactData.stakeholder_benefits).map(([stakeholder, data]) => (
                          <div key={stakeholder} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-900 capitalize">
                                {stakeholder.replace('_', ' ')}
                              </h4>
                              <span className={`px-3 py-1 rounded-full text-sm ${
                                data.benefit_level === 'high' ? 'bg-green-100 text-green-700' :
                                data.benefit_level === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {data.benefit_level} benefit
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-gray-600 mb-2">Main Benefits:</p>
                                <ul className="space-y-1">
                                  {data.main_benefits.map((benefit: string, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-700 flex items-start">
                                      <span className="text-green-500 mr-2">✓</span>
                                      {benefit.replace('_', ' ')}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-600 mb-2">Concerns:</p>
                                <ul className="space-y-1">
                                  {data.concerns.map((concern: string, idx: number) => (
                                    <li key={idx} className="text-sm text-gray-700 flex items-start">
                                      <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                                      {concern.replace('_', ' ')}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recommendations Tab */}
                    {selectedTab === 'recommendations' && (
                      <div className="space-y-3">
                        {impactData.recommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              rec.priority === 'high' ? 'bg-red-500' :
                              rec.priority === 'medium' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-medium text-gray-900">
                                  {rec.recommendation}
                                </h4>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {rec.priority} priority
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Area:</span> {rec.area}
                                </div>
                                <div>
                                  <span className="font-medium">Impact:</span> {rec.expected_impact}
                                </div>
                                <div>
                                  <span className="font-medium">Timeline:</span> {rec.implementation_timeline}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <BuildingOffice2Icon className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Analyze Local Tourism Impact
                </h3>
                <p className="text-gray-600">
                  Enter a destination and tourist volume to assess the local impact of tourism
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LocalImpactAnalyzer;