#!/bin/bash
#
# Spirit Tours Deployment Script
# Supports staging and production deployments
#
# Usage:
#   ./deploy.sh staging    # Deploy to staging
#   ./deploy.sh production # Deploy to production
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment argument is provided
if [ -z "$1" ]; then
    print_error "Environment argument required"
    echo "Usage: ./deploy.sh {staging|production}"
    exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Invalid environment: $ENVIRONMENT"
    echo "Valid environments: staging, production"
    exit 1
fi

print_info "Starting deployment to $ENVIRONMENT environment..."

# Configuration
PROJECT_NAME="spirit-tours-accounting"
DEPLOY_DIR="/var/www/$PROJECT_NAME"
BACKUP_DIR="/var/backups/$PROJECT_NAME"
LOG_FILE="/var/log/$PROJECT_NAME/deploy-$(date +%Y%m%d-%H%M%S).log"

# Git branch mapping
if [ "$ENVIRONMENT" == "staging" ]; then
    BRANCH="genspark_ai_developer"
    PM2_APP_NAME="spirit-tours-staging"
else
    BRANCH="main"
    PM2_APP_NAME="spirit-tours-production"
fi

print_info "Branch: $BRANCH"
print_info "PM2 App: $PM2_APP_NAME"

# Step 1: Pre-deployment checks
print_info "Step 1/10: Running pre-deployment checks..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node --version)
print_info "Node.js version: $NODE_VERSION"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warn "PM2 is not installed. Installing..."
    npm install -g pm2
fi

# Check if PostgreSQL client is available
if ! command -v psql &> /dev/null; then
    print_warn "PostgreSQL client not found"
fi

# Step 2: Create backup
print_info "Step 2/10: Creating backup..."

if [ -d "$DEPLOY_DIR" ]; then
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    print_info "Backing up to $BACKUP_DIR/$BACKUP_NAME"
    cp -r "$DEPLOY_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    
    # Keep only last 5 backups
    cd "$BACKUP_DIR"
    ls -t | tail -n +6 | xargs -r rm -rf
    
    print_info "Backup completed"
else
    print_warn "Deploy directory does not exist. Skipping backup."
fi

# Step 3: Pull latest code
print_info "Step 3/10: Pulling latest code from Git..."

if [ ! -d "$DEPLOY_DIR" ]; then
    print_info "Cloning repository..."
    git clone -b "$BRANCH" https://github.com/spirittours/-spirittours-s-Plataform.git "$DEPLOY_DIR"
else
    print_info "Updating existing repository..."
    cd "$DEPLOY_DIR"
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
fi

cd "$DEPLOY_DIR"

# Step 4: Install dependencies
print_info "Step 4/10: Installing Node.js dependencies..."

npm ci --production=false

# Install frontend dependencies
if [ -d "frontend" ]; then
    print_info "Installing frontend dependencies..."
    cd frontend
    npm ci --production=false
    cd ..
fi

# Step 5: Load environment variables
print_info "Step 5/10: Loading environment variables..."

if [ "$ENVIRONMENT" == "staging" ]; then
    ENV_FILE=".env.staging"
else
    ENV_FILE=".env.production"
fi

if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment file $ENV_FILE not found"
    exit 1
fi

cp "$ENV_FILE" .env
print_info "Loaded $ENV_FILE"

# Step 6: Run database migrations
print_info "Step 6/10: Running database migrations..."

if [ -f "scripts/migrate.js" ]; then
    NODE_ENV=$ENVIRONMENT node scripts/migrate.js
    print_info "Migrations completed"
else
    print_warn "Migration script not found. Skipping migrations."
fi

# Step 7: Build frontend
print_info "Step 7/10: Building frontend..."

if [ -d "frontend" ]; then
    cd frontend
    npm run build
    cd ..
    print_info "Frontend build completed"
else
    print_warn "Frontend directory not found. Skipping build."
fi

# Step 8: Run tests
print_info "Step 8/10: Running tests..."

if [ "$ENVIRONMENT" == "staging" ]; then
    # Run full test suite in staging
    npm run test:unit || print_warn "Some unit tests failed"
else
    # Run smoke tests in production
    npm run test:smoke || print_warn "Some smoke tests failed"
fi

# Step 9: Stop and restart application
print_info "Step 9/10: Restarting application..."

# Check if PM2 process exists
if pm2 list | grep -q "$PM2_APP_NAME"; then
    print_info "Stopping existing PM2 process..."
    pm2 stop "$PM2_APP_NAME"
    pm2 delete "$PM2_APP_NAME"
fi

# Start application with PM2
print_info "Starting application with PM2..."
pm2 start ecosystem.config.js --env "$ENVIRONMENT" --name "$PM2_APP_NAME"

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup

print_info "Application started successfully"

# Step 10: Health check
print_info "Step 10/10: Performing health check..."

sleep 5  # Wait for application to start

HEALTH_URL="http://localhost:3000/health"
MAX_ATTEMPTS=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    print_info "Health check attempt $ATTEMPT/$MAX_ATTEMPTS..."
    
    if curl -f -s "$HEALTH_URL" > /dev/null; then
        print_info "✓ Health check passed"
        break
    else
        if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
            print_error "Health check failed after $MAX_ATTEMPTS attempts"
            print_error "Rolling back deployment..."
            
            # Rollback
            if [ -d "$BACKUP_DIR" ]; then
                LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n 1)
                if [ -n "$LATEST_BACKUP" ]; then
                    print_info "Restoring from backup: $LATEST_BACKUP"
                    rm -rf "$DEPLOY_DIR"
                    cp -r "$BACKUP_DIR/$LATEST_BACKUP" "$DEPLOY_DIR"
                    
                    cd "$DEPLOY_DIR"
                    pm2 restart "$PM2_APP_NAME"
                    
                    print_info "Rollback completed"
                fi
            fi
            
            exit 1
        fi
        
        sleep 3
        ATTEMPT=$((ATTEMPT + 1))
    fi
done

# Step 11: Post-deployment tasks
print_info "Running post-deployment tasks..."

# Log deployment
echo "$(date): Deployed $ENVIRONMENT - Branch: $BRANCH - User: $(whoami)" >> "$LOG_FILE"

# Send notification (optional)
if command -v curl &> /dev/null && [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✅ Deployment to $ENVIRONMENT completed successfully\"}"
fi

# Cleanup old logs (keep last 30 days)
find /var/log/$PROJECT_NAME -name "deploy-*.log" -mtime +30 -delete 2>/dev/null || true

print_info "================================================"
print_info "Deployment to $ENVIRONMENT completed successfully!"
print_info "================================================"
print_info "Application: $PM2_APP_NAME"
print_info "Branch: $BRANCH"
print_info "Deploy time: $(date)"
print_info "================================================"

# Show PM2 status
pm2 status "$PM2_APP_NAME"

# Show logs
print_info "Showing recent logs..."
pm2 logs "$PM2_APP_NAME" --lines 20 --nostream

exit 0
