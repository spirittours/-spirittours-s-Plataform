// Settings & Configuration Type Definitions
// Complete type system for system settings, configuration, and preferences

// ============================================================================
// System Settings
// ============================================================================

export interface SystemSettings {
  id: string;
  general: GeneralSettings;
  business: BusinessSettings;
  regional: RegionalSettings;
  security: SecuritySettings;
  features: FeatureFlags;
  updatedAt: Date;
  updatedBy: string;
}

export interface GeneralSettings {
  companyName: string;
  companyLogo: string;
  supportEmail: string;
  supportPhone: string;
  website: string;
  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  currencySymbol: string;
}

export interface BusinessSettings {
  businessHours: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
  holidays: Holiday[];
  bookingLead: number; // Days in advance for booking
  cancellationPolicy: CancellationPolicy;
  refundPolicy: RefundPolicy;
  termsAndConditions: string;
  privacyPolicy: string;
}

export interface DaySchedule {
  isOpen: boolean;
  openTime: string; // HH:mm format
  closeTime: string; // HH:mm format
  breaks?: { start: string; end: string }[];
}

export interface Holiday {
  id: string;
  name: string;
  date: Date;
  recurring: boolean;
  affectsBooking: boolean;
}

export interface CancellationPolicy {
  allowCancellation: boolean;
  freeUntilDays: number;
  partialRefundDays: number;
  partialRefundPercentage: number;
  noRefundWithinDays: number;
}

export interface RefundPolicy {
  processingTime: number; // Days
  method: 'original' | 'credit' | 'both';
  adminFee: number;
  adminFeeType: 'fixed' | 'percentage';
}

export interface RegionalSettings {
  defaultCountry: string;
  supportedCountries: string[];
  supportedLanguages: string[];
  taxRate: number;
  taxInclusive: boolean;
  distanceUnit: 'km' | 'mi';
  weightUnit: 'kg' | 'lb';
}

export interface SecuritySettings {
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number; // Minutes
  maxLoginAttempts: number;
  lockoutDuration: number; // Minutes
  twoFactorRequired: boolean;
  allowedDomains: string[];
  ipWhitelist: string[];
  enableAuditLog: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expiryDays: number;
  preventReuse: number;
}

export interface FeatureFlags {
  enableAI: boolean;
  enableChat: boolean;
  enableVideoCall: boolean;
  enableGPS: boolean;
  enableSocialShare: boolean;
  enableReferrals: boolean;
  enableReviews: boolean;
  enableGiftCards: boolean;
  enableSubscriptions: boolean;
  enableMemberships: boolean;
  maintenanceMode: boolean;
}

// ============================================================================
// Email Templates
// ============================================================================

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: EmailTemplateType;
  category: EmailCategory;
  variables: EmailVariable[];
  isActive: boolean;
  isDefault: boolean;
  language: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export enum EmailTemplateType {
  BOOKING_CONFIRMATION = 'booking_confirmation',
  BOOKING_REMINDER = 'booking_reminder',
  BOOKING_CANCELLATION = 'booking_cancellation',
  PAYMENT_RECEIPT = 'payment_receipt',
  PAYMENT_REMINDER = 'payment_reminder',
  REFUND_CONFIRMATION = 'refund_confirmation',
  CUSTOMER_WELCOME = 'customer_welcome',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  REVIEW_REQUEST = 'review_request',
  PROMOTIONAL = 'promotional',
  NEWSLETTER = 'newsletter',
  CUSTOM = 'custom',
}

export enum EmailCategory {
  TRANSACTIONAL = 'transactional',
  MARKETING = 'marketing',
  NOTIFICATION = 'notification',
  SYSTEM = 'system',
}

export interface EmailVariable {
  key: string;
  label: string;
  description: string;
  example: string;
}

export interface EmailTestRequest {
  templateId: string;
  recipientEmail: string;
  variables: Record<string, any>;
}

// ============================================================================
// Payment Gateway Configuration
// ============================================================================

export interface PaymentGatewayConfig {
  id: string;
  gateway: PaymentGateway;
  isEnabled: boolean;
  isDefault: boolean;
  displayName: string;
  description: string;
  credentials: PaymentCredentials;
  settings: PaymentGatewaySettings;
  supportedCurrencies: string[];
  supportedCountries: string[];
  fees: PaymentFees;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentGateway {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  SQUARE = 'square',
  BRAINTREE = 'braintree',
  AUTHORIZE_NET = 'authorize_net',
  MERCADO_PAGO = 'mercado_pago',
  PAYU = 'payu',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  CUSTOM = 'custom',
}

export interface PaymentCredentials {
  publicKey?: string;
  secretKey?: string;
  merchantId?: string;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  environment: 'sandbox' | 'production';
}

export interface PaymentGatewaySettings {
  autoCapture: boolean;
  requireCVV: boolean;
  requireZipCode: boolean;
  allowSaveCard: boolean;
  threeDSecure: boolean;
  minAmount: number;
  maxAmount: number;
  refundSupport: boolean;
  partialRefundSupport: boolean;
}

export interface PaymentFees {
  fixedFee: number;
  percentageFee: number;
  internationalFee: number;
  chargebackFee: number;
  passFeesToCustomer: boolean;
}

// ============================================================================
// Tour Categories & Tags
// ============================================================================

export interface TourCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  image: string;
  parentId: string | null;
  level: number;
  order: number;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  toursCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TourTag {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string;
  usage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  image: string;
  parentId: string | null;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  isActive: boolean;
}

export interface TagFormData {
  name: string;
  slug: string;
  color: string;
  description: string;
  isActive: boolean;
}

// ============================================================================
// Notification Settings
// ============================================================================

export interface NotificationSettings {
  id: string;
  userId?: string; // null for system-wide settings
  email: EmailNotificationSettings;
  sms: SMSNotificationSettings;
  push: PushNotificationSettings;
  inApp: InAppNotificationSettings;
  channels: NotificationChannel[];
  updatedAt: Date;
}

export interface EmailNotificationSettings {
  enabled: boolean;
  bookingConfirmation: boolean;
  bookingReminder: boolean;
  bookingCancellation: boolean;
  paymentReceipt: boolean;
  paymentReminder: boolean;
  refundConfirmation: boolean;
  reviewRequest: boolean;
  promotional: boolean;
  newsletter: boolean;
  systemUpdates: boolean;
}

export interface SMSNotificationSettings {
  enabled: boolean;
  phoneNumber: string;
  bookingConfirmation: boolean;
  bookingReminder: boolean;
  paymentReminder: boolean;
  emergencyAlerts: boolean;
}

export interface PushNotificationSettings {
  enabled: boolean;
  bookingUpdates: boolean;
  paymentUpdates: boolean;
  promotional: boolean;
  inAppMessages: boolean;
}

export interface InAppNotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  autoMarkRead: boolean;
  readTimeout: number; // Seconds
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'in_app' | 'webhook';
  enabled: boolean;
  priority: number;
  config: Record<string, any>;
}

// ============================================================================
// API Keys & Integrations
// ============================================================================

export interface APIKey {
  id: string;
  name: string;
  key: string;
  secret: string;
  environment: 'sandbox' | 'production';
  permissions: string[];
  rateLimit: number;
  isActive: boolean;
  expiresAt: Date | null;
  lastUsed: Date | null;
  createdAt: Date;
  createdBy: string;
}

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  provider: string;
  isEnabled: boolean;
  credentials: Record<string, any>;
  settings: Record<string, any>;
  webhookUrl: string;
  lastSync: Date | null;
  syncStatus: 'idle' | 'syncing' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

export enum IntegrationType {
  CRM = 'crm',
  ACCOUNTING = 'accounting',
  EMAIL = 'email',
  SMS = 'sms',
  ANALYTICS = 'analytics',
  PAYMENT = 'payment',
  SOCIAL_MEDIA = 'social_media',
  CALENDAR = 'calendar',
  CUSTOM = 'custom',
}

// ============================================================================
// Utility Types
// ============================================================================

export interface SettingsUpdateRequest {
  category: 'general' | 'business' | 'regional' | 'security' | 'features';
  settings: Partial<SystemSettings>;
}

export interface ConfigurationImport {
  type: 'full' | 'partial';
  data: Partial<SystemSettings>;
  overwrite: boolean;
}

export interface ConfigurationExport {
  settings: SystemSettings;
  templates: EmailTemplate[];
  categories: TourCategory[];
  tags: TourTag[];
  exportedAt: Date;
  version: string;
}
