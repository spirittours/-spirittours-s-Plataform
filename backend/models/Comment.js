/**
 * Comment Model
 * 
 * Universal comment system with @mentions and threading.
 * Can be attached to any entity (Deal, Contact, Project, Task, Document).
 */

const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  emoji: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const attachmentSchema = new mongoose.Schema({
  name: String,
  url: String,
  size: Number,
  mimeType: String,
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const commentSchema = new mongoose.Schema({
  // Related Entity
  relatedTo: {
    entityType: {
      type: String,
      enum: ['Deal', 'Contact', 'Project', 'Task', 'Document', 'Board', 'Item'],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
  },
  
  // Workspace
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  
  // Author
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Content
  content: {
    type: String,
    required: true,
    trim: true,
  },
  
  // Mentions (@username)
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  
  // Threading
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    index: true,
  },
  
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  
  replyCount: {
    type: Number,
    default: 0,
  },
  
  // Attachments
  attachments: [attachmentSchema],
  
  // Reactions
  reactions: [reactionSchema],
  
  // Status
  isEdited: {
    type: Boolean,
    default: false,
  },
  
  editHistory: [{
    content: String,
    editedAt: Date,
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
  
  isPinned: {
    type: Boolean,
    default: false,
  },
  
  // Soft Delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  deletedAt: Date,
  deletedBy: mongoose.Schema.Types.ObjectId,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes
commentSchema.index({ 'relatedTo.entityType': 1, 'relatedTo.entityId': 1, createdAt: -1 });
commentSchema.index({ workspace: 1, author: 1, createdAt: -1 });
commentSchema.index({ mentions: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: 1 });

// Text index for search
commentSchema.index({ content: 'text' });

// Virtuals
commentSchema.virtual('hasReplies').get(function() {
  return this.replyCount > 0;
});

commentSchema.virtual('isThread').get(function() {
  return !this.parentComment;
});

commentSchema.virtual('reactionCounts').get(function() {
  const counts = {};
  this.reactions.forEach(reaction => {
    counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
  });
  return counts;
});

// Methods
commentSchema.methods.edit = function(newContent, mentions = []) {
  // Save to history
  this.editHistory.push({
    content: this.content,
    editedAt: new Date(),
  });
  
  this.content = newContent;
  this.mentions = mentions;
  this.isEdited = true;
  
  return this.save();
};

commentSchema.methods.addReply = function(replyId) {
  if (!this.replies.includes(replyId)) {
    this.replies.push(replyId);
    this.replyCount += 1;
  }
  return this.save();
};

commentSchema.methods.addReaction = function(userId, emoji) {
  // Check if user already reacted with this emoji
  const existingReaction = this.reactions.find(
    r => r.user.toString() === userId.toString() && r.emoji === emoji
  );
  
  if (existingReaction) {
    return this; // Already reacted
  }
  
  this.reactions.push({
    user: userId,
    emoji,
  });
  
  return this.save();
};

commentSchema.methods.removeReaction = function(userId, emoji) {
  this.reactions = this.reactions.filter(
    r => !(r.user.toString() === userId.toString() && r.emoji === emoji)
  );
  
  return this.save();
};

commentSchema.methods.resolve = function(userId) {
  this.isResolved = true;
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  
  return this.save();
};

commentSchema.methods.unresolve = function() {
  this.isResolved = false;
  this.resolvedBy = null;
  this.resolvedAt = null;
  
  return this.save();
};

commentSchema.methods.pin = function() {
  this.isPinned = true;
  return this.save();
};

commentSchema.methods.unpin = function() {
  this.isPinned = false;
  return this.save();
};

commentSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  
  return this.save();
};

commentSchema.methods.addAttachment = function(attachmentData) {
  this.attachments.push(attachmentData);
  return this.save();
};

// Statics
commentSchema.statics.findByEntity = function(entityType, entityId, options = {}) {
  const query = {
    'relatedTo.entityType': entityType,
    'relatedTo.entityId': entityId,
    isDeleted: false,
  };
  
  // Only get top-level comments (not replies) by default
  if (!options.includeReplies) {
    query.parentComment = null;
  }
  
  if (options.resolved !== undefined) {
    query.isResolved = options.resolved;
  }
  
  let queryBuilder = this.find(query)
    .populate('author', 'firstName lastName email avatar')
    .populate('mentions', 'firstName lastName email')
    .populate('resolvedBy', 'firstName lastName email');
  
  if (options.includeReplies) {
    queryBuilder = queryBuilder.populate({
      path: 'replies',
      populate: { path: 'author', select: 'firstName lastName email avatar' },
    });
  }
  
  return queryBuilder.sort({ isPinned: -1, createdAt: options.sortAsc ? 1 : -1 });
};

commentSchema.statics.findReplies = function(parentCommentId) {
  return this.find({
    parentComment: parentCommentId,
    isDeleted: false,
  })
  .populate('author', 'firstName lastName email avatar')
  .populate('mentions', 'firstName lastName email')
  .sort({ createdAt: 1 });
};

commentSchema.statics.findMentions = function(userId, options = {}) {
  const query = {
    mentions: userId,
    isDeleted: false,
  };
  
  if (options.workspace) {
    query.workspace = options.workspace;
  }
  
  if (options.unreadOnly) {
    // This would require a separate read tracking system
    // For now, just return recent mentions
    query.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
  }
  
  return this.find(query)
    .populate('author', 'firstName lastName email avatar')
    .populate('relatedTo.entityId')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

commentSchema.statics.search = function(workspaceId, searchTerm, options = {}) {
  const query = {
    workspace: workspaceId,
    isDeleted: false,
    $text: { $search: searchTerm },
  };
  
  if (options.entityType) {
    query['relatedTo.entityType'] = options.entityType;
  }
  
  if (options.author) {
    query.author = options.author;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .populate('author', 'firstName lastName email avatar')
    .populate('relatedTo.entityId')
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20);
};

commentSchema.statics.getActivityFeed = function(workspaceId, options = {}) {
  const query = {
    workspace: workspaceId,
    isDeleted: false,
    parentComment: null, // Only top-level comments
  };
  
  if (options.entityType) {
    query['relatedTo.entityType'] = options.entityType;
  }
  
  if (options.entityId) {
    query['relatedTo.entityId'] = options.entityId;
  }
  
  if (options.author) {
    query.author = options.author;
  }
  
  return this.find(query)
    .populate('author', 'firstName lastName email avatar')
    .populate('relatedTo.entityId')
    .populate('mentions', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

commentSchema.statics.getUserStats = async function(userId, workspaceId) {
  const totalComments = await this.countDocuments({
    author: userId,
    workspace: workspaceId,
    isDeleted: false,
  });
  
  const mentions = await this.countDocuments({
    mentions: userId,
    workspace: workspaceId,
    isDeleted: false,
  });
  
  const resolved = await this.countDocuments({
    resolvedBy: userId,
    workspace: workspaceId,
    isDeleted: false,
  });
  
  return {
    totalComments,
    mentions,
    resolved,
  };
};

// Pre-save middleware
commentSchema.pre('save', async function(next) {
  // Extract mentions from content (@username pattern)
  if (this.isModified('content')) {
    const mentionPattern = /@(\w+)/g;
    const matches = [...this.content.matchAll(mentionPattern)];
    
    if (matches.length > 0) {
      // In a real implementation, look up users by username
      // For now, we'll keep the mentions array as-is
    }
  }
  
  next();
});

// Post-save middleware to update parent reply count
commentSchema.post('save', async function(doc) {
  if (doc.parentComment && !doc.isDeleted) {
    const Comment = mongoose.model('Comment');
    const parent = await Comment.findById(doc.parentComment);
    if (parent && !parent.replies.includes(doc._id)) {
      await parent.addReply(doc._id);
    }
  }
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
