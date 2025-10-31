import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  DocumentCheckIcon,
  BuildingOfficeIcon,
  EyeIcon,
  SpeakerWaveIcon,
  BrainIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { AccessibilityAssessment } from '../types';
import aiAgentsService from '../../../services/aiAgentsService';
import toast from 'react-hot-toast';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

interface AccessibilityFeatureProps {
  title: string;
  features: any;
  icon: React.ReactNode;
  color: string;
}

const AccessibilityFeatureCard: React.FC<AccessibilityFeatureProps> = ({
  title,
  features,
  icon,
  color
}) => {
  const getFeatureStatus = (value: boolean) => {
    return value ? (
      <CheckCircleIcon className="w-5 h-5 text-green-500" />
    ) : (
      <XCircleIcon className="w-5 h-5 text-red-500" />
    );
  };

  const featuresList = Object.entries(features).filter(
    ([key, _]) => key !== 'score'
  );

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="w-16 h-16">
          <CircularProgressbar
            value={features.score || 0}
            text={`${Math.round(features.score || 0)}%`}
            styles={buildStyles({
              textSize: '24px',
              pathColor: features.score > 70 ? '#10b981' : features.score > 40 ? '#f59e0b' : '#ef4444',
              textColor: '#1f2937',
              trailColor: '#e5e7eb'
            })}
          />
        </div>
      </div>

      <div className="space-y-2">
        {featuresList.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-600">
              {key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </span>
            {getFeatureStatus(value as boolean)}
          </div>
        ))}
      </div>
    </div>
  );
};

const AccessibilitySpecialist: React.FC = () => {
  const [destinationId, setDestinationId] = useState('');
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);
  const [assessmentData, setAssessmentData] = useState<AccessibilityAssessment | null>(null);
  const [isCreatingItinerary, setIsCreatingItinerary] = useState(false);

  const requirementOptions = [
    'Wheelchair Access',
    'Visual Impairment',
    'Hearing Impairment',
    'Cognitive Disabilities',
    'Elderly Assistance',
    'Service Animals',
    'Sign Language',
    'Braille Materials'
  ];

  const assessMutation = useMutation({
    mutationFn: async (data: { destinationId: string; requirements: string[] }) => {
      const response = await aiAgentsService.assessAccessibility(
        data.destinationId,
        data.requirements
      );
      if (response.status === 'error') {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (data) => {
      setAssessmentData(data);
      toast.success('Accessibility assessment completed successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Assessment failed: ${error.message}`);
    }
  });

  const createItineraryMutation = useMutation({
    mutationFn: async (requirements: any) => {
      const response = await aiAgentsService.createAccessibleItinerary(requirements);
      if (response.status === 'error') {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Accessible itinerary created!');
      setIsCreatingItinerary(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create itinerary: ${error.message}`);
      setIsCreatingItinerary(false);
    }
  });

  const handleAssessment = () => {
    if (!destinationId) {
      toast.error('Please enter a destination ID');
      return;
    }
    assessMutation.mutate({ destinationId, requirements: selectedRequirements });
  };

  const handleCreateItinerary = () => {
    setIsCreatingItinerary(true);
    createItineraryMutation.mutate({
      destination_id: destinationId,
      accessibility_level: 'high',
      requirements: selectedRequirements
    });
  };

  const toggleRequirement = (requirement: string) => {
    setSelectedRequirements(prev =>
      prev.includes(requirement)
        ? prev.filter(r => r !== requirement)
        : [...prev, requirement]
    );
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const exportReport = () => {
    if (!assessmentData) return;
    
    const report = JSON.stringify(assessmentData, null, 2);
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `accessibility-assessment-${destinationId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500 bg-opacity-10 rounded-xl">
                <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Accessibility Specialist AI
                </h1>
                <p className="text-gray-600 mt-1">
                  WCAG compliance and universal accessibility assessment
                </p>
              </div>
            </div>
            {assessmentData && (
              <button
                onClick={exportReport}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                <span>Export Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Assessment Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Assessment Configuration
              </h2>

              {/* Destination Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination/Venue ID
                </label>
                <input
                  type="text"
                  value={destinationId}
                  onChange={(e) => setDestinationId(e.target.value)}
                  placeholder="e.g., madrid_hotel_001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Requirements Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accessibility Requirements
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {requirementOptions.map((req) => (
                    <label
                      key={req}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRequirements.includes(req)}
                        onChange={() => toggleRequirement(req)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{req}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleAssessment}
                  disabled={assessMutation.isPending}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {assessMutation.isPending ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      <span>Assessing...</span>
                    </>
                  ) : (
                    <>
                      <DocumentCheckIcon className="w-5 h-5" />
                      <span>Assess Accessibility</span>
                    </>
                  )}
                </button>

                {assessmentData && (
                  <button
                    onClick={handleCreateItinerary}
                    disabled={isCreatingItinerary}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreatingItinerary ? (
                      <>
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <DocumentCheckIcon className="w-5 h-5" />
                        <span>Create Accessible Itinerary</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {assessmentData ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Overall Score */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Overall Accessibility Score
                      </h2>
                      <p className="text-gray-600 mt-1">
                        Assessment ID: {assessmentData.assessment_id}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-5xl font-bold text-blue-600">
                        {assessmentData.overall_score}%
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {assessmentData.certification_status}
                      </p>
                    </div>
                  </div>

                  {/* WCAG Compliance */}
                  <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Level A</p>
                      <p className={`text-2xl font-bold ${getComplianceColor(assessmentData.wcag_compliance.level_a)}`}>
                        {assessmentData.wcag_compliance.level_a}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Level AA</p>
                      <p className={`text-2xl font-bold ${getComplianceColor(assessmentData.wcag_compliance.level_aa)}`}>
                        {assessmentData.wcag_compliance.level_aa}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Level AAA</p>
                      <p className={`text-2xl font-bold ${getComplianceColor(assessmentData.wcag_compliance.level_aaa)}`}>
                        {assessmentData.wcag_compliance.level_aaa}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Accessibility Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AccessibilityFeatureCard
                    title="Physical Accessibility"
                    features={assessmentData.accessibility_features.physical}
                    icon={<BuildingOfficeIcon className="w-6 h-6 text-blue-600" />}
                    color="bg-blue-500"
                  />
                  <AccessibilityFeatureCard
                    title="Visual Accessibility"
                    features={assessmentData.accessibility_features.visual}
                    icon={<EyeIcon className="w-6 h-6 text-green-600" />}
                    color="bg-green-500"
                  />
                  <AccessibilityFeatureCard
                    title="Hearing Accessibility"
                    features={assessmentData.accessibility_features.hearing}
                    icon={<SpeakerWaveIcon className="w-6 h-6 text-purple-600" />}
                    color="bg-purple-500"
                  />
                  <AccessibilityFeatureCard
                    title="Cognitive Accessibility"
                    features={assessmentData.accessibility_features.cognitive}
                    icon={<BrainIcon className="w-6 h-6 text-orange-600" />}
                    color="bg-orange-500"
                  />
                </div>

                {/* Recommendations */}
                {assessmentData.recommendations.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Improvement Recommendations
                    </h3>
                    <div className="space-y-3">
                      {assessmentData.recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-shrink-0">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              rec.priority === 'high' ? 'bg-red-500' :
                              rec.priority === 'medium' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900">
                                {rec.recommendation}
                              </h4>
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                                rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {rec.priority} priority
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              <span className="font-medium">Cost:</span> {rec.estimated_cost} • 
                              <span className="font-medium ml-2">Time:</span> {rec.implementation_time} • 
                              <span className="font-medium ml-2">Impact:</span> {rec.impact_score}/10
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last Audit Date */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <InformationCircleIcon className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-blue-800">
                      Last accessibility audit: {new Date(assessmentData.last_audit_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  No Assessment Data Yet
                </h3>
                <p className="text-gray-600">
                  Enter a destination ID and click "Assess Accessibility" to begin
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AccessibilitySpecialist;