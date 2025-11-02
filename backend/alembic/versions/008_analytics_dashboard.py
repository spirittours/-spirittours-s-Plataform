"""analytics dashboard tables

Revision ID: 008_analytics_dashboard
Revises: 007_email_system
Create Date: 2025-01-02 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '008_analytics_dashboard'
down_revision = '007_email_system'
branch_labels = None
depends_on = None


def upgrade():
    # Create dashboard_metrics table
    op.create_table(
        'dashboard_metrics',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('metric_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('metric_type', sa.String(50), nullable=False, index=True),
        sa.Column('metric_name', sa.String(200), nullable=False),
        sa.Column('date', sa.Date(), nullable=False, index=True),
        sa.Column('granularity', sa.String(20), default='daily', index=True),
        sa.Column('value', sa.Numeric(15, 2), nullable=False),
        sa.Column('count', sa.Integer(), default=0),
        sa.Column('dimension_1', sa.String(100), nullable=True, index=True),
        sa.Column('dimension_2', sa.String(100), nullable=True, index=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    op.create_index('ix_dashboard_metrics_type_date', 'dashboard_metrics', ['metric_type', 'date'])
    op.create_index('ix_dashboard_metrics_date_granularity', 'dashboard_metrics', ['date', 'granularity'])
    op.create_index('ix_dashboard_metrics_dimensions', 'dashboard_metrics', ['dimension_1', 'dimension_2'])
    
    # Create revenue_analytics table
    op.create_table(
        'revenue_analytics',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('date', sa.Date(), nullable=False, index=True),
        sa.Column('total_revenue', sa.Numeric(15, 2), default=0, nullable=False),
        sa.Column('booking_revenue', sa.Numeric(15, 2), default=0),
        sa.Column('addon_revenue', sa.Numeric(15, 2), default=0),
        sa.Column('total_transactions', sa.Integer(), default=0),
        sa.Column('successful_transactions', sa.Integer(), default=0),
        sa.Column('failed_transactions', sa.Integer(), default=0),
        sa.Column('refunded_transactions', sa.Integer(), default=0),
        sa.Column('total_refunds', sa.Numeric(15, 2), default=0),
        sa.Column('refund_count', sa.Integer(), default=0),
        sa.Column('average_transaction_value', sa.Numeric(10, 2), default=0),
        sa.Column('average_booking_value', sa.Numeric(10, 2), default=0),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('tour_id', sa.Integer(), sa.ForeignKey('tours.id'), nullable=True, index=True),
        sa.Column('category', sa.String(100), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    op.create_index('ix_revenue_analytics_tour_date', 'revenue_analytics', ['tour_id', 'date'])
    
    # Create booking_analytics table
    op.create_table(
        'booking_analytics',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('date', sa.Date(), nullable=False, index=True),
        sa.Column('total_bookings', sa.Integer(), default=0, nullable=False),
        sa.Column('confirmed_bookings', sa.Integer(), default=0),
        sa.Column('pending_bookings', sa.Integer(), default=0),
        sa.Column('cancelled_bookings', sa.Integer(), default=0),
        sa.Column('total_guests', sa.Integer(), default=0),
        sa.Column('average_guests_per_booking', sa.Float(), default=0),
        sa.Column('average_lead_time_days', sa.Float(), default=0),
        sa.Column('page_views', sa.Integer(), default=0),
        sa.Column('inquiries', sa.Integer(), default=0),
        sa.Column('conversion_rate', sa.Float(), default=0),
        sa.Column('cancellation_rate', sa.Float(), default=0),
        sa.Column('average_cancellation_lead_time', sa.Float(), default=0),
        sa.Column('tour_id', sa.Integer(), sa.ForeignKey('tours.id'), nullable=True, index=True),
        sa.Column('source', sa.String(100), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    op.create_index('ix_booking_analytics_tour_date', 'booking_analytics', ['tour_id', 'date'])
    
    # Create customer_analytics table
    op.create_table(
        'customer_analytics',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('date', sa.Date(), nullable=False, index=True),
        sa.Column('new_customers', sa.Integer(), default=0, nullable=False),
        sa.Column('returning_customers', sa.Integer(), default=0),
        sa.Column('active_customers', sa.Integer(), default=0),
        sa.Column('churned_customers', sa.Integer(), default=0),
        sa.Column('average_customer_lifetime_value', sa.Numeric(10, 2), default=0),
        sa.Column('total_customer_lifetime_value', sa.Numeric(15, 2), default=0),
        sa.Column('average_bookings_per_customer', sa.Float(), default=0),
        sa.Column('repeat_customer_rate', sa.Float(), default=0),
        sa.Column('retention_rate', sa.Float(), default=0),
        sa.Column('churn_rate', sa.Float(), default=0),
        sa.Column('acquisition_cost', sa.Numeric(10, 2), default=0),
        sa.Column('acquisition_source', sa.String(100), nullable=True, index=True),
        sa.Column('segment', sa.String(100), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    op.create_index('ix_customer_analytics_segment_date', 'customer_analytics', ['segment', 'date'])
    
    # Create tour_performance table
    op.create_table(
        'tour_performance',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('tour_id', sa.Integer(), sa.ForeignKey('tours.id'), nullable=False, index=True),
        sa.Column('date', sa.Date(), nullable=False, index=True),
        sa.Column('views', sa.Integer(), default=0),
        sa.Column('bookings', sa.Integer(), default=0),
        sa.Column('revenue', sa.Numeric(15, 2), default=0),
        sa.Column('occupancy_rate', sa.Float(), default=0),
        sa.Column('conversion_rate', sa.Float(), default=0),
        sa.Column('average_rating', sa.Float(), default=0),
        sa.Column('review_count', sa.Integer(), default=0),
        sa.Column('total_guests', sa.Integer(), default=0),
        sa.Column('capacity_utilization', sa.Float(), default=0),
        sa.Column('popularity_rank', sa.Integer(), nullable=True),
        sa.Column('revenue_rank', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    op.create_index('ix_tour_performance_tour_date', 'tour_performance', ['tour_id', 'date'])
    
    # Create dashboard_snapshots table
    op.create_table(
        'dashboard_snapshots',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('snapshot_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('snapshot_date', sa.Date(), nullable=False, index=True),
        sa.Column('total_revenue', sa.Numeric(15, 2), default=0),
        sa.Column('total_bookings', sa.Integer(), default=0),
        sa.Column('total_customers', sa.Integer(), default=0),
        sa.Column('active_tours', sa.Integer(), default=0),
        sa.Column('revenue_growth', sa.Float(), default=0),
        sa.Column('booking_growth', sa.Float(), default=0),
        sa.Column('customer_growth', sa.Float(), default=0),
        sa.Column('average_rating', sa.Float(), default=0),
        sa.Column('conversion_rate', sa.Float(), default=0),
        sa.Column('customer_satisfaction', sa.Float(), default=0),
        sa.Column('snapshot_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )
    
    # Create analytics_events table
    op.create_table(
        'analytics_events',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('event_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('event_type', sa.String(100), nullable=False, index=True),
        sa.Column('event_category', sa.String(100), nullable=True, index=True),
        sa.Column('event_data', sa.JSON(), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('session_id', sa.String(100), nullable=True, index=True),
        sa.Column('page_url', sa.String(500), nullable=True),
        sa.Column('referrer_url', sa.String(500), nullable=True),
        sa.Column('source', sa.String(100), nullable=True, index=True),
        sa.Column('device_type', sa.String(50), nullable=True),
        sa.Column('browser', sa.String(100), nullable=True),
        sa.Column('os', sa.String(100), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('country', sa.String(100), nullable=True, index=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('occurred_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )
    op.create_index('ix_analytics_events_type_date', 'analytics_events', ['event_type', 'occurred_at'])
    op.create_index('ix_analytics_events_user_date', 'analytics_events', ['user_id', 'occurred_at'])


def downgrade():
    op.drop_table('analytics_events')
    op.drop_table('dashboard_snapshots')
    op.drop_table('tour_performance')
    op.drop_table('customer_analytics')
    op.drop_table('booking_analytics')
    op.drop_table('revenue_analytics')
    op.drop_table('dashboard_metrics')
