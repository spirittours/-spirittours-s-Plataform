// Booking Types for Spirit Tours Platform

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  NO_SHOW = 'no_show',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  dateOfBirth?: string;
  passportNumber?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  dietaryRestrictions?: string[];
  specialRequests?: string;
}

export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  dateOfBirth?: string;
  passportNumber?: string;
  dietaryRestrictions?: string[];
  specialNeeds?: string;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paymentDate: string;
  dueDate?: string;
  description?: string;
}

export interface BookingTimeline {
  id: string;
  event: string;
  description: string;
  timestamp: string;
  actor?: string;
  metadata?: Record<string, any>;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  tourId: string;
  tourTitle: string;
  tourSlug?: string;
  tourImage?: string;
  customer: Customer;
  participants: Participant[];
  totalParticipants: number;
  bookingDate: string;
  tourStartDate: string;
  tourEndDate: string;
  duration: {
    days: number;
    nights: number;
  };
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  pricing: {
    basePrice: number;
    currency: string;
    subtotal: number;
    discount: number;
    tax: number;
    serviceFee: number;
    total: number;
    breakdown: {
      adults: number;
      children: number;
      infants: number;
    };
  };
  payments: Payment[];
  specialRequests?: string;
  internalNotes?: string;
  cancellationPolicy?: string;
  cancellationReason?: string;
  refundAmount?: number;
  guideAssigned?: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  timeline: BookingTimeline[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  tags?: string[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface BookingFilters {
  status?: BookingStatus[];
  paymentStatus?: PaymentStatus[];
  tourId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  priority?: string[];
  tags?: string[];
}

export interface BookingListResponse {
  bookings: Booking[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface BookingStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  bookingsByStatus: Record<BookingStatus, number>;
  bookingsByMonth: {
    month: string;
    count: number;
    revenue: number;
  }[];
}

export interface BookingFormData {
  tourId: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    dateOfBirth?: string;
    passportNumber?: string;
  };
  participants: {
    firstName: string;
    lastName: string;
    age: number;
    dateOfBirth?: string;
    passportNumber?: string;
    dietaryRestrictions?: string[];
    specialNeeds?: string;
  }[];
  tourStartDate: string;
  specialRequests?: string;
  internalNotes?: string;
  paymentMethod?: PaymentMethod;
  depositAmount?: number;
  tags?: string[];
}

export interface CancellationRequest {
  bookingId: string;
  reason: string;
  refundAmount?: number;
  refundMethod?: PaymentMethod;
  notes?: string;
}

export interface BookingModification {
  bookingId: string;
  newStartDate?: string;
  newParticipants?: Participant[];
  addedServices?: string[];
  removedServices?: string[];
  priceAdjustment?: number;
  reason?: string;
}

export interface BulkBookingAction {
  bookingIds: string[];
  action: 'confirm' | 'cancel' | 'tag' | 'assign_guide' | 'change_status';
  params?: Record<string, any>;
}

export interface BookingExportOptions {
  filters?: BookingFilters;
  format: 'csv' | 'excel' | 'pdf';
  columns?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface BookingNotification {
  id: string;
  bookingId: string;
  type: 'confirmation' | 'reminder' | 'cancellation' | 'modification' | 'payment';
  recipient: string;
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
}

export interface BookingAvailabilityCheck {
  tourId: string;
  date: string;
  participants: number;
  available: boolean;
  spotsLeft?: number;
  alternativeDates?: string[];
  pricing?: {
    basePrice: number;
    total: number;
    currency: string;
  };
}
