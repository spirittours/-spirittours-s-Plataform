/**
 * Prospecting Control API Routes
 * Fase 8 - B2B Prospecting System
 * 
 * Endpoints for controlling the automated prospecting agent
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/prospecting/status
 * Get current status of the prospecting agent
 * 
 * Returns:
 * {
 *   running: boolean,
 *   uptime: number,
 *   lastCycleAt: Date,
 *   nextCycleAt: Date,
 *   config: object
 * }
 */
router.get('/status', async (req, res) => {
  try {
    const prospectingAgent = req.app.locals.prospectingAgent;

    if (!prospectingAgent) {
      return res.status(503).json({
        success: false,
        error: 'Prospecting agent not available'
      });
    }

    const status = {
      running: prospectingAgent.running,
      config: {
        runInterval: prospectingAgent.config.runInterval,
        targetCountries: prospectingAgent.config.targetCountries,
        clientTypes: prospectingAgent.config.clientTypes.map(t => ({
          type: t.type,
          name: t.name,
          priority: t.priority
        })),
        aiEnabled: prospectingAgent.config.useAI
      }
    };

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting prospecting status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/prospecting/start
 * Start the automated prospecting agent (24/7 mode)
 * 
 * Requires admin or manager role
 */
router.post('/start', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const prospectingAgent = req.app.locals.prospectingAgent;

    if (!prospectingAgent) {
      return res.status(503).json({
        success: false,
        error: 'Prospecting agent not available'
      });
    }

    if (prospectingAgent.running) {
      return res.status(400).json({
        success: false,
        error: 'Prospecting agent is already running'
      });
    }

    // Start automated prospecting
    prospectingAgent.startAutomatedProspecting();

    res.json({
      success: true,
      message: 'Prospecting agent started successfully',
      status: {
        running: true,
        interval: prospectingAgent.config.runInterval,
        nextCycle: 'In progress or scheduled'
      }
    });
  } catch (error) {
    console.error('Error starting prospecting agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/prospecting/stop
 * Stop the automated prospecting agent
 * 
 * Requires admin or manager role
 */
router.post('/stop', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const prospectingAgent = req.app.locals.prospectingAgent;

    if (!prospectingAgent) {
      return res.status(503).json({
        success: false,
        error: 'Prospecting agent not available'
      });
    }

    if (!prospectingAgent.running) {
      return res.status(400).json({
        success: false,
        error: 'Prospecting agent is not running'
      });
    }

    // Stop automated prospecting
    prospectingAgent.stopAutomatedProspecting();

    res.json({
      success: true,
      message: 'Prospecting agent stopped successfully',
      status: {
        running: false
      }
    });
  } catch (error) {
    console.error('Error stopping prospecting agent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/prospecting/stats
 * Get prospecting statistics
 * 
 * Returns real-time statistics from the prospecting agent
 */
router.get('/stats', async (req, res) => {
  try {
    const prospectingAgent = req.app.locals.prospectingAgent;

    if (!prospectingAgent) {
      return res.status(503).json({
        success: false,
        error: 'Prospecting agent not available'
      });
    }

    const stats = prospectingAgent.getStatistics();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting prospecting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/prospecting/run-cycle
 * Manually trigger a single prospecting cycle
 * 
 * Useful for testing or on-demand prospecting
 * Requires admin or manager role
 */
router.post('/run-cycle', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const prospectingAgent = req.app.locals.prospectingAgent;

    if (!prospectingAgent) {
      return res.status(503).json({
        success: false,
        error: 'Prospecting agent not available'
      });
    }

    // Run a single prospecting cycle
    const results = await prospectingAgent.runProspectingCycle();

    res.json({
      success: true,
      message: 'Prospecting cycle completed',
      results
    });
  } catch (error) {
    console.error('Error running prospecting cycle:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/prospecting/prospect-specific
 * Prospect for a specific client type and country
 * 
 * Body:
 * {
 *   clientType: string,
 *   countryCode: string,
 *   limit: number (optional)
 * }
 */
router.post('/prospect-specific', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { clientType, countryCode, limit = 10 } = req.body;

    if (!clientType || !countryCode) {
      return res.status(400).json({
        success: false,
        error: 'clientType and countryCode are required'
      });
    }

    const prospectingAgent = req.app.locals.prospectingAgent;

    if (!prospectingAgent) {
      return res.status(503).json({
        success: false,
        error: 'Prospecting agent not available'
      });
    }

    // Find client type config
    const clientTypeConfig = prospectingAgent.config.clientTypes.find(
      t => t.type === clientType
    );

    if (!clientTypeConfig) {
      return res.status(400).json({
        success: false,
        error: `Invalid client type: ${clientType}`
      });
    }

    // Prospect for specific type and country
    const prospects = await prospectingAgent.prospectClientType(
      clientTypeConfig,
      countryCode
    );

    // Process prospects (enrich, verify, save)
    const processed = [];
    for (const prospect of prospects.slice(0, limit)) {
      try {
        const enriched = await prospectingAgent.enrichProspect(prospect);
        const verified = await prospectingAgent.verifyProspect(enriched);
        const saved = await prospectingAgent.saveProspect(verified);
        if (saved) processed.push(saved);
      } catch (error) {
        console.error('Error processing prospect:', error);
      }
    }

    res.json({
      success: true,
      message: `Found and processed ${processed.length} prospects`,
      prospects: processed
    });
  } catch (error) {
    console.error('Error prospecting specific type:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/prospecting/config
 * Update prospecting configuration
 * 
 * Body:
 * {
 *   runInterval: number,
 *   targetCountries: string[],
 *   minLeadScore: number,
 *   useAI: boolean
 * }
 */
router.put('/config', authorize(['admin']), async (req, res) => {
  try {
    const prospectingAgent = req.app.locals.prospectingAgent;

    if (!prospectingAgent) {
      return res.status(503).json({
        success: false,
        error: 'Prospecting agent not available'
      });
    }

    const updates = req.body;

    // Update configuration
    if (updates.runInterval !== undefined) {
      prospectingAgent.config.runInterval = updates.runInterval;
    }

    if (updates.targetCountries !== undefined) {
      prospectingAgent.config.targetCountries = updates.targetCountries;
    }

    if (updates.minLeadScore !== undefined) {
      prospectingAgent.config.minLeadScore = updates.minLeadScore;
    }

    if (updates.useAI !== undefined) {
      prospectingAgent.config.useAI = updates.useAI;
    }

    // If agent is running, restart it with new config
    if (prospectingAgent.running) {
      prospectingAgent.stopAutomatedProspecting();
      prospectingAgent.startAutomatedProspecting();
    }

    res.json({
      success: true,
      message: 'Prospecting configuration updated',
      config: {
        runInterval: prospectingAgent.config.runInterval,
        targetCountries: prospectingAgent.config.targetCountries,
        minLeadScore: prospectingAgent.config.minLeadScore,
        useAI: prospectingAgent.config.useAI
      }
    });
  } catch (error) {
    console.error('Error updating prospecting config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/prospecting/health
 * Health check for prospecting service
 */
router.get('/health', async (req, res) => {
  try {
    const prospectingAgent = req.app.locals.prospectingAgent;
    const enrichmentService = req.app.locals.enrichmentService;
    const scraperService = req.app.locals.scraperService;

    const health = {
      prospectingAgent: prospectingAgent ? 'healthy' : 'unavailable',
      enrichmentService: enrichmentService ? 'healthy' : 'unavailable',
      scraperService: scraperService ? 'healthy' : 'unavailable',
      timestamp: new Date().toISOString()
    };

    const allHealthy = Object.values(health).every(
      status => status === 'healthy' || status === new Date().toISOString()
    );

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      health
    });
  } catch (error) {
    console.error('Error checking prospecting health:', error);
    res.status(503).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/prospecting/client-types
 * Get available client types for prospecting
 */
router.get('/client-types', async (req, res) => {
  try {
    const prospectingAgent = req.app.locals.prospectingAgent;

    if (!prospectingAgent) {
      return res.status(503).json({
        success: false,
        error: 'Prospecting agent not available'
      });
    }

    const clientTypes = prospectingAgent.config.clientTypes.map(t => ({
      type: t.type,
      name: t.name,
      priority: t.priority,
      keywords: t.keywords
    }));

    res.json({
      success: true,
      clientTypes
    });
  } catch (error) {
    console.error('Error getting client types:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/prospecting/countries
 * Get target countries
 */
router.get('/countries', async (req, res) => {
  try {
    const prospectingAgent = req.app.locals.prospectingAgent;

    if (!prospectingAgent) {
      return res.status(503).json({
        success: false,
        error: 'Prospecting agent not available'
      });
    }

    const countries = prospectingAgent.config.targetCountries.map(code => ({
      code,
      name: prospectingAgent.getCountryName(code)
    }));

    res.json({
      success: true,
      countries
    });
  } catch (error) {
    console.error('Error getting countries:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
