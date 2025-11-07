/**
 * Google Calendar Integration Routes
 * 
 * OAuth 2.0 authentication and two-way calendar synchronization
 * Features:
 * - OAuth authentication flow
 * - Two-way calendar sync (CRM ← → Google Calendar)
 * - Event creation and management
 * - Meeting scheduling
 * - Calendar availability checking
 * - Automatic reminder creation
 */

const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const Activity = require('../../models/Activity');
const Deal = require('../../models/Deal');
const Contact = require('../../models/Contact');
const Workspace = require('../../models/Workspace');

// OAuth2 configuration
const getOAuth2Client = (workspace) => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    `${process.env.API_URL}/api/crm/google-calendar/callback`
  );
};

/**
 * GET /api/crm/google-calendar/auth/:workspaceId
 * Generate OAuth authorization URL
 */
router.get('/auth/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const oauth2Client = getOAuth2Client(workspace);
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      state: workspaceId, // Pass workspace ID in state
    });

    console.log('Generated Google Calendar auth URL for workspace:', workspaceId);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Google Calendar auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /api/crm/google-calendar/callback
 * OAuth callback handler
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state: workspaceId } = req.query;

    if (!code || !workspaceId) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const oauth2Client = getOAuth2Client(workspace);
    const { tokens } = await oauth2Client.getToken(code);

    // Store tokens in workspace
    workspace.integrations.googleCalendar = {
      enabled: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date,
      connectedAt: new Date(),
    };
    await workspace.save();

    console.log('Google Calendar connected for workspace:', workspaceId);
    
    // Redirect to success page
    res.redirect(`${process.env.FRONTEND_URL}/crm/workspace-settings?tab=integrations&success=google-calendar`);
  } catch (error) {
    console.error('Error in Google Calendar callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/crm/workspace-settings?tab=integrations&error=google-calendar`);
  }
});

/**
 * GET /api/crm/google-calendar/status/:workspaceId
 * Get Google Calendar connection status
 */
router.get('/status/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const gcal = workspace.integrations?.googleCalendar;
    res.json({
      connected: gcal?.enabled || false,
      connectedAt: gcal?.connectedAt || null,
      syncEnabled: gcal?.syncEnabled || false,
    });
  } catch (error) {
    console.error('Error checking Google Calendar status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

/**
 * DELETE /api/crm/google-calendar/disconnect/:workspaceId
 * Disconnect Google Calendar integration
 */
router.delete('/disconnect/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Revoke tokens
    if (workspace.integrations?.googleCalendar?.accessToken) {
      const oauth2Client = getOAuth2Client(workspace);
      oauth2Client.setCredentials({
        access_token: workspace.integrations.googleCalendar.accessToken,
      });
      
      try {
        await oauth2Client.revokeCredentials();
      } catch (error) {
        console.error('Error revoking Google Calendar credentials:', error);
      }
    }

    // Remove integration data
    workspace.integrations.googleCalendar = {
      enabled: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      syncEnabled: false,
    };
    await workspace.save();

    console.log('Google Calendar disconnected for workspace:', workspaceId);
    res.json({ message: 'Google Calendar disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
  }
});

/**
 * POST /api/crm/google-calendar/create-event
 * Create calendar event from CRM activity
 */
router.post('/create-event', async (req, res) => {
  try {
    const { workspaceId, title, description, startTime, endTime, attendees, dealId, contactId } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.googleCalendar?.enabled) {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }

    // Setup OAuth client with stored tokens
    const oauth2Client = getOAuth2Client(workspace);
    oauth2Client.setCredentials({
      access_token: workspace.integrations.googleCalendar.accessToken,
      refresh_token: workspace.integrations.googleCalendar.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create event
    const event = {
      summary: title,
      description: description,
      start: {
        dateTime: startTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime,
        timeZone: 'UTC',
      },
      attendees: attendees?.map(email => ({ email })) || [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    // Log activity in CRM
    await Activity.logActivity({
      workspace: workspaceId,
      type: 'meeting_scheduled',
      entityType: dealId ? 'Deal' : 'Contact',
      entityId: dealId || contactId,
      user: req.user.id,
      metadata: {
        googleCalendarEventId: response.data.id,
        eventLink: response.data.htmlLink,
        title,
        startTime,
        endTime,
      },
    });

    console.log('Google Calendar event created:', response.data.id);
    res.json({
      message: 'Calendar event created successfully',
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
    });
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

/**
 * GET /api/crm/google-calendar/events/:workspaceId
 * Fetch upcoming calendar events
 */
router.get('/events/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate, maxResults = 50 } = req.query;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.googleCalendar?.enabled) {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }

    // Setup OAuth client
    const oauth2Client = getOAuth2Client(workspace);
    oauth2Client.setCredentials({
      access_token: workspace.integrations.googleCalendar.accessToken,
      refresh_token: workspace.integrations.googleCalendar.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch events
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate || new Date().toISOString(),
      timeMax: endDate,
      maxResults: parseInt(maxResults),
      singleEvents: true,
      orderBy: 'startTime',
    });

    console.log(`Fetched ${response.data.items.length} Google Calendar events`);
    res.json({
      events: response.data.items,
      totalCount: response.data.items.length,
    });
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

/**
 * GET /api/crm/google-calendar/free-busy/:workspaceId
 * Check calendar availability (free/busy time)
 */
router.get('/free-busy/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate, emails } = req.query;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.googleCalendar?.enabled) {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }

    // Setup OAuth client
    const oauth2Client = getOAuth2Client(workspace);
    oauth2Client.setCredentials({
      access_token: workspace.integrations.googleCalendar.accessToken,
      refresh_token: workspace.integrations.googleCalendar.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Query free/busy
    const emailList = typeof emails === 'string' ? emails.split(',') : ['primary'];
    const response = await calendar.freebusy.query({
      resource: {
        timeMin: startDate || new Date().toISOString(),
        timeMax: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        items: emailList.map(email => ({ id: email.trim() })),
      },
    });

    console.log('Free/busy query completed');
    res.json({
      calendars: response.data.calendars,
    });
  } catch (error) {
    console.error('Error querying free/busy:', error);
    res.status(500).json({ error: 'Failed to query availability' });
  }
});

/**
 * PUT /api/crm/google-calendar/sync-settings/:workspaceId
 * Update synchronization settings
 */
router.put('/sync-settings/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { syncEnabled, syncDirection, autoCreateEvents } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (!workspace.integrations?.googleCalendar) {
      workspace.integrations.googleCalendar = {};
    }

    workspace.integrations.googleCalendar.syncEnabled = syncEnabled;
    workspace.integrations.googleCalendar.syncDirection = syncDirection || 'bidirectional'; // 'bidirectional', 'toGoogle', 'fromGoogle'
    workspace.integrations.googleCalendar.autoCreateEvents = autoCreateEvents || false;
    
    await workspace.save();

    console.log('Google Calendar sync settings updated for workspace:', workspaceId);
    res.json({ message: 'Sync settings updated successfully', settings: workspace.integrations.googleCalendar });
  } catch (error) {
    console.error('Error updating sync settings:', error);
    res.status(500).json({ error: 'Failed to update sync settings' });
  }
});

module.exports = router;
