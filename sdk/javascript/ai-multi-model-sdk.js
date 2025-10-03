/**
 * AI Multi-Model SDK for JavaScript/Node.js
 * Enterprise SDK for Phase 2 Extended AI Multi-Model Platform
 * $100K IA Multi-Modelo Upgrade - Developer SDK
 */

const axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');

/**
 * Main SDK Class for AI Multi-Model Platform
 */
class AIMultiModelSDK extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            // API Configuration
            baseURL: config.baseURL || 'https://api.yourcompany.com',
            apiKey: config.apiKey,
            version: config.version || 'v1',
            timeout: config.timeout || 30000,
            
            // WebSocket Configuration
            enableWebSocket: config.enableWebSocket !== false,
            websocketURL: config.websocketURL || 'wss://api.yourcompany.com/ws',
            autoReconnect: config.autoReconnect !== false,
            
            // Rate Limiting
            rateLimitRetries: config.rateLimitRetries || 3,
            retryDelay: config.retryDelay || 1000,
            
            // Debug
            debug: config.debug || false
        };

        // Validate configuration
        if (!this.config.apiKey) {
            throw new Error('API key is required');
        }

        // Initialize HTTP client
        this.httpClient = axios.create({
            baseURL: `${this.config.baseURL}/api/${this.config.version}`,
            timeout: this.config.timeout,
            headers: {
                'X-API-Key': this.config.apiKey,
                'Content-Type': 'application/json',
                'User-Agent': 'AIMultiModelSDK/2.0.0'
            }
        });

        // Setup interceptors
        this.setupInterceptors();
        
        // Initialize WebSocket
        this.ws = null;
        this.wsConnected = false;
        
        // Initialize API modules
        this.ai = new AIModule(this);
        this.analytics = new AnalyticsModule(this);
        this.batch = new BatchModule(this);
        this.webhooks = new WebhookModule(this);
        this.account = new AccountModule(this);
        
        if (this.config.enableWebSocket) {
            this.connectWebSocket();
        }
        
        this.log('SDK initialized successfully');
    }

    /**
     * Setup HTTP interceptors
     */
    setupInterceptors() {
        // Request interceptor
        this.httpClient.interceptors.request.use(
            (config) => {
                this.log(`Making request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                this.log('Request error:', error.message);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.httpClient.interceptors.response.use(
            (response) => {
                this.log(`Response received: ${response.status} ${response.statusText}`);
                return response;
            },
            async (error) => {
                this.log('Response error:', error.message);
                
                // Handle rate limiting
                if (error.response?.status === 429) {
                    return this.handleRateLimit(error);
                }
                
                return Promise.reject(error);
            }
        );
    }

    /**
     * Handle rate limiting with exponential backoff
     */
    async handleRateLimit(error, retryCount = 0) {
        if (retryCount >= this.config.rateLimitRetries) {
            throw error;
        }
        
        const delay = this.config.retryDelay * Math.pow(2, retryCount);
        this.log(`Rate limited. Retrying in ${delay}ms (attempt ${retryCount + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        try {
            return await this.httpClient.request(error.config);
        } catch (retryError) {
            if (retryError.response?.status === 429) {
                return this.handleRateLimit(retryError, retryCount + 1);
            }
            throw retryError;
        }
    }

    /**
     * Connect to WebSocket for real-time updates
     */
    connectWebSocket() {
        try {
            this.ws = new WebSocket(`${this.config.websocketURL}?apiKey=${this.config.apiKey}`);
            
            this.ws.on('open', () => {
                this.wsConnected = true;
                this.log('WebSocket connected');
                this.emit('connected');
            });
            
            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    this.log('WebSocket message parse error:', error.message);
                }
            });
            
            this.ws.on('close', () => {
                this.wsConnected = false;
                this.log('WebSocket disconnected');
                this.emit('disconnected');
                
                if (this.config.autoReconnect) {
                    setTimeout(() => this.connectWebSocket(), 5000);
                }
            });
            
            this.ws.on('error', (error) => {
                this.log('WebSocket error:', error.message);
                this.emit('error', error);
            });
            
        } catch (error) {
            this.log('WebSocket connection error:', error.message);
        }
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(message) {
        const { type, data } = message;
        
        switch (type) {
            case 'ai_metrics':
                this.emit('metrics', data);
                break;
            case 'batch_update':
                this.emit('batchUpdate', data);
                break;
            case 'system_alert':
                this.emit('alert', data);
                break;
            case 'performance_update':
                this.emit('performance', data);
                break;
            default:
                this.emit('message', message);
        }
    }

    /**
     * Subscribe to WebSocket events
     */
    subscribe(eventType, callback) {
        if (!this.wsConnected) {
            throw new Error('WebSocket not connected');
        }
        
        this.on(eventType, callback);
        
        // Send subscription message
        this.ws.send(JSON.stringify({
            type: 'subscribe',
            data: { subscriptionType: eventType }
        }));
    }

    /**
     * Unsubscribe from WebSocket events
     */
    unsubscribe(eventType, callback) {
        this.off(eventType, callback);
        
        if (this.wsConnected) {
            this.ws.send(JSON.stringify({
                type: 'unsubscribe',
                data: { subscriptionType: eventType }
            }));
        }
    }

    /**
     * Logging utility
     */
    log(...args) {
        if (this.config.debug) {
            console.log('[AIMultiModelSDK]', ...args);
        }
    }

    /**
     * Close SDK connections
     */
    close() {
        if (this.ws) {
            this.ws.close();
        }
        this.removeAllListeners();
        this.log('SDK closed');
    }
}

/**
 * AI Module for model interactions
 */
class AIModule {
    constructor(sdk) {
        this.sdk = sdk;
    }

    /**
     * Process a single AI request
     */
    async process(options = {}) {
        const { prompt, model, parameters = {}, useCase } = options;
        
        if (!prompt) {
            throw new Error('Prompt is required');
        }
        
        try {
            const response = await this.sdk.httpClient.post('/ai/process', {
                prompt,
                model,
                parameters,
                useCase
            });
            
            return response.data;
        } catch (error) {
            throw new AIError('Failed to process AI request', error);
        }
    }

    /**
     * Process with consensus from multiple models
     */
    async consensus(options = {}) {
        const { prompt, models = [], parameters = {} } = options;
        
        if (!prompt) {
            throw new Error('Prompt is required');
        }
        
        if (!models.length) {
            throw new Error('At least one model is required for consensus');
        }
        
        try {
            const response = await this.sdk.httpClient.post('/ai/consensus', {
                prompt,
                models,
                parameters
            });
            
            return response.data;
        } catch (error) {
            throw new AIError('Failed to process consensus request', error);
        }
    }

    /**
     * Get available AI models
     */
    async getModels() {
        try {
            const response = await this.sdk.httpClient.get('/ai/models');
            return response.data;
        } catch (error) {
            throw new AIError('Failed to get available models', error);
        }
    }

    /**
     * Get specific model information
     */
    async getModelInfo(modelId) {
        if (!modelId) {
            throw new Error('Model ID is required');
        }
        
        try {
            const response = await this.sdk.httpClient.get(`/ai/models/${modelId}`);
            return response.data;
        } catch (error) {
            throw new AIError(`Failed to get model info for ${modelId}`, error);
        }
    }

    /**
     * Test models with a sample prompt
     */
    async test(options = {}) {
        const { prompt, models = [], parameters = {} } = options;
        
        if (!prompt) {
            throw new Error('Prompt is required for testing');
        }
        
        try {
            const response = await this.sdk.httpClient.post('/ai/test', {
                prompt,
                models,
                parameters
            });
            
            return response.data;
        } catch (error) {
            throw new AIError('Failed to test models', error);
        }
    }
}

/**
 * Analytics Module for metrics and insights
 */
class AnalyticsModule {
    constructor(sdk) {
        this.sdk = sdk;
    }

    /**
     * Get usage analytics
     */
    async getUsage(timeframe = '24h') {
        try {
            const response = await this.sdk.httpClient.get('/analytics/usage', {
                params: { timeframe }
            });
            
            return response.data;
        } catch (error) {
            throw new AnalyticsError('Failed to get usage analytics', error);
        }
    }

    /**
     * Get performance metrics
     */
    async getPerformance(timeframe = '24h') {
        try {
            const response = await this.sdk.httpClient.get('/analytics/performance', {
                params: { timeframe }
            });
            
            return response.data;
        } catch (error) {
            throw new AnalyticsError('Failed to get performance metrics', error);
        }
    }

    /**
     * Get cost analytics
     */
    async getCosts(timeframe = '24h') {
        try {
            const response = await this.sdk.httpClient.get('/analytics/costs', {
                params: { timeframe }
            });
            
            return response.data;
        } catch (error) {
            throw new AnalyticsError('Failed to get cost analytics', error);
        }
    }
}

/**
 * Batch Module for bulk processing
 */
class BatchModule {
    constructor(sdk) {
        this.sdk = sdk;
    }

    /**
     * Submit a batch job
     */
    async submit(options = {}) {
        const { requests, callbackUrl, priority = 'normal' } = options;
        
        if (!requests || !Array.isArray(requests)) {
            throw new Error('Requests array is required');
        }
        
        try {
            const response = await this.sdk.httpClient.post('/batch/submit', {
                requests,
                callback_url: callbackUrl,
                priority
            });
            
            return response.data;
        } catch (error) {
            throw new BatchError('Failed to submit batch job', error);
        }
    }

    /**
     * Get batch job status
     */
    async getStatus(jobId) {
        if (!jobId) {
            throw new Error('Job ID is required');
        }
        
        try {
            const response = await this.sdk.httpClient.get(`/batch/${jobId}`);
            return response.data;
        } catch (error) {
            throw new BatchError(`Failed to get status for job ${jobId}`, error);
        }
    }

    /**
     * Cancel a batch job
     */
    async cancel(jobId) {
        if (!jobId) {
            throw new Error('Job ID is required');
        }
        
        try {
            const response = await this.sdk.httpClient.delete(`/batch/${jobId}`);
            return response.data;
        } catch (error) {
            throw new BatchError(`Failed to cancel job ${jobId}`, error);
        }
    }
}

/**
 * Webhook Module for event notifications
 */
class WebhookModule {
    constructor(sdk) {
        this.sdk = sdk;
    }

    /**
     * Register a webhook
     */
    async register(options = {}) {
        const { url, events, secret } = options;
        
        if (!url) {
            throw new Error('Webhook URL is required');
        }
        
        if (!events || !Array.isArray(events)) {
            throw new Error('Events array is required');
        }
        
        try {
            const response = await this.sdk.httpClient.post('/webhooks', {
                url,
                events,
                secret
            });
            
            return response.data;
        } catch (error) {
            throw new WebhookError('Failed to register webhook', error);
        }
    }

    /**
     * List webhooks
     */
    async list() {
        try {
            const response = await this.sdk.httpClient.get('/webhooks');
            return response.data;
        } catch (error) {
            throw new WebhookError('Failed to list webhooks', error);
        }
    }

    /**
     * Update webhook
     */
    async update(webhookId, options = {}) {
        if (!webhookId) {
            throw new Error('Webhook ID is required');
        }
        
        try {
            const response = await this.sdk.httpClient.put(`/webhooks/${webhookId}`, options);
            return response.data;
        } catch (error) {
            throw new WebhookError(`Failed to update webhook ${webhookId}`, error);
        }
    }

    /**
     * Delete webhook
     */
    async delete(webhookId) {
        if (!webhookId) {
            throw new Error('Webhook ID is required');
        }
        
        try {
            const response = await this.sdk.httpClient.delete(`/webhooks/${webhookId}`);
            return response.data;
        } catch (error) {
            throw new WebhookError(`Failed to delete webhook ${webhookId}`, error);
        }
    }
}

/**
 * Account Module for account management
 */
class AccountModule {
    constructor(sdk) {
        this.sdk = sdk;
    }

    /**
     * Get account information
     */
    async getInfo() {
        try {
            const response = await this.sdk.httpClient.get('/account');
            return response.data;
        } catch (error) {
            throw new AccountError('Failed to get account info', error);
        }
    }

    /**
     * Get API documentation
     */
    async getDocs() {
        try {
            const response = await this.sdk.httpClient.get('/docs');
            return response.data;
        } catch (error) {
            throw new AccountError('Failed to get API documentation', error);
        }
    }
}

/**
 * Custom Error Classes
 */
class SDKError extends Error {
    constructor(message, originalError = null) {
        super(message);
        this.name = this.constructor.name;
        this.originalError = originalError;
        
        if (originalError?.response) {
            this.statusCode = originalError.response.status;
            this.responseData = originalError.response.data;
        }
    }
}

class AIError extends SDKError {}
class AnalyticsError extends SDKError {}
class BatchError extends SDKError {}
class WebhookError extends SDKError {}
class AccountError extends SDKError {}

/**
 * Utility Functions
 */
const utils = {
    /**
     * Validate API key format
     */
    validateApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }
        
        // API keys should start with 'sk_' and be at least 32 characters
        return apiKey.startsWith('sk_') && apiKey.length >= 32;
    },

    /**
     * Format model parameters
     */
    formatParameters(params) {
        const formatted = {};
        
        if (params.temperature !== undefined) {
            formatted.temperature = Math.max(0, Math.min(2, params.temperature));
        }
        
        if (params.maxTokens !== undefined) {
            formatted.max_tokens = Math.max(1, params.maxTokens);
        }
        
        if (params.topP !== undefined) {
            formatted.top_p = Math.max(0, Math.min(1, params.topP));
        }
        
        return formatted;
    },

    /**
     * Generate request ID for tracking
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
};

// Export classes and utilities
module.exports = {
    AIMultiModelSDK,
    AIError,
    AnalyticsError,
    BatchError,
    WebhookError,
    AccountError,
    utils
};

// For ES6 imports
module.exports.default = AIMultiModelSDK;