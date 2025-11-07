const MarketplaceModel = require('../../models/MarketplaceModel');
const FineTuningJob = require('../../models/FineTuningJob');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * MarketplaceService - Handles model marketplace operations
 * 
 * Features:
 * - Model upload and validation
 * - Versioning system
 * - Revenue tracking and sharing
 * - Search and discovery
 * - Rating and review management
 */
class MarketplaceService {
  constructor() {
    this.config = {
      uploadDir: process.env.MARKETPLACE_UPLOAD_DIR || '/tmp/marketplace-uploads',
      maxFileSize: parseInt(process.env.MARKETPLACE_MAX_FILE_SIZE) || 10 * 1024 * 1024 * 1024, // 10GB
      allowedFormats: ['gguf', 'safetensors', 'bin', 'onnx', 'pt', 'pth'],
      minQualityScore: 0.6,
      revenueSharePercent: parseFloat(process.env.MARKETPLACE_REVENUE_SHARE) || 70, // Creator gets 70%
      featuredThreshold: 4.5, // Rating threshold for featured
      supportedCategories: [
        'general-purpose',
        'code-generation',
        'chat',
        'instruction-following',
        'summarization',
        'translation',
        'question-answering',
        'analysis',
        'creative-writing',
        'specialized'
      ]
    };

    // Ensure upload directory exists
    this.initializeUploadDir();
  }

  async initializeUploadDir() {
    try {
      await fs.mkdir(this.config.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  /**
   * Upload a new model to the marketplace
   */
  async uploadModel(modelData, files, userId, workspace) {
    try {
      // Validate input
      this.validateModelData(modelData);
      this.validateFiles(files);

      // Generate unique model ID
      const modelId = this.generateModelId(modelData.name);

      // Process and validate files
      const processedFiles = await this.processModelFiles(files, modelId);

      // Extract model metadata
      const metadata = await this.extractModelMetadata(processedFiles.modelFile);

      // Create model record
      const model = await MarketplaceModel.create({
        modelId,
        name: modelData.name,
        description: modelData.description,
        category: modelData.category,
        tags: modelData.tags || [],
        baseModel: modelData.baseModel,
        modelType: modelData.modelType,
        version: modelData.version || '1.0.0',
        capabilities: modelData.capabilities || [],
        languages: modelData.languages || ['en'],
        technicalSpecs: {
          contextWindow: metadata.contextWindow || modelData.contextWindow,
          parameters: metadata.parameters || modelData.parameters,
          quantization: modelData.quantization,
          fileSize: processedFiles.modelFile.size,
          format: processedFiles.modelFile.format,
          memoryRequirement: this.estimateMemoryRequirement(metadata.parameters, modelData.quantization),
        },
        performance: {
          qualityScore: modelData.qualityScore || 0,
          speedScore: modelData.speedScore || 0,
          benchmarks: modelData.benchmarks || []
        },
        ownership: {
          owner: userId,
          ownerWorkspace: workspace,
          visibility: modelData.visibility || 'private',
          license: modelData.license || 'Custom',
        },
        pricing: {
          type: modelData.pricingType || 'free',
          price: modelData.price || 0,
          currency: modelData.currency || 'USD',
          usagePrice: modelData.usagePrice || null,
        },
        status: 'draft',
        files: processedFiles,
        documentation: {
          usageExamples: modelData.usageExamples || [],
          inputFormat: modelData.inputFormat || '',
          outputFormat: modelData.outputFormat || '',
          limitations: modelData.limitations || [],
          bestPractices: modelData.bestPractices || []
        },
        training: modelData.fineTuningJobId ? {
          fineTuningJobId: modelData.fineTuningJobId,
          datasetInfo: modelData.datasetInfo,
          trainingDate: new Date()
        } : undefined
      });

      return {
        success: true,
        model: model.toObject(),
        message: 'Model uploaded successfully. Submit for review to publish.'
      };
    } catch (error) {
      console.error('Model upload failed:', error);
      throw error;
    }
  }

  /**
   * Update an existing model (creates new version)
   */
  async updateModel(modelId, updateData, files, userId) {
    try {
      const model = await MarketplaceModel.findOne({ modelId });
      
      if (!model) {
        throw new Error('Model not found');
      }

      if (model.ownership.owner.toString() !== userId) {
        throw new Error('Unauthorized: You do not own this model');
      }

      // Create new version if files are provided
      if (files && Object.keys(files).length > 0) {
        return await this.createNewVersion(model, updateData, files);
      }

      // Update metadata only
      Object.assign(model, updateData);
      model.updatedAt = new Date();
      await model.save();

      return {
        success: true,
        model: model.toObject(),
        message: 'Model updated successfully'
      };
    } catch (error) {
      console.error('Model update failed:', error);
      throw error;
    }
  }

  /**
   * Create a new version of an existing model
   */
  async createNewVersion(existingModel, updateData, files) {
    try {
      const newVersion = this.incrementVersion(existingModel.version);
      const processedFiles = await this.processModelFiles(files, existingModel.modelId);
      const metadata = await this.extractModelMetadata(processedFiles.modelFile);

      // Create new model entry with incremented version
      const newModel = await MarketplaceModel.create({
        ...existingModel.toObject(),
        _id: undefined,
        version: newVersion,
        files: processedFiles,
        status: 'draft',
        publishedAt: null,
        technicalSpecs: {
          ...existingModel.technicalSpecs,
          fileSize: processedFiles.modelFile.size,
          parameters: metadata.parameters || existingModel.technicalSpecs.parameters,
          contextWindow: metadata.contextWindow || existingModel.technicalSpecs.contextWindow,
        },
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        success: true,
        model: newModel.toObject(),
        previousVersion: existingModel.version,
        message: `New version ${newVersion} created successfully`
      };
    } catch (error) {
      console.error('Version creation failed:', error);
      throw error;
    }
  }

  /**
   * Submit model for review
   */
  async submitForReview(modelId, userId) {
    try {
      const model = await MarketplaceModel.findOne({ modelId });
      
      if (!model) {
        throw new Error('Model not found');
      }

      if (model.ownership.owner.toString() !== userId) {
        throw new Error('Unauthorized: You do not own this model');
      }

      if (model.status !== 'draft') {
        throw new Error(`Model cannot be submitted. Current status: ${model.status}`);
      }

      // Validate model meets quality requirements
      await this.validateForPublication(model);

      await model.publish();

      return {
        success: true,
        message: 'Model submitted for review. You will be notified once reviewed.',
        model: model.toObject()
      };
    } catch (error) {
      console.error('Submit for review failed:', error);
      throw error;
    }
  }

  /**
   * Approve model (admin only)
   */
  async approveModel(modelId, reviewerId, reviewNotes) {
    try {
      const model = await MarketplaceModel.findOne({ modelId });
      
      if (!model) {
        throw new Error('Model not found');
      }

      if (model.status !== 'pending-review') {
        throw new Error(`Model cannot be approved. Current status: ${model.status}`);
      }

      await model.approve(reviewerId, reviewNotes);

      return {
        success: true,
        message: 'Model approved and published to marketplace',
        model: model.toObject()
      };
    } catch (error) {
      console.error('Model approval failed:', error);
      throw error;
    }
  }

  /**
   * Reject model (admin only)
   */
  async rejectModel(modelId, reviewerId, reason) {
    try {
      const model = await MarketplaceModel.findOne({ modelId });
      
      if (!model) {
        throw new Error('Model not found');
      }

      if (model.status !== 'pending-review') {
        throw new Error(`Model cannot be rejected. Current status: ${model.status}`);
      }

      await model.reject(reviewerId, reason);

      return {
        success: true,
        message: 'Model rejected',
        model: model.toObject()
      };
    } catch (error) {
      console.error('Model rejection failed:', error);
      throw error;
    }
  }

  /**
   * Search and discover models
   */
  async searchModels(query, filters = {}) {
    try {
      const searchFilters = {
        status: 'approved', // Only show approved models
        ...filters
      };

      // If query is provided, use text search
      if (query && query.trim()) {
        searchFilters.$text = { $search: query };
      }

      // Apply category filter
      if (filters.category) {
        searchFilters.category = filters.category;
      }

      // Apply visibility filter
      if (filters.visibility) {
        searchFilters['ownership.visibility'] = filters.visibility;
      } else {
        // Default to public models only
        searchFilters['ownership.visibility'] = 'public';
      }

      // Apply pricing filter
      if (filters.pricingType) {
        searchFilters['pricing.type'] = filters.pricingType;
      }

      // Apply rating filter
      if (filters.minRating) {
        searchFilters['stats.rating.average'] = { $gte: parseFloat(filters.minRating) };
      }

      const sortOptions = this.getSortOptions(filters.sortBy);
      const limit = parseInt(filters.limit) || 20;
      const skip = parseInt(filters.skip) || 0;

      const models = await MarketplaceModel.find(searchFilters)
        .sort(sortOptions)
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await MarketplaceModel.countDocuments(searchFilters);

      return {
        success: true,
        models,
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + models.length < total
        }
      };
    } catch (error) {
      console.error('Model search failed:', error);
      throw error;
    }
  }

  /**
   * Get featured models
   */
  async getFeaturedModels(limit = 10) {
    try {
      const models = await MarketplaceModel.getFeatured(limit);
      return {
        success: true,
        models
      };
    } catch (error) {
      console.error('Get featured models failed:', error);
      throw error;
    }
  }

  /**
   * Get top rated models
   */
  async getTopRatedModels(limit = 10) {
    try {
      const models = await MarketplaceModel.getTopRated(limit);
      return {
        success: true,
        models
      };
    } catch (error) {
      console.error('Get top rated models failed:', error);
      throw error;
    }
  }

  /**
   * Get most downloaded models
   */
  async getMostDownloadedModels(limit = 10) {
    try {
      const models = await MarketplaceModel.getMostDownloaded(limit);
      return {
        success: true,
        models
      };
    } catch (error) {
      console.error('Get most downloaded models failed:', error);
      throw error;
    }
  }

  /**
   * Download model
   */
  async downloadModel(modelId, userId, workspace) {
    try {
      const model = await MarketplaceModel.findOne({ modelId, status: 'approved' });
      
      if (!model) {
        throw new Error('Model not found or not available');
      }

      // Check visibility access
      if (model.ownership.visibility === 'private') {
        if (model.ownership.owner.toString() !== userId) {
          throw new Error('Unauthorized: This model is private');
        }
      } else if (model.ownership.visibility === 'workspace') {
        if (model.ownership.ownerWorkspace !== workspace) {
          throw new Error('Unauthorized: This model is only available to the owner workspace');
        }
      }

      // Increment download counter
      await model.incrementDownloads();

      // Track revenue if paid model
      if (model.pricing.type !== 'free') {
        await this.trackRevenue(model, userId, 'download', model.pricing.price);
      }

      return {
        success: true,
        downloadUrl: model.files.modelFile.url,
        configUrl: model.files.configFile?.url,
        readmeUrl: model.files.readmeFile?.url,
        model: {
          modelId: model.modelId,
          name: model.name,
          version: model.version,
          fileSize: model.technicalSpecs.fileSize,
          format: model.technicalSpecs.format
        }
      };
    } catch (error) {
      console.error('Model download failed:', error);
      throw error;
    }
  }

  /**
   * Install model (tracks installation separately from download)
   */
  async installModel(modelId, userId, workspace) {
    try {
      const model = await MarketplaceModel.findOne({ modelId, status: 'approved' });
      
      if (!model) {
        throw new Error('Model not found or not available');
      }

      // Increment install counter
      await model.incrementInstalls();

      return {
        success: true,
        message: 'Model installation tracked',
        modelId: model.modelId
      };
    } catch (error) {
      console.error('Model installation tracking failed:', error);
      throw error;
    }
  }

  /**
   * Rate model
   */
  async rateModel(modelId, userId, rating, review) {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const model = await MarketplaceModel.findOne({ modelId, status: 'approved' });
      
      if (!model) {
        throw new Error('Model not found or not available');
      }

      await model.addRating(rating);

      return {
        success: true,
        message: 'Rating submitted successfully',
        newAverage: model.stats.rating.average,
        totalRatings: model.stats.rating.count
      };
    } catch (error) {
      console.error('Model rating failed:', error);
      throw error;
    }
  }

  /**
   * Track revenue from model usage
   */
  async trackRevenue(model, userId, revenueType, amount) {
    try {
      const creatorShare = (amount * this.config.revenueSharePercent) / 100;
      const platformShare = amount - creatorShare;

      // Update model revenue stats
      model.stats.revenue = (model.stats.revenue || 0) + creatorShare;
      await model.save();

      // TODO: Implement actual payment/revenue tracking system
      console.log(`Revenue tracked: ${amount} (Creator: ${creatorShare}, Platform: ${platformShare})`);

      return {
        success: true,
        revenueType,
        totalAmount: amount,
        creatorShare,
        platformShare
      };
    } catch (error) {
      console.error('Revenue tracking failed:', error);
      throw error;
    }
  }

  /**
   * Get model statistics
   */
  async getModelStats(modelId) {
    try {
      const model = await MarketplaceModel.findOne({ modelId });
      
      if (!model) {
        throw new Error('Model not found');
      }

      return {
        success: true,
        stats: {
          downloads: model.stats.downloads,
          installs: model.stats.installs,
          views: model.stats.views,
          rating: model.stats.rating,
          revenue: model.stats.revenue || 0
        }
      };
    } catch (error) {
      console.error('Get model stats failed:', error);
      throw error;
    }
  }

  /**
   * Get user's published models
   */
  async getUserModels(userId, filters = {}) {
    try {
      const query = { 'ownership.owner': userId, ...filters };
      const models = await MarketplaceModel.find(query).sort({ createdAt: -1 }).lean();

      return {
        success: true,
        models,
        count: models.length
      };
    } catch (error) {
      console.error('Get user models failed:', error);
      throw error;
    }
  }

  // ===== HELPER METHODS =====

  validateModelData(data) {
    if (!data.name || data.name.length < 3) {
      throw new Error('Model name must be at least 3 characters');
    }

    if (!data.description || data.description.length < 20) {
      throw new Error('Model description must be at least 20 characters');
    }

    if (!data.category || !this.config.supportedCategories.includes(data.category)) {
      throw new Error(`Invalid category. Must be one of: ${this.config.supportedCategories.join(', ')}`);
    }

    if (!data.baseModel) {
      throw new Error('Base model is required');
    }

    if (!data.modelType || !['chat', 'completion', 'instruct', 'embedding'].includes(data.modelType)) {
      throw new Error('Invalid model type');
    }
  }

  validateFiles(files) {
    if (!files.modelFile) {
      throw new Error('Model file is required');
    }

    const modelFile = files.modelFile;
    
    if (modelFile.size > this.config.maxFileSize) {
      throw new Error(`Model file exceeds maximum size of ${this.config.maxFileSize / (1024 * 1024 * 1024)}GB`);
    }

    const extension = path.extname(modelFile.name).toLowerCase().replace('.', '');
    if (!this.config.allowedFormats.includes(extension)) {
      throw new Error(`Invalid file format. Allowed: ${this.config.allowedFormats.join(', ')}`);
    }
  }

  async processModelFiles(files, modelId) {
    const processed = {};

    // Process model file
    if (files.modelFile) {
      const modelFile = files.modelFile;
      const extension = path.extname(modelFile.name).toLowerCase();
      const fileName = `${modelId}${extension}`;
      const filePath = path.join(this.config.uploadDir, fileName);

      // In production, upload to S3/cloud storage
      // For now, store locally
      await fs.writeFile(filePath, modelFile.data);

      processed.modelFile = {
        url: `/marketplace/files/${fileName}`,
        s3Key: `marketplace/${modelId}/${fileName}`,
        size: modelFile.size,
        format: extension.replace('.', ''),
        checksum: crypto.createHash('sha256').update(modelFile.data).digest('hex')
      };
    }

    // Process config file (optional)
    if (files.configFile) {
      const configFile = files.configFile;
      const fileName = `${modelId}-config.json`;
      const filePath = path.join(this.config.uploadDir, fileName);

      await fs.writeFile(filePath, configFile.data);

      processed.configFile = {
        url: `/marketplace/files/${fileName}`,
        s3Key: `marketplace/${modelId}/${fileName}`,
        size: configFile.size
      };
    }

    // Process README file (optional)
    if (files.readmeFile) {
      const readmeFile = files.readmeFile;
      const fileName = `${modelId}-README.md`;
      const filePath = path.join(this.config.uploadDir, fileName);

      await fs.writeFile(filePath, readmeFile.data);

      processed.readmeFile = {
        url: `/marketplace/files/${fileName}`,
        s3Key: `marketplace/${modelId}/${fileName}`,
        size: readmeFile.size
      };
    }

    return processed;
  }

  async extractModelMetadata(modelFile) {
    // TODO: Implement actual model file parsing for GGUF, SafeTensors, etc.
    // This would extract parameters count, context window, architecture, etc.
    
    // For now, return empty metadata - this should be enhanced
    return {
      parameters: null,
      contextWindow: null,
      architecture: null
    };
  }

  estimateMemoryRequirement(parameters, quantization) {
    if (!parameters) return 'Unknown';

    // Rough estimation based on parameters and quantization
    const paramCount = this.parseParameterCount(parameters);
    
    let bytesPerParam;
    switch (quantization) {
      case '4-bit': bytesPerParam = 0.5; break;
      case '8-bit': bytesPerParam = 1; break;
      case '16-bit': bytesPerParam = 2; break;
      case 'fp32': bytesPerParam = 4; break;
      default: bytesPerParam = 2;
    }

    const memoryGB = (paramCount * bytesPerParam) / (1024 * 1024 * 1024);
    
    if (memoryGB < 1) {
      return `${Math.round(memoryGB * 1024)} MB`;
    }
    return `${Math.round(memoryGB)} GB`;
  }

  parseParameterCount(paramStr) {
    // Parse strings like "7B", "13B", "70B"
    const match = paramStr.match(/(\d+\.?\d*)\s*([BMK])/i);
    if (!match) return 0;

    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'K': return num * 1000;
      case 'M': return num * 1000000;
      case 'B': return num * 1000000000;
      default: return num;
    }
  }

  generateModelId(name) {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const unique = uuidv4().slice(0, 8);
    return `${sanitized}-${unique}`;
  }

  incrementVersion(currentVersion) {
    const parts = currentVersion.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    return parts.join('.');
  }

  async validateForPublication(model) {
    const errors = [];

    // Check required fields
    if (!model.name || !model.description) {
      errors.push('Name and description are required');
    }

    if (!model.files.modelFile) {
      errors.push('Model file is required');
    }

    if (model.documentation.usageExamples.length === 0) {
      errors.push('At least one usage example is required');
    }

    if (!model.documentation.inputFormat || !model.documentation.outputFormat) {
      errors.push('Input and output format documentation is required');
    }

    // Check quality score
    if (model.performance.qualityScore < this.config.minQualityScore) {
      errors.push(`Quality score must be at least ${this.config.minQualityScore}`);
    }

    if (errors.length > 0) {
      throw new Error(`Model validation failed: ${errors.join(', ')}`);
    }
  }

  getSortOptions(sortBy) {
    const sortMap = {
      'rating': { 'stats.rating.average': -1 },
      'downloads': { 'stats.downloads': -1 },
      'recent': { 'publishedAt': -1 },
      'alphabetical': { 'name': 1 }
    };

    return sortMap[sortBy] || sortMap.recent;
  }
}

module.exports = new MarketplaceService();
