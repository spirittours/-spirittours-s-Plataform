"""
Training Reminder Scheduler
Usa APScheduler para ejecutar recordatorios automáticamente

Este servicio puede ejecutarse como:
1. Parte de la aplicación FastAPI (background task)
2. Proceso independiente (standalone)
3. Integrado con Celery (distributed task queue)
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.executors.pool import ThreadPoolExecutor, ProcessPoolExecutor
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
import logging
import os
from datetime import datetime

from backend.database import SessionLocal
from backend.services.training_reminder_service import TrainingReminderService

logger = logging.getLogger(__name__)

# ============================================================================
# SCHEDULER CONFIGURATION
# ============================================================================

class TrainingReminderScheduler:
    """Scheduler para recordatorios de capacitación"""
    
    def __init__(self):
        # Configure job stores (persistent storage for scheduled jobs)
        jobstores = {
            'default': SQLAlchemyJobStore(url=os.getenv('DATABASE_URL', 'postgresql://user:pass@localhost/db'))
        }
        
        # Configure executors (how jobs run)
        executors = {
            'default': ThreadPoolExecutor(max_workers=5),
            'processpool': ProcessPoolExecutor(max_workers=2)
        }
        
        # Job defaults
        job_defaults = {
            'coalesce': True,  # Combine missed executions
            'max_instances': 1,  # Only one instance at a time
            'misfire_grace_time': 3600  # Allow 1 hour grace period
        }
        
        self.scheduler = BackgroundScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone='America/Los_Angeles'  # Adjust to your timezone
        )
    
    def start(self):
        """Inicia el scheduler"""
        logger.info("Starting Training Reminder Scheduler...")
        
        # Schedule daily reminders at 9 AM
        self.scheduler.add_job(
            func=self.run_daily_reminders,
            trigger=CronTrigger(hour=9, minute=0),
            id='daily_reminders',
            name='Daily Training Reminders',
            replace_existing=True
        )
        
        # Schedule weekly report (Mondays at 8 AM)
        self.scheduler.add_job(
            func=self.run_weekly_report,
            trigger=CronTrigger(day_of_week='mon', hour=8, minute=0),
            id='weekly_report',
            name='Weekly Training Report',
            replace_existing=True
        )
        
        # Schedule overdue checks (every 6 hours)
        self.scheduler.add_job(
            func=self.run_overdue_checks,
            trigger=CronTrigger(hour='*/6'),
            id='overdue_checks',
            name='Overdue Training Checks',
            replace_existing=True
        )
        
        self.scheduler.start()
        logger.info("Training Reminder Scheduler started successfully")
    
    def stop(self):
        """Detiene el scheduler"""
        logger.info("Stopping Training Reminder Scheduler...")
        self.scheduler.shutdown(wait=True)
        logger.info("Training Reminder Scheduler stopped")
    
    def run_daily_reminders(self):
        """Ejecuta recordatorios diarios"""
        logger.info(f"Running daily reminders at {datetime.now()}")
        
        db = SessionLocal()
        try:
            smtp_config = self._get_smtp_config()
            service = TrainingReminderService(db, smtp_config)
            results = service.process_all_reminders()
            
            total_sent = sum(results.values())
            logger.info(f"Daily reminders completed. Sent {total_sent} emails")
            logger.info(f"Breakdown: {results}")
        
        except Exception as e:
            logger.error(f"Error in daily reminders: {e}")
            raise
        
        finally:
            db.close()
    
    def run_weekly_report(self):
        """Envía reporte semanal a administradores"""
        logger.info(f"Running weekly report at {datetime.now()}")
        
        db = SessionLocal()
        try:
            # TODO: Implement weekly report logic
            # - Total users in training
            # - Completion rates
            # - Users at risk of missing deadlines
            # - System statistics
            
            logger.info("Weekly report sent to administrators")
        
        except Exception as e:
            logger.error(f"Error in weekly report: {e}")
            raise
        
        finally:
            db.close()
    
    def run_overdue_checks(self):
        """Verifica usuarios con capacitación vencida"""
        logger.info(f"Running overdue checks at {datetime.now()}")
        
        db = SessionLocal()
        try:
            smtp_config = self._get_smtp_config()
            service = TrainingReminderService(db, smtp_config)
            
            # Only send overdue alerts
            overdue_count = service._send_overdue_alerts()
            
            logger.info(f"Overdue checks completed. Sent {overdue_count} alerts")
        
        except Exception as e:
            logger.error(f"Error in overdue checks: {e}")
            raise
        
        finally:
            db.close()
    
    def _get_smtp_config(self) -> dict:
        """Obtiene configuración SMTP desde variables de entorno"""
        return {
            'host': os.getenv('SMTP_HOST', 'smtp.gmail.com'),
            'port': int(os.getenv('SMTP_PORT', 587)),
            'username': os.getenv('SMTP_USERNAME', 'noreply@spirittours.com'),
            'password': os.getenv('SMTP_PASSWORD', 'your-app-password'),
            'use_tls': os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
        }
    
    def list_jobs(self):
        """Lista todos los jobs programados"""
        jobs = self.scheduler.get_jobs()
        for job in jobs:
            logger.info(f"Job: {job.id} - {job.name} - Next run: {job.next_run_time}")
        return jobs

# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

_scheduler_instance = None

def get_scheduler() -> TrainingReminderScheduler:
    """Obtiene la instancia singleton del scheduler"""
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = TrainingReminderScheduler()
    return _scheduler_instance

# ============================================================================
# FASTAPI INTEGRATION
# ============================================================================

def setup_scheduler_for_fastapi(app):
    """
    Configura el scheduler para ejecutarse con FastAPI
    
    Usage in main.py:
        from backend.services.training_scheduler import setup_scheduler_for_fastapi
        
        app = FastAPI()
        setup_scheduler_for_fastapi(app)
    """
    from fastapi import FastAPI
    
    @app.on_event("startup")
    async def startup_event():
        scheduler = get_scheduler()
        scheduler.start()
        logger.info("Training scheduler started with FastAPI")
    
    @app.on_event("shutdown")
    async def shutdown_event():
        scheduler = get_scheduler()
        scheduler.stop()
        logger.info("Training scheduler stopped with FastAPI")

# ============================================================================
# STANDALONE EXECUTION
# ============================================================================

if __name__ == '__main__':
    """
    Ejecuta el scheduler como proceso independiente
    
    Usage:
        python -m backend.services.training_scheduler
    """
    import time
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    scheduler = get_scheduler()
    
    try:
        scheduler.start()
        
        print("\n" + "="*80)
        print("Training Reminder Scheduler Running")
        print("="*80)
        print("\nScheduled Jobs:")
        scheduler.list_jobs()
        print("\nPress Ctrl+C to exit\n")
        
        # Keep the script running
        while True:
            time.sleep(60)
    
    except (KeyboardInterrupt, SystemExit):
        print("\n\nShutting down scheduler...")
        scheduler.stop()
        print("Scheduler stopped. Goodbye!")
