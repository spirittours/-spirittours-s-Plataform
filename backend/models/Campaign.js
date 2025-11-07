/**
 * Campaign Model - Outreach Campaign Management
 * 
 * Schema para gestionar campañas de contacto automatizado
 */

const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    trim: true
  },
  
  // Target criteria
  targetCountries: [{ type: String, uppercase: true }],
  targetTypes: [{ type: String }],
  minLeadScore: { type: Number, default: 50 },
  
  // Campaign settings
  channels: [{
    type: String,
    enum: ['email', 'whatsapp', 'call']
  }],
  
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  
  // Message content
  message: {
    subject: { type: String },
    body: { type: String },
    template: { type: String }
  },
  
  // Assigned prospects
  prospects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prospect'
  }],
  
  // Campaign status
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Statistics
  stats: {
    totalProspects: { type: Number, default: 0 },
    contacted: { type: Number, default: 0 },
    responded: { type: Number, default: 0 },
    converted: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 }
  },
  
  // Campaign owner
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Timestamps
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
campaignSchema.index({ status: 1, startDate: 1 });
campaignSchema.index({ created_by: 1 });

// Virtuals
campaignSchema.virtual('conversionRate').get(function() {
  if (this.stats.contacted === 0) return 0;
  return (this.stats.converted / this.stats.contacted * 100).toFixed(2);
});

// Methods
campaignSchema.methods.updateStats = async function() {
  const Prospect = mongoose.model('Prospect');
  
  const prospects = await Prospect.find({
    'campaigns.campaign_id': this._id
  });
  
  this.stats.totalProspects = prospects.length;
  this.stats.contacted = prospects.filter(p => 
    p.outreach.email_sent || p.outreach.whatsapp_sent || p.outreach.call_attempted
  ).length;
  this.stats.responded = prospects.filter(p => p.outreach.response_received).length;
  this.stats.converted = prospects.filter(p => p.outreach.interested).length;
  
  return this.save();
};

campaignSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

campaignSchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

campaignSchema.methods.complete = function() {
  this.status = 'completed';
  this.endDate = new Date();
  return this.save();
};

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
