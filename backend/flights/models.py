"""
Flight booking models for GDS and LCC integrations.
"""
from datetime import datetime, date
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field
from decimal import Decimal


class CabinClass(str, Enum):
    """Flight cabin classes."""
    ECONOMY = "economy"
    PREMIUM_ECONOMY = "premium_economy"
    BUSINESS = "business"
    FIRST = "first"


class FlightStatus(str, Enum):
    """Flight booking status."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    TICKETED = "ticketed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class SupplierType(str, Enum):
    """Supplier type."""
    GDS_AMADEUS = "gds_amadeus"
    GDS_SABRE = "gds_sabre"
    GDS_GALILEO = "gds_galileo"
    LCC_RYANAIR = "lcc_ryanair"
    LCC_EASYJET = "lcc_easyjet"
    LCC_VUELING = "lcc_vueling"
    LCC_WIZZAIR = "lcc_wizzair"


class Airport(BaseModel):
    """Airport information."""
    code: str = Field(..., description="IATA airport code", min_length=3, max_length=3)
    name: str = Field(..., description="Airport name")
    city: str = Field(..., description="City name")
    country: str = Field(..., description="Country code", min_length=2, max_length=2)
    timezone: str = Field(..., description="Timezone identifier")
    
    class Config:
        json_schema_extra = {
            "example": {
                "code": "MAD",
                "name": "Adolfo Suárez Madrid-Barajas Airport",
                "city": "Madrid",
                "country": "ES",
                "timezone": "Europe/Madrid"
            }
        }


class Airline(BaseModel):
    """Airline information."""
    code: str = Field(..., description="IATA airline code", min_length=2, max_length=2)
    name: str = Field(..., description="Airline name")
    logo_url: Optional[str] = Field(None, description="Airline logo URL")
    is_lcc: bool = Field(False, description="Is Low Cost Carrier")
    
    class Config:
        json_schema_extra = {
            "example": {
                "code": "IB",
                "name": "Iberia",
                "logo_url": "https://cdn.example.com/airlines/ib.png",
                "is_lcc": False
            }
        }


class FlightSegment(BaseModel):
    """Individual flight segment."""
    flight_number: str = Field(..., description="Flight number")
    airline: Airline = Field(..., description="Operating airline")
    
    departure_airport: Airport = Field(..., description="Departure airport")
    departure_time: datetime = Field(..., description="Departure time")
    departure_terminal: Optional[str] = Field(None, description="Departure terminal")
    
    arrival_airport: Airport = Field(..., description="Arrival airport")
    arrival_time: datetime = Field(..., description="Arrival time")
    arrival_terminal: Optional[str] = Field(None, description="Arrival terminal")
    
    duration_minutes: int = Field(..., description="Flight duration in minutes")
    aircraft_type: Optional[str] = Field(None, description="Aircraft type code")
    cabin_class: CabinClass = Field(..., description="Cabin class")
    
    booking_class: str = Field(..., description="Booking class code", min_length=1, max_length=2)
    fare_basis: str = Field(..., description="Fare basis code")
    
    baggage_allowance: Optional[str] = Field(None, description="Baggage allowance")
    meal_service: Optional[str] = Field(None, description="Meal service type")
    
    seats_available: Optional[int] = Field(None, description="Available seats")
    
    class Config:
        json_schema_extra = {
            "example": {
                "flight_number": "IB3201",
                "airline": {
                    "code": "IB",
                    "name": "Iberia",
                    "is_lcc": False
                },
                "departure_airport": {
                    "code": "MAD",
                    "name": "Madrid-Barajas",
                    "city": "Madrid",
                    "country": "ES",
                    "timezone": "Europe/Madrid"
                },
                "departure_time": "2025-11-15T10:30:00",
                "arrival_airport": {
                    "code": "BCN",
                    "name": "Barcelona-El Prat",
                    "city": "Barcelona",
                    "country": "ES",
                    "timezone": "Europe/Madrid"
                },
                "arrival_time": "2025-11-15T11:45:00",
                "duration_minutes": 75,
                "cabin_class": "economy",
                "booking_class": "Y",
                "fare_basis": "YOWES"
            }
        }


class FlightItinerary(BaseModel):
    """Complete flight itinerary (can be multi-leg)."""
    segments: List[FlightSegment] = Field(..., description="Flight segments")
    total_duration_minutes: int = Field(..., description="Total journey duration")
    stops: int = Field(..., description="Number of stops")
    overnight: bool = Field(False, description="Includes overnight layover")
    
    def calculate_layovers(self) -> List[int]:
        """Calculate layover times between segments."""
        layovers = []
        for i in range(len(self.segments) - 1):
            current_arrival = self.segments[i].arrival_time
            next_departure = self.segments[i + 1].departure_time
            layover_minutes = int((next_departure - current_arrival).total_seconds() / 60)
            layovers.append(layover_minutes)
        return layovers


class FareRules(BaseModel):
    """Fare rules and conditions."""
    refundable: bool = Field(..., description="Is refundable")
    changeable: bool = Field(..., description="Is changeable")
    
    refund_penalty: Optional[Decimal] = Field(None, description="Refund penalty amount")
    change_penalty: Optional[Decimal] = Field(None, description="Change penalty amount")
    
    cancellation_deadline: Optional[datetime] = Field(None, description="Cancellation deadline")
    change_deadline: Optional[datetime] = Field(None, description="Change deadline")
    
    baggage_included: bool = Field(True, description="Baggage included")
    baggage_count: Optional[int] = Field(None, description="Number of bags included")
    baggage_weight_kg: Optional[int] = Field(None, description="Baggage weight per bag")
    
    seat_selection_included: bool = Field(False, description="Seat selection included")
    meal_included: bool = Field(False, description="Meal included")
    
    penalty_currency: str = Field("EUR", description="Currency for penalties")
    
    rules_text: Optional[str] = Field(None, description="Full fare rules text")
    
    class Config:
        json_schema_extra = {
            "example": {
                "refundable": True,
                "changeable": True,
                "refund_penalty": "50.00",
                "change_penalty": "30.00",
                "baggage_included": True,
                "baggage_count": 1,
                "baggage_weight_kg": 23,
                "seat_selection_included": False,
                "meal_included": False,
                "penalty_currency": "EUR"
            }
        }


class Price(BaseModel):
    """Price breakdown."""
    base_fare: Decimal = Field(..., description="Base fare amount")
    taxes: Decimal = Field(..., description="Taxes and fees")
    total: Decimal = Field(..., description="Total price")
    currency: str = Field("EUR", description="Currency code", min_length=3, max_length=3)
    
    per_passenger: bool = Field(True, description="Price is per passenger")
    
    tax_breakdown: Optional[dict] = Field(None, description="Detailed tax breakdown")
    
    class Config:
        json_schema_extra = {
            "example": {
                "base_fare": "150.00",
                "taxes": "35.50",
                "total": "185.50",
                "currency": "EUR",
                "per_passenger": True
            }
        }


class FlightOffer(BaseModel):
    """Complete flight offer from supplier."""
    offer_id: str = Field(..., description="Unique offer identifier")
    supplier: SupplierType = Field(..., description="Supplier type")
    
    outbound: FlightItinerary = Field(..., description="Outbound journey")
    inbound: Optional[FlightItinerary] = Field(None, description="Return journey")
    
    price: Price = Field(..., description="Price information")
    fare_rules: FareRules = Field(..., description="Fare rules")
    
    valid_until: datetime = Field(..., description="Offer validity")
    instant_ticketing: bool = Field(False, description="Requires instant ticketing")
    
    seats_available: int = Field(..., description="Available seats", ge=1)
    
    class Config:
        json_schema_extra = {
            "example": {
                "offer_id": "AMD-12345-67890",
                "supplier": "gds_amadeus",
                "price": {
                    "base_fare": "150.00",
                    "taxes": "35.50",
                    "total": "185.50",
                    "currency": "EUR"
                },
                "valid_until": "2025-10-20T23:59:59",
                "seats_available": 9
            }
        }


class Passenger(BaseModel):
    """Passenger information."""
    type: str = Field(..., description="Passenger type (ADT/CHD/INF)")
    title: str = Field(..., description="Title (Mr/Mrs/Ms)")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    date_of_birth: date = Field(..., description="Date of birth")
    
    nationality: str = Field(..., description="Nationality country code", min_length=2, max_length=2)
    passport_number: Optional[str] = Field(None, description="Passport number")
    passport_expiry: Optional[date] = Field(None, description="Passport expiry date")
    
    email: str = Field(..., description="Email address")
    phone: str = Field(..., description="Phone number")
    
    frequent_flyer_number: Optional[str] = Field(None, description="Frequent flyer number")
    special_requests: Optional[List[str]] = Field(None, description="Special requests (meal, assistance, etc)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "type": "ADT",
                "title": "Mr",
                "first_name": "John",
                "last_name": "Doe",
                "date_of_birth": "1985-05-15",
                "nationality": "US",
                "email": "john.doe@example.com",
                "phone": "+1234567890"
            }
        }


class FlightSearchRequest(BaseModel):
    """Flight search request."""
    origin: str = Field(..., description="Origin airport code", min_length=3, max_length=3)
    destination: str = Field(..., description="Destination airport code", min_length=3, max_length=3)
    departure_date: date = Field(..., description="Departure date")
    return_date: Optional[date] = Field(None, description="Return date for round-trip")
    
    adults: int = Field(1, description="Number of adults", ge=1, le=9)
    children: int = Field(0, description="Number of children", ge=0, le=9)
    infants: int = Field(0, description="Number of infants", ge=0, le=9)
    
    cabin_class: CabinClass = Field(CabinClass.ECONOMY, description="Preferred cabin class")
    
    direct_only: bool = Field(False, description="Direct flights only")
    flexible_dates: bool = Field(False, description="Search flexible dates")
    
    preferred_airlines: Optional[List[str]] = Field(None, description="Preferred airline codes")
    excluded_airlines: Optional[List[str]] = Field(None, description="Excluded airline codes")
    
    max_stops: Optional[int] = Field(None, description="Maximum number of stops", ge=0, le=3)
    max_duration_hours: Optional[int] = Field(None, description="Maximum duration in hours")
    
    currency: str = Field("EUR", description="Preferred currency", min_length=3, max_length=3)
    
    class Config:
        json_schema_extra = {
            "example": {
                "origin": "MAD",
                "destination": "BCN",
                "departure_date": "2025-11-15",
                "return_date": "2025-11-20",
                "adults": 2,
                "children": 0,
                "infants": 0,
                "cabin_class": "economy",
                "direct_only": False,
                "currency": "EUR"
            }
        }


class FlightBookingRequest(BaseModel):
    """Flight booking request."""
    offer_id: str = Field(..., description="Selected offer ID")
    passengers: List[Passenger] = Field(..., description="Passenger list")
    
    contact_email: str = Field(..., description="Contact email")
    contact_phone: str = Field(..., description="Contact phone")
    
    payment_method: str = Field(..., description="Payment method")
    payment_token: Optional[str] = Field(None, description="Payment token")
    
    special_requests: Optional[str] = Field(None, description="Special requests")
    
    class Config:
        json_schema_extra = {
            "example": {
                "offer_id": "AMD-12345-67890",
                "passengers": [],
                "contact_email": "contact@example.com",
                "contact_phone": "+1234567890",
                "payment_method": "credit_card"
            }
        }


class PNR(BaseModel):
    """Passenger Name Record."""
    pnr_number: str = Field(..., description="PNR/Booking reference")
    gds_pnr: Optional[str] = Field(None, description="GDS PNR if different")
    airline_pnr: Optional[str] = Field(None, description="Airline PNR")
    
    supplier: SupplierType = Field(..., description="Booking supplier")
    status: FlightStatus = Field(..., description="Booking status")
    
    itinerary: FlightItinerary = Field(..., description="Flight itinerary")
    passengers: List[Passenger] = Field(..., description="Passenger list")
    
    price: Price = Field(..., description="Total price")
    fare_rules: FareRules = Field(..., description="Fare rules")
    
    ticket_numbers: Optional[List[str]] = Field(None, description="Ticket numbers")
    
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    ticketed_at: Optional[datetime] = Field(None, description="Ticketing timestamp")
    
    time_limit: Optional[datetime] = Field(None, description="Ticketing time limit")
    
    class Config:
        json_schema_extra = {
            "example": {
                "pnr_number": "ABC123",
                "supplier": "gds_amadeus",
                "status": "confirmed",
                "created_at": "2025-10-18T10:00:00"
            }
        }


class FlightSearchResponse(BaseModel):
    """Flight search response."""
    search_id: str = Field(..., description="Search session ID")
    offers: List[FlightOffer] = Field(..., description="Available flight offers")
    total_results: int = Field(..., description="Total results found")
    search_time_ms: int = Field(..., description="Search time in milliseconds")
    
    class Config:
        json_schema_extra = {
            "example": {
                "search_id": "SRC-2025-1018-001",
                "offers": [],
                "total_results": 25,
                "search_time_ms": 1250
            }
        }


class FlightBookingResponse(BaseModel):
    """Flight booking response."""
    booking_id: str = Field(..., description="Internal booking ID")
    pnr: PNR = Field(..., description="PNR details")
    success: bool = Field(..., description="Booking successful")
    message: Optional[str] = Field(None, description="Response message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "booking_id": "BKG-2025-1018-001",
                "success": True,
                "message": "Booking confirmed successfully"
            }
        }
