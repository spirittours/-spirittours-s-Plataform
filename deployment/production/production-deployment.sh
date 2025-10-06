#!/bin/bash

# Spirit Tours - Production Deployment Script
# Enterprise-grade deployment with zero-downtime, rollback capabilities, and health checks
# Version: 2.0.0

set -e
set -u
set -o pipefail

# ============================================
# CONFIGURATION
# ============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Deployment configuration
DEPLOYMENT_ENV="production"
PROJECT_NAME="spirit-tours"
DEPLOYMENT_VERSION=$(git describe --tags --always --dirty)
DEPLOYMENT_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOYMENT_ID="${DEPLOYMENT_VERSION}_${DEPLOYMENT_TIMESTAMP}"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DEPLOYMENT_DIR="/opt/spirit-tours"
BACKUP_DIR="/opt/backups/spirit-tours"
LOG_DIR="/var/log/spirit-tours"

# Create necessary directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$DEPLOYMENT_DIR/releases"

# Deployment settings
MAX_HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=10
ROLLBACK_ON_FAILURE=true
ENABLE_BLUE_GREEN=true
ENABLE_CANARY=false
CANARY_PERCENTAGE=10

# Log file
DEPLOYMENT_LOG="$LOG_DIR/deployment_${DEPLOYMENT_TIMESTAMP}.log"

# ============================================
# LOGGING FUNCTIONS
# ============================================

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ${BOLD}$1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

section() {
    echo -e "\n${MAGENTA}========================================${NC}" | tee -a "$DEPLOYMENT_LOG"
    echo -e "${MAGENTA}$1${NC}" | tee -a "$DEPLOYMENT_LOG"
    echo -e "${MAGENTA}========================================${NC}" | tee -a "$DEPLOYMENT_LOG"
}

# ============================================
# PRE-DEPLOYMENT CHECKS
# ============================================

pre_deployment_checks() {
    section "PRE-DEPLOYMENT CHECKS"
    
    local checks_passed=true
    
    # Check if running as appropriate user
    if [[ $EUID -eq 0 ]]; then
        warning "Running as root. Consider using a dedicated deployment user."
    fi
    
    # Check required tools
    info "Checking required tools..."
    local required_tools=("docker" "docker-compose" "git" "curl" "jq" "nginx" "certbot")
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is not installed!"
            checks_passed=false
        else
            success "✓ $tool found"
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running!"
        checks_passed=false
    else
        success "✓ Docker daemon is running"
    fi
    
    # Check disk space
    info "Checking disk space..."
    local available_space=$(df /opt | awk 'NR==2 {print $4}')
    local required_space=$((5 * 1024 * 1024))  # 5GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        error "Insufficient disk space! Available: ${available_space}KB, Required: ${required_space}KB"
        checks_passed=false
    else
        success "✓ Sufficient disk space available"
    fi
    
    # Check environment file
    if [[ ! -f "$SCRIPT_DIR/.env.production" ]]; then
        error "Production environment file not found: $SCRIPT_DIR/.env.production"
        checks_passed=false
    else
        success "✓ Production environment file found"
    fi
    
    # Check SSL certificates
    info "Checking SSL certificates..."
    if [[ ! -f "/etc/letsencrypt/live/${PROJECT_NAME}.com/fullchain.pem" ]]; then
        warning "SSL certificate not found. Will attempt to generate..."
    else
        success "✓ SSL certificates found"
    fi
    
    # Check database connectivity
    info "Checking database connectivity..."
    if ! docker run --rm --network host postgres:15 pg_isready -h localhost -p 5432 &> /dev/null; then
        warning "Cannot connect to database. Make sure it's accessible."
    else
        success "✓ Database is accessible"
    fi
    
    # Check current deployment status
    if [[ -L "$DEPLOYMENT_DIR/current" ]]; then
        local current_release=$(readlink "$DEPLOYMENT_DIR/current")
        info "Current deployment: $current_release"
    else
        info "No current deployment found. This will be the first deployment."
    fi
    
    if [[ "$checks_passed" == false ]]; then
        error "Pre-deployment checks failed! Aborting deployment."
        exit 1
    fi
    
    success "All pre-deployment checks passed!"
}

# ============================================
# BACKUP CURRENT DEPLOYMENT
# ============================================

backup_current_deployment() {
    section "BACKING UP CURRENT DEPLOYMENT"
    
    if [[ -L "$DEPLOYMENT_DIR/current" ]]; then
        local current_release=$(readlink "$DEPLOYMENT_DIR/current")
        local backup_name="backup_${DEPLOYMENT_TIMESTAMP}_$(basename "$current_release")"
        local backup_path="$BACKUP_DIR/$backup_name"
        
        log "Creating backup: $backup_name"
        
        # Backup database
        info "Backing up database..."
        docker exec spirit-tours-postgres pg_dump -U postgres spirit_tours | gzip > "$backup_path.sql.gz"
        success "✓ Database backed up"
        
        # Backup application files
        info "Backing up application files..."
        tar -czf "$backup_path.tar.gz" -C "$DEPLOYMENT_DIR/current" .
        success "✓ Application files backed up"
        
        # Backup Docker volumes
        info "Backing up Docker volumes..."
        docker run --rm \
            -v spirit-tours_postgres_data:/data \
            -v "$BACKUP_DIR":/backup \
            alpine tar -czf "/backup/${backup_name}_volumes.tar.gz" -C /data .
        success "✓ Docker volumes backed up"
        
        # Keep only last 10 backups
        info "Cleaning old backups..."
        ls -t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm
        
        success "Backup completed: $backup_path"
    else
        info "No current deployment to backup"
    fi
}

# ============================================
# BUILD AND PREPARE RELEASE
# ============================================

prepare_release() {
    section "PREPARING NEW RELEASE"
    
    local release_dir="$DEPLOYMENT_DIR/releases/$DEPLOYMENT_ID"
    
    log "Creating release directory: $release_dir"
    mkdir -p "$release_dir"
    
    # Copy application files
    info "Copying application files..."
    rsync -av --exclude='.git' --exclude='node_modules' --exclude='__pycache__' \
        "$PROJECT_ROOT/" "$release_dir/"
    
    # Copy production environment file
    cp "$SCRIPT_DIR/.env.production" "$release_dir/.env"
    
    # Build Docker images
    info "Building Docker images..."
    cd "$release_dir"
    
    docker-compose -f "$SCRIPT_DIR/docker-compose.production.yml" build --no-cache
    
    if [[ $? -ne 0 ]]; then
        error "Docker build failed!"
        return 1
    fi
    
    success "Release prepared successfully: $DEPLOYMENT_ID"
    echo "$release_dir"
}

# ============================================
# DATABASE MIGRATIONS
# ============================================

run_database_migrations() {
    section "RUNNING DATABASE MIGRATIONS"
    
    local release_dir="$1"
    
    info "Checking for pending migrations..."
    
    # Run migrations in a temporary container
    docker run --rm \
        --network spirit-tours_production \
        -v "$release_dir:/app" \
        -e DATABASE_URL="$DATABASE_URL" \
        spirit-tours-backend:latest \
        alembic upgrade head
    
    if [[ $? -eq 0 ]]; then
        success "✓ Database migrations completed successfully"
    else
        error "Database migrations failed!"
        return 1
    fi
}

# ============================================
# BLUE-GREEN DEPLOYMENT
# ============================================

deploy_blue_green() {
    section "EXECUTING BLUE-GREEN DEPLOYMENT"
    
    local release_dir="$1"
    local blue_port=8001
    local green_port=8002
    local current_color="blue"
    local new_color="green"
    
    # Determine current deployment color
    if docker ps | grep -q "spirit-tours-green"; then
        current_color="green"
        new_color="blue"
        green_port=8001
        blue_port=8002
    fi
    
    log "Current environment: $current_color"
    log "Deploying to: $new_color"
    
    # Start new environment
    info "Starting $new_color environment..."
    
    export DEPLOYMENT_COLOR="$new_color"
    export API_PORT="$([[ $new_color == 'blue' ]] && echo $blue_port || echo $green_port)"
    
    cd "$release_dir"
    docker-compose -f "$SCRIPT_DIR/docker-compose.production.yml" \
        -p "spirit-tours-$new_color" \
        up -d
    
    # Wait for new environment to be healthy
    if ! wait_for_health "$API_PORT"; then
        error "New environment failed health checks!"
        docker-compose -p "spirit-tours-$new_color" down
        return 1
    fi
    
    # Run smoke tests on new environment
    if ! run_smoke_tests "$API_PORT"; then
        error "Smoke tests failed on new environment!"
        docker-compose -p "spirit-tours-$new_color" down
        return 1
    fi
    
    # Switch traffic to new environment
    info "Switching traffic to $new_color environment..."
    switch_nginx_upstream "$new_color" "$API_PORT"
    
    # Verify switch
    sleep 5
    if ! verify_deployment "$API_PORT"; then
        error "Deployment verification failed!"
        switch_nginx_upstream "$current_color" "$([[ $current_color == 'blue' ]] && echo $blue_port || echo $green_port)"
        docker-compose -p "spirit-tours-$new_color" down
        return 1
    fi
    
    # Stop old environment after successful switch
    info "Stopping $current_color environment..."
    docker-compose -p "spirit-tours-$current_color" down
    
    # Update symlink
    ln -sfn "$release_dir" "$DEPLOYMENT_DIR/current"
    
    success "Blue-Green deployment completed successfully!"
}

# ============================================
# CANARY DEPLOYMENT
# ============================================

deploy_canary() {
    section "EXECUTING CANARY DEPLOYMENT"
    
    local release_dir="$1"
    local canary_percentage="${CANARY_PERCENTAGE:-10}"
    
    log "Deploying canary with ${canary_percentage}% traffic"
    
    # Start canary environment
    info "Starting canary environment..."
    
    export DEPLOYMENT_COLOR="canary"
    export API_PORT="8003"
    
    cd "$release_dir"
    docker-compose -f "$SCRIPT_DIR/docker-compose.production.yml" \
        -p "spirit-tours-canary" \
        up -d
    
    # Wait for canary to be healthy
    if ! wait_for_health "$API_PORT"; then
        error "Canary environment failed health checks!"
        docker-compose -p "spirit-tours-canary" down
        return 1
    fi
    
    # Configure nginx for canary routing
    configure_nginx_canary "$canary_percentage"
    
    # Monitor canary metrics
    info "Monitoring canary deployment for 5 minutes..."
    if ! monitor_canary 300; then
        error "Canary deployment showing errors! Rolling back..."
        remove_nginx_canary
        docker-compose -p "spirit-tours-canary" down
        return 1
    fi
    
    # Gradually increase traffic
    for percentage in 25 50 75 100; do
        info "Increasing canary traffic to ${percentage}%"
        configure_nginx_canary "$percentage"
        
        if ! monitor_canary 60; then
            error "Canary deployment failed at ${percentage}%! Rolling back..."
            remove_nginx_canary
            docker-compose -p "spirit-tours-canary" down
            return 1
        fi
    done
    
    # Full promotion
    info "Promoting canary to production..."
    switch_nginx_upstream "canary" "8003"
    
    # Stop old production
    docker-compose -p "spirit-tours-production" down
    
    # Rename canary to production
    docker-compose -p "spirit-tours-canary" down
    docker-compose -p "spirit-tours-production" up -d
    
    success "Canary deployment completed successfully!"
}

# ============================================
# HEALTH CHECKS
# ============================================

wait_for_health() {
    local port="$1"
    local retries=0
    
    info "Waiting for service to be healthy on port $port..."
    
    while [[ $retries -lt $MAX_HEALTH_CHECK_RETRIES ]]; do
        if curl -f "http://localhost:$port/health" &> /dev/null; then
            success "✓ Service is healthy!"
            return 0
        fi
        
        retries=$((retries + 1))
        info "Health check attempt $retries/$MAX_HEALTH_CHECK_RETRIES"
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    error "Service failed to become healthy after $MAX_HEALTH_CHECK_RETRIES attempts"
    return 1
}

run_smoke_tests() {
    local port="$1"
    
    info "Running smoke tests..."
    
    # Test API endpoints
    local endpoints=(
        "/health"
        "/api/tours/search?destination=Madrid"
        "/api/auth/status"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if ! curl -f "http://localhost:$port$endpoint" &> /dev/null; then
            error "Smoke test failed for endpoint: $endpoint"
            return 1
        fi
        success "✓ $endpoint"
    done
    
    # Test database connectivity
    if ! docker exec spirit-tours-backend-$DEPLOYMENT_COLOR python -c "
from sqlalchemy import create_engine
engine = create_engine('$DATABASE_URL')
conn = engine.connect()
result = conn.execute('SELECT 1')
conn.close()
print('Database connection successful')
" &> /dev/null; then
        error "Database connectivity test failed!"
        return 1
    fi
    
    success "✓ All smoke tests passed!"
    return 0
}

verify_deployment() {
    local port="$1"
    
    info "Verifying deployment..."
    
    # Check service health
    if ! curl -f "http://localhost:$port/health" &> /dev/null; then
        error "Health endpoint not responding!"
        return 1
    fi
    
    # Check version
    local deployed_version=$(curl -s "http://localhost:$port/api/version" | jq -r '.version')
    if [[ "$deployed_version" != "$DEPLOYMENT_VERSION" ]]; then
        error "Version mismatch! Expected: $DEPLOYMENT_VERSION, Got: $deployed_version"
        return 1
    fi
    
    # Check critical services
    local services=("backend" "frontend" "ai-agents" "redis" "postgres")
    for service in "${services[@]}"; do
        if ! docker ps | grep -q "spirit-tours-$service"; then
            error "Service not running: $service"
            return 1
        fi
    done
    
    success "✓ Deployment verified successfully!"
    return 0
}

# ============================================
# NGINX CONFIGURATION
# ============================================

switch_nginx_upstream() {
    local color="$1"
    local port="$2"
    
    info "Switching nginx upstream to $color ($port)..."
    
    cat > /etc/nginx/sites-available/spirit-tours-upstream.conf << EOF
upstream spirit_tours_backend {
    server localhost:$port max_fails=3 fail_timeout=30s;
    keepalive 32;
}
EOF
    
    nginx -t && nginx -s reload
    
    success "✓ Nginx upstream switched to $color"
}

configure_nginx_canary() {
    local percentage="$1"
    local main_weight=$((100 - percentage))
    local canary_weight="$percentage"
    
    info "Configuring nginx for canary deployment (${percentage}% traffic)..."
    
    cat > /etc/nginx/sites-available/spirit-tours-upstream.conf << EOF
upstream spirit_tours_backend {
    server localhost:8001 weight=$main_weight max_fails=3 fail_timeout=30s;
    server localhost:8003 weight=$canary_weight max_fails=3 fail_timeout=30s;
    keepalive 32;
}
EOF
    
    nginx -t && nginx -s reload
    
    success "✓ Nginx configured for canary deployment"
}

remove_nginx_canary() {
    info "Removing canary configuration from nginx..."
    
    cat > /etc/nginx/sites-available/spirit-tours-upstream.conf << EOF
upstream spirit_tours_backend {
    server localhost:8001 max_fails=3 fail_timeout=30s;
    keepalive 32;
}
EOF
    
    nginx -t && nginx -s reload
}

# ============================================
# MONITORING
# ============================================

monitor_canary() {
    local duration="$1"
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    
    info "Monitoring canary for $duration seconds..."
    
    while [[ $(date +%s) -lt $end_time ]]; do
        # Check error rate
        local error_rate=$(curl -s http://localhost:9090/api/v1/query?query=rate\(http_requests_total\{status=~\"5..\"\}\[1m\]\) | jq -r '.data.result[0].value[1]' || echo "0")
        
        if (( $(echo "$error_rate > 0.01" | bc -l) )); then
            error "High error rate detected: $error_rate"
            return 1
        fi
        
        # Check response time
        local response_time=$(curl -s http://localhost:9090/api/v1/query?query=http_request_duration_seconds\{quantile=\"0.95\"\} | jq -r '.data.result[0].value[1]' || echo "0")
        
        if (( $(echo "$response_time > 1" | bc -l) )); then
            warning "High response time detected: ${response_time}s"
        fi
        
        sleep 10
    done
    
    success "✓ Canary monitoring completed successfully"
    return 0
}

# ============================================
# POST-DEPLOYMENT
# ============================================

post_deployment_tasks() {
    section "POST-DEPLOYMENT TASKS"
    
    # Clear cache
    info "Clearing application cache..."
    docker exec spirit-tours-redis redis-cli FLUSHDB
    success "✓ Cache cleared"
    
    # Warm up cache
    info "Warming up cache..."
    curl -X POST "http://localhost:8001/api/admin/warm-cache" \
        -H "Authorization: Bearer $ADMIN_TOKEN"
    success "✓ Cache warmed up"
    
    # Send deployment notification
    info "Sending deployment notification..."
    send_deployment_notification
    
    # Update monitoring dashboards
    info "Updating monitoring dashboards..."
    update_monitoring_dashboards
    
    # Clean up old releases (keep last 5)
    info "Cleaning up old releases..."
    ls -t "$DEPLOYMENT_DIR/releases" | tail -n +6 | xargs -I {} rm -rf "$DEPLOYMENT_DIR/releases/{}"
    
    # Generate deployment report
    generate_deployment_report
    
    success "Post-deployment tasks completed!"
}

send_deployment_notification() {
    local webhook_url="${SLACK_WEBHOOK_URL:-}"
    
    if [[ -n "$webhook_url" ]]; then
        local payload=$(cat <<EOF
{
    "text": "🚀 Production Deployment Completed",
    "attachments": [{
        "color": "good",
        "fields": [
            {"title": "Version", "value": "$DEPLOYMENT_VERSION", "short": true},
            {"title": "Environment", "value": "Production", "short": true},
            {"title": "Deployment ID", "value": "$DEPLOYMENT_ID", "short": true},
            {"title": "Status", "value": "Success", "short": true}
        ]
    }]
}
EOF
)
        curl -X POST -H 'Content-type: application/json' --data "$payload" "$webhook_url"
    fi
}

update_monitoring_dashboards() {
    # Update Grafana annotations
    local grafana_url="http://localhost:3000"
    local grafana_token="${GRAFANA_API_TOKEN:-}"
    
    if [[ -n "$grafana_token" ]]; then
        curl -X POST "$grafana_url/api/annotations" \
            -H "Authorization: Bearer $grafana_token" \
            -H "Content-Type: application/json" \
            -d "{
                \"dashboardId\": 1,
                \"text\": \"Deployment: $DEPLOYMENT_VERSION\",
                \"tags\": [\"deployment\", \"production\"]
            }"
    fi
}

generate_deployment_report() {
    local report_file="$LOG_DIR/deployment_report_${DEPLOYMENT_TIMESTAMP}.json"
    
    cat > "$report_file" <<EOF
{
    "deployment_id": "$DEPLOYMENT_ID",
    "version": "$DEPLOYMENT_VERSION",
    "timestamp": "$DEPLOYMENT_TIMESTAMP",
    "environment": "production",
    "deployment_type": "$([[ $ENABLE_BLUE_GREEN == true ]] && echo "blue-green" || echo "canary")",
    "status": "success",
    "duration_seconds": $(($(date +%s) - DEPLOYMENT_START_TIME)),
    "services": {
        "backend": "running",
        "frontend": "running",
        "ai-agents": "running",
        "database": "running",
        "cache": "running"
    },
    "health_checks": "passed",
    "smoke_tests": "passed",
    "rollback_available": true
}
EOF
    
    info "Deployment report saved: $report_file"
}

# ============================================
# ROLLBACK
# ============================================

rollback_deployment() {
    section "ROLLING BACK DEPLOYMENT"
    
    error "Deployment failed! Initiating rollback..."
    
    # Find previous release
    local previous_release=$(ls -t "$DEPLOYMENT_DIR/releases" | head -2 | tail -1)
    
    if [[ -z "$previous_release" ]]; then
        error "No previous release found for rollback!"
        return 1
    fi
    
    info "Rolling back to: $previous_release"
    
    # Restore database backup
    local backup_file=$(ls -t "$BACKUP_DIR"/backup_*.sql.gz | head -1)
    if [[ -f "$backup_file" ]]; then
        info "Restoring database backup..."
        gunzip < "$backup_file" | docker exec -i spirit-tours-postgres psql -U postgres spirit_tours
    fi
    
    # Switch to previous release
    cd "$DEPLOYMENT_DIR/releases/$previous_release"
    docker-compose -f "$SCRIPT_DIR/docker-compose.production.yml" up -d
    
    # Update symlink
    ln -sfn "$DEPLOYMENT_DIR/releases/$previous_release" "$DEPLOYMENT_DIR/current"
    
    # Verify rollback
    if wait_for_health 8001; then
        success "Rollback completed successfully!"
        send_rollback_notification
        return 0
    else
        error "Rollback failed! Manual intervention required!"
        return 1
    fi
}

send_rollback_notification() {
    local webhook_url="${SLACK_WEBHOOK_URL:-}"
    
    if [[ -n "$webhook_url" ]]; then
        local payload=$(cat <<EOF
{
    "text": "⚠️ Production Deployment Rolled Back",
    "attachments": [{
        "color": "warning",
        "fields": [
            {"title": "Failed Version", "value": "$DEPLOYMENT_VERSION", "short": true},
            {"title": "Rolled Back To", "value": "$previous_release", "short": true},
            {"title": "Reason", "value": "Deployment verification failed", "short": false}
        ]
    }]
}
EOF
)
        curl -X POST -H 'Content-type: application/json' --data "$payload" "$webhook_url"
    fi
}

# ============================================
# MAIN DEPLOYMENT FLOW
# ============================================

main() {
    DEPLOYMENT_START_TIME=$(date +%s)
    
    section "SPIRIT TOURS PRODUCTION DEPLOYMENT"
    log "Deployment ID: $DEPLOYMENT_ID"
    log "Version: $DEPLOYMENT_VERSION"
    log "Timestamp: $DEPLOYMENT_TIMESTAMP"
    
    # Trap errors for rollback
    trap 'if [[ $? -ne 0 ]] && [[ "$ROLLBACK_ON_FAILURE" == true ]]; then rollback_deployment; fi' ERR
    
    # Load environment
    set -a
    source "$SCRIPT_DIR/.env.production"
    set +a
    
    # Execute deployment steps
    pre_deployment_checks
    backup_current_deployment
    
    # Prepare new release
    release_dir=$(prepare_release)
    if [[ -z "$release_dir" ]]; then
        error "Failed to prepare release!"
        exit 1
    fi
    
    # Run migrations
    if ! run_database_migrations "$release_dir"; then
        error "Database migrations failed!"
        exit 1
    fi
    
    # Deploy based on strategy
    if [[ "$ENABLE_BLUE_GREEN" == true ]]; then
        if ! deploy_blue_green "$release_dir"; then
            error "Blue-Green deployment failed!"
            exit 1
        fi
    elif [[ "$ENABLE_CANARY" == true ]]; then
        if ! deploy_canary "$release_dir"; then
            error "Canary deployment failed!"
            exit 1
        fi
    else
        error "No deployment strategy enabled!"
        exit 1
    fi
    
    # Post-deployment tasks
    post_deployment_tasks
    
    # Calculate deployment time
    local deployment_duration=$(($(date +%s) - DEPLOYMENT_START_TIME))
    
    # Final summary
    section "DEPLOYMENT COMPLETED SUCCESSFULLY"
    success "Version $DEPLOYMENT_VERSION deployed to production!"
    success "Deployment ID: $DEPLOYMENT_ID"
    success "Duration: ${deployment_duration} seconds"
    success "Status: LIVE"
    
    echo ""
    info "Access URLs:"
    info "  Production: https://spirit-tours.com"
    info "  API: https://api.spirit-tours.com"
    info "  Admin: https://admin.spirit-tours.com"
    info "  Monitoring: https://monitoring.spirit-tours.com"
    echo ""
    info "Next Steps:"
    info "  1. Verify production functionality"
    info "  2. Monitor metrics and logs"
    info "  3. Check user feedback"
    info "  4. Document any issues"
    echo ""
    
    exit 0
}

# Execute main function
main "$@"