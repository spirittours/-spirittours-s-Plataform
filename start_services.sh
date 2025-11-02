#!/bin/bash

# Spirit Tours - Service Startup Script
# This script starts all the necessary services for the platform

echo "===================================="
echo "Spirit Tours Platform - Service Startup"
echo "===================================="
echo ""

# Set working directory
cd /home/user/webapp

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install backend dependencies if not installed
echo "Checking backend dependencies..."
if ! python -c "import fastapi" 2>/dev/null; then
    echo "Installing backend dependencies..."
    pip install -r requirements.txt --quiet
fi

# Check if PostgreSQL is running
echo "Checking PostgreSQL..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "PostgreSQL is not running. Starting PostgreSQL..."
    sudo service postgresql start
fi

# Check if Redis is running
echo "Checking Redis..."
if ! redis-cli ping > /dev/null 2>&1; then
    echo "Redis is not running. Starting Redis..."
    redis-server --daemonize yes
fi

# Initialize database if needed
echo "Initializing database..."
cd backend
python -c "
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
import os

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./spirittours.db')
engine = create_engine(DATABASE_URL)

# Create all tables
from accounting.database_integration import Base
Base.metadata.create_all(bind=engine)
print('Database tables created successfully')
" 2>/dev/null || echo "Database already initialized"

cd /home/user/webapp

# Start Backend Services
echo ""
echo "Starting Backend Services..."
echo "----------------------------"

# Start Celery Worker (Background Tasks)
echo "Starting Celery Worker..."
celery -A backend.celery_app worker --loglevel=info --detach > /dev/null 2>&1 &

# Start Celery Beat (Scheduled Tasks)
echo "Starting Celery Beat..."
celery -A backend.celery_app beat --loglevel=info --detach > /dev/null 2>&1 &

# Start FastAPI Backend
echo "Starting FastAPI Backend on port 8000..."
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Install Frontend dependencies if not installed
echo ""
echo "Starting Frontend Services..."
echo "----------------------------"

cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install --silent
fi

# Start Frontend Development Server
echo "Starting React Frontend on port 3000..."
npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for services to start
echo ""
echo "Waiting for services to initialize..."
sleep 5

# Check service status
echo ""
echo "===================================="
echo "Service Status Check"
echo "===================================="

# Check Backend
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend API: Running on http://localhost:8000"
    echo "   API Docs: http://localhost:8000/docs"
else
    echo "❌ Backend API: Not responding"
fi

# Check Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend: Running on http://localhost:3000"
else
    echo "❌ Frontend: Not responding"
fi

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis: Running"
else
    echo "❌ Redis: Not running"
fi

# Check PostgreSQL
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "✅ PostgreSQL: Running"
else
    echo "⚠️  PostgreSQL: Not running (using SQLite fallback)"
fi

echo ""
echo "===================================="
echo "Spirit Tours Platform is starting!"
echo "===================================="
echo ""
echo "Access Points:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:8000"
echo "- API Documentation: http://localhost:8000/docs"
echo "- Admin Panel: http://localhost:3000/admin"
echo ""
echo "Default Credentials:"
echo "- Admin: admin@spirittours.com / admin123"
echo "- Agent: agent@spirittours.com / agent123"
echo ""
echo "To stop all services, run: ./stop_services.sh"
echo ""
echo "Logs are available in the 'logs' directory"
echo ""

# Keep script running and show logs
echo "Press Ctrl+C to stop all services..."
tail -f logs/backend.log logs/frontend.log 2>/dev/null