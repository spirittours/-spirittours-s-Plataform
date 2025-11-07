#!/bin/bash
# Deployment Script for AI/CRM Platform

set -e

echo "🚀 Starting deployment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "📝 Please copy .env.example to .env and configure your environment"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed"
    exit 1
fi

# Load environment variables
source .env

# Check required variables
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY not set (required for Fase 3 features)"
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Pull latest images
echo "📥 Pulling latest images..."
docker-compose pull

# Build application
echo "🔨 Building application..."
docker-compose build --no-cache

# Start services
echo "▶️  Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check health
echo "🏥 Checking service health..."
docker-compose ps

# Run database migrations (if any)
# echo "📊 Running database migrations..."
# docker-compose exec backend npm run migrate

# Download Ollama models (if Ollama is enabled)
if [ "$OLLAMA_URL" != "" ]; then
    echo "🤖 Downloading Ollama models..."
    docker-compose exec ollama ollama pull llama3.2 || true
    docker-compose exec ollama ollama pull mistral || true
fi

echo "✅ Deployment complete!"
echo ""
echo "📍 Services running:"
echo "   - Backend API: http://localhost:5000"
echo "   - Health Check: http://localhost:5000/api/monitoring/health"
echo "   - MongoDB: localhost:27017"
echo "   - Redis: localhost:6379"
if [ "$OLLAMA_URL" != "" ]; then
    echo "   - Ollama: http://localhost:11434"
fi

echo ""
echo "📚 View logs: docker-compose logs -f"
echo "🛑 Stop services: docker-compose down"
