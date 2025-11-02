"""email system tables

Revision ID: 007_email_system
Revises: 006_payment_system
Create Date: 2025-01-02 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '007_email_system'
down_revision = '006_payment_system'
branch_labels = None
depends_on = None


def upgrade():
    # Create email_templates table
    op.create_table(
        'email_templates',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('template_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('type', sa.String(50), nullable=False, index=True),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('html_content', sa.Text(), nullable=False),
        sa.Column('text_content', sa.Text(), nullable=True),
        sa.Column('language', sa.String(10), default='en', index=True),
        sa.Column('variables', sa.JSON(), nullable=True),
        sa.Column('default_values', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, index=True),
        sa.Column('version', sa.Integer(), default=1),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    op.create_index('ix_email_templates_type_language', 'email_templates', ['type', 'language'])
    op.create_index('ix_email_templates_active_type', 'email_templates', ['is_active', 'type'])
    
    # Create emails table
    op.create_table(
        'emails',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('email_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('message_id', sa.String(200), nullable=True, index=True),
        sa.Column('to_email', sa.String(255), nullable=False, index=True),
        sa.Column('to_name', sa.String(200), nullable=True),
        sa.Column('cc', sa.JSON(), nullable=True),
        sa.Column('bcc', sa.JSON(), nullable=True),
        sa.Column('from_email', sa.String(255), nullable=False),
        sa.Column('from_name', sa.String(200), nullable=True),
        sa.Column('reply_to', sa.String(255), nullable=True),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('html_body', sa.Text(), nullable=True),
        sa.Column('text_body', sa.Text(), nullable=True),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('email_templates.id'), nullable=True),
        sa.Column('template_variables', sa.JSON(), nullable=True),
        sa.Column('priority', sa.String(20), default='normal', index=True),
        sa.Column('provider', sa.String(20), default='smtp'),
        sa.Column('status', sa.String(20), nullable=False, index=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), default=0),
        sa.Column('max_retries', sa.Integer(), default=3),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True, index=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True, index=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('opened_at', sa.DateTime(), nullable=True),
        sa.Column('open_count', sa.Integer(), default=0),
        sa.Column('clicked_at', sa.DateTime(), nullable=True),
        sa.Column('click_count', sa.Integer(), default=0),
        sa.Column('bounced_at', sa.DateTime(), nullable=True),
        sa.Column('complained_at', sa.DateTime(), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, index=True),
        sa.Column('booking_id', sa.Integer(), sa.ForeignKey('bookings.id'), nullable=True, index=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    op.create_index('ix_emails_status_priority', 'emails', ['status', 'priority'])
    op.create_index('ix_emails_user_status', 'emails', ['user_id', 'status'])
    op.create_index('ix_emails_scheduled_status', 'emails', ['scheduled_at', 'status'])
    
    # Create email_events table
    op.create_table(
        'email_events',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('event_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('email_id', sa.Integer(), sa.ForeignKey('emails.id'), nullable=False, index=True),
        sa.Column('event_type', sa.String(50), nullable=False, index=True),
        sa.Column('event_data', sa.JSON(), nullable=True),
        sa.Column('provider', sa.String(50), nullable=True),
        sa.Column('provider_event_id', sa.String(200), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('location', sa.String(200), nullable=True),
        sa.Column('device_type', sa.String(50), nullable=True),
        sa.Column('link_url', sa.String(1000), nullable=True),
        sa.Column('link_label', sa.String(200), nullable=True),
        sa.Column('occurred_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )
    op.create_index('ix_email_events_email_type', 'email_events', ['email_id', 'event_type'])
    op.create_index('ix_email_events_occurred', 'email_events', ['occurred_at'])
    
    # Create email_attachments table
    op.create_table(
        'email_attachments',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('email_id', sa.Integer(), sa.ForeignKey('emails.id'), nullable=False, index=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('content_type', sa.String(100), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('content_base64', sa.Text(), nullable=True),
        sa.Column('url', sa.String(1000), nullable=True),
        sa.Column('is_inline', sa.Boolean(), default=False),
        sa.Column('content_id', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False)
    )
    
    # Create email_queue table
    op.create_table(
        'email_queue',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('queue_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('email_id', sa.Integer(), sa.ForeignKey('emails.id'), nullable=False, index=True),
        sa.Column('priority', sa.String(20), default='normal', index=True),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True, index=True),
        sa.Column('is_processed', sa.Boolean(), default=False, index=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('retry_count', sa.Integer(), default=0),
        sa.Column('last_retry_at', sa.DateTime(), nullable=True),
        sa.Column('next_retry_at', sa.DateTime(), nullable=True, index=True),
        sa.Column('batch_id', sa.String(100), nullable=True, index=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    op.create_index('ix_email_queue_processing', 'email_queue', ['is_processed', 'priority', 'scheduled_at'])
    op.create_index('ix_email_queue_retry', 'email_queue', ['is_processed', 'next_retry_at'])
    
    # Create email_campaigns table
    op.create_table(
        'email_campaigns',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('campaign_id', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('email_templates.id'), nullable=False),
        sa.Column('recipient_list', sa.JSON(), nullable=True),
        sa.Column('total_recipients', sa.Integer(), default=0),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_completed', sa.Boolean(), default=False),
        sa.Column('emails_sent', sa.Integer(), default=0),
        sa.Column('emails_delivered', sa.Integer(), default=0),
        sa.Column('emails_opened', sa.Integer(), default=0),
        sa.Column('emails_clicked', sa.Integer(), default=0),
        sa.Column('emails_bounced', sa.Integer(), default=0),
        sa.Column('emails_failed', sa.Integer(), default=0),
        sa.Column('ab_test_enabled', sa.Boolean(), default=False),
        sa.Column('ab_test_config', sa.JSON(), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False)
    )
    op.create_index('ix_email_campaigns_active_scheduled', 'email_campaigns', ['is_active', 'scheduled_at'])


def downgrade():
    op.drop_table('email_campaigns')
    op.drop_table('email_queue')
    op.drop_table('email_attachments')
    op.drop_table('email_events')
    op.drop_table('emails')
    op.drop_table('email_templates')
