/**
 * Analytics Dashboard Service
 * Service layer for Analytics Dashboard API communication
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class AnalyticsService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/v1/analytics`,
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

  // ============== DASHBOARD ENDPOINTS ==============

  /**
   * Get dashboard data by type
   * @param dashboardType - Type of dashboard (executive, operational, technical, default)
   * @param refresh - Force refresh of cached data
   */
  async getDashboard(dashboardType: string = 'executive', refresh: boolean = false) {
    try {
      const response = await this.api.get(`/dashboard/${dashboardType}`, {
        params: { refresh },
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching ${dashboardType} dashboard:`, error);
      throw error;
    }
  }

  /**
   * List all available dashboard types
   */
  async listDashboards() {
    try {
      const response = await this.api.get('/dashboards');
      return response.data;
    } catch (error: any) {
      console.error('Error listing dashboards:', error);
      throw error;
    }
  }

  // ============== METRICS ENDPOINTS ==============

  /**
   * Get specific metric data
   * @param metricType - Type of metric (revenue, bookings, customers, etc.)
   * @param timeRange - Time range (real_time, hourly, daily, weekly, monthly, quarterly, yearly)
   * @param businessModel - Business model filter (b2c, b2b, b2b2c, all)
   */
  async getMetric(
    metricType: string,
    timeRange: string = 'daily',
    businessModel?: string
  ) {
    try {
      const params: any = { time_range: timeRange };
      if (businessModel) {
        params.business_model = businessModel;
      }
      const response = await this.api.get(`/metrics/${metricType}`, { params });
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching ${metricType} metric:`, error);
      throw error;
    }
  }

  /**
   * List all available metrics
   */
  async listMetrics() {
    try {
      const response = await this.api.get('/metrics');
      return response.data;
    } catch (error: any) {
      console.error('Error listing metrics:', error);
      throw error;
    }
  }

  // ============== REPORTS ENDPOINTS ==============

  /**
   * Generate analytics report
   * @param reportType - Type of report (financial, operational)
   * @param period - Report period (daily, weekly, monthly, quarterly, yearly)
   */
  async generateReport(reportType: string, period: string = 'monthly') {
    try {
      const response = await this.api.post('/reports/generate', null, {
        params: { report_type: reportType, period },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Get generated report by ID
   * @param reportId - Report ID
   * @param format - Export format (json, pdf, excel, csv)
   */
  async getReport(reportId: string, format: string = 'json') {
    try {
      const response = await this.api.get(`/reports/${reportId}`, {
        params: { format },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching report:', error);
      throw error;
    }
  }

  /**
   * List available reports
   * @param limit - Number of reports to return
   * @param offset - Offset for pagination
   */
  async listReports(limit: number = 10, offset: number = 0) {
    try {
      const response = await this.api.get('/reports', {
        params: { limit, offset },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error listing reports:', error);
      throw error;
    }
  }

  // ============== REAL-TIME ENDPOINTS ==============

  /**
   * Get real-time KPI metrics
   */
  async getRealtimeKPIs() {
    try {
      const response = await this.api.get('/realtime/kpis');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching real-time KPIs:', error);
      throw error;
    }
  }

  /**
   * Get real-time system alerts
   * @param severity - Filter by severity (critical, warning, info)
   */
  async getRealtimeAlerts(severity?: string) {
    try {
      const params = severity ? { severity } : {};
      const response = await this.api.get('/realtime/alerts', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching real-time alerts:', error);
      throw error;
    }
  }

  // ============== ANALYTICS INFO ==============

  /**
   * Get analytics system information
   */
  async getAnalyticsInfo() {
    try {
      const response = await this.api.get('/info');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching analytics info:', error);
      throw error;
    }
  }

  /**
   * Health check for analytics service
   */
  async healthCheck() {
    try {
      const response = await this.api.get('/health');
      return response.data;
    } catch (error: any) {
      console.error('Error checking analytics health:', error);
      throw error;
    }
  }

  // ============== CONVENIENCE METHODS ==============

  /**
   * Get comprehensive dashboard overview
   */
  async getDashboardOverview() {
    try {
      const [revenueData, bookingsData, customersData, realtimeKPIs] = await Promise.all([
        this.getMetric('revenue', 'daily'),
        this.getMetric('bookings', 'daily'),
        this.getMetric('customers', 'daily'),
        this.getRealtimeKPIs(),
      ]);

      return {
        revenue: revenueData,
        bookings: bookingsData,
        customers: customersData,
        realtime: realtimeKPIs,
      };
    } catch (error: any) {
      console.error('Error fetching dashboard overview:', error);
      throw error;
    }
  }

  /**
   * Get revenue breakdown by business model
   */
  async getRevenueBreakdown(timeRange: string = 'monthly') {
    try {
      const [b2cData, b2bData, b2b2cData] = await Promise.all([
        this.getMetric('revenue', timeRange, 'b2c'),
        this.getMetric('revenue', timeRange, 'b2b'),
        this.getMetric('revenue', timeRange, 'b2b2c'),
      ]);

      return {
        b2c: b2cData,
        b2b: b2bData,
        b2b2c: b2b2cData,
      };
    } catch (error: any) {
      console.error('Error fetching revenue breakdown:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;
