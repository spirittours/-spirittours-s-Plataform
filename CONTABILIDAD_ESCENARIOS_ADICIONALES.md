# 📚 Spirit Tours - Escenarios Adicionales del Sistema de Contabilidad

## 📑 Tabla de Contenidos

1. [Pagos Parciales y Planes de Pago](#pagos-parciales-y-planes-de-pago)
2. [Notas de Crédito](#notas-de-cr%C3%A9dito)
3. [Cambio de Moneda y Pagos Internacionales](#cambio-de-moneda-y-pagos-internacionales)
4. [Anticipos y Depósitos](#anticipos-y-dep%C3%B3sitos)
5. [Cobro Jurídico y Cuentas Incobrables](#cobro-jur%C3%ADdico-y-cuentas-incobrables)
6. [Transferencias Entre Sucursales](#transferencias-entre-sucursales)
7. [Descuentos y Promociones](#descuentos-y-promociones)
8. [Pagos Diferidos a Proveedores](#pagos-diferidos-a-proveedores)

---

## 💳 Pagos Parciales y Planes de Pago

### Escenario 1: Cliente Solicita Pagar en 3 Parcialidades

**Situación:**  
Cliente reserva tour por $15,000. Solicita pagar en 3 pagos mensuales.

**Flujo del Proceso:**

```
Día 1: Reserva y Primer Pago
──────────────────────────────
1. Crear CXC por $15,000
2. Registrar pago de $5,000
3. Estado: "parcial"
4. Monto pendiente: $10,000

Sistema genera automáticamente:
→ CXC Original: $15,000
→ Pago 1: $5,000 (registrado)
→ Pendiente: $10,000

Día 30: Segundo Pago
──────────────────────
1. Cliente paga $5,000
2. Cajero registra pago
3. Monto pendiente: $5,000
4. Estado sigue: "parcial"

Día 60: Pago Final
──────────────────────
1. Cliente paga $5,000
2. Cajero registra pago
3. Monto pendiente: $0.00
4. Estado cambia a: "cobrado" ✅
```

### Implementación en Base de Datos

```sql
-- Crear CXC con plan de pagos
INSERT INTO cuentas_por_cobrar (
  folio, customer_id, sucursal_id,
  monto_total, monto_pagado, monto_pendiente,
  fecha_vencimiento, status, plan_pagos
) VALUES (
  'CXC-202510-000150',
  'customer_uuid',
  'sucursal_uuid',
  15000.00,
  0.00,
  15000.00,
  '2025-12-27',
  'pendiente',
  jsonb_build_object(
    'num_parcialidades', 3,
    'monto_parcialidad', 5000.00,
    'frecuencia', 'mensual',
    'fechas_vencimiento', ARRAY['2025-10-27', '2025-11-27', '2025-12-27']
  )
);

-- Registrar pagos parciales
INSERT INTO pagos_recibidos (...)
VALUES (...);

-- El trigger actualiza automáticamente:
-- monto_pagado y monto_pendiente en CXC
```

### Alertas Automáticas

```javascript
// Scheduled job para recordatorios de pago
cron.schedule('0 9 * * *', async () => {
  // Buscar CXC con plan de pagos próximos a vencer
  const proximosVencer = await pool.query(`
    SELECT cxc.*, c.email, c.telefono
    FROM cuentas_por_cobrar cxc
    JOIN customers c ON cxc.customer_id = c.id
    WHERE cxc.plan_pagos IS NOT NULL
      AND cxc.status IN ('pendiente', 'parcial')
      AND (cxc.plan_pagos->'fechas_vencimiento')::jsonb ?| ARRAY[
        (NOW() + INTERVAL '3 days')::date::text
      ]
  `);
  
  // Enviar recordatorio por email/SMS
  for (const cxc of proximosVencer.rows) {
    await sendPaymentReminder(cxc);
  }
});
```

---

## 📝 Notas de Crédito

### Escenario 2: Cliente Pagó de Más

**Situación:**  
Cliente debía $10,000, pagó $12,000 por error (depositó mal).

**Flujo del Proceso:**

```
Paso 1: Detección del Sobrepago
────────────────────────────────
Sistema detecta automáticamente:
- Monto CXC: $10,000
- Pago recibido: $12,000
- Diferencia: +$2,000

Alerta automática: "Sobrepago detectado"

Paso 2: Opciones para el Gerente
─────────────────────────────────
Opción A: Reembolsar el exceso
  → Crear reembolso por $2,000
  → Cliente recibe transferencia

Opción B: Crear nota de crédito
  → Cliente tiene saldo a favor $2,000
  → Puede usar en futuras compras

Opción C: Aplicar a otra cuenta
  → Si cliente tiene otra CXC pendiente
  → Transferir el exceso
```

### Implementación de Nota de Crédito

```sql
-- Tabla para notas de crédito
CREATE TABLE IF NOT EXISTS notas_credito (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  sucursal_id UUID NOT NULL REFERENCES sucursales(id),
  monto_original NUMERIC(10, 2) NOT NULL,
  monto_disponible NUMERIC(10, 2) NOT NULL,
  origen VARCHAR(50) NOT NULL, -- 'sobrepago', 'devolucion', 'cancelacion'
  cxc_origen_id UUID REFERENCES cuentas_por_cobrar(id),
  fecha_vencimiento TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'activa',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_status_nc CHECK (
    status IN ('activa', 'aplicada', 'vencida', 'cancelada')
  )
);

-- Crear nota de crédito por sobrepago
INSERT INTO notas_credito (
  folio, customer_id, sucursal_id,
  monto_original, monto_disponible,
  origen, cxc_origen_id, fecha_vencimiento,
  notas
) VALUES (
  'NC-202510-000001',
  'customer_uuid',
  'sucursal_uuid',
  2000.00,
  2000.00,
  'sobrepago',
  'cxc_uuid',
  NOW() + INTERVAL '1 year',
  'Sobrepago en CXC-202510-000123. Cliente pagó $12,000 en lugar de $10,000.'
);
```

### Aplicar Nota de Crédito a Nueva Compra

```javascript
async function applyNotaCredito(cxc_id, nota_credito_id) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Obtener CXC y nota de crédito
    const cxc = await getCXCById(cxc_id);
    const nc = await getNotaCreditoById(nota_credito_id);
    
    // Validar
    if (nc.customer_id !== cxc.customer_id) {
      throw new Error('Nota de crédito no pertenece al cliente');
    }
    
    if (nc.status !== 'activa') {
      throw new Error('Nota de crédito no está activa');
    }
    
    // Calcular monto a aplicar
    const monto_aplicar = Math.min(nc.monto_disponible, cxc.monto_pendiente);
    
    // Aplicar nota de crédito como "pago"
    await registerPaymentReceived(cxc_id, {
      monto: monto_aplicar,
      metodo_pago: 'nota_credito',
      referencia: nc.folio,
      usuario_id: 'SYSTEM'
    });
    
    // Actualizar nota de crédito
    const nuevo_disponible = parseFloat(nc.monto_disponible) - monto_aplicar;
    const nuevo_status = nuevo_disponible <= 0.01 ? 'aplicada' : 'activa';
    
    await client.query(`
      UPDATE notas_credito
      SET monto_disponible = $1, status = $2
      WHERE id = $3
    `, [nuevo_disponible, nuevo_status, nota_credito_id]);
    
    await client.query('COMMIT');
    
    return { monto_aplicado: monto_aplicar, saldo_restante: nuevo_disponible };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## 🌎 Cambio de Moneda y Pagos Internacionales

### Escenario 3: Cliente Paga en Dólares (USD)

**Situación:**  
Tour cuesta $12,000 MXN. Cliente extranjero paga $600 USD.

**Configuración del Sistema:**

```sql
-- Tabla de tipos de cambio
CREATE TABLE IF NOT EXISTS tipos_cambio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  moneda_origen VARCHAR(3) NOT NULL,
  moneda_destino VARCHAR(3) NOT NULL,
  tipo_cambio NUMERIC(10, 6) NOT NULL,
  fuente VARCHAR(50), -- 'banxico', 'manual', 'api_exchange'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_tc_fecha_monedas UNIQUE (fecha, moneda_origen, moneda_destino)
);

-- Insertar tipo de cambio actual
INSERT INTO tipos_cambio (fecha, moneda_origen, moneda_destino, tipo_cambio, fuente)
VALUES ('2025-10-27', 'USD', 'MXN', 20.15, 'banxico');
```

**Registro de Pago Multi-Moneda:**

```javascript
async function registerForeignCurrencyPayment(cxc_id, paymentData) {
  const {
    monto_original, // 600 USD
    moneda_original, // 'USD'
    tipo_cambio, // 20.15
    metodo_pago,
    referencia
  } = paymentData;
  
  // Calcular equivalente en MXN
  const monto_mxn = monto_original * tipo_cambio; // 600 * 20.15 = 12,090 MXN
  
  // Registrar pago en MXN (moneda del sistema)
  const payment = await registerPaymentReceived(cxc_id, {
    monto: monto_mxn,
    metodo_pago,
    referencia,
    moneda_original,
    monto_original,
    tipo_cambio,
    usuario_id: paymentData.usuario_id
  });
  
  // El sistema maneja todo en MXN internamente
  // Pero guarda la información de moneda original para auditoría
  
  return payment;
}
```

**Extensión de Tabla `pagos_recibidos`:**

```sql
ALTER TABLE pagos_recibidos
  ADD COLUMN moneda_original VARCHAR(3) DEFAULT 'MXN',
  ADD COLUMN monto_original NUMERIC(10, 2),
  ADD COLUMN tipo_cambio NUMERIC(10, 6) DEFAULT 1.0;
```

---

## 💰 Anticipos y Depósitos

### Escenario 4: Cliente Paga Anticipo para Reservar

**Situación:**  
Tour cuesta $15,000. Cliente paga $3,000 de anticipo al reservar.

**Flujo:**

```
Día 1: Reserva con Anticipo
────────────────────────────
1. Crear CXC por $15,000
2. Registrar anticipo de $3,000
3. Monto pendiente: $12,000
4. Fecha viaje: 15-Dic-2025
5. Fecha límite pago completo: 01-Dic-2025

Sistema marca como:
- Status: "parcial"
- Tipo pago: "anticipo"
- Alerta si no paga completo antes de fecha límite

Día 25-Nov: Recordatorio Automático
────────────────────────────────────
Email al cliente:
"Faltan 6 días para el pago final de $12,000
 Fecha límite: 01-Dic-2025"

Opción A: Cliente Paga a Tiempo
────────────────────────────────
1. Cliente paga $12,000
2. Estado cambia a "cobrado"
3. Confirmar servicio con proveedor

Opción B: Cliente No Paga
──────────────────────────
1. Fecha límite vence
2. Sistema genera alerta "Anticipo no completado"
3. Gerente decide:
   - Dar prórroga (extender fecha)
   - Cancelar y retener anticipo
   - Ofrecer plan de pagos
```

**Política de Anticipos:**

```javascript
const ANTICIPO_CONFIG = {
  porcentaje_minimo: 20, // 20% mínimo
  porcentaje_maximo: 50, // 50% máximo
  dias_antes_viaje: 14, // Pagar completo 14 días antes
  politica_cancelacion: {
    // Si cancela después de dar anticipo
    antes_60_dias: { reembolso: 100, retencion: 0 },
    antes_30_dias: { reembolso: 50, retencion: 50 },
    antes_14_dias: { reembolso: 0, retencion: 100 }
  }
};
```

---

## ⚖️ Cobro Jurídico y Cuentas Incobrables

### Escenario 5: Cuenta Vencida >90 Días

**Situación:**  
CXC de $25,000 lleva 95 días vencida. Cliente no responde.

**Proceso de Escalamiento:**

```
┌─────────────────────────────────────────────┐
│ LÍNEA DE TIEMPO - PROCESO COBRANZA         │
├─────────────────────────────────────────────┤
│                                             │
│ Día 0:    Vencimiento                       │
│           ↓ Recordatorio automático         │
│                                             │
│ Día 7:    1ra llamada                       │
│           ↓ Email formal                    │
│                                             │
│ Día 15:   2da llamada                       │
│           ↓ Carta escrita                   │
│                                             │
│ Día 30:   Suspensión servicios              │
│           ↓ Reunión presencial              │
│                                             │
│ Día 60:   Oferta plan de pagos              │
│           ↓ Última oportunidad              │
│                                             │
│ Día 90:   🚨 DECISIÓN CRÍTICA               │
│           ├─→ Cobranza externa              │
│           ├─→ Proceso legal                 │
│           └─→ Provisión incobrable          │
│                                             │
└─────────────────────────────────────────────┘
```

**Reclasificar como Incobrable:**

```sql
-- Cambiar estado a incobrable
UPDATE cuentas_por_cobrar
SET 
  status = 'incobrable',
  fecha_incobrable = NOW(),
  monto_provision = monto_pendiente,
  notas = 'Cliente sin contacto >90 días. Proceso legal iniciado.'
WHERE id = 'cxc_uuid';

-- Crear asiento contable de provisión
INSERT INTO movimientos_contables (
  folio, sucursal_id, tipo, cuenta, debe, haber,
  referencia_tipo, referencia_id, concepto, fecha
) VALUES (
  'CONT-202510-000999',
  'sucursal_uuid',
  'gasto',
  'PROVISION_CUENTAS_INCOBRABLES',
  0,
  25000.00,
  'cuentas_por_cobrar',
  'cxc_uuid',
  'Provisión cuenta incobrable - Cliente XYZ',
  NOW()
);
```

**Recuperación Posterior:**

Si el cliente paga después de ser declarado incobrable:

```sql
-- Reversar provisión
UPDATE cuentas_por_cobrar
SET 
  status = 'cobrado',
  fecha_cobro_recuperado = NOW()
WHERE id = 'cxc_uuid';

-- Reversar asiento contable
-- (crear asiento contrario)
```

---

## 🏢 Transferencias Entre Sucursales

### Escenario 6: CDMX Vende, Cancún Opera

**Situación:**  
Cliente en CDMX compra tour en Cancún por $20,000.

**Distribución de Ingresos:**

```
Venta Total: $20,000
├─→ CDMX (Sucursal venta):    $3,000 (15% comisión)
└─→ Cancún (Sucursal opera):  $17,000 (85% operación)

Contabilización:
─────────────────────────────────────────────
CDMX registra:
  • CXC por $20,000 (al cliente)
  • CXP por $17,000 (a Cancún - transferencia interna)
  • Ingreso: $3,000 (comisión)

Cancún registra:
  • CXC por $17,000 (de CDMX - transferencia interna)
  • CXP por $12,000 (al proveedor)
  • Ingreso: $5,000 (margen operación)
```

**Implementación:**

```javascript
async function createInterBranchSale(saleData) {
  const {
    sucursal_venta,     // CDMX
    sucursal_operacion, // Cancún
    customer_id,
    monto_total,        // $20,000
    proveedor_id,
    costo_proveedor     // $12,000
  } = saleData;
  
  // Calcular distribución
  const comision_venta = monto_total * 0.15; // 15% = $3,000
  const monto_operacion = monto_total - comision_venta; // $17,000
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. CXC en sucursal de venta (CDMX cobra a cliente)
    const cxc_cliente = await createCXC({
      customer_id,
      sucursal_id: sucursal_venta,
      monto_total,
      tipo: 'cliente'
    });
    
    // 2. CXP de CDMX a Cancún (transferencia interna)
    const cxp_interna = await createCXP({
      sucursal_id: sucursal_venta,
      sucursal_destino: sucursal_operacion,
      monto_total: monto_operacion,
      tipo: 'transferencia_interna',
      concepto: `Transferencia por venta ${cxc_cliente.folio}`
    });
    
    // 3. CXC de Cancún a CDMX (recibirá $17,000)
    const cxc_interna = await createCXC({
      sucursal_id: sucursal_operacion,
      monto_total: monto_operacion,
      tipo: 'transferencia_interna',
      cxp_vinculada: cxp_interna.id
    });
    
    // 4. CXP de Cancún a proveedor
    const cxp_proveedor = await createCXP({
      proveedor_id,
      sucursal_id: sucursal_operacion,
      monto_total: costo_proveedor,
      tipo: 'proveedor',
      concepto: 'Pago a operador turístico'
    });
    
    // 5. Registrar comisiones
    await createCommissions({
      trip_id: trip_id,
      sucursal_venta,
      sucursal_operacion,
      monto_venta: monto_total
    });
    
    await client.query('COMMIT');
    
    return {
      cxc_cliente,
      cxp_interna,
      cxc_interna,
      cxp_proveedor
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## 🎁 Descuentos y Promociones

### Escenario 7: Promoción "2x1" en Temporada Baja

**Situación:**  
Tour cuesta $5,000 por persona. Promoción: compra 2, paga 1.

**Contabilización:**

```
Precio regular: $10,000 (2 personas × $5,000)
Descuento aplicado: -$5,000 (50%)
Precio final: $5,000

┌────────────────────────────────────────┐
│ TICKET DE VENTA                        │
├────────────────────────────────────────┤
│ Tour Xcaret - 2 adultos                │
│                                        │
│ Subtotal:        $10,000.00            │
│ Descuento (50%): -$5,000.00            │
│ ─────────────────────────────────      │
│ TOTAL:           $5,000.00             │
└────────────────────────────────────────┘

Contabilización:
───────────────────────────────────────
• CXC por $5,000 (lo que pagará el cliente)
• Registro de descuento para análisis
• Costo proveedor sigue siendo por 2 personas

Análisis de Rentabilidad:
───────────────────────────────────────
Ingreso real:      $5,000
Costo proveedor:   $4,000 (2 personas)
Utilidad:          $1,000 (20% margen)
VS regular:        $6,000 utilidad (60% margen)

Conclusión: Aceptable en temporada baja
            para mantener flujo de ingresos
```

**Tabla de Descuentos:**

```sql
CREATE TABLE IF NOT EXISTS descuentos_aplicados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cxc_id UUID NOT NULL REFERENCES cuentas_por_cobrar(id),
  tipo_descuento VARCHAR(50) NOT NULL, -- 'promocion', 'cliente_vip', 'temporada_baja'
  codigo_promocion VARCHAR(50),
  monto_original NUMERIC(10, 2) NOT NULL,
  monto_descuento NUMERIC(10, 2) NOT NULL,
  porcentaje NUMERIC(5, 2),
  justificacion TEXT,
  autorizado_por UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 📅 Pagos Diferidos a Proveedores

### Escenario 8: Crédito a 30/60/90 Días

**Situación:**  
Proveedor ofrece crédito a 60 días sin intereses.

**Configuración de Proveedor:**

```sql
UPDATE proveedores
SET 
  dias_credito = 60,
  descuento_pronto_pago = 2.0, -- 2% si paga en 15 días
  limite_credito = 100000.00
WHERE id = 'proveedor_uuid';
```

**Crear CXP con Crédito:**

```javascript
async function createCXPWithCredit(cxpData) {
  const proveedor = await getProveedorById(cxpData.proveedor_id);
  
  // Calcular fecha de vencimiento según crédito
  const fecha_vencimiento = new Date();
  fecha_vencimiento.setDate(fecha_vencimiento.getDate() + proveedor.dias_credito);
  
  // Calcular descuento por pronto pago (opcional)
  const fecha_pronto_pago = new Date();
  fecha_pronto_pago.setDate(fecha_pronto_pago.getDate() + 15);
  
  const monto_con_descuento = cxpData.monto_total * (1 - proveedor.descuento_pronto_pago / 100);
  
  const cxp = await createCXP({
    ...cxpData,
    fecha_vencimiento,
    dias_credito: proveedor.dias_credito,
    descuento_pronto_pago: proveedor.descuento_pronto_pago,
    monto_con_descuento,
    fecha_limite_descuento: fecha_pronto_pago
  });
  
  // Alerta 5 días antes del descuento
  scheduleAlert(
    fecha_pronto_pago.setDate(fecha_pronto_pago.getDate() - 5),
    {
      tipo: 'descuento_pronto_pago_disponible',
      titulo: 'Descuento Disponible por Pronto Pago',
      mensaje: `Pagar CXP ${cxp.folio} antes del ${fecha_pronto_pago.toLocaleDateString()} = 2% descuento ($${(cxpData.monto_total * 0.02).toFixed(2)})`
    }
  );
  
  return cxp;
}
```

---

## 📊 Resumen de Funcionalidades Adicionales

| Escenario | Implementado | En Roadmap |
|-----------|-------------|------------|
| ✅ Pagos parciales | Completo | - |
| ✅ Planes de pago | Completo | - |
| ✅ Notas de crédito | Básico | Avanzado (aplicación automática) |
| ✅ Multi-moneda | Básico | API tipo cambio en tiempo real |
| ✅ Anticipos | Completo | - |
| ✅ Cuentas incobrables | Completo | - |
| ✅ Transferencias inter-sucursal | Completo | - |
| ✅ Descuentos | Básico | Campañas promocionales automatizadas |
| ✅ Crédito proveedores | Completo | - |
| ⏳ Pagos recurrentes | - | Q1 2026 |
| ⏳ Suscripciones | - | Q2 2026 |
| ⏳ Tokenización tarjetas | - | Q1 2026 |

---

**Última actualización:** 27 de octubre de 2025  
**Versión:** 1.0  
**Preparado por:** Equipo de Desarrollo - Spirit Tours
