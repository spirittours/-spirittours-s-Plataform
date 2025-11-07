/**
 * Outreach API Routes
 * Fase 8 - B2B Prospecting System
 * 
 * Endpoints for controlling outreach automation
 */

const express = require('express');
const router = express.Router();
const Prospect = require('../models/Prospect');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/outreach/status
 * Get current status of the outreach agent
 */
router.get('/status', async (req, res) => {
  try {
    const outreachAgent = req.app.locals.outreachAgent;

    if (!outreachAgent) {
      return res.status(503).json({
        success: false,
        error: 'Outreach agent not available'
      });
    }

    const status = {
      running: outreachAgent.running,
      config: {
        outreachInterval: outreachAgent.config.outreachInterval,
        channels: outreachAgent.config.channels,
        businessHours: outreachAgent.config.businessHours,
        followUpSchedule: outreachAgent.config.followUpSchedule
      }
    };

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting outreach status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/outreach/start
 * Start the automated outreach agent
 */
router.post('/start', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const outreachAgent = req.app.locals.outreachAgent;

    if (!outreachAgent) {
      return res.status(503).json({
        success: false,
        error: 'Outreach agent not available'
      });
    }

    if (outreachAgent.running) {
      return res.status(400).json({
        success: false,
        error: 'Outreach agent is already running'
      });
    }

    // Start automated outreach
    outreachAgent.startAutomatedOutreach();

    res.json({
      success: true,
      message: 'Outreach agent started successfully',
      status: {
        running: true,
        interval: outreachAgent.config.outreachInterval
      }
    });
  } catch (error) {
    console.error('Error starting outreach agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/outreach/stop
 * Stop the automated outreach agent
 */
router.post('/stop', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const outreachAgent = req.app.locals.outreachAgent;

    if (!outreachAgent) {
      return res.status(503).json({
        success: false,
        error: 'Outreach agent not available'
      });
    }

    if (!outreachAgent.running) {
      return res.status(400).json({
        success: false,
        error: 'Outreach agent is not running'
      });
    }

    // Stop automated outreach
    outreachAgent.stopAutomatedOutreach();

    res.json({
      success: true,
      message: 'Outreach agent stopped successfully',
      status: {
        running: false
      }
    });
  } catch (error) {
    console.error('Error stopping outreach agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/outreach/stats
 * Get outreach statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const outreachAgent = req.app.locals.outreachAgent;

    if (!outreachAgent) {
      return res.status(503).json({
        success: false,
        error: 'Outreach agent not available'
      });
    }

    const stats = outreachAgent.getStatistics();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting outreach stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/outreach/send
 * Send outreach to a specific prospect
 * 
 * Body:
 * {
 *   prospectId: string,
 *   channel: 'email' | 'whatsapp' | 'call',
 *   type: 'initial' | 'follow_up' | 'reminder'
 * }
 */
router.post('/send', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { prospectId, channel, type = 'initial' } = req.body;

    if (!prospectId || !channel) {
      return res.status(400).json({
        success: false,
        error: 'prospectId and channel are required'
      });
    }

    const outreachAgent = req.app.locals.outreachAgent;

    if (!outreachAgent) {
      return res.status(503).json({
        success: false,
        error: 'Outreach agent not available'
      });
    }

    // Get prospect
    const prospect = await Prospect.findById(prospectId);

    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect not found'
      });
    }

    // Validate channel availability
    if (channel === 'email' && !prospect.email) {
      return res.status(400).json({
        success: false,
        error: 'Prospect does not have an email address'
      });
    }

    if (channel === 'whatsapp' && !prospect.whatsapp) {
      return res.status(400).json({
        success: false,
        error: 'Prospect does not have a WhatsApp number'
      });
    }

    if (channel === 'call' && !prospect.phone && !prospect.phone_mobile) {
      return res.status(400).json({
        success: false,
        error: 'Prospect does not have a phone number'
      });
    }

    // Execute outreach
    const result = await outreachAgent.executeOutreach(prospect, {
      channel,
      type
    });

    res.json({
      success: true,
      message: `Outreach sent via ${channel}`,
      result
    });
  } catch (error) {
    console.error('Error sending outreach:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/outreach/batch
 * Send outreach to multiple prospects
 * 
 * Body:
 * {
 *   prospectIds: string[],
 *   channel: 'email' | 'whatsapp' | 'call',
 *   type: 'initial' | 'follow_up' | 'reminder'
 * }
 */
router.post('/batch', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { prospectIds, channel, type = 'initial' } = req.body;

    if (!prospectIds || !Array.isArray(prospectIds) || !channel) {
      return res.status(400).json({
        success: false,
        error: 'prospectIds array and channel are required'
      });
    }

    const outreachAgent = req.app.locals.outreachAgent;

    if (!outreachAgent) {
      return res.status(503).json({
        success: false,
        error: 'Outreach agent not available'
      });
    }

    // Get prospects
    const prospects = await Prospect.find({
      _id: { $in: prospectIds }
    });

    if (prospects.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No prospects found'
      });
    }

    // Execute outreach for each prospect
    const results = {
      total: prospects.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const prospect of prospects) {
      try {
        await outreachAgent.executeOutreach(prospect, { channel, type });
        results.sent++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        results.failed++;
        results.errors.push({
          prospectId: prospect._id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Batch outreach completed: ${results.sent} sent, ${results.failed} failed`,
      results
    });
  } catch (error) {
    console.error('Error sending batch outreach:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/outreach/response
 * Process a response from a prospect
 * 
 * Body:
 * {
 *   prospectId: string,
 *   channel: 'email' | 'whatsapp' | 'call',
 *   message: string,
 *   timestamp: Date
 * }
 */
router.post('/response', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { prospectId, channel, message, timestamp } = req.body;

    if (!prospectId || !channel || !message) {
      return res.status(400).json({
        success: false,
        error: 'prospectId, channel, and message are required'
      });
    }

    const outreachAgent = req.app.locals.outreachAgent;

    if (!outreachAgent) {
      return res.status(503).json({
        success: false,
        error: 'Outreach agent not available'
      });
    }

    // Process response
    await outreachAgent.processResponse(prospectId, {
      channel,
      message,
      timestamp: timestamp || new Date()
    });

    res.json({
      success: true,
      message: 'Response processed successfully'
    });
  } catch (error) {
    console.error('Error processing response:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/outreach/prospects-ready
 * Get prospects ready for outreach
 * 
 * Query params:
 * - channel: string (filter by channel)
 * - limit: number (default 50)
 */
router.get('/prospects-ready', async (req, res) => {
  try {
    const { channel, limit = 50 } = req.query;

    const outreachAgent = req.app.locals.outreachAgent;

    if (!outreachAgent) {
      return res.status(503).json({
        success: false,
        error: 'Outreach agent not available'
      });
    }

    // Get prospects ready for outreach
    const prospects = await outreachAgent.getProspectsForOutreach({
      channel,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      prospects,
      total: prospects.length
    });
  } catch (error) {
    console.error('Error getting prospects ready:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/outreach/schedule-followup
 * Schedule a follow-up for a prospect
 * 
 * Body:
 * {
 *   prospectId: string,
 *   channel: 'email' | 'whatsapp' | 'call',
 *   scheduledFor: Date,
 *   type: 'follow_up' | 'reminder'
 * }
 */
router.post('/schedule-followup', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { prospectId, channel, scheduledFor, type = 'follow_up' } = req.body;

    if (!prospectId || !channel || !scheduledFor) {
      return res.status(400).json({
        success: false,
        error: 'prospectId, channel, and scheduledFor are required'
      });
    }

    const prospect = await Prospect.findById(prospectId);

    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect not found'
      });
    }

    // In production, use a job scheduler like Bull or node-cron
    // For now, just update prospect metadata
    await Prospect.findByIdAndUpdate(prospectId, {
      $set: {
        'metadata.nextFollowUp': {
          channel,
          scheduledFor: new Date(scheduledFor),
          type
        }
      }
    });

    res.json({
      success: true,
      message: 'Follow-up scheduled successfully',
      scheduledFor: new Date(scheduledFor)
    });
  } catch (error) {
    console.error('Error scheduling follow-up:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/outreach/config
 * Update outreach configuration
 * 
 * Body:
 * {
 *   outreachInterval: number,
 *   channels: string[],
 *   businessHours: object,
 *   followUpSchedule: number[]
 * }
 */
router.put('/config', authorize(['admin']), async (req, res) => {
  try {
    const outreachAgent = req.app.locals.outreachAgent;

    if (!outreachAgent) {
      return res.status(503).json({
        success: false,
        error: 'Outreach agent not available'
      });
    }

    const updates = req.body;

    // Update configuration
    if (updates.outreachInterval !== undefined) {
      outreachAgent.config.outreachInterval = updates.outreachInterval;
    }

    if (updates.channels !== undefined) {
      outreachAgent.config.channels = updates.channels;
    }

    if (updates.businessHours !== undefined) {
      outreachAgent.config.businessHours = {
        ...outreachAgent.config.businessHours,
        ...updates.businessHours
      };
    }

    if (updates.followUpSchedule !== undefined) {
      outreachAgent.config.followUpSchedule = updates.followUpSchedule;
    }

    // If agent is running, restart it with new config
    if (outreachAgent.running) {
      outreachAgent.stopAutomatedOutreach();
      outreachAgent.startAutomatedOutreach();
    }

    res.json({
      success: true,
      message: 'Outreach configuration updated',
      config: {
        outreachInterval: outreachAgent.config.outreachInterval,
        channels: outreachAgent.config.channels,
        businessHours: outreachAgent.config.businessHours,
        followUpSchedule: outreachAgent.config.followUpSchedule
      }
    });
  } catch (error) {
    console.error('Error updating outreach config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/outreach/health
 * Health check for outreach service
 */
router.get('/health', async (req, res) => {
  try {
    const outreachAgent = req.app.locals.outreachAgent;
    const notificationService = req.app.locals.notificationService;

    const health = {
      outreachAgent: outreachAgent ? 'healthy' : 'unavailable',
      notificationService: notificationService ? 'healthy' : 'unavailable',
      businessHoursActive: outreachAgent ? outreachAgent.isBusinessHours() : false,
      timestamp: new Date().toISOString()
    };

    const allHealthy = health.outreachAgent === 'healthy' && 
                       health.notificationService === 'healthy';

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      health
    });
  } catch (error) {
    console.error('Error checking outreach health:', error);
    res.status(503).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
