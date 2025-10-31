import axios, { AxiosError } from 'axios';
import { 
  AIAgent, 
  AgentResponse,
  AccessibilityAssessment,
  CarbonFootprint,
  LocalImpactAnalysis,
  EthicalCompliance,
  ContentMasterData,
  CompetitiveIntelData,
  CustomerProphetData,
  ExperienceCuratorData,
  RevenueMaximizerData,
  SecurityGuardData,
  MarketEntryData,
  InfluencerMatchData,
  LuxuryUpsellData,
  RouteGeniusData,
  CrisisManagementData,
  PersonalizationData,
  CulturalAdaptationData,
  SustainabilityData,
  WellnessData,
  KnowledgeData
} from '../components/AIAgents/types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class AIAgentsService {
  private axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds timeout for AI processing
  });

  constructor() {
    // Add auth token to requests if available
    this.axiosInstance.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ============== Track 3: Ethics & Sustainability ==============

  async assessAccessibility(destinationId: string, requirements?: string[]): Promise<AgentResponse<AccessibilityAssessment>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/accessibility-specialist/assess-venue', {
        venue_id: destinationId,
        accessibility_needs: requirements || []
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createAccessibleItinerary(requirements: any): Promise<AgentResponse<any>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/accessibility-specialist/create-itinerary', requirements);
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async calculateCarbonFootprint(tripData: {
    transport_mode: string;
    distance_km: number;
    hotel_nights: number;
    hotel_type?: string;
    travelers?: number;
  }): Promise<AgentResponse<CarbonFootprint>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/carbon-optimizer/calculate-footprint', {
        trip_data: tripData
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async analyzeLocalImpact(destinationId: string, touristVolume?: number): Promise<AgentResponse<LocalImpactAnalysis>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/local-impact-analyzer/assess-community', {
        destination: destinationId,
        tourism_data: {
          annual_visitors: touristVolume || 10000
        }
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async evaluateEthicalCompliance(providerId: string, providerType?: string): Promise<AgentResponse<EthicalCompliance>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/ethical-tourism-advisor/compliance-check', {
        provider_id: providerId,
        provider_type: providerType || 'tour_operator'
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============== Track 1: Customer & Revenue Excellence ==============

  async generateContent(contentType: string, topic: string, options?: any): Promise<AgentResponse<ContentMasterData>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/content-master/generate', {
        content_type: contentType,
        topic,
        ...options
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async analyzeCompetitors(market: string, competitors?: string[]): Promise<AgentResponse<CompetitiveIntelData[]>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/competitive-intel/analyze', {
        market,
        competitors
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async predictCustomerBehavior(customerId: string): Promise<AgentResponse<CustomerProphetData>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/customer-prophet/predict', {
        customer_id: customerId
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async curateExperience(customerId: string, preferences: any): Promise<AgentResponse<ExperienceCuratorData>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/experience-curator/curate', {
        customer_id: customerId,
        preferences
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async optimizeRevenue(productId: string, currentPrice: number): Promise<AgentResponse<RevenueMaximizerData>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/revenue-maximizer/optimize', {
        product_id: productId,
        current_price: currentPrice
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============== Track 2: Security & Market Intelligence ==============

  async assessSecurity(): Promise<AgentResponse<SecurityGuardData>> {
    try {
      const response = await this.axiosInstance.get('/api/v1/agents/security-guard/assess');
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async analyzeMarketEntry(marketName: string): Promise<AgentResponse<MarketEntryData>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/market-entry/analyze', {
        market_name: marketName
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async findInfluencers(niche: string, platform?: string): Promise<AgentResponse<InfluencerMatchData[]>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/influencer-match/find', {
        niche,
        platform
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async analyzeLuxuryUpsell(customerId: string): Promise<AgentResponse<LuxuryUpsellData>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/luxury-upsell/analyze', {
        customer_id: customerId
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async optimizeRoute(origin: string, destination: string, waypoints?: string[]): Promise<AgentResponse<RouteGeniusData>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/route-genius/optimize', {
        origin,
        destination,
        waypoints
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============== Other Track 3 Agents ==============

  async manageCrisis(incidentType: string): Promise<AgentResponse<CrisisManagementData>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/crisis-management/assess', {
        incident_type: incidentType
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async personalizeExperience(customerId: string): Promise<AgentResponse<PersonalizationData>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/personalization-engine/personalize', {
        customer_id: customerId
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getCulturalGuidelines(destination: string): Promise<AgentResponse<CulturalAdaptationData>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/cultural-adaptation/guidelines', {
        destination
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async assessSustainability(providerId: string): Promise<AgentResponse<SustainabilityData>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/sustainability-advisor/assess', {
        provider_id: providerId
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async optimizeWellness(customerId: string): Promise<AgentResponse<WellnessData>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/wellness-optimizer/optimize', {
        customer_id: customerId
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async searchKnowledge(query: string, types?: string[]): Promise<AgentResponse<KnowledgeData>> {
    try {
      const response = await this.axiosInstance.post('/api/v1/agents/knowledge-curator/search', {
        query,
        types
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============== Agent Management ==============

  async getAgentStatus(agentId: string): Promise<AgentResponse<AIAgent>> {
    try {
      const response = await this.axiosInstance.get(`/api/v1/agents/${agentId}/status`);
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAllAgentsStatus(): Promise<AgentResponse<AIAgent[]>> {
    try {
      const response = await this.axiosInstance.get('/api/v1/agents/status');
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getAgentMetrics(agentId: string, timeRange?: string): Promise<AgentResponse<any>> {
    try {
      const response = await this.axiosInstance.get(`/api/v1/agents/${agentId}/metrics`, {
        params: { time_range: timeRange || 'daily' }
      });
      return {
        status: 'success',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // ============== Error Handling ==============

  private handleError(error: any): AgentResponse {
    console.error('AI Agent Service Error:', error);
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        status: 'error',
        error: axiosError.response?.data?.message || axiosError.message || 'An error occurred',
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      status: 'error',
      error: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    };
  }

  // ============== Utility Methods ==============

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/api/v1/agents/health');
      return response.status === 200;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken(): void {
    localStorage.removeItem('auth_token');
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }
}

// Export singleton instance
export const aiAgentsService = new AIAgentsService();
export default aiAgentsService;