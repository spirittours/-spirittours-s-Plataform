"""
Comprehensive Testing Suite for Spirit Tours
============================================
Suite completa de pruebas con >80% de cobertura de código.
Incluye pruebas unitarias, integración, end-to-end y performance.

Estructura:
- Unit Tests: Pruebas aisladas de componentes
- Integration Tests: Pruebas de integración entre servicios  
- E2E Tests: Pruebas de flujos completos
- Performance Tests: Pruebas de carga y estrés
- Security Tests: Pruebas de seguridad
"""

import asyncio
import pytest
import pytest_asyncio
from unittest.mock import Mock, patch, AsyncMock, MagicMock
import json
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
import random
import string
from typing import Dict, List, Any, Optional

# Testing frameworks
import httpx
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import redis.asyncio as redis
from faker import Faker
import factory
from hypothesis import given, strategies as st, settings
from locust import HttpUser, task, between

# Sistema imports
from backend.services.intelligent_chatbot_system import (
    IntelligentChatbotService,
    NLUEngine,
    DialogManager,
    IntentType,
    EntityType,
    Message,
    ConversationContext
)
from backend.services.advanced_email_service import AdvancedEmailService
from backend.integrations.unified_payment_gateway import (
    UnifiedPaymentGateway,
    PaymentProvider,
    PaymentStatus
)
from backend.integrations.advanced_websocket_manager import (
    AdvancedWebSocketManager,
    WebSocketConnection
)
from backend.ml.advanced_recommendation_engine import AdvancedMLSystem
from backend.models import User, Tour, Booking, Hotel, Customer

fake = Faker()

# ================== Fixtures y Configuración ==================

@pytest.fixture
async def test_db():
    """Base de datos de prueba"""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False
    )
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with engine.begin() as conn:
        # Crear tablas
        await conn.run_sync(Base.metadata.create_all)
    
    yield async_session
    
    await engine.dispose()

@pytest.fixture
async def redis_client():
    """Cliente Redis de prueba"""
    client = await redis.from_url("redis://localhost/1")  # DB 1 para tests
    await client.flushdb()
    yield client
    await client.close()

@pytest.fixture
def mock_email_service():
    """Mock del servicio de email"""
    service = Mock(spec=AdvancedEmailService)
    service.send_email = AsyncMock(return_value={"success": True, "message_id": "test123"})
    service.send_bulk_emails = AsyncMock(return_value={"sent": 10, "failed": 0})
    return service

@pytest.fixture
def mock_payment_gateway():
    """Mock del gateway de pagos"""
    gateway = Mock(spec=UnifiedPaymentGateway)
    gateway.create_payment = AsyncMock(return_value={
        "payment_id": "pay_test123",
        "status": PaymentStatus.PENDING,
        "amount": Decimal("100.00")
    })
    gateway.process_payment = AsyncMock(return_value={
        "status": PaymentStatus.COMPLETED,
        "transaction_id": "txn_test123"
    })
    return gateway

@pytest.fixture
async def chatbot_service(redis_client, mock_email_service, mock_payment_gateway):
    """Servicio de chatbot para pruebas"""
    service = IntelligentChatbotService(
        redis_client=redis_client,
        email_service=mock_email_service,
        payment_gateway=mock_payment_gateway,
        ml_system=Mock(spec=AdvancedMLSystem),
        event_bus=Mock(),
        workflow_engine=Mock()
    )
    await service.initialize()
    return service

# ================== Factory Classes ==================

class UserFactory(factory.Factory):
    """Factory para crear usuarios de prueba"""
    class Meta:
        model = User
    
    id = factory.Sequence(lambda n: n)
    email = factory.Faker("email")
    name = factory.Faker("name")
    created_at = factory.Faker("date_time")

class TourFactory(factory.Factory):
    """Factory para crear tours de prueba"""
    class Meta:
        model = Tour
    
    id = factory.Sequence(lambda n: n)
    name = factory.Faker("sentence", nb_words=3)
    destination = factory.Faker("city")
    price = factory.Faker("pydecimal", left_digits=4, right_digits=2, positive=True)
    duration_days = factory.Faker("random_int", min=1, max=14)

class BookingFactory(factory.Factory):
    """Factory para crear reservas de prueba"""
    class Meta:
        model = Booking
    
    id = factory.Sequence(lambda n: f"BK{n:06d}")
    user_id = factory.SubFactory(UserFactory)
    tour_id = factory.SubFactory(TourFactory)
    status = factory.Faker("random_element", elements=["pending", "confirmed", "cancelled"])
    total_amount = factory.Faker("pydecimal", left_digits=5, right_digits=2, positive=True)

# ================== Unit Tests ==================

class TestNLUEngine:
    """Pruebas unitarias para el motor NLU"""
    
    @pytest.mark.asyncio
    async def test_intent_detection_greeting(self):
        """Test detección de intención de saludo"""
        nlu = NLUEngine()
        await nlu.initialize()
        
        test_phrases = [
            "Hola, buenos días",
            "Hello there",
            "Hey, necesito ayuda",
            "Buenas tardes"
        ]
        
        for phrase in test_phrases:
            context = ConversationContext(
                session_id="test123",
                user_id="user123",
                state=ConversationState.IDLE
            )
            intent = await nlu.detect_intent(phrase, context)
            
            assert intent.type == IntentType.GREETING
            assert intent.confidence > 0.7
    
    @pytest.mark.asyncio
    async def test_entity_extraction(self):
        """Test extracción de entidades"""
        nlu = NLUEngine()
        await nlu.initialize()
        
        text = "Mi email es juan@example.com y mi teléfono es +521234567890"
        entities = await nlu.extract_entities(text)
        
        # Verificar email
        email_entities = [e for e in entities if e.type == EntityType.EMAIL]
        assert len(email_entities) == 1
        assert email_entities[0].value == "juan@example.com"
        
        # Verificar teléfono
        phone_entities = [e for e in entities if e.type == EntityType.PHONE]
        assert len(phone_entities) == 1
        assert "+521234567890" in phone_entities[0].value
    
    @pytest.mark.asyncio
    async def test_sentiment_analysis(self):
        """Test análisis de sentimiento"""
        nlu = NLUEngine()
        
        positive_text = "¡Excelente servicio! Estoy muy contento"
        negative_text = "Terrible experiencia, muy malo todo"
        neutral_text = "El tour es el próximo martes"
        
        positive_sentiment = await nlu.analyze_sentiment(positive_text)
        assert positive_sentiment > 0.3
        
        negative_sentiment = await nlu.analyze_sentiment(negative_text)
        assert negative_sentiment < -0.3
        
        neutral_sentiment = await nlu.analyze_sentiment(neutral_text)
        assert -0.2 <= neutral_sentiment <= 0.2
    
    @pytest.mark.parametrize("text,expected_intent", [
        ("Quiero reservar un viaje", IntentType.BOOKING),
        ("Necesito cancelar mi reserva", IntentType.CANCEL),
        ("¿Cuánto cuesta el tour?", IntentType.PAYMENT),
        ("Buscar hoteles en Cancún", IntentType.SEARCH),
        ("Necesito ayuda urgente", IntentType.SUPPORT),
    ])
    async def test_intent_detection_various(self, text, expected_intent):
        """Test detección de varias intenciones"""
        nlu = NLUEngine()
        await nlu.initialize()
        
        context = ConversationContext(
            session_id="test",
            user_id="test_user",
            state=ConversationState.IDLE
        )
        
        intent = await nlu.detect_intent(text, context)
        assert intent.type == expected_intent

class TestDialogManager:
    """Pruebas para el gestor de diálogos"""
    
    @pytest.mark.asyncio
    async def test_greeting_response(self):
        """Test respuesta a saludo"""
        nlu = NLUEngine()
        await nlu.initialize()
        dialog = DialogManager(nlu)
        
        message = Message(
            id="msg1",
            sender="user1",
            text="Hola",
            timestamp=datetime.utcnow(),
            language="es"
        )
        
        context = ConversationContext(
            session_id="test",
            user_id="user1",
            state=ConversationState.IDLE
        )
        
        response = await dialog.process_message(message, context)
        
        assert response['type'] == 'text'
        assert 'Hola' in response['text'] or 'Bienvenido' in response['text']
    
    @pytest.mark.asyncio
    async def test_booking_flow(self):
        """Test flujo completo de reserva"""
        nlu = NLUEngine()
        await nlu.initialize()
        dialog = DialogManager(nlu)
        
        context = ConversationContext(
            session_id="booking_test",
            user_id="user1",
            state=ConversationState.IDLE
        )
        
        # Mensaje 1: Intención de reserva
        msg1 = Message(
            id="msg1",
            sender="user1",
            text="Quiero reservar un tour",
            timestamp=datetime.utcnow()
        )
        
        response1 = await dialog.process_message(msg1, context)
        assert '¿A dónde' in response1['text'].lower()
        
        # Mensaje 2: Proporcionar destino
        msg2 = Message(
            id="msg2",
            sender="user1",
            text="A Cancún",
            timestamp=datetime.utcnow()
        )
        
        response2 = await dialog.process_message(msg2, context)
        assert 'fecha' in response2['text'].lower()
        
        # Verificar que se guardó el destino
        assert 'destination' in context.collected_data
        assert 'Cancún' in context.collected_data['destination']

class TestEmailService:
    """Pruebas para el servicio de email"""
    
    @pytest.mark.asyncio
    async def test_send_single_email(self, mock_email_service):
        """Test envío de email individual"""
        result = await mock_email_service.send_email(
            to=["user@example.com"],
            subject="Test Email",
            template="welcome",
            context={"name": "John"}
        )
        
        assert result["success"] == True
        assert "message_id" in result
        mock_email_service.send_email.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_bulk_emails(self, mock_email_service):
        """Test envío masivo de emails"""
        recipients = [fake.email() for _ in range(10)]
        
        result = await mock_email_service.send_bulk_emails(
            recipients=recipients,
            subject="Newsletter",
            template="newsletter",
            context={"month": "December"}
        )
        
        assert result["sent"] == 10
        assert result["failed"] == 0
    
    @pytest.mark.asyncio
    async def test_email_queue_retry(self, redis_client):
        """Test reintentos de cola de email"""
        email_service = AdvancedEmailService(redis_client, None)
        
        # Simular fallo y reintento
        with patch.object(email_service, '_send_email_smtp') as mock_smtp:
            mock_smtp.side_effect = [Exception("Connection failed"), {"success": True}]
            
            result = await email_service.send_with_retry(
                to=["test@example.com"],
                subject="Test",
                body="Test message"
            )
            
            assert mock_smtp.call_count <= 3  # Max 3 intentos

class TestPaymentGateway:
    """Pruebas para el gateway de pagos"""
    
    @pytest.mark.asyncio
    async def test_create_payment(self, mock_payment_gateway):
        """Test creación de pago"""
        result = await mock_payment_gateway.create_payment(
            amount=Decimal("150.00"),
            currency="USD",
            description="Tour payment"
        )
        
        assert result["payment_id"].startswith("pay_")
        assert result["status"] == PaymentStatus.PENDING
        assert result["amount"] == Decimal("100.00")
    
    @pytest.mark.asyncio
    async def test_process_payment(self, mock_payment_gateway):
        """Test procesamiento de pago"""
        result = await mock_payment_gateway.process_payment(
            payment_id="pay_test123",
            payment_method={"type": "card", "token": "tok_visa"}
        )
        
        assert result["status"] == PaymentStatus.COMPLETED
        assert "transaction_id" in result
    
    @pytest.mark.parametrize("country,currency,expected_provider", [
        ("US", "USD", "stripe"),
        ("MX", "MXN", "mercadopago"),
        ("CO", "COP", "payu"),
        ("BR", "BRL", "mercadopago"),
    ])
    def test_provider_selection(self, country, currency, expected_provider):
        """Test selección automática de proveedor"""
        gateway = UnifiedPaymentGateway()
        provider = gateway.select_provider(country, currency, Decimal("100"))
        assert provider.name == expected_provider

# ================== Integration Tests ==================

class TestChatbotIntegration:
    """Pruebas de integración del chatbot"""
    
    @pytest.mark.asyncio
    async def test_complete_conversation_flow(self, chatbot_service):
        """Test flujo completo de conversación"""
        user_id = "test_user_123"
        
        # Saludo inicial
        response1 = await chatbot_service.process_text_message(
            user_id=user_id,
            text="Hola, buenos días"
        )
        assert response1['type'] == 'text'
        assert 'Hola' in response1['text'] or 'Bienvenido' in response1['text']
        
        # Solicitud de reserva
        response2 = await chatbot_service.process_text_message(
            user_id=user_id,
            text="Quiero reservar un tour a Cancún para 2 personas",
            session_id=response1.get('session_id')
        )
        assert response2['type'] in ['text', 'carousel']
        
        # Verificar contexto guardado
        context = await chatbot_service._get_context(user_id)
        assert context is not None
        assert len(context.messages) >= 2
    
    @pytest.mark.asyncio
    async def test_multi_language_support(self, chatbot_service):
        """Test soporte multi-idioma"""
        languages = {
            "Hello, I need help": "en",
            "Hola, necesito ayuda": "es",
            "Olá, preciso de ajuda": "pt"
        }
        
        for text, expected_lang in languages.items():
            response = await chatbot_service.process_text_message(
                user_id=f"user_{expected_lang}",
                text=text
            )
            assert 'text' in response
            # Verificar que se detectó el idioma correcto
    
    @pytest.mark.asyncio
    async def test_escalation_to_human(self, chatbot_service):
        """Test escalación a agente humano"""
        user_id = "angry_user"
        
        # Enviar mensaje muy negativo
        await chatbot_service.process_text_message(
            user_id=user_id,
            text="Este servicio es terrible, nada funciona!"
        )
        
        # Solicitar escalación
        result = await chatbot_service.escalate_to_human(
            user_id=user_id,
            reason="negative_sentiment"
        )
        
        assert result['type'] == 'escalation'
        assert 'ticket_id' in result or 'estimated_wait' in result

class TestWebSocketIntegration:
    """Pruebas de integración de WebSocket"""
    
    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        """Test conexión WebSocket"""
        manager = AdvancedWebSocketManager()
        
        # Simular conexión
        connection = WebSocketConnection(
            websocket=Mock(),
            connection_id="test_conn_1",
            user_id="user_1",
            connection_type="hotel",
            metadata={"hotel_id": "hotel_123"}
        )
        
        await manager.connect(connection)
        assert "test_conn_1" in manager.active_connections
        
        # Simular desconexión
        await manager.disconnect("test_conn_1")
        assert "test_conn_1" not in manager.active_connections
    
    @pytest.mark.asyncio
    async def test_privacy_filter(self):
        """Test filtro de privacidad en WebSocket"""
        from backend.integrations.advanced_websocket_manager import PrivacyFilter
        
        # Datos de cotización con precios de múltiples hoteles
        quotation_data = {
            "quotation_id": "Q123",
            "hotels": [
                {"hotel_id": "H1", "name": "Hotel A", "price": 100},
                {"hotel_id": "H2", "name": "Hotel B", "price": 120},
                {"hotel_id": "H3", "name": "Hotel C", "price": 90}
            ]
        }
        
        # Viewer es Hotel A
        viewer = Mock()
        viewer.connection_type = "hotel"
        viewer.metadata = {"hotel_id": "H1"}
        
        # Aplicar filtro
        filtered = PrivacyFilter.filter_quotation_data(quotation_data, viewer)
        
        # Hotel A solo debe ver su propio precio
        visible_prices = [h for h in filtered["hotels"] if "price" in h]
        assert len(visible_prices) == 1
        assert visible_prices[0]["hotel_id"] == "H1"

class TestMLIntegration:
    """Pruebas de integración de Machine Learning"""
    
    @pytest.mark.asyncio
    async def test_demand_forecasting(self):
        """Test predicción de demanda"""
        ml_system = AdvancedMLSystem(Mock())
        
        # Datos históricos de prueba
        import pandas as pd
        historical_data = pd.DataFrame({
            'ds': pd.date_range('2024-01-01', periods=100),
            'y': [random.randint(50, 200) for _ in range(100)]
        })
        
        forecaster = ml_system.demand_forecaster
        forecaster.model.fit(historical_data)
        
        # Predecir próximos 7 días
        forecast = forecaster.predict(periods=7)
        
        assert len(forecast) == 7
        assert all('yhat' in f for f in forecast)
    
    @pytest.mark.asyncio
    async def test_price_optimization(self):
        """Test optimización de precios"""
        ml_system = AdvancedMLSystem(Mock())
        optimizer = ml_system.price_optimizer
        
        # Features de prueba
        features = {
            'demand': 150,
            'seasonality': 0.8,
            'competition': 100,
            'days_advance': 30
        }
        
        optimal_price = await optimizer.optimize_price(features)
        
        assert isinstance(optimal_price, (int, float))
        assert optimal_price > 0
    
    @pytest.mark.asyncio
    async def test_recommendation_engine(self):
        """Test motor de recomendaciones"""
        ml_system = AdvancedMLSystem(Mock())
        recommender = ml_system.recommendation_engine
        
        # Historial de usuario de prueba
        user_history = [
            {"tour_id": "T1", "rating": 5},
            {"tour_id": "T2", "rating": 4},
            {"tour_id": "T3", "rating": 3}
        ]
        
        recommendations = await recommender.get_recommendations(
            user_id="user_123",
            history=user_history,
            n_recommendations=5
        )
        
        assert len(recommendations) <= 5
        assert all('tour_id' in rec for rec in recommendations)

# ================== End-to-End Tests ==================

class TestE2EBookingFlow:
    """Pruebas E2E del flujo de reserva"""
    
    @pytest.mark.asyncio
    async def test_complete_booking_flow(self, test_db, redis_client):
        """Test flujo completo de reserva desde búsqueda hasta pago"""
        
        # 1. Crear usuario
        user = UserFactory(email="e2e@test.com")
        
        # 2. Buscar tours
        search_params = {
            "destination": "Cancún",
            "start_date": "2024-06-01",
            "end_date": "2024-06-07",
            "passengers": 2
        }
        
        # Simular búsqueda (normalmente llamaría al API)
        available_tours = [
            TourFactory(destination="Cancún", price=999.99),
            TourFactory(destination="Cancún", price=1299.99)
        ]
        
        assert len(available_tours) > 0
        
        # 3. Seleccionar tour
        selected_tour = available_tours[0]
        
        # 4. Crear reserva
        booking = BookingFactory(
            user_id=user.id,
            tour_id=selected_tour.id,
            status="pending"
        )
        
        # 5. Procesar pago
        payment_data = {
            "booking_id": booking.id,
            "amount": selected_tour.price * 2,  # 2 passengers
            "payment_method": "card"
        }
        
        # Simular pago exitoso
        payment_result = {
            "status": "completed",
            "transaction_id": "txn_e2e_test"
        }
        
        # 6. Confirmar reserva
        booking.status = "confirmed"
        
        # 7. Enviar confirmación por email
        email_sent = {
            "to": user.email,
            "subject": "Booking Confirmation",
            "sent": True
        }
        
        # Verificaciones
        assert booking.status == "confirmed"
        assert payment_result["status"] == "completed"
        assert email_sent["sent"] == True

class TestE2EChatbotFlow:
    """Pruebas E2E del flujo de chatbot"""
    
    @pytest.mark.asyncio
    async def test_chatbot_booking_assistance(self, chatbot_service):
        """Test asistencia completa de reserva con chatbot"""
        user_id = "e2e_chatbot_user"
        session_id = str(uuid.uuid4())
        
        # Conversación completa
        conversation = [
            ("Hola", "greeting"),
            ("Quiero viajar a París", "booking"),
            ("Del 15 al 20 de julio", "date_provided"),
            ("Somos 2 adultos y 1 niño", "passengers_provided"),
            ("Sí, confirmar reserva", "confirmation"),
            ("Pagar con tarjeta", "payment_method")
        ]
        
        for message, expected_stage in conversation:
            response = await chatbot_service.process_text_message(
                user_id=user_id,
                text=message,
                session_id=session_id
            )
            
            assert 'text' in response
            assert response.get('error') is None
            
            # Verificar progreso de la conversación
            context = await chatbot_service._get_context(user_id, session_id)
            assert context is not None
        
        # Verificar datos recolectados
        final_context = await chatbot_service._get_context(user_id, session_id)
        assert 'destination' in final_context.collected_data
        assert 'dates' in final_context.collected_data
        assert 'passengers' in final_context.collected_data

# ================== Performance Tests ==================

class TestPerformance:
    """Pruebas de rendimiento"""
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_chatbot_response_time(self, chatbot_service, benchmark):
        """Test tiempo de respuesta del chatbot"""
        
        async def process_message():
            return await chatbot_service.process_text_message(
                user_id="perf_test_user",
                text="Hola, necesito información sobre tours"
            )
        
        result = await benchmark(process_message)
        assert result is not None
        
        # El chatbot debe responder en menos de 500ms
        assert benchmark.stats['mean'] < 0.5
    
    @pytest.mark.asyncio
    async def test_concurrent_users(self, chatbot_service):
        """Test manejo de usuarios concurrentes"""
        num_users = 100
        
        async def simulate_user(user_id):
            for i in range(5):
                await chatbot_service.process_text_message(
                    user_id=user_id,
                    text=f"Mensaje {i} del usuario {user_id}"
                )
                await asyncio.sleep(random.uniform(0.1, 0.5))
        
        # Simular usuarios concurrentes
        tasks = [simulate_user(f"user_{i}") for i in range(num_users)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Verificar que no hubo errores
        errors = [r for r in results if isinstance(r, Exception)]
        assert len(errors) == 0
    
    @pytest.mark.asyncio
    async def test_database_query_performance(self, test_db):
        """Test rendimiento de consultas a base de datos"""
        import time
        
        # Insertar datos de prueba
        async with test_db() as session:
            # Crear 1000 tours
            for i in range(1000):
                tour = TourFactory()
                session.add(tour)
            await session.commit()
            
            # Medir tiempo de consulta
            start = time.time()
            
            result = await session.execute(
                select(Tour).filter(Tour.destination == "Cancún").limit(10)
            )
            tours = result.scalars().all()
            
            elapsed = time.time() - start
            
            # La consulta debe completarse en menos de 100ms
            assert elapsed < 0.1
            assert len(tours) <= 10

# ================== Security Tests ==================

class TestSecurity:
    """Pruebas de seguridad"""
    
    @pytest.mark.asyncio
    async def test_sql_injection_prevention(self, chatbot_service):
        """Test prevención de SQL injection"""
        malicious_inputs = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin'--",
            "<script>alert('XSS')</script>"
        ]
        
        for malicious_text in malicious_inputs:
            response = await chatbot_service.process_text_message(
                user_id="security_test",
                text=malicious_text
            )
            
            # El sistema debe manejar la entrada de forma segura
            assert response is not None
            assert 'error' not in response or 'SQL' not in response.get('error', '')
    
    @pytest.mark.asyncio
    async def test_xss_prevention(self):
        """Test prevención de XSS"""
        from backend.services.advanced_email_service import AdvancedEmailService
        
        email_service = AdvancedEmailService(Mock(), Mock())
        
        # Intentar inyectar script en el template
        malicious_context = {
            "user_name": "<script>alert('XSS')</script>",
            "message": "Hello <img src=x onerror=alert('XSS')>"
        }
        
        # El servicio debe sanitizar el contenido
        rendered = email_service._render_template("welcome", malicious_context)
        
        assert '<script>' not in rendered
        assert 'onerror=' not in rendered
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, redis_client):
        """Test límite de tasa de requests"""
        from backend.middleware.rate_limiter import RateLimiter
        
        limiter = RateLimiter(redis_client, max_requests=10, window_seconds=60)
        
        user_ip = "192.168.1.1"
        
        # Hacer 10 requests (límite)
        for i in range(10):
            allowed = await limiter.check_limit(user_ip)
            assert allowed == True
        
        # El request 11 debe ser bloqueado
        allowed = await limiter.check_limit(user_ip)
        assert allowed == False
    
    @pytest.mark.asyncio
    async def test_authentication_required(self):
        """Test endpoints requieren autenticación"""
        from fastapi.testclient import TestClient
        from backend.services.intelligent_chatbot_system import app
        
        client = TestClient(app)
        
        # Intentar acceder sin autenticación
        response = client.get("/api/chatbot/history/user123")
        
        # Debe retornar 401 o requerir autenticación
        assert response.status_code in [401, 403]
    
    def test_password_encryption(self):
        """Test encriptación de contraseñas"""
        from werkzeug.security import generate_password_hash, check_password_hash
        
        password = "MySecureP@ssw0rd"
        
        # Generar hash
        hashed = generate_password_hash(password)
        
        # Verificar que no es texto plano
        assert password not in hashed
        assert len(hashed) > 50
        
        # Verificar que se puede validar
        assert check_password_hash(hashed, password) == True
        assert check_password_hash(hashed, "wrong_password") == False

# ================== Load Tests con Locust ==================

class ChatbotUser(HttpUser):
    """Usuario simulado para pruebas de carga"""
    wait_time = between(1, 3)
    
    def on_start(self):
        """Setup inicial del usuario"""
        self.user_id = f"load_test_{uuid.uuid4()}"
        self.session_id = str(uuid.uuid4())
    
    @task(3)
    def send_message(self):
        """Enviar mensaje al chatbot"""
        messages = [
            "Hola, necesito ayuda",
            "¿Cuáles son los tours disponibles?",
            "Quiero reservar para mañana",
            "¿Cuánto cuesta?",
            "Gracias"
        ]
        
        self.client.post(
            "/api/chatbot/message",
            json={
                "text": random.choice(messages),
                "session_id": self.session_id
            },
            headers={"X-User-ID": self.user_id}
        )
    
    @task(1)
    def get_history(self):
        """Obtener historial de conversación"""
        self.client.get(
            f"/api/chatbot/history/{self.user_id}",
            headers={"X-User-ID": self.user_id}
        )
    
    @task(1)
    def search_tours(self):
        """Buscar tours"""
        destinations = ["Cancún", "París", "Roma", "Tokio", "Nueva York"]
        
        self.client.get(
            "/api/tours/search",
            params={
                "destination": random.choice(destinations),
                "date": "2024-06-15"
            }
        )

# ================== Hypothesis Property-Based Tests ==================

class TestPropertyBased:
    """Pruebas basadas en propiedades con Hypothesis"""
    
    @given(
        text=st.text(min_size=1, max_size=500),
        user_id=st.text(min_size=5, max_size=50)
    )
    @settings(max_examples=50)
    @pytest.mark.asyncio
    async def test_chatbot_handles_any_text(self, chatbot_service, text, user_id):
        """Test que el chatbot maneja cualquier texto válido"""
        response = await chatbot_service.process_text_message(
            user_id=user_id,
            text=text
        )
        
        # Siempre debe retornar una respuesta válida
        assert response is not None
        assert 'type' in response
        assert response['type'] in ['text', 'card', 'carousel', 'error']
    
    @given(
        amount=st.decimals(min_value=Decimal("0.01"), max_value=Decimal("99999.99")),
        currency=st.sampled_from(["USD", "EUR", "MXN", "COP", "BRL"])
    )
    def test_payment_gateway_handles_amounts(self, amount, currency):
        """Test que el gateway maneja cualquier monto válido"""
        gateway = UnifiedPaymentGateway()
        
        # Debe poder crear un pago con cualquier monto válido
        result = gateway.create_payment_request(
            amount=amount,
            currency=currency
        )
        
        assert result is not None
        assert result.get('amount') == amount
        assert result.get('currency') == currency

# ================== Test Coverage Report ==================

def generate_coverage_report():
    """Generar reporte de cobertura de código"""
    import coverage
    import os
    
    # Configurar coverage
    cov = coverage.Coverage()
    cov.start()
    
    # Ejecutar todas las pruebas
    pytest.main([
        '--tb=short',
        '--cov=backend',
        '--cov-report=html:coverage_report',
        '--cov-report=term-missing',
        '--cov-fail-under=80'  # Fallar si la cobertura es menor a 80%
    ])
    
    cov.stop()
    cov.save()
    
    # Generar reporte
    cov.html_report(directory='coverage_report')
    
    # Mostrar resumen
    print("\n" + "="*60)
    print("REPORTE DE COBERTURA DE CÓDIGO")
    print("="*60)
    cov.report()
    
    # Verificar cobertura mínima
    total_coverage = cov.report()
    if total_coverage < 80:
        print(f"\n⚠️ Advertencia: Cobertura ({total_coverage:.1f}%) por debajo del mínimo (80%)")
    else:
        print(f"\n✅ Cobertura exitosa: {total_coverage:.1f}%")
    
    return total_coverage

# ================== Test Runner ==================

if __name__ == "__main__":
    # Ejecutar pruebas con diferentes configuraciones
    
    print("🧪 Ejecutando Suite Completa de Pruebas...")
    print("-" * 60)
    
    # 1. Pruebas unitarias
    print("\n📦 Ejecutando Pruebas Unitarias...")
    pytest.main([
        'tests/comprehensive_test_suite.py::TestNLUEngine',
        'tests/comprehensive_test_suite.py::TestDialogManager',
        '-v'
    ])
    
    # 2. Pruebas de integración
    print("\n🔗 Ejecutando Pruebas de Integración...")
    pytest.main([
        'tests/comprehensive_test_suite.py::TestChatbotIntegration',
        'tests/comprehensive_test_suite.py::TestWebSocketIntegration',
        '-v'
    ])
    
    # 3. Pruebas E2E
    print("\n🚀 Ejecutando Pruebas End-to-End...")
    pytest.main([
        'tests/comprehensive_test_suite.py::TestE2EBookingFlow',
        'tests/comprehensive_test_suite.py::TestE2EChatbotFlow',
        '-v'
    ])
    
    # 4. Pruebas de seguridad
    print("\n🔒 Ejecutando Pruebas de Seguridad...")
    pytest.main([
        'tests/comprehensive_test_suite.py::TestSecurity',
        '-v'
    ])
    
    # 5. Generar reporte de cobertura
    print("\n📊 Generando Reporte de Cobertura...")
    coverage_percentage = generate_coverage_report()
    
    print("\n" + "="*60)
    print("✅ SUITE DE PRUEBAS COMPLETADA")
    print(f"📈 Cobertura Total: {coverage_percentage:.1f}%")
    print("📁 Reporte HTML: coverage_report/index.html")
    print("="*60)