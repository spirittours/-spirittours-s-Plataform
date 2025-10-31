#!/bin/bash

# Spirit Tours AI Guide - Health Check Script
# Monitors all services and sends alerts if needed

set -e

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
EMAIL_ALERTS="${EMAIL_ALERTS:-false}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@spirittours.com}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Health check results
HEALTH_STATUS="healthy"
ISSUES=()

echo "🏥 Spirit Tours Health Check"
echo "============================"
echo "Timestamp: $(date)"
echo ""

# Function to send alert
send_alert() {
    local message="$1"
    
    # Slack webhook
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Spirit Tours Alert: $message\"}" \
            "$SLACK_WEBHOOK_URL" &> /dev/null || true
    fi
    
    # Email alert (requires mailx or sendmail)
    if [ "$EMAIL_ALERTS" = "true" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "Spirit Tours Health Alert" "$ALERT_EMAIL" || true
    fi
}

# Check API health
echo "📡 Checking API..."
if response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" --max-time 10); then
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ API is healthy (HTTP $response)${NC}"
    else
        echo -e "${RED}❌ API returned HTTP $response${NC}"
        HEALTH_STATUS="unhealthy"
        ISSUES+=("API returned HTTP $response")
    fi
else
    echo -e "${RED}❌ API is not responding${NC}"
    HEALTH_STATUS="critical"
    ISSUES+=("API is not responding")
fi

# Check API stats
echo ""
echo "📊 Checking API stats..."
if stats=$(curl -s "$API_URL/api/stats" --max-time 10); then
    if echo "$stats" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ API stats endpoint working${NC}"
        
        # Extract uptime if available
        if uptime=$(echo "$stats" | grep -o '"uptime":[0-9.]*' | cut -d':' -f2); then
            uptime_hours=$(echo "scale=2; $uptime / 3600" | bc)
            echo "   Uptime: ${uptime_hours} hours"
        fi
    else
        echo -e "${YELLOW}⚠️  API stats endpoint returned error${NC}"
        HEALTH_STATUS="degraded"
        ISSUES+=("API stats endpoint error")
    fi
else
    echo -e "${RED}❌ API stats endpoint not responding${NC}"
    HEALTH_STATUS="unhealthy"
    ISSUES+=("API stats endpoint not responding")
fi

# Check PostgreSQL (if running in Docker)
if command -v docker &> /dev/null && docker ps | grep -q spirit-tours-postgres; then
    echo ""
    echo "🐘 Checking PostgreSQL..."
    if docker exec spirit-tours-postgres pg_isready -U spirit_tours_user -d spirit_tours_db &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
    else
        echo -e "${RED}❌ PostgreSQL is not ready${NC}"
        HEALTH_STATUS="critical"
        ISSUES+=("PostgreSQL is not ready")
    fi
fi

# Check Redis (if running in Docker)
if command -v docker &> /dev/null && docker ps | grep -q spirit-tours-redis; then
    echo ""
    echo "🔴 Checking Redis..."
    if docker exec spirit-tours-redis redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✅ Redis is responding${NC}"
    else
        echo -e "${YELLOW}⚠️  Redis is not responding${NC}"
        HEALTH_STATUS="degraded"
        ISSUES+=("Redis is not responding")
    fi
fi

# Check disk space
echo ""
echo "💾 Checking disk space..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✅ Disk usage: ${DISK_USAGE}%${NC}"
elif [ "$DISK_USAGE" -lt 90 ]; then
    echo -e "${YELLOW}⚠️  Disk usage: ${DISK_USAGE}% (warning)${NC}"
    HEALTH_STATUS="degraded"
    ISSUES+=("Disk usage at ${DISK_USAGE}%")
else
    echo -e "${RED}❌ Disk usage: ${DISK_USAGE}% (critical)${NC}"
    if [ "$HEALTH_STATUS" != "critical" ]; then
        HEALTH_STATUS="critical"
    fi
    ISSUES+=("Disk usage at ${DISK_USAGE}% (critical)")
fi

# Check memory usage
echo ""
echo "🧠 Checking memory..."
if command -v free &> /dev/null; then
    MEM_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100)}')
    if [ "$MEM_USAGE" -lt 80 ]; then
        echo -e "${GREEN}✅ Memory usage: ${MEM_USAGE}%${NC}"
    elif [ "$MEM_USAGE" -lt 90 ]; then
        echo -e "${YELLOW}⚠️  Memory usage: ${MEM_USAGE}% (warning)${NC}"
        if [ "$HEALTH_STATUS" = "healthy" ]; then
            HEALTH_STATUS="degraded"
        fi
        ISSUES+=("Memory usage at ${MEM_USAGE}%")
    else
        echo -e "${RED}❌ Memory usage: ${MEM_USAGE}% (critical)${NC}"
        if [ "$HEALTH_STATUS" != "critical" ]; then
            HEALTH_STATUS="critical"
        fi
        ISSUES+=("Memory usage at ${MEM_USAGE}% (critical)")
    fi
fi

# Check Docker containers (if using Docker)
if command -v docker &> /dev/null; then
    echo ""
    echo "🐳 Checking Docker containers..."
    CONTAINER_COUNT=$(docker ps --filter "name=spirit-tours" --format "{{.Names}}" | wc -l)
    RUNNING_CONTAINERS=$(docker ps --filter "name=spirit-tours" --format "{{.Names}}" | tr '\n' ', ' | sed 's/,$//')
    
    if [ "$CONTAINER_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ $CONTAINER_COUNT container(s) running${NC}"
        echo "   Containers: $RUNNING_CONTAINERS"
    else
        echo -e "${YELLOW}⚠️  No Spirit Tours containers running${NC}"
    fi
    
    # Check for any stopped containers
    STOPPED_COUNT=$(docker ps -a --filter "name=spirit-tours" --filter "status=exited" --format "{{.Names}}" | wc -l)
    if [ "$STOPPED_COUNT" -gt 0 ]; then
        STOPPED_CONTAINERS=$(docker ps -a --filter "name=spirit-tours" --filter "status=exited" --format "{{.Names}}" | tr '\n' ', ' | sed 's/,$//')
        echo -e "${YELLOW}⚠️  $STOPPED_COUNT stopped container(s): $STOPPED_CONTAINERS${NC}"
        ISSUES+=("$STOPPED_COUNT stopped containers")
    fi
fi

# Summary
echo ""
echo "============================"
case "$HEALTH_STATUS" in
    healthy)
        echo -e "${GREEN}✅ System Status: HEALTHY${NC}"
        ;;
    degraded)
        echo -e "${YELLOW}⚠️  System Status: DEGRADED${NC}"
        echo "Issues found:"
        for issue in "${ISSUES[@]}"; do
            echo "   - $issue"
        done
        send_alert "System degraded: ${ISSUES[*]}"
        ;;
    unhealthy)
        echo -e "${RED}❌ System Status: UNHEALTHY${NC}"
        echo "Issues found:"
        for issue in "${ISSUES[@]}"; do
            echo "   - $issue"
        done
        send_alert "System unhealthy: ${ISSUES[*]}"
        exit 1
        ;;
    critical)
        echo -e "${RED}🚨 System Status: CRITICAL${NC}"
        echo "Critical issues found:"
        for issue in "${ISSUES[@]}"; do
            echo "   - $issue"
        done
        send_alert "CRITICAL: ${ISSUES[*]}"
        exit 2
        ;;
esac

echo ""
echo "Health check completed at $(date)"
