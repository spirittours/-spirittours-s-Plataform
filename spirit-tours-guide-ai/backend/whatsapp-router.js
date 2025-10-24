/**
 * WhatsApp Business API Router
 * 
 * Endpoints for WhatsApp integration:
 * - Webhook verification and handling
 * - Send messages (templates, text, media, interactive)
 * - Conversation management
 * - Contact management
 * - Message history
 * - Statistics and monitoring
 */

const express = require('express');
const router = express.Router();

/**
 * Initialize router with WhatsApp service
 */
function initWhatsAppRouter(whatsappService) {
  
  // ============================================
  // WEBHOOK ENDPOINTS
  // ============================================
  
  /**
   * Webhook verification (GET)
   * WhatsApp will send this to verify the webhook
   */
  router.get('/webhook', (req, res) => {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      
      const result = whatsappService.verifyWebhook(mode, token, challenge);
      
      if (result) {
        res.status(200).send(result);
      } else {
        res.status(403).send('Forbidden');
      }
      
    } catch (error) {
      console.error('Error verifying webhook:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * Webhook handler (POST)
   * WhatsApp sends incoming messages and status updates here
   */
  router.post('/webhook', async (req, res) => {
    try {
      const signature = req.headers['x-hub-signature-256'];
      
      await whatsappService.handleWebhook(req.body, signature);
      
      // Always respond with 200 to acknowledge receipt
      res.status(200).json({ success: true });
      
    } catch (error) {
      console.error('Error handling webhook:', error);
      // Still return 200 to prevent WhatsApp from retrying
      res.status(200).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // MESSAGE SENDING ENDPOINTS
  // ============================================
  
  /**
   * Send a template message
   * POST /api/whatsapp/messages/template
   */
  router.post('/messages/template', async (req, res) => {
    try {
      const { to, templateName, params, tourId, userId, priority } = req.body;
      
      if (!to || !templateName || !params) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, templateName, params',
        });
      }
      
      const result = await whatsappService.sendTemplateMessage(
        to,
        templateName,
        params,
        { tourId, userId, priority }
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error sending template message:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Send a text message
   * POST /api/whatsapp/messages/text
   */
  router.post('/messages/text', async (req, res) => {
    try {
      const { to, text, replyToMessageId, tourId, userId, priority } = req.body;
      
      if (!to || !text) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, text',
        });
      }
      
      const result = await whatsappService.sendTextMessage(
        to,
        text,
        { replyToMessageId, tourId, userId, priority }
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error sending text message:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Send an image message
   * POST /api/whatsapp/messages/image
   */
  router.post('/messages/image', async (req, res) => {
    try {
      const { to, imageUrl, caption, tourId, userId, priority } = req.body;
      
      if (!to || !imageUrl) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, imageUrl',
        });
      }
      
      const result = await whatsappService.sendImageMessage(
        to,
        imageUrl,
        caption || '',
        { tourId, userId, priority }
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error sending image message:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Send a location message
   * POST /api/whatsapp/messages/location
   */
  router.post('/messages/location', async (req, res) => {
    try {
      const { to, latitude, longitude, name, address, tourId, userId, priority } = req.body;
      
      if (!to || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, latitude, longitude',
        });
      }
      
      const result = await whatsappService.sendLocationMessage(
        to,
        latitude,
        longitude,
        name || '',
        address || '',
        { tourId, userId, priority }
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error sending location message:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Send a button message
   * POST /api/whatsapp/messages/buttons
   */
  router.post('/messages/buttons', async (req, res) => {
    try {
      const { to, bodyText, buttons, headerText, footerText, tourId, userId, priority } = req.body;
      
      if (!to || !bodyText || !buttons || buttons.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, bodyText, buttons',
        });
      }
      
      if (buttons.length > 3) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 3 buttons allowed',
        });
      }
      
      const result = await whatsappService.sendButtonMessage(
        to,
        bodyText,
        buttons,
        { headerText, footerText, tourId, userId, priority }
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error sending button message:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Send a list message
   * POST /api/whatsapp/messages/list
   */
  router.post('/messages/list', async (req, res) => {
    try {
      const { to, bodyText, buttonText, sections, headerText, footerText, tourId, userId, priority } = req.body;
      
      if (!to || !bodyText || !buttonText || !sections || sections.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, bodyText, buttonText, sections',
        });
      }
      
      const result = await whatsappService.sendListMessage(
        to,
        bodyText,
        buttonText,
        sections,
        { headerText, footerText, tourId, userId, priority }
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error sending list message:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // TOUR-SPECIFIC MESSAGE HELPERS
  // ============================================
  
  /**
   * Send tour confirmation
   * POST /api/whatsapp/tours/confirmation
   */
  router.post('/tours/confirmation', async (req, res) => {
    try {
      const { to, passengerName, tourName, date, time, pickupLocation, tourId, userId } = req.body;
      
      const result = await whatsappService.sendTemplateMessage(
        to,
        'TOUR_CONFIRMATION',
        [passengerName, tourName, date, time, pickupLocation],
        { tourId, userId, priority: 'high' }
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error sending tour confirmation:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Send tour reminder
   * POST /api/whatsapp/tours/reminder
   */
  router.post('/tours/reminder', async (req, res) => {
    try {
      const { to, passengerName, tourName, timeUntil, pickupLocation, tourId, userId } = req.body;
      
      const result = await whatsappService.sendTemplateMessage(
        to,
        'TOUR_REMINDER',
        [passengerName, tourName, timeUntil, pickupLocation],
        { tourId, userId, priority: 'high' }
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error sending tour reminder:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Send driver assigned notification
   * POST /api/whatsapp/tours/driver-assigned
   */
  router.post('/tours/driver-assigned', async (req, res) => {
    try {
      const { to, passengerName, driverName, vehicleModel, licensePlate, driverPhone, tourId, userId } = req.body;
      
      const result = await whatsappService.sendTemplateMessage(
        to,
        'DRIVER_ASSIGNED',
        [passengerName, driverName, vehicleModel, licensePlate, driverPhone],
        { tourId, userId, priority: 'high' }
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error sending driver assigned notification:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Send waypoint arrival notification
   * POST /api/whatsapp/tours/waypoint-arrival
   */
  router.post('/tours/waypoint-arrival', async (req, res) => {
    try {
      const { to, waypointName, estimatedTime, tourId, userId } = req.body;
      
      const result = await whatsappService.sendTemplateMessage(
        to,
        'WAYPOINT_ARRIVAL',
        [waypointName, estimatedTime],
        { tourId, userId }
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error sending waypoint arrival notification:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Send rating request
   * POST /api/whatsapp/tours/rating-request
   */
  router.post('/tours/rating-request', async (req, res) => {
    try {
      const { to, passengerName, tourName, ratingUrl, tourId, userId } = req.body;
      
      // Send template message first
      await whatsappService.sendTemplateMessage(
        to,
        'RATING_REQUEST',
        [passengerName, tourName],
        { tourId, userId }
      );
      
      // Then send interactive button with rating link
      const result = await whatsappService.sendButtonMessage(
        to,
        `Hi ${passengerName}! How was your ${tourName} tour? We'd love to hear your feedback!`,
        [
          { id: 'rate_now', title: '⭐ Rate Now' },
          { id: 'rate_later', title: '⏰ Later' },
        ],
        {
          headerText: '📝 Quick Feedback',
          footerText: 'Your feedback helps us improve',
          tourId,
          userId,
        }
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error sending rating request:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // CONVERSATION MANAGEMENT
  // ============================================
  
  /**
   * Get conversation history
   * GET /api/whatsapp/conversations/:phoneNumber
   */
  router.get('/conversations/:phoneNumber', async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const { limit = 50 } = req.query;
      
      const history = await whatsappService.getConversationHistory(phoneNumber, parseInt(limit));
      
      res.json({ success: true, messages: history });
      
    } catch (error) {
      console.error('Error getting conversation history:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // CONTACT MANAGEMENT
  // ============================================
  
  /**
   * Opt out a contact
   * POST /api/whatsapp/contacts/:phoneNumber/opt-out
   */
  router.post('/contacts/:phoneNumber/opt-out', async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      
      await whatsappService.optOutContact(phoneNumber);
      
      res.json({ success: true, message: 'Contact opted out successfully' });
      
    } catch (error) {
      console.error('Error opting out contact:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Opt in a contact
   * POST /api/whatsapp/contacts/:phoneNumber/opt-in
   */
  router.post('/contacts/:phoneNumber/opt-in', async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      
      await whatsappService.optInContact(phoneNumber);
      
      res.json({ success: true, message: 'Contact opted in successfully' });
      
    } catch (error) {
      console.error('Error opting in contact:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // STATISTICS & MONITORING
  // ============================================
  
  /**
   * Get WhatsApp statistics
   * GET /api/whatsapp/stats
   */
  router.get('/stats', (req, res) => {
    try {
      const stats = whatsappService.getStatistics();
      res.json({ success: true, stats });
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  return router;
}

module.exports = initWhatsAppRouter;
