/**
 * Sentiment Analysis API Client
 * 
 * TypeScript client for sentiment analysis endpoints
 * 
 * Author: Spirit Tours Development Team
 * Created: 2025-10-04
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/sentiment`,
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

export interface AnalyzeTextRequest {
  text: string;
  platform?: string;
  post_id?: number;
}

export interface AnalyzeTextResponse {
  success: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_score: number;
  confidence: number;
  intent: string;
  intent_confidence: number;
  keywords: string[];
  requires_response: boolean;
  auto_response?: string;
  analysis_time_ms: number;
}

export interface BatchAnalyzeRequest {
  texts: Array<{
    text: string;
    platform?: string;
    post_id?: number;
  }>;
}

export interface BatchAnalyzeResponse {
  success: boolean;
  total_analyzed: number;
  statistics: {
    positive: number;
    negative: number;
    neutral: number;
    positive_percentage: number;
    negative_percentage: number;
  };
  results: AnalyzeTextResponse[];
}

export interface SentimentSummaryRequest {
  start_date?: string;
  end_date?: string;
  platform?: string;
}

export interface SentimentSummaryResponse {
  success: boolean;
  period: {
    start: string;
    end: string;
  };
  platform: string;
  total_interactions: number;
  sentiment_breakdown: {
    positive: number;
    negative: number;
    neutral: number;
    positive_percentage: number;
    negative_percentage: number;
    neutral_percentage: number;
  };
  average_sentiment_score: number;
  intent_breakdown: Record<string, number>;
  requires_response_count: number;
  top_keywords: Array<{ keyword: string; count: number }>;
}

export interface IntentCategory {
  name: string;
  description: string;
  keywords: string[];
  response_priority: string;
}

export interface ResponseTemplate {
  category: string;
  templates: string[];
}

// ===== API Functions =====

/**
 * Analyze single text for sentiment and intent
 */
export const analyzeText = async (request: AnalyzeTextRequest): Promise<AnalyzeTextResponse> => {
  const response = await apiClient.post('/analyze', request);
  return response.data;
};

/**
 * Batch analyze multiple texts
 */
export const batchAnalyze = async (request: BatchAnalyzeRequest): Promise<BatchAnalyzeResponse> => {
  const response = await apiClient.post('/analyze/batch', request);
  return response.data;
};

/**
 * Get sentiment summary for time period
 */
export const getSentimentSummary = async (
  request: SentimentSummaryRequest
): Promise<SentimentSummaryResponse> => {
  const response = await apiClient.post('/summary', request);
  return response.data;
};

/**
 * Get available intent categories
 */
export const getIntents = async (): Promise<{
  success: boolean;
  intents: Record<string, IntentCategory>;
}> => {
  const response = await apiClient.get('/intents');
  return response.data;
};

/**
 * Get auto-response templates
 */
export const getResponseTemplates = async (): Promise<{
  success: boolean;
  templates: Record<string, string[]>;
  guidelines: any;
}> => {
  const response = await apiClient.get('/response-templates');
  return response.data;
};

/**
 * Get sentiment analysis configuration
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
