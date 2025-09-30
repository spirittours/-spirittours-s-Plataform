/**
 * Third Party API Manager
 * Enterprise integration system for external systems and services
 * Phase 2 Extended - $100K IA Multi-Modelo Upgrade
 */

const EventEmitter = require('events');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../logging/logger');

class ThirdPartyAPIManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            // API Configuration
            enablePublicAPI: options.enablePublicAPI !== false,
            enableWebhooks: options.enableWebhooks !== false,
            enableSDKSupport: options.enableSDKSupport !== false,
            
            // Authentication & Security
            jwtSecret: options.jwtSecret || process.env.JWT_SECRET,
            apiKeySecret: options.apiKeySecret || process.env.API_KEY_SECRET,
            webhookSecret: options.webhookSecret || process.env.WEBHOOK_SECRET,
            
            // Rate Limiting
            rateLimiting: {
                enabled: options.rateLimitingEnabled !== false,
                windowMs: options.windowMs || 900000, // 15 minutes
                maxRequests: options.maxRequests || 100,
                premiumMaxRequests: options.premiumMaxRequests || 1000
            },
            
            // API Versioning
            currentVersion: options.currentVersion || 'v1',
            supportedVersions: options.supportedVersions || ['v1'],
            
            // Integration Features
            features: {
                aiModelAccess: options.aiModelAccess !== false,
                realTimeWebSockets: options.realTimeWebSockets !== false,
                batchProcessing: options.batchProcessing !== false,
                analyticsAPI: options.analyticsAPI !== false,
                webhookNotifications: options.webhookNotifications !== false,
                customModels: options.customModels || false
            },
            
            // Webhook Configuration
            webhooks: {
                retryAttempts: options.webhookRetryAttempts || 3,
                retryDelay: options.webhookRetryDelay || 1000,
                timeout: options.webhookTimeout || 30000,
                batchSize: options.webhookBatchSize || 10
            },
            
            ...options
        };

        // API Management
        this.apiKeys = new Map();
        this.webhookEndpoints = new Map();
        this.integrations = new Map();
        this.apiUsage = new Map();
        this.webhookQueue = [];
        
        // Request tracking
        this.requestHistory = [];
        this.errorHistory = [];
        this.performanceMetrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            totalResponseTime: 0
        };

        // Initialize components
        this.initializeAPIEndpoints();
        this.initializeWebhookSystem();
        this.initializeSDKSupport();
        this.startMetricsCollection();
        
        logger.info('Third Party API Manager initialized', {
            publicAPIEnabled: this.config.enablePublicAPI,
            webhooksEnabled: this.config.enableWebhooks,
            currentVersion: this.config.currentVersion,
            features: Object.entries(this.config.features).filter(([_, enabled]) => enabled).map(([feature]) => feature)
        });
    }

    /**
     * Initialize API endpoints
     */
    initializeAPIEndpoints() {
        this.router = express.Router();
        
        // Apply rate limiting
        if (this.config.rateLimiting.enabled) {
            this.setupRateLimiting();
        }
        
        // Setup middleware
        this.setupMiddleware();
        
        // Define API endpoints
        this.defineAIEndpoints();
        this.defineAnalyticsEndpoints();
        this.defineBatchEndpoints();
        this.defineWebhookEndpoints();
        this.defineManagementEndpoints();
        
        logger.info('API endpoints initialized');
    }

    /**
     * Setup rate limiting
     */
    setupRateLimiting() {
        // Standard rate limiter
        this.standardLimiter = rateLimit({
            windowMs: this.config.rateLimiting.windowMs,
            max: this.config.rateLimiting.maxRequests,
            message: {
                success: false,
                error: 'Rate limit exceeded',
                retryAfter: Math.ceil(this.config.rateLimiting.windowMs / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false
        });
        
        // Premium rate limiter
        this.premiumLimiter = rateLimit({
            windowMs: this.config.rateLimiting.windowMs,
            max: this.config.rateLimiting.premiumMaxRequests,
            message: {
                success: false,
                error: 'Premium rate limit exceeded',
                retryAfter: Math.ceil(this.config.rateLimiting.windowMs / 1000)
            }
        });
    }

    /**
     * Setup middleware
     */
    setupMiddleware() {
        // Request logging middleware
        this.router.use((req, res, next) => {
            req.startTime = Date.now();
            logger.info('Third party API request', {
                method: req.method,
                path: req.path,
                userAgent: req.get('User-Agent'),
                ip: req.ip
            });
            next();
        });

        // API key authentication middleware
        this.router.use('/api/:version', this.authenticateAPIKey.bind(this));
        
        // Response time tracking middleware
        this.router.use((req, res, next) => {
            const originalSend = res.send;
            res.send = (body) => {
                const responseTime = Date.now() - req.startTime;
                this.trackAPIUsage(req, res, responseTime);
                return originalSend.call(res, body);
            };
            next();
        });
    }

    /**
     * Define AI endpoints
     */
    defineAIEndpoints() {
        if (!this.config.features.aiModelAccess) return;

        // Process AI request
        this.router.post('/api/:version/ai/process', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this),
            body('prompt').notEmpty().withMessage('Prompt is required'),
            body('model').optional().isString(),
            body('parameters').optional().isObject(),
            this.handleValidationErrors.bind(this)
        ], this.processAIRequest.bind(this));

        // Get available models
        this.router.get('/api/:version/ai/models', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this)
        ], this.getAvailableModels.bind(this));

        // Get model information
        this.router.get('/api/:version/ai/models/:modelId', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this)
        ], this.getModelInfo.bind(this));

        // Process with multiple models (consensus)
        this.router.post('/api/:version/ai/consensus', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this),
            body('prompt').notEmpty().withMessage('Prompt is required'),
            body('models').isArray({ min: 2, max: 5 }).withMessage('2-5 models required'),
            this.handleValidationErrors.bind(this)
        ], this.processConsensusRequest.bind(this));
    }

    /**
     * Define analytics endpoints
     */
    defineAnalyticsEndpoints() {
        if (!this.config.features.analyticsAPI) return;

        // Get usage analytics
        this.router.get('/api/:version/analytics/usage', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this)
        ], this.getUsageAnalytics.bind(this));

        // Get performance metrics
        this.router.get('/api/:version/analytics/performance', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this)
        ], this.getPerformanceMetrics.bind(this));

        // Get cost analytics
        this.router.get('/api/:version/analytics/costs', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this)
        ], this.getCostAnalytics.bind(this));
    }

    /**
     * Define batch endpoints
     */
    defineBatchEndpoints() {
        if (!this.config.features.batchProcessing) return;

        // Submit batch job
        this.router.post('/api/:version/batch/submit', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this),
            body('requests').isArray({ min: 1, max: 100 }).withMessage('1-100 requests allowed'),
            body('callback_url').optional().isURL(),
            this.handleValidationErrors.bind(this)
        ], this.submitBatchJob.bind(this));

        // Get batch job status
        this.router.get('/api/:version/batch/:jobId', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this)
        ], this.getBatchJobStatus.bind(this));

        // Cancel batch job
        this.router.delete('/api/:version/batch/:jobId', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this)
        ], this.cancelBatchJob.bind(this));
    }

    /**
     * Define webhook endpoints
     */
    defineWebhookEndpoints() {
        if (!this.config.features.webhookNotifications) return;

        // Register webhook
        this.router.post('/api/:version/webhooks', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this),
            body('url').isURL().withMessage('Valid URL required'),
            body('events').isArray({ min: 1 }).withMessage('At least one event required'),
            body('secret').optional().isString(),
            this.handleValidationErrors.bind(this)
        ], this.registerWebhook.bind(this));

        // List webhooks
        this.router.get('/api/:version/webhooks', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this)
        ], this.listWebhooks.bind(this));

        // Update webhook
        this.router.put('/api/:version/webhooks/:webhookId', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this),
            body('url').optional().isURL(),
            body('events').optional().isArray({ min: 1 }),
            this.handleValidationErrors.bind(this)
        ], this.updateWebhook.bind(this));

        // Delete webhook
        this.router.delete('/api/:version/webhooks/:webhookId', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this)
        ], this.deleteWebhook.bind(this));
    }

    /**
     * Define management endpoints
     */
    defineManagementEndpoints() {
        // Get API key info
        this.router.get('/api/:version/account', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this)
        ], this.getAccountInfo.bind(this));

        // Get API usage
        this.router.get('/api/:version/usage', [
            this.validateVersion.bind(this),
            this.applyRateLimit.bind(this)
        ], this.getAPIUsage.bind(this));

        // Health check
        this.router.get('/api/:version/health', [
            this.validateVersion.bind(this)
        ], this.getHealthStatus.bind(this));

        // API documentation
        this.router.get('/api/:version/docs', [
            this.validateVersion.bind(this)
        ], this.getAPIDocumentation.bind(this));
    }

    /**
     * Middleware functions
     */
    validateVersion(req, res, next) {
        const version = req.params.version;
        if (!this.config.supportedVersions.includes(version)) {
            return res.status(400).json({
                success: false,
                error: `API version ${version} not supported`,
                supportedVersions: this.config.supportedVersions
            });
        }
        req.apiVersion = version;
        next();
    }

    async authenticateAPIKey(req, res, next) {
        try {
            const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
            
            if (!apiKey) {
                return res.status(401).json({
                    success: false,
                    error: 'API key required'
                });
            }

            const keyInfo = await this.validateAPIKey(apiKey);
            if (!keyInfo) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid API key'
                });
            }

            req.apiKeyInfo = keyInfo;
            next();

        } catch (error) {
            logger.error('API key authentication error', error);
            res.status(500).json({
                success: false,
                error: 'Authentication error'
            });
        }
    }

    applyRateLimit(req, res, next) {
        const limiter = req.apiKeyInfo?.tier === 'premium' ? 
            this.premiumLimiter : this.standardLimiter;
        limiter(req, res, next);
    }

    handleValidationErrors(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: errors.array()
            });
        }
        next();
    }

    /**
     * API endpoint implementations
     */
    async processAIRequest(req, res) {
        try {
            const { prompt, model, parameters = {} } = req.body;
            const apiKeyInfo = req.apiKeyInfo;

            // Check if model access is allowed
            if (model && !this.isModelAllowed(model, apiKeyInfo)) {
                return res.status(403).json({
                    success: false,
                    error: 'Model access not allowed for your API key tier'
                });
            }

            // Process the AI request (integration with AIMultiModelManager)
            const result = await this.processAIRequestInternal(prompt, model, parameters, apiKeyInfo);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Error processing AI request', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process AI request'
            });
        }
    }

    async getAvailableModels(req, res) {
        try {
            const apiKeyInfo = req.apiKeyInfo;
            const models = await this.getAvailableModelsForTier(apiKeyInfo.tier);

            res.json({
                success: true,
                data: {
                    models,
                    tier: apiKeyInfo.tier,
                    totalModels: models.length
                }
            });

        } catch (error) {
            logger.error('Error getting available models', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get available models'
            });
        }
    }

    /**
     * Get detailed information about a specific model
     */
    async getModelInfo(req, res) {
        try {
            const { modelId } = req.params;
            const apiKeyInfo = req.apiKeyInfo;
            const models = await this.getAvailableModelsForTier(apiKeyInfo.tier);
            
            // Find the specific model
            const modelInfo = models.find(model => model.id === modelId);
            
            if (!modelInfo) {
                return res.status(404).json({
                    success: false,
                    error: 'Model not found or not available for your tier'
                });
            }

            res.json({
                success: true,
                data: {
                    model: modelInfo,
                    tier: apiKeyInfo.tier,
                    access: true
                }
            });

        } catch (error) {
            logger.error('Error getting model info', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get model information'
            });
        }
    }

    async processConsensusRequest(req, res) {
        try {
            const { prompt, models } = req.body;
            const apiKeyInfo = req.apiKeyInfo;

            // Check if consensus feature is allowed
            if (!this.isFeatureAllowed('consensus', apiKeyInfo)) {
                return res.status(403).json({
                    success: false,
                    error: 'Consensus processing not available for your tier'
                });
            }

            const result = await this.processConsensusInternal(prompt, models, apiKeyInfo);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Error processing consensus request', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process consensus request'
            });
        }
    }

    async getUsageAnalytics(req, res) {
        try {
            const apiKeyInfo = req.apiKeyInfo;
            const { timeframe = '24h' } = req.query;

            const analytics = await this.getUsageAnalyticsForKey(apiKeyInfo.keyId, timeframe);

            res.json({
                success: true,
                data: analytics
            });

        } catch (error) {
            logger.error('Error getting usage analytics', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get usage analytics'
            });
        }
    }

    async submitBatchJob(req, res) {
        try {
            const { requests, callback_url } = req.body;
            const apiKeyInfo = req.apiKeyInfo;

            const jobId = await this.createBatchJob(requests, callback_url, apiKeyInfo);

            res.json({
                success: true,
                data: {
                    jobId,
                    status: 'queued',
                    totalRequests: requests.length,
                    estimatedCompletionTime: this.estimateBatchCompletionTime(requests.length)
                }
            });

        } catch (error) {
            logger.error('Error submitting batch job', error);
            res.status(500).json({
                success: false,
                error: 'Failed to submit batch job'
            });
        }
    }

    async registerWebhook(req, res) {
        try {
            const { url, events, secret } = req.body;
            const apiKeyInfo = req.apiKeyInfo;

            const webhookId = await this.createWebhook(url, events, secret, apiKeyInfo);

            res.json({
                success: true,
                data: {
                    webhookId,
                    url,
                    events,
                    status: 'active'
                }
            });

        } catch (error) {
            logger.error('Error registering webhook', error);
            res.status(500).json({
                success: false,
                error: 'Failed to register webhook'
            });
        }
    }

    async getAccountInfo(req, res) {
        try {
            const apiKeyInfo = req.apiKeyInfo;
            const usage = this.apiUsage.get(apiKeyInfo.keyId) || this.getDefaultUsage();

            res.json({
                success: true,
                data: {
                    keyId: apiKeyInfo.keyId,
                    tier: apiKeyInfo.tier,
                    features: apiKeyInfo.features,
                    usage: {
                        requestsThisMonth: usage.requestsThisMonth,
                        requestLimit: usage.requestLimit,
                        costsThisMonth: usage.costsThisMonth,
                        costLimit: usage.costLimit
                    },
                    rateLimits: {
                        requestsPerWindow: this.getRateLimitForTier(apiKeyInfo.tier),
                        windowMs: this.config.rateLimiting.windowMs
                    }
                }
            });

        } catch (error) {
            logger.error('Error getting account info', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get account information'
            });
        }
    }

    async getHealthStatus(req, res) {
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date(),
                version: req.apiVersion,
                features: Object.entries(this.config.features)
                    .filter(([_, enabled]) => enabled)
                    .map(([feature]) => feature),
                metrics: {
                    totalRequests: this.performanceMetrics.totalRequests,
                    successRate: this.performanceMetrics.totalRequests > 0 ? 
                        (this.performanceMetrics.successfulRequests / this.performanceMetrics.totalRequests * 100).toFixed(2) + '%' : '0%',
                    averageResponseTime: this.performanceMetrics.averageResponseTime
                }
            };

            res.json({
                success: true,
                data: health
            });

        } catch (error) {
            logger.error('Error getting health status', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get health status'
            });
        }
    }

    /**
     * Initialize webhook system
     */
    initializeWebhookSystem() {
        if (!this.config.enableWebhooks) return;

        // Start webhook processing
        setInterval(() => {
            this.processWebhookQueue();
        }, 5000); // Process every 5 seconds

        logger.info('Webhook system initialized');
    }

    /**
     * Initialize SDK support
     */
    initializeSDKSupport() {
        if (!this.config.enableSDKSupport) return;

        // Generate SDK documentation and examples
        this.generateSDKDocumentation();

        logger.info('SDK support initialized');
    }

    /**
     * Start metrics collection
     */
    startMetricsCollection() {
        setInterval(() => {
            this.collectMetrics();
        }, 60000); // Collect every minute

        logger.info('Metrics collection started');
    }

    /**
     * Helper methods
     */
    async validateAPIKey(apiKey) {
        // Mock implementation - in production, validate against database
        if (apiKey === 'demo_api_key_12345') {
            return {
                keyId: 'demo_key',
                tier: 'premium',
                features: ['aiModelAccess', 'analyticsAPI', 'batchProcessing', 'webhookNotifications'],
                organization: 'Demo Organization',
                createdAt: new Date('2024-01-01'),
                isActive: true
            };
        }
        
        if (apiKey.startsWith('sk_')) {
            return {
                keyId: apiKey.substring(0, 10),
                tier: 'standard',
                features: ['aiModelAccess', 'analyticsAPI'],
                organization: 'Standard User',
                createdAt: new Date(),
                isActive: true
            };
        }
        
        return null;
    }

    isModelAllowed(modelId, apiKeyInfo) {
        const premiumModels = ['gpt-4', 'claude-4', 'claude-4.5'];
        if (premiumModels.includes(modelId)) {
            return apiKeyInfo.tier === 'premium';
        }
        return true;
    }

    isFeatureAllowed(feature, apiKeyInfo) {
        return apiKeyInfo.features.includes(feature);
    }

    async getAvailableModelsForTier(tier) {
        const allModels = [
            { id: 'gpt-4', name: 'GPT-4 Turbo', tier: 'premium' },
            { id: 'gpt-4-omni', name: 'GPT-4 Omni', tier: 'premium' },
            { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', tier: 'standard' },
            { id: 'claude-4', name: 'Claude 4', tier: 'premium' },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tier: 'standard' },
            { id: 'qwen-2.5-72b', name: 'Qwen 2.5 72B', tier: 'standard' }
        ];

        return allModels.filter(model => 
            model.tier === 'standard' || tier === 'premium'
        );
    }

    getRateLimitForTier(tier) {
        return tier === 'premium' ? 
            this.config.rateLimiting.premiumMaxRequests : 
            this.config.rateLimiting.maxRequests;
    }

    trackAPIUsage(req, res, responseTime) {
        // Track performance metrics
        this.performanceMetrics.totalRequests++;
        this.performanceMetrics.totalResponseTime += responseTime;
        this.performanceMetrics.averageResponseTime = 
            this.performanceMetrics.totalResponseTime / this.performanceMetrics.totalRequests;

        if (res.statusCode >= 200 && res.statusCode < 300) {
            this.performanceMetrics.successfulRequests++;
        } else {
            this.performanceMetrics.failedRequests++;
        }

        // Track API key usage
        const apiKeyInfo = req.apiKeyInfo;
        if (apiKeyInfo) {
            const usage = this.apiUsage.get(apiKeyInfo.keyId) || this.getDefaultUsage();
            usage.requestsThisMonth++;
            usage.totalRequests++;
            usage.totalResponseTime += responseTime;
            this.apiUsage.set(apiKeyInfo.keyId, usage);
        }

        // Store request history
        this.requestHistory.push({
            timestamp: new Date(req.startTime),
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime,
            apiKey: apiKeyInfo?.keyId,
            userAgent: req.get('User-Agent')
        });

        // Keep only recent history
        if (this.requestHistory.length > 1000) {
            this.requestHistory = this.requestHistory.slice(-1000);
        }
    }

    getDefaultUsage() {
        return {
            requestsThisMonth: 0,
            requestLimit: 10000,
            costsThisMonth: 0,
            costLimit: 1000,
            totalRequests: 0,
            totalResponseTime: 0
        };
    }

    async processAIRequestInternal(prompt, model, parameters, apiKeyInfo) {
        // Mock implementation - in production, integrate with AIMultiModelManager
        return {
            response: `This is a mock AI response to: "${prompt.substring(0, 50)}..."`,
            model: model || 'gpt-4',
            tokensUsed: Math.floor(Math.random() * 100) + 50,
            responseTime: Math.floor(Math.random() * 2000) + 500,
            requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
        };
    }

    async processConsensusInternal(prompt, models, apiKeyInfo) {
        // Mock implementation
        return {
            consensus: `Consensus response for: "${prompt.substring(0, 50)}..."`,
            models: models,
            confidence: 0.85,
            responses: models.map(model => ({
                model,
                response: `Response from ${model}`,
                confidence: Math.random() * 0.4 + 0.6
            })),
            requestId: `consensus_${Date.now()}`
        };
    }

    /**
     * Get third party API statistics
     */
    getThirdPartyAPIStatistics() {
        const recentRequests = this.requestHistory.slice(-100);
        
        return {
            overview: {
                totalRequests: this.performanceMetrics.totalRequests,
                successfulRequests: this.performanceMetrics.successfulRequests,
                failedRequests: this.performanceMetrics.failedRequests,
                averageResponseTime: this.performanceMetrics.averageResponseTime,
                successRate: this.performanceMetrics.totalRequests > 0 ? 
                    (this.performanceMetrics.successfulRequests / this.performanceMetrics.totalRequests * 100).toFixed(2) : 0
            },
            apiKeys: {
                total: this.apiUsage.size,
                active: Array.from(this.apiUsage.values()).filter(usage => usage.requestsThisMonth > 0).length
            },
            webhooks: {
                registered: this.webhookEndpoints.size,
                queueLength: this.webhookQueue.length
            },
            recentRequests: recentRequests.map(req => ({
                timestamp: req.timestamp,
                method: req.method,
                path: req.path,
                statusCode: req.statusCode,
                responseTime: req.responseTime
            })),
            configuration: {
                version: this.config.currentVersion,
                rateLimitingEnabled: this.config.rateLimiting.enabled,
                featuresEnabled: Object.entries(this.config.features)
                    .filter(([_, enabled]) => enabled)
                    .map(([feature]) => feature)
            }
        };
    }

    // Additional helper methods
    async createBatchJob(requests, callbackUrl, apiKeyInfo) {
        // Mock implementation
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    estimateBatchCompletionTime(requestCount) {
        // Estimate 2 seconds per request
        return new Date(Date.now() + (requestCount * 2000));
    }

    async createWebhook(url, events, secret, apiKeyInfo) {
        const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        this.webhookEndpoints.set(webhookId, {
            id: webhookId,
            url,
            events,
            secret,
            apiKeyId: apiKeyInfo.keyId,
            createdAt: new Date(),
            isActive: true
        });
        
        return webhookId;
    }

    processWebhookQueue() {
        // Process webhook queue (mock implementation)
        if (this.webhookQueue.length > 0) {
            logger.info('Processing webhook queue', { queueLength: this.webhookQueue.length });
            this.webhookQueue = []; // Clear for demo
        }
    }

    generateSDKDocumentation() {
        // Generate SDK documentation (mock implementation)
        logger.info('SDK documentation generated');
    }

    collectMetrics() {
        // Collect additional metrics (mock implementation)
        this.emit('metricsCollected', {
            timestamp: new Date(),
            metrics: this.performanceMetrics
        });
    }

    async getUsageAnalyticsForKey(keyId, timeframe) {
        // Mock implementation
        return {
            timeframe,
            requests: Math.floor(Math.random() * 1000),
            costs: Math.random() * 100,
            models: ['gpt-4', 'claude-3.5-sonnet'],
            averageResponseTime: Math.floor(Math.random() * 1000) + 500
        };
    }

    // ===== MISSING API ENDPOINT METHODS =====

    /**
     * Get performance metrics
     */
    async getPerformanceMetrics(req, res) {
        try {
            const apiKeyInfo = req.apiKeyInfo;
            const timeframe = req.query.timeframe || '24h';

            const metrics = {
                timeframe,
                averageResponseTime: Math.floor(Math.random() * 1000) + 500,
                totalRequests: Math.floor(Math.random() * 10000) + 1000,
                successRate: (95 + Math.random() * 5).toFixed(2) + '%',
                errorRate: (Math.random() * 5).toFixed(2) + '%',
                throughput: Math.floor(Math.random() * 100) + 50,
                uptime: '99.9%',
                tier: apiKeyInfo.tier,
                timestamp: new Date().toISOString()
            };

            res.json({
                success: true,
                data: metrics
            });

        } catch (error) {
            logger.error('Error getting performance metrics', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get performance metrics'
            });
        }
    }

    /**
     * Get cost analytics
     */
    async getCostAnalytics(req, res) {
        try {
            const apiKeyInfo = req.apiKeyInfo;
            const timeframe = req.query.timeframe || '24h';

            const analytics = {
                timeframe,
                totalCost: (Math.random() * 100).toFixed(2),
                costByModel: {
                    'gpt-4': (Math.random() * 40).toFixed(2),
                    'claude-3.5-sonnet': (Math.random() * 30).toFixed(2),
                    'gemini-2.0-flash': (Math.random() * 20).toFixed(2)
                },
                projectedMonthlyCost: (Math.random() * 1000).toFixed(2),
                costPerRequest: (Math.random() * 0.1).toFixed(4),
                tier: apiKeyInfo.tier,
                timestamp: new Date().toISOString()
            };

            res.json({
                success: true,
                data: analytics
            });

        } catch (error) {
            logger.error('Error getting cost analytics', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get cost analytics'
            });
        }
    }

    /**
     * Get batch job status
     */
    async getBatchJobStatus(req, res) {
        try {
            const { jobId } = req.params;
            const apiKeyInfo = req.apiKeyInfo;

            // Mock batch job status
            const jobStatus = {
                id: jobId,
                status: Math.random() > 0.5 ? 'completed' : 'processing',
                progress: Math.floor(Math.random() * 100),
                totalRequests: Math.floor(Math.random() * 100) + 10,
                completedRequests: Math.floor(Math.random() * 80) + 5,
                failedRequests: Math.floor(Math.random() * 5),
                estimatedCompletion: new Date(Date.now() + Math.random() * 3600000),
                createdAt: new Date(Date.now() - Math.random() * 3600000),
                tier: apiKeyInfo.tier
            };

            res.json({
                success: true,
                data: jobStatus
            });

        } catch (error) {
            logger.error('Error getting batch job status', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get batch job status'
            });
        }
    }

    /**
     * Cancel batch job
     */
    async cancelBatchJob(req, res) {
        try {
            const { jobId } = req.params;
            const apiKeyInfo = req.apiKeyInfo;

            // Mock batch job cancellation
            const cancelResult = {
                id: jobId,
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
                processedRequests: Math.floor(Math.random() * 50),
                remainingRequests: Math.floor(Math.random() * 20),
                tier: apiKeyInfo.tier
            };

            res.json({
                success: true,
                message: 'Batch job cancelled successfully',
                data: cancelResult
            });

        } catch (error) {
            logger.error('Error cancelling batch job', error);
            res.status(500).json({
                success: false,
                error: 'Failed to cancel batch job'
            });
        }
    }

    /**
     * Get API documentation
     */
    async getAPIDocumentation(req, res) {
        try {
            const apiKeyInfo = req.apiKeyInfo;

            const documentation = {
                version: 'v1',
                tier: apiKeyInfo.tier,
                endpoints: {
                    '/api/v1/ai/process': {
                        method: 'POST',
                        description: 'Process AI request with specified model',
                        parameters: ['prompt', 'model', 'parameters'],
                        authentication: 'API Key required'
                    },
                    '/api/v1/ai/models': {
                        method: 'GET',
                        description: 'Get available AI models for your tier',
                        parameters: [],
                        authentication: 'API Key required'
                    },
                    '/api/v1/ai/consensus': {
                        method: 'POST',
                        description: 'Process request with multiple models',
                        parameters: ['prompt', 'models'],
                        authentication: 'API Key required'
                    }
                },
                rateLimits: {
                    standard: '100 requests per 15 minutes',
                    premium: '1000 requests per 15 minutes',
                    enterprise: 'Custom limits'
                },
                sdkLinks: {
                    javascript: 'https://github.com/company/ai-sdk-js',
                    python: 'https://github.com/company/ai-sdk-python',
                    curl: 'Available in documentation'
                }
            };

            res.json({
                success: true,
                data: documentation
            });

        } catch (error) {
            logger.error('Error getting API documentation', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get API documentation'
            });
        }
    }

    /**
     * List webhooks
     */
    async listWebhooks(req, res) {
        try {
            const apiKeyInfo = req.apiKeyInfo;
            
            // Get webhooks for this API key
            const webhooks = Array.from(this.webhookEndpoints.values())
                .filter(webhook => webhook.apiKeyId === apiKeyInfo.keyId)
                .map(webhook => ({
                    id: webhook.id,
                    url: webhook.url,
                    events: webhook.events,
                    isActive: webhook.isActive,
                    createdAt: webhook.createdAt
                }));

            res.json({
                success: true,
                data: {
                    webhooks,
                    total: webhooks.length,
                    tier: apiKeyInfo.tier
                }
            });

        } catch (error) {
            logger.error('Error listing webhooks', error);
            res.status(500).json({
                success: false,
                error: 'Failed to list webhooks'
            });
        }
    }

    /**
     * Update webhook
     */
    async updateWebhook(req, res) {
        try {
            const { webhookId } = req.params;
            const { url, events } = req.body;
            const apiKeyInfo = req.apiKeyInfo;
            
            const webhook = this.webhookEndpoints.get(webhookId);
            
            if (!webhook || webhook.apiKeyId !== apiKeyInfo.keyId) {
                return res.status(404).json({
                    success: false,
                    error: 'Webhook not found'
                });
            }

            // Update webhook
            if (url) webhook.url = url;
            if (events) webhook.events = events;
            webhook.updatedAt = new Date();

            res.json({
                success: true,
                message: 'Webhook updated successfully',
                data: {
                    id: webhook.id,
                    url: webhook.url,
                    events: webhook.events,
                    updatedAt: webhook.updatedAt
                }
            });

        } catch (error) {
            logger.error('Error updating webhook', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update webhook'
            });
        }
    }

    /**
     * Delete webhook
     */
    async deleteWebhook(req, res) {
        try {
            const { webhookId } = req.params;
            const apiKeyInfo = req.apiKeyInfo;
            
            const webhook = this.webhookEndpoints.get(webhookId);
            
            if (!webhook || webhook.apiKeyId !== apiKeyInfo.keyId) {
                return res.status(404).json({
                    success: false,
                    error: 'Webhook not found'
                });
            }

            // Delete webhook
            this.webhookEndpoints.delete(webhookId);

            res.json({
                success: true,
                message: 'Webhook deleted successfully',
                data: {
                    id: webhookId,
                    deletedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error('Error deleting webhook', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete webhook'
            });
        }
    }

    /**
     * Get router for Express app
     */
    getRouter() {
        return this.router;
    }

    /**
     * Shutdown third party API manager
     */
    async shutdown() {
        logger.info('Shutting down Third Party API Manager');
        this.removeAllListeners();
        logger.info('Third Party API Manager shutdown complete');
    }
}

module.exports = ThirdPartyAPIManager;