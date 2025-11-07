/**
 * Email Campaign to CRM Integration Routes
 * 
 * API endpoints for Email Campaigns → CRM Bridge
 * 
 * Sprint 1.2 - Email to CRM Integration
 */

const express = require('express');
const router = express.Router();
const EmailToCRMBridge = require('../../services/integration/EmailToCRMBridge');
const { authenticate } = require('../../middleware/auth');
const { hasPermission } = require('../../middleware/permissions');
const { logActivity } = require('../../middleware/auditLogger');

const bridge = new EmailToCRMBridge();

/**
 * @route   POST /api/integration/email-to-crm/response
 * @desc    Process email campaign response and create CRM records
 * @access  Private (requires campaigns_manage permission)
 */
router.post(
  '/response',
  authenticate,
  hasPermission('campaigns_manage'),
  logActivity('email_to_crm_response'),
  async (req, res) => {
    try {
      const { campaignId, response, workspaceId } = req.body;

      if (!campaignId || !response || !workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: campaignId, response, workspaceId'
        });
      }

      const result = await bridge.processCampaignResponse(
        campaignId,
        response,
        workspaceId
      );

      res.json({
        success: true,
        message: 'Email response processed successfully',
        data: result
      });

    } catch (error) {
      console.error('Error processing email to CRM response:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing email response',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/integration/email-to-crm/sync-campaign/:campaignId
 * @desc    Sync entire email campaign to CRM
 * @access  Private (requires campaigns_manage permission)
 */
router.post(
  '/sync-campaign/:campaignId',
  authenticate,
  hasPermission('campaigns_manage'),
  logActivity('email_campaign_sync'),
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { campaignData, workspaceId } = req.body;

      if (!workspaceId || !campaignData) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: workspaceId, campaignData'
        });
      }

      const result = await bridge.syncCampaignToCRM(
        campaignId,
        campaignData,
        workspaceId
      );

      res.json({
        success: true,
        message: 'Campaign synced successfully',
        data: result
      });

    } catch (error) {
      console.error('Error syncing campaign to CRM:', error);
      res.status(500).json({
        success: false,
        message: 'Error syncing campaign',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/integration/email-to-crm/campaign-impact/:campaignId
 * @desc    Get CRM impact metrics for email campaign
 * @access  Private (requires campaigns_view permission)
 */
router.get(
  '/campaign-impact/:campaignId',
  authenticate,
  hasPermission('campaigns_view'),
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { workspaceId } = req.query;

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required query parameter: workspaceId'
        });
      }

      const impact = await bridge.getCampaignCRMImpact(campaignId, workspaceId);

      res.json({
        success: true,
        message: 'Campaign CRM impact retrieved successfully',
        data: impact
      });

    } catch (error) {
      console.error('Error getting campaign CRM impact:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting campaign impact',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/integration/email-to-crm/webhook/response
 * @desc    Webhook endpoint for real-time email responses
 * @access  Public (with API key validation)
 */
router.post(
  '/webhook/response',
  async (req, res) => {
    try {
      // Validate API key from header
      const apiKey = req.headers['x-api-key'];
      const validApiKey = process.env.EMAIL_WEBHOOK_API_KEY;

      if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or missing API key'
        });
      }

      const { campaignId, response, workspaceId } = req.body;

      if (!campaignId || !response || !workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Process response asynchronously
      bridge.processCampaignResponse(campaignId, response, workspaceId)
        .then(result => {
          console.log('Webhook response processed:', result);
        })
        .catch(error => {
          console.error('Webhook processing error:', error);
        });

      // Return immediately
      res.json({
        success: true,
        message: 'Response received and queued for processing'
      });

    } catch (error) {
      console.error('Error in webhook endpoint:', error);
      res.status(500).json({
        success: false,
        message: 'Webhook processing error',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/integration/email-to-crm/batch-responses
 * @desc    Batch process multiple email responses
 * @access  Private (requires campaigns_manage permission)
 */
router.post(
  '/batch-responses',
  authenticate,
  hasPermission('campaigns_manage'),
  logActivity('email_batch_responses'),
  async (req, res) => {
    try {
      const { responses, workspaceId } = req.body;

      if (!responses || !Array.isArray(responses) || responses.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing or invalid responses array'
        });
      }

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: workspaceId'
        });
      }

      const results = {
        total: responses.length,
        processed: 0,
        leadsCreated: 0,
        leadsUpdated: 0,
        dealsCreated: 0,
        errors: []
      };

      for (const item of responses) {
        try {
          const result = await bridge.processCampaignResponse(
            item.campaignId,
            item.response,
            workspaceId
          );

          results.processed++;
          
          if (result.action === 'contact_created') {
            results.leadsCreated++;
          } else if (result.action === 'contact_updated') {
            results.leadsUpdated++;
          }
          
          if (result.dealId) {
            results.dealsCreated++;
          }

        } catch (error) {
          results.errors.push({
            campaignId: item.campaignId,
            email: item.response?.email,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: 'Batch processing completed',
        data: results
      });

    } catch (error) {
      console.error('Error in batch processing:', error);
      res.status(500).json({
        success: false,
        message: 'Batch processing error',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/integration/email-to-crm/stats/:workspaceId
 * @desc    Get email to CRM integration statistics
 * @access  Private (requires workspace_view permission)
 */
router.get(
  '/stats/:workspaceId',
  authenticate,
  hasPermission('workspace_view'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { startDate, endDate, campaignType } = req.query;

      const Contact = require('../../models/Contact');
      const Deal = require('../../models/Deal');

      // Build filters
      const contactFilter = {
        workspace: workspaceId,
        tags: 'email-campaign'
      };

      const dealFilter = {
        workspace: workspaceId,
        source: { $regex: 'Email Campaign' }
      };

      // Add date filter
      if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        
        contactFilter.createdAt = dateFilter;
        dealFilter.createdAt = dateFilter;
      }

      // Add campaign type filter
      if (campaignType) {
        contactFilter['customFields.campaignType'] = campaignType;
      }

      // Count contacts
      const totalLeads = await Contact.countDocuments(contactFilter);
      const hotLeads = await Contact.countDocuments({ ...contactFilter, leadQuality: 'hot' });
      const warmLeads = await Contact.countDocuments({ ...contactFilter, leadQuality: 'warm' });
      const coldLeads = await Contact.countDocuments({ ...contactFilter, leadQuality: 'cold' });

      // Count deals
      const totalDeals = await Deal.countDocuments(dealFilter);
      const wonDeals = await Deal.countDocuments({ ...dealFilter, stage: 'won' });
      const activeDeals = await Deal.countDocuments({ 
        ...dealFilter, 
        stage: { $nin: ['won', 'lost'] } 
      });

      // Calculate deal value
      const dealAggregation = await Deal.aggregate([
        { $match: dealFilter },
        { 
          $group: { 
            _id: null, 
            totalValue: { $sum: '$value' },
            wonValue: { 
              $sum: { 
                $cond: [{ $eq: ['$stage', 'won'] }, '$value', 0] 
              }
            }
          }
        }
      ]);

      const dealValues = dealAggregation[0] || { totalValue: 0, wonValue: 0 };

      // Calculate metrics
      const conversionRate = totalLeads > 0
        ? Math.round((totalDeals / totalLeads) * 100)
        : 0;

      const winRate = totalDeals > 0
        ? Math.round((wonDeals / totalDeals) * 100)
        : 0;

      const avgLeadScore = totalLeads > 0
        ? Math.round(
            (await Contact.find(contactFilter).select('leadScore'))
              .reduce((sum, c) => sum + (c.leadScore || 0), 0) / totalLeads
          )
        : 0;

      res.json({
        success: true,
        data: {
          leads: {
            total: totalLeads,
            hot: hotLeads,
            warm: warmLeads,
            cold: coldLeads,
            avgScore: avgLeadScore
          },
          deals: {
            total: totalDeals,
            active: activeDeals,
            won: wonDeals,
            totalValue: dealValues.totalValue,
            wonValue: dealValues.wonValue
          },
          metrics: {
            conversionRate,
            winRate,
            roi: dealValues.wonValue
          },
          period: {
            start: startDate || 'all time',
            end: endDate || 'now',
            campaignType: campaignType || 'all'
          }
        }
      });

    } catch (error) {
      console.error('Error getting email to CRM stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting statistics',
        error: error.message
      });
    }
  }
);

module.exports = router;
