# 🎓 Spirit Tours - ERP Hub Training Guide USA

**Versión:** 1.0.0  
**Fecha:** Noviembre 2025  
**Audiencia:** Equipo Spirit Tours USA  
**Duración:** 2 días (16 horas)  

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Módulo 1: Fundamentos del ERP Hub](#módulo-1-fundamentos-del-erp-hub)
3. [Módulo 2: QuickBooks USA Integration](#módulo-2-quickbooks-usa-integration)
4. [Módulo 3: Xero USA Integration](#módulo-3-xero-usa-integration)
5. [Módulo 4: FreshBooks Integration](#módulo-4-freshbooks-integration)
6. [Módulo 5: Panel de Administración React](#módulo-5-panel-de-administración-react)
7. [Módulo 6: Workflows de Operación](#módulo-6-workflows-de-operación)
8. [Módulo 7: Troubleshooting y Soporte](#módulo-7-troubleshooting-y-soporte)
9. [Módulo 8: Mejores Prácticas](#módulo-8-mejores-prácticas)
10. [Evaluación y Certificación](#evaluación-y-certificación)

---

## Introducción

### Objetivos del Training

Al finalizar este training, los participantes podrán:

- ✅ Entender la arquitectura del ERP Hub y su integración con Spirit Tours
- ✅ Conectar y configurar ERPs USA (QuickBooks, Xero, FreshBooks)
- ✅ Sincronizar customers, invoices y payments desde Spirit Tours hacia los ERPs
- ✅ Utilizar el panel de administración React para monitoreo y configuración
- ✅ Resolver problemas comunes de sincronización
- ✅ Aplicar mejores prácticas de operación

### Prerequisitos

- Conocimiento básico de contabilidad y facturación
- Acceso al sistema Spirit Tours (sucursal USA)
- Credenciales de administrador ERP Hub
- Cuenta sandbox de QuickBooks Online (se proporcionará)

---

## Módulo 1: Fundamentos del ERP Hub

**Duración:** 2 horas

### 1.1 ¿Qué es el ERP Hub?

El ERP Hub es una plataforma de integración que conecta Spirit Tours con múltiples sistemas ERP contables, permitiendo:

```
┌─────────────────┐
│  Spirit Tours   │
│   (Reservas)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    ERP Hub      │  ◄─── Capa de Integración
│  (Middleware)   │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌─────────┐ ┌──────┐ ┌──────────┐ ...
│QuickBooks│ │ Xero │ │FreshBooks│
└─────────┘ └──────┘ └──────────┘
```

**Beneficios:**
- ✅ Sincronización automática de facturas
- ✅ Eliminación de entrada manual de datos
- ✅ Reducción de errores contables
- ✅ Visibilidad en tiempo real
- ✅ Soporte para múltiples ERPs simultáneamente

### 1.2 Arquitectura del Sistema

```javascript
// Flujo de Sincronización
Spirit Tours → ERP Hub → Adapter Pattern → ERP API

// Componentes principales:
1. Unified Models (modelos estandarizados)
2. Adapters (QuickBooks, Xero, FreshBooks)
3. Sync Service (orquestador de sincronización)
4. Queue System (manejo de trabajos asíncronos)
5. Webhook Listeners (eventos desde ERPs)
```

### 1.3 Conceptos Clave

#### Unified Models

Modelos estandarizados que representan entidades contables:

```javascript
UnifiedCustomer {
    displayName: string
    email: string
    phone: string
    taxId: string  // EIN/SSN en USA
    billingAddress: Address
    shippingAddress: Address
}

UnifiedInvoice {
    invoiceNumber: string
    erpCustomerId: string
    date: date
    dueDate: date
    lineItems: LineItem[]
    status: 'draft' | 'unpaid' | 'paid'
}

UnifiedPayment {
    erpInvoiceId: string
    amount: number
    paymentDate: date
    paymentMethod: string
    reference: string
}
```

#### Adapter Pattern

Cada ERP tiene un adapter específico que:
1. Traduce Unified Models → Formato ERP
2. Maneja autenticación OAuth 2.0
3. Implementa rate limiting
4. Gestiona errores y reintentos

#### Sincronización Bidireccional

```
Spirit Tours → ERP (Push)
- Customers: Cuando se crea una reserva
- Invoices: Cuando se factura una reserva
- Payments: Cuando se registra un pago

ERP → Spirit Tours (Pull)
- Invoice Status: Actualización de estado
- Payment Status: Confirmación de pago
- Customer Updates: Cambios en datos del cliente
```

### 1.4 Hands-On: Explorar la Base de Datos

**Ejercicio práctico:** Conectarse a la base de datos y explorar las tablas del ERP Hub.

```sql
-- Ver configuraciones de ERP por sucursal
SELECT * FROM erp_configs WHERE sucursal_id = 'USA_001';

-- Ver sincronizaciones recientes
SELECT * FROM erp_sync_logs 
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 20;

-- Ver mapeos de cuentas contables
SELECT * FROM erp_account_mappings 
WHERE sucursal_id = 'USA_001';
```

**Checkpoint:** Los participantes deben poder explicar:
- ¿Qué es un Unified Model?
- ¿Qué hace un adapter?
- ¿Cuál es el flujo de sincronización?

---

## Módulo 2: QuickBooks USA Integration

**Duración:** 3 horas

### 2.1 Introducción a QuickBooks Online

QuickBooks Online (QBO) es el ERP más popular en USA para pequeñas y medianas empresas.

**Características principales:**
- Cloud-based, accesible desde cualquier lugar
- Integración bancaria automática
- Reportes financieros en tiempo real
- Mobile app para iOS/Android

### 2.2 OAuth 2.0 Authentication Flow

QuickBooks utiliza OAuth 2.0 para autenticación segura:

```
1. Usuario hace clic en "Conectar QuickBooks" en Spirit Tours
   ↓
2. Redirect a QuickBooks login page
   ↓
3. Usuario autoriza Spirit Tours a acceder a su cuenta
   ↓
4. QuickBooks devuelve authorization code
   ↓
5. Spirit Tours intercambia code por access_token + refresh_token
   ↓
6. Access token se usa para llamadas API (válido 1 hora)
   ↓
7. Refresh token se usa para renovar access token (válido 100 días)
```

### 2.3 Conectar QuickBooks desde el Panel Admin

**Paso a paso:**

1. Navegar a `Admin Panel → ERP Connections`
2. Clic en botón `+ Connect New ERP`
3. Seleccionar `QuickBooks Online USA`
4. Ingresar información de sucursal:
   - Sucursal ID: `USA_001`
   - Company Name: `Spirit Tours Miami`
   - Environment: `Production` (o `Sandbox` para testing)
5. Clic en `Authorize with QuickBooks`
6. En ventana popup:
   - Ingresar credenciales de QuickBooks
   - Seleccionar company si tienes múltiples
   - Hacer clic en `Connect`
7. Confirmar permisos solicitados:
   - ✅ Read/Write Customers
   - ✅ Read/Write Invoices
   - ✅ Read/Write Payments
   - ✅ Read Chart of Accounts
8. Configurar mapeo de cuentas:
   - Income Account: `Sales - Tourism Services`
   - AR Account: `Accounts Receivable`
   - Payment Account: `Undeposited Funds`
9. Clic en `Save Configuration`

**Resultado esperado:**
- Estado: `Connected` (verde)
- Last Sync: `Never` (primera vez)
- Realm ID: `123456789` (ID de la company)

### 2.4 Sincronizar un Customer

**Ejercicio práctico:** Crear un customer en Spirit Tours y sincronizarlo con QuickBooks.

```javascript
// Datos del customer en Spirit Tours
{
    "firstName": "John",
    "lastName": "Smith",
    "email": "john.smith@example.com",
    "phone": "+1-305-555-0123",
    "address": {
        "street": "123 Ocean Drive",
        "city": "Miami",
        "state": "FL",
        "zipCode": "33139",
        "country": "USA"
    },
    "taxId": "12-3456789"  // EIN o SSN
}
```

**Sincronización automática:**

El ERP Hub detecta la creación del customer y:
1. Lo mapea a UnifiedCustomer
2. Lo envía al adapter de QuickBooks
3. El adapter crea el Customer en QuickBooks:

```javascript
// Payload enviado a QuickBooks API
POST https://quickbooks.api.intuit.com/v3/company/123456789/customer
{
    "DisplayName": "John Smith",
    "PrimaryEmailAddr": {
        "Address": "john.smith@example.com"
    },
    "PrimaryPhone": {
        "FreeFormNumber": "+1-305-555-0123"
    },
    "BillAddr": {
        "Line1": "123 Ocean Drive",
        "City": "Miami",
        "CountrySubDivisionCode": "FL",
        "PostalCode": "33139",
        "Country": "USA"
    },
    "TaxIdentifier": "12-3456789"
}
```

**Validación:**
1. Ir a QuickBooks Online → Customers
2. Buscar "John Smith"
3. Verificar que todos los datos coincidan
4. Verificar en Spirit Tours que el `qb_customer_id` se guardó

### 2.5 Sincronizar una Invoice

**Ejercicio práctico:** Crear una factura en Spirit Tours y sincronizarla.

```javascript
// Reserva en Spirit Tours
{
    "reservationId": "RSV-USA-20251102-001",
    "customerId": "CUST-001",  // John Smith
    "tourPackage": "Miami Beach 3 Days",
    "startDate": "2025-12-01",
    "endDate": "2025-12-03",
    "adults": 2,
    "price": 599.99,
    "tax": 48.00,  // 8% sales tax
    "total": 1295.98
}
```

**Sincronización a QuickBooks:**

```javascript
POST https://quickbooks.api.intuit.com/v3/company/123456789/invoice
{
    "CustomerRef": {
        "value": "42"  // QuickBooks Customer ID
    },
    "TxnDate": "2025-11-02",
    "DueDate": "2025-12-02",
    "DocNumber": "RSV-USA-20251102-001",
    "Line": [
        {
            "DetailType": "SalesItemLineDetail",
            "Amount": 1199.98,
            "Description": "Miami Beach 3 Days Tour Package - 2 Adults",
            "SalesItemLineDetail": {
                "Qty": 2,
                "UnitPrice": 599.99,
                "TaxCodeRef": {
                    "value": "TAX"  // Taxable
                }
            }
        }
    ],
    "TxnTaxDetail": {
        "TotalTax": 96.00,
        "TaxLine": [{
            "DetailType": "TaxLineDetail",
            "Amount": 96.00,
            "TaxLineDetail": {
                "TaxPercent": 8.0,
                "TaxRateRef": {
                    "value": "3"  // FL Sales Tax rate
                }
            }
        }]
    }
}
```

**Validación:**
1. Ir a QuickBooks Online → Sales → Invoices
2. Buscar invoice `RSV-USA-20251102-001`
3. Verificar:
   - Customer: John Smith ✓
   - Amount: $1,295.98 ✓
   - Tax: $96.00 ✓
   - Status: Unpaid ✓

### 2.6 Sincronizar un Payment

Cuando el cliente paga la reserva en Spirit Tours:

```javascript
// Payment registrado en Spirit Tours
{
    "paymentId": "PAY-001",
    "reservationId": "RSV-USA-20251102-001",
    "amount": 1295.98,
    "paymentMethod": "credit_card",
    "paymentDate": "2025-11-02",
    "cardType": "Visa",
    "lastFour": "4242",
    "transactionId": "ch_3ABC123DEF"
}
```

**Sincronización a QuickBooks:**

```javascript
POST https://quickbooks.api.intuit.com/v3/company/123456789/payment
{
    "CustomerRef": {
        "value": "42"
    },
    "TotalAmt": 1295.98,
    "TxnDate": "2025-11-02",
    "PaymentMethodRef": {
        "value": "1"  // Credit Card
    },
    "DepositToAccountRef": {
        "value": "35"  // Undeposited Funds
    },
    "Line": [{
        "Amount": 1295.98,
        "LinkedTxn": [{
            "TxnId": "123",  // Invoice ID
            "TxnType": "Invoice"
        }]
    }],
    "PrivateNote": "Payment via Stripe - Visa ****4242 - Transaction: ch_3ABC123DEF"
}
```

**Resultado en QuickBooks:**
- Invoice status cambia a `Paid`
- Payment aparece en `Undeposited Funds`
- Balance del customer se actualiza a $0

### 2.7 Troubleshooting Común

#### Problema 1: "Invalid Token" Error

**Síntoma:**
```json
{
    "error": "invalid_grant",
    "error_description": "Token expired"
}
```

**Solución:**
```javascript
// El adapter automáticamente intenta refresh token
// Si falla, requiere re-autenticación manual
1. Ir a Admin Panel → ERP Connections
2. Encontrar QuickBooks connection con estado "Disconnected"
3. Clic en "Reconnect"
4. Repetir flujo OAuth
```

#### Problema 2: "Duplicate Customer" Error

**Síntoma:**
```json
{
    "fault": {
        "error": [{
            "message": "Duplicate Name Exists Error",
            "code": "6240"
        }]
    }
}
```

**Solución:**
```javascript
// El adapter detecta duplicados por DisplayName o Email
// Opciones:
1. Agregar sufijo al DisplayName: "John Smith (2)"
2. Buscar customer existente y usar su ID
3. Configurar "merge_duplicates: true" en adapter config
```

#### Problema 3: Rate Limit Exceeded

**Síntoma:**
```json
{
    "error": "rate_limit_exceeded",
    "retry_after": 60
}
```

**Solución:**
```javascript
// QuickBooks limit: 500 requests/minuto
// El adapter implementa rate limiting automático
// Si se excede, los requests se encolan y reintentan después
```

**Checkpoint:** Los participantes deben poder:
- Conectar QuickBooks Online a Spirit Tours
- Sincronizar un customer, invoice y payment
- Validar los datos en QuickBooks
- Resolver problemas comunes

---

## Módulo 3: Xero USA Integration

**Duración:** 2.5 horas

### 3.1 Introducción a Xero

Xero es un ERP cloud popular en USA, UK, Australia y Nueva Zelanda.

**Diferencias clave vs QuickBooks:**
- Diseño más moderno y visual
- Mejor manejo de múltiples monedas
- Tracking categories (dimensiones contables)
- Unlimited users en todos los planes

### 3.2 OAuth 2.0 con PKCE

Xero usa OAuth 2.0 con PKCE (Proof Key for Code Exchange) para mayor seguridad:

```javascript
// 1. Generar code_verifier y code_challenge
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

// 2. Authorization URL con code_challenge
const authUrl = `https://login.xero.com/identity/connect/authorize?` +
    `response_type=code&` +
    `client_id=${clientId}&` +
    `redirect_uri=${redirectUri}&` +
    `scope=accounting.transactions accounting.contacts&` +
    `code_challenge=${codeChallenge}&` +
    `code_challenge_method=S256`;

// 3. Exchange code por token (con code_verifier)
POST https://identity.xero.com/connect/token
{
    "grant_type": "authorization_code",
    "code": "AUTHORIZATION_CODE",
    "redirect_uri": "...",
    "code_verifier": "CODE_VERIFIER",  // ← PKCE
    "client_id": "..."
}
```

### 3.3 Multi-Tenancy en Xero

Xero permite múltiples **organizations** (companies) por usuario:

```javascript
// Después de OAuth, obtener lista de organizations
GET https://api.xero.com/connections

Response:
[
    {
        "id": "abc-123",
        "tenantId": "xyz-789",
        "tenantType": "ORGANISATION",
        "tenantName": "Spirit Tours Miami"
    },
    {
        "id": "def-456",
        "tenantId": "uvw-012",
        "tenantType": "ORGANISATION",
        "tenantName": "Spirit Tours Orlando"
    }
]

// Seleccionar organization correcta para la sucursal
```

### 3.4 Conectar Xero desde el Panel Admin

**Paso a paso:**

1. Navegar a `Admin Panel → ERP Connections`
2. Clic en `+ Connect New ERP`
3. Seleccionar `Xero USA`
4. Clic en `Authorize with Xero`
5. En ventana popup:
   - Ingresar email y password de Xero
   - Hacer 2FA si está habilitado
   - Seleccionar organization: `Spirit Tours Miami`
6. Revisar permisos solicitados:
   - ✅ Read/Write Contacts
   - ✅ Read/Write Invoices
   - ✅ Read/Write Payments
   - ✅ Read Chart of Accounts
7. Clic en `Allow access`
8. Configurar mapeo de cuentas:
   - Income Account: `200 - Sales`
   - AR Account: `610 - Accounts Receivable`
   - Payment Account: `090 - Business Bank Account`
9. Configurar tracking categories (opcional):
   - Region: `Miami`
   - Department: `Tourism`

**Nota importante:** Xero access tokens expiran cada 30 minutos, requiriendo refresh frecuente.

### 3.5 Sincronizar un Contact (Customer)

```javascript
// Payload a Xero API
POST https://api.xero.com/api.xro/2.0/Contacts
Headers: {
    "xero-tenant-id": "xyz-789",  // ← Requerido para multi-tenancy
    "Authorization": "Bearer ACCESS_TOKEN"
}
Body: {
    "Name": "John Smith",
    "EmailAddress": "john.smith@example.com",
    "Phones": [{
        "PhoneType": "DEFAULT",
        "PhoneNumber": "+1-305-555-0123"
    }],
    "Addresses": [{
        "AddressType": "STREET",
        "AddressLine1": "123 Ocean Drive",
        "City": "Miami",
        "Region": "FL",
        "PostalCode": "33139",
        "Country": "USA"
    }],
    "ContactStatus": "ACTIVE",
    "TaxNumber": "12-3456789"
}
```

**Validación:**
1. Login a Xero → Contacts
2. Buscar "John Smith"
3. Verificar datos completos

### 3.6 Sincronizar una Invoice

```javascript
POST https://api.xero.com/api.xro/2.0/Invoices
{
    "Type": "ACCREC",  // Accounts Receivable (Invoice)
    "Contact": {
        "ContactID": "abc-123"
    },
    "DateString": "2025-11-02",
    "DueDateString": "2025-12-02",
    "InvoiceNumber": "RSV-USA-20251102-001",
    "LineAmountTypes": "Exclusive",  // Tax calculated separately
    "LineItems": [{
        "Description": "Miami Beach 3 Days Tour Package - 2 Adults",
        "Quantity": 2.0,
        "UnitAmount": 599.99,
        "AccountCode": "200",  // Sales account
        "TaxType": "OUTPUT2",  // 8% Sales Tax
        "TaxAmount": 96.00,
        "LineAmount": 1199.98
    }],
    "Status": "AUTHORISED",  // Ready to be sent
    "Reference": "Spirit Tours Booking",
    "CurrencyCode": "USD"
}
```

**Estados de Invoice en Xero:**
- `DRAFT`: Borrador, no visible para el cliente
- `SUBMITTED`: Enviado para aprobación
- `AUTHORISED`: Aprobado, listo para enviar
- `PAID`: Pagado completamente

### 3.7 Sincronizar un Payment

```javascript
POST https://api.xero.com/api.xro/2.0/Payments
{
    "Invoice": {
        "InvoiceID": "def-456"
    },
    "Account": {
        "Code": "090"  // Business Bank Account
    },
    "DateString": "2025-11-02",
    "Amount": 1295.98,
    "Reference": "Payment via Stripe - Visa ****4242",
    "CurrencyRate": 1.0
}
```

### 3.8 Tracking Categories

Xero permite agregar "dimensiones" a las transacciones:

```javascript
// Agregar tracking a line item
{
    "Description": "Miami Beach Tour",
    "Quantity": 2,
    "UnitAmount": 599.99,
    "AccountCode": "200",
    "Tracking": [
        {
            "TrackingCategoryID": "region-123",
            "Name": "Region",
            "Option": "Miami"
        },
        {
            "TrackingCategoryID": "dept-456",
            "Name": "Department",
            "Option": "Tourism"
        }
    ]
}
```

**Uso en reportes:**
- P&L por región
- Balance Sheet por departamento
- Custom reports con múltiples dimensiones

### 3.9 Rate Limiting en Xero

**Límites más restrictivos que QuickBooks:**
- **60 requests / minuto** por tenant
- **5,000 requests / día** por tenant
- **10,000 requests / día** por app (todas las tenants)

**Estrategias del adapter:**
```javascript
class XeroRateLimiter {
    constructor() {
        this.requestsPerMinute = 60;
        this.requestCount = 0;
        this.resetTime = Date.now() + 60000;
    }

    async throttle() {
        if (this.requestCount >= this.requestsPerMinute) {
            const waitTime = this.resetTime - Date.now();
            if (waitTime > 0) {
                await sleep(waitTime);
                this.requestCount = 0;
                this.resetTime = Date.now() + 60000;
            }
        }
        this.requestCount++;
    }
}
```

**Checkpoint:** Los participantes deben poder:
- Entender PKCE y multi-tenancy en Xero
- Conectar Xero a Spirit Tours
- Sincronizar contacts, invoices y payments
- Configurar tracking categories

---

## Módulo 4: FreshBooks Integration

**Duración:** 2 horas

### 4.1 Introducción a FreshBooks

FreshBooks es un ERP simplificado para freelancers y pequeños negocios.

**Características:**
- Interfaz muy amigable
- Enfocado en invoicing y time tracking
- No tiene Chart of Accounts completa (simplificado)
- Excellent mobile app
- Integración con Stripe, PayPal

**Limitaciones:**
- Menos personalizable que QuickBooks/Xero
- No soporta inventory tracking
- Reportes limitados
- No soporta multi-currency bien

### 4.2 Conectar FreshBooks

**OAuth 2.0 flow similar a QuickBooks:**

1. Admin Panel → Connect FreshBooks
2. Authorize con FreshBooks
3. Seleccionar business (similar a Xero tenants)
4. Mapeo de cuentas (limitado):
   - Default Income Category
   - Default Expense Category
   - Tax Name (e.g., "FL Sales Tax")

### 4.3 Sincronizar un Client (Customer)

```javascript
POST https://api.freshbooks.com/accounting/account/{ACCOUNT_ID}/users/clients
{
    "email": "john.smith@example.com",
    "fname": "John",
    "lname": "Smith",
    "organization": "John Smith",
    "p_street": "123 Ocean Drive",
    "p_city": "Miami",
    "p_province": "Florida",
    "p_code": "33139",
    "p_country": "United States",
    "vat_number": "12-3456789",
    "currency_code": "USD",
    "language": "en"
}
```

**Nota:** FreshBooks no diferencia entre "cliente" y "usuario" claramente.

### 4.4 Sincronizar una Invoice

```javascript
POST https://api.freshbooks.com/accounting/account/{ACCOUNT_ID}/invoices/invoices
{
    "invoice": {
        "customerid": 123,
        "create_date": "2025-11-02",
        "due_date": "2025-12-02",
        "currency_code": "USD",
        "status": 1,  // 1=draft, 2=sent, 4=paid
        "lines": [{
            "name": "Miami Beach Tour",
            "description": "3 Days Package - 2 Adults",
            "qty": 2,
            "unit_cost": {
                "amount": "599.99",
                "code": "USD"
            },
            "taxName1": "FL Sales Tax",
            "taxAmount1": "48.00"
        }],
        "notes": "Spirit Tours Booking RSV-USA-20251102-001"
    }
}
```

**Estados de Invoice:**
- `1`: Draft
- `2`: Sent (enviado al cliente)
- `3`: Viewed (cliente lo vio)
- `4`: Paid
- `5`: Auto-paid (autopago configurado)

### 4.5 Sincronizar un Payment

```javascript
POST https://api.freshbooks.com/accounting/account/{ACCOUNT_ID}/payments/payments
{
    "payment": {
        "invoiceid": 456,
        "amount": {
            "amount": "1295.98",
            "code": "USD"
        },
        "date": "2025-11-02",
        "type": "Credit Card",
        "note": "Payment via Stripe - Visa ****4242"
    }
}
```

### 4.6 Diferencias Clave vs QuickBooks/Xero

| Feature | QuickBooks | Xero | FreshBooks |
|---------|-----------|------|-----------|
| Chart of Accounts | Full COA | Full COA | Simplified categories |
| Multi-currency | ✅ | ✅ | ⚠️ Limited |
| Inventory | ✅ | ✅ | ❌ |
| Projects | ✅ | ✅ | ✅ |
| Time Tracking | ✅ | ✅ | ✅ Excellent |
| Expenses | ✅ | ✅ | ✅ |
| Proposals | ❌ | ❌ | ✅ |
| Complexity | High | Medium | Low |

### 4.7 Cuándo usar FreshBooks

**Ideal para:**
- Operaciones pequeñas (< 50 reservas/mes)
- Equipos que priorizan simplicidad
- Negocios sin inventario
- Freelancers o consultores

**No ideal para:**
- Operaciones con inventario complejo
- Múltiples monedas
- Reportes financieros avanzados

**Checkpoint:** Los participantes deben poder:
- Conectar FreshBooks a Spirit Tours
- Sincronizar clients, invoices y payments
- Entender cuándo usar FreshBooks vs otros ERPs

---

## Módulo 5: Panel de Administración React

**Duración:** 2.5 horas

### 5.1 Navegación del Panel

El panel de administración React tiene 4 secciones principales:

```
┌───────────────────────────────────────────────────────────┐
│  Spirit Tours - ERP Hub Dashboard                         │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  [Dashboard] [Connections] [Monitoring] [Account Mapping] │
│                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ QuickBooks  │  │    Xero     │  │ FreshBooks  │       │
│  │ Connected   │  │ Connected   │  │ Not Config  │       │
│  │ Last: 2m ago│  │ Last: 5m ago│  │             │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                            │
│  Recent Sync Activities:                                  │
│  ✅ Customer sync: John Smith → QuickBooks (2m ago)       │
│  ✅ Invoice sync: RSV-001 → Xero (5m ago)                │
│  ❌ Payment sync: PAY-003 → QuickBooks (Failed)          │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

### 5.2 Dashboard Overview

**Componente:** `ERPHubDashboard.tsx`

**Métricas mostradas:**
- Total ERPs conectados
- Sincronizaciones hoy
- Errores en últimas 24h
- Próxima sincronización programada

**Gráficos:**
1. **Sync Success Rate (últimos 7 días)**
   ```
   100% │     ●──●──●
    90% │   ●──       ──●
    80% │ ●──              ──●
        └─────────────────────
         Mon Tue Wed Thu Fri
   ```

2. **Sync Volume por ERP**
   ```
   QuickBooks ████████████ 245
   Xero       ████████ 178
   FreshBooks ███ 67
   ```

### 5.3 Connections Manager

**Componente:** `ERPConnectionWizard.tsx`

**Funciones:**
1. **Add New Connection**
   - Wizard paso a paso
   - OAuth flow integrado
   - Validación de credenciales en tiempo real

2. **Edit Existing Connection**
   - Cambiar configuración
   - Re-autorizar OAuth
   - Cambiar mapeo de cuentas

3. **Test Connection**
   - Botón "Test" hace un ping al ERP
   - Muestra latencia y estado
   ```
   QuickBooks USA
   Status: ✅ Connected
   Latency: 247ms
   [Test Connection] [Reconnect] [Delete]
   ```

4. **Disconnect**
   - Revoca tokens OAuth
   - Mantiene datos históricos
   - Detiene sincronizaciones futuras

### 5.4 Sync Monitor (Real-time)

**Componente:** `SyncMonitor.tsx`

**Vista de sincronizaciones en tiempo real:**

```
┌─────────────────────────────────────────────────────────────┐
│  Active Syncs (3)                              [Auto-refresh]│
├─────────────────────────────────────────────────────────────┤
│  ⏳ Customer: Jane Doe → QuickBooks                         │
│     Status: In Progress (Step 2/3)                          │
│     Started: 10 seconds ago                                 │
│                                                              │
│  ✅ Invoice: RSV-002 → Xero                                 │
│     Status: Completed Successfully                          │
│     Duration: 3.2s                                          │
│     Xero Invoice ID: INV-12345                              │
│                                                              │
│  ❌ Payment: PAY-004 → FreshBooks                           │
│     Status: Failed                                          │
│     Error: Invalid invoice reference                        │
│     [View Details] [Retry]                                  │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Auto-refresh cada 5 segundos
- Filtros por ERP, tipo de entidad, estado
- Búsqueda por ID de reserva
- Botón "Retry" para sincronizaciones fallidas

### 5.5 Account Mapping Manager

**Componente:** `AccountMappingManager.tsx`

**Configuración de mapeo contable:**

```
┌─────────────────────────────────────────────────────────────┐
│  Account Mapping - QuickBooks USA                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Income Accounts:                                           │
│  ┌─────────────────────┬────────────────────────────────┐  │
│  │ Spirit Tours Type   │ QuickBooks Account             │  │
│  ├─────────────────────┼────────────────────────────────┤  │
│  │ Tour Package Sales  │ [▼] 400 - Sales - Tourism      │  │
│  │ Transfer Services   │ [▼] 410 - Sales - Transport    │  │
│  │ Hotel Commissions   │ [▼] 420 - Sales - Commissions  │  │
│  └─────────────────────┴────────────────────────────────┘  │
│                                                              │
│  Expense Accounts:                                          │
│  ┌─────────────────────┬────────────────────────────────┐  │
│  │ Tour Operator Cost  │ [▼] 500 - COGS - Tour Operator │  │
│  │ Hotel Booking Cost  │ [▼] 510 - COGS - Accommodation │  │
│  │ Marketing Expenses  │ [▼] 600 - Expenses - Marketing │  │
│  └─────────────────────┴────────────────────────────────┘  │
│                                                              │
│  Tax Mappings:                                              │
│  ┌─────────────────────┬────────────────────────────────┐  │
│  │ Florida Sales Tax   │ [▼] FL Sales Tax (8%)          │  │
│  │ Hotel Occupancy Tax │ [▼] FL TOT (6%)                │  │
│  └─────────────────────┴────────────────────────────────┘  │
│                                                              │
│  [Save Mappings] [Reset to Defaults] [Import from CSV]     │
└─────────────────────────────────────────────────────────────┘
```

**Funciones:**
- Dropdown con todas las cuentas del ERP
- Búsqueda de cuentas por nombre o código
- Validación de que las cuentas existen
- Import/Export de configuración
- Templates por industria

### 5.6 Logs Viewer

**Componente:** `ERPLogsViewer.tsx`

**Vista detallada de logs:**

```
┌─────────────────────────────────────────────────────────────┐
│  ERP Sync Logs                     [Export CSV] [Filter]    │
├─────────────────────────────────────────────────────────────┤
│  Filters: ⬜ Errors Only  ⬜ Last 24h  [▼] All ERPs         │
├─────────────────────────────────────────────────────────────┤
│  2025-11-02 10:34:21  INFO   QuickBooks                     │
│  Customer sync successful                                   │
│  Entity: CUST-001 (John Smith)                              │
│  QB ID: 42                                                  │
│  Duration: 1.2s                                             │
│  [View Full Log]                                            │
├─────────────────────────────────────────────────────────────┤
│  2025-11-02 10:31:05  ERROR  Xero                           │
│  Invoice sync failed                                        │
│  Entity: RSV-003                                            │
│  Error: Rate limit exceeded (60 req/min)                    │
│  Retry scheduled: 10:32:05                                  │
│  [View Full Log] [Retry Now]                               │
├─────────────────────────────────────────────────────────────┤
```

**Filtros disponibles:**
- Por fecha/hora
- Por ERP provider
- Por tipo de entidad (customer, invoice, payment)
- Por estado (success, error, pending)
- Por sucursal
- Búsqueda por texto libre

### 5.7 Hands-On: Ejercicios del Panel

**Ejercicio 1:** Conectar QuickBooks Sandbox
1. Abrir panel admin en browser
2. Navegar a Connections
3. Seguir wizard para conectar QuickBooks Sandbox
4. Validar que el estado sea "Connected"

**Ejercicio 2:** Monitorear una sincronización
1. En Spirit Tours, crear un nuevo customer
2. En panel admin, ir a Sync Monitor
3. Observar en tiempo real la sincronización
4. Verificar que aparezca como "Completed"
5. Ver el log detallado

**Ejercicio 3:** Configurar Account Mapping
1. Navegar a Account Mapping
2. Seleccionar QuickBooks USA
3. Mapear:
   - Tour Sales → Account 400
   - COGS → Account 500
   - Sales Tax → FL Sales Tax
4. Guardar configuración
5. Crear una invoice de prueba y verificar que use las cuentas correctas

**Checkpoint:** Los participantes deben poder:
- Navegar el panel admin con facilidad
- Conectar/desconectar ERPs
- Monitorear sincronizaciones en tiempo real
- Configurar account mappings
- Buscar y filtrar logs

---

## Módulo 6: Workflows de Operación

**Duración:** 2 horas

### 6.1 Workflow Diario de Operaciones

**Morning Routine (9:00 AM):**

```
1. Login al panel admin ERP Hub
2. Revisar dashboard:
   ✓ ¿Todos los ERPs están conectados?
   ✓ ¿Hay errores de la noche anterior?
   ✓ ¿Sync success rate está > 95%?
3. Revisar logs de errores:
   → Identificar patrones (rate limits, tokens expired, etc.)
   → Priorizar errores críticos (facturas no sincronizadas)
4. Retry sincronizaciones fallidas:
   → Ir a Sync Monitor
   → Filtrar por "Failed" status
   → Click "Retry" en cada uno
5. Verificar account mappings:
   → Asegurar que mapeos están actualizados
   → Especialmente si se agregaron nuevas cuentas en el ERP
```

**During Day Operations:**

```
El sistema sincroniza automáticamente:
- Customers: Inmediatamente al crear reserva
- Invoices: Cuando se confirma pago o se factura
- Payments: Cuando se registra pago en Spirit Tours

Tu rol:
1. Monitorear panel en caso de errores
2. Responder a alertas por email/Slack
3. Verificar que facturas críticas se sincronizaron
```

**End of Day Routine (6:00 PM):**

```
1. Revisar métricas del día:
   → Total syncs: ¿Coincide con número de reservas?
   → Error rate: ¿Menor a 5%?
   → Average sync time: ¿Menor a 5 segundos?
2. Exportar logs del día (CSV):
   → Archivo para auditoría
   → Guardar en carpeta compartida
3. Resolver pendientes:
   → Retry cualquier sync fallido restante
   → Documentar issues recurrentes
4. Verificar tokens OAuth:
   → Si algún ERP muestra warning "Token expires soon"
   → Hacer re-auth proactivamente
```

### 6.2 Workflow de Creación de Reserva

**Flujo completo desde reserva hasta pago:**

```
PASO 1: Cliente hace reserva en Spirit Tours
└─> Sistema crea record en DB
    ├─> Evento: "reservation.created"
    └─> Trigger: ERP Hub Listener

PASO 2: ERP Hub crea UnifiedCustomer
└─> Mapea datos de reserva → UnifiedCustomer
    └─> Valida datos (email, phone, etc.)

PASO 3: Sincronización Multi-ERP
├─> QuickBooks Adapter
│   └─> POST /customer → QB Customer ID: 42
├─> Xero Adapter
│   └─> POST /contacts → Xero Contact ID: abc-123
└─> FreshBooks Adapter
    └─> POST /clients → FB Client ID: 789

PASO 4: Actualizar Spirit Tours DB
└─> Guardar ERP IDs en tabla mappings:
    ├─> quickbooks_customer_id: 42
    ├─> xero_contact_id: abc-123
    └─> freshbooks_client_id: 789

PASO 5: Confirmar reserva y facturar
└─> Sistema crea Invoice
    ├─> Evento: "invoice.created"
    └─> Trigger: ERP Hub Listener

PASO 6: ERP Hub crea UnifiedInvoice
└─> Mapea datos de invoice
    ├─> Referencia ERP Customer IDs
    └─> Calcula tax, totals

PASO 7: Sincronización de Invoice Multi-ERP
├─> QuickBooks: QB Invoice ID: INV-123
├─> Xero: Xero Invoice ID: INV-xyz
└─> FreshBooks: FB Invoice ID: INV-789

PASO 8: Cliente paga
└─> Sistema registra Payment
    ├─> Evento: "payment.received"
    └─> Trigger: ERP Hub Listener

PASO 9: ERP Hub crea UnifiedPayment
└─> Mapea datos de payment
    └─> Referencia ERP Invoice IDs

PASO 10: Sincronización de Payment Multi-ERP
├─> QuickBooks: Mark invoice as paid
├─> Xero: Create payment, mark invoice paid
└─> FreshBooks: Mark invoice status = 4 (paid)

PASO 11: Confirmación final
└─> Spirit Tours recibe confirmación
    └─> Email a cliente con factura pagada
```

**Timeline ejemplo:**
```
10:00:00 - Cliente crea reserva
10:00:02 - Customer sincronizado a QuickBooks
10:00:03 - Customer sincronizado a Xero
10:00:04 - Customer sincronizado a FreshBooks
10:05:00 - Cliente confirma pago
10:05:01 - Invoice creada en Spirit Tours
10:05:03 - Invoice sincronizada a todos los ERPs
10:05:05 - Payment registrado en Spirit Tours
10:05:08 - Payment sincronizado a todos los ERPs
10:05:10 - Email de confirmación enviado al cliente
```

### 6.3 Workflow de Resolución de Errores

**Error Severity Levels:**

| Level | Descripción | Acción | SLA |
|-------|-------------|--------|-----|
| 🔴 Critical | Invoice no sincronizada + Cliente esperando | Resolver inmediatamente | 15 min |
| 🟠 High | Payment no sincronizado + Afecta contabilidad | Resolver en 1 hora | 1 hora |
| 🟡 Medium | Customer sync failed + No afecta facturación | Resolver en 4 horas | 4 horas |
| 🟢 Low | Rate limit reached + Retry automático programado | Monitorear | 24 horas |

**Proceso de Troubleshooting:**

```
1. IDENTIFICAR
   ├─> Revisar Sync Monitor
   ├─> Filtrar por "Failed"
   └─> Identificar error message

2. CLASIFICAR
   ├─> ¿Es error de autenticación? → Re-auth OAuth
   ├─> ¿Es rate limit? → Esperar y retry
   ├─> ¿Es data validation? → Corregir datos
   └─> ¿Es ERP down? → Contact ERP support

3. RESOLVER
   ├─> Aplicar solución apropiada
   ├─> Retry sync
   └─> Verificar success

4. DOCUMENTAR
   ├─> Agregar nota en log
   ├─> Actualizar knowledge base si es error nuevo
   └─> Notificar al equipo si es sistémico

5. PREVENIR
   └─> ¿Se puede prevenir en el futuro?
       ├─> Agregar validación
       ├─> Mejorar error handling
       └─> Actualizar documentación
```

### 6.4 Workflow de Reconciliación (End of Month)

**Monthly Reconciliation Checklist:**

```
□ 1. Exportar datos de Spirit Tours
     └─> Total reservas del mes
     └─> Total facturas emitidas
     └─> Total pagos recibidos

□ 2. Exportar datos de cada ERP
     QuickBooks:
     └─> Sales Report → Filter by Spirit Tours
     Xero:
     └─> P&L Report → Filter by tracking category
     FreshBooks:
     └─> Invoice Report → All invoices

□ 3. Comparar totales
     ├─> ¿Spirit Tours total = ERP total?
     ├─> ¿Diferencias menores a $100? → OK
     └─> ¿Diferencias mayores? → Investigar

□ 4. Identificar discrepancias
     ├─> Buscar invoices no sincronizadas
     ├─> Buscar payments no aplicados
     └─> Verificar dates (cutoff de mes)

□ 5. Corregir discrepancias
     ├─> Sync manual de invoices faltantes
     ├─> Ajustar payments mal aplicados
     └─> Journal entries si necesario

□ 6. Documentar reconciliación
     ├─> Crear reconciliation report
     ├─> Firmar y archivar
     └─> Enviar a contabilidad

□ 7. Cerrar mes en ERP
     └─> Follow proceso específico de cada ERP
```

### 6.5 Workflow de Onboarding Nueva Sucursal

**Checklist para agregar nueva sucursal al ERP Hub:**

```
□ 1. Preparación (1 hora)
     ├─> Crear nueva sucursal en Spirit Tours DB
     ├─> Obtener credenciales ERP del cliente
     ├─> Validar permisos de acceso
     └─> Programar training con equipo local

□ 2. Configuración Técnica (2 horas)
     ├─> Conectar ERP via panel admin
     ├─> Configurar OAuth
     ├─> Validar connection
     ├─> Configurar account mappings
     ├─> Configurar tax rates
     └─> Test sync (customer, invoice, payment)

□ 3. Data Migration (4 horas)
     ├─> ¿Migrar customers existentes? → Sí/No
     ├─> ¿Migrar invoices históricas? → Sí/No
     └─> Ejecutar migration scripts si aplica

□ 4. Testing (2 horas)
     ├─> Crear 5 test reservations
     ├─> Verificar sync de cada una
     ├─> Validar datos en ERP
     ├─> Test edge cases (refunds, cancellations)
     └─> Performance testing

□ 5. Training (4 horas)
     └─> Seguir este documento de training

□ 6. Go-Live (1 día)
     ├─> Go-live con 10% de reservas
     ├─> Monitoreo intensivo
     ├─> Después de 2 días sin errores → 50%
     ├─> Después de 1 semana sin errores → 100%
     └─> Post-go-live review

□ 7. Post-Implementation (ongoing)
     ├─> Daily monitoring (primera semana)
     ├─> Weekly reporting (primer mes)
     └─> Monthly review (primeros 3 meses)
```

**Checkpoint:** Los participantes deben poder:
- Ejecutar el workflow diario de operaciones
- Troubleshoot errores comunes
- Realizar reconciliación mensual
- Onboarding de nueva sucursal

---

## Módulo 7: Troubleshooting y Soporte

**Duración:** 2 horas

### 7.1 Common Issues & Solutions

#### Issue 1: OAuth Token Expired

**Síntomas:**
```json
{
    "error": "invalid_grant",
    "error_description": "Token expired"
}
```

**Causa raíz:**
- QuickBooks tokens expiran después de 100 días de inactividad
- Xero tokens expiran después de 30 minutos (access) y 60 días (refresh)
- FreshBooks tokens expiran después de 90 días

**Solución paso a paso:**

```
1. Panel Admin → Connections
2. Identificar ERP con status "Disconnected" o "Token Expired"
3. Click botón "Reconnect"
4. Seguir flujo OAuth nuevamente
5. Validar que status cambie a "Connected"
6. Retry cualquier sync fallido durante el downtime
```

**Prevención:**
```javascript
// El sistema envía alertas proactivas:
- 7 días antes de expiración → Email warning
- 1 día antes → Email + Slack alert
- Al expirar → Email + Slack + SMS (si crítico)
```

#### Issue 2: Duplicate Customer Error

**Síntomas:**
```
QuickBooks: "Duplicate Name Exists Error" (Code 6240)
Xero: "The contact name must be unique" (ValidationError)
FreshBooks: "Duplicate email address"
```

**Causa raíz:**
- Customer ya existe en ERP con mismo nombre/email
- Spirit Tours no tiene el ERP ID guardado (mapping perdido)

**Solución:**

```
Opción A: Usar customer existente
1. Panel Admin → Account Mapping
2. Buscar customer en ERP manualmente
3. Obtener ERP ID
4. Agregar mapping manualmente en DB:
   INSERT INTO erp_entity_mappings (
       spirit_tours_entity_id,
       erp_provider,
       erp_entity_id,
       entity_type
   ) VALUES (
       'CUST-001',
       'quickbooks_usa',
       '42',
       'customer'
   );
5. Future syncs usarán el customer existente

Opción B: Crear nuevo customer con nombre único
1. Spirit Tours → Edit customer
2. Agregar sufijo al nombre: "John Smith (Miami)"
3. Retry sync
4. Mapping se creará automáticamente

Opción C: Merge duplicates (manual)
1. Login al ERP
2. Usar función de merge/duplicate resolution
3. Actualizar mapping en Spirit Tours con el ID correcto
```

#### Issue 3: Rate Limit Exceeded

**Síntomas:**
```
QuickBooks: HTTP 429 "Rate limit exceeded"
Xero: HTTP 503 "Service unavailable" (rate limit)
FreshBooks: HTTP 429 "Too many requests"
```

**Causa raíz:**
- Demasiadas requests en ventana de tiempo
- Sync masivo (bulk import)
- Múltiples sucursales usando mismo OAuth app

**Solución inmediata:**
```
1. System automáticamente encola requests para retry
2. Monitor → Ver "Rate Limit Queue"
3. Wait time indicado en UI (ej: "Retry in 42 seconds")
4. No hacer acciones manuales, dejar que sistema maneje
```

**Solución a largo plazo:**
```javascript
// Configurar batching
{
    "sync_config": {
        "batch_size": 10,  // Sync 10 customers at a time
        "batch_delay_ms": 5000,  // Wait 5 seconds between batches
        "rate_limit_buffer": 0.8  // Use only 80% of rate limit
    }
}

// Configurar off-peak syncing
{
    "sync_schedule": {
        "bulk_sync_hours": [22, 23, 0, 1, 2, 3, 4, 5],  // 10 PM - 6 AM
        "priority_sync_hours": [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
    }
}
```

#### Issue 4: Data Validation Errors

**Síntomas:**
```
"Invalid email format"
"Required field missing: TaxNumber"
"Invalid date format"
"Amount cannot be negative"
```

**Causa raíz:**
- Datos incompletos en Spirit Tours
- Formato de datos incorrecto
- Reglas de validación diferentes entre sistemas

**Solución:**

```
1. Panel Admin → Logs → Buscar error específico
2. Ver detalles del error:
   {
       "entity": "CUST-001",
       "error": "Invalid email format",
       "field": "email",
       "value": "john.smith",
       "expected_format": "user@domain.com"
   }
3. Corregir dato en Spirit Tours:
   → Edit customer
   → Fix email: "john.smith@example.com"
   → Save
4. Retry sync automáticamente
```

**Validaciones comunes a verificar:**

```javascript
// Email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone (USA)
const phoneRegex = /^\+1-\d{3}-\d{3}-\d{4}$/;  // +1-305-555-0123

// Tax ID (USA)
const einRegex = /^\d{2}-\d{7}$/;  // 12-3456789
const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;  // 123-45-6789

// Zip Code (USA)
const zipRegex = /^\d{5}(-\d{4})?$/;  // 33139 or 33139-1234

// Currency amounts
const amountRegex = /^\d+(\.\d{1,2})?$/;  // 123.45
```

#### Issue 5: Sync Stuck in "Pending" State

**Síntomas:**
- Sync Monitor muestra "In Progress" por más de 5 minutos
- No hay errores en logs
- No hay updates en status

**Causa raíz:**
- Worker process crashed
- Database deadlock
- Network timeout sin proper error handling

**Solución:**

```
1. Panel Admin → Sync Monitor
2. Identificar sync stuck
3. Click "Force Cancel"
4. Wait 30 seconds
5. Click "Retry"
6. Si persiste:
   → Check backend logs
   → Restart worker process
   → Contact dev team
```

### 7.2 Escalation Matrix

**Cuándo escalar issues:**

| Issue | First Response | Escalate To | When |
|-------|---------------|-------------|------|
| Single sync failure | Retry automático | - | - |
| 3+ failed syncs (mismo entity) | Operations team | Tech lead | 1 hour |
| ERP completely down | Operations team | ERP support + Tech lead | Immediately |
| Data corruption | Operations team | Dev team + DBA | Immediately |
| Security concern | Operations team | Security team + CTO | Immediately |
| Feature request | Operations team | Product team | Next sprint planning |

### 7.3 Contact Information

```
🔧 Technical Support:
   Email: erp-support@spirittours.com
   Slack: #erp-hub-support
   On-call: +1-305-555-TECH (8324)

📊 Operations Team:
   Email: ops@spirittours.com
   Slack: #operations

🛡️ Security Team:
   Email: security@spirittours.com
   Emergency: +1-305-555-9999

📦 ERP Vendor Support:
   QuickBooks: 1-800-4INTUIT
   Xero: support.xero.com/us
   FreshBooks: support@freshbooks.com
```

### 7.4 Knowledge Base & Resources

**Internal Documentation:**
- Confluence: https://spirittours.atlassian.net/wiki/ERP-Hub
- GitHub Wiki: https://github.com/spirittours/erp-hub/wiki
- Training Videos: https://spirittours.wistia.com/erp-training

**External Documentation:**
- QuickBooks API: https://developer.intuit.com/docs
- Xero API: https://developer.xero.com/documentation
- FreshBooks API: https://www.freshbooks.com/api

**Checkpoint:** Los participantes deben poder:
- Identificar y resolver los 5 issues más comunes
- Saber cuándo escalar un problema
- Conocer los recursos de soporte disponibles

---

## Módulo 8: Mejores Prácticas

**Duración:** 1.5 horas

### 8.1 Data Quality Best Practices

**Regla de Oro:** Garbage In = Garbage Out

**Antes de sincronizar, validar:**

```javascript
// Customer data checklist
✓ Display name no está vacío
✓ Email tiene formato válido
✓ Phone tiene country code (+1)
✓ Address tiene City + State + Zip
✓ Tax ID tiene formato correcto (si aplica)
✓ No tiene caracteres especiales problemáticos (< > & " ')
```

**Naming Conventions:**

```
Good:
- "John Smith"
- "ABC Company Inc"
- "María García"

Bad:
- "john" (solo nombre)
- "Customer #123" (no descriptivo)
- "Test" (no usar en producción)
- "ALLCAPS COMPANY" (evitar)
```

**Address Formatting:**

```javascript
// USA Standard
{
    "line1": "123 Main Street",  // No apartado postal aquí
    "line2": "Apt 4B",  // Opcional
    "city": "Miami",
    "state": "FL",  // Usar código de 2 letras
    "postalCode": "33139",
    "country": "USA"  // o "United States"
}
```

### 8.2 Security Best Practices

**OAuth Tokens:**
```
DO:
✓ Store tokens encrypted in database
✓ Use HTTPS for all API calls
✓ Rotate tokens regularly
✓ Log token usage for audit
✓ Set token expiration alerts

DON'T:
✗ Store tokens in plain text
✗ Share tokens between environments (prod/dev)
✗ Commit tokens to Git
✗ Log tokens in application logs
✗ Share tokens with third parties
```

**Access Control:**
```
✓ Use role-based access control (RBAC)
✓ Limit ERP Hub access to authorized personnel only
✓ Audit log all admin actions
✓ Require 2FA for admin panel
✓ Review access quarterly
```

### 8.3 Performance Best Practices

**Batching:**
```javascript
// Instead of syncing one by one:
for (const customer of customers) {
    await syncCustomer(customer);  // ❌ Slow
}

// Batch sync:
await syncCustomersBatch(customers, { batchSize: 10 });  // ✅ Fast
```

**Caching:**
```javascript
// Cache ERP account lists (Chart of Accounts)
// Refresh once per day instead of every sync
const accounts = await cache.get('qb_accounts') || 
                 await fetchAccountsFromQB();
```

**Async Processing:**
```javascript
// Don't block user while syncing
// Use queue system:
await queue.add('sync-invoice', {
    invoiceId: 'INV-001',
    erpProviders: ['quickbooks', 'xero']
});

// User sees: "Invoice queued for sync" ✅
// Instead of: "Syncing... please wait" (5 seconds) ❌
```

### 8.4 Error Handling Best Practices

**Retry Strategy:**

```javascript
// Exponential backoff
const retryDelays = [1000, 2000, 4000, 8000, 16000];  // ms

for (let attempt = 0; attempt < retryDelays.length; attempt++) {
    try {
        return await syncToERP();
    } catch (error) {
        if (attempt === retryDelays.length - 1) throw error;
        await sleep(retryDelays[attempt]);
    }
}
```

**Error Logging:**

```javascript
// Log with context
logger.error('Invoice sync failed', {
    invoiceId: 'INV-001',
    erpProvider: 'quickbooks',
    errorCode: 'INVALID_REFERENCE',
    errorMessage: 'Customer not found',
    attemptNumber: 3,
    timestamp: new Date().toISOString(),
    userId: 'user-123',
    sucursalId: 'USA_001'
});

// NOT:
logger.error('Error');  // ❌ No context
```

**User-Friendly Error Messages:**

```javascript
// Technical error:
"Error: ECONNREFUSED 127.0.0.1:5432"

// User-friendly message:
"⚠️ Unable to connect to QuickBooks. Please check your internet connection and try again."

// With action:
"❌ This invoice couldn't be synced because the customer doesn't exist in QuickBooks. 
[Sync Customer First] [Edit Invoice]"
```

### 8.5 Testing Best Practices

**Use Sandbox/Test Environments:**

```
Development:
└─> Use QuickBooks Sandbox
└─> Use Xero Demo Company
└─> Use FreshBooks Test Account

Staging:
└─> Mirror production config
└─> Use test ERPs
└─> Test with production-like data volume

Production:
└─> Real ERPs
└─> Real customer data
└─> Monitoring & alerting enabled
```

**Test Scenarios to Cover:**

```
✓ Happy path (customer → invoice → payment)
✓ Duplicate customer handling
✓ Invalid data (bad email, missing fields)
✓ Refunds and credit memos
✓ Partial payments
✓ Multi-currency (if applicable)
✓ Rate limiting
✓ Token expiration
✓ ERP downtime
✓ Network timeouts
✓ Large data volumes (100+ customers)
```

### 8.6 Monitoring Best Practices

**Key Metrics to Track:**

```javascript
{
    "sync_success_rate": 98.5,  // Target: > 95%
    "average_sync_time_ms": 2340,  // Target: < 5000ms
    "error_rate_24h": 1.2,  // Target: < 5%
    "token_expiration_days": 45,  // Alert: < 7 days
    "queue_depth": 12,  // Alert: > 100
    "oldest_queued_item_age_minutes": 3  // Alert: > 30 min
}
```

**Alerts to Configure:**

```
🔴 CRITICAL (Page on-call):
- Sync success rate < 80%
- All ERPs disconnected
- Queue depth > 500
- Oldest queued item > 2 hours

🟠 WARNING (Email + Slack):
- Sync success rate < 95%
- Token expires in < 7 days
- Error rate > 5%
- Queue depth > 100

🟡 INFO (Slack only):
- New ERP connection added
- Account mapping changed
- Daily metrics summary
```

### 8.7 Documentation Best Practices

**Document Everything:**

```
✓ Configuration changes
✓ Account mapping changes
✓ Error resolutions
✓ Workarounds for known issues
✓ Contact information updates
✓ Post-incident reviews
```

**Use Templates:**

```markdown
## Incident Report Template

**Date:** 2025-11-02
**Duration:** 10:30 - 11:45 (1h 15min)
**Severity:** Medium
**Affected ERPs:** QuickBooks USA
**Affected Sucursales:** Miami, Orlando

### Summary
QuickBooks OAuth tokens expired, causing 23 failed syncs.

### Root Cause
Automatic token refresh failed due to network timeout.

### Resolution
Manual re-authentication via admin panel.

### Prevention
- Implement retry logic for token refresh
- Add monitoring for token refresh failures
- Reduce token refresh interval from 7 days to 3 days

### Action Items
- [ ] Dev team: Implement retry logic (Priority: High)
- [ ] Ops team: Update monitoring dashboard
- [ ] Training: Document manual re-auth procedure
```

**Checkpoint:** Los participantes deben poder:
- Aplicar best practices de data quality
- Configurar batching y async processing
- Implementar retry strategies
- Crear documentación efectiva

---

## Evaluación y Certificación

**Duración:** 1 hora

### Evaluación Teórica (30 minutos)

**Quiz de 20 preguntas:**

1. ¿Qué es el ERP Hub y cuál es su propósito principal?
2. ¿Qué es un Unified Model?
3. ¿Cuál es la diferencia entre OAuth 2.0 y OAuth 2.0 con PKCE?
4. ¿Cuánto tiempo es válido un access token de QuickBooks?
5. ¿Cuál es el rate limit de Xero por minuto?
6. ¿Qué significa el status "AUTHORISED" en una invoice de Xero?
7. ¿Cómo se resuelve un error de "Duplicate Customer"?
8. ¿Cuándo se debe escalar un issue al tech lead?
9. Nombra 3 mejores prácticas de data quality.
10. ¿Qué información debe incluir un log de error?

(10 preguntas más...)

**Passing Score:** 16/20 (80%)

### Evaluación Práctica (30 minutos)

**Ejercicio práctico:**

```
Escenario:
Un nuevo cliente, "Jane Doe", hace una reserva para el tour "Orlando Adventure" 
por $899.99 + $72 tax. Paga con tarjeta de crédito.

Tareas:
1. Sincronizar el customer a QuickBooks Sandbox
2. Sincronizar la invoice
3. Sincronizar el payment
4. Validar que todo esté correcto en QuickBooks
5. Verificar en el panel admin que todos los syncs fueron exitosos
6. Exportar los logs de las 3 sincronizaciones
7. Presentar el resultado al instructor

Criterios de evaluación:
✓ Customer sincronizado correctamente (3 puntos)
✓ Invoice sincronizada correctamente (3 puntos)
✓ Payment sincronizado correctamente (3 puntos)
✓ Datos validados en QuickBooks (3 puntos)
✓ Logs exportados (3 puntos)
✓ Explicación clara del proceso (5 puntos)

Total: 20 puntos
Passing: 16+ puntos (80%)
```

### Certificación

**Participantes que aprueben ambas evaluaciones reciben:**

```
╔════════════════════════════════════════════════════════╗
║                                                        ║
║           SPIRIT TOURS - ERP HUB                       ║
║         CERTIFIED OPERATOR - USA                       ║
║                                                        ║
║    This certifies that [NAME] has successfully        ║
║    completed the Spirit Tours ERP Hub Training        ║
║    for USA operations and is authorized to:           ║
║                                                        ║
║    ✓ Manage ERP connections                           ║
║    ✓ Monitor and troubleshoot syncs                   ║
║    ✓ Configure account mappings                       ║
║    ✓ Resolve common issues                            ║
║                                                        ║
║    Date: November 2, 2025                             ║
║    Valid until: November 2, 2026                      ║
║    Certificate ID: USA-ERP-2025-001                   ║
║                                                        ║
║    ________________________                            ║
║    Training Manager                                    ║
╚════════════════════════════════════════════════════════╝
```

**Certificación incluye:**
- PDF certificate
- Digital badge para LinkedIn
- Acceso a canal Slack #erp-certified-operators
- Inclusión en lista de certified operators
- Re-certificación requerida cada año

---

## Apéndices

### Apéndice A: Glosario

**Adapter:** Componente que traduce entre Unified Models y formato ERP específico

**AR (Accounts Receivable):** Cuentas por cobrar

**COGS (Cost of Goods Sold):** Costo de ventas

**ERP (Enterprise Resource Planning):** Sistema de planificación de recursos empresariales

**OAuth 2.0:** Protocolo de autorización para acceso seguro a APIs

**PKCE (Proof Key for Code Exchange):** Extensión de OAuth 2.0 para mayor seguridad

**Rate Limiting:** Límite de requests por unidad de tiempo

**Realm ID (QuickBooks):** ID único de la company en QuickBooks

**Tenant (Xero):** Organization/company en Xero

**Unified Model:** Modelo estandarizado que representa entidades contables

### Apéndice B: Atajos de Teclado (Admin Panel)

```
Ctrl + K        : Quick search
Ctrl + /        : Toggle sidebar
Ctrl + Shift + L: Go to logs
Ctrl + Shift + M: Go to monitoring
Ctrl + Shift + C: Go to connections
R              : Retry selected sync
Esc            : Close modal
```

### Apéndice C: API Reference (para desarrolladores)

```javascript
// Sync Customer
POST /api/erp-hub/sync/customer
{
    "customerId": "CUST-001",
    "sucursalId": "USA_001",
    "providers": ["quickbooks", "xero"]
}

// Sync Invoice
POST /api/erp-hub/sync/invoice
{
    "invoiceId": "INV-001",
    "sucursalId": "USA_001",
    "providers": ["quickbooks", "xero"]
}

// Get Sync Status
GET /api/erp-hub/sync/status/:syncId

// Retry Failed Sync
POST /api/erp-hub/sync/:syncId/retry
```

### Apéndice D: Troubleshooting Flowchart

```
Sync Failed?
    ↓
    ├─ Error: "Token expired"
    │   └─> Re-authenticate OAuth
    │
    ├─ Error: "Duplicate customer"
    │   └─> Use existing customer or rename
    │
    ├─ Error: "Rate limit"
    │   └─> Wait and retry (automatic)
    │
    ├─ Error: "Validation failed"
    │   └─> Fix data in Spirit Tours
    │
    └─ Other error
        └─> Check logs → Escalate if needed
```

---

## 🎉 ¡Felicidades!

Has completado el training de ERP Hub USA. Ahora estás preparado para:

✅ Gestionar integraciones con QuickBooks, Xero y FreshBooks  
✅ Monitorear y troubleshoot sincronizaciones  
✅ Aplicar mejores prácticas de operación  
✅ Entrenar a otros team members  

**Next Steps:**
1. Completar evaluación
2. Obtener certificación
3. Comenzar operación en producción
4. Continuar aprendizaje en: https://spirittours.atlassian.net/wiki/ERP-Hub

**Questions?**  
📧 erp-support@spirittours.com  
💬 Slack: #erp-hub-support  

---

**Document Version:** 1.0.0  
**Last Updated:** November 2, 2025  
**Authors:** Spirit Tours Dev Team - GenSpark AI Developer  
**License:** Internal Use Only - Spirit Tours Confidential
