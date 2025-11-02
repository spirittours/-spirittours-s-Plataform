"""review rating system

Revision ID: 010_review_rating
Revises: 009_booking_calendar
Create Date: 2025-11-02 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '010_review_rating'
down_revision = '009_booking_calendar'
branch_labels = None
depends_on = None


def upgrade():
    """Create review and rating system tables"""
    
    # Create enum types
    op.execute("""
        CREATE TYPE reviewstatus AS ENUM (
            'pending', 'approved', 'rejected', 'flagged', 'hidden'
        )
    """)
    
    op.execute("""
        CREATE TYPE reviewflag AS ENUM (
            'spam', 'inappropriate', 'fake', 'off_topic', 'harassment', 'other'
        )
    """)
    
    op.execute("""
        CREATE TYPE mediatype AS ENUM ('image', 'video')
    """)
    
    # Create reviews table
    op.create_table(
        'reviews',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('tour_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('value_rating', sa.Integer(), nullable=True),
        sa.Column('guide_rating', sa.Integer(), nullable=True),
        sa.Column('organization_rating', sa.Integer(), nullable=True),
        sa.Column('experience_rating', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('traveler_type', sa.String(50), nullable=True),
        sa.Column('travel_date', sa.Date(), nullable=True),
        sa.Column('pros', sa.Text(), nullable=True),
        sa.Column('cons', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'approved', 'rejected', 'flagged', 'hidden', name='reviewstatus'), default='pending', nullable=False),
        sa.Column('moderation_notes', sa.Text(), nullable=True),
        sa.Column('moderated_at', sa.DateTime(), nullable=True),
        sa.Column('moderated_by', sa.Integer(), nullable=True),
        sa.Column('is_verified_purchase', sa.Boolean(), default=False, nullable=False),
        sa.Column('helpful_count', sa.Integer(), default=0, nullable=False),
        sa.Column('not_helpful_count', sa.Integer(), default=0, nullable=False),
        sa.Column('flag_count', sa.Integer(), default=0, nullable=False),
        sa.Column('response_count', sa.Integer(), default=0, nullable=False),
        sa.Column('is_featured', sa.Boolean(), default=False, nullable=False),
        sa.Column('featured_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('language', sa.String(10), default='en', nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tour_id'], ['tours.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['moderated_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='check_valid_rating'),
        sa.CheckConstraint('value_rating IS NULL OR (value_rating >= 1 AND value_rating <= 5)', name='check_valid_value_rating'),
        sa.CheckConstraint('guide_rating IS NULL OR (guide_rating >= 1 AND guide_rating <= 5)', name='check_valid_guide_rating'),
        sa.CheckConstraint('organization_rating IS NULL OR (organization_rating >= 1 AND organization_rating <= 5)', name='check_valid_organization_rating'),
        sa.CheckConstraint('experience_rating IS NULL OR (experience_rating >= 1 AND experience_rating <= 5)', name='check_valid_experience_rating'),
        sa.CheckConstraint('helpful_count >= 0', name='check_non_negative_helpful'),
        sa.CheckConstraint('not_helpful_count >= 0', name='check_non_negative_not_helpful'),
        sa.CheckConstraint('flag_count >= 0', name='check_non_negative_flags'),
        sa.UniqueConstraint('user_id', 'tour_id', 'booking_id', name='uq_user_tour_booking_review')
    )
    
    op.create_index('idx_review_user', 'reviews', ['user_id'])
    op.create_index('idx_review_tour', 'reviews', ['tour_id'])
    op.create_index('idx_review_booking', 'reviews', ['booking_id'])
    op.create_index('idx_review_status', 'reviews', ['status'])
    op.create_index('idx_review_rating', 'reviews', ['rating'])
    op.create_index('idx_review_verified', 'reviews', ['is_verified_purchase'])
    op.create_index('idx_review_featured', 'reviews', ['is_featured'])
    op.create_index('idx_review_created', 'reviews', ['created_at'])
    op.create_index('idx_review_published', 'reviews', ['published_at'])
    op.create_index('idx_review_language', 'reviews', ['language'])
    op.create_index('idx_review_tour_status', 'reviews', ['tour_id', 'status'])
    op.create_index('idx_review_tour_rating', 'reviews', ['tour_id', 'rating'])
    op.create_index('idx_review_verified_featured', 'reviews', ['is_verified_purchase', 'is_featured'])
    
    # Create review_media table
    op.create_table(
        'review_media',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('media_type', sa.Enum('image', 'video', name='mediatype'), nullable=False),
        sa.Column('file_url', sa.String(500), nullable=False),
        sa.Column('thumbnail_url', sa.String(500), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('duration', sa.Integer(), nullable=True),
        sa.Column('caption', sa.String(500), nullable=True),
        sa.Column('display_order', sa.Integer(), default=0, nullable=False),
        sa.Column('is_approved', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('idx_media_review', 'review_media', ['review_id'])
    
    # Create review_responses table
    op.create_table(
        'review_responses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_official', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_visible', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('idx_response_review', 'review_responses', ['review_id'])
    op.create_index('idx_response_user', 'review_responses', ['user_id'])
    
    # Create review_votes table
    op.create_table(
        'review_votes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('is_helpful', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('review_id', 'user_id', name='uq_review_user_vote')
    )
    
    op.create_index('idx_vote_review', 'review_votes', ['review_id'])
    op.create_index('idx_vote_user', 'review_votes', ['user_id'])
    op.create_index('idx_vote_review_helpful', 'review_votes', ['review_id', 'is_helpful'])
    
    # Create review_flags table
    op.create_table(
        'review_flags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('review_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('flag_reason', sa.Enum('spam', 'inappropriate', 'fake', 'off_topic', 'harassment', 'other', name='reviewflag'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_resolved', sa.Boolean(), default=False, nullable=False),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['review_id'], ['reviews.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resolved_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('idx_flag_review', 'review_flags', ['review_id'])
    op.create_index('idx_flag_resolved', 'review_flags', ['is_resolved'])
    op.create_index('idx_flag_review_resolved', 'review_flags', ['review_id', 'is_resolved'])
    
    # Create tour_rating_aggregates table
    op.create_table(
        'tour_rating_aggregates',
        sa.Column('tour_id', sa.Integer(), nullable=False),
        sa.Column('total_reviews', sa.Integer(), default=0, nullable=False),
        sa.Column('average_rating', sa.Numeric(3, 2), default=0, nullable=False),
        sa.Column('rating_5_count', sa.Integer(), default=0, nullable=False),
        sa.Column('rating_4_count', sa.Integer(), default=0, nullable=False),
        sa.Column('rating_3_count', sa.Integer(), default=0, nullable=False),
        sa.Column('rating_2_count', sa.Integer(), default=0, nullable=False),
        sa.Column('rating_1_count', sa.Integer(), default=0, nullable=False),
        sa.Column('average_value_rating', sa.Numeric(3, 2), nullable=True),
        sa.Column('average_guide_rating', sa.Numeric(3, 2), nullable=True),
        sa.Column('average_organization_rating', sa.Numeric(3, 2), nullable=True),
        sa.Column('average_experience_rating', sa.Numeric(3, 2), nullable=True),
        sa.Column('verified_reviews_count', sa.Integer(), default=0, nullable=False),
        sa.Column('featured_reviews_count', sa.Integer(), default=0, nullable=False),
        sa.Column('last_review_date', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tour_id'], ['tours.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('tour_id'),
        sa.CheckConstraint('total_reviews >= 0', name='check_non_negative_total_reviews'),
        sa.CheckConstraint('average_rating >= 0 AND average_rating <= 5', name='check_valid_average_rating'),
        sa.CheckConstraint('rating_5_count >= 0', name='check_non_negative_5'),
        sa.CheckConstraint('rating_4_count >= 0', name='check_non_negative_4'),
        sa.CheckConstraint('rating_3_count >= 0', name='check_non_negative_3'),
        sa.CheckConstraint('rating_2_count >= 0', name='check_non_negative_2'),
        sa.CheckConstraint('rating_1_count >= 0', name='check_non_negative_1')
    )
    
    op.create_index('idx_aggregate_rating', 'tour_rating_aggregates', ['average_rating'])
    
    # Create review_insights table
    op.create_table(
        'review_insights',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tour_id', sa.Integer(), nullable=False),
        sa.Column('insight_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('frequency', sa.Integer(), nullable=True),
        sa.Column('sentiment_score', sa.Float(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('period_start', sa.Date(), nullable=True),
        sa.Column('period_end', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tour_id'], ['tours.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('idx_insight_tour', 'review_insights', ['tour_id'])
    op.create_index('idx_insight_type', 'review_insights', ['insight_type'])
    
    # Create review_analytics table
    op.create_table(
        'review_analytics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tour_id', sa.Integer(), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('period_type', sa.String(20), nullable=False),
        sa.Column('new_reviews', sa.Integer(), default=0, nullable=False),
        sa.Column('total_reviews', sa.Integer(), default=0, nullable=False),
        sa.Column('average_rating', sa.Numeric(3, 2), nullable=True),
        sa.Column('total_votes', sa.Integer(), default=0, nullable=False),
        sa.Column('total_responses', sa.Integer(), default=0, nullable=False),
        sa.Column('total_flags', sa.Integer(), default=0, nullable=False),
        sa.Column('verified_reviews', sa.Integer(), default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['tour_id'], ['tours.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tour_id', 'date', 'period_type', name='uq_tour_date_period')
    )
    
    op.create_index('idx_analytics_tour', 'review_analytics', ['tour_id'])
    op.create_index('idx_analytics_date', 'review_analytics', ['date'])
    op.create_index('idx_analytics_date_period', 'review_analytics', ['date', 'period_type'])


def downgrade():
    """Drop review and rating system tables"""
    
    op.drop_table('review_analytics')
    op.drop_table('review_insights')
    op.drop_table('tour_rating_aggregates')
    op.drop_table('review_flags')
    op.drop_table('review_votes')
    op.drop_table('review_responses')
    op.drop_table('review_media')
    op.drop_table('reviews')
    
    op.execute("DROP TYPE IF EXISTS reviewstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS reviewflag CASCADE")
    op.execute("DROP TYPE IF EXISTS mediatype CASCADE")
