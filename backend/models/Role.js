/**
 * Role Model
 * 
 * Custom roles with granular permissions for RBAC system
 * Supports permission inheritance and custom role creation
 */

const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  
  name: {
    type: String,
    required: true,
    trim: true,
  },
  
  description: String,
  
  // Role type
  type: {
    type: String,
    enum: ['system', 'custom'],
    default: 'custom',
  },
  
  // System roles cannot be deleted
  isSystem: {
    type: Boolean,
    default: false,
  },
  
  // Inherit permissions from another role
  inheritsFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
  },
  
  // Granular permissions
  permissions: {
    // Workspace Management
    workspace: {
      view: { type: Boolean, default: true },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      manageSettings: { type: Boolean, default: false },
      manageBilling: { type: Boolean, default: false },
    },
    
    // Member Management
    members: {
      view: { type: Boolean, default: true },
      invite: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      remove: { type: Boolean, default: false },
      manageRoles: { type: Boolean, default: false },
    },
    
    // Board Management
    boards: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      manageColumns: { type: Boolean, default: false },
      manageViews: { type: Boolean, default: false },
      manageAutomations: { type: Boolean, default: false },
      share: { type: Boolean, default: false },
    },
    
    // Item Management
    items: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      editOwn: { type: Boolean, default: true },
      deleteOwn: { type: Boolean, default: false },
    },
    
    // Pipeline Management
    pipelines: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      manageStages: { type: Boolean, default: false },
      viewAnalytics: { type: Boolean, default: true },
    },
    
    // Deal Management
    deals: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      editOwn: { type: Boolean, default: true },
      deleteOwn: { type: Boolean, default: false },
      moveStages: { type: Boolean, default: false },
      markWonLost: { type: Boolean, default: false },
      viewValue: { type: Boolean, default: true },
      editValue: { type: Boolean, default: false },
    },
    
    // Contact Management
    contacts: {
      view: { type: Boolean, default: true },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      bulkOperations: { type: Boolean, default: false },
    },
    
    // Activity & Reports
    activities: {
      view: { type: Boolean, default: true },
      viewAll: { type: Boolean, default: false },
      viewOwn: { type: Boolean, default: true },
      export: { type: Boolean, default: false },
    },
    
    // Integrations
    integrations: {
      view: { type: Boolean, default: false },
      configure: { type: Boolean, default: false },
      useEmail: { type: Boolean, default: true },
      useCalendar: { type: Boolean, default: true },
      useDocuSign: { type: Boolean, default: false },
      useZoom: { type: Boolean, default: true },
    },
    
    // Security
    security: {
      manageSecurity: { type: Boolean, default: false },
      viewAuditLogs: { type: Boolean, default: false },
      manageRoles: { type: Boolean, default: false },
      managePermissions: { type: Boolean, default: false },
    },
    
    // Data Export
    dataExport: {
      exportOwn: { type: Boolean, default: true },
      exportAll: { type: Boolean, default: false },
      exportSensitive: { type: Boolean, default: false },
    },
  },
  
  // Color for UI display
  color: {
    type: String,
    default: '#6B7280', // Gray
  },
  
  // Priority for conflict resolution (higher = more priority)
  priority: {
    type: Number,
    default: 0,
  },
  
  // Usage tracking
  memberCount: {
    type: Number,
    default: 0,
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes
roleSchema.index({ workspace: 1, name: 1 }, { unique: true });
roleSchema.index({ workspace: 1, type: 1 });
roleSchema.index({ workspace: 1, isSystem: 1 });

// Virtual for full permission set (including inherited)
roleSchema.virtual('fullPermissions').get(async function() {
  if (!this.inheritsFrom) {
    return this.permissions;
  }
  
  const parentRole = await this.model('Role').findById(this.inheritsFrom);
  if (!parentRole) {
    return this.permissions;
  }
  
  // Merge permissions (child overrides parent)
  const mergedPermissions = {};
  for (const [category, perms] of Object.entries(parentRole.permissions)) {
    mergedPermissions[category] = {
      ...perms,
      ...(this.permissions[category] || {}),
    };
  }
  
  return mergedPermissions;
});

// Methods
roleSchema.methods.hasPermission = function(category, permission) {
  return this.permissions[category]?.[permission] || false;
};

roleSchema.methods.grantPermission = function(category, permission) {
  if (!this.permissions[category]) {
    this.permissions[category] = {};
  }
  this.permissions[category][permission] = true;
};

roleSchema.methods.revokePermission = function(category, permission) {
  if (this.permissions[category]) {
    this.permissions[category][permission] = false;
  }
};

// Statics
roleSchema.statics.createSystemRoles = async function(workspaceId) {
  const systemRoles = [
    {
      workspace: workspaceId,
      name: 'Owner',
      description: 'Full access to all workspace features',
      type: 'system',
      isSystem: true,
      priority: 100,
      color: '#7C3AED', // Purple
      permissions: {
        workspace: { view: true, edit: true, delete: true, manageSettings: true, manageBilling: true },
        members: { view: true, invite: true, edit: true, remove: true, manageRoles: true },
        boards: { view: true, create: true, edit: true, delete: true, manageColumns: true, manageViews: true, manageAutomations: true, share: true },
        items: { view: true, create: true, edit: true, delete: true, editOwn: true, deleteOwn: true },
        pipelines: { view: true, create: true, edit: true, delete: true, manageStages: true, viewAnalytics: true },
        deals: { view: true, create: true, edit: true, delete: true, editOwn: true, deleteOwn: true, moveStages: true, markWonLost: true, viewValue: true, editValue: true },
        contacts: { view: true, create: true, edit: true, delete: true, export: true, import: true, bulkOperations: true },
        activities: { view: true, viewAll: true, viewOwn: true, export: true },
        integrations: { view: true, configure: true, useEmail: true, useCalendar: true, useDocuSign: true, useZoom: true },
        security: { manageSecurity: true, viewAuditLogs: true, manageRoles: true, managePermissions: true },
        dataExport: { exportOwn: true, exportAll: true, exportSensitive: true },
      },
    },
    {
      workspace: workspaceId,
      name: 'Admin',
      description: 'Administrative access with limited billing control',
      type: 'system',
      isSystem: true,
      priority: 80,
      color: '#DC2626', // Red
      permissions: {
        workspace: { view: true, edit: true, delete: false, manageSettings: true, manageBilling: false },
        members: { view: true, invite: true, edit: true, remove: true, manageRoles: false },
        boards: { view: true, create: true, edit: true, delete: true, manageColumns: true, manageViews: true, manageAutomations: true, share: true },
        items: { view: true, create: true, edit: true, delete: true, editOwn: true, deleteOwn: true },
        pipelines: { view: true, create: true, edit: true, delete: true, manageStages: true, viewAnalytics: true },
        deals: { view: true, create: true, edit: true, delete: true, editOwn: true, deleteOwn: true, moveStages: true, markWonLost: true, viewValue: true, editValue: true },
        contacts: { view: true, create: true, edit: true, delete: true, export: true, import: true, bulkOperations: true },
        activities: { view: true, viewAll: true, viewOwn: true, export: true },
        integrations: { view: true, configure: true, useEmail: true, useCalendar: true, useDocuSign: true, useZoom: true },
        security: { manageSecurity: false, viewAuditLogs: true, manageRoles: false, managePermissions: false },
        dataExport: { exportOwn: true, exportAll: true, exportSensitive: false },
      },
    },
    {
      workspace: workspaceId,
      name: 'Member',
      description: 'Standard member with basic access',
      type: 'system',
      isSystem: true,
      priority: 50,
      color: '#2563EB', // Blue
      permissions: {
        workspace: { view: true, edit: false, delete: false, manageSettings: false, manageBilling: false },
        members: { view: true, invite: false, edit: false, remove: false, manageRoles: false },
        boards: { view: true, create: true, edit: false, delete: false, manageColumns: false, manageViews: true, manageAutomations: false, share: false },
        items: { view: true, create: true, edit: false, delete: false, editOwn: true, deleteOwn: true },
        pipelines: { view: true, create: false, edit: false, delete: false, manageStages: false, viewAnalytics: true },
        deals: { view: true, create: true, edit: false, delete: false, editOwn: true, deleteOwn: false, moveStages: true, markWonLost: false, viewValue: true, editValue: false },
        contacts: { view: true, create: true, edit: false, delete: false, export: false, import: false, bulkOperations: false },
        activities: { view: true, viewAll: false, viewOwn: true, export: false },
        integrations: { view: false, configure: false, useEmail: true, useCalendar: true, useDocuSign: false, useZoom: true },
        security: { manageSecurity: false, viewAuditLogs: false, manageRoles: false, managePermissions: false },
        dataExport: { exportOwn: true, exportAll: false, exportSensitive: false },
      },
    },
    {
      workspace: workspaceId,
      name: 'Viewer',
      description: 'Read-only access',
      type: 'system',
      isSystem: true,
      priority: 10,
      color: '#6B7280', // Gray
      permissions: {
        workspace: { view: true, edit: false, delete: false, manageSettings: false, manageBilling: false },
        members: { view: true, invite: false, edit: false, remove: false, manageRoles: false },
        boards: { view: true, create: false, edit: false, delete: false, manageColumns: false, manageViews: false, manageAutomations: false, share: false },
        items: { view: true, create: false, edit: false, delete: false, editOwn: false, deleteOwn: false },
        pipelines: { view: true, create: false, edit: false, delete: false, manageStages: false, viewAnalytics: true },
        deals: { view: true, create: false, edit: false, delete: false, editOwn: false, deleteOwn: false, moveStages: false, markWonLost: false, viewValue: false, editValue: false },
        contacts: { view: true, create: false, edit: false, delete: false, export: false, import: false, bulkOperations: false },
        activities: { view: true, viewAll: false, viewOwn: true, export: false },
        integrations: { view: false, configure: false, useEmail: false, useCalendar: false, useDocuSign: false, useZoom: false },
        security: { manageSecurity: false, viewAuditLogs: false, manageRoles: false, managePermissions: false },
        dataExport: { exportOwn: false, exportAll: false, exportSensitive: false },
      },
    },
  ];
  
  for (const roleData of systemRoles) {
    await this.findOneAndUpdate(
      { workspace: workspaceId, name: roleData.name, type: 'system' },
      roleData,
      { upsert: true, new: true }
    );
  }
  
  return this.find({ workspace: workspaceId, type: 'system' });
};

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
