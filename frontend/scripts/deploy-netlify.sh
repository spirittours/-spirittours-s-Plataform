#!/bin/bash

###############################################################################
# Deploy to Netlify Script
# 
# Deploys the Spirit Tours frontend to Netlify platform
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Spirit Tours - Netlify Deployment${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo -e "${RED}❌ Netlify CLI not found${NC}"
    echo -e "${YELLOW}Installing Netlify CLI...${NC}"
    npm install -g netlify-cli
fi

echo -e "${GREEN}✓ Netlify CLI found${NC}"
echo ""

# Check if already logged in
if ! netlify status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Netlify${NC}"
    echo -e "${BLUE}Please log in:${NC}"
    netlify login
fi

echo -e "${GREEN}✓ Authenticated with Netlify${NC}"
echo ""

# Get deployment environment
read -p "Deploy to (production/preview): " DEPLOY_ENV
DEPLOY_ENV=${DEPLOY_ENV:-preview}

if [ "$DEPLOY_ENV" = "production" ]; then
    echo -e "${YELLOW}⚠️  Deploying to PRODUCTION${NC}"
    echo -e "${YELLOW}This will make changes live!${NC}"
    read -p "Are you sure? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
    
    DEPLOY_FLAG="--prod"
else
    DEPLOY_FLAG="--alias preview-$(date +%s)"
fi

# Run pre-deployment checks
echo -e "${BLUE}🔍 Running pre-deployment checks...${NC}"

# Check if build passes
echo -e "${BLUE}Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Initialize Netlify if needed
if [ ! -f "netlify.toml" ]; then
    echo -e "${YELLOW}⚠️  netlify.toml not found${NC}"
    echo -e "${BLUE}Initializing Netlify site...${NC}"
    netlify init
fi

# Deploy to Netlify
echo -e "${BLUE}🚀 Deploying to Netlify...${NC}"
netlify deploy --dir=build $DEPLOY_FLAG

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
    
    # Show site info
    netlify status
    
    echo ""
    echo -e "${BLUE}View site:${NC} netlify open:site"
    echo -e "${BLUE}View admin:${NC} netlify open:admin"
    echo -e "${BLUE}View logs:${NC} netlify logs"
else
    echo ""
    echo -e "${RED}======================================${NC}"
    echo -e "${RED}❌ Deployment failed${NC}"
    echo -e "${RED}======================================${NC}"
    exit 1
fi
