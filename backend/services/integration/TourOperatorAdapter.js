/**
 * Tour Operator Adapter - Factory pattern para múltiples sistemas
 * Soporta: eJuniper, Amadeus, Sabre, HotelBeds, APIs REST/SOAP personalizadas
 */

const EJuniperIntegration = require('./EJuniperIntegration');
const EventEmitter = require('events');
const logger = require('../logging/logger');

class TourOperatorAdapter extends EventEmitter {
  constructor() {
    super();
    
    // Registry de adaptadores activos
    this.adapters = new Map();
    
    // Registry de tipos de sistemas soportados
    this.supportedSystems = {
      ejuniper: EJuniperIntegration,
      // Futuros adaptadores:
      // amadeus: AmadeusIntegration,
      // sabre: SabreIntegration,
      // hotelbeds: HotelBedsIntegration,
      // rest_custom: RESTCustomIntegration,
      // soap_custom: SOAPCustomIntegration
    };
  }
  
  /**
   * Crear adaptador para un operador turístico
   */
  async createAdapter(tourOperator) {
    try {
      const systemType = tourOperator.apiSystem.type;
      
      // Verificar si ya existe un adaptador activo
      if (this.adapters.has(tourOperator._id.toString())) {
        logger.info(`Reusing existing adapter for ${tourOperator.name}`);
        return this.adapters.get(tourOperator._id.toString());
      }
      
      // Verificar si el sistema es soportado
      const AdapterClass = this.supportedSystems[systemType];
      if (!AdapterClass) {
        throw new Error(`Unsupported system type: ${systemType}`);
      }
      
      // Crear instancia del adaptador
      logger.info(`Creating ${systemType} adapter for ${tourOperator.name}`);
      const adapter = new AdapterClass(tourOperator);
      
      // Inicializar
      await adapter.initialize();
      
      // Guardar en registry
      this.adapters.set(tourOperator._id.toString(), adapter);
      
      // Escuchar eventos del adaptador
      this.setupAdapterListeners(adapter, tourOperator);
      
      return adapter;
      
    } catch (error) {
      logger.error(`Failed to create adapter for ${tourOperator.name}: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Configurar listeners para eventos del adaptador
   */
  setupAdapterListeners(adapter, tourOperator) {
    adapter.on('requestSuccess', (data) => {
      this.emit('operatorRequestSuccess', {
        operatorId: tourOperator._id,
        operatorName: tourOperator.name,
        ...data
      });
    });
    
    adapter.on('requestError', (data) => {
      this.emit('operatorRequestError', {
        operatorId: tourOperator._id,
        operatorName: tourOperator.name,
        ...data
      });
      
      // Actualizar estado de salud del operador
      tourOperator.updateHealthStatus('error', data.error.message);
    });
  }
  
  /**
   * Obtener adaptador existente
   */
  getAdapter(operatorId) {
    return this.adapters.get(operatorId.toString());
  }
  
  /**
   * Remover adaptador
   */
  removeAdapter(operatorId) {
    const adapter = this.adapters.get(operatorId.toString());
    if (adapter) {
      adapter.removeAllListeners();
      this.adapters.delete(operatorId.toString());
      logger.info(`Adapter removed for operator ${operatorId}`);
    }
  }
  
  /**
   * ========== OPERACIONES UNIFICADAS ==========
   * Métodos genéricos que funcionan con cualquier sistema
   */
  
  /**
   * Buscar disponibilidad de hoteles (unificado)
   */
  async searchHotels(operatorId, searchParams) {
    const adapter = await this.getOrCreateAdapter(operatorId);
    
    if (!adapter.searchHotelAvailability) {
      throw new Error('Hotel search not supported by this operator');
    }
    
    return await adapter.searchHotelAvailability(searchParams);
  }
  
  /**
   * Crear reserva de hotel (unificado)
   */
  async createHotelBooking(operatorId, bookingData) {
    const adapter = await this.getOrCreateAdapter(operatorId);
    
    // eJuniper requiere primero obtener BookingRules
    if (adapter instanceof EJuniperIntegration) {
      const rules = await adapter.getHotelBookingRules(bookingData.ratePlanCode);
      bookingData.bookingCode = rules.bookingCode;
    }
    
    if (!adapter.createHotelBooking) {
      throw new Error('Hotel booking not supported by this operator');
    }
    
    return await adapter.createHotelBooking(bookingData);
  }
  
  /**
   * Buscar paquetes turísticos (unificado)
   */
  async searchPackages(operatorId, searchParams) {
    const adapter = await this.getOrCreateAdapter(operatorId);
    
    if (!adapter.searchPackageAvailability) {
      throw new Error('Package search not supported by this operator');
    }
    
    return await adapter.searchPackageAvailability(searchParams);
  }
  
  /**
   * Crear reserva de paquete (unificado)
   */
  async createPackageBooking(operatorId, bookingData) {
    const adapter = await this.getOrCreateAdapter(operatorId);
    
    // eJuniper requiere primero obtener BookingRules
    if (adapter instanceof EJuniperIntegration) {
      const rules = await adapter.getPackageBookingRules(bookingData.ratePlanCode);
      bookingData.bookingCode = rules.bookingCode;
    }
    
    if (!adapter.createPackageBooking) {
      throw new Error('Package booking not supported by this operator');
    }
    
    return await adapter.createPackageBooking(bookingData);
  }
  
  /**
   * Leer reserva existente (unificado)
   */
  async readBooking(operatorId, locator) {
    const adapter = await this.getOrCreateAdapter(operatorId);
    
    if (!adapter.readBooking) {
      throw new Error('Read booking not supported by this operator');
    }
    
    return await adapter.readBooking(locator);
  }
  
  /**
   * Cancelar reserva (unificado)
   */
  async cancelBooking(operatorId, locator, elementId = null) {
    const adapter = await this.getOrCreateAdapter(operatorId);
    
    if (!adapter.cancelBooking) {
      throw new Error('Cancel booking not supported by this operator');
    }
    
    return await adapter.cancelBooking(locator, elementId);
  }
  
  /**
   * Health check de un operador
   */
  async healthCheck(operatorId) {
    try {
      const adapter = await this.getOrCreateAdapter(operatorId);
      
      if (!adapter.healthCheck) {
        return { status: 'unknown', message: 'Health check not supported' };
      }
      
      return await adapter.healthCheck();
      
    } catch (error) {
      return { 
        status: 'error', 
        message: error.message, 
        timestamp: new Date() 
      };
    }
  }
  
  /**
   * Obtener estadísticas de un operador
   */
  getOperatorStats(operatorId) {
    const adapter = this.getAdapter(operatorId);
    
    if (!adapter || !adapter.getStats) {
      return null;
    }
    
    return adapter.getStats();
  }
  
  /**
   * Helper: Obtener o crear adaptador
   */
  async getOrCreateAdapter(operatorId) {
    let adapter = this.getAdapter(operatorId);
    
    if (!adapter) {
      // Cargar operador de BD
      const TourOperator = require('../../models/TourOperator');
      const tourOperator = await TourOperator.findById(operatorId);
      
      if (!tourOperator) {
        throw new Error(`Tour operator not found: ${operatorId}`);
      }
      
      if (!tourOperator.integrationStatus.isActive) {
        throw new Error(`Tour operator is not active: ${tourOperator.name}`);
      }
      
      adapter = await this.createAdapter(tourOperator);
    }
    
    return adapter;
  }
  
  /**
   * Obtener todos los adaptadores activos
   */
  getActiveAdapters() {
    return Array.from(this.adapters.entries()).map(([operatorId, adapter]) => ({
      operatorId,
      stats: adapter.getStats ? adapter.getStats() : null,
      isInitialized: adapter.isInitialized
    }));
  }
  
  /**
   * Cerrar todos los adaptadores
   */
  async shutdownAll() {
    logger.info('Shutting down all tour operator adapters');
    
    for (const [operatorId, adapter] of this.adapters.entries()) {
      try {
        if (adapter.shutdown) {
          await adapter.shutdown();
        }
        adapter.removeAllListeners();
      } catch (error) {
        logger.error(`Error shutting down adapter for ${operatorId}`, error);
      }
    }
    
    this.adapters.clear();
    this.removeAllListeners();
    
    logger.info('All tour operator adapters shut down');
  }
}

// Singleton instance
let adapterInstance = null;

/**
 * Obtener instancia singleton del adaptador
 */
function getTourOperatorAdapter() {
  if (!adapterInstance) {
    adapterInstance = new TourOperatorAdapter();
  }
  return adapterInstance;
}

module.exports = {
  TourOperatorAdapter,
  getTourOperatorAdapter
};
