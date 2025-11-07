/**
 * Streaming Service
 * Real-time token streaming for LLM responses
 * 
 * Features:
 * - Server-Sent Events (SSE) streaming
 * - WebSocket support
 * - Token-by-token delivery
 * - Connection management
 * - Backpressure handling
 * - Error recovery
 * - Multiple concurrent streams
 */

const { EventEmitter } = require('events');
const { MultiModelAI } = require('../../ai/MultiModelAI');
const { getInferenceEngine } = require('../inference/InferenceEngine');

class StreamingService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxConcurrentStreams: config.maxConcurrentStreams || 50,
      streamTimeout: config.streamTimeout || 300000, // 5 minutes
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 seconds
      bufferSize: config.bufferSize || 8,
      enableBackpressure: config.enableBackpressure !== false,
      ...config
    };

    this.ai = new MultiModelAI();
    this.inference = getInferenceEngine();
    
    // Active streams tracking
    this.activeStreams = new Map();
    this.streamCounter = 0;

    // Statistics
    this.stats = {
      totalStreams: 0,
      activeStreams: 0,
      completedStreams: 0,
      failedStreams: 0,
      totalTokensStreamed: 0,
      avgStreamDuration: 0,
      avgTokensPerStream: 0
    };
  }

  /**
   * Create SSE stream for chat completion
   */
  async streamChat(messages, options = {}, res) {
    const streamId = this.generateStreamId();
    const startTime = Date.now();

    try {
      // Setup SSE headers
      this.setupSSE(res);

      // Register stream
      this.registerStream(streamId, res);

      this.emit('stream:started', { streamId, messageCount: messages.length });

      // Determine backend
      const useLocal = options.backend && ['ollama', 'vllm', 'tgi'].includes(options.backend);
      
      if (useLocal) {
        await this.streamLocalInference(streamId, messages, options, res);
      } else {
        await this.streamCloudAI(streamId, messages, options, res);
      }

      const duration = Date.now() - startTime;
      this.completeStream(streamId, duration, true);

      this.emit('stream:completed', { streamId, duration });

    } catch (error) {
      this.emit('stream:error', { streamId, error: error.message });
      this.sendSSE(res, { error: error.message }, 'error');
      this.completeStream(streamId, Date.now() - startTime, false);
      throw error;
    } finally {
      this.unregisterStream(streamId);
      res.end();
    }
  }

  /**
   * Stream from cloud AI providers (OpenAI, Anthropic, etc.)
   */
  async streamCloudAI(streamId, messages, options, res) {
    const model = options.model || 'gpt-4o-mini';
    const provider = this.getProviderFromModel(model);

    // Send initial metadata
    this.sendSSE(res, {
      streamId,
      model,
      provider,
      timestamp: Date.now()
    }, 'start');

    let fullText = '';
    let tokenCount = 0;

    try {
      // Use MultiModelAI streaming
      const stream = await this.ai.streamRequest({
        messages,
        model,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000,
        workspace: options.workspace
      });

      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices[0]?.delta?.content) {
          const content = chunk.choices[0].delta.content;
          fullText += content;
          tokenCount++;

          // Send token
          this.sendSSE(res, {
            content,
            tokenCount,
            timestamp: Date.now()
          }, 'token');

          // Update stats
          this.stats.totalTokensStreamed++;

          // Check backpressure
          if (this.config.enableBackpressure && !res.write('')) {
            await this.waitForDrain(res);
          }
        }

        // Check if stream is still active
        if (!this.activeStreams.has(streamId)) {
          break;
        }
      }

      // Send completion
      this.sendSSE(res, {
        fullText,
        tokenCount,
        finishReason: 'stop'
      }, 'done');

    } catch (error) {
      this.sendSSE(res, { error: error.message }, 'error');
      throw error;
    }
  }

  /**
   * Stream from local inference engine (Ollama, vLLM, TGI)
   */
  async streamLocalInference(streamId, messages, options, res) {
    const model = options.model || 'llama3.2';
    const backend = options.backend || 'ollama';

    this.sendSSE(res, {
      streamId,
      model,
      backend,
      type: 'local',
      timestamp: Date.now()
    }, 'start');

    let fullText = '';
    let tokenCount = 0;

    try {
      // Convert messages to prompt
      const prompt = this.inference.messagesToPrompt(messages, {
        template: options.template || 'chatml'
      });

      // Stream from local backend
      if (backend === 'ollama') {
        await this.streamOllama(streamId, prompt, model, options, res, (token) => {
          fullText += token;
          tokenCount++;
          this.stats.totalTokensStreamed++;
        });
      } else if (backend === 'vllm') {
        await this.streamVLLM(streamId, prompt, model, options, res, (token) => {
          fullText += token;
          tokenCount++;
          this.stats.totalTokensStreamed++;
        });
      }

      this.sendSSE(res, {
        fullText,
        tokenCount,
        finishReason: 'stop'
      }, 'done');

    } catch (error) {
      this.sendSSE(res, { error: error.message }, 'error');
      throw error;
    }
  }

  /**
   * Stream from Ollama
   */
  async streamOllama(streamId, prompt, model, options, res, onToken) {
    const axios = require('axios');
    const ollamaUrl = this.inference.config.ollamaUrl;

    const response = await axios.post(`${ollamaUrl}/api/generate`, {
      model,
      prompt,
      stream: true,
      options: {
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        num_predict: options.maxTokens || 512
      }
    }, {
      responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(l => l.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            if (data.response) {
              onToken(data.response);
              
              this.sendSSE(res, {
                content: data.response,
                done: data.done || false
              }, 'token');
            }

            if (data.done) {
              resolve();
              return;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      });

      response.data.on('error', reject);
      response.data.on('end', resolve);
    });
  }

  /**
   * Stream from vLLM
   */
  async streamVLLM(streamId, prompt, model, options, res, onToken) {
    const axios = require('axios');
    const vllmUrl = this.inference.config.vllmUrl;

    const response = await axios.post(`${vllmUrl}/v1/completions`, {
      model,
      prompt,
      stream: true,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 512
    }, {
      responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(l => l.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              resolve();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices[0]?.text || '';
              
              if (token) {
                onToken(token);
                
                this.sendSSE(res, {
                  content: token,
                  done: false
                }, 'token');
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });

      response.data.on('error', reject);
      response.data.on('end', resolve);
    });
  }

  /**
   * Stream text generation (completion mode)
   */
  async streamGenerate(prompt, options = {}, res) {
    const streamId = this.generateStreamId();
    const startTime = Date.now();

    try {
      this.setupSSE(res);
      this.registerStream(streamId, res);

      this.emit('stream:started', { streamId, type: 'generate' });

      const useLocal = options.backend && ['ollama', 'vllm', 'tgi'].includes(options.backend);
      
      if (useLocal) {
        // Convert to messages format for streaming
        const messages = [{ role: 'user', content: prompt }];
        await this.streamLocalInference(streamId, messages, options, res);
      } else {
        const messages = [{ role: 'user', content: prompt }];
        await this.streamCloudAI(streamId, messages, options, res);
      }

      const duration = Date.now() - startTime;
      this.completeStream(streamId, duration, true);

    } catch (error) {
      this.emit('stream:error', { streamId, error: error.message });
      this.completeStream(streamId, Date.now() - startTime, false);
      throw error;
    } finally {
      this.unregisterStream(streamId);
      res.end();
    }
  }

  /**
   * Setup SSE response headers
   */
  setupSSE(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();
  }

  /**
   * Send SSE event
   */
  sendSSE(res, data, event = 'message') {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    res.write(payload);
  }

  /**
   * Wait for stream drain (backpressure)
   */
  waitForDrain(res) {
    return new Promise((resolve) => {
      if (res.writableNeedDrain) {
        res.once('drain', resolve);
      } else {
        resolve();
      }
    });
  }

  /**
   * Generate unique stream ID
   */
  generateStreamId() {
    return `stream_${Date.now()}_${++this.streamCounter}`;
  }

  /**
   * Register active stream
   */
  registerStream(streamId, res) {
    if (this.activeStreams.size >= this.config.maxConcurrentStreams) {
      throw new Error('Maximum concurrent streams reached');
    }

    this.activeStreams.set(streamId, {
      res,
      startTime: Date.now(),
      tokenCount: 0
    });

    this.stats.totalStreams++;
    this.stats.activeStreams = this.activeStreams.size;
  }

  /**
   * Unregister stream
   */
  unregisterStream(streamId) {
    this.activeStreams.delete(streamId);
    this.stats.activeStreams = this.activeStreams.size;
  }

  /**
   * Complete stream with stats update
   */
  completeStream(streamId, duration, success) {
    const stream = this.activeStreams.get(streamId);
    
    if (success) {
      this.stats.completedStreams++;
      
      // Update averages
      const n = this.stats.completedStreams;
      this.stats.avgStreamDuration = 
        (this.stats.avgStreamDuration * (n - 1) + duration) / n;
      
      if (stream) {
        this.stats.avgTokensPerStream = 
          (this.stats.avgTokensPerStream * (n - 1) + stream.tokenCount) / n;
      }
    } else {
      this.stats.failedStreams++;
    }
  }

  /**
   * Cancel stream
   */
  cancelStream(streamId) {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      this.sendSSE(stream.res, { reason: 'cancelled' }, 'cancelled');
      stream.res.end();
      this.unregisterStream(streamId);
      this.emit('stream:cancelled', { streamId });
    }
  }

  /**
   * Get provider from model name
   */
  getProviderFromModel(model) {
    if (model.startsWith('gpt-')) return 'openai';
    if (model.startsWith('claude-')) return 'anthropic';
    if (model.startsWith('gemini-')) return 'google';
    if (model.includes('llama')) return 'meta';
    if (model.includes('mistral')) return 'mistral';
    return 'unknown';
  }

  /**
   * Get active streams info
   */
  getActiveStreams() {
    const streams = [];
    for (const [streamId, stream] of this.activeStreams.entries()) {
      streams.push({
        streamId,
        duration: Date.now() - stream.startTime,
        tokenCount: stream.tokenCount
      });
    }
    return streams;
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      activeStreamsList: this.getActiveStreams(),
      successRate: this.stats.totalStreams > 0
        ? (this.stats.completedStreams / this.stats.totalStreams) * 100
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      totalStreams: 0,
      activeStreams: this.activeStreams.size,
      completedStreams: 0,
      failedStreams: 0,
      totalTokensStreamed: 0,
      avgStreamDuration: 0,
      avgTokensPerStream: 0
    };
  }

  /**
   * Cleanup inactive streams
   */
  cleanupStreams() {
    const now = Date.now();
    for (const [streamId, stream] of this.activeStreams.entries()) {
      if (now - stream.startTime > this.config.streamTimeout) {
        this.cancelStream(streamId);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanup() {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupStreams();
    }, 60000); // Every minute
  }

  /**
   * Stop cleanup
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton
let streamingServiceInstance = null;

function getStreamingService(config = {}) {
  if (!streamingServiceInstance) {
    streamingServiceInstance = new StreamingService(config);
    streamingServiceInstance.startCleanup();
  }
  return streamingServiceInstance;
}

module.exports = {
  StreamingService,
  getStreamingService
};
