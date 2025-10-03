/**
 * Real-Time Monitoring Service with WebSockets
 * Live metrics and system monitoring for AI Multi-Model Manager
 * Phase 2 Extended - $100K IA Multi-Modelo Upgrade
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const logger = require('../logging/logger');

class RealTimeMonitoringService extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            port: options.port || 8080,
            metricsInterval: options.metricsInterval || 1000,
            maxConnections: options.maxConnections || 100,
            authRequired: options.authRequired !== false,
            enableCompression: options.enableCompression !== false,
            heartbeatInterval: options.heartbeatInterval || 30000,
            ...options
        };

        this.wss = null;
        this.clients = new Map();
        this.metricsCollectors = new Map();
        this.alertThresholds = new Map();
        this.systemMetrics = {
            ai: new Map(),
            loadBalancer: new Map(),
            performance: new Map(),
            errors: new Map(),
            users: new Map()
        };

        this.subscriptionTypes = [
            'ai_metrics',
            'load_balancer_metrics', 
            'performance_metrics',
            'error_metrics',
            'user_activity',
            'system_alerts',
            'model_health',
            'real_time_requests'
        ];

        this.startTime = new Date();
        this.setupMetricsCollectors();
        this.setupAlertThresholds();
        
        logger.info('Real-Time Monitoring Service initialized', {
            port: this.config.port,
            metricsInterval: this.config.metricsInterval,
            subscriptionTypes: this.subscriptionTypes.length
        });
    }

    /**
     * Start WebSocket server
     */
    async startServer() {
        try {
            this.wss = new WebSocket.Server({
                port: this.config.port,
                perMessageDeflate: this.config.enableCompression,
                maxPayload: 1024 * 1024, // 1MB
            });

            this.wss.on('connection', (ws, req) => {
                this.handleConnection(ws, req);
            });

            this.wss.on('error', (error) => {
                logger.error('WebSocket server error', error);
                this.emit('serverError', error);
            });

            // Start metrics collection
            this.startMetricsCollection();
            this.startHeartbeat();

            logger.info('WebSocket server started', {
                port: this.config.port,
                maxConnections: this.config.maxConnections
            });

            this.emit('serverStarted', { port: this.config.port });

        } catch (error) {
            logger.error('Failed to start WebSocket server', error);
            throw error;
        }
    }

    /**
     * Handle new WebSocket connection
     */
    handleConnection(ws, req) {
        const clientId = this.generateClientId();
        const clientInfo = {
            id: clientId,
            ws: ws,
            subscriptions: new Set(),
            connected: true,
            lastActivity: new Date(),
            userAgent: req.headers['user-agent'],
            ip: req.connection.remoteAddress,
            authenticated: false
        };

        this.clients.set(clientId, clientInfo);

        logger.info('New WebSocket connection', {
            clientId,
            ip: clientInfo.ip,
            totalConnections: this.clients.size
        });

        // Send welcome message
        this.sendToClient(clientId, {
            type: 'connection_established',
            clientId: clientId,
            timestamp: new Date(),
            subscriptionTypes: this.subscriptionTypes
        });

        // Handle messages
        ws.on('message', (data) => {
            this.handleClientMessage(clientId, data);
        });

        // Handle disconnect
        ws.on('close', () => {
            this.handleDisconnection(clientId);
        });

        // Handle errors
        ws.on('error', (error) => {
            logger.error('Client WebSocket error', { clientId, error });
            this.handleDisconnection(clientId);
        });

        this.emit('clientConnected', { clientId, totalConnections: this.clients.size });
    }

    /**
     * Handle client message
     */
    handleClientMessage(clientId, data) {
        try {
            const message = JSON.parse(data);
            const client = this.clients.get(clientId);
            
            if (!client) return;

            client.lastActivity = new Date();

            logger.debug('Client message received', {
                clientId,
                type: message.type
            });

            switch (message.type) {
                case 'authenticate':
                    this.handleAuthentication(clientId, message.data);
                    break;

                case 'subscribe':
                    this.handleSubscription(clientId, message.data);
                    break;

                case 'unsubscribe':
                    this.handleUnsubscription(clientId, message.data);
                    break;

                case 'get_metrics':
                    this.handleMetricsRequest(clientId, message.data);
                    break;

                case 'set_alert_threshold':
                    this.handleAlertThreshold(clientId, message.data);
                    break;

                case 'ping':
                    this.sendToClient(clientId, { type: 'pong', timestamp: new Date() });
                    break;

                default:
                    this.sendToClient(clientId, {
                        type: 'error',
                        message: `Unknown message type: ${message.type}`
                    });
            }

        } catch (error) {
            logger.error('Error handling client message', { clientId, error });
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Invalid message format'
            });
        }
    }

    /**
     * Handle client authentication
     */
    handleAuthentication(clientId, authData) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // Simple token-based authentication for demo
        // In production, validate against JWT or session
        const { token, role } = authData;

        if (token && this.validateAuthToken(token)) {
            client.authenticated = true;
            client.role = role;

            this.sendToClient(clientId, {
                type: 'authentication_success',
                role: role,
                timestamp: new Date()
            });

            logger.info('Client authenticated', { clientId, role });

        } else {
            this.sendToClient(clientId, {
                type: 'authentication_failed',
                message: 'Invalid credentials'
            });
        }
    }

    /**
     * Handle subscription request
     */
    handleSubscription(clientId, subscriptionData) {
        const client = this.clients.get(clientId);
        if (!client) return;

        if (this.config.authRequired && !client.authenticated) {
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Authentication required for subscriptions'
            });
            return;
        }

        const { subscriptionType, filters = {} } = subscriptionData;

        if (!this.subscriptionTypes.includes(subscriptionType)) {
            this.sendToClient(clientId, {
                type: 'error',
                message: `Invalid subscription type: ${subscriptionType}`
            });
            return;
        }

        client.subscriptions.add(subscriptionType);

        // Store filters for this subscription
        if (!client.subscriptionFilters) {
            client.subscriptionFilters = new Map();
        }
        client.subscriptionFilters.set(subscriptionType, filters);

        this.sendToClient(clientId, {
            type: 'subscription_confirmed',
            subscriptionType: subscriptionType,
            filters: filters,
            timestamp: new Date()
        });

        logger.info('Client subscribed', { clientId, subscriptionType, filters });

        // Send initial data
        this.sendInitialData(clientId, subscriptionType);
    }

    /**
     * Handle unsubscription request
     */
    handleUnsubscription(clientId, unsubscriptionData) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const { subscriptionType } = unsubscriptionData;
        client.subscriptions.delete(subscriptionType);

        if (client.subscriptionFilters) {
            client.subscriptionFilters.delete(subscriptionType);
        }

        this.sendToClient(clientId, {
            type: 'unsubscription_confirmed',
            subscriptionType: subscriptionType,
            timestamp: new Date()
        });

        logger.info('Client unsubscribed', { clientId, subscriptionType });
    }

    /**
     * Handle metrics request
     */
    handleMetricsRequest(clientId, requestData) {
        const client = this.clients.get(clientId);
        if (!client || (!client.authenticated && this.config.authRequired)) return;

        const { metricsType, timeRange = '1h' } = requestData;
        const metrics = this.getMetricsData(metricsType, timeRange);

        this.sendToClient(clientId, {
            type: 'metrics_data',
            metricsType: metricsType,
            timeRange: timeRange,
            data: metrics,
            timestamp: new Date()
        });
    }

    /**
     * Handle alert threshold setting
     */
    handleAlertThreshold(clientId, thresholdData) {
        const client = this.clients.get(clientId);
        if (!client || client.role !== 'admin') {
            this.sendToClient(clientId, {
                type: 'error',
                message: 'Admin privileges required'
            });
            return;
        }

        const { metric, threshold, condition } = thresholdData;
        this.alertThresholds.set(metric, { threshold, condition });

        this.sendToClient(clientId, {
            type: 'alert_threshold_set',
            metric: metric,
            threshold: threshold,
            condition: condition,
            timestamp: new Date()
        });

        logger.info('Alert threshold set', { clientId, metric, threshold, condition });
    }

    /**
     * Handle client disconnection
     */
    handleDisconnection(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.connected = false;
            this.clients.delete(clientId);

            logger.info('Client disconnected', {
                clientId,
                totalConnections: this.clients.size
            });

            this.emit('clientDisconnected', { 
                clientId, 
                totalConnections: this.clients.size 
            });
        }
    }

    /**
     * Send initial data for subscription
     */
    sendInitialData(clientId, subscriptionType) {
        let initialData = {};

        switch (subscriptionType) {
            case 'ai_metrics':
                initialData = this.getCurrentAIMetrics();
                break;
            case 'load_balancer_metrics':
                initialData = this.getCurrentLoadBalancerMetrics();
                break;
            case 'performance_metrics':
                initialData = this.getCurrentPerformanceMetrics();
                break;
            case 'system_alerts':
                initialData = this.getCurrentAlerts();
                break;
            default:
                initialData = {};
        }

        this.sendToClient(clientId, {
            type: 'initial_data',
            subscriptionType: subscriptionType,
            data: initialData,
            timestamp: new Date()
        });
    }

    /**
     * Start metrics collection
     */
    startMetricsCollection() {
        setInterval(() => {
            this.collectAndBroadcastMetrics();
        }, this.config.metricsInterval);

        logger.info('Metrics collection started', {
            interval: this.config.metricsInterval
        });
    }

    /**
     * Collect and broadcast metrics
     */
    async collectAndBroadcastMetrics() {
        try {
            // Collect metrics from various sources
            const aiMetrics = await this.collectAIMetrics();
            const loadBalancerMetrics = await this.collectLoadBalancerMetrics();
            const performanceMetrics = await this.collectPerformanceMetrics();
            const errorMetrics = await this.collectErrorMetrics();
            const userMetrics = await this.collectUserMetrics();

            // Store metrics
            this.storeMetrics('ai', aiMetrics);
            this.storeMetrics('loadBalancer', loadBalancerMetrics);
            this.storeMetrics('performance', performanceMetrics);
            this.storeMetrics('errors', errorMetrics);
            this.storeMetrics('users', userMetrics);

            // Check for alerts
            await this.checkAlerts(aiMetrics, loadBalancerMetrics, performanceMetrics);

            // Broadcast to subscribed clients
            this.broadcastMetrics('ai_metrics', aiMetrics);
            this.broadcastMetrics('load_balancer_metrics', loadBalancerMetrics);
            this.broadcastMetrics('performance_metrics', performanceMetrics);
            this.broadcastMetrics('error_metrics', errorMetrics);
            this.broadcastMetrics('user_activity', userMetrics);

        } catch (error) {
            logger.error('Error collecting metrics', error);
        }
    }

    /**
     * Collect AI metrics
     */
    async collectAIMetrics() {
        // This would integrate with your AI system
        return {
            totalRequests: Math.floor(Math.random() * 1000),
            activeRequests: Math.floor(Math.random() * 50),
            avgResponseTime: Math.floor(Math.random() * 2000) + 500,
            errorRate: Math.random() * 0.1,
            modelsActive: Math.floor(Math.random() * 11) + 1,
            tokensProcessed: Math.floor(Math.random() * 100000),
            costToday: Math.random() * 500,
            cacheHitRate: Math.random() * 0.8 + 0.2,
            timestamp: new Date()
        };
    }

    /**
     * Collect load balancer metrics
     */
    async collectLoadBalancerMetrics() {
        return {
            algorithm: 'intelligent',
            totalDistributed: Math.floor(Math.random() * 1000),
            distributionEfficiency: Math.random() * 0.3 + 0.7,
            modelLoads: {
                'gpt-4': Math.floor(Math.random() * 10),
                'claude-3.5-sonnet': Math.floor(Math.random() * 10),
                'gemini-2.0-flash': Math.floor(Math.random() * 10)
            },
            queueLength: Math.floor(Math.random() * 5),
            timestamp: new Date()
        };
    }

    /**
     * Collect performance metrics
     */
    async collectPerformanceMetrics() {
        return {
            cpuUsage: Math.random() * 80 + 10,
            memoryUsage: Math.random() * 70 + 20,
            diskUsage: Math.random() * 60 + 30,
            networkIn: Math.floor(Math.random() * 1000),
            networkOut: Math.floor(Math.random() * 800),
            uptime: Date.now() - this.startTime.getTime(),
            timestamp: new Date()
        };
    }

    /**
     * Collect error metrics
     */
    async collectErrorMetrics() {
        return {
            totalErrors: Math.floor(Math.random() * 10),
            errorsByType: {
                'timeout': Math.floor(Math.random() * 3),
                'auth_failed': Math.floor(Math.random() * 2),
                'rate_limit': Math.floor(Math.random() * 2),
                'api_error': Math.floor(Math.random() * 3)
            },
            criticalErrors: Math.floor(Math.random() * 2),
            timestamp: new Date()
        };
    }

    /**
     * Collect user metrics
     */
    async collectUserMetrics() {
        return {
            activeUsers: this.clients.size,
            totalSessions: this.clients.size + Math.floor(Math.random() * 50),
            newSessions: Math.floor(Math.random() * 10),
            avgSessionDuration: Math.floor(Math.random() * 1800000) + 300000,
            timestamp: new Date()
        };
    }

    /**
     * Store metrics in memory
     */
    storeMetrics(type, metrics) {
        const storage = this.systemMetrics[type];
        const timestamp = new Date().getTime();
        
        storage.set(timestamp, metrics);

        // Keep only last 1000 entries
        if (storage.size > 1000) {
            const oldest = Math.min(...storage.keys());
            storage.delete(oldest);
        }
    }

    /**
     * Check for alerts
     */
    async checkAlerts(aiMetrics, loadBalancerMetrics, performanceMetrics) {
        const alerts = [];

        // Check AI metrics
        if (aiMetrics.errorRate > 0.05) {
            alerts.push({
                type: 'warning',
                metric: 'ai_error_rate',
                value: aiMetrics.errorRate,
                threshold: 0.05,
                message: `AI error rate is high: ${(aiMetrics.errorRate * 100).toFixed(2)}%`
            });
        }

        if (aiMetrics.avgResponseTime > 3000) {
            alerts.push({
                type: 'warning',
                metric: 'ai_response_time',
                value: aiMetrics.avgResponseTime,
                threshold: 3000,
                message: `AI response time is slow: ${aiMetrics.avgResponseTime}ms`
            });
        }

        // Check performance metrics
        if (performanceMetrics.cpuUsage > 80) {
            alerts.push({
                type: 'critical',
                metric: 'cpu_usage',
                value: performanceMetrics.cpuUsage,
                threshold: 80,
                message: `CPU usage is critical: ${performanceMetrics.cpuUsage.toFixed(1)}%`
            });
        }

        if (performanceMetrics.memoryUsage > 85) {
            alerts.push({
                type: 'critical',
                metric: 'memory_usage',
                value: performanceMetrics.memoryUsage,
                threshold: 85,
                message: `Memory usage is critical: ${performanceMetrics.memoryUsage.toFixed(1)}%`
            });
        }

        // Broadcast alerts
        if (alerts.length > 0) {
            this.broadcastMetrics('system_alerts', {
                alerts: alerts,
                timestamp: new Date()
            });

            logger.warn('System alerts generated', { alertCount: alerts.length });
        }
    }

    /**
     * Broadcast metrics to subscribed clients
     */
    broadcastMetrics(subscriptionType, data) {
        const message = {
            type: 'metrics_update',
            subscriptionType: subscriptionType,
            data: data,
            timestamp: new Date()
        };

        for (const [clientId, client] of this.clients) {
            if (client.connected && client.subscriptions.has(subscriptionType)) {
                this.sendToClient(clientId, message);
            }
        }
    }

    /**
     * Send message to specific client
     */
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.connected && client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(JSON.stringify(message));
            } catch (error) {
                logger.error('Error sending to client', { clientId, error });
                this.handleDisconnection(clientId);
            }
        }
    }

    /**
     * Start heartbeat to keep connections alive
     */
    startHeartbeat() {
        setInterval(() => {
            for (const [clientId, client] of this.clients) {
                if (client.connected && client.ws.readyState === WebSocket.OPEN) {
                    try {
                        client.ws.ping();
                    } catch (error) {
                        logger.error('Heartbeat failed', { clientId, error });
                        this.handleDisconnection(clientId);
                    }
                }
            }
        }, this.config.heartbeatInterval);
    }

    /**
     * Setup metrics collectors
     */
    setupMetricsCollectors() {
        // Initialize metric collection intervals
        this.metricsCollectors.set('ai', {
            interval: 1000,
            lastCollection: null
        });
        
        this.metricsCollectors.set('performance', {
            interval: 5000,
            lastCollection: null
        });
    }

    /**
     * Setup alert thresholds
     */
    setupAlertThresholds() {
        this.alertThresholds.set('ai_error_rate', { threshold: 0.05, condition: 'greater' });
        this.alertThresholds.set('ai_response_time', { threshold: 3000, condition: 'greater' });
        this.alertThresholds.set('cpu_usage', { threshold: 80, condition: 'greater' });
        this.alertThresholds.set('memory_usage', { threshold: 85, condition: 'greater' });
        this.alertThresholds.set('disk_usage', { threshold: 90, condition: 'greater' });
    }

    /**
     * Get current metrics data
     */
    getCurrentAIMetrics() {
        const latest = Array.from(this.systemMetrics.ai.entries())
            .sort(([a], [b]) => b - a)[0];
        return latest ? latest[1] : {};
    }

    getCurrentLoadBalancerMetrics() {
        const latest = Array.from(this.systemMetrics.loadBalancer.entries())
            .sort(([a], [b]) => b - a)[0];
        return latest ? latest[1] : {};
    }

    getCurrentPerformanceMetrics() {
        const latest = Array.from(this.systemMetrics.performance.entries())
            .sort(([a], [b]) => b - a)[0];
        return latest ? latest[1] : {};
    }

    getCurrentAlerts() {
        // Return recent alerts
        return {
            alerts: [],
            timestamp: new Date()
        };
    }

    /**
     * Get metrics data for time range
     */
    getMetricsData(metricsType, timeRange) {
        const storage = this.systemMetrics[metricsType];
        if (!storage) return [];

        const now = new Date().getTime();
        const ranges = {
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000
        };

        const rangeMs = ranges[timeRange] || ranges['1h'];
        const cutoff = now - rangeMs;

        return Array.from(storage.entries())
            .filter(([timestamp]) => timestamp >= cutoff)
            .sort(([a], [b]) => a - b)
            .map(([timestamp, data]) => ({ timestamp, ...data }));
    }

    /**
     * Validate authentication token
     */
    validateAuthToken(token) {
        // Simple validation for demo - in production use proper JWT validation
        return token && token.length > 10;
    }

    /**
     * Generate client ID
     */
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get monitoring statistics
     */
    getStatistics() {
        const activeClients = Array.from(this.clients.values()).filter(c => c.connected).length;
        const authenticatedClients = Array.from(this.clients.values()).filter(c => c.authenticated).length;
        
        const subscriptionStats = {};
        for (const type of this.subscriptionTypes) {
            subscriptionStats[type] = Array.from(this.clients.values())
                .filter(c => c.subscriptions.has(type)).length;
        }

        return {
            server: {
                status: this.wss ? 'running' : 'stopped',
                port: this.config.port,
                uptime: Date.now() - this.startTime.getTime()
            },
            clients: {
                total: this.clients.size,
                active: activeClients,
                authenticated: authenticatedClients
            },
            subscriptions: subscriptionStats,
            metrics: {
                aiDataPoints: this.systemMetrics.ai.size,
                performanceDataPoints: this.systemMetrics.performance.size,
                alertThresholds: this.alertThresholds.size
            },
            timestamp: new Date()
        };
    }

    /**
     * Shutdown monitoring service
     */
    async shutdown() {
        logger.info('Shutting down Real-Time Monitoring Service');

        // Close all client connections
        for (const [clientId, client] of this.clients) {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.close(1000, 'Server shutting down');
            }
        }

        // Close WebSocket server
        if (this.wss) {
            this.wss.close();
        }

        this.clients.clear();
        this.systemMetrics.ai.clear();
        this.systemMetrics.performance.clear();
        this.systemMetrics.errors.clear();
        this.systemMetrics.users.clear();

        logger.info('Real-Time Monitoring Service shutdown complete');
    }
}

module.exports = RealTimeMonitoringService;