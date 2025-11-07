/**
 * Performance Note Model
 * Stores performance notes and feedback from EmployeeAnalyticsAgent
 */

const mongoose = require('mongoose');

const performanceNoteSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  type: {
    type: String,
    required: true,
    enum: ['positive', 'concern', 'improvement', 'goal', 'warning', 'achievement'],
    index: true
  },

  category: {
    type: String,
    enum: ['time', 'productivity', 'quality', 'communication', 'attitude', 'other']
  },

  title: {
    type: String,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  actionItems: [{
    action: String,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dueDate: Date,
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],

  followUpDate: Date,

  relatedMetrics: {
    performanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeePerformance'
    },
    score: Number,
    improvement: Number
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  visibility: {
    type: String,
    enum: ['employee', 'manager', 'hr', 'private'],
    default: 'manager'
  },

  acknowledged: {
    type: Boolean,
    default: false
  },

  acknowledgedAt: Date,

  status: {
    type: String,
    enum: ['active', 'resolved', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes
performanceNoteSchema.index({ employeeId: 1, createdAt: -1 });
performanceNoteSchema.index({ type: 1, status: 1 });
performanceNoteSchema.index({ createdBy: 1 });
performanceNoteSchema.index({ followUpDate: 1, status: 1 });

module.exports = mongoose.model('PerformanceNote', performanceNoteSchema);
