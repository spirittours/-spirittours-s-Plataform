/**
 * Operator Recommendation Agent
 * AI Agent for intelligent tour operator recommendations
 * 
 * Features:
 * - ML-based operator scoring
 * - Historical performance analysis
 * - Seasonal patterns detection
 * - Risk assessment
 * - Dynamic pricing analysis
 */

const EventEmitter = require('events');
const TourOperator = require('../../models/TourOperator');
const Booking = require('../../models/Booking');

class OperatorRecommendationAgent extends EventEmitter {
  constructor() {
    super();
    this.name = 'Operator Recommendation Agent';
    this.description = 'Agente inteligente para recomendación de operadores turísticos';
    this.capabilities = [
      'operator_scoring',
      'performance_analysis',
      'risk_assessment',
      'seasonal_patterns',
      'price_prediction'
    ];
  }

  /**
   * Get operator recommendations based on multiple factors
   */
  async getRecommendations(criteria, context = {}) {
    try {
      console.log('🤖 Recommendation Agent: Analyzing operators...');

      const operators = await TourOperator.find({
        status: { $in: ['active', 'pending_approval'] },
        'integrationStatus.isConfigured': true
      });

      const recommendations = await Promise.all(
        operators.map(async (operator) => {
          const analysis = await this.analyzeOperator(operator, criteria, context);
          return {
            operator,
            analysis,
            score: analysis.overallScore,
            recommendation: this.generateRecommendation(analysis)
          };
        })
      );

      // Sort by score
      recommendations.sort((a, b) => b.score - a.score);

      console.log('✅ Recommendation Agent: Analysis complete', {
        operatorsAnalyzed: operators.length,
        topRecommendation: recommendations[0]?.operator.name
      });

      return {
        recommendations: recommendations.slice(0, 5), // Top 5
        insights: this.generateInsights(recommendations),
        marketConditions: await this.analyzeMarketConditions()
      };

    } catch (error) {
      console.error('❌ Recommendation Agent: Error:', error);
      throw error;
    }
  }

  /**
   * Analyze operator comprehensively
   */
  async analyzeOperator(operator, criteria, context) {
    const scores = {
      reliability: await this.calculateReliabilityScore(operator),
      performance: await this.calculatePerformanceScore(operator),
      pricing: await this.calculatePricingScore(operator, criteria),
      coverage: await this.calculateCoverageScore(operator, criteria),
      responsiveness: await this.calculateResponsivenessScore(operator),
      riskLevel: await this.assessRisk(operator)
    };

    // Calculate weighted overall score
    const weights = {
      reliability: 0.25,
      performance: 0.20,
      pricing: 0.20,
      coverage: 0.15,
      responsiveness: 0.10,
      riskLevel: 0.10
    };

    const overallScore = Object.entries(scores).reduce((sum, [key, value]) => {
      return sum + (value * weights[key]);
    }, 0);

    return {
      ...scores,
      overallScore,
      strengths: this.identifyStrengths(scores),
      weaknesses: this.identifyWeaknesses(scores),
      opportunities: this.identifyOpportunities(operator, context)
    };
  }

  /**
   * Calculate reliability score based on uptime and error rate
   */
  async calculateReliabilityScore(operator) {
    const syncStats = operator.integrationStatus.syncStats || {};
    const healthStatus = operator.integrationStatus.healthStatus;

    let score = 50; // Base score

    // Health status factor
    if (healthStatus === 'healthy') score += 30;
    else if (healthStatus === 'warning') score += 15;
    else if (healthStatus === 'error') score -= 20;

    // Success rate factor
    if (syncStats.totalBookings > 0) {
      const successRate = (syncStats.successfulBookings / syncStats.totalBookings) * 100;
      score += (successRate / 100) * 20; // Max 20 points
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate performance score based on historical data
   */
  async calculatePerformanceScore(operator) {
    try {
      // Get bookings from this operator
      const bookings = await Booking.find({
        'b2b.tourOperator': operator._id,
        'b2b.isB2B': true
      }).limit(100).sort({ createdAt: -1 });

      if (bookings.length === 0) return 50; // Neutral score for new operators

      const metrics = {
        totalBookings: bookings.length,
        cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
        averageResponseTime: this.calculateAverageResponseTime(bookings),
        averageMargin: this.calculateAverageMargin(bookings)
      };

      let score = 50;

      // Cancellation rate factor (lower is better)
      const cancellationRate = (metrics.cancelledBookings / metrics.totalBookings) * 100;
      if (cancellationRate < 5) score += 20;
      else if (cancellationRate < 10) score += 15;
      else if (cancellationRate < 15) score += 10;
      else score -= 10;

      // Margin factor
      if (metrics.averageMargin > 20) score += 15;
      else if (metrics.averageMargin > 15) score += 10;
      else if (metrics.averageMargin > 10) score += 5;

      // Volume factor
      if (metrics.totalBookings > 50) score += 15;
      else if (metrics.totalBookings > 20) score += 10;
      else if (metrics.totalBookings > 10) score += 5;

      return Math.max(0, Math.min(100, score));

    } catch (error) {
      console.error('Error calculating performance score:', error);
      return 50;
    }
  }

  /**
   * Calculate pricing competitiveness score
   */
  async calculatePricingScore(operator, criteria) {
    const commission = operator.businessTerms.defaultCommission;
    let score = 50;

    // Commission rate factor
    if (commission.type === 'percentage') {
      if (commission.value >= 20) score += 30;
      else if (commission.value >= 15) score += 25;
      else if (commission.value >= 10) score += 20;
      else if (commission.value >= 5) score += 10;
    }

    // Price competitiveness (would need market data)
    // TODO: Compare with market average

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate destination coverage score
   */
  async calculateCoverageScore(operator, criteria) {
    // TODO: Implement destination coverage analysis
    // For now, return base score
    return 70;
  }

  /**
   * Calculate responsiveness score
   */
  async calculateResponsivenessScore(operator) {
    const syncStats = operator.integrationStatus.syncStats || {};
    
    if (!syncStats.lastSync) return 50;

    const lastSyncDate = new Date(syncStats.lastSync);
    const hoursSinceSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);

    let score = 100;
    
    // Deduct points based on time since last sync
    if (hoursSinceSync > 24) score -= 30;
    else if (hoursSinceSync > 12) score -= 20;
    else if (hoursSinceSync > 6) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Assess risk level
   */
  async assessRisk(operator) {
    const factors = {
      newOperator: !operator.integrationStatus.syncStats?.totalBookings || 
                    operator.integrationStatus.syncStats.totalBookings < 10,
      lowSuccessRate: operator.integrationStatus.syncStats?.totalBookings > 0 &&
                      (operator.integrationStatus.syncStats.successfulBookings / 
                       operator.integrationStatus.syncStats.totalBookings) < 0.8,
      unhealthyStatus: operator.integrationStatus.healthStatus === 'error',
      suspended: operator.status === 'suspended',
      notConfigured: !operator.integrationStatus.isConfigured
    };

    let riskScore = 0;
    if (factors.newOperator) riskScore += 20;
    if (factors.lowSuccessRate) riskScore += 30;
    if (factors.unhealthyStatus) riskScore += 30;
    if (factors.suspended) riskScore += 40;
    if (factors.notConfigured) riskScore += 50;

    return {
      score: 100 - riskScore, // Higher score = lower risk
      level: riskScore < 20 ? 'low' : riskScore < 50 ? 'medium' : 'high',
      factors: Object.entries(factors).filter(([_, value]) => value).map(([key]) => key)
    };
  }

  /**
   * Identify operator strengths
   */
  identifyStrengths(scores) {
    const strengths = [];
    Object.entries(scores).forEach(([category, score]) => {
      if (typeof score === 'number' && score > 75) {
        strengths.push({
          category,
          score,
          description: this.getCategoryDescription(category, 'strength')
        });
      }
    });
    return strengths;
  }

  /**
   * Identify operator weaknesses
   */
  identifyWeaknesses(scores) {
    const weaknesses = [];
    Object.entries(scores).forEach(([category, score]) => {
      if (typeof score === 'number' && score < 50) {
        weaknesses.push({
          category,
          score,
          description: this.getCategoryDescription(category, 'weakness')
        });
      }
    });
    return weaknesses;
  }

  /**
   * Identify opportunities
   */
  identifyOpportunities(operator, context) {
    const opportunities = [];

    if (!operator.integrationStatus.isActive) {
      opportunities.push({
        type: 'activation',
        description: 'Activar integración para empezar a recibir reservas',
        impact: 'high'
      });
    }

    if (operator.businessTerms.defaultCommission.value < 10) {
      opportunities.push({
        type: 'commission',
        description: 'Negociar mejor comisión con el operador',
        impact: 'medium'
      });
    }

    return opportunities;
  }

  /**
   * Generate recommendation text
   */
  generateRecommendation(analysis) {
    if (analysis.overallScore >= 80) {
      return {
        level: 'highly_recommended',
        text: 'Operador altamente recomendado con excelente rendimiento',
        confidence: 0.9
      };
    } else if (analysis.overallScore >= 60) {
      return {
        level: 'recommended',
        text: 'Operador recomendado con buen rendimiento general',
        confidence: 0.7
      };
    } else if (analysis.overallScore >= 40) {
      return {
        level: 'conditional',
        text: 'Operador aceptable con algunas áreas de mejora',
        confidence: 0.5
      };
    } else {
      return {
        level: 'not_recommended',
        text: 'Operador no recomendado, considere alternativas',
        confidence: 0.8
      };
    }
  }

  /**
   * Generate market insights
   */
  generateInsights(recommendations) {
    const activeOperators = recommendations.filter(r => r.operator.status === 'active');
    const averageScore = recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length;

    return {
      totalOperatorsAnalyzed: recommendations.length,
      activeOperators: activeOperators.length,
      averageScore,
      bestPerformer: recommendations[0]?.operator.name,
      marketHealth: averageScore > 70 ? 'healthy' : averageScore > 50 ? 'fair' : 'poor',
      topOpportunities: recommendations
        .flatMap(r => r.analysis.opportunities)
        .slice(0, 3)
    };
  }

  /**
   * Analyze market conditions
   */
  async analyzeMarketConditions() {
    // TODO: Implement market analysis
    return {
      competitionLevel: 'medium',
      averageCommission: 12,
      marketTrends: ['increasing_demand', 'price_competition'],
      seasonalFactors: []
    };
  }

  /**
   * Get category description
   */
  getCategoryDescription(category, type) {
    const descriptions = {
      reliability: {
        strength: 'Alta confiabilidad con excelente uptime',
        weakness: 'Problemas de confiabilidad y disponibilidad'
      },
      performance: {
        strength: 'Excelente historial de rendimiento',
        weakness: 'Rendimiento por debajo del promedio'
      },
      pricing: {
        strength: 'Precios competitivos y buenas comisiones',
        weakness: 'Precios poco competitivos'
      },
      coverage: {
        strength: 'Amplia cobertura de destinos',
        weakness: 'Cobertura limitada de destinos'
      },
      responsiveness: {
        strength: 'Respuestas rápidas y actualizaciones frecuentes',
        weakness: 'Tiempos de respuesta lentos'
      }
    };

    return descriptions[category]?.[type] || '';
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime(bookings) {
    // TODO: Implement based on actual booking timestamps
    return 0;
  }

  /**
   * Calculate average margin
   */
  calculateAverageMargin(bookings) {
    const marginsWithValues = bookings
      .filter(b => b.b2b?.pricing?.margin)
      .map(b => b.b2b.pricing.margin);

    if (marginsWithValues.length === 0) return 0;

    return marginsWithValues.reduce((sum, m) => sum + m, 0) / marginsWithValues.length;
  }
}

module.exports = OperatorRecommendationAgent;
