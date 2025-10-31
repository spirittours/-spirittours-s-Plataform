/**
 * Spirit Tours - Nodemailer Service Initialization
 * 
 * This script initializes the Nodemailer service with configured servers
 * Call this from your main application startup
 */

const { nodemailerService } = require('./nodemailer_service');
const logger = require('../utils/logger');

/**
 * Initialize Nodemailer service with environment configuration
 */
async function initializeNodemailerService() {
  try {
    logger.info('🚀 Initializing Nodemailer Service...');

    // Try to load custom configuration
    let config = null;
    try {
      config = require('../config/nodemailer.config');
      logger.info('✅ Loaded custom Nodemailer configuration');
    } catch (err) {
      logger.warn('⚠️  No custom config found, using environment variables');
    }

    // If config file exists, use it
    if (config && config.servers) {
      for (const serverConfig of config.servers) {
        if (serverConfig.enabled !== false) {
          nodemailerService.addServer(serverConfig);
        }
      }
    } else {
      // Fall back to environment variables
      const envServers = getServersFromEnvironment();
      
      if (envServers.length === 0) {
        logger.warn('⚠️  No email servers configured!');
        logger.warn('Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in environment');
        logger.warn('Or create backend/config/nodemailer.config.js');
        return false;
      }

      for (const serverConfig of envServers) {
        nodemailerService.addServer(serverConfig);
      }
    }

    // Verify all connections
    logger.info('🔍 Verifying email server connections...');
    const verificationResults = await nodemailerService.verifyAllConnections();
    
    let successCount = 0;
    let failCount = 0;

    for (const [serverId, result] of Object.entries(verificationResults)) {
      if (result.success) {
        logger.info(`✅ ${result.name} (${result.host}): Connected`);
        successCount++;
      } else {
        logger.error(`❌ ${result.name} (${result.host}): ${result.error}`);
        failCount++;
      }
    }

    if (successCount === 0) {
      logger.error('❌ No email servers are available!');
      return false;
    }

    logger.info(`✅ Nodemailer Service initialized successfully`);
    logger.info(`   - ${successCount} server(s) connected`);
    if (failCount > 0) {
      logger.warn(`   - ${failCount} server(s) failed to connect`);
    }

    // Start monitoring if enabled
    if (config && config.monitoring && config.monitoring.enabled) {
      startMonitoring(config.monitoring);
    }

    return true;

  } catch (error) {
    logger.error('❌ Failed to initialize Nodemailer Service:', error);
    return false;
  }
}

/**
 * Get server configurations from environment variables
 */
function getServersFromEnvironment() {
  const servers = [];
  
  // Check for numbered servers (SMTP_HOST_1, SMTP_HOST_2, etc.)
  for (let i = 1; i <= 10; i++) {
    const host = process.env[`SMTP_HOST_${i}`];
    const user = process.env[`SMTP_USER_${i}`];
    const pass = process.env[`SMTP_PASS_${i}`];

    if (host && user && pass) {
      servers.push({
        name: process.env[`SMTP_NAME_${i}`] || `Server ${i}`,
        host: host,
        port: parseInt(process.env[`SMTP_PORT_${i}`] || '587'),
        secure: process.env[`SMTP_SECURE_${i}`] === 'true',
        user: user,
        pass: pass,
        priority: parseInt(process.env[`SMTP_PRIORITY_${i}`] || i),
        rateLimitPerHour: parseInt(process.env[`SMTP_RATE_LIMIT_${i}`] || '1000'),
        maxConnections: parseInt(process.env[`SMTP_MAX_CONN_${i}`] || '5'),
        enabled: process.env[`SMTP_ENABLED_${i}`] !== 'false'
      });
    }
  }

  // Check for default server (SMTP_HOST without number)
  if (servers.length === 0) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER || process.env.SMTP_USERNAME;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

    if (host && user && pass) {
      servers.push({
        name: 'Default SMTP Server',
        host: host,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: user,
        pass: pass,
        priority: 1,
        rateLimitPerHour: parseInt(process.env.SMTP_RATE_LIMIT || '1000'),
        maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS || '5'),
        enabled: true
      });
    }
  }

  return servers;
}

/**
 * Start monitoring email service
 */
function startMonitoring(monitoringConfig) {
  const interval = monitoringConfig.statsInterval || 300000; // Default 5 minutes

  setInterval(() => {
    const stats = nodemailerService.getStats();
    
    // Log stats
    logger.info('📊 Email Service Statistics:', {
      sent: stats.stats.sent,
      failed: stats.stats.failed,
      queued: stats.queue.size,
      processing: stats.processing,
      servers: stats.servers.length,
      templates: stats.templates,
      unsubscribed: stats.unsubscribed
    });

    // Check for high queue size
    if (stats.queue.size > 100) {
      logger.warn(`⚠️  Email queue is large: ${stats.queue.size} items`);
    }

    // Check for high failure rate
    if (stats.stats.failed > 50) {
      logger.warn(`⚠️  High failure rate: ${stats.stats.failed} failed emails`);
    }

    // Check server health
    stats.servers.forEach(server => {
      if (server.failureCount >= 3) {
        logger.warn(`⚠️  Server ${server.name} has ${server.failureCount} failures`);
      }
      if (!server.isAvailable) {
        logger.error(`❌ Server ${server.name} is not available`);
      }
    });

  }, interval);

  logger.info(`📈 Email monitoring started (interval: ${interval}ms)`);
}

/**
 * Shutdown Nodemailer service gracefully
 */
async function shutdownNodemailerService() {
  logger.info('🛑 Shutting down Nodemailer Service...');
  
  try {
    // Wait for queue to finish (with timeout)
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (nodemailerService.processing && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Close all connections
    await nodemailerService.close();
    
    logger.info('✅ Nodemailer Service shutdown complete');
    return true;
  } catch (error) {
    logger.error('❌ Error during Nodemailer shutdown:', error);
    return false;
  }
}

/**
 * Add default newsletter templates
 */
function addDefaultTemplates() {
  // Welcome Email Template
  nodemailerService.addTemplate({
    name: 'Welcome Email',
    subject: 'Welcome to {{company_name}}!',
    category: 'transactional',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 30px; text-align: center; }
          .content { background: white; padding: 30px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to {{company_name}}!</h1>
          </div>
          <div class="content">
            <p>Hi {{name}},</p>
            <p>Welcome to {{company_name}}! We're excited to have you join our community.</p>
            <p>Get started by exploring our amazing tours and experiences.</p>
            <center>
              <a href="{{website_url}}" class="button">Explore Tours</a>
            </center>
          </div>
          <div class="footer">
            <p>© 2024 {{company_name}}</p>
            <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: 'Welcome to {{company_name}}! We\'re excited to have you join us.'
  });

  // Monthly Newsletter Template
  nodemailerService.addTemplate({
    name: 'Monthly Newsletter',
    subject: '{{company_name}} - {{month}} Newsletter',
    category: 'promotional',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { background: white; padding: 30px; }
          .offer { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>{{company_name}}</h1>
            <p>{{month}} Newsletter</p>
          </div>
          <div class="content">
            <h2>This Month's Highlights</h2>
            <p>{{highlights}}</p>
            
            <div class="offer">
              <h3>🎉 Special Offer</h3>
              <p>{{special_offer}}</p>
            </div>
            
            <h2>New Destinations</h2>
            <p>{{new_destinations}}</p>
          </div>
          <div class="footer">
            <p>© 2024 {{company_name}}</p>
            <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: '{{company_name}} - {{month}} Newsletter. {{highlights}}'
  });

  // Booking Confirmation Template
  nodemailerService.addTemplate({
    name: 'Booking Confirmation',
    subject: 'Booking Confirmed - {{tour_name}}',
    category: 'transactional',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 30px; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #ddd; }
          .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Booking Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi {{customer_name}},</p>
            <p>Your booking has been confirmed. We can't wait to see you!</p>
            
            <div class="details">
              <h3>Booking Details</h3>
              <p><strong>Tour:</strong> {{tour_name}}</p>
              <p><strong>Date:</strong> {{tour_date}}</p>
              <p><strong>Participants:</strong> {{participants}}</p>
              <p><strong>Total:</strong> ${{total_amount}}</p>
              <p><strong>Booking ID:</strong> {{booking_id}}</p>
            </div>
            
            <p>If you have any questions, please contact us at support@spirittours.com</p>
          </div>
          <div class="footer">
            <p>© 2024 {{company_name}}</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: 'Booking Confirmed! Tour: {{tour_name}}, Date: {{tour_date}}, Booking ID: {{booking_id}}'
  });

  logger.info('✅ Default email templates added');
}

module.exports = {
  initializeNodemailerService,
  shutdownNodemailerService,
  addDefaultTemplates
};
