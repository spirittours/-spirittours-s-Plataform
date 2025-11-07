/**
 * Real-time Notification Service
 * Handles WebSocket, Email, and SMS notifications
 * 
 * Features:
 * - Multi-channel delivery (WebSocket, Email, SMS)
 * - Priority-based routing
 * - Template management
 * - Delivery tracking
 * - Retry logic
 * - User preferences
 */

const { EventEmitter } = require('events');
const nodemailer = require('nodemailer');

class NotificationService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      email: {
        host: config.emailHost || process.env.SMTP_HOST || 'smtp.gmail.com',
        port: config.emailPort || process.env.SMTP_PORT || 587,
        secure: config.emailSecure || false,
        auth: {
          user: config.emailUser || process.env.SMTP_USER,
          pass: config.emailPass || process.env.SMTP_PASS
        }
      },
      sms: {
        provider: config.smsProvider || process.env.SMS_PROVIDER || 'twilio',
        accountSid: config.smsAccountSid || process.env.TWILIO_ACCOUNT_SID,
        authToken: config.smsAuthToken || process.env.TWILIO_AUTH_TOKEN,
        fromNumber: config.smsFromNumber || process.env.TWILIO_FROM_NUMBER
      },
      websocket: {
        enabled: config.websocketEnabled !== false
      },
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 5000
    };

    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransporter(this.config.email);

    // WebSocket clients registry
    this.wsClients = new Map();

    // Notification queue
    this.queue = [];
    this.processing = false;

    // Statistics
    this.stats = {
      sent: { email: 0, sms: 0, websocket: 0 },
      failed: { email: 0, sms: 0, websocket: 0 },
      pending: 0
    };

    // Notification templates
    this.templates = {
      agent_alert: {
        email: {
          subject: 'Agent Alert: {{title}}',
          body: 'Alert from {{agent}}: {{message}}'
        },
        sms: 'Alert: {{message}}'
      },
      performance_report: {
        email: {
          subject: 'Performance Report - {{period}}',
          body: 'Performance report for {{employee}}: {{summary}}'
        }
      },
      customer_followup: {
        email: {
          subject: 'Follow-up Required: {{customer}}',
          body: 'Action needed for {{customer}}: {{action}}'
        }
      },
      survey_response: {
        email: {
          subject: 'New Survey Response',
          body: 'New survey response from {{customer}} with NPS {{nps}}'
        },
        websocket: {
          type: 'survey_response',
          data: '{{data}}'
        }
      }
    };
  }

  /**
   * Register WebSocket client
   */
  registerWSClient(userId, socket) {
    this.wsClients.set(userId, socket);
    this.emit('client:registered', { userId });
  }

  /**
   * Unregister WebSocket client
   */
  unregisterWSClient(userId) {
    this.wsClients.delete(userId);
    this.emit('client:unregistered', { userId });
  }

  /**
   * Send notification
   */
  async send(notification) {
    const {
      userId,
      type,
      channels = ['websocket'],
      priority = 'normal',
      template,
      data,
      metadata = {}
    } = notification;

    const notif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      channels,
      priority,
      template,
      data,
      metadata,
      attempts: 0,
      status: 'pending',
      createdAt: new Date()
    };

    // Add to queue
    this.queue.push(notif);
    this.stats.pending++;

    this.emit('notification:queued', { notificationId: notif.id });

    // Process queue
    if (!this.processing) {
      this.processQueue();
    }

    return notif.id;
  }

  /**
   * Process notification queue
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      // Sort by priority
      this.queue.sort((a, b) => {
        const priorities = { urgent: 3, high: 2, normal: 1, low: 0 };
        return (priorities[b.priority] || 1) - (priorities[a.priority] || 1);
      });

      const notification = this.queue.shift();
      this.stats.pending--;

      try {
        await this.processNotification(notification);
      } catch (error) {
        console.error('Error processing notification:', error);
      }
    }

    this.processing = false;
  }

  /**
   * Process single notification
   */
  async processNotification(notification) {
    const results = { websocket: null, email: null, sms: null };

    // Send via each channel
    for (const channel of notification.channels) {
      try {
        switch (channel) {
          case 'websocket':
            results.websocket = await this.sendViaWebSocket(notification);
            break;
          case 'email':
            results.email = await this.sendViaEmail(notification);
            break;
          case 'sms':
            results.sms = await this.sendViaSMS(notification);
            break;
        }
      } catch (error) {
        console.error(`Failed to send via ${channel}:`, error);
        
        // Retry logic
        if (notification.attempts < this.config.retryAttempts) {
          notification.attempts++;
          setTimeout(() => {
            this.queue.push(notification);
            this.processQueue();
          }, this.config.retryDelay);
        } else {
          this.stats.failed[channel]++;
          this.emit('notification:failed', { 
            notificationId: notification.id, 
            channel,
            error: error.message 
          });
        }
      }
    }

    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.results = results;

    this.emit('notification:sent', { notificationId: notification.id, results });

    return results;
  }

  /**
   * Send via WebSocket
   */
  async sendViaWebSocket(notification) {
    const socket = this.wsClients.get(notification.userId);
    
    if (!socket || socket.readyState !== 1) {
      throw new Error('WebSocket not connected');
    }

    const message = this.renderTemplate(notification, 'websocket');
    
    socket.send(JSON.stringify({
      type: 'notification',
      id: notification.id,
      data: message,
      timestamp: new Date()
    }));

    this.stats.sent.websocket++;

    return { success: true, channel: 'websocket' };
  }

  /**
   * Send via Email
   */
  async sendViaEmail(notification) {
    const template = this.renderTemplate(notification, 'email');
    
    const mailOptions = {
      from: this.config.email.auth.user,
      to: notification.data.email || notification.data.recipient,
      subject: template.subject,
      html: this.createEmailHTML(template.body, notification.data),
      text: template.body
    };

    const info = await this.emailTransporter.sendMail(mailOptions);

    this.stats.sent.email++;

    return { 
      success: true, 
      channel: 'email',
      messageId: info.messageId 
    };
  }

  /**
   * Send via SMS
   */
  async sendViaSMS(notification) {
    // This is a placeholder - actual implementation depends on SMS provider
    const message = this.renderTemplate(notification, 'sms');
    
    // Twilio example (commented out - requires twilio package)
    /*
    const client = require('twilio')(
      this.config.sms.accountSid,
      this.config.sms.authToken
    );

    const result = await client.messages.create({
      body: message,
      from: this.config.sms.fromNumber,
      to: notification.data.phone
    });
    */

    console.log('SMS would be sent:', message);

    this.stats.sent.sms++;

    return { 
      success: true, 
      channel: 'sms',
      message: 'SMS sending simulated'
    };
  }

  /**
   * Render notification template
   */
  renderTemplate(notification, channel) {
    const template = this.templates[notification.template]?.[channel];
    
    if (!template) {
      return notification.data.message || JSON.stringify(notification.data);
    }

    // Simple template rendering
    let rendered = typeof template === 'string' ? template : JSON.stringify(template);
    
    Object.keys(notification.data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, notification.data[key]);
    });

    // Parse back to object if it was an object
    if (typeof template === 'object') {
      return JSON.parse(rendered);
    }

    return rendered;
  }

  /**
   * Create email HTML
   */
  createEmailHTML(body, data) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { background: #f9f9f9; padding: 20px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Spirit Tours</h1>
    </div>
    <div class="content">
      ${body}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Spirit Tours. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(message, filter = null) {
    let sent = 0;
    
    for (const [userId, socket] of this.wsClients.entries()) {
      if (filter && !filter(userId)) continue;
      
      if (socket.readyState === 1) {
        socket.send(JSON.stringify(message));
        sent++;
      }
    }

    return sent;
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId) {
    // This would fetch from database
    return {
      channels: {
        email: true,
        sms: false,
        websocket: true
      },
      quiet_hours: {
        enabled: true,
        start: '22:00',
        end: '08:00'
      },
      categories: {
        agent_alerts: true,
        performance_reports: true,
        customer_updates: true
      }
    };
  }

  /**
   * Check if notification should be sent based on preferences
   */
  async shouldSend(userId, notification) {
    const prefs = await this.getUserPreferences(userId);
    
    // Check quiet hours
    if (prefs.quiet_hours.enabled && notification.priority !== 'urgent') {
      const now = new Date();
      const hour = now.getHours();
      const start = parseInt(prefs.quiet_hours.start.split(':')[0]);
      const end = parseInt(prefs.quiet_hours.end.split(':')[0]);
      
      if (hour >= start || hour < end) {
        return false;
      }
    }

    // Check channel preferences
    notification.channels = notification.channels.filter(
      channel => prefs.channels[channel]
    );

    // Check category preferences
    if (notification.type && !prefs.categories[notification.type]) {
      return false;
    }

    return notification.channels.length > 0;
  }

  /**
   * Get notification statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      connectedClients: this.wsClients.size,
      queueLength: this.queue.length,
      totalSent: Object.values(this.stats.sent).reduce((a, b) => a + b, 0),
      totalFailed: Object.values(this.stats.failed).reduce((a, b) => a + b, 0)
    };
  }

  /**
   * Send agent alert
   */
  async sendAgentAlert(userId, agentName, message, priority = 'normal') {
    return this.send({
      userId,
      type: 'agent_alert',
      channels: ['websocket', 'email'],
      priority,
      template: 'agent_alert',
      data: {
        agent: agentName,
        title: 'Agent Alert',
        message,
        email: userId // Would be fetched from user data
      }
    });
  }

  /**
   * Send performance report
   */
  async sendPerformanceReport(userId, employeeId, period, summary) {
    return this.send({
      userId,
      type: 'performance_report',
      channels: ['email'],
      priority: 'normal',
      template: 'performance_report',
      data: {
        employee: employeeId,
        period,
        summary,
        email: userId
      }
    });
  }
}

// Singleton
let notificationServiceInstance = null;

function getNotificationService(config = {}) {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService(config);
  }
  return notificationServiceInstance;
}

module.exports = {
  NotificationService,
  getNotificationService
};
