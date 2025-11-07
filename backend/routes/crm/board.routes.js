/**
 * Board API Routes
 * 
 * Complete CRUD operations for board management.
 * Handles columns, views, automations, and permissions.
 */

const express = require('express');
const router = express.Router();
const Board = require('../../models/Board');
const Workspace = require('../../models/Workspace');
const authenticate = require('../../middleware/auth');

// Middleware to check board access
const checkBoardAccess = async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.params.id;
    const userId = req.user.id;
    
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    if (board.isArchived) {
      return res.status(410).json({ error: 'Board is archived' });
    }
    
    if (!board.canUserAccess(userId)) {
      return res.status(403).json({ error: 'Access denied to this board' });
    }
    
    req.board = board;
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
// BOARD CRUD
// ============================================

/**
 * GET /api/crm/boards?workspace=:workspaceId
 * Get all boards for a workspace
 */
router.get('/', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspaceId = req.workspace._id;
    const { type, includeArchived, includeTemplates } = req.query;
    
    const query = { workspace: workspaceId };
    
    if (type) {
      query.boardType = type;
    }
    
    if (includeArchived !== 'true') {
      query.isArchived = false;
    }
    
    if (includeTemplates === 'true') {
      query.isTemplate = true;
    }
    
    const boards = await Board.find(query)
      .populate('owner', 'first_name last_name email')
      .populate('permissions.allowedMembers.user', 'first_name last_name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: boards.length,
      data: boards,
    });
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/boards/templates
 * Get all board templates
 */
router.get('/templates', authenticate, async (req, res) => {
  try {
    const { category } = req.query;
    
    const query = { isTemplate: true, isArchived: false };
    
    if (category) {
      query.templateCategory = category;
    }
    
    const templates = await Board.find(query)
      .populate('owner', 'first_name last_name email')
      .sort({ usedAsTemplateCount: -1, createdAt: -1 });
    
    res.json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/boards/:id
 * Get board by ID
 */
router.get('/:id', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('owner', 'first_name last_name email')
      .populate('workspace', 'name slug')
      .populate('permissions.allowedMembers.user', 'first_name last_name email')
      .populate('views.createdBy', 'first_name last_name email');
    
    res.json({
      success: true,
      data: board,
    });
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/boards
 * Create a new board
 */
router.post('/', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const workspaceId = req.workspace._id;
    
    const {
      name,
      description,
      icon,
      boardType,
      columns,
      fromTemplate,
    } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Board name is required' });
    }
    
    // Default columns if not provided
    const defaultColumns = columns || [
      {
        id: `col_${Date.now()}_1`,
        name: 'Name',
        type: 'text',
        order: 1,
        visible: true,
        required: true,
      },
      {
        id: `col_${Date.now()}_2`,
        name: 'Status',
        type: 'status',
        order: 2,
        visible: true,
        options: {
          values: [
            { label: 'New', color: '#3B82F6' },
            { label: 'In Progress', color: '#F59E0B' },
            { label: 'Done', color: '#10B981' },
          ],
        },
      },
      {
        id: `col_${Date.now()}_3`,
        name: 'Owner',
        type: 'user',
        order: 3,
        visible: true,
      },
      {
        id: `col_${Date.now()}_4`,
        name: 'Due Date',
        type: 'date',
        order: 4,
        visible: true,
      },
    ];
    
    // Create board from template
    const boardData = {
      name,
      description,
      icon: icon || '📋',
      workspace: workspaceId,
      owner: userId,
      boardType: boardType || 'custom',
      columns: defaultColumns,
      views: [
        {
          id: `view_${Date.now()}_1`,
          name: 'Main Table',
          type: 'table',
          isDefault: true,
          visibleColumns: defaultColumns.map(c => c.id),
          createdBy: userId,
        },
      ],
      permissions: {
        visibility: 'workspace',
        allowedMembers: [],
      },
    };
    
    // If creating from template
    if (fromTemplate) {
      const template = await Board.findById(fromTemplate);
      if (template && template.isTemplate) {
        boardData.columns = template.columns;
        boardData.views = template.views.map(v => ({
          ...v.toObject(),
          id: `view_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        }));
        boardData.automations = template.automations;
        boardData.settings = template.settings;
        
        // Increment template usage
        template.usedAsTemplateCount += 1;
        await template.save();
      }
    }
    
    const board = new Board(boardData);
    await board.save();
    
    await board.populate('owner', 'first_name last_name email');
    
    res.status(201).json({
      success: true,
      message: 'Board created successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/boards/:id
 * Update board
 */
router.put('/:id', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    
    // Check if user has editor access
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions to edit board' });
    }
    
    const {
      name,
      description,
      icon,
      boardType,
      settings,
      isTemplate,
      templateCategory,
    } = req.body;
    
    // Update fields
    if (name) board.name = name;
    if (description !== undefined) board.description = description;
    if (icon) board.icon = icon;
    if (boardType) board.boardType = boardType;
    if (settings) board.settings = { ...board.settings, ...settings };
    if (isTemplate !== undefined) board.isTemplate = isTemplate;
    if (templateCategory) board.templateCategory = templateCategory;
    
    await board.save();
    
    res.json({
      success: true,
      message: 'Board updated successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/boards/:id
 * Archive board (soft delete)
 */
router.delete('/:id', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    
    // Only owner can delete
    if (board.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only board owner can delete' });
    }
    
    board.isArchived = true;
    board.archivedAt = new Date();
    board.archivedBy = userId;
    
    await board.save();
    
    res.json({
      success: true,
      message: 'Board archived successfully',
    });
  } catch (error) {
    console.error('Error archiving board:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/boards/:id/restore
 * Restore archived board
 */
router.post('/:id/restore', authenticate, async (req, res) => {
  try {
    const boardId = req.params.id;
    const userId = req.user.id;
    
    const board = await Board.findById(boardId);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    // Only owner can restore
    if (board.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only board owner can restore' });
    }
    
    board.isArchived = false;
    board.archivedAt = undefined;
    board.archivedBy = undefined;
    
    await board.save();
    
    res.json({
      success: true,
      message: 'Board restored successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error restoring board:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// COLUMN MANAGEMENT
// ============================================

/**
 * POST /api/crm/boards/:id/columns
 * Add column to board
 */
router.post('/:id/columns', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const columnData = req.body;
    
    if (!columnData.name || !columnData.type) {
      return res.status(400).json({ error: 'Column name and type are required' });
    }
    
    await board.addColumn(columnData);
    
    res.status(201).json({
      success: true,
      message: 'Column added successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error adding column:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/boards/:id/columns/:columnId
 * Update column
 */
router.put('/:id/columns/:columnId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    const { columnId } = req.params;
    
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    await board.updateColumn(columnId, req.body);
    
    res.json({
      success: true,
      message: 'Column updated successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error updating column:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/boards/:id/columns/:columnId
 * Delete column
 */
router.delete('/:id/columns/:columnId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    const { columnId } = req.params;
    
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    await board.deleteColumn(columnId);
    
    res.json({
      success: true,
      message: 'Column deleted successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error deleting column:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/boards/:id/columns/reorder
 * Reorder columns
 */
router.put('/:id/columns/reorder', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    const { columnOrder } = req.body; // Array of column IDs in new order
    
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    if (!Array.isArray(columnOrder)) {
      return res.status(400).json({ error: 'Column order must be an array' });
    }
    
    // Update order for each column
    columnOrder.forEach((columnId, index) => {
      const column = board.columns.find(c => c.id === columnId);
      if (column) {
        column.order = index + 1;
      }
    });
    
    await board.save();
    
    res.json({
      success: true,
      message: 'Columns reordered successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error reordering columns:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// VIEW MANAGEMENT
// ============================================

/**
 * POST /api/crm/boards/:id/views
 * Add view to board
 */
router.post('/:id/views', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const viewData = req.body;
    
    if (!viewData.name || !viewData.type) {
      return res.status(400).json({ error: 'View name and type are required' });
    }
    
    await board.addView(viewData, userId);
    
    res.status(201).json({
      success: true,
      message: 'View added successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error adding view:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/boards/:id/views/:viewId
 * Update view
 */
router.put('/:id/views/:viewId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    const { viewId } = req.params;
    
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    await board.updateView(viewId, req.body);
    
    res.json({
      success: true,
      message: 'View updated successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error updating view:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/boards/:id/views/:viewId
 * Delete view
 */
router.delete('/:id/views/:viewId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    const { viewId } = req.params;
    
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    await board.deleteView(viewId);
    
    res.json({
      success: true,
      message: 'View deleted successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error deleting view:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AUTOMATION MANAGEMENT
// ============================================

/**
 * POST /api/crm/boards/:id/automations
 * Add automation to board
 */
router.post('/:id/automations', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const automationData = req.body;
    
    if (!automationData.name || !automationData.trigger || !automationData.actions) {
      return res.status(400).json({ error: 'Name, trigger, and actions are required' });
    }
    
    await board.addAutomation(automationData);
    
    res.status(201).json({
      success: true,
      message: 'Automation added successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error adding automation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/boards/:id/automations/:automationId
 * Update automation
 */
router.put('/:id/automations/:automationId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    const { automationId } = req.params;
    
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const automation = board.automations.find(a => a.id === automationId);
    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    
    Object.assign(automation, req.body);
    await board.save();
    
    res.json({
      success: true,
      message: 'Automation updated successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error updating automation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/boards/:id/automations/:automationId
 * Delete automation
 */
router.delete('/:id/automations/:automationId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    const { automationId } = req.params;
    
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const automationIndex = board.automations.findIndex(a => a.id === automationId);
    if (automationIndex === -1) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    
    board.automations.splice(automationIndex, 1);
    await board.save();
    
    res.json({
      success: true,
      message: 'Automation deleted successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error deleting automation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/boards/:id/automations/:automationId/trigger
 * Manually trigger automation
 */
router.post('/:id/automations/:automationId/trigger', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    const { automationId } = req.params;
    const { itemId } = req.body;
    
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const automation = board.automations.find(a => a.id === automationId);
    if (!automation) {
      return res.status(404).json({ error: 'Automation not found' });
    }
    
    if (!automation.isActive) {
      return res.status(400).json({ error: 'Automation is not active' });
    }
    
    // Update run count and last run
    automation.runCount += 1;
    automation.lastRun = new Date();
    await board.save();
    
    // TODO: Execute automation actions
    // This would integrate with an automation engine
    
    res.json({
      success: true,
      message: 'Automation triggered successfully',
      data: {
        automationId,
        itemId,
        runCount: automation.runCount,
      },
    });
  } catch (error) {
    console.error('Error triggering automation:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PERMISSIONS MANAGEMENT
// ============================================

/**
 * PUT /api/crm/boards/:id/permissions
 * Update board permissions
 */
router.put('/:id/permissions', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    
    // Only owner can change permissions
    if (board.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only board owner can change permissions' });
    }
    
    const { visibility, allowedMembers, sharing } = req.body;
    
    if (visibility) {
      board.permissions.visibility = visibility;
    }
    
    if (allowedMembers) {
      board.permissions.allowedMembers = allowedMembers;
    }
    
    if (sharing) {
      board.permissions.sharing = { ...board.permissions.sharing, ...sharing };
    }
    
    await board.save();
    
    res.json({
      success: true,
      message: 'Permissions updated successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/boards/:id/share
 * Share board with user
 */
router.post('/:id/share', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    const { targetUserId, role } = req.body;
    
    // Only owner or editors can share
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    if (!targetUserId || !role) {
      return res.status(400).json({ error: 'User ID and role are required' });
    }
    
    // Check if user already has access
    const existingMember = board.permissions.allowedMembers.find(
      m => m.user.toString() === targetUserId
    );
    
    if (existingMember) {
      existingMember.role = role;
    } else {
      board.permissions.allowedMembers.push({
        user: targetUserId,
        role,
      });
    }
    
    await board.save();
    
    res.json({
      success: true,
      message: 'Board shared successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error sharing board:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/boards/:id/share/:memberId
 * Remove user access from board
 */
router.delete('/:id/share/:memberId', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    const { memberId } = req.params;
    
    // Only owner or editors can remove access
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const memberIndex = board.permissions.allowedMembers.findIndex(
      m => m.user.toString() === memberId
    );
    
    if (memberIndex === -1) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    board.permissions.allowedMembers.splice(memberIndex, 1);
    await board.save();
    
    res.json({
      success: true,
      message: 'User access removed successfully',
      data: board,
    });
  } catch (error) {
    console.error('Error removing user access:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BOARD OPERATIONS
// ============================================

/**
 * POST /api/crm/boards/:id/duplicate
 * Duplicate board
 */
router.post('/:id/duplicate', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const userId = req.user.id;
    const { name } = req.body;
    // const { includeItems } = req.body; // TODO: Implement item duplication
    
    if (!board.canUserAccess(userId, 'viewer')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const duplicateData = {
      ...board.toObject(),
      _id: undefined,
      name: name || `${board.name} (Copy)`,
      owner: userId,
      createdAt: undefined,
      updatedAt: undefined,
      stats: {
        totalItems: 0,
        activeItems: 0,
        completedItems: 0,
      },
    };
    
    // Generate new IDs for columns, views, and automations
    duplicateData.columns = board.columns.map(col => ({
      ...col.toObject(),
      id: `col_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    }));
    
    duplicateData.views = board.views.map(view => ({
      ...view.toObject(),
      id: `view_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      createdBy: userId,
    }));
    
    duplicateData.automations = board.automations.map(auto => ({
      ...auto.toObject(),
      id: `auto_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      runCount: 0,
      lastRun: undefined,
    }));
    
    const duplicateBoard = new Board(duplicateData);
    await duplicateBoard.save();
    
    // TODO: If includeItems is true, duplicate all items
    
    res.status(201).json({
      success: true,
      message: 'Board duplicated successfully',
      data: duplicateBoard,
    });
  } catch (error) {
    console.error('Error duplicating board:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/boards/:id/stats
 * Get board statistics
 */
router.get('/:id/stats', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    
    // TODO: Calculate detailed statistics from items
    const stats = {
      totalItems: board.stats.totalItems,
      activeItems: board.stats.activeItems,
      completedItems: board.stats.completedItems,
      completionRate: board.stats.totalItems > 0 
        ? ((board.stats.completedItems / board.stats.totalItems) * 100).toFixed(2)
        : 0,
      lastActivity: board.stats.lastActivity,
      columns: board.columns.length,
      views: board.views.length,
      automations: board.automations.length,
      activeAutomations: board.automations.filter(a => a.isActive).length,
      members: board.permissions.allowedMembers.length,
    };
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching board stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
