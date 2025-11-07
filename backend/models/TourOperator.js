const mongoose = require('mongoose');

/**
 * TourOperator Model - Gestión de operadores turísticos B2B
 * Soporta múltiples sistemas: eJuniper, Amadeus, Sabre, TravelPort, sistemas propietarios
 * Permite integración bidireccional para comprar y vender servicios
 */
const tourOperatorSchema = new mongoose.Schema({
  // Información básica
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  
  type: {
    type: String,
    enum: ['receptive', 'wholesaler', 'dmc', 'bedbank', 'aggregator', 'direct_supplier'],
    required: true,
    index: true
  },
  
  // Información de contacto
  contact: {
    primaryEmail: { type: String, required: true },
    secondaryEmail: String,
    phone: String,
    whatsapp: String,
    website: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    }
  },
  
  // Relación comercial
  relationship: {
    type: String,
    enum: ['supplier', 'buyer', 'both'],
    required: true,
    default: 'both'
  },
  
  // Estado
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_approval'],
    default: 'pending_approval',
    index: true
  },
  
  // Sistema de reservas y configuración API
  apiSystem: {
    // Tipo de sistema
    type: {
      type: String,
      enum: ['ejuniper', 'amadeus', 'sabre', 'travelport', 'hotelbeds', 'beds24', 'xml_custom', 'rest_custom', 'soap_custom', 'webhook', 'manual'],
      required: true,
      index: true
    },
    
    // Versión de API
    version: String,
    
    // Credenciales (ENCRIPTADAS)
    credentials: {
      username: String,
      password: String,
      apiKey: String,
      apiSecret: String,
      clientId: String,
      accountId: String,
      agencyCode: String,
      accessToken: String,
      refreshToken: String,
      additionalParams: mongoose.Schema.Types.Mixed
    },
    
    // Endpoints
    endpoints: {
      production: String,
      sandbox: String,
      wsdl: String, // Para SOAP
      webhookUrl: String
    },
    
    // Configuración
    config: {
      environment: {
        type: String,
        enum: ['production', 'sandbox', 'test'],
        default: 'sandbox'
      },
      timeout: { type: Number, default: 30000 },
      retryAttempts: { type: Number, default: 3 },
      retryDelay: { type: Number, default: 1000 },
      rateLimitPerMinute: Number,
      
      // IP whitelisting (requerido por eJuniper)
      whitelistedIPs: [String],
      
      // Configuración específica del sistema
      systemSpecificConfig: mongoose.Schema.Types.Mixed
    },
    
    // Capabilities del sistema
    capabilities: {
      hotels: { type: Boolean, default: false },
      packages: { type: Boolean, default: false },
      flights: { type: Boolean, default: false },
      transfers: { type: Boolean, default: false },
      tours: { type: Boolean, default: false },
      tickets: { type: Boolean, default: false },
      insurance: { type: Boolean, default: false },
      carRental: { type: Boolean, default: false },
      cruises: { type: Boolean, default: false },
      
      // Funcionalidades avanzadas
      realTimeAvailability: { type: Boolean, default: false },
      instantConfirmation: { type: Boolean, default: false },
      cancellationManagement: { type: Boolean, default: false },
      modificationManagement: { type: Boolean, default: false },
      priceBreakdown: { type: Boolean, default: false },
      multiCurrency: { type: Boolean, default: false },
      dynamicPackaging: { type: Boolean, default: false }
    }
  },
  
  // Términos comerciales
  businessTerms: {
    // Modelo de comisión
    commissionModel: {
      type: String,
      enum: ['percentage', 'fixed', 'markup', 'net_rates', 'mixed'],
      default: 'percentage'
    },
    
    // Comisión por defecto
    defaultCommission: {
      value: { type: Number, default: 0 },
      type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' }
    },
    
    // Comisiones por servicio
    commissionByService: [{
      service: { type: String, enum: ['hotel', 'package', 'flight', 'transfer', 'tour', 'ticket', 'insurance', 'car', 'cruise'] },
      value: Number,
      type: { type: String, enum: ['percentage', 'fixed'] }
    }],
    
    // Términos de pago
    paymentTerms: {
      type: String,
      enum: ['prepaid', 'credit', 'net30', 'net60', 'custom'],
      default: 'prepaid'
    },
    
    creditLimit: Number,
    currency: { type: String, default: 'USD' },
    
    // Políticas de cancelación
    cancellationPolicies: [{
      serviceType: String,
      daysBeforeArrival: Number,
      penaltyPercentage: Number,
      penaltyFixed: Number
    }]
  },
  
  // Mapeo de datos
  dataMapping: {
    // Mapeo de códigos de hotel
    hotelCodeMapping: [{
      ourCode: String,
      theirCode: String,
      name: String
    }],
    
    // Mapeo de destinos
    destinationMapping: [{
      ourCode: String,
      theirCode: String,
      name: String
    }],
    
    // Mapeo de tipos de habitación
    roomTypeMapping: [{
      ourType: String,
      theirType: String,
      description: String
    }],
    
    // Mapeo de régimen alimenticio
    mealPlanMapping: [{
      ourPlan: String,
      theirPlan: String,
      description: String
    }]
  },
  
  // Estado de integración
  integrationStatus: {
    isConfigured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false },
    lastHealthCheck: Date,
    healthStatus: {
      type: String,
      enum: ['healthy', 'warning', 'error', 'unknown'],
      default: 'unknown'
    },
    lastSuccessfulConnection: Date,
    lastError: String,
    errorCount: { type: Number, default: 0 },
    
    // Estadísticas de sincronización
    syncStats: {
      lastSync: Date,
      totalBookings: { type: Number, default: 0 },
      successfulBookings: { type: Number, default: 0 },
      failedBookings: { type: Number, default: 0 },
      lastSyncDuration: Number // milliseconds
    }
  },
  
  // Productos disponibles
  availableProducts: [{
    type: { type: String, enum: ['hotel', 'package', 'flight', 'transfer', 'tour', 'ticket', 'insurance', 'car', 'cruise'] },
    productId: String, // ID interno del operador
    name: String,
    destination: String,
    description: String,
    category: String,
    isActive: { type: Boolean, default: true },
    lastUpdated: Date,
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // Configuración de webhooks
  webhooks: {
    enabled: { type: Boolean, default: false },
    events: [{
      event: {
        type: String,
        enum: ['booking_created', 'booking_confirmed', 'booking_modified', 'booking_cancelled', 'availability_updated', 'price_updated']
      },
      url: String,
      secret: String,
      isActive: Boolean
    }],
    
    // Para recibir notificaciones de ellos
    incomingWebhook: {
      enabled: { type: Boolean, default: false },
      secret: String,
      allowedIPs: [String]
    }
  },
  
  // Notas y documentación
  notes: String,
  internalNotes: String,
  
  // Documentos
  documents: [{
    type: { type: String, enum: ['contract', 'terms', 'api_docs', 'certification', 'insurance', 'other'] },
    name: String,
    url: String,
    uploadedAt: Date,
    expiresAt: Date
  }],
  
  // Gestión y auditoría
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Log de auditoría
  auditLog: [{
    action: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed,
    changes: mongoose.Schema.Types.Mixed
  }]
  
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // No exponer credenciales en JSON
      if (ret.apiSystem && ret.apiSystem.credentials) {
        delete ret.apiSystem.credentials;
      }
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Índices compuestos
tourOperatorSchema.index({ status: 1, 'apiSystem.type': 1 });
tourOperatorSchema.index({ type: 1, status: 1 });
tourOperatorSchema.index({ relationship: 1, status: 1 });
tourOperatorSchema.index({ 'integrationStatus.isActive': 1, 'integrationStatus.healthStatus': 1 });

// Virtual para determinar si necesita atención
tourOperatorSchema.virtual('needsAttention').get(function() {
  return (
    this.integrationStatus.isActive && 
    this.integrationStatus.healthStatus === 'error' ||
    this.integrationStatus.errorCount > 5 ||
    this.status === 'suspended'
  );
});

// Virtual para obtener servicios disponibles
tourOperatorSchema.virtual('availableServices').get(function() {
  const services = [];
  if (this.apiSystem.capabilities.hotels) services.push('hotels');
  if (this.apiSystem.capabilities.packages) services.push('packages');
  if (this.apiSystem.capabilities.flights) services.push('flights');
  if (this.apiSystem.capabilities.transfers) services.push('transfers');
  if (this.apiSystem.capabilities.tours) services.push('tours');
  if (this.apiSystem.capabilities.tickets) services.push('tickets');
  if (this.apiSystem.capabilities.insurance) services.push('insurance');
  if (this.apiSystem.capabilities.carRental) services.push('car_rental');
  if (this.apiSystem.capabilities.cruises) services.push('cruises');
  return services;
});

// Encriptar credenciales antes de guardar
tourOperatorSchema.pre('save', function(next) {
  if (this.isModified('apiSystem.credentials')) {
    const crypto = require('crypto');
    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      return next(new Error('ENCRYPTION_KEY must be set in environment variables'));
    }
    
    // Encriptar cada campo de credenciales
    const credentials = this.apiSystem.credentials;
    Object.keys(credentials).forEach(key => {
      if (credentials[key] && typeof credentials[key] === 'string' && !credentials[key].startsWith('enc:')) {
        credentials[key] = 'enc:' + this.encrypt(credentials[key], encryptionKey);
      }
    });
  }
  
  // Actualizar isConfigured
  this.integrationStatus.isConfigured = !!(
    this.apiSystem.credentials &&
    (this.apiSystem.credentials.apiKey || 
     this.apiSystem.credentials.username ||
     this.apiSystem.credentials.accessToken) &&
    (this.apiSystem.endpoints.production || this.apiSystem.endpoints.sandbox)
  );
  
  next();
});

// Método para encriptar (reutilizar de APIConfiguration)
tourOperatorSchema.methods.encrypt = function(text, key) {
  const crypto = require('crypto');
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16);
  const keyHash = crypto.createHash('sha256').update(String(key)).digest('base64').substr(0, 32);
  const cipher = crypto.createCipheriv(algorithm, keyHash, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// Método para desencriptar
tourOperatorSchema.methods.decrypt = function(text, key) {
  if (!text || !text.startsWith('enc:')) {
    return text;
  }
  
  const crypto = require('crypto');
  text = text.substring(4); // Remover 'enc:' prefix
  
  const algorithm = 'aes-256-cbc';
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const keyHash = crypto.createHash('sha256').update(String(key)).digest('base64').substr(0, 32);
  const decipher = crypto.createDecipheriv(algorithm, keyHash, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

// Método para obtener credenciales desencriptadas
tourOperatorSchema.methods.getDecryptedCredentials = function() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const credentials = this.apiSystem.credentials || {};
  
  const decrypted = {};
  Object.keys(credentials).forEach(key => {
    if (typeof credentials[key] === 'string') {
      decrypted[key] = this.decrypt(credentials[key], encryptionKey);
    } else {
      decrypted[key] = credentials[key];
    }
  });
  
  return decrypted;
};

// Método para añadir entrada de auditoría
tourOperatorSchema.methods.addAuditLog = function(action, userId, details = {}, changes = {}) {
  this.auditLog.push({
    action,
    performedBy: userId,
    timestamp: new Date(),
    details,
    changes
  });
  
  // Limitar a últimas 100 entradas
  if (this.auditLog.length > 100) {
    this.auditLog = this.auditLog.slice(-100);
  }
  
  return this.save();
};

// Método para actualizar estado de salud
tourOperatorSchema.methods.updateHealthStatus = function(status, errorMessage = '') {
  this.integrationStatus.lastHealthCheck = new Date();
  this.integrationStatus.healthStatus = status;
  
  if (status === 'error') {
    this.integrationStatus.errorCount += 1;
    this.integrationStatus.lastError = errorMessage;
  } else if (status === 'healthy') {
    this.integrationStatus.errorCount = 0;
    this.integrationStatus.lastSuccessfulConnection = new Date();
    this.integrationStatus.lastError = '';
  }
  
  return this.save();
};

// Método para activar operador
tourOperatorSchema.methods.activate = function(userId) {
  this.status = 'active';
  this.integrationStatus.isActive = true;
  return this.addAuditLog('activated', userId);
};

// Método para desactivar operador
tourOperatorSchema.methods.deactivate = function(userId, reason = '') {
  this.status = 'inactive';
  this.integrationStatus.isActive = false;
  return this.addAuditLog('deactivated', userId, { reason });
};

// Método para actualizar estadísticas de sincronización
tourOperatorSchema.methods.updateSyncStats = function(success, duration) {
  this.integrationStatus.syncStats.lastSync = new Date();
  this.integrationStatus.syncStats.lastSyncDuration = duration;
  this.integrationStatus.syncStats.totalBookings += 1;
  
  if (success) {
    this.integrationStatus.syncStats.successfulBookings += 1;
  } else {
    this.integrationStatus.syncStats.failedBookings += 1;
  }
  
  return this.save();
};

// Métodos estáticos
tourOperatorSchema.statics.findBySystemType = function(systemType) {
  return this.find({ 
    'apiSystem.type': systemType,
    status: 'active'
  }).sort({ name: 1 });
};

tourOperatorSchema.statics.findActive = function() {
  return this.find({ 
    status: 'active',
    'integrationStatus.isActive': true
  }).sort({ name: 1 });
};

tourOperatorSchema.statics.findByRelationship = function(relationship) {
  return this.find({
    $or: [
      { relationship: relationship },
      { relationship: 'both' }
    ],
    status: 'active'
  }).sort({ name: 1 });
};

tourOperatorSchema.statics.findSuppliers = function() {
  return this.findByRelationship('supplier');
};

tourOperatorSchema.statics.findBuyers = function() {
  return this.findByRelationship('buyer');
};

tourOperatorSchema.statics.findWithHealthIssues = function() {
  return this.find({
    'integrationStatus.isActive': true,
    $or: [
      { 'integrationStatus.healthStatus': 'error' },
      { 'integrationStatus.errorCount': { $gte: 5 } }
    ]
  }).sort({ 'integrationStatus.errorCount': -1 });
};

const TourOperator = mongoose.model('TourOperator', tourOperatorSchema);

module.exports = TourOperator;
