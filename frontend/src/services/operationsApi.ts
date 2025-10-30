/**
 * Operations API Service
 * Service for interacting with Operations Module APIs
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class OperationsApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/operations`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auth token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // ==========================================
  // PROVIDERS
  // ==========================================

  async getProviders(filters?: {
    provider_type?: string;
    active?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.api.get('/providers', { params: filters });
    return response.data;
  }

  async getProvider(id: string) {
    const response = await this.api.get(`/providers/${id}`);
    return response.data;
  }

  async createProvider(data: any) {
    const response = await this.api.post('/providers', data);
    return response.data;
  }

  async updateProvider(id: string, data: any) {
    const response = await this.api.put(`/providers/${id}`, data);
    return response.data;
  }

  async enableWhatsApp(providerId: string) {
    const response = await this.api.post(`/providers/${providerId}/whatsapp/enable`);
    return response.data;
  }

  async disableWhatsApp(providerId: string) {
    const response = await this.api.post(`/providers/${providerId}/whatsapp/disable`);
    return response.data;
  }

  // ==========================================
  // GROUPS
  // ==========================================

  async getGroups(filters?: {
    status?: string;
    closure_status?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.api.get('/groups', { params: filters });
    return response.data;
  }

  async getGroup(id: string) {
    const response = await this.api.get(`/groups/${id}`);
    return response.data;
  }

  async createGroup(data: any) {
    const response = await this.api.post('/groups', data);
    return response.data;
  }

  async updateGroup(id: string, data: any) {
    const response = await this.api.put(`/groups/${id}`, data);
    return response.data;
  }

  async getClosureChecklist(groupId: string) {
    const response = await this.api.get(`/groups/${groupId}/closure-checklist`);
    return response.data;
  }

  async closeGroup(groupId: string, force: boolean = false) {
    const response = await this.api.post(`/groups/${groupId}/close`, null, {
      params: { force }
    });
    return response.data;
  }

  // ==========================================
  // RESERVATIONS
  // ==========================================

  async getReservations(filters?: {
    group_id?: string;
    provider_id?: string;
    service_type?: string;
    status?: string;
    payment_status?: string;
    start_date?: string;
    end_date?: string;
    pending_validation?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.api.get('/reservations', { params: filters });
    return response.data;
  }

  async getReservation(id: string) {
    const response = await this.api.get(`/reservations/${id}`);
    return response.data;
  }

  async createReservation(data: any) {
    const response = await this.api.post('/reservations', data);
    return response.data;
  }

  async updateReservation(id: string, data: any) {
    const response = await this.api.put(`/reservations/${id}`, data);
    return response.data;
  }

  async confirmReservation(
    id: string,
    confirmationNumber: string,
    confirmedByName?: string,
    confirmedByEmail?: string,
    notes?: string
  ) {
    const response = await this.api.put(`/reservations/${id}/confirm`, {
      confirmation_number: confirmationNumber,
      confirmed_by_name: confirmedByName,
      confirmed_by_email: confirmedByEmail,
      notes
    });
    return response.data;
  }

  // ==========================================
  // VALIDATIONS
  // ==========================================

  async createValidation(data: {
    reservation_id: string;
    validation_type: string;
    expected_values: any;
    actual_values: any;
  }) {
    const response = await this.api.post('/validations', data);
    return response.data;
  }

  async autoValidateReservation(
    reservationId: string,
    roomingFile?: File,
    invoiceFile?: File
  ) {
    const formData = new FormData();
    if (roomingFile) {
      formData.append('rooming_file', roomingFile);
    }
    if (invoiceFile) {
      formData.append('invoice_file', invoiceFile);
    }

    const response = await this.api.post(
      `/validations/auto-validate/${reservationId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  }

  // ==========================================
  // ALERTS
  // ==========================================

  async getAlerts(filters?: {
    severity?: string;
    alert_type?: string;
    acknowledged?: boolean;
    resolved?: boolean;
    assigned_to_me?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.api.get('/alerts', { params: filters });
    return response.data;
  }

  async acknowledgeAlert(id: string) {
    const response = await this.api.put(`/alerts/${id}/acknowledge`);
    return response.data;
  }

  async resolveAlert(id: string, resolutionNotes: string) {
    const response = await this.api.put(`/alerts/${id}/resolve`, {
      resolution_notes: resolutionNotes
    });
    return response.data;
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  async getDashboardMetrics() {
    const response = await this.api.get('/dashboard/metrics');
    return response.data;
  }

  async getCalendarView(startDate: string, endDate: string) {
    const response = await this.api.get('/dashboard/calendar', {
      params: {
        start_date: startDate,
        end_date: endDate
      }
    });
    return response.data;
  }

  // ==========================================
  // AI SERVICES
  // ==========================================

  async chatWithBot(message: string, context?: any) {
    const response = await this.api.post('/chatbot/message', {
      message,
      context
    });
    return response.data;
  }

  async forecastDemand(serviceType: string, startDate: string, endDate: string) {
    const response = await this.api.post('/ai/forecast-demand', {
      service_type: serviceType,
      start_date: startDate,
      end_date: endDate
    });
    return response.data;
  }

  async optimizePricing(providerId: string, serviceType: string, currentPrice: number) {
    const response = await this.api.post('/ai/optimize-pricing', {
      provider_id: providerId,
      service_type: serviceType,
      current_price: currentPrice
    });
    return response.data;
  }

  async findCostSavings(groupId: string) {
    const response = await this.api.post('/ai/find-cost-savings', {
      group_id: groupId
    });
    return response.data;
  }

  async detectFraud(reservationId?: string, providerId?: string) {
    const response = await this.api.post('/ai/detect-fraud', {
      reservation_id: reservationId,
      provider_id: providerId
    });
    return response.data;
  }

  // ==========================================
  // OCR
  // ==========================================

  async processInvoice(file: File, useAiEnhancement: boolean = true) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('use_ai_enhancement', String(useAiEnhancement));

    const response = await this.api.post('/ocr/process-invoice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async processRoomingList(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post('/ocr/process-rooming', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  // ==========================================
  // WHATSAPP NOTIFICATIONS
  // ==========================================

  async sendReservationConfirmation(data: {
    provider_phone: string;
    group_name: string;
    confirmation_number: string;
    service_date: string;
    quantity: number;
    provider_id: string;
  }) {
    const response = await this.api.post('/whatsapp/send-reservation-confirmation', data);
    return response.data;
  }

  async sendInvoiceRequest(data: {
    provider_phone: string;
    provider_name: string;
    group_name: string;
    service_date: string;
    amount: number;
    provider_id: string;
  }) {
    const response = await this.api.post('/whatsapp/send-invoice-request', data);
    return response.data;
  }
}

export const operationsApi = new OperationsApiService();
export default operationsApi;