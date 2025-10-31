"""
Flight booking and GDS integration module.

This module provides integration with:
- Amadeus GDS
- Sabre GDS
- Galileo GDS
- Low Cost Carriers (LCC) direct APIs

Components:
- booking_engine: Unified flight search and booking engine
- gds_amadeus: Amadeus GDS connector
- gds_sabre: Sabre GDS connector
- gds_galileo: Galileo GDS connector
- lcc_ryanair: Ryanair LCC connector
- lcc_easyjet: EasyJet LCC connector
- lcc_vueling: Vueling LCC connector
- lcc_wizzair: WizzAir LCC connector
- routes: FastAPI endpoints
- models: Data models for flight operations
"""

from .booking_engine import FlightBookingEngine
from .routes import router as flights_router, initialize_booking_engine

__all__ = [
    "FlightBookingEngine",
    "flights_router",
    "initialize_booking_engine"
]
