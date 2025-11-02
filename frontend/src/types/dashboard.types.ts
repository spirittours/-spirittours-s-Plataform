/**
 * Dashboard & Analytics Type Definitions
 * Comprehensive types for business intelligence and reporting
 */

// ============================================================================
// Dashboard Overview
// ============================================================================

export interface DashboardStats {
  totalRevenue: number;
  totalBookings: number;
  activeCustomers: number;
  averageBookingValue: number;
  
  // Period comparisons
  revenueGrowth: number; // percentage
  bookingsGrowth: number;
  customersGrowth: number;
  
  // Current period
  pendingBookings: number;
  upcomingTours: number;
  newCustomersThisMonth: number;
}

export interface RevenueData {
  period: string; // 'day', 'week', 'month', 'year'
  data: {
    date: string;
    revenue: number;
    bookings: number;
  }[];
  total: number;
  average: number;
  peak: {
    date: string;
    revenue: number;
  };
}

export interface BookingsData {
  period: string;
  data: {
    date: string;
    confirmed: number;
    pending: number;
    cancelled: number;
    completed: number;
  }[];
  totals: {
    confirmed: number;
    pending: number;
    cancelled: number;
    completed: number;
  };
  conversionRate: number;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  retentionRate: number;
  churnRate: number;
  lifetimeValue: number;
  
  // Segmentation
  byTier: Record<string, number>;
  bySource: Record<string, number>;
  topCustomers: {
    id: string;
    name: string;
    totalSpent: number;
    bookings: number;
  }[];
}

export interface TourPerformance {
  tourId: string;
  tourTitle: string;
  totalBookings: number;
  revenue: number;
  averageRating: number;
  capacity: number;
  occupancyRate: number;
}

// ============================================================================
// Chart Data Types
// ============================================================================

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  category?: string;
}

export interface MultiSeriesData {
  timestamp: string;
  [key: string]: number | string;
}

// ============================================================================
// Report Types
// ============================================================================

export enum ReportType {
  REVENUE = 'revenue',
  BOOKINGS = 'bookings',
  CUSTOMERS = 'customers',
  TOURS = 'tours',
  PAYMENTS = 'payments',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

export enum DateRange {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_QUARTER = 'this_quarter',
  LAST_QUARTER = 'last_quarter',
  THIS_YEAR = 'this_year',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom',
}

export interface ReportConfig {
  type: ReportType;
  format: ReportFormat;
  dateRange: DateRange;
  startDate?: string;
  endDate?: string;
  filters?: Record<string, any>;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  includeCharts?: boolean;
  includeSummary?: boolean;
}

export interface GeneratedReport {
  id: string;
  config: ReportConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

// ============================================================================
// KPI Definitions
// ============================================================================

export interface KPI {
  id: string;
  name: string;
  value: number;
  target?: number;
  unit: string; // '$', '%', 'count', etc.
  trend: 'up' | 'down' | 'neutral';
  changePercentage: number;
  category: 'revenue' | 'operations' | 'customers' | 'marketing';
}

export interface KPIWidget {
  kpi: KPI;
  chartData?: ChartDataPoint[];
  icon?: string;
  color?: string;
}

// ============================================================================
// Analytics Filters
// ============================================================================

export interface AnalyticsFilters {
  dateRange: DateRange;
  startDate?: string;
  endDate?: string;
  tourCategory?: string[];
  tourId?: string[];
  customerId?: string[];
  status?: string[];
  paymentMethod?: string[];
  region?: string[];
}
