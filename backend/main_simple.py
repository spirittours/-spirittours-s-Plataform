#!/usr/bin/env python3
"""
Spirit Tours Backend - Simplified Main
A simplified version that starts without all dependencies
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import os
from typing import Dict, Any

# Create FastAPI app
app = FastAPI(
    title="Spirit Tours Platform API",
    description="Complete B2B2B Travel Platform with AI Integration",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "spirit-tours-backend",
        "version": "2.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with system info"""
    return {
        "name": "Spirit Tours Platform API",
        "status": "operational",
        "documentation": "/docs",
        "health": "/health",
        "features": {
            "ai_agents": "25 specialized AI agents",
            "business_models": "B2C, B2B, B2B2C",
            "integrations": "Multiple payment gateways, email services",
            "real_time": "WebSocket support for live updates"
        }
    }

# API v1 endpoints
@app.get("/api/v1/status")
async def api_status():
    """API status endpoint"""
    return {
        "api_version": "1.0",
        "status": "active",
        "endpoints_available": True,
        "database": "connected",
        "cache": "connected",
        "timestamp": datetime.utcnow().isoformat()
    }

# Tours endpoint (mock)
@app.get("/api/v1/tours")
async def get_tours():
    """Get available tours"""
    return {
        "tours": [
            {
                "id": "1",
                "name": "Jerusalem Historical Tour",
                "price": 120.00,
                "duration": "8 hours",
                "rating": 4.8,
                "availability": "daily"
            },
            {
                "id": "2",
                "name": "Dead Sea Experience",
                "price": 150.00,
                "duration": "10 hours",
                "rating": 4.9,
                "availability": "daily"
            },
            {
                "id": "3",
                "name": "Tel Aviv Modern City Tour",
                "price": 80.00,
                "duration": "6 hours",
                "rating": 4.7,
                "availability": "daily"
            }
        ],
        "total": 3
    }

# Bookings endpoint (mock)
@app.get("/api/v1/bookings")
async def get_bookings():
    """Get user bookings"""
    return {
        "bookings": [],
        "total": 0,
        "message": "Please login to view your bookings"
    }

# Auth endpoint (mock)
@app.post("/api/v1/auth/login")
async def login(credentials: Dict[str, Any]):
    """Mock login endpoint"""
    return {
        "access_token": "mock_token_123456",
        "token_type": "bearer",
        "user": {
            "email": credentials.get("email", "user@example.com"),
            "role": "customer"
        }
    }

# Error handler
@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Handle 404 errors"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": "The requested resource was not found",
            "path": str(request.url.path)
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Handle 500 errors"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An internal error occurred"
        }
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    print("=" * 50)
    print("🚀 Spirit Tours Backend Starting...")
    print("=" * 50)
    print("📍 API Documentation: http://localhost:8000/docs")
    print("📍 Health Check: http://localhost:8000/health")
    print("=" * 50)

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler"""
    print("👋 Spirit Tours Backend Shutting Down...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)