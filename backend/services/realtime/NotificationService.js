/**
 * Notification Service - SPRINT 4.2
 * Real-time notifications for @mentions, deals, leads, AI insights
 */

const Notification = require('../../models/Notification');
const WebSocketService = require('./WebSocketService');
const logger = require('../../utils/logger');

class NotificationService {
  /**
   * Create and send notification
   */
  async notify(userId, type, data) {
    try {
      // Create notification in DB
      const notification = await Notification.create({
        userId,
        type,
        title: data.title,
        message: data.message,
        data: data.metadata || {},
        read: false,
      });

      // Send via WebSocket
      WebSocketService.sendToUser(userId, 'notification', {
        id: notification._id,
        type,
        title: data.title,
        message: data.message,
        timestamp: notification.createdAt,
      });

      logger.info(`Notification sent to user ${userId}: ${type}`);
      return notification;
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  // Notify on mention
  async notifyMention(mentionedUserId, mentionerUserId, entityType, entityId) {
    return this.notify(mentionedUserId, 'mention', {
      title: 'You were mentioned',
      message: `You were mentioned in a ${entityType}`,
      metadata: { mentionerUserId, entityType, entityId },
    });
  }

  // Notify on new deal
  async notifyNewDeal(userId, dealId, dealName, amount) {
    return this.notify(userId, 'deal_created', {
      title: 'New Deal Created',
      message: `Deal "${dealName}" worth $${amount} was created`,
      metadata: { dealId },
    });
  }

  // Notify on new lead
  async notifyNewLead(userId, leadId, leadName, score) {
    return this.notify(userId, 'lead_created', {
      title: 'New Lead',
      message: `New lead "${leadName}" (Score: ${score})`,
      metadata: { leadId, score },
    });
  }

  // Notify AI insight
  async notifyAIInsight(userId, insight) {
    return this.notify(userId, 'ai_insight', {
      title: 'AI Insight',
      message: insight.message,
      metadata: insight,
    });
  }

  // Mark as read
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true, readAt: new Date() },
      { new: true }
    );
    return notification;
  }

  // Get user notifications
  async getUserNotifications(userId, limit = 50) {
    return await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  // Get unread count
  async getUnreadCount(userId) {
    return await Notification.countDocuments({ userId, read: false });
  }
}

module.exports = new NotificationService();
