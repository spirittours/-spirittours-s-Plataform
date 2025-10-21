#!/bin/bash
# Deployment script for B2B2B Platform
# Usage: ./scripts/deploy.sh [environment]

set -e  # Exit on error

ENVIRONMENT=${1:-staging}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting deployment to $ENVIRONMENT environment..."

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]; then
    source "$PROJECT_ROOT/.env.$ENVIRONMENT"
    echo "✅ Loaded environment variables from .env.$ENVIRONMENT"
else
    echo "⚠️  No .env.$ENVIRONMENT file found, using defaults"
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Build Docker images
echo "🔨 Building Docker images..."
cd "$PROJECT_ROOT"

docker-compose build --no-cache

echo "✅ Docker images built successfully"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Start new containers
echo "🚀 Starting new containers..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check backend health
echo "🔍 Checking backend health..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -f http://localhost:${BACKEND_PORT:-8000}/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy"
        break
    fi
    
    attempt=$((attempt + 1))
    echo "⏳ Waiting for backend... (attempt $attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Backend health check failed"
    docker-compose logs backend
    exit 1
fi

# Run database migrations
echo "📦 Running database migrations..."
docker-compose exec -T backend alembic upgrade head || true

# Warm up caches
echo "♨️  Warming up caches..."
curl -X POST http://localhost:${BACKEND_PORT:-8000}/api/v1/admin/cache/warm || true

# Check frontend health
echo "🔍 Checking frontend health..."
if curl -f http://localhost:${FRONTEND_PORT:-3000} > /dev/null 2>&1; then
    echo "✅ Frontend is healthy"
else
    echo "⚠️  Frontend health check failed"
fi

# Display running services
echo "📊 Running services:"
docker-compose ps

# Display logs
echo "📝 Recent logs:"
docker-compose logs --tail=50

echo ""
echo "✅ Deployment to $ENVIRONMENT completed successfully!"
echo ""
echo "🌐 Access points:"
echo "   - Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "   - Backend API: http://localhost:${BACKEND_PORT:-8000}"
echo "   - API Docs: http://localhost:${BACKEND_PORT:-8000}/docs"
echo ""
echo "📊 Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart services: docker-compose restart"
echo ""
