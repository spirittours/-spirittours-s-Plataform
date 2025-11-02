"""booking calendar system

Revision ID: 009_booking_calendar
Revises: 008_analytics_dashboard
Create Date: 2025-11-02 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '009_booking_calendar'
down_revision = '008_analytics_dashboard'
branch_labels = None
depends_on = None


def upgrade():
    """Create booking calendar system tables"""
    
    # Create enum types
    op.execute("""
        CREATE TYPE bookingstatus AS ENUM (
            'pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'refunded'
        )
    """)
    
    op.execute("""
        CREATE TYPE recurrencepattern AS ENUM (
            'none', 'daily', 'weekly', 'biweekly', 'monthly', 'custom'
        )
    """)
    
    op.execute("""
        CREATE TYPE waitliststatus AS ENUM (
            'active', 'notified', 'converted', 'expired', 'cancelled'
        )
    """)
    
    op.execute("""
        CREATE TYPE blackouttype AS ENUM (
            'holiday', 'maintenance', 'weather', 'custom'
        )
    """)
    
    # Create tour_schedules table
    op.create_table(
        'tour_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tour_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('recurrence', sa.Enum(
            'none', 'daily', 'weekly', 'biweekly', 'monthly', 'custom',
            name='recurrencepattern'
        ), nullable=False),
        sa.Column('recurrence_rule', sa.JSON(), nullable=True),
        sa.Column('monday', sa.Boolean(), default=False),
        sa.Column('tuesday', sa.Boolean(), default=False),
        sa.Column('wednesday', sa.Boolean(), default=False),
        sa.Column('thursday', sa.Boolean(), default=False),
        sa.Column('friday', sa.Boolean(), default=False),
        sa.Column('saturday', sa.Boolean(), default=False),
        sa.Column('sunday', sa.Boolean(), default=False),
        sa.Column('max_capacity', sa.Integer(), nullable=False, default=10),
        sa.Column('min_capacity', sa.Integer(), nullable=False, default=1),
        sa.Column('valid_from', sa.Date(), nullable=False),
        sa.Column('valid_until', sa.Date(), nullable=True),
        sa.Column('price_override', sa.Numeric(10, 2), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tour_id'], ['tours.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('min_capacity <= max_capacity', name='check_capacity_range'),
        sa.CheckConstraint('duration_minutes > 0', name='check_positive_duration')
    )
    
    op.create_index('idx_tour_schedule_active', 'tour_schedules', ['tour_id', 'is_active'])
    
    # Create booking_slots table
    op.create_table(
        'booking_slots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tour_id', sa.Integer(), nullable=False),
        sa.Column('schedule_id', sa.Integer(), nullable=True),
        sa.Column('slot_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('max_capacity', sa.Integer(), nullable=False),
        sa.Column('current_bookings', sa.Integer(), default=0, nullable=False),
        sa.Column('available_spots', sa.Integer(), nullable=False),
        sa.Column('price_per_person', sa.Numeric(10, 2), nullable=False),
        sa.Column('is_available', sa.Boolean(), default=True, nullable=False),
        sa.Column('is_cancelled', sa.Boolean(), default=False, nullable=False),
        sa.Column('cancellation_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tour_id'], ['tours.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['schedule_id'], ['tour_schedules.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tour_id', 'slot_date', 'start_time', name='uq_tour_slot_datetime'),
        sa.CheckConstraint('current_bookings >= 0', name='check_non_negative_bookings'),
        sa.CheckConstraint('available_spots >= 0', name='check_non_negative_spots'),
        sa.CheckConstraint('current_bookings <= max_capacity', name='check_bookings_within_capacity')
    )
    
    op.create_index('idx_slot_availability', 'booking_slots', ['slot_date', 'is_available'])
    op.create_index('idx_slot_tour_date', 'booking_slots', ['tour_id', 'slot_date'])
    
    # Create blackout_dates table
    op.create_table(
        'blackout_dates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tour_id', sa.Integer(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('blackout_type', sa.Enum(
            'holiday', 'maintenance', 'weather', 'custom',
            name='blackouttype'
        ), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['tour_id'], ['tours.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('start_date <= end_date', name='check_valid_date_range')
    )
    
    op.create_index('idx_blackout_date_range', 'blackout_dates', ['start_date', 'end_date'])
    
    # Create enhanced bookings table
    op.create_table(
        'bookings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('tour_id', sa.Integer(), nullable=False),
        sa.Column('booking_slot_id', sa.Integer(), nullable=True),
        sa.Column('payment_id', sa.Integer(), nullable=True),
        sa.Column('booking_reference', sa.String(50), unique=True, nullable=False),
        sa.Column('booking_date', sa.DateTime(), nullable=False),
        sa.Column('tour_date', sa.Date(), nullable=False),
        sa.Column('tour_time', sa.Time(), nullable=True),
        sa.Column('num_adults', sa.Integer(), default=1, nullable=False),
        sa.Column('num_children', sa.Integer(), default=0, nullable=False),
        sa.Column('num_infants', sa.Integer(), default=0, nullable=False),
        sa.Column('total_people', sa.Integer(), nullable=False),
        sa.Column('price_per_adult', sa.Numeric(10, 2), nullable=False),
        sa.Column('price_per_child', sa.Numeric(10, 2), default=0, nullable=False),
        sa.Column('price_per_infant', sa.Numeric(10, 2), default=0, nullable=False),
        sa.Column('subtotal', sa.Numeric(10, 2), nullable=False),
        sa.Column('discount_amount', sa.Numeric(10, 2), default=0, nullable=False),
        sa.Column('tax_amount', sa.Numeric(10, 2), default=0, nullable=False),
        sa.Column('total_amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('customer_name', sa.String(200), nullable=False),
        sa.Column('customer_email', sa.String(255), nullable=False),
        sa.Column('customer_phone', sa.String(50), nullable=True),
        sa.Column('special_requirements', sa.Text(), nullable=True),
        sa.Column('dietary_restrictions', sa.Text(), nullable=True),
        sa.Column('accessibility_needs', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum(
            'pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'refunded',
            name='bookingstatus'
        ), default='pending', nullable=False),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('cancelled_by', sa.Integer(), nullable=True),
        sa.Column('cancellation_reason', sa.Text(), nullable=True),
        sa.Column('refund_amount', sa.Numeric(10, 2), nullable=True),
        sa.Column('modified_at', sa.DateTime(), nullable=True),
        sa.Column('modification_notes', sa.Text(), nullable=True),
        sa.Column('original_booking_id', sa.Integer(), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(), nullable=True),
        sa.Column('confirmation_sent_at', sa.DateTime(), nullable=True),
        sa.Column('reminder_sent_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('no_show', sa.Boolean(), default=False, nullable=False),
        sa.Column('review_requested_at', sa.DateTime(), nullable=True),
        sa.Column('review_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tour_id'], ['tours.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_slot_id'], ['booking_slots.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['cancelled_by'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['original_booking_id'], ['bookings.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('num_adults >= 0', name='check_non_negative_adults'),
        sa.CheckConstraint('num_children >= 0', name='check_non_negative_children'),
        sa.CheckConstraint('num_infants >= 0', name='check_non_negative_infants'),
        sa.CheckConstraint('total_people > 0', name='check_positive_total_people'),
        sa.CheckConstraint('total_amount >= 0', name='check_non_negative_total')
    )
    
    op.create_index('idx_booking_status_date', 'bookings', ['status', 'tour_date'])
    op.create_index('idx_booking_user_date', 'bookings', ['user_id', 'tour_date'])
    op.create_index('idx_booking_tour_date', 'bookings', ['tour_id', 'tour_date'])
    op.create_index('idx_booking_reference', 'bookings', ['booking_reference'])
    op.create_index('idx_booking_email', 'bookings', ['customer_email'])
    
    # Create waitlist_entries table
    op.create_table(
        'waitlist_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('tour_id', sa.Integer(), nullable=False),
        sa.Column('booking_slot_id', sa.Integer(), nullable=True),
        sa.Column('requested_date', sa.Date(), nullable=False),
        sa.Column('requested_time', sa.Time(), nullable=True),
        sa.Column('num_people', sa.Integer(), nullable=False),
        sa.Column('customer_name', sa.String(200), nullable=False),
        sa.Column('customer_email', sa.String(255), nullable=False),
        sa.Column('customer_phone', sa.String(50), nullable=True),
        sa.Column('status', sa.Enum(
            'active', 'notified', 'converted', 'expired', 'cancelled',
            name='waitliststatus'
        ), default='active', nullable=False),
        sa.Column('priority', sa.Integer(), default=0, nullable=False),
        sa.Column('notified_at', sa.DateTime(), nullable=True),
        sa.Column('notification_expires_at', sa.DateTime(), nullable=True),
        sa.Column('converted_at', sa.DateTime(), nullable=True),
        sa.Column('booking_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tour_id'], ['tours.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_slot_id'], ['booking_slots.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('num_people > 0', name='check_positive_waitlist_people')
    )
    
    op.create_index('idx_waitlist_status_date', 'waitlist_entries', ['status', 'requested_date'])
    op.create_index('idx_waitlist_tour_date', 'waitlist_entries', ['tour_id', 'requested_date'])
    op.create_index('idx_waitlist_priority', 'waitlist_entries', ['priority', 'created_at'])
    op.create_index('idx_waitlist_email', 'waitlist_entries', ['customer_email'])
    
    # Create booking_modification_logs table
    op.create_table(
        'booking_modification_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('modified_by', sa.Integer(), nullable=True),
        sa.Column('modification_type', sa.String(50), nullable=False),
        sa.Column('old_value', sa.JSON(), nullable=True),
        sa.Column('new_value', sa.JSON(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['modified_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('idx_modification_log_booking', 'booking_modification_logs', ['booking_id'])
    op.create_index('idx_modification_log_created', 'booking_modification_logs', ['created_at'])


def downgrade():
    """Drop booking calendar system tables"""
    
    op.drop_table('booking_modification_logs')
    op.drop_table('waitlist_entries')
    op.drop_table('bookings')
    op.drop_table('blackout_dates')
    op.drop_table('booking_slots')
    op.drop_table('tour_schedules')
    
    op.execute("DROP TYPE IF EXISTS bookingstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS recurrencepattern CASCADE")
    op.execute("DROP TYPE IF EXISTS waitliststatus CASCADE")
    op.execute("DROP TYPE IF EXISTS blackouttype CASCADE")
