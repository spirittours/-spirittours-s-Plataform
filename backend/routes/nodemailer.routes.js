/**
 * Spirit Tours - Nodemailer API Routes
 * 
 * Endpoints for managing email servers, sending mass emails, and newsletters
 */

const express = require('express');
const router = express.Router();
const { nodemailerService } = require('../services/nodemailer_service');
const logger = require('../utils/logger');

// Middleware for authentication (adjust based on your auth system)
const requireAuth = (req, res, next) => {
  // TODO: Implement proper authentication
  // For now, just check for API key or JWT token
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Middleware for admin-only routes
const requireAdmin = (req, res, next) => {
  // TODO: Implement proper role checking
  // For now, proceed
  next();
};

/**
 * @route   GET /api/nodemailer/stats
 * @desc    Get email service statistics
 * @access  Private
 */
router.get('/stats', requireAuth, (req, res) => {
  try {
    const stats = nodemailerService.getStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/nodemailer/servers
 * @desc    Add new email server
 * @access  Private/Admin
 */
router.post('/servers', requireAuth, requireAdmin, (req, res) => {
  try {
    const { name, host, port, secure, user, pass, priority, rateLimitPerHour, maxConnections } = req.body;

    // Validate required fields
    if (!host || !user || !pass) {
      return res.status(400).json({ 
        error: 'Missing required fields: host, user, pass' 
      });
    }

    const serverId = nodemailerService.addServer({
      name,
      host,
      port: port || 587,
      secure: secure || false,
      user,
      pass,
      priority: priority || 1,
      rateLimitPerHour: rateLimitPerHour || 1000,
      maxConnections: maxConnections || 5
    });

    res.status(201).json({
      success: true,
      message: 'Email server added successfully',
      serverId,
      data: nodemailerService.servers.get(serverId).getStats()
    });
  } catch (error) {
    logger.error('Error adding server:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/nodemailer/servers
 * @desc    List all email servers
 * @access  Private/Admin
 */
router.get('/servers', requireAuth, requireAdmin, (req, res) => {
  try {
    const servers = Array.from(nodemailerService.servers.values()).map(s => s.getStats());
    res.json({
      success: true,
      count: servers.length,
      data: servers
    });
  } catch (error) {
    logger.error('Error listing servers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/nodemailer/servers/:serverId
 * @desc    Remove email server
 * @access  Private/Admin
 */
router.delete('/servers/:serverId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { serverId } = req.params;
    await nodemailerService.removeServer(serverId);
    res.json({
      success: true,
      message: 'Email server removed successfully'
    });
  } catch (error) {
    logger.error('Error removing server:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/nodemailer/servers/verify
 * @desc    Verify all server connections
 * @access  Private/Admin
 */
router.post('/servers/verify', requireAuth, requireAdmin, async (req, res) => {
  try {
    const results = await nodemailerService.verifyAllConnections();
    const allSuccess = Object.values(results).every(r => r.success);

    res.json({
      success: allSuccess,
      message: allSuccess ? 'All servers verified' : 'Some servers failed verification',
      data: results
    });
  } catch (error) {
    logger.error('Error verifying servers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/nodemailer/send
 * @desc    Send single email (immediate or queued)
 * @access  Private
 */
router.post('/send', requireAuth, async (req, res) => {
  try {
    const { 
      to, from, subject, html, text, 
      attachments, priority, immediate, 
      scheduledFor, serverId 
    } = req.body;

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, and html or text' 
      });
    }

    if (immediate) {
      // Send immediately
      const success = await nodemailerService.sendEmailNow({
        to, from, subject, html, text, attachments, serverId
      });

      res.json({
        success,
        message: success ? 'Email sent successfully' : 'Email failed to send'
      });
    } else {
      // Queue for sending
      const emailId = await nodemailerService.queueEmail({
        to, from, subject, html, text, 
        attachments, priority, scheduledFor, serverId
      });

      res.status(202).json({
        success: true,
        message: 'Email queued successfully',
        emailId
      });
    }
  } catch (error) {
    logger.error('Error sending email:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/nodemailer/send-mass
 * @desc    Send mass emails (bulk mailing)
 * @access  Private/Admin
 */
router.post('/send-mass', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { 
      recipients, templateId, variables, 
      from, priority, scheduledFor, serverId,
      campaignId, queueDelay 
    } = req.body;

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ 
        error: 'Recipients array is required and must not be empty' 
      });
    }

    if (!templateId) {
      return res.status(400).json({ 
        error: 'Template ID is required for mass emails' 
      });
    }

    const template = nodemailerService.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Queue mass emails
    const emailIds = await nodemailerService.queueMassEmails(
      recipients, 
      template, 
      variables || {}, 
      {
        from,
        priority,
        scheduledFor,
        serverId,
        campaignId: campaignId || `campaign_${Date.now()}`,
        queueDelay: queueDelay || 10, // 10ms delay between queueing
        baseUrl: process.env.BASE_URL || 'https://spirittours.com'
      }
    );

    res.status(202).json({
      success: true,
      message: `${emailIds.length} emails queued for mass sending`,
      campaignId: campaignId || `campaign_${Date.now()}`,
      queuedCount: emailIds.length,
      skippedCount: recipients.length - emailIds.length
    });
  } catch (error) {
    logger.error('Error sending mass emails:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/nodemailer/templates
 * @desc    Create newsletter template
 * @access  Private/Admin
 */
router.post('/templates', requireAuth, requireAdmin, (req, res) => {
  try {
    const { name, subject, html, text, category } = req.body;

    // Validate required fields
    if (!name || !subject || !html) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, subject, html' 
      });
    }

    const templateId = nodemailerService.addTemplate({
      name, subject, html, text, category
    });

    const template = nodemailerService.getTemplate(templateId);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: {
        id: template.id,
        name: template.name,
        subject: template.subject,
        category: template.category,
        createdAt: new Date(template.createdAt).toISOString()
      }
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/nodemailer/templates
 * @desc    List all newsletter templates
 * @access  Private
 */
router.get('/templates', requireAuth, (req, res) => {
  try {
    const { category } = req.query;
    const templates = nodemailerService.listTemplates(category);

    res.json({
      success: true,
      count: templates.length,
      data: templates.map(t => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        category: t.category,
        createdAt: new Date(t.createdAt).toISOString(),
        updatedAt: new Date(t.updatedAt).toISOString()
      }))
    });
  } catch (error) {
    logger.error('Error listing templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/nodemailer/templates/:templateId
 * @desc    Get template by ID
 * @access  Private
 */
router.get('/templates/:templateId', requireAuth, (req, res) => {
  try {
    const { templateId } = req.params;
    const template = nodemailerService.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      success: true,
      data: {
        id: template.id,
        name: template.name,
        subject: template.subject,
        html: template.html,
        text: template.text,
        category: template.category,
        createdAt: new Date(template.createdAt).toISOString(),
        updatedAt: new Date(template.updatedAt).toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/nodemailer/templates/:templateId
 * @desc    Update newsletter template
 * @access  Private/Admin
 */
router.put('/templates/:templateId', requireAuth, requireAdmin, (req, res) => {
  try {
    const { templateId } = req.params;
    const updates = req.body;

    const template = nodemailerService.updateTemplate(templateId, updates);

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: {
        id: template.id,
        name: template.name,
        subject: template.subject,
        category: template.category,
        updatedAt: new Date(template.updatedAt).toISOString()
      }
    });
  } catch (error) {
    logger.error('Error updating template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/nodemailer/templates/:templateId
 * @desc    Delete newsletter template
 * @access  Private/Admin
 */
router.delete('/templates/:templateId', requireAuth, requireAdmin, (req, res) => {
  try {
    const { templateId } = req.params;
    const deleted = nodemailerService.deleteTemplate(templateId);

    if (!deleted) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/nodemailer/newsletter
 * @desc    Send newsletter to subscriber list
 * @access  Private/Admin
 */
router.post('/newsletter', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { templateId, subscribers, variables, campaignId, scheduledFor } = req.body;

    // Validate required fields
    if (!templateId || !subscribers || !Array.isArray(subscribers)) {
      return res.status(400).json({ 
        error: 'Template ID and subscribers array are required' 
      });
    }

    const emailIds = await nodemailerService.sendNewsletter(
      templateId, 
      subscribers, 
      variables || {}, 
      {
        campaignId: campaignId || `newsletter_${Date.now()}`,
        scheduledFor,
        baseUrl: process.env.BASE_URL || 'https://spirittours.com'
      }
    );

    res.status(202).json({
      success: true,
      message: `Newsletter queued for ${emailIds.length} subscribers`,
      campaignId: campaignId || `newsletter_${Date.now()}`,
      queuedCount: emailIds.length
    });
  } catch (error) {
    logger.error('Error sending newsletter:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/nodemailer/unsubscribe
 * @desc    Unsubscribe email from mailings
 * @access  Public
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    nodemailerService.unsubscribe(email);

    res.json({
      success: true,
      message: 'Email unsubscribed successfully'
    });
  } catch (error) {
    logger.error('Error unsubscribing:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/nodemailer/unsubscribe/check/:email
 * @desc    Check if email is unsubscribed
 * @access  Private
 */
router.get('/unsubscribe/check/:email', requireAuth, (req, res) => {
  try {
    const { email } = req.params;
    const isUnsubscribed = nodemailerService.isUnsubscribed(email);

    res.json({
      success: true,
      email,
      isUnsubscribed
    });
  } catch (error) {
    logger.error('Error checking unsubscribe status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
