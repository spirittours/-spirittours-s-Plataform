const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const StreamingService = require('../../services/streaming/StreamingService');
const { authenticate } = require('../../middleware/auth');
const RateLimiter = require('../../middleware/rateLimiter');

// Rate limiters
const streamLimiter = RateLimiter.createLimiter('streaming', {
  windowMs: 60 * 1000,
  max: 20 // 20 streams per minute
});

/**
 * @route   POST /api/streaming/completion
 * @desc    Stream AI completion with token-by-token delivery
 * @access  Private
 */
router.post(
  '/completion',
  authenticate,
  streamLimiter,
  async (req, res) => {
    const streamId = uuidv4();
    
    try {
      const { prompt, provider, model, temperature, maxTokens } = req.body;

      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: 'Prompt is required'
        });
      }

      // Create stream
      StreamingService.createStream(streamId, req.user._id, req.user.workspace);

      // Attach SSE response
      StreamingService.attachResponse(streamId, res);

      // Start streaming
      await StreamingService.streamCompletion(streamId, prompt, {
        provider: provider || 'openai',
        model: model || 'gpt-4o',
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 2000
      });

    } catch (error) {
      console.error('Streaming completion error:', error);
      
      // If stream was created, fail it properly
      if (StreamingService.getStreamStatus(streamId)) {
        await StreamingService.failStream(streamId, error.message);
      } else {
        // Stream wasn't created, send regular error response
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
    }
  }
);

/**
 * @route   POST /api/streaming/parallel
 * @desc    Stream multiple AI completions in parallel for comparison
 * @access  Private
 */
router.post(
  '/parallel',
  authenticate,
  streamLimiter,
  async (req, res) => {
    const streamId = uuidv4();
    
    try {
      const { prompt, providers } = req.body;

      if (!prompt) {
        return res.status(400).json({
          success: false,
          error: 'Prompt is required'
        });
      }

      if (!providers || !Array.isArray(providers) || providers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one provider configuration is required'
        });
      }

      if (providers.length > 5) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 5 providers allowed for parallel streaming'
        });
      }

      // Create stream
      StreamingService.createStream(streamId, req.user._id, req.user.workspace);

      // Attach SSE response
      StreamingService.attachResponse(streamId, res);

      // Start parallel streaming
      await StreamingService.streamMultipleCompletions(streamId, prompt, providers);

    } catch (error) {
      console.error('Parallel streaming error:', error);
      
      if (StreamingService.getStreamStatus(streamId)) {
        await StreamingService.failStream(streamId, error.message);
      } else {
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
    }
  }
);

/**
 * @route   POST /api/streaming/chat
 * @desc    Stream chat completion with conversation history
 * @access  Private
 */
router.post(
  '/chat',
  authenticate,
  streamLimiter,
  async (req, res) => {
    const streamId = uuidv4();
    
    try {
      const { messages, provider, model, temperature, maxTokens } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Messages array is required'
        });
      }

      // Convert messages to prompt
      const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

      // Create stream
      StreamingService.createStream(streamId, req.user._id, req.user.workspace);

      // Attach SSE response
      StreamingService.attachResponse(streamId, res);

      // Start streaming
      await StreamingService.streamCompletion(streamId, prompt, {
        provider: provider || 'openai',
        model: model || 'gpt-4o',
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 2000
      });

    } catch (error) {
      console.error('Chat streaming error:', error);
      
      if (StreamingService.getStreamStatus(streamId)) {
        await StreamingService.failStream(streamId, error.message);
      } else {
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
    }
  }
);

/**
 * @route   POST /api/streaming/:streamId/cancel
 * @desc    Cancel an active stream
 * @access  Private
 */
router.post(
  '/:streamId/cancel',
  authenticate,
  async (req, res) => {
    try {
      const { streamId } = req.params;
      const stream = StreamingService.getStreamStatus(streamId);

      if (!stream) {
        return res.status(404).json({
          success: false,
          error: 'Stream not found'
        });
      }

      // Verify ownership
      if (stream.userId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: You do not own this stream'
        });
      }

      StreamingService.cancelStream(streamId, 'User requested cancellation');

      res.json({
        success: true,
        message: 'Stream cancelled successfully',
        streamId
      });

    } catch (error) {
      console.error('Cancel stream error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/streaming/:streamId/status
 * @desc    Get stream status
 * @access  Private
 */
router.get(
  '/:streamId/status',
  authenticate,
  async (req, res) => {
    try {
      const { streamId } = req.params;
      const status = StreamingService.getStreamStatus(streamId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: 'Stream not found'
        });
      }

      res.json({
        success: true,
        status
      });

    } catch (error) {
      console.error('Get stream status error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/streaming/stats
 * @desc    Get streaming service statistics
 * @access  Private
 */
router.get(
  '/stats',
  authenticate,
  async (req, res) => {
    try {
      const stats = StreamingService.getStats();

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('Get streaming stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/streaming/test
 * @desc    Test SSE connection
 * @access  Public
 */
router.get(
  '/test',
  async (req, res) => {
    const streamId = uuidv4();
    
    try {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Send test events
      let counter = 0;
      const interval = setInterval(() => {
        counter++;
        
        res.write(`event: test\n`);
        res.write(`data: ${JSON.stringify({ 
          message: `Test event ${counter}`, 
          timestamp: new Date().toISOString() 
        })}\n\n`);

        if (counter >= 10) {
          clearInterval(interval);
          res.write(`event: complete\n`);
          res.write(`data: ${JSON.stringify({ 
            message: 'Test complete', 
            totalEvents: counter 
          })}\n\n`);
          res.end();
        }
      }, 500);

      // Handle client disconnect
      res.on('close', () => {
        clearInterval(interval);
      });

    } catch (error) {
      console.error('Test SSE error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  }
);

module.exports = router;
