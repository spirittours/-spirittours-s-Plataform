const mongoose = require('mongoose');

/**
 * MarketplaceModel Schema
 * Models available in the marketplace for sharing/selling
 */
const marketplaceModelSchema = new mongoose.Schema({
  modelId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  // Basic information
  name: {
    type: String,
    required: true,
  },
  
  description: {
    type: String,
    required: true,
  },
  
  category: {
    type: String,
    enum: ['general', 'industry-specific', 'task-specific', 'custom'],
    default: 'general',
  },
  
  tags: [{
    type: String,
    index: true,
  }],
  
  // Model details
  baseModel: {
    type: String,
    required: true,
  },
  
  modelType: {
    type: String,
    enum: ['completion', 'chat', 'embedding', 'classification', 'other'],
    required: true,
  },
  
  version: {
    type: String,
    default: '1.0.0',
  },
  
  // Capabilities
  capabilities: [{
    type: String,
    enum: ['chat', 'completion', 'reasoning', 'coding', 'analysis', 'creative', 'translation'],
  }],
  
  languages: [String],
  
  // Technical specs
  specs: {
    contextWindow: {
      type: Number,
      required: true,
    },
    parameters: String, // e.g., "7B", "13B"
    quantization: String, // e.g., "4-bit", "8-bit", "full"
    fileSize: Number, // in MB
    format: String, // e.g., "GGUF", "safetensors"
    memoryRequirement: String,
  },
  
  // Performance metrics
  performance: {
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    speedScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    benchmarks: [{
      name: String,
      score: Number,
      details: String,
    }],
  },
  
  // Ownership and licensing
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  ownerWorkspace: {
    type: String,
    required: true,
  },
  
  visibility: {
    type: String,
    enum: ['public', 'private', 'workspace'],
    default: 'private',
    index: true,
  },
  
  license: {
    type: String,
    enum: ['mit', 'apache-2.0', 'gpl-3.0', 'commercial', 'custom'],
    default: 'custom',
  },
  
  licenseText: String,
  
  // Pricing
  pricing: {
    type: {
      type: String,
      enum: ['free', 'one-time', 'subscription', 'usage-based'],
      default: 'free',
    },
    price: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    usagePrice: {
      per1kTokens: Number,
    },
  },
  
  // Marketplace status
  status: {
    type: String,
    enum: ['draft', 'pending-review', 'approved', 'rejected', 'suspended'],
    default: 'draft',
    index: true,
  },
  
  reviewStatus: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    reviewNotes: String,
    rejectionReason: String,
  },
  
  // Model files
  files: {
    modelFile: {
      url: String,
      s3Key: String,
      hash: String,
    },
    configFile: {
      url: String,
      s3Key: String,
    },
    readmeFile: {
      url: String,
      content: String,
    },
  },
  
  // Usage statistics
  stats: {
    downloads: {
      type: Number,
      default: 0,
    },
    installs: {
      type: Number,
      default: 0,
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    views: {
      type: Number,
      default: 0,
    },
    revenue: {
      type: Number,
      default: 0,
    },
  },
  
  // Documentation
  documentation: {
    usageExamples: [String],
    inputFormat: String,
    outputFormat: String,
    limitations: [String],
    bestPractices: [String],
  },
  
  // Training information
  trainingInfo: {
    fineTuningJobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FineTuningJob',
    },
    datasetInfo: String,
    trainingDate: Date,
    trainingDuration: Number, // hours
  },
  
  // Featured/promoted
  featured: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  featuredUntil: Date,
  
  // Metadata
  publishedAt: Date,
  lastUpdatedAt: Date,
  
}, {
  timestamps: true,
});

// Indexes
marketplaceModelSchema.index({ name: 'text', description: 'text', tags: 'text' });
marketplaceModelSchema.index({ status: 1, visibility: 1, featured: -1 });
marketplaceModelSchema.index({ 'stats.rating.average': -1 });
marketplaceModelSchema.index({ 'stats.downloads': -1 });

// Methods
marketplaceModelSchema.methods.incrementDownloads = function() {
  this.stats.downloads += 1;
  return this.save();
};

marketplaceModelSchema.methods.incrementInstalls = function() {
  this.stats.installs += 1;
  return this.save();
};

marketplaceModelSchema.methods.incrementViews = function() {
  this.stats.views += 1;
  return this.save();
};

marketplaceModelSchema.methods.addRating = function(rating) {
  const currentTotal = this.stats.rating.average * this.stats.rating.count;
  this.stats.rating.count += 1;
  this.stats.rating.average = (currentTotal + rating) / this.stats.rating.count;
  return this.save();
};

marketplaceModelSchema.methods.publish = function() {
  this.status = 'pending-review';
  return this.save();
};

marketplaceModelSchema.methods.approve = function(reviewerId, notes) {
  this.status = 'approved';
  this.publishedAt = new Date();
  this.reviewStatus = {
    reviewedBy: reviewerId,
    reviewedAt: new Date(),
    reviewNotes: notes,
  };
  return this.save();
};

marketplaceModelSchema.methods.reject = function(reviewerId, reason) {
  this.status = 'rejected';
  this.reviewStatus = {
    reviewedBy: reviewerId,
    reviewedAt: new Date(),
    rejectionReason: reason,
  };
  return this.save();
};

// Statics
marketplaceModelSchema.statics.getFeatured = function(limit = 10) {
  return this.find({
    status: 'approved',
    visibility: 'public',
    featured: true,
  })
    .sort({ featuredUntil: -1 })
    .limit(limit)
    .populate('owner', 'name email');
};

marketplaceModelSchema.statics.getTopRated = function(limit = 10) {
  return this.find({
    status: 'approved',
    visibility: 'public',
  })
    .sort({ 'stats.rating.average': -1, 'stats.rating.count': -1 })
    .limit(limit)
    .populate('owner', 'name email');
};

marketplaceModelSchema.statics.getMostDownloaded = function(limit = 10) {
  return this.find({
    status: 'approved',
    visibility: 'public',
  })
    .sort({ 'stats.downloads': -1 })
    .limit(limit)
    .populate('owner', 'name email');
};

marketplaceModelSchema.statics.searchModels = async function(query, filters = {}) {
  const searchQuery = {
    status: 'approved',
    visibility: 'public',
  };
  
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  if (filters.category) {
    searchQuery.category = filters.category;
  }
  
  if (filters.modelType) {
    searchQuery.modelType = filters.modelType;
  }
  
  if (filters.tags && filters.tags.length > 0) {
    searchQuery.tags = { $in: filters.tags };
  }
  
  if (filters.minRating) {
    searchQuery['stats.rating.average'] = { $gte: filters.minRating };
  }
  
  return this.find(searchQuery)
    .sort(filters.sortBy || { 'stats.downloads': -1 })
    .limit(filters.limit || 20)
    .populate('owner', 'name email');
};

module.exports = mongoose.model('MarketplaceModel', marketplaceModelSchema);
