/**
 * ROI Calculator - API Routes
 * 
 * Endpoints para calculadora de ROI flexible y configurable
 * Base: 4 años (configurable por administrador)
 * 
 * @module ROICalculatorRoutes
 */

const express = require('express');
const router = express.Router();
const ROICalculator = require('../../services/ai-accounting-agent/roi-calculator');
const { ROIConfigurationManager } = require('../../services/ai-accounting-agent/roi-calculator');
const { authenticate, authorize } = require('../../middleware/auth');
const logger = require('../../utils/logger');

/**
 * POST /api/ai-agent/roi/calculate
 * Calcular ROI con configuración personalizada
 */
router.post('/calculate',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const config = req.body;
      
      // Crear calculadora con configuración personalizada
      const calculator = new ROICalculator(config);
      
      // Calcular ROI
      const result = calculator.calculate();
      
      res.json({
        success: true,
        data: result,
        message: 'ROI calculado exitosamente'
      });
      
    } catch (error) {
      logger.error('Error al calcular ROI:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/roi/calculate-default
 * Calcular ROI con configuración por defecto (4 años)
 */
router.post('/calculate-default',
  authenticate,
  async (req, res) => {
    try {
      // Usar configuración por defecto
      const calculator = new ROICalculator();
      const result = calculator.calculate();
      
      res.json({
        success: true,
        data: result,
        message: 'ROI calculado con configuración por defecto (4 años)'
      });
      
    } catch (error) {
      logger.error('Error al calcular ROI con configuración por defecto:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/roi/sensitivity-analysis
 * Análisis de sensibilidad (escenarios optimista, pesimista, etc.)
 */
router.post('/sensitivity-analysis',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const config = req.body;
      
      const calculator = new ROICalculator(config);
      const analysis = calculator.sensitivityAnalysis();
      
      res.json({
        success: true,
        data: analysis,
        message: 'Análisis de sensibilidad completado'
      });
      
    } catch (error) {
      logger.error('Error en análisis de sensibilidad:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/roi/configuration
 * Crear nueva configuración de ROI
 */
router.post('/configuration',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { organizationId, configData } = req.body;
      
      if (!organizationId || !configData) {
        return res.status(400).json({
          success: false,
          error: 'organizationId y configData son requeridos'
        });
      }
      
      const config = await ROIConfigurationManager.createConfiguration(
        organizationId,
        configData,
        req.user.id
      );
      
      res.json({
        success: true,
        data: config,
        message: 'Configuración de ROI creada exitosamente'
      });
      
    } catch (error) {
      logger.error('Error al crear configuración:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/roi/configuration/active/:organizationId
 * Obtener configuración activa de una organización
 */
router.get('/configuration/active/:organizationId',
  authenticate,
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      
      const config = await ROIConfigurationManager.getActiveConfiguration(organizationId);
      
      if (!config) {
        // Si no hay configuración, retornar configuración por defecto
        const defaultCalculator = new ROICalculator();
        return res.json({
          success: true,
          data: {
            isDefault: true,
            config: defaultCalculator.exportConfig()
          },
          message: 'No hay configuración guardada, usando valores por defecto'
        });
      }
      
      res.json({
        success: true,
        data: config
      });
      
    } catch (error) {
      logger.error('Error al obtener configuración activa:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/roi/configuration/list/:organizationId
 * Listar todas las configuraciones de una organización
 */
router.get('/configuration/list/:organizationId',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      
      const configs = await ROIConfigurationManager.listConfigurations(organizationId);
      
      res.json({
        success: true,
        data: configs,
        count: configs.length
      });
      
    } catch (error) {
      logger.error('Error al listar configuraciones:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/ai-agent/roi/configuration/:id
 * Actualizar configuración existente
 */
router.put('/configuration/:id',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const config = await ROIConfigurationManager.updateConfiguration(
        id,
        updates,
        req.user.id
      );
      
      res.json({
        success: true,
        data: config,
        message: 'Configuración actualizada exitosamente'
      });
      
    } catch (error) {
      logger.error('Error al actualizar configuración:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/ai-agent/roi/configuration/:id
 * Eliminar (desactivar) configuración
 */
router.delete('/configuration/:id',
  authenticate,
  authorize(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const config = await ROIConfigurationManager.deleteConfiguration(id);
      
      res.json({
        success: true,
        data: config,
        message: 'Configuración desactivada exitosamente'
      });
      
    } catch (error) {
      logger.error('Error al eliminar configuración:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/roi/calculate-from-saved
 * Calcular ROI usando configuración guardada
 */
router.post('/calculate-from-saved',
  authenticate,
  async (req, res) => {
    try {
      const { organizationId, configurationId } = req.body;
      
      let config;
      
      if (configurationId) {
        // Usar configuración específica
        const { ROIConfiguration } = require('../../services/ai-accounting-agent/roi-calculator');
        config = await ROIConfiguration.findById(configurationId);
        
        if (!config) {
          return res.status(404).json({
            success: false,
            error: 'Configuración no encontrada'
          });
        }
      } else if (organizationId) {
        // Usar configuración activa de la organización
        config = await ROIConfigurationManager.getActiveConfiguration(organizationId);
        
        if (!config) {
          // Si no hay configuración, usar por defecto
          const calculator = new ROICalculator();
          const result = calculator.calculate();
          
          return res.json({
            success: true,
            data: result,
            message: 'ROI calculado con configuración por defecto (no hay configuración guardada)'
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'organizationId o configurationId es requerido'
        });
      }
      
      // Crear calculadora con configuración guardada
      const calculator = new ROICalculator({
        paybackPeriodYears: config.paybackPeriodYears,
        implementationCost: config.oneTimeCosts.implementation,
        trainingCost: config.oneTimeCosts.training,
        migrationCost: config.oneTimeCosts.migration,
        infrastructureCost: config.oneTimeCosts.infrastructure,
        consultingCost: config.oneTimeCosts.consulting,
        otherOneTimeCost: config.oneTimeCosts.other,
        aiLicenseCost: config.monthlyCosts.aiLicense,
        erpCost: config.monthlyCosts.erpIntegration,
        cloudCost: config.monthlyCosts.cloudHosting,
        maintenanceCost: config.monthlyCosts.maintenance,
        supportCost: config.monthlyCosts.support,
        otherMonthlyCost: config.monthlyCosts.other,
        laborSaving: config.monthlySavings.laborReduction,
        errorSaving: config.monthlySavings.errorReduction,
        fraudSaving: config.monthlySavings.fraudPrevention,
        timeSaving: config.monthlySavings.timeToMarket,
        complianceSaving: config.monthlySavings.complianceFines,
        otherSaving: config.monthlySavings.other,
        inflationRate: config.adjustmentFactors.inflationRate,
        discountRate: config.adjustmentFactors.discountRate,
        riskAdjustment: config.adjustmentFactors.riskAdjustment,
        adoptionCurve: config.adjustmentFactors.adoptionCurve,
        includeIntangibles: config.advanced.includeIntangibles,
        conservative: config.advanced.useConservativeEstimates,
        seasonality: config.advanced.adjustForSeasonality,
        multiCurrency: config.advanced.multiCurrency
      });
      
      const result = calculator.calculate();
      
      res.json({
        success: true,
        data: {
          ...result,
          configurationUsed: {
            id: config._id,
            name: config.name,
            description: config.description
          }
        },
        message: 'ROI calculado con configuración guardada'
      });
      
    } catch (error) {
      logger.error('Error al calcular ROI desde configuración guardada:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/ai-agent/roi/export-config/:id
 * Exportar configuración en formato JSON
 */
router.get('/export-config/:id',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const { ROIConfiguration } = require('../../services/ai-accounting-agent/roi-calculator');
      const config = await ROIConfiguration.findById(id);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'Configuración no encontrada'
        });
      }
      
      // Formatear para exportación
      const exportData = {
        name: config.name,
        description: config.description,
        paybackPeriodYears: config.paybackPeriodYears,
        oneTimeCosts: config.oneTimeCosts,
        monthlyCosts: config.monthlyCosts,
        monthlySavings: config.monthlySavings,
        adjustmentFactors: config.adjustmentFactors,
        advanced: config.advanced,
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.id
      };
      
      // Setear headers para descarga
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="roi-config-${config.name.replace(/\s/g, '_')}.json"`);
      
      res.json(exportData);
      
    } catch (error) {
      logger.error('Error al exportar configuración:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/ai-agent/roi/import-config
 * Importar configuración desde JSON
 */
router.post('/import-config',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { organizationId, configData } = req.body;
      
      if (!organizationId || !configData) {
        return res.status(400).json({
          success: false,
          error: 'organizationId y configData son requeridos'
        });
      }
      
      const config = await ROIConfigurationManager.createConfiguration(
        organizationId,
        configData,
        req.user.id
      );
      
      res.json({
        success: true,
        data: config,
        message: 'Configuración importada exitosamente'
      });
      
    } catch (error) {
      logger.error('Error al importar configuración:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
