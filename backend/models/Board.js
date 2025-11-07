/**
 * Board Model
 * 
 * Boards are containers for items/deals with customizable columns.
 * Each board belongs to a workspace and can have multiple views.
 */

const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'text',
      'longtext',
      'number',
      'currency',
      'percent',
      'date',
      'datetime',
      'dropdown',
      'multiselect',
      'checkbox',
      'email',
      'phone',
      'url',
      'file',
      'user',
      'status',
      'priority',
      'rating',
      'formula',
      'lookup',
      'rollup',
      'timeline',
    ],
  },
  options: mongoose.Schema.Types.Mixed, // For dropdown/multiselect options
  formula: String, // For formula columns
  width: {
    type: Number,
    default: 150,
  },
  visible: {
    type: Boolean,
    default: true,
  },
  required: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    required: true,
  },
});

const viewSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['table', 'kanban', 'timeline', 'calendar', 'map', 'chart', 'workload', 'form'],
    default: 'table',
  },
  filters: [mongoose.Schema.Types.Mixed],
  sorts: [mongoose.Schema.Types.Mixed],
  groups: [mongoose.Schema.Types.Mixed],
  visibleColumns: [String],
  settings: mongoose.Schema.Types.Mixed,
  isDefault: {
    type: Boolean,
    default: false,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

const automationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  trigger: {
    type: {
      type: String,
      required: true,
      enum: [
        'item_created',
        'item_updated',
        'item_deleted',
        'column_changed',
        'status_changed',
        'date_reached',
        'button_clicked',
        'form_submitted',
      ],
    },
    column: String, // For column_changed, status_changed
    value: mongoose.Schema.Types.Mixed,
  },
  conditions: [mongoose.Schema.Types.Mixed],
  actions: [{
    type: {
      type: String,
      required: true,
      enum: [
        'send_email',
        'send_notification',
        'create_item',
        'update_column',
        'move_item',
        'archive_item',
        'send_webhook',
        'create_task',
        'assign_user',
      ],
    },
    config: mongoose.Schema.Types.Mixed,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  runCount: {
    type: Number,
    default: 0,
  },
  lastRun: Date,
});

const boardSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  
  description: {
    type: String,
    trim: true,
  },
  
  icon: {
    type: String,
    default: '📋',
  },
  
  // Workspace
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  
  // Owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Type
  boardType: {
    type: String,
    enum: ['crm', 'sales', 'projects', 'tasks', 'custom'],
    default: 'custom',
    index: true,
  },
  
  // Columns
  columns: [columnSchema],
  
  // Views
  views: [viewSchema],
  
  // Automations
  automations: [automationSchema],
  
  // Permissions
  permissions: {
    visibility: {
      type: String,
      enum: ['workspace', 'members', 'public'],
      default: 'workspace',
    },
    allowedMembers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      role: {
        type: String,
        enum: ['owner', 'editor', 'commenter', 'viewer'],
        default: 'viewer',
      },
    }],
    sharing: {
      allowPublicAccess: {
        type: Boolean,
        default: false,
      },
      publicUrl: String,
      allowComments: {
        type: Boolean,
        default: true,
      },
      allowDuplication: {
        type: Boolean,
        default: false,
      },
    },
  },
  
  // Settings
  settings: {
    defaultView: String, // View ID
    showItemNumbers: {
      type: Boolean,
      default: true,
    },
    allowSubitems: {
      type: Boolean,
      default: true,
    },
    allowFiles: {
      type: Boolean,
      default: true,
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    allowActivityLog: {
      type: Boolean,
      default: true,
    },
    notifications: {
      onItemCreated: {
        type: Boolean,
        default: true,
      },
      onItemUpdated: {
        type: Boolean,
        default: true,
      },
      onMention: {
        type: Boolean,
        default: true,
      },
    },
  },
  
  // Template
  isTemplate: {
    type: Boolean,
    default: false,
  },
  
  templateCategory: String,
  
  usedAsTemplateCount: {
    type: Number,
    default: 0,
  },
  
  // Status
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
  
  // Statistics
  stats: {
    totalItems: {
      type: Number,
      default: 0,
    },
    activeItems: {
      type: Number,
      default: 0,
    },
    completedItems: {
      type: Number,
      default: 0,
    },
    lastActivity: Date,
  },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
boardSchema.index({ workspace: 1, isArchived: 1 });
boardSchema.index({ owner: 1, isArchived: 1 });
boardSchema.index({ boardType: 1, workspace: 1 });
boardSchema.index({ 'permissions.allowedMembers.user': 1 });

// Virtual: Items
boardSchema.virtual('items', {
  ref: 'Item',
  localField: '_id',
  foreignField: 'board',
});

// Methods
boardSchema.methods.addColumn = function(columnData) {
  const maxOrder = this.columns.length > 0 
    ? Math.max(...this.columns.map(c => c.order))
    : 0;
  
  const newColumn = {
    id: `col_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name: columnData.name,
    type: columnData.type,
    options: columnData.options,
    formula: columnData.formula,
    width: columnData.width || 150,
    visible: columnData.visible !== false,
    required: columnData.required || false,
    order: maxOrder + 1,
  };
  
  this.columns.push(newColumn);
  return this.save();
};

boardSchema.methods.updateColumn = function(columnId, updates) {
  const column = this.columns.find(c => c.id === columnId);
  if (!column) {
    throw new Error('Column not found');
  }
  
  Object.assign(column, updates);
  return this.save();
};

boardSchema.methods.deleteColumn = function(columnId) {
  const columnIndex = this.columns.findIndex(c => c.id === columnId);
  if (columnIndex === -1) {
    throw new Error('Column not found');
  }
  
  this.columns.splice(columnIndex, 1);
  return this.save();
};

boardSchema.methods.addView = function(viewData, userId) {
  const newView = {
    id: `view_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name: viewData.name,
    type: viewData.type || 'table',
    filters: viewData.filters || [],
    sorts: viewData.sorts || [],
    groups: viewData.groups || [],
    visibleColumns: viewData.visibleColumns || this.columns.map(c => c.id),
    settings: viewData.settings || {},
    isDefault: viewData.isDefault || false,
    isPublic: viewData.isPublic || false,
    createdBy: userId,
  };
  
  // If this is default, unset other defaults
  if (newView.isDefault) {
    this.views.forEach(v => { v.isDefault = false; });
  }
  
  this.views.push(newView);
  return this.save();
};

boardSchema.methods.updateView = function(viewId, updates) {
  const view = this.views.find(v => v.id === viewId);
  if (!view) {
    throw new Error('View not found');
  }
  
  // If setting as default, unset other defaults
  if (updates.isDefault === true) {
    this.views.forEach(v => { v.isDefault = false; });
  }
  
  Object.assign(view, updates);
  return this.save();
};

boardSchema.methods.deleteView = function(viewId) {
  const viewIndex = this.views.findIndex(v => v.id === viewId);
  if (viewIndex === -1) {
    throw new Error('View not found');
  }
  
  this.views.splice(viewIndex, 1);
  return this.save();
};

boardSchema.methods.addAutomation = function(automationData) {
  const newAutomation = {
    id: `auto_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name: automationData.name,
    description: automationData.description,
    trigger: automationData.trigger,
    conditions: automationData.conditions || [],
    actions: automationData.actions || [],
    isActive: automationData.isActive !== false,
    runCount: 0,
  };
  
  this.automations.push(newAutomation);
  return this.save();
};

boardSchema.methods.canUserAccess = function(userId, requiredRole = 'viewer') {
  // Check if user is owner
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  // Check if in allowed members
  const member = this.permissions.allowedMembers.find(
    m => m.user.toString() === userId.toString()
  );
  
  if (!member) {
    return this.permissions.visibility === 'workspace';
  }
  
  // Check role hierarchy: owner > editor > commenter > viewer
  const roleHierarchy = { owner: 4, editor: 3, commenter: 2, viewer: 1 };
  return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
};

// Static methods
boardSchema.statics.findByWorkspace = function(workspaceId, includeArchived = false) {
  const query = { workspace: workspaceId };
  if (!includeArchived) {
    query.isArchived = false;
  }
  return this.find(query).sort({ createdAt: -1 });
};

boardSchema.statics.findByType = function(boardType, workspaceId) {
  return this.find({
    boardType,
    workspace: workspaceId,
    isArchived: false,
  }).sort({ createdAt: -1 });
};

boardSchema.statics.findTemplates = function() {
  return this.find({
    isTemplate: true,
    isArchived: false,
  }).sort({ usedAsTemplateCount: -1, createdAt: -1 });
};

const Board = mongoose.model('Board', boardSchema);

module.exports = Board;
