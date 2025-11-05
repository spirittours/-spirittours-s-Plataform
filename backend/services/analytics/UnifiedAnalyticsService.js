/**
 * Unified Analytics Service - SPRINT 5
 * 
 * Consolidates metrics from all modules:
 * - CRM (contacts, leads, deals, pipeline)
 * - AI Agents (interactions, insights)
 * - Email Campaigns (sent, responses, conversions)
 * - Bookings (confirmed, revenue)
 * 
 * Provides single source of truth for business metrics
 */

const Contact = require('../../models/crm/Contact');
const Deal = require('../../models/crm/Deal');
const Activity = require('../../models/crm/Activity');
const Project = require('../../models/crm/Project');
const Workflow = require('../../models/Workflow');
const WorkflowExecution = require('../../models/WorkflowExecution');
const logger = require('../../utils/logger');

class UnifiedAnalyticsService {
  /**
   * Get complete dashboard metrics for workspace
   */
  async getDashboardMetrics(workspaceId, dateRange = '30d') {
    try {
      const { startDate, endDate } = this.parseDateRange(dateRange);

      const [
        crmMetrics,
        salesMetrics,
        activityMetrics,
        projectMetrics,
        automationMetrics,
        growthMetrics,
      ] = await Promise.all([
        this.getCRMMetrics(workspaceId, startDate, endDate),
        this.getSalesMetrics(workspaceId, startDate, endDate),
        this.getActivityMetrics(workspaceId, startDate, endDate),
        this.getProjectMetrics(workspaceId, startDate, endDate),
        this.getAutomationMetrics(workspaceId, startDate, endDate),
        this.getGrowthMetrics(workspaceId, startDate, endDate),
      ]);

      return {
        dateRange: { startDate, endDate },
        summary: this.calculateSummary({
          crmMetrics,
          salesMetrics,
          activityMetrics,
          projectMetrics,
          automationMetrics,
          growthMetrics,
        }),
        crm: crmMetrics,
        sales: salesMetrics,
        activity: activityMetrics,
        projects: projectMetrics,
        automation: automationMetrics,
        growth: growthMetrics,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Get CRM metrics (contacts, leads, conversion rates)
   */
  async getCRMMetrics(workspaceId, startDate, endDate) {
    const [
      totalContacts,
      newContacts,
      totalLeads,
      newLeads,
      qualifiedLeads,
      conversionRate,
      leadsBySource,
      leadsByQuality,
    ] = await Promise.all([
      Contact.countDocuments({ workspace: workspaceId }),
      Contact.countDocuments({
        workspace: workspaceId,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      Contact.countDocuments({ workspace: workspaceId, type: 'lead' }),
      Contact.countDocuments({
        workspace: workspaceId,
        type: 'lead',
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      Contact.countDocuments({
        workspace: workspaceId,
        type: 'lead',
        leadQuality: { $in: ['hot', 'warm'] },
      }),
      this.calculateLeadToCustomerConversion(workspaceId, startDate, endDate),
      this.getLeadsBySource(workspaceId),
      this.getLeadsByQuality(workspaceId),
    ]);

    return {
      totalContacts,
      newContacts,
      totalLeads,
      newLeads,
      qualifiedLeads,
      conversionRate,
      leadsBySource,
      leadsByQuality,
      contactGrowth: this.calculateGrowthRate(totalContacts, newContacts),
    };
  }

  /**
   * Get sales metrics (deals, pipeline, revenue)
   */
  async getSalesMetrics(workspaceId, startDate, endDate) {
    const [
      totalDeals,
      newDeals,
      wonDeals,
      lostDeals,
      activeDeals,
      totalRevenue,
      wonRevenue,
      pipelineValue,
      averageDealSize,
      winRate,
      dealsByStage,
      revenueByMonth,
    ] = await Promise.all([
      Deal.countDocuments({ workspace: workspaceId }),
      Deal.countDocuments({
        workspace: workspaceId,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      Deal.countDocuments({
        workspace: workspaceId,
        status: 'won',
        wonAt: { $gte: startDate, $lte: endDate },
      }),
      Deal.countDocuments({
        workspace: workspaceId,
        status: 'lost',
        lostAt: { $gte: startDate, $lte: endDate },
      }),
      Deal.countDocuments({
        workspace: workspaceId,
        status: 'open',
      }),
      this.calculateTotalRevenue(workspaceId),
      this.calculateWonRevenue(workspaceId, startDate, endDate),
      this.calculatePipelineValue(workspaceId),
      this.calculateAverageDealSize(workspaceId, startDate, endDate),
      this.calculateWinRate(workspaceId, startDate, endDate),
      this.getDealsByStage(workspaceId),
      this.getRevenueByMonth(workspaceId, startDate, endDate),
    ]);

    return {
      totalDeals,
      newDeals,
      wonDeals,
      lostDeals,
      activeDeals,
      totalRevenue,
      wonRevenue,
      pipelineValue,
      averageDealSize,
      winRate,
      dealsByStage,
      revenueByMonth,
      salesVelocity: this.calculateSalesVelocity(wonDeals, wonRevenue),
    };
  }

  /**
   * Get activity metrics (interactions, engagements)
   */
  async getActivityMetrics(workspaceId, startDate, endDate) {
    const [
      totalActivities,
      newActivities,
      activitiesByType,
      topActiveUsers,
      engagementRate,
    ] = await Promise.all([
      Activity.countDocuments({ workspace: workspaceId }),
      Activity.countDocuments({
        workspace: workspaceId,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      this.getActivitiesByType(workspaceId, startDate, endDate),
      this.getTopActiveUsers(workspaceId, startDate, endDate),
      this.calculateEngagementRate(workspaceId, startDate, endDate),
    ]);

    return {
      totalActivities,
      newActivities,
      activitiesByType,
      topActiveUsers,
      engagementRate,
      averageActivitiesPerDay: this.calculateDailyAverage(
        newActivities,
        startDate,
        endDate
      ),
    };
  }

  /**
   * Get project metrics (active, completed, on-time delivery)
   */
  async getProjectMetrics(workspaceId, startDate, endDate) {
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      onTimeProjects,
      averageProjectDuration,
      projectsByStatus,
    ] = await Promise.all([
      Project.countDocuments({ workspace: workspaceId }),
      Project.countDocuments({
        workspace: workspaceId,
        status: 'in_progress',
      }),
      Project.countDocuments({
        workspace: workspaceId,
        status: 'completed',
        completedAt: { $gte: startDate, $lte: endDate },
      }),
      this.calculateOnTimeProjects(workspaceId, startDate, endDate),
      this.calculateAverageProjectDuration(workspaceId),
      this.getProjectsByStatus(workspaceId),
    ]);

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      onTimeProjects,
      onTimeRate:
        completedProjects > 0
          ? Math.round((onTimeProjects / completedProjects) * 100)
          : 0,
      averageProjectDuration,
      projectsByStatus,
    };
  }

  /**
   * Get automation metrics (workflows, executions, success rate)
   */
  async getAutomationMetrics(workspaceId, startDate, endDate) {
    const [
      totalWorkflows,
      activeWorkflows,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      workflowsByTrigger,
    ] = await Promise.all([
      Workflow.countDocuments({ workspace: workspaceId }),
      Workflow.countDocuments({
        workspace: workspaceId,
        status: 'active',
      }),
      WorkflowExecution.countDocuments({
        workspace: workspaceId,
        startTime: { $gte: startDate, $lte: endDate },
      }),
      WorkflowExecution.countDocuments({
        workspace: workspaceId,
        status: 'completed',
        startTime: { $gte: startDate, $lte: endDate },
      }),
      WorkflowExecution.countDocuments({
        workspace: workspaceId,
        status: 'failed',
        startTime: { $gte: startDate, $lte: endDate },
      }),
      this.calculateAverageExecutionTime(workspaceId, startDate, endDate),
      this.getWorkflowsByTrigger(workspaceId),
    ]);

    return {
      totalWorkflows,
      activeWorkflows,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate:
        totalExecutions > 0
          ? Math.round((successfulExecutions / totalExecutions) * 100)
          : 0,
      averageExecutionTime,
      workflowsByTrigger,
      timeSaved: this.calculateTimeSaved(successfulExecutions),
    };
  }

  /**
   * Get growth metrics (MoM, YoY trends)
   */
  async getGrowthMetrics(workspaceId, startDate, endDate) {
    const [
      contactGrowthMoM,
      dealGrowthMoM,
      revenueGrowthMoM,
      activityGrowthMoM,
    ] = await Promise.all([
      this.calculateMonthOverMonthGrowth(
        'contacts',
        workspaceId,
        startDate,
        endDate
      ),
      this.calculateMonthOverMonthGrowth(
        'deals',
        workspaceId,
        startDate,
        endDate
      ),
      this.calculateRevenueGrowthMoM(workspaceId, startDate, endDate),
      this.calculateMonthOverMonthGrowth(
        'activities',
        workspaceId,
        startDate,
        endDate
      ),
    ]);

    return {
      contactGrowthMoM,
      dealGrowthMoM,
      revenueGrowthMoM,
      activityGrowthMoM,
      overallHealthScore: this.calculateHealthScore({
        contactGrowthMoM,
        dealGrowthMoM,
        revenueGrowthMoM,
        activityGrowthMoM,
      }),
    };
  }

  // ===== Helper Methods =====

  parseDateRange(range) {
    const endDate = new Date();
    let startDate = new Date();

    switch (range) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    return { startDate, endDate };
  }

  calculateSummary(allMetrics) {
    const { crmMetrics, salesMetrics, activityMetrics, projectMetrics } =
      allMetrics;

    return {
      totalContacts: crmMetrics.totalContacts,
      totalDeals: salesMetrics.totalDeals,
      totalRevenue: salesMetrics.totalRevenue,
      activeProjects: projectMetrics.activeProjects,
      winRate: salesMetrics.winRate,
      conversionRate: crmMetrics.conversionRate,
      engagementRate: activityMetrics.engagementRate,
    };
  }

  async calculateLeadToCustomerConversion(workspaceId, startDate, endDate) {
    const totalLeads = await Contact.countDocuments({
      workspace: workspaceId,
      type: 'lead',
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const convertedLeads = await Contact.countDocuments({
      workspace: workspaceId,
      type: 'customer',
      createdAt: { $gte: startDate, $lte: endDate },
    });

    return totalLeads > 0
      ? Math.round((convertedLeads / totalLeads) * 100)
      : 0;
  }

  async getLeadsBySource(workspaceId) {
    return await Contact.aggregate([
      { $match: { workspace: workspaceId, type: 'lead' } },
      { $group: { _id: '$leadSource', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
  }

  async getLeadsByQuality(workspaceId) {
    return await Contact.aggregate([
      { $match: { workspace: workspaceId, type: 'lead' } },
      { $group: { _id: '$leadQuality', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  async calculateTotalRevenue(workspaceId) {
    const result = await Deal.aggregate([
      { $match: { workspace: workspaceId, status: 'won' } },
      { $group: { _id: null, total: { $sum: '$value' } } },
    ]);
    return result[0]?.total || 0;
  }

  async calculateWonRevenue(workspaceId, startDate, endDate) {
    const result = await Deal.aggregate([
      {
        $match: {
          workspace: workspaceId,
          status: 'won',
          wonAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: null, total: { $sum: '$value' } } },
    ]);
    return result[0]?.total || 0;
  }

  async calculatePipelineValue(workspaceId) {
    const result = await Deal.aggregate([
      { $match: { workspace: workspaceId, status: 'open' } },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$value', '$probability', 0.01] } },
        },
      },
    ]);
    return Math.round(result[0]?.total || 0);
  }

  async calculateAverageDealSize(workspaceId, startDate, endDate) {
    const result = await Deal.aggregate([
      {
        $match: {
          workspace: workspaceId,
          status: 'won',
          wonAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: null, avg: { $avg: '$value' } } },
    ]);
    return Math.round(result[0]?.avg || 0);
  }

  async calculateWinRate(workspaceId, startDate, endDate) {
    const wonDeals = await Deal.countDocuments({
      workspace: workspaceId,
      status: 'won',
      wonAt: { $gte: startDate, $lte: endDate },
    });

    const lostDeals = await Deal.countDocuments({
      workspace: workspaceId,
      status: 'lost',
      lostAt: { $gte: startDate, $lte: endDate },
    });

    const totalClosed = wonDeals + lostDeals;
    return totalClosed > 0 ? Math.round((wonDeals / totalClosed) * 100) : 0;
  }

  async getDealsByStage(workspaceId) {
    return await Deal.aggregate([
      { $match: { workspace: workspaceId, status: 'open' } },
      { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } },
      { $sort: { value: -1 } },
    ]);
  }

  async getRevenueByMonth(workspaceId, startDate, endDate) {
    return await Deal.aggregate([
      {
        $match: {
          workspace: workspaceId,
          status: 'won',
          wonAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$wonAt' },
            month: { $month: '$wonAt' },
          },
          revenue: { $sum: '$value' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
  }

  calculateSalesVelocity(wonDeals, wonRevenue) {
    return wonDeals > 0 ? Math.round(wonRevenue / wonDeals) : 0;
  }

  async getActivitiesByType(workspaceId, startDate, endDate) {
    return await Activity.aggregate([
      {
        $match: {
          workspace: workspaceId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
  }

  async getTopActiveUsers(workspaceId, startDate, endDate) {
    return await Activity.aggregate([
      {
        $match: {
          workspace: workspaceId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: '$createdBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
  }

  async calculateEngagementRate(workspaceId, startDate, endDate) {
    const totalContacts = await Contact.countDocuments({ workspace: workspaceId });
    const activeContacts = await Activity.distinct('entityId', {
      workspace: workspaceId,
      entityType: 'contact',
      createdAt: { $gte: startDate, $lte: endDate },
    });

    return totalContacts > 0
      ? Math.round((activeContacts.length / totalContacts) * 100)
      : 0;
  }

  calculateDailyAverage(total, startDate, endDate) {
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    return days > 0 ? Math.round((total / days) * 10) / 10 : 0;
  }

  async calculateOnTimeProjects(workspaceId, startDate, endDate) {
    return await Project.countDocuments({
      workspace: workspaceId,
      status: 'completed',
      completedAt: { $gte: startDate, $lte: endDate, $lte: '$endDate' },
    });
  }

  async calculateAverageProjectDuration(workspaceId) {
    const projects = await Project.find({
      workspace: workspaceId,
      status: 'completed',
      startDate: { $exists: true },
      completedAt: { $exists: true },
    }).select('startDate completedAt');

    if (projects.length === 0) return 0;

    const totalDays = projects.reduce((sum, project) => {
      const duration = Math.ceil(
        (project.completedAt - project.startDate) / (1000 * 60 * 60 * 24)
      );
      return sum + duration;
    }, 0);

    return Math.round(totalDays / projects.length);
  }

  async getProjectsByStatus(workspaceId) {
    return await Project.aggregate([
      { $match: { workspace: workspaceId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  async calculateAverageExecutionTime(workspaceId, startDate, endDate) {
    const result = await WorkflowExecution.aggregate([
      {
        $match: {
          workspace: workspaceId,
          status: 'completed',
          startTime: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          avg: { $avg: { $subtract: ['$endTime', '$startTime'] } },
        },
      },
    ]);

    // Convert milliseconds to seconds
    return result[0]?.avg ? Math.round(result[0].avg / 1000) : 0;
  }

  async getWorkflowsByTrigger(workspaceId) {
    return await Workflow.aggregate([
      { $match: { workspace: workspaceId, status: 'active' } },
      { $group: { _id: '$trigger.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  calculateTimeSaved(successfulExecutions) {
    // Estimate: each successful workflow execution saves 15 minutes
    const minutesSaved = successfulExecutions * 15;
    return {
      minutes: minutesSaved,
      hours: Math.round((minutesSaved / 60) * 10) / 10,
      days: Math.round((minutesSaved / (60 * 8)) * 10) / 10, // 8-hour workday
    };
  }

  async calculateMonthOverMonthGrowth(metric, workspaceId, startDate, endDate) {
    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(currentMonth.getMonth() - 1);

    const Model =
      metric === 'contacts'
        ? Contact
        : metric === 'deals'
        ? Deal
        : Activity;

    const [currentCount, lastCount] = await Promise.all([
      Model.countDocuments({
        workspace: workspaceId,
        createdAt: {
          $gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
        },
      }),
      Model.countDocuments({
        workspace: workspaceId,
        createdAt: {
          $gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
          $lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
        },
      }),
    ]);

    const growthRate =
      lastCount > 0 ? Math.round(((currentCount - lastCount) / lastCount) * 100) : 0;

    return {
      current: currentCount,
      previous: lastCount,
      growthRate,
      isPositive: growthRate >= 0,
    };
  }

  async calculateRevenueGrowthMoM(workspaceId, startDate, endDate) {
    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(currentMonth.getMonth() - 1);

    const [currentRevenue, lastRevenue] = await Promise.all([
      this.calculateWonRevenue(
        workspaceId,
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
        currentMonth
      ),
      this.calculateWonRevenue(
        workspaceId,
        new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      ),
    ]);

    const growthRate =
      lastRevenue > 0
        ? Math.round(((currentRevenue - lastRevenue) / lastRevenue) * 100)
        : 0;

    return {
      current: currentRevenue,
      previous: lastRevenue,
      growthRate,
      isPositive: growthRate >= 0,
    };
  }

  calculateHealthScore(growthMetrics) {
    const { contactGrowthMoM, dealGrowthMoM, revenueGrowthMoM, activityGrowthMoM } =
      growthMetrics;

    // Weighted scoring: Revenue (40%), Deals (30%), Contacts (20%), Activity (10%)
    const score =
      revenueGrowthMoM.growthRate * 0.4 +
      dealGrowthMoM.growthRate * 0.3 +
      contactGrowthMoM.growthRate * 0.2 +
      activityGrowthMoM.growthRate * 0.1;

    // Normalize to 0-100 scale
    const normalizedScore = Math.max(0, Math.min(100, 50 + score));

    return {
      score: Math.round(normalizedScore),
      status:
        normalizedScore >= 70
          ? 'excellent'
          : normalizedScore >= 50
          ? 'good'
          : normalizedScore >= 30
          ? 'fair'
          : 'poor',
    };
  }

  calculateGrowthRate(total, newItems) {
    const oldTotal = total - newItems;
    return oldTotal > 0 ? Math.round((newItems / oldTotal) * 100) : 0;
  }
}

module.exports = new UnifiedAnalyticsService();
