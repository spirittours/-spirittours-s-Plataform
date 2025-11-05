/**
 * Lead Scoring Routes - SPRINT 3.2
 */

const express = require('express');
const router = express.Router();
const AILeadScoringService = require('../../services/automation/AILeadScoringService');
const { authenticate } = require('../../middleware/auth');
const logger = require('../../utils/logger');

const scoringService = new AILeadScoringService();

// Score single lead
router.post('/:workspaceId/score/:leadId', authenticate, async (req, res) => {
  try {
    const { workspaceId, leadId } = req.params;
    const result = await scoringService.scoreLead(leadId, workspaceId);
    
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Error scoring lead:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Batch score leads
router.post('/:workspaceId/batch-score', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { leadIds } = req.body;
    
    const results = await scoringService.batchScoreLeads(leadIds, workspaceId);
    
    res.json({ success: true, results });
  } catch (error) {
    logger.error('Error batch scoring:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auto-score unscored leads
router.post('/:workspaceId/auto-score', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { limit = 100 } = req.body;
    
    const result = await scoringService.autoScoreUnscored(workspaceId, limit);
    
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Error auto-scoring:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
