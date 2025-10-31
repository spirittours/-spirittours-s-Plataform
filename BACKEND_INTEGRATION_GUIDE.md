# 🔌 Backend Integration Guide - Spirit Tours Frontend

## 📋 Tabla de Contenidos

1. [Resumen General](#resumen-general)
2. [Endpoints por Prioridad](#endpoints-por-prioridad)
3. [Autenticación](#autenticación)
4. [Integración WebSocket](#integración-websocket)
5. [Manejo de Errores](#manejo-de-errores)
6. [Variables de Entorno](#variables-de-entorno)
7. [Testing](#testing)

---

## 🎯 Resumen General

Este documento describe todos los endpoints del backend necesarios para conectar las **6 prioridades del frontend** completamente implementadas.

### Stack Tecnológico
- **Frontend**: React 19.1.1 + TypeScript + Material-UI
- **HTTP Client**: Axios con interceptores
- **WebSocket**: WebSocket API nativo
- **Estado**: Zustand + React Query (opcional)
- **Backend Esperado**: FastAPI/Express + PostgreSQL + Redis

---

## 🔐 Autenticación

Todos los servicios implementan autenticación mediante token Bearer:

```typescript
// Interceptor automático configurado en todos los servicios
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Endpoints de Auth (ya implementados en backend)
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

---

## 📊 Priority 1: AI Agents (25 Agentes)

### Base URL
```
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api'
```

### Endpoints Requeridos

#### 1. ContentMaster - Generación de Contenido
```typescript
POST /api/ai-agents/content-master/generate
Body: {
  topic: string;
  content_type: 'blog' | 'social' | 'email' | 'ad';
  tone: 'professional' | 'casual' | 'persuasive';
  length: number;
  keywords?: string[];
  seo_optimize?: boolean;
}
Response: {
  content: string;
  seo_score: number;
  readability_score: number;
  keywords_used: string[];
  estimated_performance: {
    engagement_score: number;
    conversion_potential: number;
  };
}
```

#### 2. CompetitiveIntel - Análisis Competitivo
```typescript
POST /api/ai-agents/competitive-intel/analyze
Body: {
  competitor_urls: string[];
  analysis_type: 'pricing' | 'features' | 'marketing' | 'full';
}
Response: {
  competitors: Array<{
    name: string;
    pricing: object;
    features: string[];
    strengths: string[];
    weaknesses: string[];
    market_position: string;
  }>;
  recommendations: string[];
  opportunities: string[];
}
```

#### 3. CustomerProphet - Predicción de Clientes
```typescript
POST /api/ai-agents/customer-prophet/predict
Body: {
  customer_id?: string;
  timeframe: '7d' | '30d' | '90d' | '1y';
  prediction_type: 'churn' | 'ltv' | 'next_purchase' | 'all';
}
Response: {
  churn_probability: number;
  lifetime_value: number;
  next_purchase_date: string;
  recommended_actions: string[];
  confidence_score: number;
}
```

#### 4-25. Otros Agentes (Patrón Similar)

**Estructura de Endpoint Consistente:**
```
POST /api/ai-agents/{agent-name}/{action}
GET  /api/ai-agents/{agent-name}/status
POST /api/ai-agents/{agent-name}/configure
```

**Lista Completa de Agentes:**
- `content-master` - Generación de contenido
- `competitive-intel` - Análisis competitivo
- `customer-prophet` - Predicción de clientes
- `experience-curator` - Curación de experiencias
- `revenue-maximizer` - Optimización de ingresos
- `social-sentiment` - Análisis de sentimiento
- `booking-optimizer` - Optimización de reservas
- `demand-forecaster` - Pronóstico de demanda
- `feedback-analyzer` - Análisis de feedback
- `multichannel` - Comunicación omnicanal
- `security-guard` - Monitoreo de seguridad
- `market-entry` - Análisis de entrada a mercados
- `influencer-match` - Identificación de influencers
- `luxury-upsell` - Upselling de lujo
- `route-genius` - Optimización de rutas
- `accessibility-specialist` - Especialista en accesibilidad
- `carbon-optimizer` - Optimización de carbono
- `local-impact` - Impacto local
- `ethical-tourism` - Turismo ético
- `crisis-management` - Gestión de crisis
- `personalization-engine` - Motor de personalización
- `cultural-adaptation` - Adaptación cultural
- `sustainability-advisor` - Asesor de sostenibilidad
- `wellness-optimizer` - Optimización de bienestar
- `knowledge-curator` - Curador de conocimiento

---

## 📈 Priority 2: Analytics Dashboard

### Service: analyticsService.ts

#### Endpoints Requeridos

```typescript
// Dashboard principal
GET /api/analytics/dashboard
Response: {
  revenue: {
    current: number;
    previous: number;
    change_percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
  bookings: {
    current: number;
    previous: number;
    change_percentage: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
  };
  growth_rate: number;
}

// Análisis de ingresos
GET /api/analytics/revenue?timeframe={7d|30d|90d|1y}&start_date={}&end_date={}
Response: {
  total_revenue: number;
  revenue_by_day: Array<{ date: string; amount: number }>;
  revenue_by_category: Array<{ category: string; amount: number; percentage: number }>;
  average_transaction: number;
  top_services: Array<{ name: string; revenue: number }>;
}

// Análisis de reservas
GET /api/analytics/bookings?timeframe={7d|30d|90d|1y}
Response: {
  total_bookings: number;
  bookings_by_day: Array<{ date: string; count: number }>;
  bookings_by_status: Array<{ status: string; count: number; percentage: number }>;
  cancellation_rate: number;
  average_booking_value: number;
}

// Análisis de clientes
GET /api/analytics/customers?timeframe={7d|30d|90d|1y}
Response: {
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  customer_segments: Array<{ segment: string; count: number; percentage: number }>;
  churn_rate: number;
  ltv_average: number;
}

// Métricas de rendimiento
GET /api/analytics/performance
Response: {
  conversion_rate: number;
  average_session_duration: number;
  bounce_rate: number;
  pages_per_session: number;
  satisfaction_score: number;
}

// Exportar reportes
GET /api/analytics/export?format={pdf|csv}&type={revenue|bookings|customers}
Response: Blob (archivo PDF o CSV)
```

---

## 💼 Priority 3: B2B/B2C/B2B2C Portals

### Service: portalsService.ts

#### Endpoints Requeridos

```typescript
// ===== Portal B2B =====
GET /api/portals/b2b/partners
Response: {
  partners: Array<{
    id: string;
    name: string;
    type: 'enterprise' | 'agency' | 'reseller';
    status: 'active' | 'pending' | 'suspended';
    contract_start: string;
    contract_end: string;
    discount_rate: number;
    total_bookings: number;
    total_revenue: number;
  }>;
}

POST /api/portals/b2b/partners
Body: {
  name: string;
  email: string;
  type: string;
  discount_rate: number;
  contract_terms: object;
}

GET /api/portals/b2b/partners/:id/performance
Response: {
  total_bookings: number;
  total_revenue: number;
  average_booking_value: number;
  revenue_trend: Array<{ month: string; revenue: number }>;
  top_services: Array<{ name: string; bookings: number }>;
}

// ===== Portal B2C =====
GET /api/portals/b2c/profile
Response: {
  user_id: string;
  name: string;
  email: string;
  loyalty_points: number;
  loyalty_tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  total_bookings: number;
  total_spent: number;
  preferences: object;
}

GET /api/portals/b2c/bookings
Response: {
  bookings: Array<{
    id: string;
    service: string;
    date: string;
    status: string;
    amount: number;
  }>;
}

POST /api/portals/b2c/bookings
Body: {
  service_id: string;
  date: string;
  guests: number;
  special_requests?: string;
}

// ===== Portal B2B2C =====
GET /api/portals/b2b2c/resellers
Response: {
  resellers: Array<{
    id: string;
    name: string;
    tier: 'bronze' | 'silver' | 'gold';
    commission_rate: number;
    total_sales: number;
    total_commission: number;
    status: 'active' | 'inactive';
  }>;
}

POST /api/portals/b2b2c/resellers
Body: {
  name: string;
  email: string;
  commission_rate: number;
  tier: string;
}

// ===== Commission Management =====
GET /api/portals/commissions
Response: {
  commissions: Array<{
    id: string;
    partner_id: string;
    partner_name: string;
    booking_id: string;
    amount: number;
    commission_rate: number;
    commission_amount: number;
    status: 'pending' | 'processing' | 'completed';
    due_date: string;
  }>;
  total_pending: number;
  total_processing: number;
  total_paid: number;
}

POST /api/portals/commissions/:id/pay
Body: {
  payment_method: string;
  notes?: string;
}
Response: {
  success: boolean;
  transaction_id: string;
  message: string;
}

GET /api/portals/commissions/report?start_date={}&end_date={}
Response: {
  total_commissions: number;
  total_paid: number;
  total_pending: number;
  by_partner: Array<{
    partner_id: string;
    name: string;
    amount: number;
  }>;
}
```

---

## 💳 Priority 4: Payment System

### Service: paymentsService.ts

#### Endpoints Requeridos

```typescript
// ===== Stripe Integration =====
POST /api/payments/stripe/create-intent
Body: {
  amount: number;
  currency: string;
  booking_id?: string;
  metadata?: object;
}
Response: {
  client_secret: string;
  payment_intent_id: string;
}

POST /api/payments/stripe/confirm
Body: {
  payment_intent_id: string;
  payment_method_id: string;
}
Response: {
  success: boolean;
  transaction_id: string;
  status: string;
}

// ===== PayPal Integration =====
POST /api/payments/paypal/create-order
Body: {
  amount: number;
  currency: string;
  booking_id?: string;
}
Response: {
  order_id: string;
  approval_url: string;
}

POST /api/payments/paypal/capture
Body: {
  order_id: string;
}
Response: {
  success: boolean;
  transaction_id: string;
  status: string;
}

// ===== Payment Methods =====
GET /api/payments/methods
Response: {
  payment_methods: Array<{
    id: string;
    type: 'card' | 'paypal' | 'bank_account';
    last4?: string;
    brand?: string;
    exp_month?: number;
    exp_year?: number;
    is_default: boolean;
  }>;
}

POST /api/payments/methods
Body: {
  type: string;
  token: string; // Stripe token or PayPal token
  set_as_default?: boolean;
}

DELETE /api/payments/methods/:id

// ===== Transaction History =====
GET /api/payments/transactions?page={}&limit={}&status={}
Response: {
  transactions: Array<{
    id: string;
    amount: number;
    currency: string;
    status: 'completed' | 'pending' | 'failed' | 'refunded';
    payment_method: string;
    created_at: string;
    description?: string;
  }>;
  total: number;
  page: number;
  pages: number;
}

GET /api/payments/transactions/:id
Response: {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
  receipt_url?: string;
  refund_reason?: string;
}

GET /api/payments/transactions/:id/receipt
Response: Blob (PDF receipt)

// ===== Refunds =====
POST /api/payments/refunds
Body: {
  transaction_id: string;
  amount: number;
  reason: string;
  notes?: string;
}
Response: {
  success: boolean;
  refund_id: string;
  status: string;
}

GET /api/payments/refunds?page={}&limit={}
Response: {
  refunds: Array<{
    id: string;
    transaction_id: string;
    amount: number;
    reason: string;
    status: 'pending' | 'completed' | 'failed';
    created_at: string;
  }>;
}
```

---

## 📁 Priority 5: File Management

### Service: filesService.ts

#### Endpoints Requeridos

```typescript
// ===== Upload =====
POST /api/files/upload
Content-Type: multipart/form-data
Body: FormData {
  file: File;
  folder?: string;
  tags?: string[] (JSON string);
}
Response: {
  file: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    thumbnail_url?: string;
    uploaded_at: string;
    uploaded_by: string;
    folder?: string;
    tags?: string[];
  };
}

POST /api/files/upload-multiple
Content-Type: multipart/form-data
Body: FormData {
  files: File[];
  folder?: string;
}
Response: {
  files: Array<FileItem>;
  total: number;
  failed: number;
}

// ===== List & Get =====
GET /api/files?folder={}&limit={}&offset={}
Response: {
  files: Array<FileItem>;
  total: number;
}

GET /api/files/:id
Response: FileItem

// ===== Download =====
GET /api/files/:id/download
Response: Blob (file content)

// ===== Delete =====
DELETE /api/files/:id
Response: {
  success: boolean;
  message: string;
}

// ===== Update =====
PATCH /api/files/:id
Body: {
  name?: string;
  folder?: string;
  tags?: string[];
}
Response: FileItem

// ===== Folders =====
GET /api/files/folders
Response: {
  folders: Array<{
    name: string;
    count: number;
  }>;
}

POST /api/files/folders
Body: {
  name: string;
}
Response: {
  success: boolean;
  folder: string;
}
```

---

## 🔔 Priority 6: Notification System

### Service: notificationsService.ts

#### WebSocket Connection

```typescript
// Conexión WebSocket
WS ws://localhost:8000/ws/notifications?token={auth_token}

// Eventos del cliente al servidor
{
  type: 'subscribe',
  channels: ['bookings', 'payments', 'system']
}

// Eventos del servidor al cliente
{
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'booking' | 'payment' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  timestamp: string;
  action_url?: string;
  action_label?: string;
  metadata?: object;
}
```

#### REST API Endpoints

```typescript
// ===== Notifications =====
GET /api/notifications?limit={}&offset={}&unread_only={}
Response: {
  notifications: Array<Notification>;
  total: number;
}

GET /api/notifications/:id
Response: Notification

PATCH /api/notifications/:id/read
Response: {
  success: boolean;
}

POST /api/notifications/mark-all-read
Response: {
  success: boolean;
  count: number;
}

DELETE /api/notifications/:id
Response: {
  success: boolean;
}

DELETE /api/notifications/read
Response: {
  success: boolean;
  count: number;
}

// ===== Statistics =====
GET /api/notifications/stats
Response: {
  total: number;
  unread: number;
  by_type: {
    [key in NotificationType]: number;
  };
  by_priority: {
    [key in NotificationPriority]: number;
  };
}

// ===== Preferences =====
GET /api/notifications/preferences
Response: {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  notification_types: {
    booking: boolean;
    payment: boolean;
    system: boolean;
    marketing: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
  };
}

PATCH /api/notifications/preferences
Body: Partial<NotificationPreferences>
Response: NotificationPreferences

// ===== Test =====
POST /api/notifications/test
Body: {
  type: NotificationType;
}
Response: {
  success: boolean;
  notification_id: string;
}
```

---

## ⚠️ Manejo de Errores

Todos los servicios implementan manejo consistente de errores:

```typescript
interface APIError {
  error: string;
  message: string;
  status: number;
  details?: any;
}

// Ejemplo de manejo
try {
  const data = await service.someMethod();
  return data;
} catch (error) {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as APIError;
    toast.error(apiError.message || 'An error occurred');
    throw apiError;
  }
  throw error;
}
```

---

## 🌐 Variables de Entorno

Crear archivo `.env` en la raíz del frontend:

```bash
# API Configuration
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws

# Stripe Configuration (opcional si se usa en frontend)
VITE_STRIPE_PUBLIC_KEY=pk_test_...

# PayPal Configuration (opcional)
VITE_PAYPAL_CLIENT_ID=...

# Feature Flags
VITE_ENABLE_AI_AGENTS=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PORTALS=true
VITE_ENABLE_PAYMENTS=true
VITE_ENABLE_FILES=true
VITE_ENABLE_NOTIFICATIONS=true
```

---

## 🧪 Testing

### Testing con Mock Data

Todos los servicios incluyen métodos `getMock*()` para testing:

```typescript
// Ejemplo: analyticsService
const mockData = analyticsService.getMockDashboardData();

// Para cambiar a datos reales, simplemente reemplaza:
// const data = service.getMockData();
// por:
// const data = await service.getData();
```

### Testing con Postman/Insomnia

Se recomienda crear colecciones con los endpoints descritos arriba para verificar la integración.

---

## 📝 Notas de Implementación

### 1. Orden de Integración Recomendado

1. **Autenticación** - Verificar login/logout funcionan
2. **Analytics** - Dashboard simple, fácil de verificar
3. **Payments** - Usar Stripe test mode
4. **Notifications** - WebSocket puede ser complejo
5. **AI Agents** - Requiere backend IA configurado
6. **Portals** - Depende de auth y payments
7. **Files** - S3 o almacenamiento local

### 2. Base URLs por Servicio

Todos los servicios usan la misma base URL con diferentes prefijos:

```typescript
const BASE_URL = 'http://localhost:8000/api';

analyticsService: `${BASE_URL}/analytics`
portalsService: `${BASE_URL}/portals`
paymentsService: `${BASE_URL}/payments`
filesService: `${BASE_URL}/files`
notificationsService: `${BASE_URL}/notifications`
aiAgentsService: `${BASE_URL}/ai-agents`
```

### 3. Headers Comunes

Todos los requests incluyen:

```typescript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {token}',
  'Accept': 'application/json'
}
```

Excepto file uploads:

```typescript
{
  'Content-Type': 'multipart/form-data',
  'Authorization': 'Bearer {token}'
}
```

---

## 🚀 Deployment

### Build para Producción

```bash
# Instalar dependencias
npm install

# Build optimizado
npm run build

# Output: frontend/build/
```

### Variables de Entorno para Producción

```bash
VITE_API_URL=https://api.spirittours.com/api
VITE_WS_URL=wss://api.spirittours.com/ws
```

---

## 📞 Soporte

Para preguntas sobre la integración:
- Revisar código fuente de los servicios en `frontend/src/services/`
- Consultar componentes en `frontend/src/components/`
- Verificar tipos TypeScript para interfaces exactas

---

**Última actualización**: 31 de Octubre, 2025
**Versión del Frontend**: 2.0.0
**Estado**: ✅ Todas las 6 prioridades implementadas y listas para integración
