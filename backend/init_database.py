#!/usr/bin/env python3
"""
Database Initialization Script
Creates all tables and optionally seeds initial data
"""

import os
import sys
import logging
from sqlalchemy.exc import OperationalError, ProgrammingError

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.connection import init_db, engine, create_tables
from database.models import Base

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def check_database_connection():
    """
    Check if database is accessible
    """
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ Database connection successful")
        return True
    except OperationalError as e:
        logger.error(f"❌ Database connection failed: {str(e)}")
        logger.error("Please ensure PostgreSQL is running and DATABASE_URL is correct")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error: {str(e)}")
        return False


def create_database_tables():
    """
    Create all database tables
    """
    try:
        logger.info("🔧 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✅ All tables created successfully")
        
        # List created tables
        tables = Base.metadata.tables.keys()
        logger.info(f"📋 Created tables: {', '.join(tables)}")
        
        return True
    except Exception as e:
        logger.error(f"❌ Error creating tables: {str(e)}")
        return False


def seed_initial_data():
    """
    Seed database with initial data (optional)
    """
    try:
        from database.connection import db_session
        from database.models import User, Tour
        from auth.password import get_password_hash
        
        logger.info("🌱 Seeding initial data...")
        
        with db_session() as db:
            # Check if users already exist
            existing_users = db.query(User).count()
            if existing_users > 0:
                logger.info(f"ℹ️  Database already has {existing_users} users, skipping seed")
                return True
            
            # Create admin user
            admin = User(
                email="admin@spirittours.com",
                password_hash=get_password_hash("Admin123!"),
                full_name="System Administrator",
                role="admin",
                is_active=True,
                email_verified=True
            )
            db.add(admin)
            
            # Create test user
            test_user = User(
                email="test@example.com",
                password_hash=get_password_hash("Test123!"),
                full_name="Test User",
                role="customer",
                is_active=True,
                email_verified=True
            )
            db.add(test_user)
            
            logger.info("✅ Initial users created:")
            logger.info("   - admin@spirittours.com (password: Admin123!)")
            logger.info("   - test@example.com (password: Test123!)")
            
        logger.info("✅ Data seeding completed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error seeding data: {str(e)}")
        return False


def main():
    """
    Main initialization function
    """
    logger.info("=" * 60)
    logger.info("🚀 Spirit Tours Database Initialization")
    logger.info("=" * 60)
    
    # Step 1: Check database connection
    logger.info("\n📌 Step 1: Checking database connection...")
    if not check_database_connection():
        logger.error("⚠️  Cannot proceed without database connection")
        logger.info("\nTroubleshooting:")
        logger.info("1. Ensure PostgreSQL is running:")
        logger.info("   - brew services start postgresql (macOS)")
        logger.info("   - sudo systemctl start postgresql (Linux)")
        logger.info("2. Check DATABASE_URL in .env file")
        logger.info("3. Or use SQLite: export USE_SQLITE=true")
        sys.exit(1)
    
    # Step 2: Create tables
    logger.info("\n📌 Step 2: Creating database tables...")
    if not create_database_tables():
        logger.error("⚠️  Failed to create tables")
        sys.exit(1)
    
    # Step 3: Seed initial data (optional)
    logger.info("\n📌 Step 3: Seeding initial data...")
    seed = os.getenv("SEED_DATABASE", "true").lower() == "true"
    
    if seed:
        if not seed_initial_data():
            logger.warning("⚠️  Data seeding failed, but tables are created")
    else:
        logger.info("ℹ️  Skipping data seeding (SEED_DATABASE=false)")
    
    # Final summary
    logger.info("\n" + "=" * 60)
    logger.info("✅ Database initialization completed!")
    logger.info("=" * 60)
    logger.info("\n📝 Next steps:")
    logger.info("1. Start the backend server:")
    logger.info("   uvicorn main:app --reload --port 8000")
    logger.info("2. Access API docs:")
    logger.info("   http://localhost:8000/docs")
    logger.info("3. Test authentication:")
    logger.info("   POST /api/v1/auth/login")
    logger.info("   - Email: test@example.com")
    logger.info("   - Password: Test123!")
    print()  # Empty line


if __name__ == "__main__":
    main()
