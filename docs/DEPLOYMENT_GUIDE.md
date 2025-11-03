# 🚀 AI Accounting Agent - Deployment Guide

**Version**: 1.0  
**Last Updated**: 2025-11-03  
**Estimated Deployment Time**: 2-4 hours

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Running Locally](#running-locally)
7. [Production Deployment](#production-deployment)
8. [Docker Deployment](#docker-deployment)
9. [Monitoring & Logging](#monitoring--logging)
10. [Backup & Recovery](#backup--recovery)
11. [Security Checklist](#security-checklist)
12. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### System Requirements

**Minimum**:
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB
- OS: Linux (Ubuntu 20.04+), macOS, Windows 10+

**Recommended** (Production):
- CPU: 4+ cores
- RAM: 8+ GB
- Storage: 50+ GB SSD
- OS: Linux (Ubuntu 22.04 LTS)

### Software Requirements

| Software | Minimum Version | Recommended | Purpose |
|----------|----------------|-------------|---------|
| Node.js | 18.x | 20.x LTS | Backend runtime |
| npm | 8.x | 10.x | Package manager |
| MongoDB | 5.0 | 7.0 | Database |
| Git | 2.x | Latest | Version control |
| Python | 3.8+ | 3.11+ | (Optional) Scripts |

### External Services

**Required**:
- ✅ **OpenAI Account** - GPT-4 Turbo API access
- ✅ **Anthropic Account** - Claude 3.5 Sonnet API access (fallback)
- ✅ **MongoDB Atlas** (or self-hosted MongoDB)

**Optional** (for full functionality):
- 🟡 **Finkok/SW/Diverza** - Mexico PAC providers for CFDI stamping
- 🟡 **Email Service** (SendGrid, Mailgun, etc.)
- 🟡 **Cloud Storage** (AWS S3, Google Cloud Storage, Azure Blob)

---

## 🔧 Environment Setup

### 1. Install Node.js

**Ubuntu/Debian**:
```bash
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

**macOS** (using Homebrew):
```bash
brew install node@20
brew link node@20
```

**Windows**:
Download and install from https://nodejs.org/

### 2. Install MongoDB

**Option A: MongoDB Atlas (Cloud)** - RECOMMENDED
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Whitelist your IP address
4. Create database user
5. Get connection string

**Option B: Local MongoDB (Ubuntu)**:
```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
sudo systemctl status mongod
```

### 3. Install Git

```bash
# Ubuntu/Debian
sudo apt-get install -y git

# macOS
brew install git

# Verify
git --version
```

---

## 📦 Installation

### 1. Clone Repository

```bash
# Clone from GitHub
git clone https://github.com/spirittours/-spirittours-s-Plataform.git
cd -spirittours-s-Plataform

# Or if you have the code locally
cd /path/to/your/project
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install

# This will install:
# - express, mongoose, openai, @anthropic-ai/sdk
# - langchain, uuid, winston, helmet, cors
# - Plus all other dependencies from package.json
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install

# This will install:
# - react, react-dom, react-router-dom
# - @mui/material, @emotion/react, axios
# - Plus all other dependencies from package.json
```

---

## ⚙️ Configuration

### 1. Create Environment File

Create `.env` file in **backend** directory:

```bash
cd backend
cp .env.example .env  # If example exists
# OR
nano .env  # Create new file
```

### 2. Environment Variables

Add the following to your `.env` file:

```env
# ================================
# SERVER CONFIGURATION
# ================================
NODE_ENV=production
PORT=8000
HOST=0.0.0.0

# ================================
# DATABASE
# ================================
# MongoDB Atlas (Cloud)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-accounting-agent?retryWrites=true&w=majority

# OR Local MongoDB
# MONGODB_URI=mongodb://localhost:27017/ai-accounting-agent

# Database Connection Options
DB_MAX_POOL_SIZE=10
DB_MIN_POOL_SIZE=5
DB_SOCKET_TIMEOUT_MS=45000
DB_SERVER_SELECTION_TIMEOUT_MS=5000

# ================================
# AI PROVIDERS
# ================================
# OpenAI (Primary)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_ORG_ID=org-xxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Optional
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_TEMPERATURE=0.1
OPENAI_MAX_TOKENS=4000
OPENAI_TIMEOUT=30000

# Anthropic Claude (Fallback)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_TEMPERATURE=0.1
ANTHROPIC_MAX_TOKENS=4000

# ================================
# AUTHENTICATION & SECURITY
# ================================
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Password Requirements
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_SPECIAL=true

# Session
SESSION_SECRET=your-session-secret-key-change-this-min-32-chars
SESSION_TIMEOUT=3600000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# ================================
# MEXICO COMPLIANCE (PAC Providers)
# ================================
# Finkok
FINKOK_API_URL=https://api.finkok.com/servicios/soap
FINKOK_USERNAME=your-finkok-username
FINKOK_PASSWORD=your-finkok-password
FINKOK_RFC=your-company-rfc

# SW Sapien
SW_API_URL=https://api.sw.com.mx
SW_API_KEY=your-sw-api-key
SW_API_TOKEN=your-sw-api-token

# Diverza
DIVERZA_API_URL=https://api.diverza.com.mx
DIVERZA_API_KEY=your-diverza-api-key
DIVERZA_API_SECRET=your-diverza-secret

# Default PAC Provider
PAC_PROVIDER=finkok

# ================================
# USA COMPLIANCE
# ================================
# IRS E-File (if applicable)
IRS_TIN=your-company-tin
IRS_TRANSMITTER_CONTROL_CODE=your-tcc

# ================================
# EMAIL CONFIGURATION
# ================================
EMAIL_PROVIDER=sendgrid  # or 'smtp', 'mailgun', 'ses'

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=AI Accounting Agent

# OR SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# ================================
# CLOUD STORAGE (Optional)
# ================================
STORAGE_PROVIDER=s3  # or 'gcs', 'azure', 'local'

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# OR Google Cloud Storage
GCS_PROJECT_ID=your-project-id
GCS_KEYFILE_PATH=/path/to/keyfile.json
GCS_BUCKET=your-bucket-name

# OR Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
AZURE_STORAGE_CONTAINER=your-container-name

# ================================
# LOGGING & MONITORING
# ================================
LOG_LEVEL=info  # debug, info, warn, error
LOG_FILE_PATH=./logs/app.log
LOG_MAX_FILES=14
LOG_MAX_SIZE=20m

# Error Tracking (Optional)
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxx@sentry.io/1234567

# ================================
# FEATURES FLAGS
# ================================
ENABLE_FRAUD_DETECTION=true
ENABLE_DUAL_REVIEW=true
ENABLE_PREDICTIVE_ANALYTICS=true
ENABLE_AI_CHAT=true

# ================================
# CORS & FRONTEND
# ================================
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
CORS_CREDENTIALS=true

# ================================
# MISCELLANEOUS
# ================================
TIMEZONE=America/New_York
DEFAULT_LANGUAGE=es
DEFAULT_CURRENCY=USD
DEFAULT_COUNTRY=USA

# File Upload Limits
MAX_FILE_SIZE=10485760  # 10 MB in bytes
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,xlsx,csv,xml

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
```

### 3. Frontend Configuration

Create `.env` file in **frontend** directory:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_TIMEOUT=30000

# Environment
REACT_APP_ENV=production

# Features
REACT_APP_ENABLE_AI_CHAT=true
REACT_APP_ENABLE_FRAUD_ALERTS=true

# Analytics (Optional)
REACT_APP_GA_TRACKING_ID=UA-XXXXXXXXX-X
```

---

## 🗄️ Database Setup

### 1. Create Database

If using MongoDB Atlas, the database is created automatically.

For local MongoDB:

```bash
# Connect to MongoDB
mongosh

# Create database
use ai-accounting-agent

# Create admin user
db.createUser({
  user: "admin",
  pwd: "secure-password-here",
  roles: [
    { role: "readWrite", db: "ai-accounting-agent" },
    { role: "dbAdmin", db: "ai-accounting-agent" }
  ]
})

# Exit
exit
```

### 2. Create Indexes

Run the index creation script:

```bash
cd backend
node scripts/create-indexes.js
```

Or manually in MongoDB:

```javascript
use ai-accounting-agent

// ReviewConfig indexes
db.reviewconfigs.createIndex({ organizationId: 1, country: 1 })
db.reviewconfigs.createIndex({ organizationId: 1, branchId: 1, country: 1 })

// ReviewQueue indexes
db.reviewqueues.createIndex({ status: 1, priority: -1, createdAt: 1 })
db.reviewqueues.createIndex({ organizationId: 1, status: 1 })
db.reviewqueues.createIndex({ assignedTo: 1, status: 1 })

// ChecklistExecution indexes
db.checklistexecutions.createIndex({ transactionId: 1, checklistType: 1 })
db.checklistexecutions.createIndex({ organizationId: 1, status: 1 })
db.checklistexecutions.createIndex({ status: 1, createdAt: -1 })

// Add more indexes as needed for other collections
```

### 3. Seed Initial Data (Optional)

```bash
cd backend
node scripts/seed-data.js
```

This will create:
- Default admin user
- Sample organizations
- Default configurations
- Test data for development

---

## 🏃 Running Locally

### 1. Start Backend

```bash
cd backend

# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Check if running
curl http://localhost:8000/health
```

Expected output:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-03T10:30:00Z",
  "services": {
    "database": "connected",
    "openai": "available",
    "claude": "available"
  }
}
```

### 2. Start Frontend

In a new terminal:

```bash
cd frontend

# Development mode
npm start

# Production build
npm run build
```

Frontend will be available at: http://localhost:3000

### 3. Verify Installation

**Check Backend**:
```bash
# Health check
curl http://localhost:8000/health

# Check AI Agent status
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/ai-agent/core/status
```

**Check Frontend**:
1. Open http://localhost:3000 in browser
2. Login with default credentials
3. Navigate to AI Agent dashboard
4. Verify all services are accessible

---

## 🌐 Production Deployment

### Option 1: Traditional Server Deployment (Ubuntu)

#### 1. Prepare Server

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install dependencies
sudo apt-get install -y build-essential git nginx certbot python3-certbot-nginx

# Create app user
sudo useradd -m -s /bin/bash aiagent
sudo su - aiagent
```

#### 2. Clone and Install

```bash
# Clone repository
git clone https://github.com/spirittours/-spirittours-s-Plataform.git
cd -spirittours-s-Plataform

# Install backend
cd backend
npm install --production
cd ..

# Build frontend
cd frontend
npm install
npm run build
cd ..
```

#### 3. Configure PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'ai-agent-backend',
    script: './backend/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
}
EOF

# Start application
pm2 start ecosystem.config.js

# Set PM2 to start on boot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs ai-agent-backend
```

#### 4. Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/ai-agent

# Add configuration:
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        root /home/aiagent/-spirittours-s-Plataform/frontend/build;
        try_files $uri /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for AI operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/aiagent/-spirittours-s-Plataform/frontend/build;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 10M;
}

# Enable site
sudo ln -s /etc/nginx/sites-available/ai-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. Setup SSL Certificate

```bash
# Install SSL certificate with Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

---

### Option 2: Cloud Platform Deployment

#### Heroku

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create your-ai-agent-app

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="your-mongodb-uri"
heroku config:set OPENAI_API_KEY="your-openai-key"
# ... (set all required env vars)

# Deploy
git push heroku main

# Open app
heroku open
```

#### AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init

# Create environment
eb create production

# Deploy
eb deploy

# Open
eb open
```

#### DigitalOcean App Platform

1. Connect GitHub repository
2. Select branch (main)
3. Configure build settings
4. Add environment variables
5. Deploy

---

## 🐳 Docker Deployment

### 1. Create Dockerfile (Backend)

```dockerfile
# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start application
CMD ["node", "server.js"]
```

### 2. Create Dockerfile (Frontend)

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Production image
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 3. Create docker-compose.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: ai-agent-mongodb
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: ai-accounting-agent
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
    networks:
      - ai-agent-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: ai-agent-backend
    restart: always
    depends_on:
      - mongodb
    environment:
      NODE_ENV: production
      PORT: 8000
      MONGODB_URI: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/ai-accounting-agent?authSource=admin
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "8000:8000"
    volumes:
      - ./backend/logs:/app/logs
      - ./backend/uploads:/app/uploads
    networks:
      - ai-agent-network
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: ai-agent-frontend
    restart: always
    depends_on:
      - backend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
    networks:
      - ai-agent-network

volumes:
  mongodb_data:
  mongodb_config:

networks:
  ai-agent-network:
    driver: bridge
```

### 4. Deploy with Docker Compose

```bash
# Create .env file with secrets
cat > .env << 'EOF'
MONGO_PASSWORD=your-secure-mongo-password
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
EOF

# Build and start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Stop and remove volumes (CAUTION: deletes data)
docker-compose down -v
```

---

## 📊 Monitoring & Logging

### 1. Application Logs

**Winston Logger** (already configured):

```javascript
// Logs are written to:
// - ./logs/combined.log (all logs)
// - ./logs/error.log (errors only)
// - Console output (development)

// Log levels: error, warn, info, http, debug
```

**View logs**:
```bash
# All logs
tail -f backend/logs/combined.log

# Errors only
tail -f backend/logs/error.log

# PM2 logs
pm2 logs ai-agent-backend
```

### 2. Database Monitoring

**MongoDB Monitoring**:
```bash
# Connection status
mongosh --eval "db.adminCommand('ping')"

# Database stats
mongosh --eval "db.stats()"

# Collection stats
mongosh ai-accounting-agent --eval "db.reviewqueues.stats()"

# Current operations
mongosh --eval "db.currentOp()"
```

### 3. Performance Monitoring

**Setup PM2 Monitoring** (free tier):
```bash
# Link to PM2 Plus
pm2 link <secret_key> <public_key>

# View metrics
pm2 web
```

**Setup New Relic** (optional):
```bash
# Install New Relic agent
npm install newrelic

# Add to server.js (first line)
require('newrelic');
```

### 4. Error Tracking with Sentry

```bash
# Already installed if using package.json

# Initialize in server.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});
```

---

## 💾 Backup & Recovery

### 1. Database Backups

**Automated MongoDB Backup Script**:

```bash
#!/bin/bash
# backup-mongodb.sh

BACKUP_DIR="/var/backups/mongodb"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="ai-agent-backup_$TIMESTAMP"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$BACKUP_NAME"

# Compress backup
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"

# Remove uncompressed backup
rm -rf "$BACKUP_DIR/$BACKUP_NAME"

# Keep only last 7 backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_NAME.tar.gz"
```

**Schedule with cron**:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

### 2. Restore from Backup

```bash
# Extract backup
tar -xzf ai-agent-backup_20251103_020000.tar.gz

# Restore to database
mongorestore --uri="$MONGODB_URI" --drop ai-agent-backup_20251103_020000/
```

### 3. Code & Files Backup

```bash
# Backup application files
tar -czf app-backup-$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='logs' \
  --exclude='.git' \
  -spirittours-s-Plataform/
```

---

## 🔒 Security Checklist

### Pre-Deployment Security

- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET (min 32 characters)
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS properly
- [ ] Set secure HTTP headers (Helmet.js)
- [ ] Enable rate limiting
- [ ] Whitelist MongoDB IP addresses
- [ ] Use environment variables for secrets (never hardcode)
- [ ] Enable MongoDB authentication
- [ ] Configure firewall (UFW/iptables)
- [ ] Disable MongoDB remote root access
- [ ] Set up fail2ban for SSH
- [ ] Keep dependencies updated (`npm audit fix`)
- [ ] Enable 2FA for critical accounts
- [ ] Configure backup encryption

### Post-Deployment Security

- [ ] Monitor logs for suspicious activity
- [ ] Regular security audits
- [ ] Keep system updated
- [ ] Review user permissions
- [ ] Monitor API usage
- [ ] Check for data leaks
- [ ] Rotate API keys quarterly
- [ ] Review and update dependencies monthly

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Backend won't start

**Error**: `Cannot connect to MongoDB`

```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection string
echo $MONGODB_URI

# Test connection
mongosh "$MONGODB_URI"
```

**Error**: `OpenAI API key invalid`

```bash
# Verify API key
echo $OPENAI_API_KEY

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### 2. Frontend can't connect to backend

**Error**: `Network Error` or `CORS Error`

```bash
# Check if backend is running
curl http://localhost:8000/health

# Check CORS configuration in backend
# Verify FRONTEND_URL in .env matches actual frontend URL
```

#### 3. AI services not working

**Error**: `AI service timeout`

```bash
# Check network connectivity
curl https://api.openai.com

# Increase timeout in .env
OPENAI_TIMEOUT=60000

# Check API quotas
```

#### 4. High memory usage

```bash
# Check PM2 memory
pm2 list

# Restart with lower memory limit
pm2 restart ai-agent-backend --max-memory-restart 500M

# Clear logs
pm2 flush
```

#### 5. Database performance issues

```bash
# Check slow queries
mongosh --eval "db.setProfilingLevel(1, { slowms: 100 })"

# View slow queries
mongosh --eval "db.system.profile.find().limit(10).sort({ts:-1}).pretty()"

# Optimize indexes
mongosh --eval "db.reviewqueues.getIndexes()"
```

---

## 📞 Support

### Getting Help

1. **Documentation**: Check all docs in `/docs` directory
2. **Logs**: Review application and system logs
3. **GitHub Issues**: Report bugs or request features
4. **Email Support**: support@yourdomain.com

### Useful Commands

```bash
# Backend health check
curl http://localhost:8000/health

# Check PM2 status
pm2 status

# View real-time logs
pm2 logs --lines 100

# Restart backend
pm2 restart ai-agent-backend

# MongoDB status
sudo systemctl status mongod

# Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# View system resources
htop  # or top

# Check disk space
df -h

# Check memory
free -h
```

---

## 📚 Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic Claude Documentation](https://docs.anthropic.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-03  
**Maintained By**: DevOps Team
