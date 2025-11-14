"""
Database Module - PostgreSQL Integration
Provides database connection, session management, and models
"""

from .models import (
    Base,
    User,
    Tour,
    Booking,
    Review,
    Payment,
    EmailLog,
    AnalyticsEvent
)
from .connection import (
    engine,
    SessionLocal,
    get_db,
    init_db,
    create_tables,
    drop_tables
)

__all__ = [
    # Models
    'Base',
    'User',
    'Tour',
    'Booking',
    'Review',
    'Payment',
    'EmailLog',
    'AnalyticsEvent',
    
    # Connection & Session
    'engine',
    'SessionLocal',
    'get_db',
    'init_db',
    'create_tables',
    'drop_tables',
]
