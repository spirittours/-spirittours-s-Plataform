import apiClient from './api/apiClient';
import { BOOKING_ENDPOINTS } from '../config/api.config';
import {
  Booking,
  BookingFilters,
  BookingListResponse,
  BookingFormData,
  BookingStats,
  CancellationRequest,
  BookingModification,
  BulkBookingAction,
  BookingExportOptions,
  BookingAvailabilityCheck,
  BookingNotification,
} from '../types/booking.types';

class BookingsService {
  private static instance: BookingsService;

  private constructor() {}

  public static getInstance(): BookingsService {
    if (!BookingsService.instance) {
      BookingsService.instance = new BookingsService();
    }
    return BookingsService.instance;
  }

  // Get all bookings with pagination and filters
  async getBookings(
    page: number = 1,
    pageSize: number = 20,
    filters?: BookingFilters
  ): Promise<BookingListResponse> {
    const params = {
      page,
      pageSize,
      ...filters,
    };

    return apiClient.get(BOOKING_ENDPOINTS.LIST, {
      params,
      cache: true,
      cacheTTL: 30000, // 30 seconds cache
    });
  }

  // Get single booking by ID
  async getBooking(id: string): Promise<Booking> {
    return apiClient.get(BOOKING_ENDPOINTS.DETAILS(id), {
      cache: true,
      cacheTTL: 60000,
    });
  }

  // Get booking by booking number
  async getBookingByNumber(bookingNumber: string): Promise<Booking> {
    return apiClient.get(`${BOOKING_ENDPOINTS.LIST}/${bookingNumber}`, {
      cache: true,
      cacheTTL: 60000,
    });
  }

  // Create new booking
  async createBooking(data: BookingFormData): Promise<Booking> {
    return apiClient.post(BOOKING_ENDPOINTS.CREATE, data);
  }

  // Update booking
  async updateBooking(id: string, data: Partial<BookingFormData>): Promise<Booking> {
    return apiClient.put(BOOKING_ENDPOINTS.UPDATE(id), data);
  }

  // Delete booking
  async deleteBooking(id: string): Promise<void> {
    return apiClient.delete(BOOKING_ENDPOINTS.DELETE(id));
  }

  // Confirm booking
  async confirmBooking(id: string): Promise<Booking> {
    return apiClient.post(BOOKING_ENDPOINTS.CONFIRM(id));
  }

  // Cancel booking
  async cancelBooking(request: CancellationRequest): Promise<Booking> {
    return apiClient.post(BOOKING_ENDPOINTS.CANCEL(request.bookingId), request);
  }

  // Modify booking
  async modifyBooking(modification: BookingModification): Promise<Booking> {
    return apiClient.post(BOOKING_ENDPOINTS.MODIFY(modification.bookingId), modification);
  }

  // Check availability before booking
  async checkAvailability(
    tourId: string,
    date: string,
    participants: number
  ): Promise<BookingAvailabilityCheck> {
    return apiClient.post(BOOKING_ENDPOINTS.CHECK_AVAILABILITY, {
      tourId,
      date,
      participants,
    });
  }

  // Process payment
  async processPayment(
    bookingId: string,
    paymentData: {
      amount: number;
      method: string;
      token?: string;
    }
  ): Promise<Booking> {
    return apiClient.post(BOOKING_ENDPOINTS.PROCESS_PAYMENT(bookingId), paymentData);
  }

  // Get booking stats
  async getBookingStats(filters?: {
    startDate?: string;
    endDate?: string;
  }): Promise<BookingStats> {
    return apiClient.get(BOOKING_ENDPOINTS.STATS, {
      params: filters,
      cache: true,
      cacheTTL: 120000, // 2 minutes cache
    });
  }

  // Get bookings by tour
  async getBookingsByTour(
    tourId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<BookingListResponse> {
    return apiClient.get(BOOKING_ENDPOINTS.BY_TOUR(tourId), {
      params: { page, pageSize },
      cache: true,
      cacheTTL: 60000,
    });
  }

  // Get bookings by customer
  async getBookingsByCustomer(
    customerId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<BookingListResponse> {
    return apiClient.get(BOOKING_ENDPOINTS.BY_CUSTOMER(customerId), {
      params: { page, pageSize },
      cache: true,
      cacheTTL: 60000,
    });
  }

  // Bulk actions
  async bulkAction(action: BulkBookingAction): Promise<{
    success: number;
    failed: number;
    results: { bookingId: string; success: boolean; error?: string }[];
  }> {
    return apiClient.post(BOOKING_ENDPOINTS.BULK_ACTION, action);
  }

  // Export bookings
  async exportBookings(options: BookingExportOptions): Promise<Blob> {
    return apiClient.download(BOOKING_ENDPOINTS.EXPORT, {
      params: options,
      responseType: 'blob',
    });
  }

  // Send notification
  async sendNotification(
    bookingId: string,
    type: 'confirmation' | 'reminder' | 'cancellation' | 'modification'
  ): Promise<BookingNotification> {
    return apiClient.post(BOOKING_ENDPOINTS.SEND_NOTIFICATION(bookingId), { type });
  }

  // Get booking timeline
  async getBookingTimeline(bookingId: string): Promise<any[]> {
    return apiClient.get(`${BOOKING_ENDPOINTS.DETAILS(bookingId)}/timeline`);
  }

  // Add note to booking
  async addNote(bookingId: string, note: string): Promise<Booking> {
    return apiClient.post(`${BOOKING_ENDPOINTS.DETAILS(bookingId)}/notes`, { note });
  }

  // Assign guide to booking
  async assignGuide(bookingId: string, guideId: string): Promise<Booking> {
    return apiClient.post(`${BOOKING_ENDPOINTS.DETAILS(bookingId)}/assign-guide`, { guideId });
  }

  // Add tags to booking
  async addTags(bookingId: string, tags: string[]): Promise<Booking> {
    return apiClient.post(`${BOOKING_ENDPOINTS.DETAILS(bookingId)}/tags`, { tags });
  }

  // Remove tag from booking
  async removeTag(bookingId: string, tag: string): Promise<Booking> {
    return apiClient.delete(`${BOOKING_ENDPOINTS.DETAILS(bookingId)}/tags/${tag}`);
  }

  // Set booking priority
  async setPriority(
    bookingId: string,
    priority: 'low' | 'normal' | 'high' | 'urgent'
  ): Promise<Booking> {
    return apiClient.patch(`${BOOKING_ENDPOINTS.DETAILS(bookingId)}/priority`, { priority });
  }

  // Calculate price for booking
  async calculatePrice(data: {
    tourId: string;
    participants: number;
    date: string;
    discountCode?: string;
  }): Promise<{
    basePrice: number;
    subtotal: number;
    discount: number;
    tax: number;
    serviceFee: number;
    total: number;
    currency: string;
  }> {
    return apiClient.post(BOOKING_ENDPOINTS.CALCULATE_PRICE, data);
  }

  // Apply discount code
  async applyDiscountCode(bookingId: string, code: string): Promise<Booking> {
    return apiClient.post(`${BOOKING_ENDPOINTS.DETAILS(bookingId)}/discount`, { code });
  }

  // Get upcoming bookings
  async getUpcomingBookings(days: number = 7): Promise<Booking[]> {
    return apiClient.get(BOOKING_ENDPOINTS.UPCOMING, {
      params: { days },
      cache: true,
      cacheTTL: 300000, // 5 minutes cache
    });
  }

  // Get bookings requiring attention
  async getBookingsRequiringAttention(): Promise<Booking[]> {
    return apiClient.get(BOOKING_ENDPOINTS.ATTENTION_REQUIRED, {
      cache: true,
      cacheTTL: 60000,
    });
  }

  // Search bookings
  async searchBookings(query: string): Promise<Booking[]> {
    return apiClient.get(BOOKING_ENDPOINTS.SEARCH, {
      params: { q: query },
    });
  }

  // Get booking summary for dashboard
  async getDashboardSummary(): Promise<{
    today: number;
    thisWeek: number;
    thisMonth: number;
    pending: number;
    confirmed: number;
    revenue: {
      today: number;
      thisWeek: number;
      thisMonth: number;
    };
  }> {
    return apiClient.get(`${BOOKING_ENDPOINTS.STATS}/dashboard`, {
      cache: true,
      cacheTTL: 300000,
    });
  }

  // Duplicate booking
  async duplicateBooking(id: string): Promise<Booking> {
    return apiClient.post(`${BOOKING_ENDPOINTS.DETAILS(id)}/duplicate`);
  }

  // Resend confirmation email
  async resendConfirmation(id: string): Promise<void> {
    return apiClient.post(`${BOOKING_ENDPOINTS.DETAILS(id)}/resend-confirmation`);
  }

  // Generate booking invoice
  async generateInvoice(id: string): Promise<Blob> {
    return apiClient.download(`${BOOKING_ENDPOINTS.DETAILS(id)}/invoice`, {
      responseType: 'blob',
    });
  }

  // Generate booking voucher
  async generateVoucher(id: string): Promise<Blob> {
    return apiClient.download(`${BOOKING_ENDPOINTS.DETAILS(id)}/voucher`, {
      responseType: 'blob',
    });
  }
}

export const bookingsService = BookingsService.getInstance();
export default bookingsService;
