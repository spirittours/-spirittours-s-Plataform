/**
 * Gmail Integration Service
 * OAuth 2.0 authentication and two-way sync with Gmail
 * 
 * Features:
 * - OAuth 2.0 authentication flow
 * - Send emails via Gmail API
 * - Retrieve emails and threads
 * - Two-way sync (send from app, receive in Gmail)
 * - Webhook support for real-time updates
 * - Contact sync
 * - Email templates
 * - Attachment handling
 */

const { google } = require('googleapis');
const crypto = require('crypto');

class GmailService {
  constructor() {
    this.oauth2Client = null;
    this.gmail = null;
    this.initializeClient();
  }

  /**
   * Initialize OAuth2 client
   */
  initializeClient() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/crm/integrations/gmail/callback'
    );

    // Set up Gmail API
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Generate OAuth2 authentication URL
   * @param {string} workspaceId - Workspace ID for state parameter
   * @returns {string} Authentication URL
   */
  getAuthUrl(workspaceId) {
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state for verification (implement Redis/database storage in production)
    // global.gmailAuthStates = global.gmailAuthStates || {};
    // global.gmailAuthStates[state] = { workspaceId, timestamp: Date.now() };

    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: `${workspaceId}:${state}`,
      prompt: 'consent', // Force to show consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} code - Authorization code from OAuth callback
   * @returns {Promise<Object>} Token data
   */
  async getTokensFromCode(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  /**
   * Set credentials for authenticated requests
   * @param {Object} tokens - OAuth2 tokens
   */
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshAccessToken(refreshToken) {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials;
  }

  /**
   * Get user profile information
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile() {
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return data;
  }

  /**
   * Send email via Gmail API
   * @param {Object} emailData - Email data
   * @param {string} emailData.to - Recipient email
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.body - Email body (HTML or plain text)
   * @param {Array} emailData.cc - CC recipients
   * @param {Array} emailData.bcc - BCC recipients
   * @param {Array} emailData.attachments - File attachments
   * @returns {Promise<Object>} Sent message data
   */
  async sendEmail({ to, subject, body, cc = [], bcc = [], attachments = [] }) {
    const email = [
      `To: ${to}`,
      cc.length > 0 ? `Cc: ${cc.join(', ')}` : '',
      bcc.length > 0 ? `Bcc: ${bcc.join(', ')}` : '',
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body,
    ]
      .filter(Boolean)
      .join('\n');

    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const { data } = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    return data;
  }

  /**
   * Get list of emails
   * @param {Object} options - Query options
   * @param {string} options.query - Gmail search query
   * @param {number} options.maxResults - Maximum results to return
   * @param {string} options.pageToken - Page token for pagination
   * @returns {Promise<Object>} List of messages
   */
  async listEmails({ query = '', maxResults = 50, pageToken = null } = {}) {
    const { data } = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
      pageToken,
    });

    return data;
  }

  /**
   * Get email details by ID
   * @param {string} messageId - Gmail message ID
   * @returns {Promise<Object>} Message details
   */
  async getEmail(messageId) {
    const { data } = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    return data;
  }

  /**
   * Get email thread
   * @param {string} threadId - Gmail thread ID
   * @returns {Promise<Object>} Thread details
   */
  async getThread(threadId) {
    const { data } = await this.gmail.users.threads.get({
      userId: 'me',
      id: threadId,
    });

    return data;
  }

  /**
   * Search emails
   * @param {string} query - Search query (Gmail search syntax)
   * @returns {Promise<Array>} Matching messages
   */
  async searchEmails(query) {
    const { messages = [] } = await this.listEmails({ query, maxResults: 100 });
    
    // Fetch full details for each message
    const emailDetails = await Promise.all(
      messages.map(msg => this.getEmail(msg.id))
    );

    return emailDetails;
  }

  /**
   * Parse email headers
   * @param {Array} headers - Email headers array
   * @returns {Object} Parsed headers
   */
  parseHeaders(headers) {
    const parsed = {};
    headers.forEach(header => {
      parsed[header.name.toLowerCase()] = header.value;
    });
    return parsed;
  }

  /**
   * Get email body from payload
   * @param {Object} payload - Email payload
   * @returns {string} Email body
   */
  getEmailBody(payload) {
    let body = '';

    if (payload.parts) {
      // Multipart email
      const htmlPart = payload.parts.find(part => part.mimeType === 'text/html');
      const textPart = payload.parts.find(part => part.mimeType === 'text/plain');
      
      const part = htmlPart || textPart;
      if (part && part.body && part.body.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    } else if (payload.body && payload.body.data) {
      // Single part email
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    return body;
  }

  /**
   * Sync contacts from Gmail
   * @returns {Promise<Array>} List of contacts
   */
  async syncContacts() {
    const people = google.people({ version: 'v1', auth: this.oauth2Client });
    
    const { data } = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,emailAddresses,phoneNumbers,organizations',
    });

    return data.connections || [];
  }

  /**
   * Set up Gmail webhook (push notifications)
   * @param {string} topic - Google Cloud Pub/Sub topic
   * @returns {Promise<Object>} Watch response
   */
  async setupWebhook(topic) {
    const { data } = await this.gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: topic,
        labelIds: ['INBOX'],
      },
    });

    return data;
  }

  /**
   * Stop watching for push notifications
   * @returns {Promise<void>}
   */
  async stopWebhook() {
    await this.gmail.users.stop({
      userId: 'me',
    });
  }

  /**
   * Create email draft
   * @param {Object} emailData - Draft email data
   * @returns {Promise<Object>} Draft details
   */
  async createDraft({ to, subject, body }) {
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ].join('\n');

    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const { data } = await this.gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedEmail,
        },
      },
    });

    return data;
  }

  /**
   * Get email labels
   * @returns {Promise<Array>} List of labels
   */
  async getLabels() {
    const { data } = await this.gmail.users.labels.list({
      userId: 'me',
    });

    return data.labels || [];
  }

  /**
   * Modify email labels
   * @param {string} messageId - Message ID
   * @param {Array} addLabels - Labels to add
   * @param {Array} removeLabels - Labels to remove
   * @returns {Promise<Object>} Updated message
   */
  async modifyLabels(messageId, addLabels = [], removeLabels = []) {
    const { data } = await this.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: addLabels,
        removeLabelIds: removeLabels,
      },
    });

    return data;
  }

  /**
   * Mark email as read
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Updated message
   */
  async markAsRead(messageId) {
    return this.modifyLabels(messageId, [], ['UNREAD']);
  }

  /**
   * Mark email as unread
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Updated message
   */
  async markAsUnread(messageId) {
    return this.modifyLabels(messageId, ['UNREAD'], []);
  }

  /**
   * Delete email (move to trash)
   * @param {string} messageId - Message ID
   * @returns {Promise<void>}
   */
  async deleteEmail(messageId) {
    await this.gmail.users.messages.trash({
      userId: 'me',
      id: messageId,
    });
  }
}

module.exports = new GmailService();
