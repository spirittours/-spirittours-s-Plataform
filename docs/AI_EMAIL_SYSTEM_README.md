# AI-Powered Email Campaign System for Travel Agency Prospecting

## 🎯 Overview

This is a complete, production-ready email marketing system designed specifically for Spirit Tours' travel agency prospecting (Agent #26). The system combines **AI-powered content generation**, **hybrid email delivery**, **approval workflows**, and **intelligent learning** to automate B2B email campaigns while maintaining quality and compliance.

## ✨ Key Features

### 1. **AI Content Generation** 🤖
- **OpenAI GPT-4** integration for personalized email creation
- **Learns from successful emails** to improve over time
- **Multi-language support** (Spanish, English, Portuguese, French)
- **A/B testing variations** automatically generated
- **Product-aware content** based on Spirit Tours catalog
- **Campaign type adaptation** (prospect vs. client emails)

### 2. **Hybrid Email Delivery** 📧
- **Dual provider support**: Switch between own SMTP server and SendGrid API
- **Configurable from dashboard**: Change providers on-the-fly
- **Connection pooling**: Efficient SMTP connection reuse
- **Rate limiting**: Prevents blacklisting with smart throttling
- **Queue-based sending**: Bull + Redis for reliable delivery

### 3. **Approval Workflow** ✅
- **Human review**: Admins/employees approve emails before sending
- **Email library**: All emails saved for reference and compliance
- **Bulk approval**: Approve multiple emails at once
- **Feedback integration**: Improve AI content based on reviewer notes
- **Version tracking**: History of all email modifications

### 4. **Smart Rate Limiting** ⏱️
- **Configurable limits**: Per minute, hour, and day
- **Default settings**: 10/min, 50/hour, 500/day
- **Delay management**: 6-second minimum between emails
- **Burst prevention**: Max 5 simultaneous connections
- **Real-time statistics**: Track current sending rates

### 5. **24/7 Operation** 🔄
- **Background queue processing**: Runs continuously
- **Automatic retries**: 3 attempts with exponential backoff
- **Pause/resume**: Control campaigns from dashboard
- **Scheduled campaigns**: Set future send times
- **Time windows**: Only send during business hours

### 6. **Analytics & Learning** 📊
- **Open rate tracking**: Pixel-based open detection
- **Click tracking**: Monitor link engagement
- **Bounce handling**: Automatic list cleanup
- **Performance dashboard**: Real-time campaign metrics
- **AI learning**: Improves content based on results

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND DASHBOARD                     │
│  - Campaign Management                                   │
│  - Email Approval Queue                                  │
│  - Provider Configuration (SMTP/SendGrid Toggle)         │
│  - Rate Limit Settings (Sliders)                         │
│  - Analytics & Reports                                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   BACKEND API                            │
│  - Campaign Routes                                       │
│  - Email Approval Routes                                 │
│  - Configuration Routes                                  │
│  - Analytics Routes                                      │
└────────────────┬────────────────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    ▼                         ▼
┌─────────────────┐   ┌──────────────────┐
│ AI Email        │   │  Email Sender    │
│ Generator       │   │  Service         │
│ Service         │   │                  │
│ - GPT-4         │   │ - SMTP Transport │
│ - Learning      │   │ - SendGrid API   │
│ - Templates     │   │ - Queue Manager  │
│ - Personalize   │   │ - Rate Limiter   │
└────────┬────────┘   └────────┬─────────┘
         │                     │
         ▼                     ▼
┌─────────────────────────────────────────┐
│           REDIS QUEUE (Bull)             │
│  - Email Jobs                            │
│  - Retry Logic                           │
│  - Scheduled Sends                       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│           MONGODB DATABASE               │
│  - TravelAgency (contacts)               │
│  - Campaign (email campaigns)            │
│  - EmailLog (sent emails)                │
│  - EmailTemplate (reusable templates)    │
│  - Product (Spirit Tours packages)       │
└──────────────────────────────────────────┘
```

## 📁 File Structure

```
backend/
├── services/
│   └── travel-agency-prospecting/
│       ├── ai-email-generator.service.js    # AI content generation
│       ├── email-sender.service.js          # Hybrid email sending
│       └── integration-example.js           # Usage examples
│
├── models/
│   ├── TravelAgency.js                      # Agency contacts
│   ├── Campaign.js                          # Email campaigns
│   ├── EmailLog.js                          # Sent email tracking
│   ├── EmailTemplate.js                     # Reusable templates
│   └── Product.js                           # Spirit Tours products
│
└── routes/
    ├── campaigns.js                         # Campaign API
    ├── emails.js                            # Email approval API
    └── settings.js                          # Configuration API

docs/
├── TRAVEL_AGENCY_PROSPECTING_AGENT_DESIGN.md   # Agent #26 design
└── AI_EMAIL_SYSTEM_README.md                   # This file
```

## 🚀 Quick Start

### Prerequisites

```bash
# Required services
- Node.js 18+
- MongoDB 6+
- Redis 7+

# Environment variables
MONGODB_URI=mongodb://localhost:27017/spirit-tours
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
SMTP_HOST=smtp.yourserver.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-password
SENDGRID_API_KEY=SG...
```

### Installation

```bash
# Install dependencies
cd /home/user/webapp
npm install openai nodemailer @sendgrid/mail bull ioredis mongoose

# Start services
# Terminal 1: MongoDB
mongod --dbpath /data/db

# Terminal 2: Redis
redis-server

# Terminal 3: Backend
npm run dev
```

### Basic Usage

#### 1. Generate Single AI Email

```javascript
const { sendSingleAIEmail } = require('./services/travel-agency-prospecting/integration-example');

// Generate and queue for approval
const result = await sendSingleAIEmail('agency-id-123');
console.log(`Email queued: ${result.emailLogId}`);
```

#### 2. Approve and Send Email

```javascript
const { approveAndSendEmail } = require('./services/travel-agency-prospecting/integration-example');

// Approve email
await approveAndSendEmail('email-log-id-123', 'manager-user-id');
```

#### 3. Create Complete Campaign

```javascript
const { createAICampaign, processCampaign, sendCampaign } = require('./services/travel-agency-prospecting/integration-example');

// Create campaign
const campaign = await createAICampaign({
  name: 'Summer 2024 Promotions',
  type: 'prospect_intro',
  targetAudience: 'prospects',
  filters: {
    countries: ['Spain', 'Italy', 'France'],
    leadScore: { min: 60, max: 100 },
  },
  createdBy: 'user-id',
  language: 'es',
});

// Generate emails
await processCampaign(campaign._id);

// Send (after approval)
await sendCampaign(campaign._id);
```

## ⚙️ Configuration

### Email Provider Configuration

```javascript
const emailSender = require('./services/travel-agency-prospecting/email-sender.service');

// Switch to SendGrid
emailSender.updateConfig({
  provider: 'sendgrid',
});

// Switch to own SMTP
emailSender.updateConfig({
  provider: 'smtp',
  smtp: {
    host: 'smtp.yourserver.com',
    port: 587,
    auth: {
      user: 'your-email@domain.com',
      pass: 'your-password',
    },
  },
});
```

### Rate Limit Configuration

```javascript
// Update from dashboard
emailSender.updateConfig({
  limits: {
    perMinute: 10,      // Max 10 emails per minute
    perHour: 50,        // Max 50 emails per hour
    perDay: 500,        // Max 500 emails per day
    delayBetweenEmails: 6000,  // 6 seconds between emails
  },
});
```

### AI Model Configuration

```javascript
const aiEmailGenerator = require('./services/travel-agency-prospecting/ai-email-generator.service');

// Adjust creativity
aiEmailGenerator.updateConfig({
  temperature: 0.8,    // Higher = more creative (0.0-1.0)
  maxTokens: 2000,     // Longer emails
});
```

## 📧 Best Practices

### Own SMTP Server

#### ✅ DO:
- **Warm up gradually**: Start with 50/day, increase weekly
- **Use dedicated IP**: Separate from other email traffic
- **Configure SPF/DKIM/DMARC**: Essential for deliverability
- **Monitor bounce rate**: Keep below 5%
- **Respect unsubscribes**: Remove immediately
- **Send from authenticated domain**: No generic Gmail/Yahoo

#### ❌ DON'T:
- **Don't exceed 500/day** from single IP initially
- **Don't send without warm-up** period
- **Don't use shared hosting** for email sending
- **Don't ignore bounces** or complaints
- **Don't send to purchased lists**

### Email Content

#### ✅ DO:
- **Personalize with agency data**: Name, location, specialties
- **Include unsubscribe link**: Legal requirement
- **Use plain text + HTML**: Better deliverability
- **Test before sending**: Preview and test emails
- **Keep subject lines short**: 50-70 characters
- **Clear call-to-action**: Single, obvious CTA

#### ❌ DON'T:
- **Don't use spam trigger words**: "Free", "Act now", "Limited time"
- **Don't use all caps** or excessive exclamation marks!!!
- **Don't send HTML-only** emails
- **Don't use URL shorteners**: Looks suspicious
- **Don't send without approval**: When workflow is enabled

### Rate Limiting Recommendations

| Scenario | Per Minute | Per Hour | Per Day | Delay Between |
|----------|-----------|----------|---------|---------------|
| **New SMTP (Warm-up)** | 5 | 20 | 50 | 12 sec |
| **Established SMTP** | 10 | 50 | 500 | 6 sec |
| **SendGrid (Paid)** | 30 | 1000 | 10000 | 2 sec |
| **High-Risk Campaign** | 5 | 30 | 300 | 12 sec |

## 🎨 Campaign Types

### 1. **Prospect Intro** (`prospect_intro`)
- **Goal**: Introduce Spirit Tours to new agencies
- **Tone**: Professional, value-focused
- **Content**: Company overview, benefits, partnership offer
- **CTA**: Schedule call, request info

### 2. **Prospect Follow-up** (`prospect_followup`)
- **Goal**: Re-engage non-responsive prospects
- **Tone**: Persistent but respectful
- **Content**: Address concerns, additional value
- **CTA**: Respond with questions, schedule demo

### 3. **Client Update** (`client_update`)
- **Goal**: Keep clients informed
- **Tone**: Familiar, appreciative
- **Content**: New products, company news
- **CTA**: View new packages, update preferences

### 4. **Client Promotion** (`client_promotion`)
- **Goal**: Announce special offers
- **Tone**: Exciting, exclusive
- **Content**: Limited-time deals, commission boosts
- **CTA**: Book now, reserve allocation

### 5. **Client Newsletter** (`client_newsletter`)
- **Goal**: Regular relationship building
- **Tone**: Informative, thought leadership
- **Content**: Industry insights, tips, Spirit Tours news
- **CTA**: Read more, share feedback

### 6. **Seasonal Campaign** (`seasonal_campaign`)
- **Goal**: Promote seasonal destinations
- **Tone**: Inspiring, descriptive
- **Content**: Destination highlights, seasonal packages
- **CTA**: Explore destinations, request availability

## 📊 Analytics & Metrics

### Email Performance Metrics

```javascript
const { monitorCampaign } = require('./services/travel-agency-prospecting/integration-example');

const stats = await monitorCampaign('campaign-id-123');

console.log(`
  Delivery Rate: ${stats.deliveryRate}%
  Open Rate: ${stats.openRate}%
  Click Rate: ${stats.clickRate}%
  Bounce Rate: ${stats.bounceRate}%
  Conversion Rate: ${stats.conversionRate}%
`);
```

### Industry Benchmarks

| Metric | Good | Average | Poor |
|--------|------|---------|------|
| **Delivery Rate** | >95% | 90-95% | <90% |
| **Open Rate** | >25% | 15-25% | <15% |
| **Click Rate** | >5% | 2-5% | <2% |
| **Bounce Rate** | <3% | 3-5% | >5% |
| **Unsubscribe** | <0.5% | 0.5-1% | >1% |

### A/B Testing

```javascript
// Campaign automatically splits traffic between variants
const campaign = await createAICampaign({
  // ... config
  variations: 3, // Generate 3 variants (A, B, C)
});

// After 24 hours or 100 opens, select winner
const winner = await campaign.selectWinningVariant();
console.log(`Winner: Variant ${winner.winnerName} (${winner.score}%)`);
```

## 🔒 Security & Compliance

### Data Protection
- **GDPR compliant**: Unsubscribe, data deletion, consent tracking
- **CAN-SPAM compliant**: Physical address, unsubscribe link
- **Email encryption**: TLS for all SMTP connections
- **API key security**: Environment variables, never committed

### Unsubscribe Management

```javascript
// Automatic unsubscribe handling
app.get('/unsubscribe/:emailLogId', async (req, res) => {
  const emailLog = await EmailLog.findById(req.params.emailLogId);
  
  // Mark email as unsubscribed
  emailLog.unsubscribed = true;
  emailLog.unsubscribedAt = new Date();
  await emailLog.save();
  
  // Update agency preferences
  const agency = await TravelAgency.findById(emailLog.agency);
  agency.emailPreferences.subscribed = false;
  agency.emailPreferences.unsubscribedAt = new Date();
  await agency.save();
  
  res.send('You have been unsubscribed.');
});
```

## 🐛 Troubleshooting

### Common Issues

#### Issue: Emails going to spam

**Solutions:**
1. Check SPF/DKIM/DMARC records
2. Reduce sending rate
3. Warm up IP address
4. Improve email content (less salesy)
5. Request whitelist from recipients

#### Issue: High bounce rate

**Solutions:**
1. Validate emails before sending
2. Use email verification service (ZeroBounce, NeverBounce)
3. Remove bounced emails immediately
4. Check for typos in email addresses

#### Issue: Low open rate

**Solutions:**
1. Improve subject lines (A/B test)
2. Send at optimal times (Tue-Thu, 10am-2pm)
3. Segment audience better
4. Personalize subject with agency name
5. Avoid spam trigger words

#### Issue: OpenAI API errors

**Solutions:**
1. Check API key validity
2. Monitor rate limits (3 RPM for free tier)
3. Add retry logic with exponential backoff
4. Reduce maxTokens if hitting limits

#### Issue: Queue stuck

**Solutions:**
1. Check Redis connection
2. Restart queue workers
3. Check for failed jobs: `emailQueue.getFailed()`
4. Clear failed jobs if needed

## 💰 Cost Estimation

### OpenAI API Costs (GPT-4 Turbo)

| Operation | Tokens | Cost |
|-----------|--------|------|
| Single Email | ~1,500 | $0.02 |
| 3 Variations | ~4,500 | $0.06 |
| 100 Emails Campaign | ~150,000 | $2.00 |
| 1,000 Emails Campaign | ~1,500,000 | $20.00 |

### SendGrid Costs

| Plan | Emails/Month | Cost |
|------|--------------|------|
| Free | 100/day | $0 |
| Essentials | 50,000 | $19.95/mo |
| Pro | 100,000 | $89.95/mo |

### Own SMTP Server Costs

| Component | Cost |
|-----------|------|
| VPS (DigitalOcean) | $12/mo |
| Dedicated IP | $3/mo |
| Email Validation API | $10-50/mo |
| **Total** | **$25-65/mo** |

**Recommendation**: Start with own SMTP (warm-up), add SendGrid for scaling.

## 🔄 Workflow Examples

### Daily Operations

```javascript
// Morning: Check pending approvals
const pending = await EmailLog.findPendingApproval();
console.log(`${pending.length} emails need approval`);

// Review and approve
for (const email of pending) {
  // Manual review in dashboard
  await approveAndSendEmail(email._id, 'manager-id');
}

// Afternoon: Check campaign progress
const campaigns = await Campaign.findRunning();
for (const campaign of campaigns) {
  await monitorCampaign(campaign._id);
}

// Evening: Update AI learning
await aiEmailGenerator.initializeLearning();
```

### Weekly Operations

```javascript
// Monday: Create weekly newsletter
const newsletter = await createAICampaign({
  name: `Weekly Newsletter - Week ${weekNumber}`,
  type: 'client_newsletter',
  targetAudience: 'clients',
  language: 'es',
});

await processCampaign(newsletter._id);

// Friday: Review week's performance
const weeklyStats = await EmailLog.getAnalytics({
  startDate: mondayDate,
  endDate: fridayDate,
});

console.log(`Week ${weekNumber} Performance:
  Emails Sent: ${weeklyStats.totalSent}
  Open Rate: ${weeklyStats.openRate}%
  Click Rate: ${weeklyStats.clickRate}%
`);
```

## 📚 Additional Resources

### Related Documentation
- [Travel Agency Prospecting Agent Design](./TRAVEL_AGENCY_PROSPECTING_AGENT_DESIGN.md)
- [Database Schema Reference](./DATABASE_SCHEMA.md)
- [API Endpoint Documentation](./API_DOCS.md)

### External Resources
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Nodemailer Documentation](https://nodemailer.com/)
- [SendGrid API Documentation](https://docs.sendgrid.com/)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [Email Marketing Best Practices](https://mailchimp.com/marketing-glossary/email-marketing-best-practices/)

## 🤝 Support

For questions or issues:
1. Check this documentation
2. Review integration examples
3. Check troubleshooting section
4. Contact development team

## 📝 License

Proprietary - Spirit Tours Internal Use Only

---

**Version**: 1.0.0  
**Last Updated**: 2024-11-04  
**Author**: Spirit Tours Development Team
