# 📚 ESCENARIOS DETALLADOS - Sistema Contable Spirit Tours

Explicación profunda con casos reales y ejemplos paso a paso.

---

## 🎬 ESCENARIO 1: Tour Completo sin Problemas

### Contexto
- **Cliente:** Carlos Ramírez (B2C directo)
- **Tour:** Chichén Itzá + Cenote (2 personas)
- **Fecha:** 15 Noviembre 2024
- **Precio Total:** $12,000 MXN
- **Operador:** Maya Tours (cobra $8,000)
- **Comisión Guía:** $500
- **Sucursal:** Cancún

### Timeline Detallado

#### **DÍA 1 - Reserva (1 Nov)**

**Acción del Cliente:**
```
Carlos navega el sitio → Selecciona tour → Completa formulario
```

**En el Sistema (Automático):**
```sql
-- 1. Se crea el trip
INSERT INTO trips (
    trip_id,
    booking_reference,
    customer_id,
    status,
    channel,
    total_amount,
    paid_amount,
    departure_date,
    sucursal_id
) VALUES (
    'trip-001',
    'ST-2024-1234',
    'carlos-uuid',
    'pending',  -- Pendiente hasta que pague
    'b2c',
    12000.00,
    0.00,
    '2024-11-15 08:00:00',
    'cancun'
);

-- 2. Se crea cuenta por cobrar automáticamente
INSERT INTO cuentas_por_cobrar (
    folio,
    trip_id,
    customer_id,
    sucursal_id,
    monto_total,
    monto_pendiente,
    fecha_vencimiento,
    status
) VALUES (
    'CXC-2024-1001',
    'trip-001',
    'carlos-uuid',
    'cancun',
    12000.00,
    12000.00,
    NOW() + INTERVAL '3 days',  -- Debe pagar en 3 días
    'pendiente'
);

-- 3. Se programa pago al operador (NO se ejecuta aún)
INSERT INTO cuentas_por_pagar (
    folio,
    trip_id,
    proveedor_id,
    concepto,
    monto_total,
    monto_pendiente,
    fecha_vencimiento,
    sucursal_id,
    status
) VALUES (
    'CXP-2024-2001',
    'trip-001',
    'maya-tours-uuid',
    'Tour Chichén Itzá 2 pax',
    8000.00,
    8000.00,
    '2024-11-16',  -- 1 día después del tour
    'cancun',
    'pendiente'  -- NO autorizado hasta confirmar tour
);
```

**Email Automático al Cliente:**
```
De: reservas@spirittours.com
Para: carlos@email.com
Asunto: Confirmación Reserva ST-2024-1234

Hola Carlos,

Tu reserva está confirmada. Detalles:

📅 Tour: Chichén Itzá + Cenote
👥 Personas: 2
🗓️ Fecha: 15 Nov 2024, 8:00 AM
💰 Total: $12,000 MXN

⚠️ IMPORTANTE: Tu reserva está PENDIENTE hasta recibir el pago.

Puedes pagar:
1. Transferencia bancaria
2. Tarjeta de crédito (link abajo)
3. Efectivo en oficina

Fecha límite: 4 Noviembre

[PAGAR AHORA]

Folio: ST-2024-1234
```

---

#### **DÍA 2 - Pago Parcial (2 Nov)**

**Acción del Cliente:**
```
Carlos hace transferencia de $6,000 (50%)
```

**En el Sistema (Manual - Contador registra):**
```sql
-- Registrar pago recibido
INSERT INTO pagos_recibidos (
    folio,
    cxc_id,
    monto,
    metodo_pago,
    referencia,
    banco,
    fecha_pago,
    sucursal_id,
    comprobante_url,
    registrado_por
) VALUES (
    'PAG-IN-2024-3001',
    'cxc-1001-uuid',
    6000.00,
    'transferencia',
    'BBVA-123456789',
    'BBVA Bancomer',
    '2024-11-02 14:32:00',
    'cancun',
    's3://comprobantes/pag-3001.pdf',
    'contador-maria-uuid'
);

-- Actualizar cuenta por cobrar
UPDATE cuentas_por_cobrar
SET 
    monto_pagado = 6000.00,
    monto_pendiente = 6000.00,
    status = 'parcial',  -- Cambió de 'pendiente' a 'parcial'
    ultimo_pago = NOW()
WHERE folio = 'CXC-2024-1001';

-- Actualizar trip
UPDATE trips
SET 
    paid_amount = 6000.00,
    payment_status = 'partial'
WHERE trip_id = 'trip-001';

-- Registro en auditoría
INSERT INTO auditoria_financiera (
    tabla_afectada,
    registro_id,
    accion,
    usuario_id,
    datos_anteriores,
    datos_nuevos,
    comentario
) VALUES (
    'cuentas_por_cobrar',
    'cxc-1001-uuid',
    'update',
    'contador-maria-uuid',
    '{"monto_pendiente": 12000, "status": "pendiente"}',
    '{"monto_pendiente": 6000, "status": "parcial"}',
    'Pago parcial 50% recibido por transferencia'
);
```

**Notificación Automática al Cliente:**
```
💰 Pago Recibido ✅

Hola Carlos,

Recibimos tu pago de $6,000 MXN

Saldo pendiente: $6,000 MXN
Fecha límite: 4 Noviembre

[VER ESTADO DE CUENTA]

Gracias,
Spirit Tours
```

---

#### **DÍA 4 - Pago Final (4 Nov)**

**Acción del Cliente:**
```
Carlos paga saldo de $6,000 con tarjeta
```

**En el Sistema (Automático desde Stripe):**
```sql
-- Webhook de Stripe registra pago
INSERT INTO pagos_recibidos (
    folio,
    cxc_id,
    monto,
    metodo_pago,
    referencia,
    gateway,
    fecha_pago,
    sucursal_id,
    registrado_automatico
) VALUES (
    'PAG-IN-2024-3002',
    'cxc-1001-uuid',
    6000.00,
    'tarjeta_credito',
    'stripe-ch_1234567890',
    'Stripe',
    NOW(),
    'cancun',
    true  -- Webhook automático
);

-- Actualizar CXC a COBRADO
UPDATE cuentas_por_cobrar
SET 
    monto_pagado = 12000.00,
    monto_pendiente = 0.00,
    status = 'cobrado',  -- ✅ PAGADO COMPLETO
    fecha_cobro_total = NOW()
WHERE folio = 'CXC-2024-1001';

-- Actualizar trip a UPCOMING (listo para salir)
UPDATE trips
SET 
    paid_amount = 12000.00,
    payment_status = 'paid',
    status = 'upcoming'  -- Ahora sí está confirmado
WHERE trip_id = 'trip-001';

-- Notificar al operador automáticamente
INSERT INTO notificaciones_operador (
    operador_id,
    trip_id,
    tipo,
    mensaje
) VALUES (
    'maya-tours-uuid',
    'trip-001',
    'tour_confirmado',
    'Tour ST-2024-1234 confirmado para 15-Nov. 2 pax.'
);
```

**Email al Cliente:**
```
✅ Pago Completo Recibido

Hola Carlos,

¡Perfecto! Tu tour está 100% confirmado.

📅 15 Noviembre 2024
🕐 Pickup: 8:00 AM
📍 Ubicación: Tu hotel en Cancún

Recibirás:
- Recordatorio 2 días antes
- Ubicación del guía 1 día antes
- Tracking GPS en tiempo real el día del tour

¿Preguntas? Responde este email.

Que disfrutes,
Spirit Tours
```

---

#### **DÍA 14 - Recordatorio (13 Nov, 2 días antes)**

**Sistema Automático (Cron Job):**
```python
# Se ejecuta diariamente a las 8 AM
def send_trip_reminders():
    # Buscar tours en 2 días
    upcoming_trips = db.query("""
        SELECT t.*, c.email, c.phone, c.name
        FROM trips t
        JOIN customers c ON t.customer_id = c.id
        WHERE t.departure_date::date = CURRENT_DATE + INTERVAL '2 days'
        AND t.status = 'upcoming'
        AND t.payment_status = 'paid'
    """)
    
    for trip in upcoming_trips:
        # Enviar recordatorio multicanal
        send_smart_notification(
            user_id=trip.customer_id,
            notification_type='trip_reminder_2days',
            priority='high',
            template_vars={
                'customer_name': trip.name,
                'tour_name': trip.tour_name,
                'departure_date': trip.departure_date,
                'pickup_time': trip.pickup_time,
                'booking_ref': trip.booking_reference
            }
        )
        
        # Actualizar trip
        db.execute("""
            UPDATE trips
            SET last_reminder_sent = NOW()
            WHERE trip_id = %s
        """, [trip.trip_id])
```

**WhatsApp al Cliente (prioridad):**
```
🚌 Recordatorio de Tour

Hola Carlos! Tu tour es pasado mañana:

📅 Viernes 15 Noviembre
🕐 8:00 AM (puntual)
📍 Lobby de tu hotel

¿Todo listo? 👍

Responde "OK" para confirmar o "CAMBIO" si necesitas algo.

Spirit Tours
```

---

#### **DÍA 15 - Día del Tour (15 Nov)**

**6:00 AM - Sistema Asigna Guía:**
```sql
-- Asignar guía automáticamente
UPDATE trips
SET 
    guide_id = 'guide-jose-uuid',
    guide_assigned_at = NOW(),
    status = 'in_progress'  -- Cambió de 'upcoming' a 'in_progress'
WHERE trip_id = 'trip-001';

-- Notificar al guía
INSERT INTO notificaciones_guia (
    guide_id,
    trip_id,
    tipo,
    mensaje
) VALUES (
    'guide-jose-uuid',
    'trip-001',
    'tour_asignado',
    'Tour ST-2024-1234 hoy 8 AM. 2 pax. Hotel Riu Cancún.'
);
```

**7:30 AM - Guía Inicia GPS Tracking:**
```javascript
// App móvil del guía
navigator.geolocation.watchPosition((position) => {
    socket.emit('update_location', {
        trip_id: 'trip-001',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        speed: position.coords.speed,
        heading: position.coords.heading,
        timestamp: new Date()
    });
}, {
    enableHighAccuracy: true,
    maximumAge: 0,
    interval: 30000  // Cada 30 segundos
});
```

**En el Backend (WebSocket):**
```javascript
socket.on('update_location', async (data) => {
    // Guardar en BD
    await pool.query(`
        UPDATE trips
        SET 
            current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
            last_location_update = NOW(),
            current_speed = $3,
            current_heading = $4
        WHERE trip_id = $5
    `, [data.longitude, data.latitude, data.speed, data.heading, data.trip_id]);
    
    // Guardar historial
    await pool.query(`
        INSERT INTO trip_tracking (
            trip_id,
            location,
            speed,
            heading,
            timestamp
        ) VALUES (
            $1,
            ST_SetSRID(ST_MakePoint($2, $3), 4326),
            $4,
            $5,
            NOW()
        )
    `, [data.trip_id, data.longitude, data.latitude, data.speed, data.heading]);
    
    // Broadcast a clientes conectados
    io.to(`trip-${data.trip_id}`).emit('location_update', {
        trip_id: data.trip_id,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
        timestamp: new Date()
    });
});
```

**Cliente ve en tiempo real:**
```
📍 Tu guía José está en camino

[MAPA en tiempo real mostrando ubicación del guía]

🚗 Velocidad: 45 km/h
⏱️ Tiempo estimado: 12 minutos
📞 [Llamar a José]
💬 [Chat]
```

**6:00 PM - Tour Completa:**
```sql
-- Guía marca como completado desde app
UPDATE trips
SET 
    status = 'completed',
    completed_at = NOW(),
    actual_end_time = NOW()
WHERE trip_id = 'trip-001';

-- Trigger automático: Crear métrica
INSERT INTO trip_metrics (
    trip_id,
    actual_duration_hours,
    gps_distance_km,
    customer_satisfaction
) VALUES (
    'trip-001',
    10.5,  -- 10.5 horas
    320.5,  -- 320.5 km recorridos
    NULL  -- Pendiente encuesta
);

-- Trigger automático: Autorizar pago al operador
UPDATE cuentas_por_pagar
SET 
    status = 'autorizado',
    autorizado_por = 'system-auto',
    fecha_autorizacion = NOW(),
    comentario_autorizacion = 'Tour completado exitosamente - Autorización automática'
WHERE folio = 'CXP-2024-2001';
```

**Solicitar Review Automático:**
```
⭐ ¿Cómo estuvo tu tour?

Hola Carlos,

Esperamos que hayas disfrutado tu tour a Chichén Itzá.

¿Cómo calificarías tu experiencia?

[⭐⭐⭐⭐⭐]

Tu opinión nos ayuda a mejorar.

Gracias,
Spirit Tours
```

---

#### **DÍA 16 - Pago al Operador (16 Nov)**

**Sistema Automático (Programado):**
```sql
-- Ejecutar pago al operador
INSERT INTO pagos_realizados (
    folio,
    cxp_id,
    monto,
    metodo_pago,
    fecha_pago,
    sucursal_id,
    cuenta_origen,
    cuenta_destino,
    referencia
) VALUES (
    'PAG-OUT-2024-4001',
    'cxp-2001-uuid',
    8000.00,
    'transferencia',
    NOW(),
    'cancun',
    'BBVA-Spirit-Cancun',
    'SANTANDER-Maya-Tours',
    'Pago tour ST-2024-1234'
);

-- Actualizar CXP
UPDATE cuentas_por_pagar
SET 
    monto_pagado = 8000.00,
    monto_pendiente = 0.00,
    status = 'pagado',
    fecha_pago = NOW()
WHERE folio = 'CXP-2024-2001';

-- Registrar movimiento contable
INSERT INTO movimientos_contables (
    sucursal_id,
    fecha,
    tipo,
    cuenta,
    debe,
    haber,
    concepto,
    referencia
) VALUES (
    'cancun',
    NOW(),
    'egreso',
    'costos_tours',
    8000.00,
    0.00,
    'Pago operador Maya Tours',
    'CXP-2024-2001'
);
```

---

#### **DÍA 17 - Conciliación Bancaria (17 Nov)**

**Contador revisa:**
```sql
-- Ver todos los movimientos del día anterior
SELECT 
    'INGRESO' as tipo,
    pr.folio,
    pr.monto,
    pr.metodo_pago,
    pr.referencia,
    pr.fecha_pago,
    pr.conciliado
FROM pagos_recibidos pr
WHERE pr.fecha_pago::date = '2024-11-16'

UNION ALL

SELECT 
    'EGRESO' as tipo,
    ps.folio,
    ps.monto,
    ps.metodo_pago,
    ps.referencia,
    ps.fecha_pago,
    ps.conciliado
FROM pagos_realizados ps
WHERE ps.fecha_pago::date = '2024-11-16'

ORDER BY fecha_pago;
```

**Resultado:**
```
╔═══════════════════════════════════════════════════════╗
║         Conciliación Bancaria - 16 Nov 2024          ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  INGRESOS:                                            ║
║  ├─ PAG-IN-3045   $12,500   Transferencia  ✅        ║
║  ├─ PAG-IN-3046   $ 8,000   Tarjeta       ✅        ║
║  └─ PAG-IN-3047   $ 5,500   Efectivo      ✅        ║
║  ─────────────────────────────────────────           ║
║  Total Ingresos:  $26,000                             ║
║                                                       ║
║  EGRESOS:                                             ║
║  ├─ PAG-OUT-4001  $ 8,000   Maya Tours    ✅        ║
║  ├─ PAG-OUT-4002  $ 6,500   Hotel ABC     ✅        ║
║  └─ PAG-OUT-4003  $ 3,000   Transporte    ✅        ║
║  ─────────────────────────────────────────           ║
║  Total Egresos:   $17,500                             ║
║                                                       ║
║  ═══════════════════════════════════════             ║
║  FLUJO NETO:      $ 8,500  ✅                        ║
║  ═══════════════════════════════════════             ║
║                                                       ║
║  Estado de Cuenta Bancario:                           ║
║  Saldo Anterior:  $125,000                            ║
║  Movimientos:     $  8,500                            ║
║  Saldo Actual:    $133,500                            ║
║                                                       ║
║  ✅ TODO CONCILIADO - Sin diferencias                ║
╚═══════════════════════════════════════════════════════╝
```

---

### 📊 Resumen Financiero del Tour

**Estado Final:**

```
╔═══════════════════════════════════════════════════════╗
║         Análisis Financiero Tour ST-2024-1234         ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  INGRESOS:                                            ║
║  └─ Cliente Carlos Ramírez    $12,000                ║
║                                                       ║
║  COSTOS DIRECTOS:                                     ║
║  ├─ Maya Tours (operador)     $ 8,000                ║
║  └─ Comisión Guía José        $   500                ║
║  ─────────────────────────────────────────           ║
║  Total Costos:                $ 8,500                ║
║                                                       ║
║  ═══════════════════════════════════════             ║
║  MARGEN BRUTO:                $ 3,500  (29.2%) 🟢    ║
║  ═══════════════════════════════════════             ║
║                                                       ║
║  Estados:                                             ║
║  ✅ CXC-2024-1001: COBRADO                           ║
║  ✅ CXP-2024-2001: PAGADO                            ║
║  ✅ Trip: COMPLETED                                   ║
║  ✅ Conciliado: SÍ                                    ║
║                                                       ║
║  Auditoría:                                           ║
║  - 15 registros de auditoría                          ║
║  - 2 pagos recibidos                                  ║
║  - 1 pago realizado                                   ║
║  - 247 actualizaciones GPS                            ║
║  - 12 mensajes de chat                                ║
║  - 1 review (5 estrellas)                            ║
╚═══════════════════════════════════════════════════════╝
```

**Utilidad para la empresa:** $3,500 MXN (29.2% margen) ✅

---

## 🚨 ESCENARIO 2: Cancelación con Reembolso

### Contexto
- **Cliente:** María López
- **Tour:** Tulum + Playa (4 personas)
- **Precio Total:** $18,000 MXN (ya pagado)
- **Operador:** Riviera Tours (ya programado pago de $12,000)
- **Fecha Tour:** 20 Noviembre
- **Fecha Cancelación:** 10 Noviembre (10 días antes)
- **Política:** 75% reembolso (7-13 días)

### Timeline Detallado

#### **DÍA 1 - Cliente Cancela (10 Nov)**

**Cliente llama:**
```
María: "Necesito cancelar el tour del 20 de noviembre"
Agente: "Entiendo. ¿Cuál es tu folio?"
María: "ST-2024-5678"
Agente: [Busca en sistema] "Ok, veo tu reserva. ¿Razón de cancelación?"
María: "Emergencia familiar"
```

**Agente en el Sistema:**
```sql
-- Iniciar cancelación
UPDATE trips
SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = 'Emergencia familiar',
    cancelled_by = 'agent-lucia-uuid'
WHERE booking_reference = 'ST-2024-5678';
```

**Sistema Calcula Automáticamente:**
```python
# Backend automático
def calculate_refund(trip_id):
    trip = db.get_trip(trip_id)
    
    # Calcular días hasta salida
    days_until = (trip.departure_date - datetime.now()).days
    # days_until = 10 días
    
    # Aplicar política
    if days_until >= 14:
        refund_pct = 100
        policy = "100% - Más de 14 días"
    elif days_until >= 7:
        refund_pct = 75  # ← Este caso
        policy = "75% - 7-13 días"
    elif days_until >= 2:
        refund_pct = 50
        policy = "50% - 2-6 días"
    else:
        refund_pct = 0
        policy = "0% - Menos de 2 días"
    
    refund_amount = trip.paid_amount * (refund_pct / 100)
    retention_amount = trip.paid_amount - refund_amount
    
    # refund_amount = $18,000 * 0.75 = $13,500
    # retention_amount = $18,000 - $13,500 = $4,500
    
    return {
        'refund_percentage': refund_pct,
        'refund_amount': refund_amount,
        'retention_amount': retention_amount,
        'policy_applied': policy
    }
```

**Sistema Actualiza Trip:**
```sql
-- Guardar cálculo de reembolso
UPDATE trips
SET 
    refund_amount = 13500.00,  -- 75% de $18,000
    refund_percentage = 75.00,
    refund_policy_applied = '75% - 7-13 días'
WHERE trip_id = 'trip-uuid';

-- Anular cuenta por cobrar original
UPDATE cuentas_por_cobrar
SET 
    status = 'cancelada',
    monto_pendiente = 0.00,
    fecha_cancelacion = NOW(),
    nota_cancelacion = 'Cliente canceló viaje - Procesar reembolso'
WHERE trip_id = 'trip-uuid';

-- Crear reembolso por pagar
INSERT INTO reembolsos_por_pagar (
    folio,
    trip_id,
    customer_id,
    monto_reembolso,
    monto_retenido,
    porcentaje_reembolsado,
    fecha_vencimiento,
    status,
    sucursal_id,
    metodo_reembolso_preferido
) VALUES (
    'REM-2024-5001',
    'trip-uuid',
    'maria-uuid',
    13500.00,  -- Lo que se devuelve
    4500.00,   -- Lo que se retiene
    75.00,
    NOW() + INTERVAL '10 days',  -- 10 días para procesar
    'pendiente_autorizacion',
    'cancun',
    'transferencia'  -- Mismo método que usó para pagar
);
```

**Pantalla del Agente muestra:**
```
╔═══════════════════════════════════════════════════════╗
║         Cancelación ST-2024-5678                      ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Cliente: María López                                 ║
║  Monto Pagado: $18,000 MXN                           ║
║  Días hasta tour: 10 días                             ║
║                                                       ║
║  📋 POLÍTICA APLICABLE:                               ║
║  "75% reembolso (7-13 días anticipación)"            ║
║                                                       ║
║  💰 CÁLCULO DE REEMBOLSO:                            ║
║  ├─ Monto a devolver:  $13,500 (75%)                 ║
║  └─ Monto a retener:   $ 4,500 (25%)                 ║
║                                                       ║
║  ⚠️ ACCIONES REQUERIDAS:                             ║
║  1. ✅ Trip cancelado                                 ║
║  2. ⏳ Pendiente: Autorización de reembolso           ║
║  3. ⏳ Pendiente: Cancelar con operador               ║
║  4. ⏳ Pendiente: Recuperar pago a operador           ║
║                                                       ║
║  [SOLICITAR AUTORIZACIÓN]                             ║
╚═══════════════════════════════════════════════════════╝
```

**Agente comunica a cliente:**
```
Agente: "Entiendo, María. Lamento la situación."
Agente: "Por cancelar con 10 días de anticipación, te corresponde 
         un reembolso del 75%, que son $13,500 pesos."
María: "¿Y los otros $4,500?"
Agente: "Esos se retienen según nuestra política de cancelación 
         que aceptaste al reservar."
María: "Entiendo. ¿Cuándo me devuelven el dinero?"
Agente: "En 7-10 días hábiles por transferencia a tu cuenta."
María: "Ok, gracias."
Agente: "Te llegará un email con los detalles. ¿Algo más?"
```

**Email Automático:**
```
Asunto: Cancelación Confirmada - ST-2024-5678

Hola María,

Tu reserva ha sido cancelada.

📋 DETALLES:
Tour: Tulum + Playa (4 pax)
Fecha original: 20 Noviembre 2024
Fecha cancelación: 10 Noviembre 2024

💰 REEMBOLSO:
Monto pagado: $18,000 MXN
Reembolso (75%): $13,500 MXN
Retención (25%): $4,500 MXN

📅 PROCESAMIENTO:
Tu reembolso se procesará en 7-10 días hábiles
Método: Transferencia bancaria
Recibirás notificación cuando se procese

Folio de reembolso: REM-2024-5001

Lamentamos no poder atenderte en esta ocasión.
Esperamos verte pronto.

Spirit Tours
```

---

#### **DÍA 1 (Continuación) - Cancelar con Operador**

**Agente debe cancelar servicio con operador:**

```sql
-- Buscar CXP del operador
SELECT * FROM cuentas_por_pagar
WHERE trip_id = 'trip-uuid'
AND proveedor_id = 'riviera-tours-uuid';

-- Resultado:
-- CXP-2024-3456
-- Monto: $12,000
-- Status: 'pendiente'  ← AÚN NO SE HA PAGADO (suerte!)
```

**Si NO se había pagado aún:**
```sql
-- Cancelar la cuenta por pagar
UPDATE cuentas_por_pagar
SET 
    status = 'cancelada',
    fecha_cancelacion = NOW(),
    motivo_cancelacion = 'Cliente canceló tour',
    cancelado_por = 'agent-lucia-uuid'
WHERE folio = 'CXP-2024-3456';

-- Registrar en auditoría
INSERT INTO auditoria_financiera (
    tabla_afectada,
    registro_id,
    accion,
    comentario
) VALUES (
    'cuentas_por_pagar',
    'cxp-3456-uuid',
    'cancelacion',
    'Cliente canceló - No proceder con pago a operador'
);
```

✅ **Suerte:** No se había pagado al operador, no hay que recuperar nada.

**Si YA se había pagado al operador:**
```sql
-- Crear cuenta por cobrar AL OPERADOR para recuperar
INSERT INTO cuentas_por_cobrar (
    folio,
    proveedor_id,
    trip_id,
    concepto,
    monto_total,
    monto_pendiente,
    fecha_vencimiento,
    status,
    sucursal_id
) VALUES (
    'CXC-PROV-2024-1001',
    'riviera-tours-uuid',
    'trip-uuid',
    'Recuperación pago por servicio cancelado - ST-2024-5678',
    12000.00,
    12000.00,
    NOW() + INTERVAL '7 days',
    'pendiente',
    'cancun'
);

-- Email automático al operador
```

**Email al operador:**
```
De: operaciones@spirittours.com
Para: pagos@rivieratours.com
Asunto: Cancelación Tour ST-2024-5678

Estimado proveedor,

Lamentamos informar la cancelación del siguiente servicio:

Tour: Tulum + Playa
Fecha: 20 Noviembre 2024
Personas: 4
Folio: ST-2024-5678

Monto pagado: $12,000 MXN
Solicitamos reembolso a Spirit Tours

Por favor confirmar recepción y fecha de devolución.

Gracias,
Spirit Tours - Operaciones
```

---

#### **DÍA 2 - Gerente Autoriza Reembolso (11 Nov)**

**Gerente revisa solicitud:**

```sql
-- Dashboard del gerente muestra
SELECT 
    r.folio,
    t.booking_reference,
    c.name as customer_name,
    r.monto_reembolso,
    r.monto_retenido,
    r.porcentaje_reembolsado,
    t.cancellation_reason,
    r.created_at
FROM reembolsos_por_pagar r
JOIN trips t ON r.trip_id = t.trip_id
JOIN customers c ON r.customer_id = c.id
WHERE r.status = 'pendiente_autorizacion'
AND r.sucursal_id = 'cancun'
ORDER BY r.created_at DESC;
```

**Pantalla del Gerente:**
```
╔═══════════════════════════════════════════════════════╗
║      Reembolsos Pendientes Autorización - Cancún      ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  📋 REM-2024-5001                                     ║
║  Cliente: María López                                 ║
║  Tour: ST-2024-5678 (Tulum + Playa)                  ║
║  Cancelado: 10 Nov, Emergencia familiar              ║
║                                                       ║
║  Monto Original: $18,000                              ║
║  Reembolsar: $13,500 (75%)                           ║
║  Retener: $4,500 (25%)                               ║
║                                                       ║
║  Política Aplicada: ✅ Correcta (10 días = 75%)      ║
║  CXP Operador: ✅ Cancelada (no pagado aún)          ║
║                                                       ║
║  [✅ AUTORIZAR]  [❌ RECHAZAR]  [📝 MÁS INFO]        ║
╚═══════════════════════════════════════════════════════╝
```

**Gerente autoriza:**
```sql
UPDATE reembolsos_por_pagar
SET 
    status = 'autorizado',
    autorizado_por = 'manager-carlos-uuid',
    fecha_autorizacion = NOW(),
    comentario_autorizacion = 'Política correctamente aplicada - Autorizado'
WHERE folio = 'REM-2024-5001';

-- Registro de auditoría
INSERT INTO auditoria_financiera (
    tabla_afectada,
    registro_id,
    accion,
    usuario_id,
    comentario
) VALUES (
    'reembolsos_por_pagar',
    'rem-5001-uuid',
    'autorizacion',
    'manager-carlos-uuid',
    'Reembolso autorizado por gerente'
);

-- Notificar a contabilidad
INSERT INTO notificaciones_internas (
    tipo,
    destinatario_role,
    prioridad,
    mensaje
) VALUES (
    'reembolso_autorizado',
    'contador',
    'media',
    'Reembolso REM-2024-5001 autorizado - Procesar pago a María López'
);
```

---

#### **DÍA 5 - Contador Ejecuta Reembolso (14 Nov)**

**Contador ve en su dashboard:**
```
╔═══════════════════════════════════════════════════════╗
║         Reembolsos Autorizados - Por Procesar         ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  📋 REM-2024-5001                                     ║
║  Cliente: María López                                 ║
║  Monto: $13,500 MXN                                   ║
║  Autorizado: 11 Nov por Gerente Carlos                ║
║  Método: Transferencia bancaria                       ║
║                                                       ║
║  Datos bancarios cliente:                             ║
║  Banco: BBVA                                          ║
║  Cuenta: 012345678901234567                           ║
║  CLABE: 012180001234567890                           ║
║                                                       ║
║  [💸 EJECUTAR REEMBOLSO]                              ║
╚═══════════════════════════════════════════════════════╝
```

**Contador ejecuta:**
```sql
-- Registrar reembolso ejecutado
INSERT INTO reembolsos_ejecutados (
    folio,
    reembolso_id,
    monto,
    metodo_reembolso,
    fecha_reembolso,
    comprobante_url,
    ejecutado_por,
    referencia_bancaria
) VALUES (
    'REM-EXE-2024-6001',
    'rem-5001-uuid',
    13500.00,
    'transferencia',
    NOW(),
    's3://comprobantes/rem-exe-6001.pdf',
    'contador-maria-uuid',
    'SPEI-987654321'
);

-- Actualizar reembolso
UPDATE reembolsos_por_pagar
SET 
    status = 'reembolsado',
    fecha_reembolso = NOW(),
    ejecutado_por = 'contador-maria-uuid'
WHERE folio = 'REM-2024-5001';

-- Actualizar trip
UPDATE trips
SET status = 'refunded'
WHERE trip_id = 'trip-uuid';

-- Registrar movimiento contable
INSERT INTO movimientos_contables (
    sucursal_id,
    fecha,
    tipo,
    cuenta,
    debe,
    haber,
    concepto,
    referencia
) VALUES (
    'cancun',
    NOW(),
    'egreso',
    'reembolsos',
    13500.00,
    0.00,
    'Reembolso cliente María López - Cancelación',
    'REM-2024-5001'
);
```

**Email automático a cliente:**
```
Asunto: ✅ Reembolso Procesado - REM-2024-5001

Hola María,

Tu reembolso ha sido procesado exitosamente.

💰 DETALLES:
Monto: $13,500 MXN
Método: Transferencia bancaria
Cuenta: ***********4567 (BBVA)
Referencia: SPEI-987654321

⏱️ TIEMPO DE LLEGADA:
El dinero llegará a tu cuenta en 24-48 horas hábiles

📄 COMPROBANTE:
[Descargar PDF]

Gracias por tu comprensión.
Esperamos verte pronto.

Spirit Tours
```

---

### 📊 Resumen Financiero de la Cancelación

```
╔═══════════════════════════════════════════════════════╗
║     Análisis Financiero Cancelación ST-2024-5678      ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  INGRESOS ORIGINALES:                                 ║
║  └─ Cliente María López       $18,000                ║
║                                                       ║
║  REEMBOLSO PROCESADO:                                 ║
║  └─ Devuelto a cliente        $13,500 (75%)          ║
║                                                       ║
║  RETENCIÓN:                                           ║
║  └─ Penalización por cancelar $ 4,500 (25%)          ║
║                                                       ║
║  COSTOS EVITADOS:                                     ║
║  └─ No se pagó a operador     $ 0                    ║
║     (se canceló a tiempo)                             ║
║                                                       ║
║  ═══════════════════════════════════════             ║
║  RESULTADO NETO:              $ 4,500  🟢            ║
║  ═══════════════════════════════════════             ║
║                                                       ║
║  Estados Finales:                                     ║
║  ✅ CXC Original: CANCELADA                          ║
║  ✅ CXP Operador: CANCELADA (a tiempo)               ║
║  ✅ Reembolso: PROCESADO                             ║
║  ✅ Trip: REFUNDED                                    ║
║  ✅ Auditoría: 22 registros                          ║
║                                                       ║
║  💡 La empresa retuvo $4,500 por política            ║
║     Esto cubre costos admin y oportunidad perdida     ║
╚═══════════════════════════════════════════════════════╝
```

**Resultado:** La empresa no pierde dinero gracias a:
1. ✅ Política de cancelación automática (75%/25%)
2. ✅ No se había pagado al operador aún
3. ✅ Retención de $4,500 cubre gastos administrativos

---

## 🔥 ESCENARIO 3: Problema - Operador Cobra Demás

### Contexto
- **Tour Completado:** Xcaret (6 personas)
- **Precio acordado con operador:** $600 MXN por persona = $3,600 total
- **Operador envía factura:** $4,200 MXN (cobra $700 por persona)
- **Diferencia:** $600 MXN de más

### Flujo de Detección y Resolución

#### **Paso 1: Operador Envía Factura**

**Email del operador:**
```
De: facturacion@xcaretoperador.com
Para: cuentaspagar@spirittours.com

Adjunto factura tour ST-2024-9999
6 personas x $700 = $4,200 MXN

Favor transferir a cuenta habitual.
```

#### **Paso 2: Contador Registra en Sistema**

**Contador crea CXP:**
```sql
INSERT INTO cuentas_por_pagar (
    folio,
    trip_id,
    proveedor_id,
    concepto,
    monto_total,
    monto_pendiente,
    fecha_vencimiento,
    factura_url,
    status,
    sucursal_id
) VALUES (
    'CXP-2024-7890',
    'trip-9999-uuid',
    'xcaret-operador-uuid',
    'Tour Xcaret 6 pax',
    4200.00,  -- Monto de la factura
    4200.00,
    NOW() + INTERVAL '15 days',
    's3://facturas/xcaret-001.pdf',
    'pendiente',
    'cancun'
);
```

#### **Paso 3: Sistema Detecta Discrepancia Automáticamente**

**Trigger automático:**
```sql
CREATE OR REPLACE FUNCTION check_payment_discrepancy()
RETURNS TRIGGER AS $$
DECLARE
    v_agreed_amount NUMERIC;
    v_invoice_amount NUMERIC;
    v_difference NUMERIC;
BEGIN
    -- Obtener monto acordado del trip
    SELECT 
        t.operator_cost_agreed
    INTO v_agreed_amount
    FROM trips t
    WHERE t.trip_id = NEW.trip_id;
    
    v_invoice_amount := NEW.monto_total;
    v_difference := ABS(v_invoice_amount - v_agreed_amount);
    
    -- Si hay diferencia > $100
    IF v_difference > 100 THEN
        -- Crear alerta
        INSERT INTO alertas_sistema (
            tipo,
            gravedad,
            titulo,
            mensaje,
            entidad_afectada,
            destinatario_role
        ) VALUES (
            'discrepancia_pago',
            'alta',
            '⚠️ Discrepancia en Pago a Operador',
            format('CXP-%s: Factura $%s vs Acordado $%s. Diferencia: $%s',
                   NEW.folio,
                   v_invoice_amount,
                   v_agreed_amount,
                   v_difference),
            NEW.id,
            'gerente'
        );
        
        -- Marcar CXP como pendiente revisión
        NEW.status := 'pendiente_revision';
        NEW.requiere_autorizacion := true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_payment_discrepancy
BEFORE INSERT ON cuentas_por_pagar
FOR EACH ROW
EXECUTE FUNCTION check_payment_discrepancy();
```

**Sistema genera alerta automática:**
```
╔═══════════════════════════════════════════════════════╗
║          🚨 ALERTA: Discrepancia Detectada            ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Folio: CXP-2024-7890                                 ║
║  Proveedor: Xcaret Operador                           ║
║  Tour: ST-2024-9999 (6 personas)                     ║
║                                                       ║
║  Monto Facturado:  $4,200 MXN                        ║
║  Monto Acordado:   $3,600 MXN                        ║
║  ──────────────────────────────                      ║
║  DIFERENCIA:       $  600 MXN 🔴                      ║
║                                                       ║
║  ⚠️ REQUIERE REVISIÓN GERENCIAL                      ║
║                                                       ║
║  [📞 CONTACTAR OPERADOR]  [📋 VER CONTRATO]         ║
╚═══════════════════════════════════════════════════════╝
```

#### **Paso 4: Gerente Investiga**

**Gerente revisa contrato:**
```sql
-- Ver detalles del acuerdo
SELECT 
    tc.proveedor_id,
    tc.servicio,
    tc.precio_por_persona,
    tc.precio_total,
    tc.vigencia_desde,
    tc.vigencia_hasta,
    tc.documento_url
FROM tarifas_contratadas tc
WHERE tc.proveedor_id = 'xcaret-operador-uuid'
AND tc.servicio = 'Tour Xcaret'
AND CURRENT_DATE BETWEEN tc.vigencia_desde AND tc.vigencia_hasta;
```

**Resultado:**
```
╔═══════════════════════════════════════════════════════╗
║          Contrato Xcaret Operador                     ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  Servicio: Tour Xcaret                                ║
║  Precio: $600 MXN por persona                        ║
║  Vigencia: 1 Ene 2024 - 31 Dic 2024                  ║
║  Contrato: [Ver PDF]                                  ║
║                                                       ║
║  ✅ CONFIRMADO: Precio es $600, no $700              ║
╚═══════════════════════════════════════════════════════╝
```

**Gerente contacta al operador:**
```
📧 De: gerencia.cancun@spirittours.com
📧 Para: facturacion@xcaretoperador.com
📧 Asunto: Corrección Factura ST-2024-9999

Estimado proveedor,

Recibimos factura por $4,200 para tour ST-2024-9999 (6 pax).

Según nuestro contrato vigente (adjunto), la tarifa es:
$600 por persona x 6 = $3,600 MXN

Favor emitir factura corregida por el monto correcto.

Saludos,
Carlos Méndez
Gerente Sucursal Cancún
```

#### **Paso 5: Operador Corrige**

**Operador responde:**
```
📧 Estimado Carlos,

Tienen razón, fue un error de captura.
Adjunto factura corregida: $3,600 MXN
Favor cancelar la factura anterior.

Disculpas por el inconveniente.
```

#### **Paso 6: Contador Actualiza Sistema**

```sql
-- Cancelar CXP incorrecta
UPDATE cuentas_por_pagar
SET 
    status = 'cancelada',
    fecha_cancelacion = NOW(),
    motivo_cancelacion = 'Factura incorrecta - Monto no correspondía a contrato',
    cancelado_por = 'contador-maria-uuid'
WHERE folio = 'CXP-2024-7890';

-- Crear CXP correcta
INSERT INTO cuentas_por_pagar (
    folio,
    trip_id,
    proveedor_id,
    concepto,
    monto_total,
    monto_pendiente,
    fecha_vencimiento,
    factura_url,
    status,
    sucursal_id,
    nota
) VALUES (
    'CXP-2024-7891',
    'trip-9999-uuid',
    'xcaret-operador-uuid',
    'Tour Xcaret 6 pax',
    3600.00,  -- ✅ Monto correcto
    3600.00,
    NOW() + INTERVAL '15 days',
    's3://facturas/xcaret-001-corregida.pdf',
    'pendiente',
    'cancun',
    'Factura corregida - Precio contrato: $600/pax'
);

-- Registrar en auditoría
INSERT INTO auditoria_financiera (
    tabla_afectada,
    registro_id,
    accion,
    usuario_id,
    comentario
) VALUES (
    'cuentas_por_pagar',
    'cxp-7890-uuid',
    'correccion',
    'contador-maria-uuid',
    'Discrepancia detectada y corregida. Ahorro: $600 MXN'
);
```

---

### 📊 Resultado

```
╔═══════════════════════════════════════════════════════╗
║         Resultado Prevención de Pérdida               ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  ❌ SIN SISTEMA:                                      ║
║  └─ Se habría pagado:  $4,200                        ║
║                                                       ║
║  ✅ CON SISTEMA:                                      ║
║  └─ Se pagó correctamente: $3,600                    ║
║                                                       ║
║  ═══════════════════════════════════════             ║
║  💰 AHORRO:            $  600  🟢                    ║
║  ═══════════════════════════════════════             ║
║                                                       ║
║  Acciones del Sistema:                                ║
║  1. ✅ Detectó discrepancia automáticamente          ║
║  2. ✅ Alertó al gerente                             ║
║  3. ✅ Bloqueó pago hasta autorización               ║
║  4. ✅ Facilitó comparación con contrato             ║
║  5. ✅ Registró todo en auditoría                    ║
║                                                       ║
║  Tiempo de resolución: 2 días                         ║
║  Pérdida evitada: $600 MXN                           ║
╚═══════════════════════════════════════════════════════╝
```

**Clave del éxito:**
1. ✅ Sistema compara automáticamente factura vs. contrato
2. ✅ Alerta antes de pagar
3. ✅ Bloquea pago sospechoso
4. ✅ Facilita investigación con datos históricos
5. ✅ TODO queda registrado en auditoría

---

## 🏢 ESCENARIO 4: Multi-Sucursal - Transferencia Entre Sucursales

### Contexto
- **Cliente:** Agencia de Viajes "Vamos Tour" (B2B)
- **Ubicación Cliente:** Ciudad de México
- **Tour Vendido:** Cancún (Xcaret + Tulum) = $25,000 MXN
- **Operación:** Sucursal CDMX vende, Sucursal Cancún opera
- **Comisión entre sucursales:** 12% para CDMX

### Flujo Completo

#### **Paso 1: Agencia Reserva desde CDMX**

**Agente CDMX registra reserva:**
```sql
INSERT INTO trips (
    trip_id,
    booking_reference,
    customer_id,
    status,
    channel,
    total_amount,
    paid_amount,
    departure_date,
    
    -- Multi-sucursal
    sucursal_venta,     -- Sucursal que vendió
    sucursal_operacion, -- Sucursal que operará
    comision_venta_porcentaje,
    comision_venta_monto
) VALUES (
    'trip-multi-001',
    'ST-2024-8888',
    'vamos-tour-uuid',
    'pending',
    'b2b',
    25000.00,
    0.00,
    '2024-11-25 09:00:00',
    
    'cdmx',    -- Vendió CDMX
    'cancun',  -- Opera Cancún
    12.00,     -- 12% comisión
    3000.00    -- $25,000 * 0.12
);
```

**Sistema crea automáticamente:**

**1. CXC en CDMX (cobra a la agencia):**
```sql
INSERT INTO cuentas_por_cobrar (
    folio,
    trip_id,
    customer_id,
    sucursal_id,
    monto_total,
    monto_pendiente,
    status
) VALUES (
    'CXC-CDMX-2024-5001',
    'trip-multi-001',
    'vamos-tour-uuid',
    'cdmx',  -- CDMX cobra
    25000.00,
    25000.00,
    'pendiente'
);
```

**2. CXP de CDMX a Cancún (transferencia interna):**
```sql
-- CDMX debe pagarle a Cancún el monto menos su comisión
INSERT INTO cuentas_por_pagar (
    folio,
    trip_id,
    proveedor_id,  -- NULL porque es sucursal interna
    sucursal_destino,  -- A quién se paga
    concepto,
    monto_total,
    monto_pendiente,
    sucursal_id,  -- Quién paga
    tipo,
    status
) VALUES (
    'CXP-CDMX-2024-6001',
    'trip-multi-001',
    NULL,
    'cancun',  -- Pagar a Cancún
    'Transferencia inter-sucursal tour ST-2024-8888',
    22000.00,  -- $25,000 - $3,000 comisión
    22000.00,
    'cdmx',
    'transferencia_interna',
    'pendiente'
);
```

**3. CXC de Cancún desde CDMX (ingreso por transferencia):**
```sql
-- Cancún espera recibir de CDMX
INSERT INTO cuentas_por_cobrar (
    folio,
    trip_id,
    sucursal_origen,  -- De quién cobra
    concepto,
    monto_total,
    monto_pendiente,
    sucursal_id,  -- Quién cobra
    tipo,
    status
) VALUES (
    'CXC-CANCUN-2024-7001',
    'trip-multi-001',
    'cdmx',  -- Cobrar a CDMX
    'Transferencia inter-sucursal recibir de CDMX',
    22000.00,
    22000.00,
    'cancun',
    'transferencia_interna',
    'pendiente'
);
```

**4. CXP de Cancún al operador:**
```sql
-- Cancún pagará al operador local
INSERT INTO cuentas_por_pagar (
    folio,
    trip_id,
    proveedor_id,
    concepto,
    monto_total,
    monto_pendiente,
    sucursal_id,
    status
) VALUES (
    'CXP-CANCUN-2024-8001',
    'trip-multi-001',
    'operador-local-cancun-uuid',
    'Tours Xcaret + Tulum',
    16000.00,
    16000.00,
    'cancun',
    'pendiente'
);
```

**Visualización del Flujo:**
```
┌─────────────────────────────────────────────────────────┐
│                    FLUJO DE DINERO                      │
└─────────────────────────────────────────────────────────┘

Agencia Vamos Tour (CDMX)
    │
    │ $25,000  (Paga a Spirit Tours CDMX)
    ▼
Sucursal CDMX
    │
    ├─ Retiene: $3,000 (12% comisión de venta)
    │
    └─ Transfiere: $22,000 a Cancún
                    │
                    ▼
               Sucursal Cancún
                    │
                    ├─ Paga Operador: $16,000
                    │
                    └─ Utilidad Cancún: $6,000 (24%)

═══════════════════════════════════════════════════════

RESUMEN:
- Ingreso Total:       $25,000
- Comisión CDMX:       $ 3,000 (12%)
- Costo Operador:      $16,000
- Utilidad Cancún:     $ 6,000 (24%)
─────────────────────────────────────
- UTILIDAD TOTAL:      $ 9,000 (36%) 🟢
```

---

#### **Paso 2: Agencia Paga a CDMX**

```sql
-- Agencia paga en CDMX
INSERT INTO pagos_recibidos (
    folio,
    cxc_id,
    monto,
    metodo_pago,
    fecha_pago,
    sucursal_id
) VALUES (
    'PAG-IN-CDMX-9001',
    'cxc-cdmx-5001-uuid',
    25000.00,
    'transferencia',
    NOW(),
    'cdmx'
);

-- Actualizar CXC
UPDATE cuentas_por_cobrar
SET 
    monto_pagado = 25000.00,
    monto_pendiente = 0.00,
    status = 'cobrado'
WHERE folio = 'CXC-CDMX-2024-5001';
```

---

#### **Paso 3: CDMX Transfiere a Cancún**

**Contador CDMX ejecuta transferencia:**
```sql
-- CDMX paga a Cancún
INSERT INTO pagos_realizados (
    folio,
    cxp_id,
    monto,
    metodo_pago,
    fecha_pago,
    sucursal_id,
    tipo
) VALUES (
    'PAG-OUT-CDMX-10001',
    'cxp-cdmx-6001-uuid',
    22000.00,
    'transferencia_interna',
    NOW(),
    'cdmx',
    'inter_sucursal'
);

-- Actualizar CXP de CDMX
UPDATE cuentas_por_pagar
SET 
    monto_pagado = 22000.00,
    monto_pendiente = 0.00,
    status = 'pagado'
WHERE folio = 'CXP-CDMX-2024-6001';

-- SIMULTÁNEAMENTE: Actualizar CXC de Cancún (recibe)
INSERT INTO pagos_recibidos (
    folio,
    cxc_id,
    monto,
    metodo_pago,
    fecha_pago,
    sucursal_id,
    tipo
) VALUES (
    'PAG-IN-CANCUN-11001',
    'cxc-cancun-7001-uuid',
    22000.00,
    'transferencia_interna',
    NOW(),
    'cancun',
    'inter_sucursal'
);

-- Actualizar CXC de Cancún
UPDATE cuentas_por_cobrar
SET 
    monto_pagado = 22000.00,
    monto_pendiente = 0.00,
    status = 'cobrado'
WHERE folio = 'CXC-CANCUN-2024-7001';
```

---

#### **Paso 4: Cancún Paga al Operador**

```sql
-- Después del tour, Cancún paga operador
INSERT INTO pagos_realizados (
    folio,
    cxp_id,
    monto,
    metodo_pago,
    fecha_pago,
    sucursal_id
) VALUES (
    'PAG-OUT-CANCUN-12001',
    'cxp-cancun-8001-uuid',
    16000.00,
    'transferencia',
    NOW(),
    'cancun'
);

-- Actualizar CXP
UPDATE cuentas_por_pagar
SET 
    monto_pagado = 16000.00,
    monto_pendiente = 0.00,
    status = 'pagado'
WHERE folio = 'CXP-CANCUN-2024-8001';
```

---

### 📊 Estados de Resultados por Sucursal

**Sucursal CDMX:**
```
╔═══════════════════════════════════════════════════════╗
║        ESTADO DE RESULTADOS - Sucursal CDMX           ║
║                Tour ST-2024-8888                      ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  INGRESOS:                                            ║
║  └─ Venta a Agencia Vamos Tour    $25,000           ║
║                                                       ║
║  COSTOS:                                              ║
║  └─ Transfer a Cancún             $22,000           ║
║                                                       ║
║  ═══════════════════════════════════════             ║
║  UTILIDAD SUCURSAL CDMX:          $ 3,000  (12%) 🟢  ║
║  ═══════════════════════════════════════             ║
║                                                       ║
║  Concepto: Comisión por venta B2B                     ║
╚═══════════════════════════════════════════════════════╝
```

**Sucursal Cancún:**
```
╔═══════════════════════════════════════════════════════╗
║       ESTADO DE RESULTADOS - Sucursal Cancún          ║
║                Tour ST-2024-8888                      ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  INGRESOS:                                            ║
║  └─ Transfer de CDMX              $22,000           ║
║                                                       ║
║  COSTOS:                                              ║
║  └─ Pago Operador Local           $16,000           ║
║                                                       ║
║  ═══════════════════════════════════════             ║
║  UTILIDAD SUCURSAL CANCÚN:        $ 6,000  (27%) 🟢  ║
║  ═══════════════════════════════════════             ║
║                                                       ║
║  Concepto: Operación de tour                          ║
╚═══════════════════════════════════════════════════════╝
```

**Consolidado Corporativo:**
```
╔═══════════════════════════════════════════════════════╗
║         CONSOLIDADO - Tour ST-2024-8888               ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  INGRESO TOTAL EMPRESA:           $25,000            ║
║  COSTO TOTAL EMPRESA:             $16,000            ║
║  ═══════════════════════════════════════             ║
║  UTILIDAD TOTAL:                  $ 9,000  (36%) 🟢   ║
║  ═══════════════════════════════════════             ║
║                                                       ║
║  Distribución Utilidad:                               ║
║  ├─ CDMX (Venta):     $3,000 (33% de utilidad)      ║
║  └─ Cancún (Opera):   $6,000 (67% de utilidad)      ║
║                                                       ║
║  ✅ Ambas sucursales rentables                        ║
║  ✅ Incentivo correcto (operación gana más)          ║
╚═══════════════════════════════════════════════════════╝
```

---

### 🎯 Ventajas del Sistema Multi-Sucursal

1. ✅ **Trazabilidad Completa:** Cada peso se rastrea
2. ✅ **Rentabilidad por Sucursal:** Cada una conoce su margen
3. ✅ **Incentivos Correctos:** Sucursal operativa gana más
4. ✅ **Consolidación Automática:** Vista corporativa en tiempo real
5. ✅ **Auditoría Total:** TODO registrado automáticamente
6. ✅ **Comisiones Justas:** Cálculo y pago automáticos

---

## 🎯 Conclusión de Escenarios

Estos 4 escenarios demuestran:

1. **Escenario 1:** Flujo perfecto sin problemas
2. **Escenario 2:** Manejo de cancelaciones sin pérdidas
3. **Escenario 3:** Detección y prevención de sobrecobros
4. **Escenario 4:** Operación multi-sucursal con control total

**En todos los casos:**
- ✅ Control financiero 100%
- ✅ Cero pérdidas
- ✅ Auditoría completa
- ✅ Procesos automáticos
- ✅ Alertas preventivas

---

**¿Quieres que continúe con más escenarios específicos o prefieres que implemente las tablas?**
