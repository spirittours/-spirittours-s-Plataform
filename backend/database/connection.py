"""
Database Connection Manager for Spirit Tours
PostgreSQL with SQLAlchemy and connection pooling
"""

import os
import logging
from typing import Generator, Optional
from contextlib import contextmanager
from sqlalchemy import create_engine, event, pool
from sqlalchemy.orm import sessionmaker, Session, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import NullPool, QueuePool
import psycopg2
from datetime import datetime

logger = logging.getLogger(__name__)

# Base para modelos
Base = declarative_base()

class DatabaseConfig:
    """Configuración de base de datos"""
    
    def __init__(self):
        # Obtener configuración del entorno
        self.database_url = os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:password@localhost:5432/spirit_tours"
        )
        
        # Configuración alternativa por componentes
        if not os.getenv("DATABASE_URL"):
            self.host = os.getenv("DB_HOST", "localhost")
            self.port = os.getenv("DB_PORT", "5432")
            self.database = os.getenv("DB_NAME", "spirit_tours")
            self.username = os.getenv("DB_USER", "postgres")
            self.password = os.getenv("DB_PASSWORD", "password")
            
            self.database_url = (
                f"postgresql://{self.username}:{self.password}@"
                f"{self.host}:{self.port}/{self.database}"
            )
        
        # Configuración del pool
        self.pool_size = int(os.getenv("DB_POOL_SIZE", "20"))
        self.max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "40"))
        self.pool_timeout = int(os.getenv("DB_POOL_TIMEOUT", "30"))
        self.pool_recycle = int(os.getenv("DB_POOL_RECYCLE", "3600"))
        
        # Configuración de rendimiento
        self.echo = os.getenv("DB_ECHO", "false").lower() == "true"
        self.echo_pool = os.getenv("DB_ECHO_POOL", "false").lower() == "true"
        
    def get_engine_kwargs(self):
        """Obtener kwargs para crear el engine"""
        return {
            "echo": self.echo,
            "echo_pool": self.echo_pool,
            "poolclass": QueuePool,
            "pool_size": self.pool_size,
            "max_overflow": self.max_overflow,
            "pool_timeout": self.pool_timeout,
            "pool_recycle": self.pool_recycle,
            "pool_pre_ping": True,  # Verificar conexión antes de usar
            "connect_args": {
                "connect_timeout": 10,
                "application_name": "spirit_tours_api",
                "options": "-c statement_timeout=30000"  # 30 segundos timeout
            }
        }


class DatabaseManager:
    """
    Gestor principal de conexiones a base de datos
    """
    
    def __init__(self, config: Optional[DatabaseConfig] = None):
        """Inicializar gestor de base de datos"""
        self.config = config or DatabaseConfig()
        self._engine = None
        self._session_factory = None
        self._scoped_session = None
        
    @property
    def engine(self):
        """Obtener o crear engine de SQLAlchemy"""
        if self._engine is None:
            self._engine = create_engine(
                self.config.database_url,
                **self.config.get_engine_kwargs()
            )
            
            # Configurar eventos del engine
            self._setup_engine_events()
            
            logger.info(f"Database engine created: {self.config.database_url.split('@')[1]}")
            
        return self._engine
    
    @property
    def session_factory(self):
        """Obtener factory de sesiones"""
        if self._session_factory is None:
            self._session_factory = sessionmaker(
                bind=self.engine,
                autocommit=False,
                autoflush=False,
                expire_on_commit=False
            )
            logger.info("Session factory created")
            
        return self._session_factory
    
    @property
    def scoped_session(self):
        """Obtener sesión con scope (thread-safe)"""
        if self._scoped_session is None:
            self._scoped_session = scoped_session(self.session_factory)
            
        return self._scoped_session
    
    def _setup_engine_events(self):
        """Configurar eventos del engine para logging y monitoreo"""
        
        @event.listens_for(self.engine, "connect")
        def receive_connect(dbapi_conn, connection_record):
            """Evento al establecer conexión"""
            connection_record.info['connect_time'] = datetime.now()
            logger.debug("New database connection established")
            
        @event.listens_for(self.engine, "checkout")
        def receive_checkout(dbapi_conn, connection_record, connection_proxy):
            """Evento al obtener conexión del pool"""
            # Calcular tiempo en el pool
            if 'connect_time' in connection_record.info:
                age = (datetime.now() - connection_record.info['connect_time']).seconds
                if age > 3600:  # Más de 1 hora
                    logger.warning(f"Long-lived connection detected: {age} seconds")
                    
        @event.listens_for(self.engine, "checkin")
        def receive_checkin(dbapi_conn, connection_record):
            """Evento al devolver conexión al pool"""
            connection_record.info['last_checkin'] = datetime.now()
            
    def get_session(self) -> Session:
        """
        Obtener nueva sesión de base de datos
        
        Returns:
            Session: Nueva sesión de SQLAlchemy
        """
        return self.session_factory()
    
    @contextmanager
    def session_scope(self):
        """
        Context manager para manejo automático de sesiones
        
        Usage:
            with db_manager.session_scope() as session:
                # hacer operaciones con session
                session.query(Model).all()
        """
        session = self.get_session()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()
            
    def create_all_tables(self):
        """Crear todas las tablas en la base de datos"""
        try:
            # Importar todos los modelos para registrarlos
            from ..models.quotation import (
                GroupQuotation, QuotationResponse, 
                HotelProvider, Company, User
            )
            
            Base.metadata.create_all(bind=self.engine)
            logger.info("All database tables created successfully")
            
        except Exception as e:
            logger.error(f"Error creating tables: {e}")
            raise
            
    def drop_all_tables(self):
        """Eliminar todas las tablas (¡PELIGROSO!)"""
        try:
            Base.metadata.drop_all(bind=self.engine)
            logger.warning("All database tables dropped")
            
        except Exception as e:
            logger.error(f"Error dropping tables: {e}")
            raise
            
    def test_connection(self) -> bool:
        """
        Probar conexión a la base de datos
        
        Returns:
            bool: True si la conexión es exitosa
        """
        try:
            with self.engine.connect() as conn:
                result = conn.execute("SELECT 1")
                result.fetchone()
                logger.info("Database connection test successful")
                return True
                
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
            
    def get_connection_stats(self) -> dict:
        """
        Obtener estadísticas del pool de conexiones
        
        Returns:
            dict: Estadísticas del pool
        """
        pool = self.engine.pool
        
        return {
            "size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "total": pool.size() + pool.overflow()
        }
        
    def close(self):
        """Cerrar todas las conexiones y limpiar recursos"""
        if self._scoped_session:
            self._scoped_session.remove()
            
        if self._engine:
            self._engine.dispose()
            logger.info("Database connections closed")
            
    def __enter__(self):
        """Entrada del context manager"""
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Salida del context manager"""
        self.close()


# Instancia global del manager
db_manager = DatabaseManager()


# Dependency para FastAPI
def get_db() -> Generator[Session, None, None]:
    """
    Dependency de FastAPI para obtener sesión de DB
    
    Usage:
        @router.get("/")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = db_manager.get_session()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# Funciones de utilidad
def init_database():
    """Inicializar base de datos con tablas y datos iniciales"""
    try:
        # Probar conexión
        if not db_manager.test_connection():
            raise ConnectionError("Cannot connect to database")
            
        # Crear tablas
        db_manager.create_all_tables()
        
        # Insertar datos iniciales si es necesario
        with db_manager.session_scope() as session:
            # Verificar si hay datos
            from ..models.quotation import Company
            
            company_count = session.query(Company).count()
            if company_count == 0:
                logger.info("Inserting initial data...")
                _insert_initial_data(session)
                
        logger.info("Database initialization complete")
        return True
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False


def _insert_initial_data(session: Session):
    """Insertar datos iniciales en la base de datos"""
    from ..models.quotation import Company, User
    from werkzeug.security import generate_password_hash
    
    try:
        # Crear empresa de prueba
        demo_company = Company(
            id="CMP-DEMO001",
            name="Demo Travel Agency",
            type="B2B",
            email="demo@spirittours.com",
            phone="+1-800-DEMO",
            address="123 Demo Street, Miami, FL",
            tax_id="12-3456789",
            is_active=True
        )
        session.add(demo_company)
        
        # Crear usuario administrador
        admin_user = User(
            id="USR-ADMIN001",
            company_id="CMP-DEMO001",
            email="admin@spirittours.com",
            password_hash=generate_password_hash("admin123"),
            first_name="Admin",
            last_name="System",
            role="admin",
            is_active=True
        )
        session.add(admin_user)
        
        # Crear usuario de prueba B2B
        demo_user = User(
            id="USR-DEMO001",
            company_id="CMP-DEMO001",
            email="demo@spirittours.com",
            password_hash=generate_password_hash("demo123"),
            first_name="Demo",
            last_name="User",
            role="client",
            is_active=True
        )
        session.add(demo_user)
        
        session.commit()
        logger.info("Initial data inserted successfully")
        
    except Exception as e:
        logger.error(f"Error inserting initial data: {e}")
        raise


# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)