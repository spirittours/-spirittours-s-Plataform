# Email Notification System Documentation

## Overview

The Spirit Tours Email Notification System provides comprehensive email functionality including templating, sending, tracking, and analytics.

## Features

### Core Capabilities
- ✅ **Multi-provider Support**: SMTP, SendGrid, AWS SES, Mailgun
- ✅ **Template Engine**: Jinja2-based with variable substitution
- ✅ **Email Queue**: Priority-based queue with retry logic
- ✅ **Tracking**: Open and click tracking with analytics
- ✅ **Responsive Templates**: Mobile-friendly HTML email templates
- ✅ **Multi-language**: Template support for multiple languages
- ✅ **Campaign Management**: Bulk email campaigns with analytics

### Supported Email Types
- Booking confirmation
- Payment receipt
- Welcome email
- Password reset
- Booking reminder
- Tour updates
- Promotional emails
- Newsletter
- Review requests

## Architecture

### Database Models

**EmailTemplate**: Stores reusable email templates
- Jinja2 template syntax
- Multi-language support
- Variable definitions
- Version control

**Email**: Tracks all sent emails
- Full delivery lifecycle
- Status tracking
- Open/click counts
- Error handling

**EmailEvent**: Detailed event tracking
- Opens, clicks, bounces
- User agent and IP tracking
- Link analytics

**EmailQueue**: Priority-based queue
- Scheduled sending
- Retry logic
- Batch processing

**EmailCampaign**: Bulk email campaigns
- Recipient management
- Performance metrics
- A/B testing support

## Quick Start

### 1. Configuration

Set environment variables in `.env`:

```bash
# Email Provider (smtp, sendgrid, aws_ses, mailgun)
EMAIL_PROVIDER=smtp

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_USE_TLS=true

# SendGrid Configuration
SENDGRID_API_KEY=SG.xxxxxxxxxxxx

# Sender Defaults
EMAIL_FROM=noreply@spirittours.com
EMAIL_FROM_NAME=Spirit Tours
EMAIL_REPLY_TO=support@spirittours.com

# Queue Configuration
EMAIL_QUEUE_ENABLED=true
EMAIL_QUEUE_BATCH_SIZE=100
EMAIL_MAX_RETRIES=3

# Tracking
EMAIL_TRACKING_ENABLED=true
EMAIL_TRACKING_DOMAIN=track.spirittours.com
```

### 2. Send Basic Email

```python
from backend.email.email_service import email_service

result = await email_service.send_email(
    to_email="user@example.com",
    to_name="John Doe",
    subject="Welcome to Spirit Tours",
    html_body="<h1>Welcome!</h1><p>Thank you for joining us.</p>",
    priority=EmailPriority.NORMAL
)
```

### 3. Send Template-Based Email

```python
from backend.email.notification_service import notification_service

result = await notification_service.send_booking_confirmation(
    db=db_session,
    user_email="user@example.com",
    user_name="John Doe",
    booking_data={
        'reference': 'BK-12345',
        'tour_name': 'Jerusalem Walking Tour',
        'date': datetime(2025, 2, 15),
        'time': '10:00 AM',
        'duration': '4 hours',
        'guest_count': 2,
        'meeting_point': 'Jaffa Gate',
        'subtotal': 150.00,
        'tax': 15.00,
        'total': 165.00,
        'currency': 'USD',
        'details_url': 'https://spirittours.com/bookings/BK-12345'
    },
    language='en'
)
```

### 4. Queue Email for Later

```python
from backend.email.notification_service import notification_service
from datetime import datetime, timedelta

result = await notification_service.queue_email(
    db=db_session,
    email_data={
        'to_email': 'user@example.com',
        'to_name': 'John Doe',
        'subject': 'Tour Reminder',
        'html_body': '<p>Your tour is tomorrow!</p>'
    },
    priority=EmailPriority.HIGH,
    scheduled_at=datetime.utcnow() + timedelta(hours=24)
)
```

### 5. Process Email Queue

```python
from backend.email.notification_service import notification_service

# Process queued emails (usually run by scheduled job)
result = await notification_service.process_email_queue(
    db=db_session,
    batch_size=100
)
```

## API Endpoints

### Send Email
```http
POST /api/emails/send
Content-Type: application/json

{
  "to_email": "user@example.com",
  "to_name": "John Doe",
  "subject": "Welcome",
  "html_body": "<h1>Welcome!</h1>",
  "priority": "normal"
}
```

### Get Email Status
```http
GET /api/emails/{email_id}/status

Response:
{
  "email_id": "abc-123",
  "status": "delivered",
  "to_email": "user@example.com",
  "subject": "Welcome",
  "sent_at": "2025-01-02T10:00:00Z",
  "opened_at": "2025-01-02T10:05:30Z",
  "clicked_at": "2025-01-02T10:06:15Z"
}
```

### Get Email Analytics
```http
GET /api/emails/{email_id}/analytics

Response:
{
  "email_id": "abc-123",
  "opened": true,
  "open_count": 3,
  "clicked": true,
  "click_count": 2,
  "events": [
    {
      "type": "opened",
      "occurred_at": "2025-01-02T10:05:30Z",
      "user_agent": "Mozilla/5.0...",
      "ip_address": "192.168.1.1"
    },
    {
      "type": "clicked",
      "occurred_at": "2025-01-02T10:06:15Z",
      "link_url": "https://spirittours.com/tours"
    }
  ]
}
```

### List Templates
```http
GET /api/emails/templates?language=en&is_active=true

Response:
{
  "templates": [
    {
      "id": 1,
      "template_id": "booking_confirmation_v1",
      "name": "Booking Confirmation",
      "type": "booking_confirmation",
      "language": "en",
      "subject": "Your Booking is Confirmed!"
    }
  ],
  "total": 1
}
```

## Email Templates

### Template Variables

Templates use Jinja2 syntax with double curly braces:

```html
<p>Dear {{ user_name }},</p>
<p>Your booking reference is <strong>{{ booking_reference }}</strong>.</p>
<p>Total amount: {{ total_amount|currency(currency) }}</p>
<p>Date: {{ booking_date|date('%B %d, %Y') }}</p>
```

### Custom Filters

- `currency(value, currency)`: Format as currency
- `date(value, format)`: Format date
- `datetime(value, format)`: Format datetime

### Creating Custom Templates

1. **Create template file** in `backend/email/templates/`:

```html
{% extends "base.html" %}

{% block title %}My Custom Email{% endblock %}

{% block header_title %}Custom Title{% endblock %}

{% block content %}
<p>Dear {{ user_name }},</p>
<p>{{ custom_message }}</p>
{% endblock %}
```

2. **Add to database**:

```python
template = EmailTemplate(
    template_id="my_custom_email_v1",
    name="My Custom Email",
    type=EmailTemplateType.CUSTOM,
    subject="{{ subject_line }}",
    html_content=template_content,
    language="en",
    variables=["user_name", "custom_message", "subject_line"],
    is_active=True
)
db.add(template)
db.commit()
```

## Email Tracking

### Open Tracking

Automatically added to all HTML emails:

```html
<!-- Tracking pixel added before </body> -->
<img src="https://track.spirittours.com/api/email/track/open/abc-123" 
     width="1" height="1" alt="" style="display:none;" />
```

### Click Tracking

All links in HTML emails are automatically rewritten:

```html
<!-- Original -->
<a href="https://spirittours.com/tours">View Tours</a>

<!-- After tracking -->
<a href="https://track.spirittours.com/api/email/track/click/abc-123?url=...">
  View Tours
</a>
```

## Email Queue

### Queue Processing

Run as scheduled job (cron/celery):

```bash
# Every minute
* * * * * curl -X POST http://localhost:8000/api/emails/queue/process

# Or using Python
python -c "
import asyncio
from backend.email.notification_service import notification_service
from backend.database import SessionLocal

async def process():
    db = SessionLocal()
    await notification_service.process_email_queue(db)
    db.close()

asyncio.run(process())
"
```

### Priority Levels

- **URGENT**: Immediate (password reset, security alerts)
- **HIGH**: High priority (booking confirmations, payments)
- **NORMAL**: Standard (newsletters, updates)
- **LOW**: Low priority (promotional)

## Best Practices

### 1. Use Templates

Always use templates for consistent branding:

```python
# Good
await notification_service.send_booking_confirmation(db, email, name, data)

# Avoid
await email_service.send_email(to_email=email, html_body="<p>Booking confirmed</p>")
```

### 2. Queue Non-Urgent Emails

```python
# Good for promotional emails
await notification_service.queue_email(db, email_data, priority=EmailPriority.LOW)

# Good for urgent emails
await email_service.send_email(..., priority=EmailPriority.URGENT)
```

### 3. Handle Failures Gracefully

```python
result = await email_service.send_email(...)
if not result['success']:
    logger.error(f"Email failed: {result['error']}")
    # Fallback logic or retry
```

### 4. Test Before Production

```bash
# Use test mode
EMAIL_TEST_MODE=true
EMAIL_TEST_RECIPIENT=test@spirittours.com
```

### 5. Monitor Analytics

```python
# Track email performance
analytics = await tracking_service.get_email_analytics(db, email_id)
if analytics['open_count'] == 0:
    # Email may need improvement
```

## Deployment

### 1. Run Migrations

```bash
cd backend
alembic upgrade head
```

### 2. Configure Provider

For **SMTP** (Gmail example):
1. Enable 2-factor authentication
2. Generate app password
3. Set SMTP_PASSWORD to app password

For **SendGrid**:
1. Create SendGrid account
2. Generate API key
3. Set SENDGRID_API_KEY

### 3. Setup Queue Processor

**Using Cron**:
```cron
* * * * * cd /path/to/backend && python -c "from scripts.process_email_queue import process; process()"
```

**Using Celery**:
```python
# celery_tasks.py
@celery.task
def process_email_queue():
    db = SessionLocal()
    asyncio.run(notification_service.process_email_queue(db))
    db.close()
```

### 4. Setup Tracking Domain

Configure DNS:
```
track.spirittours.com CNAME spirittours.com
```

## Troubleshooting

### Emails Not Sending

1. Check SMTP credentials
2. Verify SMTP_USE_TLS setting
3. Check firewall/port access
4. Review error logs

### Tracking Not Working

1. Verify EMAIL_TRACKING_ENABLED=true
2. Check tracking domain DNS
3. Ensure HTTPS on tracking domain
4. Review browser privacy settings

### Queue Not Processing

1. Verify queue processor is running
2. Check for failed emails with retry_count >= max_retries
3. Review error messages in email.error_message
4. Check database connection

## Performance

- **Batch Processing**: Process up to 1000 emails per batch
- **Caching**: Template caching enabled by default
- **Rate Limiting**: Configurable per hour limits
- **Async Operations**: All email operations are async

## Security

- **SMTP over TLS**: Encrypted email transmission
- **API Key Protection**: Environment variable storage
- **Input Validation**: Pydantic models
- **SQL Injection Protection**: SQLAlchemy ORM
- **XSS Protection**: Jinja2 auto-escaping

## Support

For issues or questions:
- Email: dev@spirittours.com
- Documentation: /docs/email-system

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-02  
**Status**: ✅ Production Ready
