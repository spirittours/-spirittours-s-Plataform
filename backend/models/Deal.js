/**
 * Deal Model
 * 
 * Deals represent sales opportunities or customer engagements.
 * Each deal belongs to a pipeline and moves through stages.
 */

const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  
  description: {
    type: String,
    trim: true,
  },
  
  // Pipeline & Stage
  pipeline: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pipeline',
    required: true,
    index: true,
  },
  
  stage: {
    type: String, // Stage ID from pipeline
    required: true,
    index: true,
  },
  
  stageHistory: [{
    stage: String,
    enteredAt: {
      type: Date,
      default: Date.now,
    },
    exitedAt: Date,
    duration: Number, // in hours
    movedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    note: String,
  }],
  
  // Workspace & Board
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    index: true,
  },
  
  // Contact & Company
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    index: true,
  },
  
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TravelAgency',
    index: true,
  },
  
  // Value & Currency
  value: {
    type: Number,
    default: 0,
    index: true,
  },
  
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'MXN', 'CAD', 'GBP'],
  },
  
  // Probability & Expected Value
  probability: {
    type: Number, // 0-100
    default: 50,
    min: 0,
    max: 100,
  },
  
  expectedValue: {
    type: Number,
    default: 0,
  },
  
  // Dates
  expectedCloseDate: {
    type: Date,
    index: true,
  },
  
  actualCloseDate: Date,
  
  closedAt: Date,
  
  rottenAt: Date, // When deal became "rotten" (no activity for X days)
  
  // Ownership
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  
  // Status
  status: {
    type: String,
    enum: ['open', 'won', 'lost', 'abandoned'],
    default: 'open',
    index: true,
  },
  
  lostReason: String,
  
  wonReason: String,
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true,
  },
  
  // Tags
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  
  // Custom Fields
  customFields: mongoose.Schema.Types.Mixed,
  
  // Products/Services
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    quantity: {
      type: Number,
      default: 1,
    },
    price: Number,
    discount: {
      type: Number,
      default: 0,
    },
    total: Number,
  }],
  
  // Source
  source: {
    type: String,
    enum: [
      'website',
      'email',
      'phone',
      'referral',
      'social_media',
      'whatsapp',
      'linkedin',
      'facebook',
      'instagram',
      'campaign',
      'manual',
      'other',
    ],
    default: 'manual',
  },
  
  sourceDetails: String,
  
  // Lead Scoring
  leadScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  leadQuality: {
    type: String,
    enum: ['hot', 'warm', 'cold'],
    default: 'warm',
  },
  
  // Activities
  lastActivityAt: Date,
  
  nextActivityAt: Date,
  
  nextActivityType: {
    type: String,
    enum: ['call', 'email', 'meeting', 'task', 'follow_up'],
  },
  
  // Engagement
  engagementScore: {
    type: Number,
    default: 0,
  },
  
  interactions: {
    emails: {
      type: Number,
      default: 0,
    },
    calls: {
      type: Number,
      default: 0,
    },
    meetings: {
      type: Number,
      default: 0,
    },
    whatsappMessages: {
      type: Number,
      default: 0,
    },
  },
  
  // Notifications
  reminders: [{
    type: {
      type: String,
      enum: ['follow_up', 'close_date', 'activity', 'custom'],
    },
    date: Date,
    message: String,
    sent: {
      type: Boolean,
      default: false,
    },
  }],
  
  // Visibility
  isPrivate: {
    type: Boolean,
    default: false,
  },
  
  // Archived
  isArchived: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  archivedAt: Date,
  
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
dealSchema.index({ workspace: 1, isArchived: 1, status: 1 });
dealSchema.index({ pipeline: 1, stage: 1 });
dealSchema.index({ owner: 1, status: 1 });
dealSchema.index({ contact: 1 });
dealSchema.index({ company: 1 });
dealSchema.index({ expectedCloseDate: 1 });
dealSchema.index({ value: -1 });
dealSchema.index({ leadScore: -1 });
dealSchema.index({ createdAt: -1 });

// Virtual: Total products value
dealSchema.virtual('productsTotal').get(function() {
  return this.products.reduce((total, p) => total + (p.total || 0), 0);
});

// Virtual: Is overdue
dealSchema.virtual('isOverdue').get(function() {
  if (!this.expectedCloseDate) return false;
  return this.expectedCloseDate < new Date() && this.status === 'open';
});

// Virtual: Days in current stage
dealSchema.virtual('daysInStage').get(function() {
  if (this.stageHistory.length === 0) return 0;
  const currentStageEntry = this.stageHistory[this.stageHistory.length - 1];
  const enteredAt = currentStageEntry.enteredAt;
  return Math.floor((Date.now() - enteredAt) / (1000 * 60 * 60 * 24));
});

// Virtual: Total deal duration
dealSchema.virtual('totalDuration').get(function() {
  if (!this.closedAt) return null;
  return Math.floor((this.closedAt - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Methods
dealSchema.methods.moveToStage = async function(newStageId, userId, note) {
  // Get pipeline to validate stage
  const Pipeline = mongoose.model('Pipeline');
  const pipeline = await Pipeline.findById(this.pipeline);
  
  if (!pipeline) {
    throw new Error('Pipeline not found');
  }
  
  const newStage = pipeline.getStageById(newStageId);
  if (!newStage) {
    throw new Error('Stage not found in pipeline');
  }
  
  // Close current stage in history
  if (this.stageHistory.length > 0) {
    const currentStageEntry = this.stageHistory[this.stageHistory.length - 1];
    if (!currentStageEntry.exitedAt) {
      currentStageEntry.exitedAt = new Date();
      currentStageEntry.duration = (currentStageEntry.exitedAt - currentStageEntry.enteredAt) / (1000 * 60 * 60); // hours
    }
  }
  
  // Add new stage entry
  this.stageHistory.push({
    stage: newStageId,
    enteredAt: new Date(),
    movedBy: userId,
    note: note || '',
  });
  
  // Update current stage
  this.stage = newStageId;
  
  // Update probability from stage
  this.probability = newStage.probability;
  
  // Calculate expected value
  this.expectedValue = (this.value * this.probability) / 100;
  
  // Check if won or lost
  if (pipeline.isWinStage(newStageId)) {
    this.status = 'won';
    this.closedAt = new Date();
    this.actualCloseDate = new Date();
  } else if (pipeline.isLostStage(newStageId)) {
    this.status = 'lost';
    this.closedAt = new Date();
  }
  
  return this.save();
};

dealSchema.methods.updateValue = function(newValue) {
  this.value = newValue;
  this.expectedValue = (this.value * this.probability) / 100;
  return this.save();
};

dealSchema.methods.updateProbability = function(newProbability) {
  this.probability = newProbability;
  this.expectedValue = (this.value * this.probability) / 100;
  return this.save();
};

dealSchema.methods.markAsWon = function(reason) {
  this.status = 'won';
  this.wonReason = reason;
  this.closedAt = new Date();
  this.actualCloseDate = new Date();
  this.probability = 100;
  this.expectedValue = this.value;
  return this.save();
};

dealSchema.methods.markAsLost = function(reason) {
  this.status = 'lost';
  this.lostReason = reason;
  this.closedAt = new Date();
  this.actualCloseDate = new Date();
  this.probability = 0;
  this.expectedValue = 0;
  return this.save();
};

dealSchema.methods.addProduct = function(productData) {
  const total = (productData.price * productData.quantity) - (productData.discount || 0);
  
  this.products.push({
    product: productData.product,
    quantity: productData.quantity,
    price: productData.price,
    discount: productData.discount || 0,
    total,
  });
  
  // Update deal value
  this.value = this.products.reduce((sum, p) => sum + p.total, 0);
  this.expectedValue = (this.value * this.probability) / 100;
  
  return this.save();
};

dealSchema.methods.recordActivity = function(type) {
  this.lastActivityAt = new Date();
  
  // Update interaction count
  if (type === 'email') {
    this.interactions.emails += 1;
  } else if (type === 'call') {
    this.interactions.calls += 1;
  } else if (type === 'meeting') {
    this.interactions.meetings += 1;
  } else if (type === 'whatsapp') {
    this.interactions.whatsappMessages += 1;
  }
  
  // Update engagement score
  this.engagementScore = Math.min(
    100,
    (this.interactions.emails * 2) +
    (this.interactions.calls * 5) +
    (this.interactions.meetings * 10) +
    (this.interactions.whatsappMessages * 1)
  );
  
  return this.save();
};

// Static methods
dealSchema.statics.findByWorkspace = function(workspaceId, filters = {}) {
  const query = { workspace: workspaceId, isArchived: false, ...filters };
  return this.find(query).sort({ createdAt: -1 });
};

dealSchema.statics.findByPipeline = function(pipelineId, stage = null) {
  const query = { pipeline: pipelineId, isArchived: false };
  if (stage) {
    query.stage = stage;
  }
  return this.find(query).sort({ createdAt: -1 });
};

dealSchema.statics.findByOwner = function(userId, status = null) {
  const query = { owner: userId, isArchived: false };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ expectedCloseDate: 1, createdAt: -1 });
};

dealSchema.statics.findOverdue = function(workspaceId) {
  return this.find({
    workspace: workspaceId,
    status: 'open',
    expectedCloseDate: { $lt: new Date() },
    isArchived: false,
  }).sort({ expectedCloseDate: 1 });
};

dealSchema.statics.findRotten = function(workspaceId, rottenDays = 30) {
  const rottenDate = new Date();
  rottenDate.setDate(rottenDate.getDate() - rottenDays);
  
  return this.find({
    workspace: workspaceId,
    status: 'open',
    lastActivityAt: { $lt: rottenDate },
    isArchived: false,
  }).sort({ lastActivityAt: 1 });
};

// Pre-save: Calculate expected value
dealSchema.pre('save', function(next) {
  if (this.isModified('value') || this.isModified('probability')) {
    this.expectedValue = (this.value * this.probability) / 100;
  }
  next();
});

const Deal = mongoose.model('Deal', dealSchema);

module.exports = Deal;
