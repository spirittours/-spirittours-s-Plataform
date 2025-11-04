/**
 * Item API Routes
 * 
 * Complete CRUD operations for item management.
 * Handles board items with dynamic columns, subitems, and grouping.
 */

const express = require('express');
const router = express.Router();
const Item = require('../../models/Item');
const Board = require('../../models/Board');
const authenticate = require('../../middleware/auth');

// Middleware to check item access
const checkItemAccess = async (req, res, next) => {
  try {
    const itemId = req.params.itemId || req.params.id;
    const userId = req.user.id;
    
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (item.isArchived) {
      return res.status(410).json({ error: 'Item is archived' });
    }
    
    // Check board access
    const board = await Board.findById(item.board);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    
    if (!board.canUserAccess(userId)) {
      return res.status(403).json({ error: 'Access denied to this item' });
    }
    
    req.item = item;
    req.board = board;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Middleware to check board access
const checkBoardAccess = async (req, res, next) => {
  try {
    const boardId = req.params.boardId || req.query.board;
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

// ============================================
// ITEM CRUD
// ============================================

/**
 * GET /api/crm/items?board=:boardId
 * Get all items for a board
 */
router.get('/', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const boardId = req.board._id;
    const {
      group,
      includeArchived,
      includeSubitems,
      isCompleted,
      sortBy,
      sortOrder,
      limit,
      skip,
    } = req.query;
    
    const query = { board: boardId, parentItem: null };
    
    if (group) query.group = group;
    
    if (includeArchived !== 'true') {
      query.isArchived = false;
    }
    
    if (isCompleted !== undefined) {
      query.isCompleted = isCompleted === 'true';
    }
    
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.position = 1;
      sortOptions.createdAt = 1;
    }
    
    let itemsQuery = Item.find(query)
      .populate('owner', 'first_name last_name email')
      .sort(sortOptions);
    
    if (includeSubitems === 'true') {
      itemsQuery = itemsQuery.populate({
        path: 'subitems',
        populate: { path: 'owner', select: 'first_name last_name email' },
      });
    }
    
    if (limit) {
      itemsQuery = itemsQuery.limit(parseInt(limit));
    }
    
    if (skip) {
      itemsQuery = itemsQuery.skip(parseInt(skip));
    }
    
    const items = await itemsQuery;
    const total = await Item.countDocuments(query);
    
    res.json({
      success: true,
      count: items.length,
      total,
      data: items,
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/items/:id
 * Get item by ID
 */
router.get('/:id', authenticate, checkItemAccess, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('owner', 'first_name last_name email')
      .populate('board', 'name columns')
      .populate('workspace', 'name slug')
      .populate('parentItem', 'name')
      .populate({
        path: 'subitems',
        populate: { path: 'owner', select: 'first_name last_name email' },
      });
    
    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/items
 * Create a new item
 */
router.post('/', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const board = req.board;
    
    const {
      name,
      columnValues,
      group,
      position,
      parentItem,
    } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Item name is required' });
    }
    
    // Validate parent item if provided
    if (parentItem) {
      const parent = await Item.findById(parentItem);
      if (!parent || parent.board.toString() !== board._id.toString()) {
        return res.status(400).json({ error: 'Invalid parent item' });
      }
    }
    
    // Create item
    const item = new Item({
      name,
      board: board._id,
      workspace: board.workspace,
      owner: userId,
      columnValues: columnValues || {},
      group,
      position: position || 0,
      parentItem,
    });
    
    await item.save();
    
    // Update board stats
    if (!parentItem) {
      board.stats.totalItems = (board.stats.totalItems || 0) + 1;
      board.stats.activeItems = (board.stats.activeItems || 0) + 1;
      board.stats.lastActivity = new Date();
      await board.save();
    }
    
    await item.populate('owner', 'first_name last_name email');
    
    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: item,
    });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/items/:id
 * Update item
 */
router.put('/:id', authenticate, checkItemAccess, async (req, res) => {
  try {
    const item = req.item;
    const board = req.board;
    const userId = req.user.id;
    
    // Check if user has editor access
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions to edit item' });
    }
    
    const {
      name,
      columnValues,
      group,
      position,
    } = req.body;
    
    // Update fields
    if (name) item.name = name;
    if (columnValues) item.columnValues = { ...item.columnValues, ...columnValues };
    if (group !== undefined) item.group = group;
    if (position !== undefined) item.position = position;
    
    // Update board last activity
    board.stats.lastActivity = new Date();
    await board.save();
    
    await item.save();
    
    res.json({
      success: true,
      message: 'Item updated successfully',
      data: item,
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/items/:id
 * Archive item (soft delete)
 */
router.delete('/:id', authenticate, checkItemAccess, async (req, res) => {
  try {
    const item = req.item;
    const board = req.board;
    const userId = req.user.id;
    
    // Check if user has editor access
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions to delete item' });
    }
    
    item.isArchived = true;
    item.archivedAt = new Date();
    item.archivedBy = userId;
    
    await item.save();
    
    // Update board stats
    if (!item.parentItem) {
      board.stats.activeItems = Math.max(0, (board.stats.activeItems || 0) - 1);
      await board.save();
    }
    
    res.json({
      success: true,
      message: 'Item archived successfully',
    });
  } catch (error) {
    console.error('Error archiving item:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// COLUMN OPERATIONS
// ============================================

/**
 * PUT /api/crm/items/:id/column
 * Update column value
 */
router.put('/:id/column', authenticate, checkItemAccess, async (req, res) => {
  try {
    const item = req.item;
    const board = req.board;
    const userId = req.user.id;
    const { columnId, value } = req.body;
    
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    if (!columnId) {
      return res.status(400).json({ error: 'Column ID is required' });
    }
    
    // Validate column exists in board
    const column = board.columns.find(c => c.id === columnId);
    if (!column) {
      return res.status(404).json({ error: 'Column not found in board' });
    }
    
    await item.updateColumn(columnId, value);
    
    res.json({
      success: true,
      message: 'Column updated successfully',
      data: item,
    });
  } catch (error) {
    console.error('Error updating column:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/items/:id/column/:columnId
 * Get column value
 */
router.get('/:id/column/:columnId', authenticate, checkItemAccess, async (req, res) => {
  try {
    const item = req.item;
    const { columnId } = req.params;
    
    const value = item.getColumnValue(columnId);
    
    res.json({
      success: true,
      data: {
        columnId,
        value,
      },
    });
  } catch (error) {
    console.error('Error getting column value:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ITEM OPERATIONS
// ============================================

/**
 * POST /api/crm/items/:id/complete
 * Mark item as completed
 */
router.post('/:id/complete', authenticate, checkItemAccess, async (req, res) => {
  try {
    const item = req.item;
    const board = req.board;
    const userId = req.user.id;
    
    await item.markAsCompleted(userId);
    
    // Update board stats
    if (!item.parentItem) {
      board.stats.completedItems = (board.stats.completedItems || 0) + 1;
      board.stats.activeItems = Math.max(0, (board.stats.activeItems || 0) - 1);
      await board.save();
    }
    
    res.json({
      success: true,
      message: 'Item marked as completed',
      data: item,
    });
  } catch (error) {
    console.error('Error completing item:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/items/:id/incomplete
 * Mark item as incomplete
 */
router.post('/:id/incomplete', authenticate, checkItemAccess, async (req, res) => {
  try {
    const item = req.item;
    const board = req.board;
    
    const wasCompleted = item.isCompleted;
    await item.markAsIncomplete();
    
    // Update board stats
    if (!item.parentItem && wasCompleted) {
      board.stats.completedItems = Math.max(0, (board.stats.completedItems || 0) - 1);
      board.stats.activeItems = (board.stats.activeItems || 0) + 1;
      await board.save();
    }
    
    res.json({
      success: true,
      message: 'Item marked as incomplete',
      data: item,
    });
  } catch (error) {
    console.error('Error marking item as incomplete:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/items/:id/duplicate
 * Duplicate item
 */
router.post('/:id/duplicate', authenticate, checkItemAccess, async (req, res) => {
  try {
    const item = req.item;
    const board = req.board;
    const userId = req.user.id;
    const { includeName } = req.body;
    
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    const duplicate = await item.duplicate(userId);
    
    if (includeName === 'false') {
      duplicate.name = item.name;
      await duplicate.save();
    }
    
    // Update board stats
    if (!duplicate.parentItem) {
      board.stats.totalItems = (board.stats.totalItems || 0) + 1;
      board.stats.activeItems = (board.stats.activeItems || 0) + 1;
      await board.save();
    }
    
    await duplicate.populate('owner', 'first_name last_name email');
    
    res.status(201).json({
      success: true,
      message: 'Item duplicated successfully',
      data: duplicate,
    });
  } catch (error) {
    console.error('Error duplicating item:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/items/:id/move
 * Move item to different board or group
 */
router.post('/:id/move', authenticate, checkItemAccess, async (req, res) => {
  try {
    const item = req.item;
    const board = req.board;
    const userId = req.user.id;
    const { targetBoardId, targetGroup } = req.body;
    
    if (!board.canUserAccess(userId, 'editor')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    if (targetBoardId) {
      // Validate target board
      const targetBoard = await Board.findById(targetBoardId);
      if (!targetBoard) {
        return res.status(404).json({ error: 'Target board not found' });
      }
      
      if (!targetBoard.canUserAccess(userId, 'editor')) {
        return res.status(403).json({ error: 'No access to target board' });
      }
      
      // Update stats on old board
      if (!item.parentItem) {
        board.stats.totalItems = Math.max(0, (board.stats.totalItems || 0) - 1);
        board.stats.activeItems = Math.max(0, (board.stats.activeItems || 0) - 1);
        await board.save();
      }
      
      // Move item
      item.board = targetBoardId;
      item.workspace = targetBoard.workspace;
      item.group = targetGroup || null;
      item.columnValues = {}; // Reset column values as boards may have different columns
      
      // Update stats on new board
      if (!item.parentItem) {
        targetBoard.stats.totalItems = (targetBoard.stats.totalItems || 0) + 1;
        targetBoard.stats.activeItems = (targetBoard.stats.activeItems || 0) + 1;
        await targetBoard.save();
      }
    } else if (targetGroup !== undefined) {
      item.group = targetGroup;
    }
    
    await item.save();
    
    res.json({
      success: true,
      message: 'Item moved successfully',
      data: item,
    });
  } catch (error) {
    console.error('Error moving item:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SUBITEMS
// ============================================

/**
 * GET /api/crm/items/:id/subitems
 * Get subitems for an item
 */
router.get('/:id/subitems', authenticate, checkItemAccess, async (req, res) => {
  try {
    const item = req.item;
    
    const subitems = await Item.findSubitems(item._id)
      .populate('owner', 'first_name last_name email');
    
    res.json({
      success: true,
      count: subitems.length,
      data: subitems,
    });
  } catch (error) {
    console.error('Error fetching subitems:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * POST /api/crm/items/bulk-create
 * Bulk create items
 */
router.post('/bulk-create', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const board = req.board;
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }
    
    const createdItems = [];
    
    for (const itemData of items) {
      const item = new Item({
        ...itemData,
        board: board._id,
        workspace: board.workspace,
        owner: userId,
      });
      
      await item.save();
      createdItems.push(item);
    }
    
    // Update board stats
    board.stats.totalItems = (board.stats.totalItems || 0) + createdItems.length;
    board.stats.activeItems = (board.stats.activeItems || 0) + createdItems.length;
    board.stats.lastActivity = new Date();
    await board.save();
    
    res.status(201).json({
      success: true,
      message: 'Items created successfully',
      count: createdItems.length,
      data: createdItems,
    });
  } catch (error) {
    console.error('Error bulk creating items:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/items/bulk-update
 * Bulk update items
 */
router.post('/bulk-update', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const board = req.board;
    const { itemIds, updates } = req.body;
    
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'Item IDs array is required' });
    }
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Updates object is required' });
    }
    
    const result = await Item.updateMany(
      {
        _id: { $in: itemIds },
        board: board._id,
      },
      { $set: updates }
    );
    
    // Update board last activity
    board.stats.lastActivity = new Date();
    await board.save();
    
    res.json({
      success: true,
      message: 'Bulk update completed',
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error('Error bulk updating items:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/items/bulk-delete
 * Bulk archive items
 */
router.delete('/bulk-delete', authenticate, checkBoardAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const board = req.board;
    const { itemIds } = req.body;
    
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'Item IDs array is required' });
    }
    
    const result = await Item.updateMany(
      {
        _id: { $in: itemIds },
        board: board._id,
      },
      {
        $set: {
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: userId,
        },
      }
    );
    
    // Update board stats
    board.stats.activeItems = Math.max(0, (board.stats.activeItems || 0) - result.modifiedCount);
    await board.save();
    
    res.json({
      success: true,
      message: 'Bulk delete completed',
      data: {
        archived: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error('Error bulk deleting items:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
