// Staff & Resources Type Definitions
// Complete type system for staff management, resource allocation, and scheduling

// ============================================================================
// Tour Guide / Staff Member
// ============================================================================

export interface TourGuide {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  status: GuideStatus;
  role: StaffRole;
  specializations: string[];
  languages: Language[];
  certifications: Certification[];
  rating: number;
  totalTours: number;
  experience: number; // Years
  bio: string;
  availability: AvailabilitySchedule;
  performance: PerformanceMetrics;
  emergencyContact: EmergencyContact;
  documents: Document[];
  createdAt: Date;
  updatedAt: Date;
}

export enum GuideStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
  SUSPENDED = 'suspended',
  TRAINING = 'training',
}

export enum StaffRole {
  TOUR_GUIDE = 'tour_guide',
  SENIOR_GUIDE = 'senior_guide',
  TOUR_LEADER = 'tour_leader',
  DRIVER = 'driver',
  COORDINATOR = 'coordinator',
  MANAGER = 'manager',
  SUPPORT_STAFF = 'support_staff',
}

export interface Language {
  code: string;
  name: string;
  proficiency: 'native' | 'fluent' | 'advanced' | 'intermediate' | 'basic';
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate: Date | null;
  certificateUrl: string;
  isVerified: boolean;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

export interface Document {
  id: string;
  type: DocumentType;
  name: string;
  url: string;
  uploadedAt: Date;
  expiryDate: Date | null;
  isVerified: boolean;
}

export enum DocumentType {
  ID = 'id',
  LICENSE = 'license',
  CERTIFICATION = 'certification',
  INSURANCE = 'insurance',
  CONTRACT = 'contract',
  OTHER = 'other',
}

// ============================================================================
// Availability & Schedule
// ============================================================================

export interface AvailabilitySchedule {
  timezone: string;
  weeklySchedule: WeeklySchedule;
  exceptions: AvailabilityException[];
  maxToursPerDay: number;
  maxToursPerWeek: number;
  preferredDays: string[];
}

export interface WeeklySchedule {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
}

export interface DayAvailability {
  isAvailable: boolean;
  slots: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
  type: 'available' | 'busy' | 'break';
}

export interface AvailabilityException {
  id: string;
  date: Date;
  type: 'unavailable' | 'limited' | 'extra_available';
  reason: string;
  slots?: TimeSlot[];
}

// ============================================================================
// Schedule & Assignment
// ============================================================================

export interface TourAssignment {
  id: string;
  tourId: string;
  tourName: string;
  guideId: string;
  guideName: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: AssignmentStatus;
  role: AssignmentRole;
  participants: number;
  location: string;
  notes: string;
  checkedIn: boolean;
  checkedOut: boolean;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum AssignmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum AssignmentRole {
  PRIMARY_GUIDE = 'primary_guide',
  ASSISTANT_GUIDE = 'assistant_guide',
  DRIVER = 'driver',
  COORDINATOR = 'coordinator',
}

export interface ScheduleConflict {
  id: string;
  guideId: string;
  guideName: string;
  date: Date;
  conflictType: 'double_booking' | 'overtime' | 'unavailable' | 'rest_violation';
  assignments: TourAssignment[];
  severity: 'critical' | 'warning' | 'info';
  resolved: boolean;
}

// ============================================================================
// Resource Management
// ============================================================================

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  category: string;
  description: string;
  status: ResourceStatus;
  quantity: number;
  availableQuantity: number;
  location: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  purchaseDate: Date;
  purchasePrice: number;
  currentValue: number;
  maintenanceSchedule: MaintenanceSchedule;
  lastMaintenance: Date | null;
  nextMaintenance: Date | null;
  assignedTo: string | null;
  specifications: Record<string, any>;
  images: string[];
  documents: Document[];
  createdAt: Date;
  updatedAt: Date;
}

export enum ResourceType {
  VEHICLE = 'vehicle',
  EQUIPMENT = 'equipment',
  TECHNOLOGY = 'technology',
  SAFETY_GEAR = 'safety_gear',
  OFFICE_EQUIPMENT = 'office_equipment',
  FACILITY = 'facility',
  OTHER = 'other',
}

export enum ResourceStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  MAINTENANCE = 'maintenance',
  RESERVED = 'reserved',
  DAMAGED = 'damaged',
  RETIRED = 'retired',
}

export interface MaintenanceSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  lastService: Date | null;
  nextService: Date | null;
  maintenanceProvider: string;
  cost: number;
  notes: string;
}

export interface ResourceAllocation {
  id: string;
  resourceId: string;
  resourceName: string;
  assignedToId: string;
  assignedToName: string;
  assignmentType: 'tour' | 'staff' | 'maintenance' | 'other';
  tourId?: string;
  startDate: Date;
  endDate: Date;
  quantity: number;
  purpose: string;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
  approvedBy: string | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Performance Metrics
// ============================================================================

export interface PerformanceMetrics {
  totalTours: number;
  completedTours: number;
  cancelledTours: number;
  noShows: number;
  averageRating: number;
  totalReviews: number;
  onTimePercentage: number;
  customerSatisfaction: number;
  revenueGenerated: number;
  tips: number;
  responseTime: number; // minutes
  completionRate: number; // percentage
  repeatCustomers: number;
  monthlyStats: MonthlyStats[];
  strengths: string[];
  improvementAreas: string[];
}

export interface MonthlyStats {
  month: string;
  year: number;
  tours: number;
  revenue: number;
  rating: number;
  tips: number;
}

export interface PerformanceReview {
  id: string;
  guideId: string;
  reviewerId: string;
  reviewerName: string;
  reviewDate: Date;
  period: {
    start: Date;
    end: Date;
  };
  ratings: {
    professionalism: number;
    knowledge: number;
    communication: number;
    punctuality: number;
    customerService: number;
    teamwork: number;
  };
  overallRating: number;
  strengths: string[];
  weaknesses: string[];
  goals: string[];
  comments: string;
  actionItems: ActionItem[];
  nextReviewDate: Date;
  status: 'draft' | 'completed' | 'acknowledged';
}

export interface ActionItem {
  id: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed';
  completedDate: Date | null;
}

// ============================================================================
// Leave & Time Off
// ============================================================================

export interface LeaveRequest {
  id: string;
  guideId: string;
  guideName: string;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: LeaveStatus;
  requestedAt: Date;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewComments: string;
  documents: Document[];
}

export enum LeaveType {
  VACATION = 'vacation',
  SICK_LEAVE = 'sick_leave',
  PERSONAL = 'personal',
  EMERGENCY = 'emergency',
  TRAINING = 'training',
  UNPAID = 'unpaid',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export interface LeaveBalance {
  guideId: string;
  year: number;
  vacation: {
    total: number;
    used: number;
    remaining: number;
  };
  sickLeave: {
    total: number;
    used: number;
    remaining: number;
  };
  personal: {
    total: number;
    used: number;
    remaining: number;
  };
}

// ============================================================================
// Training & Development
// ============================================================================

export interface Training {
  id: string;
  title: string;
  description: string;
  type: TrainingType;
  provider: string;
  startDate: Date;
  endDate: Date;
  duration: number; // hours
  location: string;
  capacity: number;
  enrolled: number;
  cost: number;
  isMandatory: boolean;
  certification: boolean;
  materials: string[];
  attendees: TrainingAttendee[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export enum TrainingType {
  ONBOARDING = 'onboarding',
  SAFETY = 'safety',
  CUSTOMER_SERVICE = 'customer_service',
  TECHNICAL = 'technical',
  LEADERSHIP = 'leadership',
  COMPLIANCE = 'compliance',
  PRODUCT_KNOWLEDGE = 'product_knowledge',
  OTHER = 'other',
}

export interface TrainingAttendee {
  guideId: string;
  guideName: string;
  enrolledAt: Date;
  status: 'enrolled' | 'attended' | 'completed' | 'no_show' | 'withdrawn';
  completionDate: Date | null;
  score: number | null;
  certificateUrl: string | null;
  feedback: string;
}

// ============================================================================
// Payroll & Compensation
// ============================================================================

export interface Compensation {
  guideId: string;
  type: CompensationType;
  baseSalary: number;
  hourlyRate: number;
  commissionRate: number;
  currency: string;
  paymentFrequency: 'weekly' | 'bi-weekly' | 'monthly';
  bonuses: Bonus[];
  deductions: Deduction[];
  benefits: Benefit[];
}

export enum CompensationType {
  SALARY = 'salary',
  HOURLY = 'hourly',
  PER_TOUR = 'per_tour',
  COMMISSION = 'commission',
  MIXED = 'mixed',
}

export interface Bonus {
  id: string;
  type: string;
  amount: number;
  date: Date;
  reason: string;
}

export interface Deduction {
  id: string;
  type: string;
  amount: number;
  date: Date;
  reason: string;
}

export interface Benefit {
  id: string;
  name: string;
  type: 'health_insurance' | 'retirement' | 'paid_time_off' | 'other';
  description: string;
  value: number;
  startDate: Date;
  endDate: Date | null;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface GuideFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: StaffRole;
  specializations: string[];
  languages: Language[];
  bio: string;
  emergencyContact: EmergencyContact;
}

export interface AssignmentFormData {
  tourId: string;
  guideId: string;
  date: Date;
  startTime: string;
  endTime: string;
  role: AssignmentRole;
  notes: string;
}

export interface ResourceFormData {
  name: string;
  type: ResourceType;
  category: string;
  description: string;
  quantity: number;
  location: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  purchaseDate: Date;
  purchasePrice: number;
}

export interface ScheduleFilter {
  startDate: Date;
  endDate: Date;
  guideIds?: string[];
  tourIds?: string[];
  status?: AssignmentStatus[];
  role?: AssignmentRole[];
}

export interface AvailabilityQuery {
  date: Date;
  startTime: string;
  endTime: string;
  specializations?: string[];
  languages?: string[];
}
