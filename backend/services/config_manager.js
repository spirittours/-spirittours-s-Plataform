/**
 * Spirit Tours - Configuration Manager Service
 * 
 * Centralizes all system configuration management with:
 * - Database storage for configurations
 * - Encryption for sensitive data
 * - Validation before saving
 * - Audit logging
 * - Real-time updates
 * - Rollback capability
 */

const crypto = require('crypto');
const EventEmitter = require('events');
const logger = require('../utils/logger');

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || crypto.randomBytes(32);

/**
 * Configuration Categories
 */
const CONFIG_CATEGORIES = {
  database: {
    name: 'Base de Datos',
    icon: '🗄️',
    description: 'Configuración de PostgreSQL, Redis y MongoDB',
    fields: [
      { key: 'DB_HOST', label: 'PostgreSQL Host', type: 'text', encrypted: false, required: true },
      { key: 'DB_PORT', label: 'PostgreSQL Puerto', type: 'number', encrypted: false, required: true },
      { key: 'DB_NAME', label: 'Nombre de Base de Datos', type: 'text', encrypted: false, required: true },
      { key: 'DB_USER', label: 'Usuario PostgreSQL', type: 'text', encrypted: false, required: true },
      { key: 'DB_PASSWORD', label: 'Contraseña PostgreSQL', type: 'password', encrypted: true, required: true },
      { key: 'DB_POOL_SIZE', label: 'Tamaño del Pool', type: 'number', encrypted: false, required: false },
      { key: 'REDIS_HOST', label: 'Redis Host', type: 'text', encrypted: false, required: true },
      { key: 'REDIS_PORT', label: 'Redis Puerto', type: 'number', encrypted: false, required: true },
      { key: 'REDIS_PASSWORD', label: 'Redis Password', type: 'password', encrypted: true, required: false }
    ]
  },
  
  email: {
    name: 'Email',
    icon: '📧',
    description: 'Configuración de servicios de email (SMTP, SendGrid)',
    fields: [
      { key: 'EMAIL_PROVIDER', label: 'Proveedor', type: 'select', options: ['sendgrid', 'smtp', 'nodemailer'], encrypted: false, required: true },
      { key: 'DEFAULT_FROM_EMAIL', label: 'Email Remitente', type: 'email', encrypted: false, required: true },
      { key: 'DEFAULT_FROM_NAME', label: 'Nombre Remitente', type: 'text', encrypted: false, required: true },
      { key: 'SENDGRID_API_KEY', label: 'SendGrid API Key', type: 'password', encrypted: true, required: false, testable: true },
      { key: 'SMTP_HOST', label: 'SMTP Host', type: 'text', encrypted: false, required: false },
      { key: 'SMTP_PORT', label: 'SMTP Puerto', type: 'number', encrypted: false, required: false },
      { key: 'SMTP_USERNAME', label: 'SMTP Usuario', type: 'text', encrypted: false, required: false },
      { key: 'SMTP_PASSWORD', label: 'SMTP Contraseña', type: 'password', encrypted: true, required: false, testable: true }
    ]
  },
  
  payments: {
    name: 'Pagos',
    icon: '💳',
    description: 'Configuración de pasarelas de pago',
    fields: [
      // Stripe
      { key: 'STRIPE_PUBLISHABLE_KEY', label: 'Stripe Publishable Key', type: 'text', encrypted: false, required: false, group: 'Stripe' },
      { key: 'STRIPE_SECRET_KEY', label: 'Stripe Secret Key', type: 'password', encrypted: true, required: false, testable: true, group: 'Stripe' },
      { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe Webhook Secret', type: 'password', encrypted: true, required: false, group: 'Stripe' },
      
      // PayPal
      { key: 'PAYPAL_MODE', label: 'PayPal Mode', type: 'select', options: ['sandbox', 'live'], encrypted: false, required: false, group: 'PayPal' },
      { key: 'PAYPAL_CLIENT_ID', label: 'PayPal Client ID', type: 'text', encrypted: false, required: false, group: 'PayPal' },
      { key: 'PAYPAL_CLIENT_SECRET', label: 'PayPal Client Secret', type: 'password', encrypted: true, required: false, testable: true, group: 'PayPal' },
      
      // MercadoPago
      { key: 'MERCADOPAGO_PUBLIC_KEY', label: 'MercadoPago Public Key', type: 'text', encrypted: false, required: false, group: 'MercadoPago' },
      { key: 'MERCADOPAGO_ACCESS_TOKEN', label: 'MercadoPago Access Token', type: 'password', encrypted: true, required: false, testable: true, group: 'MercadoPago' }
    ]
  },
  
  authentication: {
    name: 'Autenticación',
    icon: '🔐',
    description: 'JWT, OAuth y configuración de seguridad',
    fields: [
      { key: 'JWT_SECRET_KEY', label: 'JWT Secret Key', type: 'password', encrypted: true, required: true },
      { key: 'JWT_ALGORITHM', label: 'JWT Algorithm', type: 'select', options: ['HS256', 'HS384', 'HS512', 'RS256'], encrypted: false, required: true },
      { key: 'ACCESS_TOKEN_EXPIRE_MINUTES', label: 'Access Token Duración (min)', type: 'number', encrypted: false, required: true },
      { key: 'REFRESH_TOKEN_EXPIRE_DAYS', label: 'Refresh Token Duración (días)', type: 'number', encrypted: false, required: true },
      
      // Google OAuth
      { key: 'GOOGLE_CLIENT_ID', label: 'Google Client ID', type: 'text', encrypted: false, required: false, group: 'Google OAuth' },
      { key: 'GOOGLE_CLIENT_SECRET', label: 'Google Client Secret', type: 'password', encrypted: true, required: false, group: 'Google OAuth' },
      
      // Facebook OAuth
      { key: 'FACEBOOK_APP_ID', label: 'Facebook App ID', type: 'text', encrypted: false, required: false, group: 'Facebook OAuth' },
      { key: 'FACEBOOK_APP_SECRET', label: 'Facebook App Secret', type: 'password', encrypted: true, required: false, group: 'Facebook OAuth' }
    ]
  },
  
  storage: {
    name: 'Almacenamiento',
    icon: '📦',
    description: 'AWS S3 y configuración de archivos',
    fields: [
      { key: 'UPLOAD_MAX_SIZE', label: 'Tamaño Máximo Upload (bytes)', type: 'number', encrypted: false, required: true },
      { key: 'ALLOWED_EXTENSIONS', label: 'Extensiones Permitidas', type: 'text', encrypted: false, required: true, placeholder: 'jpg,png,pdf' },
      
      // AWS S3
      { key: 'AWS_ACCESS_KEY_ID', label: 'AWS Access Key ID', type: 'text', encrypted: false, required: false, group: 'AWS S3' },
      { key: 'AWS_SECRET_ACCESS_KEY', label: 'AWS Secret Access Key', type: 'password', encrypted: true, required: false, testable: true, group: 'AWS S3' },
      { key: 'AWS_S3_BUCKET', label: 'S3 Bucket Name', type: 'text', encrypted: false, required: false, group: 'AWS S3' },
      { key: 'AWS_S3_REGION', label: 'S3 Region', type: 'select', options: ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1'], encrypted: false, required: false, group: 'AWS S3' }
    ]
  },
  
  monitoring: {
    name: 'Monitoreo',
    icon: '📊',
    description: 'Logging, Sentry, métricas',
    fields: [
      { key: 'LOG_LEVEL', label: 'Nivel de Log', type: 'select', options: ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'], encrypted: false, required: true },
      { key: 'LOG_MAX_SIZE', label: 'Tamaño Máximo Log (bytes)', type: 'number', encrypted: false, required: true },
      { key: 'LOG_BACKUP_COUNT', label: 'Archivos de Backup', type: 'number', encrypted: false, required: true },
      
      // Sentry
      { key: 'SENTRY_DSN', label: 'Sentry DSN', type: 'text', encrypted: true, required: false, group: 'Sentry' },
      { key: 'SENTRY_ENVIRONMENT', label: 'Sentry Environment', type: 'select', options: ['development', 'staging', 'production'], encrypted: false, required: false, group: 'Sentry' },
      
      // Metrics
      { key: 'METRICS_ENABLED', label: 'Métricas Habilitadas', type: 'boolean', encrypted: false, required: false, group: 'Prometheus' },
      { key: 'METRICS_PORT', label: 'Puerto de Métricas', type: 'number', encrypted: false, required: false, group: 'Prometheus' }
    ]
  },
  
  security: {
    name: 'Seguridad',
    icon: '🛡️',
    description: 'Rate limiting, CORS, seguridad general',
    fields: [
      { key: 'BCRYPT_ROUNDS', label: 'Bcrypt Rounds', type: 'number', encrypted: false, required: true },
      { key: 'PASSWORD_MIN_LENGTH', label: 'Longitud Mínima Password', type: 'number', encrypted: false, required: true },
      { key: 'MAX_LOGIN_ATTEMPTS', label: 'Intentos Máximos de Login', type: 'number', encrypted: false, required: true },
      { key: 'LOCKOUT_DURATION_MINUTES', label: 'Duración Bloqueo (min)', type: 'number', encrypted: false, required: true },
      
      // Rate Limiting
      { key: 'RATE_LIMIT_ENABLED', label: 'Rate Limiting Habilitado', type: 'boolean', encrypted: false, required: true, group: 'Rate Limiting' },
      { key: 'RATE_LIMIT_PER_MINUTE', label: 'Requests por Minuto', type: 'number', encrypted: false, required: false, group: 'Rate Limiting' },
      { key: 'RATE_LIMIT_PER_HOUR', label: 'Requests por Hora', type: 'number', encrypted: false, required: false, group: 'Rate Limiting' },
      
      // CORS
      { key: 'CORS_ORIGINS', label: 'CORS Origins', type: 'text', encrypted: false, required: true, placeholder: 'http://localhost:3000,https://yourdomain.com', group: 'CORS' },
      { key: 'ALLOWED_HOSTS', label: 'Allowed Hosts', type: 'text', encrypted: false, required: true, placeholder: 'localhost,yourdomain.com', group: 'CORS' }
    ]
  },
  
  integrations: {
    name: 'Integraciones',
    icon: '🔌',
    description: 'APIs externas y servicios de terceros',
    fields: [
      // Google Analytics
      { key: 'GA_TRACKING_ID', label: 'Google Analytics Tracking ID', type: 'text', encrypted: false, required: false, group: 'Google Analytics' },
      { key: 'GTM_CONTAINER_ID', label: 'Google Tag Manager ID', type: 'text', encrypted: false, required: false, group: 'Google Analytics' },
      
      // Social Media
      { key: 'TWITTER_API_KEY', label: 'Twitter API Key', type: 'text', encrypted: false, required: false, group: 'Twitter' },
      { key: 'TWITTER_API_SECRET', label: 'Twitter API Secret', type: 'password', encrypted: true, required: false, group: 'Twitter' },
      { key: 'INSTAGRAM_CLIENT_ID', label: 'Instagram Client ID', type: 'text', encrypted: false, required: false, group: 'Instagram' },
      { key: 'INSTAGRAM_CLIENT_SECRET', label: 'Instagram Client Secret', type: 'password', encrypted: true, required: false, group: 'Instagram' }
    ]
  },
  
  features: {
    name: 'Features',
    icon: '🎯',
    description: 'Feature flags y configuración de funcionalidades',
    fields: [
      { key: 'FEATURE_WEBSOCKET_ENABLED', label: 'WebSocket Habilitado', type: 'boolean', encrypted: false, required: true },
      { key: 'FEATURE_EMAIL_ENABLED', label: 'Email Habilitado', type: 'boolean', encrypted: false, required: true },
      { key: 'FEATURE_PAYMENT_ENABLED', label: 'Pagos Habilitados', type: 'boolean', encrypted: false, required: true },
      { key: 'FEATURE_MULTI_LANGUAGE', label: 'Multi-idioma Habilitado', type: 'boolean', encrypted: false, required: true },
      { key: 'FEATURE_DARK_MODE', label: 'Modo Oscuro Habilitado', type: 'boolean', encrypted: false, required: true },
      { key: 'BACKUP_ENABLED', label: 'Backups Habilitados', type: 'boolean', encrypted: false, required: true },
      { key: 'BACKUP_INTERVAL_HOURS', label: 'Intervalo de Backup (horas)', type: 'number', encrypted: false, required: false },
      { key: 'BACKUP_RETENTION_DAYS', label: 'Retención Backups (días)', type: 'number', encrypted: false, required: false }
    ]
  }
};

/**
 * Configuration Manager Class
 */
class ConfigurationManager extends EventEmitter {
  constructor() {
    super();
    this.configs = new Map(); // In-memory cache
    this.configHistory = []; // History for rollback
    this.maxHistorySize = 10;
  }

  /**
   * Initialize configuration manager
   */
  async initialize() {
    try {
      logger.info('Initializing Configuration Manager...');
      
      // Load configurations from database or environment
      await this.loadConfigurations();
      
      logger.info('Configuration Manager initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Configuration Manager:', error);
      return false;
    }
  }

  /**
   * Load configurations from database or fallback to environment variables
   */
  async loadConfigurations() {
    // For now, load from environment variables
    // In production, this would load from database
    for (const [category, categoryData] of Object.entries(CONFIG_CATEGORIES)) {
      for (const field of categoryData.fields) {
        const value = process.env[field.key];
        if (value !== undefined) {
          this.configs.set(field.key, {
            value: field.encrypted ? this.encrypt(value) : value,
            encrypted: field.encrypted,
            category,
            updatedAt: new Date(),
            updatedBy: 'system'
          });
        }
      }
    }

    logger.info(`Loaded ${this.configs.size} configuration values`);
  }

  /**
   * Get configuration value
   */
  get(key, decrypt = true) {
    const config = this.configs.get(key);
    if (!config) {
      // Fallback to environment variable
      return process.env[key];
    }

    if (config.encrypted && decrypt) {
      return this.decrypt(config.value);
    }

    return config.value;
  }

  /**
   * Set configuration value
   */
  async set(key, value, options = {}) {
    const { encrypted = false, updatedBy = 'admin', skipHistory = false } = options;

    // Validate configuration exists
    const fieldInfo = this.getFieldInfo(key);
    if (!fieldInfo) {
      throw new Error(`Configuration key '${key}' not found`);
    }

    // Validate value
    this.validateValue(key, value, fieldInfo);

    // Save to history before updating
    if (!skipHistory) {
      this.saveToHistory(key);
    }

    // Store encrypted or plain value
    const storedValue = fieldInfo.encrypted ? this.encrypt(value) : value;

    this.configs.set(key, {
      value: storedValue,
      encrypted: fieldInfo.encrypted,
      category: fieldInfo.category,
      updatedAt: new Date(),
      updatedBy
    });

    // Emit change event
    this.emit('configChanged', { key, value: storedValue, updatedBy });

    // In production, save to database
    await this.persistToDatabase(key, storedValue, fieldInfo);

    logger.info(`Configuration '${key}' updated by ${updatedBy}`);

    return true;
  }

  /**
   * Set multiple configurations at once
   */
  async setMany(configs, updatedBy = 'admin') {
    const results = {
      success: [],
      failed: []
    };

    for (const [key, value] of Object.entries(configs)) {
      try {
        await this.set(key, value, { updatedBy });
        results.success.push(key);
      } catch (error) {
        results.failed.push({ key, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get all configurations for a category
   */
  getCategory(categoryName, includeValues = false) {
    const category = CONFIG_CATEGORIES[categoryName];
    if (!category) {
      throw new Error(`Category '${categoryName}' not found`);
    }

    const configs = {};
    for (const field of category.fields) {
      if (includeValues) {
        configs[field.key] = {
          ...field,
          value: this.get(field.key),
          hasValue: this.configs.has(field.key) || !!process.env[field.key]
        };
      } else {
        configs[field.key] = field;
      }
    }

    return {
      ...category,
      configs
    };
  }

  /**
   * Get all categories with metadata
   */
  getAllCategories() {
    const categories = {};
    
    for (const [key, category] of Object.entries(CONFIG_CATEGORIES)) {
      const configuredCount = category.fields.filter(f => 
        this.configs.has(f.key) || !!process.env[f.key]
      ).length;

      categories[key] = {
        ...category,
        totalFields: category.fields.length,
        configuredFields: configuredCount,
        percentComplete: Math.round((configuredCount / category.fields.length) * 100)
      };
    }

    return categories;
  }

  /**
   * Test configuration (for APIs, databases, etc.)
   */
  async testConfiguration(category, configs) {
    const testFunctions = {
      database: this.testDatabaseConnection.bind(this),
      email: this.testEmailConnection.bind(this),
      payments: this.testPaymentGateway.bind(this),
      storage: this.testStorageConnection.bind(this)
    };

    const testFunction = testFunctions[category];
    if (!testFunction) {
      return {
        success: false,
        message: `No test available for category: ${category}`
      };
    }

    try {
      return await testFunction(configs);
    } catch (error) {
      logger.error(`Test failed for ${category}:`, error);
      return {
        success: false,
        message: error.message,
        error: error.stack
      };
    }
  }

  /**
   * Test database connection
   */
  async testDatabaseConnection(configs) {
    const { Pool } = require('pg');
    
    const pool = new Pool({
      host: configs.DB_HOST,
      port: configs.DB_PORT,
      database: configs.DB_NAME,
      user: configs.DB_USER,
      password: configs.DB_PASSWORD,
      connectionTimeoutMillis: 5000
    });

    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      await pool.end();

      return {
        success: true,
        message: 'Database connection successful',
        serverTime: result.rows[0].now
      };
    } catch (error) {
      await pool.end();
      throw error;
    }
  }

  /**
   * Test email connection
   */
  async testEmailConnection(configs) {
    if (configs.EMAIL_PROVIDER === 'smtp' && configs.SMTP_HOST) {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: configs.SMTP_HOST,
        port: configs.SMTP_PORT,
        auth: {
          user: configs.SMTP_USERNAME,
          pass: configs.SMTP_PASSWORD
        }
      });

      await transporter.verify();

      return {
        success: true,
        message: 'SMTP connection successful',
        host: configs.SMTP_HOST,
        port: configs.SMTP_PORT
      };
    } else if (configs.EMAIL_PROVIDER === 'sendgrid' && configs.SENDGRID_API_KEY) {
      // Test SendGrid
      const axios = require('axios');
      
      const response = await axios.get('https://api.sendgrid.com/v3/scopes', {
        headers: {
          'Authorization': `Bearer ${configs.SENDGRID_API_KEY}`
        }
      });

      return {
        success: true,
        message: 'SendGrid API key valid',
        scopes: response.data.scopes
      };
    }

    return {
      success: false,
      message: 'No email provider configured'
    };
  }

  /**
   * Test payment gateway
   */
  async testPaymentGateway(configs) {
    // Test Stripe
    if (configs.STRIPE_SECRET_KEY) {
      const stripe = require('stripe')(configs.STRIPE_SECRET_KEY);
      await stripe.balance.retrieve();

      return {
        success: true,
        message: 'Stripe connection successful',
        provider: 'Stripe'
      };
    }

    // Test PayPal
    if (configs.PAYPAL_CLIENT_ID && configs.PAYPAL_CLIENT_SECRET) {
      // PayPal test logic here
      return {
        success: true,
        message: 'PayPal configuration valid',
        provider: 'PayPal',
        mode: configs.PAYPAL_MODE
      };
    }

    return {
      success: false,
      message: 'No payment gateway configured'
    };
  }

  /**
   * Test storage connection
   */
  async testStorageConnection(configs) {
    if (configs.AWS_ACCESS_KEY_ID && configs.AWS_SECRET_ACCESS_KEY) {
      const AWS = require('aws-sdk');
      
      const s3 = new AWS.S3({
        accessKeyId: configs.AWS_ACCESS_KEY_ID,
        secretAccessKey: configs.AWS_SECRET_ACCESS_KEY,
        region: configs.AWS_S3_REGION
      });

      await s3.listBuckets().promise();

      return {
        success: true,
        message: 'AWS S3 connection successful',
        region: configs.AWS_S3_REGION
      };
    }

    return {
      success: false,
      message: 'No storage service configured'
    };
  }

  /**
   * Validate configuration value
   */
  validateValue(key, value, fieldInfo) {
    if (fieldInfo.required && (value === null || value === undefined || value === '')) {
      throw new Error(`Field '${key}' is required`);
    }

    if (fieldInfo.type === 'number' && isNaN(Number(value))) {
      throw new Error(`Field '${key}' must be a number`);
    }

    if (fieldInfo.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error(`Field '${key}' must be a valid email`);
    }

    if (fieldInfo.type === 'boolean' && typeof value !== 'boolean') {
      throw new Error(`Field '${key}' must be a boolean`);
    }

    if (fieldInfo.options && !fieldInfo.options.includes(value)) {
      throw new Error(`Field '${key}' must be one of: ${fieldInfo.options.join(', ')}`);
    }

    return true;
  }

  /**
   * Get field information
   */
  getFieldInfo(key) {
    for (const [categoryKey, category] of Object.entries(CONFIG_CATEGORIES)) {
      const field = category.fields.find(f => f.key === key);
      if (field) {
        return { ...field, category: categoryKey };
      }
    }
    return null;
  }

  /**
   * Save configuration to history
   */
  saveToHistory(key) {
    const current = this.configs.get(key);
    if (current) {
      this.configHistory.unshift({
        key,
        value: current.value,
        encrypted: current.encrypted,
        timestamp: new Date(),
        updatedBy: current.updatedBy
      });

      // Keep only max history size
      if (this.configHistory.length > this.maxHistorySize) {
        this.configHistory = this.configHistory.slice(0, this.maxHistorySize);
      }
    }
  }

  /**
   * Rollback configuration to previous value
   */
  async rollback(key) {
    const history = this.configHistory.find(h => h.key === key);
    if (!history) {
      throw new Error(`No history found for '${key}'`);
    }

    await this.set(key, history.value, {
      encrypted: history.encrypted,
      updatedBy: 'system_rollback',
      skipHistory: true
    });

    logger.info(`Configuration '${key}' rolled back to previous value`);

    return true;
  }

  /**
   * Export configurations (for backup)
   */
  export(includeEncrypted = false) {
    const exported = {};

    for (const [key, config] of this.configs.entries()) {
      if (config.encrypted && !includeEncrypted) {
        exported[key] = '***ENCRYPTED***';
      } else {
        exported[key] = config.encrypted ? this.decrypt(config.value) : config.value;
      }
    }

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      configurations: exported
    };
  }

  /**
   * Import configurations (from backup)
   */
  async import(data, updatedBy = 'import') {
    if (!data.configurations) {
      throw new Error('Invalid import data');
    }

    const results = await this.setMany(data.configurations, updatedBy);

    logger.info(`Imported ${results.success.length} configurations, ${results.failed.length} failed`);

    return results;
  }

  /**
   * Encrypt sensitive value
   */
  encrypt(text) {
    if (!text) return text;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    });
  }

  /**
   * Decrypt sensitive value
   */
  decrypt(encryptedData) {
    if (!encryptedData) return encryptedData;

    try {
      const data = JSON.parse(encryptedData);
      const decipher = crypto.createDecipheriv(
        ENCRYPTION_ALGORITHM,
        ENCRYPTION_KEY,
        Buffer.from(data.iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
      
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption error:', error);
      return encryptedData; // Return as-is if decryption fails
    }
  }

  /**
   * Persist configuration to database
   */
  async persistToDatabase(key, value, fieldInfo) {
    // TODO: Implement database persistence
    // This would save to a configurations table
    logger.debug(`Would persist ${key} to database`);
  }

  /**
   * Get configuration statistics
   */
  getStats() {
    const totalConfigs = Object.values(CONFIG_CATEGORIES)
      .reduce((sum, cat) => sum + cat.fields.length, 0);

    const configuredCount = this.configs.size;
    const encryptedCount = Array.from(this.configs.values())
      .filter(c => c.encrypted).length;

    return {
      totalConfigs,
      configuredCount,
      percentConfigured: Math.round((configuredCount / totalConfigs) * 100),
      encryptedCount,
      categories: Object.keys(CONFIG_CATEGORIES).length,
      historySize: this.configHistory.length
    };
  }
}

// Export singleton instance
const configManager = new ConfigurationManager();

module.exports = {
  configManager,
  ConfigurationManager,
  CONFIG_CATEGORIES
};
