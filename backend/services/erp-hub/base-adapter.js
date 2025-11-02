/**
 * Base Adapter Class for ERP Integrations
 * All specific ERP adapters must extend this class
 * 
 * @class AccountingAdapter
 * @abstract
 */
class AccountingAdapter {
    constructor(config = {}) {
        if (this.constructor === AccountingAdapter) {
            throw new Error('AccountingAdapter is abstract and cannot be instantiated directly');
        }
        
        this.config = config;
        this.isAuthenticated = false;
        this.lastSync = null;
        this.errors = [];
    }
    
    /**
     * Authenticate with the ERP system
     * @abstract
     * @returns {Promise<boolean>}
     */
    async authenticate() {
        throw new Error('Method authenticate() must be implemented by subclass');
    }
    
    /**
     * Disconnect from the ERP system
     * @abstract
     * @returns {Promise<boolean>}
     */
    async disconnect() {
        throw new Error('Method disconnect() must be implemented by subclass');
    }
    
    /**
     * Test connection to ERP
     * @returns {Promise<Object>}
     */
    async testConnection() {
        try {
            await this.authenticate();
            return {
                success: true,
                message: 'Connection successful',
                provider: this.constructor.name
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                provider: this.constructor.name
            };
        }
    }
    
    // ===== CUSTOMER MANAGEMENT =====
    
    /**
     * Sync customer to ERP
     * @abstract
     * @param {Object} customer - Spirit Tours customer object
     * @returns {Promise<Object>} ERP customer object with ID
     */
    async syncCustomer(customer) {
        throw new Error('Method syncCustomer() must be implemented by subclass');
    }
    
    /**
     * Get customer from ERP
     * @abstract
     * @param {string} erpCustomerId - Customer ID in ERP
     * @returns {Promise<Object>}
     */
    async getCustomer(erpCustomerId) {
        throw new Error('Method getCustomer() must be implemented by subclass');
    }
    
    /**
     * Update customer in ERP
     * @abstract
     * @param {string} erpCustomerId
     * @param {Object} customerData
     * @returns {Promise<Object>}
     */
    async updateCustomer(erpCustomerId, customerData) {
        throw new Error('Method updateCustomer() must be implemented by subclass');
    }
    
    // ===== INVOICE MANAGEMENT =====
    
    /**
     * Sync invoice (cuenta por cobrar) to ERP
     * @abstract
     * @param {Object} invoice - Spirit Tours invoice/CXC object
     * @returns {Promise<Object>} ERP invoice object with ID
     */
    async syncInvoice(invoice) {
        throw new Error('Method syncInvoice() must be implemented by subclass');
    }
    
    /**
     * Get invoice from ERP
     * @abstract
     * @param {string} erpInvoiceId
     * @returns {Promise<Object>}
     */
    async getInvoice(erpInvoiceId) {
        throw new Error('Method getInvoice() must be implemented by subclass');
    }
    
    /**
     * Update invoice in ERP
     * @abstract
     * @param {string} erpInvoiceId
     * @param {Object} invoiceData
     * @returns {Promise<Object>}
     */
    async updateInvoice(erpInvoiceId, invoiceData) {
        throw new Error('Method updateInvoice() must be implemented by subclass');
    }
    
    /**
     * Void/cancel invoice in ERP
     * @abstract
     * @param {string} erpInvoiceId
     * @returns {Promise<Object>}
     */
    async voidInvoice(erpInvoiceId) {
        throw new Error('Method voidInvoice() must be implemented by subclass');
    }
    
    // ===== PAYMENT MANAGEMENT =====
    
    /**
     * Sync payment received to ERP
     * @abstract
     * @param {Object} payment - Spirit Tours payment object
     * @returns {Promise<Object>} ERP payment object with ID
     */
    async syncPayment(payment) {
        throw new Error('Method syncPayment() must be implemented by subclass');
    }
    
    /**
     * Get payment from ERP
     * @abstract
     * @param {string} erpPaymentId
     * @returns {Promise<Object>}
     */
    async getPayment(erpPaymentId) {
        throw new Error('Method getPayment() must be implemented by subclass');
    }
    
    // ===== VENDOR MANAGEMENT =====
    
    /**
     * Sync vendor/supplier to ERP
     * @abstract
     * @param {Object} vendor - Spirit Tours vendor object
     * @returns {Promise<Object>} ERP vendor object with ID
     */
    async syncVendor(vendor) {
        throw new Error('Method syncVendor() must be implemented by subclass');
    }
    
    /**
     * Get vendor from ERP
     * @abstract
     * @param {string} erpVendorId
     * @returns {Promise<Object>}
     */
    async getVendor(erpVendorId) {
        throw new Error('Method getVendor() must be implemented by subclass');
    }
    
    /**
     * Update vendor in ERP
     * @abstract
     * @param {string} erpVendorId
     * @param {Object} vendorData
     * @returns {Promise<Object>}
     */
    async updateVendor(erpVendorId, vendorData) {
        throw new Error('Method updateVendor() must be implemented by subclass');
    }
    
    // ===== BILL MANAGEMENT (Cuentas por Pagar) =====
    
    /**
     * Sync bill (cuenta por pagar) to ERP
     * @abstract
     * @param {Object} bill - Spirit Tours CXP object
     * @returns {Promise<Object>} ERP bill object with ID
     */
    async syncBill(bill) {
        throw new Error('Method syncBill() must be implemented by subclass');
    }
    
    /**
     * Get bill from ERP
     * @abstract
     * @param {string} erpBillId
     * @returns {Promise<Object>}
     */
    async getBill(erpBillId) {
        throw new Error('Method getBill() must be implemented by subclass');
    }
    
    /**
     * Update bill in ERP
     * @abstract
     * @param {string} erpBillId
     * @param {Object} billData
     * @returns {Promise<Object>}
     */
    async updateBill(erpBillId, billData) {
        throw new Error('Method updateBill() must be implemented by subclass');
    }
    
    /**
     * Void/cancel bill in ERP
     * @abstract
     * @param {string} erpBillId
     * @returns {Promise<Object>}
     */
    async voidBill(erpBillId) {
        throw new Error('Method voidBill() must be implemented by subclass');
    }
    
    // ===== BILL PAYMENT MANAGEMENT =====
    
    /**
     * Sync bill payment to ERP
     * @abstract
     * @param {Object} billPayment - Spirit Tours bill payment object
     * @returns {Promise<Object>} ERP bill payment object with ID
     */
    async syncBillPayment(billPayment) {
        throw new Error('Method syncBillPayment() must be implemented by subclass');
    }
    
    /**
     * Get bill payment from ERP
     * @abstract
     * @param {string} erpBillPaymentId
     * @returns {Promise<Object>}
     */
    async getBillPayment(erpBillPaymentId) {
        throw new Error('Method getBillPayment() must be implemented by subclass');
    }
    
    // ===== CHART OF ACCOUNTS =====
    
    /**
     * Get chart of accounts from ERP
     * @abstract
     * @returns {Promise<Array>}
     */
    async getChartOfAccounts() {
        throw new Error('Method getChartOfAccounts() must be implemented by subclass');
    }
    
    /**
     * Get specific account by ID
     * @abstract
     * @param {string} accountId
     * @returns {Promise<Object>}
     */
    async getAccount(accountId) {
        throw new Error('Method getAccount() must be implemented by subclass');
    }
    
    // ===== CREDIT MEMO (Reembolsos) =====
    
    /**
     * Sync credit memo (reembolso) to ERP
     * @abstract
     * @param {Object} creditMemo - Spirit Tours refund object
     * @returns {Promise<Object>} ERP credit memo object with ID
     */
    async syncCreditMemo(creditMemo) {
        throw new Error('Method syncCreditMemo() must be implemented by subclass');
    }
    
    // ===== REPORTING =====
    
    /**
     * Get profit and loss report
     * @abstract
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {Promise<Object>}
     */
    async getProfitAndLossReport(startDate, endDate) {
        throw new Error('Method getProfitAndLossReport() must be implemented by subclass');
    }
    
    /**
     * Get balance sheet report
     * @abstract
     * @param {Date} asOfDate
     * @returns {Promise<Object>}
     */
    async getBalanceSheetReport(asOfDate) {
        throw new Error('Method getBalanceSheetReport() must be implemented by subclass');
    }
    
    // ===== UTILITY METHODS =====
    
    /**
     * Log error
     * @param {string} method
     * @param {Error} error
     */
    logError(method, error) {
        const errorLog = {
            timestamp: new Date(),
            method,
            message: error.message,
            stack: error.stack
        };
        this.errors.push(errorLog);
        console.error(`[${this.constructor.name}] ${method}:`, error);
    }
    
    /**
     * Get recent errors
     * @returns {Array}
     */
    getErrors() {
        return this.errors;
    }
    
    /**
     * Clear errors
     */
    clearErrors() {
        this.errors = [];
    }
    
    /**
     * Get adapter info
     * @returns {Object}
     */
    getInfo() {
        return {
            name: this.constructor.name,
            isAuthenticated: this.isAuthenticated,
            lastSync: this.lastSync,
            errorCount: this.errors.length
        };
    }
}

module.exports = AccountingAdapter;
