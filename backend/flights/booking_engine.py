"""
Unified Flight Booking Engine.

Aggregates flight search results from multiple GDS and LCC suppliers,
handles multi-leg searches, fare comparison, and unified booking flow.
"""
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
from decimal import Decimal

from .models import (
    FlightSearchRequest,
    FlightSearchResponse,
    FlightOffer,
    FlightBookingRequest,
    FlightBookingResponse,
    PNR,
    SupplierType,
    Price
)

from .gds_amadeus import AmadeusGDSConnector
from .gds_sabre import SabreGDSConnector
from .gds_galileo import GalileoGDSConnector
from .lcc_ryanair import RyanairLCCConnector
from .lcc_easyjet import EasyJetLCCConnector
from .lcc_vueling import VuelingLCCConnector
from .lcc_wizzair import WizzAirLCCConnector

logger = logging.getLogger(__name__)


class FlightBookingEngine:
    """
    Unified Flight Booking Engine.
    
    Aggregates results from multiple suppliers and provides a single
    interface for flight search and booking.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize booking engine with supplier configurations.
        
        Args:
            config: Configuration dict containing API credentials for each supplier
        """
        self.config = config
        self.connectors = {}
        
        # Initialize GDS connectors
        if "amadeus" in config:
            self.connectors["amadeus"] = AmadeusGDSConnector(
                api_key=config["amadeus"]["api_key"],
                api_secret=config["amadeus"]["api_secret"]
            )
        
        if "sabre" in config:
            self.connectors["sabre"] = SabreGDSConnector(
                client_id=config["sabre"]["client_id"],
                client_secret=config["sabre"]["client_secret"],
                pcc=config["sabre"].get("pcc", "1234")
            )
        
        if "galileo" in config:
            self.connectors["galileo"] = GalileoGDSConnector(
                username=config["galileo"]["username"],
                password=config["galileo"]["password"],
                branch=config["galileo"]["branch"]
            )
        
        # Initialize LCC connectors
        if "ryanair" in config:
            self.connectors["ryanair"] = RyanairLCCConnector(
                api_key=config["ryanair"].get("api_key"),
                partner_id=config["ryanair"].get("partner_id")
            )
        
        if "easyjet" in config:
            self.connectors["easyjet"] = EasyJetLCCConnector(
                api_key=config["easyjet"].get("api_key")
            )
        
        if "vueling" in config:
            self.connectors["vueling"] = VuelingLCCConnector(
                api_key=config["vueling"].get("api_key")
            )
        
        if "wizzair" in config:
            self.connectors["wizzair"] = WizzAirLCCConnector(
                api_key=config["wizzair"].get("api_key")
            )
        
        logger.info(f"Flight booking engine initialized with {len(self.connectors)} suppliers")
    
    async def search_flights(
        self,
        request: FlightSearchRequest,
        suppliers: Optional[List[str]] = None,
        timeout: int = 15
    ) -> FlightSearchResponse:
        """
        Search flights across multiple suppliers.
        
        Args:
            request: Flight search request
            suppliers: List of supplier names to query (None = all)
            timeout: Timeout in seconds per supplier
            
        Returns:
            Aggregated flight search response
        """
        start_time = datetime.utcnow()
        
        # Determine which suppliers to query
        if suppliers is None:
            suppliers = list(self.connectors.keys())
        else:
            # Filter to only available suppliers
            suppliers = [s for s in suppliers if s in self.connectors]
        
        if not suppliers:
            logger.warning("No suppliers available for search")
            return FlightSearchResponse(
                search_id=f"UNIFIED-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                offers=[],
                total_results=0,
                search_time_ms=0
            )
        
        logger.info(f"Searching {len(suppliers)} suppliers: {', '.join(suppliers)}")
        
        # Create search tasks for each supplier
        tasks = []
        for supplier_name in suppliers:
            connector = self.connectors[supplier_name]
            task = asyncio.create_task(
                self._search_with_timeout(
                    supplier_name,
                    connector,
                    request,
                    timeout
                )
            )
            tasks.append(task)
        
        # Wait for all searches to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Aggregate offers from all suppliers
        all_offers = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Supplier search error: {result}")
                continue
            
            if isinstance(result, FlightSearchResponse):
                all_offers.extend(result.offers)
        
        # Sort offers by price (cheapest first)
        all_offers.sort(key=lambda offer: offer.price.total)
        
        # Calculate total search time
        search_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        return FlightSearchResponse(
            search_id=f"UNIFIED-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            offers=all_offers,
            total_results=len(all_offers),
            search_time_ms=search_time
        )
    
    async def _search_with_timeout(
        self,
        supplier_name: str,
        connector: Any,
        request: FlightSearchRequest,
        timeout: int
    ) -> FlightSearchResponse:
        """
        Search a single supplier with timeout.
        
        Args:
            supplier_name: Supplier name for logging
            connector: Supplier connector
            request: Flight search request
            timeout: Timeout in seconds
            
        Returns:
            Flight search response
        """
        try:
            response = await asyncio.wait_for(
                connector.search_flights(request),
                timeout=timeout
            )
            logger.info(f"{supplier_name}: Found {response.total_results} offers in {response.search_time_ms}ms")
            return response
            
        except asyncio.TimeoutError:
            logger.warning(f"{supplier_name}: Search timed out after {timeout}s")
            return FlightSearchResponse(
                search_id=f"{supplier_name.upper()}-TIMEOUT",
                offers=[],
                total_results=0,
                search_time_ms=timeout * 1000
            )
        
        except Exception as e:
            logger.error(f"{supplier_name}: Search error: {e}")
            return FlightSearchResponse(
                search_id=f"{supplier_name.upper()}-ERROR",
                offers=[],
                total_results=0,
                search_time_ms=0
            )
    
    async def create_booking(
        self,
        request: FlightBookingRequest,
        offer: FlightOffer
    ) -> FlightBookingResponse:
        """
        Create booking with the appropriate supplier.
        
        Args:
            request: Flight booking request
            offer: Selected flight offer (contains supplier info)
            
        Returns:
            Flight booking response
        """
        # Determine supplier from offer
        supplier_mapping = {
            SupplierType.GDS_AMADEUS: "amadeus",
            SupplierType.GDS_SABRE: "sabre",
            SupplierType.GDS_GALILEO: "galileo",
            SupplierType.LCC_RYANAIR: "ryanair",
            SupplierType.LCC_EASYJET: "easyjet",
            SupplierType.LCC_VUELING: "vueling",
            SupplierType.LCC_WIZZAIR: "wizzair"
        }
        
        supplier_name = supplier_mapping.get(offer.supplier)
        
        if not supplier_name or supplier_name not in self.connectors:
            logger.error(f"Supplier {offer.supplier} not available")
            return FlightBookingResponse(
                booking_id="",
                pnr=None,
                success=False,
                message=f"Supplier {offer.supplier} not available"
            )
        
        connector = self.connectors[supplier_name]
        
        try:
            logger.info(f"Creating booking with {supplier_name} for offer {offer.offer_id}")
            response = await connector.create_booking(request)
            
            if response.success:
                logger.info(f"Booking created successfully: {response.booking_id}")
            else:
                logger.error(f"Booking failed: {response.message}")
            
            return response
            
        except Exception as e:
            logger.error(f"Booking error with {supplier_name}: {e}")
            return FlightBookingResponse(
                booking_id="",
                pnr=None,
                success=False,
                message=f"Booking error: {str(e)}"
            )
    
    async def cancel_booking(
        self,
        pnr_number: str,
        supplier: SupplierType
    ) -> bool:
        """
        Cancel booking with the appropriate supplier.
        
        Args:
            pnr_number: PNR/booking reference
            supplier: Supplier type
            
        Returns:
            True if cancelled successfully
        """
        supplier_mapping = {
            SupplierType.GDS_AMADEUS: "amadeus",
            SupplierType.GDS_SABRE: "sabre",
            SupplierType.GDS_GALILEO: "galileo",
            SupplierType.LCC_RYANAIR: "ryanair",
            SupplierType.LCC_EASYJET: "easyjet",
            SupplierType.LCC_VUELING: "vueling",
            SupplierType.LCC_WIZZAIR: "wizzair"
        }
        
        supplier_name = supplier_mapping.get(supplier)
        
        if not supplier_name or supplier_name not in self.connectors:
            logger.error(f"Supplier {supplier} not available")
            return False
        
        connector = self.connectors[supplier_name]
        
        try:
            logger.info(f"Cancelling booking {pnr_number} with {supplier_name}")
            result = await connector.cancel_booking(pnr_number)
            
            if result:
                logger.info(f"Booking {pnr_number} cancelled successfully")
            else:
                logger.error(f"Failed to cancel booking {pnr_number}")
            
            return result
            
        except Exception as e:
            logger.error(f"Cancellation error with {supplier_name}: {e}")
            return False
    
    async def get_booking_details(
        self,
        pnr_number: str,
        supplier: SupplierType
    ) -> Optional[PNR]:
        """
        Retrieve booking details from the appropriate supplier.
        
        Args:
            pnr_number: PNR/booking reference
            supplier: Supplier type
            
        Returns:
            PNR object or None if not found
        """
        supplier_mapping = {
            SupplierType.GDS_AMADEUS: "amadeus",
            SupplierType.GDS_SABRE: "sabre",
            SupplierType.GDS_GALILEO: "galileo",
            SupplierType.LCC_RYANAIR: "ryanair",
            SupplierType.LCC_EASYJET: "easyjet",
            SupplierType.LCC_VUELING: "vueling",
            SupplierType.LCC_WIZZAIR: "wizzair"
        }
        
        supplier_name = supplier_mapping.get(supplier)
        
        if not supplier_name or supplier_name not in self.connectors:
            logger.error(f"Supplier {supplier} not available")
            return None
        
        connector = self.connectors[supplier_name]
        
        try:
            logger.info(f"Retrieving booking {pnr_number} from {supplier_name}")
            pnr = await connector.get_booking_details(pnr_number)
            
            if pnr:
                logger.info(f"Booking {pnr_number} retrieved successfully")
            else:
                logger.warning(f"Booking {pnr_number} not found")
            
            return pnr
            
        except Exception as e:
            logger.error(f"Retrieval error with {supplier_name}: {e}")
            return None
    
    def get_available_suppliers(self) -> List[str]:
        """
        Get list of available supplier names.
        
        Returns:
            List of supplier names
        """
        return list(self.connectors.keys())
    
    def get_supplier_status(self) -> Dict[str, bool]:
        """
        Get availability status of all suppliers.
        
        Returns:
            Dict mapping supplier names to availability status
        """
        return {name: True for name in self.connectors.keys()}
