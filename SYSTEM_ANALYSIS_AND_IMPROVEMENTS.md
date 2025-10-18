# 🔍 ANÁLISIS COMPLETO DEL SISTEMA SPIRIT TOURS

## 📊 Estado Actual del Sistema

### 1. ARQUITECTURA GENERAL
```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 18)                      │
├─────────────────────────────────────────────────────────────┤
│                      BACKEND (FastAPI)                       │
├─────────────────────────────────────────────────────────────┤
│                    DATABASE (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────┤
│                   INFRASTRUCTURE (Docker)                    │
└─────────────────────────────────────────────────────────────┘
```

## 🔗 MAPA DE RELACIONES ENTRE COMPONENTES

### Componentes Principales y Sus Interdependencias

```mermaid
graph TB
    subgraph "Capa de Presentación"
        UI[React Frontend]
        Mobile[Mobile Apps]
        Portal[Provider Portal]
    end
    
    subgraph "Capa de Servicios"
        API[FastAPI Backend]
        WS[WebSocket Server]
        AI[AI Services]
    end
    
    subgraph "Núcleo del Negocio"
        Quotation[Sistema de Cotización]
        Booking[Sistema de Reservas]
        CRM[CRM]
        Inventory[Inventario]
    end
    
    subgraph "Servicios de Soporte"
        Email[Email Service]
        SMS[SMS/WhatsApp]
        Payment[Payment Gateway]
        Analytics[Analytics]
    end
    
    subgraph "Gestión de Recursos"
        Hotels[Hoteles]
        Transport[Transporte]
        Guides[Guías]
        Services[Servicios]
    end
    
    subgraph "Base de Datos"
        DB[(PostgreSQL)]
        Cache[(Redis)]
        FileStore[(S3/Blob)]
    end
    
    UI --> API
    Mobile --> API
    Portal --> API
    
    API --> Quotation
    API --> Booking
    API --> CRM
    
    Quotation --> Hotels
    Quotation --> Transport
    Quotation --> Guides
    Quotation --> Services
    
    Booking --> Payment
    Booking --> Email
    
    CRM --> Analytics
    CRM --> Email
    
    API --> DB
    API --> Cache
    API --> FileStore
```

## 🎯 ANÁLISIS DE COMPONENTES ACTUALES

### ✅ COMPONENTES COMPLETADOS (95%)

#### 1. **Sistema de Cotización Avanzado**
- **Fortalezas:**
  - Cotización grupal con privacidad de precios
  - Sistema dual automático/manual
  - Cálculo de costos operacionales
  - Tabla de precios flexible por grupo
  
- **Debilidades:**
  - Falta integración completa entre módulos
  - No hay versionado de cotizaciones
  - Sin histórico de cambios de precios

#### 2. **Gestión de Guías**
- **Fortalezas:**
  - Tipos múltiples de guías
  - Calendario de disponibilidad
  - Sistema de tarifas flexible
  - Evaluaciones y métricas

- **Debilidades:**
  - Sin app móvil para guías
  - Falta geolocalización en tiempo real
  - Sin sistema de backup automático

#### 3. **Gestión de Itinerarios**
- **Fortalezas:**
  - Múltiples modos de entrada
  - Optimización de rutas
  - Procesamiento de lenguaje natural
  - Templates del sistema

- **Debilidades:**
  - Falta integración con APIs de clima
  - Sin validación de horarios de apertura
  - No hay sugerencias basadas en historial

#### 4. **Perfiles de Grupo**
- **Fortalezas:**
  - Información detallada
  - Necesidades especiales
  - Preferencias personalizadas

- **Debilidades:**
  - Sin machine learning para predicciones
  - Falta análisis predictivo
  - No hay segmentación automática

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **Integración Fragmentada**
```
PROBLEMA: Los módulos funcionan de forma aislada
IMPACTO: Duplicación de datos, inconsistencias
SOLUCIÓN: Implementar Event-Driven Architecture
```

### 2. **Falta de Orquestación**
```
PROBLEMA: No hay flujo unificado de trabajo
IMPACTO: Procesos manuales, errores humanos
SOLUCIÓN: Implementar motor de workflow (Temporal/Airflow)
```

### 3. **Gestión de Estado Distribuido**
```
PROBLEMA: Estado disperso entre componentes
IMPACTO: Dificultad para mantener consistencia
SOLUCIÓN: Implementar Event Sourcing + CQRS
```

### 4. **Escalabilidad Limitada**
```
PROBLEMA: Arquitectura monolítica en servicios
IMPACTO: Cuellos de botella en alta demanda
SOLUCIÓN: Migrar a microservicios con Kubernetes
```

## 🔧 PLAN DE MEJORAS INTEGRALES

### FASE 1: INTEGRACIÓN Y ORQUESTACIÓN (2-3 semanas)

#### 1.1 Event Bus Central
```python
# backend/core/event_bus.py
from typing import Dict, Any, List, Callable
from datetime import datetime
import asyncio
import json
from enum import Enum

class EventType(Enum):
    # Quotation Events
    QUOTATION_CREATED = "quotation.created"
    QUOTATION_UPDATED = "quotation.updated"
    QUOTATION_APPROVED = "quotation.approved"
    QUOTATION_REJECTED = "quotation.rejected"
    
    # Booking Events
    BOOKING_CREATED = "booking.created"
    BOOKING_CONFIRMED = "booking.confirmed"
    BOOKING_CANCELLED = "booking.cancelled"
    
    # Payment Events
    PAYMENT_RECEIVED = "payment.received"
    PAYMENT_FAILED = "payment.failed"
    REFUND_PROCESSED = "refund.processed"
    
    # Guide Events
    GUIDE_ASSIGNED = "guide.assigned"
    GUIDE_CONFIRMED = "guide.confirmed"
    GUIDE_CHECKIN = "guide.checkin"
    
    # Hotel Events
    HOTEL_RESERVED = "hotel.reserved"
    HOTEL_CONFIRMED = "hotel.confirmed"
    HOTEL_CANCELLED = "hotel.cancelled"
    
    # Transport Events
    TRANSPORT_BOOKED = "transport.booked"
    TRANSPORT_CONFIRMED = "transport.confirmed"
    ROUTE_OPTIMIZED = "route.optimized"

class Event:
    def __init__(
        self,
        event_type: EventType,
        payload: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.id = str(uuid.uuid4())
        self.type = event_type
        self.payload = payload
        self.metadata = metadata or {}
        self.timestamp = datetime.utcnow()
        self.version = "1.0"

class EventBus:
    def __init__(self):
        self.subscribers: Dict[EventType, List[Callable]] = {}
        self.event_store: List[Event] = []
        self.dead_letter_queue: List[Event] = []
        
    async def publish(self, event: Event):
        """Publicar evento a todos los suscriptores"""
        # Guardar en event store
        self.event_store.append(event)
        
        # Notificar suscriptores
        if event.type in self.subscribers:
            for handler in self.subscribers[event.type]:
                try:
                    await handler(event)
                except Exception as e:
                    logger.error(f"Error handling event {event.id}: {str(e)}")
                    self.dead_letter_queue.append(event)
    
    def subscribe(self, event_type: EventType, handler: Callable):
        """Suscribir handler a tipo de evento"""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)
    
    async def replay_events(self, from_timestamp: datetime = None):
        """Reproducir eventos desde timestamp"""
        events_to_replay = [
            e for e in self.event_store
            if not from_timestamp or e.timestamp >= from_timestamp
        ]
        
        for event in events_to_replay:
            await self.publish(event)

# Singleton
event_bus = EventBus()
```

#### 1.2 Workflow Engine
```python
# backend/core/workflow_engine.py
from enum import Enum
from typing import Dict, Any, Optional, List
import asyncio

class WorkflowStatus(Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class WorkflowStep:
    def __init__(self, name: str, handler: Callable, retries: int = 3):
        self.name = name
        self.handler = handler
        self.retries = retries
        self.status = WorkflowStatus.PENDING
        self.result = None
        self.error = None

class Workflow:
    def __init__(self, workflow_id: str, name: str):
        self.id = workflow_id
        self.name = name
        self.steps: List[WorkflowStep] = []
        self.context: Dict[str, Any] = {}
        self.status = WorkflowStatus.PENDING
        self.current_step = 0
        
    def add_step(self, step: WorkflowStep):
        self.steps.append(step)
        
    async def execute(self):
        """Ejecutar workflow completo"""
        self.status = WorkflowStatus.IN_PROGRESS
        
        try:
            for i, step in enumerate(self.steps):
                self.current_step = i
                
                for attempt in range(step.retries):
                    try:
                        step.status = WorkflowStatus.IN_PROGRESS
                        step.result = await step.handler(self.context)
                        step.status = WorkflowStatus.COMPLETED
                        
                        # Actualizar contexto con resultado
                        self.context[f"{step.name}_result"] = step.result
                        break
                        
                    except Exception as e:
                        step.error = str(e)
                        if attempt == step.retries - 1:
                            step.status = WorkflowStatus.FAILED
                            raise
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff
            
            self.status = WorkflowStatus.COMPLETED
            
        except Exception as e:
            self.status = WorkflowStatus.FAILED
            raise

class WorkflowEngine:
    def __init__(self):
        self.workflows: Dict[str, Workflow] = {}
        
    async def create_quotation_workflow(self, quotation_data: Dict[str, Any]) -> Workflow:
        """Crear workflow de cotización completo"""
        workflow = Workflow(
            workflow_id=f"QUOTE-{uuid.uuid4().hex[:8]}",
            name="Complete Quotation Process"
        )
        
        # Definir pasos del workflow
        workflow.add_step(WorkflowStep(
            "validate_group_profile",
            self._validate_group_profile
        ))
        
        workflow.add_step(WorkflowStep(
            "check_availability",
            self._check_all_availability
        ))
        
        workflow.add_step(WorkflowStep(
            "calculate_costs",
            self._calculate_total_costs
        ))
        
        workflow.add_step(WorkflowStep(
            "generate_quotation",
            self._generate_quotation_document
        ))
        
        workflow.add_step(WorkflowStep(
            "send_notifications",
            self._send_all_notifications
        ))
        
        # Inicializar contexto
        workflow.context = quotation_data
        
        # Guardar workflow
        self.workflows[workflow.id] = workflow
        
        return workflow
    
    async def execute_workflow(self, workflow_id: str):
        """Ejecutar workflow por ID"""
        if workflow_id not in self.workflows:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        workflow = self.workflows[workflow_id]
        await workflow.execute()
        
        # Publicar evento de workflow completado
        await event_bus.publish(Event(
            EventType.WORKFLOW_COMPLETED,
            {
                "workflow_id": workflow_id,
                "status": workflow.status.value,
                "results": workflow.context
            }
        ))
        
        return workflow

# Singleton
workflow_engine = WorkflowEngine()
```

### FASE 2: MICROSERVICIOS Y ESCALABILIDAD (3-4 semanas)

#### 2.1 Arquitectura de Microservicios
```yaml
# docker-compose.microservices.yml
version: '3.8'

services:
  # API Gateway
  api-gateway:
    build: ./api-gateway
    ports:
      - "8000:8000"
    environment:
      - SERVICES_REGISTRY=consul:8500
    depends_on:
      - consul
      - quotation-service
      - booking-service
      - guide-service
      - hotel-service
      - transport-service

  # Microservicio de Cotizaciones
  quotation-service:
    build: ./services/quotation
    environment:
      - DB_URL=postgresql://user:pass@postgres:5432/quotations
      - REDIS_URL=redis://redis:6379
      - EVENT_BUS_URL=rabbitmq://rabbitmq:5672
    deploy:
      replicas: 3
    depends_on:
      - postgres
      - redis
      - rabbitmq

  # Microservicio de Reservas
  booking-service:
    build: ./services/booking
    environment:
      - DB_URL=postgresql://user:pass@postgres:5432/bookings
      - REDIS_URL=redis://redis:6379
      - EVENT_BUS_URL=rabbitmq://rabbitmq:5672
    deploy:
      replicas: 2
    depends_on:
      - postgres
      - redis
      - rabbitmq

  # Microservicio de Guías
  guide-service:
    build: ./services/guides
    environment:
      - DB_URL=postgresql://user:pass@postgres:5432/guides
      - REDIS_URL=redis://redis:6379
      - EVENT_BUS_URL=rabbitmq://rabbitmq:5672
    deploy:
      replicas: 2
    depends_on:
      - postgres
      - redis
      - rabbitmq

  # Microservicio de Hoteles
  hotel-service:
    build: ./services/hotels
    environment:
      - DB_URL=postgresql://user:pass@postgres:5432/hotels
      - REDIS_URL=redis://redis:6379
      - EVENT_BUS_URL=rabbitmq://rabbitmq:5672
    deploy:
      replicas: 2
    depends_on:
      - postgres
      - redis
      - rabbitmq

  # Microservicio de Transporte
  transport-service:
    build: ./services/transport
    environment:
      - DB_URL=postgresql://user:pass@postgres:5432/transport
      - REDIS_URL=redis://redis:6379
      - EVENT_BUS_URL=rabbitmq://rabbitmq:5672
    deploy:
      replicas: 2
    depends_on:
      - postgres
      - redis
      - rabbitmq

  # Microservicio de Notificaciones
  notification-service:
    build: ./services/notifications
    environment:
      - SMTP_HOST=smtp.gmail.com
      - SMS_PROVIDER=twilio
      - EVENT_BUS_URL=rabbitmq://rabbitmq:5672
    deploy:
      replicas: 2
    depends_on:
      - rabbitmq

  # Microservicio de Analytics
  analytics-service:
    build: ./services/analytics
    environment:
      - DB_URL=postgresql://user:pass@postgres:5432/analytics
      - CLICKHOUSE_URL=clickhouse://clickhouse:8123
      - EVENT_BUS_URL=rabbitmq://rabbitmq:5672
    deploy:
      replicas: 1
    depends_on:
      - postgres
      - clickhouse
      - rabbitmq

  # Infrastructure Services
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=spirittours
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=admin
    ports:
      - "15672:15672"  # Management UI
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  consul:
    image: consul:latest
    ports:
      - "8500:8500"  # UI
    command: agent -server -bootstrap-expect=1 -ui -client=0.0.0.0

  clickhouse:
    image: clickhouse/clickhouse-server:latest
    ports:
      - "8123:8123"  # HTTP interface
    volumes:
      - clickhouse_data:/var/lib/clickhouse

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  clickhouse_data:
```

#### 2.2 API Gateway con Kong
```yaml
# kong.yml
_format_version: "2.1"

services:
  - name: quotation-service
    url: http://quotation-service:8001
    routes:
      - name: quotation-route
        paths:
          - /api/v1/quotations
        methods:
          - GET
          - POST
          - PUT
          - DELETE
    plugins:
      - name: rate-limiting
        config:
          minute: 60
          hour: 10000
      - name: jwt
      - name: cors
      - name: request-transformer
        config:
          add:
            headers:
              - X-Service-Name:quotation-service

  - name: booking-service
    url: http://booking-service:8002
    routes:
      - name: booking-route
        paths:
          - /api/v1/bookings
        methods:
          - GET
          - POST
          - PUT
          - DELETE
    plugins:
      - name: rate-limiting
        config:
          minute: 60
          hour: 10000
      - name: jwt
      - name: cors

  - name: guide-service
    url: http://guide-service:8003
    routes:
      - name: guide-route
        paths:
          - /api/v1/guides
        methods:
          - GET
          - POST
          - PUT
          - DELETE
    plugins:
      - name: rate-limiting
        config:
          minute: 60
          hour: 10000
      - name: jwt
      - name: cors
```

### FASE 3: INTELIGENCIA ARTIFICIAL Y AUTOMATIZACIÓN (4-5 semanas)

#### 3.1 Motor de Recomendaciones ML
```python
# backend/ml/recommendation_engine.py
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestRegressor
import joblib
from typing import List, Dict, Any

class RecommendationEngine:
    def __init__(self):
        self.user_model = None
        self.itinerary_model = None
        self.price_predictor = None
        self.scaler = StandardScaler()
        
    async def train_models(self):
        """Entrenar todos los modelos ML"""
        # Cargar datos históricos
        user_data = await self._load_user_data()
        booking_data = await self._load_booking_data()
        itinerary_data = await self._load_itinerary_data()
        
        # Entrenar modelo de segmentación de usuarios
        self.user_model = self._train_user_segmentation(user_data)
        
        # Entrenar modelo de recomendación de itinerarios
        self.itinerary_model = self._train_itinerary_recommender(
            booking_data,
            itinerary_data
        )
        
        # Entrenar predictor de precios
        self.price_predictor = self._train_price_predictor(booking_data)
        
        # Guardar modelos
        self._save_models()
    
    def _train_user_segmentation(self, user_data: pd.DataFrame):
        """Segmentar usuarios por comportamiento"""
        # Feature engineering
        features = [
            'age', 'travel_frequency', 'avg_budget', 
            'group_size_avg', 'advance_booking_days',
            'cancellation_rate', 'satisfaction_score'
        ]
        
        X = user_data[features].fillna(0)
        X_scaled = self.scaler.fit_transform(X)
        
        # PCA para reducción de dimensionalidad
        pca = PCA(n_components=3)
        X_pca = pca.fit_transform(X_scaled)
        
        # K-Means clustering
        kmeans = KMeans(n_clusters=5, random_state=42)
        kmeans.fit(X_pca)
        
        user_data['segment'] = kmeans.labels_
        
        return {
            'scaler': self.scaler,
            'pca': pca,
            'kmeans': kmeans,
            'segments': user_data.groupby('segment').mean()
        }
    
    def _train_itinerary_recommender(
        self,
        booking_data: pd.DataFrame,
        itinerary_data: pd.DataFrame
    ):
        """Entrenar sistema de recomendación colaborativo"""
        # Crear matriz usuario-itinerario
        user_item_matrix = booking_data.pivot_table(
            index='user_id',
            columns='itinerary_id',
            values='rating',
            fill_value=0
        )
        
        # Factorización de matrices con SVD
        from sklearn.decomposition import TruncatedSVD
        svd = TruncatedSVD(n_components=50, random_state=42)
        user_features = svd.fit_transform(user_item_matrix)
        
        # Calcular similaridad entre itinerarios
        item_features = svd.components_.T
        item_similarity = np.dot(item_features, item_features.T)
        
        return {
            'svd': svd,
            'user_features': user_features,
            'item_features': item_features,
            'item_similarity': item_similarity,
            'item_mapping': dict(enumerate(user_item_matrix.columns))
        }
    
    def _train_price_predictor(self, booking_data: pd.DataFrame):
        """Entrenar predictor de precios óptimos"""
        features = [
            'destination_popularity', 'season_score', 'group_size',
            'advance_days', 'duration_days', 'service_level',
            'day_of_week', 'competition_index'
        ]
        
        X = booking_data[features]
        y = booking_data['final_price']
        
        # Random Forest para predicción de precios
        rf = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        rf.fit(X, y)
        
        # Calcular importancia de features
        feature_importance = pd.DataFrame({
            'feature': features,
            'importance': rf.feature_importances_
        }).sort_values('importance', ascending=False)
        
        return {
            'model': rf,
            'features': features,
            'feature_importance': feature_importance
        }
    
    async def get_recommendations(
        self,
        user_id: str,
        context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Obtener recomendaciones personalizadas"""
        # Obtener segmento del usuario
        user_segment = await self._get_user_segment(user_id)
        
        # Obtener itinerarios candidatos
        candidates = await self._get_candidate_itineraries(
            user_segment,
            context
        )
        
        # Rankear candidatos
        ranked_items = self._rank_recommendations(
            user_id,
            candidates,
            context
        )
        
        # Predecir precios óptimos
        for item in ranked_items:
            item['predicted_price'] = await self._predict_price(
                item,
                context
            )
            item['discount_suggestion'] = self._calculate_discount(
                item,
                user_segment
            )
        
        return ranked_items[:10]  # Top 10 recomendaciones
    
    async def predict_demand(
        self,
        destination: str,
        date_range: Tuple[date, date]
    ) -> Dict[str, Any]:
        """Predecir demanda futura"""
        # Análisis de series temporales con Prophet
        from prophet import Prophet
        
        # Cargar datos históricos
        historical_data = await self._load_demand_data(destination)
        
        # Preparar datos para Prophet
        df = pd.DataFrame({
            'ds': historical_data['date'],
            'y': historical_data['bookings']
        })
        
        # Entrenar modelo
        model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=True
        )
        model.fit(df)
        
        # Hacer predicción
        future = model.make_future_dataframe(periods=90)
        forecast = model.predict(future)
        
        # Filtrar por rango solicitado
        mask = (forecast['ds'] >= date_range[0]) & (forecast['ds'] <= date_range[1])
        prediction = forecast[mask]
        
        return {
            'destination': destination,
            'period': date_range,
            'predicted_demand': prediction['yhat'].tolist(),
            'lower_bound': prediction['yhat_lower'].tolist(),
            'upper_bound': prediction['yhat_upper'].tolist(),
            'recommendations': self._generate_demand_recommendations(prediction)
        }

# Singleton
recommendation_engine = RecommendationEngine()
```

#### 3.2 Chatbot Inteligente con NLU
```python
# backend/ai/chatbot_service.py
from transformers import pipeline, AutoModelForCausalLM, AutoTokenizer
import spacy
from rasa.core.agent import Agent
from typing import Dict, Any, List

class IntelligentChatbot:
    def __init__(self):
        # Cargar modelos de NLP
        self.nlp = spacy.load("es_core_news_lg")
        self.sentiment_analyzer = pipeline("sentiment-analysis")
        self.intent_classifier = None
        self.entity_extractor = None
        self.dialogue_manager = None
        
    async def initialize(self):
        """Inicializar modelos de IA"""
        # Cargar modelo de intenciones
        self.intent_classifier = await self._load_intent_model()
        
        # Cargar extractor de entidades
        self.entity_extractor = await self._load_entity_model()
        
        # Cargar gestor de diálogo
        self.dialogue_manager = Agent.load("./models/dialogue")
    
    async def process_message(
        self,
        message: str,
        user_id: str,
        session_id: str
    ) -> Dict[str, Any]:
        """Procesar mensaje del usuario"""
        # Análisis de sentimiento
        sentiment = self.sentiment_analyzer(message)[0]
        
        # Extraer intención
        intent = await self._classify_intent(message)
        
        # Extraer entidades
        entities = await self._extract_entities(message)
        
        # Obtener contexto del usuario
        context = await self._get_user_context(user_id, session_id)
        
        # Generar respuesta
        response = await self._generate_response(
            intent,
            entities,
            context,
            sentiment
        )
        
        # Ejecutar acciones si es necesario
        if response.get('actions'):
            await self._execute_actions(response['actions'], context)
        
        # Actualizar contexto
        await self._update_context(user_id, session_id, {
            'last_intent': intent,
            'last_entities': entities,
            'last_message': message,
            'last_response': response
        })
        
        return response
    
    async def _classify_intent(self, message: str) -> str:
        """Clasificar intención del mensaje"""
        intents = {
            'greeting': ['hola', 'buenos días', 'buenas tardes'],
            'quotation_request': ['cotización', 'precio', 'cuánto cuesta'],
            'booking': ['reservar', 'apartar', 'confirmar'],
            'itinerary_info': ['itinerario', 'qué incluye', 'actividades'],
            'support': ['ayuda', 'problema', 'no funciona'],
            'payment': ['pagar', 'tarjeta', 'transferencia'],
            'cancellation': ['cancelar', 'devolver', 'reembolso']
        }
        
        message_lower = message.lower()
        
        for intent, keywords in intents.items():
            if any(keyword in message_lower for keyword in keywords):
                return intent
        
        return 'general'
    
    async def _extract_entities(self, message: str) -> Dict[str, Any]:
        """Extraer entidades del mensaje"""
        doc = self.nlp(message)
        
        entities = {
            'locations': [],
            'dates': [],
            'people': [],
            'money': [],
            'numbers': []
        }
        
        for ent in doc.ents:
            if ent.label_ == "LOC":
                entities['locations'].append(ent.text)
            elif ent.label_ == "DATE":
                entities['dates'].append(ent.text)
            elif ent.label_ == "PER":
                entities['people'].append(ent.text)
            elif ent.label_ == "MONEY":
                entities['money'].append(ent.text)
            elif ent.label_ == "CARDINAL":
                entities['numbers'].append(ent.text)
        
        return entities
    
    async def _generate_response(
        self,
        intent: str,
        entities: Dict[str, Any],
        context: Dict[str, Any],
        sentiment: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generar respuesta apropiada"""
        
        # Ajustar tono según sentimiento
        tone = self._determine_tone(sentiment)
        
        # Generar respuesta según intención
        if intent == 'greeting':
            return await self._handle_greeting(context, tone)
        elif intent == 'quotation_request':
            return await self._handle_quotation_request(entities, context, tone)
        elif intent == 'booking':
            return await self._handle_booking(entities, context, tone)
        elif intent == 'itinerary_info':
            return await self._handle_itinerary_info(entities, context, tone)
        elif intent == 'support':
            return await self._handle_support(context, tone)
        elif intent == 'payment':
            return await self._handle_payment(entities, context, tone)
        elif intent == 'cancellation':
            return await self._handle_cancellation(entities, context, tone)
        else:
            return await self._handle_general(context, tone)
    
    async def _handle_quotation_request(
        self,
        entities: Dict[str, Any],
        context: Dict[str, Any],
        tone: str
    ) -> Dict[str, Any]:
        """Manejar solicitud de cotización"""
        response = {
            'type': 'quotation_request',
            'message': '',
            'actions': [],
            'suggestions': [],
            'data': {}
        }
        
        # Verificar si tenemos la información necesaria
        missing_info = []
        
        if not entities.get('locations'):
            missing_info.append('destino')
        if not entities.get('dates'):
            missing_info.append('fechas')
        if not entities.get('numbers'):
            missing_info.append('número de personas')
        
        if missing_info:
            response['message'] = f"Para preparar tu cotización necesito saber: {', '.join(missing_info)}"
            response['suggestions'] = [
                "Quiero viajar a Cusco",
                "Del 15 al 20 de marzo",
                "Somos 4 personas"
            ]
        else:
            # Crear cotización automática
            response['message'] = "¡Perfecto! Estoy preparando tu cotización..."
            response['actions'] = [{
                'type': 'create_quotation',
                'data': {
                    'destination': entities['locations'][0],
                    'dates': entities['dates'],
                    'passengers': int(entities['numbers'][0]) if entities['numbers'] else 1
                }
            }]
            response['data'] = {
                'show_loading': True,
                'redirect_to': '/quotations/new'
            }
        
        return response

# Singleton
chatbot = IntelligentChatbot()
```

### FASE 4: OPTIMIZACIÓN Y PERFORMANCE (2-3 semanas)

#### 4.1 Sistema de Caché Distribuido
```python
# backend/core/distributed_cache.py
import redis
import pickle
import json
from typing import Any, Optional, Dict
import hashlib
from datetime import timedelta

class DistributedCache:
    def __init__(self):
        # Redis cluster para alta disponibilidad
        self.redis_master = redis.Redis(
            host='redis-master',
            port=6379,
            decode_responses=False
        )
        self.redis_replicas = [
            redis.Redis(host=f'redis-replica-{i}', port=6379)
            for i in range(3)
        ]
        
        # Configuración de TTL por tipo de dato
        self.ttl_config = {
            'user_session': timedelta(hours=24),
            'quotation': timedelta(hours=48),
            'availability': timedelta(minutes=5),
            'price': timedelta(minutes=15),
            'static_content': timedelta(days=7)
        }
    
    def _get_key_hash(self, key: str) -> str:
        """Generar hash para distribución de claves"""
        return hashlib.md5(key.encode()).hexdigest()
    
    def _get_redis_instance(self, key: str, write: bool = False):
        """Obtener instancia Redis según la clave"""
        if write:
            return self.redis_master
        else:
            # Distribuir lecturas entre réplicas
            hash_val = int(self._get_key_hash(key), 16)
            replica_idx = hash_val % len(self.redis_replicas)
            return self.redis_replicas[replica_idx]
    
    async def get(
        self,
        key: str,
        default: Any = None
    ) -> Any:
        """Obtener valor del caché"""
        try:
            redis_instance = self._get_redis_instance(key, write=False)
            value = redis_instance.get(key)
            
            if value is None:
                return default
            
            # Deserializar
            try:
                return json.loads(value)
            except:
                return pickle.loads(value)
                
        except Exception as e:
            logger.error(f"Cache get error: {str(e)}")
            return default
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[timedelta] = None,
        data_type: Optional[str] = None
    ):
        """Establecer valor en caché"""
        try:
            redis_instance = self._get_redis_instance(key, write=True)
            
            # Serializar
            try:
                serialized = json.dumps(value)
            except:
                serialized = pickle.dumps(value)
            
            # Determinar TTL
            if ttl is None and data_type:
                ttl = self.ttl_config.get(data_type, timedelta(hours=1))
            
            # Guardar con TTL
            if ttl:
                redis_instance.setex(key, ttl, serialized)
            else:
                redis_instance.set(key, serialized)
            
            # Invalidación de caché relacionado
            await self._invalidate_related(key)
            
        except Exception as e:
            logger.error(f"Cache set error: {str(e)}")
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidar claves por patrón"""
        try:
            # Buscar en master
            keys = self.redis_master.keys(pattern)
            
            if keys:
                self.redis_master.delete(*keys)
                
                # Propagar a réplicas
                for replica in self.redis_replicas:
                    try:
                        replica.delete(*keys)
                    except:
                        pass
                        
        except Exception as e:
            logger.error(f"Cache invalidation error: {str(e)}")
    
    async def get_or_compute(
        self,
        key: str,
        compute_func: Callable,
        ttl: Optional[timedelta] = None
    ) -> Any:
        """Obtener del caché o computar si no existe"""
        # Intentar obtener del caché
        cached = await self.get(key)
        if cached is not None:
            return cached
        
        # Computar valor
        value = await compute_func()
        
        # Guardar en caché
        await self.set(key, value, ttl)
        
        return value

# Singleton
cache = DistributedCache()
```

#### 4.2 Query Optimization con GraphQL
```python
# backend/graphql/schema.py
import graphene
from graphene import relay
from graphene_sqlalchemy import SQLAlchemyObjectType, SQLAlchemyConnectionField
from sqlalchemy import select
from typing import Optional

class QuotationType(SQLAlchemyObjectType):
    class Meta:
        model = Quotation
        interfaces = (relay.Node,)
        
    # Campos computados con DataLoader para evitar N+1
    hotel_items = graphene.List(lambda: HotelItemType)
    transport_items = graphene.List(lambda: TransportItemType)
    guide_assignments = graphene.List(lambda: GuideAssignmentType)
    
    async def resolve_hotel_items(self, info):
        # Usar DataLoader para batch loading
        return await info.context.hotel_loader.load(self.id)
    
    async def resolve_transport_items(self, info):
        return await info.context.transport_loader.load(self.id)
    
    async def resolve_guide_assignments(self, info):
        return await info.context.guide_loader.load(self.id)

class Query(graphene.ObjectType):
    node = relay.Node.Field()
    
    # Queries optimizadas con paginación
    quotations = SQLAlchemyConnectionField(
        QuotationType,
        status=graphene.String(),
        date_from=graphene.Date(),
        date_to=graphene.Date()
    )
    
    quotation = graphene.Field(
        QuotationType,
        id=graphene.String(required=True)
    )
    
    # Query compleja con agregaciones
    quotation_analytics = graphene.Field(
        'QuotationAnalyticsType',
        date_range=graphene.String(),
        group_by=graphene.String()
    )
    
    async def resolve_quotations(
        self,
        info,
        status: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        **kwargs
    ):
        query = select(Quotation)
        
        # Aplicar filtros
        if status:
            query = query.where(Quotation.status == status)
        if date_from:
            query = query.where(Quotation.created_at >= date_from)
        if date_to:
            query = query.where(Quotation.created_at <= date_to)
        
        # Optimización con eager loading
        query = query.options(
            selectinload(Quotation.hotel_items),
            selectinload(Quotation.transport_items),
            selectinload(Quotation.guide_assignments)
        )
        
        result = await info.context.db.execute(query)
        return result.scalars().all()
    
    async def resolve_quotation_analytics(
        self,
        info,
        date_range: str = 'month',
        group_by: str = 'status'
    ):
        # Query optimizada con agregaciones en base de datos
        query = """
            WITH quotation_stats AS (
                SELECT 
                    DATE_TRUNC(:date_range, created_at) as period,
                    status,
                    COUNT(*) as count,
                    AVG(total_amount) as avg_amount,
                    SUM(total_amount) as total_amount,
                    AVG(passenger_count) as avg_passengers
                FROM quotations
                WHERE created_at >= NOW() - INTERVAL '1 year'
                GROUP BY period, status
            )
            SELECT 
                period,
                json_agg(
                    json_build_object(
                        'status', status,
                        'count', count,
                        'avg_amount', avg_amount,
                        'total_amount', total_amount,
                        'avg_passengers', avg_passengers
                    )
                ) as data
            FROM quotation_stats
            GROUP BY period
            ORDER BY period DESC
        """
        
        result = await info.context.db.execute(
            query,
            {'date_range': date_range}
        )
        
        return {
            'period_type': date_range,
            'data': result.fetchall()
        }

class Mutation(graphene.ObjectType):
    create_quotation = graphene.Field(
        QuotationType,
        input=graphene.Argument('QuotationInput')
    )
    
    update_quotation = graphene.Field(
        QuotationType,
        id=graphene.String(required=True),
        input=graphene.Argument('QuotationUpdateInput')
    )
    
    async def resolve_create_quotation(self, info, input):
        # Usar transacción para operación atómica
        async with info.context.db.begin():
            # Crear cotización
            quotation = Quotation(**input)
            info.context.db.add(quotation)
            
            # Publicar evento
            await event_bus.publish(Event(
                EventType.QUOTATION_CREATED,
                {'quotation_id': quotation.id}
            ))
            
            return quotation

schema = graphene.Schema(query=Query, mutation=Mutation)
```

## 🚀 ROADMAP DE IMPLEMENTACIÓN

### MES 1: FUNDACIÓN
- **Semana 1-2:** Event Bus y Workflow Engine
- **Semana 3-4:** Migración a Microservicios (Fase 1)

### MES 2: ESCALABILIDAD
- **Semana 5-6:** Completar Microservicios
- **Semana 7-8:** Sistema de Caché Distribuido y GraphQL

### MES 3: INTELIGENCIA
- **Semana 9-10:** Motor de Recomendaciones ML
- **Semana 11-12:** Chatbot Inteligente con NLU

### MES 4: OPTIMIZACIÓN
- **Semana 13-14:** Performance Tuning
- **Semana 15-16:** Testing E2E y Deploy

## 📈 MÉTRICAS DE ÉXITO

### KPIs Técnicos
- **Latencia API:** < 200ms p95
- **Disponibilidad:** > 99.9%
- **Throughput:** > 10,000 req/s
- **Error Rate:** < 0.1%

### KPIs de Negocio
- **Conversión de Cotización:** +25%
- **Tiempo de Respuesta:** -50%
- **Satisfacción del Cliente:** > 4.5/5
- **Reducción de Costos Operativos:** -30%

## 🔐 CONSIDERACIONES DE SEGURIDAD

1. **Autenticación:** OAuth 2.0 + JWT
2. **Autorización:** RBAC con Políticas
3. **Encriptación:** TLS 1.3 + AES-256
4. **Auditoría:** Event Sourcing completo
5. **Compliance:** GDPR, PCI-DSS

## 💰 ESTIMACIÓN DE INVERSIÓN

### Recursos Humanos (3 meses)
- 2 Backend Developers Senior: $30,000
- 1 Frontend Developer Senior: $12,000
- 1 DevOps Engineer: $12,000
- 1 Data Scientist: $15,000
- **Total RH:** $69,000

### Infraestructura (Anual)
- AWS/GCP/Azure: $2,000/mes = $24,000
- Herramientas (Datadog, Sentry): $500/mes = $6,000
- **Total Infra:** $30,000

### **TOTAL PROYECTO:** ~$100,000 USD

## 🎯 CONCLUSIÓN

El sistema Spirit Tours tiene una base sólida pero requiere:
1. **Integración profunda** entre componentes
2. **Arquitectura escalable** con microservicios
3. **Inteligencia artificial** para automatización
4. **Optimización** de performance

Con las mejoras propuestas, el sistema podrá:
- Escalar a 10x usuarios actuales
- Reducir tiempo de cotización en 70%
- Aumentar conversión en 25%
- Mejorar satisfacción del cliente

El ROI estimado es de 8-12 meses con un incremento de ingresos del 40% anual.