/**
 * ERP Hub API Routes
 * 
 * Definición de rutas REST para la gestión de integraciones ERP.
 * 
 * @module routes/erp
 * @author Spirit Tours Dev Team - GenSpark AI Developer
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const ERPHubController = require('../controllers/erp-hub.controller');

// Inicializar pool de conexiones
const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Inicializar controlador
const erpController = new ERPHubController(dbPool);

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware de autenticación (placeholder)
 * En producción, implementar JWT o similar
 */
const authenticate = (req, res, next) => {
    // TODO: Implementar autenticación real
    // Por ahora, solo pasamos el usuario desde headers
    req.user = {
        id: req.headers['x-user-id'] || null,
        role: req.headers['x-user-role'] || 'user'
    };
    next();
};

/**
 * Middleware de validación de sucursal
 */
const validateSucursal = async (req, res, next) => {
    const sucursalId = req.params.sucursalId || req.body.sucursalId;
    
    if (!sucursalId) {
        return res.status(400).json({
            success: false,
            error: 'sucursalId is required'
        });
    }

    try {
        const result = await dbPool.query(
            'SELECT id, nombre, activa FROM sucursales WHERE id = $1',
            [sucursalId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Sucursal not found'
            });
        }

        if (!result.rows[0].activa) {
            return res.status(400).json({
                success: false,
                error: 'Sucursal is not active'
            });
        }

        req.sucursal = result.rows[0];
        next();
    } catch (error) {
        console.error('Sucursal validation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to validate sucursal'
        });
    }
};

// ============================================================================
// OAUTH ROUTES
// ============================================================================

/**
 * @route   POST /api/erp/oauth/authorize
 * @desc    Inicia el flujo OAuth 2.0
 * @access  Private
 * @body    { sucursalId, provider, redirectUri }
 */
router.post('/oauth/authorize', authenticate, (req, res) => {
    erpController.initiateOAuth(req, res);
});

/**
 * @route   GET /api/erp/oauth/callback
 * @desc    Callback OAuth 2.0 - Intercambia código por tokens
 * @access  Public
 * @query   { code, state, realmId }
 */
router.get('/oauth/callback', (req, res) => {
    erpController.handleOAuthCallback(req, res);
});

/**
 * @route   POST /api/erp/oauth/disconnect
 * @desc    Desconecta y revoca tokens OAuth
 * @access  Private
 * @body    { sucursalId }
 */
router.post('/oauth/disconnect', authenticate, validateSucursal, (req, res) => {
    erpController.disconnectOAuth(req, res);
});

// ============================================================================
// CONFIGURATION ROUTES
// ============================================================================

/**
 * @route   GET /api/erp/config/:sucursalId
 * @desc    Obtiene configuración ERP de una sucursal
 * @access  Private
 */
router.get('/config/:sucursalId', authenticate, validateSucursal, (req, res) => {
    erpController.getERPConfig(req, res);
});

/**
 * @route   POST /api/erp/config/:sucursalId
 * @desc    Guarda/actualiza configuración ERP
 * @access  Private
 * @body    { erpProvider, erpRegion, syncEnabled, syncFrequency, ... }
 */
router.post('/config/:sucursalId', authenticate, validateSucursal, (req, res) => {
    erpController.saveERPConfig(req, res);
});

/**
 * @route   POST /api/erp/test-connection/:sucursalId
 * @desc    Prueba conexión con ERP
 * @access  Private
 */
router.post('/test-connection/:sucursalId', authenticate, validateSucursal, (req, res) => {
    erpController.testConnection(req, res);
});

// ============================================================================
// SYNC ROUTES
// ============================================================================

/**
 * @route   POST /api/erp/sync/customer/:customerId
 * @desc    Sincroniza un cliente manualmente
 * @access  Private
 * @body    { sucursalId }
 */
router.post('/sync/customer/:customerId', authenticate, (req, res) => {
    erpController.syncCustomer(req, res);
});

/**
 * @route   POST /api/erp/sync/invoice/:cxcId
 * @desc    Sincroniza una factura manualmente
 * @access  Private
 * @body    { sucursalId }
 */
router.post('/sync/invoice/:cxcId', authenticate, (req, res) => {
    erpController.syncInvoice(req, res);
});

/**
 * @route   POST /api/erp/sync/payment/:pagoId
 * @desc    Sincroniza un pago manualmente
 * @access  Private
 * @body    { sucursalId }
 */
router.post('/sync/payment/:pagoId', authenticate, (req, res) => {
    erpController.syncPayment(req, res);
});

/**
 * @route   POST /api/erp/sync/batch
 * @desc    Sincroniza múltiples entidades en lote
 * @access  Private
 * @body    { sucursalId, entities: [{ type, id }] }
 */
router.post('/sync/batch', authenticate, (req, res) => {
    erpController.syncBatch(req, res);
});

/**
 * @route   POST /api/erp/sync/pending/:sucursalId
 * @desc    Sincroniza todas las entidades pendientes
 * @access  Private
 */
router.post('/sync/pending/:sucursalId', authenticate, validateSucursal, (req, res) => {
    erpController.syncPending(req, res);
});

/**
 * @route   GET /api/erp/sync/status/:sucursalId
 * @desc    Obtiene el estado de sincronización
 * @access  Private
 */
router.get('/sync/status/:sucursalId', authenticate, validateSucursal, (req, res) => {
    erpController.getSyncStatus(req, res);
});

/**
 * @route   GET /api/erp/sync/logs/:sucursalId
 * @desc    Obtiene logs de sincronización
 * @access  Private
 * @query   { limit, offset, status, entityType }
 */
router.get('/sync/logs/:sucursalId', authenticate, validateSucursal, (req, res) => {
    erpController.getSyncLogs(req, res);
});

// ============================================================================
// PROVIDER & ADAPTER ROUTES
// ============================================================================

/**
 * @route   GET /api/erp/providers
 * @desc    Lista proveedores ERP disponibles
 * @access  Public
 */
router.get('/providers', (req, res) => {
    erpController.getProviders(req, res);
});

/**
 * @route   GET /api/erp/adapters/:countryCode
 * @desc    Lista adapters disponibles por país
 * @access  Public
 * @param   {string} countryCode - Código ISO del país (US, MX, AE, ES, IL)
 */
router.get('/adapters/:countryCode', (req, res) => {
    erpController.getAdaptersByCountry(req, res);
});

// ============================================================================
// EXCHANGE RATES ROUTES
// ============================================================================

/**
 * @route   GET /api/erp/exchange-rate/:from/:to
 * @desc    Obtiene tipo de cambio actual
 * @access  Public
 * @param   {string} from - Código ISO de moneda origen (USD, MXN, etc.)
 * @param   {string} to - Código ISO de moneda destino
 * @query   { date } - Fecha opcional (YYYY-MM-DD)
 */
router.get('/exchange-rate/:from/:to', (req, res) => {
    erpController.getExchangeRate(req, res);
});

/**
 * @route   POST /api/erp/convert-currency
 * @desc    Convierte monto entre monedas
 * @access  Public
 * @body    { amount, from, to, date }
 */
router.post('/convert-currency', (req, res) => {
    erpController.convertCurrency(req, res);
});

/**
 * @route   POST /api/erp/exchange-rates/update
 * @desc    Actualiza tipos de cambio desde API externa
 * @access  Private (Admin only)
 */
router.post('/exchange-rates/update', authenticate, (req, res) => {
    // TODO: Validar que solo admin pueda ejecutar esto
    erpController.updateExchangeRates(req, res);
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * @route   GET /api/erp/health
 * @desc    Health check del servicio ERP Hub
 * @access  Public
 */
router.get('/health', async (req, res) => {
    try {
        // Verificar conexión a base de datos
        await dbPool.query('SELECT 1');
        
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                erpHub: 'operational'
            }
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

/**
 * Manejo global de errores para rutas ERP
 */
router.use((error, req, res, next) => {
    console.error('ERP Route Error:', error);
    
    res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

module.exports = router;
