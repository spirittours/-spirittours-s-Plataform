#!/bin/bash
################################################################################
# Spirit Tours - Deploy Error Handling Fix
# Improves booking error messages for better user experience
################################################################################

set -e

echo "=========================================="
echo "🔧 Spirit Tours - Deploy Error Handling Fix"
echo "=========================================="
echo ""

echo "📍 Current host: $(hostname)"
echo ""

# Navigate to app directory
echo "📂 Navigating to app directory..."
cd /opt/spirittours/app
pwd
echo ""

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin main
echo ""

# Rebuild frontend container (backend unchanged)
echo "🔨 Rebuilding frontend container with improved error handling..."
docker-compose -f docker-compose.digitalocean.yml up -d --build frontend
echo ""

# Wait for frontend to be healthy
echo "⏳ Waiting for frontend to start (60 seconds)..."
sleep 60
echo ""

# Check container status
echo "✅ Checking container status..."
docker ps | grep spirit-tours-frontend
echo ""

echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "🎯 What Changed:"
echo "   ✓ Added error message display for failed bookings"
echo "   ✓ Shows backend error messages to users"
echo "   ✓ Better logging in browser console"
echo "   ✓ Network error handling"
echo ""
echo "📝 Next Steps:"
echo "1. Open: https://plataform.spirittours.us"
echo "2. Open browser console (F12)"
echo "3. Click 'Book Now' on a tour"
echo "4. Try to submit booking"
echo "5. Check console for debug logs"
echo "6. If error occurs, you'll see error message in red alert"
echo ""
echo "🔍 Look for console messages:"
echo "   'Creating booking with data: {...}'"
echo "   'Booking created successfully: {...}' (on success)"
echo "   'Booking failed: 400 {...}' (on error)"
echo ""
