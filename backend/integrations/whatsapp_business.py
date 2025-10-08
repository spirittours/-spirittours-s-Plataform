"""
WhatsApp Business API Integration
Complete customer support and booking system via WhatsApp
"""

import os
import json
import uuid
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from enum import Enum
import hmac
import hashlib
import base64
from dataclasses import dataclass, field
import logging
import re
from urllib.parse import quote
import qrcode
import io
from PIL import Image
import requests

logger = logging.getLogger(__name__)

class MessageType(Enum):
    """WhatsApp message types"""
    TEXT = "text"
    IMAGE = "image"
    DOCUMENT = "document"
    AUDIO = "audio"
    VIDEO = "video"
    LOCATION = "location"
    CONTACTS = "contacts"
    INTERACTIVE = "interactive"
    TEMPLATE = "template"
    REACTION = "reaction"
    STICKER = "sticker"


class MessageStatus(Enum):
    """Message delivery status"""
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    DELETED = "deleted"


class ConversationState(Enum):
    """Customer conversation state"""
    INITIAL = "initial"
    GREETING = "greeting"
    MENU = "menu"
    BOOKING_SEARCH = "booking_search"
    BOOKING_DETAILS = "booking_details"
    PAYMENT = "payment"
    CONFIRMATION = "confirmation"
    SUPPORT = "support"
    FEEDBACK = "feedback"
    COMPLETED = "completed"


@dataclass
class Customer:
    """WhatsApp customer profile"""
    phone_number: str
    name: Optional[str] = None
    profile_picture: Optional[str] = None
    language: str = "en"
    timezone: str = "UTC"
    last_seen: Optional[datetime] = None
    conversation_state: ConversationState = ConversationState.INITIAL
    context: Dict = field(default_factory=dict)
    booking_history: List[str] = field(default_factory=list)
    preferences: Dict = field(default_factory=dict)


@dataclass
class WhatsAppMessage:
    """WhatsApp message structure"""
    id: str
    from_number: str
    to_number: str
    type: MessageType
    content: Union[str, Dict]
    timestamp: datetime
    status: MessageStatus = MessageStatus.SENT
    context: Optional[Dict] = None
    reply_to: Optional[str] = None


class WhatsAppBusinessAPI:
    """WhatsApp Business API Client"""
    
    def __init__(self):
        self.base_url = "https://graph.facebook.com/v18.0"
        self.phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
        self.business_account_id = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID")
        self.access_token = os.getenv("WHATSAPP_ACCESS_TOKEN")
        self.verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN")
        self.webhook_url = os.getenv("WHATSAPP_WEBHOOK_URL")
        self.session = None
        self.customers = {}  # Phone -> Customer mapping
        self.message_templates = self._load_message_templates()
        
    async def initialize(self):
        """Initialize WhatsApp Business API session"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        
        # Register webhook
        await self._register_webhook()
        
        # Load message templates
        await self._sync_message_templates()
        
        logger.info("WhatsApp Business API initialized")
    
    async def close(self):
        """Close API session"""
        if self.session:
            await self.session.close()
    
    def _load_message_templates(self) -> Dict:
        """Load pre-approved message templates"""
        return {
            "welcome": {
                "name": "welcome_message",
                "language": "en",
                "components": [
                    {
                        "type": "header",
                        "parameters": [{"type": "text", "text": "Welcome to Spirit Tours!"}]
                    },
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": "{{1}}"}  # Customer name
                        ]
                    }
                ]
            },
            "booking_confirmation": {
                "name": "booking_confirmation",
                "language": "en",
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": "{{1}}"},  # Booking ID
                            {"type": "text", "text": "{{2}}"},  # Product
                            {"type": "text", "text": "{{3}}"},  # Date
                            {"type": "text", "text": "{{4}}"}   # Amount
                        ]
                    }
                ]
            },
            "payment_reminder": {
                "name": "payment_reminder",
                "language": "en",
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": "{{1}}"},  # Booking ID
                            {"type": "text", "text": "{{2}}"}   # Amount
                        ]
                    },
                    {
                        "type": "button",
                        "sub_type": "url",
                        "index": 0,
                        "parameters": [
                            {"type": "text", "text": "{{3}}"}  # Payment link
                        ]
                    }
                ]
            }
        }
    
    async def _register_webhook(self):
        """Register webhook for receiving messages"""
        webhook_data = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": self.business_account_id,
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {
                            "display_phone_number": self.phone_number_id,
                            "phone_number_id": self.phone_number_id
                        }
                    },
                    "field": "messages"
                }]
            }]
        }
        
        # Subscribe to webhook events
        url = f"{self.base_url}/{self.phone_number_id}/subscribed_apps"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        async with self.session.post(url, headers=headers) as response:
            if response.status == 200:
                logger.info("Webhook registered successfully")
            else:
                logger.error(f"Failed to register webhook: {await response.text()}")
    
    async def _sync_message_templates(self):
        """Sync message templates from WhatsApp Business account"""
        url = f"{self.base_url}/{self.business_account_id}/message_templates"
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        async with self.session.get(url, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                # Update local templates with server templates
                for template in data.get("data", []):
                    if template["status"] == "APPROVED":
                        self.message_templates[template["name"]] = template
    
    async def send_message(
        self,
        to_number: str,
        message_type: MessageType,
        content: Union[str, Dict],
        context: Optional[Dict] = None
    ) -> WhatsAppMessage:
        """Send WhatsApp message"""
        
        # Format phone number
        to_number = self._format_phone_number(to_number)
        
        # Build message payload
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_number
        }
        
        if message_type == MessageType.TEXT:
            payload["type"] = "text"
            payload["text"] = {
                "preview_url": True,
                "body": content
            }
        elif message_type == MessageType.IMAGE:
            payload["type"] = "image"
            payload["image"] = {
                "link": content.get("url"),
                "caption": content.get("caption", "")
            }
        elif message_type == MessageType.DOCUMENT:
            payload["type"] = "document"
            payload["document"] = {
                "link": content.get("url"),
                "caption": content.get("caption", ""),
                "filename": content.get("filename", "document.pdf")
            }
        elif message_type == MessageType.LOCATION:
            payload["type"] = "location"
            payload["location"] = {
                "latitude": content.get("latitude"),
                "longitude": content.get("longitude"),
                "name": content.get("name", ""),
                "address": content.get("address", "")
            }
        elif message_type == MessageType.INTERACTIVE:
            payload["type"] = "interactive"
            payload["interactive"] = content
        elif message_type == MessageType.TEMPLATE:
            payload["type"] = "template"
            payload["template"] = content
        
        # Add context if provided
        if context and context.get("message_id"):
            payload["context"] = {
                "message_id": context["message_id"]
            }
        
        # Send message
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        async with self.session.post(url, headers=headers, json=payload) as response:
            if response.status == 200:
                data = await response.json()
                message = WhatsAppMessage(
                    id=data["messages"][0]["id"],
                    from_number=self.phone_number_id,
                    to_number=to_number,
                    type=message_type,
                    content=content,
                    timestamp=datetime.utcnow(),
                    status=MessageStatus.SENT,
                    context=context
                )
                
                # Log message
                await self._log_message(message)
                
                return message
            else:
                error = await response.text()
                logger.error(f"Failed to send message: {error}")
                raise Exception(f"WhatsApp API error: {error}")
    
    async def send_template_message(
        self,
        to_number: str,
        template_name: str,
        parameters: List[str],
        language_code: str = "en"
    ) -> WhatsAppMessage:
        """Send template message"""
        
        template = self.message_templates.get(template_name)
        if not template:
            raise ValueError(f"Template {template_name} not found")
        
        # Build template content
        content = {
            "name": template_name,
            "language": {"code": language_code},
            "components": []
        }
        
        # Add parameters to template
        if parameters:
            body_params = []
            for i, param in enumerate(parameters):
                body_params.append({
                    "type": "text",
                    "text": param
                })
            
            content["components"].append({
                "type": "body",
                "parameters": body_params
            })
        
        return await self.send_message(
            to_number,
            MessageType.TEMPLATE,
            content
        )
    
    async def send_interactive_message(
        self,
        to_number: str,
        message_type: str,  # list, button, product, product_list
        content: Dict
    ) -> WhatsAppMessage:
        """Send interactive message with buttons or lists"""
        
        interactive_content = {
            "type": message_type,
            "header": content.get("header"),
            "body": {
                "text": content["body_text"]
            },
            "footer": content.get("footer"),
            "action": content["action"]
        }
        
        # Remove None values
        interactive_content = {k: v for k, v in interactive_content.items() if v is not None}
        
        return await self.send_message(
            to_number,
            MessageType.INTERACTIVE,
            interactive_content
        )
    
    def _format_phone_number(self, phone: str) -> str:
        """Format phone number for WhatsApp API"""
        # Remove all non-digits
        phone = re.sub(r'\D', '', phone)
        
        # Add country code if not present
        if not phone.startswith('1') and len(phone) == 10:  # US number
            phone = '1' + phone
        
        return phone
    
    async def _log_message(self, message: WhatsAppMessage):
        """Log message for analytics and history"""
        # Implementation for message logging
        pass
    
    async def mark_message_as_read(self, message_id: str):
        """Mark message as read"""
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id
        }
        
        async with self.session.post(url, headers=headers, json=payload) as response:
            if response.status == 200:
                logger.info(f"Message {message_id} marked as read")
            else:
                logger.error(f"Failed to mark message as read: {await response.text()}")


class WhatsAppBot:
    """WhatsApp chatbot for customer support and bookings"""
    
    def __init__(self, api: WhatsAppBusinessAPI):
        self.api = api
        self.conversations = {}  # Phone -> ConversationContext
        self.nlp_processor = WhatsAppNLPProcessor()
        
    async def handle_incoming_message(self, webhook_data: Dict) -> Dict:
        """Process incoming WhatsApp message"""
        
        entry = webhook_data["entry"][0]
        changes = entry["changes"][0]
        value = changes["value"]
        
        if "messages" in value:
            for message_data in value["messages"]:
                customer_number = message_data["from"]
                message_id = message_data["id"]
                message_type = message_data["type"]
                
                # Mark message as read
                await self.api.mark_message_as_read(message_id)
                
                # Get or create customer
                customer = await self._get_or_create_customer(customer_number)
                
                # Process message based on type
                if message_type == "text":
                    response = await self._process_text_message(
                        customer,
                        message_data["text"]["body"],
                        message_id
                    )
                elif message_type == "interactive":
                    response = await self._process_interactive_response(
                        customer,
                        message_data["interactive"],
                        message_id
                    )
                elif message_type == "location":
                    response = await self._process_location_message(
                        customer,
                        message_data["location"],
                        message_id
                    )
                else:
                    response = await self._send_unsupported_message_type(customer)
                
                return response
        
        return {"status": "ok"}
    
    async def _get_or_create_customer(self, phone_number: str) -> Customer:
        """Get existing customer or create new one"""
        if phone_number not in self.api.customers:
            self.api.customers[phone_number] = Customer(
                phone_number=phone_number,
                conversation_state=ConversationState.INITIAL
            )
        
        return self.api.customers[phone_number]
    
    async def _process_text_message(
        self,
        customer: Customer,
        text: str,
        message_id: str
    ) -> Dict:
        """Process text message from customer"""
        
        # Analyze message intent
        intent = await self.nlp_processor.analyze_intent(text)
        
        # Update conversation state
        if customer.conversation_state == ConversationState.INITIAL:
            return await self._send_welcome_message(customer)
        
        elif customer.conversation_state == ConversationState.MENU:
            return await self._process_menu_selection(customer, text)
        
        elif customer.conversation_state == ConversationState.BOOKING_SEARCH:
            return await self._process_booking_search(customer, text)
        
        elif customer.conversation_state == ConversationState.SUPPORT:
            return await self._process_support_query(customer, text)
        
        else:
            # Default to showing main menu
            return await self._send_main_menu(customer)
    
    async def _send_welcome_message(self, customer: Customer) -> Dict:
        """Send welcome message to new customer"""
        
        # Send greeting
        await self.api.send_message(
            customer.phone_number,
            MessageType.TEXT,
            "🌟 Welcome to Spirit Tours! I'm your travel assistant. How can I help you today?"
        )
        
        # Send main menu
        await self._send_main_menu(customer)
        
        # Update state
        customer.conversation_state = ConversationState.MENU
        
        return {"status": "welcome_sent"}
    
    async def _send_main_menu(self, customer: Customer) -> Dict:
        """Send interactive main menu"""
        
        menu_content = {
            "body_text": "Please select an option:",
            "action": {
                "button": "Options",
                "sections": [
                    {
                        "title": "Travel Services",
                        "rows": [
                            {
                                "id": "search_flights",
                                "title": "✈️ Search Flights",
                                "description": "Find and book flights"
                            },
                            {
                                "id": "search_hotels",
                                "title": "🏨 Search Hotels",
                                "description": "Find accommodation"
                            },
                            {
                                "id": "search_packages",
                                "title": "📦 Travel Packages",
                                "description": "Complete travel packages"
                            },
                            {
                                "id": "search_activities",
                                "title": "🎫 Activities & Tours",
                                "description": "Things to do at destination"
                            }
                        ]
                    },
                    {
                        "title": "My Account",
                        "rows": [
                            {
                                "id": "my_bookings",
                                "title": "📋 My Bookings",
                                "description": "View your bookings"
                            },
                            {
                                "id": "check_status",
                                "title": "📍 Booking Status",
                                "description": "Check booking status"
                            },
                            {
                                "id": "support",
                                "title": "💬 Customer Support",
                                "description": "Get help from our team"
                            }
                        ]
                    }
                ]
            }
        }
        
        await self.api.send_interactive_message(
            customer.phone_number,
            "list",
            menu_content
        )
        
        customer.conversation_state = ConversationState.MENU
        
        return {"status": "menu_sent"}
    
    async def _process_menu_selection(self, customer: Customer, selection: str) -> Dict:
        """Process menu selection"""
        
        if selection == "search_flights":
            return await self._start_flight_search(customer)
        elif selection == "search_hotels":
            return await self._start_hotel_search(customer)
        elif selection == "my_bookings":
            return await self._show_customer_bookings(customer)
        elif selection == "support":
            return await self._start_support_conversation(customer)
        else:
            return await self._send_main_menu(customer)
    
    async def _start_flight_search(self, customer: Customer) -> Dict:
        """Start flight search conversation"""
        
        await self.api.send_message(
            customer.phone_number,
            MessageType.TEXT,
            "Let's search for flights! ✈️\n\nPlease tell me:\n1. From which city?\n2. To which city?\n3. Departure date?\n4. Return date (if round trip)?\n\nExample: New York to London, Dec 15-22"
        )
        
        customer.conversation_state = ConversationState.BOOKING_SEARCH
        customer.context["search_type"] = "flight"
        
        return {"status": "flight_search_started"}
    
    async def _process_booking_search(self, customer: Customer, text: str) -> Dict:
        """Process booking search query"""
        
        search_type = customer.context.get("search_type")
        
        if search_type == "flight":
            # Parse flight search details
            search_params = await self.nlp_processor.parse_flight_search(text)
            
            # Perform search (mock results for now)
            results = [
                {
                    "airline": "Spirit Airlines",
                    "flight": "SP123",
                    "departure": "JFK 10:00 AM",
                    "arrival": "LHR 10:00 PM",
                    "price": "$450"
                },
                {
                    "airline": "United Airlines",
                    "flight": "UA456",
                    "departure": "JFK 2:00 PM",
                    "arrival": "LHR 2:00 AM",
                    "price": "$520"
                }
            ]
            
            # Send results as interactive message
            result_text = "Here are available flights:\n\n"
            for i, flight in enumerate(results, 1):
                result_text += f"{i}. {flight['airline']} {flight['flight']}\n"
                result_text += f"   {flight['departure']} → {flight['arrival']}\n"
                result_text += f"   Price: {flight['price']}\n\n"
            
            await self.api.send_message(
                customer.phone_number,
                MessageType.TEXT,
                result_text
            )
            
            # Send booking options
            await self.api.send_interactive_message(
                customer.phone_number,
                "button",
                {
                    "body_text": "Would you like to book one of these flights?",
                    "action": {
                        "buttons": [
                            {"type": "reply", "reply": {"id": "book_1", "title": "Book Flight 1"}},
                            {"type": "reply", "reply": {"id": "book_2", "title": "Book Flight 2"}},
                            {"type": "reply", "reply": {"id": "search_again", "title": "Search Again"}}
                        ]
                    }
                }
            )
            
            customer.conversation_state = ConversationState.BOOKING_DETAILS
            
        return {"status": "search_results_sent"}
    
    async def _show_customer_bookings(self, customer: Customer) -> Dict:
        """Show customer's bookings"""
        
        # Mock booking data
        bookings = [
            {
                "id": "BK123456",
                "type": "Flight",
                "details": "NYC → London, Dec 15",
                "status": "Confirmed"
            },
            {
                "id": "BK123457",
                "type": "Hotel",
                "details": "Hilton London, Dec 15-22",
                "status": "Confirmed"
            }
        ]
        
        if bookings:
            booking_text = "Your current bookings:\n\n"
            for booking in bookings:
                booking_text += f"📋 {booking['id']}\n"
                booking_text += f"Type: {booking['type']}\n"
                booking_text += f"Details: {booking['details']}\n"
                booking_text += f"Status: ✅ {booking['status']}\n\n"
            
            await self.api.send_message(
                customer.phone_number,
                MessageType.TEXT,
                booking_text
            )
        else:
            await self.api.send_message(
                customer.phone_number,
                MessageType.TEXT,
                "You don't have any active bookings. Would you like to make a new booking?"
            )
        
        # Return to main menu
        await self._send_main_menu(customer)
        
        return {"status": "bookings_shown"}
    
    async def _start_support_conversation(self, customer: Customer) -> Dict:
        """Start support conversation"""
        
        await self.api.send_message(
            customer.phone_number,
            MessageType.TEXT,
            "I'm here to help! 💬\n\nPlease describe your issue or question, and I'll assist you right away.\n\nFor urgent matters, you can also call our 24/7 support line: +1-800-SPIRIT-1"
        )
        
        customer.conversation_state = ConversationState.SUPPORT
        
        return {"status": "support_started"}
    
    async def _process_support_query(self, customer: Customer, query: str) -> Dict:
        """Process support query"""
        
        # Analyze query for common issues
        if "cancel" in query.lower() or "refund" in query.lower():
            response = (
                "For cancellations and refunds:\n\n"
                "1. Go to 'My Bookings' in the menu\n"
                "2. Select the booking to cancel\n"
                "3. Follow the cancellation process\n\n"
                "Refunds are processed within 7-10 business days according to our policy."
            )
        elif "change" in query.lower() or "modify" in query.lower():
            response = (
                "To change your booking:\n\n"
                "1. Go to 'My Bookings'\n"
                "2. Select 'Modify Booking'\n"
                "3. Make your changes\n\n"
                "Note: Change fees may apply depending on the fare type."
            )
        else:
            response = (
                "Thank you for your query. I've noted your issue and our support team "
                "will assist you shortly.\n\n"
                "For immediate assistance, please call: +1-800-SPIRIT-1"
            )
        
        await self.api.send_message(
            customer.phone_number,
            MessageType.TEXT,
            response
        )
        
        # Return to main menu
        await self._send_main_menu(customer)
        
        return {"status": "support_query_processed"}
    
    async def _process_interactive_response(
        self,
        customer: Customer,
        interactive_data: Dict,
        message_id: str
    ) -> Dict:
        """Process interactive message response"""
        
        response_type = interactive_data.get("type")
        
        if response_type == "list_reply":
            selection = interactive_data["list_reply"]["id"]
            return await self._process_menu_selection(customer, selection)
        
        elif response_type == "button_reply":
            selection = interactive_data["button_reply"]["id"]
            
            if selection.startswith("book_"):
                # Process booking selection
                await self.api.send_message(
                    customer.phone_number,
                    MessageType.TEXT,
                    "Great choice! I'll help you complete this booking. Please provide passenger details..."
                )
                customer.conversation_state = ConversationState.PAYMENT
            
            return {"status": "button_processed"}
        
        return {"status": "interactive_processed"}
    
    async def _process_location_message(
        self,
        customer: Customer,
        location: Dict,
        message_id: str
    ) -> Dict:
        """Process location message"""
        
        lat = location["latitude"]
        lng = location["longitude"]
        
        await self.api.send_message(
            customer.phone_number,
            MessageType.TEXT,
            f"Thanks for sharing your location! I can help you find nearby airports, hotels, or attractions."
        )
        
        # Could integrate with location-based services here
        
        return {"status": "location_processed"}
    
    async def _send_unsupported_message_type(self, customer: Customer) -> Dict:
        """Send message for unsupported message types"""
        
        await self.api.send_message(
            customer.phone_number,
            MessageType.TEXT,
            "I can only process text messages, locations, and menu selections at this time. Please type your request or use the menu options."
        )
        
        await self._send_main_menu(customer)
        
        return {"status": "unsupported_type_handled"}


class WhatsAppNLPProcessor:
    """Natural Language Processing for WhatsApp messages"""
    
    async def analyze_intent(self, text: str) -> Dict:
        """Analyze user intent from text"""
        text_lower = text.lower()
        
        # Define intent patterns
        intents = {
            "greeting": ["hi", "hello", "hey", "good morning", "good evening"],
            "booking": ["book", "reserve", "reservation", "buy"],
            "search": ["search", "find", "look for", "show me"],
            "cancel": ["cancel", "refund", "cancellation"],
            "support": ["help", "support", "assist", "problem", "issue"],
            "status": ["status", "where is", "track", "check"],
            "goodbye": ["bye", "goodbye", "thanks", "thank you"]
        }
        
        detected_intent = "unknown"
        confidence = 0.0
        
        for intent, keywords in intents.items():
            for keyword in keywords:
                if keyword in text_lower:
                    detected_intent = intent
                    confidence = 0.8
                    break
        
        return {
            "intent": detected_intent,
            "confidence": confidence,
            "entities": await self._extract_entities(text)
        }
    
    async def _extract_entities(self, text: str) -> Dict:
        """Extract entities from text"""
        entities = {}
        
        # Extract dates
        import re
        date_pattern = r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b'
        dates = re.findall(date_pattern, text)
        if dates:
            entities["dates"] = dates
        
        # Extract cities (simplified)
        cities = ["New York", "London", "Paris", "Tokyo", "Dubai", "Singapore"]
        for city in cities:
            if city.lower() in text.lower():
                if "cities" not in entities:
                    entities["cities"] = []
                entities["cities"].append(city)
        
        # Extract numbers
        numbers = re.findall(r'\b\d+\b', text)
        if numbers:
            entities["numbers"] = numbers
        
        return entities
    
    async def parse_flight_search(self, text: str) -> Dict:
        """Parse flight search parameters from text"""
        entities = await self._extract_entities(text)
        
        search_params = {
            "origin": entities.get("cities", [""])[0] if entities.get("cities") else None,
            "destination": entities.get("cities", ["", ""])[1] if len(entities.get("cities", [])) > 1 else None,
            "departure_date": entities.get("dates", [""])[0] if entities.get("dates") else None,
            "return_date": entities.get("dates", ["", ""])[1] if len(entities.get("dates", [])) > 1 else None,
            "passengers": int(entities.get("numbers", [1])[0]) if entities.get("numbers") else 1
        }
        
        return search_params


# Export classes
__all__ = [
    'MessageType',
    'MessageStatus',
    'ConversationState',
    'Customer',
    'WhatsAppMessage',
    'WhatsAppBusinessAPI',
    'WhatsAppBot',
    'WhatsAppNLPProcessor'
]