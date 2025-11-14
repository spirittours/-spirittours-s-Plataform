"""
Database Connection Management
Handles SQLAlchemy engine, sessions, and database lifecycle
"""

import os
import logging
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from contextlib import contextmanager

from .models import Base

# Configure logging
logger = logging.getLogger(__name__)

# Database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://spirittours:spirit2024@localhost:5432/spirittours_db"
)

# For development, allow SQLite fallback
if os.getenv("USE_SQLITE", "false").lower() == "true":
    DATABASE_URL = "sqlite:///./spirittours.db"
    logger.warning("⚠️  Using SQLite for development (set USE_SQLITE=false for PostgreSQL)")

# Engine configuration
ENGINE_OPTIONS = {
    "echo": os.getenv("DB_ECHO", "false").lower() == "true",
    "pool_pre_ping": True,  # Verify connections before using
}

# Add pool settings for PostgreSQL (not needed for SQLite)
if not DATABASE_URL.startswith("sqlite"):
    ENGINE_OPTIONS.update({
        "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
        "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "3600")),  # 1 hour
    })
else:
    # SQLite-specific settings
    ENGINE_OPTIONS.update({
        "connect_args": {"check_same_thread": False},
        "poolclass": NullPool,
    })

# Create engine
engine = create_engine(DATABASE_URL, **ENGINE_OPTIONS)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# Database dependency for FastAPI
def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency to get database session
    
    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            items = db.query(Item).all()
            return items
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Context manager for database sessions
@contextmanager
def db_session():
    """
    Context manager for database sessions
    
    Usage:
        with db_session() as db:
            user = db.query(User).first()
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Database error: {str(e)}")
        raise
    finally:
        session.close()


def create_tables():
    """Create all database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")
    except Exception as e:
        logger.error(f"❌ Error creating tables: {str(e)}")
        raise


def drop_tables():
    """Drop all database tables (use with caution!)"""
    try:
        Base.metadata.drop_all(bind=engine)
        logger.warning("⚠️  All database tables dropped")
    except Exception as e:
        logger.error(f"❌ Error dropping tables: {str(e)}")
        raise


def init_db():
    """
    Initialize database
    Creates tables and can seed initial data
    """
    try:
        logger.info("🔧 Initializing database...")
        
        # Create all tables
        create_tables()
        
        # Test connection
        with db_session() as db:
            db.execute("SELECT 1")
        
        logger.info("✅ Database initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {str(e)}")
        return False


# Connection event listeners for logging
@event.listens_for(engine, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Log successful connections"""
    logger.debug("🔌 Database connection established")


@event.listens_for(engine, "close")
def receive_close(dbapi_conn, connection_record):
    """Log connection closures"""
    logger.debug("🔌 Database connection closed")


# Export public API
__all__ = [
    'engine',
    'SessionLocal',
    'get_db',
    'db_session',
    'create_tables',
    'drop_tables',
    'init_db',
]
