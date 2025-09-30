/**
 * AI Multi-Model Manager Enterprise - FASE 2
 * Sistema avanzado para gestionar múltiples modelos de IA
 * Permite alternar dinámicamente entre proveedores y modelos
 * Valor: $100,000 - IA Multi-Modelo Enterprise
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../logging/logger');
const Redis = require('redis');
const { EventEmitter } = require('events');

class AIMultiModelManager extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-4',
            maxRetries: config.maxRetries || 3,
            timeout: config.timeout || 120000, // 2 minutos
            cacheEnabled: config.cacheEnabled !== false,
            cacheTTL: config.cacheTTL || 3600, // 1 hora
            rateLimitEnabled: config.rateLimitEnabled !== false,
            loadBalancing: config.loadBalancing !== false
        };

        // Redis para cache y rate limiting
        this.redis = Redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || ''
        });

        // Configuración de modelos disponibles
        this.models = {
            // OpenAI GPT Models
            'gpt-4': {
                provider: 'openai',
                name: 'GPT-4 Turbo',
                description: 'Modelo más avanzado de OpenAI para análisis complejo',
                apiKey: process.env.OPENAI_API_KEY,
                endpoint: 'https://api.openai.com/v1/chat/completions',
                maxTokens: 128000,
                costPer1kTokens: 0.03,
                strengths: ['reasoning', 'analysis', 'code', 'multilingual'],
                use_cases: ['crm_analysis', 'lead_scoring', 'content_generation']
            },
            'gpt-4o': {
                provider: 'openai',
                name: 'GPT-4 Omni',
                description: 'GPT-4 optimizado para velocidad y multimodalidad',
                apiKey: process.env.OPENAI_API_KEY,
                endpoint: 'https://api.openai.com/v1/chat/completions',
                maxTokens: 128000,
                costPer1kTokens: 0.005,
                strengths: ['speed', 'multimodal', 'cost_effective'],
                use_cases: ['real_time_chat', 'quick_analysis', 'image_processing']
            },

            // Anthropic Claude Models
            'claude-3.5-sonnet': {
                provider: 'anthropic',
                name: 'Claude 3.5 Sonnet',
                description: 'Modelo equilibrado de Anthropic para tareas generales',
                apiKey: process.env.ANTHROPIC_API_KEY,
                endpoint: 'https://api.anthropic.com/v1/messages',
                maxTokens: 200000,
                costPer1kTokens: 0.003,
                strengths: ['writing', 'analysis', 'safety', 'reasoning'],
                use_cases: ['content_creation', 'document_analysis', 'customer_service']
            },
            'claude-4': {
                provider: 'anthropic',
                name: 'Claude 4',
                description: 'Próxima generación de Claude con capacidades mejoradas',
                apiKey: process.env.ANTHROPIC_API_KEY,
                endpoint: 'https://api.anthropic.com/v1/messages',
                maxTokens: 300000,
                costPer1kTokens: 0.015,
                strengths: ['advanced_reasoning', 'complex_analysis', 'code_generation'],
                use_cases: ['strategic_analysis', 'complex_crm_tasks', 'advanced_automation']
            },
            'claude-4.5': {
                provider: 'anthropic',
                name: 'Claude 4.5',
                description: 'Versión más avanzada de Claude con capacidades superiores',
                apiKey: process.env.ANTHROPIC_API_KEY,
                endpoint: 'https://api.anthropic.com/v1/messages',
                maxTokens: 500000,
                costPer1kTokens: 0.025,
                strengths: ['expert_analysis', 'strategic_planning', 'complex_reasoning'],
                use_cases: ['executive_insights', 'market_analysis', 'predictive_analytics']
            },

            // Alibaba Qwen Models
            'qwen-2.5-72b': {
                provider: 'alibaba',
                name: 'Qwen 2.5 72B',
                description: 'Modelo multimodal de Alibaba para análisis avanzado',
                apiKey: process.env.QWEN_API_KEY,
                endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
                maxTokens: 32000,
                costPer1kTokens: 0.001,
                strengths: ['multilingual', 'math', 'code', 'multimodal'],
                use_cases: ['international_crm', 'data_analysis', 'mathematical_modeling']
            },

            // DeepSeek Models
            'deepseek-v3': {
                provider: 'deepseek',
                name: 'DeepSeek V3',
                description: 'Modelo especializado en razonamiento y código',
                apiKey: process.env.DEEPSEEK_API_KEY,
                endpoint: 'https://api.deepseek.com/v1/chat/completions',
                maxTokens: 64000,
                costPer1kTokens: 0.002,
                strengths: ['reasoning', 'mathematics', 'code', 'logical_analysis'],
                use_cases: ['complex_calculations', 'data_processing', 'algorithmic_analysis']
            },

            // xAI Grok (Elon Musk)
            'grok-beta': {
                provider: 'xai',
                name: 'Grok Beta',
                description: 'Modelo de xAI con acceso a datos en tiempo real de X (Twitter)',
                apiKey: process.env.XAI_API_KEY,
                endpoint: 'https://api.x.ai/v1/chat/completions',
                maxTokens: 131072,
                costPer1kTokens: 0.005,
                strengths: ['real_time_data', 'social_media', 'current_events', 'humor'],
                use_cases: ['social_listening', 'trend_analysis', 'market_sentiment']
            },

            // Meta Llama Models
            'llama-3.3-70b': {
                provider: 'meta',
                name: 'Llama 3.3 70B',
                description: 'Modelo open-source de Meta con excelente rendimiento',
                apiKey: process.env.META_API_KEY || 'not_required',
                endpoint: 'https://api.together.xyz/v1/chat/completions', // Using Together AI
                maxTokens: 128000,
                costPer1kTokens: 0.0008,
                strengths: ['open_source', 'cost_effective', 'customizable', 'multilingual'],
                use_cases: ['high_volume_processing', 'custom_fine_tuning', 'cost_optimization']
            },

            // Google Gemini Models
            'gemini-2.0-flash': {
                provider: 'google',
                name: 'Gemini 2.0 Flash',
                description: 'Modelo multimodal más rápido de Google con capacidades avanzadas',
                apiKey: process.env.GOOGLE_AI_API_KEY,
                endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
                maxTokens: 1048576, // 1M tokens
                costPer1kTokens: 0.00025,
                strengths: ['multimodal', 'speed', 'large_context', 'cost_effective'],
                use_cases: ['document_processing', 'image_analysis', 'high_volume_tasks']
            },

            // Bonus: Mistral AI
            'mistral-large-2': {
                provider: 'mistral',
                name: 'Mistral Large 2',
                description: 'Modelo europeo con excelente rendimiento y privacidad',
                apiKey: process.env.MISTRAL_API_KEY,
                endpoint: 'https://api.mistral.ai/v1/chat/completions',
                maxTokens: 128000,
                costPer1kTokens: 0.003,
                strengths: ['privacy', 'european_compliance', 'multilingual', 'reasoning'],
                use_cases: ['gdpr_compliance', 'european_markets', 'privacy_sensitive_tasks']
            }
        };

        // Estado y métricas
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalTokensUsed: 0,
            totalCostUSD: 0,
            modelUsage: {},
            averageResponseTime: {},
            errorRates: {}
        };

        // Cola de requests para load balancing
        this.requestQueue = [];
        this.isProcessingQueue = false;

        // Inicializar métricas para cada modelo
        Object.keys(this.models).forEach(modelId => {
            this.metrics.modelUsage[modelId] = 0;
            this.metrics.averageResponseTime[modelId] = 0;
            this.metrics.errorRates[modelId] = 0;
        });

        logger.info('AI Multi-Model Manager initialized', {
            availableModels: Object.keys(this.models).length,
            defaultModel: this.config.defaultModel
        });
    }

    /**
     * Procesar request con modelo específico o auto-selección
     */
    async processRequest(options = {}) {
        const {
            prompt,
            modelId = this.config.defaultModel,
            temperature = 0.7,
            maxTokens = null,
            useCase = 'general',
            priority = 'normal',
            userId = null,
            metadata = {}
        } = options;

        const requestId = crypto.randomUUID();
        const startTime = Date.now();

        try {
            // Validaciones básicas
            if (!prompt) {
                throw new Error('Prompt is required');
            }

            // Auto-selección de modelo si es necesario
            const selectedModel = modelId === 'auto' ? 
                await this.selectBestModel(useCase, prompt) : modelId;

            if (!this.models[selectedModel]) {
                throw new Error(`Model ${selectedModel} not available`);
            }

            // Verificar rate limiting
            if (this.config.rateLimitEnabled) {
                await this.checkRateLimit(selectedModel, userId);
            }

            // Verificar cache
            let cacheKey = null;
            if (this.config.cacheEnabled) {
                cacheKey = this.generateCacheKey(prompt, selectedModel, temperature);
                const cachedResult = await this.getCachedResult(cacheKey);
                if (cachedResult) {
                    logger.info('Cache hit for AI request', { requestId, modelId: selectedModel });
                    return {
                        success: true,
                        result: cachedResult,
                        model: selectedModel,
                        cached: true,
                        requestId,
                        processingTime: Date.now() - startTime
                    };
                }
            }

            // Procesar request
            const result = await this.executeModelRequest(selectedModel, {
                prompt,
                temperature,
                maxTokens: maxTokens || this.models[selectedModel].maxTokens,
                requestId,
                metadata
            });

            // Cache result
            if (this.config.cacheEnabled && cacheKey) {
                await this.cacheResult(cacheKey, result);
            }

            // Actualizar métricas
            await this.updateMetrics(selectedModel, startTime, result, true);

            // Emitir evento de éxito
            this.emit('request_completed', {
                requestId,
                model: selectedModel,
                success: true,
                processingTime: Date.now() - startTime
            });

            return {
                success: true,
                result,
                model: selectedModel,
                cached: false,
                requestId,
                processingTime: Date.now() - startTime,
                tokensUsed: result.tokensUsed || 0,
                estimatedCost: this.calculateCost(selectedModel, result.tokensUsed || 0)
            };

        } catch (error) {
            // Actualizar métricas de error
            await this.updateMetrics(modelId, startTime, null, false);

            // Emitir evento de error
            this.emit('request_failed', {
                requestId,
                model: modelId,
                error: error.message,
                processingTime: Date.now() - startTime
            });

            logger.error('AI request failed', {
                requestId,
                modelId,
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                error: error.message,
                model: modelId,
                requestId,
                processingTime: Date.now() - startTime
            };
        }
    }

    /**
     * Seleccionar el mejor modelo para un caso de uso específico
     */
    async selectBestModel(useCase, prompt) {
        const useCaseMap = {
            'crm_analysis': ['gpt-4', 'claude-3.5-sonnet', 'claude-4'],
            'lead_scoring': ['gpt-4', 'deepseek-v3', 'claude-4'],
            'content_generation': ['claude-3.5-sonnet', 'gpt-4o', 'claude-4.5'],
            'real_time_chat': ['gpt-4o', 'gemini-2.0-flash', 'llama-3.3-70b'],
            'data_analysis': ['deepseek-v3', 'qwen-2.5-72b', 'gpt-4'],
            'social_listening': ['grok-beta', 'gpt-4o', 'claude-3.5-sonnet'],
            'document_processing': ['gemini-2.0-flash', 'claude-3.5-sonnet', 'gpt-4'],
            'cost_optimization': ['llama-3.3-70b', 'gemini-2.0-flash', 'qwen-2.5-72b'],
            'privacy_sensitive': ['mistral-large-2', 'llama-3.3-70b', 'claude-3.5-sonnet']
        };

        const recommendedModels = useCaseMap[useCase] || ['gpt-4', 'claude-3.5-sonnet'];
        
        // Seleccionar el primer modelo disponible y con mejor rendimiento
        for (const modelId of recommendedModels) {
            if (this.models[modelId] && await this.isModelAvailable(modelId)) {
                return modelId;
            }
        }

        // Fallback al modelo por defecto
        return this.config.defaultModel;
    }

    /**
     * Ejecutar request en modelo específico
     */
    async executeModelRequest(modelId, options) {
        const model = this.models[modelId];
        const { prompt, temperature, maxTokens, requestId } = options;

        switch (model.provider) {
            case 'openai':
                return await this.executeOpenAIRequest(model, prompt, temperature, maxTokens);
            
            case 'anthropic':
                return await this.executeAnthropicRequest(model, prompt, temperature, maxTokens);
            
            case 'alibaba':
                return await this.executeQwenRequest(model, prompt, temperature, maxTokens);
            
            case 'deepseek':
                return await this.executeDeepSeekRequest(model, prompt, temperature, maxTokens);
            
            case 'xai':
                return await this.executeGrokRequest(model, prompt, temperature, maxTokens);
            
            case 'meta':
                return await this.executeLlamaRequest(model, prompt, temperature, maxTokens);
            
            case 'google':
                return await this.executeGeminiRequest(model, prompt, temperature, maxTokens);
            
            case 'mistral':
                return await this.executeMistralRequest(model, prompt, temperature, maxTokens);
            
            default:
                throw new Error(`Provider ${model.provider} not implemented`);
        }
    }

    /**
     * Ejecutar request en OpenAI (GPT-4, GPT-4o)
     */
    async executeOpenAIRequest(model, prompt, temperature, maxTokens) {
        const response = await axios.post(model.endpoint, {
            model: model.name.toLowerCase().replace(/\s+/g, '-'),
            messages: [
                { role: 'system', content: 'You are an advanced AI assistant for CRM and business analysis.' },
                { role: 'user', content: prompt }
            ],
            temperature,
            max_tokens: Math.min(maxTokens, model.maxTokens),
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        }, {
            headers: {
                'Authorization': `Bearer ${model.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: this.config.timeout
        });

        return {
            content: response.data.choices[0].message.content,
            tokensUsed: response.data.usage?.total_tokens || 0,
            finishReason: response.data.choices[0].finish_reason,
            model: response.data.model
        };
    }

    /**
     * Ejecutar request en Anthropic (Claude 3.5, 4, 4.5)
     */
    async executeAnthropicRequest(model, prompt, temperature, maxTokens) {
        const response = await axios.post(model.endpoint, {
            model: 'claude-3-5-sonnet-20241022', // Usar versión específica
            max_tokens: Math.min(maxTokens, model.maxTokens),
            temperature,
            messages: [
                { role: 'user', content: prompt }
            ]
        }, {
            headers: {
                'x-api-key': model.apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            timeout: this.config.timeout
        });

        return {
            content: response.data.content[0].text,
            tokensUsed: response.data.usage?.output_tokens || 0,
            finishReason: response.data.stop_reason,
            model: response.data.model
        };
    }

    /**
     * Ejecutar request en Qwen (Alibaba)
     */
    async executeQwenRequest(model, prompt, temperature, maxTokens) {
        const response = await axios.post(model.endpoint, {
            model: 'qwen2.5-72b-instruct',
            input: {
                messages: [
                    { role: 'system', content: 'You are Qwen, an AI assistant for CRM and business analysis.' },
                    { role: 'user', content: prompt }
                ]
            },
            parameters: {
                temperature,
                max_tokens: Math.min(maxTokens, model.maxTokens),
                top_p: 0.8
            }
        }, {
            headers: {
                'Authorization': `Bearer ${model.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: this.config.timeout
        });

        return {
            content: response.data.output.choices[0].message.content,
            tokensUsed: response.data.usage?.total_tokens || 0,
            finishReason: response.data.output.choices[0].finish_reason,
            model: 'qwen2.5-72b-instruct'
        };
    }

    /**
     * Ejecutar request en DeepSeek
     */
    async executeDeepSeekRequest(model, prompt, temperature, maxTokens) {
        const response = await axios.post(model.endpoint, {
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: 'You are DeepSeek, an AI assistant specialized in reasoning and analysis.' },
                { role: 'user', content: prompt }
            ],
            temperature,
            max_tokens: Math.min(maxTokens, model.maxTokens),
            top_p: 0.95
        }, {
            headers: {
                'Authorization': `Bearer ${model.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: this.config.timeout
        });

        return {
            content: response.data.choices[0].message.content,
            tokensUsed: response.data.usage?.total_tokens || 0,
            finishReason: response.data.choices[0].finish_reason,
            model: response.data.model
        };
    }

    /**
     * Ejecutar request en Grok (xAI)
     */
    async executeGrokRequest(model, prompt, temperature, maxTokens) {
        const response = await axios.post(model.endpoint, {
            model: 'grok-beta',
            messages: [
                { role: 'system', content: 'You are Grok, an AI with real-time access to information and a witty personality.' },
                { role: 'user', content: prompt }
            ],
            temperature,
            max_tokens: Math.min(maxTokens, model.maxTokens),
            top_p: 1
        }, {
            headers: {
                'Authorization': `Bearer ${model.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: this.config.timeout
        });

        return {
            content: response.data.choices[0].message.content,
            tokensUsed: response.data.usage?.total_tokens || 0,
            finishReason: response.data.choices[0].finish_reason,
            model: response.data.model
        };
    }

    /**
     * Ejecutar request en Llama (Meta via Together AI)
     */
    async executeLlamaRequest(model, prompt, temperature, maxTokens) {
        const response = await axios.post(model.endpoint, {
            model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
            messages: [
                { role: 'system', content: 'You are Llama, an helpful AI assistant for business and CRM tasks.' },
                { role: 'user', content: prompt }
            ],
            temperature,
            max_tokens: Math.min(maxTokens, model.maxTokens),
            top_p: 0.9
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: this.config.timeout
        });

        return {
            content: response.data.choices[0].message.content,
            tokensUsed: response.data.usage?.total_tokens || 0,
            finishReason: response.data.choices[0].finish_reason,
            model: response.data.model
        };
    }

    /**
     * Ejecutar request en Gemini (Google)
     */
    async executeGeminiRequest(model, prompt, temperature, maxTokens) {
        const response = await axios.post(model.endpoint, {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature,
                maxOutputTokens: Math.min(maxTokens, model.maxTokens),
                topP: 0.8,
                topK: 40
            }
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            params: {
                key: model.apiKey
            },
            timeout: this.config.timeout
        });

        return {
            content: response.data.candidates[0].content.parts[0].text,
            tokensUsed: response.data.usageMetadata?.totalTokenCount || 0,
            finishReason: response.data.candidates[0].finishReason,
            model: 'gemini-2.0-flash'
        };
    }

    /**
     * Ejecutar request en Mistral AI
     */
    async executeMistralRequest(model, prompt, temperature, maxTokens) {
        const response = await axios.post(model.endpoint, {
            model: 'mistral-large-2411',
            messages: [
                { role: 'system', content: 'You are Mistral, an AI assistant focused on privacy and European compliance.' },
                { role: 'user', content: prompt }
            ],
            temperature,
            max_tokens: Math.min(maxTokens, model.maxTokens),
            top_p: 1
        }, {
            headers: {
                'Authorization': `Bearer ${model.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: this.config.timeout
        });

        return {
            content: response.data.choices[0].message.content,
            tokensUsed: response.data.usage?.total_tokens || 0,
            finishReason: response.data.choices[0].finish_reason,
            model: response.data.model
        };
    }

    /**
     * Verificar disponibilidad de modelo
     */
    async isModelAvailable(modelId) {
        const model = this.models[modelId];
        if (!model || !model.apiKey || model.apiKey === 'not_required') {
            return modelId === 'llama-3.3-70b'; // Llama puede funcionar sin API key propia
        }
        return true;
    }

    /**
     * Verificar rate limiting
     */
    async checkRateLimit(modelId, userId) {
        const key = `rate_limit:${modelId}:${userId || 'anonymous'}`;
        const current = await this.redis.get(key);
        
        if (current && parseInt(current) > 100) { // 100 requests por hora
            throw new Error(`Rate limit exceeded for model ${modelId}`);
        }
        
        await this.redis.incr(key);
        await this.redis.expire(key, 3600); // 1 hora
    }

    /**
     * Generar clave de cache
     */
    generateCacheKey(prompt, model, temperature) {
        const hash = crypto.createHash('sha256');
        hash.update(`${prompt}:${model}:${temperature}`);
        return `ai_cache:${hash.digest('hex')}`;
    }

    /**
     * Obtener resultado del cache
     */
    async getCachedResult(cacheKey) {
        try {
            const cached = await this.redis.get(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            logger.warn('Cache retrieval failed', { error: error.message });
            return null;
        }
    }

    /**
     * Guardar resultado en cache
     */
    async cacheResult(cacheKey, result) {
        try {
            await this.redis.setex(cacheKey, this.config.cacheTTL, JSON.stringify(result));
        } catch (error) {
            logger.warn('Cache storage failed', { error: error.message });
        }
    }

    /**
     * Actualizar métricas
     */
    async updateMetrics(modelId, startTime, result, success) {
        const processingTime = Date.now() - startTime;
        
        this.metrics.totalRequests++;
        
        if (success) {
            this.metrics.successfulRequests++;
            this.metrics.modelUsage[modelId] = (this.metrics.modelUsage[modelId] || 0) + 1;
            
            // Actualizar tiempo promedio de respuesta
            const currentAvg = this.metrics.averageResponseTime[modelId] || 0;
            const count = this.metrics.modelUsage[modelId];
            this.metrics.averageResponseTime[modelId] = 
                (currentAvg * (count - 1) + processingTime) / count;
                
            // Actualizar tokens y costos
            if (result && result.tokensUsed) {
                this.metrics.totalTokensUsed += result.tokensUsed;
                this.metrics.totalCostUSD += this.calculateCost(modelId, result.tokensUsed);
            }
        } else {
            this.metrics.failedRequests++;
            
            // Actualizar tasa de error
            const totalRequests = (this.metrics.modelUsage[modelId] || 0) + 1;
            const currentErrors = this.metrics.errorRates[modelId] * (totalRequests - 1);
            this.metrics.errorRates[modelId] = (currentErrors + 1) / totalRequests;
        }
    }

    /**
     * Calcular costo estimado
     */
    calculateCost(modelId, tokens) {
        const model = this.models[modelId];
        if (!model || !model.costPer1kTokens || !tokens) return 0;
        
        return (tokens / 1000) * model.costPer1kTokens;
    }

    /**
     * Obtener métricas completas
     */
    getMetrics() {
        return {
            ...this.metrics,
            totalSuccessRate: this.metrics.totalRequests > 0 
                ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
                : '0%',
            averageCostPerRequest: this.metrics.successfulRequests > 0
                ? (this.metrics.totalCostUSD / this.metrics.successfulRequests).toFixed(4)
                : 0,
            modelsAvailable: Object.keys(this.models).length,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Obtener información de modelos disponibles
     */
    getAvailableModels() {
        return Object.entries(this.models).map(([id, model]) => ({
            id,
            name: model.name,
            provider: model.provider,
            description: model.description,
            maxTokens: model.maxTokens,
            costPer1kTokens: model.costPer1kTokens,
            strengths: model.strengths,
            use_cases: model.use_cases,
            available: this.isModelAvailable(id)
        }));
    }

    /**
     * Configurar modelo por defecto
     */
    setDefaultModel(modelId) {
        if (!this.models[modelId]) {
            throw new Error(`Model ${modelId} not available`);
        }
        
        this.config.defaultModel = modelId;
        logger.info('Default model updated', { newDefaultModel: modelId });
    }

    /**
     * Procesar múltiples requests en paralelo
     */
    async processMultipleRequests(requests = []) {
        const results = await Promise.allSettled(
            requests.map(request => this.processRequest(request))
        );

        return results.map((result, index) => ({
            index,
            success: result.status === 'fulfilled',
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason.message : null
        }));
    }

    /**
     * Método de consenso: ejecutar el mismo prompt en múltiples modelos y comparar resultados
     */
    async processConsensusRequest(prompt, modelIds = [], options = {}) {
        if (modelIds.length < 2) {
            throw new Error('Consensus requires at least 2 models');
        }

        const requests = modelIds.map(modelId => ({
            prompt,
            modelId,
            ...options
        }));

        const results = await this.processMultipleRequests(requests);
        
        return {
            consensus: results,
            summary: this.analyzeConsensus(results),
            recommendedResult: this.selectBestConsensusResult(results)
        };
    }

    /**
     * Analizar consenso entre modelos
     */
    analyzeConsensus(results) {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        return {
            totalModels: results.length,
            successfulModels: successful.length,
            failedModels: failed.length,
            successRate: (successful.length / results.length * 100).toFixed(1) + '%',
            averageProcessingTime: successful.length > 0 
                ? Math.round(successful.reduce((sum, r) => sum + r.data.processingTime, 0) / successful.length)
                : 0,
            totalCost: successful.reduce((sum, r) => sum + (r.data.estimatedCost || 0), 0)
        };
    }

    /**
     * Seleccionar mejor resultado del consenso
     */
    selectBestConsensusResult(results) {
        const successful = results.filter(r => r.success);
        if (successful.length === 0) return null;

        // Seleccionar basado en velocidad y costo
        return successful.reduce((best, current) => {
            const bestScore = (best.data.processingTime || 0) + (best.data.estimatedCost || 0) * 1000;
            const currentScore = (current.data.processingTime || 0) + (current.data.estimatedCost || 0) * 1000;
            
            return currentScore < bestScore ? current : best;
        });
    }
}

module.exports = AIMultiModelManager;