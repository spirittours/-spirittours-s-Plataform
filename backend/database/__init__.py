"""
Database module for Spirit Tours
Provides database connection, session management, and utilities
"""

import os
import logging
from typing import Generator
from .connection import DatabaseManager, DatabaseConfig, Base

logger = logging.getLogger(__name__)

# Create global database manager instance
_db_manager = None


def get_db_manager() -> DatabaseManager:
    """
    Get or create the global DatabaseManager instance
    
    Returns:
        DatabaseManager: The global database manager
    """
    global _db_manager
    
    if _db_manager is None:
        _db_manager = DatabaseManager()
        logger.info("Global DatabaseManager instance created")
    
    return _db_manager


def get_db() -> Generator:
    """
    FastAPI dependency for database sessions
    
    Yields:
        Session: SQLAlchemy database session
        
    Usage:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db_manager = get_db_manager()
    session = db_manager.get_session()
    
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Database session error in get_db: {e}")
        raise
    finally:
        session.close()


def init_database():
    """
    Initialize database: create tables if they don't exist
    """
    try:
        db_manager = get_db_manager()
        
        # Test database connection
        with db_manager.session_scope() as session:
            session.execute("SELECT 1")
            logger.info("Database connection test successful")
        
        # Create tables if they don't exist
        # db_manager.create_all_tables()
        # Note: Uncomment above line if you want to auto-create tables
        # In production, use Alembic migrations instead
        
        logger.info("Database initialization complete")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        # Don't raise - allow app to start even if DB is not available
        # The app should handle DB connection errors gracefully


# Export commonly used items
__all__ = [
    'Base',
    'DatabaseManager',
    'DatabaseConfig',
    'get_db',
    'get_db_manager',
    'init_database',
]
