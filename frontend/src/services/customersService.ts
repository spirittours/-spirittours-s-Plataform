/**
 * Customers Service
 * Complete service layer for customer management (CRM)
 * Singleton pattern with caching support
 */

import apiClient from './apiClient';
import {
  Customer,
  CustomerFilters,
  CustomerFormData,
  CustomersListResponse,
  CustomerDetailResponse,
  CustomerStatsResponse,
  CustomerNote,
  CustomerActivity,
  BulkCustomerAction,
  BulkActionResult,
  CustomerExportOptions,
  NoteCategory,
  CustomerStatus,
  CustomerTier,
} from '../types/customer.types';

// ============================================================================
// Service Configuration
// ============================================================================

const API_BASE = '/api/customers';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ============================================================================
// Customers Service Class
// ============================================================================

class CustomersService {
  private cache: Map<string, CacheEntry<any>> = new Map();

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  private getCacheKey(key: string, params?: any): string {
    return params ? `${key}_${JSON.stringify(params)}` : key;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  // ==========================================================================
  // Customer CRUD Operations
  // ==========================================================================

  /**
   * Get paginated list of customers with filters
   */
  async getCustomers(
    page: number = 1,
    limit: number = 20,
    filters?: CustomerFilters
  ): Promise<CustomersListResponse> {
    const cacheKey = this.getCacheKey('customers_list', { page, limit, filters });
    const cached = this.getFromCache<CustomersListResponse>(cacheKey);
    if (cached) return cached;

    const params: any = { page, limit };

    // Apply filters
    if (filters) {
      if (filters.search) params.search = filters.search;
      if (filters.status?.length) params.status = filters.status.join(',');
      if (filters.tier?.length) params.tier = filters.tier.join(',');
      if (filters.source?.length) params.source = filters.source.join(',');
      if (filters.tags?.length) params.tags = filters.tags.join(',');
      if (filters.createdAfter) params.createdAfter = filters.createdAfter;
      if (filters.createdBefore) params.createdBefore = filters.createdBefore;
      if (filters.lastBookingAfter) params.lastBookingAfter = filters.lastBookingAfter;
      if (filters.lastBookingBefore) params.lastBookingBefore = filters.lastBookingBefore;
      if (filters.minTotalSpent !== undefined) params.minTotalSpent = filters.minTotalSpent;
      if (filters.maxTotalSpent !== undefined) params.maxTotalSpent = filters.maxTotalSpent;
      if (filters.hasOutstandingBalance !== undefined) params.hasOutstandingBalance = filters.hasOutstandingBalance;
      if (filters.minBookings !== undefined) params.minBookings = filters.minBookings;
      if (filters.maxBookings !== undefined) params.maxBookings = filters.maxBookings;
      if (filters.hasUpcomingBooking !== undefined) params.hasUpcomingBooking = filters.hasUpcomingBooking;
      if (filters.marketingConsent !== undefined) params.marketingConsent = filters.marketingConsent;
      if (filters.emailVerified !== undefined) params.emailVerified = filters.emailVerified;
      if (filters.phoneVerified !== undefined) params.phoneVerified = filters.phoneVerified;
      if (filters.country?.length) params.country = filters.country.join(',');
      if (filters.city?.length) params.city = filters.city.join(',');
      if (filters.assignedAgent) params.assignedAgent = filters.assignedAgent;
      if (filters.unassigned !== undefined) params.unassigned = filters.unassigned;
    }

    const response = await apiClient.get<CustomersListResponse>(API_BASE, { params });
    this.setCache(cacheKey, response.data);
    return response.data;
  }

  /**
   * Get single customer by ID with full details
   */
  async getCustomerById(customerId: string): Promise<CustomerDetailResponse> {
    const cacheKey = `customer_${customerId}`;
    const cached = this.getFromCache<CustomerDetailResponse>(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get<CustomerDetailResponse>(`${API_BASE}/${customerId}`);
    this.setCache(cacheKey, response.data);
    return response.data;
  }

  /**
   * Create new customer
   */
  async createCustomer(data: CustomerFormData): Promise<Customer> {
    const response = await apiClient.post<Customer>(API_BASE, data);
    this.invalidateCache('customers_list');
    this.invalidateCache('stats');
    return response.data;
  }

  /**
   * Update existing customer
   */
  async updateCustomer(customerId: string, data: Partial<CustomerFormData>): Promise<Customer> {
    const response = await apiClient.put<Customer>(`${API_BASE}/${customerId}`, data);
    this.invalidateCache(`customer_${customerId}`);
    this.invalidateCache('customers_list');
    return response.data;
  }

  /**
   * Delete customer
   */
  async deleteCustomer(customerId: string): Promise<void> {
    await apiClient.delete(`${API_BASE}/${customerId}`);
    this.invalidateCache(`customer_${customerId}`);
    this.invalidateCache('customers_list');
    this.invalidateCache('stats');
  }

  // ==========================================================================
  // Customer Status & Tier Management
  // ==========================================================================

  /**
   * Change customer status
   */
  async changeCustomerStatus(customerId: string, status: CustomerStatus): Promise<Customer> {
    const response = await apiClient.patch<Customer>(
      `${API_BASE}/${customerId}/status`,
      { status }
    );
    this.invalidateCache(`customer_${customerId}`);
    this.invalidateCache('customers_list');
    return response.data;
  }

  /**
   * Change customer tier
   */
  async changeCustomerTier(customerId: string, tier: CustomerTier): Promise<Customer> {
    const response = await apiClient.patch<Customer>(
      `${API_BASE}/${customerId}/tier`,
      { tier }
    );
    this.invalidateCache(`customer_${customerId}`);
    this.invalidateCache('customers_list');
    return response.data;
  }

  // ==========================================================================
  // Customer Notes Management
  // ==========================================================================

  /**
   * Get customer notes
   */
  async getCustomerNotes(customerId: string): Promise<CustomerNote[]> {
    const cacheKey = `customer_notes_${customerId}`;
    const cached = this.getFromCache<CustomerNote[]>(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get<CustomerNote[]>(`${API_BASE}/${customerId}/notes`);
    this.setCache(cacheKey, response.data);
    return response.data;
  }

  /**
   * Add note to customer
   */
  async addCustomerNote(
    customerId: string,
    content: string,
    category: NoteCategory = NoteCategory.GENERAL,
    isPinned: boolean = false,
    isPrivate: boolean = false
  ): Promise<CustomerNote> {
    const response = await apiClient.post<CustomerNote>(
      `${API_BASE}/${customerId}/notes`,
      { content, category, isPinned, isPrivate }
    );
    this.invalidateCache(`customer_notes_${customerId}`);
    this.invalidateCache(`customer_${customerId}`);
    return response.data;
  }

  /**
   * Update customer note
   */
  async updateCustomerNote(
    customerId: string,
    noteId: string,
    data: Partial<CustomerNote>
  ): Promise<CustomerNote> {
    const response = await apiClient.put<CustomerNote>(
      `${API_BASE}/${customerId}/notes/${noteId}`,
      data
    );
    this.invalidateCache(`customer_notes_${customerId}`);
    return response.data;
  }

  /**
   * Delete customer note
   */
  async deleteCustomerNote(customerId: string, noteId: string): Promise<void> {
    await apiClient.delete(`${API_BASE}/${customerId}/notes/${noteId}`);
    this.invalidateCache(`customer_notes_${customerId}`);
  }

  // ==========================================================================
  // Customer Activity Timeline
  // ==========================================================================

  /**
   * Get customer activity timeline
   */
  async getCustomerActivity(customerId: string, limit: number = 50): Promise<CustomerActivity[]> {
    const cacheKey = `customer_activity_${customerId}_${limit}`;
    const cached = this.getFromCache<CustomerActivity[]>(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get<CustomerActivity[]>(
      `${API_BASE}/${customerId}/activity`,
      { params: { limit } }
    );
    this.setCache(cacheKey, response.data);
    return response.data;
  }

  // ==========================================================================
  // Customer Search & Lookup
  // ==========================================================================

  /**
   * Quick search customers (autocomplete)
   */
  async searchCustomers(query: string, limit: number = 10): Promise<Customer[]> {
    const response = await apiClient.get<Customer[]>(`${API_BASE}/search`, {
      params: { q: query, limit },
    });
    return response.data;
  }

  /**
   * Lookup customer by email
   */
  async lookupByEmail(email: string): Promise<Customer | null> {
    try {
      const response = await apiClient.get<Customer>(`${API_BASE}/lookup/email`, {
        params: { email },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  /**
   * Lookup customer by phone
   */
  async lookupByPhone(phone: string): Promise<Customer | null> {
    try {
      const response = await apiClient.get<Customer>(`${API_BASE}/lookup/phone`, {
        params: { phone },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  /**
   * Lookup customer by customer number
   */
  async lookupByCustomerNumber(customerNumber: string): Promise<Customer | null> {
    try {
      const response = await apiClient.get<Customer>(`${API_BASE}/lookup/number`, {
        params: { customerNumber },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  }

  // ==========================================================================
  // Customer Statistics & Analytics
  // ==========================================================================

  /**
   * Get customer statistics
   */
  async getCustomerStats(): Promise<CustomerStatsResponse> {
    const cacheKey = 'customer_stats';
    const cached = this.getFromCache<CustomerStatsResponse>(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get<CustomerStatsResponse>(`${API_BASE}/stats`);
    this.setCache(cacheKey, response.data);
    return response.data;
  }

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  /**
   * Bulk action on multiple customers
   */
  async bulkAction(action: BulkCustomerAction): Promise<BulkActionResult> {
    const response = await apiClient.post<BulkActionResult>(`${API_BASE}/bulk`, action);
    this.invalidateCache('customers_list');
    this.invalidateCache('stats');
    return response.data;
  }

  /**
   * Bulk delete customers
   */
  async bulkDelete(customerIds: string[]): Promise<BulkActionResult> {
    return this.bulkAction({
      action: 'delete',
      customerIds,
    });
  }

  /**
   * Bulk change status
   */
  async bulkChangeStatus(customerIds: string[], status: CustomerStatus): Promise<BulkActionResult> {
    return this.bulkAction({
      action: 'change_status',
      customerIds,
      params: { status },
    });
  }

  /**
   * Bulk change tier
   */
  async bulkChangeTier(customerIds: string[], tier: CustomerTier): Promise<BulkActionResult> {
    return this.bulkAction({
      action: 'change_tier',
      customerIds,
      params: { tier },
    });
  }

  /**
   * Bulk assign agent
   */
  async bulkAssignAgent(customerIds: string[], agentId: string): Promise<BulkActionResult> {
    return this.bulkAction({
      action: 'assign_agent',
      customerIds,
      params: { agentId },
    });
  }

  /**
   * Bulk add tag
   */
  async bulkAddTag(customerIds: string[], tag: string): Promise<BulkActionResult> {
    return this.bulkAction({
      action: 'add_tag',
      customerIds,
      params: { tag },
    });
  }

  /**
   * Bulk remove tag
   */
  async bulkRemoveTag(customerIds: string[], tag: string): Promise<BulkActionResult> {
    return this.bulkAction({
      action: 'remove_tag',
      customerIds,
      params: { tag },
    });
  }

  // ==========================================================================
  // Export Operations
  // ==========================================================================

  /**
   * Export customers to file
   */
  async exportCustomers(options: CustomerExportOptions): Promise<Blob> {
    const response = await apiClient.post(`${API_BASE}/export`, options, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Download customer export
   */
  downloadCustomerExport(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // ==========================================================================
  // Tag Management
  // ==========================================================================

  /**
   * Get all available tags
   */
  async getAllTags(): Promise<string[]> {
    const cacheKey = 'customer_tags';
    const cached = this.getFromCache<string[]>(cacheKey);
    if (cached) return cached;

    const response = await apiClient.get<string[]>(`${API_BASE}/tags`);
    this.setCache(cacheKey, response.data);
    return response.data;
  }

  /**
   * Add tag to customer
   */
  async addTag(customerId: string, tag: string): Promise<Customer> {
    const response = await apiClient.post<Customer>(`${API_BASE}/${customerId}/tags`, { tag });
    this.invalidateCache(`customer_${customerId}`);
    this.invalidateCache('customer_tags');
    return response.data;
  }

  /**
   * Remove tag from customer
   */
  async removeTag(customerId: string, tag: string): Promise<Customer> {
    await apiClient.delete(`${API_BASE}/${customerId}/tags/${tag}`);
    this.invalidateCache(`customer_${customerId}`);
    this.invalidateCache('customer_tags');
    const updatedCustomer = await this.getCustomerById(customerId);
    return updatedCustomer.customer;
  }

  // ==========================================================================
  // Communication History
  // ==========================================================================

  /**
   * Send email to customer
   */
  async sendEmail(customerId: string, subject: string, body: string): Promise<void> {
    await apiClient.post(`${API_BASE}/${customerId}/email`, { subject, body });
    this.invalidateCache(`customer_activity_${customerId}`);
  }

  /**
   * Send SMS to customer
   */
  async sendSMS(customerId: string, message: string): Promise<void> {
    await apiClient.post(`${API_BASE}/${customerId}/sms`, { message });
    this.invalidateCache(`customer_activity_${customerId}`);
  }

  /**
   * Log phone call
   */
  async logPhoneCall(
    customerId: string,
    duration: number,
    notes: string,
    outcome: string
  ): Promise<void> {
    await apiClient.post(`${API_BASE}/${customerId}/call`, {
      duration,
      notes,
      outcome,
    });
    this.invalidateCache(`customer_activity_${customerId}`);
  }

  // ==========================================================================
  // Merge Customers
  // ==========================================================================

  /**
   * Merge duplicate customers
   */
  async mergeCustomers(primaryCustomerId: string, secondaryCustomerIds: string[]): Promise<Customer> {
    const response = await apiClient.post<Customer>(`${API_BASE}/${primaryCustomerId}/merge`, {
      secondaryCustomerIds,
    });
    
    // Invalidate all affected caches
    this.invalidateCache(`customer_${primaryCustomerId}`);
    secondaryCustomerIds.forEach((id) => this.invalidateCache(`customer_${id}`));
    this.invalidateCache('customers_list');
    this.invalidateCache('stats');
    
    return response.data;
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

const customersService = new CustomersService();
export default customersService;
