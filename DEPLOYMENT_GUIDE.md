# B2B2B Platform - Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Environment Variables](#environment-variables)
7. [Database Migration](#database-migration)
8. [Monitoring Setup](#monitoring-setup)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Docker:** >= 20.10
- **Docker Compose:** >= 2.0
- **Kubernetes (Optional):** >= 1.24
- **kubectl (Optional):** >= 1.24
- **Python:** >= 3.11 (for local development)
- **Node.js:** >= 18 (for frontend development)
- **PostgreSQL:** >= 15 (if running locally)
- **Redis:** >= 7 (if running locally)

### System Requirements

**Minimum:**
- 4 CPU cores
- 8 GB RAM
- 20 GB disk space

**Recommended (Production):**
- 8+ CPU cores
- 16+ GB RAM
- 100+ GB SSD

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/your-org/b2b2b-platform.git
cd b2b2b-platform
```

### 2. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your configuration
nano .env
```

### 3. Install Dependencies

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

**Mobile:**
```bash
cd mobile
npm install
```

### 4. Database Setup

```bash
# Start PostgreSQL (via Docker)
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=b2b2b_db \
  -p 5432:5432 \
  postgres:15

# Run migrations
cd backend
alembic upgrade head
```

### 5. Start Development Servers

**Backend:**
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm start
```

**Mobile:**
```bash
cd mobile
npm start
```

## Docker Deployment

### Using Docker Compose

#### 1. Build Images

```bash
docker-compose build
```

#### 2. Start Services

```bash
docker-compose up -d
```

#### 3. Check Status

```bash
docker-compose ps
docker-compose logs -f
```

#### 4. Stop Services

```bash
docker-compose down
```

### Using Deploy Script

```bash
./scripts/deploy.sh staging
```

### Services Started

- **Backend API:** http://localhost:8000
- **Frontend:** http://localhost:3000
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379
- **Nginx:** http://localhost:80

## Kubernetes Deployment

### 1. Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Verify
kubectl version --client
```

### 2. Create Namespace

```bash
kubectl create namespace b2b2b
```

### 3. Create Secrets

```bash
kubectl create secret generic b2b2b-secrets \
  --from-literal=database-url="postgresql://user:pass@postgres:5432/db" \
  --from-literal=redis-url="redis://:password@redis:6379/0" \
  --from-literal=secret-key="your-secret-key" \
  --from-literal=postgres-user="postgres" \
  --from-literal=postgres-password="postgres" \
  --from-literal=redis-password="redis_password" \
  -n b2b2b
```

### 4. Deploy Database

```bash
kubectl apply -f kubernetes/postgres-statefulset.yaml -n b2b2b
```

### 5. Deploy Backend

```bash
kubectl apply -f kubernetes/backend-deployment.yaml -n b2b2b
```

### 6. Deploy Ingress

```bash
# Install Nginx Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Apply our ingress
kubectl apply -f kubernetes/ingress.yaml -n b2b2b
```

### 7. Verify Deployment

```bash
# Check pods
kubectl get pods -n b2b2b

# Check services
kubectl get services -n b2b2b

# Check logs
kubectl logs -f deployment/b2b2b-backend -n b2b2b
```

### 8. Scale Deployment

```bash
# Manual scaling
kubectl scale deployment b2b2b-backend --replicas=5 -n b2b2b

# Auto-scaling is configured via HPA in deployment YAML
```

## CI/CD Pipeline

### GitHub Actions Workflows

Three workflows are configured:

1. **CI (Continuous Integration)** - `.github/workflows/ci.yml`
   - Runs on pull requests and pushes
   - Executes tests, linting, security scans
   - Builds Docker images

2. **CD (Continuous Deployment)** - `.github/workflows/cd.yml`
   - Runs on main branch pushes
   - Builds and pushes Docker images
   - Deploys to staging automatically
   - Deploys to production on tag creation

3. **Performance Testing** - `.github/workflows/performance.yml`
   - Runs on schedule and manually
   - Load testing with Locust
   - Frontend performance with Lighthouse

### Manual Deployment

```bash
# Create a new release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# This triggers production deployment
```

### Rollback

```bash
# Kubernetes rollback
kubectl rollout undo deployment/b2b2b-backend -n b2b2b

# Docker rollback
docker-compose down
git checkout previous-commit
docker-compose up -d
```

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database
DB_NAME=b2b2b_db
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://:password@host:6379/0
REDIS_PASSWORD=your_redis_password
REDIS_PORT=6379

# Application
SECRET_KEY=your-very-long-secret-key-min-32-chars
ENVIRONMENT=production
DEBUG=false
ALLOWED_ORIGINS=https://yourdomain.com

# JWT
JWT_SECRET_KEY=another-long-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# External APIs (Optional)
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# AWS (Optional)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=eu-west-1
```

### Environment Files

- `.env.local` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

## Database Migration

### Create Migration

```bash
cd backend
alembic revision --autogenerate -m "Add new table"
```

### Apply Migration

```bash
# Upgrade to latest
alembic upgrade head

# Upgrade one version
alembic upgrade +1

# Downgrade one version
alembic downgrade -1
```

### Migration in Docker

```bash
docker-compose exec backend alembic upgrade head
```

### Migration in Kubernetes

```bash
kubectl exec -it deployment/b2b2b-backend -n b2b2b -- alembic upgrade head
```

## Monitoring Setup

### Prometheus

```bash
# Start Prometheus
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### Grafana

```bash
# Start Grafana
docker run -d \
  --name grafana \
  -p 3001:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana

# Import dashboard
# Navigate to http://localhost:3001
# Import monitoring/grafana-dashboard.json
```

### Application Metrics

Metrics are exposed at: `http://localhost:8000/metrics`

## Backup & Recovery

### Database Backup

```bash
# Manual backup
docker-compose exec postgres pg_dump -U postgres b2b2b_db > backup_$(date +%Y%m%d).sql

# Scheduled backup (cron)
0 2 * * * docker-compose exec postgres pg_dump -U postgres b2b2b_db > /backups/backup_$(date +\%Y\%m\%d).sql
```

### Database Restore

```bash
# From backup file
docker-compose exec -T postgres psql -U postgres b2b2b_db < backup_20241115.sql
```

### Redis Backup

```bash
# Trigger save
docker-compose exec redis redis-cli BGSAVE

# Copy RDB file
docker cp redis:/data/dump.rdb ./redis_backup_$(date +%Y%m%d).rdb
```

## Troubleshooting

### Backend Not Starting

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Database not ready - wait a few seconds
# 2. Missing environment variables - check .env
# 3. Port already in use - change port in docker-compose.yml
```

### Database Connection Issues

```bash
# Test connection
docker-compose exec backend python -c "from sqlalchemy import create_engine; engine = create_engine('$DATABASE_URL'); print(engine.connect())"

# Check database is running
docker-compose exec postgres pg_isready
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Restart services
docker-compose restart

# Scale down if needed
kubectl scale deployment b2b2b-backend --replicas=2 -n b2b2b
```

### Slow Performance

1. Check database indexes
2. Review slow queries in logs
3. Check Redis hit rate
4. Monitor with Grafana dashboard
5. Review application logs

### Certificate Issues (Kubernetes)

```bash
# Check certificate
kubectl describe certificate b2b2b-tls -n b2b2b

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager
```

## Health Checks

### Liveness Probe

```bash
curl http://localhost:8000/health
```

### Readiness Probe

```bash
curl http://localhost:8000/api/v1/health
```

### Detailed Health

```bash
curl http://localhost:8000/api/v1/health/detailed
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong SECRET_KEY (min 32 characters)
- [ ] Enable HTTPS in production
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Regular security updates
- [ ] Backup encryption keys
- [ ] Monitor security logs
- [ ] Configure CORS properly

## Production Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Log aggregation setup
- [ ] Rate limiting enabled
- [ ] CDN configured
- [ ] Auto-scaling enabled
- [ ] Disaster recovery plan
- [ ] Documentation updated

## Support

For deployment issues:
- **Email:** devops@b2b2b-platform.com
- **Slack:** #deployment-support
- **Documentation:** https://docs.b2b2b-platform.com
