/**
 * Statistics Routes
 * 
 * Provides real-time statistics endpoints for CRM dashboard
 * Includes workspace stats, dashboard metrics, and analytics
 */

const express = require('express');
const router = express.Router();
const statisticsService = require('../../services/crm/statistics.service');
const { authenticate } = require('../../middleware/auth');

/**
 * @route   GET /api/crm/statistics/workspace/:workspaceId
 * @desc    Get comprehensive workspace statistics
 * @access  Private
 */
router.get('/workspace/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate } = req.query;

    const statistics = await statisticsService.getWorkspaceStatistics(
      workspaceId,
      { startDate, endDate }
    );

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Error fetching workspace statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workspace statistics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/crm/statistics/dashboard/:workspaceId
 * @desc    Get real-time dashboard metrics
 * @access  Private
 */
router.get('/dashboard/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const metrics = await statisticsService.getDashboardMetrics(workspaceId);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard metrics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/crm/statistics/deals/:workspaceId
 * @desc    Get deal statistics
 * @access  Private
 */
router.get('/deals/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const statistics = await statisticsService.getDealStatistics(workspaceId, dateFilter);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Error fetching deal statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deal statistics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/crm/statistics/contacts/:workspaceId
 * @desc    Get contact statistics
 * @access  Private
 */
router.get('/contacts/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const statistics = await statisticsService.getContactStatistics(workspaceId, dateFilter);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Error fetching contact statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact statistics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/crm/statistics/activities/:workspaceId
 * @desc    Get activity statistics
 * @access  Private
 */
router.get('/activities/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const statistics = await statisticsService.getActivityStatistics(workspaceId, dateFilter);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Error fetching activity statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity statistics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/crm/statistics/pipelines/:workspaceId
 * @desc    Get pipeline statistics
 * @access  Private
 */
router.get('/pipelines/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const statistics = await statisticsService.getPipelineStatistics(workspaceId);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Error fetching pipeline statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pipeline statistics',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/crm/statistics/boards/:workspaceId
 * @desc    Get board statistics
 * @access  Private
 */
router.get('/boards/:workspaceId', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const statistics = await statisticsService.getBoardStatistics(workspaceId);

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Error fetching board statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch board statistics',
      error: error.message,
    });
  }
});

module.exports = router;
