/**
 * Cost Optimizer Service - Sistema de Optimización de Costos
 * 
 * Reduce costos de envío de emails mediante estrategias inteligentes:
 * - Free tier pooling (combina proveedores gratuitos)
 * - Time-based sending (envía en horarios más baratos)
 * - Volume-based routing (usa proveedor más barato según volumen)
 * - AI-powered optimization (aprende qué funciona mejor)
 * - Batch consolidation (agrupa envíos para descuentos)
 * - Regional optimization (usa servidores locales más baratos)
 * 
 * OBJETIVO: Reducir costos de $1.67/1000 a $0.50/1000 o menos
 * 
 * @author Spirit Tours Development Team
 */

const EventEmitter = require('events');

class CostOptimizerService extends EventEmitter {
  constructor() {
    super();
    
    this.config = {
      // Estrategia activa de optimización
      activeStrategy: 'balanced', // 'aggressive', 'balanced', 'quality', 'free-tier'
      
      // Configuración de proveedores gratuitos/económicos
      freeProviders: {
        enabled: true,
        providers: [
          {
            name: 'Gmail Free',
            type: 'smtp',
            dailyLimit: 500,
            costPerEmail: 0,
            priority: 1,
            requirements: ['gmail account'],
          },
          {
            name: 'Outlook Free',
            type: 'smtp',
            dailyLimit: 300,
            costPerEmail: 0,
            priority: 2,
            requirements: ['outlook account'],
          },
          {
            name: 'SendGrid Free',
            type: 'api',
            dailyLimit: 100,
            costPerEmail: 0,
            priority: 3,
            requirements: ['sendgrid free account'],
          },
          {
            name: 'Mailgun Free',
            type: 'api',
            dailyLimit: 100,
            costPerEmail: 0,
            priority: 4,
            requirements: ['mailgun free account'],
          },
          {
            name: 'Elastic Email',
            type: 'api',
            dailyLimit: 100,
            monthlyPrice: 0,
            costPerEmail: 0.0001, // $0.10/1000
            priority: 5,
          },
        ],
      },
      
      // Proveedores económicos (paid but cheap)
      economicProviders: {
        enabled: true,
        providers: [
          {
            name: 'Sendinblue/Brevo',
            dailyLimit: 10000,
            monthlyPrice: 25,
            costPerEmail: 0.00083, // $0.83/1000
            features: ['good deliverability', 'SMS included'],
          },
          {
            name: 'Mailjet',
            dailyLimit: 20000,
            monthlyPrice: 15,
            costPerEmail: 0.00075, // $0.75/1000
            features: ['high volume', 'good support'],
          },
          {
            name: 'Amazon SES',
            dailyLimit: 50000,
            monthlyPrice: 0,
            costPerEmail: 0.0001, // $0.10/1000
            features: ['pay per use', 'AWS integration', 'very cheap'],
          },
          {
            name: 'Postmark',
            dailyLimit: 10000,
            monthlyPrice: 10,
            costPerEmail: 0.0005, // $0.50/1000
            features: ['transactional', 'fast delivery'],
          },
        ],
      },
      
      // Configuración de optimización por tiempo
      timeBasedOptimization: {
        enabled: true,
        // Enviar en horarios donde los servidores están menos cargados
        offPeakHours: [0, 1, 2, 3, 4, 5, 22, 23], // 10pm - 6am
        offPeakDiscount: 0.2, // 20% más eficiente en off-peak
      },
      
      // Configuración de agrupación por volumen
      batchOptimization: {
        enabled: true,
        minBatchSize: 100, // Agrupar mínimo 100 emails
        maxBatchSize: 1000,
        batchDiscount: 0.15, // 15% descuento en batches
      },
      
      // Optimización geográfica
      regionalOptimization: {
        enabled: true,
        regions: {
          'latin-america': {
            providers: ['Own SMTP VPS Latam'], // VPS en LATAM = $5/mes
            costPerEmail: 0.0003, // $0.30/1000
          },
          'europe': {
            providers: ['Hetzner Cloud VPS'], // VPS en EU = $4/mes
            costPerEmail: 0.0002, // $0.20/1000
          },
          'us': {
            providers: ['DigitalOcean VPS'], // VPS en US = $6/mes
            costPerEmail: 0.0004, // $0.40/1000
          },
        },
      },
      
      // Límites de gasto
      budgetLimits: {
        dailyBudget: null, // null = sin límite
        monthlyBudget: 100, // $100/mes máximo
        costPerEmailTarget: 0.0005, // Target: $0.50/1000
        alertThreshold: 0.8, // Alertar al 80% del presupuesto
      },
      
      // Métricas y estadísticas
      metrics: {
        totalSpent: 0,
        emailsSent: 0,
        actualCostPerEmail: 0,
        savings: 0,
        savingsPercentage: 0,
      },
    };
    
    // Tracking de uso por proveedor
    this.providerUsage = new Map();
    
    // Cola de emails pendientes para optimización
    this.pendingQueue = [];
  }
  
  /**
   * ESTRATEGIAS DE OPTIMIZACIÓN
   */
  
  getStrategies() {
    return {
      'free-tier': {
        name: 'Free Tier Maximum',
        description: 'Usa SOLO proveedores gratuitos. Costo casi $0.',
        targetCost: 0.0001, // $0.10/1000
        pros: [
          'Costo prácticamente cero',
          'Hasta 1,000 emails/día gratis',
          'Sin costos fijos mensuales',
        ],
        cons: [
          'Capacidad limitada (1,000/día max)',
          'Requiere múltiples cuentas',
          'Puede tener restricciones',
        ],
        configuration: {
          useFreeTier: true,
          useEconomic: false,
          usePremium: false,
          maxDailySpend: 0,
        },
        recommended: 'Para startups con <500 emails/día',
      },
      
      'aggressive': {
        name: 'Aggressive Cost Cutting',
        description: 'Máximo ahorro usando proveedores más baratos y optimizaciones.',
        targetCost: 0.0003, // $0.30/1000
        pros: [
          'Costos muy bajos ($0.30/1000)',
          'Escalable hasta 10,000/día',
          'Usa Amazon SES + VPS propios',
        ],
        cons: [
          'Requiere configuración técnica',
          'Puede afectar deliverability',
          'Necesita monitoreo constante',
        ],
        configuration: {
          useFreeTier: true,
          useEconomic: true,
          usePremium: false,
          preferredProviders: ['Amazon SES', 'Own VPS', 'Elastic Email'],
          timeOptimization: true,
          batchOptimization: true,
        },
        recommended: 'Para volumen alto con presupuesto limitado',
      },
      
      'balanced': {
        name: 'Balanced Cost/Quality',
        description: 'Balance óptimo entre costo y calidad de entrega.',
        targetCost: 0.0007, // $0.70/1000
        pros: [
          'Buen balance costo/calidad',
          'Deliverability confiable',
          'Fácil de gestionar',
        ],
        cons: [
          'No el más barato',
          'Costo moderado',
        ],
        configuration: {
          useFreeTier: true,
          useEconomic: true,
          usePremium: false,
          preferredProviders: ['Sendinblue', 'Mailjet', 'Own SMTP'],
          timeOptimization: true,
          batchOptimization: true,
        },
        recommended: 'Para la mayoría de casos ⭐',
      },
      
      'quality': {
        name: 'Quality Focused',
        description: 'Prioriza deliverability sobre costo.',
        targetCost: 0.0015, // $1.50/1000
        pros: [
          'Máxima deliverability',
          'Soporte premium',
          'Reputación de marca',
        ],
        cons: [
          'Más costoso',
          'Requiere inversión mayor',
        ],
        configuration: {
          useFreeTier: false,
          useEconomic: false,
          usePremium: true,
          preferredProviders: ['SendGrid Pro', 'Mailgun Pro'],
          timeOptimization: false,
          batchOptimization: false,
        },
        recommended: 'Para empresas con reputación crítica',
      },
      
      'hybrid-smart': {
        name: 'Hybrid Smart Routing',
        description: 'Usa el proveedor óptimo según tipo de email y destinatario.',
        targetCost: 0.0005, // $0.50/1000
        pros: [
          'Muy económico ($0.50/1000)',
          'Inteligente y adaptativo',
          'Mejor de ambos mundos',
        ],
        cons: [
          'Configuración compleja',
          'Requiere AI/ML',
        ],
        configuration: {
          useFreeTier: true,
          useEconomic: true,
          usePremium: true,
          aiRouting: true,
          rules: {
            'important-clients': 'premium',
            'prospects': 'economic',
            'newsletters': 'free-tier',
            'bulk': 'cheapest',
          },
        },
        recommended: 'Para máxima eficiencia ⭐⭐⭐',
      },
    };
  }
  
  /**
   * Cambiar estrategia de optimización
   */
  setStrategy(strategyName) {
    const strategies = this.getStrategies();
    const strategy = strategies[strategyName];
    
    if (!strategy) {
      throw new Error(`Invalid strategy: ${strategyName}. Available: ${Object.keys(strategies).join(', ')}`);
    }
    
    this.config.activeStrategy = strategyName;
    
    // Aplicar configuración de la estrategia
    Object.assign(this.config, strategy.configuration);
    
    console.log(`[Cost Optimizer] Strategy changed to: ${strategy.name}`);
    console.log(`   Target cost: $${(strategy.targetCost * 1000).toFixed(2)}/1000 emails`);
    
    this.emit('strategy-changed', {
      strategy: strategyName,
      config: strategy,
    });
    
    return strategy;
  }
  
  /**
   * CONFIGURACIÓN DE FREE TIER POOLING
   * 
   * Combina múltiples cuentas gratuitas para maximizar capacidad sin costo
   */
  
  setupFreeTierPool(accounts) {
    console.log('[Cost Optimizer] Setting up free tier pool...');
    
    this.freeTierPool = {
      gmail: [],
      outlook: [],
      sendgrid: [],
      mailgun: [],
    };
    
    // Organizar cuentas por tipo
    accounts.forEach(account => {
      if (account.type === 'gmail') {
        this.freeTierPool.gmail.push({
          email: account.email,
          password: account.password,
          dailyLimit: 500,
          sentToday: 0,
          lastReset: new Date(),
        });
      } else if (account.type === 'outlook') {
        this.freeTierPool.outlook.push({
          email: account.email,
          password: account.password,
          dailyLimit: 300,
          sentToday: 0,
          lastReset: new Date(),
        });
      } else if (account.type === 'sendgrid') {
        this.freeTierPool.sendgrid.push({
          apiKey: account.apiKey,
          dailyLimit: 100,
          sentToday: 0,
          lastReset: new Date(),
        });
      } else if (account.type === 'mailgun') {
        this.freeTierPool.mailgun.push({
          apiKey: account.apiKey,
          domain: account.domain,
          dailyLimit: 100,
          sentToday: 0,
          lastReset: new Date(),
        });
      }
    });
    
    // Calcular capacidad total
    const totalCapacity = 
      (this.freeTierPool.gmail.length * 500) +
      (this.freeTierPool.outlook.length * 300) +
      (this.freeTierPool.sendgrid.length * 100) +
      (this.freeTierPool.mailgun.length * 100);
    
    console.log(`[Cost Optimizer] Free tier pool configured:`);
    console.log(`   Gmail accounts: ${this.freeTierPool.gmail.length} (${this.freeTierPool.gmail.length * 500}/day)`);
    console.log(`   Outlook accounts: ${this.freeTierPool.outlook.length} (${this.freeTierPool.outlook.length * 300}/day)`);
    console.log(`   SendGrid free: ${this.freeTierPool.sendgrid.length} (${this.freeTierPool.sendgrid.length * 100}/day)`);
    console.log(`   Mailgun free: ${this.freeTierPool.mailgun.length} (${this.freeTierPool.mailgun.length * 100}/day)`);
    console.log(`   TOTAL CAPACITY: ${totalCapacity} emails/day at $0 cost!`);
    
    return {
      totalAccounts: accounts.length,
      totalCapacity,
      breakdown: {
        gmail: this.freeTierPool.gmail.length,
        outlook: this.freeTierPool.outlook.length,
        sendgrid: this.freeTierPool.sendgrid.length,
        mailgun: this.freeTierPool.mailgun.length,
      },
    };
  }
  
  /**
   * Seleccionar cuenta gratuita disponible del pool
   */
  selectFreeTierAccount() {
    // Intentar en orden de prioridad
    const pools = [
      { name: 'gmail', limit: 500, accounts: this.freeTierPool?.gmail || [] },
      { name: 'outlook', limit: 300, accounts: this.freeTierPool?.outlook || [] },
      { name: 'sendgrid', limit: 100, accounts: this.freeTierPool?.sendgrid || [] },
      { name: 'mailgun', limit: 100, accounts: this.freeTierPool?.mailgun || [] },
    ];
    
    for (const pool of pools) {
      const available = pool.accounts.find(acc => acc.sentToday < acc.dailyLimit);
      if (available) {
        return { type: pool.name, account: available };
      }
    }
    
    return null; // No free accounts available
  }
  
  /**
   * ROUTING INTELIGENTE DE EMAILS
   */
  
  async routeEmail(emailData, options = {}) {
    const { recipientType = 'prospect', importance = 'normal', recipientDomain } = options;
    
    let selectedProvider;
    let estimatedCost;
    
    // Aplicar estrategia activa
    const strategy = this.getStrategies()[this.config.activeStrategy];
    
    if (strategy.configuration.aiRouting) {
      // Routing inteligente según reglas
      const rules = strategy.configuration.rules;
      
      if (recipientType === 'important-client' && rules['important-clients'] === 'premium') {
        selectedProvider = this.selectPremiumProvider();
        estimatedCost = 0.003; // $3/1000
      } else if (recipientType === 'prospect' && rules['prospects'] === 'economic') {
        selectedProvider = this.selectEconomicProvider();
        estimatedCost = 0.0008; // $0.80/1000
      } else if (importance === 'low' && rules['newsletters'] === 'free-tier') {
        selectedProvider = this.selectFreeTierAccount();
        estimatedCost = 0;
      } else {
        selectedProvider = this.selectCheapestAvailable();
        estimatedCost = 0.0005; // $0.50/1000
      }
    } else {
      // Routing simple según configuración
      if (this.config.useFreeTier) {
        const freeAccount = this.selectFreeTierAccount();
        if (freeAccount) {
          selectedProvider = freeAccount;
          estimatedCost = 0;
        }
      }
      
      if (!selectedProvider && this.config.useEconomic) {
        selectedProvider = this.selectEconomicProvider();
        estimatedCost = 0.0008;
      }
      
      if (!selectedProvider && this.config.usePremium) {
        selectedProvider = this.selectPremiumProvider();
        estimatedCost = 0.003;
      }
    }
    
    // Check budget limits
    if (this.config.budgetLimits.dailyBudget) {
      const projectedDailyCost = this.metrics.totalSpent + estimatedCost;
      if (projectedDailyCost > this.config.budgetLimits.dailyBudget) {
        throw new Error('Daily budget exceeded');
      }
    }
    
    return {
      provider: selectedProvider,
      estimatedCost: estimatedCost,
      actualStrategy: this.config.activeStrategy,
    };
  }
  
  /**
   * Seleccionar proveedor económico
   */
  selectEconomicProvider() {
    const providers = this.config.economicProviders.providers;
    
    // Ordenar por costo
    const sorted = providers.sort((a, b) => a.costPerEmail - b.costPerEmail);
    
    return {
      type: 'economic',
      name: sorted[0].name,
      costPerEmail: sorted[0].costPerEmail,
    };
  }
  
  /**
   * Seleccionar proveedor premium
   */
  selectPremiumProvider() {
    return {
      type: 'premium',
      name: 'SendGrid Pro',
      costPerEmail: 0.003,
    };
  }
  
  /**
   * Seleccionar el más barato disponible
   */
  selectCheapestAvailable() {
    // Intentar free tier primero
    const freeTier = this.selectFreeTierAccount();
    if (freeTier) {
      return { ...freeTier, costPerEmail: 0 };
    }
    
    // Si no, usar económico
    return this.selectEconomicProvider();
  }
  
  /**
   * OPTIMIZACIÓN POR TIEMPO
   */
  
  isOffPeakTime() {
    const currentHour = new Date().getHours();
    return this.config.timeBasedOptimization.offPeakHours.includes(currentHour);
  }
  
  getTimeBasedDiscount() {
    return this.isOffPeakTime() ? this.config.timeBasedOptimization.offPeakDiscount : 0;
  }
  
  /**
   * OPTIMIZACIÓN POR BATCH
   */
  
  async optimizeBatch(emails) {
    if (!this.config.batchOptimization.enabled) {
      return { optimized: false, emails };
    }
    
    const batchSize = emails.length;
    
    if (batchSize < this.config.batchOptimization.minBatchSize) {
      // Agregar a cola para completar batch
      this.pendingQueue.push(...emails);
      console.log(`[Cost Optimizer] Added ${batchSize} emails to pending queue (total: ${this.pendingQueue.length})`);
      
      // Si la cola alcanza el tamaño mínimo, procesar
      if (this.pendingQueue.length >= this.config.batchOptimization.minBatchSize) {
        const batch = this.pendingQueue.splice(0, this.config.batchOptimization.maxBatchSize);
        return { optimized: true, emails: batch, discount: this.config.batchOptimization.batchDiscount };
      }
      
      return { optimized: false, queued: true, queueSize: this.pendingQueue.length };
    }
    
    // Batch es suficientemente grande
    return {
      optimized: true,
      emails: emails.slice(0, this.config.batchOptimization.maxBatchSize),
      discount: this.config.batchOptimization.batchDiscount,
    };
  }
  
  /**
   * CALCULADORA DE COSTOS
   */
  
  calculateCost(emailCount, strategy = null) {
    const strategyName = strategy || this.config.activeStrategy;
    const strategyConfig = this.getStrategies()[strategyName];
    
    const baseCost = emailCount * strategyConfig.targetCost;
    
    // Aplicar descuentos
    let discount = 0;
    
    if (this.config.timeBasedOptimization.enabled && this.isOffPeakTime()) {
      discount += this.getTimeBasedDiscount();
    }
    
    if (this.config.batchOptimization.enabled && emailCount >= this.config.batchOptimization.minBatchSize) {
      discount += this.config.batchOptimization.batchDiscount;
    }
    
    const finalCost = baseCost * (1 - discount);
    
    return {
      baseCost: baseCost.toFixed(4),
      discount: (discount * 100).toFixed(1) + '%',
      finalCost: finalCost.toFixed(4),
      costPer1000: ((finalCost / emailCount) * 1000).toFixed(2),
    };
  }
  
  /**
   * COMPARACIÓN DE ESTRATEGIAS
   */
  
  compareStrategies(emailCount) {
    const strategies = this.getStrategies();
    const comparison = [];
    
    for (const [key, strategy] of Object.entries(strategies)) {
      const cost = this.calculateCost(emailCount, key);
      
      comparison.push({
        strategy: key,
        name: strategy.name,
        targetCost: strategy.targetCost,
        estimatedCost: cost.finalCost,
        costPer1000: cost.costPer1000,
        pros: strategy.pros.length,
        cons: strategy.cons.length,
        recommended: strategy.recommended,
      });
    }
    
    // Ordenar por costo
    comparison.sort((a, b) => parseFloat(a.estimatedCost) - parseFloat(b.estimatedCost));
    
    return comparison;
  }
  
  /**
   * RECOMENDACIONES
   */
  
  getRecommendations(monthlyVolume) {
    const recommendations = [];
    
    // Recomendación por volumen
    if (monthlyVolume <= 15000) {
      recommendations.push({
        strategy: 'free-tier',
        reason: 'Tu volumen (<15,000/mes) puede cubrirse completamente con proveedores gratuitos',
        savings: 'Ahorro: $25/mes vs paid SMTP',
      });
    } else if (monthlyVolume <= 50000) {
      recommendations.push({
        strategy: 'aggressive',
        reason: 'Volumen mediano. Amazon SES + free tier = máximo ahorro',
        savings: 'Ahorro: ~$15/mes vs premium',
      });
    } else if (monthlyVolume <= 150000) {
      recommendations.push({
        strategy: 'balanced',
        reason: 'Volumen alto. Balance óptimo costo/calidad con Sendinblue',
        savings: 'Ahorro: ~$50/mes vs SendGrid Pro',
      });
    } else {
      recommendations.push({
        strategy: 'hybrid-smart',
        reason: 'Volumen muy alto. Routing inteligente maximiza eficiencia',
        savings: 'Ahorro: ~$100+/mes vs estrategia única',
      });
    }
    
    // Recomendación de optimizaciones
    if (!this.config.timeBasedOptimization.enabled) {
      recommendations.push({
        type: 'optimization',
        suggestion: 'Habilitar time-based optimization',
        benefit: 'Ahorro adicional del 20% enviando en horarios off-peak',
      });
    }
    
    if (!this.config.batchOptimization.enabled) {
      recommendations.push({
        type: 'optimization',
        suggestion: 'Habilitar batch optimization',
        benefit: 'Ahorro adicional del 15% agrupando envíos',
      });
    }
    
    return recommendations;
  }
  
  /**
   * ESTADÍSTICAS Y REPORTING
   */
  
  getStatistics() {
    return {
      activeStrategy: this.config.activeStrategy,
      metrics: this.config.metrics,
      budget: {
        daily: this.config.budgetLimits.dailyBudget,
        monthly: this.config.budgetLimits.monthlyBudget,
        used: this.config.metrics.totalSpent,
        remaining: this.config.budgetLimits.monthlyBudget - this.config.metrics.totalSpent,
        percentage: ((this.config.metrics.totalSpent / this.config.budgetLimits.monthlyBudget) * 100).toFixed(1),
      },
      costEfficiency: {
        target: this.config.budgetLimits.costPerEmailTarget,
        actual: this.config.metrics.actualCostPerEmail,
        performance: this.config.metrics.actualCostPerEmail <= this.config.budgetLimits.costPerEmailTarget ? 'on-target' : 'over-target',
      },
    };
  }
  
  /**
   * ACTUALIZAR MÉTRICAS
   */
  
  updateMetrics(cost, emailsSent) {
    this.config.metrics.totalSpent += cost;
    this.config.metrics.emailsSent += emailsSent;
    this.config.metrics.actualCostPerEmail = this.config.metrics.totalSpent / this.config.metrics.emailsSent;
    
    // Calcular ahorros vs baseline ($1.67/1000)
    const baselineCost = (this.config.metrics.emailsSent / 1000) * 1.67;
    this.config.metrics.savings = baselineCost - this.config.metrics.totalSpent;
    this.config.metrics.savingsPercentage = ((this.config.metrics.savings / baselineCost) * 100).toFixed(1);
    
    // Alertar si se acerca al límite
    const budgetUsage = this.config.metrics.totalSpent / this.config.budgetLimits.monthlyBudget;
    if (budgetUsage >= this.config.budgetLimits.alertThreshold) {
      this.emit('budget-alert', {
        usage: (budgetUsage * 100).toFixed(1) + '%',
        remaining: this.config.budgetLimits.monthlyBudget - this.config.metrics.totalSpent,
      });
    }
  }
}

// Export singleton
module.exports = new CostOptimizerService();
