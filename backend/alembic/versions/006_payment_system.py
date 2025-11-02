"""
Payment System Migration

Creates tables for payment gateway system including:
- payments
- refunds
- webhook_events
- payment_methods
- payment_plans
- installments

Revision ID: 006
Revises: 005
Create Date: 2025-11-02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade():
    """Apply migration"""
    
    # Create payments table
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('payment_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('provider_payment_id', sa.String(200), index=True),
        
        sa.Column('provider', sa.String(50), nullable=False, index=True),
        sa.Column('payment_method', sa.String(50), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, index=True),
        
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False),
        sa.Column('fee_amount', sa.Numeric(10, 2), default=0),
        sa.Column('net_amount', sa.Numeric(10, 2)),
        
        sa.Column('booking_id', sa.Integer(), sa.ForeignKey('bookings.id'), nullable=True, index=True),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        
        sa.Column('customer_email', sa.String(255), nullable=False),
        sa.Column('customer_name', sa.String(255)),
        
        sa.Column('description', sa.Text(), nullable=False),
        
        sa.Column('checkout_url', sa.String(500)),
        sa.Column('return_url', sa.String(500)),
        sa.Column('cancel_url', sa.String(500)),
        
        sa.Column('metadata', sa.JSON(), default={}),
        
        sa.Column('error_code', sa.String(100)),
        sa.Column('error_message', sa.Text()),
        
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime()),
        sa.Column('completed_at', sa.DateTime()),
        sa.Column('failed_at', sa.DateTime())
    )
    
    # Create indexes for payments
    op.create_index('idx_payment_provider_status', 'payments', ['provider', 'status'])
    op.create_index('idx_payment_customer_created', 'payments', ['customer_id', 'created_at'])
    op.create_index('idx_payment_booking', 'payments', ['booking_id'])
    
    # Create refunds table
    op.create_table(
        'refunds',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('refund_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('provider_refund_id', sa.String(200)),
        
        sa.Column('payment_id', sa.Integer(), sa.ForeignKey('payments.id'), nullable=False, index=True),
        
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, index=True),
        
        sa.Column('reason', sa.Text()),
        sa.Column('notes', sa.Text()),
        
        sa.Column('initiated_by', sa.Integer(), sa.ForeignKey('users.id')),
        
        sa.Column('metadata', sa.JSON(), default={}),
        
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime()),
        sa.Column('completed_at', sa.DateTime())
    )
    
    # Create indexes for refunds
    op.create_index('idx_refund_payment', 'refunds', ['payment_id'])
    op.create_index('idx_refund_status', 'refunds', ['status'])
    
    # Create webhook_events table
    op.create_table(
        'webhook_events',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('event_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('provider', sa.String(50), nullable=False, index=True),
        sa.Column('event_type', sa.String(100), nullable=False, index=True),
        
        sa.Column('payment_id', sa.Integer(), sa.ForeignKey('payments.id'), nullable=True, index=True),
        
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('headers', sa.JSON()),
        
        sa.Column('processed', sa.Boolean(), default=False, nullable=False, index=True),
        sa.Column('processed_at', sa.DateTime()),
        sa.Column('processing_error', sa.Text()),
        
        sa.Column('signature', sa.String(500)),
        sa.Column('signature_verified', sa.Boolean(), default=False),
        
        sa.Column('received_at', sa.DateTime(), nullable=False, index=True)
    )
    
    # Create indexes for webhook_events
    op.create_index('idx_webhook_provider_type', 'webhook_events', ['provider', 'event_type'])
    op.create_index('idx_webhook_processed', 'webhook_events', ['processed', 'received_at'])
    
    # Create payment_methods table
    op.create_table(
        'payment_methods',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('provider_method_id', sa.String(200), nullable=False),
        
        sa.Column('method_type', sa.String(50), nullable=False),
        
        sa.Column('card_brand', sa.String(50)),
        sa.Column('card_last4', sa.String(4)),
        sa.Column('card_exp_month', sa.Integer()),
        sa.Column('card_exp_year', sa.Integer()),
        
        sa.Column('paypal_email', sa.String(255)),
        
        sa.Column('is_default', sa.Boolean(), default=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        
        sa.Column('metadata', sa.JSON(), default={}),
        
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime())
    )
    
    # Create indexes for payment_methods
    op.create_index('idx_payment_method_user', 'payment_methods', ['user_id'])
    op.create_index('idx_payment_method_provider', 'payment_methods', ['provider'])
    
    # Create payment_plans table
    op.create_table(
        'payment_plans',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('plan_id', sa.String(100), unique=True, nullable=False, index=True),
        
        sa.Column('booking_id', sa.Integer(), sa.ForeignKey('bookings.id'), nullable=False, index=True),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        
        sa.Column('total_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False),
        sa.Column('number_of_installments', sa.Integer(), nullable=False),
        sa.Column('installment_amount', sa.Numeric(10, 2), nullable=False),
        
        sa.Column('status', sa.String(50), nullable=False, index=True),
        
        sa.Column('paid_installments', sa.Integer(), default=0),
        sa.Column('paid_amount', sa.Numeric(10, 2), default=0),
        sa.Column('remaining_amount', sa.Numeric(10, 2)),
        
        sa.Column('metadata', sa.JSON(), default={}),
        
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime()),
        sa.Column('completed_at', sa.DateTime())
    )
    
    # Create installments table
    op.create_table(
        'installments',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('payment_plan_id', sa.Integer(), sa.ForeignKey('payment_plans.id'), nullable=False, index=True),
        
        sa.Column('installment_number', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False),
        
        sa.Column('due_date', sa.DateTime(), nullable=False, index=True),
        
        sa.Column('status', sa.String(50), nullable=False, index=True),
        
        sa.Column('payment_id', sa.Integer(), sa.ForeignKey('payments.id'), nullable=True),
        
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('paid_at', sa.DateTime())
    )
    
    # Create indexes for installments
    op.create_index('idx_installment_plan_number', 'installments', ['payment_plan_id', 'installment_number'])
    op.create_index('idx_installment_due_date', 'installments', ['due_date'])


def downgrade():
    """Revert migration"""
    
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table('installments')
    op.drop_table('payment_plans')
    op.drop_table('payment_methods')
    op.drop_table('webhook_events')
    op.drop_table('refunds')
    op.drop_table('payments')
