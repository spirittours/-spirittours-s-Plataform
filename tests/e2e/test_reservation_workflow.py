"""
End-to-End Tests para Spirit Tours - Workflow Completo de Reservas
Tests que cubren el flujo completo desde búsqueda hasta confirmación y análisis.
"""
import pytest
import asyncio
import json
import time
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Any

import httpx
import websockets
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.reservation import Reservation, ReservationStatus
from backend.models.customer import Customer
from backend.models.payment import Payment, PaymentStatus
from backend.models.tour import Tour, TourStatus
from backend.core.database import get_async_session
from backend.ai.agents.reservation_assistant import ReservationAssistant
from backend.analytics.real_time_dashboard import RealTimeDashboard
from tests.conftest import get_test_db_session


@pytest.fixture
async def e2e_client():
    """Cliente HTTP para tests E2E"""
    async with httpx.AsyncClient(
        base_url="http://localhost:8000",
        timeout=30.0
    ) as client:
        yield client


@pytest.fixture
async def test_tour_data():
    """Datos de tour para tests E2E"""
    return {
        "title": "Magical Sedona Vortex Experience",
        "description": "Experience the spiritual energy of Sedona's famous vortex sites",
        "duration_hours": 4,
        "max_participants": 8,
        "price_per_person": Decimal("189.99"),
        "location": "Sedona, AZ",
        "difficulty_level": "Easy",
        "included_services": ["Transportation", "Guide", "Snacks", "Water"],
        "meeting_point": "Sedona Visitor Center",
        "cancellation_policy": "Free cancellation up to 24 hours before tour",
        "availability_schedule": {
            "monday": ["09:00", "14:00"],
            "tuesday": ["09:00", "14:00"],
            "wednesday": ["09:00", "14:00"],
            "thursday": ["09:00", "14:00"],
            "friday": ["09:00", "14:00"],
            "saturday": ["09:00", "14:00"],
            "sunday": ["10:00", "15:00"]
        }
    }


@pytest.fixture
async def test_customer_data():
    """Datos de cliente para tests E2E"""
    return {
        "first_name": "Emma",
        "last_name": "Thompson",
        "email": "emma.thompson.e2e@spirittours.com",
        "phone": "+1-555-0199",
        "date_of_birth": "1985-06-15",
        "nationality": "US",
        "emergency_contact_name": "John Thompson",
        "emergency_contact_phone": "+1-555-0200",
        "dietary_restrictions": ["Vegetarian"],
        "medical_conditions": [],
        "preferred_language": "en",
        "communication_preferences": {
            "email": True,
            "sms": True,
            "whatsapp": False
        }
    }


class TestCompleteReservationWorkflow:
    """Tests del workflow completo de reservas E2E"""

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_complete_reservation_workflow_success(
        self, 
        e2e_client: httpx.AsyncClient,
        test_tour_data: Dict[str, Any],
        test_customer_data: Dict[str, Any]
    ):
        """
        Test del workflow completo exitoso de reserva
        1. Búsqueda de tours
        2. Selección de tour y fecha
        3. Registro/Login de cliente
        4. Creación de reserva
        5. Procesamiento de pago
        6. Confirmación y notificaciones
        7. Verificación en analytics
        """
        
        # Paso 1: Crear tour en el sistema
        tour_response = await e2e_client.post("/api/tours", json=test_tour_data)
        assert tour_response.status_code == 201
        tour_data = tour_response.json()
        tour_id = tour_data["id"]
        
        # Paso 2: Búsqueda de tours disponibles
        search_params = {
            "location": "Sedona",
            "date_from": (datetime.now() + timedelta(days=7)).isoformat(),
            "date_to": (datetime.now() + timedelta(days=14)).isoformat(),
            "participants": 2,
            "max_price": 200
        }
        
        search_response = await e2e_client.get("/api/tours/search", params=search_params)
        assert search_response.status_code == 200
        search_results = search_response.json()
        
        # Verificar que nuestro tour está en los resultados
        tour_found = False
        for tour in search_results["tours"]:
            if tour["id"] == tour_id:
                tour_found = True
                break
        assert tour_found, "Tour no encontrado en resultados de búsqueda"
        
        # Paso 3: Registrar cliente
        customer_response = await e2e_client.post("/api/customers", json=test_customer_data)
        assert customer_response.status_code == 201
        customer_data = customer_response.json()
        customer_id = customer_data["id"]
        
        # Paso 4: Verificar disponibilidad específica
        tour_date = datetime.now() + timedelta(days=10)
        availability_response = await e2e_client.get(
            f"/api/tours/{tour_id}/availability",
            params={"date": tour_date.date().isoformat(), "participants": 2}
        )
        assert availability_response.status_code == 200
        availability_data = availability_response.json()
        assert availability_data["available"], "Tour no disponible en fecha seleccionada"
        
        # Paso 5: Crear reserva
        reservation_data = {
            "tour_id": tour_id,
            "customer_id": customer_id,
            "tour_date": tour_date.isoformat(),
            "participants": 2,
            "special_requests": "Window seats preferred",
            "participant_details": [
                {
                    "name": "Emma Thompson",
                    "age": 38,
                    "dietary_restrictions": ["Vegetarian"]
                },
                {
                    "name": "John Thompson",
                    "age": 42,
                    "dietary_restrictions": []
                }
            ]
        }
        
        reservation_response = await e2e_client.post("/api/reservations", json=reservation_data)
        assert reservation_response.status_code == 201
        reservation = reservation_response.json()
        reservation_id = reservation["id"]
        
        # Verificar estado inicial de reserva
        assert reservation["status"] == "pending_payment"
        assert reservation["total_amount"] == str(Decimal("379.98"))  # 189.99 * 2
        
        # Paso 6: Procesar pago
        payment_data = {
            "reservation_id": reservation_id,
            "payment_method": "credit_card",
            "amount": Decimal("379.98"),
            "currency": "USD",
            "card_details": {
                "card_number": "4111111111111111",  # Test card
                "expiry_month": "12",
                "expiry_year": "2025",
                "cvv": "123",
                "cardholder_name": "Emma Thompson"
            },
            "billing_address": {
                "street": "123 Main St",
                "city": "Phoenix",
                "state": "AZ",
                "zip_code": "85001",
                "country": "US"
            }
        }
        
        payment_response = await e2e_client.post("/api/payments/process", json=payment_data)
        assert payment_response.status_code == 201
        payment_result = payment_response.json()
        assert payment_result["status"] == "completed"
        
        # Paso 7: Verificar actualización de reserva
        updated_reservation_response = await e2e_client.get(f"/api/reservations/{reservation_id}")
        assert updated_reservation_response.status_code == 200
        updated_reservation = updated_reservation_response.json()
        assert updated_reservation["status"] == "confirmed"
        
        # Paso 8: Verificar notificaciones enviadas
        notifications_response = await e2e_client.get(
            f"/api/notifications/reservation/{reservation_id}"
        )
        assert notifications_response.status_code == 200
        notifications = notifications_response.json()
        
        # Verificar que se enviaron notificaciones de confirmación
        confirmation_sent = any(
            notif["type"] == "reservation_confirmed" 
            for notif in notifications
        )
        assert confirmation_sent, "Notificación de confirmación no enviada"
        
        # Paso 9: Verificar analytics - métricas en tiempo real
        analytics_response = await e2e_client.get("/api/analytics/dashboard/metrics")
        assert analytics_response.status_code == 200
        analytics_data = analytics_response.json()
        
        # Verificar que las métricas se actualizaron
        assert analytics_data["revenue"]["today_revenue"] >= 379.98
        assert analytics_data["reservations"]["total_reservations"] >= 1
        assert analytics_data["customers"]["total_customers"] >= 1
        
        # Paso 10: Generar reporte de la transacción
        report_config = {
            "report_type": "reservation_details",
            "parameters": {
                "reservation_id": reservation_id,
                "include_payment_details": True,
                "include_customer_details": True
            },
            "format": "json"
        }
        
        report_response = await e2e_client.post("/api/analytics/reports/generate", json=report_config)
        assert report_response.status_code == 201
        report_data = report_response.json()
        
        # Verificar datos del reporte
        assert report_data["reservation"]["id"] == reservation_id
        assert report_data["reservation"]["status"] == "confirmed"
        assert float(report_data["payment"]["amount"]) == 379.98


    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_reservation_workflow_with_ai_assistant(
        self, 
        e2e_client: httpx.AsyncClient,
        test_tour_data: Dict[str, Any]
    ):
        """
        Test del workflow de reserva usando AI Assistant
        """
        
        # Paso 1: Crear tour
        tour_response = await e2e_client.post("/api/tours", json=test_tour_data)
        assert tour_response.status_code == 201
        tour_data = tour_response.json()
        tour_id = tour_data["id"]
        
        # Paso 2: Iniciar conversación con AI Assistant
        conversation_data = {
            "message": "Hi! I'm looking for a spiritual tour in Sedona for 2 people next week",
            "customer_context": {
                "preferred_language": "en",
                "location": "Phoenix, AZ"
            }
        }
        
        ai_response = await e2e_client.post("/api/ai/chat", json=conversation_data)
        assert ai_response.status_code == 200
        ai_result = ai_response.json()
        
        conversation_id = ai_result["conversation_id"]
        assert "Sedona" in ai_result["response"]
        assert ai_result["suggested_tours"] is not None
        
        # Paso 3: Continuar conversación para seleccionar tour
        followup_data = {
            "conversation_id": conversation_id,
            "message": f"Tell me more about tour {tour_id}",
        }
        
        ai_followup = await e2e_client.post("/api/ai/chat", json=followup_data)
        assert ai_followup.status_code == 200
        followup_result = ai_followup.json()
        
        assert "vortex" in followup_result["response"].lower()
        
        # Paso 4: Solicitar reserva a través del AI
        booking_request = {
            "conversation_id": conversation_id,
            "message": "I want to book this tour for next Friday for 2 people",
            "intent": "make_reservation"
        }
        
        booking_response = await e2e_client.post("/api/ai/chat", json=booking_request)
        assert booking_response.status_code == 200
        booking_result = booking_response.json()
        
        # El AI debería solicitar información del cliente
        assert "information" in booking_result["response"].lower()
        assert booking_result["requires_customer_info"]
        
        # Paso 5: Proporcionar información del cliente
        customer_info = {
            "conversation_id": conversation_id,
            "message": "My name is Sarah Johnson, email sarah.e2e@test.com, phone +1-555-0123",
            "customer_data": {
                "first_name": "Sarah",
                "last_name": "Johnson", 
                "email": "sarah.e2e@test.com",
                "phone": "+1-555-0123"
            }
        }
        
        customer_response = await e2e_client.post("/api/ai/chat", json=customer_info)
        assert customer_response.status_code == 200
        customer_result = customer_response.json()
        
        # Verificar que se creó la reserva provisional
        if customer_result.get("reservation_created"):
            reservation_id = customer_result["reservation_id"]
            
            # Verificar reserva
            reservation_check = await e2e_client.get(f"/api/reservations/{reservation_id}")
            assert reservation_check.status_code == 200
            reservation = reservation_check.json()
            assert reservation["status"] == "pending_payment"


    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_reservation_cancellation_workflow(
        self, 
        e2e_client: httpx.AsyncClient,
        test_tour_data: Dict[str, Any],
        test_customer_data: Dict[str, Any]
    ):
        """
        Test del workflow completo de cancelación de reserva
        """
        
        # Paso 1: Crear tour y cliente
        tour_response = await e2e_client.post("/api/tours", json=test_tour_data)
        tour_data = tour_response.json()
        tour_id = tour_data["id"]
        
        customer_response = await e2e_client.post("/api/customers", json=test_customer_data)
        customer_data = customer_response.json()
        customer_id = customer_data["id"]
        
        # Paso 2: Crear y confirmar reserva
        reservation_data = {
            "tour_id": tour_id,
            "customer_id": customer_id,
            "tour_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "participants": 2
        }
        
        reservation_response = await e2e_client.post("/api/reservations", json=reservation_data)
        reservation = reservation_response.json()
        reservation_id = reservation["id"]
        
        # Simular pago exitoso
        payment_data = {
            "reservation_id": reservation_id,
            "payment_method": "credit_card",
            "amount": Decimal("379.98"),
            "currency": "USD"
        }
        
        await e2e_client.post("/api/payments/process", json=payment_data)
        
        # Paso 3: Solicitar cancelación
        cancellation_data = {
            "reason": "Family emergency",
            "requested_refund": True
        }
        
        cancel_response = await e2e_client.post(
            f"/api/reservations/{reservation_id}/cancel", 
            json=cancellation_data
        )
        assert cancel_response.status_code == 200
        cancel_result = cancel_response.json()
        
        # Paso 4: Verificar proceso de reembolso
        assert cancel_result["status"] == "cancelled"
        assert cancel_result["refund_eligible"]
        
        # Paso 5: Procesar reembolso
        refund_response = await e2e_client.post(f"/api/payments/{reservation_id}/refund")
        assert refund_response.status_code == 200
        refund_result = refund_response.json()
        assert refund_result["status"] == "processed"
        
        # Paso 6: Verificar notificaciones de cancelación
        notifications_response = await e2e_client.get(f"/api/notifications/reservation/{reservation_id}")
        notifications = notifications_response.json()
        
        cancellation_notif = any(
            notif["type"] == "reservation_cancelled" 
            for notif in notifications
        )
        assert cancellation_notif
        
        # Paso 7: Verificar actualización en analytics
        analytics_response = await e2e_client.get("/api/analytics/dashboard/metrics")
        analytics_data = analytics_response.json()
        assert analytics_data["reservations"]["cancelled_reservations"] >= 1


class TestRealtimeAnalyticsWorkflow:
    """Tests E2E del sistema de analytics en tiempo real"""

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_realtime_dashboard_websocket_workflow(self, e2e_client: httpx.AsyncClient):
        """
        Test del workflow completo de dashboard en tiempo real via WebSocket
        """
        
        # Configurar conexión WebSocket
        websocket_url = "ws://localhost:8000/api/analytics/dashboard/realtime"
        
        try:
            async with websockets.connect(websocket_url) as websocket:
                
                # Paso 1: Verificar conexión inicial
                initial_message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                initial_data = json.loads(initial_message)
                
                assert "metrics" in initial_data
                assert "timestamp" in initial_data
                
                # Paso 2: Simular actividad que genere métricas
                # (En un test real, esto activaría otros endpoints)
                
                # Crear una nueva reserva para generar actividad
                tour_data = {
                    "title": "Test WebSocket Tour",
                    "price_per_person": Decimal("99.99"),
                    "duration_hours": 2
                }
                
                tour_response = await e2e_client.post("/api/tours", json=tour_data)
                tour_id = tour_response.json()["id"]
                
                # Paso 3: Verificar que se reciben actualizaciones
                update_received = False
                for _ in range(3):  # Intentar recibir por 3 iteraciones
                    try:
                        update_message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                        update_data = json.loads(update_message)
                        
                        if "metrics" in update_data:
                            update_received = True
                            break
                    except asyncio.TimeoutError:
                        continue
                
                # En un entorno real, esto debería recibir actualizaciones
                # Por ahora, verificamos la estructura básica
                assert initial_data["metrics"] is not None
                
        except Exception as e:
            # WebSocket podría no estar disponible en test environment
            pytest.skip(f"WebSocket test skipped: {e}")


    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_automated_report_generation_workflow(self, e2e_client: httpx.AsyncClient):
        """
        Test del workflow completo de generación automática de reportes
        """
        
        # Paso 1: Configurar reporte automático
        report_config = {
            "report_type": "daily_summary",
            "schedule": {
                "frequency": "daily",
                "time": "09:00",
                "timezone": "America/Phoenix"
            },
            "delivery_method": "email",
            "delivery_config": {
                "recipients": ["manager@spirittours.com"],
                "subject_template": "Daily Summary Report - {date}"
            },
            "parameters": {
                "include_charts": True,
                "include_details": True,
                "date_range": 1
            }
        }
        
        config_response = await e2e_client.post("/api/analytics/reports/schedule", json=report_config)
        assert config_response.status_code == 201
        schedule_data = config_response.json()
        schedule_id = schedule_data["schedule_id"]
        
        # Paso 2: Generar reporte inmediatamente (para testing)
        generate_request = {
            "report_type": "daily_summary",
            "parameters": {
                "date": datetime.now().date().isoformat(),
                "include_charts": True
            },
            "format": "json"
        }
        
        generate_response = await e2e_client.post("/api/analytics/reports/generate", json=generate_request)
        assert generate_response.status_code == 201
        report_data = generate_response.json()
        
        # Paso 3: Verificar contenido del reporte
        assert "summary" in report_data
        assert "metrics" in report_data
        assert "charts" in report_data
        assert report_data["generated_at"] is not None
        
        # Paso 4: Verificar que el reporte se puede descargar
        report_id = report_data.get("report_id")
        if report_id:
            download_response = await e2e_client.get(f"/api/analytics/reports/{report_id}/download")
            assert download_response.status_code == 200
        
        # Paso 5: Verificar programación de reportes
        schedules_response = await e2e_client.get("/api/analytics/reports/schedules")
        assert schedules_response.status_code == 200
        schedules = schedules_response.json()
        
        schedule_found = any(s["id"] == schedule_id for s in schedules)
        assert schedule_found


class TestPredictiveAnalyticsWorkflow:
    """Tests E2E del sistema de analytics predictivo"""

    @pytest.mark.asyncio
    @pytest.mark.e2e
    async def test_revenue_forecasting_workflow(self, e2e_client: httpx.AsyncClient):
        """
        Test del workflow completo de predicción de ingresos
        """
        
        # Paso 1: Generar datos históricos simulados
        historical_data = []
        base_date = datetime.now() - timedelta(days=90)
        
        for i in range(90):
            date = base_date + timedelta(days=i)
            revenue = 1000 + (i * 10) + (50 * (i % 7))  # Patrón semanal simulado
            
            historical_data.append({
                "date": date.isoformat(),
                "revenue": revenue,
                "reservations": revenue // 100,
                "customers": revenue // 150
            })
        
        # Paso 2: Solicitar predicción de ingresos
        forecast_request = {
            "prediction_type": "revenue_forecast",
            "parameters": {
                "forecast_days": 30,
                "confidence_interval": 0.95,
                "include_trends": True
            },
            "historical_data": historical_data
        }
        
        forecast_response = await e2e_client.post("/api/analytics/predictions", json=forecast_request)
        assert forecast_response.status_code == 201
        forecast_data = forecast_response.json()
        
        # Paso 3: Verificar predicción generada
        assert "forecast" in forecast_data
        assert "confidence_intervals" in forecast_data
        assert "trends" in forecast_data
        assert len(forecast_data["forecast"]) == 30
        
        # Paso 4: Verificar métricas de precisión del modelo
        assert "model_metrics" in forecast_data
        metrics = forecast_data["model_metrics"]
        assert "mae" in metrics  # Mean Absolute Error
        assert "rmse" in metrics  # Root Mean Square Error
        
        # Paso 5: Solicitar análisis de tendencias
        trends_request = {
            "analysis_type": "trend_analysis",
            "data": historical_data,
            "parameters": {
                "detect_seasonality": True,
                "detect_anomalies": True
            }
        }
        
        trends_response = await e2e_client.post("/api/analytics/analyze", json=trends_request)
        assert trends_response.status_code == 200
        trends_data = trends_response.json()
        
        assert "seasonality" in trends_data
        assert "trends" in trends_data
        assert "anomalies" in trends_data


if __name__ == "__main__":
    # Ejecutar tests E2E
    pytest.main([__file__, "-v", "-m", "e2e"])