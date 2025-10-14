# 🚀 PLAN DE DESARROLLO BACKEND APIS - SPIRIT TOURS
**Fecha:** 14 de Octubre, 2025  
**Duración Estimada:** 10-15 días hábiles  
**Prioridad:** CRÍTICA

---

## 📋 RESUMEN EJECUTIVO

Este documento detalla el plan de desarrollo para completar las APIs backend faltantes del sistema Spirit Tours. El frontend está 95% completo pero requiere APIs funcionales para operar.

---

## 🎯 APIS PRIORITARIAS A DESARROLLAR

### 1. 📊 GROUP QUOTATION API (3-4 días)

#### Endpoints Requeridos

```python
# Quotation Management
POST   /api/v1/quotations/group           # Crear nueva cotización grupal
GET    /api/v1/quotations/group           # Listar cotizaciones (con filtros)
GET    /api/v1/quotations/group/{id}      # Obtener detalle de cotización
PUT    /api/v1/quotations/group/{id}      # Actualizar cotización
DELETE /api/v1/quotations/group/{id}      # Cancelar cotización

# Hotel Selection & Invitations
POST   /api/v1/quotations/{id}/hotels     # Agregar hoteles a cotización
DELETE /api/v1/quotations/{id}/hotels/{hotel_id}  # Quitar hotel
POST   /api/v1/quotations/{id}/invite     # Enviar invitaciones a hoteles

# Hotel Responses
POST   /api/v1/provider/responses         # Hotel envía propuesta
PUT    /api/v1/provider/responses/{id}    # Hotel modifica propuesta (max 3)
GET    /api/v1/provider/quotations        # Hoteles ven sus cotizaciones

# Price Visibility Control
GET    /api/v1/quotations/{id}/prices     # Ver precios (con permisos)
PUT    /api/v1/quotations/{id}/visibility # Admin configura visibilidad

# Deposit & Confirmation
POST   /api/v1/quotations/{id}/deposit    # Procesar depósito
POST   /api/v1/quotations/{id}/confirm    # Confirmar cotización
GET    /api/v1/quotations/{id}/timeline   # Ver timeline de eventos
```

#### Database Schema

```sql
-- Quotations table
CREATE TABLE group_quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id INTEGER REFERENCES users(id),
    client_type VARCHAR(50), -- 'B2B', 'B2B2C', 'B2C'
    destination VARCHAR(255) NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_rooms INTEGER NOT NULL,
    total_guests INTEGER NOT NULL,
    meal_plan VARCHAR(10), -- 'RO', 'BB', 'HB', 'FB', 'AI'
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    special_requirements TEXT,
    
    -- Visibility settings
    show_prices_to_hotels BOOLEAN DEFAULT FALSE,
    admin_override_visibility BOOLEAN DEFAULT FALSE,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'draft',
    valid_until TIMESTAMP,
    can_extend BOOLEAN DEFAULT TRUE,
    extensions_count INTEGER DEFAULT 0,
    
    -- Deposit info
    deposit_required DECIMAL(10,2),
    deposit_paid DECIMAL(10,2) DEFAULT 0,
    deposit_date TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

-- Hotel invitations
CREATE TABLE quotation_hotels (
    id SERIAL PRIMARY KEY,
    quotation_id UUID REFERENCES group_quotations(id),
    hotel_id INTEGER REFERENCES hotels(id),
    invitation_sent BOOLEAN DEFAULT FALSE,
    invitation_date TIMESTAMP,
    responded BOOLEAN DEFAULT FALSE,
    response_count INTEGER DEFAULT 0,
    can_see_prices BOOLEAN DEFAULT FALSE, -- Override per hotel
    status VARCHAR(50) DEFAULT 'invited',
    UNIQUE(quotation_id, hotel_id)
);

-- Hotel responses/proposals
CREATE TABLE hotel_proposals (
    id SERIAL PRIMARY KEY,
    quotation_id UUID REFERENCES group_quotations(id),
    hotel_id INTEGER REFERENCES hotels(id),
    version_number INTEGER DEFAULT 1,
    
    -- Pricing
    room_rate DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    commission_percentage DECIMAL(5,2),
    net_price DECIMAL(12,2),
    
    -- Offer details
    included_amenities JSONB,
    special_offers TEXT,
    cancellation_policy TEXT,
    payment_terms TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    modification_count INTEGER DEFAULT 0,
    max_modifications INTEGER DEFAULT 3,
    
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    
    INDEX idx_quotation_hotel (quotation_id, hotel_id)
);

-- Quotation timeline/events
CREATE TABLE quotation_events (
    id SERIAL PRIMARY KEY,
    quotation_id UUID REFERENCES group_quotations(id),
    event_type VARCHAR(50) NOT NULL, -- 'created', 'hotel_invited', 'proposal_received', etc.
    event_data JSONB,
    actor_id INTEGER REFERENCES users(id),
    actor_type VARCHAR(50), -- 'client', 'admin', 'hotel'
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. 💰 TAX/VAT CONFIGURATION API (2 días)

#### Endpoints Requeridos

```python
# Tax Configuration
GET    /api/v1/tax/config                 # Obtener configuración global
PUT    /api/v1/tax/config                 # Actualizar configuración global

# Product/Service Tax Settings
GET    /api/v1/products/{id}/tax          # Ver config de impuestos del producto
PUT    /api/v1/products/{id}/tax          # Actualizar exención de IVA
POST   /api/v1/products/bulk-tax          # Actualización masiva

# Country-specific Settings
GET    /api/v1/tax/countries              # Listar configuración por país
PUT    /api/v1/tax/countries/{code}       # Actualizar país específico

# Tax Calculation
POST   /api/v1/tax/calculate              # Calcular impuestos para items
GET    /api/v1/tax/report                 # Reporte de impuestos
```

#### Database Schema

```sql
-- Product tax configuration
CREATE TABLE product_tax_config (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    country_code VARCHAR(3) NOT NULL,
    is_vat_exempt BOOLEAN DEFAULT FALSE,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_name VARCHAR(50), -- 'IVA', 'GST', 'Sales Tax'
    exemption_reason TEXT,
    exemption_certificate VARCHAR(255),
    
    -- Override settings
    admin_override BOOLEAN DEFAULT FALSE,
    override_date TIMESTAMP,
    override_by INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(product_id, country_code)
);

-- Tax rules by category
CREATE TABLE category_tax_rules (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id),
    country_code VARCHAR(3) NOT NULL,
    default_tax_rate DECIMAL(5,2),
    is_exempt_eligible BOOLEAN DEFAULT FALSE,
    required_documentation TEXT[],
    
    UNIQUE(category_id, country_code)
);
```

### 3. 🔔 NOTIFICATION SYSTEM API (2 días)

#### Endpoints Requeridos

```python
# Notifications
GET    /api/v1/notifications              # Listar notificaciones del usuario
POST   /api/v1/notifications              # Crear notificación
PUT    /api/v1/notifications/{id}/read    # Marcar como leída
DELETE /api/v1/notifications/{id}         # Eliminar notificación

# WebSocket Events
WS     /ws/notifications                  # Real-time notifications

# Email Templates
GET    /api/v1/notifications/templates    # Listar templates
PUT    /api/v1/notifications/templates/{id} # Actualizar template

# Preferences
GET    /api/v1/notifications/preferences  # Ver preferencias usuario
PUT    /api/v1/notifications/preferences  # Actualizar preferencias
```

### 4. 🏨 HOTEL INTEGRATION API (3 días)

#### Endpoints Requeridos

```python
# Hotel Management
POST   /api/v1/hotels                     # Registrar nuevo hotel
GET    /api/v1/hotels                     # Buscar hoteles
PUT    /api/v1/hotels/{id}               # Actualizar información

# Inventory Sync
POST   /api/v1/hotels/{id}/inventory     # Sincronizar inventario
GET    /api/v1/hotels/{id}/availability  # Consultar disponibilidad

# Rate Management  
POST   /api/v1/hotels/{id}/rates         # Actualizar tarifas
GET    /api/v1/hotels/{id}/rates         # Obtener tarifas

# PMS Integration
POST   /api/v1/integrations/pms/connect  # Conectar con PMS
GET    /api/v1/integrations/pms/status   # Estado de conexión
```

---

## 🛠️ IMPLEMENTACIÓN TÉCNICA

### Tech Stack Backend
```python
# requirements.txt
fastapi==0.104.1
sqlalchemy==2.0.23
asyncpg==0.29.0
redis==5.0.1
celery==5.3.4
pydantic==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
emails==0.6
stripe==7.1.0
boto3==1.29.7
twilio==8.10.0
```

### Estructura de Proyecto
```
backend/
├── api/
│   ├── v1/
│   │   ├── endpoints/
│   │   │   ├── quotations.py
│   │   │   ├── tax.py
│   │   │   ├── notifications.py
│   │   │   └── hotels.py
│   │   └── dependencies.py
├── core/
│   ├── config.py
│   ├── security.py
│   └── database.py
├── models/
│   ├── quotation.py
│   ├── tax.py
│   └── notification.py
├── schemas/
│   ├── quotation.py
│   ├── tax.py
│   └── notification.py
├── services/
│   ├── quotation_service.py
│   ├── tax_service.py
│   ├── notification_service.py
│   └── hotel_service.py
└── tests/
    ├── test_quotations.py
    ├── test_tax.py
    └── test_notifications.py
```

---

## 📅 CRONOGRAMA DETALLADO

### Semana 1 (Días 1-5)
**Lunes-Martes:** Group Quotation API Core
- [ ] Database schemas
- [ ] Basic CRUD endpoints
- [ ] Business logic

**Miércoles:** Hotel Selection & Visibility
- [ ] Invitation system
- [ ] Price visibility control
- [ ] Permission logic

**Jueves-Viernes:** Tax/VAT Configuration
- [ ] Product tax settings
- [ ] Country configurations
- [ ] Tax calculation engine

### Semana 2 (Días 6-10)
**Lunes-Martes:** Notification System
- [ ] WebSocket setup
- [ ] Email templates
- [ ] Real-time events

**Miércoles-Jueves:** Hotel Integrations
- [ ] PMS connectors
- [ ] Rate sync
- [ ] Inventory management

**Viernes:** Testing & Integration
- [ ] Unit tests
- [ ] Integration tests
- [ ] API documentation

### Semana 3 (Días 11-15)
**Lunes-Martes:** Frontend Integration
- [ ] Connect APIs with React
- [ ] Error handling
- [ ] Loading states

**Miércoles:** End-to-End Testing
- [ ] Full flow testing
- [ ] Bug fixes
- [ ] Performance optimization

**Jueves-Viernes:** Deployment
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Monitoring setup

---

## 📊 MÉTRICAS DE ÉXITO

### Performance KPIs
- API Response Time: < 200ms (p95)
- Database Query Time: < 50ms
- WebSocket Latency: < 100ms
- Concurrent Users: 1000+

### Business KPIs
- Quotation Creation: < 2 min
- Hotel Response Rate: > 70%
- System Uptime: 99.9%
- User Satisfaction: > 4.5/5

---

## 🔒 CONSIDERACIONES DE SEGURIDAD

1. **Authentication & Authorization**
   - JWT tokens con refresh
   - Role-based permissions
   - API rate limiting

2. **Data Protection**
   - Encryption at rest
   - HTTPS/TLS mandatory
   - PCI compliance for payments

3. **Audit & Logging**
   - All API calls logged
   - Change tracking
   - Security event monitoring

---

## 🚀 ENTREGABLES FINALES

1. **APIs Funcionales**
   - 40+ endpoints operativos
   - Documentación OpenAPI/Swagger
   - Postman collection

2. **Base de Datos**
   - Schemas optimizados
   - Índices configurados
   - Backup automation

3. **Testing**
   - 80%+ code coverage
   - Load testing results
   - Security audit report

4. **Documentación**
   - API documentation
   - Integration guides
   - Deployment manual

---

## 💡 RECOMENDACIONES

### Para Acelerar el Desarrollo
1. **Usar Boilerplate Code** - Aprovechar templates existentes
2. **Parallel Development** - Múltiples developers en diferentes APIs
3. **Mock Data** - Comenzar con datos de prueba
4. **CI/CD Pipeline** - Automatizar deploys desde día 1

### Para Garantizar Calidad
1. **Code Reviews** - Peer review obligatorio
2. **Testing First** - TDD approach
3. **Documentation** - Documentar mientras se desarrolla
4. **Monitoring** - Implementar desde el inicio

---

## 📞 EQUIPO REQUERIDO

### Mínimo (10-15 días)
- 2 Backend Developers Senior
- 1 DevOps Engineer
- 1 QA Engineer

### Óptimo (7-10 días)
- 3 Backend Developers Senior
- 1 DevOps Engineer
- 2 QA Engineers
- 1 Project Manager

---

*Plan creado el 14 de Octubre, 2025*  
*Spirit Tours Platform - Backend API Development Plan*