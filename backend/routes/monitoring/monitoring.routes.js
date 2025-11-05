/**
 * Monitoring API Routes
 */

const express = require('express');
const router = express.Router();
const { getHealthCheckService } = require('../../services/monitoring/HealthCheckService');

// GET /api/monitoring/health - Full health check
router.get('/health', async (req, res) => {
  try {
    const health = getHealthCheckService();
    const results = await health.runAllChecks();
    
    const statusCode = results.status === 'healthy' ? 200 : 
                       results.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(results);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// GET /api/monitoring/health/:check - Single health check
router.get('/health/:check', async (req, res) => {
  try {
    const health = getHealthCheckService();
    const result = await health.runCheck(req.params.check);
    res.json({ success: true, check: req.params.check, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/monitoring/system - System information
router.get('/system', async (req, res) => {
  try {
    const health = getHealthCheckService();
    const info = health.getSystemInfo();
    res.json({ success: true, system: info });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
