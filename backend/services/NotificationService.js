/**
 * Notification Service - SPRINT 4 (Combined 4.1 + 4.2)
 * 
 * Real-time notification system with WebSocket integration
 * Handles @mentions, deals, leads, AI insights, workflow completions
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');

class NotificationService {
  constructor(websocketServer) {
    this.websocketServer = websocketServer;
    this.notificationTypes = {
      MENTION: 'mention',
      DEAL_WON: 'deal_won',
      DEAL_LOST: 'deal_lost',
      LEAD_CREATED: 'lead_created',
      LEAD_QUALIFIED: 'lead_qualified',
      AI_INSIGHT: 'ai_insight',
      WORKFLOW_COMPLETED: 'workflow_completed',
      WORKFLOW_FAILED: 'workflow_failed',
      COMMENT_REPLY: 'comment_reply',
      TASK_ASSIGNED: 'task_assigned',
      PROJECT_CREATED: 'project_created',
      BOOKING_CONFIRMED: 'booking_confirmed',
      EMAIL_RESPONSE: 'email_response',
    };
  }

  /**
   * Create and send notification
   */
  async notify({
    userId,
    workspaceId,
    type,
    title,
    message,
    entityType,
    entityId,
    actionUrl,
    metadata = {},
    priority = 'normal',
  }) {
    try {
      // Create notification in database
      const notification = await Notification.create({
        userId,
        workspaceId,
        type,
        title,
        message,
        entityType,
        entityId,
        actionUrl,
        metadata,
        priority,
        read: false,
      });

      // Send real-time notification via WebSocket
      if (this.websocketServer) {
        this.websocketServer.sendNotificationToUserRoom(userId, {
          id: notification._id,
          type,
          title,
          message,
          entityType,
          entityId,
          actionUrl,
          priority,
          createdAt: notification.createdAt,
        });
      }

      logger.info(`Notification sent to user ${userId}: ${type}`);
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Notify @mentions in comments
   */
  async notifyMentions(commentData, mentionedUserIds, workspaceId) {
    const promises = mentionedUserIds.map(userId =>
      this.notify({
        userId,
        workspaceId,
        type: this.notificationTypes.MENTION,
        title: 'You were mentioned',
        message: `${commentData.author} mentioned you in a comment`,
        entityType: commentData.entityType,
        entityId: commentData.entityId,
        actionUrl: `/crm/${commentData.entityType}/${commentData.entityId}#comment-${commentData.commentId}`,
        metadata: {
          commentId: commentData.commentId,
          author: commentData.author,
        },
        priority: 'high',
      })
    );

    return await Promise.all(promises);
  }

  /**
   * Notify deal won
   */
  async notifyDealWon(deal, assignedUserId, workspaceId) {
    return await this.notify({
      userId: assignedUserId,
      workspaceId,
      type: this.notificationTypes.DEAL_WON,
      title: '🎉 Deal Won!',
      message: `Congratulations! Deal "${deal.name}" worth $${deal.amount} has been won!`,
      entityType: 'deal',
      entityId: deal._id,
      actionUrl: `/crm/deals/${deal._id}`,
      metadata: {
        dealName: deal.name,
        amount: deal.amount,
      },
      priority: 'high',
    });
  }

  /**
   * Notify new lead created
   */
  async notifyLeadCreated(lead, assignedUserId, workspaceId) {
    return await this.notify({
      userId: assignedUserId,
      workspaceId,
      type: this.notificationTypes.LEAD_CREATED,
      title: '🎯 New Lead Created',
      message: `New lead from ${lead.company} has been assigned to you`,
      entityType: 'lead',
      entityId: lead._id,
      actionUrl: `/crm/leads/${lead._id}`,
      metadata: {
        company: lead.company,
        source: lead.source,
      },
      priority: 'normal',
    });
  }

  /**
   * Notify lead qualified
   */
  async notifyLeadQualified(lead, assignedUserId, workspaceId, score) {
    return await this.notify({
      userId: assignedUserId,
      workspaceId,
      type: this.notificationTypes.LEAD_QUALIFIED,
      title: '✅ Lead Qualified',
      message: `Lead "${lead.company}" scored ${score}/100 and is qualified`,
      entityType: 'lead',
      entityId: lead._id,
      actionUrl: `/crm/leads/${lead._id}`,
      metadata: {
        company: lead.company,
        score,
      },
      priority: 'high',
    });
  }

  /**
   * Notify AI insight
   */
  async notifyAIInsight(userId, workspaceId, insight) {
    return await this.notify({
      userId,
      workspaceId,
      type: this.notificationTypes.AI_INSIGHT,
      title: '🤖 AI Insight',
      message: insight.message,
      entityType: insight.entityType,
      entityId: insight.entityId,
      actionUrl: insight.actionUrl,
      metadata: insight.metadata,
      priority: 'normal',
    });
  }

  /**
   * Notify workflow completed
   */
  async notifyWorkflowCompleted(workflow, execution, userIds, workspaceId) {
    const promises = userIds.map(userId =>
      this.notify({
        userId,
        workspaceId,
        type: this.notificationTypes.WORKFLOW_COMPLETED,
        title: '✅ Workflow Completed',
        message: `Workflow "${workflow.name}" completed successfully`,
        entityType: 'workflow',
        entityId: workflow._id,
        actionUrl: `/automation/workflows/${workflow._id}/executions/${execution._id}`,
        metadata: {
          workflowName: workflow.name,
          executionId: execution._id,
          duration: execution.duration,
        },
        priority: 'normal',
      })
    );

    return await Promise.all(promises);
  }

  /**
   * Notify workflow failed
   */
  async notifyWorkflowFailed(workflow, execution, userIds, workspaceId) {
    const promises = userIds.map(userId =>
      this.notify({
        userId,
        workspaceId,
        type: this.notificationTypes.WORKFLOW_FAILED,
        title: '❌ Workflow Failed',
        message: `Workflow "${workflow.name}" failed: ${execution.error?.message}`,
        entityType: 'workflow',
        entityId: workflow._id,
        actionUrl: `/automation/workflows/${workflow._id}/executions/${execution._id}`,
        metadata: {
          workflowName: workflow.name,
          executionId: execution._id,
          error: execution.error,
        },
        priority: 'high',
      })
    );

    return await Promise.all(promises);
  }

  /**
   * Notify comment reply
   */
  async notifyCommentReply(originalComment, reply, workspaceId) {
    return await this.notify({
      userId: originalComment.userId,
      workspaceId,
      type: this.notificationTypes.COMMENT_REPLY,
      title: '💬 Comment Reply',
      message: `${reply.author} replied to your comment`,
      entityType: originalComment.entityType,
      entityId: originalComment.entityId,
      actionUrl: `/crm/${originalComment.entityType}/${originalComment.entityId}#comment-${reply._id}`,
      metadata: {
        replyId: reply._id,
        author: reply.author,
      },
      priority: 'normal',
    });
  }

  /**
   * Notify task assigned
   */
  async notifyTaskAssigned(task, assignedUserId, workspaceId) {
    return await this.notify({
      userId: assignedUserId,
      workspaceId,
      type: this.notificationTypes.TASK_ASSIGNED,
      title: '📋 Task Assigned',
      message: `You have been assigned: "${task.title}"`,
      entityType: 'task',
      entityId: task._id,
      actionUrl: `/projects/${task.projectId}/tasks/${task._id}`,
      metadata: {
        taskTitle: task.title,
        projectId: task.projectId,
      },
      priority: 'normal',
    });
  }

  /**
   * Notify project created
   */
  async notifyProjectCreated(project, teamMemberIds, workspaceId) {
    const promises = teamMemberIds.map(userId =>
      this.notify({
        userId,
        workspaceId,
        type: this.notificationTypes.PROJECT_CREATED,
        title: '🚀 New Project Created',
        message: `Project "${project.name}" has been created`,
        entityType: 'project',
        entityId: project._id,
        actionUrl: `/projects/${project._id}`,
        metadata: {
          projectName: project.name,
        },
        priority: 'normal',
      })
    );

    return await Promise.all(promises);
  }

  /**
   * Notify booking confirmed
   */
  async notifyBookingConfirmed(booking, assignedUserId, workspaceId) {
    return await this.notify({
      userId: assignedUserId,
      workspaceId,
      type: this.notificationTypes.BOOKING_CONFIRMED,
      title: '✈️ Booking Confirmed',
      message: `Booking #${booking.bookingNumber} has been confirmed`,
      entityType: 'booking',
      entityId: booking._id,
      actionUrl: `/bookings/${booking._id}`,
      metadata: {
        bookingNumber: booking.bookingNumber,
        customer: booking.customer,
      },
      priority: 'high',
    });
  }

  /**
   * Notify email response
   */
  async notifyEmailResponse(campaign, response, assignedUserId, workspaceId) {
    return await this.notify({
      userId: assignedUserId,
      workspaceId,
      type: this.notificationTypes.EMAIL_RESPONSE,
      title: '📧 Email Response',
      message: `New response to campaign "${campaign.name}"`,
      entityType: 'campaign',
      entityId: campaign._id,
      actionUrl: `/campaigns/${campaign._id}`,
      metadata: {
        campaignName: campaign.name,
        responseEmail: response.email,
      },
      priority: 'normal',
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true, readAt: new Date() },
        { new: true }
      );

      // Emit read status update via WebSocket
      if (this.io && notification) {
        this.io.to(`user:${userId}`).emit('notification:read', {
          notificationId,
        });
      }

      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId, workspaceId) {
    try {
      await Notification.updateMany(
        { userId, workspaceId, read: false },
        { read: true, readAt: new Date() }
      );

      // Emit update via WebSocket
      if (this.io) {
        this.io.to(`user:${userId}`).emit('notifications:all_read');
      }

      return { success: true };
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId, workspaceId) {
    try {
      const count = await Notification.countDocuments({
        userId,
        workspaceId,
        read: false,
      });
      return count;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Get notifications for user
   */
  async getNotifications(userId, workspaceId, { limit = 50, skip = 0, unreadOnly = false } = {}) {
    try {
      const query = { userId, workspaceId };
      if (unreadOnly) {
        query.read = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return notifications;
    } catch (error) {
      logger.error('Error getting notifications:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    try {
      await Notification.findOneAndDelete({ _id: notificationId, userId });
      return { success: true };
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
