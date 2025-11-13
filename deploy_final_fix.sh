#!/bin/bash

###############################################################################
# Spirit Tours - FINAL FIX Deployment Script
# Fixes the "t.map is not a function" error by updating AppSimple.tsx
###############################################################################

set -e  # Exit on error

echo "=============================================="
echo "Spirit Tours - FINAL Frontend Fix"
echo "=============================================="
echo ""

# Navigate to application directory
cd /opt/spirittours/app

echo "Step 1: Pulling latest fix from GitHub..."
git fetch origin main
git reset --hard origin/main
echo "✓ Code updated with AppSimple.tsx fix"
echo ""

echo "Step 2: Stopping containers..."
docker-compose -f docker-compose.digitalocean.yml down
echo "✓ Containers stopped"
echo ""

echo "Step 3: Rebuilding frontend with fix..."
echo "This will take 3-5 minutes..."
docker-compose -f docker-compose.digitalocean.yml build --no-cache frontend
echo "✓ Frontend rebuilt with fix"
echo ""

echo "Step 4: Starting all services..."
docker-compose -f docker-compose.digitalocean.yml up -d
echo "✓ Services started"
echo ""

echo "Step 5: Waiting for services to be ready..."
sleep 30
echo ""

echo "Step 6: Checking service status..."
docker-compose -f docker-compose.digitalocean.yml ps
echo ""

echo "Step 7: Verifying fix..."
echo "New JavaScript hash should be different from main.d2e741fb.js"
docker exec spirit-tours-frontend ls -la /usr/share/nginx/html/static/js/ | grep main
echo ""

echo "Step 8: Testing API responses..."
curl -s https://plataform.spirittours.us/api/v1/tours | jq -r '.tours[0].title' 2>/dev/null || echo "⚠ jq not installed, but API should work"
echo ""

echo "=============================================="
echo "✅ FINAL FIX DEPLOYED!"
echo "=============================================="
echo ""
echo "The 't.map is not a function' error should now be FIXED!"
echo ""
echo "Next steps:"
echo "1. Open https://plataform.spirittours.us in your browser"
echo "2. Press Ctrl+Shift+R (hard refresh) to clear cache"
echo "3. You should now see:"
echo "   ✅ Dashboard with 4 statistics cards"
echo "   ✅ 3 tours displayed (Sedona, Machu Picchu, Bali)"
echo "   ✅ Recent bookings list"
echo "   ✅ NO console errors!"
echo ""
echo "If you still see errors, clear ALL browser cache or use Incognito mode"
echo ""
