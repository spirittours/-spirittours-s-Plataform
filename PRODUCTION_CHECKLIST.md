# Spirit Tours - Production Deployment Checklist

## Pre-Deployment Checklist

### 1. Code & Configuration
- [ ] All code committed and pushed to repository
- [ ] Latest version pulled from main branch
- [ ] All merge conflicts resolved
- [ ] No uncommitted changes in working directory
- [ ] `.env` file configured with production values
- [ ] Secrets rotated (JWT_SECRET, database passwords, API keys)
- [ ] Environment variables validated
- [ ] CORS origins configured correctly
- [ ] API rate limits configured appropriately
- [ ] Feature flags reviewed and set correctly

### 2. Infrastructure
- [ ] Docker installed and running
- [ ] Docker Compose installed
- [ ] Sufficient disk space (minimum 20GB free)
- [ ] Sufficient RAM (minimum 4GB)
- [ ] Network ports are available (80, 443, 3001, 5432, 6379, 27017)
- [ ] Domain name configured and DNS records set
- [ ] SSL/TLS certificates obtained (Let's Encrypt or commercial)
- [ ] Firewall rules configured
- [ ] Load balancer configured (if applicable)

### 3. Database
- [ ] PostgreSQL 14+ configured
- [ ] Database migrations completed
- [ ] Database backup taken
- [ ] Connection pooling configured
- [ ] Database indexes created
- [ ] Query performance optimized

### 4. Monitoring & Logging
- [ ] Winston logger configured
- [ ] Log rotation enabled
- [ ] Monitoring scripts set up (health-check.sh)
- [ ] Alert mechanisms configured (Slack, email)
- [ ] APM tool configured (Sentry, New Relic, etc.)
- [ ] Metrics collection enabled (Prometheus)
- [ ] Dashboard access configured (Grafana)

### 5. Security
- [ ] Security audit completed (`./scripts/security-audit.sh`)
- [ ] SSL/TLS certificates installed
- [ ] HTTPS enforced
- [ ] Security headers configured (HSTS, CSP, X-Frame-Options)
- [ ] Rate limiting enabled
- [ ] DDoS protection configured
- [ ] WAF configured (if applicable)
- [ ] Secrets encrypted and stored securely
- [ ] File permissions verified (`.env` = 600)
- [ ] npm audit vulnerabilities addressed

### 6. Performance
- [ ] Caching strategy implemented (Redis)
- [ ] CDN configured for static assets
- [ ] Gzip compression enabled
- [ ] Database query optimization completed
- [ ] Load testing completed
- [ ] Connection pooling optimized

### 7. Backup & Recovery
- [ ] Automated backup script configured (`./scripts/backup-database.sh`)
- [ ] Backup schedule set (cron jobs)
- [ ] Backup retention policy defined
- [ ] Recovery procedure documented and tested

## Testing Checklist

### 1. Unit Tests
```bash
npm test
npm run test:coverage
```
- [ ] All unit tests passing
- [ ] Code coverage > 70%
- [ ] No critical bugs

### 2. Integration Tests
```bash
npm run test:api
npm run test:db
```
- [ ] All API endpoints tested
- [ ] Database connectivity verified
- [ ] External service integrations tested

### 3. Load Testing
```bash
k6 run tests/load-test.js
```
- [ ] Load testing completed
- [ ] 95th percentile response time < 500ms
- [ ] Error rate < 1%
- [ ] System stable under 100 concurrent users

### 4. Security Testing
```bash
./scripts/security-audit.sh
```
- [ ] Security audit passed
- [ ] No exposed secrets
- [ ] Dependencies scanned for vulnerabilities
- [ ] SSL/TLS configuration validated

## Deployment Steps

### Step 1: Pre-Deployment Preparation

```bash
# 1. Navigate to project directory
cd /home/user/webapp

# 2. Pull latest code
git fetch origin main
git checkout main
git pull origin main

# 3. Install dependencies
npm install

# 4. Run validation scripts
./scripts/validate-docker.sh
./scripts/security-audit.sh

# 5. Verify environment configuration
cp .env.example .env
# Edit .env with production values
nano .env
```

### Step 2: Database Migration

```bash
# 1. Backup existing database (if upgrading)
./scripts/backup-database.sh

# 2. Run database migrations
npm run migrate

# 3. Verify database health
docker compose exec postgres pg_isready
```

### Step 3: Docker Deployment

```bash
# 1. Build images
docker compose build --no-cache

# 2. Start services
docker compose up -d

# 3. Check service status
docker compose ps

# 4. Monitor logs
docker compose logs -f api
```

### Step 4: Verification

```bash
# 1. Health check
curl http://localhost:3001/health

# 2. Database connectivity
curl http://localhost:3001/api/status

# 3. Run smoke tests
npm run test:api

# 4. Check resource usage
docker stats
```

### Step 5: DNS & SSL Configuration

```bash
# 1. Update DNS records to point to server IP
# A record: @ -> YOUR_SERVER_IP
# CNAME record: www -> @

# 2. Obtain SSL certificate (Let's Encrypt)
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@spirittours.com \
  --agree-tos \
  --no-eff-email \
  -d spirittours.com \
  -d www.spirittours.com

# 3. Update Nginx configuration
# Edit nginx/conf.d/default.conf

# 4. Reload Nginx
docker compose exec nginx nginx -s reload
```

### Step 6: Post-Deployment Monitoring

```bash
# 1. Set up monitoring cron jobs
crontab -e

# Add these lines:
# Health check every 5 minutes
*/5 * * * * /home/user/webapp/scripts/health-check.sh

# Database backup daily at 2 AM
0 2 * * * /home/user/webapp/scripts/backup-database.sh

# Security audit weekly on Monday at 9 AM
0 9 * * 1 /home/user/webapp/scripts/security-audit.sh

# 2. Monitor logs
tail -f logs/combined.log

# 3. Monitor Docker services
docker compose logs -f --tail=100
```

## Rollback Plan

### Quick Rollback (if deployment fails)

```bash
# 1. Stop new deployment
docker compose down

# 2. Restore previous Docker images
docker compose pull [previous_version_tag]
docker compose up -d

# 3. Restore database (if needed)
pg_restore -h localhost -U spirit_tours_user -d spirit_tours /path/to/backup.sql

# 4. Verify rollback
curl http://localhost:3001/health
```

### Database Restoration

```bash
# 1. Stop application
docker compose down api

# 2. Restore database
PGPASSWORD="your_password" pg_restore \
  -h localhost \
  -U spirit_tours_user \
  -d spirit_tours \
  --clean \
  --if-exists \
  /backups/spirit_tours_YYYYMMDD_HHMMSS.sql.gz

# 3. Start application
docker compose up -d

# 4. Verify restoration
docker compose exec postgres psql -U spirit_tours_user -d spirit_tours -c "SELECT COUNT(*) FROM users;"
```

## Post-Deployment Checklist

### Immediate (First Hour)
- [ ] All services running without errors
- [ ] Health endpoints responding
- [ ] Database connections stable
- [ ] Redis cache working
- [ ] API endpoints responding
- [ ] Response times normal
- [ ] Error rate minimal
- [ ] SSL certificate valid
- [ ] Monitoring alerts configured

### First Day
- [ ] Review application logs for errors
- [ ] Monitor resource usage (CPU, memory, disk)
- [ ] Check database query performance
- [ ] Verify backup script executed successfully
- [ ] Review user feedback/reports
- [ ] Monitor API usage patterns
- [ ] Check external service integrations

### First Week
- [ ] Review monitoring dashboards
- [ ] Analyze performance metrics
- [ ] Review security logs
- [ ] Optimize based on real-world usage
- [ ] Address any reported issues
- [ ] Update documentation if needed

## Emergency Contacts

- **DevOps Lead**: [Contact Info]
- **Database Admin**: [Contact Info]
- **Security Team**: [Contact Info]
- **On-Call Engineer**: [Contact Info]

## Deployment Environments

### Production
- **URL**: https://spirittours.com
- **API**: https://api.spirittours.com
- **Database**: production-db.spirittours.com
- **Monitoring**: https://monitoring.spirittours.com

### Staging
- **URL**: https://staging.spirittours.com
- **API**: https://api-staging.spirittours.com
- **Database**: staging-db.spirittours.com

### Development
- **URL**: http://localhost:3000
- **API**: http://localhost:3001
- **Database**: localhost:5432

## Success Criteria

Deployment is considered successful when:

1. ✅ All services are running without errors
2. ✅ Health checks passing consistently for 30 minutes
3. ✅ API response times < 500ms (95th percentile)
4. ✅ Error rate < 1%
5. ✅ Database connections stable
6. ✅ SSL certificate valid and HTTPS working
7. ✅ Monitoring and alerting operational
8. ✅ Backups configured and tested
9. ✅ Security audit passing
10. ✅ Load testing thresholds met

## Notes

- Always test deployment procedure in staging environment first
- Keep rollback procedure readily available
- Document any deviations from standard procedure
- Update this checklist based on lessons learned
- Schedule regular deployment reviews and improvements

---

**Last Updated**: 2025-10-21
**Document Version**: 1.0
**Maintained By**: DevOps Team
