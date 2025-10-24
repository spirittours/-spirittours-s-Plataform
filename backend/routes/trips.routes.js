/**
 * Spirit Tours - Trips Management API Routes
 * 
 * Sistema SUPERIOR a Expedia TAAP con:
 * - 10 estados de viaje (vs 4 de Expedia)
 * - Soporte multi-canal (B2C, B2B, B2B2C)
 * - Tracking GPS en tiempo real
 * - Chat integrado
 * - IA predictiva
 * - Métricas avanzadas
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Middleware de autenticación
const requireAuth = (req, res, next) => {
  // TODO: Implementar autenticación JWT
  // Por ahora, simulamos usuario autenticado
  req.user = {
    id: req.headers['x-user-id'] || 'test-user-id',
    role: req.headers['x-user-role'] || 'customer',
    agencyId: req.headers['x-agency-id'] || null
  };
  next();
};

/**
 * GET /api/trips
 * Obtener lista de trips con filtros avanzados
 * 
 * Query params:
 * - status: upcoming,in_progress,past,cancelled,etc
 * - channel: b2c,b2b,b2b2c
 * - dateFrom, dateTo: rango de fechas
 * - search: buscar por referencia, nombre, email
 * - agencyId: filtrar por agencia
 * - operatorId: filtrar por operador
 * - page, limit: paginación
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      status,
      channel,
      dateFrom,
      dateTo,
      search,
      agencyId,
      operatorId,
      page = 1,
      limit = 20
    } = req.query;

    const { user } = req;
    const offset = (page - 1) * limit;

    // Construir query dinámicamente
    let query = `
      SELECT 
        t.*,
        u.email as customer_email,
        u.first_name || ' ' || u.last_name as customer_name,
        tour.title as tour_title,
        tour.destination,
        g.first_name || ' ' || g.last_name as guide_name,
        a.name as agency_name,
        COUNT(*) OVER() as total_count
      FROM trips t
      LEFT JOIN users u ON t.customer_id = u.id
      LEFT JOIN tours tour ON t.tour_id = tour.id
      LEFT JOIN guides g ON t.guide_id = g.id
      LEFT JOIN agencies a ON t.agency_id = a.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // Filtrar según rol del usuario
    if (user.role === 'customer') {
      query += ` AND t.customer_id = $${paramCount}`;
      params.push(user.id);
      paramCount++;
    } else if (user.role === 'agency' && user.agencyId) {
      query += ` AND t.agency_id = $${paramCount}`;
      params.push(user.agencyId);
      paramCount++;
    }

    // Filtros adicionales
    if (status) {
      const statuses = status.split(',');
      query += ` AND t.status = ANY($${paramCount})`;
      params.push(statuses);
      paramCount++;
    }

    if (channel) {
      query += ` AND t.channel = $${paramCount}`;
      params.push(channel);
      paramCount++;
    }

    if (dateFrom) {
      query += ` AND t.departure_date >= $${paramCount}`;
      params.push(dateFrom);
      paramCount++;
    }

    if (dateTo) {
      query += ` AND t.departure_date <= $${paramCount}`;
      params.push(dateTo);
      paramCount++;
    }

    if (search) {
      query += ` AND (
        t.booking_reference ILIKE $${paramCount} OR
        t.lead_traveler_name ILIKE $${paramCount} OR
        t.lead_traveler_email ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (agencyId) {
      query += ` AND t.agency_id = $${paramCount}`;
      params.push(agencyId);
      paramCount++;
    }

    if (operatorId) {
      query += ` AND t.operator_id = $${paramCount}`;
      params.push(operatorId);
      paramCount++;
    }

    // Ordenar y paginar
    query += ` ORDER BY t.departure_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const trips = result.rows;
    const totalCount = trips.length > 0 ? parseInt(trips[0].total_count) : 0;

    res.json({
      success: true,
      data: trips,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching trips:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener viajes',
      error: error.message
    });
  }
});

/**
 * GET /api/trips/stats
 * Obtener estadísticas de trips
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { user } = req;
    
    let whereClause = '1=1';
    const params = [];
    
    if (user.role === 'customer') {
      whereClause = 'customer_id = $1';
      params.push(user.id);
    } else if (user.role === 'agency' && user.agencyId) {
      whereClause = 'agency_id = $1';
      params.push(user.agencyId);
    }

    const query = `
      SELECT
        COUNT(*) as total_trips,
        COUNT(*) FILTER (WHERE status = 'upcoming') as upcoming_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        SUM(total_amount) as total_revenue,
        SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as completed_revenue,
        AVG(rating) FILTER (WHERE rating IS NOT NULL) as average_rating,
        COUNT(*) FILTER (WHERE rating IS NOT NULL) as rated_trips
      FROM trips
      WHERE ${whereClause}
    `;

    const result = await pool.query(query, params);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        total_trips: parseInt(stats.total_trips) || 0,
        upcoming: parseInt(stats.upcoming_count) || 0,
        in_progress: parseInt(stats.in_progress_count) || 0,
        completed: parseInt(stats.completed_count) || 0,
        cancelled: parseInt(stats.cancelled_count) || 0,
        pending: parseInt(stats.pending_count) || 0,
        total_revenue: parseFloat(stats.total_revenue) || 0,
        completed_revenue: parseFloat(stats.completed_revenue) || 0,
        average_rating: parseFloat(stats.average_rating) || 0,
        rated_trips: parseInt(stats.rated_trips) || 0
      }
    });

  } catch (error) {
    logger.error('Error fetching trip stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

/**
 * GET /api/trips/:tripId
 * Obtener detalles completos de un trip
 */
router.get('/:tripId', requireAuth, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { user } = req;

    const query = `
      SELECT 
        t.*,
        u.email as customer_email,
        u.first_name || ' ' || u.last_name as customer_name,
        u.phone as customer_phone,
        tour.title as tour_title,
        tour.description as tour_description,
        tour.destination,
        tour.duration_days,
        tour.included_services,
        tour.excluded_services,
        g.first_name || ' ' || g.last_name as guide_name,
        g.phone as guide_phone,
        g.email as guide_email,
        g.languages as guide_languages,
        a.name as agency_name,
        a.contact_email as agency_email,
        a.contact_phone as agency_phone,
        o.name as operator_name,
        o.contact_email as operator_email
      FROM trips t
      LEFT JOIN users u ON t.customer_id = u.id
      LEFT JOIN tours tour ON t.tour_id = tour.id
      LEFT JOIN guides g ON t.guide_id = g.id
      LEFT JOIN agencies a ON t.agency_id = a.id
      LEFT JOIN operators o ON t.operator_id = o.id
      WHERE t.trip_id = $1
    `;

    const result = await pool.query(query, [tripId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Viaje no encontrado'
      });
    }

    const trip = result.rows[0];

    // Verificar permisos
    if (user.role === 'customer' && trip.customer_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver este viaje'
      });
    }

    // Obtener historial de estados
    const historyQuery = `
      SELECT * FROM trip_status_history
      WHERE trip_id = $1
      ORDER BY changed_at DESC
    `;
    const historyResult = await pool.query(historyQuery, [tripId]);

    // Obtener documentos
    const docsQuery = `
      SELECT * FROM trip_documents
      WHERE trip_id = $1
      ORDER BY generated_at DESC
    `;
    const docsResult = await pool.query(docsQuery, [tripId]);

    // Obtener notificaciones
    const notifQuery = `
      SELECT * FROM trip_notifications
      WHERE trip_id = $1
      ORDER BY sent_at DESC
      LIMIT 10
    `;
    const notifResult = await pool.query(notifQuery, [tripId]);

    res.json({
      success: true,
      data: {
        ...trip,
        status_history: historyResult.rows,
        documents: docsResult.rows,
        recent_notifications: notifResult.rows
      }
    });

  } catch (error) {
    logger.error('Error fetching trip details:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalles del viaje',
      error: error.message
    });
  }
});

/**
 * POST /api/trips/:tripId/cancel
 * Cancelar un trip
 */
router.post('/:tripId/cancel', requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { tripId } = req.params;
    const { reason } = req.body;
    const { user } = req;

    // Obtener trip actual
    const tripQuery = await client.query(
      'SELECT * FROM trips WHERE trip_id = $1',
      [tripId]
    );

    if (tripQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Viaje no encontrado'
      });
    }

    const trip = tripQuery.rows[0];

    // Verificar permisos
    if (user.role === 'customer' && trip.customer_id !== user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para cancelar este viaje'
      });
    }

    // Verificar si puede ser cancelado
    if (!['pending', 'upcoming'].includes(trip.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Este viaje no puede ser cancelado en su estado actual'
      });
    }

    // Calcular reembolso
    const departureDate = new Date(trip.departure_date);
    const now = new Date();
    const daysUntil = Math.floor((departureDate - now) / (1000 * 60 * 60 * 24));

    let refundPercentage = 0;
    if (daysUntil >= 14) refundPercentage = 1.0;
    else if (daysUntil >= 7) refundPercentage = 0.75;
    else if (daysUntil >= 2) refundPercentage = 0.5;

    const refundAmount = trip.paid_amount * refundPercentage;

    // Actualizar trip
    await client.query(
      `UPDATE trips 
       SET status = 'cancelled',
           cancelled_at = NOW(),
           cancelled_by = $1,
           cancellation_reason = $2,
           refund_amount = $3,
           payment_status = 'refunded',
           updated_at = NOW()
       WHERE trip_id = $4`,
      [user.id, reason, refundAmount, tripId]
    );

    // Registrar en historial
    await client.query(
      `INSERT INTO trip_status_history 
       (trip_id, from_status, to_status, changed_by, reason)
       VALUES ($1, $2, 'cancelled', $3, $4)`,
      [tripId, trip.status, user.id, reason]
    );

    // Enviar notificación
    await client.query(
      `INSERT INTO trip_notifications
       (trip_id, notification_type, channel, subject, content, recipient_email)
       VALUES ($1, 'cancellation', 'email', 'Cancelación de Viaje', $2, $3)`,
      [
        tripId,
        `Tu viaje ha sido cancelado. Reembolso: $${refundAmount.toFixed(2)}`,
        trip.lead_traveler_email
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Viaje cancelado exitosamente',
      data: {
        refund_amount: refundAmount,
        refund_percentage: refundPercentage * 100,
        processing_time: '5-7 días hábiles'
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error cancelling trip:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar el viaje',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/trips/:tripId/modify
 * Modificar fechas de un trip
 */
router.post('/:tripId/modify', requireAuth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { tripId } = req.params;
    const { newDepartureDate, newReturnDate, reason } = req.body;
    const { user } = req;

    // Obtener trip actual
    const tripQuery = await client.query(
      'SELECT * FROM trips WHERE trip_id = $1',
      [tripId]
    );

    if (tripQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Viaje no encontrado'
      });
    }

    const trip = tripQuery.rows[0];

    // Guardar cambio en historial
    const modifications = trip.modification_history || [];
    modifications.push({
      modified_at: new Date().toISOString(),
      modified_by: user.id,
      reason: reason,
      old_departure_date: trip.departure_date,
      new_departure_date: newDepartureDate,
      old_return_date: trip.return_date,
      new_return_date: newReturnDate
    });

    // Actualizar trip
    await client.query(
      `UPDATE trips 
       SET departure_date = $1,
           return_date = $2,
           status = 'modified',
           modification_history = $3,
           updated_at = NOW()
       WHERE trip_id = $4`,
      [newDepartureDate, newReturnDate, JSON.stringify(modifications), tripId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Viaje modificado exitosamente',
      data: {
        new_departure_date: newDepartureDate,
        new_return_date: newReturnDate
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error modifying trip:', error);
    res.status(500).json({
      success: false,
      message: 'Error al modificar el viaje',
      error: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/trips/:tripId/review
 * Dejar review de un trip
 */
router.post('/:tripId/review', requireAuth, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { rating, review, nps_score } = req.body;
    const { user } = req;

    // Validar rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating debe estar entre 1 y 5'
      });
    }

    // Actualizar trip
    await pool.query(
      `UPDATE trips 
       SET rating = $1,
           review = $2,
           nps_score = $3,
           review_date = NOW()
       WHERE trip_id = $4 AND customer_id = $5`,
      [rating, review, nps_score, tripId, user.id]
    );

    res.json({
      success: true,
      message: '¡Gracias por tu review!'
    });

  } catch (error) {
    logger.error('Error saving review:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar review',
      error: error.message
    });
  }
});

/**
 * GET /api/trips/:tripId/tracking
 * Obtener tracking GPS del trip
 */
router.get('/:tripId/tracking', requireAuth, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { limit = 100 } = req.query;

    const query = `
      SELECT 
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude,
        timestamp,
        speed,
        altitude,
        activity
      FROM trip_tracking
      WHERE trip_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [tripId, limit]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tracking',
      error: error.message
    });
  }
});

/**
 * POST /api/trips/:tripId/chat
 * Enviar mensaje en chat del trip
 */
router.post('/:tripId/chat', requireAuth, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { message, attachment_url } = req.body;
    const { user } = req;

    const result = await pool.query(
      `INSERT INTO trip_chats 
       (trip_id, sender_id, sender_type, message, attachment_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [tripId, user.id, user.role, message, attachment_url]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error sending chat message:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje',
      error: error.message
    });
  }
});

/**
 * GET /api/trips/:tripId/chat
 * Obtener mensajes del chat
 */
router.get('/:tripId/chat', requireAuth, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { limit = 50 } = req.query;

    const query = `
      SELECT 
        tc.*,
        u.first_name || ' ' || u.last_name as sender_name,
        u.avatar_url as sender_avatar
      FROM trip_chats tc
      LEFT JOIN users u ON tc.sender_id = u.id
      WHERE tc.trip_id = $1
      ORDER BY tc.sent_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [tripId, limit]);

    res.json({
      success: true,
      data: result.rows.reverse()
    });

  } catch (error) {
    logger.error('Error fetching chat:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mensajes',
      error: error.message
    });
  }
});

module.exports = router;
