const express = require('express');
const router = express.Router();
const InferenceEngine = require('../../services/inference/InferenceEngine');
const { authenticateToken } = require('../../middleware/auth');
const logger = require('../../config/logger');

/**
 * Custom Inference Engine Routes
 * Local model deployment and serving
 */

// List models
router.get('/models', authenticateToken, async (req, res) => {
  try {
    const { status, capability } = req.query;
    
    const models = InferenceEngine.listModels({ status, capability });
    
    res.json({
      success: true,
      models,
      count: models.length,
    });
  } catch (error) {
    logger.error('Error listing models:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get model info
router.get('/models/:modelId', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    
    const model = InferenceEngine.getModelInfo(modelId);
    
    res.json({
      success: true,
      model,
    });
  } catch (error) {
    logger.error('Error getting model info:', error);
    res.status(404).json({
      success: false,
      error: error.message,
    });
  }
});

// Deploy model
router.post('/models/:modelId/deploy', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    
    const result = await InferenceEngine.deployModel(modelId);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error deploying model:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Infer with model
router.post('/infer/:modelId', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { prompt, maxTokens, temperature, topP, stream, useCache } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
      });
    }
    
    const result = await InferenceEngine.infer(modelId, prompt, {
      maxTokens,
      temperature,
      topP,
      stream,
      useCache,
    });
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error in inference:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Batch infer
router.post('/infer/:modelId/batch', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { prompts, maxTokens, temperature, topP } = req.body;
    
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Array of prompts is required',
      });
    }
    
    const result = await InferenceEngine.batchInfer(modelId, prompts, {
      maxTokens,
      temperature,
      topP,
    });
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error in batch inference:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// A/B test
router.post('/ab-test', authenticateToken, async (req, res) => {
  try {
    const { modelA, modelB, prompt, trafficSplit, maxTokens, temperature } = req.body;
    
    if (!modelA || !modelB || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'modelA, modelB, and prompt are required',
      });
    }
    
    const result = await InferenceEngine.abTest(modelA, modelB, prompt, {
      trafficSplit,
      maxTokens,
      temperature,
    });
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error in A/B test:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get engine statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = InferenceEngine.getStats();
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Error getting inference stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
