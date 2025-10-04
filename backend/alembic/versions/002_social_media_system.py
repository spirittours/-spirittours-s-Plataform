"""Social Media AI Management System

Revision ID: 002_social_media_system
Revises: 001_initial_migration
Create Date: 2025-10-04 10:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_social_media_system'
down_revision = '001_initial_migration'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Social Media Credentials (encrypted storage)
    op.create_table(
        'social_media_credentials',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('platform_display_name', sa.String(100), nullable=False),
        
        # Encrypted credentials (Fernet)
        sa.Column('app_id_encrypted', sa.Text(), nullable=True),
        sa.Column('app_secret_encrypted', sa.Text(), nullable=True),
        sa.Column('api_key_encrypted', sa.Text(), nullable=True),
        sa.Column('api_secret_encrypted', sa.Text(), nullable=True),
        sa.Column('client_id_encrypted', sa.Text(), nullable=True),
        sa.Column('client_secret_encrypted', sa.Text(), nullable=True),
        sa.Column('access_token_encrypted', sa.Text(), nullable=True),
        sa.Column('access_token_secret_encrypted', sa.Text(), nullable=True),
        sa.Column('refresh_token_encrypted', sa.Text(), nullable=True),
        sa.Column('bearer_token_encrypted', sa.Text(), nullable=True),
        
        # Account metadata
        sa.Column('account_id', sa.String(255), nullable=True),
        sa.Column('account_name', sa.String(255), nullable=True),
        sa.Column('account_username', sa.String(255), nullable=True),
        sa.Column('profile_url', sa.Text(), nullable=True),
        
        # Connection status
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_connected', sa.Boolean(), default=False),
        sa.Column('last_connection_test', sa.DateTime(), nullable=True),
        sa.Column('connection_status', sa.String(50), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        
        # Rate limiting
        sa.Column('rate_limit_calls_per_hour', sa.Integer(), nullable=True),
        sa.Column('rate_limit_calls_per_day', sa.Integer(), nullable=True),
        sa.Column('current_usage_hour', sa.Integer(), default=0),
        sa.Column('current_usage_day', sa.Integer(), default=0),
        sa.Column('usage_reset_at', sa.DateTime(), nullable=True),
        
        # Token expiration
        sa.Column('token_expires_at', sa.DateTime(), nullable=True),
        sa.Column('auto_renew_enabled', sa.Boolean(), default=True),
        
        # Audit fields
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        
        sa.UniqueConstraint('platform', name='uq_social_credentials_platform')
    )
    
    # Indexes for credentials
    op.create_index('idx_social_credentials_platform', 'social_media_credentials', ['platform'])
    op.create_index('idx_social_credentials_is_active', 'social_media_credentials', ['is_active'])
    op.create_index('idx_social_credentials_token_expiry', 'social_media_credentials', ['token_expires_at'])
    
    # 2. Credentials Audit Log
    op.create_table(
        'social_credentials_audit_log',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('credential_id', sa.Integer(), nullable=True),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('changed_fields', postgresql.JSONB(), nullable=True),
        sa.Column('admin_id', sa.Integer(), nullable=True),
        sa.Column('admin_email', sa.String(255), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        
        sa.ForeignKeyConstraint(['credential_id'], ['social_media_credentials.id'], ondelete='SET NULL')
    )
    
    op.create_index('idx_credentials_audit_platform', 'social_credentials_audit_log', ['platform'])
    op.create_index('idx_credentials_audit_created', 'social_credentials_audit_log', ['created_at'])
    
    # 3. Social Media Accounts
    op.create_table(
        'social_media_accounts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('credential_id', sa.Integer(), nullable=False),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('account_type', sa.String(50), nullable=True),
        
        # Account info
        sa.Column('platform_account_id', sa.String(255), nullable=False),
        sa.Column('username', sa.String(255), nullable=True),
        sa.Column('display_name', sa.String(255), nullable=True),
        sa.Column('profile_image_url', sa.Text(), nullable=True),
        sa.Column('follower_count', sa.Integer(), default=0),
        sa.Column('following_count', sa.Integer(), default=0),
        
        # Configuration
        sa.Column('auto_post_enabled', sa.Boolean(), default=False),
        sa.Column('auto_reply_enabled', sa.Boolean(), default=False),
        sa.Column('ai_content_generation_enabled', sa.Boolean(), default=False),
        
        # Status
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('last_synced_at', sa.DateTime(), nullable=True),
        
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        
        sa.ForeignKeyConstraint(['credential_id'], ['social_media_credentials.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('platform', 'platform_account_id', name='uq_social_account')
    )
    
    op.create_index('idx_social_accounts_platform', 'social_media_accounts', ['platform'])
    op.create_index('idx_social_accounts_credential', 'social_media_accounts', ['credential_id'])
    
    # 4. Social Media Posts
    op.create_table(
        'social_media_posts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('platform', sa.String(50), nullable=False),
        
        # Content
        sa.Column('content_text', sa.Text(), nullable=True),
        sa.Column('content_html', sa.Text(), nullable=True),
        sa.Column('hashtags', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('mentions', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('media_urls', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('media_type', sa.String(50), nullable=True),
        
        # AI generation
        sa.Column('generated_by_ai', sa.Boolean(), default=False),
        sa.Column('ai_prompt', sa.Text(), nullable=True),
        sa.Column('ai_model', sa.String(100), nullable=True),
        sa.Column('content_language', sa.String(10), nullable=True),
        sa.Column('content_tone', sa.String(50), nullable=True),
        
        # Publishing
        sa.Column('status', sa.String(50), default='draft'),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('platform_post_id', sa.String(255), nullable=True),
        sa.Column('platform_post_url', sa.Text(), nullable=True),
        
        # Engagement metrics
        sa.Column('likes_count', sa.Integer(), default=0),
        sa.Column('comments_count', sa.Integer(), default=0),
        sa.Column('shares_count', sa.Integer(), default=0),
        sa.Column('views_count', sa.Integer(), default=0),
        sa.Column('clicks_count', sa.Integer(), default=0),
        sa.Column('engagement_rate', sa.Numeric(5, 2), default=0),
        sa.Column('last_metrics_update', sa.DateTime(), nullable=True),
        
        # Error handling
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), default=0),
        
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by', sa.Integer(), nullable=True),
        
        sa.ForeignKeyConstraint(['account_id'], ['social_media_accounts.id'], ondelete='CASCADE')
    )
    
    op.create_index('idx_social_posts_platform', 'social_media_posts', ['platform'])
    op.create_index('idx_social_posts_status', 'social_media_posts', ['status'])
    op.create_index('idx_social_posts_scheduled', 'social_media_posts', ['scheduled_at'])
    op.create_index('idx_social_posts_published', 'social_media_posts', ['published_at'])
    
    # 5. Social Media Interactions
    op.create_table(
        'social_media_interactions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('post_id', sa.Integer(), nullable=True),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('interaction_type', sa.String(50), nullable=False),
        
        # Interaction details
        sa.Column('platform_interaction_id', sa.String(255), nullable=False),
        sa.Column('author_platform_id', sa.String(255), nullable=True),
        sa.Column('author_username', sa.String(255), nullable=True),
        sa.Column('author_display_name', sa.String(255), nullable=True),
        
        # Content
        sa.Column('content_text', sa.Text(), nullable=False),
        sa.Column('content_language', sa.String(10), nullable=True),
        
        # AI Analysis
        sa.Column('sentiment', sa.String(20), nullable=True),
        sa.Column('sentiment_score', sa.Numeric(3, 2), nullable=True),
        sa.Column('intent_classification', sa.String(50), nullable=True),
        sa.Column('topics', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('urgency_level', sa.String(20), default='normal'),
        sa.Column('priority', sa.String(20), default='normal'),
        
        # Response handling
        sa.Column('needs_response', sa.Boolean(), default=True),
        sa.Column('auto_reply_sent', sa.Boolean(), default=False),
        sa.Column('auto_reply_text', sa.Text(), nullable=True),
        sa.Column('auto_reply_at', sa.DateTime(), nullable=True),
        sa.Column('manual_reply_needed', sa.Boolean(), default=False),
        sa.Column('assigned_to_admin_id', sa.Integer(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_by', sa.Integer(), nullable=True),
        
        # Timestamps
        sa.Column('interaction_created_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        
        sa.ForeignKeyConstraint(['post_id'], ['social_media_posts.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('platform', 'platform_interaction_id', name='uq_social_interaction')
    )
    
    op.create_index('idx_interactions_platform', 'social_media_interactions', ['platform'])
    op.create_index('idx_interactions_type', 'social_media_interactions', ['interaction_type'])
    op.create_index('idx_interactions_sentiment', 'social_media_interactions', ['sentiment'])
    op.create_index('idx_interactions_needs_response', 'social_media_interactions', ['needs_response'])
    op.create_index('idx_interactions_created', 'social_media_interactions', ['created_at'])
    
    # 6. Social AI Configuration
    op.create_table(
        'social_ai_config',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('config_name', sa.String(100), nullable=False),
        
        # Content generation settings
        sa.Column('text_generation_model', sa.String(100), default='gpt-4'),
        sa.Column('image_generation_model', sa.String(100), nullable=True),
        sa.Column('default_tone', sa.String(50), default='professional'),
        sa.Column('default_language', sa.String(10), default='es'),
        sa.Column('include_emojis', sa.Boolean(), default=True),
        sa.Column('include_hashtags', sa.Boolean(), default=True),
        sa.Column('max_hashtags', sa.Integer(), default=5),
        
        # Response settings
        sa.Column('auto_reply_enabled', sa.Boolean(), default=True),
        sa.Column('auto_reply_confidence_threshold', sa.Numeric(3, 2), default=0.85),
        sa.Column('escalate_negative_sentiment', sa.Boolean(), default=True),
        sa.Column('escalate_sentiment_threshold', sa.Numeric(3, 2), default=-0.5),
        
        # Sentiment analysis
        sa.Column('sentiment_model', sa.String(100), default='distilbert'),
        sa.Column('sentiment_enabled', sa.Boolean(), default=True),
        
        # Rate limiting
        sa.Column('max_posts_per_day', sa.Integer(), default=10),
        sa.Column('max_replies_per_hour', sa.Integer(), default=20),
        
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        
        sa.UniqueConstraint('config_name', name='uq_ai_config_name')
    )
    
    # 7. Content Templates
    op.create_table(
        'social_content_templates',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('template_name', sa.String(255), nullable=False),
        sa.Column('template_type', sa.String(50), nullable=False),
        sa.Column('platform', sa.String(50), nullable=True),
        
        # Template content
        sa.Column('content_template', sa.Text(), nullable=False),
        sa.Column('variables', postgresql.JSONB(), nullable=True),
        sa.Column('example_output', sa.Text(), nullable=True),
        
        # Configuration
        sa.Column('language', sa.String(10), nullable=True),
        sa.Column('tone', sa.String(50), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        
        # Usage stats
        sa.Column('usage_count', sa.Integer(), default=0),
        sa.Column('success_rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('avg_engagement', sa.Numeric(5, 2), nullable=True),
        
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by', sa.Integer(), nullable=True)
    )
    
    op.create_index('idx_templates_type', 'social_content_templates', ['template_type'])
    op.create_index('idx_templates_platform', 'social_content_templates', ['platform'])
    
    # 8. FAQ Auto-Responses
    op.create_table(
        'social_faq_responses',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('question_pattern', sa.Text(), nullable=False),
        sa.Column('response_text', sa.Text(), nullable=False),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('language', sa.String(10), default='es'),
        
        # Matching configuration
        sa.Column('keywords', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('match_confidence_threshold', sa.Numeric(3, 2), default=0.8),
        
        # Usage stats
        sa.Column('match_count', sa.Integer(), default=0),
        sa.Column('positive_feedback_count', sa.Integer(), default=0),
        sa.Column('negative_feedback_count', sa.Integer(), default=0),
        
        # Platforms
        sa.Column('platforms', postgresql.ARRAY(sa.String()), nullable=True),
        
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('created_by', sa.Integer(), nullable=True)
    )
    
    op.create_index('idx_faq_category', 'social_faq_responses', ['category'])
    op.create_index('idx_faq_language', 'social_faq_responses', ['language'])
    
    # 9. Social Media Analytics
    op.create_table(
        'social_media_analytics',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('metric_date', sa.Date(), nullable=False),
        
        # Follower metrics
        sa.Column('followers_start', sa.Integer(), default=0),
        sa.Column('followers_end', sa.Integer(), default=0),
        sa.Column('followers_gained', sa.Integer(), default=0),
        sa.Column('followers_lost', sa.Integer(), default=0),
        
        # Engagement metrics
        sa.Column('posts_count', sa.Integer(), default=0),
        sa.Column('total_likes', sa.Integer(), default=0),
        sa.Column('total_comments', sa.Integer(), default=0),
        sa.Column('total_shares', sa.Integer(), default=0),
        sa.Column('total_views', sa.Integer(), default=0),
        sa.Column('total_clicks', sa.Integer(), default=0),
        sa.Column('engagement_rate', sa.Numeric(5, 2), default=0),
        
        # Response metrics
        sa.Column('interactions_received', sa.Integer(), default=0),
        sa.Column('auto_replies_sent', sa.Integer(), default=0),
        sa.Column('manual_replies_sent', sa.Integer(), default=0),
        sa.Column('avg_response_time_minutes', sa.Integer(), default=0),
        
        # Sentiment metrics
        sa.Column('positive_interactions', sa.Integer(), default=0),
        sa.Column('negative_interactions', sa.Integer(), default=0),
        sa.Column('neutral_interactions', sa.Integer(), default=0),
        sa.Column('avg_sentiment_score', sa.Numeric(3, 2), default=0),
        
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        
        sa.ForeignKeyConstraint(['account_id'], ['social_media_accounts.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('platform', 'account_id', 'metric_date', name='uq_analytics_day')
    )
    
    op.create_index('idx_analytics_platform_date', 'social_media_analytics', ['platform', 'metric_date'])
    op.create_index('idx_analytics_account', 'social_media_analytics', ['account_id'])
    
    # 10. Social Media Alerts
    op.create_table(
        'social_media_alerts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('alert_type', sa.String(50), nullable=False),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('severity', sa.String(20), default='medium'),
        
        # Alert details
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        
        # Notification
        sa.Column('notified_admins', postgresql.ARRAY(sa.Integer()), nullable=True),
        sa.Column('notification_sent_at', sa.DateTime(), nullable=True),
        
        # Resolution
        sa.Column('is_resolved', sa.Boolean(), default=False),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_by', sa.Integer(), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )
    
    op.create_index('idx_alerts_type', 'social_media_alerts', ['alert_type'])
    op.create_index('idx_alerts_platform', 'social_media_alerts', ['platform'])
    op.create_index('idx_alerts_resolved', 'social_media_alerts', ['is_resolved'])
    
    # 11. Scheduled Jobs Log
    op.create_table(
        'social_scheduled_jobs_log',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('job_type', sa.String(100), nullable=False),
        sa.Column('job_name', sa.String(255), nullable=False),
        sa.Column('platform', sa.String(50), nullable=True),
        
        # Execution details
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        
        # Results
        sa.Column('items_processed', sa.Integer(), default=0),
        sa.Column('items_succeeded', sa.Integer(), default=0),
        sa.Column('items_failed', sa.Integer(), default=0),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('execution_log', sa.Text(), nullable=True),
        
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )
    
    op.create_index('idx_jobs_log_type', 'social_scheduled_jobs_log', ['job_type'])
    op.create_index('idx_jobs_log_status', 'social_scheduled_jobs_log', ['status'])
    op.create_index('idx_jobs_log_created', 'social_scheduled_jobs_log', ['created_at'])


def downgrade():
    op.drop_table('social_scheduled_jobs_log')
    op.drop_table('social_media_alerts')
    op.drop_table('social_media_analytics')
    op.drop_table('social_faq_responses')
    op.drop_table('social_content_templates')
    op.drop_table('social_ai_config')
    op.drop_table('social_media_interactions')
    op.drop_table('social_media_posts')
    op.drop_table('social_media_accounts')
    op.drop_table('social_credentials_audit_log')
    op.drop_table('social_media_credentials')
