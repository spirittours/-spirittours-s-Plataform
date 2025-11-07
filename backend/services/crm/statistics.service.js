/**
 * CRM Statistics Service
 * 
 * Provides real-time statistics calculation for CRM dashboard
 * Aggregates data from multiple collections for comprehensive insights
 */

const Workspace = require('../../models/Workspace');
const Pipeline = require('../../models/Pipeline');
const Deal = require('../../models/Deal');
const Contact = require('../../models/Contact');
const Board = require('../../models/Board');
const Item = require('../../models/Item');
const Activity = require('../../models/Activity');

class StatisticsService {
  /**
   * Get comprehensive workspace statistics
   * @param {String} workspaceId - Workspace ID
   * @param {Object} options - Options for date range, filters
   * @returns {Object} Statistics object
   */
  async getWorkspaceStatistics(workspaceId, options = {}) {
    const { startDate, endDate } = options;
    const dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Parallel statistics gathering for performance
    const [
      dealStats,
      contactStats,
      activityStats,
      pipelineStats,
      boardStats,
    ] = await Promise.all([
      this.getDealStatistics(workspaceId, dateFilter),
      this.getContactStatistics(workspaceId, dateFilter),
      this.getActivityStatistics(workspaceId, dateFilter),
      this.getPipelineStatistics(workspaceId),
      this.getBoardStatistics(workspaceId),
    ]);

    return {
      workspace: workspaceId,
      timestamp: new Date(),
      deals: dealStats,
      contacts: contactStats,
      activities: activityStats,
      pipelines: pipelineStats,
      boards: boardStats,
    };
  }

  /**
   * Get deal-related statistics
   * @param {String} workspaceId
   * @param {Object} dateFilter
   * @returns {Object} Deal statistics
   */
  async getDealStatistics(workspaceId, dateFilter = {}) {
    const deals = await Deal.find({ workspace: workspaceId, ...dateFilter });

    const stats = {
      total: deals.length,
      totalValue: 0,
      totalExpectedValue: 0,
      averageValue: 0,
      averageExpectedValue: 0,
      wonDeals: 0,
      wonValue: 0,
      lostDeals: 0,
      lostValue: 0,
      activeDeals: 0,
      rottenDeals: 0,
      priorityDistribution: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
      stageDistribution: {},
      winRate: 0,
      averageDealAge: 0,
      averageTimeToClose: 0,
    };

    const now = Date.now();
    let totalAge = 0;
    let totalTimeToClose = 0;
    let closedDealsCount = 0;

    deals.forEach(deal => {
      // Value calculations
      stats.totalValue += deal.value || 0;
      stats.totalExpectedValue += deal.expectedValue || 0;

      // Win/Loss tracking
      if (deal.status === 'won') {
        stats.wonDeals++;
        stats.wonValue += deal.value || 0;
        if (deal.closedDate && deal.createdAt) {
          totalTimeToClose += deal.closedDate - deal.createdAt;
          closedDealsCount++;
        }
      } else if (deal.status === 'lost') {
        stats.lostDeals++;
        stats.lostValue += deal.value || 0;
      } else {
        stats.activeDeals++;
      }

      // Rotten deals
      if (deal.isRotten) {
        stats.rottenDeals++;
      }

      // Priority distribution
      if (deal.priority && stats.priorityDistribution[deal.priority] !== undefined) {
        stats.priorityDistribution[deal.priority]++;
      }

      // Stage distribution
      const stageId = deal.stage?.toString() || 'unknown';
      stats.stageDistribution[stageId] = (stats.stageDistribution[stageId] || 0) + 1;

      // Age calculation
      totalAge += now - new Date(deal.createdAt).getTime();
    });

    // Calculate averages
    if (deals.length > 0) {
      stats.averageValue = stats.totalValue / deals.length;
      stats.averageExpectedValue = stats.totalExpectedValue / deals.length;
      stats.averageDealAge = totalAge / deals.length / (1000 * 60 * 60 * 24); // Convert to days
    }

    if (closedDealsCount > 0) {
      stats.averageTimeToClose = totalTimeToClose / closedDealsCount / (1000 * 60 * 60 * 24); // Convert to days
    }

    // Win rate calculation
    const totalClosedDeals = stats.wonDeals + stats.lostDeals;
    if (totalClosedDeals > 0) {
      stats.winRate = (stats.wonDeals / totalClosedDeals) * 100;
    }

    return stats;
  }

  /**
   * Get contact-related statistics
   * @param {String} workspaceId
   * @param {Object} dateFilter
   * @returns {Object} Contact statistics
   */
  async getContactStatistics(workspaceId, dateFilter = {}) {
    const contacts = await Contact.find({ workspace: workspaceId, ...dateFilter });

    const stats = {
      total: contacts.length,
      leads: 0,
      customers: 0,
      partners: 0,
      averageLeadScore: 0,
      averageEngagementScore: 0,
      qualityDistribution: {
        hot: 0,
        warm: 0,
        cold: 0,
      },
      sourceDistribution: {},
      topSources: [],
      conversionRate: 0,
      newContacts: 0,
    };

    let totalLeadScore = 0;
    let totalEngagementScore = 0;
    let leadsCount = 0;

    contacts.forEach(contact => {
      // Type distribution
      if (contact.type === 'lead') {
        stats.leads++;
        leadsCount++;
        totalLeadScore += contact.leadScore || 0;
      } else if (contact.type === 'customer') {
        stats.customers++;
      } else if (contact.type === 'partner') {
        stats.partners++;
      }

      // Quality distribution
      if (contact.leadQuality && stats.qualityDistribution[contact.leadQuality] !== undefined) {
        stats.qualityDistribution[contact.leadQuality]++;
      }

      // Source tracking
      if (contact.source) {
        stats.sourceDistribution[contact.source] = (stats.sourceDistribution[contact.source] || 0) + 1;
      }

      // Engagement score
      totalEngagementScore += contact.engagementScore || 0;

      // New contacts (last 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      if (new Date(contact.createdAt).getTime() > thirtyDaysAgo) {
        stats.newContacts++;
      }
    });

    // Calculate averages
    if (leadsCount > 0) {
      stats.averageLeadScore = totalLeadScore / leadsCount;
    }

    if (contacts.length > 0) {
      stats.averageEngagementScore = totalEngagementScore / contacts.length;
    }

    // Conversion rate
    if (stats.leads > 0) {
      stats.conversionRate = (stats.customers / (stats.leads + stats.customers)) * 100;
    }

    // Top sources
    stats.topSources = Object.entries(stats.sourceDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));

    return stats;
  }

  /**
   * Get activity statistics
   * @param {String} workspaceId
   * @param {Object} dateFilter
   * @returns {Object} Activity statistics
   */
  async getActivityStatistics(workspaceId, dateFilter = {}) {
    const activities = await Activity.find({ workspace: workspaceId, ...dateFilter });

    const stats = {
      total: activities.length,
      typeDistribution: {},
      topUsers: {},
      todayActivities: 0,
      weekActivities: 0,
      monthActivities: 0,
      activityTrend: [],
    };

    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

    activities.forEach(activity => {
      // Type distribution
      stats.typeDistribution[activity.type] = (stats.typeDistribution[activity.type] || 0) + 1;

      // User activity tracking
      const userId = activity.user?.toString() || 'unknown';
      stats.topUsers[userId] = (stats.topUsers[userId] || 0) + 1;

      // Time-based counts
      const activityTime = new Date(activity.createdAt).getTime();
      if (activityTime > oneDayAgo) stats.todayActivities++;
      if (activityTime > oneWeekAgo) stats.weekActivities++;
      if (activityTime > oneMonthAgo) stats.monthActivities++;
    });

    // Convert topUsers to array and sort
    stats.topUsers = Object.entries(stats.topUsers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({ userId, count }));

    return stats;
  }

  /**
   * Get pipeline statistics
   * @param {String} workspaceId
   * @returns {Object} Pipeline statistics
   */
  async getPipelineStatistics(workspaceId) {
    const pipelines = await Pipeline.find({ workspace: workspaceId })
      .populate('deals');

    const stats = {
      total: pipelines.length,
      pipelines: [],
      totalStages: 0,
      averageStagesPerPipeline: 0,
    };

    pipelines.forEach(pipeline => {
      stats.totalStages += pipeline.stages.length;
      
      stats.pipelines.push({
        id: pipeline._id,
        name: pipeline.name,
        stageCount: pipeline.stages.length,
        dealCount: pipeline.dealCount || 0,
        totalValue: pipeline.totalValue || 0,
      });
    });

    if (pipelines.length > 0) {
      stats.averageStagesPerPipeline = stats.totalStages / pipelines.length;
    }

    return stats;
  }

  /**
   * Get board statistics
   * @param {String} workspaceId
   * @returns {Object} Board statistics
   */
  async getBoardStatistics(workspaceId) {
    const boards = await Board.find({ workspace: workspaceId });

    const stats = {
      total: boards.length,
      totalColumns: 0,
      totalViews: 0,
      totalAutomations: 0,
      columnTypeDistribution: {},
      viewTypeDistribution: {},
    };

    boards.forEach(board => {
      stats.totalColumns += board.columns.length;
      stats.totalViews += board.views.length;
      stats.totalAutomations += board.automations.length;

      // Column types
      board.columns.forEach(column => {
        stats.columnTypeDistribution[column.type] = (stats.columnTypeDistribution[column.type] || 0) + 1;
      });

      // View types
      board.views.forEach(view => {
        stats.viewTypeDistribution[view.type] = (stats.viewTypeDistribution[view.type] || 0) + 1;
      });
    });

    return stats;
  }

  /**
   * Get real-time dashboard metrics
   * @param {String} workspaceId
   * @returns {Object} Real-time metrics
   */
  async getDashboardMetrics(workspaceId) {
    const [
      totalDeals,
      totalContacts,
      totalBoards,
      recentActivities,
      hotLeads,
      rottenDeals,
    ] = await Promise.all([
      Deal.countDocuments({ workspace: workspaceId }),
      Contact.countDocuments({ workspace: workspaceId }),
      Board.countDocuments({ workspace: workspaceId }),
      Activity.find({ workspace: workspaceId }).sort({ createdAt: -1 }).limit(10),
      Contact.find({ workspace: workspaceId, leadQuality: 'hot' }).limit(5),
      Deal.find({ workspace: workspaceId, isRotten: true }).limit(5),
    ]);

    return {
      totalDeals,
      totalContacts,
      totalBoards,
      recentActivities,
      hotLeads,
      rottenDeals,
      timestamp: new Date(),
    };
  }
}

module.exports = new StatisticsService();
