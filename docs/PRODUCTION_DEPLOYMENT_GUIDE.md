# 🚀 Spirit Tours - ERP Hub Production Deployment Guide

**Version:** 1.0.0  
**Last Updated:** November 2, 2025  
**Authors:** Spirit Tours Dev Team - GenSpark AI Developer  
**Status:** Production Ready  

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [USA Deployment](#usa-deployment)
4. [México Deployment](#méxico-deployment)
5. [Post-Deployment](#post-deployment)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Appendices](#appendices)

---

## Overview

Este documento describe el proceso completo de deployment del ERP Hub a producción para las operaciones de Spirit Tours en USA y México.

### Deployment Strategy

**Gradual Rollout (Blue-Green + Canary)**

```
Phase 1: Deployment a staging
├─> Deploy code to staging environment
├─> Run automated tests
├─> Manual QA testing
└─> Approval required

Phase 2: Canary deployment (10%)
├─> Deploy to 10% of prod instances
├─> Monitor for 48 hours
├─> Rollback if error rate > 5%
└─> Approval required

Phase 3: Gradual increase (50%)
├─> Deploy to 50% of prod instances
├─> Monitor for 24 hours
├─> Rollback if error rate > 3%
└─> Approval required

Phase 4: Full deployment (100%)
├─> Deploy to 100% of prod instances
├─> Monitor for 7 days
└─> Post-deployment review
```

### Architecture Overview

```
                    ┌──────────────┐
                    │   Internet   │
                    └───────┬──────┘
                            │
                    ┌───────▼──────┐
                    │ Load Balancer│
                    │   (Nginx)    │
                    └───────┬──────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
    ┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
    │ Web Server 1 │ │Web Server 2│ │Web Server 3│
    │  (Node.js)   │ │ (Node.js)  │ │ (Node.js)  │
    └───────┬──────┘ └─────┬──────┘ └─────┬──────┘
            │               │               │
            └───────────────┼───────────────┘
                            │
                    ┌───────▼──────┐
                    │  PostgreSQL  │
                    │   (Primary)  │
                    └───────┬──────┘
                            │
                    ┌───────▼──────┐
                    │  PostgreSQL  │
                    │  (Replica)   │
                    └──────────────┘

    External Services:
    ├─> Redis (Queue & Cache)
    ├─> CloudWatch (Logs & Metrics)
    ├─> S3 (Backups)
    └─> ERPs (QuickBooks, Xero, etc.)
```

---

## Pre-Deployment Checklist

### 1. Infrastructure Requirements

#### Compute Resources

```yaml
Production Environment:
  Web Servers:
    - Count: 3 (minimum)
    - Type: AWS EC2 t3.large or equivalent
    - CPU: 2 vCPUs per instance
    - RAM: 8 GB per instance
    - Storage: 50 GB SSD per instance
    - Auto-scaling: Min 3, Max 10
  
  Worker Servers (Background Jobs):
    - Count: 2 (minimum)
    - Type: AWS EC2 t3.medium
    - CPU: 2 vCPUs per instance
    - RAM: 4 GB per instance
    - Storage: 20 GB SSD per instance
    - Auto-scaling: Min 2, Max 6
  
  Database:
    - Type: AWS RDS PostgreSQL 14.x
    - Instance: db.t3.xlarge
    - CPU: 4 vCPUs
    - RAM: 16 GB
    - Storage: 500 GB SSD (gp3)
    - Multi-AZ: Yes (High Availability)
    - Backup: Automated daily, retention 30 days
  
  Cache/Queue:
    - Type: AWS ElastiCache Redis 6.x
    - Instance: cache.t3.medium
    - CPU: 2 vCPUs
    - RAM: 3.09 GB
    - Cluster Mode: Enabled
    - Replicas: 2 read replicas
```

#### Network Requirements

```yaml
Networking:
  VPC:
    - CIDR: 10.0.0.0/16
    - Subnets:
        - Public: 10.0.1.0/24, 10.0.2.0/24 (Web tier)
        - Private: 10.0.10.0/24, 10.0.11.0/24 (App tier)
        - Database: 10.0.20.0/24, 10.0.21.0/24 (Data tier)
    - NAT Gateway: 2 (one per AZ)
    - Internet Gateway: 1
  
  Security Groups:
    Web-SG:
      Inbound:
        - Port 443 (HTTPS): 0.0.0.0/0
        - Port 80 (HTTP): 0.0.0.0/0 (redirect to 443)
      Outbound:
        - All traffic
    
    App-SG:
      Inbound:
        - Port 3000 (Node.js): From Web-SG only
        - Port 22 (SSH): From Bastion SG only
      Outbound:
        - All traffic
    
    DB-SG:
      Inbound:
        - Port 5432 (PostgreSQL): From App-SG only
      Outbound:
        - None
    
    Redis-SG:
      Inbound:
        - Port 6379: From App-SG only
      Outbound:
        - None
  
  SSL/TLS:
    - Certificate: AWS Certificate Manager
    - Domain: erp-hub.spirittours.com
    - Wildcard: *.spirittours.com
```

### 2. Software Requirements

```bash
# Node.js
Node.js: v18.x LTS or v20.x LTS
npm: v9.x or later

# PostgreSQL
PostgreSQL: 14.x or 15.x
Extensions: uuid-ossp, pgcrypto, pg_trgm

# Redis
Redis: 6.x or 7.x

# System packages
sudo apt-get install -y \
    build-essential \
    git \
    curl \
    nginx \
    certbot \
    python3-certbot-nginx \
    pm2 \
    logrotate
```

### 3. ERP Credentials (Production)

#### USA ERPs

**QuickBooks Online USA:**
```bash
# Obtener en: https://developer.intuit.com/app/developer/qbo/docs/get-started
QB_USA_CLIENT_ID=<from_intuit_dev_console>
QB_USA_CLIENT_SECRET=<from_intuit_dev_console>
QB_USA_REDIRECT_URI=https://erp-hub.spirittours.com/oauth/quickbooks/callback
QB_USA_ENVIRONMENT=production
QB_USA_API_VERSION=v3
QB_USA_MINOR_VERSION=65
```

**Xero USA:**
```bash
# Obtener en: https://developer.xero.com/app/manage
XERO_USA_CLIENT_ID=<from_xero_dev_console>
XERO_USA_CLIENT_SECRET=<from_xero_dev_console>
XERO_USA_REDIRECT_URI=https://erp-hub.spirittours.com/oauth/xero/callback
XERO_USA_SCOPE=accounting.transactions accounting.contacts accounting.settings offline_access
```

**FreshBooks:**
```bash
# Obtener en: https://my.freshbooks.com/#/developer
FRESHBOOKS_CLIENT_ID=<from_freshbooks>
FRESHBOOKS_CLIENT_SECRET=<from_freshbooks>
FRESHBOOKS_REDIRECT_URI=https://erp-hub.spirittours.com/oauth/freshbooks/callback
```

#### México ERPs

**CONTPAQi:**
```bash
# Contactar a CONTPAQi para obtener credenciales de producción
CONTPAQI_API_KEY=<from_contpaqi>
CONTPAQI_LICENSE_KEY=<empresa_license_key>
CONTPAQI_API_ENDPOINT=https://api.contpaqi.com/v1
CONTPAQI_ENVIRONMENT=production
```

**QuickBooks México:**
```bash
# Mismo proceso que QuickBooks USA
QB_MX_CLIENT_ID=<from_intuit_dev_console>
QB_MX_CLIENT_SECRET=<from_intuit_dev_console>
QB_MX_REDIRECT_URI=https://erp-hub.spirittours.com/oauth/quickbooks-mx/callback
QB_MX_ENVIRONMENT=production
```

**Alegra México:**
```bash
# Obtener en: https://app.alegra.com/user/developer-apps
ALEGRA_USERNAME=<empresa_email>
ALEGRA_API_TOKEN=<from_alegra_settings>
ALEGRA_API_ENDPOINT=https://api.alegra.com/api/v1
```

### 4. CFDI 4.0 Credentials (México Only)

#### CSD Certificates

**Obtener CSD del SAT:**
```bash
# 1. Solicitar CSD en el portal del SAT
# https://www.sat.gob.mx/tramites/28114/obten-tu-certificado-de-sello-digital

# 2. Descargar archivos:
#    - certificado.cer (certificado público)
#    - clave_privada.key (clave privada)
#    - contraseña de la clave privada

# 3. Convertir a formato PEM
openssl x509 -inform DER -in certificado.cer -out certificado.pem
openssl pkcs8 -inform DER -in clave_privada.key -out clave_privada.pem

# 4. Guardar en secrets manager
CSD_CERTIFICATE_PATH=/secrets/cfdi/certificado.pem
CSD_PRIVATE_KEY_PATH=/secrets/cfdi/clave_privada.pem
CSD_PRIVATE_KEY_PASSWORD=<contraseña_proporcionada_por_sat>
```

#### PAC Provider (Finkok Recommended)

**Configurar PAC para timbrado:**
```bash
# Contratar servicio en: https://www.finkok.com/

PAC_PROVIDER=finkok  # opciones: finkok, sw, diverza
PAC_USERNAME=<username_finkok>
PAC_PASSWORD=<password_finkok>
PAC_ENDPOINT=https://facturacion.finkok.com/servicios/soap/stamp
PAC_ENVIRONMENT=production

# Configuración de respaldo (segundo PAC)
PAC_BACKUP_PROVIDER=sw
PAC_BACKUP_USERNAME=<username_sw>
PAC_BACKUP_PASSWORD=<password_sw>
PAC_BACKUP_ENDPOINT=https://services.sw.com.mx/cfdi/stamp
```

### 5. Environment Variables

**Create `.env.production` file:**

```bash
# =============================================================================
# SPIRIT TOURS - ERP HUB - PRODUCTION ENVIRONMENT
# =============================================================================

# Node Environment
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://erp_hub_user:secure_password@prod-db.spirittours.com:5432/erp_hub_prod
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_SSL=true

# Redis (Queue & Cache)
REDIS_URL=redis://prod-redis.spirittours.com:6379
REDIS_PASSWORD=secure_redis_password
REDIS_TLS=true

# Session & Security
SESSION_SECRET=<generate_with_crypto.randomBytes(64).toString('hex')>
JWT_SECRET=<generate_with_crypto.randomBytes(64).toString('hex')>
ENCRYPTION_KEY=<generate_with_crypto.randomBytes(32).toString('hex')>
CORS_ORIGIN=https://spirittours.com,https://www.spirittours.com

# Spirit Tours API
SPIRIT_TOURS_API_URL=https://api.spirittours.com
SPIRIT_TOURS_API_KEY=<spirit_tours_api_key>

# AWS (for backups, logs, etc.)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<aws_access_key>
AWS_SECRET_ACCESS_KEY=<aws_secret_key>
S3_BACKUP_BUCKET=spirit-tours-erp-hub-backups
S3_LOGS_BUCKET=spirit-tours-erp-hub-logs

# Monitoring & Alerts
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
DATADOG_API_KEY=<datadog_api_key>
DATADOG_APP_KEY=<datadog_app_key>

# Email (for alerts)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid_api_key>
ALERT_EMAIL=ops@spirittours.com

# Slack (for alerts)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/<T>/<B>/<secret>
SLACK_CHANNEL=#erp-hub-prod-alerts

# ==================== USA ERPs ====================

# QuickBooks USA
QB_USA_CLIENT_ID=<production_client_id>
QB_USA_CLIENT_SECRET=<production_client_secret>
QB_USA_REDIRECT_URI=https://erp-hub.spirittours.com/oauth/quickbooks/callback
QB_USA_ENVIRONMENT=production
QB_USA_API_VERSION=v3
QB_USA_MINOR_VERSION=65

# Xero USA
XERO_USA_CLIENT_ID=<production_client_id>
XERO_USA_CLIENT_SECRET=<production_client_secret>
XERO_USA_REDIRECT_URI=https://erp-hub.spirittours.com/oauth/xero/callback

# FreshBooks
FRESHBOOKS_CLIENT_ID=<production_client_id>
FRESHBOOKS_CLIENT_SECRET=<production_client_secret>
FRESHBOOKS_REDIRECT_URI=https://erp-hub.spirittours.com/oauth/freshbooks/callback

# ==================== MÉXICO ERPs ====================

# CONTPAQi
CONTPAQI_API_KEY=<production_api_key>
CONTPAQI_LICENSE_KEY=<license_key>
CONTPAQI_API_ENDPOINT=https://api.contpaqi.com/v1
CONTPAQI_ENVIRONMENT=production

# QuickBooks México
QB_MX_CLIENT_ID=<production_client_id>
QB_MX_CLIENT_SECRET=<production_client_secret>
QB_MX_REDIRECT_URI=https://erp-hub.spirittours.com/oauth/quickbooks-mx/callback
QB_MX_ENVIRONMENT=production

# Alegra México
ALEGRA_USERNAME=<empresa_email>
ALEGRA_API_TOKEN=<production_token>
ALEGRA_API_ENDPOINT=https://api.alegra.com/api/v1

# ==================== CFDI 4.0 (México) ====================

# CSD Certificates
CSD_CERTIFICATE_PATH=/secrets/cfdi/certificado.pem
CSD_PRIVATE_KEY_PATH=/secrets/cfdi/clave_privada.pem
CSD_PRIVATE_KEY_PASSWORD=<contraseña_csd>

# SAT Configuration
SAT_RFC=AAA010101AAA  # RFC de Spirit Tours México
SAT_NOMBRE=SPIRIT TOURS MEXICO SA DE CV
SAT_REGIMEN_FISCAL=601  # General de Ley Personas Morales

# PAC Provider
PAC_PROVIDER=finkok
PAC_USERNAME=<finkok_username>
PAC_PASSWORD=<finkok_password>
PAC_ENDPOINT=https://facturacion.finkok.com/servicios/soap/stamp
PAC_ENVIRONMENT=production

# PAC Backup
PAC_BACKUP_PROVIDER=sw
PAC_BACKUP_USERNAME=<sw_username>
PAC_BACKUP_PASSWORD=<sw_password>
PAC_BACKUP_ENDPOINT=https://services.sw.com.mx/cfdi/stamp

# CFDI Configuration
CFDI_ENABLE=true
CFDI_SERIE=A  # Serie de facturas
CFDI_AUTO_STAMP=true  # Timbrar automáticamente al crear invoice
CFDI_BACKUP_PATH=/backups/cfdi/xml

# ==================== Feature Flags ====================

FEATURE_AUTO_SYNC=true
FEATURE_BATCH_SYNC=true
FEATURE_MULTI_ERP=true
FEATURE_CFDI_MEXICO=true
FEATURE_REAL_TIME_NOTIFICATIONS=true

# ==================== Performance Tuning ====================

# Sync Configuration
SYNC_MAX_RETRIES=5
SYNC_RETRY_DELAY_MS=5000
SYNC_BATCH_SIZE=10
SYNC_CONCURRENT_LIMIT=50

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Queue Configuration
QUEUE_CONCURRENCY=10
QUEUE_MAX_STALLED_COUNT=3
QUEUE_STALLED_INTERVAL_MS=30000

# =============================================================================
# END OF CONFIGURATION
# =============================================================================
```

### 6. Pre-Deployment Tests

**Run full test suite:**

```bash
# 1. Unit tests
npm test -- --coverage

# Expected: All tests pass, coverage > 80%

# 2. Integration tests
npm run test:integration

# Expected: All adapters connect successfully

# 3. E2E tests
npm run test:e2e

# Expected: Full sync workflow completes successfully

# 4. Load tests
npm run test:load

# Expected: 
# - 100 concurrent users
# - Response time < 2 seconds (p95)
# - Error rate < 1%

# 5. Security audit
npm audit --production
npm audit fix

# Expected: 0 critical vulnerabilities

# 6. Performance profiling
npm run profile

# Expected:
# - Memory usage < 1 GB per process
# - CPU usage < 50% under normal load
```

---

## USA Deployment

### Step 1: Database Setup (30 minutes)

```bash
# 1. Connect to production database
psql -h prod-db.spirittours.com -U erp_hub_admin -d postgres

# 2. Create production database
CREATE DATABASE erp_hub_prod;
\c erp_hub_prod

# 3. Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

# 4. Create application user
CREATE USER erp_hub_user WITH PASSWORD 'secure_password_here';

# 5. Grant permissions
GRANT CONNECT ON DATABASE erp_hub_prod TO erp_hub_user;
GRANT USAGE ON SCHEMA public TO erp_hub_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO erp_hub_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO erp_hub_user;

# 6. Run migrations
cd /home/user/webapp
npm run migrate:prod

# Expected output:
# ✓ Migration 001_initial_schema.sql - SUCCESS
# ✓ Migration 002_erp_configs.sql - SUCCESS
# ✓ Migration 003_entity_mappings.sql - SUCCESS
# ✓ Migration 004_sync_logs.sql - SUCCESS
# ✓ Migration 005_account_mappings.sql - SUCCESS
# ✓ All migrations completed successfully

# 7. Verify schema
\dt
# Expected: 15+ tables created

# 8. Create indexes for performance
CREATE INDEX idx_erp_sync_logs_created_at ON erp_sync_logs(created_at DESC);
CREATE INDEX idx_erp_sync_logs_status ON erp_sync_logs(status);
CREATE INDEX idx_erp_sync_logs_provider ON erp_sync_logs(erp_provider);
CREATE INDEX idx_entity_mappings_spirit_id ON erp_entity_mappings(spirit_tours_entity_id);
CREATE INDEX idx_entity_mappings_erp_id ON erp_entity_mappings(erp_entity_id);

# 9. Backup database
pg_dump -h prod-db.spirittours.com -U erp_hub_admin erp_hub_prod > backup_$(date +%Y%m%d).sql

# 10. Upload to S3
aws s3 cp backup_$(date +%Y%m%d).sql s3://spirit-tours-erp-hub-backups/pre-deployment/
```

### Step 2: Application Deployment (45 minutes)

```bash
# 1. Clone repository to production servers
ssh user@web-server-1.spirittours.com
git clone https://github.com/spirittours/erp-hub.git /var/www/erp-hub
cd /var/www/erp-hub

# 2. Checkout production branch
git checkout main
git pull origin main

# 3. Install dependencies (production only)
NODE_ENV=production npm ci --only=production

# Expected: ~200 packages installed

# 4. Build frontend
cd frontend
NODE_ENV=production npm run build

# Expected output:
# Creating an optimized production build...
# Compiled successfully.
# File sizes after gzip:
#   125 KB  build/static/js/main.abc123.js
#   45 KB   build/static/css/main.xyz789.css

# 5. Copy environment file
cp /secrets/.env.production /var/www/erp-hub/.env

# 6. Verify environment variables
node -e "require('dotenv').config(); console.log('DB:', process.env.DATABASE_URL ? 'OK' : 'MISSING');"

# Expected: DB: OK

# 7. Test connection to database
npm run db:test

# Expected: Database connection successful

# 8. Test connection to Redis
npm run redis:test

# Expected: Redis connection successful

# 9. Start application with PM2
pm2 start ecosystem.config.js --env production

# Expected output:
# ┌─────┬────────────────┬─────────┬───────┬────────┬──────────┐
# │ id  │ name           │ mode    │ ↺     │ status │ cpu      │
# ├─────┼────────────────┼─────────┼───────┼────────┼──────────┤
# │ 0   │ erp-hub-web    │ cluster │ 0     │ online │ 0%       │
# │ 1   │ erp-hub-worker │ fork    │ 0     │ online │ 0%       │
# └─────┴────────────────┴─────────┴───────┴────────┴──────────┘

# 10. Save PM2 configuration
pm2 save
pm2 startup

# 11. Verify application is running
curl http://localhost:3000/health

# Expected: {"status":"ok","timestamp":"2025-11-02T10:00:00.000Z"}

# 12. Repeat steps 1-11 on web-server-2 and web-server-3
```

### Step 3: Load Balancer Configuration (15 minutes)

```nginx
# /etc/nginx/sites-available/erp-hub.spirittours.com

upstream erp_hub_backend {
    least_conn;  # Load balancing method
    server web-server-1.spirittours.com:3000 max_fails=3 fail_timeout=30s;
    server web-server-2.spirittours.com:3000 max_fails=3 fail_timeout=30s;
    server web-server-3.spirittours.com:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name erp-hub.spirittours.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name erp-hub.spirittours.com;

    # SSL Certificate (AWS Certificate Manager via ALB or Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/erp-hub.spirittours.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp-hub.spirittours.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/erp-hub-access.log combined;
    error_log /var/log/nginx/erp-hub-error.log warn;

    # Client body size (for file uploads)
    client_max_body_size 10M;

    # Proxy settings
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Health check endpoint (doesn't go through backend)
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://erp_hub_backend;
    }

    # OAuth callbacks
    location /oauth/ {
        proxy_pass http://erp_hub_backend;
    }

    # Admin panel (React app)
    location / {
        root /var/www/erp-hub/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

**Apply configuration:**

```bash
# Test configuration
sudo nginx -t

# Expected: nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload nginx
sudo systemctl reload nginx

# Verify
curl -I https://erp-hub.spirittours.com

# Expected: HTTP/2 200
```

### Step 4: Connect USA ERPs (1 hour)

**Connect QuickBooks USA:**

```bash
# 1. Access admin panel
https://erp-hub.spirittours.com/admin

# 2. Login with admin credentials

# 3. Navigate to: Connections → Add New Connection

# 4. Select: QuickBooks Online USA

# 5. Fill configuration:
Sucursal ID: USA_MIAMI_001
Company Name: Spirit Tours Miami
Environment: Production

# 6. Click: "Authorize with QuickBooks"

# 7. OAuth flow:
- Login with QuickBooks credentials
- Select company: Spirit Tours Miami LLC
- Review permissions:
  ✓ Read/Write Customers
  ✓ Read/Write Invoices
  ✓ Read/Write Payments
  ✓ Read Chart of Accounts
- Click: "Connect"

# 8. Configure account mappings:
Income Account: 400 - Sales - Tourism Services
AR Account: 120 - Accounts Receivable
Payment Account: 101 - Undeposited Funds
COGS Account: 500 - Cost of Sales
Tax Item: FL Sales Tax (8%)

# 9. Click: "Save Configuration"

# 10. Test connection:
- Click: "Test Connection"
- Expected: "✓ Connected successfully" (green status)

# 11. Test sync:
- Create a test customer in Spirit Tours
- Verify sync in: Monitoring → Sync Monitor
- Expected: "✓ Customer synced to QuickBooks (ID: 42)"
- Verify in QuickBooks Online: Customers → Search "Test Customer"
```

**Repeat for Xero USA and FreshBooks** (similar process)

### Step 5: Canary Deployment (2 days monitoring)

```bash
# 1. Enable canary mode (10% traffic)
# Update load balancer to send 10% traffic to new servers

# For AWS ALB:
aws elbv2 modify-target-group-attributes \
    --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/erp-hub/abc123 \
    --attributes Key=deregistration_delay.timeout_seconds,Value=30

# 2. Monitor dashboards
- CloudWatch Dashboard: erp-hub-production
- Datadog Dashboard: erp-hub-metrics
- Sentry: Error tracking

# 3. Key metrics to watch (48 hours):
✓ Sync success rate > 95%
✓ Average response time < 2 seconds
✓ Error rate < 1%
✓ CPU usage < 70%
✓ Memory usage < 80%
✓ No token expiration issues

# 4. If metrics are good after 48 hours:
→ Proceed to Step 6 (50% rollout)

# 5. If metrics show issues:
→ Proceed to Rollback section
```

### Step 6: Gradual Rollout to 100% (1 week)

```bash
# Day 3: Increase to 50%
# Update load balancer

# Monitor for 24 hours

# Day 4: Increase to 75%
# Update load balancer

# Monitor for 24 hours

# Day 5: Increase to 100%
# Update load balancer

# Monitor for 7 days

# Day 12: Mark deployment as stable
# Remove canary configuration
# Update documentation
```

---

## México Deployment

### Step 1: CSD Certificate Setup (1 hour)

```bash
# 1. Upload CSD certificates to secrets manager
aws secretsmanager create-secret \
    --name spirit-tours-mx-csd-certificate \
    --description "CSD Certificate for CFDI 4.0" \
    --secret-binary fileb://certificado.pem

aws secretsmanager create-secret \
    --name spirit-tours-mx-csd-private-key \
    --description "CSD Private Key for CFDI 4.0" \
    --secret-binary fileb://clave_privada.pem

aws secretsmanager create-secret \
    --name spirit-tours-mx-csd-password \
    --description "CSD Private Key Password" \
    --secret-string "contraseña_csd"

# 2. Grant application access to secrets
# Update IAM role with secretsmanager:GetSecretValue permission

# 3. Test certificate loading
node scripts/test-csd-certificate.js

# Expected: Certificate loaded successfully, valid until 2027-11-02

# 4. Verify RFC and Company Info
node -e "
require('dotenv').config();
console.log('RFC:', process.env.SAT_RFC);
console.log('Nombre:', process.env.SAT_NOMBRE);
console.log('Régimen:', process.env.SAT_REGIMEN_FISCAL);
"

# Expected:
# RFC: AAA010101AAA
# Nombre: SPIRIT TOURS MEXICO SA DE CV
# Régimen: 601
```

### Step 2: PAC Provider Configuration (30 minutes)

```bash
# 1. Test Finkok connection
node scripts/test-pac-connection.js --provider=finkok

# Expected: 
# ✓ Connection successful
# ✓ Authentication OK
# ✓ Timbres disponibles: 5000

# 2. Test backup PAC (SW)
node scripts/test-pac-connection.js --provider=sw

# Expected:
# ✓ Connection successful
# ✓ Authentication OK
# ✓ Timbres disponibles: 3000

# 3. Test CFDI generation
node scripts/test-cfdi-generation.js

# Expected:
# ✓ XML generated successfully
# ✓ Signature validated
# ✓ Timbrado successful
# ✓ UUID: 12345678-1234-1234-1234-123456789012
```

### Step 3: México ERPs Connection (1 hour)

**Connect CONTPAQi:**

```bash
# 1. Admin Panel → Connections → Add CONTPAQi

# 2. Configuration:
Sucursal ID: MX_CDMX_001
Company Database: SPIRIT_TOURS_MEXICO
License Key: [from CONTPAQi]
API Key: [from CONTPAQi]
User ID: admin_spirittours
Password: [secure_password]

# 3. Enable CFDI:
✓ Enable CFDI Generation
✓ Auto-stamp on invoice creation
CFDI Serie: A
Initial Folio: 1

# 4. Configure PAC:
Primary PAC: Finkok
Backup PAC: SW

# 5. Test connection:
- Click: "Test Connection"
- Expected: "✓ Connected to CONTPAQi Successfully"
- Expected: "✓ CSD Certificate Valid"
- Expected: "✓ PAC Connection OK"

# 6. Test CFDI:
- Create test invoice in Spirit Tours
- Verify CFDI generation:
  ✓ XML created
  ✓ Signed with CSD
  ✓ Stamped by PAC
  ✓ UUID generated
  ✓ QR Code generated
  ✓ PDF created

# 7. Validate CFDI in SAT portal:
- Go to: https://verificacfdi.facturaelectronica.sat.gob.mx/
- Enter:
  RFC Emisor: AAA010101AAA
  RFC Receptor: [customer_rfc]
  Total: [invoice_total]
  UUID: [generated_uuid]
- Click: "Verificar"
- Expected: "Comprobante verificado exitosamente"
```

**Repeat for QuickBooks México and Alegra**

### Step 4: CFDI Integration Testing (2 hours)

```bash
# Test Scenarios:

# 1. Basic Invoice (Ingreso)
✓ Create invoice with single line item
✓ Verify XML structure (CFDI 4.0)
✓ Verify tax calculations (IVA 16%)
✓ Verify timbrado
✓ Verify UUID format
✓ Verify QR code generation

# 2. Invoice with Multiple Items
✓ Create invoice with 5 line items
✓ Verify each item has correct tax
✓ Verify subtotal calculation
✓ Verify total calculation

# 3. Invoice with Retenciones
✓ Create invoice with IVA retenido (10.67%)
✓ Create invoice with ISR retenido (10%)
✓ Verify retenciones in XML
✓ Verify net amount calculation

# 4. Payment Supplement (Complemento de Pago)
✓ Create invoice with metodoPago=PPD
✓ Create partial payment
✓ Verify payment supplement CFDI generated
✓ Verify relationship with original invoice

# 5. Credit Memo (Nota de Crédito)
✓ Create refund for paid invoice
✓ Verify nota de crédito CFDI
✓ Verify relationship with original invoice
✓ Verify reason code (motivo)

# 6. Cancellation
✓ Cancel a CFDI
✓ Verify cancellation request to PAC
✓ Verify cancellation UUID
✓ Verify status update in ERP

# 7. Different CFDI Uses
✓ G01 - Adquisición de mercancías
✓ G03 - Gastos en general
✓ P01 - Por definir

# 8. Different Payment Methods
✓ PUE - Pago en una sola exhibición
✓ PPD - Pago en parcialidades o diferido

# 9. Different Payment Forms
✓ 01 - Efectivo
✓ 03 - Transferencia electrónica
✓ 04 - Tarjeta de crédito
✓ 28 - Tarjeta de débito
✓ 99 - Por definir

# All tests should pass before proceeding to canary deployment
```

### Step 5: México Canary Deployment

Follow same process as USA Step 5 (Canary Deployment)

---

## Post-Deployment

### 1. Verification Checklist

```bash
# Infrastructure
□ All servers are running
□ Load balancer is healthy
□ Database is accessible
□ Redis is accessible
□ SSL certificates are valid

# Application
□ All services started successfully
□ Health check endpoint returns 200
□ Admin panel loads
□ API endpoints respond

# USA ERPs
□ QuickBooks USA connected
□ Xero USA connected
□ FreshBooks connected
□ Test sync successful for each ERP

# México ERPs
□ CONTPAQi connected
□ QuickBooks México connected
□ Alegra connected
□ CSD certificates loaded
□ PAC connection working
□ Test CFDI generated successfully

# Monitoring
□ CloudWatch alarms configured
□ Datadog dashboard showing metrics
□ Sentry receiving error reports
□ Slack alerts working
□ Email alerts working

# Performance
□ Response times < 2 seconds (p95)
□ Sync success rate > 95%
□ Error rate < 1%
□ CPU usage < 70%
□ Memory usage < 80%

# Security
□ SSL/TLS working
□ Security headers present
□ Secrets stored in AWS Secrets Manager
□ IAM roles configured correctly
□ Database credentials rotated

# Documentation
□ Runbook updated
□ On-call playbook updated
□ Training materials distributed
□ Escalation matrix confirmed
```

### 2. Monitoring Setup

**CloudWatch Alarms:**

```bash
# Sync Success Rate
aws cloudwatch put-metric-alarm \
    --alarm-name erp-hub-sync-success-rate-low \
    --alarm-description "Sync success rate below 95%" \
    --metric-name SyncSuccessRate \
    --namespace ERPHub \
    --statistic Average \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 95 \
    --comparison-operator LessThanThreshold \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:erp-hub-critical

# Error Rate
aws cloudwatch put-metric-alarm \
    --alarm-name erp-hub-error-rate-high \
    --alarm-description "Error rate above 1%" \
    --metric-name ErrorRate \
    --namespace ERPHub \
    --statistic Average \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 1 \
    --comparison-operator GreaterThanThreshold \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:erp-hub-critical

# Response Time
aws cloudwatch put-metric-alarm \
    --alarm-name erp-hub-response-time-high \
    --alarm-description "Response time above 2 seconds (p95)" \
    --metric-name ResponseTime \
    --namespace ERPHub \
    --extended-statistic p95 \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 2000 \
    --comparison-operator GreaterThanThreshold \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:erp-hub-warning
```

### 3. Team Training Schedule

```
Week 1 (Post-Deployment):
- Day 1-2: USA team training (see TRAINING_GUIDE_USA.md)
- Day 3-4: México team training
- Day 5: Q&A and advanced topics

Week 2:
- Daily standup meetings
- Knowledge sharing sessions
- Documentation review

Week 3:
- Certification exams
- Handover to operations team
- Dev team on-call standby
```

### 4. Go-Live Communication

**Email Template:**

```
Subject: 🚀 ERP Hub Go-Live - USA & México Operations

Dear Spirit Tours Team,

We're excited to announce that the ERP Hub is now live for USA and México operations!

What's New:
✓ Automatic sync with QuickBooks, Xero, FreshBooks (USA)
✓ Automatic sync with CONTPAQi, QuickBooks MX, Alegra (México)
✓ CFDI 4.0 automatic generation for México invoices
✓ Real-time monitoring dashboard
✓ Reduced manual data entry by 95%

What You Need to Do:
1. Complete training (link: https://training.spirittours.com/erp-hub)
2. Review documentation (link: https://docs.spirittours.com/erp-hub)
3. Report any issues to: erp-support@spirittours.com

Support:
- Slack: #erp-hub-support
- Email: erp-support@spirittours.com
- Phone: +1-305-555-TECH (8324)
- On-call: 24/7 for critical issues

Thank you for your patience during the deployment!

Best regards,
Spirit Tours Tech Team
```

---

## Rollback Procedures

### When to Rollback

**Triggers:**
- Sync success rate < 80% for 1 hour
- Error rate > 10% for 30 minutes
- Multiple ERP connections failing
- Data corruption detected
- Security vulnerability discovered
- Critical bug affecting customer invoices

### Rollback Steps

```bash
# 1. Declare incident
# Post in Slack: #incidents
"🔴 INCIDENT: Rolling back ERP Hub deployment due to [reason]"

# 2. Stop accepting new traffic
# Update load balancer to route 0% to new deployment

# 3. Stop new servers
ssh web-server-1.spirittours.com
pm2 stop all

# Repeat for web-server-2 and web-server-3

# 4. Start old servers (if blue-green)
ssh old-web-server-1.spirittours.com
pm2 restart all

# 5. Update load balancer
# Route 100% traffic to old servers

# 6. Verify old version is working
curl https://erp-hub.spirittours.com/health

# 7. Rollback database (if necessary)
# CAUTION: Only if data corruption
psql -h prod-db.spirittours.com -U erp_hub_admin -d erp_hub_prod
# ... restore from backup

# 8. Communicate rollback
"✅ Rollback complete. Services restored."

# 9. Post-mortem
# Schedule within 48 hours
# Document root cause
# Create action items
```

---

## Appendices

### Appendix A: Ecosystem Config (PM2)

```javascript
// ecosystem.config.js
module.exports = {
    apps: [
        {
            name: 'erp-hub-web',
            script: './server.js',
            instances: 'max',  // Use all CPU cores
            exec_mode: 'cluster',
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            error_file: '/var/log/erp-hub/web-error.log',
            out_file: '/var/log/erp-hub/web-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            max_memory_restart: '1G',
            min_uptime: '10s',
            max_restarts: 10,
            autorestart: true,
            watch: false
        },
        {
            name: 'erp-hub-worker',
            script: './worker.js',
            instances: 2,
            exec_mode: 'fork',
            env_production: {
                NODE_ENV: 'production'
            },
            error_file: '/var/log/erp-hub/worker-error.log',
            out_file: '/var/log/erp-hub/worker-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            max_memory_restart: '512M',
            min_uptime: '10s',
            max_restarts: 10,
            autorestart: true,
            watch: false
        }
    ]
};
```

### Appendix B: Database Migration Scripts

See: `/backend/migrations/` directory

### Appendix C: Troubleshooting Guide

See: `TRAINING_GUIDE_USA.md` - Module 7

### Appendix D: Contact Information

```
🔧 Technical Support:
   Primary: erp-support@spirittours.com
   Slack: #erp-hub-support
   On-call: +1-305-555-8324

👨‍💼 Project Manager:
   Name: [PM Name]
   Email: pm@spirittours.com
   Phone: +1-305-555-0001

👨‍💻 Tech Lead:
   Name: [Tech Lead Name]
   Email: tech-lead@spirittours.com
   Phone: +1-305-555-0002

🛡️ Security Team:
   Email: security@spirittours.com
   Emergency: +1-305-555-9999

📊 Operations Team:
   Email: ops@spirittours.com
   Slack: #operations
```

---

**Document End**

**Status:** ✅ Ready for Production Deployment  
**Last Review:** November 2, 2025  
**Next Review:** December 2, 2025  
**Version:** 1.0.0
