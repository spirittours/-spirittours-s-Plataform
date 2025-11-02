/**
 * Xero USA Adapter
 * 
 * Implementación concreta del adaptador para Xero en Estados Unidos.
 * Utiliza OAuth 2.0 con PKCE para autenticación y Xero Accounting API.
 * 
 * Características:
 * - OAuth 2.0 con PKCE (Proof Key for Code Exchange)
 * - Sync de clientes (Contacts), facturas (Invoices), pagos (Payments)
 * - Mapeo automático de cuentas contables
 * - Manejo de errores y reintentos
 * - Rate limiting (60 requests/minute)
 * - Multi-tenancy support (Xero organizations)
 * 
 * @class XeroUSAAdapter
 * @extends AccountingAdapter
 * @see https://developer.xero.com/documentation/api/accounting/overview
 */

const AccountingAdapter = require('../../base-adapter');
const axios = require('axios');
const crypto = require('crypto');

class XeroUSAAdapter extends AccountingAdapter {
    constructor(credentials = {}, config = {}) {
        super(config);
        
        this.credentials = {
            clientId: credentials.clientId || process.env.XERO_CLIENT_ID,
            clientSecret: credentials.clientSecret || process.env.XERO_CLIENT_SECRET,
            redirectUri: credentials.redirectUri || process.env.XERO_REDIRECT_URI,
            tenantId: credentials.tenantId, // Xero Organization ID
            accessToken: credentials.accessToken,
            refreshToken: credentials.refreshToken,
            tokenExpiry: credentials.tokenExpiry,
            ...credentials
        };

        this.config = {
            environment: config.environment || 'production', // Xero doesn't have sandbox in same way
            apiVersion: config.apiVersion || '2.0',
            timeout: config.timeout || 30000,
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000,
            ...config
        };

        // Base URLs
        this.authBaseUrl = 'https://login.xero.com';
        this.apiBaseUrl = 'https://api.xero.com/api.xro/2.0';
        this.identityBaseUrl = 'https://api.xero.com/connections';

        // Rate limiting (Xero: 60 requests per minute per tenant)
        this.rateLimiter = {
            requestsPerMinute: 60,
            requestCount: 0,
            resetTime: Date.now() + 60000
        };

        // Default accounts mapping (can be customized per organization)
        this.accountsMapping = {
            accountsReceivable: '200', // Default AR account code
            accountsPayable: '800',    // Default AP account code
            revenue: '400',            // Default revenue account
            bankAccount: '090',        // Default bank account
            taxPayable: '820'          // Default tax payable
        };
    }

    // ============================================================================
    // AUTHENTICATION & CONNECTION
    // ============================================================================

    /**
     * Autentica con Xero usando OAuth 2.0 con PKCE
     * @param {Object} authData - Datos de autenticación
     * @param {string} authData.authorizationCode - Código de autorización OAuth
     * @param {string} authData.codeVerifier - PKCE code verifier
     * @returns {Promise<Object>} Resultado de autenticación
     */
    async authenticate(authData = {}) {
        try {
            if (authData.authorizationCode) {
                // Exchange authorization code for tokens
                const tokenData = await this._exchangeCodeForToken(
                    authData.authorizationCode,
                    authData.codeVerifier
                );
                
                this.credentials.accessToken = tokenData.access_token;
                this.credentials.refreshToken = tokenData.refresh_token;
                this.credentials.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

                // Get tenant ID (organization)
                if (!this.credentials.tenantId) {
                    const tenants = await this._getTenants();
                    if (tenants.length > 0) {
                        this.credentials.tenantId = tenants[0].tenantId;
                    }
                }

                return {
                    success: true,
                    authenticated: true,
                    tenantId: this.credentials.tenantId,
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
                    tenantId: this.credentials.tenantId
                };
            } else {
                throw new Error('No authentication credentials provided');
            }
        } catch (error) {
            console.error('Xero authentication error:', error.message);
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
    async _exchangeCodeForToken(authorizationCode, codeVerifier) {
        try {
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                code: authorizationCode,
                redirect_uri: this.credentials.redirectUri,
                code_verifier: codeVerifier
            });

            const response = await axios.post(
                `${this.authBaseUrl}/identity/connect/token`,
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${Buffer.from(
                            `${this.credentials.clientId}:${this.credentials.clientSecret}`
                        ).toString('base64')}`
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
                refresh_token: this.credentials.refreshToken
            });

            const response = await axios.post(
                `${this.authBaseUrl}/identity/connect/token`,
                params.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${Buffer.from(
                            `${this.credentials.clientId}:${this.credentials.clientSecret}`
                        ).toString('base64')}`
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
     * Get available tenants (organizations) for the authenticated user
     * @private
     */
    async _getTenants() {
        try {
            const response = await axios.get(this.identityBaseUrl, {
                headers: {
                    'Authorization': `Bearer ${this.credentials.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            console.error('Get tenants error:', error.message);
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
            await this._makeRequest('GET', '/Organisation');
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Verifica el estado de conexión con Xero
     * @returns {Promise<Object>} Estado de conexión
     */
    async testConnection() {
        try {
            const response = await this._makeRequest('GET', '/Organisation');
            
            return {
                success: true,
                connected: true,
                organization: {
                    name: response.Organisations[0].Name,
                    shortCode: response.Organisations[0].ShortCode,
                    version: response.Organisations[0].Version,
                    baseCurrency: response.Organisations[0].BaseCurrency
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
     * Desconecta de Xero (revoca tokens)
     * @returns {Promise<Object>} Resultado de desconexión
     */
    async disconnect() {
        try {
            // Revoke the connection for this tenant
            await axios.delete(`${this.identityBaseUrl}/${this.credentials.tenantId}`, {
                headers: {
                    'Authorization': `Bearer ${this.credentials.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            // Clear credentials
            this.credentials.accessToken = null;
            this.credentials.refreshToken = null;
            this.credentials.tenantId = null;
            this.credentials.tokenExpiry = null;

            return { success: true, disconnected: true };
        } catch (error) {
            console.error('Xero disconnect error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ============================================================================
    // CUSTOMER OPERATIONS
    // ============================================================================

    /**
     * Sincroniza un cliente a Xero (Contact)
     * @param {UnifiedCustomer} unifiedCustomer - Cliente en formato unificado
     * @returns {Promise<Object>} Resultado de sincronización
     */
    async syncCustomer(unifiedCustomer) {
        try {
            let existingContact = null;

            // Check if contact already exists in Xero
            if (unifiedCustomer.erpId) {
                existingContact = await this.getCustomer(unifiedCustomer.erpId);
            }

            // Map to Xero Contact format
            const xeroContact = this._mapToXeroContact(unifiedCustomer, existingContact);

            let result;
            if (existingContact) {
                // Update existing contact
                xeroContact.ContactID = existingContact.ContactID;
                result = await this._makeRequest('POST', '/Contacts', { Contacts: [xeroContact] });
            } else {
                // Create new contact
                result = await this._makeRequest('PUT', '/Contacts', { Contacts: [xeroContact] });
            }

            const contact = result.Contacts[0];

            return {
                success: true,
                erpEntityId: contact.ContactID,
                erpEntityNumber: contact.ContactNumber || null,
                erpData: {
                    name: contact.Name,
                    contactStatus: contact.ContactStatus,
                    emailAddress: contact.EmailAddress
                }
            };
        } catch (error) {
            console.error('Sync customer to Xero error:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene un cliente (Contact) de Xero por ID
     * @param {string} contactId - ID del contacto en Xero
     * @returns {Promise<Object>} Datos del contacto
     */
    async getCustomer(contactId) {
        try {
            const response = await this._makeRequest('GET', `/Contacts/${contactId}`);
            return response.Contacts[0] || null;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Busca clientes (Contacts) en Xero
     * @param {Object} filters - Filtros de búsqueda
     * @returns {Promise<Array>} Lista de contactos encontrados
     */
    async searchCustomers(filters = {}) {
        try {
            let whereClause = '';
            
            if (filters.email) {
                whereClause = `EmailAddress == "${filters.email}"`;
            } else if (filters.name) {
                whereClause = `Name.Contains("${filters.name}")`;
            }

            const params = whereClause ? { where: whereClause } : {};
            const response = await this._makeRequest('GET', '/Contacts', null, params);

            return response.Contacts || [];
        } catch (error) {
            console.error('Search customers in Xero error:', error.message);
            return [];
        }
    }

    /**
     * Map UnifiedCustomer to Xero Contact format
     * @private
     */
    _mapToXeroContact(unifiedCustomer, existingContact = null) {
        const contact = {
            Name: unifiedCustomer.displayName,
            FirstName: unifiedCustomer.givenName || undefined,
            LastName: unifiedCustomer.familyName || undefined,
            EmailAddress: unifiedCustomer.email || undefined,
            ContactStatus: 'ACTIVE'
        };

        // Add addresses
        if (unifiedCustomer.billingAddress && unifiedCustomer.billingAddress.line1) {
            contact.Addresses = [{
                AddressType: 'POBOX',
                AddressLine1: unifiedCustomer.billingAddress.line1,
                AddressLine2: unifiedCustomer.billingAddress.line2 || undefined,
                City: unifiedCustomer.billingAddress.city || undefined,
                Region: unifiedCustomer.billingAddress.state || undefined,
                PostalCode: unifiedCustomer.billingAddress.postalCode || undefined,
                Country: unifiedCustomer.billingAddress.country || 'US'
            }];
        }

        // Add phones
        if (unifiedCustomer.phoneNumber) {
            contact.Phones = [{
                PhoneType: 'DEFAULT',
                PhoneNumber: unifiedCustomer.phoneNumber
            }];
        }

        // Preserve existing contact data
        if (existingContact) {
            contact.ContactID = existingContact.ContactID;
            contact.ContactNumber = existingContact.ContactNumber;
        }

        return contact;
    }

    // ============================================================================
    // INVOICE OPERATIONS
    // ============================================================================

    /**
     * Sincroniza una factura a Xero
     * @param {UnifiedInvoice} unifiedInvoice - Factura en formato unificado
     * @returns {Promise<Object>} Resultado de sincronización
     */
    async syncInvoice(unifiedInvoice) {
        try {
            // Ensure customer exists in Xero
            if (!unifiedInvoice.erpCustomerId) {
                throw new Error('Customer must be synced to Xero before syncing invoice (missing erpCustomerId)');
            }

            let existingInvoice = null;

            // Check if invoice already exists
            if (unifiedInvoice.erpId) {
                existingInvoice = await this.getInvoice(unifiedInvoice.erpId);
            }

            // Map to Xero Invoice format
            const xeroInvoice = this._mapToXeroInvoice(unifiedInvoice, existingInvoice);

            let result;
            if (existingInvoice) {
                // Update existing invoice (only if status allows)
                if (existingInvoice.Status === 'DRAFT' || existingInvoice.Status === 'SUBMITTED') {
                    xeroInvoice.InvoiceID = existingInvoice.InvoiceID;
                    result = await this._makeRequest('POST', '/Invoices', { Invoices: [xeroInvoice] });
                } else {
                    throw new Error(`Cannot update invoice in status: ${existingInvoice.Status}`);
                }
            } else {
                // Create new invoice
                result = await this._makeRequest('PUT', '/Invoices', { Invoices: [xeroInvoice] });
            }

            const invoice = result.Invoices[0];

            return {
                success: true,
                erpEntityId: invoice.InvoiceID,
                erpEntityNumber: invoice.InvoiceNumber || null,
                erpData: {
                    invoiceNumber: invoice.InvoiceNumber,
                    status: invoice.Status,
                    total: invoice.Total,
                    amountDue: invoice.AmountDue
                }
            };
        } catch (error) {
            console.error('Sync invoice to Xero error:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene una factura de Xero por ID
     * @param {string} invoiceId - ID de la factura en Xero
     * @returns {Promise<Object>} Datos de la factura
     */
    async getInvoice(invoiceId) {
        try {
            const response = await this._makeRequest('GET', `/Invoices/${invoiceId}`);
            return response.Invoices[0] || null;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Map UnifiedInvoice to Xero Invoice format
     * @private
     */
    _mapToXeroInvoice(unifiedInvoice, existingInvoice = null) {
        const invoice = {
            Type: 'ACCREC', // Accounts Receivable
            Contact: {
                ContactID: unifiedInvoice.erpCustomerId
            },
            Date: this._formatDate(unifiedInvoice.date),
            DueDate: this._formatDate(unifiedInvoice.dueDate),
            Status: unifiedInvoice.status === 'paid' ? 'AUTHORISED' : 'DRAFT',
            LineAmountTypes: unifiedInvoice.includesTax ? 'Inclusive' : 'Exclusive',
            LineItems: []
        };

        // Add invoice number if provided
        if (unifiedInvoice.invoiceNumber) {
            invoice.InvoiceNumber = unifiedInvoice.invoiceNumber;
        }

        // Map line items
        unifiedInvoice.lineItems.forEach(item => {
            const lineItem = {
                Description: item.description,
                Quantity: item.quantity,
                UnitAmount: item.unitPrice,
                AccountCode: this.accountsMapping.revenue, // Default revenue account
                TaxType: 'OUTPUT' // Default tax type for US (can be customized)
            };

            if (item.taxAmount && item.taxAmount > 0) {
                lineItem.TaxAmount = item.taxAmount;
            }

            invoice.LineItems.push(lineItem);
        });

        // Preserve existing invoice data
        if (existingInvoice) {
            invoice.InvoiceID = existingInvoice.InvoiceID;
        }

        return invoice;
    }

    // ============================================================================
    // PAYMENT OPERATIONS
    // ============================================================================

    /**
     * Sincroniza un pago a Xero
     * @param {UnifiedPayment} unifiedPayment - Pago en formato unificado
     * @returns {Promise<Object>} Resultado de sincronización
     */
    async syncPayment(unifiedPayment) {
        try {
            // Ensure invoice exists in Xero
            if (!unifiedPayment.erpInvoiceId) {
                throw new Error('Invoice must be synced to Xero before syncing payment (missing erpInvoiceId)');
            }

            // Get the invoice to link payment
            const invoice = await this.getInvoice(unifiedPayment.erpInvoiceId);
            if (!invoice) {
                throw new Error(`Invoice not found in Xero: ${unifiedPayment.erpInvoiceId}`);
            }

            // Map to Xero Payment format
            const xeroPayment = this._mapToXeroPayment(unifiedPayment, invoice);

            // Create payment
            const result = await this._makeRequest('PUT', '/Payments', { Payments: [xeroPayment] });
            const payment = result.Payments[0];

            return {
                success: true,
                erpEntityId: payment.PaymentID,
                erpData: {
                    paymentId: payment.PaymentID,
                    amount: payment.Amount,
                    date: payment.Date,
                    status: payment.Status
                }
            };
        } catch (error) {
            console.error('Sync payment to Xero error:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene un pago de Xero por ID
     * @param {string} paymentId - ID del pago en Xero
     * @returns {Promise<Object>} Datos del pago
     */
    async getPayment(paymentId) {
        try {
            const response = await this._makeRequest('GET', `/Payments/${paymentId}`);
            return response.Payments[0] || null;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Map UnifiedPayment to Xero Payment format
     * @private
     */
    _mapToXeroPayment(unifiedPayment, invoice) {
        const payment = {
            Invoice: {
                InvoiceID: unifiedPayment.erpInvoiceId
            },
            Account: {
                Code: this.accountsMapping.bankAccount // Default bank account
            },
            Date: this._formatDate(unifiedPayment.date),
            Amount: unifiedPayment.amount
        };

        // Add payment reference if provided
        if (unifiedPayment.reference) {
            payment.Reference = unifiedPayment.reference;
        }

        return payment;
    }

    // ============================================================================
    // CHART OF ACCOUNTS
    // ============================================================================

    /**
     * Obtiene el catálogo de cuentas de Xero
     * @returns {Promise<Array>} Lista de cuentas
     */
    async getChartOfAccounts() {
        try {
            const response = await this._makeRequest('GET', '/Accounts');
            
            return (response.Accounts || []).map(account => ({
                id: account.AccountID,
                code: account.Code,
                name: account.Name,
                type: account.Type,
                taxType: account.TaxType || null,
                description: account.Description || null,
                status: account.Status,
                class: account.Class
            }));
        } catch (error) {
            console.error('Get chart of accounts error:', error.message);
            throw error;
        }
    }

    /**
     * Configura el mapeo de cuentas contables
     * @param {Object} mapping - Mapeo de cuentas
     */
    async configureAccountMapping(mapping) {
        this.accountsMapping = {
            ...this.accountsMapping,
            ...mapping
        };
        return { success: true, mapping: this.accountsMapping };
    }

    // ============================================================================
    // TAX RATES
    // ============================================================================

    /**
     * Obtiene las tasas de impuestos configuradas en Xero
     * @returns {Promise<Array>} Lista de tasas de impuestos
     */
    async getTaxRates() {
        try {
            const response = await this._makeRequest('GET', '/TaxRates');
            
            return (response.TaxRates || []).map(rate => ({
                name: rate.Name,
                taxType: rate.TaxType,
                status: rate.Status,
                effectiveRate: rate.EffectiveRate,
                displayTaxRate: rate.DisplayTaxRate
            }));
        } catch (error) {
            console.error('Get tax rates error:', error.message);
            throw error;
        }
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
            const params = {
                date: options.asOfDate || this._formatDate(new Date())
            };

            const response = await this._makeRequest('GET', '/Reports/AgedReceivablesByContact', null, params);
            
            return {
                reportName: response.Reports[0].ReportName,
                reportDate: response.Reports[0].ReportDate,
                updatedDateUTC: response.Reports[0].UpdatedDateUTC,
                rows: response.Reports[0].Rows || []
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
            const params = {
                date: options.asOfDate || this._formatDate(new Date())
            };

            const response = await this._makeRequest('GET', '/Reports/AgedPayablesByContact', null, params);
            
            return {
                reportName: response.Reports[0].ReportName,
                reportDate: response.Reports[0].ReportDate,
                updatedDateUTC: response.Reports[0].UpdatedDateUTC,
                rows: response.Reports[0].Rows || []
            };
        } catch (error) {
            console.error('Get AP report error:', error.message);
            throw error;
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Realiza una petición HTTP a la API de Xero
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
            url: `${this.apiBaseUrl}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${this.credentials.accessToken}`,
                'xero-tenant-id': this.credentials.tenantId,
                'Accept': 'application/json',
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
            console.error('Xero API request error:', {
                method,
                endpoint,
                status: error.response?.status,
                message: error.response?.data?.Message || error.message,
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
     * Format date to Xero format (YYYY-MM-DD)
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
        // Xero uses "Contacts" for both customers and vendors
        // Set the contact as a supplier
        const contact = await this.syncCustomer(unifiedVendor);
        
        // Update to mark as supplier
        await this._makeRequest('POST', '/Contacts', {
            Contacts: [{
                ContactID: contact.erpEntityId,
                IsSupplier: true
            }]
        });

        return contact;
    }

    async getVendor(vendorId) {
        return this.getCustomer(vendorId);
    }

    async searchVendors(filters = {}) {
        const contacts = await this.searchCustomers(filters);
        return contacts.filter(c => c.IsSupplier);
    }

    async syncBill(unifiedBill) {
        // Bills in Xero are just invoices with Type='ACCPAY'
        const invoice = {
            ...unifiedBill,
            type: 'ACCPAY'
        };
        
        return this.syncInvoice(invoice);
    }

    async getBill(billId) {
        return this.getInvoice(billId);
    }

    async syncBillPayment(unifiedBillPayment) {
        return this.syncPayment(unifiedBillPayment);
    }

    async getBillPayment(paymentId) {
        return this.getPayment(paymentId);
    }

    async createJournalEntry(unifiedJournalEntry) {
        throw new Error('Manual journal entries not yet implemented for Xero adapter');
    }

    async getBalanceSheet(options = {}) {
        try {
            const params = {
                date: options.asOfDate || this._formatDate(new Date())
            };

            const response = await this._makeRequest('GET', '/Reports/BalanceSheet', null, params);
            return response.Reports[0];
        } catch (error) {
            console.error('Get balance sheet error:', error.message);
            throw error;
        }
    }

    async getProfitAndLoss(options = {}) {
        try {
            const params = {
                fromDate: options.startDate || this._formatDate(new Date(new Date().getFullYear(), 0, 1)),
                toDate: options.endDate || this._formatDate(new Date())
            };

            const response = await this._makeRequest('GET', '/Reports/ProfitAndLoss', null, params);
            return response.Reports[0];
        } catch (error) {
            console.error('Get P&L error:', error.message);
            throw error;
        }
    }

    async getCashFlowStatement(options = {}) {
        throw new Error('Cash flow statement not directly available in Xero API');
    }
}

module.exports = XeroUSAAdapter;
