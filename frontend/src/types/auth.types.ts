/**
 * Authentication Type Definitions
 * Advanced authentication types for security features
 */

// ============================================================================
// User & Auth Status
// ============================================================================

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  AGENT = 'agent',
  CUSTOMER = 'customer',
  GUEST = 'guest',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
  GITHUB = 'github',
}

// ============================================================================
// Core User Interface
// ============================================================================

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  
  // Authentication
  role: UserRole;
  status: UserStatus;
  provider: AuthProvider;
  
  // Verification
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  
  // Profile
  avatar?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  lastActivityAt?: string;
}

// ============================================================================
// Authentication Tokens
// ============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  tokenType: 'Bearer';
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
  requiresTwoFactor?: boolean;
  twoFactorSessionToken?: string;
}

// ============================================================================
// OAuth Types
// ============================================================================

export interface OAuthProvider {
  id: AuthProvider;
  name: string;
  iconUrl?: string;
  enabled: boolean;
}

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string[];
}

export interface OAuthResponse {
  provider: AuthProvider;
  code: string;
  state: string;
}

export interface OAuthUserInfo {
  provider: AuthProvider;
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  emailVerified: boolean;
}

// ============================================================================
// Two-Factor Authentication
// ============================================================================

export enum TwoFactorMethod {
  TOTP = 'totp', // Time-based One-Time Password (Google Authenticator, Authy)
  SMS = 'sms',
  EMAIL = 'email',
  BACKUP_CODES = 'backup_codes',
}

export interface TwoFactorSetup {
  method: TwoFactorMethod;
  secret?: string; // For TOTP
  qrCode?: string; // QR code data URL for TOTP setup
  backupCodes?: string[]; // Backup codes
  phone?: string; // For SMS
  email?: string; // For email
}

export interface TwoFactorVerification {
  code: string;
  method: TwoFactorMethod;
  sessionToken?: string;
  rememberDevice?: boolean;
}

export interface TwoFactorStatus {
  enabled: boolean;
  methods: TwoFactorMethod[];
  primaryMethod?: TwoFactorMethod;
  lastVerifiedAt?: string;
  trustedDevices: TrustedDevice[];
}

export interface TrustedDevice {
  id: string;
  name: string;
  deviceType: string; // 'desktop', 'mobile', 'tablet'
  browser: string;
  os: string;
  location?: string;
  addedAt: string;
  lastUsedAt?: string;
}

// ============================================================================
// Password Management
// ============================================================================

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetVerification {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number; // Number of previous passwords to check
  expiryDays?: number; // Password expiration
}

export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isStrong: boolean;
}

// ============================================================================
// Email Verification
// ============================================================================

export interface EmailVerificationRequest {
  email: string;
}

export interface EmailVerificationConfirm {
  token: string;
}

export interface EmailVerificationStatus {
  verified: boolean;
  verifiedAt?: string;
  pendingEmail?: string; // If changing email
  sentAt?: string;
  expiresAt?: string;
}

// ============================================================================
// Session Management
// ============================================================================

export interface Session {
  id: string;
  userId: string;
  
  // Device Info
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  
  // Location
  ipAddress: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
  };
  
  // Status
  isCurrentSession: boolean;
  isTrusted: boolean;
  
  // Timestamps
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

export interface SessionsList {
  sessions: Session[];
  currentSessionId: string;
}

// ============================================================================
// Login/Registration Forms
// ============================================================================

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  agreeToTerms: boolean;
  subscribeNewsletter?: boolean;
}

// ============================================================================
// Security Events
// ============================================================================

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET = 'password_reset',
  EMAIL_CHANGED = 'email_changed',
  EMAIL_VERIFIED = 'email_verified',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',
  TWO_FACTOR_VERIFIED = 'two_factor_verified',
  TRUSTED_DEVICE_ADDED = 'trusted_device_added',
  TRUSTED_DEVICE_REMOVED = 'trusted_device_removed',
  SESSION_REVOKED = 'session_revoked',
  ACCOUNT_LOCKED = 'account_locked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

export interface SecurityEvent {
  id: string;
  userId: string;
  type: SecurityEventType;
  description: string;
  
  // Context
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  deviceInfo?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Timestamps
  timestamp: string;
}

// ============================================================================
// Account Security Settings
// ============================================================================

export interface SecuritySettings {
  // Two-Factor
  twoFactorEnabled: boolean;
  twoFactorMethods: TwoFactorMethod[];
  
  // Sessions
  sessionTimeout: number; // minutes
  allowMultipleSessions: boolean;
  
  // Login Attempts
  maxLoginAttempts: number;
  lockoutDuration: number; // minutes
  
  // Notifications
  notifyNewLogin: boolean;
  notifyPasswordChange: boolean;
  notifySuspiciousActivity: boolean;
  
  // Password Policy
  passwordPolicy: PasswordPolicy;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse extends AuthResponse {
  // Inherits from AuthResponse
}

export interface RegisterRequest extends RegisterFormData {
  // Inherits from RegisterFormData
}

export interface RegisterResponse extends AuthResponse {
  emailVerificationSent: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface LogoutRequest {
  refreshToken?: string;
  allDevices?: boolean;
}

// ============================================================================
// Auth Context State
// ============================================================================

export interface AuthContextState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: (allDevices?: boolean) => Promise<void>;
  refreshToken: () => Promise<void>;
  verifyTwoFactor: (code: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

// ============================================================================
// Permissions & Authorization
// ============================================================================

export enum Permission {
  // Tours
  TOURS_VIEW = 'tours:view',
  TOURS_CREATE = 'tours:create',
  TOURS_UPDATE = 'tours:update',
  TOURS_DELETE = 'tours:delete',
  
  // Bookings
  BOOKINGS_VIEW = 'bookings:view',
  BOOKINGS_CREATE = 'bookings:create',
  BOOKINGS_UPDATE = 'bookings:update',
  BOOKINGS_CANCEL = 'bookings:cancel',
  
  // Customers
  CUSTOMERS_VIEW = 'customers:view',
  CUSTOMERS_CREATE = 'customers:create',
  CUSTOMERS_UPDATE = 'customers:update',
  CUSTOMERS_DELETE = 'customers:delete',
  
  // Payments
  PAYMENTS_VIEW = 'payments:view',
  PAYMENTS_PROCESS = 'payments:process',
  PAYMENTS_REFUND = 'payments:refund',
  
  // Users
  USERS_VIEW = 'users:view',
  USERS_CREATE = 'users:create',
  USERS_UPDATE = 'users:update',
  USERS_DELETE = 'users:delete',
  
  // Reports
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',
  
  // Settings
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_UPDATE = 'settings:update',
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}
