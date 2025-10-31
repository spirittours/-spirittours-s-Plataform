/**
 * Spirit Tours - Admin Email Configuration Routes
 * 
 * Dashboard endpoints for email server configuration and testing
 */

const express = require('express');
const router = express.Router();
const { nodemailerService } = require('../../services/nodemailer_service');
const logger = require('../../utils/logger');

// Middleware for admin authentication
const requireAdmin = (req, res, next) => {
  // TODO: Implement proper admin role checking
  // For now, check for admin token or role in JWT
  const userRole = req.user?.role || req.headers['x-user-role'];
  
  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Se requieren permisos de administrador' 
    });
  }
  next();
};

/**
 * @route   GET /api/admin/email-config/servers
 * @desc    Get all email servers with detailed stats
 * @access  Admin
 */
router.get('/servers', requireAdmin, (req, res) => {
  try {
    const servers = Array.from(nodemailerService.servers.values()).map(server => {
      const stats = server.getStats();
      return {
        ...stats,
        // Add sensitive data only for admin view
        user: server.auth.user,
        // Don't send password
        hasPassword: !!server.auth.pass,
        maxFailures: server.maxFailures,
        cooldownMinutes: server.cooldownMinutes
      };
    });

    res.json({
      success: true,
      count: servers.length,
      data: servers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting email servers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/admin/email-config/servers
 * @desc    Add new email server with validation
 * @access  Admin
 */
router.post('/servers', requireAdmin, async (req, res) => {
  try {
    const { 
      name, host, port, secure, user, pass, 
      priority, rateLimitPerHour, maxConnections,
      maxFailures, cooldownMinutes, enabled 
    } = req.body;

    // Validate required fields
    if (!name || !host || !user || !pass) {
      return res.status(400).json({ 
        error: 'Campos requeridos faltantes',
        required: ['name', 'host', 'user', 'pass']
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user)) {
      return res.status(400).json({ 
        error: 'Formato de email inválido para el usuario SMTP'
      });
    }

    // Add server
    const serverId = nodemailerService.addServer({
      name,
      host,
      port: parseInt(port) || 587,
      secure: secure === true || secure === 'true',
      user,
      pass,
      priority: parseInt(priority) || 5,
      rateLimitPerHour: parseInt(rateLimitPerHour) || 1000,
      maxConnections: parseInt(maxConnections) || 5,
      maxFailures: parseInt(maxFailures) || 5,
      cooldownMinutes: parseInt(cooldownMinutes) || 10,
      enabled: enabled !== false
    });

    const server = nodemailerService.servers.get(serverId);

    logger.info(`Admin added email server: ${name} (${serverId})`, {
      admin: req.user?.email || 'unknown',
      serverId
    });

    res.status(201).json({
      success: true,
      message: 'Servidor de email agregado exitosamente',
      serverId,
      data: server.getStats()
    });
  } catch (error) {
    logger.error('Error adding email server:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/admin/email-config/servers/:serverId
 * @desc    Update email server configuration
 * @access  Admin
 */
router.put('/servers/:serverId', requireAdmin, (req, res) => {
  try {
    const { serverId } = req.params;
    const server = nodemailerService.servers.get(serverId);

    if (!server) {
      return res.status(404).json({ error: 'Servidor no encontrado' });
    }

    // Update allowed fields
    const updates = req.body;
    const allowedFields = [
      'name', 'priority', 'rateLimitPerHour', 'maxConnections',
      'maxFailures', 'cooldownMinutes', 'enabled'
    ];

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'enabled') {
          server[field] = updates[field] === true || updates[field] === 'true';
        } else if (typeof server[field] === 'number') {
          server[field] = parseInt(updates[field]) || server[field];
        } else {
          server[field] = updates[field];
        }
      }
    });

    logger.info(`Admin updated email server: ${server.name} (${serverId})`, {
      admin: req.user?.email || 'unknown',
      updates: allowedFields.filter(f => updates[f] !== undefined)
    });

    res.json({
      success: true,
      message: 'Servidor actualizado exitosamente',
      data: server.getStats()
    });
  } catch (error) {
    logger.error('Error updating email server:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/admin/email-config/servers/:serverId
 * @desc    Remove email server
 * @access  Admin
 */
router.delete('/servers/:serverId', requireAdmin, async (req, res) => {
  try {
    const { serverId } = req.params;
    const server = nodemailerService.servers.get(serverId);

    if (!server) {
      return res.status(404).json({ error: 'Servidor no encontrado' });
    }

    const serverName = server.name;
    await nodemailerService.removeServer(serverId);

    logger.warn(`Admin removed email server: ${serverName} (${serverId})`, {
      admin: req.user?.email || 'unknown'
    });

    res.json({
      success: true,
      message: 'Servidor eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error removing email server:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/admin/email-config/servers/:serverId/test
 * @desc    Test email server connection (DASHBOARD FEATURE)
 * @access  Admin
 */
router.post('/servers/:serverId/test', requireAdmin, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { testEmail } = req.body;

    const server = nodemailerService.servers.get(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Servidor no encontrado' });
    }

    const transporter = nodemailerService.transporters.get(serverId);
    if (!transporter) {
      return res.status(500).json({ error: 'Transporter no encontrado' });
    }

    logger.info(`Admin testing email server: ${server.name}`, {
      admin: req.user?.email || 'unknown',
      serverId
    });

    // Test 1: Verify connection
    const startTime = Date.now();
    let verifyResult;
    try {
      await transporter.verify();
      verifyResult = {
        success: true,
        message: 'Conexión verificada exitosamente',
        latency: Date.now() - startTime
      };
    } catch (error) {
      verifyResult = {
        success: false,
        message: 'Error de conexión',
        error: error.message,
        latency: Date.now() - startTime
      };
    }

    // Test 2: Send test email (if testEmail provided)
    let sendResult = null;
    if (testEmail && verifyResult.success) {
      try {
        const testStartTime = Date.now();
        const info = await transporter.sendMail({
          from: `"Spirit Tours Test" <${server.auth.user}>`,
          to: testEmail,
          subject: '✅ Test Email - Spirit Tours',
          html: `
            <h1>Test Email Exitoso</h1>
            <p>Este es un email de prueba desde el servidor: <strong>${server.name}</strong></p>
            <ul>
              <li><strong>Servidor:</strong> ${server.host}:${server.port}</li>
              <li><strong>Usuario:</strong> ${server.auth.user}</li>
              <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
            </ul>
            <p>Si recibiste este email, la configuración es correcta.</p>
            <hr>
            <p><small>Spirit Tours - Email Configuration Test</small></p>
          `,
          text: `Test Email desde ${server.name} (${server.host}). Configuración correcta.`
        });

        sendResult = {
          success: true,
          message: 'Email de prueba enviado exitosamente',
          messageId: info.messageId,
          to: testEmail,
          latency: Date.now() - testStartTime
        };
      } catch (error) {
        sendResult = {
          success: false,
          message: 'Error al enviar email de prueba',
          error: error.message,
          to: testEmail
        };
      }
    }

    const overallSuccess = verifyResult.success && (!sendResult || sendResult.success);

    res.json({
      success: overallSuccess,
      message: overallSuccess ? 
        'Todas las pruebas exitosas' : 
        'Algunas pruebas fallaron',
      serverId,
      serverName: server.name,
      tests: {
        connection: verifyResult,
        sendEmail: sendResult
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error testing email server:', error);
    res.status(500).json({ 
      error: error.message,
      success: false 
    });
  }
});

/**
 * @route   POST /api/admin/email-config/servers/test-new
 * @desc    Test NEW server configuration before saving (WIZARD FEATURE)
 * @access  Admin
 */
router.post('/servers/test-new', requireAdmin, async (req, res) => {
  try {
    const { host, port, secure, user, pass, testEmail } = req.body;

    if (!host || !user || !pass) {
      return res.status(400).json({ 
        error: 'Campos requeridos faltantes',
        required: ['host', 'user', 'pass']
      });
    }

    logger.info('Admin testing new email server configuration', {
      admin: req.user?.email || 'unknown',
      host,
      user
    });

    // Create temporary transporter
    const nodemailer = require('nodemailer');
    const testTransporter = nodemailer.createTransport({
      host,
      port: parseInt(port) || 587,
      secure: secure === true || secure === 'true',
      auth: { user, pass }
    });

    // Test connection
    const startTime = Date.now();
    let verifyResult;
    try {
      await testTransporter.verify();
      verifyResult = {
        success: true,
        message: 'Conexión verificada exitosamente',
        latency: Date.now() - startTime
      };
    } catch (error) {
      verifyResult = {
        success: false,
        message: 'Error de conexión',
        error: error.message,
        latency: Date.now() - startTime,
        hint: getErrorHint(error.message)
      };
    }

    // Send test email if connection successful
    let sendResult = null;
    if (testEmail && verifyResult.success) {
      try {
        const testStartTime = Date.now();
        const info = await testTransporter.sendMail({
          from: `"Spirit Tours Test" <${user}>`,
          to: testEmail,
          subject: '✅ Test - Nueva Configuración SMTP',
          html: `
            <h1>Configuración SMTP Exitosa</h1>
            <p>La nueva configuración de servidor SMTP funciona correctamente.</p>
            <ul>
              <li><strong>Servidor:</strong> ${host}:${port}</li>
              <li><strong>Usuario:</strong> ${user}</li>
              <li><strong>Secure:</strong> ${secure ? 'Sí (SSL/TLS)' : 'No (STARTTLS)'}</li>
              <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
            </ul>
            <p>Puedes guardar esta configuración de forma segura.</p>
          `,
          text: `Test exitoso de nueva configuración SMTP: ${host}`
        });

        sendResult = {
          success: true,
          message: 'Email de prueba enviado exitosamente',
          messageId: info.messageId,
          to: testEmail,
          latency: Date.now() - testStartTime
        };
      } catch (error) {
        sendResult = {
          success: false,
          message: 'Conexión OK pero error al enviar email',
          error: error.message,
          hint: getErrorHint(error.message)
        };
      }
    }

    // Close temporary connection
    testTransporter.close();

    const overallSuccess = verifyResult.success && (!sendResult || sendResult.success);

    res.json({
      success: overallSuccess,
      message: overallSuccess ? 
        'Configuración validada exitosamente' : 
        'Error en la configuración',
      tests: {
        connection: verifyResult,
        sendEmail: sendResult
      },
      recommendation: overallSuccess ?
        'Puedes guardar esta configuración de forma segura' :
        'Revisa los errores antes de guardar',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error testing new email configuration:', error);
    res.status(500).json({ 
      error: error.message,
      success: false 
    });
  }
});

/**
 * @route   POST /api/admin/email-config/servers/verify-all
 * @desc    Verify all server connections
 * @access  Admin
 */
router.post('/servers/verify-all', requireAdmin, async (req, res) => {
  try {
    logger.info('Admin verifying all email servers', {
      admin: req.user?.email || 'unknown'
    });

    const results = await nodemailerService.verifyAllConnections();
    
    const summary = {
      total: Object.keys(results).length,
      successful: Object.values(results).filter(r => r.success).length,
      failed: Object.values(results).filter(r => !r.success).length
    };

    res.json({
      success: summary.failed === 0,
      message: summary.failed === 0 ? 
        'Todos los servidores conectados' : 
        `${summary.failed} servidor(es) con problemas`,
      summary,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error verifying all servers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/admin/email-config/presets
 * @desc    Get preset configurations for popular email providers
 * @access  Admin
 */
router.get('/presets', requireAdmin, (req, res) => {
  const presets = [
    {
      id: 'gmail',
      name: 'Gmail / Google Workspace',
      icon: '📧',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      instructions: 'Usa una contraseña de aplicación (App Password). Ve a: https://myaccount.google.com/apppasswords',
      user: 'tu-email@gmail.com',
      rateLimitPerHour: 500,
      documentation: 'https://support.google.com/mail/answer/7126229'
    },
    {
      id: 'office365',
      name: 'Office365 / Outlook',
      icon: '📨',
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      instructions: 'Usa tu email y contraseña de Office365',
      user: 'tu-email@outlook.com',
      rateLimitPerHour: 300,
      documentation: 'https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353'
    },
    {
      id: 'sendgrid',
      name: 'SendGrid',
      icon: '📬',
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      instructions: 'Usuario: "apikey", Contraseña: tu API Key de SendGrid',
      user: 'apikey',
      rateLimitPerHour: 100,
      documentation: 'https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api'
    },
    {
      id: 'aws_ses',
      name: 'Amazon SES',
      icon: '📮',
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      secure: false,
      instructions: 'Usa tus credenciales SMTP de AWS SES. Cambia la región si es necesario.',
      user: 'tu-smtp-username',
      rateLimitPerHour: 200,
      documentation: 'https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html'
    },
    {
      id: 'mailgun',
      name: 'Mailgun',
      icon: '📪',
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      instructions: 'Usa postmaster@tu-dominio-mailgun.com y tu contraseña SMTP',
      user: 'postmaster@your-domain.mailgun.org',
      rateLimitPerHour: 100,
      documentation: 'https://documentation.mailgun.com/en/latest/user_manual.html#smtp-relay'
    },
    {
      id: 'custom',
      name: 'Servidor Propio / cPanel',
      icon: '🏢',
      host: 'mail.tudominio.com',
      port: 587,
      secure: false,
      instructions: 'Usa tu servidor de correo propio. Generalmente mail.tudominio.com',
      user: 'correo@tudominio.com',
      rateLimitPerHour: 1000,
      documentation: null
    }
  ];

  res.json({
    success: true,
    count: presets.length,
    data: presets
  });
});

/**
 * Helper function to provide error hints
 */
function getErrorHint(errorMessage) {
  const errorMap = {
    'EAUTH': 'Credenciales incorrectas. Verifica usuario y contraseña.',
    'ECONNECTION': 'No se puede conectar al servidor. Verifica host y puerto.',
    'ETIMEDOUT': 'Tiempo de espera agotado. Verifica tu conexión a internet.',
    'ENOTFOUND': 'Servidor no encontrado. Verifica el hostname.',
    'self signed certificate': 'Certificado SSL auto-firmado. Puedes usar secure: false.',
    'Invalid login': 'Login inválido. Verifica credenciales y habilita "menos seguro" si usas Gmail.'
  };

  for (const [key, hint] of Object.entries(errorMap)) {
    if (errorMessage.includes(key)) {
      return hint;
    }
  }

  return 'Verifica la configuración del servidor SMTP.';
}

module.exports = router;
