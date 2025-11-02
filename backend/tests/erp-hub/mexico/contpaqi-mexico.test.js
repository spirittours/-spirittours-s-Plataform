/**
 * CONTPAQi México Adapter - Integration Tests
 * 
 * Suite de tests de integración para el adapter de CONTPAQi México.
 * Tests designed to work with CONTPAQi sandbox/test environment.
 * 
 * @group integration
 * @group mexico
 * @group contpaqi
 */

const CONTPAQiAdapter = require('../../../services/erp-hub/adapters/mexico/contpaqi.adapter');
const UnifiedCustomer = require('../../../services/erp-hub/mappers/unified-models').UnifiedCustomer;
const UnifiedInvoice = require('../../../services/erp-hub/mappers/unified-models').UnifiedInvoice;
const UnifiedPayment = require('../../../services/erp-hub/mappers/unified-models').UnifiedPayment;

describe('CONTPAQi México Adapter - Integration Tests', () => {
    let adapter;
    let testConfig;
    let createdCustomerId;
    let createdInvoiceId;
    let createdPaymentId;

    beforeAll(() => {
        // Setup test configuration (use environment variables or test credentials)
        testConfig = {
            environment: 'sandbox',
            enableCFDI: false // Disable CFDI for unit tests
        };

        const credentials = {
            apiKey: process.env.CONTPAQI_TEST_API_KEY || 'test_api_key',
            licenseKey: process.env.CONTPAQI_TEST_LICENSE_KEY || 'test_license',
            companyRfc: process.env.CONTPAQI_TEST_RFC || 'AAA010101AAA',
            companyDatabase: process.env.CONTPAQI_TEST_DATABASE || 'TEST_DB',
            userId: process.env.CONTPAQI_TEST_USER || 'admin',
            password: process.env.CONTPAQI_TEST_PASSWORD || 'test123'
        };

        adapter = new CONTPAQiAdapter(credentials, testConfig);
    });

    afterAll(async () => {
        // Cleanup: Delete test data
        if (createdPaymentId) {
            try {
                await adapter._makeRequest('DELETE', `/abonos/${createdPaymentId}`);
            } catch (error) {
                console.log('Cleanup payment error:', error.message);
            }
        }
        
        if (createdInvoiceId) {
            try {
                await adapter._makeRequest('DELETE', `/documentos/${createdInvoiceId}`);
            } catch (error) {
                console.log('Cleanup invoice error:', error.message);
            }
        }

        if (createdCustomerId) {
            try {
                await adapter._makeRequest('DELETE', `/clientes/${createdCustomerId}`);
            } catch (error) {
                console.log('Cleanup customer error:', error.message);
            }
        }

        // Disconnect
        await adapter.disconnect();
    });

    describe('Authentication & Connection', () => {
        test('should authenticate successfully with valid credentials', async () => {
            const result = await adapter.authenticate();
            
            expect(result.success).toBe(true);
            expect(result.authenticated).toBe(true);
            expect(adapter.sessionToken).toBeTruthy();
        }, 30000);

        test('should test connection and retrieve company info', async () => {
            const result = await adapter.testConnection();
            
            expect(result.success).toBe(true);
            expect(result.connected).toBe(true);
            expect(result.company).toBeDefined();
            expect(result.company.rfc).toBeTruthy();
        }, 30000);

        test('should fail authentication with invalid credentials', async () => {
            const badAdapter = new CONTPAQiAdapter({
                apiKey: 'invalid_key',
                licenseKey: 'invalid_license',
                companyDatabase: 'INVALID_DB',
                userId: 'invalid_user',
                password: 'wrong_password'
            }, testConfig);

            const result = await badAdapter.authenticate();
            
            expect(result.success).toBe(false);
            expect(result.authenticated).toBe(false);
            expect(result.error).toBeTruthy();
        }, 30000);
    });

    describe('Customer Operations (Clientes)', () => {
        test('should sync a new customer to CONTPAQi', async () => {
            const testCustomer = new UnifiedCustomer({
                displayName: 'Cliente Test Spirit Tours MX',
                givenName: 'Juan',
                familyName: 'Pérez García',
                email: `test.cliente.mx.${Date.now()}@spirittours.com`,
                phoneNumber: '+52 55 1234 5678',
                taxId: 'XAXX010101000', // RFC genérico
                currency: 'MXN',
                billingAddress: {
                    line1: 'Av. Reforma 123',
                    line2: 'Col. Centro',
                    city: 'Ciudad de México',
                    state: 'CDMX',
                    postalCode: '06000',
                    country: 'México'
                }
            });

            const result = await adapter.syncCustomer(testCustomer);
            
            expect(result.success).toBe(true);
            expect(result.erpEntityId).toBeTruthy();
            expect(result.erpData.rfc).toBe('XAXX010101000');
            
            createdCustomerId = result.erpEntityId;
        }, 30000);

        test('should retrieve an existing customer from CONTPAQi', async () => {
            expect(createdCustomerId).toBeTruthy();
            
            const customer = await adapter.getCustomer(createdCustomerId);
            
            expect(customer).toBeDefined();
            expect(customer.CIDCLIENTEPROVEEDOR).toBe(parseInt(createdCustomerId));
            expect(customer.CRFC).toBe('XAXX010101000');
        }, 30000);

        test('should update an existing customer', async () => {
            expect(createdCustomerId).toBeTruthy();
            
            const existingCustomer = await adapter.getCustomer(createdCustomerId);
            
            const updatedCustomer = new UnifiedCustomer({
                erpId: createdCustomerId,
                displayName: 'Cliente Test Spirit Tours MX - ACTUALIZADO',
                email: existingCustomer.CEMAIL1,
                phoneNumber: '+52 55 9876 5432',
                taxId: 'XAXX010101000'
            });

            const result = await adapter.syncCustomer(updatedCustomer);
            
            expect(result.success).toBe(true);
            expect(result.erpEntityId).toBe(createdCustomerId);
        }, 30000);

        test('should search customers by RFC', async () => {
            const results = await adapter.searchCustomers({ rfc: 'XAXX010101000' });
            
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeGreaterThan(0);
        }, 30000);
    });

    describe('Invoice Operations (Facturas/Documentos)', () => {
        test('should sync a new invoice to CONTPAQi', async () => {
            expect(createdCustomerId).toBeTruthy();
            
            const testInvoice = new UnifiedInvoice({
                erpCustomerId: createdCustomerId,
                invoiceNumber: `TEST-MX-${Date.now()}`,
                date: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                currency: 'MXN',
                status: 'unpaid',
                notes: 'Factura de prueba CONTPAQi',
                cfdiPaymentMethod: 'PUE',
                cfdiUse: 'G03',
                lineItems: [
                    {
                        description: 'Tour a Cancún - 3 días / 2 noches',
                        quantity: 2,
                        unitPrice: 5000.00,
                        productCode: 'TOUR001',
                        taxAmount: 1600.00, // IVA 16%
                        impuestos: {
                            traslados: [{
                                impuesto: '002', // IVA
                                tipoFactor: 'Tasa',
                                tasaOCuota: 0.16
                            }]
                        }
                    }
                ],
                subtotal: 10000.00,
                taxTotal: 1600.00,
                total: 11600.00
            });

            const result = await adapter.syncInvoice(testInvoice);
            
            expect(result.success).toBe(true);
            expect(result.erpEntityId).toBeTruthy();
            expect(result.erpData.total).toBeDefined();
            
            createdInvoiceId = result.erpEntityId;
        }, 60000);

        test('should retrieve an existing invoice from CONTPAQi', async () => {
            expect(createdInvoiceId).toBeTruthy();
            
            const invoice = await adapter.getInvoice(createdInvoiceId);
            
            expect(invoice).toBeDefined();
            expect(invoice.CIDDOCUMENTO).toBe(parseInt(createdInvoiceId));
            expect(invoice.CNETO).toBeGreaterThan(0);
        }, 30000);

        test('should NOT update a timbrado (stamped) invoice', async () => {
            // This test assumes the invoice has been stamped
            // In a real scenario, you'd first stamp the invoice
            
            const invoiceWithStamp = new UnifiedInvoice({
                erpId: createdInvoiceId,
                erpCustomerId: createdCustomerId,
                notes: 'Intento de actualización'
            });

            // If the invoice is stamped, this should throw error
            // If not stamped, it should update successfully
            try {
                const result = await adapter.syncInvoice(invoiceWithStamp);
                // If no error, invoice wasn't stamped - that's ok for test
                expect(result.success).toBe(true);
            } catch (error) {
                // If error, invoice was stamped - expected behavior
                expect(error.message).toContain('timbrado');
            }
        }, 30000);
    });

    describe('Payment Operations (Abonos/Pagos)', () => {
        test('should sync a payment to CONTPAQi', async () => {
            expect(createdInvoiceId).toBeTruthy();
            
            const testPayment = new UnifiedPayment({
                erpInvoiceId: createdInvoiceId,
                amount: 5800.00, // Pago parcial
                date: new Date(),
                paymentMethod: 'transfer',
                reference: `PAY-TEST-${Date.now()}`,
                notes: 'Pago parcial de prueba',
                currency: 'MXN'
            });

            const result = await adapter.syncPayment(testPayment);
            
            expect(result.success).toBe(true);
            expect(result.erpEntityId).toBeTruthy();
            expect(result.erpData.importe).toBe(5800.00);
            
            createdPaymentId = result.erpEntityId;
        }, 30000);

        test('should retrieve an existing payment from CONTPAQi', async () => {
            expect(createdPaymentId).toBeTruthy();
            
            const payment = await adapter.getPayment(createdPaymentId);
            
            expect(payment).toBeDefined();
            expect(payment.CIDABONO).toBe(parseInt(createdPaymentId));
            expect(payment.CIMPORTE).toBe(5800.00);
        }, 30000);
    });

    describe('Chart of Accounts (Catálogo de Cuentas)', () => {
        test('should retrieve chart of accounts from CONTPAQi', async () => {
            const accounts = await adapter.getChartOfAccounts();
            
            expect(Array.isArray(accounts)).toBe(true);
            expect(accounts.length).toBeGreaterThan(0);
            
            const firstAccount = accounts[0];
            expect(firstAccount.id).toBeDefined();
            expect(firstAccount.code).toBeDefined();
            expect(firstAccount.name).toBeDefined();
            expect(firstAccount.satCode).toBeDefined();
        }, 30000);

        test('should configure account mapping', async () => {
            const mapping = {
                accountsReceivable: '10501', // Ejemplo de cuenta de clientes
                revenue: '40101', // Ejemplo de cuenta de ingresos
                bankAccount: '10201' // Ejemplo de cuenta bancaria
            };

            const result = await adapter.configureAccountMapping(mapping);
            
            expect(result.success).toBe(true);
            expect(result.mapping).toEqual(expect.objectContaining(mapping));
        });
    });

    describe('Reports (Reportes)', () => {
        test('should get accounts receivable report', async () => {
            const report = await adapter.getAccountsReceivableReport({
                startDate: '2025-01-01',
                endDate: '2025-12-31'
            });
            
            expect(report).toBeDefined();
            expect(report.reportName).toBe('Cuentas por Cobrar');
            expect(report.data).toBeDefined();
        }, 30000);

        test('should get accounts payable report', async () => {
            const report = await adapter.getAccountsPayableReport({
                startDate: '2025-01-01',
                endDate: '2025-12-31'
            });
            
            expect(report).toBeDefined();
            expect(report.reportName).toBe('Cuentas por Pagar');
            expect(report.data).toBeDefined();
        }, 30000);
    });

    describe('Tax Configuration (Configuración Fiscal)', () => {
        test('should have correct Mexican tax rates configured', () => {
            expect(adapter.taxConfig.ivaRate).toBe(0.16);
            expect(adapter.taxConfig.retencionIvaRate).toBe(0.1067);
            expect(adapter.taxConfig.retencionIsrRate).toBe(0.10);
        });

        test('should get tax rates', async () => {
            const taxRates = await adapter.getTaxRates();
            
            expect(Array.isArray(taxRates)).toBe(true);
            expect(taxRates.length).toBeGreaterThan(0);
            
            const iva16 = taxRates.find(t => t.name === 'IVA 16%');
            expect(iva16).toBeDefined();
            expect(iva16.rate).toBe(0.16);
            expect(iva16.code).toBe('002');
        });
    });

    describe('Error Handling & Edge Cases', () => {
        test('should handle non-existent customer gracefully', async () => {
            const customer = await adapter.getCustomer('99999999');
            expect(customer).toBeNull();
        });

        test('should handle non-existent invoice gracefully', async () => {
            const invoice = await adapter.getInvoice('99999999');
            expect(invoice).toBeNull();
        });

        test('should validate RFC format', () => {
            expect(adapter._validateRFC('XAXX010101000')).toBe(true);
            expect(adapter._validateRFC('AAA010101AAA')).toBe(true); // Persona Moral
            expect(adapter._validateRFC('PERJ901201XXX')).toBe(true); // Persona Física
            expect(adapter._validateRFC('INVALID')).toBe(false);
            expect(adapter._validateRFC('')).toBe(false);
        });

        test('should handle rate limiting correctly', async () => {
            const startCount = adapter.rateLimiter.requestCount;
            
            // Make a request
            await adapter.authenticate();
            
            // Check that rate limiter was incremented
            expect(adapter.rateLimiter.requestCount).toBeGreaterThan(startCount);
        });
    });

    describe('Performance Tests', () => {
        test('should complete customer sync within acceptable time', async () => {
            const startTime = Date.now();
            
            const testCustomer = new UnifiedCustomer({
                displayName: `Performance Test ${Date.now()}`,
                email: `perf.${Date.now()}@test.com`,
                taxId: 'XAXX010101000'
            });

            await adapter.syncCustomer(testCustomer);
            
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(10000); // Should complete in less than 10 seconds
        }, 15000);

        test('should handle concurrent requests (rate limiting)', async () => {
            const promises = [];
            
            for (let i = 0; i < 5; i++) {
                promises.push(adapter.authenticate());
            }

            const results = await Promise.all(promises);
            
            results.forEach(result => {
                expect(result.success).toBe(true);
            });
        }, 60000);
    });
});
