"""
Celery Tasks for Social Media Operations

This module defines background tasks for:
- Publishing scheduled posts
- Generating content with AI
- Posting to social media platforms
- Handling post failures and retries

Author: Spirit Tours Development Team
Created: 2025-10-04
"""

from celery import Task
from celery.utils.log import get_task_logger
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import asyncio

from celery_config import celery_app
from database import get_db
from services.ai_content_service import AIContentService
from services.social_media_adapters import (
    FacebookAdapter,
    InstagramAdapter,
    TwitterAdapter
)

logger = get_task_logger(__name__)


class CallbackTask(Task):
    """Base task with callback support"""
    
    def on_success(self, retval, task_id, args, kwargs):
        """Success callback"""
        logger.info(f"Task {task_id} succeeded: {retval}")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Failure callback"""
        logger.error(f"Task {task_id} failed: {exc}")


@celery_app.task(base=CallbackTask, bind=True, max_retries=3)
def publish_scheduled_post(
    self,
    post_id: int,
    platform: str,
    content: str,
    credentials: Dict[str, str],
    media_urls: Optional[list] = None
) -> Dict[str, Any]:
    """
    Publish a scheduled post to a social media platform
    
    Args:
        self: Celery task instance
        post_id: Database ID of the scheduled post
        platform: Platform name (facebook, instagram, twitter, etc.)
        content: Post content/caption
        credentials: Platform credentials (decrypted)
        media_urls: Optional list of media URLs to attach
        
    Returns:
        Dict with publication result
    """
    try:
        logger.info(f"Publishing post {post_id} to {platform}")
        
        # Select appropriate adapter
        adapter_map = {
            'facebook': FacebookAdapter,
            'instagram': InstagramAdapter,
            'twitter': TwitterAdapter
        }
        
        adapter_class = adapter_map.get(platform)
        if not adapter_class:
            raise ValueError(f"Unsupported platform: {platform}")
        
        # Initialize adapter with credentials
        from services.ai_providers_base import ProviderConfig
        from services.ai_providers_base import AIProvider
        
        # Create adapter instance
        # Note: This is simplified - actual implementation would use proper config
        adapter = adapter_class(credentials)
        
        # Publish post
        result = asyncio.run(adapter.publish_post({
            'content': content,
            'media_urls': media_urls or []
        }))
        
        # Update database with result
        _update_post_status(post_id, 'published', result)
        
        logger.info(f"Successfully published post {post_id} to {platform}")
        
        return {
            'success': True,
            'post_id': post_id,
            'platform': platform,
            'platform_post_id': result.get('id'),
            'published_at': datetime.utcnow().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Failed to publish post {post_id}: {str(exc)}")
        
        # Update database with error
        _update_post_status(post_id, 'failed', {'error': str(exc)})
        
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@celery_app.task(bind=True, max_retries=3)
def generate_and_schedule(
    self,
    prompt: str,
    platform: str,
    schedule_time: str,
    language: str = 'en',
    tone: str = 'friendly'
) -> Dict[str, Any]:
    """
    Generate content with AI and schedule for later publication
    
    Args:
        self: Celery task instance
        prompt: Content generation prompt
        platform: Target platform
        schedule_time: ISO format datetime string
        language: Content language
        tone: Content tone
        
    Returns:
        Dict with generation and scheduling result
    """
    try:
        logger.info(f"Generating content for {platform} scheduled at {schedule_time}")
        
        # Generate content with AI
        async def generate():
            db = next(get_db())
            service = AIContentService(db)
            return await service.generate_post(
                prompt=prompt,
                platform=platform,
                language=language,
                tone=tone
            )
        
        result = asyncio.run(generate())
        
        if not result.get('success'):
            raise ValueError(f"Content generation failed: {result.get('error')}")
        
        content = result['content']
        
        # Store scheduled post in database
        post_id = _create_scheduled_post(
            platform=platform,
            content=content,
            schedule_time=schedule_time,
            metadata=result.get('metadata', {})
        )
        
        logger.info(f"Created scheduled post {post_id}")
        
        return {
            'success': True,
            'post_id': post_id,
            'content': content,
            'scheduled_time': schedule_time
        }
        
    except Exception as exc:
        logger.error(f"Failed to generate and schedule: {str(exc)}")
        raise self.retry(exc=exc, countdown=30)


@celery_app.task()
def check_and_publish_scheduled_posts():
    """
    Periodic task to check for posts scheduled for publication
    and trigger their publication
    
    This runs every minute via Celery Beat
    """
    try:
        logger.info("Checking for scheduled posts")
        
        # Get posts scheduled for now or in the past
        now = datetime.utcnow()
        pending_posts = _get_pending_posts(now)
        
        logger.info(f"Found {len(pending_posts)} posts to publish")
        
        results = []
        for post in pending_posts:
            # Mark as processing
            _update_post_status(post['id'], 'processing')
            
            # Queue publication task
            task = publish_scheduled_post.delay(
                post_id=post['id'],
                platform=post['platform'],
                content=post['content'],
                credentials=post['credentials'],
                media_urls=post.get('media_urls')
            )
            
            results.append({
                'post_id': post['id'],
                'task_id': task.id,
                'platform': post['platform']
            })
        
        return {
            'success': True,
            'posts_queued': len(results),
            'results': results
        }
        
    except Exception as exc:
        logger.error(f"Failed to check scheduled posts: {str(exc)}")
        return {
            'success': False,
            'error': str(exc)
        }


@celery_app.task(bind=True, max_retries=5)
def retry_failed_post(self, post_id: int) -> Dict[str, Any]:
    """
    Retry publishing a failed post
    
    Args:
        self: Celery task instance
        post_id: Database ID of the failed post
        
    Returns:
        Dict with retry result
    """
    try:
        logger.info(f"Retrying failed post {post_id}")
        
        # Get post details
        post = _get_post_by_id(post_id)
        
        if not post:
            raise ValueError(f"Post {post_id} not found")
        
        # Queue publication task
        task = publish_scheduled_post.delay(
            post_id=post['id'],
            platform=post['platform'],
            content=post['content'],
            credentials=post['credentials'],
            media_urls=post.get('media_urls')
        )
        
        return {
            'success': True,
            'post_id': post_id,
            'task_id': task.id
        }
        
    except Exception as exc:
        logger.error(f"Failed to retry post {post_id}: {str(exc)}")
        raise self.retry(exc=exc, countdown=300)  # 5 minutes


@celery_app.task()
def bulk_schedule_posts(posts: list) -> Dict[str, Any]:
    """
    Schedule multiple posts at once
    
    Args:
        posts: List of post dictionaries with content and schedule info
        
    Returns:
        Dict with bulk scheduling results
    """
    try:
        logger.info(f"Bulk scheduling {len(posts)} posts")
        
        results = []
        
        for post in posts:
            if post.get('generate_with_ai'):
                # Generate content with AI first
                task = generate_and_schedule.delay(
                    prompt=post['prompt'],
                    platform=post['platform'],
                    schedule_time=post['schedule_time'],
                    language=post.get('language', 'en'),
                    tone=post.get('tone', 'friendly')
                )
            else:
                # Direct scheduling
                post_id = _create_scheduled_post(
                    platform=post['platform'],
                    content=post['content'],
                    schedule_time=post['schedule_time'],
                    metadata=post.get('metadata', {})
                )
                task = None
            
            results.append({
                'platform': post['platform'],
                'task_id': task.id if task else None,
                'post_id': post.get('post_id'),
                'scheduled_time': post['schedule_time']
            })
        
        return {
            'success': True,
            'total_posts': len(posts),
            'results': results
        }
        
    except Exception as exc:
        logger.error(f"Bulk scheduling failed: {str(exc)}")
        return {
            'success': False,
            'error': str(exc)
        }


# ===== Helper Functions =====

def _update_post_status(post_id: int, status: str, metadata: Optional[Dict] = None):
    """Update scheduled post status in database"""
    try:
        from sqlalchemy import update
        from database import get_db
        
        db = next(get_db())
        
        # TODO: Update scheduled_posts table
        # This is a placeholder - actual implementation depends on your schema
        
        logger.info(f"Updated post {post_id} status to {status}")
        
    except Exception as exc:
        logger.error(f"Failed to update post status: {str(exc)}")


def _create_scheduled_post(
    platform: str,
    content: str,
    schedule_time: str,
    metadata: Dict
) -> int:
    """Create a scheduled post record in database"""
    try:
        from database import get_db
        
        db = next(get_db())
        
        # TODO: Insert into scheduled_posts table
        # This is a placeholder - returns mock ID
        
        post_id = 12345  # Mock
        
        logger.info(f"Created scheduled post {post_id}")
        
        return post_id
        
    except Exception as exc:
        logger.error(f"Failed to create scheduled post: {str(exc)}")
        raise


def _get_pending_posts(current_time: datetime) -> list:
    """Get posts scheduled for publication"""
    try:
        from database import get_db
        
        db = next(get_db())
        
        # TODO: Query scheduled_posts table
        # This is a placeholder - returns empty list
        
        return []
        
    except Exception as exc:
        logger.error(f"Failed to get pending posts: {str(exc)}")
        return []


def _get_post_by_id(post_id: int) -> Optional[Dict]:
    """Get post details by ID"""
    try:
        from database import get_db
        
        db = next(get_db())
        
        # TODO: Query scheduled_posts table
        # This is a placeholder
        
        return None
        
    except Exception as exc:
        logger.error(f"Failed to get post {post_id}: {str(exc)}")
        return None
