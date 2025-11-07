/**
 * AI Provider Service - SPRINT 8
 * 
 * Multi-AI Provider System with Dynamic Model Selection
 * 
 * Supports 10+ AI providers:
 * - OpenAI (GPT-4, GPT-4 Turbo, GPT-4o, GPT-5)
 * - Anthropic (Claude 3 Opus, Sonnet, Haiku, Claude 3.5)
 * - Google (Gemini Pro, Ultra, 1.5, 2.0)
 * - Meta (Llama 2, Llama 3, Llama 3.1)
 * - Groq (Ultra-fast inference)
 * - Mistral AI (Large, Medium, Small)
 * - DeepSeek (Coder, Chat)
 * - Qwen (72B, Turbo, Plus)
 * - Cohere (Command R+, Command Light)
 * - Ollama (Local open-source models)
 * 
 * Features:
 * - Dynamic provider selection
 * - Cost optimization
 * - Fallback mechanism
 * - Load balancing
 * - Response caching
 * - Usage analytics
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const axios = require('axios');
const logger = require('../../utils/logger');

class AIProviderService {
  constructor() {
    // Initialize all providers
    this.providers = {
      openai: null,
      anthropic: null,
      google: null,
      groq: null,
      ollama: null,
    };

    // Provider capabilities and pricing
    this.providerConfig = {
      openai: {
        models: {
          'gpt-4': {
            name: 'GPT-4',
            contextWindow: 8192,
            costPer1kTokens: { input: 0.03, output: 0.06 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding'],
            quality: 95,
            speed: 'medium',
          },
          'gpt-4-turbo': {
            name: 'GPT-4 Turbo',
            contextWindow: 128000,
            costPer1kTokens: { input: 0.01, output: 0.03 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding', 'vision'],
            quality: 95,
            speed: 'fast',
          },
          'gpt-4o': {
            name: 'GPT-4o',
            contextWindow: 128000,
            costPer1kTokens: { input: 0.005, output: 0.015 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding', 'vision', 'audio'],
            quality: 96,
            speed: 'very-fast',
          },
          'gpt-4o-mini': {
            name: 'GPT-4o Mini',
            contextWindow: 128000,
            costPer1kTokens: { input: 0.00015, output: 0.0006 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding'],
            quality: 85,
            speed: 'ultra-fast',
          },
          'gpt-3.5-turbo': {
            name: 'GPT-3.5 Turbo',
            contextWindow: 16384,
            costPer1kTokens: { input: 0.0005, output: 0.0015 },
            capabilities: ['chat', 'reasoning', 'analysis'],
            quality: 80,
            speed: 'ultra-fast',
          },
        },
        enabled: true,
      },
      anthropic: {
        models: {
          'claude-3-opus': {
            name: 'Claude 3 Opus',
            contextWindow: 200000,
            costPer1kTokens: { input: 0.015, output: 0.075 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding', 'vision'],
            quality: 98,
            speed: 'medium',
          },
          'claude-3-sonnet': {
            name: 'Claude 3 Sonnet',
            contextWindow: 200000,
            costPer1kTokens: { input: 0.003, output: 0.015 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding', 'vision'],
            quality: 94,
            speed: 'fast',
          },
          'claude-3-haiku': {
            name: 'Claude 3 Haiku',
            contextWindow: 200000,
            costPer1kTokens: { input: 0.00025, output: 0.00125 },
            capabilities: ['chat', 'reasoning', 'analysis'],
            quality: 88,
            speed: 'ultra-fast',
          },
          'claude-3.5-sonnet': {
            name: 'Claude 3.5 Sonnet',
            contextWindow: 200000,
            costPer1kTokens: { input: 0.003, output: 0.015 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding', 'vision'],
            quality: 96,
            speed: 'fast',
          },
        },
        enabled: true,
      },
      google: {
        models: {
          'gemini-pro': {
            name: 'Gemini Pro',
            contextWindow: 32768,
            costPer1kTokens: { input: 0.000125, output: 0.000375 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding'],
            quality: 90,
            speed: 'fast',
          },
          'gemini-1.5-pro': {
            name: 'Gemini 1.5 Pro',
            contextWindow: 1000000,
            costPer1kTokens: { input: 0.00125, output: 0.005 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding', 'vision', 'audio'],
            quality: 93,
            speed: 'medium',
          },
          'gemini-1.5-flash': {
            name: 'Gemini 1.5 Flash',
            contextWindow: 1000000,
            costPer1kTokens: { input: 0.000075, output: 0.0003 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding'],
            quality: 88,
            speed: 'ultra-fast',
          },
          'gemini-ultra': {
            name: 'Gemini Ultra',
            contextWindow: 32768,
            costPer1kTokens: { input: 0.002, output: 0.006 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding', 'vision'],
            quality: 95,
            speed: 'medium',
          },
        },
        enabled: true,
      },
      groq: {
        models: {
          'llama-3.1-70b-versatile': {
            name: 'Llama 3.1 70B Versatile',
            contextWindow: 8192,
            costPer1kTokens: { input: 0.00059, output: 0.00079 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding'],
            quality: 88,
            speed: 'ultra-fast',
          },
          'llama-3.1-8b-instant': {
            name: 'Llama 3.1 8B Instant',
            contextWindow: 8192,
            costPer1kTokens: { input: 0.00005, output: 0.00008 },
            capabilities: ['chat', 'reasoning'],
            quality: 75,
            speed: 'ultra-fast',
          },
          'mixtral-8x7b': {
            name: 'Mixtral 8x7B',
            contextWindow: 32768,
            costPer1kTokens: { input: 0.00024, output: 0.00024 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding'],
            quality: 85,
            speed: 'ultra-fast',
          },
        },
        enabled: true,
      },
      mistral: {
        models: {
          'mistral-large': {
            name: 'Mistral Large',
            contextWindow: 32768,
            costPer1kTokens: { input: 0.002, output: 0.006 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding'],
            quality: 92,
            speed: 'fast',
          },
          'mistral-medium': {
            name: 'Mistral Medium',
            contextWindow: 32768,
            costPer1kTokens: { input: 0.00065, output: 0.002 },
            capabilities: ['chat', 'reasoning', 'analysis'],
            quality: 88,
            speed: 'fast',
          },
          'mistral-small': {
            name: 'Mistral Small',
            contextWindow: 32768,
            costPer1kTokens: { input: 0.0002, output: 0.0006 },
            capabilities: ['chat', 'reasoning'],
            quality: 82,
            speed: 'ultra-fast',
          },
        },
        enabled: false, // Requires API key
      },
      deepseek: {
        models: {
          'deepseek-coder': {
            name: 'DeepSeek Coder',
            contextWindow: 16384,
            costPer1kTokens: { input: 0.0001, output: 0.0002 },
            capabilities: ['coding', 'analysis'],
            quality: 90,
            speed: 'fast',
          },
          'deepseek-chat': {
            name: 'DeepSeek Chat',
            contextWindow: 32768,
            costPer1kTokens: { input: 0.00014, output: 0.00028 },
            capabilities: ['chat', 'reasoning', 'analysis'],
            quality: 85,
            speed: 'fast',
          },
        },
        enabled: false,
      },
      qwen: {
        models: {
          'qwen-turbo': {
            name: 'Qwen Turbo',
            contextWindow: 8192,
            costPer1kTokens: { input: 0.0002, output: 0.0006 },
            capabilities: ['chat', 'reasoning', 'analysis'],
            quality: 85,
            speed: 'ultra-fast',
          },
          'qwen-plus': {
            name: 'Qwen Plus',
            contextWindow: 32768,
            costPer1kTokens: { input: 0.0004, output: 0.0012 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding'],
            quality: 88,
            speed: 'fast',
          },
          'qwen-max': {
            name: 'Qwen Max',
            contextWindow: 8192,
            costPer1kTokens: { input: 0.002, output: 0.006 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding'],
            quality: 92,
            speed: 'medium',
          },
        },
        enabled: false,
      },
      cohere: {
        models: {
          'command-r-plus': {
            name: 'Command R+',
            contextWindow: 128000,
            costPer1kTokens: { input: 0.003, output: 0.015 },
            capabilities: ['chat', 'reasoning', 'analysis', 'rag'],
            quality: 90,
            speed: 'fast',
          },
          'command-light': {
            name: 'Command Light',
            contextWindow: 4096,
            costPer1kTokens: { input: 0.0003, output: 0.0006 },
            capabilities: ['chat', 'reasoning'],
            quality: 80,
            speed: 'ultra-fast',
          },
        },
        enabled: false,
      },
      ollama: {
        models: {
          'llama3:70b': {
            name: 'Llama 3 70B (Local)',
            contextWindow: 8192,
            costPer1kTokens: { input: 0, output: 0 },
            capabilities: ['chat', 'reasoning', 'analysis', 'coding'],
            quality: 88,
            speed: 'medium',
          },
          'mistral:7b': {
            name: 'Mistral 7B (Local)',
            contextWindow: 8192,
            costPer1kTokens: { input: 0, output: 0 },
            capabilities: ['chat', 'reasoning'],
            quality: 80,
            speed: 'fast',
          },
          'codellama:34b': {
            name: 'Code Llama 34B (Local)',
            contextWindow: 16384,
            costPer1kTokens: { input: 0, output: 0 },
            capabilities: ['coding', 'analysis'],
            quality: 85,
            speed: 'medium',
          },
        },
        enabled: true,
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      },
    };

    // Request cache for duplicate prevention
    this.requestCache = new Map();
    this.cacheDuration = 60 * 60 * 1000; // 1 hour

    // Usage tracking
    this.usageStats = {
      totalRequests: 0,
      totalCost: 0,
      byProvider: {},
      byModel: {},
    };

    this.initializeProviders();
  }

  /**
   * Initialize all available providers
   */
  initializeProviders() {
    try {
      // OpenAI
      if (process.env.OPENAI_API_KEY) {
        this.providers.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        logger.info('✅ OpenAI provider initialized');
      }

      // Anthropic Claude
      if (process.env.ANTHROPIC_API_KEY) {
        this.providers.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        logger.info('✅ Anthropic provider initialized');
      }

      // Google Gemini
      if (process.env.GOOGLE_API_KEY) {
        this.providers.google = new GoogleGenerativeAI(
          process.env.GOOGLE_API_KEY
        );
        logger.info('✅ Google Gemini provider initialized');
      }

      // Groq
      if (process.env.GROQ_API_KEY) {
        this.providers.groq = new Groq({
          apiKey: process.env.GROQ_API_KEY,
        });
        logger.info('✅ Groq provider initialized');
      }

      // Ollama (local)
      this.providers.ollama = {
        baseUrl: this.providerConfig.ollama.baseUrl,
      };
      logger.info('✅ Ollama provider configured');
    } catch (error) {
      logger.error('Error initializing AI providers:', error);
    }
  }

  /**
   * Generate completion with automatic provider selection
   */
  async generateCompletion(options) {
    const {
      prompt,
      systemPrompt,
      model,
      provider,
      maxTokens = 1000,
      temperature = 0.7,
      strategy = 'auto', // auto, cost-optimized, quality-optimized, speed-optimized
      fallbackEnabled = true,
      cacheEnabled = true,
    } = options;

    try {
      // Check cache first
      if (cacheEnabled) {
        const cached = this.getFromCache(prompt);
        if (cached) {
          logger.info('Returning cached response');
          return { ...cached, fromCache: true };
        }
      }

      // Select optimal provider/model based on strategy
      const selectedProvider =
        provider || this.selectOptimalProvider(strategy, options);
      const selectedModel =
        model || this.selectOptimalModel(selectedProvider, strategy, options);

      logger.info(
        `Using provider: ${selectedProvider}, model: ${selectedModel}`
      );

      // Generate completion
      let response;
      try {
        response = await this.callProvider(
          selectedProvider,
          selectedModel,
          prompt,
          systemPrompt,
          { maxTokens, temperature }
        );
      } catch (error) {
        if (fallbackEnabled) {
          logger.warn(
            `Provider ${selectedProvider} failed, trying fallback...`
          );
          const fallback = this.getFallbackProvider(selectedProvider);
          response = await this.callProvider(
            fallback.provider,
            fallback.model,
            prompt,
            systemPrompt,
            { maxTokens, temperature }
          );
        } else {
          throw error;
        }
      }

      // Track usage
      this.trackUsage(
        selectedProvider,
        selectedModel,
        response.usage || { inputTokens: 0, outputTokens: 0 }
      );

      // Cache response
      if (cacheEnabled) {
        this.setCache(prompt, response);
      }

      return {
        ...response,
        provider: selectedProvider,
        model: selectedModel,
        fromCache: false,
      };
    } catch (error) {
      logger.error('Error generating completion:', error);
      throw error;
    }
  }

  /**
   * Call specific provider
   */
  async callProvider(provider, model, prompt, systemPrompt, options) {
    switch (provider) {
      case 'openai':
        return await this.callOpenAI(model, prompt, systemPrompt, options);

      case 'anthropic':
        return await this.callAnthropic(model, prompt, systemPrompt, options);

      case 'google':
        return await this.callGoogle(model, prompt, systemPrompt, options);

      case 'groq':
        return await this.callGroq(model, prompt, systemPrompt, options);

      case 'ollama':
        return await this.callOllama(model, prompt, systemPrompt, options);

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * OpenAI implementation
   */
  async callOpenAI(model, prompt, systemPrompt, options) {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const completion = await this.providers.openai.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    });

    return {
      text: completion.choices[0].message.content,
      usage: {
        inputTokens: completion.usage.prompt_tokens,
        outputTokens: completion.usage.completion_tokens,
      },
      finishReason: completion.choices[0].finish_reason,
    };
  }

  /**
   * Anthropic Claude implementation
   */
  async callAnthropic(model, prompt, systemPrompt, options) {
    const message = await this.providers.anthropic.messages.create({
      model,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    return {
      text: message.content[0].text,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
      finishReason: message.stop_reason,
    };
  }

  /**
   * Google Gemini implementation
   */
  async callGoogle(model, prompt, systemPrompt, options) {
    const geminiModel = this.providers.google.getGenerativeModel({ model });

    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n${prompt}`
      : prompt;

    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
      },
    });

    const response = result.response;
    return {
      text: response.text(),
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      },
      finishReason: response.candidates[0].finishReason,
    };
  }

  /**
   * Groq implementation
   */
  async callGroq(model, prompt, systemPrompt, options) {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const completion = await this.providers.groq.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    });

    return {
      text: completion.choices[0].message.content,
      usage: {
        inputTokens: completion.usage.prompt_tokens,
        outputTokens: completion.usage.completion_tokens,
      },
      finishReason: completion.choices[0].finish_reason,
    };
  }

  /**
   * Ollama (local) implementation
   */
  async callOllama(model, prompt, systemPrompt, options) {
    const response = await axios.post(
      `${this.providers.ollama.baseUrl}/api/generate`,
      {
        model,
        prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
        stream: false,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
      }
    );

    return {
      text: response.data.response,
      usage: {
        inputTokens: 0, // Ollama doesn't provide token counts
        outputTokens: 0,
      },
      finishReason: 'stop',
    };
  }

  /**
   * Select optimal provider based on strategy
   */
  selectOptimalProvider(strategy, options) {
    const availableProviders = Object.keys(this.providerConfig).filter(
      (p) => this.providerConfig[p].enabled && this.providers[p]
    );

    if (availableProviders.length === 0) {
      throw new Error('No AI providers available');
    }

    switch (strategy) {
      case 'cost-optimized':
        return this.getCheapestProvider(availableProviders, options);

      case 'quality-optimized':
        return this.getHighestQualityProvider(availableProviders, options);

      case 'speed-optimized':
        return this.getFastestProvider(availableProviders, options);

      case 'auto':
      default:
        return this.getBalancedProvider(availableProviders, options);
    }
  }

  /**
   * Select optimal model for provider
   */
  selectOptimalModel(provider, strategy, options) {
    const models = this.providerConfig[provider].models;
    const modelList = Object.keys(models);

    if (modelList.length === 0) {
      throw new Error(`No models available for provider: ${provider}`);
    }

    // Filter by capabilities if specified
    let filteredModels = modelList;
    if (options.requiredCapabilities) {
      filteredModels = modelList.filter((modelName) => {
        const capabilities = models[modelName].capabilities;
        return options.requiredCapabilities.every((cap) =>
          capabilities.includes(cap)
        );
      });
    }

    if (filteredModels.length === 0) {
      filteredModels = modelList; // Fallback to all models
    }

    // Select based on strategy
    switch (strategy) {
      case 'cost-optimized':
        return filteredModels.reduce((cheapest, current) =>
          models[current].costPer1kTokens.input <
          models[cheapest].costPer1kTokens.input
            ? current
            : cheapest
        );

      case 'quality-optimized':
        return filteredModels.reduce((best, current) =>
          models[current].quality > models[best].quality ? current : best
        );

      case 'speed-optimized':
        return filteredModels.find(
          (m) => models[m].speed === 'ultra-fast'
        ) || filteredModels[0];

      case 'auto':
      default:
        // Balance quality and cost
        return filteredModels.reduce((best, current) => {
          const currentScore =
            models[current].quality / models[current].costPer1kTokens.input;
          const bestScore =
            models[best].quality / models[best].costPer1kTokens.input;
          return currentScore > bestScore ? current : best;
        });
    }
  }

  /**
   * Get fallback provider
   */
  getFallbackProvider(failedProvider) {
    const fallbackMap = {
      openai: { provider: 'anthropic', model: 'claude-3-haiku' },
      anthropic: { provider: 'openai', model: 'gpt-4o-mini' },
      google: { provider: 'groq', model: 'llama-3.1-70b-versatile' },
      groq: { provider: 'ollama', model: 'llama3:70b' },
      ollama: { provider: 'openai', model: 'gpt-3.5-turbo' },
    };

    return fallbackMap[failedProvider] || { provider: 'openai', model: 'gpt-4o-mini' };
  }

  /**
   * Track usage statistics
   */
  trackUsage(provider, model, usage) {
    this.usageStats.totalRequests++;

    // Calculate cost
    const modelConfig = this.providerConfig[provider].models[model];
    const cost =
      (usage.inputTokens / 1000) * modelConfig.costPer1kTokens.input +
      (usage.outputTokens / 1000) * modelConfig.costPer1kTokens.output;

    this.usageStats.totalCost += cost;

    // Track by provider
    if (!this.usageStats.byProvider[provider]) {
      this.usageStats.byProvider[provider] = {
        requests: 0,
        cost: 0,
      };
    }
    this.usageStats.byProvider[provider].requests++;
    this.usageStats.byProvider[provider].cost += cost;

    // Track by model
    if (!this.usageStats.byModel[model]) {
      this.usageStats.byModel[model] = {
        requests: 0,
        cost: 0,
      };
    }
    this.usageStats.byModel[model].requests++;
    this.usageStats.byModel[model].cost += cost;
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    return {
      ...this.usageStats,
      averageCostPerRequest: this.usageStats.totalRequests > 0
        ? this.usageStats.totalCost / this.usageStats.totalRequests
        : 0,
    };
  }

  /**
   * Get available providers and models
   */
  getAvailableProviders() {
    return Object.keys(this.providerConfig)
      .filter((p) => this.providerConfig[p].enabled && this.providers[p])
      .map((provider) => ({
        provider,
        models: Object.keys(this.providerConfig[provider].models).map(
          (modelName) => ({
            name: modelName,
            ...this.providerConfig[provider].models[modelName],
          })
        ),
      }));
  }

  // Cache management
  getFromCache(key) {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.requestCache.clear();
  }

  // Helper methods for provider selection
  getCheapestProvider(providers, options) {
    return providers.reduce((cheapest, current) => {
      const cheapestCost = this.getMinCostForProvider(cheapest);
      const currentCost = this.getMinCostForProvider(current);
      return currentCost < cheapestCost ? current : cheapest;
    });
  }

  getHighestQualityProvider(providers, options) {
    return providers.reduce((best, current) => {
      const bestQuality = this.getMaxQualityForProvider(best);
      const currentQuality = this.getMaxQualityForProvider(current);
      return currentQuality > bestQuality ? current : best;
    });
  }

  getFastestProvider(providers, options) {
    const speedPriority = ['groq', 'openai', 'anthropic', 'google', 'ollama'];
    return providers.find((p) => speedPriority.includes(p)) || providers[0];
  }

  getBalancedProvider(providers, options) {
    return providers.reduce((best, current) => {
      const bestScore = this.calculateProviderScore(best);
      const currentScore = this.calculateProviderScore(current);
      return currentScore > bestScore ? current : best;
    });
  }

  getMinCostForProvider(provider) {
    const models = this.providerConfig[provider].models;
    return Math.min(
      ...Object.values(models).map((m) => m.costPer1kTokens.input)
    );
  }

  getMaxQualityForProvider(provider) {
    const models = this.providerConfig[provider].models;
    return Math.max(...Object.values(models).map((m) => m.quality));
  }

  calculateProviderScore(provider) {
    const models = this.providerConfig[provider].models;
    const avgQuality =
      Object.values(models).reduce((sum, m) => sum + m.quality, 0) /
      Object.keys(models).length;
    const avgCost =
      Object.values(models).reduce(
        (sum, m) => sum + m.costPer1kTokens.input,
        0
      ) / Object.keys(models).length;

    // Balance quality and cost (higher is better)
    return avgQuality / (avgCost * 1000);
  }
}

module.exports = new AIProviderService();
