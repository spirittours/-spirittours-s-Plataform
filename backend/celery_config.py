"""
Celery Configuration for Automated Posting Scheduler

This module configures Celery for background task processing,
scheduled posts, and automated social media publishing.

Author: Spirit Tours Development Team
Created: 2025-10-04
"""

from celery import Celery
from celery.schedules import crontab
import os
from datetime import timedelta

# Redis connection URL from environment
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
BROKER_URL = os.getenv('CELERY_BROKER_URL', REDIS_URL)
RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', REDIS_URL)

# Initialize Celery app
celery_app = Celery(
    'spirit_tours_social_media',
    broker=BROKER_URL,
    backend=RESULT_BACKEND,
    include=[
        'backend.tasks.social_media_tasks',
        'backend.tasks.analytics_tasks',
        'backend.tasks.email_tasks',
        'backend.services.email_queue_manager'
    ]
)

# Celery Configuration
celery_app.conf.update(
    # Task execution settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task result settings
    result_expires=3600,  # Results expire after 1 hour
    result_extended=True,
    
    # Task routing
    task_routes={
        'backend.tasks.social_media_tasks.publish_scheduled_post': {'queue': 'social_media'},
        'backend.tasks.social_media_tasks.generate_and_schedule': {'queue': 'social_media'},
        'backend.tasks.analytics_tasks.calculate_engagement': {'queue': 'analytics'},
        'backend.tasks.analytics_tasks.update_analytics': {'queue': 'analytics'},
        'backend.tasks.email_tasks.fetch_new_emails': {'queue': 'email'},
        'backend.tasks.email_tasks.classify_pending_emails': {'queue': 'email'},
        'backend.tasks.email_tasks.send_auto_responses': {'queue': 'email'},
        'backend.tasks.email_tasks.check_sla_breaches': {'queue': 'email'},
        'backend.tasks.email_tasks.aggregate_daily_analytics': {'queue': 'email'},
        # Email Queue System (Priority-based queues)
        'send_email_task': {'queue': 'email_normal'},  # Will be overridden by priority
        'process_scheduled_emails': {'queue': 'email'},
        'process_retry_emails': {'queue': 'email'},
        'cleanup_old_emails': {'queue': 'email'},
    },
    
    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    
    # Task retry settings
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    
    # Task time limits
    task_soft_time_limit=300,  # 5 minutes soft limit
    task_time_limit=600,       # 10 minutes hard limit
    
    # Beat scheduler settings (for periodic tasks)
    beat_schedule={
        # Check for scheduled posts every minute
        'check-scheduled-posts': {
            'task': 'backend.tasks.social_media_tasks.check_and_publish_scheduled_posts',
            'schedule': timedelta(minutes=1),
        },
        # Update analytics every hour
        'update-analytics': {
            'task': 'backend.tasks.analytics_tasks.update_all_analytics',
            'schedule': timedelta(hours=1),
        },
        # Calculate engagement metrics every 4 hours
        'calculate-engagement': {
            'task': 'backend.tasks.analytics_tasks.calculate_engagement_metrics',
            'schedule': timedelta(hours=4),
        },
        # Clean up old completed tasks daily at 3 AM
        'cleanup-old-tasks': {
            'task': 'backend.tasks.maintenance_tasks.cleanup_completed_tasks',
            'schedule': crontab(hour=3, minute=0),
        },
        # Email tasks
        'fetch-emails-every-5min': {
            'task': 'backend.tasks.email_tasks.fetch_new_emails',
            'schedule': timedelta(minutes=5),
        },
        'classify-emails-every-2min': {
            'task': 'backend.tasks.email_tasks.classify_pending_emails',
            'schedule': timedelta(minutes=2),
        },
        'send-auto-responses-every-3min': {
            'task': 'backend.tasks.email_tasks.send_auto_responses',
            'schedule': timedelta(minutes=3),
        },
        'check-sla-breaches-every-15min': {
            'task': 'backend.tasks.email_tasks.check_sla_breaches',
            'schedule': timedelta(minutes=15),
        },
        'aggregate-email-analytics-daily': {
            'task': 'backend.tasks.email_tasks.aggregate_daily_analytics',
            'schedule': crontab(hour=1, minute=0),  # Daily at 1 AM
        },
        # Email Queue System - Scheduled tasks
        'process-scheduled-emails-every-minute': {
            'task': 'process_scheduled_emails',
            'schedule': timedelta(minutes=1),
        },
        'process-retry-emails-every-5min': {
            'task': 'process_retry_emails',
            'schedule': timedelta(minutes=5),
        },
        'cleanup-old-emails-daily': {
            'task': 'cleanup_old_emails',
            'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
        },
    },
)

# Task base class configuration
celery_app.conf.task_default_queue = 'default'
celery_app.conf.task_default_exchange = 'default'
celery_app.conf.task_default_routing_key = 'default'

# Monitoring and logging
celery_app.conf.worker_send_task_events = True
celery_app.conf.task_send_sent_event = True

# Security
celery_app.conf.task_ignore_result = False
celery_app.conf.task_track_started = True

if __name__ == '__main__':
    celery_app.start()
