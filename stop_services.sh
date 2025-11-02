#!/bin/bash

# Spirit Tours - Service Stop Script
# This script stops all running services

echo "===================================="
echo "Spirit Tours Platform - Stopping Services"
echo "===================================="
echo ""

# Kill FastAPI backend
echo "Stopping Backend API..."
pkill -f "uvicorn main:app" 2>/dev/null

# Kill Frontend
echo "Stopping Frontend..."
pkill -f "npm start" 2>/dev/null
pkill -f "react-scripts start" 2>/dev/null

# Kill Celery workers and beat
echo "Stopping Celery services..."
pkill -f "celery -A backend.celery_app worker" 2>/dev/null
pkill -f "celery -A backend.celery_app beat" 2>/dev/null

# Optional: Stop Redis (usually keep it running)
# echo "Stopping Redis..."
# redis-cli shutdown 2>/dev/null

echo ""
echo "All services stopped."
echo ""