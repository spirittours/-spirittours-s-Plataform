/**
 * Travel Agency Model
 * 
 * Stores travel agency contact information, prospecting data,
 * and client relationship status for email campaigns.
 */

const mongoose = require('mongoose');

const travelAgencySchema = new mongoose.Schema({
  // Basic information
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  
  legalName: String,
  
  // Contact information
  emails: [{
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['general', 'sales', 'support', 'owner', 'manager', 'other'],
      default: 'general',
    },
    verified: {
      type: Boolean,
      default: false,
    },
    deliverable: {
      type: Boolean,
      default: false,
    },
    bounced: {
      type: Boolean,
      default: false,
    },
    lastValidated: Date,
    primary: {
      type: Boolean,
      default: false,
    },
  }],
  
  phones: [{
    number: String,
    countryCode: String,
    type: {
      type: String,
      enum: ['office', 'mobile', 'fax', 'other'],
      default: 'office',
    },
    verified: Boolean,
    primary: Boolean,
  }],
  
  website: {
    type: String,
    lowercase: true,
    trim: true,
  },
  
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    linkedin: String,
  },
  
  // Address
  address: {
    street: String,
    city: {
      type: String,
      required: true,
      index: true,
    },
    state: String,
    postalCode: String,
    country: {
      type: String,
      required: true,
      index: true,
    },
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  
  // Business details
  businessType: {
    type: String,
    enum: ['retail', 'online', 'hybrid', 'corporate', 'wholesale'],
  },
  
  specialties: [{
    type: String,
    enum: [
      'adventure',
      'luxury',
      'family',
      'couples',
      'group',
      'eco-tourism',
      'cultural',
      'beach',
      'mountain',
      'city',
      'cruise',
      'safari',
      'wellness',
      'food-wine',
      'business-travel',
      'destination-weddings',
      'student-travel',
    ],
  }],
  
  languages: [String], // Languages spoken
  
  employeeCount: Number,
  
  annualRevenue: Number,
  
  establishedYear: Number,
  
  // Certifications
  certifications: [{
    name: String,
    issuedBy: String,
    validUntil: Date,
  }],
  
  // Client status
  clientStatus: {
    isClient: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    clientSince: Date,
    
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
    },
    
    accountManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Financial metrics
    monthlyTransactions: {
      type: Number,
      default: 0,
    },
    
    totalRevenue: {
      type: Number,
      default: 0,
    },
    
    lastTransactionDate: Date,
    
    // Commission
    customCommissionRate: Number, // Override default
    
    paymentTerms: {
      type: String,
      enum: ['immediate', 'net-15', 'net-30', 'net-60'],
      default: 'net-30',
    },
  },
  
  // Prospecting data
  prospecting: {
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'],
      default: 'new',
      index: true,
    },
    
    leadScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    
    source: {
      type: String,
      enum: [
        'google-maps',
        'government-directory',
        'association-fiavet',
        'association-aiav',
        'association-abav',
        'association-other',
        'website-scrape',
        'manual-entry',
        'referral',
        'other',
      ],
    },
    
    sourceUrl: String, // URL where data was found
    
    firstContactDate: Date,
    
    lastContactDate: Date,
    
    nextFollowupDate: Date,
    
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Campaign history
    campaigns: [{
      campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
      },
      sentAt: Date,
      opened: Boolean,
      clicked: Boolean,
      responded: Boolean,
    }],
    
    // Engagement score
    engagement: {
      emailsSent: {
        type: Number,
        default: 0,
      },
      emailsOpened: {
        type: Number,
        default: 0,
      },
      emailsClicked: {
        type: Number,
        default: 0,
      },
      lastEngagement: Date,
      engagementRate: {
        type: Number,
        default: 0,
      },
    },
    
    notes: String,
  },
  
  // Email preferences
  emailPreferences: {
    subscribed: {
      type: Boolean,
      default: true,
    },
    
    unsubscribedAt: Date,
    
    unsubscribeReason: String,
    
    categories: [{
      type: String,
      enum: ['promotions', 'newsletters', 'updates', 'announcements'],
      default: 'all',
    }],
    
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'as-needed'],
      default: 'as-needed',
    },
    
    language: {
      type: String,
      enum: ['es', 'en', 'pt', 'fr'],
      default: 'es',
    },
  },
  
  // Data quality
  dataQuality: {
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    
    lastVerified: Date,
    
    needsUpdate: {
      type: Boolean,
      default: false,
    },
    
    issues: [String], // Missing phone, invalid email, etc.
  },
  
  // Scraping metadata
  scraping: {
    lastScraped: Date,
    
    scrapedEmails: {
      type: Number,
      default: 0,
    },
    
    websiteReachable: Boolean,
    
    lastWebsiteCheck: Date,
  },
  
  // Duplicates tracking
  duplicates: [{
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TravelAgency',
    },
    similarity: Number, // 0-100
    fields: [String], // Which fields match
  }],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted', 'duplicate'],
    default: 'active',
    index: true,
  },
  
  // Tags
  tags: [String],
  
  // Notes
  notes: String,
  
}, {
  timestamps: true,
});

// Compound indexes
travelAgencySchema.index({ 'address.city': 1, 'address.country': 1 });
travelAgencySchema.index({ 'clientStatus.isClient': 1, 'clientStatus.tier': 1 });
travelAgencySchema.index({ 'prospecting.status': 1, 'prospecting.leadScore': -1 });
travelAgencySchema.index({ 'prospecting.nextFollowupDate': 1, status: 1 });
travelAgencySchema.index({ name: 'text', 'address.city': 'text', 'address.country': 'text' });

// Virtual for primary email
travelAgencySchema.virtual('primaryEmail').get(function() {
  const primary = this.emails.find(e => e.primary);
  return primary ? primary.email : (this.emails.length > 0 ? this.emails[0].email : null);
});

travelAgencySchema.virtual('primaryPhone').get(function() {
  const primary = this.phones.find(p => p.primary);
  return primary ? primary.number : (this.phones.length > 0 ? this.phones[0].number : null);
});

// Methods
travelAgencySchema.methods.addEmail = function(emailData) {
  const exists = this.emails.some(e => e.email === emailData.email);
  if (!exists) {
    // If this is the first email, make it primary
    if (this.emails.length === 0) {
      emailData.primary = true;
    }
    this.emails.push(emailData);
  }
  return this.save();
};

travelAgencySchema.methods.markEmailBounced = function(email) {
  const emailObj = this.emails.find(e => e.email === email);
  if (emailObj) {
    emailObj.bounced = true;
    emailObj.deliverable = false;
    return this.save();
  }
};

travelAgencySchema.methods.verifyEmail = function(email, deliverable = true) {
  const emailObj = this.emails.find(e => e.email === email);
  if (emailObj) {
    emailObj.verified = true;
    emailObj.deliverable = deliverable;
    emailObj.lastValidated = new Date();
    return this.save();
  }
};

travelAgencySchema.methods.calculateLeadScore = function() {
  let score = 0;
  
  // Data completeness (30 points)
  if (this.emails.length > 0) score += 10;
  if (this.phones.length > 0) score += 5;
  if (this.website) score += 5;
  if (this.address.street) score += 5;
  if (this.specialties.length > 0) score += 5;
  
  // Data quality (20 points)
  if (this.emails.some(e => e.verified)) score += 10;
  if (this.dataQuality.score >= 80) score += 10;
  
  // Engagement (30 points)
  const engagementRate = this.prospecting.engagement.engagementRate;
  score += Math.min(engagementRate * 0.3, 30);
  
  // Business size (20 points)
  if (this.employeeCount >= 50) score += 10;
  else if (this.employeeCount >= 10) score += 5;
  
  if (this.annualRevenue >= 1000000) score += 10;
  else if (this.annualRevenue >= 500000) score += 5;
  
  this.prospecting.leadScore = Math.min(Math.round(score), 100);
  return this.save();
};

travelAgencySchema.methods.updateEngagement = function(opened = false, clicked = false) {
  this.prospecting.engagement.emailsSent += 1;
  if (opened) {
    this.prospecting.engagement.emailsOpened += 1;
  }
  if (clicked) {
    this.prospecting.engagement.emailsClicked += 1;
  }
  
  // Calculate engagement rate
  const total = this.prospecting.engagement.emailsSent;
  const engaged = this.prospecting.engagement.emailsOpened;
  this.prospecting.engagement.engagementRate = total > 0 ? (engaged / total * 100).toFixed(2) : 0;
  
  if (opened || clicked) {
    this.prospecting.engagement.lastEngagement = new Date();
  }
  
  return this.save();
};

travelAgencySchema.methods.convertToClient = function(tier = 'bronze', accountManager = null) {
  this.clientStatus.isClient = true;
  this.clientStatus.clientSince = new Date();
  this.clientStatus.tier = tier;
  this.clientStatus.accountManager = accountManager;
  this.prospecting.status = 'closed-won';
  
  return this.save();
};

// Static methods
travelAgencySchema.statics.findByCountry = function(country, options = {}) {
  const { clientStatus, limit = 100 } = options;
  const query = { 'address.country': country, status: 'active' };
  
  if (clientStatus !== undefined) {
    query['clientStatus.isClient'] = clientStatus;
  }
  
  return this.find(query)
    .sort({ 'prospecting.leadScore': -1 })
    .limit(limit);
};

travelAgencySchema.statics.findByCity = function(city, country) {
  return this.find({
    'address.city': city,
    'address.country': country,
    status: 'active',
  }).sort({ 'prospecting.leadScore': -1 });
};

travelAgencySchema.statics.findClients = function(options = {}) {
  const { tier, limit = 100 } = options;
  const query = { 'clientStatus.isClient': true, status: 'active' };
  
  if (tier) query['clientStatus.tier'] = tier;
  
  return this.find(query)
    .sort({ 'clientStatus.totalRevenue': -1 })
    .limit(limit)
    .populate('clientStatus.accountManager', 'name email');
};

travelAgencySchema.statics.findProspects = function(options = {}) {
  const { status, minLeadScore = 0, limit = 100 } = options;
  const query = {
    'clientStatus.isClient': false,
    status: 'active',
    'prospecting.leadScore': { $gte: minLeadScore },
  };
  
  if (status) query['prospecting.status'] = status;
  
  return this.find(query)
    .sort({ 'prospecting.leadScore': -1 })
    .limit(limit);
};

travelAgencySchema.statics.findForFollowup = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.find({
    status: 'active',
    'clientStatus.isClient': false,
    'prospecting.nextFollowupDate': {
      $lte: today,
    },
  })
  .sort({ 'prospecting.nextFollowupDate': 1 })
  .populate('prospecting.assignedTo', 'name email');
};

travelAgencySchema.statics.findHighEngagement = function(minRate = 50, limit = 100) {
  return this.find({
    status: 'active',
    'prospecting.engagement.engagementRate': { $gte: minRate },
  })
  .sort({ 'prospecting.engagement.engagementRate': -1 })
  .limit(limit);
};

travelAgencySchema.statics.findDuplicates = async function(agency) {
  const duplicates = [];
  
  // Find by exact email match
  if (agency.emails.length > 0) {
    const emailMatches = await this.find({
      _id: { $ne: agency._id },
      'emails.email': { $in: agency.emails.map(e => e.email) },
    });
    duplicates.push(...emailMatches);
  }
  
  // Find by similar name and location
  const nameMatches = await this.find({
    _id: { $ne: agency._id },
    name: { $regex: new RegExp(agency.name, 'i') },
    'address.city': agency.address.city,
    'address.country': agency.address.country,
  });
  duplicates.push(...nameMatches);
  
  // Remove duplicates from array
  const unique = [...new Map(duplicates.map(item => [item._id.toString(), item])).values()];
  
  return unique;
};

module.exports = mongoose.model('TravelAgency', travelAgencySchema);
