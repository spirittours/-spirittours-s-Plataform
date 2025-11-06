const express = require('express');
const router = express.Router();
const { getPageBuilderService } = require('../../services/cms/PageBuilderService');
const { authenticate, authorize } = require('../../middleware/auth');

// Middleware de autenticación para todas las rutas
router.use(authenticate);

/**
 * @route   GET /api/cms/pages
 * @desc    Listar todas las páginas con filtros
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const pageBuilderService = getPageBuilderService();
    const result = await pageBuilderService.listPages(req.query);
    res.json(result);
  } catch (error) {
    console.error('Error listing pages:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing pages',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/pages/stats
 * @desc    Obtener estadísticas de páginas
 * @access  Private (Admin/Manager)
 */
router.get('/stats', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const pageBuilderService = getPageBuilderService();
    const result = await pageBuilderService.getStats();
    res.json(result);
  } catch (error) {
    console.error('Error getting page stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting page stats',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/pages/:id
 * @desc    Obtener página por ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const pageBuilderService = getPageBuilderService();
    const result = await pageBuilderService.getPage(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error getting page:', error);
    res.status(404).json({
      success: false,
      message: 'Page not found',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/pages/slug/:slug
 * @desc    Obtener página por slug (publicada)
 * @access  Public (sin auth middleware aquí)
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const pageBuilderService = getPageBuilderService();
    const language = req.query.language || 'es';
    const result = await pageBuilderService.getPageBySlug(req.params.slug, language);
    res.json(result);
  } catch (error) {
    console.error('Error getting page by slug:', error);
    res.status(404).json({
      success: false,
      message: 'Page not found',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cms/pages
 * @desc    Crear nueva página
 * @access  Private (Admin/Manager/Editor)
 */
router.post('/', authorize(['admin', 'manager', 'editor']), async (req, res) => {
  try {
    const pageBuilderService = getPageBuilderService();
    const result = await pageBuilderService.createPage(req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating page:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating page',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/cms/pages/:id
 * @desc    Actualizar página
 * @access  Private (Admin/Manager/Editor)
 */
router.put('/:id', authorize(['admin', 'manager', 'editor']), async (req, res) => {
  try {
    const pageBuilderService = getPageBuilderService();
    const result = await pageBuilderService.updatePage(req.params.id, req.body, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating page',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cms/pages/:id/publish
 * @desc    Publicar página
 * @access  Private (Admin/Manager)
 */
router.post('/:id/publish', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const pageBuilderService = getPageBuilderService();
    const result = await pageBuilderService.publishPage(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error publishing page:', error);
    res.status(500).json({
      success: false,
      message: 'Error publishing page',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cms/pages/:id/unpublish
 * @desc    Despublicar página
 * @access  Private (Admin/Manager)
 */
router.post('/:id/unpublish', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const pageBuilderService = getPageBuilderService();
    const result = await pageBuilderService.unpublishPage(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error unpublishing page:', error);
    res.status(500).json({
      success: false,
      message: 'Error unpublishing page',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cms/pages/:id/duplicate
 * @desc    Duplicar página
 * @access  Private (Admin/Manager/Editor)
 */
router.post('/:id/duplicate', authorize(['admin', 'manager', 'editor']), async (req, res) => {
  try {
    const { newSlug } = req.body;
    
    if (!newSlug) {
      return res.status(400).json({
        success: false,
        message: 'New slug is required'
      });
    }

    const pageBuilderService = getPageBuilderService();
    const result = await pageBuilderService.duplicatePage(req.params.id, newSlug, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error duplicating page:', error);
    res.status(500).json({
      success: false,
      message: 'Error duplicating page',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/cms/pages/:id
 * @desc    Eliminar página
 * @access  Private (Admin)
 */
router.delete('/:id', authorize(['admin']), async (req, res) => {
  try {
    const pageBuilderService = getPageBuilderService();
    const result = await pageBuilderService.deletePage(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting page',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/pages/:id/versions
 * @desc    Obtener historial de versiones
 * @access  Private
 */
router.get('/:id/versions', async (req, res) => {
  try {
    const pageBuilderService = getPageBuilderService();
    const result = await pageBuilderService.getVersionHistory(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error getting version history:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting version history',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cms/pages/:id/restore-version
 * @desc    Restaurar versión anterior
 * @access  Private (Admin/Manager)
 */
router.post('/:id/restore-version', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { versionNumber } = req.body;
    
    if (!versionNumber) {
      return res.status(400).json({
        success: false,
        message: 'Version number is required'
      });
    }

    const pageBuilderService = getPageBuilderService();
    const result = await pageBuilderService.restoreVersion(req.params.id, versionNumber, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error restoring version:', error);
    res.status(500).json({
      success: false,
      message: 'Error restoring version',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cms/pages/validate-slug
 * @desc    Validar que un slug esté disponible
 * @access  Private
 */
router.post('/validate-slug', async (req, res) => {
  try {
    const { slug, excludePageId } = req.body;
    
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Slug is required'
      });
    }

    const pageBuilderService = getPageBuilderService();
    const result = await pageBuilderService.validateSlug(slug, excludePageId);
    res.json(result);
  } catch (error) {
    console.error('Error validating slug:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating slug',
      error: error.message
    });
  }
});

module.exports = router;
