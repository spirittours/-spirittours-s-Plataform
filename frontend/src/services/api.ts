import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { store } from '../store/store';
import { refreshAccessToken, logout } from '../store/slices/authSlice';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const token = state.auth.accessToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add language header
    const language = state.ui.language;
    if (language) {
      config.headers['Accept-Language'] = language;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue requests while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        const resultAction = await store.dispatch(refreshAccessToken());
        
        if (refreshAccessToken.fulfilled.match(resultAction)) {
          const newToken = resultAction.payload.access_token;
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } else {
          // Refresh failed, logout user
          processQueue(error, null);
          store.dispatch(logout());
          return Promise.reject(error);
        }
      } catch (err) {
        processQueue(err, null);
        store.dispatch(logout());
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/api/auth/login', credentials),
  
  register: (userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    date_of_birth?: string;
  }) =>
    apiClient.post('/api/auth/register', userData),
  
  logout: () =>
    apiClient.post('/api/auth/logout'),
  
  refreshToken: (refreshToken: string) =>
    apiClient.post('/api/auth/refresh', { refresh_token: refreshToken }),
  
  getCurrentUser: () =>
    apiClient.get('/api/auth/me'),
  
  updateProfile: (userData: any) =>
    apiClient.put('/api/auth/profile', userData),
  
  changePassword: (passwords: { current_password: string; new_password: string }) =>
    apiClient.post('/api/auth/change-password', passwords),
  
  resetPasswordRequest: (email: string) =>
    apiClient.post('/api/auth/reset-password/request', { email }),
  
  resetPasswordConfirm: (token: string, newPassword: string) =>
    apiClient.post('/api/auth/reset-password/confirm', { token, new_password: newPassword }),
  
  verifyEmail: (token: string) =>
    apiClient.post('/api/auth/verify-email', { token }),
  
  resendVerificationEmail: () =>
    apiClient.post('/api/auth/resend-verification'),
};

// Tours API
export const toursAPI = {
  getTours: (params?: any) =>
    apiClient.get('/api/tours', { params }),
  
  getFeaturedTours: (limit: number = 6) =>
    apiClient.get('/api/tours/featured', { params: { limit } }),
  
  getTourById: (tourId: number) =>
    apiClient.get(`/api/tours/${tourId}`),
  
  getTourBySlug: (slug: string) =>
    apiClient.get(`/api/tours/slug/${slug}`),
  
  searchTours: (params: any) =>
    apiClient.post('/api/tours/search', params),
  
  getTourAvailability: (tourId: number, params?: any) =>
    apiClient.get(`/api/tours/${tourId}/availability`, { params }),
  
  getTourPricing: (tourId: number, params: any) =>
    apiClient.post(`/api/tours/${tourId}/pricing`, params),
  
  getRelatedTours: (tourId: number, limit: number = 4) =>
    apiClient.get(`/api/tours/${tourId}/related`, { params: { limit } }),
};

// Bookings API
export const bookingsAPI = {
  createBooking: (bookingData: any) =>
    apiClient.post('/api/bookings', bookingData),
  
  getUserBookings: (params?: any) =>
    apiClient.get('/api/bookings/user/me', { params }),
  
  getBookingById: (bookingId: number) =>
    apiClient.get(`/api/bookings/${bookingId}`),
  
  cancelBooking: (bookingId: number, reason?: string) =>
    apiClient.post(`/api/bookings/${bookingId}/cancel`, { reason }),
  
  processPayment: (bookingId: number, paymentMethod: string, paymentDetails: any) =>
    apiClient.post(`/api/bookings/${bookingId}/payment`, {
      payment_method: paymentMethod,
      payment_details: paymentDetails,
    }),
  
  getBookingInvoice: (bookingId: number) =>
    apiClient.get(`/api/bookings/${bookingId}/invoice`, { responseType: 'blob' }),
};

// Reviews API
export const reviewsAPI = {
  getTourReviews: (params: { tourId: number; page?: number; limit?: number; sort_by?: string; min_rating?: number }) =>
    apiClient.get(`/api/reviews/tour/${params.tourId}`, {
      params: { page: params.page, limit: params.limit, sort_by: params.sort_by, min_rating: params.min_rating },
    }),
  
  getTourRatingSummary: (tourId: number) =>
    apiClient.get(`/api/reviews/tour/${tourId}/summary`),
  
  createReview: (reviewData: any) =>
    apiClient.post('/api/reviews', reviewData),
  
  updateReview: (reviewId: number, updates: any) =>
    apiClient.put(`/api/reviews/${reviewId}`, updates),
  
  deleteReview: (reviewId: number) =>
    apiClient.delete(`/api/reviews/${reviewId}`),
  
  voteReview: (reviewId: number, isHelpful: boolean) =>
    apiClient.post(`/api/reviews/${reviewId}/vote`, { is_helpful: isHelpful }),
  
  flagReview: (reviewId: number, reason: string, description?: string) =>
    apiClient.post(`/api/reviews/${reviewId}/flag`, { reason, description }),
  
  getUserReviews: () =>
    apiClient.get('/api/reviews/user/me'),
  
  respondToReview: (reviewId: number, content: string) =>
    apiClient.post(`/api/reviews/${reviewId}/respond`, { content }),
};

// Admin API
export const adminAPI = {
  // Dashboard
  getDashboardStats: () =>
    apiClient.get('/api/admin/dashboard/stats'),
  
  getRevenueAnalytics: (params?: any) =>
    apiClient.get('/api/admin/analytics/revenue', { params }),
  
  // Tours Management
  createTour: (tourData: any) =>
    apiClient.post('/api/admin/tours', tourData),
  
  updateTour: (tourId: number, updates: any) =>
    apiClient.put(`/api/admin/tours/${tourId}`, updates),
  
  deleteTour: (tourId: number) =>
    apiClient.delete(`/api/admin/tours/${tourId}`),
  
  // Bookings Management
  getAllBookings: (params?: any) =>
    apiClient.get('/api/admin/bookings', { params }),
  
  updateBookingStatus: (bookingId: number, status: string) =>
    apiClient.put(`/api/admin/bookings/${bookingId}/status`, { status }),
  
  // Users Management
  getAllUsers: (params?: any) =>
    apiClient.get('/api/admin/users', { params }),
  
  updateUserRole: (userId: number, role: string) =>
    apiClient.put(`/api/admin/users/${userId}/role`, { role }),
  
  deactivateUser: (userId: number) =>
    apiClient.post(`/api/admin/users/${userId}/deactivate`),
  
  // Reviews Management
  getAllReviews: (params?: any) =>
    apiClient.get('/api/admin/reviews', { params }),
  
  moderateReview: (reviewId: number, action: 'approve' | 'reject', reason?: string) =>
    apiClient.post(`/api/reviews/${reviewId}/moderate`, { action, reason }),
};

// Payments API
export const paymentsAPI = {
  createPaymentIntent: (bookingId: number) =>
    apiClient.post('/api/payments/intent', { booking_id: bookingId }),
  
  confirmPayment: (paymentIntentId: string) =>
    apiClient.post('/api/payments/confirm', { payment_intent_id: paymentIntentId }),
  
  getPaymentMethods: () =>
    apiClient.get('/api/payments/methods'),
};

// Wishlist API
export const wishlistAPI = {
  getWishlist: () =>
    apiClient.get('/api/wishlist'),
  
  addToWishlist: (tourId: number) =>
    apiClient.post('/api/wishlist', { tour_id: tourId }),
  
  removeFromWishlist: (tourId: number) =>
    apiClient.delete(`/api/wishlist/${tourId}`),
};

// Notifications API
export const notificationsAPI = {
  getNotifications: (params?: any) =>
    apiClient.get('/api/notifications', { params }),
  
  markAsRead: (notificationId: number) =>
    apiClient.put(`/api/notifications/${notificationId}/read`),
  
  markAllAsRead: () =>
    apiClient.put('/api/notifications/read-all'),
  
  deleteNotification: (notificationId: number) =>
    apiClient.delete(`/api/notifications/${notificationId}`),
};

export default apiClient;
