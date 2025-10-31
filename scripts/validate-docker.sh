#!/bin/bash

###############################################################################
# Spirit Tours - Docker Validation Script
# Validates Docker setup and configuration before deployment
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "==============================================="
echo "Spirit Tours - Docker Validation"
echo "==============================================="
echo ""

# Track validation status
VALIDATION_FAILED=0

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    VALIDATION_FAILED=1
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

###############################################################################
# 1. Check Docker Installation
###############################################################################
echo "1. Checking Docker installation..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    echo "   Install from: https://docs.docker.com/get-docker/"
else
    DOCKER_VERSION=$(docker --version)
    print_success "Docker installed: $DOCKER_VERSION"
fi

###############################################################################
# 2. Check Docker Compose
###############################################################################
echo ""
echo "2. Checking Docker Compose..."

if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version)
    print_success "Docker Compose installed: $COMPOSE_VERSION"
elif docker-compose --version &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    print_success "Docker Compose (standalone) installed: $COMPOSE_VERSION"
    print_warning "Consider upgrading to Docker Compose V2 (built into Docker)"
else
    print_error "Docker Compose is not installed"
fi

###############################################################################
# 3. Check Docker Service Status
###############################################################################
echo ""
echo "3. Checking Docker service status..."

if docker info &> /dev/null; then
    print_success "Docker daemon is running"
else
    print_error "Docker daemon is not running"
    echo "   Start with: sudo systemctl start docker"
fi

###############################################################################
# 4. Validate docker-compose.yml
###############################################################################
echo ""
echo "4. Validating docker-compose.yml syntax..."

if [ -f "docker-compose.yml" ]; then
    if docker compose config > /dev/null 2>&1 || docker-compose config > /dev/null 2>&1; then
        print_success "docker-compose.yml is valid"
    else
        print_error "docker-compose.yml has syntax errors"
        echo "   Run 'docker compose config' for details"
    fi
else
    print_error "docker-compose.yml not found"
fi

###############################################################################
# 5. Check Required Files
###############################################################################
echo ""
echo "5. Checking required files..."

REQUIRED_FILES=(
    "Dockerfile"
    ".dockerignore"
    "package.json"
    "backend/server.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "Found: $file"
    else
        print_error "Missing: $file"
    fi
done

###############################################################################
# 6. Check Environment Variables
###############################################################################
echo ""
echo "6. Checking environment configuration..."

if [ -f ".env" ]; then
    print_success ".env file exists"
    
    # Check critical environment variables
    CRITICAL_VARS=(
        "POSTGRES_PASSWORD"
        "JWT_SECRET"
        "NODE_ENV"
    )
    
    for var in "${CRITICAL_VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            print_success "Environment variable defined: $var"
        else
            print_warning "Environment variable not defined: $var"
        fi
    done
else
    print_warning ".env file not found (will use defaults or .env.example)"
fi

###############################################################################
# 7. Test Docker Build
###############################################################################
echo ""
echo "7. Testing Docker build..."

if docker build --no-cache -t spirit-tours-test:latest . > /tmp/docker-build.log 2>&1; then
    print_success "Docker build successful"
    
    # Check image size
    IMAGE_SIZE=$(docker images spirit-tours-test:latest --format "{{.Size}}")
    echo "   Image size: $IMAGE_SIZE"
    
    # Cleanup test image
    docker rmi spirit-tours-test:latest > /dev/null 2>&1 || true
else
    print_error "Docker build failed"
    echo "   Check logs: /tmp/docker-build.log"
    tail -20 /tmp/docker-build.log
fi

###############################################################################
# 8. Check Docker Networks
###############################################################################
echo ""
echo "8. Checking Docker networks..."

if docker network ls | grep -q "spirit-tours"; then
    print_success "Spirit Tours network exists"
else
    print_warning "Spirit Tours network not created yet (will be created on first run)"
fi

###############################################################################
# 9. Check Docker Volumes
###############################################################################
echo ""
echo "10. Checking Docker volumes..."

EXPECTED_VOLUMES=(
    "postgres_data"
    "redis_data"
    "mongodb_data"
)

for volume in "${EXPECTED_VOLUMES[@]}"; do
    if docker volume ls | grep -q "$volume"; then
        print_success "Volume exists: $volume"
    else
        print_warning "Volume not created yet: $volume (will be created on first run)"
    fi
done

###############################################################################
# 10. Check Docker Compose Services
###############################################################################
echo ""
echo "10. Checking Docker Compose service configuration..."

if [ -f "docker-compose.yml" ]; then
    REQUIRED_SERVICES=("postgres" "redis" "api" "nginx")
    
    for service in "${REQUIRED_SERVICES[@]}"; do
        if grep -q "^  ${service}:" docker-compose.yml; then
            print_success "Service configured: $service"
        else
            print_warning "Service not configured: $service"
        fi
    done
fi

###############################################################################
# 11. Check System Resources
###############################################################################
echo ""
echo "11. Checking system resources..."

# Check available disk space
AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
echo "   Available disk space: $AVAILABLE_SPACE"

# Check Docker disk usage
if docker info &> /dev/null; then
    DOCKER_ROOT=$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo "/var/lib/docker")
    DOCKER_SPACE=$(df -h "$DOCKER_ROOT" | awk 'NR==2 {print $4}')
    echo "   Docker root space: $DOCKER_SPACE"
fi

###############################################################################
# 12. Check Docker Daemon Configuration
###############################################################################
echo ""
echo "12. Checking Docker daemon configuration..."

if [ -f "/etc/docker/daemon.json" ]; then
    print_success "Docker daemon configuration exists"
    
    if grep -q "log-driver" /etc/docker/daemon.json 2>/dev/null; then
        LOG_DRIVER=$(grep "log-driver" /etc/docker/daemon.json | cut -d'"' -f4)
        echo "   Log driver: $LOG_DRIVER"
    fi
else
    print_warning "No custom Docker daemon configuration"
fi

###############################################################################
# Summary
###############################################################################
echo ""
echo "==============================================="
echo "Validation Summary"
echo "==============================================="

if [ $VALIDATION_FAILED -eq 0 ]; then
    print_success "All validations passed! ✨"
    echo ""
    echo "Next steps:"
    echo "  1. Review .env configuration"
    echo "  2. Run: docker compose up -d"
    echo "  3. Check logs: docker compose logs -f"
    echo "  4. Run tests: npm test"
    exit 0
else
    print_error "Some validations failed"
    echo ""
    echo "Please fix the errors above before deployment"
    exit 1
fi
