#!/usr/bin/env python3
"""
Setup Enterprise System
Initialize complete enterprise RBAC system with all departments
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from backend.database import get_db_session, engine
from backend.models.rbac_models import Base
from backend.database.init_rbac_expanded import initialize_enterprise_rbac_system

def main():
    """Setup complete enterprise system"""
    print("🚀 Setting up Spirit Tours Enterprise System...")
    print("="*80)
    
    # Create database tables
    print("📦 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created")
    
    # Initialize enterprise RBAC system
    print("\n🏢 Initializing Enterprise RBAC System...")
    db = next(get_db_session())
    try:
        initialize_enterprise_rbac_system(db)
        print("✅ Enterprise system initialized successfully!")
    except Exception as e:
        print(f"❌ Error initializing enterprise system: {e}")
        db.rollback()
        raise
    finally:
        db.close()
    
    print("\n🎉 Enterprise system setup completed!")
    print("🌐 Access the system at: http://localhost:3000")
    print("📖 Check the login page for all available demo accounts")

if __name__ == "__main__":
    main()