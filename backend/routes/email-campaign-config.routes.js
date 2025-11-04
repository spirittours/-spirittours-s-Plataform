/**
 * Email Campaign Configuration Routes
 * 
 * API endpoints para configuración completa del sistema de email desde dashboard.
 * Incluye wizard de configuración y opciones manuales.
 * 
 * @author Spirit Tours Development Team
 */

const express = require('express');
const router = express.Router();

// Services
const multiServerManager = require('../services/travel-agency-prospecting/multi-server-manager.service');
const costOptimizer = require('../services/travel-agency-prospecting/cost-optimizer.service');
const aiEmailGenerator = require('../services/travel-agency-prospecting/ai-email-generator.service');

// Middleware (ajustar según tu sistema de autenticación)
const { authenticate, authorize } = require('../middleware/auth');

/**
 * ============================================
 * ENDPOINTS DE CONFIGURACIÓN GENERAL
 * ============================================
 */

/**
 * GET /api/email-config
 * Obtener configuración completa actual
 */
router.get('/email-config', authenticate, async (req, res) => {
  try {
    const config = {
      // Multi-server configuration
      multiServer: {
        activePreset: multiServerManager.config.activePreset,
        totalServers: multiServerManager.config.statistics.totalServers,
        activeServers: multiServerManager.config.statistics.activeServers,
        totalIPs: multiServerManager.config.statistics.totalIPs,
        rotationStrategy: multiServerManager.config.globalSettings.rotationStrategy,
        dailyCapacity: multiServerManager.getTotalDailyCapacity(),
      },
      
      // Cost optimization
      costOptimization: {
        activeStrategy: costOptimizer.config.activeStrategy,
        estimatedMonthlyCost: costOptimizer.getStrategies()[costOptimizer.config.activeStrategy].estimatedMonthlyCost,
        costs: costOptimizer.getCostStatistics(),
      },
      
      // AI settings
      aiSettings: {
        model: aiEmailGenerator.config.model,
        temperature: aiEmailGenerator.config.temperature,
        learningEnabled: true,
      },
    };
    
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
 * POST /api/email-config/wizard/start
 * Iniciar wizard de configuración guiada
 */
router.post('/email-config/wizard/start', authenticate, async (req, res) => {
  try {
    const { userProfile } = req.body;
    
    // Analizar perfil del usuario y recomendar configuración
    const recommendation = analyzeUserProfileAndRecommend(userProfile);
    
    res.json({
      success: true,
      wizard: {
        step: 1,
        totalSteps: 5,
        recommendation,
      },
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/email-config/wizard/complete
 * Completar wizard con configuración elegida
 */
router.post('/email-config/wizard/complete', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      multiServerPreset,
      costStrategy,
      budget,
      autoScaling,
    } = req.body;
    
    // Aplicar configuración de multi-server
    if (multiServerPreset) {
      multiServerManager.loadPreset(multiServerPreset);
    }
    
    // Aplicar estrategia de costos
    if (costStrategy) {
      costOptimizer.changeStrategy(costStrategy);
    }
    
    // Establecer presupuesto
    if (budget) {
      costOptimizer.config.costLimits.maxMonthlyBudget = budget.monthly;
      costOptimizer.config.costLimits.maxDailyBudget = budget.daily;
    }
    
    const finalConfig = {
      multiServer: multiServerPreset,
      costStrategy,
      budget,
      autoScaling: autoScaling || false,
      configuredAt: new Date(),
      configuredBy: req.user.id,
    };
    
    // TODO: Save configuration to database
    
    res.json({
      success: true,
      message: 'Configuración completada exitosamente',
      config: finalConfig,
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
 * ENDPOINTS DE MULTI-SERVER
 * ============================================
 */

/**
 * GET /api/email-config/presets
 * Obtener todos los presets disponibles
 */
router.get('/email-config/presets', authenticate, async (req, res) => {
  try {
    const presets = multiServerManager.getPresets();
    
    // Transform for frontend
    const presetsArray = Object.entries(presets).map(([key, preset]) => ({
      id: key,
      name: preset.name,
      description: preset.description,
      tier: preset.tier,
      recommended: preset.recommended,
      capacity: preset.capacity,
      cost: preset.cost,
      servers: preset.servers.length,
    }));
    
    res.json({
      success: true,
      presets: presetsArray,
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/email-config/preset
 * Cambiar preset de multi-server
 */
router.post('/email-config/preset', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { presetId } = req.body;
    
    const preset = multiServerManager.loadPreset(presetId);
    
    res.json({
      success: true,
      message: `Preset cambiado a: ${preset.name}`,
      preset: {
        id: presetId,
        name: preset.name,
        capacity: preset.capacity,
        cost: preset.cost,
      },
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/email-config/custom
 * Crear configuración personalizada
 */
router.post('/email-config/custom', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      name,
      serverCount,
      dailyLimitPerServer,
      includeSendGrid,
      sendGridDailyLimit,
      regions,
    } = req.body;
    
    const customConfig = multiServerManager.createCustomConfig({
      name,
      serverCount,
      dailyLimitPerServer,
      includeSendGrid,
      sendGridDailyLimit,
      regions,
    });
    
    res.json({
      success: true,
      message: 'Configuración personalizada creada',
      config: customConfig,
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/email-config/servers/stats
 * Estadísticas de servidores
 */
router.get('/email-config/servers/stats', authenticate, async (req, res) => {
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
 * POST /api/email-config/rotation-strategy
 * Cambiar estrategia de rotación
 */
router.post('/email-config/rotation-strategy', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { strategy } = req.body;
    
    const validStrategies = ['round-robin', 'random', 'least-used', 'best-performance'];
    
    if (!validStrategies.includes(strategy)) {
      return res.status(400).json({
        success: false,
        error: `Invalid strategy. Valid options: ${validStrategies.join(', ')}`,
      });
    }
    
    multiServerManager.config.globalSettings.rotationStrategy = strategy;
    
    res.json({
      success: true,
      message: `Estrategia de rotación cambiada a: ${strategy}`,
      strategy,
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
 * ENDPOINTS DE COST OPTIMIZATION
 * ============================================
 */

/**
 * GET /api/email-config/cost/strategies
 * Obtener estrategias de optimización disponibles
 */
router.get('/email-config/cost/strategies', authenticate, async (req, res) => {
  try {
    const strategies = costOptimizer.getStrategies();
    
    // Transform for frontend
    const strategiesArray = Object.entries(strategies).map(([key, strategy]) => ({
      id: key,
      name: strategy.name,
      description: strategy.description,
      icon: strategy.icon,
      estimatedMonthlyCost: strategy.estimatedMonthlyCost,
      recommended: strategy.recommended,
      pros: strategy.pros,
      cons: strategy.cons,
    }));
    
    res.json({
      success: true,
      strategies: strategiesArray,
      currentStrategy: costOptimizer.config.activeStrategy,
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/email-config/cost/strategy
 * Cambiar estrategia de optimización de costos
 */
router.post('/api/email-config/cost/strategy', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { strategyId } = req.body;
    
    const result = costOptimizer.changeStrategy(strategyId);
    
    res.json({
      success: true,
      message: `Estrategia cambiada de ${result.oldStrategy} a ${result.newStrategy}`,
      result,
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/email-config/cost/stats
 * Estadísticas de costos
 */
router.get('/api/email-config/cost/stats', authenticate, async (req, res) => {
  try {
    const stats = costOptimizer.getCostStatistics();
    const recommendations = costOptimizer.getOptimizationRecommendations();
    
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
 * POST /api/email-config/cost/budget
 * Establecer presupuesto
 */
router.post('/api/email-config/cost/budget', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { daily, monthly, alertThreshold } = req.body;
    
    if (daily) {
      costOptimizer.config.costLimits.maxDailyBudget = parseFloat(daily);
    }
    
    if (monthly) {
      costOptimizer.config.costLimits.maxMonthlyBudget = parseFloat(monthly);
    }
    
    if (alertThreshold) {
      costOptimizer.config.costLimits.alertThreshold = parseFloat(alertThreshold);
    }
    
    res.json({
      success: true,
      message: 'Presupuesto actualizado',
      budget: costOptimizer.config.costLimits,
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
 * ENDPOINTS DE AI CONFIGURATION
 * ============================================
 */

/**
 * POST /api/email-config/ai/settings
 * Actualizar configuración de AI
 */
router.post('/api/email-config/ai/settings', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { model, temperature, maxTokens } = req.body;
    
    const updates = {};
    
    if (model) updates.model = model;
    if (temperature !== undefined) updates.temperature = parseFloat(temperature);
    if (maxTokens) updates.maxTokens = parseInt(maxTokens);
    
    aiEmailGenerator.updateConfig(updates);
    
    res.json({
      success: true,
      message: 'Configuración de AI actualizada',
      config: {
        model: aiEmailGenerator.config.model,
        temperature: aiEmailGenerator.config.temperature,
        maxTokens: aiEmailGenerator.config.maxTokens,
      },
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/email-config/ai/stats
 * Estadísticas de AI
 */
router.get('/api/email-config/ai/stats', authenticate, async (req, res) => {
  try {
    const stats = aiEmailGenerator.getStatistics();
    
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
 * ============================================
 * ENDPOINTS DE CONFIGURACIÓN SMTP MANUAL
 * ============================================
 */

/**
 * POST /api/email-config/smtp/server
 * Agregar servidor SMTP manualmente
 */
router.post('/api/email-config/smtp/server', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      name,
      host,
      port,
      user,
      password,
      ipAddress,
      dailyLimit,
    } = req.body;
    
    // Validar inputs
    if (!name || !host || !port || !user || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, host, port, user, password',
      });
    }
    
    // Crear configuración de servidor
    const serverConfig = {
      name,
      host,
      port: parseInt(port),
      secure: port == 465,
      auth: { user, pass: password },
      ipAddress: ipAddress || 'auto-detect',
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 5,
      dailyLimit: dailyLimit || 500,
      warmup: {
        enabled: true,
        currentDay: 1,
        schedule: [50, 100, 200, 300, 400, 500],
      },
    };
    
    // Agregar a configuración actual
    multiServerManager.config.serverPools.push(serverConfig);
    multiServerManager.initializeTransporters();
    
    res.json({
      success: true,
      message: `Servidor ${name} agregado exitosamente`,
      server: serverConfig,
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/email-config/smtp/server/:serverName
 * Eliminar servidor SMTP
 */
router.delete('/api/email-config/smtp/server/:serverName', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { serverName } = req.params;
    
    const index = multiServerManager.config.serverPools.findIndex(s => s.name === serverName);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: `Servidor no encontrado: ${serverName}`,
      });
    }
    
    multiServerManager.config.serverPools.splice(index, 1);
    multiServerManager.initializeTransporters();
    
    res.json({
      success: true,
      message: `Servidor ${serverName} eliminado`,
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/email-config/smtp/test
 * Probar conexión SMTP
 */
router.post('/api/email-config/smtp/test', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { host, port, user, password } = req.body;
    
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: port == 465,
      auth: { user, pass: password },
    });
    
    await transporter.verify();
    
    res.json({
      success: true,
      message: 'Conexión SMTP exitosa',
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Fallo en conexión SMTP: ${error.message}`,
    });
  }
});

/**
 * ============================================
 * HELPER FUNCTIONS
 * ============================================
 */

function analyzeUserProfileAndRecommend(userProfile) {
  const {
    expectedEmailVolume,    // 'low' | 'medium' | 'high' | 'very-high'
    budget,                 // 'minimal' | 'moderate' | 'flexible'
    technicalExpertise,     // 'beginner' | 'intermediate' | 'expert'
    businessSize,           // 'startup' | 'small' | 'medium' | 'enterprise'
    priority,               // 'cost' | 'speed' | 'quality'
  } = userProfile;
  
  // Recomendar based on profile
  let recommendedPreset = 'starter';
  let recommendedCostStrategy = 'balanced';
  let setupComplexity = 'wizard'; // 'wizard' | 'manual'
  
  // Determine preset
  if (budget === 'minimal' || businessSize === 'startup') {
    if (expectedEmailVolume === 'low') {
      recommendedPreset = 'starter';
    } else if (expectedEmailVolume === 'medium') {
      recommendedPreset = 'hybrid-basic';
    } else {
      recommendedPreset = 'professional';
    }
  } else if (budget === 'moderate' || businessSize === 'small' || businessSize === 'medium') {
    if (expectedEmailVolume === 'medium') {
      recommendedPreset = 'professional';
    } else if (expectedEmailVolume === 'high') {
      recommendedPreset = 'business';
    } else {
      recommendedPreset = 'hybrid-basic';
    }
  } else {
    // Flexible budget or enterprise
    if (expectedEmailVolume === 'very-high') {
      recommendedPreset = 'enterprise';
    } else if (expectedEmailVolume === 'high') {
      recommendedPreset = 'business';
    } else {
      recommendedPreset = 'professional';
    }
  }
  
  // Determine cost strategy
  if (priority === 'cost' || budget === 'minimal') {
    recommendedCostStrategy = 'maximum-savings';
  } else if (priority === 'speed') {
    recommendedCostStrategy = 'performance';
  } else if (priority === 'quality') {
    recommendedCostStrategy = 'balanced';
  } else {
    recommendedCostStrategy = 'smart-auto';
  }
  
  // Determine setup method
  if (technicalExpertise === 'beginner') {
    setupComplexity = 'wizard';
  } else if (technicalExpertise === 'expert') {
    setupComplexity = 'manual';
  } else {
    setupComplexity = 'hybrid'; // Can use both
  }
  
  return {
    recommendedPreset,
    recommendedCostStrategy,
    setupComplexity,
    reasoning: {
      preset: `Based on ${expectedEmailVolume} volume and ${budget} budget, ${recommendedPreset} is optimal.`,
      costStrategy: `With ${priority} priority, ${recommendedCostStrategy} strategy fits best.`,
      setup: `For ${technicalExpertise} expertise, ${setupComplexity} setup is recommended.`,
    },
    estimatedCost: getPresetCost(recommendedPreset),
  };
}

function getPresetCost(presetId) {
  const presets = multiServerManager.getPresets();
  const preset = presets[presetId];
  return preset?.cost || { monthly: 0, setup: 0 };
}

module.exports = router;
