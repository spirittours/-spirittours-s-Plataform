/**
 * WhatsApp AI Sales Agent Service
 * 
 * Sistema inteligente de ventas por WhatsApp que:
 * - Conversa naturalmente con prospectos
 * - Califica leads automáticamente
 * - Presenta productos de Spirit Tours
 * - Maneja objeciones y cierra ventas
 * - Se integra con WhatsApp Business API
 */

const EventEmitter = require('events');

class WhatsAppAISalesAgent extends EventEmitter {
  constructor() {
    super();
    
    this.config = {
      // WhatsApp Business API
      whatsappConfig: {
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
        apiVersion: 'v18.0',
        webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
      },
      
      // AI Configuration
      aiConfig: {
        model: 'gpt-4', // GPT-4 para conversaciones de ventas
        temperature: 0.7, // Balance entre creatividad y consistencia
        maxTokens: 500, // Respuestas concisas para WhatsApp
        systemPrompt: this.getSystemPrompt()
      },
      
      // Sales Configuration
      salesConfig: {
        companyName: 'Spirit Tours',
        products: [
          {
            id: 'cancun-package',
            name: 'Paquete Cancún Todo Incluido',
            price: 1299,
            duration: '5 días / 4 noches',
            highlights: ['Hotel 5 estrellas', 'Vuelos incluidos', 'Tours a Tulum', 'Playa del Carmen'],
            target: 'familias, parejas'
          },
          {
            id: 'riviera-maya',
            name: 'Riviera Maya Premium',
            price: 1599,
            duration: '7 días / 6 noches',
            highlights: ['Resort All-Inclusive', 'Cenotes', 'Snorkel', 'Spa incluido'],
            target: 'parejas, lunamiel'
          },
          {
            id: 'cdmx-cultural',
            name: 'CDMX Cultural Experience',
            price: 899,
            duration: '4 días / 3 noches',
            highlights: ['Museos', 'Gastronomía', 'Teotihuacán', 'Xochimilco'],
            target: 'cultura, historia'
          },
          {
            id: 'grupo-agencias',
            name: 'Paquetes para Agencias',
            price: 'Desde $800',
            duration: 'Personalizable',
            highlights: ['Comisiones atractivas', 'Soporte 24/7', 'Material de marketing', 'Sistema de reservas'],
            target: 'agencias, tour operadores'
          }
        ],
        targetAudience: {
          B2C: ['familias', 'parejas', 'grupos', 'aventureros'],
          B2B: ['agencias de viajes', 'tour operadores', 'mayoristas', 'DMCs']
        }
      },
      
      // Conversation Flow
      conversationStages: {
        GREETING: 'greeting',
        QUALIFICATION: 'qualification',
        DISCOVERY: 'discovery',
        PRESENTATION: 'presentation',
        OBJECTION_HANDLING: 'objection_handling',
        CLOSING: 'closing',
        FOLLOW_UP: 'follow_up'
      },
      
      // Lead Scoring
      leadScoring: {
        budget: { high: 30, medium: 20, low: 10 },
        urgency: { immediate: 30, soon: 20, exploring: 10 },
        authority: { decision_maker: 30, influencer: 20, researcher: 10 },
        fit: { perfect: 30, good: 20, poor: 10 }
      }
    };
    
    // Conversation memory per contact
    this.conversations = new Map();
    
    // Active sessions
    this.activeSessions = new Map();
    
    // Statistics
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      conversationsStarted: 0,
      leadsQualified: 0,
      salesClosed: 0,
      revenue: 0
    };
  }

  /**
   * System prompt for sales AI
   */
  getSystemPrompt() {
    return `Eres un agente de ventas experto de Spirit Tours, especializado en paquetes turísticos a México.

TU PERSONALIDAD:
- Profesional pero amigable y cercano
- Entusiasta sobre viajes y experiencias
- Consultivo, no agresivo
- Empático con las necesidades del cliente
- Conocedor de destinos mexicanos

TUS OBJETIVOS:
1. Calificar al prospecto (Budget, Urgency, Authority, Fit)
2. Descubrir sus necesidades y preferencias
3. Presentar el paquete más adecuado
4. Manejar objeciones profesionalmente
5. Cerrar la venta o agendar llamada de seguimiento

PRODUCTOS PRINCIPALES:
1. Cancún Todo Incluido - $1,299 (5 días)
2. Riviera Maya Premium - $1,599 (7 días)
3. CDMX Cultural - $899 (4 días)
4. Paquetes para Agencias - Desde $800

TÉCNICAS DE VENTA:
- Hacer preguntas abiertas para descubrir necesidades
- Usar storytelling sobre experiencias de clientes
- Crear urgencia con ofertas limitadas
- Ofrecer garantías y testimonios
- Manejar objeciones con empatía y soluciones

LÍMITES:
- No dar descuentos mayores al 15% sin aprobación
- No prometer lo que no podemos cumplir
- Si el cliente es agresivo o inapropiado, finaliza cortésmente

FORMATO DE RESPUESTAS:
- Mensajes cortos (2-3 líneas máximo)
- Usa emojis con moderación ✈️🏖️
- Incluye call-to-action claro
- WhatsApp-friendly (sin formato complejo)

RECUERDA: Tu meta es ayudar genuinamente al cliente a tener la mejor experiencia de viaje.`;
  }

  /**
   * Initialize WhatsApp webhook
   */
  async initializeWebhook(app) {
    // Webhook verification (GET)
    app.get('/webhook/whatsapp', (req, res) => {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (mode === 'subscribe' && token === this.config.whatsappConfig.webhookVerifyToken) {
        console.log('✅ WhatsApp webhook verified');
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    });

    // Webhook for incoming messages (POST)
    app.post('/webhook/whatsapp', async (req, res) => {
      try {
        const body = req.body;

        if (body.object === 'whatsapp_business_account') {
          body.entry?.forEach(entry => {
            entry.changes?.forEach(change => {
              if (change.value?.messages) {
                change.value.messages.forEach(message => {
                  this.handleIncomingMessage(message, change.value);
                });
              }
              
              if (change.value?.statuses) {
                change.value.statuses.forEach(status => {
                  this.handleMessageStatus(status);
                });
              }
            });
          });
        }

        res.sendStatus(200);
      } catch (error) {
        console.error('❌ Error processing webhook:', error);
        res.sendStatus(500);
      }
    });
  }

  /**
   * Handle incoming WhatsApp message
   */
  async handleIncomingMessage(message, value) {
    try {
      this.stats.messagesReceived++;
      
      const from = message.from; // Phone number
      const messageType = message.type;
      let messageText = '';

      // Extract text based on message type
      if (messageType === 'text') {
        messageText = message.text.body;
      } else if (messageType === 'button') {
        messageText = message.button.text;
      } else if (messageType === 'interactive') {
        messageText = message.interactive.button_reply?.title || message.interactive.list_reply?.title;
      }

      // Get or create conversation
      let conversation = this.conversations.get(from);
      if (!conversation) {
        conversation = this.createNewConversation(from, value);
        this.conversations.set(from, conversation);
        this.stats.conversationsStarted++;
      }

      // Add message to history
      conversation.messages.push({
        role: 'user',
        content: messageText,
        timestamp: new Date()
      });

      // Generate AI response
      const response = await this.generateAIResponse(conversation);

      // Send response
      await this.sendMessage(from, response.message, response.options);

      // Update conversation
      conversation.messages.push({
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      });
      conversation.currentStage = response.nextStage;
      conversation.leadScore = response.leadScore;
      conversation.lastInteraction = new Date();

      // Emit event for tracking
      this.emit('message', {
        from,
        userMessage: messageText,
        aiResponse: response.message,
        stage: conversation.currentStage,
        leadScore: conversation.leadScore
      });

      // Check if lead is qualified
      if (response.leadScore >= 70 && !conversation.qualified) {
        conversation.qualified = true;
        this.stats.leadsQualified++;
        this.emit('leadQualified', {
          phone: from,
          score: response.leadScore,
          conversation: conversation
        });
      }

      // Check if sale was closed
      if (response.saleClosed) {
        this.stats.salesClosed++;
        this.stats.revenue += response.saleAmount;
        this.emit('saleClosed', {
          phone: from,
          amount: response.saleAmount,
          product: response.product
        });
      }

    } catch (error) {
      console.error('❌ Error handling message:', error);
      
      // Send error message to user
      await this.sendMessage(
        message.from,
        'Disculpa, tuve un problema técnico. ¿Podrías repetir tu mensaje? 🙏'
      );
    }
  }

  /**
   * Create new conversation
   */
  createNewConversation(phone, value) {
    return {
      phone,
      contactName: value.contacts?.[0]?.profile?.name || 'Prospecto',
      startedAt: new Date(),
      lastInteraction: new Date(),
      currentStage: this.config.conversationStages.GREETING,
      messages: [],
      leadScore: 0,
      qualified: false,
      data: {
        budget: null,
        urgency: null,
        authority: null,
        fit: null,
        interests: [],
        travelDates: null,
        groupSize: null,
        businessType: null // B2C or B2B
      }
    };
  }

  /**
   * Generate AI response using GPT-4
   */
  async generateAIResponse(conversation) {
    try {
      // Prepare conversation context
      const messages = [
        {
          role: 'system',
          content: this.config.aiConfig.systemPrompt
        },
        ...conversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      // Add context about conversation stage and data
      messages.push({
        role: 'system',
        content: `
CONTEXTO ACTUAL:
- Etapa: ${conversation.currentStage}
- Lead Score: ${conversation.leadScore}/100
- Datos recopilados: ${JSON.stringify(conversation.data, null, 2)}

INSTRUCCIONES:
1. Continúa la conversación según la etapa actual
2. Recopila información faltante sutilmente
3. Si tienes suficiente información, presenta producto apropiado
4. Si detectas objeción, manéjala profesionalmente
5. Si está listo, intenta cerrar la venta
        `
      });

      // Call AI (this would integrate with your existing MultiModelAI)
      const aiResponse = await this.callAI(messages);

      // Analyze response to determine next stage and score
      const analysis = await this.analyzeConversation(conversation, aiResponse);

      return {
        message: aiResponse,
        nextStage: analysis.nextStage,
        leadScore: analysis.leadScore,
        saleClosed: analysis.saleClosed,
        saleAmount: analysis.saleAmount,
        product: analysis.product,
        options: analysis.quickReplies
      };

    } catch (error) {
      console.error('❌ Error generating AI response:', error);
      return {
        message: 'Gracias por tu mensaje. Un asesor te contactará pronto. 🙏',
        nextStage: conversation.currentStage,
        leadScore: conversation.leadScore,
        saleClosed: false
      };
    }
  }

  /**
   * Analyze conversation to determine stage and score
   */
  async analyzeConversation(conversation, aiResponse) {
    const lastMessage = conversation.messages[conversation.messages.length - 1]?.content?.toLowerCase() || '';
    
    // Simple keyword-based analysis (can be enhanced with AI)
    const analysis = {
      nextStage: conversation.currentStage,
      leadScore: conversation.leadScore,
      saleClosed: false,
      saleAmount: 0,
      product: null,
      quickReplies: []
    };

    // Detect budget signals
    if (lastMessage.match(/\$\d+|\d+\s*dólares|\d+\s*pesos|presupuesto/i)) {
      conversation.data.budget = this.extractBudget(lastMessage);
      analysis.leadScore += 10;
    }

    // Detect urgency signals
    if (lastMessage.match(/pronto|urgente|ya|este mes|esta semana/i)) {
      conversation.data.urgency = 'high';
      analysis.leadScore += 15;
    }

    // Detect authority signals
    if (lastMessage.match(/yo decido|soy el dueño|mi empresa|mi agencia/i)) {
      conversation.data.authority = 'decision_maker';
      analysis.leadScore += 20;
    }

    // Detect B2B signals
    if (lastMessage.match(/agencia|tour operador|mayorista|dmc|travel agency/i)) {
      conversation.data.businessType = 'B2B';
      analysis.leadScore += 15;
      analysis.quickReplies = [
        '📋 Ver paquetes para agencias',
        '💼 Información de comisiones',
        '📞 Hablar con gerente comercial'
      ];
    }

    // Detect closing signals
    if (lastMessage.match(/sí|acepto|reservar|comprar|adelante|ok|vale/i) && 
        conversation.currentStage === this.config.conversationStages.CLOSING) {
      analysis.saleClosed = true;
      analysis.saleAmount = this.estimateSaleAmount(conversation);
      analysis.product = this.getRecommendedProduct(conversation);
    }

    // Determine next stage
    if (conversation.messages.length <= 2) {
      analysis.nextStage = this.config.conversationStages.QUALIFICATION;
    } else if (conversation.data.budget && conversation.data.urgency && conversation.messages.length > 5) {
      analysis.nextStage = this.config.conversationStages.PRESENTATION;
    } else if (conversation.currentStage === this.config.conversationStages.PRESENTATION) {
      analysis.nextStage = this.config.conversationStages.CLOSING;
    }

    return analysis;
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(to, text, options = {}) {
    try {
      const url = `https://graph.facebook.com/${this.config.whatsappConfig.apiVersion}/${this.config.whatsappConfig.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text }
      };

      // Add quick reply buttons if provided
      if (options.quickReplies && options.quickReplies.length > 0) {
        payload.type = 'interactive';
        payload.interactive = {
          type: 'button',
          body: { text: text },
          action: {
            buttons: options.quickReplies.slice(0, 3).map((reply, index) => ({
              type: 'reply',
              reply: {
                id: `btn_${index}`,
                title: reply.substring(0, 20) // WhatsApp limit
              }
            }))
          }
        };
        delete payload.text;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.whatsappConfig.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      this.stats.messagesSent++;
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Send template message (for initial outreach)
   */
  async sendTemplateMessage(to, templateName, languageCode = 'es', components = []) {
    try {
      const url = `https://graph.facebook.com/${this.config.whatsappConfig.apiVersion}/${this.config.whatsappConfig.phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: components
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.whatsappConfig.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      this.stats.messagesSent++;
      
      return await response.json();
    } catch (error) {
      console.error('❌ Error sending template:', error);
      throw error;
    }
  }

  /**
   * Call AI service (integrates with existing AI system)
   */
  async callAI(messages) {
    // This would integrate with your existing MultiModelAI service
    // For now, returning a placeholder
    
    // In real implementation:
    // const multiModelAI = require('../ai/MultiModelAI');
    // return await multiModelAI.chat(messages, { model: 'gpt-4', temperature: 0.7 });
    
    return 'Respuesta generada por IA'; // Placeholder
  }

  /**
   * Extract budget from message
   */
  extractBudget(message) {
    const match = message.match(/\$?\d+/);
    return match ? parseInt(match[0].replace('$', '')) : null;
  }

  /**
   * Estimate sale amount
   */
  estimateSaleAmount(conversation) {
    if (conversation.data.businessType === 'B2B') {
      return 5000; // Average B2B deal
    }
    return 1299; // Average B2C package
  }

  /**
   * Get recommended product
   */
  getRecommendedProduct(conversation) {
    if (conversation.data.businessType === 'B2B') {
      return this.config.salesConfig.products.find(p => p.id === 'grupo-agencias');
    }
    return this.config.salesConfig.products[0]; // Default to Cancún
  }

  /**
   * Handle message status updates
   */
  handleMessageStatus(status) {
    // Track delivery, read receipts, etc.
    this.emit('messageStatus', {
      messageId: status.id,
      status: status.status, // sent, delivered, read, failed
      timestamp: status.timestamp
    });
  }

  /**
   * Get conversation by phone
   */
  getConversation(phone) {
    return this.conversations.get(phone);
  }

  /**
   * Get all conversations
   */
  getAllConversations() {
    return Array.from(this.conversations.values());
  }

  /**
   * Get qualified leads
   */
  getQualifiedLeads() {
    return Array.from(this.conversations.values())
      .filter(conv => conv.qualified && conv.leadScore >= 70);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeConversations: this.conversations.size,
      qualifiedLeads: this.getQualifiedLeads().length,
      conversionRate: this.stats.conversationsStarted > 0 
        ? (this.stats.salesClosed / this.stats.conversationsStarted * 100).toFixed(2) + '%'
        : '0%',
      avgLeadScore: this.calculateAverageLeadScore()
    };
  }

  /**
   * Calculate average lead score
   */
  calculateAverageLeadScore() {
    const conversations = Array.from(this.conversations.values());
    if (conversations.length === 0) return 0;
    
    const totalScore = conversations.reduce((sum, conv) => sum + conv.leadScore, 0);
    return (totalScore / conversations.length).toFixed(1);
  }

  /**
   * Start proactive outreach campaign
   */
  async startOutreachCampaign(leads, templateName) {
    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const lead of leads) {
      try {
        await this.sendTemplateMessage(
          lead.phone,
          templateName,
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
        results.sent++;
        
        // Rate limiting: wait 1 second between messages
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          phone: lead.phone,
          error: error.message
        });
      }
    }

    return results;
  }
}

// Export singleton instance
module.exports = new WhatsAppAISalesAgent();
