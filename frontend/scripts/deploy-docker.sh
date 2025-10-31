#!/bin/bash

###############################################################################
# Deploy with Docker Script
# 
# Builds and deploys Spirit Tours frontend using Docker
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Spirit Tours - Docker Deployment${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Configuration
IMAGE_NAME="spirit-tours-frontend"
CONTAINER_NAME="spirit-tours-frontend"
VERSION=$(date +%Y%m%d-%H%M%S)
REGISTRY=${DOCKER_REGISTRY:-""}

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Get deployment environment
read -p "Deploy environment (production/staging): " DEPLOY_ENV
DEPLOY_ENV=${DEPLOY_ENV:-production}

# Load environment variables
if [ -f ".env.$DEPLOY_ENV" ]; then
    echo -e "${BLUE}Loading environment from .env.$DEPLOY_ENV${NC}"
    source .env.$DEPLOY_ENV
else
    echo -e "${YELLOW}⚠️  No .env.$DEPLOY_ENV file found${NC}"
fi

# Build arguments
API_URL=${VITE_API_URL:-"http://localhost:8000/api"}
WS_URL=${VITE_WS_URL:-"ws://localhost:8000/ws"}

echo -e "${BLUE}Build configuration:${NC}"
echo -e "  API URL: ${API_URL}"
echo -e "  WS URL: ${WS_URL}"
echo -e "  Environment: ${DEPLOY_ENV}"
echo ""

# Confirm production deployment
if [ "$DEPLOY_ENV" = "production" ]; then
    echo -e "${YELLOW}⚠️  Deploying to PRODUCTION${NC}"
    read -p "Are you sure? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi

# Stop and remove existing container
echo -e "${BLUE}🔄 Stopping existing container...${NC}"
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true
echo -e "${GREEN}✓ Cleaned up old container${NC}"
echo ""

# Build Docker image
echo -e "${BLUE}🏗️  Building Docker image...${NC}"
docker build \
    --build-arg VITE_API_URL=$API_URL \
    --build-arg VITE_WS_URL=$WS_URL \
    --build-arg VITE_ENVIRONMENT=$DEPLOY_ENV \
    -t $IMAGE_NAME:latest \
    -t $IMAGE_NAME:$VERSION \
    -f Dockerfile \
    .

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Image built successfully${NC}"
echo ""

# Tag for registry if configured
if [ ! -z "$REGISTRY" ]; then
    echo -e "${BLUE}📦 Tagging for registry...${NC}"
    docker tag $IMAGE_NAME:latest $REGISTRY/$IMAGE_NAME:latest
    docker tag $IMAGE_NAME:$VERSION $REGISTRY/$IMAGE_NAME:$VERSION
    
    echo -e "${BLUE}📤 Pushing to registry...${NC}"
    docker push $REGISTRY/$IMAGE_NAME:latest
    docker push $REGISTRY/$IMAGE_NAME:$VERSION
    
    echo -e "${GREEN}✓ Pushed to registry${NC}"
    echo ""
fi

# Run container
echo -e "${BLUE}🚀 Starting container...${NC}"
docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -p 80:80 \
    -p 443:443 \
    $IMAGE_NAME:latest

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start container${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Container started${NC}"
echo ""

# Wait for container to be healthy
echo -e "${BLUE}⏳ Waiting for health check...${NC}"
sleep 5

# Check container status
if docker ps | grep -q $CONTAINER_NAME; then
    echo -e "${GREEN}✓ Container is running${NC}"
    
    # Show container info
    echo ""
    echo -e "${BLUE}Container information:${NC}"
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    # Test health endpoint
    echo ""
    echo -e "${BLUE}Testing health endpoint...${NC}"
    sleep 3
    if curl -f http://localhost:80/health &> /dev/null; then
        echo -e "${GREEN}✓ Health check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Health check failed${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
    echo -e "${BLUE}Access the application:${NC}"
    echo -e "  http://localhost"
    echo ""
    echo -e "${BLUE}View logs:${NC}"
    echo -e "  docker logs -f $CONTAINER_NAME"
    echo ""
    echo -e "${BLUE}Stop container:${NC}"
    echo -e "  docker stop $CONTAINER_NAME"
else
    echo -e "${RED}❌ Container failed to start${NC}"
    echo ""
    echo -e "${BLUE}View logs:${NC}"
    docker logs $CONTAINER_NAME
    exit 1
fi
