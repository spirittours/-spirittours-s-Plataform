/**
 * Project Model
 * 
 * Post-sales project management for deal fulfillment.
 * Tracks tasks, milestones, resources, and time.
 */

const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'blocked', 'completed', 'cancelled'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  startDate: Date,
  dueDate: Date,
  completedAt: Date,
  estimatedHours: Number,
  actualHours: Number,
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
  }],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  tags: [String],
  attachments: [{
    name: String,
    url: String,
    size: Number,
    uploadedBy: mongoose.Schema.Types.ObjectId,
    uploadedAt: Date,
  }],
}, { timestamps: true });

const milestoneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  dueDate: {
    type: Date,
    required: true,
  },
  completedAt: Date,
  status: {
    type: String,
    enum: ['pending', 'completed', 'missed'],
    default: 'pending',
  },
  deliverables: [String],
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
  }],
}, { timestamps: true });

const resourceAllocationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['project_manager', 'developer', 'designer', 'qa', 'consultant', 'other'],
    required: true,
  },
  allocatedHours: Number,
  startDate: Date,
  endDate: Date,
  utilization: {
    type: Number,
    min: 0,
    max: 100,
    default: 100,
  },
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  
  description: String,
  
  // Relationships
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  
  deal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    index: true,
  },
  
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
  },
  
  // Team
  projectManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  team: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: String,
    joinedAt: Date,
  }],
  
  // Timeline
  startDate: {
    type: Date,
    required: true,
  },
  
  endDate: {
    type: Date,
    required: true,
  },
  
  actualStartDate: Date,
  actualEndDate: Date,
  
  // Status
  status: {
    type: String,
    enum: ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'],
    default: 'planning',
    index: true,
  },
  
  health: {
    type: String,
    enum: ['on_track', 'at_risk', 'off_track'],
    default: 'on_track',
  },
  
  // Budget & Finance
  budget: {
    total: Number,
    spent: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
  },
  
  // Tasks & Milestones
  tasks: [taskSchema],
  milestones: [milestoneSchema],
  
  // Resources
  resources: [resourceAllocationSchema],
  
  // Progress
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  
  // Metadata
  tags: [String],
  customFields: mongoose.Schema.Types.Mixed,
  
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
projectSchema.index({ workspace: 1, status: 1 });
projectSchema.index({ projectManager: 1, status: 1 });
projectSchema.index({ 'team.user': 1 });
projectSchema.index({ code: 1 }, { unique: true });

// Virtuals
projectSchema.virtual('totalTasks').get(function() {
  return this.tasks.length;
});

projectSchema.virtual('completedTasks').get(function() {
  return this.tasks.filter(task => task.status === 'completed').length;
});

projectSchema.virtual('overdueTasks').get(function() {
  const now = new Date();
  return this.tasks.filter(task => 
    task.status !== 'completed' &&
    task.dueDate &&
    new Date(task.dueDate) < now
  ).length;
});

projectSchema.virtual('budgetUsagePercentage').get(function() {
  if (!this.budget.total || this.budget.total === 0) return 0;
  return (this.budget.spent / this.budget.total) * 100;
});

projectSchema.virtual('daysRemaining').get(function() {
  if (!this.endDate) return null;
  const now = new Date();
  const end = new Date(this.endDate);
  const diff = end - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Methods
projectSchema.methods.addTask = function(taskData) {
  this.tasks.push(taskData);
  this.updateProgress();
  return this.save();
};

projectSchema.methods.updateTask = function(taskId, updates) {
  const task = this.tasks.id(taskId);
  if (!task) {
    throw new Error('Task not found');
  }
  
  Object.assign(task, updates);
  
  if (updates.status === 'completed' && !task.completedAt) {
    task.completedAt = new Date();
  }
  
  this.updateProgress();
  return this.save();
};

projectSchema.methods.addMilestone = function(milestoneData) {
  this.milestones.push(milestoneData);
  return this.save();
};

projectSchema.methods.updateMilestone = function(milestoneId, updates) {
  const milestone = this.milestones.id(milestoneId);
  if (!milestone) {
    throw new Error('Milestone not found');
  }
  
  Object.assign(milestone, updates);
  
  if (updates.status === 'completed' && !milestone.completedAt) {
    milestone.completedAt = new Date();
  }
  
  return this.save();
};

projectSchema.methods.addTeamMember = function(userId, role) {
  const existingMember = this.team.find(m => m.user.toString() === userId.toString());
  if (existingMember) {
    throw new Error('User already in team');
  }
  
  this.team.push({
    user: userId,
    role,
    joinedAt: new Date(),
  });
  
  return this.save();
};

projectSchema.methods.removeTeamMember = function(userId) {
  this.team = this.team.filter(m => m.user.toString() !== userId.toString());
  return this.save();
};

projectSchema.methods.allocateResource = function(resourceData) {
  this.resources.push(resourceData);
  return this.save();
};

projectSchema.methods.updateProgress = function() {
  if (this.tasks.length === 0) {
    this.progress = 0;
    return;
  }
  
  const completedTasks = this.tasks.filter(t => t.status === 'completed').length;
  this.progress = Math.round((completedTasks / this.tasks.length) * 100);
  
  // Update health status
  const now = new Date();
  const totalDays = (new Date(this.endDate) - new Date(this.startDate)) / (1000 * 60 * 60 * 24);
  const elapsedDays = (now - new Date(this.startDate)) / (1000 * 60 * 60 * 24);
  const expectedProgress = Math.min((elapsedDays / totalDays) * 100, 100);
  
  if (this.progress < expectedProgress - 20) {
    this.health = 'off_track';
  } else if (this.progress < expectedProgress - 10) {
    this.health = 'at_risk';
  } else {
    this.health = 'on_track';
  }
};

// Statics
projectSchema.statics.findByWorkspace = function(workspaceId, options = {}) {
  const query = { workspace: workspaceId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (!options.includeArchived) {
    query.isArchived = false;
  }
  
  return this.find(query)
    .populate('projectManager', 'firstName lastName email')
    .populate('team.user', 'firstName lastName email')
    .populate('deal', 'title value')
    .populate('contact', 'firstName lastName company')
    .sort({ updatedAt: -1 });
};

projectSchema.statics.findByProjectManager = function(userId, options = {}) {
  const query = { projectManager: userId, isArchived: false };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .populate('workspace', 'name')
    .populate('deal', 'title value')
    .sort({ updatedAt: -1 });
};

projectSchema.statics.generateProjectCode = async function(workspaceId) {
  const prefix = 'PROJ';
  const count = await this.countDocuments({ workspace: workspaceId });
  const number = (count + 1).toString().padStart(4, '0');
  return `${prefix}-${number}`;
};

// Pre-save middleware
projectSchema.pre('save', function(next) {
  if (this.isModified('tasks') && !this.isModified('progress')) {
    this.updateProgress();
  }
  next();
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
