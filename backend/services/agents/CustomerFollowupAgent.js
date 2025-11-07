/**
 * Customer Follow-up Agent
 * Automated customer interaction tracking and checklist management
 * 
 * Features:
 * - Interaction tracking
 * - Follow-up scheduling
 * - Checklist management
 * - Communication history
 * - Reminder automation
 * - Engagement scoring
 * - Lead nurturing
 */

const { MultiModelAI } = require('../../ai/MultiModelAI');
const { EventEmitter } = require('events');

class CustomerFollowupAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      model: config.model || 'gpt-4o-mini',
      followUpInterval: config.followUpInterval || 7, // days
      maxFollowUpAttempts: config.maxFollowUpAttempts || 3,
      engagementThreshold: config.engagementThreshold || 50,
      ...config
    };

    this.ai = new MultiModelAI();
    
    // Checklist templates
    this.checklistTemplates = {
      'new-lead': {
        name: 'New Lead Process',
        items: [
          { task: 'Initial contact made', priority: 'high', deadline: 1 },
          { task: 'Needs assessment completed', priority: 'high', deadline: 2 },
          { task: 'Proposal sent', priority: 'medium', deadline: 5 },
          { task: 'Follow-up call scheduled', priority: 'medium', deadline: 7 },
          { task: 'Demo/presentation booked', priority: 'low', deadline: 10 }
        ]
      },
      'booking-process': {
        name: 'Booking Process',
        items: [
          { task: 'Quote provided', priority: 'high', deadline: 1 },
          { task: 'Customer questions answered', priority: 'high', deadline: 2 },
          { task: 'Booking confirmed', priority: 'high', deadline: 7 },
          { task: 'Payment received', priority: 'high', deadline: 7 },
          { task: 'Travel documents sent', priority: 'medium', deadline: 14 },
          { task: 'Pre-trip briefing scheduled', priority: 'medium', deadline: 21 },
          { task: 'Final confirmations sent', priority: 'high', deadline: 3 }
        ]
      },
      'customer-onboarding': {
        name: 'Customer Onboarding',
        items: [
          { task: 'Welcome email sent', priority: 'high', deadline: 0 },
          { task: 'Account setup completed', priority: 'high', deadline: 1 },
          { task: 'Preferences collected', priority: 'medium', deadline: 3 },
          { task: 'First consultation scheduled', priority: 'high', deadline: 5 },
          { task: 'Service overview provided', priority: 'medium', deadline: 7 }
        ]
      },
      'post-booking': {
        name: 'Post-Booking Follow-up',
        items: [
          { task: 'Booking confirmation sent', priority: 'high', deadline: 0 },
          { task: 'Payment reminder (if pending)', priority: 'high', deadline: 3 },
          { task: 'Travel tips sent', priority: 'low', deadline: 14 },
          { task: 'Accommodation confirmed', priority: 'high', deadline: 7 },
          { task: 'Activities pre-booked', priority: 'medium', deadline: 14 },
          { task: 'Emergency contacts shared', priority: 'high', deadline: 7 },
          { task: 'Day-before check-in', priority: 'high', deadline: 1 }
        ]
      }
    };

    // Follow-up templates
    this.followUpTemplates = {
      'initial-contact': {
        subject: 'Gracias por tu interés - {Agency Name}',
        timing: 0,
        channel: 'email'
      },
      'quote-follow-up': {
        subject: '¿Tienes preguntas sobre tu cotización?',
        timing: 2,
        channel: 'email'
      },
      'abandoned-cart': {
        subject: 'Tu viaje soñado te está esperando',
        timing: 1,
        channel: 'email'
      },
      'inactive-lead': {
        subject: 'Nuevas ofertas para ti',
        timing: 30,
        channel: 'email'
      },
      'booking-reminder': {
        subject: 'Recordatorio: Tu viaje se acerca',
        timing: -7,
        channel: 'email'
      }
    };
  }

  /**
   * Track customer interaction
   */
  async trackInteraction(interactionData) {
    this.emit('interaction:tracked', { 
      customerId: interactionData.customerId, 
      type: interactionData.type 
    });

    try {
      // Analyze interaction
      const analysis = await this.analyzeInteraction(interactionData);

      // Update engagement score
      const engagementUpdate = this.updateEngagementScore(
        interactionData.customerId,
        interactionData.type,
        analysis
      );

      // Determine next actions
      const nextActions = await this.determineNextActions(interactionData, analysis);

      // Create follow-up tasks
      const followUpTasks = await this.createFollowUpTasks(interactionData, nextActions);

      return {
        success: true,
        interactionId: interactionData.id,
        customerId: interactionData.customerId,
        analysis,
        engagementUpdate,
        nextActions,
        followUpTasks,
        trackedAt: new Date()
      };
    } catch (error) {
      this.emit('interaction:tracking_error', { 
        customerId: interactionData.customerId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Create and manage checklist
   */
  async createChecklist(customerId, templateName, customItems = []) {
    const template = this.checklistTemplates[templateName];
    
    if (!template) {
      throw new Error(`Checklist template '${templateName}' not found`);
    }

    const checklist = {
      customerId,
      templateName,
      name: template.name,
      items: template.items.map((item, index) => ({
        id: `${templateName}-${index}`,
        ...item,
        completed: false,
        completedAt: null,
        completedBy: null,
        dueDate: new Date(Date.now() + item.deadline * 24 * 60 * 60 * 1000)
      })),
      createdAt: new Date(),
      status: 'active'
    };

    // Add custom items
    if (customItems.length > 0) {
      checklist.items.push(...customItems.map((item, index) => ({
        id: `custom-${index}`,
        ...item,
        completed: false,
        completedAt: null,
        completedBy: null,
        dueDate: item.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })));
    }

    this.emit('checklist:created', { customerId, templateName, itemCount: checklist.items.length });

    return checklist;
  }

  /**
   * Update checklist item
   */
  async updateChecklistItem(checklistId, itemId, update) {
    this.emit('checklist:item_updated', { checklistId, itemId, update });

    return {
      checklistId,
      itemId,
      update,
      updatedAt: new Date()
    };
  }

  /**
   * Get checklist status
   */
  async getChecklistStatus(checklistId) {
    // This would fetch from database
    const checklist = {
      id: checklistId,
      totalItems: 0,
      completedItems: 0,
      pendingItems: 0,
      overdueItems: 0,
      completionPercentage: 0,
      estimatedCompletion: null
    };

    return checklist;
  }

  /**
   * Schedule follow-up
   */
  async scheduleFollowUp(customerId, type, scheduledFor, context = {}) {
    const followUp = {
      id: `followup-${Date.now()}`,
      customerId,
      type,
      scheduledFor: scheduledFor instanceof Date ? scheduledFor : new Date(scheduledFor),
      context,
      status: 'scheduled',
      attempts: 0,
      createdAt: new Date()
    };

    // Generate personalized message
    followUp.message = await this.generateFollowUpMessage(customerId, type, context);

    this.emit('followup:scheduled', { customerId, type, scheduledFor: followUp.scheduledFor });

    return followUp;
  }

  /**
   * Process follow-up
   */
  async processFollowUp(followUpId, followUpData) {
    this.emit('followup:processing', { followUpId });

    try {
      // Check if customer is still eligible
      const eligible = await this.checkFollowUpEligibility(followUpData);

      if (!eligible.qualified) {
        return {
          success: false,
          followUpId,
          reason: eligible.reason,
          skipped: true
        };
      }

      // Execute follow-up
      const result = await this.executeFollowUp(followUpData);

      // Update attempts
      followUpData.attempts++;

      // Schedule next follow-up if needed
      let nextFollowUp = null;
      if (followUpData.attempts < this.config.maxFollowUpAttempts && result.needsRetry) {
        nextFollowUp = await this.scheduleNextFollowUp(followUpData);
      }

      this.emit('followup:processed', { 
        followUpId, 
        success: result.success, 
        attempts: followUpData.attempts 
      });

      return {
        success: true,
        followUpId,
        result,
        nextFollowUp,
        processedAt: new Date()
      };
    } catch (error) {
      this.emit('followup:processing_error', { followUpId, error: error.message });
      throw error;
    }
  }

  /**
   * Calculate engagement score
   */
  calculateEngagementScore(customerData) {
    let score = 0;
    const weights = {
      emailOpens: 5,
      emailClicks: 10,
      websiteVisits: 8,
      quoteRequests: 15,
      bookings: 30,
      reviews: 20,
      referrals: 25,
      socialEngagement: 5
    };

    // Add points for each interaction type
    for (const [type, weight] of Object.entries(weights)) {
      const count = customerData.interactions?.[type] || 0;
      score += count * weight;
    }

    // Recency factor (decay over time)
    const daysSinceLastInteraction = customerData.lastInteraction
      ? Math.floor((Date.now() - new Date(customerData.lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
      : 365;
    
    const recencyFactor = Math.max(0, 1 - (daysSinceLastInteraction / 365));
    score *= recencyFactor;

    // Normalize to 0-100
    score = Math.min(score, 100);

    return {
      total: Math.round(score),
      breakdown: {
        interactionScore: Math.round(score / recencyFactor),
        recencyFactor: Math.round(recencyFactor * 100) / 100
      },
      category: this.getEngagementCategory(score),
      lastInteraction: customerData.lastInteraction
    };
  }

  /**
   * Analyze interaction
   */
  async analyzeInteraction(interactionData) {
    const prompt = `Analyze this customer interaction:

Type: ${interactionData.type}
Channel: ${interactionData.channel}
Content: ${interactionData.content || 'N/A'}
Duration: ${interactionData.duration || 'N/A'}
Outcome: ${interactionData.outcome || 'N/A'}

Customer Context:
- Stage: ${interactionData.customerStage || 'unknown'}
- Previous interactions: ${interactionData.interactionCount || 0}
- Last interaction: ${interactionData.lastInteraction || 'N/A'}

Provide:
1. Interaction quality (0-100)
2. Customer intent (research/compare/ready-to-book/support)
3. Urgency level (low/medium/high/urgent)
4. Next best action
5. Follow-up timing (hours)

Format as JSON.`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.3,
      maxTokens: 500
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return {
        quality: 50,
        intent: 'research',
        urgency: 'low',
        nextBestAction: 'send_follow_up',
        followUpTiming: 48
      };
    }
  }

  /**
   * Generate follow-up message
   */
  async generateFollowUpMessage(customerId, type, context) {
    const template = this.followUpTemplates[type];
    
    const prompt = `Generate a personalized follow-up message:

Type: ${type}
Customer Context:
${JSON.stringify(context, null, 2)}

Template guidance: ${template ? template.subject : 'General follow-up'}

Requirements:
- Personalized and relevant
- Clear call-to-action
- Friendly but professional
- Reference previous interaction
- Create urgency (subtle)
- Include value proposition
- In Spanish (es)
- 100-150 words

Format as JSON with: subject, body, cta`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 400
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return {
        subject: template?.subject || 'Seguimiento de tu consulta',
        body: response.response,
        cta: 'Responder a este mensaje'
      };
    }
  }

  /**
   * Determine next actions based on interaction
   */
  async determineNextActions(interactionData, analysis) {
    const actions = [];

    // Based on intent
    switch (analysis.intent) {
      case 'ready-to-book':
        actions.push({ type: 'send_booking_link', priority: 'urgent', timing: 1 });
        actions.push({ type: 'personal_follow_up', priority: 'high', timing: 4 });
        break;
      case 'compare':
        actions.push({ type: 'send_comparison_guide', priority: 'high', timing: 2 });
        actions.push({ type: 'offer_consultation', priority: 'medium', timing: 24 });
        break;
      case 'research':
        actions.push({ type: 'send_educational_content', priority: 'medium', timing: 24 });
        actions.push({ type: 'add_to_nurture_campaign', priority: 'low', timing: 0 });
        break;
      case 'support':
        actions.push({ type: 'escalate_to_support', priority: 'urgent', timing: 0 });
        break;
    }

    // Based on urgency
    if (analysis.urgency === 'urgent') {
      actions.push({ type: 'immediate_contact', priority: 'urgent', timing: 0 });
    }

    // Based on quality
    if (analysis.quality < 30) {
      actions.push({ type: 'attempt_reengagement', priority: 'low', timing: 168 }); // 1 week
    }

    return actions;
  }

  /**
   * Create follow-up tasks
   */
  async createFollowUpTasks(interactionData, nextActions) {
    const tasks = nextActions.map(action => ({
      customerId: interactionData.customerId,
      type: action.type,
      priority: action.priority,
      dueDate: new Date(Date.now() + action.timing * 60 * 60 * 1000),
      status: 'pending',
      createdAt: new Date(),
      createdBy: 'system',
      relatedInteraction: interactionData.id
    }));

    this.emit('tasks:created', { customerId: interactionData.customerId, count: tasks.length });

    return tasks;
  }

  /**
   * Update engagement score
   */
  updateEngagementScore(customerId, interactionType, analysis) {
    const points = {
      'email_open': 5,
      'email_click': 10,
      'website_visit': 8,
      'form_submission': 15,
      'phone_call': 20,
      'booking': 30,
      'review': 20
    };

    const basePoints = points[interactionType] || 5;
    const qualityMultiplier = analysis.quality / 100;
    const earnedPoints = Math.round(basePoints * qualityMultiplier);

    return {
      customerId,
      pointsEarned: earnedPoints,
      interactionType,
      quality: analysis.quality,
      updatedAt: new Date()
    };
  }

  /**
   * Check follow-up eligibility
   */
  async checkFollowUpEligibility(followUpData) {
    // Check if customer has unsubscribed
    if (followUpData.customerPreferences?.unsubscribed) {
      return { qualified: false, reason: 'Customer unsubscribed' };
    }

    // Check if customer already converted
    if (followUpData.customerStatus === 'customer') {
      return { qualified: false, reason: 'Already converted to customer' };
    }

    // Check if too many recent contacts
    if (followUpData.recentContactCount > 5) {
      return { qualified: false, reason: 'Too many recent contacts' };
    }

    // Check if customer is in blacklist
    if (followUpData.blacklisted) {
      return { qualified: false, reason: 'Customer blacklisted' };
    }

    return { qualified: true };
  }

  /**
   * Execute follow-up
   */
  async executeFollowUp(followUpData) {
    // This would integrate with email/SMS service
    
    this.emit('followup:executed', { 
      followUpId: followUpData.id, 
      customerId: followUpData.customerId 
    });

    return {
      success: true,
      sentAt: new Date(),
      channel: followUpData.context.channel || 'email',
      needsRetry: false
    };
  }

  /**
   * Schedule next follow-up
   */
  async scheduleNextFollowUp(previousFollowUp) {
    const delayDays = this.config.followUpInterval * (previousFollowUp.attempts + 1);
    const scheduledFor = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);

    return await this.scheduleFollowUp(
      previousFollowUp.customerId,
      previousFollowUp.type,
      scheduledFor,
      {
        ...previousFollowUp.context,
        previousAttempt: previousFollowUp.attempts
      }
    );
  }

  /**
   * Helper: Get engagement category
   */
  getEngagementCategory(score) {
    if (score >= 80) return 'highly_engaged';
    if (score >= 60) return 'engaged';
    if (score >= 40) return 'moderately_engaged';
    if (score >= 20) return 'low_engagement';
    return 'dormant';
  }

  /**
   * Get customer follow-up summary
   */
  async getCustomerFollowUpSummary(customerId) {
    return {
      customerId,
      totalInteractions: 0,
      lastInteraction: null,
      engagementScore: 0,
      activeChecklists: 0,
      pendingFollowUps: 0,
      completedFollowUps: 0,
      nextScheduledFollowUp: null,
      recommendedActions: []
    };
  }

  /**
   * Get follow-up statistics
   */
  async getFollowUpStatistics(startDate, endDate) {
    return {
      period: { startDate, endDate },
      totalFollowUps: 0,
      completedFollowUps: 0,
      skippedFollowUps: 0,
      responseRate: 0,
      conversionRate: 0,
      byType: {},
      byChannel: {},
      averageResponseTime: 0 // hours
    };
  }
}

module.exports = CustomerFollowupAgent;
