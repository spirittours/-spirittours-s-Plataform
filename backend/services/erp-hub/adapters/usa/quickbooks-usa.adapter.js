/**
 * QuickBooks Online USA Adapter
 * 
 * Implementación concreta del adaptador para QuickBooks Online en Estados Unidos.
 * Utiliza OAuth 2.0 para autenticación y QuickBooks API v3.
 * 
 * Características:
 * - OAuth 2.0 authentication flow
 * - Sync de clientes, facturas, pagos
 * - Mapeo automático de cuentas contables
 * - Manejo de errores y reintentos
 * - Rate limiting y throttling
 * 
 * @class QuickBooksUSAAdapter
 * @extends AccountingAdapter
 * @see https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer
 */

const AccountingAdapter = require('../../base-adapter');
const axios = require('axios');
const OAuthClient = require('intuit-oauth');

class QuickBooksUSAAdapter extends AccountingAdapter {
    constructor(credentials = {}, config = {}) {
        super(config);
        
        this.credentials = {
            clientId: credentials.clientId || process.env.QB_CLIENT_ID,
            clientSecret: credentials.clientSecret || process.env.QB_CLIENT_SECRET,
            redirectUri: credentials.redirectUri || process.env.QB_REDIRECT_URI,
            realmId: credentials.realmId, // Company ID
            accessToken: credentials.accessToken,
            refreshToken: credentials.refreshToken,
            ...credentials
        };

        this.config = {
            environment: config.environment || 'production', // sandbox or production
            apiVersion: config.apiVersion || 'v3',
            minorVersion: config.minorVersion || '65',
            timeout: config.timeout || 30000,
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000,
            ...config
        };

        // Base URLs
        this.baseUrls = {
            sandbox: 'https://sandbox-quickbooks.api.intuit.com',
            production: 'https://quickbooks.api.intuit.com'
        };
        
        this.baseUrl = this.baseUrls[this.config.environment];
        this.apiEndpoint = `${this.baseUrl}/${this.config.apiVersion}/company/${this.credentials.realmId}`;

        // OAuth Client
        this.oauthClient = null;
        this._initOAuthClient();

        // Rate limiting
        this.rateLimiter = {
            requestsPerMinute: 500, // QuickBooks limit
            requestCount: 0,
            resetTime: Date.now() + 60000
        };
    }

    /**
     * Inicializa el cliente OAuth
     */
    _initOAuthClient() {
        if (!this.credentials.clientId || !this.credentials.clientSecret) {
            console.warn('QuickBooks OAuth credentials not configured');
            return;
        }

        this.oauthClient = new OAuthClient({
            clientId: this.credentials.clientId,
            clientSecret: this.credentials.clientSecret,
            environment: this.config.environment,
            redirectUri: this.credentials.redirectUri
        });

        // Si tenemos tokens, configurarlos
        if (this.credentials.accessToken && this.credentials.refreshToken) {
            this.oauthClient.setToken({
                access_token: this.credentials.accessToken,
                refresh_token: this.credentials.refreshToken,
                token_type: 'Bearer'
            });
        }
    }

    // ============================================================================
    // AUTHENTICATION & CONNECTION
    // ============================================================================

    /**
     * Autentica con QuickBooks usando OAuth 2.0
     * @param {Object} authData - Datos de autenticación
     * @returns {Promise<Object>} Token de acceso
     */
    async authenticate(authData = {}) {
        try {
            if (!this.oauthClient) {
                throw new Error('OAuth client not initialized');
            }

            // Si tenemos un código de autorización, intercambiarlo por tokens
            if (authData.authCode) {
                const authResponse = await this.oauthClient.createToken(authData.authCode);
                
                this.credentials.accessToken = authResponse.token.access_token;
                this.credentials.refreshToken = authResponse.token.refresh_token;
                this.credentials.realmId = authData.realmId || authResponse.token.realmId;
                
                // Actualizar endpoint con nuevo realmId
                this.apiEndpoint = `${this.baseUrl}/${this.config.apiVersion}/company/${this.credentials.realmId}`;
                
                this.isAuthenticated = true;
                
                return {
                    success: true,
                    accessToken: this.credentials.accessToken,
                    refreshToken: this.credentials.refreshToken,
                    realmId: this.credentials.realmId,
                    expiresIn: authResponse.token.expires_in
                };
            }

            // Si ya tenemos tokens, validarlos
            if (this.credentials.accessToken) {
                const isValid = await this.testConnection();
                if (isValid) {
                    this.isAuthenticated = true;
                    return { success: true, message: 'Already authenticated' };
                }
            }

            throw new Error('No authentication data provided');
        } catch (error) {
            this.isAuthenticated = false;
            throw new Error(`QuickBooks authentication failed: ${error.message}`);
        }
    }

    /**
     * Refresca el token de acceso
     */
    async _refreshAccessToken() {
        if (!this.oauthClient || !this.credentials.refreshToken) {
            throw new Error('Cannot refresh token: OAuth client or refresh token missing');
        }

        try {
            const authResponse = await this.oauthClient.refresh();
            
            this.credentials.accessToken = authResponse.token.access_token;
            this.credentials.refreshToken = authResponse.token.refresh_token;
            
            this.oauthClient.setToken(authResponse.token);
            
            return {
                accessToken: this.credentials.accessToken,
                refreshToken: this.credentials.refreshToken
            };
        } catch (error) {
            throw new Error(`Token refresh failed: ${error.message}`);
        }
    }

    /**
     * Desconecta de QuickBooks
     */
    async disconnect() {
        try {
            if (this.oauthClient && this.credentials.accessToken) {
                await this.oauthClient.revoke();
            }
            
            this.credentials.accessToken = null;
            this.credentials.refreshToken = null;
            this.isAuthenticated = false;
            
            return { success: true, message: 'Disconnected successfully' };
        } catch (error) {
            throw new Error(`Disconnect failed: ${error.message}`);
        }
    }

    /**
     * Prueba la conexión con QuickBooks
     */
    async testConnection() {
        try {
            const response = await this._makeRequest('GET', '/companyinfo/' + this.credentials.realmId);
            return response && response.CompanyInfo;
        } catch (error) {
            console.error('Connection test failed:', error.message);
            return false;
        }
    }

    // ============================================================================
    // CUSTOMER SYNC
    // ============================================================================

    /**
     * Sincroniza un cliente a QuickBooks
     * @param {Object} unifiedCustomer - Cliente en formato UnifiedCustomer
     * @returns {Promise<Object>} Resultado de sincronización
     */
    async syncCustomer(unifiedCustomer) {
        try {
            // Verificar si el cliente ya existe
            let existingCustomer = null;
            if (unifiedCustomer.erpId) {
                existingCustomer = await this.getCustomer(unifiedCustomer.erpId);
            } else {
                // Buscar por email
                existingCustomer = await this._findCustomerByEmail(unifiedCustomer.email);
            }

            const qbCustomer = this._mapToQuickBooksCustomer(unifiedCustomer, existingCustomer);

            let result;
            if (existingCustomer) {
                // Actualizar cliente existente
                qbCustomer.Id = existingCustomer.Id;
                qbCustomer.SyncToken = existingCustomer.SyncToken;
                result = await this._makeRequest('POST', '/customer', qbCustomer);
            } else {
                // Crear nuevo cliente
                result = await this._makeRequest('POST', '/customer', qbCustomer);
            }

            return {
                success: true,
                erpEntityId: result.Customer.Id,
                erpEntityNumber: result.Customer.DisplayName,
                data: result.Customer
            };
        } catch (error) {
            throw new Error(`Customer sync failed: ${error.message}`);
        }
    }

    /**
     * Obtiene un cliente de QuickBooks
     */
    async getCustomer(customerId) {
        try {
            const response = await this._makeRequest('GET', `/customer/${customerId}`);
            return response.Customer;
        } catch (error) {
            if (error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Actualiza un cliente en QuickBooks
     */
    async updateCustomer(customerId, unifiedCustomer) {
        try {
            const existingCustomer = await this.getCustomer(customerId);
            if (!existingCustomer) {
                throw new Error(`Customer ${customerId} not found`);
            }

            const qbCustomer = this._mapToQuickBooksCustomer(unifiedCustomer, existingCustomer);
            qbCustomer.Id = customerId;
            qbCustomer.SyncToken = existingCustomer.SyncToken;

            const result = await this._makeRequest('POST', '/customer', qbCustomer);
            
            return {
                success: true,
                data: result.Customer
            };
        } catch (error) {
            throw new Error(`Customer update failed: ${error.message}`);
        }
    }

    // ============================================================================
    // INVOICE SYNC
    // ============================================================================

    /**
     * Sincroniza una factura a QuickBooks
     */
    async syncInvoice(unifiedInvoice) {
        try {
            // Verificar que el cliente exista
            const customer = await this.getCustomer(unifiedInvoice.erpCustomerId);
            if (!customer) {
                throw new Error(`Customer ${unifiedInvoice.erpCustomerId} not found in QuickBooks`);
            }

            // Mapear a formato QuickBooks
            const qbInvoice = await this._mapToQuickBooksInvoice(unifiedInvoice);

            // Crear factura
            const result = await this._makeRequest('POST', '/invoice', qbInvoice);

            return {
                success: true,
                erpEntityId: result.Invoice.Id,
                erpEntityNumber: result.Invoice.DocNumber,
                data: result.Invoice
            };
        } catch (error) {
            throw new Error(`Invoice sync failed: ${error.message}`);
        }
    }

    /**
     * Obtiene una factura de QuickBooks
     */
    async getInvoice(invoiceId) {
        try {
            const response = await this._makeRequest('GET', `/invoice/${invoiceId}`);
            return response.Invoice;
        } catch (error) {
            if (error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Actualiza una factura en QuickBooks
     */
    async updateInvoice(invoiceId, unifiedInvoice) {
        try {
            const existingInvoice = await this.getInvoice(invoiceId);
            if (!existingInvoice) {
                throw new Error(`Invoice ${invoiceId} not found`);
            }

            const qbInvoice = await this._mapToQuickBooksInvoice(unifiedInvoice, existingInvoice);
            qbInvoice.Id = invoiceId;
            qbInvoice.SyncToken = existingInvoice.SyncToken;

            const result = await this._makeRequest('POST', '/invoice', qbInvoice);

            return {
                success: true,
                data: result.Invoice
            };
        } catch (error) {
            throw new Error(`Invoice update failed: ${error.message}`);
        }
    }

    /**
     * Anula una factura en QuickBooks
     */
    async voidInvoice(invoiceId) {
        try {
            const invoice = await this.getInvoice(invoiceId);
            if (!invoice) {
                throw new Error(`Invoice ${invoiceId} not found`);
            }

            const result = await this._makeRequest('POST', `/invoice/${invoiceId}/void`, {
                Id: invoiceId,
                SyncToken: invoice.SyncToken
            });

            return {
                success: true,
                data: result.Invoice
            };
        } catch (error) {
            throw new Error(`Invoice void failed: ${error.message}`);
        }
    }

    // ============================================================================
    // PAYMENT SYNC
    // ============================================================================

    /**
     * Sincroniza un pago a QuickBooks
     */
    async syncPayment(unifiedPayment) {
        try {
            const qbPayment = await this._mapToQuickBooksPayment(unifiedPayment);
            const result = await this._makeRequest('POST', '/payment', qbPayment);

            return {
                success: true,
                erpEntityId: result.Payment.Id,
                data: result.Payment
            };
        } catch (error) {
            throw new Error(`Payment sync failed: ${error.message}`);
        }
    }

    /**
     * Obtiene un pago de QuickBooks
     */
    async getPayment(paymentId) {
        try {
            const response = await this._makeRequest('GET', `/payment/${paymentId}`);
            return response.Payment;
        } catch (error) {
            if (error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }

    // ============================================================================
    // REPORTS
    // ============================================================================

    /**
     * Obtiene reporte Profit & Loss
     */
    async getProfitAndLossReport(startDate, endDate) {
        try {
            const params = {
                start_date: this._formatDate(startDate),
                end_date: this._formatDate(endDate),
                accounting_method: 'Accrual'
            };

            const response = await this._makeRequest('GET', '/reports/ProfitAndLoss', null, params);
            return response;
        } catch (error) {
            throw new Error(`P&L report failed: ${error.message}`);
        }
    }

    /**
     * Obtiene reporte Balance Sheet
     */
    async getBalanceSheetReport(asOfDate) {
        try {
            const params = {
                date: this._formatDate(asOfDate),
                accounting_method: 'Accrual'
            };

            const response = await this._makeRequest('GET', '/reports/BalanceSheet', null, params);
            return response;
        } catch (error) {
            throw new Error(`Balance Sheet report failed: ${error.message}`);
        }
    }

    // ============================================================================
    // CHART OF ACCOUNTS
    // ============================================================================

    /**
     * Obtiene el catálogo de cuentas
     */
    async getChartOfAccounts() {
        try {
            const query = "SELECT * FROM Account WHERE Active = true";
            const response = await this._makeRequest('GET', '/query', null, { query });
            
            return response.QueryResponse.Account || [];
        } catch (error) {
            throw new Error(`Chart of Accounts fetch failed: ${error.message}`);
        }
    }

    /**
     * Obtiene una cuenta específica
     */
    async getAccount(accountId) {
        try {
            const response = await this._makeRequest('GET', `/account/${accountId}`);
            return response.Account;
        } catch (error) {
            if (error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }

    // ============================================================================
    // HELPER METHODS - MAPPING
    // ============================================================================

    /**
     * Mapea UnifiedCustomer a formato QuickBooks
     */
    _mapToQuickBooksCustomer(unifiedCustomer, existingCustomer = null) {
        const qbCustomer = {
            DisplayName: unifiedCustomer.displayName || `${unifiedCustomer.givenName} ${unifiedCustomer.familyName}`,
            GivenName: unifiedCustomer.givenName,
            FamilyName: unifiedCustomer.familyName,
            CompanyName: unifiedCustomer.companyName,
            PrimaryEmailAddr: unifiedCustomer.email ? { Address: unifiedCustomer.email } : undefined,
            PrimaryPhone: unifiedCustomer.phone ? { FreeFormNumber: unifiedCustomer.phone } : undefined,
            CurrencyRef: { value: unifiedCustomer.currency || 'USD' }
        };

        // Billing address
        if (unifiedCustomer.billingAddress && unifiedCustomer.billingAddress.line1) {
            qbCustomer.BillAddr = {
                Line1: unifiedCustomer.billingAddress.line1,
                City: unifiedCustomer.billingAddress.city,
                CountrySubDivisionCode: unifiedCustomer.billingAddress.state,
                PostalCode: unifiedCustomer.billingAddress.postalCode,
                Country: unifiedCustomer.billingAddress.country
            };
        }

        // Tax ID
        if (unifiedCustomer.taxId) {
            qbCustomer.ResaleNum = unifiedCustomer.taxId;
        }

        return qbCustomer;
    }

    /**
     * Mapea UnifiedInvoice a formato QuickBooks
     */
    async _mapToQuickBooksInvoice(unifiedInvoice, existingInvoice = null) {
        const qbInvoice = {
            CustomerRef: { value: unifiedInvoice.erpCustomerId },
            TxnDate: this._formatDate(unifiedInvoice.txnDate),
            DueDate: unifiedInvoice.dueDate ? this._formatDate(unifiedInvoice.dueDate) : undefined,
            DocNumber: unifiedInvoice.invoiceNumber,
            CurrencyRef: { value: unifiedInvoice.currency || 'USD' },
            Line: []
        };

        // Line items
        for (const item of unifiedInvoice.lineItems) {
            qbInvoice.Line.push({
                DetailType: 'SalesItemLineDetail',
                Amount: item.amount,
                Description: item.description,
                SalesItemLineDetail: {
                    Qty: item.quantity || 1,
                    UnitPrice: item.unitPrice || item.amount,
                    ItemRef: item.erpItemId ? { value: item.erpItemId } : undefined
                }
            });
        }

        return qbInvoice;
    }

    /**
     * Mapea UnifiedPayment a formato QuickBooks
     */
    async _mapToQuickBooksPayment(unifiedPayment) {
        const qbPayment = {
            CustomerRef: { value: unifiedPayment.erpCustomerId },
            TotalAmt: unifiedPayment.amount,
            TxnDate: this._formatDate(unifiedPayment.paymentDate),
            PaymentRefNum: unifiedPayment.referenceNumber,
            CurrencyRef: { value: unifiedPayment.currency || 'USD' }
        };

        // Payment method
        if (unifiedPayment.paymentMethodErpId) {
            qbPayment.PaymentMethodRef = { value: unifiedPayment.paymentMethodErpId };
        }

        // Deposit to account
        if (unifiedPayment.depositToAccountErpId) {
            qbPayment.DepositToAccountRef = { value: unifiedPayment.depositToAccountErpId };
        }

        // Link to invoices
        if (unifiedPayment.linkedInvoices && unifiedPayment.linkedInvoices.length > 0) {
            qbPayment.Line = unifiedPayment.linkedInvoices.map(invoice => ({
                Amount: invoice.amountApplied,
                LinkedTxn: [{
                    TxnId: invoice.erpInvoiceId,
                    TxnType: 'Invoice'
                }]
            }));
        }

        return qbPayment;
    }

    /**
     * Busca cliente por email
     */
    async _findCustomerByEmail(email) {
        if (!email) return null;

        try {
            const query = `SELECT * FROM Customer WHERE PrimaryEmailAddr = '${email}' MAXRESULTS 1`;
            const response = await this._makeRequest('GET', '/query', null, { query });
            
            if (response.QueryResponse.Customer && response.QueryResponse.Customer.length > 0) {
                return response.QueryResponse.Customer[0];
            }
            return null;
        } catch (error) {
            console.error('Customer search failed:', error.message);
            return null;
        }
    }

    // ============================================================================
    // HELPER METHODS - API
    // ============================================================================

    /**
     * Realiza una petición a la API de QuickBooks
     */
    async _makeRequest(method, endpoint, data = null, params = null, attempt = 1) {
        // Rate limiting
        await this._checkRateLimit();

        try {
            if (!this.credentials.accessToken) {
                throw new Error('Not authenticated');
            }

            const url = endpoint.startsWith('/reports') || endpoint.startsWith('/query') 
                ? `${this.apiEndpoint}${endpoint}`
                : `${this.apiEndpoint}${endpoint}`;

            const config = {
                method,
                url,
                headers: {
                    'Authorization': `Bearer ${this.credentials.accessToken}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: this.config.timeout
            };

            if (data) {
                config.data = data;
            }

            if (params) {
                config.params = {
                    ...params,
                    minorversion: this.config.minorVersion
                };
            } else {
                config.params = { minorversion: this.config.minorVersion };
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            // Si es error 401, intentar refrescar token
            if (error.response && error.response.status === 401 && attempt === 1) {
                console.log('Token expired, refreshing...');
                await this._refreshAccessToken();
                return this._makeRequest(method, endpoint, data, params, attempt + 1);
            }

            // Reintentar en caso de errores temporales
            if (attempt < this.config.retryAttempts && this._isRetryableError(error)) {
                console.log(`Retrying request (attempt ${attempt + 1})...`);
                await this._delay(this.config.retryDelay * attempt);
                return this._makeRequest(method, endpoint, data, params, attempt + 1);
            }

            throw this._handleApiError(error);
        }
    }

    /**
     * Verifica rate limiting
     */
    async _checkRateLimit() {
        const now = Date.now();
        
        if (now > this.rateLimiter.resetTime) {
            this.rateLimiter.requestCount = 0;
            this.rateLimiter.resetTime = now + 60000;
        }

        if (this.rateLimiter.requestCount >= this.rateLimiter.requestsPerMinute) {
            const waitTime = this.rateLimiter.resetTime - now;
            console.log(`Rate limit reached, waiting ${waitTime}ms...`);
            await this._delay(waitTime);
            this.rateLimiter.requestCount = 0;
            this.rateLimiter.resetTime = Date.now() + 60000;
        }

        this.rateLimiter.requestCount++;
    }

    /**
     * Verifica si un error es reintentable
     */
    _isRetryableError(error) {
        if (!error.response) return true; // Network errors
        
        const status = error.response.status;
        return status === 429 || status >= 500;
    }

    /**
     * Maneja errores de la API
     */
    _handleApiError(error) {
        if (error.response) {
            const { status, data } = error.response;
            const message = data.Fault?.Error?.[0]?.Message || data.message || 'Unknown error';
            return new Error(`QuickBooks API Error (${status}): ${message}`);
        }
        return error;
    }

    /**
     * Formatea fecha a formato QuickBooks (YYYY-MM-DD)
     */
    _formatDate(date) {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    /**
     * Delay helper
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ============================================================================
    // NOT IMPLEMENTED (Vendor/Bill functionality)
    // ============================================================================

    async syncVendor(unifiedVendor) {
        throw new Error('Vendor sync not yet implemented for QuickBooks USA adapter');
    }

    async getVendor(vendorId) {
        throw new Error('Method not implemented');
    }

    async updateVendor(vendorId, unifiedVendor) {
        throw new Error('Method not implemented');
    }

    async syncBill(unifiedBill) {
        throw new Error('Bill sync not yet implemented for QuickBooks USA adapter');
    }

    async getBill(billId) {
        throw new Error('Method not implemented');
    }

    async updateBill(billId, unifiedBill) {
        throw new Error('Method not implemented');
    }

    async voidBill(billId) {
        throw new Error('Method not implemented');
    }

    async syncBillPayment(unifiedBillPayment) {
        throw new Error('Bill payment sync not yet implemented for QuickBooks USA adapter');
    }

    async getBillPayment(billPaymentId) {
        throw new Error('Method not implemented');
    }

    async syncCreditMemo(unifiedCreditMemo) {
        throw new Error('Credit memo sync not yet implemented for QuickBooks USA adapter');
    }
}

module.exports = QuickBooksUSAAdapter;
