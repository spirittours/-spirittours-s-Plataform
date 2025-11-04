/**
 * Pipeline Model
 * 
 * Pipelines represent sales/support/onboarding processes with stages.
 * Each pipeline has multiple stages that deals move through.
 */

const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  color: {
    type: String,
    default: '#6B7280', // Gray
  },
  order: {
    type: Number,
    required: true,
  },
  probability: {
    type: Number, // 0-100 for win probability
    default: 50,
    min: 0,
    max: 100,
  },
  rottenDays: {
    type: Number, // Days before deal is considered "rotten"
    default: null,
  },
  automations: [{
    trigger: {
      type: String,
      enum: ['on_enter', 'on_exit', 'on_duration', 'on_value_change'],
    },
    action: {
      type: String,
      enum: [
        'send_email',
        'send_notification',
        'create_task',
        'update_field',
        'assign_user',
        'send_webhook',
        'move_to_stage',
      ],
    },
    config: mongoose.Schema.Types.Mixed,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
});

const pipelineSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  
  description: {
    type: String,
    trim: true,
  },
  
  icon: {
    type: String,
    default: '🚀',
  },
  
  // Workspace
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  
  // Owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Type
  pipelineType: {
    type: String,
    enum: ['sales', 'support', 'onboarding', 'custom'],
    default: 'sales',
    index: true,
  },
  
  // Stages
  stages: [stageSchema],
  
  // Settings
  settings: {
    defaultStage: String, // Stage ID for new deals
    allowSkipStages: {
      type: Boolean,
      default: false,
    },
    requireNoteOnStageChange: {
      type: Boolean,
      default: false,
    },
    autoArchiveAfterDays: {
      type: Number,
      default: null, // null = never
    },
    winStages: [String], // Stage IDs that count as "won"
    lostStages: [String], // Stage IDs that count as "lost"
    notifications: {
      onDealCreated: {
        type: Boolean,
        default: true,
      },
      onStageChanged: {
        type: Boolean,
        default: true,
      },
      onDealWon: {
        type: Boolean,
        default: true,
      },
      onDealLost: {
        type: Boolean,
        default: false,
      },
      onDealRotting: {
        type: Boolean,
        default: true,
      },
    },
  },
  
  // Permissions
  permissions: {
    visibility: {
      type: String,
      enum: ['workspace', 'team', 'private'],
      default: 'workspace',
    },
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    allowedTeams: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    }],
  },
  
  // Template
  isTemplate: {
    type: Boolean,
    default: false,
  },
  
  templateCategory: String,
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  
  // Statistics
  stats: {
    totalDeals: {
      type: Number,
      default: 0,
    },
    activeDeals: {
      type: Number,
      default: 0,
    },
    wonDeals: {
      type: Number,
      default: 0,
    },
    lostDeals: {
      type: Number,
      default: 0,
    },
    totalValue: {
      type: Number,
      default: 0,
    },
    wonValue: {
      type: Number,
      default: 0,
    },
    averageDealValue: {
      type: Number,
      default: 0,
    },
    averageDealDuration: {
      type: Number, // in days
      default: 0,
    },
    conversionRate: {
      type: Number, // percentage
      default: 0,
    },
    lastUpdated: Date,
  },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
pipelineSchema.index({ workspace: 1, isActive: 1 });
pipelineSchema.index({ owner: 1, isActive: 1 });
pipelineSchema.index({ pipelineType: 1, workspace: 1 });

// Virtual: Deals
pipelineSchema.virtual('deals', {
  ref: 'Deal',
  localField: '_id',
  foreignField: 'pipeline',
});

// Virtual: Active stages
pipelineSchema.virtual('activeStages').get(function() {
  return this.stages.filter(s => s.isActive);
});

// Virtual: Win rate
pipelineSchema.virtual('winRate').get(function() {
  if (this.stats.wonDeals + this.stats.lostDeals === 0) return 0;
  return (this.stats.wonDeals / (this.stats.wonDeals + this.stats.lostDeals)) * 100;
});

// Methods
pipelineSchema.methods.addStage = function(stageData) {
  const maxOrder = this.stages.length > 0
    ? Math.max(...this.stages.map(s => s.order))
    : 0;
  
  const newStage = {
    id: `stage_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name: stageData.name,
    description: stageData.description,
    color: stageData.color || '#6B7280',
    order: stageData.order || maxOrder + 1,
    probability: stageData.probability !== undefined ? stageData.probability : 50,
    rottenDays: stageData.rottenDays || null,
    automations: stageData.automations || [],
    isActive: stageData.isActive !== false,
  };
  
  this.stages.push(newStage);
  
  // Set as default if this is the first stage
  if (this.stages.length === 1) {
    this.settings.defaultStage = newStage.id;
  }
  
  return this.save();
};

pipelineSchema.methods.updateStage = function(stageId, updates) {
  const stage = this.stages.find(s => s.id === stageId);
  if (!stage) {
    throw new Error('Stage not found');
  }
  
  Object.assign(stage, updates);
  return this.save();
};

pipelineSchema.methods.deleteStage = function(stageId) {
  const stageIndex = this.stages.findIndex(s => s.id === stageId);
  if (stageIndex === -1) {
    throw new Error('Stage not found');
  }
  
  // Cannot delete if deals exist in this stage
  // This should be checked before calling this method
  
  this.stages.splice(stageIndex, 1);
  
  // Update default stage if needed
  if (this.settings.defaultStage === stageId && this.stages.length > 0) {
    this.settings.defaultStage = this.stages[0].id;
  }
  
  return this.save();
};

pipelineSchema.methods.reorderStages = function(stageOrder) {
  // stageOrder is array of stage IDs in new order
  stageOrder.forEach((stageId, index) => {
    const stage = this.stages.find(s => s.id === stageId);
    if (stage) {
      stage.order = index + 1;
    }
  });
  
  return this.save();
};

pipelineSchema.methods.getStageById = function(stageId) {
  return this.stages.find(s => s.id === stageId);
};

pipelineSchema.methods.getDefaultStage = function() {
  const defaultStageId = this.settings.defaultStage;
  return this.stages.find(s => s.id === defaultStageId) || this.stages[0];
};

pipelineSchema.methods.isWinStage = function(stageId) {
  return this.settings.winStages?.includes(stageId) || false;
};

pipelineSchema.methods.isLostStage = function(stageId) {
  return this.settings.lostStages?.includes(stageId) || false;
};

pipelineSchema.methods.updateStats = async function() {
  const Deal = mongoose.model('Deal');
  
  const deals = await Deal.find({ pipeline: this._id });
  
  const stats = {
    totalDeals: deals.length,
    activeDeals: 0,
    wonDeals: 0,
    lostDeals: 0,
    totalValue: 0,
    wonValue: 0,
    lastUpdated: new Date(),
  };
  
  let totalDuration = 0;
  let completedDeals = 0;
  
  deals.forEach(deal => {
    stats.totalValue += deal.value || 0;
    
    if (this.isWinStage(deal.stage)) {
      stats.wonDeals++;
      stats.wonValue += deal.value || 0;
      completedDeals++;
      if (deal.closedAt && deal.createdAt) {
        totalDuration += (deal.closedAt - deal.createdAt) / (1000 * 60 * 60 * 24);
      }
    } else if (this.isLostStage(deal.stage)) {
      stats.lostDeals++;
      completedDeals++;
      if (deal.closedAt && deal.createdAt) {
        totalDuration += (deal.closedAt - deal.createdAt) / (1000 * 60 * 60 * 24);
      }
    } else {
      stats.activeDeals++;
    }
  });
  
  stats.averageDealValue = stats.totalDeals > 0
    ? stats.totalValue / stats.totalDeals
    : 0;
  
  stats.averageDealDuration = completedDeals > 0
    ? totalDuration / completedDeals
    : 0;
  
  stats.conversionRate = (stats.wonDeals + stats.lostDeals) > 0
    ? (stats.wonDeals / (stats.wonDeals + stats.lostDeals)) * 100
    : 0;
  
  this.stats = stats;
  return this.save();
};

// Static methods
pipelineSchema.statics.findByWorkspace = function(workspaceId, includeInactive = false) {
  const query = { workspace: workspaceId };
  if (!includeInactive) {
    query.isActive = true;
  }
  return this.find(query).sort({ createdAt: -1 });
};

pipelineSchema.statics.findByType = function(pipelineType, workspaceId) {
  return this.find({
    pipelineType,
    workspace: workspaceId,
    isActive: true,
  }).sort({ createdAt: -1 });
};

pipelineSchema.statics.findTemplates = function() {
  return this.find({
    isTemplate: true,
    isActive: true,
  }).sort({ createdAt: -1 });
};

// Pre-save: Ensure stages are sorted by order
pipelineSchema.pre('save', function(next) {
  if (this.isModified('stages')) {
    this.stages.sort((a, b) => a.order - b.order);
  }
  next();
});

const Pipeline = mongoose.model('Pipeline', pipelineSchema);

module.exports = Pipeline;
