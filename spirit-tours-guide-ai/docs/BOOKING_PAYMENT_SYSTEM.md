# Sistema de Reservas y Pagos - Spirit Tours AI Guide

## 📋 Descripción General

El **Sistema de Reservas y Pagos** es una solución completa de comercio electrónico integrada en el Spirit Tours AI Guide System. Proporciona funcionalidad end-to-end para gestionar reservas de tours, procesamiento de pagos multi-gateway, gestión de inventario en tiempo real, precios dinámicos y manejo de cancelaciones/reembolsos.

### Características Principales

- ✅ **Gestión Completa de Reservas**: Flujo completo desde búsqueda de disponibilidad hasta confirmación
- ✅ **Multi-Gateway de Pagos**: Integración dual con Stripe y PayPal
- ✅ **Precios Dinámicos**: Motor de precios inteligente con múltiples factores
- ✅ **Prevención de Sobreventa**: Sistema de bloqueo con Redis para evitar double-booking
- ✅ **Multi-Moneda**: Soporte para 8 monedas internacionales
- ✅ **Códigos de Descuento**: Sistema de promociones y cupones
- ✅ **Cancelaciones y Reembolsos**: Procesamiento automático de reembolsos
- ✅ **Notificaciones en Tiempo Real**: WebSocket para actualizaciones instantáneas
- ✅ **Seguridad PCI**: Cumplimiento con estándares de seguridad de pagos
- ✅ **Idempotencia**: Prevención de cobros duplicados

---

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + TS)                     │
├─────────────────────┬───────────────────┬───────────────────┤
│  BookingInterface   │   PaymentForm     │  BookingManager   │
└─────────────────────┴───────────────────┴───────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    REST API Layer                            │
│              /api/bookings (20+ endpoints)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              BookingPaymentSystem (Core Engine)              │
├─────────────────────┬───────────────────┬───────────────────┤
│  Booking Logic      │  Pricing Engine   │  Payment Gateway  │
│  State Machine      │  Discount System  │  Refund Handler   │
└─────────────────────┴───────────────────┴───────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
┌───────────────────┐ ┌──────────────┐ ┌──────────────┐
│   PostgreSQL      │ │    Redis     │ │ Stripe/PayPal│
│   (6 tablas)      │ │  (Locks)     │ │   (APIs)     │
└───────────────────┘ └──────────────┘ └──────────────┘
```

### Flujo de Datos

1. **Usuario** selecciona fecha/hora/pasajeros → Frontend
2. **Frontend** consulta disponibilidad → API
3. **API** verifica capacidad (PostgreSQL) y locks (Redis)
4. **Motor de Precios** calcula precio dinámico
5. **Usuario** completa información y crea reserva
6. **Sistema** adquiere lock de Redis (10 min)
7. **Usuario** procesa pago vía Stripe/PayPal
8. **Gateway** confirma transacción
9. **Sistema** actualiza reserva, libera lock, envía notificaciones
10. **WebSocket** notifica confirmación en tiempo real

---

## 💾 Esquema de Base de Datos

### Tabla: `bookings`
Registros principales de reservas con toda la información del cliente y tour.

```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  booking_id VARCHAR(100) UNIQUE NOT NULL,           -- BK-{timestamp}-{random}
  user_id VARCHAR(100) NOT NULL,
  tour_id VARCHAR(100) NOT NULL,
  tour_date DATE NOT NULL,
  tour_time TIME,
  passengers_count INTEGER NOT NULL,
  passenger_details JSONB,                           -- Array de pasajeros
  base_price NUMERIC(10,2) NOT NULL,
  final_price NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  pricing_breakdown JSONB,                           -- Desglose detallado
  discount_code VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',              -- Estado de la reserva
  payment_status VARCHAR(50) DEFAULT 'pending',      -- Estado del pago
  payment_method VARCHAR(50),                        -- stripe/paypal
  payment_intent_id VARCHAR(255),                    -- Stripe PaymentIntent ID
  transaction_id VARCHAR(255),                       -- ID de transacción
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  special_requests TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_tour_date ON bookings(tour_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_booking_id ON bookings(booking_id);
```

**Estados de Reserva (status):**
- `pending`: Creada, esperando pago
- `confirmed`: Pago confirmado, reserva activa
- `cancelled`: Cancelada por usuario/admin
- `completed`: Tour completado exitosamente
- `refunded`: Reembolsada
- `no_show`: Cliente no se presentó

**Estados de Pago (payment_status):**
- `pending`: Esperando pago
- `processing`: Procesando pago
- `completed`: Pago exitoso
- `failed`: Pago fallido
- `refunded`: Reembolsado

---

### Tabla: `tour_availability`
Gestión de calendario y capacidad de tours.

```sql
CREATE TABLE tour_availability (
  id SERIAL PRIMARY KEY,
  tour_id VARCHAR(100) NOT NULL,
  route_id VARCHAR(100) NOT NULL,
  guide_id VARCHAR(100),                             -- Guía asignado (opcional)
  date DATE NOT NULL,
  time TIME NOT NULL,
  max_capacity INTEGER NOT NULL,                     -- Capacidad máxima
  booked_capacity INTEGER DEFAULT 0,                 -- Espacios reservados
  available_capacity INTEGER,                        -- Espacios disponibles
  base_price NUMERIC(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'available',            -- available/limited/full/cancelled
  weather_conditions VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tour_id, date, time)
);

CREATE INDEX idx_availability_tour_date ON tour_availability(tour_id, date);
CREATE INDEX idx_availability_status ON tour_availability(status);
```

---

### Tabla: `payment_transactions`
Registro de todas las transacciones de pago.

```sql
CREATE TABLE payment_transactions (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,       -- TXN-{timestamp}-{random}
  booking_id VARCHAR(100) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,               -- stripe/paypal
  payment_gateway_id VARCHAR(255),                   -- ID del gateway externo
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  status VARCHAR(50) NOT NULL,                       -- pending/completed/failed/refunded
  payment_details JSONB,                             -- Detalles del gateway
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
);

CREATE INDEX idx_transactions_booking_id ON payment_transactions(booking_id);
CREATE INDEX idx_transactions_status ON payment_transactions(status);
```

---

### Tabla: `invoices`
Generación y almacenamiento de facturas.

```sql
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,       -- INV-{year}-{sequential}
  booking_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  invoice_data JSONB NOT NULL,                       -- Datos completos de factura
  pdf_url VARCHAR(500),                              -- URL del PDF generado
  status VARCHAR(50) DEFAULT 'issued',               -- issued/paid/cancelled
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
);

CREATE INDEX idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
```

---

### Tabla: `discount_codes`
Gestión de códigos promocionales y descuentos.

```sql
CREATE TABLE discount_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,                  -- Código único (ej: SUMMER2025)
  description TEXT,
  discount_type VARCHAR(20) NOT NULL,                -- percentage/fixed
  discount_value NUMERIC(10,2) NOT NULL,             -- Valor del descuento
  max_discount NUMERIC(10,2),                        -- Descuento máximo (para %)
  min_purchase NUMERIC(10,2) DEFAULT 0,              -- Compra mínima requerida
  currency VARCHAR(10) DEFAULT 'USD',
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  max_uses INTEGER,                                  -- Usos máximos totales
  max_uses_per_user INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  applicable_tours JSONB,                            -- Array de tour IDs aplicables
  status VARCHAR(50) DEFAULT 'active',               -- active/inactive/expired
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_status ON discount_codes(status);
```

---

### Tabla: `booking_cancellations`
Registro de cancelaciones y motivos.

```sql
CREATE TABLE booking_cancellations (
  id SERIAL PRIMARY KEY,
  booking_id VARCHAR(100) NOT NULL,
  cancelled_by VARCHAR(100) NOT NULL,                -- user_id o 'admin' o 'system'
  cancellation_reason TEXT,
  refund_amount NUMERIC(10,2),
  refund_status VARCHAR(50),                         -- pending/processing/completed/failed
  refund_transaction_id VARCHAR(255),
  cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  refund_processed_at TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
);

CREATE INDEX idx_cancellations_booking_id ON booking_cancellations(booking_id);
```

---

## 💰 Motor de Precios Dinámicos

### Factores de Precio

El sistema calcula precios en tiempo real considerando múltiples factores que se aplican secuencialmente:

#### 1. **Precio Base**
```javascript
basePrice = tourAvailability.base_price * passengersCount
```

#### 2. **Multiplicador Estacional** (por mes)
```javascript
const seasonalMultipliers = {
  high: 1.3,    // Jun, Jul, Ago, Dic - Temporada alta
  medium: 1.0,  // Abr, May, Sep, Oct - Temporada media
  low: 0.8      // Ene, Feb, Mar, Nov - Temporada baja
};

// Mapeo de meses
highSeasonMonths = [6, 7, 8, 12];
lowSeasonMonths = [1, 2, 3, 11];
```

#### 3. **Multiplicador de Día de Semana**
```javascript
const dayMultipliers = {
  weekday: 0.9,   // Lun-Jue (10% descuento)
  weekend: 1.2    // Vie-Dom (20% premium)
};

isWeekend = dayOfWeek >= 5; // 5=Viernes, 6=Sábado, 7=Domingo
```

#### 4. **Descuentos por Grupo** (acumulativos)
```javascript
const groupDiscounts = {
  2: 0.95,   // 2-3 personas: 5% descuento
  4: 0.90,   // 4-7 personas: 10% descuento
  8: 0.85,   // 8-14 personas: 15% descuento
  15: 0.80   // 15+ personas: 20% descuento
};
```

#### 5. **Early Bird Discount** (reserva anticipada)
```javascript
const earlyBirdDays = 14;
const earlyBirdDiscount = 0.90; // 10% descuento

daysInAdvance = daysBetween(bookingDate, tourDate);
if (daysInAdvance >= earlyBirdDays) {
  applyDiscount(10%);
}
```

#### 6. **Last-Minute Deal** (reserva de última hora)
```javascript
const lastMinuteDays = 2;
const lastMinuteDiscount = 0.85; // 15% descuento

if (daysInAdvance <= lastMinuteDays) {
  applyDiscount(15%);
}
```

#### 7. **Código de Descuento** (opcional)
```javascript
if (discountCode && isValid(discountCode)) {
  if (discountCode.type === 'percentage') {
    discount = subtotal * (discountCode.value / 100);
    discount = Math.min(discount, discountCode.max_discount);
  } else if (discountCode.type === 'fixed') {
    discount = discountCode.value;
  }
  applyDiscount(discount);
}
```

### Algoritmo de Cálculo

```javascript
async calculatePricing(tourId, date, time, passengersCount, options) {
  // 1. Obtener precio base
  const availability = await getAvailability(tourId, date, time);
  let price = availability.base_price * passengersCount;
  
  // 2. Aplicar multiplicador estacional
  const month = new Date(date).getMonth() + 1;
  const seasonMultiplier = getSeasonalMultiplier(month);
  price *= seasonMultiplier;
  
  // 3. Aplicar multiplicador de día
  const dayOfWeek = new Date(date).getDay();
  const dayMultiplier = getDayMultiplier(dayOfWeek);
  price *= dayMultiplier;
  
  // 4. Aplicar descuento por grupo
  const groupDiscount = getGroupDiscount(passengersCount);
  price *= groupDiscount;
  
  // 5. Verificar early bird
  const daysInAdvance = daysBetween(new Date(), new Date(date));
  if (daysInAdvance >= 14) {
    price *= 0.90; // 10% descuento
  }
  
  // 6. Verificar last-minute
  if (daysInAdvance <= 2) {
    price *= 0.85; // 15% descuento
  }
  
  // 7. Aplicar código de descuento
  if (options.discountCode) {
    const codeDiscount = await validateDiscountCode(options.discountCode, price);
    price -= codeDiscount.amount;
  }
  
  // 8. Convertir moneda
  if (options.currency !== 'USD') {
    price = convertCurrency(price, 'USD', options.currency);
  }
  
  return {
    basePrice,
    finalPrice: price,
    currency: options.currency,
    breakdown: [...] // Desglose detallado
  };
}
```

### Ejemplo de Cálculo

**Escenario:**
- Tour: City Walking Tour
- Precio base: $50/persona
- Fecha: Sábado 15 de julio (temporada alta, fin de semana)
- Pasajeros: 6 personas
- Reserva: 20 días de anticipación
- Código: SUMMER15 (15% descuento)

**Cálculo:**
```
Base:           $50 × 6 = $300.00
Temporada alta: $300 × 1.3 = $390.00
Fin de semana:  $390 × 1.2 = $468.00
Grupo 6 pers:   $468 × 0.90 = $421.20
Early bird:     $421.20 × 0.90 = $379.08
Código 15%:     $379.08 - $56.86 = $322.22
─────────────────────────────────────────
TOTAL:          $322.22 USD
AHORRO:         $277.78 (46%)
```

---

## 💳 Integración de Pagos

### Stripe Integration

#### Flujo de Pago

1. **Frontend crea PaymentMethod**
```typescript
const { paymentMethod } = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement,
});
```

2. **Backend crea PaymentIntent**
```javascript
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(finalPrice * 100), // En centavos
  currency: currency.toLowerCase(),
  payment_method: paymentMethodId,
  confirm: true,
  metadata: {
    bookingId,
    tourId,
    userId,
  },
});
```

3. **Manejo de 3D Secure**
```javascript
if (paymentIntent.status === 'requires_action') {
  const { error } = await stripe.confirmCardPayment(
    paymentIntent.client_secret
  );
}
```

4. **Webhook de Confirmación**
```javascript
app.post('/api/bookings/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    STRIPE_WEBHOOK_SECRET
  );
  
  if (event.type === 'payment_intent.succeeded') {
    await confirmBooking(event.data.object.metadata.bookingId);
  }
});
```

#### Configuración Requerida

**.env:**
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Frontend:**
```typescript
const stripe = Stripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
```

---

### PayPal Integration

#### Flujo de Pago

1. **Backend crea Order**
```javascript
const request = new paypal.orders.OrdersCreateRequest();
request.prefer("return=representation");
request.requestBody({
  intent: 'CAPTURE',
  purchase_units: [{
    amount: {
      currency_code: currency,
      value: finalPrice.toFixed(2)
    },
    description: `${tour.name} - ${tourDate}`,
    custom_id: bookingId
  }]
});

const order = await paypalClient.execute(request);
```

2. **Frontend renderiza botones**
```javascript
paypal.Buttons({
  createOrder: () => orderId,
  onApprove: (data) => capturePayPalPayment(data.orderID)
}).render('#paypal-button-container');
```

3. **Backend captura pago**
```javascript
const request = new paypal.orders.OrdersCaptureRequest(orderId);
const capture = await paypalClient.execute(request);

if (capture.result.status === 'COMPLETED') {
  await confirmBooking(bookingId);
}
```

#### Configuración Requerida

**.env:**
```bash
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox # o 'live' para producción
```

---

## 🔒 Prevención de Double-Booking

### Sistema de Locks con Redis

El sistema utiliza Redis para implementar locks distribuidos que previenen que múltiples usuarios reserven el mismo espacio simultáneamente.

#### Arquitectura de Locks

```javascript
const lockKey = `booking:lock:${tourId}:${date}:${time}`;
const lockValue = bookingId; // Identificador único
const lockTTL = 600; // 10 minutos

// Adquirir lock (NX = solo si no existe)
const acquired = await redis.set(lockKey, lockValue, {
  NX: true,  // Solo si no existe
  EX: lockTTL // Expira en 10 minutos
});

if (!acquired) {
  throw new Error('Slot already being booked by another user');
}
```

#### Flujo de Lock Lifecycle

```
1. Usuario inicia reserva
   └─> Sistema adquiere lock (10 min TTL)
   
2. Usuario completa información (8 minutos)
   └─> Lock aún activo, otros usuarios bloqueados
   
3. Usuario procesa pago (1 minuto)
   └─> Pago confirmado
   
4. Sistema confirma reserva
   └─> Lock liberado manualmente
   
5. Si usuario abandona:
   └─> Lock expira automáticamente a los 10 min
   └─> Espacio vuelve disponible
```

#### Implementación Completa

```javascript
async createBooking(bookingData) {
  const { tourId, tourDate, tourTime, passengersCount } = bookingData;
  const bookingId = generateBookingId();
  
  // 1. Verificar disponibilidad
  const availability = await this.checkAvailability(
    tourId, tourDate, tourTime, passengersCount
  );
  
  if (!availability.available) {
    throw new Error('Insufficient capacity');
  }
  
  // 2. Intentar adquirir lock
  const lockKey = `booking:lock:${tourId}:${tourDate}:${tourTime}`;
  const lockAcquired = await this.redisClient.set(lockKey, bookingId, {
    NX: true,
    EX: 600 // 10 minutos
  });
  
  if (!lockAcquired) {
    throw new Error('This slot is currently being booked by another user');
  }
  
  try {
    // 3. Crear reserva en base de datos
    const booking = await this.db.query(`
      INSERT INTO bookings (...)
      VALUES (...)
      RETURNING *
    `);
    
    return { success: true, booking, lockKey };
    
  } catch (error) {
    // Si falla, liberar lock
    await this.redisClient.del(lockKey);
    throw error;
  }
}

async processPayment(bookingId, paymentData) {
  // 1. Procesar pago con Stripe/PayPal
  const payment = await processGatewayPayment(paymentData);
  
  // 2. Confirmar reserva
  await this.db.query(`
    UPDATE bookings 
    SET status = 'confirmed', payment_status = 'completed'
    WHERE booking_id = $1
  `, [bookingId]);
  
  // 3. Actualizar capacidad
  await this.updateAvailability(booking.tourId, booking.tourDate, booking.tourTime, -booking.passengersCount);
  
  // 4. LIBERAR LOCK
  const lockKey = `booking:lock:${booking.tourId}:${booking.tourDate}:${booking.tourTime}`;
  await this.redisClient.del(lockKey);
  
  // 5. Emitir eventos
  this.emit('booking:confirmed', { bookingId });
}
```

#### Manejo de Locks Huérfanos

Los locks tienen TTL automático de 10 minutos para evitar locks "huérfanos" por:
- Usuario cierra navegador
- Pérdida de conexión
- Error en el sistema
- Usuario abandona el proceso

```javascript
// Cleanup job (ejecutar cada 5 minutos)
async cleanupExpiredLocks() {
  const expiredLocks = await redis.keys('booking:lock:*');
  
  for (const lockKey of expiredLocks) {
    const ttl = await redis.ttl(lockKey);
    if (ttl <= 0) {
      await redis.del(lockKey);
      logger.info(`Cleaned up expired lock: ${lockKey}`);
    }
  }
}
```

---

## 🌍 Sistema Multi-Moneda

### Monedas Soportadas

| Código | Moneda | Símbolo | Tasa (vs USD) |
|--------|--------|---------|---------------|
| USD | US Dollar | $ | 1.00 |
| EUR | Euro | € | 0.92 |
| GBP | British Pound | £ | 0.79 |
| JPY | Japanese Yen | ¥ | 149.50 |
| CAD | Canadian Dollar | C$ | 1.35 |
| AUD | Australian Dollar | A$ | 1.52 |
| CHF | Swiss Franc | CHF | 0.88 |
| CNY | Chinese Yuan | ¥ | 7.24 |

### Conversión de Moneda

```javascript
convertCurrency(amount, fromCurrency, toCurrency) {
  const rateFrom = this.currencyRates[fromCurrency];
  const rateTo = this.currencyRates[toCurrency];
  
  if (!rateFrom || !rateTo) {
    throw new Error('Unsupported currency');
  }
  
  // Convertir a USD primero, luego a moneda destino
  const usdAmount = amount / rateFrom;
  const convertedAmount = usdAmount * rateTo;
  
  return Math.round(convertedAmount * 100) / 100; // 2 decimales
}
```

### Actualización de Tasas

**Recomendación:** Integrar API de tasas de cambio (ej: exchangerate-api.com)

```javascript
async updateCurrencyRates() {
  try {
    const response = await axios.get(
      'https://api.exchangerate-api.com/v4/latest/USD'
    );
    
    this.currencyRates = {
      USD: 1.0,
      EUR: response.data.rates.EUR,
      GBP: response.data.rates.GBP,
      JPY: response.data.rates.JPY,
      CAD: response.data.rates.CAD,
      AUD: response.data.rates.AUD,
      CHF: response.data.rates.CHF,
      CNY: response.data.rates.CNY,
    };
    
    logger.info('Currency rates updated successfully');
  } catch (error) {
    logger.error('Failed to update currency rates:', error);
  }
}

// Ejecutar diariamente
setInterval(() => this.updateCurrencyRates(), 24 * 60 * 60 * 1000);
```

---

## 🔔 Sistema de Eventos en Tiempo Real

### Eventos Emitidos

El sistema emite eventos a través de EventEmitter (backend) y WebSocket (frontend):

#### 1. `booking:created`
```javascript
{
  bookingId: 'BK-1729512347-abc123',
  userId: 'user123',
  tourId: 'tour456',
  tourDate: '2025-07-15',
  status: 'pending',
  amount: 322.22,
  currency: 'USD'
}
```

#### 2. `booking:confirmed`
```javascript
{
  bookingId: 'BK-1729512347-abc123',
  userId: 'user123',
  confirmedAt: '2025-10-21T10:30:00Z',
  transactionId: 'TXN-1729512400-xyz789'
}
```

#### 3. `payment:completed`
```javascript
{
  transactionId: 'TXN-1729512400-xyz789',
  bookingId: 'BK-1729512347-abc123',
  amount: 322.22,
  currency: 'USD',
  paymentMethod: 'stripe',
  gatewayId: 'pi_...'
}
```

#### 4. `booking:cancelled`
```javascript
{
  bookingId: 'BK-1729512347-abc123',
  userId: 'user123',
  cancelledBy: 'user123',
  reason: 'Change of plans',
  refundAmount: 322.22,
  refundStatus: 'pending'
}
```

#### 5. `refund:processed`
```javascript
{
  bookingId: 'BK-1729512347-abc123',
  refundTransactionId: 'RFD-1729512500-def456',
  amount: 322.22,
  currency: 'USD',
  status: 'completed'
}
```

### Integración WebSocket

**Backend (server.js):**
```javascript
bookingSystem.on('booking:created', (data) => {
  io.to(`user-${data.userId}`).emit('booking-created', data);
});

bookingSystem.on('booking:confirmed', (data) => {
  io.to(`user-${data.userId}`).emit('booking-confirmed', data);
  io.to('admin').emit('new-booking', data);
});

bookingSystem.on('payment:completed', (data) => {
  io.to(`booking-${data.bookingId}`).emit('payment-completed', data);
});
```

**Frontend (React):**
```typescript
useEffect(() => {
  const socket = io(API_URL);
  
  socket.on('booking-confirmed', (data) => {
    toast.success(`Booking ${data.bookingId} confirmed!`);
    refreshBookings();
  });
  
  socket.on('payment-completed', (data) => {
    setPaymentStatus('completed');
  });
  
  return () => socket.disconnect();
}, []);
```

---

## 🎫 Códigos de Descuento

### Tipos de Descuento

#### 1. Porcentaje (percentage)
```javascript
{
  code: 'SUMMER25',
  discount_type: 'percentage',
  discount_value: 25.00,        // 25% de descuento
  max_discount: 100.00,         // Máximo $100 de descuento
  min_purchase: 200.00          // Compra mínima $200
}
```

#### 2. Monto Fijo (fixed)
```javascript
{
  code: 'WELCOME50',
  discount_type: 'fixed',
  discount_value: 50.00,        // $50 de descuento
  min_purchase: 100.00          // Compra mínima $100
}
```

### Validación de Códigos

```javascript
async validateDiscountCode(code, amount) {
  // 1. Buscar código en BD
  const discount = await db.query(
    'SELECT * FROM discount_codes WHERE code = $1 AND status = $2',
    [code, 'active']
  );
  
  if (!discount) {
    return { valid: false, error: 'Invalid code' };
  }
  
  // 2. Verificar fechas
  const now = new Date();
  if (now < discount.valid_from || now > discount.valid_until) {
    return { valid: false, error: 'Code expired' };
  }
  
  // 3. Verificar usos
  if (discount.max_uses && discount.current_uses >= discount.max_uses) {
    return { valid: false, error: 'Code usage limit reached' };
  }
  
  // 4. Verificar compra mínima
  if (amount < discount.min_purchase) {
    return { 
      valid: false, 
      error: `Minimum purchase $${discount.min_purchase} required` 
    };
  }
  
  // 5. Calcular descuento
  let discountAmount = 0;
  if (discount.discount_type === 'percentage') {
    discountAmount = amount * (discount.discount_value / 100);
    if (discount.max_discount) {
      discountAmount = Math.min(discountAmount, discount.max_discount);
    }
  } else {
    discountAmount = discount.discount_value;
  }
  
  return {
    valid: true,
    discountAmount,
    description: discount.description
  };
}
```

### Crear Código de Descuento (Admin)

```javascript
POST /api/bookings/discount/create
{
  "code": "SUMMER2025",
  "description": "Summer promotion - 25% off",
  "discount_type": "percentage",
  "discount_value": 25,
  "max_discount": 100,
  "min_purchase": 200,
  "valid_from": "2025-06-01T00:00:00Z",
  "valid_until": "2025-08-31T23:59:59Z",
  "max_uses": 1000,
  "max_uses_per_user": 1,
  "applicable_tours": ["tour1", "tour2", "tour3"]
}
```

---

## 💸 Cancelaciones y Reembolsos

### Políticas de Cancelación

**Configuración actual (100% reembolso):**
```javascript
calculateRefundAmount(booking) {
  const daysUntilTour = daysBetween(new Date(), new Date(booking.tourDate));
  
  // Política flexible: 100% reembolso siempre
  return booking.finalPrice;
  
  /* Política alternativa (por implementar):
  if (daysUntilTour >= 7) {
    return booking.finalPrice;           // 100% si >7 días
  } else if (daysUntilTour >= 3) {
    return booking.finalPrice * 0.75;    // 75% si 3-6 días
  } else if (daysUntilTour >= 1) {
    return booking.finalPrice * 0.50;    // 50% si 1-2 días
  } else {
    return 0;                            // Sin reembolso <24h
  }
  */
}
```

### Proceso de Cancelación

```javascript
async cancelBooking(bookingId, cancelledBy, reason, processRefund = true) {
  // 1. Obtener reserva
  const booking = await getBooking(bookingId);
  
  if (booking.status === 'cancelled') {
    throw new Error('Booking already cancelled');
  }
  
  // 2. Calcular reembolso
  const refundAmount = calculateRefundAmount(booking);
  
  // 3. Actualizar reserva
  await db.query(`
    UPDATE bookings 
    SET status = 'cancelled', cancelled_at = NOW()
    WHERE booking_id = $1
  `, [bookingId]);
  
  // 4. Registrar cancelación
  await db.query(`
    INSERT INTO booking_cancellations 
    (booking_id, cancelled_by, cancellation_reason, refund_amount, refund_status)
    VALUES ($1, $2, $3, $4, 'pending')
  `, [bookingId, cancelledBy, reason, refundAmount]);
  
  // 5. Procesar reembolso
  if (processRefund && refundAmount > 0) {
    await processRefund(booking, refundAmount);
  }
  
  // 6. Liberar capacidad
  await updateAvailability(
    booking.tourId, 
    booking.tourDate, 
    booking.tourTime, 
    booking.passengersCount  // Devolver espacios
  );
  
  // 7. Emitir eventos
  this.emit('booking:cancelled', { bookingId, refundAmount });
}
```

### Procesamiento de Reembolsos

#### Stripe Refund
```javascript
async processStripeRefund(booking, amount) {
  const refund = await stripe.refunds.create({
    payment_intent: booking.payment_intent_id,
    amount: Math.round(amount * 100), // Centavos
    metadata: {
      bookingId: booking.booking_id,
      reason: 'Customer cancellation'
    }
  });
  
  // Registrar transacción de reembolso
  await db.query(`
    INSERT INTO payment_transactions
    (transaction_id, booking_id, payment_method, amount, currency, status)
    VALUES ($1, $2, 'stripe_refund', $3, $4, 'completed')
  `, [refund.id, booking.booking_id, amount, booking.currency]);
  
  // Actualizar estado de cancelación
  await db.query(`
    UPDATE booking_cancellations
    SET refund_status = 'completed', 
        refund_transaction_id = $1,
        refund_processed_at = NOW()
    WHERE booking_id = $2
  `, [refund.id, booking.booking_id]);
  
  this.emit('refund:processed', {
    bookingId: booking.booking_id,
    refundId: refund.id,
    amount
  });
}
```

#### PayPal Refund
```javascript
async processPayPalRefund(booking, amount) {
  // Obtener captura original
  const captureId = booking.payment_details.captureId;
  
  const request = new paypal.payments.CapturesRefundRequest(captureId);
  request.requestBody({
    amount: {
      currency_code: booking.currency,
      value: amount.toFixed(2)
    }
  });
  
  const refund = await this.paypalClient.execute(request);
  
  // Registrar transacción
  await db.query(`
    INSERT INTO payment_transactions
    (transaction_id, booking_id, payment_method, amount, currency, status)
    VALUES ($1, $2, 'paypal_refund', $3, $4, 'completed')
  `, [refund.result.id, booking.booking_id, amount, booking.currency]);
  
  // Actualizar cancelación
  await db.query(`
    UPDATE booking_cancellations
    SET refund_status = 'completed',
        refund_transaction_id = $1,
        refund_processed_at = NOW()
    WHERE booking_id = $2
  `, [refund.result.id, booking.booking_id]);
  
  this.emit('refund:processed', {
    bookingId: booking.booking_id,
    refundId: refund.result.id,
    amount
  });
}
```

---

## 📊 API Endpoints

### Disponibilidad

#### GET `/api/bookings/availability/check`
Verificar disponibilidad para fecha/hora específica.

**Query Params:**
- `tourId` (string, required)
- `date` (string, required, formato: YYYY-MM-DD)
- `time` (string, required, formato: HH:MM)
- `passengers` (number, required)

**Response:**
```json
{
  "available": true,
  "availableCapacity": 8,
  "maxCapacity": 12,
  "basePrice": 50.00,
  "date": "2025-07-15",
  "time": "10:00"
}
```

---

#### GET `/api/bookings/availability/dates`
Obtener fechas disponibles para un mes.

**Query Params:**
- `tourId` (string, required)
- `month` (number, required, 1-12)
- `year` (number, required)

**Response:**
```json
{
  "tourId": "tour123",
  "month": 7,
  "year": 2025,
  "dates": [
    {
      "date": "2025-07-15",
      "availableSlots": 10,
      "status": "available"
    },
    {
      "date": "2025-07-16",
      "availableSlots": 3,
      "status": "limited"
    },
    {
      "date": "2025-07-17",
      "availableSlots": 0,
      "status": "full"
    }
  ]
}
```

---

#### GET `/api/bookings/availability/times`
Obtener horarios disponibles para una fecha.

**Query Params:**
- `tourId` (string, required)
- `date` (string, required, formato: YYYY-MM-DD)

**Response:**
```json
{
  "tourId": "tour123",
  "date": "2025-07-15",
  "times": [
    {
      "time": "10:00",
      "available": true,
      "availableCapacity": 12,
      "maxCapacity": 12,
      "basePrice": 50.00
    },
    {
      "time": "14:00",
      "available": true,
      "availableCapacity": 8,
      "maxCapacity": 12,
      "basePrice": 50.00
    },
    {
      "time": "18:00",
      "available": false,
      "availableCapacity": 0,
      "maxCapacity": 12,
      "basePrice": 50.00
    }
  ]
}
```

---

### Precios

#### POST `/api/bookings/pricing/calculate`
Calcular precio dinámico con todos los descuentos.

**Body:**
```json
{
  "tourId": "tour123",
  "date": "2025-07-15",
  "time": "10:00",
  "passengers": 6,
  "discountCode": "SUMMER15",
  "currency": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "pricing": {
    "basePrice": 300.00,
    "seasonalMultiplier": 1.3,
    "dayOfWeekMultiplier": 1.2,
    "groupDiscount": 0.90,
    "earlyBirdDiscount": 0.90,
    "discountCodeAmount": 56.86,
    "subtotal": 468.00,
    "finalPrice": 322.22,
    "currency": "USD",
    "discountDetails": [
      "Base: 6 passengers × $50.00",
      "High season: +30%",
      "Weekend premium: +20%",
      "Group discount (6 people): -10%",
      "Early bird (20 days advance): -10%",
      "Discount code SUMMER15: -15%"
    ]
  }
}
```

---

### Reservas

#### POST `/api/bookings/create`
Crear nueva reserva (adquiere lock).

**Body:**
```json
{
  "tourId": "tour123",
  "tourDate": "2025-07-15",
  "tourTime": "10:00",
  "passengersCount": 6,
  "passengerDetails": [
    {
      "name": "John Doe",
      "age": 35,
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    {
      "name": "Jane Doe",
      "age": 32
    }
  ],
  "contactName": "John Doe",
  "contactEmail": "john@example.com",
  "contactPhone": "+1234567890",
  "discountCode": "SUMMER15",
  "currency": "USD",
  "specialRequests": "Vegetarian meal option"
}
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "bookingId": "BK-1729512347-abc123",
    "userId": "user123",
    "status": "pending",
    "paymentStatus": "pending",
    "finalPrice": 322.22,
    "currency": "USD",
    "lockKey": "booking:lock:tour123:2025-07-15:10:00",
    "expiresAt": "2025-10-21T10:40:00Z"
  }
}
```

---

#### GET `/api/bookings/:bookingId`
Obtener detalles de reserva.

**Response:**
```json
{
  "booking": {
    "bookingId": "BK-1729512347-abc123",
    "userId": "user123",
    "tourId": "tour123",
    "tourName": "City Walking Tour",
    "tourDate": "2025-07-15",
    "tourTime": "10:00",
    "passengersCount": 6,
    "passengerDetails": [...],
    "basePrice": 300.00,
    "finalPrice": 322.22,
    "currency": "USD",
    "pricingBreakdown": {...},
    "status": "confirmed",
    "paymentStatus": "completed",
    "paymentMethod": "stripe",
    "transactionId": "TXN-1729512400-xyz789",
    "contactName": "John Doe",
    "contactEmail": "john@example.com",
    "contactPhone": "+1234567890",
    "createdAt": "2025-10-21T10:30:00Z",
    "confirmedAt": "2025-10-21T10:35:00Z"
  }
}
```

---

#### GET `/api/bookings/user/:userId`
Obtener todas las reservas de un usuario.

**Query Params:**
- `status` (string, optional): Filter por estado
- `limit` (number, optional, default: 50)
- `offset` (number, optional, default: 0)

**Response:**
```json
{
  "userId": "user123",
  "total": 15,
  "bookings": [...]
}
```

---

#### POST `/api/bookings/:bookingId/cancel`
Cancelar reserva y procesar reembolso.

**Body:**
```json
{
  "reason": "Change of plans",
  "processRefund": true
}
```

**Response:**
```json
{
  "success": true,
  "bookingId": "BK-1729512347-abc123",
  "status": "cancelled",
  "refundAmount": 322.22,
  "refundStatus": "processing",
  "message": "Booking cancelled successfully. Refund will be processed within 5-10 business days."
}
```

---

### Pagos

#### POST `/api/bookings/:bookingId/stripe/intent`
Crear Stripe PaymentIntent.

**Response:**
```json
{
  "clientSecret": "pi_...secret",
  "paymentIntentId": "pi_...",
  "amount": 32222,
  "currency": "usd"
}
```

---

#### POST `/api/bookings/:bookingId/pay/stripe`
Procesar pago con Stripe.

**Body:**
```json
{
  "paymentMethodId": "pm_..."
}
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "bookingId": "BK-1729512347-abc123",
    "status": "confirmed",
    "paymentStatus": "completed"
  },
  "transaction": {
    "transactionId": "TXN-1729512400-xyz789",
    "amount": 322.22,
    "currency": "USD",
    "paymentMethod": "stripe"
  }
}
```

---

#### POST `/api/bookings/:bookingId/paypal/order`
Crear PayPal Order.

**Response:**
```json
{
  "orderId": "...",
  "links": [...]
}
```

---

#### POST `/api/bookings/:bookingId/pay/paypal`
Capturar pago de PayPal.

**Body:**
```json
{
  "paypalOrderId": "..."
}
```

**Response:**
```json
{
  "success": true,
  "booking": {...},
  "transaction": {...}
}
```

---

#### POST `/api/bookings/webhooks/stripe`
Webhook handler para eventos de Stripe.

**Headers:**
- `stripe-signature`: Firma HMAC del webhook

**Body:** Event object de Stripe

---

### Descuentos

#### POST `/api/bookings/discount/validate`
Validar código de descuento.

**Body:**
```json
{
  "code": "SUMMER15",
  "amount": 400.00
}
```

**Response:**
```json
{
  "valid": true,
  "code": "SUMMER15",
  "discountAmount": 60.00,
  "description": "Summer promotion - 15% off"
}
```

---

#### POST `/api/bookings/discount/create` (Admin)
Crear nuevo código de descuento.

**Body:** (ver sección Códigos de Descuento)

**Response:**
```json
{
  "success": true,
  "code": {
    "id": 123,
    "code": "SUMMER2025",
    "status": "active",
    ...
  }
}
```

---

### Reportes

#### GET `/api/bookings/stats`
Estadísticas generales del sistema.

**Response:**
```json
{
  "total_bookings": 1234,
  "total_revenue": 125678.90,
  "active_bookings": 45,
  "completed_bookings": 1089,
  "cancelled_bookings": 100,
  "pending_payments": 12,
  "average_booking_value": 101.87,
  "total_passengers": 3456
}
```

---

#### GET `/api/bookings/reports/revenue`
Reporte de ingresos.

**Query Params:**
- `startDate` (string, required, formato: YYYY-MM-DD)
- `endDate` (string, required)
- `groupBy` (string, optional: 'day'|'week'|'month', default: 'day')
- `currency` (string, optional, default: 'USD')

**Response:**
```json
{
  "startDate": "2025-07-01",
  "endDate": "2025-07-31",
  "currency": "USD",
  "totalRevenue": 45678.90,
  "totalBookings": 234,
  "data": [
    {
      "period": "2025-07-01",
      "revenue": 1234.56,
      "bookings": 12,
      "passengers": 34
    },
    ...
  ]
}
```

---

#### GET `/api/bookings/:bookingId/invoice`
Obtener factura de reserva.

**Response:**
```json
{
  "invoice": {
    "invoiceNumber": "INV-2025-001234",
    "bookingId": "BK-1729512347-abc123",
    "issuedAt": "2025-10-21T10:35:00Z",
    "amount": 322.22,
    "currency": "USD",
    "status": "paid",
    "pdfUrl": "https://..."
  }
}
```

---

## 🚀 Configuración e Instalación

### Requisitos Previos

- Node.js 16+
- PostgreSQL 13+
- Redis 6+
- Cuenta Stripe (Sandbox o Live)
- Cuenta PayPal Developer

### Variables de Entorno

Crear archivo `.env`:

```bash
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/spirittours
REDIS_URL=redis://localhost:6379

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox  # o 'live'

# Server
PORT=3000
NODE_ENV=development

# Frontend
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_...
REACT_APP_PAYPAL_CLIENT_ID=...
```

### Instalación

```bash
# Backend
cd spirit-tours-guide-ai/backend
npm install stripe @paypal/checkout-server-sdk ioredis pg

# Frontend
cd ../frontend
npm install axios lucide-react
```

### Inicialización de Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE spirittours;

# Ejecutar scripts de inicialización
\c spirittours
\i backend/schema/booking_tables.sql
```

### Configuración de Stripe

1. Crear cuenta en [stripe.com](https://stripe.com)
2. Obtener claves de API (Dashboard → Developers → API Keys)
3. Configurar webhook:
   - URL: `https://yourdomain.com/api/bookings/webhooks/stripe`
   - Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copiar signing secret del webhook

### Configuración de PayPal

1. Crear cuenta en [developer.paypal.com](https://developer.paypal.com)
2. Crear App en Dashboard
3. Obtener Client ID y Secret
4. Configurar Return URL y webhooks (opcional)

### Ejecución

```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm start
```

---

## 🧪 Testing

### Tests de Disponibilidad

```bash
# Verificar disponibilidad
curl "http://localhost:3000/api/bookings/availability/check?tourId=tour123&date=2025-07-15&time=10:00&passengers=4"

# Obtener fechas disponibles
curl "http://localhost:3000/api/bookings/availability/dates?tourId=tour123&month=7&year=2025"
```

### Tests de Precios

```bash
# Calcular precio
curl -X POST http://localhost:3000/api/bookings/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "tourId": "tour123",
    "date": "2025-07-15",
    "time": "10:00",
    "passengers": 6,
    "currency": "USD"
  }'
```

### Tests de Reserva

```bash
# Crear reserva
curl -X POST http://localhost:3000/api/bookings/create \
  -H "Content-Type: application/json" \
  -d '{
    "tourId": "tour123",
    "tourDate": "2025-07-15",
    "tourTime": "10:00",
    "passengersCount": 2,
    "passengerDetails": [
      {"name": "Test User", "email": "test@example.com"}
    ],
    "contactName": "Test User",
    "contactEmail": "test@example.com",
    "contactPhone": "+1234567890",
    "currency": "USD"
  }'
```

### Tests de Pago (Stripe)

Usar tarjetas de prueba de Stripe:
- Éxito: `4242 4242 4242 4242`
- 3D Secure: `4000 0025 0000 3155`
- Fallo: `4000 0000 0000 0002`

---

## 📈 Métricas y Monitoreo

### KPIs Principales

- **Conversion Rate**: % de reservas confirmadas vs creadas
- **Average Booking Value**: Valor promedio de reserva
- **Abandonment Rate**: % de reservas abandonadas (locks expirados)
- **Payment Success Rate**: % de pagos exitosos
- **Refund Rate**: % de reservas canceladas/reembolsadas

### Queries de Monitoreo

```sql
-- Conversion rate (últimos 30 días)
SELECT 
  COUNT(*) FILTER (WHERE status = 'confirmed') * 100.0 / COUNT(*) as conversion_rate
FROM bookings
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Revenue por día
SELECT 
  DATE(confirmed_at) as date,
  SUM(final_price) as daily_revenue,
  COUNT(*) as bookings_count
FROM bookings
WHERE status = 'confirmed'
  AND confirmed_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(confirmed_at)
ORDER BY date DESC;

-- Locks activos
SELECT COUNT(*) 
FROM redis_keys
WHERE key LIKE 'booking:lock:%';

-- Tasa de abandono
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending' AND created_at < NOW() - INTERVAL '10 minutes') * 100.0 / COUNT(*) as abandonment_rate
FROM bookings
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

---

## 🔐 Seguridad

### Medidas Implementadas

1. **PCI Compliance**:
   - No almacenamiento de datos de tarjetas
   - Uso de PaymentMethods tokenizados
   - Comunicación HTTPS exclusivamente

2. **Webhook Security**:
   - Verificación de firma HMAC (Stripe)
   - Validación de origen (PayPal)
   - Rate limiting en endpoints

3. **SQL Injection Prevention**:
   - Uso de prepared statements
   - Validación de inputs
   - Sanitización de datos

4. **XSS Protection**:
   - Sanitización de outputs
   - Content Security Policy headers
   - Escape de datos JSON

5. **CSRF Protection**:
   - Tokens CSRF en formularios
   - SameSite cookies
   - CORS configurado

6. **Idempotency**:
   - Transaction IDs únicos
   - Verificación de duplicados
   - Locks de Redis

---

## 🎯 Mejoras Futuras

### Corto Plazo (1-2 meses)
- [ ] Integración con más gateways (Apple Pay, Google Pay)
- [ ] Sistema de recomendación de precios con ML
- [ ] Notificaciones push para confirmaciones
- [ ] Exportación de reportes en PDF/Excel
- [ ] Dashboard de admin para gestión de reservas

### Medio Plazo (3-6 meses)
- [ ] Sistema de fidelización y puntos
- [ ] Reservas grupales con líder de grupo
- [ ] Integración con calendarios (Google Calendar, iCal)
- [ ] Chat en vivo durante el checkout
- [ ] Sistema de revisión automática de precios

### Largo Plazo (6-12 meses)
- [ ] Marketplace de tours de terceros
- [ ] Dynamic pricing con AI (demanda, clima, eventos)
- [ ] Blockchain para verificación de tickets
- [ ] Realidad aumentada para preview de tours
- [ ] Integración con sistemas de transporte

---

## 📞 Soporte

### Documentación Relacionada
- [Sistema de Analíticas Avanzadas](./ADVANCED_ANALYTICS_SYSTEM.md)
- [Sistema de Gamificación](./GAMIFICATION_SYSTEM.md)
- [Integración WhatsApp Business](./WHATSAPP_BUSINESS_INTEGRATION.md)

### Contacto
- Email: dev@spirittours.com
- Slack: #booking-system
- GitHub Issues: [spirit-tours-guide-ai/issues](https://github.com/...)

---

## 📄 Licencia

Copyright © 2025 Spirit Tours AI Guide System. Todos los derechos reservados.

---

**Última Actualización:** 21 de octubre de 2025  
**Versión:** 1.0.0  
**Autor:** GenSpark AI Developer Team
