# 👥 Spirit Tours - Manual de Usuario del Sistema de Contabilidad

## 📑 Tabla de Contenidos

1. [Introducción](#introducci%C3%B3n)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Manual para Cajeros](#manual-para-cajeros)
4. [Manual para Gerentes](#manual-para-gerentes)
5. [Manual para Contadores](#manual-para-contadores)
6. [Manual para Directores](#manual-para-directores)
7. [Casos de Uso Comunes](#casos-de-uso-comunes)
8. [Resolución de Problemas](#resoluci%C3%B3n-de-problemas)
9. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 📖 Introducción

Este manual describe cómo usar el Sistema de Contabilidad Multisucursal de Spirit Tours. Está organizado por rol de usuario para facilitar la consulta.

### Roles del Sistema

| Rol | Responsabilidades Principales |
|-----|------------------------------|
| **Cajero** | Registro de pagos recibidos, cortes de caja diarios |
| **Gerente** | Gestión de CXC/CXP, autorización de pagos, supervisión de sucursal |
| **Contador** | Ejecución de pagos, conciliación bancaria, reportes |
| **Director** | Supervisión general, autorización de alto valor, reportes consolidados |

---

## 🔐 Acceso al Sistema

### Inicio de Sesión

1. Navegue a: `https://app.spirittours.com`
2. Ingrese su usuario y contraseña
3. El sistema lo dirigirá automáticamente a su dashboard según su rol

### Primer Acceso

Al iniciar sesión por primera vez:

1. **Cambiar contraseña:** El sistema le pedirá cambiar su contraseña temporal
2. **Configurar 2FA (opcional):** Recomendamos activar autenticación de dos factores
3. **Revisar permisos:** Verifique qué sucursales y módulos puede acceder

---

## 💵 Manual para Cajeros

### Responsabilidades Principales

- ✅ Registrar pagos recibidos de clientes
- ✅ Realizar cortes de caja diarios
- ✅ Mantener orden en movimientos de efectivo
- ✅ Reportar discrepancias inmediatamente

### 1. Registrar Pago Recibido

#### Paso a Paso

**Navegación:** Dashboard → Cuentas por Cobrar → Buscar cliente → Registrar Pago

1. **Buscar la cuenta:**
   - Ingrese nombre del cliente o número de reserva
   - Seleccione la CXC pendiente de la lista

2. **Verificar información:**
   - Confirme el monto pendiente
   - Verifique el nombre del cliente
   - Revise el tour asociado

3. **Ingresar datos del pago:**
   ```
   Monto a pagar: $5,000.00
   Método de pago: [Efectivo ▼]
   Referencia: (opcional si es efectivo)
   Comisión bancaria: $0.00 (solo si aplica)
   ```

4. **Confirmar y emitir recibo:**
   - Haga clic en "Registrar Pago"
   - El sistema genera automáticamente el folio
   - Imprima el recibo para el cliente

#### Métodos de Pago

| Método | Requiere Referencia | Comisión Típica |
|--------|-------------------|-----------------|
| Efectivo | No | 0% |
| Transferencia | Sí (número de operación) | 0-2% |
| Tarjeta Débito | Sí (últimos 4 dígitos) | 1.5-2% |
| Tarjeta Crédito | Sí (últimos 4 dígitos) | 3-3.6% |
| Cheque | Sí (número de cheque) | 0% |

#### 💡 Consejos

- **Efectivo:** Siempre cuente el dinero frente al cliente
- **Transferencias:** Verifique que el monto coincida en el estado de cuenta
- **Tarjetas:** Espere confirmación del banco antes de confirmar el pago
- **Referencias:** Anote siempre la referencia bancaria, aunque parezca opcional

---

### 2. Corte de Caja

#### Cuándo Realizar el Corte

- **Diariamente:** Al final de su turno (típicamente 6-7 PM)
- **Cambio de turno:** Si hay relevo de cajero
- **Solicitud del gerente:** Si se detecta alguna irregularidad

#### Paso a Paso

**Navegación:** Dashboard → Caja → Corte de Caja

1. **Contar efectivo físico:**
   ```
   Denominación    Cantidad    Subtotal
   $1000           15          $15,000
   $500            24          $12,000
   $200            30          $6,000
   $100            45          $4,500
   $50             20          $1,000
   $20             15          $300
   Monedas         -           $125
   ─────────────────────────────────────
   TOTAL FÍSICO:              $38,925
   ```

2. **Ingresar en el sistema:**
   - Monto en sistema: $39,000 (calculado automáticamente)
   - Monto físico contado: $38,925
   - **Diferencia: -$75** ⚠️

3. **Documentar diferencias:**
   ```
   Notas: Posible error en cambio de venta #156.
          Cliente pagó con $1000 por $950.
          Se entregó $50 en lugar de $125.
   ```

4. **Solicitar autorización del gerente:**
   - Si diferencia > $50, requiere aprobación del gerente
   - El gerente verificará movimientos del día
   - Se firma físicamente y en el sistema

5. **Finalizar corte:**
   - Sistema genera reporte impreso
   - Depositar efectivo en caja fuerte
   - Archivar documentación

#### Tolerancias de Diferencias

| Diferencia | Acción |
|-----------|--------|
| $0 - $10 | ✅ Normal, aceptable |
| $10 - $50 | ⚠️ Aceptable con nota explicativa |
| $50 - $100 | 🚨 Requiere aprobación gerente |
| > $100 | 🔴 Requiere investigación formal |

---

## 👔 Manual para Gerentes

### Responsabilidades Principales

- ✅ Supervisar operaciones diarias de la sucursal
- ✅ Autorizar pagos a proveedores
- ✅ Gestionar cuentas por cobrar vencidas
- ✅ Aprobar reembolsos por cancelaciones
- ✅ Supervisar cortes de caja
- ✅ Revisar y resolver alertas

### 1. Dashboard de Gerente

**Navegación:** Dashboard → Resumen Sucursal

#### Indicadores Clave (KPIs)

```
┌─────────────────────────────────────────────────┐
│  CUENTAS POR COBRAR (CXC)                       │
│  ──────────────────────────────────────         │
│  Total pendiente:        $180,000               │
│  Vencidas:               $25,000  🔴           │
│  A vencer (7 días):      $45,000  ⚠️           │
│  Tasa de cobro:          85%      ✅           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  CUENTAS POR PAGAR (CXP)                        │
│  ──────────────────────────────────────         │
│  Total pendiente:        $95,000                │
│  Requieren autorización: 5        🔔           │
│  Próximas a vencer:      $30,000               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  ALERTAS ACTIVAS                                │
│  ──────────────────────────────────────         │
│  🔴 Críticas:           2                       │
│  🟡 Altas:              5                       │
│  🟢 Medias:             8                       │
└─────────────────────────────────────────────────┘
```

### 2. Autorizar Pagos a Proveedores (CXP)

#### Cuándo se Requiere su Autorización

- Montos entre $5,000 y $20,000 (según configuración de sucursal)
- CXP marcadas como "pendiente_revision"

#### Proceso de Autorización

**Navegación:** Dashboard → Cuentas por Pagar → Pendientes de Autorización

1. **Revisar solicitud:**
   ```
   Folio: CXP-202510-000078
   Proveedor: Maya Tours
   Concepto: Servicio operador Chichén Itzá - Grupo 45 pax
   Monto: $8,000.00
   Fecha vencimiento: 10-Nov-2025
   Solicitado por: Ana García (contador)
   ```

2. **Verificar documentación:**
   - ✅ Contrato con proveedor firmado
   - ✅ Servicio prestado y confirmado
   - ✅ Factura recibida y validada
   - ✅ Monto coincide con cotización

3. **Tomar decisión:**
   
   **Opción A: Autorizar**
   ```
   Comentario: "Servicio confirmado por guía.
                Factura A123456 recibida y validada.
                Autorizado para pago."
   
   [Firmar Electrónicamente] → Se requiere su contraseña
   ```
   
   **Opción B: Rechazar**
   ```
   Motivo: "Falta confirmación del guía sobre calidad del servicio.
            Esperar reporte de evaluación antes de autorizar."
   
   [Rechazar]
   ```
   
   **Opción C: Solicitar Información**
   ```
   Pendiente: "Solicitar copia del contrato firmado.
               Verificar si incluye propina o es monto neto."
   
   [Solicitar Más Información]
   ```

#### Límites de Autorización

| Monto | Nivel Requerido | Su Autorización |
|-------|----------------|----------------|
| < $5,000 | Supervisor | No requerida ✅ |
| $5,000 - $20,000 | Gerente | **Usted autoriza** 👤 |
| $20,000 - $50,000 | Gerente + 2 firmas | Requiere coautorización |
| > $50,000 | Director | Escalar a director 🔺 |

### 3. Gestión de Cuentas Vencidas

#### Revisar CXC Vencidas

**Navegación:** Dashboard → Cuentas por Cobrar → Filtro: Vencidas

```
┌─────────────────────────────────────────────────────────┐
│ Cliente        │ Monto    │ Días Venc. │ Estado  │ Acción│
├─────────────────────────────────────────────────────────┤
│ Juan Pérez     │ $12,000  │ 5 días     │ Vencida │ 📞    │
│ María López    │ $8,500   │ 15 días    │ Vencida │ 📧    │
│ Hotel Plaza    │ $25,000  │ 45 días    │ Crítica │ ⚖️    │
└─────────────────────────────────────────────────────────┘
```

#### Plan de Acción por Días Vencidos

**1-7 días:**
- 📞 Llamada telefónica amigable
- Recordar fecha de vencimiento
- Ofrecer facilidades de pago

**8-15 días:**
- 📧 Email formal con estado de cuenta
- Segunda llamada telefónica
- Registrar intento de contacto en sistema

**16-30 días:**
- 📄 Carta formal por escrito
- Suspensión de nuevos servicios
- Considerar plan de pagos

**31-60 días:**
- 🚨 Alerta a Director
- Evaluación de cobranza externa
- Suspensión definitiva de crédito

**>60 días:**
- ⚖️ Proceso legal/cobranza
- Reclasificar como "incobrable"
- Provisionar pérdida contable

### 4. Aprobar Reembolsos

#### Solicitudes de Reembolso

**Navegación:** Dashboard → Reembolsos → Pendientes Autorización

**Ejemplo de Solicitud:**

```
┌─────────────────────────────────────────────┐
│ SOLICITUD DE REEMBOLSO                      │
├─────────────────────────────────────────────┤
│ Folio: REMB-202510-000015                   │
│ Cliente: Pedro Sánchez                      │
│ Tour: Xcaret Plus                           │
│ Fecha viaje: 20-Nov-2025                    │
│ Cancelación: 27-Oct-2025 (24 días antes)   │
│                                             │
│ Monto pagado:        $10,000.00             │
│ Política aplicada:   14-29 días = 90%       │
│ Monto reembolso:     $9,000.00 ✅           │
│ Retención (10%):     $1,000.00              │
│                                             │
│ Motivo: Enfermedad familiar (certificado    │
│         médico adjunto)                     │
└─────────────────────────────────────────────┘

Acciones:
[✅ Autorizar Reembolso]  [❌ Rechazar]  [📄 Solicitar Documentación]
```

#### Validaciones Antes de Autorizar

1. **Verificar política:**
   - ¿El porcentaje calculado es correcto?
   - ¿El cliente ya conocía la política al reservar?

2. **Revisar documentación:**
   - Certificado médico (si aplica)
   - Comprobante de emergencia
   - Carta de solicitud del cliente

3. **Considerar historial:**
   - ¿Es cliente frecuente?
   - ¿Ha cancelado anteriormente?
   - ¿Tiene otras reservas?

4. **Verificar pagos a proveedor:**
   - ⚠️ **IMPORTANTE:** ¿Ya se pagó al operador?
   - Si SÍ → Negociar con operador primero
   - Si NO → Cancelar servicio con operador

#### Excepciones a la Política

Puede autorizar hasta **95% de reembolso** (en lugar del % estándar) en casos:

- Cliente VIP o corporativo
- Emergencia médica grave documentada
- Fuerza mayor (huracán, terremoto, etc.)
- Error del personal de Spirit Tours

**Montos > $15,000** requieren autorización adicional del Director.

---

## 📊 Manual para Contadores

### Responsabilidades Principales

- ✅ Ejecutar pagos autorizados
- ✅ Conciliación bancaria diaria
- ✅ Generar reportes financieros
- ✅ Mantener registros contables
- ✅ Preparar documentación fiscal

### 1. Ejecutar Pagos a Proveedores

#### Segregación de Funciones

⚠️ **REGLA IMPORTANTE:** Usted NO puede autorizar Y pagar la misma CXP. Debe estar autorizada por un gerente o director primero.

#### Proceso de Pago

**Navegación:** Dashboard → Cuentas por Pagar → Autorizadas

1. **Verificar autorización:**
   ```
   Folio: CXP-202510-000078
   Estado: ✅ Autorizado
   Autorizado por: Lic. Roberto Díaz (Gerente)
   Fecha autorización: 27-Oct-2025 16:10
   ```

2. **Seleccionar método de pago:**
   ```
   Método: [Transferencia bancaria SPEI ▼]
   
   Datos del proveedor:
   Beneficiario: Maya Tours SA de CV
   Banco: BBVA Bancomer
   Cuenta: 0123456789
   CLABE: 012180001234567890
   ```

3. **Realizar transferencia en portal bancario:**
   - Ingresar al sistema del banco
   - Crear pago SPEI
   - Capturar datos del beneficiario
   - Autorizar con token bancario
   - **Obtener número de rastreo**

4. **Registrar en Spirit Tours:**
   ```
   Monto: $8,000.00
   Método de pago: Transferencia
   Referencia: 20251027001234567 (número de rastreo SPEI)
   Comprobante: [Adjuntar PDF del banco]
   
   [Confirmar Pago]
   ```

5. **Sistema actualiza automáticamente:**
   - CXP cambia a estado "pagado"
   - Se crea asiento contable automático
   - Se registra en auditoría
   - Se notifica al gerente y proveedor

### 2. Conciliación Bancaria

#### Frecuencia

- **Diariamente:** Recomendado
- **Semanal:** Mínimo aceptable
- **Mensual:** Solo para cuentas de bajo movimiento

#### Proceso Diario

**Navegación:** Dashboard → Conciliación Bancaria → Nueva Conciliación

**Opción A: Conciliación Manual**

1. **Descargar estado de cuenta del banco:**
   - Ingresar al portal del banco
   - Seleccionar fecha (ayer)
   - Descargar en formato Excel o CSV

2. **Cargar en Spirit Tours:**
   ```
   Sucursal: [Cancún ▼]
   Fecha: 26-Oct-2025
   Archivo: [estado_cuenta_26oct.csv] 📁
   
   [Cargar y Procesar]
   ```

3. **Sistema procesa automáticamente:**
   - Compara transacciones del sistema vs banco
   - Marca coincidencias como "conciliadas"
   - Identifica discrepancias

4. **Revisar resultados:**
   ```
   ┌──────────────────────────────────────────┐
   │ RESUMEN DE CONCILIACIÓN                  │
   ├──────────────────────────────────────────┤
   │ Ingresos sistema:    $142,500            │
   │ Ingresos banco:      $141,000            │
   │ Diferencia:          -$1,500  ⚠️         │
   │                                          │
   │ Egresos sistema:     $85,000             │
   │ Egresos banco:       $85,000             │
   │ Diferencia:          $0       ✅         │
   │                                          │
   │ Transacciones sin conciliar: 3           │
   └──────────────────────────────────────────┘
   ```

5. **Investigar discrepancias:**
   ```
   Sin conciliar en sistema:
   - PAGO-202510-000040: $1,500 (Transferencia TRF999)
     → No aparece en banco
     → Revisar si se ejecutó correctamente
     → Puede estar en tránsito (validar mañana)
   ```

**Opción B: Conciliación Automática** (Si está configurada integración bancaria)

```
[🔄 Conciliar Automáticamente]

Sistema:
1. Conecta con API del banco
2. Descarga transacciones automáticamente
3. Realiza matching automático
4. Genera reporte
5. Envía email con resultados

Tiempo: ~2 minutos vs ~30 minutos manual
```

#### Qué Hacer con Discrepancias

**Discrepancia Común #1: Comisiones bancarias**
```
Banco cobró: $125 (comisión mensual)
Sistema: $0 (no registrado)

Solución: Crear gasto por comisión
[Registrar Gasto] → Tipo: Comisión bancaria
```

**Discrepancia Común #2: Pago en tránsito**
```
Pago ejecutado: 26-Oct 18:45
Aparece en banco: 27-Oct 09:00

Solución: Normal, esperar 24 hrs
```

**Discrepancia Común #3: Pago duplicado**
```
Mismo monto, misma referencia, 2 veces

🚨 Alerta automática generada
→ Revisar con banco
→ Solicitar devolución de cargo duplicado
```

### 3. Generación de Reportes

#### Reportes Disponibles

**Navegación:** Dashboard → Reportes

1. **Estado de Resultados (P&L)**
   ```
   Período: [Oct-2025 ▼]
   Sucursal: [Cancún ▼]
   Formato: [PDF ▼]
   
   [Generar Reporte]
   
   Resultado:
   ┌────────────────────────────────────┐
   │ ESTADO DE RESULTADOS - OCTUBRE     │
   ├────────────────────────────────────┤
   │ Ingresos por servicios:  $850,000  │
   │ (-) Costo de ventas:     $580,000  │
   │ = Utilidad bruta:        $270,000  │
   │                                    │
   │ (-) Gastos operación:    $120,000  │
   │ (-) Gastos admin:        $45,000   │
   │ = Utilidad operativa:    $105,000  │
   │                                    │
   │ Margen neto:             12.4%     │
   └────────────────────────────────────┘
   ```

2. **Reporte de Antigüedad de Saldos**
   ```
   Tipo: [CXC ▼]  (o CXP)
   Al: 27-Oct-2025
   
   Resultado:
   ┌─────────────────────────────────────────┐
   │ Corriente (0-30):    $95,000   (65%)   │
   │ 31-60 días:          $35,000   (24%)   │
   │ 61-90 días:          $12,000   (8%)    │
   │ >90 días:            $4,500    (3%)    │
   │ ─────────────────────────────────────   │
   │ TOTAL:               $146,500  (100%)  │
   └─────────────────────────────────────────┘
   ```

3. **Flujo de Efectivo**
   ```
   Período: [Oct-2025 ▼]
   
   Resultado:
   Saldo inicial:           $125,000
   (+) Ingresos del mes:    $850,000
   (-) Egresos del mes:     $745,000
   = Saldo final:           $230,000
   
   Diferencia: +$105,000 (84% de incremento)
   ```

---

## 🎯 Manual para Directores

### Responsabilidades Principales

- ✅ Supervisión global de todas las sucursales
- ✅ Autorización de pagos de alto valor (>$50,000)
- ✅ Análisis de rentabilidad por sucursal
- ✅ Toma de decisiones estratégicas
- ✅ Revisión de alertas críticas

### 1. Dashboard Consolidado

**Navegación:** Dashboard → Vista Director

```
┌─────────────────────────────────────────────────────────┐
│  CONSOLIDADO TODAS LAS SUCURSALES                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Sucursal    │ CXC Pend.│ CXP Pend.│ Utilidad Mes     │
│  ────────────┼──────────┼──────────┼─────────────────  │
│  Cancún      │ $180,000 │ $95,000  │ $105,000 (12.4%)│
│  CDMX        │ $245,000 │ $125,000 │ $95,000  (10.8%)│
│  Guadalajara │ $98,000  │ $58,000  │ $42,000  (11.2%)│
│  ────────────┼──────────┼──────────┼─────────────────  │
│  TOTAL       │ $523,000 │ $278,000 │ $242,000 (11.5%)│
│                                                         │
└─────────────────────────────────────────────────────────┘

🔴 ALERTAS CRÍTICAS (Requieren atención inmediata):
  • Cancún: CXC >90 días por $25,000 - Cliente Hotel Plaza
  • CDMX: Discrepancia conciliación bancaria $8,500
  • Guadalajara: Corte de caja con diferencia $150

🟡 AUTORIZACIONES PENDIENTES:
  • 3 CXP > $50,000 esperando su aprobación
  • 2 Reembolsos > $15,000 requieren autorización especial
```

### 2. Análisis de Rentabilidad

**Navegación:** Reportes → Análisis Comparativo

```
RENTABILIDAD POR SUCURSAL - OCTUBRE 2025

┌────────────────────────────────────────────────────────────┐
│                                                            │
│   Cancún  ████████████████████████ 42%                   │
│   CDMX    ██████████████████ 39%                         │
│   GDL     ███████████ 19%                                 │
│                                                            │
│   Mejor desempeño: Cancún (margen 12.4%)                 │
│   Requiere atención: GDL (margen 11.2%, -8% vs mes ant.) │
│                                                            │
└────────────────────────────────────────────────────────────┘

TOURS MÁS RENTABLES:
1. Xcaret Plus:        Margen 35%  |  45 vendidos
2. Chichén Itzá:       Margen 28%  |  82 vendidos
3. Tulum + Playa:      Margen 25%  |  63 vendidos

TOURS MENOS RENTABLES:
1. Isla Mujeres:       Margen 8%   |  34 vendidos
   → Analizar costos operación
```

---

## 💡 Casos de Uso Comunes

### Caso 1: Cliente Paga Parcialmente

**Situación:** Cliente debe $12,000, paga $5,000 hoy.

**Solución (Cajero):**
1. Buscar CXC del cliente
2. Registrar pago por $5,000
3. Sistema actualiza automáticamente:
   - Monto pagado: $5,000
   - Monto pendiente: $7,000
   - Estado: "parcial" (en lugar de "pendiente")
4. Emitir recibo por $5,000
5. Cliente puede pagar el resto después

### Caso 2: Cancelación de Tour con Reembolso

**Situación:** Cliente cancela tour 10 días antes. Pagó $10,000.

**Solución (Gerente):**
1. Crear solicitud de reembolso
2. Sistema calcula automáticamente:
   - 10 días antes = 7-13 días = 75% reembolso
   - Reembolso: $7,500
   - Retención: $2,500
3. Revisar y autorizar
4. Contador ejecuta el reembolso
5. Cliente recibe $7,500

### Caso 3: Proveedor Cambia de Cuenta Bancaria

**Situación:** Proveedor notifica nueva cuenta para pagos.

**Solución (Contador):**
1. Solicitar carta oficial del proveedor
2. Verificar autenticidad (llamar al proveedor)
3. Actualizar en sistema:
   - Proveedores → Buscar → Editar
   - Cambiar datos bancarios
   - Marcar "Verificado el [fecha]"
4. Próximos pagos usarán nueva cuenta automáticamente

---

## 🔧 Resolución de Problemas

### Problema 1: "Error: Pago duplicado detectado"

**Causa:** Sistema encontró otro pago con misma referencia en las últimas 24 horas.

**Solución:**
1. Verificar si realmente es duplicado
2. Si es error del sistema, contactar a soporte técnico
3. Si es pago legítimo diferente, cambiar la referencia ligeramente
4. Si es duplicado real, cancelar el segundo intento

### Problema 2: "No puedo autorizar este pago"

**Causa:** El monto excede su límite de autorización.

**Solución:**
1. Verificar el monto y su límite
2. Si necesita autorización superior, escalar a:
   - Gerente → Director (si monto > $20,000)
   - Director → Dos firmas adicionales (si > $50,000)
3. Agregar comentario explicativo para el autorizador

### Problema 3: "Conciliación no cuadra"

**Causa:** Diferencias entre sistema y banco.

**Solución:**
1. Verificar que las fechas coincidan
2. Revisar transacciones "en tránsito"
3. Buscar comisiones bancarias no registradas
4. Si diferencia persiste > 24 horas, generar alerta

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo modificar un pago ya registrado?**  
R: No directamente. Debe crear un ajuste o reverso. Contacte a su gerente.

**P: ¿Qué hago si el cliente perdió su recibo?**  
R: Puede reimprimir desde: Pagos Recibidos → Buscar por nombre → Reimprimir

**P: ¿Cómo sé si una CXP ya fue autorizada?**  
R: El estado dirá "autorizado" y mostrará quién y cuándo autorizó.

**P: ¿Puedo ver pagos de otras sucursales?**  
R: Solo si es Director. Gerentes y cajeros solo ven su sucursal.

**P: ¿Cada cuánto debo cambiar mi contraseña?**  
R: El sistema solicita cambio cada 90 días por seguridad.

---

## 📞 Soporte

**Soporte Técnico:**  
- Email: soporte@spirittours.com
- Teléfono: 800-SPIRIT-1
- WhatsApp: +52 998 123 4567
- Horario: Lun-Vie 8am-8pm, Sáb 9am-2pm

**Capacitación:**  
- Solicitar sesión de capacitación: capacitacion@spirittours.com
- Manuales adicionales: https://docs.spirittours.com
- Videos tutoriales: https://training.spirittours.com

---

**Última actualización:** 27 de octubre de 2025  
**Versión:** 1.0  
**Preparado por:** Departamento de Sistemas - Spirit Tours
