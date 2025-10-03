/**
 * CRM Routes FASE 1: ENTERPRISE INTEGRATION
 * Rutas adicionales para completar la integración SuiteCRM Enterprise
 * Complementa a crmRoutes.js existente
 * Valor: $75,000 - CRM Enterprise Integration Complete
 */

const express = require('express');
const router = express.Router();
const CRMController = require('../controllers/CRMController');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../services/logging/logger');

// ===== NUEVAS FUNCIONALIDADES FASE 1 =====

// Rate limiters específicos para FASE 1
const crmDashboardLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 60, // 60 requests por minuto para dashboard
    message: { success: false, message: 'Dashboard rate limit exceeded' }
});

const crmReportsLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 10, // 10 reportes por 5 minutos
    message: { success: false, message: 'Reports rate limit exceeded' }
});

// Middleware de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation errors',
            errors: errors.array()
        });
    }
    next();
};

// ===== DASHBOARD ENTERPRISE =====

/**
 * GET /api/crm/dashboard/stats
 * Estadísticas completas para dashboard CRM Enterprise
 */
router.get('/dashboard/stats',
    authenticate,
    crmDashboardLimiter,
    async (req, res) => {
        try {
            const stats = await CRMController.getDashboardStats(req, res);
        } catch (error) {
            logger.error('Error fetching dashboard stats', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard statistics',
                error: error.message
            });
        }
    }
);

/**
 * GET /api/crm/dashboard/metrics
 * Métricas de performance en tiempo real
 */
router.get('/dashboard/metrics',
    authenticate,
    crmDashboardLimiter,
    async (req, res) => {
        try {
            const metrics = {
                sync_status: await CRMController.getSyncStatus(),
                performance: await CRMController.getPerformanceMetrics(),
                webhook_status: await CRMController.getWebhookStatus(),
                recent_activities: await CRMController.getRecentActivities(10)
            };

            res.json({
                success: true,
                data: metrics,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error fetching metrics', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch metrics'
            });
        }
    }
);

// ===== LEADS MANAGEMENT =====

/**
 * GET /api/crm/leads
 * Gestión completa de leads con filtros avanzados
 */
router.get('/leads', [
    authenticate,
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn([
        'new', 'contacted', 'qualified', 'proposal', 
        'negotiation', 'closed_won', 'closed_lost'
    ]),
    query('rating').optional().isIn(['Hot', 'Warm', 'Cold']),
    query('lead_source').optional().trim(),
    query('search').optional().isString().trim(),
    query('assigned_user_id').optional().isUUID(),
    query('converted').optional().isBoolean().toBoolean(),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    handleValidationErrors
], async (req, res) => {
    try {
        const leads = await CRMController.getLeads(req, res);
    } catch (error) {
        logger.error('Error fetching leads', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch leads'
        });
    }
});

/**
 * POST /api/crm/leads
 * Crear nuevo lead con validación completa
 */
router.post('/leads', [
    authenticate,
    body('first_name').notEmpty().trim().isLength({ min: 2, max: 50 }),
    body('last_name').notEmpty().trim().isLength({ min: 2, max: 50 }),
    body('email').isEmail().normalizeEmail(),
    body('company').notEmpty().trim().isLength({ min: 2, max: 100 }),
    body('phone').optional().isMobilePhone(),
    body('status').optional().isIn([
        'new', 'contacted', 'qualified', 'proposal', 
        'negotiation', 'closed_won', 'closed_lost'
    ]),
    body('lead_source').optional().trim().isLength({ max: 100 }),
    body('rating').optional().isIn(['Hot', 'Warm', 'Cold']),
    body('annual_revenue').optional().isNumeric(),
    body('employees').optional().isInt({ min: 0 }),
    body('industry').optional().trim().isLength({ max: 100 }),
    body('title').optional().trim().isLength({ max: 100 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.createLead(req, res);
    } catch (error) {
        logger.error('Error creating lead', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create lead'
        });
    }
});

/**
 * PUT /api/crm/leads/:id
 * Actualizar lead existente
 */
router.put('/leads/:id', [
    authenticate,
    param('id').isUUID(),
    body('first_name').optional().trim().isLength({ min: 2, max: 50 }),
    body('last_name').optional().trim().isLength({ min: 2, max: 50 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('status').optional().isIn([
        'new', 'contacted', 'qualified', 'proposal', 
        'negotiation', 'closed_won', 'closed_lost'
    ]),
    body('rating').optional().isIn(['Hot', 'Warm', 'Cold']),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.updateLead(req, res);
    } catch (error) {
        logger.error('Error updating lead', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update lead'
        });
    }
});

/**
 * POST /api/crm/leads/:id/convert
 * Convertir lead a contacto/oportunidad/cuenta
 */
router.post('/leads/:id/convert', [
    authenticate,
    param('id').isUUID(),
    body('create_contact').optional().isBoolean(),
    body('create_account').optional().isBoolean(),
    body('create_opportunity').optional().isBoolean(),
    body('opportunity_name').optional().trim().isLength({ min: 2, max: 200 }),
    body('opportunity_amount').optional().isNumeric(),
    body('opportunity_close_date').optional().isISO8601(),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.convertLead(req, res);
    } catch (error) {
        logger.error('Error converting lead', error);
        res.status(500).json({
            success: false,
            message: 'Failed to convert lead'
        });
    }
});

// ===== OPPORTUNITIES MANAGEMENT =====

/**
 * GET /api/crm/opportunities
 * Gestión de oportunidades de venta
 */
router.get('/opportunities', [
    authenticate,
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sales_stage').optional().isIn([
        'prospecting', 'qualification', 'needs_analysis', 
        'proposal', 'negotiation', 'closed_won', 'closed_lost'
    ]),
    query('min_amount').optional().isNumeric(),
    query('max_amount').optional().isNumeric(),
    query('probability_min').optional().isInt({ min: 0, max: 100 }),
    query('probability_max').optional().isInt({ min: 0, max: 100 }),
    query('expected_close_start').optional().isISO8601(),
    query('expected_close_end').optional().isISO8601(),
    query('assigned_user_id').optional().isUUID(),
    query('account_id').optional().isUUID(),
    query('search').optional().isString().trim(),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.getOpportunities(req, res);
    } catch (error) {
        logger.error('Error fetching opportunities', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch opportunities'
        });
    }
});

/**
 * POST /api/crm/opportunities
 * Crear nueva oportunidad
 */
router.post('/opportunities', [
    authenticate,
    body('name').notEmpty().trim().isLength({ min: 2, max: 200 }),
    body('account_id').optional().isUUID(),
    body('contact_id').optional().isUUID(),
    body('lead_id').optional().isUUID(),
    body('sales_stage').optional().isIn([
        'prospecting', 'qualification', 'needs_analysis', 
        'proposal', 'negotiation', 'closed_won', 'closed_lost'
    ]),
    body('amount').optional().isNumeric(),
    body('probability').optional().isInt({ min: 0, max: 100 }),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('expected_close_date').optional().isISO8601(),
    body('lead_source').optional().trim().isLength({ max: 100 }),
    body('opportunity_type').optional().trim().isLength({ max: 100 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.createOpportunity(req, res);
    } catch (error) {
        logger.error('Error creating opportunity', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create opportunity'
        });
    }
});

// ===== ACCOUNTS MANAGEMENT =====

/**
 * GET /api/crm/accounts
 * Gestión de cuentas empresariales
 */
router.get('/accounts', [
    authenticate,
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('account_type').optional().trim(),
    query('industry').optional().trim(),
    query('min_revenue').optional().isNumeric(),
    query('max_revenue').optional().isNumeric(),
    query('min_employees').optional().isInt({ min: 0 }),
    query('max_employees').optional().isInt({ min: 0 }),
    query('assigned_user_id').optional().isUUID(),
    query('search').optional().isString().trim(),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.getAccounts(req, res);
    } catch (error) {
        logger.error('Error fetching accounts', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch accounts'
        });
    }
});

/**
 * POST /api/crm/accounts
 * Crear nueva cuenta empresarial
 */
router.post('/accounts', [
    authenticate,
    body('name').notEmpty().trim().isLength({ min: 2, max: 200 }),
    body('account_type').optional().trim().isLength({ max: 100 }),
    body('industry').optional().trim().isLength({ max: 100 }),
    body('phone_office').optional().trim().isLength({ max: 50 }),
    body('phone_fax').optional().trim().isLength({ max: 50 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('website').optional().isURL(),
    body('annual_revenue').optional().isNumeric(),
    body('employees').optional().isInt({ min: 0 }),
    body('rating').optional().trim().isLength({ max: 50 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    // Direcciones
    body('billing_address_street').optional().trim().isLength({ max: 255 }),
    body('billing_address_city').optional().trim().isLength({ max: 100 }),
    body('billing_address_state').optional().trim().isLength({ max: 100 }),
    body('billing_address_country').optional().trim().isLength({ max: 100 }),
    body('billing_address_postalcode').optional().trim().isLength({ max: 20 }),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.createAccount(req, res);
    } catch (error) {
        logger.error('Error creating account', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create account'
        });
    }
});

// ===== SYNC & WEBHOOKS =====

/**
 * GET /api/crm/sync/history
 * Historial de sincronizaciones
 */
router.get('/sync/history', [
    authenticate,
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('entity_type').optional().isIn(['contact', 'lead', 'opportunity', 'account']),
    query('status').optional().isIn(['pending', 'in_progress', 'success', 'failed', 'partial', 'skipped']),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.getSyncHistory(req, res);
    } catch (error) {
        logger.error('Error fetching sync history', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sync history'
        });
    }
});

/**
 * POST /api/crm/sync/incremental
 * Iniciar sincronización incremental
 */
router.post('/sync/incremental',
    authenticate,
    async (req, res) => {
        try {
            await CRMController.performIncrementalSync(req, res);
        } catch (error) {
            logger.error('Error starting incremental sync', error);
            res.status(500).json({
                success: false,
                message: 'Failed to start incremental sync'
            });
        }
    }
);

/**
 * POST /api/crm/sync/full
 * Iniciar sincronización completa
 */
router.post('/sync/full',
    authenticate,
    async (req, res) => {
        try {
            await CRMController.performFullSync(req, res);
        } catch (error) {
            logger.error('Error starting full sync', error);
            res.status(500).json({
                success: false,
                message: 'Failed to start full sync'
            });
        }
    }
);

// ===== ACTIVITIES & AUDIT =====

/**
 * GET /api/crm/activities
 * Obtener actividades CRM con filtros
 */
router.get('/activities', [
    authenticate,
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('entity_type').optional().isIn(['contact', 'lead', 'opportunity', 'account']),
    query('entity_id').optional().isUUID(),
    query('activity_type').optional().isIn([
        'create', 'update', 'delete', 'view', 'sync', 'export', 
        'import', 'email_sent', 'call_made', 'meeting_scheduled'
    ]),
    query('user_id').optional().isInt(),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.getActivities(req, res);
    } catch (error) {
        logger.error('Error fetching activities', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activities'
        });
    }
});

/**
 * POST /api/crm/activities
 * Registrar nueva actividad CRM
 */
router.post('/activities', [
    authenticate,
    body('entity_type').notEmpty().isIn(['contact', 'lead', 'opportunity', 'account']),
    body('entity_id').notEmpty().isUUID(),
    body('activity_type').notEmpty().isIn([
        'create', 'update', 'delete', 'view', 'sync', 'export', 
        'import', 'email_sent', 'call_made', 'meeting_scheduled'
    ]),
    body('activity_title').notEmpty().trim().isLength({ min: 2, max: 500 }),
    body('activity_description').optional().trim().isLength({ max: 1000 }),
    body('activity_data').optional().isObject(),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.createActivity(req, res);
    } catch (error) {
        logger.error('Error creating activity', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create activity'
        });
    }
});

// ===== WEBHOOKS MANAGEMENT =====

/**
 * GET /api/crm/webhooks
 * Gestión de webhooks CRM
 */
router.get('/webhooks',
    authenticate,
    async (req, res) => {
        try {
            await CRMController.getWebhooks(req, res);
        } catch (error) {
            logger.error('Error fetching webhooks', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch webhooks'
            });
        }
    }
);

/**
 * POST /api/crm/webhooks
 * Crear nuevo webhook
 */
router.post('/webhooks', [
    authenticate,
    body('name').notEmpty().trim().isLength({ min: 2, max: 255 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('entity_type').notEmpty().isIn(['contact', 'lead', 'opportunity', 'account']),
    body('event_types').isArray().withMessage('Event types must be an array'),
    body('endpoint_url').isURL().withMessage('Valid endpoint URL required'),
    body('auth_type').optional().isIn(['bearer', 'basic', 'oauth2']),
    body('is_active').optional().isBoolean(),
    body('is_bidirectional').optional().isBoolean(),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.createWebhook(req, res);
    } catch (error) {
        logger.error('Error creating webhook', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create webhook'
        });
    }
});

// ===== REPORTS & ANALYTICS =====

/**
 * GET /api/crm/reports/summary
 * Reporte resumen CRM
 */
router.get('/reports/summary', [
    authenticate,
    crmReportsLimiter,
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('entity_type').optional().isIn(['contact', 'lead', 'opportunity', 'account']),
    query('group_by').optional().isIn(['day', 'week', 'month', 'quarter', 'year']),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.getReportsSummary(req, res);
    } catch (error) {
        logger.error('Error generating reports summary', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate reports summary'
        });
    }
});

/**
 * GET /api/crm/reports/conversion
 * Reporte de conversión de leads
 */
router.get('/reports/conversion', [
    authenticate,
    crmReportsLimiter,
    query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('lead_source').optional().trim(),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.getConversionReport(req, res);
    } catch (error) {
        logger.error('Error generating conversion report', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate conversion report'
        });
    }
});

/**
 * GET /api/crm/reports/pipeline
 * Reporte de pipeline de ventas
 */
router.get('/reports/pipeline',
    authenticate,
    crmReportsLimiter,
    async (req, res) => {
        try {
            await CRMController.getPipelineReport(req, res);
        } catch (error) {
            logger.error('Error generating pipeline report', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate pipeline report'
            });
        }
    }
);

// ===== DATA EXPORT =====

/**
 * GET /api/crm/export/:entity
 * Exportar datos CRM en varios formatos
 */
router.get('/export/:entity', [
    authenticate,
    param('entity').isIn(['contacts', 'leads', 'opportunities', 'accounts']),
    query('format').optional().isIn(['csv', 'xlsx', 'json']),
    query('start_date').optional().isISO8601(),
    query('end_date').optional().isISO8601(),
    query('fields').optional().isArray(),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.exportData(req, res);
    } catch (error) {
        logger.error('Error exporting data', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export data'
        });
    }
});

// ===== CONFIGURATION =====

/**
 * GET /api/crm/config
 * Obtener configuración CRM
 */
router.get('/config',
    authenticate,
    async (req, res) => {
        try {
            await CRMController.getCRMConfig(req, res);
        } catch (error) {
            logger.error('Error fetching CRM config', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch CRM configuration'
            });
        }
    }
);

/**
 * PUT /api/crm/config
 * Actualizar configuración CRM
 */
router.put('/config', [
    authenticate,
    body('sync_interval_contacts').optional().isInt({ min: 1, max: 1440 }),
    body('sync_interval_leads').optional().isInt({ min: 1, max: 1440 }),
    body('sync_interval_opportunities').optional().isInt({ min: 1, max: 1440 }),
    body('sync_interval_accounts').optional().isInt({ min: 1, max: 1440 }),
    body('enable_webhooks').optional().isBoolean(),
    body('enable_real_time_sync').optional().isBoolean(),
    body('suitecrm_api_timeout').optional().isInt({ min: 10, max: 300 }),
    handleValidationErrors
], async (req, res) => {
    try {
        await CRMController.updateCRMConfig(req, res);
    } catch (error) {
        logger.error('Error updating CRM config', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update CRM configuration'
        });
    }
});

// Error handling middleware
router.use((error, req, res, next) => {
    logger.error('CRM Routes Error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.id
    });

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

module.exports = router;