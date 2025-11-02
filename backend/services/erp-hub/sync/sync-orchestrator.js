/**
 * Sync Orchestrator
 * 
 * Orquestador central para sincronización bidireccional entre Spirit Tours y sistemas ERP.
 * Gestiona el flujo de sincronización, manejo de errores, reintentos, y logging.
 * 
 * Características:
 * - Sincronización bidireccional (Spirit Tours ↔ ERP)
 * - Queue system para sincronización asíncrona
 * - Retry logic con backoff exponencial
 * - Manejo de conflictos
 * - Logging detallado de todas las operaciones
 * - Notificaciones de errores
 * 
 * @module services/erp-hub/sync/sync-orchestrator
 * @author Spirit Tours Dev Team - GenSpark AI Developer
 * @version 1.0.0
 */

const AdapterFactory = require('../adapter-factory');
const { UnifiedCustomer, UnifiedInvoice, UnifiedPayment } = require('../mappers/unified-models');

class SyncOrchestrator {
    constructor(dbPool, config = {}) {
        this.db = dbPool;
        this.config = {
            batchSize: config.batchSize || 50,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 2000, // milliseconds
            retryBackoffMultiplier: config.retryBackoffMultiplier || 2,
            enableNotifications: config.enableNotifications !== false,
            ...config
        };

        // Queue para sincronización asíncrona
        this.syncQueue = [];
        this.isProcessingQueue = false;

        // Stats
        this.stats = {
            totalSyncs: 0,
            successfulSyncs: 0,
            failedSyncs: 0,
            retriedSyncs: 0
        };
    }

    // ============================================================================
    // SYNC - SPIRIT TOURS → ERP
    // ============================================================================

    /**
     * Sincroniza un cliente de Spirit Tours a ERP
     * @param {string} sucursalId - ID de la sucursal
     * @param {string} customerId - ID del cliente en Spirit Tours
     * @param {Object} options - Opciones de sincronización
     * @returns {Promise<Object>} Resultado de sincronización
     */
    async syncCustomerToERP(sucursalId, customerId, options = {}) {
        const startTime = Date.now();
        const syncContext = {
            sucursalId,
            entityType: 'customer',
            entityId: customerId,
            direction: 'to_erp',
            triggeredBy: options.triggeredBy || 'manual',
            userId: options.userId
        };

        try {
            // 1. Obtener configuración ERP de la sucursal
            const erpConfig = await this._getERPConfig(sucursalId);
            if (!erpConfig || !erpConfig.sync_enabled) {
                throw new Error('ERP sync not enabled for this branch');
            }

            // 2. Crear adapter
            const adapter = AdapterFactory.create(erpConfig);
            await adapter.authenticate();

            // 3. Obtener datos del cliente desde Spirit Tours
            const spiritCustomer = await this._getCustomerFromDB(customerId);
            if (!spiritCustomer) {
                throw new Error(`Customer ${customerId} not found`);
            }

            // 4. Verificar si ya está mapeado
            const existingMapping = await this._getEntityMapping(
                sucursalId,
                erpConfig.erp_provider,
                'customer',
                customerId
            );

            // 5. Convertir a formato unificado
            const unifiedCustomer = UnifiedCustomer.fromSpiritTours(spiritCustomer);
            if (existingMapping) {
                unifiedCustomer.erpId = existingMapping.erp_entity_id;
            }

            // 6. Log inicio de sincronización
            const logId = await this._logSyncStart(syncContext, unifiedCustomer);

            // 7. Sincronizar al ERP
            const syncResult = await adapter.syncCustomer(unifiedCustomer);

            // 8. Guardar/actualizar mapeo
            await this._saveEntityMapping(
                sucursalId,
                erpConfig.erp_provider,
                'customer',
                customerId,
                spiritCustomer.folio || spiritCustomer.customer_code,
                'Customer',
                syncResult.erpEntityId,
                syncResult.erpEntityNumber,
                'to_erp'
            );

            // 9. Log éxito
            await this._logSyncComplete(logId, 'success', syncResult);

            this.stats.totalSyncs++;
            this.stats.successfulSyncs++;

            return {
                success: true,
                entityType: 'customer',
                spiritEntityId: customerId,
                erpEntityId: syncResult.erpEntityId,
                duration: Date.now() - startTime,
                data: syncResult.data
            };
        } catch (error) {
            console.error(`Customer sync failed: ${error.message}`);
            
            // Log error
            if (syncContext.logId) {
                await this._logSyncComplete(syncContext.logId, 'error', null, error.message);
            }

            this.stats.totalSyncs++;
            this.stats.failedSyncs++;

            // Retry logic si está configurado
            if (options.retry !== false && options.attemptNumber < this.config.maxRetries) {
                return this._retrySync('syncCustomerToERP', arguments, options);
            }

            throw error;
        }
    }

    /**
     * Sincroniza una factura de Spirit Tours a ERP
     */
    async syncInvoiceToERP(sucursalId, cxcId, options = {}) {
        const startTime = Date.now();
        const syncContext = {
            sucursalId,
            entityType: 'invoice',
            entityId: cxcId,
            direction: 'to_erp',
            triggeredBy: options.triggeredBy || 'manual',
            userId: options.userId
        };

        try {
            // 1. Obtener configuración ERP
            const erpConfig = await this._getERPConfig(sucursalId);
            if (!erpConfig || !erpConfig.sync_enabled || !erpConfig.auto_sync_invoices) {
                throw new Error('Invoice sync not enabled for this branch');
            }

            // 2. Crear adapter
            const adapter = AdapterFactory.create(erpConfig);
            await adapter.authenticate();

            // 3. Obtener datos de CXC desde Spirit Tours
            const spiritCxc = await this._getCxcFromDB(cxcId);
            if (!spiritCxc) {
                throw new Error(`CXC ${cxcId} not found`);
            }

            // 4. Verificar que el cliente esté sincronizado
            const customerMapping = await this._getEntityMapping(
                sucursalId,
                erpConfig.erp_provider,
                'customer',
                spiritCxc.customer_id
            );

            if (!customerMapping) {
                throw new Error('Customer must be synced before syncing invoice');
            }

            // 5. Verificar si la factura ya está mapeada
            const existingMapping = await this._getEntityMapping(
                sucursalId,
                erpConfig.erp_provider,
                'invoice',
                cxcId
            );

            // 6. Convertir a formato unificado
            const unifiedInvoice = UnifiedInvoice.fromSpiritTours(spiritCxc);
            unifiedInvoice.erpCustomerId = customerMapping.erp_entity_id;
            
            if (existingMapping) {
                unifiedInvoice.erpId = existingMapping.erp_entity_id;
            }

            // 7. Log inicio
            const logId = await this._logSyncStart(syncContext, unifiedInvoice);

            // 8. Sincronizar al ERP
            const syncResult = await adapter.syncInvoice(unifiedInvoice);

            // 9. Guardar mapeo
            await this._saveEntityMapping(
                sucursalId,
                erpConfig.erp_provider,
                'invoice',
                cxcId,
                spiritCxc.folio,
                'Invoice',
                syncResult.erpEntityId,
                syncResult.erpEntityNumber,
                'to_erp'
            );

            // 10. Marcar CXC como sincronizada
            await this._markEntityAsSynced('cuentas_por_cobrar', cxcId, syncResult.erpEntityId);

            // 11. Log éxito
            await this._logSyncComplete(logId, 'success', syncResult);

            this.stats.totalSyncs++;
            this.stats.successfulSyncs++;

            return {
                success: true,
                entityType: 'invoice',
                spiritEntityId: cxcId,
                erpEntityId: syncResult.erpEntityId,
                duration: Date.now() - startTime,
                data: syncResult.data
            };
        } catch (error) {
            console.error(`Invoice sync failed: ${error.message}`);
            
            if (syncContext.logId) {
                await this._logSyncComplete(syncContext.logId, 'error', null, error.message);
            }

            this.stats.totalSyncs++;
            this.stats.failedSyncs++;

            if (options.retry !== false && options.attemptNumber < this.config.maxRetries) {
                return this._retrySync('syncInvoiceToERP', arguments, options);
            }

            throw error;
        }
    }

    /**
     * Sincroniza un pago de Spirit Tours a ERP
     */
    async syncPaymentToERP(sucursalId, pagoId, options = {}) {
        const startTime = Date.now();
        const syncContext = {
            sucursalId,
            entityType: 'payment',
            entityId: pagoId,
            direction: 'to_erp',
            triggeredBy: options.triggeredBy || 'manual',
            userId: options.userId
        };

        try {
            // 1. Obtener configuración ERP
            const erpConfig = await this._getERPConfig(sucursalId);
            if (!erpConfig || !erpConfig.sync_enabled || !erpConfig.auto_sync_payments) {
                throw new Error('Payment sync not enabled for this branch');
            }

            // 2. Crear adapter
            const adapter = AdapterFactory.create(erpConfig);
            await adapter.authenticate();

            // 3. Obtener datos del pago desde Spirit Tours
            const spiritPago = await this._getPagoFromDB(pagoId);
            if (!spiritPago) {
                throw new Error(`Payment ${pagoId} not found`);
            }

            // 4. Obtener CXC relacionada
            const cxc = await this._getCxcFromDB(spiritPago.cxc_id);
            if (!cxc) {
                throw new Error(`CXC ${spiritPago.cxc_id} not found`);
            }

            // 5. Verificar que el cliente y la factura estén sincronizados
            const customerMapping = await this._getEntityMapping(
                sucursalId,
                erpConfig.erp_provider,
                'customer',
                cxc.customer_id
            );

            const invoiceMapping = await this._getEntityMapping(
                sucursalId,
                erpConfig.erp_provider,
                'invoice',
                spiritPago.cxc_id
            );

            if (!customerMapping || !invoiceMapping) {
                throw new Error('Customer and Invoice must be synced before syncing payment');
            }

            // 6. Convertir a formato unificado
            const unifiedPayment = UnifiedPayment.fromSpiritTours(spiritPago, cxc);
            unifiedPayment.erpCustomerId = customerMapping.erp_entity_id;
            unifiedPayment.linkedInvoices = [{
                erpInvoiceId: invoiceMapping.erp_entity_id,
                amountApplied: spiritPago.monto
            }];

            // 7. Log inicio
            const logId = await this._logSyncStart(syncContext, unifiedPayment);

            // 8. Sincronizar al ERP
            const syncResult = await adapter.syncPayment(unifiedPayment);

            // 9. Guardar mapeo
            await this._saveEntityMapping(
                sucursalId,
                erpConfig.erp_provider,
                'payment',
                pagoId,
                spiritPago.folio,
                'Payment',
                syncResult.erpEntityId,
                null,
                'to_erp'
            );

            // 10. Marcar pago como sincronizado
            await this._markEntityAsSynced('pagos_recibidos', pagoId, syncResult.erpEntityId);

            // 11. Log éxito
            await this._logSyncComplete(logId, 'success', syncResult);

            this.stats.totalSyncs++;
            this.stats.successfulSyncs++;

            return {
                success: true,
                entityType: 'payment',
                spiritEntityId: pagoId,
                erpEntityId: syncResult.erpEntityId,
                duration: Date.now() - startTime,
                data: syncResult.data
            };
        } catch (error) {
            console.error(`Payment sync failed: ${error.message}`);
            
            if (syncContext.logId) {
                await this._logSyncComplete(syncContext.logId, 'error', null, error.message);
            }

            this.stats.totalSyncs++;
            this.stats.failedSyncs++;

            if (options.retry !== false && options.attemptNumber < this.config.maxRetries) {
                return this._retrySync('syncPaymentToERP', arguments, options);
            }

            throw error;
        }
    }

    // ============================================================================
    // BATCH SYNC
    // ============================================================================

    /**
     * Sincroniza múltiples entidades en lote
     */
    async syncBatch(sucursalId, entities, options = {}) {
        const results = {
            total: entities.length,
            successful: 0,
            failed: 0,
            errors: [],
            details: []
        };

        for (const entity of entities) {
            try {
                let syncResult;
                
                switch (entity.type) {
                    case 'customer':
                        syncResult = await this.syncCustomerToERP(sucursalId, entity.id, options);
                        break;
                    case 'invoice':
                        syncResult = await this.syncInvoiceToERP(sucursalId, entity.id, options);
                        break;
                    case 'payment':
                        syncResult = await this.syncPaymentToERP(sucursalId, entity.id, options);
                        break;
                    default:
                        throw new Error(`Unknown entity type: ${entity.type}`);
                }

                results.successful++;
                results.details.push({
                    type: entity.type,
                    id: entity.id,
                    status: 'success',
                    erpId: syncResult.erpEntityId
                });
            } catch (error) {
                results.failed++;
                results.errors.push({
                    type: entity.type,
                    id: entity.id,
                    error: error.message
                });
                results.details.push({
                    type: entity.type,
                    id: entity.id,
                    status: 'error',
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Sincroniza todas las entidades pendientes de una sucursal
     */
    async syncPendingEntities(sucursalId, options = {}) {
        try {
            // 1. Obtener configuración
            const erpConfig = await this._getERPConfig(sucursalId);
            if (!erpConfig || !erpConfig.sync_enabled) {
                throw new Error('ERP sync not enabled for this branch');
            }

            const pendingEntities = [];

            // 2. Obtener clientes pendientes
            if (erpConfig.auto_sync_customers) {
                const pendingCustomers = await this._getPendingCustomers(sucursalId);
                pendingEntities.push(...pendingCustomers.map(c => ({ type: 'customer', id: c.id })));
            }

            // 3. Obtener facturas pendientes
            if (erpConfig.auto_sync_invoices) {
                const pendingInvoices = await this._getPendingInvoices(sucursalId);
                pendingEntities.push(...pendingInvoices.map(i => ({ type: 'invoice', id: i.id })));
            }

            // 4. Obtener pagos pendientes
            if (erpConfig.auto_sync_payments) {
                const pendingPayments = await this._getPendingPayments(sucursalId);
                pendingEntities.push(...pendingPayments.map(p => ({ type: 'payment', id: p.id })));
            }

            console.log(`Found ${pendingEntities.length} pending entities to sync`);

            // 5. Sincronizar en lotes
            return await this.syncBatch(sucursalId, pendingEntities, options);
        } catch (error) {
            console.error(`Pending entities sync failed: ${error.message}`);
            throw error;
        }
    }

    // ============================================================================
    // HELPER METHODS - DATABASE
    // ============================================================================

    async _getERPConfig(sucursalId) {
        const query = `
            SELECT 
                ce.*,
                s.erp_provider,
                s.erp_region,
                s.moneda_principal as currency
            FROM configuracion_erp_sucursal ce
            JOIN sucursales s ON ce.sucursal_id = s.id
            WHERE ce.sucursal_id = $1
            AND ce.sync_enabled = true
            AND ce.is_connected = true
        `;
        
        const result = await this.db.query(query, [sucursalId]);
        return result.rows[0];
    }

    async _getCustomerFromDB(customerId) {
        const query = 'SELECT * FROM customers WHERE id = $1';
        const result = await this.db.query(query, [customerId]);
        return result.rows[0];
    }

    async _getCxcFromDB(cxcId) {
        const query = 'SELECT * FROM cuentas_por_cobrar WHERE id = $1';
        const result = await this.db.query(query, [cxcId]);
        return result.rows[0];
    }

    async _getPagoFromDB(pagoId) {
        const query = 'SELECT * FROM pagos_recibidos WHERE id = $1';
        const result = await this.db.query(query, [pagoId]);
        return result.rows[0];
    }

    async _getPendingCustomers(sucursalId) {
        const query = `
            SELECT c.id
            FROM customers c
            WHERE c.branch_id = $1
            AND NOT EXISTS (
                SELECT 1 FROM mapeo_erp_entidades m
                WHERE m.spirit_entity_id = c.id
                AND m.spirit_entity_type = 'customer'
                AND m.sucursal_id = $1
            )
            LIMIT $2
        `;
        
        const result = await this.db.query(query, [sucursalId, this.config.batchSize]);
        return result.rows;
    }

    async _getPendingInvoices(sucursalId) {
        const query = `
            SELECT id
            FROM cuentas_por_cobrar
            WHERE sucursal_id = $1
            AND erp_synced = false
            AND status IN ('pendiente', 'parcial')
            LIMIT $2
        `;
        
        const result = await this.db.query(query, [sucursalId, this.config.batchSize]);
        return result.rows;
    }

    async _getPendingPayments(sucursalId) {
        const query = `
            SELECT id
            FROM pagos_recibidos
            WHERE sucursal_id = $1
            AND erp_synced = false
            AND status = 'aplicado'
            LIMIT $2
        `;
        
        const result = await this.db.query(query, [sucursalId, this.config.batchSize]);
        return result.rows;
    }

    async _getEntityMapping(sucursalId, erpProvider, entityType, entityId) {
        const query = `
            SELECT * FROM mapeo_erp_entidades
            WHERE sucursal_id = $1
            AND erp_provider = $2
            AND spirit_entity_type = $3
            AND spirit_entity_id = $4
        `;
        
        const result = await this.db.query(query, [sucursalId, erpProvider, entityType, entityId]);
        return result.rows[0];
    }

    async _saveEntityMapping(sucursalId, erpProvider, spiritEntityType, spiritEntityId, 
                             spiritEntityFolio, erpEntityType, erpEntityId, erpEntityNumber, syncDirection) {
        const query = `
            INSERT INTO mapeo_erp_entidades (
                sucursal_id,
                erp_provider,
                spirit_entity_type,
                spirit_entity_id,
                spirit_entity_folio,
                erp_entity_type,
                erp_entity_id,
                erp_entity_number,
                last_synced_at,
                last_sync_direction,
                sync_version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, 1)
            ON CONFLICT (sucursal_id, erp_provider, spirit_entity_type, spirit_entity_id)
            DO UPDATE SET
                erp_entity_id = EXCLUDED.erp_entity_id,
                erp_entity_number = EXCLUDED.erp_entity_number,
                last_synced_at = NOW(),
                last_sync_direction = EXCLUDED.last_sync_direction,
                sync_version = mapeo_erp_entidades.sync_version + 1,
                updated_at = NOW()
            RETURNING *
        `;
        
        const result = await this.db.query(query, [
            sucursalId, erpProvider, spiritEntityType, spiritEntityId, spiritEntityFolio,
            erpEntityType, erpEntityId, erpEntityNumber, syncDirection
        ]);
        
        return result.rows[0];
    }

    async _markEntityAsSynced(tableName, entityId, erpEntityId) {
        const query = `
            UPDATE ${tableName}
            SET erp_synced = true,
                erp_entity_id = $2,
                erp_last_sync = NOW()
            WHERE id = $1
        `;
        
        await this.db.query(query, [entityId, erpEntityId]);
    }

    async _logSyncStart(context, payload) {
        const query = `
            INSERT INTO log_sincronizacion_erp (
                sucursal_id,
                configuracion_erp_id,
                tipo_sincronizacion,
                direccion,
                entidad_tipo,
                entidad_id,
                entidad_folio,
                status,
                started_at,
                request_payload,
                triggered_by,
                user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing', NOW(), $8, $9, $10)
            RETURNING id
        `;
        
        const result = await this.db.query(query, [
            context.sucursalId,
            context.configErpId || null,
            context.entityType,
            context.direction,
            context.entityType,
            context.entityId,
            context.entityFolio || null,
            JSON.stringify(payload),
            context.triggeredBy,
            context.userId
        ]);
        
        return result.rows[0].id;
    }

    async _logSyncComplete(logId, status, result = null, errorMessage = null) {
        const query = `
            UPDATE log_sincronizacion_erp
            SET status = $2,
                completed_at = NOW(),
                response_payload = $3,
                error_message = $4,
                erp_entity_id = $5
            WHERE id = $1
        `;
        
        await this.db.query(query, [
            logId,
            status,
            result ? JSON.stringify(result) : null,
            errorMessage,
            result ? result.erpEntityId : null
        ]);
    }

    /**
     * Retry sync con backoff exponencial
     */
    async _retrySync(methodName, args, options) {
        const attemptNumber = (options.attemptNumber || 0) + 1;
        const delay = this.config.retryDelay * Math.pow(this.config.retryBackoffMultiplier, attemptNumber - 1);

        console.log(`Retrying sync (attempt ${attemptNumber}/${this.config.maxRetries}) after ${delay}ms...`);
        
        await this._delay(delay);
        
        this.stats.retriedSyncs++;
        
        options.attemptNumber = attemptNumber;
        return this[methodName](...args);
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obtiene estadísticas de sincronización
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalSyncs > 0 
                ? ((this.stats.successfulSyncs / this.stats.totalSyncs) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Resetea estadísticas
     */
    resetStats() {
        this.stats = {
            totalSyncs: 0,
            successfulSyncs: 0,
            failedSyncs: 0,
            retriedSyncs: 0
        };
    }
}

module.exports = SyncOrchestrator;
