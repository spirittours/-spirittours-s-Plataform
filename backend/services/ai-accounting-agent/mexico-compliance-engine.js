/**
 * Mexico Compliance Engine
 * 
 * Motor de cumplimiento regulatorio para México (SAT).
 * Incluye:
 * - CFDI 4.0 validation
 * - RFC validation
 * - IVA & ISR compliance
 * - PAC integration
 * - Contabilidad Electrónica
 * - Catálogos SAT
 * 
 * @module MexicoComplianceEngine
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

/**
 * Mexico Compliance Engine Class
 */
class MexicoComplianceEngine {
  constructor(config = {}) {
    this.regulations = {
      sat: {
        cfdi: {
          version: '4.0',
          mandatory: true,
          types: {
            I: 'Ingreso',
            E: 'Egreso',
            T: 'Traslado',
            P: 'Pago',
            N: 'Nómina'
          },
          requiresPAC: true,
          retention: 'permanent',  // Guardar indefinidamente
          cancelationDeadline: '72 hours'  // 72 horas para cancelar
        },
        
        taxes: {
          iva: {
            rate: 16,  // 16%
            trasladado: true,
            retenido: false,  // Puede aplicar retención
            retentionRate: 10.67  // 10.67% si aplica retención
          },
          isr: {
            rate: 30,  // 30% corporativo
            requiresRetention: true,  // Para honorarios profesionales
            retentionRate: 10  // 10% retención honorarios
          },
          ieps: {
            applicable: false,  // Impuesto Especial sobre Producción y Servicios
            categories: ['alcohol', 'tobacco', 'fuel', 'sugary_drinks']
          }
        },
        
        catalogs: {
          // Uso de CFDI (más comunes)
          usoCFDI: {
            'G01': 'Adquisición de mercancías',
            'G02': 'Devoluciones, descuentos o bonificaciones',
            'G03': 'Gastos en general',
            'I01': 'Construcciones',
            'I02': 'Mobiliario y equipo de oficina por inversiones',
            'I03': 'Equipo de transporte',
            'I04': 'Equipo de cómputo y accesorios',
            'I05': 'Dados, troqueles, moldes, matrices y herramental',
            'I06': 'Comunicaciones telefónicas',
            'I07': 'Comunicaciones satelitales',
            'I08': 'Otra maquinaria y equipo',
            'D01': 'Honorarios médicos, dentales y gastos hospitalarios',
            'D02': 'Gastos médicos por incapacidad o discapacidad',
            'D03': 'Gastos funerales',
            'D04': 'Donativos',
            'D05': 'Intereses reales efectivamente pagados por créditos hipotecarios',
            'D06': 'Aportaciones voluntarias al SAR',
            'D07': 'Primas por seguros de gastos médicos',
            'D08': 'Gastos de transportación escolar obligatoria',
            'D09': 'Depósitos en cuentas para el ahorro',
            'D10': 'Pagos por servicios educativos',
            'P01': 'Por definir',
            'S01': 'Sin efectos fiscales'
          },
          
          // Método de pago
          metodoPago: {
            'PUE': 'Pago en una sola exhibición',
            'PPD': 'Pago en parcialidades o diferido'
          },
          
          // Forma de pago (más comunes)
          formaPago: {
            '01': 'Efectivo',
            '02': 'Cheque nominativo',
            '03': 'Transferencia electrónica de fondos',
            '04': 'Tarjeta de crédito',
            '05': 'Monedero electrónico',
            '06': 'Dinero electrónico',
            '08': 'Vales de despensa',
            '12': 'Dación en pago',
            '13': 'Pago por subrogación',
            '14': 'Pago por consignación',
            '15': 'Condonación',
            '17': 'Compensación',
            '23': 'Novación',
            '24': 'Confusión',
            '25': 'Remisión de deuda',
            '26': 'Prescripción o caducidad',
            '27': 'A satisfacción del acreedor',
            '28': 'Tarjeta de débito',
            '29': 'Tarjeta de servicios',
            '30': 'Aplicación de anticipos',
            '31': 'Intermediario pagos',
            '99': 'Por definir'
          },
          
          // Régimen fiscal (más comunes)
          regimenFiscal: {
            '601': 'General de Ley Personas Morales',
            '603': 'Personas Morales con Fines no Lucrativos',
            '605': 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
            '606': 'Arrendamiento',
            '607': 'Régimen de Enajenación o Adquisición de Bienes',
            '608': 'Demás ingresos',
            '610': 'Residentes en el Extranjero sin Establecimiento Permanente en México',
            '611': 'Ingresos por Dividendos (socios y accionistas)',
            '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
            '614': 'Ingresos por intereses',
            '615': 'Régimen de los ingresos por obtención de premios',
            '616': 'Sin obligaciones fiscales',
            '620': 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
            '621': 'Incorporación Fiscal',
            '622': 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
            '623': 'Opcional para Grupos de Sociedades',
            '624': 'Coordinados',
            '625': 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
            '626': 'Régimen Simplificado de Confianza'
          }
        }
      },
      
      rfc: {
        validation: {
          personaFisica: /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/,
          personaMoral: /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/
        },
        length: {
          personaFisica: 13,
          personaMoral: 12
        }
      },
      
      contabilidadElectronica: {
        mandatory: true,
        format: 'XML',
        includes: [
          'Catálogo de cuentas',
          'Balanza de comprobación',
          'Pólizas contables',
          'Auxiliares de cuenta',
          'Auxiliares de folios'
        ],
        frequency: 'monthly',
        deadline: 'Day 3 of following month',
        retention: '5 years'
      },
      
      pac: {
        providers: ['Finkok', 'SW Sapien', 'Diverza', 'Ecodex', 'Solución Factible'],
        requiredForStamping: true
      }
    };
    
    this.config = config;
  }

  /**
   * Validate RFC (Registro Federal de Contribuyentes)
   */
  validateRFC(rfc) {
    if (!rfc) {
      return {
        valid: false,
        error: 'RFC es requerido'
      };
    }
    
    // Remove spaces and convert to uppercase
    rfc = rfc.replace(/\s/g, '').toUpperCase();
    
    // Determine if it's persona física or moral based on length
    const length = rfc.length;
    
    if (length === this.regulations.rfc.length.personaMoral) {
      // Persona Moral (12 characters)
      if (!this.regulations.rfc.validation.personaMoral.test(rfc)) {
        return {
          valid: false,
          error: 'RFC de Persona Moral inválido (formato: AAA######XXX)',
          type: 'personaMoral'
        };
      }
      
      return {
        valid: true,
        type: 'personaMoral',
        rfc
      };
      
    } else if (length === this.regulations.rfc.length.personaFisica) {
      // Persona Física (13 characters)
      if (!this.regulations.rfc.validation.personaFisica.test(rfc)) {
        return {
          valid: false,
          error: 'RFC de Persona Física inválido (formato: AAAA######XXX)',
          type: 'personaFisica'
        };
      }
      
      return {
        valid: true,
        type: 'personaFisica',
        rfc
      };
      
    } else {
      return {
        valid: false,
        error: `RFC debe tener 12 (Persona Moral) o 13 (Persona Física) caracteres. Recibido: ${length}`
      };
    }
  }

  /**
   * Validate complete CFDI 4.0 invoice
   */
  async validateCFDI(invoice) {
    const validations = [];
    let isValid = true;

    // 1. Validate RFC emisor
    const rfcEmisorValid = this.validateRFC(invoice.emisor?.rfc);
    if (!rfcEmisorValid.valid) {
      validations.push({
        field: 'Emisor.RFC',
        valid: false,
        error: rfcEmisorValid.error,
        severity: 'critical'
      });
      isValid = false;
    }

    // 2. Validate RFC receptor
    const rfcReceptorValid = this.validateRFC(invoice.receptor?.rfc);
    if (!rfcReceptorValid.valid) {
      validations.push({
        field: 'Receptor.RFC',
        valid: false,
        error: rfcReceptorValid.error,
        severity: 'critical'
      });
      isValid = false;
    }

    // 3. Validate Uso de CFDI
    if (!invoice.receptor?.usoCFDI || !this.regulations.sat.catalogs.usoCFDI[invoice.receptor.usoCFDI]) {
      validations.push({
        field: 'Receptor.UsoCFDI',
        valid: false,
        error: 'Uso de CFDI no válido o no especificado',
        severity: 'high'
      });
      isValid = false;
    }

    // 4. Validate Régimen Fiscal emisor
    if (!invoice.emisor?.regimenFiscal || !this.regulations.sat.catalogs.regimenFiscal[invoice.emisor.regimenFiscal]) {
      validations.push({
        field: 'Emisor.RegimenFiscal',
        valid: false,
        error: 'Régimen Fiscal no válido',
        severity: 'high'
      });
      isValid = false;
    }

    // 5. Validate Método de Pago
    if (!invoice.metodoPago || !this.regulations.sat.catalogs.metodoPago[invoice.metodoPago]) {
      validations.push({
        field: 'MetodoPago',
        valid: false,
        error: 'Método de Pago no válido (debe ser PUE o PPD)',
        severity: 'high'
      });
      isValid = false;
    }

    // 6. Validate Forma de Pago
    if (!invoice.formaPago || !this.regulations.sat.catalogs.formaPago[invoice.formaPago]) {
      validations.push({
        field: 'FormaPago',
        valid: false,
        error: 'Forma de Pago no válida',
        severity: 'medium'
      });
      isValid = false;
    }

    // 7. Validate IVA calculation
    const ivaValidation = this.validateIVA(invoice);
    if (!ivaValidation.valid) {
      validations.push({
        field: 'Impuestos.IVA',
        valid: false,
        error: ivaValidation.error,
        severity: 'high',
        expected: ivaValidation.expected,
        actual: ivaValidation.actual
      });
      isValid = false;
    }

    // 8. Validate totals
    const totalsValidation = this.validateTotals(invoice);
    if (!totalsValidation.valid) {
      validations.push({
        field: 'Totales',
        valid: false,
        error: totalsValidation.error,
        severity: 'critical'
      });
      isValid = false;
    }

    // 9. Check for UUID (if already stamped)
    if (invoice.timbreFiscalDigital?.uuid) {
      validations.push({
        field: 'TimbreFiscalDigital.UUID',
        valid: true,
        message: 'CFDI ya timbrado',
        uuid: invoice.timbreFiscalDigital.uuid
      });
    }

    return {
      valid: isValid,
      version: this.regulations.sat.cfdi.version,
      validations,
      summary: {
        total: validations.length,
        critical: validations.filter(v => v.severity === 'critical').length,
        high: validations.filter(v => v.severity === 'high').length,
        medium: validations.filter(v => v.severity === 'medium').length
      }
    };
  }

  /**
   * Validate IVA (16%) calculation
   */
  validateIVA(invoice) {
    const ivaRate = this.regulations.sat.taxes.iva.rate;
    const subtotal = invoice.subtotal || 0;
    const expectedIVA = subtotal * (ivaRate / 100);
    const actualIVA = invoice.impuestos?.traslados?.find(t => t.impuesto === '002')?.importe || 0;
    
    const tolerance = 0.01;
    const difference = Math.abs(expectedIVA - actualIVA);
    
    if (difference > tolerance) {
      return {
        valid: false,
        error: 'IVA mal calculado',
        expected: expectedIVA,
        actual: actualIVA,
        difference
      };
    }
    
    return {
      valid: true,
      ivaRate,
      ivaAmount: actualIVA
    };
  }

  /**
   * Validate totals (subtotal + IVA - descuento - retención = total)
   */
  validateTotals(invoice) {
    const subtotal = invoice.subtotal || 0;
    const descuento = invoice.descuento || 0;
    const traslados = invoice.impuestos?.traslados?.reduce((sum, t) => sum + t.importe, 0) || 0;
    const retenciones = invoice.impuestos?.retenciones?.reduce((sum, r) => sum + r.importe, 0) || 0;
    
    const expectedTotal = subtotal - descuento + traslados - retenciones;
    const actualTotal = invoice.total || 0;
    
    const tolerance = 0.01;
    const difference = Math.abs(expectedTotal - actualTotal);
    
    if (difference > tolerance) {
      return {
        valid: false,
        error: 'Total no coincide con cálculo',
        expected: expectedTotal,
        actual: actualTotal,
        difference,
        breakdown: {
          subtotal,
          descuento,
          traslados,
          retenciones
        }
      };
    }
    
    return {
      valid: true,
      total: actualTotal
    };
  }

  /**
   * Generate CFDI 4.0 XML structure
   */
  async generateCFDIXML(invoice) {
    try {
      // Validate first
      const validation = await this.validateCFDI(invoice);
      if (!validation.valid) {
        throw new Error('CFDI validation failed. Fix errors before generating XML.');
      }
      
      // This is a simplified structure - in production, use a proper XML builder
      const xml = {
        '@xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4',
        '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        '@xsi:schemaLocation': 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd',
        '@Version': '4.0',
        '@Serie': invoice.serie || '',
        '@Folio': invoice.folio || '',
        '@Fecha': invoice.fecha || new Date().toISOString(),
        '@FormaPago': invoice.formaPago,
        '@NoCertificado': invoice.noCertificado || '',
        '@Certificado': invoice.certificado || '',
        '@SubTotal': invoice.subtotal,
        '@Descuento': invoice.descuento || 0,
        '@Total': invoice.total,
        '@Moneda': invoice.moneda || 'MXN',
        '@TipoCambio': invoice.tipoCambio || '1',
        '@TipoDeComprobante': invoice.tipoDeComprobante || 'I',
        '@MetodoPago': invoice.metodoPago,
        '@LugarExpedicion': invoice.lugarExpedicion,
        
        'cfdi:Emisor': {
          '@Rfc': invoice.emisor.rfc,
          '@Nombre': invoice.emisor.nombre,
          '@RegimenFiscal': invoice.emisor.regimenFiscal
        },
        
        'cfdi:Receptor': {
          '@Rfc': invoice.receptor.rfc,
          '@Nombre': invoice.receptor.nombre,
          '@UsoCFDI': invoice.receptor.usoCFDI,
          '@DomicilioFiscalReceptor': invoice.receptor.codigoPostal,
          '@RegimenFiscalReceptor': invoice.receptor.regimenFiscal || '616'
        },
        
        'cfdi:Conceptos': {
          'cfdi:Concepto': invoice.conceptos.map(concepto => ({
            '@ClaveProdServ': concepto.claveProdServ,
            '@NoIdentificacion': concepto.noIdentificacion || '',
            '@Cantidad': concepto.cantidad,
            '@ClaveUnidad': concepto.claveUnidad,
            '@Unidad': concepto.unidad || '',
            '@Descripcion': concepto.descripcion,
            '@ValorUnitario': concepto.valorUnitario,
            '@Importe': concepto.importe,
            '@Descuento': concepto.descuento || 0,
            '@ObjetoImp': concepto.objetoImp || '02'
          }))
        },
        
        'cfdi:Impuestos': {
          '@TotalImpuestosTrasladados': invoice.impuestos?.totalTraslados || 0,
          '@TotalImpuestosRetenidos': invoice.impuestos?.totalRetenciones || 0,
          'cfdi:Traslados': invoice.impuestos?.traslados?.map(t => ({
            '@Base': t.base,
            '@Impuesto': t.impuesto,
            '@TipoFactor': t.tipoFactor,
            '@TasaOCuota': t.tasaOCuota,
            '@Importe': t.importe
          })),
          'cfdi:Retenciones': invoice.impuestos?.retenciones?.map(r => ({
            '@Impuesto': r.impuesto,
            '@Importe': r.importe
          }))
        }
      };
      
      logger.info(`Generated CFDI XML structure for invoice ${invoice.folio}`);
      
      return {
        success: true,
        xml,
        readyForPAC: true,
        message: 'CFDI XML generado, listo para timbrado con PAC'
      };
      
    } catch (error) {
      logger.error('Error generating CFDI XML:', error);
      throw error;
    }
  }

  /**
   * Stamp CFDI with PAC (simulated - real implementation needs PAC credentials)
   */
  async stampWithPAC(xmlCFDI, pacProvider = 'Finkok') {
    try {
      // This is a simulation - real implementation would call PAC API
      logger.info(`Simulating PAC stamping with ${pacProvider}`);
      
      // In production, you would:
      // 1. Send XML to PAC API
      // 2. Get back UUID and Timbre Fiscal Digital
      // 3. Embed timbre in XML
      
      const simulatedUUID = this.generateUUID();
      const simulatedTimbre = {
        uuid: simulatedUUID,
        fechaTimbrado: new Date().toISOString(),
        rfcProvCertif: pacProvider === 'Finkok' ? 'FIN120619T40' : 'SWS091124TY1',
        selloCFD: 'simulated_sello_cfd',
        noCertificadoSAT: '00001000000507702350',
        selloSAT: 'simulated_sello_sat'
      };
      
      return {
        success: true,
        uuid: simulatedUUID,
        timbreFiscalDigital: simulatedTimbre,
        pacProvider,
        message: 'CFDI timbrado exitosamente (simulación)',
        warning: 'NOTA: En producción, integrar con PAC real (Finkok/SW/Diverza)'
      };
      
    } catch (error) {
      logger.error('Error stamping with PAC:', error);
      throw error;
    }
  }

  /**
   * Generate UUID (simulated for demo)
   */
  generateUUID() {
    return 'XXXXXXXX-XXXX-4XXX-YXXX-XXXXXXXXXXXX'.replace(/[XY]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'X' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  }

  /**
   * Cancel CFDI (must be within 72 hours)
   */
  async cancelCFDI(uuid, motivo, rfcSustituto = null) {
    try {
      // Validate cancellation is within 72 hours
      // In production, check timestamp from database
      
      const motivosCancelacion = {
        '01': 'Comprobante emitido con errores con relación',
        '02': 'Comprobante emitido con errores sin relación',
        '03': 'No se llevó a cabo la operación',
        '04': 'Operación nominativa relacionada en una factura global'
      };
      
      if (!motivosCancelacion[motivo]) {
        throw new Error('Motivo de cancelación inválido');
      }
      
      // If motivo is '01', rfcSustituto is required
      if (motivo === '01' && !rfcSustituto) {
        throw new Error('RFC sustituto es requerido para motivo 01');
      }
      
      logger.info(`Canceling CFDI ${uuid} with motivo ${motivo}`);
      
      return {
        success: true,
        uuid,
        motivo: motivosCancelacion[motivo],
        rfcSustituto,
        canceledAt: new Date(),
        message: 'CFDI cancelado exitosamente'
      };
      
    } catch (error) {
      logger.error('Error canceling CFDI:', error);
      throw error;
    }
  }

  /**
   * Generate Contabilidad Electrónica (monthly)
   */
  async generateContabilidadElectronica(organizationId, year, month) {
    try {
      // 1. Catálogo de cuentas
      const catalogoCuentas = await this.generateCatalogoCuentas(organizationId);
      
      // 2. Balanza de comprobación
      const balanza = await this.generateBalanza(organizationId, year, month);
      
      // 3. Pólizas contables
      const polizas = await this.generatePolizas(organizationId, year, month);
      
      logger.info(`Generated Contabilidad Electrónica for ${year}-${month}`);
      
      return {
        success: true,
        year,
        month,
        catalogoCuentas,
        balanza,
        polizas,
        format: 'XML',
        deadline: `${year}-${month + 1}-03`,
        message: 'Contabilidad Electrónica generada exitosamente'
      };
      
    } catch (error) {
      logger.error('Error generating Contabilidad Electrónica:', error);
      throw error;
    }
  }

  /**
   * Generate Catálogo de Cuentas (SAT format)
   */
  async generateCatalogoCuentas(organizationId) {
    // Simplified - in production, get from accounting system
    return {
      version: '1.3',
      rfc: 'XXX000000XXX',
      mes: '00',
      anio: new Date().getFullYear(),
      cuentas: [
        { codAgrupador: '100.01', numCuenta: '1010', desc: 'Bancos', nivel: 2, natur: 'D' },
        { codAgrupador: '100.02', numCuenta: '1020', desc: 'Clientes', nivel: 2, natur: 'D' },
        // ... more accounts
      ]
    };
  }

  /**
   * Generate Balanza de Comprobación
   */
  async generateBalanza(organizationId, year, month) {
    // Simplified - in production, get from accounting system
    return {
      version: '1.3',
      rfc: 'XXX000000XXX',
      mes: month.toString().padStart(2, '0'),
      anio: year,
      tipoEnvio: 'N',  // Normal
      cuentas: [
        { numCuenta: '1010', saldoIni: 100000, debe: 50000, haber: 30000, saldoFin: 120000 },
        // ... more accounts
      ]
    };
  }

  /**
   * Generate Pólizas (journal entries)
   */
  async generatePolizas(organizationId, year, month) {
    const Transaction = mongoose.model('Transaction');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const transactions = await Transaction.find({
      organizationId,
      date: { $gte: startDate, $lte: endDate },
      country: 'Mexico'
    });
    
    const polizas = transactions.map((tx, index) => ({
      numPoliza: `${month}${(index + 1).toString().padStart(4, '0')}`,
      fecha: tx.date,
      concepto: tx.description,
      transacciones: [
        { numCta: '1010', debe: tx.type === 'income' ? tx.amount : 0, haber: tx.type === 'expense' ? tx.amount : 0 }
      ]
    }));
    
    return {
      version: '1.3',
      rfc: 'XXX000000XXX',
      mes: month.toString().padStart(2, '0'),
      anio: year,
      polizas
    };
  }

  /**
   * Get compliance summary for organization
   */
  async getComplianceSummary(organizationId, taxYear) {
    try {
      const [
        cfdiSummary,
        contabilidadStatus
      ] = await Promise.all([
        this.getCFDISummary(organizationId, taxYear),
        this.getContabilidadStatus(organizationId, taxYear)
      ]);
      
      return {
        organizationId,
        taxYear,
        cfdi: cfdiSummary,
        contabilidadElectronica: contabilidadStatus,
        generatedAt: new Date()
      };
      
    } catch (error) {
      logger.error('Error generating compliance summary:', error);
      throw error;
    }
  }

  /**
   * Get CFDI summary
   */
  async getCFDISummary(organizationId, taxYear) {
    try {
      const Invoice = mongoose.model('Invoice');
      const startDate = new Date(taxYear, 0, 1);
      const endDate = new Date(taxYear, 11, 31, 23, 59, 59);
      
      const invoices = await Invoice.find({
        organizationId,
        date: { $gte: startDate, $lte: endDate },
        country: 'Mexico'
      });
      
      const summary = {
        total: invoices.length,
        timbrados: invoices.filter(i => i.uuid).length,
        pendientes: invoices.filter(i => !i.uuid).length,
        cancelados: invoices.filter(i => i.status === 'cancelled').length,
        totalAmount: invoices.reduce((sum, i) => sum + i.total, 0)
      };
      
      return summary;
      
    } catch (error) {
      logger.error('Error generating CFDI summary:', error);
      throw error;
    }
  }

  /**
   * Get Contabilidad Electrónica status
   */
  async getContabilidadStatus(organizationId, taxYear) {
    // Simplified - in production, check actual submission status
    return {
      year: taxYear,
      monthsSubmitted: 12,
      monthsPending: 0,
      lastSubmission: new Date(),
      status: 'compliant'
    };
  }
}

module.exports = MexicoComplianceEngine;
