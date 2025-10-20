# Provider Management Services
# Servicios para gestión avanzada de proveedores

from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, between
import json
import asyncio
from enum import Enum

from .models import (
    Provider, Vehicle, Driver, TourGuide, 
    ProviderBooking, ProviderCalendar, GuideCalendar,
    VehicleAssignment, GuideAssignment, ProviderReport,
    BookingStatus, ConfirmationStatus, ProviderType
)
from ..notifications.service import NotificationService
from ..ai.validation_service import AIValidationService

class ProviderManagementService:
    """Servicio principal para gestión de proveedores"""
    
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
        self.ai_validator = AIValidationService()
    
    # ============= GESTIÓN DE CALENDARIO =============
    
    def get_provider_calendar(
        self, 
        provider_id: int, 
        start_date: date, 
        end_date: date,
        include_details: bool = True
    ) -> Dict[str, Any]:
        """
        Obtiene el calendario de un proveedor con todos los grupos confirmados
        """
        provider = self.db.query(Provider).filter_by(id=provider_id).first()
        if not provider:
            raise ValueError(f"Provider {provider_id} not found")
        
        # Obtener eventos del calendario
        calendar_events = self.db.query(ProviderCalendar).filter(
            and_(
                ProviderCalendar.provider_id == provider_id,
                ProviderCalendar.event_date.between(start_date, end_date)
            )
        ).order_by(ProviderCalendar.event_date, ProviderCalendar.start_time).all()
        
        # Estructurar la respuesta
        calendar_data = {
            'provider': {
                'id': provider.id,
                'name': provider.company_name,
                'type': provider.provider_type.value
            },
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'events': []
        }
        
        for event in calendar_events:
            event_data = {
                'id': event.id,
                'date': event.event_date.isoformat(),
                'start_time': event.start_time.isoformat() if event.start_time else None,
                'end_time': event.end_time.isoformat() if event.end_time else None,
                'type': event.event_type,
                'status': event.status.value if event.status else None,
                'group': {
                    'name': event.group_name,
                    'size': event.group_size,
                    'contact': event.contact_person,
                    'phone': event.contact_phone
                }
            }
            
            # Agregar detalles si se solicitan
            if include_details and event.booking_id:
                booking = self.db.query(ProviderBooking).filter_by(
                    id=event.booking_id
                ).first()
                
                if booking:
                    event_data['booking_details'] = {
                        'reference': booking.booking_reference,
                        'service_type': booking.service_type,
                        'total_cost': float(booking.total_cost) if booking.total_cost else 0,
                        'special_requirements': booking.special_requirements
                    }
                    
                    # Para transportes, agregar info de vehículos y conductores
                    if provider.provider_type == ProviderType.TRANSPORT:
                        assignments = self.db.query(VehicleAssignment).filter_by(
                            booking_id=booking.id,
                            assignment_date=event.event_date
                        ).all()
                        
                        event_data['transport_details'] = []
                        for assignment in assignments:
                            transport_detail = {
                                'vehicle': {
                                    'id': assignment.vehicle.id,
                                    'type': assignment.vehicle.vehicle_type.value,
                                    'license_plate': assignment.vehicle.license_plate,
                                    'capacity': assignment.vehicle.capacity
                                } if assignment.vehicle else None,
                                'driver': {
                                    'id': assignment.driver.id,
                                    'name': f"{assignment.driver.first_name} {assignment.driver.last_name}",
                                    'phone': assignment.driver.phone
                                } if assignment.driver else None,
                                'route': assignment.route_details,
                                'pickup_time': assignment.pickup_time.isoformat() if assignment.pickup_time else None,
                                'pickup_location': assignment.pickup_location
                            }
                            event_data['transport_details'].append(transport_detail)
            
            calendar_data['events'].append(event_data)
        
        # Agregar resumen estadístico
        calendar_data['summary'] = {
            'total_events': len(calendar_events),
            'confirmed': len([e for e in calendar_events if e.status == BookingStatus.CONFIRMED]),
            'pending': len([e for e in calendar_events if e.status == BookingStatus.PENDING]),
            'completed': len([e for e in calendar_events if e.status == BookingStatus.COMPLETED])
        }
        
        return calendar_data
    
    def get_guide_calendar(
        self,
        guide_id: int,
        month: int,
        year: int
    ) -> Dict[str, Any]:
        """
        Obtiene el calendario único de un guía, previniendo duplicados
        """
        guide = self.db.query(TourGuide).filter_by(id=guide_id).first()
        if not guide:
            raise ValueError(f"Guide {guide_id} not found")
        
        # Calcular rango de fechas del mes
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
        
        # Obtener calendario del guía
        calendar_entries = self.db.query(GuideCalendar).filter(
            and_(
                GuideCalendar.guide_id == guide_id,
                GuideCalendar.date.between(start_date, end_date)
            )
        ).order_by(GuideCalendar.date, GuideCalendar.start_time).all()
        
        # Estructurar por día
        calendar_by_day = {}
        for entry in calendar_entries:
            day_key = entry.date.isoformat()
            if day_key not in calendar_by_day:
                calendar_by_day[day_key] = []
            
            calendar_by_day[day_key].append({
                'id': entry.id,
                'start_time': entry.start_time.isoformat() if entry.start_time else None,
                'end_time': entry.end_time.isoformat() if entry.end_time else None,
                'tour_type': entry.tour_type,
                'group_name': entry.group_name,
                'group_size': entry.group_size,
                'destinations': entry.destinations,
                'is_confirmed': entry.is_confirmed,
                'is_blocked': entry.is_blocked
            })
        
        return {
            'guide': {
                'id': guide.id,
                'name': f"{guide.first_name} {guide.last_name}",
                'languages': guide.languages,
                'specializations': guide.specializations
            },
            'month': f"{year}-{month:02d}",
            'calendar': calendar_by_day,
            'availability_summary': self._calculate_guide_availability(guide_id, start_date, end_date)
        }
    
    def check_guide_availability(
        self,
        guide_id: int,
        date: date,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> bool:
        """
        Verifica si un guía está disponible en una fecha/hora específica
        """
        # Verificar si ya tiene reservas ese día
        existing_bookings = self.db.query(GuideCalendar).filter(
            and_(
                GuideCalendar.guide_id == guide_id,
                GuideCalendar.date == date,
                GuideCalendar.is_blocked == False
            )
        ).all()
        
        if not existing_bookings:
            return True
        
        # Si se especifican horas, verificar solapamiento
        if start_time and end_time:
            for booking in existing_bookings:
                if booking.start_time and booking.end_time:
                    # Verificar si hay solapamiento de horarios
                    if (start_time < booking.end_time and end_time > booking.start_time):
                        return False
        else:
            # Si no se especifican horas y ya hay reserva ese día, no está disponible
            return False
        
        return True
    
    # ============= REPORTES AVANZADOS =============
    
    def generate_provider_report(
        self,
        provider_id: int,
        start_date: date,
        end_date: date,
        report_type: str = "custom",
        detailed_breakdown: bool = True
    ) -> ProviderReport:
        """
        Genera un reporte completo para un proveedor
        """
        provider = self.db.query(Provider).filter_by(id=provider_id).first()
        if not provider:
            raise ValueError(f"Provider {provider_id} not found")
        
        # Obtener todas las reservas en el período
        bookings = self.db.query(ProviderBooking).filter(
            and_(
                ProviderBooking.provider_id == provider_id,
                ProviderBooking.service_date.between(start_date, end_date)
            )
        ).all()
        
        # Calcular métricas generales
        total_bookings = len(bookings)
        completed_bookings = len([b for b in bookings if b.booking_status == BookingStatus.COMPLETED])
        cancelled_bookings = len([b for b in bookings if b.is_cancelled])
        
        total_revenue = sum(b.total_cost or 0 for b in bookings if not b.is_cancelled)
        total_commission = sum(b.commission_amount or 0 for b in bookings if not b.is_cancelled)
        
        # Métricas específicas según tipo de proveedor
        metrics_by_vehicle = {}
        metrics_by_driver = {}
        metrics_by_guide = {}
        metrics_by_destination = {}
        
        if provider.provider_type == ProviderType.TRANSPORT:
            metrics_by_vehicle, metrics_by_driver = self._calculate_transport_metrics(
                provider_id, bookings
            )
        elif provider.provider_type in [ProviderType.TOUR_GUIDE, ProviderType.GUIDE_COMPANY]:
            metrics_by_guide = self._calculate_guide_metrics(provider_id, bookings)
        
        # Calcular métricas por destino
        for booking in bookings:
            if booking.service_details and 'destinations' in booking.service_details:
                for destination in booking.service_details['destinations']:
                    if destination not in metrics_by_destination:
                        metrics_by_destination[destination] = {
                            'visits': 0,
                            'revenue': 0,
                            'groups': []
                        }
                    metrics_by_destination[destination]['visits'] += 1
                    metrics_by_destination[destination]['revenue'] += float(booking.total_cost or 0)
                    metrics_by_destination[destination]['groups'].append(booking.client_name)
        
        # Calcular promedios y tasas
        avg_group_size = sum(b.group_size or 0 for b in bookings) / total_bookings if total_bookings > 0 else 0
        avg_booking_value = total_revenue / total_bookings if total_bookings > 0 else 0
        confirmation_rate = len([b for b in bookings if b.confirmation_status == ConfirmationStatus.AUTO_CONFIRMED]) / total_bookings if total_bookings > 0 else 0
        cancellation_rate = cancelled_bookings / total_bookings if total_bookings > 0 else 0
        
        # Identificar días pico
        bookings_by_day = {}
        for booking in bookings:
            day_key = booking.service_date.isoformat()
            if day_key not in bookings_by_day:
                bookings_by_day[day_key] = 0
            bookings_by_day[day_key] += 1
        
        peak_days = sorted(bookings_by_day.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Crear el reporte
        report = ProviderReport(
            provider_id=provider_id,
            report_type=report_type,
            start_date=start_date,
            end_date=end_date,
            total_bookings=total_bookings,
            completed_bookings=completed_bookings,
            cancelled_bookings=cancelled_bookings,
            total_revenue=total_revenue,
            total_commission=total_commission,
            metrics_by_vehicle=metrics_by_vehicle if metrics_by_vehicle else None,
            metrics_by_driver=metrics_by_driver if metrics_by_driver else None,
            metrics_by_guide=metrics_by_guide if metrics_by_guide else None,
            metrics_by_destination=metrics_by_destination if metrics_by_destination else None,
            average_group_size=avg_group_size,
            average_booking_value=avg_booking_value,
            confirmation_rate=confirmation_rate,
            cancellation_rate=cancellation_rate,
            peak_days=peak_days,
            top_destinations=list(metrics_by_destination.keys())[:10] if metrics_by_destination else []
        )
        
        self.db.add(report)
        self.db.commit()
        
        return report
    
    def _calculate_transport_metrics(
        self,
        provider_id: int,
        bookings: List[ProviderBooking]
    ) -> Tuple[Dict, Dict]:
        """
        Calcula métricas específicas para proveedores de transporte
        """
        metrics_by_vehicle = {}
        metrics_by_driver = {}
        
        for booking in bookings:
            assignments = self.db.query(VehicleAssignment).filter_by(
                booking_id=booking.id
            ).all()
            
            for assignment in assignments:
                # Métricas por vehículo
                if assignment.vehicle_id:
                    if assignment.vehicle_id not in metrics_by_vehicle:
                        metrics_by_vehicle[assignment.vehicle_id] = {
                            'bookings': 0,
                            'total_km': 0,
                            'total_hours': 0,
                            'revenue': 0,
                            'vehicle_info': {
                                'type': assignment.vehicle.vehicle_type.value,
                                'license_plate': assignment.vehicle.license_plate
                            }
                        }
                    
                    metrics_by_vehicle[assignment.vehicle_id]['bookings'] += 1
                    metrics_by_vehicle[assignment.vehicle_id]['total_km'] += assignment.total_km or 0
                    metrics_by_vehicle[assignment.vehicle_id]['total_hours'] += assignment.estimated_duration_hours or 0
                    metrics_by_vehicle[assignment.vehicle_id]['revenue'] += float(booking.total_cost or 0)
                
                # Métricas por conductor
                if assignment.driver_id:
                    if assignment.driver_id not in metrics_by_driver:
                        metrics_by_driver[assignment.driver_id] = {
                            'bookings': 0,
                            'total_hours': 0,
                            'total_km': 0,
                            'revenue': 0,
                            'driver_info': {
                                'name': f"{assignment.driver.first_name} {assignment.driver.last_name}",
                                'phone': assignment.driver.phone
                            }
                        }
                    
                    metrics_by_driver[assignment.driver_id]['bookings'] += 1
                    metrics_by_driver[assignment.driver_id]['total_hours'] += assignment.estimated_duration_hours or 0
                    metrics_by_driver[assignment.driver_id]['total_km'] += assignment.total_km or 0
                    metrics_by_driver[assignment.driver_id]['revenue'] += float(booking.total_cost or 0)
        
        return metrics_by_vehicle, metrics_by_driver
    
    def _calculate_guide_metrics(
        self,
        provider_id: int,
        bookings: List[ProviderBooking]
    ) -> Dict:
        """
        Calcula métricas específicas para guías turísticos
        """
        metrics_by_guide = {}
        
        for booking in bookings:
            assignments = self.db.query(GuideAssignment).filter_by(
                booking_id=booking.id
            ).all()
            
            for assignment in assignments:
                if assignment.guide_id not in metrics_by_guide:
                    metrics_by_guide[assignment.guide_id] = {
                        'tours': 0,
                        'total_hours': 0,
                        'revenue': 0,
                        'destinations': set(),
                        'groups': [],
                        'guide_info': {
                            'name': f"{assignment.guide.first_name} {assignment.guide.last_name}",
                            'languages': assignment.guide.languages
                        }
                    }
                
                metrics_by_guide[assignment.guide_id]['tours'] += 1
                if assignment.start_time and assignment.end_time:
                    duration = (assignment.end_time.hour - assignment.start_time.hour)
                    metrics_by_guide[assignment.guide_id]['total_hours'] += duration
                
                metrics_by_guide[assignment.guide_id]['revenue'] += float(booking.total_cost or 0)
                
                if assignment.destinations:
                    metrics_by_guide[assignment.guide_id]['destinations'].update(assignment.destinations)
                
                metrics_by_guide[assignment.guide_id]['groups'].append({
                    'name': booking.client_name,
                    'date': assignment.tour_date.isoformat(),
                    'size': booking.group_size
                })
        
        # Convertir sets a listas para serialización
        for guide_id in metrics_by_guide:
            metrics_by_guide[guide_id]['destinations'] = list(
                metrics_by_guide[guide_id]['destinations']
            )
        
        return metrics_by_guide
    
    def _calculate_guide_availability(
        self,
        guide_id: int,
        start_date: date,
        end_date: date
    ) -> Dict:
        """
        Calcula el resumen de disponibilidad de un guía
        """
        total_days = (end_date - start_date).days + 1
        
        booked_days = self.db.query(func.count(func.distinct(GuideCalendar.date))).filter(
            and_(
                GuideCalendar.guide_id == guide_id,
                GuideCalendar.date.between(start_date, end_date),
                GuideCalendar.is_blocked == False
            )
        ).scalar() or 0
        
        blocked_days = self.db.query(func.count(func.distinct(GuideCalendar.date))).filter(
            and_(
                GuideCalendar.guide_id == guide_id,
                GuideCalendar.date.between(start_date, end_date),
                GuideCalendar.is_blocked == True
            )
        ).scalar() or 0
        
        available_days = total_days - booked_days - blocked_days
        
        return {
            'total_days': total_days,
            'available_days': available_days,
            'booked_days': booked_days,
            'blocked_days': blocked_days,
            'availability_percentage': (available_days / total_days * 100) if total_days > 0 else 0
        }
    
    # ============= CONFIRMACIONES AUTOMÁTICAS =============
    
    async def process_booking_confirmation(
        self,
        booking_id: int,
        auto_confirm: bool = False
    ) -> ConfirmationStatus:
        """
        Procesa la confirmación de una reserva con límites de tiempo
        """
        booking = self.db.query(ProviderBooking).filter_by(id=booking_id).first()
        if not booking:
            raise ValueError(f"Booking {booking_id} not found")
        
        provider = booking.provider
        
        # Si está habilitada la confirmación automática
        if auto_confirm and provider.auto_confirm_enabled:
            # Verificar límites
            pending_count = self.db.query(ProviderBooking).filter(
                and_(
                    ProviderBooking.provider_id == provider.id,
                    ProviderBooking.confirmation_status == ConfirmationStatus.PENDING
                )
            ).count()
            
            if pending_count < provider.max_pending_bookings:
                booking.confirmation_status = ConfirmationStatus.AUTO_CONFIRMED
                booking.confirmed_at = datetime.utcnow()
                self.db.commit()
                
                # Notificar al proveedor
                await self.notification_service.send_confirmation_notification(
                    provider_id=provider.id,
                    booking=booking,
                    status="auto_confirmed"
                )
                
                return ConfirmationStatus.AUTO_CONFIRMED
        
        # Establecer deadline de confirmación
        if provider.confirmation_timeout_hours:
            booking.confirmation_deadline = datetime.utcnow() + timedelta(
                hours=provider.confirmation_timeout_hours
            )
            self.db.commit()
            
            # Programar verificación de timeout
            asyncio.create_task(
                self._check_confirmation_timeout(booking_id, provider.confirmation_timeout_hours)
            )
        
        # Notificar al proveedor para confirmación manual
        await self.notification_service.send_confirmation_request(
            provider_id=provider.id,
            booking=booking
        )
        
        return ConfirmationStatus.PENDING
    
    async def _check_confirmation_timeout(
        self,
        booking_id: int,
        timeout_hours: int
    ):
        """
        Verifica si una reserva ha excedido el tiempo límite de confirmación
        """
        # Esperar el tiempo de timeout
        await asyncio.sleep(timeout_hours * 3600)
        
        # Verificar el estado actual
        booking = self.db.query(ProviderBooking).filter_by(id=booking_id).first()
        
        if booking and booking.confirmation_status == ConfirmationStatus.PENDING:
            # Marcar como timeout
            booking.confirmation_status = ConfirmationStatus.TIMEOUT
            self.db.commit()
            
            # Notificar al administrador
            await self.notification_service.send_timeout_alert(
                booking=booking,
                admin_action_required=True
            )
            
            # Buscar proveedor alternativo si está configurado
            await self._find_alternative_provider(booking)
    
    async def _find_alternative_provider(self, booking: ProviderBooking):
        """
        Busca un proveedor alternativo cuando hay timeout
        """
        # Buscar proveedores del mismo tipo que estén disponibles
        alternative_providers = self.db.query(Provider).filter(
            and_(
                Provider.provider_type == booking.provider.provider_type,
                Provider.is_active == True,
                Provider.id != booking.provider_id
            )
        ).all()
        
        for alt_provider in alternative_providers:
            # Verificar disponibilidad
            if self._check_provider_availability(alt_provider.id, booking.service_date):
                # Notificar al administrador sobre la alternativa
                await self.notification_service.send_alternative_provider_suggestion(
                    original_booking=booking,
                    alternative_provider=alt_provider
                )
                break
    
    def _check_provider_availability(
        self,
        provider_id: int,
        service_date: date
    ) -> bool:
        """
        Verifica la disponibilidad de un proveedor en una fecha
        """
        # Implementar lógica de verificación de disponibilidad
        existing_bookings = self.db.query(ProviderBooking).filter(
            and_(
                ProviderBooking.provider_id == provider_id,
                ProviderBooking.service_date == service_date,
                ProviderBooking.booking_status != BookingStatus.CANCELLED
            )
        ).count()
        
        # Por simplicidad, asumimos que si tiene menos de 5 reservas ese día está disponible
        return existing_bookings < 5
    
    # ============= POLÍTICAS DE CANCELACIÓN =============
    
    def apply_cancellation_policy(
        self,
        booking_id: int,
        cancellation_date: datetime
    ) -> Dict[str, Any]:
        """
        Aplica la política de cancelación y calcula el reembolso
        """
        booking = self.db.query(ProviderBooking).filter_by(id=booking_id).first()
        if not booking:
            raise ValueError(f"Booking {booking_id} not found")
        
        provider = booking.provider
        
        # Verificar si las cancelaciones están habilitadas
        if not provider.cancellation_enabled:
            return {
                'allowed': False,
                'reason': 'Cancellations not allowed for this provider',
                'refund_amount': 0
            }
        
        # Calcular horas hasta el servicio
        hours_until_service = (booking.service_date - cancellation_date.date()).total_seconds() / 3600
        
        # Aplicar política de cancelación
        refund_percentage = 0
        if provider.cancellation_policy:
            for hours_limit, percentage in sorted(
                provider.cancellation_policy.items(),
                key=lambda x: int(x[0]),
                reverse=True
            ):
                if hours_until_service >= int(hours_limit):
                    refund_percentage = percentage
                    break
        
        refund_amount = (booking.total_cost or 0) * (refund_percentage / 100)
        
        # Actualizar la reserva
        booking.is_cancelled = True
        booking.cancelled_at = cancellation_date
        booking.booking_status = BookingStatus.CANCELLED
        booking.refund_amount = refund_amount
        
        self.db.commit()
        
        return {
            'allowed': True,
            'hours_until_service': hours_until_service,
            'refund_percentage': refund_percentage,
            'refund_amount': float(refund_amount),
            'original_amount': float(booking.total_cost or 0)
        }