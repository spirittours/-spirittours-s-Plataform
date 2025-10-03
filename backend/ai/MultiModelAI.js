/**
 * Multi-Model AI System Enterprise
 * Integración GPT-4 + Claude 3.5 + Gemini Pro para máxima inteligencia
 * Sistema de routing inteligente y respaldo automático
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../services/logging/logger');
const Redis = require('redis');
const crypto = require('crypto');

class MultiModelAI {
    constructor(config = {}) {
        this.config = {
            // Configuración de modelos
            models: {
                gpt4: {
                    name: 'GPT-4 Turbo',
                    provider: 'openai',
                    model: 'gpt-4-turbo-preview',
                    maxTokens: 4096,
                    temperature: 0.7,
                    priority: 1,
                    costPerToken: 0.00003, // $0.03 por 1K tokens
                    capabilities: ['text', 'code', 'analysis', 'creative'],
                    specialties: ['programming', 'technical_analysis', 'problem_solving']
                },
                claude35: {
                    name: 'Claude 3.5 Sonnet',
                    provider: 'anthropic',
                    model: 'claude-3-5-sonnet-20241022',
                    maxTokens: 8192,
                    temperature: 0.7,
                    priority: 2,
                    costPerToken: 0.000015, // $0.015 por 1K tokens
                    capabilities: ['text', 'analysis', 'reasoning', 'creative'],
                    specialties: ['analytical_thinking', 'detailed_explanations', 'ethical_reasoning']
                },
                gemini: {
                    name: 'Gemini Pro',
                    provider: 'google',
                    model: 'gemini-pro',
                    maxTokens: 2048,
                    temperature: 0.7,
                    priority: 3,
                    costPerToken: 0.000001, // $0.001 por 1K tokens
                    capabilities: ['text', 'multimodal', 'fast'],
                    specialties: ['quick_responses', 'general_knowledge', 'multilingual']
                }
            },
            
            // Configuración del sistema
            defaultModel: config.defaultModel || 'claude35',
            fallbackOrder: config.fallbackOrder || ['claude35', 'gpt4', 'gemini'],
            enableAutoRouting: config.enableAutoRouting !== false,
            enableCaching: config.enableCaching !== false,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 2000,
            
            // Rate limiting
            rateLimits: {
                gpt4: { requests: 100, window: 60000 }, // 100 req/min
                claude35: { requests: 50, window: 60000 }, // 50 req/min  
                gemini: { requests: 300, window: 60000 } // 300 req/min
            }
        };

        // Inicializar clientes AI
        this.initializeClients();
        
        // Redis para cache
        this.redis = Redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379
        });

        // Métricas y estadísticas
        this.metrics = {
            totalRequests: 0,
            requestsByModel: {},
            totalCost: 0,
            costByModel: {},
            averageResponseTime: {},
            errorsByModel: {},
            cacheHitRate: 0,
            totalCacheHits: 0,
            totalCacheMisses: 0
        };

        // Rate limiting tracking
        this.rateLimitTracker = {};

        logger.info('Multi-Model AI System initialized', {
            models: Object.keys(this.config.models),
            defaultModel: this.config.defaultModel,
            autoRouting: this.config.enableAutoRouting
        });
    }

    /**
     * Inicializar clientes de AI
     */
    initializeClients() {
        try {
            // OpenAI GPT-4
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });

            // Anthropic Claude
            this.anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY
            });

            // Google Gemini
            this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

            logger.info('AI clients initialized successfully');
        } catch (error) {
            logger.error('Error initializing AI clients', error);
            throw new Error('Failed to initialize AI clients');
        }
    }

    /**
     * Generar respuesta usando el sistema multi-modelo
     */
    async generateResponse(prompt, options = {}) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        
        try {
            this.metrics.totalRequests++;

            logger.info('Multi-model AI request started', {
                requestId,
                promptLength: prompt.length,
                options
            });

            // Verificar cache primero
            if (this.config.enableCaching && !options.skipCache) {
                const cachedResponse = await this.getCachedResponse(prompt, options);
                if (cachedResponse) {
                    this.metrics.totalCacheHits++;
                    this.updateCacheHitRate();
                    
                    logger.info('Cache hit for AI request', { requestId });
                    return {
                        ...cachedResponse,
                        source: 'cache',
                        requestId,
                        responseTime: Date.now() - startTime
                    };
                }
                this.metrics.totalCacheMisses++;
                this.updateCacheHitRate();
            }

            // Seleccionar modelo óptimo
            const selectedModel = await this.selectOptimalModel(prompt, options);
            
            // Generar respuesta
            const response = await this.generateWithModel(selectedModel, prompt, options, requestId);
            
            // Almacenar en cache
            if (this.config.enableCaching && response.success) {
                await this.cacheResponse(prompt, options, response);
            }

            // Actualizar métricas
            this.updateMetrics(selectedModel, response, Date.now() - startTime);

            return {
                ...response,
                model: selectedModel,
                requestId,
                responseTime: Date.now() - startTime
            };

        } catch (error) {
            logger.error('Error in multi-model AI generation', error, { requestId });
            
            // Intentar con modelo de respaldo
            return await this.handleFailover(prompt, options, requestId, startTime);
        }
    }

    /**
     * Seleccionar modelo óptimo basado en el prompt y contexto
     */
    async selectOptimalModel(prompt, options) {
        if (options.preferredModel && this.config.models[options.preferredModel]) {
            return options.preferredModel;
        }

        if (!this.config.enableAutoRouting) {
            return this.config.defaultModel;
        }

        // Análisis inteligente del prompt para routing
        const analysis = this.analyzePrompt(prompt, options);
        
        // Seleccionar modelo basado en especialidades
        for (const model of this.config.fallbackOrder) {
            const modelConfig = this.config.models[model];
            
            // Verificar disponibilidad y rate limits
            if (await this.isModelAvailable(model)) {
                // Verificar si el modelo es adecuado para la tarea
                const suitabilityScore = this.calculateModelSuitability(modelConfig, analysis);
                if (suitabilityScore > 0.7) {
                    logger.info('Model selected by auto-routing', {
                        model,
                        suitabilityScore,
                        analysis: analysis.type
                    });
                    return model;
                }
            }
        }

        // Fallback al modelo por defecto
        return this.config.defaultModel;
    }

    /**
     * Analizar prompt para determinar tipo de tarea
     */
    analyzePrompt(prompt, options) {
        const promptLower = prompt.toLowerCase();
        
        // Detectar tipo de tarea
        let type = 'general';
        let complexity = 'medium';
        let domain = 'general';
        
        // Análisis de código
        if (promptLower.includes('code') || promptLower.includes('program') || 
            promptLower.includes('function') || promptLower.includes('algorithm')) {
            type = 'programming';
            domain = 'technical';
        }
        
        // Análisis técnico
        else if (promptLower.includes('analyze') || promptLower.includes('explain') ||
                 promptLower.includes('technical') || promptLower.includes('system')) {
            type = 'analysis';
            complexity = 'high';
        }
        
        // Creatividad
        else if (promptLower.includes('creative') || promptLower.includes('story') ||
                 promptLower.includes('write') || promptLower.includes('generate')) {
            type = 'creative';
            domain = 'creative';
        }
        
        // Razonamiento complejo
        else if (promptLower.includes('reason') || promptLower.includes('logic') ||
                 promptLower.includes('solve') || promptLower.includes('problem')) {
            type = 'reasoning';
            complexity = 'high';
        }

        // Determinar complejidad por longitud
        if (prompt.length > 2000) complexity = 'high';
        else if (prompt.length < 200) complexity = 'low';

        return { type, complexity, domain, length: prompt.length };
    }

    /**
     * Calcular idoneidad del modelo para la tarea
     */
    calculateModelSuitability(modelConfig, analysis) {
        let score = 0.5; // Score base
        
        // Bonificación por especialidades
        if (modelConfig.specialties.includes(analysis.type)) {
            score += 0.3;
        }
        
        // Bonificación por capacidades
        if (modelConfig.capabilities.includes(analysis.type)) {
            score += 0.2;
        }
        
        // Ajuste por complejidad
        if (analysis.complexity === 'high' && modelConfig.maxTokens > 4000) {
            score += 0.2;
        } else if (analysis.complexity === 'low' && modelConfig.provider === 'google') {
            score += 0.1; // Gemini para tareas simples
        }
        
        // Penalización por costo en tareas simples
        if (analysis.complexity === 'low' && modelConfig.costPerToken > 0.00002) {
            score -= 0.1;
        }
        
        return Math.min(1.0, Math.max(0.0, score));
    }

    /**
     * Verificar disponibilidad del modelo
     */
    async isModelAvailable(modelName) {
        try {
            // Verificar rate limits
            if (!this.checkRateLimit(modelName)) {
                logger.warn('Model rate limit exceeded', { model: modelName });
                return false;
            }
            
            // Verificar errores recientes
            const recentErrors = this.metrics.errorsByModel[modelName] || 0;
            if (recentErrors > 5) {
                logger.warn('Model has too many recent errors', { model: modelName, errors: recentErrors });
                return false;
            }
            
            return true;
        } catch (error) {
            logger.error('Error checking model availability', error, { model: modelName });
            return false;
        }
    }

    /**
     * Verificar rate limits
     */
    checkRateLimit(modelName) {
        const now = Date.now();
        const rateLimit = this.config.rateLimits[modelName];
        
        if (!rateLimit) return true;
        
        if (!this.rateLimitTracker[modelName]) {
            this.rateLimitTracker[modelName] = [];
        }
        
        // Limpiar requests antiguos
        this.rateLimitTracker[modelName] = this.rateLimitTracker[modelName]
            .filter(timestamp => now - timestamp < rateLimit.window);
        
        return this.rateLimitTracker[modelName].length < rateLimit.requests;
    }

    /**
     * Generar respuesta con modelo específico
     */
    async generateWithModel(modelName, prompt, options, requestId) {
        const modelConfig = this.config.models[modelName];
        const startTime = Date.now();
        
        try {
            // Actualizar rate limit tracker
            if (!this.rateLimitTracker[modelName]) {
                this.rateLimitTracker[modelName] = [];
            }
            this.rateLimitTracker[modelName].push(Date.now());

            logger.info('Generating with specific model', {
                model: modelName,
                provider: modelConfig.provider,
                requestId
            });

            let response;
            
            switch (modelConfig.provider) {
                case 'openai':
                    response = await this.generateWithOpenAI(modelConfig, prompt, options);
                    break;
                case 'anthropic':
                    response = await this.generateWithAnthropic(modelConfig, prompt, options);
                    break;
                case 'google':
                    response = await this.generateWithGemini(modelConfig, prompt, options);
                    break;
                default:
                    throw new Error(`Unknown provider: ${modelConfig.provider}`);
            }

            const responseTime = Date.now() - startTime;
            
            return {
                success: true,
                content: response.content,
                model: modelName,
                provider: modelConfig.provider,
                tokensUsed: response.tokensUsed || 0,
                cost: this.calculateCost(modelConfig, response.tokensUsed || 0),
                responseTime,
                metadata: response.metadata || {}
            };

        } catch (error) {
            logger.error('Error generating with model', error, {
                model: modelName,
                provider: modelConfig.provider,
                requestId
            });
            
            // Incrementar contador de errores
            if (!this.metrics.errorsByModel[modelName]) {
                this.metrics.errorsByModel[modelName] = 0;
            }
            this.metrics.errorsByModel[modelName]++;
            
            throw error;
        }
    }

    /**
     * Generar con OpenAI GPT-4
     */
    async generateWithOpenAI(modelConfig, prompt, options) {
        try {
            const messages = [
                {
                    role: 'system',
                    content: options.systemPrompt || 'You are a helpful AI assistant specialized in providing accurate and detailed responses.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ];

            const response = await this.openai.chat.completions.create({
                model: modelConfig.model,
                messages,
                max_tokens: options.maxTokens || modelConfig.maxTokens,
                temperature: options.temperature || modelConfig.temperature,
                top_p: options.topP || 0.9,
                frequency_penalty: options.frequencyPenalty || 0,
                presence_penalty: options.presencePenalty || 0
            });

            return {
                content: response.choices[0].message.content,
                tokensUsed: response.usage.total_tokens,
                metadata: {
                    finishReason: response.choices[0].finish_reason,
                    promptTokens: response.usage.prompt_tokens,
                    completionTokens: response.usage.completion_tokens
                }
            };
        } catch (error) {
            logger.error('OpenAI generation error', error);
            throw error;
        }
    }

    /**
     * Generar con Anthropic Claude
     */
    async generateWithAnthropic(modelConfig, prompt, options) {
        try {
            const systemPrompt = options.systemPrompt || 'You are Claude, an AI assistant created by Anthropic to be helpful, harmless, and honest.';
            
            const response = await this.anthropic.messages.create({
                model: modelConfig.model,
                max_tokens: options.maxTokens || modelConfig.maxTokens,
                temperature: options.temperature || modelConfig.temperature,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            return {
                content: response.content[0].text,
                tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
                metadata: {
                    stopReason: response.stop_reason,
                    inputTokens: response.usage.input_tokens,
                    outputTokens: response.usage.output_tokens
                }
            };
        } catch (error) {
            logger.error('Anthropic generation error', error);
            throw error;
        }
    }

    /**
     * Generar con Google Gemini
     */
    async generateWithGemini(modelConfig, prompt, options) {
        try {
            const model = this.gemini.getGenerativeModel({ 
                model: modelConfig.model,
                generationConfig: {
                    temperature: options.temperature || modelConfig.temperature,
                    maxOutputTokens: options.maxTokens || modelConfig.maxTokens,
                    topP: options.topP || 0.8,
                    topK: options.topK || 40
                }
            });

            const fullPrompt = options.systemPrompt 
                ? `${options.systemPrompt}\n\nUser: ${prompt}`
                : prompt;

            const result = await model.generateContent(fullPrompt);
            const response = await result.response;

            return {
                content: response.text(),
                tokensUsed: 0, // Gemini no proporciona conteo de tokens fácilmente
                metadata: {
                    candidates: response.candidates?.length || 1,
                    safetyRatings: response.candidates?.[0]?.safetyRatings || []
                }
            };
        } catch (error) {
            logger.error('Gemini generation error', error);
            throw error;
        }
    }

    /**
     * Manejar failover cuando falla el modelo principal
     */
    async handleFailover(prompt, options, requestId, startTime) {
        logger.info('Attempting failover', { requestId });
        
        for (const fallbackModel of this.config.fallbackOrder) {
            try {
                if (await this.isModelAvailable(fallbackModel)) {
                    logger.info('Trying failover model', { 
                        model: fallbackModel, 
                        requestId 
                    });
                    
                    const response = await this.generateWithModel(fallbackModel, prompt, options, requestId);
                    
                    return {
                        ...response,
                        isFailover: true,
                        originalModel: options.preferredModel || this.config.defaultModel,
                        requestId,
                        responseTime: Date.now() - startTime
                    };
                }
            } catch (error) {
                logger.warn('Failover model also failed', { 
                    model: fallbackModel, 
                    error: error.message,
                    requestId 
                });
                continue;
            }
        }
        
        // Si todos los modelos fallan
        throw new Error('All AI models are currently unavailable');
    }

    /**
     * Calcular costo de la respuesta
     */
    calculateCost(modelConfig, tokensUsed) {
        return modelConfig.costPerToken * tokensUsed;
    }

    /**
     * Actualizar métricas
     */
    updateMetrics(modelName, response, responseTime) {
        // Actualizar contadores por modelo
        if (!this.metrics.requestsByModel[modelName]) {
            this.metrics.requestsByModel[modelName] = 0;
        }
        this.metrics.requestsByModel[modelName]++;
        
        // Actualizar costo
        if (response.cost) {
            if (!this.metrics.costByModel[modelName]) {
                this.metrics.costByModel[modelName] = 0;
            }
            this.metrics.costByModel[modelName] += response.cost;
            this.metrics.totalCost += response.cost;
        }
        
        // Actualizar tiempo de respuesta promedio
        if (!this.metrics.averageResponseTime[modelName]) {
            this.metrics.averageResponseTime[modelName] = [];
        }
        this.metrics.averageResponseTime[modelName].push(responseTime);
        
        // Mantener solo los últimos 100 tiempos
        if (this.metrics.averageResponseTime[modelName].length > 100) {
            this.metrics.averageResponseTime[modelName] = 
                this.metrics.averageResponseTime[modelName].slice(-100);
        }
    }

    /**
     * Actualizar tasa de cache hit
     */
    updateCacheHitRate() {
        const total = this.metrics.totalCacheHits + this.metrics.totalCacheMisses;
        this.metrics.cacheHitRate = total > 0 
            ? (this.metrics.totalCacheHits / total * 100).toFixed(2) + '%' 
            : '0%';
    }

    /**
     * Obtener respuesta del cache
     */
    async getCachedResponse(prompt, options) {
        try {
            const cacheKey = this.generateCacheKey(prompt, options);
            const cached = await this.redis.get(cacheKey);
            
            if (cached) {
                return JSON.parse(cached);
            }
            
            return null;
        } catch (error) {
            logger.error('Error getting cached response', error);
            return null;
        }
    }

    /**
     * Almacenar respuesta en cache
     */
    async cacheResponse(prompt, options, response) {
        try {
            const cacheKey = this.generateCacheKey(prompt, options);
            const ttl = options.cacheTTL || 3600; // 1 hora por defecto
            
            await this.redis.setex(cacheKey, ttl, JSON.stringify({
                content: response.content,
                model: response.model,
                cachedAt: new Date(),
                tokensUsed: response.tokensUsed
            }));
            
        } catch (error) {
            logger.error('Error caching response', error);
        }
    }

    /**
     * Generar clave de cache
     */
    generateCacheKey(prompt, options) {
        const keyData = {
            prompt,
            maxTokens: options.maxTokens,
            temperature: options.temperature,
            systemPrompt: options.systemPrompt
        };
        
        return `ai_cache:${crypto.createHash('sha256')
            .update(JSON.stringify(keyData))
            .digest('hex')}`;
    }

    /**
     * Generar ID único para request
     */
    generateRequestId() {
        return `ai_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obtener métricas del sistema
     */
    getMetrics() {
        // Calcular promedios de tiempo de respuesta
        const avgResponseTimes = {};
        for (const [model, times] of Object.entries(this.metrics.averageResponseTime)) {
            avgResponseTimes[model] = times.length > 0 
                ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
                : 0;
        }
        
        return {
            ...this.metrics,
            averageResponseTime: avgResponseTimes,
            modelsAvailable: Object.keys(this.config.models).length,
            uptime: process.uptime(),
            timestamp: new Date()
        };
    }

    /**
     * Obtener estado de salud del sistema
     */
    async getHealthStatus() {
        const health = {
            status: 'healthy',
            models: {},
            cache: { connected: false },
            metrics: this.getMetrics()
        };
        
        // Verificar cada modelo
        for (const modelName of Object.keys(this.config.models)) {
            health.models[modelName] = {
                available: await this.isModelAvailable(modelName),
                recentErrors: this.metrics.errorsByModel[modelName] || 0,
                totalRequests: this.metrics.requestsByModel[modelName] || 0
            };
        }
        
        // Verificar Redis
        try {
            await this.redis.ping();
            health.cache.connected = true;
        } catch (error) {
            health.cache.connected = false;
            health.status = 'degraded';
        }
        
        // Determinar estado general
        const availableModels = Object.values(health.models)
            .filter(model => model.available).length;
        
        if (availableModels === 0) {
            health.status = 'unhealthy';
        } else if (availableModels < Object.keys(this.config.models).length) {
            health.status = 'degraded';
        }
        
        return health;
    }

    /**
     * Limpiar recursos y cerrar conexiones
     */
    async disconnect() {
        try {
            await this.redis.quit();
            logger.info('Multi-Model AI system disconnected');
        } catch (error) {
            logger.error('Error disconnecting Multi-Model AI', error);
        }
    }
}

module.exports = MultiModelAI;