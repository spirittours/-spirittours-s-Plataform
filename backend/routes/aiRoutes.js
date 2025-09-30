/**
 * AI Routes Enterprise
 * Sistema completo de rutas para Multi-Model AI y 25+ agentes especializados
 * Includes chat, auto-selection, multi-agent consultation y direct AI access
 */

const express = require('express');
const router = express.Router();
const AIController = require('../controllers/AIController');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../services/logging/logger');

// Instancia del controlador AI
const aiController = new AIController();

// ===== RATE LIMITING =====

// Rate limiting general para AI
const aiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 50, // límite de 50 requests AI por 5 minutos por IP
    message: {
        success: false,
        message: 'Too many AI requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting para operaciones costosas (comparaciones de modelos)
const heavyAILimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: 5, // límite de 5 operaciones costosas por 10 minutos
    message: {
        success: false,
        message: 'Heavy AI operations limited, please try again later.'
    }
});

// Rate limiting para chat (más permisivo)
const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 20, // límite de 20 mensajes de chat por minuto
    message: {
        success: false,
        message: 'Too many chat messages, please slow down.'
    }
});

// ===== MIDDLEWARE =====

// Aplicar rate limiting a todas las rutas AI
router.use(aiLimiter);

// Middleware de validación de errores
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('AI validation errors', {
            errors: errors.array(),
            path: req.path,
            method: req.method,
            userId: req.user?.id
        });
        
        return res.status(400).json({
            success: false,
            message: 'Validation errors',
            errors: errors.array()
        });
    }
    next();
};

// Middleware de logging para operaciones AI
const logAIOperation = (operation) => {
    return (req, res, next) => {
        logger.info('AI operation started', {
            operation,
            method: req.method,
            path: req.path,
            userId: req.user?.id,
            userRole: req.user?.role,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
        next();
    };
};

// ===== CONVERSACIÓN CON AGENTES =====

/**
 * POST /api/ai/chat/agent
 * Conversación con agente específico
 */
router.post('/chat/agent', [
    authenticate,
    chatLimiter,
    logAIOperation('agent_chat'),
    body('agentId')
        .notEmpty()
        .withMessage('Agent ID is required')
        .isLength({ min: 3, max: 50 })
        .withMessage('Agent ID must be between 3 and 50 characters'),
    body('message')
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ min: 1, max: 10000 })
        .withMessage('Message must be between 1 and 10,000 characters'),
    body('conversationId')
        .optional()
        .isString()
        .isLength({ min: 10, max: 100 })
        .withMessage('Conversation ID must be between 10 and 100 characters'),
    handleValidationErrors
], aiController.chatWithAgent.bind(aiController));

/**
 * POST /api/ai/chat/auto
 * Chat con auto-selección de agente
 */
router.post('/chat/auto', [
    authenticate,
    chatLimiter,
    logAIOperation('auto_chat'),
    body('message')
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ min: 1, max: 10000 })
        .withMessage('Message must be between 1 and 10,000 characters'),
    body('conversationId')
        .optional()
        .isString()
        .isLength({ min: 10, max: 100 })
        .withMessage('Conversation ID must be between 10 and 100 characters'),
    body('preferences')
        .optional()
        .isObject()
        .withMessage('Preferences must be an object'),
    handleValidationErrors
], aiController.chatWithAutoSelection.bind(aiController));

/**
 * POST /api/ai/chat/multi-agent
 * Consulta con múltiples agentes
 */
router.post('/chat/multi-agent', [
    authenticate,
    heavyAILimiter,
    logAIOperation('multi_agent_chat'),
    body('message')
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ min: 1, max: 10000 })
        .withMessage('Message must be between 1 and 10,000 characters'),
    body('agentIds')
        .isArray({ min: 2, max: 5 })
        .withMessage('Agent IDs must be an array with 2-5 elements'),
    body('agentIds.*')
        .isString()
        .isLength({ min: 3, max: 50 })
        .withMessage('Each agent ID must be between 3 and 50 characters'),
    body('consultationType')
        .optional()
        .isIn(['collaborative', 'comparative', 'sequential'])
        .withMessage('Consultation type must be collaborative, comparative, or sequential'),
    handleValidationErrors
], aiController.multiAgentConsultation.bind(aiController));

// ===== OPERACIONES DIRECTAS DE AI =====

/**
 * POST /api/ai/generate
 * Generar respuesta directa con modelo específico
 */
router.post('/generate', [
    authenticate,
    logAIOperation('direct_generation'),
    body('prompt')
        .notEmpty()
        .withMessage('Prompt is required')
        .isLength({ min: 1, max: 20000 })
        .withMessage('Prompt must be between 1 and 20,000 characters'),
    body('model')
        .optional()
        .isIn(['gpt4', 'claude35', 'gemini'])
        .withMessage('Model must be gpt4, claude35, or gemini'),
    body('options')
        .optional()
        .isObject()
        .withMessage('Options must be an object'),
    body('options.temperature')
        .optional()
        .isFloat({ min: 0, max: 2 })
        .withMessage('Temperature must be between 0 and 2'),
    body('options.maxTokens')
        .optional()
        .isInt({ min: 1, max: 8192 })
        .withMessage('Max tokens must be between 1 and 8192'),
    handleValidationErrors
], aiController.generateDirectResponse.bind(aiController));

/**
 * POST /api/ai/compare-models
 * Comparar respuestas de múltiples modelos
 */
router.post('/compare-models', [
    authenticate,
    heavyAILimiter,
    logAIOperation('model_comparison'),
    body('prompt')
        .notEmpty()
        .withMessage('Prompt is required')
        .isLength({ min: 1, max: 10000 })
        .withMessage('Prompt must be between 1 and 10,000 characters'),
    body('models')
        .optional()
        .isArray({ min: 2, max: 5 })
        .withMessage('Models must be an array with 2-5 elements'),
    body('models.*')
        .optional()
        .isIn(['gpt4', 'claude35', 'gemini'])
        .withMessage('Each model must be gpt4, claude35, or gemini'),
    body('options')
        .optional()
        .isObject()
        .withMessage('Options must be an object'),
    handleValidationErrors
], aiController.compareModels.bind(aiController));

// ===== GESTIÓN DE CONVERSACIONES =====

/**
 * GET /api/ai/conversations/:conversationId
 * Obtener historial de conversación
 */
router.get('/conversations/:conversationId', [
    authenticate,
    logAIOperation('get_conversation'),
    param('conversationId')
        .notEmpty()
        .withMessage('Conversation ID is required')
        .isString()
        .isLength({ min: 10, max: 100 })
        .withMessage('Conversation ID must be between 10 and 100 characters'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be 0 or greater')
        .toInt(),
    handleValidationErrors
], aiController.getConversationHistory.bind(aiController));

/**
 * DELETE /api/ai/conversations/:conversationId
 * Eliminar conversación
 */
router.delete('/conversations/:conversationId', [
    authenticate,
    logAIOperation('delete_conversation'),
    param('conversationId')
        .notEmpty()
        .withMessage('Conversation ID is required')
        .isString()
        .isLength({ min: 10, max: 100 })
        .withMessage('Conversation ID must be between 10 and 100 characters'),
    handleValidationErrors
], aiController.deleteConversation.bind(aiController));

// ===== INFORMACIÓN DE AGENTES =====

/**
 * GET /api/ai/agents
 * Listar todos los agentes disponibles
 */
router.get('/agents', [
    authenticate,
    logAIOperation('list_agents')
], aiController.listAgents.bind(aiController));

/**
 * GET /api/ai/agents/:agentId
 * Obtener información detallada de un agente
 */
router.get('/agents/:agentId', [
    authenticate,
    logAIOperation('get_agent_info'),
    param('agentId')
        .notEmpty()
        .withMessage('Agent ID is required')
        .isString()
        .isLength({ min: 3, max: 50 })
        .withMessage('Agent ID must be between 3 and 50 characters'),
    handleValidationErrors
], aiController.getAgentInfo.bind(aiController));

// ===== MÉTRICAS Y ANALYTICS =====

/**
 * GET /api/ai/metrics
 * Obtener métricas del sistema AI
 */
router.get('/metrics', [
    authenticate,
    authorize(['admin', 'supervisor']),
    logAIOperation('get_ai_metrics'),
    query('timeframe')
        .optional()
        .isIn(['1h', '6h', '24h', '7d', '30d'])
        .withMessage('Timeframe must be 1h, 6h, 24h, 7d, or 30d'),
    handleValidationErrors
], aiController.getAIMetrics.bind(aiController));

/**
 * GET /api/ai/health
 * Estado de salud del sistema AI
 */
router.get('/health', [
    logAIOperation('ai_health_check')
], aiController.getAIHealthStatus.bind(aiController));

// ===== RUTAS DE UTILIDAD =====

/**
 * GET /api/ai/models
 * Información sobre modelos disponibles
 */
router.get('/models', [
    authenticate,
    logAIOperation('get_models_info')
], async (req, res) => {
    try {
        const modelsInfo = {
            available_models: {
                gpt4: {
                    name: 'GPT-4 Turbo',
                    provider: 'OpenAI',
                    capabilities: ['text', 'code', 'analysis', 'creative'],
                    maxTokens: 4096,
                    costTier: 'high',
                    specialty: 'General purpose with strong reasoning'
                },
                claude35: {
                    name: 'Claude 3.5 Sonnet',
                    provider: 'Anthropic',
                    capabilities: ['text', 'analysis', 'reasoning', 'creative'],
                    maxTokens: 8192,
                    costTier: 'medium',
                    specialty: 'Analytical thinking and detailed explanations'
                },
                gemini: {
                    name: 'Gemini Pro',
                    provider: 'Google',
                    capabilities: ['text', 'multimodal', 'fast'],
                    maxTokens: 2048,
                    costTier: 'low',
                    specialty: 'Fast responses and general knowledge'
                }
            },
            default_model: 'claude35',
            auto_routing: true,
            caching_enabled: true
        };

        res.json({
            success: true,
            data: modelsInfo
        });
    } catch (error) {
        logger.error('Error getting models info', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get models information'
        });
    }
});

/**
 * GET /api/ai/capabilities
 * Capacidades del sistema AI
 */
router.get('/capabilities', [
    authenticate,
    logAIOperation('get_ai_capabilities')
], async (req, res) => {
    try {
        const capabilities = {
            agent_system: {
                total_agents: 25,
                specialized_domains: [
                    'sustainable_travel', 'ethical_tourism', 'cultural_immersion',
                    'adventure_planning', 'luxury_services', 'budget_optimization',
                    'accessibility', 'group_coordination', 'crisis_management',
                    'carbon_footprint', 'destination_expertise', 'booking_management',
                    'customer_experience', 'travel_insurance', 'visa_consultation',
                    'weather_advisory'
                ],
                auto_selection: true,
                multi_agent_consultation: true,
                context_memory: true
            },
            multi_model_ai: {
                models: ['GPT-4', 'Claude 3.5', 'Gemini Pro'],
                auto_routing: true,
                failover_support: true,
                cost_optimization: true,
                caching: true,
                real_time_switching: true
            },
            advanced_features: {
                conversation_history: true,
                model_comparison: true,
                synthesis_generation: true,
                metrics_analytics: true,
                rate_limiting: true,
                authentication: true,
                role_based_access: true
            }
        };

        res.json({
            success: true,
            data: capabilities
        });
    } catch (error) {
        logger.error('Error getting AI capabilities', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get AI capabilities'
        });
    }
});

/**
 * POST /api/ai/test
 * Endpoint de prueba para el sistema AI
 */
router.post('/test', [
    authenticate,
    authorize(['admin', 'supervisor']),
    logAIOperation('ai_system_test'),
    body('testType')
        .optional()
        .isIn(['basic', 'agents', 'models', 'full'])
        .withMessage('Test type must be basic, agents, models, or full'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { testType = 'basic' } = req.body;
        const testResults = {
            testType,
            timestamp: new Date(),
            tests: []
        };

        // Test básico
        if (['basic', 'full'].includes(testType)) {
            try {
                const basicTest = await aiController.multiAI.generateResponse(
                    'Responde con "AI System Test Successful" si el sistema está funcionando correctamente.',
                    { preferredModel: 'gemini', maxTokens: 50 }
                );
                testResults.tests.push({
                    name: 'Basic AI Response',
                    status: basicTest.success ? 'passed' : 'failed',
                    response: basicTest.content,
                    model: basicTest.model
                });
            } catch (error) {
                testResults.tests.push({
                    name: 'Basic AI Response',
                    status: 'failed',
                    error: error.message
                });
            }
        }

        // Test de agentes
        if (['agents', 'full'].includes(testType)) {
            try {
                const agentTest = await aiController.agentManager.processWithAgent(
                    'destination-expert',
                    'Test message for agent system',
                    { userId: req.user?.id }
                );
                testResults.tests.push({
                    name: 'Agent System Test',
                    status: agentTest.success ? 'passed' : 'failed',
                    agent: agentTest.agentName
                });
            } catch (error) {
                testResults.tests.push({
                    name: 'Agent System Test',
                    status: 'failed',
                    error: error.message
                });
            }
        }

        // Test de modelos múltiples
        if (['models', 'full'].includes(testType)) {
            const models = ['claude35', 'gemini'];
            for (const model of models) {
                try {
                    const modelTest = await aiController.multiAI.generateResponse(
                        'Test',
                        { preferredModel: model, maxTokens: 20 }
                    );
                    testResults.tests.push({
                        name: `${model} Model Test`,
                        status: modelTest.success ? 'passed' : 'failed',
                        model: modelTest.model
                    });
                } catch (error) {
                    testResults.tests.push({
                        name: `${model} Model Test`,
                        status: 'failed',
                        error: error.message
                    });
                }
            }
        }

        const passedTests = testResults.tests.filter(t => t.status === 'passed').length;
        const totalTests = testResults.tests.length;
        
        testResults.summary = {
            passed: passedTests,
            failed: totalTests - passedTests,
            total: totalTests,
            success_rate: totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) + '%' : '0%'
        };

        res.json({
            success: true,
            data: testResults
        });

    } catch (error) {
        logger.error('Error in AI system test', error);
        res.status(500).json({
            success: false,
            message: 'AI system test failed',
            error: error.message
        });
    }
});

// ===== BÚSQUEDA DE AGENTES =====

/**
 * GET /api/ai/agents/search
 * Buscar agentes por especialidad o capacidad
 */
router.get('/agents/search', [
    authenticate,
    logAIOperation('search_agents'),
    query('q')
        .notEmpty()
        .withMessage('Search query is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Search query must be between 2 and 100 characters'),
    query('specialty')
        .optional()
        .isString()
        .isLength({ min: 2, max: 50 })
        .withMessage('Specialty must be between 2 and 50 characters'),
    query('capability')
        .optional()
        .isString()
        .isLength({ min: 2, max: 50 })
        .withMessage('Capability must be between 2 and 50 characters'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { q, specialty, capability } = req.query;
        const agents = aiController.agentManager.agents;
        const results = [];

        const searchQuery = q.toLowerCase();

        for (const [agentId, agent] of Object.entries(agents)) {
            let matchScore = 0;

            // Buscar en nombre y descripción
            if (agent.name.toLowerCase().includes(searchQuery) ||
                agent.description.toLowerCase().includes(searchQuery)) {
                matchScore += 3;
            }

            // Buscar en especialidades
            if (agent.specialties.some(s => s.toLowerCase().includes(searchQuery))) {
                matchScore += 2;
            }

            // Buscar en capacidades
            if (agent.capabilities && agent.capabilities.some(c => c.toLowerCase().includes(searchQuery))) {
                matchScore += 2;
            }

            // Filtrar por especialidad específica
            if (specialty && !agent.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase()))) {
                matchScore = 0;
            }

            // Filtrar por capacidad específica
            if (capability && agent.capabilities && 
                !agent.capabilities.some(c => c.toLowerCase().includes(capability.toLowerCase()))) {
                matchScore = 0;
            }

            if (matchScore > 0) {
                results.push({
                    id: agentId,
                    name: agent.name,
                    description: agent.description,
                    specialties: agent.specialties,
                    capabilities: agent.capabilities,
                    matchScore,
                    preferredModel: agent.preferredModel
                });
            }
        }

        // Ordenar por score de coincidencia
        results.sort((a, b) => b.matchScore - a.matchScore);

        res.json({
            success: true,
            data: {
                query: q,
                filters: { specialty, capability },
                results,
                totalResults: results.length
            }
        });

    } catch (error) {
        logger.error('Error searching agents', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search agents',
            error: error.message
        });
    }
});

// Error handler específico para rutas AI
router.use((error, req, res, next) => {
    logger.error('AI route error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.id
    });

    res.status(500).json({
        success: false,
        message: 'AI operation failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;