/**
 * Custom Inference Engine API Routes
 */

const express = require('express');
const router = express.Router();
const { getInferenceEngine } = require('../../services/inference/InferenceEngine');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);

// POST /api/inference/generate - Generate text completion
router.post('/generate', async (req, res) => {
  try {
    const { prompt, model, backend, temperature, maxTokens, topP, topK } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    const engine = getInferenceEngine();
    const result = await engine.generate(prompt, {
      model, backend, temperature, maxTokens, topP, topK
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/inference/chat - Chat completion
router.post('/chat', async (req, res) => {
  try {
    const { messages, model, backend, temperature, maxTokens, template } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'Messages array is required' });
    }

    const engine = getInferenceEngine();
    const result = await engine.chat(messages, {
      model, backend, temperature, maxTokens, template
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/inference/models - List available models
router.get('/models', async (req, res) => {
  try {
    const { backend } = req.query;

    const engine = getInferenceEngine();
    const models = await engine.listModels(backend);

    res.json({
      success: true,
      models
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/inference/models/pull - Download a model (Ollama only)
router.post('/models/pull', async (req, res) => {
  try {
    const { model, backend = 'ollama' } = req.body;

    if (!model) {
      return res.status(400).json({ success: false, error: 'Model name is required' });
    }

    const engine = getInferenceEngine();
    
    // Start pull in background
    engine.pullModel(model, backend).then(() => {
      // Completed
    }).catch(error => {
      console.error('Model pull error:', error);
    });

    res.json({
      success: true,
      message: `Model ${model} download started`,
      model
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/inference/health - Check backend health
router.get('/health', async (req, res) => {
  try {
    const engine = getInferenceEngine();

    const health = {
      ollama: await engine.checkOllamaHealth(),
      vllm: await engine.checkVLLMHealth()
    };

    res.json({
      success: true,
      health,
      backends: Object.entries(health)
        .filter(([_, status]) => status)
        .map(([backend]) => backend)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/inference/statistics - Get inference statistics
router.get('/statistics', async (req, res) => {
  try {
    const engine = getInferenceEngine();
    const stats = engine.getStatistics();

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
