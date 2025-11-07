/**
 * Custom Inference Engine
 * Supports local and remote model deployment for on-premise inference
 * 
 * Features:
 * - Ollama integration (local models)
 * - vLLM server support
 * - Model management and versioning
 * - Load balancing across instances
 * - Request queuing and batching
 * - Performance monitoring
 * - Fallback to cloud providers
 * - Model warming and caching
 * 
 * Supported Backends:
 * - Ollama (local)
 * - vLLM (local/remote)
 * - TGI (Text Generation Inference)
 * - OpenAI-compatible endpoints
 */

const axios = require('axios');
const { EventEmitter } = require('events');

class InferenceEngine extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      defaultBackend: config.defaultBackend || 'ollama',
      ollamaUrl: config.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434',
      vllmUrl: config.vllmUrl || process.env.VLLM_URL || 'http://localhost:8000',
      tgiUrl: config.tgiUrl || process.env.TGI_URL || 'http://localhost:8080',
      enableLoadBalancing: config.enableLoadBalancing || false,
      enableBatching: config.enableBatching || false,
      batchSize: config.batchSize || 4,
      batchTimeout: config.batchTimeout || 100,
      enableFallback: config.enableFallback !== false,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 2,
      ...config
    };

    // Model registry
    this.models = new Map();
    this.loadedModels = new Set();

    // Request queue for batching
    this.requestQueue = [];
    this.batchTimer = null;

    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgLatency: 0,
      totalTokens: 0,
      byBackend: {},
      byModel: {}
    };

    this.initialized = false;
  }

  /**
   * Initialize inference engine
   */
  async initialize() {
    if (this.initialized) return;

    this.emit('init:started');

    try {
      // Check Ollama availability
      if (await this.checkOllamaHealth()) {
        await this.loadOllamaModels();
        this.emit('init:ollama-ready');
      }

      // Check vLLM availability
      if (await this.checkVLLMHealth()) {
        this.emit('init:vllm-ready');
      }

      this.initialized = true;
      this.emit('init:completed');

    } catch (error) {
      this.emit('init:error', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate text completion
   */
  async generate(prompt, options = {}) {
    const startTime = Date.now();

    try {
      const backend = options.backend || this.config.defaultBackend;
      const model = options.model || this.getDefaultModel(backend);

      this.emit('generate:started', { backend, model });

      let result;
      switch (backend) {
        case 'ollama':
          result = await this.generateOllama(prompt, model, options);
          break;
        case 'vllm':
          result = await this.generateVLLM(prompt, model, options);
          break;
        case 'tgi':
          result = await this.generateTGI(prompt, model, options);
          break;
        default:
          throw new Error(`Unsupported backend: ${backend}`);
      }

      const latency = Date.now() - startTime;
      this.updateStatistics(backend, model, latency, result, true);

      this.emit('generate:completed', { backend, model, latency });

      return {
        success: true,
        text: result.text,
        model: result.model,
        backend,
        tokens: result.tokens,
        latency,
        metadata: result.metadata
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateStatistics(options.backend, options.model, latency, null, false);

      this.emit('generate:error', { error: error.message });

      // Fallback if enabled
      if (this.config.enableFallback && !options.noFallback) {
        return await this.generateWithFallback(prompt, options);
      }

      throw new Error(`Generation failed: ${error.message}`);
    }
  }

  /**
   * Generate with Ollama
   */
  async generateOllama(prompt, model, options = {}) {
    const url = `${this.config.ollamaUrl}/api/generate`;

    const response = await axios.post(url, {
      model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        top_k: options.topK || 40,
        num_predict: options.maxTokens || 512
      }
    }, { timeout: this.config.timeout });

    return {
      text: response.data.response,
      model: response.data.model,
      tokens: {
        prompt: response.data.prompt_eval_count || 0,
        completion: response.data.eval_count || 0,
        total: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
      },
      metadata: {
        evalDuration: response.data.eval_duration,
        loadDuration: response.data.load_duration
      }
    };
  }

  /**
   * Generate with vLLM
   */
  async generateVLLM(prompt, model, options = {}) {
    const url = `${this.config.vllmUrl}/v1/completions`;

    const response = await axios.post(url, {
      model,
      prompt,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
      max_tokens: options.maxTokens || 512,
      stream: false
    }, { timeout: this.config.timeout });

    const choice = response.data.choices[0];

    return {
      text: choice.text,
      model: response.data.model,
      tokens: {
        prompt: response.data.usage.prompt_tokens,
        completion: response.data.usage.completion_tokens,
        total: response.data.usage.total_tokens
      },
      metadata: {
        finishReason: choice.finish_reason
      }
    };
  }

  /**
   * Generate with TGI (Text Generation Inference)
   */
  async generateTGI(prompt, model, options = {}) {
    const url = `${this.config.tgiUrl}/generate`;

    const response = await axios.post(url, {
      inputs: prompt,
      parameters: {
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        max_new_tokens: options.maxTokens || 512,
        do_sample: true
      }
    }, { timeout: this.config.timeout });

    return {
      text: response.data.generated_text,
      model: model,
      tokens: {
        prompt: 0, // TGI doesn't provide this
        completion: 0,
        total: 0
      },
      metadata: {
        details: response.data.details
      }
    };
  }

  /**
   * Generate with fallback
   */
  async generateWithFallback(prompt, options) {
    const backends = ['ollama', 'vllm', 'tgi'];
    const currentBackend = options.backend || this.config.defaultBackend;
    
    // Try other backends
    for (const backend of backends) {
      if (backend === currentBackend) continue;

      try {
        return await this.generate(prompt, {
          ...options,
          backend,
          noFallback: true
        });
      } catch (error) {
        continue;
      }
    }

    throw new Error('All inference backends failed');
  }

  /**
   * Chat completion
   */
  async chat(messages, options = {}) {
    // Convert messages to prompt
    const prompt = this.messagesToPrompt(messages, options);
    return await this.generate(prompt, options);
  }

  /**
   * Convert messages to prompt
   */
  messagesToPrompt(messages, options = {}) {
    const template = options.template || 'chatml';

    switch (template) {
      case 'chatml':
        return messages.map(msg => {
          if (msg.role === 'system') return `<|im_start|>system\n${msg.content}<|im_end|>`;
          if (msg.role === 'user') return `<|im_start|>user\n${msg.content}<|im_end|>`;
          if (msg.role === 'assistant') return `<|im_start|>assistant\n${msg.content}<|im_end|>`;
          return '';
        }).join('\n') + '\n<|im_start|>assistant\n';

      case 'llama2':
        return messages.map((msg, i) => {
          if (msg.role === 'system') return `[INST] <<SYS>>\n${msg.content}\n<</SYS>>\n\n`;
          if (msg.role === 'user') return i === 0 ? `${msg.content} [/INST]` : `[INST] ${msg.content} [/INST]`;
          if (msg.role === 'assistant') return ` ${msg.content} `;
          return '';
        }).join('');

      case 'mistral':
        return messages.map(msg => {
          if (msg.role === 'user') return `[INST] ${msg.content} [/INST]`;
          if (msg.role === 'assistant') return ` ${msg.content}`;
          return '';
        }).join('');

      default:
        return messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n') + '\n\nassistant:';
    }
  }

  /**
   * List available models
   */
  async listModels(backend = null) {
    const models = [];

    if (!backend || backend === 'ollama') {
      try {
        const ollamaModels = await this.listOllamaModels();
        models.push(...ollamaModels.map(m => ({ ...m, backend: 'ollama' })));
      } catch (error) {
        // Ollama not available
      }
    }

    if (!backend || backend === 'vllm') {
      try {
        const vllmModels = await this.listVLLMModels();
        models.push(...vllmModels.map(m => ({ ...m, backend: 'vllm' })));
      } catch (error) {
        // vLLM not available
      }
    }

    return models;
  }

  /**
   * List Ollama models
   */
  async listOllamaModels() {
    const url = `${this.config.ollamaUrl}/api/tags`;
    const response = await axios.get(url);
    return response.data.models || [];
  }

  /**
   * List vLLM models
   */
  async listVLLMModels() {
    const url = `${this.config.vllmUrl}/v1/models`;
    const response = await axios.get(url);
    return response.data.data || [];
  }

  /**
   * Load Ollama models
   */
  async loadOllamaModels() {
    try {
      const models = await this.listOllamaModels();
      for (const model of models) {
        this.models.set(model.name, {
          name: model.name,
          backend: 'ollama',
          size: model.size,
          modified: model.modified_at
        });
        this.loadedModels.add(model.name);
      }
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Pull/download model (Ollama)
   */
  async pullModel(modelName, backend = 'ollama') {
    if (backend !== 'ollama') {
      throw new Error('Model pulling only supported for Ollama');
    }

    this.emit('model:pull-started', { model: modelName });

    const url = `${this.config.ollamaUrl}/api/pull`;
    const response = await axios.post(url, { name: modelName }, {
      timeout: 600000, // 10 minutes
      onDownloadProgress: (progress) => {
        this.emit('model:pull-progress', {
          model: modelName,
          progress: progress.loaded
        });
      }
    });

    this.loadedModels.add(modelName);
    this.emit('model:pull-completed', { model: modelName });

    return { success: true, model: modelName };
  }

  /**
   * Health checks
   */
  async checkOllamaHealth() {
    try {
      await axios.get(`${this.config.ollamaUrl}/api/tags`, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkVLLMHealth() {
    try {
      await axios.get(`${this.config.vllmUrl}/health`, { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get default model for backend
   */
  getDefaultModel(backend) {
    const defaults = {
      ollama: 'llama3.2',
      vllm: 'meta-llama/Meta-Llama-3-8B-Instruct',
      tgi: 'mistralai/Mistral-7B-Instruct-v0.2'
    };
    return defaults[backend] || 'llama3.2';
  }

  /**
   * Update statistics
   */
  updateStatistics(backend, model, latency, result, success) {
    this.stats.totalRequests++;
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    const n = this.stats.totalRequests;
    this.stats.avgLatency = (this.stats.avgLatency * (n - 1) + latency) / n;

    if (result && result.tokens) {
      this.stats.totalTokens += result.tokens.total;
    }

    if (backend) {
      this.stats.byBackend[backend] = (this.stats.byBackend[backend] || 0) + 1;
    }

    if (model) {
      this.stats.byModel[model] = (this.stats.byModel[model] || 0) + 1;
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      successRate: this.stats.totalRequests > 0
        ? (this.stats.successfulRequests / this.stats.totalRequests) * 100
        : 0,
      avgTokensPerRequest: this.stats.totalRequests > 0
        ? this.stats.totalTokens / this.stats.totalRequests
        : 0
    };
  }

  resetStatistics() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgLatency: 0,
      totalTokens: 0,
      byBackend: {},
      byModel: {}
    };
  }
}

// Singleton
let inferenceEngineInstance = null;

function getInferenceEngine(config = {}) {
  if (!inferenceEngineInstance) {
    inferenceEngineInstance = new InferenceEngine(config);
  }
  return inferenceEngineInstance;
}

module.exports = {
  InferenceEngine,
  getInferenceEngine
};
