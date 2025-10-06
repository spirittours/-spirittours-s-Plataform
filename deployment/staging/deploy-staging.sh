#!/bin/bash

# Spirit Tours - Staging Deployment Script
# Author: DevOps Team
# Version: 1.0.0

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$SCRIPT_DIR/logs/deploy_staging_$TIMESTAMP.log"

# Create log directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/logs"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
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
        error "Docker is not installed!"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed!"
        exit 1
    fi
    
    # Check environment file
    if [ ! -f "$SCRIPT_DIR/.env.staging" ]; then
        error "Environment file .env.staging not found!"
        exit 1
    fi
    
    # Check Node.js for frontend build
    if ! command -v node &> /dev/null; then
        warning "Node.js is not installed. Frontend build might fail."
    fi
    
    # Check Python for backend
    if ! command -v python3 &> /dev/null; then
        warning "Python 3 is not installed. Backend setup might fail."
    fi
    
    log "Prerequisites check completed ✓"
}

# Load environment variables
load_environment() {
    log "Loading environment variables..."
    set -a
    source "$SCRIPT_DIR/.env.staging"
    set +a
    log "Environment variables loaded ✓"
}

# Build Docker images
build_images() {
    log "Building Docker images..."
    
    cd "$SCRIPT_DIR"
    
    # Build with no cache for fresh deployment
    docker-compose -f docker-compose.staging.yml build --no-cache
    
    if [ $? -eq 0 ]; then
        log "Docker images built successfully ✓"
    else
        error "Failed to build Docker images!"
        exit 1
    fi
}

# Start services
start_services() {
    log "Starting staging services..."
    
    cd "$SCRIPT_DIR"
    
    # Start services in detached mode
    docker-compose -f docker-compose.staging.yml up -d
    
    if [ $? -eq 0 ]; then
        log "Services started successfully ✓"
    else
        error "Failed to start services!"
        exit 1
    fi
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    check_service_health
}

# Check service health
check_service_health() {
    log "Checking service health..."
    
    services=("postgres-staging" "redis-staging" "backend-staging" "frontend-staging")
    
    for service in "${services[@]}"; do
        if docker ps | grep -q "$service"; then
            info "$service is running ✓"
        else
            error "$service is not running!"
            exit 1
        fi
    done
    
    # Check backend API health
    log "Checking backend API health..."
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:8001/health &> /dev/null; then
            log "Backend API is healthy ✓"
            break
        else
            attempt=$((attempt + 1))
            info "Waiting for backend API... (attempt $attempt/$max_attempts)"
            sleep 5
        fi
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "Backend API health check failed!"
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    docker exec spirit-tours-backend-staging alembic upgrade head
    
    if [ $? -eq 0 ]; then
        log "Database migrations completed ✓"
    else
        error "Database migrations failed!"
        exit 1
    fi
}

# Initialize test data
init_test_data() {
    log "Initializing staging test data..."
    
    docker exec spirit-tours-backend-staging python scripts/init_staging_data.py
    
    if [ $? -eq 0 ]; then
        log "Test data initialized ✓"
    else
        warning "Test data initialization failed. This might be expected if data already exists."
    fi
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring dashboards..."
    
    # Import Grafana dashboards
    if [ -d "$SCRIPT_DIR/monitoring/grafana/dashboards" ]; then
        docker exec spirit-tours-grafana-staging grafana-cli admin reset-admin-password "$GRAFANA_PASSWORD_STAGING"
        log "Grafana admin password reset ✓"
    fi
    
    log "Monitoring setup completed ✓"
}

# Create backup
create_backup() {
    log "Creating initial backup..."
    
    docker exec spirit-tours-backup-staging /backup/scripts/backup.sh
    
    if [ $? -eq 0 ]; then
        log "Initial backup created ✓"
    else
        warning "Backup creation failed. Please check backup service."
    fi
}

# Display deployment summary
display_summary() {
    echo ""
    echo "========================================="
    echo -e "${GREEN}STAGING DEPLOYMENT COMPLETED SUCCESSFULLY${NC}"
    echo "========================================="
    echo ""
    echo "Access URLs:"
    echo "  Frontend:    http://localhost:3001"
    echo "  Backend API: http://localhost:8001"
    echo "  Grafana:     http://localhost:3002 (admin/$GRAFANA_PASSWORD_STAGING)"
    echo "  Kibana:      http://localhost:5602"
    echo "  RabbitMQ:    http://localhost:15673 (spirit_mq/$RABBITMQ_PASSWORD_STAGING)"
    echo ""
    echo "Service Status:"
    docker-compose -f "$SCRIPT_DIR/docker-compose.staging.yml" ps
    echo ""
    echo "Logs:"
    echo "  Deployment log: $LOG_FILE"
    echo "  Service logs:   docker-compose -f $SCRIPT_DIR/docker-compose.staging.yml logs -f [service]"
    echo ""
    echo "Next Steps:"
    echo "  1. Verify all services at the URLs above"
    echo "  2. Run smoke tests: ./run-smoke-tests.sh"
    echo "  3. Configure SSL certificates for production domains"
    echo "  4. Update DNS records to point to staging server"
    echo ""
}

# Cleanup function
cleanup() {
    if [ $? -ne 0 ]; then
        error "Deployment failed! Rolling back..."
        docker-compose -f "$SCRIPT_DIR/docker-compose.staging.yml" down
    fi
}

# Main deployment flow
main() {
    log "Starting Spirit Tours Staging Deployment..."
    echo "========================================="
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Run deployment steps
    check_prerequisites
    load_environment
    build_images
    start_services
    run_migrations
    init_test_data
    setup_monitoring
    create_backup
    
    # Display summary
    display_summary
    
    log "Deployment completed successfully!"
}

# Run main function
main "$@"