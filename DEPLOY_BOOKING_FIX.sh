#!/bin/bash
# Quick Deployment Script for Booking Endpoint Fix
# Run this on your production server (plataform.spirittours.us)

echo "=== Spirit Tours - Booking Endpoint Fix Deployment ==="
echo ""

# 1. Navigate to webapp directory
echo "Step 1: Navigating to webapp directory..."
cd /path/to/webapp || exit 1
echo "✓ Current directory: $(pwd)"
echo ""

# 2. Check current branch
echo "Step 2: Checking current branch..."
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# 3. Stash any local changes
echo "Step 3: Stashing local changes (if any)..."
git stash
echo "✓ Local changes stashed"
echo ""

# 4. Pull latest changes from main
echo "Step 4: Pulling latest changes from main..."
git pull origin main
echo "✓ Latest changes pulled"
echo ""

# 5. Show recent commits
echo "Step 5: Recent commits:"
git log --oneline -5
echo ""

# 6. Check if booking_api.py was updated
echo "Step 6: Verifying booking_api.py update..."
if git log --oneline -5 | grep -q "booking"; then
    echo "✓ Booking endpoint fix detected"
else
    echo "⚠ Warning: Booking fix commit not found in recent history"
fi
echo ""

# 7. Restart backend service
echo "Step 7: Restarting backend service..."
echo "Please run ONE of the following commands based on your setup:"
echo ""
echo "  Option A (systemd service):"
echo "    sudo systemctl restart spirittours-backend"
echo ""
echo "  Option B (PM2):"
echo "    pm2 restart spirittours-backend"
echo ""
echo "  Option C (Docker):"
echo "    docker-compose restart backend"
echo ""
echo "  Option D (supervisord):"
echo "    supervisorctl restart spirittours-backend"
echo ""

read -p "Enter your choice (A/B/C/D): " choice
case $choice in
    A|a)
        sudo systemctl restart spirittours-backend
        sudo systemctl status spirittours-backend
        ;;
    B|b)
        pm2 restart spirittours-backend
        pm2 status
        ;;
    C|c)
        docker-compose restart backend
        docker-compose ps
        ;;
    D|d)
        supervisorctl restart spirittours-backend
        supervisorctl status spirittours-backend
        ;;
    *)
        echo "Invalid choice. Please restart the backend manually."
        ;;
esac
echo ""

# 8. Test the endpoint
echo "Step 8: Testing booking endpoint..."
echo "Testing POST /api/v1/bookings..."
curl -X POST http://localhost:8000/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "email": "test@example.com",
      "first_name": "Test",
      "last_name": "User",
      "phone": "+1234567890",
      "country": "USA",
      "language": "en"
    },
    "product_id": "TEST-001",
    "slot_id": "SLOT-TEST",
    "participants_count": 2
  }' 2>&1 | head -20
echo ""
echo ""

echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "1. Check the backend logs for any errors"
echo "2. Test booking creation on https://plataform.spirittours.us"
echo "3. Monitor error logs for 24 hours"
echo ""
echo "If issues persist, check:"
echo "- Backend service status"
echo "- Database connectivity"
echo "- Environment variables"
echo "- Firewall/security group settings"
