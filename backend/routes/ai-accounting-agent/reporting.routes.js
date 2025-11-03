/**
 * Reporting Engine - API Routes
 * 
 * Endpoints for financial reports and analytics
 * 
 * @module ReportingRoutes
 */

const express = require('express');
const router = express.Router();
const ReportingEngine = require('../../services/ai-accounting-agent/reporting-engine');
const { authenticate, authorize } = require('../../middleware/auth');
const logger = require('../../utils/logger');

// Initialize Reporting Engine
// Note: AI service would be passed from main app
const reportingEngine = new ReportingEngine();

/**
 * GET /api/ai-agent/reports/daily/:organizationId/:date
 * Get daily transaction report
 */
router.get('/daily/:organizationId/:date',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { organizationId, date } = req.params;

      logger.info(`Generating daily report for ${organizationId} on ${date}`);

      const report = await reportingEngine.generateDailyTransactionReport(organizationId, new Date(date));

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error('Error generating daily report:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'DAILY_REPORT_FAILED'
      });
    }
  }
);

/**
 * GET /api/ai-agent/reports/monthly/:organizationId/:year/:month
 * Get monthly financial statements
 */
router.get('/monthly/:organizationId/:year/:month',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { organizationId, year, month } = req.params;

      logger.info(`Generating monthly financial statements for ${organizationId} - ${year}/${month}`);

      const report = await reportingEngine.generateMonthlyFinancialStatements(
        organizationId,
        parseInt(year),
        parseInt(month)
      );

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error('Error generating monthly financial statements:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'MONTHLY_STATEMENTS_FAILED'
      });
    }
  }
);

/**
 * GET /api/ai-agent/reports/balance-sheet/:organizationId/:date
 * Get balance sheet as of specific date
 */
router.get('/balance-sheet/:organizationId/:date',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { organizationId, date } = req.params;

      logger.info(`Generating balance sheet for ${organizationId} as of ${date}`);

      const balanceSheet = await reportingEngine.generateBalanceSheet(organizationId, new Date(date));

      res.json({
        success: true,
        data: balanceSheet
      });

    } catch (error) {
      logger.error('Error generating balance sheet:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'BALANCE_SHEET_FAILED'
      });
    }
  }
);

/**
 * GET /api/ai-agent/reports/income-statement/:organizationId/:startDate/:endDate
 * Get income statement for period
 */
router.get('/income-statement/:organizationId/:startDate/:endDate',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { organizationId, startDate, endDate } = req.params;

      logger.info(`Generating income statement for ${organizationId} from ${startDate} to ${endDate}`);

      const incomeStatement = await reportingEngine.generateIncomeStatement(
        organizationId,
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        data: incomeStatement
      });

    } catch (error) {
      logger.error('Error generating income statement:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'INCOME_STATEMENT_FAILED'
      });
    }
  }
);

/**
 * GET /api/ai-agent/reports/cash-flow/:organizationId/:startDate/:endDate
 * Get cash flow statement for period
 */
router.get('/cash-flow/:organizationId/:startDate/:endDate',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { organizationId, startDate, endDate } = req.params;

      logger.info(`Generating cash flow statement for ${organizationId} from ${startDate} to ${endDate}`);

      const cashFlowStatement = await reportingEngine.generateCashFlowStatement(
        organizationId,
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        data: cashFlowStatement
      });

    } catch (error) {
      logger.error('Error generating cash flow statement:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'CASH_FLOW_STATEMENT_FAILED'
      });
    }
  }
);

/**
 * GET /api/ai-agent/reports/kpis/:organizationId/:year/:month
 * Get KPI dashboard for month
 */
router.get('/kpis/:organizationId/:year/:month',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { organizationId, year, month } = req.params;

      logger.info(`Generating KPI dashboard for ${organizationId} - ${year}/${month}`);

      // Get financial statements first
      const statements = await reportingEngine.generateMonthlyFinancialStatements(
        organizationId,
        parseInt(year),
        parseInt(month)
      );

      // Calculate KPIs
      const kpis = reportingEngine.calculateKPIs(
        statements.balanceSheet,
        statements.incomeStatement,
        statements.cashFlowStatement
      );

      res.json({
        success: true,
        data: {
          period: { year: parseInt(year), month: parseInt(month) },
          kpis: kpis,
          statements: {
            balanceSheet: statements.balanceSheet,
            incomeStatement: statements.incomeStatement,
            cashFlowStatement: statements.cashFlowStatement
          }
        }
      });

    } catch (error) {
      logger.error('Error generating KPI dashboard:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'KPI_DASHBOARD_FAILED'
      });
    }
  }
);

/**
 * GET /api/ai-agent/reports/variance/:organizationId/:year/:month
 * Get variance analysis (month-over-month)
 */
router.get('/variance/:organizationId/:year/:month',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { organizationId, year, month } = req.params;
      const currentYear = parseInt(year);
      const currentMonth = parseInt(month);

      // Calculate previous month
      let prevYear = currentYear;
      let prevMonth = currentMonth - 1;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear--;
      }

      logger.info(`Generating variance analysis for ${organizationId} - ${year}/${month} vs ${prevYear}/${prevMonth}`);

      const variance = await reportingEngine.generateVarianceAnalysis(
        organizationId,
        currentYear,
        currentMonth,
        prevYear,
        prevMonth
      );

      res.json({
        success: true,
        data: variance
      });

    } catch (error) {
      logger.error('Error generating variance analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'VARIANCE_ANALYSIS_FAILED'
      });
    }
  }
);

/**
 * GET /api/ai-agent/reports/executive-summary/:organizationId/:year/:month
 * Get executive summary for month
 */
router.get('/executive-summary/:organizationId/:year/:month',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { organizationId, year, month } = req.params;

      logger.info(`Generating executive summary for ${organizationId} - ${year}/${month}`);

      const summary = await reportingEngine.generateExecutiveSummary(
        organizationId,
        parseInt(year),
        parseInt(month)
      );

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      logger.error('Error generating executive summary:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'EXECUTIVE_SUMMARY_FAILED'
      });
    }
  }
);

/**
 * POST /api/ai-agent/reports/export
 * Export report in specified format
 */
router.post('/export',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { report, format = 'json' } = req.body;

      if (!report) {
        return res.status(400).json({
          success: false,
          error: 'Report object is required'
        });
      }

      if (!['json', 'csv', 'pdf'].includes(format)) {
        return res.status(400).json({
          success: false,
          error: 'Format must be json, csv, or pdf'
        });
      }

      logger.info(`Exporting report in ${format} format by user ${req.user.id}`);

      const exported = await reportingEngine.exportReport(report, format);

      if (format === 'json') {
        res.json({
          success: true,
          data: exported
        });
      } else {
        // For CSV and PDF, send as file download
        const filename = `report_${Date.now()}.${format}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/pdf');
        res.send(exported);
      }

    } catch (error) {
      logger.error('Error exporting report:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'REPORT_EXPORT_FAILED'
      });
    }
  }
);

/**
 * GET /api/ai-agent/reports/schedule
 * Get scheduled reports
 */
router.get('/schedule',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { organizationId } = req.query;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: 'organizationId is required'
        });
      }

      // This would query scheduled reports from database
      const schedules = {
        items: [
          {
            id: '1',
            reportType: 'daily',
            frequency: 'daily',
            time: '08:00',
            recipients: ['cfo@company.com', 'accountant@company.com'],
            enabled: true,
            lastRun: new Date(),
            nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000)
          },
          {
            id: '2',
            reportType: 'monthly',
            frequency: 'monthly',
            dayOfMonth: 1,
            time: '09:00',
            recipients: ['cfo@company.com'],
            enabled: true,
            lastRun: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            nextRun: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        ],
        total: 2
      };

      res.json({
        success: true,
        data: schedules
      });

    } catch (error) {
      logger.error('Error getting scheduled reports:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/reports/schedule
 * Create scheduled report
 */
router.post('/schedule',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { 
        organizationId,
        reportType,
        frequency,
        time,
        recipients,
        enabled = true
      } = req.body;

      if (!organizationId || !reportType || !frequency || !recipients) {
        return res.status(400).json({
          success: false,
          error: 'organizationId, reportType, frequency, and recipients are required'
        });
      }

      logger.info(`Scheduling ${reportType} report for ${organizationId} by user ${req.user.id}`);

      const schedule = {
        id: Date.now().toString(),
        organizationId,
        reportType,
        frequency,
        time,
        recipients,
        enabled,
        createdBy: req.user.id,
        createdAt: new Date()
      };

      res.json({
        success: true,
        data: schedule,
        message: '✅ Reporte programado exitosamente'
      });

    } catch (error) {
      logger.error('Error scheduling report:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/reports/templates
 * Get available report templates
 */
router.get('/templates',
  authenticate,
  async (req, res) => {
    try {
      const templates = [
        {
          id: 'daily_summary',
          name: 'Daily Summary',
          description: 'Daily transaction summary with totals and alerts',
          frequency: 'daily',
          estimatedTime: '< 1 min'
        },
        {
          id: 'monthly_statements',
          name: 'Monthly Financial Statements',
          description: 'Complete financial statements with KPIs',
          frequency: 'monthly',
          estimatedTime: '2-3 min'
        },
        {
          id: 'executive_summary',
          name: 'Executive Summary',
          description: 'High-level overview for management',
          frequency: 'monthly',
          estimatedTime: '1-2 min'
        },
        {
          id: 'variance_analysis',
          name: 'Variance Analysis',
          description: 'Month-over-month comparison with insights',
          frequency: 'monthly',
          estimatedTime: '2-3 min'
        },
        {
          id: 'kpi_dashboard',
          name: 'KPI Dashboard',
          description: 'Key performance indicators across 5 categories',
          frequency: 'monthly',
          estimatedTime: '1-2 min'
        }
      ];

      res.json({
        success: true,
        data: {
          templates: templates,
          total: templates.length
        }
      });

    } catch (error) {
      logger.error('Error getting report templates:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
