/**
 * AI to CRM Bridge Service
 * 
 * Integración entre 25+ Agentes IA especializados y el CRM System.
 * Los agentes IA crean automáticamente Contacts, Deals y Activities en el CRM.
 * 
 * Features:
 * - Auto-create leads from AI interactions
 * - AI-powered lead scoring
 * - Automatic deal creation for high-intent interactions
 * - Activity logging for all AI interactions
 * - Entity extraction from conversations
 * - Sentiment analysis
 * 
 * Spirit Tours Platform - Spirit Phase 1.1
 */

const Contact = require('../../models/Contact');
const Deal = require('../../models/Deal');
const Activity = require('../../models/Activity');
const AgentManager = require('../../ai/AgentManager');
const logger = require('../logging/logger');

class AIToCRMBridge {
  constructor() {
    this.agentManager = new AgentManager();
    
    // Mapeo de intents a acciones CRM
    this.intentActionMap = {
      'travel_inquiry': 'createLead',
      'booking_request': 'createDeal',
      'destination_info': 'updateEngagement',
      'price_inquiry': 'createDeal',
      'availability_check': 'createDeal',
      'support_request': 'createActivity',
      'feedback': 'updateContact',
      'referral': 'createLead'
    };
    
    // Mapeo de agentes a lead source
    this.agentSourceMap = {
      'ethical-tourism': 'AI - Ethical Tourism Advisor',
      'sustainable-travel': 'AI - Sustainable Travel Planner',
      'cultural-immersion': 'AI - Cultural Immersion Guide',
      'adventure-planner': 'AI - Adventure Planner',
      'customer-prophet': 'AI - Customer Prophet',
      'revenue-maximizer': 'AI - Revenue Maximizer',
      'booking-optimizer': 'AI - Booking Optimizer',
      'content-master': 'AI - Content Master',
      'demand-forecaster': 'AI - Demand Forecaster',
      'experience-curator': 'AI - Experience Curator'
    };
  }

  /**
   * Procesar interacción de agente IA y crear registros en CRM
   */
  async processAgentInteraction(agentId, interaction, userId, workspaceId) {
    try {
      logger.info('Processing AI agent interaction', { agentId, workspaceId });

      // Analizar la interacción con IA
      const analysis = await this.analyzeInteraction(interaction, agentId);
      
      const { intent, entities, sentiment, confidence } = analysis;

      // Solo procesar si la confianza es alta
      if (confidence < 0.6) {
        logger.warn('Low confidence AI interaction, skipping CRM creation', { 
          confidence, 
          agentId 
        });
        return { success: false, reason: 'low_confidence' };
      }

      // Ejecutar acción basada en intent
      const action = this.intentActionMap[intent];
      if (!action || !this[action]) {
        logger.warn('Unknown intent or action', { intent, agentId });
        return { success: false, reason: 'unknown_intent' };
      }

      const result = await this[action]({
        agentId,
        interaction,
        entities,
        sentiment,
        confidence,
        userId,
        workspaceId
      });

      logger.info('AI interaction processed successfully', { 
        agentId, 
        action, 
        result 
      });

      return { success: true, action, result };

    } catch (error) {
      logger.error('Error processing AI agent interaction', { 
        error: error.message, 
        agentId, 
        workspaceId 
      });
      throw error;
    }
  }

  /**
   * Analizar interacción con IA para extraer intent, entities y sentiment
   */
  async analyzeInteraction(interaction, agentId) {
    try {
      // Usar customer-prophet para análisis profundo
      const analysisPrompt = `Analyze this customer interaction and extract structured data:

Interaction: "${interaction.userMessage}"
Response: "${interaction.agentResponse}"

Extract and return JSON with:
{
  "intent": "travel_inquiry | booking_request | destination_info | price_inquiry | availability_check | support_request | feedback | referral",
  "entities": {
    "name": "customer name if mentioned",
    "email": "email if mentioned",
    "phone": "phone if mentioned",
    "destination": "travel destination",
    "dates": "travel dates if mentioned",
    "budget": "estimated budget if mentioned",
    "travelers": "number of travelers",
    "interests": ["array", "of", "interests"]
  },
  "sentiment": "positive | neutral | negative",
  "confidence": 0.0-1.0,
  "urgency": "high | medium | low",
  "summary": "brief summary of interaction"
}`;

      const analysis = await this.agentManager.multiAI.process({
        agentId: 'customer-prophet',
        prompt: analysisPrompt,
        temperature: 0.2,
        responseFormat: 'json'
      });

      return JSON.parse(analysis.response);

    } catch (error) {
      logger.error('Error analyzing AI interaction', { error: error.message });
      
      // Fallback to basic analysis
      return {
        intent: 'travel_inquiry',
        entities: {},
        sentiment: 'neutral',
        confidence: 0.5,
        urgency: 'medium',
        summary: interaction.userMessage?.substring(0, 100) || 'AI interaction'
      };
    }
  }

  /**
   * Crear Lead en CRM desde interacción IA
   */
  async createLead({ agentId, interaction, entities, sentiment, confidence, userId, workspaceId }) {
    try {
      // Verificar si contact ya existe
      let contact = null;
      if (entities.email) {
        contact = await Contact.findOne({ 
          workspace: workspaceId, 
          email: entities.email 
        });
      }

      if (contact) {
        // Actualizar contact existente
        contact.engagementScore = (contact.engagementScore || 0) + 5;
        contact.lastActivityDate = new Date();
        
        if (!contact.tags.includes('ai-interaction')) {
          contact.tags.push('ai-interaction', agentId);
        }
        
        await contact.save();

        // Crear activity
        await this.createActivity({
          workspaceId,
          entityType: 'contact',
          entityId: contact._id,
          type: 'ai_interaction',
          description: `AI Agent (${agentId}) interacted with existing lead`,
          metadata: { agentId, sentiment, confidence }
        });

        return { 
          action: 'contact_updated', 
          contactId: contact._id,
          message: 'Existing contact updated with AI interaction'
        };
      }

      // Calcular lead quality basado en sentiment y confidence
      const leadQuality = this.calculateLeadQuality(sentiment, confidence, entities);

      // Crear nuevo contact/lead
      contact = await Contact.create({
        workspace: workspaceId,
        type: 'lead',
        firstName: entities.name?.split(' ')[0] || 'AI Generated',
        lastName: entities.name?.split(' ').slice(1).join(' ') || 'Lead',
        email: entities.email || `ai-lead-${Date.now()}@pending.com`,
        phone: entities.phone,
        company: entities.company,
        
        // Lead scoring
        leadScore: confidence * 100,
        leadQuality,
        leadSource: this.agentSourceMap[agentId] || `AI Agent: ${agentId}`,
        
        // Engagement
        engagementScore: 10,
        lastActivityDate: new Date(),
        
        // Metadata
        tags: ['ai-generated', agentId, sentiment],
        notes: `AI Generated Lead from ${agentId}\n\nSummary: ${entities.summary || interaction.userMessage?.substring(0, 200)}`,
        
        // Custom fields
        customFields: {
          destination: entities.destination,
          travelDates: entities.dates,
          estimatedBudget: entities.budget,
          numberOfTravelers: entities.travelers,
          interests: entities.interests || []
        }
      });

      // Crear activity
      await this.createActivity({
        workspaceId,
        entityType: 'contact',
        entityId: contact._id,
        type: 'ai_interaction',
        description: `New lead created by AI Agent (${agentId})`,
        metadata: { 
          agentId, 
          sentiment, 
          confidence,
          intent: 'travel_inquiry',
          entities 
        }
      });

      // Si alta confianza y alto interés, calcular lead score con IA
      if (confidence > 0.8) {
        setTimeout(() => {
          this.updateLeadScoreWithAI(contact._id, workspaceId);
        }, 2000);
      }

      logger.info('Lead created from AI interaction', { 
        contactId: contact._id, 
        agentId, 
        leadQuality 
      });

      return {
        action: 'lead_created',
        contactId: contact._id,
        leadQuality,
        message: 'New lead created successfully'
      };

    } catch (error) {
      logger.error('Error creating lead from AI', { error: error.message });
      throw error;
    }
  }

  /**
   * Crear Deal en CRM desde interacción IA
   */
  async createDeal({ agentId, interaction, entities, sentiment, confidence, userId, workspaceId }) {
    try {
      // Primero crear o encontrar contact
      const leadResult = await this.createLead({ 
        agentId, 
        interaction, 
        entities, 
        sentiment, 
        confidence, 
        userId, 
        workspaceId 
      });

      const contactId = leadResult.contactId;

      // Verificar si ya existe deal para este contact
      const existingDeal = await Deal.findOne({
        workspace: workspaceId,
        contact: contactId,
        stage: { $nin: ['won', 'lost'] } // Solo deals activos
      });

      if (existingDeal) {
        // Actualizar deal existente
        existingDeal.value = entities.budget || existingDeal.value;
        existingDeal.lastActivityDate = new Date();
        await existingDeal.save();

        await this.createActivity({
          workspaceId,
          entityType: 'deal',
          entityId: existingDeal._id,
          type: 'ai_interaction',
          description: `AI Agent (${agentId}) updated deal information`,
          metadata: { agentId, entities }
        });

        return {
          action: 'deal_updated',
          dealId: existingDeal._id,
          message: 'Existing deal updated'
        };
      }

      // Crear título descriptivo
      const dealTitle = entities.destination 
        ? `${entities.destination} Trip - ${entities.name || 'AI Lead'}`
        : `Travel Opportunity - ${entities.name || 'AI Lead'}`;

      // Calcular probabilidad basada en confidence y urgency
      const probability = this.calculateDealProbability(confidence, entities.urgency);

      // Crear nuevo deal
      const deal = await Deal.create({
        workspace: workspaceId,
        title: dealTitle,
        contact: contactId,
        
        // Value
        value: entities.budget || 5000, // Default $5000
        currency: 'USD',
        
        // Stage
        stage: 'qualification',
        probability,
        
        // Source
        source: this.agentSourceMap[agentId] || `AI Agent: ${agentId}`,
        
        // Dates
        expectedCloseDate: this.calculateExpectedCloseDate(entities.urgency),
        lastActivityDate: new Date(),
        
        // Metadata
        tags: ['ai-generated', agentId],
        description: `AI Generated Deal\n\nDestination: ${entities.destination || 'TBD'}\nTravelers: ${entities.travelers || 'TBD'}\nDates: ${entities.dates || 'TBD'}\n\nSummary: ${entities.summary || ''}`
      });

      // Crear activity
      await this.createActivity({
        workspaceId,
        entityType: 'deal',
        entityId: deal._id,
        type: 'deal_created',
        description: `New deal created by AI Agent (${agentId})`,
        metadata: { agentId, entities, probability }
      });

      // Asignar automáticamente a sales rep
      setTimeout(() => {
        this.autoAssignSalesRep(deal._id, workspaceId);
      }, 1000);

      logger.info('Deal created from AI interaction', { 
        dealId: deal._id, 
        agentId, 
        probability 
      });

      return {
        action: 'deal_created',
        dealId: deal._id,
        contactId,
        probability,
        message: 'New deal created successfully'
      };

    } catch (error) {
      logger.error('Error creating deal from AI', { error: error.message });
      throw error;
    }
  }

  /**
   * Actualizar engagement score
   */
  async updateEngagement({ agentId, interaction, entities, sentiment, workspaceId }) {
    try {
      if (!entities.email) {
        return { action: 'skipped', reason: 'no_email' };
      }

      const contact = await Contact.findOne({ 
        workspace: workspaceId, 
        email: entities.email 
      });

      if (!contact) {
        // Crear lead si no existe
        return await this.createLead(arguments[0]);
      }

      // Actualizar engagement
      contact.engagementScore = (contact.engagementScore || 0) + 3;
      contact.lastActivityDate = new Date();
      await contact.save();

      // Crear activity
      await this.createActivity({
        workspaceId,
        entityType: 'contact',
        entityId: contact._id,
        type: 'ai_interaction',
        description: `AI Agent (${agentId}) provided information`,
        metadata: { agentId, sentiment, topic: entities.destination }
      });

      return {
        action: 'engagement_updated',
        contactId: contact._id,
        newScore: contact.engagementScore
      };

    } catch (error) {
      logger.error('Error updating engagement', { error: error.message });
      throw error;
    }
  }

  /**
   * Crear Activity en CRM
   */
  async createActivity({ workspaceId, entityType, entityId, type, description, metadata }) {
    try {
      const activity = await Activity.create({
        workspace: workspaceId,
        entityType,
        entityId,
        type,
        description,
        metadata,
        createdAt: new Date()
      });

      return activity;

    } catch (error) {
      logger.error('Error creating activity', { error: error.message });
      throw error;
    }
  }

  /**
   * Actualizar Lead Score con IA (análisis profundo)
   */
  async updateLeadScoreWithAI(contactId, workspaceId) {
    try {
      const contact = await Contact.findById(contactId);
      if (!contact) return;

      const activities = await Activity.find({ 
        entityType: 'contact', 
        entityId: contactId 
      }).limit(20);

      // Usar customer-prophet para scoring
      const scoringPrompt = `Analyze this lead and provide a score from 0-100:

Contact Information:
- Company: ${contact.company || 'N/A'}
- Email: ${contact.email}
- Lead Source: ${contact.leadSource}
- Current Score: ${contact.leadScore}
- Engagement Score: ${contact.engagementScore}
- Activities: ${activities.length}
- Last Activity: ${contact.lastActivityDate}
- Tags: ${contact.tags.join(', ')}

Custom Fields:
- Destination: ${contact.customFields?.destination || 'N/A'}
- Budget: ${contact.customFields?.estimatedBudget || 'N/A'}
- Travelers: ${contact.customFields?.numberOfTravelers || 'N/A'}
- Interests: ${contact.customFields?.interests?.join(', ') || 'N/A'}

Provide JSON:
{
  "score": 0-100,
  "quality": "hot | warm | cold",
  "reasoning": "why this score",
  "nextSteps": ["recommended actions"],
  "dealPotential": "high | medium | low"
}`;

      const analysis = await this.agentManager.multiAI.process({
        agentId: 'customer-prophet',
        prompt: scoringPrompt,
        temperature: 0.3,
        responseFormat: 'json'
      });

      const result = JSON.parse(analysis.response);

      // Actualizar contact
      contact.leadScore = result.score;
      contact.leadQuality = result.quality;
      contact.aiInsights = {
        reasoning: result.reasoning,
        nextSteps: result.nextSteps,
        dealPotential: result.dealPotential,
        lastUpdated: new Date()
      };
      await contact.save();

      logger.info('Lead score updated with AI', { 
        contactId, 
        newScore: result.score, 
        quality: result.quality 
      });

      return result;

    } catch (error) {
      logger.error('Error updating lead score with AI', { error: error.message });
    }
  }

  /**
   * Auto-asignar sales rep a deal
   */
  async autoAssignSalesRep(dealId, workspaceId) {
    try {
      // TODO: Implementar lógica de round-robin o workload balancing
      // Por ahora, simplemente log
      logger.info('Auto-assigning sales rep to deal', { dealId, workspaceId });

    } catch (error) {
      logger.error('Error auto-assigning sales rep', { error: error.message });
    }
  }

  /**
   * Calcular lead quality
   */
  calculateLeadQuality(sentiment, confidence, entities) {
    let score = confidence * 100;

    // Bonus por sentiment positivo
    if (sentiment === 'positive') score += 10;
    if (sentiment === 'negative') score -= 20;

    // Bonus por datos completos
    if (entities.email) score += 10;
    if (entities.phone) score += 5;
    if (entities.budget) score += 10;
    if (entities.dates) score += 5;

    // Mapear a quality
    if (score >= 80) return 'hot';
    if (score >= 60) return 'warm';
    return 'cold';
  }

  /**
   * Calcular probabilidad de deal
   */
  calculateDealProbability(confidence, urgency) {
    let probability = confidence * 50; // Base 0-50%

    // Ajustar por urgency
    if (urgency === 'high') probability += 30;
    else if (urgency === 'medium') probability += 20;
    else probability += 10;

    return Math.min(Math.round(probability), 90); // Max 90%
  }

  /**
   * Calcular expected close date
   */
  calculateExpectedCloseDate(urgency) {
    const daysToAdd = urgency === 'high' ? 7 : urgency === 'medium' ? 14 : 30;
    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + daysToAdd);
    return closeDate;
  }

  /**
   * Enriquecer lead con datos externos (webhook/API)
   */
  async enrichLead(leadId, workspaceId) {
    try {
      const contact = await Contact.findById(leadId);
      if (!contact) {
        throw new Error('Contact not found');
      }

      // Usar IA para enriquecer con datos externos
      const enrichPrompt = `Based on this contact information, suggest enrichment data:

Contact:
- Name: ${contact.firstName} ${contact.lastName}
- Email: ${contact.email}
- Company: ${contact.company || 'N/A'}
- Destination: ${contact.customFields?.destination || 'N/A'}

Provide JSON with suggested enrichment:
{
  "industry": "suggested industry",
  "companySize": "small | medium | large | enterprise",
  "estimatedRevenue": "revenue range",
  "decisionMaker": true/false,
  "travelFrequency": "low | medium | high",
  "preferredSeasons": ["winter", "summer", etc],
  "recommendations": "personalized recommendations"
}`;

      const enrichment = await this.agentManager.multiAI.process({
        agentId: 'customer-prophet',
        prompt: enrichPrompt,
        temperature: 0.4,
        responseFormat: 'json'
      });

      const enrichedData = JSON.parse(enrichment.response);

      // Actualizar contact con datos enriquecidos
      contact.industry = enrichedData.industry;
      contact.customFields = {
        ...contact.customFields,
        companySize: enrichedData.companySize,
        estimatedRevenue: enrichedData.estimatedRevenue,
        decisionMaker: enrichedData.decisionMaker,
        travelFrequency: enrichedData.travelFrequency,
        preferredSeasons: enrichedData.preferredSeasons,
        aiRecommendations: enrichedData.recommendations
      };
      await contact.save();

      logger.info('Lead enriched with AI', { leadId, enrichedData });

      return enrichedData;

    } catch (error) {
      logger.error('Error enriching lead', { error: error.message });
      throw error;
    }
  }
}

module.exports = AIToCRMBridge;
