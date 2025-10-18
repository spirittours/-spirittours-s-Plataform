#!/bin/bash

# Spirit Tours - Quick Development Start Script
# Starts all services in development mode

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Spirit Tours - Development Mode${NC}"
echo -e "${BLUE}========================================${NC}"

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created. Please update with your API keys.${NC}"
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker not found. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Stop any running containers
echo -e "${YELLOW}Stopping any existing containers...${NC}"
docker-compose down 2>/dev/null || true

# Start services
echo -e "${GREEN}Starting services...${NC}"
docker-compose up -d postgres redis

# Wait for database
echo -e "${YELLOW}Waiting for database...${NC}"
sleep 5

# Initialize database
echo -e "${GREEN}Initializing database...${NC}"
docker-compose run --rm backend python database/init_quotation_db.py

# Start all services
echo -e "${GREEN}Starting all services...${NC}"
docker-compose up -d

# Show logs
echo -e "${GREEN}Services starting...${NC}"
docker-compose logs --tail=50 -f &
LOG_PID=$!

# Wait a bit for services to start
sleep 10
kill $LOG_PID 2>/dev/null || true

# Health check
echo -e "${YELLOW}Running health check...${NC}"
HEALTH=$(curl -s http://localhost:8000/health | python3 -m json.tool 2>/dev/null || echo "Service starting...")

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Development environment is ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "🌐 Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "🚀 API: ${BLUE}http://localhost:8000${NC}"
echo -e "📚 API Docs: ${BLUE}http://localhost:8000/api/docs${NC}"
echo -e "🔌 WebSocket Test: ${BLUE}http://localhost:8000/api/test/websocket${NC}"
echo -e "🗄️ pgAdmin: ${BLUE}http://localhost:5050${NC}"
echo ""
echo -e "📊 View logs: ${YELLOW}docker-compose logs -f${NC}"
echo -e "🛑 Stop all: ${YELLOW}docker-compose down${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"