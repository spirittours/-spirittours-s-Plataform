#!/bin/bash

################################################################################
# Spirit Tours - Staging Deployment Script
# Automatiza el deployment completo en ambiente de staging
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_ENV="staging"
PROJECT_NAME="spirit-tours"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-docker.io}"
VERSION="${VERSION:-latest}"
BACKUP_ENABLED="${BACKUP_ENABLED:-true}"

# Paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
BACKUP_DIR="$SCRIPT_DIR/backups"
LOG_FILE="$SCRIPT_DIR/deploy_$(date +%Y%m%d_%H%M%S).log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check environment file
    if [ ! -f "$SCRIPT_DIR/.env.staging" ]; then
        warning ".env.staging file not found. Creating from template..."
        create_env_file
    fi
    
    # Check required directories
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$SCRIPT_DIR/logs"
    mkdir -p "$SCRIPT_DIR/nginx/sites"
    mkdir -p "$SCRIPT_DIR/ssl"
    mkdir -p "$SCRIPT_DIR/monitoring/prometheus"
    mkdir -p "$SCRIPT_DIR/monitoring/grafana/dashboards"
    mkdir -p "$SCRIPT_DIR/monitoring/grafana/datasources"
    
    log "Prerequisites check completed ✓"
}

# Create environment file
create_env_file() {
    cat > "$SCRIPT_DIR/.env.staging" << EOF
# Database Configuration
DB_USER=spirit
DB_PASSWORD=$(openssl rand -base64 32)
DB_NAME=spirit_tours_staging

# Redis Configuration
REDIS_PASSWORD=$(openssl rand -base64 32)

# Application Configuration
SECRET_KEY=$(openssl rand -base64 64)
ENV=staging
DEBUG=false

# CORS Configuration
CORS_ORIGINS=https://staging.spirit-tours.com,http://localhost:3001

# API URLs
REACT_APP_API_URL=https://staging-api.spirit-tours.com

# Twilio Configuration (WhatsApp)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# External API Keys
AMADEUS_API_KEY=your_amadeus_key_here
AMADEUS_API_SECRET=your_amadeus_secret_here
SABRE_API_KEY=your_sabre_key_here
STRIPE_API_KEY=your_stripe_key_here
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_secret_here

# OpenAI (for WhatsApp NLP - optional)
WHATSAPP_USE_NLP=false
OPENAI_API_KEY=your_openai_key_here

# Monitoring
GRAFANA_USER=admin
GRAFANA_PASSWORD=$(openssl rand -base64 16)
FLOWER_USER=admin
FLOWER_PASSWORD=$(openssl rand -base64 16)

# Backup Configuration
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE="0 2 * * *"  # 2 AM daily
EOF
    
    warning "Created .env.staging file. Please update with actual API keys!"
}

# Backup current deployment
backup_current() {
    if [ "$BACKUP_ENABLED" = "true" ]; then
        log "Creating backup of current deployment..."
        
        BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
        BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
        mkdir -p "$BACKUP_PATH"
        
        # Backup database
        if docker ps | grep -q spirit-postgres-staging; then
            info "Backing up database..."
            docker exec spirit-postgres-staging pg_dump -U spirit spirit_tours_staging | gzip > "$BACKUP_PATH/database.sql.gz"
        fi
        
        # Backup volumes
        info "Backing up Docker volumes..."
        docker run --rm -v postgres_data_staging:/data -v "$BACKUP_PATH":/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .
        docker run --rm -v redis_data_staging:/data -v "$BACKUP_PATH":/backup alpine tar czf /backup/redis_data.tar.gz -C /data .
        
        # Backup configuration
        cp "$SCRIPT_DIR/.env.staging" "$BACKUP_PATH/.env.staging.backup"
        
        log "Backup completed: $BACKUP_PATH ✓"
    else
        warning "Backup skipped (BACKUP_ENABLED=false)"
    fi
}

# Build Docker images
build_images() {
    log "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build backend image
    info "Building backend image..."
    docker build -t ${DOCKER_REGISTRY}/${PROJECT_NAME}-backend:${VERSION} \
        -f Dockerfile \
        --target production \
        --build-arg ENV=staging \
        .
    
    # Build frontend image
    info "Building frontend image..."
    docker build -t ${DOCKER_REGISTRY}/${PROJECT_NAME}-frontend:${VERSION} \
        -f frontend/Dockerfile \
        --build-arg REACT_APP_ENV=staging \
        frontend/
    
    log "Docker images built successfully ✓"
}

# Deploy services
deploy_services() {
    log "Deploying services..."
    
    cd "$SCRIPT_DIR"
    
    # Load environment variables
    export $(cat .env.staging | grep -v '^#' | xargs)
    
    # Stop existing services
    info "Stopping existing services..."
    docker-compose -f docker-compose.staging.yml down
    
    # Start new services
    info "Starting new services..."
    docker-compose -f docker-compose.staging.yml up -d
    
    # Wait for services to be healthy
    info "Waiting for services to be healthy..."
    sleep 10
    
    # Check service health
    check_service_health
    
    log "Services deployed successfully ✓"
}

# Check service health
check_service_health() {
    log "Checking service health..."
    
    services=("postgres" "redis" "backend" "frontend" "nginx")
    all_healthy=true
    
    for service in "${services[@]}"; do
        container_name="spirit-${service}-staging"
        if docker ps | grep -q "$container_name"; then
            health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "none")
            if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
                info "✓ $service is running"
            else
                warning "⚠ $service health: $health"
                all_healthy=false
            fi
        else
            error "✗ $service is not running"
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        log "All services are healthy ✓"
    else
        warning "Some services may not be healthy. Check logs for details."
    fi
}

# Initialize database
init_database() {
    log "Initializing database..."
    
    # Wait for database to be ready
    info "Waiting for database to be ready..."
    sleep 5
    
    # Run migrations
    info "Running database migrations..."
    docker exec spirit-backend-staging alembic upgrade head
    
    # Load initial data if needed
    if [ -f "$PROJECT_ROOT/init_database.py" ]; then
        info "Loading initial data..."
        docker exec spirit-backend-staging python init_database.py
    fi
    
    log "Database initialized ✓"
}

# Configure WhatsApp webhook
configure_whatsapp() {
    log "Configuring WhatsApp webhook..."
    
    # Get ngrok URL or staging URL
    WEBHOOK_URL="${WEBHOOK_URL:-https://staging-api.spirit-tours.com/api/v1/whatsapp/webhook}"
    
    info "WhatsApp webhook URL: $WEBHOOK_URL"
    info "Please configure this URL in your Twilio console:"
    info "1. Go to https://console.twilio.com"
    info "2. Navigate to Messaging > Settings > WhatsApp Sandbox Settings"
    info "3. Set webhook URL to: $WEBHOOK_URL"
    
    log "WhatsApp configuration instructions provided ✓"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create Prometheus configuration
    cat > "$SCRIPT_DIR/monitoring/prometheus.yml" << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
  
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
  
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
EOF
    
    # Create Grafana datasource
    cat > "$SCRIPT_DIR/monitoring/grafana/datasources/prometheus.yml" << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF
    
    log "Monitoring configured ✓"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    # Run backend tests
    info "Running backend tests..."
    docker exec spirit-backend-staging pytest tests/ -v --tb=short || warning "Some backend tests failed"
    
    # Run frontend tests (if available)
    if docker ps | grep -q spirit-frontend-staging; then
        info "Running frontend tests..."
        docker exec spirit-frontend-staging npm test -- --watchAll=false || warning "Some frontend tests failed"
    fi
    
    log "Tests completed ✓"
}

# Generate deployment report
generate_report() {
    log "Generating deployment report..."
    
    REPORT_FILE="$SCRIPT_DIR/deployment_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$REPORT_FILE" << EOF
================================================================================
SPIRIT TOURS - STAGING DEPLOYMENT REPORT
================================================================================
Date: $(date)
Environment: Staging
Version: $VERSION

SERVICES STATUS:
--------------------------------------------------------------------------------
$(docker-compose -f "$SCRIPT_DIR/docker-compose.staging.yml" ps)

RESOURCE USAGE:
--------------------------------------------------------------------------------
$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}")

ACCESS URLS:
--------------------------------------------------------------------------------
Frontend: https://staging.spirit-tours.com
Backend API: https://staging-api.spirit-tours.com
API Documentation: https://staging-api.spirit-tours.com/docs
Grafana: https://staging.spirit-tours.com:3002
Flower (Celery): https://staging.spirit-tours.com:5556

WHATSAPP CONFIGURATION:
--------------------------------------------------------------------------------
Webhook URL: https://staging-api.spirit-tours.com/api/v1/whatsapp/webhook
Status Endpoint: https://staging-api.spirit-tours.com/api/v1/whatsapp/status

MONITORING CREDENTIALS:
--------------------------------------------------------------------------------
Grafana User: admin
Grafana Password: Check .env.staging file
Flower User: admin
Flower Password: Check .env.staging file

NEXT STEPS:
--------------------------------------------------------------------------------
1. Verify all services are running: docker-compose -f docker-compose.staging.yml ps
2. Check logs: docker-compose -f docker-compose.staging.yml logs -f [service]
3. Configure WhatsApp webhook in Twilio console
4. Access Grafana for monitoring
5. Run smoke tests
6. Notify team of deployment completion

================================================================================
EOF
    
    cat "$REPORT_FILE"
    log "Deployment report saved to: $REPORT_FILE ✓"
}

# Main deployment flow
main() {
    echo "================================================================================
    SPIRIT TOURS - STAGING DEPLOYMENT
    Started at: $(date)
    ================================================================================"
    
    check_prerequisites
    backup_current
    build_images
    deploy_services
    init_database
    setup_monitoring
    configure_whatsapp
    run_tests
    generate_report
    
    echo "================================================================================
    DEPLOYMENT COMPLETED SUCCESSFULLY!
    Finished at: $(date)
    
    Access URLs:
    - Frontend: https://staging.spirit-tours.com
    - Backend API: https://staging-api.spirit-tours.com/docs
    - Grafana: https://staging.spirit-tours.com:3002
    
    Check the deployment report for detailed information.
    ================================================================================"
}

# Run main function
main "$@"