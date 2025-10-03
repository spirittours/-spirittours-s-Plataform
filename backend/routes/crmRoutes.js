/**
 * CRM Routes Enterprise
 * Sistema completo de rutas para integración SuiteCRM
 * Basado en análisis de AI Drive con validaciones y middleware avanzado
 */

const express = require('express');
const router = express.Router();
const CRMController = require('../controllers/CRMController');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../services/logging/logger');

// Instancia del controlador CRM
const crmController = new CRMController();

// ===== RATE LIMITING =====

// Rate limiting general para CRM
const crmLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 100, // límite de 100 requests CRM por 5 minutos por IP
    message: {
        success: false,
        message: 'Too many CRM requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting específico para sincronización
const crmSyncLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: 5, // límite de operaciones de sync
    message: {
        success: false,
        message: 'Sync operations limited, please try again later.'
    }
});

// Rate limiting para operaciones de escritura
const crmWriteLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 20, // límite de 20 operaciones de escritura por minuto
    message: {
        success: false,
        message: 'Too many write operations, please slow down.'
    }
});

// ===== MIDDLEWARE =====

// Aplicar rate limiting a todas las rutas CRM
router.use(crmLimiter);

// Middleware de validación de errores
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('CRM validation errors', {
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

// Middleware para requerir privilegios de supervisor
const requireSupervisor = (req, res, next) => {
    if (!['admin', 'supervisor'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied: supervisor privileges required'
        });
    }
    next();
};

// Middleware de logging para operaciones CRM
const logCRMOperation = (operation) => {
    return (req, res, next) => {
        logger.info('CRM operation started', {
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

// ===== HEALTH & STATUS ENDPOINTS =====

/**
 * GET /api/crm/health
 * Verificar salud del sistema CRM y conectividad
 */
router.get('/health', 
    logCRMOperation('health_check'),
    async (req, res) => {
        try {
            const health = await crmController.getHealthStatus();
            
            const statusCode = health.status === 'healthy' ? 200 : 
                             health.status === 'degraded' ? 206 : 503;
            
            res.status(statusCode).json({
                success: health.status !== 'unhealthy',
                data: health
            });
        } catch (error) {
            logger.error('Health check failed', { 
                error: error.message,
                stack: error.stack 
            });
            
            res.status(500).json({
                success: false,
                message: 'Failed to get CRM health status',
                error: error.message
            });
        }
    }
);

/**
 * GET /api/crm/sync-status
 * Obtener estado de sincronización y estadísticas
 */
router.get('/sync-status', 
    authenticate,
    requireSupervisor,
    logCRMOperation('sync_status'),
    async (req, res) => {
        try {
            const status = await crmController.getSyncStatus();
            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            logger.error('Failed to get sync status', { 
                error: error.message,
                userId: req.user?.id 
            });
            
            res.status(500).json({
                success: false,
                message: 'Failed to get sync status',
                error: error.message
            });
        }
    }
);

/**
 * GET /api/crm/stats/dashboard
 * Estadísticas para dashboard ejecutivo
 */
router.get('/stats/dashboard',
    authenticate,
    logCRMOperation('dashboard_stats'),
    crmController.getDashboardStats.bind(crmController)
);

// ===== CONTACTS ENDPOINTS =====

/**
 * GET /api/crm/contacts
 * Obtener contactos con filtros, paginación y búsqueda
 */
router.get('/contacts', [
    authenticate,
    logCRMOperation('get_contacts'),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
    query('search')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Search must be between 2 and 100 characters'),
    query('status')
        .optional()
        .isIn(['active', 'inactive', 'pending'])
        .withMessage('Status must be active, inactive, or pending'),
    query('source')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Source must be max 50 characters'),
    query('sortBy')
        .optional()
        .isIn(['created_at', 'updated_at', 'first_name', 'last_name', 'company'])
        .withMessage('Invalid sort field'),
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),
    handleValidationErrors
], crmController.getContacts.bind(crmController));

/**
 * GET /api/crm/contacts/:id
 * Obtener contacto específico por ID
 */
router.get('/contacts/:id', [
    authenticate,
    logCRMOperation('get_contact'),
    param('id')
        .isUUID()
        .withMessage('Contact ID must be a valid UUID'),
    handleValidationErrors
], crmController.getContact.bind(crmController));

/**
 * POST /api/crm/contacts
 * Crear nuevo contacto
 */
router.post('/contacts', [
    authenticate,
    crmWriteLimiter,
    logCRMOperation('create_contact'),
    body('firstName')
        .notEmpty()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters')
        .matches(/^[a-zA-ZÀ-ÿ\u0100-\u017F\s'-]+$/)
        .withMessage('First name contains invalid characters'),
    body('lastName')
        .notEmpty()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters')
        .matches(/^[a-zA-ZÀ-ÿ\u0100-\u017F\s'-]+$/)
        .withMessage('Last name contains invalid characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Valid phone number required'),
    body('company')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Company name must be max 100 characters'),
    body('title')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Title must be max 100 characters'),
    body('source')
        .optional()
        .isIn(['Website', 'Social Media', 'Referral', 'Advertisement', 'Trade Show', 'Cold Call', 'Email Campaign'])
        .withMessage('Invalid source'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must be max 1000 characters'),
    handleValidationErrors
], crmController.createContact.bind(crmController));

/**
 * PUT /api/crm/contacts/:id
 * Actualizar contacto existente
 */
router.put('/contacts/:id', [
    authenticate,
    crmWriteLimiter,
    logCRMOperation('update_contact'),
    param('id')
        .isUUID()
        .withMessage('Contact ID must be a valid UUID'),
    body('firstName')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email required'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Valid phone number required'),
    body('company')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Company name must be max 100 characters'),
    body('title')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Title must be max 100 characters'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must be max 1000 characters'),
    handleValidationErrors
], crmController.updateContact.bind(crmController));

/**
 * DELETE /api/crm/contacts/:id
 * Eliminar contacto
 */
router.delete('/contacts/:id', [
    authenticate,
    authorize(['admin', 'supervisor']), // Solo admin/supervisor pueden eliminar
    crmWriteLimiter,
    logCRMOperation('delete_contact'),
    param('id')
        .isUUID()
        .withMessage('Contact ID must be a valid UUID'),
    handleValidationErrors
], crmController.deleteContact.bind(crmController));

// ===== LEADS ENDPOINTS =====

/**
 * GET /api/crm/leads
 * Obtener leads con filtros y paginación
 */
router.get('/leads', [
    authenticate,
    logCRMOperation('get_leads'),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .toInt(),
    query('search')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 100 }),
    query('status')
        .optional()
        .isIn(['New', 'Assigned', 'In Process', 'Converted', 'Recycled', 'Dead'])
        .withMessage('Invalid lead status'),
    query('source')
        .optional()
        .isString()
        .trim(),
    handleValidationErrors
], crmController.getLeads.bind(crmController));

/**
 * POST /api/crm/leads
 * Crear nuevo lead
 */
router.post('/leads', [
    authenticate,
    crmWriteLimiter,
    logCRMOperation('create_lead'),
    body('firstName')
        .notEmpty()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name is required (2-50 characters)'),
    body('lastName')
        .notEmpty()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name is required (2-50 characters)'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('phone')
        .optional()
        .isMobilePhone(),
    body('company')
        .optional()
        .isLength({ max: 100 }),
    body('source')
        .optional()
        .isIn(['Website', 'Social Media', 'Referral', 'Advertisement', 'Trade Show', 'Cold Call', 'Email Campaign']),
    body('status')
        .optional()
        .isIn(['New', 'Assigned', 'In Process', 'Converted', 'Recycled', 'Dead'])
        .withMessage('Invalid lead status'),
    body('industry')
        .optional()
        .isLength({ max: 100 }),
    body('website')
        .optional()
        .isURL(),
    body('description')
        .optional()
        .isLength({ max: 1000 }),
    handleValidationErrors
], crmController.createLead.bind(crmController));

/**
 * POST /api/crm/leads/:id/convert
 * Convertir lead a contacto y oportunidad
 */
router.post('/leads/:id/convert', [
    authenticate,
    authorize(['agent', 'supervisor', 'admin']),
    crmWriteLimiter,
    logCRMOperation('convert_lead'),
    param('id')
        .isUUID()
        .withMessage('Lead ID must be a valid UUID'),
    body('createContact')
        .optional()
        .isBoolean()
        .withMessage('createContact must be boolean'),
    body('createOpportunity')
        .optional()
        .isBoolean()
        .withMessage('createOpportunity must be boolean'),
    body('opportunityName')
        .optional()
        .isLength({ min: 3, max: 200 })
        .withMessage('Opportunity name must be 3-200 characters'),
    body('amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Amount must be a positive number'),
    body('closeDate')
        .optional()
        .isISO8601()
        .withMessage('Close date must be valid ISO date'),
    body('stage')
        .optional()
        .isIn(['Prospecting', 'Qualification', 'Needs Analysis', 'Value Proposition', 'Negotiation', 'Closed Won', 'Closed Lost'])
        .withMessage('Invalid opportunity stage'),
    handleValidationErrors
], crmController.convertLead.bind(crmController));

// ===== OPPORTUNITIES ENDPOINTS =====

/**
 * GET /api/crm/opportunities
 * Obtener oportunidades con filtros
 */
router.get('/opportunities', [
    authenticate,
    logCRMOperation('get_opportunities'),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .toInt(),
    query('stage')
        .optional()
        .isIn(['Prospecting', 'Qualification', 'Needs Analysis', 'Value Proposition', 'Negotiation', 'Closed Won', 'Closed Lost'])
        .withMessage('Invalid opportunity stage'),
    query('minAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum amount must be positive number'),
    query('maxAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum amount must be positive number'),
    handleValidationErrors
], crmController.getOpportunities.bind(crmController));

/**
 * POST /api/crm/opportunities
 * Crear nueva oportunidad
 */
router.post('/opportunities', [
    authenticate,
    crmWriteLimiter,
    logCRMOperation('create_opportunity'),
    body('name')
        .notEmpty()
        .isLength({ min: 3, max: 200 })
        .withMessage('Opportunity name is required (3-200 characters)'),
    body('amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Amount must be a positive number'),
    body('closeDate')
        .optional()
        .isISO8601()
        .withMessage('Close date must be valid ISO date'),
    body('stage')
        .optional()
        .isIn(['Prospecting', 'Qualification', 'Needs Analysis', 'Value Proposition', 'Negotiation', 'Closed Won', 'Closed Lost'])
        .withMessage('Invalid opportunity stage'),
    body('probability')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('Probability must be between 0 and 100'),
    body('contactId')
        .optional()
        .isUUID()
        .withMessage('Contact ID must be valid UUID'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must be max 1000 characters'),
    handleValidationErrors
], crmController.createOpportunity.bind(crmController));

// ===== SYNCHRONIZATION ENDPOINTS =====

/**
 * POST /api/crm/sync/incremental
 * Realizar sincronización incremental
 */
router.post('/sync/incremental', [
    authenticate,
    crmSyncLimiter,
    logCRMOperation('incremental_sync'),
    query('since')
        .optional()
        .isISO8601()
        .withMessage('Since parameter must be valid ISO date'),
    handleValidationErrors
], crmController.performIncrementalSync.bind(crmController));

/**
 * POST /api/crm/sync/full
 * Realizar sincronización completa (solo supervisores)
 */
router.post('/sync/full', [
    authenticate,
    requireSupervisor,
    crmSyncLimiter,
    logCRMOperation('full_sync')
], crmController.performFullSync.bind(crmController));

// ===== ACTIVITIES & NOTES ENDPOINTS =====

/**
 * POST /api/crm/activities
 * Crear actividad/tarea
 */
router.post('/activities', [
    authenticate,
    crmWriteLimiter,
    logCRMOperation('create_activity'),
    body('subject')
        .notEmpty()
        .isLength({ min: 3, max: 200 })
        .withMessage('Subject is required (3-200 characters)'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description must be max 1000 characters'),
    body('dueDate')
        .optional()
        .isISO8601()
        .withMessage('Due date must be valid ISO date'),
    body('priority')
        .optional()
        .isIn(['Low', 'Medium', 'High'])
        .withMessage('Priority must be Low, Medium, or High'),
    body('status')
        .optional()
        .isIn(['Not Started', 'In Progress', 'Completed', 'Pending Input', 'Deferred'])
        .withMessage('Invalid status'),
    body('parentType')
        .optional()
        .isIn(['Contacts', 'Leads', 'Opportunities', 'Accounts'])
        .withMessage('Invalid parent type'),
    body('parentId')
        .optional()
        .isUUID()
        .withMessage('Parent ID must be valid UUID'),
    handleValidationErrors
], async (req, res) => {
    try {
        const activityData = {
            ...req.body,
            assignedTo: req.user?.id
        };

        const result = await crmController.crmClient.createActivity(activityData);
        
        res.status(201).json({
            success: true,
            message: 'Activity created successfully',
            data: result
        });
    } catch (error) {
        logger.error('Failed to create activity', { 
            error: error.message,
            userId: req.user?.id 
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create activity',
            error: error.message
        });
    }
});

/**
 * POST /api/crm/notes
 * Crear nota
 */
router.post('/notes', [
    authenticate,
    crmWriteLimiter,
    logCRMOperation('create_note'),
    body('subject')
        .notEmpty()
        .isLength({ min: 3, max: 200 })
        .withMessage('Subject is required (3-200 characters)'),
    body('description')
        .notEmpty()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Description is required (10-2000 characters)'),
    body('parentType')
        .optional()
        .isIn(['Contacts', 'Leads', 'Opportunities', 'Accounts'])
        .withMessage('Invalid parent type'),
    body('parentId')
        .optional()
        .isUUID()
        .withMessage('Parent ID must be valid UUID'),
    handleValidationErrors
], async (req, res) => {
    try {
        const noteData = {
            ...req.body,
            assignedTo: req.user?.id
        };

        const result = await crmController.crmClient.createNote(noteData);
        
        res.status(201).json({
            success: true,
            message: 'Note created successfully',
            data: result
        });
    } catch (error) {
        logger.error('Failed to create note', { 
            error: error.message,
            userId: req.user?.id 
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to create note',
            error: error.message
        });
    }
});

// ===== SEARCH ENDPOINTS =====

/**
 * GET /api/crm/search
 * Búsqueda global en CRM
 */
router.get('/search', [
    authenticate,
    logCRMOperation('global_search'),
    query('q')
        .notEmpty()
        .isLength({ min: 2, max: 100 })
        .withMessage('Search query must be between 2 and 100 characters'),
    query('type')
        .optional()
        .isIn(['contacts', 'leads', 'opportunities', 'all'])
        .withMessage('Type must be contacts, leads, opportunities, or all'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Limit must be between 1 and 50')
        .toInt(),
    handleValidationErrors
], async (req, res) => {
    try {
        const { q: searchQuery, type = 'all', limit = 10 } = req.query;
        
        const searchPromises = [];
        
        if (type === 'all' || type === 'contacts') {
            searchPromises.push(
                crmController.crmClient.getContacts({ search: searchQuery, limit })
                    .then(result => ({ type: 'contacts', data: result.data }))
            );
        }
        
        if (type === 'all' || type === 'leads') {
            searchPromises.push(
                crmController.crmClient.getLeads({ search: searchQuery, limit })
                    .then(result => ({ type: 'leads', data: result.data }))
            );
        }
        
        if (type === 'all' || type === 'opportunities') {
            searchPromises.push(
                crmController.crmClient.getOpportunities({ search: searchQuery, limit })
                    .then(result => ({ type: 'opportunities', data: result.data }))
            );
        }
        
        const results = await Promise.all(searchPromises);
        
        const searchResults = {
            query: searchQuery,
            type,
            results: results.reduce((acc, result) => {
                acc[result.type] = result.data;
                return acc;
            }, {}),
            totalResults: results.reduce((acc, result) => acc + result.data.length, 0),
            timestamp: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: searchResults
        });
        
    } catch (error) {
        logger.error('Global search failed', { 
            error: error.message,
            query: req.query,
            userId: req.user?.id 
        });
        
        res.status(500).json({
            success: false,
            message: 'Search failed',
            error: error.message
        });
    }
});

// ===== ERROR HANDLING =====

// ===== WEBHOOK ENDPOINTS =====

/**
 * POST /api/crm/webhook/suitecrm/:entity/:action
 * Webhook de SuiteCRM para sincronización bidireccional
 */
router.post('/webhook/suitecrm/:entity/:action', [
    // Sin autenticación para webhooks (se valida por firma)
    param('entity')
        .isIn(['contacts', 'leads', 'opportunities', 'accounts', 'tasks', 'calls', 'meetings'])
        .withMessage('Invalid entity type'),
    param('action')
        .isIn(['create', 'update', 'delete', 'convert', 'close'])
        .withMessage('Invalid action type'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { entity, action } = req.params;
        const webhookData = req.body;
        
        logger.info('SuiteCRM webhook received', {
            entity,
            action,
            recordId: webhookData.id,
            timestamp: new Date().toISOString()
        });

        // Procesar webhook usando el controlador
        const result = await crmController.processWebhook('suitecrm', entity, action, webhookData);
        
        res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
            result
        });
    } catch (error) {
        logger.error('Failed to process SuiteCRM webhook', {
            error: error.message,
            stack: error.stack,
            entity: req.params.entity,
            action: req.params.action
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to process webhook',
            error: error.message
        });
    }
});

/**
 * POST /api/crm/webhook/generic/:system/:entity/:action
 * Webhook genérico para otros sistemas CRM
 */
router.post('/webhook/generic/:system/:entity/:action', [
    param('system')
        .isAlpha()
        .isLength({ min: 2, max: 50 })
        .withMessage('Invalid system name'),
    param('entity')
        .isAlpha()
        .isLength({ min: 2, max: 50 })
        .withMessage('Invalid entity type'),
    param('action')
        .isAlpha()
        .isLength({ min: 2, max: 50 })
        .withMessage('Invalid action type'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { system, entity, action } = req.params;
        const webhookData = req.body;
        
        logger.info('Generic CRM webhook received', {
            system,
            entity,
            action,
            timestamp: new Date().toISOString()
        });

        const result = await crmController.processWebhook(system, entity, action, webhookData);
        
        res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
            result
        });
    } catch (error) {
        logger.error('Failed to process generic webhook', {
            error: error.message,
            stack: error.stack,
            system: req.params.system,
            entity: req.params.entity,
            action: req.params.action
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to process webhook',
            error: error.message
        });
    }
});

/**
 * GET /api/crm/webhooks/status
 * Estado de los webhooks y métricas
 */
router.get('/webhooks/status', [
    authenticate,
    requireSupervisor,
    logCRMOperation('webhook_status')
], async (req, res) => {
    try {
        const status = await crmController.getWebhookStatus();
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('Failed to get webhook status', {
            error: error.message,
            userId: req.user?.id
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to get webhook status',
            error: error.message
        });
    }
});

/**
 * POST /api/crm/webhooks/test
 * Endpoint de prueba para webhooks
 */
router.post('/webhooks/test', [
    authenticate,
    requireSupervisor,
    logCRMOperation('webhook_test'),
    body('entity').notEmpty().withMessage('Entity is required'),
    body('action').notEmpty().withMessage('Action is required'),
    body('data').isObject().withMessage('Data must be an object'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { entity, action, data } = req.body;
        
        const result = await crmController.processWebhook('test', entity, action, data);
        
        res.json({
            success: true,
            message: 'Test webhook processed successfully',
            result
        });
    } catch (error) {
        logger.error('Failed to process test webhook', {
            error: error.message,
            userId: req.user?.id
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to process test webhook',
            error: error.message
        });
    }
});

/**
 * GET /api/crm/webhooks/config
 * Obtener configuración de webhooks
 */
router.get('/webhooks/config', [
    authenticate,
    requireSupervisor,
    logCRMOperation('webhook_config_get')
], async (req, res) => {
    try {
        const config = await crmController.getWebhookConfig();
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        logger.error('Failed to get webhook config', {
            error: error.message,
            userId: req.user?.id
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to get webhook configuration',
            error: error.message
        });
    }
});

/**
 * PUT /api/crm/webhooks/config
 * Actualizar configuración de webhooks
 */
router.put('/webhooks/config', [
    authenticate,
    requireSupervisor,
    crmWriteLimiter,
    logCRMOperation('webhook_config_update'),
    body('retryAttempts')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Retry attempts must be between 1 and 10'),
    body('retryDelay')
        .optional()
        .isInt({ min: 1000, max: 300000 })
        .withMessage('Retry delay must be between 1000ms and 300000ms'),
    body('timeout')
        .optional()
        .isInt({ min: 5000, max: 120000 })
        .withMessage('Timeout must be between 5000ms and 120000ms'),
    handleValidationErrors
], async (req, res) => {
    try {
        const result = await crmController.updateWebhookConfig(req.body);
        
        res.json({
            success: true,
            message: 'Webhook configuration updated successfully',
            data: result
        });
    } catch (error) {
        logger.error('Failed to update webhook config', {
            error: error.message,
            userId: req.user?.id
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to update webhook configuration',
            error: error.message
        });
    }
});

// ===== SYNC MANAGEMENT ENDPOINTS =====

/**
 * POST /api/crm/sync/manual-trigger
 * Disparar sincronización manual completa
 */
router.post('/sync/manual-trigger', [
    authenticate,
    requireSupervisor,
    crmSyncLimiter,
    logCRMOperation('manual_sync_trigger'),
    body('entity')
        .optional()
        .isIn(['contacts', 'leads', 'opportunities', 'accounts', 'all'])
        .withMessage('Invalid entity type'),
    body('direction')
        .optional()
        .isIn(['to_suitecrm', 'from_suitecrm', 'bidirectional'])
        .withMessage('Invalid sync direction'),
    body('full_sync')
        .optional()
        .isBoolean()
        .withMessage('Full sync must be boolean'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { entity = 'all', direction = 'bidirectional', full_sync = false } = req.body;
        
        const result = await crmController.triggerManualSync({
            entity,
            direction,
            fullSync: full_sync,
            triggeredBy: req.user.id
        });
        
        res.json({
            success: true,
            message: 'Sync triggered successfully',
            data: result
        });
    } catch (error) {
        logger.error('Failed to trigger manual sync', {
            error: error.message,
            userId: req.user?.id
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to trigger sync',
            error: error.message
        });
    }
});

/**
 * GET /api/crm/sync/history
 * Historial de sincronizaciones
 */
router.get('/sync/history', [
    authenticate,
    requireSupervisor,
    logCRMOperation('sync_history'),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
    query('entity')
        .optional()
        .isIn(['contacts', 'leads', 'opportunities', 'accounts'])
        .withMessage('Invalid entity type'),
    query('status')
        .optional()
        .isIn(['pending', 'in_progress', 'success', 'failed', 'partial'])
        .withMessage('Invalid status'),
    handleValidationErrors
], async (req, res) => {
    try {
        const filters = {
            page: req.query.page || 1,
            limit: req.query.limit || 20,
            entity: req.query.entity,
            status: req.query.status
        };
        
        const result = await crmController.getSyncHistory(filters);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Failed to get sync history', {
            error: error.message,
            userId: req.user?.id
        });
        
        res.status(500).json({
            success: false,
            message: 'Failed to get sync history',
            error: error.message
        });
    }
});

// Error handler específico para rutas CRM
router.use((error, req, res, next) => {
    logger.error('CRM route error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.id
    });

    res.status(500).json({
        success: false,
        message: 'CRM operation failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;