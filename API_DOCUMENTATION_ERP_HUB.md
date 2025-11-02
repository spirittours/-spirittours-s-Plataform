# 📚 API Documentation - ERP Hub

**Version**: 1.0.0  
**Base URL**: `/api/erp`  
**Authentication**: Bearer Token (JWT)  
**Content-Type**: `application/json`

---

## 📋 Table of Contents

1. [OAuth Endpoints](#oauth-endpoints)
2. [Configuration Endpoints](#configuration-endpoints)
3. [Sync Endpoints](#sync-endpoints)
4. [Provider & Adapter Endpoints](#provider--adapter-endpoints)
5. [Exchange Rate Endpoints](#exchange-rate-endpoints)
6. [Health Check](#health-check)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

---

## 🔐 OAuth Endpoints

### POST /api/erp/oauth/authorize

Initiate OAuth 2.0 authorization flow for ERP connection.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "sucursalId": "uuid",
  "provider": "quickbooks",
  "redirectUri": "https://your-app.com/oauth/callback"
}
```

**Response:**
```json
{
  "success": true,
  "authorizationUrl": "https://appcenter.intuit.com/connect/oauth2?...",
  "state": "quickbooks_uuid_randomstring",
  "expiresAt": "2024-11-02T10:30:00.000Z"
}
```

**Supported Providers:**
- `quickbooks` - QuickBooks Online
- `xero` - Xero Accounting
- `zoho_books` - Zoho Books
- `freshbooks` - FreshBooks

---

### GET /api/erp/oauth/callback

OAuth 2.0 callback endpoint - exchanges authorization code for access tokens.

**Query Parameters:**
```
code: string (required) - Authorization code from provider
state: string (required) - State parameter for CSRF protection
realmId: string (optional) - QuickBooks Company ID
```

**Response:**
```json
{
  "success": true,
  "message": "OAuth authentication successful",
  "sucursalId": "uuid"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid or expired OAuth state"
}
```

---

### POST /api/erp/oauth/disconnect

Revoke OAuth tokens and disconnect ERP integration.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "sucursalId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OAuth tokens revoked successfully"
}
```

---

## ⚙️ Configuration Endpoints

### GET /api/erp/config/:sucursalId

Get ERP configuration for a branch.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `sucursalId` (uuid) - Branch ID

**Response:**
```json
{
  "success": true,
  "config": {
    "id": "uuid",
    "sucursal_id": "uuid",
    "erp_provider": "quickbooks",
    "erp_region": "us",
    "sync_enabled": true,
    "sync_frequency": "hourly",
    "sync_direction": "bidirectional",
    "auto_sync_invoices": true,
    "auto_sync_payments": true,
    "auto_sync_customers": true,
    "is_connected": true,
    "connection_status": "connected",
    "last_sync": "2024-11-02T09:00:00.000Z",
    "successful_syncs": 150,
    "failed_syncs": 3
  }
}
```

---

### POST /api/erp/config/:sucursalId

Save or update ERP configuration.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
- `sucursalId` (uuid) - Branch ID

**Request Body:**
```json
{
  "erpProvider": "quickbooks",
  "erpRegion": "us",
  "syncEnabled": true,
  "syncFrequency": "hourly",
  "syncDirection": "bidirectional",
  "autoSyncInvoices": true,
  "autoSyncPayments": true,
  "autoSyncCustomers": true,
  "accountMapping": {
    "salesAccount": "1",
    "receivablesAccount": "2",
    "payablesAccount": "3"
  }
}
```

**Response:**
```json
{
  "success": true,
  "config": { ... }
}
```

---

### POST /api/erp/test-connection/:sucursalId

Test connection with ERP system.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `sucursalId` (uuid) - Branch ID

**Response:**
```json
{
  "success": true,
  "connected": true
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Connection failed: Invalid credentials",
  "connected": false
}
```

---

## 🔄 Sync Endpoints

### POST /api/erp/sync/customer/:customerId

Sync a single customer to ERP manually.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
- `customerId` (uuid) - Customer ID in Spirit Tours

**Request Body:**
```json
{
  "sucursalId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "entityType": "customer",
    "spiritEntityId": "uuid",
    "erpEntityId": "123",
    "duration": 1250
  }
}
```

---

### POST /api/erp/sync/invoice/:cxcId

Sync a single invoice to ERP manually.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
- `cxcId` (uuid) - CXC ID (Invoice ID in Spirit Tours)

**Request Body:**
```json
{
  "sucursalId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "entityType": "invoice",
    "spiritEntityId": "uuid",
    "erpEntityId": "INV-001",
    "duration": 2100
  }
}
```

---

### POST /api/erp/sync/payment/:pagoId

Sync a single payment to ERP manually.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
- `pagoId` (uuid) - Payment ID in Spirit Tours

**Request Body:**
```json
{
  "sucursalId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "entityType": "payment",
    "spiritEntityId": "uuid",
    "erpEntityId": "PMT-001",
    "duration": 1800
  }
}
```

---

### POST /api/erp/sync/batch

Sync multiple entities in batch.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "sucursalId": "uuid",
  "entities": [
    { "type": "customer", "id": "uuid1" },
    { "type": "invoice", "id": "uuid2" },
    { "type": "payment", "id": "uuid3" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "errors": [],
    "details": [
      {
        "type": "customer",
        "id": "uuid1",
        "status": "success",
        "erpId": "123"
      },
      {
        "type": "invoice",
        "id": "uuid2",
        "status": "success",
        "erpId": "INV-001"
      },
      {
        "type": "payment",
        "id": "uuid3",
        "status": "success",
        "erpId": "PMT-001"
      }
    ]
  }
}
```

---

### POST /api/erp/sync/pending/:sucursalId

Sync all pending entities for a branch.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `sucursalId` (uuid) - Branch ID

**Response:**
```json
{
  "success": true,
  "result": {
    "total": 25,
    "successful": 23,
    "failed": 2,
    "errors": [
      {
        "type": "invoice",
        "id": "uuid1",
        "error": "Customer must be synced first"
      },
      {
        "type": "payment",
        "id": "uuid2",
        "error": "Invoice not found in ERP"
      }
    ]
  }
}
```

---

### GET /api/erp/sync/status/:sucursalId

Get sync status for a branch.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `sucursalId` (uuid) - Branch ID

**Response:**
```json
{
  "success": true,
  "status": {
    "connected": true,
    "syncEnabled": true,
    "lastSync": "2024-11-02T09:00:00.000Z",
    "stats": {
      "successful": 150,
      "failed": 3,
      "pending": 5
    },
    "pendingEntities": {
      "customers": 2,
      "invoices": 2,
      "payments": 1
    }
  }
}
```

---

### GET /api/erp/sync/logs/:sucursalId

Get sync logs for a branch.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `sucursalId` (uuid) - Branch ID

**Query Parameters:**
```
limit: number (default: 50)
offset: number (default: 0)
status: string (optional) - Filter by status (success, error, pending)
entityType: string (optional) - Filter by entity type (customer, invoice, payment)
```

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "uuid",
      "tipo_sincronizacion": "customer",
      "direccion": "to_erp",
      "entidad_tipo": "customer",
      "entidad_id": "uuid",
      "entidad_folio": "CUST-001",
      "status": "success",
      "started_at": "2024-11-02T09:00:00.000Z",
      "completed_at": "2024-11-02T09:00:01.250Z",
      "error_message": null,
      "erp_entity_id": "123"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 153
  }
}
```

---

## 🔌 Provider & Adapter Endpoints

### GET /api/erp/providers

List all supported ERP providers.

**Response:**
```json
{
  "success": true,
  "providers": [
    {
      "id": "quickbooks",
      "name": "QuickBooks Online",
      "regions": ["us", "mx", "ca", "gb"],
      "requiresOAuth": true
    },
    {
      "id": "xero",
      "name": "Xero",
      "regions": ["us", "ae", "global"],
      "requiresOAuth": true
    },
    {
      "id": "contpaqi",
      "name": "CONTPAQi",
      "regions": ["mx"],
      "requiresOAuth": false
    }
  ]
}
```

---

### GET /api/erp/adapters/:countryCode

List available ERP adapters for a specific country.

**URL Parameters:**
- `countryCode` (string) - ISO country code (US, MX, AE, ES, IL)

**Response:**
```json
{
  "success": true,
  "country": "US",
  "adapters": [
    {
      "id": "quickbooks",
      "name": "QuickBooks Online",
      "priority": "high",
      "cost_range": "$30-$200/month",
      "features": ["invoicing", "payments", "reports", "multi-currency"],
      "recommended": true
    },
    {
      "id": "xero",
      "name": "Xero",
      "priority": "medium",
      "cost_range": "$13-$70/month",
      "features": ["invoicing", "payments", "reports"],
      "recommended": false
    }
  ]
}
```

---

## 💱 Exchange Rate Endpoints

### GET /api/erp/exchange-rate/:from/:to

Get current exchange rate between two currencies.

**URL Parameters:**
- `from` (string) - Source currency code (USD, MXN, AED, EUR, ILS)
- `to` (string) - Destination currency code

**Query Parameters:**
```
date: string (optional) - Date in YYYY-MM-DD format (default: today)
```

**Response:**
```json
{
  "success": true,
  "from": "USD",
  "to": "MXN",
  "rate": 17.5,
  "date": "2024-11-02"
}
```

---

### POST /api/erp/convert-currency

Convert amount between currencies.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 1000,
  "from": "USD",
  "to": "MXN",
  "date": "2024-11-02"
}
```

**Response:**
```json
{
  "success": true,
  "conversion": {
    "originalAmount": 1000.00,
    "originalCurrency": "USD",
    "convertedAmount": 17500.00,
    "convertedCurrency": "MXN",
    "exchangeRate": 17.5,
    "date": "2024-11-02"
  }
}
```

---

### POST /api/erp/exchange-rates/update

Update exchange rates from external API (Admin only).

**Headers:**
```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "result": {
    "success": 7,
    "failed": 0,
    "errors": [],
    "updatedAt": "2024-11-02T10:00:00.000Z",
    "duration": 1250
  }
}
```

---

## ❤️ Health Check

### GET /api/erp/health

Check health status of ERP Hub service.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-11-02T10:00:00.000Z",
  "services": {
    "database": "connected",
    "erpHub": "operational"
  }
}
```

**Unhealthy Response (503):**
```json
{
  "success": false,
  "status": "unhealthy",
  "error": "Database connection failed"
}
```

---

## ⚠️ Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": { }
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Common Error Codes

```javascript
// Authentication Errors
AUTH_TOKEN_MISSING
AUTH_TOKEN_INVALID
AUTH_TOKEN_EXPIRED

// OAuth Errors
OAUTH_STATE_INVALID
OAUTH_CODE_EXCHANGE_FAILED
OAUTH_TOKEN_REFRESH_FAILED

// Configuration Errors
ERP_CONFIG_NOT_FOUND
ERP_PROVIDER_NOT_SUPPORTED
ERP_NOT_CONNECTED

// Sync Errors
SYNC_ENTITY_NOT_FOUND
SYNC_DEPENDENCY_MISSING
SYNC_ERP_ERROR
SYNC_RATE_LIMIT_EXCEEDED

// Exchange Rate Errors
EXCHANGE_RATE_NOT_FOUND
CURRENCY_NOT_SUPPORTED
EXCHANGE_RATE_API_ERROR
```

---

## 🚦 Rate Limiting

### Limits by Endpoint Type

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| OAuth | 10 requests | per minute |
| Configuration | 30 requests | per minute |
| Sync (single) | 100 requests | per minute |
| Sync (batch) | 10 requests | per minute |
| Providers | 60 requests | per minute |
| Exchange Rates | 60 requests | per minute |
| Health Check | Unlimited | N/A |

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699012800
```

### Rate Limit Exceeded Response (429)

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

---

## 📝 Request Examples

### Example 1: Complete OAuth Flow

```javascript
// Step 1: Initiate OAuth
const authResponse = await fetch('/api/erp/oauth/authorize', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sucursalId: 'abc-123',
    provider: 'quickbooks',
    redirectUri: 'https://your-app.com/oauth/callback'
  })
});

const { authorizationUrl, state } = await authResponse.json();

// Step 2: Redirect user to authorizationUrl
window.location.href = authorizationUrl;

// Step 3: Handle callback (on your redirect URI)
// QuickBooks will redirect to: https://your-app.com/oauth/callback?code=XXX&state=YYY&realmId=ZZZ
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');
const realmId = urlParams.get('realmId');

// Step 4: Exchange code for tokens (backend handles this automatically)
const callbackResponse = await fetch(`/api/erp/oauth/callback?code=${code}&state=${state}&realmId=${realmId}`);
const result = await callbackResponse.json();
// { success: true, message: "OAuth authentication successful", sucursalId: "abc-123" }
```

### Example 2: Sync Pending Entities

```javascript
// Sync all pending entities for a branch
const syncResponse = await fetch('/api/erp/sync/pending/abc-123', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

const syncResult = await syncResponse.json();
console.log(`Synced ${syncResult.result.successful} entities`);
console.log(`Failed: ${syncResult.result.failed}`);
```

### Example 3: Currency Conversion

```javascript
// Convert 1000 USD to MXN
const conversionResponse = await fetch('/api/erp/convert-currency', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: 1000,
    from: 'USD',
    to: 'MXN'
  })
});

const conversion = await conversionResponse.json();
console.log(`${conversion.conversion.originalAmount} ${conversion.conversion.originalCurrency} = ${conversion.conversion.convertedAmount} ${conversion.conversion.convertedCurrency}`);
// 1000.00 USD = 17500.00 MXN
```

---

## 🔒 Authentication

### Bearer Token Authentication

All authenticated endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Payload

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "admin",
  "sucursalId": "uuid",
  "exp": 1699012800
}
```

### Temporary Authentication Headers (Development)

For development/testing, the API currently accepts user information via headers:

```
X-User-Id: uuid
X-User-Role: admin
```

**Note**: This will be replaced with proper JWT authentication in production.

---

## 📊 Webhooks (Future)

Webhook support for real-time sync notifications (planned for Phase 2):

```
POST https://your-app.com/webhooks/erp-sync
Content-Type: application/json

{
  "event": "sync.completed",
  "timestamp": "2024-11-02T10:00:00.000Z",
  "sucursalId": "uuid",
  "entityType": "invoice",
  "entityId": "uuid",
  "status": "success",
  "erpEntityId": "INV-001"
}
```

---

## 🛠️ Development Tools

### Postman Collection

Import the Postman collection for easy API testing:
```
[Download Postman Collection](./postman_collection.json)
```

### OpenAPI/Swagger Specification

View interactive API documentation:
```
/api/docs
```

---

## 📞 Support

For API support and questions:
- **Email**: dev@spirittours.com
- **Documentation**: https://docs.spirittours.com/api
- **GitHub Issues**: https://github.com/spirittours/platform/issues

---

*API Documentation v1.0.0 - Last Updated: November 2, 2024*
