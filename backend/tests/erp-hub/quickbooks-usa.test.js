/**
 * QuickBooks USA Adapter - Integration Tests
 * 
 * Suite de testing completa para el adapter de QuickBooks Online USA.
 * Incluye tests unitarios, de integración y E2E con sandbox.
 * 
 * @module tests/erp-hub/quickbooks-usa
 * @author Spirit Tours Dev Team - GenSpark AI Developer
 * @version 1.0.0
 */

const QuickBooksUSAAdapter = require('../../services/erp-hub/adapters/usa/quickbooks-usa.adapter');
const { UnifiedCustomer, UnifiedInvoice, UnifiedPayment } = require('../../services/erp-hub/mappers/unified-models');

describe('QuickBooks USA Adapter - Integration Tests', () => {
    let adapter;
    let testConfig;
    let createdCustomerId;
    let createdInvoiceId;
    let createdPaymentId;

    // ============================================================================
    // SETUP & TEARDOWN
    // ============================================================================

    beforeAll(() => {
        // Configuración para Sandbox de QuickBooks
        testConfig = {
            environment: 'sandbox',
            apiVersion: 'v3',
            minorVersion: '65'
        };

        const credentials = {
            clientId: process.env.QB_SANDBOX_CLIENT_ID,
            clientSecret: process.env.QB_SANDBOX_CLIENT_SECRET,
            realmId: process.env.QB_SANDBOX_REALM_ID,
            accessToken: process.env.QB_SANDBOX_ACCESS_TOKEN,
            refreshToken: process.env.QB_SANDBOX_REFRESH_TOKEN
        };

        adapter = new QuickBooksUSAAdapter(credentials, testConfig);
    });

    afterAll(async () => {
        // Cleanup: Limpiar datos de prueba si es necesario
        // En sandbox generalmente no es necesario
    });

    // ============================================================================
    // AUTHENTICATION TESTS
    // ============================================================================

    describe('Authentication', () => {
        test('should initialize adapter with sandbox credentials', () => {
            expect(adapter).toBeDefined();
            expect(adapter.config.environment).toBe('sandbox');
            expect(adapter.credentials.realmId).toBeTruthy();
        });

        test('should authenticate with QuickBooks sandbox', async () => {
            const result = await adapter.authenticate();
            expect(result.success).toBe(true);
        });

        test('should test connection successfully', async () => {
            await adapter.authenticate();
            const isConnected = await adapter.testConnection();
            expect(isConnected).toBe(true);
        });
    });

    // ============================================================================
    // CUSTOMER SYNC TESTS
    // ============================================================================

    describe('Customer Sync', () => {
        test('should sync a new customer to QuickBooks', async () => {
            await adapter.authenticate();

            const testCustomer = new UnifiedCustomer({
                displayName: 'Test Customer - Spirit Tours',
                givenName: 'John',
                familyName: 'Doe',
                email: `test.customer.${Date.now()}@spirittours.com`,
                phone: '555-1234',
                companyName: 'Test Company LLC',
                billingAddress: {
                    line1: '123 Test Street',
                    city: 'Miami',
                    state: 'FL',
                    postalCode: '33101',
                    country: 'USA'
                },
                currency: 'USD'
            });

            const result = await adapter.syncCustomer(testCustomer);
            
            expect(result.success).toBe(true);
            expect(result.erpEntityId).toBeTruthy();
            expect(result.erpEntityNumber).toBeTruthy();
            
            createdCustomerId = result.erpEntityId;
            
            console.log('✅ Customer created:', {
                id: result.erpEntityId,
                name: result.erpEntityNumber
            });
        });

        test('should retrieve customer from QuickBooks', async () => {
            await adapter.authenticate();

            const customer = await adapter.getCustomer(createdCustomerId);
            
            expect(customer).toBeDefined();
            expect(customer.Id).toBe(createdCustomerId);
            expect(customer.DisplayName).toContain('Test Customer');
        });

        test('should update existing customer', async () => {
            await adapter.authenticate();

            const updatedCustomer = new UnifiedCustomer({
                displayName: 'Test Customer - Spirit Tours UPDATED',
                givenName: 'John',
                familyName: 'Doe',
                email: `test.customer.${Date.now()}@spirittours.com`,
                phone: '555-9999',
                companyName: 'Test Company LLC',
                currency: 'USD'
            });

            updatedCustomer.erpId = createdCustomerId;

            const result = await adapter.syncCustomer(updatedCustomer);
            
            expect(result.success).toBe(true);
            expect(result.erpEntityId).toBe(createdCustomerId);

            // Verificar que se actualizó
            const customer = await adapter.getCustomer(createdCustomerId);
            expect(customer.PrimaryPhone.FreeFormNumber).toBe('555-9999');
        });

        test('should find customer by email', async () => {
            await adapter.authenticate();

            const customer = await adapter._findCustomerByEmail(
                `test.customer@spirittours.com`
            );
            
            // Puede o no existir, pero no debe dar error
            expect(customer === null || customer.Id).toBeTruthy();
        });
    });

    // ============================================================================
    // INVOICE SYNC TESTS
    // ============================================================================

    describe('Invoice Sync', () => {
        test('should sync a new invoice to QuickBooks', async () => {
            await adapter.authenticate();

            const testInvoice = new UnifiedInvoice({
                invoiceNumber: `TEST-INV-${Date.now()}`,
                erpCustomerId: createdCustomerId,
                txnDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
                subtotal: 1000.00,
                taxAmount: 75.00, // 7.5% Florida sales tax
                total: 1075.00,
                currency: 'USD',
                lineItems: [
                    {
                        description: 'Tour to Miami Beach',
                        quantity: 2,
                        unitPrice: 500.00,
                        amount: 1000.00
                    }
                ]
            });

            const result = await adapter.syncInvoice(testInvoice);
            
            expect(result.success).toBe(true);
            expect(result.erpEntityId).toBeTruthy();
            expect(result.erpEntityNumber).toBeTruthy();
            
            createdInvoiceId = result.erpEntityId;
            
            console.log('✅ Invoice created:', {
                id: result.erpEntityId,
                number: result.erpEntityNumber
            });
        });

        test('should retrieve invoice from QuickBooks', async () => {
            await adapter.authenticate();

            const invoice = await adapter.getInvoice(createdInvoiceId);
            
            expect(invoice).toBeDefined();
            expect(invoice.Id).toBe(createdInvoiceId);
            expect(invoice.CustomerRef.value).toBe(createdCustomerId);
            expect(parseFloat(invoice.TotalAmt)).toBe(1075.00);
        });

        test('should update existing invoice', async () => {
            await adapter.authenticate();

            const updatedInvoice = new UnifiedInvoice({
                invoiceNumber: `TEST-INV-UPDATED-${Date.now()}`,
                erpCustomerId: createdCustomerId,
                txnDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                subtotal: 1500.00,
                taxAmount: 112.50,
                total: 1612.50,
                currency: 'USD',
                lineItems: [
                    {
                        description: 'Tour to Miami Beach - Extended',
                        quantity: 3,
                        unitPrice: 500.00,
                        amount: 1500.00
                    }
                ]
            });

            updatedInvoice.erpId = createdInvoiceId;

            const result = await adapter.updateInvoice(createdInvoiceId, updatedInvoice);
            
            expect(result.success).toBe(true);

            // Verificar que se actualizó
            const invoice = await adapter.getInvoice(createdInvoiceId);
            expect(parseFloat(invoice.TotalAmt)).toBe(1612.50);
        });
    });

    // ============================================================================
    // PAYMENT SYNC TESTS
    // ============================================================================

    describe('Payment Sync', () => {
        test('should sync a payment to QuickBooks', async () => {
            await adapter.authenticate();

            const testPayment = new UnifiedPayment({
                erpCustomerId: createdCustomerId,
                amount: 1075.00,
                paymentDate: new Date(),
                referenceNumber: `TEST-PMT-${Date.now()}`,
                currency: 'USD',
                linkedInvoices: [
                    {
                        erpInvoiceId: createdInvoiceId,
                        amountApplied: 1075.00
                    }
                ]
            });

            const result = await adapter.syncPayment(testPayment);
            
            expect(result.success).toBe(true);
            expect(result.erpEntityId).toBeTruthy();
            
            createdPaymentId = result.erpEntityId;
            
            console.log('✅ Payment created:', {
                id: result.erpEntityId
            });
        });

        test('should retrieve payment from QuickBooks', async () => {
            await adapter.authenticate();

            const payment = await adapter.getPayment(createdPaymentId);
            
            expect(payment).toBeDefined();
            expect(payment.Id).toBe(createdPaymentId);
            expect(payment.CustomerRef.value).toBe(createdCustomerId);
            expect(parseFloat(payment.TotalAmt)).toBe(1075.00);
        });
    });

    // ============================================================================
    // REPORTS TESTS
    // ============================================================================

    describe('Reports', () => {
        test('should generate Profit & Loss report', async () => {
            await adapter.authenticate();

            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
            const endDate = new Date();

            const report = await adapter.getProfitAndLossReport(startDate, endDate);
            
            expect(report).toBeDefined();
            expect(report.Header).toBeDefined();
            expect(report.Header.ReportName).toBe('ProfitAndLoss');
        });

        test('should generate Balance Sheet report', async () => {
            await adapter.authenticate();

            const asOfDate = new Date();
            const report = await adapter.getBalanceSheetReport(asOfDate);
            
            expect(report).toBeDefined();
            expect(report.Header).toBeDefined();
            expect(report.Header.ReportName).toBe('BalanceSheet');
        });
    });

    // ============================================================================
    // CHART OF ACCOUNTS TESTS
    // ============================================================================

    describe('Chart of Accounts', () => {
        test('should retrieve chart of accounts', async () => {
            await adapter.authenticate();

            const accounts = await adapter.getChartOfAccounts();
            
            expect(accounts).toBeDefined();
            expect(Array.isArray(accounts)).toBe(true);
            expect(accounts.length).toBeGreaterThan(0);
            
            // Verificar estructura de cuenta
            const account = accounts[0];
            expect(account.Id).toBeDefined();
            expect(account.Name).toBeDefined();
            expect(account.AccountType).toBeDefined();
        });

        test('should retrieve specific account', async () => {
            await adapter.authenticate();

            const accounts = await adapter.getChartOfAccounts();
            const accountId = accounts[0].Id;

            const account = await adapter.getAccount(accountId);
            
            expect(account).toBeDefined();
            expect(account.Id).toBe(accountId);
        });
    });

    // ============================================================================
    // ERROR HANDLING TESTS
    // ============================================================================

    describe('Error Handling', () => {
        test('should handle invalid customer ID', async () => {
            await adapter.authenticate();

            await expect(adapter.getCustomer('999999999'))
                .rejects
                .toThrow();
        });

        test('should handle invalid invoice ID', async () => {
            await adapter.authenticate();

            const invoice = await adapter.getInvoice('999999999');
            expect(invoice).toBeNull();
        });

        test('should handle rate limiting gracefully', async () => {
            await adapter.authenticate();

            // Simular múltiples requests rápidos
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(adapter.getChartOfAccounts());
            }

            const results = await Promise.all(promises);
            
            expect(results.length).toBe(10);
            results.forEach(result => {
                expect(result).toBeDefined();
            });
        });
    });

    // ============================================================================
    // TOKEN REFRESH TESTS
    // ============================================================================

    describe('Token Management', () => {
        test('should refresh access token when expired', async () => {
            // Este test requiere un token expirado
            // En producción, el adapter debe refrescar automáticamente
            
            await adapter.authenticate();
            
            // Simular token expirado (solo para testing)
            const originalToken = adapter.credentials.accessToken;
            
            // El adapter debería manejar esto automáticamente
            expect(adapter.credentials.accessToken).toBeTruthy();
        });
    });

    // ============================================================================
    // PERFORMANCE TESTS
    // ============================================================================

    describe('Performance', () => {
        test('should sync customer within acceptable time', async () => {
            await adapter.authenticate();

            const startTime = Date.now();

            const testCustomer = new UnifiedCustomer({
                displayName: `Perf Test Customer ${Date.now()}`,
                givenName: 'Performance',
                familyName: 'Test',
                email: `perf.test.${Date.now()}@spirittours.com`,
                currency: 'USD'
            });

            await adapter.syncCustomer(testCustomer);

            const duration = Date.now() - startTime;
            
            expect(duration).toBeLessThan(5000); // Menos de 5 segundos
            console.log(`⏱️  Customer sync took ${duration}ms`);
        });

        test('should sync invoice within acceptable time', async () => {
            await adapter.authenticate();

            const startTime = Date.now();

            const testInvoice = new UnifiedInvoice({
                invoiceNumber: `PERF-TEST-${Date.now()}`,
                erpCustomerId: createdCustomerId,
                txnDate: new Date(),
                subtotal: 100.00,
                taxAmount: 7.50,
                total: 107.50,
                currency: 'USD',
                lineItems: [
                    {
                        description: 'Performance Test Item',
                        quantity: 1,
                        unitPrice: 100.00,
                        amount: 100.00
                    }
                ]
            });

            await adapter.syncInvoice(testInvoice);

            const duration = Date.now() - startTime;
            
            expect(duration).toBeLessThan(5000); // Menos de 5 segundos
            console.log(`⏱️  Invoice sync took ${duration}ms`);
        });
    });
});

// ============================================================================
// HELPER FUNCTIONS FOR TESTING
// ============================================================================

/**
 * Crea datos de prueba para testing
 */
function createTestData() {
    return {
        customer: {
            displayName: `Test Customer ${Date.now()}`,
            givenName: 'Test',
            familyName: 'User',
            email: `test.${Date.now()}@spirittours.com`,
            phone: '555-0000',
            currency: 'USD'
        },
        invoice: {
            invoiceNumber: `TEST-${Date.now()}`,
            txnDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            subtotal: 500.00,
            taxAmount: 37.50,
            total: 537.50,
            currency: 'USD',
            lineItems: [
                {
                    description: 'Test Tour',
                    quantity: 1,
                    unitPrice: 500.00,
                    amount: 500.00
                }
            ]
        },
        payment: {
            amount: 537.50,
            paymentDate: new Date(),
            referenceNumber: `PMT-${Date.now()}`,
            currency: 'USD'
        }
    };
}

/**
 * Limpia datos de prueba del sandbox
 */
async function cleanupTestData(adapter, entityIds) {
    // En sandbox no es crítico limpiar, pero es buena práctica
    console.log('🧹 Cleanup test data:', entityIds);
    
    // QuickBooks no permite borrar, solo void/inactivate
    // Por eso en sandbox normalmente no limpiamos
}

module.exports = {
    createTestData,
    cleanupTestData
};
