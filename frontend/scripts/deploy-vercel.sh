#!/bin/bash

###############################################################################
# Deploy to Vercel Script
# 
# Deploys the Spirit Tours frontend to Vercel platform
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Spirit Tours - Vercel Deployment${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found${NC}"
    echo -e "${YELLOW}Installing Vercel CLI...${NC}"
    npm install -g vercel
fi

echo -e "${GREEN}✓ Vercel CLI found${NC}"
echo ""

# Check if already logged in
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Vercel${NC}"
    echo -e "${BLUE}Please log in:${NC}"
    vercel login
fi

echo -e "${GREEN}✓ Authenticated with Vercel${NC}"
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
    DEPLOY_FLAG=""
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

# Deploy to Vercel
echo -e "${BLUE}🚀 Deploying to Vercel...${NC}"
vercel $DEPLOY_FLAG --yes

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo ""
    
    # Get deployment URL
    DEPLOY_URL=$(vercel ls --meta env=$DEPLOY_ENV | grep https | head -1 | awk '{print $1}')
    
    if [ ! -z "$DEPLOY_URL" ]; then
        echo -e "${BLUE}Deployment URL:${NC} $DEPLOY_URL"
    fi
    
    echo ""
    echo -e "${BLUE}View logs:${NC} vercel logs"
    echo -e "${BLUE}View domains:${NC} vercel domains ls"
else
    echo ""
    echo -e "${RED}======================================${NC}"
    echo -e "${RED}❌ Deployment failed${NC}"
    echo -e "${RED}======================================${NC}"
    exit 1
fi
