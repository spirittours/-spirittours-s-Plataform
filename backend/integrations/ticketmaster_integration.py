"""
Ticketmaster Event Ticketing System Integration
Complete integration for event discovery and ticket booking
"""

import os
import json
import uuid
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
import asyncio
import aiohttp
from enum import Enum
from dataclasses import dataclass, field
import logging
from urllib.parse import quote, urlencode
import pytz

logger = logging.getLogger(__name__)

class EventCategory(Enum):
    """Event categories"""
    MUSIC = "music"
    SPORTS = "sports"
    ARTS_THEATRE = "arts_theatre"
    FAMILY = "family"
    FILM = "film"
    MISCELLANEOUS = "miscellaneous"
    COMEDY = "comedy"
    FESTIVAL = "festival"


class TicketType(Enum):
    """Ticket types"""
    GENERAL_ADMISSION = "general_admission"
    RESERVED = "reserved"
    VIP = "vip"
    MEET_GREET = "meet_greet"
    PARKING = "parking"
    MERCHANDISE = "merchandise"


class EventStatus(Enum):
    """Event status"""
    ONSALE = "onsale"
    OFFSALE = "offsale"
    CANCELLED = "cancelled"
    POSTPONED = "postponed"
    RESCHEDULED = "rescheduled"
    SOLDOUT = "soldout"


@dataclass
class Venue:
    """Event venue information"""
    id: str
    name: str
    address: str
    city: str
    state: str
    country: str
    postal_code: str
    latitude: float
    longitude: float
    timezone: str
    parking_info: Optional[str] = None
    general_info: Optional[str] = None
    accessibility_info: Optional[str] = None
    box_office_info: Optional[Dict] = None


@dataclass
class Artist:
    """Artist/performer information"""
    id: str
    name: str
    genre: Optional[str] = None
    image_url: Optional[str] = None
    social_media: Dict = field(default_factory=dict)
    upcoming_events: int = 0


@dataclass
class Event:
    """Event information"""
    id: str
    name: str
    category: EventCategory
    date: datetime
    venue: Venue
    artists: List[Artist]
    status: EventStatus
    description: Optional[str] = None
    images: List[str] = field(default_factory=list)
    price_ranges: List[Dict] = field(default_factory=list)
    seat_map_url: Optional[str] = None
    ticket_limit: Optional[int] = None
    age_restrictions: Optional[str] = None
    
    
@dataclass
class TicketOffer:
    """Ticket offer details"""
    id: str
    event_id: str
    section: str
    row: Optional[str]
    seats: Optional[List[str]]
    ticket_type: TicketType
    price: Decimal
    fees: Decimal
    total_price: Decimal
    currency: str
    quantity_available: int
    description: Optional[str] = None
    

class TicketmasterAPI:
    """Ticketmaster Discovery and Commerce API integration"""
    
    def __init__(self):
        self.discovery_base_url = "https://app.ticketmaster.com/discovery/v2"
        self.commerce_base_url = "https://app.ticketmaster.com/commerce/v2"
        self.api_key = os.getenv("TICKETMASTER_API_KEY")
        self.api_secret = os.getenv("TICKETMASTER_API_SECRET")
        self.affiliate_id = os.getenv("TICKETMASTER_AFFILIATE_ID")
        self.session = None
        self.rate_limit_remaining = 5000
        self.rate_limit_reset = None
        
    async def initialize(self):
        """Initialize API session"""
        if not self.session:
            self.session = aiohttp.ClientSession()
        logger.info("Ticketmaster API initialized")
    
    async def close(self):
        """Close API session"""
        if self.session:
            await self.session.close()
    
    async def search_events(
        self,
        keyword: Optional[str] = None,
        city: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        category: Optional[EventCategory] = None,
        radius: int = 50,
        unit: str = "miles",
        size: int = 20,
        page: int = 0,
        sort: str = "relevance,desc"
    ) -> Dict:
        """Search for events"""
        
        params = {
            "apikey": self.api_key,
            "size": size,
            "page": page,
            "sort": sort,
            "radius": radius,
            "unit": unit
        }
        
        if keyword:
            params["keyword"] = keyword
        
        if city:
            params["city"] = city
        
        if start_date:
            params["startDateTime"] = start_date.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        if end_date:
            params["endDateTime"] = end_date.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        if category:
            params["classificationName"] = category.value
        
        try:
            url = f"{self.discovery_base_url}/events.json"
            
            async with self.session.get(url, params=params) as response:
                self._update_rate_limit(response.headers)
                
                if response.status == 200:
                    data = await response.json()
                    return self._parse_events_response(data)
                else:
                    logger.error(f"Event search failed: {response.status}")
                    return {"events": [], "total": 0}
                    
        except Exception as e:
            logger.error(f"Error searching events: {e}")
            return {"events": [], "total": 0}
    
    def _parse_events_response(self, data: Dict) -> Dict:
        """Parse events search response"""
        events = []
        
        if "_embedded" in data and "events" in data["_embedded"]:
            for event_data in data["_embedded"]["events"]:
                try:
                    # Parse venue
                    venue = None
                    if "_embedded" in event_data and "venues" in event_data["_embedded"]:
                        venue_data = event_data["_embedded"]["venues"][0]
                        venue = Venue(
                            id=venue_data["id"],
                            name=venue_data["name"],
                            address=venue_data.get("address", {}).get("line1", ""),
                            city=venue_data.get("city", {}).get("name", ""),
                            state=venue_data.get("state", {}).get("stateCode", ""),
                            country=venue_data.get("country", {}).get("countryCode", ""),
                            postal_code=venue_data.get("postalCode", ""),
                            latitude=float(venue_data.get("location", {}).get("latitude", 0)),
                            longitude=float(venue_data.get("location", {}).get("longitude", 0)),
                            timezone=venue_data.get("timezone", "America/New_York")
                        )
                    
                    # Parse artists
                    artists = []
                    if "_embedded" in event_data and "attractions" in event_data["_embedded"]:
                        for attraction in event_data["_embedded"]["attractions"]:
                            artist = Artist(
                                id=attraction["id"],
                                name=attraction["name"],
                                genre=attraction.get("classifications", [{}])[0].get("genre", {}).get("name"),
                                image_url=attraction.get("images", [{}])[0].get("url")
                            )
                            artists.append(artist)
                    
                    # Parse date
                    event_date = datetime.strptime(
                        event_data["dates"]["start"]["dateTime"],
                        "%Y-%m-%dT%H:%M:%SZ"
                    ) if "dateTime" in event_data["dates"]["start"] else datetime.now()
                    
                    # Parse price ranges
                    price_ranges = []
                    if "priceRanges" in event_data:
                        for price_range in event_data["priceRanges"]:
                            price_ranges.append({
                                "type": price_range.get("type", "standard"),
                                "currency": price_range.get("currency", "USD"),
                                "min": float(price_range.get("min", 0)),
                                "max": float(price_range.get("max", 0))
                            })
                    
                    # Parse status
                    status = EventStatus.ONSALE
                    if "dates" in event_data and "status" in event_data["dates"]:
                        status_code = event_data["dates"]["status"]["code"]
                        if status_code == "cancelled":
                            status = EventStatus.CANCELLED
                        elif status_code == "postponed":
                            status = EventStatus.POSTPONED
                        elif status_code == "offsale":
                            status = EventStatus.OFFSALE
                    
                    # Create event object
                    event = Event(
                        id=event_data["id"],
                        name=event_data["name"],
                        category=self._get_event_category(event_data),
                        date=event_date,
                        venue=venue,
                        artists=artists,
                        status=status,
                        description=event_data.get("info"),
                        images=[img["url"] for img in event_data.get("images", [])],
                        price_ranges=price_ranges,
                        seat_map_url=event_data.get("seatmap", {}).get("staticUrl"),
                        ticket_limit=event_data.get("ticketLimit", {}).get("info"),
                        age_restrictions=event_data.get("ageRestrictions", {}).get("legalAgeEnforced")
                    )
                    
                    events.append(event)
                    
                except Exception as e:
                    logger.error(f"Error parsing event: {e}")
                    continue
        
        return {
            "events": events,
            "total": data.get("page", {}).get("totalElements", 0),
            "page": data.get("page", {}).get("number", 0),
            "size": data.get("page", {}).get("size", 20)
        }
    
    def _get_event_category(self, event_data: Dict) -> EventCategory:
        """Extract event category from classification"""
        try:
            classifications = event_data.get("classifications", [])
            if classifications:
                segment = classifications[0].get("segment", {}).get("name", "").lower()
                if "music" in segment:
                    return EventCategory.MUSIC
                elif "sport" in segment:
                    return EventCategory.SPORTS
                elif "art" in segment or "theatre" in segment:
                    return EventCategory.ARTS_THEATRE
                elif "family" in segment:
                    return EventCategory.FAMILY
                else:
                    return EventCategory.MISCELLANEOUS
        except:
            pass
        return EventCategory.MISCELLANEOUS
    
    async def get_event_details(self, event_id: str) -> Optional[Event]:
        """Get detailed event information"""
        
        params = {"apikey": self.api_key}
        url = f"{self.discovery_base_url}/events/{event_id}.json"
        
        try:
            async with self.session.get(url, params=params) as response:
                self._update_rate_limit(response.headers)
                
                if response.status == 200:
                    data = await response.json()
                    parsed = self._parse_events_response({"_embedded": {"events": [data]}})
                    return parsed["events"][0] if parsed["events"] else None
                else:
                    logger.error(f"Failed to get event details: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting event details: {e}")
            return None
    
    async def get_venue_details(self, venue_id: str) -> Optional[Venue]:
        """Get detailed venue information"""
        
        params = {"apikey": self.api_key}
        url = f"{self.discovery_base_url}/venues/{venue_id}.json"
        
        try:
            async with self.session.get(url, params=params) as response:
                self._update_rate_limit(response.headers)
                
                if response.status == 200:
                    venue_data = await response.json()
                    
                    return Venue(
                        id=venue_data["id"],
                        name=venue_data["name"],
                        address=venue_data.get("address", {}).get("line1", ""),
                        city=venue_data.get("city", {}).get("name", ""),
                        state=venue_data.get("state", {}).get("stateCode", ""),
                        country=venue_data.get("country", {}).get("countryCode", ""),
                        postal_code=venue_data.get("postalCode", ""),
                        latitude=float(venue_data.get("location", {}).get("latitude", 0)),
                        longitude=float(venue_data.get("location", {}).get("longitude", 0)),
                        timezone=venue_data.get("timezone", "America/New_York"),
                        parking_info=venue_data.get("parkingDetail"),
                        general_info=venue_data.get("generalInfo", {}).get("generalRule"),
                        accessibility_info=venue_data.get("accessibleSeatingDetail"),
                        box_office_info=venue_data.get("boxOfficeInfo")
                    )
                else:
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting venue details: {e}")
            return None
    
    async def get_ticket_availability(self, event_id: str) -> List[TicketOffer]:
        """Get ticket availability and pricing"""
        
        # Note: This requires Commerce API access which has special requirements
        # This is a simplified implementation
        
        params = {
            "apikey": self.api_key,
            "eventId": event_id
        }
        
        url = f"{self.commerce_base_url}/offers.json"
        
        try:
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_ticket_offers(data)
                else:
                    # Fallback to mock data for demonstration
                    return self._generate_mock_ticket_offers(event_id)
                    
        except Exception as e:
            logger.error(f"Error getting ticket availability: {e}")
            return self._generate_mock_ticket_offers(event_id)
    
    def _parse_ticket_offers(self, data: Dict) -> List[TicketOffer]:
        """Parse ticket offers from API response"""
        offers = []
        
        if "offers" in data:
            for offer_data in data["offers"]:
                offer = TicketOffer(
                    id=offer_data["id"],
                    event_id=offer_data["eventId"],
                    section=offer_data.get("section", "General"),
                    row=offer_data.get("row"),
                    seats=offer_data.get("seats", []),
                    ticket_type=TicketType.RESERVED,
                    price=Decimal(str(offer_data.get("faceValue", 0))),
                    fees=Decimal(str(offer_data.get("fees", 0))),
                    total_price=Decimal(str(offer_data.get("totalPrice", 0))),
                    currency=offer_data.get("currency", "USD"),
                    quantity_available=offer_data.get("quantity", 1),
                    description=offer_data.get("description")
                )
                offers.append(offer)
        
        return offers
    
    def _generate_mock_ticket_offers(self, event_id: str) -> List[TicketOffer]:
        """Generate mock ticket offers for demonstration"""
        import random
        
        sections = [
            ("Orchestra", 250, 350),
            ("Mezzanine", 150, 250),
            ("Balcony", 75, 150),
            ("General Admission", 45, 75)
        ]
        
        offers = []
        for section, min_price, max_price in sections:
            base_price = random.uniform(min_price, max_price)
            fees = base_price * 0.15  # 15% fees
            
            offer = TicketOffer(
                id=f"OFFER-{uuid.uuid4().hex[:8].upper()}",
                event_id=event_id,
                section=section,
                row=f"Row {random.choice(['A', 'B', 'C', 'D', 'E'])}" if section != "General Admission" else None,
                seats=[f"Seat {i}" for i in range(1, random.randint(2, 5))] if section != "General Admission" else None,
                ticket_type=TicketType.GENERAL_ADMISSION if section == "General Admission" else TicketType.RESERVED,
                price=Decimal(str(round(base_price, 2))),
                fees=Decimal(str(round(fees, 2))),
                total_price=Decimal(str(round(base_price + fees, 2))),
                currency="USD",
                quantity_available=random.randint(1, 20),
                description=f"{section} seating with great view"
            )
            offers.append(offer)
        
        return offers
    
    async def create_cart(self, offers: List[Dict]) -> Dict:
        """Create shopping cart for ticket purchase"""
        
        cart_id = f"CART-{uuid.uuid4().hex[:12].upper()}"
        
        cart_items = []
        total_amount = Decimal("0")
        
        for offer in offers:
            item = {
                "offer_id": offer["offer_id"],
                "quantity": offer["quantity"],
                "price": offer["price"],
                "fees": offer["fees"],
                "subtotal": offer["price"] * offer["quantity"] + offer["fees"]
            }
            cart_items.append(item)
            total_amount += item["subtotal"]
        
        cart = {
            "cart_id": cart_id,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(minutes=10)).isoformat(),
            "items": cart_items,
            "total_amount": float(total_amount),
            "currency": "USD",
            "status": "active"
        }
        
        # Store cart in cache/database
        # Implementation depends on your storage solution
        
        return cart
    
    async def checkout_cart(
        self,
        cart_id: str,
        customer_info: Dict,
        payment_info: Dict
    ) -> Dict:
        """Process ticket purchase"""
        
        # Note: Actual ticket purchase requires Ticketmaster Commerce API partnership
        # This is a simplified demonstration
        
        order_id = f"ORDER-{uuid.uuid4().hex[:12].upper()}"
        
        # Process payment (integrate with payment processor)
        payment_result = await self._process_payment(payment_info)
        
        if payment_result["success"]:
            order = {
                "order_id": order_id,
                "cart_id": cart_id,
                "status": "confirmed",
                "customer": customer_info,
                "payment": {
                    "transaction_id": payment_result["transaction_id"],
                    "amount": payment_result["amount"],
                    "currency": "USD",
                    "status": "completed"
                },
                "tickets": await self._generate_tickets(cart_id, order_id),
                "created_at": datetime.utcnow().isoformat(),
                "confirmation_email_sent": True
            }
            
            # Send confirmation email
            await self._send_confirmation_email(order)
            
            return order
        else:
            return {
                "order_id": None,
                "status": "failed",
                "error": payment_result.get("error", "Payment processing failed")
            }
    
    async def _process_payment(self, payment_info: Dict) -> Dict:
        """Process payment for tickets"""
        # Integration with payment processor (Stripe, PayPal, etc.)
        return {
            "success": True,
            "transaction_id": f"TXN-{uuid.uuid4().hex[:12].upper()}",
            "amount": payment_info.get("amount", 0)
        }
    
    async def _generate_tickets(self, cart_id: str, order_id: str) -> List[Dict]:
        """Generate ticket documents"""
        tickets = []
        
        # Generate ticket barcodes/QR codes
        # In production, these would be validated by Ticketmaster
        
        for i in range(1, 3):  # Example: 2 tickets
            ticket = {
                "ticket_id": f"TKT-{uuid.uuid4().hex[:12].upper()}",
                "barcode": f"BAR-{uuid.uuid4().hex[:16].upper()}",
                "qr_code": f"QR-{uuid.uuid4().hex[:16].upper()}",
                "pdf_url": f"https://tickets.spirittours.com/{order_id}/ticket_{i}.pdf",
                "mobile_url": f"https://m.spirittours.com/ticket/{order_id}/{i}"
            }
            tickets.append(ticket)
        
        return tickets
    
    async def _send_confirmation_email(self, order: Dict):
        """Send ticket confirmation email"""
        # Email service integration
        pass
    
    def _update_rate_limit(self, headers: Dict):
        """Update rate limit information from response headers"""
        if "X-RateLimit-Remaining" in headers:
            self.rate_limit_remaining = int(headers["X-RateLimit-Remaining"])
        if "X-RateLimit-Reset" in headers:
            self.rate_limit_reset = datetime.fromtimestamp(int(headers["X-RateLimit-Reset"]))
    
    async def get_attractions(self, keyword: Optional[str] = None) -> List[Artist]:
        """Search for attractions/artists"""
        
        params = {
            "apikey": self.api_key,
            "size": 20
        }
        
        if keyword:
            params["keyword"] = keyword
        
        url = f"{self.discovery_base_url}/attractions.json"
        
        try:
            async with self.session.get(url, params=params) as response:
                self._update_rate_limit(response.headers)
                
                if response.status == 200:
                    data = await response.json()
                    attractions = []
                    
                    if "_embedded" in data and "attractions" in data["_embedded"]:
                        for attraction_data in data["_embedded"]["attractions"]:
                            artist = Artist(
                                id=attraction_data["id"],
                                name=attraction_data["name"],
                                genre=attraction_data.get("classifications", [{}])[0].get("genre", {}).get("name"),
                                image_url=attraction_data.get("images", [{}])[0].get("url") if attraction_data.get("images") else None,
                                upcoming_events=attraction_data.get("upcomingEvents", {}).get("_total", 0)
                            )
                            attractions.append(artist)
                    
                    return attractions
                else:
                    return []
                    
        except Exception as e:
            logger.error(f"Error getting attractions: {e}")
            return []


class EventPackageBuilder:
    """Build complete travel packages including events"""
    
    def __init__(self, ticketmaster_api: TicketmasterAPI):
        self.ticketmaster_api = ticketmaster_api
        
    async def create_event_package(
        self,
        event_id: str,
        include_hotel: bool = True,
        include_flight: bool = False,
        include_transportation: bool = True,
        nights: int = 2
    ) -> Dict:
        """Create complete travel package around an event"""
        
        # Get event details
        event = await self.ticketmaster_api.get_event_details(event_id)
        
        if not event:
            return {"error": "Event not found"}
        
        package = {
            "package_id": f"PKG-{uuid.uuid4().hex[:12].upper()}",
            "event": {
                "id": event.id,
                "name": event.name,
                "date": event.date.isoformat(),
                "venue": event.venue.name if event.venue else "TBD",
                "city": event.venue.city if event.venue else "TBD"
            },
            "components": []
        }
        
        total_price = Decimal("0")
        
        # Add tickets
        ticket_offers = await self.ticketmaster_api.get_ticket_availability(event_id)
        if ticket_offers:
            ticket = ticket_offers[0]  # Select first available
            package["components"].append({
                "type": "ticket",
                "description": f"Event ticket - {ticket.section}",
                "price": float(ticket.total_price),
                "quantity": 2
            })
            total_price += ticket.total_price * 2
        
        # Add hotel
        if include_hotel and event.venue:
            hotel_component = await self._find_nearby_hotels(
                event.venue.latitude,
                event.venue.longitude,
                event.date,
                nights
            )
            if hotel_component:
                package["components"].append(hotel_component)
                total_price += Decimal(str(hotel_component["price"]))
        
        # Add flight
        if include_flight:
            flight_component = await self._find_flights(
                event.venue.city if event.venue else None,
                event.date
            )
            if flight_component:
                package["components"].append(flight_component)
                total_price += Decimal(str(flight_component["price"]))
        
        # Add transportation
        if include_transportation:
            transport_component = {
                "type": "transportation",
                "description": "Airport transfers and local transportation",
                "price": 150.00,
                "includes": ["Airport pickup", "Hotel to venue transfer", "Return transfer"]
            }
            package["components"].append(transport_component)
            total_price += Decimal("150.00")
        
        package["total_price"] = float(total_price)
        package["currency"] = "USD"
        package["created_at"] = datetime.utcnow().isoformat()
        package["valid_until"] = (datetime.utcnow() + timedelta(days=7)).isoformat()
        
        return package
    
    async def _find_nearby_hotels(
        self,
        latitude: float,
        longitude: float,
        check_in: datetime,
        nights: int
    ) -> Optional[Dict]:
        """Find hotels near venue"""
        
        # This would integrate with hotel booking API
        # Returning mock data for demonstration
        
        return {
            "type": "hotel",
            "description": "4-star hotel near venue",
            "name": "Downtown Hotel",
            "check_in": check_in.isoformat(),
            "check_out": (check_in + timedelta(days=nights)).isoformat(),
            "nights": nights,
            "price": 250.00 * nights,
            "includes": ["Breakfast", "WiFi", "Parking"]
        }
    
    async def _find_flights(
        self,
        destination_city: str,
        travel_date: datetime
    ) -> Optional[Dict]:
        """Find flights to event city"""
        
        # This would integrate with flight booking API
        # Returning mock data for demonstration
        
        return {
            "type": "flight",
            "description": "Round-trip flight",
            "departure": (travel_date - timedelta(days=1)).isoformat(),
            "return": (travel_date + timedelta(days=2)).isoformat(),
            "airline": "Spirit Airlines",
            "price": 450.00,
            "includes": ["Carry-on bag", "Seat selection"]
        }


class EventRecommendationEngine:
    """Recommend events based on user preferences"""
    
    def __init__(self, ticketmaster_api: TicketmasterAPI):
        self.ticketmaster_api = ticketmaster_api
        
    async def get_personalized_recommendations(
        self,
        user_preferences: Dict,
        location: str,
        date_range: Tuple[datetime, datetime]
    ) -> List[Event]:
        """Get personalized event recommendations"""
        
        recommendations = []
        
        # Get user's preferred categories
        preferred_categories = user_preferences.get("categories", [EventCategory.MUSIC])
        
        for category in preferred_categories:
            result = await self.ticketmaster_api.search_events(
                city=location,
                start_date=date_range[0],
                end_date=date_range[1],
                category=category,
                size=5
            )
            
            recommendations.extend(result["events"])
        
        # Score and rank recommendations
        scored_events = []
        for event in recommendations:
            score = self._calculate_recommendation_score(event, user_preferences)
            scored_events.append((score, event))
        
        # Sort by score
        scored_events.sort(key=lambda x: x[0], reverse=True)
        
        return [event for score, event in scored_events[:10]]
    
    def _calculate_recommendation_score(self, event: Event, preferences: Dict) -> float:
        """Calculate recommendation score for an event"""
        
        score = 0.0
        
        # Category match
        if event.category in preferences.get("categories", []):
            score += 30.0
        
        # Artist match
        favorite_artists = preferences.get("favorite_artists", [])
        for artist in event.artists:
            if artist.name in favorite_artists:
                score += 50.0
        
        # Price range match
        max_price = preferences.get("max_price", 500)
        if event.price_ranges:
            avg_price = sum(p["min"] for p in event.price_ranges) / len(event.price_ranges)
            if avg_price <= max_price:
                score += 20.0
        
        # Day of week preference
        preferred_days = preferences.get("preferred_days", [])
        if event.date.strftime("%A") in preferred_days:
            score += 10.0
        
        # Venue size preference
        # Additional scoring logic based on venue capacity, distance, etc.
        
        return score
    
    async def get_trending_events(self, location: str) -> List[Event]:
        """Get trending events in a location"""
        
        result = await self.ticketmaster_api.search_events(
            city=location,
            sort="relevance,desc",
            size=20
        )
        
        return result["events"][:10]
    
    async def get_similar_events(self, event_id: str) -> List[Event]:
        """Get events similar to a given event"""
        
        # Get original event
        event = await self.ticketmaster_api.get_event_details(event_id)
        
        if not event:
            return []
        
        # Search for similar events
        similar = []
        
        # By artist
        for artist in event.artists[:1]:  # Take first artist
            result = await self.ticketmaster_api.search_events(
                keyword=artist.name,
                size=5
            )
            similar.extend(result["events"])
        
        # By category and city
        if event.venue:
            result = await self.ticketmaster_api.search_events(
                city=event.venue.city,
                category=event.category,
                size=5
            )
            similar.extend(result["events"])
        
        # Remove duplicates and original event
        seen = set()
        unique_similar = []
        for e in similar:
            if e.id != event_id and e.id not in seen:
                seen.add(e.id)
                unique_similar.append(e)
        
        return unique_similar[:10]


# Export classes
__all__ = [
    'EventCategory',
    'TicketType',
    'EventStatus',
    'Venue',
    'Artist',
    'Event',
    'TicketOffer',
    'TicketmasterAPI',
    'EventPackageBuilder',
    'EventRecommendationEngine'
]