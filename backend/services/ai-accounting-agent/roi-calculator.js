/**
 * ROI Calculator - Flexible Financial Analysis
 * 
 * Calculadora de ROI completamente configurable por el administrador.
 * Base: 4 años de periodo de recuperación (NO 14 meses como se mencionó inicialmente).
 * 
 * Incluye:
 * - Cálculo de NPV (Net Present Value)
 * - Cálculo de IRR (Internal Rate of Return)
 * - Periodo de recuperación real (payback period)
 * - Proyecciones anuales con curva de adopción
 * - Análisis de sensibilidad
 * - Recomendaciones automáticas
 * 
 * @module ROICalculator
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

/**
 * Schema para guardar configuraciones de ROI
 */
const ROIConfigurationSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  name: { type: String, required: true },
  description: { type: String },
  
  // Período base
  paybackPeriodYears: { type: Number, default: 4, min: 1, max: 10 },
  
  // Costos one-time (USD)
  oneTimeCosts: {
    implementation: { type: Number, default: 150000 },
    training: { type: Number, default: 25000 },
    migration: { type: Number, default: 30000 },
    infrastructure: { type: Number, default: 20000 },
    consulting: { type: Number, default: 35000 },
    other: { type: Number, default: 0 }
  },
  
  // Costos recurrentes mensuales (USD)
  monthlyCosts: {
    aiLicense: { type: Number, default: 2000 },
    erpIntegration: { type: Number, default: 1500 },
    cloudHosting: { type: Number, default: 800 },
    maintenance: { type: Number, default: 1200 },
    support: { type: Number, default: 500 },
    other: { type: Number, default: 0 }
  },
  
  // Ahorros mensuales esperados (USD)
  monthlySavings: {
    laborReduction: { type: Number, default: 15000 },
    errorReduction: { type: Number, default: 5000 },
    fraudPrevention: { type: Number, default: 8000 },
    timeToMarket: { type: Number, default: 3000 },
    complianceFines: { type: Number, default: 2000 },
    other: { type: Number, default: 0 }
  },
  
  // Factores de ajuste
  adjustmentFactors: {
    inflationRate: { type: Number, default: 0.03, min: 0, max: 0.20 },      // 3% anual
    discountRate: { type: Number, default: 0.08, min: 0, max: 0.30 },       // 8% tasa descuento
    riskAdjustment: { type: Number, default: 0.15, min: 0, max: 0.50 },     // 15% ajuste riesgo
    adoptionCurve: { type: [Number], default: [0.5, 0.7, 0.9, 1.0] }        // Años 1-4
  },
  
  // Configuración avanzada
  advanced: {
    includeIntangibles: { type: Boolean, default: true },
    useConservativeEstimates: { type: Boolean, default: true },
    adjustForSeasonality: { type: Boolean, default: false },
    multiCurrency: { type: Boolean, default: false },
    baseCurrency: { type: String, default: 'USD' }
  },
  
  // Auditoría
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

ROIConfigurationSchema.index({ organizationId: 1, isActive: 1 });
ROIConfigurationSchema.index({ createdAt: -1 });

const ROIConfiguration = mongoose.model('ROIConfiguration', ROIConfigurationSchema);

/**
 * ROI Calculator Class
 */
class ROICalculator {
  constructor(config = {}) {
    this.config = {
      // 🔴 IMPORTANTE: Base de 4 años (NO 14 meses)
      paybackPeriodYears: config.paybackPeriodYears || 4,
      
      // Costos one-time
      oneTimeCosts: {
        implementation: config.implementationCost || 150000,
        training: config.trainingCost || 25000,
        migration: config.migrationCost || 30000,
        infrastructure: config.infrastructureCost || 20000,
        consulting: config.consultingCost || 35000,
        other: config.otherOneTimeCost || 0
      },
      
      // Costos recurrentes mensuales
      monthlyCosts: {
        aiLicense: config.aiLicenseCost || 2000,
        erpIntegration: config.erpCost || 1500,
        cloudHosting: config.cloudCost || 800,
        maintenance: config.maintenanceCost || 1200,
        support: config.supportCost || 500,
        other: config.otherMonthlyCost || 0
      },
      
      // Ahorros mensuales (valor esperado)
      monthlySavings: {
        laborReduction: config.laborSaving || 15000,
        errorReduction: config.errorSaving || 5000,
        fraudPrevention: config.fraudSaving || 8000,
        timeToMarket: config.timeSaving || 3000,
        complianceFines: config.complianceSaving || 2000,
        other: config.otherSaving || 0
      },
      
      // Factores de ajuste
      adjustmentFactors: {
        inflationRate: config.inflationRate || 0.03,
        discountRate: config.discountRate || 0.08,
        riskAdjustment: config.riskAdjustment || 0.15,
        adoptionCurve: config.adoptionCurve || [0.5, 0.7, 0.9, 1.0]
      },
      
      // Configuración avanzada
      advanced: {
        includeIntangibles: config.includeIntangibles !== false,
        useConservativeEstimates: config.conservative !== false,
        adjustForSeasonality: config.seasonality || false,
        multiCurrency: config.multiCurrency || false
      }
    };
  }

  /**
   * Cálculo completo del ROI
   */
  calculate() {
    const years = this.config.paybackPeriodYears;
    
    // 1. Calcular costos totales
    const totalOneTimeCost = this.sumObject(this.config.oneTimeCosts);
    const monthlyOperatingCost = this.sumObject(this.config.monthlyCosts);
    const totalMonthlySavings = this.sumObject(this.config.monthlySavings);
    
    // 2. Proyección anual
    const yearlyProjection = [];
    let cumulativeCashFlow = -totalOneTimeCost;  // Inversión inicial negativa
    
    for (let year = 1; year <= years; year++) {
      // Aplicar curva de adopción
      const adoptionFactor = this.config.adjustmentFactors.adoptionCurve[year - 1] || 1.0;
      
      // Calcular costos del año
      const yearlyCost = monthlyOperatingCost * 12;
      
      // Calcular ahorros del año (con adopción gradual)
      const yearlySavings = totalMonthlySavings * 12 * adoptionFactor;
      
      // Net benefit del año
      const yearlyNetBenefit = yearlySavings - yearlyCost;
      
      // Cash flow acumulado
      cumulativeCashFlow += yearlyNetBenefit;
      
      yearlyProjection.push({
        year,
        costs: yearlyCost,
        savings: yearlySavings,
        netBenefit: yearlyNetBenefit,
        cumulativeCashFlow,
        adoptionRate: adoptionFactor * 100,
        breakEven: cumulativeCashFlow >= 0
      });
    }
    
    // 3. Calcular métricas clave
    const totalInvestment = totalOneTimeCost + (monthlyOperatingCost * 12 * years);
    const totalSavings = yearlyProjection.reduce((sum, y) => sum + y.savings, 0);
    const netPresentValue = this.calculateNPV(yearlyProjection);
    const internalRateOfReturn = this.calculateIRR(yearlyProjection);
    const actualPaybackMonths = this.findPaybackPeriod(yearlyProjection);
    
    return {
      summary: {
        paybackPeriodYears: years,
        actualPaybackMonths: Math.round(actualPaybackMonths * 10) / 10,
        totalInvestment,
        totalSavings,
        netBenefit: totalSavings - totalInvestment,
        roi: ((totalSavings - totalInvestment) / totalInvestment) * 100,
        npv: netPresentValue,
        irr: internalRateOfReturn,
        profitabilityIndex: netPresentValue / totalOneTimeCost
      },
      
      breakdown: {
        oneTimeCosts: this.config.oneTimeCosts,
        totalOneTime: totalOneTimeCost,
        monthlyCosts: this.config.monthlyCosts,
        totalMonthly: monthlyOperatingCost,
        monthlySavings: this.config.monthlySavings,
        totalMonthlySavings
      },
      
      yearlyProjection,
      
      recommendations: this.generateRecommendations(yearlyProjection, actualPaybackMonths),
      
      metadata: {
        calculatedAt: new Date(),
        config: this.config
      }
    };
  }

  /**
   * Sumar valores de un objeto
   */
  sumObject(obj) {
    return Object.values(obj).reduce((sum, value) => sum + value, 0);
  }

  /**
   * Calcular NPV (Net Present Value)
   */
  calculateNPV(projection) {
    const discountRate = this.config.adjustmentFactors.discountRate;
    let npv = -this.sumObject(this.config.oneTimeCosts);
    
    projection.forEach((year, index) => {
      npv += year.netBenefit / Math.pow(1 + discountRate, index + 1);
    });
    
    return Math.round(npv);
  }

  /**
   * Calcular IRR (Internal Rate of Return)
   * Usando método de Newton-Raphson simplificado
   */
  calculateIRR(projection) {
    const cashFlows = [
      -this.sumObject(this.config.oneTimeCosts),
      ...projection.map(y => y.netBenefit)
    ];
    
    // Aproximación iterativa (Newton-Raphson)
    let irr = 0.1;  // Guess inicial 10%
    const maxIterations = 100;
    const tolerance = 0.0001;
    
    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let derivative = 0;
      
      cashFlows.forEach((cf, t) => {
        npv += cf / Math.pow(1 + irr, t);
        derivative -= (cf * t) / Math.pow(1 + irr, t + 1);
      });
      
      // Si NPV es suficientemente cercano a 0, hemos encontrado el IRR
      if (Math.abs(npv) < tolerance) break;
      
      // Newton-Raphson: irr_new = irr_old - f(irr) / f'(irr)
      const newIrr = irr - (npv / derivative);
      
      // Limitar cambios extremos
      if (Math.abs(newIrr - irr) < tolerance) break;
      
      irr = newIrr;
      
      // Evitar valores negativos extremos o explosivos
      if (irr < -0.99 || irr > 10) {
        irr = 0;
        break;
      }
    }
    
    return Math.round(irr * 1000) / 10; // Redondear a 1 decimal, en porcentaje
  }

  /**
   * Encontrar periodo de payback real (en meses)
   */
  findPaybackPeriod(projection) {
    let cumulativeCF = -this.sumObject(this.config.oneTimeCosts);
    
    for (let i = 0; i < projection.length; i++) {
      cumulativeCF += projection[i].netBenefit;
      
      if (cumulativeCF >= 0) {
        // Interpolar para obtener mes exacto
        const prevCF = i === 0 
          ? -this.sumObject(this.config.oneTimeCosts)
          : projection[i - 1].cumulativeCashFlow;
        
        const yearNetBenefit = projection[i].netBenefit;
        const monthlyBenefit = yearNetBenefit / 12;
        
        // Calcular meses adicionales necesarios en este año
        const monthsIntoYear = Math.abs(prevCF) / monthlyBenefit;
        
        return (i * 12) + monthsIntoYear;
      }
    }
    
    return -1;  // No alcanza payback en el periodo
  }

  /**
   * Generar recomendaciones basadas en resultados
   */
  generateRecommendations(projection, actualPaybackMonths) {
    const recommendations = [];
    
    const targetPaybackMonths = this.config.paybackPeriodYears * 12;
    
    // Análisis de payback
    if (actualPaybackMonths < 0) {
      recommendations.push({
        type: 'critical',
        icon: '⚠️',
        message: `El proyecto NO alcanza el punto de equilibrio en ${this.config.paybackPeriodYears} años`,
        action: 'Revisar supuestos de costos y ahorros',
        priority: 1
      });
    } else if (actualPaybackMonths > targetPaybackMonths) {
      recommendations.push({
        type: 'warning',
        icon: '⏳',
        message: `Payback real (${Math.round(actualPaybackMonths)} meses) excede objetivo (${targetPaybackMonths} meses)`,
        action: 'Considerar aumentar periodo de evaluación o reducir costos',
        priority: 2
      });
    } else {
      recommendations.push({
        type: 'success',
        icon: '✅',
        message: `Payback en ${Math.round(actualPaybackMonths)} meses - Dentro del objetivo`,
        action: 'Proyecto viable financieramente',
        priority: 5
      });
    }
    
    // Análisis de curva de adopción
    if (projection.length > 0) {
      const year1Adoption = projection[0].adoptionRate;
      if (year1Adoption < 60) {
        recommendations.push({
          type: 'info',
          icon: '📊',
          message: `Adopción primer año baja (${year1Adoption}%)`,
          action: 'Reforzar programa de capacitación y change management',
          priority: 3
        });
      }
    }
    
    // Análisis de NPV
    const npv = this.calculateNPV(projection);
    if (npv < 0) {
      recommendations.push({
        type: 'critical',
        icon: '💰',
        message: `NPV negativo ($${Math.round(npv).toLocaleString()})`,
        action: 'Proyecto destruye valor con tasa de descuento actual',
        priority: 1
      });
    } else if (npv > 0) {
      recommendations.push({
        type: 'success',
        icon: '💵',
        message: `NPV positivo: $${Math.round(npv).toLocaleString()}`,
        action: 'Proyecto crea valor a largo plazo',
        priority: 4
      });
    }
    
    // Análisis de IRR
    const irr = this.calculateIRR(projection);
    const discountRate = this.config.adjustmentFactors.discountRate * 100;
    if (irr < discountRate) {
      recommendations.push({
        type: 'warning',
        icon: '📉',
        message: `IRR (${irr.toFixed(1)}%) menor que tasa de descuento (${discountRate.toFixed(1)}%)`,
        action: 'Retorno no supera costo de capital',
        priority: 2
      });
    } else {
      recommendations.push({
        type: 'success',
        icon: '📈',
        message: `IRR (${irr.toFixed(1)}%) supera tasa de descuento (${discountRate.toFixed(1)}%)`,
        action: 'Retorno superior al costo de capital',
        priority: 4
      });
    }
    
    // Ordenar por prioridad
    recommendations.sort((a, b) => a.priority - b.priority);
    
    return recommendations;
  }

  /**
   * Análisis de sensibilidad
   * Evalúa cómo cambios en variables clave afectan el ROI
   */
  sensitivityAnalysis() {
    const baselineResult = this.calculate();
    const scenarios = {};
    
    // Escenario 1: Ahorros -20%
    const pessimisticSavings = { ...this.config };
    Object.keys(pessimisticSavings.monthlySavings).forEach(key => {
      pessimisticSavings.monthlySavings[key] *= 0.8;
    });
    const pessimisticCalc = new ROICalculator(pessimisticSavings);
    scenarios.pessimisticSavings = pessimisticCalc.calculate();
    
    // Escenario 2: Ahorros +20%
    const optimisticSavings = { ...this.config };
    Object.keys(optimisticSavings.monthlySavings).forEach(key => {
      optimisticSavings.monthlySavings[key] *= 1.2;
    });
    const optimisticCalc = new ROICalculator(optimisticSavings);
    scenarios.optimisticSavings = optimisticCalc.calculate();
    
    // Escenario 3: Costos +20%
    const higherCosts = { ...this.config };
    Object.keys(higherCosts.oneTimeCosts).forEach(key => {
      higherCosts.oneTimeCosts[key] *= 1.2;
    });
    Object.keys(higherCosts.monthlyCosts).forEach(key => {
      higherCosts.monthlyCosts[key] *= 1.2;
    });
    const higherCostsCalc = new ROICalculator(higherCosts);
    scenarios.higherCosts = higherCostsCalc.calculate();
    
    // Escenario 4: Adopción lenta
    const slowAdoption = { ...this.config };
    slowAdoption.adjustmentFactors = { ...slowAdoption.adjustmentFactors };
    slowAdoption.adjustmentFactors.adoptionCurve = [0.3, 0.5, 0.7, 0.9];
    const slowAdoptionCalc = new ROICalculator(slowAdoption);
    scenarios.slowAdoption = slowAdoptionCalc.calculate();
    
    return {
      baseline: baselineResult,
      scenarios,
      comparison: {
        pessimisticSavings: {
          roiChange: scenarios.pessimisticSavings.summary.roi - baselineResult.summary.roi,
          paybackChange: scenarios.pessimisticSavings.summary.actualPaybackMonths - baselineResult.summary.actualPaybackMonths
        },
        optimisticSavings: {
          roiChange: scenarios.optimisticSavings.summary.roi - baselineResult.summary.roi,
          paybackChange: scenarios.optimisticSavings.summary.actualPaybackMonths - baselineResult.summary.actualPaybackMonths
        },
        higherCosts: {
          roiChange: scenarios.higherCosts.summary.roi - baselineResult.summary.roi,
          paybackChange: scenarios.higherCosts.summary.actualPaybackMonths - baselineResult.summary.actualPaybackMonths
        },
        slowAdoption: {
          roiChange: scenarios.slowAdoption.summary.roi - baselineResult.summary.roi,
          paybackChange: scenarios.slowAdoption.summary.actualPaybackMonths - baselineResult.summary.actualPaybackMonths
        }
      }
    };
  }

  /**
   * Exportar configuración actual
   */
  exportConfig() {
    return {
      timestamp: new Date().toISOString(),
      config: this.config,
      note: 'Esta configuración puede ser ajustada por el administrador'
    };
  }

  /**
   * Importar configuración
   */
  static fromConfig(config) {
    return new ROICalculator(config);
  }
}

/**
 * Funciones de gestión de configuraciones guardadas
 */
class ROIConfigurationManager {
  /**
   * Crear nueva configuración
   */
  static async createConfiguration(organizationId, configData, userId) {
    try {
      const config = new ROIConfiguration({
        organizationId,
        name: configData.name,
        description: configData.description,
        paybackPeriodYears: configData.paybackPeriodYears,
        oneTimeCosts: configData.oneTimeCosts,
        monthlyCosts: configData.monthlyCosts,
        monthlySavings: configData.monthlySavings,
        adjustmentFactors: configData.adjustmentFactors,
        advanced: configData.advanced,
        createdBy: userId,
        lastModifiedBy: userId
      });
      
      await config.save();
      logger.info(`Configuración ROI creada: ${config._id} para org ${organizationId}`);
      
      return config;
      
    } catch (error) {
      logger.error('Error al crear configuración ROI:', error);
      throw error;
    }
  }

  /**
   * Obtener configuración activa de una organización
   */
  static async getActiveConfiguration(organizationId) {
    try {
      const config = await ROIConfiguration.findOne({
        organizationId,
        isActive: true
      }).sort({ createdAt: -1 });
      
      return config;
      
    } catch (error) {
      logger.error('Error al obtener configuración activa:', error);
      throw error;
    }
  }

  /**
   * Listar todas las configuraciones de una organización
   */
  static async listConfigurations(organizationId) {
    try {
      const configs = await ROIConfiguration.find({ organizationId })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');
      
      return configs;
      
    } catch (error) {
      logger.error('Error al listar configuraciones:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración
   */
  static async updateConfiguration(configId, updates, userId) {
    try {
      const config = await ROIConfiguration.findById(configId);
      if (!config) {
        throw new Error('Configuración no encontrada');
      }
      
      Object.assign(config, updates);
      config.lastModifiedBy = userId;
      config.updatedAt = new Date();
      
      await config.save();
      logger.info(`Configuración ROI actualizada: ${configId}`);
      
      return config;
      
    } catch (error) {
      logger.error('Error al actualizar configuración:', error);
      throw error;
    }
  }

  /**
   * Eliminar (desactivar) configuración
   */
  static async deleteConfiguration(configId) {
    try {
      const config = await ROIConfiguration.findById(configId);
      if (!config) {
        throw new Error('Configuración no encontrada');
      }
      
      config.isActive = false;
      await config.save();
      
      logger.info(`Configuración ROI desactivada: ${configId}`);
      return config;
      
    } catch (error) {
      logger.error('Error al eliminar configuración:', error);
      throw error;
    }
  }
}

// Exportar clases y modelos
module.exports = ROICalculator;
module.exports.ROIConfiguration = ROIConfiguration;
module.exports.ROIConfigurationManager = ROIConfigurationManager;
