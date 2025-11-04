/**
 * Deal API Routes
 * 
 * Complete CRUD operations for deal management.
 * Handles stage movement, products, activities, and analytics.
 */

const express = require('express');
const router = express.Router();
const Deal = require('../../models/Deal');
const Pipeline = require('../../models/Pipeline');
const Workspace = require('../../models/Workspace');
const authenticate = require('../../middleware/auth');

// Middleware to check deal access
const checkDealAccess = async (req, res, next) => {
  try {
    const dealId = req.params.dealId || req.params.id;
    const userId = req.user.id;
    
    const deal = await Deal.findById(dealId);
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    
    if (deal.isArchived) {
      return res.status(410).json({ error: 'Deal is archived' });
    }
    
    // Check workspace access
    const workspace = await Workspace.findById(deal.workspace);
    if (!workspace || !workspace.canUserAccess(userId)) {
      return res.status(403).json({ error: 'Access denied to this deal' });
    }
    
    // Check if deal is private
    if (deal.isPrivate && deal.owner.toString() !== userId.toString()) {
      const isAssigned = deal.assignedTo.some(u => u.toString() === userId.toString());
      const isFollower = deal.followers.some(u => u.toString() === userId.toString());
      
      if (!isAssigned && !isFollower) {
        return res.status(403).json({ error: 'Access denied to this private deal' });
      }
    }
    
    req.deal = deal;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Middleware to check workspace access
const checkWorkspaceAccess = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.query.workspace;
    const userId = req.user.id;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    if (!workspace.canUserAccess(userId)) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }
    
    req.workspace = workspace;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// DEAL CRUD
// ============================================

/**
 * GET /api/crm/deals?workspace=:workspaceId
 * Get all deals for a workspace
 */
router.get('/', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspaceId = req.workspace._id;
    const userId = req.user.id;
    const {
      pipeline,
      stage,
      status,
      owner,
      priority,
      includeArchived,
      includePrivate,
      sortBy,
      sortOrder,
      limit,
      skip,
    } = req.query;
    
    const query = { workspace: workspaceId };
    
    if (pipeline) query.pipeline = pipeline;
    if (stage) query.stage = stage;
    if (status) query.status = status;
    if (owner) query.owner = owner;
    if (priority) query.priority = priority;
    
    if (includeArchived !== 'true') {
      query.isArchived = false;
    }
    
    // Handle private deals
    if (includePrivate !== 'true') {
      query.$or = [
        { isPrivate: false },
        { owner: userId },
        { assignedTo: userId },
        { followers: userId },
      ];
    }
    
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.createdAt = -1;
    }
    
    let dealsQuery = Deal.find(query)
      .populate('owner', 'first_name last_name email')
      .populate('assignedTo', 'first_name last_name email')
      .populate('contact', 'first_name last_name email phone')
      .populate('company', 'agency_name')
      .populate('pipeline', 'name')
      .sort(sortOptions);
    
    if (limit) {
      dealsQuery = dealsQuery.limit(parseInt(limit));
    }
    
    if (skip) {
      dealsQuery = dealsQuery.skip(parseInt(skip));
    }
    
    const deals = await dealsQuery;
    const total = await Deal.countDocuments(query);
    
    res.json({
      success: true,
      count: deals.length,
      total,
      data: deals,
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/deals/overdue?workspace=:workspaceId
 * Get overdue deals
 */
router.get('/overdue', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspaceId = req.workspace._id;
    
    const deals = await Deal.findOverdue(workspaceId)
      .populate('owner', 'first_name last_name email')
      .populate('pipeline', 'name')
      .populate('contact', 'first_name last_name email');
    
    res.json({
      success: true,
      count: deals.length,
      data: deals,
    });
  } catch (error) {
    console.error('Error fetching overdue deals:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/deals/rotten?workspace=:workspaceId
 * Get rotten deals (no activity for X days)
 */
router.get('/rotten', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspaceId = req.workspace._id;
    const { rottenDays } = req.query;
    
    const deals = await Deal.findRotten(workspaceId, parseInt(rottenDays) || 30)
      .populate('owner', 'first_name last_name email')
      .populate('pipeline', 'name')
      .populate('contact', 'first_name last_name email');
    
    res.json({
      success: true,
      count: deals.length,
      data: deals,
    });
  } catch (error) {
    console.error('Error fetching rotten deals:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/deals/:id
 * Get deal by ID
 */
router.get('/:id', authenticate, checkDealAccess, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('owner', 'first_name last_name email')
      .populate('assignedTo', 'first_name last_name email')
      .populate('followers', 'first_name last_name email')
      .populate('contact', 'first_name last_name email phone company')
      .populate('company', 'agency_name contact_email contact_phone')
      .populate('pipeline', 'name stages')
      .populate('workspace', 'name slug')
      .populate('board', 'name')
      .populate('products.product', 'name description');
    
    res.json({
      success: true,
      data: deal,
    });
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/deals
 * Create a new deal
 */
router.post('/', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const workspaceId = req.workspace._id;
    
    const {
      title,
      description,
      pipeline,
      stage,
      contact,
      company,
      value,
      currency,
      expectedCloseDate,
      priority,
      tags,
      source,
      sourceDetails,
      products,
      customFields,
      isPrivate,
    } = req.body;
    
    // Validation
    if (!title) {
      return res.status(400).json({ error: 'Deal title is required' });
    }
    
    if (!pipeline) {
      return res.status(400).json({ error: 'Pipeline is required' });
    }
    
    // Verify pipeline exists
    const pipelineDoc = await Pipeline.findById(pipeline);
    if (!pipelineDoc) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    // Get default stage if not provided
    let dealStage = stage;
    if (!dealStage) {
      dealStage = pipelineDoc.settings.defaultStage || pipelineDoc.stages[0].id;
    }
    
    // Get stage probability
    const stageObj = pipelineDoc.getStageById(dealStage);
    const probability = stageObj ? stageObj.probability : 50;
    
    // Create deal
    const deal = new Deal({
      title,
      description,
      pipeline,
      stage: dealStage,
      workspace: workspaceId,
      owner: userId,
      contact,
      company,
      value: value || 0,
      currency: currency || 'USD',
      probability,
      expectedValue: ((value || 0) * probability) / 100,
      expectedCloseDate,
      priority: priority || 'medium',
      tags: tags || [],
      source: source || 'manual',
      sourceDetails,
      products: products || [],
      customFields: customFields || {},
      isPrivate: isPrivate || false,
      stageHistory: [{
        stage: dealStage,
        enteredAt: new Date(),
        movedBy: userId,
      }],
    });
    
    await deal.save();
    
    await deal.populate([
      { path: 'owner', select: 'first_name last_name email' },
      { path: 'contact', select: 'first_name last_name email' },
      { path: 'pipeline', select: 'name' },
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      data: deal,
    });
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/deals/:id
 * Update deal
 */
router.put('/:id', authenticate, checkDealAccess, async (req, res) => {
  try {
    const deal = req.deal;
    const userId = req.user.id;
    
    // Check if user can edit (owner or assigned)
    const canEdit = deal.owner.toString() === userId.toString() ||
                    deal.assignedTo.some(u => u.toString() === userId.toString());
    
    if (!canEdit) {
      return res.status(403).json({ error: 'Insufficient permissions to edit deal' });
    }
    
    const {
      title,
      description,
      value,
      currency,
      expectedCloseDate,
      priority,
      tags,
      customFields,
      isPrivate,
      source,
      sourceDetails,
      leadScore,
      leadQuality,
      nextActivityAt,
      nextActivityType,
    } = req.body;
    
    // Update fields
    if (title) deal.title = title;
    if (description !== undefined) deal.description = description;
    if (value !== undefined) await deal.updateValue(value);
    if (currency) deal.currency = currency;
    if (expectedCloseDate !== undefined) deal.expectedCloseDate = expectedCloseDate;
    if (priority) deal.priority = priority;
    if (tags) deal.tags = tags;
    if (customFields) deal.customFields = { ...deal.customFields, ...customFields };
    if (isPrivate !== undefined) deal.isPrivate = isPrivate;
    if (source) deal.source = source;
    if (sourceDetails !== undefined) deal.sourceDetails = sourceDetails;
    if (leadScore !== undefined) deal.leadScore = leadScore;
    if (leadQuality) deal.leadQuality = leadQuality;
    if (nextActivityAt !== undefined) deal.nextActivityAt = nextActivityAt;
    if (nextActivityType) deal.nextActivityType = nextActivityType;
    
    await deal.save();
    
    res.json({
      success: true,
      message: 'Deal updated successfully',
      data: deal,
    });
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/deals/:id
 * Archive deal (soft delete)
 */
router.delete('/:id', authenticate, checkDealAccess, async (req, res) => {
  try {
    const deal = req.deal;
    const userId = req.user.id;
    
    // Only owner can delete
    if (deal.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only deal owner can delete' });
    }
    
    deal.isArchived = true;
    deal.archivedAt = new Date();
    deal.archivedBy = userId;
    
    await deal.save();
    
    res.json({
      success: true,
      message: 'Deal archived successfully',
    });
  } catch (error) {
    console.error('Error archiving deal:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STAGE MANAGEMENT
// ============================================

/**
 * PUT /api/crm/deals/:id/stage
 * Move deal to a new stage
 */
router.put('/:id/stage', authenticate, checkDealAccess, async (req, res) => {
  try {
    const deal = req.deal;
    const userId = req.user.id;
    const { stage, note } = req.body;
    
    if (!stage) {
      return res.status(400).json({ error: 'New stage is required' });
    }
    
    await deal.moveToStage(stage, userId, note);
    
    res.json({
      success: true,
      message: 'Deal moved to new stage',
      data: deal,
    });
  } catch (error) {
    console.error('Error moving deal to stage:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/deals/:id/stage-history
 * Get stage history for deal
 */
router.get('/:id/stage-history', authenticate, checkDealAccess, async (req, res) => {
  try {
    const deal = req.deal;
    
    const history = await Deal.findById(deal._id)
      .select('stageHistory')
      .populate('stageHistory.movedBy', 'first_name last_name email');
    
    res.json({
      success: true,
      data: history.stageHistory,
    });
  } catch (error) {
    console.error('Error fetching stage history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/deals/:id/win
 * Mark deal as won
 */
router.post('/:id/win', authenticate, checkDealAccess, async (req, res) => {
  try {
    const deal = req.deal;
    const { reason } = req.body;
    
    await deal.markAsWon(reason);
    
    res.json({
      success: true,
      message: 'Deal marked as won',
      data: deal,
    });
  } catch (error) {
    console.error('Error marking deal as won:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/deals/:id/lose
 * Mark deal as lost
 */
router.post('/:id/lose', authenticate, checkDealAccess, async (req, res) => {
  try {
    const deal = req.deal;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Lost reason is required' });
    }
    
    await deal.markAsLost(reason);
    
    res.json({
      success: true,
      message: 'Deal marked as lost',
      data: deal,
    });
  } catch (error) {
    console.error('Error marking deal as lost:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PRODUCT MANAGEMENT
// ============================================

/**
 * POST /api/crm/deals/:id/products
 * Add product to deal
 */
router.post('/:id/products', authenticate, checkDealAccess, async (req, res) => {
  try {
    const deal = req.deal;
    const productData = req.body;
    
    if (!productData.product || !productData.quantity || !productData.price) {
      return res.status(400).json({ error: 'Product, quantity, and price are required' });
    }
    
    await deal.addProduct(productData);
    
    res.status(201).json({
      success: true,
      message: 'Product added to deal',
      data: deal,
    });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/deals/:id/products/:productIndex
 * Update product in deal
 */
router.put('/:id/products/:productIndex', authenticate, checkDealAccess, async (req, res) => {
  try {
    const deal = req.deal;
    const productIndex = parseInt(req.params.productIndex);
    const { quantity, price, discount } = req.body;
    
    if (productIndex < 0 || productIndex >= deal.products.length) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const product = deal.products[productIndex];
    
    if (quantity !== undefined) product.quantity = quantity;
    if (price !== undefined) product.price = price;
    if (discount !== undefined) product.discount = discount;
    
    // Recalculate total
    product.total = (product.price * product.quantity) - product.discount;
    
    // Update deal value
    deal.value = deal.products.reduce((sum, p) => sum + p.total, 0);
    deal.expectedValue = (deal.value * deal.probability) / 100;
    
    await deal.save();
    
    res.json({
      success: true,
      message: 'Product updated',
      data: deal,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/deals/:id/products/:productIndex
 * Remove product from deal
 */
router.delete('/:id/products/:productIndex', authenticate, checkDealAccess, async (req, res) => {
  try {
    const deal = req.deal;
    const productIndex = parseInt(req.params.productIndex);
    
    if (productIndex < 0 || productIndex >= deal.products.length) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    deal.products.splice(productIndex, 1);
    
    // Update deal value
    deal.value = deal.products.reduce((sum, p) => sum + p.total, 0);
    deal.expectedValue = (deal.value * deal.probability) / 100;
    
    await deal.save();
    
    res.json({
      success: true,
      message: 'Product removed from deal',
      data: deal,
    });
  } catch (error) {
    console.error('Error removing product:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ACTIVITY TRACKING
// ============================================

/**
 * POST /api/crm/deals/:id/activity
 * Record activity on deal
 */
router.post('/:id/activity', authenticate, checkDealAccess, async (req, res) => {
  try {
    const deal = req.deal;
    const { type } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: 'Activity type is required' });
    }
    
    const validTypes = ['email', 'call', 'meeting', 'whatsapp'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Activity type must be one of: ${validTypes.join(', ')}` });
    }
    
    await deal.recordActivity(type);
    
    res.json({
      success: true,
      message: 'Activity recorded',
      data: {
        interactions: deal.interactions,
        engagementScore: deal.engagementScore,
        lastActivityAt: deal.lastActivityAt,
      },
    });
  } catch (error) {
    console.error('Error recording activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TEAM MANAGEMENT
// ============================================

/**
 * POST /api/crm/deals/:id/assign
 * Assign deal to user
 */
router.post('/:id/assign', authenticate, checkDealAccess, async (req, res) => {
  try {
    const deal = req.deal;
    const userId = req.user.id;
    const { targetUserId } = req.body;
    
    // Only owner can assign
    if (deal.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only deal owner can assign' });
    }
    
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }
    
    // Check if already assigned
    const isAlreadyAssigned = deal.assignedTo.some(u => u.toString() === targetUserId);
    
    if (!isAlreadyAssigned) {
      deal.assignedTo.push(targetUserId);
      await deal.save();
    }
    
    res.json({
      success: true,
      message: 'Deal assigned successfully',
      data: deal,
    });
  } catch (error) {
    console.error('Error assigning deal:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/deals/:id/follow
 * Follow/unfollow deal
 */
router.post('/:id/follow', authenticate, checkDealAccess, async (req, res) => {
  try {
    const deal = req.deal;
    const userId = req.user.id;
    
    const isFollowing = deal.followers.some(u => u.toString() === userId.toString());
    
    if (isFollowing) {
      // Unfollow
      deal.followers = deal.followers.filter(u => u.toString() !== userId.toString());
    } else {
      // Follow
      deal.followers.push(userId);
    }
    
    await deal.save();
    
    res.json({
      success: true,
      message: isFollowing ? 'Deal unfollowed' : 'Deal followed',
      isFollowing: !isFollowing,
      data: deal,
    });
  } catch (error) {
    console.error('Error following/unfollowing deal:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ANALYTICS
// ============================================

/**
 * GET /api/crm/deals/:id/analytics
 * Get deal analytics
 */
router.get('/:id/analytics', authenticate, checkDealAccess, async (req, res) => {
  try {
    const deal = req.deal;
    
    const analytics = {
      value: deal.value,
      expectedValue: deal.expectedValue,
      probability: deal.probability,
      daysInCurrentStage: deal.daysInStage,
      totalDuration: deal.totalDuration,
      stageCount: deal.stageHistory.length,
      engagementScore: deal.engagementScore,
      interactions: deal.interactions,
      leadScore: deal.leadScore,
      leadQuality: deal.leadQuality,
      isOverdue: deal.isOverdue,
      productsTotal: deal.productsTotal,
      productsCount: deal.products.length,
    };
    
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error fetching deal analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
