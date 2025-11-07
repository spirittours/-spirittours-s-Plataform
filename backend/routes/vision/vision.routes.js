/**
 * Vision API Routes - GPT-4V Image Analysis
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { getVisionService } = require('../../services/vision/VisionService');
const VisionAnalysis = require('../../models/VisionAnalysis');
const { authenticate } = require('../../middleware/auth');

const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../../uploads/images');
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `img-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Invalid format'));
  }
});

router.use(authenticate);

// POST /api/vision/analyze - General image analysis
router.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No image provided' });

    const { prompt, entityType = 'general', entityId, detailLevel, tags } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Prompt required' });

    const visionService = getVisionService();
    const result = await visionService.analyzeImage(req.file.path, prompt, { detailLevel });

    const analysis = await VisionAnalysis.createAnalysis({
      entityType, entityId,
      imageFile: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size
      },
      type: result.type,
      content: result.content,
      confidence: result.confidence,
      model: result.metadata.model,
      detailLevel: result.metadata.detailLevel,
      tokens: result.tokens,
      processingTime: result.processingTime,
      workspace: req.user.workspace,
      createdBy: req.user._id,
      tags: tags ? tags.split(',') : []
    });

    res.json({ success: true, analysis: { id: analysis._id, content: analysis.analysis.content, confidence: analysis.analysis.confidence } });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/vision/document - OCR and document extraction
router.post('/document', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No image provided' });

    const visionService = getVisionService();
    const result = await visionService.analyzeDocument(req.file.path, { detailLevel: req.body.detailLevel });

    const analysis = await VisionAnalysis.createAnalysis({
      entityType: req.body.entityType || 'document',
      entityId: req.body.entityId,
      imageFile: { filename: req.file.filename, originalName: req.file.originalname, path: req.file.path, mimeType: req.file.mimetype, size: req.file.size },
      type: 'document',
      content: result.content,
      confidence: result.confidence,
      model: result.metadata.model,
      detailLevel: result.metadata.detailLevel,
      tokens: result.tokens,
      processingTime: result.processingTime,
      workspace: req.user.workspace,
      createdBy: req.user._id
    });

    res.json({ success: true, document: { id: analysis._id, text: analysis.analysis.content } });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/vision/receipt - Parse receipt
router.post('/receipt', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No image provided' });

    const visionService = getVisionService();
    const result = await visionService.parseReceipt(req.file.path);

    const analysis = await VisionAnalysis.createAnalysis({
      entityType: req.body.entityType || 'document',
      imageFile: { filename: req.file.filename, originalName: req.file.originalname, path: req.file.path, mimeType: req.file.mimetype, size: req.file.size },
      type: 'receipt',
      content: result.content,
      structured: result.structured,
      confidence: result.confidence,
      model: result.metadata.model,
      tokens: result.tokens,
      processingTime: result.processingTime,
      workspace: req.user.workspace,
      createdBy: req.user._id
    });

    res.json({ success: true, receipt: { id: analysis._id, structured: analysis.analysis.structured, raw: analysis.analysis.content } });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/vision/invoice - Parse invoice
router.post('/invoice', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No image provided' });

    const visionService = getVisionService();
    const result = await visionService.parseInvoice(req.file.path);

    const analysis = await VisionAnalysis.createAnalysis({
      entityType: req.body.entityType || 'document',
      imageFile: { filename: req.file.filename, path: req.file.path, size: req.file.size },
      type: 'invoice',
      content: result.content,
      structured: result.structured,
      confidence: result.confidence,
      tokens: result.tokens,
      processingTime: result.processingTime,
      workspace: req.user.workspace,
      createdBy: req.user._id
    });

    res.json({ success: true, invoice: { id: analysis._id, structured: analysis.analysis.structured } });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/vision/business-card - Extract business card
router.post('/business-card', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No image provided' });

    const visionService = getVisionService();
    const result = await visionService.extractBusinessCard(req.file.path);

    const analysis = await VisionAnalysis.createAnalysis({
      entityType: 'contact',
      imageFile: { filename: req.file.filename, path: req.file.path, size: req.file.size },
      type: 'businessCard',
      content: result.content,
      structured: result.structured,
      confidence: result.confidence,
      tokens: result.tokens,
      processingTime: result.processingTime,
      workspace: req.user.workspace,
      createdBy: req.user._id
    });

    res.json({ success: true, businessCard: { id: analysis._id, contact: analysis.analysis.structured } });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/vision/analyses - List analyses
router.get('/analyses', async (req, res) => {
  try {
    const { query, type, entityType, page = 1, limit = 20 } = req.query;
    const result = await VisionAnalysis.searchAnalyses(req.user.workspace, query, {
      type, entityType,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/vision/analyses/:id - Get analysis by ID
router.get('/analyses/:id', async (req, res) => {
  try {
    const analysis = await VisionAnalysis.findOne({ _id: req.params.id, workspace: req.user.workspace });
    if (!analysis) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/vision/analyses/:id
router.delete('/analyses/:id', async (req, res) => {
  try {
    const analysis = await VisionAnalysis.findOne({ _id: req.params.id, workspace: req.user.workspace });
    if (!analysis) return res.status(404).json({ success: false, error: 'Not found' });
    if (analysis.imageFile.path) await fs.unlink(analysis.imageFile.path).catch(() => {});
    await analysis.deleteOne();
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
