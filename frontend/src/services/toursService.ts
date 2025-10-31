/**
 * Tours Service
 * 
 * Service for managing tours with the backend API
 */

import apiClient from './api/apiClient';
import { TOUR_ENDPOINTS } from '../config/api.config';
import type {
  Tour,
  TourFormData,
  TourFilters,
  ToursListResponse,
  TourStatsResponse,
  Availability,
  Review,
} from '../types/tour.types';

// ============================================================================
// TOURS SERVICE CLASS
// ============================================================================

class ToursService {
  /**
   * Get paginated list of tours
   */
  async getTours(
    page: number = 1,
    pageSize: number = 20,
    filters?: TourFilters
  ): Promise<ToursListResponse> {
    const params: any = {
      page,
      page_size: pageSize,
      ...filters,
    };

    // Convert array filters to comma-separated strings
    if (filters?.category) {
      params.category = filters.category.join(',');
    }
    if (filters?.difficulty) {
      params.difficulty = filters.difficulty.join(',');
    }
    if (filters?.status) {
      params.status = filters.status.join(',');
    }
    if (filters?.destinations) {
      params.destinations = filters.destinations.join(',');
    }

    return apiClient.get<ToursListResponse>(TOUR_ENDPOINTS.LIST, {
      params,
      cache: true,
      cacheTTL: 60000, // 1 minute cache
    });
  }

  /**
   * Get single tour by ID
   */
  async getTour(id: string): Promise<Tour> {
    return apiClient.get<Tour>(TOUR_ENDPOINTS.GET(id), {
      cache: true,
      cacheTTL: 300000, // 5 minutes cache
    });
  }

  /**
   * Get tour by slug
   */
  async getTourBySlug(slug: string): Promise<Tour> {
    return apiClient.get<Tour>(`${TOUR_ENDPOINTS.LIST}/${slug}`, {
      cache: true,
      cacheTTL: 300000,
    });
  }

  /**
   * Create new tour
   */
  async createTour(data: TourFormData): Promise<Tour> {
    const tour = await apiClient.post<Tour>(TOUR_ENDPOINTS.CREATE, data);
    
    // Clear tours list cache after creation
    apiClient.clearCache();
    
    return tour;
  }

  /**
   * Update existing tour
   */
  async updateTour(id: string, data: Partial<TourFormData>): Promise<Tour> {
    const tour = await apiClient.put<Tour>(TOUR_ENDPOINTS.UPDATE(id), data);
    
    // Clear cache after update
    apiClient.clearCache();
    
    return tour;
  }

  /**
   * Delete tour
   */
  async deleteTour(id: string): Promise<void> {
    await apiClient.delete(TOUR_ENDPOINTS.DELETE(id));
    
    // Clear cache after deletion
    apiClient.clearCache();
  }

  /**
   * Get tour availability
   */
  async getAvailability(
    tourId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Availability[]> {
    return apiClient.get<Availability[]>(TOUR_ENDPOINTS.AVAILABILITY(tourId), {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
      cache: true,
      cacheTTL: 60000, // 1 minute cache
    });
  }

  /**
   * Update tour availability
   */
  async updateAvailability(
    tourId: string,
    data: Partial<Availability>
  ): Promise<Availability> {
    return apiClient.post<Availability>(
      TOUR_ENDPOINTS.AVAILABILITY(tourId),
      data
    );
  }

  /**
   * Block availability dates
   */
  async blockAvailability(
    tourId: string,
    availabilityId: string,
    reason: string
  ): Promise<void> {
    await apiClient.post(
      `${TOUR_ENDPOINTS.AVAILABILITY(tourId)}/${availabilityId}/block`,
      { reason }
    );
  }

  /**
   * Unblock availability dates
   */
  async unblockAvailability(
    tourId: string,
    availabilityId: string
  ): Promise<void> {
    await apiClient.post(
      `${TOUR_ENDPOINTS.AVAILABILITY(tourId)}/${availabilityId}/unblock`
    );
  }

  /**
   * Get tour pricing
   */
  async getPricing(tourId: string, params?: {
    participants?: number;
    date?: string;
    promoCode?: string;
  }): Promise<{
    basePrice: number;
    discount: number;
    tax: number;
    total: number;
    currency: string;
  }> {
    return apiClient.get(TOUR_ENDPOINTS.PRICING(tourId), { params });
  }

  /**
   * Upload tour images
   */
  async uploadImages(
    tourId: string,
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<{ images: string[] }> {
    return apiClient.uploadFiles(
      TOUR_ENDPOINTS.IMAGES(tourId),
      files,
      onProgress
    );
  }

  /**
   * Delete tour image
   */
  async deleteImage(tourId: string, imageId: string): Promise<void> {
    await apiClient.delete(`${TOUR_ENDPOINTS.IMAGES(tourId)}/${imageId}`);
  }

  /**
   * Set primary image
   */
  async setPrimaryImage(tourId: string, imageId: string): Promise<void> {
    await apiClient.post(`${TOUR_ENDPOINTS.IMAGES(tourId)}/${imageId}/primary`);
  }

  /**
   * Get tour reviews
   */
  async getReviews(
    tourId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{
    reviews: Review[];
    total: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    return apiClient.get(TOUR_ENDPOINTS.REVIEWS(tourId), {
      params: { page, page_size: pageSize },
    });
  }

  /**
   * Get tour statistics
   */
  async getTourStats(): Promise<TourStatsResponse> {
    return apiClient.get<TourStatsResponse>(`${TOUR_ENDPOINTS.LIST}/stats`, {
      cache: true,
      cacheTTL: 300000, // 5 minutes cache
    });
  }

  /**
   * Search tours
   */
  async searchTours(query: string, filters?: TourFilters): Promise<ToursListResponse> {
    return apiClient.search<Tour>(TOUR_ENDPOINTS.LIST, {
      query,
      filters,
      page: 1,
      pageSize: 20,
    });
  }

  /**
   * Get featured tours
   */
  async getFeaturedTours(limit: number = 6): Promise<Tour[]> {
    return apiClient.get<Tour[]>(`${TOUR_ENDPOINTS.LIST}/featured`, {
      params: { limit },
      cache: true,
      cacheTTL: 300000,
    });
  }

  /**
   * Get trending tours
   */
  async getTrendingTours(limit: number = 6): Promise<Tour[]> {
    return apiClient.get<Tour[]>(`${TOUR_ENDPOINTS.LIST}/trending`, {
      params: { limit },
      cache: true,
      cacheTTL: 180000, // 3 minutes cache
    });
  }

  /**
   * Get popular tours
   */
  async getPopularTours(limit: number = 6): Promise<Tour[]> {
    return apiClient.get<Tour[]>(`${TOUR_ENDPOINTS.LIST}/popular`, {
      params: { limit },
      cache: true,
      cacheTTL: 300000,
    });
  }

  /**
   * Duplicate tour
   */
  async duplicateTour(id: string): Promise<Tour> {
    return apiClient.post<Tour>(`${TOUR_ENDPOINTS.GET(id)}/duplicate`);
  }

  /**
   * Publish tour
   */
  async publishTour(id: string): Promise<Tour> {
    return apiClient.post<Tour>(`${TOUR_ENDPOINTS.GET(id)}/publish`);
  }

  /**
   * Unpublish tour
   */
  async unpublishTour(id: string): Promise<Tour> {
    return apiClient.post<Tour>(`${TOUR_ENDPOINTS.GET(id)}/unpublish`);
  }

  /**
   * Archive tour
   */
  async archiveTour(id: string): Promise<Tour> {
    return apiClient.post<Tour>(`${TOUR_ENDPOINTS.GET(id)}/archive`);
  }

  /**
   * Restore archived tour
   */
  async restoreTour(id: string): Promise<Tour> {
    return apiClient.post<Tour>(`${TOUR_ENDPOINTS.GET(id)}/restore`);
  }

  /**
   * Bulk update tours
   */
  async bulkUpdate(
    tourIds: string[],
    updates: Partial<TourFormData>
  ): Promise<{ updated: number; failed: number }> {
    return apiClient.post(`${TOUR_ENDPOINTS.LIST}/bulk-update`, {
      tour_ids: tourIds,
      updates,
    });
  }

  /**
   * Bulk delete tours
   */
  async bulkDelete(tourIds: string[]): Promise<{ deleted: number }> {
    return apiClient.post(`${TOUR_ENDPOINTS.LIST}/bulk-delete`, {
      tour_ids: tourIds,
    });
  }

  /**
   * Export tours to CSV
   */
  async exportTours(filters?: TourFilters): Promise<Blob> {
    return apiClient.get(`${TOUR_ENDPOINTS.LIST}/export`, {
      params: filters,
      responseType: 'blob',
    });
  }

  /**
   * Import tours from CSV
   */
  async importTours(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ imported: number; failed: number; errors?: string[] }> {
    return apiClient.uploadFile(
      `${TOUR_ENDPOINTS.LIST}/import`,
      file,
      onProgress
    );
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const toursService = new ToursService();

export default toursService;
export { ToursService };
