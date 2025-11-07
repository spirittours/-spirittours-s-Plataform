/**
 * eJuniper Integration Service
 * 
 * Integración completa con el sistema eJuniper de Euroriente y otros operadores
 * Soporta operaciones SOAP para hoteles, paquetes, vuelos, transfers
 * 
 * API Documentation: https://api-edocs.ejuniper.com/
 * WSDL: https://xml-uat.bookingengine.es/WebService/JP/WebServiceJP.asmx?WSDL
 */

const soap = require('soap');
const xml2js = require('xml2js');
const EventEmitter = require('events');
const logger = require('../logging/logger');

class EJuniperIntegration extends EventEmitter {
  constructor(tourOperator) {
    super();
    
    if (!tourOperator || tourOperator.apiSystem.type !== 'ejuniper') {
      throw new Error('Invalid tour operator or system type');
    }
    
    this.tourOperator = tourOperator;
    this.credentials = tourOperator.getDecryptedCredentials();
    this.config = tourOperator.apiSystem.config;
    
    // Endpoints
    this.wsdlUrl = tourOperator.apiSystem.endpoints.wsdl || 
      (this.config.environment === 'production' 
        ? 'https://xml.bookingengine.es/WebService/JP/WebServiceJP.asmx?WSDL'
        : 'https://xml-uat.bookingengine.es/WebService/JP/WebServiceJP.asmx?WSDL');
    
    this.soapClient = null;
    this.isInitialized = false;
    
    // Cache para datos estáticos
    this.cache = {
      zones: new Map(),
      hotels: new Map(),
      catalogData: new Map(),
      lastUpdate: null
    };
    
    // Estadísticas
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: null
    };
  }
  
  /**
   * Inicializar cliente SOAP
   */
  async initialize() {
    try {
      logger.info(`Initializing eJuniper SOAP client for ${this.tourOperator.name}`);
      
      const soapOptions = {
        wsdl_options: {
          timeout: this.config.timeout || 30000
        },
        endpoint: this.config.environment === 'production' 
          ? this.tourOperator.apiSystem.endpoints.production
          : this.tourOperator.apiSystem.endpoints.sandbox
      };
      
      this.soapClient = await soap.createClientAsync(this.wsdlUrl, soapOptions);
      
      // Añadir headers de autenticación
      this.soapClient.addSoapHeader(this.buildAuthHeader());
      
      this.isInitialized = true;
      
      logger.info(`eJuniper client initialized successfully for ${this.tourOperator.name}`);
      
      return true;
      
    } catch (error) {
      logger.error(`Failed to initialize eJuniper client: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Construir header de autenticación SOAP
   */
  buildAuthHeader() {
    return {
      Credentials: {
        User: this.credentials.username,
        Password: this.credentials.password,
        Agency: this.credentials.agencyCode || this.credentials.accountId
      }
    };
  }
  
  /**
   * Wrapper genérico para llamadas SOAP con retry y tracking
   */
  async soapRequest(method, params) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const startTime = Date.now();
    let attempt = 0;
    const maxAttempts = this.config.retryAttempts || 3;
    
    while (attempt < maxAttempts) {
      try {
        this.stats.totalRequests++;
        
        logger.info(`eJuniper SOAP request: ${method}`, { 
          operator: this.tourOperator.name,
          attempt: attempt + 1 
        });
        
        const result = await this.soapClient[method + 'Async'](params);
        
        const responseTime = Date.now() - startTime;
        this.stats.successfulRequests++;
        this.stats.lastRequestTime = responseTime;
        this.stats.averageResponseTime = 
          (this.stats.averageResponseTime * (this.stats.successfulRequests - 1) + responseTime) / 
          this.stats.successfulRequests;
        
        logger.info(`eJuniper SOAP response: ${method}`, {
          operator: this.tourOperator.name,
          responseTime: `${responseTime}ms`,
          success: true
        });
        
        this.emit('requestSuccess', { method, params, result, responseTime });
        
        return result[0]; // soap retorna array de resultados
        
      } catch (error) {
        attempt++;
        
        logger.error(`eJuniper SOAP error on attempt ${attempt}: ${error.message}`, {
          method,
          operator: this.tourOperator.name,
          error: error.message
        });
        
        if (attempt >= maxAttempts) {
          this.stats.failedRequests++;
          this.emit('requestError', { method, params, error, attempts: attempt });
          throw error;
        }
        
        // Esperar antes de retry
        await this.delay(this.config.retryDelay || 1000);
      }
    }
  }
  
  /**
   * ========== OPERACIONES DE HOTELES ==========
   */
  
  /**
   * Obtener listado de zonas/destinos
   */
  async getZoneList() {
    try {
      const result = await this.soapRequest('ZoneList', {});
      
      // Parsear y cachear zonas
      if (result && result.Zones) {
        result.Zones.Zone.forEach(zone => {
          this.cache.zones.set(zone.Code, {
            code: zone.Code,
            name: zone.Name,
            country: zone.Country,
            type: zone.Type
          });
        });
      }
      
      return Array.from(this.cache.zones.values());
      
    } catch (error) {
      logger.error('Error getting zone list from eJuniper', error);
      throw error;
    }
  }
  
  /**
   * Obtener catálogo de hoteles
   */
  async getHotelPortfolio(zoneCode = null) {
    try {
      const params = zoneCode ? { ZoneCode: zoneCode } : {};
      const result = await this.soapRequest('HotelPortfolio', params);
      
      // Cachear información de hoteles
      if (result && result.Hotels) {
        result.Hotels.Hotel.forEach(hotel => {
          this.cache.hotels.set(hotel.JPCode, {
            jpCode: hotel.JPCode,
            jpDCode: hotel.JPDCode,
            name: hotel.Name,
            zone: hotel.Zone,
            category: hotel.Category,
            address: hotel.Address
          });
        });
      }
      
      return result;
      
    } catch (error) {
      logger.error('Error getting hotel portfolio from eJuniper', error);
      throw error;
    }
  }
  
  /**
   * Obtener contenido detallado de hotel
   */
  async getHotelContent(hotelCode) {
    try {
      const result = await this.soapRequest('HotelContent', {
        HotelCode: hotelCode
      });
      
      return result;
      
    } catch (error) {
      logger.error(`Error getting hotel content for ${hotelCode}`, error);
      throw error;
    }
  }
  
  /**
   * Obtener datos de catálogo (categorías, tipos de habitación, regímenes)
   */
  async getHotelCatalogueData() {
    try {
      const result = await this.soapRequest('HotelCatalogueData', {});
      
      // Cachear datos del catálogo
      this.cache.catalogData.set('categories', result.Categories);
      this.cache.catalogData.set('roomTypes', result.RoomTypes);
      this.cache.catalogData.set('boardTypes', result.BoardTypes);
      this.cache.catalogData.set('supplementTypes', result.SupplementTypes);
      this.cache.lastUpdate = new Date();
      
      return result;
      
    } catch (error) {
      logger.error('Error getting catalogue data from eJuniper', error);
      throw error;
    }
  }
  
  /**
   * Buscar disponibilidad de hoteles
   * @param {Object} searchParams - Parámetros de búsqueda
   * @param {String} searchParams.destination - Código de destino
   * @param {Date} searchParams.checkIn - Fecha de entrada
   * @param {Date} searchParams.checkOut - Fecha de salida
   * @param {Array} searchParams.rooms - Array de habitaciones [{adults: 2, children: 0, childAges: []}]
   * @param {Array} searchParams.hotelCodes - (Opcional) Códigos específicos de hoteles
   */
  async searchHotelAvailability(searchParams) {
    try {
      const { destination, checkIn, checkOut, rooms, hotelCodes } = searchParams;
      
      // Construir request XML
      const requestParams = {
        Destination: destination,
        FromDate: this.formatDate(checkIn),
        ToDate: this.formatDate(checkOut),
        Rooms: {
          Room: rooms.map(room => ({
            Adults: room.adults,
            Children: room.children || 0,
            ChildAges: room.childAges ? {
              Age: room.childAges
            } : undefined
          }))
        }
      };
      
      if (hotelCodes && hotelCodes.length > 0) {
        requestParams.HotelCodes = {
          HotelCode: hotelCodes
        };
      }
      
      const result = await this.soapRequest('HotelAvail', requestParams);
      
      // Parsear resultados
      return this.parseHotelAvailabilityResults(result);
      
    } catch (error) {
      logger.error('Error searching hotel availability', error);
      throw error;
    }
  }
  
  /**
   * Verificar disponibilidad de un RatePlanCode específico
   */
  async checkHotelAvailability(ratePlanCode) {
    try {
      const result = await this.soapRequest('HotelCheckAvail', {
        RatePlanCode: ratePlanCode
      });
      
      return result;
      
    } catch (error) {
      logger.error(`Error checking availability for rate plan ${ratePlanCode}`, error);
      throw error;
    }
  }
  
  /**
   * Obtener reglas de reserva y BookingCode
   * MANDATORY antes de crear booking
   */
  async getHotelBookingRules(ratePlanCode) {
    try {
      const result = await this.soapRequest('HotelBookingRules', {
        RatePlanCode: ratePlanCode
      });
      
      // Extraer BookingCode y políticas
      const bookingCode = result.HotelOptions?.HotelOption?.BookingCode;
      const expirationDate = result.HotelOptions?.HotelOption?.BookingCode?.$?.ExpirationDate;
      const cancellationPolicies = result.HotelOptions?.HotelOption?.CancellationPolicies;
      const requiredFields = result.HotelOptions?.HotelOption?.HotelRequiredFields;
      
      return {
        bookingCode,
        expirationDate,
        cancellationPolicies,
        requiredFields,
        fullResponse: result
      };
      
    } catch (error) {
      logger.error(`Error getting booking rules for ${ratePlanCode}`, error);
      throw error;
    }
  }
  
  /**
   * Crear reserva de hotel
   * @param {Object} bookingData - Datos de la reserva
   * @param {String} bookingData.bookingCode - BookingCode obtenido de HotelBookingRules
   * @param {Array} bookingData.passengers - Información de pasajeros
   * @param {Object} bookingData.contact - Información de contacto
   * @param {Array} bookingData.supplements - (Opcional) Suplementos adicionales
   */
  async createHotelBooking(bookingData) {
    try {
      const { bookingCode, passengers, contact, supplements, remarks } = bookingData;
      
      const requestParams = {
        BookingCode: bookingCode,
        HotelRequiredFields: {
          PaxList: {
            Pax: passengers.map((pax, index) => ({
              $: { IdPax: index + 1 },
              Name: pax.firstName,
              Surname: pax.lastName,
              Type: pax.type || 'ADULT', // ADULT, CHILD, INFANT
              Age: pax.age,
              DocumentType: pax.documentType,
              DocumentNumber: pax.documentNumber
            }))
          },
          Contact: {
            Email: contact.email,
            Phone: contact.phone,
            Name: contact.name
          }
        }
      };
      
      // Añadir suplementos si existen
      if (supplements && supplements.length > 0) {
        requestParams.HotelRequiredFields.AdditionalElements = {
          HotelSupplements: {
            HotelSupplement: supplements.map(supp => ({
              $: {
                Code: supp.code,
                RatePlanCode: supp.ratePlanCode
              }
            }))
          }
        };
      }
      
      // Añadir observaciones
      if (remarks) {
        requestParams.HotelRequiredFields.Remarks = remarks;
      }
      
      const result = await this.soapRequest('HotelBooking', requestParams);
      
      // Extraer Locator (identificador de reserva)
      const locator = result.BookingConfirmation?.Locator || result.Locator;
      const status = result.BookingConfirmation?.Status || result.Status;
      
      return {
        locator,
        status,
        fullResponse: result
      };
      
    } catch (error) {
      logger.error('Error creating hotel booking', error);
      throw error;
    }
  }
  
  /**
   * Leer detalles de una reserva existente
   */
  async readBooking(locator) {
    try {
      const result = await this.soapRequest('ReadBooking', {
        Locator: locator
      });
      
      return result;
      
    } catch (error) {
      logger.error(`Error reading booking ${locator}`, error);
      throw error;
    }
  }
  
  /**
   * Cancelar reserva
   */
  async cancelBooking(locator, elementId = null) {
    try {
      const params = { Locator: locator };
      
      // Si se especifica elementId, cancelar solo ese elemento
      if (elementId) {
        params.ElementId = elementId;
      }
      
      const result = await this.soapRequest('CancelBooking', params);
      
      return {
        locator,
        status: result.CancelResult?.Status,
        cancellationPolicies: result.CancelResult?.CancellationPolicies,
        refundAmount: result.CancelResult?.RefundAmount,
        fullResponse: result
      };
      
    } catch (error) {
      logger.error(`Error cancelling booking ${locator}`, error);
      throw error;
    }
  }
  
  /**
   * ========== OPERACIONES DE PAQUETES ==========
   */
  
  /**
   * Obtener listado de paquetes
   */
  async getPackageList(zoneCode = null) {
    try {
      const params = zoneCode ? { ZoneCode: zoneCode } : {};
      const result = await this.soapRequest('PackageList', params);
      
      return result;
      
    } catch (error) {
      logger.error('Error getting package list', error);
      throw error;
    }
  }
  
  /**
   * Obtener contenido de paquete
   */
  async getPackageContent(packageCode) {
    try {
      const result = await this.soapRequest('PackageContent', {
        PackageCode: packageCode
      });
      
      return result;
      
    } catch (error) {
      logger.error(`Error getting package content for ${packageCode}`, error);
      throw error;
    }
  }
  
  /**
   * Buscar disponibilidad de paquetes
   */
  async searchPackageAvailability(searchParams) {
    try {
      const { destination, departureDate, returnDate, passengers, packageCode } = searchParams;
      
      const requestParams = {
        Destination: destination,
        DepartureDate: this.formatDate(departureDate),
        ReturnDate: this.formatDate(returnDate),
        Passengers: {
          Passenger: passengers.map(pax => ({
            Type: pax.type, // ADULT, CHILD, INFANT
            Age: pax.age
          }))
        }
      };
      
      if (packageCode) {
        requestParams.PackageCode = packageCode;
      }
      
      const result = await this.soapRequest('PackageAvail', requestParams);
      
      return this.parsePackageAvailabilityResults(result);
      
    } catch (error) {
      logger.error('Error searching package availability', error);
      throw error;
    }
  }
  
  /**
   * Verificar disponibilidad de paquete
   */
  async checkPackageAvailability(ratePlanCode) {
    try {
      const result = await this.soapRequest('PackageCheckAvail', {
        RatePlanCode: ratePlanCode
      });
      
      return result;
      
    } catch (error) {
      logger.error(`Error checking package availability for ${ratePlanCode}`, error);
      throw error;
    }
  }
  
  /**
   * Cambiar producto dentro de un paquete
   */
  async changePackageProduct(ratePlanCode, productType, newProductCode) {
    try {
      const result = await this.soapRequest('PackageChangeProduct', {
        RatePlanCode: ratePlanCode,
        ProductType: productType, // 'hotel', 'flight', etc.
        NewProductCode: newProductCode
      });
      
      return result;
      
    } catch (error) {
      logger.error('Error changing package product', error);
      throw error;
    }
  }
  
  /**
   * Obtener reglas de reserva de paquete
   */
  async getPackageBookingRules(ratePlanCode) {
    try {
      const result = await this.soapRequest('PackageBookingRules', {
        RatePlanCode: ratePlanCode
      });
      
      const bookingCode = result.PackageOptions?.PackageOption?.BookingCode;
      const expirationDate = result.PackageOptions?.PackageOption?.BookingCode?.$?.ExpirationDate;
      
      return {
        bookingCode,
        expirationDate,
        requiredFields: result.PackageOptions?.PackageOption?.PackageRequiredFields,
        fullResponse: result
      };
      
    } catch (error) {
      logger.error(`Error getting package booking rules for ${ratePlanCode}`, error);
      throw error;
    }
  }
  
  /**
   * Crear reserva de paquete
   */
  async createPackageBooking(bookingData) {
    try {
      const { bookingCode, passengers, contact, remarks } = bookingData;
      
      const requestParams = {
        BookingCode: bookingCode,
        PackageRequiredFields: {
          PaxList: {
            Pax: passengers.map((pax, index) => ({
              $: { IdPax: index + 1 },
              Name: pax.firstName,
              Surname: pax.lastName,
              Type: pax.type,
              Age: pax.age,
              DocumentType: pax.documentType,
              DocumentNumber: pax.documentNumber
            }))
          },
          Contact: {
            Email: contact.email,
            Phone: contact.phone,
            Name: contact.name
          }
        }
      };
      
      if (remarks) {
        requestParams.PackageRequiredFields.Remarks = remarks;
      }
      
      const result = await this.soapRequest('PackageBooking', requestParams);
      
      const locator = result.BookingConfirmation?.Locator || result.Locator;
      const status = result.BookingConfirmation?.Status || result.Status;
      
      return {
        locator,
        status,
        fullResponse: result
      };
      
    } catch (error) {
      logger.error('Error creating package booking', error);
      throw error;
    }
  }
  
  /**
   * ========== UTILIDADES ==========
   */
  
  /**
   * Formatear fecha para eJuniper (yyyy-MM-dd)
   */
  formatDate(date) {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Parsear resultados de disponibilidad de hoteles
   */
  parseHotelAvailabilityResults(result) {
    const hotels = [];
    
    if (!result || !result.HotelResults || !result.HotelResults.HotelResult) {
      return hotels;
    }
    
    const hotelResults = Array.isArray(result.HotelResults.HotelResult) 
      ? result.HotelResults.HotelResult 
      : [result.HotelResults.HotelResult];
    
    hotelResults.forEach(hotel => {
      const options = Array.isArray(hotel.HotelOptions?.HotelOption)
        ? hotel.HotelOptions.HotelOption
        : hotel.HotelOptions?.HotelOption ? [hotel.HotelOptions.HotelOption] : [];
      
      options.forEach(option => {
        hotels.push({
          hotelCode: hotel.$.Code,
          hotelJPCode: hotel.$.JPCode,
          hotelName: this.cache.hotels.get(hotel.$.JPCode)?.name || hotel.$.Code,
          destination: hotel.$.DestinationZone,
          ratePlanCode: option.$.RatePlanCode,
          status: option.$.Status,
          nonRefundable: option.$.NonRefundable === 'true',
          boardType: option.Board?.$.Type,
          boardName: option.Board?._,
          price: {
            currency: option.Prices?.Price?.$.Currency,
            gross: parseFloat(option.Prices?.Price?.TotalFixAmounts?.$.Gross),
            net: parseFloat(option.Prices?.Price?.TotalFixAmounts?.$.Nett),
            serviceAmount: parseFloat(option.Prices?.Price?.TotalFixAmounts?.Service?.$.Amount),
            taxesAmount: parseFloat(option.Prices?.Price?.TotalFixAmounts?.ServiceTaxes?.$.Amount),
            taxesIncluded: option.Prices?.Price?.TotalFixAmounts?.ServiceTaxes?.$.Included === 'true'
          },
          rooms: this.parseRooms(option.HotelRooms),
          offers: this.parseOffers(option.AdditionalElements?.HotelOffers),
          supplements: this.parseSupplements(option.AdditionalElements?.HotelSupplements)
        });
      });
    });
    
    return hotels;
  }
  
  /**
   * Parsear habitaciones
   */
  parseRooms(hotelRooms) {
    if (!hotelRooms || !hotelRooms.HotelRoom) {
      return [];
    }
    
    const rooms = Array.isArray(hotelRooms.HotelRoom) 
      ? hotelRooms.HotelRoom 
      : [hotelRooms.HotelRoom];
    
    return rooms.map(room => ({
      units: parseInt(room.$.Units),
      availableRooms: parseInt(room.$.AvailRooms),
      name: room.Name,
      category: room.RoomCategory?._,
      categoryType: room.RoomCategory?.$.Type,
      occupancy: {
        total: parseInt(room.RoomOccupancy?.$.Occupancy),
        adults: parseInt(room.RoomOccupancy?.$.Adults),
        children: parseInt(room.RoomOccupancy?.$.Children)
      }
    }));
  }
  
  /**
   * Parsear ofertas
   */
  parseOffers(hotelOffers) {
    if (!hotelOffers || !hotelOffers.HotelOffer) {
      return [];
    }
    
    const offers = Array.isArray(hotelOffers.HotelOffer)
      ? hotelOffers.HotelOffer
      : [hotelOffers.HotelOffer];
    
    return offers.map(offer => ({
      code: offer.$.Code,
      name: offer.Name,
      description: offer.Description,
      category: offer.$.Category
    }));
  }
  
  /**
   * Parsear suplementos
   */
  parseSupplements(hotelSupplements) {
    if (!hotelSupplements || !hotelSupplements.HotelSupplement) {
      return [];
    }
    
    const supplements = Array.isArray(hotelSupplements.HotelSupplement)
      ? hotelSupplements.HotelSupplement
      : [hotelSupplements.HotelSupplement];
    
    return supplements.map(supp => ({
      code: supp.$.Code,
      name: supp.Name,
      description: supp.Description,
      type: supp.$.Type,
      category: supp.$.Category,
      optional: supp.$.Optional === 'true',
      directPayment: supp.$.DirectPayment === 'true',
      amount: parseFloat(supp.$.Amount),
      currency: supp.$.Currency
    }));
  }
  
  /**
   * Parsear resultados de disponibilidad de paquetes
   */
  parsePackageAvailabilityResults(result) {
    const packages = [];
    
    if (!result || !result.PackageResults || !result.PackageResults.PackageResult) {
      return packages;
    }
    
    const packageResults = Array.isArray(result.PackageResults.PackageResult)
      ? result.PackageResults.PackageResult
      : [result.PackageResults.PackageResult];
    
    packageResults.forEach(pkg => {
      packages.push({
        packageCode: pkg.$.Code,
        packageName: pkg.Name,
        destination: pkg.$.Destination,
        ratePlanCode: pkg.$.RatePlanCode,
        price: {
          currency: pkg.Price?.$.Currency,
          total: parseFloat(pkg.Price?.$.Total)
        },
        stays: pkg.Stays,
        flights: pkg.Flights,
        transfers: pkg.Transfers,
        services: pkg.Services
      });
    });
    
    return packages;
  }
  
  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Intentar obtener lista de zonas como test
      await this.getZoneList();
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      return { 
        status: 'error', 
        error: error.message, 
        timestamp: new Date() 
      };
    }
  }
  
  /**
   * Obtener estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: {
        zones: this.cache.zones.size,
        hotels: this.cache.hotels.size,
        lastUpdate: this.cache.lastUpdate
      },
      isInitialized: this.isInitialized,
      operator: this.tourOperator.name
    };
  }
}

module.exports = EJuniperIntegration;
