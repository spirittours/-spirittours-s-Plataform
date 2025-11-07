#!/bin/bash

# ============================================
# Spirit Tours CMS - Stop Demo Servers
# ============================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Stopping Spirit Tours CMS Demo${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Stop backend
if [ -f /tmp/demo-backend.pid ]; then
    BACKEND_PID=$(cat /tmp/demo-backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID 2>/dev/null
        print_success "Backend demo server stopped (PID: $BACKEND_PID)"
    else
        print_info "Backend was not running"
    fi
    rm /tmp/demo-backend.pid
else
    # Try to kill by port
    if lsof -ti:5002 >/dev/null 2>&1; then
        lsof -ti:5002 | xargs kill -9
        print_success "Stopped process on port 5002"
    else
        print_info "No backend process found"
    fi
fi

# Stop frontend
if [ -f /tmp/demo-frontend.pid ]; then
    FRONTEND_PID=$(cat /tmp/demo-frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill $FRONTEND_PID 2>/dev/null
        print_success "Frontend server stopped (PID: $FRONTEND_PID)"
    else
        print_info "Frontend was not running"
    fi
    rm /tmp/demo-frontend.pid
else
    # Try to kill by port
    if lsof -ti:3000 >/dev/null 2>&1; then
        lsof -ti:3000 | xargs kill -9
        print_success "Stopped process on port 3000"
    else
        print_info "No frontend process found"
    fi
fi

echo ""
print_success "All demo servers stopped"
echo ""
