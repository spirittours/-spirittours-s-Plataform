const EventEmitter = require('events');
const APIConfiguration = require('../../models/admin/APIConfiguration');

/**
 * APIConfigService - Gestión de configuración de APIs
 * CRUD, habilitación/deshabilitación, validación
 */
class APIConfigService extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('[APIConfigService] Initializing...');
    await this.ensureDefaultServices();
    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Asegurar que existen registros para servicios comunes
   */
  async ensureDefaultServices() {
    const defaultServices = [
      { service: 'openai', displayName: 'OpenAI', category: 'ai', description: 'GPT-4, ChatGPT, DALL-E' },
      { service: 'twilio', displayName: 'Twilio', category: 'communication', description: 'SMS, WhatsApp, Voice' },
      { service: 'sendgrid', displayName: 'SendGrid', category: 'communication', description: 'Email delivery' },
      { service: 'stripe', displayName: 'Stripe', category: 'payment', description: 'Payment processing' },
      { service: 'google-maps', displayName: 'Google Maps', category: 'maps', description: 'Maps and geocoding' },
      { service: 'google-analytics', displayName: 'Google Analytics', category: 'analytics', description: 'Web analytics' },
      { service: 'cloudflare', displayName: 'Cloudflare', category: 'security', description: 'CDN and security' }
    ];

    for (const service of defaultServices) {
      const exists = await APIConfiguration.findOne({ service: service.service });
      if (!exists) {
        await APIConfiguration.create(service);
      }
    }
  }

  /**
   * Obtener todas las configuraciones
   */
  async getAllConfigs(options = {}) {
    try {
      const { category, isEnabled, healthStatus } = options;
      
      const query = {};
      if (category) query.category = category;
      if (isEnabled !== undefined) query['status.isEnabled'] = isEnabled;
      if (healthStatus) query['status.healthStatus'] = healthStatus;

      const configs = await APIConfiguration.find(query)
        .populate('configuredBy', 'name email')
        .populate('lastModifiedBy', 'name email')
        .sort({ category: 1, displayName: 1 });

      return { success: true, configs };
    } catch (error) {
      console.error('[APIConfigService] Error getting configs:', error);
      throw error;
    }
  }

  /**
   * Obtener configuración por servicio
   */
  async getConfig(service) {
    try {
      const config = await APIConfiguration.findOne({ service })
        .populate('configuredBy', 'name email')
        .populate('lastModifiedBy', 'name email');

      if (!config) {
        throw new Error('Service configuration not found');
      }

      return { success: true, config };
    } catch (error) {
      console.error('[APIConfigService] Error getting config:', error);
      throw error;
    }
  }

  /**
   * Crear o actualizar configuración
   */
  async upsertConfig(service, configData, userId) {
    try {
      let config = await APIConfiguration.findOne({ service });

      if (config) {
        // Actualizar existente
        Object.keys(configData).forEach(key => {
          if (key === 'credentials') {
            config.credentials = { ...config.credentials, ...configData.credentials };
          } else if (key !== '_id' && key !== 'service') {
            config[key] = configData[key];
          }
        });

        config.lastModifiedBy = userId;
        config.configuredBy = config.configuredBy || userId;
        config.configuredAt = config.configuredAt || new Date();
        
        await config.addAuditLog('updated', userId, { fields: Object.keys(configData) });
      } else {
        // Crear nuevo
        config = new APIConfiguration({
          service,
          ...configData,
          configuredBy: userId,
          configuredAt: new Date(),
          lastModifiedBy: userId
        });

        await config.save();
        await config.addAuditLog('created', userId);
      }

      this.emit('config:updated', { service, config });

      return { success: true, config };
    } catch (error) {
      console.error('[APIConfigService] Error upserting config:', error);
      throw error;
    }
  }

  /**
   * Habilitar servicio
   */
  async enableService(service, userId) {
    try {
      const config = await APIConfiguration.findOne({ service });

      if (!config) {
        throw new Error('Service configuration not found');
      }

      if (!config.status.isConfigured) {
        throw new Error('Service must be configured before enabling');
      }

      await config.enable(userId);
      this.emit('service:enabled', { service, config });

      return { success: true, config };
    } catch (error) {
      console.error('[APIConfigService] Error enabling service:', error);
      throw error;
    }
  }

  /**
   * Deshabilitar servicio
   */
  async disableService(service, userId) {
    try {
      const config = await APIConfiguration.findOne({ service });

      if (!config) {
        throw new Error('Service configuration not found');
      }

      await config.disable(userId);
      this.emit('service:disabled', { service, config });

      return { success: true, config };
    } catch (error) {
      console.error('[APIConfigService] Error disabling service:', error);
      throw error;
    }
  }

  /**
   * Eliminar configuración
   */
  async deleteConfig(service) {
    try {
      const config = await APIConfiguration.findOneAndDelete({ service });

      if (!config) {
        throw new Error('Service configuration not found');
      }

      this.emit('config:deleted', { service });

      return { success: true, message: 'Configuration deleted successfully' };
    } catch (error) {
      console.error('[APIConfigService] Error deleting config:', error);
      throw error;
    }
  }

  /**
   * Obtener credenciales desencriptadas (uso interno)
   */
  async getCredentials(service) {
    try {
      const config = await APIConfiguration.findOne({ service });

      if (!config) {
        throw new Error('Service configuration not found');
      }

      if (!config.status.isEnabled) {
        throw new Error('Service is not enabled');
      }

      return {
        success: true,
        credentials: config.getDecryptedCredentials()
      };
    } catch (error) {
      console.error('[APIConfigService] Error getting credentials:', error);
      throw error;
    }
  }

  /**
   * Obtener servicios habilitados
   */
  async getEnabledServices() {
    try {
      const configs = await APIConfiguration.findEnabled();
      return { success: true, services: configs };
    } catch (error) {
      console.error('[APIConfigService] Error getting enabled services:', error);
      throw error;
    }
  }

  /**
   * Obtener servicios con problemas
   */
  async getServicesWithIssues() {
    try {
      const configs = await APIConfiguration.findWithIssues();
      return { success: true, services: configs };
    } catch (error) {
      console.error('[APIConfigService] Error getting services with issues:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas
   */
  async getStats() {
    try {
      const [total, enabled, configured, healthy, warning, error] = await Promise.all([
        APIConfiguration.countDocuments(),
        APIConfiguration.countDocuments({ 'status.isEnabled': true }),
        APIConfiguration.countDocuments({ 'status.isConfigured': true }),
        APIConfiguration.countDocuments({ 'status.healthStatus': 'healthy' }),
        APIConfiguration.countDocuments({ 'status.healthStatus': 'warning' }),
        APIConfiguration.countDocuments({ 'status.healthStatus': 'error' })
      ]);

      return {
        success: true,
        stats: {
          total,
          enabled,
          configured,
          health: { healthy, warning, error }
        }
      };
    } catch (error) {
      console.error('[APIConfigService] Error getting stats:', error);
      throw error;
    }
  }
}

// Singleton
let instance = null;

function getAPIConfigService() {
  if (!instance) {
    instance = new APIConfigService();
  }
  return instance;
}

module.exports = { APIConfigService, getAPIConfigService };
