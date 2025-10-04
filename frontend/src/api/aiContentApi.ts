/**
 * AI Content Generation API Client
 * 
 * TypeScript client for interacting with AI content generation endpoints
 * 
 * Author: Spirit Tours Development Team
 * Created: 2025-10-04
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/ai`,
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

export interface GeneratePostRequest {
  prompt: string;
  platform: string;
  language?: string;
  tone?: string;
  topic?: string;
  keywords?: string[];
  provider?: string;
}

export interface GeneratePostResponse {
  success: boolean;
  content: string;
  provider: string;
  metadata: {
    platform: string;
    language: string;
    tone: string;
    generation_time_ms: number;
    hashtags: string[];
  };
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost_estimate: {
    total: number;
    input: number;
    output: number;
    currency: string;
  };
}

export interface GenerateHashtagsRequest {
  content: string;
  platform: string;
  language?: string;
  count?: number;
}

export interface GenerateHashtagsResponse {
  success: boolean;
  hashtags: string[];
  count: number;
  provider: string;
  platform: string;
}

export interface GenerateCommentResponseRequest {
  comment_text: string;
  platform: string;
  language?: string;
  sentiment?: string;
}

export interface GenerateCommentResponseResponse {
  success: boolean;
  response: string;
  provider: string;
  generation_time_ms: number;
  confidence: string;
}

export interface RepurposeContentRequest {
  source_content: string;
  source_platform: string;
  target_platforms: string[];
  language?: string;
}

export interface RepurposeContentResponse {
  success: boolean;
  source_platform: string;
  repurposed: Record<string, {
    content: string;
    hashtags: string[];
    character_count: number;
  }>;
  platforms_count: number;
}

export interface GenerateVariantsRequest {
  prompt: string;
  platform: string;
  language?: string;
  variant_count?: number;
}

export interface GenerateVariantsResponse {
  success: boolean;
  variants: Array<{
    variant_id: number;
    content: string;
    tone: string;
    hashtags: string[];
    provider: string;
  }>;
  count: number;
  platform: string;
}

export interface ProviderInfo {
  provider: string;
  model: string;
  languages: string[];
  cost_per_1k_input: number;
  cost_per_1k_output: number;
  requests_per_minute: number;
  health: {
    connected: boolean | null;
    last_check: string | null;
  };
}

export interface ProvidersResponse {
  success: boolean;
  providers: ProviderInfo[];
  count: number;
}

export interface TestProvidersResponse {
  success: boolean;
  providers: Record<string, {
    connected: boolean;
    provider: string;
    model?: string;
    error?: string;
  }>;
  summary: {
    total: number;
    connected: number;
    disconnected: number;
    health_percentage: number;
  };
}

export interface ContentTemplate {
  prompt_template: string;
  platforms: string[];
  tone: string;
}

export interface TemplatesResponse {
  success: boolean;
  templates: Record<string, ContentTemplate>;
  count: number;
}

export interface AIConfiguration {
  platforms: string[];
  languages: Record<string, string>;
  tones: string[];
  content_types: string[];
  providers: string[];
}

// ===== API Functions =====

/**
 * Generate a social media post
 */
export const generatePost = async (
  request: GeneratePostRequest
): Promise<GeneratePostResponse> => {
  const response = await apiClient.post<GeneratePostResponse>(
    '/generate/post',
    request
  );
  return response.data;
};

/**
 * Generate hashtags for content
 */
export const generateHashtags = async (
  request: GenerateHashtagsRequest
): Promise<GenerateHashtagsResponse> => {
  const response = await apiClient.post<GenerateHashtagsResponse>(
    '/generate/hashtags',
    request
  );
  return response.data;
};

/**
 * Generate response to a comment
 */
export const generateCommentResponse = async (
  request: GenerateCommentResponseRequest
): Promise<GenerateCommentResponseResponse> => {
  const response = await apiClient.post<GenerateCommentResponseResponse>(
    '/generate/comment-response',
    request
  );
  return response.data;
};

/**
 * Repurpose content across platforms
 */
export const repurposeContent = async (
  request: RepurposeContentRequest
): Promise<RepurposeContentResponse> => {
  const response = await apiClient.post<RepurposeContentResponse>(
    '/repurpose',
    request
  );
  return response.data;
};

/**
 * Generate A/B testing variants
 */
export const generateVariants = async (
  request: GenerateVariantsRequest
): Promise<GenerateVariantsResponse> => {
  const response = await apiClient.post<GenerateVariantsResponse>(
    '/generate/variants',
    request
  );
  return response.data;
};

/**
 * Get available AI providers
 */
export const getProviders = async (): Promise<ProvidersResponse> => {
  const response = await apiClient.get<ProvidersResponse>('/providers');
  return response.data;
};

/**
 * Test all AI providers
 */
export const testProviders = async (): Promise<TestProvidersResponse> => {
  const response = await apiClient.post<TestProvidersResponse>('/providers/test');
  return response.data;
};

/**
 * Get available content templates
 */
export const getTemplates = async (): Promise<TemplatesResponse> => {
  const response = await apiClient.get<TemplatesResponse>('/templates');
  return response.data;
};

/**
 * Generate content from template
 */
export const generateFromTemplate = async (
  templateId: string,
  variables: Record<string, any>,
  platforms?: string[],
  language?: string
): Promise<any> => {
  const response = await apiClient.post('/templates/generate', {
    template_id: templateId,
    variables,
    platforms,
    language: language || 'en',
  });
  return response.data;
};

/**
 * Get AI configuration
 */
export const getAIConfiguration = async (): Promise<AIConfiguration> => {
  const response = await apiClient.get<{ success: boolean; config: AIConfiguration }>(
    '/config'
  );
  return response.data.config;
};

/**
 * Health check
 */
export const healthCheck = async (): Promise<any> => {
  const response = await apiClient.get('/health');
  return response.data;
};

export default {
  generatePost,
  generateHashtags,
  generateCommentResponse,
  repurposeContent,
  generateVariants,
  getProviders,
  testProviders,
  getTemplates,
  generateFromTemplate,
  getAIConfiguration,
  healthCheck,
};
