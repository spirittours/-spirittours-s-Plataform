# ❓ PREGUNTAS FRECUENTES Y CASOS ESPECIALES

Respuestas detalladas a preguntas comunes sobre el sistema contable.

---

## 📋 SECCIÓN 1: Preguntas Generales

### ❓ P1: ¿Qué pasa si un cliente paga en efectivo?

**R:** El sistema maneja efectivo de forma especial:

```
1. RECEPCIÓN:
   Cliente paga en oficina → Cajero recibe efectivo

2. REGISTRO INMEDIATO:
   Cajero registra en sistema:
   
   INSERT INTO pagos_recibidos (
       folio,
       cxc_id,
       monto,
       metodo_pago,
       fecha_pago,
       recibido_por,
       turno_caja
   ) VALUES (
       'PAG-EF-2024-001',
       'cxc-uuid',
       5000.00,
       'efectivo',
       NOW(),
       'cajero-juan-uuid',
       'turno-matutino'
   );

3. COMPROBANTE:
   Sistema genera e imprime recibo automáticamente
   Cliente firma copia para la empresa

4. CAJA CHICA:
   Efectivo se registra en caja del día
   
   INSERT INTO movimientos_caja (
       sucursal_id,
       fecha,
       tipo,
       monto,
       concepto,
       folio_relacionado
   ) VALUES (
       'cancun',
       NOW(),
       'ingreso',
       5000.00,
       'Pago cliente ST-2024-1234',
       'PAG-EF-2024-001'
   );

5. CORTE DE CAJA:
   Al final del día, cajero hace corte:
   • Cuenta efectivo físico
   • Compara con sistema
   • Si cuadra: ✅ Cierra caja
   • Si no cuadra: 🚨 Alerta gerente

6. DEPÓSITO BANCARIO:
   Al día siguiente, efectivo se deposita al banco
   Contador registra depósito y concilia
```

**Control de seguridad:**
- ✅ Dos personas cuentan el efectivo
- ✅ Cámaras de seguridad en caja
- ✅ Comprobante físico firmado
- ✅ Corte de caja diario obligatorio
- ✅ Máximo $10,000 en caja (resto a banco)

---

### ❓ P2: ¿Qué pasa si el banco cobra comisión en una transferencia?

**R:** Las comisiones bancarias se registran como gasto:

```
EJEMPLO:
- Cliente transfiere: $10,000
- Banco cobra comisión: $50
- Empresa recibe: $9,950

REGISTRO EN SISTEMA:

1. Pago del cliente:
   INSERT INTO pagos_recibidos (
       monto: 10000.00,     // Monto que el cliente pagó
       monto_recibido: 9950.00,  // Lo que llegó a cuenta
       comision_bancaria: 50.00
   );

2. Gasto comisión bancaria:
   INSERT INTO gastos_operativos (
       concepto: 'Comisión bancaria',
       monto: 50.00,
       categoria: 'comisiones_bancarias'
   );

3. Actualizar CXC:
   // Cliente pagó $10,000 completos
   UPDATE cuentas_por_cobrar
   SET monto_pagado = 10000.00  // Completo
   WHERE ...;

   ✅ Cliente no debe nada
   ❌ Cliente NO debe los $50 de comisión (la empresa lo absorbe)
```

**Nota importante:**
- El cliente pagó $10,000 → Su deuda está saldada
- La comisión de $50 es costo de la empresa
- Se registra como gasto operativo

---

### ❓ P3: ¿Qué pasa si un proveedor da descuento?

**R:** Los descuentos se registran correctamente:

```
ESCENARIO:
- Servicio acordado: $8,000
- Proveedor ofrece descuento 10%: -$800
- Total a pagar: $7,200

REGISTRO:

1. CXP original:
   INSERT INTO cuentas_por_pagar (
       monto_original: 8000.00,
       descuento_porcentaje: 10.00,
       descuento_monto: 800.00,
       monto_total: 7200.00,  // Monto final a pagar
       motivo_descuento: 'Descuento por volumen'
   );

2. Al pagar:
   INSERT INTO pagos_realizados (
       monto: 7200.00  // Solo pagamos esto
   );

3. Beneficio del descuento:
   // Se refleja automáticamente en P&L como menor costo
   
   Ingreso del tour:  $12,000
   Costo proveedor:   $ 7,200  (antes era $8,000)
   ───────────────────────────
   Utilidad:          $ 4,800  (+$800 por el descuento) 🟢
```

---

### ❓ P4: ¿Qué pasa si hay un error y se registra un pago dos veces?

**R:** El sistema tiene protección contra duplicados:

```
PROTECCIÓN 1: Constraint en BD
──────────────────────────────

ALTER TABLE pagos_recibidos
ADD CONSTRAINT unique_payment_reference
UNIQUE (metodo_pago, referencia, monto, fecha_pago);

// Ejemplo:
// - Transferencia BBVA
// - Referencia: 123456
// - Monto: $5,000
// - Fecha: 2024-11-15

// Si intentas registrar de nuevo:
❌ ERROR: duplicate key value violates unique constraint


PROTECCIÓN 2: Validación antes de guardar
─────────────────────────────────────────

async function registrarPago(data) {
    // Buscar pagos similares en últimas 24 horas
    const similares = await db.query(`
        SELECT * FROM pagos_recibidos
        WHERE metodo_pago = $1
        AND referencia = $2
        AND ABS(monto - $3) < 1.00
        AND fecha_pago > NOW() - INTERVAL '24 hours'
    `, [data.metodo_pago, data.referencia, data.monto]);
    
    if (similares.length > 0) {
        // Mostrar alerta al usuario
        return {
            error: true,
            tipo: 'posible_duplicado',
            mensaje: '⚠️ Encontramos un pago similar registrado hace X horas',
            pago_existente: similares[0],
            opciones: [
                'Cancelar (era duplicado)',
                'Continuar (son pagos diferentes)'
            ]
        };
    }
    
    // Proceder con registro normal
}


PROTECCIÓN 3: Auditoría
────────────────────────

Si se detecta duplicado después:

1. Sistema marca ambos pagos como "revisión_requerida"
2. Alerta automática a contador y gerente
3. Revisar manualmente:
   • Si es duplicado: Cancelar uno
   • Si son pagos legítimos: Marcar como válidos


PROCESO DE CORRECCIÓN:
─────────────────────

// Marcar el duplicado
UPDATE pagos_recibidos
SET 
    status = 'cancelado',
    motivo_cancelacion = 'Pago duplicado - Error de captura',
    cancelado_por = 'contador-uuid',
    fecha_cancelacion = NOW()
WHERE folio = 'PAG-IN-duplicado';

// Reversar la aplicación a CXC
UPDATE cuentas_por_cobrar
SET 
    monto_pagado = monto_pagado - 5000.00,
    monto_pendiente = monto_pendiente + 5000.00
WHERE ...;

// Registro en auditoría
INSERT INTO auditoria_financiera (...);
```

---

## 📋 SECCIÓN 2: Casos Especiales - Reembolsos

### ❓ P5: ¿Qué pasa si el cliente cancela DESPUÉS del tour?

**R:** No hay reembolso, pero se registra:

```
POLÍTICA:
- Cancelación después del tour = 0% reembolso

FLUJO:

1. Cliente intenta cancelar:
   Sistema detecta: departure_date < NOW()
   
2. Respuesta automática:
   {
       "reembolso_permitido": false,
       "razon": "Tour ya realizado",
       "politica_aplicable": "0% - Servicio prestado",
       "monto_reembolso": 0.00
   }

3. Trip se marca como "no_show" o "completed"
   (dependiendo si fue o no fue)

4. Email al cliente:
   "Lamentamos informar que no es posible reembolso
    para tours ya realizados según nuestros términos
    y condiciones."

5. Si hay reclamo legítimo (ej: tour no se realizó):
   • Revisar evidencia (GPS, fotos, etc.)
   • Si procede: Reembolso manual autorizado por director
   • Registrar como "reembolso_excepcional"
```

---

### ❓ P6: ¿Qué pasa si el cliente quiere cambiar fecha en vez de cancelar?

**R:** Cambio de fecha NO genera reembolso:

```
FLUJO:

1. Cliente solicita cambio:
   "Puedo mover mi tour del 20-Nov al 25-Nov?"

2. Sistema verifica:
   • Disponibilidad nueva fecha ✅
   • Tour aún no realizado ✅
   • Pago completo ✅

3. Proceso de modificación:
   
   UPDATE trips
   SET 
       departure_date_original = departure_date,
       departure_date = '2025-11-25',
       status = 'modified',
       modified_at = NOW(),
       modification_reason = 'Cliente solicitó cambio de fecha',
       modified_by = 'agent-uuid'
   WHERE trip_id = 'trip-uuid';
   
   // NO se crea reembolso
   // NO se cobra extra
   // CXC permanece igual (ya pagado)

4. Historial de cambios:
   INSERT INTO trip_status_history (
       trip_id,
       previous_status: 'upcoming',
       new_status: 'modified',
       changed_by: 'agent-uuid',
       reason: 'Cambio de fecha solicitado por cliente'
   );

5. Notificaciones:
   • Cliente: "Tu tour se movió al 25-Nov"
   • Operador: "Tour ST-2024-1234 cambió de fecha"
   • Guía: "Actualización en asignación"

6. CXP al operador se ajusta:
   UPDATE cuentas_por_pagar
   SET fecha_vencimiento = '2025-11-26'  // Día después del nuevo tour
   WHERE trip_id = 'trip-uuid';
```

**Política recomendada:**
- ✅ 1er cambio de fecha: Gratis
- ✅ 2do cambio: Cargo $500
- ❌ 3er cambio: No permitido (debe cancelar)

---

### ❓ P7: ¿Qué pasa si el cliente quiere reembolso pero ya se pagó al operador?

**R:** Se debe recuperar el dinero del operador primero:

```
SITUACIÓN:
- Cliente cancela 10 días antes → 75% reembolso
- Pero operador YA fue pagado ($8,000)

FLUJO COMPLETO:

1. Calcular reembolso al cliente:
   Pagó: $10,000
   Reembolso 75%: $7,500
   Retención 25%: $2,500

2. Verificar si se pagó a operador:
   SELECT * FROM cuentas_por_pagar
   WHERE trip_id = 'trip-uuid'
   AND status IN ('pagado', 'conciliado');
   
   Resultado: ✅ Ya se pagó $8,000

3. Crear CXC al operador (recuperar):
   INSERT INTO cuentas_por_cobrar (
       folio: 'CXC-OPER-2024-001',
       proveedor_id: 'operador-uuid',
       trip_id: 'trip-uuid',
       concepto: 'Recuperación por cancelación',
       monto_total: 8000.00,
       fecha_vencimiento: NOW() + INTERVAL '7 days',
       status: 'pendiente'
   );

4. Notificar al operador:
   Email:
   "Cliente canceló tour ST-2024-1234.
    Según contrato, debe devolver $8,000.
    Fecha límite: 7 días.
    Datos bancarios para devolución: [...]"

5. OPCIONES:

   A) Operador devuelve rápido (dentro de 7 días):
      → Spirit Tours recibe $8,000
      → Spirit Tours reembolsa $7,500 al cliente
      → Spirit Tours retiene $500 neto
      ✅ Todo resuelto
   
   B) Operador NO devuelve:
      → Reembolsar al cliente de todas formas? 
      
      DECISIÓN GERENCIAL:
      
      Opción 1: Reembolsar al cliente igual
      - Mejor para reputación
      - Empresa absorbe la pérdida de $7,500
      - Luego recuperar del operador
      
      Opción 2: Esperar a que operador pague
      - Cliente debe esperar
      - Riesgo: Cliente molesto
      - Pero protege finanzas de empresa

6. REGISTRO SI SE REEMBOLSA SIN RECUPERAR:
   
   INSERT INTO reembolsos_ejecutados (
       monto: 7500.00,
       nota: 'Reembolso procesado antes de recuperar de operador'
   );
   
   INSERT INTO cuentas_por_cobrar_adicionales (
       concepto: 'Pérdida por reembolso no recuperado',
       monto: 7500.00,
       tipo: 'perdida_temporal',
       responsable: 'operador-uuid'
   );

7. SEGUIMIENTO:
   • Recordatorios automáticos al operador
   • Escalación legal si no paga en 30 días
   • Opción: Descontar de futuros pagos
```

**Recomendación:**
- Contrato con operadores debe incluir cláusula:
  "En caso de cancelación, operador devuelve pago en 7 días"
- Retener 10% de cada pago en cuenta de garantía
- Usar esa garantía para reembolsos rápidos

---

## 📋 SECCIÓN 3: Casos Especiales - Multi-Sucursal

### ❓ P8: ¿Qué pasa si una sucursal no paga a tiempo a otra sucursal?

**R:** Sistema alerta y escala automáticamente:

```
ESCENARIO:
- Sucursal CDMX debe pagar $22,000 a Cancún
- Fecha límite: 5-Nov
- Hoy: 8-Nov (3 días de retraso)

ALERTAS AUTOMÁTICAS:

DÍA 1 DE RETRASO (6-Nov):
┌────────────────────────────────────────┐
│ 🟡 Recordatorio Amable                 │
├────────────────────────────────────────┤
│ Para: Contador CDMX                    │
│                                        │
│ Transferencia pendiente:               │
│ • A: Sucursal Cancún                   │
│ • Monto: $22,000                       │
│ • Vence: Ayer                          │
│                                        │
│ Favor procesar hoy.                    │
└────────────────────────────────────────┘

DÍA 3 DE RETRASO (8-Nov):
┌────────────────────────────────────────┐
│ 🔴 Alerta Gerencial                    │
├────────────────────────────────────────┤
│ Para: Gerente CDMX + Gerente Cancún   │
│       + Director Financiero            │
│                                        │
│ Transferencia VENCIDA:                 │
│ • De: CDMX                             │
│ • A: Cancún                            │
│ • Monto: $22,000                       │
│ • Vencimiento: 5-Nov                   │
│ • Días retraso: 3                      │
│                                        │
│ IMPACTO EN CANCÚN:                     │
│ • No puede pagar a operador            │
│ • CXP Cancún en riesgo de vencer       │
│                                        │
│ ACCIÓN REQUERIDA URGENTE               │
└────────────────────────────────────────┘

DÍA 7 DE RETRASO (12-Nov):
┌────────────────────────────────────────┐
│ 🔴 ESCALACIÓN CRÍTICA                  │
├────────────────────────────────────────┤
│ Para: Director General                 │
│                                        │
│ PROBLEMA INTER-SUCURSAL:               │
│                                        │
│ CDMX no ha pagado a Cancún $22,000     │
│ desde hace 7 días.                     │
│                                        │
│ CONSECUENCIAS:                         │
│ • Operador de Cancún sin pagar         │
│ • Riesgo de perder proveedor           │
│ • Conflicto entre sucursales           │
│                                        │
│ POSIBLES CAUSAS:                       │
│ • Problemas de flujo de caja CDMX      │
│ • Error administrativo                 │
│ • Falta de fondos                      │
│                                        │
│ Requiere intervención directa.         │
└────────────────────────────────────────┘

SOLUCIONES:

Opción A: Préstamo inter-sucursal
   Corporativo presta a CDMX
   CDMX paga a Cancún
   CDMX devuelve a Corporativo

Opción B: Compensación
   Si Cancún también debe a CDMX, compensar

Opción C: Reorganización
   Corporativo paga directamente a Cancún
   CDMX luego paga a Corporativo
```

---

### ❓ P9: ¿Cómo se dividen utilidades entre sucursales en un tour multi-sucursal?

**R:** Según el trabajo que hace cada una:

```
MODELO ESTÁNDAR:

Sucursal que VENDE:    12-15% del total
Sucursal que OPERA:    Resto menos costos

EJEMPLO:
────────

Tour vendido por CDMX, operado por Cancún
Precio: $25,000

Distribución:
┌────────────────────────────────────────┐
│ CDMX (Venta):                          │
│ • Comisión: 12% = $3,000               │
│ • Trabajo:                             │
│   - Atención cliente                   │
│   - Procesamiento reserva              │
│   - Cobro                              │
│   - Seguimiento                        │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ CANCÚN (Operación):                    │
│ • Ingreso: $22,000                     │
│ • Costo operador: $16,000              │
│ • Utilidad: $6,000 (27%)               │
│ • Trabajo:                             │
│   - Coordinación operador              │
│   - Asignación guía                    │
│   - Seguimiento tour                   │
│   - Control calidad                    │
└────────────────────────────────────────┘

TOTAL EMPRESA:
• Ingreso: $25,000
• Costo: $16,000
• Utilidad: $9,000 (36%)

Distribución utilidad:
• CDMX: $3,000 (33% de utilidad)
• Cancún: $6,000 (67% de utilidad)

✅ Incentivos correctos:
   Quien hace más trabajo gana más


CASO ESPECIAL: Ambas sucursales trabajan igual
──────────────────────────────────────────────

Ejemplo: Tour combinado CDMX + Cancún
- Día 1-2: Tours en CDMX (operador local)
- Día 3-4: Tours en Cancún (operador local)

Distribución:
┌────────────────────────────────────────┐
│ Precio total: $40,000                  │
│                                        │
│ Costos CDMX: $12,000                   │
│ Costos Cancún: $14,000                 │
│ Total costos: $26,000                  │
│                                        │
│ Utilidad total: $14,000                │
│                                        │
│ División 50/50:                        │
│ • CDMX: $7,000                         │
│ • Cancún: $7,000                       │
└────────────────────────────────────────┘
```

**Configuración en sistema:**

```sql
-- Tabla de reglas de comisión
CREATE TABLE comision_rules (
    id UUID PRIMARY KEY,
    sucursal_venta VARCHAR(50),
    sucursal_operacion VARCHAR(50),
    tipo_tour VARCHAR(50),
    porcentaje_venta NUMERIC(5,2),
    porcentaje_operacion NUMERIC(5,2),
    activo BOOLEAN DEFAULT true
);

-- Ejemplo de regla
INSERT INTO comision_rules VALUES (
    uuid_generate_v4(),
    'cdmx',         -- Vende
    'cancun',       -- Opera
    'tour_basico',
    12.00,          -- CDMX recibe 12%
    88.00,          -- Cancún recibe 88%
    true
);

-- Cálculo automático en trigger
CREATE FUNCTION calculate_multi_sucursal_split()
...
```

---

## 📋 SECCIÓN 4: Casos Especiales - Fraude y Seguridad

### ❓ P10: ¿Cómo detectar si un empleado está robando?

**R:** El sistema tiene múltiples controles:

```
SEÑALES DE ALERTA AUTOMÁTICAS:
═════════════════════════════

1️⃣ DESCUADRES FRECUENTES
   Si cajero tiene descuadres > 3 veces al mes:
   🚨 Alerta a gerente

   SELECT 
       cajero_id,
       COUNT(*) as descuadres,
       SUM(diferencia) as total_diferencia
   FROM cortes_caja
   WHERE diferencia != 0
   AND fecha > NOW() - INTERVAL '30 days'
   GROUP BY cajero_id
   HAVING COUNT(*) > 3;

2️⃣ CANCELACIONES SOSPECHOSAS
   Empleado cancela muchos pagos:
   
   SELECT 
       usuario_id,
       COUNT(*) as cancelaciones
   FROM pagos_recibidos
   WHERE status = 'cancelado'
   AND cancelado_por = usuario_id
   AND fecha_cancelacion > NOW() - INTERVAL '30 days'
   GROUP BY usuario_id
   HAVING COUNT(*) > 5;
   
   🚨 Posible esquema:
      - Registrar pago
      - Entregar recibo a cliente
      - Cancelar pago después
      - Quedarse con el efectivo

3️⃣ REEMBOLSOS SOSPECHOSOS
   Empleado procesa reembolsos a cuentas bancarias repetidas:
   
   SELECT 
       r.ejecutado_por,
       r.cuenta_destino,
       COUNT(*) as num_reembolsos,
       SUM(r.monto) as total_reembolsado
   FROM reembolsos_ejecutados r
   WHERE r.fecha_reembolso > NOW() - INTERVAL '90 days'
   GROUP BY r.ejecutado_por, r.cuenta_destino
   HAVING COUNT(*) > 3
   AND r.cuenta_destino NOT IN (
       SELECT cuenta_bancaria FROM customers
   );
   
   🚨 Posible esquema:
      - Crear trip falso
      - "Cancelar" y generar reembolso
      - Reembolsar a cuenta propia

4️⃣ ACCESO FUERA DE HORARIO
   Empleado accede al sistema fuera de su horario:
   
   SELECT 
       usuario_id,
       COUNT(*) as accesos_nocturnos
   FROM audit_login
   WHERE EXTRACT(HOUR FROM login_time) BETWEEN 0 AND 6
   AND login_time > NOW() - INTERVAL '30 days'
   GROUP BY usuario_id
   HAVING COUNT(*) > 5;
   
   🚨 Posible actividad sospechosa

5️⃣ MODIFICACIONES DE MONTOS
   Empleado modifica montos frecuentemente:
   
   SELECT 
       a.usuario_id,
       COUNT(*) as modificaciones
   FROM auditoria_financiera a
   WHERE a.tabla_afectada IN ('cuentas_por_cobrar', 'pagos_recibidos')
   AND a.accion = 'update'
   AND a.datos_nuevos->>'monto' != a.datos_anteriores->>'monto'
   AND a.timestamp > NOW() - INTERVAL '30 days'
   GROUP BY a.usuario_id
   HAVING COUNT(*) > 10;


CONTROLES PREVENTIVOS:
═════════════════════

1️⃣ Segregación de funciones
   ✅ Quien registra ≠ quien autoriza ≠ quien ejecuta

2️⃣ Conciliación diaria obligatoria
   ✅ Cada día debe cuadrar

3️⃣ Auditoría completa
   ✅ TODO queda registrado con usuario + IP + timestamp

4️⃣ Límites de autorización
   ✅ Montos grandes requieren múltiples aprobaciones

5️⃣ Verificación aleatoria
   ✅ 10% de transacciones verificadas aleatoriamente

6️⃣ Vacaciones obligatorias
   ✅ Empleados deben tomar vacaciones
   ✅ Otro empleado revisa su trabajo
   ✅ Fraudes se descubren cuando responsable no está


PROCESO SI SE DETECTA FRAUDE:
═════════════════════════════

1. Sistema genera alerta automática
2. Gerente investiga
3. Revisar auditoría completa del empleado
4. Si hay evidencia sólida:
   • Suspender acceso inmediatamente
   • Reportar a RH y legal
   • Iniciar investigación formal
5. Si se confirma:
   • Despido procedente
   • Demanda legal
   • Reporte a autoridades
```

---

### ❓ P11: ¿Qué pasa si alguien hackea el sistema?

**R:** Múltiples capas de seguridad:

```
PROTECCIÓN 1: Acceso
─────────────────────
• Autenticación de 2 factores (2FA) obligatoria
• Passwords con mínimo 12 caracteres
• Cambio de password cada 90 días
• Bloqueo después de 3 intentos fallidos
• VPN obligatoria para acceso remoto

PROTECCIÓN 2: Permisos
──────────────────────
• Principio de mínimo privilegio
• Cada usuario solo ve lo necesario
• Permisos revisados mensualmente
• Log de todos los accesos

PROTECCIÓN 3: Datos Sensibles
─────────────────────────────
• Números de tarjeta encriptados
• Datos bancarios encriptados
• SSL/TLS en todas las comunicaciones
• Backups encriptados

PROTECCIÓN 4: Detección
───────────────────────
• Monitoreo 24/7 de actividad sospechosa
• Alertas de accesos inusuales
• Detección de patrones anormales

PROTECCIÓN 5: Respuesta
───────────────────────
Si se detecta intrusión:

1. CONTENER
   • Bloquear acceso inmediatamente
   • Aislar sistemas comprometidos
   • Cambiar todas las passwords

2. EVALUAR
   • ¿Qué accedieron?
   • ¿Qué modificaron?
   • ¿Qué robaron?

3. RECUPERAR
   • Restaurar de backup (si hubo daño)
   • Verificar integridad de datos
   • Revisar toda la auditoría

4. NOTIFICAR
   • A dirección general
   • A clientes afectados (si aplica)
   • A autoridades (si aplica)

5. APRENDER
   • ¿Cómo entraron?
   • ¿Qué falló?
   • ¿Cómo prevenir futuro?


BACKUP Y RECUPERACIÓN:
─────────────────────

• Backup completo diario (automático)
• Backups guardados en 3 lugares:
  1. Servidor local
  2. Cloud (AWS/Azure)
  3. Disco externo offline

• Retention:
  - Diarios: 30 días
  - Semanales: 3 meses
  - Mensuales: 1 año

• Prueba de restauración mensual
  (verificar que backups funcionan)


AUDITORÍA DE SEGURIDAD:
──────────────────────

Cada 6 meses:
• Auditoría externa de seguridad
• Pentesting (intentar hackear)
• Revisar logs de acceso
• Actualizar procedimientos
```

---

## 📋 SECCIÓN 5: Casos Especiales - Operaciones

### ❓ P12: ¿Qué pasa si un operador cierra/quiebra?

**R:** Contingencia y recuperación:

```
SITUACIÓN:
Operador "Tours Maya" quiebra repentinamente
• Tenemos 15 tours programados con ellos
• Les debemos $45,000 (CXP)
• Nos deben $8,000 (CXC por cancelación)

ACCIONES INMEDIATAS:
═══════════════════

1️⃣ IDENTIFICAR IMPACTO
   
   SELECT 
       t.booking_reference,
       t.departure_date,
       t.customer_id,
       c.email,
       c.phone,
       cxp.monto_pendiente
   FROM trips t
   JOIN customers c ON t.customer_id = c.id
   LEFT JOIN cuentas_por_pagar cxp ON t.trip_id = cxp.trip_id
   WHERE t.operator_id = 'tours-maya-uuid'
   AND t.departure_date > NOW()
   AND t.status IN ('upcoming', 'pending');
   
   Resultado: 15 tours afectados

2️⃣ NOTIFICAR CLIENTES
   
   Email masivo automático:
   
   "Estimado cliente,
   
   Debido a circunstancias imprevistas, el operador
   de tu tour ya no puede prestar el servicio.
   
   OPCIONES:
   
   A) Cambiar a operador alternativo (sin costo)
      Nuevo operador: Riviera Tours
      Mismo servicio, misma fecha
      
   B) Cambiar fecha con nuevo operador
      
   C) Cancelar y recibir reembolso 100%
      (Sin penalización)
   
   Por favor responde en 24 horas.
   
   Lamentamos el inconveniente."

3️⃣ REASIGNAR TOURS
   
   // Cambiar operador en trips
   UPDATE trips
   SET 
       operator_id = 'riviera-tours-uuid',
       operator_changed = true,
       operator_change_reason = 'Operador original cerró',
       modified_at = NOW()
   WHERE operator_id = 'tours-maya-uuid'
   AND departure_date > NOW();
   
   // Cancelar CXP al operador viejo
   UPDATE cuentas_por_pagar
   SET 
       status = 'cancelada',
       motivo_cancelacion = 'Operador cerró - Tours reasignados'
   WHERE proveedor_id = 'tours-maya-uuid'
   AND status = 'pendiente';
   
   // Crear CXP al operador nuevo
   INSERT INTO cuentas_por_pagar (...)
   VALUES (...);

4️⃣ RECUPERAR DEUDA
   
   Si operador nos debe $8,000:
   
   A) Si van a quiebra formal:
      • Registrarse como acreedor
      • Esperar proceso legal
      • Probablemente recuperar poco
   
   B) Marcar como pérdida:
      INSERT INTO perdidas_irrecuperables (
          concepto: 'Deuda operador quebrado',
          monto: 8000.00,
          proveedor: 'tours-maya-uuid',
          fecha: NOW()
      );

5️⃣ PAGAR DEUDA (Si les debíamos)
   
   Si les debíamos $45,000:
   
   ANTES de pagar, verificar:
   • ¿Empresa aún existe?
   • ¿Cuenta bancaria válida?
   • ¿No hay embargos?
   
   Pagar solo si hay obligación legal clara


PREVENCIÓN FUTURA:
═════════════════

1️⃣ DIVERSIFICACIÓN
   • Trabajar con mínimo 3 operadores por zona
   • No depender de uno solo

2️⃣ EVALUACIÓN CONTINUA
   • Revisar salud financiera de operadores
   • Alertas si operador retrasa pagos

3️⃣ SEGUROS
   • Seguro de viaje que cubra quiebra de operador
   • Informar a clientes de esta cobertura

4️⃣ CONTRATOS
   • Cláusula de transferencia de servicio
   • Derecho a cambiar operador si es necesario
```

---

### ❓ P13: ¿Qué pasa si hay desastres naturales (huracán, terremoto)?

**R:** Protocolo de emergencia:

```
PROTOCOLO DE EMERGENCIA:
═══════════════════════

FASE 1: ALERTA TEMPRANA
───────────────────────

Cuando se emite alerta de huracán:

1. Sistema identifica tours afectados
   
   SELECT * FROM trips
   WHERE sucursal_operacion = 'cancun'
   AND departure_date BETWEEN 'fecha-huracan' - 5 AND 'fecha-huracan' + 3
   AND status IN ('upcoming', 'pending');

2. Notificación masiva automática
   
   A CLIENTES:
   "⚠️ Alerta de Huracán
   
   Tu tour programado para [FECHA] puede verse afectado
   por condiciones climáticas.
   
   OPCIONES:
   A) Esperar - Te avisaremos en 24h si se cancela
   B) Cambiar fecha ahora (sin cargo)
   C) Cancelar y recibir reembolso 100%
   
   Tu seguridad es primero."
   
   A OPERADORES:
   "Huracán categoría X aproximándose.
   Confirmar status de tours programados."

3. Preparación interna
   • Backup de datos críticos
   • Preparar trabajo remoto
   • Contacto de emergencia con staff


FASE 2: DURANTE EMERGENCIA
──────────────────────────

1. Cancelaciones automáticas
   
   // Si autoridades ordenan evacuación
   UPDATE trips
   SET 
       status = 'cancelled',
       cancellation_reason = 'Desastre natural - Huracán X',
       refund_amount = paid_amount,  // Reembolso 100%
       refund_percentage = 100
   WHERE sucursal_operacion = 'cancun'
   AND departure_date BETWEEN 'inicio-emergencia' AND 'fin-emergencia';

2. Reembolsos automáticos prioritarios
   
   // Crear reembolsos con máxima prioridad
   INSERT INTO reembolsos_por_pagar (
       ...,
       prioridad: 'urgente',
       motivo: 'desastre_natural',
       autorizacion_automatica: true
   );

3. Comunicación constante
   • Updates cada 12 horas
   • Redes sociales + email + SMS
   • Status de todos los clientes


FASE 3: POST-EMERGENCIA
───────────────────────

1. Evaluación de daños
   • ¿Oficina accesible?
   • ¿Staff seguro?
   • ¿Operadores funcionando?
   • ¿Infraestructura disponible?

2. Reprogramación masiva
   
   Email a todos los clientes afectados:
   
   "Nos complace informar que ya pasó la emergencia.
   
   Tu tour cancelado puede reprogramarse:
   • 10% descuento adicional
   • Fechas flexibles
   • Cambio de destino si prefieres
   
   O mantener reembolso 100% si prefieres.
   
   Gracias por tu paciencia."

3. Contabilidad de emergencia
   
   // Categorizar pérdidas
   INSERT INTO perdidas_desastre_natural (
       tipo: 'reembolsos',
       monto: 450000.00,
       evento: 'Huracán X',
       fecha: NOW(),
       recuperable_seguro: true
   );
   
   // Reclamar al seguro
   INSERT INTO reclamos_seguro (
       poliza: 'POL-2024-001',
       monto_reclamado: 450000.00,
       documentos: [...]
   );


COBERTURA DE SEGUROS:
════════════════════

Seguro empresarial debe cubrir:
• Interrupción de negocio
• Reembolsos a clientes
• Daño a infraestructura
• Pérdida de ingresos
• Gastos extraordinarios


LECCIONES APRENDIDAS:
════════════════════

Después de cada evento:
1. ¿Qué funcionó bien?
2. ¿Qué falló?
3. ¿Cómo mejorar protocolo?
4. ¿Actualizar seguros?
5. ¿Mejor backup/redundancia?
```

---

## 🎯 CONCLUSIÓN

Este documento cubre los casos especiales más comunes. El principio general es:

1. ✅ **TODO se registra** - Nada queda sin documentar
2. ✅ **TODO tiene proceso** - No improvisación
3. ✅ **TODO tiene responsable** - Siempre alguien a cargo
4. ✅ **TODO tiene auditoría** - Trazabilidad completa
5. ✅ **TODO tiene plan B** - Contingencia para todo

**¿Tienes algún caso específico que no cubrí? ¡Pregunta!**
