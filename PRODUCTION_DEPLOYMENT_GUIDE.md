# Spirit Tours - Production Deployment Guide
**Version: 1.0.0**  
**Last Updated: 2024-01-15**

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Infrastructure Setup](#infrastructure-setup)
- [Application Deployment](#application-deployment)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring Setup](#monitoring-setup)
- [Backup Configuration](#backup-configuration)
- [CI/CD Pipeline](#cicd-pipeline)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers the complete production deployment of the Spirit Tours platform including:
- ✅ Cloud infrastructure provisioning (AWS/GCP/Azure)
- ✅ PostgreSQL database setup with backups
- ✅ Redis cache cluster
- ✅ SSL/TLS certificates (Let's Encrypt)
- ✅ Nginx reverse proxy
- ✅ Monitoring (Prometheus + Grafana)
- ✅ Error tracking (Sentry)
- ✅ Automated backups
- ✅ CI/CD pipeline (GitHub Actions)

**Estimated Deployment Time**: 4-6 hours  
**Estimated Monthly Cost**: $840-1200 (depending on cloud provider and traffic)

---

## Prerequisites

### Required Tools
```bash
# Install required CLI tools
curl -fsSL https://get.docker.com | sh  # Docker
curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | sudo bash  # Git LFS
sudo apt-get install -y docker-compose certbot python3-certbot-nginx jq

# For AWS deployment
pip install awscli
aws configure

# For monitoring
docker pull prom/prometheus:latest
docker pull grafana/grafana:latest
```

### Required Credentials
1. **Cloud Provider** (AWS/GCP/Azure)
   - Access keys / Service account
   - Billing enabled
   
2. **Domain & DNS**
   - Domain registered (e.g., spirittours.com)
   - DNS provider access (CloudFlare/Route53)

3. **Third-party Services**
   - Stripe API keys (payments)
   - SendGrid API key (emails)
   - Sentry DSN (error tracking)
   - OpenAI/Anthropic API keys (AI features)

4. **GitHub**
   - Repository access
   - GitHub Actions enabled
   - Secrets configured

---

## Infrastructure Setup

### Option 1: AWS Deployment (Recommended)

#### Step 1: Run AWS Deployment Script
```bash
cd deployment/cloud/aws
chmod +x deploy-aws.sh
./deploy-aws.sh

# This will create:
# - VPC with public/private subnets
# - Application Load Balancer
# - EC2 instances (3x t3.large)
# - RDS PostgreSQL (db.t3.xlarge, Multi-AZ)
# - ElastiCache Redis cluster
# - S3 buckets for backups
# - Security groups and IAM roles
```

#### Step 2: Wait for Resources
```bash
# Wait for database initialization (10-15 minutes)
aws rds describe-db-instances \
    --db-instance-identifier spirit-tours-db \
    --query 'DBInstances[0].DBInstanceStatus'

# Wait for Redis cluster (5-10 minutes)
aws elasticache describe-replication-groups \
    --replication-group-id spirit-tours-redis \
    --query 'ReplicationGroups[0].Status'
```

#### Step 3: Get Connection Details
```bash
# Database endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier spirit-tours-db \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

# Redis endpoint
REDIS_ENDPOINT=$(aws elasticache describe-replication-groups \
    --replication-group-id spirit-tours-redis \
    --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address' \
    --output text)

echo "Database: $DB_ENDPOINT"
echo "Redis: $REDIS_ENDPOINT"
```

### Option 2: Docker Compose Deployment

For smaller deployments or testing:

```bash
# Copy and configure environment
cp .env.production.example .env.production
nano .env.production  # Fill in actual values

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f api
```

---

## Application Deployment

### Step 1: Configure Environment Variables

```bash
# Create production environment file
cp .env.production.example .env.production

# Edit with actual values
nano .env.production

# Required variables:
# - DATABASE_URL (from AWS RDS)
# - REDIS_URL (from ElastiCache)
# - SECRET_KEY (generate with: openssl rand -hex 32)
# - STRIPE_SECRET_KEY
# - SMTP_PASSWORD (SendGrid)
# - SENTRY_DSN
```

### Step 2: Build and Push Docker Image

```bash
# Build production image
docker build \
    -f backend/Dockerfile.production \
    -t spirittours/backend:1.0.0 \
    --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
    --build-arg VERSION=1.0.0 \
    ./backend

# Tag as latest
docker tag spirittours/backend:1.0.0 spirittours/backend:latest

# Push to registry (Docker Hub or ECR)
docker push spirittours/backend:1.0.0
docker push spirittours/backend:latest
```

### Step 3: Deploy to Production

```bash
# Using Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Or deploy to AWS ECS/Kubernetes
kubectl apply -f deployment/k8s/production/
```

### Step 4: Run Database Migrations

```bash
# Connect to API container
docker exec -it spirit-tours-api-prod bash

# Run migrations
alembic upgrade head

# Verify database
psql $DATABASE_URL -c "\dt"
```

### Step 5: Health Check

```bash
# Check API health
curl https://api.spirittours.com/health

# Expected response:
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected"
}
```

---

## SSL/TLS Configuration

### Option 1: Let's Encrypt (Free, Automated)

```bash
cd deployment/ssl
chmod +x setup-ssl.sh

# Obtain certificates for main domain and API subdomain
./setup-ssl.sh spirittours.com admin@spirittours.com

# This will:
# - Install certbot
# - Obtain certificates for spirittours.com and api.spirittours.com
# - Configure Nginx
# - Set up auto-renewal (runs twice daily)

# Verify certificates
sudo certbot certificates
```

### Option 2: AWS Certificate Manager (ACM)

```bash
# Request certificate
aws acm request-certificate \
    --domain-name spirittours.com \
    --subject-alternative-names api.spirittours.com www.spirittours.com \
    --validation-method DNS

# Get validation records
aws acm describe-certificate \
    --certificate-arn <certificate-arn>

# Add CNAME records to Route53/DNS provider
# Wait for validation (5-30 minutes)
```

### Configure Nginx for SSL

```bash
# Copy production Nginx config
cp nginx/nginx.prod.conf /etc/nginx/nginx.conf

# Test configuration
nginx -t

# Reload Nginx
nginx -s reload

# Test HTTPS
curl -I https://api.spirittours.com
```

---

## Monitoring Setup

### Step 1: Start Monitoring Stack

```bash
# Start Prometheus and Grafana
docker-compose -f docker-compose.prod.yml up -d prometheus grafana

# Access Grafana
open https://monitoring.spirittours.com
# Default login: admin / <GRAFANA_ADMIN_PASSWORD from .env>
```

### Step 2: Configure Data Sources

Grafana automatically loads Prometheus datasource from:
- `monitoring/grafana/provisioning/datasources/prometheus.yml`

### Step 3: Import Dashboards

```bash
# Dashboards are auto-loaded from:
# monitoring/grafana/dashboards/

# Or manually import from Grafana UI:
# - Node Exporter Dashboard (ID: 1860)
# - PostgreSQL Dashboard (ID: 9628)
# - Redis Dashboard (ID: 11835)
# - FastAPI Dashboard (custom)
```

### Step 4: Configure Alerts

Prometheus alerts are configured in:
- `monitoring/prometheus/alerts.yml`

To receive alerts via Slack:
1. Create Slack webhook URL
2. Add to `.env.production`:
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```
3. Restart Prometheus

### Step 5: Setup Sentry Error Tracking

```bash
# Add Sentry DSN to .env.production
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Restart API
docker-compose -f docker-compose.prod.yml restart api

# Test error tracking
curl -X POST https://api.spirittours.com/test-error
```

---

## Backup Configuration

### Step 1: Configure Backup Service

```bash
# Backups run daily at 2 AM UTC
# Configuration in docker-compose.prod.yml

# Test backup manually
docker exec spirit-tours-backup /scripts/backup.sh

# Check backup files
ls -lh backup/postgres/

# Verify S3 upload (if configured)
aws s3 ls s3://spirit-tours-backups-us-east-1/backups/postgres/
```

### Step 2: Test Restore

```bash
# List available backups
docker exec spirit-tours-backup /scripts/restore.sh list

# Restore from latest backup (CAUTION: Drops database)
docker exec -it spirit-tours-backup /scripts/restore.sh restore latest

# Or restore from specific backup
docker exec -it spirit-tours-backup /scripts/restore.sh restore \
    /backup/spirittours_20240115_020000.sql.gz
```

### Step 3: Setup Backup Monitoring

```bash
# Backup logs are in /var/log/backup/backup.log
docker exec spirit-tours-backup tail -f /var/log/backup/backup.log

# Slack notifications are automatic (if SLACK_WEBHOOK_URL configured)
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline is configured in `.github/workflows/deploy-production.yml`

**Triggers**:
- Push to `main` branch
- Manual workflow dispatch

**Steps**:
1. Run tests (pytest)
2. Build Docker image
3. Push to registry
4. Deploy to production
5. Run health checks
6. Send Slack notification

### Setup GitHub Secrets

Required secrets in GitHub repository settings:

```bash
# Docker Registry
DOCKER_USERNAME
DOCKER_PASSWORD

# AWS (if using AWS)
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION

# Production Environment
PRODUCTION_DATABASE_URL
PRODUCTION_REDIS_URL
PRODUCTION_SECRET_KEY
STRIPE_SECRET_KEY
SMTP_PASSWORD
SENTRY_DSN

# Notifications
SLACK_WEBHOOK_URL
```

### Manual Deployment

```bash
# Trigger manual deployment
gh workflow run deploy-production.yml

# Monitor deployment
gh run list --workflow=deploy-production.yml
gh run watch
```

---

## Rollback Procedures

### Rollback Application (Quick - 5 minutes)

```bash
# Option 1: Rollback to previous Docker image
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml pull spirittours/backend:1.0.0-previous
docker-compose -f docker-compose.prod.yml up -d

# Option 2: Use git to revert
git revert <commit-hash>
git push origin main
# CI/CD will auto-deploy

# Verify rollback
curl https://api.spirittours.com/health
```

### Rollback Database (Longer - 15-30 minutes)

```bash
# 1. Find recent backup
docker exec spirit-tours-backup /scripts/restore.sh list

# 2. Restore from backup
docker exec -it spirit-tours-backup /scripts/restore.sh restore \
    /backup/spirittours_20240114_020000.sql.gz

# 3. Restart application
docker-compose -f docker-compose.prod.yml restart api

# 4. Verify
curl https://api.spirittours.com/api/v1/health
```

---

## Troubleshooting

### API Not Responding

```bash
# Check container status
docker ps | grep spirit-tours

# Check logs
docker logs spirit-tours-api-prod --tail=100

# Check Nginx logs
docker logs spirit-tours-nginx-prod --tail=100

# Check database connection
docker exec spirit-tours-api-prod python -c "
from config.database import engine
print(engine.execute('SELECT 1').scalar())
"
```

### Database Issues

```bash
# Check RDS status (AWS)
aws rds describe-db-instances \
    --db-instance-identifier spirit-tours-db

# Check connections
docker exec spirit-tours-postgres-prod psql -U spirittours -d spirittours_db -c \
    "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
docker exec spirit-tours-postgres-prod psql -U spirittours -d spirittours_db -c \
    "SELECT query, state, wait_event FROM pg_stat_activity WHERE state != 'idle';"
```

### High Memory Usage

```bash
# Check container resource usage
docker stats

# Restart specific service
docker-compose -f docker-compose.prod.yml restart api

# Scale horizontally (if using swarm/k8s)
docker service scale spirit-tours-api=5
```

### SSL Certificate Expiry

```bash
# Check certificate expiry
sudo certbot certificates

# Manually renew
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

---

## Performance Optimization

### Database Query Optimization

```sql
-- Enable query logging
ALTER DATABASE spirittours_db SET log_statement = 'all';

-- Analyze slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Create indexes for common queries
CREATE INDEX CONCURRENTLY idx_bookings_user_id ON bookings(user_id);
CREATE INDEX CONCURRENTLY idx_bookings_created_at ON bookings(created_at DESC);
```

### Redis Cache Tuning

```bash
# Monitor cache hit rate
redis-cli INFO stats | grep hit_rate

# Monitor memory usage
redis-cli INFO memory | grep used_memory

# Set maxmemory policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Application Performance

```bash
# Enable Gunicorn workers based on CPU cores
# Formula: (2 x $num_cores) + 1
WORKERS=$(($(nproc) * 2 + 1))

# Update docker-compose.prod.yml
CMD ["gunicorn", "main:app", "--workers", "$WORKERS", ...]
```

---

## Security Checklist

- ✅ SSL/TLS certificates configured
- ✅ Firewall rules (Security Groups) configured
- ✅ Database not publicly accessible
- ✅ Strong passwords (32+ characters)
- ✅ Secrets stored in AWS Secrets Manager
- ✅ Rate limiting enabled (Nginx + FastAPI)
- ✅ Security headers configured
- ✅ Database backups encrypted
- ✅ Monitoring and alerting active
- ✅ Regular security updates enabled

---

## Maintenance Schedule

### Daily
- ✅ Automated backups (2 AM UTC)
- ✅ Log rotation
- ✅ Health checks

### Weekly
- ⏰ Review monitoring dashboards
- ⏰ Check error rates (Sentry)
- ⏰ Review security alerts

### Monthly
- ⏰ Update dependencies
- ⏰ Review and optimize database
- ⏰ Test backup restoration
- ⏰ Review costs and optimize

### Quarterly
- ⏰ Security audit
- ⏰ Performance review
- ⏰ Disaster recovery drill

---

## Support & Escalation

### On-Call Schedule
- Primary: DevOps Team
- Secondary: Backend Team
- Emergency: CTO

### Contact Information
- Slack: #spirit-tours-ops
- Email: ops@spirittours.com
- PagerDuty: Configure alerts

### Escalation Matrix
1. **Level 1**: Automated alerts → On-call engineer
2. **Level 2**: Service degradation → Team lead
3. **Level 3**: Service outage → CTO + CEO

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Administration](https://www.postgresql.org/docs/15/admin.html)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

---

**Document Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Maintained By**: Spirit Tours DevOps Team
