const express = require('express');
const router = express.Router();
const { getCatalogBuilderService } = require('../../services/catalog/CatalogBuilderService');
const { getCatalogExportService } = require('../../services/catalog/CatalogExportService');
const { authenticate, authorize } = require('../../middleware/auth');

// Middleware de autenticación
router.use(authenticate);

/**
 * @route   GET /api/catalogs
 * @desc    Listar catálogos accesibles
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const catalogBuilderService = getCatalogBuilderService();
    const options = {
      ...req.query,
      userId: req.user.id,
      agencyId: req.user.agencyId
    };
    const result = await catalogBuilderService.listCatalogs(options);
    res.json(result);
  } catch (error) {
    console.error('Error listing catalogs:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing catalogs',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/catalogs/stats
 * @desc    Obtener estadísticas de catálogos
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const catalogBuilderService = getCatalogBuilderService();
    const result = await catalogBuilderService.getStats(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error getting catalog stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting catalog stats',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/catalogs/accessible
 * @desc    Obtener catálogos accesibles para el usuario
 * @access  Private
 */
router.get('/accessible', async (req, res) => {
  try {
    const catalogBuilderService = getCatalogBuilderService();
    const result = await catalogBuilderService.getAccessibleCatalogs(
      req.user.id,
      req.user.agencyId,
      req.query
    );
    res.json(result);
  } catch (error) {
    console.error('Error getting accessible catalogs:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting accessible catalogs',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/catalogs/:id
 * @desc    Obtener catálogo por ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const catalogBuilderService = getCatalogBuilderService();
    const result = await catalogBuilderService.getCatalog(
      req.params.id,
      req.user.id,
      req.user.agencyId
    );
    res.json(result);
  } catch (error) {
    console.error('Error getting catalog:', error);
    res.status(404).json({
      success: false,
      message: 'Catalog not found or access denied',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/catalogs
 * @desc    Crear catálogo
 * @access  Private (Admin/Manager)
 */
router.post('/', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const catalogBuilderService = getCatalogBuilderService();
    const result = await catalogBuilderService.createCatalog(req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating catalog:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating catalog',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/catalogs/:id
 * @desc    Actualizar catálogo
 * @access  Private (Admin/Manager)
 */
router.put('/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const catalogBuilderService = getCatalogBuilderService();
    const result = await catalogBuilderService.updateCatalog(
      req.params.id,
      req.body,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    console.error('Error updating catalog:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating catalog',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/catalogs/:id
 * @desc    Eliminar catálogo
 * @access  Private (Admin)
 */
router.delete('/:id', authorize(['admin']), async (req, res) => {
  try {
    const catalogBuilderService = getCatalogBuilderService();
    const result = await catalogBuilderService.deleteCatalog(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting catalog:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting catalog',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/catalogs/:id/duplicate
 * @desc    Duplicar catálogo
 * @access  Private (Admin/Manager)
 */
router.post('/:id/duplicate', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const catalogBuilderService = getCatalogBuilderService();
    const result = await catalogBuilderService.duplicateCatalog(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error duplicating catalog:', error);
    res.status(500).json({
      success: false,
      message: 'Error duplicating catalog',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/catalogs/:id/generate
 * @desc    Generar archivos del catálogo (PDF, Word, Flipbook)
 * @access  Private (Admin/Manager)
 */
router.post('/:id/generate', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const catalogExportService = getCatalogExportService();
    
    // Generar en background (no bloqueante)
    catalogExportService.generateCatalog(req.params.id).catch(err => {
      console.error('Background generation error:', err);
    });
    
    res.json({
      success: true,
      message: 'Catalog generation started',
      catalogId: req.params.id
    });
  } catch (error) {
    console.error('Error starting catalog generation:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting catalog generation',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/catalogs/:id/view
 * @desc    Registrar vista del catálogo
 * @access  Private
 */
router.post('/:id/view', async (req, res) => {
  try {
    const catalogBuilderService = getCatalogBuilderService();
    const { isUnique } = req.body;
    const result = await catalogBuilderService.incrementViews(req.params.id, isUnique);
    res.json(result);
  } catch (error) {
    console.error('Error registering view:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering view',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/catalogs/:id/download
 * @desc    Registrar descarga del catálogo
 * @access  Private
 */
router.post('/:id/download', async (req, res) => {
  try {
    const catalogBuilderService = getCatalogBuilderService();
    const result = await catalogBuilderService.registerDownload(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error registering download:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.message
    });
  }
});

module.exports = router;
