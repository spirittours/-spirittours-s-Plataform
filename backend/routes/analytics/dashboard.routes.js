const express = require('express');
const router = express.Router();
const UnifiedAnalyticsService = require('../../services/analytics/UnifiedAnalyticsService');
const { authenticateToken } = require('../../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/analytics/:workspaceId/dashboard
 * @desc    Get complete dashboard metrics
 * @access  Private
 */
router.get('/:workspaceId/dashboard', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { dateRange = '30d' } = req.query;

    const metrics = await UnifiedAnalyticsService.getDashboardMetrics(
      workspaceId,
      dateRange
    );

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics',
    });
  }
});

/**
 * @route   GET /api/analytics/:workspaceId/crm
 * @desc    Get CRM-specific metrics
 * @access  Private
 */
router.get('/:workspaceId/crm', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { dateRange = '30d' } = req.query;

    const { startDate, endDate } =
      UnifiedAnalyticsService.parseDateRange(dateRange);
    const metrics = await UnifiedAnalyticsService.getCRMMetrics(
      workspaceId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching CRM metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch CRM metrics',
    });
  }
});

/**
 * @route   GET /api/analytics/:workspaceId/sales
 * @desc    Get sales metrics (deals, pipeline, revenue)
 * @access  Private
 */
router.get('/:workspaceId/sales', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { dateRange = '30d' } = req.query;

    const { startDate, endDate } =
      UnifiedAnalyticsService.parseDateRange(dateRange);
    const metrics = await UnifiedAnalyticsService.getSalesMetrics(
      workspaceId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching sales metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales metrics',
    });
  }
});

/**
 * @route   GET /api/analytics/:workspaceId/activity
 * @desc    Get activity & engagement metrics
 * @access  Private
 */
router.get('/:workspaceId/activity', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { dateRange = '30d' } = req.query;

    const { startDate, endDate } =
      UnifiedAnalyticsService.parseDateRange(dateRange);
    const metrics = await UnifiedAnalyticsService.getActivityMetrics(
      workspaceId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching activity metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity metrics',
    });
  }
});

/**
 * @route   GET /api/analytics/:workspaceId/projects
 * @desc    Get project metrics
 * @access  Private
 */
router.get('/:workspaceId/projects', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { dateRange = '30d' } = req.query;

    const { startDate, endDate } =
      UnifiedAnalyticsService.parseDateRange(dateRange);
    const metrics = await UnifiedAnalyticsService.getProjectMetrics(
      workspaceId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching project metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project metrics',
    });
  }
});

/**
 * @route   GET /api/analytics/:workspaceId/automation
 * @desc    Get workflow automation metrics
 * @access  Private
 */
router.get('/:workspaceId/automation', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { dateRange = '30d' } = req.query;

    const { startDate, endDate } =
      UnifiedAnalyticsService.parseDateRange(dateRange);
    const metrics = await UnifiedAnalyticsService.getAutomationMetrics(
      workspaceId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching automation metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch automation metrics',
    });
  }
});

/**
 * @route   GET /api/analytics/:workspaceId/growth
 * @desc    Get growth metrics (MoM, YoY trends)
 * @access  Private
 */
router.get('/:workspaceId/growth', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { dateRange = '30d' } = req.query;

    const { startDate, endDate } =
      UnifiedAnalyticsService.parseDateRange(dateRange);
    const metrics = await UnifiedAnalyticsService.getGrowthMetrics(
      workspaceId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching growth metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch growth metrics',
    });
  }
});

/**
 * @route   GET /api/analytics/:workspaceId/export
 * @desc    Export analytics data as CSV/JSON
 * @access  Private
 */
router.get('/:workspaceId/export', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { dateRange = '30d', format = 'json' } = req.query;

    const metrics = await UnifiedAnalyticsService.getDashboardMetrics(
      workspaceId,
      dateRange
    );

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(metrics);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="analytics-${workspaceId}-${Date.now()}.csv"`
      );
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="analytics-${workspaceId}-${Date.now()}.json"`
      );
      res.json(metrics);
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics',
    });
  }
});

/**
 * Helper: Convert metrics to CSV
 */
function convertToCSV(metrics) {
  const rows = [];

  // Summary
  rows.push('SUMMARY');
  rows.push('Metric,Value');
  Object.entries(metrics.summary).forEach(([key, value]) => {
    rows.push(`${key},${value}`);
  });
  rows.push('');

  // CRM Metrics
  rows.push('CRM METRICS');
  rows.push('Metric,Value');
  Object.entries(metrics.crm).forEach(([key, value]) => {
    if (typeof value !== 'object') {
      rows.push(`${key},${value}`);
    }
  });
  rows.push('');

  // Sales Metrics
  rows.push('SALES METRICS');
  rows.push('Metric,Value');
  Object.entries(metrics.sales).forEach(([key, value]) => {
    if (typeof value !== 'object') {
      rows.push(`${key},${value}`);
    }
  });

  return rows.join('\n');
}

module.exports = router;
