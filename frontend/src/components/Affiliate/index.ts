/**
 * Affiliate Components Export
 * Central export file for all affiliate-related components
 */

export { default as AffiliateRegistration } from './AffiliateRegistration';
export { default as AffiliateDashboard } from './AffiliateDashboard';
export { default as AffiliateLinkGenerator } from './AffiliateLinkGenerator';
export { default as AffiliateReports } from './AffiliateReports';

// Additional exports for widget and public components
export const AFFILIATE_ROUTES = {
  REGISTRATION: '/affiliate/register',
  DASHBOARD: '/affiliate/dashboard',
  LINKS: '/affiliate/links',
  REPORTS: '/affiliate/reports',
  MATERIALS: '/affiliate/materials',
  PAYMENTS: '/affiliate/payments',
  SETTINGS: '/affiliate/settings',
  API_DOCS: '/affiliate/api-docs',
  LEADERBOARD: '/affiliate/leaderboard',
  TERMS: '/affiliate/terms',
  PRIVACY: '/affiliate/privacy',
  HELP: '/affiliate/help',
};

export const AFFILIATE_API_ENDPOINTS = {
  // Public endpoints (no auth required)
  REGISTER: '/api/affiliates/register',
  CHECK_AVAILABILITY: '/api/affiliates/check-availability',
  LEADERBOARD: '/api/affiliates/leaderboard',
  
  // Authenticated endpoints
  DASHBOARD: '/api/affiliates/dashboard',
  GENERATE_LINK: '/api/affiliates/generate-link',
  GET_MATERIALS: '/api/affiliates/materials',
  GET_PAYMENTS: '/api/affiliates/payments',
  REQUEST_PAYOUT: '/api/affiliates/request-payout',
  UPDATE_PROFILE: '/api/affiliates/profile',
  REPORTS_SALES: '/api/affiliates/reports/sales',
  REPORTS_CLICKS: '/api/affiliates/reports/clicks',
  REPORTS_CONVERSIONS: '/api/affiliates/reports/conversions',
  
  // Tracking endpoints
  TRACK_CLICK: '/api/track/click',
  TRACK_IMPRESSION: '/api/track/impression',
  TRACK_CONVERSION: '/api/track/conversion',
};

export const AFFILIATE_TIERS = {
  STARTER: {
    name: 'Starter',
    commission: 8,
    minSales: 0,
    benefits: ['Basic support', 'Monthly payments', 'Marketing materials'],
  },
  SILVER: {
    name: 'Silver',
    commission: 10,
    minSales: 10000,
    benefits: ['Priority support', 'Bi-weekly payments', 'Custom banners', 'Analytics dashboard'],
  },
  GOLD: {
    name: 'Gold',
    commission: 12,
    minSales: 50000,
    benefits: ['Dedicated support', 'Weekly payments', 'API access', 'Co-branding options'],
  },
  PLATINUM: {
    name: 'Platinum',
    commission: 15,
    minSales: 200000,
    benefits: ['Account manager', 'Daily payments', 'White-label options', 'Custom integrations'],
  },
};

export const AFFILIATE_TYPES = {
  INDIVIDUAL: 'Individual',
  PROFESSIONAL_AGENT: 'Professional Agent',
  AGENCY_PARTNER: 'Agency Partner',
  ENTERPRISE: 'Enterprise',
  TECHNOLOGY_PARTNER: 'Technology Partner',
};

export const PAYMENT_METHODS = {
  STRIPE: { name: 'Stripe', minPayout: 100, fee: 2.9 },
  PAYPAL: { name: 'PayPal', minPayout: 50, fee: 2.5 },
  BANK_TRANSFER: { name: 'Bank Transfer', minPayout: 500, fee: 15 },
  CRYPTO: { name: 'Cryptocurrency', minPayout: 200, fee: 1 },
};

// Widget configuration for external sites
export const WIDGET_CONFIG = {
  CDN_URL: 'https://cdn.spirittours.com/affiliate/widget.js',
  STYLES_URL: 'https://cdn.spirittours.com/affiliate/widget.css',
  API_BASE: 'https://api.spirittours.com/v1',
  TRACKING_PIXEL: 'https://track.spirittours.com/pixel',
  COOKIE_DURATION: 30, // days
  ATTRIBUTION_MODEL: 'last-click', // or 'first-click', 'linear', 'time-decay'
};

// Marketing materials categories
export const MATERIAL_CATEGORIES = {
  BANNERS: {
    name: 'Banners',
    sizes: ['728x90', '468x60', '320x50', '300x250', '160x600'],
    formats: ['png', 'jpg', 'gif', 'html5'],
  },
  EMAIL_TEMPLATES: {
    name: 'Email Templates',
    types: ['welcome', 'promotional', 'seasonal', 'product-launch'],
    languages: ['en', 'es', 'pt', 'fr'],
  },
  SOCIAL_MEDIA: {
    name: 'Social Media',
    platforms: ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'],
    types: ['posts', 'stories', 'reels', 'covers'],
  },
  LANDING_PAGES: {
    name: 'Landing Pages',
    types: ['general', 'destination', 'product', 'seasonal'],
    customizable: true,
  },
  VIDEOS: {
    name: 'Videos',
    types: ['promotional', 'testimonials', 'destination-guides'],
    formats: ['mp4', 'webm', 'youtube-embed'],
  },
};

// Commission calculation helpers
export const calculateCommission = (
  amount: number,
  tier: keyof typeof AFFILIATE_TIERS,
  type: keyof typeof AFFILIATE_TYPES,
  bonuses: number = 0
): number => {
  const baseRate = AFFILIATE_TIERS[tier].commission;
  const typeMultiplier = type === 'ENTERPRISE' ? 1.2 : type === 'TECHNOLOGY_PARTNER' ? 1.15 : 1;
  const finalRate = (baseRate * typeMultiplier) + bonuses;
  return amount * (finalRate / 100);
};

export const getNextTier = (currentSales: number): keyof typeof AFFILIATE_TIERS | null => {
  const tiers = Object.entries(AFFILIATE_TIERS).sort((a, b) => a[1].minSales - b[1].minSales);
  for (const [key, tier] of tiers) {
    if (currentSales < tier.minSales) {
      return key as keyof typeof AFFILIATE_TIERS;
    }
  }
  return null;
};

// Tracking helpers
export const generateTrackingId = (): string => {
  return `ST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const buildAffiliateUrl = (
  baseUrl: string,
  affiliateCode: string,
  params?: Record<string, string>
): string => {
  const url = new URL(baseUrl);
  url.searchParams.set('ref', affiliateCode);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return url.toString();
};

// Validation helpers
export const isValidAffiliateCode = (code: string): boolean => {
  return /^[a-zA-Z0-9_-]{4,20}$/.test(code);
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Date formatting helpers for Spanish reports
export const formatSpanishDate = (date: Date): string => {
  return new Intl.DateTimeFormat('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const formatSpanishCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Performance metrics
export const PERFORMANCE_THRESHOLDS = {
  CONVERSION_RATE: {
    EXCELLENT: 0.05, // 5%
    GOOD: 0.03,      // 3%
    AVERAGE: 0.02,   // 2%
    POOR: 0.01,      // 1%
  },
  CLICK_THROUGH_RATE: {
    EXCELLENT: 0.10, // 10%
    GOOD: 0.05,      // 5%
    AVERAGE: 0.02,   // 2%
    POOR: 0.01,      // 1%
  },
  AVERAGE_ORDER_VALUE: {
    EXCELLENT: 500,
    GOOD: 300,
    AVERAGE: 150,
    POOR: 50,
  },
};

// Gamification badges
export const ACHIEVEMENT_BADGES = {
  FIRST_SALE: { name: 'First Sale', icon: '🎉', points: 100 },
  TEN_SALES: { name: '10 Sales', icon: '⭐', points: 500 },
  HUNDRED_SALES: { name: '100 Sales', icon: '🏆', points: 2000 },
  THOUSAND_SALES: { name: '1000 Sales', icon: '👑', points: 10000 },
  HIGH_CONVERTER: { name: 'High Converter', icon: '🚀', points: 1000 },
  TOP_PERFORMER: { name: 'Top Performer', icon: '🥇', points: 5000 },
  CONSISTENT_SELLER: { name: 'Consistent Seller', icon: '📈', points: 3000 },
  SOCIAL_INFLUENCER: { name: 'Social Influencer', icon: '📱', points: 2500 },
  GLOBAL_REACH: { name: 'Global Reach', icon: '🌍', points: 4000 },
  PREMIUM_PARTNER: { name: 'Premium Partner', icon: '💎', points: 15000 },
};

// Default widget styles
export const DEFAULT_WIDGET_STYLES = {
  primaryColor: '#1976d2',
  secondaryColor: '#f50057',
  textColor: '#333333',
  backgroundColor: '#ffffff',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#e0e0e0',
  fontFamily: 'Roboto, sans-serif',
  fontSize: 14,
  padding: 16,
  shadow: '0 2px 4px rgba(0,0,0,0.1)',
};

export default {
  AffiliateRegistration,
  AffiliateDashboard,
  AffiliateLinkGenerator,
  AffiliateReports,
  AFFILIATE_ROUTES,
  AFFILIATE_API_ENDPOINTS,
  AFFILIATE_TIERS,
  AFFILIATE_TYPES,
  PAYMENT_METHODS,
  WIDGET_CONFIG,
  MATERIAL_CATEGORIES,
  calculateCommission,
  getNextTier,
  generateTrackingId,
  buildAffiliateUrl,
  isValidAffiliateCode,
  isValidEmail,
  formatSpanishDate,
  formatSpanishCurrency,
  PERFORMANCE_THRESHOLDS,
  ACHIEVEMENT_BADGES,
  DEFAULT_WIDGET_STYLES,
};