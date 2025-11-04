/**
 * System Configuration API Routes
 * 
 * Permite configurar TODAS las credenciales y configuraciones del sistema
 * desde el dashboard sin necesidad de tocar código o .env
 * 
 * Incluye:
 * - WhatsApp Business API credentials
 * - OpenAI API key
 * - SendGrid API key
 * - Facebook/Instagram credentials
 * - LinkedIn credentials
 * - Twilio SMS credentials
 * - Configuraciones generales del sistema
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Middleware de autenticación (ajustar según tu sistema)
const authenticate = (req, res, next) => {
  // TODO: Implementar tu sistema de autenticación
  // Por ahora, simulamos que está autenticado
  req.user = { id: 1, role: 'admin' };
  next();
};

const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    next();
  };
};

// Simulación de base de datos (en producción usar MongoDB/PostgreSQL)
let systemConfig = {
  // WhatsApp Business API
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
    apiVersion: 'v18.0',
    enabled: !!process.env.WHATSAPP_ACCESS_TOKEN
  },
  
  // OpenAI (GPT-4)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 500,
    enabled: !!process.env.OPENAI_API_KEY
  },
  
  // SendGrid (Email)
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || '',
    fromName: 'Spirit Tours',
    enabled: !!process.env.SENDGRID_API_KEY
  },
  
  // Facebook/Instagram
  facebook: {
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
    pageId: process.env.FACEBOOK_PAGE_ID || '',
    instagramBusinessId: process.env.INSTAGRAM_BUSINESS_ID || '',
    enabled: !!process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  },
  
  // LinkedIn
  linkedin: {
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
    organizationId: process.env.LINKEDIN_ORG_ID || '',
    enabled: !!process.env.LINKEDIN_ACCESS_TOKEN
  },
  
  // Twilio SMS
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    enabled: !!process.env.TWILIO_ACCOUNT_SID
  },
  
  // Configuración general
  general: {
    companyName: 'Spirit Tours',
    timezone: 'America/Mexico_City',
    currency: 'USD',
    language: 'es',
    webhookUrl: process.env.WEBHOOK_BASE_URL || '',
    dashboardUrl: process.env.DASHBOARD_URL || ''
  }
};

/**
 * Encriptar valores sensibles
 */
function encrypt(text) {
  const algorithm = 'aes-256-cbc';
  const key = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-prod';
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Desencriptar valores sensibles
 */
function decrypt(text) {
  if (!text || text === '') return '';
  
  try {
    const algorithm = 'aes-256-cbc';
    const key = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-prod';
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key.padEnd(32, '0').slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error('Error decrypting:', error);
    return text; // Return as-is if decryption fails
  }
}

/**
 * Mask sensitive values for display
 */
function maskValue(value) {
  if (!value || value.length < 8) return '****';
  return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

// ========================================
// ROUTES
// ========================================

/**
 * GET /api/system-config/all
 * Obtener toda la configuración (valores enmascarados)
 */
router.get('/system-config/all', authenticate, authorize(['admin']), (req, res) => {
  try {
    // Crear copia con valores enmascarados
    const maskedConfig = JSON.parse(JSON.stringify(systemConfig));
    
    // Mask WhatsApp
    if (maskedConfig.whatsapp.accessToken) {
      maskedConfig.whatsapp.accessToken = maskValue(maskedConfig.whatsapp.accessToken);
    }
    if (maskedConfig.whatsapp.webhookVerifyToken) {
      maskedConfig.whatsapp.webhookVerifyToken = maskValue(maskedConfig.whatsapp.webhookVerifyToken);
    }
    
    // Mask OpenAI
    if (maskedConfig.openai.apiKey) {
      maskedConfig.openai.apiKey = maskValue(maskedConfig.openai.apiKey);
    }
    
    // Mask SendGrid
    if (maskedConfig.sendgrid.apiKey) {
      maskedConfig.sendgrid.apiKey = maskValue(maskedConfig.sendgrid.apiKey);
    }
    
    // Mask Facebook
    if (maskedConfig.facebook.pageAccessToken) {
      maskedConfig.facebook.pageAccessToken = maskValue(maskedConfig.facebook.pageAccessToken);
    }
    
    // Mask LinkedIn
    if (maskedConfig.linkedin.accessToken) {
      maskedConfig.linkedin.accessToken = maskValue(maskedConfig.linkedin.accessToken);
    }
    
    // Mask Twilio
    if (maskedConfig.twilio.authToken) {
      maskedConfig.twilio.authToken = maskValue(maskedConfig.twilio.authToken);
    }
    
    res.json({
      success: true,
      config: maskedConfig
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

/**
 * PUT /api/system-config/whatsapp
 * Actualizar configuración de WhatsApp
 */
router.put('/system-config/whatsapp', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { phoneNumberId, accessToken, webhookVerifyToken, apiVersion } = req.body;
    
    // Validar campos requeridos
    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({ 
        error: 'Phone Number ID y Access Token son requeridos' 
      });
    }
    
    // Actualizar configuración
    systemConfig.whatsapp = {
      phoneNumberId,
      accessToken,
      webhookVerifyToken: webhookVerifyToken || systemConfig.whatsapp.webhookVerifyToken,
      apiVersion: apiVersion || systemConfig.whatsapp.apiVersion,
      enabled: true
    };
    
    // Actualizar variables de entorno en memoria
    process.env.WHATSAPP_PHONE_NUMBER_ID = phoneNumberId;
    process.env.WHATSAPP_ACCESS_TOKEN = accessToken;
    if (webhookVerifyToken) {
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = webhookVerifyToken;
    }
    
    // TODO: Guardar en base de datos encriptado
    // await saveConfigToDatabase('whatsapp', systemConfig.whatsapp);
    
    // Reiniciar servicio de WhatsApp con nuevas credenciales
    try {
      const whatsappAgent = require('../services/sales-ai/whatsapp-ai-agent.service');
      whatsappAgent.config.whatsappConfig.phoneNumberId = phoneNumberId;
      whatsappAgent.config.whatsappConfig.accessToken = accessToken;
      if (webhookVerifyToken) {
        whatsappAgent.config.whatsappConfig.webhookVerifyToken = webhookVerifyToken;
      }
    } catch (error) {
      console.log('WhatsApp service not loaded yet');
    }
    
    res.json({
      success: true,
      message: 'Configuración de WhatsApp actualizada',
      config: {
        phoneNumberId,
        accessToken: maskValue(accessToken),
        enabled: true
      }
    });
  } catch (error) {
    console.error('Error updating WhatsApp config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración de WhatsApp' });
  }
});

/**
 * POST /api/system-config/whatsapp/test
 * Probar credenciales de WhatsApp
 */
router.post('/system-config/whatsapp/test', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { phoneNumberId, accessToken } = req.body;
    
    // Test API call to WhatsApp
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      res.json({
        success: true,
        message: 'Credenciales de WhatsApp válidas',
        data: {
          verified: data.verified_name || true,
          phoneNumber: data.display_phone_number || 'Connected'
        }
      });
    } else {
      const error = await response.json();
      res.status(400).json({
        success: false,
        error: 'Credenciales inválidas',
        details: error.error?.message || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error testing WhatsApp:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al probar credenciales',
      details: error.message 
    });
  }
});

/**
 * PUT /api/system-config/openai
 * Actualizar configuración de OpenAI
 */
router.put('/system-config/openai', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { apiKey, model, temperature, maxTokens } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API Key es requerido' });
    }
    
    systemConfig.openai = {
      apiKey,
      model: model || systemConfig.openai.model,
      temperature: temperature !== undefined ? temperature : systemConfig.openai.temperature,
      maxTokens: maxTokens || systemConfig.openai.maxTokens,
      enabled: true
    };
    
    process.env.OPENAI_API_KEY = apiKey;
    
    res.json({
      success: true,
      message: 'Configuración de OpenAI actualizada',
      config: {
        apiKey: maskValue(apiKey),
        model: systemConfig.openai.model,
        enabled: true
      }
    });
  } catch (error) {
    console.error('Error updating OpenAI config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración de OpenAI' });
  }
});

/**
 * POST /api/system-config/openai/test
 * Probar API key de OpenAI
 */
router.post('/system-config/openai/test', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    // Test simple API call
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.ok) {
      res.json({
        success: true,
        message: 'API Key de OpenAI válida'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'API Key inválida'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Error al probar API Key' 
    });
  }
});

/**
 * PUT /api/system-config/sendgrid
 * Actualizar configuración de SendGrid
 */
router.put('/system-config/sendgrid', authenticate, authorize(['admin']), (req, res) => {
  try {
    const { apiKey, fromEmail, fromName } = req.body;
    
    if (!apiKey || !fromEmail) {
      return res.status(400).json({ error: 'API Key y From Email son requeridos' });
    }
    
    systemConfig.sendgrid = {
      apiKey,
      fromEmail,
      fromName: fromName || systemConfig.sendgrid.fromName,
      enabled: true
    };
    
    process.env.SENDGRID_API_KEY = apiKey;
    process.env.SENDGRID_FROM_EMAIL = fromEmail;
    
    res.json({
      success: true,
      message: 'Configuración de SendGrid actualizada'
    });
  } catch (error) {
    console.error('Error updating SendGrid config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

/**
 * PUT /api/system-config/facebook
 * Actualizar configuración de Facebook/Instagram
 */
router.put('/system-config/facebook', authenticate, authorize(['admin']), (req, res) => {
  try {
    const { pageAccessToken, pageId, instagramBusinessId } = req.body;
    
    systemConfig.facebook = {
      pageAccessToken: pageAccessToken || systemConfig.facebook.pageAccessToken,
      pageId: pageId || systemConfig.facebook.pageId,
      instagramBusinessId: instagramBusinessId || systemConfig.facebook.instagramBusinessId,
      enabled: !!pageAccessToken
    };
    
    if (pageAccessToken) process.env.FACEBOOK_PAGE_ACCESS_TOKEN = pageAccessToken;
    if (pageId) process.env.FACEBOOK_PAGE_ID = pageId;
    if (instagramBusinessId) process.env.INSTAGRAM_BUSINESS_ID = instagramBusinessId;
    
    res.json({
      success: true,
      message: 'Configuración de Facebook actualizada'
    });
  } catch (error) {
    console.error('Error updating Facebook config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

/**
 * PUT /api/system-config/linkedin
 * Actualizar configuración de LinkedIn
 */
router.put('/system-config/linkedin', authenticate, authorize(['admin']), (req, res) => {
  try {
    const { accessToken, organizationId } = req.body;
    
    systemConfig.linkedin = {
      accessToken: accessToken || systemConfig.linkedin.accessToken,
      organizationId: organizationId || systemConfig.linkedin.organizationId,
      enabled: !!accessToken
    };
    
    if (accessToken) process.env.LINKEDIN_ACCESS_TOKEN = accessToken;
    if (organizationId) process.env.LINKEDIN_ORG_ID = organizationId;
    
    res.json({
      success: true,
      message: 'Configuración de LinkedIn actualizada'
    });
  } catch (error) {
    console.error('Error updating LinkedIn config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

/**
 * PUT /api/system-config/twilio
 * Actualizar configuración de Twilio SMS
 */
router.put('/system-config/twilio', authenticate, authorize(['admin']), (req, res) => {
  try {
    const { accountSid, authToken, phoneNumber } = req.body;
    
    systemConfig.twilio = {
      accountSid: accountSid || systemConfig.twilio.accountSid,
      authToken: authToken || systemConfig.twilio.authToken,
      phoneNumber: phoneNumber || systemConfig.twilio.phoneNumber,
      enabled: !!(accountSid && authToken)
    };
    
    if (accountSid) process.env.TWILIO_ACCOUNT_SID = accountSid;
    if (authToken) process.env.TWILIO_AUTH_TOKEN = authToken;
    if (phoneNumber) process.env.TWILIO_PHONE_NUMBER = phoneNumber;
    
    res.json({
      success: true,
      message: 'Configuración de Twilio actualizada'
    });
  } catch (error) {
    console.error('Error updating Twilio config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

/**
 * PUT /api/system-config/general
 * Actualizar configuración general
 */
router.put('/system-config/general', authenticate, authorize(['admin']), (req, res) => {
  try {
    const { companyName, timezone, currency, language, webhookUrl, dashboardUrl } = req.body;
    
    systemConfig.general = {
      companyName: companyName || systemConfig.general.companyName,
      timezone: timezone || systemConfig.general.timezone,
      currency: currency || systemConfig.general.currency,
      language: language || systemConfig.general.language,
      webhookUrl: webhookUrl || systemConfig.general.webhookUrl,
      dashboardUrl: dashboardUrl || systemConfig.general.dashboardUrl
    };
    
    res.json({
      success: true,
      message: 'Configuración general actualizada',
      config: systemConfig.general
    });
  } catch (error) {
    console.error('Error updating general config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

/**
 * GET /api/system-config/status
 * Obtener status de todos los servicios
 */
router.get('/system-config/status', authenticate, authorize(['admin']), (req, res) => {
  try {
    const status = {
      whatsapp: {
        enabled: systemConfig.whatsapp.enabled,
        configured: !!(systemConfig.whatsapp.phoneNumberId && systemConfig.whatsapp.accessToken),
        status: systemConfig.whatsapp.enabled ? 'active' : 'inactive'
      },
      openai: {
        enabled: systemConfig.openai.enabled,
        configured: !!systemConfig.openai.apiKey,
        status: systemConfig.openai.enabled ? 'active' : 'inactive'
      },
      sendgrid: {
        enabled: systemConfig.sendgrid.enabled,
        configured: !!(systemConfig.sendgrid.apiKey && systemConfig.sendgrid.fromEmail),
        status: systemConfig.sendgrid.enabled ? 'active' : 'inactive'
      },
      facebook: {
        enabled: systemConfig.facebook.enabled,
        configured: !!systemConfig.facebook.pageAccessToken,
        status: systemConfig.facebook.enabled ? 'active' : 'inactive'
      },
      linkedin: {
        enabled: systemConfig.linkedin.enabled,
        configured: !!systemConfig.linkedin.accessToken,
        status: systemConfig.linkedin.enabled ? 'active' : 'inactive'
      },
      twilio: {
        enabled: systemConfig.twilio.enabled,
        configured: !!(systemConfig.twilio.accountSid && systemConfig.twilio.authToken),
        status: systemConfig.twilio.enabled ? 'active' : 'inactive'
      }
    };
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({ error: 'Error al obtener status' });
  }
});

module.exports = router;
