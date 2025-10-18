"""
🚀 Spirit Tours Email Marketing Engine - Open Source
Sistema completo de email marketing similar a SendGrid/Mailchimp
Utiliza servidor SMTP propio para bajar costos

Características:
- Email masivo con rate limiting inteligente
- Templates con AI generativo
- Segmentación avanzada
- Analytics en tiempo real
- A/B Testing automático
- Automatizaciones y workflows
- Personalización dinámica
- Anti-spam compliance
"""

import asyncio
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import logging
import aiosmtplib
from jinja2 import Template, Environment, FileSystemLoader
import hashlib
import json
from pathlib import Path
import aioredis
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Float, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import pandas as pd
from bs4 import BeautifulSoup
import re

logger = logging.getLogger(__name__)

Base = declarative_base()

# ==================== MODELOS DE BASE DE DATOS ====================

class EmailCampaign(Base):
    """Modelo de campaña de email"""
    __tablename__ = 'email_campaigns'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    from_name = Column(String(255), nullable=False)
    from_email = Column(String(255), nullable=False)
    reply_to = Column(String(255))
    
    # Content
    html_content = Column(Text)
    text_content = Column(Text)
    template_id = Column(Integer)
    
    # Configuración
    segment_ids = Column(JSON)  # IDs de segmentos objetivo
    send_at = Column(DateTime)  # Envío programado
    timezone = Column(String(50), default='UTC')
    
    # A/B Testing
    ab_testing_enabled = Column(Boolean, default=False)
    ab_testing_config = Column(JSON)
    
    # Estado
    status = Column(String(50), default='draft')  # draft, scheduled, sending, sent, paused
    total_recipients = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    delivered_count = Column(Integer, default=0)
    opened_count = Column(Integer, default=0)
    clicked_count = Column(Integer, default=0)
    bounced_count = Column(Integer, default=0)
    unsubscribed_count = Column(Integer, default=0)
    
    # Métricas
    open_rate = Column(Float, default=0.0)
    click_rate = Column(Float, default=0.0)
    bounce_rate = Column(Float, default=0.0)
    unsubscribe_rate = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    sent_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # AI Features
    ai_optimized = Column(Boolean, default=False)
    ai_recommendations = Column(JSON)


class EmailTemplate(Base):
    """Modelo de template de email"""
    __tablename__ = 'email_templates'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))  # newsletter, promotion, transactional, etc.
    
    # Content
    html_content = Column(Text, nullable=False)
    text_content = Column(Text)
    thumbnail_url = Column(String(500))
    
    # Variables dinámicas disponibles
    variables = Column(JSON)  # {name, type, default_value, required}
    
    # AI Generated
    ai_generated = Column(Boolean, default=False)
    ai_prompt = Column(Text)
    
    # Estado
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=False)
    
    # Estadísticas
    usage_count = Column(Integer, default=0)
    avg_open_rate = Column(Float, default=0.0)
    avg_click_rate = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmailSegment(Base):
    """Modelo de segmento de audiencia"""
    __tablename__ = 'email_segments'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Reglas de segmentación
    rules = Column(JSON, nullable=False)
    # Ejemplo: {
    #   "conditions": [
    #     {"field": "total_spent", "operator": ">", "value": 1000},
    #     {"field": "last_purchase_date", "operator": ">", "value": "2024-01-01"},
    #     {"field": "tags", "operator": "contains", "value": "vip"}
    #   ],
    #   "logic": "AND"  # AND o OR
    # }
    
    # Cache de contactos
    contact_count = Column(Integer, default=0)
    last_calculated_at = Column(DateTime)
    
    # Estadísticas
    avg_open_rate = Column(Float, default=0.0)
    avg_click_rate = Column(Float, default=0.0)
    total_revenue = Column(Float, default=0.0)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmailContact(Base):
    """Modelo de contacto/suscriptor"""
    __tablename__ = 'email_contacts'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    
    # Información personal
    first_name = Column(String(100))
    last_name = Column(String(100))
    phone = Column(String(50))
    company = Column(String(255))
    
    # Ubicación
    country = Column(String(100))
    city = Column(String(100))
    timezone = Column(String(50))
    language = Column(String(10), default='en')
    
    # Estado
    status = Column(String(50), default='subscribed')  # subscribed, unsubscribed, bounced, complained
    email_verified = Column(Boolean, default=False)
    
    # Engagement
    tags = Column(JSON)  # Lista de tags
    custom_fields = Column(JSON)  # Campos personalizados
    
    # Métricas de engagement
    total_sent = Column(Integer, default=0)
    total_opened = Column(Integer, default=0)
    total_clicked = Column(Integer, default=0)
    last_opened_at = Column(DateTime)
    last_clicked_at = Column(DateTime)
    
    # Métricas de negocio
    total_purchases = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    last_purchase_date = Column(DateTime)
    avg_order_value = Column(Float, default=0.0)
    
    # Predicciones ML
    predicted_ltv = Column(Float, default=0.0)  # Lifetime Value
    churn_risk_score = Column(Float, default=0.0)  # 0-1
    engagement_score = Column(Float, default=0.0)  # 0-100
    
    # Timestamps
    subscribed_at = Column(DateTime, default=datetime.utcnow)
    unsubscribed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmailEvent(Base):
    """Modelo de evento de email (opens, clicks, bounces, etc)"""
    __tablename__ = 'email_events'
    
    id = Column(Integer, primary_key=True)
    campaign_id = Column(Integer, nullable=False, index=True)
    contact_id = Column(Integer, nullable=False, index=True)
    
    # Tipo de evento
    event_type = Column(String(50), nullable=False)  # sent, delivered, opened, clicked, bounced, complained, unsubscribed
    
    # Detalles del evento
    event_data = Column(JSON)  # URL clicked, bounce reason, etc.
    
    # Tracking
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    device_type = Column(String(50))  # desktop, mobile, tablet
    os = Column(String(100))
    browser = Column(String(100))
    
    # Ubicación (de IP)
    country = Column(String(100))
    city = Column(String(100))
    
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


class EmailAutomation(Base):
    """Modelo de automatización de email"""
    __tablename__ = 'email_automations'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Trigger
    trigger_type = Column(String(100), nullable=False)
    # Tipos: welcome, abandoned_cart, post_purchase, birthday, 
    #        re_engagement, milestone, custom_event
    trigger_config = Column(JSON)
    
    # Workflow steps
    workflow_steps = Column(JSON, nullable=False)
    # Ejemplo: [
    #   {
    #     "step": 1,
    #     "action": "send_email",
    #     "template_id": 123,
    #     "delay_minutes": 0
    #   },
    #   {
    #     "step": 2,
    #     "action": "wait",
    #     "delay_minutes": 1440  # 24 horas
    #   },
    #   {
    #     "step": 3,
    #     "action": "conditional",
    #     "condition": "not_opened",
    #     "true_branch": [...],
    #     "false_branch": [...]
    #   }
    # ]
    
    # Estado
    is_active = Column(Boolean, default=True)
    
    # Estadísticas
    total_triggered = Column(Integer, default=0)
    total_completed = Column(Integer, default=0)
    avg_conversion_rate = Column(Float, default=0.0)
    total_revenue = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ==================== EMAIL ENGINE ====================

@dataclass
class SMTPConfig:
    """Configuración de servidor SMTP"""
    host: str
    port: int = 587
    username: str = ""
    password: str = ""
    use_tls: bool = True
    use_ssl: bool = False
    timeout: int = 30
    max_connections: int = 10
    rate_limit: int = 100  # Emails por minuto
    
    # Anti-spam configuration
    dkim_private_key: Optional[str] = None
    dkim_selector: str = "default"
    dkim_domain: str = ""
    
    # Bounce handling
    bounce_email: Optional[str] = None


@dataclass
class EmailMessage:
    """Mensaje de email individual"""
    to_email: str
    to_name: Optional[str] = None
    subject: str = ""
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    from_email: str = ""
    from_name: str = ""
    reply_to: Optional[str] = None
    
    # Headers personalizados
    headers: Dict[str, str] = field(default_factory=dict)
    
    # Personalización
    merge_vars: Dict[str, Any] = field(default_factory=dict)
    
    # Tracking
    track_opens: bool = True
    track_clicks: bool = True
    
    # Attachments
    attachments: List[Dict[str, Any]] = field(default_factory=list)
    
    # IDs para tracking
    campaign_id: Optional[int] = None
    contact_id: Optional[int] = None
    message_id: Optional[str] = None


class EmailMarketingEngine:
    """
    Motor principal de email marketing
    """
    
    def __init__(
        self,
        smtp_config: SMTPConfig,
        database_url: str,
        redis_url: str = "redis://localhost:6379"
    ):
        self.smtp_config = smtp_config
        self.database_url = database_url
        self.redis_url = redis_url
        
        # Database
        self.engine = create_engine(database_url)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        
        # Redis para queue y cache
        self.redis = None
        
        # Template engine
        self.jinja_env = Environment(
            loader=FileSystemLoader('backend/email_marketing/templates'),
            autoescape=True
        )
        
        # Rate limiting
        self.send_queue = asyncio.Queue()
        self.rate_limiter_task = None
        
        logger.info("Email Marketing Engine initialized")
    
    async def initialize(self):
        """Inicializar conexiones asíncronas"""
        self.redis = await aioredis.create_redis_pool(self.redis_url)
        
        # Iniciar rate limiter
        self.rate_limiter_task = asyncio.create_task(self._rate_limiter())
        
        logger.info("Email Marketing Engine async components initialized")
    
    async def close(self):
        """Cerrar conexiones"""
        if self.rate_limiter_task:
            self.rate_limiter_task.cancel()
        
        if self.redis:
            self.redis.close()
            await self.redis.wait_closed()
    
    # ==================== ENVÍO DE EMAILS ====================
    
    async def send_email(self, message: EmailMessage) -> Dict[str, Any]:
        """
        Enviar un email individual
        
        Returns:
            Dict con status y detalles del envío
        """
        try:
            # Generar message ID único
            if not message.message_id:
                message.message_id = self._generate_message_id(message)
            
            # Aplicar merge variables al contenido
            if message.merge_vars:
                message = self._apply_merge_vars(message)
            
            # Agregar tracking pixels
            if message.track_opens:
                message.html_content = self._add_open_tracking(
                    message.html_content,
                    message.message_id
                )
            
            if message.track_clicks:
                message.html_content = self._add_click_tracking(
                    message.html_content,
                    message.message_id
                )
            
            # Construir mensaje MIME
            mime_message = self._build_mime_message(message)
            
            # Agregar a la cola de envío
            await self.send_queue.put({
                'message': mime_message,
                'to_email': message.to_email,
                'metadata': {
                    'message_id': message.message_id,
                    'campaign_id': message.campaign_id,
                    'contact_id': message.contact_id
                }
            })
            
            # Registrar evento 'sent'
            await self._log_event(
                campaign_id=message.campaign_id,
                contact_id=message.contact_id,
                event_type='sent',
                event_data={'message_id': message.message_id}
            )
            
            return {
                'success': True,
                'message_id': message.message_id,
                'to_email': message.to_email
            }
            
        except Exception as e:
            logger.error(f"Error sending email to {message.to_email}: {e}")
            return {
                'success': False,
                'error': str(e),
                'to_email': message.to_email
            }
    
    async def send_bulk_email(
        self,
        messages: List[EmailMessage],
        batch_size: int = 100
    ) -> Dict[str, Any]:
        """
        Enviar emails en masa con batching
        
        Args:
            messages: Lista de mensajes a enviar
            batch_size: Tamaño del batch para procesamiento
        
        Returns:
            Dict con estadísticas del envío
        """
        results = {
            'total': len(messages),
            'sent': 0,
            'failed': 0,
            'errors': []
        }
        
        # Procesar en batches
        for i in range(0, len(messages), batch_size):
            batch = messages[i:i + batch_size]
            
            # Enviar batch concurrentemente
            tasks = [self.send_email(msg) for msg in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Procesar resultados
            for result in batch_results:
                if isinstance(result, Exception):
                    results['failed'] += 1
                    results['errors'].append(str(result))
                elif result.get('success'):
                    results['sent'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append(result.get('error', 'Unknown error'))
            
            logger.info(f"Processed batch {i//batch_size + 1}, sent: {results['sent']}, failed: {results['failed']}")
        
        return results
    
    async def _rate_limiter(self):
        """
        Rate limiter para controlar envío de emails
        Respeta el rate limit configurado en SMTP
        """
        emails_per_minute = self.smtp_config.rate_limit
        delay_between_emails = 60.0 / emails_per_minute
        
        logger.info(f"Rate limiter started: {emails_per_minute} emails/minute")
        
        while True:
            try:
                # Obtener email de la cola
                email_data = await self.send_queue.get()
                
                # Enviar el email
                await self._send_via_smtp(
                    email_data['message'],
                    email_data['to_email']
                )
                
                # Actualizar métricas
                await self._update_send_metrics(email_data['metadata'])
                
                # Esperar según rate limit
                await asyncio.sleep(delay_between_emails)
                
            except asyncio.CancelledError:
                logger.info("Rate limiter stopped")
                break
            except Exception as e:
                logger.error(f"Error in rate limiter: {e}")
                await asyncio.sleep(1)  # Pequeña pausa en caso de error
    
    async def _send_via_smtp(self, message: MIMEMultipart, to_email: str):
        """Enviar email vía SMTP"""
        try:
            # Usar aiosmtplib para envío asíncrono
            if self.smtp_config.use_ssl:
                await aiosmtplib.send(
                    message,
                    hostname=self.smtp_config.host,
                    port=self.smtp_config.port,
                    username=self.smtp_config.username,
                    password=self.smtp_config.password,
                    use_tls=False,
                    start_tls=False,
                    timeout=self.smtp_config.timeout
                )
            else:
                await aiosmtplib.send(
                    message,
                    hostname=self.smtp_config.host,
                    port=self.smtp_config.port,
                    username=self.smtp_config.username,
                    password=self.smtp_config.password,
                    use_tls=self.smtp_config.use_tls,
                    start_tls=self.smtp_config.use_tls,
                    timeout=self.smtp_config.timeout
                )
            
            logger.debug(f"Email sent successfully to {to_email}")
            
        except Exception as e:
            logger.error(f"SMTP error sending to {to_email}: {e}")
            raise
    
    def _build_mime_message(self, message: EmailMessage) -> MIMEMultipart:
        """Construir mensaje MIME completo"""
        mime_msg = MIMEMultipart('alternative')
        
        # Headers básicos
        mime_msg['Subject'] = message.subject
        mime_msg['From'] = f"{message.from_name} <{message.from_email}>"
        mime_msg['To'] = f"{message.to_name} <{message.to_email}>" if message.to_name else message.to_email
        
        if message.reply_to:
            mime_msg['Reply-To'] = message.reply_to
        
        # Message ID personalizado
        mime_msg['Message-ID'] = f"<{message.message_id}@{self.smtp_config.dkim_domain}>"
        
        # Headers personalizados
        for key, value in message.headers.items():
            mime_msg[key] = value
        
        # Contenido de texto plano
        if message.text_content:
            part_text = MIMEText(message.text_content, 'plain', 'utf-8')
            mime_msg.attach(part_text)
        
        # Contenido HTML
        if message.html_content:
            part_html = MIMEText(message.html_content, 'html', 'utf-8')
            mime_msg.attach(part_html)
        
        # Attachments
        for attachment in message.attachments:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(attachment['content'])
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f"attachment; filename= {attachment['filename']}"
            )
            mime_msg.attach(part)
        
        return mime_msg
    
    # ==================== MERGE VARIABLES ====================
    
    def _apply_merge_vars(self, message: EmailMessage) -> EmailMessage:
        """Aplicar variables de personalización al contenido"""
        if not message.merge_vars:
            return message
        
        # Aplicar a subject
        if message.subject:
            template = Template(message.subject)
            message.subject = template.render(**message.merge_vars)
        
        # Aplicar a HTML content
        if message.html_content:
            template = Template(message.html_content)
            message.html_content = template.render(**message.merge_vars)
        
        # Aplicar a text content
        if message.text_content:
            template = Template(message.text_content)
            message.text_content = template.render(**message.merge_vars)
        
        return message
    
    # ==================== TRACKING ====================
    
    def _generate_message_id(self, message: EmailMessage) -> str:
        """Generar ID único para mensaje"""
        data = f"{message.to_email}{message.campaign_id}{datetime.utcnow().isoformat()}"
        return hashlib.sha256(data.encode()).hexdigest()[:32]
    
    def _add_open_tracking(self, html_content: str, message_id: str) -> str:
        """Agregar pixel de tracking para opens"""
        tracking_pixel = f'<img src="https://yourdomain.com/track/open/{message_id}" width="1" height="1" alt="" />'
        
        # Insertar antes del cierre de body
        if '</body>' in html_content:
            html_content = html_content.replace('</body>', f'{tracking_pixel}</body>')
        else:
            html_content += tracking_pixel
        
        return html_content
    
    def _add_click_tracking(self, html_content: str, message_id: str) -> str:
        """Reemplazar todos los links con tracking URLs"""
        soup = BeautifulSoup(html_content, 'html.parser')
        
        for link in soup.find_all('a', href=True):
            original_url = link['href']
            
            # No trackear ciertos links
            if original_url.startswith(('mailto:', 'tel:', '#')):
                continue
            
            # Crear tracking URL
            tracking_url = f"https://yourdomain.com/track/click/{message_id}?url={original_url}"
            link['href'] = tracking_url
        
        return str(soup)
    
    async def _log_event(
        self,
        campaign_id: Optional[int],
        contact_id: Optional[int],
        event_type: str,
        event_data: Dict[str, Any] = None
    ):
        """Registrar evento de email en la base de datos"""
        if not campaign_id or not contact_id:
            return
        
        session = self.Session()
        try:
            event = EmailEvent(
                campaign_id=campaign_id,
                contact_id=contact_id,
                event_type=event_type,
                event_data=event_data or {}
            )
            session.add(event)
            session.commit()
            
            # Actualizar contadores en cache (Redis)
            await self._update_campaign_counters(campaign_id, event_type)
            
        except Exception as e:
            logger.error(f"Error logging event: {e}")
            session.rollback()
        finally:
            session.close()
    
    async def _update_campaign_counters(self, campaign_id: int, event_type: str):
        """Actualizar contadores de campaña en Redis"""
        if not self.redis:
            return
        
        counter_key = f"campaign:{campaign_id}:{event_type}"
        await self.redis.incr(counter_key)
    
    async def _update_send_metrics(self, metadata: Dict[str, Any]):
        """Actualizar métricas después de envío"""
        if not metadata.get('campaign_id'):
            return
        
        campaign_id = metadata['campaign_id']
        
        # Actualizar contador en base de datos
        session = self.Session()
        try:
            campaign = session.query(EmailCampaign).filter_by(id=campaign_id).first()
            if campaign:
                campaign.sent_count += 1
                session.commit()
        except Exception as e:
            logger.error(f"Error updating metrics: {e}")
            session.rollback()
        finally:
            session.close()


# ==================== HELPER FUNCTIONS ====================

def create_email_message(
    to_email: str,
    subject: str,
    html_content: str,
    from_email: str = "noreply@spirittours.com",
    from_name: str = "Spirit Tours",
    **kwargs
) -> EmailMessage:
    """Helper para crear mensaje de email"""
    return EmailMessage(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        from_email=from_email,
        from_name=from_name,
        **kwargs
    )


if __name__ == "__main__":
    # Ejemplo de uso
    async def main():
        # Configuración SMTP
        smtp_config = SMTPConfig(
            host="smtp.yourserver.com",
            port=587,
            username="your_username",
            password="your_password",
            rate_limit=100  # 100 emails por minuto
        )
        
        # Inicializar engine
        engine = EmailMarketingEngine(
            smtp_config=smtp_config,
            database_url="postgresql://user:pass@localhost/email_marketing"
        )
        
        await engine.initialize()
        
        # Enviar email de prueba
        message = create_email_message(
            to_email="customer@example.com",
            subject="Welcome to Spirit Tours!",
            html_content="<h1>Hello {{first_name}}!</h1><p>Welcome aboard.</p>",
            merge_vars={"first_name": "John"}
        )
        
        result = await engine.send_email(message)
        print(f"Email sent: {result}")
        
        await engine.close()
    
    asyncio.run(main())
