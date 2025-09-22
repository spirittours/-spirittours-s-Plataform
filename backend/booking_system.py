#!/usr/bin/env python3
"""
Spirit Tours - Enhanced Booking System
Sistema Avanzado de Reservas Online con IA

Sistema completo de reservas que incluye:
- Gestión de inventario en tiempo real
- Procesamiento de pagos integrado  
- Optimización de conversiones con IA
- Recomendaciones personalizadas
- Confirmación automática y comunicación

Author: Spirit Tours AI Development Team
Version: 2.0.0
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, field
from enum import Enum
import uuid
from decimal import Decimal
import aiohttp
import pandas as pd
import numpy as np
from pydantic import BaseModel, Field, validator
import redis.asyncio as redis
import hashlib
from collections import defaultdict, Counter
import math
import statistics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BookingStatus(Enum):
    """Estados de reserva"""
    PENDING = "pending"
    CONFIRMED = "confirmed" 
    PAID = "paid"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    REFUNDED = "refunded"
    NO_SHOW = "no_show"

class PaymentStatus(Enum):
    """Estados de pago"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"

class PaymentMethod(Enum):
    """Métodos de pago soportados"""
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    BANK_TRANSFER = "bank_transfer"
    KLARNA = "klarna"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"

class TourType(Enum):
    """Tipos de tour disponibles"""
    CITY_TOUR = "city_tour"
    CULTURAL = "cultural"
    ADVENTURE = "adventure"
    GASTRONOMY = "gastronomy"
    NATURE = "nature"
    HISTORICAL = "historical"
    FAMILY = "family"
    LUXURY = "luxury"
    BUDGET = "budget"
    MULTI_DAY = "multi_day"

@dataclass
class Customer:
    """Información del cliente"""
    customer_id: str
    email: str
    first_name: str
    last_name: str
    phone: str
    country: str
    language: str = "es"
    marketing_consent: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    total_bookings: int = 0
    total_spent: Decimal = field(default_factory=lambda: Decimal('0.00'))
    loyalty_tier: str = "bronze"  # bronze, silver, gold, platinum
    preferences: Dict[str, Any] = field(default_factory=dict)

@dataclass  
class TourProduct:
    """Producto turístico"""
    product_id: str
    name: str
    description: str
    tour_type: TourType
    destination: str
    duration_hours: int
    max_participants: int
    base_price: Decimal
    currency: str = "EUR"
    included_services: List[str] = field(default_factory=list)
    excluded_services: List[str] = field(default_factory=list)
    meeting_point: str = ""
    pickup_available: bool = False
    cancellation_hours: int = 48
    languages: List[str] = field(default_factory=lambda: ["es"])
    difficulty_level: str = "easy"  # easy, moderate, hard
    age_restrictions: Dict[str, int] = field(default_factory=dict)
    seasonal_availability: Dict[str, bool] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    rating: float = 0.0
    review_count: int = 0
    created_at: datetime = field(default_factory=datetime.now)
    active: bool = True

@dataclass
class InventorySlot:
    """Slot de inventario para un tour específico"""
    slot_id: str
    product_id: str
    date: datetime
    time: str
    available_spots: int
    total_spots: int
    price_modifier: float = 1.0  # Multiplicador del precio base
    special_offer: Optional[str] = None
    guide_id: Optional[str] = None
    weather_dependent: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)

@dataclass
class CartItem:
    """Item en el carrito de compras"""
    cart_item_id: str
    product_id: str
    slot_id: str
    participants: int
    unit_price: Decimal
    total_price: Decimal
    special_requests: str = ""
    participant_details: List[Dict[str, Any]] = field(default_factory=list)
    added_at: datetime = field(default_factory=datetime.now)
    expires_at: datetime = field(default_factory=lambda: datetime.now() + timedelta(minutes=30))

@dataclass
class ShoppingCart:
    """Carrito de compras"""
    cart_id: str
    customer_id: str
    items: List[CartItem] = field(default_factory=list)
    subtotal: Decimal = field(default_factory=lambda: Decimal('0.00'))
    taxes: Decimal = field(default_factory=lambda: Decimal('0.00'))
    discounts: Decimal = field(default_factory=lambda: Decimal('0.00'))
    total: Decimal = field(default_factory=lambda: Decimal('0.00'))
    currency: str = "EUR"
    coupon_code: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    expires_at: datetime = field(default_factory=lambda: datetime.now() + timedelta(hours=2))

@dataclass  
class PaymentDetails:
    """Detalles del pago"""
    payment_id: str
    booking_id: str
    amount: Decimal
    currency: str
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    transaction_id: Optional[str] = None
    gateway_response: Dict[str, Any] = field(default_factory=dict)
    processed_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class Booking:
    """Reserva completa"""
    booking_id: str
    customer_id: str
    booking_reference: str
    cart_id: str
    items: List[CartItem]
    total_amount: Decimal
    currency: str
    booking_status: BookingStatus
    payment_details: Optional[PaymentDetails] = None
    contact_info: Dict[str, str] = field(default_factory=dict)
    special_requests: str = ""
    cancellation_policy: Dict[str, Any] = field(default_factory=dict)
    confirmation_sent: bool = False
    reminder_sent: bool = False
    feedback_requested: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    confirmed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

@dataclass
class BookingAnalytics:
    """Analytics de reserva para optimización"""
    session_id: str
    customer_id: Optional[str]
    source_channel: str  # web, mobile, api, partner
    device_type: str  # desktop, mobile, tablet
    user_agent: str = ""
    referrer_url: str = ""
    landing_page: str = ""
    search_terms: List[str] = field(default_factory=list)
    viewed_products: List[str] = field(default_factory=list)
    cart_additions: List[Dict[str, Any]] = field(default_factory=list)
    cart_removals: List[Dict[str, Any]] = field(default_factory=list)
    checkout_steps: List[Dict[str, Any]] = field(default_factory=list)
    abandonment_point: Optional[str] = None
    conversion_funnel: Dict[str, Any] = field(default_factory=dict)
    session_duration: int = 0  # seconds
    created_at: datetime = field(default_factory=datetime.now)

class BookingEngine:
    """Motor de reservas avanzado"""
    
    def __init__(self):
        self.redis_client = None
        self.products = {}  # product_id -> TourProduct
        self.inventory = {}  # slot_id -> InventorySlot  
        self.customers = {}  # customer_id -> Customer
        self.carts = {}  # cart_id -> ShoppingCart
        self.bookings = {}  # booking_id -> Booking
        self.analytics = {}  # session_id -> BookingAnalytics
        
        # Configuration
        self.tax_rate = Decimal('0.21')  # 21% IVA España
        self.cart_expiry_minutes = 30
        self.inventory_hold_minutes = 15
        self.max_participants_per_booking = 20
        
        # Loyalty discounts
        self.loyalty_discounts = {
            "bronze": Decimal('0.00'),  # 0%
            "silver": Decimal('0.05'),  # 5%
            "gold": Decimal('0.10'),    # 10%
            "platinum": Decimal('0.15') # 15%
        }
        
        # Dynamic pricing factors
        self.demand_multipliers = {
            "very_low": 0.85,   # 15% discount
            "low": 0.95,        # 5% discount  
            "normal": 1.0,      # base price
            "high": 1.15,       # 15% premium
            "very_high": 1.30   # 30% premium
        }
        
    async def initialize(self):
        """Inicializa el motor de reservas"""
        try:
            # Initialize Redis for caching and session management
            self.redis_client = redis.Redis(
                host='localhost',
                port=6379,
                decode_responses=True
            )
            
            await self.redis_client.ping()
            
            # Initialize sample data
            await self._initialize_sample_data()
            
            logger.info("Booking Engine initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Booking Engine: {str(e)}")
            return False
    
    async def _initialize_sample_data(self):
        """Inicializa datos de muestra para demostración"""
        
        # Sample tour products
        sample_products = [
            TourProduct(
                product_id="madrid_city_001",
                name="Madrid City Tour Completo", 
                description="Tour completo por los principales atractivos de Madrid: Prado, Retiro, Palacio Real, y centro histórico. Incluye guía experto y transporte.",
                tour_type=TourType.CITY_TOUR,
                destination="Madrid",
                duration_hours=6,
                max_participants=15,
                base_price=Decimal('75.00'),
                included_services=["Guía certificado", "Transporte", "Entradas museos", "Snack"],
                excluded_services=["Comida", "Propinas", "Gastos personales"],
                meeting_point="Puerta del Sol",
                pickup_available=True,
                cancellation_hours=24,
                languages=["es", "en", "fr"],
                difficulty_level="easy",
                age_restrictions={"min_age": 0, "max_age": 99},
                tags=["madrid", "cultura", "historia", "museos", "ciudad"]
            ),
            
            TourProduct(
                product_id="flamenco_exp_002",
                name="Experiencia Flamenco Auténtica",
                description="Noche de flamenco en tablao tradicional con cena incluida. Espectáculo de 2 horas con artistas de primera línea y menú gastronómico.",
                tour_type=TourType.CULTURAL,
                destination="Madrid",
                duration_hours=4,
                max_participants=25,
                base_price=Decimal('95.00'),
                included_services=["Espectáculo flamenco", "Cena 3 platos", "Copa de bienvenida"],
                excluded_services=["Transporte", "Bebidas adicionales"],
                meeting_point="Tablao Villa Rosa",
                pickup_available=False,
                cancellation_hours=48,
                languages=["es", "en"],
                difficulty_level="easy",
                age_restrictions={"min_age": 12, "max_age": 99},
                tags=["flamenco", "cultura", "cena", "espectáculo", "tradición"]
            ),
            
            TourProduct(
                product_id="gastro_tour_003",
                name="Tour Gastronómico Gourmet",
                description="Descubre la gastronomía madrileña visitando mercados locales, tabernas centenarias y restaurantes de vanguardia. Degustaciones incluidas.",
                tour_type=TourType.GASTRONOMY,
                destination="Madrid", 
                duration_hours=5,
                max_participants=12,
                base_price=Decimal('120.00'),
                included_services=["Degustaciones", "Guía gastronómico", "Bebidas", "Recetas"],
                excluded_services=["Comida completa", "Transporte"],
                meeting_point="Mercado de San Miguel",
                pickup_available=False,
                cancellation_hours=48,
                languages=["es", "en"],
                difficulty_level="easy", 
                age_restrictions={"min_age": 18, "max_age": 99},
                tags=["gastronomía", "comida", "mercado", "degustación", "local"]
            )
        ]
        
        # Add products
        for product in sample_products:
            self.products[product.product_id] = product
        
        # Create inventory slots (next 30 days)
        await self._create_sample_inventory()
        
        logger.info(f"Initialized {len(sample_products)} sample products and inventory")
    
    async def _create_sample_inventory(self):
        """Crea inventario de muestra para los próximos días"""
        
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        for product_id, product in self.products.items():
            # Create slots for next 30 days
            for days_ahead in range(30):
                date = today + timedelta(days=days_ahead)
                
                # Different schedules by tour type
                if product.tour_type == TourType.CITY_TOUR:
                    times = ["09:00", "14:00"]
                elif product.tour_type == TourType.CULTURAL:
                    times = ["20:00", "22:00"] 
                elif product.tour_type == TourType.GASTRONOMY:
                    times = ["11:00", "17:00"]
                else:
                    times = ["10:00", "15:00"]
                
                for time_slot in times:
                    # Skip past times for today
                    if days_ahead == 0:
                        slot_datetime = datetime.strptime(f"{date.strftime('%Y-%m-%d')} {time_slot}", '%Y-%m-%d %H:%M')
                        if slot_datetime < datetime.now():
                            continue
                    
                    slot_id = f"{product_id}_{date.strftime('%Y%m%d')}_{time_slot.replace(':', '')}"
                    
                    # Dynamic pricing based on demand simulation
                    price_modifier = self._calculate_demand_modifier(date, product.tour_type)
                    
                    inventory_slot = InventorySlot(
                        slot_id=slot_id,
                        product_id=product_id,
                        date=date,
                        time=time_slot,
                        available_spots=product.max_participants,
                        total_spots=product.max_participants,
                        price_modifier=price_modifier
                    )
                    
                    self.inventory[slot_id] = inventory_slot
    
    def _calculate_demand_modifier(self, date: datetime, tour_type: TourType) -> float:
        """Calcula modificador de precio basado en demanda simulada"""
        
        # Weekend premium
        modifier = 1.0
        if date.weekday() >= 5:  # Saturday, Sunday
            modifier += 0.1
        
        # Holiday seasons (simplified)
        month = date.month
        if month in [7, 8, 12]:  # Summer and Christmas
            modifier += 0.15
        elif month in [4, 5, 9, 10]:  # Spring and Fall  
            modifier += 0.05
        
        # Tour type specific demand
        if tour_type == TourType.CULTURAL:
            if date.weekday() >= 4:  # Friday-Sunday
                modifier += 0.1
        elif tour_type == TourType.GASTRONOMY:
            if date.weekday() in [4, 5, 6]:  # Friday-Sunday
                modifier += 0.15
        
        return round(modifier, 2)
    
    async def search_products(self, 
                             destination: Optional[str] = None,
                             tour_type: Optional[TourType] = None,
                             date: Optional[datetime] = None,
                             participants: int = 1,
                             max_price: Optional[Decimal] = None,
                             tags: List[str] = None) -> List[Dict[str, Any]]:
        """Busca productos turísticos disponibles"""
        
        try:
            results = []
            
            for product in self.products.values():
                # Apply filters
                if destination and destination.lower() not in product.destination.lower():
                    continue
                
                if tour_type and product.tour_type != tour_type:
                    continue
                
                if participants > product.max_participants:
                    continue
                
                if not product.active:
                    continue
                
                # Check availability for specific date
                available_slots = []
                if date:
                    date_slots = [
                        slot for slot in self.inventory.values()
                        if (slot.product_id == product.product_id and 
                            slot.date.date() == date.date() and
                            slot.available_spots >= participants)
                    ]
                    available_slots = date_slots
                else:
                    # Get next available slots (next 7 days)
                    today = datetime.now().date()
                    week_ahead = today + timedelta(days=7)
                    
                    available_slots = [
                        slot for slot in self.inventory.values()
                        if (slot.product_id == product.product_id and
                            today <= slot.date.date() <= week_ahead and
                            slot.available_spots >= participants)
                    ]
                
                if not available_slots:
                    continue
                
                # Calculate price with modifiers
                base_price = product.base_price
                min_price = min([base_price * Decimal(str(slot.price_modifier)) 
                               for slot in available_slots])
                
                if max_price and min_price > max_price:
                    continue
                
                # Tag filtering
                if tags:
                    product_tags_lower = [tag.lower() for tag in product.tags]
                    if not any(tag.lower() in product_tags_lower for tag in tags):
                        continue
                
                # Build result
                result = {
                    'product_id': product.product_id,
                    'name': product.name,
                    'description': product.description,
                    'tour_type': product.tour_type.value,
                    'destination': product.destination,
                    'duration_hours': product.duration_hours,
                    'base_price': float(product.base_price),
                    'min_price': float(min_price),
                    'currency': product.currency,
                    'max_participants': product.max_participants,
                    'included_services': product.included_services,
                    'meeting_point': product.meeting_point,
                    'pickup_available': product.pickup_available,
                    'cancellation_hours': product.cancellation_hours,
                    'languages': product.languages,
                    'difficulty_level': product.difficulty_level,
                    'tags': product.tags,
                    'rating': product.rating,
                    'review_count': product.review_count,
                    'available_slots': len(available_slots),
                    'next_available_date': min([slot.date for slot in available_slots]).isoformat() if available_slots else None
                }
                
                results.append(result)
            
            # Sort by relevance (rating, availability, price)
            results.sort(key=lambda x: (
                -x['rating'],  # Higher rating first
                -x['available_slots'],  # More availability first 
                x['min_price']  # Lower price first
            ))
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching products: {str(e)}")
            return []
    
    async def get_product_availability(self, product_id: str, 
                                     start_date: datetime,
                                     end_date: datetime) -> List[Dict[str, Any]]:
        """Obtiene disponibilidad de un producto en un rango de fechas"""
        
        try:
            if product_id not in self.products:
                return []
            
            product = self.products[product_id]
            availability = []
            
            # Get slots in date range
            relevant_slots = [
                slot for slot in self.inventory.values()
                if (slot.product_id == product_id and
                    start_date.date() <= slot.date.date() <= end_date.date())
            ]
            
            # Group by date
            slots_by_date = defaultdict(list)
            for slot in relevant_slots:
                slots_by_date[slot.date.date()].append(slot)
            
            # Build availability response
            for date, slots in slots_by_date.items():
                date_availability = {
                    'date': date.isoformat(),
                    'slots': []
                }
                
                for slot in sorted(slots, key=lambda s: s.time):
                    slot_info = {
                        'slot_id': slot.slot_id,
                        'time': slot.time,
                        'available_spots': slot.available_spots,
                        'total_spots': slot.total_spots,
                        'price': float(product.base_price * Decimal(str(slot.price_modifier))),
                        'currency': product.currency,
                        'special_offer': slot.special_offer,
                        'guide_assigned': slot.guide_id is not None
                    }
                    
                    date_availability['slots'].append(slot_info)
                
                availability.append(date_availability)
            
            return sorted(availability, key=lambda x: x['date'])
            
        except Exception as e:
            logger.error(f"Error getting availability for {product_id}: {str(e)}")
            return []
    
    async def create_or_get_customer(self, customer_data: Dict[str, Any]) -> Customer:
        """Crea o obtiene un cliente existente"""
        
        try:
            # Check if customer exists by email
            existing_customer = None
            for customer in self.customers.values():
                if customer.email == customer_data['email']:
                    existing_customer = customer
                    break
            
            if existing_customer:
                # Update customer data if needed
                for key, value in customer_data.items():
                    if hasattr(existing_customer, key) and value:
                        setattr(existing_customer, key, value)
                return existing_customer
            
            # Create new customer
            customer_id = str(uuid.uuid4())
            customer = Customer(
                customer_id=customer_id,
                email=customer_data['email'],
                first_name=customer_data.get('first_name', ''),
                last_name=customer_data.get('last_name', ''),
                phone=customer_data.get('phone', ''),
                country=customer_data.get('country', 'ES'),
                language=customer_data.get('language', 'es'),
                marketing_consent=customer_data.get('marketing_consent', False),
                preferences=customer_data.get('preferences', {})
            )
            
            self.customers[customer_id] = customer
            logger.info(f"New customer created: {customer_id}")
            
            return customer
            
        except Exception as e:
            logger.error(f"Error creating/getting customer: {str(e)}")
            raise
    
    async def create_cart(self, customer_id: str) -> ShoppingCart:
        """Crea un nuevo carrito de compras"""
        
        try:
            cart_id = str(uuid.uuid4())
            cart = ShoppingCart(
                cart_id=cart_id,
                customer_id=customer_id
            )
            
            self.carts[cart_id] = cart
            
            # Cache cart in Redis with expiration
            if self.redis_client:
                await self.redis_client.setex(
                    f"cart:{cart_id}",
                    self.cart_expiry_minutes * 60,
                    json.dumps({
                        'cart_id': cart_id,
                        'customer_id': customer_id,
                        'created_at': cart.created_at.isoformat()
                    })
                )
            
            logger.info(f"New cart created: {cart_id}")
            return cart
            
        except Exception as e:
            logger.error(f"Error creating cart: {str(e)}")
            raise
    
    async def add_to_cart(self, cart_id: str, product_id: str, slot_id: str, 
                         participants: int, participant_details: List[Dict] = None) -> bool:
        """Añade un producto al carrito"""
        
        try:
            if cart_id not in self.carts:
                logger.error(f"Cart not found: {cart_id}")
                return False
            
            if product_id not in self.products:
                logger.error(f"Product not found: {product_id}")
                return False
            
            if slot_id not in self.inventory:
                logger.error(f"Slot not found: {slot_id}")
                return False
            
            cart = self.carts[cart_id]
            product = self.products[product_id]
            slot = self.inventory[slot_id]
            
            # Check availability
            if slot.available_spots < participants:
                logger.error(f"Insufficient availability. Requested: {participants}, Available: {slot.available_spots}")
                return False
            
            # Check cart expiration
            if datetime.now() > cart.expires_at:
                logger.error(f"Cart expired: {cart_id}")
                return False
            
            # Calculate pricing
            unit_price = product.base_price * Decimal(str(slot.price_modifier))
            total_price = unit_price * participants
            
            # Create cart item
            cart_item_id = str(uuid.uuid4())
            cart_item = CartItem(
                cart_item_id=cart_item_id,
                product_id=product_id,
                slot_id=slot_id,
                participants=participants,
                unit_price=unit_price,
                total_price=total_price,
                participant_details=participant_details or []
            )
            
            # Add to cart
            cart.items.append(cart_item)
            
            # Hold inventory temporarily
            slot.available_spots -= participants
            
            # Recalculate cart totals
            await self._recalculate_cart_totals(cart)
            
            # Update cart expiration
            cart.updated_at = datetime.now()
            
            logger.info(f"Added to cart {cart_id}: {participants}x {product.name}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding to cart: {str(e)}")
            return False
    
    async def _recalculate_cart_totals(self, cart: ShoppingCart):
        """Recalcula los totales del carrito"""
        
        try:
            cart.subtotal = sum([item.total_price for item in cart.items])
            
            # Apply customer loyalty discount
            customer = self.customers.get(cart.customer_id)
            if customer:
                loyalty_discount = self.loyalty_discounts.get(customer.loyalty_tier, Decimal('0.00'))
                cart.discounts = cart.subtotal * loyalty_discount
            
            # Apply coupon if present
            if cart.coupon_code:
                coupon_discount = await self._apply_coupon(cart.coupon_code, cart.subtotal)
                cart.discounts += coupon_discount
            
            # Calculate taxes
            taxable_amount = cart.subtotal - cart.discounts
            cart.taxes = taxable_amount * self.tax_rate
            
            # Calculate total
            cart.total = cart.subtotal - cart.discounts + cart.taxes
            
        except Exception as e:
            logger.error(f"Error recalculating cart totals: {str(e)}")
    
    async def _apply_coupon(self, coupon_code: str, subtotal: Decimal) -> Decimal:
        """Aplica un cupón de descuento"""
        
        # Sample coupon logic
        coupons = {
            "WELCOME10": {"type": "percentage", "value": 0.10, "min_amount": Decimal('50.00')},
            "SUMMER25": {"type": "percentage", "value": 0.25, "min_amount": Decimal('100.00')},
            "FIXED20": {"type": "fixed", "value": Decimal('20.00'), "min_amount": Decimal('80.00')}
        }
        
        coupon = coupons.get(coupon_code.upper())
        if not coupon:
            return Decimal('0.00')
        
        if subtotal < coupon["min_amount"]:
            return Decimal('0.00')
        
        if coupon["type"] == "percentage":
            return subtotal * Decimal(str(coupon["value"]))
        elif coupon["type"] == "fixed":
            return min(coupon["value"], subtotal)
        
        return Decimal('0.00')
    
    async def get_cart(self, cart_id: str) -> Optional[Dict[str, Any]]:
        """Obtiene los detalles del carrito"""
        
        try:
            if cart_id not in self.carts:
                return None
            
            cart = self.carts[cart_id]
            
            # Check expiration
            if datetime.now() > cart.expires_at:
                # Release held inventory
                await self._release_cart_inventory(cart)
                del self.carts[cart_id]
                return None
            
            # Build cart response with product details
            cart_items = []
            for item in cart.items:
                product = self.products[item.product_id]
                slot = self.inventory[item.slot_id]
                
                cart_items.append({
                    'cart_item_id': item.cart_item_id,
                    'product_id': item.product_id,
                    'product_name': product.name,
                    'slot_id': item.slot_id,
                    'date': slot.date.isoformat(),
                    'time': slot.time,
                    'participants': item.participants,
                    'unit_price': float(item.unit_price),
                    'total_price': float(item.total_price),
                    'currency': cart.currency,
                    'participant_details': item.participant_details,
                    'special_requests': item.special_requests,
                    'expires_at': item.expires_at.isoformat()
                })
            
            return {
                'cart_id': cart.cart_id,
                'customer_id': cart.customer_id,
                'items': cart_items,
                'subtotal': float(cart.subtotal),
                'taxes': float(cart.taxes),
                'discounts': float(cart.discounts),
                'total': float(cart.total),
                'currency': cart.currency,
                'coupon_code': cart.coupon_code,
                'items_count': len(cart.items),
                'total_participants': sum([item.participants for item in cart.items]),
                'expires_at': cart.expires_at.isoformat(),
                'created_at': cart.created_at.isoformat(),
                'updated_at': cart.updated_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting cart {cart_id}: {str(e)}")
            return None
    
    async def _release_cart_inventory(self, cart: ShoppingCart):
        """Libera el inventario retenido por un carrito"""
        
        try:
            for item in cart.items:
                if item.slot_id in self.inventory:
                    slot = self.inventory[item.slot_id]
                    slot.available_spots += item.participants
                    logger.info(f"Released {item.participants} spots for slot {item.slot_id}")
        
        except Exception as e:
            logger.error(f"Error releasing cart inventory: {str(e)}")
    
    async def remove_from_cart(self, cart_id: str, cart_item_id: str) -> bool:
        """Remueve un item del carrito"""
        
        try:
            if cart_id not in self.carts:
                return False
            
            cart = self.carts[cart_id]
            
            # Find and remove item
            item_to_remove = None
            for item in cart.items:
                if item.cart_item_id == cart_item_id:
                    item_to_remove = item
                    break
            
            if not item_to_remove:
                return False
            
            # Release inventory
            if item_to_remove.slot_id in self.inventory:
                slot = self.inventory[item_to_remove.slot_id]
                slot.available_spots += item_to_remove.participants
            
            # Remove from cart
            cart.items.remove(item_to_remove)
            
            # Recalculate totals
            await self._recalculate_cart_totals(cart)
            
            # Update timestamp
            cart.updated_at = datetime.now()
            
            logger.info(f"Removed item {cart_item_id} from cart {cart_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error removing from cart: {str(e)}")
            return False
    
    async def apply_coupon_to_cart(self, cart_id: str, coupon_code: str) -> bool:
        """Aplica un cupón al carrito"""
        
        try:
            if cart_id not in self.carts:
                return False
            
            cart = self.carts[cart_id]
            cart.coupon_code = coupon_code
            
            # Recalculate with coupon
            await self._recalculate_cart_totals(cart)
            cart.updated_at = datetime.now()
            
            logger.info(f"Applied coupon {coupon_code} to cart {cart_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error applying coupon: {str(e)}")
            return False
    
    async def initiate_checkout(self, cart_id: str, 
                              contact_info: Dict[str, str],
                              payment_method: PaymentMethod) -> Optional[Dict[str, Any]]:
        """Inicia el proceso de checkout"""
        
        try:
            if cart_id not in self.carts:
                logger.error(f"Cart not found for checkout: {cart_id}")
                return None
            
            cart = self.carts[cart_id]
            
            # Validate cart
            if not cart.items:
                logger.error(f"Empty cart for checkout: {cart_id}")
                return None
            
            if datetime.now() > cart.expires_at:
                logger.error(f"Expired cart for checkout: {cart_id}")
                return None
            
            # Final availability check
            for item in cart.items:
                slot = self.inventory.get(item.slot_id)
                if not slot or slot.available_spots < 0:
                    logger.error(f"Inventory conflict for slot {item.slot_id}")
                    return None
            
            # Generate booking reference
            booking_reference = self._generate_booking_reference()
            
            # Create booking
            booking_id = str(uuid.uuid4())
            booking = Booking(
                booking_id=booking_id,
                customer_id=cart.customer_id,
                booking_reference=booking_reference,
                cart_id=cart_id,
                items=cart.items.copy(),
                total_amount=cart.total,
                currency=cart.currency,
                booking_status=BookingStatus.PENDING,
                contact_info=contact_info
            )
            
            # Create payment details
            payment_id = str(uuid.uuid4())
            payment_details = PaymentDetails(
                payment_id=payment_id,
                booking_id=booking_id,
                amount=cart.total,
                currency=cart.currency,
                payment_method=payment_method,
                payment_status=PaymentStatus.PENDING
            )
            
            booking.payment_details = payment_details
            
            # Store booking
            self.bookings[booking_id] = booking
            
            # Simulate payment processing
            payment_result = await self._process_payment(payment_details)
            
            if payment_result['success']:
                # Confirm booking
                booking.booking_status = BookingStatus.CONFIRMED
                booking.confirmed_at = datetime.now()
                
                payment_details.payment_status = PaymentStatus.COMPLETED
                payment_details.transaction_id = payment_result['transaction_id']
                payment_details.processed_at = datetime.now()
                
                # Update customer stats
                customer = self.customers[cart.customer_id]
                customer.total_bookings += 1
                customer.total_spent += cart.total
                
                # Update loyalty tier based on spending
                await self._update_customer_loyalty_tier(customer)
                
                # Remove cart
                del self.carts[cart_id]
                
                # Send confirmation (simulated)
                await self._send_booking_confirmation(booking)
                
                logger.info(f"Booking confirmed: {booking_reference}")
                
                return {
                    'success': True,
                    'booking_id': booking_id,
                    'booking_reference': booking_reference,
                    'payment_id': payment_id,
                    'transaction_id': payment_result['transaction_id'],
                    'total_amount': float(cart.total),
                    'currency': cart.currency,
                    'confirmation_sent': True
                }
            else:
                # Payment failed
                booking.booking_status = BookingStatus.CANCELLED
                payment_details.payment_status = PaymentStatus.FAILED
                
                # Release inventory
                await self._release_cart_inventory(cart)
                
                logger.error(f"Payment failed for booking: {booking_reference}")
                
                return {
                    'success': False,
                    'error': 'Payment processing failed',
                    'booking_id': booking_id,
                    'booking_reference': booking_reference
                }
            
        except Exception as e:
            logger.error(f"Error in checkout process: {str(e)}")
            return None
    
    def _generate_booking_reference(self) -> str:
        """Genera una referencia única de reserva"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M')
        random_suffix = str(uuid.uuid4()).split('-')[0].upper()
        return f"ST{timestamp}{random_suffix}"
    
    async def _process_payment(self, payment_details: PaymentDetails) -> Dict[str, Any]:
        """Procesa el pago (simulado)"""
        
        # Simulate payment gateway processing
        await asyncio.sleep(2)  # Simulate processing time
        
        # Simulate 95% success rate
        import random
        success = random.random() < 0.95
        
        if success:
            transaction_id = f"TXN_{str(uuid.uuid4()).replace('-', '').upper()[:12]}"
            return {
                'success': True,
                'transaction_id': transaction_id,
                'gateway_response': {
                    'status': 'approved',
                    'auth_code': f"AUTH{random.randint(100000, 999999)}",
                    'processed_at': datetime.now().isoformat()
                }
            }
        else:
            return {
                'success': False,
                'error': 'Payment declined',
                'gateway_response': {
                    'status': 'declined',
                    'error_code': 'CARD_DECLINED',
                    'processed_at': datetime.now().isoformat()
                }
            }
    
    async def _update_customer_loyalty_tier(self, customer: Customer):
        """Actualiza el tier de lealtad del cliente"""
        
        total_spent = customer.total_spent
        
        if total_spent >= Decimal('2000'):
            customer.loyalty_tier = "platinum"
        elif total_spent >= Decimal('1000'):
            customer.loyalty_tier = "gold"
        elif total_spent >= Decimal('500'):
            customer.loyalty_tier = "silver"
        else:
            customer.loyalty_tier = "bronze"
    
    async def _send_booking_confirmation(self, booking: Booking):
        """Envía confirmación de reserva (simulado)"""
        
        # In a real system, this would send email/SMS
        logger.info(f"Confirmation sent for booking: {booking.booking_reference}")
        
        customer = self.customers[booking.customer_id]
        confirmation_data = {
            'booking_reference': booking.booking_reference,
            'customer_email': customer.email,
            'customer_name': f"{customer.first_name} {customer.last_name}",
            'total_amount': float(booking.total_amount),
            'currency': booking.currency,
            'items': len(booking.items),
            'sent_at': datetime.now().isoformat()
        }
        
        booking.confirmation_sent = True
        
        # Cache confirmation for future reference
        if self.redis_client:
            await self.redis_client.setex(
                f"confirmation:{booking.booking_reference}",
                86400 * 30,  # 30 days
                json.dumps(confirmation_data)
            )
    
    async def get_booking(self, booking_reference: str) -> Optional[Dict[str, Any]]:
        """Obtiene detalles de una reserva"""
        
        try:
            # Find booking by reference
            booking = None
            for b in self.bookings.values():
                if b.booking_reference == booking_reference:
                    booking = b
                    break
            
            if not booking:
                return None
            
            customer = self.customers[booking.customer_id]
            
            # Build booking items with product details
            booking_items = []
            for item in booking.items:
                product = self.products[item.product_id]
                slot = self.inventory[item.slot_id]
                
                booking_items.append({
                    'product_name': product.name,
                    'destination': product.destination,
                    'date': slot.date.isoformat(),
                    'time': slot.time,
                    'participants': item.participants,
                    'unit_price': float(item.unit_price),
                    'total_price': float(item.total_price),
                    'meeting_point': product.meeting_point,
                    'duration_hours': product.duration_hours,
                    'included_services': product.included_services,
                    'participant_details': item.participant_details
                })
            
            return {
                'booking_id': booking.booking_id,
                'booking_reference': booking.booking_reference,
                'booking_status': booking.booking_status.value,
                'customer': {
                    'name': f"{customer.first_name} {customer.last_name}",
                    'email': customer.email,
                    'phone': customer.phone
                },
                'contact_info': booking.contact_info,
                'items': booking_items,
                'total_amount': float(booking.total_amount),
                'currency': booking.currency,
                'payment_status': booking.payment_details.payment_status.value if booking.payment_details else 'unknown',
                'created_at': booking.created_at.isoformat(),
                'confirmed_at': booking.confirmed_at.isoformat() if booking.confirmed_at else None,
                'confirmation_sent': booking.confirmation_sent,
                'special_requests': booking.special_requests
            }
            
        except Exception as e:
            logger.error(f"Error getting booking {booking_reference}: {str(e)}")
            return None
    
    async def cancel_booking(self, booking_reference: str, reason: str = "") -> bool:
        """Cancela una reserva"""
        
        try:
            # Find booking
            booking = None
            for b in self.bookings.values():
                if b.booking_reference == booking_reference:
                    booking = b
                    break
            
            if not booking:
                logger.error(f"Booking not found: {booking_reference}")
                return False
            
            if booking.booking_status in [BookingStatus.CANCELLED, BookingStatus.COMPLETED]:
                logger.error(f"Cannot cancel booking in status: {booking.booking_status}")
                return False
            
            # Calculate cancellation policy
            now = datetime.now()
            earliest_tour_date = min([self.inventory[item.slot_id].date for item in booking.items])
            hours_until_tour = (earliest_tour_date - now).total_seconds() / 3600
            
            # Find the strictest cancellation policy among booked products
            min_cancellation_hours = min([
                self.products[item.product_id].cancellation_hours 
                for item in booking.items
            ])
            
            # Determine refund amount
            refund_percentage = 1.0  # Full refund by default
            if hours_until_tour < min_cancellation_hours:
                if hours_until_tour < min_cancellation_hours / 2:
                    refund_percentage = 0.0  # No refund
                else:
                    refund_percentage = 0.5  # 50% refund
            
            # Update booking status
            booking.booking_status = BookingStatus.CANCELLED
            
            # Process refund if applicable
            if refund_percentage > 0:
                refund_amount = booking.total_amount * Decimal(str(refund_percentage))
                
                # Create refund record (simplified)
                if booking.payment_details:
                    booking.payment_details.payment_status = PaymentStatus.REFUNDED
                
                logger.info(f"Refund processed: {float(refund_amount)} {booking.currency}")
            
            # Release inventory
            for item in booking.items:
                if item.slot_id in self.inventory:
                    slot = self.inventory[item.slot_id]
                    slot.available_spots += item.participants
            
            # Update customer stats
            customer = self.customers[booking.customer_id]
            if refund_percentage < 1.0:
                # Partial refund - adjust customer spending
                penalty = booking.total_amount * Decimal(str(1.0 - refund_percentage))
                # Don't reduce total_spent below 0
                customer.total_spent = max(Decimal('0.00'), customer.total_spent - penalty)
            
            logger.info(f"Booking cancelled: {booking_reference}, Refund: {refund_percentage*100}%")
            return True
            
        except Exception as e:
            logger.error(f"Error cancelling booking {booking_reference}: {str(e)}")
            return False
    
    async def get_booking_analytics(self) -> Dict[str, Any]:
        """Obtiene analytics del sistema de reservas"""
        
        try:
            total_bookings = len(self.bookings)
            total_customers = len(self.customers)
            total_revenue = sum([b.total_amount for b in self.bookings.values()])
            
            # Booking status distribution
            status_counts = Counter([b.booking_status for b in self.bookings.values()])
            
            # Popular products
            product_bookings = Counter()
            for booking in self.bookings.values():
                for item in booking.items:
                    product_bookings[item.product_id] += item.participants
            
            # Revenue by product
            product_revenue = defaultdict(Decimal)
            for booking in self.bookings.values():
                for item in booking.items:
                    product_revenue[item.product_id] += item.total_price
            
            # Conversion metrics (simplified)
            total_carts = len(self.carts) + total_bookings  # Approximate
            conversion_rate = (total_bookings / total_carts * 100) if total_carts > 0 else 0
            
            # Average metrics
            avg_booking_value = total_revenue / total_bookings if total_bookings > 0 else Decimal('0')
            avg_participants = sum([
                sum([item.participants for item in b.items]) 
                for b in self.bookings.values()
            ]) / total_bookings if total_bookings > 0 else 0
            
            return {
                'overview': {
                    'total_bookings': total_bookings,
                    'total_customers': total_customers,
                    'total_revenue': float(total_revenue),
                    'conversion_rate': round(conversion_rate, 2),
                    'avg_booking_value': float(avg_booking_value),
                    'avg_participants_per_booking': round(avg_participants, 1)
                },
                'booking_status': {
                    status.value: count for status, count in status_counts.items()
                },
                'popular_products': [
                    {
                        'product_id': product_id,
                        'product_name': self.products[product_id].name,
                        'total_participants': count,
                        'revenue': float(product_revenue[product_id])
                    }
                    for product_id, count in product_bookings.most_common(5)
                ],
                'inventory_status': {
                    'total_slots': len(self.inventory),
                    'available_slots': len([s for s in self.inventory.values() if s.available_spots > 0]),
                    'utilization_rate': len([s for s in self.inventory.values() if s.available_spots < s.total_spots]) / len(self.inventory) * 100 if self.inventory else 0
                },
                'customer_tiers': dict(Counter([c.loyalty_tier for c in self.customers.values()])),
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating booking analytics: {str(e)}")
            return {}


# Example usage and testing  
async def main():
    """Función de prueba del sistema de reservas"""
    
    # Initialize booking engine
    booking_engine = BookingEngine()
    
    if not await booking_engine.initialize():
        print("Failed to initialize booking engine")
        return
    
    print("🎯 Booking Engine initialized successfully!")
    
    # Test product search
    print("\n=== PRODUCT SEARCH TEST ===")
    products = await booking_engine.search_products(
        destination="Madrid",
        participants=2
    )
    
    print(f"Found {len(products)} products:")
    for product in products[:2]:
        print(f"- {product['name']}: €{product['min_price']} ({product['available_slots']} slots)")
    
    # Test customer creation and cart flow
    print("\n=== BOOKING FLOW TEST ===")
    
    # Create customer
    customer_data = {
        'email': 'test@example.com',
        'first_name': 'Juan',
        'last_name': 'García',
        'phone': '+34600123456',
        'country': 'ES'
    }
    
    customer = await booking_engine.create_or_get_customer(customer_data)
    print(f"Customer created: {customer.first_name} {customer.last_name}")
    
    # Create cart
    cart = await booking_engine.create_cart(customer.customer_id)
    print(f"Cart created: {cart.cart_id}")
    
    # Add product to cart
    if products:
        product_id = products[0]['product_id']
        
        # Get availability
        start_date = datetime.now() + timedelta(days=1)
        end_date = start_date + timedelta(days=7)
        
        availability = await booking_engine.get_product_availability(
            product_id, start_date, end_date
        )
        
        if availability and availability[0]['slots']:
            slot_id = availability[0]['slots'][0]['slot_id']
            
            success = await booking_engine.add_to_cart(
                cart.cart_id, product_id, slot_id, 2
            )
            
            if success:
                print(f"Added product to cart: {products[0]['name']}")
                
                # Get cart details
                cart_details = await booking_engine.get_cart(cart.cart_id)
                if cart_details:
                    print(f"Cart total: €{cart_details['total']} ({cart_details['items_count']} items)")
                
                # Test checkout
                contact_info = {
                    'email': customer.email,
                    'phone': customer.phone,
                    'emergency_contact': '+34600654321'
                }
                
                checkout_result = await booking_engine.initiate_checkout(
                    cart.cart_id, contact_info, PaymentMethod.CREDIT_CARD
                )
                
                if checkout_result and checkout_result['success']:
                    print(f"✅ Booking confirmed: {checkout_result['booking_reference']}")
                    
                    # Test booking retrieval
                    booking_details = await booking_engine.get_booking(
                        checkout_result['booking_reference']
                    )
                    
                    if booking_details:
                        print(f"Booking status: {booking_details['booking_status']}")
                        print(f"Items booked: {len(booking_details['items'])}")
                else:
                    print("❌ Checkout failed")
    
    # Test analytics
    print("\n=== ANALYTICS TEST ===")
    analytics = await booking_engine.get_booking_analytics()
    if analytics:
        print(f"Total bookings: {analytics['overview']['total_bookings']}")
        print(f"Total revenue: €{analytics['overview']['total_revenue']}")
        print(f"Conversion rate: {analytics['overview']['conversion_rate']}%")


if __name__ == "__main__":
    asyncio.run(main())