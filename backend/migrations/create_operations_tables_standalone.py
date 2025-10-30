#!/usr/bin/env python3
"""
Standalone Database Migration Script for Operations Module
Creates operations tables independently for demo purposes
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import (
    create_engine, Column, String, Integer, Float, Boolean, 
    DateTime, Text, ForeignKey, Enum as SQLEnum, inspect
)
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import logging
from datetime import datetime
import uuid as uuid_pkg
import enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base = declarative_base()

# Enums
class ServiceType(str, enum.Enum):
    HOTEL = "hotel"
    TRANSPORT = "transport"
    GUIDE = "guide"
    RESTAURANT = "restaurant"
    ACTIVITY = "activity"
    OTHER = "other"

class ReservationStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    MODIFIED = "modified"

class ClosureStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

# Models
class Provider(Base):
    """Proveedores de servicios"""
    __tablename__ = 'providers'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid_pkg.uuid4()))
    name = Column(String(200), nullable=False)
    provider_type = Column(SQLEnum(ServiceType), nullable=False)
    contact_name = Column(String(200))
    contact_email = Column(String(200))
    contact_phone = Column(String(50))
    address = Column(Text)
    notification_settings = Column(Text)  # JSON string
    active = Column(Boolean, default=True)
    rating = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TourGroup(Base):
    """Grupos turísticos"""
    __tablename__ = 'tour_groups'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid_pkg.uuid4()))
    group_code = Column(String(50), unique=True, nullable=False)
    group_name = Column(String(200), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    pax_count = Column(Integer, nullable=False)
    closure_status = Column(SQLEnum(ClosureStatus), default=ClosureStatus.OPEN)
    closure_progress = Column(Integer, default=0)
    closure_checklist = Column(Text)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ProviderReservation(Base):
    """Reservas con proveedores"""
    __tablename__ = 'provider_reservations'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid_pkg.uuid4()))
    group_id = Column(String(36), ForeignKey('tour_groups.id'))
    provider_id = Column(String(36), ForeignKey('providers.id'))
    service_type = Column(SQLEnum(ServiceType), nullable=False)
    confirmation_number = Column(String(100))
    service_date = Column(DateTime, nullable=False)
    quantity = Column(Integer, nullable=False)
    room_type = Column(String(100))
    transport_type = Column(String(100))
    status = Column(SQLEnum(ReservationStatus), default=ReservationStatus.PENDING)
    invoice_validated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class GroupClosureItem(Base):
    """Items de checklist de cierre"""
    __tablename__ = 'group_closure_items'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid_pkg.uuid4()))
    group_id = Column(String(36), ForeignKey('tour_groups.id'))
    item_name = Column(String(200), nullable=False)
    item_category = Column(String(100))
    is_completed = Column(Boolean, default=False)
    completed_by = Column(String(36))
    completed_at = Column(DateTime)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ValidationLog(Base):
    """Logs de validación"""
    __tablename__ = 'validation_logs'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid_pkg.uuid4()))
    reservation_id = Column(String(36), ForeignKey('provider_reservations.id'))
    validation_type = Column(String(50), nullable=False)
    validation_result = Column(String(20), nullable=False)
    confidence_score = Column(Float)
    extracted_data = Column(Text)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

class OperationalAlert(Base):
    """Alertas operativas"""
    __tablename__ = 'operational_alerts'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid_pkg.uuid4()))
    group_id = Column(String(36), ForeignKey('tour_groups.id'))
    reservation_id = Column(String(36), ForeignKey('provider_reservations.id'))
    alert_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    acknowledged = Column(Boolean, default=False)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ReservationAttachment(Base):
    """Archivos adjuntos"""
    __tablename__ = 'reservation_attachments'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid_pkg.uuid4()))
    reservation_id = Column(String(36), ForeignKey('provider_reservations.id'))
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer)
    file_url = Column(String(500))
    uploaded_by = Column(String(36))
    uploaded_at = Column(DateTime, default=datetime.utcnow)

class NotificationLog(Base):
    """Logs de notificaciones"""
    __tablename__ = 'notification_logs'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid_pkg.uuid4()))
    notification_type = Column(String(50), nullable=False)
    recipient = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)

def create_operations_tables():
    """Create all operations tables"""
    try:
        db_path = Path(__file__).parent.parent.parent / "operations.db"
        database_url = f"sqlite:///{db_path}"
        logger.info(f"📁 Database: {db_path}")
        
        engine = create_engine(database_url, echo=False)
        Base.metadata.create_all(engine)
        
        logger.info("✅ All operations tables created!")
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        logger.info("\n📊 Created tables:")
        for table in tables:
            logger.info(f"  ✓ {table}")
        
        return engine
        
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        return None

def add_sample_data(engine):
    """Add sample data"""
    try:
        Session = sessionmaker(bind=engine)
        session = Session()
        
        logger.info("\n📦 Adding sample data...")
        
        # Check if data exists
        existing = session.query(Provider).count()
        if existing > 0:
            logger.info("⚠️  Data already exists. Skipping...")
            session.close()
            return
        
        # Sample providers
        providers = [
            Provider(
                name="Hotel Miramar Resort",
                provider_type=ServiceType.HOTEL,
                contact_name="Carlos González",
                contact_email="reservas@hotelmiramar.com",
                contact_phone="+52-998-1234567"
            ),
            Provider(
                name="Transportes Riviera Maya",
                provider_type=ServiceType.TRANSPORT,
                contact_name="Ana Martínez",
                contact_email="operaciones@transportesriviera.com",
                contact_phone="+52-998-2345678"
            ),
            Provider(
                name="Guías Profesionales",
                provider_type=ServiceType.GUIDE,
                contact_name="Miguel Hernández",
                contact_email="guias@profesionalestours.com",
                contact_phone="+52-998-3456789"
            )
        ]
        
        for p in providers:
            session.add(p)
            logger.info(f"  ✓ {p.name}")
        
        # Sample group
        from datetime import timedelta
        group = TourGroup(
            group_code="MAYA-2024-001",
            group_name="Riviera Maya Experience 2024",
            start_date=datetime.utcnow() + timedelta(days=30),
            end_date=datetime.utcnow() + timedelta(days=37),
            pax_count=45,
            closure_status=ClosureStatus.OPEN,
            closure_progress=15
        )
        session.add(group)
        logger.info(f"  ✓ {group.group_name}")
        
        session.commit()
        
        # Sample reservations
        hotel = session.query(Provider).filter_by(provider_type=ServiceType.HOTEL).first()
        transport = session.query(Provider).filter_by(provider_type=ServiceType.TRANSPORT).first()
        
        reservations = [
            ProviderReservation(
                group_id=group.id,
                provider_id=hotel.id,
                service_type=ServiceType.HOTEL,
                confirmation_number="HTL-2024-45678",
                service_date=group.start_date,
                quantity=23,
                room_type="Deluxe Ocean View",
                status=ReservationStatus.CONFIRMED
            ),
            ProviderReservation(
                group_id=group.id,
                provider_id=transport.id,
                service_type=ServiceType.TRANSPORT,
                confirmation_number="TRP-2024-12345",
                service_date=group.start_date,
                quantity=1,
                transport_type="Bus 45 pax",
                status=ReservationStatus.PENDING
            )
        ]
        
        for r in reservations:
            session.add(r)
            logger.info(f"  ✓ {r.confirmation_number}")
        
        session.commit()
        session.close()
        
        logger.info("\n✅ Sample data added!")
        
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        session.rollback()
        session.close()

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("  OPERATIONS MODULE - DATABASE SETUP")
    logger.info("=" * 60)
    
    engine = create_operations_tables()
    if engine:
        add_sample_data(engine)
        
        logger.info("\n" + "=" * 60)
        logger.info("  ✅ SETUP COMPLETED!")
        logger.info("=" * 60)
        logger.info("\n📝 Next steps:")
        logger.info("1. Configure .env file with API keys")
        logger.info("2. Start backend: uvicorn backend.main:app --reload")
        logger.info("3. Access API docs: http://localhost:8000/docs")
        logger.info("\n")
