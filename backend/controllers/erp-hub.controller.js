/**
 * ERP Hub Controller
 * 
 * Controlador principal para gestión de integraciones ERP.
 * Maneja OAuth, configuración, sincronización y monitoreo.
 * 
 * @module controllers/erp-hub
 * @author Spirit Tours Dev Team - GenSpark AI Developer
 * @version 1.0.0
 */

const { Pool } = require('pg');
const AdapterFactory = require('../services/erp-hub/adapter-factory');
const SyncOrchestrator = require('../services/erp-hub/sync/sync-orchestrator');
const OAuthManager = require('../services/erp-hub/oauth/oauth-manager');
const ExchangeRatesService = require('../services/exchange-rates.service');

class ERPHubController {
    constructor(dbPool) {
        this.db = dbPool || new Pool({
            connectionString: process.env.DATABASE_URL
        });

        this.syncOrchestrator = new SyncOrchestrator(this.db);
        this.oauthManager = new OAuthManager(this.db);
        this.exchangeRatesService = new ExchangeRatesService(this.db);
    }

    // ============================================================================
    // OAUTH ENDPOINTS
    // ============================================================================

    /**
     * Inicia el flujo OAuth 2.0
     * POST /api/erp/oauth/authorize
     */
    async initiateOAuth(req, res) {
        try {
            const { sucursalId, provider, redirectUri } = req.body;

            if (!sucursalId || !provider) {
                return res.status(400).json({
                    success: false,
                    error: 'sucursalId and provider are required'
                });
            }

            // Obtener credenciales del proveedor
            const credentials = {
                clientId: process.env[`${provider.toUpperCase()}_CLIENT_ID`],
                clientSecret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`]
            };

            if (!credentials.clientId || !credentials.clientSecret) {
                return res.status(400).json({
                    success: false,
                    error: `OAuth credentials not configured for ${provider}`
                });
            }

            // Generar URL de autorización
            const authData = this.oauthManager.generateAuthorizationUrl(
                provider,
                sucursalId,
                credentials,
                redirectUri || process.env.OAUTH_REDIRECT_URI
            );

            res.json({
                success: true,
                authorizationUrl: authData.authorizationUrl,
                state: authData.state,
                expiresAt: authData.expiresAt
            });
        } catch (error) {
            console.error('OAuth initiation failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Callback OAuth 2.0 - Intercambia código por tokens
     * GET /api/erp/oauth/callback
     */
    async handleOAuthCallback(req, res) {
        try {
            const { code, state, realmId } = req.query;

            if (!code || !state) {
                return res.status(400).json({
                    success: false,
                    error: 'code and state are required'
                });
            }

            // Validar estado y obtener datos
            const stateData = this.oauthManager.stateStore.get(state);
            if (!stateData) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid or expired OAuth state'
                });
            }

            const { provider, sucursalId } = stateData;

            // Obtener credenciales
            const credentials = {
                clientId: process.env[`${provider.toUpperCase()}_CLIENT_ID`],
                clientSecret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`]
            };

            // Intercambiar código por tokens
            const result = await this.oauthManager.exchangeCodeForTokens(
                provider,
                code,
                state,
                credentials,
                process.env.OAUTH_REDIRECT_URI
            );

            // Actualizar sucursal con realm_id si aplica (QuickBooks)
            if (realmId) {
                await this.db.query(
                    'UPDATE sucursales SET erp_realm_id = $1, erp_company_id = $1 WHERE id = $2',
                    [realmId, sucursalId]
                );
            }

            res.json({
                success: true,
                message: 'OAuth authentication successful',
                sucursalId: result.sucursalId
            });
        } catch (error) {
            console.error('OAuth callback failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Desconecta y revoca tokens OAuth
     * POST /api/erp/oauth/disconnect
     */
    async disconnectOAuth(req, res) {
        try {
            const { sucursalId } = req.body;

            if (!sucursalId) {
                return res.status(400).json({
                    success: false,
                    error: 'sucursalId is required'
                });
            }

            // Obtener configuración actual
            const config = await this._getERPConfig(sucursalId);
            if (!config) {
                return res.status(404).json({
                    success: false,
                    error: 'ERP configuration not found'
                });
            }

            // Revocar tokens
            await this.oauthManager.revokeTokens(sucursalId, config.erp_provider);

            res.json({
                success: true,
                message: 'OAuth tokens revoked successfully'
            });
        } catch (error) {
            console.error('OAuth disconnect failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ============================================================================
    // CONFIGURATION ENDPOINTS
    // ============================================================================

    /**
     * Obtiene configuración ERP de una sucursal
     * GET /api/erp/config/:sucursalId
     */
    async getERPConfig(req, res) {
        try {
            const { sucursalId } = req.params;

            const config = await this._getERPConfig(sucursalId);
            
            if (!config) {
                return res.status(404).json({
                    success: false,
                    error: 'ERP configuration not found'
                });
            }

            // No devolver tokens sensibles
            delete config.access_token;
            delete config.refresh_token;
            delete config.api_key;
            delete config.api_secret;

            res.json({
                success: true,
                config: config
            });
        } catch (error) {
            console.error('Get ERP config failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Guarda/actualiza configuración ERP
     * POST /api/erp/config/:sucursalId
     */
    async saveERPConfig(req, res) {
        try {
            const { sucursalId } = req.params;
            const {
                erpProvider,
                erpRegion,
                syncEnabled,
                syncFrequency,
                syncDirection,
                autoSyncInvoices,
                autoSyncPayments,
                autoSyncCustomers,
                accountMapping
            } = req.body;

            if (!erpProvider || !erpRegion) {
                return res.status(400).json({
                    success: false,
                    error: 'erpProvider and erpRegion are required'
                });
            }

            // Verificar si ya existe configuración
            const existingConfig = await this._getERPConfig(sucursalId);

            let query, params;
            if (existingConfig) {
                // Actualizar
                query = `
                    UPDATE configuracion_erp_sucursal
                    SET erp_provider = $2,
                        erp_region = $3,
                        sync_enabled = $4,
                        sync_frequency = $5,
                        sync_direction = $6,
                        auto_sync_invoices = $7,
                        auto_sync_payments = $8,
                        auto_sync_customers = $9,
                        cuenta_ventas_defecto = $10,
                        cuenta_cobros_defecto = $11,
                        cuenta_pagos_defecto = $12,
                        updated_at = NOW()
                    WHERE sucursal_id = $1
                    RETURNING *
                `;
                params = [
                    sucursalId,
                    erpProvider,
                    erpRegion,
                    syncEnabled !== undefined ? syncEnabled : false,
                    syncFrequency || 'manual',
                    syncDirection || 'bidirectional',
                    autoSyncInvoices !== undefined ? autoSyncInvoices : true,
                    autoSyncPayments !== undefined ? autoSyncPayments : true,
                    autoSyncCustomers !== undefined ? autoSyncCustomers : true,
                    accountMapping?.salesAccount || null,
                    accountMapping?.receivablesAccount || null,
                    accountMapping?.payablesAccount || null
                ];
            } else {
                // Crear
                query = `
                    INSERT INTO configuracion_erp_sucursal (
                        sucursal_id,
                        erp_provider,
                        erp_region,
                        sync_enabled,
                        sync_frequency,
                        sync_direction,
                        auto_sync_invoices,
                        auto_sync_payments,
                        auto_sync_customers,
                        cuenta_ventas_defecto,
                        cuenta_cobros_defecto,
                        cuenta_pagos_defecto
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING *
                `;
                params = [
                    sucursalId,
                    erpProvider,
                    erpRegion,
                    syncEnabled !== undefined ? syncEnabled : false,
                    syncFrequency || 'manual',
                    syncDirection || 'bidirectional',
                    autoSyncInvoices !== undefined ? autoSyncInvoices : true,
                    autoSyncPayments !== undefined ? autoSyncPayments : true,
                    autoSyncCustomers !== undefined ? autoSyncCustomers : true,
                    accountMapping?.salesAccount || null,
                    accountMapping?.receivablesAccount || null,
                    accountMapping?.payablesAccount || null
                ];
            }

            const result = await this.db.query(query, params);

            // Actualizar tabla sucursales también
            await this.db.query(
                `UPDATE sucursales 
                 SET erp_provider = $2, 
                     erp_region = $3, 
                     erp_enabled = $4,
                     updated_at = NOW()
                 WHERE id = $1`,
                [sucursalId, erpProvider, erpRegion, syncEnabled]
            );

            res.json({
                success: true,
                config: result.rows[0]
            });
        } catch (error) {
            console.error('Save ERP config failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ============================================================================
    // SYNC ENDPOINTS
    // ============================================================================

    /**
     * Sincroniza un cliente manualmente
     * POST /api/erp/sync/customer/:customerId
     */
    async syncCustomer(req, res) {
        try {
            const { customerId } = req.params;
            const { sucursalId } = req.body;

            if (!sucursalId) {
                return res.status(400).json({
                    success: false,
                    error: 'sucursalId is required'
                });
            }

            const result = await this.syncOrchestrator.syncCustomerToERP(
                sucursalId,
                customerId,
                {
                    triggeredBy: 'manual',
                    userId: req.user?.id
                }
            );

            res.json({
                success: true,
                result: result
            });
        } catch (error) {
            console.error('Customer sync failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Sincroniza una factura manualmente
     * POST /api/erp/sync/invoice/:cxcId
     */
    async syncInvoice(req, res) {
        try {
            const { cxcId } = req.params;
            const { sucursalId } = req.body;

            if (!sucursalId) {
                return res.status(400).json({
                    success: false,
                    error: 'sucursalId is required'
                });
            }

            const result = await this.syncOrchestrator.syncInvoiceToERP(
                sucursalId,
                cxcId,
                {
                    triggeredBy: 'manual',
                    userId: req.user?.id
                }
            );

            res.json({
                success: true,
                result: result
            });
        } catch (error) {
            console.error('Invoice sync failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Sincroniza un pago manualmente
     * POST /api/erp/sync/payment/:pagoId
     */
    async syncPayment(req, res) {
        try {
            const { pagoId } = req.params;
            const { sucursalId } = req.body;

            if (!sucursalId) {
                return res.status(400).json({
                    success: false,
                    error: 'sucursalId is required'
                });
            }

            const result = await this.syncOrchestrator.syncPaymentToERP(
                sucursalId,
                pagoId,
                {
                    triggeredBy: 'manual',
                    userId: req.user?.id
                }
            );

            res.json({
                success: true,
                result: result
            });
        } catch (error) {
            console.error('Payment sync failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Sincroniza múltiples entidades en lote
     * POST /api/erp/sync/batch
     */
    async syncBatch(req, res) {
        try {
            const { sucursalId, entities } = req.body;

            if (!sucursalId || !entities || !Array.isArray(entities)) {
                return res.status(400).json({
                    success: false,
                    error: 'sucursalId and entities array are required'
                });
            }

            const result = await this.syncOrchestrator.syncBatch(
                sucursalId,
                entities,
                {
                    triggeredBy: 'manual',
                    userId: req.user?.id
                }
            );

            res.json({
                success: true,
                result: result
            });
        } catch (error) {
            console.error('Batch sync failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Sincroniza todas las entidades pendientes
     * POST /api/erp/sync/pending/:sucursalId
     */
    async syncPending(req, res) {
        try {
            const { sucursalId } = req.params;

            const result = await this.syncOrchestrator.syncPendingEntities(
                sucursalId,
                {
                    triggeredBy: 'manual',
                    userId: req.user?.id
                }
            );

            res.json({
                success: true,
                result: result
            });
        } catch (error) {
            console.error('Pending sync failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Obtiene el estado de sincronización
     * GET /api/erp/sync/status/:sucursalId
     */
    async getSyncStatus(req, res) {
        try {
            const { sucursalId } = req.params;

            // Obtener configuración
            const config = await this._getERPConfig(sucursalId);
            
            if (!config) {
                return res.status(404).json({
                    success: false,
                    error: 'ERP configuration not found'
                });
            }

            // Obtener estadísticas de sincronización
            const statsQuery = `
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'success') as successful_syncs,
                    COUNT(*) FILTER (WHERE status = 'error') as failed_syncs,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending_syncs,
                    MAX(completed_at) as last_sync_at
                FROM log_sincronizacion_erp
                WHERE sucursal_id = $1
                AND started_at > NOW() - INTERVAL '24 hours'
            `;

            const statsResult = await this.db.query(statsQuery, [sucursalId]);
            const stats = statsResult.rows[0];

            // Obtener entidades pendientes
            const pendingQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM customers c 
                     WHERE c.branch_id = $1 
                     AND NOT EXISTS (
                         SELECT 1 FROM mapeo_erp_entidades m 
                         WHERE m.spirit_entity_id = c.id 
                         AND m.spirit_entity_type = 'customer'
                     )) as pending_customers,
                    (SELECT COUNT(*) FROM cuentas_por_cobrar 
                     WHERE sucursal_id = $1 AND erp_synced = false) as pending_invoices,
                    (SELECT COUNT(*) FROM pagos_recibidos 
                     WHERE sucursal_id = $1 AND erp_synced = false) as pending_payments
            `;

            const pendingResult = await this.db.query(pendingQuery, [sucursalId]);
            const pending = pendingResult.rows[0];

            res.json({
                success: true,
                status: {
                    connected: config.is_connected,
                    syncEnabled: config.sync_enabled,
                    lastSync: stats.last_sync_at,
                    stats: {
                        successful: parseInt(stats.successful_syncs) || 0,
                        failed: parseInt(stats.failed_syncs) || 0,
                        pending: parseInt(stats.pending_syncs) || 0
                    },
                    pendingEntities: {
                        customers: parseInt(pending.pending_customers) || 0,
                        invoices: parseInt(pending.pending_invoices) || 0,
                        payments: parseInt(pending.pending_payments) || 0
                    }
                }
            });
        } catch (error) {
            console.error('Get sync status failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Obtiene logs de sincronización
     * GET /api/erp/sync/logs/:sucursalId
     */
    async getSyncLogs(req, res) {
        try {
            const { sucursalId } = req.params;
            const { limit = 50, offset = 0, status, entityType } = req.query;

            let query = `
                SELECT 
                    id,
                    tipo_sincronizacion,
                    direccion,
                    entidad_tipo,
                    entidad_id,
                    entidad_folio,
                    status,
                    started_at,
                    completed_at,
                    error_message,
                    erp_entity_id
                FROM log_sincronizacion_erp
                WHERE sucursal_id = $1
            `;

            const params = [sucursalId];
            let paramIndex = 2;

            if (status) {
                query += ` AND status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }

            if (entityType) {
                query += ` AND entidad_tipo = $${paramIndex}`;
                params.push(entityType);
                paramIndex++;
            }

            query += ` ORDER BY started_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(parseInt(limit), parseInt(offset));

            const result = await this.db.query(query, params);

            res.json({
                success: true,
                logs: result.rows,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: result.rowCount
                }
            });
        } catch (error) {
            console.error('Get sync logs failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ============================================================================
    // PROVIDER & ADAPTER ENDPOINTS
    // ============================================================================

    /**
     * Lista proveedores ERP disponibles
     * GET /api/erp/providers
     */
    async getProviders(req, res) {
        try {
            const providers = AdapterFactory.getSupportedProviders();

            res.json({
                success: true,
                providers: providers
            });
        } catch (error) {
            console.error('Get providers failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Lista adapters disponibles por país
     * GET /api/erp/adapters/:countryCode
     */
    async getAdaptersByCountry(req, res) {
        try {
            const { countryCode } = req.params;

            const adapters = AdapterFactory.getAvailableAdapters(countryCode.toUpperCase());

            if (!adapters || adapters.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: `No adapters available for country ${countryCode}`
                });
            }

            res.json({
                success: true,
                country: countryCode.toUpperCase(),
                adapters: adapters
            });
        } catch (error) {
            console.error('Get adapters by country failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Prueba conexión con ERP
     * POST /api/erp/test-connection/:sucursalId
     */
    async testConnection(req, res) {
        try {
            const { sucursalId } = req.params;

            const config = await this._getERPConfig(sucursalId);
            
            if (!config) {
                return res.status(404).json({
                    success: false,
                    error: 'ERP configuration not found'
                });
            }

            // Crear adapter
            const adapter = AdapterFactory.create(config);
            await adapter.authenticate();

            // Probar conexión
            const isConnected = await adapter.testConnection();

            // Actualizar estado en DB
            await this.db.query(
                `UPDATE configuracion_erp_sucursal 
                 SET is_connected = $2, 
                     connection_status = $3,
                     last_test_connection = NOW()
                 WHERE sucursal_id = $1`,
                [sucursalId, isConnected, isConnected ? 'connected' : 'error']
            );

            res.json({
                success: true,
                connected: isConnected
            });
        } catch (error) {
            console.error('Test connection failed:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                connected: false
            });
        }
    }

    // ============================================================================
    // EXCHANGE RATES ENDPOINTS
    // ============================================================================

    /**
     * Obtiene tipo de cambio actual
     * GET /api/erp/exchange-rate/:from/:to
     */
    async getExchangeRate(req, res) {
        try {
            const { from, to } = req.params;
            const { date } = req.query;

            const rate = await this.exchangeRatesService.getExchangeRate(
                from.toUpperCase(),
                to.toUpperCase(),
                date ? new Date(date) : new Date()
            );

            res.json({
                success: true,
                from: from.toUpperCase(),
                to: to.toUpperCase(),
                rate: rate,
                date: date || new Date().toISOString().split('T')[0]
            });
        } catch (error) {
            console.error('Get exchange rate failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Convierte monto entre monedas
     * POST /api/erp/convert-currency
     */
    async convertCurrency(req, res) {
        try {
            const { amount, from, to, date } = req.body;

            if (!amount || !from || !to) {
                return res.status(400).json({
                    success: false,
                    error: 'amount, from, and to are required'
                });
            }

            const result = await this.exchangeRatesService.convertCurrency(
                parseFloat(amount),
                from.toUpperCase(),
                to.toUpperCase(),
                date ? new Date(date) : new Date()
            );

            res.json({
                success: true,
                conversion: result
            });
        } catch (error) {
            console.error('Convert currency failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Actualiza tipos de cambio desde API externa
     * POST /api/erp/exchange-rates/update
     */
    async updateExchangeRates(req, res) {
        try {
            const result = await this.exchangeRatesService.updateExchangeRates();

            res.json({
                success: true,
                result: result
            });
        } catch (error) {
            console.error('Update exchange rates failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    async _getERPConfig(sucursalId) {
        const query = `
            SELECT ce.*, s.erp_provider, s.erp_region, s.moneda_principal as currency
            FROM configuracion_erp_sucursal ce
            JOIN sucursales s ON ce.sucursal_id = s.id
            WHERE ce.sucursal_id = $1
        `;
        
        const result = await this.db.query(query, [sucursalId]);
        return result.rows[0];
    }
}

module.exports = ERPHubController;
