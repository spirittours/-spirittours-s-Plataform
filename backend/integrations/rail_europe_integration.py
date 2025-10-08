"""
Rail Europe Train Booking Integration
Complete integration with Rail Europe API for train bookings across Europe and beyond
"""

import os
import uuid
import json
import hashlib
import hmac
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, date
from decimal import Decimal
import asyncio
import aiohttp
from enum import Enum
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
import logging
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

class TrainClass(Enum):
    """Train travel classes"""
    STANDARD = "standard"
    STANDARD_PLUS = "standard_plus"
    FIRST = "first"
    BUSINESS = "business"
    SLEEPER = "sleeper"
    COUCHETTE = "couchette"


class TrainType(Enum):
    """Types of trains"""
    HIGH_SPEED = "high_speed"
    INTERCITY = "intercity"
    REGIONAL = "regional"
    OVERNIGHT = "overnight"
    SCENIC = "scenic"
    METRO = "metro"


class PassengerType(Enum):
    """Passenger types for train bookings"""
    ADULT = "adult"
    YOUTH = "youth"  # 12-27 years
    CHILD = "child"  # 4-11 years
    INFANT = "infant"  # 0-3 years
    SENIOR = "senior"  # 60+ years


@dataclass
class TrainStation:
    """Train station information"""
    code: str
    name: str
    city: str
    country: str
    timezone: str
    latitude: float
    longitude: float
    is_major_hub: bool = False
    

@dataclass
class TrainSegment:
    """Train journey segment"""
    train_number: str
    train_type: TrainType
    operator: str
    departure_station: TrainStation
    arrival_station: TrainStation
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int
    travel_class: TrainClass
    amenities: List[str] = field(default_factory=list)
    

@dataclass
class TrainOffer:
    """Train booking offer"""
    offer_id: str
    segments: List[TrainSegment]
    total_duration_minutes: int
    connections: int
    price: Dict[str, float]  # currency -> amount
    availability: int
    fare_type: str  # flexible, semi-flexible, non-refundable
    cancellation_policy: str
    included_services: List[str]
    

class RailEuropeAPI:
    """Rail Europe API integration"""
    
    def __init__(self):
        self.base_url = os.getenv("RAIL_EUROPE_API_URL", "https://api.raileurope.com/v2")
        self.api_key = os.getenv("RAIL_EUROPE_API_KEY")
        self.api_secret = os.getenv("RAIL_EUROPE_API_SECRET")
        self.partner_id = os.getenv("RAIL_EUROPE_PARTNER_ID")
        self.session = None
        self.stations_cache = {}
        self._load_stations()
        
    def _load_stations(self):
        """Load European train stations"""
        # Major European train stations
        self.stations_cache = {
            # France
            "FRPAR": TrainStation("FRPAR", "Paris Gare du Nord", "Paris", "FR", "Europe/Paris", 48.8809, 2.3553, True),
            "FRPLY": TrainStation("FRPLY", "Paris Gare de Lyon", "Paris", "FR", "Europe/Paris", 48.8443, 2.3744, True),
            "FRLYS": TrainStation("FRLYS", "Lyon Part-Dieu", "Lyon", "FR", "Europe/Paris", 45.7606, 4.8595, True),
            "FRMRS": TrainStation("FRMRS", "Marseille St-Charles", "Marseille", "FR", "Europe/Paris", 43.3028, 5.3806, True),
            
            # Germany
            "DEBER": TrainStation("DEBER", "Berlin Hauptbahnhof", "Berlin", "DE", "Europe/Berlin", 52.5250, 13.3694, True),
            "DEMUC": TrainStation("DEMUC", "München Hauptbahnhof", "Munich", "DE", "Europe/Berlin", 48.1403, 11.5583, True),
            "DEFRA": TrainStation("DEFRA", "Frankfurt Hauptbahnhof", "Frankfurt", "DE", "Europe/Berlin", 50.1069, 8.6631, True),
            "DEHAM": TrainStation("DEHAM", "Hamburg Hauptbahnhof", "Hamburg", "DE", "Europe/Berlin", 53.5528, 10.0069, True),
            
            # Spain
            "ESMAD": TrainStation("ESMAD", "Madrid Atocha", "Madrid", "ES", "Europe/Madrid", 40.4068, -3.6892, True),
            "ESBCN": TrainStation("ESBCN", "Barcelona Sants", "Barcelona", "ES", "Europe/Madrid", 41.3792, 2.1403, True),
            "ESSEV": TrainStation("ESSEV", "Sevilla Santa Justa", "Seville", "ES", "Europe/Madrid", 37.3919, -5.9761, True),
            "ESVAL": TrainStation("ESVAL", "Valencia Joaquín Sorolla", "Valencia", "ES", "Europe/Madrid", 39.4667, -0.3772, True),
            
            # Italy
            "ITROM": TrainStation("ITROM", "Roma Termini", "Rome", "IT", "Europe/Rome", 41.9011, 12.5019, True),
            "ITMIL": TrainStation("ITMIL", "Milano Centrale", "Milan", "IT", "Europe/Rome", 45.4861, 9.2044, True),
            "ITFIR": TrainStation("ITFIR", "Firenze S.M. Novella", "Florence", "IT", "Europe/Rome", 43.7764, 11.2481, True),
            "ITVEN": TrainStation("ITVEN", "Venezia S. Lucia", "Venice", "IT", "Europe/Rome", 45.4411, 12.3214, True),
            
            # UK
            "GBLON": TrainStation("GBLON", "London St Pancras", "London", "GB", "Europe/London", 51.5314, -0.1269, True),
            "GBEUS": TrainStation("GBEUS", "London Euston", "London", "GB", "Europe/London", 51.5281, -0.1339, True),
            "GBMAN": TrainStation("GBMAN", "Manchester Piccadilly", "Manchester", "GB", "Europe/London", 53.4774, -2.2309, True),
            "GBEDI": TrainStation("GBEDI", "Edinburgh Waverley", "Edinburgh", "GB", "Europe/London", 55.9522, -3.1897, True),
            
            # Netherlands
            "NLAMS": TrainStation("NLAMS", "Amsterdam Centraal", "Amsterdam", "NL", "Europe/Amsterdam", 52.3789, 4.9003, True),
            "NLROT": TrainStation("NLROT", "Rotterdam Centraal", "Rotterdam", "NL", "Europe/Amsterdam", 51.9250, 4.4689, False),
            
            # Belgium
            "BEBRU": TrainStation("BEBRU", "Brussels-Midi", "Brussels", "BE", "Europe/Brussels", 50.8353, 4.3369, True),
            "BEANT": TrainStation("BEANT", "Antwerp Central", "Antwerp", "BE", "Europe/Brussels", 51.2172, 4.4211, False),
            
            # Switzerland
            "CHZUR": TrainStation("CHZUR", "Zürich HB", "Zurich", "CH", "Europe/Zurich", 47.3778, 8.5403, True),
            "CHGEN": TrainStation("CHGEN", "Genève", "Geneva", "CH", "Europe/Zurich", 46.2103, 6.1425, True),
            "CHBER": TrainStation("CHBER", "Bern", "Bern", "CH", "Europe/Zurich", 46.9489, 7.4394, False),
            
            # Austria
            "ATVIE": TrainStation("ATVIE", "Wien Hauptbahnhof", "Vienna", "AT", "Europe/Vienna", 48.1847, 16.3775, True),
            "ATSAL": TrainStation("ATSAL", "Salzburg Hbf", "Salzburg", "AT", "Europe/Vienna", 47.8128, 13.0456, False),
        }
    
    async def initialize(self):
        """Initialize HTTP session"""
        if not self.session:
            self.session = aiohttp.ClientSession()
    
    async def close(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()
    
    def _generate_signature(self, method: str, path: str, params: Dict) -> str:
        """Generate API signature for authentication"""
        timestamp = str(int(datetime.utcnow().timestamp()))
        
        # Create signature base string
        param_string = urlencode(sorted(params.items()))
        base_string = f"{method.upper()}&{path}&{param_string}&{timestamp}"
        
        # Generate HMAC-SHA256 signature
        signature = hmac.new(
            self.api_secret.encode(),
            base_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    async def search_trains(
        self,
        origin: str,
        destination: str,
        departure_date: date,
        return_date: Optional[date] = None,
        passengers: Dict[PassengerType, int] = None,
        travel_class: TrainClass = TrainClass.STANDARD
    ) -> List[TrainOffer]:
        """Search for train connections"""
        
        if not passengers:
            passengers = {PassengerType.ADULT: 1}
        
        # Build search request
        search_params = {
            "origin": origin,
            "destination": destination,
            "departure_date": departure_date.isoformat(),
            "passengers": self._format_passengers(passengers),
            "travel_class": travel_class.value,
            "currency": "EUR",
            "partner_id": self.partner_id
        }
        
        if return_date:
            search_params["return_date"] = return_date.isoformat()
        
        # Add authentication
        signature = self._generate_signature("POST", "/search", search_params)
        
        headers = {
            "X-API-Key": self.api_key,
            "X-Signature": signature,
            "Content-Type": "application/json"
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/search",
                json=search_params,
                headers=headers
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_search_results(data)
                else:
                    logger.error(f"Train search failed: {response.status}")
                    return []
                    
        except Exception as e:
            logger.error(f"Error searching trains: {e}")
            return []
    
    def _format_passengers(self, passengers: Dict[PassengerType, int]) -> List[Dict]:
        """Format passenger information for API"""
        formatted = []
        for pax_type, count in passengers.items():
            for i in range(count):
                formatted.append({
                    "type": pax_type.value,
                    "age": self._get_default_age(pax_type)
                })
        return formatted
    
    def _get_default_age(self, pax_type: PassengerType) -> int:
        """Get default age for passenger type"""
        ages = {
            PassengerType.ADULT: 30,
            PassengerType.YOUTH: 20,
            PassengerType.CHILD: 8,
            PassengerType.INFANT: 2,
            PassengerType.SENIOR: 65
        }
        return ages.get(pax_type, 30)
    
    def _parse_search_results(self, data: Dict) -> List[TrainOffer]:
        """Parse search results into TrainOffer objects"""
        offers = []
        
        for journey in data.get("journeys", []):
            segments = []
            
            for seg_data in journey.get("segments", []):
                # Get station information
                dep_station = self.stations_cache.get(
                    seg_data["departure_station"],
                    TrainStation(
                        seg_data["departure_station"],
                        seg_data["departure_station_name"],
                        seg_data["departure_city"],
                        seg_data["departure_country"],
                        "Europe/Paris",
                        0.0, 0.0
                    )
                )
                
                arr_station = self.stations_cache.get(
                    seg_data["arrival_station"],
                    TrainStation(
                        seg_data["arrival_station"],
                        seg_data["arrival_station_name"],
                        seg_data["arrival_city"],
                        seg_data["arrival_country"],
                        "Europe/Paris",
                        0.0, 0.0
                    )
                )
                
                segment = TrainSegment(
                    train_number=seg_data["train_number"],
                    train_type=TrainType(seg_data.get("train_type", "intercity")),
                    operator=seg_data["operator"],
                    departure_station=dep_station,
                    arrival_station=arr_station,
                    departure_time=datetime.fromisoformat(seg_data["departure_time"]),
                    arrival_time=datetime.fromisoformat(seg_data["arrival_time"]),
                    duration_minutes=seg_data["duration_minutes"],
                    travel_class=TrainClass(seg_data.get("travel_class", "standard")),
                    amenities=seg_data.get("amenities", [])
                )
                segments.append(segment)
            
            offer = TrainOffer(
                offer_id=journey["offer_id"],
                segments=segments,
                total_duration_minutes=journey["total_duration"],
                connections=len(segments) - 1,
                price=journey["prices"],
                availability=journey.get("availability", 99),
                fare_type=journey.get("fare_type", "flexible"),
                cancellation_policy=journey.get("cancellation_policy", "Standard"),
                included_services=journey.get("included_services", [])
            )
            offers.append(offer)
        
        return offers
    
    async def check_availability(self, offer_id: str) -> Dict:
        """Check real-time availability for an offer"""
        
        params = {
            "offer_id": offer_id,
            "partner_id": self.partner_id
        }
        
        signature = self._generate_signature("GET", f"/offers/{offer_id}/availability", params)
        
        headers = {
            "X-API-Key": self.api_key,
            "X-Signature": signature
        }
        
        try:
            async with self.session.get(
                f"{self.base_url}/offers/{offer_id}/availability",
                params=params,
                headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"available": False}
                    
        except Exception as e:
            logger.error(f"Error checking availability: {e}")
            return {"available": False}
    
    async def create_booking(
        self,
        offer_id: str,
        passengers: List[Dict],
        contact_info: Dict,
        payment_info: Optional[Dict] = None
    ) -> Dict:
        """Create train booking"""
        
        booking_data = {
            "offer_id": offer_id,
            "passengers": passengers,
            "contact": contact_info,
            "partner_id": self.partner_id,
            "partner_reference": f"SPIRIT-{uuid.uuid4().hex[:8].upper()}"
        }
        
        if payment_info:
            booking_data["payment"] = payment_info
        
        signature = self._generate_signature("POST", "/bookings", booking_data)
        
        headers = {
            "X-API-Key": self.api_key,
            "X-Signature": signature,
            "Content-Type": "application/json"
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/bookings",
                json=booking_data,
                headers=headers
            ) as response:
                if response.status in [200, 201]:
                    return await response.json()
                else:
                    error_data = await response.text()
                    logger.error(f"Booking failed: {error_data}")
                    return {"success": False, "error": error_data}
                    
        except Exception as e:
            logger.error(f"Error creating booking: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_booking(self, booking_reference: str) -> Dict:
        """Retrieve booking details"""
        
        params = {
            "partner_id": self.partner_id
        }
        
        signature = self._generate_signature("GET", f"/bookings/{booking_reference}", params)
        
        headers = {
            "X-API-Key": self.api_key,
            "X-Signature": signature
        }
        
        try:
            async with self.session.get(
                f"{self.base_url}/bookings/{booking_reference}",
                params=params,
                headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"error": "Booking not found"}
                    
        except Exception as e:
            logger.error(f"Error retrieving booking: {e}")
            return {"error": str(e)}
    
    async def cancel_booking(self, booking_reference: str, reason: str = "Customer request") -> Dict:
        """Cancel train booking"""
        
        cancel_data = {
            "reason": reason,
            "partner_id": self.partner_id
        }
        
        signature = self._generate_signature("POST", f"/bookings/{booking_reference}/cancel", cancel_data)
        
        headers = {
            "X-API-Key": self.api_key,
            "X-Signature": signature,
            "Content-Type": "application/json"
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/bookings/{booking_reference}/cancel",
                json=cancel_data,
                headers=headers
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"success": False, "error": "Cancellation failed"}
                    
        except Exception as e:
            logger.error(f"Error cancelling booking: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_station_info(self, station_code: str) -> Optional[TrainStation]:
        """Get detailed station information"""
        
        # Check cache first
        if station_code in self.stations_cache:
            return self.stations_cache[station_code]
        
        # Fetch from API if not cached
        params = {
            "partner_id": self.partner_id
        }
        
        signature = self._generate_signature("GET", f"/stations/{station_code}", params)
        
        headers = {
            "X-API-Key": self.api_key,
            "X-Signature": signature
        }
        
        try:
            async with self.session.get(
                f"{self.base_url}/stations/{station_code}",
                params=params,
                headers=headers
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    station = TrainStation(
                        code=data["code"],
                        name=data["name"],
                        city=data["city"],
                        country=data["country"],
                        timezone=data["timezone"],
                        latitude=data["latitude"],
                        longitude=data["longitude"],
                        is_major_hub=data.get("is_major_hub", False)
                    )
                    # Cache for future use
                    self.stations_cache[station_code] = station
                    return station
                else:
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting station info: {e}")
            return None


class EurailPassManager:
    """Manages Eurail/Interrail pass bookings and validations"""
    
    def __init__(self, rail_api: RailEuropeAPI):
        self.rail_api = rail_api
        self.pass_types = self._initialize_pass_types()
    
    def _initialize_pass_types(self) -> Dict:
        """Initialize available pass types"""
        return {
            "global_pass": {
                "name": "Eurail Global Pass",
                "countries": 33,
                "durations": ["15 days", "22 days", "1 month", "2 months", "3 months"],
                "travel_days": [5, 7, 10, 15, 22, "continuous"],
                "prices": {
                    "adult": {"15_days_5_travel": 386, "1_month_continuous": 670},
                    "youth": {"15_days_5_travel": 289, "1_month_continuous": 503},
                    "senior": {"15_days_5_travel": 347, "1_month_continuous": 603}
                }
            },
            "one_country": {
                "name": "Eurail One Country Pass",
                "countries": ["France", "Germany", "Italy", "Spain", "Switzerland"],
                "travel_days": [3, 4, 5, 6, 8],
                "validity": "1 month",
                "prices": {
                    "adult": {"3_days": 180, "5_days": 245, "8_days": 302},
                    "youth": {"3_days": 144, "5_days": 196, "8_days": 242}
                }
            },
            "select_pass": {
                "name": "Eurail Select Pass",
                "countries": "2-4 bordering countries",
                "travel_days": [5, 6, 8, 10],
                "validity": "2 months",
                "prices": {
                    "adult": {"2_countries_5_days": 270, "4_countries_10_days": 487},
                    "youth": {"2_countries_5_days": 216, "4_countries_10_days": 390}
                }
            }
        }
    
    async def validate_pass_for_journey(
        self,
        pass_type: str,
        pass_details: Dict,
        journey: TrainOffer
    ) -> Tuple[bool, Optional[str]]:
        """Validate if a pass can be used for a journey"""
        
        # Check if journey is within pass validity
        if not self._check_pass_validity(pass_details, journey):
            return False, "Journey date outside pass validity"
        
        # Check if journey countries are covered
        if not self._check_country_coverage(pass_type, pass_details, journey):
            return False, "Journey includes countries not covered by pass"
        
        # Check if travel days are available
        if not self._check_travel_days(pass_details, journey):
            return False, "No travel days remaining on pass"
        
        # Check for required reservations
        reservation_required = self._check_reservation_requirements(journey)
        if reservation_required:
            return True, "Valid - Reservation required for some segments"
        
        return True, "Valid - No reservation required"
    
    def _check_pass_validity(self, pass_details: Dict, journey: TrainOffer) -> bool:
        """Check if journey is within pass validity period"""
        pass_start = datetime.fromisoformat(pass_details["validity_start"])
        pass_end = datetime.fromisoformat(pass_details["validity_end"])
        journey_date = journey.segments[0].departure_time
        
        return pass_start <= journey_date <= pass_end
    
    def _check_country_coverage(self, pass_type: str, pass_details: Dict, journey: TrainOffer) -> bool:
        """Check if journey countries are covered by pass"""
        journey_countries = set()
        for segment in journey.segments:
            journey_countries.add(segment.departure_station.country)
            journey_countries.add(segment.arrival_station.country)
        
        if pass_type == "global_pass":
            return True  # Covers all European countries
        elif pass_type == "one_country":
            pass_country = pass_details["country"]
            return len(journey_countries) == 1 and pass_country in journey_countries
        elif pass_type == "select_pass":
            pass_countries = set(pass_details["selected_countries"])
            return journey_countries.issubset(pass_countries)
        
        return False
    
    def _check_travel_days(self, pass_details: Dict, journey: TrainOffer) -> bool:
        """Check if travel days are available"""
        if pass_details.get("continuous", False):
            return True  # Continuous passes don't have travel day limits
        
        used_days = pass_details.get("used_travel_days", 0)
        total_days = pass_details.get("total_travel_days", 0)
        
        return used_days < total_days
    
    def _check_reservation_requirements(self, journey: TrainOffer) -> bool:
        """Check if reservation is required for any segment"""
        high_speed_trains = ["TGV", "Thalys", "Eurostar", "AVE", "ICE", "Frecciarossa"]
        
        for segment in journey.segments:
            if segment.train_type == TrainType.HIGH_SPEED:
                return True
            if any(train in segment.train_number for train in high_speed_trains):
                return True
        
        return False
    
    async def make_pass_reservation(
        self,
        pass_details: Dict,
        journey: TrainOffer,
        passengers: List[Dict]
    ) -> Dict:
        """Make seat reservation for pass holders"""
        
        reservation_data = {
            "journey_id": journey.offer_id,
            "pass_type": pass_details["pass_type"],
            "pass_number": pass_details["pass_number"],
            "passengers": passengers,
            "segments": []
        }
        
        # Identify segments requiring reservation
        for segment in journey.segments:
            if self._check_reservation_requirements(TrainOffer(
                offer_id="temp",
                segments=[segment],
                total_duration_minutes=segment.duration_minutes,
                connections=0,
                price={},
                availability=99,
                fare_type="pass",
                cancellation_policy="Pass terms",
                included_services=[]
            )):
                reservation_data["segments"].append({
                    "train_number": segment.train_number,
                    "departure": segment.departure_station.code,
                    "arrival": segment.arrival_station.code,
                    "departure_time": segment.departure_time.isoformat(),
                    "class": segment.travel_class.value
                })
        
        # Call Rail Europe API for reservation
        return await self.rail_api.create_booking(
            journey.offer_id,
            passengers,
            {"email": pass_details.get("holder_email")},
            {"type": "eurail_pass", "pass_number": pass_details["pass_number"]}
        )


# Export classes
__all__ = [
    'TrainClass',
    'TrainType',
    'PassengerType',
    'TrainStation',
    'TrainSegment',
    'TrainOffer',
    'RailEuropeAPI',
    'EurailPassManager'
]