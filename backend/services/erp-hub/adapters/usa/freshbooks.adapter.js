/**
 * FreshBooks USA Adapter
 * 
 * Implementación concreta del adaptador para FreshBooks en Estados Unidos.
 * Utiliza OAuth 2.0 para autenticación y FreshBooks API v3.
 * 
 * Características:
 * - OAuth 2.0 authentication flow
 * - Sync de clientes, facturas, pagos
 * - Manejo de múltiples negocios (business IDs)
 * - Sistema de contabilidad simplificado (no COA completo)
 * - Manejo de errores y reintentos
 * - Rate limiting (múltiples tipos según endpoint)
 * 
 * Nota: FreshBooks tiene un enfoque más simplificado que QuickBooks/Xero.
 * No tiene Chart of Accounts completo, usa categorías de gastos/ingresos.
 * 
 * @class FreshBooksAdapter
 * @extends AccountingAdapter
 * @see https://www.freshbooks.com/api/start
 */

const AccountingAdapter = require('../../base-adapter');
const axios = require('axios');

class FreshBooksAdapter extends AccountingAdapter {
    constructor(credentials = {}, config = {}) {
        super(config);
        
        this.credentials = {
            clientId: credentials.clientId || process.env.FRESHBOOKS_CLIENT_ID,
            clientSecret: credentials.clientSecret || process.env.FRESHBOOKS_CLIENT_SECRET,
            redirectUri: credentials.redirectUri || process.env.FRESHBOOKS_REDIRECT_URI,
            accountId: credentials.accountId, // FreshBooks Account ID
            businessId: credentials.businessId, // Business ID
            accessToken: credentials.accessToken,
            refreshToken: credentials.refreshToken,
            tokenExpiry: credentials.tokenExpiry,
            ...credentials
        };

        this.config = {
            environment: config.environment || 'production',
            apiVersion: config.apiVersion || 'v3',
            timeout: config.timeout || 30000,
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000,
            ...config
        };

        // Base URLs
        this.authBaseUrl = 'https://auth.freshbooks.com';
        this.apiBaseUrl = 'https://api.freshbooks.com';
        this.accountingBaseUrl = `${this.apiBaseUrl}/accounting/account/${this.credentials.accountId}`;

        // Rate limiting (varies by endpoint, using conservative limit)
        this.rateLimiter = {
            requestsPerMinute: 100,
            requestCount: 0,
            resetTime: Date.now() + 60000
        };
    }

    // ============================================================================
    // AUTHENTICATION & CONNECTION
    // ============================================================================

    /**
     * Autentica con FreshBooks usando OAuth 2.0
     * @param {Object} authData - Datos de autenticación
     * @param {string} authData.authorizationCode - Código de autorización OAuth
     * @returns {Promise<Object>} Resultado de autenticación
     */
    async authenticate(authData = {}) {
        try {
            if (authData.authorizationCode) {
                // Exchange authorization code for tokens
                const tokenData = await this._exchangeCodeForToken(authData.authorizationCode);
                
                this.credentials.accessToken = tokenData.access_token;
                this.credentials.refreshToken = tokenData.refresh_token;
                this.credentials.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

                // Get user profile to obtain account ID
                if (!this.credentials.accountId) {
                    const profile = await this._getUserProfile();
                    if (profile.business_memberships.length > 0) {
                        this.credentials.accountId = profile.business_memberships[0].business.account_id;
                        this.credentials.businessId = profile.business_memberships[0].business.id;
                        this.accountingBaseUrl = `${this.apiBaseUrl}/accounting/account/${this.credentials.accountId}`;
                    }
                }

                return {
                    success: true,
                    authenticated: true,
                    accountId: this.credentials.accountId,
                    businessId: this.credentials.businessId,
                    expiresIn: tokenData.expires_in
                };
            } else if (this.credentials.accessToken) {
                // Validate existing token
                const isValid = await this._validateToken();
                if (!isValid) {
                    await this._refreshAccessToken();
                }
                
                return {
                    success: true,
                    authenticated: true,
                    accountId: this.credentials.accountId,
                    businessId: this.credentials.businessId
                };
            } else {
                throw new Error('No authentication credentials provided');
            }
        } catch (error) {
            console.error('FreshBooks authentication error:', error.message);
            return {
                success: false,
                authenticated: false,
                error: error.message
            };
        }
    }

    /**
     * Exchange authorization code for access token
     * @private
     */
    async _exchangeCodeForToken(authorizationCode) {
        try {
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code: authorizationCode,
                redirect_uri: this.credentials.redirectUri,
                client_id: this.credentials.clientId,
                client_secret: this.credentials.clientSecret
            });

            const response = await axios.post(
                `${this.authBaseUrl}/oauth/token`,
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Token exchange error:', error.response?.data || error.message);
            throw new Error(`Failed to exchange authorization code: ${error.message}`);
        }
    }

    /**
     * Refresh access token using refresh token
     * @private
     */
    async _refreshAccessToken() {
        try {
            const params = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: this.credentials.refreshToken,
                client_id: this.credentials.clientId,
                client_secret: this.credentials.clientSecret
            });

            const response = await axios.post(
                `${this.authBaseUrl}/oauth/token`,
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.credentials.accessToken = response.data.access_token;
            this.credentials.refreshToken = response.data.refresh_token;
            this.credentials.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            return response.data;
        } catch (error) {
            console.error('Token refresh error:', error.response?.data || error.message);
            throw new Error(`Failed to refresh token: ${error.message}`);
        }
    }

    /**
     * Get user profile and business memberships
     * @private
     */
    async _getUserProfile() {
        try {
            const response = await axios.get(`${this.authBaseUrl}/api/v1/users/me`, {
                headers: {
                    'Authorization': `Bearer ${this.credentials.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.response;
        } catch (error) {
            console.error('Get user profile error:', error.message);
            throw error;
        }
    }

    /**
     * Validate if current token is still valid
     * @private
     */
    async _validateToken() {
        if (!this.credentials.accessToken) return false;
        
        // Check expiry time (refresh 5 minutes before expiry)
        if (this.credentials.tokenExpiry && this.credentials.tokenExpiry < (Date.now() + 300000)) {
            return false;
        }

        // Try a simple API call to verify token
        try {
            await this._getUserProfile();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Verifica el estado de conexión con FreshBooks
     * @returns {Promise<Object>} Estado de conexión
     */
    async testConnection() {
        try {
            const profile = await this._getUserProfile();
            const business = profile.business_memberships[0]?.business;
            
            return {
                success: true,
                connected: true,
                account: {
                    name: `${profile.first_name} ${profile.last_name}`,
                    email: profile.email,
                    businessName: business?.name,
                    accountId: business?.account_id,
                    businessId: business?.id
                }
            };
        } catch (error) {
            return {
                success: false,
                connected: false,
                error: error.message
            };
        }
    }

    /**
     * Desconecta de FreshBooks (limpia credenciales)
     * Nota: FreshBooks no tiene endpoint de revocación
     * @returns {Promise<Object>} Resultado de desconexión
     */
    async disconnect() {
        try {
            // FreshBooks doesn't have a token revocation endpoint
            // Just clear local credentials
            this.credentials.accessToken = null;
            this.credentials.refreshToken = null;
            this.credentials.accountId = null;
            this.credentials.businessId = null;
            this.credentials.tokenExpiry = null;

            return { success: true, disconnected: true };
        } catch (error) {
            console.error('FreshBooks disconnect error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ============================================================================
    // CUSTOMER OPERATIONS (Clients in FreshBooks)
    // ============================================================================

    /**
     * Sincroniza un cliente a FreshBooks
     * @param {UnifiedCustomer} unifiedCustomer - Cliente en formato unificado
     * @returns {Promise<Object>} Resultado de sincronización
     */
    async syncCustomer(unifiedCustomer) {
        try {
            let existingClient = null;

            // Check if client already exists in FreshBooks
            if (unifiedCustomer.erpId) {
                existingClient = await this.getCustomer(unifiedCustomer.erpId);
            }

            // Map to FreshBooks Client format
            const fbClient = this._mapToFreshBooksClient(unifiedCustomer, existingClient);

            let result;
            if (existingClient) {
                // Update existing client
                result = await this._makeRequest(
                    'PUT',
                    `/users/clients/${existingClient.id}`,
                    { client: fbClient }
                );
            } else {
                // Create new client
                result = await this._makeRequest('POST', '/users/clients', { client: fbClient });
            }

            const client = result.response.result.client;

            return {
                success: true,
                erpEntityId: client.id.toString(),
                erpEntityNumber: null, // FreshBooks doesn't have client numbers
                erpData: {
                    organization: client.organization,
                    email: client.email,
                    fname: client.fname,
                    lname: client.lname
                }
            };
        } catch (error) {
            console.error('Sync customer to FreshBooks error:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene un cliente de FreshBooks por ID
     * @param {string} clientId - ID del cliente en FreshBooks
     * @returns {Promise<Object>} Datos del cliente
     */
    async getCustomer(clientId) {
        try {
            const response = await this._makeRequest('GET', `/users/clients/${clientId}`);
            return response.response.result.client || null;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Busca clientes en FreshBooks
     * @param {Object} filters - Filtros de búsqueda
     * @returns {Promise<Array>} Lista de clientes encontrados
     */
    async searchCustomers(filters = {}) {
        try {
            const params = {};
            
            if (filters.email) {
                params.email = filters.email;
            }
            if (filters.name) {
                params.search = filters.name;
            }

            const response = await this._makeRequest('GET', '/users/clients', null, params);
            return response.response.result.clients || [];
        } catch (error) {
            console.error('Search customers in FreshBooks error:', error.message);
            return [];
        }
    }

    /**
     * Map UnifiedCustomer to FreshBooks Client format
     * @private
     */
    _mapToFreshBooksClient(unifiedCustomer, existingClient = null) {
        const client = {
            organization: unifiedCustomer.displayName,
            fname: unifiedCustomer.givenName || '',
            lname: unifiedCustomer.familyName || '',
            email: unifiedCustomer.email || '',
            currency_code: unifiedCustomer.currency || 'USD'
        };

        // Add address
        if (unifiedCustomer.billingAddress && unifiedCustomer.billingAddress.line1) {
            client.p_street = unifiedCustomer.billingAddress.line1;
            client.p_street2 = unifiedCustomer.billingAddress.line2 || '';
            client.p_city = unifiedCustomer.billingAddress.city || '';
            client.p_province = unifiedCustomer.billingAddress.state || '';
            client.p_code = unifiedCustomer.billingAddress.postalCode || '';
            client.p_country = unifiedCustomer.billingAddress.country || 'US';
        }

        // Add phone
        if (unifiedCustomer.phoneNumber) {
            client.home_phone = unifiedCustomer.phoneNumber;
        }

        return client;
    }

    // ============================================================================
    // INVOICE OPERATIONS
    // ============================================================================

    /**
     * Sincroniza una factura a FreshBooks
     * @param {UnifiedInvoice} unifiedInvoice - Factura en formato unificado
     * @returns {Promise<Object>} Resultado de sincronización
     */
    async syncInvoice(unifiedInvoice) {
        try {
            // Ensure customer exists in FreshBooks
            if (!unifiedInvoice.erpCustomerId) {
                throw new Error('Customer must be synced to FreshBooks before syncing invoice (missing erpCustomerId)');
            }

            let existingInvoice = null;

            // Check if invoice already exists
            if (unifiedInvoice.erpId) {
                existingInvoice = await this.getInvoice(unifiedInvoice.erpId);
            }

            // Map to FreshBooks Invoice format
            const fbInvoice = this._mapToFreshBooksInvoice(unifiedInvoice, existingInvoice);

            let result;
            if (existingInvoice) {
                // Update existing invoice (only if status allows)
                if (existingInvoice.v3_status === 'draft' || existingInvoice.v3_status === 'sent') {
                    result = await this._makeRequest(
                        'PUT',
                        `/invoices/invoices/${existingInvoice.id}`,
                        { invoice: fbInvoice }
                    );
                } else {
                    throw new Error(`Cannot update invoice in status: ${existingInvoice.v3_status}`);
                }
            } else {
                // Create new invoice
                result = await this._makeRequest('POST', '/invoices/invoices', { invoice: fbInvoice });
            }

            const invoice = result.response.result.invoice;

            return {
                success: true,
                erpEntityId: invoice.id.toString(),
                erpEntityNumber: invoice.invoice_number || null,
                erpData: {
                    invoiceNumber: invoice.invoice_number,
                    status: invoice.v3_status,
                    total: invoice.amount.amount,
                    outstanding: invoice.outstanding.amount
                }
            };
        } catch (error) {
            console.error('Sync invoice to FreshBooks error:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene una factura de FreshBooks por ID
     * @param {string} invoiceId - ID de la factura en FreshBooks
     * @returns {Promise<Object>} Datos de la factura
     */
    async getInvoice(invoiceId) {
        try {
            const response = await this._makeRequest('GET', `/invoices/invoices/${invoiceId}`);
            return response.response.result.invoice || null;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Map UnifiedInvoice to FreshBooks Invoice format
     * @private
     */
    _mapToFreshBooksInvoice(unifiedInvoice, existingInvoice = null) {
        const invoice = {
            customerid: parseInt(unifiedInvoice.erpCustomerId),
            create_date: this._formatDate(unifiedInvoice.date),
            due_date: this._formatDate(unifiedInvoice.dueDate),
            status: unifiedInvoice.status === 'paid' ? 4 : 1, // 1=draft, 4=paid
            currency_code: unifiedInvoice.currency || 'USD',
            lines: []
        };

        // Add custom invoice number if provided
        if (unifiedInvoice.invoiceNumber) {
            invoice.invoice_number = unifiedInvoice.invoiceNumber;
        }

        // Map line items
        unifiedInvoice.lineItems.forEach((item, index) => {
            const line = {
                name: item.description,
                description: item.description,
                qty: item.quantity,
                unit_cost: {
                    amount: item.unitPrice.toFixed(2),
                    code: unifiedInvoice.currency || 'USD'
                }
            };

            // Add tax if present
            if (item.taxAmount && item.taxAmount > 0) {
                const taxRate = ((item.taxAmount / (item.quantity * item.unitPrice)) * 100).toFixed(2);
                line.tax_name1 = 'Sales Tax';
                line.tax_amount1 = taxRate;
            }

            invoice.lines.push(line);
        });

        return invoice;
    }

    // ============================================================================
    // PAYMENT OPERATIONS
    // ============================================================================

    /**
     * Sincroniza un pago a FreshBooks
     * @param {UnifiedPayment} unifiedPayment - Pago en formato unificado
     * @returns {Promise<Object>} Resultado de sincronización
     */
    async syncPayment(unifiedPayment) {
        try {
            // Ensure invoice exists in FreshBooks
            if (!unifiedPayment.erpInvoiceId) {
                throw new Error('Invoice must be synced to FreshBooks before syncing payment (missing erpInvoiceId)');
            }

            // Get the invoice to link payment
            const invoice = await this.getInvoice(unifiedPayment.erpInvoiceId);
            if (!invoice) {
                throw new Error(`Invoice not found in FreshBooks: ${unifiedPayment.erpInvoiceId}`);
            }

            // Map to FreshBooks Payment format
            const fbPayment = this._mapToFreshBooksPayment(unifiedPayment, invoice);

            // Create payment
            const result = await this._makeRequest('POST', '/payments/payments', { payment: fbPayment });
            const payment = result.response.result.payment;

            return {
                success: true,
                erpEntityId: payment.id.toString(),
                erpData: {
                    paymentId: payment.id,
                    amount: payment.amount.amount,
                    date: payment.date,
                    type: payment.type
                }
            };
        } catch (error) {
            console.error('Sync payment to FreshBooks error:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene un pago de FreshBooks por ID
     * @param {string} paymentId - ID del pago en FreshBooks
     * @returns {Promise<Object>} Datos del pago
     */
    async getPayment(paymentId) {
        try {
            const response = await this._makeRequest('GET', `/payments/payments/${paymentId}`);
            return response.response.result.payment || null;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Map UnifiedPayment to FreshBooks Payment format
     * @private
     */
    _mapToFreshBooksPayment(unifiedPayment, invoice) {
        const payment = {
            invoiceid: parseInt(unifiedPayment.erpInvoiceId),
            amount: {
                amount: unifiedPayment.amount.toFixed(2),
                code: unifiedPayment.currency || 'USD'
            },
            date: this._formatDate(unifiedPayment.date),
            type: unifiedPayment.paymentMethod || 'other'
        };

        // Add note/reference if provided
        if (unifiedPayment.reference) {
            payment.note = unifiedPayment.reference;
        }

        return payment;
    }

    // ============================================================================
    // REPORTS
    // ============================================================================

    /**
     * Obtiene reporte de cuentas por cobrar
     * @param {Object} options - Opciones de reporte
     * @returns {Promise<Object>} Datos del reporte
     */
    async getAccountsReceivableReport(options = {}) {
        try {
            // FreshBooks doesn't have dedicated AR report endpoint
            // We'll build it from outstanding invoices
            const params = {
                date_min: options.startDate || undefined,
                date_max: options.endDate || undefined,
                statuses: 'sent,partial,viewed'
            };

            const response = await this._makeRequest('GET', '/invoices/invoices', null, params);
            const invoices = response.response.result.invoices || [];

            const totalAR = invoices.reduce((sum, inv) => {
                return sum + parseFloat(inv.outstanding.amount);
            }, 0);

            return {
                reportName: 'Accounts Receivable',
                reportDate: new Date().toISOString(),
                totalOutstanding: totalAR,
                invoices: invoices.map(inv => ({
                    id: inv.id,
                    invoiceNumber: inv.invoice_number,
                    customerName: inv.organization,
                    dueDate: inv.due_date,
                    amount: inv.amount.amount,
                    outstanding: inv.outstanding.amount,
                    status: inv.v3_status
                }))
            };
        } catch (error) {
            console.error('Get AR report error:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene reporte de cuentas por pagar
     * @param {Object} options - Opciones de reporte
     * @returns {Promise<Object>} Datos del reporte
     */
    async getAccountsPayableReport(options = {}) {
        try {
            // FreshBooks primarily focuses on AR, not AP
            // Expenses can be used as proxy for payables
            const params = {
                date_min: options.startDate || undefined,
                date_max: options.endDate || undefined,
                status: 'unpaid'
            };

            const response = await this._makeRequest('GET', '/expenses/expenses', null, params);
            const expenses = response.response.result.expenses || [];

            const totalAP = expenses.reduce((sum, exp) => {
                return sum + parseFloat(exp.amount.amount);
            }, 0);

            return {
                reportName: 'Accounts Payable (Expenses)',
                reportDate: new Date().toISOString(),
                totalUnpaid: totalAP,
                expenses: expenses.map(exp => ({
                    id: exp.id,
                    vendor: exp.vendor,
                    date: exp.date,
                    amount: exp.amount.amount,
                    categoryName: exp.categoryName,
                    status: exp.status
                }))
            };
        } catch (error) {
            console.error('Get AP report error:', error.message);
            throw error;
        }
    }

    // ============================================================================
    // CHART OF ACCOUNTS (Limited in FreshBooks)
    // ============================================================================

    /**
     * FreshBooks no tiene un Chart of Accounts tradicional
     * Usa categorías de ingresos/gastos
     * @returns {Promise<Array>} Lista de categorías
     */
    async getChartOfAccounts() {
        try {
            // Get expense categories (closest thing to COA in FreshBooks)
            const response = await this._makeRequest('GET', '/expenses/categories');
            const categories = response.response.result.categories || [];

            return categories.map(cat => ({
                id: cat.id.toString(),
                name: cat.category,
                type: 'Expense',
                parentId: cat.parentid || null,
                isEditable: cat.is_editable
            }));
        } catch (error) {
            console.error('Get categories error:', error.message);
            throw error;
        }
    }

    /**
     * Configura el mapeo de cuentas (no aplicable en FreshBooks)
     * @param {Object} mapping - Mapeo de cuentas
     */
    async configureAccountMapping(mapping) {
        // FreshBooks doesn't have account mapping like QB/Xero
        console.warn('Account mapping not applicable for FreshBooks');
        return { success: true, note: 'Account mapping not applicable for FreshBooks' };
    }

    // ============================================================================
    // TAX RATES
    // ============================================================================

    /**
     * Obtiene las tasas de impuestos configuradas
     * @returns {Promise<Array>} Lista de tasas de impuestos
     */
    async getTaxRates() {
        try {
            const response = await this._makeRequest('GET', '/taxes/taxes');
            const taxes = response.response.result.taxes || [];

            return taxes.map(tax => ({
                name: tax.name,
                taxNumber: tax.number,
                amount: tax.amount,
                compound: tax.compound
            }));
        } catch (error) {
            console.error('Get tax rates error:', error.message);
            throw error;
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Realiza una petición HTTP a la API de FreshBooks
     * @private
     */
    async _makeRequest(method, endpoint, data = null, params = null, attempt = 1) {
        // Check rate limit
        await this._checkRateLimit();

        // Check token expiry
        if (this.credentials.tokenExpiry && this.credentials.tokenExpiry < (Date.now() + 300000)) {
            await this._refreshAccessToken();
        }

        const config = {
            method,
            url: `${this.accountingBaseUrl}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${this.credentials.accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: this.config.timeout
        };

        if (data) {
            config.data = data;
        }

        if (params) {
            config.params = params;
        }

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            // Handle token expiration
            if (error.response?.status === 401 && attempt === 1) {
                await this._refreshAccessToken();
                return this._makeRequest(method, endpoint, data, params, attempt + 1);
            }

            // Retry on transient errors
            if (attempt < this.config.retryAttempts && this._isRetryableError(error)) {
                const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                await this._delay(delay);
                return this._makeRequest(method, endpoint, data, params, attempt + 1);
            }

            // Log error details
            console.error('FreshBooks API request error:', {
                method,
                endpoint,
                status: error.response?.status,
                message: error.response?.data?.message || error.message,
                details: error.response?.data
            });

            throw error;
        }
    }

    /**
     * Check and enforce rate limiting
     * @private
     */
    async _checkRateLimit() {
        const now = Date.now();

        if (now >= this.rateLimiter.resetTime) {
            // Reset counter
            this.rateLimiter.requestCount = 0;
            this.rateLimiter.resetTime = now + 60000;
        }

        if (this.rateLimiter.requestCount >= this.rateLimiter.requestsPerMinute) {
            // Wait until reset time
            const waitTime = this.rateLimiter.resetTime - now;
            console.log(`Rate limit reached, waiting ${waitTime}ms`);
            await this._delay(waitTime);
            this.rateLimiter.requestCount = 0;
            this.rateLimiter.resetTime = Date.now() + 60000;
        }

        this.rateLimiter.requestCount++;
    }

    /**
     * Determine if error is retryable
     * @private
     */
    _isRetryableError(error) {
        if (!error.response) return true; // Network errors

        const status = error.response.status;
        return status === 429 || status === 503 || status >= 500;
    }

    /**
     * Delay execution
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Format date to FreshBooks format (YYYY-MM-DD)
     * @private
     */
    _formatDate(date) {
        if (!date) return null;
        
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    // ============================================================================
    // UNIMPLEMENTED METHODS (from base adapter)
    // ============================================================================

    async syncVendor(unifiedVendor) {
        throw new Error('FreshBooks does not have separate vendor management. Use Expenses instead.');
    }

    async getVendor(vendorId) {
        throw new Error('FreshBooks does not have separate vendor management.');
    }

    async searchVendors(filters = {}) {
        throw new Error('FreshBooks does not have separate vendor management.');
    }

    async syncBill(unifiedBill) {
        throw new Error('FreshBooks does not have bills. Use Expenses instead.');
    }

    async getBill(billId) {
        throw new Error('FreshBooks does not have bills. Use Expenses instead.');
    }

    async syncBillPayment(unifiedBillPayment) {
        throw new Error('FreshBooks does not have bill payments. Use Expense payments instead.');
    }

    async getBillPayment(paymentId) {
        throw new Error('FreshBooks does not have bill payments.');
    }

    async createJournalEntry(unifiedJournalEntry) {
        throw new Error('FreshBooks does not support manual journal entries.');
    }

    async getBalanceSheet(options = {}) {
        throw new Error('FreshBooks API does not provide direct Balance Sheet access. Use reports dashboard.');
    }

    async getProfitAndLoss(options = {}) {
        throw new Error('FreshBooks API does not provide direct P&L access. Use reports dashboard.');
    }

    async getCashFlowStatement(options = {}) {
        throw new Error('FreshBooks API does not provide direct Cash Flow statement access.');
    }
}

module.exports = FreshBooksAdapter;
