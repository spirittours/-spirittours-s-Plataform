"""
Add scheduled posts and analytics tables

Revision ID: 003
Revises: 002
Create Date: 2025-10-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, ARRAY

# revision identifiers
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    """Create scheduled posts and analytics tables"""
    
    # ===== Scheduled Posts Table =====
    op.create_table(
        'scheduled_posts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('media_urls', ARRAY(sa.String()), nullable=True),
        sa.Column('hashtags', ARRAY(sa.String()), nullable=True),
        
        # Scheduling
        sa.Column('scheduled_time', sa.DateTime(), nullable=False, index=True),
        sa.Column('timezone', sa.String(50), default='UTC'),
        sa.Column('recurring', sa.Boolean(), default=False),
        sa.Column('recurrence_pattern', sa.String(100), nullable=True),  # cron-like
        
        # Status
        sa.Column('status', sa.String(50), nullable=False, default='pending', index=True),
        # Status values: pending, processing, published, failed, cancelled
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('failed_at', sa.DateTime(), nullable=True),
        sa.Column('retry_count', sa.Integer(), default=0),
        sa.Column('max_retries', sa.Integer(), default=3),
        
        # Platform-specific
        sa.Column('platform_post_id', sa.String(255), nullable=True),
        sa.Column('platform_url', sa.String(500), nullable=True),
        
        # AI generation tracking
        sa.Column('generated_by_ai', sa.Boolean(), default=False),
        sa.Column('ai_provider', sa.String(50), nullable=True),
        sa.Column('ai_prompt', sa.Text(), nullable=True),
        sa.Column('ai_metadata', JSONB, nullable=True),
        
        # Metadata
        sa.Column('metadata', JSONB, nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('credentials_id', sa.Integer(), nullable=True),
        
        # Audit
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now()),
        
        # Foreign keys
        sa.ForeignKeyConstraint(['credentials_id'], ['social_media_credentials.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'])
    )
    
    # Indexes for scheduled_posts
    op.create_index('idx_scheduled_posts_status_time', 'scheduled_posts', ['status', 'scheduled_time'])
    op.create_index('idx_scheduled_posts_platform', 'scheduled_posts', ['platform'])
    op.create_index('idx_scheduled_posts_created_by', 'scheduled_posts', ['created_by'])
    
    # ===== Post Analytics Table =====
    op.create_table(
        'post_analytics',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('post_id', sa.Integer(), nullable=False, index=True),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('platform_post_id', sa.String(255), nullable=False),
        
        # Engagement metrics
        sa.Column('likes', sa.Integer(), default=0),
        sa.Column('comments', sa.Integer(), default=0),
        sa.Column('shares', sa.Integer(), default=0),
        sa.Column('saves', sa.Integer(), default=0),
        sa.Column('clicks', sa.Integer(), default=0),
        sa.Column('impressions', sa.Integer(), default=0),
        sa.Column('reach', sa.Integer(), default=0),
        sa.Column('engagement_rate', sa.Float(), default=0.0),
        
        # Video-specific metrics
        sa.Column('views', sa.Integer(), default=0),
        sa.Column('watch_time_seconds', sa.Integer(), default=0),
        sa.Column('completion_rate', sa.Float(), default=0.0),
        
        # Time-based snapshots
        sa.Column('snapshot_time', sa.DateTime(), default=sa.func.now()),
        sa.Column('hours_since_published', sa.Float(), nullable=True),
        
        # Raw data from platform
        sa.Column('raw_data', JSONB, nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now()),
        
        # Foreign key
        sa.ForeignKeyConstraint(['post_id'], ['scheduled_posts.id'], ondelete='CASCADE')
    )
    
    # Indexes for post_analytics
    op.create_index('idx_post_analytics_post_platform', 'post_analytics', ['post_id', 'platform'])
    op.create_index('idx_post_analytics_snapshot', 'post_analytics', ['snapshot_time'])
    
    # ===== Comment/Interaction Sentiment Table =====
    op.create_table(
        'interaction_sentiments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('post_id', sa.Integer(), nullable=True, index=True),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('interaction_type', sa.String(50), nullable=False),
        # Type: comment, message, mention, review
        
        # Content
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('author_username', sa.String(255), nullable=True),
        sa.Column('author_name', sa.String(255), nullable=True),
        
        # Sentiment analysis results
        sa.Column('sentiment', sa.String(50), nullable=True),
        # Values: positive, negative, neutral
        sa.Column('sentiment_score', sa.Float(), nullable=True),
        # Range: -1.0 (very negative) to +1.0 (very positive)
        sa.Column('confidence', sa.Float(), nullable=True),
        # Range: 0.0 to 1.0
        
        # Classification
        sa.Column('intent', sa.String(50), nullable=True),
        # Values: query, complaint, praise, purchase_intent, other
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('keywords', ARRAY(sa.String()), nullable=True),
        
        # Response handling
        sa.Column('requires_response', sa.Boolean(), default=False),
        sa.Column('response_status', sa.String(50), default='pending'),
        # Values: pending, responded, escalated, ignored
        sa.Column('ai_response', sa.Text(), nullable=True),
        sa.Column('responded_at', sa.DateTime(), nullable=True),
        sa.Column('responded_by', sa.Integer(), nullable=True),
        
        # Platform-specific
        sa.Column('platform_interaction_id', sa.String(255), nullable=True),
        sa.Column('platform_url', sa.String(500), nullable=True),
        
        # Metadata
        sa.Column('metadata', JSONB, nullable=True),
        
        # Timestamps
        sa.Column('interaction_time', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now()),
        
        # Foreign keys
        sa.ForeignKeyConstraint(['post_id'], ['scheduled_posts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['responded_by'], ['users.id'])
    )
    
    # Indexes for interaction_sentiments
    op.create_index('idx_interaction_sentiment', 'interaction_sentiments', ['sentiment'])
    op.create_index('idx_interaction_intent', 'interaction_sentiments', ['intent'])
    op.create_index('idx_interaction_response_status', 'interaction_sentiments', ['response_status'])
    op.create_index('idx_interaction_time', 'interaction_sentiments', ['interaction_time'])
    
    # ===== Platform Analytics Summary Table =====
    op.create_table(
        'platform_analytics_summary',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('platform', sa.String(50), nullable=False, index=True),
        sa.Column('date', sa.Date(), nullable=False, index=True),
        
        # Daily aggregates
        sa.Column('posts_published', sa.Integer(), default=0),
        sa.Column('total_likes', sa.Integer(), default=0),
        sa.Column('total_comments', sa.Integer(), default=0),
        sa.Column('total_shares', sa.Integer(), default=0),
        sa.Column('total_impressions', sa.Integer(), default=0),
        sa.Column('total_reach', sa.Integer(), default=0),
        sa.Column('total_clicks', sa.Integer(), default=0),
        
        # Follower metrics
        sa.Column('follower_count', sa.Integer(), default=0),
        sa.Column('follower_growth', sa.Integer(), default=0),
        
        # Engagement
        sa.Column('avg_engagement_rate', sa.Float(), default=0.0),
        sa.Column('top_performing_post_id', sa.Integer(), nullable=True),
        
        # Sentiment
        sa.Column('positive_interactions', sa.Integer(), default=0),
        sa.Column('negative_interactions', sa.Integer(), default=0),
        sa.Column('neutral_interactions', sa.Integer(), default=0),
        sa.Column('sentiment_score', sa.Float(), default=0.0),
        
        # Raw data
        sa.Column('raw_data', JSONB, nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now()),
        
        # Unique constraint
        sa.UniqueConstraint('platform', 'date', name='unique_platform_date')
    )
    
    # Indexes for platform_analytics_summary
    op.create_index('idx_platform_summary_date', 'platform_analytics_summary', ['platform', 'date'])
    
    # ===== Celery Task Tracking Table =====
    op.create_table(
        'celery_task_tracking',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('task_id', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('task_name', sa.String(255), nullable=False),
        sa.Column('task_type', sa.String(50), nullable=False),
        # Type: schedule, publish, generate, analytics
        
        # Status
        sa.Column('status', sa.String(50), nullable=False, default='pending'),
        # Values: pending, started, success, failure, retry
        sa.Column('progress', sa.Integer(), default=0),
        
        # Associated entity
        sa.Column('post_id', sa.Integer(), nullable=True),
        sa.Column('platform', sa.String(50), nullable=True),
        
        # Execution details
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('execution_time_seconds', sa.Float(), nullable=True),
        
        # Result
        sa.Column('result', JSONB, nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('traceback', sa.Text(), nullable=True),
        
        # Retry info
        sa.Column('retry_count', sa.Integer(), default=0),
        sa.Column('max_retries', sa.Integer(), default=3),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now()),
        
        # Foreign key
        sa.ForeignKeyConstraint(['post_id'], ['scheduled_posts.id'], ondelete='SET NULL')
    )
    
    # Indexes for celery_task_tracking
    op.create_index('idx_task_status', 'celery_task_tracking', ['status'])
    op.create_index('idx_task_type', 'celery_task_tracking', ['task_type'])
    op.create_index('idx_task_created', 'celery_task_tracking', ['created_at'])


def downgrade():
    """Drop all created tables"""
    op.drop_table('celery_task_tracking')
    op.drop_table('platform_analytics_summary')
    op.drop_table('interaction_sentiments')
    op.drop_table('post_analytics')
    op.drop_table('scheduled_posts')
