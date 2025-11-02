# Payment Gateway System Documentation

## Overview

The Spirit Tours Payment Gateway System is a comprehensive, production-ready payment processing solution supporting multiple payment providers with a unified API interface.

## Features

### ✅ Completed Features

- **Multi-Provider Support**
  - Stripe (Credit/Debit Cards)
  - PayPal (PayPal Account + Cards)
  - Cash (Manual)
  - Bank Transfer (Manual)

- **Payment Processing**
  - Payment creation and tracking
  - Payment confirmation
  - Payment cancellation
  - Real-time status updates

- **Refund Management**
  - Full refunds
  - Partial refunds
  - Refund tracking
  - Automatic status updates

- **Webhook Integration**
  - Stripe webhook handling
  - PayPal webhook handling
  - Signature verification
  - Event logging

- **Database Integration**
  - Payment records
  - Refund records
  - Webhook event logs
  - Payment methods (saved cards)
  - Payment plans (installments)

- **Frontend Components**
  - Unified payment form
  - Stripe checkout integration
  - PayPal checkout integration
  - Success/failure pages
  - Responsive design

## Architecture

### Backend Structure

```
backend/
├── payments/
│   ├── payment_service.py          # Unified payment service
│   ├── stripe/
│   │   ├── __init__.py
│   │   └── stripe_service.py       # Stripe integration
│   ├── paypal/
│   │   ├── __init__.py
│   │   └── paypal_service.py       # PayPal integration
│   └── models/
│       └── payment_models.py       # Database models
├── api/
│   └── payments.py                 # FastAPI routes
└── alembic/
    └── versions/
        └── 006_payment_system.py   # Database migration
```

### Frontend Structure

```
frontend/src/components/Payment/
├── PaymentForm.tsx              # Main payment form
├── StripeCheckout.tsx          # Stripe integration
├── PayPalCheckout.tsx          # PayPal integration
├── PaymentSuccess.tsx          # Success page
├── PaymentFailed.tsx           # Failure page
└── index.ts                    # Exports
```

## Backend API

### Payment Endpoints

#### Create Payment
```http
POST /api/payments/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 150.00,
  "currency": "USD",
  "provider": "stripe",
  "payment_method": "credit_card",
  "description": "Tour Booking Payment",
  "booking_id": 123,
  "customer_email": "customer@example.com",
  "return_url": "https://spirit-tours.com/payment/success",
  "cancel_url": "https://spirit-tours.com/payment/cancel"
}
```

Response:
```json
{
  "payment_id": "pay_1234567890",
  "provider": "stripe",
  "status": "pending",
  "amount": 150.00,
  "currency": "USD",
  "checkout_url": "https://checkout.stripe.com/...",
  "created_at": "2025-11-02T10:30:00Z"
}
```

#### Get Payment Status
```http
GET /api/payments/{payment_id}
Authorization: Bearer <token>
```

Response:
```json
{
  "payment_id": "pay_1234567890",
  "provider": "stripe",
  "status": "completed",
  "amount": 150.00,
  "currency": "USD",
  "created_at": "2025-11-02T10:30:00Z"
}
```

#### Confirm Payment
```http
POST /api/payments/{payment_id}/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider_payment_id": "pi_1234567890"
}
```

#### Refund Payment
```http
POST /api/payments/{payment_id}/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 50.00,  // Optional: null for full refund
  "reason": "Customer request"
}
```

Response:
```json
{
  "refund_id": "ref_1234567890",
  "payment_id": "pay_1234567890",
  "status": "completed",
  "amount": 50.00,
  "currency": "USD",
  "created_at": "2025-11-02T11:00:00Z"
}
```

#### Cancel Payment
```http
POST /api/payments/{payment_id}/cancel
Authorization: Bearer <token>
```

#### List Payments
```http
GET /api/payments?status=completed&limit=50&offset=0
Authorization: Bearer <token>
```

#### Payment Statistics
```http
GET /api/payments/statistics/summary
Authorization: Bearer <token>
```

Response:
```json
{
  "total_payments": 1250,
  "by_status": {
    "completed": 1100,
    "pending": 50,
    "failed": 100
  },
  "by_provider": {
    "stripe": 800,
    "paypal": 300,
    "cash": 150
  },
  "total_amount": 187500.00
}
```

### Webhook Endpoints

#### Stripe Webhook
```http
POST /api/payments/webhooks/stripe
Stripe-Signature: <signature>
Content-Type: application/json

{
  "type": "payment_intent.succeeded",
  "data": { ... }
}
```

#### PayPal Webhook
```http
POST /api/payments/webhooks/paypal
Content-Type: application/json

{
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "resource": { ... }
}
```

## Database Models

### Payment Table
```sql
CREATE TABLE payments (
    id INTEGER PRIMARY KEY,
    payment_id VARCHAR(100) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    customer_id INTEGER NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    booking_id INTEGER,
    created_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);
```

### Refund Table
```sql
CREATE TABLE refunds (
    id INTEGER PRIMARY KEY,
    refund_id VARCHAR(100) UNIQUE NOT NULL,
    payment_id INTEGER NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id)
);
```

### Webhook Events Table
```sql
CREATE TABLE webhook_events (
    id INTEGER PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payment_id INTEGER,
    payload JSON NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    received_at TIMESTAMP NOT NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id)
);
```

## Frontend Usage

### Basic Payment Form

```tsx
import { PaymentForm } from '@/components/Payment';

function BookingCheckout() {
  const handleSuccess = (paymentId: string) => {
    console.log('Payment successful:', paymentId);
    navigate(`/payment/success?payment_id=${paymentId}`);
  };

  const handleError = (error: string) => {
    console.error('Payment failed:', error);
  };

  return (
    <PaymentForm
      amount={150.00}
      currency="USD"
      description="Tour Booking - Jerusalem Heritage Tour"
      bookingId={123}
      customerEmail="customer@example.com"
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
}
```

### Individual Provider Components

#### Stripe Checkout
```tsx
import { StripeCheckout } from '@/components/Payment';

<StripeCheckout
  amount={150.00}
  currency="USD"
  description="Tour Booking"
  bookingId={123}
  customerEmail="customer@example.com"
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

#### PayPal Checkout
```tsx
import { PayPalCheckout } from '@/components/Payment';

<PayPalCheckout
  amount={150.00}
  currency="USD"
  description="Tour Booking"
  bookingId={123}
  customerEmail="customer@example.com"
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

## Payment Providers

### Stripe Integration

**Features:**
- Credit/Debit card payments
- 3D Secure authentication
- Payment intents API
- Automatic retries
- Dispute handling

**Configuration:**
```python
stripe_service = StripeService(
    api_key="sk_test_...",
    webhook_secret="whsec_...",
    use_test_mode=True
)
```

**Webhook Events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.created`

### PayPal Integration

**Features:**
- PayPal account payments
- Credit/Debit card payments (guest checkout)
- Order creation and capture
- Refund processing
- Dispute handling

**Configuration:**
```python
paypal_service = PayPalService(
    client_id="your_client_id",
    client_secret="your_client_secret",
    webhook_id="your_webhook_id",
    use_sandbox=True
)
```

**Webhook Events:**
- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REFUNDED`
- `CHECKOUT.ORDER.APPROVED`

## Security

### PCI Compliance

- **Stripe Elements**: Tokenized card data, never touches server
- **PayPal Smart Buttons**: PCI-compliant hosted checkout
- **No card storage**: Card details never stored in database

### Webhook Verification

#### Stripe
```python
# Verify webhook signature
stripe.Webhook.construct_event(
    payload, signature, webhook_secret
)
```

#### PayPal
```python
# Verify webhook signature
paypal.verify_webhook_signature(
    transmission_id, transmission_time,
    transmission_sig, cert_url, auth_algo,
    webhook_id, webhook_event
)
```

### Data Encryption

- All payment data transmitted over HTTPS
- Sensitive data encrypted at rest
- PII (Personal Identifiable Information) protected

## Payment Statuses

| Status | Description |
|--------|-------------|
| `pending` | Payment created, awaiting processing |
| `processing` | Payment being processed |
| `completed` | Payment successfully completed |
| `failed` | Payment failed |
| `cancelled` | Payment cancelled by user/system |
| `refunded` | Payment fully refunded |
| `partially_refunded` | Payment partially refunded |

## Currency Support

Supported currencies:
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- ILS (Israeli Shekel)
- JPY (Japanese Yen)

## Error Handling

### Common Errors

| Error Code | Description | Action |
|------------|-------------|--------|
| `card_declined` | Card declined by bank | Try different card |
| `insufficient_funds` | Insufficient funds | Add funds or use different card |
| `expired_card` | Card expired | Use valid card |
| `incorrect_cvc` | Invalid security code | Check CVC |
| `processing_error` | Generic processing error | Retry or contact support |

### Error Response Format

```json
{
  "error": {
    "code": "card_declined",
    "message": "Your card was declined",
    "type": "card_error"
  }
}
```

## Testing

### Test Cards (Stripe)

| Card Number | Result |
|-------------|--------|
| 4242424242424242 | Success |
| 4000000000000002 | Declined |
| 4000000000009995 | Insufficient funds |
| 4000008260000000 | Requires 3D Secure |

### Test Accounts (PayPal)

Use PayPal Sandbox for testing:
- Personal: buyer@example.com / password123
- Business: seller@example.com / password123

## Deployment

### Environment Variables

```bash
# Stripe
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_WEBHOOK_ID=your_webhook_id
PAYPAL_MODE=live  # or sandbox

# App
PAYMENT_RETURN_URL=https://spirit-tours.com/payment/success
PAYMENT_CANCEL_URL=https://spirit-tours.com/payment/cancel
```

### Database Migration

```bash
# Run migration
alembic upgrade head

# Verify tables
alembic current
```

### Webhook Setup

#### Stripe
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/payments/webhooks/stripe`
3. Select events:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - charge.refunded
4. Copy webhook secret

#### PayPal
1. Go to PayPal Developer Dashboard → Webhooks
2. Add webhook: `https://your-domain.com/api/payments/webhooks/paypal`
3. Select events:
   - PAYMENT.CAPTURE.COMPLETED
   - PAYMENT.CAPTURE.DENIED
   - PAYMENT.CAPTURE.REFUNDED
4. Copy webhook ID

## Monitoring

### Key Metrics

- **Payment Success Rate**: `completed / (completed + failed)`
- **Average Transaction Value**: `total_amount / total_payments`
- **Refund Rate**: `refunded / completed`
- **Provider Distribution**: Payments by provider

### Logging

```python
import logging

logger = logging.getLogger('payment_gateway')
logger.info(f"Payment created: {payment_id}")
logger.warning(f"Payment failed: {payment_id} - {error}")
logger.error(f"Webhook processing error: {error}")
```

## Troubleshooting

### Payment Not Completing

1. Check webhook configuration
2. Verify webhook endpoint is accessible
3. Check webhook event logs
4. Verify signature validation

### Refund Failures

1. Verify payment is completed
2. Check refund amount ≤ original amount
3. Verify provider credentials
4. Check provider dashboard for errors

### Webhook Not Received

1. Verify endpoint URL is correct
2. Check firewall/security settings
3. Verify SSL certificate is valid
4. Test webhook manually in provider dashboard

## Support

For issues or questions:
- **Email**: dev@spirit-tours.com
- **Docs**: https://docs.spirit-tours.com/payments
- **Slack**: #payment-gateway

## Changelog

### Version 1.0.0 (2025-11-02)

**Added:**
- Multi-provider payment processing (Stripe, PayPal)
- Refund management (full and partial)
- Webhook integration for real-time updates
- Complete database models
- Frontend payment components
- Success/failure pages
- Comprehensive documentation

**Features:**
- 4 payment providers
- 7 payment statuses
- 5 supported currencies
- Full and partial refunds
- Webhook event logging
- Payment plans (installments)
- Saved payment methods
- PCI-compliant checkout

## License

Proprietary - Spirit Tours Ltd.
