#!/usr/bin/env python3
"""
Transport Management Service
Servicio completo para gestión de proveedores de transporte, solicitudes, cotizaciones y confirmaciones
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone, date
from typing import Dict, List, Optional, Tuple, Any
from decimal import Decimal
import uuid
import json
from enum import Enum
import random
import hashlib

from sqlalchemy import select, and_, or_, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from models.transport_models import (
    TransportProvider, TransportVehicle, TransportDriver,
    ServiceRequest, TransportQuote, ServiceConfirmation,
    VehicleAssignment, ServiceCommunication, ProviderDocument,
    VehicleMaintenanceRecord,
    ProviderStatus, ProviderTier, VehicleType, VehicleStatus,
    DriverStatus, ServiceRequestStatus, QuoteStatus, ServiceType
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TransportManagementService:
    """
    Servicio principal para gestión de transporte
    Maneja todo el flujo desde solicitud hasta confirmación
    """
    
    def __init__(self, db_session: AsyncSession, redis_client=None):
        self.db = db_session
        self.redis = redis_client
        self.notification_queue = []
        
    # ============================
    # PROVIDER MANAGEMENT
    # ============================
    
    async def register_provider(self, provider_data: Dict[str, Any]) -> TransportProvider:
        """
        Registra un nuevo proveedor de transporte
        """
        try:
            # Validar datos requeridos
            required_fields = ['company_name', 'tax_id', 'email', 'phone', 'emergency_phone']
            for field in required_fields:
                if field not in provider_data:
                    raise ValueError(f"Campo requerido: {field}")
            
            # Crear proveedor
            provider = TransportProvider(
                **provider_data,
                status=ProviderStatus.PENDING_APPROVAL,
                created_at=datetime.now(timezone.utc)
            )
            
            self.db.add(provider)
            await self.db.commit()
            await self.db.refresh(provider)
            
            # Notificar a administradores
            await self._send_notification(
                type="provider_registration",
                title="Nuevo Proveedor Registrado",
                message=f"Proveedor {provider.company_name} requiere aprobación",
                priority="high",
                recipients=["admin"]
            )
            
            logger.info(f"Provider registered: {provider.id} - {provider.company_name}")
            return provider
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error registering provider: {str(e)}")
            raise
    
    async def approve_provider(self, provider_id: str, approved_by: str) -> TransportProvider:
        """
        Aprueba un proveedor pendiente
        """
        provider = await self.get_provider(provider_id)
        if not provider:
            raise ValueError("Provider not found")
        
        provider.status = ProviderStatus.ACTIVE
        provider.approved_at = datetime.now(timezone.utc)
        provider.approved_by = approved_by
        
        await self.db.commit()
        await self.db.refresh(provider)
        
        # Notificar al proveedor
        await self._send_notification(
            type="provider_approved",
            title="Proveedor Aprobado",
            message=f"Su empresa ha sido aprobada como proveedor",
            recipients=[provider.email]
        )
        
        return provider
    
    async def get_provider(self, provider_id: str) -> Optional[TransportProvider]:
        """
        Obtiene un proveedor por ID
        """
        result = await self.db.execute(
            select(TransportProvider)
            .options(
                selectinload(TransportProvider.vehicles),
                selectinload(TransportProvider.drivers)
            )
            .where(TransportProvider.id == provider_id)
        )
        return result.scalar_one_or_none()
    
    async def get_active_providers(self, 
                                  service_date: date = None,
                                  vehicle_type: VehicleType = None,
                                  min_seats: int = None) -> List[TransportProvider]:
        """
        Obtiene proveedores activos con filtros opcionales
        """
        query = select(TransportProvider).where(
            TransportProvider.status == ProviderStatus.ACTIVE
        )
        
        if vehicle_type:
            # Filtrar por tipo de vehículo disponible
            query = query.join(TransportVehicle).where(
                and_(
                    TransportVehicle.vehicle_type == vehicle_type,
                    TransportVehicle.status == VehicleStatus.AVAILABLE
                )
            )
        
        if min_seats:
            # Filtrar por capacidad mínima
            query = query.join(TransportVehicle).where(
                TransportVehicle.passenger_seats >= min_seats
            )
        
        result = await self.db.execute(
            query.options(
                selectinload(TransportProvider.vehicles),
                selectinload(TransportProvider.drivers)
            ).distinct()
        )
        
        providers = result.scalars().all()
        
        # Filtrar por disponibilidad en fecha si se especifica
        if service_date:
            available_providers = []
            for provider in providers:
                if await self._check_provider_availability(provider.id, service_date):
                    available_providers.append(provider)
            return available_providers
        
        return providers
    
    async def update_provider_rating(self, provider_id: str, new_rating: float):
        """
        Actualiza la calificación del proveedor
        """
        provider = await self.get_provider(provider_id)
        if provider:
            # Calcular nueva calificación promedio
            total_services = provider.completed_services + 1
            current_total = provider.rating * provider.completed_services
            provider.rating = (current_total + new_rating) / total_services
            provider.completed_services = total_services
            
            await self.db.commit()
    
    # ============================
    # VEHICLE MANAGEMENT
    # ============================
    
    async def register_vehicle(self, provider_id: str, vehicle_data: Dict[str, Any]) -> TransportVehicle:
        """
        Registra un nuevo vehículo para un proveedor
        """
        try:
            vehicle = TransportVehicle(
                provider_id=provider_id,
                **vehicle_data,
                status=VehicleStatus.AVAILABLE,
                created_at=datetime.now(timezone.utc)
            )
            
            self.db.add(vehicle)
            
            # Actualizar contador de vehículos del proveedor
            provider = await self.get_provider(provider_id)
            if provider:
                provider.total_vehicles += 1
            
            await self.db.commit()
            await self.db.refresh(vehicle)
            
            logger.info(f"Vehicle registered: {vehicle.id} - {vehicle.plate_number}")
            return vehicle
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error registering vehicle: {str(e)}")
            raise
    
    async def get_available_vehicles(self,
                                    provider_id: str = None,
                                    vehicle_type: VehicleType = None,
                                    min_seats: int = None,
                                    service_date: date = None) -> List[TransportVehicle]:
        """
        Obtiene vehículos disponibles con filtros
        """
        query = select(TransportVehicle).where(
            TransportVehicle.status == VehicleStatus.AVAILABLE
        )
        
        if provider_id:
            query = query.where(TransportVehicle.provider_id == provider_id)
        
        if vehicle_type:
            query = query.where(TransportVehicle.vehicle_type == vehicle_type)
        
        if min_seats:
            query = query.where(TransportVehicle.passenger_seats >= min_seats)
        
        result = await self.db.execute(query)
        vehicles = result.scalars().all()
        
        # Filtrar por disponibilidad en fecha
        if service_date:
            available_vehicles = []
            for vehicle in vehicles:
                if await self._check_vehicle_availability(vehicle.id, service_date):
                    available_vehicles.append(vehicle)
            return available_vehicles
        
        return vehicles
    
    async def update_vehicle_status(self, vehicle_id: str, status: VehicleStatus, notes: str = None):
        """
        Actualiza el estado de un vehículo
        """
        vehicle = await self.db.get(TransportVehicle, vehicle_id)
        if vehicle:
            vehicle.status = status
            vehicle.updated_at = datetime.now(timezone.utc)
            if notes:
                vehicle.notes = notes
            await self.db.commit()
    
    # ============================
    # DRIVER MANAGEMENT
    # ============================
    
    async def register_driver(self, provider_id: str, driver_data: Dict[str, Any]) -> TransportDriver:
        """
        Registra un nuevo conductor
        """
        try:
            # Generar nombre completo
            driver_data['full_name'] = f"{driver_data.get('first_name', '')} {driver_data.get('last_name', '')}"
            
            driver = TransportDriver(
                provider_id=provider_id,
                **driver_data,
                status=DriverStatus.AVAILABLE,
                created_at=datetime.now(timezone.utc)
            )
            
            self.db.add(driver)
            
            # Actualizar contador del proveedor
            provider = await self.get_provider(provider_id)
            if provider:
                provider.total_drivers += 1
            
            await self.db.commit()
            await self.db.refresh(driver)
            
            logger.info(f"Driver registered: {driver.id} - {driver.full_name}")
            return driver
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error registering driver: {str(e)}")
            raise
    
    async def get_available_drivers(self,
                                   provider_id: str = None,
                                   service_date: date = None,
                                   vehicle_type: VehicleType = None) -> List[TransportDriver]:
        """
        Obtiene conductores disponibles
        """
        query = select(TransportDriver).where(
            TransportDriver.status == DriverStatus.AVAILABLE
        )
        
        if provider_id:
            query = query.where(TransportDriver.provider_id == provider_id)
        
        if vehicle_type:
            # Filtrar por conductores autorizados para el tipo de vehículo
            query = query.where(
                TransportDriver.vehicle_types_authorized.contains([vehicle_type.value])
            )
        
        result = await self.db.execute(query)
        drivers = result.scalars().all()
        
        # Filtrar por disponibilidad en fecha
        if service_date:
            available_drivers = []
            for driver in drivers:
                if await self._check_driver_availability(driver.id, service_date):
                    available_drivers.append(driver)
            return available_drivers
        
        return drivers
    
    # ============================
    # SERVICE REQUEST MANAGEMENT
    # ============================
    
    async def create_service_request(self, 
                                    requested_by: str,
                                    request_data: Dict[str, Any]) -> ServiceRequest:
        """
        Crea una nueva solicitud de servicio de transporte
        """
        try:
            # Generar número de solicitud único
            request_number = await self._generate_request_number()
            
            # Calcular fecha límite para cotizaciones
            quote_deadline = request_data.get('quote_deadline')
            if not quote_deadline:
                # Por defecto, 24 horas para cotizaciones normales, 2 horas para urgentes
                if request_data.get('is_urgent'):
                    quote_deadline = datetime.now(timezone.utc) + timedelta(hours=2)
                else:
                    quote_deadline = datetime.now(timezone.utc) + timedelta(hours=24)
            
            # Crear solicitud
            service_request = ServiceRequest(
                request_number=request_number,
                requested_by=requested_by,
                quote_deadline=quote_deadline,
                status=ServiceRequestStatus.DRAFT,
                created_at=datetime.now(timezone.utc),
                **request_data
            )
            
            self.db.add(service_request)
            await self.db.commit()
            await self.db.refresh(service_request)
            
            logger.info(f"Service request created: {service_request.id} - {request_number}")
            
            # Si está configurado para enviar inmediatamente
            if request_data.get('send_immediately', False):
                await self.send_quote_requests(service_request.id)
            
            return service_request
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating service request: {str(e)}")
            raise
    
    async def send_quote_requests(self, request_id: str) -> int:
        """
        Envía solicitudes de cotización a proveedores
        Retorna el número de solicitudes enviadas
        """
        try:
            # Obtener la solicitud
            service_request = await self.db.get(ServiceRequest, request_id)
            if not service_request:
                raise ValueError("Service request not found")
            
            # Determinar proveedores a contactar
            providers_to_contact = []
            
            if service_request.send_to_all_providers:
                # Enviar a todos los proveedores activos
                providers = await self.get_active_providers(
                    service_date=service_request.service_date,
                    vehicle_type=service_request.vehicle_type_required,
                    min_seats=service_request.min_seats_required
                )
                providers_to_contact = [p for p in providers 
                                       if p.id not in (service_request.excluded_providers or [])]
            elif service_request.selected_providers:
                # Enviar solo a proveedores seleccionados
                for provider_id in service_request.selected_providers:
                    provider = await self.get_provider(provider_id)
                    if provider and provider.status == ProviderStatus.ACTIVE:
                        providers_to_contact.append(provider)
            else:
                # Seleccionar automáticamente los mejores proveedores
                providers = await self.get_active_providers(
                    service_date=service_request.service_date,
                    vehicle_type=service_request.vehicle_type_required,
                    min_seats=service_request.min_seats_required
                )
                
                # Ordenar por rating y tomar los mejores
                providers.sort(key=lambda p: (p.rating, -p.response_time_avg_hours), reverse=True)
                max_quotes = service_request.max_quotes_needed or 3
                providers_to_contact = providers[:max_quotes]
            
            # Crear solicitudes de cotización para cada proveedor
            quotes_sent = 0
            for provider in providers_to_contact:
                quote = await self._create_quote_request(service_request, provider)
                if quote:
                    quotes_sent += 1
                    
                    # Notificar al proveedor
                    await self._send_notification(
                        type="quote_request",
                        title="Nueva Solicitud de Cotización",
                        message=f"Solicitud #{service_request.request_number} - {service_request.service_type.value}",
                        priority="high" if service_request.is_urgent else "normal",
                        recipients=[provider.email],
                        data={
                            "request_id": str(service_request.id),
                            "quote_id": str(quote.id),
                            "deadline": quote.valid_until.isoformat()
                        }
                    )
            
            # Actualizar estado de la solicitud
            service_request.status = ServiceRequestStatus.PENDING_QUOTES
            service_request.quotes_sent_at = datetime.now(timezone.utc)
            await self.db.commit()
            
            logger.info(f"Sent {quotes_sent} quote requests for service request {request_id}")
            
            # Programar recordatorio si no hay respuestas
            await self._schedule_quote_reminder(request_id, service_request.quote_deadline)
            
            return quotes_sent
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error sending quote requests: {str(e)}")
            raise
    
    async def submit_quote(self, 
                          quote_id: str,
                          provider_id: str,
                          quote_data: Dict[str, Any]) -> TransportQuote:
        """
        Un proveedor envía su cotización
        """
        try:
            # Obtener la cotización pendiente
            result = await self.db.execute(
                select(TransportQuote)
                .where(
                    and_(
                        TransportQuote.id == quote_id,
                        TransportQuote.provider_id == provider_id,
                        TransportQuote.status == QuoteStatus.PENDING
                    )
                )
            )
            quote = result.scalar_one_or_none()
            
            if not quote:
                raise ValueError("Quote not found or already submitted")
            
            # Verificar que no haya expirado
            if quote.valid_until < datetime.now(timezone.utc):
                quote.status = QuoteStatus.EXPIRED
                await self.db.commit()
                raise ValueError("Quote deadline has passed")
            
            # Actualizar cotización con datos del proveedor
            for key, value in quote_data.items():
                if hasattr(quote, key):
                    setattr(quote, key, value)
            
            # Calcular tiempo de respuesta
            time_diff = datetime.now(timezone.utc) - quote.created_at
            quote.response_time_hours = time_diff.total_seconds() / 3600
            
            quote.status = QuoteStatus.SUBMITTED
            quote.submitted_at = datetime.now(timezone.utc)
            
            # Calcular score automático
            quote = await self._calculate_quote_score(quote)
            
            # Actualizar contador en la solicitud
            service_request = await self.db.get(ServiceRequest, quote.service_request_id)
            if service_request:
                service_request.quotes_received += 1
                
                # Si se recibieron todas las cotizaciones esperadas
                if service_request.quotes_received >= service_request.max_quotes_needed:
                    service_request.status = ServiceRequestStatus.QUOTES_RECEIVED
                    
                    # Notificar al solicitante
                    await self._send_notification(
                        type="quotes_ready",
                        title="Cotizaciones Recibidas",
                        message=f"Se han recibido todas las cotizaciones para la solicitud #{service_request.request_number}",
                        recipients=[service_request.requested_by]
                    )
                    
                    # Auto-seleccionar si está configurado
                    if service_request.auto_select_best:
                        await self.auto_select_best_quote(service_request.id)
            
            await self.db.commit()
            await self.db.refresh(quote)
            
            # Actualizar métricas del proveedor
            provider = await self.get_provider(provider_id)
            if provider:
                # Actualizar tiempo de respuesta promedio
                total_quotes = provider.total_services + 1
                current_avg = provider.response_time_avg_hours * provider.total_services
                provider.response_time_avg_hours = (current_avg + quote.response_time_hours) / total_quotes
                provider.total_services = total_quotes
                await self.db.commit()
            
            logger.info(f"Quote submitted: {quote.id} by provider {provider_id}")
            return quote
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error submitting quote: {str(e)}")
            raise
    
    async def evaluate_quotes(self, request_id: str) -> List[TransportQuote]:
        """
        Obtiene y evalúa todas las cotizaciones recibidas
        """
        result = await self.db.execute(
            select(TransportQuote)
            .where(
                and_(
                    TransportQuote.service_request_id == request_id,
                    TransportQuote.status == QuoteStatus.SUBMITTED
                )
            )
            .options(selectinload(TransportQuote.provider))
            .order_by(TransportQuote.total_score.desc())
        )
        
        quotes = result.scalars().all()
        
        # Asignar ranking
        for i, quote in enumerate(quotes):
            quote.rank_position = i + 1
        
        await self.db.commit()
        
        return quotes
    
    async def select_quote(self, 
                          request_id: str,
                          quote_id: str,
                          selected_by: str) -> ServiceConfirmation:
        """
        Selecciona una cotización y crea la confirmación del servicio
        """
        try:
            # Obtener la solicitud y la cotización
            service_request = await self.db.get(ServiceRequest, request_id)
            quote = await self.db.get(TransportQuote, quote_id)
            
            if not service_request or not quote:
                raise ValueError("Request or quote not found")
            
            # Verificar que la cotización pertenece a la solicitud
            if quote.service_request_id != request_id:
                raise ValueError("Quote does not belong to this request")
            
            # Marcar cotización como aceptada
            quote.status = QuoteStatus.ACCEPTED
            quote.reviewed_by = selected_by
            quote.reviewed_at = datetime.now(timezone.utc)
            
            # Rechazar otras cotizaciones
            await self.db.execute(
                update(TransportQuote)
                .where(
                    and_(
                        TransportQuote.service_request_id == request_id,
                        TransportQuote.id != quote_id,
                        TransportQuote.status == QuoteStatus.SUBMITTED
                    )
                )
                .values(
                    status=QuoteStatus.REJECTED,
                    reviewed_by=selected_by,
                    reviewed_at=datetime.now(timezone.utc),
                    rejection_reason="Otra cotización fue seleccionada"
                )
            )
            
            # Crear confirmación de servicio
            confirmation_number = await self._generate_confirmation_number()
            
            confirmation = ServiceConfirmation(
                confirmation_number=confirmation_number,
                service_request_id=request_id,
                quote_id=quote_id,
                provider_id=quote.provider_id,
                confirmed_amount=quote.total_amount,
                confirmed_pickup_time=service_request.pickup_time,
                confirmed_pickup_location=service_request.pickup_location,
                driver_name=quote.proposed_driver_name or "Por asignar",
                driver_phone=quote.proposed_driver_phone or "Por confirmar",
                vehicle_plate="Por confirmar",
                emergency_phone=quote.provider.emergency_phone,
                confirmed_at=datetime.now(timezone.utc),
                confirmed_by=selected_by
            )
            
            self.db.add(confirmation)
            
            # Actualizar estado de la solicitud
            service_request.status = ServiceRequestStatus.CONFIRMED
            service_request.selected_quote_id = quote_id
            service_request.confirmed_at = datetime.now(timezone.utc)
            
            # Si hay vehículo y conductor propuestos, crear asignación
            if quote.proposed_vehicle_id and quote.proposed_driver_id:
                assignment = VehicleAssignment(
                    confirmation_id=confirmation.id,
                    vehicle_id=quote.proposed_vehicle_id,
                    driver_id=quote.proposed_driver_id,
                    assignment_date=service_request.service_date,
                    start_time=service_request.pickup_time,
                    is_confirmed=True,
                    assigned_at=datetime.now(timezone.utc),
                    assigned_by=selected_by
                )
                self.db.add(assignment)
                
                # Actualizar confirmación con datos del vehículo
                vehicle = await self.db.get(TransportVehicle, quote.proposed_vehicle_id)
                if vehicle:
                    confirmation.assigned_vehicle_id = vehicle.id
                    confirmation.vehicle_plate = vehicle.plate_number
                    confirmation.vehicle_description = f"{vehicle.brand} {vehicle.model}"
                
                # Actualizar con datos del conductor
                driver = await self.db.get(TransportDriver, quote.proposed_driver_id)
                if driver:
                    confirmation.assigned_driver_id = driver.id
                    confirmation.driver_name = driver.full_name
                    confirmation.driver_phone = driver.phone
                    confirmation.driver_photo_url = driver.photo_url
            
            await self.db.commit()
            await self.db.refresh(confirmation)
            
            # Notificar al proveedor
            provider = await self.get_provider(quote.provider_id)
            if provider:
                await self._send_notification(
                    type="service_confirmed",
                    title="Servicio Confirmado",
                    message=f"Su cotización para el servicio #{service_request.request_number} ha sido aceptada",
                    priority="high",
                    recipients=[provider.email],
                    data={
                        "confirmation_number": confirmation_number,
                        "service_date": service_request.service_date.isoformat(),
                        "pickup_time": service_request.pickup_time
                    }
                )
            
            logger.info(f"Service confirmed: {confirmation.id} - {confirmation_number}")
            return confirmation
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error selecting quote: {str(e)}")
            raise
    
    async def auto_select_best_quote(self, request_id: str) -> Optional[ServiceConfirmation]:
        """
        Selecciona automáticamente la mejor cotización basada en criterios
        """
        try:
            service_request = await self.db.get(ServiceRequest, request_id)
            if not service_request:
                return None
            
            # Obtener cotizaciones evaluadas
            quotes = await self.evaluate_quotes(request_id)
            
            if not quotes:
                return None
            
            # Aplicar criterios de selección personalizados si existen
            if service_request.selection_criteria:
                quotes = await self._apply_selection_criteria(
                    quotes, 
                    service_request.selection_criteria
                )
            
            # Seleccionar la mejor (primera después de ordenar)
            best_quote = quotes[0]
            
            # Confirmar la selección
            confirmation = await self.select_quote(
                request_id,
                str(best_quote.id),
                "system_auto_select"
            )
            
            return confirmation
            
        except Exception as e:
            logger.error(f"Error in auto-selection: {str(e)}")
            return None
    
    # ============================
    # CONFIRMATION & ASSIGNMENT
    # ============================
    
    async def assign_vehicle_driver(self,
                                   confirmation_id: str,
                                   vehicle_id: str,
                                   driver_id: str,
                                   assigned_by: str) -> VehicleAssignment:
        """
        Asigna vehículo y conductor a un servicio confirmado
        """
        try:
            # Obtener confirmación
            confirmation = await self.db.get(ServiceConfirmation, confirmation_id)
            if not confirmation:
                raise ValueError("Confirmation not found")
            
            # Verificar disponibilidad del vehículo
            vehicle = await self.db.get(TransportVehicle, vehicle_id)
            if not vehicle or vehicle.status != VehicleStatus.AVAILABLE:
                raise ValueError("Vehicle not available")
            
            # Verificar disponibilidad del conductor
            driver = await self.db.get(TransportDriver, driver_id)
            if not driver or driver.status != DriverStatus.AVAILABLE:
                raise ValueError("Driver not available")
            
            # Obtener la solicitud de servicio
            service_request = await self.db.get(ServiceRequest, confirmation.service_request_id)
            
            # Crear asignación
            assignment = VehicleAssignment(
                confirmation_id=confirmation_id,
                vehicle_id=vehicle_id,
                driver_id=driver_id,
                assignment_date=service_request.service_date,
                start_time=service_request.pickup_time,
                is_confirmed=True,
                assigned_at=datetime.now(timezone.utc),
                assigned_by=assigned_by
            )
            
            self.db.add(assignment)
            
            # Actualizar confirmación
            confirmation.assigned_vehicle_id = vehicle_id
            confirmation.assigned_driver_id = driver_id
            confirmation.driver_name = driver.full_name
            confirmation.driver_phone = driver.phone
            confirmation.driver_photo_url = driver.photo_url
            confirmation.vehicle_plate = vehicle.plate_number
            confirmation.vehicle_description = f"{vehicle.brand} {vehicle.model}"
            
            # Actualizar estado del vehículo y conductor
            vehicle.status = VehicleStatus.RESERVED
            driver.status = DriverStatus.ON_DUTY
            
            await self.db.commit()
            await self.db.refresh(assignment)
            
            # Notificar al conductor
            await self._send_notification(
                type="assignment",
                title="Nueva Asignación de Servicio",
                message=f"Ha sido asignado al servicio del {service_request.service_date}",
                priority="high",
                recipients=[driver.phone],
                channel="sms"
            )
            
            logger.info(f"Vehicle {vehicle_id} and driver {driver_id} assigned to confirmation {confirmation_id}")
            return assignment
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error assigning vehicle/driver: {str(e)}")
            raise
    
    async def send_customer_confirmation(self, confirmation_id: str) -> bool:
        """
        Envía confirmación del servicio al cliente
        """
        try:
            confirmation = await self.db.get(ServiceConfirmation, confirmation_id)
            if not confirmation:
                return False
            
            service_request = await self.db.get(ServiceRequest, confirmation.service_request_id)
            if not service_request:
                return False
            
            # Preparar datos para la confirmación
            confirmation_data = {
                "confirmation_number": confirmation.confirmation_number,
                "service_date": service_request.service_date.strftime("%d/%m/%Y"),
                "pickup_time": confirmation.confirmed_pickup_time,
                "pickup_location": confirmation.confirmed_pickup_location,
                "driver_name": confirmation.driver_name,
                "driver_phone": confirmation.driver_phone,
                "vehicle": confirmation.vehicle_description,
                "vehicle_plate": confirmation.vehicle_plate,
                "emergency_phone": confirmation.emergency_phone,
                "total_amount": float(confirmation.confirmed_amount),
                "currency": service_request.currency
            }
            
            # Enviar notificación al cliente
            recipients = []
            if service_request.lead_passenger_phone:
                recipients.append(service_request.lead_passenger_phone)
            
            await self._send_notification(
                type="customer_confirmation",
                title="Confirmación de Servicio de Transporte",
                message=f"Su servicio ha sido confirmado. Confirmación: {confirmation.confirmation_number}",
                priority="high",
                recipients=recipients,
                channel="multi",  # Email, SMS, WhatsApp
                data=confirmation_data
            )
            
            # Marcar como enviado
            confirmation.confirmation_sent_to_customer = True
            confirmation.customer_notified_at = datetime.now(timezone.utc)
            
            await self.db.commit()
            
            logger.info(f"Customer confirmation sent for {confirmation_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending customer confirmation: {str(e)}")
            return False
    
    # ============================
    # MONITORING & ALERTS
    # ============================
    
    async def check_pending_confirmations(self) -> List[ServiceRequest]:
        """
        Verifica solicitudes pendientes de confirmación que están por vencer
        """
        # Solicitudes que requieren confirmación en las próximas 24 horas
        deadline = datetime.now(timezone.utc) + timedelta(hours=24)
        
        result = await self.db.execute(
            select(ServiceRequest)
            .where(
                and_(
                    ServiceRequest.status == ServiceRequestStatus.QUOTES_RECEIVED,
                    ServiceRequest.confirmation_required_by <= deadline,
                    ServiceRequest.confirmation_required_by > datetime.now(timezone.utc)
                )
            )
        )
        
        pending_requests = result.scalars().all()
        
        # Enviar alertas para cada solicitud pendiente
        for request in pending_requests:
            await self._send_notification(
                type="confirmation_pending",
                title="Confirmación Pendiente",
                message=f"La solicitud #{request.request_number} requiere confirmación urgente",
                priority="high",
                recipients=[request.requested_by]
            )
        
        return pending_requests
    
    async def escalate_no_quotes(self, request_id: str):
        """
        Escala solicitudes sin cotizaciones a otros proveedores
        """
        try:
            service_request = await self.db.get(ServiceRequest, request_id)
            if not service_request:
                return
            
            # Si no hay cotizaciones y ha pasado el deadline
            if (service_request.quotes_received == 0 and 
                service_request.quote_deadline < datetime.now(timezone.utc)):
                
                # Obtener proveedores que no fueron contactados inicialmente
                all_providers = await self.get_active_providers(
                    service_date=service_request.service_date,
                    vehicle_type=service_request.vehicle_type_required,
                    min_seats=service_request.min_seats_required
                )
                
                # Filtrar los ya contactados
                contacted_providers = await self.db.execute(
                    select(TransportQuote.provider_id)
                    .where(TransportQuote.service_request_id == request_id)
                )
                contacted_ids = [p for p in contacted_providers.scalars().all()]
                
                new_providers = [p for p in all_providers if p.id not in contacted_ids]
                
                # Enviar a nuevos proveedores
                for provider in new_providers[:3]:  # Máximo 3 nuevos
                    await self._create_quote_request(service_request, provider)
                    
                    await self._send_notification(
                        type="urgent_quote_request",
                        title="Solicitud Urgente de Cotización",
                        message=f"Solicitud urgente #{service_request.request_number}",
                        priority="urgent",
                        recipients=[provider.email]
                    )
                
                # Extender deadline
                service_request.quote_deadline = datetime.now(timezone.utc) + timedelta(hours=4)
                service_request.status = ServiceRequestStatus.PENDING_QUOTES
                
                await self.db.commit()
                
                logger.info(f"Escalated request {request_id} to new providers")
                
        except Exception as e:
            logger.error(f"Error escalating request: {str(e)}")
    
    # ============================
    # HELPER METHODS
    # ============================
    
    async def _generate_request_number(self) -> str:
        """Genera un número único de solicitud"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = str(random.randint(1000, 9999))
        return f"REQ-{timestamp}-{random_suffix}"
    
    async def _generate_confirmation_number(self) -> str:
        """Genera un número único de confirmación"""
        timestamp = datetime.now().strftime("%Y%m%d")
        random_suffix = str(random.randint(10000, 99999))
        return f"CNF-{timestamp}-{random_suffix}"
    
    async def _create_quote_request(self, 
                                   service_request: ServiceRequest,
                                   provider: TransportProvider) -> TransportQuote:
        """Crea una solicitud de cotización para un proveedor"""
        try:
            # Generar número de cotización
            quote_number = f"QT-{service_request.request_number}-{provider.id[:8]}"
            
            # Calcular validez
            valid_until = service_request.quote_deadline or \
                         datetime.now(timezone.utc) + timedelta(hours=24)
            
            quote = TransportQuote(
                quote_number=quote_number,
                service_request_id=service_request.id,
                provider_id=provider.id,
                status=QuoteStatus.PENDING,
                valid_until=valid_until,
                created_at=datetime.now(timezone.utc)
            )
            
            self.db.add(quote)
            await self.db.commit()
            await self.db.refresh(quote)
            
            return quote
            
        except Exception as e:
            logger.error(f"Error creating quote request: {str(e)}")
            return None
    
    async def _calculate_quote_score(self, quote: TransportQuote) -> TransportQuote:
        """Calcula el score automático de una cotización"""
        # Obtener proveedor para métricas
        provider = await self.get_provider(quote.provider_id)
        
        # Score de precio (40% del total)
        # Normalizar precio (asumiendo rango de 0-1000)
        price_normalized = min(float(quote.total_amount) / 1000, 1)
        quote.price_score = (1 - price_normalized) * 40
        
        # Score del proveedor (30% del total)
        if provider:
            quote.provider_score = (provider.rating / 5) * 30
        else:
            quote.provider_score = 15  # Score medio si no hay datos
        
        # Score del vehículo (30% del total)
        vehicle_score = 15  # Base
        if quote.proposed_vehicle_type:
            # Bonus por tipo de vehículo premium
            if 'luxury' in quote.proposed_vehicle_type.value.lower():
                vehicle_score += 10
            elif 'executive' in quote.proposed_vehicle_type.value.lower():
                vehicle_score += 5
        quote.vehicle_score = min(vehicle_score, 30)
        
        # Score total
        quote.total_score = quote.price_score + quote.provider_score + quote.vehicle_score
        
        return quote
    
    async def _check_provider_availability(self, provider_id: str, service_date: date) -> bool:
        """Verifica si un proveedor está disponible en una fecha"""
        # Verificar si tiene vehículos disponibles
        vehicles = await self.get_available_vehicles(
            provider_id=provider_id,
            service_date=service_date
        )
        
        # Verificar si tiene conductores disponibles
        drivers = await self.get_available_drivers(
            provider_id=provider_id,
            service_date=service_date
        )
        
        return len(vehicles) > 0 and len(drivers) > 0
    
    async def _check_vehicle_availability(self, vehicle_id: str, service_date: date) -> bool:
        """Verifica si un vehículo está disponible en una fecha"""
        # Buscar asignaciones existentes para esa fecha
        result = await self.db.execute(
            select(VehicleAssignment)
            .where(
                and_(
                    VehicleAssignment.vehicle_id == vehicle_id,
                    VehicleAssignment.assignment_date == service_date,
                    VehicleAssignment.is_confirmed == True
                )
            )
        )
        
        assignments = result.scalars().all()
        return len(assignments) == 0
    
    async def _check_driver_availability(self, driver_id: str, service_date: date) -> bool:
        """Verifica si un conductor está disponible en una fecha"""
        # Buscar asignaciones existentes para esa fecha
        result = await self.db.execute(
            select(VehicleAssignment)
            .where(
                and_(
                    VehicleAssignment.driver_id == driver_id,
                    VehicleAssignment.assignment_date == service_date,
                    VehicleAssignment.is_confirmed == True
                )
            )
        )
        
        assignments = result.scalars().all()
        
        # Verificar también las horas máximas diarias del conductor
        if assignments:
            driver = await self.db.get(TransportDriver, driver_id)
            if driver:
                total_hours = sum([4 for _ in assignments])  # Asumiendo 4 horas por servicio
                if total_hours >= driver.max_daily_hours:
                    return False
        
        return True
    
    async def _apply_selection_criteria(self, 
                                       quotes: List[TransportQuote],
                                       criteria: Dict[str, Any]) -> List[TransportQuote]:
        """Aplica criterios personalizados de selección"""
        # Ejemplo de criterios:
        # {"max_price": 500, "min_rating": 4.0, "vehicle_type": "luxury_coach"}
        
        filtered_quotes = quotes
        
        if "max_price" in criteria:
            filtered_quotes = [q for q in filtered_quotes 
                              if q.total_amount <= criteria["max_price"]]
        
        if "min_rating" in criteria:
            # Filtrar por rating del proveedor
            filtered_quotes = []
            for quote in quotes:
                provider = await self.get_provider(quote.provider_id)
                if provider and provider.rating >= criteria["min_rating"]:
                    filtered_quotes.append(quote)
        
        if "vehicle_type" in criteria:
            filtered_quotes = [q for q in filtered_quotes 
                              if q.proposed_vehicle_type == criteria["vehicle_type"]]
        
        return filtered_quotes
    
    async def _send_notification(self, **kwargs):
        """Envía notificaciones (placeholder para sistema real)"""
        notification = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **kwargs
        }
        
        # Agregar a cola de notificaciones
        self.notification_queue.append(notification)
        
        # En producción, esto se integraría con servicios reales de notificación
        logger.info(f"Notification queued: {notification['type']} - {notification['title']}")
        
        # Si tenemos Redis, publicar en canal de notificaciones
        if self.redis:
            try:
                await self.redis.publish(
                    f"notifications:{kwargs.get('channel', 'email')}",
                    json.dumps(notification)
                )
            except:
                pass
    
    async def _schedule_quote_reminder(self, request_id: str, deadline: datetime):
        """Programa un recordatorio para cotizaciones pendientes"""
        # En producción, esto usaría un sistema de tareas programadas como Celery
        reminder_time = deadline - timedelta(hours=2)
        
        if reminder_time > datetime.now(timezone.utc):
            logger.info(f"Reminder scheduled for request {request_id} at {reminder_time}")
            # TODO: Implementar con Celery o similar