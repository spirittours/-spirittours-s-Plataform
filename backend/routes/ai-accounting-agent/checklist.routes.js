/**
 * Checklist Manager - API Routes
 * 
 * Endpoints para gestionar checklists contables con validación AI
 * 
 * @module ChecklistRoutes
 */

const express = require('express');
const router = express.Router();
const ChecklistManager = require('../../services/ai-accounting-agent/checklist-manager');
const { authenticate, authorize } = require('../../middleware/auth');
const logger = require('../../utils/logger');

const checklistManager = new ChecklistManager();

/**
 * GET /api/ai-agent/checklists/available
 * Listar todos los checklists disponibles
 */
router.get('/available',
  authenticate,
  async (req, res) => {
    try {
      const checklists = checklistManager.listAvailableChecklists();
      
      res.json({
        success: true,
        data: checklists,
        count: checklists.length
      });
      
    } catch (error) {
      logger.error('Error al listar checklists disponibles:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/checklists/definition/:type
 * Obtener definición de un checklist específico
 */
router.get('/definition/:type',
  authenticate,
  async (req, res) => {
    try {
      const { type } = req.params;
      const definition = checklistManager.getChecklistDefinition(type);
      
      res.json({
        success: true,
        data: definition
      });
      
    } catch (error) {
      logger.error('Error al obtener definición de checklist:', error);
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/checklists/start
 * Iniciar un nuevo checklist para una transacción
 */
router.post('/start',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { checklistType, transactionId, transactionType, organizationId, branchId } = req.body;
      
      if (!checklistType || !transactionId || !transactionType || !organizationId) {
        return res.status(400).json({
          success: false,
          error: 'checklistType, transactionId, transactionType y organizationId son requeridos'
        });
      }
      
      const execution = await checklistManager.startChecklist(
        checklistType,
        transactionId,
        transactionType,
        organizationId,
        branchId,
        req.user.id
      );
      
      res.json({
        success: true,
        data: execution,
        message: `Checklist ${checklistType} iniciado. Validaciones AI ejecutándose en background.`
      });
      
    } catch (error) {
      logger.error('Error al iniciar checklist:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/checklists/suggest
 * Sugerir checklist apropiado para una transacción
 */
router.post('/suggest',
  authenticate,
  async (req, res) => {
    try {
      const { transaction } = req.body;
      
      if (!transaction || !transaction.type) {
        return res.status(400).json({
          success: false,
          error: 'transaction con type es requerido'
        });
      }
      
      const suggestedType = checklistManager.suggestChecklist(transaction);
      
      if (!suggestedType) {
        return res.json({
          success: true,
          data: null,
          message: 'No se pudo sugerir un checklist para este tipo de transacción'
        });
      }
      
      const definition = checklistManager.getChecklistDefinition(suggestedType);
      
      res.json({
        success: true,
        data: {
          suggestedType,
          definition
        },
        message: `Checklist sugerido: ${definition.name}`
      });
      
    } catch (error) {
      logger.error('Error al sugerir checklist:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/checklists/execution/:id
 * Obtener detalles de una ejecución de checklist
 */
router.get('/execution/:id',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const execution = await checklistManager.getChecklistExecution(id);
      
      res.json({
        success: true,
        data: execution
      });
      
    } catch (error) {
      logger.error('Error al obtener ejecución de checklist:', error);
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/ai-agent/checklists/check-item
 * Marcar un item como completado/pendiente
 */
router.put('/check-item',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { executionId, itemId, checked, notes } = req.body;
      
      if (!executionId || itemId === undefined || checked === undefined) {
        return res.status(400).json({
          success: false,
          error: 'executionId, itemId y checked son requeridos'
        });
      }
      
      const execution = await checklistManager.checkItem(
        executionId,
        itemId,
        checked,
        notes,
        req.user.id
      );
      
      res.json({
        success: true,
        data: execution,
        message: checked ? 'Item marcado como completado' : 'Item desmarcado'
      });
      
    } catch (error) {
      logger.error('Error al marcar item:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/checklists/transaction/:transactionId
 * Obtener todos los checklists de una transacción
 */
router.get('/transaction/:transactionId',
  authenticate,
  async (req, res) => {
    try {
      const { transactionId } = req.params;
      const executions = await checklistManager.getChecklistsByTransaction(transactionId);
      
      res.json({
        success: true,
        data: executions,
        count: executions.length
      });
      
    } catch (error) {
      logger.error('Error al listar checklists por transacción:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/checklists/organization/:organizationId
 * Obtener checklists de una organización
 */
router.get('/organization/:organizationId',
  authenticate,
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { status, checklistType, branchId, limit } = req.query;
      
      const filters = {
        status,
        checklistType,
        branchId,
        limit: parseInt(limit) || 100
      };
      
      const executions = await checklistManager.getChecklistsByOrganization(
        organizationId,
        filters
      );
      
      res.json({
        success: true,
        data: executions,
        count: executions.length
      });
      
    } catch (error) {
      logger.error('Error al listar checklists por organización:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/checklists/statistics/:organizationId
 * Obtener estadísticas de checklists
 */
router.get('/statistics/:organizationId',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { startDate, endDate } = req.query;
      
      const dateRange = {};
      if (startDate) dateRange.start = startDate;
      if (endDate) dateRange.end = endDate;
      
      const stats = await checklistManager.getStatistics(organizationId, dateRange);
      
      res.json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      logger.error('Error al obtener estadísticas de checklists:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/checklists/validate-item
 * Ejecutar validación AI manual de un item específico
 */
router.post('/validate-item',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { executionId, itemId, transactionId } = req.body;
      
      if (!executionId || !itemId || !transactionId) {
        return res.status(400).json({
          success: false,
          error: 'executionId, itemId y transactionId son requeridos'
        });
      }
      
      const execution = await checklistManager.getChecklistExecution(executionId);
      const item = execution.items.find(i => i.itemId === itemId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          error: `Item ${itemId} no encontrado en checklist`
        });
      }
      
      // Obtener definición del item
      const definition = checklistManager.getChecklistDefinition(execution.checklistType);
      const itemDef = definition.items.find(d => d.id === itemId);
      
      // Obtener transacción
      const Transaction = require('mongoose').model('Transaction');
      const transaction = await Transaction.findById(transactionId)
        .populate('customer')
        .populate('vendor')
        .populate('lineItems');
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'Transacción no encontrada'
        });
      }
      
      // Ejecutar validación AI
      const result = await checklistManager.validateChecklistItem(itemDef, transaction);
      
      // Actualizar en base de datos
      const { ChecklistExecution } = require('../../services/ai-accounting-agent/checklist-manager');
      await ChecklistExecution.updateOne(
        { _id: executionId, 'items.itemId': itemId },
        { $set: { 'items.$.aiResult': result } }
      );
      
      res.json({
        success: true,
        data: result,
        message: 'Validación AI completada'
      });
      
    } catch (error) {
      logger.error('Error al validar item con AI:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
