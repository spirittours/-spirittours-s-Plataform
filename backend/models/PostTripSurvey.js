/**
 * Post-Trip Survey Model
 * Stores survey responses from PostTripSupportAgent
 */

const mongoose = require('mongoose');

const postTripSurveySchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },

  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  destination: String,
  completionDate: Date,

  answers: {
    overall_satisfaction: {
      type: Number,
      min: 1,
      max: 10
    },
    accommodation_quality: {
      type: Number,
      min: 1,
      max: 5
    },
    activity_satisfaction: {
      type: Number,
      min: 1,
      max: 5
    },
    guide_service: {
      type: Number,
      min: 1,
      max: 5
    },
    value_for_money: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    recommendation_likelihood: {
      type: Number,
      min: 1,
      max: 10
    }
  },

  sentiment: {
    overall: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    },
    drivers: [String],
    tone: String,
    concerns: [String],
    praises: [String],
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent']
    }
  },

  nps: {
    score: {
      type: Number,
      min: 1,
      max: 10
    },
    category: {
      type: String,
      enum: ['promoter', 'passive', 'detractor']
    }
  },

  issues: [{
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    category: String,
    description: String,
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedAt: Date
  }],

  followUpActions: [{
    type: String,
    priority: String,
    description: String,
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],

  responseStrategy: {
    tone: String,
    keyPoints: [String],
    compensation: Boolean,
    priority: String,
    actions: [String]
  },

  status: {
    type: String,
    enum: ['pending', 'completed', 'processed', 'escalated'],
    default: 'pending'
  },

  submittedAt: Date,
  processedAt: Date
}, {
  timestamps: true
});

// Indexes
postTripSurveySchema.index({ tripId: 1 });
postTripSurveySchema.index({ customerId: 1, submittedAt: -1 });
postTripSurveySchema.index({ 'nps.category': 1 });
postTripSurveySchema.index({ 'sentiment.overall': 1 });
postTripSurveySchema.index({ status: 1 });

module.exports = mongoose.model('PostTripSurvey', postTripSurveySchema);
