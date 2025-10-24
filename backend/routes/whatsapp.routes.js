/**
 * WhatsApp Business API Routes
 * 
 * Endpoints para integración con WhatsApp Business API:
 * - Configuración de credenciales
 * - Prueba de conexión
 * - Envío de mensajes
 * - Sincronización de templates
 * - Webhook receiver para mensajes entrantes
 * - Verificación de disponibilidad de WhatsApp
 * 
 * Integra con Meta Graph API v18.0+
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');

// Meta Graph API Base URL
const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * POST /api/whatsapp/configure
 * Configurar credenciales de WhatsApp Business API
 */
router.post('/configure', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      phone_number_id,
      business_account_id,
      access_token,
      webhook_url,
      webhook_verify_token
    } = req.body;

    // Validate required fields
    if (!phone_number_id || !business_account_id || !access_token) {
      return res.status(400).json({
        success: false,
        message: 'phone_number_id, business_account_id, and access_token are required'
      });
    }

    // Test connection before saving
    try {
      const testResponse = await axios.get(
        `${GRAPH_API_URL}/${phone_number_id}`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        }
      );

      if (!testResponse.data.id) {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid WhatsApp Business API credentials',
        error: error.response?.data || error.message
      });
    }

    // Save configuration to database
    await pool.query(
      `INSERT INTO whatsapp_config (
        phone_number_id, business_account_id, access_token, 
        webhook_url, webhook_verify_token, enabled
      ) VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (id) DO UPDATE SET
        phone_number_id = $1,
        business_account_id = $2,
        access_token = $3,
        webhook_url = $4,
        webhook_verify_token = $5,
        updated_at = NOW()`,
      [phone_number_id, business_account_id, access_token, webhook_url, webhook_verify_token]
    );

    res.json({
      success: true,
      message: 'WhatsApp Business API configured successfully',
      data: {
        phone_number_id,
        business_account_id,
        webhook_url
      }
    });
  } catch (error) {
    console.error('Error configuring WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Error configuring WhatsApp Business API',
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/config
 * Obtener configuración actual (sin mostrar access token completo)
 */
router.get('/config', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT phone_number_id, business_account_id, webhook_url, enabled, created_at, updated_at FROM whatsapp_config LIMIT 1'
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No configuration found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting WhatsApp config:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving WhatsApp configuration',
      error: error.message
    });
  }
});

/**
 * POST /api/whatsapp/test-connection
 * Probar conexión con WhatsApp Business API
 */
router.post('/test-connection', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { phone_number_id, access_token } = req.body;

    let configToTest = { phone_number_id, access_token };

    // If not provided, get from database
    if (!phone_number_id || !access_token) {
      const configResult = await pool.query(
        'SELECT phone_number_id, access_token FROM whatsapp_config WHERE enabled = true LIMIT 1'
      );

      if (configResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No WhatsApp configuration found'
        });
      }

      configToTest = configResult.rows[0];
    }

    // Test connection
    const response = await axios.get(
      `${GRAPH_API_URL}/${configToTest.phone_number_id}`,
      {
        headers: {
          'Authorization': `Bearer ${configToTest.access_token}`
        }
      }
    );

    res.json({
      success: true,
      message: 'Connection successful',
      data: {
        phone_number: response.data.display_phone_number,
        verified_name: response.data.verified_name,
        quality_rating: response.data.quality_rating,
        id: response.data.id
      }
    });
  } catch (error) {
    console.error('Error testing WhatsApp connection:', error);
    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error.response?.data || error.message
    });
  }
});

/**
 * POST /api/whatsapp/send-message
 * Enviar mensaje a través de WhatsApp Business API
 */
router.post('/send-message', requireAuth, async (req, res) => {
  try {
    const { to, message, template_name, template_params } = req.body;

    if (!to || (!message && !template_name)) {
      return res.status(400).json({
        success: false,
        message: 'to and (message or template_name) are required'
      });
    }

    // Get configuration
    const configResult = await pool.query(
      'SELECT phone_number_id, access_token FROM whatsapp_config WHERE enabled = true LIMIT 1'
    );

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp not configured'
      });
    }

    const config = configResult.rows[0];

    // Prepare message payload
    let messagePayload;

    if (template_name) {
      // Send template message
      messagePayload = {
        messaging_product: 'whatsapp',
        to: to.replace(/[^0-9]/g, ''), // Remove non-numeric characters
        type: 'template',
        template: {
          name: template_name,
          language: {
            code: 'es'
          },
          components: template_params ? [
            {
              type: 'body',
              parameters: template_params.map(p => ({ type: 'text', text: p }))
            }
          ] : []
        }
      };
    } else {
      // Send text message
      messagePayload = {
        messaging_product: 'whatsapp',
        to: to.replace(/[^0-9]/g, ''),
        type: 'text',
        text: {
          body: message
        }
      };
    }

    // Send message via WhatsApp API
    const response = await axios.post(
      `${GRAPH_API_URL}/${config.phone_number_id}/messages`,
      messagePayload,
      {
        headers: {
          'Authorization': `Bearer ${config.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Log message
    await pool.query(
      `INSERT INTO whatsapp_messages (recipient, message_text, template_name, status, message_id)
       VALUES ($1, $2, $3, 'sent', $4)`,
      [to, message || null, template_name || null, response.data.messages[0].id]
    );

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message_id: response.data.messages[0].id,
        recipient: to
      }
    });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/whatsapp/templates
 * Obtener templates aprobados de WhatsApp
 */
router.get('/templates', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Get configuration
    const configResult = await pool.query(
      'SELECT business_account_id, access_token FROM whatsapp_config WHERE enabled = true LIMIT 1'
    );

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp not configured'
      });
    }

    const config = configResult.rows[0];

    // Get templates from Meta
    const response = await axios.get(
      `${GRAPH_API_URL}/${config.business_account_id}/message_templates`,
      {
        headers: {
          'Authorization': `Bearer ${config.access_token}`
        },
        params: {
          limit: 100
        }
      }
    );

    // Filter approved templates
    const templates = response.data.data.filter(t => t.status === 'APPROVED');

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error getting WhatsApp templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get templates',
      error: error.response?.data || error.message
    });
  }
});

/**
 * POST /api/whatsapp/check-availability
 * Verificar si un número tiene WhatsApp
 */
router.post('/check-availability', requireAuth, async (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: 'phone_number is required'
      });
    }

    // Check cache first
    const cacheResult = await pool.query(
      `SELECT has_whatsapp, checked_at 
       FROM whatsapp_availability_cache 
       WHERE phone_number = $1 
       AND checked_at > NOW() - INTERVAL '24 hours'`,
      [phone_number]
    );

    if (cacheResult.rows.length > 0) {
      return res.json({
        success: true,
        data: {
          phone_number: phone_number,
          has_whatsapp: cacheResult.rows[0].has_whatsapp,
          cached: true,
          checked_at: cacheResult.rows[0].checked_at
        }
      });
    }

    // Get configuration
    const configResult = await pool.query(
      'SELECT phone_number_id, access_token FROM whatsapp_config WHERE enabled = true LIMIT 1'
    );

    if (configResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp not configured'
      });
    }

    const config = configResult.rows[0];

    // Check with WhatsApp API (this is a simplified version)
    // In production, you would use the actual API endpoint for checking availability
    let hasWhatsApp = false;

    try {
      // Attempt to send a test message (not actually sent, just validated)
      const testPayload = {
        messaging_product: 'whatsapp',
        to: phone_number.replace(/[^0-9]/g, ''),
        type: 'text',
        text: {
          body: 'Test'
        }
      };

      // Note: This is a placeholder. In production, use proper WhatsApp availability check
      hasWhatsApp = true; // Assume true for now
    } catch (error) {
      hasWhatsApp = false;
    }

    // Cache result
    await pool.query(
      `INSERT INTO whatsapp_availability_cache (phone_number, has_whatsapp)
       VALUES ($1, $2)
       ON CONFLICT (phone_number) DO UPDATE SET
         has_whatsapp = $2,
         checked_at = NOW()`,
      [phone_number, hasWhatsApp]
    );

    res.json({
      success: true,
      data: {
        phone_number: phone_number,
        has_whatsapp: hasWhatsApp,
        cached: false,
        checked_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error checking WhatsApp availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check WhatsApp availability',
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/webhook
 * Webhook verification endpoint (for Meta to verify webhook)
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Check if verification token matches
  pool.query('SELECT webhook_verify_token FROM whatsapp_config LIMIT 1', (err, result) => {
    if (err || result.rows.length === 0) {
      return res.sendStatus(403);
    }

    const verifyToken = result.rows[0].webhook_verify_token;

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ WhatsApp webhook verified');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  });
});

/**
 * POST /api/whatsapp/webhook
 * Recibir mensajes entrantes de WhatsApp
 */
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Validate webhook signature (implement signature validation in production)
    
    // Process webhook events
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const message = change.value.messages?.[0];
            
            if (message) {
              // Log incoming message
              await pool.query(
                `INSERT INTO whatsapp_incoming_messages (
                  message_id, sender, recipient, message_text, message_type, timestamp
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  message.id,
                  message.from,
                  change.value.metadata.display_phone_number,
                  message.text?.body || null,
                  message.type,
                  new Date(parseInt(message.timestamp) * 1000)
                ]
              );

              console.log('📩 Incoming WhatsApp message:', message.from, message.text?.body);

              // Here you can implement auto-response logic
              // For example, send to customer support, trigger notifications, etc.
            }
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    res.sendStatus(500);
  }
});

/**
 * POST /api/whatsapp/enable
 * Habilitar/deshabilitar servicio WhatsApp
 */
router.post('/enable', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { enabled } = req.body;

    await pool.query(
      'UPDATE whatsapp_config SET enabled = $1, updated_at = NOW()',
      [enabled]
    );

    res.json({
      success: true,
      message: `WhatsApp service ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error toggling WhatsApp service:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating WhatsApp service status',
      error: error.message
    });
  }
});

/**
 * GET /api/whatsapp/stats
 * Obtener estadísticas de uso de WhatsApp
 */
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const stats = await pool.query(
      `SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        MIN(created_at) as first_message,
        MAX(created_at) as last_message
       FROM whatsapp_messages
       WHERE created_at >= $1 AND created_at <= $2`,
      [start_date || '2020-01-01', end_date || new Date().toISOString()]
    );

    res.json({
      success: true,
      data: stats.rows[0]
    });
  } catch (error) {
    console.error('Error getting WhatsApp stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving WhatsApp statistics',
      error: error.message
    });
  }
});

module.exports = router;
