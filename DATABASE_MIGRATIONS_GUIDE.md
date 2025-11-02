# 🗄️ SPIRIT TOURS - DATABASE MIGRATIONS GUIDE

**Version**: 1.0.0  
**Date**: 2025-11-01  
**Status**: ✅ Production Ready

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Quick Start](#quick-start)
5. [Migration Commands](#migration-commands)
6. [Database Schema](#database-schema)
7. [Seed Data](#seed-data)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Usage](#advanced-usage)

---

## 📊 OVERVIEW

The Spirit Tours database migration system uses **Alembic** (SQLAlchemy's migration tool) to manage database schema changes in a version-controlled, reproducible manner.

### Key Features

✅ **Version Control** - Track all database schema changes  
✅ **Rollback Support** - Safe downgrade procedures  
✅ **Seed Data** - Populate with realistic test data  
✅ **Backup & Restore** - Complete database backup tools  
✅ **Environment Support** - Development, staging, production  
✅ **Automated Testing** - Verify migrations before deployment  

### Components

```
backend/
├── alembic/                    # Alembic configuration
│   ├── env.py                  # Environment setup (updated with all models)
│   └── versions/               # Migration scripts
│       ├── 001_initial_migration.py
│       ├── 002_social_media_system.py
│       ├── 003_scheduled_posts.py
│       ├── 004_email_system.py
│       └── 005_complete_schema_migration.py  # ✨ NEW
├── database/
│   └── seeds.py                # Seed data script (✨ NEW)
├── scripts/
│   └── db_migrate.sh           # Migration management CLI (✨ NEW)
└── alembic.ini                 # Alembic configuration file
```

---

## 🏗️ ARCHITECTURE

### Migration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE MIGRATION FLOW                   │
└─────────────────────────────────────────────────────────────┘

1. Development
   │
   ├─► Create Models (SQLAlchemy)
   │   └─► backend/models/*.py
   │
   ├─► Generate Migration
   │   └─► alembic revision --autogenerate -m "message"
   │
   ├─► Review Migration
   │   └─► alembic/versions/XXX_message.py
   │
   └─► Test Locally
       └─► scripts/db_migrate.sh upgrade

2. Version Control
   │
   └─► Commit Migration
       └─► git add alembic/versions/
       └─► git commit -m "feat(db): add new tables"

3. Deployment
   │
   ├─► Backup Database
   │   └─► scripts/db_migrate.sh backup
   │
   ├─► Apply Migration
   │   └─► scripts/db_migrate.sh upgrade
   │
   └─► Verify Schema
       └─► scripts/db_migrate.sh status

4. Rollback (if needed)
   │
   └─► Downgrade Migration
       └─► scripts/db_migrate.sh downgrade
```

### Database Schema Overview

```sql
-- Core Business Models
├── tour_operators          # B2B operators
├── travel_agencies         # B2B agencies
├── users                   # User management
└── permissions             # Access control

-- Operations
├── reservations            # Booking management
├── operations_log          # Operations tracking
├── operational_checklist   # Task management
└── trips                   # Trip management

-- Guides & Transport
├── guides                  # Tour guide management
├── guide_assignments       # Guide scheduling
├── vehicles                # Fleet management
├── drivers                 # Driver management
└── transport_assignments   # Transport scheduling

-- Financial
├── quotations             # Quote management
├── quotation_items        # Quote line items
├── package_quotations     # Package deals
├── accounts               # Chart of accounts
├── transactions           # Financial transactions
└── invoices               # Invoicing

-- CRM & Sales
├── leads                  # Lead management
├── interactions           # Customer interactions
└── contacts               # Contact database

-- Reporting
├── reports                # Report definitions
└── report_executions      # Report history

-- Marketplace
├── marketplace_products   # Product catalog
├── raffles               # Raffle campaigns
└── raffle_tickets        # Raffle entries
```

---

## 💻 INSTALLATION

### Prerequisites

```bash
# Python 3.8+
python3 --version

# PostgreSQL 12+
psql --version

# pip packages
pip install alembic sqlalchemy psycopg2-binary
```

### Setup

1. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure Database**
   ```bash
   # Set environment variables
   export DATABASE_URL="postgresql://user:pass@localhost:5432/db_name"
   
   # Or use individual variables
   export DB_HOST="localhost"
   export DB_PORT="5432"
   export DB_NAME="spirittours_db"
   export DB_USER="spirittours"
   export DB_PASSWORD="spirit2024"
   ```

3. **Initialize Alembic** (already done)
   ```bash
   # Already configured, but for reference:
   # alembic init alembic
   ```

4. **Verify Setup**
   ```bash
   ./scripts/db_migrate.sh status
   ```

---

## 🚀 QUICK START

### First Time Setup

```bash
# 1. Check database connection
./scripts/db_migrate.sh status

# 2. Apply all migrations
./scripts/db_migrate.sh upgrade

# 3. Seed with test data
./scripts/db_migrate.sh seed

# 4. Verify
./scripts/db_migrate.sh status
```

### Daily Development

```bash
# Check current state
./scripts/db_migrate.sh status

# Create new migration after model changes
./scripts/db_migrate.sh create "add user preferences table"

# Apply migrations
./scripts/db_migrate.sh upgrade

# If something goes wrong
./scripts/db_migrate.sh downgrade -1
```

---

## 🔧 MIGRATION COMMANDS

### Status Commands

```bash
# Show current migration status
./scripts/db_migrate.sh status

# Show migration history
alembic history --verbose
```

### Upgrade Commands

```bash
# Upgrade to latest (head)
./scripts/db_migrate.sh upgrade

# Upgrade to specific migration
./scripts/db_migrate.sh upgrade 005_complete_schema

# Upgrade one step at a time
./scripts/db_migrate.sh upgrade +1
```

### Downgrade Commands

```bash
# Downgrade one step
./scripts/db_migrate.sh downgrade -1

# Downgrade to specific migration
./scripts/db_migrate.sh downgrade 004_email_system

# Downgrade to base (remove all)
./scripts/db_migrate.sh downgrade base
```

### Create New Migration

```bash
# Auto-generate from model changes
./scripts/db_migrate.sh create "add payment gateway integration"

# Manual migration (empty template)
alembic revision -m "custom complex migration"
```

### Seed Data

```bash
# Seed with cleanup
./scripts/db_migrate.sh seed

# Seed without cleanup (append data)
./scripts/db_migrate.sh seed --no-cleanup

# Direct Python execution
python3 database/seeds.py
```

### Backup & Restore

```bash
# Create backup
./scripts/db_migrate.sh backup
# Output: backups/spirittours_backup_20251101_143022.sql.gz

# Restore from backup
./scripts/db_migrate.sh restore backups/spirittours_backup_20251101_143022.sql.gz
```

### Reset Database

```bash
# Complete reset (downgrade + upgrade + seed)
./scripts/db_migrate.sh reset
# ⚠️ WARNING: This will delete ALL data!
```

---

## 📦 DATABASE SCHEMA

### Core Tables Created

#### 1. Operations Module

**reservations**
```sql
- id (UUID)
- reservation_code (VARCHAR, UNIQUE)
- customer_name, customer_email, customer_phone
- number_of_passengers (INTEGER)
- booking_date, tour_date (TIMESTAMP, DATE)
- status, payment_status (VARCHAR)
- total_amount (DECIMAL)
- created_at, updated_at (TIMESTAMP)
```

**operations_log**
```sql
- id (UUID)
- reservation_id (FK → reservations)
- operation_type, operation_status
- performed_by (UUID)
- details (JSONB)
- created_at (TIMESTAMP)
```

**operational_checklist**
```sql
- id (UUID)
- reservation_id (FK → reservations)
- checklist_type (VARCHAR)
- items, completed_items (JSONB)
- completion_percentage (DECIMAL)
- assigned_to (UUID)
- due_date, completed_at (TIMESTAMP)
```

#### 2. Quotations Module

**quotations**
```sql
- id (UUID)
- quotation_number (VARCHAR, UNIQUE)
- customer_name, customer_email
- destination, departure_date, return_date
- number_of_passengers (INTEGER)
- subtotal, taxes, discounts, total_amount (DECIMAL)
- status, currency (VARCHAR)
- valid_until (DATE)
- created_at, updated_at (TIMESTAMP)
```

**quotation_items**
```sql
- id (UUID)
- quotation_id (FK → quotations)
- item_type, description
- quantity, unit_price, total_price
- tour_id, service_id (UUID)
```

**package_quotations**
```sql
- id (UUID)
- package_code (VARCHAR, UNIQUE)
- package_name, description
- duration_days (INTEGER)
- included_services, optional_services (JSONB)
- package_price, optional_services_price, total_price (DECIMAL)
- status, currency (VARCHAR)
```

#### 3. Guide Management

**guides**
```sql
- id (UUID)
- guide_code (VARCHAR, UNIQUE)
- first_name, last_name, email, phone
- languages, specializations (JSONB)
- certification, license_number
- rating (DECIMAL), total_tours (INTEGER)
- is_active (BOOLEAN)
```

**guide_assignments**
```sql
- id (UUID)
- guide_id (FK → guides)
- reservation_id (FK → reservations)
- tour_date (DATE)
- assignment_status (VARCHAR)
```

#### 4. Trips Management

**trips**
```sql
- id (UUID)
- trip_code (VARCHAR, UNIQUE)
- trip_name, description, destination
- departure_date, return_date (DATE)
- max_capacity, booked_seats, available_seats (INTEGER)
- price_per_person (DECIMAL)
- status (VARCHAR)
- itinerary (JSONB)
```

**trip_participants**
```sql
- id (UUID)
- trip_id (FK → trips)
- reservation_id (FK → reservations)
- passenger_name, passenger_email
- check_in_status (VARCHAR)
```

#### 5. Transport Module

**vehicles**
```sql
- id (UUID)
- vehicle_code (VARCHAR, UNIQUE)
- vehicle_type, make, model
- license_plate (VARCHAR, UNIQUE)
- capacity (INTEGER)
- status (VARCHAR)
- insurance_expiry, registration_expiry (DATE)
```

**drivers**
```sql
- id (UUID)
- driver_code (VARCHAR, UNIQUE)
- first_name, last_name, email, phone
- license_number (VARCHAR, UNIQUE)
- license_expiry (DATE)
- rating (DECIMAL), total_trips (INTEGER)
```

**transport_assignments**
```sql
- id (UUID)
- trip_id (FK → trips)
- vehicle_id (FK → vehicles)
- driver_id (FK → drivers)
- assignment_date (DATE)
- pickup_location, dropoff_location (VARCHAR)
- status (VARCHAR)
```

#### 6. Accounting Module

**accounts**
```sql
- id (UUID)
- account_code (VARCHAR, UNIQUE)
- account_name, account_type
- balance (DECIMAL)
- currency (VARCHAR)
```

**transactions**
```sql
- id (UUID)
- transaction_number (VARCHAR, UNIQUE)
- transaction_date (DATE)
- transaction_type (VARCHAR)
- debit_account_id, credit_account_id (FK → accounts)
- amount (DECIMAL)
- reference_type, reference_id (VARCHAR, UUID)
```

**invoices**
```sql
- id (UUID)
- invoice_number (VARCHAR, UNIQUE)
- customer_name, customer_email
- invoice_date, due_date (DATE)
- items (JSONB)
- subtotal, tax_amount, total_amount (DECIMAL)
- paid_amount, balance (DECIMAL)
- status (VARCHAR)
```

#### 7. CRM Module

**leads**
```sql
- id (UUID)
- first_name, last_name, email, phone
- lead_source, lead_status, interest_level
- converted_to_customer (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

**interactions**
```sql
- id (UUID)
- customer_id, lead_id (UUID)
- interaction_type, interaction_date
- subject, description, outcome
- next_action, next_action_date
```

**contacts**
```sql
- id (UUID)
- contact_type, first_name, last_name
- email, phone, company, position
- address, city, state, country
- tags (JSONB)
```

#### 8. Additional Modules

**reports**, **report_executions**  
**marketplace_products**  
**raffles**, **raffle_tickets**

### Indexes Created

All tables include performance indexes on:
- Primary keys (UUID)
- Unique constraints (codes, emails, license plates)
- Foreign keys
- Status fields
- Date fields (for range queries)
- Email fields (for lookups)

---

## 🌱 SEED DATA

The seed script (`database/seeds.py`) populates the database with realistic test data:

### Data Created

- **4 Guides** - Licensed tour guides with specializations
- **4 Trips** - Scheduled tours to various destinations
- **8 Reservations** - Customer bookings with various statuses
- **3 Quotations** - Quote requests (draft, sent, accepted)
- **4 Vehicles** - Fleet of buses and vans
- **3 Drivers** - Licensed professional drivers
- **5 Accounts** - Chart of accounts for financial tracking
- **3 Leads** - CRM leads with different sources

### Running Seeds

```bash
# Clean existing test data and seed
./scripts/db_migrate.sh seed

# Append seed data without cleanup
./scripts/db_migrate.sh seed --no-cleanup

# Direct Python execution
python3 database/seeds.py
python3 database/seeds.py --no-cleanup
```

### Customizing Seeds

Edit `backend/database/seeds.py` to:
- Add more realistic data
- Customize data for your environment
- Create specific test scenarios

---

## 🛡️ BEST PRACTICES

### 1. Always Review Generated Migrations

```bash
# After creating migration
./scripts/db_migrate.sh create "add feature"

# Review the generated file
cat alembic/versions/XXX_add_feature.py

# Test locally before committing
./scripts/db_migrate.sh upgrade
```

### 2. Backup Before Major Changes

```bash
# Always backup before production migrations
./scripts/db_migrate.sh backup

# Then apply
./scripts/db_migrate.sh upgrade
```

### 3. Test Rollback Procedures

```bash
# Test downgrade locally
./scripts/db_migrate.sh upgrade
./scripts/db_migrate.sh downgrade -1
./scripts/db_migrate.sh upgrade

# Verify data integrity
```

### 4. Use Transactions

All migrations run in transactions by default. Keep migrations:
- **Atomic** - Single purpose
- **Reversible** - Always provide downgrade
- **Tested** - Verify both upgrade and downgrade

### 5. Version Control

```bash
# Commit migrations with descriptive messages
git add alembic/versions/005_complete_schema.py
git commit -m "feat(db): add complete schema for all modules"

# Include in pull requests
git push origin feature/database-migrations
```

### 6. Environment-Specific Data

```python
# In seeds.py or migrations
import os

if os.getenv('ENV') == 'production':
    # Minimal data for production
    pass
else:
    # Full test data for dev/staging
    pass
```

---

## 🔍 TROUBLESHOOTING

### Common Issues

#### 1. "Can't connect to database"

```bash
# Check connection
psql -h localhost -U spirittours -d spirittours_db

# Verify environment variables
echo $DATABASE_URL

# Test connection
python3 -c "from sqlalchemy import create_engine; engine = create_engine('$DATABASE_URL'); engine.connect()"
```

#### 2. "Migrations out of sync"

```bash
# Check current state
./scripts/db_migrate.sh status

# If database is ahead
./scripts/db_migrate.sh downgrade <last_known_good>

# If code is ahead
./scripts/db_migrate.sh upgrade
```

#### 3. "Alembic command not found"

```bash
# Install alembic
pip install alembic

# Or use python module
python3 -m alembic --help
```

#### 4. "Migration fails halfway"

```bash
# Alembic uses transactions, so it should rollback automatically

# Check database state
./scripts/db_migrate.sh status

# If needed, manually downgrade
./scripts/db_migrate.sh downgrade -1

# Fix the migration file
vim alembic/versions/XXX_failed_migration.py

# Try again
./scripts/db_migrate.sh upgrade
```

#### 5. "Duplicate key errors in seeds"

```bash
# Clean data first
./scripts/db_migrate.sh seed  # Includes automatic cleanup

# Or reset completely
./scripts/db_migrate.sh reset
```

---

## 🚀 ADVANCED USAGE

### Branching Migrations

```bash
# Create parallel branches
alembic revision -m "feature_a"
alembic revision -m "feature_b"

# Merge branches
alembic merge <rev1> <rev2> -m "merge features"
```

### Custom Migration

```python
# alembic/versions/XXX_custom.py
def upgrade():
    # Custom SQL
    op.execute("""
        CREATE INDEX CONCURRENTLY idx_custom 
        ON table_name (column_name)
    """)
    
    # Data migration
    connection = op.get_bind()
    connection.execute(text("""
        UPDATE users 
        SET status = 'active' 
        WHERE last_login > NOW() - INTERVAL '30 days'
    """))

def downgrade():
    op.execute("DROP INDEX IF EXISTS idx_custom")
```

### Offline Migrations (SQL Export)

```bash
# Generate SQL without applying
alembic upgrade head --sql > migration.sql

# Review SQL
cat migration.sql

# Apply manually
psql -f migration.sql
```

### Multi-Database Support

```python
# alembic/env.py
def run_migrations_online():
    # Get database from environment
    db_url = os.getenv('DATABASE_URL')
    
    connectable = engine_from_config(
        {'sqlalchemy.url': db_url},
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )
    # ... rest of configuration
```

---

## 📚 RESOURCES

### Documentation

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/en/14/orm/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### Project Files

- `alembic/env.py` - Alembic environment configuration
- `alembic.ini` - Alembic settings
- `alembic/versions/` - All migration scripts
- `database/seeds.py` - Seed data script
- `scripts/db_migrate.sh` - CLI tool

---

## ✅ MIGRATION CHECKLIST

### Before Deploying

- [ ] All migrations reviewed and tested locally
- [ ] Both upgrade and downgrade tested
- [ ] Seed data verified
- [ ] Backup created
- [ ] Deployment plan documented
- [ ] Rollback plan ready
- [ ] Team notified

### During Deployment

- [ ] Application stopped (if needed)
- [ ] Backup verified
- [ ] Migrations applied
- [ ] Status verified
- [ ] Application started
- [ ] Health checks passed

### After Deployment

- [ ] Data integrity verified
- [ ] Performance monitored
- [ ] Logs checked
- [ ] Team notified
- [ ] Documentation updated

---

## 🎯 QUICK REFERENCE

```bash
# Essential Commands
./scripts/db_migrate.sh status        # Check status
./scripts/db_migrate.sh upgrade       # Apply migrations
./scripts/db_migrate.sh downgrade -1  # Rollback one step
./scripts/db_migrate.sh seed          # Load test data
./scripts/db_migrate.sh backup        # Create backup
./scripts/db_migrate.sh help          # Show help

# Development Workflow
./scripts/db_migrate.sh create "message"  # New migration
./scripts/db_migrate.sh upgrade           # Test migration
./scripts/db_migrate.sh downgrade -1      # Test rollback
git add alembic/versions/                 # Commit
git commit -m "feat(db): description"

# Emergency Procedures
./scripts/db_migrate.sh backup            # Backup NOW
./scripts/db_migrate.sh downgrade -1      # Rollback
./scripts/db_migrate.sh restore <file>    # Restore backup
```

---

**Created by**: AI Assistant  
**Date**: 2025-11-01  
**Version**: 1.0.0  
**Status**: ✅ Production Ready

**Next Steps**: [NEXT_STEPS_IMPLEMENTATION_REPORT.md](NEXT_STEPS_IMPLEMENTATION_REPORT.md)
