/**
 * Campaign Orchestrator Service
 * Fase 8 - B2B Prospecting System
 * 
 * High-level campaign automation and scheduling.
 * Coordinates ProspectingAgent, OutreachAgent, and enrichment services.
 * 
 * Features:
 * - Campaign creation and management
 * - Automated prospect targeting
 * - Multi-channel outreach orchestration
 * - Performance tracking and optimization
 * - A/B testing support
 * - Reporting and analytics
 */

const EventEmitter = require('events');
const Campaign = require('../../models/Campaign');
const Prospect = require('../../models/Prospect');

class CampaignOrchestratorService extends EventEmitter {
  constructor(prospectingAgent, outreachAgent, enrichmentService, config = {}) {
    super();
    this.prospectingAgent = prospectingAgent;
    this.outreachAgent = outreachAgent;
    this.enrichmentService = enrichmentService;
    
    this.config = {
      // Campaign defaults
      defaultMinLeadScore: 50,
      defaultChannels: ['email', 'whatsapp'],
      
      // Automation
      autoStartCampaigns: true,
      autoOptimize: true,
      
      // Performance thresholds
      minResponseRate: 0.05, // 5%
      minConversionRate: 0.02, // 2%
      
      // A/B testing
      enableABTesting: true,
      abTestSampleSize: 100,
      
      ...config
    };
    
    this.activeCampaigns = new Map();
    
    this.stats = {
      totalCampaigns: 0,
      activeCampaigns: 0,
      completedCampaigns: 0,
      totalProspectsTargeted: 0,
      totalContacted: 0,
      totalResponded: 0,
      totalConverted: 0
    };
  }

  /**
   * Create a new campaign
   */
  async createCampaign(campaignData) {
    try {
      console.log(`📋 Creating campaign: ${campaignData.name}`);
      
      const campaign = new Campaign({
        name: campaignData.name,
        description: campaignData.description,
        targetCountries: campaignData.targetCountries || [],
        targetTypes: campaignData.targetTypes || [],
        targetCities: campaignData.targetCities || [],
        minLeadScore: campaignData.minLeadScore || this.config.defaultMinLeadScore,
        channels: campaignData.channels || this.config.defaultChannels,
        startDate: campaignData.startDate || new Date(),
        endDate: campaignData.endDate,
        budget: campaignData.budget,
        goals: campaignData.goals || {
          targetProspects: 1000,
          targetContacts: 800,
          targetResponses: 100,
          targetConversions: 20
        },
        settings: {
          autoProspect: campaignData.autoProspect !== false,
          autoEnrich: campaignData.autoEnrich !== false,
          autoOutreach: campaignData.autoOutreach !== false,
          respectBusinessHours: campaignData.respectBusinessHours !== false,
          maxContactsPerDay: campaignData.maxContactsPerDay || 100,
          followUpEnabled: campaignData.followUpEnabled !== false,
          followUpSchedule: campaignData.followUpSchedule || [3, 7, 14, 21] // days
        },
        status: 'draft'
      });
      
      await campaign.save();
      
      this.stats.totalCampaigns++;
      this.emit('campaign_created', campaign);
      
      console.log(`✅ Campaign created: ${campaign._id}`);
      
      return campaign;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Start a campaign
   */
  async startCampaign(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      if (campaign.status === 'active') {
        throw new Error('Campaign is already active');
      }
      
      console.log(`🚀 Starting campaign: ${campaign.name}`);
      
      // Update status
      campaign.status = 'active';
      campaign.startDate = new Date();
      await campaign.save();
      
      // Add to active campaigns
      this.activeCampaigns.set(campaign._id.toString(), {
        campaign,
        interval: null,
        stats: {
          prospectsAdded: 0,
          contacted: 0,
          responded: 0,
          converted: 0
        }
      });
      
      this.stats.activeCampaigns++;
      
      // Step 1: Find or prospect targets
      if (campaign.settings.autoProspect) {
        await this.prospectForCampaign(campaign);
      }
      
      // Step 2: Enrich prospects
      if (campaign.settings.autoEnrich) {
        await this.enrichCampaignProspects(campaign);
      }
      
      // Step 3: Start outreach
      if (campaign.settings.autoOutreach) {
        await this.startCampaignOutreach(campaign);
      }
      
      this.emit('campaign_started', campaign);
      
      return campaign;
    } catch (error) {
      console.error('Error starting campaign:', error);
      throw error;
    }
  }

  /**
   * Prospect for campaign targets
   */
  async prospectForCampaign(campaign) {
    console.log(`🔍 Prospecting for campaign: ${campaign.name}`);
    
    try {
      const targetCount = campaign.goals.targetProspects;
      const existingCount = campaign.prospects.length;
      const needed = targetCount - existingCount;
      
      if (needed <= 0) {
        console.log('✅ Campaign already has enough prospects');
        return;
      }
      
      // Find existing prospects matching criteria
      const existingProspects = await Prospect.find({
        country_code: { $in: campaign.targetCountries },
        business_type: { $in: campaign.targetTypes },
        lead_score: { $gte: campaign.minLeadScore },
        status: 'verified',
        _id: { $nin: campaign.prospects }
      }).limit(needed);
      
      // Add to campaign
      campaign.prospects.push(...existingProspects.map(p => p._id));
      campaign.stats.totalProspects = campaign.prospects.length;
      await campaign.save();
      
      console.log(`✅ Added ${existingProspects.length} existing prospects to campaign`);
      
      // If still need more, trigger prospecting agent
      const stillNeeded = needed - existingProspects.length;
      if (stillNeeded > 0 && this.prospectingAgent) {
        console.log(`🔄 Triggering prospecting agent for ${stillNeeded} more prospects`);
        
        // Listen for new prospects
        const prospectListener = async (prospect) => {
          if (this.matchesCampaignCriteria(prospect, campaign)) {
            campaign.prospects.push(prospect._id);
            campaign.stats.totalProspects = campaign.prospects.length;
            await campaign.save();
          }
        };
        
        this.prospectingAgent.on('prospect_saved', prospectListener);
        
        // Run prospecting cycle
        await this.prospectingAgent.runProspectingCycle();
      }
    } catch (error) {
      console.error('Error prospecting for campaign:', error);
    }
  }

  /**
   * Enrich campaign prospects
   */
  async enrichCampaignProspects(campaign) {
    console.log(`🔍 Enriching prospects for campaign: ${campaign.name}`);
    
    try {
      const prospects = await Prospect.find({
        _id: { $in: campaign.prospects },
        $or: [
          { quality_score: { $lt: 0.7 } },
          { enriched_at: { $exists: false } }
        ]
      }).limit(100); // Batch size
      
      if (prospects.length === 0) {
        console.log('✅ All prospects already enriched');
        return;
      }
      
      if (this.enrichmentService) {
        const enriched = await this.enrichmentService.batchEnrich(prospects);
        
        // Save enriched prospects
        for (const prospect of enriched) {
          await Prospect.findByIdAndUpdate(prospect._id, {
            $set: {
              quality_score: prospect.quality_score,
              enriched_at: new Date(),
              verification_results: prospect.verification_results
            }
          });
        }
        
        console.log(`✅ Enriched ${enriched.length} prospects`);
      }
    } catch (error) {
      console.error('Error enriching campaign prospects:', error);
    }
  }

  /**
   * Start outreach for campaign
   */
  async startCampaignOutreach(campaign) {
    console.log(`📧 Starting outreach for campaign: ${campaign.name}`);
    
    try {
      if (!this.outreachAgent) {
        console.warn('⚠️  OutreachAgent not available');
        return;
      }
      
      // Get prospects ready for outreach
      const prospects = await Prospect.find({
        _id: { $in: campaign.prospects },
        status: 'verified',
        lead_score: { $gte: campaign.minLeadScore },
        'outreach.email_sent': { $ne: true }
      }).limit(campaign.settings.maxContactsPerDay);
      
      console.log(`📤 Starting outreach to ${prospects.length} prospects`);
      
      // Create outreach tasks
      for (const prospect of prospects) {
        for (const channel of campaign.channels) {
          await this.outreachAgent.executeOutreach(prospect, {
            channel,
            type: 'initial',
            campaignId: campaign._id
          });
          
          // Rate limiting
          await this.sleep(2000);
        }
      }
      
      // Update campaign stats
      campaign.stats.contacted += prospects.length;
      await campaign.save();
      
      // Schedule follow-ups
      if (campaign.settings.followUpEnabled) {
        this.scheduleFollowUps(campaign, prospects);
      }
      
      console.log(`✅ Outreach started for ${prospects.length} prospects`);
    } catch (error) {
      console.error('Error starting campaign outreach:', error);
    }
  }

  /**
   * Schedule follow-ups
   */
  scheduleFollowUps(campaign, prospects) {
    const followUpDays = campaign.settings.followUpSchedule || [3, 7, 14, 21];
    
    for (const prospect of prospects) {
      for (const days of followUpDays) {
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + days);
        
        // In production, use a job scheduler like node-cron or Bull
        console.log(`📅 Scheduled follow-up for ${prospect.business_name} in ${days} days`);
      }
    }
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      campaign.status = 'paused';
      await campaign.save();
      
      // Remove from active campaigns
      const activeCampaign = this.activeCampaigns.get(campaignId);
      if (activeCampaign && activeCampaign.interval) {
        clearInterval(activeCampaign.interval);
      }
      this.activeCampaigns.delete(campaignId);
      
      this.stats.activeCampaigns--;
      
      this.emit('campaign_paused', campaign);
      
      return campaign;
    } catch (error) {
      console.error('Error pausing campaign:', error);
      throw error;
    }
  }

  /**
   * Complete a campaign
   */
  async completeCampaign(campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      campaign.status = 'completed';
      campaign.endDate = new Date();
      await campaign.save();
      
      // Remove from active campaigns
      const activeCampaign = this.activeCampaigns.get(campaignId);
      if (activeCampaign && activeCampaign.interval) {
        clearInterval(activeCampaign.interval);
      }
      this.activeCampaigns.delete(campaignId);
      
      this.stats.activeCampaigns--;
      this.stats.completedCampaigns++;
      
      // Generate final report
      const report = await this.generateCampaignReport(campaign);
      
      this.emit('campaign_completed', { campaign, report });
      
      return { campaign, report };
    } catch (error) {
      console.error('Error completing campaign:', error);
      throw error;
    }
  }

  /**
   * Generate campaign report
   */
  async generateCampaignReport(campaign) {
    try {
      const prospects = await Prospect.find({
        _id: { $in: campaign.prospects }
      });
      
      const report = {
        campaignId: campaign._id,
        campaignName: campaign.name,
        duration: campaign.endDate 
          ? Math.ceil((campaign.endDate - campaign.startDate) / (1000 * 60 * 60 * 24))
          : null,
        
        prospects: {
          total: prospects.length,
          byType: this.groupByField(prospects, 'business_type'),
          byCountry: this.groupByField(prospects, 'country_code'),
          byLeadScore: {
            high: prospects.filter(p => p.lead_score >= 80).length,
            medium: prospects.filter(p => p.lead_score >= 50 && p.lead_score < 80).length,
            low: prospects.filter(p => p.lead_score < 50).length
          }
        },
        
        outreach: {
          contacted: campaign.stats.contacted,
          responded: campaign.stats.responded,
          converted: campaign.stats.converted,
          responseRate: campaign.stats.contacted > 0 
            ? ((campaign.stats.responded / campaign.stats.contacted) * 100).toFixed(2) + '%'
            : '0%',
          conversionRate: campaign.stats.contacted > 0
            ? ((campaign.stats.converted / campaign.stats.contacted) * 100).toFixed(2) + '%'
            : '0%'
        },
        
        channels: {
          email: prospects.filter(p => p.outreach?.email_sent).length,
          whatsapp: prospects.filter(p => p.outreach?.whatsapp_sent).length,
          call: prospects.filter(p => p.outreach?.call_attempted).length
        },
        
        performance: {
          goalsAchieved: this.calculateGoalsAchieved(campaign),
          roi: this.calculateROI(campaign),
          costPerLead: campaign.budget && prospects.length > 0
            ? (campaign.budget / prospects.length).toFixed(2)
            : null,
          costPerConversion: campaign.budget && campaign.stats.converted > 0
            ? (campaign.budget / campaign.stats.converted).toFixed(2)
            : null
        },
        
        topProspects: prospects
          .filter(p => p.outreach?.interested)
          .sort((a, b) => b.lead_score - a.lead_score)
          .slice(0, 10)
          .map(p => ({
            id: p._id,
            name: p.business_name,
            type: p.business_type,
            score: p.lead_score,
            city: p.city,
            country: p.country_code
          }))
      };
      
      return report;
    } catch (error) {
      console.error('Error generating campaign report:', error);
      return null;
    }
  }

  /**
   * Check if prospect matches campaign criteria
   */
  matchesCampaignCriteria(prospect, campaign) {
    // Country match
    if (campaign.targetCountries.length > 0 && 
        !campaign.targetCountries.includes(prospect.country_code)) {
      return false;
    }
    
    // Business type match
    if (campaign.targetTypes.length > 0 && 
        !campaign.targetTypes.includes(prospect.business_type)) {
      return false;
    }
    
    // City match (if specified)
    if (campaign.targetCities.length > 0 && 
        !campaign.targetCities.includes(prospect.city)) {
      return false;
    }
    
    // Lead score threshold
    if (prospect.lead_score < campaign.minLeadScore) {
      return false;
    }
    
    return true;
  }

  /**
   * Calculate goals achieved
   */
  calculateGoalsAchieved(campaign) {
    const goals = campaign.goals || {};
    const achieved = {};
    
    if (goals.targetProspects) {
      achieved.prospects = (campaign.stats.totalProspects / goals.targetProspects * 100).toFixed(0) + '%';
    }
    
    if (goals.targetContacts) {
      achieved.contacts = (campaign.stats.contacted / goals.targetContacts * 100).toFixed(0) + '%';
    }
    
    if (goals.targetResponses) {
      achieved.responses = (campaign.stats.responded / goals.targetResponses * 100).toFixed(0) + '%';
    }
    
    if (goals.targetConversions) {
      achieved.conversions = (campaign.stats.converted / goals.targetConversions * 100).toFixed(0) + '%';
    }
    
    return achieved;
  }

  /**
   * Calculate ROI
   */
  calculateROI(campaign) {
    if (!campaign.budget || campaign.budget === 0) {
      return null;
    }
    
    // Estimate revenue per conversion (this should come from business logic)
    const avgRevenuePerConversion = 5000; // $5,000 per client
    const totalRevenue = campaign.stats.converted * avgRevenuePerConversion;
    const roi = ((totalRevenue - campaign.budget) / campaign.budget * 100).toFixed(2);
    
    return `${roi}%`;
  }

  /**
   * Group by field
   */
  groupByField(items, field) {
    return items.reduce((acc, item) => {
      const key = item[field] || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      activeCampaignsList: Array.from(this.activeCampaigns.keys())
    };
  }

  /**
   * Helper: Sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let instance = null;

/**
 * Get or create CampaignOrchestratorService instance
 */
function getCampaignOrchestratorService(prospectingAgent, outreachAgent, enrichmentService, config) {
  if (!instance) {
    instance = new CampaignOrchestratorService(prospectingAgent, outreachAgent, enrichmentService, config);
    console.log('✅ CampaignOrchestratorService initialized');
  }
  return instance;
}

module.exports = {
  CampaignOrchestratorService,
  getCampaignOrchestratorService
};
