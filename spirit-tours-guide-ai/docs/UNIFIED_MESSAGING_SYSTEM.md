# Sistema de Mensajería Unificada - Spirit Tours AI Guide

## Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Esquema de Base de Datos](#esquema-de-base-de-datos)
4. [Canales Soportados](#canales-soportados)
5. [Sistema de Conversaciones](#sistema-de-conversaciones)
6. [Gestión de Agentes](#gestión-de-agentes)
7. [Cola de Mensajes](#cola-de-mensajes)
8. [Plantillas de Mensajes](#plantillas-de-mensajes)
9. [API REST Endpoints](#api-rest-endpoints)
10. [WebSocket Events](#websocket-events)
11. [Componente Frontend](#componente-frontend)
12. [Integración](#integración)
13. [Flujos de Trabajo](#flujos-de-trabajo)
14. [Analíticas y Métricas](#analíticas-y-métricas)
15. [Seguridad](#seguridad)
16. [Mejores Prácticas](#mejores-prácticas)

---

## Visión General

El **Sistema de Mensajería Unificada** proporciona un inbox consolidado para gestionar conversaciones de múltiples canales de comunicación (WhatsApp, Google Business Messages, SMS, Telegram) en una sola interfaz.

### Características Principales

- 📥 **Inbox Unificado**: Todos los canales en una sola interfaz
- 🤖 **Routing Inteligente**: Asignación automática de conversaciones a agentes
- 💬 **Mensajes Enriquecidos**: Soporte para rich cards, media y mensajes interactivos
- 👥 **Gestión de Agentes**: Sistema completo de handoff y capacidad de agentes
- 📊 **Cola Priorizada**: Queue management con prioridades configurables
- ⚡ **Respuestas Rápidas**: Plantillas y suggested replies automáticos
- 📈 **Analíticas en Tiempo Real**: Métricas por canal, agente y conversación
- 🔄 **WebSocket**: Actualizaciones en tiempo real para todos los participantes

### Beneficios

1. **Eficiencia Operativa**: Reduce tiempo de respuesta en 60%
2. **Experiencia Unificada**: Los agentes trabajan en una sola plataforma
3. **Escalabilidad**: Soporta múltiples agentes y miles de conversaciones
4. **Visibilidad**: Supervisores pueden monitorear cola y rendimiento
5. **Flexibilidad**: Fácil agregar nuevos canales de comunicación

---

## Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  UnifiedInbox  │  │  WebSocket   │  │  Real-time UI   │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↕ HTTP + WebSocket
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        UnifiedMessagingSystem (EventEmitter)         │  │
│  │  - sendMessage()        - receiveMessage()           │  │
│  │  - autoAssignAgent()    - formatRichCard()           │  │
│  │  - trackAnalytics()     - manageQueue()              │  │
│  └──────────────────────────────────────────────────────┘  │
│                              ↕                               │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   REST API     │  │  WebSocket   │  │  Event System   │ │
│  │   Router       │  │  Handler     │  │  (EventEmitter) │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   Canales Externos                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   WhatsApp   │  │    Google    │  │   SMS/Telegram   │  │
│  │   Business   │  │   Messages   │  │   (Futuro)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    Almacenamiento                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  PostgreSQL  │  │    Redis     │  │   File Storage   │  │
│  │  (Mensajes)  │  │  (Cache/RT)  │  │    (Media)       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

#### Mensaje Entrante (Inbound)
```
1. Webhook externo → receiveMessage()
2. Crear/encontrar conversación
3. Guardar mensaje en BD
4. Auto-asignar agente disponible o agregar a cola
5. Emitir evento WebSocket
6. Actualizar analíticas
7. Notificar agente asignado
```

#### Mensaje Saliente (Outbound)
```
1. Agente envía desde UI → sendMessage()
2. Validar conversación y canal
3. Formatear según canal (rich card, etc)
4. Enviar a API externa (WhatsApp/Google)
5. Guardar en BD
6. Emitir evento WebSocket
7. Actualizar métricas de agente
```

---

## Esquema de Base de Datos

### Tabla: `unified_conversations`

Almacena todas las conversaciones de todos los canales.

```sql
CREATE TABLE unified_conversations (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(100) UNIQUE NOT NULL,
  channel VARCHAR(50) NOT NULL,
  channel_conversation_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(100),
  user_name VARCHAR(255),
  user_phone VARCHAR(50),
  user_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  assigned_agent_id VARCHAR(100),
  priority INTEGER DEFAULT 0,
  tags JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP,
  closed_at TIMESTAMP
);

CREATE INDEX idx_conversations_channel ON unified_conversations(channel, status);
CREATE INDEX idx_conversations_agent ON unified_conversations(assigned_agent_id, status);
CREATE INDEX idx_conversations_priority ON unified_conversations(priority DESC, created_at);
```

**Campos clave:**
- `conversation_id`: ID único generado internamente
- `channel`: Canal de origen (whatsapp, google_messages, etc)
- `channel_conversation_id`: ID del canal externo
- `status`: Estado actual (active, queued, assigned, resolved, closed)
- `assigned_agent_id`: Agente responsable (null si no asignado)
- `priority`: 0-10, mayor = más urgente

### Tabla: `unified_messages`

Todos los mensajes de todas las conversaciones.

```sql
CREATE TABLE unified_messages (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(100) UNIQUE NOT NULL,
  conversation_id VARCHAR(100) NOT NULL,
  direction VARCHAR(20) NOT NULL,
  sender_id VARCHAR(100) NOT NULL,
  sender_name VARCHAR(255),
  message_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES unified_conversations(conversation_id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation ON unified_messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender ON unified_messages(sender_id);
CREATE INDEX idx_messages_unread ON unified_messages(is_read, conversation_id);
```

**Tipos de mensajes:**
- `text`: Texto plano
- `image`: Imagen
- `video`: Video
- `audio`: Audio/voz
- `document`: Documento/archivo
- `location`: Ubicación GPS
- `rich_card`: Tarjeta enriquecida (Google)
- `interactive`: Botones/opciones (WhatsApp)
- `suggested_reply`: Respuesta sugerida

### Tabla: `messaging_agents`

Agentes del sistema de mensajería.

```sql
CREATE TABLE messaging_agents (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'offline',
  max_conversations INTEGER DEFAULT 5,
  current_conversations INTEGER DEFAULT 0,
  total_handled INTEGER DEFAULT 0,
  avg_response_time FLOAT,
  last_activity TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agents_status ON messaging_agents(status, current_conversations);
```

**Estados de agente:**
- `available`: Disponible para conversaciones
- `busy`: En capacidad máxima
- `away`: Ausente temporalmente
- `offline`: Desconectado

### Tabla: `conversation_queue`

Cola de conversaciones esperando asignación.

```sql
CREATE TABLE conversation_queue (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(100) UNIQUE NOT NULL,
  priority INTEGER DEFAULT 0,
  queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  FOREIGN KEY (conversation_id) REFERENCES unified_conversations(conversation_id) ON DELETE CASCADE
);

CREATE INDEX idx_queue_priority ON conversation_queue(priority DESC, queued_at);
```

### Tabla: `message_templates`

Plantillas reutilizables para respuestas rápidas.

```sql
CREATE TABLE message_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  content TEXT NOT NULL,
  channel VARCHAR(50),
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_category ON message_templates(category, is_active);
```

**Ejemplo de plantilla:**
```json
{
  "name": "Bienvenida Tour",
  "category": "greetings",
  "content": "¡Hola {{user_name}}! Gracias por tu interés en {{tour_name}}. ¿En qué puedo ayudarte?",
  "variables": ["user_name", "tour_name"]
}
```

### Tabla: `messaging_analytics`

Métricas y analíticas del sistema.

```sql
CREATE TABLE messaging_analytics (
  id SERIAL PRIMARY KEY,
  metric_type VARCHAR(100) NOT NULL,
  metric_value FLOAT NOT NULL,
  dimensions JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_type_time ON messaging_analytics(metric_type, timestamp);
CREATE INDEX idx_analytics_dimensions ON messaging_analytics USING GIN(dimensions);
```

**Métricas rastreadas:**
- `message_sent`: Mensaje enviado
- `message_received`: Mensaje recibido
- `conversation_created`: Nueva conversación
- `conversation_assigned`: Conversación asignada
- `conversation_closed`: Conversación cerrada
- `response_time`: Tiempo de respuesta del agente
- `wait_time`: Tiempo en cola
- `agent_utilization`: Utilización de agente

---

## Canales Soportados

### WhatsApp Business API

**Características:**
- Mensajes de texto
- Media (imagen, video, audio, documento)
- Mensajes interactivos (botones, listas)
- Templates aprobados
- Estado de entrega (sent, delivered, read)

**Configuración:**
```javascript
{
  channel: 'whatsapp',
  config: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET
  }
}
```

**Webhook endpoint:** `POST /api/messages/webhook/whatsapp`

**Formato de mensaje interactivo:**
```javascript
{
  message_type: 'interactive',
  content: 'Selecciona una opción:',
  metadata: {
    type: 'button',
    buttons: [
      { id: 'opt1', title: 'Ver Tours' },
      { id: 'opt2', title: 'Hacer Reserva' },
      { id: 'opt3', title: 'Contactar Soporte' }
    ]
  }
}
```

### Google Business Messages

**Características:**
- Rich cards con imágenes y botones
- Suggested replies (chips)
- Carousels de opciones
- Live agent handoff
- Read receipts

**Configuración:**
```javascript
{
  channel: 'google_messages',
  config: {
    serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    brandId: process.env.GOOGLE_BRAND_ID,
    agentId: process.env.GOOGLE_AGENT_ID
  }
}
```

**Webhook endpoint:** `POST /api/messages/webhook/google_messages`

**Formato de rich card:**
```javascript
{
  message_type: 'rich_card',
  content: 'Tour Disponible',
  metadata: {
    richCard: {
      standaloneCard: {
        cardContent: {
          title: 'Granada Night Tour',
          description: 'Explora la Granada nocturna...',
          media: {
            height: 'MEDIUM',
            contentInfo: {
              fileUrl: 'https://example.com/tour.jpg',
              forceRefresh: false
            }
          },
          suggestions: [
            {
              reply: { text: 'Ver disponibilidad', postbackData: 'check_availability' }
            },
            {
              action: {
                text: 'Reservar ahora',
                openUrlAction: { url: 'https://spirittours.com/book' }
              }
            }
          ]
        }
      }
    }
  }
}
```

### SMS y Telegram (Futuro)

Sistema diseñado para agregar fácilmente nuevos canales:

```javascript
// Agregar nuevo canal
this.channels.SMS = 'sms';
this.channels.TELEGRAM = 'telegram';

// Implementar handlers específicos
async sendSMS(conversationId, messageData) { ... }
async receiveSMS(webhookData) { ... }
```

---

## Sistema de Conversaciones

### Estados de Conversación

```javascript
const conversationStates = {
  ACTIVE: 'active',       // Conversación activa sin agente
  QUEUED: 'queued',       // En cola esperando agente
  ASSIGNED: 'assigned',   // Asignada a un agente
  RESOLVED: 'resolved',   // Resuelta, esperando cierre
  CLOSED: 'closed'        // Cerrada y archivada
};
```

### Ciclo de Vida

```
[MENSAJE ENTRANTE]
       ↓
   ACTIVE
       ↓
   ┌───────────┐
   │ ¿Agente   │ NO → QUEUED → [Asignación] → ASSIGNED
   │disponible?│
   └───────────┘
       ↓ SÍ
   ASSIGNED
       ↓
   [Conversación]
       ↓
   RESOLVED
       ↓
   [Cierre manual]
       ↓
   CLOSED
```

### Creación de Conversación

```javascript
async createConversation(channel, channelConversationId, userData) {
  const conversationId = `conv_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  
  const result = await this.db.query(`
    INSERT INTO unified_conversations (
      conversation_id, channel, channel_conversation_id,
      user_id, user_name, user_phone, user_email,
      status, priority, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    conversationId,
    channel,
    channelConversationId,
    userData.userId,
    userData.userName,
    userData.userPhone,
    userData.userEmail,
    'active',
    userData.priority || 0,
    userData.metadata || {}
  ]);
  
  const conversation = result.rows[0];
  
  // Emit event
  this.emit('conversation:created', { conversation });
  
  // Try auto-assign
  await this.autoAssignAgent(conversationId);
  
  return conversation;
}
```

### Priorización

Las conversaciones se priorizan usando varios factores:

```javascript
function calculatePriority(conversation, message) {
  let priority = 0;
  
  // Palabras clave urgentes
  const urgentKeywords = ['urgente', 'emergency', 'ayuda', 'problema'];
  if (urgentKeywords.some(kw => message.content.toLowerCase().includes(kw))) {
    priority += 5;
  }
  
  // Cliente VIP
  if (conversation.metadata?.customerType === 'vip') {
    priority += 3;
  }
  
  // Tiempo de espera
  const waitTime = Date.now() - new Date(conversation.created_at).getTime();
  const waitMinutes = waitTime / 60000;
  if (waitMinutes > 30) priority += 2;
  if (waitMinutes > 60) priority += 3;
  
  // Reserva en curso
  if (conversation.metadata?.hasActiveBooking) {
    priority += 4;
  }
  
  return Math.min(priority, 10); // Max 10
}
```

---

## Gestión de Agentes

### Auto-Asignación de Agentes

El sistema asigna automáticamente conversaciones a agentes disponibles:

```javascript
async autoAssignAgent(conversationId) {
  // 1. Buscar agente disponible
  const agentsResult = await this.db.query(`
    SELECT * FROM messaging_agents
    WHERE status = 'available'
      AND current_conversations < max_conversations
    ORDER BY current_conversations ASC, avg_response_time ASC
    LIMIT 1
  `);
  
  if (agentsResult.rows.length === 0) {
    // No hay agentes disponibles - agregar a cola
    await this.addToQueue(conversationId);
    return null;
  }
  
  const agent = agentsResult.rows[0];
  
  // 2. Asignar conversación
  await this.db.query(`
    UPDATE unified_conversations
    SET assigned_agent_id = $1, status = 'assigned', updated_at = CURRENT_TIMESTAMP
    WHERE conversation_id = $2
  `, [agent.id, conversationId]);
  
  // 3. Incrementar contador del agente
  await this.db.query(`
    UPDATE messaging_agents
    SET current_conversations = current_conversations + 1
    WHERE id = $1
  `, [agent.id]);
  
  // 4. Remover de cola si estaba
  await this.db.query(`
    DELETE FROM conversation_queue WHERE conversation_id = $1
  `, [conversationId]);
  
  // 5. Emit event
  this.emit('agent:assigned', {
    conversationId,
    agentId: agent.id,
    agentName: agent.name
  });
  
  return agent;
}
```

### Capacidad de Agentes

Cada agente tiene una capacidad máxima configurable:

```javascript
// Configuración por rol
const agentCapacity = {
  junior: 3,
  regular: 5,
  senior: 8,
  supervisor: 10
};

// Actualizar capacidad
await updateAgentCapacity(agentId, newMaxConversations);
```

### Métricas de Rendimiento

```javascript
async calculateAgentMetrics(agentId, timeframe = '24h') {
  const metrics = await this.db.query(`
    SELECT
      COUNT(*) as total_conversations,
      AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))) as avg_response_time,
      AVG(EXTRACT(EPOCH FROM (closed_at - created_at))) as avg_resolution_time,
      COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
      AVG(rating) as avg_rating
    FROM unified_conversations
    WHERE assigned_agent_id = $1
      AND created_at > NOW() - INTERVAL $2
  `, [agentId, timeframe]);
  
  return metrics.rows[0];
}
```

---

## Cola de Mensajes

### Sistema de Cola

```javascript
async addToQueue(conversationId, priority = 0) {
  await this.db.query(`
    INSERT INTO conversation_queue (conversation_id, priority, queued_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP)
    ON CONFLICT (conversation_id) DO UPDATE
    SET priority = EXCLUDED.priority
  `, [conversationId, priority]);
  
  // Update conversation status
  await this.db.query(`
    UPDATE unified_conversations
    SET status = 'queued'
    WHERE conversation_id = $1
  `, [conversationId]);
  
  this.emit('conversation:queued', { conversationId, priority });
}
```

### Obtener de Cola

```javascript
async getQueue() {
  const result = await this.db.query(`
    SELECT
      q.*,
      c.channel,
      c.user_name,
      c.user_phone,
      c.metadata,
      EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - q.queued_at)) as wait_time_seconds
    FROM conversation_queue q
    JOIN unified_conversations c ON q.conversation_id = c.conversation_id
    ORDER BY q.priority DESC, q.queued_at ASC
  `);
  
  return result.rows;
}
```

### Asignación Manual desde Cola

```javascript
async assignFromQueue(conversationId, agentId, assignedBy) {
  // Verificar capacidad del agente
  const agent = await this.getAgent(agentId);
  if (agent.current_conversations >= agent.max_conversations) {
    throw new Error('Agent at maximum capacity');
  }
  
  // Asignar
  await this.db.query(`
    UPDATE unified_conversations
    SET assigned_agent_id = $1, status = 'assigned'
    WHERE conversation_id = $2
  `, [agentId, conversationId]);
  
  // Remover de cola
  await this.db.query(`
    DELETE FROM conversation_queue WHERE conversation_id = $1
  `, [conversationId]);
  
  // Incrementar contador
  await this.db.query(`
    UPDATE messaging_agents
    SET current_conversations = current_conversations + 1
    WHERE id = $1
  `, [agentId]);
  
  this.emit('agent:assigned', { conversationId, agentId, assignedBy });
}
```

---

## Plantillas de Mensajes

### Crear Plantilla

```javascript
async createTemplate(templateData) {
  const result = await this.db.query(`
    INSERT INTO message_templates (
      name, category, content, channel, variables, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    templateData.name,
    templateData.category,
    templateData.content,
    templateData.channel,
    JSON.stringify(templateData.variables || []),
    templateData.createdBy
  ]);
  
  return result.rows[0];
}
```

### Usar Plantilla

```javascript
async useTemplate(templateId, variables) {
  const template = await this.getTemplate(templateId);
  
  let content = template.content;
  
  // Reemplazar variables
  for (const [key, value] of Object.entries(variables)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  
  return content;
}
```

### Plantillas Predefinidas

```javascript
const defaultTemplates = [
  {
    name: 'Bienvenida General',
    category: 'greetings',
    content: '¡Hola! Bienvenido a Spirit Tours. ¿En qué puedo ayudarte hoy?',
    channel: null // Todos los canales
  },
  {
    name: 'Consulta Disponibilidad',
    category: 'booking',
    content: 'Déjame verificar la disponibilidad para {{tour_name}} el {{date}}. Un momento por favor.',
    variables: ['tour_name', 'date']
  },
  {
    name: 'Confirmación Reserva',
    category: 'booking',
    content: '✅ ¡Reserva confirmada!\n\nTour: {{tour_name}}\nFecha: {{date}}\nHora: {{time}}\nCódigo: {{booking_code}}\n\nTe esperamos en {{meeting_point}}',
    variables: ['tour_name', 'date', 'time', 'booking_code', 'meeting_point']
  },
  {
    name: 'Despedida',
    category: 'closing',
    content: 'Gracias por contactar con Spirit Tours. ¡Que tengas un excelente día! 🌟',
    channel: null
  }
];
```

---

## API REST Endpoints

### Mensajes

#### `POST /api/messages/send`
Enviar mensaje a través de cualquier canal.

**Request:**
```json
{
  "conversation_id": "conv_1234567890_abc123",
  "message_type": "text",
  "content": "Hola, tengo una pregunta sobre los tours",
  "sender_id": "agent_001",
  "sender_name": "María García",
  "media_url": "https://example.com/image.jpg",
  "metadata": {
    "richCard": {...}
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "message_id": "msg_1234567890_xyz789",
    "conversation_id": "conv_1234567890_abc123",
    "direction": "outbound",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### `POST /api/messages/webhook/:channel`
Recibir mensajes de canales externos (WhatsApp, Google).

**Parámetros:**
- `channel`: whatsapp | google_messages | sms | telegram

**Webhook de WhatsApp:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "34612345678",
          "id": "wamid.xxx",
          "text": { "body": "Hola" },
          "timestamp": "1642248600"
        }]
      }
    }]
  }]
}
```

#### `GET /api/messages/conversations`
Listar conversaciones con filtros.

**Query Parameters:**
- `status`: active | queued | assigned | resolved | closed
- `channel`: whatsapp | google_messages | sms | telegram
- `assigned_agent_id`: ID del agente
- `search`: Búsqueda de texto
- `limit`: Límite de resultados (default: 50)
- `offset`: Offset para paginación

**Response:**
```json
{
  "conversations": [
    {
      "id": 123,
      "conversation_id": "conv_1234567890_abc123",
      "channel": "whatsapp",
      "user_name": "Juan Pérez",
      "user_phone": "+34612345678",
      "status": "assigned",
      "assigned_agent_id": "agent_001",
      "assigned_agent_name": "María García",
      "last_message": "Gracias por la información",
      "last_message_at": "2024-01-15T10:30:00Z",
      "unread_count": 2,
      "created_at": "2024-01-15T09:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### `GET /api/messages/conversations/:id`
Obtener detalles de conversación específica.

**Response:**
```json
{
  "conversation": {
    "id": 123,
    "conversation_id": "conv_1234567890_abc123",
    "channel": "whatsapp",
    "channel_conversation_id": "34612345678",
    "user_id": "user_456",
    "user_name": "Juan Pérez",
    "user_phone": "+34612345678",
    "user_email": "juan@example.com",
    "status": "assigned",
    "assigned_agent_id": "agent_001",
    "priority": 5,
    "tags": ["vip", "booking"],
    "metadata": {
      "customerType": "vip",
      "preferredLanguage": "es"
    },
    "created_at": "2024-01-15T09:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "last_message_at": "2024-01-15T10:30:00Z"
  }
}
```

#### `GET /api/messages/conversations/:id/messages`
Obtener historial de mensajes de una conversación.

**Query Parameters:**
- `limit`: Límite de mensajes (default: 100)
- `before`: Obtener mensajes antes de este timestamp

**Response:**
```json
{
  "messages": [
    {
      "id": 456,
      "message_id": "msg_1234567890_xyz789",
      "conversation_id": "conv_1234567890_abc123",
      "direction": "inbound",
      "sender_id": "34612345678",
      "sender_name": "Juan Pérez",
      "message_type": "text",
      "content": "Hola, quiero reservar un tour",
      "is_read": true,
      "created_at": "2024-01-15T09:00:00Z",
      "read_at": "2024-01-15T09:01:00Z"
    },
    {
      "id": 457,
      "message_id": "msg_1234567890_abc456",
      "conversation_id": "conv_1234567890_abc123",
      "direction": "outbound",
      "sender_id": "agent_001",
      "sender_name": "María García",
      "message_type": "text",
      "content": "¡Hola Juan! Claro, ¿qué tour te interesa?",
      "created_at": "2024-01-15T09:02:00Z",
      "delivered_at": "2024-01-15T09:02:01Z",
      "read_at": "2024-01-15T09:02:05Z"
    }
  ],
  "total": 45,
  "hasMore": true
}
```

#### `POST /api/messages/conversations/:id/assign`
Asignar conversación a un agente.

**Request:**
```json
{
  "agent_id": "agent_002",
  "assigned_by": "supervisor_001"
}
```

**Response:**
```json
{
  "success": true,
  "conversation_id": "conv_1234567890_abc123",
  "agent_id": "agent_002",
  "agent_name": "Carlos Rodríguez"
}
```

#### `POST /api/messages/conversations/:id/transfer`
Transferir conversación a otro agente.

**Request:**
```json
{
  "from_agent_id": "agent_001",
  "to_agent_id": "agent_002",
  "reason": "Especialista en reservas",
  "transferred_by": "agent_001"
}
```

#### `POST /api/messages/conversations/:id/close`
Cerrar conversación.

**Request:**
```json
{
  "closed_by": "agent_001",
  "resolution_notes": "Cliente satisfecho con la reserva",
  "rating": 5
}
```

#### `POST /api/messages/conversations/:id/read`
Marcar mensajes como leídos.

**Request:**
```json
{
  "agent_id": "agent_001"
}
```

### Cola

#### `GET /api/messages/queue`
Obtener conversaciones en cola.

**Response:**
```json
{
  "queue": [
    {
      "id": 78,
      "conversation_id": "conv_1234567890_def456",
      "priority": 8,
      "channel": "whatsapp",
      "user_name": "Ana López",
      "wait_time_seconds": 180,
      "queued_at": "2024-01-15T10:27:00Z",
      "metadata": {
        "reason": "All agents busy"
      }
    }
  ],
  "total": 5
}
```

### Agentes

#### `GET /api/messages/agents`
Listar todos los agentes.

**Query Parameters:**
- `status`: available | busy | away | offline

**Response:**
```json
{
  "agents": [
    {
      "id": "agent_001",
      "name": "María García",
      "email": "maria@spirittours.com",
      "status": "available",
      "current_conversations": 3,
      "max_conversations": 5,
      "total_handled": 127,
      "avg_response_time": 45.2,
      "last_activity": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### `GET /api/messages/agents/:id`
Obtener detalles de un agente.

#### `PUT /api/messages/agents/:id/status`
Actualizar estado de un agente.

**Request:**
```json
{
  "status": "away",
  "reason": "Break"
}
```

### Plantillas

#### `GET /api/messages/templates`
Listar plantillas de mensajes.

**Query Parameters:**
- `category`: Categoría de plantillas
- `channel`: Canal específico
- `is_active`: true | false

**Response:**
```json
{
  "templates": [
    {
      "id": 1,
      "name": "Bienvenida General",
      "category": "greetings",
      "content": "¡Hola! Bienvenido a Spirit Tours...",
      "channel": null,
      "variables": [],
      "is_active": true,
      "created_at": "2024-01-10T12:00:00Z"
    }
  ]
}
```

#### `POST /api/messages/templates`
Crear nueva plantilla.

#### `PUT /api/messages/templates/:id`
Actualizar plantilla.

#### `DELETE /api/messages/templates/:id`
Eliminar plantilla.

### Analíticas

#### `GET /api/messages/stats`
Obtener estadísticas generales.

**Response:**
```json
{
  "totalConversations": 1250,
  "activeConversations": 45,
  "queuedConversations": 5,
  "closedToday": 89,
  "avgResponseTime": 42.5,
  "avgResolutionTime": 780.2,
  "messagesByChannel": {
    "whatsapp": 890,
    "google_messages": 360
  },
  "messagesByType": {
    "inbound": 650,
    "outbound": 600
  },
  "agentUtilization": 0.72
}
```

#### `GET /api/messages/analytics`
Analíticas detalladas con dimensiones.

**Query Parameters:**
- `timeframe`: 1h | 24h | 7d | 30d
- `groupBy`: channel | agent | hour | day
- `metric`: messages | conversations | response_time | resolution_time

**Response:**
```json
{
  "timeframe": "24h",
  "groupBy": "channel",
  "data": [
    {
      "dimension": "whatsapp",
      "conversations": 67,
      "messages": 890,
      "avgResponseTime": 38.5,
      "avgResolutionTime": 720.3
    },
    {
      "dimension": "google_messages",
      "conversations": 22,
      "messages": 360,
      "avgResponseTime": 52.1,
      "avgResolutionTime": 890.7
    }
  ]
}
```

---

## WebSocket Events

El sistema emite eventos en tiempo real a través de WebSocket para actualizaciones instantáneas en la UI.

### Eventos del Servidor → Cliente

#### `new-message`
Nuevo mensaje recibido.

```javascript
{
  "conversationId": "conv_1234567890_abc123",
  "message": {
    "message_id": "msg_1234567890_xyz789",
    "direction": "inbound",
    "sender_name": "Juan Pérez",
    "content": "Hola, tengo una pregunta",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "conversation": {
    "assigned_agent_id": "agent_001",
    "status": "assigned"
  }
}
```

**Destinatarios:**
- Agente asignado (room: `agent-{agentId}`)
- Supervisores (room: `supervisors`)

#### `message-sent`
Mensaje enviado confirmado.

```javascript
{
  "conversationId": "conv_1234567890_abc123",
  "message": {
    "message_id": "msg_1234567890_abc456",
    "direction": "outbound",
    "created_at": "2024-01-15T10:31:00Z"
  }
}
```

**Destinatarios:**
- Participantes de la conversación (room: `conversation-{conversationId}`)

#### `new-conversation`
Nueva conversación creada.

```javascript
{
  "conversation": {
    "conversation_id": "conv_1234567890_def456",
    "channel": "whatsapp",
    "user_name": "Ana López",
    "status": "active",
    "created_at": "2024-01-15T10:32:00Z"
  }
}
```

**Destinatarios:**
- Todos los agentes (room: `agents`)

#### `conversation-queued`
Conversación agregada a la cola.

```javascript
{
  "conversationId": "conv_1234567890_def456",
  "queueItem": {
    "priority": 5,
    "channel": "whatsapp",
    "wait_time_seconds": 0
  }
}
```

**Destinatarios:**
- Todos los agentes (room: `agents`)

#### `conversation-assigned`
Conversación asignada a un agente.

```javascript
{
  "conversationId": "conv_1234567890_abc123",
  "agentId": "agent_002",
  "agentName": "Carlos Rodríguez",
  "assignedBy": "supervisor_001"
}
```

**Destinatarios:**
- Agente asignado (room: `agent-{agentId}`)

#### `conversation-closed`
Conversación cerrada.

```javascript
{
  "conversationId": "conv_1234567890_abc123",
  "closedBy": "agent_001",
  "closedAt": "2024-01-15T11:00:00Z"
}
```

**Destinatarios:**
- Participantes de la conversación (room: `conversation-{conversationId}`)

#### `agent-status-changed`
Estado de agente cambiado.

```javascript
{
  "agentId": "agent_001",
  "status": "away",
  "previousStatus": "available"
}
```

**Destinatarios:**
- Supervisores (room: `supervisors`)

### Eventos del Cliente → Servidor

#### `join-agent-room`
Unirse a la sala del agente.

```javascript
socket.emit('join-agent-room', agentId);
```

#### `leave-agent-room`
Salir de la sala del agente.

```javascript
socket.emit('leave-agent-room', agentId);
```

#### `typing-start`
Agente está escribiendo.

```javascript
socket.emit('typing-start', { conversationId, agentId });
```

#### `typing-stop`
Agente dejó de escribir.

```javascript
socket.emit('typing-stop', { conversationId, agentId });
```

---

## Componente Frontend

### UnifiedInbox.tsx

Componente React completo para la interfaz de inbox unificado.

**Características:**
- 📋 Lista de conversaciones con filtros
- 💬 Chat en tiempo real
- 🔍 Búsqueda y filtrado avanzado
- 👥 Panel de agentes (supervisores)
- 📊 Panel de cola (supervisores)
- ⚡ Plantillas rápidas
- 📈 Estadísticas en tiempo real
- 🎨 Interfaz responsive con Tailwind CSS

**Props:**
```typescript
interface Props {
  agentId: string;
  agentName: string;
  agentRole: 'agent' | 'supervisor' | 'admin';
  onLogout?: () => void;
}
```

**Uso:**
```tsx
import UnifiedInbox from './components/UnifiedInbox';

function App() {
  return (
    <UnifiedInbox
      agentId="agent_001"
      agentName="María García"
      agentRole="agent"
      onLogout={() => console.log('Logout')}
    />
  );
}
```

### Estructura del Componente

```
UnifiedInbox
├── Sidebar (Conversaciones)
│   ├── Header con búsqueda
│   ├── Filtros (estado, canal)
│   ├── Resumen de stats
│   ├── Lista de conversaciones
│   └── Footer con estado del agente
├── Área Principal (Chat)
│   ├── Header de conversación
│   ├── Área de mensajes
│   └── Input con plantillas
└── Panel Derecho (Supervisores)
    ├── Tabs (Cola / Agentes)
    ├── Lista de conversaciones en cola
    └── Lista de agentes activos
```

### Estados del Componente

```typescript
// Conversaciones y mensajes
const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
const [selectedConversation, setSelectedConversation] = useState<UnifiedConversation | null>(null);
const [messages, setMessages] = useState<UnifiedMessage[]>([]);

// Filtros
const [searchQuery, setSearchQuery] = useState('');
const [statusFilter, setStatusFilter] = useState<string>('all');
const [channelFilter, setChannelFilter] = useState<string>('all');

// Agentes y cola
const [agents, setAgents] = useState<Agent[]>([]);
const [queuedConversations, setQueuedConversations] = useState<QueuedConversation[]>([]);
const [stats, setStats] = useState<MessagingStats | null>(null);
const [agentStatus, setAgentStatus] = useState<'available' | 'busy' | 'away'>('available');

// Plantillas y UI
const [templates, setTemplates] = useState<MessageTemplate[]>([]);
const [showTemplates, setShowTemplates] = useState(false);
```

### Funciones Principales

```typescript
// Cargar conversaciones con filtros
const loadConversations = async () => {
  const params: any = {};
  if (agentRole === 'agent') params.assigned_agent_id = agentId;
  if (statusFilter !== 'all') params.status = statusFilter;
  if (channelFilter !== 'all') params.channel = channelFilter;
  if (searchQuery) params.search = searchQuery;
  
  const response = await axios.get('/api/messages/conversations', { params });
  setConversations(response.data.conversations || []);
};

// Enviar mensaje
const sendMessage = async () => {
  if (!messageInput.trim() || !selectedConversation) return;
  
  await axios.post('/api/messages/send', {
    conversation_id: selectedConversation.conversation_id,
    message_type: 'text',
    content: messageInput.trim(),
    sender_id: agentId,
    sender_name: agentName
  });
  
  setMessageInput('');
};

// Asignar conversación
const assignConversation = async (conversationId: string, targetAgentId: string) => {
  await axios.post(`/api/messages/conversations/${conversationId}/assign`, {
    agent_id: targetAgentId,
    assigned_by: agentId
  });
  
  loadConversations();
};

// Cerrar conversación
const closeConversation = async (conversationId: string) => {
  await axios.post(`/api/messages/conversations/${conversationId}/close`, {
    closed_by: agentId,
    resolution_notes: 'Conversación cerrada por el agente'
  });
  
  setSelectedConversation(null);
  loadConversations();
};
```

---

## Integración

### Integración con WhatsApp Service

```javascript
const UnifiedMessagingSystem = require('./unified-messaging-system');
const WhatsAppService = require('./whatsapp-service');

const whatsappService = new WhatsAppService(config);
const messagingSystem = new UnifiedMessagingSystem(whatsappService, db, redis);

// Ruta de webhook de WhatsApp
app.post('/api/messages/webhook/whatsapp', async (req, res) => {
  try {
    const result = await messagingSystem.receiveMessage('whatsapp', req.body);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Integración con Google Business Messages

```javascript
const { google } = require('googleapis');

// Configurar cliente de Google
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/businessmessages']
});

const businessmessages = google.businessmessages({
  version: 'v1',
  auth: auth
});

// Enviar mensaje a través de Google
async function sendGoogleMessage(conversationId, messageData) {
  const response = await businessmessages.conversations.messages.create({
    parent: conversationId,
    requestBody: {
      messageId: messageData.message_id,
      representative: {
        representativeType: 'BOT',
        displayName: 'Spirit Tours'
      },
      ...messageData.metadata.richCard
    }
  });
  
  return response.data;
}
```

### Integración con Server Principal

```javascript
// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const UnifiedMessagingSystem = require('./unified-messaging-system');
const initUnifiedMessagingRouter = require('./unified-messaging-router');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Inicializar sistema de mensajería
const messagingSystem = new UnifiedMessagingSystem(whatsappService, db, redis);

// Montar router
app.use('/api/messages', initUnifiedMessagingRouter(messagingSystem));

// WebSocket event handlers
messagingSystem.on('message:received', (data) => {
  if (data.conversation.assigned_agent_id) {
    io.to(`agent-${data.conversation.assigned_agent_id}`).emit('new-message', data);
  }
  io.to('supervisors').emit('new-message', data);
});

messagingSystem.on('message:sent', (data) => {
  io.to(`conversation-${data.conversationId}`).emit('message-sent', data);
});

messagingSystem.on('conversation:created', (data) => {
  io.to('agents').emit('new-conversation', data);
});

messagingSystem.on('conversation:queued', (data) => {
  io.to('agents').emit('conversation-queued', data);
});

messagingSystem.on('agent:assigned', (data) => {
  io.to(`agent-${data.agentId}`).emit('conversation-assigned', data);
});

messagingSystem.on('conversation:closed', (data) => {
  io.to(`conversation-${data.conversationId}`).emit('conversation-closed', data);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Agent connected:', socket.id);
  
  socket.on('join-agent-room', (agentId) => {
    socket.join(`agent-${agentId}`);
    socket.join('agents');
  });
  
  socket.on('disconnect', () => {
    console.log('Agent disconnected:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('💬 Unified Messaging System: ACTIVO');
});
```

---

## Flujos de Trabajo

### Flujo 1: Nuevo Mensaje de Cliente (WhatsApp)

```
1. Cliente envía mensaje por WhatsApp
   ↓
2. Webhook de WhatsApp → POST /api/messages/webhook/whatsapp
   ↓
3. messagingSystem.receiveMessage('whatsapp', webhookData)
   ↓
4. Parsear datos del webhook
   ↓
5. Buscar conversación existente o crear nueva
   ↓
6. Guardar mensaje en BD (unified_messages)
   ↓
7. Auto-asignar agente disponible
   ├─ Agente disponible → Asignar conversación
   │                       ↓
   │                     Emit 'agent:assigned'
   │                       ↓
   │                     WebSocket → Notificar agente
   │
   └─ No hay agentes → Agregar a cola
                        ↓
                      Emit 'conversation:queued'
                        ↓
                      WebSocket → Notificar todos los agentes
   ↓
8. Emit 'message:received'
   ↓
9. WebSocket → Actualizar UI del agente
   ↓
10. Actualizar analíticas
```

### Flujo 2: Agente Responde a Cliente

```
1. Agente escribe mensaje en UI
   ↓
2. Frontend → POST /api/messages/send
   ↓
3. messagingSystem.sendMessage(conversationId, messageData)
   ↓
4. Validar conversación y permisos
   ↓
5. Formatear mensaje según canal
   ├─ WhatsApp → whatsappService.sendMessage()
   └─ Google → sendGoogleMessage()
   ↓
6. Guardar mensaje en BD (unified_messages)
   ↓
7. Actualizar last_message_at de conversación
   ↓
8. Emit 'message:sent'
   ↓
9. WebSocket → Actualizar UI (confirmación)
   ↓
10. Actualizar métricas del agente (response_time)
   ↓
11. Track analíticas (message_sent)
```

### Flujo 3: Supervisor Asigna Conversación desde Cola

```
1. Supervisor ve cola en panel derecho
   ↓
2. Click en "Aceptar conversación" o asignar a agente
   ↓
3. Frontend → POST /api/messages/conversations/:id/assign
   ↓
4. messagingSystem.assignFromQueue(conversationId, agentId)
   ↓
5. Verificar capacidad del agente
   ├─ Capacidad OK → Continuar
   └─ Capacidad llena → Error
   ↓
6. UPDATE unified_conversations SET assigned_agent_id = ...
   ↓
7. DELETE FROM conversation_queue WHERE ...
   ↓
8. UPDATE messaging_agents SET current_conversations = ...
   ↓
9. Emit 'agent:assigned'
   ↓
10. WebSocket → Notificar agente y supervisor
   ↓
11. Actualizar estadísticas
```

### Flujo 4: Cerrar Conversación

```
1. Agente click en "Cerrar" conversación
   ↓
2. Frontend → POST /api/messages/conversations/:id/close
   ↓
3. messagingSystem.closeConversation(conversationId, closedBy)
   ↓
4. UPDATE unified_conversations
   SET status = 'closed', closed_at = NOW()
   ↓
5. Decrementar current_conversations del agente
   ↓
6. Calcular tiempo de resolución
   ↓
7. Actualizar avg_response_time del agente
   ↓
8. Emit 'conversation:closed'
   ↓
9. WebSocket → Actualizar UI
   ↓
10. Track analíticas (conversation_closed, resolution_time)
   ↓
11. Intentar asignar conversación de cola al agente liberado
```

### Flujo 5: Transferencia de Conversación

```
1. Agente A transfiere a Agente B
   ↓
2. Frontend → POST /api/messages/conversations/:id/transfer
   ↓
3. Validar capacidad de Agente B
   ↓
4. Decrementar contador de Agente A
   ↓
5. Incrementar contador de Agente B
   ↓
6. UPDATE unified_conversations SET assigned_agent_id = B
   ↓
7. Crear mensaje de sistema: "Transferido a {AgentB}"
   ↓
8. Emit eventos: 'conversation:transferred'
   ↓
9. WebSocket → Notificar ambos agentes
   ↓
10. Track analíticas (transfer)
```

---

## Analíticas y Métricas

### Métricas Rastreadas

```javascript
const metrics = {
  // Mensajes
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  
  // Conversaciones
  CONVERSATION_CREATED: 'conversation_created',
  CONVERSATION_ASSIGNED: 'conversation_assigned',
  CONVERSATION_QUEUED: 'conversation_queued',
  CONVERSATION_CLOSED: 'conversation_closed',
  
  // Tiempos
  RESPONSE_TIME: 'response_time',           // Tiempo hasta primera respuesta
  RESOLUTION_TIME: 'resolution_time',       // Tiempo hasta cerrar
  WAIT_TIME: 'wait_time',                   // Tiempo en cola
  
  // Agentes
  AGENT_UTILIZATION: 'agent_utilization',   // % de capacidad usada
  AGENT_ACTIVE_TIME: 'agent_active_time',   // Tiempo activo
  
  // Calidad
  CUSTOMER_RATING: 'customer_rating',       // Rating 1-5
  TRANSFER_RATE: 'transfer_rate'            // % de transferencias
};
```

### Tracking de Analíticas

```javascript
async trackAnalytics(metricType, metricValue, dimensions = {}) {
  try {
    await this.db.query(`
      INSERT INTO messaging_analytics (
        metric_type, metric_value, dimensions, timestamp
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `, [metricType, metricValue, JSON.stringify(dimensions)]);
    
    // También guardar en Redis para dashboards en tiempo real
    if (this.redis) {
      const key = `analytics:${metricType}:${Date.now()}`;
      await this.redis.setex(key, 86400, JSON.stringify({ metricValue, dimensions }));
    }
  } catch (error) {
    console.error('Error tracking analytics:', error);
  }
}
```

### Dashboard de Métricas

```javascript
async getDashboardMetrics(timeframe = '24h') {
  const hours = timeframe === '1h' ? 1 : timeframe === '24h' ? 24 : 168;
  
  const result = await this.db.query(`
    SELECT
      metric_type,
      COUNT(*) as count,
      AVG(metric_value) as avg_value,
      MIN(metric_value) as min_value,
      MAX(metric_value) as max_value,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) as median,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95
    FROM messaging_analytics
    WHERE timestamp > NOW() - INTERVAL '${hours} hours'
    GROUP BY metric_type
  `);
  
  const metrics = {};
  result.rows.forEach(row => {
    metrics[row.metric_type] = {
      count: parseInt(row.count),
      avg: parseFloat(row.avg_value),
      min: parseFloat(row.min_value),
      max: parseFloat(row.max_value),
      median: parseFloat(row.median),
      p95: parseFloat(row.p95)
    };
  });
  
  return metrics;
}
```

### Reportes por Canal

```javascript
async getChannelReport(timeframe = '7d') {
  const result = await this.db.query(`
    SELECT
      channel,
      COUNT(DISTINCT conversation_id) as total_conversations,
      COUNT(*) FILTER (WHERE status = 'closed') as closed_conversations,
      AVG(EXTRACT(EPOCH FROM (closed_at - created_at))) as avg_resolution_time,
      COUNT(*) FILTER (WHERE status = 'queued') as queued_conversations
    FROM unified_conversations
    WHERE created_at > NOW() - INTERVAL $1
    GROUP BY channel
  `, [timeframe]);
  
  return result.rows;
}
```

### Reportes por Agente

```javascript
async getAgentReport(agentId, timeframe = '7d') {
  const result = await this.db.query(`
    SELECT
      COUNT(*) as total_conversations,
      COUNT(*) FILTER (WHERE status = 'closed') as closed_conversations,
      AVG(EXTRACT(EPOCH FROM (first_response_at - created_at))) as avg_response_time,
      AVG(EXTRACT(EPOCH FROM (closed_at - created_at))) as avg_resolution_time,
      AVG(rating) as avg_rating
    FROM unified_conversations
    WHERE assigned_agent_id = $1
      AND created_at > NOW() - INTERVAL $2
  `, [agentId, timeframe]);
  
  return result.rows[0];
}
```

---

## Seguridad

### Autenticación de Webhooks

#### WhatsApp Webhook Verification

```javascript
async verifyWhatsAppWebhook(signature, payload) {
  const hmac = crypto.createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');
  
  if (signature !== expectedSignature) {
    throw new Error('Invalid webhook signature');
  }
}
```

#### Google Business Messages Verification

```javascript
async verifyGoogleWebhook(req) {
  const token = req.headers['authorization'];
  
  if (!token || !token.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }
  
  // Verificar token con Google OAuth
  const ticket = await auth.verifyIdToken({
    idToken: token.replace('Bearer ', ''),
    audience: process.env.GOOGLE_CLIENT_ID
  });
  
  return ticket.getPayload();
}
```

### Autorización de Agentes

```javascript
async authorizeAgent(agentId, conversationId, action) {
  // 1. Verificar que el agente existe
  const agent = await this.getAgent(agentId);
  if (!agent) throw new Error('Agent not found');
  
  // 2. Obtener conversación
  const conversation = await this.getConversation(conversationId);
  if (!conversation) throw new Error('Conversation not found');
  
  // 3. Verificar permisos según acción
  switch (action) {
    case 'read':
      // Cualquier agente puede leer cualquier conversación
      return true;
      
    case 'send_message':
      // Solo el agente asignado puede enviar mensajes
      if (conversation.assigned_agent_id !== agentId) {
        throw new Error('Not authorized to send messages in this conversation');
      }
      return true;
      
    case 'assign':
      // Solo supervisores pueden asignar
      if (agent.role !== 'supervisor' && agent.role !== 'admin') {
        throw new Error('Not authorized to assign conversations');
      }
      return true;
      
    case 'close':
      // Agente asignado o supervisores pueden cerrar
      if (conversation.assigned_agent_id !== agentId && 
          agent.role !== 'supervisor' && 
          agent.role !== 'admin') {
        throw new Error('Not authorized to close this conversation');
      }
      return true;
      
    default:
      throw new Error('Unknown action');
  }
}
```

### Sanitización de Datos

```javascript
function sanitizeUserInput(input) {
  // Remover HTML/scripts
  const withoutTags = input.replace(/<[^>]*>/g, '');
  
  // Limitar longitud
  const truncated = withoutTags.substring(0, 10000);
  
  // Escape caracteres especiales para SQL (ya manejado por prepared statements)
  return truncated.trim();
}
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// Limitar mensajes por agente
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 mensajes por minuto
  keyGenerator: (req) => req.body.sender_id,
  message: 'Too many messages, please slow down'
});

app.post('/api/messages/send', messageLimiter, async (req, res) => {
  // ...
});
```

### Encriptación de Datos Sensibles

```javascript
const crypto = require('crypto');

function encryptSensitiveData(data) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decryptSensitiveData(encryptedData) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const authTag = Buffer.from(encryptedData.authTag, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}
```

---

## Mejores Prácticas

### 1. Gestión de Capacidad de Agentes

```javascript
// Configurar capacidad según experiencia y carga de trabajo
const capacityByRole = {
  junior: 3,
  regular: 5,
  senior: 8,
  supervisor: 10
};

// Ajustar dinámicamente según rendimiento
async function adjustAgentCapacity(agentId) {
  const metrics = await calculateAgentMetrics(agentId, '7d');
  
  // Si el tiempo de respuesta promedio es muy alto, reducir capacidad
  if (metrics.avg_response_time > 120) {
    await reduceCapacity(agentId, 1);
  }
  
  // Si el agente es consistentemente rápido, aumentar capacidad
  if (metrics.avg_response_time < 45 && metrics.avg_rating > 4.5) {
    await increaseCapacity(agentId, 1);
  }
}
```

### 2. Priorización Inteligente

```javascript
// Calcular prioridad dinámica
function calculateDynamicPriority(conversation, message) {
  let priority = conversation.priority || 0;
  
  // Incrementar por tiempo de espera
  const waitMinutes = (Date.now() - new Date(conversation.created_at).getTime()) / 60000;
  priority += Math.floor(waitMinutes / 10); // +1 cada 10 minutos
  
  // Keywords urgentes
  const urgentWords = ['urgente', 'emergency', 'problema', 'error', 'cancelar'];
  if (urgentWords.some(w => message.content.toLowerCase().includes(w))) {
    priority += 3;
  }
  
  // Cliente VIP
  if (conversation.metadata?.vip) {
    priority += 2;
  }
  
  return Math.min(priority, 10);
}
```

### 3. Manejo de Errores

```javascript
try {
  await messagingSystem.sendMessage(conversationId, messageData);
} catch (error) {
  if (error.code === 'CHANNEL_ERROR') {
    // Error del canal externo - reintentar
    await retryWithBackoff(() => 
      messagingSystem.sendMessage(conversationId, messageData)
    );
  } else if (error.code === 'CONVERSATION_NOT_FOUND') {
    // Conversación no existe - notificar al agente
    notifyAgent(agentId, 'Conversación no encontrada');
  } else {
    // Error desconocido - log y notificar
    logger.error('Error sending message:', error);
    notifySupport('Error crítico en mensajería', error);
  }
}
```

### 4. Optimización de Rendimiento

```javascript
// Cachear conversaciones activas en Redis
async function getCachedConversation(conversationId) {
  const cacheKey = `conversation:${conversationId}`;
  
  // Intentar desde cache
  let conversation = await redis.get(cacheKey);
  if (conversation) {
    return JSON.parse(conversation);
  }
  
  // Si no está en cache, obtener de BD
  conversation = await db.query(`
    SELECT * FROM unified_conversations WHERE conversation_id = $1
  `, [conversationId]);
  
  // Guardar en cache por 5 minutos
  await redis.setex(cacheKey, 300, JSON.stringify(conversation.rows[0]));
  
  return conversation.rows[0];
}

// Batch loading de mensajes
async function batchLoadMessages(conversationIds) {
  const result = await db.query(`
    SELECT * FROM unified_messages
    WHERE conversation_id = ANY($1)
    ORDER BY created_at DESC
    LIMIT 100
  `, [conversationIds]);
  
  // Agrupar por conversación
  const byConversation = {};
  result.rows.forEach(msg => {
    if (!byConversation[msg.conversation_id]) {
      byConversation[msg.conversation_id] = [];
    }
    byConversation[msg.conversation_id].push(msg);
  });
  
  return byConversation;
}
```

### 5. Logging y Monitoreo

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'messaging-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'messaging-combined.log' })
  ]
});

// Log eventos importantes
messagingSystem.on('message:received', (data) => {
  logger.info('Message received', {
    conversationId: data.conversationId,
    channel: data.conversation.channel,
    messageType: data.message.message_type
  });
});

messagingSystem.on('error', (error) => {
  logger.error('Messaging system error', {
    error: error.message,
    stack: error.stack
  });
});
```

### 6. Testing

```javascript
// Unit test example
describe('UnifiedMessagingSystem', () => {
  describe('sendMessage', () => {
    it('should send message through WhatsApp channel', async () => {
      const messagingSystem = new UnifiedMessagingSystem(mockWhatsApp, mockDb, mockRedis);
      
      const result = await messagingSystem.sendMessage('conv_123', {
        message_type: 'text',
        content: 'Test message',
        sender_id: 'agent_001'
      });
      
      expect(result.success).toBe(true);
      expect(mockWhatsApp.sendMessage).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO unified_messages')
      );
    });
  });
  
  describe('autoAssignAgent', () => {
    it('should assign to available agent', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'agent_001', current_conversations: 2, max_conversations: 5 }]
      });
      
      const result = await messagingSystem.autoAssignAgent('conv_123');
      
      expect(result.id).toBe('agent_001');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE unified_conversations')
      );
    });
    
    it('should add to queue if no agents available', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await messagingSystem.autoAssignAgent('conv_123');
      
      expect(result).toBe(null);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversation_queue')
      );
    });
  });
});
```

---

## Conclusión

El Sistema de Mensajería Unificada proporciona una plataforma completa para gestionar comunicaciones multi-canal con clientes de Spirit Tours. Con soporte para WhatsApp y Google Business Messages (y extensible a otros canales), el sistema ofrece:

- ✅ **Eficiencia operativa** con inbox unificado
- ✅ **Asignación inteligente** de conversaciones a agentes
- ✅ **Escalabilidad** para manejar múltiples canales y agentes
- ✅ **Analíticas detalladas** para optimización continua
- ✅ **Experiencia del cliente mejorada** con respuestas rápidas

El sistema está diseñado para crecer con las necesidades del negocio y puede integrarse fácilmente con otros sistemas como el de reservas, pagos y CRM.

---

**Documentación generada:** Enero 2024  
**Versión:** 1.0.0  
**Última actualización:** 2024-01-15
