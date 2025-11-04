/**
 * Outlook/Exchange Integration Service
 * Microsoft Graph API for Outlook integration
 * 
 * Features:
 * - OAuth 2.0 authentication (Microsoft Identity Platform)
 * - Send emails via Microsoft Graph API
 * - Retrieve emails and conversations
 * - Two-way sync with Outlook
 * - Calendar integration
 * - Contact sync
 * - Attachment handling
 */

const axios = require('axios');
const crypto = require('crypto');

class OutlookService {
  constructor() {
    this.clientId = process.env.OUTLOOK_CLIENT_ID;
    this.clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
    this.redirectUri = process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3000/api/crm/integrations/outlook/callback';
    this.authority = 'https://login.microsoftonline.com/common';
    this.graphApiEndpoint = 'https://graph.microsoft.com/v1.0';
  }

  /**
   * Generate OAuth2 authentication URL
   * @param {string} workspaceId - Workspace ID for state parameter
   * @returns {string} Authentication URL
   */
  getAuthUrl(workspaceId) {
    const state = `${workspaceId}:${crypto.randomBytes(32).toString('hex')}`;
    
    const scopes = [
      'User.Read',
      'Mail.Read',
      'Mail.ReadWrite',
      'Mail.Send',
      'Contacts.Read',
      'Contacts.ReadWrite',
      'Calendars.Read',
      'Calendars.ReadWrite',
      'offline_access',
    ];

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state: state,
      prompt: 'consent',
    });

    return `${this.authority}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code - Authorization code from OAuth callback
   * @returns {Promise<Object>} Token data
   */
  async getTokensFromCode(code) {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      });

      const response = await axios.post(
        `${this.authority}/oauth2/v2.0/token`,
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshAccessToken(refreshToken) {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await axios.post(
        `${this.authority}/oauth2/v2.0/token`,
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error refreshing access token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get user profile information
   * @param {string} accessToken - Access token
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(accessToken) {
    try {
      const response = await axios.get(`${this.graphApiEndpoint}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return {
        email: response.data.mail || response.data.userPrincipalName,
        displayName: response.data.displayName,
        id: response.data.id,
      };
    } catch (error) {
      console.error('Error getting user profile:', error.response?.data || error.message);
      throw new Error('Failed to get user profile');
    }
  }

  /**
   * Send email via Microsoft Graph API
   * @param {string} accessToken - Access token
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} Sent email data
   */
  async sendEmail(accessToken, emailData) {
    const { to, cc, bcc, subject, body, attachments } = emailData;

    const message = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: body,
        },
        toRecipients: to.map(email => ({
          emailAddress: { address: email },
        })),
        ccRecipients: cc ? cc.map(email => ({
          emailAddress: { address: email },
        })) : [],
        bccRecipients: bcc ? bcc.map(email => ({
          emailAddress: { address: email },
        })) : [],
      },
      saveToSentItems: 'true',
    };

    if (attachments && attachments.length > 0) {
      message.message.attachments = attachments.map(att => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.filename,
        contentType: att.contentType,
        contentBytes: att.content, // Base64 encoded
      }));
    }

    try {
      const response = await axios.post(
        `${this.graphApiEndpoint}/me/sendMail`,
        message,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return { success: true, messageId: response.headers['x-ms-client-request-id'] };
    } catch (error) {
      console.error('Error sending email:', error.response?.data || error.message);
      throw new Error('Failed to send email');
    }
  }

  /**
   * List emails from inbox
   * @param {string} accessToken - Access token
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Email list
   */
  async listEmails(accessToken, options = {}) {
    const { maxResults = 10, pageToken, q } = options;

    let url = `${this.graphApiEndpoint}/me/messages?$top=${maxResults}&$orderby=receivedDateTime DESC`;
    
    if (q) {
      url += `&$filter=contains(subject,'${q}') or contains(from/emailAddress/name,'${q}')`;
    }

    if (pageToken) {
      url = pageToken; // Use skip token for pagination
    }

    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return {
        messages: response.data.value.map(msg => ({
          id: msg.id,
          threadId: msg.conversationId,
          subject: msg.subject,
          from: msg.from?.emailAddress,
          to: msg.toRecipients?.map(r => r.emailAddress),
          date: msg.receivedDateTime,
          snippet: msg.bodyPreview,
          hasAttachments: msg.hasAttachments,
          isRead: msg.isRead,
        })),
        nextPageToken: response.data['@odata.nextLink'],
      };
    } catch (error) {
      console.error('Error listing emails:', error.response?.data || error.message);
      throw new Error('Failed to list emails');
    }
  }

  /**
   * Get email by ID
   * @param {string} accessToken - Access token
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Email details
   */
  async getEmail(accessToken, messageId) {
    try {
      const response = await axios.get(
        `${this.graphApiEndpoint}/me/messages/${messageId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const msg = response.data;

      return {
        id: msg.id,
        threadId: msg.conversationId,
        subject: msg.subject,
        from: msg.from?.emailAddress,
        to: msg.toRecipients?.map(r => r.emailAddress),
        cc: msg.ccRecipients?.map(r => r.emailAddress),
        bcc: msg.bccRecipients?.map(r => r.emailAddress),
        date: msg.receivedDateTime,
        body: msg.body?.content,
        bodyType: msg.body?.contentType,
        snippet: msg.bodyPreview,
        hasAttachments: msg.hasAttachments,
        isRead: msg.isRead,
        attachments: msg.hasAttachments ? await this.getAttachments(accessToken, messageId) : [],
      };
    } catch (error) {
      console.error('Error getting email:', error.response?.data || error.message);
      throw new Error('Failed to get email');
    }
  }

  /**
   * Get attachments for an email
   * @param {string} accessToken - Access token
   * @param {string} messageId - Message ID
   * @returns {Promise<Array>} Attachments list
   */
  async getAttachments(accessToken, messageId) {
    try {
      const response = await axios.get(
        `${this.graphApiEndpoint}/me/messages/${messageId}/attachments`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      return response.data.value.map(att => ({
        id: att.id,
        name: att.name,
        contentType: att.contentType,
        size: att.size,
      }));
    } catch (error) {
      console.error('Error getting attachments:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Sync contacts from Outlook
   * @param {string} accessToken - Access token
   * @returns {Promise<Array>} Contacts list
   */
  async syncContacts(accessToken) {
    try {
      const response = await axios.get(
        `${this.graphApiEndpoint}/me/contacts`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      return response.data.value.map(contact => ({
        firstName: contact.givenName,
        lastName: contact.surname,
        email: contact.emailAddresses?.[0]?.address,
        phone: contact.mobilePhone || contact.homePhones?.[0] || contact.businessPhones?.[0],
        company: contact.companyName,
        title: contact.jobTitle,
        source: 'outlook',
      }));
    } catch (error) {
      console.error('Error syncing contacts:', error.response?.data || error.message);
      throw new Error('Failed to sync contacts');
    }
  }

  /**
   * List calendar events
   * @param {string} accessToken - Access token
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Events list
   */
  async listCalendarEvents(accessToken, options = {}) {
    const { startDateTime, endDateTime, maxResults = 50 } = options;

    let url = `${this.graphApiEndpoint}/me/calendar/events?$top=${maxResults}&$orderby=start/dateTime`;

    if (startDateTime && endDateTime) {
      url += `&$filter=start/dateTime ge '${startDateTime}' and end/dateTime le '${endDateTime}'`;
    }

    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return response.data.value.map(event => ({
        id: event.id,
        subject: event.subject,
        body: event.bodyPreview,
        start: event.start.dateTime,
        end: event.end.dateTime,
        location: event.location?.displayName,
        attendees: event.attendees?.map(a => a.emailAddress),
        organizer: event.organizer?.emailAddress,
        isOnlineMeeting: event.isOnlineMeeting,
        onlineMeetingUrl: event.onlineMeeting?.joinUrl,
      }));
    } catch (error) {
      console.error('Error listing calendar events:', error.response?.data || error.message);
      throw new Error('Failed to list calendar events');
    }
  }
}

module.exports = new OutlookService();
