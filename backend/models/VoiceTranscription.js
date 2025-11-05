/**
 * Voice Transcription Model
 * Stores audio transcriptions and translations
 */

const mongoose = require('mongoose');

const TranscriptionSegmentSchema = new mongoose.Schema({
  id: Number,
  start: Number,
  end: Number,
  text: String,
  speaker: String,
  confidence: Number,
  tokens: [Number],
  avgLogprob: Number,
  compressionRatio: Number,
  noSpeechProb: Number
}, { _id: false });

const TranscriptionWordSchema = new mongoose.Schema({
  word: String,
  start: Number,
  end: Number,
  probability: Number
}, { _id: false });

const VoiceTranscriptionSchema = new mongoose.Schema({
  // Reference information
  entityType: {
    type: String,
    enum: ['contact', 'lead', 'deal', 'activity', 'meeting', 'call', 'voicemail', 'note', 'general'],
    required: true,
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'entityType',
    index: true
  },
  
  // Audio file information
  audioFile: {
    filename: String,
    originalName: String,
    path: String,
    mimeType: String,
    size: Number,
    duration: Number,
    format: String,
    url: String
  },

  // Transcription details
  transcription: {
    text: {
      type: String,
      required: true,
      index: 'text'
    },
    language: String,
    confidence: Number,
    model: {
      type: String,
      default: 'whisper-1'
    },
    responseFormat: String
  },

  // Segments with timestamps
  segments: [TranscriptionSegmentSchema],

  // Word-level timestamps
  words: [TranscriptionWordSchema],

  // Speaker diarization
  speakers: {
    enabled: Boolean,
    count: Number,
    segments: [{
      speaker: String,
      start: Number,
      end: Number,
      text: String
    }]
  },

  // Translation (if applicable)
  translation: {
    enabled: Boolean,
    originalLanguage: String,
    targetLanguage: String,
    text: String,
    model: String
  },

  // Processing metadata
  processing: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    startedAt: Date,
    completedAt: Date,
    duration: Number,
    error: String,
    retries: {
      type: Number,
      default: 0
    }
  },

  // Quality metrics
  quality: {
    overallScore: Number,
    clarity: Number,
    accuracy: Number,
    noiseLevel: String,
    warnings: [String]
  },

  // Usage information
  usage: {
    tokensUsed: Number,
    estimatedCost: Number,
    apiVersion: String
  },

  // Workspace and user
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Tags and categories
  tags: [String],
  category: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Metadata
  metadata: {
    source: String,
    device: String,
    location: String,
    recordedAt: Date,
    customFields: mongoose.Schema.Types.Mixed
  },

  // Flags
  isArchived: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true,
  collection: 'voice_transcriptions'
});

// Indexes
VoiceTranscriptionSchema.index({ workspace: 1, entityType: 1, createdAt: -1 });
VoiceTranscriptionSchema.index({ workspace: 1, createdBy: 1, createdAt: -1 });
VoiceTranscriptionSchema.index({ 'processing.status': 1, createdAt: -1 });
VoiceTranscriptionSchema.index({ workspace: 1, tags: 1 });
VoiceTranscriptionSchema.index({ 'transcription.language': 1 });

// Text index for full-text search
VoiceTranscriptionSchema.index({
  'transcription.text': 'text',
  'translation.text': 'text',
  tags: 'text'
});

// Virtual for file URL
VoiceTranscriptionSchema.virtual('fileUrl').get(function() {
  return this.audioFile?.url || this.audioFile?.path;
});

// Virtual for formatted duration
VoiceTranscriptionSchema.virtual('formattedDuration').get(function() {
  if (!this.audioFile?.duration) return '0:00';
  
  const minutes = Math.floor(this.audioFile.duration / 60);
  const seconds = Math.floor(this.audioFile.duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual for processing time
VoiceTranscriptionSchema.virtual('processingTime').get(function() {
  if (!this.processing.startedAt || !this.processing.completedAt) {
    return null;
  }
  return this.processing.completedAt - this.processing.startedAt;
});

// Static Methods

/**
 * Create transcription record
 */
VoiceTranscriptionSchema.statics.createTranscription = async function(data) {
  const transcription = new this({
    entityType: data.entityType,
    entityId: data.entityId,
    audioFile: data.audioFile,
    transcription: {
      text: data.text,
      language: data.language,
      confidence: data.confidence,
      model: data.model,
      responseFormat: data.responseFormat
    },
    segments: data.segments || [],
    words: data.words || [],
    speakers: data.speakers || { enabled: false },
    translation: data.translation || { enabled: false },
    processing: {
      status: 'completed',
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      duration: data.processingTime
    },
    workspace: data.workspace,
    createdBy: data.createdBy,
    tags: data.tags || [],
    metadata: data.metadata || {}
  });

  return await transcription.save();
};

/**
 * Search transcriptions
 */
VoiceTranscriptionSchema.statics.searchTranscriptions = async function(workspace, query, options = {}) {
  const filter = { workspace, isArchived: false };

  if (query) {
    filter.$text = { $search: query };
  }

  if (options.entityType) {
    filter.entityType = options.entityType;
  }

  if (options.entityId) {
    filter.entityId = options.entityId;
  }

  if (options.language) {
    filter['transcription.language'] = options.language;
  }

  if (options.dateFrom || options.dateTo) {
    filter.createdAt = {};
    if (options.dateFrom) filter.createdAt.$gte = new Date(options.dateFrom);
    if (options.dateTo) filter.createdAt.$lte = new Date(options.dateTo);
  }

  const sort = options.sort || { createdAt: -1 };
  const limit = options.limit || 50;
  const skip = options.skip || 0;

  const transcriptions = await this.find(filter)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .populate('createdBy', 'name email')
    .lean();

  const total = await this.countDocuments(filter);

  return {
    transcriptions,
    total,
    page: Math.floor(skip / limit) + 1,
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Get statistics
 */
VoiceTranscriptionSchema.statics.getStatistics = async function(workspace, options = {}) {
  const filter = { workspace };

  if (options.dateFrom || options.dateTo) {
    filter.createdAt = {};
    if (options.dateFrom) filter.createdAt.$gte = new Date(options.dateFrom);
    if (options.dateTo) filter.createdAt.$lte = new Date(options.dateTo);
  }

  const stats = await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalTranscriptions: { $sum: 1 },
        totalDuration: { $sum: '$audioFile.duration' },
        totalSize: { $sum: '$audioFile.size' },
        avgConfidence: { $avg: '$transcription.confidence' },
        avgProcessingTime: { $avg: '$processing.duration' }
      }
    }
  ]);

  const languageBreakdown = await this.aggregate([
    { $match: filter },
    { $group: { _id: '$transcription.language', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const statusBreakdown = await this.aggregate([
    { $match: filter },
    { $group: { _id: '$processing.status', count: { $sum: 1 } } }
  ]);

  return {
    overall: stats[0] || {
      totalTranscriptions: 0,
      totalDuration: 0,
      totalSize: 0,
      avgConfidence: 0,
      avgProcessingTime: 0
    },
    byLanguage: languageBreakdown,
    byStatus: statusBreakdown
  };
};

/**
 * Get recent transcriptions
 */
VoiceTranscriptionSchema.statics.getRecent = async function(workspace, limit = 10) {
  return await this.find({ workspace, isArchived: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'name email')
    .lean();
};

// Instance Methods

/**
 * Mark as archived
 */
VoiceTranscriptionSchema.methods.archive = async function() {
  this.isArchived = true;
  return await this.save();
};

/**
 * Toggle favorite
 */
VoiceTranscriptionSchema.methods.toggleFavorite = async function() {
  this.isFavorite = !this.isFavorite;
  return await this.save();
};

/**
 * Add tags
 */
VoiceTranscriptionSchema.methods.addTags = async function(tags) {
  const newTags = Array.isArray(tags) ? tags : [tags];
  this.tags = [...new Set([...this.tags, ...newTags])];
  return await this.save();
};

/**
 * Remove tags
 */
VoiceTranscriptionSchema.methods.removeTags = async function(tags) {
  const tagsToRemove = Array.isArray(tags) ? tags : [tags];
  this.tags = this.tags.filter(tag => !tagsToRemove.includes(tag));
  return await this.save();
};

/**
 * Get summary
 */
VoiceTranscriptionSchema.methods.getSummary = function() {
  return {
    id: this._id,
    text: this.transcription.text.substring(0, 200) + '...',
    language: this.transcription.language,
    duration: this.formattedDuration,
    confidence: this.transcription.confidence,
    createdAt: this.createdAt,
    createdBy: this.createdBy,
    tags: this.tags
  };
};

const VoiceTranscription = mongoose.model('VoiceTranscription', VoiceTranscriptionSchema);

module.exports = VoiceTranscription;
