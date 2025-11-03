/**
 * AI Accounting Agent - Core
 * 
 * Motor principal del agente IA de contabilidad que coordina todas las operaciones inteligentes.
 * Utiliza GPT-4/Claude para procesamiento de lenguaje natural y toma de decisiones.
 * 
 * @module AIAccountingAgentCore
 * @requires openai
 * @requires anthropic
 * @requires langchain
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { PromptTemplate } = require('langchain/prompts');
const { LLMChain } = require('langchain/chains');
const FraudDetectionEngine = require('./fraud-detection-engine');
const DualReviewSystem = require('./dual-review-system');
const ChecklistManager = require('./checklist-manager');
const logger = require('../../utils/logger');

class AIAccountingAgentCore {
  constructor(config = {}) {
    this.config = {
      primaryProvider: config.primaryProvider || 'openai',  // 'openai' or 'anthropic'
      fallbackProvider: config.fallbackProvider || 'openai',
      temperature: config.temperature || 0.1,  // Muy bajo para respuestas consistentes
      maxTokens: config.maxTokens || 4000,
      timeout: config.timeout || 30000,
      ...config
    };

    // Inicializar clientes AI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: this.config.timeout
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Inicializar subsistemas
    this.fraudDetection = new FraudDetectionEngine();
    this.dualReview = new DualReviewSystem();
    this.checklistManager = new ChecklistManager();

    // Contexto de memoria (últimas N interacciones)
    this.conversationMemory = [];
    this.maxMemorySize = 10;

    // Estadísticas
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      providerUsage: { openai: 0, anthropic: 0 }
    };
  }

  /**
   * Procesar transacción completa con IA
   * @param {Object} transaction - Transacción a procesar
   * @returns {Promise<Object>} Resultado del procesamiento
   */
  async processTransaction(transaction) {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      logger.info(`AI Agent: Processing transaction ${transaction.id}`);

      // 1. Análisis inicial con IA
      const analysis = await this.analyzeTransaction(transaction);

      // 2. Detección de fraude
      const fraudCheck = await this.fraudDetection.analyze(transaction);

      // 3. Validación de completitud
      const completeness = await this.validateCompleteness(transaction);

      // 4. Verificación de cumplimiento regulatorio
      const compliance = await this.checkCompliance(transaction);

      // 5. Cálculo de risk score
      const riskScore = this.calculateRiskScore({
        analysis,
        fraudCheck,
        completeness,
        compliance
      });

      // 6. Decisión: ¿Requiere revisión humana?
      const reviewDecision = await this.dualReview.requiresHumanReview({
        ...transaction,
        riskScore,
        fraudConfidence: fraudCheck.confidence,
        aiAnalysis: analysis
      });

      // 7. Generar recomendaciones
      const recommendations = await this.generateRecommendations({
        transaction,
        analysis,
        fraudCheck,
        riskScore
      });

      // Resultado final
      const result = {
        success: true,
        transactionId: transaction.id,
        analysis,
        fraudCheck,
        completeness,
        compliance,
        riskScore,
        reviewRequired: reviewDecision.required,
        reviewReason: reviewDecision.reason,
        recommendations,
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      };

      this.stats.successfulRequests++;
      this.updateAverageResponseTime(result.processingTime);

      logger.info(`AI Agent: Transaction ${transaction.id} processed successfully`);

      return result;

    } catch (error) {
      this.stats.failedRequests++;
      logger.error(`AI Agent: Error processing transaction ${transaction.id}:`, error);

      return {
        success: false,
        transactionId: transaction.id,
        error: error.message,
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Analizar transacción con LLM
   * @param {Object} transaction - Transacción
   * @returns {Promise<Object>} Análisis
   */
  async analyzeTransaction(transaction) {
    const prompt = this.buildAnalysisPrompt(transaction);

    try {
      // Intentar con provider primario
      const response = await this.callLLM(prompt, this.config.primaryProvider);
      return this.parseAnalysisResponse(response);

    } catch (error) {
      logger.warn(`Primary AI provider failed, trying fallback: ${error.message}`);

      // Intentar con fallback
      try {
        const response = await this.callLLM(prompt, this.config.fallbackProvider);
        return this.parseAnalysisResponse(response);
      } catch (fallbackError) {
        logger.error('Both AI providers failed:', fallbackError);
        throw new Error('AI analysis unavailable');
      }
    }
  }

  /**
   * Construir prompt para análisis
   * @param {Object} transaction - Transacción
   * @returns {String} Prompt
   */
  buildAnalysisPrompt(transaction) {
    return `Actúa como un contador experto certificado (CPA) con 20 años de experiencia.

Analiza la siguiente transacción contable y proporciona un análisis detallado:

**DATOS DE LA TRANSACCIÓN:**
${JSON.stringify(transaction, null, 2)}

**INSTRUCCIONES:**
1. Verifica la completitud y validez de todos los datos
2. Identifica cualquier anomalía o problema potencial
3. Valida los cálculos (subtotal, impuestos, total)
4. Verifica el cumplimiento de normas contables (${transaction.country === 'USA' ? 'GAAP, IRS' : 'NIF, SAT'})
5. Identifica riesgos asociados
6. Proporciona recomendaciones específicas

**FORMATO DE RESPUESTA (JSON):**
{
  "isValid": true/false,
  "completeness": {
    "score": 0-100,
    "missingFields": ["campo1", "campo2"],
    "warnings": ["advertencia1"]
  },
  "calculations": {
    "subtotalCorrect": true/false,
    "taxesCorrect": true/false,
    "totalCorrect": true/false,
    "discrepancies": []
  },
  "compliance": {
    "passed": true/false,
    "issues": [],
    "requiredActions": []
  },
  "risks": {
    "level": "low/medium/high/critical",
    "factors": [],
    "mitigation": []
  },
  "recommendations": [],
  "summary": "Resumen ejecutivo del análisis"
}

Responde SOLO con el JSON, sin texto adicional.`;
  }

  /**
   * Llamar a LLM (OpenAI o Anthropic)
   * @param {String} prompt - Prompt
   * @param {String} provider - 'openai' o 'anthropic'
   * @returns {Promise<String>} Respuesta
   */
  async callLLM(prompt, provider) {
    this.stats.providerUsage[provider]++;

    if (provider === 'openai') {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Eres un contador experto que analiza transacciones contables. Respondes siempre en JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' }
      });

      return response.choices[0].message.content;

    } else if (provider === 'anthropic') {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.content[0].text;
    }

    throw new Error(`Unknown AI provider: ${provider}`);
  }

  /**
   * Parsear respuesta del análisis
   * @param {String} response - Respuesta del LLM
   * @returns {Object} Análisis parseado
   */
  parseAnalysisResponse(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.error('Failed to parse AI response:', error);
      
      // Intento de extracción de JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Validar completitud de datos
   * @param {Object} transaction - Transacción
   * @returns {Promise<Object>} Resultado de validación
   */
  async validateCompleteness(transaction) {
    const requiredFields = this.getRequiredFields(transaction.type, transaction.country);
    const missing = [];
    const warnings = [];

    for (const field of requiredFields) {
      if (!this.getNestedProperty(transaction, field)) {
        missing.push(field);
      }
    }

    // Validaciones específicas
    if (transaction.country === 'MX') {
      if (!transaction.cfdiUsoCFDI) warnings.push('CFDI: Uso de CFDI no especificado');
      if (!transaction.cfdiMetodoPago) warnings.push('CFDI: Método de pago no especificado');
    }

    const score = Math.max(0, 100 - (missing.length * 10) - (warnings.length * 5));

    return {
      complete: missing.length === 0,
      score,
      missingFields: missing,
      warnings,
      timestamp: new Date()
    };
  }

  /**
   * Verificar cumplimiento regulatorio
   * @param {Object} transaction - Transacción
   * @returns {Promise<Object>} Resultado de compliance
   */
  async checkCompliance(transaction) {
    const issues = [];
    const requiredActions = [];

    if (transaction.country === 'USA') {
      // Validar Sales Tax
      if (transaction.type === 'income' && !transaction.tax) {
        issues.push('Sales Tax no calculado');
        requiredActions.push('Calcular Sales Tax según estado del cliente');
      }

      // Validar 1099 (si aplica)
      if (transaction.type === 'expense' && transaction.amount >= 600) {
        requiredActions.push('Verificar si requiere 1099 al final del año');
      }

    } else if (transaction.country === 'MX') {
      // Validar CFDI
      if (transaction.type === 'income' && !transaction.cfdiUUID) {
        issues.push('CFDI no generado - OBLIGATORIO para ingresos');
        requiredActions.push('Generar y timbrar CFDI inmediatamente');
      }

      // Validar RFC
      if (transaction.customer && !this.validateRFC(transaction.customer.taxId)) {
        issues.push('RFC del cliente inválido');
        requiredActions.push('Solicitar RFC válido al cliente');
      }
    }

    return {
      passed: issues.length === 0,
      issues,
      requiredActions,
      timestamp: new Date()
    };
  }

  /**
   * Calcular score de riesgo global
   * @param {Object} data - Datos de análisis
   * @returns {Number} Risk score (0-100)
   */
  calculateRiskScore(data) {
    let score = 0;

    // Completitud (peso: 20%)
    score += (100 - data.completeness.score) * 0.2;

    // Fraude (peso: 40%)
    score += data.fraudCheck.confidence * 0.4;

    // Compliance (peso: 20%)
    if (!data.compliance.passed) {
      score += 30 * 0.2;
    }

    // Análisis IA (peso: 20%)
    if (data.analysis.risks) {
      const riskLevels = { low: 10, medium: 40, high: 70, critical: 100 };
      score += (riskLevels[data.analysis.risks.level] || 0) * 0.2;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Generar recomendaciones inteligentes
   * @param {Object} data - Datos de análisis
   * @returns {Promise<Array>} Recomendaciones
   */
  async generateRecommendations(data) {
    const recommendations = [];

    // De la IA
    if (data.analysis.recommendations) {
      recommendations.push(...data.analysis.recommendations);
    }

    // De fraude
    if (data.fraudCheck.alerts && data.fraudCheck.alerts.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'high',
        message: 'Alertas de fraude detectadas - Revisar inmediatamente',
        action: 'review_fraud_alerts'
      });
    }

    // De completitud
    if (data.completeness.score < 80) {
      recommendations.push({
        type: 'data_quality',
        priority: 'medium',
        message: 'Completar datos faltantes para mejorar precisión',
        action: 'complete_missing_fields',
        fields: data.completeness.missingFields
      });
    }

    // De riesgo
    if (data.riskScore > 70) {
      recommendations.push({
        type: 'risk',
        priority: 'high',
        message: 'Score de riesgo elevado - Requiere revisión cuidadosa',
        action: 'manual_review_required'
      });
    }

    return recommendations;
  }

  /**
   * Obtener campos requeridos según tipo y país
   * @param {String} type - Tipo de transacción
   * @param {String} country - País
   * @returns {Array} Lista de campos requeridos
   */
  getRequiredFields(type, country) {
    const common = ['amount', 'date', 'description', 'type'];
    
    if (type === 'income') {
      return [...common, 'customer.name', 'customer.email', 'customer.taxId'];
    }
    
    if (type === 'expense') {
      return [...common, 'vendor.name', 'vendor.taxId'];
    }

    return common;
  }

  /**
   * Obtener propiedad anidada de objeto
   * @param {Object} obj - Objeto
   * @param {String} path - Ruta (ej: 'customer.name')
   * @returns {*} Valor
   */
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, prop) => 
      current ? current[prop] : undefined, obj
    );
  }

  /**
   * Validar RFC mexicano
   * @param {String} rfc - RFC
   * @returns {Boolean} Válido
   */
  validateRFC(rfc) {
    if (!rfc) return false;
    
    // Persona Física: 13 caracteres
    if (rfc.length === 13) {
      return /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/.test(rfc);
    }
    
    // Persona Moral: 12 caracteres
    if (rfc.length === 12) {
      return /^[A-Z]{3}\d{6}[A-Z0-9]{3}$/.test(rfc);
    }

    return false;
  }

  /**
   * Actualizar promedio de tiempo de respuesta
   * @param {Number} responseTime - Tiempo en ms
   */
  updateAverageResponseTime(responseTime) {
    const total = this.stats.averageResponseTime * (this.stats.successfulRequests - 1);
    this.stats.averageResponseTime = (total + responseTime) / this.stats.successfulRequests;
  }

  /**
   * Obtener estadísticas del agente
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      successRate: (this.stats.successfulRequests / this.stats.totalRequests) * 100,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Resetear estadísticas
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      providerUsage: { openai: 0, anthropic: 0 }
    };
  }
}

module.exports = AIAccountingAgentCore;
