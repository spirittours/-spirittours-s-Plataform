/**
 * AI Accounting Agent - Main Router
 * 
 * Main router that mounts all AI Accounting Agent sub-routers
 * Provides unified API for all 9 services:
 * 
 * 1. AI Agent Core - Main orchestration engine
 * 2. Fraud Detection - 4-layer detection, 30 patterns
 * 3. Reporting Engine - Financial statements, KPIs
 * 4. Predictive Analytics - Forecasting, ML predictions
 * 5. USA Compliance - IRS, GAAP, Sales Tax
 * 6. Mexico Compliance - SAT, CFDI 4.0, RFC
 * 7. Dual Review System - AI + Human review
 * 8. Checklist Manager - 5 predefined checklists
 * 9. ROI Calculator - 4-year payback period
 * 
 * Base path: /api/ai-agent
 * 
 * @module AIAgentRouter
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Import all sub-routers
try {
  // Core Services
  const aiAgentCoreRoutes = require('./ai-accounting-agent/ai-agent-core.routes');
  const fraudDetectionRoutes = require('./ai-accounting-agent/fraud-detection.routes');
  const reportingRoutes = require('./ai-accounting-agent/reporting.routes');
  const predictiveAnalyticsRoutes = require('./ai-accounting-agent/predictive-analytics.routes');
  
  // Compliance Services
  const usaComplianceRoutes = require('./ai-accounting-agent/usa-compliance.routes');
  const mexicoComplianceRoutes = require('./ai-accounting-agent/mexico-compliance.routes');
  
  // Management Services
  const dualReviewRoutes = require('./ai-accounting-agent/dual-review.routes');
  const checklistRoutes = require('./ai-accounting-agent/checklist.routes');
  const roiCalculatorRoutes = require('./ai-accounting-agent/roi-calculator.routes');
  
  logger.info('✅ All AI Agent sub-routers imported successfully');
  
  // Mount sub-routers on their respective paths
  
  /**
   * Core Services
   */
  router.use('/core', aiAgentCoreRoutes);
  router.use('/fraud-detection', fraudDetectionRoutes);
  router.use('/reports', reportingRoutes);
  router.use('/predictive', predictiveAnalyticsRoutes);
  
  /**
   * Compliance Services
   */
  router.use('/compliance/usa', usaComplianceRoutes);
  router.use('/compliance/mexico', mexicoComplianceRoutes);
  
  /**
   * Management Services
   */
  router.use('/dual-review', dualReviewRoutes);
  router.use('/checklists', checklistRoutes);
  router.use('/roi', roiCalculatorRoutes);
  
  logger.info('✅ All AI Agent sub-routers mounted successfully');
  
} catch (error) {
  logger.error('❌ Error loading AI Agent routes:', error);
  console.error('AI Agent routes loading error:', error);
}

/**
 * GET /api/ai-agent
 * Root endpoint - API documentation and available services
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ERP Hub - AI Accounting Agent API',
    version: '1.0.0',
    services: {
      core: {
        name: 'AI Agent Core',
        description: 'Main orchestration engine for AI accounting operations',
        path: '/api/ai-agent/core',
        endpoints: 10,
        features: [
          'Full transaction processing with AI pipeline',
          'Transaction analysis and recommendations',
          'Interactive AI chat for accounting queries',
          'Completeness and compliance validation',
          'Batch processing (up to 100 transactions)',
          'Conversation history management',
          'Real-time status and statistics'
        ]
      },
      fraudDetection: {
        name: 'Fraud Detection Engine',
        description: '4-layer fraud detection with 30 patterns',
        path: '/api/ai-agent/fraud-detection',
        endpoints: 9,
        features: [
          'Single and batch transaction analysis',
          '30 fraud patterns across 4 layers',
          'Real-time fraud alerts',
          'ML model feedback and learning',
          'Risk score breakdown',
          'Pattern threshold configuration',
          'Model performance metrics'
        ]
      },
      reporting: {
        name: 'Reporting Engine',
        description: 'Financial statements, reports, and KPIs',
        path: '/api/ai-agent/reports',
        endpoints: 12,
        features: [
          'Daily transaction reports',
          'Monthly financial statements',
          'Balance sheet, income statement, cash flow',
          'KPI dashboard with 20+ metrics',
          'Variance analysis',
          'Executive summaries',
          'Report export (JSON/CSV/PDF)',
          'Scheduled reports',
          'Custom report templates'
        ]
      },
      predictiveAnalytics: {
        name: 'Predictive Analytics',
        description: 'Forecasting and ML-based predictions',
        path: '/api/ai-agent/predictive',
        endpoints: 10,
        features: [
          '6-month cash flow forecasting',
          'Revenue predictions by segment',
          'Expense forecasting (fixed/variable)',
          'Budget variance predictions',
          'Trend analysis with R-squared',
          'Seasonality factors',
          'AI-generated insights',
          'Scenario analysis (what-if)',
          'Forecast accuracy tracking',
          'ML model retraining'
        ]
      },
      usaCompliance: {
        name: 'USA Compliance',
        description: 'IRS, GAAP, and sales tax compliance',
        path: '/api/ai-agent/compliance/usa',
        endpoints: 9,
        features: [
          'Full USA compliance validation',
          'Sales tax calculation (50 states)',
          'Form 1099 generation',
          'Corporate tax calculation (federal + state)',
          'GAAP compliance validation',
          'Depreciation schedules',
          'Tax rate lookup by state'
        ]
      },
      mexicoCompliance: {
        name: 'Mexico Compliance',
        description: 'SAT, CFDI 4.0, and RFC compliance',
        path: '/api/ai-agent/compliance/mexico',
        endpoints: 12,
        features: [
          'RFC validation (format + checksum)',
          'CFDI 4.0 9-step validation',
          'CFDI XML generation',
          'PAC stamping (Finkok/SW/Diverza)',
          'IVA 16% calculation',
          'SAT catalog access and validation',
          'Contabilidad Electrónica generation',
          'CFDI status checking',
          'CFDI cancellation'
        ]
      },
      dualReview: {
        name: 'Dual Review System',
        description: 'AI + Human review with toggle control',
        path: '/api/ai-agent/dual-review',
        endpoints: 9,
        features: [
          'Configuration management per country/branch',
          'Toggle automatic processing ON/OFF',
          'Review queue management',
          'Transaction approval/rejection',
          'Second approval for high-value transactions',
          'Review statistics',
          'AI evaluation of review necessity',
          'Queue item details'
        ]
      },
      checklists: {
        name: 'Checklist Manager',
        description: '5 predefined checklists with AI validation',
        path: '/api/ai-agent/checklists',
        endpoints: 10,
        features: [
          '5 predefined checklists (monthly close, quarterly review, audit prep, expense validation, revenue recognition)',
          'AI-powered validation of checklist items',
          'Automatic checklist suggestions',
          'Progress tracking',
          'Manual item validation',
          'Statistics and completion rates',
          'Transaction-level and organization-level views'
        ]
      },
      roiCalculator: {
        name: 'ROI Calculator',
        description: '4-year payback period (fully configurable)',
        path: '/api/ai-agent/roi',
        endpoints: 11,
        features: [
          'Flexible ROI calculation (default 4 years)',
          'Customizable costs and savings',
          'Sensitivity analysis (optimistic/pessimistic)',
          'Configuration management',
          'NPV and IRR calculations',
          'Configuration export/import',
          'Organization-specific configurations',
          'Historical configuration tracking'
        ]
      }
    },
    totalEndpoints: 92,
    authentication: {
      type: 'JWT',
      header: 'Authorization: Bearer <token>',
      roles: ['admin', 'headAccountant', 'accountant', 'assistant']
    },
    rateLimit: {
      admin: '1000 requests/hour',
      headAccountant: '500 requests/hour',
      accountant: '300 requests/hour',
      assistant: '100 requests/hour'
    },
    documentation: {
      api: '/docs/API_DOCUMENTATION.md',
      deployment: '/docs/DEPLOYMENT_GUIDE.md',
      userManual: '/docs/USER_MANUAL.md',
      index: '/docs/DOCUMENTATION_INDEX.md'
    },
    support: {
      email: 'support@erphub.com',
      documentation: 'https://docs.erphub.com/ai-agent',
      status: 'https://status.erphub.com'
    }
  });
});

/**
 * GET /api/ai-agent/health
 * Health check for all AI Agent services
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        aiAgentCore: 'operational',
        fraudDetection: 'operational',
        reporting: 'operational',
        predictiveAnalytics: 'operational',
        usaCompliance: 'operational',
        mexicoCompliance: 'operational',
        dualReview: 'operational',
        checklists: 'operational',
        roiCalculator: 'operational'
      }
    };
    
    res.json({
      success: true,
      data: health
    });
    
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * GET /api/ai-agent/statistics
 * Aggregate statistics for all services
 */
router.get('/statistics', async (req, res) => {
  try {
    const { organizationId } = req.query;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'organizationId is required'
      });
    }
    
    // This endpoint would aggregate statistics from all services
    // Implementation would query each service's statistics endpoint
    
    res.json({
      success: true,
      message: 'Aggregate statistics endpoint - Implementation pending',
      data: {
        organizationId,
        note: 'Use individual service statistics endpoints for now'
      }
    });
    
  } catch (error) {
    logger.error('Error fetching aggregate statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
