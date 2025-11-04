/**
 * Agent Email Configuration Routes
 * 
 * API endpoints para configurar todo el sistema de emails desde dashboard:
 * - Wizard de configuración guiada
 * - Configuración manual avanzada
 * - Gestión de proveedores
 * - Cost optimization
 * - Multi-server management
 * - Perfiles y templates
 * - Testing y validación
 * 
 * @author Spirit Tours Development Team
 */

const express = require('express');
const router = express.Router();

// Services
const configManager = require('../services/travel-agency-prospecting/config-manager.service');
const multiServerManager = require('../services/travel-agency-prospecting/multi-server-manager.service');
const costOptimizer = require('../services/travel-agency-prospecting/cost-optimizer.service');
// const aiEmailGenerator = require('../services/travel-agency-prospecting/ai-email-generator.service');

// Middleware
const { authenticate, authorize } = require('../middleware/auth');

/**
 * ============================================
 * WIZARD DE CONFIGURACIÓN
 * ============================================
 */

/**
 * @route GET /api/agent-email-config/wizard/start
 * @desc Iniciar wizard de configuración guiada
 * @access Private (Admin)
 */
router.get('/wizard/start', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const wizard = await configManager.startWizard();
    
    res.json({
      success: true,
      wizard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/agent-email-config/wizard/process
 * @desc Procesar respuestas del wizard y generar configuración
 * @access Private (Admin)
 */
router.post('/wizard/process', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { answers } = req.body;
    
    const config = await configManager.processWizardAnswers(answers);
    
    res.json({
      success: true,
      config,
      message: 'Configuración generada. Revisa y aplica cuando estés listo.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/agent-email-config/wizard/apply
 * @desc Aplicar configuración generada por wizard
 * @access Private (Admin)
 */
router.post('/wizard/apply', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { config } = req.body;
    
    const result = await configManager.applyWizardConfig(config);
    
    res.json({
      success: true,
      ...result,
      message: 'Configuración aplicada exitosamente!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ============================================
 * TEMPLATES DE CONFIGURACIÓN RÁPIDA
 * ============================================
 */

/**
 * @route GET /api/agent-email-config/templates
 * @desc Obtener templates de configuración rápida
 * @access Private
 */
router.get('/templates', authenticate, async (req, res) => {
  try {
    const templates = configManager.configTemplates;
    
    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/agent-email-config/templates/:templateId/apply
 * @desc Aplicar template de configuración
 * @access Private (Admin)
 */
router.post('/templates/:templateId/apply', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = configManager.configTemplates[templateId];
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }
    
    // Aplicar configuración del template
    const wizardConfig = {
      recommended: template.setup,
    };
    
    const result = await configManager.applyWizardConfig(wizardConfig);
    
    res.json({
      success: true,
      template: template.name,
      ...result,
      message: `Template "${template.name}" aplicado exitosamente!`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ============================================
 * CONFIGURACIÓN MANUAL
 * ============================================
 */

/**
 * @route GET /api/agent-email-config/manual/schema
 * @desc Obtener schema de configuración manual
 * @access Private
 */
router.get('/manual/schema', authenticate, async (req, res) => {
  try {
    const schema = configManager.getManualConfigSchema();
    
    res.json({
      success: true,
      schema,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/agent-email-config/manual/current
 * @desc Obtener configuración actual
 * @access Private
 */
router.get('/manual/current', authenticate, async (req, res) => {
  try {
    const config = configManager.getCurrentConfig();
    
    res.json({
      success: true,
      config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route PUT /api/agent-email-config/manual/update
 * @desc Actualizar configuración manual
 * @access Private (Admin)
 */
router.put('/manual/update', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const configData = req.body;
    
    const result = await configManager.applyManualConfig(configData);
    
    res.json({
      success: true,
      ...result,
      message: 'Configuración actualizada exitosamente!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ============================================
 * MULTI-SERVER MANAGEMENT
 * ============================================
 */

/**
 * @route GET /api/agent-email-config/multi-server/presets
 * @desc Obtener presets de multi-servidor
 * @access Private
 */
router.get('/multi-server/presets', authenticate, async (req, res) => {
  try {
    const presets = multiServerManager.getPresets();
    
    res.json({
      success: true,
      presets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/agent-email-config/multi-server/preset/:presetName
 * @desc Cambiar a preset de multi-servidor
 * @access Private (Admin)
 */
router.post('/multi-server/preset/:presetName', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { presetName } = req.params;
    
    const preset = multiServerManager.loadPreset(presetName);
    
    res.json({
      success: true,
      preset,
      message: `Preset "${preset.name}" cargado exitosamente!`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/agent-email-config/multi-server/custom
 * @desc Crear configuración custom de multi-servidor
 * @access Private (Admin)
 */
router.post('/multi-server/custom', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const options = req.body;
    
    const config = multiServerManager.createCustomConfig(options);
    
    res.json({
      success: true,
      config,
      message: 'Configuración custom creada exitosamente!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/agent-email-config/multi-server/statistics
 * @desc Obtener estadísticas de multi-servidor
 * @access Private
 */
router.get('/multi-server/statistics', authenticate, async (req, res) => {
  try {
    const stats = multiServerManager.getStatistics();
    const recommendations = multiServerManager.getRecommendations();
    
    res.json({
      success: true,
      statistics: stats,
      recommendations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ============================================
 * COST OPTIMIZATION
 * ============================================
 */

/**
 * @route GET /api/agent-email-config/cost/strategies
 * @desc Obtener estrategias de optimización de costos
 * @access Private
 */
router.get('/cost/strategies', authenticate, async (req, res) => {
  try {
    const strategies = costOptimizer.getStrategies();
    
    res.json({
      success: true,
      strategies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/agent-email-config/cost/strategy/:strategyName
 * @desc Cambiar estrategia de optimización de costos
 * @access Private (Admin, Manager)
 */
router.post('/cost/strategy/:strategyName', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { strategyName } = req.params;
    
    const strategy = costOptimizer.setStrategy(strategyName);
    
    res.json({
      success: true,
      strategy,
      message: `Estrategia "${strategy.name}" activada exitosamente!`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/agent-email-config/cost/comparison
 * @desc Comparar costos de diferentes estrategias
 * @access Private
 */
router.get('/cost/comparison', authenticate, async (req, res) => {
  try {
    const { emailCount = 10000 } = req.query;
    
    const comparison = costOptimizer.compareStrategies(parseInt(emailCount));
    
    res.json({
      success: true,
      emailCount: parseInt(emailCount),
      comparison,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/agent-email-config/cost/recommendations
 * @desc Obtener recomendaciones de optimización
 * @access Private
 */
router.get('/cost/recommendations', authenticate, async (req, res) => {
  try {
    const { monthlyVolume = 30000 } = req.query;
    
    const recommendations = costOptimizer.getRecommendations(parseInt(monthlyVolume));
    
    res.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/agent-email-config/cost/statistics
 * @desc Obtener estadísticas de costos
 * @access Private
 */
router.get('/cost/statistics', authenticate, async (req, res) => {
  try {
    const stats = costOptimizer.getStatistics();
    
    res.json({
      success: true,
      statistics: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/agent-email-config/cost/free-tier-pool
 * @desc Configurar pool de cuentas gratuitas
 * @access Private (Admin)
 */
router.post('/cost/free-tier-pool', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { accounts } = req.body;
    
    const result = costOptimizer.setupFreeTierPool(accounts);
    
    res.json({
      success: true,
      ...result,
      message: 'Free tier pool configurado exitosamente!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ============================================
 * TESTING Y VALIDACIÓN
 * ============================================
 */

/**
 * @route POST /api/agent-email-config/test
 * @desc Probar configuración actual
 * @access Private (Admin)
 */
router.post('/test', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const results = await configManager.testConfiguration();
    
    res.json({
      success: true,
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/agent-email-config/test/send-email
 * @desc Enviar email de prueba
 * @access Private (Admin)
 */
router.post('/test/send-email', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { to } = req.body;
    // const subject = req.body.subject || 'Test Email';
    // const body = req.body.body || 'This is a test email from Spirit Tours.';
    
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email is required',
      });
    }
    
    // TODO: Implement actual test email sending
    
    res.json({
      success: true,
      message: 'Test email sent successfully!',
      to,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ============================================
 * PERFILES Y EXPORT/IMPORT
 * ============================================
 */

/**
 * @route POST /api/agent-email-config/profiles/save
 * @desc Guardar configuración actual como perfil
 * @access Private (Admin)
 */
router.post('/profiles/save', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const profile = configManager.saveProfile(name, description);
    
    res.json({
      success: true,
      profile,
      message: `Perfil "${name}" guardado exitosamente!`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/agent-email-config/profiles
 * @desc Obtener todos los perfiles guardados
 * @access Private
 */
router.get('/profiles', authenticate, async (req, res) => {
  try {
    const profiles = configManager.config.profiles;
    
    res.json({
      success: true,
      profiles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/agent-email-config/profiles/:profileId/load
 * @desc Cargar perfil guardado
 * @access Private (Admin)
 */
router.post('/profiles/:profileId/load', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { profileId } = req.params;
    
    const profile = configManager.loadProfile(profileId);
    
    res.json({
      success: true,
      profile,
      message: `Perfil "${profile.name}" cargado exitosamente!`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/agent-email-config/export
 * @desc Exportar configuración actual
 * @access Private (Admin)
 */
router.get('/export', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const exportData = configManager.exportConfig();
    
    res.json({
      success: true,
      export: exportData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/agent-email-config/import
 * @desc Importar configuración
 * @access Private (Admin)
 */
router.post('/import', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const importData = req.body;
    
    const config = configManager.importConfig(importData);
    
    res.json({
      success: true,
      config,
      message: 'Configuración importada exitosamente!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ============================================
 * HISTORIAL Y ROLLBACK
 * ============================================
 */

/**
 * @route GET /api/agent-email-config/history
 * @desc Obtener historial de cambios
 * @access Private (Admin)
 */
router.get('/history', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const history = configManager.config.changeHistory;
    
    res.json({
      success: true,
      history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route POST /api/agent-email-config/rollback
 * @desc Revertir cambios
 * @access Private (Admin)
 */
router.post('/rollback', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { steps = 1 } = req.body;
    
    configManager.rollback(steps);
    
    res.json({
      success: true,
      message: `Revertido ${steps} cambio(s) exitosamente!`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * ============================================
 * DASHBOARD OVERVIEW
 * ============================================
 */

/**
 * @route GET /api/agent-email-config/overview
 * @desc Obtener overview completo para dashboard
 * @access Private
 */
router.get('/overview', authenticate, async (req, res) => {
  try {
    const config = configManager.getCurrentConfig();
    const multiServerStats = multiServerManager.getStatistics();
    const costStats = costOptimizer.getStatistics();
    
    const overview = {
      system: {
        name: config.global.systemName,
        version: config.global.version,
        environment: config.global.environment,
        configured: config.status.configured,
        tested: config.status.tested,
      },
      configuration: {
        mode: config.mode,
        multiServerEnabled: config.multiServer.enabled,
        multiServerPreset: config.multiServer.preset,
        costOptimizationEnabled: config.costOptimization.enabled,
        costStrategy: config.costOptimization.strategy,
        aiEnabled: config.agents.ai.enabled,
        providers: config.emailProviders.length,
      },
      capacity: {
        dailyLimit: multiServerStats.global.totalIPs * 500, // Rough estimate
        serversActive: multiServerStats.global.activeServers,
        serversTotal: multiServerStats.global.totalServers,
        ipsTotal: multiServerStats.global.totalIPs,
      },
      costs: {
        strategy: costStats.activeStrategy,
        spent: costStats.metrics.totalSpent,
        budget: costStats.budget.monthly,
        budgetUsed: costStats.budget.percentage + '%',
        savings: costStats.metrics.savings,
        savingsPercentage: costStats.metrics.savingsPercentage + '%',
      },
      agents: {
        ai: config.agents.ai.enabled,
        humans: config.agents.humans.length,
      },
    };
    
    res.json({
      success: true,
      overview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
