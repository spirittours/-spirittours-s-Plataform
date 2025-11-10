#!/bin/bash

# ============================================================
# Spirit Tours - DigitalOcean Automated Deployment Script
# Version: 1.0.0
# Description: Complete automated deployment for DigitalOcean
# ============================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration Variables
DEPLOYMENT_NAME="spirit-tours"
DEPLOYMENT_VERSION="2.0.0"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="deployment_${TIMESTAMP}.log"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

# Banner
clear
echo "============================================================" | tee -a "$LOG_FILE"
echo "   SPIRIT TOURS - DIGITALOCEAN AUTOMATED DEPLOYMENT" | tee -a "$LOG_FILE"
echo "   Version: ${DEPLOYMENT_VERSION}" | tee -a "$LOG_FILE"
echo "   Timestamp: ${TIMESTAMP}" | tee -a "$LOG_FILE"
echo "============================================================" | tee -a "$LOG_FILE"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install prerequisites
install_prerequisites() {
    print_status "Installing prerequisites..."
    
    apt-get update -y >> "$LOG_FILE" 2>&1
    apt-get upgrade -y >> "$LOG_FILE" 2>&1
    
    # Install essential packages
    apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        ufw \
        fail2ban \
        htop \
        net-tools \
        zip \
        unzip \
        jq >> "$LOG_FILE" 2>&1
    
    print_success "Prerequisites installed"
}

# Function to install Docker
install_docker() {
    print_status "Installing Docker..."
    
    if command_exists docker; then
        print_warning "Docker already installed, skipping..."
        return
    fi
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Set up the stable repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    apt-get update -y >> "$LOG_FILE" 2>&1
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin >> "$LOG_FILE" 2>&1
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    print_success "Docker installed successfully"
}

# Function to install Docker Compose
install_docker_compose() {
    print_status "Installing Docker Compose..."
    
    if command_exists docker-compose; then
        print_warning "Docker Compose already installed, skipping..."
        return
    fi
    
    # Download Docker Compose
    COMPOSE_VERSION="2.23.0"
    curl -L "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Create symbolic link
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    print_success "Docker Compose installed successfully"
}

# Function to install Node.js
install_nodejs() {
    print_status "Installing Node.js..."
    
    if command_exists node; then
        print_warning "Node.js already installed, skipping..."
        return
    fi
    
    # Install Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - >> "$LOG_FILE" 2>&1
    apt-get install -y nodejs >> "$LOG_FILE" 2>&1
    
    # Install PM2 globally
    npm install -g pm2 >> "$LOG_FILE" 2>&1
    
    print_success "Node.js and PM2 installed successfully"
}

# Function to install Python
install_python() {
    print_status "Installing Python 3.11..."
    
    if command_exists python3.11; then
        print_warning "Python 3.11 already installed, skipping..."
        return
    fi
    
    # Add deadsnakes PPA for Python 3.11
    add-apt-repository ppa:deadsnakes/ppa -y >> "$LOG_FILE" 2>&1
    apt-get update -y >> "$LOG_FILE" 2>&1
    
    # Install Python 3.11 and pip
    apt-get install -y python3.11 python3.11-venv python3.11-dev python3-pip >> "$LOG_FILE" 2>&1
    
    # Set Python 3.11 as default python3
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
    
    print_success "Python 3.11 installed successfully"
}

# Function to install Nginx
install_nginx() {
    print_status "Installing Nginx..."
    
    if command_exists nginx; then
        print_warning "Nginx already installed, skipping..."
        return
    fi
    
    apt-get install -y nginx certbot python3-certbot-nginx >> "$LOG_FILE" 2>&1
    
    # Start and enable Nginx
    systemctl start nginx
    systemctl enable nginx
    
    print_success "Nginx installed successfully"
}

# Function to setup firewall
setup_firewall() {
    print_status "Configuring firewall..."
    
    # Enable UFW
    ufw --force enable >> "$LOG_FILE" 2>&1
    
    # Allow SSH (port 22)
    ufw allow 22/tcp >> "$LOG_FILE" 2>&1
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp >> "$LOG_FILE" 2>&1
    ufw allow 443/tcp >> "$LOG_FILE" 2>&1
    
    # Allow API ports
    ufw allow 3000/tcp >> "$LOG_FILE" 2>&1
    ufw allow 8000/tcp >> "$LOG_FILE" 2>&1
    
    # Allow PostgreSQL from Docker network
    ufw allow from 172.20.0.0/16 to any port 5432 >> "$LOG_FILE" 2>&1
    
    # Allow Redis from Docker network
    ufw allow from 172.20.0.0/16 to any port 6379 >> "$LOG_FILE" 2>&1
    
    print_success "Firewall configured"
}

# Function to create application user
create_app_user() {
    print_status "Creating application user..."
    
    APP_USER="spirittours"
    
    if id "$APP_USER" &>/dev/null; then
        print_warning "User $APP_USER already exists, skipping..."
        return
    fi
    
    # Create user with home directory
    useradd -m -s /bin/bash "$APP_USER"
    
    # Add user to docker group
    usermod -aG docker "$APP_USER"
    
    # Create application directories
    mkdir -p /home/"$APP_USER"/app
    mkdir -p /home/"$APP_USER"/backups
    mkdir -p /home/"$APP_USER"/logs
    
    # Set permissions
    chown -R "$APP_USER":"$APP_USER" /home/"$APP_USER"
    
    print_success "Application user created"
}

# Function to clone repository
clone_repository() {
    print_status "Cloning repository..."
    
    APP_DIR="/home/spirittours/app"
    
    # Check if directory exists
    if [ -d "$APP_DIR/spirit-tours" ]; then
        print_status "Repository already exists, pulling latest changes..."
        cd "$APP_DIR/spirit-tours"
        git pull origin main >> "$LOG_FILE" 2>&1
    else
        cd "$APP_DIR"
        # Clone the repository (replace with your actual repository URL)
        git clone https://github.com/your-org/spirit-tours.git spirit-tours >> "$LOG_FILE" 2>&1
    fi
    
    cd "$APP_DIR/spirit-tours"
    
    # Set permissions
    chown -R spirittours:spirittours "$APP_DIR"
    
    print_success "Repository cloned/updated"
}

# Function to create environment file
create_env_file() {
    print_status "Creating environment configuration..."
    
    APP_DIR="/home/spirittours/app/spirit-tours"
    ENV_FILE="$APP_DIR/.env.production"
    
    # Backup existing env file if exists
    if [ -f "$ENV_FILE" ]; then
        cp "$ENV_FILE" "$ENV_FILE.backup.${TIMESTAMP}"
    fi
    
    # Create new environment file
    cat > "$ENV_FILE" << 'EOF'
# ==================== APPLICATION ====================
NODE_ENV=production
APP_NAME=Spirit Tours
APP_URL=https://app.spirittours.com
API_URL=https://api.spirittours.com
PORT=3000

# ==================== DATABASE ====================
DB_HOST=postgres
DB_PORT=5432
DB_NAME=spirit_tours_prod
DB_USER=spirit_admin
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD_$(openssl rand -base64 32)
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=20

# ==================== REDIS ====================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD_$(openssl rand -base64 32)
REDIS_DB=0

# ==================== JWT ====================
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRY=7d
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_EXPIRY=30d

# ==================== SMTP ====================
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=YOUR_SENDGRID_API_KEY
SMTP_FROM="Spirit Tours <noreply@spirittours.com>"

# ==================== STRIPE ====================
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# ==================== AWS S3 ====================
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=spirit-tours-assets

# ==================== GOOGLE ====================
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
GOOGLE_OAUTH_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# ==================== OPENAI ====================
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_ORGANIZATION=YOUR_ORG_ID

# ==================== MONITORING ====================
SENTRY_DSN=YOUR_SENTRY_DSN
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 16)

# ==================== SECURITY ====================
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGINS=https://app.spirittours.com,https://spirittours.com
SESSION_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
EOF
    
    # Set permissions
    chmod 600 "$ENV_FILE"
    chown spirittours:spirittours "$ENV_FILE"
    
    print_success "Environment configuration created"
    print_warning "Please update the .env.production file with your actual API keys"
}

# Function to setup SSL certificate
setup_ssl() {
    print_status "Setting up SSL certificate..."
    
    read -p "Enter your domain name (e.g., spirittours.com): " DOMAIN_NAME
    read -p "Enter your email for SSL notifications: " SSL_EMAIL
    
    if [ -z "$DOMAIN_NAME" ] || [ -z "$SSL_EMAIL" ]; then
        print_warning "Skipping SSL setup - no domain provided"
        return
    fi
    
    # Create Nginx configuration
    cat > "/etc/nginx/sites-available/${DOMAIN_NAME}" << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # Enable site
    ln -sf "/etc/nginx/sites-available/${DOMAIN_NAME}" "/etc/nginx/sites-enabled/"
    
    # Test Nginx configuration
    nginx -t >> "$LOG_FILE" 2>&1
    
    # Reload Nginx
    systemctl reload nginx
    
    # Obtain SSL certificate
    certbot --nginx -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME" --non-interactive --agree-tos --email "$SSL_EMAIL" >> "$LOG_FILE" 2>&1
    
    print_success "SSL certificate configured"
}

# Function to deploy application with Docker
deploy_application() {
    print_status "Deploying application with Docker..."
    
    APP_DIR="/home/spirittours/app/spirit-tours"
    cd "$APP_DIR"
    
    # Copy production environment file
    cp .env.production .env
    
    # Build Docker images
    print_status "Building Docker images..."
    docker-compose -f docker-compose.production.yml build >> "$LOG_FILE" 2>&1
    
    # Start services
    print_status "Starting services..."
    docker-compose -f docker-compose.production.yml up -d >> "$LOG_FILE" 2>&1
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Run database migrations
    print_status "Running database migrations..."
    docker-compose -f docker-compose.production.yml exec -T api python -m alembic upgrade head >> "$LOG_FILE" 2>&1
    
    # Check service status
    docker-compose -f docker-compose.production.yml ps
    
    print_success "Application deployed successfully"
}

# Function to setup monitoring
setup_monitoring() {
    print_status "Setting up monitoring..."
    
    APP_DIR="/home/spirittours/app/spirit-tours"
    cd "$APP_DIR"
    
    # Create monitoring directories
    mkdir -p /var/lib/prometheus
    mkdir -p /var/lib/grafana
    
    # Set permissions
    chown -R 65534:65534 /var/lib/prometheus
    chown -R 472:472 /var/lib/grafana
    
    print_success "Monitoring setup complete"
}

# Function to setup backup cron
setup_backup_cron() {
    print_status "Setting up automated backups..."
    
    # Create backup script
    cat > /home/spirittours/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/spirittours/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="spirit-tours-postgres"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Backup database
docker exec "$DB_CONTAINER" pg_dump -U spirit_admin spirit_tours_prod | gzip > "$BACKUP_DIR/db_backup_${TIMESTAMP}.sql.gz"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +30 -delete

# Upload to DigitalOcean Spaces (optional)
# s3cmd put "$BACKUP_DIR/db_backup_${TIMESTAMP}.sql.gz" s3://your-bucket/backups/
EOF
    
    chmod +x /home/spirittours/backup.sh
    chown spirittours:spirittours /home/spirittours/backup.sh
    
    # Add cron job for daily backup at 2 AM
    (crontab -u spirittours -l 2>/dev/null; echo "0 2 * * * /home/spirittours/backup.sh >> /home/spirittours/logs/backup.log 2>&1") | crontab -u spirittours -
    
    print_success "Backup cron job configured"
}

# Function to create systemd service
create_systemd_service() {
    print_status "Creating systemd service..."
    
    cat > /etc/systemd/system/spirit-tours.service << EOF
[Unit]
Description=Spirit Tours Platform
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/spirittours/app/spirit-tours
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
ExecReload=/usr/local/bin/docker-compose -f docker-compose.production.yml restart
User=spirittours
Group=spirittours

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable spirit-tours.service
    
    print_success "Systemd service created"
}

# Function to perform health check
health_check() {
    print_status "Performing health checks..."
    
    # Check Docker containers
    print_status "Docker containers status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Check API health
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_success "API is healthy"
    else
        print_error "API health check failed"
    fi
    
    # Check Frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend is accessible"
    else
        print_error "Frontend health check failed"
    fi
    
    # Check PostgreSQL
    if docker exec spirit-tours-postgres pg_isready > /dev/null 2>&1; then
        print_success "PostgreSQL is ready"
    else
        print_error "PostgreSQL health check failed"
    fi
    
    # Check Redis
    if docker exec spirit-tours-redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is ready"
    else
        print_error "Redis health check failed"
    fi
}

# Function to display summary
display_summary() {
    echo ""
    echo "============================================================"
    echo "   DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo "============================================================"
    echo ""
    echo "📊 Deployment Summary:"
    echo "------------------------------------------------------------"
    echo "✅ System updated and prerequisites installed"
    echo "✅ Docker and Docker Compose installed"
    echo "✅ Node.js and Python 3.11 installed"
    echo "✅ Nginx configured as reverse proxy"
    echo "✅ Firewall configured with UFW"
    echo "✅ Application deployed with Docker Compose"
    echo "✅ Database migrations executed"
    echo "✅ Monitoring stack deployed"
    echo "✅ Backup cron job configured"
    echo "✅ Systemd service created"
    echo ""
    echo "📌 Access URLs:"
    echo "------------------------------------------------------------"
    echo "🌐 Frontend: http://$(curl -s ifconfig.me)"
    echo "🔧 API: http://$(curl -s ifconfig.me):8000"
    echo "📊 API Docs: http://$(curl -s ifconfig.me):8000/docs"
    echo "📈 Prometheus: http://$(curl -s ifconfig.me):9090"
    echo "📊 Grafana: http://$(curl -s ifconfig.me):3001"
    echo ""
    echo "⚙️  Next Steps:"
    echo "------------------------------------------------------------"
    echo "1. Update /home/spirittours/app/spirit-tours/.env.production with your API keys"
    echo "2. Configure your domain DNS to point to this server"
    echo "3. Run: certbot --nginx -d yourdomain.com"
    echo "4. Access Grafana and configure dashboards"
    echo "5. Test all functionality"
    echo ""
    echo "📁 Important Locations:"
    echo "------------------------------------------------------------"
    echo "Application: /home/spirittours/app/spirit-tours"
    echo "Logs: /home/spirittours/logs"
    echo "Backups: /home/spirittours/backups"
    echo "Environment: /home/spirittours/app/spirit-tours/.env.production"
    echo ""
    echo "🔧 Useful Commands:"
    echo "------------------------------------------------------------"
    echo "View logs: docker-compose -f docker-compose.production.yml logs -f"
    echo "Restart services: systemctl restart spirit-tours"
    echo "Check status: docker-compose -f docker-compose.production.yml ps"
    echo "Run backup: /home/spirittours/backup.sh"
    echo ""
    echo "📝 Log file: $LOG_FILE"
    echo "============================================================"
}

# Main execution
main() {
    print_status "Starting automated deployment..."
    
    # Create log file
    touch "$LOG_FILE"
    
    # Execute installation steps
    install_prerequisites
    install_docker
    install_docker_compose
    install_nodejs
    install_python
    install_nginx
    setup_firewall
    create_app_user
    clone_repository
    create_env_file
    deploy_application
    setup_monitoring
    setup_backup_cron
    create_systemd_service
    health_check
    
    # Optional SSL setup
    read -p "Do you want to setup SSL now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_ssl
    fi
    
    display_summary
    
    print_success "Deployment completed successfully!"
    print_status "Total deployment time: $SECONDS seconds"
}

# Run main function
main "$@"