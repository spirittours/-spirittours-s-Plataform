/**
 * Campaigns API Routes
 * Fase 8 - B2B Prospecting System
 * 
 * Endpoints for campaign management and orchestration
 */

const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/campaigns
 * List all campaigns with optional filtering
 * 
 * Query params:
 * - status: string (filter by status)
 * - page: number
 * - limit: number
 */
router.get('/', async (req, res) => {
  try {
    const {
      status = 'all',
      page = 1,
      limit = 25,
      sort = '-created_at'
    } = req.query;

    // Build query
    const query = {};
    if (status !== 'all') {
      query.status = status;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Execute query
    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('prospects', 'business_name business_type city country_code lead_score status')
        .lean(),
      Campaign.countDocuments(query)
    ]);

    res.json({
      success: true,
      campaigns,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/campaigns/:id
 * Get campaign details by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('prospects', 'business_name business_type city country_code lead_score status outreach')
      .lean();

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/campaigns
 * Create a new campaign
 * 
 * Body:
 * {
 *   name: string,
 *   description: string,
 *   targetCountries: string[],
 *   targetTypes: string[],
 *   targetCities: string[],
 *   minLeadScore: number,
 *   channels: string[],
 *   startDate: Date,
 *   endDate: Date,
 *   budget: number,
 *   goals: object
 * }
 */
router.post('/', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const campaignData = req.body;

    // Validate required fields
    if (!campaignData.name) {
      return res.status(400).json({
        success: false,
        error: 'Campaign name is required'
      });
    }

    // Get CampaignOrchestrator service
    const campaignOrchestrator = req.app.locals.campaignOrchestrator;

    if (!campaignOrchestrator) {
      return res.status(503).json({
        success: false,
        error: 'Campaign orchestration service not available'
      });
    }

    // Create campaign using orchestrator
    const campaign = await campaignOrchestrator.createCampaign(campaignData);

    res.status(201).json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/campaigns/:id
 * Update campaign
 */
router.put('/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const updates = req.body;
    updates.updated_at = new Date();

    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/campaigns/:id
 * Delete campaign
 */
router.delete('/:id', authorize(['admin']), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Only allow deletion of draft or cancelled campaigns
    if (!['draft', 'cancelled'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        error: 'Can only delete draft or cancelled campaigns'
      });
    }

    await campaign.deleteOne();

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/campaigns/:id/start
 * Start a campaign
 */
router.post('/:id/start', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const campaignOrchestrator = req.app.locals.campaignOrchestrator;

    if (!campaignOrchestrator) {
      return res.status(503).json({
        success: false,
        error: 'Campaign orchestration service not available'
      });
    }

    const campaign = await campaignOrchestrator.startCampaign(req.params.id);

    res.json({
      success: true,
      campaign,
      message: 'Campaign started successfully'
    });
  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/campaigns/:id/pause
 * Pause a campaign
 */
router.post('/:id/pause', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const campaignOrchestrator = req.app.locals.campaignOrchestrator;

    if (!campaignOrchestrator) {
      return res.status(503).json({
        success: false,
        error: 'Campaign orchestration service not available'
      });
    }

    const campaign = await campaignOrchestrator.pauseCampaign(req.params.id);

    res.json({
      success: true,
      campaign,
      message: 'Campaign paused successfully'
    });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/campaigns/:id/complete
 * Complete a campaign and generate final report
 */
router.post('/:id/complete', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const campaignOrchestrator = req.app.locals.campaignOrchestrator;

    if (!campaignOrchestrator) {
      return res.status(503).json({
        success: false,
        error: 'Campaign orchestration service not available'
      });
    }

    const { campaign, report } = await campaignOrchestrator.completeCampaign(req.params.id);

    res.json({
      success: true,
      campaign,
      report,
      message: 'Campaign completed successfully'
    });
  } catch (error) {
    console.error('Error completing campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/campaigns/:id/report
 * Get campaign report (can be called anytime, not just on completion)
 */
router.get('/:id/report', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const campaignOrchestrator = req.app.locals.campaignOrchestrator;

    if (!campaignOrchestrator) {
      return res.status(503).json({
        success: false,
        error: 'Campaign orchestration service not available'
      });
    }

    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const report = await campaignOrchestrator.generateCampaignReport(campaign);

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error generating campaign report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/campaigns/:id/prospects
 * Get prospects associated with a campaign
 */
router.get('/:id/prospects', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const campaign = await Campaign.findById(req.params.id)
      .populate({
        path: 'prospects',
        options: {
          skip: (parseInt(page) - 1) * parseInt(limit),
          limit: parseInt(limit)
        }
      });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      prospects: campaign.prospects,
      total: campaign.prospects.length
    });
  } catch (error) {
    console.error('Error fetching campaign prospects:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/campaigns/:id/add-prospects
 * Add prospects to a campaign
 * 
 * Body:
 * {
 *   prospectIds: string[]
 * }
 */
router.post('/:id/add-prospects', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { prospectIds } = req.body;

    if (!prospectIds || !Array.isArray(prospectIds)) {
      return res.status(400).json({
        success: false,
        error: 'prospectIds array is required'
      });
    }

    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Add prospects (avoid duplicates)
    const existingIds = campaign.prospects.map(id => id.toString());
    const newIds = prospectIds.filter(id => !existingIds.includes(id));

    campaign.prospects.push(...newIds);
    campaign.stats.totalProspects = campaign.prospects.length;
    campaign.updated_at = new Date();

    await campaign.save();

    res.json({
      success: true,
      campaign,
      added: newIds.length,
      message: `${newIds.length} prospects added to campaign`
    });
  } catch (error) {
    console.error('Error adding prospects to campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/campaigns/:id/remove-prospects
 * Remove prospects from a campaign
 * 
 * Body:
 * {
 *   prospectIds: string[]
 * }
 */
router.post('/:id/remove-prospects', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { prospectIds } = req.body;

    if (!prospectIds || !Array.isArray(prospectIds)) {
      return res.status(400).json({
        success: false,
        error: 'prospectIds array is required'
      });
    }

    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Remove prospects
    campaign.prospects = campaign.prospects.filter(
      id => !prospectIds.includes(id.toString())
    );
    campaign.stats.totalProspects = campaign.prospects.length;
    campaign.updated_at = new Date();

    await campaign.save();

    res.json({
      success: true,
      campaign,
      removed: prospectIds.length,
      message: `${prospectIds.length} prospects removed from campaign`
    });
  } catch (error) {
    console.error('Error removing prospects from campaign:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/campaigns/stats/overview
 * Get overview statistics for all campaigns
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const [
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalProspects,
      totalContacted,
      totalResponded,
      totalConverted
    ] = await Promise.all([
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: 'active' }),
      Campaign.countDocuments({ status: 'completed' }),
      Campaign.aggregate([
        { $group: { _id: null, total: { $sum: '$stats.totalProspects' } } }
      ]),
      Campaign.aggregate([
        { $group: { _id: null, total: { $sum: '$stats.contacted' } } }
      ]),
      Campaign.aggregate([
        { $group: { _id: null, total: { $sum: '$stats.responded' } } }
      ]),
      Campaign.aggregate([
        { $group: { _id: null, total: { $sum: '$stats.converted' } } }
      ])
    ]);

    const stats = {
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalProspects: totalProspects[0]?.total || 0,
      totalContacted: totalContacted[0]?.total || 0,
      totalResponded: totalResponded[0]?.total || 0,
      totalConverted: totalConverted[0]?.total || 0,
      responseRate: totalContacted[0]?.total > 0
        ? ((totalResponded[0]?.total || 0) / totalContacted[0].total * 100).toFixed(2) + '%'
        : '0%',
      conversionRate: totalContacted[0]?.total > 0
        ? ((totalConverted[0]?.total || 0) / totalContacted[0].total * 100).toFixed(2) + '%'
        : '0%'
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
