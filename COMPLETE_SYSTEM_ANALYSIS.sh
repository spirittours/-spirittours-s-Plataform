#!/bin/bash
################################################################################
# Spirit Tours - Complete System Analysis & Health Check
# Identifies ALL issues, bugs, and problems in the system
################################################################################

set +e  # Continue on errors to capture all issues

echo "================================================================"
echo "🔍 SPIRIT TOURS - COMPLETE SYSTEM ANALYSIS"
echo "================================================================"
echo "Analysis Date: $(date)"
echo "Server: $(hostname)"
echo ""

# Output file
REPORT="/tmp/spirit_tours_analysis_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$REPORT")
exec 2>&1

echo "📝 Full report will be saved to: $REPORT"
echo ""

# ============================================================================
# 1. SYSTEM RESOURCES
# ============================================================================
echo "================================================================"
echo "1️⃣  SYSTEM RESOURCES"
echo "================================================================"
echo ""

echo "💾 Disk Usage:"
df -h / | tail -n 1
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "   ⚠️  WARNING: Disk usage over 80%"
else
    echo "   ✅ Disk usage OK"
fi
echo ""

echo "🧠 Memory Usage:"
free -h | head -2
MEM_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}' | cut -d. -f1)
if [ "$MEM_USAGE" -gt 80 ]; then
    echo "   ⚠️  WARNING: Memory usage over 80%"
else
    echo "   ✅ Memory usage OK"
fi
echo ""

echo "⚡ CPU Load:"
uptime
echo ""

# ============================================================================
# 2. DOCKER STATUS
# ============================================================================
echo "================================================================"
echo "2️⃣  DOCKER STATUS"
echo "================================================================"
echo ""

echo "🐳 Docker Service:"
systemctl is-active docker && echo "   ✅ Docker running" || echo "   ❌ Docker NOT running"
echo ""

echo "📦 Docker Containers:"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Size}}\t{{.Ports}}"
echo ""

RUNNING=$(docker ps --filter "name=spirit-tours" | wc -l)
if [ "$RUNNING" -lt 3 ]; then
    echo "   ⚠️  WARNING: Not all Spirit Tours containers are running"
    echo "   Expected: 3 containers (backend, frontend, redis)"
    echo "   Running: $((RUNNING - 1))"
else
    echo "   ✅ All containers running"
fi
echo ""

echo "🏥 Container Health Status:"
for container in spirit-tours-backend spirit-tours-frontend spirit-tours-redis; do
    if docker ps --filter "name=$container" --format "{{.Names}}" | grep -q "$container"; then
        HEALTH=$(docker inspect $container --format='{{.State.Health.Status}}' 2>/dev/null || echo "no-healthcheck")
        STATUS=$(docker inspect $container --format='{{.State.Status}}' 2>/dev/null)
        echo "   $container:"
        echo "      Status: $STATUS"
        echo "      Health: $HEALTH"
        
        if [ "$STATUS" != "running" ]; then
            echo "      ❌ Container not running!"
        elif [ "$HEALTH" = "unhealthy" ]; then
            echo "      ⚠️  Container unhealthy!"
        else
            echo "      ✅ OK"
        fi
    else
        echo "   $container: ❌ NOT FOUND"
    fi
done
echo ""

echo "💾 Docker Disk Usage:"
docker system df
echo ""

# ============================================================================
# 3. BACKEND ANALYSIS
# ============================================================================
echo "================================================================"
echo "3️⃣  BACKEND ANALYSIS"
echo "================================================================"
echo ""

if docker ps --filter "name=spirit-tours-backend" --format "{{.Names}}" | grep -q "spirit-tours-backend"; then
    echo "📋 Backend Logs (Last 50 lines):"
    docker logs spirit-tours-backend --tail 50
    echo ""
    
    echo "🔍 Backend Errors/Warnings:"
    ERROR_COUNT=$(docker logs spirit-tours-backend 2>&1 | grep -ci "error")
    WARNING_COUNT=$(docker logs spirit-tours-backend 2>&1 | grep -ci "warning")
    echo "   Errors found: $ERROR_COUNT"
    echo "   Warnings found: $WARNING_COUNT"
    
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo ""
        echo "   ❌ Recent Errors:"
        docker logs spirit-tours-backend 2>&1 | grep -i "error" | tail -10
    fi
    
    if [ "$WARNING_COUNT" -gt 0 ]; then
        echo ""
        echo "   ⚠️  Recent Warnings:"
        docker logs spirit-tours-backend 2>&1 | grep -i "warning" | tail -10
    fi
    echo ""
    
    echo "🔌 Backend Port Check:"
    if docker exec spirit-tours-backend curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "   ✅ Backend responding on port 8000"
    else
        echo "   ❌ Backend NOT responding on port 8000"
    fi
    echo ""
else
    echo "❌ Backend container not running!"
    echo ""
fi

# ============================================================================
# 4. FRONTEND ANALYSIS
# ============================================================================
echo "================================================================"
echo "4️⃣  FRONTEND ANALYSIS"
echo "================================================================"
echo ""

if docker ps --filter "name=spirit-tours-frontend" --format "{{.Names}}" | grep -q "spirit-tours-frontend"; then
    echo "📋 Frontend Logs (Last 30 lines):"
    docker logs spirit-tours-frontend --tail 30
    echo ""
    
    echo "🔌 Frontend Port Check:"
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        echo "   ✅ Frontend responding on port 8080"
    else
        echo "   ❌ Frontend NOT responding on port 8080"
    fi
    echo ""
    
    echo "📦 Frontend Build Check:"
    docker exec spirit-tours-frontend ls -lh /usr/share/nginx/html/ | head -10
    echo ""
else
    echo "❌ Frontend container not running!"
    echo ""
fi

# ============================================================================
# 5. REDIS ANALYSIS
# ============================================================================
echo "================================================================"
echo "5️⃣  REDIS ANALYSIS"
echo "================================================================"
echo ""

if docker ps --filter "name=spirit-tours-redis" --format "{{.Names}}" | grep -q "spirit-tours-redis"; then
    echo "📊 Redis Info:"
    docker exec spirit-tours-redis redis-cli INFO server | head -10
    echo ""
    
    echo "🔌 Redis Connection Test:"
    if docker exec spirit-tours-redis redis-cli PING | grep -q "PONG"; then
        echo "   ✅ Redis responding"
    else
        echo "   ❌ Redis NOT responding"
    fi
    echo ""
else
    echo "❌ Redis container not running!"
    echo ""
fi

# ============================================================================
# 6. API ENDPOINTS TEST
# ============================================================================
echo "================================================================"
echo "6️⃣  API ENDPOINTS TEST"
echo "================================================================"
echo ""

BASE_URL="https://plataform.spirittours.us"

echo "Testing critical endpoints..."
echo ""

# Test health endpoint
echo "🏥 GET /health"
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$HEALTH_CODE" = "200" ]; then
    echo "   ✅ Status: $HEALTH_CODE"
else
    echo "   ⚠️  Status: $HEALTH_CODE"
fi
echo ""

# Test tours endpoint
echo "🎫 GET /api/v1/tours"
TOURS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/tours")
if [ "$TOURS_CODE" = "200" ]; then
    echo "   ✅ Status: $TOURS_CODE"
    TOURS_COUNT=$(curl -s "$BASE_URL/api/v1/tours" | grep -o '"id"' | wc -l)
    echo "   Tours found: $TOURS_COUNT"
else
    echo "   ❌ Status: $TOURS_CODE"
fi
echo ""

# Test bookings GET endpoint
echo "📋 GET /api/v1/bookings"
BOOKINGS_GET_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/bookings")
if [ "$BOOKINGS_GET_CODE" = "200" ]; then
    echo "   ✅ Status: $BOOKINGS_GET_CODE"
else
    echo "   ❌ Status: $BOOKINGS_GET_CODE"
fi
echo ""

# Test bookings POST endpoint
echo "📝 POST /api/v1/bookings"
BOOKING_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "tour_id": "tour-001",
    "booking_date": "2025-12-25",
    "participants": 2
  }')
BOOKINGS_POST_CODE=$(echo "$BOOKING_RESPONSE" | grep -o '"success":true' && echo "200" || echo "400")
if [ "$BOOKINGS_POST_CODE" = "200" ]; then
    echo "   ✅ Status: 200 - Booking creation works"
else
    echo "   ❌ Status: 400 - Booking creation FAILS"
    echo "   Response: $BOOKING_RESPONSE"
fi
echo ""

# Test stats endpoint
echo "📊 GET /api/v1/stats"
STATS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/stats")
if [ "$STATS_CODE" = "200" ]; then
    echo "   ✅ Status: $STATS_CODE"
else
    echo "   ⚠️  Status: $STATS_CODE"
fi
echo ""

# ============================================================================
# 7. CODE ANALYSIS
# ============================================================================
echo "================================================================"
echo "7️⃣  CODE ANALYSIS"
echo "================================================================"
echo ""

cd /opt/spirittours/app

echo "📁 Application Structure:"
du -sh * 2>/dev/null | sort -hr | head -10
echo ""

echo "🔍 Frontend Code Check:"
if [ -f "frontend/src/AppSimple.tsx" ]; then
    echo "   ✅ AppSimple.tsx exists"
    
    # Check for Tour interface
    if grep -q "id: string" frontend/src/AppSimple.tsx; then
        echo "   ✅ Tour.id type: string (correct)"
    elif grep -q "id: number" frontend/src/AppSimple.tsx; then
        echo "   ⚠️  Tour.id type: number (NEEDS FIX for booking 400 error)"
    fi
    
    # Check for error handling
    if grep -q "errorMessage" frontend/src/AppSimple.tsx; then
        echo "   ✅ Error handling implemented"
    else
        echo "   ⚠️  Error handling MISSING"
    fi
    
    # Check for type conversion
    if grep -q "String(selectedTour.id)" frontend/src/AppSimple.tsx; then
        echo "   ✅ Type conversion implemented"
    else
        echo "   ⚠️  Type conversion MISSING"
    fi
else
    echo "   ❌ AppSimple.tsx NOT FOUND"
fi
echo ""

echo "🔍 Backend Code Check:"
if [ -f "backend/main.py" ]; then
    echo "   ✅ main.py exists"
    
    # Check for POST booking endpoint
    if grep -q "@app.post.*bookings" backend/main.py; then
        echo "   ✅ POST /bookings endpoint exists"
    else
        echo "   ⚠️  POST /bookings endpoint MISSING"
    fi
else
    echo "   ❌ main.py NOT FOUND"
fi
echo ""

# ============================================================================
# 8. DATABASE ANALYSIS
# ============================================================================
echo "================================================================"
echo "8️⃣  DATABASE ANALYSIS"
echo "================================================================"
echo ""

echo "🗄️  Database Files:"
find . -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" 2>/dev/null | while read db; do
    SIZE=$(du -h "$db" | cut -f1)
    echo "   $db - $SIZE"
done
echo ""

echo "📊 Using:"
if grep -q "sqlite" backend/main.py 2>/dev/null || ls *.db >/dev/null 2>&1; then
    echo "   SQLite (development/testing)"
    echo "   ⚠️  Consider migrating to PostgreSQL for production"
else
    echo "   PostgreSQL configuration present"
fi
echo ""

# ============================================================================
# 9. ENVIRONMENT VARIABLES
# ============================================================================
echo "================================================================"
echo "9️⃣  ENVIRONMENT VARIABLES"
echo "================================================================"
echo ""

if [ -f ".env" ]; then
    echo "📄 .env file exists"
    echo ""
    echo "🔍 Checking critical variables:"
    
    for var in SECRET_KEY DB_HOST DB_USER FRONTEND_URL REDIS_HOST REACT_APP_API_URL; do
        if grep -q "^${var}=" .env; then
            VALUE=$(grep "^${var}=" .env | cut -d= -f2 | cut -c1-20)
            if [ -z "$VALUE" ]; then
                echo "   ⚠️  $var: EMPTY"
            else
                echo "   ✅ $var: configured"
            fi
        else
            echo "   ❌ $var: NOT SET"
        fi
    done
else
    echo "⚠️  .env file NOT FOUND"
fi
echo ""

# ============================================================================
# 10. NGINX/PROXY CONFIGURATION
# ============================================================================
echo "================================================================"
echo "🔟 NGINX/PROXY CONFIGURATION"
echo "================================================================"
echo ""

if [ -f "frontend/default.conf" ]; then
    echo "📄 Nginx config exists"
    echo ""
    echo "🔍 API Proxy Configuration:"
    grep -A 5 "location /api" frontend/default.conf || echo "   ⚠️  No /api location block found"
else
    echo "⚠️  Nginx config NOT FOUND"
fi
echo ""

# ============================================================================
# 11. GIT STATUS
# ============================================================================
echo "================================================================"
echo "1️⃣1️⃣  GIT STATUS"
echo "================================================================"
echo ""

if [ -d ".git" ]; then
    echo "📊 Git Status:"
    git status --short | head -20
    echo ""
    
    echo "📝 Recent Commits:"
    git log --oneline -5
    echo ""
    
    echo "🔄 Remote Status:"
    git remote -v
    echo ""
    
    UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l)
    if [ "$UNPUSHED" -gt 0 ]; then
        echo "   ⚠️  $UNPUSHED commits not pushed to remote"
    else
        echo "   ✅ In sync with remote"
    fi
else
    echo "⚠️  Not a git repository"
fi
echo ""

# ============================================================================
# 12. SECURITY CHECKS
# ============================================================================
echo "================================================================"
echo "1️⃣2️⃣  SECURITY CHECKS"
echo "================================================================"
echo ""

echo "🔒 File Permissions:"
if [ -f ".env" ]; then
    PERMS=$(stat -c %a .env 2>/dev/null || stat -f %A .env 2>/dev/null)
    if [ "$PERMS" = "600" ] || [ "$PERMS" = "644" ]; then
        echo "   ✅ .env permissions: $PERMS (OK)"
    else
        echo "   ⚠️  .env permissions: $PERMS (should be 600 or 644)"
    fi
fi
echo ""

echo "🔑 Sensitive Files Check:"
for file in .env .env.local .env.production; do
    if [ -f "$file" ]; then
        echo "   Found: $file"
        if grep -q "password.*123\|secret.*test\|key.*example" "$file" 2>/dev/null; then
            echo "      ⚠️  Contains example/weak credentials"
        else
            echo "      ✅ Appears configured"
        fi
    fi
done
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "================================================================"
echo "📋 ANALYSIS SUMMARY"
echo "================================================================"
echo ""

# Count issues
CRITICAL_ISSUES=0
WARNINGS=0
OK_CHECKS=0

# Disk check
if [ "$DISK_USAGE" -gt 80 ]; then ((CRITICAL_ISSUES++)); else ((OK_CHECKS++)); fi

# Memory check  
if [ "$MEM_USAGE" -gt 80 ]; then ((WARNINGS++)); else ((OK_CHECKS++)); fi

# Containers check
if [ "$RUNNING" -lt 3 ]; then ((CRITICAL_ISSUES++)); else ((OK_CHECKS++)); fi

# API checks
[ "$HEALTH_CODE" = "200" ] && ((OK_CHECKS++)) || ((CRITICAL_ISSUES++))
[ "$TOURS_CODE" = "200" ] && ((OK_CHECKS++)) || ((CRITICAL_ISSUES++))
[ "$BOOKINGS_GET_CODE" = "200" ] && ((OK_CHECKS++)) || ((WARNINGS++))
[ "$BOOKINGS_POST_CODE" = "200" ] && ((OK_CHECKS++)) || ((CRITICAL_ISSUES++))

echo "✅ Checks Passed: $OK_CHECKS"
echo "⚠️  Warnings: $WARNINGS"
echo "❌ Critical Issues: $CRITICAL_ISSUES"
echo ""

if [ "$CRITICAL_ISSUES" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo "🎉 SYSTEM STATUS: EXCELLENT"
    echo "   No critical issues or warnings found!"
elif [ "$CRITICAL_ISSUES" -eq 0 ]; then
    echo "✅ SYSTEM STATUS: GOOD"
    echo "   No critical issues, but some warnings to address"
else
    echo "⚠️  SYSTEM STATUS: NEEDS ATTENTION"
    echo "   Critical issues found that need immediate attention"
fi

echo ""
echo "================================================================"
echo "📝 Full report saved to: $REPORT"
echo "================================================================"
echo ""
echo "To fix identified issues, run:"
echo "  cat $REPORT | grep '❌\|⚠️'"
echo ""
