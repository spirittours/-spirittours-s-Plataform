/**
 * Outlook/Exchange Integration Routes
 * Microsoft Graph API OAuth 2.0 authentication and endpoints
 * 
 * Endpoints:
 * - GET /auth - Initiate OAuth flow
 * - GET /callback - Handle OAuth callback
 * - POST /send - Send email
 * - GET /emails - List emails
 * - GET /emails/:id - Get email details
 * - POST /sync-contacts - Sync contacts from Outlook
 * - GET /calendar/events - List calendar events
 * - POST /disconnect - Disconnect integration
 */

const express = require('express');
const router = express.Router();
const outlookService = require('../../services/crm/outlook.service');
const Workspace = require('../../models/Workspace');
const Contact = require('../../models/Contact');
const Activity = require('../../models/Activity');
const { authenticate } = require('../../middleware/auth');

/**
 * @route   GET /api/crm/integrations/outlook/auth
 * @desc    Initiate Outlook OAuth flow
 * @access  Private
 */
router.get('/auth', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'Workspace ID is required' });
    }

    // Verify workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    // Generate OAuth URL
    const authUrl = outlookService.getAuthUrl(workspaceId);

    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('Outlook auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating Outlook authentication',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/crm/integrations/outlook/callback
 * @desc    Handle OAuth callback
 * @access  Public
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`/crm/workspace-settings?error=outlook_auth_failed&message=${error}`);
    }

    if (!code || !state) {
      return res.status(400).json({ success: false, message: 'Authorization code and state are required' });
    }

    // Parse state to get workspace ID
    const [workspaceId] = state.split(':');

    // Exchange code for tokens
    const tokens = await outlookService.getTokensFromCode(code);

    // Get user profile
    const profile = await outlookService.getUserProfile(tokens.access_token);

    // Update workspace with Outlook integration data
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    workspace.integrations.outlook = {
      enabled: true,
      email: profile.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
      connectedAt: new Date(),
    };

    await workspace.save();

    // Log activity
    await Activity.logActivity(
      workspaceId,
      'integration_connected',
      null,
      'workspace',
      workspaceId,
      { integrationName: 'outlook', email: profile.email }
    );

    res.redirect(`/crm/workspace-settings?success=outlook_connected&email=${profile.email}`);
  } catch (error) {
    console.error('Outlook callback error:', error);
    res.redirect(`/crm/workspace-settings?error=outlook_auth_failed&message=${error.message}`);
  }
});

/**
 * @route   POST /api/crm/integrations/outlook/send
 * @desc    Send email via Outlook
 * @access  Private
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    const { workspaceId, to, cc, bcc, subject, body, attachments } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations.outlook?.enabled) {
      return res.status(400).json({ success: false, message: 'Outlook integration not configured' });
    }

    // Check if token is expired and refresh if needed
    const outlook = workspace.integrations.outlook;
    if (new Date(outlook.expiresAt) < new Date()) {
      const newTokens = await outlookService.refreshAccessToken(outlook.refreshToken);
      outlook.accessToken = newTokens.access_token;
      outlook.expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
      await workspace.save();
    }

    // Send email
    const result = await outlookService.sendEmail(outlook.accessToken, {
      to,
      cc,
      bcc,
      subject,
      body,
      attachments,
    });

    // Log activity
    await Activity.logActivity(
      workspaceId,
      'email_sent',
      req.user.id,
      'email',
      result.messageId,
      { to, subject, via: 'outlook' }
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error sending email via Outlook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/crm/integrations/outlook/emails
 * @desc    List emails from Outlook inbox
 * @access  Private
 */
router.get('/emails', authenticate, async (req, res) => {
  try {
    const { workspaceId, maxResults, pageToken, q } = req.query;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations.outlook?.enabled) {
      return res.status(400).json({ success: false, message: 'Outlook integration not configured' });
    }

    const outlook = workspace.integrations.outlook;
    if (new Date(outlook.expiresAt) < new Date()) {
      const newTokens = await outlookService.refreshAccessToken(outlook.refreshToken);
      outlook.accessToken = newTokens.access_token;
      outlook.expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
      await workspace.save();
    }

    const emails = await outlookService.listEmails(outlook.accessToken, {
      maxResults: parseInt(maxResults) || 10,
      pageToken,
      q,
    });

    res.json({ success: true, data: emails });
  } catch (error) {
    console.error('Error fetching emails from Outlook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch emails',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/crm/integrations/outlook/emails/:id
 * @desc    Get email details by ID
 * @access  Private
 */
router.get('/emails/:id', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const { id } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations.outlook?.enabled) {
      return res.status(400).json({ success: false, message: 'Outlook integration not configured' });
    }

    const outlook = workspace.integrations.outlook;
    if (new Date(outlook.expiresAt) < new Date()) {
      const newTokens = await outlookService.refreshAccessToken(outlook.refreshToken);
      outlook.accessToken = newTokens.access_token;
      outlook.expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
      await workspace.save();
    }

    const email = await outlookService.getEmail(outlook.accessToken, id);

    res.json({ success: true, data: email });
  } catch (error) {
    console.error('Error fetching email from Outlook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/crm/integrations/outlook/sync-contacts
 * @desc    Sync contacts from Outlook
 * @access  Private
 */
router.post('/sync-contacts', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations.outlook?.enabled) {
      return res.status(400).json({ success: false, message: 'Outlook integration not configured' });
    }

    const outlook = workspace.integrations.outlook;
    if (new Date(outlook.expiresAt) < new Date()) {
      const newTokens = await outlookService.refreshAccessToken(outlook.refreshToken);
      outlook.accessToken = newTokens.access_token;
      outlook.expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
      await workspace.save();
    }

    const contacts = await outlookService.syncContacts(outlook.accessToken);

    // Create or update contacts in database
    let created = 0;
    let updated = 0;

    for (const contactData of contacts) {
      if (!contactData.email) continue;

      const existing = await Contact.findOne({
        workspace: workspaceId,
        email: contactData.email,
      });

      if (existing) {
        Object.assign(existing, contactData);
        await existing.save();
        updated++;
      } else {
        await Contact.create({
          ...contactData,
          workspace: workspaceId,
          first_name: contactData.firstName,
          last_name: contactData.lastName,
        });
        created++;
      }
    }

    // Log activity
    await Activity.logActivity(
      workspaceId,
      'contacts_synced',
      req.user.id,
      'workspace',
      workspaceId,
      { source: 'outlook', created, updated }
    );

    res.json({
      success: true,
      data: { total: contacts.length, created, updated },
    });
  } catch (error) {
    console.error('Error syncing contacts from Outlook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync contacts',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/crm/integrations/outlook/calendar/events
 * @desc    List calendar events
 * @access  Private
 */
router.get('/calendar/events', authenticate, async (req, res) => {
  try {
    const { workspaceId, startDateTime, endDateTime, maxResults } = req.query;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations.outlook?.enabled) {
      return res.status(400).json({ success: false, message: 'Outlook integration not configured' });
    }

    const outlook = workspace.integrations.outlook;
    if (new Date(outlook.expiresAt) < new Date()) {
      const newTokens = await outlookService.refreshAccessToken(outlook.refreshToken);
      outlook.accessToken = newTokens.access_token;
      outlook.expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
      await workspace.save();
    }

    const events = await outlookService.listCalendarEvents(outlook.accessToken, {
      startDateTime,
      endDateTime,
      maxResults: parseInt(maxResults) || 50,
    });

    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching calendar events from Outlook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar events',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/crm/integrations/outlook/disconnect
 * @desc    Disconnect Outlook integration
 * @access  Private
 */
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    const { workspaceId } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    workspace.integrations.outlook = {
      enabled: false,
      email: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      scope: null,
      connectedAt: null,
    };

    await workspace.save();

    // Log activity
    await Activity.logActivity(
      workspaceId,
      'integration_disconnected',
      req.user.id,
      'workspace',
      workspaceId,
      { integrationName: 'outlook' }
    );

    res.json({ success: true, message: 'Outlook integration disconnected' });
  } catch (error) {
    console.error('Error disconnecting Outlook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Outlook',
      error: error.message,
    });
  }
});

module.exports = router;
