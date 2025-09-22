import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

// Base API configuration - Updated for RBAC backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance with updated base URL
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL, // Direct to backend root, no /api/v1
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token and audit trail
apiClient.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for audit trail
    config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling, token refresh, and RBAC
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle authentication errors (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token } = response.data;
        localStorage.setItem('accessToken', access_token);

        // Update the authorization header and retry
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    // Handle authorization errors (403) - RBAC permissions
    if (error.response?.status === 403) {
      const message = error.response.data?.detail || 'No tienes permisos para realizar esta acción';
      toast.error(message);
      console.warn('Access denied - insufficient permissions:', error.response.data);
    }

    // Handle other HTTP errors
    if (error.response?.status >= 400) {
      const message = error.response.data?.detail || error.response.data?.message || 'Error en la petición';
      
      // Don't show toast for 401/403 as they're handled above
      if (![401, 403].includes(error.response.status)) {
        toast.error(message);
      }
    }

    // Handle network errors
    if (!error.response) {
      toast.error('Error de conexión. Verifica tu conexión a internet.');
    }

    return Promise.reject(error);
  }
);

// Authentication API - Updated for RBAC
export class AuthAPI {
  static async login(username: string, password: string) {
    return apiClient.post('/auth/login', { username, password });
  }

  static async logout() {
    return apiClient.post('/auth/logout');
  }

  static async refreshToken(refreshToken: string) {
    return apiClient.post('/auth/refresh', { refresh_token: refreshToken });
  }

  static async getProfile() {
    return apiClient.get('/auth/profile');
  }

  static async updateProfile(userData: any) {
    return apiClient.put('/auth/profile', userData);
  }

  static async changePassword(currentPassword: string, newPassword: string) {
    return apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
  }

  // RBAC-specific endpoints
  static async getPermissions() {
    return apiClient.get('/auth/permissions');
  }

  static async checkPermission(scope: string, action: string, resource: string) {
    return apiClient.get(`/auth/check-permission/${scope}/${action}/${resource}`);
  }

  static async getDashboardAccess() {
    return apiClient.get('/auth/dashboard-access');
  }

  static async getAccessibleAgents() {
    return apiClient.get('/auth/accessible-agents');
  }
}

// Users API - Admin endpoints with RBAC
export class UsersAPI {
  static async getAllUsers(params?: any) {
    return apiClient.get('/admin/users', { params });
  }

  static async getUser(id: string) {
    return apiClient.get(`/admin/users/${id}`);
  }

  static async createUser(userData: any) {
    return apiClient.post('/admin/users', userData);
  }

  static async updateUser(id: string, userData: any) {
    return apiClient.put(`/admin/users/${id}`, userData);
  }

  static async deleteUser(id: string) {
    return apiClient.delete(`/admin/users/${id}`);
  }

  static async resetUserPassword(id: string, newPassword: string) {
    return apiClient.post(`/admin/users/${id}/reset-password`, {
      new_password: newPassword
    });
  }

  // Role and Permission Management
  static async getAllRoles() {
    return apiClient.get('/admin/roles');
  }

  static async createRole(roleData: any) {
    return apiClient.post('/admin/roles', roleData);
  }

  static async getAllPermissions(scope?: string) {
    const params = scope ? { scope } : {};
    return apiClient.get('/admin/permissions', { params });
  }

  static async getAllBranches() {
    return apiClient.get('/admin/branches');
  }

  static async createBranch(branchData: any) {
    return apiClient.post('/admin/branches', branchData);
  }

  // Analytics and Audit
  static async getUserAnalytics() {
    return apiClient.get('/admin/analytics/users');
  }

  static async getAuditLogs(params?: any) {
    return apiClient.get('/admin/audit-logs', { params });
  }
}

// Agents API - Updated for RBAC integration
export class AgentsAPI {
  static async getAllAgentsStatus() {
    return apiClient.get('/api/agents/status');
  }

  static async getAgentDetails(agentId: string) {
    return apiClient.get(`/agents/${agentId}`);
  }

  static async executeAgent(agentId: string, payload: any) {
    return apiClient.post(`/agents/${agentId}/execute`, payload);
  }

  static async getAgentHistory(agentId: string, params?: any) {
    return apiClient.get(`/agents/${agentId}/history`, { params });
  }

  static async getAgentMetrics(agentId: string) {
    return apiClient.get(`/agents/${agentId}/metrics`);
  }
}

// Dashboard API - Updated for RBAC
export class DashboardAPI {
  static async getDashboardStats() {
    return apiClient.get('/api/dashboard/stats');
  }

  static async getSystemStatus() {
    return apiClient.get('/status');
  }

  static async getSystemHealth() {
    return apiClient.get('/health');
  }

  static async getRecentActivities(params?: any) {
    return apiClient.get('/admin/audit-logs', { params });
  }
}

// Bookings API - Placeholder for future implementation
export class BookingsAPI {
  static async getAllBookings(params?: any) {
    return apiClient.get('/api/bookings', { params });
  }

  static async getBooking(id: string) {
    return apiClient.get(`/api/bookings/${id}`);
  }

  static async createBooking(bookingData: any) {
    return apiClient.post('/api/bookings', bookingData);
  }

  static async updateBooking(id: string, bookingData: any) {
    return apiClient.put(`/api/bookings/${id}`, bookingData);
  }

  static async cancelBooking(id: string, reason?: string) {
    return apiClient.patch(`/api/bookings/${id}/cancel`, { reason });
  }

  static async getBookingsByUser(userId: string) {
    return apiClient.get('/api/bookings', { params: { user_id: userId } });
  }

  static async getBookingsByStatus(status: string) {
    return apiClient.get('/api/bookings', { params: { status } });
  }

  static async getBookingStats() {
    return apiClient.get('/api/bookings/stats');
  }
}

// Customers API - For future implementation
export class CustomersAPI {
  static async getAllCustomers(params?: any) {
    return apiClient.get('/api/customers', { params });
  }

  static async getCustomer(id: string) {
    return apiClient.get(`/api/customers/${id}`);
  }

  static async createCustomer(customerData: any) {
    return apiClient.post('/api/customers', customerData);
  }

  static async updateCustomer(id: string, customerData: any) {
    return apiClient.put(`/api/customers/${id}`, customerData);
  }

  static async deleteCustomer(id: string) {
    return apiClient.delete(`/api/customers/${id}`);
  }

  static async getCustomerBookings(id: string) {
    return apiClient.get(`/api/customers/${id}/bookings`);
  }
}

// Analytics API - For business intelligence
export class AnalyticsAPI {
  static async getBusinessMetrics(params?: any) {
    return apiClient.get('/api/analytics/business', { params });
  }

  static async getAgentPerformance(params?: any) {
    return apiClient.get('/api/analytics/agents', { params });
  }

  static async getRevenueAnalytics(params?: any) {
    return apiClient.get('/api/analytics/revenue', { params });
  }

  static async getCustomerAnalytics(params?: any) {
    return apiClient.get('/api/analytics/customers', { params });
  }

  static async exportAnalytics(type: string, params?: any) {
    return apiClient.get(`/api/analytics/export/${type}`, { 
      params,
      responseType: 'blob' // For file downloads
    });
  }
}

// System API - For system administration
export class SystemAPI {
  static async getSystemInfo() {
    return apiClient.get('/');
  }

  static async getHealthCheck() {
    return apiClient.get('/health');
  }

  static async getSystemStatus() {
    return apiClient.get('/status');
  }

  static async performSystemBackup() {
    return apiClient.post('/admin/system/backup');
  }

  static async restoreSystemBackup(backupId: string) {
    return apiClient.post(`/admin/system/restore/${backupId}`);
  }

  static async getSystemLogs(params?: any) {
    return apiClient.get('/admin/system/logs', { params });
  }

  static async updateSystemConfiguration(config: any) {
    return apiClient.put('/admin/system/config', config);
  }
}

// Default export
export default apiClient;

// Re-export commonly used classes
export {
  AuthAPI,
  UsersAPI,
  AgentsAPI,
  DashboardAPI,
  BookingsAPI,
  CustomersAPI,
  AnalyticsAPI,
  SystemAPI
};