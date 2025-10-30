#!/usr/bin/env python3
"""
WhatsApp Business API Notification Service
Servicio de Notificaciones por WhatsApp con Control por Proveedor
"""

import os
import json
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
import aiohttp
from sqlalchemy.orm import Session
import logging

# Configure logging
logger = logging.getLogger(__name__)

class WhatsAppNotificationService:
    """
    Service for sending WhatsApp notifications to providers and staff
    Integrates with WhatsApp Business API
    """
    
    def __init__(self):
        # WhatsApp Business API credentials
        self.api_url = os.getenv("WHATSAPP_API_URL", "https://graph.facebook.com/v18.0")
        self.phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
        self.access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
        self.business_account_id = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID")
        
        # Configuration
        self.enabled = os.getenv("WHATSAPP_ENABLED", "false").lower() == "true"
        self.max_retries = 3
        self.retry_delay = 5  # seconds
        
        # Message templates (pre-approved by WhatsApp)
        self.templates = {
            "reservation_confirmation": {
                "name": "reservation_confirmation",
                "language": "es",
                "params": ["group_name", "confirmation_number", "service_date", "quantity"]
            },
            "invoice_request": {
                "name": "invoice_request",
                "language": "es",
                "params": ["provider_name", "group_name", "service_date", "amount"]
            },
            "payment_reminder": {
                "name": "payment_reminder",
                "language": "es",
                "params": ["provider_name", "invoice_number", "amount", "due_date"]
            },
            "rooming_list_request": {
                "name": "rooming_list_request",
                "language": "es",
                "params": ["provider_name", "group_name", "check_in", "rooms"]
            },
            "service_alert": {
                "name": "service_alert",
                "language": "es",
                "params": ["alert_type", "group_name", "message"]
            },
            "anomaly_detected": {
                "name": "anomaly_detected",
                "language": "es",
                "params": ["anomaly_type", "details", "action_required"]
            }
        }
    
    async def send_notification(
        self,
        phone_number: str,
        template_name: str,
        parameters: Dict[str, Any],
        provider_id: Optional[str] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Send WhatsApp notification to a phone number
        
        Args:
            phone_number: Recipient phone number (international format)
            template_name: Name of the WhatsApp template to use
            parameters: Template parameters
            provider_id: Optional provider ID to check if notifications are enabled
            db: Database session
        
        Returns:
            Dict with status and message ID
        """
        # Check if WhatsApp is globally enabled
        if not self.enabled:
            logger.info("WhatsApp notifications are globally disabled")
            return {
                "success": False,
                "reason": "WhatsApp notifications disabled globally"
            }
        
        # Check if provider has WhatsApp enabled (if provider_id provided)
        if provider_id and db:
            provider = await self._get_provider(provider_id, db)
            if provider and not self._is_whatsapp_enabled_for_provider(provider):
                logger.info(f"WhatsApp disabled for provider {provider_id}")
                return {
                    "success": False,
                    "reason": f"WhatsApp notifications disabled for this provider"
                }
        
        # Validate template exists
        if template_name not in self.templates:
            logger.error(f"Template {template_name} not found")
            return {
                "success": False,
                "error": f"Unknown template: {template_name}"
            }
        
        # Format phone number
        formatted_phone = self._format_phone_number(phone_number)
        
        # Build message payload
        template_config = self.templates[template_name]
        payload = self._build_message_payload(
            formatted_phone,
            template_config,
            parameters
        )
        
        # Send with retry logic
        for attempt in range(self.max_retries):
            try:
                result = await self._send_whatsapp_message(payload)
                
                # Log successful send
                await self._log_notification(
                    phone_number=formatted_phone,
                    template_name=template_name,
                    status="sent",
                    message_id=result.get("messages", [{}])[0].get("id"),
                    provider_id=provider_id,
                    db=db
                )
                
                return {
                    "success": True,
                    "message_id": result.get("messages", [{}])[0].get("id"),
                    "phone_number": formatted_phone
                }
                
            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed: {str(e)}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
                else:
                    # Log failed send
                    await self._log_notification(
                        phone_number=formatted_phone,
                        template_name=template_name,
                        status="failed",
                        error=str(e),
                        provider_id=provider_id,
                        db=db
                    )
                    
                    return {
                        "success": False,
                        "error": str(e)
                    }
    
    async def send_bulk_notifications(
        self,
        recipients: List[Dict[str, Any]],
        template_name: str,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Send notifications to multiple recipients
        
        Args:
            recipients: List of dicts with 'phone', 'parameters', 'provider_id'
            template_name: Template to use
            db: Database session
        
        Returns:
            Dict with success count and failures
        """
        results = {
            "total": len(recipients),
            "success": 0,
            "failed": 0,
            "failures": []
        }
        
        # Send notifications concurrently
        tasks = []
        for recipient in recipients:
            task = self.send_notification(
                phone_number=recipient["phone"],
                template_name=template_name,
                parameters=recipient.get("parameters", {}),
                provider_id=recipient.get("provider_id"),
                db=db
            )
            tasks.append(task)
        
        # Wait for all to complete
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                results["failed"] += 1
                results["failures"].append({
                    "recipient": recipients[i]["phone"],
                    "error": str(response)
                })
            elif response.get("success"):
                results["success"] += 1
            else:
                results["failed"] += 1
                results["failures"].append({
                    "recipient": recipients[i]["phone"],
                    "error": response.get("error", "Unknown error")
                })
        
        return results
    
    async def send_reservation_confirmation(
        self,
        provider_phone: str,
        group_name: str,
        confirmation_number: str,
        service_date: datetime,
        quantity: int,
        provider_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """Send reservation confirmation to provider"""
        return await self.send_notification(
            phone_number=provider_phone,
            template_name="reservation_confirmation",
            parameters={
                "group_name": group_name,
                "confirmation_number": confirmation_number,
                "service_date": service_date.strftime("%d/%m/%Y"),
                "quantity": str(quantity)
            },
            provider_id=provider_id,
            db=db
        )
    
    async def send_invoice_request(
        self,
        provider_phone: str,
        provider_name: str,
        group_name: str,
        service_date: datetime,
        amount: float,
        provider_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """Request invoice from provider"""
        return await self.send_notification(
            phone_number=provider_phone,
            template_name="invoice_request",
            parameters={
                "provider_name": provider_name,
                "group_name": group_name,
                "service_date": service_date.strftime("%d/%m/%Y"),
                "amount": f"${amount:.2f}"
            },
            provider_id=provider_id,
            db=db
        )
    
    async def send_payment_reminder(
        self,
        provider_phone: str,
        provider_name: str,
        invoice_number: str,
        amount: float,
        due_date: datetime,
        provider_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """Send payment reminder to provider"""
        return await self.send_notification(
            phone_number=provider_phone,
            template_name="payment_reminder",
            parameters={
                "provider_name": provider_name,
                "invoice_number": invoice_number,
                "amount": f"${amount:.2f}",
                "due_date": due_date.strftime("%d/%m/%Y")
            },
            provider_id=provider_id,
            db=db
        )
    
    async def send_rooming_list_request(
        self,
        provider_phone: str,
        provider_name: str,
        group_name: str,
        check_in: datetime,
        rooms: int,
        provider_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """Request rooming list from provider"""
        return await self.send_notification(
            phone_number=provider_phone,
            template_name="rooming_list_request",
            parameters={
                "provider_name": provider_name,
                "group_name": group_name,
                "check_in": check_in.strftime("%d/%m/%Y"),
                "rooms": str(rooms)
            },
            provider_id=provider_id,
            db=db
        )
    
    async def send_anomaly_alert(
        self,
        staff_phone: str,
        anomaly_type: str,
        details: str,
        action_required: str,
        db: Session
    ) -> Dict[str, Any]:
        """Send anomaly detection alert to operations staff"""
        return await self.send_notification(
            phone_number=staff_phone,
            template_name="anomaly_detected",
            parameters={
                "anomaly_type": anomaly_type,
                "details": details,
                "action_required": action_required
            },
            db=db
        )
    
    def enable_for_provider(self, provider_id: str, db: Session) -> bool:
        """Enable WhatsApp notifications for a provider"""
        try:
            from ..models.operations_models import Provider
            
            provider = db.query(Provider).filter(Provider.id == provider_id).first()
            if not provider:
                return False
            
            # Update provider settings
            if not provider.notification_settings:
                provider.notification_settings = {}
            
            provider.notification_settings["whatsapp_enabled"] = True
            provider.notification_settings["whatsapp_enabled_at"] = datetime.utcnow().isoformat()
            
            db.commit()
            logger.info(f"WhatsApp enabled for provider {provider_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error enabling WhatsApp for provider: {str(e)}")
            db.rollback()
            return False
    
    def disable_for_provider(self, provider_id: str, db: Session) -> bool:
        """Disable WhatsApp notifications for a provider"""
        try:
            from ..models.operations_models import Provider
            
            provider = db.query(Provider).filter(Provider.id == provider_id).first()
            if not provider:
                return False
            
            # Update provider settings
            if not provider.notification_settings:
                provider.notification_settings = {}
            
            provider.notification_settings["whatsapp_enabled"] = False
            provider.notification_settings["whatsapp_disabled_at"] = datetime.utcnow().isoformat()
            
            db.commit()
            logger.info(f"WhatsApp disabled for provider {provider_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error disabling WhatsApp for provider: {str(e)}")
            db.rollback()
            return False
    
    def get_provider_whatsapp_status(self, provider_id: str, db: Session) -> Dict[str, Any]:
        """Get WhatsApp notification status for a provider"""
        try:
            from ..models.operations_models import Provider
            
            provider = db.query(Provider).filter(Provider.id == provider_id).first()
            if not provider:
                return {"enabled": False, "error": "Provider not found"}
            
            settings = provider.notification_settings or {}
            
            return {
                "enabled": settings.get("whatsapp_enabled", False),
                "enabled_at": settings.get("whatsapp_enabled_at"),
                "disabled_at": settings.get("whatsapp_disabled_at"),
                "phone_number": provider.phone,
                "global_enabled": self.enabled
            }
            
        except Exception as e:
            logger.error(f"Error getting WhatsApp status: {str(e)}")
            return {"enabled": False, "error": str(e)}
    
    # Private methods
    
    async def _send_whatsapp_message(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Send message via WhatsApp Business API"""
        if not self.phone_number_id or not self.access_token:
            raise ValueError("WhatsApp API credentials not configured")
        
        url = f"{self.api_url}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"WhatsApp API error: {error_text}")
                
                return await response.json()
    
    def _build_message_payload(
        self,
        phone_number: str,
        template_config: Dict[str, Any],
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build WhatsApp message payload"""
        # Build template components
        components = [
            {
                "type": "body",
                "parameters": [
                    {
                        "type": "text",
                        "text": str(parameters.get(param, ""))
                    }
                    for param in template_config["params"]
                ]
            }
        ]
        
        return {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": phone_number,
            "type": "template",
            "template": {
                "name": template_config["name"],
                "language": {
                    "code": template_config["language"]
                },
                "components": components
            }
        }
    
    def _format_phone_number(self, phone: str) -> str:
        """Format phone number for WhatsApp (international format without +)"""
        # Remove all non-numeric characters
        cleaned = ''.join(filter(str.isdigit, phone))
        
        # If doesn't start with country code, add default (assuming US +1)
        if len(cleaned) == 10:
            cleaned = "1" + cleaned
        
        return cleaned
    
    def _is_whatsapp_enabled_for_provider(self, provider: Any) -> bool:
        """Check if WhatsApp is enabled for a specific provider"""
        if not hasattr(provider, 'notification_settings') or not provider.notification_settings:
            return False  # Default disabled
        
        return provider.notification_settings.get("whatsapp_enabled", False)
    
    async def _get_provider(self, provider_id: str, db: Session) -> Optional[Any]:
        """Get provider from database"""
        try:
            from ..models.operations_models import Provider
            return db.query(Provider).filter(Provider.id == provider_id).first()
        except:
            return None
    
    async def _log_notification(
        self,
        phone_number: str,
        template_name: str,
        status: str,
        message_id: Optional[str] = None,
        error: Optional[str] = None,
        provider_id: Optional[str] = None,
        db: Optional[Session] = None
    ):
        """Log notification send attempt"""
        if not db:
            return
        
        try:
            from ..models.operations_models import NotificationLog
            
            log_entry = NotificationLog(
                notification_type="whatsapp",
                recipient=phone_number,
                template_name=template_name,
                status=status,
                message_id=message_id,
                error_message=error,
                provider_id=provider_id,
                sent_at=datetime.utcnow()
            )
            
            db.add(log_entry)
            db.commit()
            
        except Exception as e:
            logger.error(f"Error logging notification: {str(e)}")

# Singleton instance
whatsapp_service = WhatsAppNotificationService()

__all__ = ['WhatsAppNotificationService', 'whatsapp_service']