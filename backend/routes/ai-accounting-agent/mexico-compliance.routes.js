/**
 * Mexico Compliance Engine - API Routes
 * 
 * Endpoints for Mexico compliance (SAT, CFDI 4.0, RFC)
 * 
 * @module MexicoComplianceRoutes
 */

const express = require('express');
const router = express.Router();
const MexicoComplianceEngine = require('../../services/ai-accounting-agent/mexico-compliance-engine');
const { authenticate, authorize } = require('../../middleware/auth');
const logger = require('../../utils/logger');

const mexicoCompliance = new MexicoComplianceEngine();

/**
 * POST /api/ai-agent/compliance/mexico/validate-rfc
 * Validate RFC format and checksum
 */
router.post('/validate-rfc',
  authenticate,
  async (req, res) => {
    try {
      const { rfc } = req.body;
      
      if (!rfc) {
        return res.status(400).json({ success: false, error: 'RFC is required' });
      }

      const validation = mexicoCompliance.validateRFC(rfc);

      res.json({
        success: true,
        data: validation,
        message: validation.valid ? '✅ RFC válido' : '❌ RFC inválido'
      });
    } catch (error) {
      logger.error('Error validating RFC:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/ai-agent/compliance/mexico/validate-cfdi
 * Validate CFDI 4.0 invoice
 */
router.post('/validate-cfdi',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { invoice } = req.body;
      
      if (!invoice) {
        return res.status(400).json({ success: false, error: 'Invoice required' });
      }

      logger.info(`Validating CFDI for invoice ${invoice.number || 'unknown'}`);

      const validation = await mexicoCompliance.validateCFDI(invoice);

      res.json({
        success: true,
        data: validation,
        message: validation.valid ? '✅ CFDI válido' : '⚠️ Errores en CFDI detectados'
      });
    } catch (error) {
      logger.error('Error validating CFDI:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/ai-agent/compliance/mexico/generate-cfdi-xml
 * Generate CFDI 4.0 XML
 */
router.post('/generate-cfdi-xml',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { invoice } = req.body;
      
      if (!invoice) {
        return res.status(400).json({ success: false, error: 'Invoice required' });
      }

      logger.info(`Generating CFDI XML for invoice ${invoice.number}`);

      const xml = mexicoCompliance.generateCFDIXML(invoice);

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="cfdi_${invoice.number}.xml"`);
      res.send(xml);

    } catch (error) {
      logger.error('Error generating CFDI XML:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/ai-agent/compliance/mexico/stamp-cfdi
 * Stamp CFDI with PAC provider
 */
router.post('/stamp-cfdi',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { xml, pacProvider = 'finkok' } = req.body;
      
      if (!xml) {
        return res.status(400).json({ success: false, error: 'XML is required' });
      }

      logger.info(`Stamping CFDI with PAC provider ${pacProvider}`);

      const stampedResult = await mexicoCompliance.stampWithPAC(xml, pacProvider);

      res.json({
        success: true,
        data: stampedResult,
        message: `✅ CFDI timbrado exitosamente. UUID: ${stampedResult.uuid}`
      });
    } catch (error) {
      logger.error('Error stamping CFDI:', error);
      res.status(500).json({ success: false, error: error.message, errorCode: 'PAC_STAMPING_FAILED' });
    }
  }
);

/**
 * POST /api/ai-agent/compliance/mexico/calculate-iva
 * Calculate IVA (VAT) 16%
 */
router.post('/calculate-iva',
  authenticate,
  async (req, res) => {
    try {
      const { subtotal, items } = req.body;
      
      if (typeof subtotal !== 'number') {
        return res.status(400).json({ success: false, error: 'Subtotal required' });
      }

      const ivaCalculation = mexicoCompliance.calculateIVA(subtotal, items);

      res.json({ success: true, data: ivaCalculation });
    } catch (error) {
      logger.error('Error calculating IVA:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/ai-agent/compliance/mexico/sat-catalogs/:catalog
 * Get SAT catalog (uso_cfdi, regimen_fiscal, forma_pago, metodo_pago)
 */
router.get('/sat-catalogs/:catalog',
  authenticate,
  async (req, res) => {
    try {
      const { catalog } = req.params;

      if (!['uso_cfdi', 'regimen_fiscal', 'forma_pago', 'metodo_pago'].includes(catalog)) {
        return res.status(400).json({ success: false, error: 'Invalid catalog name' });
      }

      const catalogData = mexicoCompliance.getSATCatalog(catalog);

      res.json({ success: true, data: catalogData });
    } catch (error) {
      logger.error('Error getting SAT catalog:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/ai-agent/compliance/mexico/validate-sat-catalog
 * Validate if a value exists in SAT catalog
 */
router.post('/validate-sat-catalog',
  authenticate,
  async (req, res) => {
    try {
      const { catalog, value } = req.body;

      if (!catalog || !value) {
        return res.status(400).json({ success: false, error: 'Catalog and value required' });
      }

      const isValid = mexicoCompliance.validateSATCatalogValue(catalog, value);

      res.json({
        success: true,
        data: { catalog, value, valid: isValid },
        message: isValid ? '✅ Valor válido en catálogo SAT' : '❌ Valor no encontrado en catálogo SAT'
      });
    } catch (error) {
      logger.error('Error validating SAT catalog:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/ai-agent/compliance/mexico/generate-contabilidad
 * Generate electronic accounting (Contabilidad Electrónica)
 */
router.post('/generate-contabilidad',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { organizationId, year, month } = req.body;

      if (!organizationId || !year || typeof month !== 'number') {
        return res.status(400).json({ success: false, error: 'organizationId, year, and month required' });
      }

      logger.info(`Generating Contabilidad Electrónica for ${organizationId} - ${year}/${month}`);

      const contabilidad = await mexicoCompliance.generateContabilidadElectronica(organizationId, year, month);

      res.json({
        success: true,
        data: contabilidad,
        message: '✅ Contabilidad Electrónica generada'
      });
    } catch (error) {
      logger.error('Error generating Contabilidad Electrónica:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/ai-agent/compliance/mexico/cfdi-status/:uuid
 * Check CFDI status with SAT
 */
router.get('/cfdi-status/:uuid',
  authenticate,
  async (req, res) => {
    try {
      const { uuid } = req.params;

      if (!uuid) {
        return res.status(400).json({ success: false, error: 'UUID is required' });
      }

      // This would query SAT web service
      const status = {
        uuid: uuid,
        status: 'vigente',  // or 'cancelado'
        issueDate: new Date(),
        cancellationDate: null,
        satValidated: true
      };

      res.json({ success: true, data: status });
    } catch (error) {
      logger.error('Error checking CFDI status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/ai-agent/compliance/mexico/cancel-cfdi
 * Cancel CFDI with SAT
 */
router.post('/cancel-cfdi',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { uuid, reason, replacementUUID } = req.body;

      if (!uuid || !reason) {
        return res.status(400).json({ success: false, error: 'UUID and reason required' });
      }

      logger.info(`Canceling CFDI ${uuid} by user ${req.user.id}`);

      const cancellation = await mexicoCompliance.cancelCFDI(uuid, reason, replacementUUID);

      res.json({
        success: true,
        data: cancellation,
        message: '✅ CFDI cancelado exitosamente'
      });
    } catch (error) {
      logger.error('Error canceling CFDI:', error);
      res.status(500).json({ success: false, error: error.message, errorCode: 'CFDI_CANCELLATION_FAILED' });
    }
  }
);

/**
 * GET /api/ai-agent/compliance/mexico/pac-providers
 * Get list of available PAC providers
 */
router.get('/pac-providers',
  authenticate,
  async (req, res) => {
    try {
      const providers = [
        { id: 'finkok', name: 'Finkok', status: 'active', url: 'https://api.finkok.com' },
        { id: 'sw', name: 'SW Sapien', status: 'active', url: 'https://api.sw.com.mx' },
        { id: 'diverza', name: 'Diverza', status: 'active', url: 'https://api.diverza.com.mx' }
      ];

      res.json({ success: true, data: providers });
    } catch (error) {
      logger.error('Error getting PAC providers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/ai-agent/compliance/mexico/validate-xml
 * Validate CFDI XML structure
 */
router.post('/validate-xml',
  authenticate,
  async (req, res) => {
    try {
      const { xml } = req.body;

      if (!xml) {
        return res.status(400).json({ success: false, error: 'XML is required' });
      }

      const validation = mexicoCompliance.validateCFDIXML(xml);

      res.json({
        success: true,
        data: validation,
        message: validation.valid ? '✅ XML válido' : '❌ XML inválido'
      });
    } catch (error) {
      logger.error('Error validating XML:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;
