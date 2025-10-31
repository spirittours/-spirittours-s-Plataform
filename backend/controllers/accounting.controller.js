/**
 * Spirit Tours - Accounting Controller
 * 
 * HTTP request handlers for accounting operations:
 * - CXC (Accounts Receivable) CRUD and payment processing
 * - CXP (Accounts Payable) CRUD, authorization, and payment execution
 * - Refund creation and authorization
 * - Commission calculation
 * - Dashboard data retrieval
 * - Alerts management
 * 
 * @module accounting.controller
 */

const AccountingService = require('../services/accounting.service');
const logger = require('../utils/logger');
const { body, param, query, validationResult } = require('express-validator');

class AccountingController {
  constructor(pool) {
    if (!pool) {
      throw new Error('Database pool is required');
    }
    this.accountingService = new AccountingService(pool);
  }

  // ========================================
  // ACCOUNTS RECEIVABLE (CXC) ENDPOINTS
  // ========================================

  /**
   * GET /api/accounting/cxc
   * Get list of CXC with filters
   */
  getCXC = async (req, res) => {
    try {
      const filters = {
        sucursal_id: req.query.sucursal_id,
        status: req.query.status,
        overdue_only: req.query.overdue_only === 'true',
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const result = await this.accountingService.getCXC(filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in getCXC controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error retrieving CXC',
        message: error.message
      });
    }
  };

  /**
   * POST /api/accounting/cxc
   * Create new CXC
   */
  createCXC = async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const cxcData = {
        ...req.body,
        usuario_id: req.user.id // From auth middleware
      };

      const cxc = await this.accountingService.createCXC(cxcData);

      res.status(201).json({
        success: true,
        data: cxc,
        message: `CXC ${cxc.folio} created successfully`
      });
    } catch (error) {
      logger.error('Error in createCXC controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error creating CXC',
        message: error.message
      });
    }
  };

  /**
   * GET /api/accounting/cxc/:id
   * Get CXC details by ID
   */
  getCXCById = async (req, res) => {
    try {
      const { id } = req.params;

      const result = await this.accountingService.getCXC({ cxc_id: id });

      if (result.cxc.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'CXC not found'
        });
      }

      res.json({
        success: true,
        data: result.cxc[0]
      });
    } catch (error) {
      logger.error('Error in getCXCById controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error retrieving CXC',
        message: error.message
      });
    }
  };

  /**
   * POST /api/accounting/cxc/:id/payment
   * Register payment for CXC
   */
  registerPayment = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const paymentData = {
        ...req.body,
        usuario_id: req.user.id
      };

      const result = await this.accountingService.registerPaymentReceived(id, paymentData);

      res.json({
        success: true,
        data: result,
        message: `Payment ${result.payment.folio} registered successfully`
      });
    } catch (error) {
      logger.error('Error in registerPayment controller:', error);
      
      // Duplicate payment error
      if (error.message.includes('Duplicate payment')) {
        return res.status(409).json({
          success: false,
          error: 'Duplicate payment detected',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error registering payment',
        message: error.message
      });
    }
  };

  // ========================================
  // ACCOUNTS PAYABLE (CXP) ENDPOINTS
  // ========================================

  /**
   * GET /api/accounting/cxp
   * Get list of CXP with filters
   */
  getCXP = async (req, res) => {
    try {
      const filters = {
        sucursal_id: req.query.sucursal_id,
        status: req.query.status,
        requiere_autorizacion: req.query.requiere_autorizacion === 'true',
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      // Note: This would use a similar getCXP method in the service (to be added)
      // For now, returning structure
      res.json({
        success: true,
        data: {
          cxp: [],
          total: 0,
          page: filters.page,
          pages: 0
        },
        message: 'CXP endpoint - implementation pending'
      });
    } catch (error) {
      logger.error('Error in getCXP controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error retrieving CXP',
        message: error.message
      });
    }
  };

  /**
   * POST /api/accounting/cxp
   * Create new CXP
   */
  createCXP = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const cxpData = {
        ...req.body,
        usuario_id: req.user.id
      };

      const cxp = await this.accountingService.createCXP(cxpData);

      res.status(201).json({
        success: true,
        data: cxp,
        message: `CXP ${cxp.folio} created successfully`
      });
    } catch (error) {
      logger.error('Error in createCXP controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error creating CXP',
        message: error.message
      });
    }
  };

  /**
   * POST /api/accounting/cxp/:id/authorize
   * Authorize CXP for payment
   */
  authorizeCXP = async (req, res) => {
    try {
      const { id } = req.params;
      const { comentario } = req.body;
      const usuario_id = req.user.id;

      const cxp = await this.accountingService.authorizeCXP(id, usuario_id, comentario);

      res.json({
        success: true,
        data: cxp,
        message: `CXP ${cxp.folio} authorized successfully`
      });
    } catch (error) {
      logger.error('Error in authorizeCXP controller:', error);

      // Authorization level error
      if (error.message.includes('authorization limit')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient authorization level',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error authorizing CXP',
        message: error.message
      });
    }
  };

  /**
   * POST /api/accounting/cxp/:id/pay
   * Execute payment for authorized CXP
   */
  payCXP = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const paymentData = {
        ...req.body,
        usuario_id: req.user.id
      };

      const result = await this.accountingService.executePayment(id, paymentData);

      res.json({
        success: true,
        data: result,
        message: `Payment ${result.payment.folio} executed successfully`
      });
    } catch (error) {
      logger.error('Error in payCXP controller:', error);

      // Authorization required error
      if (error.message.includes('requires authorization')) {
        return res.status(403).json({
          success: false,
          error: 'Authorization required',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error executing payment',
        message: error.message
      });
    }
  };

  // ========================================
  // REFUNDS ENDPOINTS
  // ========================================

  /**
   * POST /api/accounting/refunds
   * Create refund for cancelled trip
   */
  createRefund = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const refundData = {
        ...req.body,
        usuario_id: req.user.id
      };

      const refund = await this.accountingService.createRefund(refundData);

      res.status(201).json({
        success: true,
        data: refund,
        message: `Refund ${refund.folio} created successfully. Refund amount: $${refund.monto_reembolso.toFixed(2)} (${refund.porcentaje_reembolsado}%)`
      });
    } catch (error) {
      logger.error('Error in createRefund controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error creating refund',
        message: error.message
      });
    }
  };

  /**
   * POST /api/accounting/refunds/:id/authorize
   * Authorize refund
   */
  authorizeRefund = async (req, res) => {
    try {
      const { id } = req.params;
      const { comentario } = req.body;
      const usuario_id = req.user.id;

      // This would use a similar authorizeRefund method in the service (to be added)
      res.json({
        success: true,
        message: 'Refund authorization endpoint - implementation pending'
      });
    } catch (error) {
      logger.error('Error in authorizeRefund controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error authorizing refund',
        message: error.message
      });
    }
  };

  /**
   * GET /api/accounting/refunds/calculate
   * Calculate refund amount based on cancellation policy
   */
  calculateRefund = async (req, res) => {
    try {
      const { days_until_departure, paid_amount } = req.query;

      if (!days_until_departure || !paid_amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: days_until_departure, paid_amount'
        });
      }

      const days = parseInt(days_until_departure);
      const amount = parseFloat(paid_amount);

      const refundCalculation = this.accountingService.calculateRefundAmount(days, amount);

      res.json({
        success: true,
        data: refundCalculation
      });
    } catch (error) {
      logger.error('Error in calculateRefund controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error calculating refund',
        message: error.message
      });
    }
  };

  // ========================================
  // COMMISSIONS ENDPOINTS
  // ========================================

  /**
   * POST /api/accounting/commissions
   * Create commissions for a tour
   */
  createCommissions = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const commissions = await this.accountingService.createCommissions(req.body);

      res.status(201).json({
        success: true,
        data: commissions,
        message: `${commissions.length} commission(s) created successfully`
      });
    } catch (error) {
      logger.error('Error in createCommissions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error creating commissions',
        message: error.message
      });
    }
  };

  // ========================================
  // DASHBOARD & REPORTS ENDPOINTS
  // ========================================

  /**
   * GET /api/accounting/dashboard/:sucursalId
   * Get manager dashboard data
   */
  getDashboard = async (req, res) => {
    try {
      const { sucursalId } = req.params;

      // Check if user has access to this branch
      if (req.user.role !== 'director' && req.user.sucursal_id !== sucursalId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this branch dashboard'
        });
      }

      const dashboard = await this.accountingService.getManagerDashboard(sucursalId);

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      logger.error('Error in getDashboard controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error retrieving dashboard',
        message: error.message
      });
    }
  };

  /**
   * GET /api/accounting/dashboard/director
   * Get consolidated director dashboard (all branches)
   */
  getDirectorDashboard = async (req, res) => {
    try {
      // Only directors can access
      if (req.user.role !== 'director') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Director role required'
        });
      }

      // This would aggregate data from all branches
      res.json({
        success: true,
        data: {},
        message: 'Director dashboard endpoint - implementation pending'
      });
    } catch (error) {
      logger.error('Error in getDirectorDashboard controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error retrieving director dashboard',
        message: error.message
      });
    }
  };

  /**
   * GET /api/accounting/reports/aging
   * Get aging report (overdue accounts)
   */
  getAgingReport = async (req, res) => {
    try {
      const { sucursal_id, tipo } = req.query; // tipo: 'cxc' or 'cxp'

      // This would generate aging analysis
      res.json({
        success: true,
        data: {},
        message: 'Aging report endpoint - implementation pending'
      });
    } catch (error) {
      logger.error('Error in getAgingReport controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error generating aging report',
        message: error.message
      });
    }
  };

  /**
   * GET /api/accounting/reports/profit-loss
   * Get profit & loss report
   */
  getProfitLossReport = async (req, res) => {
    try {
      const { sucursal_id, fecha_desde, fecha_hasta } = req.query;

      // This would generate P&L statement
      res.json({
        success: true,
        data: {},
        message: 'Profit & Loss report endpoint - implementation pending'
      });
    } catch (error) {
      logger.error('Error in getProfitLossReport controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error generating P&L report',
        message: error.message
      });
    }
  };

  // ========================================
  // ALERTS ENDPOINTS
  // ========================================

  /**
   * GET /api/accounting/alerts
   * Get system alerts
   */
  getAlerts = async (req, res) => {
    try {
      const { sucursal_id, gravedad, resuelta } = req.query;

      // This would fetch alerts from the database
      res.json({
        success: true,
        data: [],
        message: 'Alerts endpoint - implementation pending'
      });
    } catch (error) {
      logger.error('Error in getAlerts controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error retrieving alerts',
        message: error.message
      });
    }
  };

  /**
   * PUT /api/accounting/alerts/:id/resolve
   * Mark alert as resolved
   */
  resolveAlert = async (req, res) => {
    try {
      const { id } = req.params;
      const { comentario } = req.body;

      // This would update alert status
      res.json({
        success: true,
        message: 'Alert resolution endpoint - implementation pending'
      });
    } catch (error) {
      logger.error('Error in resolveAlert controller:', error);
      res.status(500).json({
        success: false,
        error: 'Error resolving alert',
        message: error.message
      });
    }
  };
}

// ========================================
// VALIDATION MIDDLEWARE
// ========================================

const validateCreateCXC = [
  body('sucursal_id').isUUID().withMessage('Valid branch ID required'),
  body('monto_total').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('fecha_vencimiento').isISO8601().withMessage('Valid due date required'),
  body('trip_id').optional().isUUID().withMessage('Valid trip ID required'),
  body('customer_id').optional().isUUID().withMessage('Valid customer ID required'),
  body('tipo').optional().isIn(['cliente', 'proveedor', 'transferencia_interna']).withMessage('Invalid type')
];

const validateRegisterPayment = [
  body('monto').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('metodo_pago').notEmpty().withMessage('Payment method required'),
  body('referencia').optional().isString(),
  body('comision_bancaria').optional().isFloat({ min: 0 })
];

const validateCreateCXP = [
  body('sucursal_id').isUUID().withMessage('Valid branch ID required'),
  body('monto_total').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('fecha_vencimiento').isISO8601().withMessage('Valid due date required'),
  body('concepto').notEmpty().withMessage('Concept/description required'),
  body('proveedor_id').optional().isUUID().withMessage('Valid provider ID required'),
  body('tipo').optional().isIn(['proveedor', 'transferencia_interna', 'gasto']).withMessage('Invalid type')
];

const validateCreateRefund = [
  body('trip_id').isUUID().withMessage('Valid trip ID required'),
  body('customer_id').isUUID().withMessage('Valid customer ID required'),
  body('sucursal_id').isUUID().withMessage('Valid branch ID required'),
  body('monto_pagado').isFloat({ min: 0.01 }).withMessage('Paid amount must be greater than 0'),
  body('fecha_viaje').isISO8601().withMessage('Valid trip date required'),
  body('motivo').optional().isString()
];

const validateCreateCommissions = [
  body('trip_id').isUUID().withMessage('Valid trip ID required'),
  body('sucursal_venta').isUUID().withMessage('Valid sales branch ID required'),
  body('sucursal_operacion').isUUID().withMessage('Valid operations branch ID required'),
  body('monto_venta').isFloat({ min: 0.01 }).withMessage('Sale amount must be greater than 0'),
  body('vendedor_id').optional().isUUID().withMessage('Valid salesperson ID required'),
  body('guia_id').optional().isUUID().withMessage('Valid guide ID required')
];

module.exports = {
  AccountingController,
  validateCreateCXC,
  validateRegisterPayment,
  validateCreateCXP,
  validateCreateRefund,
  validateCreateCommissions
};
