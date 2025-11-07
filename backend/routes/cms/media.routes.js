const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getMediaManagerService } = require('../../services/cms/MediaManagerService');
const { authenticate, authorize } = require('../../middleware/auth');

// Configurar multer para uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Permitir imágenes, videos, documentos
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
    }
  }
});

// Middleware de autenticación
router.use(authenticate);

/**
 * @route   GET /api/cms/media
 * @desc    Listar assets con filtros
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const mediaManagerService = getMediaManagerService();
    const result = await mediaManagerService.listAssets(req.query);
    res.json(result);
  } catch (error) {
    console.error('Error listing media assets:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing media assets',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/media/stats
 * @desc    Obtener estadísticas de almacenamiento
 * @access  Private (Admin/Manager)
 */
router.get('/stats', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const mediaManagerService = getMediaManagerService();
    const result = await mediaManagerService.getStorageStats();
    res.json(result);
  } catch (error) {
    console.error('Error getting storage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting storage stats',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/media/folders
 * @desc    Obtener lista de carpetas
 * @access  Private
 */
router.get('/folders', async (req, res) => {
  try {
    const mediaManagerService = getMediaManagerService();
    const result = await mediaManagerService.getFolders();
    res.json(result);
  } catch (error) {
    console.error('Error getting folders:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting folders',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/media/tags
 * @desc    Obtener lista de tags
 * @access  Private
 */
router.get('/tags', async (req, res) => {
  try {
    const mediaManagerService = getMediaManagerService();
    const result = await mediaManagerService.getTags();
    res.json(result);
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting tags',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/media/unused
 * @desc    Obtener assets sin usar
 * @access  Private (Admin/Manager)
 */
router.get('/unused', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const daysOld = parseInt(req.query.daysOld) || 30;
    const mediaManagerService = getMediaManagerService();
    const result = await mediaManagerService.getUnusedAssets(daysOld);
    res.json(result);
  } catch (error) {
    console.error('Error getting unused assets:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting unused assets',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/media/:id
 * @desc    Obtener asset por ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const mediaManagerService = getMediaManagerService();
    const result = await mediaManagerService.getAsset(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error getting media asset:', error);
    res.status(404).json({
      success: false,
      message: 'Media asset not found',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cms/media/upload
 * @desc    Subir archivo
 * @access  Private (Admin/Manager/Editor)
 */
router.post('/upload', authorize(['admin', 'manager', 'editor']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const options = {
      folder: req.body.folder || '/',
      category: req.body.category || 'other',
      tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
      alt: req.body.alt || '',
      title: req.body.title || '',
      description: req.body.description || ''
    };

    const mediaManagerService = getMediaManagerService();
    const result = await mediaManagerService.saveUpload(req.file, req.user.id, options);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cms/media/upload-multiple
 * @desc    Subir múltiples archivos
 * @access  Private (Admin/Manager/Editor)
 */
router.post('/upload-multiple', authorize(['admin', 'manager', 'editor']), upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const options = {
      folder: req.body.folder || '/',
      category: req.body.category || 'other',
      tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : []
    };

    const mediaManagerService = getMediaManagerService();
    const uploadedAssets = [];

    for (const file of req.files) {
      const result = await mediaManagerService.saveUpload(file, req.user.id, options);
      uploadedAssets.push(result.asset);
    }

    res.status(201).json({
      success: true,
      assets: uploadedAssets,
      count: uploadedAssets.length
    });
  } catch (error) {
    console.error('Error uploading multiple files:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading files',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/cms/media/:id
 * @desc    Actualizar metadata de asset
 * @access  Private (Admin/Manager/Editor)
 */
router.put('/:id', authorize(['admin', 'manager', 'editor']), async (req, res) => {
  try {
    const mediaManagerService = getMediaManagerService();
    const result = await mediaManagerService.updateAsset(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error updating media asset:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating media asset',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/cms/media/:id
 * @desc    Eliminar asset (soft delete)
 * @access  Private (Admin/Manager)
 */
router.delete('/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const mediaManagerService = getMediaManagerService();
    const result = await mediaManagerService.deleteAsset(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting media asset:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting media asset',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/cms/media/:id/permanent
 * @desc    Eliminar asset permanentemente
 * @access  Private (Admin only)
 */
router.delete('/:id/permanent', authorize(['admin']), async (req, res) => {
  try {
    const mediaManagerService = getMediaManagerService();
    const result = await mediaManagerService.permanentlyDeleteAsset(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error permanently deleting media asset:', error);
    res.status(500).json({
      success: false,
      message: 'Error permanently deleting media asset',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cms/media/search
 * @desc    Buscar assets
 * @access  Private
 */
router.post('/search', async (req, res) => {
  try {
    const { searchTerm } = req.body;
    
    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const mediaManagerService = getMediaManagerService();
    const result = await mediaManagerService.searchAssets(searchTerm, req.query);
    res.json(result);
  } catch (error) {
    console.error('Error searching media assets:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching media assets',
      error: error.message
    });
  }
});

module.exports = router;
