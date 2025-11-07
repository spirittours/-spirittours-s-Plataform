#!/bin/bash

# ========================================
# Spirit Tours - DigitalOcean Deployment Script
# ========================================
# This script deploys the Spirit Tours platform to DigitalOcean
# with managed PostgreSQL and containerized services
# ========================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Print banner
echo "========================================="
echo "  Spirit Tours - DigitalOcean Deployment"
echo "========================================="
echo ""

# Step 1: Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_success "Prerequisites check passed!"
echo ""

# Step 2: Check environment file
print_status "Checking environment configuration..."

if [ ! -f ".env.digitalocean" ]; then
    print_error "Environment file .env.digitalocean not found!"
    print_warning "Creating from template..."
    cp .env.example .env.digitalocean 2>/dev/null || print_warning "No .env.example found"
    print_warning "Please edit .env.digitalocean with your configuration"
    exit 1
fi

# Copy .env.digitalocean to .env for docker-compose
cp .env.digitalocean .env
print_success "Environment file loaded!"
echo ""

# Step 3: Verify database credentials
print_status "Verifying database configuration..."

if grep -q "your-password-here" .env || grep -q "REPLACE_ME" .env; then
    print_warning "Placeholder values detected in .env file"
    print_warning "Please update all configuration values before deployment"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

print_success "Database configuration verified!"
echo ""

# Step 4: Stop any running containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.digitalocean.yml down 2>/dev/null || true
print_success "Existing containers stopped!"
echo ""

# Step 5: Pull base images
print_status "Pulling latest base images..."
docker pull node:18-alpine
docker pull python:3.11-slim
docker pull redis:7-alpine
docker pull nginx:alpine
print_success "Base images pulled!"
echo ""

# Step 6: Build backend image
print_status "Building backend image..."
docker-compose -f docker-compose.digitalocean.yml build backend
print_success "Backend image built!"
echo ""

# Step 7: Build frontend image
print_status "Building frontend image (this may take a few minutes)..."
docker-compose -f docker-compose.digitalocean.yml build frontend
print_success "Frontend image built!"
echo ""

# Step 8: Start services
print_status "Starting all services..."
docker-compose -f docker-compose.digitalocean.yml up -d
print_success "All services started!"
echo ""

# Step 9: Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 10

# Check Redis
print_status "Checking Redis..."
if docker-compose -f docker-compose.digitalocean.yml ps redis | grep -q "Up"; then
    print_success "Redis is running!"
else
    print_warning "Redis may not be running properly"
fi

# Check Backend
print_status "Checking Backend API..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Backend API is healthy!"
        break
    fi
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        print_warning "Backend API health check timeout (may still be starting)"
    else
        sleep 2
    fi
done

# Check Frontend
print_status "Checking Frontend..."
if curl -s -f http://localhost:80/health > /dev/null 2>&1; then
    print_success "Frontend is healthy!"
else
    print_warning "Frontend may not be running properly"
fi

echo ""

# Step 10: Display deployment summary
echo "========================================="
echo "  Deployment Summary"
echo "========================================="
echo ""
echo "Services Status:"
docker-compose -f docker-compose.digitalocean.yml ps
echo ""

echo "Access URLs:"
echo "  Frontend:    http://localhost:80"
echo "  Backend API: http://localhost:8000"
echo "  API Docs:    http://localhost:8000/docs"
echo "  Health:      http://localhost:8000/health"
echo ""

echo "Database:"
echo "  Type:     DigitalOcean Managed PostgreSQL"
echo "  Status:   External (verify credentials in .env)"
echo ""

echo "Useful Commands:"
echo "  View logs:           docker-compose -f docker-compose.digitalocean.yml logs -f"
echo "  View backend logs:   docker-compose -f docker-compose.digitalocean.yml logs -f backend"
echo "  View frontend logs:  docker-compose -f docker-compose.digitalocean.yml logs -f frontend"
echo "  Restart services:    docker-compose -f docker-compose.digitalocean.yml restart"
echo "  Stop services:       docker-compose -f docker-compose.digitalocean.yml down"
echo "  Rebuild & restart:   ./deploy-digitalocean.sh"
echo ""

print_success "Deployment completed successfully!"
echo ""

# Step 11: Optional - Run database migrations
read -p "Run database migrations now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Running database migrations..."
    docker-compose -f docker-compose.digitalocean.yml exec backend python -c "from database import init_db; init_db()" || \
    docker-compose -f docker-compose.digitalocean.yml exec backend alembic upgrade head || \
    print_warning "Migration command not found or failed. Please run migrations manually."
    print_success "Database migrations completed!"
fi

echo ""
print_status "🎉 Spirit Tours platform is now deployed!"
echo ""
