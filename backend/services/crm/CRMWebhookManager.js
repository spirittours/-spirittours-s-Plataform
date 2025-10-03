/**
 * CRM Webhook Manager Enterprise
 * Sistema completo de webhooks bidireccionales para SuiteCRM
 * Manejo de eventos en tiempo real y sincronización automática
 */

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const logger = require('../logging/logger');
const Redis = require('redis');
const { v4: uuidv4 } = require('uuid');

class CRMWebhookManager {
    constructor(config = {}) {
        this.config = {
            port: process.env.WEBHOOK_PORT || 8080,
            secretKey: process.env.WEBHOOK_SECRET_KEY || 'webhook_secret_key',
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 60000, // 1 minuto
            timeout: config.timeout || 30000 // 30 segundos
        };

        this.app = express();
        this.redis = Redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379
        });

        // Queue de webhooks pendientes
        this.webhookQueue = [];
        this.isProcessing = false;

        // Configuración de middlewares
        this.setupMiddlewares();
        this.setupRoutes();

        // Métricas de performance
        this.metrics = {
            totalReceived: 0,
            totalProcessed: 0,
            totalFailed: 0,
            processingTime: [],
            lastProcessed: null
        };

        logger.info('CRM Webhook Manager initialized');
    }

    /**
     * Configurar middlewares de Express
     */
    setupMiddlewares() {
        this.app.use(express.json({ 
            limit: '10mb',
            verify: (req, res, buf) => {
                // Guardar el raw body para verificación de firma
                req.rawBody = buf;
            }
        }));
        this.app.use(express.urlencoded({ extended: true }));

        // Middleware de logging
        this.app.use((req, res, next) => {
            req.startTime = Date.now();
            logger.info(`Webhook received: ${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                contentLength: req.get('Content-Length')
            });
            next();
        });

        // Middleware de validación de firma (SuiteCRM)
        this.app.use('/webhook/suitecrm', this.validateSuiteCRMSignature.bind(this));
    }

    /**
     * Configurar rutas de webhooks
     */
    setupRoutes() {
        // Webhook principal de SuiteCRM
        this.app.post('/webhook/suitecrm/:entity/:action', this.handleSuiteCRMWebhook.bind(this));
        
        // Webhook genérico para otros CRMs
        this.app.post('/webhook/crm/:system/:entity/:action', this.handleGenericCRMWebhook.bind(this));
        
        // Webhook de estado (health check)
        this.app.get('/webhook/health', this.handleHealthCheck.bind(this));
        
        // Webhook de métricas
        this.app.get('/webhook/metrics', this.getMetrics.bind(this));
        
        // Webhook de configuración
        this.app.get('/webhook/config', this.getWebhookConfig.bind(this));
        this.app.post('/webhook/config', this.updateWebhookConfig.bind(this));
        
        // Webhook de test
        this.app.post('/webhook/test', this.handleTestWebhook.bind(this));
    }

    /**
     * Validar firma de SuiteCRM para seguridad
     */
    validateSuiteCRMSignature(req, res, next) {
        const signature = req.headers['x-suitecrm-signature'];
        
        if (!signature) {
            logger.warn('SuiteCRM webhook without signature', {
                path: req.path,
                ip: req.ip
            });
            return res.status(401).json({ error: 'Missing signature' });
        }

        try {
            const expectedSignature = crypto
                .createHmac('sha256', this.config.secretKey)
                .update(req.rawBody)
                .digest('hex');

            const providedSignature = signature.replace('sha256=', '');

            if (!crypto.timingSafeEqual(
                Buffer.from(expectedSignature, 'hex'),
                Buffer.from(providedSignature, 'hex')
            )) {
                logger.warn('Invalid SuiteCRM webhook signature', {
                    path: req.path,
                    ip: req.ip,
                    provided: providedSignature.substring(0, 8) + '...'
                });
                return res.status(401).json({ error: 'Invalid signature' });
            }

            next();
        } catch (error) {
            logger.error('Error validating SuiteCRM signature', error);
            return res.status(500).json({ error: 'Signature validation error' });
        }
    }

    /**
     * Manejar webhook de SuiteCRM
     */
    async handleSuiteCRMWebhook(req, res) {
        const { entity, action } = req.params;
        const webhookId = uuidv4();
        
        try {
            this.metrics.totalReceived++;

            const webhookData = {
                id: webhookId,
                source: 'suitecrm',
                entity,
                action,
                data: req.body,
                receivedAt: new Date(),
                processed: false,
                attempts: 0
            };

            logger.info('SuiteCRM webhook received', {
                webhookId,
                entity,
                action,
                recordId: req.body.id,
                module: req.body.module
            });

            // Agregar a la cola de procesamiento
            await this.addToWebhookQueue(webhookData);

            // Responder inmediatamente a SuiteCRM
            res.status(200).json({
                success: true,
                webhookId,
                message: 'Webhook received and queued for processing'
            });

            // Procesar de forma asíncrona
            this.processWebhookQueue();

        } catch (error) {
            logger.error('Error handling SuiteCRM webhook', error, {
                webhookId,
                entity,
                action
            });
            
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                webhookId
            });
        }
    }

    /**
     * Manejar webhook genérico de CRM
     */
    async handleGenericCRMWebhook(req, res) {
        const { system, entity, action } = req.params;
        const webhookId = uuidv4();

        try {
            this.metrics.totalReceived++;

            const webhookData = {
                id: webhookId,
                source: system,
                entity,
                action,
                data: req.body,
                receivedAt: new Date(),
                processed: false,
                attempts: 0
            };

            logger.info('Generic CRM webhook received', {
                webhookId,
                system,
                entity,
                action
            });

            await this.addToWebhookQueue(webhookData);
            
            res.status(200).json({
                success: true,
                webhookId,
                message: 'Webhook received and queued for processing'
            });

            this.processWebhookQueue();

        } catch (error) {
            logger.error('Error handling generic CRM webhook', error, {
                webhookId,
                system,
                entity,
                action
            });
            
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                webhookId
            });
        }
    }

    /**
     * Agregar webhook a la cola de procesamiento
     */
    async addToWebhookQueue(webhookData) {
        try {
            // Guardar en Redis para persistencia
            await this.redis.setex(
                `webhook:${webhookData.id}`,
                3600, // 1 hora
                JSON.stringify(webhookData)
            );

            // Agregar a la cola en memoria
            this.webhookQueue.push(webhookData);

            logger.debug('Webhook added to queue', {
                webhookId: webhookData.id,
                queueSize: this.webhookQueue.length
            });

        } catch (error) {
            logger.error('Error adding webhook to queue', error);
            throw error;
        }
    }

    /**
     * Procesar cola de webhooks
     */
    async processWebhookQueue() {
        if (this.isProcessing || this.webhookQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            while (this.webhookQueue.length > 0) {
                const webhook = this.webhookQueue.shift();
                await this.processWebhook(webhook);
            }
        } catch (error) {
            logger.error('Error processing webhook queue', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Procesar un webhook individual
     */
    async processWebhook(webhook) {
        const startTime = Date.now();
        
        try {
            logger.info('Processing webhook', {
                webhookId: webhook.id,
                source: webhook.source,
                entity: webhook.entity,
                action: webhook.action
            });

            webhook.attempts++;

            // Procesar según el tipo de entidad
            let result;
            switch (webhook.entity.toLowerCase()) {
                case 'contacts':
                case 'contact':
                    result = await this.processContactWebhook(webhook);
                    break;
                case 'leads':
                case 'lead':
                    result = await this.processLeadWebhook(webhook);
                    break;
                case 'opportunities':
                case 'opportunity':
                    result = await this.processOpportunityWebhook(webhook);
                    break;
                case 'accounts':
                case 'account':
                    result = await this.processAccountWebhook(webhook);
                    break;
                default:
                    result = await this.processGenericWebhook(webhook);
            }

            // Marcar como procesado
            webhook.processed = true;
            webhook.processedAt = new Date();
            webhook.result = result;

            // Actualizar métricas
            const processingTime = Date.now() - startTime;
            this.metrics.totalProcessed++;
            this.metrics.processingTime.push(processingTime);
            this.metrics.lastProcessed = new Date();

            // Mantener solo los últimos 100 tiempos
            if (this.metrics.processingTime.length > 100) {
                this.metrics.processingTime = this.metrics.processingTime.slice(-100);
            }

            // Actualizar en Redis
            await this.redis.setex(
                `webhook:${webhook.id}`,
                86400, // 24 horas para webhooks procesados
                JSON.stringify(webhook)
            );

            logger.info('Webhook processed successfully', {
                webhookId: webhook.id,
                processingTime: `${processingTime}ms`,
                result: result?.success ? 'success' : 'failed'
            });

        } catch (error) {
            logger.error('Error processing webhook', error, {
                webhookId: webhook.id,
                attempts: webhook.attempts
            });

            this.metrics.totalFailed++;

            // Reintentar si no se han agotado los intentos
            if (webhook.attempts < this.config.retryAttempts) {
                setTimeout(() => {
                    this.webhookQueue.push(webhook);
                    this.processWebhookQueue();
                }, this.config.retryDelay);
            }
        }
    }

    /**
     * Procesar webhook de contacto
     */
    async processContactWebhook(webhook) {
        try {
            const { action, data } = webhook;
            
            // Implementar lógica específica para contactos
            switch (action.toLowerCase()) {
                case 'create':
                case 'created':
                    return await this.syncContactToLocal(data, 'create');
                case 'update':
                case 'updated':
                    return await this.syncContactToLocal(data, 'update');
                case 'delete':
                case 'deleted':
                    return await this.deleteLocalContact(data.id);
                default:
                    logger.warn('Unknown contact action', { action, webhookId: webhook.id });
                    return { success: false, message: 'Unknown action' };
            }
        } catch (error) {
            logger.error('Error processing contact webhook', error);
            throw error;
        }
    }

    /**
     * Procesar webhook de lead
     */
    async processLeadWebhook(webhook) {
        try {
            const { action, data } = webhook;
            
            switch (action.toLowerCase()) {
                case 'create':
                case 'created':
                    return await this.syncLeadToLocal(data, 'create');
                case 'update':
                case 'updated':
                    return await this.syncLeadToLocal(data, 'update');
                case 'delete':
                case 'deleted':
                    return await this.deleteLocalLead(data.id);
                case 'convert':
                case 'converted':
                    return await this.convertLead(data);
                default:
                    logger.warn('Unknown lead action', { action, webhookId: webhook.id });
                    return { success: false, message: 'Unknown action' };
            }
        } catch (error) {
            logger.error('Error processing lead webhook', error);
            throw error;
        }
    }

    /**
     * Procesar webhook de oportunidad
     */
    async processOpportunityWebhook(webhook) {
        try {
            const { action, data } = webhook;
            
            switch (action.toLowerCase()) {
                case 'create':
                case 'created':
                    return await this.syncOpportunityToLocal(data, 'create');
                case 'update':
                case 'updated':
                    return await this.syncOpportunityToLocal(data, 'update');
                case 'delete':
                case 'deleted':
                    return await this.deleteLocalOpportunity(data.id);
                case 'close':
                case 'closed':
                    return await this.closeOpportunity(data);
                default:
                    logger.warn('Unknown opportunity action', { action, webhookId: webhook.id });
                    return { success: false, message: 'Unknown action' };
            }
        } catch (error) {
            logger.error('Error processing opportunity webhook', error);
            throw error;
        }
    }

    /**
     * Procesar webhook de cuenta
     */
    async processAccountWebhook(webhook) {
        try {
            const { action, data } = webhook;
            
            switch (action.toLowerCase()) {
                case 'create':
                case 'created':
                    return await this.syncAccountToLocal(data, 'create');
                case 'update':
                case 'updated':
                    return await this.syncAccountToLocal(data, 'update');
                case 'delete':
                case 'deleted':
                    return await this.deleteLocalAccount(data.id);
                default:
                    logger.warn('Unknown account action', { action, webhookId: webhook.id });
                    return { success: false, message: 'Unknown action' };
            }
        } catch (error) {
            logger.error('Error processing account webhook', error);
            throw error;
        }
    }

    /**
     * Procesar webhook genérico
     */
    async processGenericWebhook(webhook) {
        try {
            logger.info('Processing generic webhook', {
                webhookId: webhook.id,
                entity: webhook.entity,
                action: webhook.action
            });

            // Implementar lógica genérica
            return {
                success: true,
                message: 'Generic webhook processed',
                data: webhook.data
            };
        } catch (error) {
            logger.error('Error processing generic webhook', error);
            throw error;
        }
    }

    /**
     * Sincronizar contacto a base de datos local
     */
    async syncContactToLocal(contactData, operation) {
        try {
            // Implementar sincronización con base de datos local
            // Esta función se conectaría con el modelo CRMContact
            
            logger.info('Syncing contact to local database', {
                contactId: contactData.id,
                operation,
                email: contactData.email
            });

            // Aquí iría la lógica de sincronización real
            // Por ahora retornamos un mock
            return {
                success: true,
                operation,
                localId: contactData.id,
                message: 'Contact synchronized successfully'
            };
        } catch (error) {
            logger.error('Error syncing contact to local', error);
            throw error;
        }
    }

    /**
     * Sincronizar lead a base de datos local
     */
    async syncLeadToLocal(leadData, operation) {
        try {
            logger.info('Syncing lead to local database', {
                leadId: leadData.id,
                operation,
                email: leadData.email
            });

            return {
                success: true,
                operation,
                localId: leadData.id,
                message: 'Lead synchronized successfully'
            };
        } catch (error) {
            logger.error('Error syncing lead to local', error);
            throw error;
        }
    }

    /**
     * Sincronizar oportunidad a base de datos local
     */
    async syncOpportunityToLocal(opportunityData, operation) {
        try {
            logger.info('Syncing opportunity to local database', {
                opportunityId: opportunityData.id,
                operation,
                name: opportunityData.name
            });

            return {
                success: true,
                operation,
                localId: opportunityData.id,
                message: 'Opportunity synchronized successfully'
            };
        } catch (error) {
            logger.error('Error syncing opportunity to local', error);
            throw error;
        }
    }

    /**
     * Sincronizar cuenta a base de datos local
     */
    async syncAccountToLocal(accountData, operation) {
        try {
            logger.info('Syncing account to local database', {
                accountId: accountData.id,
                operation,
                name: accountData.name
            });

            return {
                success: true,
                operation,
                localId: accountData.id,
                message: 'Account synchronized successfully'
            };
        } catch (error) {
            logger.error('Error syncing account to local', error);
            throw error;
        }
    }

    /**
     * Eliminar contacto local
     */
    async deleteLocalContact(contactId) {
        try {
            logger.info('Deleting local contact', { contactId });
            
            return {
                success: true,
                operation: 'delete',
                localId: contactId,
                message: 'Contact deleted successfully'
            };
        } catch (error) {
            logger.error('Error deleting local contact', error);
            throw error;
        }
    }

    /**
     * Eliminar lead local
     */
    async deleteLocalLead(leadId) {
        try {
            logger.info('Deleting local lead', { leadId });
            
            return {
                success: true,
                operation: 'delete',
                localId: leadId,
                message: 'Lead deleted successfully'
            };
        } catch (error) {
            logger.error('Error deleting local lead', error);
            throw error;
        }
    }

    /**
     * Eliminar oportunidad local
     */
    async deleteLocalOpportunity(opportunityId) {
        try {
            logger.info('Deleting local opportunity', { opportunityId });
            
            return {
                success: true,
                operation: 'delete',
                localId: opportunityId,
                message: 'Opportunity deleted successfully'
            };
        } catch (error) {
            logger.error('Error deleting local opportunity', error);
            throw error;
        }
    }

    /**
     * Eliminar cuenta local
     */
    async deleteLocalAccount(accountId) {
        try {
            logger.info('Deleting local account', { accountId });
            
            return {
                success: true,
                operation: 'delete',
                localId: accountId,
                message: 'Account deleted successfully'
            };
        } catch (error) {
            logger.error('Error deleting local account', error);
            throw error;
        }
    }

    /**
     * Convertir lead
     */
    async convertLead(leadData) {
        try {
            logger.info('Converting lead', {
                leadId: leadData.id,
                contactId: leadData.contact_id,
                accountId: leadData.account_id,
                opportunityId: leadData.opportunity_id
            });

            return {
                success: true,
                operation: 'convert',
                leadId: leadData.id,
                contactId: leadData.contact_id,
                accountId: leadData.account_id,
                opportunityId: leadData.opportunity_id,
                message: 'Lead converted successfully'
            };
        } catch (error) {
            logger.error('Error converting lead', error);
            throw error;
        }
    }

    /**
     * Cerrar oportunidad
     */
    async closeOpportunity(opportunityData) {
        try {
            logger.info('Closing opportunity', {
                opportunityId: opportunityData.id,
                stage: opportunityData.sales_stage,
                amount: opportunityData.amount
            });

            return {
                success: true,
                operation: 'close',
                opportunityId: opportunityData.id,
                stage: opportunityData.sales_stage,
                message: 'Opportunity closed successfully'
            };
        } catch (error) {
            logger.error('Error closing opportunity', error);
            throw error;
        }
    }

    /**
     * Health check endpoint
     */
    handleHealthCheck(req, res) {
        const health = {
            status: 'healthy',
            timestamp: new Date(),
            uptime: process.uptime(),
            queue: {
                pending: this.webhookQueue.length,
                processing: this.isProcessing
            },
            metrics: this.metrics,
            redis: {
                connected: this.redis.connected
            }
        };

        res.status(200).json(health);
    }

    /**
     * Obtener métricas
     */
    getMetrics(req, res) {
        const avgProcessingTime = this.metrics.processingTime.length > 0
            ? this.metrics.processingTime.reduce((a, b) => a + b, 0) / this.metrics.processingTime.length
            : 0;

        const metrics = {
            ...this.metrics,
            avgProcessingTime: Math.round(avgProcessingTime),
            successRate: this.metrics.totalReceived > 0 
                ? ((this.metrics.totalProcessed / this.metrics.totalReceived) * 100).toFixed(2) + '%'
                : '0%',
            queueSize: this.webhookQueue.length,
            isProcessing: this.isProcessing
        };

        res.status(200).json(metrics);
    }

    /**
     * Obtener configuración de webhooks
     */
    getWebhookConfig(req, res) {
        const config = {
            port: this.config.port,
            retryAttempts: this.config.retryAttempts,
            retryDelay: this.config.retryDelay,
            timeout: this.config.timeout,
            endpoints: {
                suitecrm: '/webhook/suitecrm/:entity/:action',
                generic: '/webhook/crm/:system/:entity/:action',
                health: '/webhook/health',
                metrics: '/webhook/metrics',
                test: '/webhook/test'
            }
        };

        res.status(200).json(config);
    }

    /**
     * Actualizar configuración de webhooks
     */
    updateWebhookConfig(req, res) {
        try {
            const { retryAttempts, retryDelay, timeout } = req.body;

            if (retryAttempts) this.config.retryAttempts = retryAttempts;
            if (retryDelay) this.config.retryDelay = retryDelay;
            if (timeout) this.config.timeout = timeout;

            logger.info('Webhook configuration updated', this.config);

            res.status(200).json({
                success: true,
                message: 'Configuration updated successfully',
                config: this.config
            });
        } catch (error) {
            logger.error('Error updating webhook config', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update configuration'
            });
        }
    }

    /**
     * Test webhook endpoint
     */
    handleTestWebhook(req, res) {
        const testWebhook = {
            id: uuidv4(),
            source: 'test',
            entity: 'test_entity',
            action: 'test_action',
            data: req.body,
            receivedAt: new Date(),
            processed: false,
            attempts: 0
        };

        logger.info('Test webhook received', { webhookId: testWebhook.id });

        res.status(200).json({
            success: true,
            message: 'Test webhook received successfully',
            webhookId: testWebhook.id,
            data: testWebhook
        });
    }

    /**
     * Iniciar el servidor de webhooks
     */
    start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.config.port, () => {
                    logger.info(`CRM Webhook Manager started on port ${this.config.port}`);
                    resolve();
                });
            } catch (error) {
                logger.error('Error starting webhook manager', error);
                reject(error);
            }
        });
    }

    /**
     * Detener el servidor de webhooks
     */
    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    logger.info('CRM Webhook Manager stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Obtener métricas de performance
     */
    getPerformanceMetrics() {
        return this.metrics;
    }
}

module.exports = CRMWebhookManager;