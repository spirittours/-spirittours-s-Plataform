/**
 * AI Lead Scoring Service - SPRINT 3.2
 * 
 * Automatic lead quality assessment using AI with comprehensive scoring algorithm.
 * Scores leads from 0-100 based on multiple factors and AI analysis.
 */

const Contact = require('../../models/Contact');
const Lead = require('../../models/Lead');
const Deal = require('../../models/Deal');
const Activity = require('../../models/Activity');
const MultiModelAI = require('../../ai/MultiModelAI');
const logger = require('../../utils/logger');

class AILeadScoringService {
  constructor() {
    this.aiManager = new MultiModelAI();
    
    // Scoring weights (total = 100)
    this.weights = {
      demographic: 15,      // Company size, industry, location
      engagement: 25,       // Email opens, clicks, responses
      behavioral: 20,       // Website visits, content downloads
      firmographic: 15,     // Revenue, employees, funding
      intent: 25,          // AI-detected intent signals
    };

    // Industry scores (0-10 scale)
    this.industryScores = {
      'travel': 10,
      'tourism': 10,
      'hospitality': 9,
      'events': 8,
      'corporate': 8,
      'education': 7,
      'nonprofit': 5,
      'default': 6,
    };

    // Company size scores (0-10 scale)
    this.companySizeScores = {
      '1-10': 4,
      '11-50': 6,
      '51-200': 8,
      '201-1000': 9,
      '1000+': 10,
      'default': 5,
    };
  }

  /**
   * Score a lead comprehensively
   */
  async scoreLead(leadId, workspaceId) {
    try {
      logger.info(`Scoring lead: ${leadId}`);

      // Get lead data
      const lead = await Lead.findById(leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      // Get related activities
      const activities = await Activity.find({
        entityType: 'lead',
        entityId: leadId,
      }).sort({ createdAt: -1 }).limit(50);

      // Calculate component scores
      const demographicScore = await this.calculateDemographicScore(lead);
      const engagementScore = await this.calculateEngagementScore(lead, activities);
      const behavioralScore = await this.calculateBehavioralScore(lead, activities);
      const firmographicScore = await this.calculateFirmographicScore(lead);
      const intentScore = await this.calculateIntentScore(lead, activities);

      // Calculate weighted total score
      const totalScore = Math.round(
        (demographicScore * this.weights.demographic / 100) +
        (engagementScore * this.weights.engagement / 100) +
        (behavioralScore * this.weights.behavioral / 100) +
        (firmographicScore * this.weights.firmographic / 100) +
        (intentScore * this.weights.intent / 100)
      );

      // Determine quality tier
      const quality = this.getQualityTier(totalScore);

      // Update lead with score
      lead.leadScore = totalScore;
      lead.leadQuality = quality;
      lead.lastScoredAt = new Date();
      await lead.save();

      // Log activity
      await Activity.create({
        entityType: 'lead',
        entityId: leadId,
        type: 'lead_scored',
        description: `Lead scored: ${totalScore}/100 (${quality})`,
        metadata: {
          score: totalScore,
          quality: quality,
          breakdown: {
            demographic: demographicScore,
            engagement: engagementScore,
            behavioral: behavioralScore,
            firmographic: firmographicScore,
            intent: intentScore,
          },
        },
        workspaceId: workspaceId,
      });

      logger.info(`Lead ${leadId} scored: ${totalScore}/100 (${quality})`);

      return {
        leadId,
        score: totalScore,
        quality,
        breakdown: {
          demographic: demographicScore,
          engagement: engagementScore,
          behavioral: behavioralScore,
          firmographic: firmographicScore,
          intent: intentScore,
        },
      };
    } catch (error) {
      logger.error('Error scoring lead:', error);
      throw error;
    }
  }

  /**
   * Calculate demographic score (0-100)
   */
  async calculateDemographicScore(lead) {
    let score = 0;

    // Industry match (0-40 points)
    const industry = (lead.industry || '').toLowerCase();
    const industryScore = this.industryScores[industry] || this.industryScores.default;
    score += industryScore * 4; // Scale to 40 points

    // Location (0-30 points)
    if (lead.country) score += 15;
    if (lead.state) score += 10;
    if (lead.city) score += 5;

    // Company info completeness (0-30 points)
    if (lead.company) score += 10;
    if (lead.title) score += 10;
    if (lead.phone) score += 10;

    return Math.min(100, score);
  }

  /**
   * Calculate engagement score (0-100)
   */
  async calculateEngagementScore(lead, activities) {
    let score = 0;

    // Email engagement (0-50 points)
    const emailOpens = activities.filter(a => a.type === 'email_opened').length;
    const emailClicks = activities.filter(a => a.type === 'email_clicked').length;
    const emailReplies = activities.filter(a => a.type === 'email_replied').length;

    score += Math.min(15, emailOpens * 3);
    score += Math.min(20, emailClicks * 5);
    score += Math.min(15, emailReplies * 15);

    // Response time (0-25 points)
    const responses = activities.filter(a => a.type === 'email_replied');
    if (responses.length > 0) {
      const avgResponseTime = responses.reduce((sum, r) => {
        const created = new Date(r.createdAt);
        const prevActivity = activities.find(a => 
          a.createdAt < r.createdAt && a.type === 'email_sent'
        );
        if (prevActivity) {
          const diff = created - new Date(prevActivity.createdAt);
          return sum + diff / (1000 * 60 * 60); // hours
        }
        return sum;
      }, 0) / responses.length;

      if (avgResponseTime < 2) score += 25;        // < 2 hours
      else if (avgResponseTime < 24) score += 20;  // < 1 day
      else if (avgResponseTime < 72) score += 15;  // < 3 days
      else score += 10;
    }

    // Recency (0-25 points)
    const lastActivity = activities[0];
    if (lastActivity) {
      const daysSinceActivity = (Date.now() - new Date(lastActivity.createdAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity < 1) score += 25;
      else if (daysSinceActivity < 7) score += 20;
      else if (daysSinceActivity < 30) score += 15;
      else score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate behavioral score (0-100)
   */
  async calculateBehavioralScore(lead, activities) {
    let score = 0;

    // Website visits (0-30 points)
    const visits = activities.filter(a => a.type === 'website_visit').length;
    score += Math.min(30, visits * 5);

    // Content engagement (0-30 points)
    const downloads = activities.filter(a => a.type === 'content_download').length;
    const videoViews = activities.filter(a => a.type === 'video_view').length;
    score += Math.min(20, downloads * 10);
    score += Math.min(10, videoViews * 5);

    // Form submissions (0-20 points)
    const forms = activities.filter(a => a.type === 'form_submission').length;
    score += Math.min(20, forms * 10);

    // Event attendance (0-20 points)
    const events = activities.filter(a => a.type === 'event_attended').length;
    score += Math.min(20, events * 20);

    return Math.min(100, score);
  }

  /**
   * Calculate firmographic score (0-100)
   */
  async calculateFirmographicScore(lead) {
    let score = 0;

    // Company size (0-40 points)
    const companySize = lead.companySize || 'default';
    const sizeScore = this.companySizeScores[companySize] || this.companySizeScores.default;
    score += sizeScore * 4;

    // Annual revenue (0-30 points)
    if (lead.annualRevenue) {
      const revenue = lead.annualRevenue;
      if (revenue >= 10000000) score += 30;      // $10M+
      else if (revenue >= 5000000) score += 25;  // $5M+
      else if (revenue >= 1000000) score += 20;  // $1M+
      else if (revenue >= 500000) score += 15;   // $500K+
      else score += 10;
    }

    // Funding/growth indicators (0-30 points)
    if (lead.fundingRound) score += 15;
    if (lead.isGrowing) score += 15;

    return Math.min(100, score);
  }

  /**
   * Calculate AI intent score (0-100)
   */
  async calculateIntentScore(lead, activities) {
    try {
      // Prepare context for AI
      const context = {
        company: lead.company,
        industry: lead.industry,
        recentActivities: activities.slice(0, 10).map(a => ({
          type: a.type,
          description: a.description,
          date: a.createdAt,
        })),
        emailContent: lead.latestEmailContent || '',
        notes: lead.notes || '',
      };

      // AI prompt for intent detection
      const prompt = `Analyze this lead's buying intent based on their profile and activities.
      
Lead Profile:
${JSON.stringify(context, null, 2)}

Provide a buying intent score from 0-100 where:
- 0-20: No intent, just browsing
- 21-40: Low intent, early research
- 41-60: Medium intent, considering options
- 61-80: High intent, actively evaluating
- 81-100: Very high intent, ready to buy

Return ONLY a JSON object with: { "score": <number>, "signals": [<string>], "reasoning": "<string>" }`;

      const response = await this.aiManager.chat(prompt, {
        model: 'gpt-4',
        temperature: 0.3,
      });

      // Parse AI response
      const result = JSON.parse(response.text);
      return Math.min(100, Math.max(0, result.score));

    } catch (error) {
      logger.error('Error calculating AI intent score:', error);
      // Fallback to simple heuristic
      return this.calculateSimpleIntentScore(lead, activities);
    }
  }

  /**
   * Fallback simple intent score
   */
  calculateSimpleIntentScore(lead, activities) {
    let score = 0;

    // High-intent keywords in recent activities
    const highIntentKeywords = ['pricing', 'demo', 'quote', 'buy', 'purchase', 'contract'];
    const recentDescriptions = activities.slice(0, 10)
      .map(a => a.description.toLowerCase())
      .join(' ');

    highIntentKeywords.forEach(keyword => {
      if (recentDescriptions.includes(keyword)) {
        score += 15;
      }
    });

    // Frequency of activities (momentum)
    const last7Days = activities.filter(a => {
      const daysSince = (Date.now() - new Date(a.createdAt)) / (1000 * 60 * 60 * 24);
      return daysSince < 7;
    }).length;

    score += Math.min(40, last7Days * 5);

    // Direct inquiries
    if (lead.requestedDemo) score += 20;
    if (lead.requestedPricing) score += 20;

    return Math.min(100, score);
  }

  /**
   * Get quality tier from score
   */
  getQualityTier(score) {
    if (score >= 80) return 'hot';
    if (score >= 60) return 'warm';
    if (score >= 40) return 'cold';
    return 'unqualified';
  }

  /**
   * Batch score multiple leads
   */
  async batchScoreLeads(leadIds, workspaceId) {
    const results = [];
    for (const leadId of leadIds) {
      try {
        const result = await this.scoreLead(leadId, workspaceId);
        results.push(result);
      } catch (error) {
        logger.error(`Error scoring lead ${leadId}:`, error);
        results.push({
          leadId,
          error: error.message,
        });
      }
    }
    return results;
  }

  /**
   * Auto-score all unscored leads
   */
  async autoScoreUnscored(workspaceId, limit = 100) {
    try {
      const leads = await Lead.find({
        workspaceId,
        $or: [
          { leadScore: { $exists: false } },
          { leadScore: null },
          { lastScoredAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // older than 7 days
        ],
      }).limit(limit);

      logger.info(`Auto-scoring ${leads.length} leads`);

      const results = await this.batchScoreLeads(
        leads.map(l => l._id.toString()),
        workspaceId
      );

      return {
        total: leads.length,
        scored: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length,
        results,
      };
    } catch (error) {
      logger.error('Error auto-scoring leads:', error);
      throw error;
    }
  }
}

module.exports = AILeadScoringService;
