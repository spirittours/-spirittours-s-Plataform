/**
 * TypeScript Type Definitions
 * Shared types for the mobile application
 */

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: 'user' | 'admin' | 'agent';
  createdAt: string;
  updatedAt: string;
}

export interface Tour {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  destination: string;
  duration: number;
  durationUnit: 'hours' | 'days';
  price: number;
  currency: string;
  images: string[];
  rating: number;
  reviewCount: number;
  maxGroupSize: number;
  difficulty: 'easy' | 'moderate' | 'challenging';
  category: string;
  featured: boolean;
  available: boolean;
  includes: string[];
  excludes: string[];
  itinerary: TourDay[];
  location: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface TourDay {
  day: number;
  title: string;
  description: string;
  activities: string[];
}

export interface Booking {
  id: string;
  userId: string;
  tourId: string;
  tour: Tour;
  bookingDate: string;
  tourDate: string;
  adults: number;
  children: number;
  totalPrice: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod: string;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  userId: string;
  user: User;
  tourId: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  helpful: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'booking' | 'payment' | 'reminder' | 'promo' | 'system';
  title: string;
  message: string;
  read: boolean;
  data?: any;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchFilters {
  destination?: string;
  startDate?: string;
  endDate?: string;
  adults?: number;
  children?: number;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  difficulty?: string[];
  rating?: number;
  sortBy?: 'price' | 'rating' | 'duration' | 'popular';
  sortOrder?: 'asc' | 'desc';
}
