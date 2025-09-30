/**
 * SuiteCRM Enterprise Client
 * Sistema completo de integración con SuiteCRM 8.0+
 * Basado en el análisis de AI Drive - SuiteCRM_Integration_Final
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../logging/logger');
const { retry } = require('../utils/retry');
const Redis = require('redis');

class SuiteCRMClient {
    constructor(config = {}) {
        this.config = {
            baseURL: process.env.SUITECRM_URL || config.baseURL,
            clientId: process.env.SUITECRM_CLIENT_ID || config.clientId,
            clientSecret: process.env.SUITECRM_CLIENT_SECRET || config.clientSecret,
            username: process.env.SUITECRM_USERNAME || config.username,
            password: process.env.SUITECRM_PASSWORD || config.password,
            timeout: config.timeout || 30000,
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000
        };

        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        
        // Redis client para cache
        this.redis = Redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || ''
        });

        // Configuración de axios
        this.client = axios.create({
            baseURL: `${this.config.baseURL}/Api/V8`,
            timeout: this.config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Interceptors para manejo automático de tokens
        this.setupInterceptors();

        // Métricas de performance
        this.metrics = {
            requestCount: 0,
            errorCount: 0,
            avgResponseTime: 0,
            lastSync: null,
            totalSyncTime: 0
        };
    }

    /**
     * Configurar interceptors para manejo automático de autenticación
     */
    setupInterceptors() {
        // Request interceptor - añadir token automáticamente
        this.client.interceptors.request.use(
            async (config) => {
                await this.ensureAuthenticated();
                if (this.accessToken) {
                    config.headers.Authorization = `Bearer ${this.accessToken}`;
                }
                
                // Tracking de métricas
                config.metadata = { startTime: Date.now() };
                this.metrics.requestCount++;
                
                return config;
            },
            (error) => {
                this.metrics.errorCount++;
                return Promise.reject(error);
            }
        );

        // Response interceptor - manejo de errores y métricas
        this.client.interceptors.response.use(
            (response) => {
                // Actualizar métricas
                const duration = Date.now() - response.config.metadata.startTime;
                this.updateMetrics(duration);
                
                return response;
            },
            async (error) => {
                this.metrics.errorCount++;
                
                // Auto-retry en caso de token expirado
                if (error.response?.status === 401 && !error.config._retry) {
                    error.config._retry = true;
                    await this.authenticate();
                    return this.client(error.config);
                }
                
                return Promise.reject(error);
            }
        );
    }

    /**
     * Actualizar métricas de performance
     */
    updateMetrics(responseTime) {
        const totalTime = this.metrics.avgResponseTime * (this.metrics.requestCount - 1);
        this.metrics.avgResponseTime = (totalTime + responseTime) / this.metrics.requestCount;
    }

    /**
     * Autenticación con SuiteCRM usando OAuth2
     */
    async authenticate() {
        try {
            logger.info('Authenticating with SuiteCRM...', {
                service: 'SuiteCRM',
                action: 'authenticate'
            });

            const authData = {
                grant_type: 'password',
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                username: this.config.username,
                password: this.config.password
            };

            const response = await axios.post(`${this.config.baseURL}/Api/access_token`, authData, {
                headers: { 'Content-Type': 'application/json' },
                timeout: this.config.timeout
            });

            if (response.data.access_token) {
                this.accessToken = response.data.access_token;
                this.refreshToken = response.data.refresh_token;
                this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 min buffer

                // Cache del token en Redis
                await this.cacheToken();

                logger.info('Successfully authenticated with SuiteCRM', {
                    service: 'SuiteCRM',
                    tokenExpiry: new Date(this.tokenExpiry)
                });

                return true;
            }

            throw new Error('No access token received from SuiteCRM');
        } catch (error) {
            logger.error('SuiteCRM authentication failed', {
                service: 'SuiteCRM',
                error: error.message,
                response: error.response?.data
            });
            throw new Error(`SuiteCRM authentication failed: ${error.message}`);
        }
    }

    /**
     * Cache del token en Redis
     */
    async cacheToken() {
        const tokenData = {
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
            tokenExpiry: this.tokenExpiry
        };

        await this.redis.setex(
            'suitecrm:token', 
            Math.floor((this.tokenExpiry - Date.now()) / 1000), 
            JSON.stringify(tokenData)
        );
    }

    /**
     * Recuperar token del cache
     */
    async getCachedToken() {
        try {
            const cached = await this.redis.get('suitecrm:token');
            if (cached) {
                const tokenData = JSON.parse(cached);
                if (tokenData.tokenExpiry > Date.now()) {
                    this.accessToken = tokenData.accessToken;
                    this.refreshToken = tokenData.refreshToken;
                    this.tokenExpiry = tokenData.tokenExpiry;
                    return true;
                }
            }
        } catch (error) {
            logger.warn('Failed to get cached token', { error: error.message });
        }
        return false;
    }

    /**
     * Asegurar que tenemos autenticación válida
     */
    async ensureAuthenticated() {
        if (!this.accessToken || Date.now() >= this.tokenExpiry) {
            const hasCached = await this.getCachedToken();
            if (!hasCached) {
                await this.authenticate();
            }
        }
    }

    /**
     * Realizar request con retry automático
     */
    async makeRequest(method, endpoint, data = null, options = {}) {
        return retry(
            async () => {
                const config = {
                    method,
                    url: endpoint,
                    ...options
                };

                if (data) {
                    config.data = data;
                }

                const response = await this.client(config);
                return response.data;
            },
            this.config.retryAttempts,
            this.config.retryDelay
        );
    }

    // ===== GESTIÓN DE CONTACTOS =====

    /**
     * Obtener lista de contactos con filtros y paginación
     */
    async getContacts(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 20,
            ...options.filters
        };

        if (options.search) {
            params.filter = {
                first_name: { '$contains': options.search },
                last_name: { '$contains': options.search },
                email: { '$contains': options.search }
            };
        }

        const response = await this.makeRequest('GET', '/module/Contacts', null, { params });
        
        return {
            data: response.data || [],
            meta: response.meta || {},
            pagination: {
                page: params.page,
                limit: params.limit,
                total: response.meta?.total || 0
            }
        };
    }

    /**
     * Obtener contacto por ID
     */
    async getContact(id) {
        return await this.makeRequest('GET', `/module/Contacts/${id}`);
    }

    /**
     * Crear nuevo contacto
     */
    async createContact(contactData) {
        const payload = {
            type: 'Contacts',
            attributes: {
                first_name: contactData.firstName,
                last_name: contactData.lastName,
                email1: contactData.email,
                phone_work: contactData.phone,
                account_name: contactData.company,
                title: contactData.title,
                department: contactData.department,
                lead_source: contactData.source || 'Website',
                assigned_user_id: contactData.assignedTo,
                description: contactData.description
            }
        };

        const response = await this.makeRequest('POST', '/module/Contacts', { data: payload });
        
        logger.info('Contact created in SuiteCRM', {
            service: 'SuiteCRM',
            contactId: response.data?.id,
            email: contactData.email
        });

        return response.data;
    }

    /**
     * Actualizar contacto existente
     */
    async updateContact(id, updateData) {
        const payload = {
            type: 'Contacts',
            id: id,
            attributes: updateData
        };

        const response = await this.makeRequest('PATCH', `/module/Contacts/${id}`, { data: payload });
        
        logger.info('Contact updated in SuiteCRM', {
            service: 'SuiteCRM',
            contactId: id
        });

        return response.data;
    }

    /**
     * Eliminar contacto
     */
    async deleteContact(id) {
        await this.makeRequest('DELETE', `/module/Contacts/${id}`);
        
        logger.info('Contact deleted from SuiteCRM', {
            service: 'SuiteCRM',
            contactId: id
        });

        return true;
    }

    // ===== GESTIÓN DE LEADS =====

    /**
     * Obtener lista de leads
     */
    async getLeads(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 20,
            ...options.filters
        };

        const response = await this.makeRequest('GET', '/module/Leads', null, { params });
        
        return {
            data: response.data || [],
            meta: response.meta || {},
            pagination: {
                page: params.page,
                limit: params.limit,
                total: response.meta?.total || 0
            }
        };
    }

    /**
     * Crear nuevo lead
     */
    async createLead(leadData) {
        const payload = {
            type: 'Leads',
            attributes: {
                first_name: leadData.firstName,
                last_name: leadData.lastName,
                email1: leadData.email,
                phone_work: leadData.phone,
                account_name: leadData.company,
                title: leadData.title,
                status: leadData.status || 'New',
                lead_source: leadData.source || 'Website',
                industry: leadData.industry,
                assigned_user_id: leadData.assignedTo,
                description: leadData.description,
                salutation: leadData.salutation,
                website: leadData.website
            }
        };

        const response = await this.makeRequest('POST', '/module/Leads', { data: payload });
        
        logger.info('Lead created in SuiteCRM', {
            service: 'SuiteCRM',
            leadId: response.data?.id,
            email: leadData.email
        });

        return response.data;
    }

    /**
     * Convertir lead a contacto y oportunidad
     */
    async convertLead(leadId, conversionData = {}) {
        const payload = {
            type: 'Leads',
            id: leadId,
            attributes: {
                status: 'Converted',
                converted: '1'
            }
        };

        // Crear contacto asociado
        if (conversionData.createContact !== false) {
            const lead = await this.makeRequest('GET', `/module/Leads/${leadId}`);
            const contactData = {
                firstName: lead.data.attributes.first_name,
                lastName: lead.data.attributes.last_name,
                email: lead.data.attributes.email1,
                phone: lead.data.attributes.phone_work,
                company: lead.data.attributes.account_name,
                title: lead.data.attributes.title,
                source: 'Lead Conversion'
            };

            const contact = await this.createContact(contactData);
            payload.attributes.contact_id = contact.id;
        }

        // Crear oportunidad si se especifica
        if (conversionData.createOpportunity) {
            const opportunity = await this.createOpportunity({
                name: conversionData.opportunityName || `Opportunity from Lead ${leadId}`,
                amount: conversionData.amount || 0,
                closeDate: conversionData.closeDate,
                stage: conversionData.stage || 'Prospecting',
                assignedTo: conversionData.assignedTo
            });

            payload.attributes.opportunity_id = opportunity.id;
        }

        const response = await this.makeRequest('PATCH', `/module/Leads/${leadId}`, { data: payload });
        
        logger.info('Lead converted in SuiteCRM', {
            service: 'SuiteCRM',
            leadId: leadId,
            contactId: payload.attributes.contact_id,
            opportunityId: payload.attributes.opportunity_id
        });

        return response.data;
    }

    // ===== GESTIÓN DE OPORTUNIDADES =====

    /**
     * Obtener lista de oportunidades
     */
    async getOpportunities(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 20,
            ...options.filters
        };

        const response = await this.makeRequest('GET', '/module/Opportunities', null, { params });
        
        return {
            data: response.data || [],
            meta: response.meta || {},
            pagination: {
                page: params.page,
                limit: params.limit,
                total: response.meta?.total || 0
            }
        };
    }

    /**
     * Crear nueva oportunidad
     */
    async createOpportunity(opportunityData) {
        const payload = {
            type: 'Opportunities',
            attributes: {
                name: opportunityData.name,
                amount: opportunityData.amount || 0,
                date_closed: opportunityData.closeDate,
                sales_stage: opportunityData.stage || 'Prospecting',
                probability: opportunityData.probability || 10,
                lead_source: opportunityData.source || 'Website',
                assigned_user_id: opportunityData.assignedTo,
                description: opportunityData.description,
                account_id: opportunityData.accountId,
                contact_id: opportunityData.contactId
            }
        };

        const response = await this.makeRequest('POST', '/module/Opportunities', { data: payload });
        
        logger.info('Opportunity created in SuiteCRM', {
            service: 'SuiteCRM',
            opportunityId: response.data?.id,
            name: opportunityData.name,
            amount: opportunityData.amount
        });

        return response.data;
    }

    /**
     * Actualizar oportunidad
     */
    async updateOpportunity(id, updateData) {
        const payload = {
            type: 'Opportunities',
            id: id,
            attributes: updateData
        };

        const response = await this.makeRequest('PATCH', `/module/Opportunities/${id}`, { data: payload });
        
        logger.info('Opportunity updated in SuiteCRM', {
            service: 'SuiteCRM',
            opportunityId: id
        });

        return response.data;
    }

    // ===== ACTIVIDADES Y NOTAS =====

    /**
     * Crear actividad/tarea
     */
    async createActivity(activityData) {
        const payload = {
            type: 'Tasks',
            attributes: {
                name: activityData.subject,
                description: activityData.description,
                status: activityData.status || 'Not Started',
                priority: activityData.priority || 'Medium',
                date_due: activityData.dueDate,
                assigned_user_id: activityData.assignedTo,
                parent_type: activityData.parentType,
                parent_id: activityData.parentId
            }
        };

        const response = await this.makeRequest('POST', '/module/Tasks', { data: payload });
        
        logger.info('Activity created in SuiteCRM', {
            service: 'SuiteCRM',
            activityId: response.data?.id,
            subject: activityData.subject
        });

        return response.data;
    }

    /**
     * Crear nota
     */
    async createNote(noteData) {
        const payload = {
            type: 'Notes',
            attributes: {
                name: noteData.subject,
                description: noteData.description,
                parent_type: noteData.parentType,
                parent_id: noteData.parentId,
                assigned_user_id: noteData.assignedTo
            }
        };

        const response = await this.makeRequest('POST', '/module/Notes', { data: payload });
        
        logger.info('Note created in SuiteCRM', {
            service: 'SuiteCRM',
            noteId: response.data?.id,
            subject: noteData.subject
        });

        return response.data;
    }

    // ===== SINCRONIZACIÓN Y WEBHOOKS =====

    /**
     * Sincronización incremental
     */
    async incrementalSync(lastSyncTime) {
        const syncStartTime = Date.now();
        const results = {
            contacts: { created: 0, updated: 0, errors: 0 },
            leads: { created: 0, updated: 0, errors: 0 },
            opportunities: { created: 0, updated: 0, errors: 0 }
        };

        try {
            // Sincronizar cada tipo de entidad
            const entities = ['Contacts', 'Leads', 'Opportunities'];
            
            for (const entity of entities) {
                const params = {
                    filter: {
                        date_modified: { '$gte': lastSyncTime }
                    },
                    limit: 100
                };

                let page = 1;
                let hasMore = true;

                while (hasMore) {
                    params.page = page;
                    const response = await this.makeRequest('GET', `/module/${entity}`, null, { params });
                    
                    if (response.data && response.data.length > 0) {
                        // Procesar registros
                        for (const record of response.data) {
                            try {
                                await this.processSyncRecord(entity.toLowerCase(), record);
                                results[entity.toLowerCase()].updated++;
                            } catch (error) {
                                logger.error('Sync record processing error', {
                                    service: 'SuiteCRM',
                                    entity,
                                    recordId: record.id,
                                    error: error.message
                                });
                                results[entity.toLowerCase()].errors++;
                            }
                        }
                        page++;
                    } else {
                        hasMore = false;
                    }
                }
            }

            this.metrics.lastSync = new Date();
            this.metrics.totalSyncTime = Date.now() - syncStartTime;

            logger.info('Incremental sync completed', {
                service: 'SuiteCRM',
                results,
                duration: this.metrics.totalSyncTime
            });

            return results;
        } catch (error) {
            logger.error('Incremental sync failed', {
                service: 'SuiteCRM',
                error: error.message,
                duration: Date.now() - syncStartTime
            });
            throw error;
        }
    }

    /**
     * Procesar registro de sincronización
     */
    async processSyncRecord(entityType, record) {
        // Este método debería ser implementado según la lógica de negocio
        // para procesar cada registro sincronizado
        
        // Por ahora, solo log de los datos recibidos
        logger.debug('Processing sync record', {
            service: 'SuiteCRM',
            entityType,
            recordId: record.id,
            dateModified: record.attributes?.date_modified
        });
    }

    /**
     * Obtener métricas del sistema CRM
     */
    getMetrics() {
        return {
            ...this.metrics,
            isAuthenticated: !!this.accessToken,
            tokenExpiry: this.tokenExpiry ? new Date(this.tokenExpiry) : null,
            uptime: process.uptime()
        };
    }

    /**
     * Health check del sistema CRM
     */
    async healthCheck() {
        try {
            await this.ensureAuthenticated();
            
            // Test básico de conectividad
            const testResponse = await this.makeRequest('GET', '/module/Contacts', null, {
                params: { limit: 1 }
            });

            return {
                status: 'healthy',
                authenticated: true,
                responseTime: this.metrics.avgResponseTime,
                lastSync: this.metrics.lastSync,
                uptime: process.uptime()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                authenticated: false,
                uptime: process.uptime()
            };
        }
    }

    /**
     * Cerrar conexiones
     */
    async disconnect() {
        if (this.redis) {
            await this.redis.quit();
        }
    }
}

module.exports = SuiteCRMClient;