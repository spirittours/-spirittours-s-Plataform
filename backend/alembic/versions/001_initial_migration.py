"""Initial database migration for Enterprise Booking Platform

Revision ID: 001_initial_migration
Revises: 
Create Date: 2024-09-22 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_initial_migration'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Upgrade database schema - Create all enterprise tables"""
    
    # Create enum types first
    
    # User and role enums
    op.execute("CREATE TYPE userrole AS ENUM ('admin', 'manager', 'agent', 'customer', 'tour_operator', 'travel_agency', 'sales_agent')")
    op.execute("CREATE TYPE userstatus AS ENUM ('active', 'inactive', 'suspended', 'pending')")
    
    # Business model enums
    op.execute("CREATE TYPE businesstype AS ENUM ('b2c_direct', 'b2b_tour_operator', 'b2b_travel_agency', 'b2b2c_distributor')")
    op.execute("CREATE TYPE bookingstatus AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded')")
    op.execute("CREATE TYPE paymentstatus AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'disputed', 'expired')")
    
    # Notification enums
    op.execute("CREATE TYPE notificationtype AS ENUM ('email', 'sms', 'push', 'whatsapp', 'slack', 'webhook')")
    op.execute("CREATE TYPE notificationstatus AS ENUM ('pending', 'sent', 'delivered', 'failed', 'cancelled')")
    op.execute("CREATE TYPE notificationpriority AS ENUM ('low', 'medium', 'high', 'urgent')")
    
    # Payment enums
    op.execute("CREATE TYPE paymentprovider AS ENUM ('stripe', 'paypal', 'square', 'razorpay', 'adyen', 'braintree')")
    op.execute("CREATE TYPE paymentmethod AS ENUM ('credit_card', 'debit_card', 'bank_transfer', 'paypal', 'apple_pay', 'google_pay', 'digital_wallet', 'crypto')")
    op.execute("CREATE TYPE currency AS ENUM ('USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'KRW')")
    op.execute("CREATE TYPE refundreason AS ENUM ('duplicate', 'fraudulent', 'requested_by_customer', 'expired_uncaptured_charge', 'processing_error')")
    
    # AI Agent enums
    op.execute("CREATE TYPE querytype AS ENUM ('booking_search', 'destination_info', 'experience_recommendation', 'itinerary_generation', 'pricing_inquiry', 'travel_planning', 'customer_support', 'general_inquiry')")
    op.execute("CREATE TYPE agentstatus AS ENUM ('active', 'inactive', 'maintenance', 'error')")
    
    # Create core user table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('role', postgresql.ENUM('admin', 'manager', 'agent', 'customer', 'tour_operator', 'travel_agency', 'sales_agent', name='userrole'), nullable=False),
        sa.Column('status', postgresql.ENUM('active', 'inactive', 'suspended', 'pending', name='userstatus'), nullable=False),
        sa.Column('business_type', postgresql.ENUM('b2c_direct', 'b2b_tour_operator', 'b2b_travel_agency', 'b2b2c_distributor', name='businesstype'), nullable=True),
        sa.Column('profile_data', postgresql.JSON(), nullable=True),
        sa.Column('permissions', postgresql.JSON(), nullable=True),
        sa.Column('last_login', sa.DateTime(), nullable=True),
        sa.Column('email_verified', sa.Boolean(), nullable=True),
        sa.Column('phone_verified', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_user_id'), 'users', ['user_id'], unique=True)
    
    # Create business model tables
    
    # Tour Operators Table
    op.create_table('tour_operators',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('operator_id', sa.String(length=100), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=False),
        sa.Column('contact_person', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('address', postgresql.JSON(), nullable=True),
        sa.Column('commission_rate', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('payment_terms', sa.String(length=100), nullable=True),
        sa.Column('contract_details', postgresql.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tour_operators_operator_id'), 'tour_operators', ['operator_id'], unique=True)
    
    # Travel Agencies Table
    op.create_table('travel_agencies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agency_id', sa.String(length=100), nullable=False),
        sa.Column('tour_operator_id', sa.String(length=100), nullable=False),
        sa.Column('agency_name', sa.String(length=255), nullable=False),
        sa.Column('contact_person', sa.String(length=255), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('address', postgresql.JSON(), nullable=True),
        sa.Column('commission_rate', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('territory', sa.String(length=255), nullable=True),
        sa.Column('specializations', postgresql.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tour_operator_id'], ['tour_operators.operator_id'], )
    )
    op.create_index(op.f('ix_travel_agencies_agency_id'), 'travel_agencies', ['agency_id'], unique=True)
    
    # Sales Agents Table
    op.create_table('sales_agents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.String(length=100), nullable=False),
        sa.Column('travel_agency_id', sa.String(length=100), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('commission_rate', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('performance_metrics', postgresql.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('hire_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['travel_agency_id'], ['travel_agencies.agency_id'], )
    )
    op.create_index(op.f('ix_sales_agents_agent_id'), 'sales_agents', ['agent_id'], unique=True)
    
    # Business Bookings Table
    op.create_table('business_bookings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.String(length=100), nullable=False),
        sa.Column('business_type', postgresql.ENUM('b2c_direct', 'b2b_tour_operator', 'b2b_travel_agency', 'b2b2c_distributor', name='businesstype'), nullable=False),
        sa.Column('customer_id', sa.String(length=100), nullable=False),
        sa.Column('tour_operator_id', sa.String(length=100), nullable=True),
        sa.Column('travel_agency_id', sa.String(length=100), nullable=True),
        sa.Column('sales_agent_id', sa.String(length=100), nullable=True),
        sa.Column('product_id', sa.String(length=100), nullable=False),
        sa.Column('product_name', sa.String(length=255), nullable=False),
        sa.Column('booking_date', sa.DateTime(), nullable=False),
        sa.Column('travel_date', sa.DateTime(), nullable=False),
        sa.Column('participants', sa.Integer(), nullable=False),
        sa.Column('base_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', postgresql.ENUM('USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'KRW', name='currency'), nullable=False),
        sa.Column('commission_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('status', postgresql.ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded', name='bookingstatus'), nullable=False),
        sa.Column('booking_details', postgresql.JSON(), nullable=True),
        sa.Column('cancellation_policy', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_business_bookings_booking_id'), 'business_bookings', ['booking_id'], unique=True)
    
    # Payment Statements Table
    op.create_table('payment_statements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('statement_id', sa.String(length=100), nullable=False),
        sa.Column('business_entity_id', sa.String(length=100), nullable=False),
        sa.Column('business_entity_type', sa.String(length=50), nullable=False),
        sa.Column('period_start', sa.DateTime(), nullable=False),
        sa.Column('period_end', sa.DateTime(), nullable=False),
        sa.Column('total_bookings', sa.Integer(), nullable=False),
        sa.Column('total_revenue', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('total_commission', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('net_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('currency', postgresql.ENUM('USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'KRW', name='currency'), nullable=False),
        sa.Column('payment_due_date', sa.DateTime(), nullable=False),
        sa.Column('is_paid', sa.Boolean(), nullable=True),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
        sa.Column('statement_details', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payment_statements_statement_id'), 'payment_statements', ['statement_id'], unique=True)
    
    # Commission Rules Table
    op.create_table('commission_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rule_id', sa.String(length=100), nullable=False),
        sa.Column('rule_name', sa.String(length=255), nullable=False),
        sa.Column('business_type', postgresql.ENUM('b2c_direct', 'b2b_tour_operator', 'b2b_travel_agency', 'b2b2c_distributor', name='businesstype'), nullable=False),
        sa.Column('entity_id', sa.String(length=100), nullable=True),
        sa.Column('product_category', sa.String(length=100), nullable=True),
        sa.Column('commission_percentage', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('min_booking_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('max_booking_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('effective_from', sa.DateTime(), nullable=False),
        sa.Column('effective_until', sa.DateTime(), nullable=True),
        sa.Column('conditions', postgresql.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_commission_rules_rule_id'), 'commission_rules', ['rule_id'], unique=True)
    
    # Payment Transactions Table
    op.create_table('payment_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transaction_id', sa.String(length=100), nullable=False),
        sa.Column('booking_id', sa.String(length=100), nullable=True),
        sa.Column('customer_id', sa.String(length=100), nullable=True),
        sa.Column('provider', postgresql.ENUM('stripe', 'paypal', 'square', 'razorpay', 'adyen', 'braintree', name='paymentprovider'), nullable=False),
        sa.Column('payment_method', postgresql.ENUM('credit_card', 'debit_card', 'bank_transfer', 'paypal', 'apple_pay', 'google_pay', 'digital_wallet', 'crypto', name='paymentmethod'), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', postgresql.ENUM('USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'KRW', name='currency'), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'disputed', 'expired', name='paymentstatus'), nullable=False),
        sa.Column('provider_transaction_id', sa.String(length=200), nullable=True),
        sa.Column('provider_payment_intent_id', sa.String(length=200), nullable=True),
        sa.Column('provider_charge_id', sa.String(length=200), nullable=True),
        sa.Column('provider_response', postgresql.JSON(), nullable=True),
        sa.Column('customer_email', sa.String(length=255), nullable=True),
        sa.Column('customer_name', sa.String(length=255), nullable=True),
        sa.Column('billing_address', postgresql.JSON(), nullable=True),
        sa.Column('card_last4', sa.String(length=4), nullable=True),
        sa.Column('card_brand', sa.String(length=20), nullable=True),
        sa.Column('card_exp_month', sa.Integer(), nullable=True),
        sa.Column('card_exp_year', sa.Integer(), nullable=True),
        sa.Column('processing_fee', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('commission_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('net_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('initiated_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('failed_at', sa.DateTime(), nullable=True),
        sa.Column('metadata', postgresql.JSON(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('webhook_verified', sa.Boolean(), nullable=True),
        sa.Column('webhook_signature', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payment_transactions_transaction_id'), 'payment_transactions', ['transaction_id'], unique=True)
    
    # Payment Refunds Table
    op.create_table('payment_refunds',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('refund_id', sa.String(length=100), nullable=False),
        sa.Column('transaction_id', sa.String(length=100), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', postgresql.ENUM('USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'KRW', name='currency'), nullable=False),
        sa.Column('reason', postgresql.ENUM('duplicate', 'fraudulent', 'requested_by_customer', 'expired_uncaptured_charge', 'processing_error', name='refundreason'), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'disputed', 'expired', name='paymentstatus'), nullable=False),
        sa.Column('provider_refund_id', sa.String(length=200), nullable=True),
        sa.Column('provider_response', postgresql.JSON(), nullable=True),
        sa.Column('requested_by', sa.String(length=100), nullable=True),
        sa.Column('approved_by', sa.String(length=100), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payment_refunds_refund_id'), 'payment_refunds', ['refund_id'], unique=True)
    
    # Payment Methods Table
    op.create_table('payment_methods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('method_id', sa.String(length=100), nullable=False),
        sa.Column('customer_id', sa.String(length=100), nullable=False),
        sa.Column('provider', postgresql.ENUM('stripe', 'paypal', 'square', 'razorpay', 'adyen', 'braintree', name='paymentprovider'), nullable=False),
        sa.Column('type', postgresql.ENUM('credit_card', 'debit_card', 'bank_transfer', 'paypal', 'apple_pay', 'google_pay', 'digital_wallet', 'crypto', name='paymentmethod'), nullable=False),
        sa.Column('provider_method_id', sa.String(length=200), nullable=True),
        sa.Column('card_last4', sa.String(length=4), nullable=True),
        sa.Column('card_brand', sa.String(length=20), nullable=True),
        sa.Column('card_exp_month', sa.Integer(), nullable=True),
        sa.Column('card_exp_year', sa.Integer(), nullable=True),
        sa.Column('bank_name', sa.String(length=100), nullable=True),
        sa.Column('account_last4', sa.String(length=4), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('metadata', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payment_methods_method_id'), 'payment_methods', ['method_id'], unique=True)
    
    # Notification Templates Table
    op.create_table('notification_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('type', postgresql.ENUM('email', 'sms', 'push', 'whatsapp', 'slack', 'webhook', name='notificationtype'), nullable=False),
        sa.Column('subject_template', sa.String(length=200), nullable=True),
        sa.Column('body_template', sa.Text(), nullable=False),
        sa.Column('variables', postgresql.JSON(), nullable=True),
        sa.Column('language', sa.String(length=10), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notification_templates_name'), 'notification_templates', ['name'], unique=True)
    
    # Notification Logs Table
    op.create_table('notification_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('recipient', sa.String(length=255), nullable=False),
        sa.Column('type', postgresql.ENUM('email', 'sms', 'push', 'whatsapp', 'slack', 'webhook', name='notificationtype'), nullable=False),
        sa.Column('template_name', sa.String(length=100), nullable=True),
        sa.Column('subject', sa.String(length=200), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('status', postgresql.ENUM('pending', 'sent', 'delivered', 'failed', 'cancelled', name='notificationstatus'), nullable=False),
        sa.Column('priority', postgresql.ENUM('low', 'medium', 'high', 'urgent', name='notificationpriority'), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=True),
        sa.Column('provider_response', postgresql.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('metadata', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # AI Agent Tables
    
    # AI Agent Configurations Table
    op.create_table('ai_agent_configs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.String(length=100), nullable=False),
        sa.Column('agent_name', sa.String(length=255), nullable=False),
        sa.Column('agent_type', sa.String(length=100), nullable=False),
        sa.Column('track', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('capabilities', postgresql.JSON(), nullable=True),
        sa.Column('configuration', postgresql.JSON(), nullable=True),
        sa.Column('endpoints', postgresql.JSON(), nullable=True),
        sa.Column('status', postgresql.ENUM('active', 'inactive', 'maintenance', 'error', name='agentstatus'), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_agent_configs_agent_id'), 'ai_agent_configs', ['agent_id'], unique=True)
    
    # AI Query Logs Table
    op.create_table('ai_query_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('query_id', sa.String(length=100), nullable=False),
        sa.Column('user_id', sa.String(length=100), nullable=True),
        sa.Column('session_id', sa.String(length=100), nullable=True),
        sa.Column('query_type', postgresql.ENUM('booking_search', 'destination_info', 'experience_recommendation', 'itinerary_generation', 'pricing_inquiry', 'travel_planning', 'customer_support', 'general_inquiry', name='querytype'), nullable=False),
        sa.Column('query_content', sa.Text(), nullable=False),
        sa.Column('context', postgresql.JSON(), nullable=True),
        sa.Column('processed_agents', postgresql.JSON(), nullable=True),
        sa.Column('response_content', sa.Text(), nullable=True),
        sa.Column('response_metadata', postgresql.JSON(), nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_query_logs_query_id'), 'ai_query_logs', ['query_id'], unique=True)
    
    # AI Agent Statistics Table
    op.create_table('ai_agent_statistics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.String(length=100), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('total_queries', sa.Integer(), nullable=True),
        sa.Column('successful_queries', sa.Integer(), nullable=True),
        sa.Column('failed_queries', sa.Integer(), nullable=True),
        sa.Column('avg_response_time_ms', sa.Float(), nullable=True),
        sa.Column('total_processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('uptime_percentage', sa.Float(), nullable=True),
        sa.Column('performance_metrics', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    print("✅ Database schema created successfully!")


def downgrade():
    """Downgrade database schema - Drop all tables"""
    
    # Drop tables in reverse order
    op.drop_table('ai_agent_statistics')
    op.drop_table('ai_query_logs')
    op.drop_table('ai_agent_configs')
    op.drop_table('notification_logs')
    op.drop_table('notification_templates')
    op.drop_table('payment_methods')
    op.drop_table('payment_refunds')
    op.drop_table('payment_transactions')
    op.drop_table('commission_rules')
    op.drop_table('payment_statements')
    op.drop_table('business_bookings')
    op.drop_table('sales_agents')
    op.drop_table('travel_agencies')
    op.drop_table('tour_operators')
    op.drop_table('users')
    
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS agentstatus")
    op.execute("DROP TYPE IF EXISTS querytype")
    op.execute("DROP TYPE IF EXISTS refundreason")
    op.execute("DROP TYPE IF EXISTS currency")
    op.execute("DROP TYPE IF EXISTS paymentmethod")
    op.execute("DROP TYPE IF EXISTS paymentprovider")
    op.execute("DROP TYPE IF EXISTS notificationpriority")
    op.execute("DROP TYPE IF EXISTS notificationstatus")
    op.execute("DROP TYPE IF EXISTS notificationtype")
    op.execute("DROP TYPE IF EXISTS paymentstatus")
    op.execute("DROP TYPE IF EXISTS bookingstatus")
    op.execute("DROP TYPE IF EXISTS businesstype")
    op.execute("DROP TYPE IF EXISTS userstatus")
    op.execute("DROP TYPE IF EXISTS userrole")
    
    print("✅ Database schema dropped successfully!")