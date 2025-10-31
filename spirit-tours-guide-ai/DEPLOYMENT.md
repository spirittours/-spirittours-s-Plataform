# Spirit Tours AI Guide - Deployment Guide

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Installation](#application-installation)
5. [Production Deployment](#production-deployment)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **PostgreSQL**: v14.0 or higher
- **Redis**: v6.0 or higher (optional but recommended)
- **MongoDB**: v5.0 or higher (optional)

### Required Accounts

- OpenAI API Key (for AI orchestrator)
- Stripe Account (for payments)
- PayPal Business Account (for payments)
- WhatsApp Business API Access
- Google Cloud Account (for maps, business messages)
- AWS Account (for S3 storage)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/spirittours/-spirittours-s-Plataform.git
cd spirit-tours-guide-ai
```

### 2. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies (if separated)
cd frontend
npm install
cd ..
```

### 3. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file with your actual credentials
nano .env
```

**Critical Environment Variables to Configure:**

```bash
# Database
POSTGRES_HOST=your-postgres-host
POSTGRES_DB=spirit_tours_db
POSTGRES_USER=your-user
POSTGRES_PASSWORD=your-password

# Redis
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password

# AI Providers (at least one required)
OPENAI_API_KEY=sk-your-key
GROK_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
GOOGLE_API_KEY=your-key

# Payments
STRIPE_SECRET_KEY=sk_live_your-key
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-secret
PAYPAL_MODE=live

# WhatsApp
WHATSAPP_ACCESS_TOKEN=your-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-id

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key
```

---

## Database Setup

### PostgreSQL Setup

#### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE spirit_tours_db;

# Create user
CREATE USER spirit_tours_user WITH ENCRYPTED PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE spirit_tours_db TO spirit_tours_user;

# Exit
\q
```

#### 2. Run Migrations

```bash
# The application will auto-create tables on first run
# Or manually run migration scripts if provided

npm run migrate
```

### Redis Setup

#### Using Docker (Recommended for Development)

```bash
docker run -d \
  --name spirit-tours-redis \
  -p 6379:6379 \
  redis:alpine redis-server --requirepass your_redis_password
```

#### Production Redis

- Use managed Redis service (AWS ElastiCache, Redis Cloud, etc.)
- Configure connection pooling
- Enable persistence (RDB + AOF)
- Set up replication for high availability

### MongoDB Setup (Optional)

```bash
# Using Docker
docker run -d \
  --name spirit-tours-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=your_password \
  mongo:latest

# Create application database
mongosh --username admin --password your_password
use spirit_tours
db.createUser({
  user: "spirit_tours_user",
  pwd: "your_password",
  roles: ["readWrite"]
})
```

---

## Application Installation

### 1. Build Frontend

```bash
# Build React frontend for production
npm run build:frontend

# This creates optimized bundle in frontend/build
```

### 2. Test Locally

```bash
# Run in development mode
npm run dev

# Or run production build locally
NODE_ENV=production npm start
```

### 3. Verify Endpoints

```bash
# Health check
curl http://localhost:3001/health

# Should return:
# {"status":"healthy","timestamp":"...","uptime":...}
```

---

## Production Deployment

### Option 1: Traditional VPS (Ubuntu/Debian)

#### 1. Setup Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Install PM2 globally
npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

#### 2. Clone and Configure

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/spirittours/-spirittours-s-Plataform.git spirit-tours
cd spirit-tours

# Install dependencies
npm install --production

# Configure environment
sudo nano .env
# (Paste your production environment variables)

# Build frontend
npm run build
```

#### 3. Setup PM2

```bash
# Start application with PM2
pm2 start backend/server.js --name spirit-tours-api

# Configure PM2 to restart on system reboot
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs spirit-tours-api
```

#### 4. Configure Nginx as Reverse Proxy

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/spirit-tours

# Paste configuration:
```

```nginx
server {
    listen 80;
    server_name api.spirittours.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.spirittours.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.spirittours.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.spirittours.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static Files
    location / {
        root /var/www/spirit-tours/frontend/build;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/spirit-tours /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### 5. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d api.spirittours.com

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile

```dockerfile
# Dockerfile already provided in project
# Build image:
docker build -t spirit-tours-api:latest .

# Run container:
docker run -d \
  --name spirit-tours-api \
  -p 3001:3001 \
  --env-file .env \
  --restart unless-stopped \
  spirit-tours-api:latest
```

#### 2. Docker Compose (Recommended)

```bash
# Use docker-compose.yml provided
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 3: Cloud Platforms

#### AWS EC2 / Lightsail

1. Launch instance (Ubuntu 20.04 LTS recommended)
2. Install Node.js, PostgreSQL, Redis
3. Follow VPS deployment steps above
4. Configure security groups for ports 80, 443, 3001
5. Use RDS for PostgreSQL (recommended for production)
6. Use ElastiCache for Redis (recommended for production)

#### Heroku

```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create spirit-tours-api

# Add addons
heroku addons:create heroku-postgresql:standard-0
heroku addons:create heroku-redis:premium-0

# Configure environment
heroku config:set NODE_ENV=production
heroku config:set OPENAI_API_KEY=your-key
# ... (set all required variables)

# Deploy
git push heroku main

# Scale
heroku ps:scale web=2
```

#### DigitalOcean App Platform

1. Connect GitHub repository
2. Select branch (main)
3. Configure environment variables
4. Add PostgreSQL managed database
5. Add Redis managed database
6. Deploy automatically

---

## Monitoring & Maintenance

### Health Checks

```bash
# Setup health check monitoring
# Using UptimeRobot, Pingdom, or custom solution

# Health endpoint
GET https://api.spirittours.com/health

# Database health
GET https://api.spirittours.com/api/health/database
```

### Logging

```bash
# PM2 Logs
pm2 logs spirit-tours-api --lines 100

# Application logs (if using file logging)
tail -f logs/combined.log
tail -f logs/error.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Performance Monitoring

**Recommended Tools:**
- **PM2 Plus**: Application monitoring
- **New Relic**: APM and infrastructure monitoring
- **Datadog**: Full-stack monitoring
- **Sentry**: Error tracking

```bash
# Install monitoring agent
npm install @sentry/node

# Configure in backend/server.js
```

### Database Backups

```bash
# Automated PostgreSQL backup script
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/spirit_tours_$TIMESTAMP.sql"

# Create backup
pg_dump -U spirit_tours_user spirit_tours_db > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Upload to S3 (optional)
aws s3 cp "$BACKUP_FILE.gz" s3://your-backup-bucket/postgres/

# Delete old backups (keep last 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /path/to/backup_script.sh
```

### Updates and Patches

```bash
# Update application
cd /var/www/spirit-tours
git pull origin main
npm install --production
npm run build
pm2 restart spirit-tours-api

# Update dependencies (security patches)
npm audit
npm audit fix

# Update system packages
sudo apt update && sudo apt upgrade -y
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U spirit_tours_user -d spirit_tours_db

# Check firewall
sudo ufw status
sudo ufw allow 5432/tcp
```

#### 2. Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Test with password
redis-cli -a your_password ping

# Check logs
sudo journalctl -u redis -n 50
```

#### 3. Application Won't Start

```bash
# Check logs
pm2 logs spirit-tours-api --err

# Check port availability
sudo netstat -tulpn | grep 3001

# Check environment variables
pm2 env 0

# Restart with verbose logging
NODE_ENV=development pm2 restart spirit-tours-api
```

#### 4. WebSocket Connection Issues

```bash
# Check Nginx configuration
sudo nginx -t

# Verify WebSocket headers
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:3001/socket.io/

# Check firewall
sudo ufw allow 3001/tcp
```

#### 5. High Memory Usage

```bash
# Check process memory
pm2 monit

# Restart application
pm2 restart spirit-tours-api

# Increase Node.js memory limit
pm2 delete spirit-tours-api
pm2 start backend/server.js --name spirit-tours-api --max-memory-restart 1G
```

### Performance Optimization

```bash
# Enable Nginx caching
# Add to nginx config:
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;

# In location block:
proxy_cache api_cache;
proxy_cache_valid 200 60m;
proxy_cache_use_stale error timeout http_500 http_502 http_503;
```

### Security Hardening

```bash
# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable

# Disable root SSH login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd

# Setup fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Support & Documentation

- **GitHub Repository**: https://github.com/spirittours/-spirittours-s-Plataform
- **API Documentation**: https://api.spirittours.com/api-docs
- **Technical Support**: tech@spirittours.com

---

## Maintenance Schedule

### Daily
- Monitor error logs
- Check health endpoints
- Review performance metrics

### Weekly
- Review database performance
- Check disk space usage
- Update security patches

### Monthly
- Full system backup verification
- Performance optimization review
- Security audit
- Dependency updates

### Quarterly
- Infrastructure review
- Cost optimization analysis
- Disaster recovery testing
- Capacity planning

---

**Last Updated**: January 21, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
