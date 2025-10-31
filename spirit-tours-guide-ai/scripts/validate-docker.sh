#!/bin/bash

# Spirit Tours AI Guide - Docker Validation Script
# Validates Docker setup and configuration

set -e

echo "🐳 Spirit Tours Docker Validation"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
echo "📋 Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✅ Docker is installed${NC}"
docker --version

# Check if Docker Compose is installed
echo ""
echo "📋 Checking Docker Compose installation..."
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose is installed${NC}"
docker-compose --version

# Check if Docker daemon is running
echo ""
echo "📋 Checking Docker daemon..."
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    echo "Please start Docker daemon"
    exit 1
fi
echo -e "${GREEN}✅ Docker daemon is running${NC}"

# Validate Dockerfile
echo ""
echo "📋 Validating Dockerfile..."
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}❌ Dockerfile not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dockerfile found${NC}"

# Validate docker-compose.yml
echo ""
echo "📋 Validating docker-compose.yml..."
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ docker-compose.yml not found${NC}"
    exit 1
fi

if docker-compose config > /dev/null 2>&1; then
    echo -e "${GREEN}✅ docker-compose.yml is valid${NC}"
else
    echo -e "${RED}❌ docker-compose.yml has errors${NC}"
    docker-compose config
    exit 1
fi

# Check .env file
echo ""
echo "📋 Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Creating .env from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        echo -e "${YELLOW}⚠️  Please configure .env with your actual values${NC}"
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Test Docker build (dry run)
echo ""
echo "📋 Testing Docker build (dry run)..."
echo "This may take a few minutes..."

if docker build --no-cache -t spirit-tours-test:latest . > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker build successful${NC}"
    
    # Get image size
    IMAGE_SIZE=$(docker images spirit-tours-test:latest --format "{{.Size}}")
    echo "   Image size: $IMAGE_SIZE"
    
    # Clean up test image
    docker rmi spirit-tours-test:latest > /dev/null 2>&1
else
    echo -e "${RED}❌ Docker build failed${NC}"
    echo "Running build again with output..."
    docker build --no-cache -t spirit-tours-test:latest .
    exit 1
fi

# Validate docker-compose services
echo ""
echo "📋 Validating docker-compose services..."
SERVICES=$(docker-compose config --services)
echo "Services defined:"
for service in $SERVICES; do
    echo "   - $service"
done

# Check required services
REQUIRED_SERVICES=("postgres" "redis" "api" "nginx")
for service in "${REQUIRED_SERVICES[@]}"; do
    if echo "$SERVICES" | grep -q "^$service$"; then
        echo -e "${GREEN}✅ Required service '$service' found${NC}"
    else
        echo -e "${RED}❌ Required service '$service' not found${NC}"
        exit 1
    fi
done

# Summary
echo ""
echo "=================================="
echo -e "${GREEN}🎉 Docker validation completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure .env with your actual values"
echo "2. Run: docker-compose up -d"
echo "3. Check logs: docker-compose logs -f"
echo "4. Access API: http://localhost:3001/health"
echo ""
