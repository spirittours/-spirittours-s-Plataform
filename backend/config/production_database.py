"""
Production Database Configuration
Configuración optimizada para ambiente de producción con high availability
"""

import os
import logging
from typing import Dict, Any, Optional
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from contextlib import asynccontextmanager, contextmanager
import asyncpg
import asyncio
from datetime import datetime, timedelta

# Configure logging
logger = logging.getLogger(__name__)

class ProductionDatabaseConfig:
    """
    Configuration for production database with:
    - Connection pooling optimized for high load
    - Read/Write splitting for performance
    - Backup and recovery configuration  
    - Health monitoring and metrics
    """
    
    def __init__(self):
        # Database URLs
        self.primary_db_url = os.getenv(
            "DATABASE_URL", 
            "postgresql://spirittours_user:secure_password@localhost:5432/spirittours_prod"
        )
        self.read_replica_urls = [
            os.getenv("READ_REPLICA_1", "postgresql://spirittours_user:secure_password@replica1:5432/spirittours_prod"),
            os.getenv("READ_REPLICA_2", "postgresql://spirittours_user:secure_password@replica2:5432/spirittours_prod"),
        ]
        
        # Connection Pool Configuration
        self.pool_config = {
            "pool_size": 20,          # Base connections
            "max_overflow": 40,       # Additional connections under load
            "pool_timeout": 30,       # Timeout to get connection
            "pool_recycle": 3600,     # Recycle connections every hour
            "pool_pre_ping": True,    # Validate connections
        }
        
        # Performance Configuration
        self.engine_config = {
            "echo": False,
            "future": True,
            "pool_class": QueuePool,
            "connect_args": {
                "connect_timeout": 10,
                "command_timeout": 60,
                "server_settings": {
                    "jit": "off",  # Disable JIT for predictable performance
                    "application_name": "SpiritTours_App"
                }
            }
        }
        
        # Initialize engines
        self.primary_engine = None
        self.read_engines = []
        self.session_factory = None
        self.read_session_factories = []
        
        # Health monitoring
        self.health_stats = {
            "primary_healthy": False,
            "read_replicas_healthy": [],
            "last_health_check": None,
            "connection_errors": 0,
            "query_performance": []
        }
    
    def initialize_engines(self) -> bool:
        """Initialize database engines with optimized configuration"""
        try:
            logger.info("🔄 Initializing production database engines...")
            
            # Primary (Write) Engine
            self.primary_engine = create_engine(
                self.primary_db_url,
                **self.pool_config,
                **self.engine_config
            )
            
            # Read Replica Engines
            for i, replica_url in enumerate(self.read_replica_urls):
                try:
                    read_engine = create_engine(
                        replica_url,
                        **self.pool_config,
                        **self.engine_config
                    )
                    self.read_engines.append(read_engine)
                    logger.info(f"✅ Read replica {i+1} engine initialized")
                except Exception as e:
                    logger.warning(f"⚠️ Read replica {i+1} failed to initialize: {e}")
            
            # Session Factories
            self.session_factory = sessionmaker(
                bind=self.primary_engine,
                expire_on_commit=False,
                autoflush=True,
                autocommit=False
            )
            
            for engine in self.read_engines:
                read_factory = sessionmaker(
                    bind=engine,
                    expire_on_commit=False,
                    autoflush=False,
                    autocommit=False
                )
                self.read_session_factories.append(read_factory)
            
            logger.info("✅ Database engines initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize database engines: {e}")
            return False
    
    @contextmanager
    def get_write_session(self):
        """Get write session (primary database)"""
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"❌ Write session error: {e}")
            raise
        finally:
            session.close()
    
    @contextmanager
    def get_read_session(self):
        """Get read session (read replica with load balancing)"""
        if not self.read_session_factories:
            # Fallback to primary if no read replicas
            session = self.session_factory()
        else:
            # Round-robin load balancing for read replicas
            factory_index = len(self.health_stats["query_performance"]) % len(self.read_session_factories)
            factory = self.read_session_factories[factory_index]
            session = factory()
        
        try:
            yield session
        except Exception as e:
            logger.error(f"❌ Read session error: {e}")
            # Try fallback to primary for reads
            if self.read_session_factories:  # If we were using replica
                primary_session = self.session_factory()
                try:
                    yield primary_session
                finally:
                    primary_session.close()
            else:
                raise
        finally:
            session.close()
    
    async def check_database_health(self) -> Dict[str, Any]:
        """Comprehensive database health check"""
        health_results = {
            "primary_status": "unknown",
            "read_replicas": [],
            "performance_metrics": {},
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            # Check Primary Database
            start_time = datetime.now()
            with self.get_write_session() as session:
                result = session.execute(text("SELECT 1 as health_check"))
                health_check = result.fetchone()
                
                if health_check and health_check[0] == 1:
                    response_time = (datetime.now() - start_time).total_seconds()
                    health_results["primary_status"] = "healthy"
                    health_results["performance_metrics"]["primary_response_time"] = response_time
                    self.health_stats["primary_healthy"] = True
                    
                    # Additional health checks
                    health_results["performance_metrics"].update(
                        await self._get_detailed_metrics(session)
                    )
                else:
                    health_results["primary_status"] = "unhealthy"
                    self.health_stats["primary_healthy"] = False
        
        except Exception as e:
            logger.error(f"❌ Primary database health check failed: {e}")
            health_results["primary_status"] = "error"
            health_results["error"] = str(e)
            self.health_stats["primary_healthy"] = False
        
        # Check Read Replicas
        for i, factory in enumerate(self.read_session_factories):
            replica_health = {"replica_id": i + 1, "status": "unknown"}
            
            try:
                start_time = datetime.now()
                session = factory()
                
                result = session.execute(text("SELECT 1 as health_check"))
                health_check = result.fetchone()
                
                if health_check and health_check[0] == 1:
                    response_time = (datetime.now() - start_time).total_seconds()
                    replica_health["status"] = "healthy"
                    replica_health["response_time"] = response_time
                else:
                    replica_health["status"] = "unhealthy"
                    
                session.close()
                
            except Exception as e:
                replica_health["status"] = "error"
                replica_health["error"] = str(e)
            
            health_results["read_replicas"].append(replica_health)
        
        self.health_stats["last_health_check"] = datetime.now()
        return health_results
    
    async def _get_detailed_metrics(self, session: Session) -> Dict[str, Any]:
        """Get detailed database performance metrics"""
        metrics = {}
        
        try:
            # Connection counts
            result = session.execute(text("""
                SELECT state, count(*) 
                FROM pg_stat_activity 
                WHERE datname = current_database() 
                GROUP BY state
            """))
            
            connection_states = dict(result.fetchall())
            metrics["active_connections"] = connection_states.get("active", 0)
            metrics["idle_connections"] = connection_states.get("idle", 0)
            
            # Database size
            result = session.execute(text("""
                SELECT pg_size_pretty(pg_database_size(current_database())) as db_size
            """))
            db_size = result.fetchone()
            metrics["database_size"] = db_size[0] if db_size else "unknown"
            
            # Query performance
            result = session.execute(text("""
                SELECT 
                    calls,
                    total_time / calls as avg_time_ms,
                    query
                FROM pg_stat_statements 
                WHERE calls > 10 
                ORDER BY total_time DESC 
                LIMIT 5
            """))
            
            slow_queries = []
            for row in result.fetchall():
                slow_queries.append({
                    "calls": row[0],
                    "avg_time_ms": float(row[1]),
                    "query": row[2][:100] + "..." if len(row[2]) > 100 else row[2]
                })
            
            metrics["slow_queries"] = slow_queries
            
        except Exception as e:
            logger.warning(f"⚠️ Could not get detailed metrics: {e}")
            metrics["error"] = "Detailed metrics unavailable"
        
        return metrics
    
    async def setup_database_schema(self) -> bool:
        """Set up database schema and indexes for production"""
        try:
            logger.info("🔄 Setting up production database schema...")
            
            with self.get_write_session() as session:
                # Create extensions
                extensions = [
                    "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"",
                    "CREATE EXTENSION IF NOT EXISTS \"pg_stat_statements\"",
                    "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\"",  # For text search
                    "CREATE EXTENSION IF NOT EXISTS \"btree_gin\"",  # For composite indexes
                ]
                
                for ext in extensions:
                    try:
                        session.execute(text(ext))
                        logger.info(f"✅ Extension created: {ext}")
                    except Exception as e:
                        logger.warning(f"⚠️ Extension creation failed: {e}")
                
                # Performance optimization settings
                optimizations = [
                    "SET shared_preload_libraries = 'pg_stat_statements'",
                    "SET track_activity_query_size = 2048",
                    "SET log_min_duration_statement = 1000",  # Log slow queries
                ]
                
                for opt in optimizations:
                    try:
                        session.execute(text(opt))
                    except Exception as e:
                        logger.warning(f"⚠️ Optimization setting failed: {e}")
                
                session.commit()
            
            logger.info("✅ Database schema setup completed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Database schema setup failed: {e}")
            return False
    
    def get_connection_string(self, for_read: bool = False) -> str:
        """Get connection string for external tools"""
        if for_read and self.read_replica_urls:
            return self.read_replica_urls[0]
        return self.primary_db_url
    
    async def backup_database(self, backup_path: str) -> bool:
        """Create database backup"""
        try:
            import subprocess
            
            backup_filename = f"spirittours_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
            full_backup_path = f"{backup_path}/{backup_filename}"
            
            # Use pg_dump for backup
            cmd = [
                "pg_dump",
                self.primary_db_url,
                "-f", full_backup_path,
                "--verbose",
                "--no-owner",
                "--no-privileges"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"✅ Database backup created: {full_backup_path}")
                
                # Compress backup
                compress_cmd = ["gzip", full_backup_path]
                subprocess.run(compress_cmd)
                
                return True
            else:
                logger.error(f"❌ Backup failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Backup process failed: {e}")
            return False

# Global production database configuration
prod_db_config = ProductionDatabaseConfig()

# Database connection utilities
def get_db_write():
    """Dependency injection for write database sessions"""
    with prod_db_config.get_write_session() as session:
        yield session

def get_db_read():
    """Dependency injection for read database sessions"""
    with prod_db_config.get_read_session() as session:
        yield session

async def initialize_production_database():
    """Initialize production database system"""
    logger.info("🚀 Initializing production database system...")
    
    # Initialize engines
    if not prod_db_config.initialize_engines():
        return False
    
    # Setup schema
    if not await prod_db_config.setup_database_schema():
        return False
    
    # Initial health check
    health = await prod_db_config.check_database_health()
    logger.info(f"📊 Database health: {health['primary_status']}")
    
    return True