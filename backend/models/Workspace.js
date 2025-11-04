/**
 * Workspace Model
 * 
 * Workspaces provide team isolation and multi-tenancy.
 * Each workspace can have multiple boards, pipelines, and users.
 */

const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
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
  
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  
  // Owner & Members
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    permissions: {
      canManageBoards: {
        type: Boolean,
        default: false,
      },
      canManagePipelines: {
        type: Boolean,
        default: false,
      },
      canManageMembers: {
        type: Boolean,
        default: false,
      },
      canExportData: {
        type: Boolean,
        default: false,
      },
      canManageIntegrations: {
        type: Boolean,
        default: false,
      },
    },
  }],
  
  // Settings
  settings: {
    timezone: {
      type: String,
      default: 'America/Mexico_City',
    },
    language: {
      type: String,
      default: 'es',
      enum: ['es', 'en', 'pt', 'fr'],
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'MXN', 'CAD', 'GBP'],
    },
    dateFormat: {
      type: String,
      default: 'YYYY-MM-DD',
    },
    timeFormat: {
      type: String,
      default: '24h',
      enum: ['12h', '24h'],
    },
  },
  
  // Features & Limits
  features: {
    maxBoards: {
      type: Number,
      default: null, // null = unlimited
    },
    maxDeals: {
      type: Number,
      default: null,
    },
    maxContacts: {
      type: Number,
      default: null,
    },
    maxStorage: {
      type: Number, // in GB
      default: 10,
    },
    aiCredits: {
      type: Number,
      default: 1000,
    },
  },
  
  // Billing & Subscription
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'professional', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'trial', 'suspended', 'cancelled'],
      default: 'trial',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: Date,
    seats: {
      type: Number,
      default: 5,
    },
    usedSeats: {
      type: Number,
      default: 1,
    },
  },
  
  // Branding
  branding: {
    logo: String,
    primaryColor: {
      type: String,
      default: '#4F46E5', // Indigo
    },
    secondaryColor: {
      type: String,
      default: '#10B981', // Green
    },
    customDomain: String,
  },
  
  // Integrations
  integrations: {
    gmail: {
      enabled: {
        type: Boolean,
        default: false,
      },
      credentials: mongoose.Schema.Types.Mixed,
    },
    outlook: {
      enabled: {
        type: Boolean,
        default: false,
      },
      credentials: mongoose.Schema.Types.Mixed,
    },
    calendar: {
      enabled: {
        type: Boolean,
        default: false,
      },
      provider: String, // 'google', 'outlook'
      credentials: mongoose.Schema.Types.Mixed,
    },
    docusign: {
      enabled: {
        type: Boolean,
        default: false,
      },
      apiKey: String,
    },
    zoom: {
      enabled: {
        type: Boolean,
        default: false,
      },
      apiKey: String,
    },
    slack: {
      enabled: {
        type: Boolean,
        default: false,
      },
      webhookUrl: String,
    },
  },
  
  // SSO Configuration
  sso: {
    saml: {
      enabled: Boolean,
      entryPoint: String,
      issuer: String,
      certificate: String,
      configuredAt: Date,
      configuredBy: mongoose.Schema.Types.ObjectId,
    },
    azureAD: {
      enabled: Boolean,
      tenantId: String,
      clientId: String,
      clientSecret: String,
      configuredAt: Date,
      configuredBy: mongoose.Schema.Types.ObjectId,
    },
    google: {
      enabled: Boolean,
      clientId: String,
      clientSecret: String,
      allowedDomains: [String],
      configuredAt: Date,
      configuredBy: mongoose.Schema.Types.ObjectId,
    },
    okta: {
      enabled: Boolean,
      entryPoint: String,
      issuer: String,
      certificate: String,
      configuredAt: Date,
      configuredBy: mongoose.Schema.Types.ObjectId,
    },
  },
  
  // Security
  security: {
    twoFactorRequired: {
      type: Boolean,
      default: false,
    },
    ssoEnabled: {
      type: Boolean,
      default: false,
    },
    ssoProvider: String, // 'okta', 'azure-ad', 'google', 'saml'
    ipWhitelist: [String],
    sessionTimeout: {
      type: Number, // in minutes
      default: 480, // 8 hours
    },
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  
  isPanicMode: {
    type: Boolean,
    default: false,
  },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
workspaceSchema.index({ owner: 1, isActive: 1 });
workspaceSchema.index({ 'members.user': 1 });
workspaceSchema.index({ slug: 1 }, { unique: true });

// Virtual: Total members
workspaceSchema.virtual('totalMembers').get(function() {
  return this.members.length;
});

// Virtual: Available seats
workspaceSchema.virtual('availableSeats').get(function() {
  return this.subscription.seats - this.subscription.usedSeats;
});

// Methods
workspaceSchema.methods.addMember = function(userId, role = 'member', permissions = {}) {
  // Check if user already exists
  const existingMember = this.members.find(m => m.user.toString() === userId.toString());
  if (existingMember) {
    throw new Error('User already member of this workspace');
  }
  
  // Check seat availability
  if (this.subscription.usedSeats >= this.subscription.seats) {
    throw new Error('No available seats in this workspace');
  }
  
  this.members.push({
    user: userId,
    role,
    permissions: {
      canManageBoards: permissions.canManageBoards || false,
      canManagePipelines: permissions.canManagePipelines || false,
      canManageMembers: permissions.canManageMembers || false,
      canExportData: permissions.canExportData || false,
      canManageIntegrations: permissions.canManageIntegrations || false,
    },
  });
  
  this.subscription.usedSeats += 1;
  return this.save();
};

workspaceSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(m => m.user.toString() === userId.toString());
  if (memberIndex === -1) {
    throw new Error('User not found in workspace');
  }
  
  // Cannot remove owner
  if (this.members[memberIndex].role === 'owner') {
    throw new Error('Cannot remove workspace owner');
  }
  
  this.members.splice(memberIndex, 1);
  this.subscription.usedSeats -= 1;
  return this.save();
};

workspaceSchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) {
    throw new Error('User not found in workspace');
  }
  
  member.role = newRole;
  return this.save();
};

workspaceSchema.methods.updateMemberPermissions = function(userId, permissions) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) {
    throw new Error('User not found in workspace');
  }
  
  member.permissions = { ...member.permissions, ...permissions };
  return this.save();
};

workspaceSchema.methods.canUserAccess = function(userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

workspaceSchema.methods.getUserRole = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

workspaceSchema.methods.getUserPermissions = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.permissions : null;
};

// Static methods
workspaceSchema.statics.findByUserId = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'members.user': userId },
    ],
    isActive: true,
  });
};

workspaceSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug, isActive: true });
};

const Workspace = mongoose.model('Workspace', workspaceSchema);

module.exports = Workspace;
