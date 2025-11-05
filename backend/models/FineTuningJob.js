const mongoose = require('mongoose');

/**
 * FineTuningJob Model
 * Tracks fine-tuning jobs for custom AI model training
 * Supports Llama 3, Mistral, and other open-source models
 */
const fineTuningJobSchema = new mongoose.Schema({
  workspace: {
    type: String,
    required: true,
    index: true,
  },
  
  // Job identification
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  name: {
    type: String,
    required: true,
  },
  
  description: {
    type: String,
  },
  
  // Model configuration
  baseModel: {
    type: String,
    required: true,
    enum: [
      'llama-3-8b',
      'llama-3-70b',
      'llama-3.1-8b',
      'llama-3.1-70b',
      'llama-3.1-405b',
      'mistral-7b',
      'mixtral-8x7b',
      'qwen-7b',
      'qwen-14b',
      'deepseek-coder-33b',
    ],
  },
  
  // Fine-tuning method
  method: {
    type: String,
    required: true,
    enum: ['lora', 'qlora', 'full', 'prefix-tuning', 'p-tuning'],
    default: 'lora',
  },
  
  // Training data
  trainingData: {
    source: {
      type: String,
      enum: ['workspace', 'file', 'dataset', 'custom'],
      required: true,
    },
    datasetId: String,
    fileUrl: String,
    filters: {
      type: mongoose.Schema.Types.Mixed,
    },
    sampleCount: Number,
  },
  
  // Validation data
  validationData: {
    source: String,
    datasetId: String,
    fileUrl: String,
    sampleCount: Number,
  },
  
  // Hyperparameters
  hyperparameters: {
    learningRate: {
      type: Number,
      default: 0.0001,
    },
    batchSize: {
      type: Number,
      default: 4,
    },
    epochs: {
      type: Number,
      default: 3,
    },
    warmupSteps: {
      type: Number,
      default: 100,
    },
    maxSequenceLength: {
      type: Number,
      default: 2048,
    },
    loraR: {
      type: Number,
      default: 8,
    },
    loraAlpha: {
      type: Number,
      default: 16,
    },
    loraDropout: {
      type: Number,
      default: 0.05,
    },
    gradientAccumulationSteps: {
      type: Number,
      default: 1,
    },
  },
  
  // Job status
  status: {
    type: String,
    required: true,
    enum: [
      'pending',
      'preparing',
      'training',
      'evaluating',
      'completed',
      'failed',
      'cancelled',
    ],
    default: 'pending',
    index: true,
  },
  
  // Progress tracking
  progress: {
    currentEpoch: {
      type: Number,
      default: 0,
    },
    totalEpochs: {
      type: Number,
    },
    currentStep: {
      type: Number,
      default: 0,
    },
    totalSteps: {
      type: Number,
    },
    percentComplete: {
      type: Number,
      default: 0,
    },
    estimatedTimeRemaining: Number, // seconds
  },
  
  // Training metrics
  metrics: {
    trainingLoss: [Number],
    validationLoss: [Number],
    perplexity: [Number],
    accuracy: [Number],
    learningRates: [Number],
    timestamps: [Date],
  },
  
  // Final results
  results: {
    finalTrainingLoss: Number,
    finalValidationLoss: Number,
    finalPerplexity: Number,
    finalAccuracy: Number,
    bestCheckpoint: String,
    modelSize: Number, // in MB
  },
  
  // Model deployment
  deployment: {
    status: {
      type: String,
      enum: ['not_deployed', 'deploying', 'deployed', 'failed'],
      default: 'not_deployed',
    },
    endpoint: String,
    modelId: String,
    deployedAt: Date,
  },
  
  // Resource usage
  resources: {
    computeProvider: {
      type: String,
      enum: ['local', 'cloud', 'together-ai', 'replicate', 'huggingface'],
    },
    gpuType: String,
    totalGpuHours: Number,
    estimatedCost: Number,
    actualCost: Number,
  },
  
  // Error handling
  error: {
    message: String,
    stack: String,
    timestamp: Date,
  },
  
  // Timestamps
  startedAt: Date,
  completedAt: Date,
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  tags: [String],
  
  notes: String,
  
}, {
  timestamps: true,
});

// Indexes for efficient queries
fineTuningJobSchema.index({ workspace: 1, status: 1 });
fineTuningJobSchema.index({ workspace: 1, createdAt: -1 });
fineTuningJobSchema.index({ jobId: 1 }, { unique: true });

// Methods
fineTuningJobSchema.methods.updateProgress = function(epoch, step, loss) {
  this.progress.currentEpoch = epoch;
  this.progress.currentStep = step;
  
  if (this.progress.totalSteps > 0) {
    this.progress.percentComplete = Math.round((step / this.progress.totalSteps) * 100);
  }
  
  if (loss !== undefined) {
    this.metrics.trainingLoss.push(loss);
    this.metrics.timestamps.push(new Date());
  }
  
  return this.save();
};

fineTuningJobSchema.methods.complete = function(results) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.progress.percentComplete = 100;
  
  if (results) {
    this.results = {
      ...this.results,
      ...results,
    };
  }
  
  return this.save();
};

fineTuningJobSchema.methods.fail = function(error) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.error = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date(),
  };
  
  return this.save();
};

fineTuningJobSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.completedAt = new Date();
  return this.save();
};

// Statics
fineTuningJobSchema.statics.getActiveJobs = function(workspace) {
  return this.find({
    workspace,
    status: { $in: ['pending', 'preparing', 'training', 'evaluating'] },
  }).sort({ createdAt: -1 });
};

fineTuningJobSchema.statics.getJobStats = async function(workspace) {
  const stats = await this.aggregate([
    { $match: { workspace } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgCost: { $avg: '$resources.actualCost' },
        totalGpuHours: { $sum: '$resources.totalGpuHours' },
      },
    },
  ]);
  
  return stats;
};

module.exports = mongoose.model('FineTuningJob', fineTuningJobSchema);
