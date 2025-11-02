/**
 * Unified Data Models
 * Standard models that represent Spirit Tours data in a normalized format
 * All adapters translate to/from these models
 */

/**
 * Unified Customer Model
 * @typedef {Object} UnifiedCustomer
 */
class UnifiedCustomer {
    constructor(data = {}) {
        this.id = data.id || null;                          // Spirit Tours customer ID
        this.displayName = data.displayName || '';           // Customer name
        this.companyName = data.companyName || null;         // Company name (if B2B)
        this.givenName = data.givenName || '';               // First name
        this.familyName = data.familyName || '';             // Last name
        this.email = data.email || null;
        this.phone = data.phone || null;
        this.mobile = data.mobile || null;
        
        // Address
        this.billingAddress = {
            line1: data.billingAddress?.line1 || '',
            line2: data.billingAddress?.line2 || null,
            city: data.billingAddress?.city || '',
            state: data.billingAddress?.state || '',
            postalCode: data.billingAddress?.postalCode || '',
            country: data.billingAddress?.country || ''
        };
        
        // Tax IDs
        this.taxId = data.taxId || null;                     // RFC, VAT, TRN, etc.
        this.taxIdType = data.taxIdType || null;             // RFC, VAT, SSN, etc.
        
        // Metadata
        this.notes = data.notes || null;
        this.currency = data.currency || 'USD';
        this.active = data.active !== undefined ? data.active : true;
        this.customFields = data.customFields || {};
    }
    
    /**
     * Create from Spirit Tours customer
     * @param {Object} spiritToursCustomer
     * @returns {UnifiedCustomer}
     */
    static fromSpiritTours(spiritToursCustomer) {
        return new UnifiedCustomer({
            id: spiritToursCustomer.id,
            displayName: spiritToursCustomer.name || 
                        `${spiritToursCustomer.first_name} ${spiritToursCustomer.last_name}`,
            givenName: spiritToursCustomer.first_name,
            familyName: spiritToursCustomer.last_name,
            email: spiritToursCustomer.email,
            phone: spiritToursCustomer.phone,
            mobile: spiritToursCustomer.mobile,
            billingAddress: {
                line1: spiritToursCustomer.address,
                city: spiritToursCustomer.city,
                state: spiritToursCustomer.state,
                postalCode: spiritToursCustomer.postal_code,
                country: spiritToursCustomer.country
            },
            taxId: spiritToursCustomer.tax_id || spiritToursCustomer.rfc,
            notes: spiritToursCustomer.notes,
            currency: spiritToursCustomer.currency || 'USD',
            active: spiritToursCustomer.active
        });
    }
}

/**
 * Unified Invoice Model (Cuenta por Cobrar)
 * @typedef {Object} UnifiedInvoice
 */
class UnifiedInvoice {
    constructor(data = {}) {
        this.id = data.id || null;                          // Spirit Tours CXC ID
        this.invoiceNumber = data.invoiceNumber || '';       // Folio
        this.customerId = data.customerId || null;
        this.customerName = data.customerName || '';
        
        // Dates
        this.txnDate = data.txnDate || new Date();          // Issue date
        this.dueDate = data.dueDate || null;
        
        // Amounts
        this.subtotal = data.subtotal || 0;
        this.taxAmount = data.taxAmount || 0;
        this.total = data.total || 0;
        this.amountPaid = data.amountPaid || 0;
        this.balance = data.balance || 0;
        
        // Currency
        this.currency = data.currency || 'USD';
        
        // Line Items
        this.lineItems = data.lineItems || [];
        
        // Tax Details
        this.taxDetails = data.taxDetails || [];
        
        // Status
        this.status = data.status || 'pending';              // pending, partial, paid, overdue
        
        // References
        this.referenceId = data.referenceId || null;         // Trip ID, Booking reference
        this.notes = data.notes || '';
        this.privateNote = data.privateNote || '';
        
        // Department/Class (for multi-branch)
        this.departmentId = data.departmentId || null;
        this.classId = data.classId || null;
        
        // Custom Fields
        this.customFields = data.customFields || {};
    }
    
    /**
     * Create from Spirit Tours CXC
     * @param {Object} cxc - Cuenta por Cobrar from Spirit Tours
     * @returns {UnifiedInvoice}
     */
    static fromSpiritTours(cxc) {
        return new UnifiedInvoice({
            id: cxc.id,
            invoiceNumber: cxc.folio,
            customerId: cxc.customer_id,
            customerName: cxc.customer_name,
            txnDate: cxc.fecha_emision,
            dueDate: cxc.fecha_vencimiento,
            subtotal: parseFloat(cxc.monto_total - (cxc.impuestos || 0)),
            taxAmount: parseFloat(cxc.impuestos || 0),
            total: parseFloat(cxc.monto_total),
            amountPaid: parseFloat(cxc.monto_pagado || 0),
            balance: parseFloat(cxc.monto_pendiente || cxc.monto_total),
            currency: cxc.moneda || 'USD',
            status: cxc.status,
            referenceId: cxc.trip_id,
            notes: cxc.concepto,
            privateNote: cxc.notas_internas,
            lineItems: cxc.detalles || [{
                description: cxc.concepto,
                quantity: 1,
                unitPrice: parseFloat(cxc.monto_total - (cxc.impuestos || 0)),
                amount: parseFloat(cxc.monto_total - (cxc.impuestos || 0))
            }],
            customFields: {
                trip_id: cxc.trip_id,
                sucursal_id: cxc.sucursal_id
            }
        });
    }
}

/**
 * Unified Payment Model
 * @typedef {Object} UnifiedPayment
 */
class UnifiedPayment {
    constructor(data = {}) {
        this.id = data.id || null;
        this.paymentNumber = data.paymentNumber || '';
        this.customerId = data.customerId || null;
        this.txnDate = data.txnDate || new Date();
        this.totalAmount = data.totalAmount || 0;
        this.currency = data.currency || 'USD';
        
        // Payment Method
        this.paymentMethod = data.paymentMethod || 'cash';   // cash, credit_card, bank_transfer, etc.
        this.paymentMethodId = data.paymentMethodId || null;
        
        // Bank/Account
        this.depositToAccountId = data.depositToAccountId || null;
        this.depositToAccountName = data.depositToAccountName || null;
        
        // Reference
        this.referenceNumber = data.referenceNumber || '';
        this.notes = data.notes || '';
        
        // Linked Invoices
        this.linkedInvoices = data.linkedInvoices || [];     // [{invoiceId, amount}]
        
        // Custom Fields
        this.customFields = data.customFields || {};
    }
    
    /**
     * Create from Spirit Tours payment
     * @param {Object} payment
     * @returns {UnifiedPayment}
     */
    static fromSpiritTours(payment) {
        return new UnifiedPayment({
            id: payment.id,
            paymentNumber: payment.folio,
            customerId: payment.customer_id,
            txnDate: payment.fecha_pago,
            totalAmount: parseFloat(payment.monto),
            currency: payment.moneda || 'USD',
            paymentMethod: payment.metodo_pago,
            referenceNumber: payment.referencia || payment.referencia_bancaria,
            notes: payment.notas,
            linkedInvoices: payment.cxc_id ? [{
                invoiceId: payment.cxc_id,
                amount: parseFloat(payment.monto)
            }] : [],
            customFields: {
                sucursal_id: payment.sucursal_id,
                banco: payment.banco
            }
        });
    }
}

/**
 * Unified Vendor Model
 * @typedef {Object} UnifiedVendor
 */
class UnifiedVendor {
    constructor(data = {}) {
        this.id = data.id || null;
        this.displayName = data.displayName || '';
        this.companyName = data.companyName || '';
        this.contactName = data.contactName || null;
        this.email = data.email || null;
        this.phone = data.phone || null;
        
        // Address
        this.billingAddress = {
            line1: data.billingAddress?.line1 || '',
            line2: data.billingAddress?.line2 || null,
            city: data.billingAddress?.city || '',
            state: data.billingAddress?.state || '',
            postalCode: data.billingAddress?.postalCode || '',
            country: data.billingAddress?.country || ''
        };
        
        // Tax ID
        this.taxId = data.taxId || null;
        
        // Payment Terms
        this.paymentTerms = data.paymentTerms || 'NET_30';   // NET_15, NET_30, NET_60, etc.
        
        // Metadata
        this.notes = data.notes || null;
        this.currency = data.currency || 'USD';
        this.active = data.active !== undefined ? data.active : true;
        this.customFields = data.customFields || {};
    }
    
    /**
     * Create from Spirit Tours vendor
     * @param {Object} vendor
     * @returns {UnifiedVendor}
     */
    static fromSpiritTours(vendor) {
        return new UnifiedVendor({
            id: vendor.id,
            displayName: vendor.nombre_comercial || vendor.razon_social,
            companyName: vendor.razon_social,
            contactName: vendor.contacto_nombre,
            email: vendor.email,
            phone: vendor.telefono,
            billingAddress: {
                line1: vendor.direccion,
                city: vendor.ciudad,
                state: vendor.estado,
                postalCode: vendor.codigo_postal,
                country: vendor.pais
            },
            taxId: vendor.rfc || vendor.tax_id,
            paymentTerms: vendor.plazo_pago_dias ? `NET_${vendor.plazo_pago_dias}` : 'NET_30',
            notes: vendor.notas,
            currency: vendor.moneda || 'USD',
            active: vendor.activo
        });
    }
}

/**
 * Unified Bill Model (Cuenta por Pagar)
 * @typedef {Object} UnifiedBill
 */
class UnifiedBill {
    constructor(data = {}) {
        this.id = data.id || null;
        this.billNumber = data.billNumber || '';
        this.vendorId = data.vendorId || null;
        this.vendorName = data.vendorName || '';
        
        // Dates
        this.txnDate = data.txnDate || new Date();
        this.dueDate = data.dueDate || null;
        
        // Amounts
        this.subtotal = data.subtotal || 0;
        this.taxAmount = data.taxAmount || 0;
        this.total = data.total || 0;
        this.amountPaid = data.amountPaid || 0;
        this.balance = data.balance || 0;
        
        // Currency
        this.currency = data.currency || 'USD';
        
        // Line Items
        this.lineItems = data.lineItems || [];
        
        // Status
        this.status = data.status || 'pending';
        
        // References
        this.referenceId = data.referenceId || null;
        this.notes = data.notes || '';
        this.privateNote = data.privateNote || '';
        
        // Department/Class
        this.departmentId = data.departmentId || null;
        this.classId = data.classId || null;
        
        // Custom Fields
        this.customFields = data.customFields || {};
    }
    
    /**
     * Create from Spirit Tours CXP
     * @param {Object} cxp
     * @returns {UnifiedBill}
     */
    static fromSpiritTours(cxp) {
        return new UnifiedBill({
            id: cxp.id,
            billNumber: cxp.folio,
            vendorId: cxp.proveedor_id,
            vendorName: cxp.proveedor_nombre,
            txnDate: cxp.fecha_emision,
            dueDate: cxp.fecha_vencimiento,
            subtotal: parseFloat(cxp.monto_total - (cxp.impuestos || 0)),
            taxAmount: parseFloat(cxp.impuestos || 0),
            total: parseFloat(cxp.monto_total),
            amountPaid: parseFloat(cxp.monto_pagado || 0),
            balance: parseFloat(cxp.monto_pendiente || cxp.monto_total),
            currency: cxp.moneda || 'USD',
            status: cxp.status,
            referenceId: cxp.trip_id,
            notes: cxp.concepto,
            privateNote: cxp.notas_internas,
            lineItems: cxp.detalles || [{
                description: cxp.concepto,
                quantity: 1,
                unitPrice: parseFloat(cxp.monto_total - (cxp.impuestos || 0)),
                amount: parseFloat(cxp.monto_total - (cxp.impuestos || 0)),
                accountId: null
            }],
            customFields: {
                trip_id: cxp.trip_id,
                sucursal_id: cxp.sucursal_id,
                tipo_gasto: cxp.tipo_gasto
            }
        });
    }
}

/**
 * Unified Bill Payment Model
 * @typedef {Object} UnifiedBillPayment
 */
class UnifiedBillPayment {
    constructor(data = {}) {
        this.id = data.id || null;
        this.paymentNumber = data.paymentNumber || '';
        this.vendorId = data.vendorId || null;
        this.txnDate = data.txnDate || new Date();
        this.totalAmount = data.totalAmount || 0;
        this.currency = data.currency || 'USD';
        
        // Payment Method
        this.paymentMethod = data.paymentMethod || 'check';
        this.paymentMethodId = data.paymentMethodId || null;
        
        // Bank/Account
        this.bankAccountId = data.bankAccountId || null;
        this.bankAccountName = data.bankAccountName || null;
        
        // Reference
        this.referenceNumber = data.referenceNumber || '';
        this.checkNumber = data.checkNumber || null;
        this.notes = data.notes || '';
        
        // Linked Bills
        this.linkedBills = data.linkedBills || [];
        
        // Custom Fields
        this.customFields = data.customFields || {};
    }
    
    /**
     * Create from Spirit Tours bill payment
     * @param {Object} payment
     * @returns {UnifiedBillPayment}
     */
    static fromSpiritTours(payment) {
        return new UnifiedBillPayment({
            id: payment.id,
            paymentNumber: payment.folio,
            vendorId: payment.proveedor_id,
            txnDate: payment.fecha_pago,
            totalAmount: parseFloat(payment.monto),
            currency: payment.moneda || 'USD',
            paymentMethod: payment.metodo_pago,
            referenceNumber: payment.referencia || payment.referencia_bancaria,
            notes: payment.notas,
            linkedBills: payment.cxp_id ? [{
                billId: payment.cxp_id,
                amount: parseFloat(payment.monto)
            }] : [],
            customFields: {
                sucursal_id: payment.sucursal_id,
                banco: payment.banco
            }
        });
    }
}

/**
 * Unified Credit Memo Model (Reembolso)
 * @typedef {Object} UnifiedCreditMemo
 */
class UnifiedCreditMemo {
    constructor(data = {}) {
        this.id = data.id || null;
        this.creditMemoNumber = data.creditMemoNumber || '';
        this.customerId = data.customerId || null;
        this.txnDate = data.txnDate || new Date();
        this.subtotal = data.subtotal || 0;
        this.taxAmount = data.taxAmount || 0;
        this.total = data.total || 0;
        this.currency = data.currency || 'USD';
        this.lineItems = data.lineItems || [];
        this.linkedInvoiceId = data.linkedInvoiceId || null;
        this.notes = data.notes || '';
        this.customFields = data.customFields || {};
    }
    
    /**
     * Create from Spirit Tours refund
     * @param {Object} refund
     * @returns {UnifiedCreditMemo}
     */
    static fromSpiritTours(refund) {
        return new UnifiedCreditMemo({
            id: refund.id,
            creditMemoNumber: refund.folio,
            customerId: refund.customer_id,
            txnDate: refund.fecha_reembolso,
            subtotal: parseFloat(refund.monto_reembolso),
            total: parseFloat(refund.monto_reembolso),
            currency: refund.moneda || 'USD',
            linkedInvoiceId: refund.cxc_id,
            notes: `Reembolso: ${refund.motivo}`,
            lineItems: [{
                description: `Reembolso ${refund.porcentaje_reembolsado}%`,
                quantity: 1,
                unitPrice: parseFloat(refund.monto_reembolso),
                amount: parseFloat(refund.monto_reembolso)
            }],
            customFields: {
                trip_id: refund.trip_id,
                sucursal_id: refund.sucursal_id,
                monto_retenido: refund.monto_retenido
            }
        });
    }
}

module.exports = {
    UnifiedCustomer,
    UnifiedInvoice,
    UnifiedPayment,
    UnifiedVendor,
    UnifiedBill,
    UnifiedBillPayment,
    UnifiedCreditMemo
};
