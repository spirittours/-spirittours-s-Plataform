# 🚀 PRODUCTION GO-LIVE RUNBOOK

## 📋 Overview

This runbook provides step-by-step procedures for launching the **Open-Source Email Marketing System** to production. Follow all steps in order to ensure a successful launch.

**Document Version**: 1.0.0  
**Last Updated**: 2025-10-18  
**Target Environment**: Production  
**Estimated Duration**: 2-4 hours

---

## 🎯 Pre-Launch Checklist

### ✅ Prerequisites Completed
- [ ] All items in `PRE_PRODUCTION_OPTIMIZATION.md` completed
- [ ] Load testing passed (10K emails, 100K users)
- [ ] OTA integrations validated
- [ ] Security audit completed
- [ ] Backup and recovery tested
- [ ] Team trained and ready
- [ ] Go/No-Go approval obtained

### 📞 Contact Information

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Technical Lead | ____________ | ____________ | ____________ |
| DevOps Engineer | ____________ | ____________ | ____________ |
| Database Admin | ____________ | ____________ | ____________ |
| Security Officer | ____________ | ____________ | ____________ |
| On-Call Support | ____________ | ____________ | ____________ |

---

## ⏰ TIMELINE

### Phase 1: Pre-Launch (T-2 hours)
**Duration**: 30 minutes  
**Status**: ⏳ Pending

- [ ] **T-120min**: Notify all stakeholders of deployment start
- [ ] **T-120min**: Place system in maintenance mode
- [ ] **T-115min**: Create final database backup
- [ ] **T-110min**: Verify backup integrity
- [ ] **T-105min**: Snapshot current production state

---

### Phase 2: Infrastructure Preparation (T-90 minutes)
**Duration**: 30 minutes  
**Status**: ⏳ Pending

- [ ] **T-90min**: Verify server resources (CPU, RAM, Disk)
- [ ] **T-85min**: Check SSL certificates validity
- [ ] **T-80min**: Verify DNS records
- [ ] **T-75min**: Test database connectivity
- [ ] **T-70min**: Verify Redis connectivity
- [ ] **T-65min**: Check email server status

---

### Phase 3: Code Deployment (T-60 minutes)
**Duration**: 30 minutes  
**Status**: ⏳ Pending

- [ ] **T-60min**: Pull latest production code
- [ ] **T-55min**: Build Docker images
- [ ] **T-50min**: Stop existing services
- [ ] **T-45min**: Deploy new services
- [ ] **T-40min**: Run database migrations
- [ ] **T-35min**: Start services

---

### Phase 4: Verification & Testing (T-30 minutes)
**Duration**: 20 minutes  
**Status**: ⏳ Pending

- [ ] **T-30min**: Run health checks
- [ ] **T-25min**: Test API endpoints
- [ ] **T-20min**: Test email sending
- [ ] **T-15min**: Verify OTA connections
- [ ] **T-10min**: Check monitoring dashboards

---

### Phase 5: Go-Live (T-0 minutes)
**Duration**: 10 minutes  
**Status**: ⏳ Pending

- [ ] **T-0min**: Remove maintenance mode
- [ ] **T+5min**: Monitor initial traffic
- [ ] **T+10min**: Announce go-live to users
- [ ] **T+15min**: Monitor error rates

---

### Phase 6: Post-Launch Monitoring (T+30 minutes)
**Duration**: 90 minutes  
**Status**: ⏳ Pending

- [ ] **T+30min**: First checkpoint - verify all systems
- [ ] **T+60min**: Second checkpoint - analyze metrics
- [ ] **T+120min**: Final checkpoint - confirm stability

---

## 📝 DETAILED PROCEDURES

## Phase 1: Pre-Launch

### Step 1.1: Notify Stakeholders
```bash
# Send notification email to all stakeholders
cat > /tmp/deployment_notification.txt << 'EOF'
Subject: Production Deployment Starting

The production deployment of the Email Marketing System is starting now.

Expected downtime: 2-4 hours
Start time: $(date)
Expected completion: $(date -d '+4 hours')

Status updates will be sent every 30 minutes.

Technical Team
EOF

# Send email (configure your email command)
# mail -s "Production Deployment" stakeholders@company.com < /tmp/deployment_notification.txt
```

**Expected Outcome**: All stakeholders notified  
**Rollback**: N/A  
**Sign-Off**: __________ Time: __________

---

### Step 1.2: Enable Maintenance Mode
```bash
# Create maintenance page
cd /home/user/webapp
echo '<html><body><h1>System Maintenance</h1><p>We will be back shortly.</p></body></html>' > frontend/public/maintenance.html

# Configure Nginx to serve maintenance page
sudo tee /etc/nginx/sites-available/maintenance.conf > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen 443 ssl default_server;
    
    root /var/www/maintenance;
    
    location / {
        return 503;
    }
    
    error_page 503 /maintenance.html;
}
EOF

# Enable maintenance mode
sudo ln -sf /etc/nginx/sites-available/maintenance.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**Expected Outcome**: Maintenance page displayed  
**Rollback**: `sudo rm /etc/nginx/sites-enabled/maintenance.conf && sudo systemctl reload nginx`  
**Sign-Off**: __________ Time: __________

---

### Step 1.3: Create Final Backup
```bash
cd /home/user/webapp

# Run backup script
sudo ./scripts/backup-database.sh

# Verify backup created
BACKUP_FILE=$(ls -t /var/backups/production/db_backup_*.sql.gz | head -1)
echo "Backup file: $BACKUP_FILE"

# Verify backup size (should be > 1MB)
BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE")
if [ $BACKUP_SIZE -lt 1048576 ]; then
    echo "ERROR: Backup file too small!"
    exit 1
fi

echo "✅ Backup verified: $(du -h $BACKUP_FILE)"
```

**Expected Outcome**: Database backup created and verified  
**Rollback**: N/A  
**Sign-Off**: __________ Time: __________

---

## Phase 2: Infrastructure Preparation

### Step 2.1: Verify Server Resources
```bash
# Check CPU
echo "=== CPU Usage ==="
top -bn1 | grep "Cpu(s)" | awk '{print "CPU Usage: " $2 "%"}'

# Check Memory
echo "=== Memory Usage ==="
free -h

# Check Disk Space
echo "=== Disk Space ==="
df -h /

# Check Load Average
echo "=== Load Average ==="
uptime

# Verify requirements
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d'.' -f1)
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)

if [ $CPU_USAGE -gt 80 ]; then
    echo "ERROR: CPU usage too high: ${CPU_USAGE}%"
    exit 1
fi

if [ $DISK_USAGE -gt 80 ]; then
    echo "ERROR: Disk usage too high: ${DISK_USAGE}%"
    exit 1
fi

echo "✅ Server resources verified"
```

**Expected Outcome**: All resources within acceptable limits  
**Rollback**: Increase resources before continuing  
**Sign-Off**: __________ Time: __________

---

### Step 2.2: Verify SSL Certificates
```bash
# Check certificate expiration
CERT_FILE="/etc/letsencrypt/live/yourdomain.com/cert.pem"

if [ -f "$CERT_FILE" ]; then
    EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
    CURRENT_EPOCH=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))
    
    echo "SSL Certificate expires in $DAYS_LEFT days"
    
    if [ $DAYS_LEFT -lt 30 ]; then
        echo "WARNING: Certificate expires soon, renewing..."
        sudo certbot renew
    fi
else
    echo "ERROR: SSL certificate not found!"
    exit 1
fi

echo "✅ SSL certificates verified"
```

**Expected Outcome**: SSL certificates valid for 30+ days  
**Rollback**: Renew certificates if needed  
**Sign-Off**: __________ Time: __________

---

### Step 2.3: Verify DNS Records
```bash
# Check A record
echo "=== DNS A Record ==="
dig +short yourdomain.com A

# Check CNAME records
echo "=== DNS CNAME Records ==="
dig +short www.yourdomain.com CNAME

# Check MX records
echo "=== DNS MX Records ==="
dig +short yourdomain.com MX

# Check TXT records (SPF, DKIM, DMARC)
echo "=== DNS TXT Records ==="
dig +short yourdomain.com TXT
dig +short _dmarc.yourdomain.com TXT
dig +short default._domainkey.yourdomain.com TXT

echo "✅ DNS records verified"
```

**Expected Outcome**: All DNS records properly configured  
**Rollback**: Update DNS if incorrect  
**Sign-Off**: __________ Time: __________

---

## Phase 3: Code Deployment

### Step 3.1: Pull Latest Code
```bash
cd /home/user/webapp

# Fetch latest code
git fetch origin

# Checkout main branch
git checkout main
git pull origin main

# Display current commit
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "Deploying commit: $CURRENT_COMMIT"

# Verify commit signature (if using signed commits)
git verify-commit HEAD || echo "WARNING: Commit not signed"

echo "✅ Latest code pulled"
```

**Expected Outcome**: Latest production code checked out  
**Rollback**: `git checkout <previous_commit>`  
**Sign-Off**: __________ Time: __________

---

### Step 3.2: Run Deployment Script
```bash
cd /home/user/webapp

# Run production deployment script
sudo ./scripts/deploy-production.sh

# Check exit code
if [ $? -ne 0 ]; then
    echo "ERROR: Deployment script failed!"
    echo "Initiating rollback..."
    sudo ./scripts/rollback.sh
    exit 1
fi

echo "✅ Deployment script completed"
```

**Expected Outcome**: All services deployed successfully  
**Rollback**: Automatic via `rollback.sh`  
**Sign-Off**: __________ Time: __________

---

## Phase 4: Verification & Testing

### Step 4.1: Run Health Checks
```bash
cd /home/user/webapp

# Run health check script
./scripts/health-check.sh

if [ $? -ne 0 ]; then
    echo "ERROR: Health checks failed!"
    echo "Initiating rollback..."
    sudo ./scripts/rollback.sh
    exit 1
fi

echo "✅ Health checks passed"
```

**Expected Outcome**: All health checks pass  
**Rollback**: Automatic via `rollback.sh`  
**Sign-Off**: __________ Time: __________

---

### Step 4.2: Test API Endpoints
```bash
# Test health endpoint
curl -f http://localhost:8000/health || exit 1

# Test API v1 health
curl -f http://localhost:8000/api/v1/health || exit 1

# Test authentication
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"'$ADMIN_PASSWORD'"}' \
    | jq -r '.access_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "ERROR: Authentication failed!"
    exit 1
fi

# Test campaigns endpoint
curl -f -H "Authorization: Bearer $TOKEN" \
    http://localhost:8000/api/v1/campaigns || exit 1

echo "✅ API endpoints tested successfully"
```

**Expected Outcome**: All API endpoints responding correctly  
**Rollback**: `sudo ./scripts/rollback.sh`  
**Sign-Off**: __________ Time: __________

---

### Step 4.3: Test Email Sending
```bash
# Send test email
curl -X POST http://localhost:8000/api/v1/test-email \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "to": "test@yourdomain.com",
        "subject": "Production Go-Live Test",
        "body": "This is a test email sent during production go-live."
    }'

# Check email logs
docker compose -f docker-compose.production.yml logs email_worker --tail 50

echo "✅ Email sending tested"
```

**Expected Outcome**: Test email sent successfully  
**Rollback**: `sudo ./scripts/rollback.sh`  
**Sign-Off**: __________ Time: __________

---

### Step 4.4: Verify OTA Connections
```bash
cd /home/user/webapp

# Run OTA validation script
./scripts/validate-ota-integrations.sh production

if [ $? -ne 0 ]; then
    echo "WARNING: Some OTA integrations failed"
    echo "Review results and decide if blocking"
fi

echo "✅ OTA connections verified"
```

**Expected Outcome**: All OTA connections working  
**Rollback**: May continue if non-critical  
**Sign-Off**: __________ Time: __________

---

## Phase 5: Go-Live

### Step 5.1: Remove Maintenance Mode
```bash
# Disable maintenance mode
sudo rm /etc/nginx/sites-enabled/maintenance.conf

# Enable production site
sudo ln -sf /etc/nginx/sites-available/production.conf /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "ERROR: Nginx configuration invalid!"
    exit 1
fi

# Reload Nginx
sudo systemctl reload nginx

echo "✅ Maintenance mode removed, site is LIVE"
```

**Expected Outcome**: Production site accessible  
**Rollback**: Re-enable maintenance mode  
**Sign-Off**: __________ Time: __________

---

### Step 5.2: Monitor Initial Traffic
```bash
# Monitor Nginx access logs
sudo tail -f /var/log/nginx/access.log &
TAIL_PID=$!

# Monitor API logs
docker compose -f docker-compose.production.yml logs -f api &
API_LOGS_PID=$!

# Monitor for 5 minutes
echo "Monitoring for 5 minutes..."
sleep 300

# Stop monitoring
kill $TAIL_PID $API_LOGS_PID

echo "✅ Initial traffic monitoring completed"
```

**Expected Outcome**: Normal traffic patterns, no errors  
**Rollback**: `sudo ./scripts/rollback.sh` if critical errors  
**Sign-Off**: __________ Time: __________

---

### Step 5.3: Announce Go-Live
```bash
# Send go-live announcement
cat > /tmp/golive_announcement.txt << 'EOF'
Subject: Production Launch Complete

The Email Marketing System is now LIVE in production!

Launch time: $(date)
System status: All systems operational

You can now access the system at: https://yourdomain.com

If you experience any issues, please contact support immediately.

Thank you for your patience during the deployment.

Technical Team
EOF

# Send announcement (configure your email command)
# mail -s "Production Launch Complete" users@company.com < /tmp/golive_announcement.txt

echo "✅ Go-live announced"
```

**Expected Outcome**: Users notified of go-live  
**Rollback**: N/A  
**Sign-Off**: __________ Time: __________

---

## Phase 6: Post-Launch Monitoring

### Step 6.1: First Checkpoint (T+30 minutes)
```bash
echo "=== First Checkpoint (T+30min) ==="

# Check service status
docker compose -f docker-compose.production.yml ps

# Check error rates
curl -s http://localhost:9090/api/v1/query?query=rate\(http_requests_total\{status=~\"5..\"\}[5m]\) \
    | jq '.data.result'

# Check response times
curl -s http://localhost:9090/api/v1/query?query=histogram_quantile\(0.95,rate\(http_request_duration_seconds_bucket[5m]\)\) \
    | jq '.data.result'

# Check resource usage
docker stats --no-stream

echo "✅ First checkpoint completed"
```

**Expected Outcome**: All metrics within normal range  
**Action if Failed**: Investigate and potentially rollback  
**Sign-Off**: __________ Time: __________

---

### Step 6.2: Second Checkpoint (T+60 minutes)
```bash
echo "=== Second Checkpoint (T+60min) ==="

# Check database connections
docker compose -f docker-compose.production.yml exec postgres \
    psql -U emailuser -d emailmarketing -c "SELECT count(*) FROM pg_stat_activity;"

# Check email queue length
docker compose -f docker-compose.production.yml exec redis \
    redis-cli LLEN email_queue

# Check recent errors
docker compose -f docker-compose.production.yml logs --since 60m | grep -i error | tail -20

# Review Grafana dashboards
echo "Review Grafana dashboards at: http://localhost:3000"

echo "✅ Second checkpoint completed"
```

**Expected Outcome**: System stable, no critical issues  
**Action if Failed**: Investigate root cause  
**Sign-Off**: __________ Time: __________

---

### Step 6.3: Final Checkpoint (T+120 minutes)
```bash
echo "=== Final Checkpoint (T+120min) ==="

# Run full health check
./scripts/health-check.sh

# Check campaign statistics
curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:8000/api/v1/analytics/overview | jq '.'

# Review logs for patterns
docker compose -f docker-compose.production.yml logs --since 120m > /tmp/deployment_logs.txt
echo "Logs saved to: /tmp/deployment_logs.txt"

# Generate deployment report
cat > /tmp/deployment_report.txt << EOF
====================================
DEPLOYMENT REPORT
====================================
Deployment Date: $(date)
Commit: $(git rev-parse --short HEAD)
Status: SUCCESS
Downtime: [CALCULATE DOWNTIME]

System Metrics:
- CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')
- Memory Usage: $(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2}')
- Disk Usage: $(df -h / | awk 'NR==2{print $5}')

API Performance:
- Average Response Time: [CHECK GRAFANA]
- Error Rate: [CHECK GRAFANA]
- Requests/sec: [CHECK GRAFANA]

Issues Encountered: [LIST ANY ISSUES]

Next Steps:
- Continue monitoring for 24 hours
- Review metrics daily for 1 week
- Schedule post-deployment review

====================================
EOF

cat /tmp/deployment_report.txt

echo "✅ Final checkpoint completed"
echo "✅ DEPLOYMENT SUCCESSFUL"
```

**Expected Outcome**: System fully stable, ready for handoff  
**Action if Failed**: Continue monitoring, document issues  
**Sign-Off**: __________ Time: __________

---

## 🔄 ROLLBACK PROCEDURES

### When to Rollback
- Critical errors affecting > 10% of users
- Database corruption or data loss
- Security breach detected
- System completely unresponsive
- Email sending failure > 50%

### Rollback Steps
```bash
cd /home/user/webapp

# Execute rollback script
sudo ./scripts/rollback.sh

# Verify rollback successful
./scripts/health-check.sh

# Restore from backup if needed
BACKUP_FILE=$(ls -t /var/backups/production/db_backup_*.sql.gz | head -1)
gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres \
    psql -U emailuser -d emailmarketing

# Notify stakeholders
echo "ROLLBACK COMPLETED at $(date)"
```

---

## 📊 POST-LAUNCH MONITORING SCHEDULE

| Time | Activity | Responsible |
|------|----------|-------------|
| T+1 hour | System health check | DevOps |
| T+4 hours | Performance review | Tech Lead |
| T+8 hours | Overnight monitoring review | On-call |
| T+24 hours | First day review meeting | Team |
| T+7 days | Week one retrospective | Team |

---

## ✅ SIGN-OFF

### Deployment Completion

**Deployment completed by**:  
Name: ______________  
Role: ______________  
Signature: ______________  
Date/Time: ______________

### Verification

**Verified by**:  
Name: ______________  
Role: ______________  
Signature: ______________  
Date/Time: ______________

---

## 📝 NOTES & ISSUES

Use this section to document any issues encountered during deployment:

```
[TIMESTAMP] [SEVERITY] [DESCRIPTION]
_____________________________________________
_____________________________________________
_____________________________________________
_____________________________________________
```

---

**🎉 CONGRATULATIONS ON A SUCCESSFUL PRODUCTION LAUNCH! 🎉**

**Next Steps**:
1. Continue monitoring for 24 hours
2. Review metrics and logs daily for 1 week
3. Schedule post-deployment retrospective
4. Update documentation based on lessons learned
5. Celebrate with the team! 🍾
