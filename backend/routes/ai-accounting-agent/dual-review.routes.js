/**
 * Dual Review System - API Routes
 * 
 * Endpoints para gestionar el sistema de revisión dual AI + Humano
 * 
 * @module DualReviewRoutes
 */

const express = require('express');
const router = express.Router();
const DualReviewSystem = require('../../services/ai-accounting-agent/dual-review-system');
const { authenticate, authorize } = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');
const logger = require('../../utils/logger');

const dualReview = new DualReviewSystem();

/**
 * 🔴 GET /api/ai-agent/dual-review/config
 * Obtener configuración actual de revisión dual
 */
router.get('/config',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { organizationId, branchId, country } = req.query;
      
      if (!organizationId || !country) {
        return res.status(400).json({
          success: false,
          error: 'organizationId y country son requeridos'
        });
      }
      
      const config = await dualReview.getCurrentConfig(
        organizationId,
        branchId || null,
        country
      );
      
      res.json({
        success: true,
        data: config
      });
      
    } catch (error) {
      logger.error('Error al obtener configuración de revisión dual:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * 🔴 PUT /api/ai-agent/dual-review/config
 * Actualizar configuración de revisión dual
 */
router.put('/config',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { organizationId, branchId, country, updates } = req.body;
      
      if (!organizationId || !country || !updates) {
        return res.status(400).json({
          success: false,
          error: 'organizationId, country y updates son requeridos'
        });
      }
      
      const config = await dualReview.updateConfig(
        organizationId,
        branchId || null,
        country,
        updates,
        req.user.id
      );
      
      res.json({
        success: true,
        data: config,
        message: 'Configuración actualizada exitosamente'
      });
      
    } catch (error) {
      logger.error('Error al actualizar configuración:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * 🔴 POST /api/ai-agent/dual-review/toggle
 * Toggle procesamiento automático ON/OFF
 */
router.post('/toggle',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { organizationId, branchId, country, enabled } = req.body;
      
      if (!organizationId || !country || enabled === undefined) {
        return res.status(400).json({
          success: false,
          error: 'organizationId, country y enabled son requeridos'
        });
      }
      
      const config = await dualReview.toggleAutoProcessing(
        organizationId,
        branchId || null,
        country,
        enabled,
        req.user.id
      );
      
      res.json({
        success: true,
        data: config,
        message: enabled 
          ? 'Procesamiento automático ACTIVADO' 
          : 'Procesamiento automático DESACTIVADO - Todas las transacciones requerirán revisión humana'
      });
      
    } catch (error) {
      logger.error('Error al cambiar toggle de procesamiento automático:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/dual-review/queue
 * Obtener cola de revisiones pendientes
 */
router.get('/queue',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { organizationId, assignedTo, priority, branchId, limit } = req.query;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'organizationId es requerido'
        });
      }
      
      const filters = {
        assignedTo,
        priority,
        branchId,
        limit: parseInt(limit) || 100
      };
      
      const reviews = await dualReview.getPendingReviews(organizationId, filters);
      
      res.json({
        success: true,
        data: reviews,
        count: reviews.length
      });
      
    } catch (error) {
      logger.error('Error al obtener cola de revisiones:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/dual-review/approve
 * Aprobar transacción
 */
router.post('/approve',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { queueItemId, decision } = req.body;
      
      if (!queueItemId || !decision) {
        return res.status(400).json({
          success: false,
          error: 'queueItemId y decision son requeridos'
        });
      }
      
      const result = await dualReview.approveTransaction(
        queueItemId,
        req.user.id,
        decision
      );
      
      res.json({
        success: true,
        data: result,
        message: result.secondApprovalRequired 
          ? 'Transacción aprobada - Requiere segunda aprobación'
          : 'Transacción aprobada exitosamente'
      });
      
    } catch (error) {
      logger.error('Error al aprobar transacción:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/dual-review/reject
 * Rechazar transacción
 */
router.post('/reject',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { queueItemId, decision } = req.body;
      
      if (!queueItemId || !decision || !decision.reason) {
        return res.status(400).json({
          success: false,
          error: 'queueItemId, decision y decision.reason son requeridos'
        });
      }
      
      const result = await dualReview.rejectTransaction(
        queueItemId,
        req.user.id,
        decision
      );
      
      res.json({
        success: true,
        data: result,
        message: 'Transacción rechazada'
      });
      
    } catch (error) {
      logger.error('Error al rechazar transacción:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/dual-review/statistics
 * Obtener estadísticas de revisión
 */
router.get('/statistics',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { organizationId, startDate, endDate } = req.query;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'organizationId es requerido'
        });
      }
      
      const dateRange = {};
      if (startDate) dateRange.start = startDate;
      if (endDate) dateRange.end = endDate;
      
      const stats = await dualReview.getStatistics(organizationId, dateRange);
      
      res.json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      logger.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/dual-review/evaluate
 * Evaluar si una transacción requiere revisión humana (usado por AI Agent Core)
 */
router.post('/evaluate',
  authenticate,
  async (req, res) => {
    try {
      const transaction = req.body;
      
      if (!transaction.organizationId || !transaction.country) {
        return res.status(400).json({
          success: false,
          error: 'organizationId y country son requeridos en la transacción'
        });
      }
      
      const result = await dualReview.requiresHumanReview(transaction);
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      logger.error('Error al evaluar transacción:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/dual-review/queue/:id
 * Obtener detalles de un item de la cola
 */
router.get('/queue/:id',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { ReviewQueue } = require('../../services/ai-accounting-agent/dual-review-system');
      const queueItem = await ReviewQueue.findById(req.params.id)
        .populate('assignedTo', 'name email role')
        .populate('reviewedBy', 'name email role')
        .lean();
      
      if (!queueItem) {
        return res.status(404).json({
          success: false,
          error: 'Item de revisión no encontrado'
        });
      }
      
      res.json({
        success: true,
        data: queueItem
      });
      
    } catch (error) {
      logger.error('Error al obtener item de cola:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
