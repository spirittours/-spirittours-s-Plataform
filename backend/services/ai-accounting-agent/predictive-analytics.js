/**
 * Predictive Analytics Engine
 * 
 * Implements AI-powered predictive analytics for accounting data:
 * - Cash flow forecasting with seasonal adjustment
 * - Revenue predictions with trend analysis
 * - Expense forecasting by category
 * - Budget vs actual predictions with early warnings
 * - ML-based time series analysis
 * - Anomaly detection in financial patterns
 * 
 * Uses historical data from ReportingEngine and integrates with DualReviewSystem
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const ReportingEngine = require('./reporting-engine');

class PredictiveAnalytics {
  constructor(aiService) {
    this.aiService = aiService;
    this.reportingEngine = new ReportingEngine(aiService);
  }

  /**
   * Forecast cash flow for the next N months
   * Uses historical data, seasonal patterns, and trend analysis
   */
  async forecastCashFlow(organizationId, forecastMonths = 6, options = {}) {
    try {
      const historicalMonths = options.historicalMonths || 12;
      const now = new Date();
      
      // Gather historical data
      const historicalData = [];
      for (let i = historicalMonths; i >= 1; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const report = await this.reportingEngine.generateMonthlyFinancialStatements(
          organizationId,
          date.getFullYear(),
          date.getMonth()
        );
        
        historicalData.push({
          year: date.getFullYear(),
          month: date.getMonth(),
          date: date,
          income: report.incomeStatement.revenue.total,
          expenses: report.incomeStatement.expenses.total,
          netCashFlow: report.cashFlowStatement.operating.net,
          operatingCashFlow: report.cashFlowStatement.operating.net,
          investingCashFlow: report.cashFlowStatement.investing?.net || 0,
          financingCashFlow: report.cashFlowStatement.financing?.net || 0
        });
      }

      // Calculate trends
      const trends = this.calculateTrends(historicalData);
      
      // Detect seasonality
      const seasonalFactors = this.detectSeasonality(historicalData);
      
      // Generate forecasts
      const forecasts = [];
      for (let i = 1; i <= forecastMonths; i++) {
        const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const month = forecastDate.getMonth();
        
        // Apply trend and seasonality
        const baseForecast = {
          income: trends.income.base + (trends.income.slope * (historicalMonths + i)),
          expenses: trends.expenses.base + (trends.expenses.slope * (historicalMonths + i)),
          operatingCashFlow: trends.netCashFlow.base + (trends.netCashFlow.slope * (historicalMonths + i))
        };
        
        // Apply seasonal adjustment
        const seasonalFactor = seasonalFactors[month] || 1.0;
        const adjustedForecast = {
          year: forecastDate.getFullYear(),
          month: month,
          date: forecastDate,
          income: baseForecast.income * seasonalFactor,
          expenses: baseForecast.expenses * seasonalFactor,
          netCashFlow: (baseForecast.income - baseForecast.expenses) * seasonalFactor,
          operatingCashFlow: baseForecast.operatingCashFlow * seasonalFactor,
          confidence: this.calculateConfidence(historicalData, i),
          confidenceInterval: this.calculateConfidenceInterval(baseForecast, trends, i)
        };
        
        forecasts.push(adjustedForecast);
      }

      // Generate insights
      const insights = await this.generateCashFlowInsights(historicalData, forecasts, trends);

      return {
        organizationId,
        generatedAt: new Date(),
        historicalPeriod: {
          months: historicalMonths,
          startDate: historicalData[0].date,
          endDate: historicalData[historicalData.length - 1].date
        },
        forecastPeriod: {
          months: forecastMonths,
          startDate: forecasts[0].date,
          endDate: forecasts[forecasts.length - 1].date
        },
        historical: historicalData,
        forecasts: forecasts,
        trends: trends,
        seasonalFactors: seasonalFactors,
        insights: insights,
        methodology: {
          model: 'Linear Trend + Seasonal Adjustment',
          historicalDataPoints: historicalData.length,
          seasonalityDetected: Object.keys(seasonalFactors).length > 0,
          confidenceCalculation: 'Based on historical variance and forecast distance'
        }
      };

    } catch (error) {
      logger.error('Error forecasting cash flow:', error);
      throw error;
    }
  }

  /**
   * Calculate linear trends from historical data
   */
  calculateTrends(historicalData) {
    const metrics = ['income', 'expenses', 'netCashFlow', 'operatingCashFlow'];
    const trends = {};

    metrics.forEach(metric => {
      const n = historicalData.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

      historicalData.forEach((data, index) => {
        const x = index + 1;
        const y = data[metric] || 0;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      });

      // Linear regression: y = mx + b
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Calculate R-squared (goodness of fit)
      const mean = sumY / n;
      let ssTot = 0, ssRes = 0;
      historicalData.forEach((data, index) => {
        const y = data[metric] || 0;
        const predicted = slope * (index + 1) + intercept;
        ssTot += Math.pow(y - mean, 2);
        ssRes += Math.pow(y - predicted, 2);
      });
      const rSquared = 1 - (ssRes / ssTot);

      trends[metric] = {
        slope: slope,
        base: intercept,
        rSquared: rSquared,
        direction: slope > 0 ? 'increasing' : 'decreasing',
        strength: Math.abs(rSquared) > 0.7 ? 'strong' : Math.abs(rSquared) > 0.4 ? 'moderate' : 'weak'
      };
    });

    return trends;
  }

  /**
   * Detect seasonal patterns in historical data
   */
  detectSeasonality(historicalData) {
    const monthlyAverages = {};
    const monthCounts = {};

    // Calculate average for each month
    historicalData.forEach(data => {
      const month = data.month;
      if (!monthlyAverages[month]) {
        monthlyAverages[month] = 0;
        monthCounts[month] = 0;
      }
      monthlyAverages[month] += data.netCashFlow;
      monthCounts[month]++;
    });

    // Calculate seasonal factors
    const seasonalFactors = {};
    let overallAverage = 0;
    let totalCount = 0;

    Object.keys(monthlyAverages).forEach(month => {
      monthlyAverages[month] /= monthCounts[month];
      overallAverage += monthlyAverages[month];
      totalCount++;
    });
    overallAverage /= totalCount;

    Object.keys(monthlyAverages).forEach(month => {
      seasonalFactors[month] = overallAverage !== 0 ? monthlyAverages[month] / overallAverage : 1.0;
    });

    return seasonalFactors;
  }

  /**
   * Calculate confidence level for forecast
   */
  calculateConfidence(historicalData, forecastIndex) {
    // Confidence decreases with forecast distance and increases with data consistency
    const baseConfidence = 0.95;
    const distancePenalty = 0.05 * forecastIndex; // 5% decrease per month
    const variance = this.calculateVariance(historicalData.map(d => d.netCashFlow));
    const variancePenalty = Math.min(variance / 10000, 0.2); // Max 20% penalty for high variance

    return Math.max(baseConfidence - distancePenalty - variancePenalty, 0.3);
  }

  /**
   * Calculate confidence interval for forecast
   */
  calculateConfidenceInterval(forecast, trends, forecastIndex) {
    const variance = Math.abs(trends.netCashFlow.slope * forecastIndex * 0.1);
    return {
      lower: (forecast.income - forecast.expenses) - (1.96 * variance),
      upper: (forecast.income - forecast.expenses) + (1.96 * variance)
    };
  }

  /**
   * Calculate variance of a dataset
   */
  calculateVariance(data) {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
  }

  /**
   * Generate AI-powered insights from cash flow forecast
   */
  async generateCashFlowInsights(historicalData, forecasts, trends) {
    try {
      const prompt = `
Actúa como un analista financiero experto. Analiza los siguientes datos de flujo de efectivo y proporciona insights accionables:

DATOS HISTÓRICOS (últimos ${historicalData.length} meses):
${JSON.stringify(historicalData.slice(-6).map(d => ({
  mes: `${d.year}-${d.month + 1}`,
  ingresos: d.income,
  gastos: d.expenses,
  flujoNeto: d.netCashFlow
})), null, 2)}

PRONÓSTICOS (próximos ${forecasts.length} meses):
${JSON.stringify(forecasts.map(f => ({
  mes: `${f.year}-${f.month + 1}`,
  ingresosProyectados: f.income,
  gastosProyectados: f.expenses,
  flujoNetoProyectado: f.netCashFlow,
  confianza: `${(f.confidence * 100).toFixed(1)}%`
})), null, 2)}

TENDENCIAS:
- Ingresos: ${trends.income.direction} (${trends.income.strength})
- Gastos: ${trends.expenses.direction} (${trends.expenses.strength})
- Flujo Neto: ${trends.netCashFlow.direction} (${trends.netCashFlow.strength})

Proporciona un análisis JSON con:
{
  "insights": [
    {
      "type": "positive|negative|warning|neutral",
      "category": "cashFlow|revenue|expenses|trend",
      "title": "Título del insight",
      "description": "Descripción detallada",
      "impact": "high|medium|low",
      "recommendation": "Recomendación accionable"
    }
  ],
  "riskFactors": [
    {
      "factor": "Nombre del riesgo",
      "probability": "high|medium|low",
      "impact": "high|medium|low",
      "mitigation": "Estrategia de mitigación"
    }
  ],
  "opportunities": [
    {
      "opportunity": "Descripción de la oportunidad",
      "potentialValue": "Valor estimado",
      "timeframe": "Plazo de ejecución",
      "requirements": "Requisitos para aprovecharla"
    }
  ]
}
`;

      const response = await this.aiService.chat([
        { role: 'system', content: 'Eres un analista financiero experto especializado en análisis predictivo y gestión de flujo de efectivo.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response);

    } catch (error) {
      logger.error('Error generating cash flow insights:', error);
      
      // Return basic insights if AI fails
      return {
        insights: [
          {
            type: trends.netCashFlow.direction === 'increasing' ? 'positive' : 'negative',
            category: 'trend',
            title: `Flujo de efectivo ${trends.netCashFlow.direction === 'increasing' ? 'creciente' : 'decreciente'}`,
            description: `El análisis de tendencias muestra un flujo de efectivo ${trends.netCashFlow.direction === 'increasing' ? 'positivo' : 'negativo'}.`,
            impact: 'high',
            recommendation: trends.netCashFlow.direction === 'increasing' 
              ? 'Considere reinvertir el excedente en áreas de crecimiento.'
              : 'Revise gastos operativos y optimice cuentas por cobrar.'
          }
        ],
        riskFactors: [],
        opportunities: []
      };
    }
  }

  /**
   * Predict revenue for upcoming periods by segment
   */
  async predictRevenue(organizationId, forecastMonths = 3, options = {}) {
    try {
      const historicalMonths = options.historicalMonths || 12;
      const segmentBy = options.segmentBy || 'category'; // category, branch, customer
      
      // Gather historical revenue data
      const Transaction = mongoose.model('Transaction');
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - historicalMonths);

      const revenueData = await Transaction.aggregate([
        {
          $match: {
            organizationId: new mongoose.Types.ObjectId(organizationId),
            type: 'income',
            date: { $gte: startDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              segment: `$${segmentBy}`
            },
            totalRevenue: { $sum: '$amount' },
            transactionCount: { $sum: 1 },
            avgTransactionValue: { $avg: '$amount' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);

      // Group by segment
      const segmentData = {};
      revenueData.forEach(item => {
        const segment = item._id.segment || 'Unknown';
        if (!segmentData[segment]) {
          segmentData[segment] = [];
        }
        segmentData[segment].push({
          year: item._id.year,
          month: item._id.month - 1,
          revenue: item.totalRevenue,
          transactions: item.transactionCount,
          avgValue: item.avgTransactionValue
        });
      });

      // Predict for each segment
      const predictions = {};
      for (const [segment, historical] of Object.entries(segmentData)) {
        const trend = this.calculateTrends([...historical.map(h => ({ netCashFlow: h.revenue }))]);
        const forecasts = [];

        for (let i = 1; i <= forecastMonths; i++) {
          const forecastDate = new Date();
          forecastDate.setMonth(forecastDate.getMonth() + i);
          
          const predictedRevenue = trend.netCashFlow.base + (trend.netCashFlow.slope * (historical.length + i));
          const avgTransactions = historical.reduce((sum, h) => sum + h.transactions, 0) / historical.length;
          const avgValue = historical.reduce((sum, h) => sum + h.avgValue, 0) / historical.length;

          forecasts.push({
            year: forecastDate.getFullYear(),
            month: forecastDate.getMonth(),
            predictedRevenue: Math.max(predictedRevenue, 0),
            predictedTransactions: Math.round(avgTransactions),
            predictedAvgValue: avgValue,
            confidence: this.calculateConfidence(historical.map(h => ({ netCashFlow: h.revenue })), i),
            trend: trend.netCashFlow.direction
          });
        }

        predictions[segment] = {
          historical: historical,
          forecasts: forecasts,
          trend: trend.netCashFlow,
          growthRate: this.calculateGrowthRate(historical.map(h => h.revenue))
        };
      }

      return {
        organizationId,
        generatedAt: new Date(),
        segmentBy: segmentBy,
        predictions: predictions,
        totalPredictedRevenue: this.sumTotalPredictions(predictions, forecastMonths),
        insights: await this.generateRevenueInsights(predictions)
      };

    } catch (error) {
      logger.error('Error predicting revenue:', error);
      throw error;
    }
  }

  /**
   * Calculate growth rate from historical data
   */
  calculateGrowthRate(values) {
    if (values.length < 2) return 0;
    
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const periods = values.length - 1;
    
    // CAGR = (Ending Value / Beginning Value)^(1/periods) - 1
    if (firstValue <= 0) return 0;
    const cagr = Math.pow(lastValue / firstValue, 1 / periods) - 1;
    
    return cagr * 100; // Return as percentage
  }

  /**
   * Sum total predicted revenue across all segments
   */
  sumTotalPredictions(predictions, months) {
    const totals = [];
    
    for (let i = 0; i < months; i++) {
      let monthTotal = 0;
      Object.values(predictions).forEach(segment => {
        if (segment.forecasts[i]) {
          monthTotal += segment.forecasts[i].predictedRevenue;
        }
      });
      totals.push(monthTotal);
    }
    
    return totals;
  }

  /**
   * Generate AI insights for revenue predictions
   */
  async generateRevenueInsights(predictions) {
    try {
      const summary = Object.entries(predictions).map(([segment, data]) => ({
        segmento: segment,
        tendencia: data.trend.direction,
        tasaCrecimiento: `${data.growthRate.toFixed(1)}%`,
        confianza: data.trend.strength,
        pronostico3Meses: data.forecasts.slice(0, 3).map(f => f.predictedRevenue)
      }));

      const prompt = `
Analiza las siguientes predicciones de ingresos y proporciona insights estratégicos:

${JSON.stringify(summary, null, 2)}

Proporciona un análisis JSON con:
{
  "keyInsights": ["insight1", "insight2", "insight3"],
  "topGrowthSegments": [{"segment": "nombre", "growthRate": "X%", "reason": "explicación"}],
  "concernSegments": [{"segment": "nombre", "issue": "problema", "recommendation": "acción"}],
  "strategicRecommendations": ["recomendación1", "recomendación2"]
}
`;

      const response = await this.aiService.chat([
        { role: 'system', content: 'Eres un analista de ingresos experto.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response);

    } catch (error) {
      logger.error('Error generating revenue insights:', error);
      return {
        keyInsights: ['Análisis de tendencias completado'],
        topGrowthSegments: [],
        concernSegments: [],
        strategicRecommendations: []
      };
    }
  }

  /**
   * Forecast expenses by category with anomaly detection
   */
  async forecastExpenses(organizationId, forecastMonths = 3, options = {}) {
    try {
      const historicalMonths = options.historicalMonths || 12;
      
      // Gather historical expense data
      const Transaction = mongoose.model('Transaction');
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - historicalMonths);

      const expenseData = await Transaction.aggregate([
        {
          $match: {
            organizationId: new mongoose.Types.ObjectId(organizationId),
            type: 'expense',
            date: { $gte: startDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              category: '$category'
            },
            totalExpense: { $sum: '$amount' },
            transactionCount: { $sum: 1 },
            avgExpense: { $avg: '$amount' },
            maxExpense: { $max: '$amount' },
            minExpense: { $min: '$amount' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);

      // Group by category
      const categoryData = {};
      expenseData.forEach(item => {
        const category = item._id.category || 'Uncategorized';
        if (!categoryData[category]) {
          categoryData[category] = [];
        }
        categoryData[category].push({
          year: item._id.year,
          month: item._id.month - 1,
          expense: item.totalExpense,
          transactions: item.transactionCount,
          avgExpense: item.avgExpense,
          maxExpense: item.maxExpense,
          minExpense: item.minExpense
        });
      });

      // Classify expenses as fixed vs variable
      const classifications = {};
      for (const [category, historical] of Object.entries(categoryData)) {
        const variance = this.calculateVariance(historical.map(h => h.expense));
        const mean = historical.reduce((sum, h) => sum + h.expense, 0) / historical.length;
        const coefficientOfVariation = variance / mean;
        
        classifications[category] = coefficientOfVariation < 0.2 ? 'fixed' : 'variable';
      }

      // Forecast each category
      const forecasts = {};
      for (const [category, historical] of Object.entries(categoryData)) {
        const trend = this.calculateTrends([...historical.map(h => ({ netCashFlow: h.expense }))]);
        const isFixed = classifications[category] === 'fixed';
        const categoryForecasts = [];

        for (let i = 1; i <= forecastMonths; i++) {
          const forecastDate = new Date();
          forecastDate.setMonth(forecastDate.getMonth() + i);
          
          let predictedExpense;
          if (isFixed) {
            // Fixed expenses: use average with minimal trend
            const avgExpense = historical.reduce((sum, h) => sum + h.expense, 0) / historical.length;
            predictedExpense = avgExpense + (trend.netCashFlow.slope * i * 0.1);
          } else {
            // Variable expenses: use full trend
            predictedExpense = trend.netCashFlow.base + (trend.netCashFlow.slope * (historical.length + i));
          }

          categoryForecasts.push({
            year: forecastDate.getFullYear(),
            month: forecastDate.getMonth(),
            predictedExpense: Math.max(predictedExpense, 0),
            classification: classifications[category],
            confidence: this.calculateConfidence(historical.map(h => ({ netCashFlow: h.expense })), i),
            anomalyRisk: this.detectAnomalyRisk(historical, predictedExpense)
          });
        }

        forecasts[category] = {
          classification: classifications[category],
          historical: historical,
          forecasts: categoryForecasts,
          trend: trend.netCashFlow,
          volatility: this.calculateVariance(historical.map(h => h.expense))
        };
      }

      return {
        organizationId,
        generatedAt: new Date(),
        forecasts: forecasts,
        totalPredictedExpenses: this.sumTotalExpenseForecasts(forecasts, forecastMonths),
        classifications: classifications,
        insights: await this.generateExpenseInsights(forecasts)
      };

    } catch (error) {
      logger.error('Error forecasting expenses:', error);
      throw error;
    }
  }

  /**
   * Detect anomaly risk in expense forecast
   */
  detectAnomalyRisk(historical, predictedValue) {
    const values = historical.map(h => h.expense);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(this.calculateVariance(values));
    
    const zScore = Math.abs((predictedValue - mean) / stdDev);
    
    if (zScore > 3) return 'high';
    if (zScore > 2) return 'medium';
    return 'low';
  }

  /**
   * Sum total predicted expenses
   */
  sumTotalExpenseForecasts(forecasts, months) {
    const totals = [];
    
    for (let i = 0; i < months; i++) {
      let monthTotal = 0;
      Object.values(forecasts).forEach(category => {
        if (category.forecasts[i]) {
          monthTotal += category.forecasts[i].predictedExpense;
        }
      });
      totals.push(monthTotal);
    }
    
    return totals;
  }

  /**
   * Generate AI insights for expense forecasts
   */
  async generateExpenseInsights(forecasts) {
    try {
      const summary = Object.entries(forecasts).map(([category, data]) => ({
        categoria: category,
        tipo: data.classification,
        tendencia: data.trend.direction,
        volatilidad: data.volatility > 1000000 ? 'alta' : data.volatility > 100000 ? 'media' : 'baja',
        pronostico3Meses: data.forecasts.slice(0, 3).map(f => f.predictedExpense)
      }));

      const prompt = `
Analiza las siguientes predicciones de gastos y proporciona recomendaciones de optimización:

${JSON.stringify(summary, null, 2)}

Proporciona un análisis JSON con:
{
  "costOptimizationOpportunities": [
    {"category": "categoría", "potentialSaving": "monto", "action": "acción"}
  ],
  "highRiskCategories": [
    {"category": "categoría", "risk": "descripción", "mitigation": "estrategia"}
  ],
  "recommendations": ["recomendación1", "recomendación2"]
}
`;

      const response = await this.aiService.chat([
        { role: 'system', content: 'Eres un experto en optimización de costos y control de gastos.' },
        { role: 'user', content: prompt }
      ], {
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response);

    } catch (error) {
      logger.error('Error generating expense insights:', error);
      return {
        costOptimizationOpportunities: [],
        highRiskCategories: [],
        recommendations: []
      };
    }
  }

  /**
   * Predict budget variance and generate early warnings
   */
  async predictBudgetVariance(organizationId, year, month, options = {}) {
    try {
      // Get budget for the period
      const Budget = mongoose.model('Budget');
      const budget = await Budget.findOne({
        organizationId,
        year,
        month,
        status: 'approved'
      });

      if (!budget) {
        throw new Error('No approved budget found for the specified period');
      }

      // Get actual data up to current date
      const Transaction = mongoose.model('Transaction');
      const startOfMonth = new Date(year, month, 1);
      const today = new Date();
      const endDate = today < new Date(year, month + 1, 0) ? today : new Date(year, month + 1, 0);

      const actuals = await Transaction.aggregate([
        {
          $match: {
            organizationId: new mongoose.Types.ObjectId(organizationId),
            date: { $gte: startOfMonth, $lte: endDate },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: {
              type: '$type',
              category: '$category'
            },
            actual: { $sum: '$amount' }
          }
        }
      ]);

      // Calculate current burn rate
      const daysElapsed = Math.floor((endDate - startOfMonth) / (1000 * 60 * 60 * 24));
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const percentElapsed = daysElapsed / daysInMonth;

      // Predict end-of-month variance
      const predictions = {
        revenue: {},
        expenses: {}
      };

      actuals.forEach(item => {
        const type = item._id.type === 'income' ? 'revenue' : 'expenses';
        const category = item._id.category || 'Uncategorized';
        const actual = item.actual;
        const budgeted = budget[type]?.[category] || 0;
        
        // Project to end of month
        const projected = actual / percentElapsed;
        const variance = projected - budgeted;
        const variancePercent = budgeted !== 0 ? (variance / budgeted) * 100 : 0;

        predictions[type][category] = {
          budgeted: budgeted,
          actualToDate: actual,
          projectedEndOfMonth: projected,
          variance: variance,
          variancePercent: variancePercent,
          onTrack: Math.abs(variancePercent) <= 10,
          severity: this.getVarianceSeverity(variancePercent, type)
        };
      });

      // Generate early warnings
      const warnings = [];
      Object.entries(predictions.expenses).forEach(([category, data]) => {
        if (data.variancePercent > 20) {
          warnings.push({
            type: 'overbudget',
            category: category,
            severity: data.severity,
            message: `${category} proyecta exceder presupuesto en ${data.variancePercent.toFixed(1)}%`,
            projected: data.projectedEndOfMonth,
            budgeted: data.budgeted,
            variance: data.variance,
            recommendation: 'Revisar gastos y considerar medidas de control inmediatas'
          });
        }
      });

      Object.entries(predictions.revenue).forEach(([category, data]) => {
        if (data.variancePercent < -10) {
          warnings.push({
            type: 'revenue_shortfall',
            category: category,
            severity: data.severity,
            message: `${category} proyecta ${Math.abs(data.variancePercent).toFixed(1)}% por debajo del presupuesto`,
            projected: data.projectedEndOfMonth,
            budgeted: data.budgeted,
            variance: data.variance,
            recommendation: 'Analizar causas e implementar estrategias para incrementar ingresos'
          });
        }
      });

      return {
        organizationId,
        period: { year, month },
        budgetId: budget._id,
        asOfDate: today,
        percentElapsed: Math.round(percentElapsed * 100),
        predictions: predictions,
        warnings: warnings,
        summary: {
          totalBudgetedRevenue: this.sumBudget(budget.revenue),
          projectedRevenue: this.sumProjected(predictions.revenue),
          totalBudgetedExpenses: this.sumBudget(budget.expenses),
          projectedExpenses: this.sumProjected(predictions.expenses),
          projectedVariance: this.sumProjected(predictions.revenue) - this.sumProjected(predictions.expenses)
        }
      };

    } catch (error) {
      logger.error('Error predicting budget variance:', error);
      throw error;
    }
  }

  /**
   * Get severity level for variance
   */
  getVarianceSeverity(variancePercent, type) {
    const absVariance = Math.abs(variancePercent);
    
    if (type === 'expenses') {
      if (absVariance > 30) return 'critical';
      if (absVariance > 20) return 'high';
      if (absVariance > 10) return 'medium';
      return 'low';
    } else {
      // Revenue shortfalls are more concerning
      if (variancePercent < -20) return 'critical';
      if (variancePercent < -10) return 'high';
      if (variancePercent < -5) return 'medium';
      return 'low';
    }
  }

  /**
   * Sum budget values
   */
  sumBudget(budgetObject) {
    return Object.values(budgetObject || {}).reduce((sum, val) => sum + val, 0);
  }

  /**
   * Sum projected values
   */
  sumProjected(predictions) {
    return Object.values(predictions).reduce((sum, item) => sum + item.projectedEndOfMonth, 0);
  }
}

module.exports = PredictiveAnalytics;
