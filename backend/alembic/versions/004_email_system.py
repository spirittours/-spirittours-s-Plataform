"""
Add email management system tables

Revision ID: 004
Revises: 003
Create Date: 2025-10-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import uuid

# revision identifiers
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    """Create email management system tables"""
    
    # ===== Email Accounts Table =====
    op.create_table(
        'email_accounts',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('email_address', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('display_name', sa.String(255), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        
        # Account Configuration
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('auto_response_enabled', sa.Boolean(), default=False),
        sa.Column('ai_processing_enabled', sa.Boolean(), default=True),
        
        # API Configuration
        sa.Column('provider', sa.String(50), nullable=False),  # gmail, microsoft365
        sa.Column('api_credentials', JSONB, nullable=True),
        sa.Column('webhook_url', sa.String(500), nullable=True),
        
        # SLA Configuration
        sa.Column('sla_response_time_hours', sa.Integer(), default=24),
        
        # Assignment
        sa.Column('assigned_team_id', UUID(as_uuid=True), nullable=True),
        sa.Column('assigned_user_id', UUID(as_uuid=True), nullable=True),
        
        # Statistics
        sa.Column('total_received', sa.Integer(), default=0),
        sa.Column('total_sent', sa.Integer(), default=0),
        sa.Column('avg_response_time_minutes', sa.Float(), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        
        # Foreign keys
        sa.ForeignKeyConstraint(['assigned_user_id'], ['users.id'], ondelete='SET NULL')
    )
    
    # Indexes for email_accounts
    op.create_index('idx_email_accounts_category', 'email_accounts', ['category'])
    op.create_index('idx_email_accounts_active', 'email_accounts', ['is_active'])
    
    # ===== Email Messages Table =====
    op.create_table(
        'email_messages',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        
        # Account
        sa.Column('account_id', UUID(as_uuid=True), nullable=False, index=True),
        
        # Email Headers
        sa.Column('message_id', sa.String(500), unique=True, nullable=False, index=True),
        sa.Column('thread_id', sa.String(500), nullable=True, index=True),
        sa.Column('in_reply_to', sa.String(500), nullable=True),
        sa.Column('references', ARRAY(sa.String()), nullable=True),
        
        # From/To
        sa.Column('from_email', sa.String(255), nullable=False, index=True),
        sa.Column('from_name', sa.String(255), nullable=True),
        sa.Column('to_emails', ARRAY(sa.String()), nullable=False),
        sa.Column('cc_emails', ARRAY(sa.String()), nullable=True),
        sa.Column('bcc_emails', ARRAY(sa.String()), nullable=True),
        
        # Content
        sa.Column('subject', sa.Text(), nullable=False),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('body_html', sa.Text(), nullable=True),
        sa.Column('attachments', JSONB, nullable=True),
        
        # Metadata
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('size_bytes', sa.Integer(), nullable=True),
        sa.Column('language', sa.String(10), nullable=True),
        
        # Classification
        sa.Column('category', sa.String(50), nullable=True, index=True),
        sa.Column('intent', sa.String(50), nullable=True, index=True),
        sa.Column('priority', sa.String(20), default='normal', index=True),
        sa.Column('status', sa.String(50), default='received', index=True),
        
        # Sentiment Analysis
        sa.Column('sentiment', sa.String(20), nullable=True),
        sa.Column('sentiment_score', sa.Float(), nullable=True),
        sa.Column('sentiment_confidence', sa.Float(), nullable=True),
        
        # Entity Extraction
        sa.Column('extracted_entities', JSONB, nullable=True),
        sa.Column('keywords', ARRAY(sa.String()), nullable=True),
        
        # Assignment & Routing
        sa.Column('assigned_agent_type', sa.String(100), nullable=True),
        sa.Column('assigned_user_id', UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('routed_to_email', sa.String(255), nullable=True),
        
        # Response Management
        sa.Column('requires_response', sa.Boolean(), default=True),
        sa.Column('auto_response_sent', sa.Boolean(), default=False),
        sa.Column('response_deadline', sa.DateTime(timezone=True), nullable=True),
        
        # Flags
        sa.Column('is_spam', sa.Boolean(), default=False),
        sa.Column('is_read', sa.Boolean(), default=False),
        sa.Column('is_important', sa.Boolean(), default=False),
        sa.Column('is_archived', sa.Boolean(), default=False),
        
        # Processing Metadata
        sa.Column('classification_confidence', sa.Float(), nullable=True),
        sa.Column('processing_errors', JSONB, nullable=True),
        sa.Column('ai_processing_metadata', JSONB, nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('classified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('analyzed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        
        # Foreign keys
        sa.ForeignKeyConstraint(['account_id'], ['email_accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_user_id'], ['users.id'], ondelete='SET NULL')
    )
    
    # Indexes for email_messages
    op.create_index('idx_email_account_received', 'email_messages', ['account_id', 'received_at'])
    op.create_index('idx_email_status_priority', 'email_messages', ['status', 'priority'])
    op.create_index('idx_email_assigned_user', 'email_messages', ['assigned_user_id', 'status'])
    op.create_index('idx_email_category_intent', 'email_messages', ['category', 'intent'])
    op.create_index('idx_email_deadline', 'email_messages', ['response_deadline'])
    
    # ===== Email Classifications Table =====
    op.create_table(
        'email_classifications',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('email_id', UUID(as_uuid=True), nullable=False, index=True),
        
        # Classification Results
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('category_confidence', sa.Float(), nullable=False),
        sa.Column('intent', sa.String(50), nullable=False),
        sa.Column('intent_confidence', sa.Float(), nullable=False),
        sa.Column('priority', sa.String(20), nullable=False),
        
        # Classification Method
        sa.Column('classifier_version', sa.String(50), nullable=False),
        sa.Column('classification_method', sa.String(100), nullable=False),
        
        # Detailed Scores
        sa.Column('category_scores', JSONB, nullable=True),
        sa.Column('intent_scores', JSONB, nullable=True),
        
        # Keywords and Features
        sa.Column('keywords_detected', ARRAY(sa.String()), nullable=True),
        sa.Column('features_used', JSONB, nullable=True),
        
        # Validation
        sa.Column('is_validated', sa.Boolean(), default=False),
        sa.Column('validated_by_user_id', UUID(as_uuid=True), nullable=True),
        sa.Column('validated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_correct', sa.Boolean(), nullable=True),
        
        # Metadata
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        
        # Foreign keys
        sa.ForeignKeyConstraint(['email_id'], ['email_messages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['validated_by_user_id'], ['users.id'], ondelete='SET NULL')
    )
    
    # Indexes for email_classifications
    op.create_index('idx_classifications_email', 'email_classifications', ['email_id'])
    op.create_index('idx_classifications_validation', 'email_classifications', ['is_validated', 'is_correct'])
    
    # ===== Email Responses Table =====
    op.create_table(
        'email_responses',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('email_id', UUID(as_uuid=True), nullable=False, index=True),
        
        # Response Details
        sa.Column('response_type', sa.String(50), nullable=False),
        sa.Column('response_body_text', sa.Text(), nullable=True),
        sa.Column('response_body_html', sa.Text(), nullable=True),
        sa.Column('attachments', JSONB, nullable=True),
        
        # Response Metadata
        sa.Column('template_id', UUID(as_uuid=True), nullable=True),
        sa.Column('ai_model_used', sa.String(100), nullable=True),
        sa.Column('generation_confidence', sa.Float(), nullable=True),
        
        # Approval Workflow
        sa.Column('requires_approval', sa.Boolean(), default=False),
        sa.Column('approved_by_user_id', UUID(as_uuid=True), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        
        # Response Status
        sa.Column('is_sent', sa.Boolean(), default=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sent_by_user_id', UUID(as_uuid=True), nullable=True),
        
        # External Message ID
        sa.Column('sent_message_id', sa.String(500), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        
        # Foreign keys
        sa.ForeignKeyConstraint(['email_id'], ['email_messages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['approved_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['sent_by_user_id'], ['users.id'], ondelete='SET NULL')
    )
    
    # Indexes for email_responses
    op.create_index('idx_responses_email', 'email_responses', ['email_id'])
    op.create_index('idx_responses_sent', 'email_responses', ['is_sent', 'sent_at'])
    
    # ===== Email Analytics Table =====
    op.create_table(
        'email_analytics',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        
        # Time Period
        sa.Column('date', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('account_id', UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('category', sa.String(50), nullable=True, index=True),
        
        # Volume Metrics
        sa.Column('total_received', sa.Integer(), default=0),
        sa.Column('total_sent', sa.Integer(), default=0),
        sa.Column('total_auto_responses', sa.Integer(), default=0),
        
        # Response Time Metrics (in minutes)
        sa.Column('avg_response_time', sa.Float(), nullable=True),
        sa.Column('median_response_time', sa.Float(), nullable=True),
        sa.Column('min_response_time', sa.Float(), nullable=True),
        sa.Column('max_response_time', sa.Float(), nullable=True),
        
        # SLA Compliance
        sa.Column('within_sla_count', sa.Integer(), default=0),
        sa.Column('breached_sla_count', sa.Integer(), default=0),
        sa.Column('sla_compliance_rate', sa.Float(), nullable=True),
        
        # Status Distribution
        sa.Column('status_distribution', JSONB, nullable=True),
        
        # Priority Distribution
        sa.Column('priority_distribution', JSONB, nullable=True),
        
        # Sentiment Distribution
        sa.Column('sentiment_positive_count', sa.Integer(), default=0),
        sa.Column('sentiment_negative_count', sa.Integer(), default=0),
        sa.Column('sentiment_neutral_count', sa.Integer(), default=0),
        sa.Column('avg_sentiment_score', sa.Float(), nullable=True),
        
        # Intent Distribution
        sa.Column('intent_distribution', JSONB, nullable=True),
        
        # Language Distribution
        sa.Column('language_distribution', JSONB, nullable=True),
        
        # Team Performance
        sa.Column('assigned_users', JSONB, nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        
        # Foreign keys
        sa.ForeignKeyConstraint(['account_id'], ['email_accounts.id'], ondelete='CASCADE')
    )
    
    # Unique index to prevent duplicate analytics
    op.create_index(
        'idx_analytics_unique', 
        'email_analytics', 
        ['date', 'account_id', 'category'], 
        unique=True
    )
    
    # ===== Email Templates Table =====
    op.create_table(
        'email_templates',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        
        # Template Details
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(50), nullable=True, index=True),
        sa.Column('intent', sa.String(50), nullable=True, index=True),
        sa.Column('language', sa.String(10), nullable=False, default='en'),
        
        # Template Content
        sa.Column('subject_template', sa.Text(), nullable=True),
        sa.Column('body_text_template', sa.Text(), nullable=False),
        sa.Column('body_html_template', sa.Text(), nullable=True),
        
        # Template Variables
        sa.Column('variables', JSONB, nullable=True),
        
        # Usage Configuration
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('requires_approval', sa.Boolean(), default=False),
        sa.Column('auto_send_enabled', sa.Boolean(), default=False),
        
        # Conditions for Auto-Use
        sa.Column('trigger_conditions', JSONB, nullable=True),
        
        # Statistics
        sa.Column('usage_count', sa.Integer(), default=0),
        sa.Column('success_rate', sa.Float(), nullable=True),
        sa.Column('avg_response_rating', sa.Float(), nullable=True),
        
        # Metadata
        sa.Column('created_by_user_id', UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        
        # Foreign keys
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ondelete='SET NULL')
    )
    
    # Indexes for email_templates
    op.create_index('idx_templates_category_intent', 'email_templates', ['category', 'intent'])
    op.create_index('idx_templates_active', 'email_templates', ['is_active'])
    op.create_index('idx_templates_language', 'email_templates', ['language'])


def downgrade():
    """Drop email management system tables"""
    
    op.drop_table('email_templates')
    op.drop_table('email_analytics')
    op.drop_table('email_responses')
    op.drop_table('email_classifications')
    op.drop_table('email_messages')
    op.drop_table('email_accounts')
