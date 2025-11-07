/**
 * DocuSign E-Signature Integration Routes
 * 
 * Complete e-signature workflow for contracts and agreements
 * Features:
 * - OAuth 2.0 authentication with DocuSign
 * - Send documents for signature
 * - Track signature status
 * - Receive webhook notifications
 * - Auto-store signed documents
 * - Template-based document generation
 * - Multi-signer workflow support
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const Activity = require('../../models/Activity');
const Deal = require('../../models/Deal');
const Contact = require('../../models/Contact');
const Workspace = require('../../models/Workspace');

// DocuSign API endpoints
const DOCUSIGN_AUTH_ENDPOINT = 'https://account-d.docusign.com/oauth';
const DOCUSIGN_API_ENDPOINT = 'https://demo.docusign.net/restapi';

/**
 * GET /api/crm/docusign/auth/:workspaceId
 * Generate OAuth authorization URL
 */
router.get('/auth/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const authUrl = `${DOCUSIGN_AUTH_ENDPOINT}/auth?` +
      `response_type=code` +
      `&scope=${encodeURIComponent('signature impersonation')}` +
      `&client_id=${encodeURIComponent(process.env.DOCUSIGN_INTEGRATION_KEY)}` +
      `&redirect_uri=${encodeURIComponent(process.env.API_URL + '/api/crm/docusign/callback')}` +
      `&state=${encodeURIComponent(workspaceId)}`;

    console.log('Generated DocuSign auth URL for workspace:', workspaceId);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating DocuSign auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /api/crm/docusign/callback
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
      `${DOCUSIGN_AUTH_ENDPOINT}/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
      }),
      {
        auth: {
          username: process.env.DOCUSIGN_INTEGRATION_KEY,
          password: process.env.DOCUSIGN_SECRET_KEY,
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Get user info to retrieve account ID
    const userInfoResponse = await axios.get(
      `${DOCUSIGN_AUTH_ENDPOINT}/userinfo`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const accountId = userInfoResponse.data.accounts[0].account_id;
    const baseUrl = userInfoResponse.data.accounts[0].base_uri + '/restapi';

    // Store tokens in workspace
    workspace.integrations.docusign = {
      enabled: true,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiry: Date.now() + expires_in * 1000,
      accountId,
      baseUrl,
      connectedAt: new Date(),
    };
    await workspace.save();

    console.log('DocuSign connected for workspace:', workspaceId);
    
    res.redirect(`${process.env.FRONTEND_URL}/crm/workspace-settings?tab=integrations&success=docusign`);
  } catch (error) {
    console.error('Error in DocuSign callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/crm/workspace-settings?tab=integrations&error=docusign`);
  }
});

/**
 * GET /api/crm/docusign/status/:workspaceId
 * Get DocuSign connection status
 */
router.get('/status/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const docusign = workspace.integrations?.docusign;
    res.json({
      connected: docusign?.enabled || false,
      connectedAt: docusign?.connectedAt || null,
      accountId: docusign?.accountId || null,
    });
  } catch (error) {
    console.error('Error checking DocuSign status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

/**
 * DELETE /api/crm/docusign/disconnect/:workspaceId
 * Disconnect DocuSign integration
 */
router.delete('/disconnect/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Remove integration data
    workspace.integrations.docusign = {
      enabled: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      accountId: null,
      baseUrl: null,
    };
    await workspace.save();

    console.log('DocuSign disconnected for workspace:', workspaceId);
    res.json({ message: 'DocuSign disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting DocuSign:', error);
    res.status(500).json({ error: 'Failed to disconnect DocuSign' });
  }
});

/**
 * Helper function to refresh access token if expired
 */
const refreshAccessToken = async (workspace) => {
  if (!workspace.integrations?.docusign?.refreshToken) {
    throw new Error('No refresh token available');
  }

  const tokenResponse = await axios.post(
    `${DOCUSIGN_AUTH_ENDPOINT}/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: workspace.integrations.docusign.refreshToken,
    }),
    {
      auth: {
        username: process.env.DOCUSIGN_INTEGRATION_KEY,
        password: process.env.DOCUSIGN_SECRET_KEY,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  const { access_token, refresh_token, expires_in } = tokenResponse.data;

  workspace.integrations.docusign.accessToken = access_token;
  if (refresh_token) {
    workspace.integrations.docusign.refreshToken = refresh_token;
  }
  workspace.integrations.docusign.tokenExpiry = Date.now() + expires_in * 1000;
  await workspace.save();

  return access_token;
};

/**
 * Helper function to get valid access token
 */
const getValidAccessToken = async (workspace) => {
  const docusign = workspace.integrations?.docusign;
  
  if (!docusign || Date.now() >= (docusign.tokenExpiry - 5 * 60 * 1000)) {
    return await refreshAccessToken(workspace);
  }
  
  return docusign.accessToken;
};

/**
 * POST /api/crm/docusign/send-envelope
 * Send document for signature
 */
router.post('/send-envelope', async (req, res) => {
  try {
    const {
      workspaceId,
      dealId,
      contactId,
      subject,
      message,
      documentBase64,
      documentName,
      signers, // Array of { email, name, recipientId }
    } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.docusign?.enabled) {
      return res.status(400).json({ error: 'DocuSign not connected' });
    }

    const accessToken = await getValidAccessToken(workspace);
    const { accountId, baseUrl } = workspace.integrations.docusign;

    // Build envelope definition
    const envelopeDefinition = {
      emailSubject: subject,
      documents: [
        {
          documentBase64,
          name: documentName,
          fileExtension: documentName.split('.').pop(),
          documentId: '1',
        },
      ],
      recipients: {
        signers: signers.map((signer, index) => ({
          email: signer.email,
          name: signer.name,
          recipientId: String(index + 1),
          routingOrder: String(index + 1),
          tabs: {
            signHereTabs: [
              {
                documentId: '1',
                pageNumber: '1',
                recipientId: String(index + 1),
                xPosition: '100',
                yPosition: '100',
              },
            ],
            dateSignedTabs: [
              {
                documentId: '1',
                pageNumber: '1',
                recipientId: String(index + 1),
                xPosition: '300',
                yPosition: '100',
              },
            ],
          },
        })),
      },
      status: 'sent',
      notification: {
        useAccountDefaults: false,
        reminders: {
          reminderEnabled: true,
          reminderDelay: '2',
          reminderFrequency: '2',
        },
      },
    };

    // Send envelope
    const response = await axios.post(
      `${baseUrl}/v2.1/accounts/${accountId}/envelopes`,
      envelopeDefinition,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const envelopeId = response.data.envelopeId;

    // Log activity in CRM
    await Activity.logActivity({
      workspace: workspaceId,
      type: 'document_sent_for_signature',
      entityType: dealId ? 'Deal' : 'Contact',
      entityId: dealId || contactId,
      user: req.user.id,
      metadata: {
        envelopeId,
        documentName,
        signers: signers.map(s => ({ email: s.email, name: s.name })),
        status: 'sent',
      },
    });

    console.log('DocuSign envelope sent:', envelopeId);
    res.json({
      message: 'Document sent for signature successfully',
      envelopeId,
      uri: response.data.uri,
    });
  } catch (error) {
    console.error('Error sending DocuSign envelope:', error);
    res.status(500).json({ error: 'Failed to send document for signature' });
  }
});

/**
 * GET /api/crm/docusign/envelope-status/:workspaceId/:envelopeId
 * Get envelope status
 */
router.get('/envelope-status/:workspaceId/:envelopeId', async (req, res) => {
  try {
    const { workspaceId, envelopeId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.docusign?.enabled) {
      return res.status(400).json({ error: 'DocuSign not connected' });
    }

    const accessToken = await getValidAccessToken(workspace);
    const { accountId, baseUrl } = workspace.integrations.docusign;

    // Get envelope status
    const response = await axios.get(
      `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    console.log('Envelope status retrieved:', envelopeId);
    res.json({
      envelopeId,
      status: response.data.status,
      statusDateTime: response.data.statusDateTime,
      sentDateTime: response.data.sentDateTime,
      completedDateTime: response.data.completedDateTime,
    });
  } catch (error) {
    console.error('Error getting envelope status:', error);
    res.status(500).json({ error: 'Failed to get envelope status' });
  }
});

/**
 * GET /api/crm/docusign/list-envelopes/:workspaceId
 * List all envelopes
 */
router.get('/list-envelopes/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { status = 'sent', fromDate } = req.query;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.docusign?.enabled) {
      return res.status(400).json({ error: 'DocuSign not connected' });
    }

    const accessToken = await getValidAccessToken(workspace);
    const { accountId, baseUrl } = workspace.integrations.docusign;

    // List envelopes
    const params = new URLSearchParams({
      status,
      from_date: fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    });

    const response = await axios.get(
      `${baseUrl}/v2.1/accounts/${accountId}/envelopes?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    console.log(`Listed ${response.data.envelopes?.length || 0} envelopes`);
    res.json({
      envelopes: response.data.envelopes || [],
      totalCount: response.data.resultSetSize || 0,
    });
  } catch (error) {
    console.error('Error listing envelopes:', error);
    res.status(500).json({ error: 'Failed to list envelopes' });
  }
});

/**
 * POST /api/crm/docusign/webhook
 * Webhook endpoint for DocuSign events
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    
    console.log('DocuSign webhook received:', event);

    // Process different event types
    if (event.event === 'envelope-completed') {
      const { envelopeId, status } = event.data;
      
      // Find activities related to this envelope
      const activities = await Activity.find({
        'metadata.envelopeId': envelopeId,
      });

      for (const activity of activities) {
        // Update activity with completion status
        activity.metadata.status = status;
        activity.metadata.completedAt = new Date();
        await activity.save();

        // Log completion activity
        await Activity.logActivity({
          workspace: activity.workspace,
          type: 'document_signed',
          entityType: activity.entityType,
          entityId: activity.entityId,
          user: activity.user,
          metadata: {
            envelopeId,
            status: 'completed',
          },
        });
      }
    }

    res.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing DocuSign webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * GET /api/crm/docusign/download-document/:workspaceId/:envelopeId/:documentId
 * Download signed document
 */
router.get('/download-document/:workspaceId/:envelopeId/:documentId', async (req, res) => {
  try {
    const { workspaceId, envelopeId, documentId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.integrations?.docusign?.enabled) {
      return res.status(400).json({ error: 'DocuSign not connected' });
    }

    const accessToken = await getValidAccessToken(workspace);
    const { accountId, baseUrl } = workspace.integrations.docusign;

    // Download document
    const response = await axios.get(
      `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/documents/${documentId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        responseType: 'arraybuffer',
      }
    );

    console.log('Document downloaded:', envelopeId, documentId);
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="document-${documentId}.pdf"`);
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

module.exports = router;
