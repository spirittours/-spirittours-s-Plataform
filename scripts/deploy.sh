#!/bin/bash

# Spirit Tours Platform - Production Deployment Script
# This script handles the complete deployment process

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="spirit-tours"
ENVIRONMENT=${1:-production}
BACKUP_DIR="/backups"
LOG_FILE="/var/log/deploy.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
}

# Load environment variables
load_env() {
    log "Loading environment variables..."
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    else
        error ".env file not found. Please create it from .env.example"
    fi
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    mkdir -p $BACKUP_DIR
    mkdir -p /var/log/spirit_tours
    mkdir -p /var/cache/nginx
    mkdir -p /usr/share/nginx/static
    mkdir -p /usr/share/nginx/media
}

# Backup current deployment
backup_current() {
    log "Creating backup of current deployment..."
    if [ -d "./backend" ]; then
        BACKUP_FILE="$BACKUP_DIR/backup-$(date +'%Y%m%d-%H%M%S').tar.gz"
        tar -czf $BACKUP_FILE \
            --exclude='node_modules' \
            --exclude='__pycache__' \
            --exclude='.git' \
            ./backend ./frontend ./docker-compose.yml
        log "Backup created: $BACKUP_FILE"
    fi
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    # Update package list
    apt-get update
    
    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        log "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
    fi
    
    # Install Docker Compose if not present
    if ! command -v docker-compose &> /dev/null; then
        log "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    # Install other tools
    apt-get install -y \
        nginx \
        certbot \
        python3-certbot-nginx \
        postgresql-client \
        redis-tools \
        htop \
        git
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    if [ "$ENVIRONMENT" == "production" ]; then
        # Production: Use Let's Encrypt
        certbot --nginx -d spirittours.com -d www.spirittours.com \
            --non-interactive --agree-tos \
            --email admin@spirittours.com
    else
        # Development: Generate self-signed certificate
        mkdir -p /etc/nginx/ssl
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/nginx/ssl/spirittours.com.key \
            -out /etc/nginx/ssl/spirittours.com.crt \
            -subj "/C=US/ST=State/L=City/O=Spirit Tours/CN=spirittours.com"
    fi
}

# Database initialization
init_database() {
    log "Initializing database..."
    
    # Wait for PostgreSQL to be ready
    until docker-compose exec -T postgres pg_isready -U postgres; do
        log "Waiting for PostgreSQL..."
        sleep 2
    done
    
    # Run database initialization
    docker-compose exec -T backend python database/init_quotation_db.py
    
    log "Database initialized successfully"
}

# Build and deploy containers
deploy_containers() {
    log "Building and deploying Docker containers..."
    
    # Pull latest images
    docker-compose pull
    
    # Build custom images
    docker-compose build --no-cache
    
    # Stop old containers
    docker-compose down
    
    # Start new containers
    if [ "$ENVIRONMENT" == "production" ]; then
        docker-compose --profile production up -d
    else
        docker-compose up -d
    fi
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 10
    
    # Check health
    docker-compose ps
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    docker-compose exec -T backend alembic upgrade head
}

# Collect static files
collect_static() {
    log "Collecting static files..."
    docker-compose exec -T backend python -c "
import os
import shutil
source = '/app/static'
dest = '/usr/share/nginx/static'
if os.path.exists(source):
    shutil.copytree(source, dest, dirs_exist_ok=True)
"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Setup Prometheus
    if [ "$METRICS_ENABLED" == "true" ]; then
        docker run -d \
            --name prometheus \
            -p 9090:9090 \
            -v /etc/prometheus:/etc/prometheus \
            prom/prometheus
    fi
    
    # Setup log rotation
    cat > /etc/logrotate.d/spirit_tours <<EOF
/var/log/spirit_tours/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 root adm
    sharedscripts
    postrotate
        docker-compose kill -s USR1 backend
    endscript
}
EOF
}

# Health check
health_check() {
    log "Running health check..."
    
    # Check API health
    HEALTH_STATUS=$(curl -s http://localhost:8000/health | jq -r '.status')
    
    if [ "$HEALTH_STATUS" == "healthy" ]; then
        log "✅ API is healthy"
    else
        error "❌ API health check failed"
    fi
    
    # Check database
    docker-compose exec -T postgres pg_isready -U postgres
    
    # Check Redis
    docker-compose exec -T redis redis-cli ping
}

# Setup cron jobs
setup_cron() {
    log "Setting up cron jobs..."
    
    # Backup job
    (crontab -l 2>/dev/null; echo "0 2 * * * /home/user/webapp/scripts/backup.sh") | crontab -
    
    # SSL renewal
    (crontab -l 2>/dev/null; echo "0 0 1 * * certbot renew --quiet") | crontab -
    
    # Health monitoring
    (crontab -l 2>/dev/null; echo "*/5 * * * * /home/user/webapp/scripts/health_monitor.sh") | crontab -
}

# Main deployment flow
main() {
    echo "======================================"
    echo "Spirit Tours Platform Deployment"
    echo "Environment: $ENVIRONMENT"
    echo "======================================"
    
    check_root
    load_env
    create_directories
    backup_current
    install_dependencies
    setup_ssl
    
    # Copy Nginx config
    cp nginx.conf /etc/nginx/nginx.conf
    nginx -t && systemctl reload nginx
    
    deploy_containers
    init_database
    run_migrations
    collect_static
    setup_monitoring
    setup_cron
    health_check
    
    echo "======================================"
    echo "✅ Deployment completed successfully!"
    echo "======================================"
    echo ""
    echo "Access points:"
    echo "  - Frontend: https://spirittours.com"
    echo "  - API: https://spirittours.com/api"
    echo "  - API Docs: https://spirittours.com/api/docs"
    echo "  - WebSocket: wss://spirittours.com/ws"
    echo ""
    echo "Monitoring:"
    echo "  - Logs: docker-compose logs -f"
    echo "  - Status: docker-compose ps"
    echo ""
}

# Run main function
main "$@"