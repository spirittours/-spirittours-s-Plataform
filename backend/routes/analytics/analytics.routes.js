/**
 * Analytics API Routes
 */

const express = require('express');
const router = express.Router();
const { getAnalyticsService } = require('../../services/analytics/AnalyticsService');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);

// GET /api/analytics/realtime - Real-time metrics
router.get('/realtime', async (req, res) => {
  try {
    const { timeRange = 'hour' } = req.query;
    const analytics = getAnalyticsService();
    const metrics = analytics.getRealTimeMetrics(timeRange);
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/analytics/usage - Usage statistics
router.get('/usage', async (req, res) => {
  try {
    const { period = 'day' } = req.query;
    const analytics = getAnalyticsService();
    const stats = analytics.getUsageStatistics(period);
    res.json({ success: true, statistics: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/analytics/costs - Cost breakdown
router.get('/costs', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const analytics = getAnalyticsService();
    const breakdown = analytics.getCostBreakdown(startDate, endDate);
    res.json({ success: true, breakdown });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/analytics/performance - Performance metrics
router.get('/performance', async (req, res) => {
  try {
    const analytics = getAnalyticsService();
    const metrics = analytics.getPerformanceMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/analytics/export - Export metrics
router.get('/export', async (req, res) => {
  try {
    const analytics = getAnalyticsService();
    const data = analytics.exportMetrics();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
