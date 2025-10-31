# Spirit Tours - Deployment Guide

Complete deployment documentation for staging and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Methods](#deployment-methods)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Rollback](#rollback)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **npm**: 8.x or higher
- **PostgreSQL**: 14.x or higher with PostGIS extension
- **Redis**: 7.x or higher (optional, for caching)
- **PM2**: Latest version (for process management)
- **Git**: 2.x or higher

### Server Requirements

**Staging:**
- 2 CPU cores minimum
- 4GB RAM minimum
- 50GB storage
- Ubuntu 20.04 LTS or higher

**Production:**
- 4 CPU cores minimum
- 8GB RAM minimum
- 100GB storage
- Ubuntu 20.04 LTS or higher
- Load balancer (nginx/HAProxy)

---

## Environment Setup

### 1. Clone Repository

```bash
# Staging
git clone -b genspark_ai_developer https://github.com/spirittours/-spirittours-s-Plataform.git
cd -spirittours-s-Plataform

# Production
git clone -b main https://github.com/spirittours/-spirittours-s-Plataform.git
cd -spirittours-s-Plataform
```

### 2. Install Dependencies

```bash
# Backend dependencies
npm install

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 3. Configure Environment Variables

```bash
# Copy environment template
cp .env.staging .env  # For staging
# OR
cp .env.production .env  # For production

# Edit with actual credentials
nano .env
```

**Critical Variables to Set:**

```env
# Database
DB_PASSWORD=your_strong_password_here
DB_HOST=your_db_host

# JWT
JWT_SECRET=your_jwt_secret_min_64_chars

# Redis
REDIS_PASSWORD=your_redis_password

# Banking APIs
BBVA_CLIENT_ID=your_bbva_client_id
BBVA_CLIENT_SECRET=your_bbva_client_secret
```

### 4. Database Setup

```bash
# Create database
sudo -u postgres psql
CREATE DATABASE spirittours_staging;  -- or spirittours_production
CREATE USER spirittours_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE spirittours_staging TO spirittours_user;

# Enable PostGIS extension
\c spirittours_staging
CREATE EXTENSION postgis;

# Run migrations
npm run migrate
# OR for specific environment
NODE_ENV=staging npm run migrate
```

---

## Deployment Methods

### Method 1: Manual Deployment with PM2

#### Staging Deployment

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy to staging
./deploy.sh staging
```

#### Production Deployment

```bash
# Deploy to production
./deploy.sh production
```

### Method 2: PM2 Ecosystem Deploy

```bash
# Setup SSH keys on remote server
ssh-copy-id deploy@staging.spirittours.com

# Initial setup
pm2 deploy ecosystem.config.js staging setup

# Deploy
pm2 deploy ecosystem.config.js staging

# For production
pm2 deploy ecosystem.config.js production
```

### Method 3: Docker Deployment

#### Staging with Docker Compose

```bash
# Build and start containers
docker-compose -f docker-compose.staging.yml up -d

# View logs
docker-compose -f docker-compose.staging.yml logs -f

# Stop containers
docker-compose -f docker-compose.staging.yml down
```

#### Production with Docker Compose

```bash
# Build and start containers
docker-compose -f docker-compose.production.yml up -d

# Scale API instances
docker-compose -f docker-compose.production.yml up -d --scale backend-api=4
```

### Method 4: Kubernetes Deployment

```bash
# Apply staging configuration
kubectl apply -f infrastructure/k8s/staging/

# Apply production configuration
kubectl apply -f infrastructure/k8s/production/

# Check status
kubectl get pods -n spirit-tours
kubectl get services -n spirit-tours
```

---

## Configuration

### PM2 Process Management

```bash
# Start application
pm2 start ecosystem.config.js --env staging

# View status
pm2 status

# View logs
pm2 logs spirit-tours-accounting-api

# Monitor
pm2 monit

# Restart
pm2 restart spirit-tours-accounting-api

# Reload (zero-downtime)
pm2 reload spirit-tours-accounting-api

# Stop
pm2 stop spirit-tours-accounting-api

# Delete
pm2 delete spirit-tours-accounting-api
```

### Nginx Configuration

Example nginx configuration for reverse proxy:

```nginx
upstream spirit_tours_api {
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
    server localhost:3004;
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name api.spirittours.com;

    ssl_certificate /etc/nginx/ssl/spirittours.crt;
    ssl_certificate_key /etc/nginx/ssl/spirittours.key;

    location / {
        proxy_pass http://spirit_tours_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### SSL/TLS Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.spirittours.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Monitoring

### Health Checks

```bash
# API health
curl http://localhost:3001/health

# Database health
curl http://localhost:3001/health/db

# Redis health
curl http://localhost:3001/health/redis
```

### Logging

Logs are stored in `./logs/` directory:

- `accounting-api.log` - Combined logs
- `accounting-api-out.log` - Standard output
- `accounting-api-error.log` - Error logs

```bash
# View real-time logs
tail -f logs/accounting-api.log

# View PM2 logs
pm2 logs spirit-tours-accounting-api --lines 100
```

### Monitoring Tools

**Recommended:**
- **Sentry** - Error tracking
- **New Relic** - Application performance monitoring
- **Datadog** - Infrastructure monitoring
- **Prometheus + Grafana** - Metrics and dashboards

```bash
# Configure monitoring
export SENTRY_DSN=your_sentry_dsn
export NEW_RELIC_LICENSE_KEY=your_key
```

---

## Rollback

### Automatic Rollback

The deploy script creates backups before each deployment. If deployment fails, it automatically rolls back.

### Manual Rollback

```bash
# List backups
ls -lah /var/backups/spirit-tours-accounting/

# Restore from backup
BACKUP_DIR="/var/backups/spirit-tours-accounting/backup-20241028-143000"
DEPLOY_DIR="/var/www/spirit-tours-accounting"

# Stop application
pm2 stop spirit-tours-accounting-api

# Restore
sudo rm -rf $DEPLOY_DIR
sudo cp -r $BACKUP_DIR $DEPLOY_DIR

# Restart
cd $DEPLOY_DIR
pm2 start ecosystem.config.js --env production
```

### Git-based Rollback

```bash
# Find previous commit
git log --oneline -10

# Rollback to specific commit
git reset --hard <commit-hash>

# Force push (use with caution)
git push origin main --force

# Redeploy
./deploy.sh production
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs spirit-tours-accounting-api

# Check node version
node --version

# Check port availability
netstat -tuln | grep 3001

# Kill process on port
lsof -ti:3001 | xargs kill -9
```

### Database Connection Issues

```bash
# Test connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Memory Issues

```bash
# Check memory usage
free -h

# Check PM2 memory
pm2 status

# Restart with memory limit
pm2 restart spirit-tours-accounting-api --max-memory-restart 1G
```

### High CPU Usage

```bash
# Check PM2 processes
pm2 monit

# Reduce instances
pm2 scale spirit-tours-accounting-api 2

# Check for infinite loops
pm2 logs --lines 1000 | grep -i error
```

### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in /etc/nginx/ssl/spirittours.crt -text -noout

# Renew certificate
sudo certbot renew

# Restart nginx
sudo systemctl restart nginx
```

---

## Performance Optimization

### Enable Caching

```bash
# Redis caching
CACHE_ENABLED=true
CACHE_TTL=3600
```

### Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_cxc_sucursal ON cuentas_por_cobrar(sucursal_id);
CREATE INDEX idx_cxc_estado ON cuentas_por_cobrar(estado_cxc);
CREATE INDEX idx_cxc_fecha ON cuentas_por_cobrar(fecha_emision);

-- Analyze tables
ANALYZE cuentas_por_cobrar;
ANALYZE pagos_recibidos;
```

### Enable Compression

```nginx
# In nginx.conf
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

---

## Security Checklist

- [ ] Change default passwords
- [ ] Enable SSL/TLS
- [ ] Configure firewall (ufw)
- [ ] Set up rate limiting
- [ ] Enable CSRF protection
- [ ] Configure CORS properly
- [ ] Keep dependencies updated
- [ ] Set up intrusion detection
- [ ] Enable audit logging
- [ ] Implement backup strategy
- [ ] Configure fail2ban

---

## Backup Strategy

### Automated Backups

```bash
# Database backup
0 3 * * * pg_dump spirittours_production | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Files backup
0 4 * * * tar -czf /backups/files-$(date +\%Y\%m\%d).tar.gz /var/www/spirit-tours-accounting/uploads

# Cleanup old backups (keep 90 days)
0 5 * * * find /backups -name "*.gz" -mtime +90 -delete
```

### Backup to S3

```bash
# Install AWS CLI
sudo apt install awscli

# Configure
aws configure

# Backup to S3
aws s3 sync /backups s3://spirittours-backups/production/
```

---

## Support

For deployment issues:
- **Email**: devops@spirittours.com
- **Slack**: #deployment-support
- **On-call**: +52-XXX-XXX-XXXX

---

## License

Copyright © 2024 Spirit Tours. All rights reserved.
