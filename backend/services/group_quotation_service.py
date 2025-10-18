"""
Group Quotation Service for Spirit Tours Platform
Implements competitive RFQ system with privacy controls and deposit tracking
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from enum import Enum
import uuid
import asyncio
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException, BackgroundTasks
import logging

from ..models.quotation import (
    GroupQuotation, QuotationResponse, HotelProvider,
    QuotationStatus, ResponseStatus, PaymentStatus
)
from ..integrations.email_service import EmailService
from ..integrations.payment_gateway import PaymentGatewayService
from ..integrations.websocket_manager import WebSocketManager
from ..database.connection import get_db

logger = logging.getLogger(__name__)


class HotelSelectionMode(Enum):
    """Modos de selección de hoteles"""
    AUTOMATIC = "AUTOMATIC"  # Sistema selecciona automáticamente
    MANUAL = "MANUAL"  # Cliente selecciona manualmente
    MIXED = "MIXED"  # Combinación de ambos


class QuotationService:
    """Servicio principal para gestión de cotizaciones grupales"""
    
    def __init__(self):
        self.email_service = EmailService()
        self.payment_service = PaymentGatewayService()
        self.ws_manager = WebSocketManager()
        self.max_price_updates = 2  # Máximo de actualizaciones permitidas
        self.default_deadline_days = 7  # Deadline por defecto en días
        self.max_deadline_extensions = 2  # Máximo de extensiones permitidas
        
    async def create_group_quotation(
        self,
        db: Session,
        quotation_data: Dict[str, Any],
        user_id: str,
        company_id: str
    ) -> GroupQuotation:
        """
        Crear nueva cotización grupal con configuración de privacidad
        
        Args:
            db: Sesión de base de datos
            quotation_data: Datos de la cotización
            user_id: ID del usuario creador
            company_id: ID de la empresa B2B/B2B2C
            
        Returns:
            GroupQuotation: Cotización creada
        """
        try:
            # Generar ID único para la cotización
            quotation_id = f"GQ-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
            
            # Calcular deadline (1 semana por defecto)
            deadline = datetime.now() + timedelta(days=self.default_deadline_days)
            
            # Configurar depósito requerido
            deposit_config = {
                'required': quotation_data.get('deposit_required', True),
                'amount': quotation_data.get('deposit_amount', 0),
                'percentage': quotation_data.get('deposit_percentage', 0.20),
                'currency': quotation_data.get('currency', 'USD'),
                'received': False,
                'payment_date': None
            }
            
            # Configurar selección de hoteles
            hotel_selection = {
                'mode': quotation_data.get('hotel_selection_mode', HotelSelectionMode.AUTOMATIC.value),
                'selected_hotels': quotation_data.get('selected_hotels', []),
                'auto_select_count': quotation_data.get('auto_select_count', 5),
                'selection_criteria': quotation_data.get('selection_criteria', {
                    'min_rating': 3.5,
                    'max_distance': 10,  # km desde destino
                    'price_range': 'competitive',
                    'amenities_required': []
                })
            }
            
            # Configurar privacidad de precios
            privacy_settings = {
                'hide_competitor_prices': quotation_data.get('hide_competitor_prices', True),
                'show_own_ranking': quotation_data.get('show_own_ranking', True),
                'reveal_prices_after_deadline': quotation_data.get('reveal_prices_after_deadline', False),
                'admin_can_override': True
            }
            
            # Crear cotización en la base de datos
            quotation = GroupQuotation(
                id=quotation_id,
                company_id=company_id,
                user_id=user_id,
                title=quotation_data.get('title'),
                description=quotation_data.get('description'),
                destination=quotation_data.get('destination'),
                check_in_date=quotation_data.get('check_in_date'),
                check_out_date=quotation_data.get('check_out_date'),
                num_rooms=quotation_data.get('num_rooms'),
                num_guests=quotation_data.get('num_guests'),
                room_types=quotation_data.get('room_types', ['standard']),
                meal_plan=quotation_data.get('meal_plan', 'BB'),  # Bed & Breakfast por defecto
                special_requirements=quotation_data.get('special_requirements', []),
                budget_min=quotation_data.get('budget_min'),
                budget_max=quotation_data.get('budget_max'),
                currency=quotation_data.get('currency', 'USD'),
                deposit_config=deposit_config,
                hotel_selection=hotel_selection,
                privacy_settings=privacy_settings,
                deadline=deadline,
                deadline_extensions_used=0,
                status=QuotationStatus.DRAFT,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            db.add(quotation)
            db.commit()
            db.refresh(quotation)
            
            # Si el modo es automático o mixto, seleccionar hoteles
            if hotel_selection['mode'] in [HotelSelectionMode.AUTOMATIC.value, HotelSelectionMode.MIXED.value]:
                selected_hotels = await self._select_hotels_automatically(
                    db, quotation, hotel_selection['selection_criteria']
                )
                quotation.invited_hotels = selected_hotels
                db.commit()
            
            # Enviar invitaciones a hoteles seleccionados
            if quotation.status == QuotationStatus.PUBLISHED:
                await self._send_invitations_to_hotels(quotation)
            
            # Notificar vía WebSocket
            await self.ws_manager.broadcast_to_company(
                company_id,
                {
                    'event': 'quotation_created',
                    'quotation_id': quotation_id,
                    'data': quotation.to_dict()
                }
            )
            
            logger.info(f"Cotización grupal creada: {quotation_id}")
            return quotation
            
        except Exception as e:
            logger.error(f"Error creando cotización: {str(e)}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error creando cotización: {str(e)}")
    
    async def submit_hotel_response(
        self,
        db: Session,
        quotation_id: str,
        hotel_id: str,
        response_data: Dict[str, Any]
    ) -> QuotationResponse:
        """
        Procesar respuesta de hotel con validación de límites de actualización
        
        Args:
            db: Sesión de base de datos
            quotation_id: ID de la cotización
            hotel_id: ID del hotel respondiendo
            response_data: Datos de la respuesta
            
        Returns:
            QuotationResponse: Respuesta procesada
        """
        try:
            # Obtener cotización
            quotation = db.query(GroupQuotation).filter_by(id=quotation_id).first()
            if not quotation:
                raise HTTPException(status_code=404, detail="Cotización no encontrada")
            
            # Verificar deadline
            if datetime.now() > quotation.deadline:
                raise HTTPException(status_code=400, detail="El deadline para esta cotización ha expirado")
            
            # Verificar si el hotel está invitado
            if hotel_id not in quotation.invited_hotels:
                raise HTTPException(status_code=403, detail="Hotel no autorizado para esta cotización")
            
            # Buscar respuesta existente
            existing_response = db.query(QuotationResponse).filter_by(
                quotation_id=quotation_id,
                hotel_id=hotel_id
            ).first()
            
            # Validar límite de actualizaciones
            if existing_response:
                if existing_response.price_update_attempts >= self.max_price_updates:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Límite de actualizaciones alcanzado ({self.max_price_updates})"
                    )
                existing_response.price_update_attempts += 1
            
            # Preparar datos de respuesta
            response_id = f"QR-{uuid.uuid4().hex[:8].upper()}"
            
            # Calcular precios con estrategia
            pricing_strategy = response_data.get('pricing_strategy', 'competitive')
            base_price = Decimal(str(response_data.get('base_price', 0)))
            
            # Aplicar estrategia de precios
            final_price = self._apply_pricing_strategy(
                base_price, 
                pricing_strategy,
                quotation,
                existing_response
            )
            
            # Crear o actualizar respuesta
            if existing_response:
                existing_response.base_price = base_price
                existing_response.final_price = final_price
                existing_response.discount_percentage = response_data.get('discount_percentage', 0)
                existing_response.included_services = response_data.get('included_services', [])
                existing_response.excluded_services = response_data.get('excluded_services', [])
                existing_response.cancellation_policy = response_data.get('cancellation_policy')
                existing_response.payment_terms = response_data.get('payment_terms')
                existing_response.special_offers = response_data.get('special_offers', [])
                existing_response.validity_days = response_data.get('validity_days', 7)
                existing_response.notes = response_data.get('notes')
                existing_response.updated_at = datetime.now()
                existing_response.status = ResponseStatus.UPDATED
                
                response = existing_response
            else:
                response = QuotationResponse(
                    id=response_id,
                    quotation_id=quotation_id,
                    hotel_id=hotel_id,
                    base_price=base_price,
                    final_price=final_price,
                    currency=response_data.get('currency', 'USD'),
                    discount_percentage=response_data.get('discount_percentage', 0),
                    included_services=response_data.get('included_services', []),
                    excluded_services=response_data.get('excluded_services', []),
                    cancellation_policy=response_data.get('cancellation_policy'),
                    payment_terms=response_data.get('payment_terms'),
                    special_offers=response_data.get('special_offers', []),
                    validity_days=response_data.get('validity_days', 7),
                    notes=response_data.get('notes'),
                    pricing_strategy=pricing_strategy,
                    price_update_attempts=0 if not existing_response else existing_response.price_update_attempts,
                    can_see_competitor_prices=False,  # Por defecto NO puede ver precios
                    status=ResponseStatus.SUBMITTED,
                    submitted_at=datetime.now(),
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                
                db.add(response)
            
            db.commit()
            db.refresh(response)
            
            # Notificar al cliente B2B/B2B2C
            await self._notify_client_new_response(quotation, response)
            
            # Broadcast actualización vía WebSocket
            await self.ws_manager.broadcast_to_quotation(
                quotation_id,
                {
                    'event': 'new_response' if not existing_response else 'response_updated',
                    'hotel_id': hotel_id,
                    'data': self._sanitize_response_for_broadcast(response, hotel_id)
                }
            )
            
            logger.info(f"Respuesta de hotel procesada: {response_id} para cotización {quotation_id}")
            return response
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error procesando respuesta de hotel: {str(e)}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error procesando respuesta: {str(e)}")
    
    async def process_deposit_payment(
        self,
        db: Session,
        quotation_id: str,
        payment_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Procesar pago de depósito para confirmar cotización
        
        Args:
            db: Sesión de base de datos
            quotation_id: ID de la cotización
            payment_data: Datos del pago
            
        Returns:
            Dict con resultado del pago
        """
        try:
            # Obtener cotización
            quotation = db.query(GroupQuotation).filter_by(id=quotation_id).first()
            if not quotation:
                raise HTTPException(status_code=404, detail="Cotización no encontrada")
            
            # Verificar si requiere depósito
            if not quotation.deposit_config.get('required'):
                return {
                    'status': 'not_required',
                    'message': 'Esta cotización no requiere depósito'
                }
            
            # Calcular monto del depósito
            if quotation.selected_response_id:
                selected_response = db.query(QuotationResponse).filter_by(
                    id=quotation.selected_response_id
                ).first()
                
                if selected_response:
                    total_amount = selected_response.final_price * quotation.num_rooms
                    deposit_amount = total_amount * Decimal(str(quotation.deposit_config['percentage']))
                else:
                    deposit_amount = Decimal(str(quotation.deposit_config['amount']))
            else:
                deposit_amount = Decimal(str(quotation.deposit_config['amount']))
            
            # Procesar pago con gateway correspondiente
            gateway_result = await self.payment_service.process_payment(
                amount=float(deposit_amount),
                currency=quotation.deposit_config['currency'],
                payment_method=payment_data.get('payment_method'),
                card_details=payment_data.get('card_details'),
                customer_info=payment_data.get('customer_info'),
                reference=f"DEP-{quotation_id}"
            )
            
            if gateway_result['status'] == 'success':
                # Actualizar estado del depósito
                quotation.deposit_config['received'] = True
                quotation.deposit_config['payment_date'] = datetime.now().isoformat()
                quotation.deposit_config['transaction_id'] = gateway_result.get('transaction_id')
                quotation.deposit_config['payment_method'] = payment_data.get('payment_method')
                
                # Cambiar estado de la cotización
                quotation.status = QuotationStatus.DEPOSIT_PAID
                quotation.payment_status = PaymentStatus.DEPOSIT_RECEIVED
                
                db.commit()
                
                # Notificar al hotel seleccionado
                if quotation.selected_response_id:
                    await self._notify_hotel_deposit_received(quotation)
                
                # Enviar confirmación al cliente
                await self._send_deposit_confirmation(quotation, gateway_result)
                
                # Broadcast actualización
                await self.ws_manager.broadcast_to_quotation(
                    quotation_id,
                    {
                        'event': 'deposit_received',
                        'data': {
                            'quotation_id': quotation_id,
                            'amount': float(deposit_amount),
                            'transaction_id': gateway_result.get('transaction_id')
                        }
                    }
                )
                
                return {
                    'status': 'success',
                    'message': 'Depósito procesado exitosamente',
                    'transaction_id': gateway_result.get('transaction_id'),
                    'amount': float(deposit_amount),
                    'currency': quotation.deposit_config['currency']
                }
            else:
                return {
                    'status': 'failed',
                    'message': gateway_result.get('error_message', 'Error procesando pago'),
                    'error_code': gateway_result.get('error_code')
                }
                
        except Exception as e:
            logger.error(f"Error procesando depósito: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error procesando depósito: {str(e)}")
    
    async def extend_deadline(
        self,
        db: Session,
        quotation_id: str,
        extension_days: int,
        reason: str
    ) -> GroupQuotation:
        """
        Extender deadline de cotización con validación de límites
        
        Args:
            db: Sesión de base de datos
            quotation_id: ID de la cotización
            extension_days: Días adicionales solicitados
            reason: Razón de la extensión
            
        Returns:
            GroupQuotation actualizada
        """
        try:
            # Obtener cotización
            quotation = db.query(GroupQuotation).filter_by(id=quotation_id).first()
            if not quotation:
                raise HTTPException(status_code=404, detail="Cotización no encontrada")
            
            # Verificar límite de extensiones
            if quotation.deadline_extensions_used >= self.max_deadline_extensions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Límite de extensiones alcanzado ({self.max_deadline_extensions})"
                )
            
            # Validar días de extensión (máximo 7 días por extensión)
            max_extension_days = 7
            if extension_days > max_extension_days:
                raise HTTPException(
                    status_code=400,
                    detail=f"Máximo {max_extension_days} días por extensión"
                )
            
            # Extender deadline
            old_deadline = quotation.deadline
            quotation.deadline = quotation.deadline + timedelta(days=extension_days)
            quotation.deadline_extensions_used += 1
            
            # Registrar extensión en el historial
            if not hasattr(quotation, 'extension_history'):
                quotation.extension_history = []
            
            quotation.extension_history.append({
                'extension_number': quotation.deadline_extensions_used,
                'old_deadline': old_deadline.isoformat(),
                'new_deadline': quotation.deadline.isoformat(),
                'days_extended': extension_days,
                'reason': reason,
                'requested_at': datetime.now().isoformat()
            })
            
            quotation.updated_at = datetime.now()
            db.commit()
            db.refresh(quotation)
            
            # Notificar a todos los hoteles de la extensión
            await self._notify_deadline_extension(quotation, extension_days, reason)
            
            # Broadcast actualización
            await self.ws_manager.broadcast_to_quotation(
                quotation_id,
                {
                    'event': 'deadline_extended',
                    'data': {
                        'quotation_id': quotation_id,
                        'new_deadline': quotation.deadline.isoformat(),
                        'extensions_remaining': self.max_deadline_extensions - quotation.deadline_extensions_used
                    }
                }
            )
            
            logger.info(f"Deadline extendido para cotización {quotation_id}: +{extension_days} días")
            return quotation
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error extendiendo deadline: {str(e)}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error extendiendo deadline: {str(e)}")
    
    async def toggle_price_visibility(
        self,
        db: Session,
        quotation_id: str,
        hotel_id: str,
        allow_visibility: bool,
        admin_override: bool = False
    ) -> QuotationResponse:
        """
        Cambiar visibilidad de precios para un hotel específico
        Solo administradores pueden hacer esto
        
        Args:
            db: Sesión de base de datos
            quotation_id: ID de la cotización
            hotel_id: ID del hotel
            allow_visibility: Permitir ver precios de competidores
            admin_override: Confirmación de override administrativo
            
        Returns:
            QuotationResponse actualizada
        """
        try:
            if not admin_override:
                raise HTTPException(
                    status_code=403,
                    detail="Solo administradores pueden cambiar visibilidad de precios"
                )
            
            # Obtener respuesta del hotel
            response = db.query(QuotationResponse).filter_by(
                quotation_id=quotation_id,
                hotel_id=hotel_id
            ).first()
            
            if not response:
                raise HTTPException(status_code=404, detail="Respuesta de hotel no encontrada")
            
            # Actualizar visibilidad
            response.can_see_competitor_prices = allow_visibility
            response.visibility_changed_at = datetime.now()
            response.visibility_changed_by = 'admin'
            
            db.commit()
            db.refresh(response)
            
            # Notificar al hotel del cambio
            await self._notify_visibility_change(hotel_id, quotation_id, allow_visibility)
            
            logger.info(f"Visibilidad de precios cambiada para hotel {hotel_id} en cotización {quotation_id}")
            return response
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error cambiando visibilidad: {str(e)}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error cambiando visibilidad: {str(e)}")
    
    async def select_winning_response(
        self,
        db: Session,
        quotation_id: str,
        response_id: str,
        selection_mode: str = 'manual'
    ) -> GroupQuotation:
        """
        Seleccionar respuesta ganadora (manual o automática)
        
        Args:
            db: Sesión de base de datos
            quotation_id: ID de la cotización
            response_id: ID de la respuesta seleccionada
            selection_mode: 'manual' o 'automatic'
            
        Returns:
            GroupQuotation actualizada
        """
        try:
            # Obtener cotización y respuesta
            quotation = db.query(GroupQuotation).filter_by(id=quotation_id).first()
            if not quotation:
                raise HTTPException(status_code=404, detail="Cotización no encontrada")
            
            response = db.query(QuotationResponse).filter_by(id=response_id).first()
            if not response:
                raise HTTPException(status_code=404, detail="Respuesta no encontrada")
            
            # Marcar como seleccionada
            quotation.selected_response_id = response_id
            quotation.selection_mode = selection_mode
            quotation.selected_at = datetime.now()
            quotation.status = QuotationStatus.AWARDED
            
            # Actualizar estado de la respuesta
            response.status = ResponseStatus.SELECTED
            response.selected_at = datetime.now()
            
            # Actualizar otras respuestas como no seleccionadas
            db.query(QuotationResponse).filter(
                QuotationResponse.quotation_id == quotation_id,
                QuotationResponse.id != response_id
            ).update({'status': ResponseStatus.NOT_SELECTED})
            
            db.commit()
            
            # Notificar a todos los hoteles
            await self._notify_selection_results(quotation, response)
            
            # Broadcast resultado
            await self.ws_manager.broadcast_to_quotation(
                quotation_id,
                {
                    'event': 'winner_selected',
                    'data': {
                        'quotation_id': quotation_id,
                        'winning_hotel_id': response.hotel_id,
                        'selection_mode': selection_mode
                    }
                }
            )
            
            logger.info(f"Respuesta {response_id} seleccionada para cotización {quotation_id}")
            return quotation
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error seleccionando respuesta: {str(e)}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error seleccionando respuesta: {str(e)}")
    
    async def add_custom_hotel(
        self,
        db: Session,
        hotel_data: Dict[str, Any]
    ) -> HotelProvider:
        """
        Agregar hotel personalizado que no está en la base de datos
        
        Args:
            db: Sesión de base de datos
            hotel_data: Datos del hotel nuevo
            
        Returns:
            HotelProvider creado
        """
        try:
            # Generar ID único
            hotel_id = f"CUSTOM-{uuid.uuid4().hex[:8].upper()}"
            
            # Crear hotel en la base de datos
            hotel = HotelProvider(
                id=hotel_id,
                name=hotel_data.get('name'),
                email=hotel_data.get('email'),
                phone=hotel_data.get('phone'),
                address=hotel_data.get('address'),
                city=hotel_data.get('city'),
                country=hotel_data.get('country'),
                rating=hotel_data.get('rating', 0),
                category=hotel_data.get('category', 'standard'),
                amenities=hotel_data.get('amenities', []),
                contact_person=hotel_data.get('contact_person'),
                is_custom=True,
                is_verified=False,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            db.add(hotel)
            db.commit()
            db.refresh(hotel)
            
            # Enviar invitación de registro
            await self._send_hotel_registration_invite(hotel)
            
            logger.info(f"Hotel personalizado agregado: {hotel_id}")
            return hotel
            
        except Exception as e:
            logger.error(f"Error agregando hotel personalizado: {str(e)}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error agregando hotel: {str(e)}")
    
    # Métodos auxiliares privados
    
    async def _select_hotels_automatically(
        self,
        db: Session,
        quotation: GroupQuotation,
        criteria: Dict[str, Any]
    ) -> List[str]:
        """Selección automática de hoteles basada en criterios"""
        try:
            query = db.query(HotelProvider)
            
            # Aplicar filtros según criterios
            if criteria.get('min_rating'):
                query = query.filter(HotelProvider.rating >= criteria['min_rating'])
            
            if criteria.get('max_distance') and quotation.destination:
                # Aquí implementarías lógica de distancia geográfica
                pass
            
            if criteria.get('amenities_required'):
                for amenity in criteria['amenities_required']:
                    query = query.filter(HotelProvider.amenities.contains([amenity]))
            
            # Obtener hoteles y limitar cantidad
            hotels = query.limit(
                quotation.hotel_selection.get('auto_select_count', 5)
            ).all()
            
            return [hotel.id for hotel in hotels]
            
        except Exception as e:
            logger.error(f"Error seleccionando hoteles: {str(e)}")
            return []
    
    def _apply_pricing_strategy(
        self,
        base_price: Decimal,
        strategy: str,
        quotation: GroupQuotation,
        existing_response: Optional[QuotationResponse]
    ) -> Decimal:
        """Aplicar estrategia de precios según configuración"""
        
        if strategy == 'aggressive':
            # Descuento agresivo
            return base_price * Decimal('0.85')
        elif strategy == 'premium':
            # Precio premium con servicios adicionales
            return base_price * Decimal('1.10')
        elif strategy == 'competitive':
            # Precio competitivo basado en el mercado
            if existing_response and existing_response.can_see_competitor_prices:
                # Si puede ver precios, ajustar según competencia
                # Aquí implementarías lógica de análisis competitivo
                pass
            return base_price * Decimal('0.95')
        else:
            return base_price
    
    def _sanitize_response_for_broadcast(
        self,
        response: QuotationResponse,
        requesting_hotel_id: str
    ) -> Dict[str, Any]:
        """Sanitizar respuesta para broadcast respetando privacidad"""
        data = response.to_dict()
        
        # Si no es el mismo hotel y no puede ver precios de competidores
        if response.hotel_id != requesting_hotel_id and not response.can_see_competitor_prices:
            # Ocultar información sensible de precios
            data.pop('base_price', None)
            data.pop('final_price', None)
            data.pop('discount_percentage', None)
            data.pop('pricing_strategy', None)
            data['price_hidden'] = True
        
        return data
    
    async def _send_invitations_to_hotels(self, quotation: GroupQuotation):
        """Enviar invitaciones por email a hoteles seleccionados"""
        for hotel_id in quotation.invited_hotels:
            await self.email_service.send_quotation_invitation(
                hotel_id=hotel_id,
                quotation=quotation
            )
    
    async def _notify_client_new_response(
        self,
        quotation: GroupQuotation,
        response: QuotationResponse
    ):
        """Notificar al cliente B2B/B2B2C de nueva respuesta"""
        await self.email_service.send_new_response_notification(
            quotation=quotation,
            response=response
        )
    
    async def _notify_hotel_deposit_received(self, quotation: GroupQuotation):
        """Notificar al hotel que el depósito fue recibido"""
        await self.email_service.send_deposit_confirmation_to_hotel(
            quotation=quotation
        )
    
    async def _send_deposit_confirmation(
        self,
        quotation: GroupQuotation,
        payment_result: Dict[str, Any]
    ):
        """Enviar confirmación de depósito al cliente"""
        await self.email_service.send_deposit_confirmation_to_client(
            quotation=quotation,
            payment_result=payment_result
        )
    
    async def _notify_deadline_extension(
        self,
        quotation: GroupQuotation,
        extension_days: int,
        reason: str
    ):
        """Notificar extensión de deadline a todos los participantes"""
        await self.email_service.send_deadline_extension_notification(
            quotation=quotation,
            extension_days=extension_days,
            reason=reason
        )
    
    async def _notify_visibility_change(
        self,
        hotel_id: str,
        quotation_id: str,
        allow_visibility: bool
    ):
        """Notificar cambio de visibilidad de precios"""
        await self.email_service.send_visibility_change_notification(
            hotel_id=hotel_id,
            quotation_id=quotation_id,
            allow_visibility=allow_visibility
        )
    
    async def _notify_selection_results(
        self,
        quotation: GroupQuotation,
        winning_response: QuotationResponse
    ):
        """Notificar resultados de selección a todos los hoteles"""
        await self.email_service.send_selection_results(
            quotation=quotation,
            winning_response=winning_response
        )
    
    async def _send_hotel_registration_invite(self, hotel: HotelProvider):
        """Enviar invitación de registro a hotel personalizado"""
        await self.email_service.send_hotel_registration_invite(
            hotel=hotel
        )


# Instancia del servicio
quotation_service = QuotationService()