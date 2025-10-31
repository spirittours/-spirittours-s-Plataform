#!/usr/bin/env python3
"""
Database Migration Script for Operations Module (SQLite Version)
Creates all necessary tables for Operations Control System

NOTE: This version uses SQLite for demonstration purposes.
For production, use PostgreSQL with create_operations_tables.py
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from backend.models.operations_models import Base
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_operations_tables():
    """
    Create all operations-related tables in SQLite
    """
    try:
        # Use SQLite for demo
        db_path = Path(__file__).parent.parent.parent / "operations.db"
        database_url = f"sqlite:///{db_path}"
        logger.info(f"Connecting to SQLite database: {db_path}")
        
        # Create engine
        engine = create_engine(database_url, echo=False)
        
        # Create all tables
        logger.info("Creating operations tables...")
        Base.metadata.create_all(engine)
        
        logger.info("✅ All operations tables created successfully!")
        
        # Print created tables
        inspector = inspect(engine)
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
                logger.warning(f"  ✗ {table} (NOT FOUND)")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating tables: {e}")
        logger.error("\n❌ Migration failed!")
        return False

def add_sample_data():
    """
    Add sample data for testing
    """
    try:
        db_path = Path(__file__).parent.parent.parent / "operations.db"
        database_url = f"sqlite:///{db_path}"
        engine = create_engine(database_url, echo=False)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        logger.info("\n📦 Adding sample data...")
        
        # Import models
        from backend.models.operations_models import (
            Provider, ServiceType, TourGroup, ClosureStatus,
            ProviderReservation, ReservationStatus
        )
        from datetime import datetime, timedelta
        import uuid
        
        # Check if data already exists
        existing_providers = session.query(Provider).count()
        if existing_providers > 0:
            logger.info("⚠️  Sample data already exists. Skipping...")
            session.close()
            return True
        
        # Sample Providers
        providers_data = [
            {
                "name": "Hotel Miramar Resort",
                "provider_type": ServiceType.HOTEL,
                "contact_name": "Carlos González",
                "contact_email": "reservas@hotelmiramar.com",
                "contact_phone": "+52-998-1234567",
                "address": "Zona Hotelera, Cancún, México"
            },
            {
                "name": "Transportes Riviera Maya",
                "provider_type": ServiceType.TRANSPORT,
                "contact_name": "Ana Martínez",
                "contact_email": "operaciones@transportesriviera.com",
                "contact_phone": "+52-998-2345678",
                "address": "Playa del Carmen, Q.Roo"
            },
            {
                "name": "Guías Profesionales Tours",
                "provider_type": ServiceType.GUIDE,
                "contact_name": "Miguel Hernández",
                "contact_email": "guias@profesionalestours.com",
                "contact_phone": "+52-998-3456789",
                "address": "Cancún Centro"
            }
        ]
        
        created_providers = []
        for prov_data in providers_data:
            provider = Provider(
                id=uuid.uuid4(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                **prov_data
            )
            session.add(provider)
            created_providers.append(provider)
            logger.info(f"  ✓ Added provider: {provider.name}")
        
        # Sample Tour Group
        tour_group = TourGroup(
            id=uuid.uuid4(),
            group_code="MAYA-2024-001",
            group_name="Riviera Maya Experience 2024",
            start_date=datetime.utcnow() + timedelta(days=30),
            end_date=datetime.utcnow() + timedelta(days=37),
            pax_count=45,
            closure_status=ClosureStatus.OPEN,
            closure_progress=15,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(tour_group)
        logger.info(f"  ✓ Added tour group: {tour_group.group_name}")
        
        # Sample Reservations
        hotel_provider = created_providers[0]
        transport_provider = created_providers[1]
        
        reservations_data = [
            {
                "group_id": tour_group.id,
                "provider_id": hotel_provider.id,
                "service_type": ServiceType.HOTEL,
                "confirmation_number": "HTL-2024-45678",
                "service_date": tour_group.start_date,
                "quantity": 23,
                "room_type": "Deluxe Ocean View",
                "status": ReservationStatus.CONFIRMED
            },
            {
                "group_id": tour_group.id,
                "provider_id": transport_provider.id,
                "service_type": ServiceType.TRANSPORT,
                "confirmation_number": "TRP-2024-12345",
                "service_date": tour_group.start_date,
                "quantity": 1,
                "transport_type": "Bus 45 pax",
                "status": ReservationStatus.PENDING
            }
        ]
        
        for res_data in reservations_data:
            reservation = ProviderReservation(
                id=uuid.uuid4(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                **res_data
            )
            session.add(reservation)
            logger.info(f"  ✓ Added reservation: {reservation.confirmation_number}")
        
        session.commit()
        session.close()
        
        logger.info("\n✅ Sample data added successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error adding sample data: {e}")
        session.rollback()
        session.close()
        return False

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("  OPERATIONS MODULE DATABASE MIGRATION (SQLite)")
    logger.info("=" * 60)
    
    # Create tables
    if create_operations_tables():
        # Add sample data
        add_sample_data()
        
        logger.info("\n" + "=" * 60)
        logger.info("  ✅ MIGRATION COMPLETED SUCCESSFULLY!")
        logger.info("=" * 60)
        logger.info("\nDatabase file: operations.db")
        logger.info("\nNext steps:")
        logger.info("1. Configure OpenAI API key in .env")
        logger.info("2. Configure WhatsApp Business API (optional)")
        logger.info("3. Install Tesseract OCR for invoice scanning")
        logger.info("4. Start the backend: uvicorn backend.main:app --reload")
        logger.info("\n")
    else:
        sys.exit(1)
