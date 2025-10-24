"""
Email Service for Group Quotation System
Professional email templates with SendGrid/SMTP integration
"""

import os
import asyncio
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
from jinja2 import Template
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import base64
from pathlib import Path

# SendGrid integration (optional)
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False

logger = logging.getLogger(__name__)


class EmailType(Enum):
    """Tipos de email del sistema"""
    # Cotizaciones
    QUOTATION_INVITATION = "quotation_invitation"
    QUOTATION_REMINDER = "quotation_reminder"
    QUOTATION_DEADLINE_ALERT = "quotation_deadline_alert"
    QUOTATION_EXPIRED = "quotation_expired"
    QUOTATION_AWARDED = "quotation_awarded"
    
    # Respuestas
    RESPONSE_RECEIVED = "response_received"
    RESPONSE_UPDATED = "response_updated"
    RESPONSE_SELECTED = "response_selected"
    RESPONSE_REJECTED = "response_rejected"
    
    # Pagos
    DEPOSIT_REQUEST = "deposit_request"
    DEPOSIT_RECEIVED = "deposit_received"
    PAYMENT_CONFIRMATION = "payment_confirmation"
    PAYMENT_REMINDER = "payment_reminder"
    
    # Sistema
    WELCOME_HOTEL = "welcome_hotel"
    PASSWORD_RESET = "password_reset"
    ACCOUNT_VERIFICATION = "account_verification"
    SYSTEM_NOTIFICATION = "system_notification"


class EmailTemplate:
    """Templates de email profesionales"""
    
    # Template para invitación a cotización
    QUOTATION_INVITATION = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .details { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .highlight { color: #667eea; font-weight: bold; }
        .deadline { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏨 Nueva Oportunidad de Cotización</h1>
            <p>Spirit Tours te ha invitado a participar</p>
        </div>
        
        <div class="content">
            <h2>Estimado/a {{ hotel_name }},</h2>
            
            <p>Has sido seleccionado para participar en una nueva solicitud de cotización grupal.</p>
            
            <div class="details">
                <h3>📋 Detalles de la Solicitud</h3>
                <table style="width: 100%;">
                    <tr>
                        <td><strong>Referencia:</strong></td>
                        <td>{{ reference_number }}</td>
                    </tr>
                    <tr>
                        <td><strong>Destino:</strong></td>
                        <td>{{ destination }}</td>
                    </tr>
                    <tr>
                        <td><strong>Check-in:</strong></td>
                        <td>{{ check_in_date }}</td>
                    </tr>
                    <tr>
                        <td><strong>Check-out:</strong></td>
                        <td>{{ check_out_date }}</td>
                    </tr>
                    <tr>
                        <td><strong>Habitaciones:</strong></td>
                        <td>{{ num_rooms }}</td>
                    </tr>
                    <tr>
                        <td><strong>Huéspedes:</strong></td>
                        <td>{{ num_guests }}</td>
                    </tr>
                    <tr>
                        <td><strong>Plan de comidas:</strong></td>
                        <td>{{ meal_plan }}</td>
                    </tr>
                </table>
            </div>
            
            <div class="deadline">
                ⏰ <strong>Fecha límite para enviar tu propuesta:</strong> 
                <span class="highlight">{{ deadline }}</span>
                <br>
                <small>{{ days_remaining }} días restantes</small>
            </div>
            
            {% if special_requirements %}
            <div class="details">
                <h3>📌 Requerimientos Especiales</h3>
                <ul>
                {% for requirement in special_requirements %}
                    <li>{{ requirement }}</li>
                {% endfor %}
                </ul>
            </div>
            {% endif %}
            
            <h3>🎯 ¿Por qué participar?</h3>
            <ul>
                <li>Grupo confirmado con depósito garantizado</li>
                <li>Proceso transparente y justo</li>
                <li>Decisión rápida tras el deadline</li>
                <li>Pago según tus términos comerciales</li>
            </ul>
            
            <center>
                <a href="{{ response_url }}" class="button">
                    📝 Enviar Mi Propuesta
                </a>
            </center>
            
            <p><strong>Importante:</strong> Solo podrás actualizar tu propuesta <span class="highlight">{{ max_updates }} veces</span> antes de necesitar contactar al administrador.</p>
            
            {% if privacy_note %}
            <p style="background: #e3f2fd; padding: 10px; border-radius: 5px;">
                🔒 <strong>Nota de Privacidad:</strong> {{ privacy_note }}
            </p>
            {% endif %}
        </div>
        
        <div class="footer">
            <p>© 2024 Spirit Tours - Plataforma de Cotizaciones Grupales</p>
            <p>Si tienes preguntas, contacta a nuestro equipo de soporte</p>
            <p>📧 soporte@spirittours.com | 📞 +1-800-SPIRIT</p>
        </div>
    </div>
</body>
</html>
    """
    
    # Template para notificación de respuesta seleccionada
    RESPONSE_SELECTED = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 10px 10px; }
        .success-box { background: #d4edda; border: 2px solid #28a745; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
        .next-steps { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 ¡Felicidades!</h1>
            <p>Tu propuesta ha sido seleccionada</p>
        </div>
        
        <div class="content">
            <h2>Estimado/a {{ hotel_name }},</h2>
            
            <div class="success-box">
                <h2>✅ Tu propuesta para la cotización #{{ reference_number }} ha sido ACEPTADA</h2>
                <p style="font-size: 18px;">Valor del contrato: <strong>{{ contract_value }}</strong></p>
            </div>
            
            <h3>📋 Resumen del Grupo</h3>
            <table style="width: 100%; background: #f8f9fa; padding: 10px;">
                <tr>
                    <td><strong>Fechas:</strong></td>
                    <td>{{ check_in_date }} - {{ check_out_date }}</td>
                </tr>
                <tr>
                    <td><strong>Habitaciones:</strong></td>
                    <td>{{ num_rooms }}</td>
                </tr>
                <tr>
                    <td><strong>Huéspedes:</strong></td>
                    <td>{{ num_guests }}</td>
                </tr>
                <tr>
                    <td><strong>Contacto del cliente:</strong></td>
                    <td>{{ client_contact }}</td>
                </tr>
            </table>
            
            <div class="next-steps">
                <h3>🚀 Próximos Pasos</h3>
                <ol>
                    <li>El cliente realizará el depósito de <strong>{{ deposit_amount }}</strong> en las próximas 48 horas</li>
                    <li>Recibirás confirmación cuando el depósito sea procesado</li>
                    <li>Coordina directamente con el cliente los detalles finales</li>
                    <li>Prepara el contrato según los términos acordados</li>
                </ol>
            </div>
            
            <center>
                <a href="{{ booking_details_url }}" class="button">
                    Ver Detalles Completos
                </a>
            </center>
        </div>
        
        <div class="footer">
            <p>© 2024 Spirit Tours</p>
            <p>Gracias por tu participación y excelente propuesta</p>
        </div>
    </div>
</body>
</html>
    """
    
    # Template para recordatorio de deadline
    DEADLINE_REMINDER = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        .urgent { background: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 10px; }
        .countdown { font-size: 24px; color: #ff6b6b; font-weight: bold; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="urgent">
            <h2>⏰ Recordatorio Urgente - Cotización #{{ reference_number }}</h2>
            <div class="countdown">
                Quedan solo {{ hours_remaining }} horas para enviar tu propuesta
            </div>
        </div>
        
        <p>No pierdas esta oportunidad de negocio. El grupo de {{ num_rooms }} habitaciones 
        está esperando tu mejor propuesta.</p>
        
        <center>
            <a href="{{ response_url }}" style="padding: 15px 30px; background: #ffc107; color: black; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Enviar Propuesta Ahora
            </a>
        </center>
    </div>
</body>
</html>
    """


class EmailService:
    """
    Servicio de email con cola de envío y reintentos
    """
    
    def __init__(self, 
                 provider: str = "sendgrid",
                 api_key: Optional[str] = None,
                 smtp_config: Optional[Dict[str, Any]] = None):
        """
        Inicializar servicio de email
        
        Args:
            provider: 'sendgrid' o 'smtp'
            api_key: API key para SendGrid
            smtp_config: Configuración SMTP {host, port, username, password, use_tls}
        """
        self.provider = provider
        self.api_key = api_key or os.getenv("SENDGRID_API_KEY")
        self.smtp_config = smtp_config or {
            "host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
            "port": int(os.getenv("SMTP_PORT", "587")),
            "username": os.getenv("SMTP_USERNAME"),
            "password": os.getenv("SMTP_PASSWORD"),
            "use_tls": True
        }
        
        # Cola de emails
        self.email_queue: List[Dict[str, Any]] = []
        self.processing = False
        self.max_retries = 3
        self.retry_delay = 60  # segundos
        
        # Templates
        self.templates = {
            EmailType.QUOTATION_INVITATION: EmailTemplate.QUOTATION_INVITATION,
            EmailType.RESPONSE_SELECTED: EmailTemplate.RESPONSE_SELECTED,
            EmailType.QUOTATION_DEADLINE_ALERT: EmailTemplate.DEADLINE_REMINDER
        }
        
        # Configuración por defecto
        self.default_from_email = os.getenv("DEFAULT_FROM_EMAIL", "noreply@spirittours.com")
        self.default_from_name = "Spirit Tours"
        
        # Cliente SendGrid si está disponible
        if SENDGRID_AVAILABLE and self.api_key:
            self.sg_client = SendGridAPIClient(self.api_key)
        else:
            self.sg_client = None
            
        logger.info(f"Email Service inicializado con provider: {provider}")
        
    async def send_email(
        self,
        to_email: str,
        subject: str,
        email_type: EmailType,
        template_data: Dict[str, Any],
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        priority: int = 5,
        retry_on_failure: bool = True
    ) -> bool:
        """
        Enviar email con template
        
        Args:
            to_email: Email destinatario
            subject: Asunto del email
            email_type: Tipo de email (para seleccionar template)
            template_data: Datos para renderizar el template
            cc_emails: Lista de emails en copia
            bcc_emails: Lista de emails en copia oculta
            attachments: Lista de archivos adjuntos
            priority: Prioridad (1-10, 1 es más alta)
            retry_on_failure: Reintentar si falla
            
        Returns:
            bool: True si se envió correctamente
        """
        try:
            # Preparar email
            email_data = {
                "to_email": to_email,
                "subject": subject,
                "email_type": email_type,
                "template_data": template_data,
                "cc_emails": cc_emails or [],
                "bcc_emails": bcc_emails or [],
                "attachments": attachments or [],
                "priority": priority,
                "retry_on_failure": retry_on_failure,
                "attempts": 0,
                "created_at": datetime.now()
            }
            
            # Agregar a la cola
            self.email_queue.append(email_data)
            
            # Procesar cola si no está en proceso
            if not self.processing:
                asyncio.create_task(self._process_queue())
                
            return True
            
        except Exception as e:
            logger.error(f"Error preparando email: {e}")
            return False
            
    async def send_quotation_invitation(
        self,
        hotel_email: str,
        hotel_name: str,
        quotation_data: Dict[str, Any],
        response_url: str
    ) -> bool:
        """
        Enviar invitación a cotización a un hotel
        """
        # Calcular días restantes
        deadline = datetime.fromisoformat(quotation_data["deadline"])
        days_remaining = (deadline - datetime.now()).days
        
        # Preparar datos del template
        template_data = {
            "hotel_name": hotel_name,
            "reference_number": quotation_data["reference_number"],
            "destination": quotation_data["destination"],
            "check_in_date": quotation_data["check_in_date"],
            "check_out_date": quotation_data["check_out_date"],
            "num_rooms": quotation_data["num_rooms"],
            "num_guests": quotation_data["num_guests"],
            "meal_plan": quotation_data.get("meal_plan", "BB"),
            "deadline": deadline.strftime("%d/%m/%Y %H:%M"),
            "days_remaining": days_remaining,
            "special_requirements": quotation_data.get("special_requirements", []),
            "response_url": response_url,
            "max_updates": 2,
            "privacy_note": "Los precios de otros hoteles permanecerán confidenciales durante el proceso de cotización."
        }
        
        return await self.send_email(
            to_email=hotel_email,
            subject=f"Nueva Oportunidad - Grupo {quotation_data['num_rooms']} habitaciones - {quotation_data['destination']}",
            email_type=EmailType.QUOTATION_INVITATION,
            template_data=template_data,
            priority=1
        )
        
    async def send_response_selected(
        self,
        hotel_email: str,
        hotel_name: str,
        quotation_data: Dict[str, Any],
        response_data: Dict[str, Any],
        booking_details_url: str
    ) -> bool:
        """
        Notificar a hotel que su respuesta fue seleccionada
        """
        template_data = {
            "hotel_name": hotel_name,
            "reference_number": quotation_data["reference_number"],
            "contract_value": f"${response_data['total_price']:,.2f} {response_data['currency']}",
            "check_in_date": quotation_data["check_in_date"],
            "check_out_date": quotation_data["check_out_date"],
            "num_rooms": quotation_data["num_rooms"],
            "num_guests": quotation_data["num_guests"],
            "client_contact": quotation_data.get("client_contact", "Se proporcionará pronto"),
            "deposit_amount": f"${quotation_data['deposit_config']['amount']:,.2f}",
            "booking_details_url": booking_details_url
        }
        
        return await self.send_email(
            to_email=hotel_email,
            subject=f"🎉 ¡Felicidades! Tu propuesta ha sido seleccionada - {quotation_data['reference_number']}",
            email_type=EmailType.RESPONSE_SELECTED,
            template_data=template_data,
            priority=1
        )
        
    async def send_deadline_reminder(
        self,
        hotel_email: str,
        hotel_name: str,
        quotation_data: Dict[str, Any],
        response_url: str,
        hours_remaining: int
    ) -> bool:
        """
        Enviar recordatorio de deadline próximo
        """
        template_data = {
            "hotel_name": hotel_name,
            "reference_number": quotation_data["reference_number"],
            "hours_remaining": hours_remaining,
            "num_rooms": quotation_data["num_rooms"],
            "response_url": response_url
        }
        
        return await self.send_email(
            to_email=hotel_email,
            subject=f"⏰ Urgente - Quedan {hours_remaining} horas - Cotización {quotation_data['reference_number']}",
            email_type=EmailType.QUOTATION_DEADLINE_ALERT,
            template_data=template_data,
            priority=1
        )
        
    async def _process_queue(self):
        """
        Procesar cola de emails
        """
        self.processing = True
        
        try:
            while self.email_queue:
                # Ordenar por prioridad
                self.email_queue.sort(key=lambda x: x["priority"])
                
                # Tomar primer email
                email_data = self.email_queue.pop(0)
                
                # Intentar enviar
                success = await self._send_single_email(email_data)
                
                if not success and email_data["retry_on_failure"]:
                    # Incrementar intentos
                    email_data["attempts"] += 1
                    
                    # Reintentar si no ha excedido el máximo
                    if email_data["attempts"] < self.max_retries:
                        # Volver a agregar a la cola con menor prioridad
                        email_data["priority"] = min(10, email_data["priority"] + 1)
                        self.email_queue.append(email_data)
                        
                        # Esperar antes de reintentar
                        await asyncio.sleep(self.retry_delay)
                        
                # Pequeña pausa entre emails
                await asyncio.sleep(0.5)
                
        except Exception as e:
            logger.error(f"Error procesando cola de emails: {e}")
            
        finally:
            self.processing = False
            
    async def _send_single_email(self, email_data: Dict[str, Any]) -> bool:
        """
        Enviar un email individual
        """
        try:
            # Obtener template
            template_str = self.templates.get(email_data["email_type"])
            if not template_str:
                logger.error(f"Template no encontrado para {email_data['email_type']}")
                return False
                
            # Renderizar template
            template = Template(template_str)
            html_content = template.render(**email_data["template_data"])
            
            # Enviar según provider
            if self.provider == "sendgrid" and self.sg_client:
                return await self._send_via_sendgrid(
                    email_data["to_email"],
                    email_data["subject"],
                    html_content,
                    email_data.get("cc_emails", []),
                    email_data.get("bcc_emails", []),
                    email_data.get("attachments", [])
                )
            else:
                return await self._send_via_smtp(
                    email_data["to_email"],
                    email_data["subject"],
                    html_content,
                    email_data.get("cc_emails", []),
                    email_data.get("bcc_emails", []),
                    email_data.get("attachments", [])
                )
                
        except Exception as e:
            logger.error(f"Error enviando email: {e}")
            return False
            
    async def _send_via_sendgrid(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        cc_emails: List[str],
        bcc_emails: List[str],
        attachments: List[Dict[str, Any]]
    ) -> bool:
        """
        Enviar email via SendGrid
        """
        try:
            message = Mail(
                from_email=(self.default_from_email, self.default_from_name),
                to_emails=to_email,
                subject=subject,
                html_content=html_content
            )
            
            # Agregar CC y BCC
            for cc in cc_emails:
                message.add_cc(cc)
            for bcc in bcc_emails:
                message.add_bcc(bcc)
                
            # Agregar attachments
            for att in attachments:
                attachment = Attachment(
                    FileContent(att["content"]),
                    FileName(att["filename"]),
                    FileType(att.get("type", "application/octet-stream")),
                    Disposition("attachment")
                )
                message.add_attachment(attachment)
                
            # Enviar
            response = self.sg_client.send(message)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"Email enviado exitosamente a {to_email}")
                return True
            else:
                logger.error(f"Error SendGrid: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error enviando via SendGrid: {e}")
            return False
            
    async def _send_via_smtp(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        cc_emails: List[str],
        bcc_emails: List[str],
        attachments: List[Dict[str, Any]]
    ) -> bool:
        """
        Enviar email via SMTP
        """
        try:
            # Crear mensaje
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.default_from_name} <{self.default_from_email}>"
            message["To"] = to_email
            
            if cc_emails:
                message["Cc"] = ", ".join(cc_emails)
                
            # Agregar contenido HTML
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            # Agregar attachments
            for att in attachments:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(att["content"])
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename= {att['filename']}"
                )
                message.attach(part)
                
            # Enviar
            async with aiosmtplib.SMTP(
                hostname=self.smtp_config["host"],
                port=self.smtp_config["port"],
                use_tls=self.smtp_config.get("use_tls", True)
            ) as smtp:
                if self.smtp_config.get("username") and self.smtp_config.get("password"):
                    await smtp.login(
                        self.smtp_config["username"],
                        self.smtp_config["password"]
                    )
                    
                # Combinar todos los destinatarios
                all_recipients = [to_email] + cc_emails + bcc_emails
                
                await smtp.send_message(message, recipients=all_recipients)
                
            logger.info(f"Email enviado exitosamente a {to_email} via SMTP")
            return True
            
        except Exception as e:
            logger.error(f"Error enviando via SMTP: {e}")
            return False
            
    async def get_queue_stats(self) -> Dict[str, Any]:
        """
        Obtener estadísticas de la cola de emails
        """
        return {
            "queue_size": len(self.email_queue),
            "processing": self.processing,
            "by_priority": {
                str(p): sum(1 for e in self.email_queue if e["priority"] == p)
                for p in range(1, 11)
            },
            "timestamp": datetime.now().isoformat()
        }


# Instancia global del servicio
email_service = EmailService()