/**
 * Pipeline API Routes
 * 
 * Complete CRUD operations for pipeline management.
 * Handles sales/support pipelines, stages, and analytics.
 */

const express = require('express');
const router = express.Router();
const Pipeline = require('../../models/Pipeline');
const Deal = require('../../models/Deal');
const authenticate = require('../../middleware/auth');

// ============================================
// PIPELINE CRUD
// ============================================

/**
 * GET /api/crm/pipelines
 * Get all pipelines for workspace
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { workspaceId, type, includeInactive } = req.query;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }
    
    let pipelines;
    
    if (type) {
      pipelines = await Pipeline.findByType(type, workspaceId);
    } else {
      pipelines = await Pipeline.findByWorkspace(workspaceId, includeInactive === 'true');
    }
    
    await Pipeline.populate(pipelines, [
      { path: 'owner', select: 'first_name last_name email' },
      { path: 'workspace', select: 'name slug' },
    ]);
    
    res.json({
      success: true,
      count: pipelines.length,
      pipelines,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/pipelines/templates
 * Get pipeline templates
 */
router.get('/templates', authenticate, async (req, res) => {
  try {
    const templates = await Pipeline.findTemplates();
    
    res.json({
      success: true,
      count: templates.length,
      templates,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/pipelines/:id
 * Get pipeline by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { includeDeals } = req.query;
    
    const pipeline = await Pipeline.findById(id)
      .populate('owner', 'first_name last_name email')
      .populate('workspace', 'name slug');
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    const response = {
      success: true,
      pipeline,
    };
    
    // Include deals if requested
    if (includeDeals === 'true') {
      await pipeline.populate('deals');
      response.deals = pipeline.deals;
    }
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/pipelines
 * Create new pipeline
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      icon,
      workspace,
      pipelineType,
      stages,
      settings,
      permissions,
      isTemplate,
      templateCategory,
    } = req.body;
    
    // Validate required fields
    if (!name || !workspace) {
      return res.status(400).json({ error: 'Name and workspace are required' });
    }
    
    // Create default stages if not provided
    const defaultStages = stages || [
      {
        id: `stage_${Date.now()}_1`,
        name: 'New',
        color: '#3B82F6',
        order: 1,
        probability: 10,
      },
      {
        id: `stage_${Date.now()}_2`,
        name: 'Qualified',
        color: '#8B5CF6',
        order: 2,
        probability: 30,
      },
      {
        id: `stage_${Date.now()}_3`,
        name: 'Proposal',
        color: '#F59E0B',
        order: 3,
        probability: 60,
      },
      {
        id: `stage_${Date.now()}_4`,
        name: 'Negotiation',
        color: '#EC4899',
        order: 4,
        probability: 80,
      },
      {
        id: `stage_${Date.now()}_5`,
        name: 'Closed Won',
        color: '#10B981',
        order: 5,
        probability: 100,
      },
      {
        id: `stage_${Date.now()}_6`,
        name: 'Closed Lost',
        color: '#EF4444',
        order: 6,
        probability: 0,
      },
    ];
    
    const pipeline = new Pipeline({
      name,
      description,
      icon: icon || '🚀',
      workspace,
      owner: userId,
      pipelineType: pipelineType || 'sales',
      stages: defaultStages,
      settings: settings || {
        defaultStage: defaultStages[0].id,
        winStages: [defaultStages[4].id],
        lostStages: [defaultStages[5].id],
      },
      permissions: permissions || {},
      isTemplate: isTemplate || false,
      templateCategory,
    });
    
    await pipeline.save();
    
    await pipeline.populate('owner', 'first_name last_name email');
    await pipeline.populate('workspace', 'name slug');
    
    res.status(201).json({
      success: true,
      message: 'Pipeline created successfully',
      pipeline,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/pipelines/:id
 * Update pipeline
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      icon,
      pipelineType,
      settings,
      permissions,
      isActive,
    } = req.body;
    
    const pipeline = await Pipeline.findById(id);
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    // Update fields
    if (name) pipeline.name = name;
    if (description !== undefined) pipeline.description = description;
    if (icon) pipeline.icon = icon;
    if (pipelineType) pipeline.pipelineType = pipelineType;
    if (settings) pipeline.settings = { ...pipeline.settings, ...settings };
    if (permissions) pipeline.permissions = { ...pipeline.permissions, ...permissions };
    if (isActive !== undefined) pipeline.isActive = isActive;
    
    await pipeline.save();
    
    res.json({
      success: true,
      message: 'Pipeline updated successfully',
      pipeline,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/pipelines/:id
 * Delete pipeline (soft delete)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const pipeline = await Pipeline.findById(id);
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    // Check if pipeline has active deals
    const dealCount = await Deal.countDocuments({
      pipeline: id,
      status: 'open',
      isArchived: false,
    });
    
    if (dealCount > 0) {
      return res.status(400).json({
        error: `Cannot delete pipeline with ${dealCount} active deals. Archive or reassign them first.`,
      });
    }
    
    pipeline.isActive = false;
    await pipeline.save();
    
    res.json({
      success: true,
      message: 'Pipeline deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STAGE MANAGEMENT
// ============================================

/**
 * POST /api/crm/pipelines/:id/stages
 * Add stage to pipeline
 */
router.post('/:id/stages', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const stageData = req.body;
    
    const pipeline = await Pipeline.findById(id);
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    await pipeline.addStage(stageData);
    
    res.json({
      success: true,
      message: 'Stage added successfully',
      pipeline,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/pipelines/:id/stages/:stageId
 * Update stage
 */
router.put('/:id/stages/:stageId', authenticate, async (req, res) => {
  try {
    const { id, stageId } = req.params;
    const updates = req.body;
    
    const pipeline = await Pipeline.findById(id);
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    await pipeline.updateStage(stageId, updates);
    
    res.json({
      success: true,
      message: 'Stage updated successfully',
      pipeline,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/pipelines/:id/stages/:stageId
 * Delete stage
 */
router.delete('/:id/stages/:stageId', authenticate, async (req, res) => {
  try {
    const { id, stageId } = req.params;
    
    const pipeline = await Pipeline.findById(id);
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    // Check if stage has deals
    const dealCount = await Deal.countDocuments({
      pipeline: id,
      stage: stageId,
      isArchived: false,
    });
    
    if (dealCount > 0) {
      return res.status(400).json({
        error: `Cannot delete stage with ${dealCount} deals. Move or archive them first.`,
      });
    }
    
    await pipeline.deleteStage(stageId);
    
    res.json({
      success: true,
      message: 'Stage deleted successfully',
      pipeline,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/pipelines/:id/stages/reorder
 * Reorder stages
 */
router.put('/:id/stages/reorder', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { stageOrder } = req.body; // Array of stage IDs in new order
    
    if (!Array.isArray(stageOrder)) {
      return res.status(400).json({ error: 'stageOrder must be an array' });
    }
    
    const pipeline = await Pipeline.findById(id);
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    await pipeline.reorderStages(stageOrder);
    
    res.json({
      success: true,
      message: 'Stages reordered successfully',
      pipeline,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ANALYTICS & STATISTICS
// ============================================

/**
 * GET /api/crm/pipelines/:id/stats
 * Get pipeline statistics
 */
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { refresh } = req.query;
    
    const pipeline = await Pipeline.findById(id);
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    // Refresh stats if requested
    if (refresh === 'true') {
      await pipeline.updateStats();
    }
    
    res.json({
      success: true,
      stats: pipeline.stats,
      winRate: pipeline.winRate,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/pipelines/:id/velocity
 * Get pipeline velocity (avg time per stage)
 */
router.get('/:id/velocity', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.query;
    
    const pipeline = await Pipeline.findById(id);
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    // Calculate date range
    const daysAgo = parseInt(days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    // Get deals closed in this period
    const deals = await Deal.find({
      pipeline: id,
      status: { $in: ['won', 'lost'] },
      closedAt: { $gte: startDate },
    });
    
    // Calculate velocity per stage
    const stageVelocity = {};
    
    pipeline.stages.forEach(stage => {
      stageVelocity[stage.id] = {
        name: stage.name,
        avgDuration: 0,
        dealCount: 0,
      };
    });
    
    deals.forEach(deal => {
      deal.stageHistory.forEach(history => {
        if (history.duration && stageVelocity[history.stage]) {
          stageVelocity[history.stage].avgDuration += history.duration;
          stageVelocity[history.stage].dealCount += 1;
        }
      });
    });
    
    // Calculate averages
    Object.keys(stageVelocity).forEach(stageId => {
      const stage = stageVelocity[stageId];
      if (stage.dealCount > 0) {
        stage.avgDuration = stage.avgDuration / stage.dealCount;
      }
    });
    
    res.json({
      success: true,
      period: `${daysAgo} days`,
      totalDeals: deals.length,
      stageVelocity,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/pipelines/:id/conversion
 * Get conversion funnel
 */
router.get('/:id/conversion', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const pipeline = await Pipeline.findById(id);
    
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    // Get deal counts per stage
    const stageCounts = {};
    
    for (const stage of pipeline.stages) {
      const count = await Deal.countDocuments({
        pipeline: id,
        stage: stage.id,
        isArchived: false,
      });
      
      stageCounts[stage.id] = {
        name: stage.name,
        count,
        probability: stage.probability,
      };
    }
    
    // Calculate conversion rates
    const stages = pipeline.stages.sort((a, b) => a.order - b.order);
    const conversions = [];
    
    for (let i = 0; i < stages.length - 1; i++) {
      const currentStage = stages[i];
      const nextStage = stages[i + 1];
      
      const currentCount = stageCounts[currentStage.id].count;
      const nextCount = stageCounts[nextStage.id].count;
      
      const conversionRate = currentCount > 0
        ? (nextCount / currentCount) * 100
        : 0;
      
      conversions.push({
        from: currentStage.name,
        to: nextStage.name,
        fromCount: currentCount,
        toCount: nextCount,
        conversionRate: Math.round(conversionRate * 100) / 100,
      });
    }
    
    res.json({
      success: true,
      stageCounts,
      conversions,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
