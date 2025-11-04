/**
 * Audit Logs Routes
 * 
 * Access and manage audit logs for compliance and security
 */

const express = require('express');
const router = express.Router();
const AuditLog = require('../../models/AuditLog');
const { hasPermission } = require('../../middleware/permissions');

/**
 * GET /api/crm/audit/:workspaceId
 * Get audit logs with filtering
 */
router.get('/:workspaceId', hasPermission('security', 'viewAuditLogs'), async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const {
      user,
      action,
      resourceType,
      resourceId,
      severity,
      startDate,
      endDate,
      limit = 100,
      page = 1,
    } = req.query;

    const logs = await AuditLog.getTimeline(workspaceId, {
      user,
      action,
      resourceType,
      resourceId,
      severity,
      startDate,
      endDate,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
    });

    const totalCount = await AuditLog.countDocuments({
      workspace: workspaceId,
      ...(user && { user }),
      ...(action && { action }),
      ...(resourceType && { resourceType }),
      ...(severity && { severity }),
    });

    res.json({
      logs,
      totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/crm/audit/:workspaceId/statistics
 * Get audit log statistics
 */
router.get('/:workspaceId/statistics', hasPermission('security', 'viewAuditLogs'), async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await AuditLog.getStatistics(workspaceId, { startDate, endDate });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/crm/audit/:workspaceId/compliance-report
 * Generate compliance report
 */
router.get('/:workspaceId/compliance-report', hasPermission('security', 'viewAuditLogs'), async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const report = await AuditLog.getComplianceReport(workspaceId, startDate, endDate);

    res.json(report);
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /api/crm/audit/:workspaceId/search
 * Search audit logs
 */
router.get('/:workspaceId/search', hasPermission('security', 'viewAuditLogs'), async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { q, user, action, severity, limit = 50 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const logs = await AuditLog.searchLogs(workspaceId, q, {
      user,
      action,
      severity,
      limit: parseInt(limit),
    });

    res.json({
      logs,
      totalCount: logs.length,
      query: q,
    });
  } catch (error) {
    console.error('Error searching audit logs:', error);
    res.status(500).json({ error: 'Failed to search logs' });
  }
});

/**
 * GET /api/crm/audit/:workspaceId/resource/:resourceType/:resourceId
 * Get audit logs for specific resource
 */
router.get('/:workspaceId/resource/:resourceType/:resourceId', hasPermission('security', 'viewAuditLogs'), async (req, res) => {
  try {
    const { workspaceId, resourceType, resourceId } = req.params;
    const { limit = 50 } = req.query;

    const logs = await AuditLog.find({
      workspace: workspaceId,
      resourceType,
      resourceId,
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('user', 'firstName lastName email')
      .lean();

    res.json({
      logs,
      totalCount: logs.length,
      resourceType,
      resourceId,
    });
  } catch (error) {
    console.error('Error fetching resource audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch resource logs' });
  }
});

/**
 * GET /api/crm/audit/:workspaceId/user/:userId
 * Get audit logs for specific user
 */
router.get('/:workspaceId/user/:userId', hasPermission('security', 'viewAuditLogs'), async (req, res) => {
  try {
    const { workspaceId, userId } = req.params;
    const { limit = 100, startDate, endDate } = req.query;

    const query = {
      workspace: workspaceId,
      user: userId,
    };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      logs,
      totalCount: logs.length,
      userId,
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch user logs' });
  }
});

/**
 * GET /api/crm/audit/:workspaceId/export
 * Export audit logs (CSV format)
 */
router.get('/:workspaceId/export', hasPermission('dataExport', 'exportAll'), async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate, format = 'csv' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required for export' });
    }

    const logs = await AuditLog.find({
      workspace: workspaceId,
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    })
      .sort({ timestamp: 1 })
      .populate('user', 'firstName lastName email')
      .lean();

    if (format === 'csv') {
      // Generate CSV
      const csv = generateCSV(logs);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${startDate}-${endDate}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        logs,
        totalCount: logs.length,
        period: { startDate, endDate },
      });
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ error: 'Failed to export logs' });
  }
});

/**
 * DELETE /api/crm/audit/:workspaceId/cleanup
 * Clean up old audit logs (admin only)
 */
router.delete('/:workspaceId/cleanup', hasPermission('security', 'manageSecurity'), async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { daysToKeep = 90 } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysToKeep));

    const result = await AuditLog.deleteMany({
      workspace: workspaceId,
      timestamp: { $lt: cutoffDate },
      severity: { $nin: ['critical'] }, // Keep critical logs
    });

    console.log(`Cleaned up ${result.deletedCount} audit logs older than ${daysToKeep} days`);
    res.json({
      message: 'Audit logs cleaned up successfully',
      deletedCount: result.deletedCount,
      cutoffDate,
    });
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    res.status(500).json({ error: 'Failed to clean up logs' });
  }
});

/**
 * Helper function to generate CSV
 */
const generateCSV = (logs) => {
  const headers = [
    'Timestamp',
    'User',
    'Action',
    'Resource Type',
    'Resource ID',
    'Severity',
    'IP Address',
    'Status',
    'Duration (ms)',
    'Success',
  ];

  const rows = logs.map(log => [
    log.timestamp,
    log.userName || log.userEmail || 'System',
    log.action,
    log.resourceType || '-',
    log.resourceId || '-',
    log.severity,
    log.request?.ip || '-',
    log.response?.status || '-',
    log.response?.duration || '-',
    log.response?.success ? 'Yes' : 'No',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
};

module.exports = router;
