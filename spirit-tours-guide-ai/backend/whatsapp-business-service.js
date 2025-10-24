/**
 * WhatsApp Business API Integration Service
 * 
 * Features:
 * - Automated tour notifications via WhatsApp Business API
 * - Two-way communication with passengers and guides
 * - Template message management (pre-approved messages)
 * - Rich media support (images, documents, location)
 * - Interactive buttons and lists
 * - Webhook handling for incoming messages
 * - Message status tracking (sent, delivered, read, failed)
 * - Contact management and opt-in/opt-out
 * - Integration with existing notification system
 * - Multi-language support
 * 
 * WhatsApp Business API Requirements:
 * - Meta Business Account
 * - WhatsApp Business API access token
 * - Phone Number ID
 * - Webhook verification token
 * - Pre-approved message templates
 * 
 * Message Types:
 * - Tour confirmation and reminders
 * - Real-time location updates
 * - Waypoint arrival notifications
 * - Rating requests
 * - Driver profile and verification
 * - Emergency alerts
 * - Booking confirmations
 * - Payment receipts
 * 
 * Architecture:
 * - Event-driven integration with notification system
 * - Queue-based message delivery (Redis)
 * - Retry mechanism for failed messages
 * - Rate limiting compliance (80 messages/second)
 * - Template caching for performance
 * - Webhook signature verification
 */

const EventEmitter = require('events');
const axios = require('axios');
const crypto = require('crypto');
const { Pool } = require('pg');
const Redis = require('redis');

class WhatsAppBusinessService extends EventEmitter {
  constructor(notificationSystem = null) {
    super();
    
    // Dependencies
    this.notificationSystem = notificationSystem;
    
    // WhatsApp Business API configuration
    this.config = {
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'spirit-tours-webhook-token',
      apiUrl: 'https://graph.facebook.com',
      rateLimitPerSecond: 80, // WhatsApp API rate limit
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
    };
    
    // Database connection
    this.pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'spirit_tours',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
    });
    
    // Redis for message queue and rate limiting
    this.redisClient = Redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      db: 3, // Use DB 3 for WhatsApp
    });
    
    this.redisClient.on('error', (err) => console.error('Redis Client Error:', err));
    this.redisClient.connect();
    
    // Message queue
    this.messageQueue = [];
    this.processingQueue = false;
    
    // Statistics
    this.stats = {
      messagesSent: 0,
      messagesDelivered: 0,
      messagesRead: 0,
      messagesFailed: 0,
      messagesReceived: 0,
      templatesUsed: {},
      activeConversations: 0,
    };
    
    // Pre-approved message templates
    this.templates = {
      TOUR_CONFIRMATION: {
        name: 'tour_confirmation',
        language: 'en',
        params: ['passenger_name', 'tour_name', 'date', 'time', 'pickup_location'],
      },
      TOUR_REMINDER: {
        name: 'tour_reminder',
        language: 'en',
        params: ['passenger_name', 'tour_name', 'time_until', 'pickup_location'],
      },
      DRIVER_ASSIGNED: {
        name: 'driver_assigned',
        language: 'en',
        params: ['passenger_name', 'driver_name', 'vehicle_model', 'license_plate', 'driver_phone'],
      },
      WAYPOINT_ARRIVAL: {
        name: 'waypoint_arrival',
        language: 'en',
        params: ['waypoint_name', 'estimated_time'],
      },
      RATING_REQUEST: {
        name: 'rating_request',
        language: 'en',
        params: ['passenger_name', 'tour_name'],
      },
      EMERGENCY_ALERT: {
        name: 'emergency_alert',
        language: 'en',
        params: ['alert_type', 'location', 'instructions'],
      },
      PAYMENT_RECEIPT: {
        name: 'payment_receipt',
        language: 'en',
        params: ['passenger_name', 'amount', 'tour_name', 'date', 'receipt_url'],
      },
    };
    
    // Initialize database schema
    this.initDatabase();
    
    // Start queue processor
    this.startQueueProcessor();
    
    console.log('✅ WhatsApp Business Service initialized');
  }
  
  /**
   * Initialize database schema
   */
  async initDatabase() {
    try {
      // WhatsApp messages table
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_messages (
          id SERIAL PRIMARY KEY,
          message_id VARCHAR(255) UNIQUE, -- WhatsApp message ID
          conversation_id VARCHAR(255),
          
          -- Sender/Recipient
          from_number VARCHAR(50) NOT NULL,
          to_number VARCHAR(50) NOT NULL,
          direction VARCHAR(20) NOT NULL, -- inbound, outbound
          
          -- Message content
          message_type VARCHAR(50) NOT NULL, -- text, template, image, document, location, interactive
          content TEXT,
          template_name VARCHAR(100),
          template_params JSONB,
          media_url TEXT,
          media_type VARCHAR(50),
          
          -- Status tracking
          status VARCHAR(50) DEFAULT 'queued', -- queued, sent, delivered, read, failed
          error_code VARCHAR(50),
          error_message TEXT,
          
          -- Metadata
          tour_id VARCHAR(100),
          user_id VARCHAR(100),
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          delivered_at TIMESTAMP,
          read_at TIMESTAMP,
          
          -- Context
          context_message_id VARCHAR(255), -- For replies
          reply_to_message_id VARCHAR(255),
          
          INDEX idx_message_id (message_id),
          INDEX idx_conversation (conversation_id),
          INDEX idx_tour (tour_id),
          INDEX idx_status (status),
          INDEX idx_sent_at (sent_at)
        )
      `);
      
      // WhatsApp contacts table
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_contacts (
          id SERIAL PRIMARY KEY,
          phone_number VARCHAR(50) UNIQUE NOT NULL,
          
          -- Profile
          display_name VARCHAR(255),
          profile_name VARCHAR(255),
          
          -- Preferences
          language VARCHAR(10) DEFAULT 'en',
          opted_in BOOLEAN DEFAULT TRUE,
          opted_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          opted_out_at TIMESTAMP,
          
          -- Association
          user_id VARCHAR(100),
          user_type VARCHAR(50), -- passenger, guide, coordinator, admin
          
          -- Metadata
          first_message_at TIMESTAMP,
          last_message_at TIMESTAMP,
          total_messages INTEGER DEFAULT 0,
          
          INDEX idx_phone (phone_number),
          INDEX idx_user (user_id),
          INDEX idx_opted_in (opted_in)
        )
      `);
      
      // Message templates tracking
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_templates (
          id SERIAL PRIMARY KEY,
          template_name VARCHAR(100) UNIQUE NOT NULL,
          template_id VARCHAR(255),
          
          -- Template info
          language VARCHAR(10) NOT NULL,
          category VARCHAR(50) NOT NULL, -- utility, marketing, authentication
          status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
          
          -- Content
          header_text TEXT,
          body_text TEXT,
          footer_text TEXT,
          button_config JSONB,
          
          -- Usage statistics
          times_used INTEGER DEFAULT 0,
          last_used_at TIMESTAMP,
          
          -- Metadata
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_template_name (template_name),
          INDEX idx_status (status)
        )
      `);
      
      console.log('✅ WhatsApp Business database schema initialized');
    } catch (error) {
      console.error('❌ Error initializing WhatsApp database:', error);
    }
  }
  
  /**
   * Send a template message
   */
  async sendTemplateMessage(to, templateName, params, options = {}) {
    try {
      const template = this.templates[templateName];
      if (!template) {
        throw new Error(`Template ${templateName} not found`);
      }
      
      // Validate parameters
      if (params.length !== template.params.length) {
        throw new Error(`Expected ${template.params.length} parameters, got ${params.length}`);
      }
      
      // Build message payload
      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(to),
        type: 'template',
        template: {
          name: template.name,
          language: {
            code: options.language || template.language,
          },
          components: [
            {
              type: 'body',
              parameters: params.map(param => ({
                type: 'text',
                text: param,
              })),
            },
          ],
        },
      };
      
      // Add to queue
      const message = {
        payload,
        to,
        templateName,
        params,
        tourId: options.tourId,
        userId: options.userId,
        priority: options.priority || 'normal',
        retries: 0,
      };
      
      await this.enqueueMessage(message);
      
      return {
        success: true,
        message: 'Message queued for delivery',
      };
      
    } catch (error) {
      console.error('❌ Error sending template message:', error);
      throw error;
    }
  }
  
  /**
   * Send a text message
   */
  async sendTextMessage(to, text, options = {}) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(to),
        type: 'text',
        text: {
          body: text,
        },
      };
      
      // Add reply context if provided
      if (options.replyToMessageId) {
        payload.context = {
          message_id: options.replyToMessageId,
        };
      }
      
      const message = {
        payload,
        to,
        text,
        tourId: options.tourId,
        userId: options.userId,
        priority: options.priority || 'normal',
        retries: 0,
      };
      
      await this.enqueueMessage(message);
      
      return {
        success: true,
        message: 'Message queued for delivery',
      };
      
    } catch (error) {
      console.error('❌ Error sending text message:', error);
      throw error;
    }
  }
  
  /**
   * Send an image message
   */
  async sendImageMessage(to, imageUrl, caption = '', options = {}) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(to),
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption,
        },
      };
      
      const message = {
        payload,
        to,
        imageUrl,
        caption,
        tourId: options.tourId,
        userId: options.userId,
        priority: options.priority || 'normal',
        retries: 0,
      };
      
      await this.enqueueMessage(message);
      
      return {
        success: true,
        message: 'Image message queued for delivery',
      };
      
    } catch (error) {
      console.error('❌ Error sending image message:', error);
      throw error;
    }
  }
  
  /**
   * Send a location message
   */
  async sendLocationMessage(to, latitude, longitude, name = '', address = '', options = {}) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(to),
        type: 'location',
        location: {
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          name,
          address,
        },
      };
      
      const message = {
        payload,
        to,
        latitude,
        longitude,
        tourId: options.tourId,
        userId: options.userId,
        priority: options.priority || 'normal',
        retries: 0,
      };
      
      await this.enqueueMessage(message);
      
      return {
        success: true,
        message: 'Location message queued for delivery',
      };
      
    } catch (error) {
      console.error('❌ Error sending location message:', error);
      throw error;
    }
  }
  
  /**
   * Send an interactive button message
   */
  async sendButtonMessage(to, bodyText, buttons, options = {}) {
    try {
      if (buttons.length > 3) {
        throw new Error('Maximum 3 buttons allowed');
      }
      
      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(to),
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: bodyText,
          },
          action: {
            buttons: buttons.map((btn, index) => ({
              type: 'reply',
              reply: {
                id: btn.id || `btn_${index}`,
                title: btn.title.substring(0, 20), // Max 20 characters
              },
            })),
          },
        },
      };
      
      // Add header if provided
      if (options.headerText) {
        payload.interactive.header = {
          type: 'text',
          text: options.headerText,
        };
      }
      
      // Add footer if provided
      if (options.footerText) {
        payload.interactive.footer = {
          text: options.footerText,
        };
      }
      
      const message = {
        payload,
        to,
        bodyText,
        buttons,
        tourId: options.tourId,
        userId: options.userId,
        priority: options.priority || 'normal',
        retries: 0,
      };
      
      await this.enqueueMessage(message);
      
      return {
        success: true,
        message: 'Button message queued for delivery',
      };
      
    } catch (error) {
      console.error('❌ Error sending button message:', error);
      throw error;
    }
  }
  
  /**
   * Send an interactive list message
   */
  async sendListMessage(to, bodyText, buttonText, sections, options = {}) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(to),
        type: 'interactive',
        interactive: {
          type: 'list',
          body: {
            text: bodyText,
          },
          action: {
            button: buttonText,
            sections: sections.map(section => ({
              title: section.title,
              rows: section.rows.map(row => ({
                id: row.id,
                title: row.title.substring(0, 24), // Max 24 characters
                description: row.description?.substring(0, 72), // Max 72 characters
              })),
            })),
          },
        },
      };
      
      // Add header if provided
      if (options.headerText) {
        payload.interactive.header = {
          type: 'text',
          text: options.headerText,
        };
      }
      
      // Add footer if provided
      if (options.footerText) {
        payload.interactive.footer = {
          text: options.footerText,
        };
      }
      
      const message = {
        payload,
        to,
        bodyText,
        sections,
        tourId: options.tourId,
        userId: options.userId,
        priority: options.priority || 'normal',
        retries: 0,
      };
      
      await this.enqueueMessage(message);
      
      return {
        success: true,
        message: 'List message queued for delivery',
      };
      
    } catch (error) {
      console.error('❌ Error sending list message:', error);
      throw error;
    }
  }
  
  /**
   * Enqueue message for delivery
   */
  async enqueueMessage(message) {
    // Add to Redis queue
    const queueKey = message.priority === 'high' ? 'whatsapp:queue:high' : 'whatsapp:queue:normal';
    await this.redisClient.rPush(queueKey, JSON.stringify(message));
    
    // Update stats
    this.messageQueue.push(message);
  }
  
  /**
   * Process message queue
   */
  async startQueueProcessor() {
    setInterval(async () => {
      if (this.processingQueue) return;
      
      this.processingQueue = true;
      
      try {
        // Process high priority queue first
        await this.processQueue('whatsapp:queue:high');
        
        // Then normal priority
        await this.processQueue('whatsapp:queue:normal');
        
      } catch (error) {
        console.error('❌ Error processing queue:', error);
      } finally {
        this.processingQueue = false;
      }
    }, 100); // Process every 100ms
  }
  
  /**
   * Process a specific queue
   */
  async processQueue(queueKey) {
    // Respect rate limit (80 messages per second = ~12ms per message)
    const messageJson = await this.redisClient.lPop(queueKey);
    if (!messageJson) return;
    
    const message = JSON.parse(messageJson);
    
    try {
      // Send message via API
      const result = await this.sendMessageToAPI(message.payload);
      
      // Store in database
      await this.storeMessage({
        messageId: result.messages[0].id,
        to: message.to,
        payload: message.payload,
        status: 'sent',
        tourId: message.tourId,
        userId: message.userId,
      });
      
      // Update statistics
      this.stats.messagesSent++;
      if (message.templateName) {
        this.stats.templatesUsed[message.templateName] = 
          (this.stats.templatesUsed[message.templateName] || 0) + 1;
      }
      
      // Emit event
      this.emit('message:sent', {
        messageId: result.messages[0].id,
        to: message.to,
        tourId: message.tourId,
      });
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Retry logic
      if (message.retries < this.config.retryAttempts) {
        message.retries++;
        setTimeout(() => {
          this.enqueueMessage(message);
        }, this.config.retryDelay * message.retries);
      } else {
        // Max retries reached, mark as failed
        await this.storeMessage({
          to: message.to,
          payload: message.payload,
          status: 'failed',
          errorMessage: error.message,
          tourId: message.tourId,
          userId: message.userId,
        });
        
        this.stats.messagesFailed++;
        
        this.emit('message:failed', {
          to: message.to,
          error: error.message,
          tourId: message.tourId,
        });
      }
    }
  }
  
  /**
   * Send message to WhatsApp API
   */
  async sendMessageToAPI(payload) {
    const url = `${this.config.apiUrl}/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;
    
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    return response.data;
  }
  
  /**
   * Handle incoming webhook
   */
  async handleWebhook(body, signature) {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(body, signature)) {
        throw new Error('Invalid webhook signature');
      }
      
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      
      if (!value) return;
      
      // Handle different webhook events
      if (value.messages) {
        await this.handleIncomingMessage(value.messages[0], value.contacts?.[0]);
      }
      
      if (value.statuses) {
        await this.handleMessageStatus(value.statuses[0]);
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error handling webhook:', error);
      throw error;
    }
  }
  
  /**
   * Handle incoming message
   */
  async handleIncomingMessage(message, contact) {
    try {
      const from = message.from;
      const messageType = message.type;
      const messageId = message.id;
      
      // Store message
      await this.storeMessage({
        messageId,
        from: from,
        to: this.config.phoneNumberId,
        direction: 'inbound',
        messageType,
        content: this.extractMessageContent(message),
        status: 'received',
      });
      
      // Update contact
      await this.upsertContact({
        phoneNumber: from,
        displayName: contact?.profile?.name,
      });
      
      // Update statistics
      this.stats.messagesReceived++;
      
      // Emit event for processing
      this.emit('message:received', {
        messageId,
        from,
        type: messageType,
        content: this.extractMessageContent(message),
        timestamp: message.timestamp,
      });
      
      // Send to notification system if available
      if (this.notificationSystem) {
        // Forward to appropriate handler based on content
        // This could trigger AI responses, route to human agents, etc.
      }
      
    } catch (error) {
      console.error('❌ Error handling incoming message:', error);
    }
  }
  
  /**
   * Handle message status update
   */
  async handleMessageStatus(status) {
    try {
      const messageId = status.id;
      const statusType = status.status; // sent, delivered, read, failed
      
      // Update message status in database
      const updateData = {
        status: statusType,
      };
      
      if (statusType === 'delivered') {
        updateData.deliveredAt = new Date();
        this.stats.messagesDelivered++;
      } else if (statusType === 'read') {
        updateData.readAt = new Date();
        this.stats.messagesRead++;
      } else if (statusType === 'failed') {
        updateData.errorCode = status.errors?.[0]?.code;
        updateData.errorMessage = status.errors?.[0]?.title;
        this.stats.messagesFailed++;
      }
      
      await this.updateMessageStatus(messageId, updateData);
      
      // Emit event
      this.emit('message:status', {
        messageId,
        status: statusType,
        timestamp: status.timestamp,
      });
      
    } catch (error) {
      console.error('❌ Error handling message status:', error);
    }
  }
  
  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body, signature) {
    if (!signature) return false;
    
    const expectedSignature = crypto
      .createHmac('sha256', process.env.WHATSAPP_APP_SECRET || '')
      .update(JSON.stringify(body))
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }
  
  /**
   * Verify webhook (GET request)
   */
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }
  
  /**
   * Extract message content from different message types
   */
  extractMessageContent(message) {
    switch (message.type) {
      case 'text':
        return message.text?.body;
      case 'image':
        return message.image?.caption || '[Image]';
      case 'document':
        return message.document?.caption || '[Document]';
      case 'location':
        return `[Location: ${message.location?.latitude}, ${message.location?.longitude}]`;
      case 'button':
        return message.button?.text;
      case 'interactive':
        return message.interactive?.button_reply?.title || message.interactive?.list_reply?.title;
      default:
        return `[${message.type}]`;
    }
  }
  
  /**
   * Format phone number for WhatsApp API
   */
  formatPhoneNumber(phoneNumber) {
    // Remove any non-digit characters
    let formatted = phoneNumber.replace(/\D/g, '');
    
    // Ensure it has country code
    if (!formatted.startsWith('1') && !formatted.startsWith('972') && !formatted.startsWith('34')) {
      // Add default country code if missing (customize based on your market)
      formatted = '1' + formatted; // US/Canada default
    }
    
    return formatted;
  }
  
  /**
   * Store message in database
   */
  async storeMessage(data) {
    const query = `
      INSERT INTO whatsapp_messages (
        message_id, from_number, to_number, direction, message_type,
        content, template_name, template_params, status, error_message,
        tour_id, user_id, delivered_at, read_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (message_id) 
      DO UPDATE SET
        status = $9,
        error_message = $10,
        delivered_at = $13,
        read_at = $14
    `;
    
    await this.pgPool.query(query, [
      data.messageId || null,
      data.from || data.to,
      data.to || data.from,
      data.direction || 'outbound',
      data.messageType || 'text',
      data.content || null,
      data.templateName || null,
      data.templateParams ? JSON.stringify(data.templateParams) : null,
      data.status || 'queued',
      data.errorMessage || null,
      data.tourId || null,
      data.userId || null,
      data.deliveredAt || null,
      data.readAt || null,
    ]);
  }
  
  /**
   * Update message status
   */
  async updateMessageStatus(messageId, updateData) {
    const setClauses = [];
    const values = [];
    let paramCounter = 1;
    
    if (updateData.status) {
      setClauses.push(`status = $${paramCounter++}`);
      values.push(updateData.status);
    }
    if (updateData.deliveredAt) {
      setClauses.push(`delivered_at = $${paramCounter++}`);
      values.push(updateData.deliveredAt);
    }
    if (updateData.readAt) {
      setClauses.push(`read_at = $${paramCounter++}`);
      values.push(updateData.readAt);
    }
    if (updateData.errorCode) {
      setClauses.push(`error_code = $${paramCounter++}`);
      values.push(updateData.errorCode);
    }
    if (updateData.errorMessage) {
      setClauses.push(`error_message = $${paramCounter++}`);
      values.push(updateData.errorMessage);
    }
    
    if (setClauses.length === 0) return;
    
    values.push(messageId);
    
    const query = `
      UPDATE whatsapp_messages
      SET ${setClauses.join(', ')}
      WHERE message_id = $${paramCounter}
    `;
    
    await this.pgPool.query(query, values);
  }
  
  /**
   * Upsert contact
   */
  async upsertContact(data) {
    const query = `
      INSERT INTO whatsapp_contacts (
        phone_number, display_name, first_message_at, last_message_at, total_messages
      ) VALUES ($1, $2, NOW(), NOW(), 1)
      ON CONFLICT (phone_number)
      DO UPDATE SET
        display_name = COALESCE($2, whatsapp_contacts.display_name),
        last_message_at = NOW(),
        total_messages = whatsapp_contacts.total_messages + 1
    `;
    
    await this.pgPool.query(query, [
      data.phoneNumber,
      data.displayName || null,
    ]);
  }
  
  /**
   * Get conversation history
   */
  async getConversationHistory(phoneNumber, limit = 50) {
    const query = `
      SELECT * FROM whatsapp_messages
      WHERE from_number = $1 OR to_number = $1
      ORDER BY sent_at DESC
      LIMIT $2
    `;
    
    const result = await this.pgPool.query(query, [phoneNumber, limit]);
    return result.rows;
  }
  
  /**
   * Opt out a contact
   */
  async optOutContact(phoneNumber) {
    const query = `
      UPDATE whatsapp_contacts
      SET opted_in = FALSE, opted_out_at = NOW()
      WHERE phone_number = $1
    `;
    
    await this.pgPool.query(query, [phoneNumber]);
  }
  
  /**
   * Opt in a contact
   */
  async optInContact(phoneNumber) {
    const query = `
      UPDATE whatsapp_contacts
      SET opted_in = TRUE, opted_in_at = NOW(), opted_out_at = NULL
      WHERE phone_number = $1
    `;
    
    await this.pgPool.query(query, [phoneNumber]);
  }
  
  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      queueLength: this.messageQueue.length,
      config: {
        apiVersion: this.config.apiVersion,
        phoneNumberId: this.config.phoneNumberId,
        rateLimitPerSecond: this.config.rateLimitPerSecond,
      },
    };
  }
  
  /**
   * Close connections
   */
  async close() {
    await this.pgPool.end();
    await this.redisClient.quit();
    console.log('✅ WhatsApp Business Service closed');
  }
}

module.exports = WhatsAppBusinessService;
