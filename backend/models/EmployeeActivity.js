/**
 * Employee Activity Model
 * Stores real-time activity tracking from EmployeeAnalyticsAgent
 */

const mongoose = require('mongoose');

const employeeActivitySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  type: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'call', 'email', 'chat', 'task', 'break', 'training', 'meeting', 'idle'],
    index: true
  },

  startTime: {
    type: Date,
    required: true,
    index: true
  },

  endTime: Date,

  duration: Number, // minutes

  metadata: {
    callId: String,
    taskId: String,
    customerId: mongoose.Schema.Types.ObjectId,
    interactionId: mongoose.Schema.Types.ObjectId,
    description: String,
    outcome: String,
    details: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },

  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'paused'],
    default: 'active'
  },

  trackedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate duration before saving if endTime is set
employeeActivitySchema.pre('save', function(next) {
  if (this.endTime && !this.duration) {
    this.duration = Math.floor(
      (new Date(this.endTime) - new Date(this.startTime)) / (1000 * 60)
    );
  }
  next();
});

// Indexes
employeeActivitySchema.index({ employeeId: 1, startTime: -1 });
employeeActivitySchema.index({ type: 1, startTime: -1 });
employeeActivitySchema.index({ employeeId: 1, type: 1, startTime: -1 });

module.exports = mongoose.model('EmployeeActivity', employeeActivitySchema);
