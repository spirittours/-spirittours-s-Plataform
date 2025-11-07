/**
 * B2B Booking Synchronization Service
 * Sincronización bidireccional de reservas entre Spirit Tours y operadores turísticos
 * Maneja: crear, actualizar, cancelar reservas en ambos sentidos
 */

const { getTourOperatorAdapter } = require('./TourOperatorAdapter');
const Booking = require('../../models/Booking');
const TourOperator = require('../../models/TourOperator');
const EventEmitter = require('events');
const logger = require('../logging/logger');

class B2BBookingSync extends EventEmitter {
  constructor() {
    super();
    
    this.adapter = getTourOperatorAdapter();
    
    // Queue de sincronización
    this.syncQueue = [];
    this.isProcessing = false;
    
    // Estadísticas
    this.stats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      pendingQueue: 0
    };
    
    // Iniciar procesamiento de queue
    this.startQueueProcessor();
  }
  
  /**
   * ========== RESERVAS SALIENTES (Outbound) ==========
   * Creamos reservas en sistemas externos (compramos servicios)
   */
  
  /**
   * Buscar disponibilidad en operador externo
   */
  async searchExternalAvailability(operatorId, searchParams) {
    try {
      const tourOperator = await TourOperator.findById(operatorId);
      
      if (!tourOperator || !tourOperator.integrationStatus.isActive) {
        throw new Error('Tour operator not found or inactive');
      }
      
      logger.info(`Searching availability with ${tourOperator.name}`, searchParams);
      
      let results;
      
      // Determinar tipo de búsqueda
      if (searchParams.searchType === 'package') {
        results = await this.adapter.searchPackages(operatorId, searchParams);
      } else {
        results = await this.adapter.searchHotels(operatorId, searchParams);
      }
      
      // Enriquecer resultados con información de comisión
      results = results.map(result => ({
        ...result,
        commission: this.calculateCommission(result.price, tourOperator),
        pricing: this.calculatePricing(result.price, tourOperator),
        tourOperator: {
          id: tourOperator._id,
          name: tourOperator.name,
          code: tourOperator.code
        }
      }));
      
      return results;
      
    } catch (error) {
      logger.error('Error searching external availability', error);
      throw error;
    }
  }
  
  /**
   * Crear reserva en sistema externo (outbound)
   */
  async createExternalBooking(bookingData) {
    try {
      const { operatorId, ratePlanCode, passengers, contact, services, internalData } = bookingData;
      
      const tourOperator = await TourOperator.findById(operatorId);
      
      if (!tourOperator) {
        throw new Error('Tour operator not found');
      }
      
      logger.info(`Creating external booking with ${tourOperator.name}`, {
        ratePlanCode,
        passengers: passengers.length
      });
      
      // Crear booking en sistema externo
      let externalBooking;
      
      if (services.type === 'package') {
        externalBooking = await this.adapter.createPackageBooking(operatorId, {
          ratePlanCode,
          passengers,
          contact,
          remarks: internalData?.remarks
        });
      } else {
        externalBooking = await this.adapter.createHotelBooking(operatorId, {
          ratePlanCode,
          passengers,
          contact,
          supplements: services.supplements || [],
          remarks: internalData?.remarks
        });
      }
      
      // Crear booking local
      const localBooking = await this.createLocalBooking({
        ...internalData,
        b2b: {
          isB2B: true,
          relationship: 'outbound',
          tourOperator: operatorId,
          externalLocator: externalBooking.locator,
          ratePlanCode,
          sourceSystem: tourOperator.apiSystem.type,
          commission: this.calculateCommission(internalData.totalPrice, tourOperator),
          pricing: this.calculatePricing(internalData.totalPrice, tourOperator),
          cancellationPolicy: internalData.cancellationPolicy,
          syncStatus: {
            lastSync: new Date(),
            syncErrors: 0,
            needsSync: false
          }
        }
      });
      
      // Actualizar estadísticas del operador
      await tourOperator.updateSyncStats(true, 0);
      
      this.emit('externalBookingCreated', {
        localBooking,
        externalBooking,
        tourOperator: tourOperator.name
      });
      
      return {
        booking: localBooking,
        externalLocator: externalBooking.locator,
        externalStatus: externalBooking.status
      };
      
    } catch (error) {
      logger.error('Error creating external booking', error);
      
      if (bookingData.operatorId) {
        const tourOperator = await TourOperator.findById(bookingData.operatorId);
        if (tourOperator) {
          await tourOperator.updateSyncStats(false, 0);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Cancelar reserva externa
   */
  async cancelExternalBooking(bookingId, reason = '') {
    try {
      const booking = await Booking.findById(bookingId).populate('b2b.tourOperator');
      
      if (!booking || !booking.b2b.isB2B) {
        throw new Error('Booking not found or is not a B2B booking');
      }
      
      const { tourOperator, externalLocator } = booking.b2b;
      
      logger.info(`Cancelling external booking ${externalLocator} with ${tourOperator.name}`);
      
      // Cancelar en sistema externo
      const cancellationResult = await this.adapter.cancelBooking(
        tourOperator._id,
        externalLocator
      );
      
      // Actualizar booking local
      booking.status = 'cancelled';
      booking.b2b.syncStatus.lastSync = new Date();
      booking.b2b.syncStatus.needsSync = false;
      
      if (!booking.notes) {
        booking.notes = '';
      }
      booking.notes += `\nCancelled: ${reason} - ${new Date().toISOString()}`;
      
      await booking.save();
      
      this.emit('externalBookingCancelled', {
        booking,
        cancellationResult,
        tourOperator: tourOperator.name
      });
      
      return {
        success: true,
        booking,
        cancellationResult
      };
      
    } catch (error) {
      logger.error('Error cancelling external booking', error);
      throw error;
    }
  }
  
  /**
   * ========== RESERVAS ENTRANTES (Inbound) ==========
   * Recibimos reservas de otros sistemas (vendemos servicios)
   */
  
  /**
   * Procesar reserva entrante de webhook
   */
  async processInboundBooking(webhookData) {
    try {
      const { tourOperatorCode, externalLocator, bookingData } = webhookData;
      
      // Buscar operador
      const tourOperator = await TourOperator.findOne({ code: tourOperatorCode });
      
      if (!tourOperator) {
        throw new Error(`Tour operator not found with code: ${tourOperatorCode}`);
      }
      
      logger.info(`Processing inbound booking from ${tourOperator.name}`, {
        externalLocator
      });
      
      // Verificar si ya existe
      let existingBooking = await Booking.findOne({
        'b2b.externalLocator': externalLocator,
        'b2b.tourOperator': tourOperator._id
      });
      
      if (existingBooking) {
        logger.info(`Inbound booking already exists, updating: ${externalLocator}`);
        return await this.updateInboundBooking(existingBooking, bookingData);
      }
      
      // Crear nueva reserva local
      const localBooking = await this.createLocalBooking({
        bookingNumber: this.generateBookingNumber(),
        customer: bookingData.customer,
        destination: bookingData.destination,
        tripType: bookingData.tripType || 'leisure',
        startDate: bookingData.startDate,
        endDate: bookingData.endDate,
        totalPrice: bookingData.totalPrice,
        currency: bookingData.currency || 'USD',
        numberOfTravelers: bookingData.numberOfTravelers,
        services: bookingData.services,
        status: bookingData.status || 'confirmed',
        b2b: {
          isB2B: true,
          relationship: 'inbound',
          tourOperator: tourOperator._id,
          externalLocator,
          sourceSystem: tourOperator.apiSystem.type,
          commission: this.calculateCommission(bookingData.totalPrice, tourOperator),
          pricing: this.calculatePricing(bookingData.totalPrice, tourOperator),
          syncStatus: {
            lastSync: new Date(),
            syncErrors: 0,
            needsSync: false
          }
        }
      });
      
      this.emit('inboundBookingCreated', {
        booking: localBooking,
        tourOperator: tourOperator.name
      });
      
      return localBooking;
      
    } catch (error) {
      logger.error('Error processing inbound booking', error);
      throw error;
    }
  }
  
  /**
   * Actualizar reserva entrante
   */
  async updateInboundBooking(booking, updatedData) {
    try {
      // Actualizar campos relevantes
      if (updatedData.status) booking.status = updatedData.status;
      if (updatedData.totalPrice) booking.totalPrice = updatedData.totalPrice;
      if (updatedData.services) booking.services = updatedData.services;
      
      booking.b2b.syncStatus.lastSync = new Date();
      booking.b2b.syncStatus.needsSync = false;
      
      await booking.save();
      
      this.emit('inboundBookingUpdated', { booking });
      
      return booking;
      
    } catch (error) {
      logger.error('Error updating inbound booking', error);
      throw error;
    }
  }
  
  /**
   * ========== SINCRONIZACIÓN ==========
   */
  
  /**
   * Sincronizar estado de reserva con sistema externo
   */
  async syncBookingStatus(bookingId) {
    try {
      const booking = await Booking.findById(bookingId).populate('b2b.tourOperator');
      
      if (!booking || !booking.b2b.isB2B || booking.b2b.relationship !== 'outbound') {
        throw new Error('Invalid booking for sync');
      }
      
      const { tourOperator, externalLocator } = booking.b2b;
      
      logger.info(`Syncing booking status ${externalLocator} with ${tourOperator.name}`);
      
      // Leer estado actual del sistema externo
      const externalBooking = await this.adapter.readBooking(
        tourOperator._id,
        externalLocator
      );
      
      // Actualizar estado local si cambió
      const externalStatus = externalBooking.Status || externalBooking.status;
      const needsUpdate = this.mapExternalStatus(externalStatus) !== booking.status;
      
      if (needsUpdate) {
        booking.status = this.mapExternalStatus(externalStatus);
        booking.b2b.syncStatus.lastSync = new Date();
        booking.b2b.syncStatus.needsSync = false;
        await booking.save();
        
        this.emit('bookingStatusSynced', {
          booking,
          oldStatus: booking.status,
          newStatus: externalStatus
        });
      }
      
      return {
        synced: needsUpdate,
        currentStatus: booking.status,
        externalStatus
      };
      
    } catch (error) {
      logger.error('Error syncing booking status', error);
      
      // Marcar como necesita sincronización
      if (bookingId) {
        await Booking.findByIdAndUpdate(bookingId, {
          'b2b.syncStatus.syncErrors': { $inc: 1 },
          'b2b.syncStatus.lastError': error.message,
          'b2b.syncStatus.needsSync': true
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Agregar booking a cola de sincronización
   */
  addToSyncQueue(bookingId, priority = 'normal') {
    this.syncQueue.push({
      bookingId,
      priority,
      addedAt: new Date()
    });
    
    // Ordenar por prioridad
    this.syncQueue.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return a.addedAt - b.addedAt;
    });
    
    this.stats.pendingQueue = this.syncQueue.length;
    
    logger.info(`Booking ${bookingId} added to sync queue (${this.syncQueue.length} pending)`);
  }
  
  /**
   * Procesar cola de sincronización
   */
  startQueueProcessor() {
    setInterval(async () => {
      if (this.isProcessing || this.syncQueue.length === 0) {
        return;
      }
      
      this.isProcessing = true;
      
      try {
        const item = this.syncQueue.shift();
        this.stats.pendingQueue = this.syncQueue.length;
        
        logger.info(`Processing sync queue item: ${item.bookingId}`);
        
        await this.syncBookingStatus(item.bookingId);
        
        this.stats.totalSyncs++;
        this.stats.successfulSyncs++;
        
      } catch (error) {
        this.stats.failedSyncs++;
        logger.error('Error processing sync queue item', error);
      } finally {
        this.isProcessing = false;
      }
      
    }, 5000); // Procesar cada 5 segundos
  }
  
  /**
   * Sincronizar todas las reservas pendientes
   */
  async syncAllPending() {
    try {
      // Buscar reservas que necesitan sincronización
      const pendingBookings = await Booking.find({
        'b2b.isB2B': true,
        'b2b.relationship': 'outbound',
        'b2b.syncStatus.needsSync': true,
        status: { $ne: 'cancelled' }
      }).limit(50);
      
      logger.info(`Found ${pendingBookings.length} bookings needing sync`);
      
      for (const booking of pendingBookings) {
        this.addToSyncQueue(booking._id.toString(), 'normal');
      }
      
      return {
        queued: pendingBookings.length,
        totalPending: this.syncQueue.length
      };
      
    } catch (error) {
      logger.error('Error syncing all pending bookings', error);
      throw error;
    }
  }
  
  /**
   * ========== UTILIDADES ==========
   */
  
  /**
   * Calcular comisión
   */
  calculateCommission(price, tourOperator) {
    const defaultCommission = tourOperator.businessTerms.defaultCommission;
    
    let commissionAmount = 0;
    
    if (defaultCommission.type === 'percentage') {
      commissionAmount = (price * defaultCommission.value) / 100;
    } else {
      commissionAmount = defaultCommission.value;
    }
    
    return {
      type: defaultCommission.type,
      value: defaultCommission.value,
      amount: commissionAmount,
      currency: tourOperator.businessTerms.currency
    };
  }
  
  /**
   * Calcular pricing detallado
   */
  calculatePricing(basePrice, tourOperator) {
    const commission = this.calculateCommission(basePrice, tourOperator);
    
    return {
      netPrice: basePrice,
      grossPrice: basePrice + commission.amount,
      costPrice: basePrice,
      sellingPrice: basePrice + commission.amount,
      margin: commission.amount,
      taxes: 0, // Calcular según reglas fiscales
      currency: tourOperator.businessTerms.currency
    };
  }
  
  /**
   * Mapear estado externo a estado local
   */
  mapExternalStatus(externalStatus) {
    const statusMap = {
      'CONFIRMED': 'confirmed',
      'PENDING': 'pending',
      'CANCELLED': 'cancelled',
      'COMPLETED': 'completed',
      'OK': 'confirmed',
      'RQ': 'pending'
    };
    
    return statusMap[externalStatus] || 'pending';
  }
  
  /**
   * Generar número de reserva
   */
  generateBookingNumber() {
    const prefix = 'SPT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
  
  /**
   * Crear booking local
   */
  async createLocalBooking(bookingData) {
    const booking = new Booking(bookingData);
    await booking.save();
    return booking;
  }
  
  /**
   * Obtener estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this.syncQueue.length,
      isProcessing: this.isProcessing
    };
  }
  
  /**
   * Shutdown
   */
  async shutdown() {
    logger.info('Shutting down B2B Booking Sync');
    this.removeAllListeners();
  }
}

// Singleton
let syncInstance = null;

function getB2BBookingSync() {
  if (!syncInstance) {
    syncInstance = new B2BBookingSync();
  }
  return syncInstance;
}

module.exports = {
  B2BBookingSync,
  getB2BBookingSync
};
