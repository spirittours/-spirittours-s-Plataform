/**
 * Notification Model - SPRINT 4
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  workspaceId: {
    type: String,
    required: true,
    index: true,
  },

  type: {
    type: String,
    required: true,
    enum: [
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
      'project_created',
      'booking_confirmed',
      'email_response',
    ],
    index: true,
  },

  title: {
    type: String,
    required: true,
  },

  message: {
    type: String,
    required: true,
  },

  entityType: {
    type: String,
    enum: ['contact', 'lead', 'deal', 'project', 'task', 'booking', 'campaign', 'workflow', 'comment'],
  },

  entityId: {
    type: String,
  },

  actionUrl: {
    type: String,
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal',
    index: true,
  },

  read: {
    type: Boolean,
    default: false,
    index: true,
  },

  readAt: {
    type: Date,
  },

}, {
  timestamps: true,
  collection: 'notifications',
});

// Indexes
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, workspaceId: 1, read: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });

// Statics
notificationSchema.statics.getUnreadCount = function(userId, workspaceId) {
  return this.countDocuments({ userId, workspaceId, read: false });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
