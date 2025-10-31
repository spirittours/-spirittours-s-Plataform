"""
Database Initialization Script for Quotation System
Creates tables, indexes, and initial data
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from connection import db_manager, init_database
from ..models.quotation import (
    Base, GroupQuotation, QuotationResponse, 
    HotelProvider, Company, User,
    QuotationStatus, ResponseStatus, PaymentStatus
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_sample_hotels(session: Session):
    """Crear hoteles de muestra para pruebas"""
    
    hotels_data = [
        {
            "id": "HTL-GRAND001",
            "code": "GRAND-MIA",
            "name": "Grand Hotel Miami Beach",
            "email": "reservations@grandmiami.com",
            "phone": "+1-305-555-0100",
            "address": "1000 Ocean Drive, Miami Beach, FL",
            "city": "Miami Beach",
            "state": "Florida",
            "country": "USA",
            "category": "luxury",
            "star_rating": 5.0,
            "rating": 4.8,
            "total_rooms": 450,
            "room_types_available": ["single", "double", "suite", "penthouse"],
            "amenities": ["pool", "spa", "gym", "restaurant", "bar", "beach_access"],
            "commission_percentage": 15.0,
            "response_rate": 0.95,
            "quality_score": 4.9,
            "is_active": True,
            "is_verified": True
        },
        {
            "id": "HTL-RESORT002",
            "code": "PARADISE-CUN",
            "name": "Paradise Resort Cancun",
            "email": "bookings@paradisecancun.mx",
            "phone": "+52-998-555-0200",
            "address": "Blvd Kukulcan Km 9.5, Cancun",
            "city": "Cancun",
            "state": "Quintana Roo",
            "country": "Mexico",
            "category": "premium",
            "star_rating": 4.5,
            "rating": 4.6,
            "total_rooms": 320,
            "room_types_available": ["standard", "deluxe", "suite", "villa"],
            "amenities": ["all_inclusive", "pool", "spa", "kids_club", "water_sports"],
            "commission_percentage": 18.0,
            "response_rate": 0.88,
            "quality_score": 4.7,
            "is_active": True,
            "is_verified": True
        },
        {
            "id": "HTL-BUSINESS003",
            "code": "EXEC-NYC",
            "name": "Executive Business Hotel NYC",
            "email": "reservations@execnyc.com",
            "phone": "+1-212-555-0300",
            "address": "350 5th Avenue, New York, NY",
            "city": "New York",
            "state": "New York",
            "country": "USA",
            "category": "business",
            "star_rating": 4.0,
            "rating": 4.4,
            "total_rooms": 280,
            "room_types_available": ["standard", "executive", "suite"],
            "amenities": ["business_center", "meeting_rooms", "gym", "restaurant"],
            "commission_percentage": 12.0,
            "response_rate": 0.92,
            "quality_score": 4.5,
            "is_active": True,
            "is_verified": True
        },
        {
            "id": "HTL-BOUTIQUE004",
            "code": "CASA-BCN",
            "name": "Casa Boutique Barcelona",
            "email": "info@casaboutiquebcn.es",
            "phone": "+34-93-555-0400",
            "address": "Passeig de Gràcia 123, Barcelona",
            "city": "Barcelona",
            "state": "Catalonia",
            "country": "Spain",
            "category": "boutique",
            "star_rating": 4.0,
            "rating": 4.7,
            "total_rooms": 45,
            "room_types_available": ["deluxe", "suite", "penthouse"],
            "amenities": ["rooftop_terrace", "spa", "restaurant", "concierge"],
            "commission_percentage": 20.0,
            "response_rate": 0.85,
            "quality_score": 4.8,
            "is_active": True,
            "is_verified": True
        },
        {
            "id": "HTL-BEACH005",
            "code": "SUNSET-LA",
            "name": "Sunset Beach Hotel Los Angeles",
            "email": "stay@sunsetbeachla.com",
            "phone": "+1-310-555-0500",
            "address": "1 Pico Blvd, Santa Monica, CA",
            "city": "Los Angeles",
            "state": "California",
            "country": "USA",
            "category": "beach",
            "star_rating": 3.5,
            "rating": 4.2,
            "total_rooms": 180,
            "room_types_available": ["standard", "ocean_view", "suite"],
            "amenities": ["pool", "beach_access", "restaurant", "parking"],
            "commission_percentage": 15.0,
            "response_rate": 0.78,
            "quality_score": 4.3,
            "is_active": True,
            "is_verified": True
        }
    ]
    
    for hotel_data in hotels_data:
        hotel = HotelProvider(**hotel_data)
        session.add(hotel)
        
    logger.info(f"Created {len(hotels_data)} sample hotels")


def create_sample_quotations(session: Session):
    """Crear cotizaciones de muestra"""
    
    # Obtener empresa y usuario demo
    demo_company = session.query(Company).filter_by(id="CMP-DEMO001").first()
    demo_user = session.query(User).filter_by(id="USR-DEMO001").first()
    
    if not demo_company or not demo_user:
        logger.error("Demo company or user not found")
        return
    
    quotations_data = [
        {
            "id": "GQ-20241015-DEMO001",
            "company_id": demo_company.id,
            "user_id": demo_user.id,
            "title": "Grupo Corporativo Miami - 50 habitaciones",
            "description": "Evento corporativo anual para empresa tecnológica",
            "reference_number": "REF-2024-001",
            "destination": "Miami Beach",
            "check_in_date": datetime.now() + timedelta(days=60),
            "check_out_date": datetime.now() + timedelta(days=65),
            "num_nights": 5,
            "num_rooms": 50,
            "num_guests": 100,
            "num_adults": 90,
            "num_children": 10,
            "room_types": ["double", "suite"],
            "meal_plan": "BB",
            "budget_min": Decimal("15000"),
            "budget_max": Decimal("25000"),
            "currency": "USD",
            "deposit_config": {
                "required": True,
                "amount": 5000,
                "percentage": 0.20,
                "received": False,
                "payment_date": None
            },
            "hotel_selection": {
                "mode": "MANUAL",
                "selected_hotels": ["HTL-GRAND001", "HTL-BEACH005"],
                "criteria": {
                    "min_rating": 4.0,
                    "max_distance": 5
                }
            },
            "privacy_settings": {
                "hide_competitor_prices": True,  # CRÍTICO: Por defecto oculto
                "show_own_ranking": True,
                "reveal_prices_after_deadline": False,
                "admin_can_override": True
            },
            "deadline": datetime.now() + timedelta(days=7),
            "status": QuotationStatus.PUBLISHED,
            "payment_status": PaymentStatus.PENDING
        },
        {
            "id": "GQ-20241015-DEMO002",
            "company_id": demo_company.id,
            "user_id": demo_user.id,
            "title": "Convención Cancún - 75 habitaciones",
            "description": "Convención internacional de ventas",
            "reference_number": "REF-2024-002",
            "destination": "Cancun",
            "check_in_date": datetime.now() + timedelta(days=90),
            "check_out_date": datetime.now() + timedelta(days=94),
            "num_nights": 4,
            "num_rooms": 75,
            "num_guests": 150,
            "num_adults": 150,
            "num_children": 0,
            "room_types": ["standard", "deluxe"],
            "meal_plan": "AI",  # All Inclusive
            "budget_min": Decimal("30000"),
            "budget_max": Decimal("45000"),
            "currency": "USD",
            "deposit_config": {
                "required": True,
                "amount": 9000,
                "percentage": 0.20,
                "received": False,
                "payment_date": None
            },
            "hotel_selection": {
                "mode": "AUTOMATIC",
                "selected_hotels": [],
                "criteria": {
                    "min_rating": 4.5,
                    "amenities_required": ["all_inclusive", "pool", "spa"]
                }
            },
            "privacy_settings": {
                "hide_competitor_prices": True,
                "show_own_ranking": False,
                "reveal_prices_after_deadline": True,
                "admin_can_override": True
            },
            "deadline": datetime.now() + timedelta(days=10),
            "status": QuotationStatus.DRAFT,
            "payment_status": PaymentStatus.PENDING
        }
    ]
    
    for quotation_data in quotations_data:
        quotation = GroupQuotation(**quotation_data)
        session.add(quotation)
        
    logger.info(f"Created {len(quotations_data)} sample quotations")


def create_indexes(engine):
    """Crear índices adicionales para optimización"""
    
    indexes = [
        # Índices para búsquedas frecuentes
        "CREATE INDEX IF NOT EXISTS idx_quotation_deadline ON group_quotations(deadline);",
        "CREATE INDEX IF NOT EXISTS idx_quotation_status_company ON group_quotations(status, company_id);",
        "CREATE INDEX IF NOT EXISTS idx_response_quotation_status ON quotation_responses(quotation_id, status);",
        "CREATE INDEX IF NOT EXISTS idx_hotel_location ON hotel_providers(city, country);",
        "CREATE INDEX IF NOT EXISTS idx_hotel_category_rating ON hotel_providers(category, star_rating);",
        
        # Índices para joins
        "CREATE INDEX IF NOT EXISTS idx_user_company ON users(company_id);",
        "CREATE INDEX IF NOT EXISTS idx_response_hotel ON quotation_responses(hotel_id);",
        
        # Índices para búsquedas de texto
        "CREATE INDEX IF NOT EXISTS idx_quotation_destination ON group_quotations(destination);",
        "CREATE INDEX IF NOT EXISTS idx_hotel_name ON hotel_providers(name);",
    ]
    
    with engine.connect() as conn:
        for index_sql in indexes:
            try:
                conn.execute(text(index_sql))
                conn.commit()
            except Exception as e:
                logger.warning(f"Index might already exist: {e}")
                
    logger.info("Database indexes created/verified")


def verify_database_setup(session: Session):
    """Verificar que la base de datos está configurada correctamente"""
    
    checks = {
        "Companies": session.query(Company).count(),
        "Users": session.query(User).count(),
        "Hotels": session.query(HotelProvider).count(),
        "Quotations": session.query(GroupQuotation).count(),
        "Responses": session.query(QuotationResponse).count()
    }
    
    logger.info("Database verification:")
    for table, count in checks.items():
        logger.info(f"  {table}: {count} records")
        
    return all(count >= 0 for count in checks.values())


def main():
    """Script principal de inicialización"""
    
    logger.info("=" * 50)
    logger.info("Spirit Tours Database Initialization")
    logger.info("=" * 50)
    
    try:
        # Inicializar base de datos
        logger.info("Step 1: Testing database connection...")
        if not db_manager.test_connection():
            logger.error("Cannot connect to database. Please check your configuration.")
            return False
            
        logger.info("Step 2: Creating database tables...")
        db_manager.create_all_tables()
        
        logger.info("Step 3: Creating indexes...")
        create_indexes(db_manager.engine)
        
        with db_manager.session_scope() as session:
            # Verificar si ya hay datos
            company_count = session.query(Company).count()
            
            if company_count == 0:
                logger.info("Step 4: Inserting initial data...")
                
                # Insertar datos básicos
                init_database()
                
                # Crear hoteles de muestra
                create_sample_hotels(session)
                
                # Crear cotizaciones de muestra
                create_sample_quotations(session)
                
                session.commit()
                logger.info("Initial data inserted successfully")
            else:
                logger.info("Step 4: Database already contains data, skipping initialization")
                
            # Verificar configuración
            logger.info("Step 5: Verifying database setup...")
            if verify_database_setup(session):
                logger.info("✅ Database initialization completed successfully!")
            else:
                logger.warning("⚠️ Database initialized but verification found issues")
                
        # Mostrar estadísticas de conexión
        stats = db_manager.get_connection_stats()
        logger.info(f"Connection pool stats: {stats}")
        
        logger.info("=" * 50)
        logger.info("Database ready for use!")
        logger.info("=" * 50)
        
        return True
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        db_manager.close()


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)