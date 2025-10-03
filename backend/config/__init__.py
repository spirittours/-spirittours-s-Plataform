#!/usr/bin/env python3
"""
Configuration package for Spirit Tours
Paquete de configuración del sistema
"""

from .database import (
    engine,
    SessionLocal,
    Base,
    get_db,
    get_db_context,
    DatabaseManager,
    db_config
)

from .settings import (
    settings,
    business_config,
    get_settings,
    DATABASE_URL,
    SECRET_KEY,
    ENVIRONMENT,
    DEBUG
)

__all__ = [
    # Database
    'engine',
    'SessionLocal',
    'Base',
    'get_db',
    'get_db_context', 
    'DatabaseManager',
    'db_config',
    
    # Settings
    'settings',
    'business_config',
    'get_settings',
    'DATABASE_URL',
    'SECRET_KEY',
    'ENVIRONMENT',
    'DEBUG'
]