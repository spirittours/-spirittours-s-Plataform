/**
 * Dual Review System - AI + Human Review
 * 
 * Sistema de revisión dual que permite a administradores y contables activar/desactivar
 * el procesamiento automático mediante IA. Cuando está desactivado, todas las transacciones
 * requieren revisión humana antes de procesarse.
 * 
 * Características clave:
 * - Toggle ON/OFF desde Dashboard
 * - Umbrales configurables por monto, riesgo y confianza de fraude
 * - Reglas por rol (admin, contador jefe, contador, asistente)
 * - Cola de transacciones pendientes de revisión
 * - Workflow de aprobación/rechazo
 * - Auditoría completa de decisiones
 * 
 * @module DualReviewSystem
 * @requires mongoose
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

/**
 * Schema para la configuración de revisión dual
 */
const ReviewConfigSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  country: { type: String, enum: ['USA', 'Mexico'], required: true },
  
  // 🔴 CONFIGURACIÓN PRINCIPAL - Toggle ON/OFF
  autoProcessing: {
    enabled: { type: Boolean, default: true },  // ON = Automático, OFF = Revisión humana
    label: { type: String, default: 'Procesamiento Automático IA' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedAt: { type: Date, default: Date.now }
  },
  
  // Umbrales configurables para procesamiento automático
  autoProcessingThresholds: {
    // Monto máximo para auto-procesar
    maxAmount: {
      USD: { type: Number, default: 5000 },      // $5,000 USD
      MXN: { type: Number, default: 100000 }     // $100,000 MXN
    },
    
    // Score de riesgo máximo (0-100)
    riskScore: {
      maxScore: { type: Number, default: 30, min: 0, max: 100 },
      description: 'Score máximo de riesgo para auto-procesar (0=sin riesgo, 100=muy riesgoso)'
    },
    
    // Confianza de fraude máxima (0-100)
    fraudConfidence: {
      maxConfidence: { type: Number, default: 20, min: 0, max: 100 },
      description: 'Confianza máxima de fraude para auto-procesar (0=sin fraude, 100=fraude seguro)'
    }
  },
  
  // Reglas de automatización por rol
  automationByRole: {
    admin: {
      canAutoProcess: { type: Boolean, default: true },
      maxAmount: { USD: 50000, MXN: 1000000 },
      requiresSecondApproval: { type: Boolean, default: false }
    },
    headAccountant: {
      canAutoProcess: { type: Boolean, default: true },
      maxAmount: { USD: 25000, MXN: 500000 },
      requiresSecondApproval: { type: Boolean, default: true }
    },
    accountant: {
      canAutoProcess: { type: Boolean, default: false },
      maxAmount: { USD: 10000, MXN: 200000 },
      requiresSecondApproval: { type: Boolean, default: true }
    },
    assistant: {
      canAutoProcess: { type: Boolean, default: false },
      maxAmount: { USD: 1000, MXN: 20000 },
      requiresSecondApproval: { type: Boolean, default: true }
    }
  },
  
  // Casos de revisión obligatoria (siempre requieren humano)
  mandatoryReviewCases: {
    newVendor: { type: Boolean, default: true },              // Proveedor nuevo
    newCustomer: { type: Boolean, default: false },            // Cliente nuevo
    highRiskCountry: { type: Boolean, default: true },         // País alto riesgo
    executiveExpense: { type: Boolean, default: true },        // Gasto de ejecutivos
    intercompanyTransaction: { type: Boolean, default: true }, // Transacciones entre empresas
    foreignCurrency: { type: Boolean, default: false },        // Moneda extranjera
    manualJournalEntry: { type: Boolean, default: true }       // Asientos manuales
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ReviewConfig = mongoose.model('ReviewConfig', ReviewConfigSchema);

/**
 * Schema para transacciones en cola de revisión
 */
const ReviewQueueSchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  transactionType: { type: String, required: true }, // 'invoice', 'payment', 'expense', etc.
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  
  // Datos de la transacción
  transactionData: {
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['USD', 'MXN'], required: true },
    description: { type: String },
    vendor: { type: Object },
    customer: { type: Object },
    date: { type: Date, required: true }
  },
  
  // Análisis AI
  aiAnalysis: {
    riskScore: { type: Number, min: 0, max: 100 },
    fraudConfidence: { type: Number, min: 0, max: 100 },
    fraudAlerts: [{ type: Object }],
    recommendations: [{ type: String }],
    complianceIssues: [{ type: Object }]
  },
  
  // Razón de revisión requerida
  reviewReason: {
    type: { type: String, enum: [
      'auto_processing_disabled',    // Procesamiento automático desactivado
      'exceeds_amount_threshold',    // Excede umbral de monto
      'high_risk_score',             // Score de riesgo alto
      'high_fraud_confidence',       // Alta confianza de fraude
      'mandatory_case',              // Caso de revisión obligatoria
      'user_role_restriction',       // Restricción por rol de usuario
      'ai_recommendation'            // Recomendación del AI
    ]},
    details: { type: String }
  },
  
  // Estado de revisión
  status: {
    type: String,
    enum: ['pending', 'in_review', 'approved', 'rejected', 'escalated'],
    default: 'pending'
  },
  
  // Asignación
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: { type: Date },
  
  // Revisión
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewDecision: {
    approved: { type: Boolean },
    reason: { type: String },
    modifications: { type: Object },
    comments: { type: String }
  },
  
  // Segunda aprobación (si es requerida)
  secondApprovalRequired: { type: Boolean, default: false },
  secondApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  secondApprovedAt: { type: Date },
  
  // Prioridad (basada en monto y riesgo)
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // SLA
  createdAt: { type: Date, default: Date.now },
  dueDate: { type: Date },  // Fecha límite de revisión
  
  // Auditoría
  auditLog: [{
    action: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    details: { type: Object }
  }]
}, { timestamps: true });

ReviewQueueSchema.index({ status: 1, priority: -1, createdAt: 1 });
ReviewQueueSchema.index({ organizationId: 1, status: 1 });
ReviewQueueSchema.index({ assignedTo: 1, status: 1 });

const ReviewQueue = mongoose.model('ReviewQueue', ReviewQueueSchema);

/**
 * Sistema de Revisión Dual
 */
class DualReviewSystem {
  constructor(config = {}) {
    this.config = {
      slaHours: config.slaHours || 24,  // SLA por defecto: 24 horas
      autoAssign: config.autoAssign !== false,  // Auto-asignar por defecto
      ...config
    };
    
    // Estadísticas en memoria (para métricas rápidas)
    this.stats = {
      totalReviewed: 0,
      autoProcessed: 0,
      humanReviewed: 0,
      approved: 0,
      rejected: 0,
      avgReviewTimeMinutes: 0
    };
  }

  /**
   * 🔴 FUNCIÓN PRINCIPAL: Determina si una transacción requiere revisión humana
   * 
   * @param {Object} transaction - Transacción a evaluar
   * @param {Number} transaction.amount - Monto
   * @param {String} transaction.currency - Moneda (USD, MXN)
   * @param {Number} transaction.riskScore - Score de riesgo (0-100)
   * @param {Number} transaction.fraudConfidence - Confianza de fraude (0-100)
   * @param {String} transaction.type - Tipo de transacción
   * @param {Object} transaction.vendor - Información del proveedor
   * @param {Object} transaction.customer - Información del cliente
   * @param {String} transaction.userId - ID del usuario que crea la transacción
   * @param {String} transaction.organizationId - ID de la organización
   * @param {String} transaction.country - País (USA, Mexico)
   * @returns {Promise<Object>} { requiresReview: boolean, reason: string, details: object }
   */
  async requiresHumanReview(transaction) {
    try {
      // 1. Obtener configuración de revisión
      const config = await this.getReviewConfig(
        transaction.organizationId,
        transaction.branchId,
        transaction.country
      );
      
      // 2. 🔴 VERIFICACIÓN PRINCIPAL: ¿Está activado el procesamiento automático?
      if (!config.autoProcessing.enabled) {
        return {
          requiresReview: true,
          reason: 'auto_processing_disabled',
          details: {
            message: 'Procesamiento automático desactivado por administrador',
            config: config.autoProcessing
          }
        };
      }
      
      // 3. Verificar casos de revisión obligatoria
      const mandatoryCheck = await this.checkMandatoryReview(transaction, config);
      if (mandatoryCheck.required) {
        return {
          requiresReview: true,
          reason: 'mandatory_case',
          details: mandatoryCheck
        };
      }
      
      // 4. Verificar umbrales de monto
      const amountCheck = this.checkAmountThreshold(transaction, config);
      if (amountCheck.exceeded) {
        return {
          requiresReview: true,
          reason: 'exceeds_amount_threshold',
          details: amountCheck
        };
      }
      
      // 5. Verificar score de riesgo
      if (transaction.riskScore > config.autoProcessingThresholds.riskScore.maxScore) {
        return {
          requiresReview: true,
          reason: 'high_risk_score',
          details: {
            message: 'Score de riesgo excede el umbral',
            riskScore: transaction.riskScore,
            threshold: config.autoProcessingThresholds.riskScore.maxScore
          }
        };
      }
      
      // 6. Verificar confianza de fraude
      if (transaction.fraudConfidence > config.autoProcessingThresholds.fraudConfidence.maxConfidence) {
        return {
          requiresReview: true,
          reason: 'high_fraud_confidence',
          details: {
            message: 'Confianza de fraude excede el umbral',
            fraudConfidence: transaction.fraudConfidence,
            threshold: config.autoProcessingThresholds.fraudConfidence.maxConfidence
          }
        };
      }
      
      // 7. Verificar restricciones por rol del usuario
      if (transaction.userId) {
        const roleCheck = await this.checkUserRoleRestrictions(transaction, config);
        if (roleCheck.restricted) {
          return {
            requiresReview: true,
            reason: 'user_role_restriction',
            details: roleCheck
          };
        }
      }
      
      // ✅ APROBADO PARA PROCESAMIENTO AUTOMÁTICO
      this.stats.autoProcessed++;
      return {
        requiresReview: false,
        reason: 'auto_processing_approved',
        details: {
          message: 'Transacción aprobada para procesamiento automático',
          autoProcessing: true
        }
      };
      
    } catch (error) {
      logger.error('Error en requiresHumanReview:', error);
      
      // En caso de error, por seguridad, requerir revisión humana
      return {
        requiresReview: true,
        reason: 'error',
        details: {
          message: 'Error al evaluar transacción, requiere revisión por seguridad',
          error: error.message
        }
      };
    }
  }

  /**
   * Obtener configuración de revisión (con cache)
   */
  async getReviewConfig(organizationId, branchId, country) {
    let config = await ReviewConfig.findOne({
      organizationId,
      branchId: branchId || null,
      country
    });
    
    // Si no existe configuración, crear con valores por defecto
    if (!config) {
      config = await this.createDefaultConfig(organizationId, branchId, country);
    }
    
    return config;
  }

  /**
   * Crear configuración por defecto
   */
  async createDefaultConfig(organizationId, branchId, country) {
    const defaultConfig = {
      organizationId,
      branchId,
      country,
      autoProcessing: {
        enabled: true,
        label: 'Procesamiento Automático IA'
      },
      autoProcessingThresholds: {
        maxAmount: {
          USD: 5000,
          MXN: 100000
        },
        riskScore: {
          maxScore: 30,
          description: 'Score máximo de riesgo para auto-procesar'
        },
        fraudConfidence: {
          maxConfidence: 20,
          description: 'Confianza máxima de fraude para auto-procesar'
        }
      },
      automationByRole: {
        admin: {
          canAutoProcess: true,
          maxAmount: { USD: 50000, MXN: 1000000 },
          requiresSecondApproval: false
        },
        headAccountant: {
          canAutoProcess: true,
          maxAmount: { USD: 25000, MXN: 500000 },
          requiresSecondApproval: true
        },
        accountant: {
          canAutoProcess: false,
          maxAmount: { USD: 10000, MXN: 200000 },
          requiresSecondApproval: true
        },
        assistant: {
          canAutoProcess: false,
          maxAmount: { USD: 1000, MXN: 20000 },
          requiresSecondApproval: true
        }
      },
      mandatoryReviewCases: {
        newVendor: true,
        newCustomer: false,
        highRiskCountry: true,
        executiveExpense: true,
        intercompanyTransaction: true,
        foreignCurrency: false,
        manualJournalEntry: true
      }
    };
    
    const config = new ReviewConfig(defaultConfig);
    await config.save();
    
    logger.info(`Configuración de revisión dual creada: ${organizationId} - ${country}`);
    return config;
  }

  /**
   * Verificar casos de revisión obligatoria
   */
  async checkMandatoryReview(transaction, config) {
    const mandatory = config.mandatoryReviewCases;
    const checks = [];
    
    // Proveedor nuevo
    if (mandatory.newVendor && transaction.vendor?.isNew) {
      checks.push({
        case: 'newVendor',
        message: 'Proveedor nuevo requiere revisión',
        vendorName: transaction.vendor.name
      });
    }
    
    // Cliente nuevo
    if (mandatory.newCustomer && transaction.customer?.isNew) {
      checks.push({
        case: 'newCustomer',
        message: 'Cliente nuevo requiere revisión',
        customerName: transaction.customer.name
      });
    }
    
    // País de alto riesgo
    if (mandatory.highRiskCountry) {
      const highRiskCountries = ['AF', 'BY', 'CF', 'CD', 'CU', 'IR', 'IQ', 'KP', 'LB', 'LY', 'SD', 'SO', 'SS', 'SY', 'VE', 'YE', 'ZW'];
      const vendorCountry = transaction.vendor?.country;
      const customerCountry = transaction.customer?.country;
      
      if (highRiskCountries.includes(vendorCountry) || highRiskCountries.includes(customerCountry)) {
        checks.push({
          case: 'highRiskCountry',
          message: 'País de alto riesgo detectado',
          countries: [vendorCountry, customerCountry].filter(Boolean)
        });
      }
    }
    
    // Gasto de ejecutivos
    if (mandatory.executiveExpense && transaction.type === 'expense') {
      const executiveRoles = ['CEO', 'CFO', 'COO', 'CTO', 'President', 'VP'];
      const employeeTitle = transaction.employee?.title;
      
      if (executiveRoles.some(role => employeeTitle?.includes(role))) {
        checks.push({
          case: 'executiveExpense',
          message: 'Gasto de ejecutivo requiere revisión',
          employee: transaction.employee?.name,
          title: employeeTitle
        });
      }
    }
    
    // Transacción entre empresas
    if (mandatory.intercompanyTransaction && transaction.isIntercompany) {
      checks.push({
        case: 'intercompanyTransaction',
        message: 'Transacción entre empresas requiere revisión',
        fromCompany: transaction.fromCompany,
        toCompany: transaction.toCompany
      });
    }
    
    // Moneda extranjera (diferente a la base)
    if (mandatory.foreignCurrency) {
      const baseCurrency = transaction.country === 'USA' ? 'USD' : 'MXN';
      if (transaction.currency !== baseCurrency) {
        checks.push({
          case: 'foreignCurrency',
          message: 'Moneda extranjera requiere revisión',
          currency: transaction.currency,
          baseCurrency
        });
      }
    }
    
    // Asiento manual
    if (mandatory.manualJournalEntry && transaction.type === 'journal_entry' && transaction.isManual) {
      checks.push({
        case: 'manualJournalEntry',
        message: 'Asiento manual requiere revisión',
        entryType: transaction.journalEntryType
      });
    }
    
    if (checks.length > 0) {
      return {
        required: true,
        checks,
        message: `${checks.length} caso(s) de revisión obligatoria detectado(s)`
      };
    }
    
    return { required: false };
  }

  /**
   * Verificar umbral de monto
   */
  checkAmountThreshold(transaction, config) {
    const currency = transaction.currency;
    const maxAmount = config.autoProcessingThresholds.maxAmount[currency];
    
    if (transaction.amount > maxAmount) {
      return {
        exceeded: true,
        message: `Monto excede umbral de procesamiento automático`,
        amount: transaction.amount,
        threshold: maxAmount,
        currency,
        difference: transaction.amount - maxAmount
      };
    }
    
    return { exceeded: false };
  }

  /**
   * Verificar restricciones por rol del usuario
   */
  async checkUserRoleRestrictions(transaction, config) {
    // Obtener información del usuario
    const User = mongoose.model('User');
    const user = await User.findById(transaction.userId);
    
    if (!user) {
      return {
        restricted: true,
        message: 'Usuario no encontrado',
        userId: transaction.userId
      };
    }
    
    const role = user.role;
    const roleConfig = config.automationByRole[role];
    
    if (!roleConfig) {
      return {
        restricted: true,
        message: `Rol no configurado: ${role}`,
        role
      };
    }
    
    // Verificar si el rol puede auto-procesar
    if (!roleConfig.canAutoProcess) {
      return {
        restricted: true,
        message: `El rol ${role} no puede auto-procesar transacciones`,
        role,
        requiresApproval: true
      };
    }
    
    // Verificar monto máximo por rol
    const currency = transaction.currency;
    const maxAmount = roleConfig.maxAmount[currency];
    
    if (transaction.amount > maxAmount) {
      return {
        restricted: true,
        message: `Monto excede límite para rol ${role}`,
        role,
        amount: transaction.amount,
        maxAmount,
        currency,
        requiresApproval: true
      };
    }
    
    return { restricted: false, role, config: roleConfig };
  }

  /**
   * Agregar transacción a la cola de revisión
   */
  async addToReviewQueue(transaction, reviewDecision) {
    try {
      // Calcular prioridad basada en monto y riesgo
      const priority = this.calculatePriority(transaction);
      
      // Calcular fecha límite (SLA)
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + this.config.slaHours);
      
      const queueItem = new ReviewQueue({
        transactionId: transaction.id,
        transactionType: transaction.type,
        organizationId: transaction.organizationId,
        branchId: transaction.branchId,
        transactionData: {
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          vendor: transaction.vendor,
          customer: transaction.customer,
          date: transaction.date || new Date()
        },
        aiAnalysis: {
          riskScore: transaction.riskScore,
          fraudConfidence: transaction.fraudConfidence,
          fraudAlerts: transaction.fraudAlerts || [],
          recommendations: transaction.recommendations || [],
          complianceIssues: transaction.complianceIssues || []
        },
        reviewReason: {
          type: reviewDecision.reason,
          details: JSON.stringify(reviewDecision.details)
        },
        status: 'pending',
        priority,
        dueDate,
        auditLog: [{
          action: 'added_to_queue',
          userId: transaction.userId,
          timestamp: new Date(),
          details: reviewDecision
        }]
      });
      
      await queueItem.save();
      
      // Auto-asignar si está habilitado
      if (this.config.autoAssign) {
        await this.autoAssignReview(queueItem);
      }
      
      logger.info(`Transacción agregada a cola de revisión: ${transaction.id}`);
      this.stats.humanReviewed++;
      
      return queueItem;
      
    } catch (error) {
      logger.error('Error al agregar a cola de revisión:', error);
      throw error;
    }
  }

  /**
   * Calcular prioridad de revisión
   */
  calculatePriority(transaction) {
    const amount = transaction.amount;
    const riskScore = transaction.riskScore || 0;
    const fraudConfidence = transaction.fraudConfidence || 0;
    
    // Criterios de prioridad
    if (fraudConfidence > 80 || riskScore > 80 || amount > 50000) {
      return 'critical';
    } else if (fraudConfidence > 60 || riskScore > 60 || amount > 25000) {
      return 'high';
    } else if (fraudConfidence > 40 || riskScore > 40 || amount > 10000) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Auto-asignar revisión a un contador disponible
   */
  async autoAssignReview(queueItem) {
    try {
      const User = mongoose.model('User');
      
      // Buscar contadores disponibles en la organización
      const availableReviewers = await User.find({
        organizationId: queueItem.organizationId,
        role: { $in: ['admin', 'headAccountant', 'accountant'] },
        isActive: true
      }).sort({ reviewsAssigned: 1 }).limit(1);  // Menos cargado primero
      
      if (availableReviewers.length > 0) {
        const reviewer = availableReviewers[0];
        
        queueItem.assignedTo = reviewer._id;
        queueItem.assignedAt = new Date();
        queueItem.status = 'in_review';
        queueItem.auditLog.push({
          action: 'auto_assigned',
          userId: reviewer._id,
          timestamp: new Date(),
          details: { reviewerName: reviewer.name }
        });
        
        await queueItem.save();
        
        // Incrementar contador de revisiones asignadas
        reviewer.reviewsAssigned = (reviewer.reviewsAssigned || 0) + 1;
        await reviewer.save();
        
        // TODO: Enviar notificación al revisor
        
        logger.info(`Revisión auto-asignada a ${reviewer.name}: ${queueItem._id}`);
      }
      
    } catch (error) {
      logger.error('Error al auto-asignar revisión:', error);
    }
  }

  /**
   * Aprobar transacción
   */
  async approveTransaction(queueItemId, reviewerId, decision) {
    try {
      const queueItem = await ReviewQueue.findById(queueItemId);
      if (!queueItem) {
        throw new Error('Item de revisión no encontrado');
      }
      
      queueItem.reviewedBy = reviewerId;
      queueItem.reviewedAt = new Date();
      queueItem.reviewDecision = {
        approved: true,
        reason: decision.reason,
        modifications: decision.modifications || {},
        comments: decision.comments
      };
      
      // Verificar si requiere segunda aprobación
      const User = mongoose.model('User');
      const reviewer = await User.findById(reviewerId);
      const config = await this.getReviewConfig(
        queueItem.organizationId,
        queueItem.branchId,
        queueItem.transactionData.currency === 'USD' ? 'USA' : 'Mexico'
      );
      
      const roleConfig = config.automationByRole[reviewer.role];
      
      if (roleConfig?.requiresSecondApproval && queueItem.transactionData.amount > roleConfig.maxAmount[queueItem.transactionData.currency] * 0.5) {
        queueItem.secondApprovalRequired = true;
        queueItem.status = 'escalated';
      } else {
        queueItem.status = 'approved';
      }
      
      queueItem.auditLog.push({
        action: 'approved',
        userId: reviewerId,
        timestamp: new Date(),
        details: decision
      });
      
      await queueItem.save();
      
      this.stats.approved++;
      this.stats.totalReviewed++;
      this.updateAvgReviewTime(queueItem);
      
      logger.info(`Transacción aprobada: ${queueItem.transactionId} por ${reviewer.name}`);
      
      return queueItem;
      
    } catch (error) {
      logger.error('Error al aprobar transacción:', error);
      throw error;
    }
  }

  /**
   * Rechazar transacción
   */
  async rejectTransaction(queueItemId, reviewerId, decision) {
    try {
      const queueItem = await ReviewQueue.findById(queueItemId);
      if (!queueItem) {
        throw new Error('Item de revisión no encontrado');
      }
      
      queueItem.reviewedBy = reviewerId;
      queueItem.reviewedAt = new Date();
      queueItem.status = 'rejected';
      queueItem.reviewDecision = {
        approved: false,
        reason: decision.reason,
        comments: decision.comments
      };
      
      queueItem.auditLog.push({
        action: 'rejected',
        userId: reviewerId,
        timestamp: new Date(),
        details: decision
      });
      
      await queueItem.save();
      
      this.stats.rejected++;
      this.stats.totalReviewed++;
      this.updateAvgReviewTime(queueItem);
      
      logger.info(`Transacción rechazada: ${queueItem.transactionId} por revisor ${reviewerId}`);
      
      return queueItem;
      
    } catch (error) {
      logger.error('Error al rechazar transacción:', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración de revisión dual
   */
  async updateConfig(organizationId, branchId, country, updates, userId) {
    try {
      const config = await this.getReviewConfig(organizationId, branchId, country);
      
      // Actualizar campos permitidos
      if (updates.autoProcessing !== undefined) {
        config.autoProcessing.enabled = updates.autoProcessing.enabled;
        config.autoProcessing.lastModifiedBy = userId;
        config.autoProcessing.lastModifiedAt = new Date();
      }
      
      if (updates.autoProcessingThresholds) {
        Object.assign(config.autoProcessingThresholds, updates.autoProcessingThresholds);
      }
      
      if (updates.automationByRole) {
        Object.assign(config.automationByRole, updates.automationByRole);
      }
      
      if (updates.mandatoryReviewCases) {
        Object.assign(config.mandatoryReviewCases, updates.mandatoryReviewCases);
      }
      
      config.updatedAt = new Date();
      await config.save();
      
      logger.info(`Configuración de revisión dual actualizada: ${organizationId} - ${country}`);
      
      return config;
      
    } catch (error) {
      logger.error('Error al actualizar configuración:', error);
      throw error;
    }
  }

  /**
   * Obtener cola de revisión pendiente
   */
  async getPendingReviews(organizationId, filters = {}) {
    const query = {
      organizationId,
      status: { $in: ['pending', 'in_review'] }
    };
    
    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    }
    
    if (filters.priority) {
      query.priority = filters.priority;
    }
    
    if (filters.branchId) {
      query.branchId = filters.branchId;
    }
    
    const reviews = await ReviewQueue.find(query)
      .sort({ priority: -1, createdAt: 1 })
      .limit(filters.limit || 100)
      .populate('assignedTo', 'name email role')
      .lean();
    
    return reviews;
  }

  /**
   * Obtener estadísticas de revisión
   */
  async getStatistics(organizationId, dateRange = {}) {
    const query = { organizationId };
    
    if (dateRange.start && dateRange.end) {
      query.createdAt = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end)
      };
    }
    
    const stats = await ReviewQueue.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$transactionData.amount' },
          avgRiskScore: { $avg: '$aiAnalysis.riskScore' }
        }
      }
    ]);
    
    // Calcular tiempo promedio de revisión
    const avgReviewTime = await ReviewQueue.aggregate([
      { 
        $match: { 
          organizationId, 
          status: { $in: ['approved', 'rejected'] },
          reviewedAt: { $exists: true }
        } 
      },
      {
        $project: {
          reviewTimeMinutes: {
            $divide: [
              { $subtract: ['$reviewedAt', '$createdAt'] },
              60000  // Convertir a minutos
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgReviewTimeMinutes: { $avg: '$reviewTimeMinutes' }
        }
      }
    ]);
    
    return {
      byStatus: stats,
      avgReviewTimeMinutes: avgReviewTime[0]?.avgReviewTimeMinutes || 0,
      inMemoryStats: this.stats
    };
  }

  /**
   * Actualizar tiempo promedio de revisión (en memoria)
   */
  updateAvgReviewTime(queueItem) {
    if (queueItem.reviewedAt && queueItem.createdAt) {
      const reviewTimeMinutes = (queueItem.reviewedAt - queueItem.createdAt) / 60000;
      
      // Promedio móvil
      if (this.stats.avgReviewTimeMinutes === 0) {
        this.stats.avgReviewTimeMinutes = reviewTimeMinutes;
      } else {
        this.stats.avgReviewTimeMinutes = 
          (this.stats.avgReviewTimeMinutes * 0.9) + (reviewTimeMinutes * 0.1);
      }
    }
  }

  /**
   * Toggle procesamiento automático (ON/OFF)
   */
  async toggleAutoProcessing(organizationId, branchId, country, enabled, userId) {
    return await this.updateConfig(
      organizationId,
      branchId,
      country,
      {
        autoProcessing: {
          enabled
        }
      },
      userId
    );
  }

  /**
   * Obtener configuración actual
   */
  async getCurrentConfig(organizationId, branchId, country) {
    return await this.getReviewConfig(organizationId, branchId, country);
  }
}

// Exportar clase y modelos
module.exports = DualReviewSystem;
module.exports.ReviewConfig = ReviewConfig;
module.exports.ReviewQueue = ReviewQueue;
