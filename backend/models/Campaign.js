/**
 * Campaign Model
 * 
 * Manages email campaigns for travel agency prospecting and retention.
 * Supports segmentation, scheduling, and A/B testing.
 */

const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  // Basic information
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
  
  // Campaign type
  type: {
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
    required: true,
    index: true,
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'],
    default: 'draft',
    required: true,
    index: true,
  },
  
  // Target audience
  targetAudience: {
    type: String,
    enum: ['prospects', 'clients', 'all', 'custom'],
    required: true,
  },
  
  // Segmentation filters
  filters: {
    // Geographic
    countries: [String],
    cities: [String],
    
    // Agency characteristics
    clientStatus: {
      type: String,
      enum: ['client', 'prospect', 'both'],
      default: 'both',
    },
    
    leadScore: {
      min: Number,
      max: Number,
    },
    
    specialties: [String],
    
    // Previous engagement
    hasOpenedPrevious: Boolean,
    hasClickedPrevious: Boolean,
    lastContactedDays: Number, // Days since last contact
    
    // Custom filters
    custom: mongoose.Schema.Types.Mixed,
  },
  
  // Recipients
  recipients: {
    total: {
      type: Number,
      default: 0,
    },
    
    // Dynamically calculated or manually uploaded
    agencies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TravelAgency',
    }],
    
    // Manual email list
    manualEmails: [{
      email: String,
      name: String,
    }],
  },
  
  // Email content
  email: {
    // Single email or A/B test variants
    variants: [{
      name: String, // "Variant A", "Variant B", etc.
      subject: String,
      preheader: String,
      html: String,
      text: String,
      template: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmailTemplate',
      },
      percentage: {
        type: Number,
        default: 100, // % of recipients to receive this variant
      },
    }],
    
    // Winner selection for A/B test
    winningVariant: {
      type: Number, // Index in variants array
    },
    
    winnerCriteria: {
      type: String,
      enum: ['open_rate', 'click_rate', 'conversion_rate'],
      default: 'open_rate',
    },
    
    // Common settings
    fromName: {
      type: String,
      default: 'Spirit Tours',
    },
    
    fromEmail: {
      type: String,
      default: 'partnerships@spirittours.com',
    },
    
    replyTo: String,
  },
  
  // Sending configuration
  sending: {
    provider: {
      type: String,
      enum: ['smtp', 'sendgrid'],
      default: 'smtp',
    },
    
    // Rate limiting
    rateLimit: {
      perMinute: {
        type: Number,
        default: 10,
      },
      perHour: {
        type: Number,
        default: 50,
      },
      perDay: {
        type: Number,
        default: 500,
      },
      delayBetweenEmails: {
        type: Number,
        default: 6000, // ms
      },
    },
    
    // Scheduling
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,
    
    // Time windows (e.g., only send Mon-Fri 9am-5pm)
    timeWindows: [{
      daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
      startHour: Number, // 0-23
      endHour: Number, // 0-23
      timezone: String, // 'America/New_York'
    }],
  },
  
  // Analytics
  analytics: {
    sent: {
      type: Number,
      default: 0,
    },
    
    delivered: {
      type: Number,
      default: 0,
    },
    
    bounced: {
      type: Number,
      default: 0,
    },
    
    opened: {
      type: Number,
      default: 0,
    },
    
    clicked: {
      type: Number,
      default: 0,
    },
    
    failed: {
      type: Number,
      default: 0,
    },
    
    unsubscribed: {
      type: Number,
      default: 0,
    },
    
    // Rates
    deliveryRate: {
      type: Number,
      default: 0,
    },
    
    openRate: {
      type: Number,
      default: 0,
    },
    
    clickRate: {
      type: Number,
      default: 0,
    },
    
    bounceRate: {
      type: Number,
      default: 0,
    },
    
    // Revenue (if tracking conversions)
    conversions: {
      type: Number,
      default: 0,
    },
    
    revenue: {
      type: Number,
      default: 0,
    },
  },
  
  // AI generation
  aiGenerated: {
    type: Boolean,
    default: false,
  },
  
  aiMetadata: {
    model: String,
    generatedAt: Date,
    totalTokens: Number,
    totalCost: Number,
  },
  
  // Approval workflow
  requiresApproval: {
    type: Boolean,
    default: true,
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  approvedAt: Date,
  
  // Creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Tags
  tags: [String],
  
  // Notes
  notes: String,
  
}, {
  timestamps: true,
});

// Indexes
campaignSchema.index({ name: 'text', description: 'text' });
campaignSchema.index({ status: 1, 'sending.scheduledAt': 1 });
campaignSchema.index({ type: 1, status: 1 });
campaignSchema.index({ createdBy: 1, createdAt: -1 });

// Virtual for progress percentage
campaignSchema.virtual('progress').get(function() {
  if (this.recipients.total === 0) return 0;
  return Math.round((this.analytics.sent / this.recipients.total) * 100);
});

// Methods
campaignSchema.methods.updateAnalytics = async function() {
  const EmailLog = mongoose.model('EmailLog');
  
  const stats = await EmailLog.aggregate([
    { $match: { campaign: this._id } },
    {
      $group: {
        _id: null,
        sent: { $sum: 1 },
        delivered: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        },
        bounced: {
          $sum: { $cond: ['$bounced', 1, 0] }
        },
        opened: {
          $sum: { $cond: ['$analytics.opened', 1, 0] }
        },
        clicked: {
          $sum: { $cond: ['$analytics.clicked', 1, 0] }
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        unsubscribed: {
          $sum: { $cond: ['$unsubscribed', 1, 0] }
        },
      }
    }
  ]);
  
  if (stats.length > 0) {
    const data = stats[0];
    
    this.analytics.sent = data.sent;
    this.analytics.delivered = data.delivered;
    this.analytics.bounced = data.bounced;
    this.analytics.opened = data.opened;
    this.analytics.clicked = data.clicked;
    this.analytics.failed = data.failed;
    this.analytics.unsubscribed = data.unsubscribed;
    
    // Calculate rates
    if (data.sent > 0) {
      this.analytics.deliveryRate = (data.delivered / data.sent * 100).toFixed(2);
      this.analytics.bounceRate = (data.bounced / data.sent * 100).toFixed(2);
    }
    
    if (data.delivered > 0) {
      this.analytics.openRate = (data.opened / data.delivered * 100).toFixed(2);
    }
    
    if (data.opened > 0) {
      this.analytics.clickRate = (data.clicked / data.opened * 100).toFixed(2);
    }
    
    await this.save();
  }
  
  return this.analytics;
};

campaignSchema.methods.start = async function() {
  if (this.status !== 'scheduled') {
    throw new Error('Campaign must be scheduled before starting');
  }
  
  this.status = 'running';
  this.sending.startedAt = new Date();
  await this.save();
  
  return this;
};

campaignSchema.methods.pause = async function() {
  if (this.status !== 'running') {
    throw new Error('Only running campaigns can be paused');
  }
  
  this.status = 'paused';
  await this.save();
  
  return this;
};

campaignSchema.methods.resume = async function() {
  if (this.status !== 'paused') {
    throw new Error('Only paused campaigns can be resumed');
  }
  
  this.status = 'running';
  await this.save();
  
  return this;
};

campaignSchema.methods.complete = async function() {
  this.status = 'completed';
  this.sending.completedAt = new Date();
  await this.updateAnalytics();
  await this.save();
  
  return this;
};

campaignSchema.methods.selectWinningVariant = async function() {
  if (this.email.variants.length <= 1) {
    throw new Error('A/B testing requires at least 2 variants');
  }
  
  const EmailLog = mongoose.model('EmailLog');
  
  // Get performance for each variant
  const variantPerformance = await Promise.all(
    this.email.variants.map(async (variant, index) => {
      const stats = await EmailLog.aggregate([
        {
          $match: {
            campaign: this._id,
            subject: variant.subject,
          }
        },
        {
          $group: {
            _id: null,
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            opened: { $sum: { $cond: ['$analytics.opened', 1, 0] } },
            clicked: { $sum: { $cond: ['$analytics.clicked', 1, 0] } },
          }
        }
      ]);
      
      if (stats.length === 0) {
        return { index, score: 0 };
      }
      
      const data = stats[0];
      let score = 0;
      
      if (this.email.winnerCriteria === 'open_rate') {
        score = data.delivered > 0 ? (data.opened / data.delivered * 100) : 0;
      } else if (this.email.winnerCriteria === 'click_rate') {
        score = data.opened > 0 ? (data.clicked / data.opened * 100) : 0;
      }
      
      return { index, score };
    })
  );
  
  // Find variant with highest score
  const winner = variantPerformance.reduce((best, current) => 
    current.score > best.score ? current : best
  );
  
  this.email.winningVariant = winner.index;
  await this.save();
  
  return {
    winnerIndex: winner.index,
    winnerName: this.email.variants[winner.index].name,
    score: winner.score,
    allVariants: variantPerformance,
  };
};

// Static methods
campaignSchema.statics.findScheduledToRun = function() {
  const now = new Date();
  
  return this.find({
    status: 'scheduled',
    'sending.scheduledAt': { $lte: now },
  }).sort({ 'sending.scheduledAt': 1 });
};

campaignSchema.statics.findRunning = function() {
  return this.find({
    status: 'running',
  }).sort({ 'sending.startedAt': -1 });
};

campaignSchema.statics.findByUser = function(userId, options = {}) {
  const { status, type, limit = 50 } = options;
  const query = { createdBy: userId };
  
  if (status) query.status = status;
  if (type) query.type = type;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

campaignSchema.statics.getOverallStats = async function(filters = {}) {
  const { startDate, endDate, type, createdBy } = filters;
  
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  if (type) matchStage.type = type;
  if (createdBy) matchStage.createdBy = createdBy;
  
  const results = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCampaigns: { $sum: 1 },
        totalSent: { $sum: '$analytics.sent' },
        totalDelivered: { $sum: '$analytics.delivered' },
        totalOpened: { $sum: '$analytics.opened' },
        totalClicked: { $sum: '$analytics.clicked' },
        totalBounced: { $sum: '$analytics.bounced' },
        avgOpenRate: { $avg: '$analytics.openRate' },
        avgClickRate: { $avg: '$analytics.clickRate' },
      }
    }
  ]);
  
  return results.length > 0 ? results[0] : {
    totalCampaigns: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalBounced: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
  };
};

module.exports = mongoose.model('Campaign', campaignSchema);
