/**
 * Analytics API Client
 * 
 * TypeScript client for advanced analytics endpoints
 * 
 * Author: Spirit Tours Development Team
 * Created: 2025-10-04
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/analytics`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ===== Type Definitions =====

export interface DashboardMetrics {
  period: {
    start: string;
    end: string;
    days: number;
  };
  total_posts: {
    total: number;
    avg_per_day: number;
  };
  total_engagement: {
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
    reach: number;
    engagement_rate: number;
  };
  follower_growth: {
    total_growth: number;
    by_platform: Record<string, any>;
  };
  sentiment_score: {
    overall_score: number;
    positive_count: number;
    negative_count: number;
    neutral_count: number;
    total_interactions: number;
  };
  top_performing_posts: Array<{
    id: number;
    platform: string;
    content: string;
    published_at: string;
    likes: number;
    comments: number;
    shares: number;
    engagement_rate: number;
  }>;
  platform_breakdown: Array<{
    platform: string;
    posts: number;
    likes: number;
    comments: number;
    shares: number;
    engagement_rate: number;
  }>;
  engagement_by_day: Array<{
    date: string;
    likes: number;
    comments: number;
    shares: number;
    total_engagement: number;
  }>;
}

export interface ROIMetrics {
  period_days: number;
  costs: {
    ai_content_generation: number;
    total: number;
  };
  estimated_value: number;
  roi_percentage: number;
  engagement_value_breakdown: {
    likes_value: number;
    comments_value: number;
    shares_value: number;
  };
}

export interface EngagementMetrics {
  period: {
    start: string;
    end: string;
  };
  platform: string;
  total_engagement: {
    likes: number;
    comments: number;
    shares: number;
    impressions: number;
    reach: number;
    engagement_rate: number;
  };
  engagement_by_day: Array<{
    date: string;
    likes: number;
    comments: number;
    shares: number;
    total_engagement: number;
  }>;
}

export interface GrowthMetrics {
  period: {
    start: string;
    end: string;
    days: number;
  };
  platform: string;
  total_growth: number;
  by_platform: Record<string, {
    start: number;
    end: number;
    change: number;
    percentage: number;
  }>;
}

export interface SentimentTrends {
  period: {
    start: string;
    end: string;
    days: number;
  };
  platform: string;
  overall_score: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  total_interactions: number;
  positive_percentage: number;
  negative_percentage: number;
  neutral_percentage: number;
}

// ===== API Functions =====

/**
 * Get comprehensive dashboard overview
 */
export const getDashboard = async (params: {
  platform?: string;
  days?: number;
}): Promise<{ success: boolean } & DashboardMetrics> => {
  const response = await apiClient.get('/dashboard', { params });
  return response.data;
};

/**
 * Get ROI analysis
 */
export const getROI = async (params: {
  platform?: string;
  days?: number;
}): Promise<{ success: boolean } & ROIMetrics> => {
  const response = await apiClient.get('/roi', { params });
  return response.data;
};

/**
 * Get engagement metrics
 */
export const getEngagement = async (params: {
  platform?: string;
  start_date?: string;
  end_date?: string;
}): Promise<{ success: boolean } & EngagementMetrics> => {
  const response = await apiClient.get('/engagement', { params });
  return response.data;
};

/**
 * Get follower growth
 */
export const getGrowth = async (params: {
  platform?: string;
  days?: number;
}): Promise<{ success: boolean } & GrowthMetrics> => {
  const response = await apiClient.get('/growth', { params });
  return response.data;
};

/**
 * Get sentiment trends
 */
export const getSentimentTrends = async (params: {
  platform?: string;
  days?: number;
}): Promise<{ success: boolean } & SentimentTrends> => {
  const response = await apiClient.get('/sentiment-trends', { params });
  return response.data;
};

/**
 * Get top performing posts
 */
export const getTopPosts = async (params: {
  platform?: string;
  limit?: number;
  metric?: string;
}): Promise<{
  success: boolean;
  platform: string;
  limit: number;
  metric: string;
  posts: Array<any>;
  count: number;
}> => {
  const response = await apiClient.get('/top-posts', { params });
  return response.data;
};

/**
 * Get platform comparison
 */
export const getPlatformComparison = async (params: {
  days?: number;
}): Promise<{
  success: boolean;
  period: any;
  platforms: Array<any>;
  total_platforms: number;
}> => {
  const response = await apiClient.get('/platform-comparison', { params });
  return response.data;
};

/**
 * Export analytics data
 */
export const exportAnalytics = async (request: {
  export_type: string;
  platform?: string;
  start_date?: string;
  end_date?: string;
  format?: string;
}): Promise<Blob> => {
  const response = await apiClient.post('/export', request, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Get analytics configuration
 */
export const getConfig = async (): Promise<any> => {
  const response = await apiClient.get('/config');
  return response.data;
};

/**
 * Health check
 */
export const healthCheck = async (): Promise<any> => {
  const response = await apiClient.get('/health');
  return response.data;
};
