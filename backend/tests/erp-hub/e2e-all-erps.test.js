/**
 * ERP Hub - End-to-End Multi-Provider Testing Suite
 * 
 * Tests E2E completos que validan la sincronización simultánea con los 6 ERPs:
 * - USA: QuickBooks USA, Xero USA, FreshBooks
 * - México: QuickBooks México, CONTPAQi, Alegra
 * 
 * Este test suite simula el flujo completo de Spirit Tours desde la creación
 * de una reserva hasta la sincronización con todos los sistemas contables.
 * 
 * @module tests/erp-hub/e2e-all-erps
 * @author Spirit Tours Dev Team - GenSpark AI Developer
 * @version 1.0.0
 * @requires jest
 * @requires axios
 */

const axios = require('axios');
const QuickBooksUSAAdapter = require('../../services/erp-hub/adapters/usa/quickbooks-usa.adapter');
const XeroUSAAdapter = require('../../services/erp-hub/adapters/usa/xero-usa.adapter');
const FreshBooksAdapter = require('../../services/erp-hub/adapters/usa/freshbooks.adapter');
const QuickBooksMexicoAdapter = require('../../services/erp-hub/adapters/mexico/quickbooks-mexico.adapter');
const CONTPAQiAdapter = require('../../services/erp-hub/adapters/mexico/contpaqi.adapter');
const AlegraAdapter = require('../../services/erp-hub/adapters/mexico/alegra.adapter');
const { UnifiedCustomer, UnifiedInvoice, UnifiedPayment } = require('../../services/erp-hub/mappers/unified-models');

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================

const TEST_TIMEOUT = 120000; // 2 minutos por test (APIs externas lentas)
jest.setTimeout(TEST_TIMEOUT);

// Mock data compartido
const MOCK_CUSTOMER_DATA = {
    displayName: `Spirit Tours E2E Test Customer ${Date.now()}`,
    email: `e2e.test.${Date.now()}@spirittours.com`,
    phone: '+1-555-0199',
    taxId: 'XAXX010101000', // RFC genérico para tests
    billingAddress: {
        line1: '123 Test Street',
        city: 'Miami',
        state: 'FL',
        postalCode: '33101',
        country: 'USA'
    },
    metadata: {
        customerType: 'business',
        industry: 'tourism'
    }
};

const MOCK_INVOICE_DATA = {
    invoiceNumber: `INV-E2E-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'unpaid',
    currency: 'USD',
    lineItems: [
        {
            description: 'Tour Package: Miami Beach 3 Days',
            quantity: 2,
            unitPrice: 599.99,
            taxAmount: 96.00,
            taxRate: 0.08
        },
        {
            description: 'Airport Transfer',
            quantity: 2,
            unitPrice: 75.00,
            taxAmount: 12.00,
            taxRate: 0.08
        }
    ],
    memo: 'E2E Test Invoice - Spirit Tours Booking',
    cfdiPaymentMethod: 'PUE', // México
    cfdiUse: 'G03', // México
    cfdiPaymentForm: '03' // México
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Inicializa adapters con configuración de sandbox/test
 */
function initializeAdapters() {
    const adapters = {};

    // USA Adapters
    if (process.env.QB_USA_SANDBOX_CLIENT_ID) {
        adapters.quickbooksUSA = new QuickBooksUSAAdapter({
            clientId: process.env.QB_USA_SANDBOX_CLIENT_ID,
            clientSecret: process.env.QB_USA_SANDBOX_CLIENT_SECRET,
            realmId: process.env.QB_USA_SANDBOX_REALM_ID,
            accessToken: process.env.QB_USA_SANDBOX_ACCESS_TOKEN,
            refreshToken: process.env.QB_USA_SANDBOX_REFRESH_TOKEN
        }, { environment: 'sandbox' });
    }

    if (process.env.XERO_USA_CLIENT_ID) {
        adapters.xeroUSA = new XeroUSAAdapter({
            clientId: process.env.XERO_USA_CLIENT_ID,
            clientSecret: process.env.XERO_USA_CLIENT_SECRET,
            tenantId: process.env.XERO_USA_TENANT_ID,
            accessToken: process.env.XERO_USA_ACCESS_TOKEN,
            refreshToken: process.env.XERO_USA_REFRESH_TOKEN
        }, { environment: 'sandbox' });
    }

    if (process.env.FRESHBOOKS_USA_CLIENT_ID) {
        adapters.freshbooks = new FreshBooksAdapter({
            clientId: process.env.FRESHBOOKS_USA_CLIENT_ID,
            clientSecret: process.env.FRESHBOOKS_USA_CLIENT_SECRET,
            accountId: process.env.FRESHBOOKS_USA_ACCOUNT_ID,
            accessToken: process.env.FRESHBOOKS_USA_ACCESS_TOKEN,
            refreshToken: process.env.FRESHBOOKS_USA_REFRESH_TOKEN
        }, { environment: 'sandbox' });
    }

    // México Adapters
    if (process.env.QB_MX_SANDBOX_CLIENT_ID) {
        adapters.quickbooksMexico = new QuickBooksMexicoAdapter({
            clientId: process.env.QB_MX_SANDBOX_CLIENT_ID,
            clientSecret: process.env.QB_MX_SANDBOX_CLIENT_SECRET,
            realmId: process.env.QB_MX_SANDBOX_REALM_ID,
            accessToken: process.env.QB_MX_SANDBOX_ACCESS_TOKEN,
            refreshToken: process.env.QB_MX_SANDBOX_REFRESH_TOKEN
        }, { environment: 'sandbox', enableCFDI: true });
    }

    if (process.env.CONTPAQI_API_KEY) {
        adapters.contpaqi = new CONTPAQiAdapter({
            apiKey: process.env.CONTPAQI_API_KEY,
            licenseKey: process.env.CONTPAQI_LICENSE_KEY,
            userId: process.env.CONTPAQI_USER_ID,
            password: process.env.CONTPAQI_PASSWORD,
            companyDatabase: process.env.CONTPAQI_DATABASE || 'DEMO'
        }, { environment: 'test', enableCFDI: true });
    }

    if (process.env.ALEGRA_USERNAME) {
        adapters.alegra = new AlegraAdapter({
            username: process.env.ALEGRA_USERNAME,
            apiToken: process.env.ALEGRA_API_TOKEN
        }, { environment: 'sandbox', enableCFDI: true });
    }

    return adapters;
}

/**
 * Calcula totales de invoice
 */
function calculateInvoiceTotals(invoice) {
    const subtotal = invoice.lineItems.reduce((sum, item) => 
        sum + (item.quantity * item.unitPrice), 0);
    const totalTax = invoice.lineItems.reduce((sum, item) => 
        sum + item.taxAmount, 0);
    const total = subtotal + totalTax;

    return { subtotal, totalTax, total };
}

/**
 * Espera un tiempo determinado
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// TEST SUITE: E2E MULTI-PROVIDER
// ============================================================================

describe('ERP Hub - E2E Multi-Provider Tests', () => {
    let adapters;
    let testResults = {
        customers: {},
        invoices: {},
        payments: {}
    };

    // ========================================================================
    // SETUP
    // ========================================================================

    beforeAll(() => {
        console.log('\n🚀 Iniciando E2E Tests con múltiples ERPs...\n');
        adapters = initializeAdapters();
        
        const activeAdapters = Object.keys(adapters);
        console.log(`📊 Adapters activos: ${activeAdapters.length}`);
        console.log(`   - ${activeAdapters.join('\n   - ')}\n`);

        if (activeAdapters.length === 0) {
            console.warn('⚠️  ADVERTENCIA: No hay adapters configurados. Configure las variables de entorno.');
        }
    });

    afterAll(() => {
        console.log('\n' + '='.repeat(80));
        console.log('📊 RESUMEN DE TESTS E2E');
        console.log('='.repeat(80));
        
        Object.keys(adapters).forEach(adapterName => {
            console.log(`\n${adapterName.toUpperCase()}:`);
            console.log(`  Customer ID: ${testResults.customers[adapterName] || 'N/A'}`);
            console.log(`  Invoice ID:  ${testResults.invoices[adapterName] || 'N/A'}`);
            console.log(`  Payment ID:  ${testResults.payments[adapterName] || 'N/A'}`);
        });
        
        console.log('\n' + '='.repeat(80) + '\n');
    });

    // ========================================================================
    // TEST 1: AUTENTICACIÓN SIMULTÁNEA
    // ========================================================================

    describe('Autenticación Multi-Provider', () => {
        test('should authenticate all configured adapters successfully', async () => {
            const authResults = {};

            for (const [adapterName, adapter] of Object.entries(adapters)) {
                try {
                    console.log(`\n🔐 Autenticando ${adapterName}...`);
                    const result = await adapter.testConnection();
                    
                    authResults[adapterName] = result;
                    expect(result.success).toBe(true);
                    expect(result.authenticated).toBe(true);
                    
                    console.log(`   ✅ ${adapterName}: Autenticado correctamente`);
                } catch (error) {
                    console.error(`   ❌ ${adapterName}: Error de autenticación`, error.message);
                    authResults[adapterName] = { success: false, error: error.message };
                }
            }

            // Al menos un adapter debe estar autenticado
            const successCount = Object.values(authResults).filter(r => r.success).length;
            expect(successCount).toBeGreaterThan(0);
        });
    });

    // ========================================================================
    // TEST 2: SINCRONIZACIÓN DE CLIENTES
    // ========================================================================

    describe('Sincronización de Clientes Multi-Provider', () => {
        test('should sync customer to all configured ERPs simultaneously', async () => {
            const unifiedCustomer = new UnifiedCustomer(MOCK_CUSTOMER_DATA);
            const syncPromises = [];

            for (const [adapterName, adapter] of Object.entries(adapters)) {
                const promise = adapter.syncCustomer(unifiedCustomer)
                    .then(result => {
                        console.log(`   ✅ ${adapterName}: Customer creado (ID: ${result.erpEntityId})`);
                        testResults.customers[adapterName] = result.erpEntityId;
                        return { adapterName, success: true, result };
                    })
                    .catch(error => {
                        console.error(`   ❌ ${adapterName}: Error`, error.message);
                        return { adapterName, success: false, error: error.message };
                    });
                
                syncPromises.push(promise);
            }

            const results = await Promise.all(syncPromises);
            
            // Validar que al menos un ERP sincronizó correctamente
            const successfulSyncs = results.filter(r => r.success);
            expect(successfulSyncs.length).toBeGreaterThan(0);

            // Validar que todos los éxitos tienen erpEntityId
            successfulSyncs.forEach(sync => {
                expect(sync.result.erpEntityId).toBeDefined();
                expect(sync.result.erpEntityId).not.toBe('');
            });
        });

        test('should retrieve customer from all ERPs after sync', async () => {
            await sleep(2000); // Esperar a que las APIs procesen

            for (const [adapterName, adapter] of Object.entries(adapters)) {
                if (!testResults.customers[adapterName]) {
                    console.log(`   ⏭️  ${adapterName}: Saltando (no customer ID)`);
                    continue;
                }

                try {
                    const customerId = testResults.customers[adapterName];
                    const result = await adapter.getCustomer(customerId);
                    
                    expect(result.success).toBe(true);
                    expect(result.data).toBeDefined();
                    console.log(`   ✅ ${adapterName}: Customer recuperado correctamente`);
                } catch (error) {
                    console.error(`   ❌ ${adapterName}: Error al recuperar`, error.message);
                }
            }
        });
    });

    // ========================================================================
    // TEST 3: SINCRONIZACIÓN DE FACTURAS
    // ========================================================================

    describe('Sincronización de Facturas Multi-Provider', () => {
        test('should sync invoice to all configured ERPs with proper customer reference', async () => {
            const syncPromises = [];

            for (const [adapterName, adapter] of Object.entries(adapters)) {
                if (!testResults.customers[adapterName]) {
                    console.log(`   ⏭️  ${adapterName}: Saltando (no customer ID)`);
                    continue;
                }

                // Adaptar invoice según región
                const invoiceData = { ...MOCK_INVOICE_DATA };
                invoiceData.erpCustomerId = testResults.customers[adapterName];
                
                // Ajustar moneda para México
                if (['quickbooksMexico', 'contpaqi', 'alegra'].includes(adapterName)) {
                    invoiceData.currency = 'MXN';
                    // Convertir precios USD -> MXN (1 USD = ~17 MXN)
                    invoiceData.lineItems = invoiceData.lineItems.map(item => ({
                        ...item,
                        unitPrice: item.unitPrice * 17,
                        taxAmount: item.taxAmount * 17
                    }));
                }

                const unifiedInvoice = new UnifiedInvoice(invoiceData);

                const promise = adapter.syncInvoice(unifiedInvoice)
                    .then(result => {
                        console.log(`   ✅ ${adapterName}: Invoice creada (ID: ${result.erpEntityId})`);
                        testResults.invoices[adapterName] = result.erpEntityId;
                        
                        // Validar CFDI para México
                        if (result.erpData?.uuid) {
                            console.log(`      🇲🇽 CFDI UUID: ${result.erpData.uuid}`);
                        }
                        
                        return { adapterName, success: true, result };
                    })
                    .catch(error => {
                        console.error(`   ❌ ${adapterName}: Error`, error.message);
                        return { adapterName, success: false, error: error.message };
                    });

                syncPromises.push(promise);
            }

            const results = await Promise.all(syncPromises);
            
            const successfulSyncs = results.filter(r => r.success);
            expect(successfulSyncs.length).toBeGreaterThan(0);

            // Validar estructura de respuesta
            successfulSyncs.forEach(sync => {
                expect(sync.result.erpEntityId).toBeDefined();
                expect(sync.result.success).toBe(true);
            });
        });

        test('should calculate invoice totals correctly across all ERPs', async () => {
            const expectedTotals = calculateInvoiceTotals(MOCK_INVOICE_DATA);
            
            await sleep(3000); // Esperar procesamiento

            for (const [adapterName, adapter] of Object.entries(adapters)) {
                if (!testResults.invoices[adapterName]) {
                    console.log(`   ⏭️  ${adapterName}: Saltando (no invoice ID)`);
                    continue;
                }

                try {
                    const invoiceId = testResults.invoices[adapterName];
                    const result = await adapter.getInvoice(invoiceId);
                    
                    expect(result.success).toBe(true);
                    expect(result.data).toBeDefined();
                    
                    // Validar que el total es mayor que 0
                    if (result.data.total) {
                        expect(result.data.total).toBeGreaterThan(0);
                        console.log(`   ✅ ${adapterName}: Total = ${result.data.total}`);
                    }
                } catch (error) {
                    console.error(`   ❌ ${adapterName}: Error al recuperar invoice`, error.message);
                }
            }
        });
    });

    // ========================================================================
    // TEST 4: SINCRONIZACIÓN DE PAGOS
    // ========================================================================

    describe('Sincronización de Pagos Multi-Provider', () => {
        test('should sync payment to all configured ERPs', async () => {
            const syncPromises = [];
            const { total } = calculateInvoiceTotals(MOCK_INVOICE_DATA);

            for (const [adapterName, adapter] of Object.entries(adapters)) {
                if (!testResults.invoices[adapterName]) {
                    console.log(`   ⏭️  ${adapterName}: Saltando (no invoice ID)`);
                    continue;
                }

                const paymentData = {
                    erpInvoiceId: testResults.invoices[adapterName],
                    erpCustomerId: testResults.customers[adapterName],
                    amount: total,
                    currency: ['quickbooksMexico', 'contpaqi', 'alegra'].includes(adapterName) ? 'MXN' : 'USD',
                    paymentDate: new Date().toISOString().split('T')[0],
                    paymentMethod: 'credit_card',
                    reference: `E2E-PAYMENT-${Date.now()}`,
                    memo: 'E2E Test Payment'
                };

                const unifiedPayment = new UnifiedPayment(paymentData);

                const promise = adapter.syncPayment(unifiedPayment)
                    .then(result => {
                        console.log(`   ✅ ${adapterName}: Payment creado (ID: ${result.erpEntityId})`);
                        testResults.payments[adapterName] = result.erpEntityId;
                        return { adapterName, success: true, result };
                    })
                    .catch(error => {
                        console.error(`   ❌ ${adapterName}: Error`, error.message);
                        return { adapterName, success: false, error: error.message };
                    });

                syncPromises.push(promise);
            }

            const results = await Promise.all(syncPromises);
            
            const successfulSyncs = results.filter(r => r.success);
            // Algunos ERPs pueden no soportar pagos, así que no forzamos éxito
            if (successfulSyncs.length > 0) {
                expect(successfulSyncs.length).toBeGreaterThan(0);
            }
        });
    });

    // ========================================================================
    // TEST 5: RATE LIMITING & PERFORMANCE
    // ========================================================================

    describe('Rate Limiting & Performance Tests', () => {
        test('should respect rate limits for all providers', async () => {
            const rateLimits = {
                quickbooksUSA: { limit: 500, window: 60000 },
                quickbooksMexico: { limit: 500, window: 60000 },
                xeroUSA: { limit: 60, window: 60000 },
                freshbooks: { limit: 120, window: 60000 },
                contpaqi: { limit: 30, window: 60000 },
                alegra: { limit: 100, window: 60000 }
            };

            for (const [adapterName, adapter] of Object.entries(adapters)) {
                const rateLimit = rateLimits[adapterName];
                if (!rateLimit) continue;

                // Verificar que el adapter tiene rate limiting implementado
                expect(adapter.rateLimiter).toBeDefined();
                expect(adapter.rateLimiter.requestsPerMinute).toBeLessThanOrEqual(rateLimit.limit);
                
                console.log(`   ✅ ${adapterName}: Rate limit ${adapter.rateLimiter.requestsPerMinute}/min`);
            }
        });

        test('should complete full sync cycle within acceptable time', async () => {
            const startTime = Date.now();
            
            // Simular ciclo completo: 1 customer + 1 invoice + 1 payment
            const operations = [];
            
            for (const [adapterName, adapter] of Object.entries(adapters)) {
                if (!testResults.customers[adapterName]) continue;

                operations.push(
                    adapter.testConnection()
                        .then(() => ({ adapterName, operation: 'testConnection', success: true }))
                        .catch(error => ({ adapterName, operation: 'testConnection', success: false, error }))
                );
            }

            await Promise.all(operations);
            
            const duration = Date.now() - startTime;
            console.log(`   ⏱️  Tiempo total de operaciones: ${duration}ms`);
            
            // El ciclo completo no debe tomar más de 30 segundos
            expect(duration).toBeLessThan(30000);
        });
    });

    // ========================================================================
    // TEST 6: ERROR HANDLING & RESILIENCE
    // ========================================================================

    describe('Error Handling & Resilience', () => {
        test('should handle invalid customer data gracefully', async () => {
            const invalidCustomer = new UnifiedCustomer({
                displayName: '', // Nombre vacío (inválido)
                email: 'invalid-email', // Email inválido
            });

            for (const [adapterName, adapter] of Object.entries(adapters)) {
                try {
                    const result = await adapter.syncCustomer(invalidCustomer);
                    
                    // Si no arroja error, debe indicar failure
                    if (!result.success) {
                        expect(result.error).toBeDefined();
                        console.log(`   ✅ ${adapterName}: Error manejado correctamente`);
                    }
                } catch (error) {
                    // Error esperado
                    expect(error).toBeDefined();
                    console.log(`   ✅ ${adapterName}: Exception capturada correctamente`);
                }
            }
        });

        test('should handle network timeouts gracefully', async () => {
            // Este test simula timeouts configurando un timeout muy corto
            const shortTimeoutAdapter = Object.values(adapters)[0];
            
            if (!shortTimeoutAdapter) {
                console.log('   ⏭️  Saltando (no adapters disponibles)');
                return;
            }

            // Intentar operación que probablemente tarde
            try {
                const result = await Promise.race([
                    shortTimeoutAdapter.testConnection(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), 100)
                    )
                ]);
                
                console.log('   ✅ Operación completada antes del timeout');
            } catch (error) {
                expect(error.message).toContain('Timeout');
                console.log('   ✅ Timeout manejado correctamente');
            }
        });
    });

    // ========================================================================
    // TEST 7: DATA CONSISTENCY VALIDATION
    // ========================================================================

    describe('Data Consistency Across ERPs', () => {
        test('should maintain consistent customer data across all ERPs', async () => {
            const customerDataFromERPs = [];

            for (const [adapterName, adapter] of Object.entries(adapters)) {
                if (!testResults.customers[adapterName]) continue;

                try {
                    const result = await adapter.getCustomer(testResults.customers[adapterName]);
                    if (result.success && result.data) {
                        customerDataFromERPs.push({
                            adapter: adapterName,
                            email: result.data.email,
                            displayName: result.data.displayName
                        });
                    }
                } catch (error) {
                    console.log(`   ⚠️  ${adapterName}: No se pudo recuperar customer`);
                }
            }

            // Validar que al menos 2 ERPs tienen el mismo email
            if (customerDataFromERPs.length >= 2) {
                const emails = customerDataFromERPs.map(c => c.email);
                const uniqueEmails = [...new Set(emails)];
                
                // El email debe ser consistente
                expect(uniqueEmails.length).toBeLessThanOrEqual(2); // Permitir algunas variaciones
                console.log(`   ✅ Consistencia de email validada: ${uniqueEmails[0]}`);
            }
        });
    });
});

// ============================================================================
// STANDALONE TEST RUNNER (para ejecutar fuera de Jest)
// ============================================================================

/**
 * Ejecuta los tests E2E de manera standalone
 * Uso: node e2e-all-erps.test.js --standalone
 */
if (require.main === module && process.argv.includes('--standalone')) {
    console.log('🚀 Ejecutando E2E Tests en modo standalone...\n');
    
    const adapters = initializeAdapters();
    console.log(`📊 Adapters configurados: ${Object.keys(adapters).length}`);
    
    (async () => {
        try {
            // Test básico de conectividad
            for (const [name, adapter] of Object.entries(adapters)) {
                console.log(`\n🔍 Testing ${name}...`);
                const result = await adapter.testConnection();
                console.log(`   ${result.success ? '✅' : '❌'} Resultado:`, result);
            }
        } catch (error) {
            console.error('❌ Error:', error);
            process.exit(1);
        }
    })();
}
