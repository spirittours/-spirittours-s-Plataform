#!/bin/bash
################################################################################
# Spirit Tours - Deploy Booking Endpoint Fix
# Fixes 405 Method Not Allowed error when clicking "Book Now"
################################################################################

set -e  # Exit on error

echo "=========================================="
echo "🚀 Spirit Tours - Deploy Booking Fix"
echo "=========================================="
echo ""

# Check if running on production server
HOSTNAME=$(hostname)
echo "📍 Current host: $HOSTNAME"
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

# Show what changed
echo "📝 Changes in this deployment:"
git log --oneline -5
echo ""

# Rebuild backend container
echo "🔨 Rebuilding backend container..."
docker-compose -f docker-compose.digitalocean.yml up -d --build backend
echo ""

# Wait for container to be healthy
echo "⏳ Waiting for backend to start (30 seconds)..."
sleep 30
echo ""

# Check container status
echo "✅ Checking container status..."
docker ps | grep spirit-tours
echo ""

# Check backend logs
echo "📋 Backend logs (last 20 lines):"
docker logs spirit-tours-backend --tail 20
echo ""

# Test GET endpoint
echo "🧪 Testing GET /api/v1/bookings..."
curl -s https://plataform.spirittours.us/api/v1/bookings | jq '.' || echo "Note: jq not installed, showing raw output"
echo ""

# Test POST endpoint
echo "🧪 Testing POST /api/v1/bookings..."
curl -s -X POST https://plataform.spirittours.us/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "tour_id": "tour-001",
    "booking_date": "2025-12-01",
    "participants": 2
  }' | jq '.' || echo "Note: jq not installed, showing raw output"
echo ""

echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "🎯 Next Steps:"
echo "1. Open: https://plataform.spirittours.us"
echo "2. Click 'Book Now' on a tour"
echo "3. Fill the form and submit"
echo "4. Verify success message appears"
echo ""
echo "📊 Monitor logs with:"
echo "   docker logs -f spirit-tours-backend"
echo ""
echo "🔧 Troubleshoot with:"
echo "   docker-compose -f docker-compose.digitalocean.yml restart backend"
echo ""
