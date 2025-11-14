# 🧪 Testing Checklist - 3 Critical Features

Complete testing guide for Authentication, Payments, and Email Notifications systems.

---

## 📋 Pre-Testing Setup

### 1. **Environment Configuration**
```bash
# Copy example environment file
cp backend/.env.example backend/.env

# Edit .env and fill in:
# - SECRET_KEY (generate new: python -c "import secrets; print(secrets.token_urlsafe(32))")
# - STRIPE_SECRET_KEY (from Stripe Dashboard)
# - SENDGRID_API_KEY (from SendGrid Dashboard)
```

### 2. **Install Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

### 3. **Start Backend Server**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 4. **Access API Documentation**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 🔐 A) AUTHENTICATION TESTING

### Test 1: User Registration ✅

**Endpoint:** `POST /api/v1/auth/register`

**Test Case 1.1: Successful Registration**
```json
{
  "email": "test@example.com",
  "password": "SecurePass123",
  "full_name": "Test User",
  "phone": "+1234567890"
}
```

**Expected Response:** `201 Created`
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "full_name": "Test User",
    "role": "customer",
    "is_active": true
  }
}
```

**Validation:**
- ✅ Token is returned
- ✅ User object is complete
- ✅ Status code is 201
- ✅ User is created in database

---

**Test Case 1.2: Duplicate Email Registration**
```json
{
  "email": "test@example.com",  // Same email as above
  "password": "AnotherPass456",
  "full_name": "Another User"
}
```

**Expected Response:** `400 Bad Request`
```json
{
  "detail": "Email already registered"
}
```

---

**Test Case 1.3: Weak Password**
```json
{
  "email": "weak@example.com",
  "password": "123",  // Too short, no uppercase, no lowercase
  "full_name": "Weak Pass User"
}
```

**Expected Response:** `422 Unprocessable Entity`
```json
{
  "detail": [
    {
      "loc": ["body", "password"],
      "msg": "Password must be at least 8 characters long",
      "type": "value_error"
    }
  ]
}
```

---

### Test 2: User Login ✅

**Endpoint:** `POST /api/v1/auth/login`

**Test Case 2.1: Successful Login**
```json
{
  "email": "test@example.com",
  "password": "SecurePass123"
}
```

**Expected Response:** `200 OK`
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "full_name": "Test User",
    "role": "customer"
  }
}
```

**Validation:**
- ✅ Token is returned
- ✅ Token is different from registration token (new timestamp)

---

**Test Case 2.2: Invalid Password**
```json
{
  "email": "test@example.com",
  "password": "WrongPassword123"
}
```

**Expected Response:** `401 Unauthorized`
```json
{
  "detail": "Incorrect email or password"
}
```

---

**Test Case 2.3: Non-existent User**
```json
{
  "email": "nonexistent@example.com",
  "password": "SomePassword123"
}
```

**Expected Response:** `401 Unauthorized`
```json
{
  "detail": "Incorrect email or password"
}
```

---

### Test 3: Get Current User Profile ✅

**Endpoint:** `GET /api/v1/auth/me`

**Headers Required:**
```
Authorization: Bearer <access_token_from_login>
```

**Test Case 3.1: Valid Token**

**Expected Response:** `200 OK`
```json
{
  "id": 1,
  "email": "test@example.com",
  "full_name": "Test User",
  "phone": "+1234567890",
  "role": "customer",
  "is_active": true,
  "email_verified": false,
  "created_at": "2024-11-14T10:30:00"
}
```

---

**Test Case 3.2: Missing Token**

**Headers:** (No Authorization header)

**Expected Response:** `403 Forbidden`
```json
{
  "detail": "Not authenticated"
}
```

---

**Test Case 3.3: Invalid Token**

**Headers:**
```
Authorization: Bearer invalid_token_here
```

**Expected Response:** `401 Unauthorized`
```json
{
  "detail": "Invalid authentication credentials"
}
```

---

### Test 4: Update User Profile ✅

**Endpoint:** `PUT /api/v1/auth/profile`

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Test Case 4.1: Update Name and Phone**
```json
{
  "full_name": "Updated Name",
  "phone": "+9876543210"
}
```

**Expected Response:** `200 OK`
```json
{
  "id": 1,
  "email": "test@example.com",
  "full_name": "Updated Name",
  "phone": "+9876543210",
  "role": "customer"
}
```

---

### Test 5: Logout ✅

**Endpoint:** `POST /api/v1/auth/logout`

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Expected Response:** `200 OK`
```json
{
  "message": "Successfully logged out"
}
```

**Note:** Frontend should delete token from localStorage

---

## 💳 B) PAYMENT TESTING

### Setup: Stripe Test Mode

**Test Cards:**
- ✅ Success: `4242 4242 4242 4242`
- ❌ Decline: `4000 0000 0000 0002`
- 🔐 Requires Auth: `4000 0025 0000 3155`
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)

---

### Test 6: Create Payment Intent ✅

**Endpoint:** `POST /api/v1/payments/create-payment-intent`

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Test Case 6.1: Create Payment for Booking**
```json
{
  "amount": 299.99,
  "currency": "usd",
  "booking_id": "BK-2024-001",
  "metadata": {
    "tour_name": "Machu Picchu Adventure",
    "participants": 2
  }
}
```

**Expected Response:** `200 OK`
```json
{
  "client_secret": "pi_xxx_secret_yyy",
  "payment_intent_id": "pi_1234567890abcdef",
  "amount": 299.99,
  "currency": "usd",
  "status": "requires_payment_method"
}
```

**Validation:**
- ✅ client_secret is returned (use in Stripe Elements)
- ✅ payment_intent_id is stored for tracking

---

### Test 7: Confirm Payment ✅

**Endpoint:** `GET /api/v1/payments/confirm-payment/{payment_intent_id}`

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Test Case 7.1: Check Payment Status**

URL: `/api/v1/payments/confirm-payment/pi_1234567890abcdef`

**Expected Response:** `200 OK`
```json
{
  "payment_intent_id": "pi_1234567890abcdef",
  "status": "succeeded",
  "amount": 299.99,
  "currency": "usd",
  "payment_method": "pm_card_visa",
  "created": "2024-11-14T10:45:00"
}
```

**Possible statuses:**
- `requires_payment_method` - Waiting for card
- `requires_confirmation` - Ready to confirm
- `processing` - Being processed
- `succeeded` - ✅ Payment successful
- `canceled` - ❌ Payment canceled
- `requires_action` - Needs 3D Secure

---

### Test 8: Payment History ✅

**Endpoint:** `GET /api/v1/payments/payment-history?limit=10`

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Expected Response:** `200 OK`
```json
[
  {
    "payment_intent_id": "pi_1234567890abcdef",
    "amount": 299.99,
    "currency": "usd",
    "status": "succeeded",
    "created": "2024-11-14T10:45:00",
    "metadata": {
      "booking_id": "BK-2024-001",
      "tour_name": "Machu Picchu Adventure"
    }
  }
]
```

---

### Test 9: Create Refund ✅

**Endpoint:** `POST /api/v1/payments/refund`

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Test Case 9.1: Partial Refund**
```json
{
  "payment_intent_id": "pi_1234567890abcdef",
  "amount": 150.00,
  "reason": "requested_by_customer"
}
```

**Expected Response:** `200 OK`
```json
{
  "refund_id": "re_1234567890xyz",
  "payment_intent_id": "pi_1234567890abcdef",
  "amount": 150.00,
  "status": "succeeded",
  "reason": "requested_by_customer"
}
```

**Test Case 9.2: Full Refund**
```json
{
  "payment_intent_id": "pi_1234567890abcdef",
  "reason": "duplicate"
}
```
*Note: No amount = full refund*

---

### Test 10: Stripe Webhook ✅

**Endpoint:** `POST /api/v1/payments/webhook`

**⚠️ Important:** Configure this in Stripe Dashboard:
1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://your-domain.com/api/v1/payments/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`

**Test using Stripe CLI:**
```bash
stripe listen --forward-to localhost:8000/api/v1/payments/webhook
stripe trigger payment_intent.succeeded
```

**Expected Response:** `200 OK`
```json
{
  "status": "success",
  "event": {
    "event_type": "payment_intent.succeeded",
    "event_id": "evt_123",
    "processed": true
  }
}
```

---

## 📧 C) EMAIL NOTIFICATIONS TESTING

### Setup: SendGrid Configuration

1. **Create SendGrid Account:** https://sendgrid.com
2. **Verify Sender Identity:** Settings > Sender Authentication
3. **Create API Key:** Settings > API Keys (with "Mail Send" permission)
4. **Add to .env:**
   ```
   SENDGRID_API_KEY=SG.your_key_here
   FROM_EMAIL=noreply@yourdomain.com
   FROM_NAME=Spirit Tours
   ```

---

### Test 11: Welcome Email ✅

**Endpoint:** `POST /api/v1/notifications/welcome`

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Test Case 11.1: Send Welcome Email**
```json
{
  "to_email": "test@example.com",
  "full_name": "Test User"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "message": "Welcome email sent to test@example.com"
}
```

**Validation:**
- ✅ Check email inbox (or spam folder)
- ✅ Email contains welcome message
- ✅ Email is professionally formatted with HTML
- ✅ Branding and styling are correct

---

### Test 12: Booking Confirmation Email ✅

**Endpoint:** `POST /api/v1/notifications/booking-confirmation`

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Test Case 12.1: Send Booking Confirmation**
```json
{
  "to_email": "test@example.com",
  "booking_id": "BK-2024-001",
  "tour_name": "Machu Picchu Adventure",
  "travel_date": "2024-06-15",
  "participants": 2,
  "total_amount": 599.99,
  "customer_name": "Test User"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "message": "Booking confirmation sent to test@example.com"
}
```

**Email Validation:**
- ✅ Contains booking ID
- ✅ Shows tour name and date
- ✅ Displays total amount correctly
- ✅ Includes "What's Next" section

---

### Test 13: Payment Receipt Email ✅

**Endpoint:** `POST /api/v1/notifications/payment-receipt`

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Test Case 13.1: Send Payment Receipt**
```json
{
  "to_email": "test@example.com",
  "payment_id": "pi_1234567890abcdef",
  "amount": 599.99,
  "currency": "usd",
  "booking_id": "BK-2024-001",
  "payment_date": "2024-11-14 10:45:00",
  "customer_name": "Test User"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "message": "Payment receipt sent to test@example.com"
}
```

**Email Validation:**
- ✅ Receipt format is professional
- ✅ Amount is prominently displayed
- ✅ Payment ID and booking ID are included
- ✅ Status shows "Paid" with checkmark

---

### Test 14: Tour Reminder Email ✅

**Endpoint:** `POST /api/v1/notifications/tour-reminder`

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Test Case 14.1: Send Tour Reminder**
```json
{
  "to_email": "test@example.com",
  "tour_name": "Machu Picchu Adventure",
  "travel_date": "2024-11-17",
  "meeting_point": "Cusco Central Plaza",
  "meeting_time": "07:00 AM",
  "customer_name": "Test User",
  "booking_id": "BK-2024-001"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "message": "Tour reminder sent to test@example.com"
}
```

**Email Validation:**
- ✅ Shows "3 days away" messaging
- ✅ Meeting point and time are clear
- ✅ Pre-tour checklist is included
- ✅ Reminder to arrive 15 minutes early

---

### Test 15: Custom Email ✅

**Endpoint:** `POST /api/v1/notifications/custom`

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Test Case 15.1: Send Custom HTML Email**
```json
{
  "to_email": "test@example.com",
  "subject": "Special Offer - 20% Off!",
  "html_content": "<h1>Limited Time Offer</h1><p>Get 20% off your next booking!</p>"
}
```

**Expected Response:** `200 OK`
```json
{
  "success": true,
  "message": "Custom email sent to test@example.com"
}
```

---

### Test 16: Bulk Emails ✅

**Endpoint:** `POST /api/v1/notifications/bulk`

**Headers Required:**
```
Authorization: Bearer <access_token>
```

**Test Case 16.1: Send Newsletter to Multiple Users**
```json
{
  "recipients": [
    "user1@example.com",
    "user2@example.com",
    "user3@example.com"
  ],
  "subject": "Newsletter - November 2024",
  "html_content": "<h1>Latest Updates</h1><p>Check out our new tours...</p>"
}
```

**Expected Response:** `200 OK`
```json
{
  "total": 3,
  "success": 3,
  "failed": 0,
  "message": "Bulk email completed: 3 sent, 0 failed"
}
```

**Validation:**
- ✅ All recipients receive email
- ✅ Success/failure counts are accurate
- ✅ Maximum 100 recipients per request enforced

---

## 🔗 D) INTEGRATION TESTING

### Test 17: Complete User Journey ✅

**Scenario:** New user signs up, books a tour, makes payment, receives emails

**Steps:**

1. **Register User**
   ```bash
   POST /api/v1/auth/register
   # Save access_token
   ```

2. **Send Welcome Email** (automatic trigger in production)
   ```bash
   POST /api/v1/notifications/welcome
   ```

3. **Create Payment Intent**
   ```bash
   POST /api/v1/payments/create-payment-intent
   # Save payment_intent_id and client_secret
   ```

4. **Confirm Payment** (using Stripe Elements on frontend)
   ```bash
   GET /api/v1/payments/confirm-payment/{payment_intent_id}
   ```

5. **Send Booking Confirmation Email**
   ```bash
   POST /api/v1/notifications/booking-confirmation
   ```

6. **Send Payment Receipt Email**
   ```bash
   POST /api/v1/notifications/payment-receipt
   ```

7. **Check Payment History**
   ```bash
   GET /api/v1/payments/payment-history
   ```

**Validation:**
- ✅ All steps complete without errors
- ✅ User receives 3 emails (welcome, booking, receipt)
- ✅ Payment appears in history
- ✅ Token remains valid throughout

---

## 📊 E) PERFORMANCE TESTING

### Test 18: Load Testing ⚡

**Tools:** Apache Bench, k6, or Locust

**Auth Endpoint Load Test:**
```bash
ab -n 1000 -c 10 -T application/json \
  -p register.json \
  http://localhost:8000/api/v1/auth/register
```

**Expected:**
- ✅ > 100 requests/second
- ✅ < 200ms average response time
- ✅ 0% error rate

---

## 🐛 F) ERROR HANDLING TESTING

### Test 19: Edge Cases ⚠️

**Test Case 19.1: Extremely Long Password**
```json
{
  "email": "test@example.com",
  "password": "A" * 1000,  // 1000 characters
  "full_name": "Test"
}
```

**Expected:** Handled gracefully with validation error

---

**Test Case 19.2: SQL Injection Attempt**
```json
{
  "email": "admin@example.com'; DROP TABLE users; --",
  "password": "Password123"
}
```

**Expected:** Treated as normal string, no SQL execution

---

**Test Case 19.3: Large Payment Amount**
```json
{
  "amount": 999999999.99,
  "currency": "usd"
}
```

**Expected:** Either accepted or validation error (business rules)

---

## ✅ FINAL VALIDATION CHECKLIST

Before deploying to production:

### Authentication ✅
- [ ] Users can register successfully
- [ ] Duplicate emails are rejected
- [ ] Password validation works correctly
- [ ] Login returns valid JWT token
- [ ] Protected endpoints require authentication
- [ ] Invalid tokens are rejected
- [ ] Users can update their profiles
- [ ] Logout works correctly

### Payments ✅
- [ ] Payment intents are created successfully
- [ ] Stripe test cards work correctly
- [ ] Payment confirmation returns correct status
- [ ] Payment history is tracked
- [ ] Refunds can be processed
- [ ] Webhooks receive and process events
- [ ] Failed payments are handled gracefully

### Email Notifications ✅
- [ ] Welcome emails are sent and formatted correctly
- [ ] Booking confirmations include all details
- [ ] Payment receipts are professional
- [ ] Tour reminders are timely and clear
- [ ] Custom emails work with HTML content
- [ ] Bulk emails send to multiple recipients
- [ ] Email failures are logged

### Security ✅
- [ ] Passwords are hashed (not stored in plain text)
- [ ] JWT tokens expire correctly
- [ ] Sensitive data is not exposed in responses
- [ ] CORS is configured properly
- [ ] SQL injection is prevented
- [ ] XSS attacks are mitigated

### Integration ✅
- [ ] Complete user journey works end-to-end
- [ ] All services communicate correctly
- [ ] Error handling is consistent
- [ ] API documentation is accurate

---

## 🚀 READY FOR PRODUCTION?

When all tests pass:

1. ✅ Update .env with production credentials
2. ✅ Enable email verification
3. ✅ Switch to Stripe live mode
4. ✅ Configure production webhook endpoints
5. ✅ Set up monitoring and error tracking
6. ✅ Enable rate limiting
7. ✅ Configure backups
8. ✅ Set up SSL certificates
9. ✅ Deploy to production environment
10. ✅ Run smoke tests on production

---

## 📞 SUPPORT

If tests fail:
- Check logs: `backend/logs/`
- Review .env configuration
- Verify API keys are correct
- Check network connectivity
- Review API documentation at /docs
- Contact development team

**Test Coverage Goal:** > 80%
**Performance Target:** < 200ms response time
**Uptime Goal:** 99.9%
