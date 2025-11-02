/**
 * Alegra México Adapter
 * 
 * Implementación del adaptador para Alegra en México.
 * Alegra es un sistema de contabilidad cloud popular en LATAM.
 * 
 * Características:
 * - API REST moderna
 * - Token-based authentication
 * - Soporte para CFDI 4.0 (integración con PAC)
 * - Facturación electrónica simplificada
 * - Multi-currency support
 * - Interfaz simple y moderna
 * 
 * @class AlegraAdapter
 * @extends AccountingAdapter
 * @see https://developer.alegra.com/docs
 */

const AccountingAdapter = require('../../base-adapter');
const axios = require('axios');

class AlegraAdapter extends AccountingAdapter {
    constructor(credentials = {}, config = {}) {
        super(config);
        
        this.credentials = {
            username: credentials.username || process.env.ALEGRA_USERNAME,
            apiToken: credentials.apiToken || process.env.ALEGRA_API_TOKEN,
            ...credentials
        };

        this.config = {
            environment: config.environment || 'production',
            apiVersion: config.apiVersion || 'v1',
            timeout: config.timeout || 30000,
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000,
            enableCFDI: config.enableCFDI !== false,
            ...config
        };

        // Base URLs
        this.baseUrl = 'https://api.alegra.com/api';
        this.apiEndpoint = `${this.baseUrl}/${this.config.apiVersion}`;

        // Rate limiting
        this.rateLimiter = {
            requestsPerMinute: 120,
            requestCount: 0,
            resetTime: Date.now() + 60000
        };

        // Mexican tax configuration
        this.taxConfig = {
            ivaRate: 0.16,
            retencionIvaRate: 0.1067,
            retencionIsrRate: 0.10
        };
    }

    // ============================================================================
    // AUTHENTICATION & CONNECTION
    // ============================================================================

    /**
     * Autentica con Alegra usando username y API token
     * Alegra usa Basic Authentication
     * @param {Object} authData - Datos de autenticación
     * @returns {Promise<Object>} Resultado de autenticación
     */
    async authenticate(authData = {}) {
        try {
            // Test connection by getting company info
            const response = await this._makeRequest('GET', '/company');
            
            return {
                success: true,
                authenticated: true,
                company: {
                    id: response.id,
                    name: response.name,
                    identification: response.identification
                }
            };
        } catch (error) {
            console.error('Alegra authentication error:', error.message);
            return {
                success: false,
                authenticated: false,
                error: error.message
            };
        }
    }

    /**
     * Verifica el estado de conexión con Alegra
     * @returns {Promise<Object>} Estado de conexión
     */
    async testConnection() {
        try {
            const response = await this._makeRequest('GET', '/company');
            
            return {
                success: true,
                connected: true,
                company: {
                    name: response.name,
                    identification: response.identification,
                    email: response.email,
                    phone: response.phonePrimary
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
     * Desconecta de Alegra (no hay logout, solo limpiar credenciales)
     * @returns {Promise<Object>} Resultado de desconexión
     */
    async disconnect() {
        this.credentials.username = null;
        this.credentials.apiToken = null;
        return { success: true, disconnected: true };
    }

    // ============================================================================
    // CUSTOMER OPERATIONS (Contactos)
    // ============================================================================

    /**
     * Sincroniza un cliente a Alegra
     * @param {UnifiedCustomer} unifiedCustomer - Cliente en formato unificado
     * @returns {Promise<Object>} Resultado de sincronización
     */
    async syncCustomer(unifiedCustomer) {
        try {
            let existingContact = null;

            // Check if customer already exists
            if (unifiedCustomer.erpId) {
                existingContact = await this.getCustomer(unifiedCustomer.erpId);
            } else if (unifiedCustomer.email) {
                // Search by email
                const searchResults = await this.searchCustomers({ email: unifiedCustomer.email });
                if (searchResults.length > 0) {
                    existingContact = searchResults[0];
                }
            }

            // Map to Alegra Contact format
            const alegraContact = this._mapToAlegraContact(unifiedCustomer, existingContact);

            let result;
            if (existingContact) {
                // Update existing contact
                result = await this._makeRequest(
                    'PUT',
                    `/contacts/${existingContact.id}`,
                    alegraContact
                );
            } else {
                // Create new contact
                result = await this._makeRequest('POST', '/contacts', alegraContact);
            }

            return {
                success: true,
                erpEntityId: result.id.toString(),
                erpEntityNumber: result.internalContacts || null,
                erpData: {
                    name: result.name,
                    identification: result.identification?.number,
                    email: result.email
                }
            };
        } catch (error) {
            console.error('Sync customer to Alegra error:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene un cliente de Alegra por ID
     * @param {string} contactId - ID del contacto en Alegra
     * @returns {Promise<Object>} Datos del contacto
     */
    async getCustomer(contactId) {
        try {
            const response = await this._makeRequest('GET', `/contacts/${contactId}`);
            return response || null;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Busca clientes en Alegra
     * @param {Object} filters - Filtros de búsqueda
     * @returns {Promise<Array>} Lista de contactos encontrados
     */
    async searchCustomers(filters = {}) {
        try {
            const params = {
                type: 'client' // Only clients
            };
            
            if (filters.name) params.name = filters.name;
            if (filters.email) params.email = filters.email;
            if (filters.identification) params.identification = filters.identification;

            const response = await this._makeRequest('GET', '/contacts', null, params);
            return response || [];
        } catch (error) {
            console.error('Search customers in Alegra error:', error.message);
            return [];
        }
    }

    /**
     * Map UnifiedCustomer to Alegra Contact format
     * @private
     */
    _mapToAlegraContact(unifiedCustomer, existingContact = null) {
        const contact = {
            name: unifiedCustomer.displayName,
            type: ['client'],
            email: unifiedCustomer.email || '',
            phonePrimary: unifiedCustomer.phoneNumber || '',
            identification: {
                number: unifiedCustomer.taxId || 'XAXX010101000',
                type: 'RFC' // Mexican tax ID type
            },
            address: {}
        };

        // Add address
        if (unifiedCustomer.billingAddress) {
            contact.address = {
                address: unifiedCustomer.billingAddress.line1 || '',
                city: unifiedCustomer.billingAddress.city || '',
                department: unifiedCustomer.billingAddress.state || ''
            };
        }

        return contact;
    }

    // ============================================================================
    // INVOICE OPERATIONS (Facturas)
    // ============================================================================

    /**
     * Sincroniza una factura a Alegra
     * @param {UnifiedInvoice} unifiedInvoice - Factura en formato unificado
     * @returns {Promise<Object>} Resultado de sincronización
     */
    async syncInvoice(unifiedInvoice) {
        try {
            // Ensure customer exists in Alegra
            if (!unifiedInvoice.erpCustomerId) {
                throw new Error('Customer must be synced to Alegra before syncing invoice (missing erpCustomerId)');
            }

            let existingInvoice = null;

            // Check if invoice already exists
            if (unifiedInvoice.erpId) {
                existingInvoice = await this.getInvoice(unifiedInvoice.erpId);
            }

            // Map to Alegra Invoice format
            const alegraInvoice = this._mapToAlegraInvoice(unifiedInvoice, existingInvoice);

            let result;
            if (existingInvoice) {
                // Update existing invoice (only if not stamped)
                if (!existingInvoice.stamp) {
                    result = await this._makeRequest(
                        'PUT',
                        `/invoices/${existingInvoice.id}`,
                        alegraInvoice
                    );
                } else {
                    throw new Error('Cannot update a stamped invoice');
                }
            } else {
                // Create new invoice
                result = await this._makeRequest('POST', '/invoices', alegraInvoice);
            }

            // Generate CFDI if enabled
            let cfdiData = null;
            if (this.config.enableCFDI && unifiedInvoice.requiresCFDI !== false) {
                cfdiData = await this._stampCFDI(result.id);
            }

            return {
                success: true,
                erpEntityId: result.id.toString(),
                erpEntityNumber: result.numberTemplate?.fullNumber || null,
                erpData: {
                    numberTemplate: result.numberTemplate,
                    total: result.total,
                    balance: result.balance,
                    uuid: cfdiData?.uuid || null,
                    stamped: !!cfdiData
                }
            };
        } catch (error) {
            console.error('Sync invoice to Alegra error:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene una factura de Alegra por ID
     * @param {string} invoiceId - ID de la factura en Alegra
     * @returns {Promise<Object>} Datos de la factura
     */
    async getInvoice(invoiceId) {
        try {
            const response = await this._makeRequest('GET', `/invoices/${invoiceId}`);
            return response || null;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Map UnifiedInvoice to Alegra Invoice format
     * @private
     */
    _mapToAlegraInvoice(unifiedInvoice, existingInvoice = null) {
        const invoice = {
            client: parseInt(unifiedInvoice.erpCustomerId),
            date: this._formatDate(unifiedInvoice.date),
            dueDate: this._formatDate(unifiedInvoice.dueDate),
            observations: unifiedInvoice.notes || '',
            status: unifiedInvoice.status === 'paid' ? 'closed' : 'open',
            items: []
        };

        // Add line items
        unifiedInvoice.lineItems.forEach(item => {
            const invoiceItem = {
                name: item.description,
                description: item.description,
                quantity: item.quantity,
                price: item.unitPrice,
                tax: []
            };

            // Add tax if present
            if (item.taxAmount && item.taxAmount > 0) {
                const taxPercentage = (item.taxAmount / (item.quantity * item.unitPrice)) * 100;
                invoiceItem.tax.push({
                    id: 1, // IVA ID in Alegra
                    percentage: taxPercentage
                });
            }

            invoice.items.push(invoiceItem);
        });

        return invoice;
    }

    /**
     * Stamp CFDI (timbrar)
     * @private
     */
    async _stampCFDI(invoiceId) {
        try {
            // Alegra has integrated PAC stamping
            const response = await this._makeRequest('POST', `/invoices/${invoiceId}/stamp`);
            
            return {
                success: true,
                uuid: response.stamp?.uuid,
                xml: response.stamp?.xml,
                pdf: response.stamp?.pdf,
                stampDate: response.stamp?.date
            };
        } catch (error) {
            console.error('Error stamping CFDI:', error.message);
            throw new Error(`CFDI stamping failed: ${error.message}`);
        }
    }

    // ============================================================================
    // PAYMENT OPERATIONS (Pagos)
    // ============================================================================

    /**
     * Sincroniza un pago a Alegra
     * @param {UnifiedPayment} unifiedPayment - Pago en formato unificado
     * @returns {Promise<Object>} Resultado de sincronización
     */
    async syncPayment(unifiedPayment) {
        try {
            // Ensure invoice exists in Alegra
            if (!unifiedPayment.erpInvoiceId) {
                throw new Error('Invoice must be synced to Alegra before syncing payment (missing erpInvoiceId)');
            }

            // Map to Alegra Payment format
            const alegraPayment = this._mapToAlegraPayment(unifiedPayment);

            // Create payment
            const result = await this._makeRequest('POST', '/payments', alegraPayment);

            return {
                success: true,
                erpEntityId: result.id.toString(),
                erpData: {
                    amount: result.amount,
                    date: result.date,
                    paymentMethod: result.paymentMethod
                }
            };
        } catch (error) {
            console.error('Sync payment to Alegra error:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene un pago de Alegra por ID
     * @param {string} paymentId - ID del pago en Alegra
     * @returns {Promise<Object>} Datos del pago
     */
    async getPayment(paymentId) {
        try {
            const response = await this._makeRequest('GET', `/payments/${paymentId}`);
            return response || null;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Map UnifiedPayment to Alegra Payment format
     * @private
     */
    _mapToAlegraPayment(unifiedPayment) {
        return {
            date: this._formatDate(unifiedPayment.date),
            amount: unifiedPayment.amount,
            paymentMethod: this._mapPaymentMethod(unifiedPayment.paymentMethod),
            observations: unifiedPayment.notes || '',
            invoices: [{
                id: parseInt(unifiedPayment.erpInvoiceId),
                amount: unifiedPayment.amount
            }]
        };
    }

    /**
     * Map payment method to Alegra format
     * @private
     */
    _mapPaymentMethod(method) {
        const methodMap = {
            'cash': 'cash',
            'check': 'check',
            'credit_card': 'creditCard',
            'debit_card': 'debitCard',
            'transfer': 'bankTransfer',
            'other': 'other'
        };
        return methodMap[method?.toLowerCase()] || 'other';
    }

    // ============================================================================
    // CHART OF ACCOUNTS (Cuentas Contables)
    // ============================================================================

    /**
     * Obtiene el catálogo de cuentas de Alegra
     * @returns {Promise<Array>} Lista de cuentas
     */
    async getChartOfAccounts() {
        try {
            const response = await this._makeRequest('GET', '/accounts');
            
            return (response || []).map(account => ({
                id: account.id.toString(),
                code: account.code,
                name: account.name,
                type: account.type,
                description: account.description,
                status: account.status
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
        this.accountsMapping = { ...this.accountsMapping, ...mapping };
        return { success: true, mapping: this.accountsMapping };
    }

    // ============================================================================
    // REPORTS (Reportes)
    // ============================================================================

    /**
     * Obtiene reporte de cuentas por cobrar
     * @param {Object} options - Opciones de reporte
     * @returns {Promise<Object>} Datos del reporte
     */
    async getAccountsReceivableReport(options = {}) {
        try {
            const params = {
                start: options.startDate || this._formatDate(new Date(new Date().getFullYear(), 0, 1)),
                end: options.endDate || this._formatDate(new Date()),
                status: 'open'
            };

            const response = await this._makeRequest('GET', '/invoices', null, params);
            
            const totalAR = (response || []).reduce((sum, invoice) => sum + parseFloat(invoice.balance || 0), 0);

            return {
                reportName: 'Cuentas por Cobrar',
                reportDate: new Date().toISOString(),
                totalOutstanding: totalAR,
                invoices: response || []
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
                start: options.startDate || this._formatDate(new Date(new Date().getFullYear(), 0, 1)),
                end: options.endDate || this._formatDate(new Date()),
                status: 'open'
            };

            const response = await this._makeRequest('GET', '/bills', null, params);
            
            const totalAP = (response || []).reduce((sum, bill) => sum + parseFloat(bill.balance || 0), 0);

            return {
                reportName: 'Cuentas por Pagar',
                reportDate: new Date().toISOString(),
                totalOutstanding: totalAP,
                bills: response || []
            };
        } catch (error) {
            console.error('Get AP report error:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene tasas de impuestos
     * @returns {Promise<Array>} Lista de tasas de impuestos
     */
    async getTaxRates() {
        try {
            const response = await this._makeRequest('GET', '/taxes');
            
            return (response || []).map(tax => ({
                id: tax.id,
                name: tax.name,
                percentage: tax.percentage,
                type: tax.type,
                status: tax.status
            }));
        } catch (error) {
            console.error('Get tax rates error:', error.message);
            // Return default Mexican taxes if API fails
            return [
                { id: '1', name: 'IVA 16%', percentage: 16, type: 'IVA' },
                { id: '2', name: 'IVA 0%', percentage: 0, type: 'IVA' },
                { id: '3', name: 'Retención IVA', percentage: 10.67, type: 'Retención' },
                { id: '4', name: 'Retención ISR', percentage: 10, type: 'Retención' }
            ];
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Realiza una petición HTTP a la API de Alegra
     * @private
     */
    async _makeRequest(method, endpoint, data = null, params = null, attempt = 1) {
        // Check rate limit
        await this._checkRateLimit();

        // Create basic auth string
        const auth = Buffer.from(`${this.credentials.username}:${this.credentials.apiToken}`).toString('base64');

        const config = {
            method,
            url: `${this.apiEndpoint}${endpoint}`,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: this.config.timeout
        };

        if (data) config.data = data;
        if (params) config.params = params;

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            // Retry on transient errors
            if (attempt < this.config.retryAttempts && this._isRetryableError(error)) {
                const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                await this._delay(delay);
                return this._makeRequest(method, endpoint, data, params, attempt + 1);
            }

            console.error('Alegra API request error:', {
                method, endpoint,
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
            this.rateLimiter.requestCount = 0;
            this.rateLimiter.resetTime = now + 60000;
        }

        if (this.rateLimiter.requestCount >= this.rateLimiter.requestsPerMinute) {
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
        if (!error.response) return true;
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
     * Format date to Alegra format (YYYY-MM-DD)
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
        const contact = this._mapToAlegraContact(unifiedVendor);
        contact.type = ['provider'];
        const result = await this._makeRequest('POST', '/contacts', contact);
        return { success: true, erpEntityId: result.id.toString() };
    }

    async getVendor(vendorId) {
        return this.getCustomer(vendorId);
    }

    async searchVendors(filters = {}) {
        const params = { ...filters, type: 'provider' };
        return this._makeRequest('GET', '/contacts', null, params);
    }

    async syncBill(unifiedBill) {
        const bill = this._mapToAlegraInvoice(unifiedBill);
        const result = await this._makeRequest('POST', '/bills', bill);
        return { success: true, erpEntityId: result.id.toString() };
    }

    async getBill(billId) {
        return this._makeRequest('GET', `/bills/${billId}`);
    }

    async syncBillPayment(unifiedBillPayment) {
        return this.syncPayment(unifiedBillPayment);
    }

    async getBillPayment(paymentId) {
        return this.getPayment(paymentId);
    }

    async createJournalEntry(unifiedJournalEntry) {
        throw new Error('Manual journal entries not yet implemented for Alegra adapter');
    }

    async getBalanceSheet(options = {}) {
        throw new Error('Balance Sheet report not directly available in Alegra API');
    }

    async getProfitAndLoss(options = {}) {
        throw new Error('P&L report not directly available in Alegra API');
    }

    async getCashFlowStatement(options = {}) {
        throw new Error('Cash Flow statement not directly available in Alegra API');
    }
}

module.exports = AlegraAdapter;
