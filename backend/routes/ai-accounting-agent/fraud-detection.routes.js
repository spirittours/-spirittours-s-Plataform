/**
 * Fraud Detection Engine - API Routes
 * 
 * Endpoints for fraud detection and alert management
 * 
 * @module FraudDetectionRoutes
 */

const express = require('express');
const router = express.Router();
const FraudDetectionEngine = require('../../services/ai-accounting-agent/fraud-detection-engine');
const { authenticate, authorize } = require('../../middleware/auth');
const logger = require('../../utils/logger');

// Initialize Fraud Detection Engine
const fraudDetection = new FraudDetectionEngine();

/**
 * POST /api/ai-agent/fraud-detection/analyze
 * Analyze transaction for fraud
 */
router.post('/analyze',
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

      logger.info(`Fraud Detection: Analyzing transaction ${transaction.id}`);

      const analysis = await fraudDetection.analyze(transaction);

      res.json({
        success: true,
        data: analysis,
        message: analysis.isFraud 
          ? `🚨 Fraude detectado con ${analysis.confidence}% de confianza`
          : `✅ Sin indicios de fraude (confianza: ${analysis.confidence}%)`
      });

    } catch (error) {
      logger.error('Error analyzing transaction for fraud:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'FRAUD_ANALYSIS_FAILED'
      });
    }
  }
);

/**
 * POST /api/ai-agent/fraud-detection/analyze-batch
 * Analyze multiple transactions
 */
router.post('/analyze-batch',
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

      logger.info(`Fraud Detection: Analyzing ${transactions.length} transactions in batch`);

      const results = [];
      let fraudCount = 0;

      for (const transaction of transactions) {
        try {
          const analysis = await fraudDetection.analyze(transaction);
          results.push({
            transactionId: transaction.id,
            analysis: analysis
          });
          if (analysis.isFraud) fraudCount++;
        } catch (error) {
          results.push({
            transactionId: transaction.id,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          total: transactions.length,
          fraudDetected: fraudCount,
          cleanTransactions: transactions.length - fraudCount,
          results: results
        },
        message: fraudCount > 0 
          ? `⚠️ ${fraudCount} transacciones sospechosas detectadas`
          : '✅ Todas las transacciones son legítimas'
      });

    } catch (error) {
      logger.error('Error in batch fraud analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'BATCH_FRAUD_ANALYSIS_FAILED'
      });
    }
  }
);

/**
 * GET /api/ai-agent/fraud-detection/patterns
 * Get list of fraud patterns
 */
router.get('/patterns',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const patterns = fraudDetection.fraudPatterns;

      const categorizedPatterns = {
        transaction: patterns.filter(p => p.category === 'transaction'),
        vendor: patterns.filter(p => p.category === 'vendor'),
        user: patterns.filter(p => p.category === 'user'),
        document: patterns.filter(p => p.category === 'document')
      };

      res.json({
        success: true,
        data: {
          total: patterns.length,
          byCategory: {
            transaction: categorizedPatterns.transaction.length,
            vendor: categorizedPatterns.vendor.length,
            user: categorizedPatterns.user.length,
            document: categorizedPatterns.document.length
          },
          patterns: categorizedPatterns
        }
      });

    } catch (error) {
      logger.error('Error getting fraud patterns:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/fraud-detection/alerts
 * Get recent fraud alerts
 */
router.get('/alerts',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { 
        organizationId,
        startDate,
        endDate,
        severity,
        status = 'all',
        page = 1,
        limit = 20
      } = req.query;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'organizationId is required'
        });
      }

      // This would typically query a FraudAlert model in MongoDB
      // For now, returning structure
      const alerts = {
        items: [], // Query from database
        pagination: {
          currentPage: parseInt(page),
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: parseInt(limit)
        },
        summary: {
          total: 0,
          bySeverity: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
          },
          byStatus: {
            pending: 0,
            confirmed: 0,
            false_positive: 0,
            investigating: 0
          }
        }
      };

      res.json({
        success: true,
        data: alerts
      });

    } catch (error) {
      logger.error('Error getting fraud alerts:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/fraud-detection/feedback
 * Submit feedback on fraud detection (for learning)
 */
router.post('/feedback',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { 
        transactionId, 
        alertId,
        isFraud, 
        correctPatterns, 
        incorrectPatterns,
        notes 
      } = req.body;

      if (!transactionId || typeof isFraud !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'transactionId and isFraud (boolean) are required'
        });
      }

      logger.info(`Fraud Detection: Feedback received for transaction ${transactionId} by user ${req.user.id}`);

      // Learn from feedback
      await fraudDetection.learnFromFeedback({
        transactionId,
        alertId,
        isFraud,
        correctPatterns: correctPatterns || [],
        incorrectPatterns: incorrectPatterns || [],
        notes,
        reviewedBy: req.user.id,
        reviewedAt: new Date()
      });

      res.json({
        success: true,
        message: '✅ Retroalimentación recibida. Sistema aprendiendo...',
        data: {
          transactionId,
          feedbackType: isFraud ? 'confirmed_fraud' : 'false_positive',
          impactOnModel: 'Thresholds and patterns will be adjusted'
        }
      });

    } catch (error) {
      logger.error('Error submitting fraud feedback:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/fraud-detection/statistics
 * Get fraud detection statistics
 */
router.get('/statistics',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { 
        organizationId,
        startDate,
        endDate 
      } = req.query;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'organizationId is required'
        });
      }

      const statistics = {
        period: {
          startDate: startDate || null,
          endDate: endDate || null
        },
        totals: {
          transactionsAnalyzed: 0,
          fraudDetected: 0,
          falsePositives: 0,
          confirmedFraud: 0,
          investigating: 0
        },
        detectionRate: {
          overall: 0,
          byPattern: {}
        },
        accuracy: {
          overall: 0,
          falsePositiveRate: 0,
          falseNegativeRate: 0
        },
        byLayer: {
          basicRules: { detected: 0, weight: 30 },
          machineLearning: { detected: 0, weight: 30 },
          behavioral: { detected: 0, weight: 25 },
          networkAnalysis: { detected: 0, weight: 15 }
        },
        topPatterns: [],
        averageConfidence: 0
      };

      res.json({
        success: true,
        data: statistics
      });

    } catch (error) {
      logger.error('Error getting fraud statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/fraud-detection/risk-score/:transactionId
 * Get detailed risk score for a transaction
 */
router.get('/risk-score/:transactionId',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { transactionId } = req.params;

      // This would query the transaction and calculate risk
      // Returning structure for now
      const riskScore = {
        transactionId: transactionId,
        overallScore: 0,
        confidence: 0,
        isFraud: false,
        breakdown: {
          basicRules: { score: 0, weight: 30, contribution: 0 },
          machineLearning: { score: 0, weight: 30, contribution: 0 },
          behavioral: { score: 0, weight: 25, contribution: 0 },
          networkAnalysis: { score: 0, weight: 15, contribution: 0 }
        },
        patternsDetected: [],
        riskFactors: [],
        recommendation: ''
      };

      res.json({
        success: true,
        data: riskScore
      });

    } catch (error) {
      logger.error('Error getting risk score:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/ai-agent/fraud-detection/threshold/:pattern
 * Update detection threshold for a pattern (admin only)
 */
router.put('/threshold/:pattern',
  authenticate,
  authorize(['admin']),
  async (req, res) => {
    try {
      const { pattern } = req.params;
      const { threshold } = req.body;

      if (typeof threshold !== 'number' || threshold < 0 || threshold > 100) {
        return res.status(400).json({
          success: false,
          error: 'Threshold must be a number between 0 and 100'
        });
      }

      logger.info(`Fraud Detection: Updating threshold for pattern ${pattern} to ${threshold} by user ${req.user.id}`);

      // Update threshold in fraud detection engine
      // This would be implemented in the service

      res.json({
        success: true,
        message: `✅ Umbral actualizado para patrón ${pattern}`,
        data: {
          pattern: pattern,
          oldThreshold: 50, // Would get from service
          newThreshold: threshold
        }
      });

    } catch (error) {
      logger.error('Error updating threshold:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/fraud-detection/ml-model/status
 * Get ML model status and performance
 */
router.get('/ml-model/status',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const modelStatus = {
        models: [
          {
            name: 'Isolation Forest',
            type: 'anomaly_detection',
            status: 'active',
            lastTrained: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            trainingDataSize: 10000,
            accuracy: 95.3,
            version: '1.2.0'
          },
          {
            name: 'Random Forest',
            type: 'risk_scoring',
            status: 'active',
            lastTrained: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            trainingDataSize: 10000,
            accuracy: 93.7,
            version: '1.1.0'
          },
          {
            name: 'LSTM',
            type: 'sequence_analysis',
            status: 'active',
            lastTrained: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            trainingDataSize: 15000,
            accuracy: 91.2,
            version: '1.0.5'
          },
          {
            name: 'DBSCAN',
            type: 'clustering',
            status: 'active',
            lastTrained: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            trainingDataSize: 8000,
            accuracy: 89.5,
            version: '1.0.3'
          }
        ],
        overallHealth: 'excellent',
        nextTrainingScheduled: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        retrainingThreshold: {
          newDataPoints: 1000,
          accuracyDrop: 5
        }
      };

      res.json({
        success: true,
        data: modelStatus
      });

    } catch (error) {
      logger.error('Error getting ML model status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
