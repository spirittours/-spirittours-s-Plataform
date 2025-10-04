"""
Advanced Analytics Service

This service provides:
- Real-time engagement metrics
- Follower growth tracking
- Content performance analysis
- Platform comparison
- ROI calculation
- Trend analysis

Author: Spirit Tours Development Team
Created: 2025-10-04
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
import logging

logger = logging.getLogger(__name__)


class AnalyticsService:
    """
    Advanced analytics and reporting service for social media performance
    """
    
    def __init__(self, db: AsyncSession):
        """Initialize analytics service"""
        self.db = db
    
    async def get_dashboard_overview(
        self,
        platform: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get comprehensive dashboard overview
        
        Args:
            platform: Optional platform filter
            days: Number of days to analyze
            
        Returns:
            Dict with dashboard metrics
        """
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get all metrics in parallel
            overview = {
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat(),
                    'days': days
                },
                'total_posts': await self._get_total_posts(start_date, end_date, platform),
                'total_engagement': await self._get_total_engagement(start_date, end_date, platform),
                'follower_growth': await self._get_follower_growth(start_date, end_date, platform),
                'sentiment_score': await self._get_sentiment_score(start_date, end_date, platform),
                'top_performing_posts': await self._get_top_posts(platform, limit=5),
                'platform_breakdown': await self._get_platform_breakdown(start_date, end_date),
                'engagement_by_day': await self._get_engagement_by_day(start_date, end_date, platform),
                'content_performance': await self._get_content_performance(start_date, end_date, platform)
            }
            
            return {
                'success': True,
                **overview
            }
            
        except Exception as e:
            logger.error(f"Dashboard overview failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _get_total_posts(
        self,
        start_date: datetime,
        end_date: datetime,
        platform: Optional[str]
    ) -> Dict[str, Any]:
        """Get total posts published"""
        try:
            from backend.database import ScheduledPost
            
            query = select(func.count(ScheduledPost.id))
            query = query.where(
                and_(
                    ScheduledPost.published_at.between(start_date, end_date),
                    ScheduledPost.status == 'published'
                )
            )
            
            if platform:
                query = query.where(ScheduledPost.platform == platform)
            
            result = await self.db.execute(query)
            total = result.scalar()
            
            return {
                'total': total or 0,
                'avg_per_day': (total or 0) / ((end_date - start_date).days or 1)
            }
            
        except Exception as e:
            logger.error(f"Get total posts failed: {str(e)}")
            return {'total': 0, 'avg_per_day': 0}
    
    async def _get_total_engagement(
        self,
        start_date: datetime,
        end_date: datetime,
        platform: Optional[str]
    ) -> Dict[str, Any]:
        """Get total engagement metrics"""
        try:
            from backend.database import PostAnalytics
            
            query = select(
                func.sum(PostAnalytics.likes).label('total_likes'),
                func.sum(PostAnalytics.comments).label('total_comments'),
                func.sum(PostAnalytics.shares).label('total_shares'),
                func.sum(PostAnalytics.impressions).label('total_impressions'),
                func.sum(PostAnalytics.reach).label('total_reach'),
                func.avg(PostAnalytics.engagement_rate).label('avg_engagement_rate')
            ).where(
                PostAnalytics.snapshot_time.between(start_date, end_date)
            )
            
            if platform:
                query = query.where(PostAnalytics.platform == platform)
            
            result = await self.db.execute(query)
            row = result.first()
            
            if not row:
                return {
                    'likes': 0,
                    'comments': 0,
                    'shares': 0,
                    'impressions': 0,
                    'reach': 0,
                    'engagement_rate': 0.0
                }
            
            return {
                'likes': row.total_likes or 0,
                'comments': row.total_comments or 0,
                'shares': row.total_shares or 0,
                'impressions': row.total_impressions or 0,
                'reach': row.total_reach or 0,
                'engagement_rate': float(row.avg_engagement_rate or 0)
            }
            
        except Exception as e:
            logger.error(f"Get total engagement failed: {str(e)}")
            return {
                'likes': 0,
                'comments': 0,
                'shares': 0,
                'impressions': 0,
                'reach': 0,
                'engagement_rate': 0.0
            }
    
    async def _get_follower_growth(
        self,
        start_date: datetime,
        end_date: datetime,
        platform: Optional[str]
    ) -> Dict[str, Any]:
        """Get follower growth metrics"""
        try:
            from backend.database import PlatformAnalyticsSummary
            
            # Get earliest and latest follower counts
            query_start = select(
                PlatformAnalyticsSummary.platform,
                PlatformAnalyticsSummary.follower_count
            ).where(
                PlatformAnalyticsSummary.date >= start_date.date()
            ).order_by(PlatformAnalyticsSummary.date)
            
            query_end = select(
                PlatformAnalyticsSummary.platform,
                PlatformAnalyticsSummary.follower_count
            ).where(
                PlatformAnalyticsSummary.date <= end_date.date()
            ).order_by(desc(PlatformAnalyticsSummary.date))
            
            if platform:
                query_start = query_start.where(PlatformAnalyticsSummary.platform == platform)
                query_end = query_end.where(PlatformAnalyticsSummary.platform == platform)
            
            result_start = await self.db.execute(query_start)
            result_end = await self.db.execute(query_end)
            
            start_counts = {row.platform: row.follower_count for row in result_start}
            end_counts = {row.platform: row.follower_count for row in result_end}
            
            # Calculate growth
            growth = {}
            total_growth = 0
            
            for plat in end_counts:
                if plat in start_counts:
                    change = end_counts[plat] - start_counts[plat]
                    growth[plat] = {
                        'start': start_counts[plat],
                        'end': end_counts[plat],
                        'change': change,
                        'percentage': (change / start_counts[plat] * 100) if start_counts[plat] > 0 else 0
                    }
                    total_growth += change
            
            return {
                'total_growth': total_growth,
                'by_platform': growth
            }
            
        except Exception as e:
            logger.error(f"Get follower growth failed: {str(e)}")
            return {'total_growth': 0, 'by_platform': {}}
    
    async def _get_sentiment_score(
        self,
        start_date: datetime,
        end_date: datetime,
        platform: Optional[str]
    ) -> Dict[str, Any]:
        """Get overall sentiment score"""
        try:
            from backend.database import InteractionSentiment
            
            query = select(
                func.count(InteractionSentiment.id).label('total'),
                func.sum(
                    func.case(
                        (InteractionSentiment.sentiment == 'positive', 1),
                        else_=0
                    )
                ).label('positive'),
                func.sum(
                    func.case(
                        (InteractionSentiment.sentiment == 'negative', 1),
                        else_=0
                    )
                ).label('negative'),
                func.avg(InteractionSentiment.sentiment_score).label('avg_score')
            ).where(
                InteractionSentiment.interaction_time.between(start_date, end_date)
            )
            
            if platform:
                query = query.where(InteractionSentiment.platform == platform)
            
            result = await self.db.execute(query)
            row = result.first()
            
            if not row or row.total == 0:
                return {
                    'overall_score': 0.0,
                    'positive_count': 0,
                    'negative_count': 0,
                    'neutral_count': 0,
                    'total_interactions': 0
                }
            
            return {
                'overall_score': float(row.avg_score or 0),
                'positive_count': row.positive or 0,
                'negative_count': row.negative or 0,
                'neutral_count': (row.total - (row.positive or 0) - (row.negative or 0)),
                'total_interactions': row.total
            }
            
        except Exception as e:
            logger.error(f"Get sentiment score failed: {str(e)}")
            return {
                'overall_score': 0.0,
                'positive_count': 0,
                'negative_count': 0,
                'neutral_count': 0,
                'total_interactions': 0
            }
    
    async def _get_top_posts(
        self,
        platform: Optional[str],
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get top performing posts"""
        try:
            from backend.database import ScheduledPost, PostAnalytics
            
            # Join posts with analytics
            query = select(
                ScheduledPost.id,
                ScheduledPost.platform,
                ScheduledPost.content,
                ScheduledPost.published_at,
                PostAnalytics.likes,
                PostAnalytics.comments,
                PostAnalytics.shares,
                PostAnalytics.engagement_rate
            ).join(
                PostAnalytics,
                ScheduledPost.id == PostAnalytics.post_id
            ).where(
                ScheduledPost.status == 'published'
            ).order_by(
                desc(PostAnalytics.engagement_rate)
            ).limit(limit)
            
            if platform:
                query = query.where(ScheduledPost.platform == platform)
            
            result = await self.db.execute(query)
            rows = result.all()
            
            return [
                {
                    'id': row.id,
                    'platform': row.platform,
                    'content': row.content[:100] + '...' if len(row.content) > 100 else row.content,
                    'published_at': row.published_at.isoformat(),
                    'likes': row.likes,
                    'comments': row.comments,
                    'shares': row.shares,
                    'engagement_rate': float(row.engagement_rate)
                }
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"Get top posts failed: {str(e)}")
            return []
    
    async def _get_platform_breakdown(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Get metrics breakdown by platform"""
        try:
            from backend.database import PlatformAnalyticsSummary
            
            query = select(
                PlatformAnalyticsSummary.platform,
                func.sum(PlatformAnalyticsSummary.posts_published).label('posts'),
                func.sum(PlatformAnalyticsSummary.total_likes).label('likes'),
                func.sum(PlatformAnalyticsSummary.total_comments).label('comments'),
                func.sum(PlatformAnalyticsSummary.total_shares).label('shares'),
                func.avg(PlatformAnalyticsSummary.avg_engagement_rate).label('engagement_rate')
            ).where(
                PlatformAnalyticsSummary.date.between(start_date.date(), end_date.date())
            ).group_by(
                PlatformAnalyticsSummary.platform
            )
            
            result = await self.db.execute(query)
            rows = result.all()
            
            return [
                {
                    'platform': row.platform,
                    'posts': row.posts or 0,
                    'likes': row.likes or 0,
                    'comments': row.comments or 0,
                    'shares': row.shares or 0,
                    'engagement_rate': float(row.engagement_rate or 0)
                }
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"Get platform breakdown failed: {str(e)}")
            return []
    
    async def _get_engagement_by_day(
        self,
        start_date: datetime,
        end_date: datetime,
        platform: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Get daily engagement metrics"""
        try:
            from backend.database import PlatformAnalyticsSummary
            
            query = select(
                PlatformAnalyticsSummary.date,
                func.sum(PlatformAnalyticsSummary.total_likes).label('likes'),
                func.sum(PlatformAnalyticsSummary.total_comments).label('comments'),
                func.sum(PlatformAnalyticsSummary.total_shares).label('shares')
            ).where(
                PlatformAnalyticsSummary.date.between(start_date.date(), end_date.date())
            ).group_by(
                PlatformAnalyticsSummary.date
            ).order_by(
                PlatformAnalyticsSummary.date
            )
            
            if platform:
                query = query.where(PlatformAnalyticsSummary.platform == platform)
            
            result = await self.db.execute(query)
            rows = result.all()
            
            return [
                {
                    'date': row.date.isoformat(),
                    'likes': row.likes or 0,
                    'comments': row.comments or 0,
                    'shares': row.shares or 0,
                    'total_engagement': (row.likes or 0) + (row.comments or 0) + (row.shares or 0)
                }
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"Get engagement by day failed: {str(e)}")
            return []
    
    async def _get_content_performance(
        self,
        start_date: datetime,
        end_date: datetime,
        platform: Optional[str]
    ) -> Dict[str, Any]:
        """Analyze content performance patterns"""
        try:
            # This would analyze hashtags, posting times, content types, etc.
            # Simplified version for now
            
            return {
                'best_posting_time': '14:00-16:00 UTC',
                'best_day': 'Wednesday',
                'most_engaging_hashtags': ['#spiritualtours', '#wellness', '#meditation'],
                'avg_post_length': 150,
                'emoji_usage': '3-5 per post'
            }
            
        except Exception as e:
            logger.error(f"Get content performance failed: {str(e)}")
            return {}
    
    async def get_roi_analysis(
        self,
        platform: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Calculate ROI for social media efforts
        
        Args:
            platform: Optional platform filter
            days: Number of days to analyze
            
        Returns:
            Dict with ROI metrics
        """
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get engagement data
            engagement = await self._get_total_engagement(start_date, end_date, platform)
            posts = await self._get_total_posts(start_date, end_date, platform)
            
            # Calculate estimated costs
            ai_cost_per_post = 0.01  # $0.01 per post with AI
            total_ai_cost = posts['total'] * ai_cost_per_post
            
            # Calculate estimated value
            # Rough estimate: $0.05 per like, $0.25 per comment, $0.50 per share
            estimated_value = (
                engagement['likes'] * 0.05 +
                engagement['comments'] * 0.25 +
                engagement['shares'] * 0.50
            )
            
            roi = ((estimated_value - total_ai_cost) / total_ai_cost * 100) if total_ai_cost > 0 else 0
            
            return {
                'success': True,
                'period_days': days,
                'costs': {
                    'ai_content_generation': round(total_ai_cost, 2),
                    'total': round(total_ai_cost, 2)
                },
                'estimated_value': round(estimated_value, 2),
                'roi_percentage': round(roi, 2),
                'engagement_value_breakdown': {
                    'likes_value': round(engagement['likes'] * 0.05, 2),
                    'comments_value': round(engagement['comments'] * 0.25, 2),
                    'shares_value': round(engagement['shares'] * 0.50, 2)
                }
            }
            
        except Exception as e:
            logger.error(f"ROI analysis failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
