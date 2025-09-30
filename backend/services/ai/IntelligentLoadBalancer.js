/**
 * Intelligent Load Balancer for AI Multi-Model System
 * Distributes requests optimally across AI providers
 * Phase 2 Extended - $100K IA Multi-Modelo Upgrade
 */

const EventEmitter = require('events');
const logger = require('../logging/logger');

class IntelligentLoadBalancer extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            maxConcurrentRequests: options.maxConcurrentRequests || 100,
            healthCheckInterval: options.healthCheckInterval || 30000,
            responseTimeThreshold: options.responseTimeThreshold || 5000,
            errorRateThreshold: options.errorRateThreshold || 0.1,
            cooldownPeriod: options.cooldownPeriod || 60000,
            adaptiveScaling: options.adaptiveScaling !== false,
            priorityWeighting: options.priorityWeighting !== false,
            ...options
        };

        // Model performance tracking
        this.modelStats = new Map();
        this.modelHealth = new Map();
        this.activeRequests = new Map();
        this.requestQueue = [];
        
        // Load balancing algorithms
        this.algorithms = {
            roundRobin: this.roundRobinBalance.bind(this),
            weighted: this.weightedBalance.bind(this),
            leastConnections: this.leastConnectionsBalance.bind(this),
            responseTime: this.responseTimeBalance.bind(this),
            intelligent: this.intelligentBalance.bind(this),
            adaptive: this.adaptiveBalance.bind(this)
        };

        this.currentAlgorithm = 'intelligent';
        this.roundRobinCounter = 0;
        
        this.initializeModelTracking();
        this.startHealthMonitoring();
        
        logger.info('Intelligent Load Balancer initialized', {
            algorithm: this.currentAlgorithm,
            maxConcurrent: this.config.maxConcurrentRequests,
            adaptiveScaling: this.config.adaptiveScaling
        });
    }

    /**
     * Initialize model performance tracking
     */
    initializeModelTracking() {
        const models = [
            'gpt-4', 'gpt-4-omni', 'claude-3.5-sonnet', 'claude-4', 'claude-4.5',
            'qwen-2.5-72b', 'deepseek-v3', 'grok-beta', 'llama-3.3-70b', 
            'gemini-2.0-flash', 'mistral-large-2'
        ];

        models.forEach(modelId => {
            this.modelStats.set(modelId, {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                totalResponseTime: 0,
                averageResponseTime: 0,
                currentLoad: 0,
                maxLoad: 10,
                errorRate: 0,
                lastRequestTime: null,
                lastErrorTime: null,
                consecutiveErrors: 0,
                weight: 1.0,
                priority: 1,
                costPerToken: this.getModelCost(modelId),
                capabilities: this.getModelCapabilities(modelId)
            });

            this.modelHealth.set(modelId, {
                status: 'healthy',
                availability: 1.0,
                lastHealthCheck: new Date(),
                responseTimeHistory: [],
                errorHistory: [],
                loadHistory: []
            });

            this.activeRequests.set(modelId, new Set());
        });
    }

    /**
     * Get model cost per token (estimated)
     */
    getModelCost(modelId) {
        const costs = {
            'gpt-4': 0.03,
            'gpt-4-omni': 0.025,
            'claude-3.5-sonnet': 0.015,
            'claude-4': 0.02,
            'claude-4.5': 0.025,
            'qwen-2.5-72b': 0.008,
            'deepseek-v3': 0.006,
            'grok-beta': 0.012,
            'llama-3.3-70b': 0.004,
            'gemini-2.0-flash': 0.007,
            'mistral-large-2': 0.01
        };
        return costs[modelId] || 0.01;
    }

    /**
     * Get model capabilities
     */
    getModelCapabilities(modelId) {
        const capabilities = {
            'gpt-4': ['reasoning', 'code', 'analysis', 'creative'],
            'gpt-4-omni': ['multimodal', 'reasoning', 'fast'],
            'claude-3.5-sonnet': ['analysis', 'reasoning', 'detailed'],
            'claude-4': ['advanced_reasoning', 'analysis'],
            'claude-4.5': ['advanced_reasoning', 'multimodal'],
            'qwen-2.5-72b': ['multilingual', 'math', 'code'],
            'deepseek-v3': ['reasoning', 'math', 'code'],
            'grok-beta': ['real_time', 'social_media'],
            'llama-3.3-70b': ['open_source', 'customizable'],
            'gemini-2.0-flash': ['fast', 'multimodal', 'large_context'],
            'mistral-large-2': ['privacy', 'european_compliance']
        };
        return capabilities[modelId] || ['general'];
    }

    /**
     * Select best model for request using intelligent load balancing
     */
    async selectModel(requestOptions = {}) {
        const { 
            useCase = 'general', 
            priority = 'normal', 
            maxResponseTime = null,
            budgetConstraint = null,
            requiredCapabilities = [],
            excludeModels = []
        } = requestOptions;

        try {
            // Filter available models based on criteria
            const availableModels = this.getAvailableModels(excludeModels, requiredCapabilities);
            
            if (availableModels.length === 0) {
                throw new Error('No available models match the criteria');
            }

            // Use the current algorithm to select model
            const selectedModel = await this.algorithms[this.currentAlgorithm](
                availableModels, 
                requestOptions
            );

            // Track the selection
            await this.trackModelSelection(selectedModel, requestOptions);

            logger.info('Model selected by load balancer', {
                selectedModel,
                algorithm: this.currentAlgorithm,
                useCase,
                priority,
                availableModels: availableModels.length
            });

            return selectedModel;

        } catch (error) {
            logger.error('Error in model selection', error);
            
            // Fallback to first available model
            const fallbackModels = this.getHealthyModels();
            if (fallbackModels.length > 0) {
                return fallbackModels[0];
            }
            
            throw error;
        }
    }

    /**
     * Intelligent balancing algorithm
     */
    async intelligentBalance(availableModels, requestOptions) {
        const { useCase, priority, maxResponseTime, budgetConstraint } = requestOptions;
        
        let bestModel = null;
        let bestScore = -1;

        for (const modelId of availableModels) {
            const stats = this.modelStats.get(modelId);
            const health = this.modelHealth.get(modelId);
            
            if (!stats || !health || health.status !== 'healthy') {
                continue;
            }

            // Calculate composite score
            let score = 0;
            
            // 1. Load factor (30%)
            const loadFactor = 1 - (stats.currentLoad / stats.maxLoad);
            score += loadFactor * 0.3;
            
            // 2. Performance factor (25%)
            const avgResponseTime = stats.averageResponseTime || 1000;
            const performanceFactor = Math.max(0, 1 - (avgResponseTime / 10000));
            score += performanceFactor * 0.25;
            
            // 3. Reliability factor (20%)
            const reliabilityFactor = 1 - stats.errorRate;
            score += reliabilityFactor * 0.2;
            
            // 4. Cost factor (15%)
            const costFactor = budgetConstraint ? 
                Math.max(0, 1 - (stats.costPerToken / 0.05)) : 0.5;
            score += costFactor * 0.15;
            
            // 5. Capability match (10%)
            const capabilityScore = this.calculateCapabilityScore(modelId, useCase);
            score += capabilityScore * 0.1;
            
            // Priority weighting
            if (priority === 'high') {
                score *= 1.2;
            } else if (priority === 'low') {
                score *= 0.8;
            }
            
            // Response time constraint
            if (maxResponseTime && avgResponseTime > maxResponseTime) {
                score *= 0.5;
            }

            if (score > bestScore) {
                bestScore = score;
                bestModel = modelId;
            }
        }

        return bestModel || availableModels[0];
    }

    /**
     * Adaptive balancing that learns from patterns
     */
    async adaptiveBalance(availableModels, requestOptions) {
        const { useCase } = requestOptions;
        
        // Learn from historical performance for this use case
        const useCaseStats = await this.getUseCaseStatistics(useCase);
        
        if (useCaseStats && useCaseStats.bestPerformers.length > 0) {
            // Prefer models that historically perform well for this use case
            for (const modelId of useCaseStats.bestPerformers) {
                if (availableModels.includes(modelId)) {
                    const stats = this.modelStats.get(modelId);
                    if (stats.currentLoad < stats.maxLoad * 0.8) {
                        return modelId;
                    }
                }
            }
        }
        
        // Fallback to intelligent balancing
        return await this.intelligentBalance(availableModels, requestOptions);
    }

    /**
     * Weighted round-robin balancing
     */
    async weightedBalance(availableModels, requestOptions) {
        const weights = availableModels.map(modelId => {
            const stats = this.modelStats.get(modelId);
            return stats ? stats.weight : 1;
        });
        
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < availableModels.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return availableModels[i];
            }
        }
        
        return availableModels[0];
    }

    /**
     * Least connections balancing
     */
    async leastConnectionsBalance(availableModels, requestOptions) {
        let leastConnections = Infinity;
        let selectedModel = null;
        
        for (const modelId of availableModels) {
            const connections = this.activeRequests.get(modelId)?.size || 0;
            if (connections < leastConnections) {
                leastConnections = connections;
                selectedModel = modelId;
            }
        }
        
        return selectedModel || availableModels[0];
    }

    /**
     * Response time based balancing
     */
    async responseTimeBalance(availableModels, requestOptions) {
        let fastestModel = null;
        let fastestTime = Infinity;
        
        for (const modelId of availableModels) {
            const stats = this.modelStats.get(modelId);
            if (stats && stats.averageResponseTime < fastestTime) {
                fastestTime = stats.averageResponseTime;
                fastestModel = modelId;
            }
        }
        
        return fastestModel || availableModels[0];
    }

    /**
     * Round-robin balancing
     */
    async roundRobinBalance(availableModels, requestOptions) {
        const model = availableModels[this.roundRobinCounter % availableModels.length];
        this.roundRobinCounter++;
        return model;
    }

    /**
     * Get available models based on criteria
     */
    getAvailableModels(excludeModels = [], requiredCapabilities = []) {
        const allModels = Array.from(this.modelStats.keys());
        
        return allModels.filter(modelId => {
            // Exclude blacklisted models
            if (excludeModels.includes(modelId)) {
                return false;
            }
            
            // Check health status
            const health = this.modelHealth.get(modelId);
            if (!health || health.status !== 'healthy') {
                return false;
            }
            
            // Check current load
            const stats = this.modelStats.get(modelId);
            if (stats && stats.currentLoad >= stats.maxLoad) {
                return false;
            }
            
            // Check required capabilities
            if (requiredCapabilities.length > 0) {
                const modelCapabilities = stats?.capabilities || [];
                if (!requiredCapabilities.every(cap => 
                    modelCapabilities.some(modelCap => 
                        modelCap.toLowerCase().includes(cap.toLowerCase())
                    )
                )) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Get healthy models
     */
    getHealthyModels() {
        return Array.from(this.modelHealth.keys()).filter(modelId => {
            const health = this.modelHealth.get(modelId);
            return health && health.status === 'healthy';
        });
    }

    /**
     * Calculate capability score for use case
     */
    calculateCapabilityScore(modelId, useCase) {
        const stats = this.modelStats.get(modelId);
        if (!stats || !stats.capabilities) {
            return 0;
        }
        
        const useCaseMapping = {
            'crm_analysis': ['analysis', 'reasoning'],
            'real_time_chat': ['fast', 'real_time'],
            'data_analysis': ['analysis', 'reasoning', 'math'],
            'content_generation': ['creative', 'reasoning'],
            'code_generation': ['code', 'reasoning'],
            'cost_optimization': ['fast', 'open_source'],
            'multilingual': ['multilingual'],
            'privacy_sensitive': ['privacy', 'european_compliance']
        };
        
        const requiredCapabilities = useCaseMapping[useCase] || [];
        if (requiredCapabilities.length === 0) {
            return 0.5;
        }
        
        const matchCount = requiredCapabilities.filter(required => 
            stats.capabilities.some(capability => 
                capability.toLowerCase().includes(required.toLowerCase())
            )
        ).length;
        
        return matchCount / requiredCapabilities.length;
    }

    /**
     * Track model selection and update statistics
     */
    async trackModelSelection(modelId, requestOptions) {
        const stats = this.modelStats.get(modelId);
        if (stats) {
            stats.totalRequests++;
            stats.currentLoad++;
            stats.lastRequestTime = new Date();
        }
        
        const requestId = this.generateRequestId();
        this.activeRequests.get(modelId)?.add(requestId);
        
        // Emit selection event
        this.emit('modelSelected', {
            modelId,
            requestId,
            requestOptions,
            timestamp: new Date()
        });
        
        return requestId;
    }

    /**
     * Track request completion
     */
    async trackRequestCompletion(modelId, requestId, success, responseTime, error = null) {
        const stats = this.modelStats.get(modelId);
        if (stats) {
            stats.currentLoad = Math.max(0, stats.currentLoad - 1);
            
            if (success) {
                stats.successfulRequests++;
                stats.totalResponseTime += responseTime;
                stats.averageResponseTime = stats.totalResponseTime / stats.successfulRequests;
                stats.consecutiveErrors = 0;
            } else {
                stats.failedRequests++;
                stats.lastErrorTime = new Date();
                stats.consecutiveErrors++;
            }
            
            // Update error rate
            stats.errorRate = stats.failedRequests / stats.totalRequests;
            
            // Update health based on performance
            await this.updateModelHealth(modelId);
        }
        
        // Remove from active requests
        this.activeRequests.get(modelId)?.delete(requestId);
        
        // Emit completion event
        this.emit('requestCompleted', {
            modelId,
            requestId,
            success,
            responseTime,
            error,
            timestamp: new Date()
        });
    }

    /**
     * Update model health status
     */
    async updateModelHealth(modelId) {
        const stats = this.modelStats.get(modelId);
        const health = this.modelHealth.get(modelId);
        
        if (!stats || !health) return;
        
        let newStatus = 'healthy';
        
        // Check error rate
        if (stats.errorRate > this.config.errorRateThreshold) {
            newStatus = 'degraded';
        }
        
        // Check consecutive errors
        if (stats.consecutiveErrors >= 5) {
            newStatus = 'unhealthy';
        }
        
        // Check response time
        if (stats.averageResponseTime > this.config.responseTimeThreshold) {
            newStatus = stats.errorRate > 0.05 ? 'degraded' : 'healthy';
        }
        
        // Update health status
        if (health.status !== newStatus) {
            logger.info('Model health status changed', {
                modelId,
                oldStatus: health.status,
                newStatus,
                errorRate: stats.errorRate,
                consecutiveErrors: stats.consecutiveErrors,
                avgResponseTime: stats.averageResponseTime
            });
            
            health.status = newStatus;
            health.lastHealthCheck = new Date();
            
            this.emit('healthStatusChanged', {
                modelId,
                oldStatus: health.status,
                newStatus,
                timestamp: new Date()
            });
        }
        
        // Update history
        health.responseTimeHistory.push({
            time: new Date(),
            value: stats.averageResponseTime
        });
        
        health.errorHistory.push({
            time: new Date(),
            value: stats.errorRate
        });
        
        health.loadHistory.push({
            time: new Date(),
            value: stats.currentLoad
        });
        
        // Keep only recent history (last 100 entries)
        if (health.responseTimeHistory.length > 100) {
            health.responseTimeHistory = health.responseTimeHistory.slice(-100);
        }
        if (health.errorHistory.length > 100) {
            health.errorHistory = health.errorHistory.slice(-100);
        }
        if (health.loadHistory.length > 100) {
            health.loadHistory = health.loadHistory.slice(-100);
        }
    }

    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        setInterval(async () => {
            await this.performHealthChecks();
            await this.adjustModelWeights();
            await this.optimizeLoadBalancing();
        }, this.config.healthCheckInterval);
    }

    /**
     * Perform periodic health checks
     */
    async performHealthChecks() {
        for (const [modelId, health] of this.modelHealth) {
            const stats = this.modelStats.get(modelId);
            
            // Reset unhealthy models after cooldown period
            if (health.status === 'unhealthy' && 
                Date.now() - health.lastHealthCheck.getTime() > this.config.cooldownPeriod) {
                
                if (stats) {
                    stats.consecutiveErrors = 0;
                    stats.errorRate = Math.max(0, stats.errorRate * 0.5);
                }
                
                health.status = 'degraded';
                
                logger.info('Model health status reset after cooldown', {
                    modelId,
                    newStatus: health.status
                });
            }
        }
    }

    /**
     * Adjust model weights based on performance
     */
    async adjustModelWeights() {
        if (!this.config.adaptiveScaling) return;
        
        for (const [modelId, stats] of this.modelStats) {
            const health = this.modelHealth.get(modelId);
            
            if (health?.status === 'healthy' && stats.totalRequests > 10) {
                // Increase weight for high-performing models
                const performanceScore = (1 - stats.errorRate) * 
                    Math.max(0.1, 1 - (stats.averageResponseTime / 10000));
                
                const newWeight = Math.max(0.1, Math.min(2.0, performanceScore * 1.5));
                stats.weight = newWeight;
            } else if (health?.status === 'unhealthy') {
                stats.weight = 0.1;
            }
        }
    }

    /**
     * Optimize load balancing algorithm
     */
    async optimizeLoadBalancing() {
        if (!this.config.adaptiveScaling) return;
        
        // Analyze recent performance and switch algorithm if needed
        const recentPerformance = await this.analyzeRecentPerformance();
        
        if (recentPerformance.shouldSwitchAlgorithm) {
            const oldAlgorithm = this.currentAlgorithm;
            this.currentAlgorithm = recentPerformance.recommendedAlgorithm;
            
            logger.info('Load balancing algorithm optimized', {
                oldAlgorithm,
                newAlgorithm: this.currentAlgorithm,
                reason: recentPerformance.reason
            });
        }
    }

    /**
     * Analyze recent performance
     */
    async analyzeRecentPerformance() {
        const totalRequests = Array.from(this.modelStats.values())
            .reduce((sum, stats) => sum + stats.totalRequests, 0);
        
        const totalErrors = Array.from(this.modelStats.values())
            .reduce((sum, stats) => sum + stats.failedRequests, 0);
        
        const overallErrorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
        
        // Switch to more conservative algorithm if error rate is high
        if (overallErrorRate > 0.1 && this.currentAlgorithm !== 'leastConnections') {
            return {
                shouldSwitchAlgorithm: true,
                recommendedAlgorithm: 'leastConnections',
                reason: 'High error rate detected'
            };
        }
        
        // Switch to intelligent algorithm if performance is stable
        if (overallErrorRate < 0.05 && this.currentAlgorithm !== 'intelligent') {
            return {
                shouldSwitchAlgorithm: true,
                recommendedAlgorithm: 'intelligent',
                reason: 'Performance stabilized'
            };
        }
        
        return { shouldSwitchAlgorithm: false };
    }

    /**
     * Get use case statistics
     */
    async getUseCaseStatistics(useCase) {
        // This would typically query a database
        // For now, return mock data
        return {
            bestPerformers: ['claude-3.5-sonnet', 'gpt-4'],
            averageResponseTime: 1500,
            successRate: 0.95
        };
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get load balancer statistics
     */
    getStatistics() {
        const modelStatsObj = {};
        const modelHealthObj = {};
        
        for (const [modelId, stats] of this.modelStats) {
            modelStatsObj[modelId] = { ...stats };
        }
        
        for (const [modelId, health] of this.modelHealth) {
            modelHealthObj[modelId] = {
                status: health.status,
                availability: health.availability,
                lastHealthCheck: health.lastHealthCheck
            };
        }
        
        const totalRequests = Array.from(this.modelStats.values())
            .reduce((sum, stats) => sum + stats.totalRequests, 0);
        
        const totalActiveRequests = Array.from(this.activeRequests.values())
            .reduce((sum, requests) => sum + requests.size, 0);
        
        return {
            currentAlgorithm: this.currentAlgorithm,
            totalRequests,
            totalActiveRequests,
            queueLength: this.requestQueue.length,
            modelStats: modelStatsObj,
            modelHealth: modelHealthObj,
            config: this.config,
            timestamp: new Date()
        };
    }

    /**
     * Update configuration
     */
    updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        logger.info('Load balancer configuration updated', {
            newConfig: newConfig
        });
        
        this.emit('configurationUpdated', {
            config: this.config,
            timestamp: new Date()
        });
    }

    /**
     * Switch load balancing algorithm
     */
    switchAlgorithm(algorithm) {
        if (!this.algorithms[algorithm]) {
            throw new Error(`Unknown algorithm: ${algorithm}`);
        }
        
        const oldAlgorithm = this.currentAlgorithm;
        this.currentAlgorithm = algorithm;
        
        logger.info('Load balancing algorithm switched', {
            oldAlgorithm,
            newAlgorithm: algorithm
        });
        
        this.emit('algorithmSwitched', {
            oldAlgorithm,
            newAlgorithm: algorithm,
            timestamp: new Date()
        });
    }

    /**
     * Shutdown load balancer
     */
    async shutdown() {
        logger.info('Shutting down Intelligent Load Balancer');
        
        // Wait for active requests to complete
        const maxWait = 30000; // 30 seconds
        const startTime = Date.now();
        
        while (this.getTotalActiveRequests() > 0 && 
               (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.removeAllListeners();
        
        logger.info('Intelligent Load Balancer shutdown complete');
    }

    /**
     * Get total active requests
     */
    getTotalActiveRequests() {
        return Array.from(this.activeRequests.values())
            .reduce((sum, requests) => sum + requests.size, 0);
    }
}

module.exports = IntelligentLoadBalancer;