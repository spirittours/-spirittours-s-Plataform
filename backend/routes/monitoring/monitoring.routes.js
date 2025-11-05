const express = require('express');
const router = express.Router();
const MonitoringService = require('../../services/monitoring/MonitoringService');
const AlertSystem = require('../../services/monitoring/AlertSystem');
const { authenticate, requireRole } = require('../../middleware/auth');

/**
 * @route   GET /api/monitoring/metrics
 * @desc    Get current system metrics
 * @access  Private (Admin only)
 */
router.get(
  '/metrics',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const metrics = MonitoringService.getMetrics();

      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      console.error('Get metrics error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/monitoring/health
 * @desc    Get system health status
 * @access  Public
 */
router.get(
  '/health',
  async (req, res) => {
    try {
      const health = MonitoringService.getHealthStatus();

      const statusCode = health.status === 'healthy' ? 200 :
                        health.status === 'degraded' ? 200 :
                        503;

      res.status(statusCode).json({
        success: true,
        health
      });

    } catch (error) {
      console.error('Get health status error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/monitoring/alerts
 * @desc    Get active alerts
 * @access  Private (Admin only)
 */
router.get(
  '/alerts',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const filters = {
        severity: req.query.severity,
        category: req.query.category,
        ruleId: req.query.ruleId
      };

      const alerts = AlertSystem.getActiveAlerts(filters);

      res.json({
        success: true,
        alerts,
        count: alerts.length
      });

    } catch (error) {
      console.error('Get alerts error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/monitoring/alerts/:alertId/acknowledge
 * @desc    Acknowledge an alert
 * @access  Private (Admin only)
 */
router.post(
  '/alerts/:alertId/acknowledge',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { alertId } = req.params;
      const alert = AlertSystem.acknowledgeAlert(alertId, req.user._id);

      res.json({
        success: true,
        message: 'Alert acknowledged successfully',
        alert
      });

    } catch (error) {
      console.error('Acknowledge alert error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/monitoring/alerts/:alertId/resolve
 * @desc    Resolve an alert
 * @access  Private (Admin only)
 */
router.post(
  '/alerts/:alertId/resolve',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { alertId } = req.params;
      const { resolution } = req.body;

      const alert = AlertSystem.resolveAlert(alertId, req.user._id, resolution);

      res.json({
        success: true,
        message: 'Alert resolved successfully',
        alert
      });

    } catch (error) {
      console.error('Resolve alert error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/monitoring/alerts/:alertId/snooze
 * @desc    Snooze an alert
 * @access  Private (Admin only)
 */
router.post(
  '/alerts/:alertId/snooze',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { alertId } = req.params;
      const { duration } = req.body;

      const alert = AlertSystem.snoozeAlert(alertId, duration, req.user._id);

      res.json({
        success: true,
        message: 'Alert snoozed successfully',
        alert
      });

    } catch (error) {
      console.error('Snooze alert error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/monitoring/alerts/history
 * @desc    Get alert history
 * @access  Private (Admin only)
 */
router.get(
  '/alerts/history',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const filters = {
        type: req.query.type,
        severity: req.query.severity,
        since: req.query.since ? parseInt(req.query.since) : null
      };

      const history = AlertSystem.getHistory(filters);

      res.json({
        success: true,
        history,
        count: history.length
      });

    } catch (error) {
      console.error('Get alert history error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/monitoring/alerts/rules
 * @desc    Register a new alert rule
 * @access  Private (Admin only)
 */
router.post(
  '/alerts/rules',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const rule = req.body;

      if (!rule.name || !rule.condition) {
        return res.status(400).json({
          success: false,
          error: 'Name and condition are required'
        });
      }

      const ruleId = AlertSystem.registerRule(rule);

      res.status(201).json({
        success: true,
        message: 'Alert rule registered successfully',
        ruleId
      });

    } catch (error) {
      console.error('Register alert rule error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/monitoring/alerts/rules
 * @desc    List all alert rules
 * @access  Private (Admin only)
 */
router.get(
  '/alerts/rules',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const rules = AlertSystem.listRules();

      res.json({
        success: true,
        rules,
        count: rules.length
      });

    } catch (error) {
      console.error('List alert rules error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/monitoring/alerts/trigger
 * @desc    Manually trigger an alert (for testing)
 * @access  Private (Admin only)
 */
router.post(
  '/alerts/trigger',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { ruleId, context } = req.body;

      if (!ruleId) {
        return res.status(400).json({
          success: false,
          error: 'Rule ID is required'
        });
      }

      const alert = await AlertSystem.triggerAlert(ruleId, context);

      res.json({
        success: true,
        message: 'Alert triggered successfully',
        alert
      });

    } catch (error) {
      console.error('Trigger alert error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/monitoring/stats
 * @desc    Get monitoring and alert statistics
 * @access  Private (Admin only)
 */
router.get(
  '/stats',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const alertStats = AlertSystem.getStats();

      res.json({
        success: true,
        stats: {
          alerts: alertStats
        }
      });

    } catch (error) {
      console.error('Get monitoring stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/monitoring/reset
 * @desc    Reset monitoring metrics (for testing)
 * @access  Private (Admin only)
 */
router.post(
  '/reset',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      MonitoringService.resetMetrics();

      res.json({
        success: true,
        message: 'Monitoring metrics reset successfully'
      });

    } catch (error) {
      console.error('Reset metrics error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   DELETE /api/monitoring/alerts
 * @desc    Clear all alerts
 * @access  Private (Admin only)
 */
router.delete(
  '/alerts',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const cleared = AlertSystem.clearAlerts();

      res.json({
        success: true,
        message: `Cleared ${cleared} alerts`,
        clearedCount: cleared
      });

    } catch (error) {
      console.error('Clear alerts error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
