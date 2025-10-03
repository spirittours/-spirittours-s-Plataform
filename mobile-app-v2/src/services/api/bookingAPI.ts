/**
 * Booking API Service
 */

import apiClient from './apiClient';
import { Tour, Booking, ApiResponse, PaginatedResponse, SearchFilters } from '../../types';

export const bookingAPI = {
  async searchTours(filters: SearchFilters): Promise<PaginatedResponse<Tour>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Tour>>>('/api/tours/search', {
      params: filters,
    });
    return response.data.data;
  },

  async getTour(tourId: string): Promise<Tour> {
    const response = await apiClient.get<ApiResponse<Tour>>(`/api/tours/${tourId}`);
    return response.data.data;
  },

  async getFeaturedTours(): Promise<Tour[]> {
    const response = await apiClient.get<ApiResponse<Tour[]>>('/api/tours/featured');
    return response.data.data;
  },

  async getPopularTours(): Promise<Tour[]> {
    const response = await apiClient.get<ApiResponse<Tour[]>>('/api/tours/popular');
    return response.data.data;
  },

  async createBooking(bookingData: {
    tourId: string;
    tourDate: string;
    adults: number;
    children: number;
    specialRequests?: string;
  }): Promise<Booking> {
    const response = await apiClient.post<ApiResponse<Booking>>('/api/bookings', bookingData);
    return response.data.data;
  },

  async getMyBookings(): Promise<Booking[]> {
    const response = await apiClient.get<ApiResponse<Booking[]>>('/api/bookings/my-bookings');
    return response.data.data;
  },

  async getBooking(bookingId: string): Promise<Booking> {
    const response = await apiClient.get<ApiResponse<Booking>>(`/api/bookings/${bookingId}`);
    return response.data.data;
  },

  async cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
    const response = await apiClient.post<ApiResponse<Booking>>(`/api/bookings/${bookingId}/cancel`, {
      reason,
    });
    return response.data.data;
  },

  async checkAvailability(tourId: string, date: string, adults: number, children: number): Promise<{
    available: boolean;
    spotsLeft: number;
  }> {
    const response = await apiClient.get<ApiResponse<{available: boolean; spotsLeft: number}>>(`/api/tours/${tourId}/availability`, {
      params: { date, adults, children },
    });
    return response.data.data;
  },
};
