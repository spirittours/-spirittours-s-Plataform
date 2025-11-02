/**
 * Customer Management Type Definitions
 * Comprehensive TypeScript types for CRM functionality
 */

// ============================================================================
// Customer Status & Classification
// ============================================================================

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  VIP = 'vip',
  BLOCKED = 'blocked',
  PENDING = 'pending',
}

export enum CustomerTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

export enum CustomerSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  AGENT = 'agent',
  WALK_IN = 'walk_in',
  PARTNER = 'partner',
  OTHER = 'other',
}

export enum PreferredContactMethod {
  EMAIL = 'email',
  PHONE = 'phone',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
}

export enum DocumentType {
  PASSPORT = 'passport',
  NATIONAL_ID = 'national_id',
  DRIVERS_LICENSE = 'drivers_license',
  OTHER = 'other',
}

// ============================================================================
// Core Customer Interface
// ============================================================================

export interface Customer {
  id: string;
  customerNumber: string; // Auto-generated unique identifier (e.g., "CUST-2024-00001")
  
  // Personal Information
  firstName: string;
  lastName: string;
  fullName: string; // Computed: firstName + lastName
  email: string;
  phone: string;
  secondaryPhone?: string;
  dateOfBirth?: string; // ISO format
  nationality?: string;
  
  // Address Information
  address: Address;
  
  // Customer Status & Classification
  status: CustomerStatus;
  tier: CustomerTier;
  source: CustomerSource;
  preferredContactMethod: PreferredContactMethod;
  
  // Travel Documents
  documents: TravelDocument[];
  
  // Preferences
  preferences: CustomerPreferences;
  
  // Statistics
  stats: CustomerStats;
  
  // Financial
  totalSpent: number;
  currency: string;
  outstandingBalance: number;
  creditLimit?: number;
  
  // Relationships
  emergencyContact?: EmergencyContact;
  travelCompanions: TravelCompanion[];
  assignedAgent?: string; // Agent/representative ID
  
  // Communication
  emailVerified: boolean;
  phoneVerified: boolean;
  marketingConsent: boolean;
  smsConsent: boolean;
  
  // Notes & Tags
  tags: string[];
  notes: CustomerNote[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastBookingDate?: string;
  lastContactDate?: string;
  
  // Loyalty Program
  loyaltyPoints: number;
  loyaltyTier: CustomerTier;
  memberSince: string;
}

// ============================================================================
// Address Information
// ============================================================================

export interface Address {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  formatted?: string; // Full formatted address
}

// ============================================================================
// Travel Documents
// ============================================================================

export interface TravelDocument {
  id: string;
  type: DocumentType;
  number: string;
  issuingCountry: string;
  issueDate: string;
  expiryDate: string;
  isValid: boolean; // Computed based on expiry
  fileUrl?: string; // Uploaded document scan
}

// ============================================================================
// Customer Preferences
// ============================================================================

export interface CustomerPreferences {
  // Travel Preferences
  preferredTourCategories: string[]; // Tour category IDs
  dietaryRestrictions: string[];
  accessibilityNeeds: string[];
  roomPreference?: 'single' | 'double' | 'twin' | 'suite';
  bedPreference?: 'single' | 'double' | 'king' | 'queen';
  smokingPreference?: 'smoking' | 'non-smoking';
  
  // Communication Preferences
  language: string;
  timezone: string;
  receiveNewsletter: boolean;
  receivePromotions: boolean;
  receiveBookingReminders: boolean;
  
  // Special Requests (common)
  frequentSpecialRequests: string[];
  
  // Notification Settings
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  pushNotifications: boolean;
}

// ============================================================================
// Customer Statistics
// ============================================================================

export interface CustomerStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowCount: number;
  
  averageBookingValue: number;
  totalRevenue: number;
  lifetimeValue: number;
  
  lastBookingDate?: string;
  nextBookingDate?: string;
  averageBookingsPerYear: number;
  
  referralsCount: number;
  reviewsCount: number;
  averageRating?: number;
  
  // Engagement metrics
  emailOpenRate?: number;
  emailClickRate?: number;
  responseRate?: number;
}

// ============================================================================
// Emergency Contact
// ============================================================================

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
}

// ============================================================================
// Travel Companions
// ============================================================================

export interface TravelCompanion {
  id: string;
  customerId?: string; // If companion is also a customer
  firstName: string;
  lastName: string;
  relationship: string; // 'spouse', 'partner', 'friend', 'family', etc.
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  frequency: number; // Number of trips together
}

// ============================================================================
// Customer Notes
// ============================================================================

export interface CustomerNote {
  id: string;
  content: string;
  category: NoteCategory;
  isPinned: boolean;
  isPrivate: boolean; // Only visible to certain roles
  createdBy: string; // User ID
  createdByName: string; // User name for display
  createdAt: string;
  updatedAt?: string;
  attachments?: NoteAttachment[];
}

export enum NoteCategory {
  GENERAL = 'general',
  PREFERENCE = 'preference',
  COMPLAINT = 'complaint',
  COMPLIMENT = 'compliment',
  PAYMENT = 'payment',
  SPECIAL_REQUEST = 'special_request',
  MEDICAL = 'medical',
  BEHAVIORAL = 'behavioral',
}

export interface NoteAttachment {
  id: string;
  filename: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

// ============================================================================
// Customer Activity Timeline
// ============================================================================

export interface CustomerActivity {
  id: string;
  customerId: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, any>; // Additional contextual data
  performedBy?: string; // User ID who performed the action
  performedByName?: string;
  timestamp: string;
  icon?: string; // Material-UI icon name
  color?: string; // Timeline dot color
}

export enum ActivityType {
  // Booking Activities
  BOOKING_CREATED = 'booking_created',
  BOOKING_MODIFIED = 'booking_modified',
  BOOKING_CANCELLED = 'booking_cancelled',
  BOOKING_COMPLETED = 'booking_completed',
  
  // Payment Activities
  PAYMENT_RECEIVED = 'payment_received',
  REFUND_ISSUED = 'refund_issued',
  
  // Communication Activities
  EMAIL_SENT = 'email_sent',
  SMS_SENT = 'sms_sent',
  CALL_MADE = 'call_made',
  MEETING_SCHEDULED = 'meeting_scheduled',
  
  // Account Activities
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_UPDATED = 'account_updated',
  STATUS_CHANGED = 'status_changed',
  TIER_UPGRADED = 'tier_upgraded',
  
  // Engagement Activities
  REVIEW_SUBMITTED = 'review_submitted',
  REFERRAL_MADE = 'referral_made',
  NEWSLETTER_SUBSCRIBED = 'newsletter_subscribed',
  PROMOTION_CLAIMED = 'promotion_claimed',
  
  // Other
  NOTE_ADDED = 'note_added',
  DOCUMENT_UPLOADED = 'document_uploaded',
}

// ============================================================================
// Customer Filters & Search
// ============================================================================

export interface CustomerFilters {
  search?: string; // Search across name, email, phone, customerNumber
  status?: CustomerStatus[];
  tier?: CustomerTier[];
  source?: CustomerSource[];
  tags?: string[];
  
  // Date filters
  createdAfter?: string;
  createdBefore?: string;
  lastBookingAfter?: string;
  lastBookingBefore?: string;
  
  // Financial filters
  minTotalSpent?: number;
  maxTotalSpent?: number;
  hasOutstandingBalance?: boolean;
  
  // Statistics filters
  minBookings?: number;
  maxBookings?: number;
  hasUpcomingBooking?: boolean;
  
  // Engagement filters
  marketingConsent?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  
  // Location filters
  country?: string[];
  city?: string[];
  
  // Assignment
  assignedAgent?: string;
  unassigned?: boolean;
}

// ============================================================================
// Customer Form Data (for create/edit)
// ============================================================================

export interface CustomerFormData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  secondaryPhone?: string;
  dateOfBirth?: string;
  nationality?: string;
  
  // Address
  address?: Address;
  
  // Status & Classification
  status?: CustomerStatus;
  tier?: CustomerTier;
  source?: CustomerSource;
  preferredContactMethod?: PreferredContactMethod;
  
  // Emergency Contact
  emergencyContact?: EmergencyContact;
  
  // Communication
  marketingConsent?: boolean;
  smsConsent?: boolean;
  
  // Tags
  tags?: string[];
  
  // Assignment
  assignedAgent?: string;
  
  // Initial Note
  initialNote?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface CustomersListResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerDetailResponse {
  customer: Customer;
  recentActivity: CustomerActivity[];
  upcomingBookings: any[]; // Booking[] from booking.types.ts
  pastBookings: any[];
}

export interface CustomerStatsResponse {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  vipCustomers: number;
  
  byTier: Record<CustomerTier, number>;
  bySource: Record<CustomerSource, number>;
  byStatus: Record<CustomerStatus, number>;
  
  averageLifetimeValue: number;
  totalRevenue: number;
  
  topCustomers: Customer[]; // By total spent
  recentCustomers: Customer[]; // Recently created
}

// ============================================================================
// Bulk Operations
// ============================================================================

export interface BulkCustomerAction {
  action: 'export' | 'delete' | 'change_status' | 'change_tier' | 'assign_agent' | 'add_tag' | 'remove_tag';
  customerIds: string[];
  params?: {
    status?: CustomerStatus;
    tier?: CustomerTier;
    agentId?: string;
    tag?: string;
  };
}

export interface BulkActionResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors?: Array<{
    customerId: string;
    error: string;
  }>;
}

// ============================================================================
// Export Types
// ============================================================================

export interface CustomerExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  fields: string[]; // Which fields to include
  filters?: CustomerFilters;
  includeNotes?: boolean;
  includeBookingHistory?: boolean;
}
