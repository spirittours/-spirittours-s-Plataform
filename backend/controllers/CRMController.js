/**
 * CRM Controller Enterprise
 * Controlador principal para gestión completa de CRM
 * Integración con SuiteCRM + Analytics + Webhooks
 */

const SuiteCRMClient = require('../services/crm/SuiteCRMClient');
const logger = require('../services/logging/logger');
const { validateInput } = require('../utils/validation');
const { paginate } = require('../utils/pagination');
const db = require('../database/connection');
const Redis = require('redis');

class CRMController {
    constructor() {
        this.crmClient = new SuiteCRMClient();
        this.redis = Redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379
        });
        
        // Cache settings
        this.CACHE_TTL = {
            contacts: 300,      // 5 minutos
            leads: 180,         // 3 minutos
            opportunities: 240, // 4 minutos
            stats: 60          // 1 minuto
        };
    }

    // ===== HEALTH & STATUS =====

    /**
     * Obtener estado de salud del sistema CRM
     */
    async getHealthStatus() {
        try {
            const [crmHealth, dbHealth, redisHealth] = await Promise.all([
                this.crmClient.healthCheck(),
                this.checkDatabaseHealth(),
                this.checkRedisHealth()
            ]);

            const metrics = this.crmClient.getMetrics();

            return {
                status: crmHealth.status === 'healthy' && dbHealth && redisHealth ? 'healthy' : 'degraded',
                components: {
                    suitecrm: crmHealth,
                    database: { status: dbHealth ? 'healthy' : 'unhealthy' },
                    redis: { status: redisHealth ? 'healthy' : 'unhealthy' }
                },
                metrics: {
                    totalRequests: metrics.requestCount,
                    errorRate: metrics.errorCount / Math.max(metrics.requestCount, 1),
                    avgResponseTime: metrics.avgResponseTime,
                    lastSync: metrics.lastSync,
                    uptime: process.uptime()
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Health check failed', { error: error.message });
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Verificar salud de la base de datos
     */
    async checkDatabaseHealth() {
        try {
            await db.query('SELECT 1');
            return true;
        } catch (error) {
            logger.error('Database health check failed', { error: error.message });
            return false;
        }
    }

    /**
     * Verificar salud de Redis
     */
    async checkRedisHealth() {
        try {
            await this.redis.ping();
            return true;
        } catch (error) {
            logger.error('Redis health check failed', { error: error.message });
            return false;
        }
    }

    /**
     * Obtener estadísticas de sincronización
     */
    async getSyncStatus() {
        try {
            const syncHistory = await db.query(`
                SELECT 
                    sync_type,
                    status,
                    records_processed,
                    duration,
                    error_message,
                    created_at
                FROM sync_history 
                ORDER BY created_at DESC 
                LIMIT 10
            `);

            const lastSync = await db.query(`
                SELECT 
                    MAX(created_at) as last_incremental,
                    COUNT(*) as total_syncs_today
                FROM sync_history 
                WHERE DATE(created_at) = CURDATE() AND sync_type = 'incremental'
            `);

            const metrics = this.crmClient.getMetrics();

            return {
                lastSync: metrics.lastSync,
                syncHistory: syncHistory.rows || [],
                dailyStats: lastSync.rows?.[0] || {},
                metrics: {
                    totalSyncTime: metrics.totalSyncTime,
                    avgResponseTime: metrics.avgResponseTime,
                    errorRate: metrics.errorCount / Math.max(metrics.requestCount, 1)
                }
            };
        } catch (error) {
            logger.error('Failed to get sync status', { error: error.message });
            throw new Error(`Sync status retrieval failed: ${error.message}`);
        }
    }

    // ===== GESTIÓN DE CONTACTOS =====

    /**
     * Obtener lista de contactos con filtros
     */
    async getContacts(req, res) {
        try {
            const { page = 1, limit = 20, search, status, source, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
            
            // Validar parámetros
            const validation = validateInput(req.query, {
                page: { type: 'number', min: 1 },
                limit: { type: 'number', min: 1, max: 100 },
                search: { type: 'string', optional: true },
                status: { type: 'string', optional: true, enum: ['active', 'inactive', 'pending'] }
            });

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid parameters',
                    errors: validation.errors
                });
            }

            // Verificar cache
            const cacheKey = `crm:contacts:${JSON.stringify(req.query)}`;
            const cached = await this.redis.get(cacheKey);
            
            if (cached) {
                return res.json({
                    success: true,
                    data: JSON.parse(cached),
                    cached: true
                });
            }

            // Construir opciones de filtrado
            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                search,
                filters: {}
            };

            if (status) options.filters.status = status;
            if (source) options.filters.lead_source = source;

            // Obtener datos de SuiteCRM
            const crmData = await this.crmClient.getContacts(options);
            
            // Enriquecer con datos locales si es necesario
            const enrichedData = await this.enrichContactsData(crmData.data);

            const result = {
                data: enrichedData,
                pagination: crmData.pagination,
                filters: {
                    search,
                    status,
                    source,
                    sortBy,
                    sortOrder
                },
                metadata: {
                    totalRecords: crmData.pagination.total,
                    currentPage: crmData.pagination.page,
                    totalPages: Math.ceil(crmData.pagination.total / crmData.pagination.limit),
                    hasNext: crmData.pagination.page * crmData.pagination.limit < crmData.pagination.total,
                    hasPrev: crmData.pagination.page > 1
                }
            };

            // Cachear resultado
            await this.redis.setex(cacheKey, this.CACHE_TTL.contacts, JSON.stringify(result));

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Failed to get contacts', { 
                error: error.message,
                userId: req.user?.id,
                query: req.query 
            });
            
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve contacts',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Obtener contacto por ID
     */
    async getContact(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Contact ID is required'
                });
            }

            // Verificar cache
            const cacheKey = `crm:contact:${id}`;
            const cached = await this.redis.get(cacheKey);
            
            if (cached) {
                return res.json({
                    success: true,
                    data: JSON.parse(cached),
                    cached: true
                });
            }

            const contact = await this.crmClient.getContact(id);
            
            if (!contact.data) {
                return res.status(404).json({
                    success: false,
                    message: 'Contact not found'
                });
            }

            // Enriquecer con datos locales
            const enrichedContact = await this.enrichContactData(contact.data);

            // Cachear resultado
            await this.redis.setex(cacheKey, this.CACHE_TTL.contacts, JSON.stringify(enrichedContact));

            res.json({
                success: true,
                data: enrichedContact
            });

        } catch (error) {
            logger.error('Failed to get contact', { 
                error: error.message,
                contactId: req.params.id,
                userId: req.user?.id 
            });
            
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve contact',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Crear nuevo contacto
     */
    async createContact(req, res) {
        try {
            // Validar datos de entrada
            const validation = validateInput(req.body, {
                firstName: { type: 'string', required: true, minLength: 2 },
                lastName: { type: 'string', required: true, minLength: 2 },
                email: { type: 'email', required: true },
                phone: { type: 'string', optional: true },
                company: { type: 'string', optional: true },
                title: { type: 'string', optional: true },
                source: { type: 'string', optional: true },
                description: { type: 'string', optional: true }
            });

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid contact data',
                    errors: validation.errors
                });
            }

            // Verificar si ya existe el contacto por email
            const existingContacts = await this.crmClient.getContacts({
                search: req.body.email,
                limit: 1
            });

            if (existingContacts.data.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Contact with this email already exists',
                    existingContact: existingContacts.data[0]
                });
            }

            // Preparar datos del contacto
            const contactData = {
                ...req.body,
                assignedTo: req.user?.id,
                source: req.body.source || 'Website',
                createdBy: req.user?.id
            };

            // Crear contacto en SuiteCRM
            const crmContact = await this.crmClient.createContact(contactData);

            // Guardar referencia local si es necesario
            await this.saveLocalContactReference(crmContact, contactData);

            // Limpiar cache relacionado
            await this.clearContactsCache();

            // Log de actividad
            await this.logCRMActivity({
                entityType: 'contact',
                entityId: crmContact.id,
                action: 'create',
                userId: req.user?.id,
                details: { email: contactData.email, company: contactData.company }
            });

            res.status(201).json({
                success: true,
                message: 'Contact created successfully',
                data: crmContact
            });

        } catch (error) {
            logger.error('Failed to create contact', { 
                error: error.message,
                contactData: req.body,
                userId: req.user?.id 
            });
            
            res.status(500).json({
                success: false,
                message: 'Failed to create contact',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Actualizar contacto existente
     */
    async updateContact(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Contact ID is required'
                });
            }

            // Validar datos de entrada (campos opcionales para update)
            const validation = validateInput(req.body, {
                firstName: { type: 'string', optional: true, minLength: 2 },
                lastName: { type: 'string', optional: true, minLength: 2 },
                email: { type: 'email', optional: true },
                phone: { type: 'string', optional: true },
                company: { type: 'string', optional: true },
                title: { type: 'string', optional: true },
                description: { type: 'string', optional: true }
            });

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid update data',
                    errors: validation.errors
                });
            }

            // Verificar que el contacto existe
            const existingContact = await this.crmClient.getContact(id);
            if (!existingContact.data) {
                return res.status(404).json({
                    success: false,
                    message: 'Contact not found'
                });
            }

            // Preparar datos de actualización
            const updateData = {
                ...req.body,
                modifiedBy: req.user?.id,
                dateModified: new Date().toISOString()
            };

            // Actualizar en SuiteCRM
            const updatedContact = await this.crmClient.updateContact(id, updateData);

            // Limpiar cache
            await this.redis.del(`crm:contact:${id}`);
            await this.clearContactsCache();

            // Log de actividad
            await this.logCRMActivity({
                entityType: 'contact',
                entityId: id,
                action: 'update',
                userId: req.user?.id,
                details: updateData
            });

            res.json({
                success: true,
                message: 'Contact updated successfully',
                data: updatedContact
            });

        } catch (error) {
            logger.error('Failed to update contact', { 
                error: error.message,
                contactId: req.params.id,
                updateData: req.body,
                userId: req.user?.id 
            });
            
            res.status(500).json({
                success: false,
                message: 'Failed to update contact',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Eliminar contacto
     */
    async deleteContact(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: 'Contact ID is required'
                });
            }

            // Verificar que el contacto existe
            const existingContact = await this.crmClient.getContact(id);
            if (!existingContact.data) {
                return res.status(404).json({
                    success: false,
                    message: 'Contact not found'
                });
            }

            // Eliminar de SuiteCRM
            await this.crmClient.deleteContact(id);

            // Limpiar cache
            await this.redis.del(`crm:contact:${id}`);
            await this.clearContactsCache();

            // Log de actividad
            await this.logCRMActivity({
                entityType: 'contact',
                entityId: id,
                action: 'delete',
                userId: req.user?.id,
                details: { deletedContact: existingContact.data.attributes }
            });

            res.json({
                success: true,
                message: 'Contact deleted successfully'
            });

        } catch (error) {
            logger.error('Failed to delete contact', { 
                error: error.message,
                contactId: req.params.id,
                userId: req.user?.id 
            });
            
            res.status(500).json({
                success: false,
                message: 'Failed to delete contact',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ===== GESTIÓN DE LEADS =====

    /**
     * Obtener lista de leads
     */
    async getLeads(req, res) {
        try {
            const { page = 1, limit = 20, search, status, source } = req.query;
            
            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                search,
                filters: {}
            };

            if (status) options.filters.status = status;
            if (source) options.filters.lead_source = source;

            const crmData = await this.crmClient.getLeads(options);
            const enrichedData = await this.enrichLeadsData(crmData.data);

            const result = {
                data: enrichedData,
                pagination: crmData.pagination,
                filters: { search, status, source }
            };

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            logger.error('Failed to get leads', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve leads',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Crear nuevo lead
     */
    async createLead(req, res) {
        try {
            const validation = validateInput(req.body, {
                firstName: { type: 'string', required: true },
                lastName: { type: 'string', required: true },
                email: { type: 'email', required: true },
                phone: { type: 'string', optional: true },
                company: { type: 'string', optional: true },
                source: { type: 'string', optional: true },
                status: { type: 'string', optional: true }
            });

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid lead data',
                    errors: validation.errors
                });
            }

            const leadData = {
                ...req.body,
                assignedTo: req.user?.id,
                createdBy: req.user?.id
            };

            const crmLead = await this.crmClient.createLead(leadData);

            await this.logCRMActivity({
                entityType: 'lead',
                entityId: crmLead.id,
                action: 'create',
                userId: req.user?.id,
                details: { email: leadData.email, status: leadData.status }
            });

            res.status(201).json({
                success: true,
                message: 'Lead created successfully',
                data: crmLead
            });

        } catch (error) {
            logger.error('Failed to create lead', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Failed to create lead',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Convertir lead
     */
    async convertLead(req, res) {
        try {
            const { id } = req.params;
            const conversionData = req.body;

            const result = await this.crmClient.convertLead(id, {
                ...conversionData,
                assignedTo: req.user?.id
            });

            await this.logCRMActivity({
                entityType: 'lead',
                entityId: id,
                action: 'convert',
                userId: req.user?.id,
                details: conversionData
            });

            res.json({
                success: true,
                message: 'Lead converted successfully',
                data: result
            });

        } catch (error) {
            logger.error('Failed to convert lead', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Failed to convert lead',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ===== GESTIÓN DE OPORTUNIDADES =====

    /**
     * Obtener oportunidades
     */
    async getOpportunities(req, res) {
        try {
            const { page = 1, limit = 20, stage, minAmount, maxAmount } = req.query;
            
            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                filters: {}
            };

            if (stage) options.filters.sales_stage = stage;
            if (minAmount) options.filters.amount_gte = parseFloat(minAmount);
            if (maxAmount) options.filters.amount_lte = parseFloat(maxAmount);

            const crmData = await this.crmClient.getOpportunities(options);

            res.json({
                success: true,
                data: {
                    data: crmData.data,
                    pagination: crmData.pagination,
                    filters: { stage, minAmount, maxAmount }
                }
            });

        } catch (error) {
            logger.error('Failed to get opportunities', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve opportunities',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    /**
     * Crear oportunidad
     */
    async createOpportunity(req, res) {
        try {
            const validation = validateInput(req.body, {
                name: { type: 'string', required: true },
                amount: { type: 'number', optional: true },
                closeDate: { type: 'date', optional: true },
                stage: { type: 'string', optional: true },
                contactId: { type: 'string', optional: true }
            });

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid opportunity data',
                    errors: validation.errors
                });
            }

            const opportunityData = {
                ...req.body,
                assignedTo: req.user?.id
            };

            const crmOpportunity = await this.crmClient.createOpportunity(opportunityData);

            await this.logCRMActivity({
                entityType: 'opportunity',
                entityId: crmOpportunity.id,
                action: 'create',
                userId: req.user?.id,
                details: { name: opportunityData.name, amount: opportunityData.amount }
            });

            res.status(201).json({
                success: true,
                message: 'Opportunity created successfully',
                data: crmOpportunity
            });

        } catch (error) {
            logger.error('Failed to create opportunity', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Failed to create opportunity',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ===== SINCRONIZACIÓN =====

    /**
     * Sincronización incremental
     */
    async performIncrementalSync(req, res) {
        try {
            const lastSyncTime = req.query.since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            
            const syncStartTime = Date.now();
            const results = await this.crmClient.incrementalSync(lastSyncTime);
            const duration = Date.now() - syncStartTime;

            // Guardar historial de sincronización
            await db.query(`
                INSERT INTO sync_history (sync_type, status, records_processed, duration, created_at)
                VALUES (?, ?, ?, ?, ?)
            `, [
                'incremental',
                'completed',
                JSON.stringify(results),
                duration,
                new Date()
            ]);

            res.json({
                success: true,
                message: 'Incremental sync completed',
                data: {
                    results,
                    duration,
                    lastSyncTime,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error('Incremental sync failed', { error: error.message });
            
            // Guardar error en historial
            await db.query(`
                INSERT INTO sync_history (sync_type, status, error_message, created_at)
                VALUES (?, ?, ?, ?)
            `, ['incremental', 'failed', error.message, new Date()]);

            res.status(500).json({
                success: false,
                message: 'Incremental sync failed',
                error: error.message
            });
        }
    }

    /**
     * Sincronización completa (solo supervisores)
     */
    async performFullSync(req, res) {
        try {
            // Verificar permisos de supervisor
            if (!['admin', 'supervisor'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Full sync requires supervisor privileges'
                });
            }

            const syncStartTime = Date.now();
            
            // Limpiar cache antes de sincronización completa
            await this.clearAllCaches();
            
            // Realizar sincronización completa
            const results = await this.crmClient.incrementalSync('1970-01-01T00:00:00Z');
            const duration = Date.now() - syncStartTime;

            await db.query(`
                INSERT INTO sync_history (sync_type, status, records_processed, duration, created_at)
                VALUES (?, ?, ?, ?, ?)
            `, [
                'full',
                'completed',
                JSON.stringify(results),
                duration,
                new Date()
            ]);

            res.json({
                success: true,
                message: 'Full sync completed',
                data: {
                    results,
                    duration,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            logger.error('Full sync failed', { error: error.message });
            
            await db.query(`
                INSERT INTO sync_history (sync_type, status, error_message, created_at)
                VALUES (?, ?, ?, ?)
            `, ['full', 'failed', error.message, new Date()]);

            res.status(500).json({
                success: false,
                message: 'Full sync failed',
                error: error.message
            });
        }
    }

    // ===== ESTADÍSTICAS Y ANALYTICS =====

    /**
     * Obtener estadísticas del dashboard CRM
     */
    async getDashboardStats(req, res) {
        try {
            const cacheKey = 'crm:dashboard:stats';
            const cached = await this.redis.get(cacheKey);
            
            if (cached) {
                return res.json({
                    success: true,
                    data: JSON.parse(cached),
                    cached: true
                });
            }

            // Obtener estadísticas de diferentes entidades
            const [contactsStats, leadsStats, opportunitiesStats, systemMetrics] = await Promise.all([
                this.getContactsStats(),
                this.getLeadsStats(),
                this.getOpportunitiesStats(),
                this.crmClient.getMetrics()
            ]);

            const dashboardData = {
                summary: {
                    totalContacts: contactsStats.total,
                    totalLeads: leadsStats.total,
                    totalOpportunities: opportunitiesStats.total,
                    totalRevenue: opportunitiesStats.totalValue,
                    conversionRate: this.calculateConversionRate(leadsStats, opportunitiesStats)
                },
                contacts: contactsStats,
                leads: leadsStats,
                opportunities: opportunitiesStats,
                performance: {
                    avgResponseTime: systemMetrics.avgResponseTime,
                    requestCount: systemMetrics.requestCount,
                    errorRate: systemMetrics.errorCount / Math.max(systemMetrics.requestCount, 1),
                    lastSync: systemMetrics.lastSync
                },
                trends: await this.getRecentTrends(),
                timestamp: new Date().toISOString()
            };

            // Cachear por 1 minuto
            await this.redis.setex(cacheKey, this.CACHE_TTL.stats, JSON.stringify(dashboardData));

            res.json({
                success: true,
                data: dashboardData
            });

        } catch (error) {
            logger.error('Failed to get dashboard stats', { error: error.message });
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve dashboard statistics',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // ===== MÉTODOS AUXILIARES =====

    /**
     * Enriquecer datos de contactos con información local
     */
    async enrichContactsData(contacts) {
        // Implementar enriquecimiento de datos según necesidades del negocio
        return contacts.map(contact => ({
            ...contact,
            localData: {
                lastActivity: null,
                interactionCount: 0,
                preferences: {}
            }
        }));
    }

    /**
     * Enriquecer datos de un contacto específico
     */
    async enrichContactData(contact) {
        // Implementar enriquecimiento específico
        return {
            ...contact,
            localData: {
                lastActivity: null,
                interactionCount: 0,
                preferences: {},
                notes: [],
                activities: []
            }
        };
    }

    /**
     * Enriquecer datos de leads
     */
    async enrichLeadsData(leads) {
        return leads.map(lead => ({
            ...lead,
            localData: {
                score: 0,
                lastContact: null,
                nextFollowUp: null
            }
        }));
    }

    /**
     * Guardar referencia local del contacto
     */
    async saveLocalContactReference(crmContact, contactData) {
        try {
            await db.query(`
                INSERT INTO contacts (crm_id, first_name, last_name, email, phone, company, source, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    first_name = VALUES(first_name),
                    last_name = VALUES(last_name),
                    phone = VALUES(phone),
                    company = VALUES(company),
                    updated_at = NOW()
            `, [
                crmContact.id,
                contactData.firstName,
                contactData.lastName,
                contactData.email,
                contactData.phone,
                contactData.company,
                contactData.source,
                new Date()
            ]);
        } catch (error) {
            logger.error('Failed to save local contact reference', { error: error.message });
        }
    }

    /**
     * Log de actividad CRM
     */
    async logCRMActivity(activityData) {
        try {
            await db.query(`
                INSERT INTO crm_activities (entity_type, entity_id, activity_type, subject, description, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                activityData.entityType,
                activityData.entityId,
                activityData.action,
                `${activityData.action} ${activityData.entityType}`,
                JSON.stringify(activityData.details),
                activityData.userId,
                new Date()
            ]);
        } catch (error) {
            logger.error('Failed to log CRM activity', { error: error.message });
        }
    }

    /**
     * Limpiar cache de contactos
     */
    async clearContactsCache() {
        const keys = await this.redis.keys('crm:contacts:*');
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }

    /**
     * Limpiar todo el cache CRM
     */
    async clearAllCaches() {
        const keys = await this.redis.keys('crm:*');
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }

    /**
     * Obtener estadísticas de contactos
     */
    async getContactsStats() {
        // Implementar lógica de estadísticas
        return {
            total: 0,
            active: 0,
            newThisMonth: 0,
            bySource: {}
        };
    }

    /**
     * Obtener estadísticas de leads
     */
    async getLeadsStats() {
        return {
            total: 0,
            qualified: 0,
            converted: 0,
            byStatus: {}
        };
    }

    /**
     * Obtener estadísticas de oportunidades
     */
    async getOpportunitiesStats() {
        return {
            total: 0,
            totalValue: 0,
            wonThisMonth: 0,
            byStage: {}
        };
    }

    /**
     * Calcular tasa de conversión
     */
    calculateConversionRate(leadsStats, opportunitiesStats) {
        if (leadsStats.total === 0) return 0;
        return (opportunitiesStats.total / leadsStats.total) * 100;
    }

    /**
     * Obtener tendencias recientes
     */
    async getRecentTrends() {
        return {
            contactsGrowth: 0,
            leadsGrowth: 0,
            revenueGrowth: 0,
            conversionTrend: 0
        };
    }

    // ===== WEBHOOK MANAGEMENT =====

    /**
     * Procesar webhook entrante
     */
    async processWebhook(system, entity, action, data) {
        try {
            logger.info('Processing webhook', {
                system,
                entity,
                action,
                recordId: data.id
            });

            // Crear registro de actividad
            await this.logActivity('webhook_received', {
                system,
                entity,
                action,
                recordId: data.id,
                data
            });

            let result;
            
            // Procesar según el tipo de entidad
            switch (entity.toLowerCase()) {
                case 'contacts':
                case 'contact':
                    result = await this.processContactWebhook(action, data);
                    break;
                case 'leads':
                case 'lead':
                    result = await this.processLeadWebhook(action, data);
                    break;
                case 'opportunities':
                case 'opportunity':
                    result = await this.processOpportunityWebhook(action, data);
                    break;
                case 'accounts':
                case 'account':
                    result = await this.processAccountWebhook(action, data);
                    break;
                default:
                    logger.warn('Unknown entity type in webhook', { entity });
                    result = { success: false, message: 'Unknown entity type' };
            }

            // Registrar resultado
            await this.logActivity('webhook_processed', {
                system,
                entity,
                action,
                recordId: data.id,
                result
            });

            return result;

        } catch (error) {
            logger.error('Error processing webhook', error, {
                system,
                entity,
                action
            });
            throw error;
        }
    }

    /**
     * Procesar webhook de contacto
     */
    async processContactWebhook(action, data) {
        try {
            switch (action.toLowerCase()) {
                case 'create':
                case 'created':
                    return await this.syncContactFromCRM(data);
                case 'update':
                case 'updated':
                    return await this.syncContactFromCRM(data, true);
                case 'delete':
                case 'deleted':
                    return await this.deleteLocalContact(data.id);
                default:
                    logger.warn('Unknown contact action', { action });
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
    async processLeadWebhook(action, data) {
        try {
            switch (action.toLowerCase()) {
                case 'create':
                case 'created':
                    return await this.syncLeadFromCRM(data);
                case 'update':
                case 'updated':
                    return await this.syncLeadFromCRM(data, true);
                case 'delete':
                case 'deleted':
                    return await this.deleteLocalLead(data.id);
                case 'convert':
                case 'converted':
                    return await this.convertLead(data);
                default:
                    logger.warn('Unknown lead action', { action });
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
    async processOpportunityWebhook(action, data) {
        try {
            switch (action.toLowerCase()) {
                case 'create':
                case 'created':
                    return await this.syncOpportunityFromCRM(data);
                case 'update':
                case 'updated':
                    return await this.syncOpportunityFromCRM(data, true);
                case 'delete':
                case 'deleted':
                    return await this.deleteLocalOpportunity(data.id);
                case 'close':
                case 'closed':
                    return await this.closeOpportunity(data);
                default:
                    logger.warn('Unknown opportunity action', { action });
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
    async processAccountWebhook(action, data) {
        try {
            switch (action.toLowerCase()) {
                case 'create':
                case 'created':
                    return await this.syncAccountFromCRM(data);
                case 'update':
                case 'updated':
                    return await this.syncAccountFromCRM(data, true);
                case 'delete':
                case 'deleted':
                    return await this.deleteLocalAccount(data.id);
                default:
                    logger.warn('Unknown account action', { action });
                    return { success: false, message: 'Unknown action' };
            }
        } catch (error) {
            logger.error('Error processing account webhook', error);
            throw error;
        }
    }

    /**
     * Obtener estado de webhooks
     */
    async getWebhookStatus() {
        try {
            // Simular métricas de webhook (implementar con datos reales)
            return {
                isActive: true,
                endpoints: {
                    suitecrm: '/api/crm/webhook/suitecrm/:entity/:action',
                    generic: '/api/crm/webhook/generic/:system/:entity/:action',
                    test: '/api/crm/webhooks/test'
                },
                metrics: {
                    totalReceived: 0,
                    totalProcessed: 0,
                    totalFailed: 0,
                    successRate: '0%',
                    avgProcessingTime: 0
                },
                lastActivity: new Date(),
                queueSize: 0
            };
        } catch (error) {
            logger.error('Error getting webhook status', error);
            throw error;
        }
    }

    /**
     * Obtener configuración de webhooks
     */
    async getWebhookConfig() {
        try {
            return {
                retryAttempts: 3,
                retryDelay: 60000,
                timeout: 30000,
                secretKey: '***',
                endpoints: [
                    {
                        name: 'SuiteCRM Webhook',
                        url: '/api/crm/webhook/suitecrm/:entity/:action',
                        entities: ['contacts', 'leads', 'opportunities', 'accounts'],
                        actions: ['create', 'update', 'delete', 'convert', 'close']
                    }
                ]
            };
        } catch (error) {
            logger.error('Error getting webhook config', error);
            throw error;
        }
    }

    /**
     * Actualizar configuración de webhooks
     */
    async updateWebhookConfig(config) {
        try {
            logger.info('Updating webhook configuration', config);
            
            // Implementar actualización de configuración
            // Por ahora retornamos la configuración actualizada
            return {
                ...config,
                updatedAt: new Date()
            };
        } catch (error) {
            logger.error('Error updating webhook config', error);
            throw error;
        }
    }

    /**
     * Disparar sincronización manual
     */
    async triggerManualSync(options) {
        try {
            const {
                entity = 'all',
                direction = 'bidirectional',
                fullSync = false,
                triggeredBy
            } = options;

            logger.info('Triggering manual sync', {
                entity,
                direction,
                fullSync,
                triggeredBy
            });

            // Crear registro de sincronización
            const syncBatchId = `manual_sync_${Date.now()}`;
            
            // Registrar inicio de sincronización
            await this.logActivity('sync_started', {
                syncBatchId,
                entity,
                direction,
                fullSync,
                triggeredBy
            });

            let result;
            
            // Ejecutar sincronización según entidad
            if (entity === 'all') {
                result = await this.syncAllEntities(direction, fullSync, syncBatchId);
            } else {
                result = await this.syncSingleEntity(entity, direction, fullSync, syncBatchId);
            }

            // Registrar finalización
            await this.logActivity('sync_completed', {
                syncBatchId,
                result
            });

            return {
                syncBatchId,
                status: 'initiated',
                entity,
                direction,
                fullSync,
                estimatedDuration: this.calculateEstimatedSyncDuration(entity, fullSync),
                result
            };

        } catch (error) {
            logger.error('Error triggering manual sync', error);
            throw error;
        }
    }

    /**
     * Sincronizar todas las entidades
     */
    async syncAllEntities(direction, fullSync, syncBatchId) {
        try {
            const entities = ['contacts', 'leads', 'opportunities', 'accounts'];
            const results = {};

            for (const entity of entities) {
                try {
                    results[entity] = await this.syncSingleEntity(entity, direction, fullSync, syncBatchId);
                } catch (error) {
                    logger.error(`Error syncing ${entity}`, error);
                    results[entity] = { success: false, error: error.message };
                }
            }

            return results;
        } catch (error) {
            logger.error('Error syncing all entities', error);
            throw error;
        }
    }

    /**
     * Sincronizar una sola entidad
     */
    async syncSingleEntity(entity, direction, fullSync, syncBatchId) {
        try {
            logger.info('Syncing single entity', { entity, direction, fullSync, syncBatchId });

            switch (entity.toLowerCase()) {
                case 'contacts':
                    return await this.syncContacts(direction, fullSync, syncBatchId);
                case 'leads':
                    return await this.syncLeads(direction, fullSync, syncBatchId);
                case 'opportunities':
                    return await this.syncOpportunities(direction, fullSync, syncBatchId);
                case 'accounts':
                    return await this.syncAccounts(direction, fullSync, syncBatchId);
                default:
                    throw new Error(`Unknown entity: ${entity}`);
            }
        } catch (error) {
            logger.error('Error syncing single entity', error);
            throw error;
        }
    }

    /**
     * Calcular duración estimada de sincronización
     */
    calculateEstimatedSyncDuration(entity, fullSync) {
        const baseDuration = {
            contacts: 30,
            leads: 20,
            opportunities: 25,
            accounts: 15,
            all: 90
        };

        const duration = baseDuration[entity] || 30;
        return fullSync ? duration * 2 : duration;
    }

    /**
     * Obtener historial de sincronización
     */
    async getSyncHistory(filters) {
        try {
            const { page, limit, entity, status } = filters;
            
            logger.info('Getting sync history', filters);

            // Simular datos de historial (implementar con base de datos real)
            const mockHistory = {
                items: [
                    {
                        id: 1,
                        syncBatchId: 'manual_sync_1727686800000',
                        entityType: 'contacts',
                        operation: 'bidirectional_sync',
                        status: 'success',
                        startedAt: new Date(Date.now() - 3600000),
                        completedAt: new Date(Date.now() - 3500000),
                        recordsProcessed: 150,
                        recordsSuccess: 148,
                        recordsFailed: 2,
                        triggeredBy: 'admin'
                    },
                    {
                        id: 2,
                        syncBatchId: 'webhook_sync_1727683200000',
                        entityType: 'leads',
                        operation: 'from_suitecrm',
                        status: 'failed',
                        startedAt: new Date(Date.now() - 7200000),
                        completedAt: new Date(Date.now() - 7100000),
                        recordsProcessed: 25,
                        recordsSuccess: 20,
                        recordsFailed: 5,
                        errorMessage: 'Authentication failed'
                    }
                ],
                pagination: {
                    page,
                    limit,
                    total: 2,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false
                }
            };

            return mockHistory;
        } catch (error) {
            logger.error('Error getting sync history', error);
            throw error;
        }
    }

    /**
     * Registrar actividad CRM
     */
    async logActivity(activityType, data) {
        try {
            const activity = {
                type: activityType,
                timestamp: new Date(),
                data: JSON.stringify(data)
            };

            logger.info('CRM activity logged', activity);

            // Implementar guardado en base de datos
            // Por ahora solo loggeamos

            return activity;
        } catch (error) {
            logger.error('Error logging CRM activity', error);
        }
    }

    /**
     * Cerrar conexiones
     */
    async disconnect() {
        await this.crmClient.disconnect();
        await this.redis.quit();
    }
}

module.exports = CRMController;