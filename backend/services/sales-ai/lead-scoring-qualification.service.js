/**
 * Lead Scoring & Qualification System
 * 
 * Sistema inteligente que:
 * - Califica leads automáticamente (0-100 puntos)
 * - Clasifica leads por calidad (Hot, Warm, Cold)
 * - Identifica leads listos para ventas (SQL - Sales Qualified Lead)
 * - Prioriza leads para seguimiento
 * - Enriquece datos de leads automáticamente
 * - Detecta agencias de viajes y tour operadores
 */

const EventEmitter = require('events');

class LeadScoringQualification extends EventEmitter {
  constructor() {
    super();
    
    this.config = {
      // Scoring weights (total should be 100)
      scoringWeights: {
        demographic: 20,    // Fit con target audience
        behavioral: 30,     // Engagement y comportamiento
        firmographic: 25,   // Company data (for B2B)
        explicit: 25        // Info directa del lead (budget, timeline, etc.)
      },
      
      // Demographic scoring (B2C)
      demographicScoring: {
        location: {
          'target-cities': 10, // CDMX, GDL, MTY
          'other-mexico': 7,
          'us-canada': 8,
          'other': 3
        },
        age: {
          '25-35': 10,
          '35-45': 10,
          '45-55': 8,
          '18-25': 5,
          '55+': 7
        },
        income: {
          'high': 10,
          'medium-high': 8,
          'medium': 5,
          'low': 2
        }
      },
      
      // Behavioral scoring
      behavioralScoring: {
        emailEngagement: {
          'opened': 3,
          'clicked': 5,
          'replied': 10
        },
        websiteActivity: {
          'visited': 2,
          'multiple-pages': 5,
          'pricing-page': 8,
          'booking-page': 15
        },
        whatsappEngagement: {
          'replied': 10,
          'asked-questions': 12,
          'requested-quote': 20
        },
        socialMedia: {
          'followed': 2,
          'liked': 3,
          'commented': 5,
          'shared': 7
        },
        contentDownloads: {
          'brochure': 5,
          'guide': 7,
          'case-study': 10
        }
      },
      
      // Firmographic scoring (B2B)
      firmographicScoring: {
        companyType: {
          'travel-agency': 25,
          'tour-operator': 25,
          'dmc': 20,
          'hotel': 15,
          'corporate': 10,
          'other': 5
        },
        companySize: {
          'enterprise': 15,   // 500+
          'large': 12,        // 100-500
          'medium': 10,       // 20-100
          'small': 7,         // 5-20
          'micro': 4          // 1-5
        },
        revenue: {
          'high': 15,         // $10M+
          'medium-high': 12,  // $5M-$10M
          'medium': 8,        // $1M-$5M
          'low': 4            // <$1M
        }
      },
      
      // Explicit scoring (BANT)
      explicitScoring: {
        budget: {
          'high': 25,         // $5K+
          'medium': 20,       // $2K-$5K
          'low': 10,          // $1K-$2K
          'very-low': 3       // <$1K
        },
        authority: {
          'decision-maker': 25,
          'influencer': 15,
          'researcher': 5
        },
        need: {
          'urgent': 25,
          'short-term': 20,   // Within 3 months
          'medium-term': 12,  // 3-6 months
          'long-term': 5      // 6+ months
        },
        timeline: {
          'immediate': 25,    // This week
          'very-soon': 20,    // This month
          'soon': 15,         // 1-3 months
          'future': 8         // 3+ months
        }
      },
      
      // Lead classification thresholds
      classification: {
        hot: 70,      // 70-100: Ready to buy
        warm: 40,     // 40-69: Needs nurturing
        cold: 0       // 0-39: Low priority
      },
      
      // SQL (Sales Qualified Lead) criteria
      sqlCriteria: {
        minScore: 60,
        mustHave: ['budget', 'timeline', 'authority'],
        minEngagement: 3 // At least 3 interactions
      },
      
      // Data enrichment sources
      enrichmentSources: {
        // APIs para enriquecer datos
        clearbit: { enabled: false, apiKey: process.env.CLEARBIT_API_KEY },
        hunter: { enabled: false, apiKey: process.env.HUNTER_API_KEY },
        linkedin: { enabled: false, apiKey: process.env.LINKEDIN_API_KEY },
        google: { enabled: true }, // Google Search for company info
        manual: { enabled: true }  // Manual research
      }
    };
    
    // Lead database
    this.leads = new Map();
    
    // Scoring history
    this.scoringHistory = new Map();
  }

  /**
   * Score a lead completely
   */
  scoreLead(leadData) {
    const scores = {
      demographic: this.scoreDemographic(leadData),
      behavioral: this.scoreBehavioral(leadData),
      firmographic: this.scoreFirmographic(leadData),
      explicit: this.scoreExplicit(leadData)
    };

    // Calculate weighted total
    const totalScore = Math.round(
      (scores.demographic * this.config.scoringWeights.demographic / 100) +
      (scores.behavioral * this.config.scoringWeights.behavioral / 100) +
      (scores.firmographic * this.config.scoringWeights.firmographic / 100) +
      (scores.explicit * this.config.scoringWeights.explicit / 100)
    );

    // Classify lead
    const classification = this.classifyLead(totalScore);

    // Check if SQL
    const isSQL = this.isSQL(leadData, totalScore);

    const result = {
      leadId: leadData.id,
      totalScore,
      classification,
      isSQL,
      breakdown: scores,
      timestamp: new Date(),
      recommendations: this.getRecommendations(totalScore, classification, leadData)
    };

    // Save score
    this.leads.set(leadData.id, { ...leadData, score: result });
    
    // Add to history
    if (!this.scoringHistory.has(leadData.id)) {
      this.scoringHistory.set(leadData.id, []);
    }
    this.scoringHistory.get(leadData.id).push(result);

    // Emit events
    this.emit('leadScored', result);
    
    if (isSQL && (!leadData.score || !leadData.score.isSQL)) {
      this.emit('sqlQualified', result);
    }

    if (classification === 'hot' && (!leadData.score || leadData.score.classification !== 'hot')) {
      this.emit('hotLead', result);
    }

    return result;
  }

  /**
   * Score demographic factors (B2C)
   */
  scoreDemographic(lead) {
    let score = 0;
    const max = 20;

    if (lead.location) {
      const targetCities = ['Ciudad de México', 'Guadalajara', 'Monterrey', 'CDMX', 'GDL', 'MTY'];
      if (targetCities.some(city => lead.location.includes(city))) {
        score += this.config.demographicScoring.location['target-cities'];
      } else if (lead.country === 'Mexico') {
        score += this.config.demographicScoring.location['other-mexico'];
      } else if (['USA', 'Canada'].includes(lead.country)) {
        score += this.config.demographicScoring.location['us-canada'];
      } else {
        score += this.config.demographicScoring.location['other'];
      }
    }

    if (lead.age) {
      const ageGroup = this.getAgeGroup(lead.age);
      score += this.config.demographicScoring.age[ageGroup] || 0;
    }

    if (lead.income) {
      score += this.config.demographicScoring.income[lead.income] || 0;
    }

    return Math.min(score, max);
  }

  /**
   * Score behavioral factors
   */
  scoreBehavioral(lead) {
    let score = 0;
    const max = 30;

    // Email engagement
    if (lead.emailActivity) {
      if (lead.emailActivity.opened) score += this.config.behavioralScoring.emailEngagement.opened;
      if (lead.emailActivity.clicked) score += this.config.behavioralScoring.emailEngagement.clicked;
      if (lead.emailActivity.replied) score += this.config.behavioralScoring.emailEngagement.replied;
    }

    // Website activity
    if (lead.websiteActivity) {
      if (lead.websiteActivity.visited) score += this.config.behavioralScoring.websiteActivity.visited;
      if (lead.websiteActivity.pagesViewed > 3) score += this.config.behavioralScoring.websiteActivity['multiple-pages'];
      if (lead.websiteActivity.visitedPricing) score += this.config.behavioralScoring.websiteActivity['pricing-page'];
      if (lead.websiteActivity.visitedBooking) score += this.config.behavioralScoring.websiteActivity['booking-page'];
    }

    // WhatsApp engagement
    if (lead.whatsappActivity) {
      if (lead.whatsappActivity.replied) score += this.config.behavioralScoring.whatsappEngagement.replied;
      if (lead.whatsappActivity.askedQuestions) score += this.config.behavioralScoring.whatsappEngagement['asked-questions'];
      if (lead.whatsappActivity.requestedQuote) score += this.config.behavioralScoring.whatsappEngagement['requested-quote'];
    }

    // Social media
    if (lead.socialActivity) {
      if (lead.socialActivity.followed) score += this.config.behavioralScoring.socialMedia.followed;
      if (lead.socialActivity.liked) score += this.config.behavioralScoring.socialMedia.liked;
      if (lead.socialActivity.commented) score += this.config.behavioralScoring.socialMedia.commented;
      if (lead.socialActivity.shared) score += this.config.behavioralScoring.socialMedia.shared;
    }

    // Content downloads
    if (lead.downloads) {
      lead.downloads.forEach(download => {
        score += this.config.behavioralScoring.contentDownloads[download.type] || 0;
      });
    }

    return Math.min(score, max);
  }

  /**
   * Score firmographic factors (B2B)
   */
  scoreFirmographic(lead) {
    let score = 0;
    const max = 25;

    if (!lead.companyType) return 0; // Not B2B

    // Company type
    score += this.config.firmographicScoring.companyType[lead.companyType] || 
             this.config.firmographicScoring.companyType.other;

    // Company size
    if (lead.companySize) {
      const sizeCategory = this.getCompanySizeCategory(lead.companySize);
      score += this.config.firmographicScoring.companySize[sizeCategory] || 0;
    }

    // Revenue
    if (lead.companyRevenue) {
      const revenueCategory = this.getRevenueCategory(lead.companyRevenue);
      score += this.config.firmographicScoring.revenue[revenueCategory] || 0;
    }

    return Math.min(score, max);
  }

  /**
   * Score explicit factors (BANT)
   */
  scoreExplicit(lead) {
    let score = 0;
    const max = 25;

    // Budget
    if (lead.budget) {
      const budgetCategory = this.getBudgetCategory(lead.budget);
      score += this.config.explicitScoring.budget[budgetCategory] || 0;
    }

    // Authority
    if (lead.authority) {
      score += this.config.explicitScoring.authority[lead.authority] || 0;
    }

    // Need/Timeline
    if (lead.timeline) {
      score += this.config.explicitScoring.timeline[lead.timeline] || 0;
    }

    if (lead.urgency) {
      score += this.config.explicitScoring.need[lead.urgency] || 0;
    }

    return Math.min(score, max);
  }

  /**
   * Classify lead based on score
   */
  classifyLead(score) {
    if (score >= this.config.classification.hot) return 'hot';
    if (score >= this.config.classification.warm) return 'warm';
    return 'cold';
  }

  /**
   * Check if lead qualifies as SQL
   */
  isSQL(lead, score) {
    if (score < this.config.sqlCriteria.minScore) return false;

    // Check must-have criteria
    const hasMustHave = this.config.sqlCriteria.mustHave.every(field => 
      lead[field] !== null && lead[field] !== undefined
    );

    if (!hasMustHave) return false;

    // Check minimum engagement
    const interactions = this.countInteractions(lead);
    if (interactions < this.config.sqlCriteria.minEngagement) return false;

    return true;
  }

  /**
   * Count total interactions
   */
  countInteractions(lead) {
    let count = 0;
    
    if (lead.emailActivity) {
      if (lead.emailActivity.opened) count++;
      if (lead.emailActivity.clicked) count++;
      if (lead.emailActivity.replied) count++;
    }
    
    if (lead.whatsappActivity) {
      if (lead.whatsappActivity.replied) count++;
      if (lead.whatsappActivity.askedQuestions) count++;
    }
    
    if (lead.websiteActivity && lead.websiteActivity.visited) count++;
    
    if (lead.downloads) count += lead.downloads.length;
    
    return count;
  }

  /**
   * Get recommendations for lead
   */
  getRecommendations(score, classification, lead) {
    const recommendations = [];

    if (classification === 'hot') {
      recommendations.push({
        action: 'immediate-follow-up',
        priority: 'high',
        message: 'Lead caliente - Contactar inmediatamente por WhatsApp o llamada'
      });
      
      if (lead.companyType) {
        recommendations.push({
          action: 'schedule-demo',
          priority: 'high',
          message: 'Agendar demo o presentación de servicios B2B'
        });
      } else {
        recommendations.push({
          action: 'send-personalized-offer',
          priority: 'high',
          message: 'Enviar oferta personalizada con descuento de cierre'
        });
      }
    }

    if (classification === 'warm') {
      recommendations.push({
        action: 'nurture-campaign',
        priority: 'medium',
        message: 'Incluir en campaña de nurturing multi-canal'
      });
      
      recommendations.push({
        action: 'valuable-content',
        priority: 'medium',
        message: 'Enviar contenido de valor (guías, testimonios, casos de éxito)'
      });
    }

    if (classification === 'cold') {
      recommendations.push({
        action: 'long-term-nurture',
        priority: 'low',
        message: 'Campaña de nurturing a largo plazo (mensual)'
      });
    }

    // Missing data recommendations
    if (!lead.budget) {
      recommendations.push({
        action: 'qualify-budget',
        priority: 'medium',
        message: 'Preguntar sobre presupuesto en próxima interacción'
      });
    }

    if (!lead.timeline) {
      recommendations.push({
        action: 'qualify-timeline',
        priority: 'medium',
        message: 'Preguntar sobre fechas de viaje o implementación'
      });
    }

    return recommendations;
  }

  /**
   * Enrich lead data automatically
   */
  async enrichLead(lead) {
    const enrichedData = { ...lead };

    try {
      // Try to identify if it's a travel agency/tour operator
      if (lead.email || lead.companyName) {
        const companyInfo = await this.identifyCompanyType(lead);
        if (companyInfo) {
          enrichedData.companyType = companyInfo.type;
          enrichedData.companySize = companyInfo.size;
          enrichedData.companyRevenue = companyInfo.revenue;
          enrichedData.website = companyInfo.website;
        }
      }

      // Try to get location from email domain
      if (lead.email && !lead.location) {
        const domain = lead.email.split('@')[1];
        const location = await this.getLocationFromDomain(domain);
        if (location) {
          enrichedData.location = location.city;
          enrichedData.country = location.country;
        }
      }

      // Emit enrichment event
      this.emit('leadEnriched', {
        leadId: lead.id,
        originalData: lead,
        enrichedData: enrichedData
      });

      return enrichedData;

    } catch (error) {
      console.error('Error enriching lead:', error);
      return lead;
    }
  }

  /**
   * Identify if company is travel agency/tour operator
   */
  async identifyCompanyType(lead) {
    // Keywords that indicate travel agency
    const travelKeywords = [
      'travel', 'viajes', 'tours', 'turismo', 'tourism', 
      'agency', 'agencia', 'operator', 'operador', 'dmc',
      'vacation', 'vacaciones', 'holiday', 'trip'
    ];

    const companyName = (lead.companyName || '').toLowerCase();
    const email = (lead.email || '').toLowerCase();
    const website = (lead.website || '').toLowerCase();

    const searchText = `${companyName} ${email} ${website}`;

    const isTravelRelated = travelKeywords.some(keyword => 
      searchText.includes(keyword)
    );

    if (isTravelRelated) {
      return {
        type: this.determineTravelCompanyType(searchText),
        size: 'medium', // Default, could be enhanced
        revenue: null,
        website: lead.website
      };
    }

    return null;
  }

  /**
   * Determine specific type of travel company
   */
  determineTravelCompanyType(text) {
    if (text.includes('dmc')) return 'dmc';
    if (text.includes('operator') || text.includes('operador')) return 'tour-operator';
    if (text.includes('agency') || text.includes('agencia')) return 'travel-agency';
    if (text.includes('hotel') || text.includes('resort')) return 'hotel';
    return 'travel-agency'; // Default
  }

  /**
   * Get location from email domain
   */
  async getLocationFromDomain(domain) {
    // This could be enhanced with actual geolocation API
    // For now, simple country detection from TLD
    
    const tldCountry = {
      'mx': { country: 'Mexico', city: null },
      'us': { country: 'USA', city: null },
      'ca': { country: 'Canada', city: null },
      'es': { country: 'Spain', city: null },
      'ar': { country: 'Argentina', city: null },
      'co': { country: 'Colombia', city: null }
    };

    const tld = domain.split('.').pop();
    return tldCountry[tld] || null;
  }

  /**
   * Helper: Get age group
   */
  getAgeGroup(age) {
    if (age >= 18 && age < 25) return '18-25';
    if (age >= 25 && age < 35) return '25-35';
    if (age >= 35 && age < 45) return '35-45';
    if (age >= 45 && age < 55) return '45-55';
    if (age >= 55) return '55+';
    return null;
  }

  /**
   * Helper: Get company size category
   */
  getCompanySizeCategory(size) {
    if (size >= 500) return 'enterprise';
    if (size >= 100) return 'large';
    if (size >= 20) return 'medium';
    if (size >= 5) return 'small';
    return 'micro';
  }

  /**
   * Helper: Get revenue category
   */
  getRevenueCategory(revenue) {
    if (revenue >= 10000000) return 'high';
    if (revenue >= 5000000) return 'medium-high';
    if (revenue >= 1000000) return 'medium';
    return 'low';
  }

  /**
   * Helper: Get budget category
   */
  getBudgetCategory(budget) {
    if (budget >= 5000) return 'high';
    if (budget >= 2000) return 'medium';
    if (budget >= 1000) return 'low';
    return 'very-low';
  }

  /**
   * Get all hot leads
   */
  getHotLeads() {
    return Array.from(this.leads.values())
      .filter(lead => lead.score && lead.score.classification === 'hot')
      .sort((a, b) => b.score.totalScore - a.score.totalScore);
  }

  /**
   * Get all SQLs
   */
  getSQLs() {
    return Array.from(this.leads.values())
      .filter(lead => lead.score && lead.score.isSQL)
      .sort((a, b) => b.score.totalScore - a.score.totalScore);
  }

  /**
   * Get scoring statistics
   */
  getStats() {
    const leads = Array.from(this.leads.values());
    
    return {
      total: leads.length,
      hot: leads.filter(l => l.score?.classification === 'hot').length,
      warm: leads.filter(l => l.score?.classification === 'warm').length,
      cold: leads.filter(l => l.score?.classification === 'cold').length,
      sql: leads.filter(l => l.score?.isSQL).length,
      avgScore: leads.length > 0 
        ? (leads.reduce((sum, l) => sum + (l.score?.totalScore || 0), 0) / leads.length).toFixed(1)
        : 0,
      b2b: leads.filter(l => l.companyType).length,
      b2c: leads.filter(l => !l.companyType).length
    };
  }
}

// Export singleton instance
module.exports = new LeadScoringQualification();
