// Marketing & Communications Type Definitions
// Complete type system for marketing campaigns, offers, discounts, and newsletters

// ============================================================================
// Email Campaigns
// ============================================================================

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  templateId: string | null;
  status: CampaignStatus;
  type: CampaignType;
  audience: AudienceSegment;
  scheduledAt: Date | null;
  sentAt: Date | null;
  stats: CampaignStats;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

export enum CampaignType {
  PROMOTIONAL = 'promotional',
  TRANSACTIONAL = 'transactional',
  NEWSLETTER = 'newsletter',
  ANNOUNCEMENT = 'announcement',
  REMINDER = 'reminder',
  FOLLOW_UP = 'follow_up',
}

export interface AudienceSegment {
  type: 'all' | 'segment' | 'custom';
  criteria?: AudienceCriteria;
  customerIds?: string[];
  estimatedSize: number;
}

export interface AudienceCriteria {
  customerTier?: string[];
  hasBookedTours?: boolean;
  lastBookingDays?: number;
  totalSpent?: { min?: number; max?: number };
  location?: string[];
  tags?: string[];
}

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  revenue: number;
}

// ============================================================================
// Promotional Offers
// ============================================================================

export interface PromotionalOffer {
  id: string;
  title: string;
  description: string;
  image: string;
  type: OfferType;
  discountType: DiscountType;
  discountValue: number;
  minPurchaseAmount: number;
  maxDiscountAmount: number;
  applicableTours: string[];
  validFrom: Date;
  validUntil: Date;
  status: OfferStatus;
  usageLimit: number;
  usageCount: number;
  termsAndConditions: string;
  isPublic: boolean;
  priority: number;
  stats: OfferStats;
  createdAt: Date;
  updatedAt: Date;
}

export enum OfferType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  FREE_TOUR = 'free_tour',
  UPGRADE = 'upgrade',
  BUY_ONE_GET_ONE = 'buy_one_get_one',
  BUNDLE = 'bundle',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum OfferStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled',
  EXPIRED = 'expired',
}

export interface OfferStats {
  views: number;
  clicks: number;
  conversions: number;
  revenue: number;
  averageOrderValue: number;
}

// ============================================================================
// Discount Codes
// ============================================================================

export interface DiscountCode {
  id: string;
  code: string;
  description: string;
  type: DiscountType;
  value: number;
  minPurchaseAmount: number;
  maxDiscountAmount: number;
  applicableTours: string[];
  validFrom: Date;
  validUntil: Date;
  usageLimit: number;
  usagePerCustomer: number;
  usageCount: number;
  status: CodeStatus;
  isPublic: boolean;
  generatedBy: 'manual' | 'auto';
  campaign?: string;
  stats: CodeStats;
  createdAt: Date;
  updatedAt: Date;
}

export enum CodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  USED_UP = 'used_up',
}

export interface CodeStats {
  totalUsage: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface CodeUsage {
  id: string;
  codeId: string;
  code: string;
  customerId: string;
  customerName: string;
  bookingId: string;
  discountAmount: number;
  orderTotal: number;
  usedAt: Date;
}

// ============================================================================
// Newsletter
// ============================================================================

export interface Newsletter {
  id: string;
  title: string;
  subject: string;
  content: string;
  htmlContent: string;
  status: NewsletterStatus;
  scheduledAt: Date | null;
  sentAt: Date | null;
  recipients: NewsletterRecipient[];
  stats: NewsletterStats;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum NewsletterStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  SENT = 'sent',
  CANCELLED = 'cancelled',
}

export interface NewsletterRecipient {
  email: string;
  name: string;
  customerId?: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
}

export interface NewsletterStats {
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

export interface Subscriber {
  id: string;
  email: string;
  name: string;
  customerId?: string;
  status: SubscriberStatus;
  preferences: string[];
  subscribedAt: Date;
  unsubscribedAt?: Date;
  source: string;
}

export enum SubscriberStatus {
  ACTIVE = 'active',
  UNSUBSCRIBED = 'unsubscribed',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
}

// ============================================================================
// SMS Campaigns
// ============================================================================

export interface SMSCampaign {
  id: string;
  name: string;
  message: string;
  status: CampaignStatus;
  audience: AudienceSegment;
  scheduledAt: Date | null;
  sentAt: Date | null;
  stats: SMSStats;
  costPerMessage: number;
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SMSStats {
  sent: number;
  delivered: number;
  failed: number;
  clicked: number;
  replied: number;
  deliveryRate: number;
  clickRate: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface CampaignFormData {
  name: string;
  subject: string;
  content: string;
  type: CampaignType;
  audience: AudienceSegment;
  scheduledAt: Date | null;
}

export interface OfferFormData {
  title: string;
  description: string;
  type: OfferType;
  discountType: DiscountType;
  discountValue: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number;
  isPublic: boolean;
}

export interface CodeFormData {
  code: string;
  description: string;
  type: DiscountType;
  value: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number;
  usagePerCustomer: number;
}

export interface NewsletterFormData {
  title: string;
  subject: string;
  content: string;
  scheduledAt: Date | null;
  tags: string[];
}
