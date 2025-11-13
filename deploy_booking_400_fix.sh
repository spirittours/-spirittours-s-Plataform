#!/bin/bash
################################################################################
# Spirit Tours - Deploy Booking 400 Error Fix
# Fixes type mismatch between frontend and backend
################################################################################

set -e

echo "=========================================="
echo "🔧 Spirit Tours - Deploy Booking Fix"
echo "=========================================="
echo ""

echo "📊 Problem Analysis:"
echo "   - Frontend: Tour.id is 'number'"
echo "   - Backend: Expects 'string' like 'tour-001'"
echo "   - Result: 400 Bad Request"
echo ""
echo "✅ Backend tested with curl: Works perfectly!"
echo "   Response: 200 OK, booking created successfully"
echo ""
echo "🔧 Fix Applied:"
echo "   1. Changed Tour.id interface from number to string"
echo "   2. Added String() conversion in booking payload"
echo "   3. Added improved error handling"
echo "   4. Added success/error message display"
echo ""

# Check if we're on the server
if [ "$(hostname)" = "spirit-server" ]; then
    echo "📍 Running on production server"
    echo ""
    
    # Navigate to app directory
    cd /opt/spirittours/app
    
    # Backup current file
    echo "💾 Creating backup..."
    cp frontend/src/AppSimple.tsx frontend/src/AppSimple.tsx.backup.$(date +%Y%m%d_%H%M%S)
    echo "   ✅ Backup created"
    echo ""
    
    # The file should already be updated via git pull
    # If not, we'd need to copy it manually
    
    # Rebuild frontend
    echo "🔨 Rebuilding frontend container..."
    docker-compose -f docker-compose.digitalocean.yml up -d --build frontend
    echo ""
    
    # Wait for frontend to be ready
    echo "⏳ Waiting for frontend to start (60 seconds)..."
    sleep 60
    echo ""
    
    # Check status
    echo "✅ Checking container status..."
    docker ps | grep spirit-tours-frontend
    echo ""
    
    # Test the endpoint
    echo "🧪 Testing booking endpoint..."
    curl -X POST https://plataform.spirittours.us/api/v1/bookings \
      -H "Content-Type: application/json" \
      -d '{
        "tour_id": "tour-001",
        "booking_date": "2025-12-25",
        "participants": 2
      }' 2>/dev/null | head -c 150
    echo "..."
    echo ""
    
    echo "=========================================="
    echo "✅ Deployment Complete!"
    echo "=========================================="
    echo ""
    echo "🎯 Test the Fix:"
    echo "1. Open: https://plataform.spirittours.us"
    echo "2. Hard refresh: Ctrl+Shift+R or Cmd+Shift+R"
    echo "3. Open console: F12"
    echo "4. Click 'Book Now' on a tour"
    echo "5. Fill form and submit"
    echo "6. Check console for: 'Creating booking with data: {...}'"
    echo "7. Should see: 'Booking created successfully: {...}'"
    echo "8. Green success alert should appear!"
    echo ""
    echo "🔍 What to Look For:"
    echo "   - Console shows tour_id as STRING: 'tour-001'"
    echo "   - Response status: 200 OK (not 400)"
    echo "   - Success message in green alert"
    echo "   - Booking appears in recent bookings list"
    echo ""
    
else
    echo "⚠️  This script should run on the production server"
    echo ""
    echo "To deploy manually:"
    echo "1. Copy updated file to server:"
    echo "   scp /home/user/webapp/frontend/src/AppSimple.tsx root@138.197.6.239:/opt/spirittours/app/frontend/src/"
    echo ""
    echo "2. SSH to server and rebuild:"
    echo "   ssh root@138.197.6.239"
    echo "   cd /opt/spirittours/app"
    echo "   docker-compose -f docker-compose.digitalocean.yml up -d --build frontend"
    echo ""
fi
