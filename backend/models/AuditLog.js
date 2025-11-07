/**
 * AuditLog Model
 * 
 * Comprehensive audit logging for compliance and security
 * Tracks all system activities, changes, and access patterns
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  
  // User information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  userEmail: String,
  userName: String,
  
  // Action details
  action: {
    type: String,
    required: true,
    index: true,
    enum: [
      // CRUD operations
      'create', 'read', 'update', 'delete',
      // Authentication
      'login', 'logout', 'login_failed', '2fa_enabled', '2fa_disabled',
      // SSO
      'sso_login', 'sso_config_changed',
      // Permissions
      'role_created', 'role_updated', 'role_deleted', 'permission_changed',
      // Members
      'member_added', 'member_removed', 'member_role_changed',
      // Data operations
      'bulk_create', 'bulk_update', 'bulk_delete', 'data_exported', 'data_imported',
      // Settings
      'settings_changed', 'integration_enabled', 'integration_disabled',
      // Security
      'security_setting_changed', 'ip_whitelist_updated', 'password_changed',
      // System
      'api_key_created', 'api_key_revoked', 'webhook_created', 'webhook_deleted',
    ],
  },
  
  // Resource information
  resourceType: {
    type: String,
    index: true,
    enum: [
      'Workspace', 'Board', 'Pipeline', 'Deal', 'Contact', 'Item',
      'Activity', 'User', 'Role', 'Integration', 'Settings',
      'Member', 'AuditLog', 'ApiKey', 'Webhook',
    ],
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  resourceName: String,
  
  // Change tracking
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    fields: [String], // List of changed fields
  },
  
  // Request information
  request: {
    method: String, // GET, POST, PUT, DELETE
    endpoint: String,
    ip: String,
    userAgent: String,
    headers: mongoose.Schema.Types.Mixed,
  },
  
  // Response information
  response: {
    status: Number,
    duration: Number, // milliseconds
    success: Boolean,
    errorMessage: String,
  },
  
  // Context
  metadata: mongoose.Schema.Types.Mixed,
  
  // Severity level
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info',
    index: true,
  },
  
  // Compliance tags
  tags: [String],
  
  // Geo location
  location: {
    country: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false, // Using custom timestamp field
});

// Compound indexes for common queries
auditLogSchema.index({ workspace: 1, timestamp: -1 });
auditLogSchema.index({ workspace: 1, user: 1, timestamp: -1 });
auditLogSchema.index({ workspace: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ workspace: 1, resourceType: 1, timestamp: -1 });
auditLogSchema.index({ workspace: 1, resourceType: 1, resourceId: 1 });
auditLogSchema.index({ workspace: 1, severity: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

// Statics
auditLogSchema.statics.log = async function(data) {
  try {
    const log = new this(data);
    await log.save();
    return log;
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw error to avoid breaking application flow
    return null;
  }
};

auditLogSchema.statics.logActivity = async function({
  workspace,
  user,
  action,
  resourceType,
  resourceId,
  resourceName,
  changes,
  request,
  metadata,
  severity = 'info',
}) {
  return this.log({
    workspace,
    user,
    action,
    resourceType,
    resourceId,
    resourceName,
    changes,
    request,
    metadata,
    severity,
  });
};

auditLogSchema.statics.getTimeline = async function(workspaceId, filters = {}) {
  const query = { workspace: workspaceId };
  
  if (filters.user) query.user = filters.user;
  if (filters.action) query.action = filters.action;
  if (filters.resourceType) query.resourceType = filters.resourceType;
  if (filters.resourceId) query.resourceId = filters.resourceId;
  if (filters.severity) query.severity = filters.severity;
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
    if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
  }
  
  const logs = await this.find(query)
    .sort({ timestamp: -1 })
    .limit(filters.limit || 100)
    .populate('user', 'firstName lastName email')
    .lean();
  
  return logs;
};

auditLogSchema.statics.getStatistics = async function(workspaceId, filters = {}) {
  const pipeline = [
    { $match: { workspace: new mongoose.Types.ObjectId(workspaceId) } },
  ];
  
  if (filters.startDate || filters.endDate) {
    const dateMatch = {};
    if (filters.startDate) dateMatch.$gte = new Date(filters.startDate);
    if (filters.endDate) dateMatch.$lte = new Date(filters.endDate);
    pipeline.push({ $match: { timestamp: dateMatch } });
  }
  
  const stats = await this.aggregate([
    ...pipeline,
    {
      $facet: {
        totalCount: [{ $count: 'count' }],
        byAction: [
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        bySeverity: [
          { $group: { _id: '$severity', count: { $sum: 1 } } },
        ],
        byResourceType: [
          { $group: { _id: '$resourceType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byUser: [
          { $group: { _id: '$user', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
        recentActivity: [
          { $sort: { timestamp: -1 } },
          { $limit: 10 },
        ],
      },
    },
  ]);
  
  return stats[0];
};

auditLogSchema.statics.getComplianceReport = async function(workspaceId, startDate, endDate) {
  const logs = await this.find({
    workspace: workspaceId,
    timestamp: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  })
    .sort({ timestamp: 1 })
    .populate('user', 'firstName lastName email')
    .lean();
  
  return {
    period: { startDate, endDate },
    totalActions: logs.length,
    securityEvents: logs.filter(l => l.tags?.includes('security')).length,
    dataExports: logs.filter(l => l.action === 'data_exported').length,
    failedLogins: logs.filter(l => l.action === 'login_failed').length,
    criticalEvents: logs.filter(l => l.severity === 'critical').length,
    logs,
  };
};

auditLogSchema.statics.searchLogs = async function(workspaceId, searchQuery, filters = {}) {
  const query = {
    workspace: workspaceId,
    $or: [
      { action: new RegExp(searchQuery, 'i') },
      { resourceName: new RegExp(searchQuery, 'i') },
      { userEmail: new RegExp(searchQuery, 'i') },
      { 'metadata.description': new RegExp(searchQuery, 'i') },
    ],
  };
  
  if (filters.user) query.user = filters.user;
  if (filters.action) query.action = filters.action;
  if (filters.severity) query.severity = filters.severity;
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(filters.limit || 50)
    .populate('user', 'firstName lastName email')
    .lean();
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
