// Support & Help Type Definitions
// Complete type system for support tickets, FAQs, documentation, and system health

// ============================================================================
// Support Tickets
// ============================================================================

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  customerId: string;
  customerName: string;
  customerEmail: string;
  assignedTo: string | null;
  assignedToName: string | null;
  messages: TicketMessage[];
  attachments: Attachment[];
  tags: string[];
  resolvedAt: Date | null;
  resolution: string | null;
  rating: number | null;
  feedback: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_CUSTOMER = 'waiting_customer',
  WAITING_INTERNAL = 'waiting_internal',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical',
}

export enum TicketCategory {
  BOOKING = 'booking',
  PAYMENT = 'payment',
  REFUND = 'refund',
  TECHNICAL = 'technical',
  ACCOUNT = 'account',
  TOUR_INQUIRY = 'tour_inquiry',
  COMPLAINT = 'complaint',
  FEEDBACK = 'feedback',
  OTHER = 'other',
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderType: 'customer' | 'agent' | 'system';
  message: string;
  attachments: Attachment[];
  isInternal: boolean;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

// ============================================================================
// FAQ Management
// ============================================================================

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: FAQCategory;
  order: number;
  isPublished: boolean;
  views: number;
  helpful: number;
  notHelpful: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum FAQCategory {
  GENERAL = 'general',
  BOOKINGS = 'bookings',
  PAYMENTS = 'payments',
  CANCELLATIONS = 'cancellations',
  TOURS = 'tours',
  ACCOUNT = 'account',
  TECHNICAL = 'technical',
}

// ============================================================================
// Documentation / Knowledge Base
// ============================================================================

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  content: string;
  htmlContent: string;
  category: KBCategory;
  subcategory: string;
  slug: string;
  status: ArticleStatus;
  author: string;
  authorName: string;
  views: number;
  helpful: number;
  notHelpful: number;
  tags: string[];
  relatedArticles: string[];
  attachments: Attachment[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum KBCategory {
  GETTING_STARTED = 'getting_started',
  USER_GUIDES = 'user_guides',
  TROUBLESHOOTING = 'troubleshooting',
  API_DOCS = 'api_docs',
  BEST_PRACTICES = 'best_practices',
  POLICIES = 'policies',
  RELEASE_NOTES = 'release_notes',
}

export enum ArticleStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

// ============================================================================
// System Health & Monitoring
// ============================================================================

export interface SystemHealth {
  overall: HealthStatus;
  components: SystemComponent[];
  lastChecked: Date;
  uptime: number;
  version: string;
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
  MAINTENANCE = 'maintenance',
}

export interface SystemComponent {
  name: string;
  status: HealthStatus;
  responseTime: number;
  uptime: number;
  lastError: string | null;
  lastChecked: Date;
}

export interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface SystemLog {
  id: string;
  level: LogLevel;
  message: string;
  category: string;
  source: string;
  userId: string | null;
  metadata: Record<string, any>;
  timestamp: Date;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// ============================================================================
// User Guides
// ============================================================================

export interface UserGuide {
  id: string;
  title: string;
  description: string;
  content: string;
  type: GuideType;
  targetAudience: 'admin' | 'guide' | 'customer' | 'all';
  steps: GuideStep[];
  estimatedTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  videoUrl: string | null;
  attachments: Attachment[];
  views: number;
  completions: number;
  rating: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum GuideType {
  TUTORIAL = 'tutorial',
  HOW_TO = 'how_to',
  WALKTHROUGH = 'walkthrough',
  VIDEO = 'video',
  QUICK_START = 'quick_start',
}

export interface GuideStep {
  order: number;
  title: string;
  content: string;
  image: string | null;
  videoUrl: string | null;
  tips: string[];
}

// ============================================================================
// Feedback & Surveys
// ============================================================================

export interface Feedback {
  id: string;
  type: FeedbackType;
  subject: string;
  message: string;
  rating: number;
  customerId: string;
  customerName: string;
  category: string;
  status: 'new' | 'reviewed' | 'acted_upon' | 'dismissed';
  respondedAt: Date | null;
  response: string | null;
  createdAt: Date;
}

export enum FeedbackType {
  BUG_REPORT = 'bug_report',
  FEATURE_REQUEST = 'feature_request',
  GENERAL_FEEDBACK = 'general_feedback',
  COMPLAINT = 'complaint',
  PRAISE = 'praise',
}

// ============================================================================
// Utility Types
// ============================================================================

export interface TicketFormData {
  subject: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
}

export interface FAQFormData {
  question: string;
  answer: string;
  category: FAQCategory;
  tags: string[];
}

export interface ArticleFormData {
  title: string;
  content: string;
  category: KBCategory;
  subcategory: string;
  tags: string[];
}

export interface TicketFilter {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  assignedTo?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  averageResolutionTime: number;
  satisfactionRate: number;
}
