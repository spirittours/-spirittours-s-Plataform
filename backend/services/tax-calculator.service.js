/**
 * Tax Calculator Service
 * 
 * Servicio para cálculo de impuestos multi-región según jurisdicción.
 * Maneja Sales Tax (USA), IVA (México, España), VAT (UAE, Israel), y retenciones.
 * 
 * Características:
 * - Cálculo de impuestos por país y jurisdicción
 * - Soporte para múltiples tipos de impuestos (IVA, Sales Tax, VAT, GST, ISR)
 * - Reglas de exención por tipo de servicio/producto
 * - Cálculo de retenciones
 * - Histórico de tasas impositivas
 * - Compliance fiscal automático
 * 
 * @module services/tax-calculator
 * @author Spirit Tours Dev Team - GenSpark AI Developer
 * @version 1.0.0
 */

const { Pool } = require('pg');

class TaxCalculatorService {
    constructor(dbPool) {
        this.db = dbPool;
        
        // Tasas de impuestos por país (defaults)
        this.defaultRates = {
            US: {
                type: 'sales_tax',
                federal: 0.00, // No federal sales tax in USA
                stateRates: {
                    // Ejemplos de estados principales
                    'CA': 7.25,  // California
                    'TX': 6.25,  // Texas
                    'FL': 6.00,  // Florida
                    'NY': 4.00,  // New York
                    'IL': 6.25,  // Illinois
                    'NV': 6.85,  // Nevada (Las Vegas)
                    'AZ': 5.60   // Arizona
                }
            },
            MX: {
                type: 'iva',
                standard: 16.00,      // IVA estándar
                reduced: 8.00,        // IVA frontera norte
                zero: 0.00,           // Tasa 0%
                exempt: 0.00,         // Exento
                retention: 10.67      // Retención de IVA (2/3 partes de 16%)
            },
            AE: {
                type: 'vat',
                standard: 5.00,       // VAT estándar UAE
                zero: 0.00,           // Zero-rated
                exempt: 0.00          // Exempt
            },
            ES: {
                type: 'iva',
                standard: 21.00,      // IVA general
                reduced: 10.00,       // IVA reducido
                superReduced: 4.00,   // IVA superreducido
                zero: 0.00,           // Tipo cero
                exempt: 0.00          // Exento
            },
            IL: {
                type: 'vat',
                standard: 17.00,      // VAT Israel
                zero: 0.00,
                exempt: 0.00
            }
        };

        // Categorías de servicios turísticos
        this.serviceCategories = {
            tours: 'standard',           // Tours turísticos
            transportation: 'standard',  // Transporte
            accommodation: 'standard',   // Hospedaje
            food: 'reduced',            // Alimentos (puede tener tasa reducida)
            tickets: 'standard',        // Boletos eventos
            insurance: 'exempt'         // Seguros (generalmente exentos)
        };
    }

    // ============================================================================
    // MÉTODOS PRINCIPALES
    // ============================================================================

    /**
     * Calcula impuestos para una transacción
     * @param {Object} params - Parámetros de cálculo
     * @returns {Promise<Object>} Resultado del cálculo
     */
    async calculateTax(params) {
        const {
            sucursalId,
            countryCode,
            stateCode,
            amount,
            serviceCategory = 'tours',
            includesTax = false,
            customerId = null
        } = params;

        // Validar parámetros
        if (!sucursalId || !countryCode || !amount) {
            throw new Error('sucursalId, countryCode, and amount are required');
        }

        // Obtener configuración fiscal de la sucursal
        const fiscalConfig = await this._getFiscalConfig(sucursalId);

        // Determinar método de cálculo según país
        let taxResult;
        switch (countryCode.toUpperCase()) {
            case 'US':
                taxResult = await this._calculateUSATax(amount, stateCode, serviceCategory, includesTax);
                break;
            case 'MX':
                taxResult = await this._calculateMexicoTax(amount, serviceCategory, includesTax, fiscalConfig);
                break;
            case 'AE':
                taxResult = await this._calculateUAETax(amount, serviceCategory, includesTax);
                break;
            case 'ES':
                taxResult = await this._calculateSpainTax(amount, serviceCategory, includesTax);
                break;
            case 'IL':
                taxResult = await this._calculateIsraelTax(amount, serviceCategory, includesTax);
                break;
            default:
                throw new Error(`Tax calculation not supported for country: ${countryCode}`);
        }

        // Agregar metadatos
        taxResult.metadata = {
            countryCode,
            stateCode: stateCode || null,
            serviceCategory,
            includesTax,
            calculatedAt: new Date().toISOString()
        };

        return taxResult;
    }

    /**
     * Calcula impuestos para múltiples líneas de una factura
     * @param {Object} params - Parámetros
     * @returns {Promise<Object>} Resultado consolidado
     */
    async calculateInvoiceTaxes(params) {
        const { sucursalId, countryCode, stateCode, lineItems } = params;

        if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
            throw new Error('lineItems array is required');
        }

        const results = {
            lineItems: [],
            totals: {
                subtotal: 0,
                totalTax: 0,
                total: 0
            },
            taxBreakdown: {}
        };

        // Calcular impuestos para cada línea
        for (const item of lineItems) {
            const taxResult = await this.calculateTax({
                sucursalId,
                countryCode,
                stateCode,
                amount: item.amount,
                serviceCategory: item.category || 'tours',
                includesTax: false
            });

            results.lineItems.push({
                description: item.description,
                amount: item.amount,
                tax: taxResult.taxAmount,
                total: taxResult.totalAmount,
                taxDetails: taxResult.breakdown
            });

            // Acumular totales
            results.totals.subtotal += item.amount;
            results.totals.totalTax += taxResult.taxAmount;

            // Acumular por tipo de impuesto
            for (const tax of taxResult.breakdown) {
                if (!results.taxBreakdown[tax.taxType]) {
                    results.taxBreakdown[tax.taxType] = {
                        rate: tax.rate,
                        amount: 0
                    };
                }
                results.taxBreakdown[tax.taxType].amount += tax.amount;
            }
        }

        results.totals.total = results.totals.subtotal + results.totals.totalTax;

        // Redondear totales
        results.totals.subtotal = this._round(results.totals.subtotal);
        results.totals.totalTax = this._round(results.totals.totalTax);
        results.totals.total = this._round(results.totals.total);

        return results;
    }

    // ============================================================================
    // CÁLCULOS POR PAÍS
    // ============================================================================

    /**
     * Calcula Sales Tax para USA
     */
    async _calculateUSATax(amount, stateCode, category, includesTax) {
        if (!stateCode) {
            throw new Error('stateCode is required for USA tax calculation');
        }

        // Obtener tasa del estado
        const stateRate = this.defaultRates.US.stateRates[stateCode.toUpperCase()] || 0;

        // Algunos estados no tienen sales tax (Alaska, Delaware, Montana, New Hampshire, Oregon)
        const noSalesTaxStates = ['AK', 'DE', 'MT', 'NH', 'OR'];
        const effectiveRate = noSalesTaxStates.includes(stateCode.toUpperCase()) ? 0 : stateRate;

        let subtotal, taxAmount, total;

        if (includesTax) {
            // El monto incluye impuesto, hay que separarlo
            total = amount;
            subtotal = amount / (1 + (effectiveRate / 100));
            taxAmount = total - subtotal;
        } else {
            // El monto es sin impuesto
            subtotal = amount;
            taxAmount = amount * (effectiveRate / 100);
            total = subtotal + taxAmount;
        }

        return {
            subtotal: this._round(subtotal),
            taxAmount: this._round(taxAmount),
            totalAmount: this._round(total),
            breakdown: [{
                taxType: 'Sales Tax',
                taxName: `${stateCode.toUpperCase()} Sales Tax`,
                rate: effectiveRate,
                taxableBase: this._round(subtotal),
                amount: this._round(taxAmount)
            }]
        };
    }

    /**
     * Calcula IVA para México
     */
    async _calculateMexicoTax(amount, category, includesTax, fiscalConfig) {
        // Determinar tasa de IVA (16% estándar, 8% zona fronteriza)
        const ivaRate = fiscalConfig?.tasa_iva || this.defaultRates.MX.standard;
        
        // Determinar si aplica retención (10.67% = 2/3 de 16%)
        const applicaRetencion = fiscalConfig?.aplica_retencion_iva || false;
        const retencionRate = this.defaultRates.MX.retention;

        let subtotal, ivaAmount, retencionAmount, total;

        if (includesTax) {
            // El monto incluye IVA
            total = amount;
            subtotal = amount / (1 + (ivaRate / 100));
            ivaAmount = total - subtotal;
        } else {
            // El monto es sin IVA
            subtotal = amount;
            ivaAmount = amount * (ivaRate / 100);
            total = subtotal + ivaAmount;
        }

        // Calcular retención si aplica
        retencionAmount = applicaRetencion ? (subtotal * (retencionRate / 100)) : 0;
        
        // El total final es: subtotal + IVA - Retención
        const totalFinal = total - retencionAmount;

        const breakdown = [
            {
                taxType: 'IVA',
                taxName: 'IVA Trasladado',
                rate: ivaRate,
                taxableBase: this._round(subtotal),
                amount: this._round(ivaAmount)
            }
        ];

        if (applicaRetencion) {
            breakdown.push({
                taxType: 'Retención IVA',
                taxName: 'Retención de IVA',
                rate: retencionRate,
                taxableBase: this._round(subtotal),
                amount: this._round(-retencionAmount) // Negativo porque se resta
            });
        }

        return {
            subtotal: this._round(subtotal),
            taxAmount: this._round(ivaAmount - retencionAmount),
            ivaAmount: this._round(ivaAmount),
            retencionAmount: this._round(retencionAmount),
            totalAmount: this._round(totalFinal),
            breakdown
        };
    }

    /**
     * Calcula VAT para UAE
     */
    async _calculateUAETax(amount, category, includesTax) {
        const vatRate = this.defaultRates.AE.standard;

        let subtotal, vatAmount, total;

        if (includesTax) {
            total = amount;
            subtotal = amount / (1 + (vatRate / 100));
            vatAmount = total - subtotal;
        } else {
            subtotal = amount;
            vatAmount = amount * (vatRate / 100);
            total = subtotal + vatAmount;
        }

        return {
            subtotal: this._round(subtotal),
            taxAmount: this._round(vatAmount),
            totalAmount: this._round(total),
            breakdown: [{
                taxType: 'VAT',
                taxName: 'UAE Value Added Tax',
                rate: vatRate,
                taxableBase: this._round(subtotal),
                amount: this._round(vatAmount)
            }]
        };
    }

    /**
     * Calcula IVA para España
     */
    async _calculateSpainTax(amount, category, includesTax) {
        // Determinar tasa según categoría
        let ivaRate;
        switch (category) {
            case 'food':
                ivaRate = this.defaultRates.ES.reduced; // 10%
                break;
            case 'accommodation':
                ivaRate = this.defaultRates.ES.reduced; // 10%
                break;
            default:
                ivaRate = this.defaultRates.ES.standard; // 21%
        }

        let subtotal, ivaAmount, total;

        if (includesTax) {
            total = amount;
            subtotal = amount / (1 + (ivaRate / 100));
            ivaAmount = total - subtotal;
        } else {
            subtotal = amount;
            ivaAmount = amount * (ivaRate / 100);
            total = subtotal + ivaAmount;
        }

        return {
            subtotal: this._round(subtotal),
            taxAmount: this._round(ivaAmount),
            totalAmount: this._round(total),
            breakdown: [{
                taxType: 'IVA',
                taxName: `IVA ${ivaRate}%`,
                rate: ivaRate,
                taxableBase: this._round(subtotal),
                amount: this._round(ivaAmount)
            }]
        };
    }

    /**
     * Calcula VAT para Israel
     */
    async _calculateIsraelTax(amount, category, includesTax) {
        const vatRate = this.defaultRates.IL.standard;

        let subtotal, vatAmount, total;

        if (includesTax) {
            total = amount;
            subtotal = amount / (1 + (vatRate / 100));
            vatAmount = total - subtotal;
        } else {
            subtotal = amount;
            vatAmount = amount * (vatRate / 100);
            total = subtotal + vatAmount;
        }

        return {
            subtotal: this._round(subtotal),
            taxAmount: this._round(vatAmount),
            totalAmount: this._round(total),
            breakdown: [{
                taxType: 'VAT',
                taxName: 'Israel Value Added Tax',
                rate: vatRate,
                taxableBase: this._round(subtotal),
                amount: this._round(vatAmount)
            }]
        };
    }

    // ============================================================================
    // MÉTODOS DE CONFIGURACIÓN FISCAL
    // ============================================================================

    /**
     * Obtiene configuración fiscal de una sucursal
     */
    async _getFiscalConfig(sucursalId) {
        const query = `
            SELECT 
                s.pais_codigo,
                s.aplica_iva,
                s.tasa_iva,
                s.aplica_retencion_iva,
                s.tasa_retencion_iva,
                cf.nombre_impuesto,
                cf.codigo_impuesto,
                cf.tasa_impuesto,
                cf.tipo_impuesto,
                cf.incluido_en_precio
            FROM sucursales s
            LEFT JOIN configuracion_fiscal_sucursal cf 
                ON s.id = cf.sucursal_id 
                AND cf.activo = true
            WHERE s.id = $1
        `;

        const result = await this.db.query(query, [sucursalId]);
        return result.rows[0];
    }

    /**
     * Obtiene tasas de impuestos por jurisdicción
     */
    async getTaxRatesByJurisdiction(countryCode, stateCode = null, city = null) {
        const query = `
            SELECT 
                nombre_impuesto,
                codigo_impuesto,
                tasa_impuesto,
                tipo_impuesto,
                jurisdiccion,
                aplica_servicios,
                aplica_productos
            FROM configuracion_fiscal_sucursal
            WHERE codigo_jurisdiccion = $1
            AND activo = true
            AND (vigente_hasta IS NULL OR vigente_hasta > NOW())
        `;

        const jurisdictionCode = city || stateCode || countryCode;
        const result = await this.db.query(query, [jurisdictionCode]);
        
        return result.rows;
    }

    /**
     * Guarda configuración fiscal personalizada
     */
    async saveFiscalConfig(sucursalId, config) {
        const {
            taxName,
            taxCode,
            taxRate,
            taxType,
            appliesTo,
            jurisdiction,
            includeInPrice
        } = config;

        const query = `
            INSERT INTO configuracion_fiscal_sucursal (
                sucursal_id,
                nombre_impuesto,
                codigo_impuesto,
                tasa_impuesto,
                tipo_impuesto,
                aplica_a,
                jurisdiccion,
                incluido_en_precio,
                vigente_desde,
                activo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), true)
            ON CONFLICT (sucursal_id, codigo_impuesto)
            DO UPDATE SET
                tasa_impuesto = EXCLUDED.tasa_impuesto,
                incluido_en_precio = EXCLUDED.incluido_en_precio,
                updated_at = NOW()
            RETURNING *
        `;

        const result = await this.db.query(query, [
            sucursalId,
            taxName,
            taxCode,
            taxRate,
            taxType,
            appliesTo || 'ambos',
            jurisdiction,
            includeInPrice !== undefined ? includeInPrice : false
        ]);

        return result.rows[0];
    }

    // ============================================================================
    // VALIDACIÓN Y COMPLIANCE
    // ============================================================================

    /**
     * Valida que una transacción cumpla con requisitos fiscales
     */
    async validateTaxCompliance(params) {
        const { sucursalId, countryCode, amount, taxAmount, customerTaxId } = params;

        const validations = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Validar según país
        switch (countryCode.toUpperCase()) {
            case 'MX':
                // México requiere RFC para montos mayores a cierto umbral
                if (amount > 2000 && !customerTaxId) {
                    validations.warnings.push('Se recomienda RFC del cliente para montos mayores a $2,000 MXN');
                }
                break;

            case 'US':
                // USA: validar que el tax amount sea razonable (entre 0% y 15% típicamente)
                const taxPercentage = (taxAmount / amount) * 100;
                if (taxPercentage > 15) {
                    validations.warnings.push(`Tax rate appears high: ${taxPercentage.toFixed(2)}%`);
                }
                break;

            case 'AE':
                // UAE VAT debe ser exactamente 5%
                const expectedVAT = amount * 0.05;
                if (Math.abs(taxAmount - expectedVAT) > 0.01) {
                    validations.errors.push('VAT amount does not match 5% requirement');
                    validations.valid = false;
                }
                break;
        }

        return validations;
    }

    /**
     * Genera resumen fiscal para reportes
     */
    async generateTaxSummary(sucursalId, startDate, endDate) {
        const query = `
            SELECT 
                DATE_TRUNC('month', fecha_emision) as periodo,
                COUNT(*) as total_facturas,
                SUM(monto_total - (monto_total / (1 + (s.tasa_iva / 100)))) as total_iva_cobrado,
                SUM(monto_total) as total_ventas
            FROM cuentas_por_cobrar cxc
            JOIN sucursales s ON cxc.sucursal_id = s.id
            WHERE cxc.sucursal_id = $1
            AND cxc.fecha_emision BETWEEN $2 AND $3
            AND cxc.status IN ('cobrado', 'parcial')
            GROUP BY DATE_TRUNC('month', fecha_emision)
            ORDER BY periodo DESC
        `;

        const result = await this.db.query(query, [sucursalId, startDate, endDate]);

        return {
            period: {
                start: startDate,
                end: endDate
            },
            summary: result.rows.map(row => ({
                month: row.periodo,
                invoiceCount: parseInt(row.total_facturas),
                totalSales: parseFloat(row.total_ventas),
                totalTaxCollected: parseFloat(row.total_iva_cobrado)
            }))
        };
    }

    // ============================================================================
    // HELPERS
    // ============================================================================

    /**
     * Redondea a 2 decimales
     */
    _round(value) {
        return Math.round(value * 100) / 100;
    }

    /**
     * Obtiene categorías de servicio disponibles
     */
    getServiceCategories() {
        return Object.keys(this.serviceCategories);
    }

    /**
     * Obtiene tasas default por país
     */
    getDefaultRates(countryCode) {
        return this.defaultRates[countryCode.toUpperCase()] || null;
    }
}

module.exports = TaxCalculatorService;
