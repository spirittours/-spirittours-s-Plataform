/**
 * Email API Client
 * TypeScript client for Spirit Tours Intelligent Email System
 * 
 * @author Spirit Tours Development Team
 * @created 2025-10-04
 * @phase 1 - Email Foundation
 */

import axios, { AxiosInstance } from 'axios';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type EmailCategory = 
  | 'sales' | 'b2b' | 'ota' | 'wholesale' | 'partnerships'
  | 'regional_mexico' | 'regional_usa' | 'regional_jordan' | 'regional_israel'
  | 'regional_spain' | 'regional_europe' | 'regional_latam'
  | 'reservations' | 'operations' | 'itinerary' | 'groups'
  | 'confirmation' | 'support' | 'feedback'
  | 'suppliers_hotels' | 'suppliers_transport' | 'suppliers_guides' | 'suppliers_vendors'
  | 'corporate_info' | 'corporate_finance' | 'corporate_hr' | 'corporate_legal'
  | 'marketing' | 'social_media' | 'press' | 'newsletter'
  | 'pilgrimages' | 'religious_tours' | 'faith' | 'holyland'
  | 'other';

export type EmailIntent = 
  | 'query' | 'complaint' | 'booking' | 'modification' | 'cancellation'
  | 'information' | 'partnership' | 'quotation' | 'confirmation'
  | 'feedback' | 'urgent' | 'other';

export type EmailPriority = 'urgent' | 'high' | 'normal' | 'low';

export type EmailStatus = 
  | 'received' | 'classified' | 'analyzing' | 'analyzed' | 'routed'
  | 'assigned' | 'in_progress' | 'pending_response' | 'responded'
  | 'auto_responded' | 'resolved' | 'closed' | 'archived';

export type ResponseType = 'manual' | 'auto_template' | 'ai_generated' | 'hybrid';

export type EmailLanguage = 'es' | 'en' | 'pt' | 'fr' | 'it' | 'de' | 'he' | 'ar' | 'other';

export interface EmailAccount {
  id: string;
  email_address: string;
  display_name: string;
  category: EmailCategory;
  description?: string;
  is_active: boolean;
  auto_response_enabled: boolean;
  ai_processing_enabled: boolean;
  total_received: number;
  total_sent: number;
  avg_response_time_minutes?: number;
  created_at: string;
  last_sync_at?: string;
}

export interface EmailMessage {
  id: string;
  account_id: string;
  message_id: string;
  thread_id?: string;
  from_email: string;
  from_name?: string;
  to_emails: string[];
  subject: string;
  body_text?: string;
  body_html?: string;
  received_at: string;
  category?: EmailCategory;
  intent?: EmailIntent;
  priority: EmailPriority;
  status: EmailStatus;
  sentiment?: string;
  sentiment_score?: number;
  assigned_user_id?: string;
  requires_response: boolean;
  auto_response_sent: boolean;
  is_read: boolean;
  is_important: boolean;
  response_deadline?: string;
  extracted_entities?: Record<string, any>;
  keywords?: string[];
}

export interface EmailClassification {
  category: EmailCategory;
  category_confidence: number;
  intent: EmailIntent;
  intent_confidence: number;
  priority: EmailPriority;
  keywords_detected?: string[];
  classification_method: string;
  processing_time_ms?: number;
}

export interface EmailDashboard {
  success: boolean;
  total_received_today: number;
  total_pending_response: number;
  total_urgent: number;
  avg_response_time_minutes: number;
  sla_compliance_rate: number;
  sentiment_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
  intent_distribution: Record<string, number>;
  priority_distribution: Record<string, number>;
  recent_emails: EmailMessage[];
  within_sla: number;
  breached_sla: number;
}

export interface EmailAnalytics {
  date: string;
  account_id?: string;
  category?: EmailCategory;
  total_received: number;
  total_sent: number;
  avg_response_time?: number;
  sla_compliance_rate?: number;
  sentiment_positive_count: number;
  sentiment_negative_count: number;
  sentiment_neutral_count: number;
  status_distribution?: Record<string, number>;
  priority_distribution?: Record<string, number>;
  intent_distribution?: Record<string, number>;
}

// ============================================================================
// REQUEST MODELS
// ============================================================================

export interface CreateEmailAccountRequest {
  email_address: string;
  display_name: string;
  category: EmailCategory;
  provider?: 'gmail' | 'microsoft365';
  description?: string;
  auto_response_enabled?: boolean;
  ai_processing_enabled?: boolean;
  sla_response_time_hours?: number;
}

export interface EmailListRequest {
  account_id?: string;
  category?: EmailCategory;
  status?: EmailStatus;
  priority?: EmailPriority;
  assigned_user_id?: string;
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface ClassifyEmailRequest {
  email_id: string;
}

export interface AssignEmailRequest {
  email_id: string;
  user_id: string;
}

export interface UpdateEmailStatusRequest {
  email_id: string;
  status: EmailStatus;
}

export interface SendResponseRequest {
  email_id: string;
  response_body_text: string;
  response_body_html?: string;
  response_type?: ResponseType;
  attachments?: Array<{
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
}

export interface AnalyticsTimeSeriesRequest {
  start_date: string;
  end_date: string;
  account_id?: string;
  category?: EmailCategory;
}

// ============================================================================
// RESPONSE MODELS
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface EmailListResponse {
  success: boolean;
  emails: EmailMessage[];
  total: number;
  limit: number;
  offset: number;
}

export interface EmailAccountsResponse {
  success: boolean;
  accounts: EmailAccount[];
  total: number;
}

export interface ClassificationResponse {
  success: boolean;
  category: EmailCategory;
  category_confidence: number;
  intent: EmailIntent;
  intent_confidence: number;
  priority: EmailPriority;
  sentiment?: string;
  sentiment_score?: number;
  keywords?: string[];
  processing_time_ms?: number;
}

// ============================================================================
// EMAIL API CLIENT
// ============================================================================

class EmailApi {
  private client: AxiosInstance;

  constructor(baseURL: string = '/api/email') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token interceptor
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // ========================================================================
  // EMAIL ACCOUNTS
  // ========================================================================

  async getEmailAccounts(activeOnly: boolean = true): Promise<EmailAccountsResponse> {
    const response = await this.client.get('/accounts', {
      params: { active_only: activeOnly },
    });
    return response.data;
  }

  async getEmailAccount(accountId: string): Promise<ApiResponse<{ account: EmailAccount }>> {
    const response = await this.client.get(`/accounts/${accountId}`);
    return response.data;
  }

  async createEmailAccount(request: CreateEmailAccountRequest): Promise<ApiResponse<{ account: EmailAccount }>> {
    const response = await this.client.post('/accounts', request);
    return response.data;
  }

  // ========================================================================
  // EMAIL MESSAGES
  // ========================================================================

  async listEmails(request: EmailListRequest = {}): Promise<EmailListResponse> {
    const response = await this.client.post('/list', request);
    return response.data;
  }

  async getEmail(emailId: string): Promise<ApiResponse<{ email: EmailMessage }>> {
    const response = await this.client.get(`/messages/${emailId}`);
    return response.data;
  }

  async classifyEmail(emailId: string): Promise<ClassificationResponse> {
    const response = await this.client.post('/classify', { email_id: emailId });
    return response.data;
  }

  async assignEmail(emailId: string, userId: string): Promise<ApiResponse> {
    const response = await this.client.post('/assign', { email_id: emailId, user_id: userId });
    return response.data;
  }

  async updateEmailStatus(emailId: string, status: EmailStatus): Promise<ApiResponse> {
    const response = await this.client.post('/update-status', { email_id: emailId, status });
    return response.data;
  }

  async sendResponse(request: SendResponseRequest): Promise<ApiResponse> {
    const response = await this.client.post('/send-response', request);
    return response.data;
  }

  // ========================================================================
  // EMAIL ANALYTICS
  // ========================================================================

  async getDashboard(accountId?: string): Promise<EmailDashboard> {
    const response = await this.client.get('/dashboard', {
      params: accountId ? { account_id: accountId } : {},
    });
    return response.data;
  }

  async getAnalyticsTimeSeries(request: AnalyticsTimeSeriesRequest): Promise<ApiResponse<{
    analytics: EmailAnalytics[];
    start_date: string;
    end_date: string;
    total_days: number;
  }>> {
    const response = await this.client.post('/analytics/time-series', request);
    return response.data;
  }

  async getStatsSummary(days: number = 7, accountId?: string): Promise<ApiResponse<{
    period_days: number;
    start_date: string;
    end_date: string;
    summary: {
      total_received: number;
      total_sent: number;
      avg_response_time_minutes: number;
      avg_sla_compliance_rate: number;
      daily_avg_received: number;
    };
    daily_analytics: EmailAnalytics[];
  }>> {
    const response = await this.client.get('/stats/summary', {
      params: { days, ...(accountId && { account_id: accountId }) },
    });
    return response.data;
  }

  // ========================================================================
  // HEALTH CHECK
  // ========================================================================

  async healthCheck(): Promise<ApiResponse<{
    status: string;
    active_accounts: number;
    timestamp: string;
  }>> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const emailApi = new EmailApi();

export default emailApi;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getCategoryLabel = (category: EmailCategory): string => {
  const labels: Record<EmailCategory, string> = {
    sales: 'Sales',
    b2b: 'B2B',
    ota: 'OTA',
    wholesale: 'Wholesale',
    partnerships: 'Partnerships',
    regional_mexico: 'Mexico',
    regional_usa: 'USA',
    regional_jordan: 'Jordan',
    regional_israel: 'Israel',
    regional_spain: 'Spain',
    regional_europe: 'Europe',
    regional_latam: 'LATAM',
    reservations: 'Reservations',
    operations: 'Operations',
    itinerary: 'Itinerary',
    groups: 'Groups',
    confirmation: 'Confirmation',
    support: 'Support',
    feedback: 'Feedback',
    suppliers_hotels: 'Hotels',
    suppliers_transport: 'Transport',
    suppliers_guides: 'Guides',
    suppliers_vendors: 'Vendors',
    corporate_info: 'Info',
    corporate_finance: 'Finance',
    corporate_hr: 'HR',
    corporate_legal: 'Legal',
    marketing: 'Marketing',
    social_media: 'Social Media',
    press: 'Press',
    newsletter: 'Newsletter',
    pilgrimages: 'Pilgrimages',
    religious_tours: 'Religious Tours',
    faith: 'Faith',
    holyland: 'Holy Land',
    other: 'Other',
  };
  return labels[category] || category;
};

export const getIntentLabel = (intent: EmailIntent): string => {
  const labels: Record<EmailIntent, string> = {
    query: 'Query',
    complaint: 'Complaint',
    booking: 'Booking',
    modification: 'Modification',
    cancellation: 'Cancellation',
    information: 'Information',
    partnership: 'Partnership',
    quotation: 'Quotation',
    confirmation: 'Confirmation',
    feedback: 'Feedback',
    urgent: 'Urgent',
    other: 'Other',
  };
  return labels[intent] || intent;
};

export const getPriorityColor = (priority: EmailPriority): string => {
  const colors: Record<EmailPriority, string> = {
    urgent: '#FF4842',
    high: '#FF9800',
    normal: '#4CAF50',
    low: '#2196F3',
  };
  return colors[priority];
};

export const getStatusColor = (status: EmailStatus): string => {
  const colors: Record<EmailStatus, string> = {
    received: '#9E9E9E',
    classified: '#607D8B',
    analyzing: '#3F51B5',
    analyzed: '#2196F3',
    routed: '#00BCD4',
    assigned: '#009688',
    in_progress: '#FFC107',
    pending_response: '#FF9800',
    responded: '#8BC34A',
    auto_responded: '#4CAF50',
    resolved: '#66BB6A',
    closed: '#9C27B0',
    archived: '#757575',
  };
  return colors[status];
};

export const formatResponseTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};
