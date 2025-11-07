/**
 * Email Campaign to CRM Bridge Service
 * 
 * Integración entre Email Campaigns y CRM System.
 * Auto-crea Contacts/Leads/Deals desde respuestas de campañas de email.
 * 
 * Features:
 * - Auto-create leads from email campaign responses
 * - Interest level mapping (high/medium/low)
 * - Automatic deal creation for high-interest responses
 * - Campaign performance tracking
 * - Response categorization and tagging
 * - Auto-assign sales reps based on territory
 * - Engagement score tracking
 * 
 * Sprint 1.2 - Email to CRM Integration
 */

const Contact = require('../../models/Contact');
const Deal = require('../../models/Deal');
const Activity = require('../../models/Activity');
const logger = require('../logging/logger');

class EmailToCRMBridge {
  constructor() {
    // Interest level to lead quality mapping
    this.interestToQualityMap = {
      'high': 'hot',
      'very_high': 'hot',
      'medium': 'warm',
      'moderate': 'warm',
      'low': 'cold',
      'very_low': 'cold'
    };

    // Interest level to probability mapping
    this.interestToProbabilityMap = {
      'high': 60,
      'very_high': 70,
      'medium': 40,
      'moderate': 40,
      'low': 20,
      'very_low': 10
    };

    // Campaign type to lead source mapping
    this.campaignTypeToSource = {
      'prospecting': 'Email Campaign - Prospecting',
      'travel_agency': 'Email Campaign - Travel Agency',
      'partnership': 'Email Campaign - Partnership',
      'product_launch': 'Email Campaign - Product Launch',
      'newsletter': 'Email Campaign - Newsletter',
      'event': 'Email Campaign - Event',
      're-engagement': 'Email Campaign - Re-engagement'
    };
  }

  /**
   * Procesar respuesta de campaña de email y crear registros en CRM
   */
  async processCampaignResponse(campaignId, response, workspaceId) {
    try {
      logger.info('Processing email campaign response', { campaignId, workspaceId });

      const { 
        email, 
        agencyName, 
        contactName,
        phone,
        interest_level, 
        responseText,
        campaignType,
        metadata 
      } = response;

      // Validar datos mínimos
      if (!email) {
        logger.warn('Email response missing email address', { campaignId });
        return { success: false, reason: 'missing_email' };
      }

      // Verificar si contact ya existe
      let contact = await Contact.findOne({ 
        workspace: workspaceId, 
        email 
      });

      let action = 'contact_updated';

      if (!contact) {
        // Crear nuevo contact
        contact = await this.createContactFromEmail({
          email,
          agencyName,
          contactName,
          phone,
          interest_level,
          responseText,
          campaignId,
          campaignType,
          workspaceId,
          metadata
        });
        action = 'contact_created';
      } else {
        // Actualizar contact existente
        await this.updateExistingContact(contact, {
          interest_level,
          responseText,
          campaignId,
          agencyName,
          phone
        });
      }

      // Crear activity
      await this.createActivity({
        workspaceId,
        entityType: 'contact',
        entityId: contact._id,
        type: 'email_response',
        description: `Responded to email campaign (${campaignId}): ${interest_level} interest`,
        metadata: {
          campaignId,
          campaignType,
          interest_level,
          responseText: responseText?.substring(0, 200)
        }
      });

      // Si alto interés, crear Deal automáticamente
      let dealResult = null;
      if (interest_level === 'high' || interest_level === 'very_high') {
        dealResult = await this.autoCreateDeal(
          contact._id,
          campaignId,
          interest_level,
          workspaceId,
          metadata
        );
      }

      logger.info('Email campaign response processed', { 
        campaignId, 
        action, 
        contactId: contact._id,
        dealCreated: !!dealResult
      });

      return {
        success: true,
        action,
        contactId: contact._id,
        dealId: dealResult?.dealId,
        leadQuality: contact.leadQuality,
        message: dealResult 
          ? 'Contact and deal created successfully' 
          : 'Contact created/updated successfully'
      };

    } catch (error) {
      logger.error('Error processing email campaign response', { 
        error: error.message, 
        campaignId 
      });
      throw error;
    }
  }

  /**
   * Crear nuevo contact desde respuesta de email
   */
  async createContactFromEmail({
    email,
    agencyName,
    contactName,
    phone,
    interest_level,
    responseText,
    campaignId,
    campaignType,
    workspaceId,
    metadata
  }) {
    try {
      // Parsear nombre si está disponible
      const nameParts = contactName ? contactName.split(' ') : ['Email', 'Lead'];
      const firstName = nameParts[0] || 'Email';
      const lastName = nameParts.slice(1).join(' ') || 'Lead';

      // Calcular lead score inicial basado en interés
      const leadScore = this.calculateInitialLeadScore(interest_level, metadata);
      const leadQuality = this.interestToQualityMap[interest_level] || 'warm';
      const leadSource = this.campaignTypeToSource[campaignType] || 'Email Campaign';

      const contact = await Contact.create({
        workspace: workspaceId,
        type: 'lead',
        firstName,
        lastName,
        email,
        phone,
        company: agencyName,
        
        // Lead scoring
        leadScore,
        leadQuality,
        leadSource,
        
        // Engagement
        engagementScore: this.getEngagementScoreFromInterest(interest_level),
        lastActivityDate: new Date(),
        
        // Metadata
        tags: ['email-campaign', campaignType || 'prospecting', interest_level],
        notes: `Email Campaign Lead (${campaignId})\n\nInterest Level: ${interest_level}\n\nResponse: ${responseText?.substring(0, 300) || 'No response text'}`,
        
        // Custom fields
        customFields: {
          campaignId,
          campaignType,
          interestLevel: interest_level,
          firstResponseDate: new Date(),
          responseCount: 1,
          ...metadata
        }
      });

      logger.info('Contact created from email campaign', { 
        contactId: contact._id, 
        campaignId, 
        leadQuality 
      });

      return contact;

    } catch (error) {
      logger.error('Error creating contact from email', { error: error.message });
      throw error;
    }
  }

  /**
   * Actualizar contact existente con nueva respuesta
   */
  async updateExistingContact(contact, { interest_level, responseText, campaignId, agencyName, phone }) {
    try {
      // Incrementar engagement score
      contact.engagementScore = (contact.engagementScore || 0) + 
        this.getEngagementScoreFromInterest(interest_level);
      
      // Actualizar lead quality si mejora
      const newQuality = this.interestToQualityMap[interest_level];
      if (this.isQualityBetter(newQuality, contact.leadQuality)) {
        contact.leadQuality = newQuality;
        contact.leadScore = Math.max(
          contact.leadScore || 0,
          this.calculateInitialLeadScore(interest_level, {})
        );
      }

      // Actualizar last activity
      contact.lastActivityDate = new Date();

      // Agregar tags si no existen
      if (!contact.tags.includes('email-campaign')) {
        contact.tags.push('email-campaign');
      }
      if (!contact.tags.includes(interest_level)) {
        contact.tags.push(interest_level);
      }

      // Actualizar company/phone si no existían
      if (!contact.company && agencyName) {
        contact.company = agencyName;
      }
      if (!contact.phone && phone) {
        contact.phone = phone;
      }

      // Actualizar custom fields
      contact.customFields = {
        ...contact.customFields,
        lastCampaignId: campaignId,
        lastInterestLevel: interest_level,
        responseCount: (contact.customFields?.responseCount || 0) + 1,
        lastResponseDate: new Date()
      };

      // Agregar respuesta a notas
      const newNote = `\n\n[${new Date().toISOString()}] Campaign Response (${interest_level}):\n${responseText?.substring(0, 200) || 'No text'}`;
      contact.notes = (contact.notes || '') + newNote;

      await contact.save();

      logger.info('Contact updated with email response', { 
        contactId: contact._id, 
        campaignId,
        newQuality: contact.leadQuality 
      });

      return contact;

    } catch (error) {
      logger.error('Error updating contact', { error: error.message });
      throw error;
    }
  }

  /**
   * Auto-crear Deal para respuestas de alto interés
   */
  async autoCreateDeal(contactId, campaignId, interest_level, workspaceId, metadata) {
    try {
      // Verificar si ya existe deal activo para este contact
      const existingDeal = await Deal.findOne({
        workspace: workspaceId,
        contact: contactId,
        stage: { $nin: ['won', 'lost'] }
      });

      if (existingDeal) {
        // Actualizar deal existente
        existingDeal.probability = Math.max(
          existingDeal.probability,
          this.interestToProbabilityMap[interest_level]
        );
        existingDeal.lastActivityDate = new Date();
        
        if (!existingDeal.tags.includes('high-interest-email')) {
          existingDeal.tags.push('high-interest-email');
        }
        
        await existingDeal.save();

        await this.createActivity({
          workspaceId,
          entityType: 'deal',
          entityId: existingDeal._id,
          type: 'email_response',
          description: `High interest email response received (${interest_level})`,
          metadata: { campaignId, interest_level }
        });

        return {
          action: 'deal_updated',
          dealId: existingDeal._id,
          probability: existingDeal.probability
        };
      }

      // Obtener contact info para título
      const contact = await Contact.findById(contactId);
      const dealTitle = contact.company 
        ? `Partnership Opportunity - ${contact.company}`
        : `Travel Opportunity - ${contact.firstName} ${contact.lastName}`;

      // Calcular valor estimado basado en metadata
      const estimatedValue = metadata?.estimatedBudget || metadata?.dealSize || 10000;
      const probability = this.interestToProbabilityMap[interest_level];

      // Crear nuevo deal
      const deal = await Deal.create({
        workspace: workspaceId,
        title: dealTitle,
        contact: contactId,
        
        // Value
        value: estimatedValue,
        currency: 'USD',
        
        // Stage - empezar en qualification para alto interés
        stage: 'qualification',
        probability,
        
        // Source
        source: `Email Campaign: ${campaignId}`,
        
        // Dates
        expectedCloseDate: this.calculateExpectedCloseDate(interest_level),
        lastActivityDate: new Date(),
        
        // Metadata
        tags: ['auto-created', 'email-campaign', 'high-interest-email'],
        description: `Auto-created from email campaign ${campaignId}\n\nInterest Level: ${interest_level}\nLead Quality: High\n\nContact showed strong interest in partnership/travel opportunities.`
      });

      // Crear activity
      await this.createActivity({
        workspaceId,
        entityType: 'deal',
        entityId: deal._id,
        type: 'deal_created',
        description: `New deal auto-created from high-interest email response`,
        metadata: { campaignId, interest_level, probability }
      });

      // Auto-asignar sales rep
      setTimeout(() => {
        this.autoAssignSalesRep(deal._id, workspaceId, metadata);
      }, 1000);

      logger.info('Deal auto-created from email response', { 
        dealId: deal._id, 
        campaignId, 
        probability 
      });

      return {
        action: 'deal_created',
        dealId: deal._id,
        probability,
        value: estimatedValue
      };

    } catch (error) {
      logger.error('Error auto-creating deal', { error: error.message });
      throw error;
    }
  }

  /**
   * Sincronizar campaña completa con CRM
   */
  async syncCampaignToCRM(campaignId, campaignData, workspaceId) {
    try {
      logger.info('Syncing email campaign to CRM', { campaignId, workspaceId });

      const { responses, campaignType, sentCount, responseRate } = campaignData;

      if (!responses || responses.length === 0) {
        return {
          success: true,
          message: 'No responses to sync',
          stats: { processed: 0, leads: 0, deals: 0 }
        };
      }

      const results = {
        processed: 0,
        leadsCreated: 0,
        leadsUpdated: 0,
        dealsCreated: 0,
        errors: []
      };

      // Procesar cada respuesta
      for (const response of responses) {
        try {
          const result = await this.processCampaignResponse(
            campaignId,
            { ...response, campaignType },
            workspaceId
          );

          results.processed++;
          
          if (result.action === 'contact_created') {
            results.leadsCreated++;
          } else if (result.action === 'contact_updated') {
            results.leadsUpdated++;
          }
          
          if (result.dealId) {
            results.dealsCreated++;
          }

        } catch (error) {
          results.errors.push({
            email: response.email,
            error: error.message
          });
        }
      }

      logger.info('Campaign sync completed', { campaignId, results });

      return {
        success: true,
        message: 'Campaign synced successfully',
        stats: results
      };

    } catch (error) {
      logger.error('Error syncing campaign', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtener impacto de campaña en CRM
   */
  async getCampaignCRMImpact(campaignId, workspaceId) {
    try {
      // Contar contacts creados por esta campaña
      const contacts = await Contact.find({
        workspace: workspaceId,
        'customFields.campaignId': campaignId
      });

      // Contar deals asociados
      const deals = await Deal.find({
        workspace: workspaceId,
        source: { $regex: campaignId }
      });

      // Calcular estadísticas
      const totalLeads = contacts.length;
      const hotLeads = contacts.filter(c => c.leadQuality === 'hot').length;
      const warmLeads = contacts.filter(c => c.leadQuality === 'warm').length;
      const coldLeads = contacts.filter(c => c.leadQuality === 'cold').length;

      const totalDeals = deals.length;
      const wonDeals = deals.filter(d => d.stage === 'won').length;
      const activeDeals = deals.filter(d => !['won', 'lost'].includes(d.stage)).length;
      const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
      const wonValue = deals.filter(d => d.stage === 'won').reduce((sum, d) => sum + (d.value || 0), 0);

      const avgLeadScore = totalLeads > 0
        ? Math.round(contacts.reduce((sum, c) => sum + (c.leadScore || 0), 0) / totalLeads)
        : 0;

      const conversionRate = totalLeads > 0
        ? Math.round((totalDeals / totalLeads) * 100)
        : 0;

      const winRate = totalDeals > 0
        ? Math.round((wonDeals / totalDeals) * 100)
        : 0;

      return {
        leads: {
          total: totalLeads,
          hot: hotLeads,
          warm: warmLeads,
          cold: coldLeads,
          avgScore: avgLeadScore
        },
        deals: {
          total: totalDeals,
          active: activeDeals,
          won: wonDeals,
          totalValue,
          wonValue
        },
        metrics: {
          conversionRate,
          winRate,
          roi: wonValue > 0 ? Math.round((wonValue / totalValue) * 100) : 0
        }
      };

    } catch (error) {
      logger.error('Error getting campaign CRM impact', { error: error.message });
      throw error;
    }
  }

  /**
   * Helper: Calcular lead score inicial
   */
  calculateInitialLeadScore(interest_level, metadata) {
    let score = 50; // Base score

    // Ajustar por interés
    const interestScores = {
      'very_high': 40,
      'high': 30,
      'medium': 20,
      'moderate': 15,
      'low': 5,
      'very_low': 0
    };
    score += interestScores[interest_level] || 10;

    // Bonus por metadata
    if (metadata?.hasWebsite) score += 5;
    if (metadata?.companySize === 'large') score += 10;
    if (metadata?.budgetIndicator === 'high') score += 10;
    if (metadata?.decisionMaker === true) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Helper: Engagement score desde interés
   */
  getEngagementScoreFromInterest(interest_level) {
    const scores = {
      'very_high': 25,
      'high': 20,
      'medium': 15,
      'moderate': 10,
      'low': 5,
      'very_low': 2
    };
    return scores[interest_level] || 10;
  }

  /**
   * Helper: Comparar calidad de leads
   */
  isQualityBetter(newQuality, currentQuality) {
    const qualityRank = { 'hot': 3, 'warm': 2, 'cold': 1 };
    return (qualityRank[newQuality] || 0) > (qualityRank[currentQuality] || 0);
  }

  /**
   * Helper: Calcular expected close date
   */
  calculateExpectedCloseDate(interest_level) {
    const daysMap = {
      'very_high': 14,
      'high': 21,
      'medium': 30,
      'moderate': 45,
      'low': 60
    };
    const daysToAdd = daysMap[interest_level] || 30;
    
    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + daysToAdd);
    return closeDate;
  }

  /**
   * Helper: Auto-asignar sales rep
   */
  async autoAssignSalesRep(dealId, workspaceId, metadata) {
    try {
      // TODO: Implementar lógica de asignación basada en:
      // - Territorio/región
      // - Carga de trabajo (round-robin)
      // - Especialización del rep
      // - Disponibilidad

      logger.info('Auto-assigning sales rep to deal', { 
        dealId, 
        workspaceId,
        territory: metadata?.territory 
      });

    } catch (error) {
      logger.error('Error auto-assigning sales rep', { error: error.message });
    }
  }

  /**
   * Helper: Crear Activity
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
}

module.exports = EmailToCRMBridge;
