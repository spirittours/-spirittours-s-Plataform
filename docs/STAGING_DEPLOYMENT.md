# Staging Deployment Guide - Spirit Tours Platform

**Version**: 1.0.0  
**Date**: November 14, 2025  
**Environment**: Staging/Pre-Production  
**Purpose**: Safe testing environment before production deployment

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Database Configuration](#database-configuration)
5. [Application Deployment](#application-deployment)
6. [Environment Variables](#environment-variables)
7. [Testing Checklist](#testing-checklist)
8. [Monitoring Setup](#monitoring-setup)
9. [Rollback Procedures](#rollback-procedures)
10. [Common Issues](#common-issues)

---

## Overview

### What is Staging?

Staging is a **production-like environment** used for:
- ✅ Final testing before production release
- ✅ Integration testing with real services (Stripe test mode, SendGrid)
- ✅ Performance testing under load
- ✅ User acceptance testing (UAT)
- ✅ Security testing and penetration testing

### Staging vs Production

| Feature | Staging | Production |
|---------|---------|------------|
| **Database** | Separate PostgreSQL instance | Production PostgreSQL |
| **Domain** | staging.spirittours.com | spirittours.com |
| **API Keys** | Test/Sandbox keys | Live keys |
| **SSL** | Let's Encrypt (valid) | Let's Encrypt (valid) |
| **Monitoring** | Optional | Required |
| **Backups** | Daily | Hourly + real-time |
| **Traffic** | Internal team + QA | Public users |
| **Data** | Test/synthetic data | Real customer data |

---

## Prerequisites

### Required Accounts

- ✅ **Cloud Provider Account** (AWS/GCP/Azure)
- ✅ **Domain Name** (staging.spirittours.com)
- ✅ **GitHub Account** (for CI/CD)
- ✅ **Stripe Test Account** (test API keys)
- ✅ **SendGrid Account** (separate test API key)
- ✅ **PostgreSQL Hosting** (managed service recommended)

### Required Tools

```bash
# Install required CLI tools
brew install terraform          # Infrastructure as code
brew install kubectl           # Kubernetes (if using K8s)
brew install docker            # Container management
brew install aws-cli           # AWS CLI (if using AWS)
brew install gcloud            # Google Cloud CLI (if using GCP)
```

### Access Requirements

- SSH access to staging servers
- Database admin credentials
- Cloud provider admin access
- GitHub repository write access
- Domain DNS management access

---

## Infrastructure Setup

### Option 1: Cloud Virtual Machine (Recommended for Quick Setup)

#### AWS EC2 Instance

```bash
# 1. Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name spirit-tours-staging \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=spirit-tours-staging}]'

# 2. Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# 3. Associate Elastic IP with instance
aws ec2 associate-address \
  --instance-id i-xxxxxxxxx \
  --allocation-id eipalloc-xxxxxxxxx
```

**Instance Specifications**:
- **Type**: t3.medium (2 vCPU, 4 GB RAM) - minimum
- **Storage**: 50 GB SSD
- **OS**: Ubuntu 22.04 LTS
- **Network**: VPC with public subnet
- **Security Groups**: 
  - Port 22 (SSH) - Your IP only
  - Port 80 (HTTP) - Open to 0.0.0.0/0
  - Port 443 (HTTPS) - Open to 0.0.0.0/0
  - Port 5432 (PostgreSQL) - Internal only

#### GCP Compute Engine

```bash
# Create VM instance
gcloud compute instances create spirit-tours-staging \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --tags=http-server,https-server

# Reserve static IP
gcloud compute addresses create spirit-tours-staging-ip \
  --region=us-central1
```

### Option 2: Docker Container Platform

#### Using AWS ECS

```yaml
# ecs-task-definition.json
{
  "family": "spirit-tours-staging",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "spirittours/backend:staging",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ENVIRONMENT",
          "value": "staging"
        }
      ]
    },
    {
      "name": "frontend",
      "image": "spirittours/frontend:staging",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ]
    }
  ]
}
```

### Option 3: Kubernetes Cluster (For Scale)

```yaml
# kubernetes/staging/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spirit-tours-staging
  namespace: staging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: spirit-tours
      env: staging
  template:
    metadata:
      labels:
        app: spirit-tours
        env: staging
    spec:
      containers:
      - name: backend
        image: spirittours/backend:staging
        ports:
        - containerPort: 8000
        env:
        - name: ENVIRONMENT
          value: "staging"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: staging-secrets
              key: database-url
      - name: frontend
        image: spirittours/frontend:staging
        ports:
        - containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: spirit-tours-staging-service
  namespace: staging
spec:
  type: LoadBalancer
  selector:
    app: spirit-tours
    env: staging
  ports:
  - name: http
    port: 80
    targetPort: 8000
  - name: https
    port: 443
    targetPort: 8000
```

---

## Database Configuration

### PostgreSQL Staging Database

#### Option 1: Managed Database Service (Recommended)

**AWS RDS**:
```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier spirit-tours-staging-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.3 \
  --master-username spirittours_admin \
  --master-user-password 'CHANGE_ME_STRONG_PASSWORD' \
  --allocated-storage 20 \
  --db-name spirittours_staging \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --backup-retention-period 7 \
  --publicly-accessible false
```

**Google Cloud SQL**:
```bash
# Create Cloud SQL instance
gcloud sql instances create spirit-tours-staging-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=CHANGE_ME_STRONG_PASSWORD \
  --backup \
  --backup-start-time=03:00

# Create database
gcloud sql databases create spirittours_staging \
  --instance=spirit-tours-staging-db
```

#### Option 2: Self-Managed PostgreSQL

```bash
# Install PostgreSQL on Ubuntu
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Create staging database and user
sudo -u postgres psql <<EOF
CREATE DATABASE spirittours_staging;
CREATE USER spirittours_staging WITH ENCRYPTED PASSWORD 'staging_password_here';
GRANT ALL PRIVILEGES ON DATABASE spirittours_staging TO spirittours_staging;
\c spirittours_staging
GRANT ALL ON SCHEMA public TO spirittours_staging;
EOF

# Configure PostgreSQL for remote access (if needed)
sudo nano /etc/postgresql/15/main/postgresql.conf
# listen_addresses = '*'

sudo nano /etc/postgresql/15/main/pg_hba.conf
# host    all    all    10.0.0.0/8    md5

sudo systemctl restart postgresql
```

### Database Migration to Staging

```bash
# 1. SSH into staging server
ssh ubuntu@staging.spirittours.com

# 2. Clone repository
git clone https://github.com/spirittours/spirittours-platform.git
cd spirittours-platform/backend

# 3. Install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. Set environment variables
export DATABASE_URL="postgresql://spirittours_staging:password@localhost:5432/spirittours_staging"
export ENVIRONMENT="staging"

# 5. Run migrations
alembic upgrade head

# 6. Verify tables created
psql $DATABASE_URL -c "\dt"
```

### Load Test Data (Optional)

```bash
# Create seed script
cat > seed_staging_data.py <<'EOF'
#!/usr/bin/env python3
"""
Seed staging database with test data
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import User, Tour, Booking
from auth.password import get_password_hash
from datetime import datetime, timedelta

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def seed_data():
    db = SessionLocal()
    
    # Create test users
    users = [
        User(
            email="test.user@example.com",
            password_hash=get_password_hash("TestPass123!"),
            full_name="Test User",
            role="customer"
        ),
        User(
            email="admin@spirittours.com",
            password_hash=get_password_hash("AdminPass123!"),
            full_name="Admin User",
            role="admin"
        )
    ]
    db.add_all(users)
    
    # Create test tours
    tours = [
        Tour(
            id="TOUR-001",
            name="Machu Picchu Adventure",
            description="5-day trek to Machu Picchu",
            destination="Peru",
            duration_days=5,
            price=1299.99,
            is_active=True
        ),
        Tour(
            id="TOUR-002",
            name="Amazon Rainforest Expedition",
            description="7-day Amazon exploration",
            destination="Brazil",
            duration_days=7,
            price=1899.99,
            is_active=True
        )
    ]
    db.add_all(tours)
    
    db.commit()
    print("✅ Staging data seeded successfully")

if __name__ == "__main__":
    seed_data()
EOF

# Run seed script
python seed_staging_data.py
```

---

## Application Deployment

### Method 1: Manual Deployment (Quick Setup)

```bash
# 1. SSH into staging server
ssh ubuntu@staging.spirittours.com

# 2. Pull latest code
cd /opt/spirittours
git fetch origin
git checkout main
git pull origin main

# 3. Backend deployment
cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head

# Stop existing service
sudo systemctl stop spirittours-backend

# Start backend with supervisor
sudo supervisorctl restart spirittours-backend

# 4. Frontend deployment
cd ../frontend
npm install
npm run build

# Copy build to nginx
sudo rm -rf /var/www/spirittours/html/*
sudo cp -r build/* /var/www/spirittours/html/

# Restart nginx
sudo systemctl reload nginx

# 5. Verify deployment
curl -I https://staging.spirittours.com
```

### Method 2: Docker Deployment

```bash
# 1. Build Docker images
docker build -t spirittours/backend:staging -f docker/Dockerfile.backend .
docker build -t spirittours/frontend:staging -f docker/Dockerfile.frontend .

# 2. Push to registry
docker push spirittours/backend:staging
docker push spirittours/frontend:staging

# 3. Deploy on staging server
ssh ubuntu@staging.spirittours.com

# Pull images
docker pull spirittours/backend:staging
docker pull spirittours/frontend:staging

# Stop existing containers
docker-compose -f docker-compose.staging.yml down

# Start new containers
docker-compose -f docker-compose.staging.yml up -d

# Verify
docker ps
docker logs spirittours-backend-staging
```

**docker-compose.staging.yml**:
```yaml
version: '3.8'

services:
  backend:
    image: spirittours/backend:staging
    container_name: spirittours-backend-staging
    environment:
      - ENVIRONMENT=staging
      - DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_TEST_KEY}
      - SENDGRID_API_KEY=${SENDGRID_TEST_KEY}
    ports:
      - "8000:8000"
    restart: unless-stopped
    networks:
      - spirittours-staging

  frontend:
    image: spirittours/frontend:staging
    container_name: spirittours-frontend-staging
    ports:
      - "3000:3000"
    restart: unless-stopped
    networks:
      - spirittours-staging
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    container_name: spirittours-nginx-staging
    volumes:
      - ./nginx/staging.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped
    networks:
      - spirittours-staging
    depends_on:
      - backend
      - frontend

networks:
  spirittours-staging:
    driver: bridge
```

### Method 3: CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches:
      - develop
      - staging
  workflow_dispatch:

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: spirittours

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push backend image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: staging-${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY-backend:$IMAGE_TAG -f docker/Dockerfile.backend .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY-backend:$IMAGE_TAG
      
      - name: Build and push frontend image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: staging-${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY-frontend:$IMAGE_TAG -f docker/Dockerfile.frontend .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY-frontend:$IMAGE_TAG
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster spirit-tours-staging \
            --service spirit-tours-backend \
            --force-new-deployment
      
      - name: Run database migrations
        run: |
          # SSH into ECS task and run migrations
          aws ecs execute-command \
            --cluster spirit-tours-staging \
            --task <task-id> \
            --container backend \
            --interactive \
            --command "alembic upgrade head"
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Environment Variables

### Staging Environment Configuration

Create `/opt/spirittours/backend/.env.staging`:

```bash
# Environment
ENVIRONMENT=staging
DEBUG=false

# Database (Staging PostgreSQL)
DATABASE_URL=postgresql://spirittours_staging:PASSWORD@staging-db.internal:5432/spirittours_staging
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_ECHO=false

# Security
SECRET_KEY=<generate-with-openssl-rand-hex-32>
JWT_SECRET_KEY=<generate-with-openssl-rand-hex-32>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Stripe (TEST MODE - Critical!)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxxxxxxxxxxxxxxxxx

# SendGrid (Separate test API key)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=staging@spirittours.com
FROM_NAME=Spirit Tours Staging

# Frontend URL
FRONTEND_URL=https://staging.spirittours.com
BACKEND_URL=https://api.staging.spirittours.com

# CORS
CORS_ORIGINS=https://staging.spirittours.com,https://api.staging.spirittours.com

# Redis (if using)
REDIS_URL=redis://staging-redis.internal:6379/0

# Monitoring (Optional but recommended)
SENTRY_DSN=https://xxxxxxxxxx@sentry.io/staging
DATADOG_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_REVIEWS=true
ENABLE_PWA=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
```

### Generate Secure Keys

```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Generate JWT_SECRET_KEY  
openssl rand -hex 32

# Example output:
# a4f8b2c9d7e3f1a6b5c8d2e9f3a7b4c1d8e5f2a9b6c3d0e7f4a1b8c5d2e9f6a3
```

---

## Testing Checklist

### Pre-Deployment Tests

- [ ] All unit tests passing (`pytest backend/tests/`)
- [ ] Integration tests passing
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificate valid
- [ ] DNS records configured

### Post-Deployment Tests

#### Health Checks

```bash
# 1. Backend health check
curl https://api.staging.spirittours.com/health
# Expected: {"status": "healthy", "environment": "staging"}

# 2. Database connection
curl https://api.staging.spirittours.com/health/db
# Expected: {"database": "connected"}

# 3. Frontend accessibility
curl -I https://staging.spirittours.com
# Expected: HTTP/2 200
```

#### Functional Tests

```bash
# Test user registration
curl -X POST https://api.staging.spirittours.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "full_name": "Test User"
  }'

# Test login
curl -X POST https://api.staging.spirittours.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# Test tour listing
curl https://api.staging.spirittours.com/api/v1/tours

# Test payment creation (Stripe test mode)
curl -X POST https://api.staging.spirittours.com/api/v1/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "booking_id": "BK-TEST-001",
    "amount": 100.00
  }'
```

#### Performance Tests

```bash
# Load test with Apache Bench
ab -n 1000 -c 10 https://staging.spirittours.com/

# Load test API endpoints
ab -n 500 -c 5 https://api.staging.spirittours.com/api/v1/tours
```

### Test Data Validation

- [ ] **Test Users**: 5-10 test user accounts created
- [ ] **Test Tours**: 10-20 sample tours with varied data
- [ ] **Test Bookings**: Various booking states (pending, confirmed, cancelled)
- [ ] **Test Payments**: Stripe test transactions (successful and failed)
- [ ] **Test Reviews**: Sample reviews for different tours
- [ ] **Test Analytics**: Verify analytics data aggregation

---

## Monitoring Setup

### Application Monitoring

#### Option 1: Sentry (Error Tracking)

```python
# backend/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

if os.getenv("ENVIRONMENT") == "staging":
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        environment="staging",
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,  # 10% of transactions
    )
```

#### Option 2: DataDog (Full Observability)

```yaml
# docker-compose.staging.yml - Add DataDog agent
services:
  datadog:
    image: datadog/agent:latest
    environment:
      - DD_API_KEY=${DATADOG_API_KEY}
      - DD_SITE=datadoghq.com
      - DD_LOGS_ENABLED=true
      - DD_APM_ENABLED=true
      - DD_ENV=staging
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /proc/:/host/proc/:ro
      - /sys/fs/cgroup/:/host/sys/fs/cgroup:ro
```

### Log Aggregation

```bash
# Setup log rotation
sudo nano /etc/logrotate.d/spirittours

/var/log/spirittours/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
```

### Uptime Monitoring

```bash
# Simple uptime monitor with cron
cat > /opt/spirittours/monitor.sh <<'EOF'
#!/bin/bash
ENDPOINT="https://staging.spirittours.com"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT)

if [ $RESPONSE -ne 200 ]; then
  echo "Staging is DOWN - HTTP $RESPONSE" | mail -s "ALERT: Staging Down" devops@spirittours.com
fi
EOF

chmod +x /opt/spirittours/monitor.sh

# Add to crontab (check every 5 minutes)
*/5 * * * * /opt/spirittours/monitor.sh
```

---

## Rollback Procedures

### Quick Rollback (Docker)

```bash
# 1. List recent images
docker images spirittours/backend --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}"

# 2. Stop current containers
docker-compose -f docker-compose.staging.yml down

# 3. Update docker-compose.yml to previous image tag
sed -i 's/staging-abc123/staging-xyz789/g' docker-compose.staging.yml

# 4. Start containers with previous version
docker-compose -f docker-compose.staging.yml up -d

# 5. Verify rollback
curl https://api.staging.spirittours.com/health
```

### Database Rollback

```bash
# 1. Check current migration version
alembic current

# 2. Downgrade to previous version
alembic downgrade -1

# Or downgrade to specific revision
alembic downgrade abc123

# 3. Verify database state
psql $DATABASE_URL -c "SELECT version_num FROM alembic_version;"
```

### Full System Rollback

```bash
# 1. Identify last stable deployment
git log --oneline -10

# 2. Checkout previous stable version
git checkout <commit-hash>

# 3. Redeploy
./scripts/deploy-staging.sh

# 4. Restore database backup (if needed)
pg_restore -d spirittours_staging backup_before_deployment.dump

# 5. Clear caches
redis-cli -h staging-redis.internal FLUSHALL

# 6. Verify system
./scripts/health-check.sh
```

---

## Common Issues

### Issue 1: Database Connection Fails

**Symptom**: `sqlalchemy.exc.OperationalError: could not connect to server`

**Solutions**:
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection string
psql $DATABASE_URL -c "SELECT 1"

# Check firewall rules
sudo ufw status

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Issue 2: SSL Certificate Issues

**Symptom**: `NET::ERR_CERT_AUTHORITY_INVALID`

**Solutions**:
```bash
# Renew Let's Encrypt certificate
sudo certbot renew --nginx

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/staging.spirittours.com/fullchain.pem -noout -dates

# Test SSL configuration
openssl s_client -connect staging.spirittours.com:443
```

### Issue 3: High Memory Usage

**Symptom**: Server becomes slow or unresponsive

**Solutions**:
```bash
# Check memory usage
free -h
top

# Restart services
sudo systemctl restart spirittours-backend
sudo systemctl restart nginx

# Check for memory leaks
ps aux --sort=-%mem | head -10

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Issue 4: Stripe Webhooks Not Working

**Symptom**: Payment confirmations not processing

**Solutions**:
```bash
# Test webhook endpoint
curl -X POST https://api.staging.spirittours.com/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type": "payment_intent.succeeded"}'

# Check Stripe webhook logs
# Go to Stripe Dashboard > Developers > Webhooks

# Verify webhook secret
echo $STRIPE_WEBHOOK_SECRET

# Check application logs
sudo journalctl -u spirittours-backend -f | grep webhook
```

---

## Maintenance

### Daily Tasks

- [ ] Check application logs for errors
- [ ] Monitor database size and performance
- [ ] Verify backup completion
- [ ] Check SSL certificate expiry (30 days warning)

### Weekly Tasks

- [ ] Review and clean up old logs
- [ ] Update test data if needed
- [ ] Run security scans
- [ ] Review monitoring alerts

### Monthly Tasks

- [ ] Update dependencies (security patches)
- [ ] Review and optimize database queries
- [ ] Conduct penetration testing
- [ ] Review and update staging data

---

## Security Checklist

### Server Security

- [ ] SSH key-based authentication only (no passwords)
- [ ] Firewall configured (ufw or security groups)
- [ ] Fail2ban installed and configured
- [ ] Regular security updates applied
- [ ] Non-root user for application
- [ ] File permissions properly set

### Application Security

- [ ] All secrets in environment variables (not in code)
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection enabled
- [ ] CSRF protection enabled

### Database Security

- [ ] Strong database passwords
- [ ] Database not publicly accessible
- [ ] Regular backups encrypted
- [ ] Connection pooling configured
- [ ] Query logging for audit trail

---

## Performance Optimization

### Backend Optimization

```python
# Add caching for frequently accessed data
from functools import lru_cache

@lru_cache(maxsize=128)
def get_tours_cached():
    return db.query(Tour).filter(Tour.is_active == True).all()

# Use database connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True
)
```

### Frontend Optimization

```bash
# Build optimized production bundle
npm run build

# Enable gzip compression in nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;

# Add caching headers
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Database Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_tours_destination ON tours(destination);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM tours WHERE destination = 'Peru';

-- Vacuum and analyze (weekly maintenance)
VACUUM ANALYZE;
```

---

## Contact Information

### Staging Environment Access

- **URL**: https://staging.spirittours.com
- **API**: https://api.staging.spirittours.com
- **Admin Panel**: https://staging.spirittours.com/admin

### Support Contacts

- **DevOps Team**: devops@spirittours.com
- **Development Team**: dev@spirittours.com
- **On-Call**: +1-xxx-xxx-xxxx (PagerDuty)

### Emergency Procedures

1. **Critical Issue**: Contact on-call engineer via PagerDuty
2. **Database Issue**: Contact DBA team immediately
3. **Security Incident**: Contact security@spirittours.com

---

## Additional Resources

- [Production Deployment Guide](./PRODUCTION_SETUP.md)
- [Monitoring Setup Guide](./MONITORING_SETUP.md)
- [Security Checklist](./SECURITY_CHECKLIST.md)
- [Database Migration Guide](./DATABASE_MIGRATION.md)

---

**Last Updated**: November 14, 2025  
**Version**: 1.0.0  
**Maintained By**: DevOps Team  
**Review Schedule**: Quarterly
