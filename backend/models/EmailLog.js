/**
 * Email Log Model
 * 
 * Tracks all sent emails for audit, analytics, and compliance.
 * Stores delivery status, opens, clicks, and bounces.
 */

const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  // Recipient
  to: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  
  toName: {
    type: String,
    trim: true,
  },
  
  // Agency reference
  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TravelAgency',
    index: true,
  },
  
  // Email content
  subject: {
    type: String,
    required: true,
  },
  
  preheader: String,
  
  html: {
    type: String,
    required: true,
  },
  
  text: String,
  
  // Campaign reference
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    index: true,
  },
  
  campaignType: {
    type: String,
    enum: [
      'prospect_intro',
      'prospect_followup',
      'client_update',
      'client_promotion',
      'client_newsletter',
      'seasonal_campaign',
      'custom',
    ],
    index: true,
  },
  
  // Template used
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate',
  },
  
  // Sending details
  provider: {
    type: String,
    enum: ['smtp', 'sendgrid'],
    required: true,
  },
  
  messageId: {
    type: String,
    index: true,
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['queued', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'complained'],
    default: 'queued',
    required: true,
    index: true,
  },
  
  sentAt: {
    type: Date,
    index: true,
  },
  
  deliveredAt: Date,
  
  // Errors
  error: {
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed,
  },
  
  // Bounce information
  bounced: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  bounceType: {
    type: String,
    enum: ['hard', 'soft', 'complaint'],
  },
  
  bounceReason: String,
  
  bouncedAt: Date,
  
  // Analytics
  analytics: {
    opened: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    openedAt: Date,
    
    openCount: {
      type: Number,
      default: 0,
    },
    
    clicked: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    clickedAt: Date,
    
    clickCount: {
      type: Number,
      default: 0,
    },
    
    // Clicked links
    links: [{
      url: String,
      clickedAt: Date,
      count: Number,
    }],
    
    // Device/browser info from opens
    userAgent: String,
    ipAddress: String,
    
    // Calculated rates (for learning)
    openRate: Number,
    clickRate: Number,
    conversionRate: Number,
  },
  
  // Approval tracking
  approved: {
    type: Boolean,
    default: false,
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  approvedAt: Date,
  
  // AI generation metadata
  aiGenerated: {
    type: Boolean,
    default: false,
  },
  
  aiMetadata: {
    model: String,
    generatedAt: Date,
    variationIndex: Number,
    tokens: Number,
    cost: Number,
  },
  
  // Personalization variables used
  variables: {
    type: mongoose.Schema.Types.Mixed,
  },
  
  // Retry information
  retryCount: {
    type: Number,
    default: 0,
  },
  
  retryAt: Date,
  
  // Unsubscribe
  unsubscribed: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  unsubscribedAt: Date,
  
  // Tags
  tags: [String],
  
}, {
  timestamps: true,
});

// Compound indexes
emailLogSchema.index({ to: 1, sentAt: -1 });
emailLogSchema.index({ campaign: 1, status: 1 });
emailLogSchema.index({ status: 1, sentAt: -1 });
emailLogSchema.index({ 'analytics.opened': 1, 'analytics.clicked': 1 });
emailLogSchema.index({ createdAt: -1 });

// Methods
emailLogSchema.methods.markAsOpened = function(userAgent, ipAddress) {
  if (!this.analytics.opened) {
    this.analytics.opened = true;
    this.analytics.openedAt = new Date();
    this.analytics.userAgent = userAgent;
    this.analytics.ipAddress = ipAddress;
  }
  this.analytics.openCount += 1;
  return this.save();
};

emailLogSchema.methods.markAsClicked = function(url) {
  if (!this.analytics.clicked) {
    this.analytics.clicked = true;
    this.analytics.clickedAt = new Date();
  }
  this.analytics.clickCount += 1;
  
  // Track specific link
  const linkIndex = this.analytics.links.findIndex(l => l.url === url);
  if (linkIndex >= 0) {
    this.analytics.links[linkIndex].count += 1;
    this.analytics.links[linkIndex].clickedAt = new Date();
  } else {
    this.analytics.links.push({
      url,
      clickedAt: new Date(),
      count: 1,
    });
  }
  
  return this.save();
};

emailLogSchema.methods.markAsBounced = function(bounceType, reason) {
  this.status = 'bounced';
  this.bounced = true;
  this.bounceType = bounceType;
  this.bounceReason = reason;
  this.bouncedAt = new Date();
  return this.save();
};

emailLogSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

emailLogSchema.methods.markAsFailed = function(error) {
  this.status = 'failed';
  this.error = {
    code: error.code || 'UNKNOWN',
    message: error.message,
    details: error.details || {},
  };
  return this.save();
};

// Static methods
emailLogSchema.statics.findByAgency = function(agencyId, options = {}) {
  const { limit = 50, status, campaignType } = options;
  const query = { agency: agencyId };
  
  if (status) query.status = status;
  if (campaignType) query.campaignType = campaignType;
  
  return this.find(query)
    .sort({ sentAt: -1 })
    .limit(limit)
    .populate('template', 'name category')
    .populate('campaign', 'name');
};

emailLogSchema.statics.findByCampaign = function(campaignId) {
  return this.find({ campaign: campaignId })
    .sort({ sentAt: -1 })
    .populate('agency', 'name email');
};

emailLogSchema.statics.getAnalytics = async function(filters = {}) {
  const { startDate, endDate, campaignType, provider } = filters;
  
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.sentAt = {};
    if (startDate) matchStage.sentAt.$gte = new Date(startDate);
    if (endDate) matchStage.sentAt.$lte = new Date(endDate);
  }
  if (campaignType) matchStage.campaignType = campaignType;
  if (provider) matchStage.provider = provider;
  
  const results = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSent: { $sum: 1 },
        totalDelivered: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        totalBounced: {
          $sum: { $cond: ['$bounced', 1, 0] }
        },
        totalOpened: {
          $sum: { $cond: ['$analytics.opened', 1, 0] }
        },
        totalClicked: {
          $sum: { $cond: ['$analytics.clicked', 1, 0] }
        },
        totalFailed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        avgOpenRate: { $avg: '$analytics.openRate' },
        avgClickRate: { $avg: '$analytics.clickRate' },
      }
    }
  ]);
  
  if (results.length === 0) {
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalBounced: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalFailed: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
    };
  }
  
  const stats = results[0];
  return {
    totalSent: stats.totalSent,
    totalDelivered: stats.totalDelivered,
    totalBounced: stats.totalBounced,
    totalOpened: stats.totalOpened,
    totalClicked: stats.totalClicked,
    totalFailed: stats.totalFailed,
    deliveryRate: (stats.totalDelivered / stats.totalSent * 100).toFixed(2),
    openRate: (stats.totalOpened / stats.totalDelivered * 100).toFixed(2),
    clickRate: (stats.totalClicked / stats.totalOpened * 100).toFixed(2),
    bounceRate: (stats.totalBounced / stats.totalSent * 100).toFixed(2),
  };
};

emailLogSchema.statics.findPendingApproval = function() {
  return this.find({
    approved: false,
    status: 'queued',
  })
  .sort({ createdAt: -1 })
  .populate('agency', 'name email city country')
  .populate('template', 'name category');
};

emailLogSchema.statics.findHighPerforming = function(limit = 20) {
  return this.find({
    status: 'delivered',
    'analytics.opened': true,
    'analytics.clicked': true,
    approved: true,
  })
  .sort({ 'analytics.clickRate': -1 })
  .limit(limit)
  .select('subject html analytics campaignType');
};

module.exports = mongoose.model('EmailLog', emailLogSchema);
