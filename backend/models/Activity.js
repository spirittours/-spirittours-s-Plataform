/**
 * Activity Model
 * 
 * Activities track all events and actions in the CRM.
 * Used for timeline, audit logging, and activity feeds.
 */

const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  // Activity Type
  type: {
    type: String,
    required: true,
    enum: [
      // Deal Activities
      'deal_created',
      'deal_updated',
      'deal_stage_changed',
      'deal_won',
      'deal_lost',
      'deal_archived',
      
      // Contact Activities
      'contact_created',
      'contact_updated',
      'contact_converted',
      'contact_archived',
      
      // Communication Activities
      'email_sent',
      'email_received',
      'call_made',
      'call_received',
      'meeting_scheduled',
      'meeting_completed',
      'whatsapp_sent',
      'whatsapp_received',
      
      // Board Activities
      'board_created',
      'board_updated',
      'board_archived',
      
      // Item Activities
      'item_created',
      'item_updated',
      'item_completed',
      'item_archived',
      'item_moved',
      
      // Pipeline Activities
      'pipeline_created',
      'pipeline_updated',
      'pipeline_archived',
      
      // Workspace Activities
      'workspace_created',
      'workspace_updated',
      'member_added',
      'member_removed',
      'member_role_changed',
      
      // Other
      'note_added',
      'file_uploaded',
      'task_created',
      'task_completed',
    ],
    index: true,
  },
  
  // Workspace
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  
  // Actor (who performed the action)
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Related Entities
  deal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    index: true,
  },
  
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    index: true,
  },
  
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    index: true,
  },
  
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    index: true,
  },
  
  pipeline: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pipeline',
    index: true,
  },
  
  // Activity Details
  description: {
    type: String,
    required: true,
  },
  
  // Changes (for update activities)
  changes: mongoose.Schema.Types.Mixed,
  // Format: { field: { old: value, new: value } }
  
  // Additional Data
  metadata: mongoose.Schema.Types.Mixed,
  
  // Notes
  notes: String,
  
  // Visibility
  isPrivate: {
    type: Boolean,
    default: false,
  },
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
activitySchema.index({ workspace: 1, createdAt: -1 });
activitySchema.index({ actor: 1, createdAt: -1 });
activitySchema.index({ deal: 1, createdAt: -1 });
activitySchema.index({ contact: 1, createdAt: -1 });
activitySchema.index({ board: 1, createdAt: -1 });
activitySchema.index({ item: 1, createdAt: -1 });
activitySchema.index({ type: 1, workspace: 1 });

// Static methods
activitySchema.statics.logActivity = async function(activityData) {
  const activity = new this(activityData);
  return activity.save();
};

activitySchema.statics.findByWorkspace = function(workspaceId, filters = {}) {
  const query = { workspace: workspaceId, ...filters };
  return this.find(query).sort({ createdAt: -1 });
};

activitySchema.statics.findByDeal = function(dealId) {
  return this.find({ deal: dealId }).sort({ createdAt: -1 });
};

activitySchema.statics.findByContact = function(contactId) {
  return this.find({ contact: contactId }).sort({ createdAt: -1 });
};

activitySchema.statics.findByActor = function(userId, filters = {}) {
  const query = { actor: userId, ...filters };
  return this.find(query).sort({ createdAt: -1 });
};

activitySchema.statics.findByType = function(type, workspaceId) {
  return this.find({
    type,
    workspace: workspaceId,
  }).sort({ createdAt: -1 });
};

activitySchema.statics.getTimeline = function(entityType, entityId, limit = 50) {
  const query = {};
  query[entityType] = entityId;
  
  return this.find(query)
    .populate('actor', 'first_name last_name email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
