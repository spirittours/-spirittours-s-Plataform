#!/bin/bash

# ============================================
# Spirit Tours CMS - Demo Launcher
# ============================================
# Starts both backend demo server and frontend
# No MongoDB required!
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_ROOT="/home/user/webapp"

# Print header
print_header() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}    SPIRIT TOURS CMS - DEMO MODE${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if node is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        echo "Please install Node.js v18+ from https://nodejs.org/"
        exit 1
    fi
    print_success "Node.js $(node -v) detected"
}

# Check if ports are available
check_ports() {
    print_info "Checking if ports 5002 and 3000 are available..."
    
    if lsof -Pi :5002 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        print_warning "Port 5002 is already in use"
        print_info "Killing process on port 5002..."
        lsof -ti:5002 | xargs kill -9 2>/dev/null || true
    fi
    
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        print_warning "Port 3000 is already in use"
        print_info "Killing process on port 3000..."
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    fi
    
    print_success "Ports are now available"
}

# Start backend demo server
start_backend() {
    print_info "Starting backend demo server..."
    
    cd "$PROJECT_ROOT/backend"
    
    # Set demo port
    export DEMO_PORT=5002
    export NODE_ENV=development
    export CORS_ORIGINS=http://localhost:3000
    
    # Start in background
    node demo-server.js > /tmp/demo-backend.log 2>&1 &
    BACKEND_PID=$!
    
    echo $BACKEND_PID > /tmp/demo-backend.pid
    
    # Wait for backend to start
    sleep 3
    
    if ps -p $BACKEND_PID > /dev/null; then
        print_success "Backend demo server started (PID: $BACKEND_PID)"
        print_info "Backend URL: http://localhost:5002"
    else
        print_error "Failed to start backend demo server"
        cat /tmp/demo-backend.log
        exit 1
    fi
}

# Start frontend
start_frontend() {
    print_info "Starting frontend development server..."
    
    cd "$PROJECT_ROOT/spirit-tours"
    
    # Set API URL to demo server
    export REACT_APP_API_URL=http://localhost:5002
    export PORT=3000
    
    # Start in background
    npm start > /tmp/demo-frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    echo $FRONTEND_PID > /tmp/demo-frontend.pid
    
    print_success "Frontend server starting (PID: $FRONTEND_PID)"
    print_info "Frontend URL: http://localhost:3000"
    print_warning "Frontend may take 30-60 seconds to compile..."
}

# Display instructions
show_instructions() {
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  DEMO SERVERS STARTED SUCCESSFULLY!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "${CYAN}🌐 Access URLs:${NC}"
    echo -e "   ${BLUE}Backend:${NC}  http://localhost:5002"
    echo -e "   ${BLUE}Frontend:${NC} http://localhost:3000"
    echo -e "   ${BLUE}Admin:${NC}    http://localhost:3000/admin/cms/pages"
    echo ""
    echo -e "${CYAN}📊 Demo Features:${NC}"
    echo -e "   ✅ 4 pre-loaded institutional pages"
    echo -e "   ✅ Full CMS interface (no login required)"
    echo -e "   ✅ Create, edit, delete pages"
    echo -e "   ✅ Drag-and-drop sections"
    echo -e "   ✅ Media library (mock uploads)"
    echo -e "   ✅ SEO settings"
    echo -e "   ✅ Preview modes"
    echo ""
    echo -e "${CYAN}⚠️  Important Notes:${NC}"
    echo -e "   - All data is in-memory (resets on restart)"
    echo -e "   - No MongoDB required"
    echo -e "   - Perfect for testing and demos"
    echo -e "   - File uploads are simulated"
    echo ""
    echo -e "${CYAN}🛑 To stop the demo:${NC}"
    echo -e "   bash scripts/stop-demo.sh"
    echo -e "   ${YELLOW}OR press Ctrl+C in this terminal${NC}"
    echo ""
    echo -e "${CYAN}📝 Logs:${NC}"
    echo -e "   Backend:  tail -f /tmp/demo-backend.log"
    echo -e "   Frontend: tail -f /tmp/demo-frontend.log"
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo ""
}

# Cleanup on exit
cleanup() {
    echo ""
    print_warning "Shutting down demo servers..."
    
    if [ -f /tmp/demo-backend.pid ]; then
        BACKEND_PID=$(cat /tmp/demo-backend.pid)
        kill $BACKEND_PID 2>/dev/null || true
        rm /tmp/demo-backend.pid
        print_success "Backend stopped"
    fi
    
    if [ -f /tmp/demo-frontend.pid ]; then
        FRONTEND_PID=$(cat /tmp/demo-frontend.pid)
        kill $FRONTEND_PID 2>/dev/null || true
        rm /tmp/demo-frontend.pid
        print_success "Frontend stopped"
    fi
    
    echo ""
    print_info "Demo servers shutdown complete"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    print_header
    
    print_info "Starting Spirit Tours CMS Demo..."
    echo ""
    
    check_node
    check_ports
    
    echo ""
    start_backend
    
    echo ""
    start_frontend
    
    echo ""
    show_instructions
    
    # Keep script running
    print_info "Servers are running. Press Ctrl+C to stop."
    
    # Wait indefinitely
    while true; do
        sleep 1
    done
}

# Run main
main
