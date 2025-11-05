const express = require('express');
const router = express.Router();
const AIInsightsEngine = require('../../services/ai/AIInsightsEngine');
const { authenticateToken } = require('../../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/ai/insights/:workspaceId
 * @desc    Get comprehensive AI-generated insights for workspace
 * @access  Private
 */
router.get('/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const insights = await AIInsightsEngine.generateWorkspaceInsights(workspaceId);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate insights',
    });
  }
});

/**
 * @route   GET /api/ai/insights/:workspaceId/deals
 * @desc    Get deal-specific insights and predictions
 * @access  Private
 */
router.get('/:workspaceId/deals', async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const insights = await AIInsightsEngine.generateDealInsights(workspaceId);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error('Error generating deal insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate deal insights',
    });
  }
});

/**
 * @route   GET /api/ai/insights/:workspaceId/leads
 * @desc    Get lead insights and recommendations
 * @access  Private
 */
router.get('/:workspaceId/leads', async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const insights = await AIInsightsEngine.generateLeadInsights(workspaceId);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error('Error generating lead insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate lead insights',
    });
  }
});

/**
 * @route   GET /api/ai/insights/:workspaceId/revenue
 * @desc    Get revenue insights and forecasts
 * @access  Private
 */
router.get('/:workspaceId/revenue', async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const insights = await AIInsightsEngine.generateRevenueInsights(workspaceId);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error('Error generating revenue insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate revenue insights',
    });
  }
});

/**
 * @route   GET /api/ai/insights/:workspaceId/churn
 * @desc    Get churn risk analysis
 * @access  Private
 */
router.get('/:workspaceId/churn', async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const insights = await AIInsightsEngine.generateChurnInsights(workspaceId);

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error('Error generating churn insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate churn insights',
    });
  }
});

/**
 * @route   GET /api/ai/insights/:workspaceId/opportunities
 * @desc    Get upsell/cross-sell opportunities
 * @access  Private
 */
router.get('/:workspaceId/opportunities', async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const insights = await AIInsightsEngine.generateOpportunityInsights(
      workspaceId
    );

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error('Error generating opportunity insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate opportunity insights',
    });
  }
});

/**
 * @route   POST /api/ai/insights/:workspaceId/deal/:dealId/predict
 * @desc    Predict win probability for specific deal
 * @access  Private
 */
router.post('/:workspaceId/deal/:dealId/predict', async (req, res) => {
  try {
    const { dealId } = req.params;

    const Deal = require('../../models/crm/Deal');
    const deal = await Deal.findById(dealId);

    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
      });
    }

    const winProbability = await AIInsightsEngine.predictDealWinProbability(
      deal
    );
    const recommendedActions = await AIInsightsEngine.recommendDealActions(
      deal
    );
    const riskFactors = await AIInsightsEngine.identifyDealRisks(deal);

    res.json({
      success: true,
      data: {
        dealId: deal._id,
        dealTitle: deal.title,
        winProbability,
        riskFactors,
        recommendedActions,
      },
    });
  } catch (error) {
    console.error('Error predicting deal win probability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to predict deal win probability',
    });
  }
});

/**
 * @route   POST /api/ai/insights/:workspaceId/customer/:customerId/churn-risk
 * @desc    Calculate churn risk for specific customer
 * @access  Private
 */
router.post('/:workspaceId/customer/:customerId/churn-risk', async (req, res) => {
  try {
    const { customerId } = req.params;

    const Contact = require('../../models/crm/Contact');
    const customer = await Contact.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    const riskScore = await AIInsightsEngine.calculateChurnRisk(customer);
    const reasons = await AIInsightsEngine.identifyChurnReasons(customer);
    const actions = await AIInsightsEngine.recommendRetentionActions(customer);

    res.json({
      success: true,
      data: {
        customerId: customer._id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        riskScore,
        riskLevel:
          riskScore > 75 ? 'high' : riskScore > 60 ? 'medium' : 'low',
        reasons,
        recommendedActions: actions,
      },
    });
  } catch (error) {
    console.error('Error calculating churn risk:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate churn risk',
    });
  }
});

/**
 * @route   POST /api/ai/insights/:workspaceId/cache/clear
 * @desc    Clear insights cache
 * @access  Private (Admin only)
 */
router.post('/:workspaceId/cache/clear', async (req, res) => {
  try {
    AIInsightsEngine.clearCache();

    res.json({
      success: true,
      message: 'Insights cache cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
    });
  }
});

module.exports = router;
