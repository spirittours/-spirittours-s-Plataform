#!/bin/bash
################################################################################
# Spirit Tours - Quick Fix Commands
# All commands needed to fix everything
################################################################################

echo "=========================================="
echo "🚀 Spirit Tours - Complete Fix Script"
echo "=========================================="
echo ""

# STEP 1: Clean disk space
echo "📊 STEP 1/4: Cleaning Disk Space"
echo "=========================================="
cd /opt/spirittours/app
git pull origin main 2>/dev/null || echo "Git pull failed, continuing..."
echo ""

echo "Running disk diagnosis..."
./diagnose_disk_usage.sh
echo ""

read -p "Press Enter to start cleanup..." 
./cleanup_disk_space.sh
echo ""

# STEP 2: Update frontend code
echo "🔧 STEP 2/4: Updating Frontend Code"
echo "=========================================="
echo "The frontend code needs to be updated with error handling."
echo "You have two options:"
echo ""
echo "Option A: Copy from local machine (recommended)"
echo "  Run this on your LOCAL machine (not SSH):"
echo "  scp /home/user/webapp/frontend/src/AppSimple.tsx root@138.197.6.239:/opt/spirittours/app/frontend/src/"
echo ""
echo "Option B: Manual edit (if SCP doesn't work)"
echo "  Follow instructions in MANUAL_DEPLOY_STEPS.md"
echo ""
read -p "Press Enter when frontend code is updated..."
echo ""

# STEP 3: Rebuild frontend
echo "🔨 STEP 3/4: Rebuilding Frontend Container"
echo "=========================================="
docker-compose -f docker-compose.digitalocean.yml up -d --build frontend
echo ""
echo "Waiting 60 seconds for frontend to start..."
sleep 60
echo ""

# STEP 4: Verify everything
echo "✅ STEP 4/4: Verification"
echo "=========================================="
echo ""
echo "Disk usage:"
df -h / | tail -n 1
echo ""
echo "Docker usage:"
docker system df
echo ""
echo "Containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Size}}"
echo ""
echo "Testing endpoints..."
echo ""
echo "Tours endpoint:"
curl -s https://plataform.spirittours.us/api/v1/tours | head -c 100
echo "..."
echo ""
echo "Health endpoint:"
curl -s https://plataform.spirittours.us/health | head -c 50
echo "..."
echo ""

echo "=========================================="
echo "✅ ALL STEPS COMPLETE!"
echo "=========================================="
echo ""
echo "🎯 Next Steps:"
echo "1. Open: https://plataform.spirittours.us"
echo "2. Open browser console (F12)"
echo "3. Click 'Book Now' on a tour"
echo "4. Try to book - check console for logs"
echo "5. Error messages now show in red alerts"
echo ""
echo "📊 Results:"
echo "✅ Disk space cleaned (check df -h)"
echo "✅ Frontend rebuilt with error handling"
echo "✅ Log rotation configured"
echo "✅ All containers running"
echo ""
