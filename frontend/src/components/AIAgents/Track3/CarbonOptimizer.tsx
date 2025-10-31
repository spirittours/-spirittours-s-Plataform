import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import {
  GlobeAltIcon,
  FireIcon,
  HomeIcon,
  BeakerIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  CheckBadgeIcon,
  LightBulbIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { CarbonFootprint } from '../types';
import aiAgentsService from '../../../services/aiAgentsService';
import toast from 'react-hot-toast';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const CarbonOptimizer: React.FC = () => {
  const [tripData, setTripData] = useState({
    transport_mode: 'flight_short',
    distance_km: 1000,
    hotel_nights: 3,
    hotel_type: 'standard',
    travelers: 1
  });
  const [carbonData, setCarbonData] = useState<CarbonFootprint | null>(null);
  const [selectedOffset, setSelectedOffset] = useState<number | null>(null);

  const transportModes = [
    { value: 'flight_short', label: 'Short Flight (<1000km)', icon: '✈️' },
    { value: 'flight_long', label: 'Long Flight (>1000km)', icon: '✈️' },
    { value: 'car', label: 'Car', icon: '🚗' },
    { value: 'train', label: 'Train', icon: '🚆' },
    { value: 'bus', label: 'Bus', icon: '🚌' },
    { value: 'cruise', label: 'Cruise Ship', icon: '🚢' }
  ];

  const hotelTypes = [
    { value: 'eco', label: 'Eco-Certified', icon: '🌱' },
    { value: 'standard', label: 'Standard', icon: '🏨' },
    { value: 'luxury', label: 'Luxury', icon: '⭐' }
  ];

  const calculateMutation = useMutation({
    mutationFn: async (data: typeof tripData) => {
      const response = await aiAgentsService.calculateCarbonFootprint(data);
      if (response.status === 'error') {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (data) => {
      setCarbonData(data);
      toast.success('Carbon footprint calculated successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Calculation failed: ${error.message}`);
    }
  });

  const handleCalculate = () => {
    if (tripData.distance_km <= 0) {
      toast.error('Please enter a valid distance');
      return;
    }
    if (tripData.hotel_nights < 0) {
      toast.error('Please enter valid number of nights');
      return;
    }
    if (tripData.travelers <= 0) {
      toast.error('Please enter valid number of travelers');
      return;
    }
    calculateMutation.mutate(tripData);
  };

  const getRatingColor = (rating: string) => {
    if (rating === 'A') return 'text-green-600 bg-green-100';
    if (rating === 'B') return 'text-yellow-600 bg-yellow-100';
    if (rating === 'C') return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getDoughnutChartData = () => {
    if (!carbonData) return null;
    
    const breakdown = carbonData.emissions_breakdown;
    return {
      labels: ['Transport', 'Accommodation', 'Activities'],
      datasets: [{
        data: [
          breakdown.transport.amount_kg_co2,
          breakdown.accommodation.amount_kg_co2,
          breakdown.activities.amount_kg_co2
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(251, 146, 60, 1)'
        ],
        borderWidth: 2
      }]
    };
  };

  const getBarChartData = () => {
    if (!carbonData) return null;
    
    return {
      labels: ['Your Trip', 'Trees Needed', 'Car KM Equivalent', 'Household Days'],
      datasets: [{
        label: 'Carbon Impact',
        data: [
          carbonData.total_emissions_kg_co2,
          carbonData.equivalent_to.trees_needed,
          carbonData.equivalent_to.car_km / 100, // Scale down for visualization
          carbonData.equivalent_to.household_days
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)'
        ]
      }]
    };
  };

  const exportReport = () => {
    if (!carbonData) return;
    
    const report = {
      trip_details: tripData,
      carbon_footprint: carbonData,
      generated_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `carbon-footprint-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-500 bg-opacity-10 rounded-xl">
                <GlobeAltIcon className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Carbon Optimizer AI
                </h1>
                <p className="text-gray-600 mt-1">
                  Calculate and optimize your travel carbon footprint
                </p>
              </div>
            </div>
            {carbonData && (
              <button
                onClick={exportReport}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
                Trip Details
              </h2>

              {/* Transport Mode */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transport Mode
                </label>
                <select
                  value={tripData.transport_mode}
                  onChange={(e) => setTripData({ ...tripData, transport_mode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {transportModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.icon} {mode.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Distance */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distance (km)
                </label>
                <input
                  type="number"
                  value={tripData.distance_km}
                  onChange={(e) => setTripData({ ...tripData, distance_km: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="0"
                />
              </div>

              {/* Hotel Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hotel Type
                </label>
                <select
                  value={tripData.hotel_type}
                  onChange={(e) => setTripData({ ...tripData, hotel_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  {hotelTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hotel Nights */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hotel Nights
                </label>
                <input
                  type="number"
                  value={tripData.hotel_nights}
                  onChange={(e) => setTripData({ ...tripData, hotel_nights: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="0"
                />
              </div>

              {/* Number of Travelers */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Travelers
                </label>
                <input
                  type="number"
                  value={tripData.travelers}
                  onChange={(e) => setTripData({ ...tripData, travelers: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="1"
                />
              </div>

              {/* Calculate Button */}
              <button
                onClick={handleCalculate}
                disabled={calculateMutation.isPending}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {calculateMutation.isPending ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    <span>Calculating...</span>
                  </>
                ) : (
                  <>
                    <BeakerIcon className="w-5 h-5" />
                    <span>Calculate Carbon Footprint</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {carbonData ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Total Emissions Card */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total CO2 */}
                    <div className="text-center">
                      <FireIcon className="w-12 h-12 text-red-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Total Emissions</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {carbonData.total_emissions_kg_co2.toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-500">kg CO₂</p>
                    </div>

                    {/* Per Traveler */}
                    <div className="text-center">
                      <GlobeAltIcon className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Per Traveler</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {carbonData.emissions_per_traveler.toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-500">kg CO₂</p>
                    </div>

                    {/* Sustainability Rating */}
                    <div className="text-center">
                      <CheckBadgeIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Sustainability</p>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full ${getRatingColor(carbonData.sustainability_rating.rating)}`}>
                        <span className="text-2xl font-bold">{carbonData.sustainability_rating.rating}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Score: {carbonData.sustainability_rating.score.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Emissions Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Doughnut Chart */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Emissions Breakdown
                    </h3>
                    {getDoughnutChartData() && (
                      <Doughnut
                        data={getDoughnutChartData()!}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const label = context.label || '';
                                  const value = context.parsed || 0;
                                  return `${label}: ${value.toFixed(1)} kg CO₂`;
                                }
                              }
                            }
                          }
                        }}
                      />
                    )}
                  </div>

                  {/* Equivalents */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Equivalent Impact
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">🌳</span>
                          <span className="text-sm text-gray-700">Trees needed to offset</span>
                        </div>
                        <span className="text-lg font-bold text-green-600">
                          {carbonData.equivalent_to.trees_needed.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">🚗</span>
                          <span className="text-sm text-gray-700">Car kilometers</span>
                        </div>
                        <span className="text-lg font-bold text-blue-600">
                          {carbonData.equivalent_to.car_km.toFixed(0)} km
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">🏠</span>
                          <span className="text-sm text-gray-700">Household days</span>
                        </div>
                        <span className="text-lg font-bold text-purple-600">
                          {carbonData.equivalent_to.household_days.toFixed(0)} days
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Offset Options */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Carbon Offset Options
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {carbonData.offset_options.map((option, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ scale: 1.02 }}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedOffset === idx
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                        onClick={() => setSelectedOffset(idx)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {option.provider}
                          </span>
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                            {option.certification}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{option.project}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-green-600">
                            ${option.cost_usd}
                          </span>
                          <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{option.impact}</p>
                      </motion.div>
                    ))}
                  </div>
                  {selectedOffset !== null && (
                    <button className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      Purchase Offset
                    </button>
                  )}
                </div>

                {/* Reduction Recommendations */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    <LightBulbIcon className="w-6 h-6 inline-block mr-2 text-yellow-500" />
                    Reduction Recommendations
                  </h3>
                  <div className="space-y-3">
                    {carbonData.reduction_recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          rec.difficulty === 'easy' ? 'bg-green-500' :
                          rec.difficulty === 'medium' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{rec.recommendation}</h4>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                            <span>Category: {rec.category}</span>
                            <span>Potential reduction: {rec.potential_reduction}</span>
                            <span className={`px-2 py-1 rounded ${
                              rec.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              rec.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {rec.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <GlobeAltIcon className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Calculate Your Carbon Footprint
                </h3>
                <p className="text-gray-600">
                  Enter your trip details and click "Calculate Carbon Footprint" to see your environmental impact
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CarbonOptimizer;