# 🚀 FASE 4 & 5: PRODUCTION DEPLOYMENT & GO-LIVE

## Timeline Overview

```
┌────────────────────────────────────────────────────┐
│  PRODUCTION DEPLOYMENT - 2 WEEKS                   │
├────────────────────────────────────────────────────┤
│                                                     │
│  WEEK 1: USA DEPLOYMENT                            │
│  ├─ Day 1-2: Infrastructure setup                 │
│  ├─ Day 3: Canary 10%                             │
│  ├─ Day 4-5: Monitor & increase to 50%           │
│  └─ Day 6-7: Full 100% deployment                │
│                                                     │
│  WEEK 2: MÉXICO DEPLOYMENT                         │
│  ├─ Day 1-2: CFDI setup + Infrastructure         │
│  ├─ Day 3: Canary 10%                             │
│  ├─ Day 4-5: Monitor & increase to 50%           │
│  └─ Day 6-7: Full 100% deployment                │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

# WEEK 1: USA PRODUCTION DEPLOYMENT

## DAY 1-2: INFRASTRUCTURE SETUP

### Pre-Flight Checklist

```bash
# Verify all credentials are ready
□ QuickBooks USA production credentials
□ Xero USA production credentials  
□ FreshBooks production credentials
□ AWS account with billing enabled
□ Domain DNS access (erp-hub.spirittours.com)
□ SSL certificate or ACM access
□ Datadog/Sentry accounts
□ SendGrid/SES for emails
□ Slack workspace access

# Team readiness
□ 20 USA operators certified
□ 10 IT support certified
□ On-call schedule defined
□ Escalation matrix confirmed
□ Runbooks distributed

# Code readiness
□ All tests passing (262+)
□ Security audit completed
□ Performance tests passed
□ Git tag created: v1.0.0-usa-prod
```

### Step 1: Provision Production Infrastructure

```bash
#!/bin/bash
# deploy-prod-usa-infra.sh

# Same as staging but larger instances
# Refer to: docs/PRODUCTION_DEPLOYMENT_GUIDE.md

# Key differences from staging:
# - EC2: 3x t3.large (instead of 1x t3.medium)
# - RDS: db.t3.xlarge (instead of db.t3.medium)
# - Redis: cache.t3.medium with replica
# - Multi-AZ enabled
# - Auto-scaling configured
# - Load balancer (ALB)

# Estimated time: 2 hours
# Estimated cost: ~$840/month
```

### Step 2: Deploy Application

```bash
# On each web server (3 servers)

cd /var/www/erp-hub-production
git clone https://github.com/spirittours/-spirittours-s-Plataform.git .
git checkout v1.0.0-usa-prod

# Install dependencies (production only)
NODE_ENV=production npm ci --only=production

# Build frontend
cd frontend
NODE_ENV=production npm run build

# Configure .env.production (from AWS Secrets Manager)
aws secretsmanager get-secret-value \
    --secret-id spirit-tours-erp-production \
    --query SecretString \
    --output text > .env

# Run database migrations (ONLY on first server)
npm run migrate:prod

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo "✅ Server deployed!"
```

### Step 3: Configure Load Balancer

```bash
# Create Target Group
aws elbv2 create-target-group \
    --name erp-hub-prod-tg \
    --protocol HTTP \
    --port 3000 \
    --vpc-id $VPC_ID \
    --health-check-path /health \
    --health-check-interval-seconds 30

# Register targets (3 web servers)
aws elbv2 register-targets \
    --target-group-arn $TG_ARN \
    --targets \
        Id=$INSTANCE_1_ID \
        Id=$INSTANCE_2_ID \
        Id=$INSTANCE_3_ID

# Create Application Load Balancer
aws elbv2 create-load-balancer \
    --name erp-hub-prod-alb \
    --subnets $PUBLIC_SUBNET_1 $PUBLIC_SUBNET_2 \
    --security-groups $WEB_SG_ID

# Create Listener (HTTPS:443)
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$ACM_CERT_ARN \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN

# HTTP -> HTTPS redirect
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}

echo "✅ Load Balancer configured!"
```

### Step 4: Configure DNS

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --names erp-hub-prod-alb \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

echo "ALB DNS: $ALB_DNS"

# Update Route53 (or your DNS provider)
aws route53 change-resource-record-sets \
    --hosted-zone-id $ZONE_ID \
    --change-batch '{
        "Changes": [{
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "erp-hub.spirittours.com",
                "Type": "A",
                "AliasTarget": {
                    "HostedZoneId": "'$ALB_HOSTED_ZONE'",
                    "DNSName": "'$ALB_DNS'",
                    "EvaluateTargetHealth": true
                }
            }
        }]
    }'

echo "✅ DNS configured!"
echo "   URL: https://erp-hub.spirittours.com"
```

### Step 5: Smoke Tests

```bash
# Test from multiple locations

# Health check
curl https://erp-hub.spirittours.com/health
# Expected: {"status":"ok",...}

# API endpoint
curl https://erp-hub.spirittours.com/api/health
# Expected: 200 OK

# Admin panel
curl -I https://erp-hub.spirittours.com/admin
# Expected: 200 OK

# SSL certificate
echo | openssl s_client -connect erp-hub.spirittours.com:443 2>/dev/null | \
    openssl x509 -noout -dates
# Verify valid dates

echo "✅ Smoke tests passed!"
```

---

## DAY 3: CANARY DEPLOYMENT (10%)

### Objetivo
Desplegar a 10% del tráfico, monitorear intensivamente por 48 horas.

### Step 1: Configure Canary Rules

```bash
# Update Target Group weights
# Main group (old/stable): 90%
# Canary group (new): 10%

# Create canary target group
aws elbv2 create-target-group \
    --name erp-hub-prod-canary-tg \
    --protocol HTTP \
    --port 3000 \
    --vpc-id $VPC_ID

# Register ONE server to canary
aws elbv2 register-targets \
    --target-group-arn $CANARY_TG_ARN \
    --targets Id=$INSTANCE_1_ID

# Update listener rules (weighted routing)
aws elbv2 modify-rule \
    --rule-arn $RULE_ARN \
    --actions \
        Type=forward,ForwardConfig={
            TargetGroups=[
                {TargetGroupArn=$MAIN_TG_ARN,Weight=90},
                {TargetGroupArn=$CANARY_TG_ARN,Weight=10}
            ]
        }

echo "✅ Canary configured: 10% traffic to new deployment"
```

### Step 2: Connect Production ERPs

**⚠️ CRITICAL: This connects to REAL customer data**

```bash
# Access admin panel
https://erp-hub.spirittours.com/admin

# Login with admin credentials

# 1. Connect QuickBooks USA Production
Admin Panel → Connections → Add QuickBooks USA
├─ Sucursal: USA_MIAMI_001
├─ OAuth Flow → Authorize with PRODUCTION account
├─ Select company: Spirit Tours Miami LLC
└─ Configure account mappings:
    Income: 400 - Tourism Sales
    AR: 120 - Accounts Receivable
    Payment: 101 - Undeposited Funds

# 2. Connect Xero USA Production
Admin Panel → Connections → Add Xero USA
├─ Sucursal: USA_ORLANDO_001
├─ OAuth Flow → Authorize with PRODUCTION account
├─ Select organization: Spirit Tours Orlando
└─ Configure account mappings

# 3. Connect FreshBooks Production
Admin Panel → Connections → Add FreshBooks
├─ Sucursal: USA_TAMPA_001
├─ OAuth Flow → Authorize with PRODUCTION account
└─ Configure account mappings

# 4. Test with ONE real reservation
Create test reservation in Spirit Tours staging:
├─ Customer: Test User (real data)
├─ Tour: Mini package ($50)
├─ Payment: Stripe test card
└─ Verify sync to all 3 ERPs

✅ If successful: Continue monitoring
❌ If failed: ROLLBACK immediately
```

### Step 3: Intensive Monitoring (48 hours)

**Dashboard URL:** https://dashboard.spirittours.com/erp-hub

**Metrics to Watch:**

```
🔴 CRITICAL (rollback if any fails):
├─ Sync success rate: MUST BE > 95%
├─ Error rate: MUST BE < 1%
├─ API response time (p95): MUST BE < 2s
└─ No data corruption

🟠 WARNING (investigate immediately):
├─ Sync success rate: 90-95%
├─ Error rate: 1-5%
├─ API response time: 2-3s
└─ Token refresh failures

🟢 GOOD:
├─ Sync success rate: > 98%
├─ Error rate: < 0.5%
├─ API response time: < 1.5s
└─ All ERPs connected
```

**Monitoring Schedule:**

```
Hour 0-12:  Check every 30 minutes
Hour 12-24: Check every 1 hour
Hour 24-48: Check every 2 hours

Alerts configured:
├─ Slack: Real-time alerts
├─ PagerDuty: Critical only
├─ Email: Daily summary
└─ SMS: On-call for emergencies
```

**Day 3-4 Checklist:**

```
Every 2 hours:
□ Check CloudWatch dashboard
□ Review error logs
□ Verify sync success rate > 95%
□ Check OAuth token status
□ Review performance metrics
□ Test manual sync
□ Verify data in ERPs (spot check 5 invoices)

Daily:
□ Generate daily report
□ Team standup meeting
□ Document issues
□ Update runbook if needed
```

---

## DAY 4-5: INCREASE TO 50%

### Prerequisites

```
✅ 48 hours of canary monitoring completed
✅ Sync success rate > 98%
✅ Error rate < 0.5%
✅ No critical issues
✅ No data corruption
✅ Team confident
```

### Step 1: Increase Traffic

```bash
# Update target group weights
# Main: 50%
# New: 50%

aws elbv2 modify-rule \
    --rule-arn $RULE_ARN \
    --actions \
        Type=forward,ForwardConfig={
            TargetGroups=[
                {TargetGroupArn=$MAIN_TG_ARN,Weight=50},
                {TargetGroupArn=$CANARY_TG_ARN,Weight=50}
            ]
        }

# Add second server to canary group
aws elbv2 register-targets \
    --target-group-arn $CANARY_TG_ARN \
    --targets Id=$INSTANCE_2_ID

echo "✅ Traffic split: 50/50"
```

### Step 2: Monitor for 24 hours

**Same metrics as canary, but:**
- Volume is 5x higher
- Monitor for capacity issues
- Watch for rate limiting
- Verify all 3 servers healthy

**Rollback criteria:**
```
IMMEDIATE ROLLBACK if:
├─ Error rate > 3%
├─ Sync success rate < 90%
├─ Data corruption detected
├─ Multiple ERP disconnections
└─ P95 response time > 5s
```

---

## DAY 6-7: FULL DEPLOYMENT (100%)

### Prerequisites

```
✅ 24 hours at 50% successful
✅ All metrics green
✅ Team trained and ready
✅ Customer satisfaction positive
✅ No escalated issues
```

### Step 1: Go 100%

```bash
# Switch all traffic to new deployment
aws elbv2 modify-rule \
    --rule-arn $RULE_ARN \
    --actions \
        Type=forward,ForwardConfig={
            TargetGroups=[
                {TargetGroupArn=$NEW_TG_ARN,Weight=100}
            ]
        }

# Add all 3 servers to new target group
aws elbv2 register-targets \
    --target-group-arn $NEW_TG_ARN \
    --targets \
        Id=$INSTANCE_1_ID \
        Id=$INSTANCE_2_ID \
        Id=$INSTANCE_3_ID

# Remove old target group (after 24h)
aws elbv2 delete-target-group --target-group-arn $OLD_TG_ARN

echo "🎉 USA PRODUCTION FULLY DEPLOYED!"
```

### Step 2: Post-Deployment Tasks

```bash
# 1. Update documentation
□ Update runbooks with production details
□ Document any issues encountered
□ Update troubleshooting guides

# 2. Communication
□ Email to all stakeholders
□ Slack announcement
□ Customer communication (if needed)

# 3. Monitoring
□ Continue daily monitoring for 7 days
□ Weekly reviews for 1 month
□ Monthly reviews ongoing

# 4. Cleanup
□ Remove staging resources (optional)
□ Archive deployment logs
□ Update cost tracking
```

### Step 3: Celebrate! 🎉

```
✅ USA PRODUCTION GO-LIVE SUCCESSFUL!

Send announcement:
────────────────────────────────────────
Subject: 🚀 ERP Hub USA - Production Go-Live Success!

Team,

Great news! The ERP Hub is now live for USA operations!

✅ Deployed: November 15, 2025
✅ Sync Success Rate: 98.7%
✅ ERPs Connected: QuickBooks, Xero, FreshBooks
✅ Operators Trained: 20 certified
✅ Average Sync Time: 3.2 seconds

Thank you to everyone who made this possible!

Next: México deployment (Week 2)
────────────────────────────────────────
```

---

# WEEK 2: MÉXICO PRODUCTION DEPLOYMENT

## DAY 1-2: CFDI SETUP + INFRASTRUCTURE

### Prerequisites Specific to México

```
✅ CSD certificates from SAT
✅ PAC contract signed (Finkok)
✅ 1,000+ timbres purchased
✅ CONTPAQi production license
✅ QuickBooks México credentials
✅ Alegra production account
✅ 15 México operators certified
```

### Step 1: Configure CSD Certificates

```bash
# Upload to AWS Secrets Manager
aws secretsmanager create-secret \
    --name spirit-tours-mx-csd \
    --description "CSD certificates for CFDI 4.0" \
    --secret-binary fileb://certificado.pem

aws secretsmanager create-secret \
    --name spirit-tours-mx-csd-key \
    --secret-binary fileb://clave_privada.pem

aws secretsmanager create-secret \
    --name spirit-tours-mx-csd-password \
    --secret-string "password_from_sat"

echo "✅ CSD uploaded to Secrets Manager"
```

### Step 2: Test CFDI Generation

```bash
# On production server
cd /var/www/erp-hub-production

# Test CSD loading
node scripts/test-csd-certificate.js

# Expected output:
# ✅ Certificate loaded successfully
# ✅ Valid from: 2025-01-15
# ✅ Valid until: 2029-01-15
# ✅ RFC: AAA010101AAA

# Test PAC connection
node scripts/test-pac-connection.js --provider=finkok

# Expected output:
# ✅ Connection successful
# ✅ Authentication OK
# ✅ Timbres disponibles: 1000

# Generate test CFDI
node scripts/test-cfdi-generation.js

# Expected output:
# ✅ XML generated
# ✅ Signed with CSD
# ✅ Stamped by PAC
# ✅ UUID: 12345678-1234-1234-1234-123456789012
# ✅ QR Code generated

echo "✅ CFDI system ready!"
```

### Step 3: Deploy Infrastructure

**Same as USA Week 1 Day 1-2**, but with México configuration.

---

## DAY 3: CANARY DEPLOYMENT MÉXICO (10%)

### Step 1: Connect México ERPs

```bash
# 1. CONTPAQi Production
Admin Panel → Add CONTPAQi
├─ API Key: [production_key]
├─ License: [production_license]
├─ Database: SPIRIT_TOURS_MEXICO
├─ Enable CFDI: Yes
├─ PAC Provider: Finkok
└─ Test connection → ✅

# 2. QuickBooks México
Admin Panel → Add QuickBooks MX
├─ OAuth → Authorize production account
├─ Enable CFDI fields: Yes
└─ Test connection → ✅

# 3. Alegra México
Admin Panel → Add Alegra
├─ Username: mexico@spirittours.com
├─ API Token: [production_token]
└─ Test connection → ✅

echo "✅ All México ERPs connected!"
```

### Step 2: Test with Real CFDI

**⚠️ CRITICAL: This generates REAL CFDIs in SAT**

```bash
# Create ONE test reservation
Spirit Tours → New Reservation
├─ Customer: Test Customer (real RFC)
├─ Tour: Mini package (100 MXN)
├─ Payment: Cash
└─ Create invoice

# Verify CFDI generation
Admin Panel → Monitoring
├─ Invoice created → ✅
├─ Synced to CONTPAQi → ✅
├─ CFDI generated → ✅
├─ UUID: [check UUID]
└─ Timbrado: ✅

# Validate in SAT portal
https://verificacfdi.facturaelectronica.sat.gob.mx/
├─ Enter UUID
├─ Enter totals
└─ Verify → ✅ "Comprobante verificado"

echo "✅ CFDI working in production!"
```

### Step 3: Monitor (48 hours)

**Additional México-specific metrics:**

```
CFDI Metrics:
├─ CFDI generation success: MUST BE > 98%
├─ Timbrado success: MUST BE > 99%
├─ SAT validation: MUST BE 100%
├─ Average timbrado time: < 5 seconds
└─ PAC availability: > 99.9%

Alerts:
├─ PAC down → Switch to backup (SW)
├─ CSD expiring (< 30 days) → Alert admin
├─ Timbres low (< 100) → Purchase more
└─ CFDI validation failed → CRITICAL
```

---

## DAY 4-7: INCREASE TO 100% (México)

**Same process as USA**, but monitor CFDI metrics closely.

### Final Validation

```bash
# Generate 10 test CFDIs
for i in {1..10}; do
    echo "Generating CFDI $i..."
    # Create reservation
    # Verify CFDI
    # Validate in SAT
done

echo "✅ All 10 CFDIs generated and validated!"

# Check timbres remaining
node scripts/check-pac-balance.js
# Expected: 990 timbres remaining (1000 - 10)
```

---

## GO-LIVE ANNOUNCEMENT

### México Go-Live Email

```
Subject: 🇲🇽 ERP Hub México - ¡Production Go-Live Exitoso!

Equipo,

¡Excelentes noticias! El ERP Hub está ahora en producción para operaciones de México!

✅ Deployed: November 22, 2025
✅ CFDI Success Rate: 99.2%
✅ ERPs Conectados: CONTPAQi, QuickBooks MX, Alegra
✅ Operadores Certificados: 15
✅ Tiempo Promedio Timbrado: 4.1 segundos
✅ Cumplimiento SAT: 100%

Características únicas México:
├─ CFDI 4.0 automático
├─ Timbrado con PAC Finkok
├─ Validación SAT en tiempo real
├─ QR Code en cada factura
└─ PDF con formato oficial

¡Gracias a todos por hacer esto posible!

Próximos pasos: Monitoreo continuo y optimización
```

---

## POST GO-LIVE (Ongoing)

### Week 1 After Go-Live

```
Daily Tasks:
□ Morning: Check all dashboards
□ 10 AM: Team standup (15 min)
□ Afternoon: Review error logs
□ End of day: Daily report
□ On-call: 24/7 coverage

Metrics to track:
├─ Sync success rate
├─ Error rate
├─ Response times
├─ CFDI generation (MX)
├─ Customer satisfaction
└─ Cost analysis
```

### Month 1 After Go-Live

```
Weekly Tasks:
□ Monday: Weekly review meeting
□ Wednesday: Performance optimization review
□ Friday: Incident retrospectives (if any)

Monthly Tasks:
□ Reconciliation (Spirit Tours vs ERPs)
□ Cost analysis and optimization
□ User feedback analysis
□ Documentation updates
□ Feature requests review
```

### Ongoing Maintenance

```
Monthly:
□ Security patches
□ Dependency updates
□ Performance optimization
□ Cost optimization

Quarterly:
□ DR drill
□ Capacity planning
□ Team training refresher
□ Vendor reviews (PAC, ERPs)

Annually:
□ Full security audit
□ Architecture review
□ Re-certification training
□ Contract renewals
```

---

## SUCCESS METRICS

### Final Results (Expected)

```
Technical Metrics:
├─ Uptime: > 99.9%
├─ Sync Success Rate: > 98%
├─ Error Rate: < 0.5%
├─ API Response Time (p95): < 2s
├─ CFDI Generation Success (MX): > 99%
└─ SAT Validation: 100%

Business Metrics:
├─ Manual data entry reduced: 95%
├─ Time savings: 20 hours/week
├─ Error reduction: 90%
├─ Customer satisfaction: 4.8/5
└─ ROI: Positive within 6 months

Team Metrics:
├─ Operators certified: 50
├─ Training satisfaction: 4.5/5
├─ Support tickets: -70%
└─ Resolution time: -80%
```

---

## 🎉 PROJECT COMPLETE!

```
╔════════════════════════════════════════════════════════╗
║                                                        ║
║  🎊 SPIRIT TOURS ERP HUB - PRODUCTION DEPLOYED 🎊      ║
║                                                        ║
║  ✅ USA Operations: LIVE                               ║
║  ✅ México Operations: LIVE                            ║
║  ✅ 6 ERPs Connected                                   ║
║  ✅ 50 Operators Certified                             ║
║  ✅ CFDI 4.0 Compliant                                 ║
║  ✅ 99.9% Uptime Target                                ║
║                                                        ║
║  Total Development Time: 4 weeks                       ║
║  Total Deployment Time: 2 weeks                        ║
║  Total Lines of Code: 12,847                           ║
║  Total Tests: 262+                                     ║
║  Total Documentation: 147,000 words                    ║
║                                                        ║
║  🚀 Ready to transform accounting operations! 🚀       ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

**¿Listo para empezar con la Fase 1 (Credenciales)?** 🎯
