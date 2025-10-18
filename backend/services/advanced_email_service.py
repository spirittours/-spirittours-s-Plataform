"""
Sistema Avanzado de Email Marketing y Newsletter
Incluye validación anti-spam, templates profesionales, y gestión de listas
"""

import re
import dns.resolver
import smtplib
import logging
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from email.utils import formataddr
from dataclasses import dataclass, field
from enum import Enum
import hashlib
import asyncio
from jinja2 import Environment, FileSystemLoader, Template
import aiosmtplib

logger = logging.getLogger(__name__)


class EmailStatus(Enum):
    """Estados de email"""
    PENDING = "pending"
    VALIDATING = "validating"
    VALID = "valid"
    INVALID = "invalid"
    SENT = "sent"
    FAILED = "failed"
    BOUNCED = "bounced"
    SPAM_COMPLAINT = "spam_complaint"


class EmailPriority(Enum):
    """Prioridad de envío"""
    HIGH = 1
    NORMAL = 2
    LOW = 3


class TemplateCategory(Enum):
    """Categorías de templates"""
    PROMOTIONAL = "promotional"
    NEWSLETTER = "newsletter"
    DESTINATION_HIGHLIGHT = "destination_highlight"
    SPECIAL_OFFER = "special_offer"
    LAST_MINUTE = "last_minute"
    SEASONAL = "seasonal"
    LUXURY = "luxury"
    ADVENTURE = "adventure"
    CULTURAL = "cultural"
    BEACH = "beach"
    CITY_BREAK = "city_break"
    CRUISE = "cruise"
    GROUP_TRAVEL = "group_travel"
    CORPORATE = "corporate"
    CONFIRMATION = "confirmation"


@dataclass
class EmailAddress:
    """Dirección de email con validación"""
    email: str
    name: Optional[str] = None
    valid: bool = False
    validation_score: float = 0.0
    validation_errors: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EmailCampaign:
    """Campaña de email"""
    campaign_id: str
    name: str
    subject: str
    template_id: str
    recipients: List[EmailAddress]
    sender_name: str
    sender_email: str
    reply_to: Optional[str] = None
    
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    
    status: EmailStatus = EmailStatus.PENDING
    priority: EmailPriority = EmailPriority.NORMAL
    
    # Tracking
    total_sent: int = 0
    total_delivered: int = 0
    total_opened: int = 0
    total_clicked: int = 0
    total_bounced: int = 0
    total_spam: int = 0
    
    # Content
    template_data: Dict[str, Any] = field(default_factory=dict)
    attachments: List[Dict[str, Any]] = field(default_factory=list)
    
    # Anti-spam settings
    test_mode: bool = True
    spam_score_threshold: float = 5.0
    
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


class EmailValidator:
    """
    Validador avanzado de emails
    Verifica sintaxis, dominio, MX records, y riesgos de spam
    """
    
    # Dominios temporales/desechables conocidos
    DISPOSABLE_DOMAINS = {
        'tempmail.com', 'guerrillamail.com', 'mailinator.com',
        '10minutemail.com', 'throwaway.email', 'temp-mail.org'
    }
    
    # Proveedores conocidos y confiables
    TRUSTED_PROVIDERS = {
        'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
        'icloud.com', 'aol.com', 'protonmail.com'
    }
    
    @staticmethod
    def validate_syntax(email: str) -> Tuple[bool, List[str]]:
        """Valida la sintaxis del email"""
        errors = []
        
        # Regex RFC 5322 simplificado
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if not re.match(pattern, email):
            errors.append("Invalid email syntax")
            return False, errors
        
        # Validaciones adicionales
        local, domain = email.rsplit('@', 1)
        
        if len(local) > 64:
            errors.append("Local part too long (max 64 characters)")
        
        if len(domain) > 255:
            errors.append("Domain too long (max 255 characters)")
        
        if '..' in email:
            errors.append("Consecutive dots not allowed")
        
        if email.startswith('.') or email.endswith('.'):
            errors.append("Cannot start or end with dot")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def check_disposable(email: str) -> bool:
        """Verifica si es un email temporal/desechable"""
        domain = email.split('@')[1].lower()
        return domain in EmailValidator.DISPOSABLE_DOMAINS
    
    @staticmethod
    def check_mx_records(domain: str) -> Tuple[bool, List[str]]:
        """Verifica registros MX del dominio"""
        try:
            mx_records = dns.resolver.resolve(domain, 'MX')
            if mx_records:
                return True, [str(r.exchange) for r in mx_records]
            return False, []
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.Timeout):
            return False, []
        except Exception as e:
            logger.error(f"Error checking MX records for {domain}: {e}")
            return False, []
    
    @staticmethod
    def calculate_score(email: str) -> float:
        """
        Calcula un score de validez (0-100)
        100 = perfecto, 0 = inválido
        """
        score = 100.0
        domain = email.split('@')[1].lower()
        
        # Sintaxis inválida: -100
        valid_syntax, errors = EmailValidator.validate_syntax(email)
        if not valid_syntax:
            return 0.0
        
        # Email desechable: -50
        if EmailValidator.check_disposable(email):
            score -= 50
        
        # Sin registros MX: -40
        has_mx, mx_records = EmailValidator.check_mx_records(domain)
        if not has_mx:
            score -= 40
        
        # Proveedor confiable: +10
        if domain in EmailValidator.TRUSTED_PROVIDERS:
            score += 10
        
        # Email muy corto: -10
        if len(email.split('@')[0]) < 3:
            score -= 10
        
        # Números excesivos en local part: -5
        local = email.split('@')[0]
        if sum(c.isdigit() for c in local) / len(local) > 0.5:
            score -= 5
        
        return max(0, min(100, score))
    
    @classmethod
    def validate_email(cls, email: str) -> EmailAddress:
        """Validación completa de un email"""
        email = email.strip().lower()
        
        email_obj = EmailAddress(email=email)
        
        # Sintaxis
        valid_syntax, errors = cls.validate_syntax(email)
        if not valid_syntax:
            email_obj.validation_errors.extend(errors)
            email_obj.validation_score = 0
            return email_obj
        
        # Score
        score = cls.calculate_score(email)
        email_obj.validation_score = score
        
        # Email desechable
        if cls.check_disposable(email):
            email_obj.validation_errors.append("Disposable email address")
        
        # MX records
        domain = email.split('@')[1]
        has_mx, mx_records = cls.check_mx_records(domain)
        if not has_mx:
            email_obj.validation_errors.append("No MX records found")
        else:
            email_obj.metadata['mx_records'] = mx_records
        
        # Proveedor confiable
        if domain in cls.TRUSTED_PROVIDERS:
            email_obj.metadata['trusted_provider'] = True
        
        # Consideramos válido si score >= 70
        email_obj.valid = score >= 70 and len(email_obj.validation_errors) == 0
        
        return email_obj


class SpamChecker:
    """
    Verificador de contenido anti-spam
    Analiza el contenido del email para evitar filtros de spam
    """
    
    # Palabras y frases que disparan filtros de spam
    SPAM_TRIGGER_WORDS = {
        'free', 'winner', 'cash', 'prize', 'guarantee', 'no obligation',
        'risk free', 'act now', 'limited time', 'order now', 'click here',
        'buy now', 'subscribe', 'discount', '100%', '$$$', 'earn money',
        'make money fast', 'nigerian', 'viagra', 'casino', 'lottery'
    }
    
    # Palabras sospechosas pero menos severas
    SUSPICIOUS_WORDS = {
        'amazing', 'incredible', 'revolutionary', 'breakthrough',
        'secret', 'hidden', 'exclusive', 'special offer', 'limited'
    }
    
    @staticmethod
    def check_subject(subject: str) -> Tuple[float, List[str]]:
        """
        Analiza el subject line
        Retorna: (spam_score, warnings)
        """
        score = 0.0
        warnings = []
        subject_lower = subject.lower()
        
        # CAPS excesivo
        if subject.isupper() and len(subject) > 10:
            score += 2.0
            warnings.append("Excessive capitalization in subject")
        
        # Múltiples signos de exclamación
        exclamation_count = subject.count('!')
        if exclamation_count > 1:
            score += exclamation_count * 0.5
            warnings.append(f"Too many exclamation marks ({exclamation_count})")
        
        # Palabras spam
        for word in SpamChecker.SPAM_TRIGGER_WORDS:
            if word in subject_lower:
                score += 1.5
                warnings.append(f"Spam trigger word detected: '{word}'")
        
        # Palabras sospechosas
        for word in SpamChecker.SUSPICIOUS_WORDS:
            if word in subject_lower:
                score += 0.5
                warnings.append(f"Suspicious word: '{word}'")
        
        # Subject muy corto
        if len(subject) < 10:
            score += 0.5
            warnings.append("Subject too short")
        
        # Subject muy largo
        if len(subject) > 100:
            score += 1.0
            warnings.append("Subject too long")
        
        return score, warnings
    
    @staticmethod
    def check_content(html: str, text: str) -> Tuple[float, List[str]]:
        """
        Analiza el contenido del email
        Retorna: (spam_score, warnings)
        """
        score = 0.0
        warnings = []
        
        # Ratio HTML/texto
        if html and text:
            html_len = len(html)
            text_len = len(text)
            if text_len < html_len * 0.1:
                score += 1.0
                warnings.append("Text content too small compared to HTML")
        
        # Solo HTML sin texto plano
        if html and not text:
            score += 0.5
            warnings.append("No plain text version provided")
        
        # Exceso de links
        if html:
            link_count = html.lower().count('<a ')
            if link_count > 20:
                score += 1.0
                warnings.append(f"Too many links ({link_count})")
        
        # Palabras spam en contenido
        content_lower = (text or html).lower()
        spam_word_count = sum(1 for word in SpamChecker.SPAM_TRIGGER_WORDS 
                              if word in content_lower)
        if spam_word_count > 3:
            score += spam_word_count * 0.3
            warnings.append(f"Multiple spam words detected ({spam_word_count})")
        
        # Exceso de imágenes
        if html:
            img_count = html.lower().count('<img ')
            if img_count > 15:
                score += 0.5
                warnings.append(f"Too many images ({img_count})")
        
        # Faltan unsubscribe links
        if html and 'unsubscribe' not in html.lower():
            score += 2.0
            warnings.append("Missing unsubscribe link (required by law)")
        
        return score, warnings
    
    @staticmethod
    def check_headers(sender_email: str, sender_name: str, reply_to: Optional[str]) -> Tuple[float, List[str]]:
        """Analiza los headers del email"""
        score = 0.0
        warnings = []
        
        # Reply-to diferente de sender
        if reply_to and reply_to != sender_email:
            score += 0.5
            warnings.append("Reply-to differs from sender (can be suspicious)")
        
        # Nombre del sender sospechoso
        if sender_name:
            if any(word in sender_name.lower() for word in ['free', 'winner', 'prize']):
                score += 1.0
                warnings.append("Suspicious sender name")
        
        return score, warnings
    
    @classmethod
    def analyze_email(
        cls,
        subject: str,
        html_content: str,
        text_content: str,
        sender_email: str,
        sender_name: str,
        reply_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Análisis completo anti-spam
        Retorna reporte detallado
        """
        total_score = 0.0
        all_warnings = []
        
        # Analizar subject
        subject_score, subject_warnings = cls.check_subject(subject)
        total_score += subject_score
        all_warnings.extend([f"[Subject] {w}" for w in subject_warnings])
        
        # Analizar contenido
        content_score, content_warnings = cls.check_content(html_content, text_content)
        total_score += content_score
        all_warnings.extend([f"[Content] {w}" for w in content_warnings])
        
        # Analizar headers
        header_score, header_warnings = cls.check_headers(sender_email, sender_name, reply_to)
        total_score += header_score
        all_warnings.extend([f"[Headers] {w}" for w in header_warnings])
        
        # Clasificar riesgo
        if total_score < 3:
            risk_level = "LOW"
            recommendation = "Safe to send"
        elif total_score < 7:
            risk_level = "MEDIUM"
            recommendation = "Review warnings and optimize"
        else:
            risk_level = "HIGH"
            recommendation = "High risk of spam filters - revise content"
        
        return {
            'total_spam_score': round(total_score, 2),
            'risk_level': risk_level,
            'recommendation': recommendation,
            'warnings': all_warnings,
            'subject_score': round(subject_score, 2),
            'content_score': round(content_score, 2),
            'header_score': round(header_score, 2),
            'safe_to_send': total_score < 5.0
        }


class AdvancedEmailService:
    """
    Servicio avanzado de Email Marketing
    """
    
    def __init__(
        self,
        smtp_host: str = "smtp.gmail.com",
        smtp_port: int = 587,
        smtp_user: Optional[str] = None,
        smtp_password: Optional[str] = None
    ):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        
        self.campaigns: Dict[str, EmailCampaign] = {}
        self.email_validator = EmailValidator()
        self.spam_checker = SpamChecker()
        
        # Configurar Jinja2 para templates
        self.template_env = Environment(
            loader=FileSystemLoader('templates/email'),
            autoescape=True
        )
        
        logger.info("Advanced Email Service initialized")
    
    def validate_email_list(
        self,
        emails: List[str],
        min_score: float = 70.0
    ) -> Dict[str, Any]:
        """
        Valida una lista de emails
        Retorna emails válidos, inválidos, y estadísticas
        """
        valid_emails = []
        invalid_emails = []
        warnings = []
        
        for email in emails:
            email_obj = self.email_validator.validate_email(email)
            
            if email_obj.valid and email_obj.validation_score >= min_score:
                valid_emails.append(email_obj)
            else:
                invalid_emails.append(email_obj)
                if email_obj.validation_errors:
                    warnings.append(f"{email}: {', '.join(email_obj.validation_errors)}")
        
        return {
            'total': len(emails),
            'valid': len(valid_emails),
            'invalid': len(invalid_emails),
            'valid_percentage': (len(valid_emails) / len(emails) * 100) if emails else 0,
            'valid_emails': valid_emails,
            'invalid_emails': invalid_emails,
            'warnings': warnings
        }
    
    def analyze_campaign_content(
        self,
        subject: str,
        html_content: str,
        text_content: str,
        sender_email: str,
        sender_name: str,
        reply_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analiza el contenido de una campaña antes de enviar"""
        return self.spam_checker.analyze_email(
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            sender_email=sender_email,
            sender_name=sender_name,
            reply_to=reply_to
        )
    
    def create_campaign(
        self,
        name: str,
        subject: str,
        template_id: str,
        recipients: List[str],
        sender_name: str,
        sender_email: str,
        template_data: Dict[str, Any],
        reply_to: Optional[str] = None,
        scheduled_at: Optional[datetime] = None,
        test_mode: bool = True
    ) -> EmailCampaign:
        """Crea una nueva campaña de email"""
        
        # Generar ID único
        campaign_id = hashlib.md5(
            f"{name}{datetime.utcnow().isoformat()}".encode()
        ).hexdigest()[:12]
        
        # Validar lista de recipients
        validation_result = self.validate_email_list(recipients)
        
        if validation_result['valid'] == 0:
            raise ValueError("No valid email addresses in recipient list")
        
        # Crear campaña
        campaign = EmailCampaign(
            campaign_id=campaign_id,
            name=name,
            subject=subject,
            template_id=template_id,
            recipients=validation_result['valid_emails'],
            sender_name=sender_name,
            sender_email=sender_email,
            reply_to=reply_to or sender_email,
            scheduled_at=scheduled_at,
            template_data=template_data,
            test_mode=test_mode
        )
        
        self.campaigns[campaign_id] = campaign
        
        logger.info(f"Campaign created: {campaign_id} with {len(campaign.recipients)} valid recipients")
        
        return campaign
    
    async def send_campaign(
        self,
        campaign_id: str,
        max_per_hour: int = 100,
        delay_between_sends: float = 1.0
    ) -> Dict[str, Any]:
        """
        Envía una campaña con rate limiting
        """
        campaign = self.campaigns.get(campaign_id)
        if not campaign:
            raise ValueError(f"Campaign {campaign_id} not found")
        
        # Renderizar template
        try:
            template = self.template_env.get_template(f"{campaign.template_id}.html")
            html_content = template.render(**campaign.template_data)
            text_content = self._html_to_text(html_content)
        except Exception as e:
            logger.error(f"Error rendering template: {e}")
            raise
        
        # Analizar contenido antes de enviar
        spam_analysis = self.analyze_campaign_content(
            subject=campaign.subject,
            html_content=html_content,
            text_content=text_content,
            sender_email=campaign.sender_email,
            sender_name=campaign.sender_name,
            reply_to=campaign.reply_to
        )
        
        if not spam_analysis['safe_to_send'] and not campaign.test_mode:
            logger.warning(f"Campaign {campaign_id} has high spam score: {spam_analysis}")
            return {
                'status': 'aborted',
                'reason': 'High spam score',
                'spam_analysis': spam_analysis
            }
        
        # Enviar emails
        campaign.status = EmailStatus.VALIDATING
        sent_count = 0
        failed_count = 0
        
        for i, recipient in enumerate(campaign.recipients):
            try:
                # Rate limiting
                if i > 0 and i % max_per_hour == 0:
                    logger.info(f"Rate limit reached, sleeping for 1 hour...")
                    await asyncio.sleep(3600)
                
                # Enviar email
                if campaign.test_mode:
                    logger.info(f"[TEST MODE] Would send to {recipient.email}")
                    sent_count += 1
                else:
                    await self._send_email(
                        to_email=recipient.email,
                        to_name=recipient.name,
                        subject=campaign.subject,
                        html_content=html_content,
                        text_content=text_content,
                        from_email=campaign.sender_email,
                        from_name=campaign.sender_name,
                        reply_to=campaign.reply_to
                    )
                    sent_count += 1
                
                # Delay entre envíos
                await asyncio.sleep(delay_between_sends)
                
            except Exception as e:
                logger.error(f"Failed to send to {recipient.email}: {e}")
                failed_count += 1
        
        # Actualizar campaña
        campaign.total_sent = sent_count
        campaign.status = EmailStatus.SENT
        campaign.sent_at = datetime.utcnow()
        campaign.updated_at = datetime.utcnow()
        
        return {
            'status': 'completed',
            'campaign_id': campaign_id,
            'total_sent': sent_count,
            'total_failed': failed_count,
            'spam_analysis': spam_analysis,
            'test_mode': campaign.test_mode
        }
    
    async def _send_email(
        self,
        to_email: str,
        to_name: Optional[str],
        subject: str,
        html_content: str,
        text_content: str,
        from_email: str,
        from_name: str,
        reply_to: str
    ):
        """Envía un email individual"""
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = formataddr((from_name, from_email))
        msg['To'] = formataddr((to_name or to_email, to_email))
        msg['Reply-To'] = reply_to
        
        # Agregar versión texto plano
        part1 = MIMEText(text_content, 'plain')
        msg.attach(part1)
        
        # Agregar versión HTML
        part2 = MIMEText(html_content, 'html')
        msg.attach(part2)
        
        # Enviar usando aiosmtplib para async
        await aiosmtplib.send(
            msg,
            hostname=self.smtp_host,
            port=self.smtp_port,
            username=self.smtp_user,
            password=self.smtp_password,
            start_tls=True
        )
    
    def _html_to_text(self, html: str) -> str:
        """Convierte HTML a texto plano simple"""
        import html as html_lib
        
        # Remover tags HTML
        text = re.sub('<[^<]+?>', '', html)
        # Decodificar entidades HTML
        text = html_lib.unescape(text)
        # Limpiar whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def get_campaign_stats(self, campaign_id: str) -> Dict[str, Any]:
        """Obtiene estadísticas de una campaña"""
        campaign = self.campaigns.get(campaign_id)
        if not campaign:
            return {}
        
        open_rate = (campaign.total_opened / campaign.total_sent * 100) if campaign.total_sent > 0 else 0
        click_rate = (campaign.total_clicked / campaign.total_sent * 100) if campaign.total_sent > 0 else 0
        bounce_rate = (campaign.total_bounced / campaign.total_sent * 100) if campaign.total_sent > 0 else 0
        
        return {
            'campaign_id': campaign.campaign_id,
            'name': campaign.name,
            'status': campaign.status.value,
            'total_recipients': len(campaign.recipients),
            'total_sent': campaign.total_sent,
            'total_delivered': campaign.total_delivered,
            'total_opened': campaign.total_opened,
            'total_clicked': campaign.total_clicked,
            'total_bounced': campaign.total_bounced,
            'open_rate': round(open_rate, 2),
            'click_rate': round(click_rate, 2),
            'bounce_rate': round(bounce_rate, 2),
            'sent_at': campaign.sent_at.isoformat() if campaign.sent_at else None,
            'test_mode': campaign.test_mode
        }


# Instancia global
email_service = AdvancedEmailService()
