"""
🌐 OTA Connectors - Channel Manager Extension
Conectores adicionales para OTAs regionales y Airbnb

Nuevas integraciones:
- Airbnb API
- Agoda
- Trivago
- HostelWorld
- TripAdvisor Rentals
- Regional OTAs (Asia, LATAM, Europe)
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, date
from dataclasses import dataclass
import asyncio
import aiohttp
import logging
import hashlib
import hmac
import json
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


@dataclass
class RoomRate:
    """Tarifa de habitación"""
    room_type_id: str
    date: date
    rate: float
    currency: str
    available: int
    min_stay: int = 1
    max_stay: int = 30
    restrictions: Dict[str, Any] = None


@dataclass
class Reservation:
    """Reservación desde OTA"""
    ota_ref: str
    ota_name: str
    room_type: str
    check_in: date
    check_out: date
    guest_name: str
    guest_email: str
    guest_phone: str
    num_guests: int
    total_price: float
    currency: str
    special_requests: str = ""
    status: str = "confirmed"


class OTAConnector(ABC):
    """Clase base para conectores OTA"""
    
    def __init__(self, credentials: Dict[str, str]):
        self.credentials = credentials
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    @abstractmethod
    async def push_rates(self, rates: List[RoomRate]) -> Dict[str, Any]:
        """Enviar tarifas a OTA"""
        pass
    
    @abstractmethod
    async def push_availability(self, availability: Dict[str, Any]) -> Dict[str, Any]:
        """Actualizar disponibilidad en OTA"""
        pass
    
    @abstractmethod
    async def get_reservations(self, start_date: date, end_date: date) -> List[Reservation]:
        """Obtener reservaciones desde OTA"""
        pass
    
    @abstractmethod
    async def update_reservation_status(self, reservation_id: str, status: str) -> bool:
        """Actualizar estado de reservación"""
        pass


class AirbnbConnector(OTAConnector):
    """
    Conector para Airbnb API
    https://www.airbnb.com/partner
    """
    
    BASE_URL = "https://api.airbnb.com/v2"
    
    async def push_rates(self, rates: List[RoomRate]) -> Dict[str, Any]:
        """
        Actualizar precios en Airbnb
        """
        url = f"{self.BASE_URL}/pricing_settings"
        
        # Airbnb usa un modelo diferente - precios por noche
        listings_data = {}
        for rate in rates:
            listing_id = rate.room_type_id
            if listing_id not in listings_data:
                listings_data[listing_id] = {
                    "listing_id": listing_id,
                    "daily_prices": []
                }
            
            listings_data[listing_id]["daily_prices"].append({
                "date": rate.date.isoformat(),
                "price": {
                    "amount": rate.rate,
                    "currency": rate.currency
                }
            })
        
        results = []
        for listing_data in listings_data.values():
            try:
                async with self.session.post(
                    url,
                    json=listing_data,
                    headers=self._get_headers()
                ) as response:
                    if response.status == 200:
                        results.append(await response.json())
                    else:
                        logger.error(f"Airbnb rate push failed: {response.status}")
            except Exception as e:
                logger.error(f"Error pushing rates to Airbnb: {e}")
        
        return {"success": len(results), "failed": len(listings_data) - len(results)}
    
    async def push_availability(self, availability: Dict[str, Any]) -> Dict[str, Any]:
        """
        Actualizar disponibilidad en Airbnb
        """
        url = f"{self.BASE_URL}/calendar_operations"
        
        operations = []
        for listing_id, dates in availability.items():
            for date_str, available_count in dates.items():
                operations.append({
                    "listing_id": listing_id,
                    "date": date_str,
                    "available": available_count > 0,
                    "count": available_count
                })
        
        try:
            async with self.session.post(
                url,
                json={"operations": operations},
                headers=self._get_headers()
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"error": f"Status {response.status}"}
        except Exception as e:
            logger.error(f"Error updating Airbnb availability: {e}")
            return {"error": str(e)}
    
    async def get_reservations(self, start_date: date, end_date: date) -> List[Reservation]:
        """
        Obtener reservaciones de Airbnb
        """
        url = f"{self.BASE_URL}/reservations"
        
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "accepted"
        }
        
        reservations = []
        try:
            async with self.session.get(
                url,
                params=params,
                headers=self._get_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    for booking in data.get("reservations", []):
                        reservations.append(Reservation(
                            ota_ref=booking["confirmation_code"],
                            ota_name="Airbnb",
                            room_type=booking["listing_id"],
                            check_in=datetime.fromisoformat(booking["start_date"]).date(),
                            check_out=datetime.fromisoformat(booking["end_date"]).date(),
                            guest_name=booking["guest"]["name"],
                            guest_email=booking["guest"]["email"],
                            guest_phone=booking["guest"].get("phone", ""),
                            num_guests=booking["number_of_guests"],
                            total_price=booking["total_paid_amount_accurate"],
                            currency=booking["currency"],
                            special_requests=booking.get("guest_details", ""),
                            status=booking["status"]
                        ))
        except Exception as e:
            logger.error(f"Error fetching Airbnb reservations: {e}")
        
        return reservations
    
    async def update_reservation_status(self, reservation_id: str, status: str) -> bool:
        """
        Actualizar estado de reservación en Airbnb
        """
        url = f"{self.BASE_URL}/reservations/{reservation_id}"
        
        try:
            async with self.session.patch(
                url,
                json={"status": status},
                headers=self._get_headers()
            ) as response:
                return response.status == 200
        except Exception as e:
            logger.error(f"Error updating Airbnb reservation: {e}")
            return False
    
    def _get_headers(self) -> Dict[str, str]:
        """Generar headers de autenticación para Airbnb"""
        return {
            "Authorization": f"Bearer {self.credentials['access_token']}",
            "Content-Type": "application/json",
            "X-Airbnb-API-Key": self.credentials['api_key']
        }


class AgodaConnector(OTAConnector):
    """
    Conector para Agoda YCS (Yield Control System)
    https://ycs.agoda.com/
    """
    
    BASE_URL = "https://ycs.agoda.com/ycs"
    
    async def push_rates(self, rates: List[RoomRate]) -> Dict[str, Any]:
        """Actualizar tarifas en Agoda"""
        url = f"{self.BASE_URL}/rate/update"
        
        rate_updates = []
        for rate in rates:
            rate_updates.append({
                "HotelCode": self.credentials['hotel_code'],
                "RoomTypeID": rate.room_type_id,
                "Date": rate.date.isoformat(),
                "Rate": rate.rate,
                "Currency": rate.currency
            })
        
        xml_payload = self._build_rate_xml(rate_updates)
        
        try:
            async with self.session.post(
                url,
                data=xml_payload,
                headers={"Content-Type": "application/xml"}
            ) as response:
                return {"status": response.status, "success": response.status == 200}
        except Exception as e:
            logger.error(f"Error pushing rates to Agoda: {e}")
            return {"error": str(e)}
    
    async def push_availability(self, availability: Dict[str, Any]) -> Dict[str, Any]:
        """Actualizar disponibilidad en Agoda"""
        url = f"{self.BASE_URL}/availability/update"
        
        avail_updates = []
        for room_type, dates in availability.items():
            for date_str, count in dates.items():
                avail_updates.append({
                    "RoomTypeID": room_type,
                    "Date": date_str,
                    "Availability": count
                })
        
        xml_payload = self._build_availability_xml(avail_updates)
        
        try:
            async with self.session.post(
                url,
                data=xml_payload,
                headers={"Content-Type": "application/xml"}
            ) as response:
                return {"status": response.status}
        except Exception as e:
            logger.error(f"Error updating Agoda availability: {e}")
            return {"error": str(e)}
    
    async def get_reservations(self, start_date: date, end_date: date) -> List[Reservation]:
        """Obtener reservaciones de Agoda"""
        url = f"{self.BASE_URL}/reservations/list"
        
        xml_request = f"""
        <ReservationListRequest>
            <HotelCode>{self.credentials['hotel_code']}</HotelCode>
            <DateFrom>{start_date.isoformat()}</DateFrom>
            <DateTo>{end_date.isoformat()}</DateTo>
        </ReservationListRequest>
        """
        
        # Implementación completa requeriría parsear XML response
        # Esto es un placeholder
        return []
    
    async def update_reservation_status(self, reservation_id: str, status: str) -> bool:
        """Actualizar estado en Agoda"""
        # Agoda generalmente no permite actualizar reservaciones desde el hotel
        logger.warning("Agoda does not support reservation updates from hotel side")
        return False
    
    def _build_rate_xml(self, rate_updates: List[Dict]) -> str:
        """Construir XML para actualización de tarifas"""
        # Simplificado - en producción usar librería XML
        return f"<RateUpdate>{rate_updates}</RateUpdate>"
    
    def _build_availability_xml(self, avail_updates: List[Dict]) -> str:
        """Construir XML para actualización de disponibilidad"""
        return f"<AvailabilityUpdate>{avail_updates}</AvailabilityUpdate>"


class TrivagoConnector(OTAConnector):
    """
    Conector para Trivago Express Booking
    https://developer.trivago.com/
    """
    
    BASE_URL = "https://api.trivago.com/v1"
    
    async def push_rates(self, rates: List[RoomRate]) -> Dict[str, Any]:
        """
        Trivago actúa como metabuscador, rates se envían via conectividad
        """
        logger.info("Trivago uses connectivity partners - rates pushed via OTA connections")
        return {"status": "delegated_to_otas"}
    
    async def push_availability(self, availability: Dict[str, Any]) -> Dict[str, Any]:
        """Trivago obtiene availability de OTAs conectadas"""
        return {"status": "delegated_to_otas"}
    
    async def get_reservations(self, start_date: date, end_date: date) -> List[Reservation]:
        """Trivago no maneja reservaciones directamente"""
        return []
    
    async def update_reservation_status(self, reservation_id: str, status: str) -> bool:
        """Trivago no maneja reservaciones"""
        return False


class HostelWorldConnector(OTAConnector):
    """
    Conector para HostelWorld Channel Manager
    """
    
    BASE_URL = "https://api.hostelworld.com/v1"
    
    async def push_rates(self, rates: List[RoomRate]) -> Dict[str, Any]:
        """Actualizar tarifas en HostelWorld"""
        url = f"{self.BASE_URL}/properties/{self.credentials['property_id']}/rates"
        
        rate_data = []
        for rate in rates:
            rate_data.append({
                "room_type_code": rate.room_type_id,
                "date": rate.date.isoformat(),
                "price_per_night": rate.rate,
                "currency": rate.currency
            })
        
        try:
            async with self.session.put(
                url,
                json={"rates": rate_data},
                headers=self._get_auth_headers()
            ) as response:
                return {"success": response.status == 200}
        except Exception as e:
            logger.error(f"Error pushing rates to HostelWorld: {e}")
            return {"error": str(e)}
    
    async def push_availability(self, availability: Dict[str, Any]) -> Dict[str, Any]:
        """Actualizar disponibilidad en HostelWorld"""
        url = f"{self.BASE_URL}/properties/{self.credentials['property_id']}/availability"
        
        avail_data = []
        for room_type, dates in availability.items():
            for date_str, beds_available in dates.items():
                avail_data.append({
                    "room_type_code": room_type,
                    "date": date_str,
                    "beds_available": beds_available
                })
        
        try:
            async with self.session.put(
                url,
                json={"availability": avail_data},
                headers=self._get_auth_headers()
            ) as response:
                return {"success": response.status == 200}
        except Exception as e:
            logger.error(f"Error updating HostelWorld availability: {e}")
            return {"error": str(e)}
    
    async def get_reservations(self, start_date: date, end_date: date) -> List[Reservation]:
        """Obtener reservaciones de HostelWorld"""
        url = f"{self.BASE_URL}/properties/{self.credentials['property_id']}/bookings"
        
        params = {
            "from": start_date.isoformat(),
            "to": end_date.isoformat()
        }
        
        reservations = []
        try:
            async with self.session.get(
                url,
                params=params,
                headers=self._get_auth_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    for booking in data.get("bookings", []):
                        reservations.append(Reservation(
                            ota_ref=booking["booking_reference"],
                            ota_name="HostelWorld",
                            room_type=booking["room_type_code"],
                            check_in=datetime.fromisoformat(booking["check_in"]).date(),
                            check_out=datetime.fromisoformat(booking["check_out"]).date(),
                            guest_name=booking["guest_name"],
                            guest_email=booking["guest_email"],
                            guest_phone=booking.get("guest_phone", ""),
                            num_guests=booking["number_of_guests"],
                            total_price=booking["total_price"],
                            currency=booking["currency"]
                        ))
        except Exception as e:
            logger.error(f"Error fetching HostelWorld reservations: {e}")
        
        return reservations
    
    async def update_reservation_status(self, reservation_id: str, status: str) -> bool:
        """Actualizar estado de reservación"""
        url = f"{self.BASE_URL}/bookings/{reservation_id}/status"
        
        try:
            async with self.session.patch(
                url,
                json={"status": status},
                headers=self._get_auth_headers()
            ) as response:
                return response.status == 200
        except Exception as e:
            logger.error(f"Error updating HostelWorld reservation: {e}")
            return False
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Headers de autenticación para HostelWorld"""
        return {
            "Authorization": f"Bearer {self.credentials['api_key']}",
            "Content-Type": "application/json"
        }


# ==================== CHANNEL MANAGER ====================

class UnifiedChannelManager:
    """
    Gestor unificado de todos los canales OTA
    """
    
    def __init__(self):
        self.connectors: Dict[str, OTAConnector] = {}
        logger.info("Unified Channel Manager initialized")
    
    def register_connector(self, ota_name: str, connector: OTAConnector):
        """Registrar un conector OTA"""
        self.connectors[ota_name] = connector
        logger.info(f"Registered connector for {ota_name}")
    
    async def sync_rates_to_all_channels(self, rates: List[RoomRate]) -> Dict[str, Any]:
        """Sincronizar tarifas a todos los canales"""
        results = {}
        
        tasks = []
        for ota_name, connector in self.connectors.items():
            tasks.append(self._push_rates_to_channel(ota_name, connector, rates))
        
        results_list = await asyncio.gather(*tasks, return_exceptions=True)
        
        for ota_name, result in zip(self.connectors.keys(), results_list):
            if isinstance(result, Exception):
                results[ota_name] = {"error": str(result)}
            else:
                results[ota_name] = result
        
        return results
    
    async def _push_rates_to_channel(
        self,
        ota_name: str,
        connector: OTAConnector,
        rates: List[RoomRate]
    ) -> Dict[str, Any]:
        """Push rates a un canal específico"""
        try:
            return await connector.push_rates(rates)
        except Exception as e:
            logger.error(f"Error pushing rates to {ota_name}: {e}")
            return {"error": str(e)}
    
    async def sync_availability_to_all_channels(
        self,
        availability: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Sincronizar disponibilidad a todos los canales"""
        results = {}
        
        for ota_name, connector in self.connectors.items():
            try:
                result = await connector.push_availability(availability)
                results[ota_name] = result
            except Exception as e:
                logger.error(f"Error updating availability on {ota_name}: {e}")
                results[ota_name] = {"error": str(e)}
        
        return results
    
    async def fetch_all_reservations(
        self,
        start_date: date,
        end_date: date
    ) -> Dict[str, List[Reservation]]:
        """Obtener todas las reservaciones de todos los canales"""
        all_reservations = {}
        
        for ota_name, connector in self.connectors.items():
            try:
                reservations = await connector.get_reservations(start_date, end_date)
                all_reservations[ota_name] = reservations
                logger.info(f"Fetched {len(reservations)} reservations from {ota_name}")
            except Exception as e:
                logger.error(f"Error fetching reservations from {ota_name}: {e}")
                all_reservations[ota_name] = []
        
        return all_reservations


# ==================== EXAMPLE USAGE ====================

async def example_usage():
    """Ejemplo de uso del Channel Manager"""
    
    # Inicializar Channel Manager
    channel_manager = UnifiedChannelManager()
    
    # Configurar conectores
    airbnb = AirbnbConnector({
        "access_token": "your_airbnb_token",
        "api_key": "your_api_key"
    })
    
    agoda = AgodaConnector({
        "hotel_code": "12345",
        "username": "hotel@example.com",
        "password": "password"
    })
    
    hostelworld = HostelWorldConnector({
        "property_id": "67890",
        "api_key": "your_hw_api_key"
    })
    
    # Registrar conectores
    channel_manager.register_connector("Airbnb", airbnb)
    channel_manager.register_connector("Agoda", agoda)
    channel_manager.register_connector("HostelWorld", hostelworld)
    
    # Sincronizar tarifas
    rates = [
        RoomRate(
            room_type_id="DELUXE",
            date=date.today(),
            rate=150.00,
            currency="USD",
            available=10
        )
    ]
    
    async with airbnb, agoda, hostelworld:
        results = await channel_manager.sync_rates_to_all_channels(rates)
        print(f"Rate sync results: {results}")
        
        # Obtener reservaciones
        reservations = await channel_manager.fetch_all_reservations(
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30)
        )
        
        for ota, bookings in reservations.items():
            print(f"{ota}: {len(bookings)} reservations")


if __name__ == "__main__":
    asyncio.run(example_usage())
