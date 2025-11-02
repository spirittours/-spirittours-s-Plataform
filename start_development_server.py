#!/usr/bin/env python3
"""
Spirit Tours Development Server Starter
Starts a simplified version for development and testing
"""

import os
import sys
import sqlite3
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def setup_sqlite_database():
    """Setup SQLite database as fallback"""
    db_path = Path("spirit_tours_dev.db")
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Create basic tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            is_active BOOLEAN DEFAULT 1,
            is_superuser BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tours (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            duration_days INTEGER,
            max_participants INTEGER,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            tour_id INTEGER NOT NULL,
            booking_date DATE NOT NULL,
            participants INTEGER NOT NULL,
            total_price REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (tour_id) REFERENCES tours(id)
        )
    """)
    
    # Insert sample data
    cursor.execute("""
        INSERT OR IGNORE INTO users (email, username, password_hash, full_name, is_superuser)
        VALUES ('admin@spirittours.com', 'admin', 'hashed_password', 'Administrator', 1)
    """)
    
    sample_tours = [
        ("Jerusalem Holy City Tour", "Experience the spiritual heart of three religions", 250.0, 1, 20),
        ("Dead Sea & Masada Adventure", "Float in the Dead Sea and explore ancient Masada", 180.0, 1, 25),
        ("Galilee & Nazareth Journey", "Walk in the footsteps of history", 220.0, 1, 15),
        ("Tel Aviv Modern Experience", "Discover Israel's vibrant coastal city", 150.0, 1, 30)
    ]
    
    for tour in sample_tours:
        cursor.execute("""
            INSERT OR IGNORE INTO tours (title, description, price, duration_days, max_participants)
            VALUES (?, ?, ?, ?, ?)
        """, tour)
    
    conn.commit()
    conn.close()
    print("✅ SQLite database setup complete")
    return str(db_path)

def create_simplified_app():
    """Create a simplified FastAPI app for development"""
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel
    from datetime import datetime
    from typing import List, Optional
    
    app = FastAPI(
        title="Spirit Tours API - Development Mode",
        description="Simplified API for development and testing",
        version="1.0.0-dev"
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Models
    class Tour(BaseModel):
        id: Optional[int] = None
        title: str
        description: str
        price: float
        duration_days: int
        max_participants: int
    
    class Booking(BaseModel):
        tour_id: int
        booking_date: str
        participants: int
    
    class User(BaseModel):
        email: str
        username: str
        password: str
        full_name: str
    
    # Routes
    @app.get("/")
    async def root():
        return {
            "message": "Spirit Tours API - Development Mode",
            "status": "running",
            "endpoints": {
                "docs": "/docs",
                "tours": "/api/v1/tours",
                "bookings": "/api/v1/bookings",
                "health": "/health"
            }
        }
    
    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "api": "running",
                "database": "sqlite (dev mode)",
                "cache": "memory (dev mode)"
            }
        }
    
    @app.get("/api/v1/tours", response_model=List[Tour])
    async def get_tours():
        """Get all available tours"""
        conn = sqlite3.connect("spirit_tours_dev.db")
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, description, price, duration_days, max_participants FROM tours WHERE is_active = 1")
        tours = cursor.fetchall()
        conn.close()
        
        return [
            Tour(
                id=t[0],
                title=t[1],
                description=t[2],
                price=t[3],
                duration_days=t[4],
                max_participants=t[5]
            ) for t in tours
        ]
    
    @app.get("/api/v1/tours/{tour_id}")
    async def get_tour(tour_id: int):
        """Get specific tour details"""
        conn = sqlite3.connect("spirit_tours_dev.db")
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, description, price, duration_days, max_participants FROM tours WHERE id = ?",
            (tour_id,)
        )
        tour = cursor.fetchone()
        conn.close()
        
        if not tour:
            raise HTTPException(status_code=404, detail="Tour not found")
        
        return Tour(
            id=tour[0],
            title=tour[1],
            description=tour[2],
            price=tour[3],
            duration_days=tour[4],
            max_participants=tour[5]
        )
    
    @app.post("/api/v1/bookings")
    async def create_booking(booking: Booking):
        """Create a new booking"""
        conn = sqlite3.connect("spirit_tours_dev.db")
        cursor = conn.cursor()
        
        # Check if tour exists
        cursor.execute("SELECT price FROM tours WHERE id = ?", (booking.tour_id,))
        tour = cursor.fetchone()
        if not tour:
            conn.close()
            raise HTTPException(status_code=404, detail="Tour not found")
        
        total_price = tour[0] * booking.participants
        
        cursor.execute("""
            INSERT INTO bookings (user_id, tour_id, booking_date, participants, total_price, status)
            VALUES (1, ?, ?, ?, ?, 'confirmed')
        """, (booking.tour_id, booking.booking_date, booking.participants, total_price))
        
        booking_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "booking_id": booking_id,
            "status": "confirmed",
            "total_price": total_price,
            "message": "Booking created successfully"
        }
    
    @app.get("/api/v1/bookings")
    async def get_bookings():
        """Get all bookings"""
        conn = sqlite3.connect("spirit_tours_dev.db")
        cursor = conn.cursor()
        cursor.execute("""
            SELECT b.id, b.booking_date, b.participants, b.total_price, b.status,
                   t.title, t.description
            FROM bookings b
            JOIN tours t ON b.tour_id = t.id
            ORDER BY b.created_at DESC
        """)
        bookings = cursor.fetchall()
        conn.close()
        
        return [
            {
                "id": b[0],
                "booking_date": b[1],
                "participants": b[2],
                "total_price": b[3],
                "status": b[4],
                "tour_title": b[5],
                "tour_description": b[6]
            } for b in bookings
        ]
    
    @app.get("/api/v1/stats")
    async def get_stats():
        """Get system statistics"""
        conn = sqlite3.connect("spirit_tours_dev.db")
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM tours WHERE is_active = 1")
        total_tours = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM bookings")
        total_bookings = cursor.fetchone()[0]
        
        cursor.execute("SELECT SUM(total_price) FROM bookings WHERE status = 'confirmed'")
        total_revenue = cursor.fetchone()[0] or 0
        
        conn.close()
        
        return {
            "total_tours": total_tours,
            "total_bookings": total_bookings,
            "total_revenue": total_revenue,
            "active_users": 1,  # Simplified for dev
            "system_status": "operational"
        }
    
    return app

if __name__ == "__main__":
    print("🚀 Spirit Tours Development Server Starter")
    print("-" * 40)
    
    # Setup database
    db_path = setup_sqlite_database()
    print(f"📁 Database: {db_path}")
    
    # Create app
    app = create_simplified_app()
    
    # Run server
    import uvicorn
    print("\n🌐 Starting development server...")
    print("📍 API: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    print("🔧 Development mode with SQLite database")
    print("\n✨ Server is ready for development!")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)