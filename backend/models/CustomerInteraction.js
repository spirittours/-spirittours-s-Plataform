/**
 * Customer Interaction Model
 * Stores interaction tracking from CustomerFollowupAgent
 */

const mongoose = require('mongoose');

const customerInteractionSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  type: {
    type: String,
    required: true,
    enum: ['email_open', 'email_click', 'website_visit', 'form_submission', 'phone_call', 'chat', 'booking', 'review', 'social_engagement'],
    index: true
  },

  channel: {
    type: String,
    enum: ['email', 'phone', 'website', 'chat', 'social', 'in_person']
  },

  content: String,
  duration: Number, // minutes

  outcome: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'no_response']
  },

  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  analysis: {
    quality: Number,
    intent: {
      type: String,
      enum: ['research', 'compare', 'ready-to-book', 'support']
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent']
    },
    nextBestAction: String,
    followUpTiming: Number // hours
  },

  engagementPoints: {
    type: Number,
    default: 0
  },

  followUpTasks: [{
    type: {
      type: String
    },
    priority: String,
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending'
    },
    completedAt: Date
  }],

  trackedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
customerInteractionSchema.index({ customerId: 1, trackedAt: -1 });
customerInteractionSchema.index({ type: 1, trackedAt: -1 });
customerInteractionSchema.index({ 'analysis.intent': 1 });
customerInteractionSchema.index({ 'analysis.urgency': 1 });

module.exports = mongoose.model('CustomerInteraction', customerInteractionSchema);
