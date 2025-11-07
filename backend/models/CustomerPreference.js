/**
 * Customer Preference Model
 * Stores travel preference analysis from TravelPreferencesAgent
 */

const mongoose = require('mongoose');

const customerPreferenceSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  bookingCount: {
    type: Number,
    default: 0
  },

  patterns: {
    destinations: {
      type: Map,
      of: Number
    },
    accommodations: {
      type: Map,
      of: Number
    },
    topActivities: [String],
    averageBudget: Number,
    budgetRange: {
      min: Number,
      max: Number
    },
    preferredSeasons: {
      type: Map,
      of: Number
    },
    averageGroupSize: Number,
    averageDuration: Number,
    averageLeadTime: Number
  },

  analysis: {
    personality: String,
    preferences: [String],
    motivations: [String],
    budgetStyle: {
      type: String,
      enum: ['budget', 'moderate', 'luxury', 'mixed']
    },
    planningStyle: {
      type: String,
      enum: ['spontaneous', 'planner', 'balanced']
    }
  },

  recommendations: [{
    destination: String,
    description: String,
    highlights: [String],
    estimated_cost: Number,
    duration: Number,
    best_season: String,
    generatedAt: Date
  }],

  confidence: {
    type: Number,
    min: 0,
    max: 100
  },

  lastAnalyzed: {
    type: Date,
    default: Date.now
  },

  needsUpdate: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
customerPreferenceSchema.index({ customerId: 1, lastAnalyzed: -1 });
customerPreferenceSchema.index({ confidence: -1 });

module.exports = mongoose.model('CustomerPreference', customerPreferenceSchema);
