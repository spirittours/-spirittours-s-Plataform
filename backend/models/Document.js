/**
 * Document Model
 * 
 * Document management system with versioning and permissions.
 * Supports file uploads, sharing, and collaboration.
 */

const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  versionNumber: {
    type: Number,
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  fileName: String,
  fileSize: Number,
  mimeType: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  changes: String,
  hash: String, // For deduplication
});

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isResolved: {
    type: Boolean,
    default: false,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: Date,
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
  },
}, { timestamps: true });

const documentSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  
  description: String,
  
  type: {
    type: String,
    enum: ['contract', 'proposal', 'invoice', 'report', 'presentation', 'other'],
    default: 'other',
  },
  
  // Relationships
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentFolder',
  },
  
  relatedTo: {
    entityType: {
      type: String,
      enum: ['Deal', 'Contact', 'Project', 'Task'],
    },
    entityId: mongoose.Schema.Types.ObjectId,
  },
  
  // File Information
  currentVersion: {
    type: Number,
    default: 1,
  },
  
  versions: [versionSchema],
  
  fileUrl: {
    type: String,
    required: true,
  },
  
  fileName: String,
  fileSize: Number,
  mimeType: String,
  
  // Ownership & Permissions
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  permissions: {
    visibility: {
      type: String,
      enum: ['private', 'team', 'workspace', 'public'],
      default: 'team',
    },
    
    sharedWith: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      accessLevel: {
        type: String,
        enum: ['view', 'comment', 'edit', 'admin'],
        default: 'view',
      },
      sharedAt: Date,
      sharedBy: mongoose.Schema.Types.ObjectId,
    }],
    
    allowDownload: {
      type: Boolean,
      default: true,
    },
    
    allowPrint: {
      type: Boolean,
      default: true,
    },
    
    expiresAt: Date,
  },
  
  // Status & Workflow
  status: {
    type: String,
    enum: ['draft', 'review', 'approved', 'rejected', 'archived'],
    default: 'draft',
    index: true,
  },
  
  approvalWorkflow: {
    required: {
      type: Boolean,
      default: false,
    },
    approvers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      reviewedAt: Date,
      comments: String,
    }],
  },
  
  // Collaboration
  comments: [commentSchema],
  
  // Analytics
  views: {
    type: Number,
    default: 0,
  },
  
  downloads: {
    type: Number,
    default: 0,
  },
  
  lastViewedAt: Date,
  lastViewedBy: mongoose.Schema.Types.ObjectId,
  
  lastDownloadedAt: Date,
  lastDownloadedBy: mongoose.Schema.Types.ObjectId,
  
  // Metadata
  tags: [String],
  customFields: mongoose.Schema.Types.Mixed,
  
  // Security
  isLocked: {
    type: Boolean,
    default: false,
  },
  
  lockedBy: mongoose.Schema.Types.ObjectId,
  lockedAt: Date,
  
  // Tracking
  isArchived: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  archivedAt: Date,
  archivedBy: mongoose.Schema.Types.ObjectId,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
documentSchema.index({ workspace: 1, status: 1 });
documentSchema.index({ owner: 1, isArchived: 1 });
documentSchema.index({ 'relatedTo.entityType': 1, 'relatedTo.entityId': 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ name: 'text', description: 'text' });

// Virtuals
documentSchema.virtual('latestVersion').get(function() {
  if (!this.versions || this.versions.length === 0) return null;
  return this.versions[this.versions.length - 1];
});

documentSchema.virtual('fileExtension').get(function() {
  if (!this.fileName) return '';
  return this.fileName.split('.').pop().toLowerCase();
});

// Methods
documentSchema.methods.addVersion = function(versionData) {
  const versionNumber = this.currentVersion + 1;
  
  this.versions.push({
    versionNumber,
    ...versionData,
    uploadedAt: new Date(),
  });
  
  this.currentVersion = versionNumber;
  this.fileUrl = versionData.fileUrl;
  this.fileName = versionData.fileName;
  this.fileSize = versionData.fileSize;
  this.mimeType = versionData.mimeType;
  
  return this.save();
};

documentSchema.methods.shareWith = function(userId, accessLevel, sharedBy) {
  const existingShare = this.permissions.sharedWith.find(
    s => s.user.toString() === userId.toString()
  );
  
  if (existingShare) {
    existingShare.accessLevel = accessLevel;
  } else {
    this.permissions.sharedWith.push({
      user: userId,
      accessLevel,
      sharedAt: new Date(),
      sharedBy,
    });
  }
  
  return this.save();
};

documentSchema.methods.revokeAccess = function(userId) {
  this.permissions.sharedWith = this.permissions.sharedWith.filter(
    s => s.user.toString() !== userId.toString()
  );
  
  return this.save();
};

documentSchema.methods.addComment = function(userId, content, mentions = []) {
  this.comments.push({
    user: userId,
    content,
    mentions,
  });
  
  return this.save();
};

documentSchema.methods.resolveComment = function(commentId, userId) {
  const comment = this.comments.id(commentId);
  if (!comment) {
    throw new Error('Comment not found');
  }
  
  comment.isResolved = true;
  comment.resolvedBy = userId;
  comment.resolvedAt = new Date();
  
  return this.save();
};

documentSchema.methods.requestApproval = function(approvers) {
  this.approvalWorkflow.required = true;
  this.approvalWorkflow.approvers = approvers.map(userId => ({
    user: userId,
    status: 'pending',
  }));
  this.status = 'review';
  
  return this.save();
};

documentSchema.methods.approve = function(userId, comments) {
  const approver = this.approvalWorkflow.approvers.find(
    a => a.user.toString() === userId.toString()
  );
  
  if (!approver) {
    throw new Error('User not in approvers list');
  }
  
  approver.status = 'approved';
  approver.reviewedAt = new Date();
  approver.comments = comments;
  
  // Check if all approved
  const allApproved = this.approvalWorkflow.approvers.every(
    a => a.status === 'approved'
  );
  
  if (allApproved) {
    this.status = 'approved';
  }
  
  return this.save();
};

documentSchema.methods.reject = function(userId, comments) {
  const approver = this.approvalWorkflow.approvers.find(
    a => a.user.toString() === userId.toString()
  );
  
  if (!approver) {
    throw new Error('User not in approvers list');
  }
  
  approver.status = 'rejected';
  approver.reviewedAt = new Date();
  approver.comments = comments;
  
  this.status = 'rejected';
  
  return this.save();
};

documentSchema.methods.lock = function(userId) {
  if (this.isLocked) {
    throw new Error('Document already locked');
  }
  
  this.isLocked = true;
  this.lockedBy = userId;
  this.lockedAt = new Date();
  
  return this.save();
};

documentSchema.methods.unlock = function(userId) {
  if (!this.isLocked) {
    throw new Error('Document not locked');
  }
  
  if (this.lockedBy.toString() !== userId.toString()) {
    throw new Error('Only the user who locked the document can unlock it');
  }
  
  this.isLocked = false;
  this.lockedBy = null;
  this.lockedAt = null;
  
  return this.save();
};

documentSchema.methods.recordView = function(userId) {
  this.views += 1;
  this.lastViewedAt = new Date();
  this.lastViewedBy = userId;
  
  return this.save();
};

documentSchema.methods.recordDownload = function(userId) {
  this.downloads += 1;
  this.lastDownloadedAt = new Date();
  this.lastDownloadedBy = userId;
  
  return this.save();
};

documentSchema.methods.canUserAccess = function(userId, requiredLevel = 'view') {
  // Owner has full access
  if (this.owner.toString() === userId.toString()) {
    return true;
  }
  
  // Check permissions
  if (this.permissions.visibility === 'public') {
    return true;
  }
  
  const share = this.permissions.sharedWith.find(
    s => s.user.toString() === userId.toString()
  );
  
  if (!share) {
    return this.permissions.visibility === 'workspace';
  }
  
  // Check access level hierarchy
  const levels = ['view', 'comment', 'edit', 'admin'];
  const userLevel = levels.indexOf(share.accessLevel);
  const required = levels.indexOf(requiredLevel);
  
  return userLevel >= required;
};

// Statics
documentSchema.statics.findByWorkspace = function(workspaceId, options = {}) {
  const query = { workspace: workspaceId, isArchived: false };
  
  if (options.type) {
    query.type = options.type;
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.folder) {
    query.folder = options.folder;
  }
  
  return this.find(query)
    .populate('owner', 'firstName lastName email')
    .populate('folder', 'name')
    .sort({ updatedAt: -1 });
};

documentSchema.statics.findByUser = function(userId, options = {}) {
  const query = {
    $or: [
      { owner: userId },
      { 'permissions.sharedWith.user': userId },
    ],
    isArchived: false,
  };
  
  if (options.type) {
    query.type = options.type;
  }
  
  return this.find(query)
    .populate('owner', 'firstName lastName email')
    .populate('workspace', 'name')
    .sort({ updatedAt: -1 });
};

documentSchema.statics.search = function(workspaceId, searchTerm, options = {}) {
  const query = {
    workspace: workspaceId,
    isArchived: false,
    $text: { $search: searchTerm },
  };
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('owner', 'firstName lastName email')
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20);
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
