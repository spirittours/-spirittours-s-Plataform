"""
Sistema de Recordatorios para Capacitación
Servicio para envío automático de emails de recordatorio sobre capacitación

Tipos de recordatorios:
- Bienvenida inicial
- Actualización de progreso
- Advertencia de deadline próximo
- Notificación de vencimiento
- Confirmación de completitud
- Emisión de certificación
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import logging

from backend.models.training_models import (
    TrainingModule, TrainingProgress, TrainingConfiguration,
    TrainingReminderSent, TrainingCertification, ModuleCategory,
    ProgressStatus, ReminderType
)
from backend.models.rbac_models import User

logger = logging.getLogger(__name__)

# ============================================================================
# EMAIL TEMPLATES
# ============================================================================

EMAIL_TEMPLATES = {
    ReminderType.WELCOME: {
        'subject': '🎓 ¡Bienvenido al Sistema de Capacitación de Spirit Tours!',
        'template': '''
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .header {{ background-color: #1976d2; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .module {{ background-color: #f5f5f5; padding: 15px; margin: 10px 0; border-left: 4px solid #d32f2f; }}
                .footer {{ background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; }}
                .btn {{ background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🎓 Bienvenido a Spirit Tours</h1>
            </div>
            <div class="content">
                <h2>Hola {user_name},</h2>
                <p>¡Bienvenido al sistema de capacitación de Spirit Tours! Estamos emocionados de tenerte en nuestro equipo.</p>
                
                <h3>¿Qué sigue?</h3>
                <p>Para comenzar a trabajar en el sistema, debes completar los siguientes módulos obligatorios:</p>
                
                {modules_list}
                
                <p><strong>⚠️ Importante:</strong> Debes completar estos módulos antes de poder acceder completamente al sistema de trabajo.</p>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{dashboard_url}" class="btn">Comenzar Capacitación</a>
                </p>
            </div>
            <div class="footer">
                <p>Spirit Tours - Sistema de Capacitación y Desarrollo</p>
                <p>Este es un email automático. Por favor no responder.</p>
            </div>
        </body>
        </html>
        '''
    },
    
    ReminderType.PROGRESS_UPDATE: {
        'subject': '📊 Actualización de tu Progreso en Capacitación',
        'template': '''
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .header {{ background-color: #1976d2; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .progress-bar {{ background-color: #e0e0e0; height: 30px; border-radius: 15px; overflow: hidden; margin: 20px 0; }}
                .progress-fill {{ background-color: #4caf50; height: 100%; text-align: center; line-height: 30px; color: white; font-weight: bold; }}
                .footer {{ background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; }}
                .btn {{ background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 Actualización de Progreso</h1>
            </div>
            <div class="content">
                <h2>Hola {user_name},</h2>
                <p>¡Gran trabajo hasta ahora! Aquí está tu progreso actual:</p>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {progress_percentage}%">
                        {progress_percentage}%
                    </div>
                </div>
                
                <p><strong>Módulos completados:</strong> {completed_modules}/{total_modules}</p>
                <p><strong>Módulos en progreso:</strong> {in_progress_modules}</p>
                
                {pending_section}
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{dashboard_url}" class="btn">Continuar Capacitación</a>
                </p>
            </div>
            <div class="footer">
                <p>Spirit Tours - Sistema de Capacitación y Desarrollo</p>
                <p>Este es un email automático. Por favor no responder.</p>
            </div>
        </body>
        </html>
        '''
    },
    
    ReminderType.DEADLINE_WARNING: {
        'subject': '⚠️ Recordatorio: Plazo de Capacitación Próximo a Vencer',
        'template': '''
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .header {{ background-color: #f57c00; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .warning {{ background-color: #fff3e0; padding: 15px; margin: 20px 0; border-left: 4px solid #f57c00; }}
                .module {{ background-color: #f5f5f5; padding: 15px; margin: 10px 0; }}
                .footer {{ background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; }}
                .btn {{ background-color: #f57c00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>⚠️ Recordatorio de Deadline</h1>
            </div>
            <div class="content">
                <h2>Hola {user_name},</h2>
                
                <div class="warning">
                    <p><strong>⚠️ Atención:</strong> Tienes módulos con deadline próximo a vencer.</p>
                    <p>Es importante completarlos a tiempo para mantener tu acceso al sistema.</p>
                </div>
                
                <h3>Módulos con deadline cercano:</h3>
                {modules_with_deadlines}
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{dashboard_url}" class="btn">Completar Ahora</a>
                </p>
            </div>
            <div class="footer">
                <p>Spirit Tours - Sistema de Capacitación y Desarrollo</p>
                <p>Este es un email automático. Por favor no responder.</p>
            </div>
        </body>
        </html>
        '''
    },
    
    ReminderType.OVERDUE: {
        'subject': '🚨 URGENTE: Capacitación Vencida - Acción Requerida',
        'template': '''
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .header {{ background-color: #d32f2f; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .alert {{ background-color: #ffebee; padding: 15px; margin: 20px 0; border-left: 4px solid #d32f2f; }}
                .module {{ background-color: #f5f5f5; padding: 15px; margin: 10px 0; border-left: 4px solid #d32f2f; }}
                .footer {{ background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; }}
                .btn {{ background-color: #d32f2f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🚨 Capacitación Vencida</h1>
            </div>
            <div class="content">
                <h2>Hola {user_name},</h2>
                
                <div class="alert">
                    <p><strong>🚨 URGENTE:</strong> Tienes módulos de capacitación vencidos.</p>
                    <p>Tu acceso al sistema puede verse afectado. Por favor completa estos módulos lo antes posible.</p>
                </div>
                
                <h3>Módulos vencidos:</h3>
                {overdue_modules}
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{dashboard_url}" class="btn">Completar Urgentemente</a>
                </p>
                
                <p><small>Si tienes alguna dificultad para completar estos módulos, por favor contacta a tu supervisor.</small></p>
            </div>
            <div class="footer">
                <p>Spirit Tours - Sistema de Capacitación y Desarrollo</p>
                <p>Este es un email automático. Por favor no responder.</p>
            </div>
        </body>
        </html>
        '''
    },
    
    ReminderType.COMPLETION: {
        'subject': '🎉 ¡Felicitaciones! Has Completado un Módulo',
        'template': '''
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .header {{ background-color: #4caf50; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .success {{ background-color: #e8f5e9; padding: 15px; margin: 20px 0; border-left: 4px solid #4caf50; }}
                .footer {{ background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; }}
                .btn {{ background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🎉 ¡Felicitaciones!</h1>
            </div>
            <div class="content">
                <h2>Hola {user_name},</h2>
                
                <div class="success">
                    <p><strong>🎉 ¡Excelente trabajo!</strong> Has completado exitosamente:</p>
                    <h3>{module_title}</h3>
                    <p><strong>Puntaje obtenido:</strong> {score}%</p>
                </div>
                
                <p>Has ganado <strong>+{points} puntos</strong> por completar este módulo.</p>
                
                {next_steps}
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{dashboard_url}" class="btn">Ver mi Progreso</a>
                </p>
            </div>
            <div class="footer">
                <p>Spirit Tours - Sistema de Capacitación y Desarrollo</p>
                <p>Este es un email automático. Por favor no responder.</p>
            </div>
        </body>
        </html>
        '''
    },
    
    ReminderType.CERTIFICATION: {
        'subject': '🏆 ¡Has Obtenido una Nueva Certificación!',
        'template': '''
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .header {{ background-color: #ffd700; color: #333; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .certificate {{ background-color: #fff9e6; padding: 30px; margin: 20px 0; border: 2px solid #ffd700; text-align: center; }}
                .footer {{ background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; }}
                .btn {{ background-color: #ffd700; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏆 Nueva Certificación Obtenida</h1>
            </div>
            <div class="content">
                <h2>Hola {user_name},</h2>
                
                <div class="certificate">
                    <h1 style="color: #ffd700; font-size: 48px; margin: 0;">🏆</h1>
                    <h2>Certificación {certification_level}</h2>
                    <p><strong>Número de Certificado:</strong> {certificate_number}</p>
                    <p><strong>Fecha de Emisión:</strong> {issue_date}</p>
                </div>
                
                <p>¡Felicitaciones por alcanzar este importante hito en tu desarrollo profesional!</p>
                
                <p>Esta certificación demuestra tu compromiso con la excelencia y tu dominio de:</p>
                {modules_completed}
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{dashboard_url}" class="btn">Ver mi Certificado</a>
                </p>
            </div>
            <div class="footer">
                <p>Spirit Tours - Sistema de Capacitación y Desarrollo</p>
                <p>Este es un email automático. Por favor no responder.</p>
            </div>
        </body>
        </html>
        '''
    }
}

# ============================================================================
# TRAINING REMINDER SERVICE
# ============================================================================

class TrainingReminderService:
    """Servicio para gestión de recordatorios de capacitación"""
    
    def __init__(self, db: Session, smtp_config: Optional[Dict[str, Any]] = None):
        self.db = db
        self.smtp_config = smtp_config or {
            'host': 'smtp.gmail.com',
            'port': 587,
            'username': 'noreply@spirittours.com',
            'password': 'your-app-password',
            'use_tls': True
        }
        self.dashboard_url = 'https://spirittours.com/training/dashboard'
    
    # ========================================================================
    # MAIN REMINDER PROCESSING
    # ========================================================================
    
    def process_all_reminders(self) -> Dict[str, int]:
        """
        Procesa todos los recordatorios pendientes
        Debe ejecutarse periódicamente (cron job)
        """
        config = self._get_configuration()
        
        if not config.reminders_enabled:
            logger.info("Reminders are disabled in configuration")
            return {'sent': 0, 'skipped': 0}
        
        results = {
            'welcome': 0,
            'progress': 0,
            'deadline_warning': 0,
            'overdue': 0,
            'completion': 0,
            'certification': 0
        }
        
        # Send welcome emails to new users
        results['welcome'] = self._send_welcome_reminders()
        
        # Send progress updates
        if self._should_send_progress_updates(config):
            results['progress'] = self._send_progress_reminders(config)
        
        # Send deadline warnings
        results['deadline_warning'] = self._send_deadline_warnings()
        
        # Send overdue alerts
        results['overdue'] = self._send_overdue_alerts()
        
        total_sent = sum(results.values())
        logger.info(f"Reminder processing complete. Sent {total_sent} emails")
        
        return results
    
    def _get_configuration(self) -> TrainingConfiguration:
        """Obtiene la configuración activa del sistema"""
        config = self.db.query(TrainingConfiguration).filter(
            TrainingConfiguration.is_active == True
        ).first()
        
        if not config:
            # Create default configuration
            config = TrainingConfiguration(
                mandatory_mode_enabled=True,
                block_system_until_complete=True,
                reminders_enabled=True,
                reminder_frequency_days=3
            )
            self.db.add(config)
            self.db.commit()
        
        return config
    
    # ========================================================================
    # WELCOME REMINDERS
    # ========================================================================
    
    def _send_welcome_reminders(self) -> int:
        """Envía emails de bienvenida a nuevos usuarios"""
        # Find users who started today and haven't received welcome
        today = datetime.now(timezone.utc).date()
        
        new_users_query = self.db.query(User).join(
            TrainingProgress, User.id == TrainingProgress.user_id
        ).filter(
            TrainingProgress.started_at >= datetime.combine(today, datetime.min.time()),
            ~User.id.in_(
                self.db.query(TrainingReminderSent.user_id).filter(
                    TrainingReminderSent.reminder_type == ReminderType.WELCOME
                )
            )
        ).distinct()
        
        count = 0
        for user in new_users_query:
            try:
                self._send_welcome_email(user)
                self._record_reminder_sent(user.id, ReminderType.WELCOME)
                count += 1
            except Exception as e:
                logger.error(f"Error sending welcome email to {user.email}: {e}")
        
        return count
    
    def _send_welcome_email(self, user: User):
        """Envía email de bienvenida a un usuario"""
        # Get obligatory modules
        obligatory_modules = self.db.query(TrainingModule).filter(
            TrainingModule.category == ModuleCategory.OBLIGATORY,
            TrainingModule.is_active == True
        ).order_by(TrainingModule.position).all()
        
        modules_html = ""
        for i, module in enumerate(obligatory_modules, 1):
            modules_html += f'''
            <div class="module">
                <strong>{i}. {module.title}</strong><br>
                <small>⏱️ {module.estimated_hours} horas estimadas</small>
            </div>
            '''
        
        template_data = EMAIL_TEMPLATES[ReminderType.WELCOME]
        html_content = template_data['template'].format(
            user_name=user.full_name or user.username,
            modules_list=modules_html,
            dashboard_url=self.dashboard_url
        )
        
        self._send_email(
            to_email=user.email,
            subject=template_data['subject'],
            html_content=html_content
        )
    
    # ========================================================================
    # PROGRESS REMINDERS
    # ========================================================================
    
    def _should_send_progress_updates(self, config: TrainingConfiguration) -> bool:
        """Determina si es momento de enviar actualizaciones de progreso"""
        last_progress_reminder = self.db.query(TrainingReminderSent).filter(
            TrainingReminderSent.reminder_type == ReminderType.PROGRESS_UPDATE
        ).order_by(TrainingReminderSent.sent_at.desc()).first()
        
        if not last_progress_reminder:
            return True
        
        days_since_last = (datetime.now(timezone.utc) - last_progress_reminder.sent_at).days
        return days_since_last >= config.reminder_frequency_days
    
    def _send_progress_reminders(self, config: TrainingConfiguration) -> int:
        """Envía recordatorios de progreso a usuarios activos"""
        # Find users with in-progress modules
        users_in_progress = self.db.query(User).join(
            TrainingProgress, User.id == TrainingProgress.user_id
        ).filter(
            TrainingProgress.status == ProgressStatus.IN_PROGRESS
        ).distinct().all()
        
        count = 0
        for user in users_in_progress:
            try:
                # Check if already sent recently
                last_reminder = self.db.query(TrainingReminderSent).filter(
                    TrainingReminderSent.user_id == user.id,
                    TrainingReminderSent.reminder_type == ReminderType.PROGRESS_UPDATE
                ).order_by(TrainingReminderSent.sent_at.desc()).first()
                
                if last_reminder:
                    days_since = (datetime.now(timezone.utc) - last_reminder.sent_at).days
                    if days_since < config.reminder_frequency_days:
                        continue
                
                self._send_progress_email(user)
                self._record_reminder_sent(user.id, ReminderType.PROGRESS_UPDATE)
                count += 1
            except Exception as e:
                logger.error(f"Error sending progress email to {user.email}: {e}")
        
        return count
    
    def _send_progress_email(self, user: User):
        """Envía email de actualización de progreso"""
        # Get user stats
        all_progress = self.db.query(TrainingProgress).filter(
            TrainingProgress.user_id == user.id
        ).all()
        
        total_modules = len(all_progress)
        completed_modules = sum(1 for p in all_progress if p.status == ProgressStatus.COMPLETED)
        in_progress_modules = sum(1 for p in all_progress if p.status == ProgressStatus.IN_PROGRESS)
        
        progress_percentage = (completed_modules / total_modules * 100) if total_modules > 0 else 0
        
        # Get pending obligatory modules
        pending_obligatory = self.db.query(TrainingModule).join(
            TrainingProgress, TrainingModule.id == TrainingProgress.module_id
        ).filter(
            TrainingProgress.user_id == user.id,
            TrainingModule.category == ModuleCategory.OBLIGATORY,
            TrainingProgress.status != ProgressStatus.COMPLETED
        ).all()
        
        pending_section = ""
        if pending_obligatory:
            pending_section = "<h3>⚠️ Módulos obligatorios pendientes:</h3><ul>"
            for module in pending_obligatory:
                pending_section += f"<li>{module.title}</li>"
            pending_section += "</ul>"
        
        template_data = EMAIL_TEMPLATES[ReminderType.PROGRESS_UPDATE]
        html_content = template_data['template'].format(
            user_name=user.full_name or user.username,
            progress_percentage=int(progress_percentage),
            completed_modules=completed_modules,
            total_modules=total_modules,
            in_progress_modules=in_progress_modules,
            pending_section=pending_section,
            dashboard_url=self.dashboard_url
        )
        
        self._send_email(
            to_email=user.email,
            subject=template_data['subject'],
            html_content=html_content
        )
    
    # ========================================================================
    # DEADLINE WARNINGS
    # ========================================================================
    
    def _send_deadline_warnings(self) -> int:
        """Envía advertencias de deadlines próximos (7 días antes)"""
        warning_date = datetime.now(timezone.utc) + timedelta(days=7)
        
        users_with_upcoming_deadlines = self.db.query(User).join(
            TrainingProgress, User.id == TrainingProgress.user_id
        ).filter(
            TrainingProgress.status != ProgressStatus.COMPLETED,
            TrainingProgress.deadline <= warning_date,
            TrainingProgress.deadline > datetime.now(timezone.utc)
        ).distinct().all()
        
        count = 0
        for user in users_with_upcoming_deadlines:
            try:
                # Check if already warned this week
                last_warning = self.db.query(TrainingReminderSent).filter(
                    TrainingReminderSent.user_id == user.id,
                    TrainingReminderSent.reminder_type == ReminderType.DEADLINE_WARNING,
                    TrainingReminderSent.sent_at >= datetime.now(timezone.utc) - timedelta(days=7)
                ).first()
                
                if last_warning:
                    continue
                
                self._send_deadline_warning_email(user)
                self._record_reminder_sent(user.id, ReminderType.DEADLINE_WARNING)
                count += 1
            except Exception as e:
                logger.error(f"Error sending deadline warning to {user.email}: {e}")
        
        return count
    
    def _send_deadline_warning_email(self, user: User):
        """Envía email de advertencia de deadline"""
        # Get modules with upcoming deadlines
        upcoming_deadline_progress = self.db.query(TrainingProgress).join(
            TrainingModule, TrainingProgress.module_id == TrainingModule.id
        ).filter(
            TrainingProgress.user_id == user.id,
            TrainingProgress.status != ProgressStatus.COMPLETED,
            TrainingProgress.deadline <= datetime.now(timezone.utc) + timedelta(days=7),
            TrainingProgress.deadline > datetime.now(timezone.utc)
        ).all()
        
        modules_html = ""
        for progress in upcoming_deadline_progress:
            module = progress.module
            days_left = (progress.deadline - datetime.now(timezone.utc)).days
            modules_html += f'''
            <div class="module">
                <strong>{module.title}</strong><br>
                <small>⏱️ {days_left} días restantes</small><br>
                <small>📅 Deadline: {progress.deadline.strftime('%Y-%m-%d')}</small>
            </div>
            '''
        
        template_data = EMAIL_TEMPLATES[ReminderType.DEADLINE_WARNING]
        html_content = template_data['template'].format(
            user_name=user.full_name or user.username,
            modules_with_deadlines=modules_html,
            dashboard_url=self.dashboard_url
        )
        
        self._send_email(
            to_email=user.email,
            subject=template_data['subject'],
            html_content=html_content
        )
    
    # ========================================================================
    # OVERDUE ALERTS
    # ========================================================================
    
    def _send_overdue_alerts(self) -> int:
        """Envía alertas de módulos vencidos"""
        users_with_overdue = self.db.query(User).join(
            TrainingProgress, User.id == TrainingProgress.user_id
        ).filter(
            TrainingProgress.status != ProgressStatus.COMPLETED,
            TrainingProgress.deadline < datetime.now(timezone.utc),
            TrainingProgress.is_overdue == True
        ).distinct().all()
        
        count = 0
        for user in users_with_overdue:
            try:
                # Check if already alerted this week
                last_alert = self.db.query(TrainingReminderSent).filter(
                    TrainingReminderSent.user_id == user.id,
                    TrainingReminderSent.reminder_type == ReminderType.OVERDUE,
                    TrainingReminderSent.sent_at >= datetime.now(timezone.utc) - timedelta(days=7)
                ).first()
                
                if last_alert:
                    continue
                
                self._send_overdue_alert_email(user)
                self._record_reminder_sent(user.id, ReminderType.OVERDUE)
                count += 1
            except Exception as e:
                logger.error(f"Error sending overdue alert to {user.email}: {e}")
        
        return count
    
    def _send_overdue_alert_email(self, user: User):
        """Envía email de alerta de vencimiento"""
        overdue_progress = self.db.query(TrainingProgress).join(
            TrainingModule, TrainingProgress.module_id == TrainingModule.id
        ).filter(
            TrainingProgress.user_id == user.id,
            TrainingProgress.status != ProgressStatus.COMPLETED,
            TrainingProgress.is_overdue == True
        ).all()
        
        modules_html = ""
        for progress in overdue_progress:
            module = progress.module
            days_overdue = (datetime.now(timezone.utc) - progress.deadline).days
            modules_html += f'''
            <div class="module">
                <strong>{module.title}</strong><br>
                <small>🚨 Vencido hace {days_overdue} días</small><br>
                <small>📅 Deadline era: {progress.deadline.strftime('%Y-%m-%d')}</small>
            </div>
            '''
        
        template_data = EMAIL_TEMPLATES[ReminderType.OVERDUE]
        html_content = template_data['template'].format(
            user_name=user.full_name or user.username,
            overdue_modules=modules_html,
            dashboard_url=self.dashboard_url
        )
        
        self._send_email(
            to_email=user.email,
            subject=template_data['subject'],
            html_content=html_content
        )
    
    # ========================================================================
    # EVENT-BASED NOTIFICATIONS
    # ========================================================================
    
    def send_completion_notification(self, user_id: uuid.UUID, module_id: uuid.UUID, score: float, points: int):
        """Envía notificación de completitud de módulo"""
        user = self.db.query(User).filter(User.id == user_id).first()
        module = self.db.query(TrainingModule).filter(TrainingModule.id == module_id).first()
        
        if not user or not module:
            return
        
        # Get next steps
        next_steps = ""
        incomplete_count = self.db.query(TrainingProgress).filter(
            TrainingProgress.user_id == user_id,
            TrainingProgress.status != ProgressStatus.COMPLETED
        ).count()
        
        if incomplete_count > 0:
            next_steps = f"<p>Tienes <strong>{incomplete_count} módulos pendientes</strong>. ¡Sigue así!</p>"
        else:
            next_steps = "<p>🎉 ¡Has completado toda tu capacitación! Revisa si has obtenido nuevas certificaciones.</p>"
        
        template_data = EMAIL_TEMPLATES[ReminderType.COMPLETION]
        html_content = template_data['template'].format(
            user_name=user.full_name or user.username,
            module_title=module.title,
            score=int(score),
            points=points,
            next_steps=next_steps,
            dashboard_url=self.dashboard_url
        )
        
        self._send_email(
            to_email=user.email,
            subject=template_data['subject'],
            html_content=html_content
        )
        
        self._record_reminder_sent(user_id, ReminderType.COMPLETION, module_id)
    
    def send_certification_notification(self, certification: TrainingCertification):
        """Envía notificación de nueva certificación"""
        user = self.db.query(User).filter(User.id == certification.user_id).first()
        if not user:
            return
        
        # Get modules that led to this certification
        # (This would depend on your certification logic)
        modules_html = "<ul><li>Módulos de capacitación obligatoria</li></ul>"
        
        template_data = EMAIL_TEMPLATES[ReminderType.CERTIFICATION]
        html_content = template_data['template'].format(
            user_name=user.full_name or user.username,
            certification_level=certification.level.value.upper(),
            certificate_number=certification.certificate_number,
            issue_date=certification.issued_at.strftime('%Y-%m-%d'),
            modules_completed=modules_html,
            dashboard_url=self.dashboard_url
        )
        
        self._send_email(
            to_email=user.email,
            subject=template_data['subject'],
            html_content=html_content
        )
        
        self._record_reminder_sent(certification.user_id, ReminderType.CERTIFICATION)
    
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    def _send_email(self, to_email: str, subject: str, html_content: str):
        """Envía un email usando SMTP"""
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = self.smtp_config['username']
        msg['To'] = to_email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        try:
            with smtplib.SMTP(self.smtp_config['host'], self.smtp_config['port']) as server:
                if self.smtp_config.get('use_tls'):
                    server.starttls()
                server.login(self.smtp_config['username'], self.smtp_config['password'])
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            raise
    
    def _record_reminder_sent(
        self, 
        user_id: uuid.UUID, 
        reminder_type: ReminderType,
        module_id: Optional[uuid.UUID] = None
    ):
        """Registra que se envió un recordatorio"""
        reminder_record = TrainingReminderSent(
            user_id=user_id,
            reminder_type=reminder_type,
            module_id=module_id
        )
        self.db.add(reminder_record)
        self.db.commit()

# ============================================================================
# CRON JOB SCHEDULER
# ============================================================================

def setup_reminder_cron_job():
    """
    Configura el cron job para ejecutar recordatorios
    
    Ejemplo de uso con APScheduler:
    
    from apscheduler.schedulers.background import BackgroundScheduler
    
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        func=lambda: TrainingReminderService(db).process_all_reminders(),
        trigger='cron',
        hour=9,  # 9 AM daily
        minute=0
    )
    scheduler.start()
    """
    pass
