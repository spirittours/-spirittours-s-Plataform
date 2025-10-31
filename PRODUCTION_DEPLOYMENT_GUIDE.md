# 🚀 Spirit Tours - Production Deployment Guide

Complete guide for deploying the Spirit Tours platform to production.

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Server Requirements](#server-requirements)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [WebSocket Configuration](#websocket-configuration)
7. [SSL/TLS Setup](#ssltls-setup)
8. [Environment Variables](#environment-variables)
9. [Monitoring & Logging](#monitoring--logging)
10. [Backup Strategy](#backup-strategy)
11. [Scaling](#scaling)
12. [Troubleshooting](#troubleshooting)

---

## 🔍 Pre-Deployment Checklist

### Code Quality
- [ ] All unit tests passing (63/63)
- [ ] Integration tests completed
- [ ] Code review approved
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met

### Configuration
- [ ] All environment variables documented
- [ ] API keys and secrets secured
- [ ] Database migrations tested
- [ ] Backup procedures validated
- [ ] Monitoring tools configured

### Documentation
- [ ] API documentation complete
- [ ] User guides updated
- [ ] Admin manual ready
- [ ] Runbook created
- [ ] Disaster recovery plan

---

## 💻 Server Requirements

### Minimum Specifications

**Web Server (Backend + Frontend):**
- CPU: 4 cores
- RAM: 8 GB
- Storage: 50 GB SSD
- OS: Ubuntu 22.04 LTS
- Network: 100 Mbps

**Database Server:**
- CPU: 4 cores
- RAM: 16 GB
- Storage: 100 GB SSD (RAID 1)
- OS: Ubuntu 22.04 LTS
- PostgreSQL 14+

**WebSocket Server (Optional Separate):**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB SSD
- OS: Ubuntu 22.04 LTS

### Recommended Specifications (Production)

**Web Server:**
- CPU: 8 cores
- RAM: 16 GB
- Storage: 100 GB NVMe SSD
- Load Balancer support

**Database Server:**
- CPU: 8 cores
- RAM: 32 GB
- Storage: 500 GB NVMe SSD (RAID 10)
- Replication support

### Software Requirements

```bash
# System packages
- Node.js 18+ LTS
- Python 3.9+
- PostgreSQL 14+
- PostGIS 3+
- Nginx 1.18+
- Redis 6+ (for caching)
- PM2 (process manager)
- Certbot (for SSL)
```

---

## 🗄️ Database Setup

### 1. Install PostgreSQL + PostGIS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PostGIS
sudo apt install postgis postgresql-14-postgis-3 -y

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE spirit_tours;

# Create user
CREATE USER spirit_admin WITH ENCRYPTED PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE spirit_tours TO spirit_admin;

# Enable PostGIS
\c spirit_tours
CREATE EXTENSION IF NOT EXISTS postgis;

# Exit
\q
```

### 3. Run Migrations

```bash
# Navigate to project directory
cd /var/www/spirit-tours

# Run all migrations
psql -U spirit_admin -d spirit_tours -f backend/migrations/000_run_all_migrations.sql

# Verify tables created
psql -U spirit_admin -d spirit_tours -c "\dt"
```

### 4. Load Seed Data (Development Only)

```bash
# Load test data (only for staging/development)
psql -U spirit_admin -d spirit_tours -f backend/migrations/seed_data.sql
```

### 5. Configure PostgreSQL for Production

Edit `/etc/postgresql/14/main/postgresql.conf`:

```ini
# Memory
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 64MB
maintenance_work_mem = 1GB

# Connections
max_connections = 200

# WAL
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# Query Planner
random_page_cost = 1.1  # For SSD
effective_io_concurrency = 200  # For SSD

# Logging
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d.log'
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_min_duration_statement = 1000  # Log queries > 1 second
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

## 🔧 Backend Deployment

### 1. Install Dependencies

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/your-org/spirit-tours.git
cd spirit-tours

# Install Node.js dependencies
cd backend
npm install --production

# Install Python dependencies
pip3 install -r requirements.txt

# Set permissions
sudo chown -R www-data:www-data /var/www/spirit-tours
```

### 2. Configure Environment

Create `/var/www/spirit-tours/backend/.env`:

```bash
# Database
DATABASE_URL=postgresql://spirit_admin:your_secure_password@localhost:5432/spirit_tours

# Server
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# JWT
JWT_SECRET=your_very_long_random_secret_key_min_32_chars
JWT_EXPIRES_IN=7d

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token

# Twilio (SMS fallback)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email (SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
SMTP_FROM=noreply@spirit-tours.com

# Redis (caching)
REDIS_URL=redis://localhost:6379

# WebSocket
WEBSOCKET_PORT=3001
WEBSOCKET_PATH=/socket.io

# Monitoring
SENTRY_DSN=your_sentry_dsn_optional

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Setup PM2 for Backend

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create ecosystem file
cat > /var/www/spirit-tours/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'spirit-tours-api',
      cwd: '/var/www/spirit-tours/backend',
      script: 'server.js',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/var/log/spirit-tours/api-error.log',
      out_file: '/var/log/spirit-tours/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G'
    },
    {
      name: 'spirit-tours-websocket',
      cwd: '/var/www/spirit-tours/backend/services',
      script: 'websocket_server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/spirit-tours/ws-error.log',
      out_file: '/var/log/spirit-tours/ws-out.log',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M'
    }
  ]
};
EOF

# Create log directory
sudo mkdir -p /var/log/spirit-tours
sudo chown www-data:www-data /var/log/spirit-tours

# Start services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd -u www-data --hp /var/www

# Check status
pm2 status
pm2 logs
```

---

## 🌐 Frontend Deployment

### 1. Build Frontend

```bash
cd /var/www/spirit-tours/frontend

# Install dependencies
npm install

# Build for production
npm run build

# Output will be in /var/www/spirit-tours/frontend/build
```

### 2. Configure Nginx

Create `/etc/nginx/sites-available/spirit-tours`:

```nginx
# Upstream backends
upstream spirit_api {
    least_conn;
    server localhost:5000;
    keepalive 64;
}

upstream spirit_websocket {
    least_conn;
    server localhost:3001;
    keepalive 64;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name spirit-tours.com www.spirit-tours.com;
    
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name spirit-tours.com www.spirit-tours.com;
    
    # SSL certificates (Certbot will add these)
    # ssl_certificate /etc/letsencrypt/live/spirit-tours.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/spirit-tours.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Root directory
    root /var/www/spirit-tours/frontend/build;
    index index.html;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
    
    # Frontend static files
    location / {
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://spirit_api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket proxy
    location /socket.io/ {
        proxy_pass http://spirit_websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
    
    # Logs
    access_log /var/log/nginx/spirit-tours-access.log;
    error_log /var/log/nginx/spirit-tours-error.log;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/spirit-tours /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔐 SSL/TLS Setup

### Using Certbot (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d spirit-tours.com -d www.spirit-tours.com

# Test renewal
sudo certbot renew --dry-run

# Auto-renewal is configured via systemd timer
sudo systemctl status certbot.timer
```

### WebSocket SSL Configuration

WebSocket will automatically use SSL when accessed via `wss://` through the Nginx proxy.

Frontend WebSocket connection should use:
```javascript
const WS_URL = process.env.NODE_ENV === 'production'
  ? 'wss://spirit-tours.com'
  : 'ws://localhost:3001';
```

---

## 🔧 Environment Variables

### Backend `.env`

**Required:**
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/spirit_tours
JWT_SECRET=min_32_character_secret
WHATSAPP_ACCESS_TOKEN=your_token
TWILIO_AUTH_TOKEN=your_token
SMTP_PASS=your_password
```

**Optional:**
```bash
REDIS_URL=redis://localhost:6379
SENTRY_DSN=https://...
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend `.env.production`

```bash
REACT_APP_API_URL=https://spirit-tours.com/api
REACT_APP_WS_URL=wss://spirit-tours.com
REACT_APP_MAPBOX_TOKEN=your_mapbox_token
REACT_APP_GOOGLE_MAPS_KEY=your_google_maps_key
```

---

## 📊 Monitoring & Logging

### 1. Install Monitoring Tools

```bash
# Install Prometheus Node Exporter
sudo apt install prometheus-node-exporter -y

# Install Grafana
sudo apt install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
sudo apt update
sudo apt install grafana -y
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

### 2. Log Rotation

Create `/etc/logrotate.d/spirit-tours`:

```
/var/log/spirit-tours/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 3. Application Monitoring

Install PM2 monitoring:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

---

## 💾 Backup Strategy

### 1. Database Backups

Create `/usr/local/bin/backup-spirit-db.sh`:

```bash
#!/bin/bash

# Configuration
DB_NAME="spirit_tours"
DB_USER="spirit_admin"
BACKUP_DIR="/var/backups/spirit-tours"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -U $DB_USER -d $DB_NAME -F c -b -v -f "$BACKUP_DIR/spirit_tours_$DATE.backup"

# Compress
gzip "$BACKUP_DIR/spirit_tours_$DATE.backup"

# Remove old backups
find $BACKUP_DIR -name "*.backup.gz" -mtime +$RETENTION_DAYS -delete

# Upload to S3 (optional)
# aws s3 cp "$BACKUP_DIR/spirit_tours_$DATE.backup.gz" s3://your-backup-bucket/

echo "Backup completed: spirit_tours_$DATE.backup.gz"
```

Make executable and schedule:
```bash
sudo chmod +x /usr/local/bin/backup-spirit-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
0 2 * * * /usr/local/bin/backup-spirit-db.sh >> /var/log/spirit-tours/backup.log 2>&1
```

### 2. Application Backups

```bash
#!/bin/bash
# Backup code and configurations
tar -czf /var/backups/spirit-tours/app_$(date +%Y%m%d).tar.gz \
  /var/www/spirit-tours \
  /etc/nginx/sites-available/spirit-tours \
  --exclude='node_modules' \
  --exclude='.git'
```

---

## 📈 Scaling

### Horizontal Scaling (Load Balancer)

#### Nginx Load Balancer Configuration

```nginx
upstream spirit_api_cluster {
    least_conn;
    server backend1.local:5000 weight=3;
    server backend2.local:5000 weight=3;
    server backend3.local:5000 weight=2 backup;
    keepalive 64;
}

upstream spirit_ws_cluster {
    ip_hash;  # Sticky sessions for WebSocket
    server ws1.local:3001;
    server ws2.local:3001;
    keepalive 64;
}
```

### Vertical Scaling

1. **Increase PM2 instances:**
```bash
pm2 scale spirit-tours-api +2
```

2. **Database connection pooling:**
```javascript
const pool = new Pool({
  max: 50,  // Increase from 20
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Errors

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Test connection
psql -U spirit_admin -d spirit_tours -c "SELECT 1;"
```

#### 2. WebSocket Connection Issues

```bash
# Check if WebSocket server is running
pm2 list | grep websocket

# Check logs
pm2 logs spirit-tours-websocket --lines 100

# Test WebSocket connection
wscat -c wss://spirit-tours.com/socket.io/
```

#### 3. High Memory Usage

```bash
# Check PM2 processes
pm2 monit

# Restart specific app
pm2 restart spirit-tours-api

# Reload with zero downtime
pm2 reload ecosystem.config.js
```

#### 4. SSL Certificate Renewal Failed

```bash
# Check Certbot logs
sudo cat /var/log/letsencrypt/letsencrypt.log

# Manual renewal
sudo certbot renew --force-renewal
```

### Health Check Endpoints

Test your deployment:

```bash
# API health
curl https://spirit-tours.com/api/health

# Database connectivity
curl https://spirit-tours.com/api/health/db

# WebSocket health
curl https://spirit-tours.com/socket.io/health
```

---

## ✅ Post-Deployment Checklist

- [ ] All services running (pm2 status)
- [ ] SSL certificates valid
- [ ] Database migrations applied
- [ ] Backups configured and tested
- [ ] Monitoring dashboards accessible
- [ ] Logs rotating correctly
- [ ] Load testing passed
- [ ] Security scan completed
- [ ] Documentation updated
- [ ] Team trained on deployment

---

## 📞 Support

For deployment issues:
- **Email:** devops@spirit-tours.com
- **Slack:** #spirit-tours-deploy
- **Emergency:** On-call rotation

---

**Last Updated:** October 25, 2024  
**Version:** 1.0.0  
**Status:** Production Ready
