/**
 * Multi-AI Orchestrator
 * Sistema inteligente de orquestación de múltiples proveedores de IA
 * Optimiza costos y calidad según caso de uso
 */

const axios = require('axios');
const winston = require('winston');

// Configuración de logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/ai-orchestrator.log' }),
    new winston.transports.Console()
  ]
});

// Configuración de modelos de IA
const AI_MODELS = {
  openai: {
    name: 'OpenAI GPT-4',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-turbo-preview',
    costPer1kTokens: 0.03,
    maxTokens: 8000,
    strengths: ['general', 'creative', 'analysis', 'multilingual'],
    speed: 'medium',
    reliability: 0.98
  },
  grok: {
    name: 'Grok AI',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-beta',
    costPer1kTokens: 0.005,
    maxTokens: 4000,
    strengths: ['fast', 'economical', 'current-events'],
    speed: 'fast',
    reliability: 0.92
  },
  meta: {
    name: 'Meta Llama 3',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-3-70b-chat-hf',
    costPer1kTokens: 0.002,
    maxTokens: 8000,
    strengths: ['opensource', 'privacy', 'coding', 'reasoning'],
    speed: 'fast',
    reliability: 0.95
  },
  qwen: {
    name: 'Qwen',
    endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    model: 'qwen-max',
    costPer1kTokens: 0.001,
    maxTokens: 8000,
    strengths: ['chinese', 'multilingual', 'economical', 'cultural'],
    speed: 'fast',
    reliability: 0.93
  },
  deepseek: {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    costPer1kTokens: 0.0014,
    maxTokens: 32000,
    strengths: ['math', 'logic', 'long-context', 'reasoning'],
    speed: 'medium',
    reliability: 0.94
  },
  claude: {
    name: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-opus-20240229',
    costPer1kTokens: 0.015,
    maxTokens: 200000,
    strengths: ['analysis', 'long-context', 'safety', 'nuanced'],
    speed: 'slow',
    reliability: 0.97
  },
  gemini: {
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    model: 'gemini-pro',
    costPer1kTokens: 0.00025,
    maxTokens: 32000,
    strengths: ['multimodal', 'images', 'economical', 'fast'],
    speed: 'very-fast',
    reliability: 0.91
  }
};

// Estrategias de optimización
const OPTIMIZATION_STRATEGIES = {
  CASCADE: 'cascade',         // Intenta modelos económicos primero
  PARALLEL: 'parallel',       // Múltiples modelos simultáneos
  SPECIALIZED: 'specialized', // Selecciona por caso de uso
  ROUND_ROBIN: 'round_robin', // Distribución equitativa
  COST_OPTIMIZED: 'cost_optimized', // Mínimo costo
  QUALITY_FIRST: 'quality_first'    // Máxima calidad
};

class MultiAIOrchestrator {
  constructor(config = {}) {
    this.config = {
      defaultStrategy: config.defaultStrategy || OPTIMIZATION_STRATEGIES.CASCADE,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
      fallbackChain: config.fallbackChain || ['grok', 'meta', 'qwen', 'openai'],
      costLimit: config.costLimit || 0.05, // $0.05 por request
      ...config
    };

    this.usageStats = {
      requests: 0,
      successes: 0,
      failures: 0,
      totalCost: 0,
      modelUsage: {}
    };

    // Inicializar estadísticas por modelo
    Object.keys(AI_MODELS).forEach(model => {
      this.usageStats.modelUsage[model] = {
        requests: 0,
        successes: 0,
        failures: 0,
        totalTokens: 0,
        totalCost: 0,
        avgResponseTime: 0
      };
    });
  }

  /**
   * Genera respuesta usando la estrategia configurada
   */
  async generate(prompt, options = {}) {
    this.usageStats.requests++;
    const startTime = Date.now();

    const {
      strategy = this.config.defaultStrategy,
      perspective = 'general',
      language = 'es',
      maxTokens = 1000,
      temperature = 0.7,
      useCase = 'general'
    } = options;

    try {
      let response;

      switch (strategy) {
        case OPTIMIZATION_STRATEGIES.CASCADE:
          response = await this._cascadeStrategy(prompt, options);
          break;
        case OPTIMIZATION_STRATEGIES.PARALLEL:
          response = await this._parallelStrategy(prompt, options);
          break;
        case OPTIMIZATION_STRATEGIES.SPECIALIZED:
          response = await this._specializedStrategy(prompt, options, useCase);
          break;
        case OPTIMIZATION_STRATEGIES.COST_OPTIMIZED:
          response = await this._costOptimizedStrategy(prompt, options);
          break;
        case OPTIMIZATION_STRATEGIES.QUALITY_FIRST:
          response = await this._qualityFirstStrategy(prompt, options);
          break;
        default:
          response = await this._cascadeStrategy(prompt, options);
      }

      this.usageStats.successes++;
      const responseTime = Date.now() - startTime;

      logger.info('AI generation successful', {
        strategy,
        model: response.model,
        tokens: response.tokens,
        cost: response.cost,
        responseTime
      });

      return {
        success: true,
        content: response.content,
        model: response.model,
        tokens: response.tokens,
        cost: response.cost,
        responseTime,
        metadata: response.metadata
      };

    } catch (error) {
      this.usageStats.failures++;
      logger.error('AI generation failed', { error: error.message, strategy });
      
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  /**
   * Estrategia en cascada: Intenta modelos económicos primero
   */
  async _cascadeStrategy(prompt, options) {
    const fallbackChain = this.config.fallbackChain;

    for (const modelKey of fallbackChain) {
      try {
        logger.info(`Trying model: ${modelKey}`);
        const response = await this._callModel(modelKey, prompt, options);
        return response;
      } catch (error) {
        logger.warn(`Model ${modelKey} failed, trying next...`, { error: error.message });
        continue;
      }
    }

    throw new Error('All models in cascade failed');
  }

  /**
   * Estrategia paralela: Llama a múltiples modelos y retorna la mejor respuesta
   */
  async _parallelStrategy(prompt, options) {
    const modelsToTry = ['grok', 'meta', 'qwen'];
    
    const promises = modelsToTry.map(model => 
      this._callModel(model, prompt, options)
        .catch(error => ({ error: error.message, model }))
    );

    const results = await Promise.all(promises);
    const successfulResults = results.filter(r => !r.error);

    if (successfulResults.length === 0) {
      throw new Error('All parallel models failed');
    }

    // Retorna la respuesta con mejor calidad (estimada por longitud y coherencia)
    return successfulResults.sort((a, b) => {
      const scoreA = a.content.length * AI_MODELS[a.model].reliability;
      const scoreB = b.content.length * AI_MODELS[b.model].reliability;
      return scoreB - scoreA;
    })[0];
  }

  /**
   * Estrategia especializada: Selecciona modelo según caso de uso
   */
  async _specializedStrategy(prompt, options, useCase) {
    const specializations = {
      'religious-perspective': ['claude', 'openai', 'qwen'],
      'historical-context': ['openai', 'claude', 'deepseek'],
      'cultural-explanation': ['qwen', 'claude', 'openai'],
      'route-optimization': ['deepseek', 'meta', 'openai'],
      'social-engagement': ['grok', 'meta', 'gemini'],
      'quick-response': ['grok', 'gemini', 'meta'],
      'multilingual': ['qwen', 'openai', 'gemini'],
      'long-form': ['claude', 'deepseek', 'openai']
    };

    const recommendedModels = specializations[useCase] || ['openai', 'claude'];
    
    for (const modelKey of recommendedModels) {
      try {
        return await this._callModel(modelKey, prompt, options);
      } catch (error) {
        continue;
      }
    }

    // Fallback a estrategia en cascada
    return this._cascadeStrategy(prompt, options);
  }

  /**
   * Estrategia optimizada por costo
   */
  async _costOptimizedStrategy(prompt, options) {
    const cheapestModels = Object.entries(AI_MODELS)
      .sort((a, b) => a[1].costPer1kTokens - b[1].costPer1kTokens)
      .map(([key]) => key);

    for (const modelKey of cheapestModels) {
      try {
        return await this._callModel(modelKey, prompt, options);
      } catch (error) {
        continue;
      }
    }

    throw new Error('All cost-optimized models failed');
  }

  /**
   * Estrategia enfocada en calidad
   */
  async _qualityFirstStrategy(prompt, options) {
    const qualityModels = ['openai', 'claude', 'deepseek'];

    for (const modelKey of qualityModels) {
      try {
        return await this._callModel(modelKey, prompt, options);
      } catch (error) {
        continue;
      }
    }

    throw new Error('All quality models failed');
  }

  /**
   * Llama a un modelo específico
   */
  async _callModel(modelKey, prompt, options) {
    const model = AI_MODELS[modelKey];
    if (!model) {
      throw new Error(`Model ${modelKey} not found`);
    }

    const startTime = Date.now();
    this.usageStats.modelUsage[modelKey].requests++;

    try {
      // Preparar payload según el proveedor
      const payload = this._preparePayload(modelKey, prompt, options);
      const headers = this._getHeaders(modelKey);

      const response = await axios.post(model.endpoint, payload, {
        headers,
        timeout: this.config.timeout
      });

      const content = this._extractContent(modelKey, response.data);
      const tokens = this._extractTokens(modelKey, response.data);
      const cost = (tokens / 1000) * model.costPer1kTokens;

      // Verificar límite de costo
      if (cost > this.config.costLimit) {
        logger.warn(`Cost limit exceeded for ${modelKey}: $${cost.toFixed(4)}`);
      }

      // Actualizar estadísticas
      const responseTime = Date.now() - startTime;
      this.usageStats.modelUsage[modelKey].successes++;
      this.usageStats.modelUsage[modelKey].totalTokens += tokens;
      this.usageStats.modelUsage[modelKey].totalCost += cost;
      this.usageStats.totalCost += cost;

      // Actualizar tiempo promedio de respuesta
      const stats = this.usageStats.modelUsage[modelKey];
      stats.avgResponseTime = (stats.avgResponseTime * (stats.successes - 1) + responseTime) / stats.successes;

      return {
        content,
        model: modelKey,
        tokens,
        cost,
        responseTime,
        metadata: {
          modelName: model.name,
          reliability: model.reliability,
          speed: model.speed
        }
      };

    } catch (error) {
      this.usageStats.modelUsage[modelKey].failures++;
      logger.error(`Model ${modelKey} call failed`, { error: error.message });
      throw error;
    }
  }

  /**
   * Prepara el payload según el proveedor
   */
  _preparePayload(modelKey, prompt, options) {
    const model = AI_MODELS[modelKey];
    const { maxTokens = 1000, temperature = 0.7, systemPrompt } = options;

    // Formato común para la mayoría de modelos (OpenAI-compatible)
    const commonPayload = {
      model: model.model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature
    };

    // Ajustes específicos por proveedor
    switch (modelKey) {
      case 'claude':
        return {
          model: model.model,
          max_tokens: maxTokens,
          messages: commonPayload.messages
        };

      case 'gemini':
        return {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens
          }
        };

      case 'qwen':
        return {
          model: model.model,
          input: {
            messages: commonPayload.messages
          },
          parameters: {
            max_tokens: maxTokens,
            temperature
          }
        };

      default:
        return commonPayload;
    }
  }

  /**
   * Obtiene headers de autenticación según el proveedor
   */
  _getHeaders(modelKey) {
    const apiKeys = {
      openai: process.env.OPENAI_API_KEY,
      grok: process.env.GROK_API_KEY,
      meta: process.env.META_LLAMA_API_KEY || process.env.TOGETHER_API_KEY,
      qwen: process.env.QWEN_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
      claude: process.env.ANTHROPIC_API_KEY,
      gemini: process.env.GOOGLE_AI_API_KEY
    };

    const baseHeaders = {
      'Content-Type': 'application/json'
    };

    switch (modelKey) {
      case 'claude':
        return {
          ...baseHeaders,
          'x-api-key': apiKeys[modelKey],
          'anthropic-version': '2023-06-01'
        };

      case 'gemini':
        // Google usa API key en la URL
        return baseHeaders;

      default:
        return {
          ...baseHeaders,
          'Authorization': `Bearer ${apiKeys[modelKey]}`
        };
    }
  }

  /**
   * Extrae el contenido de la respuesta según el proveedor
   */
  _extractContent(modelKey, data) {
    switch (modelKey) {
      case 'claude':
        return data.content[0].text;

      case 'gemini':
        return data.candidates[0].content.parts[0].text;

      case 'qwen':
        return data.output.choices[0].message.content;

      default:
        return data.choices[0].message.content;
    }
  }

  /**
   * Extrae el conteo de tokens de la respuesta
   */
  _extractTokens(modelKey, data) {
    switch (modelKey) {
      case 'claude':
        return (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

      case 'gemini':
        return data.usageMetadata?.totalTokenCount || 500; // Estimación

      case 'qwen':
        return data.usage?.total_tokens || 500;

      default:
        return data.usage?.total_tokens || 500;
    }
  }

  /**
   * Obtiene estadísticas de uso
   */
  getStats() {
    return {
      ...this.usageStats,
      successRate: (this.usageStats.successes / this.usageStats.requests * 100).toFixed(2) + '%',
      avgCostPerRequest: (this.usageStats.totalCost / this.usageStats.requests).toFixed(4),
      modelStats: Object.entries(this.usageStats.modelUsage).map(([model, stats]) => ({
        model,
        ...stats,
        successRate: stats.requests > 0 ? (stats.successes / stats.requests * 100).toFixed(2) + '%' : '0%',
        avgCost: stats.requests > 0 ? (stats.totalCost / stats.requests).toFixed(4) : '0'
      }))
    };
  }

  /**
   * Resetea estadísticas
   */
  resetStats() {
    this.usageStats = {
      requests: 0,
      successes: 0,
      failures: 0,
      totalCost: 0,
      modelUsage: {}
    };

    Object.keys(AI_MODELS).forEach(model => {
      this.usageStats.modelUsage[model] = {
        requests: 0,
        successes: 0,
        failures: 0,
        totalTokens: 0,
        totalCost: 0,
        avgResponseTime: 0
      };
    });
  }

  /**
   * Obtiene recomendación de modelo según caso de uso
   */
  getRecommendedModel(useCase, constraints = {}) {
    const { maxCost, requiredSpeed, language } = constraints;

    let candidates = Object.entries(AI_MODELS);

    // Filtrar por costo si se especifica
    if (maxCost) {
      candidates = candidates.filter(([_, model]) => 
        model.costPer1kTokens <= maxCost
      );
    }

    // Filtrar por velocidad si se especifica
    if (requiredSpeed) {
      const speedOrder = { 'very-fast': 4, 'fast': 3, 'medium': 2, 'slow': 1 };
      candidates = candidates.filter(([_, model]) => 
        speedOrder[model.speed] >= speedOrder[requiredSpeed]
      );
    }

    // Filtrar por idioma si se especifica
    if (language === 'zh' || language === 'chinese') {
      candidates = candidates.filter(([key, model]) => 
        model.strengths.includes('chinese') || model.strengths.includes('multilingual')
      );
    }

    // Ordenar por confiabilidad y devolver el mejor
    candidates.sort((a, b) => b[1].reliability - a[1].reliability);

    return candidates.length > 0 ? candidates[0][0] : 'openai';
  }
}

// Exportar el orquestador y las estrategias
module.exports = {
  MultiAIOrchestrator,
  OPTIMIZATION_STRATEGIES,
  AI_MODELS
};
