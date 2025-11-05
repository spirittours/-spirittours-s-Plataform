const EventEmitter = require('events');
const AIProviderService = require('../ai/AIProviderService');

/**
 * StreamingService - Handles real-time AI response streaming using Server-Sent Events (SSE)
 * 
 * Features:
 * - Token-by-token streaming for AI responses
 * - Multiple concurrent stream management
 * - Progress indicators and status updates
 * - Error handling and reconnection support
 * - Stream cancellation
 */
class StreamingService extends EventEmitter {
  constructor() {
    super();
    this.activeStreams = new Map(); // streamId -> stream data
    this.config = {
      maxConcurrentStreams: parseInt(process.env.MAX_CONCURRENT_STREAMS) || 100,
      streamTimeout: parseInt(process.env.STREAM_TIMEOUT) || 300000, // 5 minutes
      heartbeatInterval: 30000, // 30 seconds
      chunkDelay: 50, // 50ms delay between chunks for better UI experience
    };
    
    this.stats = {
      totalStreamsCreated: 0,
      activeStreams: 0,
      completedStreams: 0,
      failedStreams: 0,
      cancelledStreams: 0,
      totalTokensStreamed: 0,
      averageStreamDuration: 0,
    };

    // Cleanup stale streams periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleStreams();
    }, 60000); // Every minute
  }

  /**
   * Create a new streaming session
   */
  createStream(streamId, userId, workspace) {
    if (this.activeStreams.size >= this.config.maxConcurrentStreams) {
      throw new Error('Maximum concurrent streams limit reached');
    }

    const stream = {
      id: streamId,
      userId,
      workspace,
      status: 'initializing',
      startTime: Date.now(),
      lastActivityTime: Date.now(),
      chunks: [],
      tokensStreamed: 0,
      metadata: {},
      response: null, // SSE response object
      heartbeatTimer: null
    };

    this.activeStreams.set(streamId, stream);
    this.stats.totalStreamsCreated++;
    this.stats.activeStreams++;

    console.log(`Stream created: ${streamId} for user ${userId}`);
    
    return stream;
  }

  /**
   * Attach SSE response to stream
   */
  attachResponse(streamId, res) {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream) {
      throw new Error('Stream not found');
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    stream.response = res;
    stream.status = 'connected';
    stream.lastActivityTime = Date.now();

    // Send initial connection message
    this.sendEvent(streamId, 'connected', {
      streamId,
      message: 'Stream connected successfully',
      timestamp: new Date().toISOString()
    });

    // Start heartbeat
    this.startHeartbeat(streamId);

    // Handle client disconnect
    res.on('close', () => {
      this.cancelStream(streamId, 'Client disconnected');
    });

    console.log(`Response attached to stream: ${streamId}`);
  }

  /**
   * Stream AI completion with token-by-token delivery
   */
  async streamCompletion(streamId, prompt, options = {}) {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream) {
      throw new Error('Stream not found');
    }

    if (!stream.response) {
      throw new Error('Response not attached to stream');
    }

    try {
      stream.status = 'streaming';
      stream.metadata = {
        prompt: prompt.substring(0, 100) + '...',
        model: options.model || 'gpt-4o',
        provider: options.provider || 'openai',
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000
      };

      // Send start event
      this.sendEvent(streamId, 'start', {
        message: 'Starting AI completion',
        model: stream.metadata.model,
        provider: stream.metadata.provider
      });

      // Get AI provider
      const providerType = options.provider || 'openai';
      const provider = AIProviderService.getProvider(providerType);

      if (!provider) {
        throw new Error(`Provider not available: ${providerType}`);
      }

      // Check if provider supports streaming
      if (typeof provider.streamCompletion !== 'function') {
        // Fallback to non-streaming with simulated streaming
        return await this.simulateStreaming(streamId, prompt, options);
      }

      // Stream from AI provider
      const providerStream = await provider.streamCompletion(prompt, {
        model: options.model,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: true
      });

      let fullText = '';
      let tokenCount = 0;

      // Process stream chunks
      for await (const chunk of providerStream) {
        // Check if stream was cancelled
        if (!this.activeStreams.has(streamId) || stream.status === 'cancelled') {
          break;
        }

        const content = this.extractContentFromChunk(chunk, providerType);
        
        if (content) {
          fullText += content;
          tokenCount++;
          stream.tokensStreamed = tokenCount;
          stream.lastActivityTime = Date.now();

          // Send chunk to client
          this.sendEvent(streamId, 'chunk', {
            content,
            tokenCount,
            timestamp: new Date().toISOString()
          });

          // Optional: Add small delay for better UI experience
          if (this.config.chunkDelay > 0) {
            await this.sleep(this.config.chunkDelay);
          }
        }
      }

      // Stream completed successfully
      await this.completeStream(streamId, {
        text: fullText,
        tokensUsed: tokenCount,
        model: stream.metadata.model,
        provider: stream.metadata.provider,
        duration: Date.now() - stream.startTime
      });

      return {
        success: true,
        streamId,
        tokensStreamed: tokenCount,
        duration: Date.now() - stream.startTime
      };

    } catch (error) {
      console.error(`Stream error for ${streamId}:`, error);
      await this.failStream(streamId, error.message);
      throw error;
    }
  }

  /**
   * Simulate streaming for providers that don't support native streaming
   */
  async simulateStreaming(streamId, prompt, options) {
    const stream = this.activeStreams.get(streamId);
    
    try {
      // Get full response first
      const providerType = options.provider || 'openai';
      const result = await AIProviderService.generateCompletion(prompt, {
        provider: providerType,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens
      });

      const text = result.text || result.content || '';
      
      // Split into words for streaming simulation
      const words = text.split(' ');
      let fullText = '';
      
      // Stream word by word
      for (let i = 0; i < words.length; i++) {
        // Check if stream was cancelled
        if (!this.activeStreams.has(streamId) || stream.status === 'cancelled') {
          break;
        }

        const word = words[i] + (i < words.length - 1 ? ' ' : '');
        fullText += word;
        stream.tokensStreamed++;
        stream.lastActivityTime = Date.now();

        // Send chunk
        this.sendEvent(streamId, 'chunk', {
          content: word,
          tokenCount: stream.tokensStreamed,
          timestamp: new Date().toISOString()
        });

        // Delay between words
        await this.sleep(50);
      }

      // Complete stream
      await this.completeStream(streamId, {
        text: fullText,
        tokensUsed: result.tokensUsed || stream.tokensStreamed,
        model: stream.metadata.model,
        provider: stream.metadata.provider,
        duration: Date.now() - stream.startTime
      });

      return {
        success: true,
        streamId,
        tokensStreamed: stream.tokensStreamed,
        duration: Date.now() - stream.startTime
      };

    } catch (error) {
      console.error(`Simulated stream error for ${streamId}:`, error);
      await this.failStream(streamId, error.message);
      throw error;
    }
  }

  /**
   * Stream multiple AI responses in parallel (for comparison)
   */
  async streamMultipleCompletions(streamId, prompt, providers = []) {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream) {
      throw new Error('Stream not found');
    }

    try {
      stream.status = 'streaming';
      stream.metadata = {
        prompt: prompt.substring(0, 100) + '...',
        providers: providers.map(p => p.provider),
        mode: 'parallel'
      };

      // Send start event
      this.sendEvent(streamId, 'start', {
        message: 'Starting parallel AI completions',
        providers: providers.map(p => p.provider)
      });

      // Start all streams in parallel
      const streamPromises = providers.map((config, index) => {
        return this.streamProviderResponse(streamId, prompt, config, index);
      });

      const results = await Promise.allSettled(streamPromises);

      // Send completion event
      const successfulResults = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

      await this.completeStream(streamId, {
        results: successfulResults,
        totalProviders: providers.length,
        successfulProviders: successfulResults.length,
        duration: Date.now() - stream.startTime
      });

      return {
        success: true,
        streamId,
        results: successfulResults,
        duration: Date.now() - stream.startTime
      };

    } catch (error) {
      console.error(`Multi-stream error for ${streamId}:`, error);
      await this.failStream(streamId, error.message);
      throw error;
    }
  }

  /**
   * Stream response from a single provider (for parallel streaming)
   */
  async streamProviderResponse(streamId, prompt, config, providerIndex) {
    const stream = this.activeStreams.get(streamId);
    const provider = AIProviderService.getProvider(config.provider);

    if (!provider) {
      throw new Error(`Provider not available: ${config.provider}`);
    }

    let fullText = '';
    let tokenCount = 0;

    try {
      // Check if provider supports streaming
      if (typeof provider.streamCompletion === 'function') {
        const providerStream = await provider.streamCompletion(prompt, {
          model: config.model,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          stream: true
        });

        for await (const chunk of providerStream) {
          if (!this.activeStreams.has(streamId)) break;

          const content = this.extractContentFromChunk(chunk, config.provider);
          
          if (content) {
            fullText += content;
            tokenCount++;

            // Send provider-specific chunk
            this.sendEvent(streamId, 'provider-chunk', {
              provider: config.provider,
              providerIndex,
              content,
              tokenCount,
              timestamp: new Date().toISOString()
            });

            await this.sleep(this.config.chunkDelay);
          }
        }
      } else {
        // Non-streaming fallback
        const result = await AIProviderService.generateCompletion(prompt, config);
        fullText = result.text || result.content || '';
        tokenCount = result.tokensUsed || 0;

        // Send as single chunk
        this.sendEvent(streamId, 'provider-chunk', {
          provider: config.provider,
          providerIndex,
          content: fullText,
          tokenCount,
          timestamp: new Date().toISOString()
        });
      }

      return {
        provider: config.provider,
        text: fullText,
        tokensUsed: tokenCount,
        model: config.model
      };

    } catch (error) {
      console.error(`Provider stream error (${config.provider}):`, error);
      
      // Send error event for this provider
      this.sendEvent(streamId, 'provider-error', {
        provider: config.provider,
        providerIndex,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Complete a stream successfully
   */
  async completeStream(streamId, result) {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream) {
      return;
    }

    stream.status = 'completed';
    stream.lastActivityTime = Date.now();

    // Stop heartbeat
    this.stopHeartbeat(streamId);

    // Send completion event
    this.sendEvent(streamId, 'complete', {
      message: 'Stream completed successfully',
      result,
      duration: Date.now() - stream.startTime,
      timestamp: new Date().toISOString()
    });

    // Update stats
    this.stats.completedStreams++;
    this.stats.activeStreams--;
    this.stats.totalTokensStreamed += stream.tokensStreamed;
    this.updateAverageStreamDuration(Date.now() - stream.startTime);

    // Close response
    if (stream.response && !stream.response.writableEnded) {
      stream.response.end();
    }

    // Remove from active streams after a delay
    setTimeout(() => {
      this.activeStreams.delete(streamId);
    }, 5000);

    console.log(`Stream completed: ${streamId}`);
  }

  /**
   * Fail a stream with error
   */
  async failStream(streamId, errorMessage) {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream) {
      return;
    }

    stream.status = 'failed';
    stream.lastActivityTime = Date.now();

    // Stop heartbeat
    this.stopHeartbeat(streamId);

    // Send error event
    this.sendEvent(streamId, 'error', {
      message: 'Stream failed',
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    // Update stats
    this.stats.failedStreams++;
    this.stats.activeStreams--;

    // Close response
    if (stream.response && !stream.response.writableEnded) {
      stream.response.end();
    }

    // Remove from active streams
    setTimeout(() => {
      this.activeStreams.delete(streamId);
    }, 1000);

    console.error(`Stream failed: ${streamId} - ${errorMessage}`);
  }

  /**
   * Cancel a stream
   */
  cancelStream(streamId, reason = 'User cancelled') {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream) {
      return;
    }

    stream.status = 'cancelled';
    stream.lastActivityTime = Date.now();

    // Stop heartbeat
    this.stopHeartbeat(streamId);

    // Send cancel event
    this.sendEvent(streamId, 'cancelled', {
      message: 'Stream cancelled',
      reason,
      timestamp: new Date().toISOString()
    });

    // Update stats
    this.stats.cancelledStreams++;
    this.stats.activeStreams--;

    // Close response
    if (stream.response && !stream.response.writableEnded) {
      stream.response.end();
    }

    // Remove from active streams
    this.activeStreams.delete(streamId);

    console.log(`Stream cancelled: ${streamId} - ${reason}`);
  }

  /**
   * Send SSE event to client
   */
  sendEvent(streamId, eventType, data) {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream || !stream.response || stream.response.writableEnded) {
      return;
    }

    try {
      const eventData = {
        type: eventType,
        streamId,
        data,
        timestamp: new Date().toISOString()
      };

      stream.response.write(`event: ${eventType}\n`);
      stream.response.write(`data: ${JSON.stringify(eventData)}\n\n`);
    } catch (error) {
      console.error(`Failed to send event to stream ${streamId}:`, error);
    }
  }

  /**
   * Start heartbeat for stream
   */
  startHeartbeat(streamId) {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream) {
      return;
    }

    stream.heartbeatTimer = setInterval(() => {
      this.sendEvent(streamId, 'heartbeat', {
        message: 'keep-alive',
        uptime: Date.now() - stream.startTime
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat for stream
   */
  stopHeartbeat(streamId) {
    const stream = this.activeStreams.get(streamId);
    
    if (stream && stream.heartbeatTimer) {
      clearInterval(stream.heartbeatTimer);
      stream.heartbeatTimer = null;
    }
  }

  /**
   * Cleanup stale streams that exceeded timeout
   */
  cleanupStaleStreams() {
    const now = Date.now();
    const staleStreams = [];

    for (const [streamId, stream] of this.activeStreams.entries()) {
      const age = now - stream.lastActivityTime;
      
      if (age > this.config.streamTimeout) {
        staleStreams.push(streamId);
      }
    }

    staleStreams.forEach(streamId => {
      console.log(`Cleaning up stale stream: ${streamId}`);
      this.cancelStream(streamId, 'Stream timeout');
    });

    if (staleStreams.length > 0) {
      console.log(`Cleaned up ${staleStreams.length} stale streams`);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeStreams: this.stats.activeStreams,
      activeStreamIds: Array.from(this.activeStreams.keys())
    };
  }

  /**
   * Get stream status
   */
  getStreamStatus(streamId) {
    const stream = this.activeStreams.get(streamId);
    
    if (!stream) {
      return null;
    }

    return {
      id: stream.id,
      status: stream.status,
      startTime: stream.startTime,
      lastActivityTime: stream.lastActivityTime,
      tokensStreamed: stream.tokensStreamed,
      duration: Date.now() - stream.startTime,
      metadata: stream.metadata
    };
  }

  // ===== HELPER METHODS =====

  extractContentFromChunk(chunk, provider) {
    try {
      // OpenAI format
      if (chunk.choices && chunk.choices[0]?.delta?.content) {
        return chunk.choices[0].delta.content;
      }

      // Anthropic format
      if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
        return chunk.delta.text;
      }

      // Generic format
      if (chunk.content) {
        return chunk.content;
      }

      return null;
    } catch (error) {
      console.error('Error extracting content from chunk:', error);
      return null;
    }
  }

  updateAverageStreamDuration(duration) {
    const totalCompletedStreams = this.stats.completedStreams;
    const currentAverage = this.stats.averageStreamDuration;
    
    this.stats.averageStreamDuration = 
      (currentAverage * (totalCompletedStreams - 1) + duration) / totalCompletedStreams;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup on service shutdown
   */
  shutdown() {
    console.log('Shutting down StreamingService...');
    
    // Cancel all active streams
    for (const streamId of this.activeStreams.keys()) {
      this.cancelStream(streamId, 'Service shutting down');
    }

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    console.log('StreamingService shutdown complete');
  }
}

module.exports = new StreamingService();
