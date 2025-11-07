/**
 * Item Model
 * 
 * Items are rows in boards with dynamic column values.
 * They can represent tasks, leads, projects, or any custom data.
 */

const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  
  // Board & Workspace
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
    index: true,
  },
  
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  
  // Column Values (dynamic based on board columns)
  columnValues: mongoose.Schema.Types.Mixed,
  // Format: { columnId: value }
  // Example: { col_123: 'In Progress', col_456: 25, col_789: '2024-12-31' }
  
  // Owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Parent Item (for subitems)
  parentItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    index: true,
  },
  
  // Group (for kanban grouping)
  group: {
    type: String,
    trim: true,
    index: true,
  },
  
  // Position in board
  position: {
    type: Number,
    default: 0,
  },
  
  // Status
  isCompleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  completedAt: Date,
  
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Archived
  isArchived: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  archivedAt: Date,
  
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
itemSchema.index({ board: 1, isArchived: 1 });
itemSchema.index({ workspace: 1, isArchived: 1 });
itemSchema.index({ owner: 1, isCompleted: 1 });
itemSchema.index({ parentItem: 1 });
itemSchema.index({ group: 1, board: 1 });

// Virtual: Subitems
itemSchema.virtual('subitems', {
  ref: 'Item',
  localField: '_id',
  foreignField: 'parentItem',
});

// Methods
itemSchema.methods.updateColumn = function(columnId, value) {
  if (!this.columnValues) {
    this.columnValues = {};
  }
  this.columnValues[columnId] = value;
  return this.save();
};

itemSchema.methods.getColumnValue = function(columnId) {
  return this.columnValues ? this.columnValues[columnId] : null;
};

itemSchema.methods.markAsCompleted = function(userId) {
  this.isCompleted = true;
  this.completedAt = new Date();
  this.completedBy = userId;
  return this.save();
};

itemSchema.methods.markAsIncomplete = function() {
  this.isCompleted = false;
  this.completedAt = undefined;
  this.completedBy = undefined;
  return this.save();
};

itemSchema.methods.duplicate = async function(userId) {
  const duplicateData = {
    ...this.toObject(),
    _id: undefined,
    name: `${this.name} (Copy)`,
    owner: userId,
    createdAt: undefined,
    updatedAt: undefined,
    isCompleted: false,
    completedAt: undefined,
    completedBy: undefined,
  };
  
  const duplicate = new this.constructor(duplicateData);
  return duplicate.save();
};

// Static methods
itemSchema.statics.findByBoard = function(boardId, includeArchived = false) {
  const query = { board: boardId, parentItem: null };
  if (!includeArchived) {
    query.isArchived = false;
  }
  return this.find(query).sort({ position: 1, createdAt: 1 });
};

itemSchema.statics.findByGroup = function(boardId, group) {
  return this.find({
    board: boardId,
    group,
    parentItem: null,
    isArchived: false,
  }).sort({ position: 1, createdAt: 1 });
};

itemSchema.statics.findSubitems = function(parentItemId) {
  return this.find({
    parentItem: parentItemId,
    isArchived: false,
  }).sort({ position: 1, createdAt: 1 });
};

itemSchema.statics.findByWorkspace = function(workspaceId, filters = {}) {
  const query = { workspace: workspaceId, isArchived: false, ...filters };
  return this.find(query).sort({ createdAt: -1 });
};

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
