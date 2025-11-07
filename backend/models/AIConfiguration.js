/**
 * AI Configuration Model - SPRINT 8
 * 
 * Stores workspace-specific AI provider configurations
 */

const mongoose = require('mongoose');

const aiConfigurationSchema = new mongoose.Schema(
  {
    workspace: {
      type: String,
      required: true,
      index: true,
    },

    // Default provider selection strategy
    defaultStrategy: {
      type: String,
      enum: ['auto', 'cost-optimized', 'quality-optimized', 'speed-optimized', 'custom'],
      default: 'auto',
    },

    // Provider preferences
    providerPreferences: {
      type: Map,
      of: {
        enabled: Boolean,
        priority: Number, // 1 = highest priority
        customApiKey: String, // Optional workspace-specific API key
      },
      default: {},
    },

    // Model preferences by use case
    modelPreferences: {
      chat: {
        provider: String,
        model: String,
      },
      analysis: {
        provider: String,
        model: String,
      },
      coding: {
        provider: String,
        model: String,
      },
      reasoning: {
        provider: String,
        model: String,
      },
      vision: {
        provider: String,
        model: String,
      },
    },

    // Budget and cost controls
    budgetControls: {
      dailyLimit: {
        type: Number,
        default: 100, // USD
      },
      monthlyLimit: {
        type: Number,
        default: 3000, // USD
      },
      alertThreshold: {
        type: Number,
        default: 80, // Percentage
      },
      currentDailySpend: {
        type: Number,
        default: 0,
      },
      currentMonthlySpend: {
        type: Number,
        default: 0,
      },
    },

    // Feature flags
    features: {
      fallbackEnabled: {
        type: Boolean,
        default: true,
      },
      cacheEnabled: {
        type: Boolean,
        default: true,
      },
      loadBalancingEnabled: {
        type: Boolean,
        default: true,
      },
      autoOptimization: {
        type: Boolean,
        default: true,
      },
    },

    // Custom rules for model selection
    customRules: [
      {
        condition: {
          type: String, // token_count, complexity, language, etc.
          operator: String, // gt, lt, eq, contains
          value: mongoose.Schema.Types.Mixed,
        },
        action: {
          provider: String,
          model: String,
        },
      },
    ],

    // Usage statistics
    statistics: {
      totalRequests: {
        type: Number,
        default: 0,
      },
      totalCost: {
        type: Number,
        default: 0,
      },
      averageResponseTime: {
        type: Number,
        default: 0,
      },
      byProvider: {
        type: Map,
        of: {
          requests: Number,
          cost: Number,
          avgResponseTime: Number,
        },
        default: {},
      },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
aiConfigurationSchema.index({ workspace: 1 }, { unique: true });
aiConfigurationSchema.index({ 'budgetControls.currentDailySpend': 1 });
aiConfigurationSchema.index({ 'budgetControls.currentMonthlySpend': 1 });

// Methods
aiConfigurationSchema.methods.checkBudget = function (estimatedCost) {
  const dailyRemaining =
    this.budgetControls.dailyLimit - this.budgetControls.currentDailySpend;
  const monthlyRemaining =
    this.budgetControls.monthlyLimit - this.budgetControls.currentMonthlySpend;

  return {
    allowed: estimatedCost <= dailyRemaining && estimatedCost <= monthlyRemaining,
    dailyRemaining,
    monthlyRemaining,
  };
};

aiConfigurationSchema.methods.addSpend = function (cost) {
  this.budgetControls.currentDailySpend += cost;
  this.budgetControls.currentMonthlySpend += cost;
  this.statistics.totalCost += cost;
  this.statistics.totalRequests += 1;
  return this.save();
};

aiConfigurationSchema.methods.resetDailySpend = function () {
  this.budgetControls.currentDailySpend = 0;
  return this.save();
};

aiConfigurationSchema.methods.resetMonthlySpend = function () {
  this.budgetControls.currentMonthlySpend = 0;
  return this.save();
};

// Statics
aiConfigurationSchema.statics.getOrCreateForWorkspace = async function (
  workspaceId
) {
  let config = await this.findOne({ workspace: workspaceId });

  if (!config) {
    config = await this.create({
      workspace: workspaceId,
    });
  }

  return config;
};

const AIConfiguration = mongoose.model('AIConfiguration', aiConfigurationSchema);

module.exports = AIConfiguration;
