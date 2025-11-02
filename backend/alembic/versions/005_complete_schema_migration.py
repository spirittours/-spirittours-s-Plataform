"""Complete schema migration for all Spirit Tours models

Revision ID: 005_complete_schema
Revises: 004_email_system
Create Date: 2025-11-01 20:00:00.000000

This migration creates all missing tables for the complete Spirit Tours system including:
- Operations management
- Quotations and package quotations  
- Guide management
- Trips management
- Accounting models
- Transport models
- Reports models
- Access control models
- Affiliate models
- Contact management
- CRM models
- Marketplace models
- Raffle models
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '005_complete_schema'
down_revision = '004_email_system'
branch_labels = None
depends_on = None


def upgrade():
    """Upgrade database schema - Create all remaining tables"""
    
    # ==========================================
    # OPERATIONS MODELS
    # ==========================================
    
    # Create reservations table if not exists
    op.execute("""
        CREATE TABLE IF NOT EXISTS reservations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reservation_code VARCHAR(50) UNIQUE NOT NULL,
            tour_id UUID,
            customer_name VARCHAR(200) NOT NULL,
            customer_email VARCHAR(100) NOT NULL,
            customer_phone VARCHAR(20),
            number_of_passengers INTEGER DEFAULT 1,
            booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            tour_date DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            total_amount DECIMAL(10, 2),
            payment_status VARCHAR(50) DEFAULT 'pending',
            special_requests TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID,
            updated_by UUID
        )
    """)
    
    # Create operations_log table
    op.execute("""
        CREATE TABLE IF NOT EXISTS operations_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
            operation_type VARCHAR(100) NOT NULL,
            operation_status VARCHAR(50) DEFAULT 'pending',
            performed_by UUID,
            performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            details JSONB,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # Create operational_checklist table
    op.execute("""
        CREATE TABLE IF NOT EXISTS operational_checklist (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
            checklist_type VARCHAR(100) NOT NULL,
            items JSONB NOT NULL,
            completed_items JSONB DEFAULT '[]'::jsonb,
            completion_percentage DECIMAL(5, 2) DEFAULT 0.0,
            assigned_to UUID,
            due_date TIMESTAMP WITH TIME ZONE,
            completed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # ==========================================
    # QUOTATION MODELS
    # ==========================================
    
    # Create quotations table
    op.execute("""
        CREATE TABLE IF NOT EXISTS quotations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            quotation_number VARCHAR(50) UNIQUE NOT NULL,
            customer_id UUID,
            customer_name VARCHAR(200) NOT NULL,
            customer_email VARCHAR(100) NOT NULL,
            customer_phone VARCHAR(20),
            destination VARCHAR(200) NOT NULL,
            departure_date DATE,
            return_date DATE,
            number_of_passengers INTEGER DEFAULT 1,
            budget_range VARCHAR(100),
            special_requirements TEXT,
            status VARCHAR(50) DEFAULT 'draft',
            items JSONB DEFAULT '[]'::jsonb,
            subtotal DECIMAL(12, 2) DEFAULT 0.0,
            taxes DECIMAL(12, 2) DEFAULT 0.0,
            discounts DECIMAL(12, 2) DEFAULT 0.0,
            total_amount DECIMAL(12, 2) DEFAULT 0.0,
            currency VARCHAR(3) DEFAULT 'USD',
            valid_until DATE,
            notes TEXT,
            terms_and_conditions TEXT,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            sent_at TIMESTAMP WITH TIME ZONE,
            accepted_at TIMESTAMP WITH TIME ZONE,
            rejected_at TIMESTAMP WITH TIME ZONE,
            rejection_reason TEXT
        )
    """)
    
    # Create quotation_items table
    op.execute("""
        CREATE TABLE IF NOT EXISTS quotation_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
            item_type VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            unit_price DECIMAL(10, 2) NOT NULL,
            total_price DECIMAL(10, 2) NOT NULL,
            tour_id UUID,
            service_id UUID,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # Create package_quotations table
    op.execute("""
        CREATE TABLE IF NOT EXISTS package_quotations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            package_code VARCHAR(50) UNIQUE NOT NULL,
            package_name VARCHAR(200) NOT NULL,
            description TEXT,
            duration_days INTEGER NOT NULL,
            destination VARCHAR(200) NOT NULL,
            customer_id UUID,
            customer_name VARCHAR(200) NOT NULL,
            customer_email VARCHAR(100) NOT NULL,
            start_date DATE,
            end_date DATE,
            number_of_passengers INTEGER DEFAULT 1,
            included_services JSONB DEFAULT '[]'::jsonb,
            optional_services JSONB DEFAULT '[]'::jsonb,
            package_price DECIMAL(12, 2) NOT NULL,
            optional_services_price DECIMAL(12, 2) DEFAULT 0.0,
            total_price DECIMAL(12, 2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'USD',
            status VARCHAR(50) DEFAULT 'draft',
            valid_until DATE,
            itinerary JSONB,
            terms_and_conditions TEXT,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # ==========================================
    # GUIDE MODELS
    # ==========================================
    
    # Create guides table
    op.execute("""
        CREATE TABLE IF NOT EXISTS guides (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            guide_code VARCHAR(50) UNIQUE NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            phone VARCHAR(20),
            languages JSONB DEFAULT '[]'::jsonb,
            specializations JSONB DEFAULT '[]'::jsonb,
            certification VARCHAR(200),
            certification_expiry DATE,
            license_number VARCHAR(100),
            license_expiry DATE,
            bio TEXT,
            rating DECIMAL(3, 2) DEFAULT 0.0,
            total_tours INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            availability JSONB,
            profile_photo_url VARCHAR(500),
            emergency_contact JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # Create guide_assignments table
    op.execute("""
        CREATE TABLE IF NOT EXISTS guide_assignments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            guide_id UUID REFERENCES guides(id) ON DELETE CASCADE,
            reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
            tour_date DATE NOT NULL,
            assignment_status VARCHAR(50) DEFAULT 'assigned',
            notes TEXT,
            confirmed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # Create guide_availability table
    op.execute("""
        CREATE TABLE IF NOT EXISTS guide_availability (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            guide_id UUID REFERENCES guides(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            is_available BOOLEAN DEFAULT TRUE,
            reason VARCHAR(200),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(guide_id, date)
        )
    """)
    
    # ==========================================
    # TRIPS MODELS
    # ==========================================
    
    # Create trips table
    op.execute("""
        CREATE TABLE IF NOT EXISTS trips (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            trip_code VARCHAR(50) UNIQUE NOT NULL,
            trip_name VARCHAR(200) NOT NULL,
            description TEXT,
            destination VARCHAR(200) NOT NULL,
            departure_location VARCHAR(200),
            departure_date DATE NOT NULL,
            return_date DATE NOT NULL,
            duration_days INTEGER NOT NULL,
            max_capacity INTEGER NOT NULL,
            booked_seats INTEGER DEFAULT 0,
            available_seats INTEGER NOT NULL,
            price_per_person DECIMAL(10, 2) NOT NULL,
            status VARCHAR(50) DEFAULT 'scheduled',
            itinerary JSONB,
            included_services JSONB DEFAULT '[]'::jsonb,
            excluded_services JSONB DEFAULT '[]'::jsonb,
            requirements TEXT,
            cancellation_policy TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID,
            updated_by UUID
        )
    """)
    
    # Create trip_participants table
    op.execute("""
        CREATE TABLE IF NOT EXISTS trip_participants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
            reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
            passenger_name VARCHAR(200) NOT NULL,
            passenger_email VARCHAR(100),
            passenger_phone VARCHAR(20),
            passenger_document VARCHAR(100),
            special_requirements TEXT,
            check_in_status VARCHAR(50) DEFAULT 'pending',
            checked_in_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # ==========================================
    # ACCOUNTING MODELS
    # ==========================================
    
    # Create accounts table
    op.execute("""
        CREATE TABLE IF NOT EXISTS accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            account_code VARCHAR(50) UNIQUE NOT NULL,
            account_name VARCHAR(200) NOT NULL,
            account_type VARCHAR(50) NOT NULL,
            parent_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
            balance DECIMAL(15, 2) DEFAULT 0.0,
            currency VARCHAR(3) DEFAULT 'USD',
            is_active BOOLEAN DEFAULT TRUE,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # Create transactions table
    op.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            transaction_number VARCHAR(50) UNIQUE NOT NULL,
            transaction_date DATE NOT NULL,
            transaction_type VARCHAR(50) NOT NULL,
            debit_account_id UUID REFERENCES accounts(id),
            credit_account_id UUID REFERENCES accounts(id),
            amount DECIMAL(15, 2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'USD',
            description TEXT,
            reference_type VARCHAR(50),
            reference_id UUID,
            status VARCHAR(50) DEFAULT 'posted',
            posted_by UUID,
            posted_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # Create invoices table
    op.execute("""
        CREATE TABLE IF NOT EXISTS invoices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_number VARCHAR(50) UNIQUE NOT NULL,
            customer_id UUID,
            customer_name VARCHAR(200) NOT NULL,
            customer_email VARCHAR(100),
            customer_address TEXT,
            invoice_date DATE NOT NULL,
            due_date DATE NOT NULL,
            items JSONB DEFAULT '[]'::jsonb,
            subtotal DECIMAL(12, 2) NOT NULL,
            tax_amount DECIMAL(12, 2) DEFAULT 0.0,
            discount_amount DECIMAL(12, 2) DEFAULT 0.0,
            total_amount DECIMAL(12, 2) NOT NULL,
            paid_amount DECIMAL(12, 2) DEFAULT 0.0,
            balance DECIMAL(12, 2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'USD',
            status VARCHAR(50) DEFAULT 'draft',
            payment_terms TEXT,
            notes TEXT,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            sent_at TIMESTAMP WITH TIME ZONE,
            paid_at TIMESTAMP WITH TIME ZONE
        )
    """)
    
    # ==========================================
    # TRANSPORT MODELS
    # ==========================================
    
    # Create vehicles table
    op.execute("""
        CREATE TABLE IF NOT EXISTS vehicles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            vehicle_code VARCHAR(50) UNIQUE NOT NULL,
            vehicle_type VARCHAR(50) NOT NULL,
            make VARCHAR(100),
            model VARCHAR(100),
            year INTEGER,
            license_plate VARCHAR(50) UNIQUE NOT NULL,
            capacity INTEGER NOT NULL,
            status VARCHAR(50) DEFAULT 'available',
            features JSONB DEFAULT '[]'::jsonb,
            insurance_policy VARCHAR(100),
            insurance_expiry DATE,
            registration_expiry DATE,
            last_maintenance DATE,
            next_maintenance DATE,
            mileage INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # Create drivers table
    op.execute("""
        CREATE TABLE IF NOT EXISTS drivers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            driver_code VARCHAR(50) UNIQUE NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE,
            phone VARCHAR(20) NOT NULL,
            license_number VARCHAR(100) UNIQUE NOT NULL,
            license_type VARCHAR(50),
            license_expiry DATE NOT NULL,
            date_of_birth DATE,
            hire_date DATE,
            status VARCHAR(50) DEFAULT 'active',
            rating DECIMAL(3, 2) DEFAULT 0.0,
            total_trips INTEGER DEFAULT 0,
            emergency_contact JSONB,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # Create transport_assignments table
    op.execute("""
        CREATE TABLE IF NOT EXISTS transport_assignments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
            vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
            driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
            assignment_date DATE NOT NULL,
            pickup_time TIME,
            pickup_location VARCHAR(500),
            dropoff_time TIME,
            dropoff_location VARCHAR(500),
            status VARCHAR(50) DEFAULT 'scheduled',
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # ==========================================
    # REPORTS MODELS
    # ==========================================
    
    # Create reports table
    op.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            report_name VARCHAR(200) NOT NULL,
            report_type VARCHAR(50) NOT NULL,
            description TEXT,
            parameters JSONB,
            schedule JSONB,
            last_generated TIMESTAMP WITH TIME ZONE,
            next_scheduled TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN DEFAULT TRUE,
            recipients JSONB DEFAULT '[]'::jsonb,
            created_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # Create report_executions table
    op.execute("""
        CREATE TABLE IF NOT EXISTS report_executions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
            execution_date TIMESTAMP WITH TIME ZONE NOT NULL,
            status VARCHAR(50) DEFAULT 'running',
            parameters JSONB,
            result_data JSONB,
            error_message TEXT,
            execution_time_ms INTEGER,
            file_url VARCHAR(500),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # ==========================================
    # CRM MODELS
    # ==========================================
    
    # Create leads table
    op.execute("""
        CREATE TABLE IF NOT EXISTS leads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            lead_source VARCHAR(100),
            lead_status VARCHAR(50) DEFAULT 'new',
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(100),
            phone VARCHAR(20),
            company VARCHAR(200),
            interest_level VARCHAR(50),
            notes TEXT,
            assigned_to UUID,
            converted_to_customer BOOLEAN DEFAULT FALSE,
            conversion_date TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # Create interactions table
    op.execute("""
        CREATE TABLE IF NOT EXISTS interactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            customer_id UUID,
            lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
            interaction_type VARCHAR(50) NOT NULL,
            interaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            subject VARCHAR(200),
            description TEXT,
            outcome VARCHAR(200),
            next_action VARCHAR(200),
            next_action_date DATE,
            performed_by UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # ==========================================
    # CONTACT MANAGEMENT MODELS
    # ==========================================
    
    # Create contacts table
    op.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            contact_type VARCHAR(50) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(100),
            phone VARCHAR(20),
            company VARCHAR(200),
            position VARCHAR(100),
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(100),
            country VARCHAR(100),
            postal_code VARCHAR(20),
            tags JSONB DEFAULT '[]'::jsonb,
            custom_fields JSONB,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # ==========================================
    # MARKETPLACE MODELS
    # ==========================================
    
    # Create marketplace_products table
    op.execute("""
        CREATE TABLE IF NOT EXISTS marketplace_products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_code VARCHAR(50) UNIQUE NOT NULL,
            product_name VARCHAR(200) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            vendor_id UUID,
            price DECIMAL(10, 2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'USD',
            stock_quantity INTEGER DEFAULT 0,
            images JSONB DEFAULT '[]'::jsonb,
            specifications JSONB,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # ==========================================
    # RAFFLE MODELS
    # ==========================================
    
    # Create raffles table
    op.execute("""
        CREATE TABLE IF NOT EXISTS raffles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            raffle_name VARCHAR(200) NOT NULL,
            description TEXT,
            prize_description TEXT NOT NULL,
            start_date TIMESTAMP WITH TIME ZONE NOT NULL,
            end_date TIMESTAMP WITH TIME ZONE NOT NULL,
            draw_date TIMESTAMP WITH TIME ZONE,
            total_tickets INTEGER NOT NULL,
            ticket_price DECIMAL(10, 2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'USD',
            tickets_sold INTEGER DEFAULT 0,
            status VARCHAR(50) DEFAULT 'active',
            winner_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """)
    
    # Create raffle_tickets table
    op.execute("""
        CREATE TABLE IF NOT EXISTS raffle_tickets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            raffle_id UUID REFERENCES raffles(id) ON DELETE CASCADE,
            ticket_number VARCHAR(50) NOT NULL,
            customer_id UUID,
            customer_name VARCHAR(200) NOT NULL,
            customer_email VARCHAR(100) NOT NULL,
            customer_phone VARCHAR(20),
            purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            payment_status VARCHAR(50) DEFAULT 'pending',
            is_winner BOOLEAN DEFAULT FALSE,
            UNIQUE(raffle_id, ticket_number)
        )
    """)
    
    # ==========================================
    # CREATE INDEXES FOR PERFORMANCE
    # ==========================================
    
    # Reservations indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(reservation_code)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_reservations_tour_date ON reservations(tour_date)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_reservations_customer_email ON reservations(customer_email)")
    
    # Quotations indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_quotations_customer_email ON quotations(customer_email)")
    
    # Guides indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_guides_email ON guides(email)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_guides_is_active ON guides(is_active)")
    
    # Trips indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_trips_code ON trips(trip_code)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_trips_departure_date ON trips(departure_date)")
    
    # Transactions indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_transactions_number ON transactions(transaction_number)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type)")
    
    # Invoices indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date)")
    
    # Vehicles indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status)")
    
    # Drivers indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_drivers_license_number ON drivers(license_number)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status)")
    
    # Leads indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email)")
    
    # Contacts indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type)")
    
    print("✅ Complete schema migration completed successfully")


def downgrade():
    """Downgrade database schema - Drop all tables"""
    
    # Drop tables in reverse order (respecting foreign key constraints)
    op.execute("DROP TABLE IF EXISTS raffle_tickets CASCADE")
    op.execute("DROP TABLE IF EXISTS raffles CASCADE")
    op.execute("DROP TABLE IF EXISTS marketplace_products CASCADE")
    op.execute("DROP TABLE IF EXISTS contacts CASCADE")
    op.execute("DROP TABLE IF EXISTS interactions CASCADE")
    op.execute("DROP TABLE IF EXISTS leads CASCADE")
    op.execute("DROP TABLE IF EXISTS report_executions CASCADE")
    op.execute("DROP TABLE IF EXISTS reports CASCADE")
    op.execute("DROP TABLE IF EXISTS transport_assignments CASCADE")
    op.execute("DROP TABLE IF EXISTS drivers CASCADE")
    op.execute("DROP TABLE IF EXISTS vehicles CASCADE")
    op.execute("DROP TABLE IF EXISTS invoices CASCADE")
    op.execute("DROP TABLE IF EXISTS transactions CASCADE")
    op.execute("DROP TABLE IF EXISTS accounts CASCADE")
    op.execute("DROP TABLE IF EXISTS trip_participants CASCADE")
    op.execute("DROP TABLE IF EXISTS trips CASCADE")
    op.execute("DROP TABLE IF EXISTS guide_availability CASCADE")
    op.execute("DROP TABLE IF EXISTS guide_assignments CASCADE")
    op.execute("DROP TABLE IF EXISTS guides CASCADE")
    op.execute("DROP TABLE IF EXISTS package_quotations CASCADE")
    op.execute("DROP TABLE IF EXISTS quotation_items CASCADE")
    op.execute("DROP TABLE IF EXISTS quotations CASCADE")
    op.execute("DROP TABLE IF EXISTS operational_checklist CASCADE")
    op.execute("DROP TABLE IF EXISTS operations_log CASCADE")
    op.execute("DROP TABLE IF EXISTS reservations CASCADE")
    
    print("✅ Schema downgrade completed successfully")
