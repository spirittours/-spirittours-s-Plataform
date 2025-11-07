/**
 * Workflow Execution Model - SPRINT 3.1
 * 
 * Tracks individual workflow executions for audit trail, debugging, and analytics.
 * Every workflow run creates an execution record with complete details.
 */

const mongoose = require('mongoose');

const workflowExecutionSchema = new mongoose.Schema({
  workflowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow',
    required: true,
    index: true,
  },

  workspaceId: {
    type: String,
    required: true,
    index: true,
  },

  // Execution metadata
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'cancelled'],
    default: 'running',
    index: true,
  },

  // Trigger information
  trigger: {
    type: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },

  // Step execution details
  steps: [{
    stepId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    duration: {
      type: Number, // milliseconds
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
    },
    output: {
      type: mongoose.Schema.Types.Mixed,
    },
    error: {
      message: String,
      stack: String,
      code: String,
    },
    retries: {
      type: Number,
      default: 0,
    },
  }],

  // Overall execution timing
  startedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  completedAt: {
    type: Date,
  },

  duration: {
    type: Number, // milliseconds
  },

  // Error information
  error: {
    message: String,
    stack: String,
    code: String,
    stepId: String,
  },

  // Results summary
  results: {
    contactsCreated: { type: Number, default: 0 },
    leadsCreated: { type: Number, default: 0 },
    dealsCreated: { type: Number, default: 0 },
    projectsCreated: { type: Number, default: 0 },
    emailsSent: { type: Number, default: 0 },
    notificationsSent: { type: Number, default: 0 },
    webhooksCalled: { type: Number, default: 0 },
    entitiesUpdated: { type: Number, default: 0 },
  },

  // Created entities for reference
  createdEntities: [{
    type: {
      type: String,
      enum: ['contact', 'lead', 'deal', 'project', 'task'],
    },
    id: String,
    stepId: String,
  }],

  // Performance metrics
  metrics: {
    totalSteps: { type: Number, default: 0 },
    completedSteps: { type: Number, default: 0 },
    failedSteps: { type: Number, default: 0 },
    skippedSteps: { type: Number, default: 0 },
  },

}, {
  timestamps: true,
  collection: 'workflow_executions',
});

// Indexes
workflowExecutionSchema.index({ workflowId: 1, createdAt: -1 });
workflowExecutionSchema.index({ workspaceId: 1, status: 1 });
workflowExecutionSchema.index({ status: 1, startedAt: -1 });
workflowExecutionSchema.index({ 'trigger.type': 1 });

// Virtuals
workflowExecutionSchema.virtual('isRunning').get(function() {
  return this.status === 'running';
});

workflowExecutionSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

workflowExecutionSchema.virtual('isFailed').get(function() {
  return this.status === 'failed';
});

// Methods
workflowExecutionSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.duration = this.completedAt - this.startedAt;
  return this.save();
};

workflowExecutionSchema.methods.fail = function(error) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.duration = this.completedAt - this.startedAt;
  if (error) {
    this.error = {
      message: error.message,
      stack: error.stack,
      code: error.code,
    };
  }
  return this.save();
};

workflowExecutionSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.completedAt = new Date();
  this.duration = this.completedAt - this.startedAt;
  return this.save();
};

workflowExecutionSchema.methods.updateStep = function(stepId, updates) {
  const step = this.steps.find(s => s.stepId === stepId);
  if (step) {
    Object.assign(step, updates);
    if (updates.status === 'completed' && !step.completedAt) {
      step.completedAt = new Date();
      step.duration = step.completedAt - step.startedAt;
    }
  }
  return this.save();
};

workflowExecutionSchema.methods.addCreatedEntity = function(type, id, stepId) {
  this.createdEntities.push({ type, id, stepId });
  const resultKey = `${type}sCreated`;
  if (this.results[resultKey] !== undefined) {
    this.results[resultKey] += 1;
  }
  return this.save();
};

// Statics
workflowExecutionSchema.statics.findByWorkflow = function(workflowId, limit = 50) {
  return this.find({ workflowId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

workflowExecutionSchema.statics.findRunning = function() {
  return this.find({ status: 'running' });
};

workflowExecutionSchema.statics.getStatsByWorkflow = async function(workflowId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.aggregate([
    {
      $match: {
        workflowId: mongoose.Types.ObjectId(workflowId),
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        totalExecutions: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
        avgDuration: { $avg: '$duration' },
        totalContactsCreated: { $sum: '$results.contactsCreated' },
        totalLeadsCreated: { $sum: '$results.leadsCreated' },
        totalDealsCreated: { $sum: '$results.dealsCreated' },
        totalProjectsCreated: { $sum: '$results.projectsCreated' },
      },
    },
  ]);
};

const WorkflowExecution = mongoose.model('WorkflowExecution', workflowExecutionSchema);

module.exports = WorkflowExecution;
