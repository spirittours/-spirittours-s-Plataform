/**
 * Workflow Routes - SPRINT 3.1
 * 
 * API endpoints for workflow management and execution
 */

const express = require('express');
const router = express.Router();
const Workflow = require('../../models/Workflow');
const WorkflowExecution = require('../../models/WorkflowExecution');
const WorkflowEngine = require('../../services/automation/WorkflowEngine');
const { authenticate } = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/permissions');
const logger = require('../../utils/logger');

const workflowEngine = new WorkflowEngine();

/**
 * GET /api/automation/workflows/:workspaceId
 * Get all workflows for workspace
 */
router.get('/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { status } = req.query;

    const workflows = await Workflow.findByWorkspace(workspaceId, status)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    res.json({
      success: true,
      workflows,
      total: workflows.length,
    });
  } catch (error) {
    logger.error('Error fetching workflows:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflows',
      error: error.message,
    });
  }
});

/**
 * GET /api/automation/workflows/:workspaceId/:id
 * Get single workflow by ID
 */
router.get('/:workspaceId/:id', authenticate, async (req, res) => {
  try {
    const { id, workspaceId } = req.params;

    const workflow = await Workflow.findOne({ _id: id, workspaceId })
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    res.json({
      success: true,
      workflow,
    });
  } catch (error) {
    logger.error('Error fetching workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow',
      error: error.message,
    });
  }
});

/**
 * POST /api/automation/workflows/:workspaceId
 * Create new workflow
 */
router.post('/:workspaceId', authenticate, checkPermission('workflows', 'create'), async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const workflowData = req.body;

    const workflow = await Workflow.create({
      ...workflowData,
      workspaceId,
      createdBy: req.user._id,
    });

    logger.info(`Workflow created: ${workflow._id} by user ${req.user._id}`);

    res.status(201).json({
      success: true,
      message: 'Workflow created successfully',
      workflow,
    });
  } catch (error) {
    logger.error('Error creating workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create workflow',
      error: error.message,
    });
  }
});

/**
 * PUT /api/automation/workflows/:workspaceId/:id
 * Update workflow
 */
router.put('/:workspaceId/:id', authenticate, checkPermission('workflows', 'update'), async (req, res) => {
  try {
    const { id, workspaceId } = req.params;
    const updates = req.body;

    const workflow = await Workflow.findOneAndUpdate(
      { _id: id, workspaceId },
      {
        ...updates,
        updatedBy: req.user._id,
      },
      { new: true, runValidators: true }
    );

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    logger.info(`Workflow updated: ${workflow._id} by user ${req.user._id}`);

    res.json({
      success: true,
      message: 'Workflow updated successfully',
      workflow,
    });
  } catch (error) {
    logger.error('Error updating workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update workflow',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/automation/workflows/:workspaceId/:id
 * Delete workflow
 */
router.delete('/:workspaceId/:id', authenticate, checkPermission('workflows', 'delete'), async (req, res) => {
  try {
    const { id, workspaceId } = req.params;

    const workflow = await Workflow.findOneAndDelete({ _id: id, workspaceId });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    logger.info(`Workflow deleted: ${id} by user ${req.user._id}`);

    res.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete workflow',
      error: error.message,
    });
  }
});

/**
 * POST /api/automation/workflows/:workspaceId/:id/activate
 * Activate workflow
 */
router.post('/:workspaceId/:id/activate', authenticate, checkPermission('workflows', 'update'), async (req, res) => {
  try {
    const { id, workspaceId } = req.params;

    const workflow = await Workflow.findOne({ _id: id, workspaceId });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    await workflow.activate();

    logger.info(`Workflow activated: ${id} by user ${req.user._id}`);

    res.json({
      success: true,
      message: 'Workflow activated successfully',
      workflow,
    });
  } catch (error) {
    logger.error('Error activating workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate workflow',
      error: error.message,
    });
  }
});

/**
 * POST /api/automation/workflows/:workspaceId/:id/pause
 * Pause workflow
 */
router.post('/:workspaceId/:id/pause', authenticate, checkPermission('workflows', 'update'), async (req, res) => {
  try {
    const { id, workspaceId } = req.params;

    const workflow = await Workflow.findOne({ _id: id, workspaceId });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    await workflow.pause();

    logger.info(`Workflow paused: ${id} by user ${req.user._id}`);

    res.json({
      success: true,
      message: 'Workflow paused successfully',
      workflow,
    });
  } catch (error) {
    logger.error('Error pausing workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause workflow',
      error: error.message,
    });
  }
});

/**
 * POST /api/automation/workflows/:workspaceId/:id/execute
 * Manually execute workflow
 */
router.post('/:workspaceId/:id/execute', authenticate, checkPermission('workflows', 'execute'), async (req, res) => {
  try {
    const { id, workspaceId } = req.params;
    const { triggerData } = req.body;

    const workflow = await Workflow.findOne({ _id: id, workspaceId });

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    // Execute workflow asynchronously
    workflowEngine.executeWorkflow(workflow, triggerData || {}, req.user._id)
      .catch(error => {
        logger.error('Error in async workflow execution:', error);
      });

    logger.info(`Workflow execution started: ${id} by user ${req.user._id}`);

    res.json({
      success: true,
      message: 'Workflow execution started',
      workflowId: workflow._id,
    });
  } catch (error) {
    logger.error('Error executing workflow:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute workflow',
      error: error.message,
    });
  }
});

/**
 * GET /api/automation/workflows/:workspaceId/:id/executions
 * Get workflow execution history
 */
router.get('/:workspaceId/:id/executions', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const executions = await WorkflowExecution.findByWorkflow(id, parseInt(limit));

    res.json({
      success: true,
      executions,
      total: executions.length,
    });
  } catch (error) {
    logger.error('Error fetching workflow executions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow executions',
      error: error.message,
    });
  }
});

/**
 * GET /api/automation/workflows/:workspaceId/:id/stats
 * Get workflow statistics
 */
router.get('/:workspaceId/:id/stats', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const workflow = await Workflow.findById(id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found',
      });
    }

    const stats = await WorkflowExecution.getStatsByWorkflow(id, parseInt(days));

    res.json({
      success: true,
      stats: {
        workflow: {
          totalExecutions: workflow.stats.totalExecutions,
          successfulExecutions: workflow.stats.successfulExecutions,
          failedExecutions: workflow.stats.failedExecutions,
          successRate: workflow.successRate,
          averageExecutionTime: workflow.stats.averageExecutionTime,
          lastExecutedAt: workflow.stats.lastExecutedAt,
        },
        period: stats[0] || {},
      },
    });
  } catch (error) {
    logger.error('Error fetching workflow stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workflow stats',
      error: error.message,
    });
  }
});

/**
 * POST /api/automation/workflows/trigger/:triggerType
 * Trigger workflows by event (used by other services)
 */
router.post('/trigger/:triggerType', authenticate, async (req, res) => {
  try {
    const { triggerType } = req.params;
    const { workspaceId, triggerData } = req.body;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'workspaceId is required',
      });
    }

    // Trigger workflows asynchronously
    workflowEngine.triggerWorkflows(triggerType, triggerData || {}, workspaceId, req.user._id)
      .catch(error => {
        logger.error('Error in async trigger:', error);
      });

    logger.info(`Workflows triggered for type: ${triggerType} in workspace ${workspaceId}`);

    res.json({
      success: true,
      message: 'Workflows triggered successfully',
      triggerType,
    });
  } catch (error) {
    logger.error('Error triggering workflows:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger workflows',
      error: error.message,
    });
  }
});

module.exports = router;
