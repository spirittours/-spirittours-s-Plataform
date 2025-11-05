const FineTuningJob = require('../../models/FineTuningJob');
const TrainingDataset = require('../../models/TrainingDataset');
const Contact = require('../../models/Contact');
const Lead = require('../../models/Lead');
const Deal = require('../../models/Deal');
const Activity = require('../../models/Activity');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../config/logger');

/**
 * FineTuningService
 * Manages fine-tuning jobs for custom AI model training
 * Supports Llama 3, Mistral, and other open-source models
 * Uses LoRA/QLoRA for efficient fine-tuning
 */
class FineTuningService {
  constructor() {
    this.supportedModels = {
      'llama-3-8b': {
        name: 'Llama 3 8B',
        baseModel: 'meta-llama/Meta-Llama-3-8B',
        contextWindow: 8192,
        recommendedGpu: 'A100 40GB',
        estimatedTime: '2-4 hours',
        cost: '$5-10',
      },
      'llama-3-70b': {
        name: 'Llama 3 70B',
        baseModel: 'meta-llama/Meta-Llama-3-70B',
        contextWindow: 8192,
        recommendedGpu: 'A100 80GB x4',
        estimatedTime: '8-12 hours',
        cost: '$50-100',
      },
      'llama-3.1-8b': {
        name: 'Llama 3.1 8B',
        baseModel: 'meta-llama/Meta-Llama-3.1-8B',
        contextWindow: 128000,
        recommendedGpu: 'A100 40GB',
        estimatedTime: '2-4 hours',
        cost: '$5-10',
      },
      'llama-3.1-70b': {
        name: 'Llama 3.1 70B',
        baseModel: 'meta-llama/Meta-Llama-3.1-70B',
        contextWindow: 128000,
        recommendedGpu: 'A100 80GB x4',
        estimatedTime: '8-12 hours',
        cost: '$50-100',
      },
      'mistral-7b': {
        name: 'Mistral 7B',
        baseModel: 'mistralai/Mistral-7B-v0.1',
        contextWindow: 8192,
        recommendedGpu: 'A100 40GB',
        estimatedTime: '2-3 hours',
        cost: '$5-8',
      },
      'mixtral-8x7b': {
        name: 'Mixtral 8x7B',
        baseModel: 'mistralai/Mixtral-8x7B-v0.1',
        contextWindow: 32768,
        recommendedGpu: 'A100 80GB x2',
        estimatedTime: '6-10 hours',
        cost: '$30-60',
      },
    };
    
    this.trainingMethods = {
      lora: {
        name: 'LoRA (Low-Rank Adaptation)',
        description: 'Efficient fine-tuning with trainable low-rank matrices',
        memoryFootprint: 'Low',
        trainingSpeed: 'Fast',
        recommended: true,
      },
      qlora: {
        name: 'QLoRA (Quantized LoRA)',
        description: 'Memory-efficient LoRA with 4-bit quantization',
        memoryFootprint: 'Very Low',
        trainingSpeed: 'Fast',
        recommended: true,
      },
      full: {
        name: 'Full Fine-tuning',
        description: 'Train all model parameters',
        memoryFootprint: 'Very High',
        trainingSpeed: 'Slow',
        recommended: false,
      },
    };
  }
  
  /**
   * Create a new fine-tuning job
   */
  async createFineTuningJob(workspace, config, userId) {
    try {
      const jobId = `ft-${uuidv4().slice(0, 8)}`;
      
      // Validate configuration
      this.validateConfig(config);
      
      // Prepare training data
      let trainingData = config.trainingData;
      if (trainingData.source === 'workspace') {
        trainingData = await this.prepareWorkspaceData(workspace, trainingData.filters);
      }
      
      // Calculate total steps
      const totalSteps = Math.ceil(
        (trainingData.sampleCount / config.hyperparameters.batchSize) * 
        config.hyperparameters.epochs
      );
      
      // Create job
      const job = await FineTuningJob.create({
        workspace,
        jobId,
        name: config.name,
        description: config.description,
        baseModel: config.baseModel,
        method: config.method || 'lora',
        trainingData,
        validationData: config.validationData,
        hyperparameters: {
          ...this.getDefaultHyperparameters(config.baseModel),
          ...config.hyperparameters,
        },
        progress: {
          totalEpochs: config.hyperparameters.epochs,
          totalSteps,
        },
        resources: {
          computeProvider: config.computeProvider || 'cloud',
          gpuType: this.supportedModels[config.baseModel]?.recommendedGpu,
          estimatedCost: this.estimateCost(config.baseModel, totalSteps),
        },
        createdBy: userId,
        tags: config.tags || [],
      });
      
      logger.info(`Fine-tuning job created: ${jobId} for workspace ${workspace}`);
      
      // Start training asynchronously
      this.startTraining(job).catch(error => {
        logger.error(`Fine-tuning job ${jobId} failed:`, error);
        job.fail(error);
      });
      
      return job;
    } catch (error) {
      logger.error('Error creating fine-tuning job:', error);
      throw error;
    }
  }
  
  /**
   * Prepare training data from workspace
   */
  async prepareWorkspaceData(workspace, filters = {}) {
    try {
      const dataset = [];
      
      // Collect data from contacts
      if (!filters.excludeContacts) {
        const contacts = await Contact.find({ workspace }).limit(1000);
        contacts.forEach(contact => {
          dataset.push({
            input: `Analyze this contact: ${contact.name}, ${contact.email}, ${contact.company}`,
            output: `This is a ${contact.status} contact from ${contact.source} with quality score ${contact.quality || 'N/A'}`,
          });
        });
      }
      
      // Collect data from leads
      if (!filters.excludeLeads) {
        const leads = await Lead.find({ workspace }).limit(1000);
        leads.forEach(lead => {
          dataset.push({
            input: `Evaluate this lead: Score ${lead.score}, Stage ${lead.stage}, Source ${lead.source}`,
            output: `Lead quality: ${lead.quality}, Recommended action: ${this.getLeadRecommendation(lead)}`,
          });
        });
      }
      
      // Collect data from deals
      if (!filters.excludeDeals) {
        const deals = await Deal.find({ workspace }).limit(1000);
        deals.forEach(deal => {
          dataset.push({
            input: `Analyze deal: ${deal.name}, Value ${deal.value}, Stage ${deal.stage}`,
            output: `Deal probability: ${deal.probability || 'N/A'}%, Expected close: ${deal.expectedCloseDate || 'Not set'}`,
          });
        });
      }
      
      // Collect data from activities
      if (!filters.excludeActivities) {
        const activities = await Activity.find({ workspace }).limit(1000);
        activities.forEach(activity => {
          if (activity.notes) {
            dataset.push({
              input: `Summarize this ${activity.type} activity: ${activity.notes}`,
              output: `Activity summary: ${activity.type} activity with outcome ${activity.outcome || 'pending'}`,
            });
          }
        });
      }
      
      // Apply filters
      let filteredDataset = dataset;
      if (filters.minSamples && dataset.length < filters.minSamples) {
        throw new Error(`Insufficient data: ${dataset.length} samples (minimum ${filters.minSamples} required)`);
      }
      
      if (filters.maxSamples && dataset.length > filters.maxSamples) {
        filteredDataset = dataset.slice(0, filters.maxSamples);
      }
      
      return {
        source: 'workspace',
        filters,
        sampleCount: filteredDataset.length,
        data: filteredDataset,
      };
    } catch (error) {
      logger.error('Error preparing workspace data:', error);
      throw error;
    }
  }
  
  /**
   * Start training job
   */
  async startTraining(job) {
    try {
      // Update status
      job.status = 'preparing';
      job.startedAt = new Date();
      await job.save();
      
      logger.info(`Starting training for job ${job.jobId}`);
      
      // Simulate training process (in production, this would integrate with actual training infrastructure)
      await this.simulateTraining(job);
      
      // Complete job
      await job.complete({
        finalTrainingLoss: 0.45,
        finalValidationLoss: 0.52,
        finalPerplexity: 12.3,
        finalAccuracy: 0.89,
        bestCheckpoint: `checkpoint-${job.jobId}-best`,
        modelSize: 4200,
      });
      
      logger.info(`Training completed for job ${job.jobId}`);
    } catch (error) {
      logger.error(`Training failed for job ${job.jobId}:`, error);
      await job.fail(error);
      throw error;
    }
  }
  
  /**
   * Simulate training process (for demonstration)
   * In production, this would integrate with Together AI, Replicate, or local infrastructure
   */
  async simulateTraining(job) {
    const totalEpochs = job.hyperparameters.epochs;
    const stepsPerEpoch = Math.ceil(job.progress.totalSteps / totalEpochs);
    
    job.status = 'training';
    await job.save();
    
    for (let epoch = 1; epoch <= totalEpochs; epoch++) {
      for (let step = 1; step <= stepsPerEpoch; step++) {
        // Simulate training step
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms per step
        
        const globalStep = (epoch - 1) * stepsPerEpoch + step;
        const loss = 2.0 - (globalStep / job.progress.totalSteps) * 1.5 + Math.random() * 0.1;
        
        // Update progress
        await job.updateProgress(epoch, globalStep, loss);
        
        // Record metrics periodically
        if (step % 10 === 0) {
          job.metrics.learningRates.push(job.hyperparameters.learningRate);
          await job.save();
        }
      }
      
      // Evaluate after each epoch
      const validationLoss = 2.0 - (epoch / totalEpochs) * 1.4 + Math.random() * 0.15;
      job.metrics.validationLoss.push(validationLoss);
      await job.save();
      
      logger.info(`Epoch ${epoch}/${totalEpochs} completed for job ${job.jobId}`);
    }
    
    job.status = 'evaluating';
    await job.save();
    
    // Simulate evaluation
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  /**
   * Deploy trained model
   */
  async deployModel(jobId, config = {}) {
    try {
      const job = await FineTuningJob.findOne({ jobId });
      if (!job) {
        throw new Error('Job not found');
      }
      
      if (job.status !== 'completed') {
        throw new Error('Job not completed');
      }
      
      job.deployment.status = 'deploying';
      await job.save();
      
      // In production, this would deploy to Ollama, Together AI, or other inference platforms
      const endpoint = `https://api.inference.com/models/${jobId}`;
      const modelId = `${job.workspace}-${job.baseModel}-${jobId}`;
      
      job.deployment.status = 'deployed';
      job.deployment.endpoint = endpoint;
      job.deployment.modelId = modelId;
      job.deployment.deployedAt = new Date();
      await job.save();
      
      logger.info(`Model deployed for job ${jobId}: ${endpoint}`);
      
      return {
        success: true,
        endpoint,
        modelId,
      };
    } catch (error) {
      logger.error(`Error deploying model for job ${jobId}:`, error);
      
      const job = await FineTuningJob.findOne({ jobId });
      if (job) {
        job.deployment.status = 'failed';
        await job.save();
      }
      
      throw error;
    }
  }
  
  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    const job = await FineTuningJob.findOne({ jobId })
      .populate('createdBy', 'name email');
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    return {
      jobId: job.jobId,
      name: job.name,
      status: job.status,
      progress: job.progress,
      metrics: job.metrics,
      results: job.results,
      deployment: job.deployment,
      resources: job.resources,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
    };
  }
  
  /**
   * List jobs for workspace
   */
  async listJobs(workspace, options = {}) {
    const { status, limit = 20, offset = 0 } = options;
    
    const query = { workspace };
    if (status) {
      query.status = status;
    }
    
    const jobs = await FineTuningJob.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('createdBy', 'name email');
    
    const total = await FineTuningJob.countDocuments(query);
    
    return {
      jobs,
      total,
      limit,
      offset,
    };
  }
  
  /**
   * Cancel job
   */
  async cancelJob(jobId) {
    const job = await FineTuningJob.findOne({ jobId });
    if (!job) {
      throw new Error('Job not found');
    }
    
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      throw new Error('Cannot cancel job in current status');
    }
    
    await job.cancel();
    logger.info(`Job cancelled: ${jobId}`);
    
    return job;
  }
  
  /**
   * Get model information
   */
  getSupportedModels() {
    return Object.entries(this.supportedModels).map(([key, model]) => ({
      id: key,
      ...model,
    }));
  }
  
  /**
   * Get training methods
   */
  getTrainingMethods() {
    return Object.entries(this.trainingMethods).map(([key, method]) => ({
      id: key,
      ...method,
    }));
  }
  
  // Helper methods
  validateConfig(config) {
    if (!config.name) throw new Error('Job name is required');
    if (!config.baseModel) throw new Error('Base model is required');
    if (!this.supportedModels[config.baseModel]) throw new Error('Unsupported model');
    if (!config.trainingData) throw new Error('Training data is required');
  }
  
  getDefaultHyperparameters(baseModel) {
    return {
      learningRate: 0.0001,
      batchSize: 4,
      epochs: 3,
      warmupSteps: 100,
      maxSequenceLength: 2048,
      loraR: 8,
      loraAlpha: 16,
      loraDropout: 0.05,
      gradientAccumulationSteps: 1,
    };
  }
  
  estimateCost(baseModel, totalSteps) {
    const modelInfo = this.supportedModels[baseModel];
    if (!modelInfo) return 0;
    
    const baseCost = parseFloat(modelInfo.cost.replace(/[^0-9.-]+/g, ''));
    const stepFactor = totalSteps / 1000;
    
    return baseCost * stepFactor;
  }
  
  getLeadRecommendation(lead) {
    if (lead.score >= 80) return 'Contact immediately';
    if (lead.score >= 60) return 'Schedule follow-up';
    if (lead.score >= 40) return 'Nurture with content';
    return 'Monitor for engagement';
  }
}

module.exports = new FineTuningService();
