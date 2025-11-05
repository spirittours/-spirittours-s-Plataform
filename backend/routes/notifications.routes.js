const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/notifications/:workspaceId
 * @desc    Get all notifications for authenticated user
 * @access  Private
 */
router.get('/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      type, 
      read, 
      priority 
    } = req.query;

    // Build query
    const query = {
      userId: req.user.id,
      workspaceId
    };

    if (type) query.type = type;
    if (read !== undefined) query.read = read === 'true';
    if (priority) query.priority = priority;

    // Get notifications with pagination
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
});

/**
 * @route   GET /api/notifications/:workspaceId/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/:workspaceId/unread-count', async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const count = await Notification.countDocuments({
      userId: req.user.id,
      workspaceId,
      read: false
    });

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count'
    });
  }
});

/**
 * @route   POST /api/notifications/:workspaceId/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.post('/:workspaceId/:notificationId/read', async (req, res) => {
  try {
    const { workspaceId, notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        userId: req.user.id,
        workspaceId
      },
      {
        read: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

/**
 * @route   POST /api/notifications/:workspaceId/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.post('/:workspaceId/read-all', async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const result = await Notification.updateMany(
      {
        userId: req.user.id,
        workspaceId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
});

/**
 * @route   DELETE /api/notifications/:workspaceId/:notificationId
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:workspaceId/:notificationId', async (req, res) => {
  try {
    const { workspaceId, notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId: req.user.id,
      workspaceId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification'
    });
  }
});

/**
 * @route   DELETE /api/notifications/:workspaceId/clear-all
 * @desc    Clear all read notifications
 * @access  Private
 */
router.delete('/:workspaceId/clear-all', async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const result = await Notification.deleteMany({
      userId: req.user.id,
      workspaceId,
      read: true
    });

    res.json({
      success: true,
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear notifications'
    });
  }
});

/**
 * @route   GET /api/notifications/:workspaceId/types
 * @desc    Get available notification types
 * @access  Private
 */
router.get('/:workspaceId/types', async (req, res) => {
  try {
    const types = [
      'mention',
      'deal_won',
      'deal_lost',
      'lead_created',
      'lead_qualified',
      'ai_insight',
      'workflow_completed',
      'workflow_failed',
      'comment_reply',
      'task_assigned',
      'task_due',
      'project_created',
      'booking_confirmed',
      'email_response'
    ];

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('Error fetching notification types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification types'
    });
  }
});

module.exports = router;
