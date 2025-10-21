# WhatsApp Business API Integration Documentation

## Overview

The WhatsApp Business API Integration provides automated, two-way communication with passengers and guides through WhatsApp, the world's most popular messaging platform with 2+ billion users.

## Key Features

### 1. Message Types Supported

| Type | Description | Use Case | Limits |
|------|-------------|----------|--------|
| **Template Messages** | Pre-approved messages | Tour confirmations, reminders | Must be approved by Meta |
| **Text Messages** | Simple text | Responses, updates | 24-hour window after user message |
| **Image Messages** | Photos with captions | Driver profiles, QR codes | Max 5MB |
| **Location Messages** | GPS coordinates | Real-time vehicle tracking | - |
| **Button Messages** | Up to 3 quick reply buttons | Rating requests, confirmations | Max 3 buttons |
| **List Messages** | Interactive lists | Tour selection, preferences | Max 10 sections |

### 2. Pre-Approved Message Templates

#### Tour Confirmation
```
Hello {{passenger_name}}! 

Your {{tour_name}} tour is confirmed for {{date}} at {{time}}.

📍 Pickup location: {{pickup_location}}

We're excited to show you the best of our city!

- Spirit Tours Team
```

#### Tour Reminder
```
Hi {{passenger_name}}! 

Your {{tour_name}} tour starts in {{time_until}}.

📍 Pickup: {{pickup_location}}

See you soon! 🎉
```

#### Driver Assigned
```
Hello {{passenger_name}}!

Your driver has been assigned:
👤 {{driver_name}}
🚗 {{vehicle_model}} - {{license_plate}}
📞 {{driver_phone}}

They'll be at your pickup location on time!
```

#### Waypoint Arrival
```
📍 We're arriving at {{waypoint_name}} in approximately {{estimated_time}}.

Get ready for an amazing experience!
```

#### Rating Request
```
Hi {{passenger_name}}!

Thank you for choosing us for your {{tour_name}} tour!

We'd love to hear about your experience. Could you take a moment to rate your tour?

⭐⭐⭐⭐⭐
```

#### Emergency Alert
```
🚨 EMERGENCY ALERT

Type: {{alert_type}}
Location: {{location}}

{{instructions}}

Please follow the guide's instructions.
```

### 3. Two-Way Communication

**Inbound Messages:**
- Passenger questions during tours
- Booking inquiries
- Feedback and complaints
- Opt-in/opt-out requests

**Outbound Messages:**
- Automated tour notifications
- Real-time location updates
- Driver information
- Rating requests
- Emergency alerts

### 4. Message Status Tracking

| Status | Description | Triggered When |
|--------|-------------|----------------|
| `queued` | Message in send queue | Initially added |
| `sent` | Sent to WhatsApp API | API returns success |
| `delivered` | Delivered to recipient | WhatsApp delivers message |
| `read` | Read by recipient | User opens message |
| `failed` | Delivery failed | Error occurs |

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Spirit Tours Backend                      │
│                                                               │
│  ┌────────────────┐        ┌────────────────┐              │
│  │ Routes Manager │───────▶│ WhatsApp       │              │
│  │                │        │ Service        │              │
│  └────────────────┘        └───────┬────────┘              │
│                                    │                         │
│  ┌────────────────┐               │                         │
│  │ Rating System  │───────────────┤                         │
│  │                │               │                         │
│  └────────────────┘               │                         │
│                                    ▼                         │
│                         ┌──────────────────┐                │
│                         │ Message Queue    │                │
│                         │ (Redis)          │                │
│                         └────────┬─────────┘                │
│                                  │                           │
└──────────────────────────────────┼───────────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────┐
                    │  WhatsApp Business API  │
                    │  (Meta Graph API)       │
                    └─────────────────────────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │  Passengers &  │
                          │  Guides        │
                          └────────────────┘
```

### Database Schema

```sql
-- Messages table
CREATE TABLE whatsapp_messages (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE,
  conversation_id VARCHAR(255),
  
  from_number VARCHAR(50) NOT NULL,
  to_number VARCHAR(50) NOT NULL,
  direction VARCHAR(20) NOT NULL, -- inbound, outbound
  
  message_type VARCHAR(50) NOT NULL,
  content TEXT,
  template_name VARCHAR(100),
  template_params JSONB,
  media_url TEXT,
  
  status VARCHAR(50) DEFAULT 'queued',
  error_code VARCHAR(50),
  error_message TEXT,
  
  tour_id VARCHAR(100),
  user_id VARCHAR(100),
  
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  
  INDEX idx_message_id (message_id),
  INDEX idx_tour (tour_id),
  INDEX idx_status (status)
);

-- Contacts table
CREATE TABLE whatsapp_contacts (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  
  language VARCHAR(10) DEFAULT 'en',
  opted_in BOOLEAN DEFAULT TRUE,
  
  user_id VARCHAR(100),
  user_type VARCHAR(50),
  
  first_message_at TIMESTAMP,
  last_message_at TIMESTAMP,
  total_messages INTEGER DEFAULT 0,
  
  INDEX idx_phone (phone_number),
  INDEX idx_opted_in (opted_in)
);
```

## API Endpoints

### Send Template Message

```http
POST /api/whatsapp/messages/template
Content-Type: application/json

{
  "to": "+14155552671",
  "templateName": "TOUR_CONFIRMATION",
  "params": [
    "John Doe",
    "Jerusalem Old City Tour",
    "December 25, 2024",
    "10:00 AM",
    "Jaffa Gate"
  ],
  "tourId": "tour_123",
  "userId": "passenger_456",
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message queued for delivery"
}
```

### Send Text Message

```http
POST /api/whatsapp/messages/text
Content-Type: application/json

{
  "to": "+14155552671",
  "text": "Your tour guide is on the way! ETA: 5 minutes.",
  "tourId": "tour_123",
  "priority": "normal"
}
```

### Send Image Message

```http
POST /api/whatsapp/messages/image
Content-Type: application/json

{
  "to": "+14155552671",
  "imageUrl": "https://example.com/driver-photo.jpg",
  "caption": "Your driver: David (4.9★ rating)",
  "tourId": "tour_123"
}
```

### Send Location Message

```http
POST /api/whatsapp/messages/location
Content-Type: application/json

{
  "to": "+14155552671",
  "latitude": 31.7767,
  "longitude": 35.2345,
  "name": "Western Wall",
  "address": "Western Wall Plaza, Jerusalem",
  "tourId": "tour_123"
}
```

### Send Button Message

```http
POST /api/whatsapp/messages/buttons
Content-Type: application/json

{
  "to": "+14155552671",
  "bodyText": "We're approaching the Western Wall. Would you like to hear the explanation in:",
  "buttons": [
    { "id": "english", "title": "🇺🇸 English" },
    { "id": "spanish", "title": "🇪🇸 Español" },
    { "id": "hebrew", "title": "🇮🇱 עברית" }
  ],
  "headerText": "Language Selection",
  "footerText": "Spirit Tours",
  "tourId": "tour_123"
}
```

### Send List Message

```http
POST /api/whatsapp/messages/list
Content-Type: application/json

{
  "to": "+14155552671",
  "bodyText": "Choose your perspective for the Western Wall:",
  "buttonText": "View Perspectives",
  "sections": [
    {
      "title": "Religious Perspectives",
      "rows": [
        {
          "id": "islamic",
          "title": "🕌 Islamic",
          "description": "Al-Buraq Wall significance"
        },
        {
          "id": "jewish",
          "title": "✡️ Jewish",
          "description": "Kotel - holiest prayer site"
        },
        {
          "id": "christian",
          "title": "✝️ Christian",
          "description": "Second Temple period"
        }
      ]
    },
    {
      "title": "Academic Perspectives",
      "rows": [
        {
          "id": "historical",
          "title": "🏛️ Historical",
          "description": "Archaeological timeline"
        }
      ]
    }
  ],
  "tourId": "tour_123"
}
```

### Tour-Specific Endpoints

#### Send Tour Confirmation

```http
POST /api/whatsapp/tours/confirmation

{
  "to": "+14155552671",
  "passengerName": "John Doe",
  "tourName": "Jerusalem Old City Tour",
  "date": "December 25, 2024",
  "time": "10:00 AM",
  "pickupLocation": "Jaffa Gate",
  "tourId": "tour_123",
  "userId": "passenger_456"
}
```

#### Send Driver Assignment

```http
POST /api/whatsapp/tours/driver-assigned

{
  "to": "+14155552671",
  "passengerName": "John Doe",
  "driverName": "David Cohen",
  "vehicleModel": "Mercedes Sprinter",
  "licensePlate": "12-345-67",
  "driverPhone": "+972501234567",
  "tourId": "tour_123"
}
```

#### Send Rating Request

```http
POST /api/whatsapp/tours/rating-request

{
  "to": "+14155552671",
  "passengerName": "John Doe",
  "tourName": "Jerusalem Old City Tour",
  "ratingUrl": "https://spirittours.com/rate/tour_123",
  "tourId": "tour_123"
}
```

### Webhook Endpoints

#### Webhook Verification (GET)

```http
GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=spirit-tours-webhook-token&hub.challenge=1234567890
```

**Response:** Returns the `hub.challenge` value

#### Webhook Handler (POST)

WhatsApp sends incoming messages and status updates to this endpoint.

```http
POST /api/whatsapp/webhook
X-Hub-Signature-256: sha256=...

{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "15551234567",
          "phone_number_id": "PHONE_NUMBER_ID"
        },
        "messages": [{
          "from": "14155552671",
          "id": "wamid.XXX",
          "timestamp": "1703522400",
          "type": "text",
          "text": {
            "body": "When will the tour start?"
          }
        }]
      }
    }]
  }]
}
```

### Conversation Management

#### Get Conversation History

```http
GET /api/whatsapp/conversations/+14155552671?limit=50
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 123,
      "message_id": "wamid.XXX",
      "from_number": "+14155552671",
      "to_number": "+15551234567",
      "direction": "inbound",
      "message_type": "text",
      "content": "When will the tour start?",
      "status": "received",
      "sent_at": "2024-12-25T09:30:00Z"
    }
  ]
}
```

### Contact Management

#### Opt Out Contact

```http
POST /api/whatsapp/contacts/+14155552671/opt-out
```

#### Opt In Contact

```http
POST /api/whatsapp/contacts/+14155552671/opt-in
```

### Statistics

```http
GET /api/whatsapp/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "messagesSent": 1250,
    "messagesDelivered": 1180,
    "messagesRead": 950,
    "messagesFailed": 15,
    "messagesReceived": 320,
    "templatesUsed": {
      "TOUR_CONFIRMATION": 450,
      "TOUR_REMINDER": 380,
      "DRIVER_ASSIGNED": 420
    },
    "activeConversations": 45,
    "queueLength": 3
  }
}
```

## Integration Examples

### 1. Tour Confirmation Flow

```javascript
// When tour is booked
const booking = await createTourBooking(bookingData);

// Send WhatsApp confirmation
await whatsappService.sendTemplateMessage(
  booking.passengerPhone,
  'TOUR_CONFIRMATION',
  [
    booking.passengerName,
    booking.tourName,
    booking.date,
    booking.time,
    booking.pickupLocation
  ],
  {
    tourId: booking.id,
    userId: booking.passengerId,
    priority: 'high'
  }
);
```

### 2. Real-time Location Updates

```javascript
// In routes-manager.js
routesManager.on('position-updated', async (data) => {
  // Send location to passengers every 5 minutes
  if (data.minutesSinceLastUpdate >= 5) {
    await whatsappService.sendLocationMessage(
      data.passengerPhone,
      data.position.lat,
      data.position.lng,
      'Current tour location',
      data.nearestLandmark,
      { tourId: data.tourId }
    );
  }
});
```

### 3. Rating Request After Tour

```javascript
// When tour ends
routesManager.on('tour-ended', async (tour) => {
  // Wait 10 minutes, then request rating
  setTimeout(async () => {
    await whatsappService.sendTemplateMessage(
      tour.passengerPhone,
      'RATING_REQUEST',
      [tour.passengerName, tour.tourName],
      { tourId: tour.id, userId: tour.passengerId }
    );
    
    // Follow up with interactive buttons
    await whatsappService.sendButtonMessage(
      tour.passengerPhone,
      `Hi ${tour.passengerName}! We hope you enjoyed your ${tour.tourName}!`,
      [
        { id: 'rate_5', title: '⭐⭐⭐⭐⭐' },
        { id: 'rate_4', title: '⭐⭐⭐⭐' },
        { id: 'rate_later', title: 'Later' }
      ],
      {
        headerText: '📝 Quick Rating',
        footerText: 'Your feedback matters!',
        tourId: tour.id
      }
    );
  }, 10 * 60 * 1000); // 10 minutes
});
```

### 4. Handle Incoming Messages

```javascript
// In server.js or dedicated handler
whatsappService.on('message:received', async (data) => {
  const { from, content, type } = data;
  
  // Find active tour for this passenger
  const activeTour = await findActiveTourByPhone(from);
  
  if (activeTour) {
    // Forward to guide
    await whatsappService.sendTextMessage(
      activeTour.guidePhone,
      `Message from ${activeTour.passengerName}: "${content}"`,
      {
        tourId: activeTour.id,
        replyToMessageId: data.messageId
      }
    );
  } else {
    // No active tour - forward to customer service
    await notifyCustomerService(from, content);
  }
});
```

## Setup Instructions

### 1. Meta Business Account Setup

1. Create a Meta Business Account at https://business.facebook.com
2. Go to Meta Business Suite → Settings → WhatsApp Manager
3. Create a WhatsApp Business Account
4. Add a phone number (can be test number initially)
5. Get your Phone Number ID and Access Token

### 2. Environment Variables

```env
# WhatsApp Business API Configuration
WHATSAPP_API_VERSION=v18.0
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=spirit-tours-webhook-token
WHATSAPP_APP_SECRET=your_app_secret_here
```

### 3. Webhook Configuration

1. In Meta Business Suite, go to your WhatsApp Business Account
2. Click "Configuration" → "Webhook"
3. Set Callback URL: `https://yourdomain.com/api/whatsapp/webhook`
4. Set Verify Token: `spirit-tours-webhook-token` (matches your env var)
5. Subscribe to webhook fields:
   - `messages` (incoming messages)
   - `message_status` (delivery, read receipts)

### 4. Template Message Approval

1. Go to WhatsApp Manager → Message Templates
2. Create each template from the list above
3. Submit for approval (usually takes 24-48 hours)
4. Use approved templates in your code

## Rate Limits & Best Practices

### Rate Limits

- **80 messages per second** per phone number
- **1,000 unique users** per 24 hours (Tier 1)
- **10,000 unique users** per 24 hours (Tier 2)
- **100,000+ users** (Tier 3+, requires approval)

### Best Practices

1. **24-Hour Window:** After a user messages you, you have 24 hours to reply with any message. After that, only template messages are allowed.

2. **Template Message Quality:** Maintain high engagement rates:
   - Open rate > 50%
   - Response rate > 10%
   - Low block/report rates

3. **Opt-In Requirements:** Users must opt-in before receiving messages (except confirmation messages).

4. **Message Frequency:** Don't spam users. Recommended:
   - Tour confirmation: Immediately after booking
   - Tour reminder: 24 hours and 1 hour before
   - Location updates: Every 10-15 minutes during tour
   - Rating request: 10 minutes after tour ends

5. **Error Handling:** Always handle API errors gracefully and implement retry logic.

6. **Privacy:** Store phone numbers securely and comply with GDPR/privacy laws.

## Cost Estimation

### WhatsApp Business API Pricing (approximate)

- **Conversation-based pricing** (24-hour session)
- **Business-initiated:** $0.005 - $0.15 per conversation (varies by country)
- **User-initiated:** Free if replied within 24 hours

### Example Calculation (1000 tours/month)

**Messages per tour:**
- 1 confirmation
- 2 reminders (24h, 1h before)
- 1 driver assignment
- 4 location updates during tour
- 2 waypoint notifications
- 1 rating request
- **Total:** 11 messages per tour

**Monthly cost:**
- 1000 tours × 11 messages = 11,000 messages
- Assuming $0.05 per conversation
- **Estimated cost:** $550/month

**Cost savings vs SMS:**
- SMS: 11,000 × $0.03 = $330
- WhatsApp: $550
- **Difference:** WhatsApp costs more BUT provides:
  - Rich media (images, locations, buttons)
  - Two-way communication
  - Read receipts
  - Better engagement rates

## Troubleshooting

### Message Not Delivered

**Possible causes:**
1. Recipient hasn't opted in
2. Phone number format incorrect
3. Recipient blocked the number
4. Template not approved
5. 24-hour window expired (for non-template messages)

**Solutions:**
- Check opt-in status
- Verify phone number format: `+[country_code][number]`
- Check message status via API
- Use template messages for proactive communication

### Webhook Not Working

**Checklist:**
1. Verify webhook URL is accessible (HTTPS required)
2. Check verify token matches environment variable
3. Verify webhook signature validation
4. Check server logs for errors
5. Test with WhatsApp webhook debugger

### Template Rejected

**Common reasons:**
1. Variable parameters don't make sense
2. Template violates WhatsApp policies
3. Too promotional
4. Contains unsupported content

**Solutions:**
- Follow WhatsApp template guidelines
- Use clear, non-promotional language
- Test with different wording

## Security Considerations

### Webhook Signature Verification

Always verify incoming webhook signatures:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(body, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}
```

### Phone Number Privacy

- Hash phone numbers in logs
- Encrypt stored phone numbers
- Implement opt-out functionality
- Comply with GDPR/privacy regulations

### Access Token Security

- Never commit tokens to Git
- Use environment variables
- Rotate tokens regularly
- Use temporary tokens when possible

## Related Documentation

- [Notification System](./NOTIFICATION_SYSTEM.md)
- [Rating & Feedback System](./RATING_FEEDBACK_SYSTEM.md)
- [Multi-AI Orchestrator](./MULTI_AI_ORCHESTRATOR.md)
- [Routes Manager](./ROUTES_MANAGER.md)

---

**System Status:** ✅ Production Ready
**Last Updated:** 2025-10-21
**Version:** 1.0.0
**WhatsApp Business API Version:** v18.0
