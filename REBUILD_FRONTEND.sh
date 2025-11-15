#!/bin/bash
# Spirit Tours Frontend - No-Cache Rebuild Script
# This script rebuilds the frontend Docker container without cache
# to ensure .env.production and AppSimple.tsx fixes are included

set -e  # Exit on any error

echo "========================================"
echo "Spirit Tours Frontend Rebuild (No-Cache)"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on production server
if [ ! -d "/opt/spirittours/app" ]; then
    echo -e "${RED}ERROR: This script must be run on the production server${NC}"
    echo "Expected directory: /opt/spirittours/app"
    exit 1
fi

cd /opt/spirittours/app

echo -e "${YELLOW}Step 1: Pulling latest code from repository...${NC}"
git pull origin main
echo ""

echo -e "${YELLOW}Step 2: Stopping current frontend container...${NC}"
if docker ps -q -f name=spirit-tours-frontend >/dev/null 2>&1; then
    docker stop spirit-tours-frontend
    echo "✓ Container stopped"
else
    echo "✓ Container not running"
fi
echo ""

echo -e "${YELLOW}Step 3: Removing current frontend container...${NC}"
if docker ps -aq -f name=spirit-tours-frontend >/dev/null 2>&1; then
    docker rm spirit-tours-frontend
    echo "✓ Container removed"
else
    echo "✓ Container does not exist"
fi
echo ""

echo -e "${YELLOW}Step 4: Verifying .env.production exists...${NC}"
if [ -f "frontend/.env.production" ]; then
    echo "✓ Found .env.production"
    cat frontend/.env.production
else
    echo -e "${RED}ERROR: frontend/.env.production not found!${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 5: Rebuilding Docker image (NO CACHE - this will take 5-10 minutes)...${NC}"
echo "This step will:"
echo "  - Install all npm dependencies from scratch"
echo "  - Read .env.production during build"
echo "  - Compile React app with production URLs"
echo "  - Create new static build bundle"
echo ""
docker build --no-cache -t app-frontend frontend/
echo ""

echo -e "${YELLOW}Step 6: Starting new frontend container...${NC}"
docker run -d \
  --name spirit-tours-frontend \
  --restart unless-stopped \
  -p 8080:80 \
  app-frontend

echo "✓ Container started"
echo ""

echo -e "${YELLOW}Step 7: Waiting for container to be ready...${NC}"
sleep 15
echo ""

echo -e "${YELLOW}Step 8: Verifying container status...${NC}"
if docker ps | grep -q spirit-tours-frontend; then
    echo -e "${GREEN}✓ Container is running${NC}"
else
    echo -e "${RED}ERROR: Container failed to start${NC}"
    echo "Checking logs:"
    docker logs spirit-tours-frontend
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 9: Testing HTTP response...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓ HTTP 200 OK${NC}"
else
    echo -e "${RED}ERROR: HTTP $HTTP_STATUS${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}========================================"
echo "✓ Frontend rebuild completed successfully!"
echo "========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Clear browser cache:"
echo "   - Open DevTools (F12)"
echo "   - Go to Application tab"
echo "   - Click 'Clear site data'"
echo ""
echo "2. Hard refresh the page:"
echo "   - Windows/Linux: Ctrl+Shift+R"
echo "   - Mac: Cmd+Shift+R"
echo ""
echo "3. Test booking creation:"
echo "   - Open Network tab in DevTools"
echo "   - Try to create a booking"
echo "   - Verify POST URL is: https://plataform.spirittours.us/api/v1/bookings"
echo "   - Verify request payload has 'customer' object and 'product_id'"
echo ""
echo "4. Check backend logs:"
echo "   - docker logs spirittours-backend"
echo "   - Should show 200 OK response (not 422 error)"
echo ""
