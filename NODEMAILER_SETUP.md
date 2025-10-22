# Spirit Tours - Nodemailer Service Documentation

## 📧 Overview

The Spirit Tours Nodemailer Service provides advanced email capabilities including:

- ✅ **Multiple SMTP Server Support** - Use multiple mail servers with automatic failover
- ✅ **Mass Email Sending** - Send bulk emails with queue management
- ✅ **Newsletter Functionality** - Template-based newsletter system
- ✅ **Own Mail Servers** - Use your own mail servers, not just third-party services
- ✅ **Rate Limiting** - Prevent server overload with configurable limits
- ✅ **Automatic Failover** - If one server fails, automatically use another
- ✅ **Email Queue** - Priority-based queue with retry logic
- ✅ **Unsubscribe Management** - Built-in unsubscribe functionality
- ✅ **Email Tracking** - Track sent, failed, and queued emails

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd /home/user/webapp
npm install nodemailer --save
```

### 2. Environment Variables

Add to your `.env` file:

```bash
# Default Email Configuration
DEFAULT_FROM_EMAIL=noreply@spirittours.com
DEFAULT_FROM_NAME=Spirit Tours
BASE_URL=https://spirittours.com

# Primary Mail Server
SMTP_HOST_1=smtp.gmail.com
SMTP_PORT_1=587
SMTP_USER_1=your-email@gmail.com
SMTP_PASS_1=your-app-password

# Secondary Mail Server (Failover)
SMTP_HOST_2=smtp.office365.com
SMTP_PORT_2=587
SMTP_USER_2=your-email@outlook.com
SMTP_PASS_2=your-password

# Own Mail Server Example
SMTP_HOST_3=mail.yourdomain.com
SMTP_PORT_3=587
SMTP_USER_3=mailer@yourdomain.com
SMTP_PASS_3=your-secure-password
```

### 3. Initialize the Service

In your main application file (e.g., `backend/main.js`):

```javascript
const { nodemailerService } = require('./services/nodemailer_service');

// Add your email servers
nodemailerService.addServer({
  name: 'Primary Gmail',
  host: process.env.SMTP_HOST_1,
  port: parseInt(process.env.SMTP_PORT_1),
  secure: false, // true for 465, false for other ports
  user: process.env.SMTP_USER_1,
  pass: process.env.SMTP_PASS_1,
  priority: 1, // Highest priority
  rateLimitPerHour: 500,
  maxConnections: 5
});

nodemailerService.addServer({
  name: 'Secondary Office365',
  host: process.env.SMTP_HOST_2,
  port: parseInt(process.env.SMTP_PORT_2),
  secure: false,
  user: process.env.SMTP_USER_2,
  pass: process.env.SMTP_PASS_2,
  priority: 2, // Fallback server
  rateLimitPerHour: 300,
  maxConnections: 3
});

// Add your own mail server
nodemailerService.addServer({
  name: 'Own Mail Server',
  host: process.env.SMTP_HOST_3,
  port: parseInt(process.env.SMTP_PORT_3),
  secure: false,
  user: process.env.SMTP_USER_3,
  pass: process.env.SMTP_PASS_3,
  priority: 3, // Third priority
  rateLimitPerHour: 1000,
  maxConnections: 10
});

console.log('✅ Nodemailer service initialized with', nodemailerService.servers.size, 'servers');
```

### 4. Mount Routes

In your Express app:

```javascript
const nodemailerRoutes = require('./routes/nodemailer.routes');

app.use('/api/nodemailer', nodemailerRoutes);
```

---

## 📚 API Endpoints

### Server Management

#### Add Email Server
```http
POST /api/nodemailer/servers
Authorization: Bearer <token>

{
  "name": "Custom Mail Server",
  "host": "smtp.yourdomain.com",
  "port": 587,
  "secure": false,
  "user": "mailer@yourdomain.com",
  "pass": "your-password",
  "priority": 1,
  "rateLimitPerHour": 1000,
  "maxConnections": 10
}
```

#### List All Servers
```http
GET /api/nodemailer/servers
Authorization: Bearer <token>
```

#### Remove Server
```http
DELETE /api/nodemailer/servers/:serverId
Authorization: Bearer <token>
```

#### Verify All Connections
```http
POST /api/nodemailer/servers/verify
Authorization: Bearer <token>
```

### Email Sending

#### Send Single Email
```http
POST /api/nodemailer/send
Authorization: Bearer <token>

{
  "to": "customer@example.com",
  "from": "noreply@spirittours.com",
  "subject": "Welcome to Spirit Tours!",
  "html": "<h1>Welcome!</h1><p>Thank you for joining us.</p>",
  "text": "Welcome! Thank you for joining us.",
  "priority": 1,
  "immediate": false
}
```

#### Send Mass Emails
```http
POST /api/nodemailer/send-mass
Authorization: Bearer <token>

{
  "recipients": [
    "user1@example.com",
    "user2@example.com",
    "user3@example.com"
  ],
  "templateId": "template_123",
  "variables": {
    "company_name": "Spirit Tours",
    "offer_title": "Special Summer Discount"
  },
  "campaignId": "summer_2024",
  "priority": 3,
  "queueDelay": 10
}
```

### Newsletter Templates

#### Create Template
```http
POST /api/nodemailer/templates
Authorization: Bearer <token>

{
  "name": "Welcome Email",
  "subject": "Welcome to {{company_name}}!",
  "html": "<h1>Welcome {{name}}!</h1><p>Thanks for joining {{company_name}}.</p><a href='{{unsubscribe_url}}'>Unsubscribe</a>",
  "text": "Welcome {{name}}! Thanks for joining {{company_name}}.",
  "category": "transactional"
}
```

#### List Templates
```http
GET /api/nodemailer/templates
Authorization: Bearer <token>
```

#### Get Template by ID
```http
GET /api/nodemailer/templates/:templateId
Authorization: Bearer <token>
```

#### Update Template
```http
PUT /api/nodemailer/templates/:templateId
Authorization: Bearer <token>

{
  "subject": "Updated Subject Line",
  "html": "<h1>Updated content</h1>"
}
```

#### Delete Template
```http
DELETE /api/nodemailer/templates/:templateId
Authorization: Bearer <token>
```

### Newsletter Sending

#### Send Newsletter
```http
POST /api/nodemailer/newsletter
Authorization: Bearer <token>

{
  "templateId": "template_123",
  "subscribers": [
    "subscriber1@example.com",
    "subscriber2@example.com"
  ],
  "variables": {
    "month": "October",
    "special_offer": "30% off all tours"
  },
  "campaignId": "october_newsletter"
}
```

### Unsubscribe Management

#### Unsubscribe Email
```http
POST /api/nodemailer/unsubscribe

{
  "email": "user@example.com"
}
```

#### Check Unsubscribe Status
```http
GET /api/nodemailer/unsubscribe/check/:email
Authorization: Bearer <token>
```

### Statistics

#### Get Service Stats
```http
GET /api/nodemailer/stats
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "servers": [
      {
        "id": "server_123",
        "name": "Primary Gmail",
        "host": "smtp.gmail.com",
        "port": 587,
        "enabled": true,
        "priority": 1,
        "currentHourSent": 45,
        "rateLimitPerHour": 500,
        "failureCount": 0,
        "isAvailable": true,
        "cooldownUntil": null
      }
    ],
    "queue": {
      "size": 12,
      "byPriority": {
        "1": 3,
        "5": 9
      },
      "byStatus": {
        "queued": 12
      }
    },
    "stats": {
      "sent": 1523,
      "failed": 15,
      "queued": 12,
      "byServer": {
        "server_123": {
          "sent": 1200,
          "failed": 10
        }
      }
    },
    "templates": 8,
    "unsubscribed": 42,
    "processing": false
  }
}
```

---

## 🔧 Configuration Options

### Email Server Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | string | - | Friendly name for the server |
| `host` | string | - | SMTP server hostname |
| `port` | number | 587 | SMTP port (587, 465, 25) |
| `secure` | boolean | false | Use SSL (true for port 465) |
| `user` | string | - | SMTP username |
| `pass` | string | - | SMTP password |
| `priority` | number | 1 | Server priority (1 = highest) |
| `rateLimitPerHour` | number | 1000 | Max emails per hour |
| `maxConnections` | number | 5 | Max concurrent connections |
| `maxFailures` | number | 5 | Failures before cooldown |
| `cooldownMinutes` | number | 10 | Cooldown duration after failures |

### Email Options

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `to` | string/array | Yes | Recipient email(s) |
| `from` | string | No | Sender email |
| `subject` | string | Yes | Email subject |
| `html` | string | No* | HTML content |
| `text` | string | No* | Plain text content |
| `attachments` | array | No | File attachments |
| `priority` | number | No | Queue priority (1-10) |
| `immediate` | boolean | No | Send immediately (bypass queue) |
| `scheduledFor` | number | No | Timestamp to send at |
| `serverId` | string | No | Specific server to use |

*Either `html` or `text` is required

---

## 💡 Usage Examples

### Example 1: Send Booking Confirmation

```javascript
const { nodemailerService } = require('./services/nodemailer_service');

async function sendBookingConfirmation(booking) {
  await nodemailerService.queueEmail({
    to: booking.customerEmail,
    from: 'bookings@spirittours.com',
    subject: `Booking Confirmed - ${booking.tourName}`,
    html: `
      <h1>Booking Confirmed!</h1>
      <p>Dear ${booking.customerName},</p>
      <p>Your booking for <strong>${booking.tourName}</strong> has been confirmed.</p>
      <ul>
        <li>Booking ID: ${booking.id}</li>
        <li>Date: ${booking.date}</li>
        <li>Participants: ${booking.participants}</li>
        <li>Total: $${booking.totalAmount}</li>
      </ul>
      <p>We look forward to seeing you!</p>
    `,
    priority: 1 // High priority
  });
}
```

### Example 2: Send Newsletter Campaign

```javascript
// First, create a template
const templateId = nodemailerService.addTemplate({
  name: 'Monthly Newsletter',
  subject: '{{month}} Newsletter - Special Offers Inside!',
  category: 'promotional',
  html: `
    <html>
      <body>
        <h1>{{company_name}} - {{month}} Newsletter</h1>
        <p>Dear {{name}},</p>
        
        <h2>This Month's Special Offers</h2>
        <p>{{special_offers}}</p>
        
        <h2>New Destinations</h2>
        <p>{{new_destinations}}</p>
        
        <hr>
        <p><small><a href="{{unsubscribe_url}}">Unsubscribe</a></small></p>
      </body>
    </html>
  `
});

// Then send to subscribers
const subscribers = await getNewsletterSubscribers(); // Your function

await nodemailerService.sendNewsletter(
  templateId,
  subscribers,
  {
    company_name: 'Spirit Tours',
    month: 'October',
    special_offers: '30% off all European tours!',
    new_destinations: 'Now offering tours to Iceland and Norway!'
  },
  {
    campaignId: 'october_2024_newsletter',
    priority: 5
  }
);
```

### Example 3: Mass Email with Multiple Servers

```javascript
// Configure multiple servers for load distribution
nodemailerService.addServer({
  name: 'Server 1 - Gmail',
  host: 'smtp.gmail.com',
  port: 587,
  user: 'server1@spirittours.com',
  pass: 'password1',
  priority: 1,
  rateLimitPerHour: 500
});

nodemailerService.addServer({
  name: 'Server 2 - Own Server',
  host: 'mail.spirittours.com',
  port: 587,
  user: 'mailer@spirittours.com',
  pass: 'password2',
  priority: 1, // Same priority for load balancing
  rateLimitPerHour: 1000
});

nodemailerService.addServer({
  name: 'Server 3 - Office365',
  host: 'smtp.office365.com',
  port: 587,
  user: 'server3@spirittours.com',
  pass: 'password3',
  priority: 2, // Backup server
  rateLimitPerHour: 300
});

// Send mass emails - will automatically distribute across servers
const recipients = await getMarketingList(); // 5000 emails

await nodemailerService.queueMassEmails(
  recipients,
  template,
  { offer: 'Limited Time Discount' },
  {
    campaignId: 'summer_promo_2024',
    queueDelay: 20 // 20ms between queueing each email
  }
);
```

### Example 4: Scheduled Emails

```javascript
// Schedule email to be sent tomorrow at 9 AM
const tomorrow9AM = new Date();
tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
tomorrow9AM.setHours(9, 0, 0, 0);

await nodemailerService.queueEmail({
  to: 'customer@example.com',
  subject: 'Your tour starts tomorrow!',
  html: '<h1>Don\'t forget! Your tour starts tomorrow at 10 AM.</h1>',
  scheduledFor: tomorrow9AM.getTime(),
  priority: 1
});
```

---

## 🎯 Best Practices

### 1. Multiple Server Strategy

**Recommended Setup:**
- **Primary Server**: Your own mail server (highest priority)
- **Secondary Server**: Gmail or Office365 (failover)
- **Tertiary Server**: SendGrid or similar service (backup)

### 2. Rate Limiting

- Gmail: 500 emails/day (free), 2000/day (Google Workspace)
- Office365: 300 recipients/day (free), 10,000/day (business)
- Own server: Configure based on your infrastructure

### 3. Priority Levels

- **Priority 1**: Transactional (bookings, payments, confirmations)
- **Priority 3**: Important notifications (reminders, updates)
- **Priority 5**: Marketing (newsletters, promotions)
- **Priority 8**: Low priority (surveys, feedback requests)

### 4. Template Variables

Always include these in newsletter templates:
- `{{unsubscribe_url}}` - Legal requirement
- `{{company_name}}` - Branding
- `{{email}}` - Recipient tracking

### 5. Monitoring

Check stats regularly:
```javascript
const stats = nodemailerService.getStats();
console.log(`Sent: ${stats.stats.sent}, Failed: ${stats.stats.failed}, Queue: ${stats.queue.size}`);
```

---

## 🔒 Security Considerations

1. **Use App-Specific Passwords** for Gmail/Office365
2. **Enable 2FA** on all email accounts
3. **Store credentials** in environment variables, never in code
4. **Rotate passwords** regularly
5. **Monitor for suspicious activity**
6. **Implement rate limiting** to prevent abuse
7. **Validate email addresses** before sending

---

## 🐛 Troubleshooting

### Server Connection Issues

```javascript
// Verify all server connections
const results = await nodemailerService.verifyAllConnections();
console.log(results);
```

### Queue Not Processing

```javascript
// Check if processing is stuck
const stats = nodemailerService.getStats();
if (stats.processing) {
  console.log('Queue is processing...');
} else if (stats.queue.size > 0) {
  console.log('Queue has items but not processing - manually trigger');
  nodemailerService.processQueue();
}
```

### High Failure Rate

```javascript
// Check server stats
const stats = nodemailerService.getStats();
stats.servers.forEach(server => {
  if (server.failureCount > 3) {
    console.warn(`Server ${server.name} has ${server.failureCount} failures`);
  }
});
```

---

## 📊 Event Handling

The service emits events for monitoring:

```javascript
const { nodemailerService } = require('./services/nodemailer_service');

// Email queued
nodemailerService.on('emailQueued', (item) => {
  console.log(`Email queued: ${item.id}`);
});

// Email sent successfully
nodemailerService.on('emailSent', ({ item, server, info }) => {
  console.log(`Email ${item.id} sent via ${server.name}`);
});

// Email failed
nodemailerService.on('emailFailed', ({ item, error }) => {
  console.error(`Email ${item.id} failed: ${error.message}`);
});

// Queue processing completed
nodemailerService.on('queueProcessed', () => {
  console.log('Queue processing completed');
});

// User unsubscribed
nodemailerService.on('unsubscribed', (email) => {
  console.log(`User unsubscribed: ${email}`);
});
```

---

## 🚀 Production Deployment

### 1. Environment Configuration

```bash
# .env.production
NODE_ENV=production
DEFAULT_FROM_EMAIL=noreply@spirittours.com
BASE_URL=https://spirittours.com

# Multiple servers for redundancy
SMTP_HOST_1=mail.spirittours.com
SMTP_PORT_1=587
SMTP_USER_1=mailer@spirittours.com
SMTP_PASS_1=<secure-password>

SMTP_HOST_2=smtp.gmail.com
SMTP_PORT_2=587
SMTP_USER_2=backup@spirittours.com
SMTP_PASS_2=<app-specific-password>
```

### 2. Monitoring Setup

```javascript
// Monitor every 5 minutes
setInterval(() => {
  const stats = nodemailerService.getStats();
  
  // Log to monitoring service (e.g., DataDog, New Relic)
  logger.info('Email Service Stats', stats);
  
  // Alert if queue is too large
  if (stats.queue.size > 100) {
    logger.warn(`Email queue is large: ${stats.queue.size} items`);
  }
  
  // Alert if many failures
  if (stats.stats.failed > 50) {
    logger.error(`High failure rate: ${stats.stats.failed} failed emails`);
  }
}, 5 * 60 * 1000);
```

### 3. Graceful Shutdown

```javascript
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing email connections...');
  await nodemailerService.close();
  process.exit(0);
});
```

---

## 📝 Integration with Existing Email Service

To integrate with the existing Python email service:

```python
# In backend/integrations/email_service.py

import requests
import os

class NodemailerIntegration:
    """Integration with Node.js Nodemailer Service"""
    
    def __init__(self):
        self.base_url = os.getenv("NODEMAILER_API_URL", "http://localhost:3000/api/nodemailer")
        self.api_key = os.getenv("API_KEY")
    
    async def send_via_nodemailer(
        self, 
        to_email: str,
        subject: str,
        html_content: str,
        priority: int = 5
    ):
        """Send email via Nodemailer service"""
        headers = {"Authorization": f"Bearer {self.api_key}"}
        
        payload = {
            "to": to_email,
            "subject": subject,
            "html": html_content,
            "priority": priority
        }
        
        response = requests.post(
            f"{self.base_url}/send",
            json=payload,
            headers=headers
        )
        
        return response.status_code == 202

# Add to EmailService class
async def _send_via_nodemailer(self, email_data):
    """Send email via Nodemailer (Node.js service)"""
    nodemailer = NodemailerIntegration()
    return await nodemailer.send_via_nodemailer(
        email_data["to_email"],
        email_data["subject"],
        email_data["html_content"],
        email_data.get("priority", 5)
    )
```

---

## 🎓 Support

For issues or questions:
- Check the logs: `logs/nodemailer-combined.log`
- Review server stats: `GET /api/nodemailer/stats`
- Contact: tech@spirittours.com

---

**Last Updated**: October 22, 2024
**Version**: 1.0.0
