/**
 * Contact Model
 * 
 * Contacts represent individuals (leads, customers, partners).
 * Can be linked to companies/agencies and deals.
 */

const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  // Basic Information
  first_name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  
  last_name: {
    type: String,
    trim: true,
    index: true,
  },
  
  email: {
    type: String,
    trim: true,
    lowercase: true,
    index: true,
  },
  
  phone: {
    type: String,
    trim: true,
  },
  
  mobile: {
    type: String,
    trim: true,
  },
  
  // Workspace
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
  },
  
  // Company/Agency
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TravelAgency',
    index: true,
  },
  
  jobTitle: {
    type: String,
    trim: true,
  },
  
  department: {
    type: String,
    trim: true,
  },
  
  // Social & Communication
  whatsapp: {
    type: String,
    trim: true,
  },
  
  linkedin: {
    type: String,
    trim: true,
  },
  
  facebook: {
    type: String,
    trim: true,
  },
  
  instagram: {
    type: String,
    trim: true,
  },
  
  twitter: {
    type: String,
    trim: true,
  },
  
  website: {
    type: String,
    trim: true,
  },
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
  },
  
  // Contact Type
  type: {
    type: String,
    enum: ['lead', 'customer', 'partner', 'vendor', 'other'],
    default: 'lead',
    index: true,
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'unqualified', 'converted'],
    default: 'active',
    index: true,
  },
  
  // Lead Information
  leadSource: {
    type: String,
    enum: [
      'website',
      'email',
      'phone',
      'referral',
      'social_media',
      'whatsapp',
      'linkedin',
      'facebook',
      'instagram',
      'campaign',
      'manual',
      'other',
    ],
    default: 'manual',
  },
  
  leadSourceDetails: String,
  
  leadScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  
  leadQuality: {
    type: String,
    enum: ['hot', 'warm', 'cold'],
    default: 'warm',
  },
  
  // Owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Tags
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  
  // Notes
  notes: {
    type: String,
    trim: true,
  },
  
  // Custom Fields
  customFields: mongoose.Schema.Types.Mixed,
  
  // Activity
  lastContactedAt: Date,
  
  lastActivityAt: Date,
  
  nextActivityAt: Date,
  
  // Engagement
  engagementScore: {
    type: Number,
    default: 0,
  },
  
  interactions: {
    emails: {
      type: Number,
      default: 0,
    },
    calls: {
      type: Number,
      default: 0,
    },
    meetings: {
      type: Number,
      default: 0,
    },
    whatsappMessages: {
      type: Number,
      default: 0,
    },
  },
  
  // Consent & GDPR
  emailOptIn: {
    type: Boolean,
    default: false,
  },
  
  smsOptIn: {
    type: Boolean,
    default: false,
  },
  
  whatsappOptIn: {
    type: Boolean,
    default: false,
  },
  
  gdprConsent: {
    type: Boolean,
    default: false,
  },
  
  gdprConsentDate: Date,
  
  // Visibility
  isPrivate: {
    type: Boolean,
    default: false,
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
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
contactSchema.index({ workspace: 1, isArchived: 1 });
contactSchema.index({ owner: 1, status: 1 });
contactSchema.index({ email: 1, workspace: 1 });
contactSchema.index({ company: 1 });
contactSchema.index({ type: 1, workspace: 1 });
contactSchema.index({ leadScore: -1 });

// Virtual: Full name
contactSchema.virtual('fullName').get(function() {
  return `${this.first_name} ${this.last_name || ''}`.trim();
});

// Virtual: Deals
contactSchema.virtual('deals', {
  ref: 'Deal',
  localField: '_id',
  foreignField: 'contact',
});

// Methods
contactSchema.methods.recordActivity = function(type) {
  this.lastActivityAt = new Date();
  
  // Update interaction count
  if (type === 'email') {
    this.interactions.emails += 1;
  } else if (type === 'call') {
    this.interactions.calls += 1;
  } else if (type === 'meeting') {
    this.interactions.meetings += 1;
  } else if (type === 'whatsapp') {
    this.interactions.whatsappMessages += 1;
  }
  
  // Update engagement score
  this.engagementScore = Math.min(
    100,
    (this.interactions.emails * 2) +
    (this.interactions.calls * 5) +
    (this.interactions.meetings * 10) +
    (this.interactions.whatsappMessages * 1)
  );
  
  return this.save();
};

contactSchema.methods.updateLeadScore = function(score) {
  this.leadScore = Math.max(0, Math.min(100, score));
  
  // Update lead quality based on score
  if (this.leadScore >= 75) {
    this.leadQuality = 'hot';
  } else if (this.leadScore >= 50) {
    this.leadQuality = 'warm';
  } else {
    this.leadQuality = 'cold';
  }
  
  return this.save();
};

// Static methods
contactSchema.statics.findByWorkspace = function(workspaceId, filters = {}) {
  const query = { workspace: workspaceId, isArchived: false, ...filters };
  return this.find(query).sort({ createdAt: -1 });
};

contactSchema.statics.findByOwner = function(userId, status = null) {
  const query = { owner: userId, isArchived: false };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

contactSchema.statics.findByCompany = function(companyId) {
  return this.find({
    company: companyId,
    isArchived: false,
  }).sort({ createdAt: -1 });
};

contactSchema.statics.findHotLeads = function(workspaceId) {
  return this.find({
    workspace: workspaceId,
    type: 'lead',
    leadQuality: 'hot',
    status: 'active',
    isArchived: false,
  }).sort({ leadScore: -1 });
};

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
