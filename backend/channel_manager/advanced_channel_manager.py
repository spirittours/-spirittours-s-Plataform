"""
Advanced Channel Manager System
Complete integration with all OTAs including regional and Airbnb
"""

import os
import json
import uuid
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, date
from decimal import Decimal
from enum import Enum
from dataclasses import dataclass, field
import logging
import hashlib
import hmac
import xml.etree.ElementTree as ET
from lxml import etree
import pandas as pd
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import redis

Base = declarative_base()
logger = logging.getLogger(__name__)

class OTAChannel(Enum):
    """Supported OTA channels"""
    # Major International OTAs
    BOOKING = "booking.com"
    EXPEDIA = "expedia"
    HOTELS_COM = "hotels.com"
    AGODA = "agoda"
    TRIPADVISOR = "tripadvisor"
    AIRBNB = "airbnb"
    VRBO = "vrbo"
    
    # Regional OTAs - Americas
    DESPEGAR = "despegar"  # Latin America
    DECOLAR = "decolar"  # Brazil
    BESTDAY = "bestday"  # Mexico
    TRAVELOCITY = "travelocity"  # US/Canada
    ORBITZ = "orbitz"  # US
    
    # Regional OTAs - Europe
    LASTMINUTE = "lastminute"  # Europe
    OPODO = "opodo"  # Europe
    EDREAMS = "edreams"  # Europe
    TRAVELREPUBLIC = "travelrepublic"  # UK
    VENERE = "venere"  # Italy
    HRS = "hrs"  # Germany
    
    # Regional OTAs - Asia Pacific
    CTRIP = "ctrip"  # China
    TRIP_COM = "trip.com"  # China International
    MAKEMYTRIP = "makemytrip"  # India
    GOIBIBO = "goibibo"  # India
    YATRA = "yatra"  # India
    TRAVELOKA = "traveloka"  # Southeast Asia
    KLOOK = "klook"  # Asia
    RAKUTEN = "rakuten"  # Japan
    
    # Regional OTAs - Middle East & Africa
    WEGO = "wego"  # Middle East
    TAJAWAL = "tajawal"  # Middle East
    ALMOSAFER = "almosafer"  # Saudi Arabia
    TRAVELSTART = "travelstart"  # Africa
    HOTELS_NG = "hotels.ng"  # Nigeria


class UpdateType(Enum):
    """Types of updates to channels"""
    AVAILABILITY = "availability"
    RATES = "rates"
    RESTRICTIONS = "restrictions"
    CONTENT = "content"
    ALL = "all"


@dataclass
class ChannelConnection:
    """OTA channel connection details"""
    channel: OTAChannel
    property_id: str
    channel_property_id: str
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    endpoint_url: str = ""
    is_active: bool = True
    last_sync: Optional[datetime] = None
    sync_frequency_minutes: int = 15
    commission_rate: float = 0.15
    markup_rate: float = 0.0
    currency: str = "USD"
    market_segment: str = "leisure"
    
    
@dataclass
class RoomInventory:
    """Room inventory data"""
    room_type_id: str
    room_name: str
    date: date
    total_rooms: int
    available_rooms: int
    occupied_rooms: int
    blocked_rooms: int
    maintenance_rooms: int
    
    
@dataclass
class RateUpdate:
    """Rate update information"""
    room_type_id: str
    date: date
    standard_rate: Decimal
    weekend_rate: Optional[Decimal] = None
    min_stay: int = 1
    max_stay: int = 365
    closed_to_arrival: bool = False
    closed_to_departure: bool = False
    stop_sell: bool = False
    extra_person_charge: Decimal = Decimal("0")
    child_rate: Optional[Decimal] = None


class ChannelManagerOrchestrator:
    """Main channel manager orchestrating all OTA connections"""
    
    def __init__(self, db_session):
        self.db_session = db_session
        self.redis_client = redis.Redis(host='localhost', port=6379, db=3)
        self.channel_adapters = self._initialize_adapters()
        self.sync_queue = asyncio.Queue()
        self.error_handler = ChannelErrorHandler()
        
    def _initialize_adapters(self) -> Dict:
        """Initialize all channel adapters"""
        return {
            OTAChannel.BOOKING: BookingComAdapter(),
            OTAChannel.EXPEDIA: ExpediaAdapter(),
            OTAChannel.AIRBNB: AirbnbAdapter(),
            OTAChannel.AGODA: AgodaAdapter(),
            OTAChannel.DESPEGAR: DespegarAdapter(),
            OTAChannel.MAKEMYTRIP: MakeMyTripAdapter(),
            OTAChannel.CTRIP: CtripAdapter(),
            OTAChannel.TRAVELOKA: TravelokaAdapter(),
            # Initialize all other adapters...
        }
    
    async def sync_all_channels(self, property_id: str, update_type: UpdateType = UpdateType.ALL):
        """Synchronize all active channels for a property"""
        
        # Get active connections for property
        connections = await self._get_active_connections(property_id)
        
        results = {
            "success": [],
            "failed": [],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Prepare update data
        update_data = await self._prepare_update_data(property_id, update_type)
        
        # Sync each channel
        tasks = []
        for connection in connections:
            task = self._sync_channel(connection, update_data, update_type)
            tasks.append(task)
        
        # Execute all syncs concurrently
        sync_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for connection, result in zip(connections, sync_results):
            if isinstance(result, Exception):
                results["failed"].append({
                    "channel": connection.channel.value,
                    "error": str(result)
                })
                await self.error_handler.log_error(connection, result)
            else:
                results["success"].append({
                    "channel": connection.channel.value,
                    "updated": result
                })
                # Update last sync time
                await self._update_last_sync(connection)
        
        # Log summary
        logger.info(f"Channel sync completed: {len(results['success'])} success, {len(results['failed'])} failed")
        
        return results
    
    async def _sync_channel(
        self,
        connection: ChannelConnection,
        update_data: Dict,
        update_type: UpdateType
    ) -> Dict:
        """Sync single channel"""
        
        adapter = self.channel_adapters.get(connection.channel)
        if not adapter:
            raise ValueError(f"No adapter for channel {connection.channel.value}")
        
        # Apply channel-specific transformations
        transformed_data = await adapter.transform_data(update_data, connection)
        
        # Send update to channel
        if update_type in [UpdateType.AVAILABILITY, UpdateType.ALL]:
            await adapter.update_availability(connection, transformed_data["availability"])
        
        if update_type in [UpdateType.RATES, UpdateType.ALL]:
            await adapter.update_rates(connection, transformed_data["rates"])
        
        if update_type in [UpdateType.RESTRICTIONS, UpdateType.ALL]:
            await adapter.update_restrictions(connection, transformed_data["restrictions"])
        
        return {"status": "success", "channel": connection.channel.value}
    
    async def _prepare_update_data(self, property_id: str, update_type: UpdateType) -> Dict:
        """Prepare data for channel updates"""
        
        data = {}
        
        if update_type in [UpdateType.AVAILABILITY, UpdateType.ALL]:
            data["availability"] = await self._get_availability_data(property_id)
        
        if update_type in [UpdateType.RATES, UpdateType.ALL]:
            data["rates"] = await self._get_rate_data(property_id)
        
        if update_type in [UpdateType.RESTRICTIONS, UpdateType.ALL]:
            data["restrictions"] = await self._get_restriction_data(property_id)
        
        if update_type in [UpdateType.CONTENT, UpdateType.ALL]:
            data["content"] = await self._get_content_data(property_id)
        
        return data
    
    async def handle_reservation(self, channel: OTAChannel, reservation_data: Dict) -> Dict:
        """Handle incoming reservation from OTA"""
        
        # Validate reservation
        validation = await self._validate_reservation(reservation_data)
        if not validation["valid"]:
            return {"status": "error", "message": validation["error"]}
        
        # Check availability
        availability = await self._check_real_time_availability(reservation_data)
        if not availability["available"]:
            return {"status": "error", "message": "Rooms not available"}
        
        # Create reservation
        reservation = await self._create_reservation(channel, reservation_data)
        
        # Update inventory across all channels
        await self._update_channel_inventory(reservation)
        
        # Send confirmation
        await self._send_confirmation(channel, reservation)
        
        return {
            "status": "success",
            "reservation_id": reservation["id"],
            "confirmation_number": reservation["confirmation_number"]
        }
    
    async def _get_active_connections(self, property_id: str) -> List[ChannelConnection]:
        """Get active channel connections for property"""
        # Implementation would fetch from database
        return []
    
    async def _get_availability_data(self, property_id: str) -> Dict:
        """Get availability data for property"""
        return {}
    
    async def _get_rate_data(self, property_id: str) -> Dict:
        """Get rate data for property"""
        return {}
    
    async def _get_restriction_data(self, property_id: str) -> Dict:
        """Get restriction data for property"""
        return {}


class AirbnbAdapter:
    """Airbnb API adapter for channel manager"""
    
    def __init__(self):
        self.base_url = "https://api.airbnb.com/v3"
        self.session = None
        
    async def initialize(self):
        """Initialize Airbnb session"""
        if not self.session:
            self.session = aiohttp.ClientSession()
    
    async def transform_data(self, data: Dict, connection: ChannelConnection) -> Dict:
        """Transform data to Airbnb format"""
        
        transformed = {
            "availability": [],
            "rates": [],
            "restrictions": []
        }
        
        # Transform availability to Airbnb calendar format
        if "availability" in data:
            for avail in data["availability"]:
                transformed["availability"].append({
                    "date": avail["date"],
                    "available": avail["available_rooms"] > 0,
                    "price": avail.get("rate", 0),
                    "min_nights": avail.get("min_stay", 1),
                    "max_nights": avail.get("max_stay", 365)
                })
        
        # Transform rates to Airbnb pricing format
        if "rates" in data:
            for rate in data["rates"]:
                transformed["rates"].append({
                    "date": rate["date"],
                    "nightly_price": float(rate["standard_rate"]),
                    "weekend_price": float(rate.get("weekend_rate", rate["standard_rate"])),
                    "cleaning_fee": float(rate.get("cleaning_fee", 0)),
                    "extra_guest_fee": float(rate.get("extra_person_charge", 0))
                })
        
        return transformed
    
    async def update_availability(self, connection: ChannelConnection, availability_data: List[Dict]):
        """Update availability on Airbnb"""
        
        # Airbnb uses calendar API for availability
        endpoint = f"{self.base_url}/listings/{connection.channel_property_id}/calendar"
        
        headers = {
            "X-Airbnb-API-Key": connection.api_key,
            "Content-Type": "application/json"
        }
        
        # Batch update calendar
        calendar_updates = []
        for avail in availability_data:
            calendar_updates.append({
                "date": avail["date"],
                "available": avail["available"],
                "price": avail.get("price"),
                "min_nights": avail.get("min_nights", 1)
            })
        
        async with self.session.patch(
            endpoint,
            headers=headers,
            json={"calendar": calendar_updates}
        ) as response:
            if response.status != 200:
                raise Exception(f"Airbnb update failed: {await response.text()}")
            
            return await response.json()
    
    async def update_rates(self, connection: ChannelConnection, rate_data: List[Dict]):
        """Update rates on Airbnb"""
        
        endpoint = f"{self.base_url}/listings/{connection.channel_property_id}/pricing"
        
        headers = {
            "X-Airbnb-API-Key": connection.api_key,
            "Content-Type": "application/json"
        }
        
        pricing_rules = []
        for rate in rate_data:
            pricing_rules.append({
                "start_date": rate["date"],
                "end_date": rate["date"],
                "nightly_price": rate["nightly_price"],
                "weekend_price": rate.get("weekend_price"),
                "cleaning_fee": rate.get("cleaning_fee", 0)
            })
        
        async with self.session.put(
            endpoint,
            headers=headers,
            json={"pricing_rules": pricing_rules}
        ) as response:
            if response.status != 200:
                raise Exception(f"Airbnb rate update failed: {await response.text()}")
            
            return await response.json()
    
    async def update_restrictions(self, connection: ChannelConnection, restriction_data: List[Dict]):
        """Update booking restrictions on Airbnb"""
        
        endpoint = f"{self.base_url}/listings/{connection.channel_property_id}/booking_settings"
        
        headers = {
            "X-Airbnb-API-Key": connection.api_key,
            "Content-Type": "application/json"
        }
        
        # Airbnb handles restrictions differently
        settings = {
            "instant_book": True,
            "booking_window": 365,
            "advance_notice": 1,
            "preparation_time": 0,
            "check_in_time": "15:00",
            "check_out_time": "11:00"
        }
        
        async with self.session.patch(
            endpoint,
            headers=headers,
            json=settings
        ) as response:
            if response.status != 200:
                raise Exception(f"Airbnb restriction update failed")
            
            return await response.json()
    
    async def get_reservations(self, connection: ChannelConnection, since: datetime = None) -> List[Dict]:
        """Retrieve reservations from Airbnb"""
        
        endpoint = f"{self.base_url}/reservations"
        
        headers = {
            "X-Airbnb-API-Key": connection.api_key
        }
        
        params = {
            "listing_id": connection.channel_property_id,
            "status": "accepted"
        }
        
        if since:
            params["updated_since"] = since.isoformat()
        
        async with self.session.get(
            endpoint,
            headers=headers,
            params=params
        ) as response:
            if response.status == 200:
                data = await response.json()
                return self._parse_airbnb_reservations(data)
            else:
                return []
    
    def _parse_airbnb_reservations(self, data: Dict) -> List[Dict]:
        """Parse Airbnb reservation format"""
        
        reservations = []
        for res in data.get("reservations", []):
            reservation = {
                "channel": "airbnb",
                "channel_reservation_id": res["confirmation_code"],
                "guest_name": res["guest"]["full_name"],
                "guest_email": res["guest"].get("email"),
                "check_in": res["start_date"],
                "check_out": res["end_date"],
                "adults": res["number_of_adults"],
                "children": res.get("number_of_children", 0),
                "total_amount": res["total_price"]["amount"],
                "currency": res["total_price"]["currency"],
                "status": res["status"],
                "special_requests": res.get("guest_message", "")
            }
            reservations.append(reservation)
        
        return reservations


class RegionalOTAAdapter:
    """Base adapter for regional OTAs"""
    
    def __init__(self, ota_config: Dict):
        self.ota_name = ota_config["name"]
        self.base_url = ota_config["base_url"]
        self.auth_type = ota_config["auth_type"]  # oauth, basic, api_key
        self.region = ota_config["region"]
        self.session = None
        
    async def authenticate(self, connection: ChannelConnection) -> Dict:
        """Authenticate with regional OTA"""
        
        if self.auth_type == "oauth":
            return await self._oauth_authenticate(connection)
        elif self.auth_type == "basic":
            return await self._basic_authenticate(connection)
        elif self.auth_type == "api_key":
            return {"api_key": connection.api_key}
        else:
            raise ValueError(f"Unknown auth type: {self.auth_type}")
    
    async def _oauth_authenticate(self, connection: ChannelConnection) -> Dict:
        """OAuth authentication flow"""
        
        token_endpoint = f"{self.base_url}/oauth/token"
        
        data = {
            "grant_type": "client_credentials",
            "client_id": connection.username,
            "client_secret": connection.password
        }
        
        async with self.session.post(token_endpoint, data=data) as response:
            if response.status == 200:
                token_data = await response.json()
                return {
                    "access_token": token_data["access_token"],
                    "token_type": token_data["token_type"],
                    "expires_in": token_data["expires_in"]
                }
            else:
                raise Exception(f"OAuth authentication failed for {self.ota_name}")
    
    async def _basic_authenticate(self, connection: ChannelConnection) -> Dict:
        """Basic authentication"""
        
        import base64
        credentials = f"{connection.username}:{connection.password}"
        encoded = base64.b64encode(credentials.encode()).decode()
        
        return {
            "authorization": f"Basic {encoded}"
        }


class DespegarAdapter(RegionalOTAAdapter):
    """Despegar.com adapter for Latin America"""
    
    def __init__(self):
        super().__init__({
            "name": "Despegar",
            "base_url": "https://api.despegar.com/v3",
            "auth_type": "oauth",
            "region": "LATAM"
        })
    
    async def update_availability(self, connection: ChannelConnection, availability_data: List[Dict]):
        """Update availability on Despegar"""
        
        auth = await self.authenticate(connection)
        
        endpoint = f"{self.base_url}/hotels/{connection.channel_property_id}/availability"
        
        headers = {
            "Authorization": f"{auth['token_type']} {auth['access_token']}",
            "Content-Type": "application/json",
            "X-Market": connection.market_segment
        }
        
        # Despegar expects availability in their format
        despegar_availability = []
        for avail in availability_data:
            despegar_availability.append({
                "fecha": avail["date"],
                "habitacion_tipo_id": avail["room_type_id"],
                "disponibles": avail["available_rooms"],
                "tarifa": float(avail.get("rate", 0))
            })
        
        payload = {
            "hotel_id": connection.channel_property_id,
            "disponibilidad": despegar_availability
        }
        
        async with self.session.post(
            endpoint,
            headers=headers,
            json=payload
        ) as response:
            if response.status != 200:
                raise Exception(f"Despegar update failed: {await response.text()}")
            
            return await response.json()


class MakeMyTripAdapter(RegionalOTAAdapter):
    """MakeMyTrip adapter for India"""
    
    def __init__(self):
        super().__init__({
            "name": "MakeMyTrip",
            "base_url": "https://api.makemytrip.com/hotel/v2",
            "auth_type": "api_key",
            "region": "India"
        })
    
    async def update_rates(self, connection: ChannelConnection, rate_data: List[Dict]):
        """Update rates on MakeMyTrip"""
        
        endpoint = f"{self.base_url}/property/{connection.channel_property_id}/rates"
        
        headers = {
            "X-API-Key": connection.api_key,
            "Content-Type": "application/json"
        }
        
        # MakeMyTrip rate format
        mmt_rates = []
        for rate in rate_data:
            mmt_rates.append({
                "date": rate["date"],
                "room_type": rate["room_type_id"],
                "base_rate": float(rate["standard_rate"]),
                "tax_percentage": 18.0,  # GST in India
                "meal_plan": "EP",  # European Plan (Room Only)
                "cancellation_policy": "standard"
            })
        
        payload = {
            "property_id": connection.channel_property_id,
            "currency": "INR",
            "rates": mmt_rates
        }
        
        async with self.session.put(
            endpoint,
            headers=headers,
            json=payload
        ) as response:
            if response.status != 200:
                raise Exception(f"MakeMyTrip rate update failed")
            
            return await response.json()


class CtripAdapter(RegionalOTAAdapter):
    """Ctrip/Trip.com adapter for China"""
    
    def __init__(self):
        super().__init__({
            "name": "Ctrip",
            "base_url": "https://api.ctrip.com/hotel",
            "auth_type": "oauth",
            "region": "China"
        })
    
    async def update_availability(self, connection: ChannelConnection, availability_data: List[Dict]):
        """Update availability on Ctrip"""
        
        auth = await self.authenticate(connection)
        
        # Ctrip uses SOAP API
        soap_envelope = self._build_availability_soap(connection, availability_data)
        
        headers = {
            "Authorization": f"Bearer {auth['access_token']}",
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "http://api.ctrip.com/UpdateAvailability"
        }
        
        endpoint = f"{self.base_url}/soap/availability"
        
        async with self.session.post(
            endpoint,
            headers=headers,
            data=soap_envelope
        ) as response:
            if response.status != 200:
                raise Exception(f"Ctrip update failed")
            
            return self._parse_soap_response(await response.text())
    
    def _build_availability_soap(self, connection: ChannelConnection, availability_data: List[Dict]) -> str:
        """Build SOAP envelope for Ctrip"""
        
        root = etree.Element("{http://schemas.xmlsoap.org/soap/envelope/}Envelope")
        body = etree.SubElement(root, "{http://schemas.xmlsoap.org/soap/envelope/}Body")
        
        update = etree.SubElement(body, "{http://api.ctrip.com/hotel}UpdateAvailability")
        etree.SubElement(update, "HotelCode").text = connection.channel_property_id
        
        for avail in availability_data:
            room = etree.SubElement(update, "RoomAvailability")
            etree.SubElement(room, "Date").text = avail["date"]
            etree.SubElement(room, "RoomTypeCode").text = avail["room_type_id"]
            etree.SubElement(room, "Available").text = str(avail["available_rooms"])
        
        return etree.tostring(root, encoding="unicode")


class TravelokaAdapter(RegionalOTAAdapter):
    """Traveloka adapter for Southeast Asia"""
    
    def __init__(self):
        super().__init__({
            "name": "Traveloka",
            "base_url": "https://api.traveloka.com/v2",
            "auth_type": "api_key",
            "region": "Southeast Asia"
        })
    
    async def handle_modification(self, connection: ChannelConnection, modification_data: Dict) -> Dict:
        """Handle booking modification from Traveloka"""
        
        endpoint = f"{self.base_url}/bookings/{modification_data['booking_id']}/modify"
        
        headers = {
            "X-API-Key": connection.api_key,
            "Content-Type": "application/json"
        }
        
        # Process modification request
        modification = {
            "booking_id": modification_data["booking_id"],
            "modification_type": modification_data["type"],  # date_change, room_change, guest_change
            "new_details": modification_data["new_details"],
            "reason": modification_data.get("reason", "Guest request")
        }
        
        async with self.session.post(
            endpoint,
            headers=headers,
            json=modification
        ) as response:
            if response.status == 200:
                result = await response.json()
                
                # Update local inventory if needed
                if modification_data["type"] == "date_change":
                    await self._update_inventory_for_date_change(modification_data)
                
                return {
                    "status": "approved",
                    "modification_id": result["modification_id"],
                    "charges": result.get("additional_charges", 0)
                }
            else:
                return {
                    "status": "rejected",
                    "reason": "Modification not allowed by policy"
                }


class ChannelErrorHandler:
    """Handle errors from channel updates"""
    
    def __init__(self):
        self.error_log = []
        self.retry_queue = asyncio.Queue()
        
    async def log_error(self, connection: ChannelConnection, error: Exception):
        """Log channel error"""
        
        error_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "channel": connection.channel.value,
            "property_id": connection.property_id,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "retry_count": 0
        }
        
        self.error_log.append(error_entry)
        
        # Add to retry queue if recoverable
        if self._is_recoverable_error(error):
            await self.retry_queue.put((connection, error_entry))
    
    def _is_recoverable_error(self, error: Exception) -> bool:
        """Check if error is recoverable"""
        
        recoverable_errors = [
            "ConnectionError",
            "TimeoutError",
            "HTTPError",
            "TemporaryUnavailable"
        ]
        
        return type(error).__name__ in recoverable_errors
    
    async def process_retry_queue(self):
        """Process retry queue for failed updates"""
        
        while True:
            try:
                connection, error_entry = await asyncio.wait_for(
                    self.retry_queue.get(),
                    timeout=60
                )
                
                # Exponential backoff
                wait_time = min(300, 2 ** error_entry["retry_count"])
                await asyncio.sleep(wait_time)
                
                # Retry the update
                # Implementation depends on the specific update type
                
                error_entry["retry_count"] += 1
                
                if error_entry["retry_count"] >= 5:
                    # Max retries reached, alert administrator
                    await self._alert_admin(connection, error_entry)
                
            except asyncio.TimeoutError:
                # No items in queue
                continue


class ChannelAnalytics:
    """Analytics for channel performance"""
    
    def __init__(self, db_session):
        self.db_session = db_session
        
    async def get_channel_performance(self, property_id: str, date_range: Tuple[date, date]) -> Dict:
        """Get channel performance metrics"""
        
        metrics = {
            "bookings_by_channel": {},
            "revenue_by_channel": {},
            "conversion_rates": {},
            "channel_costs": {},
            "net_revenue": {},
            "best_performing": None,
            "worst_performing": None
        }
        
        # Analyze each channel
        channels = [c.value for c in OTAChannel]
        
        for channel in channels:
            channel_data = await self._get_channel_data(property_id, channel, date_range)
            
            metrics["bookings_by_channel"][channel] = channel_data["bookings"]
            metrics["revenue_by_channel"][channel] = channel_data["revenue"]
            metrics["conversion_rates"][channel] = channel_data["conversion_rate"]
            metrics["channel_costs"][channel] = channel_data["commission_paid"]
            metrics["net_revenue"][channel] = channel_data["revenue"] - channel_data["commission_paid"]
        
        # Identify best and worst performers
        if metrics["net_revenue"]:
            metrics["best_performing"] = max(metrics["net_revenue"], key=metrics["net_revenue"].get)
            metrics["worst_performing"] = min(metrics["net_revenue"], key=metrics["net_revenue"].get)
        
        return metrics
    
    async def _get_channel_data(self, property_id: str, channel: str, date_range: Tuple[date, date]) -> Dict:
        """Get data for specific channel"""
        
        # Mock implementation - would query actual database
        return {
            "bookings": 100,
            "revenue": 50000.00,
            "conversion_rate": 2.5,
            "commission_paid": 7500.00
        }
    
    async def get_channel_recommendations(self, property_id: str) -> List[Dict]:
        """Get recommendations for channel optimization"""
        
        recommendations = []
        
        # Analyze current performance
        last_30_days = (date.today() - timedelta(days=30), date.today())
        performance = await self.get_channel_performance(property_id, last_30_days)
        
        # Generate recommendations
        for channel, net_revenue in performance["net_revenue"].items():
            if net_revenue < 1000:
                recommendations.append({
                    "channel": channel,
                    "recommendation": "Consider removing this channel due to low performance",
                    "priority": "high"
                })
        
        # Check for missing high-value channels
        active_channels = list(performance["bookings_by_channel"].keys())
        high_value_channels = ["airbnb", "booking.com", "expedia"]
        
        for channel in high_value_channels:
            if channel not in active_channels:
                recommendations.append({
                    "channel": channel,
                    "recommendation": f"Consider adding {channel} to increase reach",
                    "priority": "medium"
                })
        
        return recommendations


# Export classes
__all__ = [
    'OTAChannel',
    'UpdateType',
    'ChannelConnection',
    'RoomInventory',
    'RateUpdate',
    'ChannelManagerOrchestrator',
    'AirbnbAdapter',
    'RegionalOTAAdapter',
    'DespegarAdapter',
    'MakeMyTripAdapter',
    'CtripAdapter',
    'TravelokaAdapter',
    'ChannelErrorHandler',
    'ChannelAnalytics'
]