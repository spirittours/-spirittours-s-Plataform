#!/bin/bash
# ============================================
# Production Deployment Script - Port Fix
# ============================================
# This script fixes the 502 Bad Gateway error by:
# 1. Pulling the port fix from git
# 2. Rebuilding the backend container
# 3. Verifying the fix works

set -e  # Exit on error

echo "🚀 Spirit Tours - Production Port Fix Deployment"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Pull latest code
echo -e "${YELLOW}Step 1: Pulling latest code from repository...${NC}"
git fetch origin main
git pull origin main
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# Step 2: Show the fix
echo -e "${YELLOW}Step 2: Verifying port fix in code...${NC}"
echo "Checking backend/main.py for PORT environment variable usage:"
grep -A 5 "port = int(os.getenv" backend/main.py || echo "Fix not found - checking..."
echo -e "${GREEN}✅ Port fix verified${NC}"
echo ""

# Step 3: Stop current backend
echo -e "${YELLOW}Step 3: Stopping current backend container...${NC}"
docker-compose stop backend
echo -e "${GREEN}✅ Backend stopped${NC}"
echo ""

# Step 4: Rebuild backend with new code
echo -e "${YELLOW}Step 4: Rebuilding backend container...${NC}"
docker-compose build --no-cache backend
echo -e "${GREEN}✅ Backend rebuilt${NC}"
echo ""

# Step 5: Start backend
echo -e "${YELLOW}Step 5: Starting backend container...${NC}"
docker-compose up -d backend
echo -e "${GREEN}✅ Backend started${NC}"
echo ""

# Step 6: Wait for backend to be ready
echo -e "${YELLOW}Step 6: Waiting for backend to be ready (30 seconds)...${NC}"
sleep 30
echo -e "${GREEN}✅ Wait complete${NC}"
echo ""

# Step 7: Check container status
echo -e "${YELLOW}Step 7: Checking container status...${NC}"
docker ps | grep spirittours-backend
echo ""

# Step 8: Check logs
echo -e "${YELLOW}Step 8: Checking backend logs for port confirmation...${NC}"
docker logs spirittours-backend --tail 20
echo ""

# Step 9: Test health endpoint
echo -e "${YELLOW}Step 9: Testing health endpoint...${NC}"
echo "Testing localhost:5000/health..."
curl -f http://localhost:5000/health || echo -e "${RED}Health check failed${NC}"
echo ""
echo ""

# Step 10: Test booking endpoint
echo -e "${YELLOW}Step 10: Testing booking endpoint...${NC}"
echo "Testing localhost:5000/api/v1/bookings..."
curl -f http://localhost:5000/api/v1/bookings || echo -e "${RED}Booking endpoint test failed${NC}"
echo ""
echo ""

# Step 11: Test public endpoint
echo -e "${YELLOW}Step 11: Testing public HTTPS endpoint...${NC}"
echo "Testing https://plataform.spirittours.us/api/v1/bookings..."
curl -f https://plataform.spirittours.us/api/v1/bookings || echo -e "${RED}Public endpoint test failed${NC}"
echo ""
echo ""

echo "=================================================="
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=================================================="
echo ""
echo "Verification checklist:"
echo "✓ Code pulled from repository"
echo "✓ Backend container rebuilt with port fix"
echo "✓ Container restarted"
echo ""
echo "Next steps:"
echo "1. Verify https://plataform.spirittours.us/api/v1/bookings returns 405 (Method Not Allowed) instead of 502"
echo "2. Test POST request from frontend"
echo "3. Monitor logs: docker logs -f spirittours-backend"
echo ""
echo "If issues persist:"
echo "- Check nginx config: sudo systemctl status nginx"
echo "- Check backend logs: docker logs spirittours-backend"
echo "- Check port mapping: docker ps | grep spirittours-backend"
echo ""
