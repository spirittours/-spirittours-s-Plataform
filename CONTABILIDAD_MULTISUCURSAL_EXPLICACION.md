# 📊 Sistema de Contabilidad Multi-Sucursal - Spirit Tours

Explicación completa del sistema de contabilidad para múltiples sucursales con control total de cobros y pagos.

---

## 🎯 Objetivo del Sistema

**Controlar y registrar:**
1. Ingresos por sucursal
2. Gastos por sucursal
3. Cobros a clientes
4. Pagos a operadores/proveedores
5. Reembolsos y cancelaciones
6. Conciliaciones bancarias
7. Comisiones entre sucursales
8. Reportes consolidados

**Resultado:** Cero pérdidas, control total, auditoría completa.

---

## 🏗️ Arquitectura del Sistema

### 1. Estructura Jerárquica

```
EMPRESA MATRIZ (Spirit Tours)
│
├─── SUCURSAL 1 (Cancún)
│    ├─── Cuenta Bancaria Local
│    ├─── Caja Chica
│    └─── Catálogo de Cuentas Local
│
├─── SUCURSAL 2 (CDMX)
│    ├─── Cuenta Bancaria Local
│    ├─── Caja Chica
│    └─── Catálogo de Cuentas Local
│
└─── SUCURSAL 3 (Guadalajara)
     ├─── Cuenta Bancaria Local
     ├─── Caja Chica
     └─── Catálogo de Cuentas Local
```

### 2. Centros de Costo

Cada sucursal es un **centro de costo independiente** que reporta a la matriz.

**Ventajas:**
- Rentabilidad por sucursal
- Identificación de sucursales problemáticas
- Optimización de recursos
- Responsabilidad clara

---

## 💰 PARTE 1: Control de Cobros (Cuentas por Cobrar)

### 1.1 Estados de Cobro

```
┌─────────────┐
│   PENDIENTE │ ──────┐
└─────────────┘       │
                      │ Cliente hace pago
┌─────────────┐       │
│   PARCIAL   │ ◄─────┤
└─────────────┘       │
       │              │
       │ Pago completo│
       ▼              │
┌─────────────┐       │
│   COBRADO   │ ◄─────┘
└─────────────┘
       │
       │ Si hay problemas
       ▼
┌─────────────┐
│  VENCIDO    │
└─────────────┘
       │
       │ Escalación
       ▼
┌─────────────┐
│ INCOBRABLE  │
└─────────────┘
```

### 1.2 Flujo de Cobro a Clientes

**Escenario:** Cliente reserva tour de $10,000 MXN

#### Paso 1: Creación de Reserva
```sql
-- Se crea automáticamente una cuenta por cobrar
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
    'CXC-2024-001',
    'trip-uuid',
    'customer-uuid',
    'sucursal-cancun',
    10000.00,
    10000.00,
    NOW() + INTERVAL '7 days',
    'pendiente'
);
```

#### Paso 2: Cliente Paga Anticipo (50%)
```sql
-- Registro de pago
INSERT INTO pagos_recibidos (
    folio,
    cxc_id,
    monto,
    metodo_pago,
    referencia,
    banco,
    fecha_pago,
    sucursal_id
) VALUES (
    'PAG-2024-001',
    'cxc-uuid',
    5000.00,
    'transferencia',
    'REF123456',
    'BBVA',
    NOW(),
    'sucursal-cancun'
);

-- Actualizar cuenta por cobrar
UPDATE cuentas_por_cobrar
SET 
    monto_pagado = monto_pagado + 5000.00,
    monto_pendiente = monto_pendiente - 5000.00,
    status = 'parcial',
    ultimo_pago = NOW()
WHERE id = 'cxc-uuid';
```

#### Paso 3: Cliente Paga Saldo (50%)
```sql
-- Segundo pago
INSERT INTO pagos_recibidos (
    folio,
    cxc_id,
    monto,
    metodo_pago,
    fecha_pago
) VALUES (
    'PAG-2024-002',
    'cxc-uuid',
    5000.00,
    'efectivo',
    NOW()
);

-- Marcar como cobrado
UPDATE cuentas_por_cobrar
SET 
    monto_pagado = monto_total,
    monto_pendiente = 0,
    status = 'cobrado',
    fecha_cobro_total = NOW()
WHERE id = 'cxc-uuid';

-- Actualizar trip a "upcoming" si estaba pendiente de pago
UPDATE trips
SET status = 'upcoming', payment_status = 'paid'
WHERE trip_id = 'trip-uuid';
```

### 1.3 Manejo de Pagos Vencidos

**Sistema de Alertas Automáticas:**

```python
# Código Python para alertas automáticas
def check_overdue_payments():
    """
    Ejecutar diariamente para identificar pagos vencidos
    """
    overdue = db.query("""
        SELECT 
            cxc.*,
            c.name as customer_name,
            c.email,
            c.phone,
            t.booking_reference
        FROM cuentas_por_cobrar cxc
        JOIN customers c ON cxc.customer_id = c.id
        JOIN trips t ON cxc.trip_id = t.trip_id
        WHERE cxc.fecha_vencimiento < NOW()
        AND cxc.status IN ('pendiente', 'parcial')
        AND cxc.monto_pendiente > 0
    """)
    
    for payment in overdue:
        days_overdue = (datetime.now() - payment.fecha_vencimiento).days
        
        if days_overdue == 1:
            # Primer recordatorio (amable)
            send_notification(
                payment.customer_id,
                type='payment_reminder_1',
                channels=['email', 'whatsapp'],
                message=f"Recordatorio: Tienes un pago pendiente de ${payment.monto_pendiente}"
            )
        
        elif days_overdue == 3:
            # Segundo recordatorio (más urgente)
            send_notification(
                payment.customer_id,
                type='payment_reminder_2',
                channels=['email', 'whatsapp', 'sms'],
                message=f"URGENTE: Tu pago está vencido por 3 días"
            )
            
            # Notificar al equipo de cobranza
            alert_collections_team(payment)
        
        elif days_overdue == 7:
            # Marcar como vencido
            db.execute("""
                UPDATE cuentas_por_cobrar
                SET status = 'vencido'
                WHERE id = %s
            """, [payment.id])
            
            # Escalación a gerente
            alert_manager(payment)
        
        elif days_overdue >= 14:
            # Considerar cancelación
            consider_trip_cancellation(payment)
```

### 1.4 Dashboard de Cuentas por Cobrar

**Vista del Gerente de Sucursal:**

```
╔════════════════════════════════════════════════════════╗
║        CUENTAS POR COBRAR - Sucursal Cancún           ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  Total por Cobrar:           $150,000 MXN             ║
║  ├─ Pendiente:               $ 80,000                 ║
║  ├─ Parcial:                 $ 40,000                 ║
║  └─ Vencido:                 $ 30,000 🔴              ║
║                                                        ║
║  Clientes con Saldo:         23 clientes              ║
║  Pagos Esperados Hoy:        $25,000                  ║
║  Riesgo de Incobrable:       $5,000 🔴                ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║  ALERTAS ACTIVAS                                       ║
╠════════════════════════════════════════════════════════╣
║  🔴 3 pagos vencidos > 7 días                         ║
║  🟡 5 pagos vencen en 2 días                          ║
║  🟢 18 pagos al corriente                             ║
╚════════════════════════════════════════════════════════╝
```

---

## 💸 PARTE 2: Control de Pagos (Cuentas por Pagar)

### 2.1 Estados de Pago

```
┌─────────────┐
│  PENDIENTE  │ ── Factura recibida
└─────────────┘
       │
       │ Autorización
       ▼
┌─────────────┐
│  AUTORIZADO │ ── Esperando fecha de pago
└─────────────┘
       │
       │ Proceso de pago
       ▼
┌─────────────┐
│   PAGADO    │ ── Pago ejecutado
└─────────────┘
       │
       │ Conciliación
       ▼
┌─────────────┐
│ CONCILIADO  │ ── Confirmado en estado de cuenta
└─────────────┘
```

### 2.2 Flujo de Pago a Operadores/Proveedores

**Escenario:** Operador turístico cobra $7,000 MXN por servicio prestado

#### Paso 1: Registro de Servicio Recibido
```sql
-- Se crea cuenta por pagar automáticamente al confirmar servicio
INSERT INTO cuentas_por_pagar (
    folio,
    proveedor_id,
    trip_id,
    concepto,
    monto_total,
    monto_pendiente,
    fecha_vencimiento,
    sucursal_id,
    status
) VALUES (
    'CXP-2024-001',
    'operador-uuid',
    'trip-uuid',
    'Tour a Chichen Itzá - 20 personas',
    7000.00,
    7000.00,
    NOW() + INTERVAL '15 days',  -- Plazo de pago: 15 días
    'sucursal-cancun',
    'pendiente'
);
```

#### Paso 2: Autorización de Pago
```sql
-- Gerente autoriza el pago
UPDATE cuentas_por_pagar
SET 
    status = 'autorizado',
    autorizado_por = 'manager-uuid',
    fecha_autorizacion = NOW()
WHERE id = 'cxp-uuid';

-- Registro en bitácora
INSERT INTO auditoria_pagos (
    cxp_id,
    accion,
    usuario_id,
    comentario
) VALUES (
    'cxp-uuid',
    'autorizacion',
    'manager-uuid',
    'Servicio verificado y aprobado para pago'
);
```

#### Paso 3: Programación de Pago
```sql
-- Programar pago para fecha específica
INSERT INTO programacion_pagos (
    cxp_id,
    fecha_programada,
    monto,
    metodo_pago,
    cuenta_origen,
    cuenta_destino,
    referencia_bancaria
) VALUES (
    'cxp-uuid',
    '2024-11-10',
    7000.00,
    'transferencia',
    'BBVA-123456',
    'SANTANDER-789012',
    'Pago servicio tour'
);
```

#### Paso 4: Ejecución de Pago
```sql
-- Ejecutar pago (manual o automático)
INSERT INTO pagos_realizados (
    folio,
    cxp_id,
    monto,
    metodo_pago,
    fecha_pago,
    comprobante_url,
    sucursal_id
) VALUES (
    'PAG-OUT-2024-001',
    'cxp-uuid',
    7000.00,
    'transferencia',
    NOW(),
    's3://comprobantes/pag-001.pdf',
    'sucursal-cancun'
);

-- Actualizar cuenta por pagar
UPDATE cuentas_por_pagar
SET 
    monto_pagado = 7000.00,
    monto_pendiente = 0,
    status = 'pagado',
    fecha_pago = NOW()
WHERE id = 'cxp-uuid';
```

#### Paso 5: Conciliación Bancaria
```sql
-- Confirmar que el pago salió del banco
UPDATE pagos_realizados
SET 
    conciliado = true,
    fecha_conciliacion = NOW(),
    estado_cuenta_ref = 'EDO-CTA-123'
WHERE folio = 'PAG-OUT-2024-001';

-- Marcar CXP como conciliada
UPDATE cuentas_por_pagar
SET status = 'conciliado'
WHERE id = 'cxp-uuid';
```

### 2.3 Control de Comisiones a Agencias

**Escenario:** Agencia de viajes vende tour de $10,000 con comisión de 15%

```sql
-- Registro de comisión por pagar
INSERT INTO comisiones_por_pagar (
    folio,
    trip_id,
    agencia_id,
    monto_venta,
    porcentaje_comision,
    monto_comision,
    fecha_vencimiento,
    status
) VALUES (
    'COM-2024-001',
    'trip-uuid',
    'agencia-uuid',
    10000.00,
    15.00,
    1500.00,  -- 15% de $10,000
    NOW() + INTERVAL '30 days',
    'pendiente'
);

-- Al pagar la comisión
INSERT INTO pagos_comisiones (
    comision_id,
    monto,
    metodo_pago,
    fecha_pago
) VALUES (
    'com-uuid',
    1500.00,
    'transferencia',
    NOW()
);

-- Actualizar comisión
UPDATE comisiones_por_pagar
SET 
    status = 'pagada',
    fecha_pago = NOW()
WHERE id = 'com-uuid';
```

### 2.4 Dashboard de Cuentas por Pagar

```
╔════════════════════════════════════════════════════════╗
║        CUENTAS POR PAGAR - Sucursal Cancún            ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  Total por Pagar:            $280,000 MXN             ║
║  ├─ Pendiente Autorización:  $ 80,000                ║
║  ├─ Autorizado:              $120,000                 ║
║  ├─ Programado para Hoy:     $ 50,000 🔴             ║
║  └─ Vencido:                 $ 30,000 🔴              ║
║                                                        ║
║  Proveedores Activos:        15 proveedores           ║
║  Pagos Programados Semana:   $180,000                 ║
║  Cash Flow Disponible:       $320,000 🟢              ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║  PAGOS PROGRAMADOS HOY                                 ║
╠════════════════════════════════════════════════════════╣
║  🔴 Operador XYZ      $25,000  [Ejecutar Pago]        ║
║  🔴 Hotel ABC         $15,000  [Ejecutar Pago]        ║
║  🟡 Transporte DEF    $10,000  [Programado 2 PM]      ║
╚════════════════════════════════════════════════════════╝
```

---

## 🔄 PARTE 3: Control de Reembolsos y Cancelaciones

### 3.1 Flujo de Reembolso

**Escenario:** Cliente cancela con 10 días de anticipación, reembolso de 75%

#### Paso 1: Solicitud de Cancelación
```sql
-- Cliente cancela viaje
UPDATE trips
SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = 'Emergencia familiar'
WHERE trip_id = 'trip-uuid';

-- Calcular reembolso automáticamente
UPDATE trips
SET refund_amount = paid_amount * 0.75  -- 75% según política
WHERE trip_id = 'trip-uuid';
```

#### Paso 2: Crear Cuenta por Pagar (Reembolso)
```sql
-- Reembolso se convierte en cuenta por pagar al cliente
INSERT INTO reembolsos_por_pagar (
    folio,
    trip_id,
    customer_id,
    monto_reembolso,
    monto_retenido,
    porcentaje_reembolsado,
    fecha_vencimiento,
    status,
    sucursal_id
) VALUES (
    'REM-2024-001',
    'trip-uuid',
    'customer-uuid',
    7500.00,   -- 75% de $10,000
    2500.00,   -- 25% retenido
    75.00,
    NOW() + INTERVAL '10 days',  -- 10 días para procesar
    'pendiente',
    'sucursal-cancun'
);
```

#### Paso 3: Autorización de Reembolso
```sql
-- Gerente autoriza reembolso
UPDATE reembolsos_por_pagar
SET 
    status = 'autorizado',
    autorizado_por = 'manager-uuid',
    fecha_autorizacion = NOW()
WHERE id = 'rem-uuid';
```

#### Paso 4: Ejecución de Reembolso
```sql
-- Procesar reembolso
INSERT INTO reembolsos_ejecutados (
    folio,
    reembolso_id,
    monto,
    metodo_reembolso,
    fecha_reembolso,
    comprobante_url
) VALUES (
    'REM-EXE-2024-001',
    'rem-uuid',
    7500.00,
    'transferencia',
    NOW(),
    's3://comprobantes/rem-001.pdf'
);

-- Actualizar reembolso
UPDATE reembolsos_por_pagar
SET 
    status = 'reembolsado',
    fecha_reembolso = NOW()
WHERE id = 'rem-uuid';

-- Actualizar trip
UPDATE trips
SET status = 'refunded'
WHERE trip_id = 'trip-uuid';
```

#### Paso 5: Ajustar Cuentas

```sql
-- Anular la cuenta por cobrar original
UPDATE cuentas_por_cobrar
SET 
    status = 'cancelada',
    monto_pendiente = 0,
    nota_cancelacion = 'Cliente canceló viaje - Reembolso procesado'
WHERE trip_id = 'trip-uuid';

-- Si ya se había pagado al operador, crear cuenta por cobrar al operador
INSERT INTO cuentas_por_cobrar (
    folio,
    proveedor_id,
    concepto,
    monto_total,
    status,
    sucursal_id
) VALUES (
    'CXC-PROV-2024-001',
    'operador-uuid',
    'Recuperación pago por servicio cancelado',
    7000.00,
    'pendiente',
    'sucursal-cancun'
);
```

### 3.2 Política de Reembolsos Automática

```python
def calculate_refund_policy(trip):
    """
    Calcula reembolso automáticamente según política
    """
    days_until_departure = (trip.departure_date - datetime.now()).days
    
    if days_until_departure >= 30:
        return {
            'refund_percentage': 100,
            'refund_amount': trip.paid_amount,
            'retention_amount': 0,
            'policy': '100% - Más de 30 días'
        }
    elif days_until_departure >= 14:
        return {
            'refund_percentage': 90,
            'refund_amount': trip.paid_amount * 0.90,
            'retention_amount': trip.paid_amount * 0.10,
            'policy': '90% - 14-29 días'
        }
    elif days_until_departure >= 7:
        return {
            'refund_percentage': 75,
            'refund_amount': trip.paid_amount * 0.75,
            'retention_amount': trip.paid_amount * 0.25,
            'policy': '75% - 7-13 días'
        }
    elif days_until_departure >= 2:
        return {
            'refund_percentage': 50,
            'refund_amount': trip.paid_amount * 0.50,
            'retention_amount': trip.paid_amount * 0.50,
            'policy': '50% - 2-6 días'
        }
    else:
        return {
            'refund_percentage': 0,
            'refund_amount': 0,
            'retention_amount': trip.paid_amount,
            'policy': '0% - Menos de 2 días'
        }
```

### 3.3 Dashboard de Reembolsos

```
╔════════════════════════════════════════════════════════╗
║           REEMBOLSOS - Sucursal Cancún                 ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  Reembolsos Pendientes:      $45,000 MXN              ║
║  ├─ Pendiente Autorización:  $20,000                  ║
║  ├─ Autorizado:              $15,000                  ║
║  └─ En Proceso:              $10,000                  ║
║                                                        ║
║  Reembolsos Mes:             $180,000                  ║
║  Tasa de Cancelación:        8.5% 🟡                  ║
║  Tiempo Promedio Proceso:    5 días 🟢                ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║  REEMBOLSOS PENDIENTES AUTORIZACIÓN                    ║
╠════════════════════════════════════════════════════════╣
║  🔴 REM-2024-045   $8,500   [Revisar]                 ║
║  🟡 REM-2024-046   $6,200   [Revisar]                 ║
║  🟡 REM-2024-047   $5,300   [Revisar]                 ║
╚════════════════════════════════════════════════════════╝
```

---

## 📊 PARTE 4: Contabilidad por Sucursal

### 4.1 Centro de Costos por Sucursal

Cada sucursal tiene su propio **P&L (Profit & Loss)**:

```
╔════════════════════════════════════════════════════════╗
║     ESTADO DE RESULTADOS - Sucursal Cancún            ║
║                 Octubre 2024                           ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  INGRESOS                                              ║
║  ├─ Ventas Tours               $850,000               ║
║  ├─ Ventas Extras              $ 45,000               ║
║  └─ Comisiones Recibidas       $ 15,000               ║
║  ───────────────────────────────────────               ║
║  Total Ingresos                $910,000               ║
║                                                        ║
║  COSTOS DIRECTOS                                       ║
║  ├─ Pago Operadores            $520,000               ║
║  ├─ Pago Hoteles               $120,000               ║
║  ├─ Transporte                 $ 80,000               ║
║  └─ Comisiones Pagadas         $ 35,000               ║
║  ───────────────────────────────────────               ║
║  Total Costos Directos         $755,000               ║
║                                                        ║
║  MARGEN BRUTO                  $155,000  (17%)        ║
║                                                        ║
║  GASTOS OPERATIVOS                                     ║
║  ├─ Nómina                     $ 45,000               ║
║  ├─ Renta                      $ 15,000               ║
║  ├─ Servicios                  $  8,000               ║
║  ├─ Marketing                  $ 12,000               ║
║  └─ Varios                     $  5,000               ║
║  ───────────────────────────────────────               ║
║  Total Gastos Operativos       $ 85,000               ║
║                                                        ║
║  ═══════════════════════════════════════               ║
║  UTILIDAD NETA                 $ 70,000  (7.7%)  🟢   ║
║  ═══════════════════════════════════════               ║
╚════════════════════════════════════════════════════════╝
```

### 4.2 Consolidación Multi-Sucursal

**Vista Corporativa (Todas las Sucursales):**

```sql
-- Query para consolidar resultados
SELECT 
    s.nombre as sucursal,
    SUM(i.monto) as ingresos_totales,
    SUM(c.monto) as costos_totales,
    SUM(i.monto) - SUM(c.monto) as utilidad,
    ((SUM(i.monto) - SUM(c.monto)) / SUM(i.monto) * 100) as margen_porcentaje
FROM sucursales s
LEFT JOIN ingresos i ON s.id = i.sucursal_id
LEFT JOIN costos c ON s.id = c.sucursal_id
WHERE i.fecha BETWEEN '2024-10-01' AND '2024-10-31'
GROUP BY s.id, s.nombre
ORDER BY utilidad DESC;
```

**Resultado:**

```
╔════════════════════════════════════════════════════════════════╗
║         CONSOLIDADO CORPORATIVO - Octubre 2024                 ║
╠════════════════════════════════════════════════════════════════╣
║ Sucursal      │ Ingresos  │ Costos    │ Utilidad │ Margen     ║
╠════════════════════════════════════════════════════════════════╣
║ Cancún        │ $910,000  │ $840,000  │ $70,000  │  7.7% 🟢   ║
║ CDMX          │ $750,000  │ $695,000  │ $55,000  │  7.3% 🟢   ║
║ Guadalajara   │ $580,000  │ $560,000  │ $20,000  │  3.4% 🟡   ║
╠════════════════════════════════════════════════════════════════╣
║ TOTAL         │$2,240,000 │$2,095,000 │$145,000  │  6.5% 🟢   ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 🔐 PARTE 5: Control y Seguridad

### 5.1 Segregación de Funciones

**Principio:** Nadie puede autorizar y ejecutar pagos simultáneamente.

```
┌─────────────────────────────────────────┐
│         FLUJO DE APROBACIONES           │
└─────────────────────────────────────────┘

Empleado                    Solicita pago
    │                            │
    ▼                            ▼
Supervisor              Autoriza (1ra aprobación)
    │                            │
    ▼                            ▼
Gerente                 Autoriza (2da aprobación)
    │                            │
    ▼                            ▼
Contador                Ejecuta pago
    │                            │
    ▼                            ▼
Gerente General        Revisa y concilia
```

### 5.2 Auditoría Completa

**TODO se registra:**

```sql
-- Ejemplo de tabla de auditoría
CREATE TABLE auditoria_financiera (
    id UUID PRIMARY KEY,
    tabla_afectada VARCHAR(50),
    registro_id UUID,
    accion VARCHAR(20),  -- insert, update, delete
    usuario_id UUID,
    sucursal_id UUID,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP DEFAULT NOW()
);
```

**Consulta de Auditoría:**

```sql
-- Ver historial completo de un pago
SELECT 
    a.timestamp,
    a.accion,
    u.name as usuario,
    a.datos_nuevos
FROM auditoria_financiera a
JOIN users u ON a.usuario_id = u.id
WHERE a.registro_id = 'pago-uuid'
ORDER BY a.timestamp;
```

---

## 📱 PARTE 6: Alertas y Notificaciones

### 6.1 Sistema de Alertas Automáticas

```python
# Alertas automáticas críticas
ALERTAS = {
    'pago_vencido': {
        'gravedad': 'alta',
        'destinatarios': ['gerente', 'contador'],
        'canales': ['email', 'sms', 'whatsapp']
    },
    'saldo_bajo': {
        'gravedad': 'media',
        'destinatarios': ['contador'],
        'canales': ['email', 'dashboard']
    },
    'descuadre_caja': {
        'gravedad': 'critica',
        'destinatarios': ['gerente', 'director_financiero'],
        'canales': ['sms', 'llamada']
    },
    'reembolso_alto': {
        'gravedad': 'media',
        'destinatarios': ['gerente'],
        'canales': ['email', 'dashboard']
    }
}
```

### 6.2 Dashboard de Alertas

```
╔════════════════════════════════════════════════════════╗
║              ALERTAS ACTIVAS - SISTEMA                 ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  🔴 CRÍTICAS (2)                                       ║
║  ├─ Descuadre caja Cancún: $5,000                     ║
║  └─ Pago vencido operador > 30 días                   ║
║                                                        ║
║  🟡 MEDIAS (5)                                         ║
║  ├─ Saldo banco < $50,000                             ║
║  ├─ 3 pagos vencen mañana                             ║
║  └─ Reembolso $15,000 pendiente                       ║
║                                                        ║
║  🟢 BAJAS (12)                                         ║
║  └─ Información general                               ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

## 📈 PARTE 7: Reportes y Analytics

### 7.1 Reportes Clave

**1. Reporte de Flujo de Caja (Cash Flow)**

```
╔════════════════════════════════════════════════════════╗
║         FLUJO DE CAJA - Próximos 30 Días              ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  Saldo Inicial (Hoy):         $320,000                ║
║                                                        ║
║  ENTRADAS PROGRAMADAS:                                 ║
║  ├─ Pagos de clientes         $180,000                ║
║  └─ Comisiones esperadas      $ 25,000                ║
║  ───────────────────────────────────────               ║
║  Total Entradas               $205,000                ║
║                                                        ║
║  SALIDAS PROGRAMADAS:                                  ║
║  ├─ Pagos operadores          $150,000                ║
║  ├─ Nómina                    $ 45,000                ║
║  ├─ Gastos operativos         $ 30,000                ║
║  └─ Reembolsos                $ 20,000                ║
║  ───────────────────────────────────────               ║
║  Total Salidas                $245,000                ║
║                                                        ║
║  ═══════════════════════════════════════               ║
║  Saldo Proyectado             $280,000  🟢            ║
║  ═══════════════════════════════════════               ║
║                                                        ║
║  Saldo Mínimo Requerido:      $100,000                ║
║  Margen de Seguridad:         $180,000  🟢            ║
╚════════════════════════════════════════════════════════╝
```

**2. Aging de Cuentas por Cobrar**

```
╔════════════════════════════════════════════════════════╗
║       ANTIGÜEDAD DE SALDOS - Cuentas por Cobrar       ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  0-30 días:       $120,000  (60%)  🟢                 ║
║  31-60 días:      $ 50,000  (25%)  🟡                 ║
║  61-90 días:      $ 20,000  (10%)  🟠                 ║
║  > 90 días:       $ 10,000  ( 5%)  🔴                 ║
║  ───────────────────────────────────────               ║
║  Total:           $200,000  (100%)                     ║
║                                                        ║
║  Riesgo Incobrable Estimado: $8,000 (4%)              ║
╚════════════════════════════════════════════════════════╝
```

**3. Análisis de Rentabilidad por Tipo de Tour**

```sql
SELECT 
    t.tour_type,
    COUNT(*) as num_tours,
    SUM(tr.total_amount) as ingresos,
    SUM(cxp.monto_total) as costos,
    SUM(tr.total_amount) - SUM(cxp.monto_total) as utilidad,
    ((SUM(tr.total_amount) - SUM(cxp.monto_total)) / SUM(tr.total_amount) * 100) as margen
FROM trips tr
JOIN tours t ON tr.tour_id = t.id
LEFT JOIN cuentas_por_pagar cxp ON tr.trip_id = cxp.trip_id
WHERE tr.status = 'completed'
AND tr.departure_date BETWEEN '2024-10-01' AND '2024-10-31'
GROUP BY t.tour_type
ORDER BY margen DESC;
```

---

## 🚨 PARTE 8: Prevención de Pérdidas

### 8.1 Checklist de Control

**ANTES de cada tour:**
```
☐ Cliente pagó 100% o tiene garantía
☐ Operador confirmó servicio
☐ Pago a operador programado o ejecutado
☐ Documentos firmados y guardados
☐ Seguro contratado si aplica
```

**DESPUÉS de cada tour:**
```
☐ Tour marcado como completado
☐ Factura emitida al cliente
☐ Factura recibida del operador
☐ Pagos conciliados
☐ Documentación archivada
```

### 8.2 Reglas de Negocio Automáticas

```python
# Reglas que el sistema verifica automáticamente
BUSINESS_RULES = {
    'no_tour_sin_pago': {
        'condicion': lambda trip: trip.paid_amount >= trip.total_amount * 0.5,
        'accion': 'Bloquear confirmación si no hay al menos 50% pagado',
        'excepcion': 'Clientes VIP con crédito aprobado'
    },
    'no_pago_operador_antes_tour': {
        'condicion': lambda trip: trip.departure_date > datetime.now() + timedelta(days=1),
        'accion': 'No pagar al operador hasta 24h antes del tour',
        'razon': 'Protección ante cancelaciones'
    },
    'reembolso_requiere_autorizacion': {
        'condicion': lambda refund: refund.amount > 5000,
        'accion': 'Reembolsos > $5,000 requieren autorización gerente',
        'proceso': 'Enviar notificación automática'
    },
    'alerta_margen_bajo': {
        'condicion': lambda trip: trip.profit_margin < 0.10,
        'accion': 'Alertar si margen < 10%',
        'destinatario': 'Gerente comercial'
    }
}
```

### 8.3 Conciliación Bancaria Diaria

```sql
-- Verificar que todo cuadre diariamente
SELECT 
    fecha,
    
    -- Ingresos según sistema
    (SELECT SUM(monto) FROM pagos_recibidos WHERE fecha = fecha_hoy) as ingresos_sistema,
    
    -- Egresos según sistema
    (SELECT SUM(monto) FROM pagos_realizados WHERE fecha = fecha_hoy) as egresos_sistema,
    
    -- Movimientos bancarios reales
    (SELECT SUM(monto) FROM movimientos_banco WHERE fecha = fecha_hoy AND tipo = 'ingreso') as ingresos_banco,
    (SELECT SUM(monto) FROM movimientos_banco WHERE fecha = fecha_hoy AND tipo = 'egreso') as egresos_banco,
    
    -- Diferencias (deben ser $0)
    (ingresos_sistema - ingresos_banco) as diferencia_ingresos,
    (egresos_sistema - egresos_banco) as diferencia_egresos
FROM fechas_activas
WHERE fecha = CURRENT_DATE;
```

**Si hay diferencia:**
```
🔴 ALERTA: Descuadre detectado
   Sistema: $125,000
   Banco:   $123,500
   Dif:     $  1,500
   
   [Investigar Inmediatamente]
```

---

## 🎯 RESUMEN EJECUTIVO

### Beneficios del Sistema

✅ **Control Total:**
- Cada peso está registrado
- Auditoría completa de todo
- Trazabilidad 100%

✅ **Cero Pérdidas:**
- Alertas automáticas
- Reglas de negocio aplicadas
- Conciliación diaria

✅ **Visibilidad:**
- Dashboards en tiempo real
- Reportes automáticos
- Analytics predictivo

✅ **Eficiencia:**
- Procesos automatizados
- Menos errores humanos
- Más rápido

✅ **Multi-Sucursal:**
- Cada sucursal independiente
- Consolidación automática
- Comparación de desempeño

---

## 📊 Implementación

### Tablas Necesarias (Resumen)

```
1. cuentas_por_cobrar          (CXC clientes)
2. pagos_recibidos             (Pagos de clientes)
3. cuentas_por_pagar           (CXP proveedores)
4. pagos_realizados            (Pagos a proveedores)
5. comisiones_por_pagar        (Comisiones agencias)
6. reembolsos_por_pagar        (Reembolsos clientes)
7. reembolsos_ejecutados       (Reembolsos procesados)
8. sucursales                  (Catálogo sucursales)
9. centros_costo               (Centros de costo)
10. movimientos_contables      (Libro mayor)
11. conciliaciones_bancarias   (Conciliaciones)
12. auditoria_financiera       (Logs de auditoría)
```

Total: ~12 tablas adicionales para contabilidad completa.

---

**Conclusión:** Con este sistema tienes **CONTROL TOTAL** de cada peso que entra y sale, evitando pérdidas y permitiendo tomar decisiones basadas en datos reales.

¿Necesitas que implemente alguna parte específica del sistema?
