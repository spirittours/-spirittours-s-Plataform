// AI Agents Types and Interfaces

export enum AgentTrack {
  TRACK_1 = 'track_1_customer_revenue',
  TRACK_2 = 'track_2_security_market',
  TRACK_3 = 'track_3_ethics_sustainability'
}

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PROCESSING = 'processing',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  track: AgentTrack;
  status: AgentStatus;
  icon: string;
  capabilities: string[];
  endpoint: string;
  color: string;
  metrics?: {
    requestsProcessed: number;
    avgResponseTime: number;
    successRate: number;
    lastActive: string;
  };
}

export interface AgentResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  timestamp: string;
  processingTime?: number;
}

// Track 1: Customer & Revenue Excellence
export interface ContentMasterData {
  content_id: string;
  content_type: string;
  title: string;
  content: string;
  seo_optimized: boolean;
  engagement_score: number;
  ai_generated: boolean;
}

export interface CompetitiveIntelData {
  competitor_id: string;
  name: string;
  market_position: number;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface CustomerProphetData {
  customer_id: string;
  predicted_ltv: number;
  churn_probability: number;
  next_purchase_prediction: string;
  recommended_actions: string[];
}

export interface ExperienceCuratorData {
  experience_id: string;
  title: string;
  description: string;
  personalization_score: number;
  customer_segment: string;
  recommendations: any[];
}

export interface RevenueMaximizerData {
  optimization_id: string;
  current_revenue: number;
  optimized_revenue: number;
  improvement_percentage: number;
  recommendations: any[];
}

// Track 2: Security & Market Intelligence
export interface SecurityGuardData {
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  active_threats: number;
  vulnerabilities_found: number;
  security_score: number;
  recommendations: string[];
}

export interface MarketEntryData {
  market_id: string;
  market_name: string;
  opportunity_score: number;
  entry_barriers: string[];
  potential_revenue: number;
  risk_assessment: string;
}

export interface InfluencerMatchData {
  influencer_id: string;
  name: string;
  platform: string;
  followers: number;
  engagement_rate: number;
  match_score: number;
  estimated_roi: number;
}

export interface LuxuryUpsellData {
  upsell_id: string;
  customer_segment: string;
  current_tier: string;
  recommended_tier: string;
  upsell_probability: number;
  potential_value: number;
}

export interface RouteGeniusData {
  route_id: string;
  origin: string;
  destination: string;
  optimized_path: any[];
  time_saved: number;
  cost_saved: number;
  efficiency_score: number;
}

// Track 3: Ethics & Sustainability
export interface AccessibilityAssessment {
  destination_id: string;
  assessment_id: string;
  overall_score: number;
  wcag_compliance: {
    level_a: number;
    level_aa: number;
    level_aaa: number;
  };
  accessibility_features: {
    physical: {
      wheelchair_access: boolean;
      ramps_available: boolean;
      elevator_access: boolean;
      accessible_bathrooms: boolean;
      wide_corridors: boolean;
      score: number;
    };
    visual: {
      braille_signage: boolean;
      audio_guides: boolean;
      high_contrast_signage: boolean;
      guide_dogs_allowed: boolean;
      score: number;
    };
    hearing: {
      hearing_loops: boolean;
      sign_language_support: boolean;
      visual_alerts: boolean;
      written_information: boolean;
      score: number;
    };
    cognitive: {
      simple_navigation: boolean;
      pictogram_signage: boolean;
      quiet_spaces: boolean;
      easy_read_materials: boolean;
      score: number;
    };
  };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    recommendation: string;
    estimated_cost: string;
    implementation_time: string;
    impact_score: number;
  }>;
  certification_status: string;
  last_audit_date: string;
}

export interface CarbonFootprint {
  calculation_id: string;
  total_emissions_kg_co2: number;
  emissions_per_traveler: number;
  emissions_breakdown: {
    transport: {
      amount_kg_co2: number;
      percentage: number;
      mode: string;
      distance_km: number;
    };
    accommodation: {
      amount_kg_co2: number;
      percentage: number;
      type: string;
      nights: number;
    };
    activities: {
      amount_kg_co2: number;
      percentage: number;
    };
  };
  equivalent_to: {
    trees_needed: number;
    car_km: number;
    household_days: number;
  };
  sustainability_rating: {
    rating: string;
    score: number;
    emissions_per_km: number;
    benchmark: string;
  };
  offset_options: Array<{
    provider: string;
    project: string;
    cost_usd: number;
    certification: string;
    impact: string;
  }>;
  reduction_recommendations: Array<{
    category: string;
    recommendation: string;
    potential_reduction: string;
    difficulty: string;
  }>;
}

export interface LocalImpactAnalysis {
  analysis_id: string;
  destination_id: string;
  overall_impact_score: number;
  impact_assessment: {
    economic: {
      score: number;
      local_employment_generated: number;
      small_business_revenue_increase: string;
      tax_revenue_contribution: string;
      economic_multiplier: number;
      trends: string;
    };
    social: {
      score: number;
      community_satisfaction: string;
      cultural_events_supported: number;
      education_programs_funded: number;
      infrastructure_improvements: number;
      trends: string;
    };
    environmental: {
      score: number;
      carbon_footprint_per_visitor: string;
      water_consumption_per_day: string;
      waste_generated_per_visitor: string;
      protected_areas_contribution: string;
      trends: string;
    };
    cultural: {
      score: number;
      heritage_sites_maintained: number;
      traditional_crafts_supported: number;
      language_preservation_programs: number;
      cultural_authenticity_index: number;
      trends: string;
    };
  };
  stakeholder_benefits: {
    local_residents: {
      benefit_level: string;
      main_benefits: string[];
      concerns: string[];
    };
    local_businesses: {
      benefit_level: string;
      main_benefits: string[];
      concerns: string[];
    };
    government: {
      benefit_level: string;
      main_benefits: string[];
      concerns: string[];
    };
  };
  recommendations: Array<{
    priority: string;
    area: string;
    recommendation: string;
    expected_impact: string;
    implementation_timeline: string;
  }>;
  sustainable_tourism_index: number;
  community_capacity: {
    current_visitors: number;
    optimal_capacity: number;
    overcrowding_risk: string;
  };
}

export interface EthicalCompliance {
  evaluation_id: string;
  provider_id: string;
  overall_ethics_score: number;
  certification_status: string;
  compliance_assessment: {
    human_rights: {
      score: number;
      labor_conditions: {
        status: string;
        fair_wages: boolean;
        working_hours_compliance: boolean;
        safety_standards: boolean;
        union_rights: boolean;
      };
      child_protection: {
        status: string;
        zero_child_labor: boolean;
        child_safety_policies: boolean;
        background_checks: boolean;
      };
      certifications: string[];
    };
    animal_welfare: {
      score: number;
      no_captive_animals: boolean;
      wildlife_protection: boolean;
      habitat_conservation: boolean;
      responsible_viewing: boolean;
      certifications: string[];
    };
    cultural_respect: {
      score: number;
      community_consent: boolean;
      fair_representation: boolean;
      benefit_sharing: {
        status: string;
        percentage_to_community: number;
        programs_supported: number;
      };
      cultural_sensitivity_training: boolean;
    };
    environmental_justice: {
      score: number;
      resource_management: string;
      pollution_controls: boolean;
      climate_commitments: {
        carbon_neutral_target: string;
        renewable_energy_use: string;
        offset_programs: boolean;
      };
      local_sourcing: string;
    };
  };
  ethical_highlights: string[];
  areas_for_improvement: Array<{
    area: string;
    issue: string;
    recommendation: string;
    priority: string;
  }>;
  ethical_rating: {
    level: string;
    badge: string;
    description: string;
  };
  recommended_actions: Array<{
    category: string;
    recommendation: string;
    benefits: string;
    timeline: string;
    cost_estimate: string;
  }>;
  compliance_documents: string[];
}

// Other Track 3 agents
export interface CrisisManagementData {
  crisis_id: string;
  threat_level: string;
  active_incidents: number;
  response_plan: any;
  evacuation_routes: any[];
  emergency_contacts: any[];
}

export interface PersonalizationData {
  profile_id: string;
  customer_preferences: any;
  personalization_score: number;
  recommendations: any[];
  engagement_metrics: any;
}

export interface CulturalAdaptationData {
  destination: string;
  cultural_guidelines: string[];
  local_customs: string[];
  language_tips: string[];
  dos_and_donts: any;
}

export interface SustainabilityData {
  sustainability_score: number;
  eco_certifications: string[];
  green_initiatives: any[];
  carbon_offset_programs: any[];
  recommendations: string[];
}

export interface WellnessData {
  wellness_score: number;
  health_recommendations: string[];
  spa_services: any[];
  fitness_activities: any[];
  nutrition_plans: any[];
}

export interface KnowledgeData {
  knowledge_items: any[];
  search_results: any[];
  quality_score: number;
  relevance_score: number;
  sources: string[];
}

// Agent configurations
export const AGENTS_CONFIG: AIAgent[] = [
  // Track 1: Customer & Revenue Excellence (10 agents)
  {
    id: 'content_master',
    name: 'ContentMaster AI',
    description: 'AI-powered content generation and optimization for maximum engagement',
    track: AgentTrack.TRACK_1,
    status: AgentStatus.ACTIVE,
    icon: '✍️',
    color: 'blue',
    capabilities: ['Content Generation', 'SEO Optimization', 'Multi-language', 'A/B Testing'],
    endpoint: '/api/v1/agents/content-master'
  },
  {
    id: 'competitive_intel',
    name: 'CompetitiveIntel AI',
    description: 'Real-time competitive analysis and market positioning insights',
    track: AgentTrack.TRACK_1,
    status: AgentStatus.ACTIVE,
    icon: '🔍',
    color: 'purple',
    capabilities: ['Competitor Analysis', 'Price Monitoring', 'Market Trends', 'SWOT Analysis'],
    endpoint: '/api/v1/agents/competitive-intel'
  },
  {
    id: 'customer_prophet',
    name: 'CustomerProphet AI',
    description: 'Predictive analytics for customer behavior and lifetime value',
    track: AgentTrack.TRACK_1,
    status: AgentStatus.ACTIVE,
    icon: '🔮',
    color: 'indigo',
    capabilities: ['Behavior Prediction', 'Churn Analysis', 'LTV Calculation', 'Segmentation'],
    endpoint: '/api/v1/agents/customer-prophet'
  },
  {
    id: 'experience_curator',
    name: 'ExperienceCurator AI',
    description: 'Personalized travel experience curation based on preferences',
    track: AgentTrack.TRACK_1,
    status: AgentStatus.ACTIVE,
    icon: '🎨',
    color: 'pink',
    capabilities: ['Experience Design', 'Personalization', 'Itinerary Planning', 'Local Insights'],
    endpoint: '/api/v1/agents/experience-curator'
  },
  {
    id: 'revenue_maximizer',
    name: 'RevenueMaximizer AI',
    description: 'Dynamic pricing and revenue optimization strategies',
    track: AgentTrack.TRACK_1,
    status: AgentStatus.ACTIVE,
    icon: '💰',
    color: 'green',
    capabilities: ['Dynamic Pricing', 'Yield Management', 'Upselling', 'Revenue Forecasting'],
    endpoint: '/api/v1/agents/revenue-maximizer'
  },
  {
    id: 'social_sentiment',
    name: 'SocialSentiment AI',
    description: 'Social media sentiment analysis and brand reputation monitoring',
    track: AgentTrack.TRACK_1,
    status: AgentStatus.ACTIVE,
    icon: '💬',
    color: 'cyan',
    capabilities: ['Sentiment Analysis', 'Brand Monitoring', 'Crisis Detection', 'Influencer Tracking'],
    endpoint: '/api/v1/agents/social-sentiment'
  },
  {
    id: 'booking_optimizer',
    name: 'BookingOptimizer AI',
    description: 'Conversion optimization and booking funnel enhancement',
    track: AgentTrack.TRACK_1,
    status: AgentStatus.ACTIVE,
    icon: '📈',
    color: 'orange',
    capabilities: ['Conversion Optimization', 'A/B Testing', 'Funnel Analysis', 'Cart Recovery'],
    endpoint: '/api/v1/agents/booking-optimizer'
  },
  {
    id: 'demand_forecaster',
    name: 'DemandForecaster AI',
    description: 'Demand prediction and capacity planning optimization',
    track: AgentTrack.TRACK_1,
    status: AgentStatus.ACTIVE,
    icon: '📊',
    color: 'teal',
    capabilities: ['Demand Forecasting', 'Seasonality Analysis', 'Capacity Planning', 'Trend Detection'],
    endpoint: '/api/v1/agents/demand-forecaster'
  },
  {
    id: 'feedback_analyzer',
    name: 'FeedbackAnalyzer AI',
    description: 'Customer feedback analysis and actionable insights generation',
    track: AgentTrack.TRACK_1,
    status: AgentStatus.ACTIVE,
    icon: '📝',
    color: 'amber',
    capabilities: ['Review Analysis', 'Sentiment Extraction', 'Topic Modeling', 'Insight Generation'],
    endpoint: '/api/v1/agents/feedback-analyzer'
  },
  {
    id: 'multi_channel',
    name: 'MultiChannel AI',
    description: 'Omnichannel communication and engagement optimization',
    track: AgentTrack.TRACK_1,
    status: AgentStatus.ACTIVE,
    icon: '📱',
    color: 'violet',
    capabilities: ['Channel Integration', 'Message Optimization', 'Cross-channel Analytics', 'Automation'],
    endpoint: '/api/v1/agents/multi-channel'
  },
  
  // Track 2: Security & Market Intelligence (5 agents)
  {
    id: 'security_guard',
    name: 'SecurityGuard AI',
    description: 'Comprehensive security monitoring and threat prevention',
    track: AgentTrack.TRACK_2,
    status: AgentStatus.ACTIVE,
    icon: '🛡️',
    color: 'red',
    capabilities: ['Threat Detection', 'Risk Assessment', 'Fraud Prevention', 'Compliance Monitoring'],
    endpoint: '/api/v1/agents/security-guard'
  },
  {
    id: 'market_entry',
    name: 'MarketEntry AI',
    description: 'Market expansion strategies and entry analysis',
    track: AgentTrack.TRACK_2,
    status: AgentStatus.ACTIVE,
    icon: '🌍',
    color: 'blue',
    capabilities: ['Market Analysis', 'Entry Strategy', 'Risk Evaluation', 'Localization'],
    endpoint: '/api/v1/agents/market-entry'
  },
  {
    id: 'influencer_match',
    name: 'InfluencerMatch AI',
    description: 'Influencer identification and partnership optimization',
    track: AgentTrack.TRACK_2,
    status: AgentStatus.ACTIVE,
    icon: '⭐',
    color: 'yellow',
    capabilities: ['Influencer Discovery', 'ROI Prediction', 'Campaign Management', 'Performance Tracking'],
    endpoint: '/api/v1/agents/influencer-match'
  },
  {
    id: 'luxury_upsell',
    name: 'LuxuryUpsell AI',
    description: 'Premium service upselling and luxury experience optimization',
    track: AgentTrack.TRACK_2,
    status: AgentStatus.ACTIVE,
    icon: '💎',
    color: 'purple',
    capabilities: ['Upselling Strategy', 'VIP Services', 'Premium Packaging', 'Loyalty Programs'],
    endpoint: '/api/v1/agents/luxury-upsell'
  },
  {
    id: 'route_genius',
    name: 'RouteGenius AI',
    description: 'Intelligent route optimization and logistics planning',
    track: AgentTrack.TRACK_2,
    status: AgentStatus.ACTIVE,
    icon: '🗺️',
    color: 'green',
    capabilities: ['Route Optimization', 'Traffic Analysis', 'Cost Reduction', 'Time Savings'],
    endpoint: '/api/v1/agents/route-genius'
  },
  
  // Track 3: Ethics & Sustainability (10 agents)
  {
    id: 'crisis_management',
    name: 'CrisisManagement AI',
    description: 'Crisis detection, response planning, and emergency management',
    track: AgentTrack.TRACK_3,
    status: AgentStatus.ACTIVE,
    icon: '🚨',
    color: 'red',
    capabilities: ['Crisis Detection', 'Emergency Response', 'Risk Mitigation', 'Communication Management'],
    endpoint: '/api/v1/agents/crisis-management'
  },
  {
    id: 'personalization_engine',
    name: 'PersonalizationEngine AI',
    description: 'Advanced ML-powered personalization and recommendation engine',
    track: AgentTrack.TRACK_3,
    status: AgentStatus.ACTIVE,
    icon: '🎯',
    color: 'indigo',
    capabilities: ['ML Personalization', 'Behavior Analysis', 'Dynamic Recommendations', 'Profile Building'],
    endpoint: '/api/v1/agents/personalization-engine'
  },
  {
    id: 'cultural_adaptation',
    name: 'CulturalAdaptation AI',
    description: 'Cultural intelligence and cross-cultural communication optimization',
    track: AgentTrack.TRACK_3,
    status: AgentStatus.ACTIVE,
    icon: '🌏',
    color: 'blue',
    capabilities: ['Cultural Guidelines', 'Language Support', 'Local Customs', 'Cultural Sensitivity'],
    endpoint: '/api/v1/agents/cultural-adaptation'
  },
  {
    id: 'sustainability_advisor',
    name: 'SustainabilityAdvisor AI',
    description: 'Sustainable tourism practices and eco-friendly recommendations',
    track: AgentTrack.TRACK_3,
    status: AgentStatus.ACTIVE,
    icon: '🌱',
    color: 'green',
    capabilities: ['Eco Certification', 'Carbon Tracking', 'Green Initiatives', 'Sustainability Scoring'],
    endpoint: '/api/v1/agents/sustainability-advisor'
  },
  {
    id: 'wellness_optimizer',
    name: 'WellnessOptimizer AI',
    description: 'Health and wellness optimization for travelers',
    track: AgentTrack.TRACK_3,
    status: AgentStatus.ACTIVE,
    icon: '🧘',
    color: 'teal',
    capabilities: ['Health Recommendations', 'Wellness Planning', 'Spa Services', 'Fitness Activities'],
    endpoint: '/api/v1/agents/wellness-optimizer'
  },
  {
    id: 'knowledge_curator',
    name: 'KnowledgeCurator AI',
    description: 'Intelligent knowledge management and information curation',
    track: AgentTrack.TRACK_3,
    status: AgentStatus.ACTIVE,
    icon: '📚',
    color: 'purple',
    capabilities: ['Knowledge Management', 'Content Curation', 'Smart Search', 'Quality Assessment'],
    endpoint: '/api/v1/agents/knowledge-curator'
  },
  {
    id: 'accessibility_specialist',
    name: 'AccessibilitySpecialist AI',
    description: 'WCAG compliance and universal accessibility assessment',
    track: AgentTrack.TRACK_3,
    status: AgentStatus.ACTIVE,
    icon: '♿',
    color: 'blue',
    capabilities: ['WCAG Compliance', 'Accessibility Audit', 'Universal Design', 'Adaptive Solutions'],
    endpoint: '/api/v1/agents/accessibility-specialist'
  },
  {
    id: 'carbon_optimizer',
    name: 'CarbonOptimizer AI',
    description: 'Carbon footprint calculation and emission reduction strategies',
    track: AgentTrack.TRACK_3,
    status: AgentStatus.ACTIVE,
    icon: '🌍',
    color: 'green',
    capabilities: ['Carbon Calculation', 'Offset Options', 'Emission Reduction', 'Sustainability Rating'],
    endpoint: '/api/v1/agents/carbon-optimizer'
  },
  {
    id: 'local_impact_analyzer',
    name: 'LocalImpactAnalyzer AI',
    description: 'Community impact assessment and stakeholder benefit analysis',
    track: AgentTrack.TRACK_3,
    status: AgentStatus.ACTIVE,
    icon: '🏘️',
    color: 'orange',
    capabilities: ['Impact Assessment', 'Community Benefits', 'Economic Analysis', 'Social Metrics'],
    endpoint: '/api/v1/agents/local-impact-analyzer'
  },
  {
    id: 'ethical_tourism_advisor',
    name: 'EthicalTourismAdvisor AI',
    description: 'Ethical compliance evaluation and responsible tourism guidance',
    track: AgentTrack.TRACK_3,
    status: AgentStatus.ACTIVE,
    icon: '⚖️',
    color: 'purple',
    capabilities: ['Ethics Evaluation', 'Human Rights', 'Animal Welfare', 'Fair Trade'],
    endpoint: '/api/v1/agents/ethical-tourism-advisor'
  }
];

// Helper functions
export const getAgentById = (id: string): AIAgent | undefined => {
  return AGENTS_CONFIG.find(agent => agent.id === id);
};

export const getAgentsByTrack = (track: AgentTrack): AIAgent[] => {
  return AGENTS_CONFIG.filter(agent => agent.track === track);
};

export const getActiveAgents = (): AIAgent[] => {
  return AGENTS_CONFIG.filter(agent => agent.status === AgentStatus.ACTIVE);
};

export const getAgentColor = (agent: AIAgent): string => {
  const colors: { [key: string]: string } = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    teal: 'bg-teal-500',
    indigo: 'bg-indigo-500',
    pink: 'bg-pink-500',
    cyan: 'bg-cyan-500',
    amber: 'bg-amber-500',
    violet: 'bg-violet-500'
  };
  return colors[agent.color] || 'bg-gray-500';
};

export const getAgentGradient = (agent: AIAgent): string => {
  const gradients: { [key: string]: string } = {
    blue: 'from-blue-400 to-blue-600',
    purple: 'from-purple-400 to-purple-600',
    green: 'from-green-400 to-green-600',
    red: 'from-red-400 to-red-600',
    yellow: 'from-yellow-400 to-yellow-600',
    orange: 'from-orange-400 to-orange-600',
    teal: 'from-teal-400 to-teal-600',
    indigo: 'from-indigo-400 to-indigo-600',
    pink: 'from-pink-400 to-pink-600',
    cyan: 'from-cyan-400 to-cyan-600',
    amber: 'from-amber-400 to-amber-600',
    violet: 'from-violet-400 to-violet-600'
  };
  return gradients[agent.color] || 'from-gray-400 to-gray-600';
};