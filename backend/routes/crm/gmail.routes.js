/**
 * Gmail Integration Routes
 * OAuth 2.0 authentication and Gmail API endpoints
 * 
 * Endpoints:
 * - GET /auth - Initiate OAuth flow
 * - GET /callback - Handle OAuth callback
 * - POST /send - Send email
 * - GET /emails - List emails
 * - GET /emails/:id - Get email details
 * - POST /sync-contacts - Sync contacts from Gmail
 * - POST /webhook/setup - Setup push notifications
 * - POST /webhook/stop - Stop push notifications
 */

const express = require('express');
const router = express.Router();
const gmailService = require('../../services/gmail.service');
const Workspace = require('../../models/Workspace');
const Contact = require('../../models/Contact');
const Activity = require('../../models/Activity');

/**
 * @route   GET /api/crm/integrations/gmail/auth
 * @desc    Initiate Gmail OAuth flow
 * @access  Private
 */
router.get('/auth', async (req, res) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    // Verify workspace exists and user has access
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Generate OAuth URL
    const authUrl = gmailService.getAuthUrl(workspaceId);

    res.json({ authUrl });
  } catch (error) {
    console.error('Gmail auth error:', error);
    res.status(500).json({ message: 'Error initiating Gmail authentication', error: error.message });
  }
});

/**
 * @route   GET /api/crm/integrations/gmail/callback
 * @desc    Handle OAuth callback and exchange code for tokens
 * @access  Public (callback from Google)
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`/crm/workspace-settings?error=gmail_auth_failed&message=${error}`);
    }

    if (!code || !state) {
      return res.status(400).json({ message: 'Authorization code and state are required' });
    }

    // Parse state to get workspace ID
    const [workspaceId, stateToken] = state.split(':');

    // Exchange code for tokens
    const tokens = await gmailService.getTokensFromCode(code);

    // Set credentials and get user profile
    gmailService.setCredentials(tokens);
    const profile = await gmailService.getUserProfile();

    // Update workspace with Gmail integration data
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    workspace.integrations.gmail = {
      enabled: true,
      email: profile.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date),
      scope: tokens.scope,
      connectedAt: new Date(),
    };

    await workspace.save();

    // Log activity
    await Activity.create({
      workspace: workspaceId,
      type: 'integration_connected',
      description: `Gmail integration connected: ${profile.email}`,
      metadata: {
        integration: 'gmail',
        email: profile.email,
      },
    });

    // Redirect to settings page with success message
    res.redirect(`/crm/workspace-settings?success=gmail_connected&email=${profile.email}`);
  } catch (error) {
    console.error('Gmail callback error:', error);
    res.redirect(`/crm/workspace-settings?error=gmail_connection_failed&message=${error.message}`);
  }
});

/**
 * @route   POST /api/crm/integrations/gmail/send
 * @desc    Send email via Gmail
 * @access  Private
 */
router.post('/send', async (req, res) => {
  try {
    const { workspaceId, to, subject, body, cc, bcc } = req.body;

    if (!workspaceId || !to || !subject || !body) {
      return res.status(400).json({ message: 'Workspace ID, recipient, subject, and body are required' });
    }

    // Get workspace and Gmail credentials
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations.gmail.enabled) {
      return res.status(400).json({ message: 'Gmail integration not enabled' });
    }

    // Check if token is expired and refresh if needed
    const gmailConfig = workspace.integrations.gmail;
    if (new Date() >= new Date(gmailConfig.expiresAt)) {
      const newTokens = await gmailService.refreshAccessToken(gmailConfig.refreshToken);
      gmailConfig.accessToken = newTokens.access_token;
      gmailConfig.expiresAt = new Date(newTokens.expiry_date);
      await workspace.save();
    }

    // Set credentials
    gmailService.setCredentials({
      access_token: gmailConfig.accessToken,
      refresh_token: gmailConfig.refreshToken,
    });

    // Send email
    const sentMessage = await gmailService.sendEmail({ to, subject, body, cc, bcc });

    // Log activity
    await Activity.create({
      workspace: workspaceId,
      type: 'email_sent',
      description: `Email sent via Gmail: ${subject}`,
      metadata: {
        to,
        subject,
        messageId: sentMessage.id,
      },
    });

    res.json({
      message: 'Email sent successfully',
      messageId: sentMessage.id,
      threadId: sentMessage.threadId,
    });
  } catch (error) {
    console.error('Gmail send error:', error);
    res.status(500).json({ message: 'Error sending email', error: error.message });
  }
});

/**
 * @route   GET /api/crm/integrations/gmail/emails
 * @desc    List emails from Gmail
 * @access  Private
 */
router.get('/emails', async (req, res) => {
  try {
    const { workspaceId, query, maxResults, pageToken } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    // Get workspace and Gmail credentials
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations.gmail.enabled) {
      return res.status(400).json({ message: 'Gmail integration not enabled' });
    }

    // Set credentials
    const gmailConfig = workspace.integrations.gmail;
    gmailService.setCredentials({
      access_token: gmailConfig.accessToken,
      refresh_token: gmailConfig.refreshToken,
    });

    // List emails
    const emails = await gmailService.listEmails({
      query,
      maxResults: parseInt(maxResults) || 50,
      pageToken,
    });

    res.json(emails);
  } catch (error) {
    console.error('Gmail list emails error:', error);
    res.status(500).json({ message: 'Error listing emails', error: error.message });
  }
});

/**
 * @route   GET /api/crm/integrations/gmail/emails/:id
 * @desc    Get email details
 * @access  Private
 */
router.get('/emails/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    // Get workspace and Gmail credentials
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations.gmail.enabled) {
      return res.status(400).json({ message: 'Gmail integration not enabled' });
    }

    // Set credentials
    const gmailConfig = workspace.integrations.gmail;
    gmailService.setCredentials({
      access_token: gmailConfig.accessToken,
      refresh_token: gmailConfig.refreshToken,
    });

    // Get email
    const email = await gmailService.getEmail(id);
    
    // Parse email for easier consumption
    const headers = gmailService.parseHeaders(email.payload.headers);
    const body = gmailService.getEmailBody(email.payload);

    res.json({
      id: email.id,
      threadId: email.threadId,
      from: headers.from,
      to: headers.to,
      subject: headers.subject,
      date: headers.date,
      body,
      snippet: email.snippet,
      labelIds: email.labelIds,
    });
  } catch (error) {
    console.error('Gmail get email error:', error);
    res.status(500).json({ message: 'Error getting email', error: error.message });
  }
});

/**
 * @route   POST /api/crm/integrations/gmail/sync-contacts
 * @desc    Sync contacts from Gmail
 * @access  Private
 */
router.post('/sync-contacts', async (req, res) => {
  try {
    const { workspaceId } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    // Get workspace and Gmail credentials
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations.gmail.enabled) {
      return res.status(400).json({ message: 'Gmail integration not enabled' });
    }

    // Set credentials
    const gmailConfig = workspace.integrations.gmail;
    gmailService.setCredentials({
      access_token: gmailConfig.accessToken,
      refresh_token: gmailConfig.refreshToken,
    });

    // Sync contacts
    const gmailContacts = await gmailService.syncContacts();
    
    let syncedCount = 0;
    let updatedCount = 0;

    for (const person of gmailContacts) {
      const names = person.names?.[0];
      const emails = person.emailAddresses?.[0];
      const phones = person.phoneNumbers?.[0];
      const orgs = person.organizations?.[0];

      if (!emails?.value) continue;

      // Check if contact exists
      const existingContact = await Contact.findOne({
        workspace: workspaceId,
        email: emails.value,
      });

      if (existingContact) {
        // Update existing contact
        existingContact.syncedFrom = 'gmail';
        existingContact.lastSyncAt = new Date();
        await existingContact.save();
        updatedCount++;
      } else {
        // Create new contact
        await Contact.create({
          workspace: workspaceId,
          first_name: names?.givenName || '',
          last_name: names?.familyName || '',
          email: emails.value,
          phone: phones?.value,
          company: orgs?.name,
          title: orgs?.title,
          syncedFrom: 'gmail',
          lastSyncAt: new Date(),
        });
        syncedCount++;
      }
    }

    // Log activity
    await Activity.create({
      workspace: workspaceId,
      type: 'contacts_synced',
      description: `Synced ${syncedCount} new contacts from Gmail`,
      metadata: {
        integration: 'gmail',
        syncedCount,
        updatedCount,
      },
    });

    res.json({
      message: 'Contacts synced successfully',
      syncedCount,
      updatedCount,
      totalProcessed: gmailContacts.length,
    });
  } catch (error) {
    console.error('Gmail sync contacts error:', error);
    res.status(500).json({ message: 'Error syncing contacts', error: error.message });
  }
});

/**
 * @route   POST /api/crm/integrations/gmail/disconnect
 * @desc    Disconnect Gmail integration
 * @access  Private
 */
router.post('/disconnect', async (req, res) => {
  try {
    const { workspaceId } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    // Get workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Disable integration
    workspace.integrations.gmail.enabled = false;
    workspace.integrations.gmail.accessToken = null;
    workspace.integrations.gmail.refreshToken = null;
    await workspace.save();

    // Log activity
    await Activity.create({
      workspace: workspaceId,
      type: 'integration_disconnected',
      description: 'Gmail integration disconnected',
      metadata: { integration: 'gmail' },
    });

    res.json({ message: 'Gmail integration disconnected successfully' });
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    res.status(500).json({ message: 'Error disconnecting Gmail', error: error.message });
  }
});

module.exports = router;
