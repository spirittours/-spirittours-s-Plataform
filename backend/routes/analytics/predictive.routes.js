/**
 * Predictive Analytics API Routes
 * Sprint 26 - Machine Learning & Predictive Analytics
 * 
 * Endpoints for:
 * - Churn prediction (customer retention)
 * - Revenue forecasting (time-series)
 * - Demand prediction (booking volume)
 * - Anomaly detection (AI-powered)
 */

const express = require('express');
const router = express.Router();
const { getPredictiveAnalyticsService } = require('../../services/ml/PredictiveAnalyticsService');
const { authenticate, authorize } = require('../../middleware/auth');

// All predictive analytics routes require authentication
router.use(authenticate);

/**
 * POST /api/analytics/predictive/churn/predict
 * Predict customer churn probability
 * 
 * Body:
 * {
 *   customerId: string (optional if features provided),
 *   features: object (optional if customerId provided)
 * }
 * 
 * Returns:
 * {
 *   customerId: string,
 *   churnProbability: number (0-1),
 *   riskLevel: 'low' | 'medium' | 'high' | 'critical',
 *   confidence: number,
 *   predictedChurnDate: Date,
 *   factors: array,
 *   recommendations: array
 * }
 */
router.post('/churn/predict', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { customerId, features } = req.body;
    
    if (!customerId && !features) {
      return res.status(400).json({
        success: false,
        error: 'Either customerId or features must be provided'
      });
    }
    
    const service = getPredictiveAnalyticsService();
    const prediction = await service.predictChurn({ customerId, features });
    
    res.json({
      success: true,
      prediction
    });
  } catch (error) {
    console.error('Churn prediction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/analytics/predictive/churn/batch
 * Batch predict churn for multiple customers
 * 
 * Body:
 * {
 *   customerIds: string[],
 *   riskThreshold: number (optional, default 0.7)
 * }
 */
router.post('/churn/batch', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { customerIds, riskThreshold = 0.7 } = req.body;
    
    if (!customerIds || !Array.isArray(customerIds)) {
      return res.status(400).json({
        success: false,
        error: 'customerIds array is required'
      });
    }
    
    const service = getPredictiveAnalyticsService();
    const predictions = [];
    
    for (const customerId of customerIds) {
      try {
        const prediction = await service.predictChurn({ customerId });
        predictions.push(prediction);
      } catch (error) {
        console.error(`Error predicting churn for ${customerId}:`, error);
      }
    }
    
    // Filter high-risk customers
    const highRisk = predictions.filter(p => p.churnProbability >= riskThreshold);
    
    res.json({
      success: true,
      total: predictions.length,
      highRisk: highRisk.length,
      predictions: predictions.sort((a, b) => b.churnProbability - a.churnProbability)
    });
  } catch (error) {
    console.error('Batch churn prediction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/analytics/predictive/revenue/forecast
 * Forecast revenue using time-series analysis
 * 
 * Body:
 * {
 *   period: 'week' | 'month' | 'quarter' | 'year',
 *   periods: number (how many periods ahead),
 *   includeConfidenceIntervals: boolean
 * }
 * 
 * Returns:
 * {
 *   forecast: array of {date, value, trend, seasonal},
 *   summary: {total, average, trend},
 *   confidence: {lower, upper}
 * }
 */
router.post('/revenue/forecast', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { period = 'month', periods = 3, includeConfidenceIntervals = true } = req.body;
    
    const validPeriods = ['week', 'month', 'quarter', 'year'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
      });
    }
    
    if (periods < 1 || periods > 12) {
      return res.status(400).json({
        success: false,
        error: 'Periods must be between 1 and 12'
      });
    }
    
    const service = getPredictiveAnalyticsService();
    const forecast = await service.forecastRevenue({
      period,
      periods,
      includeConfidenceIntervals
    });
    
    res.json({
      success: true,
      forecast
    });
  } catch (error) {
    console.error('Revenue forecast error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/analytics/predictive/demand/predict
 * Predict demand/booking volume
 * 
 * Body:
 * {
 *   startDate: string (ISO date),
 *   endDate: string (ISO date),
 *   granularity: 'day' | 'week' | 'month',
 *   tourType: string (optional)
 * }
 * 
 * Returns:
 * {
 *   predictions: array of {date, predicted, capacity, utilizationRate},
 *   summary: {total, average, peak},
 *   recommendations: array
 * }
 */
router.post('/demand/predict', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate, granularity = 'week', tourType } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }
    
    const validGranularities = ['day', 'week', 'month'];
    if (!validGranularities.includes(granularity)) {
      return res.status(400).json({
        success: false,
        error: `Invalid granularity. Must be one of: ${validGranularities.join(', ')}`
      });
    }
    
    const service = getPredictiveAnalyticsService();
    const prediction = await service.predictDemand({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      granularity,
      tourType
    });
    
    res.json({
      success: true,
      prediction
    });
  } catch (error) {
    console.error('Demand prediction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/analytics/predictive/anomalies/detect
 * Detect anomalies in metrics
 * 
 * Body:
 * {
 *   metric: 'revenue' | 'bookings' | 'cancellations' | 'response_time',
 *   startDate: string (ISO date),
 *   endDate: string (ISO date),
 *   sensitivity: 'low' | 'medium' | 'high'
 * }
 * 
 * Returns:
 * {
 *   anomalies: array of {date, value, severity, type, explanation},
 *   summary: {total, bySeverity, byType},
 *   baseline: {mean, stdDev, threshold}
 * }
 */
router.post('/anomalies/detect', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { metric, startDate, endDate, sensitivity = 'medium' } = req.body;
    
    if (!metric) {
      return res.status(400).json({
        success: false,
        error: 'metric is required'
      });
    }
    
    const validMetrics = ['revenue', 'bookings', 'cancellations', 'response_time'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({
        success: false,
        error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`
      });
    }
    
    const validSensitivities = ['low', 'medium', 'high'];
    if (!validSensitivities.includes(sensitivity)) {
      return res.status(400).json({
        success: false,
        error: `Invalid sensitivity. Must be one of: ${validSensitivities.join(', ')}`
      });
    }
    
    const service = getPredictiveAnalyticsService();
    const detection = await service.detectAnomalies({
      metric,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      sensitivity
    });
    
    res.json({
      success: true,
      detection
    });
  } catch (error) {
    console.error('Anomaly detection error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/predictive/models/status
 * Get status of ML models
 * 
 * Returns:
 * {
 *   models: {
 *     churn: {trained, lastTrained, accuracy, samples},
 *     revenue: {trained, lastTrained, accuracy, samples},
 *     demand: {trained, lastTrained, accuracy, samples}
 *   },
 *   cacheStats: {size, hits, misses, hitRate}
 * }
 */
router.get('/models/status', authorize(['admin']), async (req, res) => {
  try {
    const service = getPredictiveAnalyticsService();
    const status = service.getModelStatus();
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Model status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/analytics/predictive/models/retrain
 * Manually trigger model retraining
 * 
 * Body:
 * {
 *   model: 'churn' | 'revenue' | 'demand' | 'all'
 * }
 */
router.post('/models/retrain', authorize(['admin']), async (req, res) => {
  try {
    const { model = 'all' } = req.body;
    
    const validModels = ['churn', 'revenue', 'demand', 'all'];
    if (!validModels.includes(model)) {
      return res.status(400).json({
        success: false,
        error: `Invalid model. Must be one of: ${validModels.join(', ')}`
      });
    }
    
    const service = getPredictiveAnalyticsService();
    
    // Trigger retraining (async, doesn't block)
    service.emit('retrain_requested', { model, requestedBy: req.user.id });
    
    res.json({
      success: true,
      message: `Retraining ${model} model(s) initiated`,
      estimatedTime: '5-15 minutes'
    });
  } catch (error) {
    console.error('Model retrain error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/predictive/insights
 * Get AI-powered business insights
 * 
 * Query params:
 * - timeRange: 'week' | 'month' | 'quarter' | 'year'
 * 
 * Returns:
 * {
 *   insights: array of {type, severity, message, data, recommendations},
 *   summary: {total, bySeverity, byType}
 * }
 */
router.get('/insights', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { timeRange = 'month' } = req.query;
    
    const service = getPredictiveAnalyticsService();
    
    // Get various predictions and combine into insights
    const insights = [];
    
    // Check for high churn risk (if we have customer data)
    try {
      // In a real implementation, this would query all customers
      // For now, we'll return a placeholder
      insights.push({
        type: 'churn',
        severity: 'high',
        message: 'Churn prediction model is ready for customer analysis',
        data: { modelStatus: 'trained' },
        recommendations: ['Run batch churn prediction on customer base', 'Set up automated alerts for high-risk customers']
      });
    } catch (error) {
      console.error('Churn insights error:', error);
    }
    
    // Revenue forecast insights
    try {
      const forecast = await service.forecastRevenue({ period: 'month', periods: 3 });
      const trend = forecast.summary.trend;
      
      insights.push({
        type: 'revenue',
        severity: trend === 'declining' ? 'medium' : 'low',
        message: `Revenue trend is ${trend} for the next 3 months`,
        data: { forecast: forecast.summary },
        recommendations: trend === 'declining' 
          ? ['Review pricing strategy', 'Increase marketing efforts', 'Launch retention campaigns']
          : ['Maintain current strategy', 'Consider capacity expansion']
      });
    } catch (error) {
      console.error('Revenue insights error:', error);
    }
    
    // Anomaly detection insights
    try {
      const anomalies = await service.detectAnomalies({ metric: 'bookings' });
      if (anomalies.summary.total > 0) {
        insights.push({
          type: 'anomaly',
          severity: anomalies.anomalies.some(a => a.severity === 'critical') ? 'high' : 'medium',
          message: `Detected ${anomalies.summary.total} anomalies in booking patterns`,
          data: { anomalies: anomalies.summary },
          recommendations: ['Investigate unusual booking patterns', 'Check for system issues', 'Review marketing campaigns']
        });
      }
    } catch (error) {
      console.error('Anomaly insights error:', error);
    }
    
    // Summarize
    const summary = {
      total: insights.length,
      bySeverity: {
        critical: insights.filter(i => i.severity === 'critical').length,
        high: insights.filter(i => i.severity === 'high').length,
        medium: insights.filter(i => i.severity === 'medium').length,
        low: insights.filter(i => i.severity === 'low').length
      },
      byType: {
        churn: insights.filter(i => i.type === 'churn').length,
        revenue: insights.filter(i => i.type === 'revenue').length,
        demand: insights.filter(i => i.type === 'demand').length,
        anomaly: insights.filter(i => i.type === 'anomaly').length
      }
    };
    
    res.json({
      success: true,
      insights: insights.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      summary
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/analytics/predictive/health
 * Health check for predictive analytics service
 */
router.get('/health', async (req, res) => {
  try {
    const service = getPredictiveAnalyticsService();
    const stats = service.getStatistics();
    
    res.json({
      success: true,
      status: 'healthy',
      uptime: process.uptime(),
      statistics: stats
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;
