/**
 * Enterprise AI Master System
 * Complete integration of all Phase 2 Extended components
 * $100K IA Multi-Modelo Upgrade - Master Controller
 */

const EventEmitter = require('events');
const logger = require('./logging/logger');

// Import all Phase 2 Extended components
const AIMultiModelManager = require('./ai/AIMultiModelManager');
const IntelligentLoadBalancer = require('./ai/IntelligentLoadBalancer');
const AutoOptimizationEngine = require('./ai/AutoOptimizationEngine');
const RealTimeMonitoringService = require('./monitoring/RealTimeMonitoringService');
const AlertNotificationSystem = require('./notifications/AlertNotificationSystem');
const DisasterRecoverySystem = require('./backup/DisasterRecoverySystem');
const ThirdPartyAPIManager = require('./integration/ThirdPartyAPIManager');

class EnterpriseAIMasterSystem extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            // System Configuration
            systemName: options.systemName || 'Enterprise AI Multi-Model System',
            version: options.version || '2.0.0',
            environment: options.environment || process.env.NODE_ENV || 'development',
            
            // Component Configurations
            aiManager: options.aiManager || {},
            loadBalancer: options.loadBalancer || {},
            optimization: options.optimization || {},
            monitoring: options.monitoring || {},
            alerts: options.alerts || {},
            backup: options.backup || {},
            thirdPartyAPI: options.thirdPartyAPI || {},
            
            // Master System Settings
            startupTimeout: options.startupTimeout || 60000,
            shutdownTimeout: options.shutdownTimeout || 30000,
            healthCheckInterval: options.healthCheckInterval || 30000,
            autoRecovery: options.autoRecovery !== false,
            enableAllSystems: options.enableAllSystems !== false,
            
            ...options
        };

        // System components
        this.components = new Map();
        this.systemHealth = {
            status: 'starting',
            startTime: new Date(),
            lastHealthCheck: null,
            components: new Map(),
            issues: []
        };
        
        // System state
        this.isStarting = false;
        this.isRunning = false;
        this.isShuttingDown = false;
        this.startupPromise = null;
        
        // Performance metrics
        this.systemMetrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            uptime: 0,
            memoryUsage: 0,
            cpuUsage: 0
        };

        logger.info('Enterprise AI Master System initializing', {
            version: this.config.version,
            environment: this.config.environment,
            enableAllSystems: this.config.enableAllSystems
        });
    }

    /**
     * Initialize and start all system components
     */
    async initialize() {
        if (this.isStarting || this.isRunning) {
            logger.warn('System already starting or running');
            return this.startupPromise || Promise.resolve();
        }

        this.isStarting = true;
        this.startupPromise = this._performInitialization();
        
        try {
            await this.startupPromise;
            this.isRunning = true;
            this.isStarting = false;
            
            this.emit('systemStarted', {
                timestamp: new Date(),
                components: Array.from(this.components.keys())
            });
            
            logger.info('Enterprise AI Master System started successfully', {
                components: Array.from(this.components.keys()),
                startupTime: Date.now() - this.systemHealth.startTime.getTime()
            });
            
        } catch (error) {
            this.isStarting = false;
            this.emit('systemStartupFailed', { error: error.message });
            throw error;
        }
        
        return this.startupPromise;
    }

    /**
     * Perform system initialization
     */
    async _performInitialization() {
        try {
            logger.info('Starting component initialization sequence');

            // Initialize components in order
            await this.initializeCore();
            await this.initializeMonitoring();
            await this.initializeOptimization();
            await this.initializeIntegration();
            await this.initializeRecovery();
            
            // Start inter-component communication
            this.setupComponentCommunication();
            
            // Start system health monitoring
            this.startSystemHealthMonitoring();
            
            // Initialize system metrics collection
            this.startMetricsCollection();
            
            this.systemHealth.status = 'running';
            this.systemHealth.lastHealthCheck = new Date();
            
        } catch (error) {
            logger.error('System initialization failed', error);
            this.systemHealth.status = 'failed';
            await this.performEmergencyShutdown();
            throw error;
        }
    }

    /**
     * Initialize core AI components
     */
    async initializeCore() {
        logger.info('Initializing core AI components');

        try {
            // Initialize AI Multi-Model Manager
            this.components.set('aiManager', new AIMultiModelManager({
                defaultModel: 'gpt-4',
                cacheEnabled: true,
                rateLimitEnabled: true,
                loadBalancing: true,
                ...this.config.aiManager
            }));

            // Initialize Intelligent Load Balancer
            this.components.set('loadBalancer', new IntelligentLoadBalancer({
                maxConcurrentRequests: 100,
                adaptiveScaling: true,
                ...this.config.loadBalancer
            }));

            // Integrate load balancer with AI manager
            const aiManager = this.components.get('aiManager');
            const loadBalancer = this.components.get('loadBalancer');
            
            // Set up load balancer integration
            aiManager.setLoadBalancer(loadBalancer);
            
            logger.info('Core AI components initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize core AI components', error);
            throw error;
        }
    }

    /**
     * Initialize monitoring and alerting
     */
    async initializeMonitoring() {
        logger.info('Initializing monitoring and alerting systems');

        try {
            // Initialize Real-Time Monitoring Service
            this.components.set('monitoring', new RealTimeMonitoringService({
                port: 8080,
                metricsInterval: 1000,
                ...this.config.monitoring
            }));

            // Initialize Alert Notification System
            this.components.set('alerts', new AlertNotificationSystem({
                enableEmail: true,
                enableWebSocket: true,
                escalationEnabled: true,
                ...this.config.alerts
            }));

            // Start monitoring server
            await this.components.get('monitoring').startServer();
            
            logger.info('Monitoring and alerting systems initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize monitoring systems', error);
            throw error;
        }
    }

    /**
     * Initialize optimization engine
     */
    async initializeOptimization() {
        logger.info('Initializing auto-optimization engine');

        try {
            // Initialize Auto-Optimization Engine
            this.components.set('optimization', new AutoOptimizationEngine({
                learningRate: 0.01,
                optimizationInterval: 300000, // 5 minutes
                enablePredictiveScaling: true,
                enableCostOptimization: true,
                ...this.config.optimization
            }));
            
            logger.info('Auto-optimization engine initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize optimization engine', error);
            throw error;
        }
    }

    /**
     * Initialize integration systems
     */
    async initializeIntegration() {
        logger.info('Initializing integration systems');

        try {
            // Initialize Third Party API Manager
            this.components.set('thirdPartyAPI', new ThirdPartyAPIManager({
                enablePublicAPI: true,
                enableWebhooks: true,
                rateLimitingEnabled: true,
                ...this.config.thirdPartyAPI
            }));
            
            logger.info('Integration systems initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize integration systems', error);
            throw error;
        }
    }

    /**
     * Initialize recovery and backup systems
     */
    async initializeRecovery() {
        logger.info('Initializing disaster recovery system');

        try {
            // Initialize Disaster Recovery System
            this.components.set('backup', new DisasterRecoverySystem({
                backupInterval: 3600000, // 1 hour
                autoRecoveryEnabled: this.config.autoRecovery,
                monitoringEnabled: true,
                ...this.config.backup
            }));
            
            logger.info('Disaster recovery system initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize disaster recovery system', error);
            throw error;
        }
    }

    /**
     * Setup inter-component communication
     */
    setupComponentCommunication() {
        logger.info('Setting up inter-component communication');

        const aiManager = this.components.get('aiManager');
        const loadBalancer = this.components.get('loadBalancer');
        const optimization = this.components.get('optimization');
        const monitoring = this.components.get('monitoring');
        const alerts = this.components.get('alerts');
        const backup = this.components.get('backup');

        // AI Manager -> Load Balancer integration
        if (aiManager && loadBalancer) {
            aiManager.on('requestProcessed', (data) => {
                loadBalancer.trackRequestCompletion(
                    data.modelId, 
                    data.requestId, 
                    data.success, 
                    data.responseTime, 
                    data.error
                );
            });
        }

        // Load Balancer -> Optimization Engine integration
        if (loadBalancer && optimization) {
            loadBalancer.on('modelSelected', (data) => {
                optimization.collectPerformanceData({
                    request: data.requestOptions,
                    modelPerformance: {
                        modelId: data.modelId,
                        timestamp: data.timestamp
                    }
                });
            });
        }

        // System -> Monitoring integration
        if (monitoring) {
            // Collect metrics from all components
            setInterval(() => {
                this.collectSystemMetrics();
            }, 5000);
        }

        // System -> Alerts integration
        if (alerts) {
            // Set up system-wide alert triggers
            this.setupSystemAlerts();
        }

        // Optimization -> Alerts integration
        if (optimization && alerts) {
            optimization.on('optimizationApplied', (data) => {
                alerts.createAlert({
                    type: 'optimization_completed',
                    priority: 'info',
                    title: 'System Optimization Applied',
                    message: `Optimization completed with ${data.optimizations.length} changes`,
                    data: { optimizations: data.optimizations },
                    template: 'optimization_completed'
                });
            });
        }

        // Backup -> Alerts integration
        if (backup && alerts) {
            backup.on('backupFailed', (data) => {
                alerts.createAlert({
                    type: 'backup_failed',
                    priority: 'high',
                    title: 'Backup Operation Failed',
                    message: `Backup ${data.backupId} failed: ${data.error}`,
                    data: data
                });
            });
        }

        logger.info('Inter-component communication established');
    }

    /**
     * Start system health monitoring
     */
    startSystemHealthMonitoring() {
        setInterval(async () => {
            await this.performSystemHealthCheck();
        }, this.config.healthCheckInterval);

        logger.info('System health monitoring started', {
            interval: this.config.healthCheckInterval
        });
    }

    /**
     * Perform comprehensive system health check
     */
    async performSystemHealthCheck() {
        try {
            const healthResults = new Map();
            let overallIssues = [];

            // Check each component
            for (const [name, component] of this.components) {
                try {
                    let componentHealth = { status: 'unknown' };
                    
                    // Check if component has health check method
                    if (typeof component.getHealthStatus === 'function') {
                        componentHealth = await component.getHealthStatus();
                    } else if (typeof component.getStatistics === 'function') {
                        const stats = component.getStatistics();
                        componentHealth = {
                            status: 'healthy',
                            lastCheck: new Date(),
                            stats
                        };
                    } else {
                        componentHealth = {
                            status: 'healthy',
                            lastCheck: new Date(),
                            message: 'No health check available'
                        };
                    }

                    healthResults.set(name, componentHealth);

                    if (componentHealth.status !== 'healthy') {
                        overallIssues.push({
                            component: name,
                            status: componentHealth.status,
                            issue: componentHealth.message || 'Component unhealthy'
                        });
                    }

                } catch (error) {
                    const errorHealth = {
                        status: 'error',
                        lastCheck: new Date(),
                        error: error.message
                    };
                    
                    healthResults.set(name, errorHealth);
                    overallIssues.push({
                        component: name,
                        status: 'error',
                        issue: error.message
                    });
                }
            }

            // Determine overall system health
            const totalComponents = healthResults.size;
            const healthyComponents = Array.from(healthResults.values())
                .filter(health => health.status === 'healthy').length;
            
            let overallStatus = 'healthy';
            if (healthyComponents === 0) {
                overallStatus = 'critical';
            } else if (healthyComponents < totalComponents * 0.5) {
                overallStatus = 'degraded';
            } else if (healthyComponents < totalComponents) {
                overallStatus = 'warning';
            }

            // Update system health
            this.systemHealth = {
                status: overallStatus,
                startTime: this.systemHealth.startTime,
                lastHealthCheck: new Date(),
                components: healthResults,
                issues: overallIssues,
                metrics: {
                    totalComponents,
                    healthyComponents,
                    healthPercentage: (healthyComponents / totalComponents * 100).toFixed(1)
                }
            };

            // Emit health check event
            this.emit('systemHealthCheck', this.systemHealth);

            // Trigger alerts if needed
            if (overallStatus !== 'healthy') {
                await this.handleSystemHealthIssues(overallStatus, overallIssues);
            }

        } catch (error) {
            logger.error('System health check failed', error);
            this.systemHealth.status = 'error';
            this.systemHealth.lastHealthCheck = new Date();
        }
    }

    /**
     * Handle system health issues
     */
    async handleSystemHealthIssues(status, issues) {
        const alerts = this.components.get('alerts');
        if (!alerts) return;

        const priorityMap = {
            'warning': 'medium',
            'degraded': 'high',
            'critical': 'critical'
        };

        await alerts.createAlert({
            type: 'system_health',
            priority: priorityMap[status] || 'medium',
            title: `System Health: ${status.toUpperCase()}`,
            message: `System health status is ${status}. ${issues.length} component(s) have issues.`,
            data: { status, issues },
            source: 'master_system'
        });
    }

    /**
     * Setup system-wide alerts
     */
    setupSystemAlerts() {
        const alerts = this.components.get('alerts');
        if (!alerts) return;

        // Listen for critical system events
        this.on('componentFailed', async (data) => {
            await alerts.createAlert({
                type: 'component_failure',
                priority: 'critical',
                title: 'System Component Failure',
                message: `Component ${data.component} has failed: ${data.error}`,
                data: data
            });
        });

        this.on('systemOverload', async (data) => {
            await alerts.createAlert({
                type: 'system_overload',
                priority: 'high',
                title: 'System Overload Detected',
                message: `System is experiencing high load: ${data.metric} at ${data.value}`,
                data: data
            });
        });

        logger.info('System-wide alerts configured');
    }

    /**
     * Start metrics collection
     */
    startMetricsCollection() {
        setInterval(() => {
            this.collectSystemMetrics();
        }, 10000); // Collect every 10 seconds

        logger.info('System metrics collection started');
    }

    /**
     * Collect system-wide metrics
     */
    collectSystemMetrics() {
        try {
            // Calculate system uptime
            this.systemMetrics.uptime = Date.now() - this.systemHealth.startTime.getTime();

            // Collect memory usage
            const memUsage = process.memoryUsage();
            this.systemMetrics.memoryUsage = memUsage.heapUsed / memUsage.heapTotal * 100;

            // Collect CPU usage (approximation)
            this.systemMetrics.cpuUsage = process.cpuUsage().user / 1000000; // Convert to seconds

            // Collect component-specific metrics
            const componentMetrics = {};
            for (const [name, component] of this.components) {
                if (typeof component.getStatistics === 'function') {
                    componentMetrics[name] = component.getStatistics();
                }
            }

            // Emit metrics event
            this.emit('metricsCollected', {
                timestamp: new Date(),
                system: this.systemMetrics,
                components: componentMetrics
            });

            // Send to monitoring service
            const monitoring = this.components.get('monitoring');
            if (monitoring) {
                // Integration with monitoring service would happen here
            }

        } catch (error) {
            logger.error('Error collecting system metrics', error);
        }
    }

    /**
     * Process AI request through the master system
     */
    async processAIRequest(requestData) {
        try {
            this.systemMetrics.totalRequests++;

            const aiManager = this.components.get('aiManager');
            if (!aiManager) {
                throw new Error('AI Manager not available');
            }

            const result = await aiManager.processRequest(requestData);
            
            if (result.success) {
                this.systemMetrics.successfulRequests++;
            } else {
                this.systemMetrics.failedRequests++;
            }

            // Update average response time
            if (result.processingTime) {
                this.systemMetrics.averageResponseTime = 
                    (this.systemMetrics.averageResponseTime * (this.systemMetrics.totalRequests - 1) + 
                     result.processingTime) / this.systemMetrics.totalRequests;
            }

            return result;

        } catch (error) {
            this.systemMetrics.failedRequests++;
            logger.error('Error processing AI request through master system', error);
            throw error;
        }
    }

    /**
     * Get comprehensive system status
     */
    getSystemStatus() {
        return {
            system: {
                name: this.config.systemName,
                version: this.config.version,
                environment: this.config.environment,
                status: this.systemHealth.status,
                uptime: this.systemMetrics.uptime,
                startTime: this.systemHealth.startTime,
                lastHealthCheck: this.systemHealth.lastHealthCheck
            },
            components: Object.fromEntries(
                Array.from(this.systemHealth.components.entries()).map(([name, health]) => [
                    name, 
                    {
                        status: health.status,
                        lastCheck: health.lastCheck
                    }
                ])
            ),
            metrics: this.systemMetrics,
            health: {
                overallStatus: this.systemHealth.status,
                totalComponents: this.systemHealth.components.size,
                healthyComponents: Array.from(this.systemHealth.components.values())
                    .filter(h => h.status === 'healthy').length,
                issues: this.systemHealth.issues
            }
        };
    }

    /**
     * Get specific component
     */
    getComponent(componentName) {
        return this.components.get(componentName);
    }

    /**
     * Perform emergency shutdown
     */
    async performEmergencyShutdown() {
        logger.error('Performing emergency system shutdown');
        
        this.systemHealth.status = 'emergency_shutdown';
        
        // Try to shut down components gracefully, but with timeout
        const shutdownPromises = Array.from(this.components.entries()).map(([name, component]) => {
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    logger.warn(`Component ${name} shutdown timed out`);
                    resolve();
                }, 5000);

                if (typeof component.shutdown === 'function') {
                    component.shutdown()
                        .then(() => {
                            clearTimeout(timeout);
                            resolve();
                        })
                        .catch((error) => {
                            logger.error(`Error shutting down ${name}`, error);
                            clearTimeout(timeout);
                            resolve();
                        });
                } else {
                    clearTimeout(timeout);
                    resolve();
                }
            });
        });

        await Promise.all(shutdownPromises);
        this.components.clear();
        this.isRunning = false;
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        if (this.isShuttingDown) {
            logger.warn('Shutdown already in progress');
            return;
        }

        this.isShuttingDown = true;
        logger.info('Starting graceful system shutdown');

        try {
            this.systemHealth.status = 'shutting_down';

            // Shutdown components in reverse order
            const shutdownOrder = [
                'thirdPartyAPI',
                'backup', 
                'alerts',
                'monitoring',
                'optimization',
                'loadBalancer',
                'aiManager'
            ];

            for (const componentName of shutdownOrder) {
                const component = this.components.get(componentName);
                if (component && typeof component.shutdown === 'function') {
                    try {
                        await component.shutdown();
                        logger.info(`Component ${componentName} shut down successfully`);
                    } catch (error) {
                        logger.error(`Error shutting down ${componentName}`, error);
                    }
                }
            }

            this.components.clear();
            this.systemHealth.status = 'stopped';
            this.isRunning = false;
            this.isShuttingDown = false;

            this.emit('systemStopped', {
                timestamp: new Date(),
                uptime: this.systemMetrics.uptime
            });

            logger.info('Enterprise AI Master System shutdown completed');

        } catch (error) {
            logger.error('Error during system shutdown', error);
            await this.performEmergencyShutdown();
        }
    }
}

module.exports = EnterpriseAIMasterSystem;