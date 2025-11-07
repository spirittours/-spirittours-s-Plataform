/**
 * AI to CRM Integration Routes
 * 
 * API endpoints for AI Agent → CRM Bridge
 * 
 * Spirit Tours Platform - Spirit Phase 1.1
 */

const express = require('express');
const router = express.Router();
const AIToCRMBridge = require('../../services/integration/AIToCRMBridge');
const { authenticate } = require('../../middleware/auth');
const { hasPermission } = require('../../middleware/permissions');
const { logActivity } = require('../../middleware/auditLogger');

const bridge = new AIToCRMBridge();

/**
 * @route   POST /api/integration/ai-to-crm/interaction
 * @desc    Process AI agent interaction and create CRM records
 * @access  Private (requires ai_access permission)
 */
router.post(
  '/interaction',
  authenticate,
  hasPermission('ai_access'),
  logActivity('ai_to_crm_interaction'),
  async (req, res) => {
    try {
      const { agentId, interaction, workspaceId } = req.body;

      if (!agentId || !interaction || !workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: agentId, interaction, workspaceId'
        });
      }

      const result = await bridge.processAgentInteraction(
        agentId,
        interaction,
        req.user._id,
        workspaceId
      );

      res.json({
        success: true,
        message: 'AI interaction processed successfully',
        data: result
      });

    } catch (error) {
      console.error('Error processing AI to CRM interaction:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing AI interaction',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/integration/ai-to-crm/enrich-lead/:leadId
 * @desc    Enrich lead with AI-powered external data
 * @access  Private (requires contacts_view permission)
 */
router.post(
  '/enrich-lead/:leadId',
  authenticate,
  hasPermission('contacts_view'),
  logActivity('ai_enrich_lead'),
  async (req, res) => {
    try {
      const { leadId } = req.params;
      const { workspaceId } = req.body;

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: workspaceId'
        });
      }

      const enrichedData = await bridge.enrichLead(leadId, workspaceId);

      res.json({
        success: true,
        message: 'Lead enriched successfully',
        data: enrichedData
      });

    } catch (error) {
      console.error('Error enriching lead:', error);
      res.status(500).json({
        success: false,
        message: 'Error enriching lead',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/integration/ai-to-crm/lead-score/:leadId
 * @desc    Calculate AI-powered lead score
 * @access  Private (requires contacts_view permission)
 */
router.get(
  '/lead-score/:leadId',
  authenticate,
  hasPermission('contacts_view'),
  async (req, res) => {
    try {
      const { leadId } = req.params;
      const { workspaceId } = req.query;

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required query parameter: workspaceId'
        });
      }

      const scoreData = await bridge.updateLeadScoreWithAI(leadId, workspaceId);

      res.json({
        success: true,
        message: 'Lead score calculated successfully',
        data: scoreData
      });

    } catch (error) {
      console.error('Error calculating lead score:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating lead score',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/integration/ai-to-crm/batch-process
 * @desc    Batch process multiple AI interactions
 * @access  Private (requires ai_access permission)
 */
router.post(
  '/batch-process',
  authenticate,
  hasPermission('ai_access'),
  logActivity('ai_batch_process'),
  async (req, res) => {
    try {
      const { interactions, workspaceId } = req.body;

      if (!interactions || !Array.isArray(interactions) || interactions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing or invalid interactions array'
        });
      }

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: workspaceId'
        });
      }

      const results = [];
      const errors = [];

      for (const interaction of interactions) {
        try {
          const result = await bridge.processAgentInteraction(
            interaction.agentId,
            interaction.data,
            req.user._id,
            workspaceId
          );
          results.push({
            agentId: interaction.agentId,
            success: true,
            result
          });
        } catch (error) {
          errors.push({
            agentId: interaction.agentId,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: 'Batch processing completed',
        data: {
          totalProcessed: interactions.length,
          successful: results.length,
          failed: errors.length,
          results,
          errors
        }
      });

    } catch (error) {
      console.error('Error in batch processing:', error);
      res.status(500).json({
        success: false,
        message: 'Error in batch processing',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/integration/ai-to-crm/stats/:workspaceId
 * @desc    Get AI to CRM integration statistics
 * @access  Private (requires workspace_view permission)
 */
router.get(
  '/stats/:workspaceId',
  authenticate,
  hasPermission('workspace_view'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { startDate, endDate } = req.query;

      const Contact = require('../../models/Contact');
      const Deal = require('../../models/Deal');
      const Activity = require('../../models/Activity');

      // Build date filter
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);

      // Count AI-generated leads
      const aiLeads = await Contact.countDocuments({
        workspace: workspaceId,
        tags: 'ai-generated',
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      });

      // Count AI-generated deals
      const aiDeals = await Deal.countDocuments({
        workspace: workspaceId,
        tags: 'ai-generated',
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      });

      // Count AI interactions
      const aiInteractions = await Activity.countDocuments({
        workspace: workspaceId,
        type: 'ai_interaction',
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      });

      // Get conversion rate
      const aiLeadsToDeals = aiDeals > 0 && aiLeads > 0 
        ? Math.round((aiDeals / aiLeads) * 100) 
        : 0;

      // Get average lead score
      const aiLeadsWithScores = await Contact.find({
        workspace: workspaceId,
        tags: 'ai-generated',
        leadScore: { $exists: true, $gt: 0 }
      }).select('leadScore');

      const avgLeadScore = aiLeadsWithScores.length > 0
        ? Math.round(
            aiLeadsWithScores.reduce((sum, lead) => sum + lead.leadScore, 0) / 
            aiLeadsWithScores.length
          )
        : 0;

      res.json({
        success: true,
        data: {
          aiLeads,
          aiDeals,
          aiInteractions,
          conversionRate: aiLeadsToDeals,
          averageLeadScore: avgLeadScore,
          period: {
            start: startDate || 'all time',
            end: endDate || 'now'
          }
        }
      });

    } catch (error) {
      console.error('Error getting AI to CRM stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting statistics',
        error: error.message
      });
    }
  }
);

module.exports = router;
