import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import Dashboard
import AIAgentsDashboard from './AIAgentsDashboard';

// Import Track 3 Agents
import AccessibilitySpecialist from './Track3/AccessibilitySpecialist';
import CarbonOptimizer from './Track3/CarbonOptimizer';
// import LocalImpactAnalyzer from './Track3/LocalImpactAnalyzer';
// import EthicalTourismAdvisor from './Track3/EthicalTourismAdvisor';
// import CrisisManagement from './Track3/CrisisManagement';
// import PersonalizationEngine from './Track3/PersonalizationEngine';
// import CulturalAdaptation from './Track3/CulturalAdaptation';
// import SustainabilityAdvisor from './Track3/SustainabilityAdvisor';
// import WellnessOptimizer from './Track3/WellnessOptimizer';
// import KnowledgeCurator from './Track3/KnowledgeCurator';

// Import Track 1 Agents (Customer & Revenue)
// import ContentMaster from './Track1/ContentMaster';
// import CompetitiveIntel from './Track1/CompetitiveIntel';
// import CustomerProphet from './Track1/CustomerProphet';
// import ExperienceCurator from './Track1/ExperienceCurator';
// import RevenueMaximizer from './Track1/RevenueMaximizer';
// import SocialSentiment from './Track1/SocialSentiment';
// import BookingOptimizer from './Track1/BookingOptimizer';
// import DemandForecaster from './Track1/DemandForecaster';
// import FeedbackAnalyzer from './Track1/FeedbackAnalyzer';
// import MultiChannel from './Track1/MultiChannel';

// Import Track 2 Agents (Security & Market)
// import SecurityGuard from './Track2/SecurityGuard';
// import MarketEntry from './Track2/MarketEntry';
// import InfluencerMatch from './Track2/InfluencerMatch';
// import LuxuryUpsell from './Track2/LuxuryUpsell';
// import RouteGenius from './Track2/RouteGenius';

// Placeholder component for agents not yet implemented
const AgentPlaceholder: React.FC<{ agentName: string }> = ({ agentName }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
    <div className="bg-white rounded-xl shadow-lg p-12 max-w-md text-center">
      <div className="w-24 h-24 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
        <span className="text-4xl">🤖</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        {agentName} AI
      </h2>
      <p className="text-gray-600 mb-6">
        This AI agent interface is currently under development.
      </p>
      <div className="space-y-2">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-3/4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse" />
        </div>
        <p className="text-sm text-gray-500">Implementation in progress...</p>
      </div>
    </div>
  </div>
);

const AIAgentsRouter: React.FC = () => {
  return (
    <Routes>
      {/* Main Dashboard */}
      <Route path="/" element={<AIAgentsDashboard />} />
      <Route path="/dashboard" element={<AIAgentsDashboard />} />

      {/* Track 3: Ethics & Sustainability */}
      <Route path="/accessibility-specialist" element={<AccessibilitySpecialist />} />
      <Route path="/carbon-optimizer" element={<CarbonOptimizer />} />
      <Route path="/local-impact-analyzer" element={<AgentPlaceholder agentName="Local Impact Analyzer" />} />
      <Route path="/ethical-tourism-advisor" element={<AgentPlaceholder agentName="Ethical Tourism Advisor" />} />
      <Route path="/crisis-management" element={<AgentPlaceholder agentName="Crisis Management" />} />
      <Route path="/personalization-engine" element={<AgentPlaceholder agentName="Personalization Engine" />} />
      <Route path="/cultural-adaptation" element={<AgentPlaceholder agentName="Cultural Adaptation" />} />
      <Route path="/sustainability-advisor" element={<AgentPlaceholder agentName="Sustainability Advisor" />} />
      <Route path="/wellness-optimizer" element={<AgentPlaceholder agentName="Wellness Optimizer" />} />
      <Route path="/knowledge-curator" element={<AgentPlaceholder agentName="Knowledge Curator" />} />

      {/* Track 1: Customer & Revenue Excellence */}
      <Route path="/content-master" element={<AgentPlaceholder agentName="Content Master" />} />
      <Route path="/competitive-intel" element={<AgentPlaceholder agentName="Competitive Intel" />} />
      <Route path="/customer-prophet" element={<AgentPlaceholder agentName="Customer Prophet" />} />
      <Route path="/experience-curator" element={<AgentPlaceholder agentName="Experience Curator" />} />
      <Route path="/revenue-maximizer" element={<AgentPlaceholder agentName="Revenue Maximizer" />} />
      <Route path="/social-sentiment" element={<AgentPlaceholder agentName="Social Sentiment" />} />
      <Route path="/booking-optimizer" element={<AgentPlaceholder agentName="Booking Optimizer" />} />
      <Route path="/demand-forecaster" element={<AgentPlaceholder agentName="Demand Forecaster" />} />
      <Route path="/feedback-analyzer" element={<AgentPlaceholder agentName="Feedback Analyzer" />} />
      <Route path="/multi-channel" element={<AgentPlaceholder agentName="Multi-Channel" />} />

      {/* Track 2: Security & Market Intelligence */}
      <Route path="/security-guard" element={<AgentPlaceholder agentName="Security Guard" />} />
      <Route path="/market-entry" element={<AgentPlaceholder agentName="Market Entry" />} />
      <Route path="/influencer-match" element={<AgentPlaceholder agentName="Influencer Match" />} />
      <Route path="/luxury-upsell" element={<AgentPlaceholder agentName="Luxury Upsell" />} />
      <Route path="/route-genius" element={<AgentPlaceholder agentName="Route Genius" />} />

      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/ai-agents" replace />} />
    </Routes>
  );
};

export default AIAgentsRouter;