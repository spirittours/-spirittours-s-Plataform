#!/usr/bin/env python3
"""
Database Migration Script for Operations Module
Creates all necessary tables for Operations Control System
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models.operations_models import Base
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_operations_tables():
    """
    Create all operations-related tables
    """
    try:
        # Get database URL from environment
        database_url = os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:5432/webapp_db')
        logger.info(f"Connecting to database...")
        
        # Create engine
        engine = create_engine(database_url)
        
        # Create all tables
        logger.info("Creating operations tables...")
        Base.metadata.create_all(engine)
        
        logger.info("✅ All operations tables created successfully!")
        
        # Print created tables
        inspector = engine.dialect.get_inspector(engine)
        tables = inspector.get_table_names()
        
        logger.info("\n📊 Created tables:")
        operations_tables = [
            'providers',
            'tour_groups',
            'provider_reservations',
            'group_closure_items',
            'validation_logs',
            'operational_alerts',
            'reservation_attachments',
            'group_participants',
            'provider_contracts',
            'notification_logs'
        ]
        
        for table in operations_tables:
            if table in tables:
                logger.info(f"  ✓ {table}")
            else:
                logger.warning(f"  ✗ {table} (not found)")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating tables: {str(e)}")
        return False

def add_sample_data():
    """
    Add sample data for testing
    """
    try:
        from models.operations_models import (
            Provider, ServiceType, TourGroup, OperationalStatus,
            ClosureStatus
        )
        from datetime import datetime, timedelta
        import uuid
        
        database_url = get_database_url()
        engine = create_engine(database_url)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        logger.info("\n📝 Adding sample data...")
        
        # Sample providers
        providers_data = [
            {
                "name": "Hotel Jerusalem Gold",
                "legal_name": "Jerusalem Gold Hotels Ltd",
                "tax_id": "IL123456789",
                "provider_type": ServiceType.HOTEL,
                "email": "reservations@jerusalemgold.com",
                "phone": "+972-2-1234567",
                "address": "King David St, Jerusalem",
                "city": "Jerusalem",
                "country": "Israel",
                "active": True,
                "rating": 4.5
            },
            {
                "name": "Bethlehem Star Hotel",
                "legal_name": "Bethlehem Star Hospitality",
                "tax_id": "PS987654321",
                "provider_type": ServiceType.HOTEL,
                "email": "info@bethlehemstar.ps",
                "phone": "+970-2-7654321",
                "address": "Manger Square, Bethlehem",
                "city": "Bethlehem",
                "country": "Palestine",
                "active": True,
                "rating": 4.3
            },
            {
                "name": "Holy Land Transport",
                "legal_name": "Holy Land Transportation Services",
                "tax_id": "IL555666777",
                "provider_type": ServiceType.TRANSPORT,
                "email": "booking@holylandtransport.com",
                "phone": "+972-3-9876543",
                "address": "Ben Gurion Airport Road",
                "city": "Tel Aviv",
                "country": "Israel",
                "active": True,
                "rating": 4.7
            },
            {
                "name": "Archaeological Sites Authority",
                "legal_name": "Israel Antiquities Authority",
                "tax_id": "IL999888777",
                "provider_type": ServiceType.ENTRANCE,
                "email": "tickets@antiquities.org.il",
                "phone": "+972-2-5555555",
                "address": "Rockefeller Museum, Jerusalem",
                "city": "Jerusalem",
                "country": "Israel",
                "active": True,
                "rating": 4.8
            },
            {
                "name": "Experienced Guides Network",
                "legal_name": "Israel Tour Guides Association",
                "tax_id": "IL444333222",
                "provider_type": ServiceType.GUIDE,
                "email": "guides@tourisrael.com",
                "phone": "+972-3-1111111",
                "address": "HaYarkon St, Tel Aviv",
                "city": "Tel Aviv",
                "country": "Israel",
                "active": True,
                "rating": 4.9
            }
        ]
        
        providers = []
        for data in providers_data:
            provider = Provider(**data)
            session.add(provider)
            providers.append(provider)
        
        session.commit()
        logger.info(f"  ✓ Created {len(providers)} sample providers")
        
        # Sample groups
        today = datetime.utcnow()
        groups_data = [
            {
                "code": "TS-2024-001",
                "name": "Tierra Santa - Enero 2024",
                "client_type": "B2B",
                "client_name": "Agencia de Viajes España",
                "start_date": today + timedelta(days=30),
                "end_date": today + timedelta(days=40),
                "booking_date": today,
                "total_participants": 45,
                "adults": 40,
                "children": 5,
                "operational_status": OperationalStatus.PLANNING,
                "closure_status": ClosureStatus.OPEN,
                "description": "Tour completo por Tierra Santa incluyendo Jerusalem, Belén, Nazaret"
            },
            {
                "code": "TS-2024-002",
                "name": "Peregrinación Pascua 2024",
                "client_type": "B2B",
                "client_name": "Tour Operator México",
                "start_date": today + timedelta(days=60),
                "end_date": today + timedelta(days=72),
                "booking_date": today,
                "total_participants": 30,
                "adults": 28,
                "children": 2,
                "operational_status": OperationalStatus.PLANNING,
                "closure_status": ClosureStatus.OPEN,
                "description": "Peregrinación especial de Pascua"
            }
        ]
        
        groups = []
        for data in groups_data:
            group = TourGroup(**data)
            session.add(group)
            groups.append(group)
        
        session.commit()
        logger.info(f"  ✓ Created {len(groups)} sample groups")
        
        logger.info("\n✅ Sample data added successfully!")
        session.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error adding sample data: {str(e)}")
        if 'session' in locals():
            session.rollback()
            session.close()
        return False

def main():
    """
    Main migration function
    """
    logger.info("=" * 60)
    logger.info("  OPERATIONS MODULE DATABASE MIGRATION")
    logger.info("=" * 60)
    
    # Create tables
    if not create_operations_tables():
        logger.error("\n❌ Migration failed!")
        sys.exit(1)
    
    # Ask if user wants to add sample data
    response = input("\n❓ Add sample data for testing? (y/n): ")
    if response.lower() == 'y':
        add_sample_data()
    
    logger.info("\n" + "=" * 60)
    logger.info("  ✅ MIGRATION COMPLETED SUCCESSFULLY!")
    logger.info("=" * 60)
    logger.info("\nNext steps:")
    logger.info("1. Start the backend server")
    logger.info("2. Access the operations API at /api/operations")
    logger.info("3. Check the documentation at /docs")

if __name__ == "__main__":
    main()