/**
 * Vision Analysis Model
 * Stores image and document analysis results
 */

const mongoose = require('mongoose');

const VisionAnalysisSchema = new mongoose.Schema({
  entityType: {
    type: String,
    enum: ['contact', 'lead', 'deal', 'document', 'activity', 'general'],
    required: true,
    index: true
  },
  entityId: { type: mongoose.Schema.Types.ObjectId, index: true },
  
  imageFile: {
    filename: String,
    originalName: String,
    path: String,
    mimeType: String,
    size: Number,
    url: String
  },

  analysis: {
    type: {
      type: String,
      enum: ['document', 'receipt', 'invoice', 'businessCard', 'chart', 'diagram', 'screenshot', 'handwriting', 'qa', 'general', 'comparison', 'multi-image'],
      required: true,
      index: true
    },
    content: { type: String, required: true, index: 'text' },
    structured: mongoose.Schema.Types.Mixed,
    confidence: Number,
    model: { type: String, default: 'gpt-4o' },
    detailLevel: String
  },

  tokens: {
    prompt: Number,
    completion: Number,
    total: Number
  },

  processing: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'completed',
      index: true
    },
    duration: Number,
    error: String
  },

  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed,
  isArchived: { type: Boolean, default: false }

}, {
  timestamps: true,
  collection: 'vision_analyses'
});

VisionAnalysisSchema.index({ workspace: 1, 'analysis.type': 1, createdAt: -1 });
VisionAnalysisSchema.index({ 'analysis.content': 'text', tags: 'text' });

VisionAnalysisSchema.statics.createAnalysis = async function(data) {
  return await this.create({
    entityType: data.entityType,
    entityId: data.entityId,
    imageFile: data.imageFile,
    analysis: {
      type: data.type,
      content: data.content,
      structured: data.structured,
      confidence: data.confidence,
      model: data.model,
      detailLevel: data.detailLevel
    },
    tokens: data.tokens,
    processing: {
      status: 'completed',
      duration: data.processingTime
    },
    workspace: data.workspace,
    createdBy: data.createdBy,
    tags: data.tags || [],
    metadata: data.metadata || {}
  });
};

VisionAnalysisSchema.statics.searchAnalyses = async function(workspace, query, options = {}) {
  const filter = { workspace, isArchived: false };
  if (query) filter.$text = { $search: query };
  if (options.type) filter['analysis.type'] = options.type;
  if (options.entityType) filter.entityType = options.entityType;

  const analyses = await this.find(filter)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0)
    .populate('createdBy', 'name email')
    .lean();

  const total = await this.countDocuments(filter);
  return { analyses, total };
};

module.exports = mongoose.model('VisionAnalysis', VisionAnalysisSchema);
