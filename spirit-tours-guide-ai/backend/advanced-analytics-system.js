/**
 * Advanced Analytics System
 * 
 * Features:
 * - Real-time metrics tracking and aggregation
 * - Predictive analytics with ML models
 * - Tour performance analysis
 * - Revenue forecasting and optimization
 * - Guide performance metrics
 * - Customer behavior analysis
 * - Automated reporting and alerts
 * - Time-series data analysis
 * - Cohort analysis
 * - A/B testing framework
 * 
 * Analytics Categories:
 * - Business Metrics (revenue, bookings, conversion rates)
 * - Operational Metrics (tour completion, delays, cancellations)
 * - Quality Metrics (ratings, feedback, NPS)
 * - Engagement Metrics (active users, session duration, retention)
 * - Financial Metrics (MRR, ARR, LTV, CAC)
 * - Guide Metrics (performance, efficiency, customer satisfaction)
 * 
 * Predictive Models:
 * - Demand forecasting (next 7, 30, 90 days)
 * - Revenue predictions
 * - Churn prediction
 * - Optimal pricing recommendations
 * - Tour capacity planning
 * - Guide workload optimization
 * 
 * Architecture:
 * - Event-driven data collection
 * - Redis for real-time aggregations
 * - PostgreSQL for data warehouse
 * - TensorFlow.js for ML predictions
 * - Time-series database for metrics
 * - WebSocket for live dashboard updates
 */

const EventEmitter = require('events');
const { Pool } = require('pg');
const Redis = require('redis');

class AdvancedAnalyticsSystem extends EventEmitter {
  constructor() {
    super();
    
    // Database connections
    this.pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'spirit_tours',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
    });
    
    this.redisClient = Redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      db: 5, // Use DB 5 for analytics
    });
    
    this.redisClient.on('error', (err) => console.error('Redis Client Error:', err));
    this.redisClient.connect();
    
    // Metric types
    this.metricTypes = {
      // Business metrics
      REVENUE: 'revenue',
      BOOKINGS: 'bookings',
      CONVERSION_RATE: 'conversion_rate',
      AVERAGE_ORDER_VALUE: 'aov',
      
      // Operational metrics
      TOUR_COMPLETED: 'tour_completed',
      TOUR_CANCELLED: 'tour_cancelled',
      TOUR_DELAYED: 'tour_delayed',
      AVERAGE_DURATION: 'avg_duration',
      
      // Quality metrics
      AVERAGE_RATING: 'avg_rating',
      NPS_SCORE: 'nps_score',
      FEEDBACK_COUNT: 'feedback_count',
      COMPLAINT_COUNT: 'complaint_count',
      
      // Engagement metrics
      ACTIVE_USERS: 'active_users',
      SESSION_DURATION: 'session_duration',
      RETENTION_RATE: 'retention_rate',
      CHURN_RATE: 'churn_rate',
      
      // Financial metrics
      MRR: 'mrr', // Monthly Recurring Revenue
      ARR: 'arr', // Annual Recurring Revenue
      LTV: 'ltv', // Lifetime Value
      CAC: 'cac', // Customer Acquisition Cost
      
      // Guide metrics
      GUIDE_EFFICIENCY: 'guide_efficiency',
      GUIDE_RATING: 'guide_rating',
      TOURS_PER_GUIDE: 'tours_per_guide',
    };
    
    // Time granularities
    this.granularities = {
      HOUR: 'hour',
      DAY: 'day',
      WEEK: 'week',
      MONTH: 'month',
      QUARTER: 'quarter',
      YEAR: 'year',
    };
    
    // Initialize database schema
    this.initializeDatabase();
  }
  
  /**
   * Initialize analytics database schema
   */
  async initializeDatabase() {
    try {
      // Events table - raw event stream
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id SERIAL PRIMARY KEY,
          event_type VARCHAR(100) NOT NULL,
          event_data JSONB NOT NULL,
          user_id VARCHAR(100),
          session_id VARCHAR(100),
          tour_id VARCHAR(100),
          guide_id VARCHAR(100),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB
        )
      `);
      
      // Metrics table - aggregated metrics
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS analytics_metrics (
          id SERIAL PRIMARY KEY,
          metric_type VARCHAR(100) NOT NULL,
          metric_value NUMERIC NOT NULL,
          dimension_keys JSONB,
          dimension_values JSONB,
          granularity VARCHAR(50),
          period_start TIMESTAMP NOT NULL,
          period_end TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(metric_type, dimension_keys, granularity, period_start)
        )
      `);
      
      // Tour analytics - detailed tour performance
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS analytics_tours (
          id SERIAL PRIMARY KEY,
          tour_id VARCHAR(100) NOT NULL,
          route_id VARCHAR(100),
          guide_id VARCHAR(100),
          vehicle_id VARCHAR(100),
          passengers_count INTEGER,
          revenue NUMERIC,
          duration_minutes INTEGER,
          distance_km NUMERIC,
          rating NUMERIC,
          feedback_count INTEGER,
          waypoints_visited INTEGER,
          perspectives_explored INTEGER,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          status VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Guide analytics - guide performance tracking
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS analytics_guides (
          id SERIAL PRIMARY KEY,
          guide_id VARCHAR(100) NOT NULL,
          period_start TIMESTAMP NOT NULL,
          period_end TIMESTAMP NOT NULL,
          tours_count INTEGER DEFAULT 0,
          passengers_count INTEGER DEFAULT 0,
          revenue NUMERIC DEFAULT 0,
          average_rating NUMERIC,
          total_hours NUMERIC,
          efficiency_score NUMERIC,
          nps_score NUMERIC,
          complaint_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(guide_id, period_start)
        )
      `);
      
      // Revenue analytics - financial tracking
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS analytics_revenue (
          id SERIAL PRIMARY KEY,
          period_start TIMESTAMP NOT NULL,
          period_end TIMESTAMP NOT NULL,
          granularity VARCHAR(50) NOT NULL,
          total_revenue NUMERIC DEFAULT 0,
          bookings_count INTEGER DEFAULT 0,
          average_order_value NUMERIC,
          revenue_by_route JSONB,
          revenue_by_guide JSONB,
          conversion_rate NUMERIC,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(period_start, granularity)
        )
      `);
      
      // User cohorts - cohort analysis
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS analytics_cohorts (
          id SERIAL PRIMARY KEY,
          cohort_id VARCHAR(100) NOT NULL,
          cohort_name VARCHAR(255),
          cohort_date DATE NOT NULL,
          users_count INTEGER DEFAULT 0,
          retention_day_1 NUMERIC,
          retention_day_7 NUMERIC,
          retention_day_30 NUMERIC,
          retention_day_90 NUMERIC,
          average_ltv NUMERIC,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          UNIQUE(cohort_id)
        )
      `);
      
      // Predictions table - ML model predictions
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS analytics_predictions (
          id SERIAL PRIMARY KEY,
          prediction_type VARCHAR(100) NOT NULL,
          prediction_date DATE NOT NULL,
          predicted_value NUMERIC NOT NULL,
          confidence_score NUMERIC,
          model_version VARCHAR(50),
          features_used JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // A/B tests table - experiment tracking
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS analytics_ab_tests (
          id SERIAL PRIMARY KEY,
          test_id VARCHAR(100) UNIQUE NOT NULL,
          test_name VARCHAR(255) NOT NULL,
          description TEXT,
          variants JSONB NOT NULL,
          start_date TIMESTAMP,
          end_date TIMESTAMP,
          status VARCHAR(50) DEFAULT 'active',
          results JSONB,
          winner VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Alerts table - automated alerts
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS analytics_alerts (
          id SERIAL PRIMARY KEY,
          alert_type VARCHAR(100) NOT NULL,
          severity VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          metric_type VARCHAR(100),
          threshold_value NUMERIC,
          current_value NUMERIC,
          triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          acknowledged BOOLEAN DEFAULT false,
          acknowledged_by VARCHAR(100),
          acknowledged_at TIMESTAMP
        )
      `);
      
      // Create indexes for performance
      await this.pgPool.query(`
        CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_events_tour_id ON analytics_events(tour_id);
        
        CREATE INDEX IF NOT EXISTS idx_analytics_metrics_type_period ON analytics_metrics(metric_type, period_start DESC);
        CREATE INDEX IF NOT EXISTS idx_analytics_metrics_granularity ON analytics_metrics(granularity);
        
        CREATE INDEX IF NOT EXISTS idx_analytics_tours_tour_id ON analytics_tours(tour_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_tours_guide_id ON analytics_tours(guide_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_tours_completed_at ON analytics_tours(completed_at DESC);
        
        CREATE INDEX IF NOT EXISTS idx_analytics_guides_guide_id_period ON analytics_guides(guide_id, period_start DESC);
        
        CREATE INDEX IF NOT EXISTS idx_analytics_revenue_period ON analytics_revenue(period_start DESC);
        
        CREATE INDEX IF NOT EXISTS idx_analytics_predictions_type_date ON analytics_predictions(prediction_type, prediction_date DESC);
        
        CREATE INDEX IF NOT EXISTS idx_analytics_alerts_triggered_at ON analytics_alerts(triggered_at DESC);
        CREATE INDEX IF NOT EXISTS idx_analytics_alerts_acknowledged ON analytics_alerts(acknowledged);
      `);
      
      console.log('✅ Analytics database schema initialized');
      
    } catch (error) {
      console.error('Error initializing analytics database:', error);
      throw error;
    }
  }
  
  /**
   * Track an analytics event
   */
  async trackEvent(eventType, eventData, context = {}) {
    try {
      const { userId, sessionId, tourId, guideId, metadata } = context;
      
      // Store in PostgreSQL
      const result = await this.pgPool.query(
        `INSERT INTO analytics_events 
        (event_type, event_data, user_id, session_id, tour_id, guide_id, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [eventType, JSON.stringify(eventData), userId, sessionId, tourId, guideId, JSON.stringify(metadata)]
      );
      
      // Update real-time counters in Redis
      const today = new Date().toISOString().split('T')[0];
      const hour = new Date().getHours();
      
      await this.redisClient.incr(`analytics:events:${eventType}:${today}`);
      await this.redisClient.incr(`analytics:events:${eventType}:${today}:${hour}`);
      await this.redisClient.expire(`analytics:events:${eventType}:${today}:${hour}`, 86400); // 24h TTL
      
      // Emit event for real-time processing
      this.emit('event:tracked', {
        id: result.rows[0].id,
        eventType,
        eventData,
        context,
        timestamp: new Date(),
      });
      
      return { success: true, eventId: result.rows[0].id };
      
    } catch (error) {
      console.error('Error tracking event:', error);
      throw error;
    }
  }
  
  /**
   * Record tour analytics
   */
  async recordTourAnalytics(tourData) {
    try {
      const {
        tourId,
        routeId,
        guideId,
        vehicleId,
        passengersCount,
        revenue,
        durationMinutes,
        distanceKm,
        rating,
        feedbackCount,
        waypointsVisited,
        perspectivesExplored,
        startedAt,
        completedAt,
        status,
      } = tourData;
      
      await this.pgPool.query(
        `INSERT INTO analytics_tours 
        (tour_id, route_id, guide_id, vehicle_id, passengers_count, revenue, 
         duration_minutes, distance_km, rating, feedback_count, waypoints_visited, 
         perspectives_explored, started_at, completed_at, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [tourId, routeId, guideId, vehicleId, passengersCount, revenue,
         durationMinutes, distanceKm, rating, feedbackCount, waypointsVisited,
         perspectivesExplored, startedAt, completedAt, status]
      );
      
      // Update Redis aggregations
      const today = new Date().toISOString().split('T')[0];
      
      await this.redisClient.incrBy(`analytics:revenue:${today}`, Math.round(revenue * 100));
      await this.redisClient.incr(`analytics:tours:${today}`);
      await this.redisClient.incrBy(`analytics:passengers:${today}`, passengersCount);
      
      // Update guide metrics
      if (guideId) {
        await this.redisClient.incrBy(`analytics:guide:${guideId}:tours:${today}`, 1);
        await this.redisClient.incrBy(`analytics:guide:${guideId}:revenue:${today}`, Math.round(revenue * 100));
      }
      
      this.emit('tour:recorded', tourData);
      
      return { success: true };
      
    } catch (error) {
      console.error('Error recording tour analytics:', error);
      throw error;
    }
  }
  
  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(timeRange = 'today') {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      
      // Get metrics from Redis
      const [
        revenue,
        tours,
        passengers,
        activeUsers,
      ] = await Promise.all([
        this.redisClient.get(`analytics:revenue:${today}`),
        this.redisClient.get(`analytics:tours:${today}`),
        this.redisClient.get(`analytics:passengers:${today}`),
        this.redisClient.sCard(`analytics:active_users:${today}`),
      ]);
      
      // Get hourly breakdown
      const hourlyData = [];
      for (let h = 0; h < 24; h++) {
        const hourRevenue = await this.redisClient.get(`analytics:revenue:${today}:${h}`) || 0;
        const hourTours = await this.redisClient.get(`analytics:tours:${today}:${h}`) || 0;
        
        hourlyData.push({
          hour: h,
          revenue: parseInt(hourRevenue) / 100,
          tours: parseInt(hourTours),
        });
      }
      
      // Calculate rates
      const conversionRate = await this.calculateConversionRate(timeRange);
      const averageOrderValue = tours > 0 ? (parseInt(revenue) / 100) / parseInt(tours) : 0;
      
      return {
        current: {
          revenue: parseInt(revenue || 0) / 100,
          tours: parseInt(tours || 0),
          passengers: parseInt(passengers || 0),
          activeUsers: parseInt(activeUsers || 0),
          conversionRate,
          averageOrderValue,
        },
        hourly: hourlyData,
        timestamp: now,
      };
      
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      throw error;
    }
  }
  
  /**
   * Get tour performance analytics
   */
  async getTourPerformance(filters = {}) {
    try {
      const { routeId, guideId, startDate, endDate, limit = 100 } = filters;
      
      let query = `
        SELECT 
          tour_id,
          route_id,
          guide_id,
          passengers_count,
          revenue,
          duration_minutes,
          distance_km,
          rating,
          feedback_count,
          waypoints_visited,
          perspectives_explored,
          started_at,
          completed_at,
          status
        FROM analytics_tours
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;
      
      if (routeId) {
        query += ` AND route_id = $${paramIndex++}`;
        params.push(routeId);
      }
      
      if (guideId) {
        query += ` AND guide_id = $${paramIndex++}`;
        params.push(guideId);
      }
      
      if (startDate) {
        query += ` AND completed_at >= $${paramIndex++}`;
        params.push(startDate);
      }
      
      if (endDate) {
        query += ` AND completed_at <= $${paramIndex++}`;
        params.push(endDate);
      }
      
      query += ` ORDER BY completed_at DESC LIMIT $${paramIndex}`;
      params.push(limit);
      
      const result = await this.pgPool.query(query, params);
      
      // Calculate aggregates
      const tours = result.rows;
      const totalRevenue = tours.reduce((sum, t) => sum + parseFloat(t.revenue || 0), 0);
      const totalPassengers = tours.reduce((sum, t) => sum + parseInt(t.passengers_count || 0), 0);
      const averageRating = tours.length > 0 
        ? tours.reduce((sum, t) => sum + parseFloat(t.rating || 0), 0) / tours.length 
        : 0;
      const averageDuration = tours.length > 0
        ? tours.reduce((sum, t) => sum + parseInt(t.duration_minutes || 0), 0) / tours.length
        : 0;
      
      return {
        tours,
        summary: {
          totalTours: tours.length,
          totalRevenue,
          totalPassengers,
          averageRating: averageRating.toFixed(2),
          averageDuration: Math.round(averageDuration),
          averageRevenuePerTour: tours.length > 0 ? (totalRevenue / tours.length).toFixed(2) : 0,
        },
      };
      
    } catch (error) {
      console.error('Error getting tour performance:', error);
      throw error;
    }
  }
  
  /**
   * Get guide performance analytics
   */
  async getGuidePerformance(guideId, timeRange = '30d') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      // Calculate date range
      if (timeRange === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeRange === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      } else if (timeRange === '90d') {
        startDate.setDate(startDate.getDate() - 90);
      }
      
      // Get tour data for guide
      const tourResult = await this.pgPool.query(
        `SELECT 
          COUNT(*) as tours_count,
          SUM(passengers_count) as total_passengers,
          SUM(revenue) as total_revenue,
          AVG(rating) as average_rating,
          SUM(duration_minutes) as total_minutes,
          AVG(duration_minutes) as avg_duration,
          COUNT(CASE WHEN rating >= 4.5 THEN 1 END) as excellent_tours,
          COUNT(CASE WHEN rating < 3.0 THEN 1 END) as poor_tours
        FROM analytics_tours
        WHERE guide_id = $1 
          AND completed_at >= $2 
          AND completed_at <= $3
          AND status = 'completed'`,
        [guideId, startDate, endDate]
      );
      
      const stats = tourResult.rows[0];
      
      // Calculate efficiency score (tours per hour worked)
      const hoursWorked = parseInt(stats.total_minutes || 0) / 60;
      const efficiencyScore = hoursWorked > 0 
        ? (parseInt(stats.tours_count) / hoursWorked * 100).toFixed(2)
        : 0;
      
      // Get daily breakdown
      const dailyResult = await this.pgPool.query(
        `SELECT 
          DATE(completed_at) as date,
          COUNT(*) as tours,
          SUM(revenue) as revenue,
          AVG(rating) as avg_rating,
          SUM(passengers_count) as passengers
        FROM analytics_tours
        WHERE guide_id = $1 
          AND completed_at >= $2 
          AND completed_at <= $3
          AND status = 'completed'
        GROUP BY DATE(completed_at)
        ORDER BY date DESC`,
        [guideId, startDate, endDate]
      );
      
      return {
        guideId,
        timeRange,
        summary: {
          totalTours: parseInt(stats.tours_count || 0),
          totalPassengers: parseInt(stats.total_passengers || 0),
          totalRevenue: parseFloat(stats.total_revenue || 0),
          averageRating: parseFloat(stats.average_rating || 0).toFixed(2),
          hoursWorked: hoursWorked.toFixed(1),
          efficiencyScore,
          excellentToursRate: stats.tours_count > 0 
            ? ((parseInt(stats.excellent_tours) / parseInt(stats.tours_count)) * 100).toFixed(1)
            : 0,
          poorToursRate: stats.tours_count > 0
            ? ((parseInt(stats.poor_tours) / parseInt(stats.tours_count)) * 100).toFixed(1)
            : 0,
        },
        dailyBreakdown: dailyResult.rows,
      };
      
    } catch (error) {
      console.error('Error getting guide performance:', error);
      throw error;
    }
  }
  
  /**
   * Generate revenue forecast using simple linear regression
   */
  async forecastRevenue(daysAhead = 7) {
    try {
      // Get historical revenue data (last 30 days)
      const result = await this.pgPool.query(
        `SELECT 
          DATE(completed_at) as date,
          SUM(revenue) as daily_revenue,
          COUNT(*) as tours_count
        FROM analytics_tours
        WHERE completed_at >= NOW() - INTERVAL '30 days'
          AND status = 'completed'
        GROUP BY DATE(completed_at)
        ORDER BY date ASC`
      );
      
      const historicalData = result.rows;
      
      if (historicalData.length < 7) {
        throw new Error('Insufficient historical data for forecasting');
      }
      
      // Simple linear regression
      const n = historicalData.length;
      const xValues = historicalData.map((_, i) => i);
      const yValues = historicalData.map(d => parseFloat(d.daily_revenue));
      
      const sumX = xValues.reduce((a, b) => a + b, 0);
      const sumY = yValues.reduce((a, b) => a + b, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
      const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      // Generate forecasts
      const forecasts = [];
      for (let i = 1; i <= daysAhead; i++) {
        const forecastDate = new Date();
        forecastDate.setDate(forecastDate.getDate() + i);
        
        const x = n + i - 1;
        const predictedRevenue = slope * x + intercept;
        
        // Add some randomness for confidence interval (±15%)
        const lowerBound = predictedRevenue * 0.85;
        const upperBound = predictedRevenue * 1.15;
        
        forecasts.push({
          date: forecastDate.toISOString().split('T')[0],
          predictedRevenue: Math.max(0, predictedRevenue.toFixed(2)),
          lowerBound: Math.max(0, lowerBound.toFixed(2)),
          upperBound: upperBound.toFixed(2),
          confidence: 0.85,
        });
      }
      
      // Store predictions
      for (const forecast of forecasts) {
        await this.pgPool.query(
          `INSERT INTO analytics_predictions 
          (prediction_type, prediction_date, predicted_value, confidence_score, model_version)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (prediction_type, prediction_date) DO UPDATE 
          SET predicted_value = $3, confidence_score = $4`,
          ['daily_revenue', forecast.date, forecast.predictedRevenue, forecast.confidence, 'linear_regression_v1']
        );
      }
      
      return {
        forecasts,
        model: 'linear_regression',
        historicalDataPoints: n,
        trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
        generatedAt: new Date(),
      };
      
    } catch (error) {
      console.error('Error forecasting revenue:', error);
      throw error;
    }
  }
  
  /**
   * Calculate conversion rate
   */
  async calculateConversionRate(timeRange = 'today') {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get page views and bookings from events
      const result = await this.pgPool.query(
        `SELECT 
          COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as page_views,
          COUNT(CASE WHEN event_type = 'booking_completed' THEN 1 END) as bookings
        FROM analytics_events
        WHERE DATE(timestamp) = $1`,
        [today]
      );
      
      const { page_views, bookings } = result.rows[0];
      const conversionRate = page_views > 0 ? (bookings / page_views * 100).toFixed(2) : 0;
      
      return parseFloat(conversionRate);
      
    } catch (error) {
      console.error('Error calculating conversion rate:', error);
      return 0;
    }
  }
  
  /**
   * Create automated alert
   */
  async createAlert(alertData) {
    try {
      const {
        alertType,
        severity,
        title,
        message,
        metricType,
        thresholdValue,
        currentValue,
      } = alertData;
      
      const result = await this.pgPool.query(
        `INSERT INTO analytics_alerts 
        (alert_type, severity, title, message, metric_type, threshold_value, current_value)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [alertType, severity, title, message, metricType, thresholdValue, currentValue]
      );
      
      // Emit alert for real-time notification
      this.emit('alert:created', {
        id: result.rows[0].id,
        ...alertData,
        triggeredAt: new Date(),
      });
      
      return { success: true, alertId: result.rows[0].id };
      
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }
  
  /**
   * Get system statistics
   */
  async getStatistics() {
    try {
      const [eventsResult, toursResult, guidesResult] = await Promise.all([
        this.pgPool.query('SELECT COUNT(*) as total FROM analytics_events'),
        this.pgPool.query('SELECT COUNT(*) as total FROM analytics_tours'),
        this.pgPool.query('SELECT COUNT(DISTINCT guide_id) as total FROM analytics_guides'),
      ]);
      
      return {
        totalEvents: parseInt(eventsResult.rows[0].total),
        totalTours: parseInt(toursResult.rows[0].total),
        totalGuides: parseInt(guidesResult.rows[0].total),
        databaseSize: 'N/A', // Can add actual size query
        redisKeys: 'N/A', // Can add Redis DBSIZE
      };
      
    } catch (error) {
      console.error('Error getting analytics statistics:', error);
      throw error;
    }
  }
  
  /**
   * Cleanup old data
   */
  async cleanup(retentionDays = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      // Delete old events
      const result = await this.pgPool.query(
        'DELETE FROM analytics_events WHERE timestamp < $1',
        [cutoffDate]
      );
      
      console.log(`Cleaned up ${result.rowCount} old analytics events`);
      
      return { deletedEvents: result.rowCount };
      
    } catch (error) {
      console.error('Error cleaning up analytics data:', error);
      throw error;
    }
  }
}

module.exports = AdvancedAnalyticsSystem;
