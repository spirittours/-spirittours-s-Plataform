const express = require('express');
const router = express.Router();
const RAGService = require('../../services/rag/RAGService');
const { authenticateToken } = require('../../middleware/auth');
const logger = require('../../config/logger');

/**
 * RAG API Routes
 * Retrieval-Augmented Generation for context-aware responses
 */

// Query with RAG
router.post('/:workspaceId/query', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const {
      question,
      entityTypes,
      topK,
      minSimilarity,
      model,
      temperature,
      conversationHistory,
    } = req.body;
    
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required',
      });
    }
    
    const result = await RAGService.query(question, {
      workspace: workspaceId,
      entityTypes,
      topK,
      minSimilarity,
      model,
      temperature,
      conversationHistory,
    });
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error in RAG query endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start conversation
router.post('/:workspaceId/conversation/start', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { question, entityTypes } = req.body;
    
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required',
      });
    }
    
    const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await RAGService.conversationalQuery(question, conversationId, {
      workspace: workspaceId,
      entityTypes,
    });
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error starting conversation:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Continue conversation
router.post('/:workspaceId/conversation/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, conversationId } = req.params;
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required',
      });
    }
    
    const result = await RAGService.continueConversation(conversationId, question, workspaceId);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error continuing conversation:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Summarize conversation
router.get('/:workspaceId/conversation/:conversationId/summary', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, conversationId } = req.params;
    
    const result = await RAGService.summarizeConversation(conversationId, workspaceId);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error summarizing conversation:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Clear conversation
router.delete('/:workspaceId/conversation/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, conversationId } = req.params;
    
    const result = await RAGService.clearConversation(conversationId, workspaceId);
    
    res.json({
      success: true,
      message: 'Conversation cleared successfully',
    });
  } catch (error) {
    logger.error('Error clearing conversation:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get RAG statistics
router.get('/:workspaceId/stats', authenticateToken, async (req, res) => {
  try {
    const stats = RAGService.getStats();
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Error getting RAG stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
