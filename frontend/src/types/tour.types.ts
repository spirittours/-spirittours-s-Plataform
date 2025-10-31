/**
 * Tour Types and Interfaces
 * 
 * Type definitions for tour management system
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum TourStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export enum TourDifficulty {
  EASY = 'easy',
  MODERATE = 'moderate',
  CHALLENGING = 'challenging',
  EXTREME = 'extreme',
}

export enum TourCategory {
  ADVENTURE = 'adventure',
  CULTURAL = 'cultural',
  WILDLIFE = 'wildlife',
  BEACH = 'beach',
  MOUNTAIN = 'mountain',
  CITY = 'city',
  FOOD = 'food',
  WELLNESS = 'wellness',
  LUXURY = 'luxury',
  BUDGET = 'budget',
  FAMILY = 'family',
  COUPLES = 'couples',
  SOLO = 'solo',
  GROUP = 'group',
}

export enum SeasonType {
  HIGH = 'high',
  LOW = 'low',
  SHOULDER = 'shoulder',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface Location {
  country: string;
  city: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  timezone?: string;
}

export interface Price {
  amount: number;
  currency: string;
  seasonType?: SeasonType;
}

export interface PricingTier {
  name: string;
  description: string;
  price: Price;
  minParticipants?: number;
  maxParticipants?: number;
  included: string[];
  excluded: string[];
}

export interface Availability {
  id: string;
  startDate: string;
  endDate: string;
  availableSpots: number;
  totalSpots: number;
  price: Price;
  isBlocked: boolean;
  blockReason?: string;
}

export interface Itinerary {
  day: number;
  title: string;
  description: string;
  activities: string[];
  meals: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
  accommodation?: string;
  transportations?: string[];
}

export interface Inclusion {
  id: string;
  name: string;
  description: string;
  category: 'transport' | 'accommodation' | 'meals' | 'activities' | 'guide' | 'insurance' | 'equipment' | 'other';
  included: boolean;
}

export interface Review {
  id: string;
  tourId: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  verified: boolean;
  helpful: number;
  createdAt: string;
  response?: {
    message: string;
    respondedBy: string;
    respondedAt: string;
  };
}

export interface TourImage {
  id: string;
  url: string;
  alt: string;
  caption?: string;
  isPrimary: boolean;
  order: number;
}

export interface TourGuide {
  id: string;
  name: string;
  avatar?: string;
  bio: string;
  languages: string[];
  specialties: string[];
  rating: number;
  totalTours: number;
}

export interface Tour {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  
  // Categorization
  category: TourCategory;
  tags: string[];
  difficulty: TourDifficulty;
  
  // Location
  location: Location;
  destinations: string[];
  
  // Duration
  duration: {
    days: number;
    nights: number;
  };
  
  // Capacity
  minParticipants: number;
  maxParticipants: number;
  
  // Pricing
  basePrice: Price;
  pricingTiers?: PricingTier[];
  discounts?: {
    earlyBird?: number;
    groupDiscount?: number;
    lastMinute?: number;
  };
  
  // Content
  images: TourImage[];
  videos?: string[];
  itinerary: Itinerary[];
  inclusions: Inclusion[];
  exclusions: string[];
  
  // Requirements
  requirements: {
    minAge?: number;
    maxAge?: number;
    fitnessLevel?: string;
    visaRequired?: boolean;
    vaccinations?: string[];
    equipment?: string[];
  };
  
  // Guides
  guides: TourGuide[];
  
  // Availability
  availabilities: Availability[];
  seasonalPricing?: {
    season: SeasonType;
    multiplier: number;
  }[];
  
  // Reviews
  reviews: Review[];
  rating: number;
  totalReviews: number;
  
  // Booking info
  totalBookings: number;
  popularityScore: number;
  
  // Sustainability
  sustainabilityScore?: number;
  carbonFootprint?: number;
  sustainabilityFeatures?: string[];
  
  // Metadata
  status: TourStatus;
  featured: boolean;
  trending: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  
  // SEO
  seo?: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface TourFormData {
  title: string;
  shortDescription: string;
  description: string;
  category: TourCategory;
  tags: string[];
  difficulty: TourDifficulty;
  location: Location;
  destinations: string[];
  duration: {
    days: number;
    nights: number;
  };
  minParticipants: number;
  maxParticipants: number;
  basePrice: {
    amount: number;
    currency: string;
  };
  status: TourStatus;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface TourFilters {
  search?: string;
  category?: TourCategory[];
  difficulty?: TourDifficulty[];
  status?: TourStatus[];
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  destinations?: string[];
  rating?: number;
  featured?: boolean;
  trending?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ToursListResponse {
  tours: Tour[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TourStatsResponse {
  totalTours: number;
  activeTours: number;
  draftTours: number;
  totalBookings: number;
  averageRating: number;
  totalRevenue: number;
  popularTours: Tour[];
  recentTours: Tour[];
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  Location,
  Price,
  PricingTier,
  Availability,
  Itinerary,
  Inclusion,
  Review,
  TourImage,
  TourGuide,
  Tour,
  TourFormData,
  TourFilters,
  ToursListResponse,
  TourStatsResponse,
};

export {
  TourStatus,
  TourDifficulty,
  TourCategory,
  SeasonType,
};
