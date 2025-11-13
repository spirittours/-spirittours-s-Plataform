#!/bin/bash

###############################################################################
# Spirit Tours - Production Deployment Fix Script
# This script fixes the REACT_APP_API_URL double /api/v1 issue and port conflict
###############################################################################

set -e  # Exit on error

echo "=============================================="
echo "Spirit Tours - Production Deployment Fix"
echo "=============================================="
echo ""

# Navigate to application directory
cd /opt/spirittours/app

echo "Step 1: Pulling latest changes from GitHub..."
git fetch origin main
git reset --hard origin/main
echo "✓ Code updated to latest commit"
echo ""

echo "Step 2: Verifying critical files..."
echo "Checking .env file for correct REACT_APP_API_URL..."
if grep -q "REACT_APP_API_URL=https://plataform.spirittours.us$" .env; then
    echo "✓ REACT_APP_API_URL is correct (without /api/v1 suffix)"
else
    echo "⚠ WARNING: REACT_APP_API_URL may not be correct"
    echo "Current value:"
    grep "REACT_APP_API_URL" .env
fi

echo ""
echo "Checking docker-compose.digitalocean.yml for correct port mapping..."
if grep -q "8080:80" docker-compose.digitalocean.yml; then
    echo "✓ Frontend port mapping is correct (8080:80)"
else
    echo "⚠ WARNING: Frontend port mapping may not be correct"
    echo "Current value:"
    grep -A2 "ports:" docker-compose.digitalocean.yml | grep -A1 "frontend" || echo "Not found in expected location"
fi
echo ""

echo "Step 3: Stopping existing containers..."
docker-compose -f docker-compose.digitalocean.yml down
echo "✓ Containers stopped"
echo ""

echo "Step 4: Rebuilding frontend with new environment variables..."
echo "This will take 3-5 minutes..."
docker-compose -f docker-compose.digitalocean.yml build --no-cache frontend
echo "✓ Frontend rebuilt"
echo ""

echo "Step 5: Starting all services..."
docker-compose -f docker-compose.digitalocean.yml up -d
echo "✓ Services started"
echo ""

echo "Step 6: Waiting for services to be healthy..."
sleep 30
echo ""

echo "Step 7: Checking service status..."
docker-compose -f docker-compose.digitalocean.yml ps
echo ""

echo "Step 8: Verifying backend health..."
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✓ Backend is healthy"
else
    echo "⚠ WARNING: Backend health check failed"
fi
echo ""

echo "Step 9: Checking frontend container..."
if docker ps | grep -q spirit-tours-frontend; then
    echo "✓ Frontend container is running"
    
    # Check if the new build has correct hash
    echo ""
    echo "Built JavaScript files:"
    docker exec spirit-tours-frontend ls -la /usr/share/nginx/html/static/js/ | grep main || echo "Main JS file not found"
else
    echo "⚠ WARNING: Frontend container is not running"
    echo ""
    echo "Checking for port conflicts..."
    docker logs spirit-tours-frontend 2>&1 | tail -20
fi
echo ""

echo "Step 10: Testing API endpoints..."
echo ""
echo "Testing /api/v1/tours endpoint..."
curl -s https://plataform.spirittours.us/api/v1/tours | jq -r '.tours[0].title' 2>/dev/null || echo "⚠ Could not fetch tours"
echo ""

echo "=============================================="
echo "Deployment Complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Open https://plataform.spirittours.us in your browser"
echo "2. Open browser console (F12)"
echo "3. Verify there are NO errors like '/api/v1/api/v1/tours 404'"
echo "4. Check that tours, stats, and bookings load correctly"
echo ""
echo "If you see errors, check:"
echo "  docker logs spirit-tours-frontend"
echo "  docker logs spirit-tours-backend"
echo ""
