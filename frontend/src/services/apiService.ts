/**
 * Central API Service for Spirit Tours Frontend
 * Integrates all backend APIs with proper error handling and authentication
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'react-toastify';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT = 30000;

// Types and Interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Tour {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  destination: string;
  category: string;
  image: string;
  rating: number;
  reviews: number;
  maxParticipants: number;
  includes: string[];
  highlights: string[];
}

export interface Booking {
  id: string;
  userId: string;
  tourId: string;
  tourName: string;
  bookingDate: string;
  participants: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionId: string;
  createdAt: string;
}

// Create Axios Instance
class ApiService {
  private api: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request Interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response Interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private setTokens(tokens: AuthTokens): void {
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = new Promise(async (resolve, reject) => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);
        
        this.refreshTokenPromise = null;
        resolve(access);
      } catch (error) {
        this.refreshTokenPromise = null;
        reject(error);
      }
    });

    return this.refreshTokenPromise;
  }

  private handleApiError(error: any): void {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.response?.status === 404) {
      toast.error('Resource not found.');
    } else if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action.');
    } else if (error.response?.status !== 401) {
      toast.error(message);
    }
  }

  private logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  // ========== Authentication APIs ==========
  
  async login(email: string, password: string): Promise<ApiResponse<{ tokens: AuthTokens; user: User }>> {
    const response = await this.api.post('/auth/login', { email, password });
    if (response.data.success) {
      this.setTokens(response.data.tokens);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  }

  async register(userData: {
    email: string;
    password: string;
    username: string;
    fullName: string;
  }): Promise<ApiResponse<{ tokens: AuthTokens; user: User }>> {
    const response = await this.api.post('/auth/register', userData);
    if (response.data.success) {
      this.setTokens(response.data.tokens);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } finally {
      this.logout();
    }
  }

  async verifyEmail(token: string): Promise<ApiResponse> {
    const response = await this.api.post('/auth/verify-email', { token });
    return response.data;
  }

  async resetPassword(email: string): Promise<ApiResponse> {
    const response = await this.api.post('/auth/reset-password', { email });
    return response.data;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse> {
    const response = await this.api.post('/auth/change-password', { oldPassword, newPassword });
    return response.data;
  }

  // ========== User APIs ==========
  
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await this.api.get('/users/me');
    return response.data;
  }

  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    const response = await this.api.put('/users/me', userData);
    return response.data;
  }

  async uploadAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await this.api.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // ========== Tours APIs ==========
  
  async getTours(params?: {
    page?: number;
    limit?: number;
    category?: string;
    destination?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
  }): Promise<ApiResponse<Tour[]>> {
    const response = await this.api.get('/tours', { params });
    return response.data;
  }

  async getTourById(id: string): Promise<ApiResponse<Tour>> {
    const response = await this.api.get(`/tours/${id}`);
    return response.data;
  }

  async getTourAvailability(tourId: string, date: string): Promise<ApiResponse<{
    available: boolean;
    spotsRemaining: number;
  }>> {
    const response = await this.api.get(`/tours/${tourId}/availability`, {
      params: { date },
    });
    return response.data;
  }

  async searchTours(query: string): Promise<ApiResponse<Tour[]>> {
    const response = await this.api.get('/tours/search', {
      params: { q: query },
    });
    return response.data;
  }

  // ========== Bookings APIs ==========
  
  async createBooking(bookingData: {
    tourId: string;
    bookingDate: string;
    participants: number;
    specialRequests?: string;
    paymentMethodId?: string;
  }): Promise<ApiResponse<Booking>> {
    const response = await this.api.post('/booking/create', bookingData);
    return response.data;
  }

  async getMyBookings(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<Booking[]>> {
    const response = await this.api.get('/booking/my-bookings', { params });
    return response.data;
  }

  async getBookingById(id: string): Promise<ApiResponse<Booking>> {
    const response = await this.api.get(`/booking/${id}`);
    return response.data;
  }

  async cancelBooking(id: string, reason: string): Promise<ApiResponse<Booking>> {
    const response = await this.api.post(`/booking/${id}/cancel`, { reason });
    return response.data;
  }

  async modifyBooking(id: string, changes: {
    bookingDate?: string;
    participants?: number;
    specialRequests?: string;
  }): Promise<ApiResponse<Booking>> {
    const response = await this.api.put(`/booking/${id}/modify`, changes);
    return response.data;
  }

  async getBookingInvoice(id: string): Promise<Blob> {
    const response = await this.api.get(`/booking/${id}/invoice`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // ========== Payments APIs ==========
  
  async processPayment(paymentData: {
    bookingId: string;
    amount: number;
    currency: string;
    paymentMethodId: string;
  }): Promise<ApiResponse<Payment>> {
    const response = await this.api.post('/payments/process', paymentData);
    return response.data;
  }

  async getPaymentMethods(): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/payments/methods');
    return response.data;
  }

  async addPaymentMethod(methodData: any): Promise<ApiResponse> {
    const response = await this.api.post('/payments/methods', methodData);
    return response.data;
  }

  async requestRefund(paymentId: string, reason: string): Promise<ApiResponse> {
    const response = await this.api.post(`/payments/${paymentId}/refund`, { reason });
    return response.data;
  }

  // ========== Notifications APIs ==========
  
  async getNotifications(params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/notifications', { params });
    return response.data;
  }

  async markNotificationAsRead(id: string): Promise<ApiResponse> {
    const response = await this.api.put(`/notifications/${id}/read`);
    return response.data;
  }

  async updateNotificationPreferences(preferences: any): Promise<ApiResponse> {
    const response = await this.api.put('/notifications/preferences', preferences);
    return response.data;
  }

  // ========== AI Agent APIs ==========
  
  async queryAI(query: string, agentType?: string): Promise<ApiResponse<{
    response: string;
    suggestions?: string[];
    confidence: number;
  }>> {
    const response = await this.api.post('/ai/query', { query, agentType });
    return response.data;
  }

  async getTourRecommendations(): Promise<ApiResponse<Tour[]>> {
    const response = await this.api.get('/ai/recommendations');
    return response.data;
  }

  async generateItinerary(preferences: any): Promise<ApiResponse<any>> {
    const response = await this.api.post('/ai/generate-itinerary', preferences);
    return response.data;
  }

  // ========== Analytics APIs ==========
  
  async getDashboardMetrics(period: string = '7d'): Promise<ApiResponse<any>> {
    const response = await this.api.get('/dashboard/metrics', {
      params: { period },
    });
    return response.data;
  }

  async getRecentBookings(): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/dashboard/recent-bookings');
    return response.data;
  }

  async getTopTours(): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/dashboard/top-tours');
    return response.data;
  }

  async getAnalytics(params: {
    startDate: string;
    endDate: string;
    metrics: string[];
  }): Promise<ApiResponse<any>> {
    const response = await this.api.get('/analytics', { params });
    return response.data;
  }

  // ========== Reviews APIs ==========
  
  async submitReview(bookingId: string, reviewData: {
    rating: number;
    title: string;
    comment: string;
    wouldRecommend: boolean;
  }): Promise<ApiResponse> {
    const response = await this.api.post(`/booking/${bookingId}/review`, reviewData);
    return response.data;
  }

  async getTourReviews(tourId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    const response = await this.api.get(`/tours/${tourId}/reviews`, { params });
    return response.data;
  }

  // ========== Admin APIs ==========
  
  async getAdminStats(): Promise<ApiResponse<any>> {
    const response = await this.api.get('/admin/stats');
    return response.data;
  }

  async getAllUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }): Promise<ApiResponse<User[]>> {
    const response = await this.api.get('/admin/users', { params });
    return response.data;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<ApiResponse> {
    const response = await this.api.put(`/admin/users/${userId}/status`, { isActive });
    return response.data;
  }

  async getAllBookings(params?: {
    page?: number;
    limit?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<Booking[]>> {
    const response = await this.api.get('/admin/bookings', { params });
    return response.data;
  }

  async createTour(tourData: Partial<Tour>): Promise<ApiResponse<Tour>> {
    const response = await this.api.post('/admin/tours', tourData);
    return response.data;
  }

  async updateTour(id: string, tourData: Partial<Tour>): Promise<ApiResponse<Tour>> {
    const response = await this.api.put(`/admin/tours/${id}`, tourData);
    return response.data;
  }

  async deleteTour(id: string): Promise<ApiResponse> {
    const response = await this.api.delete(`/admin/tours/${id}`);
    return response.data;
  }

  // ========== B2B APIs ==========
  
  async getB2BDashboard(): Promise<ApiResponse<any>> {
    const response = await this.api.get('/b2b/dashboard');
    return response.data;
  }

  async getAgencyBookings(): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/b2b/agency/bookings');
    return response.data;
  }

  async createBulkBooking(bookings: any[]): Promise<ApiResponse> {
    const response = await this.api.post('/b2b/bookings/bulk', { bookings });
    return response.data;
  }

  async getCommissionReport(params: {
    startDate: string;
    endDate: string;
  }): Promise<ApiResponse<any>> {
    const response = await this.api.get('/b2b/commissions', { params });
    return response.data;
  }

  // ========== Support APIs ==========
  
  async createSupportTicket(ticketData: {
    subject: string;
    category: string;
    message: string;
    priority: string;
  }): Promise<ApiResponse> {
    const response = await this.api.post('/support/tickets', ticketData);
    return response.data;
  }

  async getSupportTickets(): Promise<ApiResponse<any[]>> {
    const response = await this.api.get('/support/tickets');
    return response.data;
  }

  async sendMessage(ticketId: string, message: string): Promise<ApiResponse> {
    const response = await this.api.post(`/support/tickets/${ticketId}/messages`, { message });
    return response.data;
  }

  // ========== File Upload ==========
  
  async uploadFile(file: File, type: string): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const response = await this.api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // ========== WebSocket Connection ==========
  
  connectWebSocket(): WebSocket {
    const token = this.getAccessToken();
    const wsUrl = API_BASE_URL.replace('http', 'ws') + `/ws?token=${token}`;
    return new WebSocket(wsUrl);
  }
}

// Export singleton instance
const apiService = new ApiService();
export default apiService;