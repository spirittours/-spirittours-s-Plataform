/**
 * Multi-Channel Sales Orchestrator
 * 
 * Coordina campañas de ventas across múltiples canales:
 * - Email (ya implementado)
 * - WhatsApp Business
 * - Facebook/Instagram DMs
 * - LinkedIn Messages
 * - SMS
 * 
 * Inteligentemente decide qué canal usar basado en:
 * - Preferencias del lead
 * - Tasa de respuesta histórica
 * - Etapa del funnel
 * - Urgencia del mensaje
 */

const EventEmitter = require('events');
const whatsappAgent = require('./whatsapp-ai-agent.service');

class MultiChannelOrchestrator extends EventEmitter {
  constructor() {
    super();
    
    this.config = {
      // Channel configurations
      channels: {
        email: {
          enabled: true,
          priority: 1,
          bestFor: ['cold outreach', 'detailed info', 'proposals', 'contracts'],
          responseTime: '24-48h',
          costPerMessage: 0.001
        },
        whatsapp: {
          enabled: true,
          priority: 2,
          bestFor: ['quick questions', 'follow-ups', 'closing', 'support'],
          responseTime: '1-4h',
          costPerMessage: 0.005
        },
        facebook: {
          enabled: true,
          priority: 3,
          bestFor: ['social engagement', 'brand awareness', 'community'],
          responseTime: '4-24h',
          costPerMessage: 0
        },
        instagram: {
          enabled: true,
          priority: 3,
          bestFor: ['visual content', 'inspiration', 'young audience'],
          responseTime: '4-24h',
          costPerMessage: 0
        },
        linkedin: {
          enabled: true,
          priority: 4,
          bestFor: ['B2B', 'professional', 'corporate clients'],
          responseTime: '24-72h',
          costPerMessage: 0
        },
        sms: {
          enabled: false,
          priority: 5,
          bestFor: ['urgent', 'confirmations', 'reminders'],
          responseTime: '15min-1h',
          costPerMessage: 0.01
        }
      },
      
      // Smart routing rules
      routingRules: {
        // Etapa del funnel → mejor canal
        funnelStage: {
          awareness: ['facebook', 'instagram', 'linkedin'],
          interest: ['email', 'whatsapp'],
          consideration: ['whatsapp', 'email'],
          intent: ['whatsapp', 'email'],
          purchase: ['whatsapp', 'email'],
          loyalty: ['whatsapp', 'email', 'facebook']
        },
        
        // Tipo de mensaje → mejor canal
        messageType: {
          'cold-outreach': ['email', 'linkedin'],
          'warm-follow-up': ['whatsapp', 'email'],
          'quick-question': ['whatsapp'],
          'detailed-info': ['email'],
          'urgent': ['whatsapp', 'sms'],
          'social-engagement': ['facebook', 'instagram'],
          'b2b-proposal': ['email', 'linkedin']
        },
        
        // Tipo de cliente → preferencia de canal
        clientType: {
          B2C: ['whatsapp', 'email', 'instagram'],
          B2B: ['email', 'linkedin', 'whatsapp']
        }
      },
      
      // Campaign sequences
      sequences: {
        'cold-b2c': [
          { day: 0, channel: 'email', template: 'cold-b2c-intro' },
          { day: 2, channel: 'whatsapp', template: 'follow-up-1', condition: 'no_email_open' },
          { day: 5, channel: 'email', template: 'cold-b2c-offer' },
          { day: 7, channel: 'whatsapp', template: 'last-chance', condition: 'no_response' }
        ],
        'cold-b2b-agency': [
          { day: 0, channel: 'linkedin', template: 'b2b-intro' },
          { day: 1, channel: 'email', template: 'b2b-detailed' },
          { day: 3, channel: 'whatsapp', template: 'b2b-follow-up', condition: 'no_email_open' },
          { day: 7, channel: 'email', template: 'b2b-case-study' },
          { day: 10, channel: 'whatsapp', template: 'b2b-call-request' }
        ],
        'warm-nurture': [
          { day: 0, channel: 'whatsapp', template: 'check-in' },
          { day: 7, channel: 'email', template: 'valuable-content' },
          { day: 14, channel: 'whatsapp', template: 'special-offer' },
          { day: 21, channel: 'email', template: 'success-story' }
        ],
        'closing-sequence': [
          { day: 0, channel: 'whatsapp', template: 'proposal-sent' },
          { day: 1, channel: 'whatsapp', template: 'proposal-follow-up' },
          { day: 2, channel: 'email', template: 'additional-info' },
          { day: 3, channel: 'whatsapp', template: 'closing-urgency' }
        ]
      }
    };
    
    // Active campaigns
    this.campaigns = new Map();
    
    // Lead channel preferences
    this.leadPreferences = new Map();
    
    // Channel performance metrics
    this.channelMetrics = {
      email: { sent: 0, opened: 0, clicked: 0, replied: 0, converted: 0 },
      whatsapp: { sent: 0, delivered: 0, read: 0, replied: 0, converted: 0 },
      facebook: { sent: 0, delivered: 0, read: 0, replied: 0, converted: 0 },
      instagram: { sent: 0, delivered: 0, read: 0, replied: 0, converted: 0 },
      linkedin: { sent: 0, delivered: 0, read: 0, replied: 0, converted: 0 },
      sms: { sent: 0, delivered: 0, read: 0, replied: 0, converted: 0 }
    };
  }

  /**
   * Start multi-channel campaign
   */
  async startCampaign(leads, sequenceType, options = {}) {
    const sequence = this.config.sequences[sequenceType];
    if (!sequence) {
      throw new Error(`Unknown sequence type: ${sequenceType}`);
    }

    const campaign = {
      id: this.generateCampaignId(),
      name: options.name || `Campaign ${sequenceType}`,
      sequenceType,
      leads: leads.map(lead => ({
        ...lead,
        status: 'pending',
        currentStep: 0,
        interactions: [],
        preferredChannel: lead.preferredChannel || this.detectPreferredChannel(lead)
      })),
      startedAt: new Date(),
      options
    };

    this.campaigns.set(campaign.id, campaign);

    // Schedule all steps for all leads
    for (const lead of campaign.leads) {
      await this.scheduleSequenceForLead(campaign, lead, sequence);
    }

    this.emit('campaignStarted', { campaignId: campaign.id, leadsCount: leads.length });

    return campaign;
  }

  /**
   * Schedule sequence for a single lead
   */
  async scheduleSequenceForLead(campaign, lead, sequence) {
    for (const step of sequence) {
      // Check if step has condition
      if (step.condition) {
        // Will be evaluated at execution time
      }

      // Schedule step
      const executeAt = new Date(campaign.startedAt.getTime() + (step.day * 24 * 60 * 60 * 1000));
      
      setTimeout(async () => {
        await this.executeStep(campaign, lead, step);
      }, executeAt - new Date());
    }
  }

  /**
   * Execute a single step
   */
  async executeStep(campaign, lead, step) {
    try {
      // Check condition if exists
      if (step.condition && !this.evaluateCondition(lead, step.condition)) {
        console.log(`⏭️ Skipping step for ${lead.email} - condition not met: ${step.condition}`);
        return;
      }

      // Get best channel (override or use preferred)
      const channel = step.channel || lead.preferredChannel;

      // Send message
      const result = await this.sendMessage(lead, channel, step.template, campaign.options);

      // Record interaction
      lead.interactions.push({
        channel,
        template: step.template,
        sentAt: new Date(),
        status: result.status,
        messageId: result.messageId
      });

      lead.currentStep++;

      this.emit('stepExecuted', {
        campaignId: campaign.id,
        leadId: lead.id,
        channel,
        template: step.template,
        success: result.success
      });

    } catch (error) {
      console.error(`❌ Error executing step for ${lead.email}:`, error);
      this.emit('stepFailed', {
        campaignId: campaign.id,
        leadId: lead.id,
        error: error.message
      });
    }
  }

  /**
   * Send message through appropriate channel
   */
  async sendMessage(lead, channel, template, options = {}) {
    const channelConfig = this.config.channels[channel];
    
    if (!channelConfig || !channelConfig.enabled) {
      throw new Error(`Channel ${channel} is not enabled`);
    }

    let result = { success: false, status: 'failed' };

    try {
      switch (channel) {
        case 'email':
          result = await this.sendEmail(lead, template, options);
          break;
        case 'whatsapp':
          result = await this.sendWhatsApp(lead, template, options);
          break;
        case 'facebook':
          result = await this.sendFacebook(lead, template, options);
          break;
        case 'instagram':
          result = await this.sendInstagram(lead, template, options);
          break;
        case 'linkedin':
          result = await this.sendLinkedIn(lead, template, options);
          break;
        case 'sms':
          result = await this.sendSMS(lead, template, options);
          break;
        default:
          throw new Error(`Unknown channel: ${channel}`);
      }

      // Update metrics
      this.channelMetrics[channel].sent++;
      
      return result;

    } catch (error) {
      console.error(`❌ Error sending ${channel} to ${lead.email}:`, error);
      throw error;
    }
  }

  /**
   * Send email (integrates with existing email system)
   */
  async sendEmail(lead, template, options) {
    // Integrate with your existing email campaign system
    // const emailCampaign = require('./email-campaign.service');
    // return await emailCampaign.send(...);
    
    return {
      success: true,
      status: 'sent',
      messageId: `email_${Date.now()}`,
      channel: 'email'
    };
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(lead, template, options) {
    if (!lead.phone) {
      throw new Error('Lead has no phone number');
    }

    try {
      const result = await whatsappAgent.sendTemplateMessage(
        lead.phone,
        template,
        'es',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: lead.name || 'viajero' }
            ]
          }
        ]
      );

      return {
        success: true,
        status: 'sent',
        messageId: result.messages?.[0]?.id,
        channel: 'whatsapp'
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: error.message,
        channel: 'whatsapp'
      };
    }
  }

  /**
   * Send Facebook message
   */
  async sendFacebook(lead, template, options) {
    // Integrate with Facebook Messenger API
    // This requires Facebook Page Access Token
    
    return {
      success: true,
      status: 'sent',
      messageId: `fb_${Date.now()}`,
      channel: 'facebook'
    };
  }

  /**
   * Send Instagram message
   */
  async sendInstagram(lead, template, options) {
    // Integrate with Instagram Messaging API
    // This requires Instagram Business Account
    
    return {
      success: true,
      status: 'sent',
      messageId: `ig_${Date.now()}`,
      channel: 'instagram'
    };
  }

  /**
   * Send LinkedIn message
   */
  async sendLinkedIn(lead, template, options) {
    // Integrate with LinkedIn Messaging API
    // Requires LinkedIn API access
    
    return {
      success: true,
      status: 'sent',
      messageId: `li_${Date.now()}`,
      channel: 'linkedin'
    };
  }

  /**
   * Send SMS
   */
  async sendSMS(lead, template, options) {
    // Integrate with SMS provider (Twilio, etc.)
    
    return {
      success: true,
      status: 'sent',
      messageId: `sms_${Date.now()}`,
      channel: 'sms'
    };
  }

  /**
   * Intelligently select best channel for a lead
   */
  selectBestChannel(lead, messageType, urgency = 'normal') {
    const preferences = this.leadPreferences.get(lead.id) || {};
    
    // 1. Check lead's preferred channel
    if (preferences.preferred) {
      return preferences.preferred;
    }

    // 2. Check message type routing rules
    const channelsForType = this.config.routingRules.messageType[messageType];
    if (channelsForType) {
      // Find first enabled channel
      for (const channel of channelsForType) {
        if (this.config.channels[channel].enabled) {
          return channel;
        }
      }
    }

    // 3. Check urgency
    if (urgency === 'urgent') {
      return lead.phone ? 'whatsapp' : 'email';
    }

    // 4. Check client type
    const clientType = lead.businessType || 'B2C';
    const channelsForClient = this.config.routingRules.clientType[clientType];
    if (channelsForClient && channelsForClient.length > 0) {
      return channelsForClient[0];
    }

    // 5. Default to email
    return 'email';
  }

  /**
   * Detect preferred channel based on lead data
   */
  detectPreferredChannel(lead) {
    // If has WhatsApp and is B2C, prefer WhatsApp
    if (lead.phone && lead.businessType !== 'B2B') {
      return 'whatsapp';
    }

    // If is B2B and has LinkedIn, prefer LinkedIn
    if (lead.businessType === 'B2B' && lead.linkedinUrl) {
      return 'linkedin';
    }

    // Default to email
    return 'email';
  }

  /**
   * Evaluate step condition
   */
  evaluateCondition(lead, condition) {
    switch (condition) {
      case 'no_email_open':
        return !lead.interactions.some(i => 
          i.channel === 'email' && i.status === 'opened'
        );
      
      case 'no_response':
        return !lead.interactions.some(i => 
          i.status === 'replied'
        );
      
      case 'email_opened':
        return lead.interactions.some(i => 
          i.channel === 'email' && i.status === 'opened'
        );
      
      case 'link_clicked':
        return lead.interactions.some(i => 
          i.status === 'clicked'
        );
      
      default:
        return true;
    }
  }

  /**
   * Update lead channel preference based on performance
   */
  updateLeadPreference(leadId, channel, responseTime) {
    const preferences = this.leadPreferences.get(leadId) || {
      channelPerformance: {}
    };

    if (!preferences.channelPerformance[channel]) {
      preferences.channelPerformance[channel] = {
        responses: 0,
        avgResponseTime: 0
      };
    }

    const perf = preferences.channelPerformance[channel];
    perf.responses++;
    perf.avgResponseTime = (perf.avgResponseTime * (perf.responses - 1) + responseTime) / perf.responses;

    // Update preferred channel to the one with best performance
    const bestChannel = Object.entries(preferences.channelPerformance)
      .sort((a, b) => b[1].responses - a[1].responses)[0]?.[0];
    
    preferences.preferred = bestChannel;

    this.leadPreferences.set(leadId, preferences);
  }

  /**
   * Get campaign by ID
   */
  getCampaign(campaignId) {
    return this.campaigns.get(campaignId);
  }

  /**
   * Get all active campaigns
   */
  getActiveCampaigns() {
    return Array.from(this.campaigns.values());
  }

  /**
   * Pause campaign
   */
  pauseCampaign(campaignId) {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      campaign.status = 'paused';
      this.emit('campaignPaused', { campaignId });
    }
  }

  /**
   * Resume campaign
   */
  resumeCampaign(campaignId) {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      campaign.status = 'active';
      this.emit('campaignResumed', { campaignId });
    }
  }

  /**
   * Stop campaign
   */
  stopCampaign(campaignId) {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      campaign.status = 'stopped';
      this.emit('campaignStopped', { campaignId });
    }
  }

  /**
   * Get channel metrics
   */
  getChannelMetrics() {
    const metrics = {};
    
    for (const [channel, data] of Object.entries(this.channelMetrics)) {
      metrics[channel] = {
        ...data,
        openRate: data.sent > 0 ? ((data.opened || data.read || 0) / data.sent * 100).toFixed(2) + '%' : '0%',
        replyRate: data.sent > 0 ? (data.replied / data.sent * 100).toFixed(2) + '%' : '0%',
        conversionRate: data.sent > 0 ? (data.converted / data.sent * 100).toFixed(2) + '%' : '0%'
      };
    }
    
    return metrics;
  }

  /**
   * Get campaign statistics
   */
  getCampaignStats(campaignId) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    const stats = {
      totalLeads: campaign.leads.length,
      messagesSent: 0,
      responses: 0,
      conversions: 0,
      byChannel: {}
    };

    campaign.leads.forEach(lead => {
      lead.interactions.forEach(interaction => {
        stats.messagesSent++;
        
        if (!stats.byChannel[interaction.channel]) {
          stats.byChannel[interaction.channel] = { sent: 0, responses: 0 };
        }
        stats.byChannel[interaction.channel].sent++;
        
        if (interaction.status === 'replied') {
          stats.responses++;
          stats.byChannel[interaction.channel].responses++;
        }
      });
      
      if (lead.status === 'converted') {
        stats.conversions++;
      }
    });

    stats.responseRate = stats.messagesSent > 0 
      ? (stats.responses / stats.messagesSent * 100).toFixed(2) + '%'
      : '0%';
    
    stats.conversionRate = stats.totalLeads > 0
      ? (stats.conversions / stats.totalLeads * 100).toFixed(2) + '%'
      : '0%';

    return stats;
  }

  /**
   * Generate campaign ID
   */
  generateCampaignId() {
    return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get recommended sequence for lead
   */
  getRecommendedSequence(lead) {
    if (lead.businessType === 'B2B') {
      if (lead.industry === 'travel-agency' || lead.industry === 'tour-operator') {
        return 'cold-b2b-agency';
      }
    }
    
    if (lead.stage === 'warm') {
      return 'warm-nurture';
    }
    
    if (lead.stage === 'closing') {
      return 'closing-sequence';
    }
    
    return 'cold-b2c';
  }
}

// Export singleton instance
module.exports = new MultiChannelOrchestrator();
