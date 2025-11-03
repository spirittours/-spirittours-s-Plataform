/**
 * AI Agent Core - API Routes
 * 
 * Main orchestration endpoints for the AI Accounting Agent
 * 
 * @module AIAgentCoreRoutes
 */

const express = require('express');
const router = express.Router();
const AIAccountingAgentCore = require('../../services/ai-accounting-agent/ai-agent-core');
const { authenticate, authorize } = require('../../middleware/auth');
const logger = require('../../utils/logger');

// Initialize AI Agent Core
const aiAgent = new AIAccountingAgentCore();

/**
 * POST /api/ai-agent/core/process-transaction
 * Process transaction with full AI pipeline
 */
router.post('/process-transaction',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { transaction } = req.body;
      
      if (!transaction || !transaction.id) {
        return res.status(400).json({
          success: false,
          error: 'Transaction object with id is required'
        });
      }

      logger.info(`AI Agent: Processing transaction ${transaction.id} by user ${req.user.id}`);

      const result = await aiAgent.processTransaction(transaction);

      res.json({
        success: true,
        data: result,
        message: result.requiresReview 
          ? '⚠️ Transacción requiere revisión humana'
          : '✅ Transacción procesada automáticamente'
      });

    } catch (error) {
      logger.error('Error processing transaction:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'TRANSACTION_PROCESSING_FAILED'
      });
    }
  }
);

/**
 * POST /api/ai-agent/core/analyze
 * Analyze transaction with AI (without processing)
 */
router.post('/analyze',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant', 'assistant']),
  async (req, res) => {
    try {
      const { transaction } = req.body;
      
      if (!transaction) {
        return res.status(400).json({
          success: false,
          error: 'Transaction object is required'
        });
      }

      const analysis = await aiAgent.analyzeTransaction(transaction);

      res.json({
        success: true,
        data: analysis
      });

    } catch (error) {
      logger.error('Error analyzing transaction:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'ANALYSIS_FAILED'
      });
    }
  }
);

/**
 * POST /api/ai-agent/core/chat
 * Interactive AI conversation interface
 */
router.post('/chat',
  authenticate,
  async (req, res) => {
    try {
      const { messages, context } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          success: false,
          error: 'Messages array is required'
        });
      }

      const response = await aiAgent.chat(messages, {
        userId: req.user.id,
        organizationId: req.user.organizationId,
        context: context || {}
      });

      res.json({
        success: true,
        data: {
          response: response,
          conversationId: context?.conversationId || null
        }
      });

    } catch (error) {
      logger.error('Error in AI chat:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'CHAT_FAILED'
      });
    }
  }
);

/**
 * POST /api/ai-agent/core/validate-completeness
 * Check transaction completeness
 */
router.post('/validate-completeness',
  authenticate,
  async (req, res) => {
    try {
      const { transaction } = req.body;
      
      if (!transaction) {
        return res.status(400).json({
          success: false,
          error: 'Transaction object is required'
        });
      }

      const validation = await aiAgent.validateCompleteness(transaction);

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      logger.error('Error validating completeness:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/core/check-compliance
 * Verify regulatory compliance
 */
router.post('/check-compliance',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { transaction } = req.body;
      
      if (!transaction || !transaction.country) {
        return res.status(400).json({
          success: false,
          error: 'Transaction object with country is required'
        });
      }

      const compliance = await aiAgent.checkCompliance(transaction);

      res.json({
        success: true,
        data: compliance,
        message: compliance.compliant 
          ? '✅ Transacción cumple con regulaciones'
          : '⚠️ Problemas de cumplimiento detectados'
      });

    } catch (error) {
      logger.error('Error checking compliance:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/core/status
 * Get AI Agent status and statistics
 */
router.get('/status',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const status = {
        active: true,
        version: '1.0.0',
        config: {
          primaryProvider: aiAgent.config.primaryProvider,
          fallbackProvider: aiAgent.config.fallbackProvider,
          temperature: aiAgent.config.temperature,
          maxTokens: aiAgent.config.maxTokens
        },
        statistics: aiAgent.stats,
        services: {
          openai: 'available',
          anthropic: 'available',
          fraudDetection: 'active',
          dualReview: 'active',
          checklistManager: 'active'
        }
      };

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('Error getting AI Agent status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/core/conversation-history
 * Get recent conversation history
 */
router.get('/conversation-history',
  authenticate,
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;

      const history = aiAgent.conversationMemory.slice(-parseInt(limit));

      res.json({
        success: true,
        data: {
          history: history,
          count: history.length,
          maxSize: aiAgent.maxMemorySize
        }
      });

    } catch (error) {
      logger.error('Error getting conversation history:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/ai-agent/core/conversation-history
 * Clear conversation history
 */
router.delete('/conversation-history',
  authenticate,
  async (req, res) => {
    try {
      aiAgent.conversationMemory = [];

      logger.info(`Conversation history cleared by user ${req.user.id}`);

      res.json({
        success: true,
        message: '✅ Historial de conversación eliminado'
      });

    } catch (error) {
      logger.error('Error clearing conversation history:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/core/statistics
 * Get detailed usage statistics
 */
router.get('/statistics',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const statistics = {
        ...aiAgent.stats,
        period: {
          start: startDate || null,
          end: endDate || null
        },
        successRate: aiAgent.stats.totalRequests > 0
          ? (aiAgent.stats.successfulRequests / aiAgent.stats.totalRequests * 100).toFixed(2)
          : 0,
        failureRate: aiAgent.stats.totalRequests > 0
          ? (aiAgent.stats.failedRequests / aiAgent.stats.totalRequests * 100).toFixed(2)
          : 0,
        providerDistribution: {
          openai: aiAgent.stats.totalRequests > 0
            ? (aiAgent.stats.providerUsage.openai / aiAgent.stats.totalRequests * 100).toFixed(2)
            : 0,
          anthropic: aiAgent.stats.totalRequests > 0
            ? (aiAgent.stats.providerUsage.anthropic / aiAgent.stats.totalRequests * 100).toFixed(2)
            : 0
        }
      };

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      logger.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/core/batch-process
 * Process multiple transactions in batch
 */
router.post('/batch-process',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { transactions } = req.body;
      
      if (!transactions || !Array.isArray(transactions)) {
        return res.status(400).json({
          success: false,
          error: 'Transactions array is required'
        });
      }

      if (transactions.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 100 transactions per batch'
        });
      }

      logger.info(`Batch processing ${transactions.length} transactions by user ${req.user.id}`);

      const results = [];
      const errors = [];

      for (const transaction of transactions) {
        try {
          const result = await aiAgent.processTransaction(transaction);
          results.push({
            transactionId: transaction.id,
            success: true,
            result: result
          });
        } catch (error) {
          errors.push({
            transactionId: transaction.id,
            success: false,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          total: transactions.length,
          successful: results.length,
          failed: errors.length,
          results: results,
          errors: errors
        },
        message: `✅ Procesadas ${results.length} de ${transactions.length} transacciones`
      });

    } catch (error) {
      logger.error('Error in batch processing:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'BATCH_PROCESSING_FAILED'
      });
    }
  }
);

module.exports = router;
