#!/bin/bash
###############################################################################
# Spirit Tours - Health Check Script
# Verifica el estado de todos los servicios
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_service() {
    local service=$1
    if systemctl is-active --quiet "$service"; then
        echo -e "${GREEN}✓${NC} $service: Running"
        return 0
    else
        echo -e "${RED}✗${NC} $service: Not running"
        return 1
    fi
}

check_port() {
    local port=$1
    local name=$2
    if nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $name (port $port): Accessible"
        return 0
    else
        echo -e "${RED}✗${NC} $name (port $port): Not accessible"
        return 1
    fi
}

echo "╔══════════════════════════════════════════════════════╗"
echo "║    Spirit Tours - System Health Check               ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

echo "📊 Services Status:"
check_service postgresql
check_service redis-server
check_service nginx
check_service spirit-tours-api || true
check_service spirit-tours-email-worker || true

echo ""
echo "🌐 Port Accessibility:"
check_port 80 "HTTP"
check_port 443 "HTTPS"
check_port 8000 "API"
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"

echo ""
echo "🔍 API Health:"
if curl -sf http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✓${NC} API Health Endpoint: OK"
else
    echo -e "${RED}✗${NC} API Health Endpoint: Failed"
fi

echo ""
echo "💾 Disk Space:"
df -h / | tail -1 | awk '{print "   Used: "$3" / "$2" ("$5")"}'

echo ""
echo "🧠 Memory Usage:"
free -h | grep Mem | awk '{print "   Used: "$3" / "$2}'

echo ""
echo "⏰ System Uptime:"
uptime -p

echo ""
