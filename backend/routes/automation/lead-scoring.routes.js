/**
 * AI Lead Scoring Routes - SPRINT 3.2
 * API endpoints for lead scoring functionality
 */

const express = require('express');
const router = express.Router();
const AILeadScoringService = require('../../services/automation/AILeadScoringService');
const { authenticate } = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/permissions');
const logger = require('../../utils/logger');

const scoringService = new AILeadScoringService();

/**
 * POST /api/automation/lead-scoring/:workspaceId/score/:leadId
 * Score a single lead
 */
router.post('/:workspaceId/score/:leadId', authenticate, async (req, res) => {
  try {
    const { workspaceId, leadId } = req.params;

    const result = await scoringService.scoreLead(leadId, workspaceId);

    res.json({
      success: true,
      message: 'Lead scored successfully',
      result,
    });
  } catch (error) {
    logger.error('Error scoring lead:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to score lead',
      error: error.message,
    });
  }
});

/**
 * POST /api/automation/lead-scoring/:workspaceId/batch
 * Score multiple leads
 */
router.post('/:workspaceId/batch', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds)) {
      return res.status(400).json({
        success: false,
        message: 'leadIds array is required',
      });
    }

    const results = await scoringService.batchScoreLeads(leadIds, workspaceId);

    res.json({
      success: true,
      message: `Scored ${results.filter(r => !r.error).length} of ${leadIds.length} leads`,
      results,
    });
  } catch (error) {
    logger.error('Error batch scoring leads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to batch score leads',
      error: error.message,
    });
  }
});

/**
 * POST /api/automation/lead-scoring/:workspaceId/auto-score
 * Auto-score all unscored leads
 */
router.post('/:workspaceId/auto-score', authenticate, checkPermission('leads', 'update'), async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { limit = 100 } = req.body;

    const result = await scoringService.autoScoreUnscored(workspaceId, limit);

    res.json({
      success: true,
      message: `Auto-scored ${result.scored} leads`,
      result,
    });
  } catch (error) {
    logger.error('Error auto-scoring leads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to auto-score leads',
      error: error.message,
    });
  }
});

module.exports = router;
