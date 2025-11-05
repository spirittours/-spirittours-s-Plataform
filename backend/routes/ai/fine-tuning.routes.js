const express = require('express');
const router = express.Router();
const FineTuningService = require('../../services/ai/FineTuningService');
const FineTuningJob = require('../../models/FineTuningJob');
const TrainingDataset = require('../../models/TrainingDataset');
const { authenticateToken } = require('../../middleware/auth');
const logger = require('../../config/logger');

/**
 * Fine-tuning Routes
 * Manages custom AI model training jobs
 */

// Get supported models
router.get('/models', authenticateToken, async (req, res) => {
  try {
    const models = FineTuningService.getSupportedModels();
    res.json({
      success: true,
      models,
    });
  } catch (error) {
    logger.error('Error getting supported models:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get training methods
router.get('/methods', authenticateToken, async (req, res) => {
  try {
    const methods = FineTuningService.getTrainingMethods();
    res.json({
      success: true,
      methods,
    });
  } catch (error) {
    logger.error('Error getting training methods:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Create fine-tuning job
router.post('/:workspaceId/jobs', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const config = req.body;
    const userId = req.user.id;
    
    const job = await FineTuningService.createFineTuningJob(
      workspaceId,
      config,
      userId
    );
    
    res.status(201).json({
      success: true,
      job,
    });
  } catch (error) {
    logger.error('Error creating fine-tuning job:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// List fine-tuning jobs
router.get('/:workspaceId/jobs', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { status, limit, offset } = req.query;
    
    const result = await FineTuningService.listJobs(workspaceId, {
      status,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0,
    });
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error listing fine-tuning jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get job status
router.get('/:workspaceId/jobs/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const status = await FineTuningService.getJobStatus(jobId);
    
    res.json({
      success: true,
      job: status,
    });
  } catch (error) {
    logger.error('Error getting job status:', error);
    res.status(404).json({
      success: false,
      error: error.message,
    });
  }
});

// Cancel job
router.post('/:workspaceId/jobs/:jobId/cancel', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await FineTuningService.cancelJob(jobId);
    
    res.json({
      success: true,
      job,
    });
  } catch (error) {
    logger.error('Error cancelling job:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Deploy model
router.post('/:workspaceId/jobs/:jobId/deploy', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const config = req.body;
    
    const deployment = await FineTuningService.deployModel(jobId, config);
    
    res.json({
      success: true,
      deployment,
    });
  } catch (error) {
    logger.error('Error deploying model:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get job statistics
router.get('/:workspaceId/stats', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const stats = await FineTuningJob.getJobStats(workspaceId);
    const activeJobs = await FineTuningJob.getActiveJobs(workspaceId);
    
    res.json({
      success: true,
      stats,
      activeJobs: activeJobs.length,
    });
  } catch (error) {
    logger.error('Error getting job stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ========================================
// Training Dataset Routes
// ========================================

// Create dataset
router.post('/:workspaceId/datasets', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, type, source, preprocessing } = req.body;
    const userId = req.user.id;
    
    const datasetId = `ds-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const dataset = await TrainingDataset.create({
      workspace: workspaceId,
      datasetId,
      name,
      description,
      type,
      source,
      preprocessing,
      createdBy: userId,
    });
    
    res.status(201).json({
      success: true,
      dataset,
    });
  } catch (error) {
    logger.error('Error creating dataset:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// List datasets
router.get('/:workspaceId/datasets', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { type, status, limit } = req.query;
    
    const datasets = await TrainingDataset.getWorkspaceDatasets(workspaceId, {
      type,
      status,
      limit: parseInt(limit) || 50,
    });
    
    res.json({
      success: true,
      datasets,
    });
  } catch (error) {
    logger.error('Error listing datasets:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get dataset
router.get('/:workspaceId/datasets/:datasetId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, datasetId } = req.params;
    
    const dataset = await TrainingDataset.findOne({
      workspace: workspaceId,
      datasetId,
    }).populate('createdBy', 'name email');
    
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Dataset not found',
      });
    }
    
    res.json({
      success: true,
      dataset,
    });
  } catch (error) {
    logger.error('Error getting dataset:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update dataset
router.put('/:workspaceId/datasets/:datasetId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, datasetId } = req.params;
    const updates = req.body;
    
    const dataset = await TrainingDataset.findOneAndUpdate(
      { workspace: workspaceId, datasetId },
      { $set: updates },
      { new: true }
    );
    
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Dataset not found',
      });
    }
    
    res.json({
      success: true,
      dataset,
    });
  } catch (error) {
    logger.error('Error updating dataset:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete dataset
router.delete('/:workspaceId/datasets/:datasetId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, datasetId } = req.params;
    
    const dataset = await TrainingDataset.findOneAndDelete({
      workspace: workspaceId,
      datasetId,
    });
    
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'Dataset not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Dataset deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting dataset:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
