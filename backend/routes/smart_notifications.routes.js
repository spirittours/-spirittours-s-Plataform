/**
 * Smart Notifications Admin API Routes
 * Panel de control para gestión de notificaciones con control de costos
 * 
 * Features:
 * - Enable/Disable notification channels (WhatsApp, Email, SMS)
 * - Configure SMS budget and cost controls
 * - View notification analytics and cost savings
 * - Manage user notification preferences
 * - Real-time notification statistics
 * 
 * @author Spirit Tours Dev Team
 * @date 2024
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/spirittours'
});

// Middleware de autenticación (placeholder - implementar según sistema)
const requireAuth = (req, res, next) => {
  // TODO: Implementar autenticación real
  req.user = { id: '1', role: 'admin' }; // Placeholder
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
};

/**
 * GET /api/smart-notifications/settings
 * Obtener configuración global de notificaciones
 */
router.get('/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT *
      FROM notification_settings
      ORDER BY id DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      // Crear configuración por defecto
      const insertQuery = `
        INSERT INTO notification_settings (
          whatsapp_enabled,
          email_enabled,
          sms_enabled,
          default_strategy,
          monthly_sms_budget,
          sms_spent_current_month,
          check_whatsapp_availability
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const insertResult = await pool.query(insertQuery, [
        true,  // whatsapp_enabled
        true,  // email_enabled
        false, // sms_enabled (desactivado por defecto)
        'cost_optimized',
        0.0,   // monthly_sms_budget
        0.0,   // sms_spent_current_month
        true   // check_whatsapp_availability
      ]);
      
      return res.json({
        success: true,
        data: insertResult.rows[0]
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    logger.error('Error fetching notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración',
      error: error.message
    });
  }
});

/**
 * PUT /api/smart-notifications/settings
 * Actualizar configuración global de notificaciones
 * 
 * Body:
 * {
 *   "whatsapp_enabled": true,
 *   "email_enabled": true,
 *   "sms_enabled": false,
 *   "monthly_sms_budget": 100.00,
 *   "auto_fallback_to_sms": false,
 *   "check_whatsapp_availability": true
 * }
 */
router.put('/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      whatsapp_enabled,
      email_enabled,
      sms_enabled,
      monthly_sms_budget,
      auto_fallback_to_sms,
      check_whatsapp_availability,
      default_strategy,
      respect_quiet_hours,
      quiet_hours_start,
      quiet_hours_end
    } = req.body;
    
    // Validaciones
    if (sms_enabled && (!monthly_sms_budget || monthly_sms_budget <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Si activas SMS, debes configurar un presupuesto mensual mayor a 0'
      });
    }
    
    const query = `
      UPDATE notification_settings
      SET
        whatsapp_enabled = COALESCE($1, whatsapp_enabled),
        email_enabled = COALESCE($2, email_enabled),
        sms_enabled = COALESCE($3, sms_enabled),
        monthly_sms_budget = COALESCE($4, monthly_sms_budget),
        auto_fallback_to_sms = COALESCE($5, auto_fallback_to_sms),
        check_whatsapp_availability = COALESCE($6, check_whatsapp_availability),
        default_strategy = COALESCE($7, default_strategy),
        respect_quiet_hours = COALESCE($8, respect_quiet_hours),
        quiet_hours_start = COALESCE($9, quiet_hours_start),
        quiet_hours_end = COALESCE($10, quiet_hours_end),
        updated_at = NOW(),
        updated_by = $11
      WHERE id = (SELECT id FROM notification_settings ORDER BY id DESC LIMIT 1)
      RETURNING *
    `;
    
    const values = [
      whatsapp_enabled,
      email_enabled,
      sms_enabled,
      monthly_sms_budget,
      auto_fallback_to_sms,
      check_whatsapp_availability,
      default_strategy,
      respect_quiet_hours,
      quiet_hours_start,
      quiet_hours_end,
      req.user.id
    ];
    
    const result = await pool.query(query, values);
    
    logger.info(`Notification settings updated by admin ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: result.rows[0]
    });
    
  } catch (error) {
    logger.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar configuración',
      error: error.message
    });
  }
});

/**
 * POST /api/smart-notifications/settings/reset-sms-budget
 * Reiniciar gasto mensual de SMS (ejecutar al inicio de cada mes)
 */
router.post('/settings/reset-sms-budget', requireAuth, requireAdmin, async (req, res) => {
  try {
    const query = `
      UPDATE notification_settings
      SET sms_spent_current_month = 0.0,
          updated_at = NOW()
      WHERE id = (SELECT id FROM notification_settings ORDER BY id DESC LIMIT 1)
      RETURNING *
    `;
    
    const result = await pool.query(query);
    
    logger.info(`SMS budget reset by admin ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Presupuesto de SMS reiniciado',
      data: result.rows[0]
    });
    
  } catch (error) {
    logger.error('Error resetting SMS budget:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reiniciar presupuesto',
      error: error.message
    });
  }
});

/**
 * GET /api/smart-notifications/analytics
 * Obtener analytics de notificaciones y costos
 * 
 * Query params:
 * - start_date: YYYY-MM-DD
 * - end_date: YYYY-MM-DD
 * - group_by: day|week|month|channel
 */
router.get('/analytics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end_date = new Date().toISOString().split('T')[0],
      group_by = 'channel'
    } = req.query;
    
    // Total de notificaciones por canal
    const channelQuery = `
      SELECT
        channel_used,
        COUNT(*) as total_notifications,
        SUM(cost_incurred) as total_cost,
        SUM(cost_saved) as total_saved,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM smart_notification_logs
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY channel_used
      ORDER BY total_notifications DESC
    `;
    
    const channelResult = await pool.query(channelQuery, [start_date, end_date]);
    
    // Estadísticas generales
    const summaryQuery = `
      SELECT
        COUNT(*) as total_notifications,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(cost_incurred) as total_cost_incurred,
        SUM(cost_saved) as total_cost_saved,
        COUNT(CASE WHEN whatsapp_check_performed = true AND whatsapp_available = true THEN 1 END) as whatsapp_verifications_success,
        COUNT(CASE WHEN whatsapp_check_performed = true AND whatsapp_available = false THEN 1 END) as whatsapp_verifications_failed,
        COUNT(CASE WHEN fallback_used = true THEN 1 END) as fallbacks_used,
        AVG(cost_incurred) as avg_cost_per_notification
      FROM smart_notification_logs
      WHERE created_at >= $1 AND created_at <= $2
    `;
    
    const summaryResult = await pool.query(summaryQuery, [start_date, end_date]);
    
    // Top usuarios por notificaciones
    const topUsersQuery = `
      SELECT
        user_id,
        COUNT(*) as notification_count,
        SUM(cost_incurred) as total_cost
      FROM smart_notification_logs
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY user_id
      ORDER BY notification_count DESC
      LIMIT 10
    `;
    
    const topUsersResult = await pool.query(topUsersQuery, [start_date, end_date]);
    
    // Calcular ROI y recomendaciones
    const summary = summaryResult.rows[0];
    const costIncurred = parseFloat(summary.total_cost_incurred || 0);
    const costSaved = parseFloat(summary.total_cost_saved || 0);
    const roi = costIncurred > 0 ? (costSaved / costIncurred) : 0;
    
    const recommendations = [];
    
    // Generar recomendaciones
    const smsStats = channelResult.rows.find(r => r.channel_used === 'sms');
    if (smsStats && smsStats.total_notifications > 0) {
      recommendations.push({
        type: 'cost_optimization',
        priority: 'high',
        message: `Se enviaron ${smsStats.total_notifications} SMS con costo de $${parseFloat(smsStats.total_cost).toFixed(2)}. Activa WhatsApp para reducir costos.`,
        potential_savings: parseFloat(smsStats.total_cost).toFixed(2)
      });
    }
    
    const whatsappStats = channelResult.rows.find(r => r.channel_used === 'whatsapp');
    if (whatsappStats && whatsappStats.total_notifications > 0) {
      recommendations.push({
        type: 'success',
        priority: 'info',
        message: `WhatsApp envió ${whatsappStats.total_notifications} mensajes GRATIS, ahorrando $${parseFloat(whatsappStats.total_saved).toFixed(2)}.`,
        actual_savings: parseFloat(whatsappStats.total_saved).toFixed(2)
      });
    }
    
    if (costIncurred > 50) {
      recommendations.push({
        type: 'budget_alert',
        priority: 'medium',
        message: `Costo total de $${costIncurred.toFixed(2)} en el período. Considera optimizar el uso de canales gratuitos.`
      });
    }
    
    res.json({
      success: true,
      period: {
        start: start_date,
        end: end_date
      },
      summary: {
        total_notifications: parseInt(summary.total_notifications || 0),
        unique_users: parseInt(summary.unique_users || 0),
        total_cost_incurred: parseFloat(costIncurred).toFixed(2),
        total_cost_saved: parseFloat(costSaved).toFixed(2),
        roi: roi.toFixed(2),
        avg_cost_per_notification: parseFloat(summary.avg_cost_per_notification || 0).toFixed(4),
        fallbacks_used: parseInt(summary.fallbacks_used || 0),
        whatsapp_success_rate: summary.whatsapp_verifications_success ? 
          ((summary.whatsapp_verifications_success / (summary.whatsapp_verifications_success + summary.whatsapp_verifications_failed)) * 100).toFixed(1) : '0.0'
      },
      by_channel: channelResult.rows.map(row => ({
        channel: row.channel_used,
        total_notifications: parseInt(row.total_notifications),
        successful: parseInt(row.successful),
        failed: parseInt(row.failed),
        success_rate: ((parseInt(row.successful) / parseInt(row.total_notifications)) * 100).toFixed(1),
        total_cost: parseFloat(row.total_cost || 0).toFixed(2),
        total_saved: parseFloat(row.total_saved || 0).toFixed(2)
      })),
      top_users: topUsersResult.rows,
      recommendations: recommendations
    });
    
  } catch (error) {
    logger.error('Error fetching notification analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener analytics',
      error: error.message
    });
  }
});

/**
 * GET /api/smart-notifications/user-preferences/:userId
 * Obtener preferencias de notificación de un usuario
 */
router.get('/user-preferences/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar que el usuario solicita sus propias preferencias o es admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver estas preferencias'
      });
    }
    
    const query = `
      SELECT *
      FROM user_notification_preferences
      WHERE user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No se encontraron preferencias para este usuario'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    logger.error('Error fetching user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener preferencias',
      error: error.message
    });
  }
});

/**
 * PUT /api/smart-notifications/user-preferences/:userId
 * Actualizar preferencias de notificación de un usuario
 */
router.put('/user-preferences/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar permisos
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para modificar estas preferencias'
      });
    }
    
    const {
      phone_number,
      email,
      whatsapp_number,
      preferred_channel,
      allow_whatsapp,
      allow_email,
      allow_sms,
      allow_push,
      allow_booking_notifications,
      allow_payment_notifications,
      allow_marketing_notifications,
      allow_support_notifications,
      language,
      timezone
    } = req.body;
    
    // Verificar si existe
    const checkQuery = `SELECT id FROM user_notification_preferences WHERE user_id = $1`;
    const checkResult = await pool.query(checkQuery, [userId]);
    
    if (checkResult.rows.length === 0) {
      // Crear nuevo
      const insertQuery = `
        INSERT INTO user_notification_preferences (
          user_id, phone_number, email, whatsapp_number, preferred_channel,
          allow_whatsapp, allow_email, allow_sms, allow_push,
          allow_booking_notifications, allow_payment_notifications,
          allow_marketing_notifications, allow_support_notifications,
          language, timezone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;
      
      const values = [
        userId, phone_number, email, whatsapp_number, preferred_channel || 'whatsapp',
        allow_whatsapp ?? true, allow_email ?? true, allow_sms ?? true, allow_push ?? true,
        allow_booking_notifications ?? true, allow_payment_notifications ?? true,
        allow_marketing_notifications ?? false, allow_support_notifications ?? true,
        language || 'es', timezone || 'America/Mexico_City'
      ];
      
      const result = await pool.query(insertQuery, values);
      
      return res.json({
        success: true,
        message: 'Preferencias creadas exitosamente',
        data: result.rows[0]
      });
    }
    
    // Actualizar existente
    const updateQuery = `
      UPDATE user_notification_preferences
      SET
        phone_number = COALESCE($1, phone_number),
        email = COALESCE($2, email),
        whatsapp_number = COALESCE($3, whatsapp_number),
        preferred_channel = COALESCE($4, preferred_channel),
        allow_whatsapp = COALESCE($5, allow_whatsapp),
        allow_email = COALESCE($6, allow_email),
        allow_sms = COALESCE($7, allow_sms),
        allow_push = COALESCE($8, allow_push),
        allow_booking_notifications = COALESCE($9, allow_booking_notifications),
        allow_payment_notifications = COALESCE($10, allow_payment_notifications),
        allow_marketing_notifications = COALESCE($11, allow_marketing_notifications),
        allow_support_notifications = COALESCE($12, allow_support_notifications),
        language = COALESCE($13, language),
        timezone = COALESCE($14, timezone),
        updated_at = NOW()
      WHERE user_id = $15
      RETURNING *
    `;
    
    const values = [
      phone_number, email, whatsapp_number, preferred_channel,
      allow_whatsapp, allow_email, allow_sms, allow_push,
      allow_booking_notifications, allow_payment_notifications,
      allow_marketing_notifications, allow_support_notifications,
      language, timezone, userId
    ];
    
    const result = await pool.query(updateQuery, values);
    
    res.json({
      success: true,
      message: 'Preferencias actualizadas exitosamente',
      data: result.rows[0]
    });
    
  } catch (error) {
    logger.error('Error updating user preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar preferencias',
      error: error.message
    });
  }
});

/**
 * POST /api/smart-notifications/test
 * Enviar notificación de prueba (solo admin)
 */
router.post('/test', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user_id, channel, message } = req.body;
    
    if (!user_id || !message) {
      return res.status(400).json({
        success: false,
        message: 'user_id y message son requeridos'
      });
    }
    
    // TODO: Integrar con SmartNotificationService para envío real
    
    res.json({
      success: true,
      message: 'Notificación de prueba enviada',
      test_data: {
        user_id,
        channel: channel || 'auto',
        message_preview: message.substring(0, 50) + '...'
      }
    });
    
  } catch (error) {
    logger.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar notificación de prueba',
      error: error.message
    });
  }
});

/**
 * GET /api/smart-notifications/logs
 * Obtener logs de notificaciones con filtros
 */
router.get('/logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      user_id,
      channel,
      status,
      start_date,
      end_date,
      limit = 50,
      offset = 0
    } = req.query;
    
    let whereConditions = [];
    let values = [];
    let valueIndex = 1;
    
    if (user_id) {
      whereConditions.push(`user_id = $${valueIndex++}`);
      values.push(user_id);
    }
    
    if (channel) {
      whereConditions.push(`channel_used = $${valueIndex++}`);
      values.push(channel);
    }
    
    if (status) {
      whereConditions.push(`status = $${valueIndex++}`);
      values.push(status);
    }
    
    if (start_date) {
      whereConditions.push(`created_at >= $${valueIndex++}`);
      values.push(start_date);
    }
    
    if (end_date) {
      whereConditions.push(`created_at <= $${valueIndex++}`);
      values.push(end_date);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT *
      FROM smart_notification_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${valueIndex++} OFFSET $${valueIndex}
    `;
    
    values.push(limit, offset);
    
    const result = await pool.query(query, values);
    
    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM smart_notification_logs
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, values.slice(0, -2));
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parseInt(limit) < parseInt(countResult.rows[0].total)
      }
    });
    
  } catch (error) {
    logger.error('Error fetching notification logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener logs',
      error: error.message
    });
  }
});

module.exports = router;
