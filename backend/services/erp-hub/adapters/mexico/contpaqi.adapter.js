/**
 * CONTPAQi México Adapter
 * 
 * Implementación concreta del adaptador para CONTPAQi en México.
 * CONTPAQi es el sistema ERP líder en México con ~60% de participación de mercado.
 * 
 * Productos Soportados:
 * - CONTPAQi Contabilidad: Gestión contable completa
 * - CONTPAQi Comercial Premium: Facturación electrónica CFDI 4.0
 * 
 * Características:
 * - Autenticación con API Key y licencia
 * - Sync de clientes, proveedores, facturas, pagos
 * - Integración con CFDI 4.0 (facturación electrónica México)
 * - Catálogo de cuentas contables SAT
 * - Manejo de IVA, retenciones, IEPS
 * - Timbrado de CFDI con PAC integrado
 * 
 * @class CONTPAQiAdapter
 * @extends AccountingAdapter
 * @see https://documentacion.contpaqi.com/
 */

const AccountingAdapter = require('../../base-adapter');
const axios = require('axios');
const xml2js = require('xml2js');

class CONTPAQiAdapter extends AccountingAdapter {
    constructor(credentials = {}, config = {}) {
        super(config);
        
        this.credentials = {
            apiKey: credentials.apiKey || process.env.CONTPAQI_API_KEY,
            licenseKey: credentials.licenseKey || process.env.CONTPAQI_LICENSE_KEY,
            companyRfc: credentials.companyRfc, // RFC de la empresa
            companyDatabase: credentials.companyDatabase, // Nombre de la base de datos
            userId: credentials.userId,
            password: credentials.password,
            ...credentials
        };

        this.config = {
            environment: config.environment || 'production', // sandbox or production
            apiVersion: config.apiVersion || 'v1',
            timeout: config.timeout || 60000, // CONTPAQi puede ser lento
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 2000,
            enableCFDI: config.enableCFDI !== false, // CFDI enabled by default
            ...config
        };

        // Base URLs
        this.baseUrls = {
            sandbox: 'https://sandbox.contpaqiapi.com',
            production: 'https://api.contpaqiapi.com'
        };
        
        this.baseUrl = this.baseUrls[this.config.environment];
        this.apiEndpoint = `${this.baseUrl}/api/${this.config.apiVersion}`;

        // Session token (CONTPAQi uses session-based auth)
        this.sessionToken = null;
        this.sessionExpiry = null;

        // Rate limiting (conservative for CONTPAQi)
        this.rateLimiter = {
            requestsPerMinute: 30,
            requestCount: 0,
            resetTime: Date.now() + 60000
        };

        // Mexican tax configuration
        this.taxConfig = {
            ivaRate: 0.16, // 16% IVA estándar
            ivaFronteraRate: 0.08, // 8% IVA zona fronteriza
            retencionIvaRate: 0.1067, // 10.67% retención IVA
            retencionIsrRate: 0.10, // 10% retención ISR
        };
    }

    // ============================================================================
    // AUTHENTICATION & CONNECTION
    // ============================================================================

    /**
     * Autentica con CONTPAQi usando API Key y credenciales
     * CONTPAQi usa autenticación basada en sesión
     * @param {Object} authData - Datos de autenticación
     * @returns {Promise<Object>} Resultado de autenticación
     */
    async authenticate(authData = {}) {
        try {
            // Check if we have a valid session
            if (this.sessionToken && this.sessionExpiry && this.sessionExpiry > Date.now()) {
                return {
                    success: true,
                    authenticated: true,
                    sessionValid: true
                };
            }

            // Create new session
            const response = await axios.post(
                `${this.apiEndpoint}/auth/login`,
                {
                    apiKey: this.credentials.apiKey,
                    licenseKey: this.credentials.licenseKey,
                    userId: this.credentials.userId,
                    password: this.credentials.password,
                    companyDatabase: this.credentials.companyDatabase
                },
                {
                    timeout: this.config.timeout
                }
            );

            if (response.data.success) {
                this.sessionToken = response.data.token;
                // Sessions typically last 24 hours
                this.sessionExpiry = Date.now() + (24 * 60 * 60 * 1000);

                return {
                    success: true,
                    authenticated: true,
                    sessionToken: this.sessionToken,
                    expiresIn: 86400 // 24 hours in seconds
                };
            } else {
                throw new Error('Authentication failed: ' + response.data.message);
            }

        } catch (error) {
            console.error('CONTPAQi authentication error:', error.message);
            this.sessionToken = null;
            this.sessionExpiry = null;
            
            return {
                success: false,
                authenticated: false,
                error: error.message
            };
        }
    }

    /**
     * Verifica el estado de conexión con CONTPAQi
     * @returns {Promise<Object>} Estado de conexión
     */
    async testConnection() {
        try {
            // Ensure we're authenticated
            const authResult = await this.authenticate();
            if (!authResult.success) {
                throw new Error('Authentication failed');
            }

            // Test connection by getting company info
            const response = await this._makeRequest('GET', '/empresa/info');
            
            return {
                success: true,
                connected: true,
                company: {
                    rfc: response.rfc,
                    razonSocial: response.razonSocial,
                    database: response.nombreBase,
                    ejercicio: response.ejercicioActual,
                    periodo: response.periodoActual
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
     * Desconecta de CONTPAQi (cierra sesión)
     * @returns {Promise<Object>} Resultado de desconexión
     */
    async disconnect() {
        try {
            if (this.sessionToken) {
                await this._makeRequest('POST', '/auth/logout');
            }

            this.sessionToken = null;
            this.sessionExpiry = null;

            return { success: true, disconnected: true };
        } catch (error) {
            console.error('CONTPAQi disconnect error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ============================================================================
    // CUSTOMER OPERATIONS (Clientes)
    // ============================================================================

    /**
     * Sincroniza un cliente a CONTPAQi
     * @param {UnifiedCustomer} unifiedCustomer - Cliente en formato unificado
     * @returns {Promise<Object>} Resultado de sincronización
     */
    async syncCustomer(unifiedCustomer) {
        try {
            await this.authenticate();

            let existingCliente = null;

            // Check if customer already exists
            if (unifiedCustomer.erpId) {
                existingCliente = await this.getCustomer(unifiedCustomer.erpId);
            } else if (unifiedCustomer.taxId) {
                // Search by RFC (Mexican tax ID)
                const searchResults = await this.searchCustomers({ rfc: unifiedCustomer.taxId });
                if (searchResults.length > 0) {
                    existingCliente = searchResults[0];
                }
            }

            // Map to CONTPAQi Cliente format
            const contpaqiCliente = this._mapToCONTPAQiCliente(unifiedCustomer, existingCliente);

            let result;
            if (existingCliente) {
                // Update existing customer
                result = await this._makeRequest(
                    'PUT',
                    `/clientes/${existingCliente.CIDCLIENTEPROVEEDOR}`,
                    contpaqiCliente
                );
            } else {
                // Create new customer
                result = await this._makeRequest('POST', '/clientes', contpaqiCliente);
            }

            return {
                success: true,
                erpEntityId: result.CIDCLIENTEPROVEEDOR.toString(),
                erpEntityNumber: result.CCODIGOCLIENTE || null,
                erpData: {
                    codigo: result.CCODIGOCLIENTE,
                    razonSocial: result.CRAZONSOCIAL,
                    rfc: result.CRFC
                }
            };
        } catch (error) {
            console.error('Sync customer to CONTPAQi error:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene un cliente de CONTPAQi por ID
     * @param {string} clienteId - ID del cliente en CONTPAQi
     * @returns {Promise<Object>} Datos del cliente
     */
    async getCustomer(clienteId) {
        try {
            await this.authenticate();
            const response = await this._makeRequest('GET', `/clientes/${clienteId}`);
            return response || null;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Busca clientes en CONTPAQi
     * @param {Object} filters - Filtros de búsqueda
     * @returns {Promise<Array>} Lista de clientes encontrados
     */
    async searchCustomers(filters = {}) {
        try {
            await this.authenticate();
            
            const params = {};
            if (filters.rfc) params.rfc = filters.rfc;
            if (filters.nombre) params.nombre = filters.nombre;
            if (filters.codigo) params.codigo = filters.codigo;

            const response = await this._makeRequest('GET', '/clientes', null, params);
            return response.data || [];
        } catch (error) {
            console.error('Search customers in CONTPAQi error:', error.message);
            return [];
        }
    }

    /**
     * Map UnifiedCustomer to CONTPAQi Cliente format
     * @private
     */
    _mapToCONTPAQiCliente(unifiedCustomer, existingCliente = null) {
        const cliente = {
            CCODIGOCLIENTE: unifiedCustomer.erpEntityNumber || this._generateClientCode(),
            CRAZONSOCIAL: unifiedCustomer.displayName,
            CRFC: unifiedCustomer.taxId || 'XAXX010101000', // RFC genérico si no se proporciona
            CEMAIL1: unifiedCustomer.email || '',
            CTELEFONO1: unifiedCustomer.phoneNumber || '',
            CTIPOCLIENTE: 1, // 1 = Cliente normal
            CLISTAPRECIOCLIENTE: 1, // Lista de precios estándar
        };

        // Add address
        if (unifiedCustomer.billingAddress) {
            cliente.CDIRECCION = unifiedCustomer.billingAddress.line1 || '';
            cliente.CCOLONIA = unifiedCustomer.billingAddress.line2 || '';
            cliente.CCIUDAD = unifiedCustomer.billingAddress.city || '';
            cliente.CESTADO = unifiedCustomer.billingAddress.state || '';
            cliente.CCODIGOPOSTAL = unifiedCustomer.billingAddress.postalCode || '';
            cliente.CPAIS = unifiedCustomer.billingAddress.country || 'México';
        }

        // Preserve existing ID if updating
        if (existingCliente) {
            cliente.CIDCLIENTEPROVEEDOR = existingCliente.CIDCLIENTEPROVEEDOR;
        }

        return cliente;
    }

    /**
     * Generate a unique client code
     * @private
     */
    _generateClientCode() {
        return `CLI${Date.now().toString().slice(-8)}`;
    }

    // ============================================================================
    // INVOICE OPERATIONS (Documentos de Venta)
    // ============================================================================

    /**
     * Sincroniza una factura a CONTPAQi con CFDI 4.0
     * @param {UnifiedInvoice} unifiedInvoice - Factura en formato unificado
     * @returns {Promise<Object>} Resultado de sincronización
     */
    async syncInvoice(unifiedInvoice) {
        try {
            await this.authenticate();

            // Ensure customer exists in CONTPAQi
            if (!unifiedInvoice.erpCustomerId) {
                throw new Error('Customer must be synced to CONTPAQi before syncing invoice (missing erpCustomerId)');
            }

            let existingDocumento = null;

            // Check if invoice already exists
            if (unifiedInvoice.erpId) {
                existingDocumento = await this.getInvoice(unifiedInvoice.erpId);
            }

            // Map to CONTPAQi Documento format
            const contpaqiDocumento = this._mapToCONTPAQiDocumento(unifiedInvoice, existingDocumento);

            let result;
            if (existingDocumento) {
                // Update existing invoice (only if not timbrado)
                if (!existingDocumento.CUUIDTIMBRADO) {
                    result = await this._makeRequest(
                        'PUT',
                        `/documentos/${existingDocumento.CIDDOCUMENTO}`,
                        contpaqiDocumento
                    );
                } else {
                    throw new Error('Cannot update a timbrado (stamped) invoice');
                }
            } else {
                // Create new invoice
                result = await this._makeRequest('POST', '/documentos', contpaqiDocumento);
            }

            // Si está habilitado CFDI y el documento es una factura, timbrar
            let cfdiData = null;
            if (this.config.enableCFDI && unifiedInvoice.requiresCFDI !== false) {
                cfdiData = await this._timbrarCFDI(result.CIDDOCUMENTO);
            }

            return {
                success: true,
                erpEntityId: result.CIDDOCUMENTO.toString(),
                erpEntityNumber: result.CSERIEDOCUMENTO + result.CFOLIO || null,
                erpData: {
                    serie: result.CSERIEDOCUMENTO,
                    folio: result.CFOLIO,
                    total: result.CNETO,
                    uuid: cfdiData?.uuid || null,
                    timbrado: !!cfdiData
                }
            };
        } catch (error) {
            console.error('Sync invoice to CONTPAQi error:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene una factura de CONTPAQi por ID
     * @param {string} documentoId - ID del documento en CONTPAQi
     * @returns {Promise<Object>} Datos del documento
     */
    async getInvoice(documentoId) {
        try {
            await this.authenticate();
            const response = await this._makeRequest('GET', `/documentos/${documentoId}`);
            return response || null;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Map UnifiedInvoice to CONTPAQi Documento format
     * @private
     */
    _mapToCONTPAQiDocumento(unifiedInvoice, existingDocumento = null) {
        const documento = {
            CIDCLIENTEPROVEEDOR: parseInt(unifiedInvoice.erpCustomerId),
            CIDDOCUMENTODE: 4, // 4 = Factura
            CSERIEDOCUMENTO: unifiedInvoice.series || 'A',
            CFECHA: this._formatDate(unifiedInvoice.date),
            CFECHAVENCIMIENTO: this._formatDate(unifiedInvoice.dueDate),
            CTIPOCAMBIO: 1.0, // Tipo de cambio (MXN)
            CIDMONEDA: 1, // 1 = Pesos mexicanos
            COBSERVACIONES: unifiedInvoice.notes || '',
            CMETODOPAG: unifiedInvoice.paymentMethod || 'PUE', // PUE = Pago en una sola exhibición
            CUSOCFDI: unifiedInvoice.cfdiUse || 'G03', // G03 = Gastos en general
            Movimientos: []
        };

        // Add line items (Movimientos)
        unifiedInvoice.lineItems.forEach((item, index) => {
            const movimiento = {
                CNUMEROMOVIMIENTO: index + 1,
                CCODIGOPRODUCTO: item.productCode || 'SERV001',
                CUNIDADES: item.quantity,
                CPRECIO: item.unitPrice,
                CNETO: item.quantity * item.unitPrice,
                COBSERVAMOV: item.description
            };

            // Add tax information
            if (item.taxAmount && item.taxAmount > 0) {
                movimiento.CIMPUESTO1 = item.taxAmount;
                movimiento.CPORCIENTO1 = 16; // IVA 16%
            }

            documento.Movimientos.push(movimiento);
        });

        // Calculate totals
        const subtotal = unifiedInvoice.lineItems.reduce((sum, item) => 
            sum + (item.quantity * item.unitPrice), 0);
        const totalTax = unifiedInvoice.lineItems.reduce((sum, item) => 
            sum + (item.taxAmount || 0), 0);
        
        documento.CSUBTOTAL = subtotal;
        documento.CIMPUESTO1 = totalTax;
        documento.CNETO = subtotal + totalTax;

        // Preserve existing ID if updating
        if (existingDocumento) {
            documento.CIDDOCUMENTO = existingDocumento.CIDDOCUMENTO;
        }

        return documento;
    }

    /**
     * Timbra un CFDI (obtiene UUID del PAC)
     * @private
     */
    async _timbrarCFDI(documentoId) {
        try {
            const response = await this._makeRequest('POST', `/cfdi/timbrar/${documentoId}`);
            
            return {
                success: true,
                uuid: response.UUID,
                fechaTimbrado: response.FechaTimbrado,
                xml: response.XML,
                pdf: response.PDF
            };
        } catch (error) {
            console.error('Error timbering CFDI:', error.message);
            throw new Error(`CFDI timbrado failed: ${error.message}`);
        }
    }

    // ============================================================================
    // PAYMENT OPERATIONS (Aplicaciones de Pago)
    // ============================================================================

    /**
     * Sincroniza un pago a CONTPAQi
     * @param {UnifiedPayment} unifiedPayment - Pago en formato unificado
     * @returns {Promise<Object>} Resultado de sincronización
     */
    async syncPayment(unifiedPayment) {
        try {
            await this.authenticate();

            // Ensure invoice exists in CONTPAQi
            if (!unifiedPayment.erpInvoiceId) {
                throw new Error('Invoice must be synced to CONTPAQi before syncing payment (missing erpInvoiceId)');
            }

            // Map to CONTPAQi Abono format
            const contpaqiAbono = this._mapToCONTPAQiAbono(unifiedPayment);

            // Create payment application
            const result = await this._makeRequest('POST', '/abonos', contpaqiAbono);

            // If CFDI is enabled, generate Complemento de Pago
            let complementoPago = null;
            if (this.config.enableCFDI && unifiedPayment.requiresCFDI !== false) {
                complementoPago = await this._generarComplementoPago(result.CIDABONO);
            }

            return {
                success: true,
                erpEntityId: result.CIDABONO.toString(),
                erpData: {
                    folio: result.CFOLIO,
                    importe: result.CIMPORTE,
                    fecha: result.CFECHA,
                    uuidComplemento: complementoPago?.uuid || null
                }
            };
        } catch (error) {
            console.error('Sync payment to CONTPAQi error:', error.message);
            throw error;
        }
    }

    /**
     * Obtiene un pago de CONTPAQi por ID
     * @param {string} abonoId - ID del abono en CONTPAQi
     * @returns {Promise<Object>} Datos del pago
     */
    async getPayment(abonoId) {
        try {
            await this.authenticate();
            const response = await this._makeRequest('GET', `/abonos/${abonoId}`);
            return response || null;
        } catch (error) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Map UnifiedPayment to CONTPAQi Abono format
     * @private
     */
    _mapToCONTPAQiAbono(unifiedPayment) {
        return {
            CIDDOCUMENTO: parseInt(unifiedPayment.erpInvoiceId),
            CFECHA: this._formatDate(unifiedPayment.date),
            CIMPORTE: unifiedPayment.amount,
            CREFERENCIA: unifiedPayment.reference || '',
            CFORMAPAGO: this._mapPaymentMethod(unifiedPayment.paymentMethod),
            COBSERVACIONES: unifiedPayment.notes || ''
        };
    }

    /**
     * Map payment method to CONTPAQi format
     * @private
     */
    _mapPaymentMethod(method) {
        const methodMap = {
            'cash': '01', // Efectivo
            'check': '02', // Cheque
            'transfer': '03', // Transferencia electrónica
            'credit_card': '04', // Tarjeta de crédito
            'debit_card': '28', // Tarjeta de débito
            'other': '99' // Por definir
        };
        return methodMap[method?.toLowerCase()] || '99';
    }

    /**
     * Genera Complemento de Pago (CFDI de pago)
     * @private
     */
    async _generarComplementoPago(abonoId) {
        try {
            const response = await this._makeRequest('POST', `/cfdi/complemento-pago/${abonoId}`);
            
            return {
                success: true,
                uuid: response.UUID,
                fechaTimbrado: response.FechaTimbrado,
                xml: response.XML,
                pdf: response.PDF
            };
        } catch (error) {
            console.error('Error generating complemento de pago:', error.message);
            throw error;
        }
    }

    // ============================================================================
    // CHART OF ACCOUNTS (Catálogo de Cuentas SAT)
    // ============================================================================

    /**
     * Obtiene el catálogo de cuentas de CONTPAQi
     * @returns {Promise<Array>} Lista de cuentas
     */
    async getChartOfAccounts() {
        try {
            await this.authenticate();
            const response = await this._makeRequest('GET', '/cuentas');
            
            return (response.data || []).map(cuenta => ({
                id: cuenta.CIDCUENTA.toString(),
                code: cuenta.CCODIGOCUENTA,
                name: cuenta.CNOMBRECUENTA,
                type: cuenta.CTIPOCUENTA,
                nature: cuenta.CNATURALEZA, // 0=Deudora, 1=Acreedora
                level: cuenta.CNIVEL,
                satCode: cuenta.CCODIGOSAT, // Código del catálogo SAT
                status: cuenta.CESTATUS
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
        // CONTPAQi requires specific account codes from SAT catalog
        // Store mapping for later use
        this.accountsMapping = {
            ...this.accountsMapping,
            ...mapping
        };
        return { success: true, mapping: this.accountsMapping };
    }

    // ============================================================================
    // REPORTS (Reportes Contables)
    // ============================================================================

    /**
     * Obtiene reporte de cuentas por cobrar
     * @param {Object} options - Opciones de reporte
     * @returns {Promise<Object>} Datos del reporte
     */
    async getAccountsReceivableReport(options = {}) {
        try {
            await this.authenticate();
            
            const params = {
                fechaInicio: options.startDate || this._formatDate(new Date(new Date().getFullYear(), 0, 1)),
                fechaFin: options.endDate || this._formatDate(new Date())
            };

            const response = await this._makeRequest('GET', '/reportes/cuentas-por-cobrar', null, params);
            
            return {
                reportName: 'Cuentas por Cobrar',
                reportDate: new Date().toISOString(),
                data: response.data || []
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
            await this.authenticate();
            
            const params = {
                fechaInicio: options.startDate || this._formatDate(new Date(new Date().getFullYear(), 0, 1)),
                fechaFin: options.endDate || this._formatDate(new Date())
            };

            const response = await this._makeRequest('GET', '/reportes/cuentas-por-pagar', null, params);
            
            return {
                reportName: 'Cuentas por Pagar',
                reportDate: new Date().toISOString(),
                data: response.data || []
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
     * Realiza una petición HTTP a la API de CONTPAQi
     * @private
     */
    async _makeRequest(method, endpoint, data = null, params = null, attempt = 1) {
        // Check rate limit
        await this._checkRateLimit();

        // Ensure authentication
        if (!this.sessionToken || (this.sessionExpiry && this.sessionExpiry < Date.now())) {
            await this.authenticate();
        }

        const config = {
            method,
            url: `${this.apiEndpoint}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${this.sessionToken}`,
                'Content-Type': 'application/json',
                'X-Company-Database': this.credentials.companyDatabase
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
            // Handle session expiration
            if (error.response?.status === 401 && attempt === 1) {
                this.sessionToken = null;
                await this.authenticate();
                return this._makeRequest(method, endpoint, data, params, attempt + 1);
            }

            // Retry on transient errors
            if (attempt < this.config.retryAttempts && this._isRetryableError(error)) {
                const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                await this._delay(delay);
                return this._makeRequest(method, endpoint, data, params, attempt + 1);
            }

            // Log error details
            console.error('CONTPAQi API request error:', {
                method,
                endpoint,
                status: error.response?.status,
                message: error.response?.data?.mensaje || error.message,
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
     * Format date to CONTPAQi format (YYYY-MM-DD)
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
        // CONTPAQi uses same entity for customers and vendors (diferenciados por tipo)
        const vendor = { ...unifiedVendor };
        const cliente = this._mapToCONTPAQiCliente(vendor);
        cliente.CTIPOCLIENTE = 2; // 2 = Proveedor
        
        await this.authenticate();
        const result = await this._makeRequest('POST', '/proveedores', cliente);
        
        return {
            success: true,
            erpEntityId: result.CIDCLIENTEPROVEEDOR.toString(),
            erpEntityNumber: result.CCODIGOCLIENTE
        };
    }

    async getVendor(vendorId) {
        await this.authenticate();
        return this._makeRequest('GET', `/proveedores/${vendorId}`);
    }

    async searchVendors(filters = {}) {
        await this.authenticate();
        const response = await this._makeRequest('GET', '/proveedores', null, filters);
        return response.data || [];
    }

    async syncBill(unifiedBill) {
        // Bills in CONTPAQi are documents with tipo = purchase
        const documento = this._mapToCONTPAQiDocumento(unifiedBill);
        documento.CIDDOCUMENTODE = 16; // 16 = Factura de compra
        
        await this.authenticate();
        const result = await this._makeRequest('POST', '/documentos', documento);
        
        return {
            success: true,
            erpEntityId: result.CIDDOCUMENTO.toString()
        };
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
        throw new Error('Manual journal entries require direct accounting module access');
    }

    async getBalanceSheet(options = {}) {
        await this.authenticate();
        const response = await this._makeRequest('GET', '/reportes/balance-general', null, {
            fecha: options.asOfDate || this._formatDate(new Date())
        });
        return response;
    }

    async getProfitAndLoss(options = {}) {
        await this.authenticate();
        const response = await this._makeRequest('GET', '/reportes/estado-resultados', null, {
            fechaInicio: options.startDate || this._formatDate(new Date(new Date().getFullYear(), 0, 1)),
            fechaFin: options.endDate || this._formatDate(new Date())
        });
        return response;
    }

    async getCashFlowStatement(options = {}) {
        await this.authenticate();
        const response = await this._makeRequest('GET', '/reportes/flujo-efectivo', null, {
            fechaInicio: options.startDate || this._formatDate(new Date(new Date().getFullYear(), 0, 1)),
            fechaFin: options.endDate || this._formatDate(new Date())
        });
        return response;
    }

    async getTaxRates() {
        // Mexican tax rates are standardized
        return [
            { name: 'IVA 16%', rate: 0.16, type: 'IVA', code: '002' },
            { name: 'IVA 8% Frontera', rate: 0.08, type: 'IVA', code: '002' },
            { name: 'IVA 0%', rate: 0.00, type: 'IVA', code: '002' },
            { name: 'Retención IVA', rate: 0.1067, type: 'Retención', code: '002' },
            { name: 'Retención ISR', rate: 0.10, type: 'Retención', code: '001' },
            { name: 'IEPS', rate: 0.08, type: 'IEPS', code: '003' }
        ];
    }
}

module.exports = CONTPAQiAdapter;
