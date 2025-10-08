"""
Database Setup and Configuration Script
Complete setup for PostgreSQL and Redis databases for Spirit Tours Platform
"""

import asyncio
import asyncpg
import aioredis
import os
from typing import Dict, List, Optional
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseSetup:
    """Complete database setup for Spirit Tours Platform"""
    
    def __init__(self):
        self.pg_config = {
            "host": os.getenv("DB_HOST", "localhost"),
            "port": os.getenv("DB_PORT", 5432),
            "database": os.getenv("DB_NAME", "spirittours"),
            "user": os.getenv("DB_USER", "spirittours_user"),
            "password": os.getenv("DB_PASSWORD", "secure_password_123")
        }
        
        self.redis_config = {
            "host": os.getenv("REDIS_HOST", "localhost"),
            "port": os.getenv("REDIS_PORT", 6379),
            "password": os.getenv("REDIS_PASSWORD", None),
            "db": os.getenv("REDIS_DB", 0)
        }
        
    async def setup_postgresql(self):
        """Setup PostgreSQL database with all required schemas and tables"""
        logger.info("🔧 Setting up PostgreSQL database...")
        
        try:
            # Connect to PostgreSQL
            conn = await asyncpg.connect(
                host=self.pg_config["host"],
                port=self.pg_config["port"],
                user="postgres",  # Use admin user for setup
                password=os.getenv("POSTGRES_PASSWORD", "postgres")
            )
            
            # Create database if not exists
            try:
                await conn.execute(f"""
                    CREATE DATABASE {self.pg_config["database"]}
                """)
                logger.info(f"✅ Created database: {self.pg_config['database']}")
            except asyncpg.DuplicateDatabaseError:
                logger.info(f"ℹ️ Database {self.pg_config['database']} already exists")
            
            # Create user if not exists
            try:
                await conn.execute(f"""
                    CREATE USER {self.pg_config["user"]} 
                    WITH PASSWORD '{self.pg_config["password"]}'
                """)
                logger.info(f"✅ Created user: {self.pg_config['user']}")
            except asyncpg.DuplicateObjectError:
                logger.info(f"ℹ️ User {self.pg_config['user']} already exists")
            
            # Grant privileges
            await conn.execute(f"""
                GRANT ALL PRIVILEGES ON DATABASE {self.pg_config["database"]} 
                TO {self.pg_config["user"]}
            """)
            
            await conn.close()
            
            # Connect to the new database
            conn = await asyncpg.connect(**self.pg_config)
            
            # Create schemas
            schemas = [
                "core",      # Core platform tables
                "gds",       # GDS integration
                "pms",       # Property Management System
                "channel",   # Channel Manager
                "ai",        # AI/ML models
                "analytics", # Analytics data
                "support",   # Support system
                "agency",    # B2B2C agency management
                "quantum",   # Quantum computing
                "blockchain" # Blockchain data
            ]
            
            for schema in schemas:
                await conn.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
                logger.info(f"✅ Created schema: {schema}")
            
            # Create core tables
            await self._create_core_tables(conn)
            
            # Create GDS tables
            await self._create_gds_tables(conn)
            
            # Create PMS tables
            await self._create_pms_tables(conn)
            
            # Create Channel Manager tables
            await self._create_channel_tables(conn)
            
            # Create Agency tables
            await self._create_agency_tables(conn)
            
            # Create indexes
            await self._create_indexes(conn)
            
            await conn.close()
            logger.info("✅ PostgreSQL setup completed successfully!")
            
        except Exception as e:
            logger.error(f"❌ PostgreSQL setup failed: {str(e)}")
            raise
    
    async def _create_core_tables(self, conn):
        """Create core platform tables"""
        
        # Users table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS core.users (
                user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                phone VARCHAR(50),
                user_type VARCHAR(50) DEFAULT 'customer',
                is_active BOOLEAN DEFAULT TRUE,
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                last_login TIMESTAMP,
                preferences JSONB DEFAULT '{}',
                metadata JSONB DEFAULT '{}'
            )
        """)
        
        # Bookings table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS core.bookings (
                booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                booking_reference VARCHAR(20) UNIQUE NOT NULL,
                user_id UUID REFERENCES core.users(user_id),
                agency_id UUID,
                booking_type VARCHAR(50),
                status VARCHAR(50) DEFAULT 'pending',
                total_amount DECIMAL(10,2),
                currency VARCHAR(3) DEFAULT 'USD',
                payment_status VARCHAR(50),
                booking_data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                confirmed_at TIMESTAMP,
                cancelled_at TIMESTAMP,
                notes TEXT
            )
        """)
        
        logger.info("✅ Created core tables")
    
    async def _create_gds_tables(self, conn):
        """Create GDS integration tables"""
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS gds.providers (
                provider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                provider_name VARCHAR(100) UNIQUE NOT NULL,
                provider_type VARCHAR(50),
                api_endpoint VARCHAR(500),
                credentials JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                supported_services JSONB,
                rate_limits JSONB,
                last_sync TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS gds.search_cache (
                cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                search_hash VARCHAR(64) UNIQUE,
                provider_id UUID REFERENCES gds.providers(provider_id),
                search_type VARCHAR(50),
                search_params JSONB,
                results JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS gds.bookings (
                gds_booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                booking_id UUID REFERENCES core.bookings(booking_id),
                provider_id UUID REFERENCES gds.providers(provider_id),
                provider_reference VARCHAR(100),
                booking_status VARCHAR(50),
                booking_data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        logger.info("✅ Created GDS tables")
    
    async def _create_pms_tables(self, conn):
        """Create PMS tables"""
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS pms.properties (
                property_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                property_name VARCHAR(200) NOT NULL,
                property_type VARCHAR(50),
                address TEXT,
                city VARCHAR(100),
                country VARCHAR(100),
                total_rooms INTEGER,
                amenities JSONB,
                policies JSONB,
                contact_info JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS pms.rooms (
                room_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                property_id UUID REFERENCES pms.properties(property_id),
                room_number VARCHAR(20),
                room_type VARCHAR(50),
                floor INTEGER,
                max_occupancy INTEGER,
                base_rate DECIMAL(10,2),
                status VARCHAR(30) DEFAULT 'available',
                cleaning_status VARCHAR(30) DEFAULT 'clean',
                features JSONB,
                last_cleaned TIMESTAMP,
                next_maintenance TIMESTAMP
            )
        """)
        
        # Housekeeping tables (from our new module)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS pms.housekeeping_tasks (
                task_id UUID PRIMARY KEY,
                room_number VARCHAR(20),
                task_type VARCHAR(50),
                priority VARCHAR(20),
                status VARCHAR(30),
                assigned_to UUID,
                created_at TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                inspected_at TIMESTAMP,
                inspector_id UUID,
                quality_score FLOAT,
                special_instructions TEXT,
                guest_preferences JSONB,
                checklist_completion JSONB,
                photos TEXT[],
                supplies_used JSONB
            )
        """)
        
        # Maintenance tables (from our new module)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS pms.maintenance_assets (
                asset_id UUID PRIMARY KEY,
                name VARCHAR(200),
                category VARCHAR(50),
                location VARCHAR(100),
                model VARCHAR(100),
                serial_number VARCHAR(100) UNIQUE,
                manufacturer VARCHAR(100),
                purchase_date TIMESTAMP,
                warranty_end TIMESTAMP,
                expected_lifetime INTEGER,
                current_condition FLOAT,
                last_maintenance TIMESTAMP,
                next_scheduled TIMESTAMP,
                maintenance_interval INTEGER,
                criticality VARCHAR(20),
                replacement_cost DECIMAL(10,2),
                specifications JSONB,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS pms.maintenance_work_orders (
                order_id UUID PRIMARY KEY,
                title VARCHAR(200),
                description TEXT,
                maintenance_type VARCHAR(50),
                priority VARCHAR(20),
                status VARCHAR(30),
                asset_id UUID REFERENCES pms.maintenance_assets(asset_id),
                location VARCHAR(100),
                requested_by VARCHAR(100),
                assigned_to VARCHAR(100),
                created_at TIMESTAMP,
                scheduled_date TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                verified_at TIMESTAMP,
                estimated_hours FLOAT,
                actual_hours FLOAT,
                estimated_cost DECIMAL(10,2),
                actual_cost DECIMAL(10,2),
                parts_required JSONB,
                vendor_id UUID,
                safety_requirements JSONB,
                completion_notes TEXT,
                photos_before TEXT[],
                photos_after TEXT[],
                guest_impact VARCHAR(20)
            )
        """)
        
        logger.info("✅ Created PMS tables")
    
    async def _create_channel_tables(self, conn):
        """Create Channel Manager tables"""
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS channel.connections (
                connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                property_id UUID,
                channel_name VARCHAR(100),
                channel_type VARCHAR(50),
                api_credentials JSONB,
                mapping_data JSONB,
                sync_settings JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                last_sync TIMESTAMP,
                sync_status VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS channel.inventory_sync (
                sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                connection_id UUID REFERENCES channel.connections(connection_id),
                room_type VARCHAR(100),
                date DATE,
                availability INTEGER,
                rate DECIMAL(10,2),
                min_stay INTEGER,
                max_stay INTEGER,
                closed_to_arrival BOOLEAN DEFAULT FALSE,
                closed_to_departure BOOLEAN DEFAULT FALSE,
                sync_status VARCHAR(30),
                synced_at TIMESTAMP,
                error_message TEXT
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS channel.reservations (
                reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                connection_id UUID REFERENCES channel.connections(connection_id),
                channel_reservation_id VARCHAR(100),
                guest_name VARCHAR(200),
                check_in DATE,
                check_out DATE,
                room_type VARCHAR(100),
                total_amount DECIMAL(10,2),
                commission_amount DECIMAL(10,2),
                status VARCHAR(50),
                reservation_data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                modified_at TIMESTAMP
            )
        """)
        
        logger.info("✅ Created Channel Manager tables")
    
    async def _create_agency_tables(self, conn):
        """Create B2B2C Agency tables"""
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS agency.partners (
                partner_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_name VARCHAR(200) NOT NULL,
                contact_name VARCHAR(100),
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(50),
                partner_tier VARCHAR(50) DEFAULT 'starter',
                commission_rate DECIMAL(5,2),
                credit_limit DECIMAL(10,2),
                current_balance DECIMAL(10,2) DEFAULT 0,
                api_key VARCHAR(100) UNIQUE,
                webhook_url VARCHAR(500),
                is_active BOOLEAN DEFAULT TRUE,
                sandbox_enabled BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                verified_at TIMESTAMP,
                metadata JSONB DEFAULT '{}'
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS agency.commissions (
                commission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                partner_id UUID REFERENCES agency.partners(partner_id),
                booking_id UUID REFERENCES core.bookings(booking_id),
                commission_amount DECIMAL(10,2),
                commission_rate DECIMAL(5,2),
                status VARCHAR(50) DEFAULT 'pending',
                calculated_at TIMESTAMP DEFAULT NOW(),
                paid_at TIMESTAMP,
                payment_reference VARCHAR(100),
                period_start DATE,
                period_end DATE
            )
        """)
        
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS agency.sandbox_instances (
                instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                partner_id UUID REFERENCES agency.partners(partner_id),
                instance_name VARCHAR(100),
                namespace VARCHAR(100) UNIQUE,
                api_endpoint VARCHAR(500),
                database_url VARCHAR(500),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP,
                resources_allocated JSONB
            )
        """)
        
        logger.info("✅ Created Agency tables")
    
    async def _create_indexes(self, conn):
        """Create database indexes for performance"""
        
        indexes = [
            # Core indexes
            "CREATE INDEX IF NOT EXISTS idx_users_email ON core.users(email)",
            "CREATE INDEX IF NOT EXISTS idx_bookings_user ON core.bookings(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_bookings_reference ON core.bookings(booking_reference)",
            "CREATE INDEX IF NOT EXISTS idx_bookings_status ON core.bookings(status)",
            
            # GDS indexes
            "CREATE INDEX IF NOT EXISTS idx_gds_cache_hash ON gds.search_cache(search_hash)",
            "CREATE INDEX IF NOT EXISTS idx_gds_cache_expires ON gds.search_cache(expires_at)",
            
            # PMS indexes
            "CREATE INDEX IF NOT EXISTS idx_rooms_property ON pms.rooms(property_id)",
            "CREATE INDEX IF NOT EXISTS idx_rooms_status ON pms.rooms(status)",
            "CREATE INDEX IF NOT EXISTS idx_housekeeping_room ON pms.housekeeping_tasks(room_number)",
            "CREATE INDEX IF NOT EXISTS idx_housekeeping_status ON pms.housekeeping_tasks(status)",
            "CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON pms.maintenance_work_orders(asset_id)",
            "CREATE INDEX IF NOT EXISTS idx_maintenance_status ON pms.maintenance_work_orders(status)",
            
            # Channel indexes
            "CREATE INDEX IF NOT EXISTS idx_channel_property ON channel.connections(property_id)",
            "CREATE INDEX IF NOT EXISTS idx_inventory_date ON channel.inventory_sync(date)",
            "CREATE INDEX IF NOT EXISTS idx_reservations_dates ON channel.reservations(check_in, check_out)",
            
            # Agency indexes
            "CREATE INDEX IF NOT EXISTS idx_partners_email ON agency.partners(email)",
            "CREATE INDEX IF NOT EXISTS idx_partners_api_key ON agency.partners(api_key)",
            "CREATE INDEX IF NOT EXISTS idx_commissions_partner ON agency.commissions(partner_id)",
            "CREATE INDEX IF NOT EXISTS idx_commissions_status ON agency.commissions(status)"
        ]
        
        for index in indexes:
            await conn.execute(index)
        
        logger.info("✅ Created database indexes")
    
    async def setup_redis(self):
        """Setup Redis with proper configuration"""
        logger.info("🔧 Setting up Redis...")
        
        try:
            # Create Redis connection
            if self.redis_config["password"]:
                redis_url = f"redis://:{self.redis_config['password']}@{self.redis_config['host']}:{self.redis_config['port']}/{self.redis_config['db']}"
            else:
                redis_url = f"redis://{self.redis_config['host']}:{self.redis_config['port']}/{self.redis_config['db']}"
            
            redis = await aioredis.create_redis_pool(redis_url)
            
            # Set initial keys and configurations
            initial_data = {
                # System configuration
                "config:platform_name": "Spirit Tours Platform",
                "config:version": "1.0.0",
                "config:environment": "production",
                
                # Rate limiting configurations
                "ratelimit:api:default": "1000",  # requests per hour
                "ratelimit:api:premium": "5000",
                "ratelimit:gds:search": "100",
                
                # Cache TTL settings (in seconds)
                "cache:ttl:search": "300",  # 5 minutes
                "cache:ttl:availability": "60",  # 1 minute
                "cache:ttl:rates": "1800",  # 30 minutes
                
                # Real-time counters
                "stats:active_users": "0",
                "stats:active_bookings": "0",
                "stats:total_revenue": "0",
                
                # Feature flags
                "feature:ai_tour_designer": "enabled",
                "feature:quantum_optimization": "enabled",
                "feature:blockchain_verification": "enabled",
                "feature:bci_interface": "disabled",
                "feature:space_tourism": "beta"
            }
            
            # Set initial data
            for key, value in initial_data.items():
                await redis.set(key, value)
            
            # Create Redis pub/sub channels
            channels = [
                "notifications",
                "bookings",
                "inventory_updates",
                "maintenance_alerts",
                "housekeeping_tasks",
                "channel_sync",
                "gds_updates",
                "ai_responses"
            ]
            
            logger.info(f"✅ Redis configured with {len(channels)} pub/sub channels")
            
            # Create sorted sets for rankings
            await redis.zadd("rankings:hotels", 0, "placeholder")
            await redis.zadd("rankings:agencies", 0, "placeholder")
            await redis.zadd("rankings:destinations", 0, "placeholder")
            
            # Initialize room status tracking
            room_statuses = {
                "clean": 0,
                "dirty": 0,
                "in_progress": 0,
                "inspected": 0,
                "out_of_order": 0
            }
            
            for status, count in room_statuses.items():
                await redis.hset("room_status_counts", status, count)
            
            redis.close()
            await redis.wait_closed()
            
            logger.info("✅ Redis setup completed successfully!")
            
        except Exception as e:
            logger.error(f"❌ Redis setup failed: {str(e)}")
            raise
    
    async def insert_sample_data(self):
        """Insert sample data for testing"""
        logger.info("📝 Inserting sample data...")
        
        conn = await asyncpg.connect(**self.pg_config)
        
        try:
            # Insert GDS providers
            providers = [
                ("Amadeus", "gds", "https://api.amadeus.com"),
                ("Travelport", "gds", "https://api.travelport.com"),
                ("Hotelbeds", "bedbank", "https://api.hotelbeds.com"),
                ("TBO", "bedbank", "https://api.tboholidays.com"),
                ("Booking.com", "ota", "https://api.booking.com"),
                ("Expedia", "ota", "https://api.expedia.com"),
                ("Airbnb", "ota", "https://api.airbnb.com")
            ]
            
            for name, ptype, endpoint in providers:
                await conn.execute("""
                    INSERT INTO gds.providers (provider_name, provider_type, api_endpoint, is_active)
                    VALUES ($1, $2, $3, TRUE)
                    ON CONFLICT (provider_name) DO NOTHING
                """, name, ptype, endpoint)
            
            # Insert sample properties
            await conn.execute("""
                INSERT INTO pms.properties (
                    property_name, property_type, address, city, country, total_rooms
                ) VALUES 
                ('Spirit Grand Hotel', 'hotel', '123 Main St', 'New York', 'USA', 200),
                ('Spirit Beach Resort', 'resort', '456 Beach Rd', 'Miami', 'USA', 150),
                ('Spirit City Apartments', 'apartment', '789 Urban Ave', 'San Francisco', 'USA', 50)
                ON CONFLICT DO NOTHING
            """)
            
            # Insert sample partner agencies
            await conn.execute("""
                INSERT INTO agency.partners (
                    company_name, contact_name, email, partner_tier, commission_rate
                ) VALUES 
                ('Global Travel Agency', 'John Smith', 'john@globaltravel.com', 'gold', 12.5),
                ('Adventure Tours Inc', 'Sarah Johnson', 'sarah@adventuretours.com', 'silver', 10.0),
                ('City Breaks Ltd', 'Mike Brown', 'mike@citybreaks.com', 'bronze', 7.5)
                ON CONFLICT (email) DO NOTHING
            """)
            
            logger.info("✅ Sample data inserted")
            
        finally:
            await conn.close()
    
    async def run_setup(self):
        """Run complete database setup"""
        logger.info("🚀 Starting Spirit Tours Database Setup...")
        
        # Setup PostgreSQL
        await self.setup_postgresql()
        
        # Setup Redis
        await self.setup_redis()
        
        # Insert sample data
        await self.insert_sample_data()
        
        logger.info("🎉 Database setup completed successfully!")
        
        # Generate configuration file
        await self.generate_config_file()
    
    async def generate_config_file(self):
        """Generate database configuration file"""
        config = {
            "postgresql": self.pg_config,
            "redis": self.redis_config,
            "setup_completed": datetime.utcnow().isoformat(),
            "schemas_created": [
                "core", "gds", "pms", "channel", "ai",
                "analytics", "support", "agency", "quantum", "blockchain"
            ]
        }
        
        with open("/home/user/webapp/backend/config/database_config.json", "w") as f:
            json.dump(config, f, indent=2)
        
        logger.info("✅ Configuration file generated: database_config.json")


# Docker Compose configuration
DOCKER_COMPOSE_CONFIG = """version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: spirittours
      POSTGRES_USER: spirittours_user
      POSTGRES_PASSWORD: secure_password_123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U spirittours_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgadmin:
    image: dpage/pgadmin4:latest
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@spirittours.com
      PGADMIN_DEFAULT_PASSWORD: admin123
    ports:
      - "5050:80"
    depends_on:
      - postgres

  redis-commander:
    image: rediscommander/redis-commander:latest
    environment:
      REDIS_HOSTS: local:redis:6379
    ports:
      - "8081:8081"
    depends_on:
      - redis

volumes:
  postgres_data:
  redis_data:
"""

if __name__ == "__main__":
    # Save Docker Compose file
    with open("/home/user/webapp/docker-compose.yml", "w") as f:
        f.write(DOCKER_COMPOSE_CONFIG)
    
    # Run setup
    setup = DatabaseSetup()
    asyncio.run(setup.run_setup())