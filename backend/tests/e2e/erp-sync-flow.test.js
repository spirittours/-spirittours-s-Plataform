/**
 * End-to-End ERP Sync Flow Tests
 * 
 * Suite de testing E2E completa que simula el flujo completo:
 * Spirit Tours → ERP Hub → QuickBooks → Verification
 * 
 * @module tests/e2e/erp-sync-flow
 * @author Spirit Tours Dev Team - GenSpark AI Developer
 * @version 1.0.0
 */

const { Pool } = require('pg');
const SyncOrchestrator = require('../../services/erp-hub/sync/sync-orchestrator');
const ExchangeRatesService = require('../../services/exchange-rates.service');
const TaxCalculatorService = require('../../services/tax-calculator.service');

describe('E2E: Complete ERP Sync Flow', () => {
    let dbPool;
    let syncOrchestrator;
    let exchangeRatesService;
    let taxCalculatorService;
    let testSucursalId;
    let testCustomerId;
    let testCxcId;
    let testPagoId;

    // ============================================================================
    // SETUP
    // ============================================================================

    beforeAll(async () => {
        // Conexión a base de datos de testing
        dbPool = new Pool({
            connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
        });

        syncOrchestrator = new SyncOrchestrator(dbPool);
        exchangeRatesService = new ExchangeRatesService(dbPool);
        taxCalculatorService = new TaxCalculatorService(dbPool);

        // Crear sucursal de prueba
        testSucursalId = await createTestSucursal();
        
        // Configurar ERP para sucursal
        await setupERPConfig(testSucursalId);
    });

    afterAll(async () => {
        // Cleanup
        await cleanupTestData();
        await dbPool.end();
    });

    // ============================================================================
    // E2E FLOW: CUSTOMER → INVOICE → PAYMENT
    // ============================================================================

    describe('Complete Sync Flow: Customer → Invoice → Payment', () => {
        test('Step 1: Create customer in Spirit Tours', async () => {
            const customerData = {
                name: `Test Customer E2E ${Date.now()}`,
                first_name: 'John',
                last_name: 'Doe',
                email: `e2e.test.${Date.now()}@spirittours.com`,
                phone: '555-1234',
                branch_id: testSucursalId,
                created_at: new Date(),
                updated_at: new Date()
            };

            const result = await dbPool.query(
                `INSERT INTO customers (name, first_name, last_name, email, phone, branch_id, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id`,
                [customerData.name, customerData.first_name, customerData.last_name, 
                 customerData.email, customerData.phone, customerData.branch_id,
                 customerData.created_at, customerData.updated_at]
            );

            testCustomerId = result.rows[0].id;
            expect(testCustomerId).toBeTruthy();
            
            console.log('✅ Customer created in Spirit Tours:', testCustomerId);
        });

        test('Step 2: Sync customer to QuickBooks', async () => {
            const result = await syncOrchestrator.syncCustomerToERP(
                testSucursalId,
                testCustomerId,
                {
                    triggeredBy: 'e2e_test',
                    userId: 'test-user-id'
                }
            );

            expect(result.success).toBe(true);
            expect(result.erpEntityId).toBeTruthy();
            
            console.log('✅ Customer synced to QuickBooks:', result.erpEntityId);
        });

        test('Step 3: Calculate taxes for invoice', async () => {
            const taxResult = await taxCalculatorService.calculateTax({
                sucursalId: testSucursalId,
                countryCode: 'US',
                stateCode: 'FL',
                amount: 1000.00,
                serviceCategory: 'tours',
                includesTax: false
            });

            expect(taxResult.subtotal).toBe(1000.00);
            expect(taxResult.taxAmount).toBeGreaterThan(0);
            expect(taxResult.totalAmount).toBeGreaterThan(1000.00);
            
            console.log('✅ Taxes calculated:', taxResult);
        });

        test('Step 4: Create invoice (CXC) in Spirit Tours', async () => {
            const taxResult = await taxCalculatorService.calculateTax({
                sucursalId: testSucursalId,
                countryCode: 'US',
                stateCode: 'FL',
                amount: 1000.00,
                serviceCategory: 'tours',
                includesTax: false
            });

            const cxcData = {
                folio: `E2E-TEST-${Date.now()}`,
                customer_id: testCustomerId,
                sucursal_id: testSucursalId,
                monto_total: taxResult.totalAmount,
                monto_pagado: 0,
                monto_pendiente: taxResult.totalAmount,
                moneda: 'USD',
                fecha_emision: new Date(),
                fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: 'pendiente',
                concepto: 'E2E Test Tour - Miami Beach',
                created_at: new Date(),
                updated_at: new Date()
            };

            const result = await dbPool.query(
                `INSERT INTO cuentas_por_cobrar (
                    folio, customer_id, sucursal_id, monto_total, monto_pagado, 
                    monto_pendiente, moneda, fecha_emision, fecha_vencimiento, 
                    status, concepto, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id`,
                [cxcData.folio, cxcData.customer_id, cxcData.sucursal_id,
                 cxcData.monto_total, cxcData.monto_pagado, cxcData.monto_pendiente,
                 cxcData.moneda, cxcData.fecha_emision, cxcData.fecha_vencimiento,
                 cxcData.status, cxcData.concepto, cxcData.created_at, cxcData.updated_at]
            );

            testCxcId = result.rows[0].id;
            expect(testCxcId).toBeTruthy();
            
            console.log('✅ Invoice (CXC) created in Spirit Tours:', testCxcId);
        });

        test('Step 5: Sync invoice to QuickBooks', async () => {
            const result = await syncOrchestrator.syncInvoiceToERP(
                testSucursalId,
                testCxcId,
                {
                    triggeredBy: 'e2e_test',
                    userId: 'test-user-id'
                }
            );

            expect(result.success).toBe(true);
            expect(result.erpEntityId).toBeTruthy();
            
            console.log('✅ Invoice synced to QuickBooks:', result.erpEntityId);
        });

        test('Step 6: Create payment in Spirit Tours', async () => {
            // Obtener CXC para saber el monto
            const cxcResult = await dbPool.query(
                'SELECT monto_pendiente FROM cuentas_por_cobrar WHERE id = $1',
                [testCxcId]
            );
            const montoPendiente = cxcResult.rows[0].monto_pendiente;

            const pagoData = {
                folio: `PMT-E2E-${Date.now()}`,
                cxc_id: testCxcId,
                monto: montoPendiente,
                monto_recibido: montoPendiente,
                comision_bancaria: 0,
                moneda: 'USD',
                metodo_pago: 'transferencia',
                referencia: `REF-${Date.now()}`,
                fecha_pago: new Date(),
                fecha_registro: new Date(),
                status: 'aplicado',
                conciliado: false,
                sucursal_id: testSucursalId,
                created_at: new Date(),
                updated_at: new Date()
            };

            const result = await dbPool.query(
                `INSERT INTO pagos_recibidos (
                    folio, cxc_id, monto, monto_recibido, comision_bancaria,
                    moneda, metodo_pago, referencia, fecha_pago, fecha_registro,
                    status, conciliado, sucursal_id, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING id`,
                [pagoData.folio, pagoData.cxc_id, pagoData.monto, pagoData.monto_recibido,
                 pagoData.comision_bancaria, pagoData.moneda, pagoData.metodo_pago,
                 pagoData.referencia, pagoData.fecha_pago, pagoData.fecha_registro,
                 pagoData.status, pagoData.conciliado, pagoData.sucursal_id,
                 pagoData.created_at, pagoData.updated_at]
            );

            testPagoId = result.rows[0].id;
            expect(testPagoId).toBeTruthy();

            // Actualizar CXC como pagada
            await dbPool.query(
                `UPDATE cuentas_por_cobrar 
                 SET monto_pagado = monto_total,
                     monto_pendiente = 0,
                     status = 'cobrado',
                     fecha_cobro_total = NOW()
                 WHERE id = $1`,
                [testCxcId]
            );
            
            console.log('✅ Payment created in Spirit Tours:', testPagoId);
        });

        test('Step 7: Sync payment to QuickBooks', async () => {
            const result = await syncOrchestrator.syncPaymentToERP(
                testSucursalId,
                testPagoId,
                {
                    triggeredBy: 'e2e_test',
                    userId: 'test-user-id'
                }
            );

            expect(result.success).toBe(true);
            expect(result.erpEntityId).toBeTruthy();
            
            console.log('✅ Payment synced to QuickBooks:', result.erpEntityId);
        });

        test('Step 8: Verify all entities are synced', async () => {
            // Verificar customer
            const customerMapping = await dbPool.query(
                `SELECT * FROM mapeo_erp_entidades 
                 WHERE spirit_entity_id = $1 AND spirit_entity_type = 'customer'`,
                [testCustomerId]
            );
            expect(customerMapping.rows.length).toBe(1);
            expect(customerMapping.rows[0].erp_entity_id).toBeTruthy();

            // Verificar invoice
            const invoiceMapping = await dbPool.query(
                `SELECT * FROM mapeo_erp_entidades 
                 WHERE spirit_entity_id = $1 AND spirit_entity_type = 'invoice'`,
                [testCxcId]
            );
            expect(invoiceMapping.rows.length).toBe(1);
            expect(invoiceMapping.rows[0].erp_entity_id).toBeTruthy();

            // Verificar payment
            const paymentMapping = await dbPool.query(
                `SELECT * FROM mapeo_erp_entidades 
                 WHERE spirit_entity_id = $1 AND spirit_entity_type = 'payment'`,
                [testPagoId]
            );
            expect(paymentMapping.rows.length).toBe(1);
            expect(paymentMapping.rows[0].erp_entity_id).toBeTruthy();

            console.log('✅ All entities verified in mapeo_erp_entidades');
        });

        test('Step 9: Verify sync logs', async () => {
            const logs = await dbPool.query(
                `SELECT * FROM log_sincronizacion_erp 
                 WHERE sucursal_id = $1
                 ORDER BY started_at DESC
                 LIMIT 10`,
                [testSucursalId]
            );

            expect(logs.rows.length).toBeGreaterThanOrEqual(3);
            
            // Verificar que todos fueron exitosos
            const successfulLogs = logs.rows.filter(log => log.status === 'success');
            expect(successfulLogs.length).toBeGreaterThanOrEqual(3);

            console.log('✅ Sync logs verified:', logs.rows.length);
        });
    });

    // ============================================================================
    // E2E FLOW: BATCH SYNC
    // ============================================================================

    describe('Batch Sync Flow', () => {
        test('should sync multiple entities in batch', async () => {
            // Crear múltiples customers
            const customerIds = [];
            for (let i = 0; i < 3; i++) {
                const result = await dbPool.query(
                    `INSERT INTO customers (name, email, branch_id, created_at, updated_at)
                     VALUES ($1, $2, $3, NOW(), NOW())
                     RETURNING id`,
                    [`Batch Customer ${i} ${Date.now()}`, 
                     `batch${i}.${Date.now()}@test.com`,
                     testSucursalId]
                );
                customerIds.push(result.rows[0].id);
            }

            // Preparar entidades para batch sync
            const entities = customerIds.map(id => ({
                type: 'customer',
                id: id
            }));

            // Ejecutar batch sync
            const result = await syncOrchestrator.syncBatch(
                testSucursalId,
                entities,
                {
                    triggeredBy: 'e2e_test',
                    userId: 'test-user-id'
                }
            );

            expect(result.total).toBe(3);
            expect(result.successful).toBe(3);
            expect(result.failed).toBe(0);

            console.log('✅ Batch sync completed:', result);
        });
    });

    // ============================================================================
    // E2E FLOW: EXCHANGE RATES
    // ============================================================================

    describe('Exchange Rates Flow', () => {
        test('should get exchange rate and convert currency', async () => {
            // Obtener tipo de cambio
            const rate = await exchangeRatesService.getExchangeRate('USD', 'MXN');
            expect(rate).toBeGreaterThan(0);

            // Convertir monto
            const conversion = await exchangeRatesService.convertCurrency(
                1000,
                'USD',
                'MXN'
            );

            expect(conversion.originalAmount).toBe(1000.00);
            expect(conversion.originalCurrency).toBe('USD');
            expect(conversion.convertedCurrency).toBe('MXN');
            expect(conversion.convertedAmount).toBeGreaterThan(1000);

            console.log('✅ Currency conversion:', conversion);
        });
    });

    // ============================================================================
    // E2E FLOW: ERROR RECOVERY
    // ============================================================================

    describe('Error Recovery Flow', () => {
        test('should handle sync error and retry', async () => {
            // Intentar sincronizar con datos inválidos
            // El orchestrator debería reintentar automáticamente

            const invalidCustomerId = '00000000-0000-0000-0000-000000000000';

            try {
                await syncOrchestrator.syncCustomerToERP(
                    testSucursalId,
                    invalidCustomerId,
                    {
                        triggeredBy: 'e2e_test',
                        retry: true,
                        maxRetries: 2
                    }
                );
            } catch (error) {
                expect(error).toBeDefined();
                console.log('✅ Error handled correctly:', error.message);
            }

            // Verificar que se logueó el error
            const errorLogs = await dbPool.query(
                `SELECT * FROM log_sincronizacion_erp 
                 WHERE status = 'error'
                 AND entidad_id = $1
                 ORDER BY started_at DESC
                 LIMIT 1`,
                [invalidCustomerId]
            );

            expect(errorLogs.rows.length).toBeGreaterThan(0);
        });
    });

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    async function createTestSucursal() {
        const result = await dbPool.query(
            `INSERT INTO sucursales (
                codigo, nombre, pais, pais_codigo, moneda_principal,
                zona_horaria, aplica_iva, tasa_iva, activa, es_matriz,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            ON CONFLICT (codigo) DO UPDATE SET updated_at = NOW()
            RETURNING id`,
            ['E2E-TEST', 'E2E Test Branch', 'USA', 'US', 'USD',
             'America/New_York', true, 6.00, true, false]
        );

        return result.rows[0].id;
    }

    async function setupERPConfig(sucursalId) {
        await dbPool.query(
            `INSERT INTO configuracion_erp_sucursal (
                sucursal_id, erp_provider, erp_region, sync_enabled,
                sync_frequency, sync_direction, auto_sync_invoices,
                auto_sync_payments, auto_sync_customers, is_connected,
                connection_status, access_token, refresh_token, realm_id,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
            ON CONFLICT (sucursal_id) DO UPDATE SET
                erp_provider = EXCLUDED.erp_provider,
                erp_region = EXCLUDED.erp_region,
                updated_at = NOW()`,
            [sucursalId, 'quickbooks', 'us', true, 'manual', 'bidirectional',
             true, true, true, true, 'connected',
             process.env.QB_SANDBOX_ACCESS_TOKEN,
             process.env.QB_SANDBOX_REFRESH_TOKEN,
             process.env.QB_SANDBOX_REALM_ID]
        );
    }

    async function cleanupTestData() {
        // Limpiar datos de prueba
        if (testPagoId) {
            await dbPool.query('DELETE FROM pagos_recibidos WHERE id = $1', [testPagoId]);
        }
        if (testCxcId) {
            await dbPool.query('DELETE FROM cuentas_por_cobrar WHERE id = $1', [testCxcId]);
        }
        if (testCustomerId) {
            await dbPool.query('DELETE FROM customers WHERE id = $1', [testCustomerId]);
        }
        if (testSucursalId) {
            await dbPool.query('DELETE FROM log_sincronizacion_erp WHERE sucursal_id = $1', [testSucursalId]);
            await dbPool.query('DELETE FROM mapeo_erp_entidades WHERE sucursal_id = $1', [testSucursalId]);
            await dbPool.query('DELETE FROM configuracion_erp_sucursal WHERE sucursal_id = $1', [testSucursalId]);
        }
    }
});
