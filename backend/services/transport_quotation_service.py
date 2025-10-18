"""
Advanced Transport Quotation Service
Supports both automatic pricing and manual quotation via email/form
"""

import asyncio
import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal
import logging
from enum import Enum

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, BackgroundTasks

from ..models.package_quotation import (
    TransportProvider, TransportQuote, RoutePrice,
    TransportType, QuotationMethod
)
from ..integrations.email_service import email_service
from ..integrations.websocket_manager import ws_manager

logger = logging.getLogger(__name__)


class TransportQuotationService:
    """
    Servicio avanzado de cotización de transporte
    Maneja cotización automática, manual por email y formularios web
    """
    
    def __init__(self):
        self.manual_quote_timeout = 48  # horas para responder cotización manual
        self.quote_validity_days = 7
        self.form_base_url = "https://spirittours.com/quotes/transport"
        
    # ==================== COTIZACIÓN AUTOMÁTICA ====================
    
    async def get_automatic_quote(
        self,
        db: Session,
        provider_id: str,
        route_data: Dict[str, Any]
    ) -> TransportQuote:
        """
        Obtener cotización automática basada en tarifas predefinidas
        """
        try:
            provider = db.query(TransportProvider).filter_by(
                id=provider_id,
                is_active=True
            ).first()
            
            if not provider:
                raise ValueError("Proveedor no encontrado")
                
            if not provider.auto_quote_enabled:
                raise ValueError("Este proveedor no tiene cotización automática habilitada")
                
            # Buscar tarifa de ruta predefinida
            route_price = self._find_route_price(
                db,
                provider_id,
                route_data['origin'],
                route_data['destination'],
                route_data.get('vehicle_type', TransportType.BUS)
            )
            
            if route_price:
                # Usar precio de ruta predefinida
                quote = self._create_quote_from_route(route_price, route_data)
            else:
                # Calcular basado en distancia/tiempo
                quote = self._calculate_dynamic_quote(provider, route_data)
                
            # Aplicar ajustes de temporada
            quote = self._apply_seasonal_adjustments(quote, route_data.get('date'))
            
            # Aplicar cargos adicionales
            quote = self._apply_additional_charges(quote, route_data)
            
            # Guardar cotización
            db.add(quote)
            db.commit()
            
            logger.info(f"Cotización automática generada: {quote.id}")
            return quote
            
        except Exception as e:
            logger.error(f"Error en cotización automática: {e}")
            raise HTTPException(status_code=400, detail=str(e))
            
    def _find_route_price(
        self,
        db: Session,
        provider_id: str,
        origin: str,
        destination: str,
        vehicle_type: TransportType
    ) -> Optional[RoutePrice]:
        """
        Buscar precio de ruta predefinida
        """
        return db.query(RoutePrice).filter(
            and_(
                RoutePrice.provider_id == provider_id,
                RoutePrice.origin == origin,
                RoutePrice.destination == destination,
                RoutePrice.vehicle_type == vehicle_type,
                RoutePrice.is_active == True,
                or_(
                    RoutePrice.valid_until >= datetime.now().date(),
                    RoutePrice.valid_until == None
                )
            )
        ).first()
        
    def _create_quote_from_route(
        self,
        route_price: RoutePrice,
        route_data: Dict[str, Any]
    ) -> TransportQuote:
        """
        Crear cotización desde precio de ruta predefinida
        """
        is_round_trip = route_data.get('round_trip', False)
        base_price = route_price.price_round_trip if is_round_trip else route_price.price_one_way
        
        # Aplicar recargos si aplican
        if route_data.get('is_weekend'):
            base_price *= Decimal(1 + route_price.weekend_surcharge)
            
        if route_data.get('is_night'):
            base_price *= Decimal(1 + route_price.night_surcharge)
            
        quote = TransportQuote(
            id=f"TQ-{uuid.uuid4().hex[:8].upper()}",
            package_id=route_data.get('package_id'),
            provider_id=route_price.provider_id,
            service_date=route_data.get('date'),
            pickup_time=route_data.get('pickup_time'),
            pickup_location=route_price.origin,
            dropoff_location=route_price.destination,
            vehicle_type=route_price.vehicle_type,
            vehicle_quantity=route_data.get('vehicle_quantity', 1),
            total_capacity=route_data.get('passenger_count'),
            route_description=route_price.route_name,
            total_distance_km=route_price.distance_km,
            estimated_duration_hours=route_price.estimated_time_hours,
            base_price=base_price,
            tolls_parking=Decimal('0'),
            additional_charges=Decimal('0'),
            total_price=base_price,
            currency='USD',
            quote_status='QUOTED',
            quoted_at=datetime.now(),
            valid_until=datetime.now() + timedelta(days=self.quote_validity_days),
            quotation_method=QuotationMethod.AUTOMATIC
        )
        
        return quote
        
    def _calculate_dynamic_quote(
        self,
        provider: TransportProvider,
        route_data: Dict[str, Any]
    ) -> TransportQuote:
        """
        Calcular cotización dinámica basada en km/hora
        """
        distance = route_data.get('distance_km', 0)
        duration = route_data.get('duration_hours', 0)
        vehicle_type = route_data.get('vehicle_type', TransportType.BUS)
        
        # Obtener tarifas del proveedor
        rates = provider.vehicle_rates.get(vehicle_type.value, {}) if provider.vehicle_rates else {}
        
        base_price = Decimal('0')
        
        # Calcular por distancia
        if distance > 0 and rates.get('per_km'):
            base_price = Decimal(str(distance)) * Decimal(str(rates['per_km']))
            
        # O calcular por tiempo
        elif duration > 0 and rates.get('per_hour'):
            base_price = Decimal(str(duration)) * Decimal(str(rates['per_hour']))
            
        # O usar tarifa diaria
        elif rates.get('per_day'):
            days = max(1, int(duration / 8))  # Asumiendo 8 horas = 1 día
            base_price = Decimal(str(days)) * Decimal(str(rates['per_day']))
            
        # Aplicar cargo mínimo
        if provider.minimum_charge:
            base_price = max(base_price, provider.minimum_charge)
            
        quote = TransportQuote(
            id=f"TQ-{uuid.uuid4().hex[:8].upper()}",
            package_id=route_data.get('package_id'),
            provider_id=provider.id,
            service_date=route_data.get('date'),
            pickup_time=route_data.get('pickup_time'),
            pickup_location=route_data.get('origin'),
            dropoff_location=route_data.get('destination'),
            vehicle_type=vehicle_type,
            vehicle_quantity=route_data.get('vehicle_quantity', 1),
            total_capacity=route_data.get('passenger_count'),
            route_description=route_data.get('description', ''),
            total_distance_km=distance,
            estimated_duration_hours=duration,
            base_price=base_price,
            tolls_parking=Decimal('0'),
            additional_charges=Decimal('0'),
            total_price=base_price,
            currency=provider.currency,
            quote_status='QUOTED',
            quoted_at=datetime.now(),
            valid_until=datetime.now() + timedelta(days=self.quote_validity_days),
            quotation_method=QuotationMethod.AUTOMATIC
        )
        
        return quote
        
    def _apply_seasonal_adjustments(
        self,
        quote: TransportQuote,
        service_date: Optional[datetime]
    ) -> TransportQuote:
        """
        Aplicar ajustes de temporada
        """
        if not service_date:
            return quote
            
        # Temporada alta (ejemplo: diciembre-enero, julio-agosto)
        high_season_months = [12, 1, 7, 8]
        if service_date.month in high_season_months:
            quote.additional_charges += quote.base_price * Decimal('0.20')  # 20% extra
            quote.total_price = quote.base_price + quote.tolls_parking + quote.additional_charges
            
        return quote
        
    def _apply_additional_charges(
        self,
        quote: TransportQuote,
        route_data: Dict[str, Any]
    ) -> TransportQuote:
        """
        Aplicar cargos adicionales
        """
        # Estimación de peajes y estacionamiento
        if quote.total_distance_km:
            # Aproximadamente $0.10 por km en peajes
            quote.tolls_parking = Decimal(str(quote.total_distance_km * 0.10))
            
        # Propina del conductor (opcional)
        if route_data.get('include_driver_tip'):
            quote.driver_tip = quote.base_price * Decimal('0.10')  # 10% de propina
            
        # Actualizar precio total
        quote.total_price = (
            quote.base_price + 
            quote.tolls_parking + 
            quote.additional_charges +
            (quote.driver_tip or Decimal('0'))
        )
        
        return quote
        
    # ==================== COTIZACIÓN MANUAL POR EMAIL ====================
    
    async def request_manual_quote_by_email(
        self,
        db: Session,
        provider_id: str,
        route_data: Dict[str, Any],
        package_info: Dict[str, Any],
        background_tasks: BackgroundTasks
    ) -> Dict[str, Any]:
        """
        Solicitar cotización manual por email
        """
        try:
            provider = db.query(TransportProvider).filter_by(id=provider_id).first()
            if not provider:
                raise ValueError("Proveedor no encontrado")
                
            # Crear registro de cotización pendiente
            quote = TransportQuote(
                id=f"TQ-{uuid.uuid4().hex[:8].upper()}",
                package_id=route_data.get('package_id'),
                provider_id=provider_id,
                service_date=route_data.get('date'),
                pickup_location=route_data.get('origin'),
                dropoff_location=route_data.get('destination'),
                vehicle_type=route_data.get('vehicle_type', TransportType.BUS),
                vehicle_quantity=route_data.get('vehicle_quantity', 1),
                total_capacity=route_data.get('passenger_count'),
                route_description=route_data.get('description', ''),
                total_distance_km=route_data.get('distance_km'),
                estimated_duration_hours=route_data.get('duration_hours'),
                quote_status='PENDING',
                quotation_method=QuotationMethod.MANUAL_EMAIL,
                valid_until=datetime.now() + timedelta(hours=self.manual_quote_timeout)
            )
            
            db.add(quote)
            db.commit()
            
            # Enviar email al proveedor
            background_tasks.add_task(
                self._send_quote_request_email,
                provider,
                quote,
                route_data,
                package_info
            )
            
            # Programar recordatorio
            background_tasks.add_task(
                self._schedule_quote_reminder,
                quote.id,
                provider.email,
                24  # Recordatorio a las 24 horas
            )
            
            return {
                "status": "success",
                "message": f"Solicitud de cotización enviada a {provider.company_name}",
                "quote_id": quote.id,
                "expected_response_time": f"{provider.response_time_hours} horas"
            }
            
        except Exception as e:
            logger.error(f"Error solicitando cotización manual: {e}")
            raise HTTPException(status_code=400, detail=str(e))
            
    async def _send_quote_request_email(
        self,
        provider: TransportProvider,
        quote: TransportQuote,
        route_data: Dict[str, Any],
        package_info: Dict[str, Any]
    ):
        """
        Enviar email de solicitud de cotización al proveedor
        """
        template_data = {
            "provider_name": provider.company_name,
            "quote_id": quote.id,
            "service_date": quote.service_date.strftime("%d/%m/%Y"),
            "pickup_time": quote.pickup_time.strftime("%H:%M") if quote.pickup_time else "Por definir",
            "pickup_location": quote.pickup_location,
            "dropoff_location": quote.dropoff_location,
            "vehicle_type": quote.vehicle_type.value,
            "vehicle_quantity": quote.vehicle_quantity,
            "passenger_count": quote.total_capacity,
            "distance_km": quote.total_distance_km,
            "duration_hours": quote.estimated_duration_hours,
            "itinerary": route_data.get('detailed_itinerary', ''),
            "package_name": package_info.get('name'),
            "client_company": package_info.get('company'),
            "contact_person": package_info.get('contact'),
            "response_deadline": (datetime.now() + timedelta(hours=self.manual_quote_timeout)).strftime("%d/%m/%Y %H:%M"),
            "response_url": f"{self.form_base_url}/{quote.id}"
        }
        
        await email_service.send_transport_quote_request(
            to_email=provider.notification_email or provider.email,
            provider_name=provider.company_name,
            template_data=template_data
        )
        
        logger.info(f"Email de cotización enviado a {provider.email}")
        
    # ==================== COTIZACIÓN MANUAL POR FORMULARIO ====================
    
    async def generate_quote_form_link(
        self,
        db: Session,
        provider_id: str,
        route_data: Dict[str, Any]
    ) -> str:
        """
        Generar link de formulario para cotización manual
        """
        try:
            provider = db.query(TransportProvider).filter_by(id=provider_id).first()
            if not provider:
                raise ValueError("Proveedor no encontrado")
                
            # Crear token único para el formulario
            form_token = uuid.uuid4().hex
            
            # Crear registro de cotización pendiente
            quote = TransportQuote(
                id=f"TQ-{uuid.uuid4().hex[:8].upper()}",
                package_id=route_data.get('package_id'),
                provider_id=provider_id,
                service_date=route_data.get('date'),
                pickup_location=route_data.get('origin'),
                dropoff_location=route_data.get('destination'),
                vehicle_type=route_data.get('vehicle_type', TransportType.BUS),
                vehicle_quantity=route_data.get('vehicle_quantity', 1),
                total_capacity=route_data.get('passenger_count'),
                quote_status='PENDING',
                quotation_method=QuotationMethod.MANUAL_FORM,
                manual_quote_link=f"{self.form_base_url}?token={form_token}",
                valid_until=datetime.now() + timedelta(hours=self.manual_quote_timeout)
            )
            
            db.add(quote)
            
            # Guardar token en cache/DB para validación
            # cache.set(f"quote_form_{form_token}", quote.id, expire=48*3600)
            
            db.commit()
            
            # Enviar link por email al proveedor
            await self._send_form_link_email(provider, quote)
            
            return quote.manual_quote_link
            
        except Exception as e:
            logger.error(f"Error generando link de formulario: {e}")
            raise HTTPException(status_code=400, detail=str(e))
            
    async def _send_form_link_email(
        self,
        provider: TransportProvider,
        quote: TransportQuote
    ):
        """
        Enviar link del formulario al proveedor
        """
        await email_service.send_email(
            to_email=provider.notification_email or provider.email,
            subject=f"Solicitud de Cotización - {quote.id}",
            email_type="TRANSPORT_QUOTE_FORM",
            template_data={
                "provider_name": provider.company_name,
                "form_link": quote.manual_quote_link,
                "deadline": quote.valid_until.strftime("%d/%m/%Y %H:%M"),
                "quote_id": quote.id
            }
        )
        
    async def process_manual_quote_response(
        self,
        db: Session,
        quote_id: str,
        response_data: Dict[str, Any]
    ) -> TransportQuote:
        """
        Procesar respuesta de cotización manual
        """
        try:
            quote = db.query(TransportQuote).filter_by(id=quote_id).first()
            if not quote:
                raise ValueError("Cotización no encontrada")
                
            if quote.quote_status != 'PENDING':
                raise ValueError("Esta cotización ya fue procesada")
                
            # Actualizar con la información recibida
            quote.base_price = Decimal(str(response_data['base_price']))
            quote.tolls_parking = Decimal(str(response_data.get('tolls_parking', 0)))
            quote.additional_charges = Decimal(str(response_data.get('additional_charges', 0)))
            quote.driver_tip = Decimal(str(response_data.get('driver_tip', 0)))
            
            quote.total_price = (
                quote.base_price + 
                quote.tolls_parking + 
                quote.additional_charges +
                quote.driver_tip
            )
            
            quote.provider_notes = response_data.get('notes')
            quote.includes = response_data.get('includes', [])
            quote.excludes = response_data.get('excludes', [])
            
            quote.quote_status = 'RECEIVED'
            quote.quoted_at = datetime.now()
            quote.valid_until = datetime.now() + timedelta(days=self.quote_validity_days)
            
            db.commit()
            
            # Notificar al usuario que la cotización fue recibida
            await self._notify_quote_received(quote)
            
            logger.info(f"Cotización manual procesada: {quote_id}")
            return quote
            
        except Exception as e:
            logger.error(f"Error procesando respuesta de cotización: {e}")
            raise HTTPException(status_code=400, detail=str(e))
            
    async def _notify_quote_received(self, quote: TransportQuote):
        """
        Notificar que se recibió una cotización
        """
        # Enviar notificación por WebSocket
        await ws_manager.broadcast_to_quotation(
            quotation_id=quote.package_id,
            event_type="TRANSPORT_QUOTE_RECEIVED",
            data={
                "quote_id": quote.id,
                "provider_id": quote.provider_id,
                "total_price": float(quote.total_price),
                "status": quote.quote_status
            }
        )
        
    # ==================== GESTIÓN DE PROVEEDORES ====================
    
    async def get_available_providers(
        self,
        db: Session,
        location: str,
        date: datetime,
        vehicle_type: Optional[TransportType] = None
    ) -> List[TransportProvider]:
        """
        Obtener proveedores disponibles para una ubicación y fecha
        """
        query = db.query(TransportProvider).filter(
            TransportProvider.is_active == True,
            TransportProvider.service_areas.contains([location])
        )
        
        if vehicle_type:
            query = query.filter(
                TransportProvider.vehicle_types.contains([vehicle_type.value])
            )
            
        providers = query.all()
        
        # Filtrar por disponibilidad
        available = []
        for provider in providers:
            # Verificar si requiere días de anticipación
            if provider.requires_advance_days:
                days_advance = (date - datetime.now()).days
                if days_advance < provider.requires_advance_days:
                    continue
                    
            available.append(provider)
            
        return available
        
    async def compare_quotes(
        self,
        db: Session,
        package_id: str
    ) -> List[Dict[str, Any]]:
        """
        Comparar todas las cotizaciones recibidas para un paquete
        """
        quotes = db.query(TransportQuote).filter(
            TransportQuote.package_id == package_id,
            TransportQuote.quote_status.in_(['QUOTED', 'RECEIVED'])
        ).all()
        
        comparison = []
        for quote in quotes:
            provider = db.query(TransportProvider).filter_by(id=quote.provider_id).first()
            
            comparison.append({
                "quote_id": quote.id,
                "provider_name": provider.company_name if provider else "Unknown",
                "provider_rating": provider.rating if provider else 0,
                "vehicle_type": quote.vehicle_type.value,
                "total_price": float(quote.total_price),
                "includes": quote.includes,
                "excludes": quote.excludes,
                "quotation_method": quote.quotation_method.value,
                "valid_until": quote.valid_until.isoformat()
            })
            
        # Ordenar por precio
        comparison.sort(key=lambda x: x['total_price'])
        
        return comparison
        
    async def confirm_quote(
        self,
        db: Session,
        quote_id: str,
        confirmation_data: Dict[str, Any]
    ) -> TransportQuote:
        """
        Confirmar una cotización de transporte
        """
        try:
            quote = db.query(TransportQuote).filter_by(id=quote_id).first()
            if not quote:
                raise ValueError("Cotización no encontrada")
                
            quote.is_confirmed = True
            quote.confirmed_at = datetime.now()
            quote.confirmation_number = f"CONF-{uuid.uuid4().hex[:8].upper()}"
            quote.quote_status = 'ACCEPTED'
            
            db.commit()
            
            # Notificar al proveedor
            await self._notify_provider_confirmation(quote)
            
            return quote
            
        except Exception as e:
            logger.error(f"Error confirmando cotización: {e}")
            raise HTTPException(status_code=400, detail=str(e))
            
    async def _notify_provider_confirmation(self, quote: TransportQuote):
        """
        Notificar al proveedor que su cotización fue aceptada
        """
        provider = quote.provider
        
        await email_service.send_email(
            to_email=provider.notification_email or provider.email,
            subject=f"✅ Cotización Aceptada - {quote.confirmation_number}",
            email_type="QUOTE_CONFIRMATION",
            template_data={
                "provider_name": provider.company_name,
                "confirmation_number": quote.confirmation_number,
                "service_date": quote.service_date.strftime("%d/%m/%Y"),
                "total_amount": float(quote.total_price)
            }
        )
        
    # ==================== ESTADÍSTICAS Y REPORTES ====================
    
    async def get_provider_statistics(
        self,
        db: Session,
        provider_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Obtener estadísticas de un proveedor
        """
        query = db.query(TransportQuote).filter(
            TransportQuote.provider_id == provider_id
        )
        
        if start_date:
            query = query.filter(TransportQuote.created_at >= start_date)
        if end_date:
            query = query.filter(TransportQuote.created_at <= end_date)
            
        quotes = query.all()
        
        stats = {
            "total_quotes": len(quotes),
            "quotes_accepted": len([q for q in quotes if q.is_confirmed]),
            "quotes_pending": len([q for q in quotes if q.quote_status == 'PENDING']),
            "average_response_time": self._calculate_avg_response_time(quotes),
            "total_revenue": sum(q.total_price for q in quotes if q.is_confirmed),
            "acceptance_rate": len([q for q in quotes if q.is_confirmed]) / len(quotes) * 100 if quotes else 0,
            "quotation_methods": {
                "automatic": len([q for q in quotes if q.quotation_method == QuotationMethod.AUTOMATIC]),
                "manual_email": len([q for q in quotes if q.quotation_method == QuotationMethod.MANUAL_EMAIL]),
                "manual_form": len([q for q in quotes if q.quotation_method == QuotationMethod.MANUAL_FORM])
            }
        }
        
        return stats
        
    def _calculate_avg_response_time(self, quotes: List[TransportQuote]) -> float:
        """
        Calcular tiempo promedio de respuesta
        """
        response_times = []
        for quote in quotes:
            if quote.quoted_at and quote.created_at:
                diff = (quote.quoted_at - quote.created_at).total_seconds() / 3600  # en horas
                response_times.append(diff)
                
        return sum(response_times) / len(response_times) if response_times else 0


# Instancia global del servicio
transport_quotation_service = TransportQuotationService()