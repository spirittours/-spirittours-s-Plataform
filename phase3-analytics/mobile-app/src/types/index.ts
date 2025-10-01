/**
 * PHASE 3: Mobile Analytics App - Type Definitions
 * Comprehensive type definitions for the executive mobile analytics dashboard
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'executive' | 'manager' | 'analyst' | 'viewer';
  avatar?: string;
  department: string;
  permissions: Permission[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  defaultDashboard: string;
  notificationSettings: NotificationSettings;
  language: string;
  timezone: string;
  refreshInterval: number; // in seconds
}

export interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  alertThresholds: {
    revenue: number;
    users: number;
    errors: number;
    performance: number;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
  };
}

export interface Permission {
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'admin')[];
}

// Analytics Data Types
export interface MetricData {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  format: 'currency' | 'number' | 'percentage' | 'duration';
  unit?: string;
  target?: number;
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
}

export interface ChartData {
  labels: string[];
  datasets: Dataset[];
}

export interface Dataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
}

export interface TimeSeriesData {
  timestamp: string;
  metrics: { [key: string]: number };
}

// Dashboard Types
export interface DashboardConfig {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
  layout: LayoutConfig;
  refreshInterval: number;
  filters: FilterConfig[];
  permissions: Permission[];
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  subtitle?: string;
  config: WidgetConfig;
  position: WidgetPosition;
  size: WidgetSize;
  dataSource: DataSource;
  refreshInterval?: number;
}

export type WidgetType = 
  | 'metric' 
  | 'chart' 
  | 'table' 
  | 'map' 
  | 'gauge' 
  | 'progress' 
  | 'list' 
  | 'calendar'
  | 'funnel'
  | 'heatmap';

export interface WidgetConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  colors?: string[];
  thresholds?: Threshold[];
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  timeRange?: TimeRange;
  groupBy?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface WidgetPosition {
  x: number;
  y: number;
  row: number;
  col: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface LayoutConfig {
  columns: number;
  rowHeight: number;
  margin: [number, number];
  containerPadding: [number, number];
  breakpoints: { [key: string]: number };
  cols: { [key: string]: number };
}

// Data Source Types
export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'database' | 'file' | 'stream';
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: { [key: string]: string };
  params?: { [key: string]: any };
  authentication?: Authentication;
  caching?: CachingConfig;
}

export interface Authentication {
  type: 'bearer' | 'basic' | 'apikey' | 'oauth';
  credentials: { [key: string]: string };
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  strategy: 'memory' | 'storage' | 'hybrid';
}

// Filter Types
export interface FilterConfig {
  id: string;
  name: string;
  type: 'select' | 'multiselect' | 'daterange' | 'text' | 'number' | 'boolean';
  options?: FilterOption[];
  defaultValue?: any;
  required?: boolean;
  dependencies?: string[];
}

export interface FilterOption {
  label: string;
  value: string | number;
  color?: string;
}

export interface TimeRange {
  start: Date | string;
  end: Date | string;
  preset?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom';
}

export interface Threshold {
  value: number;
  condition: '>' | '<' | '>=' | '<=' | '=' | '!=';
  color: string;
  label?: string;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: APIError;
  metadata?: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Analytics Specific Types
export interface BusinessMetrics {
  revenue: MetricData;
  users: MetricData;
  conversion: MetricData;
  churn: MetricData;
  ltv: MetricData; // Lifetime Value
  cac: MetricData; // Customer Acquisition Cost
  mrr: MetricData; // Monthly Recurring Revenue
  arr: MetricData; // Annual Recurring Revenue
}

export interface SystemMetrics {
  uptime: MetricData;
  responseTime: MetricData;
  errorRate: MetricData;
  throughput: MetricData;
  memoryUsage: MetricData;
  cpuUsage: MetricData;
  diskUsage: MetricData;
  networkLatency: MetricData;
}

export interface UserAnalytics {
  activeUsers: TimeSeriesData[];
  newUsers: TimeSeriesData[];
  sessionDuration: TimeSeriesData[];
  pageViews: TimeSeriesData[];
  bounceRate: TimeSeriesData[];
  usersByLocation: { [country: string]: number };
  usersByDevice: { [device: string]: number };
  usersByChannel: { [channel: string]: number };
}

export interface SalesAnalytics {
  revenue: TimeSeriesData[];
  orders: TimeSeriesData[];
  averageOrderValue: TimeSeriesData[];
  conversionFunnel: FunnelData[];
  topProducts: ProductData[];
  salesByRegion: { [region: string]: number };
  salesByChannel: { [channel: string]: number };
}

export interface FunnelData {
  stage: string;
  value: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface ProductData {
  id: string;
  name: string;
  revenue: number;
  units: number;
  growth: number;
  category: string;
}

// Real-time Updates
export interface RealtimeUpdate {
  type: 'metric' | 'alert' | 'event' | 'notification';
  data: any;
  timestamp: string;
  source: string;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  source: string;
  metric?: string;
  value?: number;
  threshold?: number;
  resolved?: boolean;
}

// Navigation Types
export interface NavigationRoute {
  name: string;
  component: React.ComponentType<any>;
  options?: any;
  initialParams?: any;
}

export interface TabRoute {
  name: string;
  component: React.ComponentType<any>;
  tabBarIcon: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  tabBarLabel: string;
}

// Theme Types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    accent: string;
    error: string;
    warning: string;
    success: string;
    info: string;
    text: string;
    textSecondary: string;
    border: string;
    disabled: string;
    placeholder: string;
  };
  fonts: {
    regular: string;
    medium: string;
    bold: string;
    light: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadows: {
    sm: any;
    md: any;
    lg: any;
  };
}

// Export Types
export interface ExportConfig {
  format: 'pdf' | 'excel' | 'csv' | 'png' | 'jpg';
  filename?: string;
  includeCharts: boolean;
  includeData: boolean;
  dateRange: TimeRange;
  widgets: string[]; // Widget IDs to include
}

// Offline Support
export interface OfflineData {
  dashboards: DashboardConfig[];
  metrics: MetricData[];
  lastSync: string;
  version: string;
}

// Security Types
export interface SecurityConfig {
  biometricEnabled: boolean;
  pinEnabled: boolean;
  sessionTimeout: number; // in minutes
  autoLock: boolean;
  dataEncryption: boolean;
}

// App State Types
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  theme: Theme;
  dashboards: DashboardConfig[];
  currentDashboard: string | null;
  metrics: { [key: string]: MetricData };
  alerts: Alert[];
  isOnline: boolean;
  isLoading: boolean;
  error: string | null;
}

// Utility Types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Hook Return Types
export interface UseAPIReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseRealtimeReturn {
  connected: boolean;
  lastUpdate: string | null;
  subscribe: (channel: string, callback: (data: any) => void) => void;
  unsubscribe: (channel: string) => void;
}

// Component Props Types
export interface BaseComponentProps {
  testID?: string;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export interface WidgetProps extends BaseComponentProps {
  widget: Widget;
  data: any;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onEdit?: () => void;
}

export interface ChartProps extends BaseComponentProps {
  data: ChartData;
  type: WidgetConfig['chartType'];
  config: WidgetConfig;
  width?: number;
  height?: number;
}