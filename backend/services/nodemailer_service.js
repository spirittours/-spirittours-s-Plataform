/**
 * Spirit Tours - Advanced Nodemailer Service
 * 
 * Features:
 * - Multiple SMTP server support with automatic failover
 * - Mass email sending with queue management
 * - Newsletter functionality with templates
 * - Own mail server configuration (not just third-party)
 * - Rate limiting and throttling
 * - Email tracking and analytics
 * - Template management
 * - Unsubscribe management
 */

const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/nodemailer-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/nodemailer-combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

/**
 * Email Server Configuration
 */
class EmailServerConfig {
  constructor(config) {
    this.id = config.id || `server_${Date.now()}`;
    this.name = config.name || 'Default Server';
    this.host = config.host;
    this.port = config.port || 587;
    this.secure = config.secure || false; // true for 465, false for other ports
    this.auth = {
      user: config.user,
      pass: config.pass
    };
    this.priority = config.priority || 1; // Lower number = higher priority
    this.enabled = config.enabled !== false;
    this.maxConnections = config.maxConnections || 5;
    this.rateLimitPerHour = config.rateLimitPerHour || 1000;
    this.currentHourSent = 0;
    this.lastHourReset = Date.now();
    this.failureCount = 0;
    this.maxFailures = config.maxFailures || 5;
    this.cooldownUntil = null;
    this.cooldownMinutes = config.cooldownMinutes || 10;
  }

  isAvailable() {
    // Check if server is enabled
    if (!this.enabled) return false;

    // Check if in cooldown
    if (this.cooldownUntil && Date.now() < this.cooldownUntil) {
      return false;
    }

    // Check if exceeded failure threshold
    if (this.failureCount >= this.maxFailures) {
      return false;
    }

    // Reset hourly counter if needed
    const now = Date.now();
    if (now - this.lastHourReset > 3600000) {
      this.currentHourSent = 0;
      this.lastHourReset = now;
    }

    // Check rate limit
    if (this.currentHourSent >= this.rateLimitPerHour) {
      return false;
    }

    return true;
  }

  recordSuccess() {
    this.currentHourSent++;
    this.failureCount = 0; // Reset failure count on success
    this.cooldownUntil = null;
  }

  recordFailure() {
    this.failureCount++;
    if (this.failureCount >= this.maxFailures) {
      this.cooldownUntil = Date.now() + (this.cooldownMinutes * 60 * 1000);
      logger.warn(`Server ${this.name} (${this.id}) entered cooldown for ${this.cooldownMinutes} minutes`);
    }
  }

  getStats() {
    return {
      id: this.id,
      name: this.name,
      host: this.host,
      port: this.port,
      enabled: this.enabled,
      priority: this.priority,
      currentHourSent: this.currentHourSent,
      rateLimitPerHour: this.rateLimitPerHour,
      failureCount: this.failureCount,
      isAvailable: this.isAvailable(),
      cooldownUntil: this.cooldownUntil ? new Date(this.cooldownUntil).toISOString() : null
    };
  }
}

/**
 * Email Queue Item
 */
class EmailQueueItem {
  constructor(data) {
    this.id = data.id || `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.to = data.to; // Can be single email or array
    this.from = data.from;
    this.subject = data.subject;
    this.html = data.html;
    this.text = data.text;
    this.attachments = data.attachments || [];
    this.priority = data.priority || 5; // 1-10, lower is higher priority
    this.retries = data.retries || 0;
    this.maxRetries = data.maxRetries || 3;
    this.serverId = data.serverId; // Specific server to use (optional)
    this.createdAt = data.createdAt || Date.now();
    this.scheduledFor = data.scheduledFor; // Send at specific time
    this.status = 'queued'; // queued, sending, sent, failed
    this.lastError = null;
    this.sentAt = null;
    this.metadata = data.metadata || {}; // For tracking, campaign ID, etc.
  }

  isReadyToSend() {
    if (this.status !== 'queued' && this.status !== 'failed') return false;
    if (this.retries >= this.maxRetries) return false;
    if (this.scheduledFor && Date.now() < this.scheduledFor) return false;
    return true;
  }
}

/**
 * Newsletter Template
 */
class NewsletterTemplate {
  constructor(data) {
    this.id = data.id || `template_${Date.now()}`;
    this.name = data.name;
    this.subject = data.subject;
    this.html = data.html;
    this.text = data.text;
    this.category = data.category || 'general'; // general, promotional, transactional
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
  }

  render(variables = {}) {
    let html = this.html;
    let subject = this.subject;
    let text = this.text || '';

    // Simple template variable replacement: {{variable}}
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(regex, variables[key]);
      subject = subject.replace(regex, variables[key]);
      text = text.replace(regex, variables[key]);
    });

    return { html, subject, text };
  }
}

/**
 * Advanced Nodemailer Service
 */
class NodemailerService extends EventEmitter {
  constructor() {
    super();
    this.servers = new Map(); // Map of server ID to EmailServerConfig
    this.transporters = new Map(); // Map of server ID to nodemailer transporter
    this.queue = []; // Array of EmailQueueItem
    this.processing = false;
    this.templates = new Map(); // Map of template ID to NewsletterTemplate
    this.unsubscribed = new Set(); // Set of unsubscribed emails
    this.emailStats = {
      sent: 0,
      failed: 0,
      queued: 0,
      byServer: {}
    };
  }

  /**
   * Add email server configuration
   */
  addServer(config) {
    const server = new EmailServerConfig(config);
    this.servers.set(server.id, server);

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: server.host,
      port: server.port,
      secure: server.secure,
      auth: server.auth,
      pool: true,
      maxConnections: server.maxConnections,
      maxMessages: 100
    });

    this.transporters.set(server.id, transporter);

    // Initialize stats for this server
    this.emailStats.byServer[server.id] = {
      sent: 0,
      failed: 0
    };

    logger.info(`Email server added: ${server.name} (${server.id}) - ${server.host}:${server.port}`);

    return server.id;
  }

  /**
   * Remove email server
   */
  async removeServer(serverId) {
    const transporter = this.transporters.get(serverId);
    if (transporter) {
      transporter.close();
      this.transporters.delete(serverId);
    }
    this.servers.delete(serverId);
    logger.info(`Email server removed: ${serverId}`);
  }

  /**
   * Get available server with highest priority
   */
  getAvailableServer(preferredServerId = null) {
    // If preferred server specified and available, use it
    if (preferredServerId) {
      const server = this.servers.get(preferredServerId);
      if (server && server.isAvailable()) {
        return server;
      }
    }

    // Get all available servers sorted by priority
    const availableServers = Array.from(this.servers.values())
      .filter(server => server.isAvailable())
      .sort((a, b) => a.priority - b.priority);

    return availableServers.length > 0 ? availableServers[0] : null;
  }

  /**
   * Add email to queue
   */
  async queueEmail(emailData) {
    const item = new EmailQueueItem(emailData);
    this.queue.push(item);
    this.emailStats.queued++;

    logger.info(`Email queued: ${item.id} - To: ${Array.isArray(item.to) ? item.to.length + ' recipients' : item.to}`);

    // Emit event
    this.emit('emailQueued', item);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return item.id;
  }

  /**
   * Queue multiple emails (mass mailing)
   */
  async queueMassEmails(recipients, template, variables = {}, options = {}) {
    const emailIds = [];

    for (const recipient of recipients) {
      // Skip unsubscribed
      if (this.unsubscribed.has(recipient)) {
        logger.info(`Skipping unsubscribed email: ${recipient}`);
        continue;
      }

      // Render template with recipient-specific variables
      const recipientVars = {
        ...variables,
        email: recipient,
        unsubscribe_url: `${options.baseUrl || 'https://spirittours.com'}/unsubscribe?email=${encodeURIComponent(recipient)}`
      };

      const rendered = template.render(recipientVars);

      const emailId = await this.queueEmail({
        to: recipient,
        from: options.from || process.env.DEFAULT_FROM_EMAIL || 'noreply@spirittours.com',
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        priority: options.priority || 5,
        serverId: options.serverId,
        scheduledFor: options.scheduledFor,
        metadata: {
          campaignId: options.campaignId,
          templateId: template.id,
          type: 'mass_email'
        }
      });

      emailIds.push(emailId);

      // Add delay between queueing to avoid overwhelming
      if (options.queueDelay) {
        await new Promise(resolve => setTimeout(resolve, options.queueDelay));
      }
    }

    logger.info(`Queued ${emailIds.length} mass emails for campaign: ${options.campaignId || 'unknown'}`);

    return emailIds;
  }

  /**
   * Process email queue
   */
  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    logger.info('Starting email queue processing...');

    while (this.queue.length > 0) {
      // Sort queue by priority and scheduled time
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return (a.scheduledFor || 0) - (b.scheduledFor || 0);
      });

      // Get next email ready to send
      const itemIndex = this.queue.findIndex(item => item.isReadyToSend());
      if (itemIndex === -1) break; // No items ready to send

      const item = this.queue[itemIndex];
      this.queue.splice(itemIndex, 1);

      // Try to send
      await this.sendEmailItem(item);

      // Small delay between emails to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;
    logger.info('Email queue processing completed');

    // Emit event
    this.emit('queueProcessed');
  }

  /**
   * Send individual email item
   */
  async sendEmailItem(item) {
    item.status = 'sending';

    try {
      // Get available server
      const server = this.getAvailableServer(item.serverId);
      if (!server) {
        throw new Error('No available email server');
      }

      const transporter = this.transporters.get(server.id);
      if (!transporter) {
        throw new Error(`Transporter not found for server ${server.id}`);
      }

      // Prepare mail options
      const mailOptions = {
        from: item.from,
        to: item.to,
        subject: item.subject,
        html: item.html,
        text: item.text,
        attachments: item.attachments
      };

      // Send email
      const info = await transporter.sendMail(mailOptions);

      // Mark as sent
      item.status = 'sent';
      item.sentAt = Date.now();
      server.recordSuccess();

      // Update stats
      this.emailStats.sent++;
      this.emailStats.queued--;
      this.emailStats.byServer[server.id].sent++;

      logger.info(`Email sent successfully: ${item.id} via ${server.name} - MessageId: ${info.messageId}`);

      // Emit event
      this.emit('emailSent', { item, server, info });

      return true;

    } catch (error) {
      logger.error(`Failed to send email ${item.id}: ${error.message}`);

      item.lastError = error.message;
      item.retries++;

      // Record failure for the server
      if (item.serverId) {
        const server = this.servers.get(item.serverId);
        if (server) server.recordFailure();
      }

      // Re-queue if retries available
      if (item.retries < item.maxRetries) {
        item.status = 'queued';
        this.queue.push(item);
        logger.info(`Email ${item.id} re-queued (attempt ${item.retries}/${item.maxRetries})`);
      } else {
        item.status = 'failed';
        this.emailStats.failed++;
        this.emailStats.queued--;
        logger.error(`Email ${item.id} permanently failed after ${item.retries} attempts`);

        // Emit event
        this.emit('emailFailed', { item, error });
      }

      return false;
    }
  }

  /**
   * Send email immediately (bypass queue)
   */
  async sendEmailNow(emailData) {
    const item = new EmailQueueItem(emailData);
    return await this.sendEmailItem(item);
  }

  /**
   * Add newsletter template
   */
  addTemplate(templateData) {
    const template = new NewsletterTemplate(templateData);
    this.templates.set(template.id, template);
    logger.info(`Newsletter template added: ${template.name} (${template.id})`);
    return template.id;
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId) {
    return this.templates.get(templateId);
  }

  /**
   * Update template
   */
  updateTemplate(templateId, updates) {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    Object.assign(template, updates);
    template.updatedAt = Date.now();

    logger.info(`Newsletter template updated: ${template.name} (${templateId})`);
    return template;
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId) {
    const deleted = this.templates.delete(templateId);
    if (deleted) {
      logger.info(`Newsletter template deleted: ${templateId}`);
    }
    return deleted;
  }

  /**
   * List all templates
   */
  listTemplates(category = null) {
    const allTemplates = Array.from(this.templates.values());
    if (category) {
      return allTemplates.filter(t => t.category === category);
    }
    return allTemplates;
  }

  /**
   * Send newsletter to subscriber list
   */
  async sendNewsletter(templateId, subscribers, variables = {}, options = {}) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return await this.queueMassEmails(subscribers, template, variables, {
      ...options,
      campaignId: options.campaignId || `newsletter_${Date.now()}`
    });
  }

  /**
   * Unsubscribe email
   */
  unsubscribe(email) {
    this.unsubscribed.add(email.toLowerCase());
    logger.info(`Email unsubscribed: ${email}`);
    this.emit('unsubscribed', email);
  }

  /**
   * Check if email is unsubscribed
   */
  isUnsubscribed(email) {
    return this.unsubscribed.has(email.toLowerCase());
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      servers: Array.from(this.servers.values()).map(s => s.getStats()),
      queue: {
        size: this.queue.length,
        byPriority: this.queue.reduce((acc, item) => {
          acc[item.priority] = (acc[item.priority] || 0) + 1;
          return acc;
        }, {}),
        byStatus: this.queue.reduce((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {})
      },
      stats: this.emailStats,
      templates: this.templates.size,
      unsubscribed: this.unsubscribed.size,
      processing: this.processing
    };
  }

  /**
   * Verify all server connections
   */
  async verifyAllConnections() {
    const results = {};

    for (const [serverId, transporter] of this.transporters.entries()) {
      const server = this.servers.get(serverId);
      try {
        await transporter.verify();
        results[serverId] = {
          success: true,
          name: server.name,
          host: server.host,
          message: 'Connection verified successfully'
        };
      } catch (error) {
        results[serverId] = {
          success: false,
          name: server.name,
          host: server.host,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Close all connections
   */
  async close() {
    for (const transporter of this.transporters.values()) {
      transporter.close();
    }
    this.transporters.clear();
    logger.info('All email server connections closed');
  }
}

// Export singleton instance
const nodemailerService = new NodemailerService();

module.exports = {
  nodemailerService,
  NodemailerService,
  EmailServerConfig,
  NewsletterTemplate
};
