/**
 * USA Compliance Engine - API Routes
 * 
 * Endpoints for USA compliance (IRS, GAAP, Sales Tax)
 * 
 * @module USAComplianceRoutes
 */

const express = require('express');
const router = express.Router();
const USAComplianceEngine = require('../../services/ai-accounting-agent/usa-compliance-engine');
const { authenticate, authorize } = require('../../middleware/auth');
const logger = require('../../utils/logger');

const usaCompliance = new USAComplianceEngine();

/**
 * POST /api/ai-agent/compliance/usa/validate-transaction
 * Validate transaction for USA compliance
 */
router.post('/validate-transaction',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { transaction } = req.body;
      
      if (!transaction) {
        return res.status(400).json({ success: false, error: 'Transaction required' });
      }

      const validation = await usaCompliance.validateTransaction(transaction);

      res.json({
        success: true,
        data: validation,
        message: validation.compliant ? '✅ Cumple con normativa USA' : '⚠️ Problemas de cumplimiento detectados'
      });
    } catch (error) {
      logger.error('Error validating USA compliance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/ai-agent/compliance/usa/calculate-sales-tax
 * Calculate sales tax by state
 */
router.post('/calculate-sales-tax',
  authenticate,
  async (req, res) => {
    try {
      const { amount, state } = req.body;
      
      if (!amount || !state) {
        return res.status(400).json({ success: false, error: 'Amount and state are required' });
      }

      const taxCalculation = usaCompliance.calculateSalesTax(amount, state);

      res.json({ success: true, data: taxCalculation });
    } catch (error) {
      logger.error('Error calculating sales tax:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/ai-agent/compliance/usa/generate-1099
 * Generate 1099 forms for tax year
 */
router.post('/generate-1099',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { taxYear, organizationId } = req.body;
      
      if (!taxYear || !organizationId) {
        return res.status(400).json({ success: false, error: 'taxYear and organizationId required' });
      }

      logger.info(`Generating 1099 forms for ${organizationId} - tax year ${taxYear}`);

      const forms = await usaCompliance.generate1099Forms(taxYear, organizationId);

      res.json({
        success: true,
        data: forms,
        message: `✅ ${forms.length} formularios 1099 generados`
      });
    } catch (error) {
      logger.error('Error generating 1099 forms:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/ai-agent/compliance/usa/1099/:taxYear/:organizationId
 * Get 1099 forms for specific year
 */
router.get('/1099/:taxYear/:organizationId',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { taxYear, organizationId } = req.params;

      const forms = await usaCompliance.get1099Forms(taxYear, organizationId);

      res.json({ success: true, data: forms });
    } catch (error) {
      logger.error('Error getting 1099 forms:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/ai-agent/compliance/usa/calculate-corporate-tax
 * Calculate federal and state corporate tax
 */
router.post('/calculate-corporate-tax',
  authenticate,
  authorize(['admin', 'headAccountant']),
  async (req, res) => {
    try {
      const { income, expenses, state } = req.body;
      
      if (typeof income !== 'number' || typeof expenses !== 'number' || !state) {
        return res.status(400).json({ success: false, error: 'income, expenses, and state required' });
      }

      const taxCalculation = usaCompliance.calculateCorporateTax(income, expenses, state);

      res.json({ success: true, data: taxCalculation });
    } catch (error) {
      logger.error('Error calculating corporate tax:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/ai-agent/compliance/usa/validate-gaap
 * Validate GAAP compliance
 */
router.post('/validate-gaap',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { transaction } = req.body;

      const validation = await usaCompliance.validateGAAP(transaction);

      res.json({
        success: true,
        data: validation,
        message: validation.compliant ? '✅ Cumple con GAAP' : '⚠️ Incumplimiento GAAP detectado'
      });
    } catch (error) {
      logger.error('Error validating GAAP:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/ai-agent/compliance/usa/depreciation-schedule
 * Generate depreciation schedule for asset
 */
router.post('/depreciation-schedule',
  authenticate,
  authorize(['admin', 'headAccountant', 'accountant']),
  async (req, res) => {
    try {
      const { asset } = req.body;

      if (!asset || !asset.cost || !asset.usefulLife) {
        return res.status(400).json({ success: false, error: 'Asset with cost and usefulLife required' });
      }

      const schedule = usaCompliance.generateDepreciationSchedule(asset);

      res.json({ success: true, data: schedule });
    } catch (error) {
      logger.error('Error generating depreciation schedule:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/ai-agent/compliance/usa/tax-rates/sales-tax/:state
 * Get sales tax rate for state
 */
router.get('/tax-rates/sales-tax/:state',
  authenticate,
  async (req, res) => {
    try {
      const { state } = req.params;

      const rate = usaCompliance.getSalesTaxRate(state);

      res.json({
        success: true,
        data: { state, rate, hasLocalTax: true }
      });
    } catch (error) {
      logger.error('Error getting sales tax rate:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/ai-agent/compliance/usa/tax-rates/corporate/:state
 * Get corporate tax rate for state
 */
router.get('/tax-rates/corporate/:state',
  authenticate,
  async (req, res) => {
    try {
      const { state } = req.params;

      const rates = usaCompliance.getCorporateTaxRate(state);

      res.json({ success: true, data: rates });
    } catch (error) {
      logger.error('Error getting corporate tax rate:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;
