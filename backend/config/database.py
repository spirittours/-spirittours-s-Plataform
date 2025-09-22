#!/usr/bin/env python3
"""
Database Configuration for Spirit Tours
Configuración completa de base de datos con soporte B2C/B2B/B2B2C
"""

import os
from typing import Generator, Optional
from sqlalchemy import create_engine, MetaData, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import logging
from contextlib import contextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment-based configuration
class DatabaseConfig:
    """Database configuration class"""
    
    def __init__(self):
        # Database URL from environment or default
        self.database_url = os.getenv(
            "DATABASE_URL", 
            "postgresql://spirittours:spirit2024@localhost:5432/spirittours_db"
        )
        
        # Connection settings
        self.echo_sql = os.getenv("DB_ECHO", "false").lower() == "true"
        self.pool_size = int(os.getenv("DB_POOL_SIZE", "5"))
        self.max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "10"))
        self.pool_timeout = int(os.getenv("DB_POOL_TIMEOUT", "30"))
        self.pool_recycle = int(os.getenv("DB_POOL_RECYCLE", "3600"))  # 1 hour
        
        # Test database
        self.test_database_url = os.getenv(
            "TEST_DATABASE_URL",
            "sqlite:///./test_spirittours.db"
        )
        
        # Environment detection
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.is_production = self.environment == "production"
        self.is_testing = os.getenv("TESTING", "false").lower() == "true"

# Global configuration instance
db_config = DatabaseConfig()

# Create engine based on environment
if db_config.is_testing:
    # Use SQLite for testing
    engine = create_engine(
        db_config.test_database_url,
        echo=db_config.echo_sql,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False}
    )
else:
    # Use PostgreSQL for development/production
    engine = create_engine(
        db_config.database_url,
        echo=db_config.echo_sql,
        pool_size=db_config.pool_size,
        max_overflow=db_config.max_overflow,
        pool_timeout=db_config.pool_timeout,
        pool_recycle=db_config.pool_recycle,
        # Connection args for PostgreSQL
        connect_args={
            "options": "-c timezone=UTC",
            "application_name": "SpiritTours_CRM"
        }
    )

# Session configuration
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Keep objects usable after commit
)

# Declarative base - Import and use existing models
try:
    from ..models.rbac_models import Base
    from ..models.business_models import Base as BusinessBase
    # Ensure both models use the same metadata
    metadata = Base.metadata
except ImportError:
    # Fallback if models are not available yet
    Base = declarative_base()
    metadata = Base.metadata

# Event listeners for database optimization
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Set SQLite pragmas for better performance (testing only)"""
    if "sqlite" in str(engine.url):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.execute("PRAGMA mmap_size=268435456")  # 256MB
        cursor.close()

@event.listens_for(engine, "connect")
def set_postgresql_settings(dbapi_connection, connection_record):
    """Set PostgreSQL connection settings"""
    if "postgresql" in str(engine.url):
        # Set timezone and other settings
        with dbapi_connection.cursor() as cursor:
            cursor.execute("SET timezone TO 'UTC'")
            cursor.execute("SET statement_timeout = '30s'")
            cursor.execute("SET lock_timeout = '10s'")

# Database dependency for FastAPI
def get_db() -> Generator[Session, None, None]:
    """
    Database dependency for FastAPI endpoints
    Provides a database session and ensures proper cleanup
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

# Context manager for database operations
@contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """
    Context manager for database operations
    Use this for operations outside of FastAPI endpoints
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        logger.error(f"Database operation error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

# Database utilities
class DatabaseManager:
    """Database management utilities"""
    
    @staticmethod
    def create_all_tables():
        """Create all database tables"""
        try:
            metadata.create_all(bind=engine)
            logger.info("Successfully created all database tables")
            return True
        except Exception as e:
            logger.error(f"Failed to create tables: {str(e)}")
            return False
    
    @staticmethod
    def drop_all_tables():
        """Drop all database tables (USE WITH CAUTION)"""
        try:
            metadata.drop_all(bind=engine)
            logger.info("Successfully dropped all database tables")
            return True
        except Exception as e:
            logger.error(f"Failed to drop tables: {str(e)}")
            return False
    
    @staticmethod
    def check_connection() -> bool:
        """Test database connection"""
        try:
            with engine.connect() as conn:
                conn.execute("SELECT 1")
            logger.info("Database connection successful")
            return True
        except Exception as e:
            logger.error(f"Database connection failed: {str(e)}")
            return False
    
    @staticmethod
    def get_table_info():
        """Get information about existing tables"""
        try:
            with engine.connect() as conn:
                inspector = engine.dialect.get_inspector(conn)
                tables = inspector.get_table_names()
            
            table_info = {}
            for table_name in tables:
                with engine.connect() as conn:
                    inspector = engine.dialect.get_inspector(conn)
                    columns = inspector.get_columns(table_name)
                    table_info[table_name] = [col['name'] for col in columns]
            
            return table_info
        except Exception as e:
            logger.error(f"Failed to get table info: {str(e)}")
            return {}
    
    @staticmethod 
    def initialize_database():
        """Initialize database with default data"""
        try:
            # Create tables
            DatabaseManager.create_all_tables()
            
            # Check if we need to create initial data
            with get_db_context() as db:
                # Import models
                from ..models.rbac_models import User, Role, Permission, Branch, UserLevel, PermissionScope
                from ..models.business_models import TourOperator, TravelAgency
                
                # Check if admin user exists
                admin_user = db.query(User).filter(User.username == "admin").first()
                if not admin_user:
                    logger.info("Creating initial admin user and data...")
                    DatabaseManager._create_initial_data(db)
                else:
                    logger.info("Database already initialized")
            
            return True
        except Exception as e:
            logger.error(f"Database initialization failed: {str(e)}")
            return False
    
    @staticmethod
    def _create_initial_data(db: Session):
        """Create initial system data"""
        from ..models.rbac_models import User, Role, Permission, Branch, UserLevel, PermissionScope
        from werkzeug.security import generate_password_hash
        import uuid
        
        # Create headquarters branch
        hq_branch = Branch(
            name="Spirit Tours Headquarters",
            code="HQ001",
            country="España",
            city="Madrid", 
            is_headquarters=True,
            is_active=True
        )
        db.add(hq_branch)
        db.flush()  # Get the ID
        
        # Create admin role
        admin_role = Role(
            name="Super Administrator",
            description="Full system access",
            level=UserLevel.SUPER_ADMINISTRATOR,
            hierarchy_level=100,
            is_system_role=True
        )
        db.add(admin_role)
        
        # Create admin user
        admin_user = User(
            username="admin",
            email="admin@spirittours.com",
            password_hash=generate_password_hash("Spirit2024!"),
            first_name="System",
            last_name="Administrator",
            phone="+34-600-000-000",
            is_active=True,
            is_verified=True,
            branch_id=hq_branch.id
        )
        db.add(admin_user)
        db.flush()
        
        # Assign admin role
        admin_user.roles.append(admin_role)
        
        # Create basic permissions
        basic_permissions = [
            ("user_management", "Full user management access", PermissionScope.USER_MANAGEMENT, "manage", "users"),
            ("booking_management", "Full booking management", PermissionScope.BOOKING_MANAGEMENT, "manage", "bookings"),
            ("analytics_access", "Analytics dashboard access", PermissionScope.ANALYTICS_DASHBOARD, "read", "analytics"),
            ("financial_reports", "Financial reports access", PermissionScope.FINANCIAL_REPORTS, "read", "reports"),
        ]
        
        for name, desc, scope, action, resource in basic_permissions:
            permission = Permission(
                name=name,
                description=desc,
                scope=scope,
                action=action,
                resource=resource
            )
            db.add(permission)
            admin_role.permissions.append(permission)
        
        db.commit()
        logger.info("Initial system data created successfully")

# Export main components
__all__ = [
    'engine',
    'SessionLocal', 
    'Base',
    'get_db',
    'get_db_context',
    'DatabaseManager',
    'db_config'
]

# Initialize database on import if needed
if not db_config.is_testing:
    # Only initialize in development/production, not during testing
    if DatabaseManager.check_connection():
        logger.info("Database connection verified")
    else:
        logger.warning("Database connection could not be verified")