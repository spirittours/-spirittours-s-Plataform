/**
 * B2B Outreach Agent - Fase 8
 * 
 * Agente de contacto automatizado multicanal para prospectos B2B.
 * Gestiona campañas de Email, WhatsApp y llamadas telefónicas automatizadas.
 * 
 * Características:
 * - Contacto automatizado multicanal (Email, WhatsApp, Llamadas)
 * - Personalización de mensajes con AI
 * - Seguimiento de respuestas y engagement
 * - Programación inteligente de contactos
 * - A/B testing de mensajes
 * - Integración con ProspectingAgent
 * - Respeto de horarios y preferencias
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');
const { getMultiModelAI } = require('../ai/MultiModelAI');
const { getNotificationService } = require('../notifications/NotificationService');

class OutreachAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Operational settings
      enabled: true,
      runInterval: 30 * 60 * 1000, // 30 minutes
      maxDailyOutreach: 500,
      
      // Contact timing (respecting business hours)
      businessHours: {
        start: 9, // 9 AM
        end: 18,  // 6 PM
        timezone: 'America/New_York'
      },
      
      // Respect quiet days
      respectWeekends: true,
      respectHolidays: true,
      
      // Channel settings
      channels: {
        email: {
          enabled: true,
          priority: 1,
          maxPerDay: 300
        },
        whatsapp: {
          enabled: true,
          priority: 2,
          maxPerDay: 150
        },
        call: {
          enabled: false, // Requires telephony integration
          priority: 3,
          maxPerDay: 50
        }
      },
      
      // Follow-up strategy
      followUpSequence: [
        { day: 0, channel: 'email', type: 'initial' },
        { day: 3, channel: 'email', type: 'follow_up_1' },
        { day: 7, channel: 'whatsapp', type: 'follow_up_2' },
        { day: 14, channel: 'email', type: 'follow_up_3' },
        { day: 21, channel: 'call', type: 'final_attempt' }
      ],
      
      // Message templates by type and channel
      templates: {
        travel_agency: {
          subject_es: '🌍 Oportunidad de colaboración - Destinos únicos para tus clientes',
          subject_en: '🌍 Partnership opportunity - Unique destinations for your clients'
        },
        church: {
          subject_es: '✝️ Peregrinaciones y viajes religiosos personalizados',
          subject_en: '✝️ Customized religious pilgrimages and travel'
        },
        university: {
          subject_es: '🎓 Programas educativos internacionales para estudiantes',
          subject_en: '🎓 International educational programs for students'
        }
      },
      
      // AI settings
      aiProvider: 'openai',
      aiModel: 'gpt-4o-mini',
      personalizationEnabled: true,
      
      // A/B testing
      abTestingEnabled: true,
      testVariants: ['A', 'B'],
      
      ...config
    };
    
    this.aiService = null;
    this.notificationService = null;
    this.initialized = false;
    this.running = false;
    
    this.stats = {
      emailsSent: 0,
      whatsappSent: 0,
      callsAttempted: 0,
      responsesReceived: 0,
      conversions: 0,
      lastRun: null
    };
  }

  /**
   * Initialize the outreach agent
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🚀 Initializing OutreachAgent...');
    
    try {
      // Initialize AI service
      this.aiService = getMultiModelAI();
      
      // Initialize notification service
      this.notificationService = getNotificationService();
      
      // Check database connection
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB not connected');
      }
      
      // Start automated outreach if enabled
      if (this.config.enabled) {
        this.startAutomatedOutreach();
      }
      
      this.initialized = true;
      this.emit('initialized');
      console.log('✅ OutreachAgent initialized successfully');
      console.log(`📧 Email enabled: ${this.config.channels.email.enabled}`);
      console.log(`📱 WhatsApp enabled: ${this.config.channels.whatsapp.enabled}`);
      console.log(`📞 Calls enabled: ${this.config.channels.call.enabled}`);
      
      return true;
    } catch (error) {
      console.error('❌ OutreachAgent initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start automated outreach campaigns
   */
  startAutomatedOutreach() {
    console.log('🔄 Starting automated outreach campaigns...');
    
    // Run immediately
    this.runOutreachCycle();
    
    // Schedule recurring runs
    this.outreachInterval = setInterval(() => {
      this.runOutreachCycle();
    }, this.config.runInterval);
    
    this.running = true;
    this.emit('outreach_started');
  }

  /**
   * Stop automated outreach
   */
  stopAutomatedOutreach() {
    if (this.outreachInterval) {
      clearInterval(this.outreachInterval);
      this.outreachInterval = null;
    }
    
    this.running = false;
    this.emit('outreach_stopped');
    console.log('⏸️  Automated outreach stopped');
  }

  /**
   * Run complete outreach cycle
   */
  async runOutreachCycle() {
    if (!this.initialized) {
      console.log('⚠️  OutreachAgent not initialized, skipping cycle');
      return;
    }
    
    // Check if we're in business hours
    if (!this.isBusinessHours()) {
      console.log('⏰ Outside business hours, skipping outreach cycle');
      return;
    }
    
    console.log('📤 Starting outreach cycle...');
    const startTime = Date.now();
    
    try {
      const results = {
        emailsSent: 0,
        whatsappSent: 0,
        callsAttempted: 0,
        errors: 0
      };
      
      // Get prospects ready for outreach
      const prospects = await this.getProspectsForOutreach();
      console.log(`📋 Found ${prospects.length} prospects for outreach`);
      
      for (const prospect of prospects) {
        try {
          // Determine next action for this prospect
          const action = await this.determineNextAction(prospect);
          
          if (!action) {
            console.log(`⏭️  No action needed for ${prospect.business_name}`);
            continue;
          }
          
          // Execute outreach
          const success = await this.executeOutreach(prospect, action);
          
          if (success) {
            switch (action.channel) {
              case 'email':
                results.emailsSent++;
                break;
              case 'whatsapp':
                results.whatsappSent++;
                break;
              case 'call':
                results.callsAttempted++;
                break;
            }
          }
          
          // Rate limiting between contacts
          await this.sleep(1000); // 1 second between contacts
          
        } catch (error) {
          console.error(`Error processing prospect ${prospect.business_name}:`, error.message);
          results.errors++;
        }
      }
      
      // Update stats
      this.stats.emailsSent += results.emailsSent;
      this.stats.whatsappSent += results.whatsappSent;
      this.stats.callsAttempted += results.callsAttempted;
      this.stats.lastRun = new Date();
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      console.log('✅ Outreach cycle completed:');
      console.log(`   Emails sent: ${results.emailsSent}`);
      console.log(`   WhatsApp sent: ${results.whatsappSent}`);
      console.log(`   Calls attempted: ${results.callsAttempted}`);
      console.log(`   Errors: ${results.errors}`);
      console.log(`   Duration: ${duration}s`);
      
      this.emit('cycle_completed', { results, duration });
      
      return results;
      
    } catch (error) {
      console.error('Error in outreach cycle:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get prospects ready for outreach
   */
  async getProspectsForOutreach() {
    const Prospect = mongoose.model('Prospect');
    
    // Get verified prospects that haven't been contacted yet or need follow-up
    const prospects = await Prospect.find({
      status: { $in: ['verified', 'new'] },
      lead_score: { $gte: 50 }, // Only quality leads
      $or: [
        { 'outreach.email_sent': false },
        { 
          'outreach.email_sent': true,
          'outreach.response_received': false,
          'outreach.email_sent_at': { 
            $lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
          }
        }
      ]
    })
    .limit(100)
    .sort({ lead_score: -1, created_at: 1 });
    
    return prospects;
  }

  /**
   * Determine next action for prospect
   */
  async determineNextAction(prospect) {
    // Check if prospect has email/phone
    if (!prospect.email && !prospect.whatsapp && !prospect.phone) {
      return null;
    }
    
    // Initial contact - prefer email
    if (!prospect.outreach.email_sent && prospect.email && this.config.channels.email.enabled) {
      return {
        channel: 'email',
        type: 'initial',
        priority: 1
      };
    }
    
    // Follow-up via WhatsApp
    if (prospect.outreach.email_sent && 
        !prospect.outreach.whatsapp_sent && 
        prospect.whatsapp && 
        this.config.channels.whatsapp.enabled) {
      
      const daysSinceEmail = this.getDaysSince(prospect.outreach.email_sent_at);
      if (daysSinceEmail >= 3) {
        return {
          channel: 'whatsapp',
          type: 'follow_up',
          priority: 2
        };
      }
    }
    
    // Follow-up via call
    if (prospect.outreach.email_sent && 
        prospect.outreach.whatsapp_sent &&
        !prospect.outreach.call_attempted &&
        prospect.phone &&
        this.config.channels.call.enabled) {
      
      const daysSinceWhatsApp = this.getDaysSince(prospect.outreach.whatsapp_sent_at);
      if (daysSinceWhatsApp >= 7) {
        return {
          channel: 'call',
          type: 'follow_up',
          priority: 3
        };
      }
    }
    
    return null;
  }

  /**
   * Execute outreach action
   */
  async executeOutreach(prospect, action) {
    console.log(`📤 Executing ${action.channel} outreach for ${prospect.business_name}`);
    
    try {
      switch (action.channel) {
        case 'email':
          return await this.sendEmail(prospect, action.type);
        case 'whatsapp':
          return await this.sendWhatsApp(prospect, action.type);
        case 'call':
          return await this.makeCall(prospect, action.type);
        default:
          console.error(`Unknown channel: ${action.channel}`);
          return false;
      }
    } catch (error) {
      console.error(`Error executing ${action.channel} for ${prospect.business_name}:`, error);
      return false;
    }
  }

  /**
   * Send personalized email
   */
  async sendEmail(prospect, type) {
    try {
      // Generate personalized email content
      const emailContent = await this.generateEmailContent(prospect, type);
      
      // Send via notification service
      await this.notificationService.send({
        userId: 'system',
        type: 'prospect_outreach',
        channels: ['email'],
        priority: 'normal',
        data: {
          email: prospect.email,
          subject: emailContent.subject,
          body: emailContent.body,
          html: emailContent.html,
          prospectId: prospect._id,
          trackOpens: true,
          trackClicks: true
        }
      });
      
      // Update prospect
      await prospect.recordEmailSent();
      
      this.emit('email_sent', { prospect, type });
      console.log(`✅ Email sent to ${prospect.business_name}`);
      
      return true;
      
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Generate personalized email content using AI
   */
  async generateEmailContent(prospect, type) {
    try {
      // Determine language (Spanish for Hispanic countries)
      const language = 'es'; // Spanish by default
      
      // Get template base
      const templateKey = this.getTemplateKey(prospect.business_type);
      const template = this.config.templates[templateKey] || this.config.templates.travel_agency;
      
      // Generate personalized content with AI
      const prompt = `Generate a professional B2B outreach email in Spanish for the following prospect:

Business Name: ${prospect.business_name}
Type: ${this.getBusinessTypeLabel(prospect.business_type)}
City: ${prospect.city}, ${prospect.country}
Contact: ${prospect.contact_person || 'Estimado(a) responsable'}

Context: We are Spirit Tours, a tourism company offering unique travel experiences and group tours. We want to establish a partnership.

Email Type: ${type === 'initial' ? 'Initial contact' : 'Follow-up'}

Requirements:
1. Professional and respectful tone
2. Personalized to their business type
3. Clear value proposition
4. Call to action
5. Keep it concise (200-300 words)
6. Include subject line
7. Format in HTML with proper structure

Return format:
Subject: [subject line]
Body: [email body in HTML]`;

      const response = await this.aiService.generate({
        provider: this.config.aiProvider,
        model: this.config.aiModel,
        prompt,
        temperature: 0.7,
        maxTokens: 800
      });
      
      // Parse response
      const text = response.text;
      const subjectMatch = text.match(/Subject:\s*(.+)/i);
      const bodyMatch = text.match(/Body:\s*([\s\S]+)/i);
      
      const subject = subjectMatch 
        ? subjectMatch[1].trim() 
        : template.subject_es || '🌍 Oportunidad de colaboración';
      
      const body = bodyMatch 
        ? bodyMatch[1].trim() 
        : this.getDefaultEmailBody(prospect, language);
      
      // Create HTML version
      const html = body.includes('<html>') 
        ? body 
        : this.createEmailHTML(body, prospect);
      
      return { subject, body, html };
      
    } catch (error) {
      console.error('Error generating email content:', error);
      
      // Fallback to default template
      const template = this.config.templates.travel_agency;
      return {
        subject: template.subject_es,
        body: this.getDefaultEmailBody(prospect, 'es'),
        html: this.createEmailHTML(this.getDefaultEmailBody(prospect, 'es'), prospect)
      };
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(prospect, type) {
    try {
      // Generate personalized WhatsApp message
      const message = await this.generateWhatsAppMessage(prospect, type);
      
      // Send via notification service (requires Twilio integration)
      await this.notificationService.send({
        userId: 'system',
        type: 'prospect_outreach_whatsapp',
        channels: ['sms'], // SMS channel can be used for WhatsApp with Twilio
        priority: 'normal',
        data: {
          phone: prospect.whatsapp || prospect.phone,
          message,
          prospectId: prospect._id
        }
      });
      
      // Update prospect
      prospect.outreach.whatsapp_sent = true;
      prospect.outreach.whatsapp_sent_at = new Date();
      await prospect.save();
      
      this.emit('whatsapp_sent', { prospect, type });
      console.log(`✅ WhatsApp sent to ${prospect.business_name}`);
      
      return true;
      
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      return false;
    }
  }

  /**
   * Generate WhatsApp message
   */
  async generateWhatsAppMessage(prospect, type) {
    const greeting = prospect.contact_person 
      ? `Hola ${prospect.contact_person}` 
      : 'Hola';
    
    const message = `${greeting},

Soy de Spirit Tours 🌍

${type === 'initial' 
  ? 'Me gustaría presentarte nuestra empresa y explorar oportunidades de colaboración.' 
  : 'Te escribí hace unos días y quería saber si recibiste mi correo.'}

Ofrecemos experiencias de viaje únicas para grupos ${this.getTargetAudience(prospect.business_type)}.

¿Tendrías unos minutos esta semana para una breve llamada?

Saludos,
Spirit Tours
www.spirittours.com`;

    return message;
  }

  /**
   * Make phone call (placeholder - requires telephony integration)
   */
  async makeCall(prospect, type) {
    console.log(`📞 Call feature not yet implemented for ${prospect.business_name}`);
    
    // This would integrate with Twilio Voice, Nexmo, or similar
    // For now, just mark as attempted
    prospect.outreach.call_attempted = true;
    prospect.outreach.call_attempted_at = new Date();
    await prospect.save();
    
    this.emit('call_attempted', { prospect, type });
    return true;
  }

  /**
   * Create a campaign for multiple prospects
   */
  async createCampaign(options = {}) {
    const {
      name,
      targetCountries = [],
      targetTypes = [],
      minLeadScore = 50,
      channels = ['email'],
      startDate = new Date(),
      message
    } = options;
    
    try {
      const Campaign = mongoose.model('Campaign');
      const Prospect = mongoose.model('Prospect');
      
      // Find matching prospects
      const query = {
        lead_score: { $gte: minLeadScore },
        status: { $in: ['new', 'verified'] }
      };
      
      if (targetCountries.length > 0) {
        query.country_code = { $in: targetCountries };
      }
      
      if (targetTypes.length > 0) {
        query.business_type = { $in: targetTypes };
      }
      
      const prospects = await Prospect.find(query);
      
      // Create campaign
      const campaign = new Campaign({
        name,
        targetCountries,
        targetTypes,
        minLeadScore,
        channels,
        startDate,
        message,
        prospects: prospects.map(p => p._id),
        status: 'scheduled',
        created_at: new Date()
      });
      
      await campaign.save();
      
      // Assign campaign to prospects
      for (const prospect of prospects) {
        prospect.campaigns.push({
          campaign_id: campaign._id,
          assigned_at: new Date()
        });
        await prospect.save();
      }
      
      this.emit('campaign_created', { campaign, prospectCount: prospects.length });
      console.log(`✅ Campaign created: ${name} with ${prospects.length} prospects`);
      
      return campaign;
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  }

  /**
   * Process responses from prospects
   */
  async processResponse(prospectId, responseData) {
    try {
      const Prospect = mongoose.model('Prospect');
      const prospect = await Prospect.findById(prospectId);
      
      if (!prospect) {
        throw new Error('Prospect not found');
      }
      
      // Analyze response sentiment using AI
      const sentiment = await this.analyzeSentiment(responseData.message);
      
      const interested = sentiment.score > 0.5;
      
      // Update prospect
      await prospect.recordResponse(interested);
      
      // Add note
      await prospect.addNote(
        `Response received: ${responseData.message.substring(0, 100)}... | Sentiment: ${sentiment.label}`,
        'system'
      );
      
      this.stats.responsesReceived++;
      
      if (interested) {
        this.stats.conversions++;
        this.emit('conversion', prospect);
      }
      
      this.emit('response_processed', { prospect, sentiment, interested });
      
      return { success: true, sentiment, interested };
      
    } catch (error) {
      console.error('Error processing response:', error);
      throw error;
    }
  }

  /**
   * Analyze sentiment of response
   */
  async analyzeSentiment(message) {
    try {
      const prompt = `Analyze the sentiment of this business response:

"${message}"

Is the prospect interested in the business opportunity?

Return JSON:
{
  "score": 0.0-1.0,
  "label": "positive/neutral/negative",
  "interested": true/false
}`;

      const response = await this.aiService.generate({
        provider: this.config.aiProvider,
        model: this.config.aiModel,
        prompt,
        temperature: 0.3,
        maxTokens: 100
      });
      
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return { score: 0.5, label: 'neutral', interested: false };
      
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return { score: 0.5, label: 'neutral', interested: false };
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      running: this.running,
      enabled: this.config.enabled,
      conversionRate: this.stats.emailsSent > 0 
        ? (this.stats.conversions / this.stats.emailsSent * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Helper methods
   */
  isBusinessHours() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Check weekends
    if (this.config.respectWeekends && (day === 0 || day === 6)) {
      return false;
    }
    
    // Check business hours
    return hour >= this.config.businessHours.start && hour < this.config.businessHours.end;
  }

  getDaysSince(date) {
    if (!date) return Infinity;
    return Math.floor((Date.now() - new Date(date)) / (24 * 60 * 60 * 1000));
  }

  getTemplateKey(businessType) {
    if (businessType.includes('church')) return 'church';
    if (businessType.includes('university')) return 'university';
    return 'travel_agency';
  }

  getBusinessTypeLabel(type) {
    const labels = {
      travel_agency_receptive: 'Agencia de viaje receptiva',
      travel_agency_wholesale: 'Agencia mayorista',
      tour_operator: 'Tour operador',
      church_catholic: 'Iglesia Católica',
      church_evangelical: 'Iglesia Evangélica',
      university: 'Universidad'
    };
    return labels[type] || type;
  }

  getTargetAudience(businessType) {
    if (businessType.includes('church')) return 'de peregrinaciones y viajes religiosos';
    if (businessType.includes('university')) return 'estudiantiles y educativos';
    return 'turísticos y de aventura';
  }

  getDefaultEmailBody(prospect, language) {
    return `Estimado(a) ${prospect.contact_person || 'responsable'},

Espero que este mensaje le encuentre bien. Mi nombre es [Nombre] y represento a Spirit Tours, una empresa especializada en experiencias de viaje únicas y memorables.

Nos hemos dado cuenta de ${prospect.business_name} y creemos que podríamos establecer una colaboración mutuamente beneficiosa.

¿Tendría disponibilidad para una breve llamada esta semana?

Quedo atento a su respuesta.

Saludos cordiales,
Spirit Tours`;
  }

  createEmailHTML(body, prospect) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2196f3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Spirit Tours</h1>
    </div>
    <div class="content">
      ${body.replace(/\n/g, '<br>')}
    </div>
    <div class="footer">
      <p>Spirit Tours | www.spirittours.com</p>
      <p>Si no desea recibir más correos, responda con "STOP"</p>
    </div>
  </div>
</body>
</html>`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let instance = null;

function getOutreachAgent(config) {
  if (!instance) {
    instance = new OutreachAgent(config);
  }
  return instance;
}

module.exports = {
  OutreachAgent,
  getOutreachAgent
};
