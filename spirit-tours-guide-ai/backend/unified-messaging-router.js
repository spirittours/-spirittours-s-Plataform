/**
 * Unified Messaging Router - Spirit Tours AI Guide
 * 
 * API endpoints para sistema de mensajería unificada
 */

const express = require('express');
const router = express.Router();

/**
 * Inicializar router con el sistema de mensajería
 */
function initUnifiedMessagingRouter(messagingSystem) {
  
  /**
   * POST /api/messages/send
   * Enviar mensaje a través de cualquier canal
   */
  router.post('/send', async (req, res) => {
    try {
      const {
        conversationId,
        text,
        type,
        mediaUrl,
        richContent,
        suggestedReplies,
        senderId,
        senderName
      } = req.body;
      
      if (!conversationId || !text) {
        return res.status(400).json({
          error: 'conversationId and text are required'
        });
      }
      
      const result = await messagingSystem.sendMessage(conversationId, {
        text,
        type,
        mediaUrl,
        richContent,
        suggestedReplies,
        senderId,
        senderName
      });
      
      res.json({
        success: true,
        ...result
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        error: 'Failed to send message',
        message: error.message
      });
    }
  });
  
  /**
   * POST /api/messages/webhook/:channel
   * Webhook para recibir mensajes de canales externos
   */
  router.post('/webhook/:channel', async (req, res) => {
    try {
      const { channel } = req.params;
      const webhookData = req.body;
      
      // Validar canal
      if (!Object.values(messagingSystem.channels).includes(channel)) {
        return res.status(400).json({
          error: `Unsupported channel: ${channel}`
        });
      }
      
      const result = await messagingSystem.receiveMessage(channel, webhookData);
      
      res.json({
        success: true,
        ...result
      });
      
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({
        error: 'Failed to process webhook',
        message: error.message
      });
    }
  });
  
  /**
   * GET /api/messages/conversations
   * Obtener lista de conversaciones
   */
  router.get('/conversations', async (req, res) => {
    try {
      const {
        status,
        channel,
        agentId,
        limit = 50,
        offset = 0
      } = req.query;
      
      let query = 'SELECT * FROM unified_conversations WHERE 1=1';
      const params = [];
      let paramIndex = 1;
      
      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      
      if (channel) {
        query += ` AND channel = $${paramIndex++}`;
        params.push(channel);
      }
      
      if (agentId) {
        query += ` AND assigned_agent_id = $${paramIndex++}`;
        params.push(agentId);
      }
      
      query += ` ORDER BY updated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(limit, offset);
      
      const result = await messagingSystem.db.query(query, params);
      
      res.json({
        success: true,
        conversations: result.rows,
        count: result.rows.length
      });
      
    } catch (error) {
      console.error('Error getting conversations:', error);
      res.status(500).json({
        error: 'Failed to get conversations',
        message: error.message
      });
    }
  });
  
  /**
   * GET /api/messages/conversations/:conversationId
   * Obtener conversación específica
   */
  router.get('/conversations/:conversationId', async (req, res) => {
    try {
      const { conversationId } = req.params;
      
      const conversation = await messagingSystem.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({
          error: 'Conversation not found'
        });
      }
      
      res.json({
        success: true,
        conversation
      });
      
    } catch (error) {
      console.error('Error getting conversation:', error);
      res.status(500).json({
        error: 'Failed to get conversation',
        message: error.message
      });
    }
  });
  
  /**
   * GET /api/messages/conversations/:conversationId/messages
   * Obtener mensajes de una conversación
   */
  router.get('/conversations/:conversationId/messages', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      const messages = await messagingSystem.getConversationMessages(
        conversationId,
        parseInt(limit),
        parseInt(offset)
      );
      
      res.json({
        success: true,
        messages,
        count: messages.length
      });
      
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({
        error: 'Failed to get messages',
        message: error.message
      });
    }
  });
  
  /**
   * POST /api/messages/conversations/:conversationId/assign
   * Asignar agente a conversación
   */
  router.post('/conversations/:conversationId/assign', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { agentId } = req.body;
      
      if (!agentId) {
        return res.status(400).json({
          error: 'agentId is required'
        });
      }
      
      await messagingSystem.assignAgent(conversationId, agentId);
      
      res.json({
        success: true,
        message: 'Agent assigned successfully'
      });
      
    } catch (error) {
      console.error('Error assigning agent:', error);
      res.status(500).json({
        error: 'Failed to assign agent',
        message: error.message
      });
    }
  });
  
  /**
   * POST /api/messages/conversations/:conversationId/close
   * Cerrar conversación
   */
  router.post('/conversations/:conversationId/close', async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { resolvedBy } = req.body;
      
      await messagingSystem.closeConversation(conversationId, resolvedBy);
      
      res.json({
        success: true,
        message: 'Conversation closed successfully'
      });
      
    } catch (error) {
      console.error('Error closing conversation:', error);
      res.status(500).json({
        error: 'Failed to close conversation',
        message: error.message
      });
    }
  });
  
  /**
   * GET /api/messages/queue
   * Obtener conversaciones en queue
   */
  router.get('/queue', async (req, res) => {
    try {
      const result = await messagingSystem.db.query(`
        SELECT cq.*, uc.channel, uc.user_name, uc.last_message_at
        FROM conversation_queue cq
        JOIN unified_conversations uc ON cq.conversation_id = uc.conversation_id
        ORDER BY cq.priority DESC, cq.queued_at ASC
      `);
      
      res.json({
        success: true,
        queue: result.rows,
        count: result.rows.length
      });
      
    } catch (error) {
      console.error('Error getting queue:', error);
      res.status(500).json({
        error: 'Failed to get queue',
        message: error.message
      });
    }
  });
  
  /**
   * GET /api/messages/agents
   * Obtener lista de agentes
   */
  router.get('/agents', async (req, res) => {
    try {
      const { status } = req.query;
      
      let query = 'SELECT * FROM messaging_agents';
      const params = [];
      
      if (status) {
        query += ' WHERE status = $1';
        params.push(status);
      }
      
      query += ' ORDER BY agent_name ASC';
      
      const result = await messagingSystem.db.query(query, params);
      
      res.json({
        success: true,
        agents: result.rows,
        count: result.rows.length
      });
      
    } catch (error) {
      console.error('Error getting agents:', error);
      res.status(500).json({
        error: 'Failed to get agents',
        message: error.message
      });
    }
  });
  
  /**
   * POST /api/messages/agents
   * Crear nuevo agente
   */
  router.post('/agents', async (req, res) => {
    try {
      const {
        agentId,
        agentName,
        agentEmail,
        maxConcurrentChats = 5,
        skills,
        channels
      } = req.body;
      
      if (!agentId || !agentName) {
        return res.status(400).json({
          error: 'agentId and agentName are required'
        });
      }
      
      const result = await messagingSystem.db.query(`
        INSERT INTO messaging_agents 
        (agent_id, agent_name, agent_email, max_concurrent_chats, skills, channels)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        agentId,
        agentName,
        agentEmail,
        maxConcurrentChats,
        JSON.stringify(skills || []),
        JSON.stringify(channels || [])
      ]);
      
      res.json({
        success: true,
        agent: result.rows[0]
      });
      
    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(500).json({
        error: 'Failed to create agent',
        message: error.message
      });
    }
  });
  
  /**
   * PUT /api/messages/agents/:agentId/status
   * Actualizar estado de agente
   */
  router.put('/agents/:agentId/status', async (req, res) => {
    try {
      const { agentId } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({
          error: 'status is required'
        });
      }
      
      await messagingSystem.db.query(`
        UPDATE messaging_agents
        SET status = $1, last_active_at = NOW()
        WHERE agent_id = $2
      `, [status, agentId]);
      
      res.json({
        success: true,
        message: 'Agent status updated'
      });
      
    } catch (error) {
      console.error('Error updating agent status:', error);
      res.status(500).json({
        error: 'Failed to update agent status',
        message: error.message
      });
    }
  });
  
  /**
   * GET /api/messages/templates
   * Obtener templates de mensajes
   */
  router.get('/templates', async (req, res) => {
    try {
      const { channel, category } = req.query;
      
      let query = 'SELECT * FROM message_templates WHERE status = $1';
      const params = ['active'];
      let paramIndex = 2;
      
      if (channel) {
        query += ` AND channel = $${paramIndex++}`;
        params.push(channel);
      }
      
      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
      }
      
      const result = await messagingSystem.db.query(query, params);
      
      res.json({
        success: true,
        templates: result.rows,
        count: result.rows.length
      });
      
    } catch (error) {
      console.error('Error getting templates:', error);
      res.status(500).json({
        error: 'Failed to get templates',
        message: error.message
      });
    }
  });
  
  /**
   * POST /api/messages/templates
   * Crear nuevo template
   */
  router.post('/templates', async (req, res) => {
    try {
      const {
        templateId,
        templateName,
        channel,
        templateType,
        content,
        richContent,
        variables,
        category
      } = req.body;
      
      if (!templateId || !templateName || !channel || !templateType) {
        return res.status(400).json({
          error: 'templateId, templateName, channel, and templateType are required'
        });
      }
      
      const result = await messagingSystem.db.query(`
        INSERT INTO message_templates 
        (template_id, template_name, channel, template_type, content, 
         rich_content, variables, category)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        templateId,
        templateName,
        channel,
        templateType,
        content,
        JSON.stringify(richContent || {}),
        JSON.stringify(variables || []),
        category
      ]);
      
      res.json({
        success: true,
        template: result.rows[0]
      });
      
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({
        error: 'Failed to create template',
        message: error.message
      });
    }
  });
  
  /**
   * GET /api/messages/stats
   * Obtener estadísticas de mensajería
   */
  router.get('/stats', async (req, res) => {
    try {
      const { timeRange = '7 days' } = req.query;
      
      const stats = await messagingSystem.getStatistics(timeRange);
      
      res.json({
        success: true,
        stats
      });
      
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({
        error: 'Failed to get stats',
        message: error.message
      });
    }
  });
  
  /**
   * GET /api/messages/analytics
   * Obtener analytics detallados por fecha
   */
  router.get('/analytics', async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        channel,
        agentId
      } = req.query;
      
      let query = `
        SELECT * FROM messaging_analytics
        WHERE metric_date BETWEEN $1 AND $2
      `;
      const params = [
        startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate || new Date().toISOString().split('T')[0]
      ];
      let paramIndex = 3;
      
      if (channel) {
        query += ` AND channel = $${paramIndex++}`;
        params.push(channel);
      }
      
      if (agentId) {
        query += ` AND agent_id = $${paramIndex}`;
        params.push(agentId);
      }
      
      query += ' ORDER BY metric_date DESC';
      
      const result = await messagingSystem.db.query(query, params);
      
      res.json({
        success: true,
        analytics: result.rows,
        count: result.rows.length
      });
      
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({
        error: 'Failed to get analytics',
        message: error.message
      });
    }
  });
  
  /**
   * GET /api/messages/health
   * Health check
   */
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Unified Messaging System is operational',
      timestamp: new Date().toISOString(),
      channels: Object.values(messagingSystem.channels)
    });
  });
  
  return router;
}

module.exports = initUnifiedMessagingRouter;
