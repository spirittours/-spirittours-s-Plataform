const express = require('express');
const router = express.Router();
const { getContentTemplateService } = require('../../services/cms/ContentTemplateService');
const { authenticate, authorize } = require('../../middleware/auth');

// Middleware de autenticación
router.use(authenticate);

/**
 * @route   GET /api/cms/templates
 * @desc    Listar templates con filtros
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const templateService = getContentTemplateService();
    const result = await templateService.listTemplates(req.query);
    res.json(result);
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing templates',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/templates/category/:category
 * @desc    Obtener templates por categoría
 * @access  Private
 */
router.get('/category/:category', async (req, res) => {
  try {
    const templateService = getContentTemplateService();
    const result = await templateService.getTemplatesByCategory(req.params.category, req.query);
    res.json(result);
  } catch (error) {
    console.error('Error getting templates by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting templates by category',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/templates/popular
 * @desc    Obtener templates populares
 * @access  Private
 */
router.get('/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const templateService = getContentTemplateService();
    const result = await templateService.getPopularTemplates(limit);
    res.json(result);
  } catch (error) {
    console.error('Error getting popular templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting popular templates',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/templates/featured
 * @desc    Obtener templates destacados
 * @access  Private
 */
router.get('/featured', async (req, res) => {
  try {
    const templateService = getContentTemplateService();
    const result = await templateService.getFeaturedTemplates();
    res.json(result);
  } catch (error) {
    console.error('Error getting featured templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting featured templates',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/templates/:id
 * @desc    Obtener template por ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const templateService = getContentTemplateService();
    const result = await templateService.getTemplate(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(404).json({
      success: false,
      message: 'Template not found',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cms/templates
 * @desc    Crear template
 * @access  Private (Admin/Manager)
 */
router.post('/', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const templateService = getContentTemplateService();
    const result = await templateService.createTemplate(req.body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating template',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/cms/templates/:id
 * @desc    Actualizar template
 * @access  Private (Admin/Manager)
 */
router.put('/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const templateService = getContentTemplateService();
    const result = await templateService.updateTemplate(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating template',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/cms/templates/:id
 * @desc    Eliminar template
 * @access  Private (Admin)
 */
router.delete('/:id', authorize(['admin']), async (req, res) => {
  try {
    const templateService = getContentTemplateService();
    const result = await templateService.deleteTemplate(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting template',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cms/templates/:id/apply
 * @desc    Aplicar template con variables
 * @access  Private
 */
router.post('/:id/apply', async (req, res) => {
  try {
    const { variables } = req.body;
    
    const templateService = getContentTemplateService();
    const result = await templateService.applyTemplate(req.params.id, variables);
    res.json(result);
  } catch (error) {
    console.error('Error applying template:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying template',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cms/templates/:id/rate
 * @desc    Calificar template
 * @access  Private
 */
router.post('/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body;
    
    if (!rating || rating < 0 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 0 and 5'
      });
    }

    const templateService = getContentTemplateService();
    const result = await templateService.rateTemplate(req.params.id, rating);
    res.json(result);
  } catch (error) {
    console.error('Error rating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error rating template',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/cms/templates/search
 * @desc    Buscar templates
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

    const templateService = getContentTemplateService();
    const result = await templateService.searchTemplates(searchTerm, req.query);
    res.json(result);
  } catch (error) {
    console.error('Error searching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching templates',
      error: error.message
    });
  }
});

module.exports = router;
