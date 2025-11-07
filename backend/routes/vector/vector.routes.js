const express = require('express');
const router = express.Router();
const VectorDatabaseService = require('../../services/vector/VectorDatabaseService');
const Contact = require('../../models/Contact');
const Lead = require('../../models/Lead');
const Deal = require('../../models/Deal');
const Activity = require('../../models/Activity');
const { authenticateToken } = require('../../middleware/auth');
const logger = require('../../config/logger');

/**
 * Vector Database Routes
 * Semantic search and similarity matching using vector embeddings
 */

// Index single entity
router.post('/:workspaceId/index/:entityType/:entityId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, entityType, entityId } = req.params;
    
    // Fetch entity data
    const Model = getModelForEntityType(entityType);
    const entity = await Model.findById(entityId);
    
    if (!entity) {
      return res.status(404).json({
        success: false,
        error: 'Entity not found',
      });
    }
    
    const result = await VectorDatabaseService.indexEntity(
      entityType,
      entityId,
      entity.toObject(),
      workspaceId
    );
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error indexing entity:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Batch index entities
router.post('/:workspaceId/index-batch/:entityType', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, entityType } = req.params;
    const { limit = 100 } = req.query;
    
    const Model = getModelForEntityType(entityType);
    const entities = await Model.find({ workspace: workspaceId }).limit(parseInt(limit));
    
    const result = await VectorDatabaseService.batchIndexEntities(
      entityType,
      entities,
      workspaceId
    );
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error batch indexing:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Semantic search
router.post('/:workspaceId/search', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { query, entityTypes, topK, minScore } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
      });
    }
    
    const results = await VectorDatabaseService.search(query, {
      workspace: workspaceId,
      entityTypes,
      topK: topK || 10,
      minScore: minScore || 0.7,
    });
    
    res.json({
      success: true,
      ...results,
    });
  } catch (error) {
    logger.error('Error in semantic search:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Find similar entities
router.get('/:workspaceId/similar/:entityType/:entityId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, entityType, entityId } = req.params;
    const { topK, minScore } = req.query;
    
    const results = await VectorDatabaseService.findSimilar(
      entityType,
      entityId,
      workspaceId,
      {
        topK: parseInt(topK) || 5,
        minScore: parseFloat(minScore) || 0.8,
      }
    );
    
    res.json({
      success: true,
      ...results,
    });
  } catch (error) {
    logger.error('Error finding similar:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Hybrid search
router.post('/:workspaceId/hybrid-search', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { query, entityTypes, topK, vectorWeight } = req.body;
    
    const results = await VectorDatabaseService.hybridSearch(query, {
      workspace: workspaceId,
      entityTypes,
      topK: topK || 10,
      vectorWeight: vectorWeight || 0.7,
    });
    
    res.json({
      success: true,
      ...results,
    });
  } catch (error) {
    logger.error('Error in hybrid search:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete entity from index
router.delete('/:workspaceId/index/:entityType/:entityId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, entityType, entityId } = req.params;
    
    const result = await VectorDatabaseService.deleteEntity(
      entityType,
      entityId,
      workspaceId
    );
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error deleting from index:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get index statistics
router.get('/:workspaceId/stats', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const stats = await VectorDatabaseService.getIndexStats(workspaceId);
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Generate embedding
router.post('/embedding', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }
    
    const result = await VectorDatabaseService.generateEmbedding(text);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error generating embedding:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Helper function
function getModelForEntityType(entityType) {
  const models = {
    contact: Contact,
    lead: Lead,
    deal: Deal,
    activity: Activity,
  };
  
  const Model = models[entityType];
  if (!Model) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }
  
  return Model;
}

module.exports = router;
