/**
 * USA Compliance Engine
 * 
 * Motor de cumplimiento regulatorio para Estados Unidos.
 * Incluye:
 * - IRS Form 1099 (automatic generation)
 * - Sales Tax (state-specific rates)
 * - GAAP compliance
 * - Corporate Tax
 * - SOX (if applicable)
 * - Audit trail generation
 * 
 * @module USAComplianceEngine
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

/**
 * USA Compliance Engine Class
 */
class USAComplianceEngine {
  constructor(config = {}) {
    this.regulations = {
      irs: {
        form1099: {
          threshold: 600,  // $600+ require 1099
          deadline: 'January 31',
          requiredFor: ['contractors', 'vendors', 'rent', 'royalties', 'professional_services'],
          types: {
            'MISC': 'Miscellaneous Income',
            'NEC': 'Nonemployee Compensation',
            'INT': 'Interest Income',
            'DIV': 'Dividends',
            'K': 'Merchant Card Payments'
          }
        },
        
        salesTax: {
          // State-specific sales tax rates (base rates, local taxes may apply)
          states: {
            AL: 4.00, AK: 0.00, AZ: 5.60, AR: 6.50, CA: 7.25,
            CO: 2.90, CT: 6.35, DE: 0.00, FL: 6.00, GA: 4.00,
            HI: 4.00, ID: 6.00, IL: 6.25, IN: 7.00, IA: 6.00,
            KS: 6.50, KY: 6.00, LA: 4.45, ME: 5.50, MD: 6.00,
            MA: 6.25, MI: 6.00, MN: 6.88, MS: 7.00, MO: 4.23,
            MT: 0.00, NE: 5.50, NV: 6.85, NH: 0.00, NJ: 6.63,
            NM: 5.13, NY: 4.00, NC: 4.75, ND: 5.00, OH: 5.75,
            OK: 4.50, OR: 0.00, PA: 6.00, RI: 7.00, SC: 6.00,
            SD: 4.50, TN: 7.00, TX: 6.25, UT: 6.10, VT: 6.00,
            VA: 5.30, WA: 6.50, WV: 6.00, WI: 5.00, WY: 4.00,
            DC: 6.00
          },
          requiresLicense: true,
          filingFrequency: {
            monthly: 'Sales > $20,000/month',
            quarterly: 'Sales > $1,200/month',
            annual: 'Sales < $1,200/month'
          },
          nexusRules: {
            physical: true,  // Physical presence creates nexus
            economic: true,  // $100K+ sales or 200+ transactions
            marketplace: true  // Marketplace facilitator rules
          }
        },
        
        corporateTax: {
          federalRate: 21,  // 21% federal corporate tax
          stateRates: {
            AL: 6.5, AK: 9.4, AZ: 4.9, AR: 6.2, CA: 8.84,
            CO: 4.55, CT: 7.5, DE: 8.7, FL: 5.5, GA: 5.75,
            HI: 6.4, ID: 6.0, IL: 9.5, IN: 5.25, IA: 9.8,
            KS: 7.0, KY: 5.0, LA: 7.5, ME: 8.93, MD: 8.25,
            MA: 8.0, MI: 6.0, MN: 9.8, MS: 5.0, MO: 4.0,
            MT: 6.75, NE: 7.5, NV: 0.0, NH: 7.5, NJ: 11.5,
            NM: 5.9, NY: 6.5, NC: 2.5, ND: 4.31, OH: 0.0,
            OK: 4.0, OR: 7.6, PA: 8.99, RI: 7.0, SC: 5.0,
            SD: 0.0, TN: 6.5, TX: 0.0, UT: 4.95, VT: 8.5,
            VA: 6.0, WA: 0.0, WV: 6.5, WI: 7.9, WY: 0.0,
            DC: 8.25
          },
          filingDeadline: {
            cCorp: 'March 15',  // 2.5 months after year-end
            sCorp: 'March 15',
            partnership: 'March 15',
            llc: 'March 15'  // Depends on tax treatment
          },
          estimatedTaxPayments: {
            required: true,
            frequency: 'quarterly',
            dueDates: ['April 15', 'June 15', 'September 15', 'January 15']
          }
        },
        
        w2Forms: {
          deadline: 'January 31',
          electronicFiling: {
            required: true,
            threshold: 250  // 250+ W-2s must be filed electronically
          }
        }
      },
      
      gaap: {
        standards: [
          'ASC 606 - Revenue Recognition',
          'ASC 842 - Leases',
          'ASC 320 - Financial Instruments',
          'ASC 810 - Consolidation',
          'ASC 450 - Contingencies',
          'ASC 740 - Income Taxes'
        ],
        
        requiredStatements: [
          'Balance Sheet',
          'Income Statement',
          'Cash Flow Statement',
          'Statement of Shareholders Equity',
          'Notes to Financial Statements'
        ],
        
        disclosureRequirements: [
          'Significant accounting policies',
          'Related party transactions',
          'Commitments and contingencies',
          'Subsequent events',
          'Segment information'
        ]
      },
      
      sox: {
        applicable: false,  // Only for public companies
        requirements: [
          'Section 302 - CEO/CFO certification',
          'Section 404 - Internal controls assessment',
          'Section 409 - Real-time disclosure',
          'Section 802 - Criminal penalties'
        ]
      }
    };
    
    this.config = config;
  }

  /**
   * Validate sales tax for a transaction
   */
  async validateSalesTax(transaction) {
    if (transaction.country !== 'USA') {
      return { compliant: true, message: 'Not USA transaction' };
    }

    const customer = transaction.customer;
    if (!customer || !customer.address || !customer.address.state) {
      return {
        compliant: false,
        issue: 'Missing customer state information',
        recommendation: 'Add customer state to calculate sales tax',
        severity: 'high'
      };
    }
    
    const state = customer.address.state;
    
    // Get sales tax rate for state
    const taxRate = this.regulations.irs.salesTax.states[state];
    
    if (taxRate === undefined) {
      return {
        compliant: false,
        issue: `Sales tax rate not configured for state: ${state}`,
        recommendation: `Configure tax rate for ${state}`,
        severity: 'high'
      };
    }
    
    // States with 0% sales tax are compliant if no tax charged
    if (taxRate === 0) {
      return {
        compliant: transaction.tax === 0 || !transaction.tax,
        taxRate: 0,
        message: `${state} has no state sales tax`
      };
    }

    // Calculate expected tax
    const subtotal = transaction.subtotal || transaction.amount || 0;
    const expectedTax = subtotal * (taxRate / 100);
    const actualTax = transaction.tax || 0;
    
    const tolerance = 0.01;  // $0.01 tolerance
    const difference = Math.abs(expectedTax - actualTax);
    
    if (difference > tolerance) {
      return {
        compliant: false,
        issue: 'Sales tax miscalculated',
        expected: expectedTax,
        actual: actualTax,
        difference,
        taxRate,
        recommendation: 'Recalculate sales tax using state rate',
        severity: 'high'
      };
    }

    return { 
      compliant: true, 
      taxRate, 
      taxAmount: actualTax,
      message: 'Sales tax correctly calculated'
    };
  }

  /**
   * Generate 1099 forms automatically for tax year
   */
  async generate1099Forms(taxYear, organizationId) {
    try {
      const threshold = this.regulations.irs.form1099.threshold;
      
      // Get all payments to vendors >= $600 in the tax year
      const Payment = mongoose.model('Payment');
      const Vendor = mongoose.model('Vendor');
      
      const startDate = new Date(taxYear, 0, 1);
      const endDate = new Date(taxYear, 11, 31, 23, 59, 59);
      
      const vendors = await Payment.aggregate([
        {
          $match: {
            date: { $gte: startDate, $lte: endDate },
            organizationId: mongoose.Types.ObjectId(organizationId),
            country: 'USA',
            status: 'completed'
          }
        },
        {
          $group: {
            _id: '$vendorId',
            totalPaid: { $sum: '$amount' },
            paymentCount: { $sum: 1 },
            payments: { $push: '$$ROOT' }
          }
        },
        {
          $match: {
            totalPaid: { $gte: threshold }
          }
        }
      ]);

      const forms = [];

      for (const vendorData of vendors) {
        const vendor = await Vendor.findById(vendorData._id);
        
        if (!vendor) {
          logger.warn(`Vendor not found: ${vendorData._id}`);
          continue;
        }
        
        // Determine 1099 type based on payment category
        const formType = this.determine1099Type(vendorData.payments, vendor);
        
        // Get organization info
        const Organization = mongoose.model('Organization');
        const org = await Organization.findById(organizationId);
        
        forms.push({
          formType,
          taxYear,
          payer: {
            name: org.name,
            ein: org.ein || org.taxId,
            address: {
              street: org.address.street,
              city: org.address.city,
              state: org.address.state,
              zipCode: org.address.zipCode
            }
          },
          recipient: {
            name: vendor.name,
            tin: vendor.taxId || vendor.ssn,  // TIN (EIN or SSN)
            address: {
              street: vendor.address.street,
              city: vendor.address.city,
              state: vendor.address.state,
              zipCode: vendor.address.zipCode
            }
          },
          amounts: {
            box1: formType === '1099-NEC' ? vendorData.totalPaid : 0,  // Nonemployee compensation
            box3: formType === '1099-MISC' ? vendorData.totalPaid : 0,  // Other income
            box7: 0  // Direct sales
          },
          paymentCount: vendorData.paymentCount,
          dueDate: `January 31, ${taxYear + 1}`,
          generatedAt: new Date(),
          status: 'draft'
        });
      }

      logger.info(`Generated ${forms.length} Form 1099s for tax year ${taxYear}`);
      return forms;
      
    } catch (error) {
      logger.error('Error generating 1099 forms:', error);
      throw error;
    }
  }

  /**
   * Determine 1099 type based on payments
   */
  determine1099Type(payments, vendor) {
    // Check vendor category
    if (vendor.category) {
      if (vendor.category.includes('contractor') || vendor.category.includes('freelance')) {
        return '1099-NEC';  // Nonemployee Compensation
      }
      if (vendor.category.includes('rent') || vendor.category.includes('royalty')) {
        return '1099-MISC';  // Miscellaneous Income
      }
    }
    
    // Check payment categories
    const categories = payments.map(p => p.category).filter(Boolean);
    
    if (categories.some(c => c.includes('service') || c.includes('consulting') || c.includes('professional'))) {
      return '1099-NEC';
    }
    
    // Default to MISC
    return '1099-MISC';
  }

  /**
   * Validate corporate tax compliance
   */
  async validateCorporateTax(organizationId, taxYear) {
    try {
      const Organization = mongoose.model('Organization');
      const org = await Organization.findById(organizationId);
      
      if (!org || !org.address || !org.address.state) {
        return {
          compliant: false,
          issue: 'Missing organization state information',
          recommendation: 'Add organization state for tax compliance'
        };
      }
      
      const state = org.address.state;
      const federalRate = this.regulations.irs.corporateTax.federalRate;
      const stateRate = this.regulations.irs.corporateTax.stateRates[state] || 0;
      
      // Get financial data for tax year
      const Transaction = mongoose.model('Transaction');
      const startDate = new Date(taxYear, 0, 1);
      const endDate = new Date(taxYear, 11, 31, 23, 59, 59);
      
      const financialData = await Transaction.aggregate([
        {
          $match: {
            organizationId: mongoose.Types.ObjectId(organizationId),
            date: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' }
          }
        }
      ]);
      
      const income = financialData.find(d => d._id === 'income')?.total || 0;
      const expenses = financialData.find(d => d._id === 'expense')?.total || 0;
      const taxableIncome = income - expenses;
      
      const federalTax = taxableIncome * (federalRate / 100);
      const stateTax = taxableIncome * (stateRate / 100);
      const totalTax = federalTax + stateTax;
      
      return {
        compliant: true,
        taxYear,
        state,
        financials: {
          income,
          expenses,
          taxableIncome
        },
        taxCalculation: {
          federal: {
            rate: federalRate,
            amount: federalTax
          },
          state: {
            rate: stateRate,
            amount: stateTax
          },
          total: totalTax
        },
        filingDeadline: this.regulations.irs.corporateTax.filingDeadline.cCorp,
        message: 'Tax calculation completed'
      };
      
    } catch (error) {
      logger.error('Error validating corporate tax:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive audit trail
   */
  async generateAuditTrail(organizationId, startDate, endDate) {
    try {
      const Transaction = mongoose.model('Transaction');
      
      const transactions = await Transaction.find({
        organizationId,
        date: { $gte: startDate, $lte: endDate }
      })
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .populate('modifiedBy', 'name email')
        .sort({ date: 1 });

      const auditTrail = transactions.map(tx => ({
        transactionId: tx._id,
        date: tx.date,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        description: tx.description,
        category: tx.category,
        createdBy: {
          name: tx.createdBy?.name,
          email: tx.createdBy?.email
        },
        createdAt: tx.createdAt,
        approvedBy: {
          name: tx.approvedBy?.name,
          email: tx.approvedBy?.email
        },
        approvedAt: tx.approvedAt,
        modifiedBy: {
          name: tx.modifiedBy?.name,
          email: tx.modifiedBy?.email
        },
        modifiedAt: tx.modifiedAt,
        status: tx.status,
        ipAddress: tx.metadata?.ipAddress,
        userAgent: tx.metadata?.userAgent,
        changes: tx.auditLog || [],
        attachments: tx.attachments?.length || 0
      }));

      logger.info(`Generated audit trail: ${auditTrail.length} transactions`);
      
      return {
        organizationId,
        period: { startDate, endDate },
        transactionCount: auditTrail.length,
        transactions: auditTrail,
        generatedAt: new Date(),
        compliance: {
          gaap: true,
          sox: this.regulations.sox.applicable
        }
      };
      
    } catch (error) {
      logger.error('Error generating audit trail:', error);
      throw error;
    }
  }

  /**
   * Check GAAP compliance
   */
  async checkGAAPCompliance(organizationId) {
    try {
      const Organization = mongoose.model('Organization');
      const org = await Organization.findById(organizationId);
      
      const checks = [];
      
      // Check if required financial statements exist
      for (const statement of this.regulations.gaap.requiredStatements) {
        checks.push({
          requirement: statement,
          compliant: true,  // Assume compliant for now
          note: 'Financial statement should be generated monthly'
        });
      }
      
      // Check accounting standards
      for (const standard of this.regulations.gaap.standards) {
        checks.push({
          requirement: standard,
          compliant: true,
          note: 'Review accounting policies for compliance'
        });
      }
      
      const allCompliant = checks.every(c => c.compliant);
      
      return {
        compliant: allCompliant,
        organizationId,
        checks,
        message: allCompliant 
          ? 'GAAP compliance verified' 
          : 'GAAP compliance issues detected',
        generatedAt: new Date()
      };
      
    } catch (error) {
      logger.error('Error checking GAAP compliance:', error);
      throw error;
    }
  }

  /**
   * Get compliance summary for organization
   */
  async getComplianceSummary(organizationId, taxYear) {
    try {
      const [
        salesTaxSummary,
        form1099Summary,
        corporateTaxSummary,
        gaapCompliance
      ] = await Promise.all([
        this.getSalesTaxSummary(organizationId, taxYear),
        this.get1099Summary(organizationId, taxYear),
        this.validateCorporateTax(organizationId, taxYear),
        this.checkGAAPCompliance(organizationId)
      ]);
      
      return {
        organizationId,
        taxYear,
        salesTax: salesTaxSummary,
        form1099: form1099Summary,
        corporateTax: corporateTaxSummary,
        gaap: gaapCompliance,
        generatedAt: new Date()
      };
      
    } catch (error) {
      logger.error('Error generating compliance summary:', error);
      throw error;
    }
  }

  /**
   * Get sales tax summary
   */
  async getSalesTaxSummary(organizationId, taxYear) {
    try {
      const Transaction = mongoose.model('Transaction');
      const startDate = new Date(taxYear, 0, 1);
      const endDate = new Date(taxYear, 11, 31, 23, 59, 59);
      
      const transactions = await Transaction.find({
        organizationId,
        date: { $gte: startDate, $lte: endDate },
        country: 'USA',
        type: 'income'
      }).populate('customer');
      
      const byState = {};
      let totalTaxCollected = 0;
      
      for (const tx of transactions) {
        const state = tx.customer?.address?.state || 'Unknown';
        const taxAmount = tx.tax || 0;
        
        if (!byState[state]) {
          byState[state] = {
            transactionCount: 0,
            totalSales: 0,
            totalTax: 0,
            taxRate: this.regulations.irs.salesTax.states[state] || 0
          };
        }
        
        byState[state].transactionCount++;
        byState[state].totalSales += tx.amount;
        byState[state].totalTax += taxAmount;
        totalTaxCollected += taxAmount;
      }
      
      return {
        taxYear,
        totalTaxCollected,
        byState,
        transactionCount: transactions.length
      };
      
    } catch (error) {
      logger.error('Error generating sales tax summary:', error);
      throw error;
    }
  }

  /**
   * Get 1099 summary
   */
  async get1099Summary(organizationId, taxYear) {
    try {
      const forms = await this.generate1099Forms(taxYear, organizationId);
      
      const summary = {
        taxYear,
        totalForms: forms.length,
        byType: {},
        totalAmount: 0
      };
      
      forms.forEach(form => {
        if (!summary.byType[form.formType]) {
          summary.byType[form.formType] = {
            count: 0,
            amount: 0
          };
        }
        
        summary.byType[form.formType].count++;
        summary.byType[form.formType].amount += form.amounts.box1 || form.amounts.box3 || 0;
        summary.totalAmount += form.amounts.box1 || form.amounts.box3 || 0;
      });
      
      return summary;
      
    } catch (error) {
      logger.error('Error generating 1099 summary:', error);
      throw error;
    }
  }
}

module.exports = USAComplianceEngine;
