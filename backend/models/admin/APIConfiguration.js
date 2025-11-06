const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * APIConfiguration Model - Gestión centralizada de API Keys
 * Almacena credenciales de todas las integraciones de forma segura
 * Incluye health checks y monitoreo de estado
 */
const apiConfigurationSchema = new mongoose.Schema({
  // Nombre del servicio
  service: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
    enum: [
      // AI Services
      'openai', 'anthropic', 'google-ai',
      // Communication
      'twilio', 'sendgrid', 'mailgun', 'vonage',
      // Payments
      'stripe', 'paypal', 'mercadopago',
      // Maps & Location
      'google-maps', 'mapbox',
      // Analytics
      'google-analytics', 'mixpanel', 'amplitude',
      // Social Media
      'facebook', 'instagram', 'twitter', 'linkedin',
      // Storage & CDN
      'aws-s3', 'cloudflare-r2', 'google-cloud-storage',
      // Other
      'cloudflare', 'recaptcha', 'custom'
    ]
  },
  
  // Nombre para mostrar
  displayName: { type: String, required: true },
  
  // Descripción
  description: String,
  
  // Categoría
  category: { 
    type: String, 
    required: true,
    enum: ['ai', 'communication', 'payment', 'analytics', 'storage', 'social', 'maps', 'security', 'other'],
    index: true
  },
  
  // Credenciales (ENCRIPTADAS)
  credentials: {
    apiKey: String,
    apiSecret: String,
    accountId: String,
    clientId: String,
    clientSecret: String,
    accessToken: String,
    refreshToken: String,
    webhookSecret: String,
    additionalConfig: mongoose.Schema.Types.Mixed // Configuración extra específica del servicio
  },
  
  // Estado del servicio
  status: {
    isEnabled: { type: Boolean, default: false, index: true },
    isConfigured: { type: Boolean, default: false },
    
    // Health check
    lastHealthCheck: Date,
    healthStatus: { 
      type: String, 
      enum: ['healthy', 'warning', 'error', 'unknown'],
      default: 'unknown'
    },
    healthMessage: String,
    lastError: String,
    errorCount: { type: Number, default: 0 },
    lastSuccessfulCall: Date
  },
  
  // Configuración de health checks
  healthCheck: {
    enabled: { type: Boolean, default: true },
    interval: { type: Number, default: 300000 }, // 5 minutos por defecto
    endpoint: String, // Endpoint específico para verificar
    method: { type: String, default: 'GET' },
    expectedStatus: { type: Number, default: 200 },
    timeout: { type: Number, default: 10000 } // 10 segundos
  },
  
  // Uso y estadísticas
  usage: {
    requestCount: { type: Number, default: 0 },
    lastUsed: Date,
    monthlyQuota: Number,
    currentUsage: { type: Number, default: 0 },
    quotaResetDate: Date
  },
  
  // Límites de rate limiting
  rateLimits: {
    requestsPerSecond: Number,
    requestsPerMinute: Number,
    requestsPerHour: Number,
    requestsPerDay: Number
  },
  
  // Entorno
  environment: {
    type: String,
    enum: ['production', 'development', 'staging', 'test'],
    default: 'production'
  },
  
  // URLs importantes
  urls: {
    dashboard: String, // URL del dashboard del servicio
    documentation: String,
    support: String
  },
  
  // Webhooks (si aplica)
  webhooks: [{
    event: String,
    url: String,
    secret: String,
    isActive: Boolean
  }],
  
  // Notas internas
  notes: String,
  
  // Configuración y modificación
  configuredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  configuredAt: Date,
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Auditoría
  auditLog: [{
    action: String, // 'created', 'updated', 'enabled', 'disabled', 'health_check'
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed
  }]
  
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // No exponer credenciales en JSON
      delete ret.credentials;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Índices
apiConfigurationSchema.index({ service: 1, environment: 1 });
apiConfigurationSchema.index({ category: 1, 'status.isEnabled': 1 });
apiConfigurationSchema.index({ 'status.healthStatus': 1 });

// Virtual para saber si necesita atención
apiConfigurationSchema.virtual('needsAttention').get(function() {
  return (
    (this.status.isEnabled && this.status.healthStatus === 'error') ||
    (this.status.errorCount > 5) ||
    (this.usage.monthlyQuota && this.usage.currentUsage / this.usage.monthlyQuota > 0.9)
  );
});

// Encriptar credenciales antes de guardar
apiConfigurationSchema.pre('save', function(next) {
  if (this.isModified('credentials')) {
    // IMPORTANTE: En producción, usar una clave de encriptación segura
    // almacenada en variables de entorno
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    
    if (this.credentials.apiKey && !this.credentials.apiKey.startsWith('enc:')) {
      this.credentials.apiKey = 'enc:' + this.encrypt(this.credentials.apiKey, encryptionKey);
    }
    
    if (this.credentials.apiSecret && !this.credentials.apiSecret.startsWith('enc:')) {
      this.credentials.apiSecret = 'enc:' + this.encrypt(this.credentials.apiSecret, encryptionKey);
    }
    
    if (this.credentials.accessToken && !this.credentials.accessToken.startsWith('enc:')) {
      this.credentials.accessToken = 'enc:' + this.encrypt(this.credentials.accessToken, encryptionKey);
    }
  }
  
  // Actualizar isConfigured
  this.status.isConfigured = !!(
    this.credentials.apiKey ||
    this.credentials.apiSecret ||
    this.credentials.clientId ||
    this.credentials.accessToken
  );
  
  next();
});

// Método para encriptar
apiConfigurationSchema.methods.encrypt = function(text, key) {
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16);
  const keyHash = crypto.createHash('sha256').update(String(key)).digest('base64').substr(0, 32);
  const cipher = crypto.createCipheriv(algorithm, keyHash, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// Método para desencriptar
apiConfigurationSchema.methods.decrypt = function(text, key) {
  if (!text || !text.startsWith('enc:')) {
    return text;
  }
  
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
apiConfigurationSchema.methods.getDecryptedCredentials = function() {
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  
  return {
    apiKey: this.decrypt(this.credentials.apiKey, encryptionKey),
    apiSecret: this.decrypt(this.credentials.apiSecret, encryptionKey),
    accountId: this.credentials.accountId,
    clientId: this.credentials.clientId,
    clientSecret: this.decrypt(this.credentials.clientSecret, encryptionKey),
    accessToken: this.decrypt(this.credentials.accessToken, encryptionKey),
    refreshToken: this.decrypt(this.credentials.refreshToken, encryptionKey),
    webhookSecret: this.decrypt(this.credentials.webhookSecret, encryptionKey),
    additionalConfig: this.credentials.additionalConfig
  };
};

// Método para añadir entrada de auditoría
apiConfigurationSchema.methods.addAuditLog = function(action, userId, details = {}) {
  this.auditLog.push({
    action,
    performedBy: userId,
    timestamp: new Date(),
    details
  });
  
  // Limitar a últimas 50 entradas
  if (this.auditLog.length > 50) {
    this.auditLog = this.auditLog.slice(-50);
  }
  
  return this.save();
};

// Método para habilitar servicio
apiConfigurationSchema.methods.enable = function(userId) {
  this.status.isEnabled = true;
  return this.addAuditLog('enabled', userId);
};

// Método para deshabilitar servicio
apiConfigurationSchema.methods.disable = function(userId) {
  this.status.isEnabled = false;
  return this.addAuditLog('disabled', userId);
};

// Método para actualizar health check
apiConfigurationSchema.methods.updateHealthStatus = function(status, message = '') {
  this.status.lastHealthCheck = new Date();
  this.status.healthStatus = status;
  this.status.healthMessage = message;
  
  if (status === 'error') {
    this.status.errorCount += 1;
    this.status.lastError = message;
  } else if (status === 'healthy') {
    this.status.errorCount = 0;
    this.status.lastSuccessfulCall = new Date();
  }
  
  return this.save();
};

// Método para incrementar uso
apiConfigurationSchema.methods.incrementUsage = function(amount = 1) {
  this.usage.requestCount += amount;
  this.usage.currentUsage += amount;
  this.usage.lastUsed = new Date();
  return this.save();
};

// Método estático para obtener servicios por categoría
apiConfigurationSchema.statics.findByCategory = function(category) {
  return this.find({ category }).sort({ displayName: 1 });
};

// Método estático para obtener servicios habilitados
apiConfigurationSchema.statics.findEnabled = function() {
  return this.find({ 'status.isEnabled': true }).sort({ service: 1 });
};

// Método estático para obtener servicios con problemas
apiConfigurationSchema.statics.findWithIssues = function() {
  return this.find({
    'status.isEnabled': true,
    $or: [
      { 'status.healthStatus': 'error' },
      { 'status.errorCount': { $gte: 5 } }
    ]
  }).sort({ 'status.errorCount': -1 });
};

const APIConfiguration = mongoose.model('APIConfiguration', apiConfigurationSchema);

module.exports = APIConfiguration;
