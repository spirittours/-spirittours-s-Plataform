"""
FastAPI routes for flight booking.

Provides REST API endpoints for flight search, booking, and management.
"""
from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks
from typing import List, Optional
from datetime import date
import logging

from .models import (
    FlightSearchRequest,
    FlightSearchResponse,
    FlightOffer,
    FlightBookingRequest,
    FlightBookingResponse,
    PNR,
    SupplierType,
    CabinClass
)
from .booking_engine import FlightBookingEngine

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/flights", tags=["flights"])

# Initialize booking engine (would be injected via dependency in production)
# This is a placeholder - actual initialization should happen in main app startup
_booking_engine: Optional[FlightBookingEngine] = None


def get_booking_engine() -> FlightBookingEngine:
    """
    Dependency to get booking engine instance.
    
    Returns:
        FlightBookingEngine instance
    """
    if _booking_engine is None:
        raise HTTPException(
            status_code=500,
            detail="Flight booking engine not initialized"
        )
    return _booking_engine


def initialize_booking_engine(config: dict):
    """
    Initialize booking engine with configuration.
    
    Args:
        config: Configuration dict with supplier credentials
    """
    global _booking_engine
    _booking_engine = FlightBookingEngine(config)
    logger.info("Flight booking engine initialized")


@router.post("/search", response_model=FlightSearchResponse)
async def search_flights(
    request: FlightSearchRequest,
    suppliers: Optional[List[str]] = Query(None, description="Specific suppliers to query"),
    engine: FlightBookingEngine = Depends(get_booking_engine)
):
    """
    Search flights across multiple suppliers.
    
    **Parameters:**
    - `origin`: Origin airport IATA code (e.g., MAD)
    - `destination`: Destination airport IATA code (e.g., BCN)
    - `departure_date`: Departure date (YYYY-MM-DD)
    - `return_date`: Optional return date for round-trip
    - `adults`: Number of adult passengers (1-9)
    - `children`: Number of child passengers (0-9)
    - `infants`: Number of infant passengers (0-9)
    - `cabin_class`: Cabin class (economy, premium_economy, business, first)
    - `direct_only`: Only direct flights
    - `max_stops`: Maximum number of stops
    - `currency`: Currency code (EUR, USD, GBP, etc.)
    
    **Returns:**
    - List of flight offers sorted by price
    - Search metadata (search_id, total_results, search_time)
    """
    try:
        logger.info(
            f"Flight search: {request.origin} -> {request.destination}, "
            f"{request.departure_date}, {request.adults} adults"
        )
        
        response = await engine.search_flights(
            request=request,
            suppliers=suppliers
        )
        
        logger.info(f"Search completed: {response.total_results} offers in {response.search_time_ms}ms")
        
        return response
        
    except Exception as e:
        logger.error(f"Flight search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search/{search_id}/offers", response_model=List[FlightOffer])
async def get_search_offers(
    search_id: str,
    min_price: Optional[float] = Query(None, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, description="Maximum price filter"),
    max_stops: Optional[int] = Query(None, description="Maximum stops filter"),
    airlines: Optional[List[str]] = Query(None, description="Filter by airline codes"),
    cabin_class: Optional[CabinClass] = Query(None, description="Filter by cabin class")
):
    """
    Get filtered offers from a previous search.
    
    This endpoint would retrieve cached search results and apply filters.
    In production, search results would be cached in Redis.
    """
    # TODO: Implement search result caching and retrieval
    raise HTTPException(status_code=501, detail="Search result caching not yet implemented")


@router.post("/book", response_model=FlightBookingResponse)
async def create_booking(
    request: FlightBookingRequest,
    background_tasks: BackgroundTasks,
    engine: FlightBookingEngine = Depends(get_booking_engine)
):
    """
    Create flight booking.
    
    **Parameters:**
    - `offer_id`: Selected offer ID from search results
    - `passengers`: List of passenger details
    - `contact_email`: Contact email address
    - `contact_phone`: Contact phone number
    - `payment_method`: Payment method (credit_card, debit_card, etc.)
    - `special_requests`: Optional special requests
    
    **Returns:**
    - Booking confirmation with PNR
    - Success status and message
    """
    try:
        logger.info(f"Creating booking for offer {request.offer_id}")
        
        # TODO: Retrieve offer details from cache/database
        # For now, we'll need the offer to be passed or retrieved
        # This is a simplified implementation
        
        # In production:
        # 1. Retrieve offer from cache using offer_id
        # 2. Validate offer is still available and prices haven't changed
        # 3. Create booking
        # 4. Process payment
        # 5. Send confirmation emails (background task)
        
        raise HTTPException(
            status_code=501,
            detail="Booking creation requires offer retrieval implementation"
        )
        
        # Example implementation when offer is available:
        # response = await engine.create_booking(request, offer)
        # 
        # if response.success:
        #     # Send confirmation email in background
        #     background_tasks.add_task(
        #         send_booking_confirmation,
        #         request.contact_email,
        #         response.pnr
        #     )
        # 
        # return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Booking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bookings/{pnr_number}", response_model=PNR)
async def get_booking(
    pnr_number: str,
    supplier: SupplierType = Query(..., description="Supplier type"),
    engine: FlightBookingEngine = Depends(get_booking_engine)
):
    """
    Retrieve booking details by PNR.
    
    **Parameters:**
    - `pnr_number`: PNR/booking reference
    - `supplier`: Supplier type (gds_amadeus, gds_sabre, etc.)
    
    **Returns:**
    - Complete PNR details with itinerary, passengers, and price
    """
    try:
        logger.info(f"Retrieving booking {pnr_number} from {supplier}")
        
        pnr = await engine.get_booking_details(pnr_number, supplier)
        
        if not pnr:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        return pnr
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Booking retrieval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/bookings/{pnr_number}")
async def cancel_booking(
    pnr_number: str,
    supplier: SupplierType = Query(..., description="Supplier type"),
    background_tasks: BackgroundTasks,
    engine: FlightBookingEngine = Depends(get_booking_engine)
):
    """
    Cancel booking by PNR.
    
    **Parameters:**
    - `pnr_number`: PNR/booking reference
    - `supplier`: Supplier type (gds_amadeus, gds_sabre, etc.)
    
    **Returns:**
    - Cancellation confirmation
    """
    try:
        logger.info(f"Cancelling booking {pnr_number} with {supplier}")
        
        success = await engine.cancel_booking(pnr_number, supplier)
        
        if not success:
            raise HTTPException(status_code=400, detail="Cancellation failed")
        
        # Send cancellation confirmation email in background
        # background_tasks.add_task(send_cancellation_email, email, pnr_number)
        
        return {"success": True, "message": "Booking cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cancellation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suppliers")
async def get_suppliers(
    engine: FlightBookingEngine = Depends(get_booking_engine)
):
    """
    Get available suppliers and their status.
    
    **Returns:**
    - List of available supplier names
    - Status of each supplier
    """
    try:
        suppliers = engine.get_available_suppliers()
        status = engine.get_supplier_status()
        
        return {
            "suppliers": suppliers,
            "status": status,
            "total": len(suppliers)
        }
        
    except Exception as e:
        logger.error(f"Supplier status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/airports/search")
async def search_airports(
    query: str = Query(..., min_length=2, description="Airport search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results")
):
    """
    Search airports by name or IATA code.
    
    **Parameters:**
    - `query`: Search query (airport name, city, or IATA code)
    - `limit`: Maximum number of results (1-50)
    
    **Returns:**
    - List of matching airports with IATA codes
    """
    # TODO: Implement airport database search
    # In production, this would query an airport database
    raise HTTPException(status_code=501, detail="Airport search not yet implemented")


@router.get("/airlines/search")
async def search_airlines(
    query: str = Query(..., min_length=2, description="Airline search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results")
):
    """
    Search airlines by name or IATA code.
    
    **Parameters:**
    - `query`: Search query (airline name or IATA code)
    - `limit`: Maximum number of results (1-50)
    
    **Returns:**
    - List of matching airlines with IATA codes
    """
    # TODO: Implement airline database search
    raise HTTPException(status_code=501, detail="Airline search not yet implemented")


@router.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    **Returns:**
    - Service health status
    """
    return {
        "status": "healthy",
        "service": "flight-booking",
        "engine_initialized": _booking_engine is not None
    }


# Helper functions (to be implemented)

async def send_booking_confirmation(email: str, pnr: PNR):
    """Send booking confirmation email."""
    # TODO: Implement email sending
    logger.info(f"Sending booking confirmation to {email} for PNR {pnr.pnr_number}")


async def send_cancellation_email(email: str, pnr_number: str):
    """Send cancellation confirmation email."""
    # TODO: Implement email sending
    logger.info(f"Sending cancellation confirmation to {email} for PNR {pnr_number}")
