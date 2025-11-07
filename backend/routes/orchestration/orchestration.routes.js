const express = require('express');
const router = express.Router();
const WorkflowOrchestrator = require('../../services/orchestration/WorkflowOrchestrator');
const { authenticate, requireRole } = require('../../middleware/auth');
const RateLimiter = require('../../middleware/rateLimiter');

// Rate limiters
const workflowLimiter = RateLimiter.createLimiter('workflow-execution', {
  windowMs: 60 * 1000,
  max: 10 // 10 workflows per minute
});

/**
 * @route   POST /api/orchestration/workflows/execute
 * @desc    Execute a workflow from template
 * @access  Private
 */
router.post(
  '/workflows/execute',
  authenticate,
  workflowLimiter,
  async (req, res) => {
    try {
      const { templateId, input } = req.body;

      if (!templateId) {
        return res.status(400).json({
          success: false,
          error: 'Template ID is required'
        });
      }

      if (!input || typeof input !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Input must be an object'
        });
      }

      const result = await WorkflowOrchestrator.executeWorkflow(templateId, input, {
        userId: req.user._id,
        workspace: req.user.workspace
      });

      res.json(result);

    } catch (error) {
      console.error('Workflow execution error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/orchestration/templates
 * @desc    Register a new workflow template
 * @access  Private (Admin only)
 */
router.post(
  '/templates',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const template = req.body;

      if (!template.id || !template.name || !template.tasks) {
        return res.status(400).json({
          success: false,
          error: 'Invalid template: missing required fields (id, name, tasks)'
        });
      }

      const templateId = WorkflowOrchestrator.registerWorkflowTemplate(template);

      res.status(201).json({
        success: true,
        message: 'Workflow template registered successfully',
        templateId
      });

    } catch (error) {
      console.error('Template registration error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/orchestration/templates
 * @desc    List available workflow templates
 * @access  Private
 */
router.get(
  '/templates',
  authenticate,
  async (req, res) => {
    try {
      const templates = WorkflowOrchestrator.listTemplates();

      res.json({
        success: true,
        templates,
        count: templates.length
      });

    } catch (error) {
      console.error('List templates error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/orchestration/workflows/:workflowId
 * @desc    Get workflow status
 * @access  Private
 */
router.get(
  '/workflows/:workflowId',
  authenticate,
  async (req, res) => {
    try {
      const { workflowId } = req.params;
      const status = WorkflowOrchestrator.getWorkflowStatus(workflowId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
      }

      res.json({
        success: true,
        workflow: status
      });

    } catch (error) {
      console.error('Get workflow status error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/orchestration/workflows/:workflowId/cancel
 * @desc    Cancel a running workflow
 * @access  Private
 */
router.post(
  '/workflows/:workflowId/cancel',
  authenticate,
  async (req, res) => {
    try {
      const { workflowId } = req.params;
      
      const cancelled = WorkflowOrchestrator.cancelWorkflow(workflowId);

      res.json({
        success: true,
        message: 'Workflow cancelled successfully',
        workflowId
      });

    } catch (error) {
      console.error('Cancel workflow error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/orchestration/stats
 * @desc    Get orchestration statistics
 * @access  Private
 */
router.get(
  '/stats',
  authenticate,
  async (req, res) => {
    try {
      const stats = WorkflowOrchestrator.getStats();

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('Get orchestration stats error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/orchestration/workflows/lead-qualification
 * @desc    Quick lead qualification workflow
 * @access  Private
 */
router.post(
  '/workflows/lead-qualification',
  authenticate,
  workflowLimiter,
  async (req, res) => {
    try {
      const { leadData } = req.body;

      if (!leadData) {
        return res.status(400).json({
          success: false,
          error: 'Lead data is required'
        });
      }

      const result = await WorkflowOrchestrator.executeWorkflow('lead-qualification', {
        leadData
      }, {
        userId: req.user._id,
        workspace: req.user.workspace
      });

      res.json(result);

    } catch (error) {
      console.error('Lead qualification workflow error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/orchestration/workflows/deal-analysis
 * @desc    Quick deal analysis workflow
 * @access  Private
 */
router.post(
  '/workflows/deal-analysis',
  authenticate,
  workflowLimiter,
  async (req, res) => {
    try {
      const { dealData } = req.body;

      if (!dealData) {
        return res.status(400).json({
          success: false,
          error: 'Deal data is required'
        });
      }

      const result = await WorkflowOrchestrator.executeWorkflow('deal-analysis', {
        dealData
      }, {
        userId: req.user._id,
        workspace: req.user.workspace
      });

      res.json(result);

    } catch (error) {
      console.error('Deal analysis workflow error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/orchestration/workflows/content-generation
 * @desc    Quick content generation workflow
 * @access  Private
 */
router.post(
  '/workflows/content-generation',
  authenticate,
  workflowLimiter,
  async (req, res) => {
    try {
      const { contentType, topic } = req.body;

      if (!contentType || !topic) {
        return res.status(400).json({
          success: false,
          error: 'Content type and topic are required'
        });
      }

      const result = await WorkflowOrchestrator.executeWorkflow('content-generation', {
        contentType,
        topic
      }, {
        userId: req.user._id,
        workspace: req.user.workspace
      });

      res.json(result);

    } catch (error) {
      console.error('Content generation workflow error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/orchestration/workflows/customer-support
 * @desc    Quick customer support workflow
 * @access  Private
 */
router.post(
  '/workflows/customer-support',
  authenticate,
  workflowLimiter,
  async (req, res) => {
    try {
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query is required'
        });
      }

      const result = await WorkflowOrchestrator.executeWorkflow('customer-support', {
        query
      }, {
        userId: req.user._id,
        workspace: req.user.workspace
      });

      res.json(result);

    } catch (error) {
      console.error('Customer support workflow error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
