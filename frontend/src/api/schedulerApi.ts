/**
 * Scheduler API Client
 * 
 * TypeScript client for automated posting scheduler endpoints
 * 
 * Author: Spirit Tours Development Team
 * Created: 2025-10-04
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/scheduler`,
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

export interface SchedulePostRequest {
  platform: string;
  content: string;
  scheduled_time: string; // ISO format
  media_urls?: string[];
  hashtags?: string[];
  recurring?: boolean;
  recurrence_pattern?: string;
  timezone?: string;
}

export interface SchedulePostResponse {
  success: boolean;
  scheduled_post_id: number;
  scheduled_time: string;
  status: string;
  message: string;
}

export interface ScheduleWithAIRequest {
  prompt: string;
  platform: string;
  scheduled_time: string;
  language?: string;
  tone?: string;
  timezone?: string;
}

export interface BulkScheduleRequest {
  posts: Array<{
    platform: string;
    content?: string;
    prompt?: string;
    scheduled_time: string;
    generate_with_ai?: boolean;
    timezone?: string;
  }>;
}

export interface ScheduledPost {
  id: number;
  platform: string;
  content: string;
  scheduled_time: string;
  status: 'pending' | 'processing' | 'published' | 'failed' | 'cancelled';
  recurring: boolean;
  recurrence_pattern?: string;
  retry_count: number;
  created_at: string;
  published_at?: string;
  error_message?: string;
  task_id?: string;
}

export interface OptimalTimesRequest {
  platform: string;
  date: string; // YYYY-MM-DD
  timezone?: string;
  count?: number;
}

export interface OptimalTimesResponse {
  success: boolean;
  platform: string;
  date: string;
  timezone: string;
  suggestions: string[];
  count: number;
}

export interface TaskStatusResponse {
  success: boolean;
  task_id: string;
  status: string;
  ready: boolean;
  successful?: boolean;
  result?: any;
  info?: any;
}

// ===== API Functions =====

/**
 * Schedule a single post
 */
export const schedulePost = async (request: SchedulePostRequest): Promise<SchedulePostResponse> => {
  const response = await apiClient.post('/schedule', request);
  return response.data;
};

/**
 * Schedule with AI generation
 */
export const scheduleWithAI = async (request: ScheduleWithAIRequest): Promise<any> => {
  const response = await apiClient.post('/schedule-with-ai', request);
  return response.data;
};

/**
 * Bulk schedule multiple posts
 */
export const bulkSchedule = async (request: BulkScheduleRequest): Promise<any> => {
  const response = await apiClient.post('/bulk-schedule', request);
  return response.data;
};

/**
 * Get scheduled posts with filters
 */
export const getScheduledPosts = async (params: {
  platform?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}): Promise<{ success: boolean; posts: ScheduledPost[]; count: number }> => {
  const response = await apiClient.get('/scheduled-posts', { params });
  return response.data;
};

/**
 * Reschedule a post
 */
export const reschedulePost = async (
  postId: number,
  newScheduledTime: string
): Promise<{ success: boolean; scheduled_post: ScheduledPost }> => {
  const response = await apiClient.put(`/reschedule/${postId}`, {
    new_scheduled_time: newScheduledTime,
  });
  return response.data;
};

/**
 * Cancel a scheduled post
 */
export const cancelPost = async (postId: number): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete(`/cancel/${postId}`);
  return response.data;
};

/**
 * Get optimal posting times
 */
export const getOptimalTimes = async (request: OptimalTimesRequest): Promise<OptimalTimesResponse> => {
  const response = await apiClient.post('/optimal-times', request);
  return response.data;
};

/**
 * Get posting frequency recommendation
 */
export const getPostingFrequency = async (platform: string): Promise<any> => {
  const response = await apiClient.get(`/posting-frequency/${platform}`);
  return response.data;
};

/**
 * Get task status
 */
export const getTaskStatus = async (taskId: string): Promise<TaskStatusResponse> => {
  const response = await apiClient.get(`/task-status/${taskId}`);
  return response.data;
};

/**
 * Get scheduler configuration
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
