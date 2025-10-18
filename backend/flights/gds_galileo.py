"""
Galileo GDS Integration.

Provides flight search, booking, and ticketing through Galileo API (Travelport Universal API).
"""
import asyncio
import httpx
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import xml.etree.ElementTree as ET

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


class GalileoGDSConnector:
    """
    Galileo (Travelport Universal API) GDS Connector.
    
    Implements flight search, booking, and PNR management through Galileo.
    """
    
    BASE_URL = "https://apac.universal-api.travelport.com/B2BGateway/connect/uAPI"
    
    # XML Namespaces
    NS = {
        "air": "http://www.travelport.com/schema/air_v52_0",
        "common": "http://www.travelport.com/schema/common_v52_0",
        "universal": "http://www.travelport.com/schema/universal_v52_0"
    }
    
    def __init__(self, username: str, password: str, branch: str, target_branch: str = None):
        """
        Initialize Galileo connector.
        
        Args:
            username: Travelport username
            password: Travelport password
            branch: Branch code
            target_branch: Target branch code (optional)
        """
        self.username = username
        self.password = password
        self.branch = branch
        self.target_branch = target_branch or branch
        self.auth = (username, password)
        
    async def _make_request(
        self, 
        service: str,
        xml_body: str
    ) -> str:
        """
        Make authenticated SOAP API request.
        
        Args:
            service: Service endpoint (e.g., 'AirService')
            xml_body: SOAP XML body
            
        Returns:
            Response XML string
        """
        url = f"{self.BASE_URL}/{service}"
        
        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": ""
        }
        
        async with httpx.AsyncClient(auth=self.auth) as client:
            response = await client.post(
                url,
                content=xml_body.encode('utf-8'),
                headers=headers,
                timeout=30.0
            )
            response.raise_for_status()
            return response.text
    
    def _parse_cabin_class(self, galileo_class: str) -> CabinClass:
        """Parse Galileo cabin class to our enum."""
        mapping = {
            "Economy": CabinClass.ECONOMY,
            "PremiumEconomy": CabinClass.PREMIUM_ECONOMY,
            "Business": CabinClass.BUSINESS,
            "First": CabinClass.FIRST
        }
        return mapping.get(galileo_class, CabinClass.ECONOMY)
    
    def _get_galileo_cabin_code(self, cabin_class: CabinClass) -> str:
        """Convert our cabin class to Galileo code."""
        mapping = {
            CabinClass.ECONOMY: "Economy",
            CabinClass.PREMIUM_ECONOMY: "PremiumEconomy",
            CabinClass.BUSINESS: "Business",
            CabinClass.FIRST: "First"
        }
        return mapping.get(cabin_class, "Economy")
    
    def _build_search_request_xml(self, request: FlightSearchRequest) -> str:
        """Build Galileo flight search XML request."""
        trace_id = f"GAL-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    <air:LowFareSearchReq xmlns:air="http://www.travelport.com/schema/air_v52_0" 
                          xmlns:com="http://www.travelport.com/schema/common_v52_0"
                          TraceId="{trace_id}"
                          TargetBranch="{self.target_branch}">
      <com:BillingPointOfSaleInfo OriginApplication="UAPI"/>
      <air:SearchAirLeg>
        <air:SearchOrigin>
          <com:Airport Code="{request.origin}"/>
        </air:SearchOrigin>
        <air:SearchDestination>
          <com:Airport Code="{request.destination}"/>
        </air:SearchDestination>
        <air:SearchDepTime PreferredTime="{request.departure_date.isoformat()}"/>
      </air:SearchAirLeg>"""
        
        # Add return leg if round-trip
        if request.return_date:
            xml += f"""
      <air:SearchAirLeg>
        <air:SearchOrigin>
          <com:Airport Code="{request.destination}"/>
        </air:SearchOrigin>
        <air:SearchDestination>
          <com:Airport Code="{request.origin}"/>
        </air:SearchDestination>
        <air:SearchDepTime PreferredTime="{request.return_date.isoformat()}"/>
      </air:SearchAirLeg>"""
        
        # Add passengers
        xml += f"""
      <air:AirSearchModifiers>
        <air:PreferredCabins>
          <com:CabinClass Type="{self._get_galileo_cabin_code(request.cabin_class)}"/>
        </air:PreferredCabins>"""
        
        if request.direct_only:
            xml += """
        <air:MaxStops Value="0"/>"""
        elif request.max_stops is not None:
            xml += f"""
        <air:MaxStops Value="{request.max_stops}"/>"""
        
        xml += """
      </air:AirSearchModifiers>"""
        
        # Add traveler counts
        for _ in range(request.adults):
            xml += """
      <com:SearchPassenger Code="ADT"/>"""
        
        for _ in range(request.children):
            xml += """
      <com:SearchPassenger Code="CNN"/>"""
        
        for _ in range(request.infants):
            xml += """
      <com:SearchPassenger Code="INF"/>"""
        
        xml += """
    </air:LowFareSearchReq>
  </soapenv:Body>
</soapenv:Envelope>"""
        
        return xml
    
    def _parse_xml_segment(self, segment_elem: ET.Element) -> FlightSegment:
        """Parse XML segment element to FlightSegment."""
        # Extract segment details
        carrier = segment_elem.get("Carrier", "")
        flight_number = segment_elem.get("FlightNumber", "")
        origin = segment_elem.get("Origin", "")
        destination = segment_elem.get("Destination", "")
        departure_time = segment_elem.get("DepartureTime", "")
        arrival_time = segment_elem.get("ArrivalTime", "")
        flight_time = int(segment_elem.get("FlightTime", "0"))
        
        return FlightSegment(
            flight_number=f"{carrier}{flight_number}",
            airline=Airline(
                code=carrier,
                name="Unknown",  # Would need airline lookup
                is_lcc=False
            ),
            departure_airport=Airport(
                code=origin,
                name="",
                city="",
                country="",
                timezone="UTC"
            ),
            departure_time=datetime.fromisoformat(departure_time.replace("Z", "+00:00")) if departure_time else datetime.utcnow(),
            departure_terminal=None,
            arrival_airport=Airport(
                code=destination,
                name="",
                city="",
                country="",
                timezone="UTC"
            ),
            arrival_time=datetime.fromisoformat(arrival_time.replace("Z", "+00:00")) if arrival_time else datetime.utcnow(),
            arrival_terminal=None,
            duration_minutes=flight_time,
            aircraft_type=segment_elem.get("Equipment"),
            cabin_class=self._parse_cabin_class(segment_elem.get("CabinClass", "Economy")),
            booking_class=segment_elem.get("BookingCode", "Y"),
            fare_basis=segment_elem.get("FareBasis", ""),
            baggage_allowance=None,
            seats_available=9
        )
    
    def _parse_xml_itinerary(self, journey_elem: ET.Element) -> FlightItinerary:
        """Parse XML journey element to FlightItinerary."""
        segments = []
        
        for segment_elem in journey_elem.findall(".//air:AirSegment", self.NS):
            segments.append(self._parse_xml_segment(segment_elem))
        
        total_duration = sum(seg.duration_minutes for seg in segments)
        
        # Add layover times
        for i in range(len(segments) - 1):
            layover = (segments[i+1].departure_time - segments[i].arrival_time).total_seconds() / 60
            total_duration += int(layover)
        
        # Check for overnight
        overnight = False
        for i in range(len(segments) - 1):
            layover_hours = (segments[i+1].departure_time - segments[i].arrival_time).total_seconds() / 3600
            if layover_hours >= 6:
                overnight = True
                break
        
        return FlightItinerary(
            segments=segments,
            total_duration_minutes=total_duration,
            stops=len(segments) - 1,
            overnight=overnight
        )
    
    def _parse_xml_price(self, pricing_elem: ET.Element) -> Price:
        """Parse XML pricing element to Price."""
        base_price = pricing_elem.get("BasePrice", "EUR0")
        total_price = pricing_elem.get("TotalPrice", "EUR0")
        taxes = pricing_elem.get("Taxes", "EUR0")
        
        # Extract amount and currency
        currency = base_price[:3]
        base_amount = float(base_price[3:]) if len(base_price) > 3 else 0.0
        total_amount = float(total_price[3:]) if len(total_price) > 3 else 0.0
        tax_amount = float(taxes[3:]) if len(taxes) > 3 else 0.0
        
        return Price(
            base_fare=base_amount,
            taxes=tax_amount,
            total=total_amount,
            currency=currency,
            per_passenger=True
        )
    
    async def search_flights(
        self, 
        request: FlightSearchRequest
    ) -> FlightSearchResponse:
        """
        Search flights through Galileo.
        
        Args:
            request: Flight search request
            
        Returns:
            Flight search response with offers
        """
        start_time = datetime.utcnow()
        
        # Build XML request
        xml_request = self._build_search_request_xml(request)
        
        try:
            # Make API request
            response_xml = await self._make_request("AirService", xml_request)
            
            # Parse XML response
            root = ET.fromstring(response_xml)
            
            # Extract pricing solutions
            offers = []
            for solution in root.findall(".//air:AirPricingSolution", self.NS):
                try:
                    offer = self._parse_xml_offer(solution, root)
                    offers.append(offer)
                except Exception as e:
                    logger.error(f"Error parsing Galileo offer: {e}")
                    continue
            
            search_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return FlightSearchResponse(
                search_id=f"GAL-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                offers=offers,
                total_results=len(offers),
                search_time_ms=search_time
            )
            
        except Exception as e:
            logger.error(f"Galileo API error: {e}")
            raise
    
    def _parse_xml_offer(self, solution_elem: ET.Element, root: ET.Element) -> FlightOffer:
        """Parse XML pricing solution to FlightOffer."""
        # Get journey references
        journey_refs = [ref.get("Key") for ref in solution_elem.findall(".//air:Journey", self.NS)]
        
        # Find journey elements
        journeys = []
        for journey_ref in journey_refs:
            for journey in root.findall(f".//air:AirSegmentList/air:AirSegment[@Key='{journey_ref}']", self.NS):
                journeys.append(journey)
        
        # Parse outbound and inbound
        if len(journeys) > 0:
            # Create itinerary from segments
            segments = []
            for segment_ref in solution_elem.findall(".//air:BookingInfo", self.NS):
                segment_key = segment_ref.get("SegmentRef")
                for seg in root.findall(f".//air:AirSegment[@Key='{segment_key}']", self.NS):
                    segments.append(self._parse_xml_segment(seg))
            
            # Split into outbound and inbound
            mid_point = len(segments) // 2 if len(journey_refs) > 1 else len(segments)
            outbound_segments = segments[:mid_point]
            inbound_segments = segments[mid_point:] if len(journey_refs) > 1 else []
            
            outbound = FlightItinerary(
                segments=outbound_segments,
                total_duration_minutes=sum(s.duration_minutes for s in outbound_segments),
                stops=len(outbound_segments) - 1,
                overnight=False
            )
            
            inbound = None
            if inbound_segments:
                inbound = FlightItinerary(
                    segments=inbound_segments,
                    total_duration_minutes=sum(s.duration_minutes for s in inbound_segments),
                    stops=len(inbound_segments) - 1,
                    overnight=False
                )
        else:
            # Fallback to empty itineraries
            outbound = FlightItinerary(segments=[], total_duration_minutes=0, stops=0, overnight=False)
            inbound = None
        
        # Parse price
        price = self._parse_xml_price(solution_elem)
        
        # Create basic fare rules
        fare_rules = FareRules(
            refundable=False,
            changeable=False,
            baggage_included=True,
            baggage_count=1,
            baggage_weight_kg=23,
            seat_selection_included=False,
            meal_included=False
        )
        
        offer_id = solution_elem.get("Key", f"GAL-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}")
        
        return FlightOffer(
            offer_id=offer_id,
            supplier=SupplierType.GDS_GALILEO,
            outbound=outbound,
            inbound=inbound,
            price=price,
            fare_rules=fare_rules,
            valid_until=datetime.utcnow() + timedelta(hours=24),
            instant_ticketing=False,
            seats_available=9
        )
    
    async def create_booking(
        self, 
        request: FlightBookingRequest
    ) -> FlightBookingResponse:
        """
        Create flight booking through Galileo.
        
        Args:
            request: Flight booking request
            
        Returns:
            Flight booking response with PNR
        """
        # Build booking XML request
        trace_id = f"GAL-BKG-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <univ:AirCreateReservationReq xmlns:univ="http://www.travelport.com/schema/universal_v52_0"
                                   xmlns:air="http://www.travelport.com/schema/air_v52_0"
                                   xmlns:com="http://www.travelport.com/schema/common_v52_0"
                                   TraceId="{trace_id}"
                                   TargetBranch="{self.target_branch}">
      <com:BillingPointOfSaleInfo OriginApplication="UAPI"/>"""
        
        # Add passengers
        for i, passenger in enumerate(request.passengers):
            xml += f"""
      <com:BookingTraveler Key="P{i}">
        <com:BookingTravelerName First="{passenger.first_name}" Last="{passenger.last_name}" Prefix="{passenger.title}"/>
        <com:PhoneNumber Number="{passenger.phone}"/>
        <com:Email EmailID="{passenger.email}"/>
      </com:BookingTraveler>"""
        
        # Add pricing solution reference (simplified)
        xml += f"""
      <air:AirPricingSolution Key="{request.offer_id}"/>
    </univ:AirCreateReservationReq>
  </soapenv:Body>
</soapenv:Envelope>"""
        
        try:
            # Create booking
            response_xml = await self._make_request("UniversalService", xml)
            
            # Parse PNR
            root = ET.fromstring(response_xml)
            pnr = self._parse_booking_response(root)
            
            return FlightBookingResponse(
                booking_id=f"BKG-GAL-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                pnr=pnr,
                success=True,
                message="Booking created successfully"
            )
            
        except Exception as e:
            logger.error(f"Galileo booking error: {e}")
            return FlightBookingResponse(
                booking_id="",
                pnr=None,
                success=False,
                message=f"Booking failed: {str(e)}"
            )
    
    def _parse_booking_response(self, root: ET.Element) -> PNR:
        """Parse Galileo booking XML response to PNR."""
        # Extract PNR locator code
        locator_elem = root.find(".//univ:UniversalRecord", self.NS)
        pnr_number = locator_elem.get("LocatorCode", "") if locator_elem is not None else ""
        
        # Create minimal PNR
        return PNR(
            pnr_number=pnr_number,
            gds_pnr=pnr_number,
            supplier=SupplierType.GDS_GALILEO,
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
            xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <univ:UniversalRecordCancelReq xmlns:univ="http://www.travelport.com/schema/universal_v52_0"
                                    xmlns:com="http://www.travelport.com/schema/common_v52_0"
                                    TargetBranch="{self.target_branch}">
      <com:BillingPointOfSaleInfo OriginApplication="UAPI"/>
      <univ:UniversalRecordLocatorCode>{pnr_number}</univ:UniversalRecordLocatorCode>
    </univ:UniversalRecordCancelReq>
  </soapenv:Body>
</soapenv:Envelope>"""
            
            await self._make_request("UniversalService", xml)
            return True
        except Exception as e:
            logger.error(f"Galileo cancellation error: {e}")
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
            xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <univ:UniversalRecordRetrieveReq xmlns:univ="http://www.travelport.com/schema/universal_v52_0"
                                      xmlns:com="http://www.travelport.com/schema/common_v52_0"
                                      TargetBranch="{self.target_branch}">
      <com:BillingPointOfSaleInfo OriginApplication="UAPI"/>
      <univ:UniversalRecordLocatorCode>{pnr_number}</univ:UniversalRecordLocatorCode>
    </univ:UniversalRecordRetrieveReq>
  </soapenv:Body>
</soapenv:Envelope>"""
            
            response_xml = await self._make_request("UniversalService", xml)
            root = ET.fromstring(response_xml)
            
            return self._parse_booking_response(root)
        except Exception as e:
            logger.error(f"Galileo retrieve booking error: {e}")
            return None
