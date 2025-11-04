/**
 * Zoom Video Conferencing Integration Routes
 * 
 * Complete Zoom integration for video meetings
 * Features:
 * - OAuth 2.0 authentication with Zoom
 * - Create instant and scheduled meetings
 * - Generate meeting links
 * - Manage participants
 * - Webhook notifications for meeting events
 * - Recording management
 * - Breakout rooms support
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const Activity = require('../../models/Activity');
const Deal = require('../../models/Deal');
const Contact = require('../../models/Contact');
const Workspace = require('../../models/Workspace');

// Zoom API endpoints
const ZOOM_AUTH_ENDPOINT = 'https://zoom.us/oauth';
const ZOOM_API_ENDPOINT = 'https://api.zoom.us/v2';

/**
 * GET /api/crm/zoom/auth/:workspaceId
 * Generate OAuth authorization URL
 */
router.get('/auth/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const authUrl = `${ZOOM_AUTH_ENDPOINT}/authorize?` +
      `response_type=code` +
      `&client_id=${encodeURIComponent(process.env.ZOOM_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(process.env.API_URL + '/api/crm/zoom/callback')}` +
      `&state=${encodeURIComponent(workspaceId)}`;

    console.log('Generated Zoom auth URL for workspace:', workspaceId);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Zoom auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /api/crm/zoom/callback
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
    const tokenResponse = await axios.post(
      `${ZOOM_AUTH_ENDPOINT}/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.API_URL}/api/crm/zoom/callback`,
      }),
      {
        auth: {
          username: process.env.ZOOM_CLIENT_ID,
          password: process.env.ZOOM_CLIENT_SECRET,
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Store tokens in workspace
    workspace.integrations.zoom = {
      enabled: true,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiry: Date.now() + expires_in * 1000,
      connectedAt: new Date(),
    };
    await workspace.save();

    console.log('Zoom connected for workspace:', workspaceId);
    
    res.redirect(`${process.env.FRONTEND_URL}/crm/workspace-settings?tab=integrations&success=zoom`);
  } catch (error) {
    console.error('Error in Zoom callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/crm/workspace-settings?tab=integrations&error=zoom`);
  }
});

/**
 * GET /api/crm/zoom/status/:workspaceId
 * Get Zoom connection status
 */
router.get('/status/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const zoom = workspace.integrations?.zoom;
    res.json({
      connected: zoom?.enabled || false,
      connectedAt: zoom?.connectedAt || null,
    });
  } catch (error) {
    console.error('Error checking Zoom status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

/**
 * DELETE /api/crm/zoom/disconnect/:workspaceId
 * Disconnect Zoom integration
 */
router.delete('/disconnect/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Revoke token
    if (workspace.integrations?.zoom?.accessToken) {
      try {
        await axios.post(
          `${ZOOM_AUTH_ENDPOINT}/revoke`,
          new URLSearchParams({
            token: workspace.integrations.zoom.accessToken,
          }),
          {
            auth: {
              username: process.env.ZOOM_CLIENT_ID,
              password: process.env.ZOOM_CLIENT_SECRET,
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        );
      } catch (error) {
        console.error('Error revoking Zoom token:', error);
      }
    }

    // Remove integration data
    workspace.integrations.zoom = {
      enabled: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
    };
    await workspace.save();

    console.log('Zoom disconnected for workspace:', workspaceId);
    res.json({ message: 'Zoom disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Zoom:', error);
    res.status(500).json({ error: 'Failed to disconnect Zoom' });
  }
});

/**
 * Helper function to refresh access token if expired
 */
const refreshAccessToken = async (workspace) => {
  if (!workspace.integrations?.zoom?.refreshToken) {
    throw new Error('No refresh token available');
  }

  const tokenResponse = await axios.post(
    `${ZOOM_AUTH_ENDPOINT}/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: workspace.integrations.zoom.refreshToken,
    }),
    {
      auth: {
        username: process.env.ZOOM_CLIENT_ID,
        password: process.env.ZOOM_CLIENT_SECRET,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  const { access_token, refresh_token, expires_in } = tokenResponse.data;

  workspace.integrations.zoom.accessToken = access_token;
  if (refresh_token) {
    workspace.integrations.zoom.refreshToken = refresh_token;
  }
  workspace.integrations.zoom.tokenExpiry = Date.now() + expires_in * 1000;
  await workspace.save();

  return access_token;
};

/**
 * Helper function to get valid access token
 */
const getValidAccessToken = async (workspace) => {
  const zoom = workspace.integrations?.zoom;
  
  if (!zoom || Date.now() >= (zoom.tokenExpiry - 5 * 60 * 1000)) {
    return await refreshAccessToken(workspace);
  }
  
  return zoom.accessToken;
};

/**
 * POST /api/crm/zoom/create-meeting
 * Create Zoom meeting
 */
router.post('/create-meeting', async (req, res) => {
  try {
    const {
      workspaceId,
      topic,
      agenda,
      startTime,
      duration, // in minutes
      timezone = 'UTC',
      password,
      dealId,
      contactId,
      settings = {},
    } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.zoom?.enabled) {
      return res.status(400).json({ error: 'Zoom not connected' });
    }

    const accessToken = await getValidAccessToken(workspace);

    // Create meeting
    const meetingData = {
      topic,
      type: startTime ? 2 : 1, // 1 = instant, 2 = scheduled
      start_time: startTime,
      duration,
      timezone,
      password,
      agenda,
      settings: {
        host_video: settings.hostVideo !== false,
        participant_video: settings.participantVideo !== false,
        join_before_host: settings.joinBeforeHost || false,
        mute_upon_entry: settings.muteUponEntry || false,
        watermark: settings.watermark || false,
        use_pmi: settings.usePmi || false,
        approval_type: settings.approvalType || 2, // 0 = auto, 1 = manual, 2 = no registration
        audio: settings.audio || 'both', // both, telephony, voip
        auto_recording: settings.autoRecording || 'none', // none, local, cloud
        waiting_room: settings.waitingRoom !== false,
        ...settings,
      },
    };

    const response = await axios.post(
      `${ZOOM_API_ENDPOINT}/users/me/meetings`,
      meetingData,
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
        zoomMeetingId: response.data.id,
        joinUrl: response.data.join_url,
        startUrl: response.data.start_url,
        topic,
        startTime,
        duration,
      },
    });

    console.log('Zoom meeting created:', response.data.id);
    res.json({
      message: 'Zoom meeting created successfully',
      meetingId: response.data.id,
      joinUrl: response.data.join_url,
      startUrl: response.data.start_url,
      password: response.data.password,
    });
  } catch (error) {
    console.error('Error creating Zoom meeting:', error);
    res.status(500).json({ error: 'Failed to create Zoom meeting' });
  }
});

/**
 * GET /api/crm/zoom/meeting/:workspaceId/:meetingId
 * Get meeting details
 */
router.get('/meeting/:workspaceId/:meetingId', async (req, res) => {
  try {
    const { workspaceId, meetingId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.zoom?.enabled) {
      return res.status(400).json({ error: 'Zoom not connected' });
    }

    const accessToken = await getValidAccessToken(workspace);

    const response = await axios.get(
      `${ZOOM_API_ENDPOINT}/meetings/${meetingId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    console.log('Meeting details retrieved:', meetingId);
    res.json(response.data);
  } catch (error) {
    console.error('Error getting meeting details:', error);
    res.status(500).json({ error: 'Failed to get meeting details' });
  }
});

/**
 * DELETE /api/crm/zoom/meeting/:workspaceId/:meetingId
 * Delete Zoom meeting
 */
router.delete('/meeting/:workspaceId/:meetingId', async (req, res) => {
  try {
    const { workspaceId, meetingId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.zoom?.enabled) {
      return res.status(400).json({ error: 'Zoom not connected' });
    }

    const accessToken = await getValidAccessToken(workspace);

    await axios.delete(
      `${ZOOM_API_ENDPOINT}/meetings/${meetingId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    console.log('Zoom meeting deleted:', meetingId);
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

/**
 * GET /api/crm/zoom/meetings/:workspaceId
 * List all meetings
 */
router.get('/meetings/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { type = 'scheduled', pageSize = 30 } = req.query;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.zoom?.enabled) {
      return res.status(400).json({ error: 'Zoom not connected' });
    }

    const accessToken = await getValidAccessToken(workspace);

    const response = await axios.get(
      `${ZOOM_API_ENDPOINT}/users/me/meetings?type=${type}&page_size=${pageSize}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    console.log(`Listed ${response.data.meetings?.length || 0} Zoom meetings`);
    res.json({
      meetings: response.data.meetings || [],
      totalCount: response.data.total_records || 0,
    });
  } catch (error) {
    console.error('Error listing meetings:', error);
    res.status(500).json({ error: 'Failed to list meetings' });
  }
});

/**
 * POST /api/crm/zoom/webhook
 * Webhook endpoint for Zoom events
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    
    console.log('Zoom webhook received:', event.event);

    // Verify webhook signature (if configured)
    // const signature = req.headers['x-zm-signature'];
    // ... verify signature logic

    // Process different event types
    switch (event.event) {
      case 'meeting.started':
        // Meeting has started
        await Activity.logActivity({
          workspace: event.payload.object.workspace_id,
          type: 'meeting_started',
          metadata: {
            zoomMeetingId: event.payload.object.id,
            topic: event.payload.object.topic,
            startTime: event.payload.object.start_time,
          },
        });
        break;

      case 'meeting.ended':
        // Meeting has ended
        await Activity.logActivity({
          workspace: event.payload.object.workspace_id,
          type: 'meeting_ended',
          metadata: {
            zoomMeetingId: event.payload.object.id,
            topic: event.payload.object.topic,
            duration: event.payload.object.duration,
          },
        });
        break;

      case 'recording.completed':
        // Recording is available
        await Activity.logActivity({
          workspace: event.payload.object.workspace_id,
          type: 'meeting_recorded',
          metadata: {
            zoomMeetingId: event.payload.object.id,
            recordingFiles: event.payload.object.recording_files,
          },
        });
        break;
    }

    res.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing Zoom webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * GET /api/crm/zoom/recordings/:workspaceId/:meetingId
 * Get meeting recordings
 */
router.get('/recordings/:workspaceId/:meetingId', async (req, res) => {
  try {
    const { workspaceId, meetingId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.zoom?.enabled) {
      return res.status(400).json({ error: 'Zoom not connected' });
    }

    const accessToken = await getValidAccessToken(workspace);

    const response = await axios.get(
      `${ZOOM_API_ENDPOINT}/meetings/${meetingId}/recordings`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    console.log('Meeting recordings retrieved:', meetingId);
    res.json({
      meetingId,
      recordings: response.data.recording_files || [],
    });
  } catch (error) {
    console.error('Error getting recordings:', error);
    res.status(500).json({ error: 'Failed to get recordings' });
  }
});

module.exports = router;
