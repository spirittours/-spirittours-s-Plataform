#!/usr/bin/env python3
"""
Database Seed Script for Spirit Tours
Populates database with realistic test data for all modules
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta, date
from decimal import Decimal
import random
import uuid

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://spirittours:spirit2024@localhost:5432/spirittours_db"
)

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class DatabaseSeeder:
    """Main seeder class"""
    
    def __init__(self):
        self.session = SessionLocal()
        self.created_ids = {
            'guides': [],
            'trips': [],
            'reservations': [],
            'quotations': [],
            'vehicles': [],
            'drivers': [],
            'accounts': [],
            'leads': [],
            'contacts': []
        }
    
    def cleanup(self):
        """Clean existing test data"""
        print("🧹 Cleaning existing test data...")
        
        tables_to_clean = [
            'raffle_tickets', 'raffles',
            'marketplace_products',
            'interactions', 'leads',
            'contacts',
            'report_executions', 'reports',
            'transport_assignments', 'drivers', 'vehicles',
            'invoices', 'transactions', 'accounts',
            'trip_participants', 'trips',
            'guide_availability', 'guide_assignments', 'guides',
            'package_quotations', 'quotation_items', 'quotations',
            'operational_checklist', 'operations_log', 'reservations'
        ]
        
        for table in tables_to_clean:
            try:
                self.session.execute(text(f"DELETE FROM {table}"))
                self.session.commit()
                print(f"  ✓ Cleaned {table}")
            except Exception as e:
                self.session.rollback()
                print(f"  ⚠ Warning cleaning {table}: {e}")
    
    def seed_guides(self):
        """Seed guide data"""
        print("\n📚 Seeding guides...")
        
        guides_data = [
            {
                'guide_code': 'GD001',
                'first_name': 'David',
                'last_name': 'Cohen',
                'email': 'david.cohen@spirittours.com',
                'phone': '+972-50-555-0001',
                'languages': ['English', 'Hebrew', 'Spanish'],
                'specializations': ['Biblical History', 'Archaeology'],
                'certification': 'Licensed Tour Guide - Israel',
                'license_number': 'IL-TG-2020-001',
                'rating': Decimal('4.9'),
                'total_tours': 245
            },
            {
                'guide_code': 'GD002',
                'first_name': 'Rachel',
                'last_name': 'Levy',
                'email': 'rachel.levy@spirittours.com',
                'phone': '+972-50-555-0002',
                'languages': ['English', 'Hebrew', 'French'],
                'specializations': ['Christian Heritage', 'Jerusalem Old City'],
                'certification': 'Licensed Tour Guide - Israel',
                'license_number': 'IL-TG-2019-002',
                'rating': Decimal('4.8'),
                'total_tours': 198
            },
            {
                'guide_code': 'GD003',
                'first_name': 'Michael',
                'last_name': 'Abraham',
                'email': 'michael.abraham@spirittours.com',
                'phone': '+972-50-555-0003',
                'languages': ['English', 'Hebrew', 'Arabic', 'German'],
                'specializations': ['Islamic Heritage', 'Multi-faith Tours'],
                'certification': 'Licensed Tour Guide - Israel',
                'license_number': 'IL-TG-2018-003',
                'rating': Decimal('4.9'),
                'total_tours': 312
            },
            {
                'guide_code': 'GD004',
                'first_name': 'Sarah',
                'last_name': 'Gold',
                'email': 'sarah.gold@spirittours.com',
                'phone': '+972-50-555-0004',
                'languages': ['English', 'Hebrew', 'Russian'],
                'specializations': ['Dead Sea', 'Nature Tours'],
                'certification': 'Licensed Tour Guide - Israel',
                'license_number': 'IL-TG-2021-004',
                'rating': Decimal('4.7'),
                'total_tours': 156
            }
        ]
        
        for guide_data in guides_data:
            guide_id = str(uuid.uuid4())
            self.created_ids['guides'].append(guide_id)
            
            query = text("""
                INSERT INTO guides (
                    id, guide_code, first_name, last_name, email, phone,
                    languages, specializations, certification, license_number,
                    license_expiry, rating, total_tours, is_active, created_at
                ) VALUES (
                    :id, :guide_code, :first_name, :last_name, :email, :phone,
                    :languages::jsonb, :specializations::jsonb, :certification, 
                    :license_number, :license_expiry, :rating, :total_tours, 
                    :is_active, :created_at
                )
            """)
            
            self.session.execute(query, {
                'id': guide_id,
                'guide_code': guide_data['guide_code'],
                'first_name': guide_data['first_name'],
                'last_name': guide_data['last_name'],
                'email': guide_data['email'],
                'phone': guide_data['phone'],
                'languages': str(guide_data['languages']),
                'specializations': str(guide_data['specializations']),
                'certification': guide_data['certification'],
                'license_number': guide_data['license_number'],
                'license_expiry': date.today() + timedelta(days=365),
                'rating': guide_data['rating'],
                'total_tours': guide_data['total_tours'],
                'is_active': True,
                'created_at': datetime.now()
            })
        
        self.session.commit()
        print(f"  ✓ Created {len(guides_data)} guides")
    
    def seed_trips(self):
        """Seed trip data"""
        print("\n🚌 Seeding trips...")
        
        trips_data = [
            {
                'trip_code': 'JER-HL-001',
                'trip_name': 'Jerusalem Holy Sites Tour',
                'description': 'Full day tour of Jerusalem\'s most sacred sites',
                'destination': 'Jerusalem',
                'departure_location': 'Tel Aviv Central Station',
                'duration_days': 1,
                'max_capacity': 40,
                'price_per_person': Decimal('120.00')
            },
            {
                'trip_code': 'DS-MA-002',
                'trip_name': 'Dead Sea & Masada Experience',
                'description': 'Visit Masada fortress and float in the Dead Sea',
                'destination': 'Dead Sea',
                'departure_location': 'Jerusalem Jaffa Gate',
                'duration_days': 1,
                'max_capacity': 35,
                'price_per_person': Decimal('95.00')
            },
            {
                'trip_code': 'GAL-NAZ-003',
                'trip_name': 'Galilee & Nazareth Pilgrimage',
                'description': 'Christian pilgrimage to Galilee and Nazareth',
                'destination': 'Galilee',
                'departure_location': 'Haifa Port',
                'duration_days': 2,
                'max_capacity': 30,
                'price_per_person': Decimal('280.00')
            },
            {
                'trip_code': 'BET-HEB-004',
                'trip_name': 'Bethlehem & Hebron Heritage',
                'description': 'Explore biblical heritage sites',
                'destination': 'Bethlehem',
                'departure_location': 'Jerusalem Old City',
                'duration_days': 1,
                'max_capacity': 25,
                'price_per_person': Decimal('85.00')
            }
        ]
        
        for trip_data in trips_data:
            trip_id = str(uuid.uuid4())
            self.created_ids['trips'].append(trip_id)
            
            departure_date = date.today() + timedelta(days=random.randint(7, 30))
            return_date = departure_date + timedelta(days=trip_data['duration_days'] - 1)
            
            booked = random.randint(10, trip_data['max_capacity'] - 5)
            
            query = text("""
                INSERT INTO trips (
                    id, trip_code, trip_name, description, destination,
                    departure_location, departure_date, return_date,
                    duration_days, max_capacity, booked_seats, available_seats,
                    price_per_person, status, created_at
                ) VALUES (
                    :id, :trip_code, :trip_name, :description, :destination,
                    :departure_location, :departure_date, :return_date,
                    :duration_days, :max_capacity, :booked_seats, :available_seats,
                    :price_per_person, :status, :created_at
                )
            """)
            
            self.session.execute(query, {
                'id': trip_id,
                'trip_code': trip_data['trip_code'],
                'trip_name': trip_data['trip_name'],
                'description': trip_data['description'],
                'destination': trip_data['destination'],
                'departure_location': trip_data['departure_location'],
                'departure_date': departure_date,
                'return_date': return_date,
                'duration_days': trip_data['duration_days'],
                'max_capacity': trip_data['max_capacity'],
                'booked_seats': booked,
                'available_seats': trip_data['max_capacity'] - booked,
                'price_per_person': trip_data['price_per_person'],
                'status': 'scheduled',
                'created_at': datetime.now()
            })
        
        self.session.commit()
        print(f"  ✓ Created {len(trips_data)} trips")
    
    def seed_reservations(self):
        """Seed reservation data"""
        print("\n📋 Seeding reservations...")
        
        if not self.created_ids['trips']:
            print("  ⚠ No trips available, skipping reservations")
            return
        
        customers = [
            ('John Smith', 'john.smith@email.com', '+1-555-0101'),
            ('Maria Garcia', 'maria.garcia@email.com', '+34-600-123456'),
            ('Hans Mueller', 'hans.mueller@email.com', '+49-30-12345678'),
            ('Sophie Dubois', 'sophie.dubois@email.com', '+33-1-23456789'),
            ('Antonio Rossi', 'antonio.rossi@email.com', '+39-06-12345678'),
            ('Anna Kowalski', 'anna.kowalski@email.com', '+48-22-1234567'),
            ('Pedro Silva', 'pedro.silva@email.com', '+351-21-1234567'),
            ('Emma Johnson', 'emma.johnson@email.com', '+44-20-12345678')
        ]
        
        for i, (name, email, phone) in enumerate(customers):
            reservation_id = str(uuid.uuid4())
            self.created_ids['reservations'].append(reservation_id)
            
            trip_id = random.choice(self.created_ids['trips'])
            passengers = random.randint(1, 4)
            
            # Get trip price
            trip_query = text("SELECT price_per_person FROM trips WHERE id = :trip_id")
            trip_result = self.session.execute(trip_query, {'trip_id': trip_id}).fetchone()
            price_per_person = trip_result[0] if trip_result else Decimal('100.00')
            
            total_amount = price_per_person * passengers
            
            query = text("""
                INSERT INTO reservations (
                    id, reservation_code, customer_name, customer_email,
                    customer_phone, number_of_passengers, booking_date,
                    tour_date, status, total_amount, payment_status, created_at
                ) VALUES (
                    :id, :reservation_code, :customer_name, :customer_email,
                    :customer_phone, :number_of_passengers, :booking_date,
                    :tour_date, :status, :total_amount, :payment_status, :created_at
                )
            """)
            
            self.session.execute(query, {
                'id': reservation_id,
                'reservation_code': f'RSV-{datetime.now().strftime("%Y%m%d")}-{i+1:04d}',
                'customer_name': name,
                'customer_email': email,
                'customer_phone': phone,
                'number_of_passengers': passengers,
                'booking_date': datetime.now() - timedelta(days=random.randint(1, 30)),
                'tour_date': date.today() + timedelta(days=random.randint(7, 30)),
                'status': random.choice(['confirmed', 'confirmed', 'pending']),
                'total_amount': total_amount,
                'payment_status': random.choice(['paid', 'paid', 'pending']),
                'created_at': datetime.now()
            })
        
        self.session.commit()
        print(f"  ✓ Created {len(customers)} reservations")
    
    def seed_quotations(self):
        """Seed quotation data"""
        print("\n💰 Seeding quotations...")
        
        quotations_data = [
            {
                'customer_name': 'Robert Williams',
                'customer_email': 'robert.williams@company.com',
                'customer_phone': '+1-555-0201',
                'destination': 'Israel Holy Land',
                'passengers': 15,
                'status': 'sent'
            },
            {
                'customer_name': 'Linda Martinez',
                'customer_email': 'linda.martinez@travel.com',
                'customer_phone': '+1-555-0202',
                'destination': 'Jerusalem & Dead Sea',
                'passengers': 8,
                'status': 'accepted'
            },
            {
                'customer_name': 'Thomas Anderson',
                'customer_email': 'thomas.anderson@corp.com',
                'customer_phone': '+1-555-0203',
                'destination': 'Galilee Pilgrimage',
                'passengers': 25,
                'status': 'draft'
            }
        ]
        
        for i, quot_data in enumerate(quotations_data):
            quotation_id = str(uuid.uuid4())
            self.created_ids['quotations'].append(quotation_id)
            
            subtotal = Decimal(str(random.randint(2000, 8000)))
            taxes = subtotal * Decimal('0.17')  # 17% VAT
            total = subtotal + taxes
            
            query = text("""
                INSERT INTO quotations (
                    id, quotation_number, customer_name, customer_email,
                    customer_phone, destination, departure_date, return_date,
                    number_of_passengers, status, subtotal, taxes,
                    total_amount, currency, valid_until, created_at
                ) VALUES (
                    :id, :quotation_number, :customer_name, :customer_email,
                    :customer_phone, :destination, :departure_date, :return_date,
                    :number_of_passengers, :status, :subtotal, :taxes,
                    :total_amount, :currency, :valid_until, :created_at
                )
            """)
            
            self.session.execute(query, {
                'id': quotation_id,
                'quotation_number': f'QT-{datetime.now().strftime("%Y%m")}-{i+1:04d}',
                'customer_name': quot_data['customer_name'],
                'customer_email': quot_data['customer_email'],
                'customer_phone': quot_data['customer_phone'],
                'destination': quot_data['destination'],
                'departure_date': date.today() + timedelta(days=random.randint(30, 90)),
                'return_date': date.today() + timedelta(days=random.randint(37, 97)),
                'number_of_passengers': quot_data['passengers'],
                'status': quot_data['status'],
                'subtotal': subtotal,
                'taxes': taxes,
                'total_amount': total,
                'currency': 'USD',
                'valid_until': date.today() + timedelta(days=30),
                'created_at': datetime.now()
            })
        
        self.session.commit()
        print(f"  ✓ Created {len(quotations_data)} quotations")
    
    def seed_vehicles(self):
        """Seed vehicle data"""
        print("\n🚐 Seeding vehicles...")
        
        vehicles_data = [
            {
                'vehicle_code': 'VH001',
                'vehicle_type': 'Bus',
                'make': 'Mercedes-Benz',
                'model': 'Sprinter',
                'year': 2022,
                'license_plate': 'IL-123-456',
                'capacity': 20
            },
            {
                'vehicle_code': 'VH002',
                'vehicle_type': 'Bus',
                'make': 'Volkswagen',
                'model': 'Crafter',
                'year': 2021,
                'license_plate': 'IL-234-567',
                'capacity': 15
            },
            {
                'vehicle_code': 'VH003',
                'vehicle_type': 'Van',
                'make': 'Ford',
                'model': 'Transit',
                'year': 2023,
                'license_plate': 'IL-345-678',
                'capacity': 12
            },
            {
                'vehicle_code': 'VH004',
                'vehicle_type': 'Bus',
                'make': 'Mercedes-Benz',
                'model': 'Tourismo',
                'year': 2020,
                'license_plate': 'IL-456-789',
                'capacity': 50
            }
        ]
        
        for vehicle_data in vehicles_data:
            vehicle_id = str(uuid.uuid4())
            self.created_ids['vehicles'].append(vehicle_id)
            
            query = text("""
                INSERT INTO vehicles (
                    id, vehicle_code, vehicle_type, make, model, year,
                    license_plate, capacity, status, insurance_expiry,
                    registration_expiry, is_active, created_at
                ) VALUES (
                    :id, :vehicle_code, :vehicle_type, :make, :model, :year,
                    :license_plate, :capacity, :status, :insurance_expiry,
                    :registration_expiry, :is_active, :created_at
                )
            """)
            
            self.session.execute(query, {
                'id': vehicle_id,
                'vehicle_code': vehicle_data['vehicle_code'],
                'vehicle_type': vehicle_data['vehicle_type'],
                'make': vehicle_data['make'],
                'model': vehicle_data['model'],
                'year': vehicle_data['year'],
                'license_plate': vehicle_data['license_plate'],
                'capacity': vehicle_data['capacity'],
                'status': 'available',
                'insurance_expiry': date.today() + timedelta(days=365),
                'registration_expiry': date.today() + timedelta(days=180),
                'is_active': True,
                'created_at': datetime.now()
            })
        
        self.session.commit()
        print(f"  ✓ Created {len(vehicles_data)} vehicles")
    
    def seed_drivers(self):
        """Seed driver data"""
        print("\n👨‍✈️ Seeding drivers...")
        
        drivers_data = [
            {
                'driver_code': 'DRV001',
                'first_name': 'Yossi',
                'last_name': 'Ben-David',
                'email': 'yossi.bendavid@spirittours.com',
                'phone': '+972-50-777-0001',
                'license_number': 'IL-DL-123456'
            },
            {
                'driver_code': 'DRV002',
                'first_name': 'Moshe',
                'last_name': 'Cohen',
                'email': 'moshe.cohen@spirittours.com',
                'phone': '+972-50-777-0002',
                'license_number': 'IL-DL-234567'
            },
            {
                'driver_code': 'DRV003',
                'first_name': 'Avraham',
                'last_name': 'Levy',
                'email': 'avraham.levy@spirittours.com',
                'phone': '+972-50-777-0003',
                'license_number': 'IL-DL-345678'
            }
        ]
        
        for driver_data in drivers_data:
            driver_id = str(uuid.uuid4())
            self.created_ids['drivers'].append(driver_id)
            
            query = text("""
                INSERT INTO drivers (
                    id, driver_code, first_name, last_name, email, phone,
                    license_number, license_type, license_expiry, hire_date,
                    status, rating, is_active, created_at
                ) VALUES (
                    :id, :driver_code, :first_name, :last_name, :email, :phone,
                    :license_number, :license_type, :license_expiry, :hire_date,
                    :status, :rating, :is_active, :created_at
                )
            """)
            
            self.session.execute(query, {
                'id': driver_id,
                'driver_code': driver_data['driver_code'],
                'first_name': driver_data['first_name'],
                'last_name': driver_data['last_name'],
                'email': driver_data['email'],
                'phone': driver_data['phone'],
                'license_number': driver_data['license_number'],
                'license_type': 'D',
                'license_expiry': date.today() + timedelta(days=365*5),
                'hire_date': date.today() - timedelta(days=random.randint(365, 1825)),
                'status': 'active',
                'rating': Decimal('4.8'),
                'is_active': True,
                'created_at': datetime.now()
            })
        
        self.session.commit()
        print(f"  ✓ Created {len(drivers_data)} drivers")
    
    def seed_accounting(self):
        """Seed accounting data"""
        print("\n💼 Seeding accounting data...")
        
        accounts_data = [
            {'code': '1000', 'name': 'Cash', 'type': 'asset'},
            {'code': '1100', 'name': 'Accounts Receivable', 'type': 'asset'},
            {'code': '2000', 'name': 'Accounts Payable', 'type': 'liability'},
            {'code': '3000', 'name': 'Revenue', 'type': 'revenue'},
            {'code': '4000', 'name': 'Operating Expenses', 'type': 'expense'}
        ]
        
        for account_data in accounts_data:
            account_id = str(uuid.uuid4())
            self.created_ids['accounts'].append(account_id)
            
            query = text("""
                INSERT INTO accounts (
                    id, account_code, account_name, account_type,
                    balance, currency, is_active, created_at
                ) VALUES (
                    :id, :account_code, :account_name, :account_type,
                    :balance, :currency, :is_active, :created_at
                )
            """)
            
            self.session.execute(query, {
                'id': account_id,
                'account_code': account_data['code'],
                'account_name': account_data['name'],
                'account_type': account_data['type'],
                'balance': Decimal('0.00'),
                'currency': 'USD',
                'is_active': True,
                'created_at': datetime.now()
            })
        
        self.session.commit()
        print(f"  ✓ Created {len(accounts_data)} accounts")
    
    def seed_leads(self):
        """Seed lead data"""
        print("\n🎯 Seeding leads...")
        
        leads_data = [
            {
                'first_name': 'James',
                'last_name': 'Wilson',
                'email': 'james.wilson@example.com',
                'phone': '+1-555-0301',
                'lead_source': 'Website',
                'interest_level': 'high'
            },
            {
                'first_name': 'Patricia',
                'last_name': 'Brown',
                'email': 'patricia.brown@example.com',
                'phone': '+1-555-0302',
                'lead_source': 'Referral',
                'interest_level': 'medium'
            },
            {
                'first_name': 'Michael',
                'last_name': 'Davis',
                'email': 'michael.davis@example.com',
                'phone': '+1-555-0303',
                'lead_source': 'Trade Show',
                'interest_level': 'high'
            }
        ]
        
        for lead_data in leads_data:
            lead_id = str(uuid.uuid4())
            self.created_ids['leads'].append(lead_id)
            
            query = text("""
                INSERT INTO leads (
                    id, first_name, last_name, email, phone,
                    lead_source, lead_status, interest_level, created_at
                ) VALUES (
                    :id, :first_name, :last_name, :email, :phone,
                    :lead_source, :lead_status, :interest_level, :created_at
                )
            """)
            
            self.session.execute(query, {
                'id': lead_id,
                'first_name': lead_data['first_name'],
                'last_name': lead_data['last_name'],
                'email': lead_data['email'],
                'phone': lead_data['phone'],
                'lead_source': lead_data['lead_source'],
                'lead_status': 'new',
                'interest_level': lead_data['interest_level'],
                'created_at': datetime.now()
            })
        
        self.session.commit()
        print(f"  ✓ Created {len(leads_data)} leads")
    
    def run(self, cleanup_first=True):
        """Run all seeders"""
        try:
            print("🌱 Starting database seeding process...\n")
            print("=" * 60)
            
            if cleanup_first:
                self.cleanup()
            
            self.seed_guides()
            self.seed_trips()
            self.seed_reservations()
            self.seed_quotations()
            self.seed_vehicles()
            self.seed_drivers()
            self.seed_accounting()
            self.seed_leads()
            
            print("\n" + "=" * 60)
            print("✅ Database seeding completed successfully!")
            print(f"\nCreated:")
            print(f"  • {len(self.created_ids['guides'])} Guides")
            print(f"  • {len(self.created_ids['trips'])} Trips")
            print(f"  • {len(self.created_ids['reservations'])} Reservations")
            print(f"  • {len(self.created_ids['quotations'])} Quotations")
            print(f"  • {len(self.created_ids['vehicles'])} Vehicles")
            print(f"  • {len(self.created_ids['drivers'])} Drivers")
            print(f"  • {len(self.created_ids['accounts'])} Accounts")
            print(f"  • {len(self.created_ids['leads'])} Leads")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n❌ Error during seeding: {e}")
            self.session.rollback()
            raise
        finally:
            self.session.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Seed Spirit Tours database')
    parser.add_argument(
        '--no-cleanup',
        action='store_true',
        help='Skip cleanup of existing data'
    )
    
    args = parser.parse_args()
    
    seeder = DatabaseSeeder()
    seeder.run(cleanup_first=not args.no_cleanup)
