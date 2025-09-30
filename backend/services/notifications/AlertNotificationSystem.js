/**
 * Alert & Notification System
 * Multi-channel alert system with smart routing and escalation
 * Phase 2 Extended - $100K IA Multi-Modelo Upgrade
 */

const EventEmitter = require('events');
const logger = require('../logging/logger');
const nodemailer = require('nodemailer');
const WebSocket = require('ws');

class AlertNotificationSystem extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            enableEmail: options.enableEmail !== false,
            enableWebSocket: options.enableWebSocket !== false,
            enableSlack: options.enableSlack || false,
            enableSMS: options.enableSMS || false,
            enablePush: options.enablePush || false,
            
            // Email configuration
            emailConfig: {
                host: options.emailHost || process.env.SMTP_HOST,
                port: options.emailPort || process.env.SMTP_PORT || 587,
                secure: options.emailSecure || false,
                auth: {
                    user: options.emailUser || process.env.SMTP_USER,
                    pass: options.emailPassword || process.env.SMTP_PASSWORD
                }
            },
            
            // Alert thresholds
            thresholds: {
                critical: 0,      // Send immediately
                high: 300000,     // 5 minutes
                medium: 900000,   // 15 minutes
                low: 1800000,     // 30 minutes
                info: 3600000     // 1 hour
            },
            
            // Escalation rules
            escalation: {
                enabled: options.escalationEnabled !== false,
                timeouts: {
                    level1: 300000,   // 5 minutes
                    level2: 900000,   // 15 minutes
                    level3: 1800000   // 30 minutes
                }
            },
            
            // Rate limiting
            rateLimiting: {
                enabled: options.rateLimitingEnabled !== false,
                windowMs: 300000, // 5 minutes
                maxAlertsPerWindow: 10,
                cooldownPeriod: 60000 // 1 minute
            },
            
            ...options
        };

        // Alert management
        this.activeAlerts = new Map();
        this.alertHistory = [];
        this.alertQueue = [];
        this.rateLimitTracker = new Map();
        
        // Notification channels
        this.channels = new Map();
        this.subscriptions = new Map();
        this.escalationChains = new Map();
        
        // Templates
        this.alertTemplates = new Map();
        this.notificationRules = new Map();
        
        // Processing state
        this.isProcessing = false;
        this.processingInterval = null;
        
        this.initializeChannels();
        this.initializeTemplates();
        this.initializeDefaultRules();
        this.startAlertProcessing();
        
        logger.info('Alert Notification System initialized', {
            channels: Array.from(this.channels.keys()),
            escalationEnabled: this.config.escalation.enabled,
            rateLimitingEnabled: this.config.rateLimiting.enabled
        });
    }

    /**
     * Initialize notification channels
     */
    initializeChannels() {
        // Email channel
        if (this.config.enableEmail && this.config.emailConfig.auth.user) {
            const emailTransporter = nodemailer.createTransporter(this.config.emailConfig);
            this.channels.set('email', new EmailNotificationChannel(emailTransporter));
        }
        
        // WebSocket channel
        if (this.config.enableWebSocket) {
            this.channels.set('websocket', new WebSocketNotificationChannel());
        }
        
        // Slack channel
        if (this.config.enableSlack && this.config.slackToken) {
            this.channels.set('slack', new SlackNotificationChannel(this.config.slackToken));
        }
        
        // SMS channel
        if (this.config.enableSMS && this.config.smsProvider) {
            this.channels.set('sms', new SMSNotificationChannel(this.config.smsProvider));
        }
        
        // Push notification channel
        if (this.config.enablePush) {
            this.channels.set('push', new PushNotificationChannel(this.config.pushConfig));
        }
        
        logger.info('Notification channels initialized', {
            availableChannels: Array.from(this.channels.keys())
        });
    }

    /**
     * Initialize alert templates
     */
    initializeTemplates() {
        // Critical alerts
        this.alertTemplates.set('system_down', {
            subject: '🚨 CRITICAL: System Down - Immediate Action Required',
            body: 'The AI Multi-Model system has experienced a critical failure. Immediate attention required.',
            priority: 'critical',
            channels: ['email', 'sms', 'slack', 'websocket'],
            escalate: true
        });
        
        this.alertTemplates.set('high_error_rate', {
            subject: '⚠️ HIGH: Elevated Error Rate Detected',
            body: 'Error rate has exceeded threshold. Current rate: {errorRate}%. Threshold: {threshold}%',
            priority: 'high',
            channels: ['email', 'slack', 'websocket'],
            escalate: true
        });
        
        this.alertTemplates.set('performance_degradation', {
            subject: '📊 MEDIUM: Performance Degradation',
            body: 'System performance has degraded. Response time: {responseTime}ms (threshold: {threshold}ms)',
            priority: 'medium',
            channels: ['websocket', 'slack'],
            escalate: false
        });
        
        this.alertTemplates.set('cost_threshold', {
            subject: '💰 MEDIUM: Cost Threshold Exceeded',
            body: 'Daily cost has exceeded budget. Current: ${currentCost}, Budget: ${budgetLimit}',
            priority: 'medium',
            channels: ['email', 'websocket'],
            escalate: false
        });
        
        this.alertTemplates.set('resource_usage', {
            subject: '📈 LOW: High Resource Usage',
            body: 'Resource usage is elevated. {resource}: {usage}% (threshold: {threshold}%)',
            priority: 'low',
            channels: ['websocket'],
            escalate: false
        });
        
        this.alertTemplates.set('optimization_completed', {
            subject: '✅ INFO: System Optimization Completed',
            body: 'Automatic optimization has been applied. Expected improvement: {improvement}%',
            priority: 'info',
            channels: ['websocket'],
            escalate: false
        });
    }

    /**
     * Initialize default notification rules
     */
    initializeDefaultRules() {
        // Administrator rules
        this.notificationRules.set('admin', {
            channels: ['email', 'websocket', 'slack'],
            priorities: ['critical', 'high', 'medium'],
            escalationLevel: 1,
            quietHours: { start: 22, end: 8 }, // 10 PM to 8 AM
            enableQuietHours: false // Admins get all alerts
        });
        
        // Supervisor rules
        this.notificationRules.set('supervisor', {
            channels: ['email', 'websocket'],
            priorities: ['critical', 'high'],
            escalationLevel: 2,
            quietHours: { start: 20, end: 9 }, // 8 PM to 9 AM
            enableQuietHours: true
        });
        
        // Developer rules
        this.notificationRules.set('developer', {
            channels: ['websocket', 'slack'],
            priorities: ['high', 'medium', 'low'],
            escalationLevel: 3,
            quietHours: { start: 19, end: 10 }, // 7 PM to 10 AM
            enableQuietHours: true
        });
        
        // Operations team rules
        this.notificationRules.set('operations', {
            channels: ['email', 'websocket', 'sms'],
            priorities: ['critical', 'high', 'medium'],
            escalationLevel: 1,
            quietHours: { start: 23, end: 7 }, // 11 PM to 7 AM
            enableQuietHours: true
        });
        
        // Default escalation chain
        this.escalationChains.set('default', [
            { role: 'admin', delay: 0 },
            { role: 'supervisor', delay: 300000 }, // 5 minutes
            { role: 'operations', delay: 900000 }  // 15 minutes
        ]);
    }

    /**
     * Create new alert
     */
    async createAlert(alertData) {
        try {
            const alert = {
                id: this.generateAlertId(),
                timestamp: new Date(),
                type: alertData.type,
                priority: alertData.priority || 'medium',
                title: alertData.title,
                message: alertData.message,
                data: alertData.data || {},
                source: alertData.source || 'system',
                tags: alertData.tags || [],
                acknowledged: false,
                resolved: false,
                escalated: false,
                escalationLevel: 0,
                attempts: 0,
                maxAttempts: 3,
                nextRetry: null,
                recipients: new Set(),
                channels: new Set(),
                metadata: {
                    createdBy: alertData.createdBy || 'system',
                    correlationId: alertData.correlationId,
                    environment: process.env.NODE_ENV || 'development'
                }
            };

            // Apply template if specified
            if (alertData.template && this.alertTemplates.has(alertData.template)) {
                this.applyAlertTemplate(alert, alertData.template, alertData.data);
            }

            // Check rate limiting
            if (this.isRateLimited(alert)) {
                logger.warn('Alert rate limited', {
                    alertId: alert.id,
                    type: alert.type,
                    priority: alert.priority
                });
                return { success: false, reason: 'rate_limited', alertId: alert.id };
            }

            // Store active alert
            this.activeAlerts.set(alert.id, alert);
            
            // Add to processing queue
            this.alertQueue.push(alert);
            
            // Add to history
            this.alertHistory.push({
                ...alert,
                action: 'created',
                timestamp: new Date()
            });

            // Emit event
            this.emit('alertCreated', alert);

            logger.info('Alert created', {
                alertId: alert.id,
                type: alert.type,
                priority: alert.priority,
                queueLength: this.alertQueue.length
            });

            return { success: true, alertId: alert.id, alert };

        } catch (error) {
            logger.error('Error creating alert', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Apply alert template
     */
    applyAlertTemplate(alert, templateName, data) {
        const template = this.alertTemplates.get(templateName);
        if (!template) return;

        alert.title = template.subject;
        alert.message = this.interpolateTemplate(template.body, data);
        alert.priority = template.priority;
        
        if (template.channels) {
            template.channels.forEach(channel => alert.channels.add(channel));
        }
        
        alert.metadata.template = templateName;
        alert.metadata.escalate = template.escalate;
    }

    /**
     * Interpolate template with data
     */
    interpolateTemplate(template, data) {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }

    /**
     * Check if alert is rate limited
     */
    isRateLimited(alert) {
        if (!this.config.rateLimiting.enabled) return false;

        const key = `${alert.type}_${alert.priority}`;
        const now = Date.now();
        
        if (!this.rateLimitTracker.has(key)) {
            this.rateLimitTracker.set(key, []);
        }
        
        const alertTimes = this.rateLimitTracker.get(key);
        
        // Remove old entries outside the window
        const cutoff = now - this.config.rateLimiting.windowMs;
        const recentAlerts = alertTimes.filter(time => time > cutoff);
        
        // Check if limit exceeded
        if (recentAlerts.length >= this.config.rateLimiting.maxAlertsPerWindow) {
            return true;
        }
        
        // Add current alert time
        recentAlerts.push(now);
        this.rateLimitTracker.set(key, recentAlerts);
        
        return false;
    }

    /**
     * Start alert processing
     */
    startAlertProcessing() {
        this.processingInterval = setInterval(async () => {
            if (!this.isProcessing && this.alertQueue.length > 0) {
                await this.processAlertQueue();
            }
        }, 1000); // Check every second

        logger.info('Alert processing started');
    }

    /**
     * Process alert queue
     */
    async processAlertQueue() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        
        try {
            while (this.alertQueue.length > 0) {
                const alert = this.alertQueue.shift();
                await this.processAlert(alert);
            }
        } catch (error) {
            logger.error('Error processing alert queue', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process individual alert
     */
    async processAlert(alert) {
        try {
            logger.info('Processing alert', {
                alertId: alert.id,
                type: alert.type,
                priority: alert.priority
            });

            // Determine recipients
            const recipients = await this.determineRecipients(alert);
            
            // Determine channels
            const channels = await this.determineChannels(alert, recipients);
            
            // Send notifications
            const results = await this.sendNotifications(alert, recipients, channels);
            
            // Update alert status
            alert.recipients = new Set(recipients.map(r => r.id));
            alert.channels = new Set(channels);
            alert.attempts++;
            alert.lastProcessed = new Date();
            
            // Schedule escalation if needed
            if (this.shouldEscalate(alert)) {
                await this.scheduleEscalation(alert);
            }
            
            // Update alert in storage
            this.activeAlerts.set(alert.id, alert);
            
            // Emit event
            this.emit('alertProcessed', {
                alert,
                recipients: recipients.length,
                channels: channels.length,
                results
            });

        } catch (error) {
            logger.error('Error processing alert', { alertId: alert.id, error });
            
            // Retry later if under max attempts
            if (alert.attempts < alert.maxAttempts) {
                alert.nextRetry = Date.now() + (alert.attempts * 60000); // Exponential backoff
                this.alertQueue.push(alert);
            }
        }
    }

    /**
     * Determine alert recipients
     */
    async determineRecipients(alert) {
        const recipients = [];
        
        // Get users based on roles and alert priority
        for (const [role, rules] of this.notificationRules) {
            if (rules.priorities.includes(alert.priority)) {
                const users = await this.getUsersByRole(role);
                recipients.push(...users.filter(user => 
                    this.shouldNotifyUser(user, alert, rules)
                ));
            }
        }
        
        return recipients;
    }

    /**
     * Check if user should be notified
     */
    shouldNotifyUser(user, alert, rules) {
        // Check quiet hours
        if (rules.enableQuietHours && this.isQuietHours(rules.quietHours)) {
            return alert.priority === 'critical';
        }
        
        // Check user preferences
        if (user.notificationPreferences) {
            if (user.notificationPreferences.disabled) return false;
            if (user.notificationPreferences.priorities && 
                !user.notificationPreferences.priorities.includes(alert.priority)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Check if current time is within quiet hours
     */
    isQuietHours(quietHours) {
        const now = new Date();
        const currentHour = now.getHours();
        
        if (quietHours.start > quietHours.end) {
            // Spans midnight
            return currentHour >= quietHours.start || currentHour < quietHours.end;
        } else {
            return currentHour >= quietHours.start && currentHour < quietHours.end;
        }
    }

    /**
     * Determine notification channels
     */
    async determineChannels(alert, recipients) {
        const channels = new Set();
        
        // Add channels from alert configuration
        if (alert.channels.size > 0) {
            alert.channels.forEach(channel => {
                if (this.channels.has(channel)) {
                    channels.add(channel);
                }
            });
        }
        
        // Add channels based on recipient preferences
        recipients.forEach(recipient => {
            if (recipient.notificationChannels) {
                recipient.notificationChannels.forEach(channel => {
                    if (this.channels.has(channel)) {
                        channels.add(channel);
                    }
                });
            }
        });
        
        // Fallback to default channels based on priority
        if (channels.size === 0) {
            const defaultChannels = this.getDefaultChannelsForPriority(alert.priority);
            defaultChannels.forEach(channel => channels.add(channel));
        }
        
        return Array.from(channels);
    }

    /**
     * Get default channels for priority level
     */
    getDefaultChannelsForPriority(priority) {
        switch (priority) {
            case 'critical':
                return ['email', 'sms', 'websocket', 'slack'];
            case 'high':
                return ['email', 'websocket', 'slack'];
            case 'medium':
                return ['websocket', 'slack'];
            case 'low':
                return ['websocket'];
            case 'info':
                return ['websocket'];
            default:
                return ['websocket'];
        }
    }

    /**
     * Send notifications through multiple channels
     */
    async sendNotifications(alert, recipients, channels) {
        const results = [];
        
        for (const channelName of channels) {
            const channel = this.channels.get(channelName);
            if (!channel) continue;
            
            try {
                const result = await channel.sendNotification(alert, recipients);
                results.push({
                    channel: channelName,
                    success: result.success,
                    recipients: result.recipients,
                    error: result.error
                });
                
                logger.info('Notification sent', {
                    alertId: alert.id,
                    channel: channelName,
                    recipients: result.recipients,
                    success: result.success
                });
                
            } catch (error) {
                results.push({
                    channel: channelName,
                    success: false,
                    error: error.message
                });
                
                logger.error('Notification failed', {
                    alertId: alert.id,
                    channel: channelName,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    /**
     * Check if alert should escalate
     */
    shouldEscalate(alert) {
        return (
            this.config.escalation.enabled &&
            alert.metadata.escalate &&
            alert.priority !== 'info' &&
            !alert.acknowledged &&
            !alert.escalated
        );
    }

    /**
     * Schedule alert escalation
     */
    async scheduleEscalation(alert) {
        const escalationDelay = this.config.escalation.timeouts[`level${alert.escalationLevel + 1}`] || 
                               this.config.escalation.timeouts.level1;
        
        setTimeout(async () => {
            if (!alert.acknowledged && !alert.resolved) {
                await this.escalateAlert(alert);
            }
        }, escalationDelay);
        
        logger.info('Escalation scheduled', {
            alertId: alert.id,
            currentLevel: alert.escalationLevel,
            delayMs: escalationDelay
        });
    }

    /**
     * Escalate alert to next level
     */
    async escalateAlert(alert) {
        try {
            alert.escalationLevel++;
            alert.escalated = true;
            
            const escalationChain = this.escalationChains.get('default');
            if (alert.escalationLevel < escalationChain.length) {
                const nextLevel = escalationChain[alert.escalationLevel];
                
                // Create escalation alert
                await this.createAlert({
                    type: 'escalation',
                    priority: 'high',
                    title: `🔺 ESCALATION: ${alert.title}`,
                    message: `Alert ${alert.id} has been escalated to level ${alert.escalationLevel + 1}. Original message: ${alert.message}`,
                    data: { originalAlert: alert.id, escalationLevel: alert.escalationLevel },
                    source: 'escalation_system'
                });
                
                // Schedule next escalation if available
                if (alert.escalationLevel + 1 < escalationChain.length) {
                    await this.scheduleEscalation(alert);
                }
            }
            
            this.emit('alertEscalated', alert);
            
            logger.warn('Alert escalated', {
                alertId: alert.id,
                escalationLevel: alert.escalationLevel
            });
            
        } catch (error) {
            logger.error('Error escalating alert', { alertId: alert.id, error });
        }
    }

    /**
     * Acknowledge alert
     */
    async acknowledgeAlert(alertId, userId, comment = '') {
        try {
            const alert = this.activeAlerts.get(alertId);
            if (!alert) {
                return { success: false, error: 'Alert not found' };
            }
            
            alert.acknowledged = true;
            alert.acknowledgedBy = userId;
            alert.acknowledgedAt = new Date();
            alert.acknowledgementComment = comment;
            
            // Add to history
            this.alertHistory.push({
                ...alert,
                action: 'acknowledged',
                timestamp: new Date(),
                userId,
                comment
            });
            
            this.emit('alertAcknowledged', alert);
            
            logger.info('Alert acknowledged', {
                alertId,
                userId,
                comment: comment.substring(0, 100)
            });
            
            return { success: true, alert };
            
        } catch (error) {
            logger.error('Error acknowledging alert', { alertId, error });
            return { success: false, error: error.message };
        }
    }

    /**
     * Resolve alert
     */
    async resolveAlert(alertId, userId, resolution = '') {
        try {
            const alert = this.activeAlerts.get(alertId);
            if (!alert) {
                return { success: false, error: 'Alert not found' };
            }
            
            alert.resolved = true;
            alert.resolvedBy = userId;
            alert.resolvedAt = new Date();
            alert.resolution = resolution;
            
            // Remove from active alerts
            this.activeAlerts.delete(alertId);
            
            // Add to history
            this.alertHistory.push({
                ...alert,
                action: 'resolved',
                timestamp: new Date(),
                userId,
                resolution
            });
            
            this.emit('alertResolved', alert);
            
            logger.info('Alert resolved', {
                alertId,
                userId,
                resolution: resolution.substring(0, 100)
            });
            
            return { success: true, alert };
            
        } catch (error) {
            logger.error('Error resolving alert', { alertId, error });
            return { success: false, error: error.message };
        }
    }

    /**
     * Get system statistics
     */
    getAlertStatistics() {
        const now = Date.now();
        const last24h = now - (24 * 60 * 60 * 1000);
        const last7d = now - (7 * 24 * 60 * 60 * 1000);
        
        const recent24h = this.alertHistory.filter(alert => 
            alert.timestamp.getTime() > last24h
        );
        
        const recent7d = this.alertHistory.filter(alert => 
            alert.timestamp.getTime() > last7d
        );
        
        return {
            active: {
                total: this.activeAlerts.size,
                byPriority: this.getAlertCountByPriority(Array.from(this.activeAlerts.values())),
                acknowledged: Array.from(this.activeAlerts.values()).filter(a => a.acknowledged).length
            },
            recent24h: {
                total: recent24h.length,
                byPriority: this.getAlertCountByPriority(recent24h),
                byAction: this.getAlertCountByAction(recent24h)
            },
            recent7d: {
                total: recent7d.length,
                byPriority: this.getAlertCountByPriority(recent7d),
                byAction: this.getAlertCountByAction(recent7d)
            },
            channels: {
                available: Array.from(this.channels.keys()),
                total: this.channels.size
            },
            processing: {
                queueLength: this.alertQueue.length,
                isProcessing: this.isProcessing
            }
        };
    }

    /**
     * Helper methods
     */
    getAlertCountByPriority(alerts) {
        const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        alerts.forEach(alert => {
            if (counts[alert.priority] !== undefined) {
                counts[alert.priority]++;
            }
        });
        return counts;
    }

    getAlertCountByAction(alerts) {
        const counts = { created: 0, acknowledged: 0, resolved: 0, escalated: 0 };
        alerts.forEach(alert => {
            if (counts[alert.action] !== undefined) {
                counts[alert.action]++;
            }
        });
        return counts;
    }

    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async getUsersByRole(role) {
        // Mock implementation - in production, this would query the user database
        const mockUsers = {
            admin: [
                { id: 'admin1', email: 'admin@company.com', role: 'admin', notificationChannels: ['email', 'sms', 'websocket'] }
            ],
            supervisor: [
                { id: 'supervisor1', email: 'supervisor@company.com', role: 'supervisor', notificationChannels: ['email', 'websocket'] }
            ],
            developer: [
                { id: 'dev1', email: 'dev@company.com', role: 'developer', notificationChannels: ['websocket', 'slack'] }
            ],
            operations: [
                { id: 'ops1', email: 'ops@company.com', role: 'operations', notificationChannels: ['email', 'sms', 'websocket'] }
            ]
        };
        
        return mockUsers[role] || [];
    }

    /**
     * Shutdown notification system
     */
    async shutdown() {
        logger.info('Shutting down Alert Notification System');
        
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }
        
        // Close all notification channels
        for (const [name, channel] of this.channels) {
            if (typeof channel.close === 'function') {
                await channel.close();
            }
        }
        
        this.removeAllListeners();
        logger.info('Alert Notification System shutdown complete');
    }
}

// Notification Channel Implementations
class EmailNotificationChannel {
    constructor(transporter) {
        this.transporter = transporter;
    }

    async sendNotification(alert, recipients) {
        try {
            const emailRecipients = recipients
                .filter(r => r.email && r.notificationChannels.includes('email'))
                .map(r => r.email);

            if (emailRecipients.length === 0) {
                return { success: true, recipients: 0 };
            }

            const mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@company.com',
                to: emailRecipients.join(', '),
                subject: alert.title,
                html: this.formatEmailBody(alert),
                priority: this.getEmailPriority(alert.priority)
            };

            await this.transporter.sendMail(mailOptions);
            
            return { success: true, recipients: emailRecipients.length };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    formatEmailBody(alert) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <div style="background: ${this.getPriorityColor(alert.priority)}; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0;">${alert.title}</h2>
                    <p style="margin: 8px 0 0 0;">Priority: ${alert.priority.toUpperCase()}</p>
                </div>
                <div style="background: #f5f5f5; padding: 16px; border-radius: 0 0 8px 8px;">
                    <p><strong>Message:</strong></p>
                    <p>${alert.message}</p>
                    <p><strong>Time:</strong> ${alert.timestamp.toLocaleString()}</p>
                    <p><strong>Source:</strong> ${alert.source}</p>
                    <p><strong>Alert ID:</strong> ${alert.id}</p>
                </div>
            </div>
        `;
    }

    getPriorityColor(priority) {
        const colors = {
            critical: '#d32f2f',
            high: '#f57c00',
            medium: '#1976d2',
            low: '#388e3c',
            info: '#7b1fa2'
        };
        return colors[priority] || colors.medium;
    }

    getEmailPriority(priority) {
        return priority === 'critical' ? 'high' : 'normal';
    }
}

class WebSocketNotificationChannel {
    constructor() {
        this.connections = new Set();
    }

    addConnection(ws) {
        this.connections.add(ws);
        ws.on('close', () => {
            this.connections.delete(ws);
        });
    }

    async sendNotification(alert, recipients) {
        try {
            const notification = {
                type: 'alert_notification',
                alert: {
                    id: alert.id,
                    title: alert.title,
                    message: alert.message,
                    priority: alert.priority,
                    timestamp: alert.timestamp,
                    source: alert.source
                },
                timestamp: new Date()
            };

            let sent = 0;
            for (const ws of this.connections) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(notification));
                    sent++;
                }
            }

            return { success: true, recipients: sent };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    close() {
        for (const ws of this.connections) {
            ws.close();
        }
        this.connections.clear();
    }
}

class SlackNotificationChannel {
    constructor(token) {
        this.token = token;
        // In production, initialize Slack SDK
    }

    async sendNotification(alert, recipients) {
        // Mock implementation - in production, use Slack SDK
        return { success: true, recipients: recipients.length };
    }
}

class SMSNotificationChannel {
    constructor(provider) {
        this.provider = provider;
        // Initialize SMS provider (Twilio, AWS SNS, etc.)
    }

    async sendNotification(alert, recipients) {
        // Mock implementation - in production, use SMS provider
        return { success: true, recipients: recipients.length };
    }
}

class PushNotificationChannel {
    constructor(config) {
        this.config = config;
        // Initialize push notification service
    }

    async sendNotification(alert, recipients) {
        // Mock implementation - in production, use push notification service
        return { success: true, recipients: recipients.length };
    }
}

module.exports = AlertNotificationSystem;