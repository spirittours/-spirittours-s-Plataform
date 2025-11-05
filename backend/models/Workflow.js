/**
 * Workflow Model - SPRINT 3.1
 * 
 * End-to-end automation chains that connect multiple systems together.
 * Enables powerful automation flows like:
 * - Email Response → Lead → Deal → Project (fully automated)
 * - Booking Confirmed → Project → Task Assignment → Notifications
 * - AI Interaction → Contact → Lead Scoring → Deal Creation
 * 
 * Features:
 * - Visual workflow builder support (triggers, conditions, actions)
 * - Multi-step automation chains
 * - Conditional logic and branching
 * - Error handling and retry logic
 * - Execution history and audit trail
 * - Webhook triggers and API actions
 */

const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
  },

  workspaceId: {
    type: String,
    required: true,
    index: true,
  },

  // Workflow configuration
  trigger: {
    type: {
      type: String,
      required: true,
      enum: [
        'email_response',      // Email campaign response received
        'ai_interaction',      // AI agent interaction completed
        'booking_confirmed',   // Booking confirmed
        'deal_won',           // Deal marked as won
        'lead_qualified',     // Lead marked as qualified
        'contact_created',    // New contact created
        'webhook',            // External webhook received
        'schedule',           // Time-based trigger
        'manual',             // Manual execution
      ],
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Examples:
      // email_response: { campaignId: '123', minInterestLevel: 'high' }
      // ai_interaction: { agentIds: ['agent1', 'agent2'], minConfidence: 0.7 }
      // booking_confirmed: { tripTypes: ['luxury', 'group'] }
      // schedule: { cron: '0 9 * * 1', timezone: 'America/New_York' }
    },
  },

  // Workflow steps (executed in order)
  steps: [{
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'create_contact',      // Create CRM contact
        'create_lead',         // Create CRM lead
        'create_deal',         // Create CRM deal
        'create_project',      // Create project
        'score_lead',          // AI lead scoring
        'enrich_contact',      // AI contact enrichment
        'send_email',          // Send email notification
        'send_notification',   // Send in-app notification
        'update_field',        // Update entity field
        'add_tag',             // Add tag to entity
        'assign_user',         // Assign to user/team
        'webhook',             // Call external webhook
        'wait',                // Wait for duration
        'condition',           // Conditional branching
      ],
    },
    action: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      // Examples:
      // create_lead: { source: 'trigger.email', scoring: 'auto' }
      // score_lead: { leadId: 'step.create_lead.id', method: 'ai' }
      // condition: { if: 'step.score_lead.score > 70', then: 'step5', else: 'step7' }
    },
    onError: {
      action: {
        type: String,
        enum: ['retry', 'skip', 'fail', 'notify'],
        default: 'fail',
      },
      retries: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      retryDelay: {
        type: Number,
        default: 60000, // 1 minute in ms
      },
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  }],

  // Conditional logic
  conditions: [{
    field: String,           // Field to evaluate (e.g., 'trigger.interestLevel')
    operator: {
      type: String,
      enum: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'contains', 'notContains', 'exists', 'notExists'],
    },
    value: mongoose.Schema.Types.Mixed,
    logicalOperator: {
      type: String,
      enum: ['AND', 'OR'],
      default: 'AND',
    },
  }],

  // Workflow state
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'archived'],
    default: 'draft',
    index: true,
  },

  // Execution statistics
  stats: {
    totalExecutions: {
      type: Number,
      default: 0,
    },
    successfulExecutions: {
      type: Number,
      default: 0,
    },
    failedExecutions: {
      type: Number,
      default: 0,
    },
    averageExecutionTime: {
      type: Number,
      default: 0, // in milliseconds
    },
    lastExecutedAt: {
      type: Date,
    },
    lastSuccessAt: {
      type: Date,
    },
    lastFailureAt: {
      type: Date,
    },
  },

  // Configuration
  config: {
    timeout: {
      type: Number,
      default: 300000, // 5 minutes in ms
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    continueOnError: {
      type: Boolean,
      default: false,
    },
    notifyOnSuccess: {
      type: Boolean,
      default: false,
    },
    notifyOnFailure: {
      type: Boolean,
      default: true,
    },
    notifyUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Tags for organization
  tags: [{
    type: String,
    trim: true,
  }],

  // Version tracking
  version: {
    type: Number,
    default: 1,
  },

}, {
  timestamps: true,
  collection: 'workflows',
});

// Indexes
workflowSchema.index({ workspaceId: 1, status: 1 });
workflowSchema.index({ 'trigger.type': 1, status: 1 });
workflowSchema.index({ createdBy: 1 });
workflowSchema.index({ tags: 1 });
workflowSchema.index({ createdAt: -1 });

// Virtual for success rate
workflowSchema.virtual('successRate').get(function() {
  if (this.stats.totalExecutions === 0) return 0;
  return ((this.stats.successfulExecutions / this.stats.totalExecutions) * 100).toFixed(2);
});

// Methods
workflowSchema.methods.incrementExecutions = function(success = true, executionTime = 0) {
  this.stats.totalExecutions += 1;
  if (success) {
    this.stats.successfulExecutions += 1;
    this.stats.lastSuccessAt = new Date();
  } else {
    this.stats.failedExecutions += 1;
    this.stats.lastFailureAt = new Date();
  }
  this.stats.lastExecutedAt = new Date();
  
  // Update average execution time
  const total = this.stats.averageExecutionTime * (this.stats.totalExecutions - 1);
  this.stats.averageExecutionTime = (total + executionTime) / this.stats.totalExecutions;
  
  return this.save();
};

workflowSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

workflowSchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

workflowSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Statics
workflowSchema.statics.findActiveByTrigger = function(triggerType, workspaceId) {
  return this.find({
    'trigger.type': triggerType,
    status: 'active',
    workspaceId: workspaceId,
  });
};

workflowSchema.statics.findByWorkspace = function(workspaceId, status = null) {
  const query = { workspaceId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

// Pre-save middleware
workflowSchema.pre('save', function(next) {
  if (this.isModified('steps') || this.isModified('conditions')) {
    this.version += 1;
  }
  next();
});

const Workflow = mongoose.model('Workflow', workflowSchema);

module.exports = Workflow;
