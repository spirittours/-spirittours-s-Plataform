/**
 * Email Template Model
 * 
 * Stores reusable email templates for campaigns.
 * Templates support variables, versioning, and A/B testing.
 */

const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  // Basic information
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
  
  // Template content
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  
  preheader: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  
  body: {
    type: String,
    required: true,
  },
  
  // Plain text version
  bodyPlainText: {
    type: String,
  },
  
  // Template category
  category: {
    type: String,
    enum: [
      'prospect_intro',
      'prospect_followup',
      'client_update',
      'client_promotion',
      'client_newsletter',
      'seasonal_campaign',
      'custom',
    ],
    required: true,
    index: true,
  },
  
  // Target audience
  targetAudience: {
    type: String,
    enum: ['prospects', 'clients', 'all'],
    default: 'all',
    index: true,
  },
  
  // Language
  language: {
    type: String,
    enum: ['es', 'en', 'pt', 'fr'],
    default: 'es',
    index: true,
  },
  
  // Variables used in template
  variables: [{
    name: String,
    description: String,
    required: Boolean,
    defaultValue: String,
  }],
  
  // Call to action
  cta: {
    text: String,
    url: String,
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
    index: true,
  },
  
  // Versioning
  version: {
    type: Number,
    default: 1,
  },
  
  parentTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate',
  },
  
  // Performance metrics
  metrics: {
    timesUsed: {
      type: Number,
      default: 0,
    },
    averageOpenRate: {
      type: Number,
      default: 0,
    },
    averageClickRate: {
      type: Number,
      default: 0,
    },
    averageConversionRate: {
      type: Number,
      default: 0,
    },
  },
  
  // AI generation metadata
  aiGenerated: {
    type: Boolean,
    default: false,
  },
  
  aiMetadata: {
    model: String,
    generatedAt: Date,
    prompt: String,
    tokens: Number,
    cost: Number,
  },
  
  // Creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Approval
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  approvedAt: {
    type: Date,
  },
  
  // Tags for organization
  tags: [String],
  
}, {
  timestamps: true,
});

// Indexes
emailTemplateSchema.index({ name: 'text', description: 'text' });
emailTemplateSchema.index({ category: 1, status: 1 });
emailTemplateSchema.index({ createdAt: -1 });

// Methods
emailTemplateSchema.methods.incrementUsage = function() {
  this.metrics.timesUsed += 1;
  return this.save();
};

emailTemplateSchema.methods.updateMetrics = function(openRate, clickRate, conversionRate) {
  const { timesUsed, averageOpenRate, averageClickRate, averageConversionRate } = this.metrics;
  
  // Calculate new averages
  this.metrics.averageOpenRate = ((averageOpenRate * timesUsed) + openRate) / (timesUsed + 1);
  this.metrics.averageClickRate = ((averageClickRate * timesUsed) + clickRate) / (timesUsed + 1);
  this.metrics.averageConversionRate = ((averageConversionRate * timesUsed) + conversionRate) / (timesUsed + 1);
  
  return this.save();
};

emailTemplateSchema.methods.createVersion = async function(updates) {
  const newVersion = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    version: this.version + 1,
    parentTemplate: this._id,
    createdAt: undefined,
    updatedAt: undefined,
    ...updates,
  });
  
  return await newVersion.save();
};

// Static methods
emailTemplateSchema.statics.findActiveByCategory = function(category, language = 'es') {
  return this.find({
    category,
    language,
    status: 'active',
  }).sort({ 'metrics.averageOpenRate': -1 });
};

emailTemplateSchema.statics.findTopPerforming = function(limit = 10) {
  return this.find({
    status: 'active',
    'metrics.timesUsed': { $gte: 10 },
  })
  .sort({ 'metrics.averageConversionRate': -1 })
  .limit(limit);
};

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
