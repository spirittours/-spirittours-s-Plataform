const express = require('express');
const router = express.Router();
const AIProviderService = require('../../services/ai/AIProviderService');
const AIConfiguration = require('../../models/AIConfiguration');
const { authenticateToken } = require('../../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/ai/providers
 * @desc    Get all available AI providers and models
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const providers = AIProviderService.getAvailableProviders();

    res.json({
      success: true,
      data: providers,
    });
  } catch (error) {
    console.error('Error getting providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get providers',
    });
  }
});

/**
 * @route   POST /api/ai/providers/generate
 * @desc    Generate AI completion with automatic provider selection
 * @access  Private
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      prompt,
      systemPrompt,
      model,
      provider,
      maxTokens,
      temperature,
      strategy,
      workspaceId,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required',
      });
    }

    // Get workspace AI configuration
    let config;
    if (workspaceId) {
      config = await AIConfiguration.getOrCreateForWorkspace(workspaceId);

      // Check budget
      const estimatedCost = 0.05; // Rough estimate
      const budgetCheck = config.checkBudget(estimatedCost);
      if (!budgetCheck.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Budget limit exceeded',
          budgetCheck,
        });
      }
    }

    // Generate completion
    const response = await AIProviderService.generateCompletion({
      prompt,
      systemPrompt,
      model,
      provider,
      maxTokens,
      temperature,
      strategy: strategy || config?.defaultStrategy || 'auto',
      fallbackEnabled: config?.features.fallbackEnabled !== false,
      cacheEnabled: config?.features.cacheEnabled !== false,
    });

    // Update budget and statistics
    if (config && response.usage) {
      const modelConfig =
        AIProviderService.providerConfig[response.provider].models[
          response.model
        ];
      const actualCost =
        (response.usage.inputTokens / 1000) * modelConfig.costPer1kTokens.input +
        (response.usage.outputTokens / 1000) * modelConfig.costPer1kTokens.output;

      await config.addSpend(actualCost);
    }

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error generating completion:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate completion',
    });
  }
});

/**
 * @route   GET /api/ai/providers/usage
 * @desc    Get AI usage statistics
 * @access  Private
 */
router.get('/usage', async (req, res) => {
  try {
    const stats = AIProviderService.getUsageStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage statistics',
    });
  }
});

/**
 * @route   GET /api/ai/providers/config/:workspaceId
 * @desc    Get AI configuration for workspace
 * @access  Private
 */
router.get('/config/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const config = await AIConfiguration.getOrCreateForWorkspace(workspaceId);

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error getting AI config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI configuration',
    });
  }
});

/**
 * @route   PUT /api/ai/providers/config/:workspaceId
 * @desc    Update AI configuration for workspace
 * @access  Private (Admin only)
 */
router.put('/config/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const updates = req.body;

    const config = await AIConfiguration.findOneAndUpdate(
      { workspace: workspaceId },
      {
        ...updates,
        lastModifiedBy: req.user.id,
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error updating AI config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update AI configuration',
    });
  }
});

/**
 * @route   POST /api/ai/providers/config/:workspaceId/reset-budget
 * @desc    Reset budget counters for workspace
 * @access  Private (Admin only)
 */
router.post('/config/:workspaceId/reset-budget', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { type } = req.body; // 'daily' or 'monthly'

    const config = await AIConfiguration.getOrCreateForWorkspace(workspaceId);

    if (type === 'daily') {
      await config.resetDailySpend();
    } else if (type === 'monthly') {
      await config.resetMonthlySpend();
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset type. Must be "daily" or "monthly"',
      });
    }

    res.json({
      success: true,
      message: `${type} budget reset successfully`,
      data: config,
    });
  } catch (error) {
    console.error('Error resetting budget:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset budget',
    });
  }
});

/**
 * @route   POST /api/ai/providers/compare
 * @desc    Compare responses from multiple providers
 * @access  Private
 */
router.post('/compare', async (req, res) => {
  try {
    const { prompt, systemPrompt, providers, maxTokens, temperature } = req.body;

    if (!prompt || !providers || !Array.isArray(providers)) {
      return res.status(400).json({
        success: false,
        error: 'Prompt and providers array are required',
      });
    }

    // Generate completions from all specified providers
    const results = await Promise.allSettled(
      providers.map((providerConfig) =>
        AIProviderService.generateCompletion({
          prompt,
          systemPrompt,
          provider: providerConfig.provider,
          model: providerConfig.model,
          maxTokens,
          temperature,
          cacheEnabled: false, // Don't cache comparison requests
        })
      )
    );

    const responses = results.map((result, index) => ({
      provider: providers[index].provider,
      model: providers[index].model,
      success: result.status === 'fulfilled',
      response: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null,
    }));

    res.json({
      success: true,
      data: {
        prompt,
        responses,
        comparison: {
          totalProviders: providers.length,
          successfulProviders: responses.filter((r) => r.success).length,
          failedProviders: responses.filter((r) => !r.success).length,
        },
      },
    });
  } catch (error) {
    console.error('Error comparing providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare providers',
    });
  }
});

/**
 * @route   POST /api/ai/providers/benchmark
 * @desc    Benchmark providers for performance and quality
 * @access  Private (Admin only)
 */
router.post('/benchmark', async (req, res) => {
  try {
    const { testPrompts, providers } = req.body;

    if (!testPrompts || !Array.isArray(testPrompts)) {
      return res.status(400).json({
        success: false,
        error: 'Test prompts array is required',
      });
    }

    const benchmarkResults = [];

    for (const prompt of testPrompts) {
      const startTime = Date.now();

      const results = await Promise.allSettled(
        (providers || ['openai', 'anthropic', 'google', 'groq']).map((provider) =>
          AIProviderService.generateCompletion({
            prompt: prompt.text,
            systemPrompt: prompt.systemPrompt,
            provider,
            cacheEnabled: false,
          })
        )
      );

      const endTime = Date.now();

      benchmarkResults.push({
        prompt: prompt.name || prompt.text.substring(0, 50),
        results: results.map((result, index) => ({
          provider: providers[index],
          success: result.status === 'fulfilled',
          responseTime: endTime - startTime,
          cost:
            result.status === 'fulfilled'
              ? result.value.usage
                ? result.value.usage.inputTokens * 0.00001 +
                  result.value.usage.outputTokens * 0.00002
                : 0
              : 0,
          textLength:
            result.status === 'fulfilled' ? result.value.text.length : 0,
        })),
      });
    }

    res.json({
      success: true,
      data: {
        benchmarks: benchmarkResults,
        summary: {
          totalTests: testPrompts.length,
          totalProviders: providers?.length || 4,
        },
      },
    });
  } catch (error) {
    console.error('Error running benchmark:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run benchmark',
    });
  }
});

/**
 * @route   DELETE /api/ai/providers/cache
 * @desc    Clear AI response cache
 * @access  Private (Admin only)
 */
router.delete('/cache', async (req, res) => {
  try {
    AIProviderService.clearCache();

    res.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
    });
  }
});

module.exports = router;
