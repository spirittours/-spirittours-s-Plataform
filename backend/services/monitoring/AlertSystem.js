const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

/**
 * AlertSystem - Advanced alert management and notification system
 * 
 * Features:
 * - Multiple alert channels (email, webhook, SMS, Slack)
 * - Alert rules and conditions
 * - Alert aggregation and deduplication
 * - Alert escalation policies
 * - Alert history and analytics
 * - Snooze and acknowledgment
 */
class AlertSystem extends EventEmitter {
  constructor() {
    super();
    
    this.rules = new Map(); // ruleId -> alert rule
    this.alerts = new Map(); // alertId -> alert
    this.history = []; // Alert history
    this.channels = new Map(); // channelId -> channel config

    this.config = {
      maxHistorySize: 1000,
      aggregationWindow: 300000, // 5 minutes
      escalationDelay: 600000, // 10 minutes
      snoozeDefaultDuration: 3600000, // 1 hour
      enableDeduplication: true
    };

    this.stats = {
      totalAlerts: 0,
      activeAlerts: 0,
      acknowledgedAlerts: 0,
      resolvedAlerts: 0,
      escalatedAlerts: 0
    };

    // Initialize default channels
    this.initializeDefaultChannels();

    // Start background tasks
    this.startBackgroundTasks();
  }

  /**
   * Initialize default notification channels
   */
  initializeDefaultChannels() {
    // Email channel
    this.registerChannel({
      id: 'email',
      type: 'email',
      name: 'Email Notifications',
      enabled: true,
      config: {
        from: process.env.ALERT_EMAIL_FROM || 'alerts@example.com',
        to: process.env.ALERT_EMAIL_TO?.split(',') || []
      }
    });

    // Webhook channel
    this.registerChannel({
      id: 'webhook',
      type: 'webhook',
      name: 'Webhook Notifications',
      enabled: false,
      config: {
        url: process.env.ALERT_WEBHOOK_URL || '',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    });

    // Slack channel
    this.registerChannel({
      id: 'slack',
      type: 'slack',
      name: 'Slack Notifications',
      enabled: false,
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        channel: process.env.SLACK_CHANNEL || '#alerts'
      }
    });
  }

  /**
   * Register an alert rule
   */
  registerRule(rule) {
    const ruleId = rule.id || uuidv4();
    
    const alertRule = {
      id: ruleId,
      name: rule.name,
      description: rule.description,
      condition: rule.condition,
      severity: rule.severity || 'warning',
      category: rule.category || 'general',
      channels: rule.channels || ['email'],
      enabled: rule.enabled !== false,
      throttle: rule.throttle || 300000, // 5 minutes
      lastTriggered: null,
      triggerCount: 0,
      escalationPolicy: rule.escalationPolicy || null,
      metadata: rule.metadata || {}
    };

    this.rules.set(ruleId, alertRule);
    console.log(`Alert rule registered: ${ruleId} - ${rule.name}`);
    
    return ruleId;
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(ruleId, context = {}) {
    const rule = this.rules.get(ruleId);
    
    if (!rule) {
      throw new Error(`Alert rule not found: ${ruleId}`);
    }

    if (!rule.enabled) {
      console.log(`Alert rule disabled: ${ruleId}`);
      return null;
    }

    // Check throttling
    if (rule.lastTriggered) {
      const timeSinceLastTrigger = Date.now() - rule.lastTriggered;
      if (timeSinceLastTrigger < rule.throttle) {
        console.log(`Alert throttled: ${ruleId}`);
        return null;
      }
    }

    // Check deduplication
    if (this.config.enableDeduplication) {
      const duplicate = this.findDuplicateAlert(ruleId, context);
      if (duplicate) {
        console.log(`Duplicate alert found: ${duplicate.id}`);
        duplicate.occurrences++;
        duplicate.lastOccurrence = Date.now();
        return duplicate;
      }
    }

    // Create alert
    const alertId = uuidv4();
    const alert = {
      id: alertId,
      ruleId,
      ruleName: rule.name,
      severity: rule.severity,
      category: rule.category,
      status: 'active',
      message: this.generateAlertMessage(rule, context),
      context,
      channels: rule.channels,
      triggeredAt: Date.now(),
      lastOccurrence: Date.now(),
      occurrences: 1,
      acknowledgedAt: null,
      acknowledgedBy: null,
      resolvedAt: null,
      resolvedBy: null,
      snoozedUntil: null,
      escalationLevel: 0,
      escalationPolicy: rule.escalationPolicy
    };

    this.alerts.set(alertId, alert);
    this.stats.totalAlerts++;
    this.stats.activeAlerts++;

    // Update rule
    rule.lastTriggered = Date.now();
    rule.triggerCount++;

    // Add to history
    this.addToHistory({
      type: 'triggered',
      alertId,
      ruleId,
      severity: rule.severity,
      message: alert.message,
      timestamp: Date.now()
    });

    // Send notifications
    await this.sendNotifications(alert);

    // Emit event
    this.emit('alert:triggered', alert);

    console.log(`Alert triggered: ${alertId} - ${rule.name}`);

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId, userId) {
    const alert = this.alerts.get(alertId);
    
    if (!alert) {
      throw new Error('Alert not found');
    }

    if (alert.status !== 'active') {
      throw new Error('Only active alerts can be acknowledged');
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = userId;

    this.stats.activeAlerts--;
    this.stats.acknowledgedAlerts++;

    // Add to history
    this.addToHistory({
      type: 'acknowledged',
      alertId,
      userId,
      timestamp: Date.now()
    });

    this.emit('alert:acknowledged', alert);

    console.log(`Alert acknowledged: ${alertId} by ${userId}`);

    return alert;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId, userId, resolution) {
    const alert = this.alerts.get(alertId);
    
    if (!alert) {
      throw new Error('Alert not found');
    }

    if (alert.status === 'resolved') {
      throw new Error('Alert already resolved');
    }

    const wasActive = alert.status === 'active';

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();
    alert.resolvedBy = userId;
    alert.resolution = resolution;

    if (wasActive) {
      this.stats.activeAlerts--;
    } else if (alert.status === 'acknowledged') {
      this.stats.acknowledgedAlerts--;
    }
    this.stats.resolvedAlerts++;

    // Add to history
    this.addToHistory({
      type: 'resolved',
      alertId,
      userId,
      resolution,
      timestamp: Date.now()
    });

    this.emit('alert:resolved', alert);

    console.log(`Alert resolved: ${alertId} by ${userId}`);

    return alert;
  }

  /**
   * Snooze an alert
   */
  snoozeAlert(alertId, duration, userId) {
    const alert = this.alerts.get(alertId);
    
    if (!alert) {
      throw new Error('Alert not found');
    }

    if (alert.status !== 'active') {
      throw new Error('Only active alerts can be snoozed');
    }

    const snoozeDuration = duration || this.config.snoozeDefaultDuration;
    alert.snoozedUntil = Date.now() + snoozeDuration;

    // Add to history
    this.addToHistory({
      type: 'snoozed',
      alertId,
      userId,
      duration: snoozeDuration,
      timestamp: Date.now()
    });

    this.emit('alert:snoozed', alert);

    console.log(`Alert snoozed: ${alertId} for ${snoozeDuration}ms`);

    return alert;
  }

  /**
   * Escalate an alert
   */
  async escalateAlert(alert) {
    if (!alert.escalationPolicy) {
      return;
    }

    alert.escalationLevel++;
    this.stats.escalatedAlerts++;

    const policy = alert.escalationPolicy;
    const level = alert.escalationLevel;

    if (level < policy.levels.length) {
      const escalationLevel = policy.levels[level];
      
      // Add to history
      this.addToHistory({
        type: 'escalated',
        alertId: alert.id,
        escalationLevel: level,
        timestamp: Date.now()
      });

      // Send to escalation channels
      await this.sendNotifications(alert, escalationLevel.channels);

      this.emit('alert:escalated', { alert, level });

      console.log(`Alert escalated: ${alert.id} to level ${level}`);
    }
  }

  /**
   * Send notifications through configured channels
   */
  async sendNotifications(alert, channels = null) {
    const targetChannels = channels || alert.channels;

    for (const channelId of targetChannels) {
      const channel = this.channels.get(channelId);
      
      if (!channel || !channel.enabled) {
        continue;
      }

      try {
        await this.sendToChannel(channel, alert);
      } catch (error) {
        console.error(`Failed to send to channel ${channelId}:`, error);
      }
    }
  }

  /**
   * Send alert to specific channel
   */
  async sendToChannel(channel, alert) {
    switch (channel.type) {
      case 'email':
        await this.sendEmail(channel, alert);
        break;
      
      case 'webhook':
        await this.sendWebhook(channel, alert);
        break;
      
      case 'slack':
        await this.sendSlack(channel, alert);
        break;
      
      default:
        console.log(`Unknown channel type: ${channel.type}`);
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(channel, alert) {
    // TODO: Implement email sending using nodemailer
    console.log(`Sending email alert: ${alert.id} to ${channel.config.to}`);
    
    const emailData = {
      from: channel.config.from,
      to: channel.config.to,
      subject: `[${alert.severity.toUpperCase()}] ${alert.ruleName}`,
      text: alert.message,
      html: this.generateEmailHTML(alert)
    };

    // Placeholder - integrate with actual email service
    this.emit('notification:email', emailData);
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(channel, alert) {
    console.log(`Sending webhook alert: ${alert.id} to ${channel.config.url}`);
    
    // TODO: Implement actual HTTP request
    const webhookData = {
      alertId: alert.id,
      severity: alert.severity,
      category: alert.category,
      message: alert.message,
      triggeredAt: alert.triggeredAt,
      context: alert.context
    };

    this.emit('notification:webhook', webhookData);
  }

  /**
   * Send Slack notification
   */
  async sendSlack(channel, alert) {
    console.log(`Sending Slack alert: ${alert.id} to ${channel.config.channel}`);
    
    // TODO: Implement Slack webhook
    const slackData = {
      channel: channel.config.channel,
      text: alert.message,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Category',
              value: alert.category,
              short: true
            },
            {
              title: 'Triggered',
              value: new Date(alert.triggeredAt).toISOString(),
              short: true
            }
          ]
        }
      ]
    };

    this.emit('notification:slack', slackData);
  }

  /**
   * Register a notification channel
   */
  registerChannel(channel) {
    this.channels.set(channel.id, channel);
    console.log(`Notification channel registered: ${channel.id} - ${channel.name}`);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(filters = {}) {
    let alerts = Array.from(this.alerts.values()).filter(a => a.status === 'active');

    if (filters.severity) {
      alerts = alerts.filter(a => a.severity === filters.severity);
    }

    if (filters.category) {
      alerts = alerts.filter(a => a.category === filters.category);
    }

    if (filters.ruleId) {
      alerts = alerts.filter(a => a.ruleId === filters.ruleId);
    }

    return alerts.sort((a, b) => b.triggeredAt - a.triggeredAt);
  }

  /**
   * Get alert history
   */
  getHistory(filters = {}) {
    let history = [...this.history];

    if (filters.type) {
      history = history.filter(h => h.type === filters.type);
    }

    if (filters.severity) {
      history = history.filter(h => h.severity === filters.severity);
    }

    if (filters.since) {
      history = history.filter(h => h.timestamp >= filters.since);
    }

    return history.slice(-100); // Return last 100 entries
  }

  /**
   * Get alert statistics
   */
  getStats() {
    return {
      ...this.stats,
      ruleCount: this.rules.size,
      channelCount: this.channels.size,
      historySize: this.history.length
    };
  }

  /**
   * List all rules
   */
  listRules() {
    return Array.from(this.rules.values()).map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      severity: r.severity,
      category: r.category,
      enabled: r.enabled,
      triggerCount: r.triggerCount,
      lastTriggered: r.lastTriggered
    }));
  }

  // ===== HELPER METHODS =====

  findDuplicateAlert(ruleId, context) {
    const recentAlerts = Array.from(this.alerts.values()).filter(a => {
      return a.ruleId === ruleId &&
             a.status === 'active' &&
             Date.now() - a.lastOccurrence < this.config.aggregationWindow;
    });

    // Simple deduplication - can be enhanced with context comparison
    return recentAlerts[0] || null;
  }

  generateAlertMessage(rule, context) {
    let message = `Alert: ${rule.name}`;
    
    if (rule.description) {
      message += `\n${rule.description}`;
    }

    if (context && Object.keys(context).length > 0) {
      message += '\n\nContext:';
      for (const [key, value] of Object.entries(context)) {
        message += `\n- ${key}: ${value}`;
      }
    }

    return message;
  }

  generateEmailHTML(alert) {
    return `
      <html>
        <body>
          <h2 style="color: ${this.getSeverityColor(alert.severity)}">
            [${alert.severity.toUpperCase()}] ${alert.ruleName}
          </h2>
          <p>${alert.message}</p>
          <hr>
          <p><strong>Triggered:</strong> ${new Date(alert.triggeredAt).toLocaleString()}</p>
          <p><strong>Category:</strong> ${alert.category}</p>
          <p><strong>Alert ID:</strong> ${alert.id}</p>
        </body>
      </html>
    `;
  }

  getSeverityColor(severity) {
    const colors = {
      info: '#36a64f',
      warning: '#ff9800',
      critical: '#f44336'
    };
    return colors[severity] || '#808080';
  }

  addToHistory(entry) {
    this.history.push(entry);
    
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }
  }

  startBackgroundTasks() {
    // Check for escalations
    this.escalationInterval = setInterval(() => {
      this.checkEscalations();
    }, 60000); // Every minute

    // Check for snoozed alerts
    this.snoozeInterval = setInterval(() => {
      this.checkSnoozedAlerts();
    }, 30000); // Every 30 seconds
  }

  checkEscalations() {
    const now = Date.now();
    
    for (const alert of this.alerts.values()) {
      if (alert.status === 'active' && alert.escalationPolicy) {
        const policy = alert.escalationPolicy;
        const timeSinceTriggered = now - alert.triggeredAt;
        const currentLevel = alert.escalationLevel;

        if (currentLevel < policy.levels.length) {
          const nextLevel = policy.levels[currentLevel];
          if (timeSinceTriggered >= nextLevel.delay) {
            this.escalateAlert(alert);
          }
        }
      }
    }
  }

  checkSnoozedAlerts() {
    const now = Date.now();
    
    for (const alert of this.alerts.values()) {
      if (alert.snoozedUntil && now >= alert.snoozedUntil) {
        alert.snoozedUntil = null;
        
        this.addToHistory({
          type: 'unsnooze',
          alertId: alert.id,
          timestamp: now
        });

        this.emit('alert:unsnoozed', alert);
      }
    }
  }

  /**
   * Shutdown alert system
   */
  shutdown() {
    console.log('Shutting down AlertSystem...');
    
    if (this.escalationInterval) {
      clearInterval(this.escalationInterval);
    }
    
    if (this.snoozeInterval) {
      clearInterval(this.snoozeInterval);
    }

    console.log('AlertSystem shutdown complete');
  }
}

module.exports = new AlertSystem();
