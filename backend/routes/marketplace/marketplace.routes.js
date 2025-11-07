const express = require('express');
const router = express.Router();
const multer = require('multer');
const MarketplaceService = require('../../services/marketplace/MarketplaceService');
const MarketplaceModel = require('../../models/MarketplaceModel');
const { authenticate, requireRole } = require('../../middleware/auth');
const RateLimiter = require('../../middleware/rateLimiter');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB max
  },
  fileFilter: (req, file, cb) => {
    const allowedFormats = ['gguf', 'safetensors', 'bin', 'onnx', 'pt', 'pth', 'json', 'md'];
    const extension = file.originalname.split('.').pop().toLowerCase();
    
    if (allowedFormats.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file format: ${extension}. Allowed: ${allowedFormats.join(', ')}`));
    }
  }
});

// Rate limiters
const searchLimiter = RateLimiter.createLimiter('marketplace-search', {
  windowMs: 60 * 1000,
  max: 30
});

const uploadLimiter = RateLimiter.createLimiter('marketplace-upload', {
  windowMs: 60 * 60 * 1000,
  max: 5 // 5 uploads per hour
});

const downloadLimiter = RateLimiter.createLimiter('marketplace-download', {
  windowMs: 60 * 1000,
  max: 10
});

/**
 * @route   POST /api/marketplace/models
 * @desc    Upload a new model to marketplace
 * @access  Private
 */
router.post(
  '/models',
  authenticate,
  uploadLimiter,
  upload.fields([
    { name: 'modelFile', maxCount: 1 },
    { name: 'configFile', maxCount: 1 },
    { name: 'readmeFile', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const modelData = JSON.parse(req.body.modelData || '{}');
      const files = {};

      // Process uploaded files
      if (req.files.modelFile) {
        files.modelFile = {
          name: req.files.modelFile[0].originalname,
          data: req.files.modelFile[0].buffer,
          size: req.files.modelFile[0].size
        };
      }

      if (req.files.configFile) {
        files.configFile = {
          name: req.files.configFile[0].originalname,
          data: req.files.configFile[0].buffer,
          size: req.files.configFile[0].size
        };
      }

      if (req.files.readmeFile) {
        files.readmeFile = {
          name: req.files.readmeFile[0].originalname,
          data: req.files.readmeFile[0].buffer,
          size: req.files.readmeFile[0].size
        };
      }

      const result = await MarketplaceService.uploadModel(
        modelData,
        files,
        req.user._id,
        req.user.workspace
      );

      res.status(201).json(result);
    } catch (error) {
      console.error('Model upload error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   PUT /api/marketplace/models/:modelId
 * @desc    Update an existing model
 * @access  Private (Owner only)
 */
router.put(
  '/models/:modelId',
  authenticate,
  uploadLimiter,
  upload.fields([
    { name: 'modelFile', maxCount: 1 },
    { name: 'configFile', maxCount: 1 },
    { name: 'readmeFile', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { modelId } = req.params;
      const updateData = JSON.parse(req.body.updateData || '{}');
      const files = {};

      // Process uploaded files
      if (req.files.modelFile) {
        files.modelFile = {
          name: req.files.modelFile[0].originalname,
          data: req.files.modelFile[0].buffer,
          size: req.files.modelFile[0].size
        };
      }

      if (req.files.configFile) {
        files.configFile = {
          name: req.files.configFile[0].originalname,
          data: req.files.configFile[0].buffer,
          size: req.files.configFile[0].size
        };
      }

      if (req.files.readmeFile) {
        files.readmeFile = {
          name: req.files.readmeFile[0].originalname,
          data: req.files.readmeFile[0].buffer,
          size: req.files.readmeFile[0].size
        };
      }

      const result = await MarketplaceService.updateModel(
        modelId,
        updateData,
        files,
        req.user._id
      );

      res.json(result);
    } catch (error) {
      console.error('Model update error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/marketplace/models/:modelId/submit
 * @desc    Submit model for review
 * @access  Private (Owner only)
 */
router.post(
  '/models/:modelId/submit',
  authenticate,
  async (req, res) => {
    try {
      const { modelId } = req.params;
      const result = await MarketplaceService.submitForReview(modelId, req.user._id);
      res.json(result);
    } catch (error) {
      console.error('Submit for review error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/marketplace/models/:modelId/approve
 * @desc    Approve model for publication
 * @access  Private (Admin only)
 */
router.post(
  '/models/:modelId/approve',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { modelId } = req.params;
      const { reviewNotes } = req.body;

      const result = await MarketplaceService.approveModel(
        modelId,
        req.user._id,
        reviewNotes
      );

      res.json(result);
    } catch (error) {
      console.error('Model approval error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/marketplace/models/:modelId/reject
 * @desc    Reject model
 * @access  Private (Admin only)
 */
router.post(
  '/models/:modelId/reject',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { modelId } = req.params;
      const { reason } = req.body;

      const result = await MarketplaceService.rejectModel(
        modelId,
        req.user._id,
        reason
      );

      res.json(result);
    } catch (error) {
      console.error('Model rejection error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/marketplace/models/search
 * @desc    Search and discover models
 * @access  Public
 */
router.get(
  '/models/search',
  searchLimiter,
  async (req, res) => {
    try {
      const query = req.query.q || '';
      const filters = {
        category: req.query.category,
        visibility: req.query.visibility,
        pricingType: req.query.pricingType,
        minRating: req.query.minRating,
        sortBy: req.query.sortBy || 'recent',
        limit: req.query.limit,
        skip: req.query.skip
      };

      const result = await MarketplaceService.searchModels(query, filters);
      res.json(result);
    } catch (error) {
      console.error('Model search error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/marketplace/models/featured
 * @desc    Get featured models
 * @access  Public
 */
router.get(
  '/models/featured',
  searchLimiter,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const result = await MarketplaceService.getFeaturedModels(limit);
      res.json(result);
    } catch (error) {
      console.error('Get featured models error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/marketplace/models/top-rated
 * @desc    Get top rated models
 * @access  Public
 */
router.get(
  '/models/top-rated',
  searchLimiter,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const result = await MarketplaceService.getTopRatedModels(limit);
      res.json(result);
    } catch (error) {
      console.error('Get top rated models error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/marketplace/models/most-downloaded
 * @desc    Get most downloaded models
 * @access  Public
 */
router.get(
  '/models/most-downloaded',
  searchLimiter,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const result = await MarketplaceService.getMostDownloadedModels(limit);
      res.json(result);
    } catch (error) {
      console.error('Get most downloaded models error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/marketplace/models/:modelId
 * @desc    Get model details
 * @access  Public
 */
router.get(
  '/models/:modelId',
  async (req, res) => {
    try {
      const { modelId } = req.params;
      const model = await MarketplaceModel.findOne({ modelId, status: 'approved' });

      if (!model) {
        return res.status(404).json({
          success: false,
          error: 'Model not found'
        });
      }

      // Increment view counter
      model.stats.views = (model.stats.views || 0) + 1;
      await model.save();

      res.json({
        success: true,
        model: model.toObject()
      });
    } catch (error) {
      console.error('Get model details error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/marketplace/models/:modelId/download
 * @desc    Download model
 * @access  Private
 */
router.post(
  '/models/:modelId/download',
  authenticate,
  downloadLimiter,
  async (req, res) => {
    try {
      const { modelId } = req.params;
      const result = await MarketplaceService.downloadModel(
        modelId,
        req.user._id,
        req.user.workspace
      );
      res.json(result);
    } catch (error) {
      console.error('Model download error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/marketplace/models/:modelId/install
 * @desc    Track model installation
 * @access  Private
 */
router.post(
  '/models/:modelId/install',
  authenticate,
  async (req, res) => {
    try {
      const { modelId } = req.params;
      const result = await MarketplaceService.installModel(
        modelId,
        req.user._id,
        req.user.workspace
      );
      res.json(result);
    } catch (error) {
      console.error('Model installation error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/marketplace/models/:modelId/rate
 * @desc    Rate a model
 * @access  Private
 */
router.post(
  '/models/:modelId/rate',
  authenticate,
  async (req, res) => {
    try {
      const { modelId } = req.params;
      const { rating, review } = req.body;

      const result = await MarketplaceService.rateModel(
        modelId,
        req.user._id,
        rating,
        review
      );

      res.json(result);
    } catch (error) {
      console.error('Model rating error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/marketplace/models/:modelId/stats
 * @desc    Get model statistics
 * @access  Public
 */
router.get(
  '/models/:modelId/stats',
  async (req, res) => {
    try {
      const { modelId } = req.params;
      const result = await MarketplaceService.getModelStats(modelId);
      res.json(result);
    } catch (error) {
      console.error('Get model stats error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/marketplace/my-models
 * @desc    Get current user's published models
 * @access  Private
 */
router.get(
  '/my-models',
  authenticate,
  async (req, res) => {
    try {
      const filters = {
        status: req.query.status // draft, pending-review, approved, rejected
      };

      const result = await MarketplaceService.getUserModels(req.user._id, filters);
      res.json(result);
    } catch (error) {
      console.error('Get user models error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/marketplace/categories
 * @desc    Get available categories
 * @access  Public
 */
router.get(
  '/categories',
  async (req, res) => {
    try {
      const categories = [
        { value: 'general-purpose', label: 'General Purpose' },
        { value: 'code-generation', label: 'Code Generation' },
        { value: 'chat', label: 'Chat' },
        { value: 'instruction-following', label: 'Instruction Following' },
        { value: 'summarization', label: 'Summarization' },
        { value: 'translation', label: 'Translation' },
        { value: 'question-answering', label: 'Question Answering' },
        { value: 'analysis', label: 'Analysis' },
        { value: 'creative-writing', label: 'Creative Writing' },
        { value: 'specialized', label: 'Specialized' }
      ];

      res.json({
        success: true,
        categories
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
