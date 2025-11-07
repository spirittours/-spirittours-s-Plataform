/**
 * Workspace API Routes
 * 
 * Complete CRUD operations for workspace management.
 * Handles multi-tenancy, members, permissions, and settings.
 */

const express = require('express');
const router = express.Router();
const Workspace = require('../../models/Workspace');
const authenticate = require('../../middleware/auth');

// Middleware to check workspace access
const checkWorkspaceAccess = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.params.id;
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
// WORKSPACE CRUD
// ============================================

/**
 * GET /api/crm/workspaces
 * Get all workspaces for current user
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const workspaces = await Workspace.findByUserId(userId)
      .populate('owner', 'first_name last_name email')
      .populate('members.user', 'first_name last_name email');
    
    res.json({
      success: true,
      count: workspaces.length,
      workspaces,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/workspaces/:id
 * Get workspace by ID
 */
router.get('/:id', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspace = req.workspace;
    
    await workspace.populate('owner', 'first_name last_name email');
    await workspace.populate('members.user', 'first_name last_name email');
    
    res.json({
      success: true,
      workspace,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/workspaces/slug/:slug
 * Get workspace by slug
 */
router.get('/slug/:slug', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user.id;
    
    const workspace = await Workspace.findBySlug(slug)
      .populate('owner', 'first_name last_name email')
      .populate('members.user', 'first_name last_name email');
    
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    if (!workspace.canUserAccess(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      success: true,
      workspace,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/workspaces
 * Create new workspace
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      slug,
      settings,
      features,
      subscription,
      branding,
    } = req.body;
    
    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }
    
    // Check if slug already exists
    const existingWorkspace = await Workspace.findOne({ slug });
    if (existingWorkspace) {
      return res.status(400).json({ error: 'Slug already in use' });
    }
    
    // Create workspace
    const workspace = new Workspace({
      name,
      description,
      slug,
      owner: userId,
      members: [{
        user: userId,
        role: 'owner',
        permissions: {
          canManageBoards: true,
          canManagePipelines: true,
          canManageMembers: true,
          canExportData: true,
          canManageIntegrations: true,
        },
      }],
      settings: settings || {},
      features: features || {},
      subscription: subscription || { plan: 'free', status: 'trial', seats: 5, usedSeats: 1 },
      branding: branding || {},
    });
    
    await workspace.save();
    
    await workspace.populate('owner', 'first_name last_name email');
    
    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      workspace,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/workspaces/:id
 * Update workspace
 */
router.put('/:id', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspace = req.workspace;
    const userId = req.user.id;
    
    // Check if user is owner or admin
    const userRole = workspace.getUserRole(userId);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can update workspace' });
    }
    
    const {
      name,
      description,
      settings,
      features,
      subscription,
      branding,
      security,
      integrations,
    } = req.body;
    
    // Update fields
    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    if (settings) workspace.settings = { ...workspace.settings, ...settings };
    if (features) workspace.features = { ...workspace.features, ...features };
    if (subscription) workspace.subscription = { ...workspace.subscription, ...subscription };
    if (branding) workspace.branding = { ...workspace.branding, ...branding };
    if (security) workspace.security = { ...workspace.security, ...security };
    if (integrations) workspace.integrations = { ...workspace.integrations, ...integrations };
    
    await workspace.save();
    
    res.json({
      success: true,
      message: 'Workspace updated successfully',
      workspace,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/workspaces/:id
 * Delete workspace (soft delete - set isActive to false)
 */
router.delete('/:id', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspace = req.workspace;
    const userId = req.user.id;
    
    // Only owner can delete workspace
    if (workspace.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only workspace owner can delete it' });
    }
    
    workspace.isActive = false;
    await workspace.save();
    
    res.json({
      success: true,
      message: 'Workspace deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MEMBER MANAGEMENT
// ============================================

/**
 * POST /api/crm/workspaces/:id/members
 * Add member to workspace
 */
router.post('/:id/members', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspace = req.workspace;
    const userId = req.user.id;
    const { memberId, role, permissions } = req.body;
    
    // Check if user can manage members
    const userRole = workspace.getUserRole(userId);
    const userPermissions = workspace.getUserPermissions(userId);
    
    if (userRole !== 'owner' && userRole !== 'admin' && !userPermissions?.canManageMembers) {
      return res.status(403).json({ error: 'You do not have permission to manage members' });
    }
    
    // Add member
    await workspace.addMember(memberId, role, permissions);
    
    await workspace.populate('members.user', 'first_name last_name email');
    
    res.json({
      success: true,
      message: 'Member added successfully',
      workspace,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/workspaces/:id/members/:memberId
 * Update member role or permissions
 */
router.put('/:id/members/:memberId', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspace = req.workspace;
    const userId = req.user.id;
    const { memberId } = req.params;
    const { role, permissions } = req.body;
    
    // Check permissions
    const userRole = workspace.getUserRole(userId);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can update members' });
    }
    
    // Update role if provided
    if (role) {
      await workspace.updateMemberRole(memberId, role);
    }
    
    // Update permissions if provided
    if (permissions) {
      await workspace.updateMemberPermissions(memberId, permissions);
    }
    
    res.json({
      success: true,
      message: 'Member updated successfully',
      workspace,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/workspaces/:id/members/:memberId
 * Remove member from workspace
 */
router.delete('/:id/members/:memberId', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspace = req.workspace;
    const userId = req.user.id;
    const { memberId } = req.params;
    
    // Check permissions
    const userRole = workspace.getUserRole(userId);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can remove members' });
    }
    
    await workspace.removeMember(memberId);
    
    res.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SETTINGS & CONFIGURATION
// ============================================

/**
 * PUT /api/crm/workspaces/:id/settings
 * Update workspace settings
 */
router.put('/:id/settings', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspace = req.workspace;
    const { settings } = req.body;
    
    workspace.settings = { ...workspace.settings, ...settings };
    await workspace.save();
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: workspace.settings,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/workspaces/:id/integrations
 * Update workspace integrations
 */
router.put('/:id/integrations', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspace = req.workspace;
    const userId = req.user.id;
    const { integrations } = req.body;
    
    // Check permission
    const userPermissions = workspace.getUserPermissions(userId);
    if (!userPermissions?.canManageIntegrations) {
      return res.status(403).json({ error: 'You do not have permission to manage integrations' });
    }
    
    workspace.integrations = { ...workspace.integrations, ...integrations };
    await workspace.save();
    
    res.json({
      success: true,
      message: 'Integrations updated successfully',
      integrations: workspace.integrations,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/workspaces/:id/security
 * Update workspace security settings
 */
router.put('/:id/security', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspace = req.workspace;
    const userId = req.user.id;
    const { security } = req.body;
    
    // Only owner can update security
    if (workspace.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only workspace owner can update security settings' });
    }
    
    workspace.security = { ...workspace.security, ...security };
    await workspace.save();
    
    res.json({
      success: true,
      message: 'Security settings updated successfully',
      security: workspace.security,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/workspaces/:id/panic
 * Activate panic mode (emergency lockdown)
 */
router.post('/:id/panic', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspace = req.workspace;
    const userId = req.user.id;
    
    // Only owner can activate panic mode
    if (workspace.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only workspace owner can activate panic mode' });
    }
    
    workspace.isPanicMode = true;
    await workspace.save();
    
    // TODO: Implement panic mode actions:
    // - Lock all access
    // - Send notifications
    // - Log event
    
    res.json({
      success: true,
      message: 'Panic mode activated',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/workspaces/:id/panic
 * Deactivate panic mode
 */
router.delete('/:id/panic', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspace = req.workspace;
    const userId = req.user.id;
    
    // Only owner can deactivate panic mode
    if (workspace.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only workspace owner can deactivate panic mode' });
    }
    
    workspace.isPanicMode = false;
    await workspace.save();
    
    res.json({
      success: true,
      message: 'Panic mode deactivated',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STATISTICS
// ============================================

/**
 * GET /api/crm/workspaces/:id/stats
 * Get workspace statistics
 */
router.get('/:id/stats', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspace = req.workspace;
    
    // Get counts from related models
    const Board = require('../../models/Board');
    const Deal = require('../../models/Deal');
    const Pipeline = require('../../models/Pipeline');
    
    const [boardCount, dealCount, pipelineCount] = await Promise.all([
      Board.countDocuments({ workspace: workspace._id, isArchived: false }),
      Deal.countDocuments({ workspace: workspace._id, isArchived: false }),
      Pipeline.countDocuments({ workspace: workspace._id, isActive: true }),
    ]);
    
    const stats = {
      members: workspace.totalMembers,
      boards: boardCount,
      deals: dealCount,
      pipelines: pipelineCount,
      subscription: workspace.subscription,
      features: workspace.features,
      availableSeats: workspace.availableSeats,
    };
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
