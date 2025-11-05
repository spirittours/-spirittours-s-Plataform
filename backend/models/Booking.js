/**
 * Booking Model
 * 
 * Simplified booking model for integration with CRM Projects
 * Sprint 1.3 - Booking to Project Bridge
 */

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Basic Info
  bookingNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Customer
  customer: {
    firstName: String,
    lastName: String,
    email: { type: String, required: true },
    phone: String,
    company: String
  },
  
  // Trip Details
  destination: { type: String, required: true },
  tripType: {
    type: String,
    enum: ['leisure', 'business', 'group', 'adventure', 'luxury', 'wellness'],
    default: 'leisure'
  },
  
  // Dates
  bookingDate: { type: Date, default: Date.now },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  
  // Pricing
  totalPrice: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  deposit: Number,
  balanceDue: Number,
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending',
    index: true
  },
  
  // Details
  numberOfTravelers: { type: Number, default: 1 },
  itinerary: String,
  specialRequests: String,
  
  // Services Included
  services: [{
    type: { type: String }, // flight, hotel, tour, transport, etc
    name: String,
    provider: String,
    cost: Number
  }],
  
  // Documents
  documents: [{
    type: String, // voucher, invoice, itinerary, contract
    url: String,
    uploadedAt: Date
  }],
  
  // Integration
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact'
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for queries
bookingSchema.index({ status: 1, bookingDate: -1 });
bookingSchema.index({ 'customer.email': 1 });
bookingSchema.index({ startDate: 1 });

// Update timestamp on save
bookingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for duration
bookingSchema.virtual('duration').get(function() {
  if (!this.startDate || !this.endDate) return 0;
  const diff = this.endDate - this.startDate;
  return Math.ceil(diff / (1000 * 60 * 60 * 24)); // days
});

module.exports = mongoose.model('Booking', bookingSchema);
