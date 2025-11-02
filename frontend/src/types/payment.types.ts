/**
 * Payment Integration Type Definitions
 * Comprehensive TypeScript types for payment processing
 */

// ============================================================================
// Payment Status & Types
// ============================================================================

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  CRYPTO = 'crypto',
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  SQUARE = 'square',
  INTERNAL = 'internal',
}

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum RefundReason {
  CUSTOMER_REQUEST = 'customer_request',
  DUPLICATE_PAYMENT = 'duplicate_payment',
  FRAUDULENT = 'fraudulent',
  PRODUCT_NOT_RECEIVED = 'product_not_received',
  PRODUCT_UNACCEPTABLE = 'product_unacceptable',
  BOOKING_CANCELLED = 'booking_cancelled',
  OTHER = 'other',
}

export enum CardBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMEX = 'amex',
  DISCOVER = 'discover',
  DINERS = 'diners',
  JCB = 'jcb',
  UNIONPAY = 'unionpay',
  UNKNOWN = 'unknown',
}

// ============================================================================
// Core Payment Interface
// ============================================================================

export interface Payment {
  id: string;
  paymentNumber: string; // Auto-generated unique identifier (e.g., "PAY-2024-00001")
  
  // Related Entities
  bookingId: string;
  customerId: string;
  
  // Payment Details
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  provider: PaymentProvider;
  
  // Provider-specific
  providerPaymentId?: string; // Stripe charge ID, PayPal transaction ID, etc.
  providerCustomerId?: string;
  
  // Payment Method Details
  paymentMethodDetails?: PaymentMethodDetails;
  
  // Transaction Info
  description: string;
  receiptUrl?: string;
  receiptNumber?: string;
  
  // Refund Information
  refundable: boolean;
  refundedAmount: number;
  refunds: Refund[];
  
  // Failure Information
  failureCode?: string;
  failureMessage?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  notes?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  
  // Audit
  createdBy?: string;
  createdByName?: string;
}

// ============================================================================
// Payment Method Details
// ============================================================================

export interface PaymentMethodDetails {
  type: PaymentMethod;
  
  // Card Details (for card payments)
  card?: {
    brand: CardBrand;
    last4: string;
    expMonth: number;
    expYear: number;
    fingerprint?: string;
    country?: string;
    funding?: 'credit' | 'debit' | 'prepaid' | 'unknown';
  };
  
  // Bank Account Details (for bank transfers)
  bankAccount?: {
    accountHolderName: string;
    accountNumberLast4: string;
    bankName: string;
    routingNumber?: string;
  };
  
  // PayPal Details
  paypal?: {
    email: string;
    payerId?: string;
    payerName?: string;
  };
  
  // Crypto Details
  crypto?: {
    currency: string;
    network: string;
    walletAddress: string;
    transactionHash?: string;
  };
}

// ============================================================================
// Refund Interface
// ============================================================================

export interface Refund {
  id: string;
  refundNumber: string; // Auto-generated (e.g., "REF-2024-00001")
  
  // Related Payment
  paymentId: string;
  
  // Refund Details
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: RefundReason;
  reasonDetails?: string;
  
  // Provider Info
  provider: PaymentProvider;
  providerRefundId?: string;
  
  // Processing
  processedBy?: string;
  processedByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  
  // Failure Info
  failureCode?: string;
  failureMessage?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  notes?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

// ============================================================================
// Saved Payment Methods
// ============================================================================

export interface SavedPaymentMethod {
  id: string;
  customerId: string;
  
  // Provider Info
  provider: PaymentProvider;
  providerPaymentMethodId: string;
  
  // Payment Method Details
  type: PaymentMethod;
  details: PaymentMethodDetails;
  
  // Settings
  isDefault: boolean;
  isActive: boolean;
  
  // Billing Address
  billingAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  
  // Metadata
  nickname?: string; // User-friendly name
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

// ============================================================================
// Payment Intent (for processing)
// ============================================================================

export interface PaymentIntent {
  id: string;
  
  // Amount
  amount: number;
  currency: string;
  
  // Related Entity
  bookingId: string;
  customerId: string;
  
  // Payment Method
  paymentMethodId?: string;
  
  // Status
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  
  // Provider
  provider: PaymentProvider;
  providerIntentId?: string;
  
  // Client Secret (for Stripe Elements)
  clientSecret?: string;
  
  // Metadata
  description: string;
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt: string;
  expiresAt?: string;
}

// ============================================================================
// Payment Form Data
// ============================================================================

export interface PaymentFormData {
  // Amount
  amount: number;
  currency: string;
  
  // Payment Method
  method: PaymentMethod;
  
  // Card Details (for new card payment)
  cardNumber?: string;
  cardholderName?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cvv?: string;
  
  // Use saved payment method
  savedPaymentMethodId?: string;
  
  // Save for future use
  savePaymentMethod?: boolean;
  
  // Billing Address
  billingAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  
  // PayPal
  paypalEmail?: string;
  
  // Bank Transfer
  bankAccountNumber?: string;
  routingNumber?: string;
  accountHolderName?: string;
  
  // Additional Info
  notes?: string;
}

// ============================================================================
// Refund Request
// ============================================================================

export interface RefundRequest {
  paymentId: string;
  amount: number; // Can be partial refund
  reason: RefundReason;
  reasonDetails?: string;
  notes?: string;
}

// ============================================================================
// Payment Filters
// ============================================================================

export interface PaymentFilters {
  search?: string; // Search across payment number, customer name, description
  status?: PaymentStatus[];
  method?: PaymentMethod[];
  provider?: PaymentProvider[];
  
  // Amount filters
  minAmount?: number;
  maxAmount?: number;
  
  // Date filters
  createdAfter?: string;
  createdBefore?: string;
  processedAfter?: string;
  processedBefore?: string;
  
  // Entity filters
  bookingId?: string;
  customerId?: string;
  
  // Refund filters
  hasRefunds?: boolean;
  isFullyRefunded?: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaymentsListResponse {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentDetailResponse {
  payment: Payment;
  booking?: any; // Booking details
  customer?: any; // Customer details
}

export interface PaymentStatsResponse {
  totalPayments: number;
  totalAmount: number;
  totalRefunded: number;
  
  // By Status
  byStatus: Record<PaymentStatus, {
    count: number;
    amount: number;
  }>;
  
  // By Method
  byMethod: Record<PaymentMethod, {
    count: number;
    amount: number;
  }>;
  
  // By Provider
  byProvider: Record<PaymentProvider, {
    count: number;
    amount: number;
  }>;
  
  // Trends
  last30Days: {
    date: string;
    count: number;
    amount: number;
  }[];
  
  // Top Customers
  topCustomers: {
    customerId: string;
    customerName: string;
    totalAmount: number;
    paymentCount: number;
  }[];
}

// ============================================================================
// Stripe-specific Types
// ============================================================================

export interface StripeConfig {
  publishableKey: string;
  secretKey?: string; // Only on backend
  webhookSecret?: string;
}

export interface StripePaymentIntentResult {
  paymentIntent: {
    id: string;
    client_secret: string;
    status: string;
    amount: number;
    currency: string;
  };
}

export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface StripeCardElement {
  // Stripe Elements types (simplified)
  // In practice, use @stripe/stripe-js types
  [key: string]: any;
}

// ============================================================================
// PayPal-specific Types
// ============================================================================

export interface PayPalConfig {
  clientId: string;
  clientSecret?: string; // Only on backend
  mode: 'sandbox' | 'live';
}

export interface PayPalOrder {
  id: string;
  status: string;
  intent: 'CAPTURE' | 'AUTHORIZE';
  purchase_units: {
    amount: {
      currency_code: string;
      value: string;
    };
    description: string;
  }[];
  payer?: {
    email_address: string;
    name?: {
      given_name: string;
      surname: string;
    };
  };
}

export interface PayPalCapture {
  id: string;
  status: string;
  amount: {
    currency_code: string;
    value: string;
  };
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface PaymentWebhookEvent {
  id: string;
  type: string;
  provider: PaymentProvider;
  data: any;
  createdAt: string;
  processed: boolean;
  processedAt?: string;
}

// ============================================================================
// Payment Verification
// ============================================================================

export interface PaymentVerification {
  isValid: boolean;
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  verifiedAt: string;
  errors?: string[];
}

// ============================================================================
// Bulk Operations
// ============================================================================

export interface BulkPaymentAction {
  action: 'export' | 'refund' | 'cancel' | 'mark_as_processed';
  paymentIds: string[];
  params?: {
    refundReason?: RefundReason;
    notes?: string;
  };
}

export interface BulkActionResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors?: Array<{
    paymentId: string;
    error: string;
  }>;
}

// ============================================================================
// Payment Export
// ============================================================================

export interface PaymentExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  fields: string[];
  filters?: PaymentFilters;
  includeRefunds?: boolean;
  includeCustomerDetails?: boolean;
}

// ============================================================================
// Payment Analytics
// ============================================================================

export interface PaymentAnalytics {
  period: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endDate: string;
  
  // Summary
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  
  // Success Rate
  successRate: number;
  failureRate: number;
  
  // Refunds
  totalRefunds: number;
  totalRefundAmount: number;
  refundRate: number;
  
  // By Method
  methodBreakdown: {
    method: PaymentMethod;
    count: number;
    amount: number;
    percentage: number;
  }[];
  
  // Trends
  dailyTrends: {
    date: string;
    revenue: number;
    transactions: number;
    refunds: number;
  }[];
}
