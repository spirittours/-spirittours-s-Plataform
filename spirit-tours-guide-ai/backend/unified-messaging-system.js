/**
 * Unified Messaging System - Spirit Tours AI Guide
 * 
 * Sistema de mensajería unificada que integra múltiples canales:
 * - WhatsApp Business API
 * - Google Business Messages
 * - (Extensible a otros canales en el futuro)
 * 
 * Características:
 * - Inbox unificado para todos los canales
 * - Routing inteligente de mensajes
 * - Rich cards y mensajes interactivos
 * - Agent handoff y queue management
 * - Suggested replies automáticos
 * - Analytics por canal
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class UnifiedMessagingSystem extends EventEmitter {
  constructor(whatsappService, db, redisClient) {
    super();
    this.whatsappService = whatsappService;
    this.db = db;
    this.redis = redisClient;
    
    // Canales soportados
    this.channels = {
      WHATSAPP: 'whatsapp',
      GOOGLE_MESSAGES: 'google_messages',
      SMS: 'sms', // Futuro
      TELEGRAM: 'telegram', // Futuro
    };
    
    // Estados de conversación
    this.conversationStates = {
      ACTIVE: 'active',
      QUEUED: 'queued',
      ASSIGNED: 'assigned',
      RESOLVED: 'resolved',
      CLOSED: 'closed',
    };
    
    // Estados de agente
    this.agentStates = {
      AVAILABLE: 'available',
      BUSY: 'busy',
      OFFLINE: 'offline',
      AWAY: 'away',
    };
    
    // Tipos de mensajes
    this.messageTypes = {
      TEXT: 'text',
      IMAGE: 'image',
      VIDEO: 'video',
      AUDIO: 'audio',
      DOCUMENT: 'document',
      LOCATION: 'location',
      RICH_CARD: 'rich_card',
      INTERACTIVE: 'interactive',
      SUGGESTED_REPLY: 'suggested_reply',
    };
    
    this.initDatabase();
    this.setupGoogleBusinessMessages();
  }
  
  /**
   * Inicializar esquema de base de datos
   */
  async initDatabase() {
    try {
      // Tabla de conversaciones unificadas
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS unified_conversations (
          id SERIAL PRIMARY KEY,
          conversation_id VARCHAR(100) UNIQUE NOT NULL,
          channel VARCHAR(50) NOT NULL,
          channel_conversation_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(100),
          user_name VARCHAR(255),
          user_phone VARCHAR(50),
          user_email VARCHAR(255),
          status VARCHAR(50) DEFAULT 'active',
          assigned_agent_id VARCHAR(100),
          priority INTEGER DEFAULT 0,
          tags JSONB,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_message_at TIMESTAMP,
          closed_at TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_conversations_channel 
        ON unified_conversations(channel, status);
        
        CREATE INDEX IF NOT EXISTS idx_conversations_agent 
        ON unified_conversations(assigned_agent_id, status);
        
        CREATE INDEX IF NOT EXISTS idx_conversations_updated 
        ON unified_conversations(updated_at DESC);
      `);
      
      // Tabla de mensajes unificados
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS unified_messages (
          id SERIAL PRIMARY KEY,
          message_id VARCHAR(100) UNIQUE NOT NULL,
          conversation_id VARCHAR(100) NOT NULL,
          channel VARCHAR(50) NOT NULL,
          channel_message_id VARCHAR(255),
          direction VARCHAR(20) NOT NULL,
          message_type VARCHAR(50) NOT NULL,
          content TEXT,
          media_url VARCHAR(500),
          rich_content JSONB,
          sender_id VARCHAR(100),
          sender_name VARCHAR(255),
          sender_type VARCHAR(50),
          status VARCHAR(50) DEFAULT 'sent',
          read_at TIMESTAMP,
          delivered_at TIMESTAMP,
          failed_reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES unified_conversations(conversation_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_messages_conversation 
        ON unified_messages(conversation_id, created_at DESC);
        
        CREATE INDEX IF NOT EXISTS idx_messages_status 
        ON unified_messages(status, created_at);
      `);
      
      // Tabla de agentes
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS messaging_agents (
          id SERIAL PRIMARY KEY,
          agent_id VARCHAR(100) UNIQUE NOT NULL,
          agent_name VARCHAR(255) NOT NULL,
          agent_email VARCHAR(255),
          status VARCHAR(50) DEFAULT 'offline',
          max_concurrent_chats INTEGER DEFAULT 5,
          current_chats_count INTEGER DEFAULT 0,
          skills JSONB,
          channels JSONB,
          last_active_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_agents_status 
        ON messaging_agents(status);
      `);
      
      // Tabla de queue de conversaciones
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS conversation_queue (
          id SERIAL PRIMARY KEY,
          conversation_id VARCHAR(100) NOT NULL,
          priority INTEGER DEFAULT 0,
          wait_time_seconds INTEGER DEFAULT 0,
          required_skills JSONB,
          queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          assigned_at TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES unified_conversations(conversation_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_queue_priority 
        ON conversation_queue(priority DESC, queued_at ASC);
      `);
      
      // Tabla de templates de mensajes
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS message_templates (
          id SERIAL PRIMARY KEY,
          template_id VARCHAR(100) UNIQUE NOT NULL,
          template_name VARCHAR(255) NOT NULL,
          channel VARCHAR(50) NOT NULL,
          template_type VARCHAR(50) NOT NULL,
          content TEXT,
          rich_content JSONB,
          variables JSONB,
          category VARCHAR(100),
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_templates_channel 
        ON message_templates(channel, status);
      `);
      
      // Tabla de analytics de mensajería
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS messaging_analytics (
          id SERIAL PRIMARY KEY,
          metric_date DATE NOT NULL,
          channel VARCHAR(50) NOT NULL,
          messages_sent INTEGER DEFAULT 0,
          messages_received INTEGER DEFAULT 0,
          conversations_started INTEGER DEFAULT 0,
          conversations_resolved INTEGER DEFAULT 0,
          avg_response_time_seconds INTEGER DEFAULT 0,
          avg_resolution_time_seconds INTEGER DEFAULT 0,
          agent_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(metric_date, channel, agent_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_analytics_date 
        ON messaging_analytics(metric_date DESC, channel);
      `);
      
      console.log('✅ Unified Messaging System: Database initialized');
    } catch (error) {
      console.error('❌ Error initializing messaging database:', error);
      throw error;
    }
  }
  
  /**
   * Configurar Google Business Messages
   */
  setupGoogleBusinessMessages() {
    // Google Business Messages configuration
    this.googleConfig = {
      projectId: process.env.GOOGLE_PROJECT_ID,
      credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH,
      conversationId: process.env.GOOGLE_CONVERSATION_ID,
    };
    
    // Initialize Google client (placeholder - requires actual Google SDK)
    console.log('📱 Google Business Messages configured');
  }
  
  /**
   * Enviar mensaje a través del canal apropiado
   */
  async sendMessage(conversationId, messageData) {
    try {
      const conversation = await this.getConversation(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      const messageId = `MSG-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      
      let channelResponse;
      
      // Routing según canal
      switch (conversation.channel) {
        case this.channels.WHATSAPP:
          channelResponse = await this.sendWhatsAppMessage(conversation, messageData);
          break;
          
        case this.channels.GOOGLE_MESSAGES:
          channelResponse = await this.sendGoogleMessage(conversation, messageData);
          break;
          
        default:
          throw new Error(`Unsupported channel: ${conversation.channel}`);
      }
      
      // Guardar mensaje en base de datos
      const message = await this.db.query(`
        INSERT INTO unified_messages 
        (message_id, conversation_id, channel, channel_message_id, direction, 
         message_type, content, media_url, rich_content, sender_id, sender_name, 
         sender_type, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        messageId,
        conversationId,
        conversation.channel,
        channelResponse.messageId,
        'outbound',
        messageData.type || this.messageTypes.TEXT,
        messageData.text,
        messageData.mediaUrl,
        JSON.stringify(messageData.richContent || {}),
        messageData.senderId,
        messageData.senderName,
        'agent',
        'sent'
      ]);
      
      // Actualizar última actividad de conversación
      await this.db.query(`
        UPDATE unified_conversations 
        SET last_message_at = NOW(), updated_at = NOW()
        WHERE conversation_id = $1
      `, [conversationId]);
      
      // Emitir evento
      this.emit('message:sent', {
        conversationId,
        messageId,
        channel: conversation.channel,
        message: message.rows[0]
      });
      
      // Update analytics
      await this.updateAnalytics(conversation.channel, 'messages_sent');
      
      return {
        success: true,
        messageId,
        channelMessageId: channelResponse.messageId,
        message: message.rows[0]
      };
      
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
  
  /**
   * Enviar mensaje por WhatsApp
   */
  async sendWhatsAppMessage(conversation, messageData) {
    if (!this.whatsappService) {
      throw new Error('WhatsApp service not configured');
    }
    
    const to = conversation.user_phone;
    
    if (messageData.type === this.messageTypes.TEXT) {
      return await this.whatsappService.sendTextMessage(to, messageData.text);
    } else if (messageData.type === this.messageTypes.RICH_CARD) {
      // Send as WhatsApp template or interactive message
      return await this.whatsappService.sendTemplateMessage(to, messageData.richContent);
    }
    
    return { messageId: `wa-${Date.now()}` };
  }
  
  /**
   * Enviar mensaje por Google Business Messages
   */
  async sendGoogleMessage(conversation, messageData) {
    // Google Business Messages API call (placeholder)
    // Requires Google Business Communications API SDK
    
    const googleMessagePayload = {
      name: conversation.channel_conversation_id,
      messageId: `gbm-${Date.now()}`,
      text: messageData.text,
    };
    
    // Add rich content if present
    if (messageData.richContent) {
      googleMessagePayload.richCard = this.formatGoogleRichCard(messageData.richContent);
    }
    
    // Add suggested replies if present
    if (messageData.suggestedReplies) {
      googleMessagePayload.suggestions = messageData.suggestedReplies.map(reply => ({
        reply: {
          text: reply.text,
          postbackData: reply.value
        }
      }));
    }
    
    console.log('📱 Sending Google Business Message:', googleMessagePayload);
    
    // Simulated response (replace with actual API call)
    return {
      messageId: googleMessagePayload.messageId
    };
  }
  
  /**
   * Formatear rich card para Google Business Messages
   */
  formatGoogleRichCard(richContent) {
    return {
      standaloneCard: {
        cardContent: {
          title: richContent.title,
          description: richContent.description,
          media: richContent.imageUrl ? {
            height: 'MEDIUM',
            contentInfo: {
              fileUrl: richContent.imageUrl,
              forceRefresh: false
            }
          } : undefined,
          suggestions: richContent.buttons?.map(button => ({
            action: {
              text: button.text,
              postbackData: button.value,
              openUrlAction: button.url ? {
                url: button.url
              } : undefined
            }
          }))
        }
      }
    };
  }
  
  /**
   * Recibir mensaje entrante (webhook handler)
   */
  async receiveMessage(channel, webhookData) {
    try {
      // Parse webhook data según canal
      const parsedMessage = await this.parseIncomingMessage(channel, webhookData);
      
      // Buscar o crear conversación
      let conversation = await this.findConversationByChannelId(
        channel,
        parsedMessage.channelConversationId
      );
      
      if (!conversation) {
        conversation = await this.createConversation(channel, parsedMessage);
      }
      
      // Guardar mensaje
      const messageId = `MSG-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      
      const message = await this.db.query(`
        INSERT INTO unified_messages 
        (message_id, conversation_id, channel, channel_message_id, direction, 
         message_type, content, media_url, sender_id, sender_name, sender_type, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        messageId,
        conversation.conversation_id,
        channel,
        parsedMessage.channelMessageId,
        'inbound',
        parsedMessage.type,
        parsedMessage.text,
        parsedMessage.mediaUrl,
        parsedMessage.senderId,
        parsedMessage.senderName,
        'user',
        'received'
      ]);
      
      // Actualizar conversación
      await this.db.query(`
        UPDATE unified_conversations 
        SET last_message_at = NOW(), updated_at = NOW()
        WHERE conversation_id = $1
      `, [conversation.conversation_id]);
      
      // Emitir evento
      this.emit('message:received', {
        conversationId: conversation.conversation_id,
        messageId,
        channel,
        message: message.rows[0],
        conversation
      });
      
      // Auto-routing si no hay agente asignado
      if (!conversation.assigned_agent_id) {
        await this.autoAssignAgent(conversation.conversation_id);
      }
      
      // Update analytics
      await this.updateAnalytics(channel, 'messages_received');
      
      return {
        success: true,
        messageId,
        conversationId: conversation.conversation_id
      };
      
    } catch (error) {
      console.error('Error receiving message:', error);
      throw error;
    }
  }
  
  /**
   * Parsear mensaje entrante según canal
   */
  async parseIncomingMessage(channel, webhookData) {
    switch (channel) {
      case this.channels.WHATSAPP:
        return this.parseWhatsAppMessage(webhookData);
        
      case this.channels.GOOGLE_MESSAGES:
        return this.parseGoogleMessage(webhookData);
        
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }
  
  /**
   * Parsear mensaje de WhatsApp
   */
  parseWhatsAppMessage(webhookData) {
    const message = webhookData.messages?.[0];
    
    return {
      channelConversationId: message.from,
      channelMessageId: message.id,
      type: message.type,
      text: message.text?.body || message.caption,
      mediaUrl: message.image?.link || message.video?.link,
      senderId: message.from,
      senderName: webhookData.contacts?.[0]?.profile?.name || 'Unknown',
    };
  }
  
  /**
   * Parsear mensaje de Google Business Messages
   */
  parseGoogleMessage(webhookData) {
    return {
      channelConversationId: webhookData.conversationId,
      channelMessageId: webhookData.messageId,
      type: webhookData.text ? 'text' : webhookData.suggestionResponse ? 'suggested_reply' : 'unknown',
      text: webhookData.text || webhookData.suggestionResponse?.text,
      senderId: webhookData.context?.userInfo?.displayName || 'user',
      senderName: webhookData.context?.userInfo?.displayName || 'Unknown',
    };
  }
  
  /**
   * Buscar conversación por ID de canal
   */
  async findConversationByChannelId(channel, channelConversationId) {
    const result = await this.db.query(`
      SELECT * FROM unified_conversations
      WHERE channel = $1 AND channel_conversation_id = $2
    `, [channel, channelConversationId]);
    
    return result.rows[0];
  }
  
  /**
   * Crear nueva conversación
   */
  async createConversation(channel, messageData) {
    const conversationId = `CONV-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    const result = await this.db.query(`
      INSERT INTO unified_conversations 
      (conversation_id, channel, channel_conversation_id, user_name, user_phone, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      conversationId,
      channel,
      messageData.channelConversationId,
      messageData.senderName,
      messageData.senderId,
      this.conversationStates.ACTIVE
    ]);
    
    this.emit('conversation:created', {
      conversationId,
      channel,
      conversation: result.rows[0]
    });
    
    // Update analytics
    await this.updateAnalytics(channel, 'conversations_started');
    
    return result.rows[0];
  }
  
  /**
   * Obtener conversación
   */
  async getConversation(conversationId) {
    const result = await this.db.query(`
      SELECT * FROM unified_conversations WHERE conversation_id = $1
    `, [conversationId]);
    
    return result.rows[0];
  }
  
  /**
   * Obtener mensajes de conversación
   */
  async getConversationMessages(conversationId, limit = 50, offset = 0) {
    const result = await this.db.query(`
      SELECT * FROM unified_messages
      WHERE conversation_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [conversationId, limit, offset]);
    
    return result.rows;
  }
  
  /**
   * Asignar agente automáticamente
   */
  async autoAssignAgent(conversationId) {
    try {
      // Buscar agente disponible
      const agent = await this.findAvailableAgent();
      
      if (agent) {
        await this.assignAgent(conversationId, agent.agent_id);
      } else {
        // Agregar a queue si no hay agentes disponibles
        await this.addToQueue(conversationId);
      }
    } catch (error) {
      console.error('Error auto-assigning agent:', error);
    }
  }
  
  /**
   * Buscar agente disponible
   */
  async findAvailableAgent() {
    const result = await this.db.query(`
      SELECT * FROM messaging_agents
      WHERE status = $1 AND current_chats_count < max_concurrent_chats
      ORDER BY current_chats_count ASC, last_active_at DESC
      LIMIT 1
    `, [this.agentStates.AVAILABLE]);
    
    return result.rows[0];
  }
  
  /**
   * Asignar agente a conversación
   */
  async assignAgent(conversationId, agentId) {
    await this.db.query(`
      UPDATE unified_conversations
      SET assigned_agent_id = $1, status = $2, updated_at = NOW()
      WHERE conversation_id = $3
    `, [agentId, this.conversationStates.ASSIGNED, conversationId]);
    
    await this.db.query(`
      UPDATE messaging_agents
      SET current_chats_count = current_chats_count + 1
      WHERE agent_id = $1
    `, [agentId]);
    
    // Remove from queue if it was queued
    await this.db.query(`
      DELETE FROM conversation_queue WHERE conversation_id = $1
    `, [conversationId]);
    
    this.emit('agent:assigned', { conversationId, agentId });
    
    return { success: true };
  }
  
  /**
   * Agregar conversación a queue
   */
  async addToQueue(conversationId, priority = 0) {
    await this.db.query(`
      INSERT INTO conversation_queue (conversation_id, priority)
      VALUES ($1, $2)
      ON CONFLICT (conversation_id) DO UPDATE SET priority = $2
    `, [conversationId, priority]);
    
    await this.db.query(`
      UPDATE unified_conversations
      SET status = $1, updated_at = NOW()
      WHERE conversation_id = $2
    `, [this.conversationStates.QUEUED, conversationId]);
    
    this.emit('conversation:queued', { conversationId, priority });
  }
  
  /**
   * Cerrar conversación
   */
  async closeConversation(conversationId, resolvedBy) {
    const conversation = await this.getConversation(conversationId);
    
    await this.db.query(`
      UPDATE unified_conversations
      SET status = $1, closed_at = NOW(), updated_at = NOW()
      WHERE conversation_id = $2
    `, [this.conversationStates.CLOSED, conversationId]);
    
    if (conversation.assigned_agent_id) {
      await this.db.query(`
        UPDATE messaging_agents
        SET current_chats_count = GREATEST(current_chats_count - 1, 0)
        WHERE agent_id = $1
      `, [conversation.assigned_agent_id]);
    }
    
    // Update analytics
    await this.updateAnalytics(conversation.channel, 'conversations_resolved');
    
    this.emit('conversation:closed', { conversationId, resolvedBy });
    
    return { success: true };
  }
  
  /**
   * Actualizar analytics
   */
  async updateAnalytics(channel, metric, agentId = null) {
    const today = new Date().toISOString().split('T')[0];
    
    await this.db.query(`
      INSERT INTO messaging_analytics (metric_date, channel, agent_id, ${metric})
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (metric_date, channel, agent_id)
      DO UPDATE SET ${metric} = messaging_analytics.${metric} + 1
    `, [today, channel, agentId]);
  }
  
  /**
   * Obtener estadísticas
   */
  async getStatistics(timeRange = '7 days') {
    const stats = await this.db.query(`
      SELECT 
        channel,
        SUM(messages_sent) as total_sent,
        SUM(messages_received) as total_received,
        SUM(conversations_started) as total_conversations,
        SUM(conversations_resolved) as total_resolved,
        AVG(avg_response_time_seconds) as avg_response_time
      FROM messaging_analytics
      WHERE metric_date >= NOW() - INTERVAL '${timeRange}'
      GROUP BY channel
    `);
    
    const activeConversations = await this.db.query(`
      SELECT COUNT(*) as count FROM unified_conversations
      WHERE status IN ($1, $2)
    `, [this.conversationStates.ACTIVE, this.conversationStates.ASSIGNED]);
    
    const queuedConversations = await this.db.query(`
      SELECT COUNT(*) as count FROM unified_conversations
      WHERE status = $1
    `, [this.conversationStates.QUEUED]);
    
    return {
      byChannel: stats.rows,
      activeConversations: parseInt(activeConversations.rows[0].count),
      queuedConversations: parseInt(queuedConversations.rows[0].count),
    };
  }
}

module.exports = UnifiedMessagingSystem;
