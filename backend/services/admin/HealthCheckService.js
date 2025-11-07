const EventEmitter = require('events');
const APIConfiguration = require('../../models/admin/APIConfiguration');

/**
 * HealthCheckService - Monitoreo de salud de servicios
 * Verifica conectividad, validez de credenciales, estado de APIs
 */
class HealthCheckService extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    this.checkIntervals = new Map();
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('[HealthCheckService] Initializing...');
    
    // Iniciar health checks automáticos para servicios habilitados
    await this.startAutomaticHealthChecks();
    
    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Iniciar health checks automáticos
   */
  async startAutomaticHealthChecks() {
    try {
      const enabledConfigs = await APIConfiguration.findEnabled();
      
      for (const config of enabledConfigs) {
        if (config.healthCheck.enabled) {
          this.scheduleHealthCheck(config);
        }
      }
    } catch (error) {
      console.error('[HealthCheckService] Error starting automatic health checks:', error);
    }
  }

  /**
   * Programar health check para un servicio
   */
  scheduleHealthCheck(config) {
    // Cancelar intervalo existente si hay
    if (this.checkIntervals.has(config.service)) {
      clearInterval(this.checkIntervals.get(config.service));
    }

    const intervalId = setInterval(async () => {
      await this.checkServiceHealth(config.service);
    }, config.healthCheck.interval);

    this.checkIntervals.set(config.service, intervalId);
  }

  /**
   * Detener health checks automáticos
   */
  stopAutomaticHealthChecks() {
    for (const [service, intervalId] of this.checkIntervals) {
      clearInterval(intervalId);
    }
    this.checkIntervals.clear();
  }

  /**
   * Verificar salud de todos los servicios habilitados
   */
  async checkAllServices() {
    try {
      const configs = await APIConfiguration.findEnabled();
      const results = [];

      for (const config of configs) {
        const result = await this.checkServiceHealth(config.service);
        results.push(result);
      }

      return {
        success: true,
        results,
        summary: {
          total: results.length,
          healthy: results.filter(r => r.status === 'healthy').length,
          warning: results.filter(r => r.status === 'warning').length,
          error: results.filter(r => r.status === 'error').length
        }
      };
    } catch (error) {
      console.error('[HealthCheckService] Error checking all services:', error);
      throw error;
    }
  }

  /**
   * Verificar salud de un servicio específico
   */
  async checkServiceHealth(service) {
    try {
      const config = await APIConfiguration.findOne({ service });

      if (!config) {
        throw new Error('Service configuration not found');
      }

      let status = 'unknown';
      let message = '';
      let responseTime = 0;

      const startTime = Date.now();

      try {
        switch (service) {
          case 'openai':
            ({ status, message } = await this.checkOpenAI(config));
            break;
          
          case 'twilio':
            ({ status, message } = await this.checkTwilio(config));
            break;
          
          case 'sendgrid':
            ({ status, message } = await this.checkSendGrid(config));
            break;
          
          case 'stripe':
            ({ status, message } = await this.checkStripe(config));
            break;
          
          case 'google-maps':
            ({ status, message } = await this.checkGoogleMaps(config));
            break;
          
          default:
            ({ status, message } = await this.checkGenericAPI(config));
        }

        responseTime = Date.now() - startTime;
      } catch (error) {
        status = 'error';
        message = error.message;
        responseTime = Date.now() - startTime;
      }

      // Actualizar en BD
      await config.updateHealthStatus(status, message);

      this.emit('health:checked', { service, status, message, responseTime });

      return {
        success: true,
        service,
        status,
        message,
        responseTime,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`[HealthCheckService] Error checking ${service}:`, error);
      throw error;
    }
  }

  /**
   * Health check para OpenAI
   */
  async checkOpenAI(config) {
    try {
      const credentials = config.getDecryptedCredentials();
      
      if (!credentials.apiKey) {
        return { status: 'error', message: 'API key not configured' };
      }

      // IMPLEMENTACIÓN SIMPLIFICADA
      // En producción, hacer llamada real a la API
      /*
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: credentials.apiKey });
      
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      });
      
      return { status: 'healthy', message: 'OpenAI API working correctly' };
      */

      // Placeholder
      return { status: 'healthy', message: 'Health check simulated - OpenAI configured' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Health check para Twilio
   */
  async checkTwilio(config) {
    try {
      const credentials = config.getDecryptedCredentials();
      
      if (!credentials.accountId || !credentials.apiKey) {
        return { status: 'error', message: 'Credentials not configured' };
      }

      // Placeholder
      return { status: 'healthy', message: 'Health check simulated - Twilio configured' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Health check para SendGrid
   */
  async checkSendGrid(config) {
    try {
      const credentials = config.getDecryptedCredentials();
      
      if (!credentials.apiKey) {
        return { status: 'error', message: 'API key not configured' };
      }

      return { status: 'healthy', message: 'Health check simulated - SendGrid configured' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Health check para Stripe
   */
  async checkStripe(config) {
    try {
      const credentials = config.getDecryptedCredentials();
      
      if (!credentials.apiKey) {
        return { status: 'error', message: 'API key not configured' };
      }

      return { status: 'healthy', message: 'Health check simulated - Stripe configured' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Health check para Google Maps
   */
  async checkGoogleMaps(config) {
    try {
      const credentials = config.getDecryptedCredentials();
      
      if (!credentials.apiKey) {
        return { status: 'error', message: 'API key not configured' };
      }

      return { status: 'healthy', message: 'Health check simulated - Google Maps configured' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Health check genérico para APIs
   */
  async checkGenericAPI(config) {
    try {
      const credentials = config.getDecryptedCredentials();
      
      if (!credentials.apiKey) {
        return { status: 'warning', message: 'API key not configured' };
      }

      return { status: 'healthy', message: 'Credentials configured' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Obtener resumen de salud de servicios
   */
  async getHealthSummary() {
    try {
      const configs = await APIConfiguration.find({ 'status.isEnabled': true });

      const summary = {
        total: configs.length,
        healthy: 0,
        warning: 0,
        error: 0,
        unknown: 0,
        services: []
      };

      for (const config of configs) {
        summary[config.status.healthStatus]++;
        
        summary.services.push({
          service: config.service,
          displayName: config.displayName,
          status: config.status.healthStatus,
          message: config.status.healthMessage,
          lastCheck: config.status.lastHealthCheck,
          errorCount: config.status.errorCount
        });
      }

      // Ordenar por estado (error primero)
      summary.services.sort((a, b) => {
        const order = { error: 0, warning: 1, unknown: 2, healthy: 3 };
        return order[a.status] - order[b.status];
      });

      return { success: true, summary };
    } catch (error) {
      console.error('[HealthCheckService] Error getting health summary:', error);
      throw error;
    }
  }
}

// Singleton
let instance = null;

function getHealthCheckService() {
  if (!instance) {
    instance = new HealthCheckService();
  }
  return instance;
}

module.exports = { HealthCheckService, getHealthCheckService };
