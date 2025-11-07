/**
 * Time Entry Model
 * 
 * Time tracking for projects, tasks, and billable hours.
 * Supports timers, manual entries, and reporting.
 */

const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
  // Basic Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  
  // Related Entity
  relatedTo: {
    entityType: {
      type: String,
      enum: ['Project', 'Task', 'Deal', 'Contact'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  
  // Time
  startTime: {
    type: Date,
    required: true,
    index: true,
  },
  
  endTime: Date,
  
  duration: {
    type: Number, // in seconds
    required: true,
    min: 0,
  },
  
  // Description
  description: {
    type: String,
    required: true,
    trim: true,
  },
  
  notes: String,
  
  // Classification
  type: {
    type: String,
    enum: ['work', 'meeting', 'research', 'planning', 'review', 'other'],
    default: 'work',
  },
  
  // Billing
  billable: {
    type: Boolean,
    default: true,
  },
  
  hourlyRate: Number,
  
  cost: {
    type: Number,
    default: 0,
  },
  
  invoiced: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
  },
  
  invoicedAt: Date,
  
  // Status
  status: {
    type: String,
    enum: ['running', 'stopped', 'approved', 'rejected'],
    default: 'stopped',
    index: true,
  },
  
  // Approval
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  approvedAt: Date,
  
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  rejectedAt: Date,
  rejectionReason: String,
  
  // Metadata
  tags: [String],
  isManual: {
    type: Boolean,
    default: false,
  },
  
  // Tracking
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

// Indexes
timeEntrySchema.index({ user: 1, startTime: -1 });
timeEntrySchema.index({ workspace: 1, startTime: -1 });
timeEntrySchema.index({ 'relatedTo.entityType': 1, 'relatedTo.entityId': 1 });
timeEntrySchema.index({ billable: 1, invoiced: 1 });
timeEntrySchema.index({ status: 1, user: 1 });

// Virtuals
timeEntrySchema.virtual('durationHours').get(function() {
  return this.duration / 3600;
});

timeEntrySchema.virtual('durationFormatted').get(function() {
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
});

timeEntrySchema.virtual('isRunning').get(function() {
  return this.status === 'running' && !this.endTime;
});

timeEntrySchema.virtual('date').get(function() {
  return this.startTime.toISOString().split('T')[0];
});

// Methods
timeEntrySchema.methods.stop = function() {
  if (this.status !== 'running') {
    throw new Error('Time entry is not running');
  }
  
  this.endTime = new Date();
  this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  this.status = 'stopped';
  
  // Calculate cost if hourly rate provided
  if (this.hourlyRate) {
    this.cost = this.durationHours * this.hourlyRate;
  }
  
  return this.save();
};

timeEntrySchema.methods.approve = function(userId) {
  if (this.status !== 'stopped') {
    throw new Error('Only stopped entries can be approved');
  }
  
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  
  return this.save();
};

timeEntrySchema.methods.reject = function(userId, reason) {
  if (this.status !== 'stopped') {
    throw new Error('Only stopped entries can be rejected');
  }
  
  this.status = 'rejected';
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  
  return this.save();
};

timeEntrySchema.methods.markAsInvoiced = function(invoiceId) {
  if (!this.billable) {
    throw new Error('Cannot invoice non-billable time');
  }
  
  if (this.invoiced) {
    throw new Error('Time entry already invoiced');
  }
  
  this.invoiced = true;
  this.invoiceId = invoiceId;
  this.invoicedAt = new Date();
  
  return this.save();
};

// Statics
timeEntrySchema.statics.findByUser = function(userId, options = {}) {
  const query = { user: userId, isDeleted: false };
  
  if (options.startDate && options.endDate) {
    query.startTime = {
      $gte: new Date(options.startDate),
      $lte: new Date(options.endDate),
    };
  }
  
  if (options.billable !== undefined) {
    query.billable = options.billable;
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('workspace', 'name')
    .sort({ startTime: -1 });
};

timeEntrySchema.statics.findByProject = function(projectId, options = {}) {
  const query = {
    'relatedTo.entityType': 'Project',
    'relatedTo.entityId': projectId,
    isDeleted: false,
  };
  
  if (options.user) {
    query.user = options.user;
  }
  
  return this.find(query)
    .populate('user', 'firstName lastName email')
    .sort({ startTime: -1 });
};

timeEntrySchema.statics.getRunningTimer = function(userId) {
  return this.findOne({
    user: userId,
    status: 'running',
    isDeleted: false,
  })
  .populate('workspace', 'name')
  .populate('relatedTo.entityId');
};

timeEntrySchema.statics.getTotalHours = async function(userId, startDate, endDate) {
  const entries = await this.find({
    user: userId,
    startTime: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
    isDeleted: false,
  });
  
  const totalSeconds = entries.reduce((sum, entry) => sum + entry.duration, 0);
  return totalSeconds / 3600;
};

timeEntrySchema.statics.getBillableHours = async function(userId, startDate, endDate) {
  const entries = await this.find({
    user: userId,
    billable: true,
    startTime: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
    isDeleted: false,
  });
  
  const totalSeconds = entries.reduce((sum, entry) => sum + entry.duration, 0);
  return totalSeconds / 3600;
};

timeEntrySchema.statics.getTotalCost = async function(projectId, options = {}) {
  const query = {
    'relatedTo.entityType': 'Project',
    'relatedTo.entityId': projectId,
    isDeleted: false,
  };
  
  if (options.billable !== undefined) {
    query.billable = options.billable;
  }
  
  if (options.invoiced !== undefined) {
    query.invoiced = options.invoiced;
  }
  
  const entries = await this.find(query);
  return entries.reduce((sum, entry) => sum + (entry.cost || 0), 0);
};

timeEntrySchema.statics.getUninvoicedEntries = function(workspaceId, options = {}) {
  const query = {
    workspace: workspaceId,
    billable: true,
    invoiced: false,
    status: 'approved',
    isDeleted: false,
  };
  
  if (options.user) {
    query.user = options.user;
  }
  
  if (options.projectId) {
    query['relatedTo.entityType'] = 'Project';
    query['relatedTo.entityId'] = options.projectId;
  }
  
  return this.find(query)
    .populate('user', 'firstName lastName email')
    .populate('relatedTo.entityId')
    .sort({ startTime: -1 });
};

timeEntrySchema.statics.getDailyReport = async function(userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const entries = await this.find({
    user: userId,
    startTime: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
    isDeleted: false,
  })
  .populate('relatedTo.entityId')
  .sort({ startTime: 1 });
  
  const totalDuration = entries.reduce((sum, entry) => sum + entry.duration, 0);
  const billableDuration = entries
    .filter(e => e.billable)
    .reduce((sum, entry) => sum + entry.duration, 0);
  
  return {
    date,
    entries,
    totalHours: totalDuration / 3600,
    billableHours: billableDuration / 3600,
    totalCost: entries.reduce((sum, entry) => sum + (entry.cost || 0), 0),
  };
};

// Pre-save middleware
timeEntrySchema.pre('save', function(next) {
  // Calculate cost if hourly rate and duration changed
  if (this.isModified('duration') || this.isModified('hourlyRate')) {
    if (this.hourlyRate && this.duration) {
      this.cost = (this.duration / 3600) * this.hourlyRate;
    }
  }
  
  // Calculate duration from start/end if not set
  if (!this.duration && this.startTime && this.endTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  
  next();
});

const TimeEntry = mongoose.model('TimeEntry', timeEntrySchema);

module.exports = TimeEntry;
