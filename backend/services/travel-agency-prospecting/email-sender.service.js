/**
 * Email Sender Service - Sistema Híbrido
 * 
 * Soporta:
 * - SendGrid API
 * - Servidor SMTP propio
 * - Rate limiting configurable
 * - Queue management
 * - AI-powered email generation
 * - Template system
 * 
 * @module EmailSenderService
 */

const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const logger = require('../../utils/logger');
const Queue = require('bull');
const Redis = require('ioredis');

class EmailSenderService {
  constructor() {
    this.config = {
      provider: 'smtp', // 'smtp' | 'sendgrid'
      
      // Rate limiting (configurable from dashboard)
      limits: {
        perMinute: 10,        // Max emails per minute
        perHour: 50,          // Max emails per hour
        perDay: 500,          // Max emails per day
        burstSize: 5,         // Max emails in single burst
        delayBetweenEmails: 6000  // 6 seconds between emails
      },
      
      // SMTP Configuration
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.spirittours.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        pool: true,              // Use connection pool
        maxConnections: 5,       // Max simultaneous connections
        maxMessages: 100,        // Max messages per connection
        rateDelta: 1000,         // Time window for rate limiting
        rateLimit: 5             // Max messages per rateDelta
      },
      
      // SendGrid Configuration
      sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY,
        sandboxMode: false
      }
    };
    
    // Initialize transporter
    this.transporter = null;
    this.initializeTransporter();
    
    // Initialize SendGrid
    if (this.config.sendgrid.apiKey) {
      sgMail.setApiKey(this.config.sendgrid.apiKey);
    }
    
    // Initialize email queue
    this.emailQueue = new Queue('email-sending', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      }
    });
    
    // Track sending statistics
    this.stats = {
      sentToday: 0,
      sentThisHour: 0,
      sentThisMinute: 0,
      lastResetDay: new Date().toDateString(),
      lastResetHour: new Date().getHours(),
      lastResetMinute: new Date().getMinutes()
    };
    
    // Process email queue
    this.setupQueueProcessor();
    
    // Reset counters periodically
    this.setupCounterResets();
  }
  
  /**
   * Initialize SMTP transporter
   */
  initializeTransporter() {
    if (this.config.provider === 'smtp') {
      this.transporter = nodemailer.createTransport(this.config.smtp);
      
      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('SMTP connection failed:', error);
        } else {
          logger.info('✅ SMTP server ready to send emails');
        }
      });
    }
  }
  
  /**
   * Update configuration from dashboard
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    
    // Reinitialize if provider changed
    if (newConfig.provider || newConfig.smtp) {
      this.initializeTransporter();
    }
    
    logger.info('Email sender configuration updated:', this.config);
  }
  
  /**
   * Get current configuration
   */
  getConfig() {
    return {
      ...this.config,
      // Hide sensitive data
      smtp: {
        ...this.config.smtp,
        auth: {
          user: this.config.smtp.auth.user,
          pass: '********'
        }
      },
      sendgrid: {
        apiKey: this.config.sendgrid.apiKey ? '********' : null,
        sandboxMode: this.config.sendgrid.sandboxMode
      }
    };
  }
  
  /**
   * Check if can send email (rate limiting)
   */
  canSendEmail() {
    const now = new Date();
    
    // Reset counters if needed
    if (now.toDateString() !== this.stats.lastResetDay) {
      this.stats.sentToday = 0;
      this.stats.lastResetDay = now.toDateString();
    }
    
    if (now.getHours() !== this.stats.lastResetHour) {
      this.stats.sentThisHour = 0;
      this.stats.lastResetHour = now.getHours();
    }
    
    if (now.getMinutes() !== this.stats.lastResetMinute) {
      this.stats.sentThisMinute = 0;
      this.stats.lastResetMinute = now.getMinutes();
    }
    
    // Check limits
    if (this.stats.sentThisMinute >= this.config.limits.perMinute) {
      return { allowed: false, reason: 'Per-minute limit reached' };
    }
    
    if (this.stats.sentThisHour >= this.config.limits.perHour) {
      return { allowed: false, reason: 'Per-hour limit reached' };
    }
    
    if (this.stats.sentToday >= this.config.limits.perDay) {
      return { allowed: false, reason: 'Daily limit reached' };
    }
    
    return { allowed: true };
  }
  
  /**
   * Send single email
   */
  async sendEmail(emailData) {
    const {
      to,
      subject,
      html,
      text,
      from = process.env.DEFAULT_FROM_EMAIL,
      replyTo,
      attachments = [],
      metadata = {}
    } = emailData;
    
    // Check rate limits
    const canSend = this.canSendEmail();
    if (!canSend.allowed) {
      throw new Error(`Rate limit exceeded: ${canSend.reason}`);
    }
    
    try {
      let result;
      
      if (this.config.provider === 'sendgrid') {
        // Send via SendGrid
        result = await this.sendViaSendGrid({
          to, subject, html, text, from, replyTo, attachments
        });
      } else {
        // Send via SMTP
        result = await this.sendViaSMTP({
          to, subject, html, text, from, replyTo, attachments
        });
      }
      
      // Update statistics
      this.stats.sentThisMinute++;
      this.stats.sentThisHour++;
      this.stats.sentToday++;
      
      // Log sending
      logger.info(`Email sent to ${to} via ${this.config.provider}`);
      
      // Save to database
      await this.logEmailSent({
        to, subject, from, provider: this.config.provider,
        result, metadata, sentAt: new Date()
      });
      
      return {
        success: true,
        messageId: result.messageId,
        provider: this.config.provider
      };
      
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      
      // Log failure
      await this.logEmailFailed({
        to, subject, error: error.message, sentAt: new Date()
      });
      
      throw error;
    }
  }
  
  /**
   * Send via SendGrid API
   */
  async sendViaSendGrid(emailData) {
    const msg = {
      to: emailData.to,
      from: emailData.from,
      replyTo: emailData.replyTo,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      attachments: emailData.attachments,
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };
    
    const response = await sgMail.send(msg);
    return {
      messageId: response[0].headers['x-message-id'],
      accepted: [emailData.to]
    };
  }
  
  /**
   * Send via SMTP
   */
  async sendViaSMTP(emailData) {
    const mailOptions = {
      from: emailData.from,
      to: emailData.to,
      replyTo: emailData.replyTo,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
      attachments: emailData.attachments
    };
    
    return await this.transporter.sendMail(mailOptions);
  }
  
  /**
   * Queue email for sending (recommended for bulk)
   */
  async queueEmail(emailData, options = {}) {
    const job = await this.emailQueue.add('send-email', emailData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000  // 1 minute
      },
      delay: options.delay || 0,
      priority: options.priority || 5,
      ...options
    });
    
    return {
      jobId: job.id,
      status: 'queued'
    };
  }
  
  /**
   * Queue bulk emails with smart scheduling
   */
  async queueBulkEmails(emails, options = {}) {
    const jobs = [];
    const delayBetween = this.config.limits.delayBetweenEmails;
    
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const delay = i * delayBetween; // Spread over time
      
      const job = await this.queueEmail(email, {
        ...options,
        delay,
        priority: options.priority || 5
      });
      
      jobs.push(job);
    }
    
    logger.info(`Queued ${jobs.length} emails for sending over ${Math.ceil(jobs.length * delayBetween / 1000 / 60)} minutes`);
    
    return {
      totalQueued: jobs.length,
      estimatedTime: jobs.length * delayBetween,
      jobIds: jobs.map(j => j.jobId)
    };
  }
  
  /**
   * Setup queue processor
   */
  setupQueueProcessor() {
    this.emailQueue.process('send-email', async (job) => {
      const emailData = job.data;
      
      // Update progress
      await job.progress(0);
      
      // Check if we can send
      const canSend = this.canSendEmail();
      if (!canSend.allowed) {
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
        throw new Error(`Rate limit: ${canSend.reason}`);
      }
      
      // Send email
      await job.progress(50);
      const result = await this.sendEmail(emailData);
      
      await job.progress(100);
      return result;
    });
    
    // Handle completed jobs
    this.emailQueue.on('completed', (job, result) => {
      logger.info(`Email job ${job.id} completed:`, result);
    });
    
    // Handle failed jobs
    this.emailQueue.on('failed', (job, err) => {
      logger.error(`Email job ${job.id} failed:`, err.message);
    });
  }
  
  /**
   * Setup counter resets
   */
  setupCounterResets() {
    // Reset minute counter
    setInterval(() => {
      this.stats.sentThisMinute = 0;
    }, 60 * 1000); // Every minute
    
    // Reset hour counter
    setInterval(() => {
      this.stats.sentThisHour = 0;
    }, 60 * 60 * 1000); // Every hour
    
    // Reset day counter
    setInterval(() => {
      this.stats.sentToday = 0;
    }, 24 * 60 * 60 * 1000); // Every day
  }
  
  /**
   * Get sending statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      limits: this.config.limits,
      remainingToday: this.config.limits.perDay - this.stats.sentToday,
      remainingThisHour: this.config.limits.perHour - this.stats.sentThisHour,
      remainingThisMinute: this.config.limits.perMinute - this.stats.sentThisMinute
    };
  }
  
  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
      this.emailQueue.getDelayedCount()
    ]);
    
    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  }
  
  /**
   * Log email sent to database
   */
  async logEmailSent(data) {
    const EmailLog = require('../../models/EmailLog');
    
    await EmailLog.create({
      type: 'sent',
      to: data.to,
      subject: data.subject,
      from: data.from,
      provider: data.provider,
      messageId: data.result.messageId,
      metadata: data.metadata,
      sentAt: data.sentAt
    });
  }
  
  /**
   * Log email failed
   */
  async logEmailFailed(data) {
    const EmailLog = require('../../models/EmailLog');
    
    await EmailLog.create({
      type: 'failed',
      to: data.to,
      subject: data.subject,
      error: data.error,
      sentAt: data.sentAt
    });
  }
  
  /**
   * Test email configuration
   */
  async testConfiguration(testEmail) {
    try {
      await this.sendEmail({
        to: testEmail,
        subject: 'Test Email - Spirit Tours',
        html: '<h1>Test Successful</h1><p>Your email configuration is working correctly.</p>',
        text: 'Test Successful. Your email configuration is working correctly.'
      });
      
      return {
        success: true,
        message: 'Test email sent successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Pause queue (emergency stop)
   */
  async pauseQueue() {
    await this.emailQueue.pause();
    logger.warn('⏸️ Email queue paused');
  }
  
  /**
   * Resume queue
   */
  async resumeQueue() {
    await this.emailQueue.resume();
    logger.info('▶️ Email queue resumed');
  }
  
  /**
   * Clear failed jobs
   */
  async clearFailedJobs() {
    const failed = await this.emailQueue.getFailed();
    await Promise.all(failed.map(job => job.remove()));
    logger.info(`Cleared ${failed.length} failed jobs`);
  }
}

// Singleton instance
const emailSenderService = new EmailSenderService();

module.exports = emailSenderService;
