"""
Database core module for Spirit Tours
"""

from sqlalchemy.ext.asyncio import AsyncSession

async def get_db():
    """Mock database session for testing"""
    # This would normally return a real database session
    pass