/**
 * Tour Operators Service
 * API client for B2B tour operator management
 */

import api from './api';

export interface TourOperator {
  _id: string;
  name: string;
  code: string;
  businessName: string;
  type: 'receptive' | 'wholesaler' | 'dmc' | 'bedbank' | 'aggregator';
  relationship: 'supplier' | 'buyer' | 'both';
  status: 'pending_approval' | 'active' | 'inactive' | 'suspended';
  apiSystem: {
    type: string;
    credentials?: any;
    endpoints: any;
    config: any;
  };
  integrationStatus: {
    isConfigured: boolean;
    isActive: boolean;
    healthStatus: 'healthy' | 'warning' | 'error' | 'unknown';
    lastHealthCheck?: string;
    syncStats?: {
      totalBookings: number;
      successfulBookings: number;
      failedBookings: number;
      lastSync?: string;
    };
  };
  businessTerms: {
    defaultCommission: {
      type: 'percentage' | 'fixed';
      value: number;
    };
    currency: string;
  };
  contact: {
    primaryName: string;
    primaryEmail: string;
    primaryPhone: string;
  };
}

export interface SearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  rooms: Array<{
    adults: number;
    children: number;
    childrenAges?: number[];
  }>;
}

export interface HotelResult {
  hotelCode: string;
  hotelName: string;
  location: string;
  category: string;
  rooms: Array<{
    ratePlanCode: string;
    roomType: string;
    boardType: string;
    price: number;
    currency: string;
    available: number;
  }>;
}

class TourOperatorsService {
  private baseUrl = '/admin/tour-operators';

  /**
   * Get all tour operators (filtered by user role)
   */
  async getOperators(filters?: {
    status?: string;
    type?: string;
    relationship?: string;
  }): Promise<TourOperator[]> {
    const response = await api.get(this.baseUrl, { params: filters });
    return response.data.data;
  }

  /**
   * Get single operator by ID
   */
  async getOperator(id: string): Promise<TourOperator> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  /**
   * Create new tour operator (system_admin only)
   */
  async createOperator(data: Partial<TourOperator>): Promise<TourOperator> {
    const response = await api.post(this.baseUrl, data);
    return response.data.data;
  }

  /**
   * Update tour operator
   */
  async updateOperator(id: string, data: Partial<TourOperator>): Promise<TourOperator> {
    const response = await api.put(`${this.baseUrl}/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete tour operator (system_admin only)
   */
  async deleteOperator(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Get operator credentials (masked)
   */
  async getCredentials(id: string) {
    const response = await api.get(`${this.baseUrl}/${id}/credentials`);
    return response.data.data;
  }

  /**
   * Update operator credentials
   */
  async updateCredentials(id: string, credentials: {
    apiSystem: {
      credentials: any;
      endpoints?: any;
      config?: any;
    };
  }) {
    const response = await api.put(`${this.baseUrl}/${id}/credentials`, credentials);
    return response.data.data;
  }

  /**
   * Activate operator integration
   */
  async activate(id: string): Promise<void> {
    await api.post(`${this.baseUrl}/${id}/activate`);
  }

  /**
   * Deactivate operator integration
   */
  async deactivate(id: string, reason?: string): Promise<void> {
    await api.post(`${this.baseUrl}/${id}/deactivate`, { reason });
  }

  /**
   * Test operator connection
   */
  async testConnection(id: string): Promise<{
    status: string;
    responseTime: number;
    timestamp: string;
    details?: any;
  }> {
    const response = await api.post(`${this.baseUrl}/${id}/test`);
    return response.data.data;
  }

  /**
   * Search hotels in external operator
   */
  async searchHotels(id: string, params: SearchParams): Promise<HotelResult[]> {
    const response = await api.post(`${this.baseUrl}/${id}/search/hotels`, params);
    return response.data.data;
  }

  /**
   * Search packages in external operator
   */
  async searchPackages(id: string, params: any): Promise<any[]> {
    const response = await api.post(`${this.baseUrl}/${id}/search/packages`, params);
    return response.data.data;
  }

  /**
   * Get operator health status
   */
  async getHealthStatus(id: string): Promise<{
    status: string;
    lastCheck: string;
    metrics: any;
  }> {
    const response = await api.get(`${this.baseUrl}/${id}/health`);
    return response.data.data;
  }

  /**
   * Get operator statistics
   */
  async getStatistics(id: string): Promise<{
    totalBookings: number;
    successfulBookings: number;
    failedBookings: number;
    totalRevenue: number;
    averageCommission: number;
  }> {
    const response = await api.get(`${this.baseUrl}/${id}/statistics`);
    return response.data.data;
  }
}

export const tourOperatorsService = new TourOperatorsService();
export default tourOperatorsService;
