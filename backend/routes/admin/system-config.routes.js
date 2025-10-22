/**
 * Spirit Tours - System Configuration Routes
 * 
 * Admin API for managing ALL system configurations
 * - Database settings
 * - Email configuration
 * - Payment gateways
 * - Authentication & OAuth
 * - Storage (AWS S3)
 * - Monitoring & logging
 * - Security settings
 * - Integrations
 * - Feature flags
 */

const express = require('express');
const router = express.Router();
const { configManager, CONFIG_CATEGORIES } = require('../../services/config_manager');
const logger = require('../../utils/logger');

// Middleware for authentication and authorization
const requireAdmin = (req, res, next) => {
  // TODO: Implement proper authentication middleware
  // For now, allow all requests
  // In production: check JWT token and user role
  next();
};

const requireSuperAdmin = (req, res, next) => {
  // TODO: Implement superadmin check
  // Only superadmins can access sensitive configurations
  next();
};

/**
 * GET /api/admin/system-config/categories
 * Get all configuration categories with metadata
 */
router.get('/categories', requireAdmin, async (req, res) => {
  try {
    const categories = configManager.getAllCategories();
    
    res.json({
      success: true,
      categories,
      stats: configManager.getStats()
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching configuration categories',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/system-config/categories/:category
 * Get all configurations for a specific category
 */
router.get('/categories/:category', requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const { includeValues } = req.query;
    
    const categoryData = configManager.getCategory(
      category, 
      includeValues === 'true'
    );
    
    res.json({
      success: true,
      category: categoryData
    });
  } catch (error) {
    logger.error(`Error fetching category ${req.params.category}:`, error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/admin/system-config/:key
 * Get a specific configuration value
 */
router.get('/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const value = configManager.get(key);
    
    const fieldInfo = configManager.getFieldInfo(key);
    
    res.json({
      success: true,
      key,
      value: fieldInfo && fieldInfo.encrypted ? '***ENCRYPTED***' : value,
      fieldInfo,
      hasValue: !!value
    });
  } catch (error) {
    logger.error(`Error fetching config ${req.params.key}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/admin/system-config/:key
 * Update a single configuration value
 */
router.put('/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const updatedBy = req.user?.email || req.user?.username || 'admin';
    
    await configManager.set(key, value, { updatedBy });
    
    res.json({
      success: true,
      message: `Configuration '${key}' updated successfully`,
      key,
      updatedBy
    });
  } catch (error) {
    logger.error(`Error updating config ${req.params.key}:`, error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/admin/system-config/batch
 * Update multiple configurations at once
 */
router.put('/batch', requireAdmin, async (req, res) => {
  try {
    const { configs } = req.body;
    const updatedBy = req.user?.email || req.user?.username || 'admin';
    
    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. Expected { configs: {...} }'
      });
    }
    
    const results = await configManager.setMany(configs, updatedBy);
    
    res.json({
      success: true,
      message: `Updated ${results.success.length} configurations`,
      results,
      updatedBy
    });
  } catch (error) {
    logger.error('Error batch updating configs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/admin/system-config/test/:category
 * Test configuration for a specific category
 */
router.post('/test/:category', requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const configs = req.body;
    
    const testResult = await configManager.testConfiguration(category, configs);
    
    res.json({
      success: testResult.success,
      category,
      ...testResult
    });
  } catch (error) {
    logger.error(`Error testing ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.stack
    });
  }
});

/**
 * POST /api/admin/system-config/test-connection
 * Test a specific configuration connection without saving
 */
router.post('/test-connection', requireAdmin, async (req, res) => {
  try {
    const { category, configs } = req.body;
    
    if (!category || !configs) {
      return res.status(400).json({
        success: false,
        message: 'Category and configs are required'
      });
    }
    
    const testResult = await configManager.testConfiguration(category, configs);
    
    res.json({
      success: testResult.success,
      category,
      timestamp: new Date().toISOString(),
      ...testResult
    });
  } catch (error) {
    logger.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/admin/system-config/rollback/:key
 * Rollback a configuration to its previous value
 */
router.post('/rollback/:key', requireSuperAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    
    await configManager.rollback(key);
    
    const newValue = configManager.get(key);
    
    res.json({
      success: true,
      message: `Configuration '${key}' rolled back successfully`,
      key,
      newValue: newValue ? '***' : null
    });
  } catch (error) {
    logger.error(`Error rolling back ${req.params.key}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/admin/system-config/export
 * Export all configurations (for backup)
 */
router.get('/export', requireSuperAdmin, async (req, res) => {
  try {
    const includeEncrypted = req.query.includeEncrypted === 'true';
    
    // Only superadmins can export encrypted values
    if (includeEncrypted && !req.user?.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only superadmins can export encrypted values'
      });
    }
    
    const exportData = configManager.export(includeEncrypted);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="system-config-${Date.now()}.json"`);
    
    res.json(exportData);
  } catch (error) {
    logger.error('Error exporting configurations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/admin/system-config/import
 * Import configurations from backup
 */
router.post('/import', requireSuperAdmin, async (req, res) => {
  try {
    const importData = req.body;
    const updatedBy = req.user?.email || req.user?.username || 'import';
    
    const results = await configManager.import(importData, updatedBy);
    
    res.json({
      success: true,
      message: `Imported ${results.success.length} configurations`,
      results,
      importedBy: updatedBy
    });
  } catch (error) {
    logger.error('Error importing configurations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/admin/system-config/history/:key
 * Get change history for a specific configuration
 */
router.get('/history/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    
    // Get history from configManager
    const history = configManager.configHistory.filter(h => h.key === key);
    
    res.json({
      success: true,
      key,
      history: history.map(h => ({
        timestamp: h.timestamp,
        updatedBy: h.updatedBy,
        encrypted: h.encrypted
        // Don't include actual value for security
      }))
    });
  } catch (error) {
    logger.error(`Error fetching history for ${req.params.key}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/admin/system-config/stats
 * Get configuration statistics
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = configManager.getStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/admin/system-config/validate
 * Validate all required configurations
 */
router.get('/validate', requireAdmin, async (req, res) => {
  try {
    const categories = CONFIG_CATEGORIES;
    const missingRequired = [];
    
    for (const [categoryKey, category] of Object.entries(categories)) {
      for (const field of category.fields) {
        if (field.required) {
          const value = configManager.get(field.key);
          if (!value) {
            missingRequired.push({
              category: categoryKey,
              field: field.key,
              label: field.label
            });
          }
        }
      }
    }
    
    res.json({
      success: true,
      isValid: missingRequired.length === 0,
      missingRequired,
      totalRequired: missingRequired.length
    });
  } catch (error) {
    logger.error('Error validating configurations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/admin/system-config/bulk-test
 * Test multiple category configurations at once
 */
router.post('/bulk-test', requireAdmin, async (req, res) => {
  try {
    const { tests } = req.body; // Array of { category, configs }
    
    if (!Array.isArray(tests)) {
      return res.status(400).json({
        success: false,
        message: 'Expected array of tests'
      });
    }
    
    const results = [];
    
    for (const test of tests) {
      try {
        const result = await configManager.testConfiguration(test.category, test.configs);
        results.push({
          category: test.category,
          ...result
        });
      } catch (error) {
        results.push({
          category: test.category,
          success: false,
          message: error.message
        });
      }
    }
    
    res.json({
      success: true,
      results,
      totalTests: tests.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error) {
    logger.error('Error running bulk tests:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/admin/system-config/field-info/:key
 * Get metadata about a specific configuration field
 */
router.get('/field-info/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const fieldInfo = configManager.getFieldInfo(key);
    
    if (!fieldInfo) {
      return res.status(404).json({
        success: false,
        message: `Configuration field '${key}' not found`
      });
    }
    
    res.json({
      success: true,
      fieldInfo
    });
  } catch (error) {
    logger.error(`Error fetching field info for ${req.params.key}:`, error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
