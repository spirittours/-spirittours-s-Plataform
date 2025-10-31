"""
Amadeus GDS Integration.

Provides flight search, booking, and ticketing through Amadeus API.
"""
import asyncio
import httpx
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from .models import (
    FlightSearchRequest,
    FlightSearchResponse,
    FlightOffer,
    FlightBookingRequest,
    FlightBookingResponse,
    PNR,
    SupplierType,
    FlightSegment,
    FlightItinerary,
    Airport,
    Airline,
    Price,
    FareRules,
    CabinClass,
    FlightStatus
)

logger = logging.getLogger(__name__)


class AmadeusGDSConnector:
    """
    Amadeus GDS API Connector.
    
    Implements flight search, booking, and PNR management through Amadeus.
    """
    
    BASE_URL = "https://api.amadeus.com/v2"
    AUTH_URL = "https://api.amadeus.com/v1/security/oauth2/token"
    
    def __init__(self, api_key: str, api_secret: str):
        """
        Initialize Amadeus connector.
        
        Args:
            api_key: Amadeus API key
            api_secret: Amadeus API secret
        """
        self.api_key = api_key
        self.api_secret = api_secret
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        
    async def _get_access_token(self) -> str:
        """
        Get or refresh OAuth2 access token.
        
        Returns:
            Access token string
        """
        # Check if token is still valid
        if self.access_token and self.token_expires_at:
            if datetime.utcnow() < self.token_expires_at - timedelta(minutes=5):
                return self.access_token
        
        # Get new token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.AUTH_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.api_key,
                    "client_secret": self.api_secret
                }
            )
            response.raise_for_status()
            data = response.json()
            
            self.access_token = data["access_token"]
            expires_in = data.get("expires_in", 1799)
            self.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            
            logger.info("Amadeus access token refreshed")
            return self.access_token
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        **kwargs
    ) -> Dict[str, Any]:
        """
        Make authenticated API request.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            **kwargs: Additional request parameters
            
        Returns:
            Response data dict
        """
        token = await self._get_access_token()
        
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {token}"
        
        url = f"{self.BASE_URL}{endpoint}"
        
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method, 
                url, 
                headers=headers, 
                timeout=30.0,
                **kwargs
            )
            response.raise_for_status()
            return response.json()
    
    def _parse_cabin_class(self, amadeus_class: str) -> CabinClass:
        """Parse Amadeus cabin class to our enum."""
        mapping = {
            "ECONOMY": CabinClass.ECONOMY,
            "PREMIUM_ECONOMY": CabinClass.PREMIUM_ECONOMY,
            "BUSINESS": CabinClass.BUSINESS,
            "FIRST": CabinClass.FIRST
        }
        return mapping.get(amadeus_class, CabinClass.ECONOMY)
    
    def _parse_flight_segment(self, segment_data: Dict) -> FlightSegment:
        """
        Parse Amadeus segment data to FlightSegment.
        
        Args:
            segment_data: Amadeus segment dict
            
        Returns:
            FlightSegment object
        """
        departure = segment_data["departure"]
        arrival = segment_data["arrival"]
        
        return FlightSegment(
            flight_number=segment_data["number"],
            airline=Airline(
                code=segment_data["carrierCode"],
                name=segment_data.get("operating", {}).get("carrierName", "Unknown"),
                is_lcc=False  # GDS flights are typically not LCC
            ),
            departure_airport=Airport(
                code=departure["iataCode"],
                name=departure.get("name", ""),
                city=departure.get("city", ""),
                country=departure.get("country", ""),
                timezone=departure.get("timezone", "UTC")
            ),
            departure_time=datetime.fromisoformat(departure["at"].replace("Z", "+00:00")),
            departure_terminal=departure.get("terminal"),
            arrival_airport=Airport(
                code=arrival["iataCode"],
                name=arrival.get("name", ""),
                city=arrival.get("city", ""),
                country=arrival.get("country", ""),
                timezone=arrival.get("timezone", "UTC")
            ),
            arrival_time=datetime.fromisoformat(arrival["at"].replace("Z", "+00:00")),
            arrival_terminal=arrival.get("terminal"),
            duration_minutes=self._parse_duration(segment_data["duration"]),
            aircraft_type=segment_data.get("aircraft", {}).get("code"),
            cabin_class=self._parse_cabin_class(segment_data.get("cabin", "ECONOMY")),
            booking_class=segment_data.get("bookingClass", "Y"),
            fare_basis=segment_data.get("fareBasis", ""),
            baggage_allowance=segment_data.get("baggageAllowance"),
            seats_available=segment_data.get("seatsAvailable", 9)
        )
    
    def _parse_duration(self, duration_str: str) -> int:
        """
        Parse ISO 8601 duration to minutes.
        
        Args:
            duration_str: Duration string like "PT2H30M"
            
        Returns:
            Duration in minutes
        """
        # Simple parser for PT#H#M format
        hours = 0
        minutes = 0
        
        if "H" in duration_str:
            hours_part = duration_str.split("PT")[1].split("H")[0]
            hours = int(hours_part)
        
        if "M" in duration_str:
            minutes_part = duration_str.split("H")[-1].split("M")[0] if "H" in duration_str else duration_str.split("PT")[1].split("M")[0]
            minutes = int(minutes_part)
        
        return hours * 60 + minutes
    
    def _parse_itinerary(self, itinerary_data: List[Dict]) -> FlightItinerary:
        """
        Parse Amadeus itinerary to FlightItinerary.
        
        Args:
            itinerary_data: List of segment dicts
            
        Returns:
            FlightItinerary object
        """
        segments = [self._parse_flight_segment(seg) for seg in itinerary_data]
        
        total_duration = sum(seg.duration_minutes for seg in segments)
        
        # Add layover times
        for i in range(len(segments) - 1):
            layover = (segments[i+1].departure_time - segments[i].arrival_time).total_seconds() / 60
            total_duration += int(layover)
        
        # Check for overnight layover
        overnight = False
        for i in range(len(segments) - 1):
            layover_hours = (segments[i+1].departure_time - segments[i].arrival_time).total_seconds() / 3600
            if layover_hours >= 6:  # Consider 6+ hours as potential overnight
                overnight = True
                break
        
        return FlightItinerary(
            segments=segments,
            total_duration_minutes=total_duration,
            stops=len(segments) - 1,
            overnight=overnight
        )
    
    def _parse_price(self, price_data: Dict) -> Price:
        """Parse Amadeus price to Price object."""
        return Price(
            base_fare=price_data.get("base", "0"),
            taxes=price_data.get("total", "0") - price_data.get("base", "0"),
            total=price_data.get("total", "0"),
            currency=price_data.get("currency", "EUR"),
            per_passenger=True,
            tax_breakdown=price_data.get("fees", [])
        )
    
    def _parse_fare_rules(self, rules_data: Dict) -> FareRules:
        """Parse Amadeus fare conditions to FareRules."""
        penalties = rules_data.get("penalties", {})
        
        return FareRules(
            refundable=penalties.get("refundable", False),
            changeable=penalties.get("changeable", False),
            refund_penalty=penalties.get("refundAmount"),
            change_penalty=penalties.get("changeAmount"),
            baggage_included=rules_data.get("includedCheckedBags", 0) > 0,
            baggage_count=rules_data.get("includedCheckedBags", 0),
            baggage_weight_kg=rules_data.get("includedCheckedBagsWeight", 23),
            seat_selection_included=rules_data.get("seatSelection", False),
            meal_included=rules_data.get("meal", False),
            penalty_currency=penalties.get("currency", "EUR"),
            rules_text=rules_data.get("fullRules")
        )
    
    async def search_flights(
        self, 
        request: FlightSearchRequest
    ) -> FlightSearchResponse:
        """
        Search flights through Amadeus.
        
        Args:
            request: Flight search request
            
        Returns:
            Flight search response with offers
        """
        start_time = datetime.utcnow()
        
        # Build search parameters
        params = {
            "originLocationCode": request.origin,
            "destinationLocationCode": request.destination,
            "departureDate": request.departure_date.isoformat(),
            "adults": request.adults,
            "children": request.children,
            "infants": request.infants,
            "travelClass": request.cabin_class.value.upper(),
            "currencyCode": request.currency,
            "max": 50  # Maximum results
        }
        
        if request.return_date:
            params["returnDate"] = request.return_date.isoformat()
        
        if request.direct_only:
            params["nonStop"] = True
        
        if request.max_stops is not None:
            params["maxStops"] = request.max_stops
        
        if request.preferred_airlines:
            params["includedAirlineCodes"] = ",".join(request.preferred_airlines)
        
        if request.excluded_airlines:
            params["excludedAirlineCodes"] = ",".join(request.excluded_airlines)
        
        # Make API request
        try:
            data = await self._make_request(
                "GET",
                "/shopping/flight-offers",
                params=params
            )
            
            # Parse offers
            offers = []
            for offer_data in data.get("data", []):
                try:
                    offer = self._parse_offer(offer_data)
                    offers.append(offer)
                except Exception as e:
                    logger.error(f"Error parsing offer: {e}")
                    continue
            
            search_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return FlightSearchResponse(
                search_id=f"AMD-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                offers=offers,
                total_results=len(offers),
                search_time_ms=search_time
            )
            
        except httpx.HTTPError as e:
            logger.error(f"Amadeus API error: {e}")
            raise
    
    def _parse_offer(self, offer_data: Dict) -> FlightOffer:
        """Parse Amadeus offer to FlightOffer."""
        itineraries = offer_data.get("itineraries", [])
        
        outbound = self._parse_itinerary(itineraries[0]["segments"])
        inbound = self._parse_itinerary(itineraries[1]["segments"]) if len(itineraries) > 1 else None
        
        price = self._parse_price(offer_data["price"])
        
        # Get first traveler pricing for fare rules
        traveler_pricings = offer_data.get("travelerPricings", [])
        fare_detail = traveler_pricings[0]["fareDetailsBySegment"][0] if traveler_pricings else {}
        
        fare_rules = self._parse_fare_rules(fare_detail)
        
        valid_until = datetime.utcnow() + timedelta(hours=24)
        if "lastTicketingDate" in offer_data:
            valid_until = datetime.fromisoformat(offer_data["lastTicketingDate"].replace("Z", "+00:00"))
        
        return FlightOffer(
            offer_id=offer_data["id"],
            supplier=SupplierType.GDS_AMADEUS,
            outbound=outbound,
            inbound=inbound,
            price=price,
            fare_rules=fare_rules,
            valid_until=valid_until,
            instant_ticketing=offer_data.get("instantTicketingRequired", False),
            seats_available=offer_data.get("numberOfBookableSeats", 9)
        )
    
    async def create_booking(
        self, 
        request: FlightBookingRequest
    ) -> FlightBookingResponse:
        """
        Create flight booking through Amadeus.
        
        Args:
            request: Flight booking request
            
        Returns:
            Flight booking response with PNR
        """
        # Build booking request
        booking_data = {
            "data": {
                "type": "flight-order",
                "flightOffers": [{"id": request.offer_id}],
                "travelers": [
                    {
                        "id": str(i+1),
                        "dateOfBirth": p.date_of_birth.isoformat(),
                        "name": {
                            "firstName": p.first_name,
                            "lastName": p.last_name
                        },
                        "gender": "MALE" if p.title == "Mr" else "FEMALE",
                        "contact": {
                            "emailAddress": p.email,
                            "phones": [{
                                "deviceType": "MOBILE",
                                "countryCallingCode": "34",
                                "number": p.phone
                            }]
                        },
                        "documents": [{
                            "documentType": "PASSPORT",
                            "number": p.passport_number,
                            "expiryDate": p.passport_expiry.isoformat() if p.passport_expiry else None,
                            "nationality": p.nationality,
                            "holder": True
                        }] if p.passport_number else []
                    }
                    for i, p in enumerate(request.passengers)
                ],
                "remarks": {
                    "general": [
                        {"subType": "GENERAL_MISCELLANEOUS", "text": request.special_requests}
                    ]
                } if request.special_requests else {},
                "ticketingAgreement": {
                    "option": "DELAY_TO_CANCEL",
                    "delay": "6D"
                },
                "contacts": [{
                    "addresseeName": {
                        "firstName": request.passengers[0].first_name,
                        "lastName": request.passengers[0].last_name
                    },
                    "companyName": "Spirit Tours",
                    "purpose": "STANDARD",
                    "phones": [{
                        "deviceType": "MOBILE",
                        "countryCallingCode": "34",
                        "number": request.contact_phone
                    }],
                    "emailAddress": request.contact_email
                }]
            }
        }
        
        try:
            # Create booking
            response = await self._make_request(
                "POST",
                "/booking/flight-orders",
                json=booking_data
            )
            
            # Parse PNR
            pnr = self._parse_booking_response(response["data"])
            
            return FlightBookingResponse(
                booking_id=f"BKG-AMD-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                pnr=pnr,
                success=True,
                message="Booking created successfully"
            )
            
        except httpx.HTTPError as e:
            logger.error(f"Amadeus booking error: {e}")
            return FlightBookingResponse(
                booking_id="",
                pnr=None,
                success=False,
                message=f"Booking failed: {str(e)}"
            )
    
    def _parse_booking_response(self, booking_data: Dict) -> PNR:
        """Parse Amadeus booking response to PNR."""
        # Parse itinerary
        itinerary_segments = []
        for segment in booking_data.get("flightOffers", [{}])[0].get("itineraries", [{}])[0].get("segments", []):
            itinerary_segments.append(self._parse_flight_segment(segment))
        
        itinerary = FlightItinerary(
            segments=itinerary_segments,
            total_duration_minutes=sum(s.duration_minutes for s in itinerary_segments),
            stops=len(itinerary_segments) - 1,
            overnight=False
        )
        
        # Parse price
        price_data = booking_data.get("flightOffers", [{}])[0].get("price", {})
        price = self._parse_price(price_data)
        
        # Parse fare rules
        fare_detail = booking_data.get("flightOffers", [{}])[0].get("travelerPricings", [{}])[0].get("fareDetailsBySegment", [{}])[0]
        fare_rules = self._parse_fare_rules(fare_detail)
        
        # Parse passengers (simplified)
        passengers = []  # Would need to parse from booking_data["travelers"]
        
        return PNR(
            pnr_number=booking_data.get("associatedRecords", [{}])[0].get("reference", ""),
            gds_pnr=booking_data.get("id"),
            supplier=SupplierType.GDS_AMADEUS,
            status=FlightStatus.CONFIRMED,
            itinerary=itinerary,
            passengers=passengers,
            price=price,
            fare_rules=fare_rules,
            time_limit=datetime.utcnow() + timedelta(hours=72)
        )
    
    async def cancel_booking(self, pnr_number: str) -> bool:
        """
        Cancel flight booking.
        
        Args:
            pnr_number: PNR/booking reference
            
        Returns:
            True if cancelled successfully
        """
        try:
            await self._make_request(
                "DELETE",
                f"/booking/flight-orders/{pnr_number}"
            )
            return True
        except httpx.HTTPError as e:
            logger.error(f"Amadeus cancellation error: {e}")
            return False
    
    async def get_booking_details(self, pnr_number: str) -> Optional[PNR]:
        """
        Retrieve booking details.
        
        Args:
            pnr_number: PNR/booking reference
            
        Returns:
            PNR object or None if not found
        """
        try:
            data = await self._make_request(
                "GET",
                f"/booking/flight-orders/{pnr_number}"
            )
            return self._parse_booking_response(data["data"])
        except httpx.HTTPError as e:
            logger.error(f"Amadeus retrieve booking error: {e}")
            return None
