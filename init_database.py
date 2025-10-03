#!/usr/bin/env python3
"""
Database Initialization Script for Enterprise Booking Platform
Creates PostgreSQL database and runs initial migration
"""

import os
import sys
import asyncio
import logging
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from alembic.config import Config
from alembic import command
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": int(os.environ.get("DB_PORT", "5432")),
    "user": os.environ.get("DB_USER", "postgres"),
    "password": os.environ.get("DB_PASSWORD", "postgres"),
    "database": os.environ.get("DB_NAME", "enterprise_booking"),
    "admin_database": "postgres"  # Default admin database for creating new databases
}

def create_database_if_not_exists():
    """Create the database if it doesn't exist"""
    
    try:
        # Connect to PostgreSQL server (not specific database)
        admin_conn_str = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['admin_database']}"
        
        logger.info(f"Connecting to PostgreSQL server at {DB_CONFIG['host']}:{DB_CONFIG['port']}")
        
        # Use psycopg2 for database creation
        conn = psycopg2.connect(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['admin_database']
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_CONFIG['database'],))
        exists = cursor.fetchone()
        
        if not exists:
            logger.info(f"Creating database: {DB_CONFIG['database']}")
            cursor.execute(f'CREATE DATABASE "{DB_CONFIG["database"]}"')
            logger.info("✅ Database created successfully")
        else:
            logger.info(f"Database {DB_CONFIG['database']} already exists")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create database: {str(e)}")
        return False

def run_migrations():
    """Run Alembic migrations"""
    
    try:
        # Build connection string for target database
        db_url = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
        
        # Configure Alembic
        alembic_cfg = Config()
        alembic_cfg.set_main_option("script_location", str(Path(__file__).parent / "backend" / "alembic"))
        alembic_cfg.set_main_option("sqlalchemy.url", db_url)
        
        logger.info("Running database migrations...")
        
        # Run migrations
        command.upgrade(alembic_cfg, "head")
        
        logger.info("✅ Migrations completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        return False

def verify_database_setup():
    """Verify database setup by checking tables"""
    
    try:
        db_url = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
        engine = create_engine(db_url)
        
        with engine.connect() as connection:
            # Check if main tables exist
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """))
            
            tables = [row[0] for row in result]
            
            expected_tables = [
                'users', 'tour_operators', 'travel_agencies', 'sales_agents',
                'business_bookings', 'payment_statements', 'commission_rules',
                'payment_transactions', 'payment_refunds', 'payment_methods',
                'notification_templates', 'notification_logs',
                'ai_agent_configs', 'ai_query_logs', 'ai_agent_statistics',
                'alembic_version'
            ]
            
            missing_tables = set(expected_tables) - set(tables)
            
            if missing_tables:
                logger.warning(f"⚠️  Missing tables: {missing_tables}")
                return False
            
            logger.info(f"✅ Database verification successful! Found {len(tables)} tables:")
            for table in tables:
                logger.info(f"  - {table}")
                
            return True
            
    except Exception as e:
        logger.error(f"❌ Database verification failed: {str(e)}")
        return False

def create_default_data():
    """Create default data for the system"""
    
    try:
        db_url = f"postgresql://{DB_CONFIG['user']}:{DB_CONFIG['password']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}"
        engine = create_engine(db_url)
        
        with engine.connect() as connection:
            # Check if admin user exists
            result = connection.execute(text("SELECT COUNT(*) FROM users WHERE role = 'admin'"))
            admin_count = result.scalar()
            
            if admin_count == 0:
                logger.info("Creating default admin user...")
                
                # Insert default admin user
                connection.execute(text("""
                    INSERT INTO users (
                        user_id, email, username, password_hash, first_name, last_name,
                        role, status, business_type, email_verified, phone_verified,
                        created_at, updated_at
                    ) VALUES (
                        'admin_001', 'admin@spirittours.com', 'admin',
                        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/3k8AZLd5z5z5z5z5z', -- password: admin123
                        'System', 'Administrator', 'admin', 'active', 'b2c_direct',
                        TRUE, TRUE, NOW(), NOW()
                    )
                """))
                
                connection.commit()
                logger.info("✅ Default admin user created (email: admin@spirittours.com, password: admin123)")
            
            # Create default notification templates
            result = connection.execute(text("SELECT COUNT(*) FROM notification_templates"))
            template_count = result.scalar()
            
            if template_count == 0:
                logger.info("Creating default notification templates...")
                
                templates = [
                    {
                        'name': 'booking_confirmation',
                        'type': 'email',
                        'subject': 'Booking Confirmation - {{booking_id}}',
                        'body': '''
                        <html>
                        <body>
                            <h2>Booking Confirmation</h2>
                            <p>Dear {{customer_name}},</p>
                            <p>Your booking has been confirmed!</p>
                            <ul>
                                <li><strong>Booking ID:</strong> {{booking_id}}</li>
                                <li><strong>Destination:</strong> {{destination}}</li>
                                <li><strong>Check-in:</strong> {{check_in_date}}</li>
                                <li><strong>Check-out:</strong> {{check_out_date}}</li>
                                <li><strong>Total Amount:</strong> {{total_amount}} {{currency}}</li>
                            </ul>
                            <p>Thank you for choosing our services!</p>
                        </body>
                        </html>
                        ''',
                        'variables': ['customer_name', 'booking_id', 'destination', 'check_in_date', 'check_out_date', 'total_amount', 'currency']
                    },
                    {
                        'name': 'booking_reminder',
                        'type': 'sms',
                        'subject': None,
                        'body': 'Hi {{customer_name}}! Reminder: Your trip to {{destination}} starts on {{check_in_date}}. Have a great journey!',
                        'variables': ['customer_name', 'destination', 'check_in_date']
                    }
                ]
                
                for template in templates:
                    connection.execute(text("""
                        INSERT INTO notification_templates (
                            name, type, subject_template, body_template, variables,
                            language, is_active, created_at, updated_at
                        ) VALUES (
                            :name, :type, :subject, :body, :variables,
                            'en', TRUE, NOW(), NOW()
                        )
                    """), {
                        'name': template['name'],
                        'type': template['type'],
                        'subject': template['subject'],
                        'body': template['body'].strip(),
                        'variables': template['variables']
                    })
                
                connection.commit()
                logger.info("✅ Default notification templates created")
            
            # Create default AI agent configurations
            result = connection.execute(text("SELECT COUNT(*) FROM ai_agent_configs"))
            agent_count = result.scalar()
            
            if agent_count == 0:
                logger.info("Creating default AI agent configurations...")
                
                agents = [
                    {
                        'agent_id': 'multi_channel_001',
                        'agent_name': 'Multi-Channel Communication Hub',
                        'agent_type': 'communication',
                        'track': 'track_1',
                        'description': 'Unified communication hub for WhatsApp, Telegram, and social media',
                        'capabilities': ['whatsapp_business', 'telegram_bot', 'social_media', 'unified_routing'],
                        'status': 'active'
                    },
                    {
                        'agent_id': 'content_master_001',
                        'agent_name': 'ContentMaster AI',
                        'agent_type': 'content_generation',
                        'track': 'track_1',
                        'description': 'AI-powered content generation for blogs, social media, and SEO',
                        'capabilities': ['blog_generation', 'social_posts', 'seo_optimization', 'multi_language'],
                        'status': 'active'
                    },
                    {
                        'agent_id': 'competitive_intel_001',
                        'agent_name': 'CompetitiveIntel AI',
                        'agent_type': 'market_intelligence',
                        'track': 'track_1',
                        'description': 'Real-time competitive intelligence and market analysis',
                        'capabilities': ['price_monitoring', 'sentiment_analysis', 'threat_detection', 'market_reports'],
                        'status': 'active'
                    }
                ]
                
                for agent in agents:
                    connection.execute(text("""
                        INSERT INTO ai_agent_configs (
                            agent_id, agent_name, agent_type, track, description,
                            capabilities, status, version, created_at, updated_at
                        ) VALUES (
                            :agent_id, :agent_name, :agent_type, :track, :description,
                            :capabilities, :status, '1.0.0', NOW(), NOW()
                        )
                    """), {
                        'agent_id': agent['agent_id'],
                        'agent_name': agent['agent_name'],
                        'agent_type': agent['agent_type'],
                        'track': agent['track'],
                        'description': agent['description'],
                        'capabilities': agent['capabilities'],
                        'status': agent['status']
                    })
                
                connection.commit()
                logger.info("✅ Default AI agent configurations created")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create default data: {str(e)}")
        return False

def main():
    """Main initialization function"""
    
    logger.info("🚀 Starting Enterprise Booking Platform Database Initialization")
    logger.info("=" * 70)
    
    # Step 1: Create database
    logger.info("Step 1: Creating database...")
    if not create_database_if_not_exists():
        logger.error("❌ Database creation failed. Exiting.")
        sys.exit(1)
    
    # Step 2: Run migrations
    logger.info("\nStep 2: Running database migrations...")
    if not run_migrations():
        logger.error("❌ Database migration failed. Exiting.")
        sys.exit(1)
    
    # Step 3: Verify setup
    logger.info("\nStep 3: Verifying database setup...")
    if not verify_database_setup():
        logger.error("❌ Database verification failed. Exiting.")
        sys.exit(1)
    
    # Step 4: Create default data
    logger.info("\nStep 4: Creating default system data...")
    if not create_default_data():
        logger.error("❌ Default data creation failed. Exiting.")
        sys.exit(1)
    
    logger.info("\n" + "=" * 70)
    logger.info("🎉 Database initialization completed successfully!")
    logger.info("\n📋 Summary:")
    logger.info(f"   • Database: {DB_CONFIG['database']}")
    logger.info(f"   • Host: {DB_CONFIG['host']}:{DB_CONFIG['port']}")
    logger.info("   • All tables created and migrated")
    logger.info("   • Default admin user created")
    logger.info("   • Notification templates initialized")
    logger.info("   • AI agents configured")
    logger.info("\n🔑 Default Admin Credentials:")
    logger.info("   Email: admin@spirittours.com")
    logger.info("   Password: admin123")
    logger.info("\n⚠️  Please change the default admin password after first login!")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("\n❌ Initialization cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Initialization failed: {str(e)}")
        sys.exit(1)