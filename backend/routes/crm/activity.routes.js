/**
 * Activity API Routes
 * 
 * Activity logging and timeline functionality.
 * Provides audit trail and activity feeds for entities.
 */

const express = require('express');
const router = express.Router();
const Activity = require('../../models/Activity');
const Workspace = require('../../models/Workspace');
const authenticate = require('../../middleware/auth');

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
// ACTIVITY QUERIES
// ============================================

/**
 * GET /api/crm/activities?workspace=:workspaceId
 * Get all activities for a workspace
 */
router.get('/', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspaceId = req.workspace._id;
    const {
      type,
      actor,
      deal,
      contact,
      board,
      item,
      pipeline,
      startDate,
      endDate,
      limit,
      skip,
    } = req.query;
    
    const query = { workspace: workspaceId };
    
    if (type) query.type = type;
    if (actor) query.actor = actor;
    if (deal) query.deal = deal;
    if (contact) query.contact = contact;
    if (board) query.board = board;
    if (item) query.item = item;
    if (pipeline) query.pipeline = pipeline;
    
    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    let activitiesQuery = Activity.find(query)
      .populate('actor', 'first_name last_name email')
      .populate('deal', 'title value status')
      .populate('contact', 'first_name last_name email')
      .populate('board', 'name')
      .populate('item', 'name')
      .populate('pipeline', 'name')
      .sort({ createdAt: -1 });
    
    if (limit) {
      activitiesQuery = activitiesQuery.limit(parseInt(limit));
    }
    
    if (skip) {
      activitiesQuery = activitiesQuery.skip(parseInt(skip));
    }
    
    const activities = await activitiesQuery;
    const total = await Activity.countDocuments(query);
    
    res.json({
      success: true,
      count: activities.length,
      total,
      data: activities,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/activities/timeline/:entityType/:entityId
 * Get timeline for a specific entity
 */
router.get('/timeline/:entityType/:entityId', authenticate, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit } = req.query;
    
    const validEntityTypes = ['deal', 'contact', 'board', 'item', 'pipeline'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({ error: `Entity type must be one of: ${validEntityTypes.join(', ')}` });
    }
    
    const activities = await Activity.getTimeline(
      entityType,
      entityId,
      parseInt(limit) || 50
    );
    
    res.json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/activities/user/:userId
 * Get activities by user (actor)
 */
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, workspace, limit, skip } = req.query;
    
    const filters = {};
    if (type) filters.type = type;
    if (workspace) filters.workspace = workspace;
    
    let activitiesQuery = Activity.findByActor(userId, filters)
      .populate('actor', 'first_name last_name email')
      .populate('deal', 'title')
      .populate('contact', 'first_name last_name')
      .populate('workspace', 'name');
    
    if (limit) {
      activitiesQuery = activitiesQuery.limit(parseInt(limit));
    }
    
    if (skip) {
      activitiesQuery = activitiesQuery.skip(parseInt(skip));
    }
    
    const activities = await activitiesQuery;
    
    res.json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/activities/deal/:dealId
 * Get activities for a deal
 */
router.get('/deal/:dealId', authenticate, async (req, res) => {
  try {
    const { dealId } = req.params;
    
    const activities = await Activity.findByDeal(dealId)
      .populate('actor', 'first_name last_name email');
    
    res.json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    console.error('Error fetching deal activities:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/activities/contact/:contactId
 * Get activities for a contact
 */
router.get('/contact/:contactId', authenticate, async (req, res) => {
  try {
    const { contactId } = req.params;
    
    const activities = await Activity.findByContact(contactId)
      .populate('actor', 'first_name last_name email');
    
    res.json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    console.error('Error fetching contact activities:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/activities/type/:type?workspace=:workspaceId
 * Get activities by type
 */
router.get('/type/:type', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const { type } = req.params;
    const workspaceId = req.workspace._id;
    const { limit, skip } = req.query;
    
    let activitiesQuery = Activity.findByType(type, workspaceId)
      .populate('actor', 'first_name last_name email');
    
    if (limit) {
      activitiesQuery = activitiesQuery.limit(parseInt(limit));
    }
    
    if (skip) {
      activitiesQuery = activitiesQuery.skip(parseInt(skip));
    }
    
    const activities = await activitiesQuery;
    
    res.json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    console.error('Error fetching activities by type:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ACTIVITY LOGGING
// ============================================

/**
 * POST /api/crm/activities
 * Log a new activity
 */
router.post('/', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const workspaceId = req.workspace._id;
    
    const {
      type,
      description,
      deal,
      contact,
      board,
      item,
      pipeline,
      changes,
      metadata,
      notes,
      isPrivate,
    } = req.body;
    
    // Validation
    if (!type) {
      return res.status(400).json({ error: 'Activity type is required' });
    }
    
    if (!description) {
      return res.status(400).json({ error: 'Activity description is required' });
    }
    
    // Log activity
    const activity = await Activity.logActivity({
      type,
      workspace: workspaceId,
      actor: userId,
      description,
      deal,
      contact,
      board,
      item,
      pipeline,
      changes: changes || {},
      metadata: metadata || {},
      notes,
      isPrivate: isPrivate || false,
    });
    
    await activity.populate('actor', 'first_name last_name email');
    
    res.status(201).json({
      success: true,
      message: 'Activity logged successfully',
      data: activity,
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ACTIVITY STATS
// ============================================

/**
 * GET /api/crm/activities/stats?workspace=:workspaceId
 * Get activity statistics
 */
router.get('/stats', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspaceId = req.workspace._id;
    const { startDate, endDate } = req.query;
    
    const dateFilter = { workspace: workspaceId };
    
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    // Total activities
    const totalActivities = await Activity.countDocuments(dateFilter);
    
    // Activities by type
    const activitiesByType = await Activity.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    
    // Activities by actor
    const activitiesByActor = await Activity.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$actor', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    
    // Populate actor names
    // TODO: Populate actor details when User model is available
    // for (const actorStat of activitiesByActor) {
    //   const User = require('../../models/User');
    //   const user = await User.findById(actorStat._id).select('first_name last_name email');
    //   actorStat.actor = user;
    // }
    
    // Activities per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activitiesPerDay = await Activity.aggregate([
      {
        $match: {
          workspace: workspaceId,
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    res.json({
      success: true,
      data: {
        totalActivities,
        activitiesByType,
        activitiesByActor,
        activitiesPerDay,
      },
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/activities/recent?workspace=:workspaceId
 * Get recent activities
 */
router.get('/recent', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspaceId = req.workspace._id;
    const { limit } = req.query;
    
    const activities = await Activity.find({ workspace: workspaceId })
      .populate('actor', 'first_name last_name email')
      .populate('deal', 'title')
      .populate('contact', 'first_name last_name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 20);
    
    res.json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
