/**
 * CFDI 4.0 Generator Service - Unit Tests
 * 
 * Suite de tests unitarios para el generador de CFDI 4.0.
 * Valida la generación correcta de XML según especificaciones del SAT.
 * 
 * @group unit
 * @group mexico
 * @group cfdi
 */

const CFDIGeneratorService = require('../../../services/erp-hub/cfdi/cfdi-generator.service');

describe('CFDI 4.0 Generator Service - Unit Tests', () => {
    let cfdiService;
    let testConfig;

    beforeAll(() => {
        testConfig = {
            pacProvider: 'finkok',
            pacTestMode: true,
            enableCFDI: true
        };

        cfdiService = new CFDIGeneratorService(testConfig);
    });

    describe('Service Initialization', () => {
        test('should initialize with default configuration', () => {
            const service = new CFDIGeneratorService();
            
            expect(service.config.version).toBe('4.0');
            expect(service.config.pacTestMode).toBe(true);
        });

        test('should initialize with custom configuration', () => {
            const customConfig = {
                pacProvider: 'sw',
                pacTestMode: false
            };
            
            const service = new CFDIGeneratorService(customConfig);
            
            expect(service.config.pacProvider).toBe('sw');
            expect(service.config.pacTestMode).toBe(false);
        });

        test('should have SAT catalogs configured', () => {
            expect(cfdiService.catalogosSAT).toBeDefined();
            expect(cfdiService.catalogosSAT.tipoComprobante).toBeDefined();
            expect(cfdiService.catalogosSAT.usoCFDI).toBeDefined();
            expect(cfdiService.catalogosSAT.metodoPago).toBeDefined();
            expect(cfdiService.catalogosSAT.formaPago).toBeDefined();
        });
    });

    describe('CFDI Data Validation', () => {
        test('should validate complete CFDI data successfully', () => {
            const validData = {
                emisor: {
                    rfc: 'AAA010101AAA',
                    nombre: 'Spirit Tours México SA de CV',
                    regimenFiscal: '601'
                },
                receptor: {
                    rfc: 'XAXX010101000',
                    nombre: 'Cliente Genérico',
                    codigoPostal: '06000',
                    usoCFDI: 'G03'
                },
                conceptos: [{
                    descripcion: 'Tour a Cancún',
                    cantidad: 1,
                    valorUnitario: 10000.00
                }],
                tipoDeComprobante: 'I'
            };

            expect(() => cfdiService._validateCFDIData(validData)).not.toThrow();
        });

        test('should throw error for missing required fields', () => {
            const invalidData = {
                emisor: {
                    rfc: 'AAA010101AAA'
                }
                // Missing receptor, conceptos, tipoDeComprobante
            };

            expect(() => cfdiService._validateCFDIData(invalidData)).toThrow();
        });

        test('should throw error for invalid RFC format', () => {
            const invalidData = {
                emisor: {
                    rfc: 'INVALID_RFC',
                    nombre: 'Emisor Test'
                },
                receptor: {
                    rfc: 'XAXX010101000',
                    nombre: 'Receptor Test'
                },
                conceptos: [{}],
                tipoDeComprobante: 'I'
            };

            expect(() => cfdiService._validateCFDIData(invalidData)).toThrow('RFC del emisor inválido');
        });

        test('should throw error for invalid tipo de comprobante', () => {
            const invalidData = {
                emisor: {
                    rfc: 'AAA010101AAA',
                    nombre: 'Emisor Test'
                },
                receptor: {
                    rfc: 'XAXX010101000',
                    nombre: 'Receptor Test'
                },
                conceptos: [{}],
                tipoDeComprobante: 'X' // Invalid
            };

            expect(() => cfdiService._validateCFDIData(invalidData)).toThrow('Tipo de comprobante inválido');
        });

        test('should throw error for empty conceptos array', () => {
            const invalidData = {
                emisor: {
                    rfc: 'AAA010101AAA',
                    nombre: 'Emisor Test'
                },
                receptor: {
                    rfc: 'XAXX010101000',
                    nombre: 'Receptor Test'
                },
                conceptos: [], // Empty
                tipoDeComprobante: 'I'
            };

            expect(() => cfdiService._validateCFDIData(invalidData)).toThrow('Debe haber al menos un concepto');
        });
    });

    describe('RFC Validation', () => {
        test('should validate correct RFC Persona Física', () => {
            expect(cfdiService._validateRFC('PERJ901201ABC')).toBe(true);
            expect(cfdiService._validateRFC('GOME850315XY9')).toBe(true);
        });

        test('should validate correct RFC Persona Moral', () => {
            expect(cfdiService._validateRFC('AAA010101AAA')).toBe(true);
            expect(cfdiService._validateRFC('STO120815MK3')).toBe(true);
        });

        test('should validate RFC Genérico', () => {
            expect(cfdiService._validateRFC('XAXX010101000')).toBe(true);
            expect(cfdiService._validateRFC('XEXX010101000')).toBe(true);
        });

        test('should reject invalid RFC formats', () => {
            expect(cfdiService._validateRFC('INVALID')).toBe(false);
            expect(cfdiService._validateRFC('123456789012')).toBe(false);
            expect(cfdiService._validateRFC('')).toBe(false);
            expect(cfdiService._validateRFC(null)).toBe(false);
        });
    });

    describe('Tax Calculations', () => {
        test('should calculate subtotal correctly', () => {
            const conceptos = [
                { cantidad: 2, valorUnitario: 1000.00 },
                { cantidad: 1, valorUnitario: 500.00 },
                { cantidad: 3, valorUnitario: 250.00 }
            ];

            const subtotal = cfdiService._calculateSubtotal(conceptos);
            
            expect(subtotal).toBe(3250.00); // (2*1000) + (1*500) + (3*250)
        });

        test('should calculate IVA 16% correctly', () => {
            const conceptos = [
                {
                    cantidad: 1,
                    valorUnitario: 10000.00,
                    impuestos: {
                        traslados: [{
                            impuesto: '002',
                            tipoFactor: 'Tasa',
                            tasaOCuota: 0.16
                        }]
                    }
                }
            ];

            const impuestos = cfdiService._calculateImpuestos(conceptos);
            
            expect(impuestos.totalTrasladados).toBe(1600.00); // 10000 * 0.16
            expect(impuestos.totalRetenidos).toBe(0);
        });

        test('should calculate retenciones correctly', () => {
            const conceptos = [
                {
                    cantidad: 1,
                    valorUnitario: 10000.00,
                    impuestos: {
                        retenciones: [{
                            impuesto: '002',
                            tasaOCuota: 0.1067
                        }]
                    }
                }
            ];

            const impuestos = cfdiService._calculateImpuestos(conceptos);
            
            expect(impuestos.totalRetenidos).toBeCloseTo(1067.00, 2); // 10000 * 0.1067
            expect(impuestos.totalTrasladados).toBe(0);
        });

        test('should calculate multiple taxes correctly', () => {
            const conceptos = [
                {
                    cantidad: 1,
                    valorUnitario: 10000.00,
                    impuestos: {
                        traslados: [{
                            impuesto: '002',
                            tipoFactor: 'Tasa',
                            tasaOCuota: 0.16
                        }],
                        retenciones: [{
                            impuesto: '002',
                            tasaOCuota: 0.1067
                        }]
                    }
                }
            ];

            const impuestos = cfdiService._calculateImpuestos(conceptos);
            
            expect(impuestos.totalTrasladados).toBe(1600.00);
            expect(impuestos.totalRetenidos).toBeCloseTo(1067.00, 2);
        });
    });

    describe('XML Generation', () => {
        test('should generate valid CFDI 4.0 XML structure', async () => {
            const cfdiData = {
                emisor: {
                    rfc: 'AAA010101AAA',
                    nombre: 'Spirit Tours México SA de CV',
                    regimenFiscal: '601',
                    codigoPostal: '06000'
                },
                receptor: {
                    rfc: 'XAXX010101000',
                    nombre: 'Cliente Genérico',
                    codigoPostal: '06000',
                    usoCFDI: 'G03'
                },
                conceptos: [{
                    descripcion: 'Tour a Cancún',
                    cantidad: 1,
                    valorUnitario: 10000.00,
                    claveProdServ: '90101501',
                    claveUnidad: 'E48',
                    impuestos: {
                        traslados: [{
                            impuesto: '002',
                            tipoFactor: 'Tasa',
                            tasaOCuota: 0.16
                        }]
                    }
                }],
                tipoDeComprobante: 'I',
                metodoPago: 'PUE',
                formaPago: '03'
            };

            const xml = await cfdiService._generateXML(cfdiData);
            
            expect(xml).toBeDefined();
            expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            expect(xml).toContain('cfdi:Comprobante');
            expect(xml).toContain('Version="4.0"');
            expect(xml).toContain('cfdi:Emisor');
            expect(xml).toContain('cfdi:Receptor');
            expect(xml).toContain('cfdi:Conceptos');
            expect(xml).toContain('Rfc="AAA010101AAA"');
            expect(xml).toContain('Rfc="XAXX010101000"');
        }, 10000);

        test('should include tax information in XML', async () => {
            const cfdiData = {
                emisor: {
                    rfc: 'AAA010101AAA',
                    nombre: 'Spirit Tours México SA de CV',
                    regimenFiscal: '601',
                    codigoPostal: '06000'
                },
                receptor: {
                    rfc: 'XAXX010101000',
                    nombre: 'Cliente Genérico',
                    codigoPostal: '06000',
                    usoCFDI: 'G03'
                },
                conceptos: [{
                    descripcion: 'Servicio con IVA',
                    cantidad: 1,
                    valorUnitario: 10000.00,
                    impuestos: {
                        traslados: [{
                            impuesto: '002',
                            tipoFactor: 'Tasa',
                            tasaOCuota: 0.16,
                            importe: 1600.00
                        }]
                    }
                }],
                tipoDeComprobante: 'I'
            };

            const xml = await cfdiService._generateXML(cfdiData);
            
            expect(xml).toContain('cfdi:Impuestos');
            expect(xml).toContain('cfdi:Traslados');
            expect(xml).toContain('Impuesto="002"');
            expect(xml).toContain('TasaOCuota="0.160000"');
        }, 10000);
    });

    describe('Complemento de Pago', () => {
        test('should generate Complemento de Pago data structure', async () => {
            const paymentData = {
                emisor: {
                    rfc: 'AAA010101AAA',
                    nombre: 'Spirit Tours México SA de CV',
                    regimenFiscal: '601',
                    codigoPostal: '06000'
                },
                receptor: {
                    rfc: 'XAXX010101000',
                    nombre: 'Cliente Genérico',
                    codigoPostal: '06000',
                    usoCFDI: 'CP01'
                },
                conceptos: [{
                    descripcion: 'Pago',
                    cantidad: 1,
                    valorUnitario: 0,
                    objetoImp: '01' // No objeto de impuesto
                }],
                pagos: [{
                    fechaPago: new Date().toISOString(),
                    formaDePagoP: '03',
                    monedaP: 'MXN',
                    monto: 5800.00,
                    documentosRelacionados: [{
                        uuid: '12345678-1234-1234-1234-123456789012',
                        serie: 'A',
                        folio: '001',
                        moneda: 'MXN',
                        numParcialidad: '1',
                        saldoAnterior: 11600.00,
                        importePagado: 5800.00
                    }]
                }]
            };

            const result = await cfdiService.generateComplementoPago(paymentData);
            
            // This will use mock stamping in test mode
            expect(result.success).toBe(true);
            expect(result.uuid).toBeDefined();
            expect(result.xml).toBeDefined();
        }, 30000);
    });

    describe('UUID Generation', () => {
        test('should generate valid UUID format', () => {
            const uuid = cfdiService._generateUUID();
            
            // UUID format: XXXXXXXX-XXXX-4XXX-YXXX-XXXXXXXXXXXX
            const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
            
            expect(uuid).toMatch(uuidRegex);
        });

        test('should generate unique UUIDs', () => {
            const uuid1 = cfdiService._generateUUID();
            const uuid2 = cfdiService._generateUUID();
            const uuid3 = cfdiService._generateUUID();
            
            expect(uuid1).not.toBe(uuid2);
            expect(uuid2).not.toBe(uuid3);
            expect(uuid1).not.toBe(uuid3);
        });
    });

    describe('QR Code Generation', () => {
        test('should generate QR code data with correct format', () => {
            const uuid = '12345678-1234-4567-8901-123456789012';
            const data = {
                emisor: { rfc: 'AAA010101AAA' },
                receptor: { rfc: 'XAXX010101000' },
                total: 11600.00,
                sello: 'ABCDEFGH12345678'
            };

            const qrData = cfdiService._generateQRCode(uuid, data);
            
            expect(qrData).toContain('https://verificacfdi.facturaelectronica.sat.gob.mx');
            expect(qrData).toContain(`id=${uuid}`);
            expect(qrData).toContain('re=AAA010101AAA');
            expect(qrData).toContain('rr=XAXX010101000');
            expect(qrData).toContain('tt=11600');
        });
    });

    describe('SAT Catalogs', () => {
        test('should have all required tipo de comprobante', () => {
            const tipos = cfdiService.catalogosSAT.tipoComprobante;
            
            expect(tipos['I']).toBe('Ingreso');
            expect(tipos['E']).toBe('Egreso');
            expect(tipos['T']).toBe('Traslado');
            expect(tipos['N']).toBe('Nómina');
            expect(tipos['P']).toBe('Pago');
        });

        test('should have common uso CFDI options', () => {
            const usos = cfdiService.catalogosSAT.usoCFDI;
            
            expect(usos['G01']).toBeDefined();
            expect(usos['G02']).toBeDefined();
            expect(usos['G03']).toBe('Gastos en general');
            expect(usos['P01']).toBe('Por definir');
        });

        test('should have metodo pago options', () => {
            const metodos = cfdiService.catalogosSAT.metodoPago;
            
            expect(metodos['PUE']).toBe('Pago en una sola exhibición');
            expect(metodos['PPD']).toBe('Pago en parcialidades o diferido');
        });

        test('should have forma pago options', () => {
            const formas = cfdiService.catalogosSAT.formaPago;
            
            expect(formas['01']).toBe('Efectivo');
            expect(formas['03']).toBe('Transferencia electrónica de fondos');
            expect(formas['04']).toBe('Tarjeta de crédito');
        });

        test('should have impuestos catalog', () => {
            const impuestos = cfdiService.catalogosSAT.impuestos;
            
            expect(impuestos['001']).toBe('ISR');
            expect(impuestos['002']).toBe('IVA');
            expect(impuestos['003']).toBe('IEPS');
        });

        test('should have regimen fiscal options', () => {
            const regimenes = cfdiService.catalogosSAT.regimenFiscal;
            
            expect(regimenes['601']).toBeDefined();
            expect(regimenes['612']).toBeDefined();
            expect(regimenes['626']).toBe('Régimen Simplificado de Confianza');
        });
    });

    describe('PAC Provider Configuration', () => {
        test('should have configured PAC endpoints', () => {
            expect(cfdiService.pacEndpoints).toBeDefined();
            expect(cfdiService.pacEndpoints.finkok).toBeDefined();
            expect(cfdiService.pacEndpoints.sw).toBeDefined();
            expect(cfdiService.pacEndpoints.diverza).toBeDefined();
        });

        test('should get correct PAC endpoint for test mode', () => {
            const endpoint = cfdiService._getPACEndpoint();
            
            expect(endpoint).toBeDefined();
            expect(endpoint).toContain('test');
        });

        test('should get correct PAC endpoint for production mode', () => {
            const prodService = new CFDIGeneratorService({ pacTestMode: false });
            const endpoint = prodService._getPACEndpoint();
            
            expect(endpoint).toBeDefined();
            expect(endpoint).not.toContain('test');
        });
    });

    describe('Integration Test - Full CFDI Generation', () => {
        test('should generate complete CFDI with all components', async () => {
            const cfdiData = {
                emisor: {
                    rfc: 'AAA010101AAA',
                    nombre: 'Spirit Tours México SA de CV',
                    regimenFiscal: '601',
                    codigoPostal: '06000'
                },
                receptor: {
                    rfc: 'XAXX010101000',
                    nombre: 'Cliente Genérico',
                    codigoPostal: '06000',
                    regimenFiscal: '616',
                    usoCFDI: 'G03'
                },
                serie: 'A',
                folio: '1',
                fecha: new Date().toISOString(),
                tipoDeComprobante: 'I',
                metodoPago: 'PUE',
                formaPago: '03',
                moneda: 'MXN',
                conceptos: [
                    {
                        claveProdServ: '90101501',
                        noIdentificacion: 'TOUR001',
                        cantidad: 2,
                        claveUnidad: 'E48',
                        unidad: 'Servicio',
                        descripcion: 'Tour a Cancún - 3 días / 2 noches',
                        valorUnitario: 5000.00,
                        objetoImp: '02',
                        impuestos: {
                            traslados: [{
                                impuesto: '002',
                                tipoFactor: 'Tasa',
                                tasaOCuota: 0.16,
                                importe: 1600.00
                            }]
                        }
                    }
                ]
            };

            const result = await cfdiService.generateCFDI(cfdiData);
            
            expect(result.success).toBe(true);
            expect(result.uuid).toBeDefined();
            expect(result.xml).toBeDefined();
            expect(result.xmlBase64).toBeDefined();
            expect(result.fechaTimbrado).toBeDefined();
            expect(result.qrCode).toBeDefined();
            
            // Verify UUID format
            const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
            expect(result.uuid).toMatch(uuidRegex);
            
            // Verify XML contains required elements
            expect(result.xml).toContain('cfdi:Comprobante');
            expect(result.xml).toContain('Version="4.0"');
            expect(result.xml).toContain('AAA010101AAA');
            expect(result.xml).toContain('XAXX010101000');
        }, 60000);
    });
});
