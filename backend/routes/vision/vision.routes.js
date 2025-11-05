const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const VisionService = require('../../services/vision/VisionService');
const { authenticateToken } = require('../../middleware/auth');
const logger = require('../../config/logger');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/images');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (req, file, cb) => {
    const allowedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported format: ${ext}`));
    }
  },
});

/**
 * Vision API Routes
 * Document analysis and OCR with GPT-4 Vision
 */

// Analyze image with custom prompt
router.post('/analyze', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }
    
    const { prompt, detail, maxTokens } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }
    
    const result = await VisionService.analyzeImage(req.file.path, prompt, { detail, maxTokens });
    
    await fs.unlink(req.file.path);
    
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Error in analyze endpoint:', error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// Extract text (OCR)
router.post('/ocr', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }
    
    const { language, preserveFormatting } = req.body;
    
    const result = await VisionService.extractTextFromDocument(req.file.path, {
      language,
      preserveFormatting: preserveFormatting !== 'false',
    });
    
    await fs.unlink(req.file.path);
    
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Error in OCR endpoint:', error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process invoice/receipt
router.post('/invoice', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }
    
    const result = await VisionService.processInvoice(req.file.path);
    
    await fs.unlink(req.file.path);
    
    res.json(result);
  } catch (error) {
    logger.error('Error processing invoice:', error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// Parse business card
router.post('/business-card', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }
    
    const result = await VisionService.parseBusinessCard(req.file.path);
    
    await fs.unlink(req.file.path);
    
    res.json(result);
  } catch (error) {
    logger.error('Error parsing business card:', error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyze chart
router.post('/chart', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }
    
    const { chartType } = req.body;
    
    const result = await VisionService.analyzeChart(req.file.path, chartType);
    
    await fs.unlink(req.file.path);
    
    res.json(result);
  } catch (error) {
    logger.error('Error analyzing chart:', error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// Detect signatures
router.post('/signatures', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }
    
    const result = await VisionService.detectSignatures(req.file.path);
    
    await fs.unlink(req.file.path);
    
    res.json(result);
  } catch (error) {
    logger.error('Error detecting signatures:', error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyze form structure
router.post('/form', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }
    
    const result = await VisionService.analyzeFormStructure(req.file.path);
    
    await fs.unlink(req.file.path);
    
    res.json(result);
  } catch (error) {
    logger.error('Error analyzing form:', error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// Compare images
router.post('/compare', authenticateToken, upload.array('images', 2), async (req, res) => {
  try {
    if (!req.files || req.files.length !== 2) {
      return res.status(400).json({ success: false, error: 'Two images required' });
    }
    
    const { comparisonType } = req.body;
    
    const result = await VisionService.compareImages(
      req.files[0].path,
      req.files[1].path,
      comparisonType
    );
    
    await Promise.all(req.files.map(file => fs.unlink(file.path)));
    
    res.json(result);
  } catch (error) {
    logger.error('Error comparing images:', error);
    if (req.files) {
      await Promise.all(req.files.map(file => fs.unlink(file.path).catch(() => {})));
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Assess quality
router.post('/quality', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }
    
    const result = await VisionService.assessQuality(req.file.path);
    
    await fs.unlink(req.file.path);
    
    res.json(result);
  } catch (error) {
    logger.error('Error assessing quality:', error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// Describe image
router.post('/describe', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }
    
    const { detail, style } = req.body;
    
    const result = await VisionService.describeImage(req.file.path, { detail, style });
    
    await fs.unlink(req.file.path);
    
    res.json(result);
  } catch (error) {
    logger.error('Error describing image:', error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = VisionService.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Error getting vision stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
