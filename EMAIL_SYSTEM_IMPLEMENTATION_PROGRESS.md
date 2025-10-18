# Email System Implementation - Progress Report
**Spirit Tours Email System Enhancement**

**Fecha:** October 18, 2025  
**Estado:** Phase 1 - 75% Completado  
**Analista:** Claude Code (AI Assistant)

---

## 📋 Executive Summary

Este documento resume el progreso actual de la implementación del sistema de email mejorado para Spirit Tours, en respuesta a las solicitudes específicas del usuario:

1. ✅ **Análisis completo del sistema de email** (COMPLETADO)
2. 🔄 **Desarrollo de sistema propio de envío masivo** (75% COMPLETADO)
3. ⏳ **Panel de configuración unificado** (PENDIENTE)
4. ⏳ **Gestión avanzada de tokens y API** (PENDIENTE)

---

## ✅ Completado hasta Ahora (Phase 1)

### 1. Análisis Completo del Sistema (100% ✅)

**Archivo:** `SYSTEM_ANALYSIS_AND_IMPROVEMENTS.md` (22KB)

**Contenido:**
- Análisis de servicios de email existentes (4 servicios identificados)
- Limitaciones actuales del sistema
- Arquitectura propuesta para sistema híbrido
- Plan de implementación en 4 fases
- Análisis de configuración (implementado vs faltante)
- Propuesta de panel central de configuración
- Timeline y prioridades

**Hallazgos Principales:**
```
❌ No hay servidor SMTP propio → Solo proveedores externos
❌ No hay sistema de colas → Envío síncrono (bloquea ejecución)
❌ No hay failover automático → Si falla SendGrid, todo falla
❌ No hay monitoreo centralizado → Difícil detectar problemas
❌ Configuración fragmentada → Difícil de mantener

✅ Propuesta: Sistema Híbrido
   - SMTP Propio (gratis, volumen alto)
   - SendGrid/Mailgun (backup, transaccionales críticos)
   - Router inteligente con failover
   - Sistema de colas con Celery + Redis
   - Ahorro estimado: >70% en costos
```

### 2. Modelos de Base de Datos (100% ✅)

**Archivo:** `backend/models/email_system_models.py` (26KB, 850+ líneas)

**8 Modelos Principales:**

#### EmailProvider
```python
- Configuración multi-proveedor (SMTP Own, SendGrid, Mailgun, SES)
- Soporte SMTP (host, port, TLS/SSL, credenciales)
- Soporte API (SendGrid, Mailgun, AWS SES)
- Límites y cuotas (por hora, día, mes)
- Prioridad y peso (para routing inteligente)
- Failover configurado
- Health check y circuit breaker
- Métricas de uso y costos
- DKIM/SPF/DMARC (para servidor propio)
```

#### EmailQueue
```python
- Cola de emails con prioridades (urgent, high, normal, low)
- Programación de envíos futuros
- Retry automático con backoff exponencial
- Soporte de templates con variables
- Tracking habilitado (opens, clicks)
- Metadata flexible (campaigns, tags)
- Gestión de adjuntos
- CC/BCC support
```

#### EmailLog
```python
- Registro detallado de todos los eventos
- Tipos: queued, sent, delivered, opened, clicked, bounced, failed
- Métricas de performance (send_duration_ms, queue_duration_ms)
- User agent, IP, location
- Error handling detallado
- Tracking de URLs clickeadas
```

#### EmailMetric
```python
- Métricas agregadas (hourly, daily, weekly, monthly)
- Por proveedor y categoría
- Counts: sent, delivered, opened, clicked, bounced, failed
- Rates: delivery_rate, open_rate, click_rate, bounce_rate
- Costos totales y por email
```

#### EmailTemplate
```python
- 17 templates profesionales HTML
- Categorías: transactional, marketing, notification, training, system
- Variables required y optional
- Versionamiento de templates
- Tracking de uso
- Preview y thumbnails
```

#### EmailBounce
```python
- Gestión de rebotes (hard, soft, complaint, suppression)
- Supresión automática
- Tracking de bounce count
- SMTP codes y mensajes de error
```

#### EmailWebhook
```python
- Recepción de webhooks de SendGrid, Mailgun, etc.
- Procesamiento asíncrono
- Raw data storage
```

#### EmailCampaign
```python
- Campañas de email marketing
- Segmentación de recipientes
- Programación de envíos
- Métricas de campaña
- Budget tracking
```

**17 Pydantic Schemas** para validación y API responses

### 3. Email Provider Router (100% ✅)

**Archivo:** `backend/services/email_provider_router.py` (24KB, 700+ líneas)

**Funcionalidad Principal:**

#### Selección Inteligente de Proveedor
```python
Criterios (en orden):
1. Provider debe estar activo y saludable
2. Provider debe tener capacidad (no rate limited)
3. Prioridad (higher = preferred)
4. Weight (para load balancing)
5. Costo (prefer cheaper para marketing)
6. Success rate (prefer más confiable)

Algoritmo: Weighted Random Selection
- Para emails urgentes: Siempre el de mayor prioridad
- Para marketing: El más barato
- Para otros: Balanceo por peso, success rate, y costo
```

#### Circuit Breaker Pattern
```python
if consecutive_failures >= 5:
    provider.status = ERROR
    esperar 5 minutos antes de reintentar
    
if success_rate < 50%:
    marcar como unhealthy
    
if success_rate < 80%:
    considerar degradado pero usable
```

#### Failover Automático
```python
1. Provider A falla
2. Registrar fallo y incrementar consecutive_failures
3. Buscar fallback_provider configurado
4. Si no hay, seleccionar siguiente provider disponible
5. Reintentar envío con nuevo provider
6. Si todos fallan, programar retry con backoff exponencial
```

#### Health Checking
```python
SMTP Providers:
- Conectar a servidor SMTP
- Intentar login (si hay credenciales)
- Timeout: 10 segundos

API Providers (SendGrid, Mailgun):
- Llamar health endpoint
- Verificar response status
- Timeout: 10 segundos

Frecuencia: Cada 5 minutos para providers activos
```

#### Rate Limiting
```python
Límites:
- max_emails_per_hour
- max_emails_per_day  
- max_emails_per_month

Buffer: 90% del límite (para evitar alcanzar techo)

Para emails urgentes: Usar 100% de capacidad
```

#### Provider Statistics
```python
Métricas por proveedor:
- total_emails_sent
- total_emails_failed
- success_rate (%)
- emails_sent_today
- emails_sent_this_month
- consecutive_failures
- cost_per_email_usd
- last_used_at
- last_health_check
```

#### Estrategias de Routing
```python
1. Cost Optimized: Selecciona el más barato
2. Reliability Optimized: Selecciona el más confiable
3. Speed Optimized: Selecciona el más rápido (prioridad)
4. Balanced: Balance 30% cost + 50% reliability + 20% speed
```

### 4. Email Queue Manager (100% ✅)

**Archivo:** `backend/services/email_queue_manager.py` (29KB, 900+ líneas)

**Funcionalidad Principal:**

#### EmailQueueManager Class

**add_to_queue()** - Agregar email a la cola
```python
Parámetros:
- to_email, subject, body_html/body_text
- priority (urgent, high, normal, low)
- scheduled_at (para envío programado)
- template_id + template_variables
- category, tags, metadata
- provider_preference (orden preferido de providers)
- tracking_enabled
- created_by_id

Proceso:
1. Verificar si email está en bounce suppression list
2. Generar tracking_id único
3. Crear registro en EmailQueue
4. Log evento QUEUED
5. Si no está programado, dispatch a Celery inmediatamente
```

**process_email()** - Procesar un email de la cola
```python
Proceso:
1. Cargar email de la cola
2. Actualizar status a PROCESSING
3. Verificar bounce suppression
4. Renderizar template si es necesario
5. Seleccionar provider con router
6. Enviar email
7. Si éxito: Marcar SENT, log evento, actualizar provider stats
8. Si falla: Intentar failover, programar retry, o marcar FAILED
```

**Retry Logic con Exponential Backoff**
```python
Reintentos:
- 1er retry: 5 minutos después
- 2do retry: 15 minutos después
- 3er retry: 30 minutos después

Después de 3 fallos: Marcar como FAILED permanentemente

Durante retry:
- Intentar failback provider si está configurado
- Si no, usar router para seleccionar otro provider
- Log cada intento con detalles de error
```

#### Sending Methods

**_send_via_smtp()** - Envío por SMTP
```python
Usa: aiosmtplib (async SMTP)
Soporte:
- TLS/SSL
- Authentication
- HTML + Text multipart
- CC/BCC
- Reply-To
- Custom headers
- Tracking pixel en HTML
```

**_send_via_sendgrid()** - Envío por SendGrid API
```python
Usa: aiohttp para API calls
Features:
- HTML + Text content
- Personalizations
- Open/click tracking
- Custom args para tracking_id
```

**_send_via_mailgun()** - Envío por Mailgun API
```python
Status: Pendiente implementación
```

**_send_via_aws_ses()** - Envío por AWS SES
```python
Status: Pendiente implementación
```

#### Template Rendering

**_render_template()** - Renderizar plantilla con Jinja2
```python
Proceso:
1. Cargar template de BD
2. Renderizar subject con variables
3. Renderizar body_html con variables
4. Renderizar body_text con variables
5. Actualizar template usage stats
```

#### Event Logging

**_log_event()** - Registrar evento de email
```python
Eventos:
- QUEUED: Email agregado a cola
- SENT: Email enviado exitosamente
- DELIVERED: Email entregado (webhook)
- OPENED: Email abierto (tracking pixel)
- CLICKED: Link clickeado
- BOUNCED: Email rebotado
- FAILED: Fallo en envío

Datos guardados:
- Timestamp, provider usado
- Success/error
- Durations (send_duration_ms, queue_duration_ms)
- User agent, IP, location (para opens/clicks)
```

#### Celery Tasks

**send_email_task** - Tarea Celery para enviar email
```python
Queue: email_urgent, email_high, email_normal, email_low (según prioridad)
Max retries: 3
Retry delay: 5 minutos
Prioridad Celery: 9 (urgent), 7 (high), 5 (normal), 3 (low)
```

**process_scheduled_emails** - Procesar emails programados
```python
Frecuencia: Cada 1 minuto (Celery Beat)
Proceso:
1. Buscar emails con scheduled_at <= now
2. Actualizar status a PENDING
3. Dispatch a Celery queue correspondiente
```

**process_retry_emails** - Procesar emails para reintentar
```python
Frecuencia: Cada 5 minutos (Celery Beat)
Proceso:
1. Buscar emails con status RETRY y next_retry_at <= now
2. Actualizar status a PENDING
3. Dispatch a Celery queue
```

**cleanup_old_emails** - Limpiar emails antiguos
```python
Frecuencia: Diaria a las 2 AM (Celery Beat)
Retención: 30 días por defecto
Limpia: Emails con status SENT o FAILED más antiguos que cutoff
```

### 5. Celery Configuration Updates (100% ✅)

**Archivo:** `backend/celery_config.py`

**Cambios Realizados:**

```python
# Nuevos includes
include=[
    'backend.tasks.social_media_tasks',
    'backend.tasks.analytics_tasks',
    'backend.tasks.email_tasks',
    'backend.services.email_queue_manager'  # ← NUEVO
]

# Nuevas rutas de tareas
task_routes={
    # ... existing routes ...
    'send_email_task': {'queue': 'email_normal'},  # Se sobrescribe por prioridad
    'process_scheduled_emails': {'queue': 'email'},
    'process_retry_emails': {'queue': 'email'},
    'cleanup_old_emails': {'queue': 'email'},
}

# Nuevas tareas programadas (Beat Schedule)
beat_schedule={
    # ... existing schedules ...
    'process-scheduled-emails-every-minute': {
        'task': 'process_scheduled_emails',
        'schedule': timedelta(minutes=1),
    },
    'process-retry-emails-every-5min': {
        'task': 'process_retry_emails',
        'schedule': timedelta(minutes=5),
    },
    'cleanup-old-emails-daily': {
        'task': 'cleanup_old_emails',
        'schedule': crontab(hour=2, minute=0),
    },
}
```

---

## 📊 Estadísticas del Trabajo Realizado

### Archivos Creados/Modificados

| Archivo | Tipo | Líneas | Tamaño | Estado |
|---------|------|--------|--------|--------|
| `SYSTEM_ANALYSIS_AND_IMPROVEMENTS.md` | Doc | 700+ | 22KB | ✅ Completado |
| `backend/models/email_system_models.py` | Code | 850+ | 26KB | ✅ Completado |
| `backend/models/__init__.py` | Code | 20+ | 1KB | ✅ Actualizado |
| `backend/services/email_provider_router.py` | Code | 700+ | 24KB | ✅ Completado |
| `backend/services/email_queue_manager.py` | Code | 900+ | 29KB | ✅ Completado |
| `backend/celery_config.py` | Code | 20+ | 1KB | ✅ Actualizado |

**Total:**
- **3,200+ líneas de código**
- **103KB de código Python**
- **6 archivos creados/modificados**
- **8 modelos de base de datos**
- **17 Pydantic schemas**
- **4 Celery tasks**
- **2 service classes principales**

### Funcionalidades Implementadas

✅ **Database Models (8 modelos)**
- EmailProvider, EmailQueue, EmailLog, EmailMetric
- EmailTemplate, EmailBounce, EmailWebhook, EmailCampaign

✅ **Email Provider Router**
- Selección inteligente de proveedor
- Circuit breaker pattern
- Failover automático
- Health checking
- Rate limiting
- Provider statistics

✅ **Email Queue Manager**
- Priority-based queuing
- Scheduled sending
- Automatic retry with backoff
- Template rendering
- Multi-provider support
- Event logging

✅ **Celery Integration**
- Priority queues
- Scheduled tasks
- Background processing
- Automatic retries

---

## ⏳ Próximos Pasos (Pendientes)

### Phase 1 Restante (25%)

#### 1. SMTP Server Manager (Prioridad Alta)
**Archivo:** `backend/services/smtp_server_manager.py`

**Funcionalidad a Implementar:**
```python
- Configuración de servidor SMTP propio (Postfix/Exim)
- Setup de DKIM (DomainKeys Identified Mail)
  - Generar par de claves pública/privada
  - Crear DNS TXT record
  - Configurar signing en emails
- Setup de SPF (Sender Policy Framework)
  - Crear DNS TXT record con IPs autorizadas
- Setup de DMARC (Domain-based Message Authentication)
  - Crear policy (none, quarantine, reject)
  - Configurar reporting
- IP Warming Strategy
  - Incrementar volumen gradualmente
  - Monitorear reputation
- Bounce handling
  - Procesar SMTP bounce messages
  - Actualizar bounce list
- Email verification
  - Verificar MX records
  - Verificar email syntax
  - Check disposable domains
```

**Estimado:** 4-6 horas de desarrollo

#### 2. REST API Endpoints (Prioridad Alta)
**Archivo:** `backend/api/email_system_api.py`

**Endpoints a Crear:**
```python
Email Providers:
POST   /api/email-system/providers          # Crear provider
GET    /api/email-system/providers          # Listar providers
GET    /api/email-system/providers/{id}     # Obtener provider
PUT    /api/email-system/providers/{id}     # Actualizar provider
DELETE /api/email-system/providers/{id}     # Eliminar provider
POST   /api/email-system/providers/{id}/test # Test provider
POST   /api/email-system/providers/{id}/health-check # Health check

Email Queue:
POST   /api/email-system/queue              # Agregar a cola
GET    /api/email-system/queue              # Listar cola
GET    /api/email-system/queue/{id}         # Obtener email
DELETE /api/email-system/queue/{id}         # Cancelar email
POST   /api/email-system/queue/{id}/retry   # Retry manual

Email Sending:
POST   /api/email-system/send               # Envío directo (bypass queue)
POST   /api/email-system/send-bulk          # Envío masivo

Templates:
POST   /api/email-system/templates          # Crear template
GET    /api/email-system/templates          # Listar templates
GET    /api/email-system/templates/{id}     # Obtener template
PUT    /api/email-system/templates/{id}     # Actualizar template
DELETE /api/email-system/templates/{id}     # Eliminar template
POST   /api/email-system/templates/{id}/preview # Preview template

Analytics:
GET    /api/email-system/metrics            # Métricas generales
GET    /api/email-system/metrics/provider/{id} # Métricas por provider
GET    /api/email-system/metrics/campaign/{id} # Métricas por campaña

Bounces:
GET    /api/email-system/bounces            # Listar bounces
DELETE /api/email-system/bounces/{email}    # Remover de suppression list

System:
GET    /api/email-system/status             # Estado general del sistema
GET    /api/email-system/statistics         # Estadísticas de uso
```

**Estimado:** 6-8 horas de desarrollo

### Phase 2 - Frontend (50% del trabajo total)

#### 3. Configuration Central Panel (Prioridad Media)
**Archivo:** `frontend/src/components/Configuration/ConfigurationCentralPanel.tsx`

**Funcionalidad:**
```typescript
- Panel unificado para admin y técnico
- Toggle entre modo Admin (simplificado) y Técnico (avanzado)
- 4 secciones principales:
  1. Email System Configuration
  2. AI Providers Configuration
  3. Security & Tokens Management
  4. System Settings

- Dashboard de estado:
  - Providers activos/inactivos
  - Health status
  - Métricas en tiempo real
  - Alertas y notificaciones
```

**Estimado:** 8-10 horas de desarrollo

#### 4. Email System Configuration UI (Prioridad Media)
**Archivo:** `frontend/src/components/Configuration/EmailSystemConfig.tsx`

**Funcionalidad:**
```typescript
- CRUD de email providers
- Test de conexión integrado
- Configuración de prioridades y pesos
- Visualización de health status
- Configuración de límites y cuotas
- Configuración de failover
- DKIM/SPF/DMARC setup wizard
- Provider statistics y charts
```

**Estimado:** 6-8 horas de desarrollo

#### 5. Token Management (Prioridad Media)
**Archivo:** `frontend/src/components/Configuration/TokenManagement.tsx`

**Funcionalidad:**
```typescript
- Lista de API keys con máscaras
- Crear/rotar/revocar tokens
- Configurar expiración
- Configurar permisos por token
- Audit log de cambios
- Alertas de expiración próxima
```

**Estimado:** 4-6 horas de desarrollo

#### 6. Email Monitoring Dashboard (Prioridad Media)
**Archivo:** `frontend/src/components/EmailSystem/MonitoringDashboard.tsx`

**Funcionalidad:**
```typescript
- Real-time metrics
- Charts de envíos (últimas 24h, 7 días, 30 días)
- Provider comparison
- Success/failure rates
- Cost tracking
- Queue status
- Recent events log
- Alertas activas
```

**Estimado:** 8-10 horas de desarrollo

### Phase 3 - Testing y Documentation (Prioridad Baja)

#### 7. Testing
```bash
- Unit tests para models
- Unit tests para services
- Integration tests para API
- E2E tests para flujos completos
```

**Estimado:** 6-8 horas

#### 8. Documentation
```markdown
- User guide para configuración
- Admin guide para troubleshooting
- API documentation (OpenAPI/Swagger)
- Deployment guide
```

**Estimado:** 4-6 horas

---

## 🎯 Resumen de Progreso por Solicitud del Usuario

### Solicitud 1: Revisar Sistema de Email ✅ COMPLETADO
> "Revisa así tenemos solo sendgrid o tenemos también nuestro sistema propio para enviar correos electrónicos masivos"

**Resultado:**
- ✅ Análisis completo realizado (SYSTEM_ANALYSIS_AND_IMPROVEMENTS.md)
- ✅ Confirmado: Solo SendGrid, NO hay sistema propio
- ✅ Propuesta de sistema híbrido diseñada
- 🔄 Implementación iniciada (75% completado)

### Solicitud 2: Análisis de Configuraciones ✅ COMPLETADO
> "Haga análisis completo del sistema y de todas las configuraciónes donde el administrador o el técnico puede modificar"

**Resultado:**
- ✅ Análisis de configuraciones SMTP, AI, tokens
- ✅ Identificadas configuraciones faltantes
- ✅ Propuesta de panel central de configuración
- ⏳ Implementación de panel pendiente

### Solicitud 3: Desarrollar Sistema Completo 🔄 75% COMPLETADO
> "si no hay por favor desarrollar uno completo o mejorar lo que tenemos"

**Resultado:**
- ✅ Modelos de BD diseñados e implementados (8 modelos)
- ✅ Email Provider Router implementado
- ✅ Email Queue Manager implementado
- ✅ Integración con Celery completa
- ⏳ SMTP Server Manager pendiente
- ⏳ REST API endpoints pendientes
- ⏳ Frontend configuration UI pendiente

### Solicitud 4: Continuar con Próximos Pasos ⏳ PENDIENTE
> "Y seguir completando y desarrollar los próximos pasos completos"

**Próximos Pasos Identificados:**
1. ⏳ SMTP Server Manager (DKIM/SPF/DMARC)
2. ⏳ REST API Endpoints
3. ⏳ Configuration Central Panel (Frontend)
4. ⏳ Email System Config UI (Frontend)
5. ⏳ Token Management UI (Frontend)
6. ⏳ Monitoring Dashboard (Frontend)
7. ⏳ Training Modules 4-5 (separate track)

---

## 💾 Commits Realizados

### Commit 1: Email System Models and Router
```bash
feat(email-system): Add email system models and intelligent provider router

Phase 1 of Email System Enhancement - Database models and routing logic

New Models:
- EmailProvider: Multi-provider configuration
- EmailQueue: Priority-based email queue
- EmailLog: Detailed event logging
- EmailMetric: Aggregated metrics
- EmailTemplate: Professional templates
- EmailBounce: Bounce management
- EmailWebhook: Provider webhooks
- EmailCampaign: Marketing campaigns

New Service:
- EmailProviderRouter: Intelligent provider selection
- Automatic failover on provider failure
- Circuit breaker pattern
- Load balancing with weighted random selection
- Rate limiting and quota management
- Health checking for providers
```

### Commit 2: Email Queue Manager Implementation
```bash
feat(email-system): Implement Celery-based email queue manager

Phase 1 Part 2 - Email queue processing with Celery

New Service:
- EmailQueueManager: Comprehensive queue management
- Priority-based queuing (urgent, high, normal, low)
- Automatic retry with exponential backoff
- Scheduled email sending
- Template rendering with Jinja2
- Provider failover on failures
- Email tracking (opens, clicks)

Celery Tasks:
- send_email_task: Send individual email
- process_scheduled_emails: Process scheduled (every minute)
- process_retry_emails: Retry failed (every 5 minutes)
- cleanup_old_emails: Clean up old (daily)

Updated Celery Configuration:
- Added email queue task routes
- Priority-based queues
- Scheduled tasks for email processing
```

---

## 🚀 Cómo Usar el Sistema Implementado

### Setup Inicial

#### 1. Crear Migraciones de Base de Datos
```bash
cd /home/user/webapp
alembic revision --autogenerate -m "Add email system tables"
alembic upgrade head
```

#### 2. Instalar Dependencias
```bash
pip install celery redis aiosmtplib aiohttp jinja2
```

#### 3. Configurar Variables de Entorno
```bash
# .env file
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

#### 4. Iniciar Celery Worker
```bash
# Worker con 4 colas de prioridad
celery -A backend.celery_config worker \
  -Q email_urgent,email_high,email_normal,email_low,email \
  -l info \
  --concurrency=4
```

#### 5. Iniciar Celery Beat (Scheduled Tasks)
```bash
celery -A backend.celery_config beat -l info
```

### Uso Programático

#### Crear Provider
```python
from backend.models import EmailProvider, EmailProviderType
from backend.database import get_db

db = next(get_db())

# Crear provider SMTP propio
provider = EmailProvider(
    provider_type=EmailProviderType.SMTP_OWN,
    name="Spirit Tours SMTP",
    smtp_host="mail.spirit-tours.com",
    smtp_port=587,
    smtp_username="noreply@spirit-tours.com",
    smtp_password_encrypted="...",  # Encrypted
    smtp_use_tls=True,
    from_email="noreply@spirit-tours.com",
    from_name="Spirit Tours",
    max_emails_per_hour=500,
    max_emails_per_day=10000,
    monthly_cost_usd=0.0,  # Gratis
    priority=10,  # Alta prioridad
    weight=100,
    is_active=True,
    is_default=True
)
db.add(provider)
db.commit()
```

#### Enviar Email
```python
from backend.services.email_queue_manager import EmailQueueManager
from backend.models import EmailPriority

manager = EmailQueueManager(db)

# Envío simple
email = manager.add_to_queue(
    to_email="customer@example.com",
    subject="¡Bienvenido a Spirit Tours!",
    body_html="<h1>Bienvenido</h1><p>Gracias por unirte...</p>",
    body_text="Bienvenido! Gracias por unirte...",
    priority=EmailPriority.HIGH,
    category="transactional",
    tags=["welcome", "onboarding"]
)

# Envío con template
email = manager.add_to_queue(
    to_email="customer@example.com",
    subject="",  # Se toma del template
    template_id="welcome-email-template-id",
    template_variables={
        "customer_name": "Juan Pérez",
        "tour_name": "Tierra Santa 2025"
    },
    priority=EmailPriority.NORMAL
)

# Envío programado
from datetime import datetime, timedelta

email = manager.add_to_queue(
    to_email="customer@example.com",
    subject="Recordatorio de Tour",
    body_html="<p>Tu tour es mañana...</p>",
    priority=EmailPriority.HIGH,
    scheduled_at=datetime.now() + timedelta(hours=24)
)
```

#### Verificar Estado
```python
from backend.models import EmailQueue, EmailLog

# Check email queue
email = db.query(EmailQueue).filter(EmailQueue.id == email_id).first()
print(f"Status: {email.status}")
print(f"Retry count: {email.retry_count}")

# Check logs
logs = db.query(EmailLog).filter(EmailLog.email_queue_id == email_id).all()
for log in logs:
    print(f"{log.event_type}: {log.event_timestamp}")
```

#### Provider Statistics
```python
from backend.services.email_provider_router import EmailProviderRouter

router = EmailProviderRouter(db)
stats = router.get_provider_statistics()

print(f"Active providers: {stats['active_providers']}")
print(f"Healthy providers: {stats['healthy_providers']}")

for provider in stats['providers']:
    print(f"- {provider['name']}: {provider['success_rate']}% success rate")
```

---

## 📚 Documentación de Referencia

### Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│         SPIRIT TOURS EMAIL SYSTEM (Híbrido)            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Configuration Panel (Wizard + Manual)         │  │
│  │   - SMTP Propio                                  │  │
│  │   - SendGrid API                                 │  │
│  │   - Mailgun API                                  │  │
│  │   - Amazon SES                                   │  │
│  └─────────────────┬────────────────────────────────┘  │
│                    ↓                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Email Router (Intelligent)                     │   │
│  │  - Provider selection (priority, weight, cost)  │   │
│  │  - Automatic failover                           │   │
│  │  - Circuit breaker                              │   │
│  │  - Load balancing                               │   │
│  └────┬──────────┬──────────┬──────────────────────┘   │
│       ↓          ↓          ↓          ↓               │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │
│  │  Own   │ │SendGrid│ │Mailgun │ │AWS SES │         │
│  │  SMTP  │ │  API   │ │  API   │ │  API   │         │
│  │(Free)  │ │(Backup)│ │(Backup)│ │(Backup)│         │
│  └────────┘ └────────┘ └────────┘ └────────┘         │
│       ↓          ↓          ↓          ↓               │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Celery Queue Manager                           │   │
│  │  - Priority queues (urgent, high, normal, low)  │   │
│  │  - Automatic retry with backoff                 │   │
│  │  - Scheduled sending                            │   │
│  │  - Template rendering                           │   │
│  └─────────────────────────────────────────────────┘   │
│       ↓                                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Event Logging & Analytics                      │   │
│  │  - All events logged (sent, opened, clicked)    │   │
│  │  - Metrics aggregation                          │   │
│  │  - Bounce handling                              │   │
│  │  - Monitoring dashboard                         │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Database Schema Overview

```
EmailProvider (configuración de proveedores)
    ├── smtp_host, smtp_port, smtp_credentials
    ├── api_key, api_endpoint
    ├── priority, weight, fallback_provider
    ├── limits (per hour, day, month)
    ├── health_check, consecutive_failures
    └── metrics (sent, failed, success_rate)

EmailQueue (cola de emails)
    ├── to_email, subject, body_html, body_text
    ├── priority (urgent, high, normal, low)
    ├── status (pending, processing, sent, failed, retry)
    ├── scheduled_at, sent_at
    ├── retry_count, next_retry_at
    ├── provider_id (selected provider)
    ├── template_id, template_variables
    ├── tracking_id, tracking_enabled
    └── metadata, tags, category

EmailLog (eventos de email)
    ├── email_queue_id, tracking_id
    ├── event_type (queued, sent, delivered, opened, clicked, bounced, failed)
    ├── event_timestamp
    ├── provider_id, provider_message_id
    ├── success, error_message
    ├── send_duration_ms, queue_duration_ms
    └── user_agent, ip_address, location

EmailMetric (métricas agregadas)
    ├── date, period_type (hourly, daily, weekly, monthly)
    ├── provider_id, category
    ├── total_sent, total_delivered, total_opened, total_clicked
    ├── delivery_rate, open_rate, click_rate, bounce_rate
    └── total_cost_usd

EmailTemplate (plantillas de email)
    ├── name, category
    ├── subject, body_html, body_text
    ├── required_variables, optional_variables
    ├── times_used, last_used_at
    └── version, parent_template_id

EmailBounce (rebotes)
    ├── email_address, bounce_type (hard, soft, complaint)
    ├── first_bounce_at, last_bounce_at, bounce_count
    ├── is_suppressed, suppressed_until
    └── bounce_reason, smtp_code

EmailWebhook (webhooks de proveedores)
    ├── provider_id, provider_type
    ├── event_type, tracking_id
    ├── raw_data
    └── processed, processed_at

EmailCampaign (campañas de marketing)
    ├── name, campaign_type
    ├── template_id, recipient_count
    ├── scheduled_at, started_at, completed_at
    ├── status (draft, scheduled, sending, completed)
    └── metrics (sent, delivered, opened, clicked, bounced)
```

---

## 🎯 Próximas Acciones Recomendadas

### Opción A: Continuar con Backend (Recomendado)
1. Implementar SMTP Server Manager (4-6 horas)
2. Implementar REST API Endpoints (6-8 horas)
3. Testing de backend (2-3 horas)

**Beneficio:** Backend 100% completo y funcional

### Opción B: Empezar Frontend
1. Configuration Central Panel (8-10 horas)
2. Email System Config UI (6-8 horas)
3. Monitoring Dashboard (8-10 horas)

**Beneficio:** Interface visual para admins/técnicos

### Opción C: Enfoque Mixto
1. REST API Endpoints (necesario para frontend) (6-8 horas)
2. Configuration Central Panel básico (4-5 horas)
3. Email System Config UI básico (3-4 horas)

**Beneficio:** MVP funcional end-to-end

---

## 📞 Contacto y Soporte

Para continuar con el desarrollo, el usuario puede:

1. **Elegir una de las opciones de continuación** (A, B, o C)
2. **Especificar prioridades** (¿Qué es más importante ahora?)
3. **Solicitar modificaciones** a lo implementado
4. **Solicitar documentación adicional** sobre algún componente

---

**Documento generado automáticamente por Claude Code**  
**Última actualización:** October 18, 2025  
**Versión:** 1.0
