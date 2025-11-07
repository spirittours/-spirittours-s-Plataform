/**
 * Outlook Calendar Integration Routes
 * 
 * Microsoft Graph API integration for calendar synchronization
 * Features:
 * - OAuth 2.0 authentication with Microsoft
 * - Two-way calendar sync (CRM ← → Outlook Calendar)
 * - Event creation and management
 * - Meeting scheduling with Teams integration
 * - Calendar availability checking
 * - Recurring events support
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const Activity = require('../../models/Activity');
const Deal = require('../../models/Deal');
const Contact = require('../../models/Contact');
const Workspace = require('../../models/Workspace');

// Microsoft Graph API endpoints
const GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0';
const AUTH_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0';

/**
 * GET /api/crm/outlook-calendar/auth/:workspaceId
 * Generate OAuth authorization URL
 */
router.get('/auth/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const authUrl = `${AUTH_ENDPOINT}/authorize?` +
      `client_id=${encodeURIComponent(process.env.MICROSOFT_CLIENT_ID)}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(process.env.API_URL + '/api/crm/outlook-calendar/callback')}` +
      `&scope=${encodeURIComponent('openid profile User.Read Calendars.ReadWrite Calendars.ReadWrite.Shared')}` +
      `&state=${encodeURIComponent(workspaceId)}` +
      `&response_mode=query`;

    console.log('Generated Outlook Calendar auth URL for workspace:', workspaceId);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Outlook Calendar auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /api/crm/outlook-calendar/callback
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

    // Exchange code for tokens
    const tokenResponse = await axios.post(`${AUTH_ENDPOINT}/token`, new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.API_URL}/api/crm/outlook-calendar/callback`,
      grant_type: 'authorization_code',
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Store tokens in workspace
    workspace.integrations.outlookCalendar = {
      enabled: true,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiry: Date.now() + expires_in * 1000,
      connectedAt: new Date(),
    };
    await workspace.save();

    console.log('Outlook Calendar connected for workspace:', workspaceId);
    
    res.redirect(`${process.env.FRONTEND_URL}/crm/workspace-settings?tab=integrations&success=outlook-calendar`);
  } catch (error) {
    console.error('Error in Outlook Calendar callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/crm/workspace-settings?tab=integrations&error=outlook-calendar`);
  }
});

/**
 * GET /api/crm/outlook-calendar/status/:workspaceId
 * Get Outlook Calendar connection status
 */
router.get('/status/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const outlookCal = workspace.integrations?.outlookCalendar;
    res.json({
      connected: outlookCal?.enabled || false,
      connectedAt: outlookCal?.connectedAt || null,
      syncEnabled: outlookCal?.syncEnabled || false,
    });
  } catch (error) {
    console.error('Error checking Outlook Calendar status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

/**
 * DELETE /api/crm/outlook-calendar/disconnect/:workspaceId
 * Disconnect Outlook Calendar integration
 */
router.delete('/disconnect/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Remove integration data
    workspace.integrations.outlookCalendar = {
      enabled: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      syncEnabled: false,
    };
    await workspace.save();

    console.log('Outlook Calendar disconnected for workspace:', workspaceId);
    res.json({ message: 'Outlook Calendar disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Outlook Calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect Outlook Calendar' });
  }
});

/**
 * Helper function to refresh access token if expired
 */
const refreshAccessToken = async (workspace) => {
  if (!workspace.integrations?.outlookCalendar?.refreshToken) {
    throw new Error('No refresh token available');
  }

  const tokenResponse = await axios.post(`${AUTH_ENDPOINT}/token`, new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET,
    refresh_token: workspace.integrations.outlookCalendar.refreshToken,
    grant_type: 'refresh_token',
  }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const { access_token, refresh_token, expires_in } = tokenResponse.data;

  workspace.integrations.outlookCalendar.accessToken = access_token;
  if (refresh_token) {
    workspace.integrations.outlookCalendar.refreshToken = refresh_token;
  }
  workspace.integrations.outlookCalendar.tokenExpiry = Date.now() + expires_in * 1000;
  await workspace.save();

  return access_token;
};

/**
 * Helper function to get valid access token
 */
const getValidAccessToken = async (workspace) => {
  const outlookCal = workspace.integrations?.outlookCalendar;
  
  // Check if token is expired or about to expire (5 minutes buffer)
  if (!outlookCal || Date.now() >= (outlookCal.tokenExpiry - 5 * 60 * 1000)) {
    return await refreshAccessToken(workspace);
  }
  
  return outlookCal.accessToken;
};

/**
 * POST /api/crm/outlook-calendar/create-event
 * Create calendar event from CRM activity
 */
router.post('/create-event', async (req, res) => {
  try {
    const { workspaceId, title, description, startTime, endTime, attendees, location, dealId, contactId, isTeamsMeeting } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.outlookCalendar?.enabled) {
      return res.status(400).json({ error: 'Outlook Calendar not connected' });
    }

    const accessToken = await getValidAccessToken(workspace);

    // Create event payload
    const event = {
      subject: title,
      body: {
        contentType: 'HTML',
        content: description || '',
      },
      start: {
        dateTime: startTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime,
        timeZone: 'UTC',
      },
      location: location ? { displayName: location } : undefined,
      attendees: attendees?.map(email => ({
        emailAddress: { address: email },
        type: 'required',
      })) || [],
      isOnlineMeeting: isTeamsMeeting || false,
      onlineMeetingProvider: isTeamsMeeting ? 'teamsForBusiness' : undefined,
    };

    // Create event via Microsoft Graph API
    const response = await axios.post(
      `${GRAPH_API_ENDPOINT}/me/events`,
      event,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Log activity in CRM
    await Activity.logActivity({
      workspace: workspaceId,
      type: 'meeting_scheduled',
      entityType: dealId ? 'Deal' : 'Contact',
      entityId: dealId || contactId,
      user: req.user.id,
      metadata: {
        outlookCalendarEventId: response.data.id,
        eventLink: response.data.webLink,
        teamsLink: response.data.onlineMeeting?.joinUrl,
        title,
        startTime,
        endTime,
      },
    });

    console.log('Outlook Calendar event created:', response.data.id);
    res.json({
      message: 'Calendar event created successfully',
      eventId: response.data.id,
      eventLink: response.data.webLink,
      teamsLink: response.data.onlineMeeting?.joinUrl,
    });
  } catch (error) {
    console.error('Error creating Outlook Calendar event:', error);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

/**
 * GET /api/crm/outlook-calendar/events/:workspaceId
 * Fetch upcoming calendar events
 */
router.get('/events/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate, top = 50 } = req.query;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.outlookCalendar?.enabled) {
      return res.status(400).json({ error: 'Outlook Calendar not connected' });
    }

    const accessToken = await getValidAccessToken(workspace);

    // Build query parameters
    const params = new URLSearchParams({
      $top: top,
      $orderby: 'start/dateTime',
    });

    if (startDate) {
      params.append('$filter', `start/dateTime ge '${startDate}'`);
    }

    // Fetch events via Microsoft Graph API
    const response = await axios.get(
      `${GRAPH_API_ENDPOINT}/me/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log(`Fetched ${response.data.value.length} Outlook Calendar events`);
    res.json({
      events: response.data.value,
      totalCount: response.data.value.length,
    });
  } catch (error) {
    console.error('Error fetching Outlook Calendar events:', error);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

/**
 * GET /api/crm/outlook-calendar/free-busy/:workspaceId
 * Check calendar availability (free/busy time)
 */
router.get('/free-busy/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate, emails } = req.query;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.outlookCalendar?.enabled) {
      return res.status(400).json({ error: 'Outlook Calendar not connected' });
    }

    const accessToken = await getValidAccessToken(workspace);

    // Build schedule query
    const emailList = typeof emails === 'string' ? emails.split(',') : [];
    const scheduleQuery = {
      schedules: emailList.map(email => email.trim()),
      startTime: {
        dateTime: startDate || new Date().toISOString(),
        timeZone: 'UTC',
      },
      endTime: {
        dateTime: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        timeZone: 'UTC',
      },
      availabilityViewInterval: 60, // 60 minutes
    };

    // Query schedule via Microsoft Graph API
    const response = await axios.post(
      `${GRAPH_API_ENDPOINT}/me/calendar/getSchedule`,
      scheduleQuery,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Free/busy query completed');
    res.json({
      schedules: response.data.value,
    });
  } catch (error) {
    console.error('Error querying free/busy:', error);
    res.status(500).json({ error: 'Failed to query availability' });
  }
});

/**
 * PUT /api/crm/outlook-calendar/sync-settings/:workspaceId
 * Update synchronization settings
 */
router.put('/sync-settings/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { syncEnabled, syncDirection, autoCreateEvents, enableTeamsMeetings } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (!workspace.integrations?.outlookCalendar) {
      workspace.integrations.outlookCalendar = {};
    }

    workspace.integrations.outlookCalendar.syncEnabled = syncEnabled;
    workspace.integrations.outlookCalendar.syncDirection = syncDirection || 'bidirectional';
    workspace.integrations.outlookCalendar.autoCreateEvents = autoCreateEvents || false;
    workspace.integrations.outlookCalendar.enableTeamsMeetings = enableTeamsMeetings || false;
    
    await workspace.save();

    console.log('Outlook Calendar sync settings updated for workspace:', workspaceId);
    res.json({ message: 'Sync settings updated successfully', settings: workspace.integrations.outlookCalendar });
  } catch (error) {
    console.error('Error updating sync settings:', error);
    res.status(500).json({ error: 'Failed to update sync settings' });
  }
});

module.exports = router;
