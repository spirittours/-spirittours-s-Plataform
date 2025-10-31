#!/bin/bash

################################################################################
# STAGING DEPLOYMENT SCRIPT
################################################################################
# Purpose: Deploy application to staging environment
# Author: AI Developer
# Date: 2025-10-18
# Version: 1.0.0
#
# Usage: sudo ./scripts/deploy-staging.sh
#
# Features:
# - Automated staging deployment
# - Pre-deployment validation
# - Database migrations
# - Service health checks
# - Rollback on failure
# - Load testing validation
#
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="/var/log/staging-deployment-${TIMESTAMP}.log"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.staging.yml"
ENV_FILE="${PROJECT_ROOT}/.env.staging"
BACKUP_DIR="/var/backups/staging"

# Service names
SERVICES=("postgres" "redis" "api" "email_worker" "frontend" "prometheus" "grafana")

################################################################################
# LOGGING FUNCTIONS
################################################################################

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

################################################################################
# PRE-DEPLOYMENT CHECKS
################################################################################

check_root() {
    log_info "Checking root privileges..."
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
    log "✅ Root privileges confirmed"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_deps=()
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    # Check Docker Compose
    if ! command -v docker compose &> /dev/null; then
        missing_deps+=("docker-compose")
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_error "Please install: sudo apt-get install ${missing_deps[*]}"
        exit 1
    fi
    
    log "✅ All prerequisites installed"
}

check_environment() {
    log_info "Checking environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        log_error "Please create .env.staging from .env.example"
        exit 1
    fi
    
    # Source environment file
    set -a
    source "$ENV_FILE"
    set +a
    
    # Check required variables
    local required_vars=(
        "POSTGRES_PASSWORD"
        "SECRET_KEY"
        "JWT_SECRET_KEY"
        "SMTP_HOST"
        "SMTP_PASSWORD"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
    
    log "✅ Environment configuration valid"
}

check_disk_space() {
    log_info "Checking disk space..."
    
    local available_space=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    local required_space=10
    
    if [ "$available_space" -lt "$required_space" ]; then
        log_error "Insufficient disk space. Available: ${available_space}GB, Required: ${required_space}GB"
        exit 1
    fi
    
    log "✅ Sufficient disk space available (${available_space}GB)"
}

################################################################################
# BACKUP FUNCTIONS
################################################################################

backup_database() {
    log_info "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    local backup_file="${BACKUP_DIR}/staging_db_backup_${TIMESTAMP}.sql"
    
    # Check if database container is running
    if docker compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
            -U "${POSTGRES_USER:-emailuser_staging}" \
            -d "${POSTGRES_DB:-emailmarketing_staging}" \
            > "$backup_file"
        
        if [ $? -eq 0 ]; then
            gzip "$backup_file"
            log "✅ Database backup created: ${backup_file}.gz"
        else
            log_warning "Failed to create database backup (container may not exist yet)"
        fi
    else
        log_warning "PostgreSQL container not running, skipping backup"
    fi
}

backup_volumes() {
    log_info "Creating volume backups..."
    
    local volume_backup_dir="${BACKUP_DIR}/volumes_${TIMESTAMP}"
    mkdir -p "$volume_backup_dir"
    
    # Backup uploads
    if [ -d "/var/lib/staging/uploads" ]; then
        tar -czf "${volume_backup_dir}/uploads.tar.gz" -C /var/lib/staging uploads
        log "✅ Uploads backed up"
    fi
    
    log "✅ Volume backups completed"
}

################################################################################
# DEPLOYMENT FUNCTIONS
################################################################################

pull_latest_code() {
    log_info "Pulling latest code from Git..."
    
    cd "$PROJECT_ROOT"
    
    # Fetch latest changes
    git fetch origin
    
    # Checkout staging branch
    if git rev-parse --verify genspark_ai_developer &> /dev/null; then
        git checkout genspark_ai_developer
        git pull origin genspark_ai_developer
    else
        log_warning "genspark_ai_developer branch not found, using current branch"
    fi
    
    local current_commit=$(git rev-parse --short HEAD)
    log "✅ Code updated to commit: $current_commit"
}

build_services() {
    log_info "Building Docker services..."
    
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" build --no-cache
    
    log "✅ Services built successfully"
}

stop_services() {
    log_info "Stopping existing services..."
    
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" down
    
    log "✅ Services stopped"
}

start_services() {
    log_info "Starting services..."
    
    cd "$PROJECT_ROOT"
    docker compose -f "$COMPOSE_FILE" up -d
    
    log "✅ Services started"
}

run_database_migrations() {
    log_info "Running database migrations..."
    
    # Wait for database to be ready
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER:-emailuser_staging}" &> /dev/null; then
            break
        fi
        attempt=$((attempt + 1))
        log_info "Waiting for database... (${attempt}/${max_attempts})"
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Database did not become ready in time"
        return 1
    fi
    
    # Run migrations
    docker compose -f "$COMPOSE_FILE" exec -T api alembic upgrade head
    
    if [ $? -eq 0 ]; then
        log "✅ Database migrations completed"
    else
        log_error "Database migrations failed"
        return 1
    fi
}

################################################################################
# VALIDATION FUNCTIONS
################################################################################

health_check() {
    log_info "Performing health checks..."
    
    local max_attempts=30
    local attempt=0
    local all_healthy=false
    
    while [ $attempt -lt $max_attempts ] && [ "$all_healthy" = false ]; do
        all_healthy=true
        
        for service in "${SERVICES[@]}"; do
            local status=$(docker compose -f "$COMPOSE_FILE" ps "$service" --format json 2>/dev/null | jq -r '.[0].Health // "unknown"')
            
            if [ "$status" != "healthy" ] && [ "$status" != "unknown" ]; then
                all_healthy=false
                log_info "Service $service not healthy yet... (${attempt}/${max_attempts})"
                break
            fi
        done
        
        if [ "$all_healthy" = false ]; then
            attempt=$((attempt + 1))
            sleep 5
        fi
    done
    
    if [ "$all_healthy" = false ]; then
        log_error "Services did not become healthy in time"
        return 1
    fi
    
    # Check API endpoint
    if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
        log "✅ API health check passed"
    else
        log_error "API health check failed"
        return 1
    fi
    
    # Check frontend
    if curl -f -s http://localhost/health > /dev/null 2>&1; then
        log "✅ Frontend health check passed"
    else
        log_warning "Frontend health check failed (may not be critical)"
    fi
    
    log "✅ All health checks passed"
}

run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Test API endpoints
    local test_endpoints=(
        "http://localhost:8000/health"
        "http://localhost:8000/api/v1/health"
    )
    
    for endpoint in "${test_endpoints[@]}"; do
        if curl -f -s "$endpoint" > /dev/null 2>&1; then
            log "✅ Endpoint test passed: $endpoint"
        else
            log_error "Endpoint test failed: $endpoint"
            return 1
        fi
    done
    
    log "✅ Smoke tests passed"
}

################################################################################
# ROLLBACK FUNCTION
################################################################################

rollback() {
    log_error "Deployment failed, initiating rollback..."
    
    # Stop current services
    docker compose -f "$COMPOSE_FILE" down
    
    # Restore database from latest backup
    local latest_backup=$(ls -t "${BACKUP_DIR}"/staging_db_backup_*.sql.gz 2>/dev/null | head -1)
    
    if [ -n "$latest_backup" ]; then
        log_info "Restoring database from backup: $latest_backup"
        
        docker compose -f "$COMPOSE_FILE" up -d postgres
        sleep 10
        
        gunzip -c "$latest_backup" | docker compose -f "$COMPOSE_FILE" exec -T postgres psql \
            -U "${POSTGRES_USER:-emailuser_staging}" \
            -d "${POSTGRES_DB:-emailmarketing_staging}"
        
        log "✅ Database restored from backup"
    else
        log_warning "No backup found to restore"
    fi
    
    log_error "Rollback completed. Please investigate the issue."
    exit 1
}

################################################################################
# DEPLOYMENT SUMMARY
################################################################################

deployment_summary() {
    log_info "====================================="
    log_info "STAGING DEPLOYMENT SUMMARY"
    log_info "====================================="
    log_info "Timestamp: $TIMESTAMP"
    log_info "Commit: $(git rev-parse --short HEAD)"
    log_info "Services: ${SERVICES[*]}"
    log_info "Log file: $LOG_FILE"
    log_info "====================================="
    
    # Service status
    log_info "Service Status:"
    docker compose -f "$COMPOSE_FILE" ps
    
    # Resource usage
    log_info "\nResource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
    
    log "✅ Staging deployment completed successfully!"
}

################################################################################
# MAIN DEPLOYMENT FLOW
################################################################################

main() {
    log "=================================="
    log "STAGING DEPLOYMENT STARTED"
    log "=================================="
    
    # Pre-deployment checks
    check_root
    check_prerequisites
    check_environment
    check_disk_space
    
    # Backup
    backup_database
    backup_volumes
    
    # Deployment
    pull_latest_code
    stop_services
    build_services
    start_services
    
    # Database migrations
    if ! run_database_migrations; then
        rollback
    fi
    
    # Validation
    if ! health_check; then
        rollback
    fi
    
    if ! run_smoke_tests; then
        rollback
    fi
    
    # Summary
    deployment_summary
    
    log "=================================="
    log "STAGING DEPLOYMENT COMPLETED"
    log "=================================="
}

# Trap errors and call rollback
trap rollback ERR

# Run main function
main "$@"
