const express = require('express');
const router = express.Router();
const { getSEOManagerService } = require('../../services/cms/SEOManagerService');
const { authenticate, authorize } = require('../../middleware/auth');

// Middleware de autenticación
router.use(authenticate);

/**
 * @route   GET /api/cms/seo/sitemap
 * @desc    Generar sitemap XML
 * @access  Private (Admin/Manager)
 */
router.get('/sitemap', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const baseUrl = req.query.baseUrl || 'https://spirittours.com';
    const seoManagerService = getSEOManagerService();
    const result = await seoManagerService.generateSitemap(baseUrl);
    
    res.setHeader('Content-Type', 'application/xml');
    res.send(result.sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating sitemap',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/seo/robots-txt
 * @desc    Generar robots.txt
 * @access  Private (Admin)
 */
router.get('/robots-txt', authorize(['admin']), async (req, res) => {
  try {
    const seoManagerService = getSEOManagerService();
    const result = seoManagerService.generateRobotsTxt(req.query);
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(result.robotsTxt);
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating robots.txt',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/seo/analyze/:pageId
 * @desc    Analizar SEO de una página
 * @access  Private
 */
router.get('/analyze/:pageId', async (req, res) => {
  try {
    const seoManagerService = getSEOManagerService();
    const result = await seoManagerService.analyzeSEO(req.params.pageId);
    res.json(result);
  } catch (error) {
    console.error('Error analyzing SEO:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing SEO',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/seo/suggestions/:pageId
 * @desc    Obtener sugerencias de mejora de SEO
 * @access  Private
 */
router.get('/suggestions/:pageId', async (req, res) => {
  try {
    const seoManagerService = getSEOManagerService();
    const result = await seoManagerService.suggestImprovements(req.params.pageId);
    res.json(result);
  } catch (error) {
    console.error('Error getting SEO suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting SEO suggestions',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/cms/seo/issues
 * @desc    Obtener páginas con problemas de SEO
 * @access  Private (Admin/Manager)
 */
router.get('/issues', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const seoManagerService = getSEOManagerService();
    const result = await seoManagerService.getPagesWithSEOIssues();
    res.json(result);
  } catch (error) {
    console.error('Error getting pages with SEO issues:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting pages with SEO issues',
      error: error.message
    });
  }
});

module.exports = router;
