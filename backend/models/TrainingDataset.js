const mongoose = require('mongoose');

/**
 * TrainingDataset Model
 * Stores prepared training datasets for fine-tuning
 */
const trainingDatasetSchema = new mongoose.Schema({
  workspace: {
    type: String,
    required: true,
    index: true,
  },
  
  datasetId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  name: {
    type: String,
    required: true,
  },
  
  description: String,
  
  // Dataset type
  type: {
    type: String,
    required: true,
    enum: [
      'instruction-following',
      'chat',
      'completion',
      'classification',
      'qa',
      'summarization',
      'custom',
    ],
  },
  
  // Data source
  source: {
    type: {
      type: String,
      enum: ['workspace', 'file', 'api', 'synthetic'],
      required: true,
    },
    config: mongoose.Schema.Types.Mixed,
  },
  
  // Dataset statistics
  statistics: {
    totalSamples: {
      type: Number,
      default: 0,
    },
    trainingSamples: {
      type: Number,
      default: 0,
    },
    validationSamples: {
      type: Number,
      default: 0,
    },
    avgInputLength: Number,
    avgOutputLength: Number,
    maxInputLength: Number,
    maxOutputLength: Number,
    uniqueInputs: Number,
  },
  
  // Data format
  format: {
    inputField: {
      type: String,
      default: 'input',
    },
    outputField: {
      type: String,
      default: 'output',
    },
    systemPrompt: String,
    template: String, // e.g., "### Instruction:\n{input}\n\n### Response:\n{output}"
  },
  
  // Quality metrics
  quality: {
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    diversity: Number,
    duplicates: Number,
    errors: Number,
    validationPassed: Boolean,
  },
  
  // Storage
  storage: {
    fileUrl: String,
    s3Key: String,
    localPath: String,
    fileSize: Number, // in bytes
    format: {
      type: String,
      enum: ['jsonl', 'json', 'csv', 'parquet'],
      default: 'jsonl',
    },
  },
  
  // Processing status
  status: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending',
    index: true,
  },
  
  // Preprocessing configuration
  preprocessing: {
    cleanText: {
      type: Boolean,
      default: true,
    },
    removeDuplicates: {
      type: Boolean,
      default: true,
    },
    filterByLength: {
      minLength: Number,
      maxLength: Number,
    },
    augmentation: {
      enabled: Boolean,
      methods: [String],
    },
  },
  
  // Usage tracking
  usage: {
    timesUsed: {
      type: Number,
      default: 0,
    },
    lastUsed: Date,
    associatedJobs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FineTuningJob',
    }],
  },
  
  // Metadata
  tags: [String],
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  isPublic: {
    type: Boolean,
    default: false,
  },
  
}, {
  timestamps: true,
});

// Indexes
trainingDatasetSchema.index({ workspace: 1, status: 1 });
trainingDatasetSchema.index({ workspace: 1, type: 1 });
trainingDatasetSchema.index({ datasetId: 1 }, { unique: true });

// Methods
trainingDatasetSchema.methods.updateStatistics = function(stats) {
  this.statistics = {
    ...this.statistics,
    ...stats,
  };
  return this.save();
};

trainingDatasetSchema.methods.markAsReady = function() {
  this.status = 'ready';
  return this.save();
};

trainingDatasetSchema.methods.recordUsage = function(jobId) {
  this.usage.timesUsed += 1;
  this.usage.lastUsed = new Date();
  if (jobId) {
    this.usage.associatedJobs.push(jobId);
  }
  return this.save();
};

// Statics
trainingDatasetSchema.statics.getWorkspaceDatasets = function(workspace, options = {}) {
  const { type, status, limit = 50 } = options;
  
  const query = { workspace };
  if (type) query.type = type;
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'name email');
};

module.exports = mongoose.model('TrainingDataset', trainingDatasetSchema);
