/**
 * Analytics API Router
 * 
 * Endpoints for advanced analytics features:
 * - Real-time metrics and dashboards
 * - Tour performance analysis
 * - Guide performance tracking
 * - Revenue forecasting
 * - Event tracking
 * - Alert management
 * - Export and reporting
 */

const express = require('express');
const router = express.Router();

/**
 * Initialize router with analytics system
 */
function initAnalyticsRouter(analyticsSystem) {
  
  // ============================================
  // REAL-TIME METRICS ENDPOINTS
  // ============================================
  
  /**
   * Get real-time dashboard metrics
   * GET /api/analytics/realtime
   */
  router.get('/realtime', async (req, res) => {
    try {
      const { timeRange = 'today' } = req.query;
      
      const metrics = await analyticsSystem.getRealTimeMetrics(timeRange);
      
      res.json({ success: true, ...metrics });
      
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // EVENT TRACKING ENDPOINTS
  // ============================================
  
  /**
   * Track an analytics event
   * POST /api/analytics/events/track
   */
  router.post('/events/track', async (req, res) => {
    try {
      const { eventType, eventData, context } = req.body;
      
      if (!eventType || !eventData) {
        return res.status(400).json({
          success: false,
          error: 'eventType and eventData are required',
        });
      }
      
      const result = await analyticsSystem.trackEvent(eventType, eventData, context);
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error tracking event:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Get recent events
   * GET /api/analytics/events/recent
   */
  router.get('/events/recent', async (req, res) => {
    try {
      const { limit = 100, eventType, userId } = req.query;
      
      let query = 'SELECT * FROM analytics_events WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      if (eventType) {
        query += ` AND event_type = $${paramIndex++}`;
        params.push(eventType);
      }
      
      if (userId) {
        query += ` AND user_id = $${paramIndex++}`;
        params.push(userId);
      }
      
      query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
      
      const result = await analyticsSystem.pgPool.query(query, params);
      
      res.json({
        success: true,
        events: result.rows,
        total: result.rows.length,
      });
      
    } catch (error) {
      console.error('Error getting recent events:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // TOUR ANALYTICS ENDPOINTS
  // ============================================
  
  /**
   * Record tour analytics
   * POST /api/analytics/tours/record
   */
  router.post('/tours/record', async (req, res) => {
    try {
      const tourData = req.body;
      
      const result = await analyticsSystem.recordTourAnalytics(tourData);
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error recording tour analytics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Get tour performance analytics
   * GET /api/analytics/tours/performance
   */
  router.get('/tours/performance', async (req, res) => {
    try {
      const filters = {
        routeId: req.query.routeId,
        guideId: req.query.guideId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: parseInt(req.query.limit) || 100,
      };
      
      const performance = await analyticsSystem.getTourPerformance(filters);
      
      res.json({ success: true, ...performance });
      
    } catch (error) {
      console.error('Error getting tour performance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Get tour analytics by ID
   * GET /api/analytics/tours/:tourId
   */
  router.get('/tours/:tourId', async (req, res) => {
    try {
      const { tourId } = req.params;
      
      const result = await analyticsSystem.pgPool.query(
        'SELECT * FROM analytics_tours WHERE tour_id = $1',
        [tourId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Tour analytics not found',
        });
      }
      
      res.json({ success: true, tour: result.rows[0] });
      
    } catch (error) {
      console.error('Error getting tour analytics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // GUIDE ANALYTICS ENDPOINTS
  // ============================================
  
  /**
   * Get guide performance analytics
   * GET /api/analytics/guides/:guideId/performance
   */
  router.get('/guides/:guideId/performance', async (req, res) => {
    try {
      const { guideId } = req.params;
      const { timeRange = '30d' } = req.query;
      
      const performance = await analyticsSystem.getGuidePerformance(guideId, timeRange);
      
      res.json({ success: true, ...performance });
      
    } catch (error) {
      console.error('Error getting guide performance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Get all guides performance summary
   * GET /api/analytics/guides/summary
   */
  router.get('/guides/summary', async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      } else if (timeRange === '90d') {
        startDate.setDate(startDate.getDate() - 90);
      }
      
      const result = await analyticsSystem.pgPool.query(
        `SELECT 
          guide_id,
          COUNT(*) as tours_count,
          SUM(passengers_count) as total_passengers,
          SUM(revenue) as total_revenue,
          AVG(rating) as average_rating,
          SUM(duration_minutes) / 60.0 as hours_worked
        FROM analytics_tours
        WHERE completed_at >= $1 
          AND completed_at <= $2
          AND status = 'completed'
        GROUP BY guide_id
        ORDER BY total_revenue DESC`,
        [startDate, endDate]
      );
      
      res.json({
        success: true,
        guides: result.rows,
        timeRange,
      });
      
    } catch (error) {
      console.error('Error getting guides summary:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // REVENUE ANALYTICS ENDPOINTS
  // ============================================
  
  /**
   * Get revenue analytics
   * GET /api/analytics/revenue
   */
  router.get('/revenue', async (req, res) => {
    try {
      const { startDate, endDate, granularity = 'day' } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();
      
      let dateGrouping;
      if (granularity === 'hour') {
        dateGrouping = "DATE_TRUNC('hour', completed_at)";
      } else if (granularity === 'day') {
        dateGrouping = "DATE(completed_at)";
      } else if (granularity === 'week') {
        dateGrouping = "DATE_TRUNC('week', completed_at)";
      } else if (granularity === 'month') {
        dateGrouping = "DATE_TRUNC('month', completed_at)";
      } else {
        dateGrouping = "DATE(completed_at)";
      }
      
      const result = await analyticsSystem.pgPool.query(
        `SELECT 
          ${dateGrouping} as period,
          SUM(revenue) as total_revenue,
          COUNT(*) as bookings_count,
          AVG(revenue) as avg_order_value,
          SUM(passengers_count) as total_passengers
        FROM analytics_tours
        WHERE completed_at >= $1 
          AND completed_at <= $2
          AND status = 'completed'
        GROUP BY period
        ORDER BY period ASC`,
        [start, end]
      );
      
      res.json({
        success: true,
        revenue: result.rows,
        granularity,
        startDate: start,
        endDate: end,
      });
      
    } catch (error) {
      console.error('Error getting revenue analytics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Get revenue forecast
   * POST /api/analytics/revenue/forecast
   */
  router.post('/revenue/forecast', async (req, res) => {
    try {
      const { daysAhead = 7 } = req.body;
      
      const forecast = await analyticsSystem.forecastRevenue(daysAhead);
      
      res.json({ success: true, ...forecast });
      
    } catch (error) {
      console.error('Error forecasting revenue:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // CUSTOMER ANALYTICS ENDPOINTS
  // ============================================
  
  /**
   * Get customer behavior analytics
   * GET /api/analytics/customers/behavior
   */
  router.get('/customers/behavior', async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      } else if (timeRange === '90d') {
        startDate.setDate(startDate.getDate() - 90);
      }
      
      // Get event patterns
      const eventResult = await analyticsSystem.pgPool.query(
        `SELECT 
          event_type,
          COUNT(*) as event_count,
          COUNT(DISTINCT user_id) as unique_users
        FROM analytics_events
        WHERE timestamp >= $1 AND timestamp <= $2
        GROUP BY event_type
        ORDER BY event_count DESC`,
        [startDate, endDate]
      );
      
      // Get session statistics
      const sessionResult = await analyticsSystem.pgPool.query(
        `SELECT 
          COUNT(DISTINCT session_id) as total_sessions,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(session_duration) as avg_session_duration
        FROM (
          SELECT 
            session_id,
            user_id,
            EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) as session_duration
          FROM analytics_events
          WHERE timestamp >= $1 AND timestamp <= $2
          GROUP BY session_id, user_id
        ) sessions`,
        [startDate, endDate]
      );
      
      res.json({
        success: true,
        eventPatterns: eventResult.rows,
        sessionStats: sessionResult.rows[0],
        timeRange,
      });
      
    } catch (error) {
      console.error('Error getting customer behavior:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Get customer lifetime value (LTV)
   * GET /api/analytics/customers/ltv
   */
  router.get('/customers/ltv', async (req, res) => {
    try {
      const result = await analyticsSystem.pgPool.query(
        `SELECT 
          user_id,
          COUNT(*) as total_tours,
          SUM(revenue) as lifetime_value,
          MIN(completed_at) as first_tour_date,
          MAX(completed_at) as last_tour_date,
          AVG(rating) as avg_rating
        FROM analytics_tours
        WHERE status = 'completed' AND user_id IS NOT NULL
        GROUP BY user_id
        HAVING COUNT(*) > 0
        ORDER BY lifetime_value DESC
        LIMIT 100`
      );
      
      const totalLTV = result.rows.reduce((sum, row) => sum + parseFloat(row.lifetime_value), 0);
      const avgLTV = result.rows.length > 0 ? totalLTV / result.rows.length : 0;
      
      res.json({
        success: true,
        customers: result.rows,
        summary: {
          totalCustomers: result.rows.length,
          totalLTV,
          averageLTV: avgLTV.toFixed(2),
        },
      });
      
    } catch (error) {
      console.error('Error getting customer LTV:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // ALERTS ENDPOINTS
  // ============================================
  
  /**
   * Create an alert
   * POST /api/analytics/alerts
   */
  router.post('/alerts', async (req, res) => {
    try {
      const alertData = req.body;
      
      const result = await analyticsSystem.createAlert(alertData);
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error creating alert:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Get active alerts
   * GET /api/analytics/alerts/active
   */
  router.get('/alerts/active', async (req, res) => {
    try {
      const result = await analyticsSystem.pgPool.query(
        `SELECT * FROM analytics_alerts 
        WHERE acknowledged = false 
        ORDER BY triggered_at DESC 
        LIMIT 50`
      );
      
      res.json({
        success: true,
        alerts: result.rows,
        total: result.rows.length,
      });
      
    } catch (error) {
      console.error('Error getting active alerts:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Acknowledge an alert
   * POST /api/analytics/alerts/:alertId/acknowledge
   */
  router.post('/alerts/:alertId/acknowledge', async (req, res) => {
    try {
      const { alertId } = req.params;
      const { acknowledgedBy } = req.body;
      
      await analyticsSystem.pgPool.query(
        `UPDATE analytics_alerts 
        SET acknowledged = true, 
            acknowledged_by = $1, 
            acknowledged_at = NOW()
        WHERE id = $2`,
        [acknowledgedBy, alertId]
      );
      
      res.json({ success: true });
      
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // REPORTING ENDPOINTS
  // ============================================
  
  /**
   * Generate comprehensive report
   * POST /api/analytics/reports/generate
   */
  router.post('/reports/generate', async (req, res) => {
    try {
      const { reportType, startDate, endDate, filters } = req.body;
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      let report = {
        reportType,
        generatedAt: new Date(),
        period: { start, end },
      };
      
      if (reportType === 'comprehensive') {
        // Get all metrics
        const [tourPerf, realTime, guides] = await Promise.all([
          analyticsSystem.getTourPerformance({ startDate: start, endDate: end }),
          analyticsSystem.getRealTimeMetrics('today'),
          analyticsSystem.pgPool.query(
            `SELECT guide_id, COUNT(*) as tours, SUM(revenue) as revenue
            FROM analytics_tours
            WHERE completed_at >= $1 AND completed_at <= $2
            GROUP BY guide_id`,
            [start, end]
          ),
        ]);
        
        report.tourPerformance = tourPerf;
        report.realTimeMetrics = realTime;
        report.guidesSummary = guides.rows;
        
      } else if (reportType === 'revenue') {
        const result = await analyticsSystem.pgPool.query(
          `SELECT 
            DATE(completed_at) as date,
            SUM(revenue) as revenue,
            COUNT(*) as bookings
          FROM analytics_tours
          WHERE completed_at >= $1 AND completed_at <= $2
          GROUP BY DATE(completed_at)
          ORDER BY date`,
          [start, end]
        );
        
        report.revenueData = result.rows;
        
      } else if (reportType === 'guides') {
        const result = await analyticsSystem.pgPool.query(
          `SELECT 
            guide_id,
            COUNT(*) as tours,
            SUM(revenue) as revenue,
            AVG(rating) as avg_rating
          FROM analytics_tours
          WHERE completed_at >= $1 AND completed_at <= $2
          GROUP BY guide_id
          ORDER BY revenue DESC`,
          [start, end]
        );
        
        report.guidesData = result.rows;
      }
      
      res.json({ success: true, report });
      
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Export data as CSV
   * GET /api/analytics/export/csv
   */
  router.get('/export/csv', async (req, res) => {
    try {
      const { dataType, startDate, endDate } = req.query;
      
      let query;
      let filename;
      
      if (dataType === 'tours') {
        query = `SELECT * FROM analytics_tours 
                WHERE completed_at >= $1 AND completed_at <= $2 
                ORDER BY completed_at DESC`;
        filename = 'tours_export.csv';
        
      } else if (dataType === 'events') {
        query = `SELECT * FROM analytics_events 
                WHERE timestamp >= $1 AND timestamp <= $2 
                ORDER BY timestamp DESC`;
        filename = 'events_export.csv';
        
      } else {
        return res.status(400).json({ success: false, error: 'Invalid dataType' });
      }
      
      const result = await analyticsSystem.pgPool.query(query, [
        new Date(startDate),
        new Date(endDate),
      ]);
      
      // Convert to CSV
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'No data found' });
      }
      
      const headers = Object.keys(result.rows[0]);
      const csv = [
        headers.join(','),
        ...result.rows.map(row => 
          headers.map(h => JSON.stringify(row[h] || '')).join(',')
        ),
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // STATISTICS ENDPOINTS
  // ============================================
  
  /**
   * Get system statistics
   * GET /api/analytics/stats
   */
  router.get('/stats', async (req, res) => {
    try {
      const stats = await analyticsSystem.getStatistics();
      
      res.json({ success: true, stats });
      
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // MAINTENANCE ENDPOINTS
  // ============================================
  
  /**
   * Cleanup old data
   * POST /api/analytics/maintenance/cleanup
   */
  router.post('/maintenance/cleanup', async (req, res) => {
    try {
      const { retentionDays = 365 } = req.body;
      
      const result = await analyticsSystem.cleanup(retentionDays);
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error during cleanup:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  return router;
}

module.exports = initAnalyticsRouter;
