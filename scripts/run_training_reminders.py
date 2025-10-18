#!/usr/bin/env python3
"""
Cron Job Script para Recordatorios de Capacitación
Ejecuta el proceso de envío de recordatorios automáticos

Uso:
    python scripts/run_training_reminders.py

Crontab example (ejecutar diariamente a las 9 AM):
    0 9 * * * /usr/bin/python3 /path/to/project/scripts/run_training_reminders.py >> /var/log/training_reminders.log 2>&1
"""

import sys
import os
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.database import SessionLocal
from backend.services.training_reminder_service import TrainingReminderService

def main():
    """Función principal del cron job"""
    print(f"\n{'='*80}")
    print(f"Training Reminders Cron Job - {datetime.now()}")
    print(f"{'='*80}\n")
    
    db = SessionLocal()
    
    try:
        # Get SMTP configuration from environment variables
        smtp_config = {
            'host': os.getenv('SMTP_HOST', 'smtp.gmail.com'),
            'port': int(os.getenv('SMTP_PORT', 587)),
            'username': os.getenv('SMTP_USERNAME', 'noreply@spirittours.com'),
            'password': os.getenv('SMTP_PASSWORD', 'your-app-password'),
            'use_tls': os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
        }
        
        print("Initializing Training Reminder Service...")
        service = TrainingReminderService(db, smtp_config)
        
        print("Processing reminders...")
        results = service.process_all_reminders()
        
        print("\nResults:")
        print(f"  Welcome emails: {results.get('welcome', 0)}")
        print(f"  Progress updates: {results.get('progress', 0)}")
        print(f"  Deadline warnings: {results.get('deadline_warning', 0)}")
        print(f"  Overdue alerts: {results.get('overdue', 0)}")
        print(f"  Completion notifications: {results.get('completion', 0)}")
        print(f"  Certification notifications: {results.get('certification', 0)}")
        
        total_sent = sum(results.values())
        print(f"\nTotal reminders sent: {total_sent}")
        
        print("\n✅ Reminder processing completed successfully")
        
        return 0
    
    except Exception as e:
        print(f"\n❌ Error processing reminders: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    finally:
        db.close()

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
