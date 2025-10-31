/**
 * Spirit Tours - Accounting Routes
 * 
 * REST API endpoints for multi-branch accounting system
 * 
 * Routes structure:
 * - /api/accounting/cxc/* - Accounts Receivable
 * - /api/accounting/cxp/* - Accounts Payable
 * - /api/accounting/refunds/* - Refunds management
 * - /api/accounting/commissions/* - Commission calculations
 * - /api/accounting/dashboard/* - Dashboard data
 * - /api/accounting/reports/* - Financial reports
 * - /api/accounting/alerts/* - System alerts
 * 
 * @module accounting.routes
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const {
  AccountingController,
  validateCreateCXC,
  validateRegisterPayment,
  validateCreateCXP,
  validateCreateRefund,
  validateCreateCommissions
} = require('../controllers/accounting.controller');

// Middleware imports (assuming these exist in the project)
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');

// Initialize database pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize controller
const accountingController = new AccountingController(pool);

// ========================================
// ACCOUNTS RECEIVABLE (CXC) ROUTES
// ========================================

/**
 * @route   GET /api/accounting/cxc
 * @desc    Get list of CXC with filters
 * @access  Private (gerente, director, contador)
 * @query   sucursal_id, status, overdue_only, fecha_desde, fecha_hasta, page, limit
 */
router.get(
  '/cxc',
  authMiddleware,
  roleMiddleware(['gerente', 'director', 'contador']),
  accountingController.getCXC
);

/**
 * @route   POST /api/accounting/cxc
 * @desc    Create new CXC
 * @access  Private (gerente, director, contador)
 * @body    { trip_id, customer_id, sucursal_id, monto_total, fecha_vencimiento, tipo }
 */
router.post(
  '/cxc',
  authMiddleware,
  roleMiddleware(['gerente', 'director', 'contador']),
  validateCreateCXC,
  accountingController.createCXC
);

/**
 * @route   GET /api/accounting/cxc/:id
 * @desc    Get CXC details by ID
 * @access  Private (gerente, director, contador)
 */
router.get(
  '/cxc/:id',
  authMiddleware,
  roleMiddleware(['gerente', 'director', 'contador']),
  accountingController.getCXCById
);

/**
 * @route   POST /api/accounting/cxc/:id/payment
 * @desc    Register payment received for CXC
 * @access  Private (gerente, director, contador, cajero)
 * @body    { monto, metodo_pago, referencia, comision_bancaria }
 */
router.post(
  '/cxc/:id/payment',
  authMiddleware,
  roleMiddleware(['gerente', 'director', 'contador', 'cajero']),
  validateRegisterPayment,
  accountingController.registerPayment
);

// ========================================
// ACCOUNTS PAYABLE (CXP) ROUTES
// ========================================

/**
 * @route   GET /api/accounting/cxp
 * @desc    Get list of CXP with filters
 * @access  Private (gerente, director, contador)
 * @query   sucursal_id, status, requiere_autorizacion, page, limit
 */
router.get(
  '/cxp',
  authMiddleware,
  roleMiddleware(['gerente', 'director', 'contador']),
  accountingController.getCXP
);

/**
 * @route   POST /api/accounting/cxp
 * @desc    Create new CXP
 * @access  Private (gerente, director, contador)
 * @body    { proveedor_id, sucursal_id, monto_total, fecha_vencimiento, concepto, tipo }
 */
router.post(
  '/cxp',
  authMiddleware,
  roleMiddleware(['gerente', 'director', 'contador']),
  validateCreateCXP,
  accountingController.createCXP
);

/**
 * @route   POST /api/accounting/cxp/:id/authorize
 * @desc    Authorize CXP for payment
 * @access  Private (gerente, director)
 * @body    { comentario }
 */
router.post(
  '/cxp/:id/authorize',
  authMiddleware,
  roleMiddleware(['gerente', 'director']),
  accountingController.authorizeCXP
);

/**
 * @route   POST /api/accounting/cxp/:id/pay
 * @desc    Execute payment for authorized CXP
 * @access  Private (contador)
 * @body    { monto, metodo_pago, referencia }
 */
router.post(
  '/cxp/:id/pay',
  authMiddleware,
  roleMiddleware(['contador']),
  validateRegisterPayment,
  accountingController.payCXP
);

// ========================================
// REFUNDS ROUTES
// ========================================

/**
 * @route   POST /api/accounting/refunds
 * @desc    Create refund for cancelled trip (automatic calculation)
 * @access  Private (gerente, director)
 * @body    { trip_id, customer_id, sucursal_id, monto_pagado, fecha_viaje, motivo }
 */
router.post(
  '/refunds',
  authMiddleware,
  roleMiddleware(['gerente', 'director']),
  validateCreateRefund,
  accountingController.createRefund
);

/**
 * @route   POST /api/accounting/refunds/:id/authorize
 * @desc    Authorize refund
 * @access  Private (gerente, director)
 * @body    { comentario }
 */
router.post(
  '/refunds/:id/authorize',
  authMiddleware,
  roleMiddleware(['gerente', 'director']),
  accountingController.authorizeRefund
);

/**
 * @route   GET /api/accounting/refunds/calculate
 * @desc    Calculate refund amount based on cancellation policy
 * @access  Private (all authenticated users)
 * @query   days_until_departure, paid_amount
 */
router.get(
  '/refunds/calculate',
  authMiddleware,
  accountingController.calculateRefund
);

// ========================================
// COMMISSIONS ROUTES
// ========================================

/**
 * @route   POST /api/accounting/commissions
 * @desc    Create commissions for a tour
 * @access  Private (gerente, director, contador)
 * @body    { trip_id, sucursal_venta, sucursal_operacion, monto_venta, vendedor_id, guia_id }
 */
router.post(
  '/commissions',
  authMiddleware,
  roleMiddleware(['gerente', 'director', 'contador']),
  validateCreateCommissions,
  accountingController.createCommissions
);

// ========================================
// DASHBOARD & REPORTS ROUTES
// ========================================

/**
 * @route   GET /api/accounting/dashboard/:sucursalId
 * @desc    Get manager dashboard data for a specific branch
 * @access  Private (gerente, director)
 */
router.get(
  '/dashboard/:sucursalId',
  authMiddleware,
  roleMiddleware(['gerente', 'director']),
  accountingController.getDashboard
);

/**
 * @route   GET /api/accounting/dashboard/director
 * @desc    Get consolidated director dashboard (all branches)
 * @access  Private (director only)
 */
router.get(
  '/dashboard/director',
  authMiddleware,
  roleMiddleware(['director']),
  accountingController.getDirectorDashboard
);

/**
 * @route   GET /api/accounting/reports/aging
 * @desc    Get aging report (overdue accounts)
 * @access  Private (gerente, director, contador)
 * @query   sucursal_id, tipo (cxc/cxp)
 */
router.get(
  '/reports/aging',
  authMiddleware,
  roleMiddleware(['gerente', 'director', 'contador']),
  accountingController.getAgingReport
);

/**
 * @route   GET /api/accounting/reports/profit-loss
 * @desc    Get profit & loss report
 * @access  Private (director, contador)
 * @query   sucursal_id, fecha_desde, fecha_hasta
 */
router.get(
  '/reports/profit-loss',
  authMiddleware,
  roleMiddleware(['director', 'contador']),
  accountingController.getProfitLossReport
);

// ========================================
// ALERTS ROUTES
// ========================================

/**
 * @route   GET /api/accounting/alerts
 * @desc    Get system alerts
 * @access  Private (gerente, director, contador)
 * @query   sucursal_id, gravedad, resuelta
 */
router.get(
  '/alerts',
  authMiddleware,
  roleMiddleware(['gerente', 'director', 'contador']),
  accountingController.getAlerts
);

/**
 * @route   PUT /api/accounting/alerts/:id/resolve
 * @desc    Mark alert as resolved
 * @access  Private (gerente, director)
 * @body    { comentario }
 */
router.put(
  '/alerts/:id/resolve',
  authMiddleware,
  roleMiddleware(['gerente', 'director']),
  accountingController.resolveAlert
);

// ========================================
// ERROR HANDLING
// ========================================

router.use((err, req, res, next) => {
  console.error('Accounting routes error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

module.exports = router;
