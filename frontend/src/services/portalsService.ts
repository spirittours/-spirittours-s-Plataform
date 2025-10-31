/**
 * Portals Service
 * Service layer for B2B, B2C, and B2B2C portal management
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Commission {
  id: string;
  partner_id: string;
  booking_id: string;
  amount: number;
  currency: string;
  percentage: number;
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  created_at: string;
  paid_at?: string;
}

export interface Partner {
  id: string;
  name: string;
  type: 'b2b' | 'b2b2c';
  commission_rate: number;
  status: 'active' | 'inactive' | 'suspended';
  contact_email: string;
  total_commissions: number;
  pending_commissions: number;
}

export interface PartnerBooking {
  id: string;
  reference: string;
  customer_name: string;
  destination: string;
  amount: number;
  commission: number;
  status: string;
  created_at: string;
}

class PortalsService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token interceptor
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // ============== B2B PORTAL ==============

  /**
   * Get B2B dashboard data
   */
  async getB2BDashboard() {
    try {
      const response = await this.api.get('/b2b/dashboard');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching B2B dashboard:', error);
      throw error;
    }
  }

  /**
   * Get B2B partner bookings
   */
  async getB2BBookings(partnerId?: string) {
    try {
      const params = partnerId ? { partner_id: partnerId } : {};
      const response = await this.api.get('/b2b/bookings', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching B2B bookings:', error);
      throw error;
    }
  }

  /**
   * Get B2B commission history
   */
  async getB2BCommissions(partnerId?: string) {
    try {
      const params = partnerId ? { partner_id: partnerId } : {};
      const response = await this.api.get('/b2b/commissions', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching B2B commissions:', error);
      throw error;
    }
  }

  /**
   * Create new B2B booking
   */
  async createB2BBooking(bookingData: any) {
    try {
      const response = await this.api.post('/b2b/bookings', bookingData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating B2B booking:', error);
      throw error;
    }
  }

  // ============== B2C PORTAL ==============

  /**
   * Get B2C customer dashboard
   */
  async getB2CDashboard(customerId: string) {
    try {
      const response = await this.api.get(`/b2c/dashboard/${customerId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching B2C dashboard:', error);
      throw error;
    }
  }

  /**
   * Get B2C customer bookings
   */
  async getB2CBookings(customerId: string) {
    try {
      const response = await this.api.get(`/b2c/bookings/${customerId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching B2C bookings:', error);
      throw error;
    }
  }

  /**
   * Create new B2C booking
   */
  async createB2CBooking(bookingData: any) {
    try {
      const response = await this.api.post('/b2c/bookings', bookingData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating B2C booking:', error);
      throw error;
    }
  }

  /**
   * Get available tours/packages
   */
  async getAvailablePackages(filters?: any) {
    try {
      const response = await this.api.get('/b2c/packages', { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching packages:', error);
      throw error;
    }
  }

  // ============== B2B2C PORTAL ==============

  /**
   * Get B2B2C dashboard data
   */
  async getB2B2CDashboard() {
    try {
      const response = await this.api.get('/b2b2c/dashboard');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching B2B2C dashboard:', error);
      throw error;
    }
  }

  /**
   * Get B2B2C partner customers
   */
  async getB2B2CCustomers(partnerId: string) {
    try {
      const response = await this.api.get(`/b2b2c/customers/${partnerId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching B2B2C customers:', error);
      throw error;
    }
  }

  /**
   * Get B2B2C bookings
   */
  async getB2B2CBookings(partnerId?: string) {
    try {
      const params = partnerId ? { partner_id: partnerId } : {};
      const response = await this.api.get('/b2b2c/bookings', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching B2B2C bookings:', error);
      throw error;
    }
  }

  // ============== COMMISSION MANAGEMENT ==============

  /**
   * Get commission summary
   */
  async getCommissionSummary(partnerId?: string) {
    try {
      const params = partnerId ? { partner_id: partnerId } : {};
      const response = await this.api.get('/commissions/summary', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching commission summary:', error);
      throw error;
    }
  }

  /**
   * Request commission payout
   */
  async requestCommissionPayout(commissionIds: string[]) {
    try {
      const response = await this.api.post('/commissions/payout', { commission_ids: commissionIds });
      return response.data;
    } catch (error: any) {
      console.error('Error requesting commission payout:', error);
      throw error;
    }
  }

  /**
   * Get commission history
   */
  async getCommissionHistory(partnerId?: string, filters?: any) {
    try {
      const params = { ...filters };
      if (partnerId) params.partner_id = partnerId;
      const response = await this.api.get('/commissions/history', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching commission history:', error);
      throw error;
    }
  }

  // ============== PARTNER MANAGEMENT ==============

  /**
   * Get partner profile
   */
  async getPartnerProfile(partnerId: string) {
    try {
      const response = await this.api.get(`/partners/${partnerId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching partner profile:', error);
      throw error;
    }
  }

  /**
   * Update partner profile
   */
  async updatePartnerProfile(partnerId: string, profileData: any) {
    try {
      const response = await this.api.put(`/partners/${partnerId}`, profileData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating partner profile:', error);
      throw error;
    }
  }

  /**
   * Get all partners (admin only)
   */
  async getAllPartners(filters?: any) {
    try {
      const response = await this.api.get('/partners', { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching partners:', error);
      throw error;
    }
  }

  /**
   * Create new partner
   */
  async createPartner(partnerData: any) {
    try {
      const response = await this.api.post('/partners', partnerData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating partner:', error);
      throw error;
    }
  }

  // ============== REPORTS ==============

  /**
   * Generate partner report
   */
  async generatePartnerReport(partnerId: string, reportType: string, period: string) {
    try {
      const response = await this.api.post('/reports/partner', {
        partner_id: partnerId,
        report_type: reportType,
        period,
      });
      return response.data;
    } catch (error: any) {
      console.error('Error generating partner report:', error);
      throw error;
    }
  }

  /**
   * Export commission data
   */
  async exportCommissionData(partnerId?: string, format: 'csv' | 'excel' | 'pdf' = 'csv') {
    try {
      const params: any = { format };
      if (partnerId) params.partner_id = partnerId;
      const response = await this.api.get('/commissions/export', {
        params,
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      console.error('Error exporting commission data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const portalsService = new PortalsService();
export default portalsService;
