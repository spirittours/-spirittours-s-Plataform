/**
 * Advanced Analytics Routes - Sprint 25 (Fase 7)
 * 
 * API endpoints for executive dashboards, trend analysis, and report generation.
 * 
 * Routes:
 * - GET  /:workspaceId/executive/kpis - Get executive KPIs
 * - GET  /:workspaceId/trends/:metric - Get time-series data for metric
 * - POST /:workspaceId/reports/generate - Generate report
 * - GET  /:workspaceId/reports/:reportId/download - Download generated report
 * - GET  /:workspaceId/reports - List generated reports
 * - POST /:workspaceId/reports/schedule - Schedule report generation
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getAdvancedAnalyticsService } = require('../../services/analytics/AdvancedAnalyticsService');
const { getTrendAnalysisService } = require('../../services/analytics/TrendAnalysisService');
const { getReportGeneratorService } = require('../../services/analytics/ReportGeneratorService');

// Initialize services
let analyticsService;
let trendService;
let reportService;

async function initializeServices() {
  if (!analyticsService) {
    analyticsService = getAdvancedAnalyticsService();
    await analyticsService.initialize();
  }
  
  if (!trendService) {
    trendService = getTrendAnalysisService();
    await trendService.initialize();
  }
  
  if (!reportService) {
    reportService = getReportGeneratorService();
    await reportService.initialize();
  }
}

// Middleware to ensure services are initialized
router.use(async (req, res, next) => {
  try {
    await initializeServices();
    next();
  } catch (error) {
    console.error('Error initializing analytics services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize analytics services',
      details: error.message
    });
  }
});

/**
 * GET /:workspaceId/executive/kpis
 * Get executive dashboard KPIs
 */
router.get('/:workspaceId/executive/kpis', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const {
      period = '30d',
      startDate,
      endDate,
      includeComparison = 'true'
    } = req.query;

    // Parse dates
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Use period-based dates
      end = new Date();
      const periodMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      };
      const days = periodMap[period] || 30;
      start = new Date(end - days * 24 * 60 * 60 * 1000);
    }

    const kpis = await analyticsService.getExecutiveKPIs({
      workspaceId,
      startDate: start,
      endDate: end,
      period,
      includeComparison: includeComparison === 'true'
    });

    res.json({
      success: true,
      data: kpis
    });
    
  } catch (error) {
    console.error('Error fetching executive KPIs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch executive KPIs',
      details: error.message
    });
  }
});

/**
 * GET /:workspaceId/trends/:metric
 * Get time-series data for a specific metric
 */
router.get('/:workspaceId/trends/:metric', async (req, res) => {
  try {
    const { workspaceId, metric } = req.params;
    const {
      startDate,
      endDate,
      granularity = 'daily',
      includeMovingAverage = 'true',
      includeGrowthRate = 'true'
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const trendsData = await trendService.getTimeSeriesData({
      workspaceId,
      metric,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      granularity,
      includeMovingAverage: includeMovingAverage === 'true',
      includeGrowthRate: includeGrowthRate === 'true'
    });

    res.json({
      success: true,
      data: trendsData
    });
    
  } catch (error) {
    console.error('Error fetching trend data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trend data',
      details: error.message
    });
  }
});

/**
 * POST /:workspaceId/reports/generate
 * Generate a report in specified format
 */
router.post('/:workspaceId/reports/generate', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const {
      type = 'executive',
      format = 'pdf',
      period = '30d',
      startDate,
      endDate,
      includeKPIs = true,
      includeTrends = true,
      metrics = []
    } = req.body;

    // Get data for report
    let reportData = {};

    // Get KPIs if requested
    if (includeKPIs) {
      let start, end;
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        end = new Date();
        const periodMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
        const days = periodMap[period] || 30;
        start = new Date(end - days * 24 * 60 * 60 * 1000);
      }

      reportData = await analyticsService.getExecutiveKPIs({
        workspaceId,
        startDate: start,
        endDate: end,
        period,
        includeComparison: true
      });
    }

    // Get trends if requested
    if (includeTrends && metrics.length > 0) {
      reportData.trends = {};
      
      for (const metric of metrics) {
        const trendData = await trendService.getTimeSeriesData({
          workspaceId,
          metric,
          startDate: new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(endDate || Date.now()),
          granularity: 'daily'
        });
        
        reportData.trends[metric] = trendData;
      }
    }

    // Generate report
    const reportInfo = await reportService.generateReport({
      type,
      format,
      data: reportData,
      metadata: {
        workspaceId,
        period: { startDate, endDate },
        generatedBy: req.user?.id || 'system',
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Analytics Report`,
        companyName: 'Spirit Tours'
      }
    });

    res.json({
      success: true,
      data: reportInfo,
      message: 'Report generated successfully'
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      details: error.message
    });
  }
});

/**
 * GET /:workspaceId/reports/:reportId/download
 * Download a generated report
 */
router.get('/:workspaceId/reports/:reportId/download', async (req, res) => {
  try {
    const { workspaceId, reportId } = req.params;
    
    // Find report file
    const reportDir = path.join(__dirname, '../../temp/reports');
    const files = fs.readdirSync(reportDir);
    
    const reportFile = files.find(file => file.includes(reportId));
    
    if (!reportFile) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    const filePath = path.join(reportDir, reportFile);
    const stat = fs.statSync(filePath);

    // Determine content type
    const ext = path.extname(reportFile).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.csv': 'text/csv',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${reportFile}"`);

    // Stream file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download report',
      details: error.message
    });
  }
});

/**
 * GET /:workspaceId/reports
 * List all generated reports for workspace
 */
router.get('/:workspaceId/reports', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const reportDir = path.join(__dirname, '../../temp/reports');
    
    if (!fs.existsSync(reportDir)) {
      return res.json({
        success: true,
        data: {
          reports: [],
          total: 0
        }
      });
    }

    const files = fs.readdirSync(reportDir);
    
    // Get file stats
    const reports = files.map(file => {
      const filePath = path.join(reportDir, file);
      const stats = fs.statSync(filePath);
      const ext = path.extname(file).slice(1);
      const reportId = file.split('_report_')[1]?.split('.')[0];
      
      return {
        reportId,
        fileName: file,
        format: ext,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    });

    // Sort by creation date (newest first)
    reports.sort((a, b) => b.createdAt - a.createdAt);

    // Paginate
    const paginatedReports = reports.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      data: {
        reports: paginatedReports,
        total: reports.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (error) {
    console.error('Error listing reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list reports',
      details: error.message
    });
  }
});

/**
 * POST /:workspaceId/reports/schedule
 * Schedule automated report generation
 */
router.post('/:workspaceId/reports/schedule', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const {
      reportType = 'executive',
      format = 'pdf',
      schedule = 'weekly', // daily, weekly, monthly
      recipients = [],
      metrics = []
    } = req.body;

    // TODO: Implement scheduling logic using cron or similar
    // For now, return a placeholder response

    const scheduleInfo = {
      scheduleId: `sched-${Date.now()}`,
      workspaceId,
      reportType,
      format,
      schedule,
      recipients,
      metrics,
      nextRun: calculateNextRun(schedule),
      status: 'active',
      createdAt: new Date()
    };

    res.json({
      success: true,
      data: scheduleInfo,
      message: 'Report schedule created successfully'
    });
    
  } catch (error) {
    console.error('Error scheduling report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule report',
      details: error.message
    });
  }
});

/**
 * DELETE /:workspaceId/reports/:reportId
 * Delete a generated report
 */
router.delete('/:workspaceId/reports/:reportId', async (req, res) => {
  try {
    const { workspaceId, reportId } = req.params;
    
    const reportDir = path.join(__dirname, '../../temp/reports');
    const files = fs.readdirSync(reportDir);
    
    const reportFile = files.find(file => file.includes(reportId));
    
    if (!reportFile) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    const filePath = path.join(reportDir, reportFile);
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete report',
      details: error.message
    });
  }
});

/**
 * Helper: Calculate next run time for scheduled reports
 */
function calculateNextRun(schedule) {
  const now = new Date();
  
  switch (schedule) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      return next;
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

module.exports = router;
