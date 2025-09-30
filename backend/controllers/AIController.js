/**
 * AI Controller Enterprise
 * Controlador para sistema Multi-Modelo AI con 25+ agentes especializados
 * Gestión completa de conversaciones, routing inteligente y analytics
 */

const AgentManager = require('../ai/AgentManager');
const MultiModelAI = require('../ai/MultiModelAI');
const AIMultiModelManager = require('../services/ai/AIMultiModelManager');
const logger = require('../services/logging/logger');
const Redis = require('redis');
const { validateInput } = require('../utils/validation');

class AIController {
    constructor() {
        // Inicializar sistema de agentes
        this.agentManager = new AgentManager({
            multiAI: {
                defaultModel: 'claude35',
                fallbackOrder: ['claude35', 'gpt4', 'gemini'],
                enableAutoRouting: true,
                enableCaching: true
            }
        });

        // Sistema AI independiente para operaciones directas
        this.multiAI = new MultiModelAI();

        // FASE 2: AI Multi-Model Manager Enterprise
        this.aiManager = new AIMultiModelManager({
            defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-4',
            cacheEnabled: true,
            rateLimitEnabled: true,
            loadBalancing: true,
            maxRetries: 3,
            timeout: 120000
        });

        // Redis para cache y sesiones
        this.redis = Redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379
        });

        // Cache settings para AI
        this.CACHE_TTL = {
            conversations: 3600,    // 1 hora
            agentResponses: 1800,   // 30 minutos
            modelAnalysis: 600,     // 10 minutos
            metrics: 300           // 5 minutos
        };

        logger.info('AI Controller initialized successfully');
    }

    // ===== CONVERSACIÓN CON AGENTES =====

    /**
     * Procesar conversación con agente específico
     */
    async chatWithAgent(req, res) {
        try {
            const { agentId, message, conversationId } = req.body;
            const userId = req.user?.id;

            // Validaciones
            if (!agentId || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Agent ID and message are required'
                });
            }

            if (message.length > 10000) {
                return res.status(400).json({
                    success: false,
                    message: 'Message too long. Maximum 10,000 characters.'
                });
            }

            logger.info('Chat with agent request', {
                agentId,
                messageLength: message.length,
                userId,
                conversationId
            });

            // Preparar contexto
            const context = {
                conversationId,
                userId,
                userProfile: req.user ? {
                    id: req.user.id,
                    email: req.user.email,
                    name: `${req.user.first_name} ${req.user.last_name}`,
                    role: req.user.role,
                    preferences: req.user.preferences || {}
                } : null,
                timestamp: new Date(),
                clientIP: req.ip,
                userAgent: req.get('User-Agent')
            };

            // Procesar con el agente
            const response = await this.agentManager.processWithAgent(agentId, message, context);

            // Registrar interacción para analytics
            await this.logInteraction(userId, agentId, message, response);

            res.json({
                success: true,
                data: response
            });

        } catch (error) {
            logger.error('Error in chat with agent', error, {
                agentId: req.body.agentId,
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                message: 'Failed to process chat with agent',
                error: error.message
            });
        }
    }

    /**
     * Auto-seleccionar mejor agente para una consulta
     */
    async chatWithAutoSelection(req, res) {
        try {
            const { message, conversationId, preferences } = req.body;
            const userId = req.user?.id;

            // Validaciones
            if (!message) {
                return res.status(400).json({
                    success: false,
                    message: 'Message is required'
                });
            }

            logger.info('Auto-selection chat request', {
                messageLength: message.length,
                userId,
                conversationId
            });

            // Seleccionar agente óptimo
            const context = {
                conversationId,
                userId,
                preferences,
                userProfile: req.user
            };

            const selectedAgent = await this.agentManager.selectOptimalAgent(message, context);

            // Procesar con el agente seleccionado
            const response = await this.agentManager.processWithAgent(selectedAgent, message, {
                ...context,
                autoSelected: true
            });

            // Registrar interacción
            await this.logInteraction(userId, selectedAgent, message, response, { autoSelected: true });

            res.json({
                success: true,
                data: {
                    ...response,
                    autoSelected: true,
                    selectionReason: `Selected based on message analysis and agent specialization`
                }
            });

        } catch (error) {
            logger.error('Error in auto-selection chat', error, {
                userId: req.user?.id
            });

            res.status(500).json({
                success: false,
                message: 'Failed to process auto-selection chat',
                error: error.message
            });
        }
    }

    /**
     * Conversación multi-agente para consultas complejas
     */
    async multiAgentConsultation(req, res) {
        try {
            const { message, agentIds, consultationType = 'collaborative' } = req.body;
            const userId = req.user?.id;

            if (!message || !agentIds || !Array.isArray(agentIds) || agentIds.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Message and at least 2 agent IDs are required'
                });
            }

            if (agentIds.length > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum 5 agents allowed in multi-agent consultation'
                });
            }

            logger.info('Multi-agent consultation request', {
                agentIds,
                consultationType,
                messageLength: message.length,
                userId
            });

            const responses = [];
            const conversationId = `multi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Procesar con cada agente
            for (const agentId of agentIds) {
                try {
                    const context = {
                        conversationId,
                        userId,
                        multiAgentMode: true,
                        consultationType,
                        otherAgents: agentIds.filter(id => id !== agentId)
                    };

                    const response = await this.agentManager.processWithAgent(agentId, message, context);
                    responses.push(response);

                } catch (error) {
                    logger.error(`Error processing with agent ${agentId}`, error);
                    responses.push({
                        success: false,
                        agentId,
                        error: error.message
                    });
                }
            }

            // Generar síntesis si hay múltiples respuestas exitosas
            const successfulResponses = responses.filter(r => r.success);
            let synthesis = null;

            if (successfulResponses.length > 1) {
                synthesis = await this.generateMultiAgentSynthesis(successfulResponses, message);
            }

            const result = {
                consultationType,
                totalAgents: agentIds.length,
                successfulResponses: successfulResponses.length,
                responses,
                synthesis,
                conversationId
            };

            // Registrar consulta multi-agente
            await this.logMultiAgentConsultation(userId, agentIds, message, result);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Error in multi-agent consultation', error);

            res.status(500).json({
                success: false,
                message: 'Failed to process multi-agent consultation',
                error: error.message
            });
        }
    }

    // ===== FASE 2: OPERACIONES AI MULTI-MODELO =====

    /**
     * Procesar request con modelo específico (FASE 2)
     */
    async processAIRequest(req, res) {
        try {
            const { 
                prompt, 
                modelId = 'auto', 
                temperature = 0.7,
                maxTokens = null,
                useCase = 'general',
                priority = 'normal',
                metadata = {}
            } = req.body;
            const userId = req.user?.id;

            // Validaciones
            if (!prompt) {
                return res.status(400).json({
                    success: false,
                    message: 'Prompt is required'
                });
            }

            if (prompt.length > 50000) {
                return res.status(400).json({
                    success: false,
                    message: 'Prompt too long. Maximum 50,000 characters.'
                });
            }

            logger.info('AI Multi-Model request', {
                modelId,
                useCase,
                promptLength: prompt.length,
                userId
            });

            // Procesar con AI Manager
            const result = await this.aiManager.processRequest({
                prompt,
                modelId,
                temperature,
                maxTokens,
                useCase,
                priority,
                userId,
                metadata
            });

            // Registrar para analytics
            await this.logAIRequest(userId, modelId, useCase, result);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Error in AI multi-model request', error);

            res.status(500).json({
                success: false,
                message: 'Failed to process AI request',
                error: error.message
            });
        }
    }

    /**
     * Procesar múltiples requests en paralelo (FASE 2)
     */
    async processMultipleRequests(req, res) {
        try {
            const { requests = [] } = req.body;
            const userId = req.user?.id;

            if (!Array.isArray(requests) || requests.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Requests array is required'
                });
            }

            if (requests.length > 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum 10 parallel requests allowed'
                });
            }

            logger.info('Multiple AI requests', {
                requestCount: requests.length,
                userId
            });

            // Agregar userId a cada request
            const enrichedRequests = requests.map(req => ({
                ...req,
                userId,
                metadata: {
                    ...req.metadata,
                    batchRequest: true,
                    batchId: Date.now()
                }
            }));

            const results = await this.aiManager.processMultipleRequests(enrichedRequests);

            res.json({
                success: true,
                data: {
                    results,
                    summary: {
                        total: results.length,
                        successful: results.filter(r => r.success).length,
                        failed: results.filter(r => !r.success).length
                    }
                }
            });

        } catch (error) {
            logger.error('Error in multiple AI requests', error);

            res.status(500).json({
                success: false,
                message: 'Failed to process multiple requests',
                error: error.message
            });
        }
    }

    /**
     * Procesar request con consenso entre modelos (FASE 2)
     */
    async processConsensusRequest(req, res) {
        try {
            const { 
                prompt, 
                modelIds = ['gpt-4', 'claude-3.5-sonnet', 'gemini-2.0-flash'], 
                options = {} 
            } = req.body;
            const userId = req.user?.id;

            if (!prompt) {
                return res.status(400).json({
                    success: false,
                    message: 'Prompt is required'
                });
            }

            if (modelIds.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'At least 2 models required for consensus'
                });
            }

            logger.info('AI consensus request', {
                modelIds,
                promptLength: prompt.length,
                userId
            });

            const result = await this.aiManager.processConsensusRequest(prompt, modelIds, {
                ...options,
                userId,
                metadata: {
                    consensusRequest: true,
                    timestamp: new Date()
                }
            });

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Error in consensus request', error);

            res.status(500).json({
                success: false,
                message: 'Failed to process consensus request',
                error: error.message
            });
        }
    }

    /**
     * Obtener modelos disponibles (FASE 2)
     */
    async getAvailableModels(req, res) {
        try {
            const models = this.aiManager.getAvailableModels();

            res.json({
                success: true,
                data: {
                    models,
                    totalModels: models.length,
                    availableModels: models.filter(m => m.available).length,
                    providers: [...new Set(models.map(m => m.provider))],
                    timestamp: new Date()
                }
            });

        } catch (error) {
            logger.error('Error getting available models', error);

            res.status(500).json({
                success: false,
                message: 'Failed to get available models',
                error: error.message
            });
        }
    }

    /**
     * Obtener métricas de AI Manager (FASE 2)
     */
    async getAIManagerMetrics(req, res) {
        try {
            const metrics = this.aiManager.getMetrics();

            res.json({
                success: true,
                data: metrics
            });

        } catch (error) {
            logger.error('Error getting AI manager metrics', error);

            res.status(500).json({
                success: false,
                message: 'Failed to get AI manager metrics',
                error: error.message
            });
        }
    }

    /**
     * Configurar modelo por defecto (FASE 2)
     */
    async setDefaultModel(req, res) {
        try {
            const { modelId } = req.body;

            if (!modelId) {
                return res.status(400).json({
                    success: false,
                    message: 'Model ID is required'
                });
            }

            this.aiManager.setDefaultModel(modelId);

            logger.info('Default model updated', { 
                modelId, 
                userId: req.user?.id 
            });

            res.json({
                success: true,
                message: `Default model set to ${modelId}`,
                data: {
                    defaultModel: modelId,
                    timestamp: new Date()
                }
            });

        } catch (error) {
            logger.error('Error setting default model', error);

            res.status(500).json({
                success: false,
                message: 'Failed to set default model',
                error: error.message
            });
        }
    }

    /**
     * Test de modelos individuales o consenso (FASE 2)
     */
    async testModels(req, res) {
        try {
            const { 
                prompt, 
                modelIds = [], 
                consensusMode = false,
                options = {} 
            } = req.body;
            const userId = req.user?.id;

            if (!prompt) {
                return res.status(400).json({
                    success: false,
                    message: 'Prompt is required for testing'
                });
            }

            logger.info('AI models test request', {
                modelIds,
                consensusMode,
                promptLength: prompt.length,
                userId
            });

            let result;

            if (consensusMode && modelIds.length > 1) {
                // Test de consenso
                result = await this.aiManager.processConsensusRequest(prompt, modelIds, {
                    ...options,
                    testMode: true,
                    userId
                });
            } else {
                // Test individual
                const modelId = modelIds[0] || this.aiManager.config.defaultModel;
                result = await this.aiManager.processRequest({
                    prompt,
                    modelId,
                    ...options,
                    testMode: true,
                    userId
                });
            }

            res.json({
                success: true,
                data: {
                    testType: consensusMode ? 'consensus' : 'individual',
                    ...result
                }
            });

        } catch (error) {
            logger.error('Error in model testing', error);

            res.status(500).json({
                success: false,
                message: 'Failed to test models',
                error: error.message
            });
        }
    }

    /**
     * Obtener configuración de AI Manager (FASE 2)
     */
    async getAIConfig(req, res) {
        try {
            const config = {
                defaultModel: this.aiManager.config.defaultModel,
                cacheEnabled: this.aiManager.config.cacheEnabled,
                rateLimitEnabled: this.aiManager.config.rateLimitEnabled,
                loadBalancing: this.aiManager.config.loadBalancing,
                maxRetries: this.aiManager.config.maxRetries,
                timeout: this.aiManager.config.timeout,
                availableModels: Object.keys(this.aiManager.models)
            };

            res.json({
                success: true,
                data: config
            });

        } catch (error) {
            logger.error('Error getting AI config', error);

            res.status(500).json({
                success: false,
                message: 'Failed to get AI configuration',
                error: error.message
            });
        }
    }

    /**
     * Actualizar configuración de AI Manager (FASE 2)
     */
    async updateAIConfig(req, res) {
        try {
            const { 
                defaultModel,
                cacheEnabled,
                rateLimitEnabled,
                loadBalancing,
                maxRetries,
                timeout 
            } = req.body;

            // Actualizar configuración
            if (defaultModel !== undefined) {
                this.aiManager.setDefaultModel(defaultModel);
            }

            if (cacheEnabled !== undefined) {
                this.aiManager.config.cacheEnabled = cacheEnabled;
            }

            if (rateLimitEnabled !== undefined) {
                this.aiManager.config.rateLimitEnabled = rateLimitEnabled;
            }

            if (loadBalancing !== undefined) {
                this.aiManager.config.loadBalancing = loadBalancing;
            }

            if (maxRetries !== undefined) {
                this.aiManager.config.maxRetries = maxRetries;
            }

            if (timeout !== undefined) {
                this.aiManager.config.timeout = timeout;
            }

            logger.info('AI configuration updated', {
                userId: req.user?.id,
                updates: req.body
            });

            res.json({
                success: true,
                message: 'AI configuration updated successfully',
                data: {
                    config: this.aiManager.config,
                    timestamp: new Date()
                }
            });

        } catch (error) {
            logger.error('Error updating AI config', error);

            res.status(500).json({
                success: false,
                message: 'Failed to update AI configuration',
                error: error.message
            });
        }
    }

    // ===== OPERACIONES DIRECTAS DE AI ORIGINALES =====

    /**
     * Generar respuesta directa con modelo específico
     */
    async generateDirectResponse(req, res) {
        try {
            const { prompt, model, options = {} } = req.body;
            const userId = req.user?.id;

            if (!prompt) {
                return res.status(400).json({
                    success: false,
                    message: 'Prompt is required'
                });
            }

            logger.info('Direct AI generation request', {
                model,
                promptLength: prompt.length,
                userId
            });

            // Configurar opciones
            const aiOptions = {
                preferredModel: model,
                temperature: options.temperature,
                maxTokens: options.maxTokens,
                systemPrompt: options.systemPrompt,
                skipCache: options.skipCache || false
            };

            const response = await this.multiAI.generateResponse(prompt, aiOptions);

            // Registrar uso directo
            await this.logDirectAIUsage(userId, model, prompt, response);

            res.json({
                success: true,
                data: response
            });

        } catch (error) {
            logger.error('Error in direct AI generation', error);

            res.status(500).json({
                success: false,
                message: 'Failed to generate AI response',
                error: error.message
            });
        }
    }

    /**
     * Comparar respuestas de múltiples modelos
     */
    async compareModels(req, res) {
        try {
            const { prompt, models = ['claude35', 'gpt4', 'gemini'], options = {} } = req.body;
            const userId = req.user?.id;

            if (!prompt) {
                return res.status(400).json({
                    success: false,
                    message: 'Prompt is required'
                });
            }

            if (models.length > 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum 5 models allowed for comparison'
                });
            }

            logger.info('Model comparison request', {
                models,
                promptLength: prompt.length,
                userId
            });

            const comparisons = [];
            const startTime = Date.now();

            // Generar respuestas con cada modelo
            for (const model of models) {
                try {
                    const modelStartTime = Date.now();
                    
                    const aiOptions = {
                        preferredModel: model,
                        temperature: options.temperature || 0.7,
                        maxTokens: options.maxTokens || 2000,
                        systemPrompt: options.systemPrompt,
                        skipCache: true // No usar cache para comparaciones
                    };

                    const response = await this.multiAI.generateResponse(prompt, aiOptions);
                    
                    comparisons.push({
                        model,
                        response: response.content,
                        metadata: {
                            tokensUsed: response.tokensUsed,
                            responseTime: Date.now() - modelStartTime,
                            cost: response.cost,
                            actualModel: response.model
                        }
                    });

                } catch (error) {
                    logger.error(`Error with model ${model}`, error);
                    comparisons.push({
                        model,
                        error: error.message,
                        success: false
                    });
                }
            }

            const result = {
                prompt,
                comparisons,
                totalTime: Date.now() - startTime,
                successfulModels: comparisons.filter(c => !c.error).length,
                timestamp: new Date()
            };

            // Registrar comparación
            await this.logModelComparison(userId, prompt, result);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Error in model comparison', error);

            res.status(500).json({
                success: false,
                message: 'Failed to compare models',
                error: error.message
            });
        }
    }

    // ===== GESTIÓN DE CONVERSACIONES =====

    /**
     * Obtener historial de conversación
     */
    async getConversationHistory(req, res) {
        try {
            const { conversationId } = req.params;
            const { limit = 50, offset = 0 } = req.query;
            const userId = req.user?.id;

            if (!conversationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Conversation ID is required'
                });
            }

            // Verificar acceso a la conversación
            const hasAccess = await this.verifyConversationAccess(conversationId, userId);
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this conversation'
                });
            }

            const history = await this.getConversationFromCache(conversationId, limit, offset);

            res.json({
                success: true,
                data: {
                    conversationId,
                    history: history || [],
                    pagination: {
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        total: history?.length || 0
                    }
                }
            });

        } catch (error) {
            logger.error('Error getting conversation history', error);

            res.status(500).json({
                success: false,
                message: 'Failed to get conversation history',
                error: error.message
            });
        }
    }

    /**
     * Eliminar conversación
     */
    async deleteConversation(req, res) {
        try {
            const { conversationId } = req.params;
            const userId = req.user?.id;

            // Verificar acceso
            const hasAccess = await this.verifyConversationAccess(conversationId, userId);
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this conversation'
                });
            }

            await this.deleteConversationFromCache(conversationId);

            logger.info('Conversation deleted', { conversationId, userId });

            res.json({
                success: true,
                message: 'Conversation deleted successfully'
            });

        } catch (error) {
            logger.error('Error deleting conversation', error);

            res.status(500).json({
                success: false,
                message: 'Failed to delete conversation',
                error: error.message
            });
        }
    }

    // ===== INFORMACIÓN DE AGENTES =====

    /**
     * Listar todos los agentes disponibles
     */
    async listAgents(req, res) {
        try {
            const agents = this.agentManager.agents;
            const agentList = Object.keys(agents).map(id => ({
                id,
                name: agents[id].name,
                description: agents[id].description,
                specialties: agents[id].specialties,
                capabilities: agents[id].capabilities,
                preferredModel: agents[id].preferredModel
            }));

            res.json({
                success: true,
                data: {
                    agents: agentList,
                    totalAgents: agentList.length,
                    specializedDomains: this.agentManager.getSpecializedDomains()
                }
            });

        } catch (error) {
            logger.error('Error listing agents', error);

            res.status(500).json({
                success: false,
                message: 'Failed to list agents',
                error: error.message
            });
        }
    }

    /**
     * Obtener información detallada de un agente
     */
    async getAgentInfo(req, res) {
        try {
            const { agentId } = req.params;
            const agent = this.agentManager.agents[agentId];

            if (!agent) {
                return res.status(404).json({
                    success: false,
                    message: 'Agent not found'
                });
            }

            // Obtener métricas del agente
            const metrics = this.agentManager.getAgentMetrics();
            const agentMetrics = {
                totalInteractions: metrics.interactionsByAgent[agentId] || 0,
                averageResponseTime: metrics.responseTimeByAgent[agentId] || 0,
                resolutionRate: metrics.resolutionRate[agentId] || 0
            };

            const agentInfo = {
                ...agent,
                id: agentId,
                metrics: agentMetrics,
                status: 'active'
            };

            res.json({
                success: true,
                data: agentInfo
            });

        } catch (error) {
            logger.error('Error getting agent info', error);

            res.status(500).json({
                success: false,
                message: 'Failed to get agent information',
                error: error.message
            });
        }
    }

    // ===== MÉTRICAS Y ANALYTICS =====

    /**
     * Obtener métricas del sistema AI
     */
    async getAIMetrics(req, res) {
        try {
            const { timeframe = '24h' } = req.query;

            const [agentMetrics, multiAIMetrics] = await Promise.all([
                this.agentManager.getAgentMetrics(),
                this.multiAI.getMetrics()
            ]);

            const combinedMetrics = {
                agents: agentMetrics,
                multiAI: multiAIMetrics,
                timeframe,
                generatedAt: new Date(),
                summary: {
                    totalInteractions: agentMetrics.totalInteractions,
                    totalAIRequests: multiAIMetrics.totalRequests,
                    averageSatisfaction: agentMetrics.averageSatisfaction,
                    totalCost: multiAIMetrics.totalCost,
                    cacheHitRate: multiAIMetrics.cacheHitRate
                }
            };

            res.json({
                success: true,
                data: combinedMetrics
            });

        } catch (error) {
            logger.error('Error getting AI metrics', error);

            res.status(500).json({
                success: false,
                message: 'Failed to get AI metrics',
                error: error.message
            });
        }
    }

    /**
     * Estado de salud del sistema AI
     */
    async getAIHealthStatus(req, res) {
        try {
            const [agentsHealth, multiAIHealth] = await Promise.all([
                this.agentManager.getAgentsHealthStatus(),
                this.multiAI.getHealthStatus()
            ]);

            const overallStatus = this.determineOverallHealth(agentsHealth, multiAIHealth);

            const healthStatus = {
                status: overallStatus,
                agents: agentsHealth,
                multiAI: multiAIHealth,
                redis: {
                    connected: false
                },
                timestamp: new Date()
            };

            // Verificar Redis
            try {
                await this.redis.ping();
                healthStatus.redis.connected = true;
            } catch (error) {
                healthStatus.redis.connected = false;
                healthStatus.redis.error = error.message;
                if (overallStatus === 'healthy') {
                    healthStatus.status = 'degraded';
                }
            }

            const statusCode = overallStatus === 'healthy' ? 200 : 
                              overallStatus === 'degraded' ? 206 : 503;

            res.status(statusCode).json({
                success: overallStatus !== 'unhealthy',
                data: healthStatus
            });

        } catch (error) {
            logger.error('Error getting AI health status', error);

            res.status(500).json({
                success: false,
                message: 'Failed to get AI health status',
                error: error.message
            });
        }
    }

    // ===== MÉTODOS PRIVADOS =====

    /**
     * Generar síntesis de múltiples respuestas de agentes
     */
    async generateMultiAgentSynthesis(responses, originalMessage) {
        try {
            const synthesisPrompt = `Analiza las siguientes respuestas de diferentes agentes especializados sobre la consulta: "${originalMessage}"

Respuestas de los agentes:
${responses.map((r, i) => `
Agente ${i + 1} (${r.agentName}):
${r.response}
`).join('\n')}

Por favor, proporciona una síntesis integral que:
1. Combine las mejores ideas de cada agente
2. Resuelva cualquier contradicción entre respuestas
3. Proporcione una recomendación coherente y completa
4. Destaque los puntos clave de consenso
5. Identifique aspectos únicos de cada perspectiva

Síntesis:`;

            const synthesis = await this.multiAI.generateResponse(synthesisPrompt, {
                preferredModel: 'claude35', // Mejor para síntesis y análisis
                temperature: 0.6,
                maxTokens: 3000
            });

            return synthesis.content;

        } catch (error) {
            logger.error('Error generating multi-agent synthesis', error);
            return null;
        }
    }

    /**
     * Determinar estado general de salud
     */
    determineOverallHealth(agentsHealth, multiAIHealth) {
        if (agentsHealth.status === 'unhealthy' || multiAIHealth.status === 'unhealthy') {
            return 'unhealthy';
        }
        
        if (agentsHealth.status === 'degraded' || multiAIHealth.status === 'degraded') {
            return 'degraded';
        }
        
        return 'healthy';
    }

    /**
     * Registrar interacción para analytics
     */
    async logInteraction(userId, agentId, message, response, metadata = {}) {
        try {
            const interaction = {
                userId,
                agentId,
                agentName: response.agentName,
                messageLength: message.length,
                responseLength: response.response?.length || 0,
                model: response.metadata?.model,
                tokensUsed: response.metadata?.tokensUsed,
                responseTime: response.metadata?.responseTime,
                timestamp: new Date(),
                conversationId: response.conversationId,
                ...metadata
            };

            // Guardar en Redis con TTL
            const key = `interaction:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
            await this.redis.setex(key, this.CACHE_TTL.conversations, JSON.stringify(interaction));

            logger.debug('Interaction logged', { key, userId, agentId });

        } catch (error) {
            logger.error('Error logging interaction', error);
        }
    }

    /**
     * Registrar consulta multi-agente
     */
    async logMultiAgentConsultation(userId, agentIds, message, result) {
        try {
            const consultation = {
                userId,
                agentIds,
                consultationType: result.consultationType,
                messageLength: message.length,
                totalAgents: result.totalAgents,
                successfulResponses: result.successfulResponses,
                hasSynthesis: !!result.synthesis,
                timestamp: new Date()
            };

            const key = `multi_consultation:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
            await this.redis.setex(key, this.CACHE_TTL.conversations, JSON.stringify(consultation));

        } catch (error) {
            logger.error('Error logging multi-agent consultation', error);
        }
    }

    /**
     * Registrar uso directo de AI
     */
    async logDirectAIUsage(userId, model, prompt, response) {
        try {
            const usage = {
                userId,
                requestedModel: model,
                actualModel: response.model,
                promptLength: prompt.length,
                tokensUsed: response.tokensUsed,
                cost: response.cost,
                responseTime: response.responseTime,
                timestamp: new Date()
            };

            const key = `direct_ai:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
            await this.redis.setex(key, this.CACHE_TTL.conversations, JSON.stringify(usage));

        } catch (error) {
            logger.error('Error logging direct AI usage', error);
        }
    }

    /**
     * FASE 2: Registrar request de AI Manager
     */
    async logAIRequest(userId, modelId, useCase, result) {
        try {
            const aiRequest = {
                userId,
                requestedModel: modelId,
                actualModel: result.model,
                useCase,
                success: result.success,
                cached: result.cached || false,
                processingTime: result.processingTime,
                tokensUsed: result.tokensUsed || 0,
                estimatedCost: result.estimatedCost || 0,
                timestamp: new Date()
            };

            const key = `ai_request:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
            await this.redis.setex(key, this.CACHE_TTL.conversations, JSON.stringify(aiRequest));

            logger.debug('AI request logged', { key, userId, modelId, useCase });

        } catch (error) {
            logger.error('Error logging AI request', error);
        }
    }

    /**
     * Registrar comparación de modelos
     */
    async logModelComparison(userId, prompt, result) {
        try {
            const comparison = {
                userId,
                promptLength: prompt.length,
                modelsCompared: result.comparisons.map(c => c.model),
                successfulModels: result.successfulModels,
                totalTime: result.totalTime,
                timestamp: new Date()
            };

            const key = `model_comparison:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
            await this.redis.setex(key, this.CACHE_TTL.conversations, JSON.stringify(comparison));

        } catch (error) {
            logger.error('Error logging model comparison', error);
        }
    }

    /**
     * Verificar acceso a conversación
     */
    async verifyConversationAccess(conversationId, userId) {
        try {
            // Implementar lógica de verificación de acceso
            // Por ahora, permitir acceso si el usuario está autenticado
            return !!userId;
        } catch (error) {
            logger.error('Error verifying conversation access', error);
            return false;
        }
    }

    /**
     * Obtener conversación del cache
     */
    async getConversationFromCache(conversationId, limit, offset) {
        try {
            const contextKey = `context:${conversationId}`;
            const context = await this.redis.get(contextKey);
            
            if (!context) return null;
            
            const parsedContext = JSON.parse(context);
            const history = parsedContext.history || [];
            
            // Aplicar paginación
            const start = parseInt(offset);
            const end = start + parseInt(limit);
            
            return history.slice(start, end);

        } catch (error) {
            logger.error('Error getting conversation from cache', error);
            return null;
        }
    }

    /**
     * Eliminar conversación del cache
     */
    async deleteConversationFromCache(conversationId) {
        try {
            const contextKey = `context:${conversationId}`;
            await this.redis.del(contextKey);
        } catch (error) {
            logger.error('Error deleting conversation from cache', error);
        }
    }

    // ===== FASE 2: AI MULTI-MODELO ENTERPRISE METHODS =====

    /**
     * Procesar request con AI Multi-Modelo Manager
     */
    async processAIRequest(req, res) {
        try {
            const { prompt, modelId, temperature, maxTokens, useCase, priority, metadata } = req.body;
            const userId = req.user?.id;

            logger.info('AI Multi-Model request', {
                modelId,
                useCase,
                priority,
                promptLength: prompt.length,
                userId
            });

            const result = await this.aiManager.processRequest({
                prompt,
                modelId,
                temperature,
                maxTokens,
                useCase,
                priority,
                userId,
                metadata
            });

            // Registrar request
            await this.logAIRequest(userId, modelId, useCase, result);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Error in AI Multi-Model request', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process AI request',
                error: error.message
            });
        }
    }

    /**
     * Procesar múltiples requests en paralelo
     */
    async processMultipleRequests(req, res) {
        try {
            const { requests } = req.body;
            const userId = req.user?.id;

            logger.info('Multiple AI requests', {
                requestCount: requests.length,
                userId
            });

            const results = await Promise.allSettled(
                requests.map(request => 
                    this.aiManager.processRequest({
                        ...request,
                        userId
                    })
                )
            );

            const processedResults = results.map((result, index) => ({
                index,
                success: result.status === 'fulfilled',
                data: result.status === 'fulfilled' ? result.value : null,
                error: result.status === 'rejected' ? result.reason.message : null
            }));

            res.json({
                success: true,
                data: {
                    results: processedResults,
                    totalRequests: requests.length,
                    successfulRequests: processedResults.filter(r => r.success).length
                }
            });

        } catch (error) {
            logger.error('Error in multiple AI requests', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process multiple AI requests',
                error: error.message
            });
        }
    }

    /**
     * Procesar request con consenso entre múltiples modelos
     */
    async processConsensusRequest(req, res) {
        try {
            const { prompt, modelIds } = req.body;
            const userId = req.user?.id;

            logger.info('AI Consensus request', {
                modelIds,
                promptLength: prompt.length,
                userId
            });

            const result = await this.aiManager.processConsensusRequest({
                prompt,
                modelIds,
                userId
            });

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Error in AI consensus request', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process consensus request',
                error: error.message
            });
        }
    }

    /**
     * Obtener modelos disponibles (FASE 2)
     */
    async getAvailableModels(req, res) {
        try {
            const models = this.aiManager.getAvailableModels();
            
            res.json({
                success: true,
                data: {
                    models,
                    totalModels: Object.keys(models).length,
                    defaultModel: this.aiManager.config.defaultModel
                }
            });

        } catch (error) {
            logger.error('Error getting available models', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get available models',
                error: error.message
            });
        }
    }

    /**
     * Obtener métricas del AI Manager (FASE 2)
     */
    async getAIManagerMetrics(req, res) {
        try {
            const metrics = await this.aiManager.getMetrics();
            
            res.json({
                success: true,
                data: metrics
            });

        } catch (error) {
            logger.error('Error getting AI Manager metrics', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get AI Manager metrics',
                error: error.message
            });
        }
    }

    /**
     * Configurar modelo por defecto (FASE 2)
     */
    async setDefaultModel(req, res) {
        try {
            const { modelId } = req.body;
            const userId = req.user?.id;

            logger.info('Setting default model', {
                modelId,
                userId
            });

            await this.aiManager.setDefaultModel(modelId);

            res.json({
                success: true,
                message: 'Default model updated successfully',
                data: {
                    defaultModel: modelId
                }
            });

        } catch (error) {
            logger.error('Error setting default model', error);
            res.status(500).json({
                success: false,
                message: 'Failed to set default model',
                error: error.message
            });
        }
    }

    /**
     * Test de modelos individuales o consenso (FASE 2)
     */
    async testModels(req, res) {
        try {
            const { prompt, modelIds, consensusMode } = req.body;
            const userId = req.user?.id;

            logger.info('Testing AI models', {
                modelIds: modelIds || 'all',
                consensusMode,
                userId
            });

            let result;
            if (consensusMode) {
                result = await this.aiManager.processConsensusRequest({
                    prompt,
                    modelIds,
                    userId
                });
            } else {
                // Test individual models
                const testModelIds = modelIds || Object.keys(this.aiManager.getAvailableModels());
                const testResults = await Promise.allSettled(
                    testModelIds.map(modelId =>
                        this.aiManager.processRequest({
                            prompt,
                            modelId,
                            userId,
                            metadata: { isTest: true }
                        })
                    )
                );

                result = {
                    testType: 'individual',
                    results: testResults.map((test, index) => ({
                        modelId: testModelIds[index],
                        success: test.status === 'fulfilled',
                        data: test.status === 'fulfilled' ? test.value : null,
                        error: test.status === 'rejected' ? test.reason.message : null
                    }))
                };
            }

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Error testing models', error);
            res.status(500).json({
                success: false,
                message: 'Failed to test models',
                error: error.message
            });
        }
    }

    /**
     * Obtener configuración de AI Manager (FASE 2)
     */
    async getAIConfig(req, res) {
        try {
            const config = {
                defaultModel: this.aiManager.config.defaultModel,
                cacheEnabled: this.aiManager.config.cacheEnabled,
                rateLimitEnabled: this.aiManager.config.rateLimitEnabled,
                loadBalancing: this.aiManager.config.loadBalancing,
                maxRetries: this.aiManager.config.maxRetries,
                timeout: this.aiManager.config.timeout,
                availableModels: Object.keys(this.aiManager.getAvailableModels()),
                totalModels: Object.keys(this.aiManager.getAvailableModels()).length
            };

            res.json({
                success: true,
                data: config
            });

        } catch (error) {
            logger.error('Error getting AI config', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get AI configuration',
                error: error.message
            });
        }
    }

    /**
     * Actualizar configuración de AI Manager (FASE 2)
     */
    async updateAIConfig(req, res) {
        try {
            const updates = req.body;
            const userId = req.user?.id;

            logger.info('Updating AI config', {
                updates,
                userId
            });

            // Aplicar actualizaciones
            Object.keys(updates).forEach(key => {
                if (this.aiManager.config.hasOwnProperty(key)) {
                    this.aiManager.config[key] = updates[key];
                }
            });

            res.json({
                success: true,
                message: 'AI configuration updated successfully',
                data: {
                    updatedConfig: updates,
                    currentConfig: this.aiManager.config
                }
            });

        } catch (error) {
            logger.error('Error updating AI config', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update AI configuration',
                error: error.message
            });
        }
    }

    /**
     * Cerrar conexiones
     */
    async disconnect() {
        try {
            await this.agentManager.disconnect();
            await this.multiAI.disconnect();
            // FASE 2: Desconectar AI Manager
            if (this.aiManager && this.aiManager.redis) {
                await this.aiManager.redis.quit();
            }
            await this.redis.quit();
            logger.info('AI Controller disconnected');
        } catch (error) {
            logger.error('Error disconnecting AI Controller', error);
        }
    }
}

module.exports = AIController;