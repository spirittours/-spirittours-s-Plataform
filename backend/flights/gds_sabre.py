"""
Sabre GDS Integration.

Provides flight search, booking, and ticketing through Sabre API.
"""
import asyncio
import httpx
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import base64

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


class SabreGDSConnector:
    """
    Sabre GDS API Connector.
    
    Implements flight search, booking, and PNR management through Sabre.
    """
    
    BASE_URL = "https://api.havail.sabre.com"
    AUTH_URL = "https://api.havail.sabre.com/v2/auth/token"
    
    def __init__(self, client_id: str, client_secret: str, pcc: str = "1234"):
        """
        Initialize Sabre connector.
        
        Args:
            client_id: Sabre client ID
            client_secret: Sabre client secret
            pcc: Pseudo City Code (optional)
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.pcc = pcc
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        
    async def _get_access_token(self) -> str:
        """
        Get or refresh access token using Base64 encoded credentials.
        
        Returns:
            Access token string
        """
        # Check if token is still valid
        if self.access_token and self.token_expires_at:
            if datetime.utcnow() < self.token_expires_at - timedelta(minutes=5):
                return self.access_token
        
        # Create Base64 encoded credentials
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        # Get new token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.AUTH_URL,
                headers={
                    "Authorization": f"Basic {encoded_credentials}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={"grant_type": "client_credentials"}
            )
            response.raise_for_status()
            data = response.json()
            
            self.access_token = data["access_token"]
            expires_in = data.get("expires_in", 3600)
            self.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            
            logger.info("Sabre access token refreshed")
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
        headers["Content-Type"] = "application/json"
        
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
    
    def _parse_cabin_class(self, sabre_class: str) -> CabinClass:
        """Parse Sabre cabin class to our enum."""
        mapping = {
            "Y": CabinClass.ECONOMY,
            "S": CabinClass.PREMIUM_ECONOMY,
            "C": CabinClass.BUSINESS,
            "F": CabinClass.FIRST
        }
        return mapping.get(sabre_class, CabinClass.ECONOMY)
    
    def _get_sabre_cabin_code(self, cabin_class: CabinClass) -> str:
        """Convert our cabin class to Sabre code."""
        mapping = {
            CabinClass.ECONOMY: "Y",
            CabinClass.PREMIUM_ECONOMY: "S",
            CabinClass.BUSINESS: "C",
            CabinClass.FIRST: "F"
        }
        return mapping.get(cabin_class, "Y")
    
    def _parse_flight_segment(self, segment_data: Dict) -> FlightSegment:
        """
        Parse Sabre segment data to FlightSegment.
        
        Args:
            segment_data: Sabre segment dict
            
        Returns:
            FlightSegment object
        """
        departure = segment_data["DepartureAirport"]
        arrival = segment_data["ArrivalAirport"]
        
        return FlightSegment(
            flight_number=f"{segment_data['MarketingCarrier']['Code']}{segment_data['MarketingCarrier']['FlightNumber']}",
            airline=Airline(
                code=segment_data["MarketingCarrier"]["Code"],
                name=segment_data["MarketingCarrier"].get("Name", "Unknown"),
                is_lcc=False  # GDS flights are typically not LCC
            ),
            departure_airport=Airport(
                code=departure["Code"],
                name=departure.get("Name", ""),
                city=departure.get("CityName", ""),
                country=departure.get("CountryCode", ""),
                timezone=departure.get("TimeZone", "UTC")
            ),
            departure_time=datetime.fromisoformat(segment_data["DepartureDateTime"].replace("Z", "+00:00")),
            departure_terminal=departure.get("Terminal"),
            arrival_airport=Airport(
                code=arrival["Code"],
                name=arrival.get("Name", ""),
                city=arrival.get("CityName", ""),
                country=arrival.get("CountryCode", ""),
                timezone=arrival.get("TimeZone", "UTC")
            ),
            arrival_time=datetime.fromisoformat(segment_data["ArrivalDateTime"].replace("Z", "+00:00")),
            arrival_terminal=arrival.get("Terminal"),
            duration_minutes=segment_data.get("JourneyDuration", 0),
            aircraft_type=segment_data.get("Equipment", {}).get("Code"),
            cabin_class=self._parse_cabin_class(segment_data.get("CabinType", "Y")),
            booking_class=segment_data.get("BookingClass", "Y"),
            fare_basis=segment_data.get("FareBasis", ""),
            baggage_allowance=segment_data.get("BaggageAllowance", {}).get("Description"),
            seats_available=segment_data.get("SeatsAvailable", 9)
        )
    
    def _parse_duration(self, duration_minutes: int) -> int:
        """
        Parse duration to minutes.
        
        Args:
            duration_minutes: Duration in minutes
            
        Returns:
            Duration in minutes
        """
        return duration_minutes
    
    def _parse_itinerary(self, segments_data: List[Dict]) -> FlightItinerary:
        """
        Parse Sabre itinerary to FlightItinerary.
        
        Args:
            segments_data: List of segment dicts
            
        Returns:
            FlightItinerary object
        """
        segments = [self._parse_flight_segment(seg) for seg in segments_data]
        
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
        """Parse Sabre price to Price object."""
        total_fare = float(price_data.get("TotalFare", {}).get("Amount", "0"))
        base_fare = float(price_data.get("BaseFare", {}).get("Amount", "0"))
        taxes = total_fare - base_fare
        
        return Price(
            base_fare=base_fare,
            taxes=taxes,
            total=total_fare,
            currency=price_data.get("TotalFare", {}).get("CurrencyCode", "EUR"),
            per_passenger=True,
            tax_breakdown=price_data.get("Taxes", [])
        )
    
    def _parse_fare_rules(self, rules_data: Dict) -> FareRules:
        """Parse Sabre fare conditions to FareRules."""
        penalties = rules_data.get("Penalties", {})
        
        return FareRules(
            refundable=not penalties.get("RefundPenalty", {}).get("Applies", True),
            changeable=not penalties.get("ChangePenalty", {}).get("Applies", True),
            refund_penalty=penalties.get("RefundPenalty", {}).get("Amount"),
            change_penalty=penalties.get("ChangePenalty", {}).get("Amount"),
            baggage_included=rules_data.get("BaggageAllowance", {}).get("Pieces", 0) > 0,
            baggage_count=rules_data.get("BaggageAllowance", {}).get("Pieces", 0),
            baggage_weight_kg=rules_data.get("BaggageAllowance", {}).get("Weight", 23),
            seat_selection_included=rules_data.get("SeatSelection", False),
            meal_included=rules_data.get("MealService", False),
            penalty_currency=penalties.get("Currency", "EUR"),
            rules_text=rules_data.get("RulesText")
        )
    
    async def search_flights(
        self, 
        request: FlightSearchRequest
    ) -> FlightSearchResponse:
        """
        Search flights through Sabre.
        
        Args:
            request: Flight search request
            
        Returns:
            Flight search response with offers
        """
        start_time = datetime.utcnow()
        
        # Build search request
        search_request = {
            "OTA_AirLowFareSearchRQ": {
                "Version": "1",
                "POS": {
                    "Source": [
                        {
                            "PseudoCityCode": self.pcc,
                            "RequestorID": {
                                "Type": "1",
                                "ID": "1",
                                "CompanyName": {
                                    "Code": "TN"
                                }
                            }
                        }
                    ]
                },
                "OriginDestinationInformation": [
                    {
                        "RPH": "1",
                        "DepartureDateTime": request.departure_date.isoformat(),
                        "OriginLocation": {"LocationCode": request.origin},
                        "DestinationLocation": {"LocationCode": request.destination}
                    }
                ],
                "TravelPreferences": {
                    "MaxStopsQuantity": 0 if request.direct_only else (request.max_stops or 3),
                    "CabinPref": [{"Cabin": self._get_sabre_cabin_code(request.cabin_class)}]
                },
                "TravelerInfoSummary": {
                    "AirTravelerAvail": [
                        {"PassengerTypeQuantity": {"Code": "ADT", "Quantity": request.adults}}
                    ]
                }
            }
        }
        
        # Add return date if round-trip
        if request.return_date:
            search_request["OTA_AirLowFareSearchRQ"]["OriginDestinationInformation"].append({
                "RPH": "2",
                "DepartureDateTime": request.return_date.isoformat(),
                "OriginLocation": {"LocationCode": request.destination},
                "DestinationLocation": {"LocationCode": request.origin}
            })
        
        # Add children if any
        if request.children > 0:
            search_request["OTA_AirLowFareSearchRQ"]["TravelerInfoSummary"]["AirTravelerAvail"].append(
                {"PassengerTypeQuantity": {"Code": "CHD", "Quantity": request.children}}
            )
        
        # Make API request
        try:
            data = await self._make_request(
                "POST",
                "/v1/shop/flights",
                json=search_request
            )
            
            # Parse offers
            offers = []
            itineraries = data.get("OTA_AirLowFareSearchRS", {}).get("PricedItineraries", {}).get("PricedItinerary", [])
            
            for itinerary_data in itineraries:
                try:
                    offer = self._parse_offer(itinerary_data)
                    offers.append(offer)
                except Exception as e:
                    logger.error(f"Error parsing offer: {e}")
                    continue
            
            search_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return FlightSearchResponse(
                search_id=f"SAB-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                offers=offers,
                total_results=len(offers),
                search_time_ms=search_time
            )
            
        except httpx.HTTPError as e:
            logger.error(f"Sabre API error: {e}")
            raise
    
    def _parse_offer(self, itinerary_data: Dict) -> FlightOffer:
        """Parse Sabre itinerary to FlightOffer."""
        air_itinerary = itinerary_data.get("AirItinerary", {})
        origin_dest_options = air_itinerary.get("OriginDestinationOptions", {}).get("OriginDestinationOption", [])
        
        # Parse outbound
        outbound_segments = origin_dest_options[0].get("FlightSegment", [])
        outbound = self._parse_itinerary(outbound_segments if isinstance(outbound_segments, list) else [outbound_segments])
        
        # Parse inbound if exists
        inbound = None
        if len(origin_dest_options) > 1:
            inbound_segments = origin_dest_options[1].get("FlightSegment", [])
            inbound = self._parse_itinerary(inbound_segments if isinstance(inbound_segments, list) else [inbound_segments])
        
        # Parse price
        fare_info = itinerary_data.get("AirItineraryPricingInfo", {})
        price = self._parse_price(fare_info)
        
        # Parse fare rules
        fare_rules = self._parse_fare_rules(fare_info)
        
        # Generate unique offer ID
        offer_id = f"SAB-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}"
        
        valid_until = datetime.utcnow() + timedelta(hours=24)
        
        return FlightOffer(
            offer_id=offer_id,
            supplier=SupplierType.GDS_SABRE,
            outbound=outbound,
            inbound=inbound,
            price=price,
            fare_rules=fare_rules,
            valid_until=valid_until,
            instant_ticketing=False,
            seats_available=9  # Default value
        )
    
    async def create_booking(
        self, 
        request: FlightBookingRequest
    ) -> FlightBookingResponse:
        """
        Create flight booking through Sabre.
        
        Args:
            request: Flight booking request
            
        Returns:
            Flight booking response with PNR
        """
        # Build booking request
        booking_request = {
            "CreatePassengerNameRecordRQ": {
                "version": "2.3.0",
                "haltOnAirPriceError": True,
                "TravelItineraryAddInfo": {
                    "AgencyInfo": {
                        "Address": {
                            "AddressLine": "Spirit Tours",
                            "CityName": "Madrid",
                            "CountryCode": "ES",
                            "PostalCode": "28001",
                            "StateCountyProv": {"StateCode": "MD"}
                        },
                        "Ticketing": {"TicketType": "7TAW"}
                    },
                    "CustomerInfo": {
                        "ContactNumbers": {
                            "ContactNumber": [
                                {
                                    "Phone": request.contact_phone,
                                    "PhoneUseType": "H"
                                }
                            ]
                        },
                        "Email": [
                            {
                                "Address": request.contact_email,
                                "Type": "TO"
                            }
                        ],
                        "PersonName": [
                            {
                                "GivenName": p.first_name,
                                "Surname": p.last_name,
                                "NameNumber": str(i + 1) + ".1",
                                "PassengerType": p.type
                            }
                            for i, p in enumerate(request.passengers)
                        ]
                    }
                },
                "AirBook": {
                    "OriginDestinationInformation": {
                        "FlightSegment": []  # Would be populated with actual segment data
                    }
                },
                "AirPrice": {
                    "PriceRequestInformation": {
                        "Retain": True,
                        "OptionalQualifiers": {
                            "PricingQualifiers": {
                                "CurrencyCode": "EUR"
                            }
                        }
                    }
                },
                "PostProcessing": {
                    "EndTransaction": {
                        "Source": {"ReceivedFrom": "Spirit Tours API"}
                    }
                }
            }
        }
        
        try:
            # Create booking
            response = await self._make_request(
                "POST",
                "/v2.3.0/passenger/records",
                json=booking_request
            )
            
            # Parse PNR
            pnr = self._parse_booking_response(response)
            
            return FlightBookingResponse(
                booking_id=f"BKG-SAB-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                pnr=pnr,
                success=True,
                message="Booking created successfully"
            )
            
        except httpx.HTTPError as e:
            logger.error(f"Sabre booking error: {e}")
            return FlightBookingResponse(
                booking_id="",
                pnr=None,
                success=False,
                message=f"Booking failed: {str(e)}"
            )
    
    def _parse_booking_response(self, booking_data: Dict) -> PNR:
        """Parse Sabre booking response to PNR."""
        # Extract PNR from response
        pnr_data = booking_data.get("CreatePassengerNameRecordRS", {})
        application_results = pnr_data.get("ApplicationResults", {})
        
        # Get PNR number
        pnr_number = application_results.get("PNR", {}).get("RecordLocator", "")
        
        # Create minimal PNR (full parsing would require actual segment data)
        return PNR(
            pnr_number=pnr_number,
            gds_pnr=pnr_number,
            supplier=SupplierType.GDS_SABRE,
            status=FlightStatus.CONFIRMED,
            itinerary=FlightItinerary(
                segments=[],
                total_duration_minutes=0,
                stops=0,
                overnight=False
            ),
            passengers=[],
            price=Price(
                base_fare=0,
                taxes=0,
                total=0,
                currency="EUR",
                per_passenger=True
            ),
            fare_rules=FareRules(
                refundable=False,
                changeable=False,
                baggage_included=False
            ),
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
            cancel_request = {
                "CancelPassengerNameRecordRQ": {
                    "version": "1.0.0",
                    "Locator": pnr_number
                }
            }
            
            await self._make_request(
                "POST",
                "/v1.0.0/passenger/records/cancel",
                json=cancel_request
            )
            return True
        except httpx.HTTPError as e:
            logger.error(f"Sabre cancellation error: {e}")
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
            retrieve_request = {
                "GetReservationRQ": {
                    "version": "1.19.0",
                    "Locator": pnr_number
                }
            }
            
            data = await self._make_request(
                "POST",
                "/v1.19.0/passenger/records/retrieve",
                json=retrieve_request
            )
            
            return self._parse_booking_response(data)
        except httpx.HTTPError as e:
            logger.error(f"Sabre retrieve booking error: {e}")
            return None
