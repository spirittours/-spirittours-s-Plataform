# 📚 Training & Deployment Guide - ERP Integration System

**Version**: 1.0.0  
**Last Updated**: November 2, 2024  
**Target Audience**: Technical Team, System Administrators, Developers

---

## 📋 Table of Contents

1. [Training for Technical Team](#training-for-technical-team)
2. [Deployment Guide](#deployment-guide)
3. [Testing Guide](#testing-guide)
4. [Troubleshooting](#troubleshooting)
5. [Maintenance](#maintenance)

---

## 🎓 TRAINING FOR TECHNICAL TEAM

### Module 1: System Architecture Overview (1 hour)

#### What is the ERP Integration System?

The ERP Integration System is a flexible, multi-region accounting platform that:
- Connects Spirit Tours with 14+ ERP systems (QuickBooks, Xero, CONTPAQi, etc.)
- Supports 5 countries with automatic tax calculations
- Handles 7+ currencies with real-time conversion
- Provides bidirectional synchronization (Spirit Tours ↔ ERP)
- Zero vendor lock-in (switch ERPs anytime)

#### Key Components:

```
┌─────────────────────────────────────┐
│         Frontend (React)            │
│    [Pending - To be developed]      │
└────────────────┬────────────────────┘
                 │ REST API
┌────────────────▼────────────────────┐
│     REST API Layer (Express)        │
│     25+ endpoints                   │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│      ERP Hub Controller             │
│   Orchestrates all operations       │
└───┬────────────┬───────────┬────────┘
    │            │           │
    ▼            ▼           ▼
┌──────┐    ┌────────┐  ┌──────────┐
│ Sync │    │ OAuth  │  │   Tax    │
│ Orch │    │  Mgr   │  │   Calc   │
└──┬───┘    └────┬───┘  └──────────┘
   │             │
   └──────┬──────┘
          ▼
   ┌──────────────┐
   │  ERP Hub     │
   │  • Adapters  │
   │  • Factory   │
   │  • Models    │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │  PostgreSQL  │
   └──────────────┘
```

### Module 2: Database Schema (30 minutes)

#### New Tables Created:

1. **`configuracion_erp_sucursal`** - ERP configuration per branch
   - OAuth tokens (encrypted)
   - Sync settings
   - Connection status

2. **`tipos_cambio`** - Exchange rates
   - Historical rates
   - Multiple sources
   - Official rates for accounting

3. **`configuracion_fiscal_sucursal`** - Tax rules
   - Per jurisdiction
   - Customizable rates
   - Valid periods

4. **`log_sincronizacion_erp`** - Sync audit trail
   - All operations logged
   - Request/Response payloads
   - Error tracking

5. **`mapeo_erp_entidades`** - Entity mapping
   - Spirit Tours ID ↔ ERP ID
   - Bidirectional mapping
   - Sync version control

#### Key Queries:

```sql
-- Get ERP config for a branch
SELECT * FROM configuracion_erp_sucursal 
WHERE sucursal_id = 'uuid';

-- Get current exchange rate
SELECT tipo_cambio FROM tipos_cambio
WHERE moneda_origen = 'USD' 
AND moneda_destino = 'MXN'
AND fecha = CURRENT_DATE
AND es_oficial = true;

-- Get sync logs
SELECT * FROM log_sincronizacion_erp
WHERE sucursal_id = 'uuid'
AND status = 'error'
ORDER BY started_at DESC;
```

### Module 3: API Endpoints (1 hour)

#### Authentication

All endpoints (except callback) require Bearer token:
```
Authorization: Bearer <JWT_TOKEN>
```

#### Key Endpoints:

**OAuth Flow:**
```http
POST /api/erp/oauth/authorize
{
  "sucursalId": "uuid",
  "provider": "quickbooks",
  "redirectUri": "https://app.com/callback"
}

GET /api/erp/oauth/callback?code=xxx&state=yyy

POST /api/erp/oauth/disconnect
{
  "sucursalId": "uuid"
}
```

**Configuration:**
```http
GET /api/erp/config/:sucursalId

POST /api/erp/config/:sucursalId
{
  "erpProvider": "quickbooks",
  "erpRegion": "us",
  "syncEnabled": true,
  "syncFrequency": "hourly",
  "autoSyncInvoices": true,
  "autoSyncPayments": true,
  "autoSyncCustomers": true
}
```

**Sync Operations:**
```http
POST /api/erp/sync/customer/:customerId
{ "sucursalId": "uuid" }

POST /api/erp/sync/invoice/:cxcId
{ "sucursalId": "uuid" }

POST /api/erp/sync/payment/:pagoId
{ "sucursalId": "uuid" }

POST /api/erp/sync/batch
{
  "sucursalId": "uuid",
  "entities": [
    { "type": "customer", "id": "uuid1" },
    { "type": "invoice", "id": "uuid2" }
  ]
}

POST /api/erp/sync/pending/:sucursalId
```

**Monitoring:**
```http
GET /api/erp/sync/status/:sucursalId
GET /api/erp/sync/logs/:sucursalId?limit=50&status=error
GET /api/erp/health
```

### Module 4: OAuth 2.0 Flow (45 minutes)

#### Step-by-Step OAuth Process:

1. **Initiate OAuth:**
   ```javascript
   const response = await fetch('/api/erp/oauth/authorize', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer ' + token,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       sucursalId: 'abc-123',
       provider: 'quickbooks'
     })
   });
   
   const { authorizationUrl } = await response.json();
   ```

2. **Redirect User:**
   ```javascript
   window.location.href = authorizationUrl;
   ```

3. **Handle Callback:**
   QuickBooks redirects to: `your-app.com/callback?code=XXX&state=YYY&realmId=ZZZ`

4. **Exchange Code for Tokens:**
   This happens automatically on the callback endpoint.

5. **Store Tokens:**
   Tokens are automatically encrypted and stored in database.

#### Security Features:

- **AES-256-CBC Encryption** for tokens
- **PKCE** for Xero (Proof Key for Code Exchange)
- **State Validation** to prevent CSRF
- **Auto Token Refresh** before expiration

### Module 5: Sync Orchestrator (45 minutes)

#### How Sync Works:

1. **Get ERP Config** for branch
2. **Create Adapter** dynamically (Factory Pattern)
3. **Authenticate** with ERP
4. **Get Data** from Spirit Tours
5. **Check Mapping** (already synced?)
6. **Convert** to Unified Format
7. **Log Start** to database
8. **Sync to ERP**
9. **Save Mapping** (Spirit ID ↔ ERP ID)
10. **Mark as Synced** in Spirit Tours
11. **Log Result** (success/error)

#### Retry Logic:

- **Max Retries**: 3 attempts
- **Backoff**: Exponential (2s, 4s, 8s)
- **Errors Logged**: All attempts logged in database

#### Example Usage:

```javascript
const syncOrchestrator = new SyncOrchestrator(dbPool);

// Sync single customer
const result = await syncOrchestrator.syncCustomerToERP(
  'sucursal-uuid',
  'customer-uuid',
  { triggeredBy: 'manual', userId: 'user-uuid' }
);

// Sync batch
const batchResult = await syncOrchestrator.syncBatch(
  'sucursal-uuid',
  [
    { type: 'customer', id: 'uuid1' },
    { type: 'invoice', id: 'uuid2' }
  ]
);

// Sync all pending
const pendingResult = await syncOrchestrator.syncPendingEntities(
  'sucursal-uuid'
);
```

### Module 6: Tax Calculator (45 minutes)

#### Supported Countries:

| Country | Tax Type | Rate | Features |
|---------|----------|------|----------|
| USA | Sales Tax | State-dependent | 7 states configured |
| México | IVA | 16% standard, 8% border | Retention 10.67% |
| UAE | VAT | 5% | Zero-rated supported |
| España | IVA | 21%, 10%, 4% | Reduced rates |
| Israel | VAT | 17% | Standard |

#### Usage Examples:

```javascript
const taxCalculator = new TaxCalculatorService(dbPool);

// Calculate tax for single amount
const tax = await taxCalculator.calculateTax({
  sucursalId: 'uuid',
  countryCode: 'US',
  stateCode: 'FL',
  amount: 1000.00,
  serviceCategory: 'tours',
  includesTax: false
});
// Result: { subtotal: 1000, taxAmount: 60, totalAmount: 1060, breakdown: [...] }

// Calculate for entire invoice
const invoiceTax = await taxCalculator.calculateInvoiceTaxes({
  sucursalId: 'uuid',
  countryCode: 'MX',
  lineItems: [
    { amount: 1000, category: 'tours' },
    { amount: 500, category: 'transportation' }
  ]
});
```

---

## 🚀 DEPLOYMENT GUIDE

### Pre-Deployment Checklist

- [ ] PostgreSQL 13+ installed
- [ ] Node.js 18+ installed
- [ ] SSL certificates configured
- [ ] Environment variables set
- [ ] QuickBooks OAuth credentials obtained
- [ ] Database migrated
- [ ] Testing completed in sandbox

### Environment Variables

Create `.env` file:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/spirittours

# Server
PORT=3000
NODE_ENV=production

# OAuth Encryption Key (generate with: openssl rand -hex 32)
OAUTH_ENCRYPTION_KEY=your-64-character-hex-key

# QuickBooks Production
QB_CLIENT_ID=your-quickbooks-client-id
QB_CLIENT_SECRET=your-quickbooks-client-secret
QB_REDIRECT_URI=https://yourdomain.com/api/erp/oauth/callback

# QuickBooks Sandbox (for testing)
QB_SANDBOX_CLIENT_ID=sandbox-client-id
QB_SANDBOX_CLIENT_SECRET=sandbox-client-secret
QB_SANDBOX_REALM_ID=sandbox-realm-id
QB_SANDBOX_ACCESS_TOKEN=sandbox-access-token
QB_SANDBOX_REFRESH_TOKEN=sandbox-refresh-token

# Exchange Rate API
EXCHANGE_RATE_API_KEY=your-api-key-if-needed

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d
```

### Step 1: Database Setup

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE spirittours;

# Connect to database
\c spirittours

# Run migrations
\i backend/migrations/001_create_trips_tables.sql
\i backend/migrations/002_create_notifications_tables.sql
\i backend/migrations/003_create_whatsapp_tables.sql
\i backend/migrations/004_create_accounting_tables.sql
\i backend/migrations/005_multi_region_erp_integration.sql

# Verify tables
\dt

# Should see: sucursales, configuracion_erp_sucursal, tipos_cambio, etc.
```

### Step 2: Install Dependencies

```bash
cd /path/to/webapp
npm install

# Install production dependencies only
npm install --production
```

### Step 3: Run Tests

```bash
# Set test environment
export NODE_ENV=test
export TEST_DATABASE_URL=postgresql://user:pass@host:5432/spirittours_test

# Run tests
npm test

# Run specific test
npm test -- backend/tests/erp-hub/quickbooks-usa.test.js

# Run E2E tests
npm test -- backend/tests/e2e/erp-sync-flow.test.js
```

### Step 4: Start Server

```bash
# Production mode
NODE_ENV=production npm start

# With PM2 (recommended for production)
pm2 start ecosystem.config.js --env production

# Check status
pm2 status

# View logs
pm2 logs spirit-tours-api
```

### Step 5: Configure QuickBooks App

1. Go to https://developer.intuit.com
2. Create new app
3. Configure OAuth settings:
   - Redirect URI: `https://yourdomain.com/api/erp/oauth/callback`
   - Scopes: `com.intuit.quickbooks.accounting`
4. Get Client ID and Client Secret
5. Add to `.env` file

### Step 6: Test OAuth Flow

```bash
# Test OAuth initiation
curl -X POST https://yourdomain.com/api/erp/oauth/authorize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sucursalId": "uuid",
    "provider": "quickbooks"
  }'

# Should return authorizationUrl
```

### Step 7: Health Check

```bash
# Check API health
curl https://yourdomain.com/api/erp/health

# Should return:
# {
#   "success": true,
#   "status": "healthy",
#   "services": {
#     "database": "connected",
#     "erpHub": "operational"
#   }
# }
```

### Step 8: Setup Cron Jobs (Optional)

For automatic sync and exchange rate updates:

```bash
# Add to crontab
crontab -e

# Add these lines:
# Update exchange rates daily at 1 AM
0 1 * * * curl -X POST https://yourdomain.com/api/erp/exchange-rates/update

# Sync pending entities hourly
0 * * * * curl -X POST https://yourdomain.com/api/erp/sync/pending/SUCURSAL_UUID

# Clean expired OAuth states every hour
0 * * * * curl https://yourdomain.com/api/erp/oauth/cleanup
```

### Nginx Configuration (if using reverse proxy)

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running sync operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

## 🧪 TESTING GUIDE

### Unit Tests

```bash
# Run all unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- quickbooks-usa.test.js

# Watch mode (auto-rerun on changes)
npm test -- --watch
```

### Integration Tests with Sandbox

1. Configure sandbox credentials in `.env`
2. Run integration tests:

```bash
npm test -- backend/tests/erp-hub/quickbooks-usa.test.js
```

3. Verify results:
   - Customer created ✅
   - Invoice created ✅
   - Payment created ✅
   - All synced to QuickBooks Sandbox

### E2E Testing

```bash
# Full E2E flow
npm test -- backend/tests/e2e/erp-sync-flow.test.js

# This tests:
# 1. Create customer in Spirit Tours
# 2. Sync to QuickBooks
# 3. Create invoice
# 4. Sync invoice
# 5. Create payment
# 6. Sync payment
# 7. Verify all mappings
# 8. Verify logs
```

### Manual Testing with Postman

Import collection: `postman_collection.json`

Test sequence:
1. POST /oauth/authorize
2. Follow authorization URL
3. Complete OAuth in browser
4. POST /sync/customer/:id
5. POST /sync/invoice/:id
6. POST /sync/payment/:id
7. GET /sync/status/:sucursalId

---

## 🔧 TROUBLESHOOTING

### Common Issues

**Issue**: OAuth authentication fails
```
Error: Invalid or expired OAuth state
```
**Solution**: States expire after 10 minutes. Regenerate authorization URL.

**Issue**: Token expired
```
Error: 401 Unauthorized
```
**Solution**: System should auto-refresh. Check refresh token in database.

**Issue**: Sync fails with "Customer not found"
```
Error: Customer must be synced before syncing invoice
```
**Solution**: Always sync customer before invoice. Check entity dependencies.

**Issue**: Rate limit exceeded
```
Error: 429 Too Many Requests
```
**Solution**: Reduce sync frequency. QuickBooks limit: 500 req/min.

### Debug Mode

Enable debug logging:

```bash
DEBUG=erp-hub:* npm start
```

### Check Logs

```sql
-- Recent sync errors
SELECT * FROM log_sincronizacion_erp 
WHERE status = 'error'
ORDER BY started_at DESC
LIMIT 50;

-- Failed syncs by entity type
SELECT entidad_tipo, COUNT(*) 
FROM log_sincronizacion_erp 
WHERE status = 'error'
GROUP BY entidad_tipo;

-- Sync performance (avg duration)
SELECT 
  entidad_tipo,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_seconds
FROM log_sincronizacion_erp
WHERE status = 'success'
GROUP BY entidad_tipo;
```

---

## 🔄 MAINTENANCE

### Daily Tasks

- [ ] Check sync status for all branches
- [ ] Review error logs
- [ ] Verify exchange rates updated
- [ ] Monitor API response times

### Weekly Tasks

- [ ] Review sync statistics
- [ ] Check token expiration dates
- [ ] Verify database backups
- [ ] Update exchange rate sources if needed

### Monthly Tasks

- [ ] Review and clean old logs (keep 90 days)
- [ ] Audit ERP mappings for inconsistencies
- [ ] Performance optimization review
- [ ] Security audit of OAuth tokens

### Database Maintenance

```sql
-- Clean old sync logs (keep 90 days)
DELETE FROM log_sincronizacion_erp
WHERE started_at < NOW() - INTERVAL '90 days';

-- Clean old exchange rates (keep 1 year)
DELETE FROM tipos_cambio
WHERE fecha < CURRENT_DATE - INTERVAL '1 year';

-- Vacuum tables
VACUUM ANALYZE log_sincronizacion_erp;
VACUUM ANALYZE tipos_cambio;
```

---

## 📞 SUPPORT

**Technical Support**: dev@spirittours.com  
**Documentation**: https://docs.spirittours.com  
**GitHub Issues**: https://github.com/spirittours/platform/issues

---

*Training & Deployment Guide v1.0.0 - Last Updated: November 2, 2024*
