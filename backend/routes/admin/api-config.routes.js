const express = require('express');
const router = express.Router();
const { getAPIConfigService } = require('../../services/admin/APIConfigService');
const { getHealthCheckService } = require('../../services/admin/HealthCheckService');
const { authenticate, authorize } = require('../../middleware/auth');

// Todas las rutas requieren admin
router.use(authenticate);
router.use(authorize(['admin']));

/**
 * @route   GET /api/admin/api-config
 * @desc    Obtener todas las configuraciones de APIs
 * @access  Private (Admin only)
 */
router.get('/', async (req, res) => {
  try {
    const apiConfigService = getAPIConfigService();
    const result = await apiConfigService.getAllConfigs(req.query);
    res.json(result);
  } catch (error) {
    console.error('Error getting API configs:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting API configs',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/api-config/stats
 * @desc    Obtener estadísticas de configuraciones
 * @access  Private (Admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    const apiConfigService = getAPIConfigService();
    const result = await apiConfigService.getStats();
    res.json(result);
  } catch (error) {
    console.error('Error getting API config stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting API config stats',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/api-config/enabled
 * @desc    Obtener servicios habilitados
 * @access  Private (Admin only)
 */
router.get('/enabled', async (req, res) => {
  try {
    const apiConfigService = getAPIConfigService();
    const result = await apiConfigService.getEnabledServices();
    res.json(result);
  } catch (error) {
    console.error('Error getting enabled services:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting enabled services',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/api-config/issues
 * @desc    Obtener servicios con problemas
 * @access  Private (Admin only)
 */
router.get('/issues', async (req, res) => {
  try {
    const apiConfigService = getAPIConfigService();
    const result = await apiConfigService.getServicesWithIssues();
    res.json(result);
  } catch (error) {
    console.error('Error getting services with issues:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting services with issues',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/api-config/:service
 * @desc    Obtener configuración de un servicio
 * @access  Private (Admin only)
 */
router.get('/:service', async (req, res) => {
  try {
    const apiConfigService = getAPIConfigService();
    const result = await apiConfigService.getConfig(req.params.service);
    res.json(result);
  } catch (error) {
    console.error('Error getting API config:', error);
    res.status(404).json({
      success: false,
      message: 'Service configuration not found',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/api-config/:service
 * @desc    Crear o actualizar configuración de servicio
 * @access  Private (Admin only)
 */
router.put('/:service', async (req, res) => {
  try {
    const apiConfigService = getAPIConfigService();
    const result = await apiConfigService.upsertConfig(
      req.params.service,
      req.body,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    console.error('Error upserting API config:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating API configuration',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/api-config/:service/enable
 * @desc    Habilitar servicio
 * @access  Private (Admin only)
 */
router.post('/:service/enable', async (req, res) => {
  try {
    const apiConfigService = getAPIConfigService();
    const result = await apiConfigService.enableService(req.params.service, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error enabling service:', error);
    res.status(500).json({
      success: false,
      message: 'Error enabling service',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/api-config/:service/disable
 * @desc    Deshabilitar servicio
 * @access  Private (Admin only)
 */
router.post('/:service/disable', async (req, res) => {
  try {
    const apiConfigService = getAPIConfigService();
    const result = await apiConfigService.disableService(req.params.service, req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Error disabling service:', error);
    res.status(500).json({
      success: false,
      message: 'Error disabling service',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/api-config/:service/health-check
 * @desc    Ejecutar health check de un servicio
 * @access  Private (Admin only)
 */
router.post('/:service/health-check', async (req, res) => {
  try {
    const healthCheckService = getHealthCheckService();
    const result = await healthCheckService.checkServiceHealth(req.params.service);
    res.json(result);
  } catch (error) {
    console.error('Error checking service health:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking service health',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/api-config/health-check/all
 * @desc    Ejecutar health check de todos los servicios
 * @access  Private (Admin only)
 */
router.post('/health-check/all', async (req, res) => {
  try {
    const healthCheckService = getHealthCheckService();
    const result = await healthCheckService.checkAllServices();
    res.json(result);
  } catch (error) {
    console.error('Error checking all services:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking all services',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/api-config/health-check/summary
 * @desc    Obtener resumen de salud de servicios
 * @access  Private (Admin only)
 */
router.get('/health-check/summary', async (req, res) => {
  try {
    const healthCheckService = getHealthCheckService();
    const result = await healthCheckService.getHealthSummary();
    res.json(result);
  } catch (error) {
    console.error('Error getting health summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting health summary',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/admin/api-config/:service
 * @desc    Eliminar configuración
 * @access  Private (Admin only)
 */
router.delete('/:service', async (req, res) => {
  try {
    const apiConfigService = getAPIConfigService();
    const result = await apiConfigService.deleteConfig(req.params.service);
    res.json(result);
  } catch (error) {
    console.error('Error deleting API config:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting API configuration',
      error: error.message
    });
  }
});

module.exports = router;
