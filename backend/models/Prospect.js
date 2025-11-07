/**
 * Prospect Model - B2B Lead Database
 * 
 * Schema para almacenar prospectos B2B generados automáticamente
 * por el ProspectingAgent.
 */

const mongoose = require('mongoose');

const prospectSchema = new mongoose.Schema({
  // Basic Information
  business_name: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  
  business_type: {
    type: String,
    required: true,
    enum: [
      'travel_agency_receptive',
      'travel_agency_wholesale',
      'tour_operator',
      'airline_tour_operator',
      'cruise_tour_operator',
      'service_platform',
      'church_catholic',
      'church_evangelical',
      'church_assembly_god',
      'church_other',
      'tour_leader',
      'religious_leader',
      'university'
    ],
    index: true
  },
  
  // Location
  address: { type: String, trim: true },
  city: { type: String, required: true, index: true, trim: true },
  state_province: { type: String, trim: true },
  zip_code: { type: String, trim: true },
  country: { type: String, required: true, index: true, trim: true },
  country_code: { type: String, required: true, index: true, uppercase: true },
  
  // Contact Information
  email: {
    type: String,
    trim: true,
    lowercase: true,
    index: true,
    sparse: true
  },
  email_secondary: [{ type: String, trim: true, lowercase: true }],
  
  phone: { type: String, trim: true },
  phone_mobile: { type: String, trim: true },
  whatsapp: { type: String, trim: true },
  
  // Online Presence
  website: { type: String, trim: true, lowercase: true },
  facebook: { type: String, trim: true },
  instagram: { type: String, trim: true },
  linkedin: { type: String, trim: true },
  
  // Contact Person
  contact_person: { type: String, trim: true },
  position: { type: String, trim: true },
  
  // Business Details
  specialization: [{ type: String, trim: true }],
  target_markets: [{ type: String, trim: true }],
  group_size: { type: String, trim: true },
  annual_travelers: { type: Number },
  
  // Prospecting Metadata
  source: {
    type: String,
    required: true,
    enum: ['ai_search', 'pattern_generation', 'manual', 'import', 'referral']
  },
  search_query: { type: String },
  found_at: { type: Date, default: Date.now },
  
  // Data Quality
  enriched: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  verification: {
    email_valid: { type: Boolean },
    phone_valid: { type: Boolean },
    website_valid: { type: Boolean },
    address_complete: { type: Boolean },
    has_contact: { type: Boolean }
  },
  quality_score: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  
  // Lead Scoring
  lead_score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
    index: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['new', 'verified', 'needs_review', 'contacted', 'qualified', 'converted', 'rejected'],
    default: 'new',
    index: true
  },
  
  // Outreach Tracking
  outreach: {
    email_sent: { type: Boolean, default: false },
    email_sent_at: { type: Date },
    email_opened: { type: Boolean, default: false },
    email_clicked: { type: Boolean, default: false },
    
    whatsapp_sent: { type: Boolean, default: false },
    whatsapp_sent_at: { type: Date },
    whatsapp_replied: { type: Boolean, default: false },
    
    call_attempted: { type: Boolean, default: false },
    call_attempted_at: { type: Date },
    call_connected: { type: Boolean, default: false },
    
    response_received: { type: Boolean, default: false },
    response_date: { type: Date },
    interested: { type: Boolean, default: false }
  },
  
  // Campaign Assignment
  campaigns: [{
    campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
    assigned_at: { type: Date, default: Date.now }
  }],
  
  // Notes and Tags
  notes: [{ 
    content: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
  }],
  tags: [{ type: String, trim: true }],
  
  // Assignment
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assigned_at: { type: Date },
  
  // Duplicate Detection
  duplicate_found: { type: Boolean, default: false },
  merged_with: { type: mongoose.Schema.Types.ObjectId, ref: 'Prospect' },
  
  // Timestamps
  created_at: { type: Date, default: Date.now, index: true },
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for performance
prospectSchema.index({ business_name: 'text', city: 'text', business_type: 'text' });
prospectSchema.index({ country_code: 1, business_type: 1, status: 1 });
prospectSchema.index({ lead_score: -1, status: 1 });
prospectSchema.index({ email: 1 }, { sparse: true, unique: true });

// Virtual for full address
prospectSchema.virtual('full_address').get(function() {
  return `${this.address || ''}, ${this.city}, ${this.state_province || ''} ${this.zip_code || ''}, ${this.country}`.trim();
});

// Methods
prospectSchema.methods.addNote = function(content, userId) {
  this.notes.push({
    content,
    created_by: userId,
    created_at: new Date()
  });
  return this.save();
};

prospectSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  this.updated_at = new Date();
  return this.save();
};

prospectSchema.methods.recordEmailSent = function() {
  this.outreach.email_sent = true;
  this.outreach.email_sent_at = new Date();
  return this.save();
};

prospectSchema.methods.recordResponse = function(interested = false) {
  this.outreach.response_received = true;
  this.outreach.response_date = new Date();
  this.outreach.interested = interested;
  if (interested) {
    this.status = 'qualified';
  }
  return this.save();
};

// Statics
prospectSchema.statics.findByCountry = function(countryCode) {
  return this.find({ country_code: countryCode }).sort({ lead_score: -1 });
};

prospectSchema.statics.findByType = function(businessType) {
  return this.find({ business_type: businessType }).sort({ lead_score: -1 });
};

prospectSchema.statics.findHighQuality = function(minScore = 70) {
  return this.find({ lead_score: { $gte: minScore }, status: { $in: ['new', 'verified'] } })
    .sort({ lead_score: -1 });
};

prospectSchema.statics.getStatsByCountry = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$country_code',
        count: { $sum: 1 },
        avgScore: { $avg: '$lead_score' },
        country: { $first: '$country' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

prospectSchema.statics.getStatsByType = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$business_type',
        count: { $sum: 1 },
        avgScore: { $avg: '$lead_score' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

const Prospect = mongoose.model('Prospect', prospectSchema);

module.exports = Prospect;
