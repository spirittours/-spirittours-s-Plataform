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
  
  // B2B Integration Fields
  b2b: {
    // Es una reserva B2B (de otro operador o hacia otro operador)
    isB2B: { type: Boolean, default: false },
    
    // Tipo de relación B2B
    relationship: {
      type: String,
      enum: ['inbound', 'outbound', 'internal'], // inbound: compramos, outbound: vendemos
      default: 'inbound'
    },
    
    // Operador turístico asociado
    tourOperator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TourOperator'
    },
    
    // Localizador externo (del sistema del operador)
    externalLocator: {
      type: String,
      index: true
    },
    
    // RatePlanCode (específico de eJuniper y sistemas similares)
    ratePlanCode: String,
    
    // Sistema de origen
    sourceSystem: {
      type: String,
      enum: ['ejuniper', 'amadeus', 'sabre', 'hotelbeds', 'manual', 'other']
    },
    
    // Comisión
    commission: {
      type: { type: String, enum: ['percentage', 'fixed', 'none'], default: 'percentage' },
      value: { type: Number, default: 0 },
      amount: Number, // Monto calculado de comisión
      currency: { type: String, default: 'USD' }
    },
    
    // Precios detallados
    pricing: {
      netPrice: Number, // Precio neto (sin comisión)
      grossPrice: Number, // Precio bruto (con comisión)
      costPrice: Number, // Precio de costo (lo que pagamos al proveedor)
      sellingPrice: Number, // Precio de venta (lo que cobra el cliente)
      margin: Number, // Margen de ganancia
      taxes: Number,
      currency: { type: String, default: 'USD' }
    },
    
    // Estado de sincronización
    syncStatus: {
      lastSync: Date,
      syncErrors: Number,
      lastError: String,
      needsSync: { type: Boolean, default: false }
    },
    
    // Política de cancelación
    cancellationPolicy: {
      isRefundable: { type: Boolean, default: true },
      cancellationDeadline: Date,
      penaltyPercentage: Number,
      penaltyAmount: Number,
      terms: String
    },
    
    // Metadatos adicionales del sistema externo
    externalMetadata: mongoose.Schema.Types.Mixed
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for queries
bookingSchema.index({ status: 1, bookingDate: -1 });
bookingSchema.index({ 'customer.email': 1 });
bookingSchema.index({ startDate: 1 });

// B2B indexes
bookingSchema.index({ 'b2b.isB2B': 1, 'b2b.tourOperator': 1 });
bookingSchema.index({ 'b2b.externalLocator': 1 });
bookingSchema.index({ 'b2b.relationship': 1, status: 1 });

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
