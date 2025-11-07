/**
 * Tour Operators Admin Routes
 * Gestión de operadores turísticos B2B
 * Integración OPCIONAL y configurable desde panel admin
 */

const express = require('express');
const router = express.Router();
const TourOperator = require('../../models/TourOperator');
const { getTourOperatorAdapter } = require('../../services/integration/TourOperatorAdapter');
const { getB2BBookingSync } = require('../../services/integration/B2BBookingSync');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../../middleware/auth');
const {
  requireAuth,
  requireSystemAdmin,
  requireOperatorAdmin,
  requirePermission,
  checkOperatorOwnership,
  checkCredentialsAccess,
  buildOperatorAccessFilter,
  PERMISSIONS,
  ROLES,
} = require('../../middleware/permissions');

// Apply authentication to all routes
router.use(authMiddleware);

// ===== GESTIÓN DE OPERADORES =====

/**
 * GET /api/admin/tour-operators
 * Listar todos los operadores turísticos
 * Permisos: system_admin ve todos, operator_admin ve solo el suyo
 */
router.get('/', requirePermission(PERMISSIONS.TOUR_OPERATORS_READ_ALL, PERMISSIONS.TOUR_OPERATORS_READ_OWN), async (req, res) => {
  try {
    const { status, type, relationship, systemType } = req.query;
    
    // Base filter
    let filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (relationship) filter.relationship = { $in: [relationship, 'both'] };
    if (systemType) filter['apiSystem.type'] = systemType;
    
    // Apply operator access filter based on user role
    filter = buildOperatorAccessFilter(req.user, filter);
    
    const operators = await TourOperator.find(filter)
      .select('-apiSystem.credentials') // No exponer credenciales
      .sort({ name: 1 });
    
    res.json({
      success: true,
      count: operators.length,
      data: operators,
      userRole: req.user.role,
    });
    
  } catch (error) {
    console.error('Error listing tour operators:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener operadores turísticos',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/tour-operators/:id
 * Obtener detalles de un operador específico
 * Permisos: Requiere ownership check
 */
router.get('/:id', requirePermission(PERMISSIONS.TOUR_OPERATORS_READ_ALL, PERMISSIONS.TOUR_OPERATORS_READ_OWN), checkOperatorOwnership, async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id)
      .select('-apiSystem.credentials'); // No exponer credenciales
    
    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operador no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: operator
    });
    
  } catch (error) {
    console.error('Error getting tour operator:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener operador',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/tour-operators
 * Crear nuevo operador turístico (INTEGRACIÓN OPCIONAL)
 * Permisos: Solo system_admin puede crear operadores
 */
router.post('/', requirePermission(PERMISSIONS.TOUR_OPERATORS_CREATE), [
  body('name').notEmpty().withMessage('Nombre es requerido'),
  body('businessName').notEmpty().withMessage('Razón social es requerida'),
  body('code').notEmpty().withMessage('Código es requerido'),
  body('type').isIn(['receptive', 'wholesaler', 'dmc', 'bedbank', 'aggregator', 'direct_supplier']),
  body('relationship').isIn(['supplier', 'buyer', 'both']),
  body('contact.primaryEmail').isEmail().withMessage('Email válido es requerido'),
  body('apiSystem.type').isIn(['ejuniper', 'amadeus', 'sabre', 'travelport', 'hotelbeds', 'beds24', 'xml_custom', 'rest_custom', 'soap_custom', 'webhook', 'manual'])
], async (req, res) => {
  try {
    // Validar errores
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    // Verificar si el código ya existe
    const existingOperator = await TourOperator.findOne({ code: req.body.code });
    if (existingOperator) {
      return res.status(400).json({
        success: false,
        error: 'El código del operador ya existe'
      });
    }
    
    // Crear operador
    const operator = new TourOperator({
      ...req.body,
      status: 'pending_approval', // Por defecto pendiente
      integrationStatus: {
        isConfigured: false,
        isActive: false,
        healthStatus: 'unknown'
      },
      createdBy: req.user?._id // Si hay autenticación
    });
    
    await operator.save();
    
    // Agregar log de auditoría
    await operator.addAuditLog('created', req.user?._id, {
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    res.status(201).json({
      success: true,
      message: 'Operador turístico creado exitosamente',
      data: operator
    });
    
  } catch (error) {
    console.error('Error creating tour operator:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear operador',
      message: error.message
    });
  }
});

/**
 * PUT /api/admin/tour-operators/:id
 * Actualizar operador turístico
 * Permisos: system_admin puede actualizar todos, operator_admin solo el suyo
 */
router.put('/:id', requirePermission(PERMISSIONS.TOUR_OPERATORS_UPDATE_ALL, PERMISSIONS.TOUR_OPERATORS_UPDATE_OWN), checkOperatorOwnership, async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operador no encontrado'
      });
    }
    
    // Guardar cambios para auditoría
    const changes = {};
    Object.keys(req.body).forEach(key => {
      if (JSON.stringify(operator[key]) !== JSON.stringify(req.body[key])) {
        changes[key] = {
          old: operator[key],
          new: req.body[key]
        };
      }
    });
    
    // Actualizar campos
    Object.assign(operator, req.body);
    operator.lastModifiedBy = req.user?._id;
    
    await operator.save();
    
    // Agregar log de auditoría
    if (Object.keys(changes).length > 0) {
      await operator.addAuditLog('updated', req.user?._id, {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }, changes);
    }
    
    res.json({
      success: true,
      message: 'Operador actualizado exitosamente',
      data: operator
    });
    
  } catch (error) {
    console.error('Error updating tour operator:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar operador',
      message: error.message
    });
  }
});

/**
 * DELETE /api/admin/tour-operators/:id
 * Eliminar operador turístico
 * Permisos: Solo system_admin puede eliminar operadores
 */
router.delete('/:id', requirePermission(PERMISSIONS.TOUR_OPERATORS_DELETE), async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operador no encontrado'
      });
    }
    
    // Verificar si tiene reservas activas
    const Booking = require('../../models/Booking');
    const activeBookings = await Booking.countDocuments({
      'b2b.tourOperator': operator._id,
      status: { $in: ['pending', 'confirmed'] }
    });
    
    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        error: `No se puede eliminar. Tiene ${activeBookings} reservas activas`,
        activeBookings
      });
    }
    
    await operator.deleteOne();
    
    res.json({
      success: true,
      message: 'Operador eliminado exitosamente'
    });
    
  } catch (error) {
    console.error('Error deleting tour operator:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar operador',
      message: error.message
    });
  }
});

// ===== GESTIÓN DE ESTADO =====

/**
 * POST /api/admin/tour-operators/:id/activate
 * Activar operador (habilitar integración)
 * Permisos: system_admin o operator_admin pueden activar
 */
router.post('/:id/activate', requirePermission(PERMISSIONS.TOUR_OPERATORS_ACTIVATE), checkOperatorOwnership, async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operador no encontrado'
      });
    }
    
    // Verificar que esté configurado
    if (!operator.integrationStatus.isConfigured) {
      return res.status(400).json({
        success: false,
        error: 'Operador no está configurado. Configure las credenciales primero'
      });
    }
    
    await operator.activate(req.user?._id);
    
    res.json({
      success: true,
      message: 'Operador activado exitosamente',
      data: operator
    });
    
  } catch (error) {
    console.error('Error activating tour operator:', error);
    res.status(500).json({
      success: false,
      error: 'Error al activar operador',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/tour-operators/:id/deactivate
 * Desactivar operador (deshabilitar integración)
 * Permisos: system_admin o operator_admin pueden desactivar
 */
router.post('/:id/deactivate', requirePermission(PERMISSIONS.TOUR_OPERATORS_ACTIVATE), checkOperatorOwnership, [
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operador no encontrado'
      });
    }
    
    await operator.deactivate(req.user?._id, req.body.reason);
    
    res.json({
      success: true,
      message: 'Operador desactivado exitosamente',
      data: operator
    });
    
  } catch (error) {
    console.error('Error deactivating tour operator:', error);
    res.status(500).json({
      success: false,
      error: 'Error al desactivar operador',
      message: error.message
    });
  }
});

// ===== GESTIÓN DE CREDENCIALES =====

/**
 * PUT /api/admin/tour-operators/:id/credentials
 * Actualizar credenciales de integración
 * Permisos: system_admin puede actualizar todas, operator_admin solo las suyas
 */
router.put('/:id/credentials', requirePermission(PERMISSIONS.CREDENTIALS_UPDATE_ALL, PERMISSIONS.CREDENTIALS_UPDATE_OWN), checkCredentialsAccess('update'), [
  body('apiSystem.credentials').notEmpty().withMessage('Credenciales son requeridas'),
  body('apiSystem.credentials.username').optional().isString(),
  body('apiSystem.credentials.password').optional().isString(),
  body('apiSystem.credentials.apiKey').optional().isString(),
  body('apiSystem.credentials.agencyCode').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operador no encontrado'
      });
    }
    
    // Actualizar credenciales
    const { apiSystem } = req.body;
    
    if (apiSystem.credentials) {
      operator.apiSystem.credentials = {
        ...operator.apiSystem.credentials,
        ...apiSystem.credentials
      };
    }
    
    // Actualizar endpoints si se proporcionan
    if (apiSystem.endpoints) {
      operator.apiSystem.endpoints = {
        ...operator.apiSystem.endpoints,
        ...apiSystem.endpoints
      };
    }
    
    // Actualizar configuración si se proporciona
    if (apiSystem.config) {
      operator.apiSystem.config = {
        ...operator.apiSystem.config,
        ...apiSystem.config
      };
    }
    
    // Marcar como configurado
    operator.integrationStatus.isConfigured = true;
    operator.lastModifiedBy = req.user._id;
    
    await operator.save();
    
    // Log de auditoría
    await operator.addAuditLog('credentials_updated', req.user._id, {
      userAgent: req.get('User-Agent'),
      ip: req.ip
    }, { 
      credentialsUpdated: true,
      updatedBy: req.user.role 
    });
    
    // Retornar sin credenciales en la respuesta
    const response = operator.toObject();
    delete response.apiSystem.credentials;
    
    res.json({
      success: true,
      message: 'Credenciales actualizadas exitosamente',
      data: response
    });
    
  } catch (error) {
    console.error('Error updating credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar credenciales',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/tour-operators/:id/credentials
 * Obtener credenciales (enmascaradas para seguridad)
 * Permisos: system_admin puede ver todas, operator_admin solo las suyas
 */
router.get('/:id/credentials', requirePermission(PERMISSIONS.CREDENTIALS_VIEW_ALL, PERMISSIONS.CREDENTIALS_VIEW_OWN), checkCredentialsAccess('view'), async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operador no encontrado'
      });
    }
    
    // Enmascarar credenciales para seguridad
    const maskedCredentials = {};
    if (operator.apiSystem.credentials) {
      Object.keys(operator.apiSystem.credentials).forEach(key => {
        const value = operator.apiSystem.credentials[key];
        if (value && typeof value === 'string') {
          // Mostrar solo primeros y últimos caracteres
          if (value.length > 8) {
            maskedCredentials[key] = value.substring(0, 3) + '*****' + value.substring(value.length - 3);
          } else {
            maskedCredentials[key] = '********';
          }
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        operatorId: operator._id,
        operatorName: operator.name,
        apiSystem: {
          type: operator.apiSystem.type,
          credentials: maskedCredentials,
          endpoints: operator.apiSystem.endpoints,
          config: operator.apiSystem.config,
        },
        integrationStatus: operator.integrationStatus,
        isConfigured: operator.integrationStatus.isConfigured,
      }
    });
    
  } catch (error) {
    console.error('Error getting credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener credenciales',
      message: error.message
    });
  }
});

// ===== TESTING Y VALIDACIÓN =====

/**
 * POST /api/admin/tour-operators/:id/test
 * Test de conexión con operador (verificar credenciales)
 * Permisos: Requiere permiso de test y ownership check
 */
router.post('/:id/test', requirePermission(PERMISSIONS.INTEGRATION_TEST), checkOperatorOwnership, async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operador no encontrado'
      });
    }
    
    // Realizar health check
    const adapter = getTourOperatorAdapter();
    const startTime = Date.now();
    const healthResult = await adapter.healthCheck(req.params.id);
    const duration = Date.now() - startTime;
    
    // Actualizar estado
    const healthStatus = healthResult.status === 'healthy' ? 'healthy' : 'error';
    await operator.updateHealthStatus(healthStatus, healthResult.error || '');
    
    res.json({
      success: healthResult.status === 'healthy',
      message: healthResult.status === 'healthy' 
        ? 'Conexión exitosa' 
        : 'Error de conexión',
      data: {
        status: healthResult.status,
        responseTime: duration,
        timestamp: healthResult.timestamp,
        error: healthResult.error
      }
    });
    
  } catch (error) {
    console.error('Error testing tour operator connection:', error);
    
    // Actualizar estado de error
    const operator = await TourOperator.findById(req.params.id);
    if (operator) {
      await operator.updateHealthStatus('error', error.message);
    }
    
    res.status(500).json({
      success: false,
      error: 'Error al probar conexión',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/tour-operators/:id/health
 * Obtener estado de salud del operador
 */
router.get('/:id/health', async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operador no encontrado'
      });
    }
    
    const adapter = getTourOperatorAdapter();
    const stats = adapter.getOperatorStats(req.params.id);
    
    res.json({
      success: true,
      data: {
        operatorId: operator._id,
        operatorName: operator.name,
        integrationStatus: operator.integrationStatus,
        stats: stats || null
      }
    });
    
  } catch (error) {
    console.error('Error getting health status:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estado',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/tour-operators/:id/stats
 * Obtener estadísticas del operador
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operador no encontrado'
      });
    }
    
    // Obtener estadísticas de reservas
    const Booking = require('../../models/Booking');
    const bookingStats = await Booking.aggregate([
      { $match: { 'b2b.tourOperator': operator._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$b2b.pricing.sellingPrice' },
          totalMargin: { $sum: '$b2b.pricing.margin' }
        }
      }
    ]);
    
    const adapter = getTourOperatorAdapter();
    const apiStats = adapter.getOperatorStats(req.params.id);
    
    res.json({
      success: true,
      data: {
        operator: {
          id: operator._id,
          name: operator.name,
          status: operator.status
        },
        bookings: bookingStats,
        api: apiStats,
        sync: operator.integrationStatus.syncStats
      }
    });
    
  } catch (error) {
    console.error('Error getting operator stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
      message: error.message
    });
  }
});

// ===== BÚSQUEDA Y RESERVAS =====

/**
 * POST /api/admin/tour-operators/:id/search/hotels
 * Buscar hoteles en operador externo
 * Permisos: Requiere permiso de search
 */
router.post('/:id/search/hotels', requirePermission(PERMISSIONS.INTEGRATION_SEARCH), checkOperatorOwnership, [
  body('destination').notEmpty().withMessage('Destino es requerido'),
  body('checkIn').isISO8601().withMessage('Fecha de entrada inválida'),
  body('checkOut').isISO8601().withMessage('Fecha de salida inválida'),
  body('rooms').isArray({ min: 1 }).withMessage('Al menos una habitación requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator || !operator.integrationStatus.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Operador no activo'
      });
    }
    
    const sync = getB2BBookingSync();
    const results = await sync.searchExternalAvailability(req.params.id, {
      searchType: 'hotel',
      ...req.body
    });
    
    res.json({
      success: true,
      count: results.length,
      data: results
    });
    
  } catch (error) {
    console.error('Error searching hotels:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar hoteles',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/tour-operators/:id/search/packages
 * Buscar paquetes en operador externo
 * Permisos: Requiere permiso de search
 */
router.post('/:id/search/packages', requirePermission(PERMISSIONS.INTEGRATION_SEARCH), checkOperatorOwnership, [
  body('destination').notEmpty(),
  body('departureDate').isISO8601(),
  body('returnDate').isISO8601(),
  body('passengers').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator || !operator.integrationStatus.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Operador no activo'
      });
    }
    
    const sync = getB2BBookingSync();
    const results = await sync.searchExternalAvailability(req.params.id, {
      searchType: 'package',
      ...req.body
    });
    
    res.json({
      success: true,
      count: results.length,
      data: results
    });
    
  } catch (error) {
    console.error('Error searching packages:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar paquetes',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/tour-operators/:id/bookings
 * Crear reserva en operador externo
 */
router.post('/:id/bookings', async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator || !operator.integrationStatus.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Operador no activo'
      });
    }
    
    const sync = getB2BBookingSync();
    const result = await sync.createExternalBooking({
      operatorId: req.params.id,
      ...req.body
    });
    
    res.status(201).json({
      success: true,
      message: 'Reserva creada exitosamente',
      data: result
    });
    
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear reserva',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/tour-operators/:id/bookings/:locator
 * Leer reserva del operador externo
 */
router.get('/:id/bookings/:locator', async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operador no encontrado'
      });
    }
    
    const adapter = getTourOperatorAdapter();
    const booking = await adapter.readBooking(req.params.id, req.params.locator);
    
    res.json({
      success: true,
      data: booking
    });
    
  } catch (error) {
    console.error('Error reading booking:', error);
    res.status(500).json({
      success: false,
      error: 'Error al leer reserva',
      message: error.message
    });
  }
});

/**
 * DELETE /api/admin/tour-operators/:id/bookings/:locator
 * Cancelar reserva en operador externo
 */
router.delete('/:id/bookings/:locator', async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operador no encontrado'
      });
    }
    
    const adapter = getTourOperatorAdapter();
    const result = await adapter.cancelBooking(req.params.id, req.params.locator);
    
    res.json({
      success: true,
      message: 'Reserva cancelada exitosamente',
      data: result
    });
    
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cancelar reserva',
      message: error.message
    });
  }
});

// ===== SINCRONIZACIÓN =====

/**
 * POST /api/admin/tour-operators/:id/sync
 * Sincronizar todas las reservas del operador
 */
router.post('/:id/sync', async (req, res) => {
  try {
    const operator = await TourOperator.findById(req.params.id);
    
    if (!operator) {
      return res.status(404).json({
        success: false,
        error: 'Operador no encontrado'
      });
    }
    
    const Booking = require('../../models/Booking');
    const sync = getB2BBookingSync();
    
    // Buscar reservas pendientes de sincronización
    const pendingBookings = await Booking.find({
      'b2b.tourOperator': operator._id,
      'b2b.syncStatus.needsSync': true,
      status: { $ne: 'cancelled' }
    });
    
    // Agregar a cola
    pendingBookings.forEach(booking => {
      sync.addToSyncQueue(booking._id.toString(), 'high');
    });
    
    res.json({
      success: true,
      message: `${pendingBookings.length} reservas agregadas a cola de sincronización`,
      data: {
        queued: pendingBookings.length,
        queueStats: sync.getStats()
      }
    });
    
  } catch (error) {
    console.error('Error syncing operator bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Error al sincronizar',
      message: error.message
    });
  }
});

module.exports = router;
