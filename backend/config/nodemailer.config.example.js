/**
 * Spirit Tours - Nodemailer Configuration Example
 * 
 * Copy this file to nodemailer.config.js and update with your credentials
 * DO NOT commit nodemailer.config.js to version control
 */

module.exports = {
  // Multiple email servers for redundancy and load balancing
  servers: [
    // Primary Server - Your Own Mail Server (Recommended)
    {
      name: 'Primary Own Server',
      host: 'mail.yourdomain.com', // Your mail server
      port: 587,
      secure: false, // true for 465, false for other ports
      user: 'mailer@yourdomain.com',
      pass: 'your-secure-password',
      priority: 1, // Highest priority
      rateLimitPerHour: 1000,
      maxConnections: 10,
      enabled: true
    },

    // Secondary Server - Gmail (Backup)
    {
      name: 'Gmail Backup',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      user: 'your-email@gmail.com',
      pass: 'your-app-specific-password', // Use App Password, not regular password
      priority: 2, // Failover server
      rateLimitPerHour: 500,
      maxConnections: 5,
      enabled: true
    },

    // Tertiary Server - Office365 (Second Backup)
    {
      name: 'Office365 Backup',
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      user: 'your-email@outlook.com',
      pass: 'your-password',
      priority: 3, // Second failover
      rateLimitPerHour: 300,
      maxConnections: 3,
      enabled: true
    },

    // Additional Server - SendGrid (Third Backup via SMTP)
    {
      name: 'SendGrid SMTP',
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      user: 'apikey', // SendGrid uses 'apikey' as username
      pass: 'your-sendgrid-api-key',
      priority: 4,
      rateLimitPerHour: 100, // Free tier limit
      maxConnections: 2,
      enabled: false // Enable if needed
    },

    // Additional Server - AWS SES
    {
      name: 'AWS SES',
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      secure: false,
      user: 'your-aws-ses-smtp-username',
      pass: 'your-aws-ses-smtp-password',
      priority: 5,
      rateLimitPerHour: 200,
      maxConnections: 3,
      enabled: false // Enable if needed
    },

    // Additional Server - Mailgun SMTP
    {
      name: 'Mailgun SMTP',
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      user: 'postmaster@your-mailgun-domain.com',
      pass: 'your-mailgun-smtp-password',
      priority: 6,
      rateLimitPerHour: 100,
      maxConnections: 2,
      enabled: false // Enable if needed
    }
  ],

  // Default email settings
  defaults: {
    from: process.env.DEFAULT_FROM_EMAIL || 'noreply@spirittours.com',
    fromName: 'Spirit Tours',
    replyTo: 'support@spirittours.com'
  },

  // Queue settings
  queue: {
    maxRetries: 3,
    retryDelay: 60000, // 1 minute in milliseconds
    processInterval: 1000, // Process queue every 1 second
    batchSize: 10 // Process 10 emails at a time
  },

  // Rate limiting
  rateLimiting: {
    enabled: true,
    globalLimitPerHour: 5000, // Total emails per hour across all servers
    warningThreshold: 4500 // Warn when approaching limit
  },

  // Monitoring
  monitoring: {
    enabled: true,
    alertOnFailureCount: 10, // Alert after 10 failures
    alertEmail: 'admin@spirittours.com',
    statsInterval: 300000 // Log stats every 5 minutes
  },

  // Newsletter settings
  newsletter: {
    unsubscribeUrl: process.env.BASE_URL + '/unsubscribe',
    defaultCategory: 'general',
    trackOpens: false, // Enable email open tracking
    trackClicks: false // Enable link click tracking
  },

  // Security
  security: {
    validateEmailAddresses: true,
    allowedDomains: [], // Empty = allow all domains
    blockedDomains: ['tempmail.com', 'throwaway.email'], // Block disposable email services
    maxAttachmentSize: 10485760, // 10MB in bytes
    allowedAttachmentTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logEmails: false, // Log full email content (disable in production)
    logSuccessful: true,
    logFailures: true
  }
};

/**
 * How to get SMTP credentials for different providers:
 * 
 * GMAIL:
 * 1. Enable 2-Factor Authentication
 * 2. Go to: https://myaccount.google.com/apppasswords
 * 3. Generate an App Password for "Mail"
 * 4. Use the 16-character password
 * 
 * OFFICE365:
 * 1. Use your regular email and password
 * 2. Or create an App Password if 2FA is enabled
 * 
 * OWN MAIL SERVER (cPanel/Plesk):
 * 1. Login to your hosting control panel
 * 2. Create an email account
 * 3. Note the SMTP server address (usually mail.yourdomain.com)
 * 4. Use port 587 for TLS or 465 for SSL
 * 
 * SENDGRID:
 * 1. Create account at https://sendgrid.com
 * 2. Go to Settings > API Keys
 * 3. Create an API Key with "Mail Send" permissions
 * 4. Username is always "apikey"
 * 
 * AWS SES:
 * 1. Login to AWS Console
 * 2. Go to SES > SMTP Settings
 * 3. Create SMTP Credentials
 * 4. Note the SMTP endpoint for your region
 * 
 * MAILGUN:
 * 1. Create account at https://mailgun.com
 * 2. Add and verify your domain
 * 3. Go to Sending > Domain Settings > SMTP Credentials
 * 4. Use the provided credentials
 */

/**
 * Environment Variables (.env file):
 * 
 * DEFAULT_FROM_EMAIL=noreply@spirittours.com
 * BASE_URL=https://spirittours.com
 * LOG_LEVEL=info
 * 
 * # Primary Server
 * SMTP_HOST_1=mail.yourdomain.com
 * SMTP_PORT_1=587
 * SMTP_USER_1=mailer@yourdomain.com
 * SMTP_PASS_1=your-password
 * 
 * # Backup Server
 * SMTP_HOST_2=smtp.gmail.com
 * SMTP_PORT_2=587
 * SMTP_USER_2=backup@gmail.com
 * SMTP_PASS_2=your-app-password
 */
