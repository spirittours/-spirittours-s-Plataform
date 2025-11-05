/**
 * Streaming API Routes
 * Real-time token streaming endpoints
 */

const express = require('express');
const router = express.Router();
const { getStreamingService } = require('../../services/streaming/StreamingService');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);

/**
 * POST /api/streaming/chat
 * Stream chat completion with SSE
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages, model, backend, temperature, maxTokens, template } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      });
    }

    const streaming = getStreamingService();
    
    await streaming.streamChat(messages, {
      model,
      backend,
      temperature,
      maxTokens,
      template,
      workspace: req.user.workspace
    }, res);

  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

/**
 * POST /api/streaming/generate
 * Stream text generation with SSE
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, model, backend, temperature, maxTokens } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    const streaming = getStreamingService();
    
    await streaming.streamGenerate(prompt, {
      model,
      backend,
      temperature,
      maxTokens,
      workspace: req.user.workspace
    }, res);

  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

/**
 * GET /api/streaming/active
 * Get active streams
 */
router.get('/active', async (req, res) => {
  try {
    const streaming = getStreamingService();
    const activeStreams = streaming.getActiveStreams();

    res.json({
      success: true,
      count: activeStreams.length,
      streams: activeStreams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/streaming/:streamId
 * Cancel a stream
 */
router.delete('/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;
    
    const streaming = getStreamingService();
    streaming.cancelStream(streamId);

    res.json({
      success: true,
      message: 'Stream cancelled',
      streamId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/streaming/statistics
 * Get streaming statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const streaming = getStreamingService();
    const stats = streaming.getStatistics();

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
