/**
 * Trend Analysis Service - Sprint 25 (Fase 7)
 * 
 * Time-series analysis and trend calculation service for business metrics.
 * Provides historical data analysis, pattern detection, and forecasting.
 * 
 * Features:
 * - Time-series data aggregation (daily, weekly, monthly, yearly)
 * - Trend calculations (moving averages, growth rates, seasonality)
 * - Period-over-period comparisons (MoM, YoY, QoQ)
 * - Pattern detection (peaks, valleys, anomalies)
 * - Data smoothing and interpolation
 * - Multi-metric trend analysis
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');

class TrendAnalysisService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Granularity options
      defaultGranularity: 'daily', // hourly, daily, weekly, monthly, yearly
      
      // Analysis settings
      movingAveragePeriods: [7, 30, 90], // Days for MA calculation
      smoothingFactor: 0.3, // For exponential smoothing
      anomalyThreshold: 2.5, // Standard deviations for anomaly detection
      
      // Supported metrics
      supportedMetrics: [
        'revenue',
        'bookings',
        'customers',
        'conversations',
        'satisfaction',
        'performance'
      ],
      
      ...config
    };
    
    this.initialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🚀 Initializing TrendAnalysisService...');
    
    try {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB not connected');
      }
      
      this.initialized = true;
      this.emit('initialized');
      console.log('✅ TrendAnalysisService initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ TrendAnalysisService initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get time-series data for a specific metric
   * 
   * @param {Object} options - Query options
   * @param {String} options.workspaceId - Workspace ID
   * @param {String} options.metric - Metric to analyze (revenue, bookings, etc.)
   * @param {Date} options.startDate - Start date
   * @param {Date} options.endDate - End date
   * @param {String} options.granularity - Time granularity (daily, weekly, monthly)
   * @param {Boolean} options.includeMovingAverage - Include moving average
   * @param {Boolean} options.includeGrowthRate - Include growth rate
   * @returns {Object} Time-series data with trends
   */
  async getTimeSeriesData(options = {}) {
    const {
      workspaceId,
      metric,
      startDate,
      endDate,
      granularity = this.config.defaultGranularity,
      includeMovingAverage = true,
      includeGrowthRate = true
    } = options;

    if (!this.config.supportedMetrics.includes(metric)) {
      throw new Error(`Unsupported metric: ${metric}`);
    }

    try {
      // Get raw time-series data
      const rawData = await this.fetchTimeSeriesData(
        workspaceId,
        metric,
        startDate,
        endDate,
        granularity
      );

      // Calculate moving averages
      let movingAverages = null;
      if (includeMovingAverage) {
        movingAverages = this.calculateMovingAverages(rawData);
      }

      // Calculate growth rates
      let growthRates = null;
      if (includeGrowthRate) {
        growthRates = this.calculateGrowthRates(rawData);
      }

      // Detect anomalies
      const anomalies = this.detectAnomalies(rawData);

      // Calculate trend direction
      const trend = this.calculateTrendDirection(rawData);

      // Calculate seasonality
      const seasonality = this.calculateSeasonality(rawData, granularity);

      return {
        metric,
        period: { startDate, endDate },
        granularity,
        data: rawData,
        movingAverages,
        growthRates,
        anomalies,
        trend,
        seasonality,
        summary: {
          total: this.sum(rawData.map(d => d.value)),
          average: this.average(rawData.map(d => d.value)),
          min: Math.min(...rawData.map(d => d.value)),
          max: Math.max(...rawData.map(d => d.value)),
          trend: trend.direction
        }
      };
      
    } catch (error) {
      console.error('Error getting time-series data:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Fetch raw time-series data from database
   */
  async fetchTimeSeriesData(workspaceId, metric, startDate, endDate, granularity) {
    const groupByFormat = this.getGroupByFormat(granularity);
    
    try {
      switch (metric) {
        case 'revenue':
          return await this.fetchRevenueTimeSeries(workspaceId, startDate, endDate, groupByFormat);
        case 'bookings':
          return await this.fetchBookingsTimeSeries(workspaceId, startDate, endDate, groupByFormat);
        case 'customers':
          return await this.fetchCustomersTimeSeries(workspaceId, startDate, endDate, groupByFormat);
        case 'conversations':
          return await this.fetchConversationsTimeSeries(workspaceId, startDate, endDate, groupByFormat);
        case 'satisfaction':
          return await this.fetchSatisfactionTimeSeries(workspaceId, startDate, endDate, groupByFormat);
        case 'performance':
          return await this.fetchPerformanceTimeSeries(workspaceId, startDate, endDate, groupByFormat);
        default:
          throw new Error(`Unsupported metric: ${metric}`);
      }
    } catch (error) {
      console.error(`Error fetching ${metric} time-series:`, error);
      return [];
    }
  }

  /**
   * Fetch revenue time-series
   */
  async fetchRevenueTimeSeries(workspaceId, startDate, endDate, groupByFormat) {
    const Booking = mongoose.model('Booking');
    
    const data = await Booking.aggregate([
      {
        $match: {
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['confirmed', 'completed'] }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupByFormat, date: '$createdAt' }
          },
          value: { $sum: '$totalPrice' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          value: 1,
          count: 1
        }
      }
    ]);

    return this.fillMissingDates(data, startDate, endDate, groupByFormat);
  }

  /**
   * Fetch bookings time-series
   */
  async fetchBookingsTimeSeries(workspaceId, startDate, endDate, groupByFormat) {
    const Booking = mongoose.model('Booking');
    
    const data = await Booking.aggregate([
      {
        $match: {
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupByFormat, date: '$createdAt' }
          },
          value: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          value: 1
        }
      }
    ]);

    return this.fillMissingDates(data, startDate, endDate, groupByFormat);
  }

  /**
   * Fetch customers time-series
   */
  async fetchCustomersTimeSeries(workspaceId, startDate, endDate, groupByFormat) {
    const Customer = mongoose.model('Customer');
    
    const data = await Customer.aggregate([
      {
        $match: {
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupByFormat, date: '$createdAt' }
          },
          value: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          value: 1
        }
      }
    ]);

    return this.fillMissingDates(data, startDate, endDate, groupByFormat);
  }

  /**
   * Fetch conversations time-series
   */
  async fetchConversationsTimeSeries(workspaceId, startDate, endDate, groupByFormat) {
    const Conversation = mongoose.model('Conversation');
    
    const data = await Conversation.aggregate([
      {
        $match: {
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupByFormat, date: '$createdAt' }
          },
          value: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          value: 1
        }
      }
    ]);

    return this.fillMissingDates(data, startDate, endDate, groupByFormat);
  }

  /**
   * Fetch satisfaction time-series
   */
  async fetchSatisfactionTimeSeries(workspaceId, startDate, endDate, groupByFormat) {
    const Review = mongoose.model('Review');
    
    const data = await Review.aggregate([
      {
        $match: {
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupByFormat, date: '$createdAt' }
          },
          value: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          value: 1,
          count: 1
        }
      }
    ]);

    return this.fillMissingDates(data, startDate, endDate, groupByFormat);
  }

  /**
   * Fetch performance time-series
   */
  async fetchPerformanceTimeSeries(workspaceId, startDate, endDate, groupByFormat) {
    const EmployeePerformance = mongoose.model('EmployeePerformance');
    
    const data = await EmployeePerformance.aggregate([
      {
        $match: {
          workspaceId: new mongoose.Types.ObjectId(workspaceId),
          'period.startDate': { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: groupByFormat, date: '$period.startDate' }
          },
          value: { $avg: '$overallScore.total' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          value: 1,
          count: 1
        }
      }
    ]);

    return this.fillMissingDates(data, startDate, endDate, groupByFormat);
  }

  /**
   * Calculate moving averages
   */
  calculateMovingAverages(data) {
    const periods = this.config.movingAveragePeriods;
    const result = {};

    periods.forEach(period => {
      result[`ma${period}`] = [];
      
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          result[`ma${period}`].push({ date: data[i].date, value: null });
        } else {
          const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.value, 0);
          const avg = sum / period;
          result[`ma${period}`].push({ date: data[i].date, value: avg });
        }
      }
    });

    return result;
  }

  /**
   * Calculate growth rates (period-over-period)
   */
  calculateGrowthRates(data) {
    const rates = [];
    
    for (let i = 1; i < data.length; i++) {
      const current = data[i].value;
      const previous = data[i - 1].value;
      
      const rate = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
      
      rates.push({
        date: data[i].date,
        value: rate,
        absolute: current - previous
      });
    }

    return rates;
  }

  /**
   * Detect anomalies using standard deviation
   */
  detectAnomalies(data) {
    const values = data.map(d => d.value);
    const mean = this.average(values);
    const stdDev = this.standardDeviation(values);
    
    const threshold = this.config.anomalyThreshold * stdDev;
    const anomalies = [];

    data.forEach((point, index) => {
      const deviation = Math.abs(point.value - mean);
      
      if (deviation > threshold) {
        anomalies.push({
          date: point.date,
          value: point.value,
          deviation,
          type: point.value > mean ? 'spike' : 'drop',
          severity: deviation / stdDev
        });
      }
    });

    return anomalies;
  }

  /**
   * Calculate trend direction using linear regression
   */
  calculateTrendDirection(data) {
    if (data.length < 2) {
      return { direction: 'insufficient_data', slope: 0, confidence: 0 };
    }

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data.map(d => d.value);

    // Calculate linear regression
    const sumX = this.sum(x);
    const sumY = this.sum(y);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    const yMean = this.average(y);
    const ssTotal = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
    const ssResidual = y.reduce((acc, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return acc + Math.pow(yi - predicted, 2);
    }, 0);
    
    const rSquared = 1 - (ssResidual / ssTotal);

    let direction;
    if (Math.abs(slope) < 0.01) direction = 'stable';
    else if (slope > 0) direction = 'increasing';
    else direction = 'decreasing';

    return {
      direction,
      slope,
      intercept,
      confidence: rSquared,
      strength: Math.abs(slope) > 1 ? 'strong' : Math.abs(slope) > 0.1 ? 'moderate' : 'weak'
    };
  }

  /**
   * Calculate seasonality patterns
   */
  calculateSeasonality(data, granularity) {
    if (granularity === 'yearly' || data.length < 7) {
      return null;
    }

    // Group by day of week or month depending on granularity
    const grouped = {};
    
    data.forEach(point => {
      const date = new Date(point.date);
      let key;
      
      if (granularity === 'daily' || granularity === 'weekly') {
        key = date.getDay(); // Day of week (0-6)
      } else {
        key = date.getMonth(); // Month (0-11)
      }
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(point.value);
    });

    // Calculate averages for each period
    const seasonalPattern = {};
    Object.keys(grouped).forEach(key => {
      seasonalPattern[key] = this.average(grouped[key]);
    });

    return {
      pattern: seasonalPattern,
      type: granularity === 'daily' || granularity === 'weekly' ? 'weekly' : 'monthly'
    };
  }

  /**
   * Get date format for MongoDB grouping
   */
  getGroupByFormat(granularity) {
    switch (granularity) {
      case 'hourly': return '%Y-%m-%d-%H';
      case 'daily': return '%Y-%m-%d';
      case 'weekly': return '%Y-%U'; // Year-Week
      case 'monthly': return '%Y-%m';
      case 'yearly': return '%Y';
      default: return '%Y-%m-%d';
    }
  }

  /**
   * Fill missing dates in time-series data
   */
  fillMissingDates(data, startDate, endDate, format) {
    if (data.length === 0) return [];

    const filledData = [];
    const existingDates = new Set(data.map(d => d.date));
    
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dateStr = this.formatDate(currentDate, format);
      
      const existing = data.find(d => d.date === dateStr);
      if (existing) {
        filledData.push(existing);
      } else {
        filledData.push({ date: dateStr, value: 0 });
      }

      // Increment date based on granularity
      if (format.includes('%H')) {
        currentDate.setHours(currentDate.getHours() + 1);
      } else if (format.includes('%U')) {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (format.includes('%m') && !format.includes('%d')) {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (format.includes('%Y') && format.split('-').length === 1) {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return filledData;
  }

  /**
   * Format date according to MongoDB format
   */
  formatDate(date, format) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const week = this.getWeekNumber(date);

    return format
      .replace('%Y', year)
      .replace('%m', month)
      .replace('%d', day)
      .replace('%H', hour)
      .replace('%U', week);
  }

  /**
   * Get week number of year
   */
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return String(Math.ceil((((d - yearStart) / 86400000) + 1) / 7)).padStart(2, '0');
  }

  /**
   * Math helpers
   */
  sum(array) {
    return array.reduce((acc, val) => acc + val, 0);
  }

  average(array) {
    return array.length > 0 ? this.sum(array) / array.length : 0;
  }

  standardDeviation(array) {
    const avg = this.average(array);
    const squaredDiffs = array.map(val => Math.pow(val - avg, 2));
    const variance = this.average(squaredDiffs);
    return Math.sqrt(variance);
  }
}

// Singleton instance
let instance = null;

function getTrendAnalysisService(config) {
  if (!instance) {
    instance = new TrendAnalysisService(config);
  }
  return instance;
}

module.exports = {
  TrendAnalysisService,
  getTrendAnalysisService
};
