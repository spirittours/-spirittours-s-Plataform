# Sistema de Comunicación Inteligente

Sistema de comunicación multicanal con IA que filtra "preguntones", clasifica clientes y enruta a los departamentos correctos.

## 🎯 Características Principales

### 1. Detección de "Preguntones" (Time Wasters)
- **Scoring automático** basado en patrones de comportamiento
- Detecta clientes que hacen muchas preguntas sin intención de compra
- Evita desperdiciar recursos humanos en leads de baja calidad
- Umbral configurable (default: 7.0)

### 2. Clasificación Automática por Departamento
- **Customer Service**: Reservas existentes, modificaciones, soporte
- **Groups & Quotes**: Grupos grandes (10+ personas), cotizaciones corporativas
- **General Info**: Preguntas simples, información general
- **Sales**: Clientes con alta intención de compra
- **VIP Service**: Clientes VIP con prioridad máxima

### 3. Dual Routing Modes

#### Modo 1: AI_FIRST (IA Primero)
```
Cliente con intención de compra
    ↓
AI Sales Agent intenta cerrar venta
    ↓
Si AI no sabe → Escala a humano
    ↓
Agente humano finaliza
```

#### Modo 2: HUMAN_DIRECT (Humano Directo)
```
Cliente con intención de compra
    ↓
Directamente a agente humano
    ↓
Agente maneja todo el proceso
```

### 4. Extracción de Información de Contacto
- **Email**: Detecta y extrae automáticamente
- **Teléfono**: Soporta múltiples formatos internacionales
- **Nombre**: Extrae de frases como "me llamo...", "soy..."
- Valida completitud antes de routing a ventas

### 5. AI Sales Agent Especializado
- Califica leads automáticamente (score 0-10)
- Detecta presupuesto, timeline, tamaño de grupo, destinos
- Intenta cerrar ventas directamente
- Escala cuando no conoce la respuesta
- Máximo 3-5 intentos antes de escalar

### 6. Cola de Agentes Humanos
- Asignación inteligente por carga de trabajo
- Priorización por urgencia (1-5)
- Métricas de performance por agente
- Tiempo de espera estimado para clientes

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Multi-Channel Gateway                 │
│  (WhatsApp, Telegram, Facebook, Instagram, WebChat)     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                  Intelligent Router                      │
│  • Detección de preguntones                             │
│  • Clasificación de departamento                        │
│  • Scoring de intención de compra                       │
│  • Extracción de contacto                               │
└────────┬──────────────────────────────┬─────────────────┘
         │                              │
         ↓                              ↓
┌────────────────────┐        ┌─────────────────────────┐
│   AI Sales Agent   │        │   Human Agent Queue     │
│  • Calificación    │        │  • Asignación           │
│  • Cierre ventas   │        │  • Priorización         │
│  • Escalación      │        │  • Métricas             │
└────────────────────┘        └─────────────────────────┘
```

## 📁 Estructura de Archivos

```
backend/communication/
├── __init__.py                    # Exports del módulo
├── README.md                      # Esta documentación
├── intelligent_router.py          # Router central con scoring
├── ai_sales_agent.py             # Agente IA de ventas
├── human_agent_queue.py          # Cola de agentes humanos
├── multi_channel_gateway.py      # Gateway multicanal
└── channels/
    ├── __init__.py
    ├── base_connector.py         # Interfaz base
    ├── whatsapp_connector.py     # Conector WhatsApp
    ├── telegram_connector.py     # Conector Telegram (TODO)
    ├── facebook_connector.py     # Conector Facebook (TODO)
    └── instagram_connector.py    # Conector Instagram (TODO)
```

## 🚀 Uso Rápido

### 1. Inicializar Sistema

```python
from backend.communication import (
    IntelligentRouter,
    MultiChannelGateway,
    AISalesAgent,
    HumanAgentQueue,
)
from backend.ai.intelligent_chatbot import IntelligentChatbot

# Inicializar componentes
chatbot = IntelligentChatbot()
router = IntelligentRouter.get_instance()
sales_agent = AISalesAgent(chatbot)
human_queue = HumanAgentQueue()

# Crear gateway
gateway = MultiChannelGateway(
    router=router,
    chatbot=chatbot,
    sales_agent=sales_agent,
    human_queue=human_queue,
)
```

### 2. Registrar Canal

```python
from backend.communication.channels import WhatsAppConnector

# Configurar WhatsApp
whatsapp = WhatsAppConnector({
    "phone_number_id": "YOUR_PHONE_NUMBER_ID",
    "access_token": "YOUR_ACCESS_TOKEN",
    "api_version": "v18.0",
})

# Registrar en gateway
gateway.register_connector(Channel.WHATSAPP, whatsapp)
```

### 3. Registrar Agentes Humanos

```python
# Registrar agente de atención al cliente
await human_queue.register_agent(
    agent_id="agent_001",
    name="Juan Pérez",
    email="juan@example.com",
    departments=[Department.CUSTOMER_SERVICE, Department.SALES],
    max_concurrent=3,
    skills=["spanish", "english", "sales"],
)

# Poner agente disponible
await human_queue.update_agent_status("agent_001", AgentStatus.AVAILABLE)
```

### 4. Procesar Mensajes

```python
# El gateway procesa automáticamente mensajes de webhooks
result = await gateway.process_incoming_message(
    channel=Channel.WHATSAPP,
    raw_message=webhook_data,
)
```

## 🔧 Configuración

### Routing Mode

```python
# Modo AI_FIRST (IA intenta primero)
router.default_routing_mode = RoutingMode.AI_FIRST

# Modo HUMAN_DIRECT (directo a humano)
router.default_routing_mode = RoutingMode.HUMAN_DIRECT
```

### Umbrales

```python
# Umbral de preguntón (default: 7.0)
router.time_waster_threshold = 7.0

# Intentos máximos de AI antes de escalar (default: 3)
sales_agent.max_sales_attempts = 5
```

## 📊 API Endpoints

### Webhooks
```
POST /api/intelligent-communication/webhook/whatsapp
POST /api/intelligent-communication/webhook/telegram
POST /api/intelligent-communication/webhook/facebook
```

### Gestión de Agentes
```
POST /api/intelligent-communication/agents/register
PUT  /api/intelligent-communication/agents/{agent_id}/status
GET  /api/intelligent-communication/agents/list
GET  /api/intelligent-communication/agents/{agent_id}/performance
```

### Conversaciones
```
POST /api/intelligent-communication/conversations/{id}/complete
POST /api/intelligent-communication/conversations/{id}/message
GET  /api/intelligent-communication/conversations/{id}/history
```

### Monitoreo
```
GET /api/intelligent-communication/queue/status
GET /api/intelligent-communication/metrics/routing
```

### Testing
```
POST /api/intelligent-communication/test/route-message
```

## 🧪 Ejemplos de Testing

### Test 1: Cliente con Intención de Compra

```bash
curl -X POST http://localhost:8000/api/intelligent-communication/test/route-message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hola, quiero reservar un viaje a Cancún para 2 personas",
    "user_id": "test_user_001",
    "channel": "whatsapp"
  }'
```

**Resultado esperado:**
- `customer_type`: "potential"
- `department`: "sales"
- `purchase_signals`: 2+
- `action`: "route_to_ai" o "route_to_human" (según modo)

### Test 2: Preguntón (Time Waster)

```bash
# Enviar varios mensajes con preguntas sin compromiso
curl -X POST http://localhost:8000/api/intelligent-communication/test/route-message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Solo preguntaba, tal vez algún día...",
    "user_id": "test_user_002",
    "channel": "whatsapp"
  }'
```

**Resultado esperado:**
- `customer_type`: "time_waster" (después de varios mensajes)
- `time_waster_score`: 7.0+
- `action`: "route_to_ai" con `allow_escalation`: false

### Test 3: Grupo Grande

```bash
curl -X POST http://localhost:8000/api/intelligent-communication/test/route-message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Necesito cotización para un grupo de 25 personas",
    "user_id": "test_user_003",
    "channel": "whatsapp"
  }'
```

**Resultado esperado:**
- `department`: "groups_quotes"
- `customer_type`: "group"
- `action`: "route_to_human" con prioridad alta

## 📈 Métricas

### Por Agente
- Total de conversaciones atendidas
- Tasa de cierre exitoso
- Tiempo promedio de respuesta
- Calificación de performance (0-10)
- Conversaciones concurrentes actuales

### Por Departamento
- Longitud de cola actual
- Tiempo de espera estimado
- Distribución por prioridad
- Agentes disponibles

### Globales
- Total encolado
- Total asignado
- Total completado
- Tiempo promedio de espera
- Conversaciones activas

## 🔒 Seguridad

### Webhook Verification
- WhatsApp: Verificación de token en GET request
- Telegram: Validación de secret token
- Facebook: Verificación de firma HMAC

### Autenticación API
- Todos los endpoints requieren autenticación JWT
- RBAC para permisos granulares
- Rate limiting por usuario

## 🌍 Multi-Canal

### Canales Soportados

#### ✅ Implementados
- **WhatsApp Business API**: Full implementation

#### 🚧 En Desarrollo
- **Telegram Bot API**
- **Facebook Messenger**
- **Instagram Direct Messages**

#### 📋 Planeados
- Twitter/X DMs
- LinkedIn Messages
- WebChat widget
- SMS (Twilio)
- Email fallback

## 🤖 AI Sales Agent

### Calificación de Leads

El AI Sales Agent califica leads automáticamente basado en:

| Factor | Puntos | Descripción |
|--------|--------|-------------|
| Presupuesto definido | +2.5 | Cliente menciona rango de presupuesto |
| Timeline definido | +2.0 | Cliente indica fechas o urgencia |
| Timeline inmediato | +1.0 | Bonus si necesita viajar pronto |
| Tamaño de grupo | +1.5 | Cliente especifica número de personas |
| Destino de interés | +1.5 | Cliente menciona destinos específicos |
| Decision maker | +1.5 | Cliente puede tomar la decisión |

**Score >= 6.0**: Lead calificado, listo para proceso de venta

### Triggers de Escalación

El AI escala a humano cuando detecta:
- Preguntas sobre políticas de cancelación
- Problemas con pagos o reembolsos
- Modificación de reservas existentes
- Consultas de disponibilidad muy específicas
- Solicitudes de cotización exacta
- Términos y condiciones
- Seguros de viaje
- Documentación (visas, pasaportes)
- Baja confianza en respuesta (< 50%)
- Máximo de intentos alcanzado (3-5)

### Señales de Cierre

Indica que el cliente está listo para comprar:
- "quiero reservar"
- "deseo reservar"
- "voy a reservar"
- "acepto"
- "de acuerdo"
- "cómo pago"
- "forma de pago"
- "listo para pagar"
- "confirmar"

## 🎓 Patrones de "Preguntones"

### Indicadores de Time Waster

```python
time_waster_indicators = [
    r'\bsolo preguntaba\b',
    r'\bsolo pregunto\b',
    r'\btal vez\b',
    r'\bquizás\b',
    r'\bno estoy seguro\b',
    r'\blo voy a pensar\b',
    r'\bdéjame pensar\b',
    r'\bmás adelante\b',
    r'\ben el futuro\b',
    r'\bcuando tenga\b',
    r'\bsi pudiera\b',
    r'\bestoy viendo opciones\b',
    r'\bsolo curiosidad\b',
]
```

### Scoring
- Muchas preguntas sin avanzar: +0.5 por pregunta (después de 5)
- Indicadores de no compra: +1.0 cada uno
- Muchos mensajes sin contacto: +1.5 (después de 8 mensajes)
- Mucho tiempo sin decisión: +2.0 (después de 15 mensajes)

## 🔄 Flujo Completo

### Ejemplo: Cliente Interesado en Viajar

```
1. Cliente: "Hola, quiero información sobre Cancún"
   → Router detecta: Intent=SEARCH_DESTINATION, Department=GENERAL_INFO
   → Acción: Route to AI (chatbot general)

2. AI: "¡Claro! Cancún es hermoso. ¿Para cuándo planeas viajar?"
   Cliente: "Para el próximo mes, somos 2 personas"
   → Router actualiza: PurchaseSignals=2, GroupSize=2
   
3. AI: "Perfecto. ¿Tienes un presupuesto en mente?"
   Cliente: "Entre $2000 y $3000"
   → SalesAgent califica: Score=6.5, Qualified=true
   
4. AI: "Excelente, tengo opciones perfectas. ¿Puedo tener tu email?"
   Cliente: "claro, es juan@email.com"
   → Router: ContactInfo complete, PurchaseSignals=3
   
5. Modo AI_FIRST:
   → AI: "Te enviaré opciones a tu email. ¿Deseas proceder?"
   → Si acepta: AI procesa o escala a humano para finalizar
   
   Modo HUMAN_DIRECT:
   → Sistema: "Te conecto con un especialista en un momento"
   → Queue: Asigna a agente disponible de SALES
   → Agente: Recibe contexto completo y finaliza venta
```

## 📝 Notas de Implementación

### Base de Datos
- Contextos se mantienen en memoria (Redis en producción)
- Historial de conversaciones debe persistirse en DB
- Métricas deben guardarse para analytics

### Performance
- Procesamiento asíncrono con BackgroundTasks
- Webhooks responden inmediatamente (200 OK)
- Procesamiento real en background

### Escalabilidad
- Gateway puede correr múltiples instancias
- Redis para estado compartido
- Queue distribuido con Celery si es necesario

## 🐛 Troubleshooting

### Webhook no recibe mensajes
1. Verificar URL pública accesible
2. Verificar certificado SSL válido
3. Verificar token de verificación correcto
4. Ver logs del canal (Facebook/WhatsApp dashboard)

### AI no escala a humano
1. Verificar umbrales de escalación
2. Verificar max_ai_attempts
3. Verificar que hay agentes disponibles
4. Ver logs de routing_decision

### Cola se llena
1. Verificar agentes en status "available"
2. Aumentar max_concurrent por agente
3. Registrar más agentes
4. Revisar tiempos de completion

## 🚀 Próximos Pasos

- [ ] Implementar conectores Telegram, Facebook, Instagram
- [ ] Persistencia de contextos en base de datos
- [ ] Sistema de métricas y analytics completo
- [ ] Dashboard para supervisión en tiempo real
- [ ] Integración con CRM existente
- [ ] A/B testing de modos de routing
- [ ] ML para mejorar detección de intención
- [ ] Soporte para más idiomas
- [ ] Widget de WebChat embebible
- [ ] App móvil para agentes

## 📄 Licencia

Propiedad de la plataforma B2B2B - Uso interno
