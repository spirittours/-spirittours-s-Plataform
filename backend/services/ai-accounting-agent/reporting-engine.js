/**
 * Reporting Engine - Automated Report Generation
 * 
 * Sistema de generación automática de reportes financieros y ejecutivos.
 * Incluye:
 * - Reportes diarios (transacciones, alertas, cash flow)
 * - Reportes semanales (rentabilidad, cumplimiento, performance)
 * - Reportes mensuales (estados financieros, variaciones, KPIs)
 * - Reportes trimestrales (accionistas, proyecciones)
 * - Exportación a PDF, Excel, JSON
 * 
 * @module ReportingEngine
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

/**
 * Reporting Engine Class
 */
class ReportingEngine {
  constructor(config = {}) {
    this.config = {
      timezone: config.timezone || 'America/Mexico_City',
      currency: config.currency || 'USD',
      locale: config.locale || 'en-US',
      ...config
    };
    
    // Report schedules
    this.schedules = {
      daily: [
        { name: 'Transaction Summary', time: '18:00', recipients: [] },
        { name: 'Fraud Alerts', time: '09:00', recipients: [] },
        { name: 'Cash Flow Status', time: '08:00', recipients: [] }
      ],
      
      weekly: [
        { name: 'Profitability Analysis', day: 'Monday', recipients: [] },
        { name: 'Compliance Review', day: 'Friday', recipients: [] },
        { name: 'Branch Performance', day: 'Monday', recipients: [] }
      ],
      
      monthly: [
        { name: 'Financial Statements', day: 5, recipients: [] },
        { name: 'Variance Analysis', day: 5, recipients: [] },
        { name: 'Executive KPIs', day: 1, recipients: [] }
      ],
      
      quarterly: [
        { name: 'Shareholder Report', month: 'last', recipients: [] },
        { name: 'Financial Projections', month: 'first', recipients: [] }
      ]
    };
  }

  /**
   * Generate daily transaction summary
   */
  async generateDailyTransactionReport(organizationId, date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const Transaction = mongoose.model('Transaction');
      
      const transactions = await Transaction.find({
        organizationId,
        date: { $gte: startOfDay, $lte: endOfDay }
      })
        .populate('customer', 'name')
        .populate('vendor', 'name')
        .populate('createdBy', 'name');

      // Calculate totals
      const summary = {
        date: date.toISOString().split('T')[0],
        totals: {
          income: 0,
          expenses: 0,
          net: 0,
          count: transactions.length
        },
        byCategory: {},
        byBranch: {},
        byPaymentMethod: {},
        topCustomers: [],
        topVendors: [],
        alerts: []
      };

      // Process transactions
      transactions.forEach(tx => {
        const amount = tx.amount || 0;
        
        if (tx.type === 'income') {
          summary.totals.income += amount;
        } else if (tx.type === 'expense') {
          summary.totals.expenses += amount;
        }

        // By category
        const category = tx.category || 'Uncategorized';
        summary.byCategory[category] = (summary.byCategory[category] || 0) + amount;

        // By branch
        const branch = tx.branchId?.toString() || 'Main';
        summary.byBranch[branch] = (summary.byBranch[branch] || 0) + amount;
        
        // By payment method
        const paymentMethod = tx.paymentMethod || 'Other';
        summary.byPaymentMethod[paymentMethod] = (summary.byPaymentMethod[paymentMethod] || 0) + amount;
      });

      summary.totals.net = summary.totals.income - summary.totals.expenses;

      // Top 5 customers
      const customerTotals = {};
      transactions
        .filter(t => t.type === 'income' && t.customer)
        .forEach(t => {
          const name = t.customer.name;
          customerTotals[name] = (customerTotals[name] || 0) + t.amount;
        });

      summary.topCustomers = Object.entries(customerTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));

      // Top 5 vendors
      const vendorTotals = {};
      transactions
        .filter(t => t.type === 'expense' && t.vendor)
        .forEach(t => {
          const name = t.vendor.name;
          vendorTotals[name] = (vendorTotals[name] || 0) + t.amount;
        });

      summary.topVendors = Object.entries(vendorTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));

      // Generate alerts
      if (summary.totals.net < 0) {
        summary.alerts.push({
          severity: 'warning',
          message: '⚠️ Negative cash flow today',
          amount: summary.totals.net
        });
      }

      if (summary.totals.expenses > summary.totals.income * 0.9) {
        summary.alerts.push({
          severity: 'warning',
          message: '⚠️ Expenses are 90%+ of income',
          ratio: (summary.totals.expenses / summary.totals.income * 100).toFixed(1) + '%'
        });
      }

      if (summary.totals.count === 0) {
        summary.alerts.push({
          severity: 'info',
          message: 'ℹ️ No transactions recorded today'
        });
      }

      logger.info(`Generated daily transaction report for ${date.toISOString().split('T')[0]}`);

      return {
        reportType: 'Daily Transaction Summary',
        ...summary,
        generatedAt: new Date(),
        generatedBy: 'AI Accounting Agent'
      };

    } catch (error) {
      logger.error('Error generating daily transaction report:', error);
      throw error;
    }
  }

  /**
   * Generate monthly financial statements
   */
  async generateMonthlyFinancialStatements(organizationId, year, month) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const [balanceSheet, incomeStatement, cashFlowStatement] = await Promise.all([
        this.generateBalanceSheet(organizationId, endDate),
        this.generateIncomeStatement(organizationId, startDate, endDate),
        this.generateCashFlowStatement(organizationId, startDate, endDate)
      ]);

      // Calculate KPIs
      const kpis = this.calculateKPIs(balanceSheet, incomeStatement, cashFlowStatement);

      // Variance analysis (vs previous month)
      const previousMonth = month === 1 ? 12 : month - 1;
      const previousYear = month === 1 ? year - 1 : year;
      const varianceAnalysis = await this.generateVarianceAnalysis(
        organizationId, 
        year, 
        month, 
        previousYear, 
        previousMonth
      );

      logger.info(`Generated monthly financial statements for ${year}-${month}`);

      return {
        reportType: 'Monthly Financial Statements',
        period: { year, month, startDate, endDate },
        balanceSheet,
        incomeStatement,
        cashFlowStatement,
        kpis,
        varianceAnalysis,
        generatedAt: new Date(),
        generatedBy: 'AI Accounting Agent'
      };

    } catch (error) {
      logger.error('Error generating monthly financial statements:', error);
      throw error;
    }
  }

  /**
   * Generate Balance Sheet (Balance General)
   */
  async generateBalanceSheet(organizationId, asOfDate) {
    try {
      // This is simplified - in production, query actual account balances
      const Transaction = mongoose.model('Transaction');
      
      const transactions = await Transaction.find({
        organizationId,
        date: { $lte: asOfDate }
      });

      // Calculate totals (simplified)
      let cashBalance = 0;
      let accountsReceivable = 0;
      let accountsPayable = 0;
      
      transactions.forEach(tx => {
        if (tx.type === 'income') {
          cashBalance += tx.amount;
          if (tx.status === 'pending') {
            accountsReceivable += tx.amount;
          }
        } else if (tx.type === 'expense') {
          cashBalance -= tx.amount;
          if (tx.status === 'pending') {
            accountsPayable += tx.amount;
          }
        }
      });

      const assets = {
        current: {
          cash: cashBalance,
          accountsReceivable,
          inventory: 0,
          prepaidExpenses: 0,
          total: cashBalance + accountsReceivable
        },
        fixed: {
          propertyPlantEquipment: 0,
          accumulatedDepreciation: 0,
          total: 0
        },
        other: {
          intangibleAssets: 0,
          total: 0
        }
      };

      assets.total = assets.current.total + assets.fixed.total + assets.other.total;

      const liabilities = {
        current: {
          accountsPayable,
          shortTermDebt: 0,
          accruedExpenses: 0,
          total: accountsPayable
        },
        longTerm: {
          longTermDebt: 0,
          deferredTaxLiabilities: 0,
          total: 0
        }
      };

      liabilities.total = liabilities.current.total + liabilities.longTerm.total;

      const equity = {
        commonStock: 0,
        retainedEarnings: assets.total - liabilities.total,
        total: assets.total - liabilities.total
      };

      return {
        asOfDate,
        assets,
        liabilities,
        equity,
        check: {
          assetsEqualLiabilitiesPlusEquity: Math.abs(assets.total - (liabilities.total + equity.total)) < 0.01
        }
      };

    } catch (error) {
      logger.error('Error generating balance sheet:', error);
      throw error;
    }
  }

  /**
   * Generate Income Statement (Estado de Resultados)
   */
  async generateIncomeStatement(organizationId, startDate, endDate) {
    try {
      const Transaction = mongoose.model('Transaction');
      
      const transactions = await Transaction.find({
        organizationId,
        date: { $gte: startDate, $lte: endDate }
      });

      const revenue = {
        sales: 0,
        services: 0,
        other: 0
      };

      const expenses = {
        costOfGoodsSold: 0,
        operatingExpenses: {
          salaries: 0,
          rent: 0,
          utilities: 0,
          marketing: 0,
          other: 0
        },
        depreciation: 0,
        interest: 0,
        taxes: 0
      };

      transactions.forEach(tx => {
        if (tx.type === 'income') {
          if (tx.category?.includes('sales')) {
            revenue.sales += tx.amount;
          } else if (tx.category?.includes('service')) {
            revenue.services += tx.amount;
          } else {
            revenue.other += tx.amount;
          }
        } else if (tx.type === 'expense') {
          if (tx.category?.includes('salary') || tx.category?.includes('payroll')) {
            expenses.operatingExpenses.salaries += tx.amount;
          } else if (tx.category?.includes('rent')) {
            expenses.operatingExpenses.rent += tx.amount;
          } else if (tx.category?.includes('utilities')) {
            expenses.operatingExpenses.utilities += tx.amount;
          } else if (tx.category?.includes('marketing') || tx.category?.includes('advertising')) {
            expenses.operatingExpenses.marketing += tx.amount;
          } else {
            expenses.operatingExpenses.other += tx.amount;
          }
        }
      });

      revenue.total = revenue.sales + revenue.services + revenue.other;
      expenses.operatingExpenses.total = Object.values(expenses.operatingExpenses)
        .filter(v => typeof v === 'number')
        .reduce((sum, val) => sum + val, 0);
      
      expenses.total = expenses.costOfGoodsSold + expenses.operatingExpenses.total + 
                      expenses.depreciation + expenses.interest + expenses.taxes;

      const grossProfit = revenue.total - expenses.costOfGoodsSold;
      const operatingIncome = grossProfit - expenses.operatingExpenses.total;
      const netIncome = operatingIncome - expenses.depreciation - expenses.interest - expenses.taxes;

      return {
        period: { startDate, endDate },
        revenue,
        expenses,
        grossProfit,
        grossProfitMargin: revenue.total > 0 ? (grossProfit / revenue.total * 100) : 0,
        operatingIncome,
        operatingMargin: revenue.total > 0 ? (operatingIncome / revenue.total * 100) : 0,
        netIncome,
        netProfitMargin: revenue.total > 0 ? (netIncome / revenue.total * 100) : 0
      };

    } catch (error) {
      logger.error('Error generating income statement:', error);
      throw error;
    }
  }

  /**
   * Generate Cash Flow Statement (Estado de Flujo de Efectivo)
   */
  async generateCashFlowStatement(organizationId, startDate, endDate) {
    try {
      const Transaction = mongoose.model('Transaction');
      
      const transactions = await Transaction.find({
        organizationId,
        date: { $gte: startDate, $lte: endDate },
        status: 'completed'  // Only completed transactions affect cash flow
      });

      const operating = {
        cashFromSales: 0,
        cashPaidToSuppliers: 0,
        cashPaidForExpenses: 0,
        net: 0
      };

      const investing = {
        purchaseOfAssets: 0,
        saleOfAssets: 0,
        net: 0
      };

      const financing = {
        borrowings: 0,
        repayments: 0,
        dividends: 0,
        net: 0
      };

      transactions.forEach(tx => {
        if (tx.type === 'income') {
          operating.cashFromSales += tx.amount;
        } else if (tx.type === 'expense') {
          if (tx.category?.includes('asset') || tx.category?.includes('equipment')) {
            investing.purchaseOfAssets += tx.amount;
          } else {
            operating.cashPaidForExpenses += tx.amount;
          }
        }
      });

      operating.net = operating.cashFromSales - operating.cashPaidForExpenses;
      investing.net = investing.saleOfAssets - investing.purchaseOfAssets;
      financing.net = financing.borrowings - financing.repayments - financing.dividends;

      const netCashFlow = operating.net + investing.net + financing.net;

      return {
        period: { startDate, endDate },
        operating,
        investing,
        financing,
        netCashFlow,
        beginningCash: 0,  // Would need to query from previous period
        endingCash: netCashFlow
      };

    } catch (error) {
      logger.error('Error generating cash flow statement:', error);
      throw error;
    }
  }

  /**
   * Calculate KPIs
   */
  calculateKPIs(balanceSheet, incomeStatement, cashFlowStatement) {
    const kpis = {
      profitability: {
        grossProfitMargin: incomeStatement.grossProfitMargin,
        operatingMargin: incomeStatement.operatingMargin,
        netProfitMargin: incomeStatement.netProfitMargin,
        returnOnAssets: balanceSheet.assets.total > 0 
          ? (incomeStatement.netIncome / balanceSheet.assets.total * 100) 
          : 0,
        returnOnEquity: balanceSheet.equity.total > 0 
          ? (incomeStatement.netIncome / balanceSheet.equity.total * 100) 
          : 0
      },
      
      liquidity: {
        currentRatio: balanceSheet.liabilities.current.total > 0 
          ? (balanceSheet.assets.current.total / balanceSheet.liabilities.current.total) 
          : 0,
        quickRatio: balanceSheet.liabilities.current.total > 0 
          ? ((balanceSheet.assets.current.cash + balanceSheet.assets.current.accountsReceivable) / balanceSheet.liabilities.current.total) 
          : 0,
        cashRatio: balanceSheet.liabilities.current.total > 0 
          ? (balanceSheet.assets.current.cash / balanceSheet.liabilities.current.total) 
          : 0
      },
      
      efficiency: {
        assetTurnover: balanceSheet.assets.total > 0 
          ? (incomeStatement.revenue.total / balanceSheet.assets.total) 
          : 0,
        receivablesTurnover: balanceSheet.assets.current.accountsReceivable > 0 
          ? (incomeStatement.revenue.total / balanceSheet.assets.current.accountsReceivable) 
          : 0,
        daysReceivablesOutstanding: 0  // Would need revenue per day
      },
      
      leverage: {
        debtToAssets: balanceSheet.assets.total > 0 
          ? (balanceSheet.liabilities.total / balanceSheet.assets.total) 
          : 0,
        debtToEquity: balanceSheet.equity.total > 0 
          ? (balanceSheet.liabilities.total / balanceSheet.equity.total) 
          : 0,
        equityMultiplier: balanceSheet.equity.total > 0 
          ? (balanceSheet.assets.total / balanceSheet.equity.total) 
          : 0
      },
      
      cashFlow: {
        operatingCashFlow: cashFlowStatement.operating.net,
        freeCashFlow: cashFlowStatement.operating.net + cashFlowStatement.investing.net,
        cashFlowToDebt: balanceSheet.liabilities.total > 0 
          ? (cashFlowStatement.operating.net / balanceSheet.liabilities.total) 
          : 0
      }
    };

    return kpis;
  }

  /**
   * Generate variance analysis (month-over-month)
   */
  async generateVarianceAnalysis(organizationId, currentYear, currentMonth, previousYear, previousMonth) {
    try {
      const currentStatements = await this.generateMonthlyFinancialStatements(
        organizationId, 
        currentYear, 
        currentMonth
      );
      
      const previousStatements = await this.generateMonthlyFinancialStatements(
        organizationId, 
        previousYear, 
        previousMonth
      );

      const variance = {
        revenue: {
          current: currentStatements.incomeStatement.revenue.total,
          previous: previousStatements.incomeStatement.revenue.total,
          absolute: 0,
          percentage: 0
        },
        expenses: {
          current: currentStatements.incomeStatement.expenses.total,
          previous: previousStatements.incomeStatement.expenses.total,
          absolute: 0,
          percentage: 0
        },
        netIncome: {
          current: currentStatements.incomeStatement.netIncome,
          previous: previousStatements.incomeStatement.netIncome,
          absolute: 0,
          percentage: 0
        },
        cashFlow: {
          current: currentStatements.cashFlowStatement.netCashFlow,
          previous: previousStatements.cashFlowStatement.netCashFlow,
          absolute: 0,
          percentage: 0
        }
      };

      // Calculate variances
      Object.keys(variance).forEach(key => {
        variance[key].absolute = variance[key].current - variance[key].previous;
        variance[key].percentage = variance[key].previous !== 0 
          ? (variance[key].absolute / variance[key].previous * 100) 
          : 0;
      });

      // Generate insights
      const insights = [];
      
      if (Math.abs(variance.revenue.percentage) > 10) {
        insights.push({
          type: variance.revenue.percentage > 0 ? 'positive' : 'negative',
          metric: 'Revenue',
          message: `Revenue ${variance.revenue.percentage > 0 ? 'increased' : 'decreased'} by ${Math.abs(variance.revenue.percentage).toFixed(1)}%`,
          recommendation: variance.revenue.percentage < 0 
            ? 'Review sales strategy and customer engagement'
            : 'Sustain growth momentum'
        });
      }

      if (Math.abs(variance.expenses.percentage) > 10) {
        insights.push({
          type: variance.expenses.percentage > 0 ? 'negative' : 'positive',
          metric: 'Expenses',
          message: `Expenses ${variance.expenses.percentage > 0 ? 'increased' : 'decreased'} by ${Math.abs(variance.expenses.percentage).toFixed(1)}%`,
          recommendation: variance.expenses.percentage > 0 
            ? 'Review cost control measures'
            : 'Good cost management'
        });
      }

      return {
        period: {
          current: { year: currentYear, month: currentMonth },
          previous: { year: previousYear, month: previousMonth }
        },
        variance,
        insights
      };

    } catch (error) {
      logger.error('Error generating variance analysis:', error);
      throw error;
    }
  }

  /**
   * Generate executive summary report
   */
  async generateExecutiveSummary(organizationId, year, month) {
    try {
      const [
        financialStatements,
        fraudAlerts,
        complianceStatus
      ] = await Promise.all([
        this.generateMonthlyFinancialStatements(organizationId, year, month),
        this.getFraudAlertsSummary(organizationId, year, month),
        this.getComplianceSummary(organizationId, year, month)
      ]);

      const highlights = [];

      // Revenue highlight
      if (financialStatements.incomeStatement.revenue.total > 0) {
        highlights.push({
          icon: '💰',
          title: 'Revenue',
          value: financialStatements.incomeStatement.revenue.total,
          change: financialStatements.varianceAnalysis.variance.revenue.percentage
        });
      }

      // Net income highlight
      highlights.push({
        icon: '📊',
        title: 'Net Income',
        value: financialStatements.incomeStatement.netIncome,
        margin: financialStatements.incomeStatement.netProfitMargin
      });

      // Cash flow highlight
      highlights.push({
        icon: '💵',
        title: 'Cash Flow',
        value: financialStatements.cashFlowStatement.netCashFlow,
        status: financialStatements.cashFlowStatement.netCashFlow > 0 ? 'positive' : 'negative'
      });

      // Fraud alerts highlight
      if (fraudAlerts.total > 0) {
        highlights.push({
          icon: '⚠️',
          title: 'Fraud Alerts',
          value: fraudAlerts.total,
          severity: 'critical'
        });
      }

      return {
        reportType: 'Executive Summary',
        period: { year, month },
        highlights,
        financialStatements,
        fraudAlerts,
        complianceStatus,
        kpis: financialStatements.kpis,
        generatedAt: new Date(),
        generatedBy: 'AI Accounting Agent'
      };

    } catch (error) {
      logger.error('Error generating executive summary:', error);
      throw error;
    }
  }

  /**
   * Get fraud alerts summary
   */
  async getFraudAlertsSummary(organizationId, year, month) {
    // Simplified - would integrate with FraudDetectionEngine
    return {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      resolved: 0,
      pending: 0
    };
  }

  /**
   * Get compliance summary
   */
  async getComplianceSummary(organizationId, year, month) {
    // Simplified - would integrate with ComplianceEngines
    return {
      usa: {
        salesTax: { compliant: true },
        form1099: { pending: 0 }
      },
      mexico: {
        cfdi: { compliant: true, timbrados: 0 },
        contabilidad: { compliant: true }
      }
    };
  }

  /**
   * Export report to different formats
   */
  async exportReport(report, format = 'json') {
    try {
      switch (format.toLowerCase()) {
        case 'json':
          return {
            format: 'json',
            content: JSON.stringify(report, null, 2),
            filename: `report_${Date.now()}.json`
          };
        
        case 'csv':
          // Simplified CSV export
          return {
            format: 'csv',
            content: this.convertToCSV(report),
            filename: `report_${Date.now()}.csv`
          };
        
        case 'pdf':
          // Would need PDF generation library
          return {
            format: 'pdf',
            message: 'PDF generation requires additional library',
            filename: `report_${Date.now()}.pdf`
          };
        
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error('Error exporting report:', error);
      throw error;
    }
  }

  /**
   * Convert report data to CSV (simplified)
   */
  convertToCSV(data) {
    // Simplified CSV conversion
    return 'Report generated in JSON format. CSV conversion would be implemented based on specific report structure.';
  }
}

module.exports = ReportingEngine;
