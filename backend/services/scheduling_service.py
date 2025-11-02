"""
Automated Posting Scheduler Service

This service handles:
- Creating scheduled posts
- Managing recurrence patterns
- Optimal posting time suggestions
- Batch scheduling operations

Author: Spirit Tours Development Team
Created: 2025-10-04
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_
import logging
from croniter import croniter
import pytz

from tasks.social_media_tasks import (
    publish_scheduled_post,
    generate_and_schedule,
    bulk_schedule_posts
)

logger = logging.getLogger(__name__)


class SchedulingService:
    """
    High-level service for scheduling and managing social media posts
    """
    
    # Best posting times by platform (UTC hours)
    OPTIMAL_TIMES = {
        'facebook': [13, 15, 19],  # 1 PM, 3 PM, 7 PM
        'instagram': [11, 14, 17, 19],  # 11 AM, 2 PM, 5 PM, 7 PM
        'twitter': [8, 12, 17, 18],  # 8 AM, 12 PM, 5 PM, 6 PM
        'linkedin': [7, 12, 17],  # 7 AM, 12 PM, 5 PM (workday)
        'tiktok': [18, 19, 20],  # 6 PM, 7 PM, 8 PM (evening)
        'youtube': [14, 18, 20]  # 2 PM, 6 PM, 8 PM
    }
    
    # Recommended posting frequency per platform
    POSTING_FREQUENCY = {
        'facebook': {'min': 1, 'max': 2, 'optimal': 1},  # posts per day
        'instagram': {'min': 1, 'max': 3, 'optimal': 2},
        'twitter': {'min': 3, 'max': 15, 'optimal': 5},
        'linkedin': {'min': 1, 'max': 2, 'optimal': 1},
        'tiktok': {'min': 1, 'max': 4, 'optimal': 3},
        'youtube': {'min': 0.14, 'max': 1, 'optimal': 0.5}  # per week
    }
    
    def __init__(self, db: AsyncSession):
        """Initialize scheduling service"""
        self.db = db
    
    async def schedule_post(
        self,
        platform: str,
        content: str,
        scheduled_time: datetime,
        admin_id: int,
        media_urls: Optional[List[str]] = None,
        hashtags: Optional[List[str]] = None,
        recurring: bool = False,
        recurrence_pattern: Optional[str] = None,
        timezone: str = 'UTC'
    ) -> Dict[str, Any]:
        """
        Schedule a post for publication
        
        Args:
            platform: Platform name
            content: Post content
            scheduled_time: When to publish (datetime)
            admin_id: User ID creating the schedule
            media_urls: Optional media attachments
            hashtags: Optional hashtags
            recurring: Whether this is a recurring post
            recurrence_pattern: Cron-like pattern for recurrence
            timezone: User's timezone
            
        Returns:
            Dict with scheduling result
        """
        try:
            # Validate scheduled time
            if scheduled_time <= datetime.utcnow():
                return {
                    'success': False,
                    'error': 'Scheduled time must be in the future'
                }
            
            # Convert to UTC if needed
            if timezone != 'UTC':
                user_tz = pytz.timezone(timezone)
                scheduled_time = user_tz.localize(scheduled_time).astimezone(pytz.UTC)
            
            # Validate recurrence pattern if provided
            if recurring and recurrence_pattern:
                if not self._validate_cron_pattern(recurrence_pattern):
                    return {
                        'success': False,
                        'error': 'Invalid recurrence pattern'
                    }
            
            # Create scheduled post record
            from database import ScheduledPost
            
            post = ScheduledPost(
                platform=platform,
                content=content,
                media_urls=media_urls or [],
                hashtags=hashtags or [],
                scheduled_time=scheduled_time,
                timezone=timezone,
                recurring=recurring,
                recurrence_pattern=recurrence_pattern,
                status='pending',
                created_by=admin_id,
                created_at=datetime.utcnow()
            )
            
            self.db.add(post)
            await self.db.commit()
            await self.db.refresh(post)
            
            logger.info(f"Scheduled post {post.id} for {platform} at {scheduled_time}")
            
            return {
                'success': True,
                'post_id': post.id,
                'platform': platform,
                'scheduled_time': scheduled_time.isoformat(),
                'status': 'pending',
                'recurring': recurring
            }
            
        except Exception as e:
            logger.error(f"Failed to schedule post: {str(e)}")
            await self.db.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    async def schedule_with_ai(
        self,
        prompt: str,
        platform: str,
        scheduled_time: datetime,
        admin_id: int,
        language: str = 'en',
        tone: str = 'friendly',
        timezone: str = 'UTC'
    ) -> Dict[str, Any]:
        """
        Generate content with AI and schedule for publication
        
        Args:
            prompt: Content generation prompt
            platform: Target platform
            scheduled_time: When to publish
            admin_id: User ID
            language: Content language
            tone: Content tone
            timezone: User's timezone
            
        Returns:
            Dict with generation and scheduling result
        """
        try:
            # Queue AI generation and scheduling task
            task = generate_and_schedule.delay(
                prompt=prompt,
                platform=platform,
                schedule_time=scheduled_time.isoformat(),
                language=language,
                tone=tone
            )
            
            return {
                'success': True,
                'task_id': task.id,
                'platform': platform,
                'scheduled_time': scheduled_time.isoformat(),
                'status': 'generating'
            }
            
        except Exception as e:
            logger.error(f"Failed to schedule with AI: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def bulk_schedule(
        self,
        posts: List[Dict[str, Any]],
        admin_id: int
    ) -> Dict[str, Any]:
        """
        Schedule multiple posts at once
        
        Args:
            posts: List of post dictionaries
            admin_id: User ID
            
        Returns:
            Dict with bulk scheduling results
        """
        try:
            # Queue bulk scheduling task
            task = bulk_schedule_posts.delay(posts)
            
            return {
                'success': True,
                'task_id': task.id,
                'total_posts': len(posts),
                'status': 'processing'
            }
            
        except Exception as e:
            logger.error(f"Bulk scheduling failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_scheduled_posts(
        self,
        platform: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get scheduled posts with optional filters
        
        Args:
            platform: Filter by platform
            status: Filter by status
            start_date: Filter by date range start
            end_date: Filter by date range end
            limit: Maximum results
            
        Returns:
            List of scheduled posts
        """
        try:
            from database import ScheduledPost
            
            query = select(ScheduledPost)
            
            # Apply filters
            conditions = []
            if platform:
                conditions.append(ScheduledPost.platform == platform)
            if status:
                conditions.append(ScheduledPost.status == status)
            if start_date:
                conditions.append(ScheduledPost.scheduled_time >= start_date)
            if end_date:
                conditions.append(ScheduledPost.scheduled_time <= end_date)
            
            if conditions:
                query = query.where(and_(*conditions))
            
            query = query.order_by(ScheduledPost.scheduled_time).limit(limit)
            
            result = await self.db.execute(query)
            posts = result.scalars().all()
            
            return [
                {
                    'id': post.id,
                    'platform': post.platform,
                    'content': post.content,
                    'scheduled_time': post.scheduled_time.isoformat(),
                    'status': post.status,
                    'recurring': post.recurring,
                    'created_at': post.created_at.isoformat()
                }
                for post in posts
            ]
            
        except Exception as e:
            logger.error(f"Failed to get scheduled posts: {str(e)}")
            return []
    
    async def cancel_scheduled_post(self, post_id: int) -> Dict[str, Any]:
        """
        Cancel a scheduled post
        
        Args:
            post_id: Post ID to cancel
            
        Returns:
            Dict with cancellation result
        """
        try:
            from database import ScheduledPost
            
            result = await self.db.execute(
                update(ScheduledPost)
                .where(ScheduledPost.id == post_id)
                .where(ScheduledPost.status == 'pending')
                .values(status='cancelled', updated_at=datetime.utcnow())
            )
            
            await self.db.commit()
            
            if result.rowcount == 0:
                return {
                    'success': False,
                    'error': 'Post not found or already processed'
                }
            
            return {
                'success': True,
                'post_id': post_id,
                'status': 'cancelled'
            }
            
        except Exception as e:
            logger.error(f"Failed to cancel post: {str(e)}")
            await self.db.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    async def reschedule_post(
        self,
        post_id: int,
        new_scheduled_time: datetime
    ) -> Dict[str, Any]:
        """
        Reschedule a pending post to a new time
        
        Args:
            post_id: Post ID to reschedule
            new_scheduled_time: New scheduled time
            
        Returns:
            Dict with rescheduling result
        """
        try:
            from database import ScheduledPost
            
            result = await self.db.execute(
                update(ScheduledPost)
                .where(ScheduledPost.id == post_id)
                .where(ScheduledPost.status == 'pending')
                .values(
                    scheduled_time=new_scheduled_time,
                    updated_at=datetime.utcnow()
                )
            )
            
            await self.db.commit()
            
            if result.rowcount == 0:
                return {
                    'success': False,
                    'error': 'Post not found or already processed'
                }
            
            return {
                'success': True,
                'post_id': post_id,
                'new_scheduled_time': new_scheduled_time.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to reschedule post: {str(e)}")
            await self.db.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    def suggest_optimal_times(
        self,
        platform: str,
        date: datetime,
        timezone: str = 'UTC',
        count: int = 3
    ) -> List[datetime]:
        """
        Suggest optimal posting times for a platform and date
        
        Args:
            platform: Platform name
            date: Target date
            timezone: User's timezone
            count: Number of suggestions
            
        Returns:
            List of suggested datetime objects
        """
        try:
            optimal_hours = self.OPTIMAL_TIMES.get(platform, [12, 15, 18])
            
            # Get user timezone
            user_tz = pytz.timezone(timezone)
            
            # Create datetime objects for optimal times
            suggestions = []
            for hour in optimal_hours[:count]:
                dt = datetime(date.year, date.month, date.day, hour, 0, 0)
                # Localize to UTC then convert to user timezone
                utc_dt = pytz.UTC.localize(dt)
                local_dt = utc_dt.astimezone(user_tz)
                suggestions.append(local_dt)
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Failed to suggest times: {str(e)}")
            return []
    
    def get_posting_frequency_recommendation(
        self,
        platform: str
    ) -> Dict[str, Any]:
        """
        Get recommended posting frequency for a platform
        
        Args:
            platform: Platform name
            
        Returns:
            Dict with frequency recommendations
        """
        freq = self.POSTING_FREQUENCY.get(platform, {
            'min': 1, 'max': 3, 'optimal': 2
        })
        
        return {
            'platform': platform,
            'min_per_day': freq['min'],
            'max_per_day': freq['max'],
            'optimal_per_day': freq['optimal'],
            'recommendation': f"Post {freq['optimal']} time(s) per day for optimal engagement"
        }
    
    def _validate_cron_pattern(self, pattern: str) -> bool:
        """Validate cron pattern syntax"""
        try:
            croniter(pattern)
            return True
        except Exception:
            return False
    
    def get_next_occurrences(
        self,
        cron_pattern: str,
        start_date: datetime,
        count: int = 5
    ) -> List[datetime]:
        """
        Get next N occurrences of a cron pattern
        
        Args:
            cron_pattern: Cron expression
            start_date: Starting date
            count: Number of occurrences
            
        Returns:
            List of datetime objects
        """
        try:
            cron = croniter(cron_pattern, start_date)
            return [cron.get_next(datetime) for _ in range(count)]
        except Exception as e:
            logger.error(f"Failed to calculate occurrences: {str(e)}")
            return []
