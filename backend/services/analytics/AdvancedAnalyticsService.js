/**
 * Advanced Analytics Service - Sprint 25 (Fase 7)
 * 
 * Comprehensive data aggregation and KPI calculation service for executive dashboards.
 * Provides multi-dimensional analytics across all business domains.
 * 
 * Features:
 * - Executive KPI calculations (revenue, growth, efficiency, customer satisfaction)
 * - Multi-dimensional data aggregation
 * - Period-over-period comparisons
 * - Business intelligence metrics
 * - Performance scoring and categorization
 * - Cached results for performance optimization
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');

class AdvancedAnalyticsService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Time periods for analysis
      defaultPeriod: '30d', // 7d, 30d, 90d, 1y, all
      comparisonEnabled: true,
      
      // Performance thresholds
      thresholds: {
        revenue: {
          excellent: 1000000,
          good: 500000,
          fair: 250000,
          poor: 100000
        },
        growthRate: {
          excellent: 0.20, // 20%
          good: 0.10,
          fair: 0.05,
          poor: 0.01
        },
        customerSatisfaction: {
          excellent: 4.5,
          good: 4.0,
          fair: 3.5,
          poor: 3.0
        },
        conversionRate: {
          excellent: 0.15,
          good: 0.10,
          fair: 0.05,
          poor: 0.02
        }
      },
      
      // Cache settings
      cacheEnabled: true,
      cacheTTL: 300, // 5 minutes
      
      ...config
    };
    
    this.cache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🚀 Initializing AdvancedAnalyticsService...');
    
    try {
      // Test database connection
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB not connected');
      }
      
      this.initialized = true;
      this.emit('initialized');
      console.log('✅ AdvancedAnalyticsService initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ AdvancedAnalyticsService initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get Executive Dashboard KPIs
   * 
   * @param {Object} options - Query options
   * @param {String} options.workspaceId - Workspace ID
   * @param {Date} options.startDate - Start date
   * @param {Date} options.endDate - End date
   * @param {String} options.period - Period (7d, 30d, 90d, 1y, all)
   * @param {Boolean} options.includeComparison - Include period comparison
   * @returns {Object} Executive KPIs
   */
  async getExecutiveKPIs(options = {}) {
    const {
      workspaceId,
      startDate = this.getDefaultStartDate(),
      endDate = new Date(),
      period = this.config.defaultPeriod,
      includeComparison = true
    } = options;

    const cacheKey = `executive_kpis_${workspaceId}_${period}_${startDate}_${endDate}`;
    
    // Check cache
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL * 1000) {
        return cached.data;
      }
    }

    try {
      // Calculate all KPIs in parallel
      const [
        revenueMetrics,
        customerMetrics,
        operationalMetrics,
        employeeMetrics,
        growthMetrics
      ] = await Promise.all([
        this.calculateRevenueMetrics(workspaceId, startDate, endDate),
        this.calculateCustomerMetrics(workspaceId, startDate, endDate),
        this.calculateOperationalMetrics(workspaceId, startDate, endDate),
        this.calculateEmployeeMetrics(workspaceId, startDate, endDate),
        this.calculateGrowthMetrics(workspaceId, startDate, endDate)
      ]);

      // Calculate comparison if enabled
      let comparison = null;
      if (includeComparison) {
        const prevPeriod = this.getPreviousPeriod(startDate, endDate);
        comparison = await this.calculatePeriodComparison(
          workspaceId,
          { start: startDate, end: endDate },
          prevPeriod
        );
      }

      // Calculate overall health score
      const healthScore = this.calculateHealthScore({
        revenueMetrics,
        customerMetrics,
        operationalMetrics,
        employeeMetrics,
        growthMetrics
      });

      const result = {
        workspaceId,
        period: { startDate, endDate, label: period },
        generatedAt: new Date(),
        
        // Core metrics
        revenueMetrics,
        customerMetrics,
        operationalMetrics,
        employeeMetrics,
        growthMetrics,
        
        // Overall scores
        healthScore,
        comparison,
        
        // Summary
        summary: {
          totalRevenue: revenueMetrics.totalRevenue,
          totalCustomers: customerMetrics.totalCustomers,
          averageOrderValue: revenueMetrics.averageOrderValue,
          customerSatisfaction: customerMetrics.averageSatisfaction,
          employeePerformance: employeeMetrics.averagePerformance,
          growthRate: growthMetrics.overallGrowthRate
        }
      };

      // Cache result
      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      }

      this.emit('kpis_calculated', result);
      return result;
      
    } catch (error) {
      console.error('Error calculating executive KPIs:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Calculate revenue metrics
   */
  async calculateRevenueMetrics(workspaceId, startDate, endDate) {
    try {
      // Mock implementation - replace with actual model queries
      const Booking = mongoose.model('Booking');
      
      const bookings = await Booking.aggregate([
        {
          $match: {
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'completed'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalPrice' },
            count: { $sum: 1 },
            averageOrderValue: { $avg: '$totalPrice' }
          }
        }
      ]);

      const data = bookings[0] || { totalRevenue: 0, count: 0, averageOrderValue: 0 };

      return {
        totalRevenue: data.totalRevenue || 0,
        bookingCount: data.count || 0,
        averageOrderValue: data.averageOrderValue || 0,
        revenuePerDay: this.calculateDailyAverage(data.totalRevenue, startDate, endDate),
        category: this.categorizeMetric(data.totalRevenue, this.config.thresholds.revenue),
        trend: 'stable' // Will be calculated from historical data
      };
      
    } catch (error) {
      console.error('Error calculating revenue metrics:', error);
      return this.getDefaultRevenueMetrics();
    }
  }

  /**
   * Calculate customer metrics
   */
  async calculateCustomerMetrics(workspaceId, startDate, endDate) {
    try {
      const Customer = mongoose.model('Customer');
      const Review = mongoose.model('Review');

      // Total customers
      const totalCustomers = await Customer.countDocuments({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        createdAt: { $gte: startDate, $lte: endDate }
      });

      // New customers
      const newCustomers = await Customer.countDocuments({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        createdAt: { $gte: startDate, $lte: endDate }
      });

      // Average satisfaction from reviews
      const satisfactionData = await Review.aggregate([
        {
          $match: {
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            count: { $sum: 1 }
          }
        }
      ]);

      const avgSatisfaction = satisfactionData[0]?.averageRating || 0;

      // Retention rate (customers with 2+ bookings)
      const repeatCustomers = await Customer.countDocuments({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        bookingCount: { $gte: 2 }
      });

      const retentionRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) : 0;

      return {
        totalCustomers,
        newCustomers,
        repeatCustomers,
        retentionRate: retentionRate * 100,
        averageSatisfaction: avgSatisfaction,
        reviewCount: satisfactionData[0]?.count || 0,
        category: this.categorizeMetric(avgSatisfaction, this.config.thresholds.customerSatisfaction),
        trend: 'improving'
      };
      
    } catch (error) {
      console.error('Error calculating customer metrics:', error);
      return this.getDefaultCustomerMetrics();
    }
  }

  /**
   * Calculate operational metrics
   */
  async calculateOperationalMetrics(workspaceId, startDate, endDate) {
    try {
      const Booking = mongoose.model('Booking');
      const Conversation = mongoose.model('Conversation');

      // Booking conversion rate
      const inquiries = await Conversation.countDocuments({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const conversions = await Booking.countDocuments({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ['confirmed', 'completed'] }
      });

      const conversionRate = inquiries > 0 ? (conversions / inquiries) : 0;

      // Average response time from conversations
      const responseTimeData = await Conversation.aggregate([
        {
          $match: {
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            createdAt: { $gte: startDate, $lte: endDate },
            firstResponseTime: { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: '$firstResponseTime' }
          }
        }
      ]);

      const avgResponseTime = responseTimeData[0]?.avgResponseTime || 0;

      return {
        totalInquiries: inquiries,
        totalConversions: conversions,
        conversionRate: conversionRate * 100,
        averageResponseTime: avgResponseTime,
        activeAgents: 0, // Will be calculated from agent activity
        automationRate: 0, // Will be calculated from AI vs human handling
        category: this.categorizeMetric(conversionRate, this.config.thresholds.conversionRate),
        trend: 'stable'
      };
      
    } catch (error) {
      console.error('Error calculating operational metrics:', error);
      return this.getDefaultOperationalMetrics();
    }
  }

  /**
   * Calculate employee metrics
   */
  async calculateEmployeeMetrics(workspaceId, startDate, endDate) {
    try {
      const EmployeePerformance = mongoose.model('EmployeePerformance');

      const performanceData = await EmployeePerformance.aggregate([
        {
          $match: {
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            'period.startDate': { $gte: startDate },
            'period.endDate': { $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            averagePerformance: { $avg: '$overallScore.total' },
            employeeCount: { $sum: 1 },
            totalProductivity: { $sum: '$productivityMetrics.score' },
            totalQuality: { $sum: '$qualityMetrics.score' }
          }
        }
      ]);

      const data = performanceData[0] || {};

      return {
        totalEmployees: data.employeeCount || 0,
        averagePerformance: data.averagePerformance || 0,
        averageProductivity: data.employeeCount > 0 ? (data.totalProductivity / data.employeeCount) : 0,
        averageQuality: data.employeeCount > 0 ? (data.totalQuality / data.employeeCount) : 0,
        topPerformers: 0, // Count of employees > 80 score
        needsImprovement: 0, // Count of employees < 60 score
        category: 'good',
        trend: 'stable'
      };
      
    } catch (error) {
      console.error('Error calculating employee metrics:', error);
      return this.getDefaultEmployeeMetrics();
    }
  }

  /**
   * Calculate growth metrics
   */
  async calculateGrowthMetrics(workspaceId, startDate, endDate) {
    try {
      const Booking = mongoose.model('Booking');
      const Customer = mongoose.model('Customer');

      // Current period revenue
      const currentRevenue = await Booking.aggregate([
        {
          $match: {
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'completed'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalPrice' }
          }
        }
      ]);

      // Previous period for comparison
      const prevPeriod = this.getPreviousPeriod(startDate, endDate);
      const previousRevenue = await Booking.aggregate([
        {
          $match: {
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            createdAt: { $gte: prevPeriod.start, $lte: prevPeriod.end },
            status: { $in: ['confirmed', 'completed'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalPrice' }
          }
        }
      ]);

      const current = currentRevenue[0]?.total || 0;
      const previous = previousRevenue[0]?.total || 0;

      const revenueGrowthRate = previous > 0 ? ((current - previous) / previous) : 0;

      // Customer growth
      const currentCustomers = await Customer.countDocuments({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const previousCustomers = await Customer.countDocuments({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        createdAt: { $gte: prevPeriod.start, $lte: prevPeriod.end }
      });

      const customerGrowthRate = previousCustomers > 0 
        ? ((currentCustomers - previousCustomers) / previousCustomers) 
        : 0;

      const overallGrowthRate = (revenueGrowthRate + customerGrowthRate) / 2;

      return {
        revenueGrowthRate: revenueGrowthRate * 100,
        customerGrowthRate: customerGrowthRate * 100,
        bookingGrowthRate: 0, // Similar calculation
        overallGrowthRate: overallGrowthRate * 100,
        monthOverMonth: 0,
        yearOverYear: 0,
        category: this.categorizeMetric(overallGrowthRate, this.config.thresholds.growthRate),
        trend: overallGrowthRate > 0 ? 'improving' : 'declining'
      };
      
    } catch (error) {
      console.error('Error calculating growth metrics:', error);
      return this.getDefaultGrowthMetrics();
    }
  }

  /**
   * Calculate health score based on all metrics
   */
  calculateHealthScore(metrics) {
    const weights = {
      revenue: 0.30,
      customer: 0.25,
      operational: 0.20,
      employee: 0.15,
      growth: 0.10
    };

    // Convert categories to scores
    const categoryScores = {
      'excellent': 100,
      'good': 75,
      'fair': 50,
      'poor': 25,
      'critical': 0
    };

    const scores = {
      revenue: categoryScores[metrics.revenueMetrics.category] || 50,
      customer: categoryScores[metrics.customerMetrics.category] || 50,
      operational: categoryScores[metrics.operationalMetrics.category] || 50,
      employee: categoryScores[metrics.employeeMetrics.category] || 50,
      growth: categoryScores[metrics.growthMetrics.category] || 50
    };

    const totalScore = 
      scores.revenue * weights.revenue +
      scores.customer * weights.customer +
      scores.operational * weights.operational +
      scores.employee * weights.employee +
      scores.growth * weights.growth;

    let category;
    if (totalScore >= 80) category = 'excellent';
    else if (totalScore >= 60) category = 'good';
    else if (totalScore >= 40) category = 'fair';
    else if (totalScore >= 20) category = 'poor';
    else category = 'critical';

    return {
      totalScore: Math.round(totalScore),
      category,
      breakdown: scores,
      weights
    };
  }

  /**
   * Calculate period-over-period comparison
   */
  async calculatePeriodComparison(workspaceId, currentPeriod, previousPeriod) {
    try {
      const [currentKPIs, previousKPIs] = await Promise.all([
        this.getExecutiveKPIs({
          workspaceId,
          startDate: currentPeriod.start,
          endDate: currentPeriod.end,
          includeComparison: false
        }),
        this.getExecutiveKPIs({
          workspaceId,
          startDate: previousPeriod.start,
          endDate: previousPeriod.end,
          includeComparison: false
        })
      ]);

      const calculateChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      return {
        revenue: {
          current: currentKPIs.revenueMetrics.totalRevenue,
          previous: previousKPIs.revenueMetrics.totalRevenue,
          change: calculateChange(
            currentKPIs.revenueMetrics.totalRevenue,
            previousKPIs.revenueMetrics.totalRevenue
          ),
          trend: currentKPIs.revenueMetrics.totalRevenue > previousKPIs.revenueMetrics.totalRevenue 
            ? 'up' : 'down'
        },
        customers: {
          current: currentKPIs.customerMetrics.totalCustomers,
          previous: previousKPIs.customerMetrics.totalCustomers,
          change: calculateChange(
            currentKPIs.customerMetrics.totalCustomers,
            previousKPIs.customerMetrics.totalCustomers
          ),
          trend: currentKPIs.customerMetrics.totalCustomers > previousKPIs.customerMetrics.totalCustomers 
            ? 'up' : 'down'
        },
        satisfaction: {
          current: currentKPIs.customerMetrics.averageSatisfaction,
          previous: previousKPIs.customerMetrics.averageSatisfaction,
          change: calculateChange(
            currentKPIs.customerMetrics.averageSatisfaction,
            previousKPIs.customerMetrics.averageSatisfaction
          ),
          trend: currentKPIs.customerMetrics.averageSatisfaction > previousKPIs.customerMetrics.averageSatisfaction 
            ? 'up' : 'down'
        },
        healthScore: {
          current: currentKPIs.healthScore.totalScore,
          previous: previousKPIs.healthScore.totalScore,
          change: calculateChange(
            currentKPIs.healthScore.totalScore,
            previousKPIs.healthScore.totalScore
          ),
          trend: currentKPIs.healthScore.totalScore > previousKPIs.healthScore.totalScore 
            ? 'up' : 'down'
        }
      };
      
    } catch (error) {
      console.error('Error calculating period comparison:', error);
      return null;
    }
  }

  /**
   * Helper: Get previous period dates
   */
  getPreviousPeriod(startDate, endDate) {
    const duration = endDate - startDate;
    return {
      start: new Date(startDate - duration),
      end: new Date(startDate)
    };
  }

  /**
   * Helper: Get default start date based on config
   */
  getDefaultStartDate() {
    const now = new Date();
    const period = this.config.defaultPeriod;
    
    if (period === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
    if (period === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000);
    if (period === '90d') return new Date(now - 90 * 24 * 60 * 60 * 1000);
    if (period === '1y') return new Date(now - 365 * 24 * 60 * 60 * 1000);
    
    return new Date(now - 30 * 24 * 60 * 60 * 1000); // Default 30 days
  }

  /**
   * Helper: Calculate daily average
   */
  calculateDailyAverage(total, startDate, endDate) {
    const days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
    return days > 0 ? total / days : 0;
  }

  /**
   * Helper: Categorize metric based on thresholds
   */
  categorizeMetric(value, thresholds) {
    if (value >= thresholds.excellent) return 'excellent';
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.fair) return 'fair';
    if (value >= thresholds.poor) return 'poor';
    return 'critical';
  }

  /**
   * Default metrics for error cases
   */
  getDefaultRevenueMetrics() {
    return {
      totalRevenue: 0,
      bookingCount: 0,
      averageOrderValue: 0,
      revenuePerDay: 0,
      category: 'poor',
      trend: 'stable'
    };
  }

  getDefaultCustomerMetrics() {
    return {
      totalCustomers: 0,
      newCustomers: 0,
      repeatCustomers: 0,
      retentionRate: 0,
      averageSatisfaction: 0,
      reviewCount: 0,
      category: 'poor',
      trend: 'stable'
    };
  }

  getDefaultOperationalMetrics() {
    return {
      totalInquiries: 0,
      totalConversions: 0,
      conversionRate: 0,
      averageResponseTime: 0,
      activeAgents: 0,
      automationRate: 0,
      category: 'poor',
      trend: 'stable'
    };
  }

  getDefaultEmployeeMetrics() {
    return {
      totalEmployees: 0,
      averagePerformance: 0,
      averageProductivity: 0,
      averageQuality: 0,
      topPerformers: 0,
      needsImprovement: 0,
      category: 'poor',
      trend: 'stable'
    };
  }

  getDefaultGrowthMetrics() {
    return {
      revenueGrowthRate: 0,
      customerGrowthRate: 0,
      bookingGrowthRate: 0,
      overallGrowthRate: 0,
      monthOverMonth: 0,
      yearOverYear: 0,
      category: 'poor',
      trend: 'stable'
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.emit('cache_cleared');
  }
}

// Singleton instance
let instance = null;

function getAdvancedAnalyticsService(config) {
  if (!instance) {
    instance = new AdvancedAnalyticsService(config);
  }
  return instance;
}

module.exports = {
  AdvancedAnalyticsService,
  getAdvancedAnalyticsService
};
