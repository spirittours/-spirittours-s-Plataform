# 📊 DIAGRAMAS Y FLUJOS VISUALES - Sistema Contable

Explicación visual paso a paso de todos los procesos.

---

## 🎯 DIAGRAMA 1: Arquitectura General del Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SPIRIT TOURS - SISTEMA CONTABLE                   │
│                              (Nivel Corporativo)                          │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼───────┐
│  SUCURSAL 1    │  │  SUCURSAL 2     │  │ SUCURSAL 3    │
│   (Cancún)     │  │   (CDMX)        │  │ (Guadalajara) │
├────────────────┤  ├─────────────────┤  ├───────────────┤
│                │  │                 │  │               │
│ 💰 CXC Local   │  │ 💰 CXC Local    │  │ 💰 CXC Local  │
│ 💸 CXP Local   │  │ 💸 CXP Local    │  │ 💸 CXP Local  │
│ 🏦 Banco Local │  │ 🏦 Banco Local  │  │ 🏦 Banco Local│
│ 💵 Caja Chica  │  │ 💵 Caja Chica   │  │ 💵 Caja Chica │
│ 📊 P&L Local   │  │ 📊 P&L Local    │  │ 📊 P&L Local  │
│                │  │                 │  │               │
└────────────────┘  └─────────────────┘  └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  CONSOLIDACIÓN  │
                    │   CORPORATIVA   │
                    └─────────────────┘
```

**Características Clave:**
- Cada sucursal es **independiente** financieramente
- Cada sucursal genera su propio **P&L**
- Consolidación **automática** a nivel corporativo
- Transferencias **inter-sucursales** rastreadas

---

## 💰 DIAGRAMA 2: Ciclo de Vida de Cuenta por Cobrar (CXC)

```
                        CICLO DE VIDA CXC

   [Cliente Reserva]
          │
          ▼
   ┌──────────────┐
   │  PENDIENTE   │ ◄─── Estado inicial
   └──────┬───────┘      Monto_pendiente = Total
          │
          │ Cliente hace primer pago (parcial)
          │
          ▼
   ┌──────────────┐
   │   PARCIAL    │ ◄─── Pagó algo, pero no todo
   └──────┬───────┘      0 < Monto_pendiente < Total
          │
          │ Cliente completa el pago
          │
          ▼
   ┌──────────────┐
   │   COBRADO    │ ◄─── ✅ Pagado 100%
   └──────────────┘      Monto_pendiente = 0


   ⚠️ FLUJOS ALTERNATIVOS:

   [PENDIENTE] ──► Pasa fecha límite ──► [VENCIDO]
                                              │
                                              │ Pasa 14+ días
                                              ▼
                                         [INCOBRABLE]

   [CUALQUIER ESTADO] ──► Cliente cancela ──► [CANCELADA]
```

**Triggers Automáticos:**

```
Estado        │ Acción Automática
──────────────┼────────────────────────────────────────
PENDIENTE     │ • Email recordatorio diario
              │ • Si pasa fecha límite → VENCIDO
              │
PARCIAL       │ • Email saldo pendiente
              │ • Si pasa fecha límite → VENCIDO
              │
VENCIDO       │ • Alerta a gerente (diaria)
              │ • SMS/WhatsApp al cliente
              │ • Si pasa 14 días → INCOBRABLE
              │
INCOBRABLE    │ • Alerta a director
              │ • Considerar cobranza legal
              │
COBRADO       │ • Email de agradecimiento
              │ • Trip cambia a "upcoming"
              │ • Autorizar pago a operador
              │
CANCELADA     │ • Calcular reembolso
              │ • Crear reembolso_por_pagar
              │ • Cancelar CXP a operador
```

---

## 💸 DIAGRAMA 3: Ciclo de Vida de Cuenta por Pagar (CXP)

```
                        CICLO DE VIDA CXP

   [Servicio Recibido / Factura Llega]
          │
          ▼
   ┌────────────────┐
   │   PENDIENTE    │ ◄─── Esperando autorización
   └────────┬───────┘      
            │
            │ Gerente revisa y aprueba
            │
            ▼
   ┌────────────────┐
   │  AUTORIZADO    │ ◄─── Aprobado para pago
   └────────┬───────┘      Esperando fecha programada
            │
            │ Llega fecha de pago
            │
            ▼
   ┌────────────────┐
   │    PAGADO      │ ◄─── Transferencia ejecutada
   └────────┬───────┘      Dinero salió de cuenta
            │
            │ Confirmar en estado de cuenta
            │
            ▼
   ┌────────────────┐
   │  CONCILIADO    │ ◄─── ✅ Confirmado en banco
   └────────────────┘


   ⚠️ FLUJOS ALTERNATIVOS:

   [PENDIENTE] ──► Gerente rechaza ──► [RECHAZADA]

   [PENDIENTE] ──► Cliente cancela ──► [CANCELADA]

   [AUTORIZADO] ──► Fondos insuficientes ──► [ERROR]
                                                │
                                                │ Reintentar
                                                ▼
                                          [AUTORIZADO]
```

**Reglas de Autorización:**

```
┌─────────────────────────────────────────────────────────┐
│           MATRIZ DE AUTORIZACIONES                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Monto         │ Autoriza          │ Requiere         │
│  ──────────────┼───────────────────┼──────────────    │
│  < $5,000      │ Supervisor        │ 1 firma          │
│  $5K - $20K    │ Gerente           │ 1 firma          │
│  $20K - $50K   │ Gerente           │ 2 firmas         │
│  > $50K        │ Director          │ 2 firmas         │
│                                                         │
│  ⚠️ REGLA ESPECIAL:                                     │
│  Nadie puede AUTORIZAR y EJECUTAR el mismo pago         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 DIAGRAMA 4: Flujo Completo de un Tour (Happy Path)

```
FASE 1: PRE-VENTA
═════════════════

   Cliente
      │
      │ 1. Busca tour en sitio web
      ▼
   [Catálogo]
      │
      │ 2. Selecciona tour
      ▼
   [Formulario Reserva]
      │
      │ 3. Completa datos
      ▼
   ┌──────────────────┐
   │ Trip: PENDING    │ ◄─── Sistema crea trip
   │ CXC: PENDIENTE   │ ◄─── Sistema crea CXC
   └────────┬─────────┘
            │
            │ 4. Email con instrucciones de pago
            ▼
   [Cliente recibe email]


FASE 2: PAGO
════════════

   Cliente
      │
      │ 5. Hace pago (transferencia/tarjeta)
      ▼
   [Sistema Bancario]
      │
      │ 6a. Webhook (si tarjeta)
      │ 6b. Contador registra (si transferencia)
      ▼
   ┌──────────────────┐
   │ CXC: COBRADO ✅  │ ◄─── Pago confirmado
   │ Trip: UPCOMING   │ ◄─── Tour confirmado
   └────────┬─────────┘
            │
            │ 7. Email confirmación
            ▼
   [Cliente recibe confirmación]


FASE 3: PRE-TOUR
════════════════

   Sistema (Automático)
      │
      │ 8. Notificar a operador
      ▼
   [Operador confirma servicio]
      │
      │ 9. Sistema crea CXP a operador
      ▼
   ┌──────────────────┐
   │ CXP: PENDIENTE   │ ◄─── Se pagará después del tour
   └────────┬─────────┘
            │
            │ 10. 2 días antes: Recordatorio
            ▼
   [Cliente recibe WhatsApp]
      │
      │ 11. 1 día antes: Asignar guía
      ▼
   [Guía recibe asignación]


FASE 4: DÍA DEL TOUR
═══════════════════

   Guía
      │
      │ 12. Inicia GPS tracking
      ▼
   ┌──────────────────┐
   │ Trip: IN_PROGRESS│ ◄─── Tour iniciado
   │ GPS: Activo      │
   └────────┬─────────┘
            │
            │ 13. Cliente ve ubicación en tiempo real
            ▼
   [Mapa en vivo]
      │
      │ 14. Tour completa
      ▼
   ┌──────────────────┐
   │ Trip: COMPLETED ✅│ ◄─── Tour finalizado
   └────────┬─────────┘
            │
            │ 15. Solicitar review
            ▼
   [Cliente califica 5 estrellas]


FASE 5: POST-TOUR
═════════════════

   Sistema (Automático)
      │
      │ 16. CXP operador → AUTORIZADO
      ▼
   ┌──────────────────┐
   │ CXP: AUTORIZADO  │ ◄─── Listo para pagar
   └────────┬─────────┘
            │
            │ 17. Al día siguiente: Pagar
            ▼
   [Transferencia a operador]
      │
      │ 18. Registrar pago
      ▼
   ┌──────────────────┐
   │ CXP: PAGADO ✅   │
   └────────┬─────────┘
            │
            │ 19. Conciliar con banco
            ▼
   ┌──────────────────┐
   │ CXP: CONCILIADO ✅│ ◄─── ✅ TODO COMPLETO
   └──────────────────┘


RESULTADO FINAL:
═══════════════

   ┌─────────────────────────────────────┐
   │  ANÁLISIS FINANCIERO                │
   ├─────────────────────────────────────┤
   │                                     │
   │  Ingreso:    $10,000 ✅             │
   │  Costo:      $ 7,000 ✅             │
   │  ───────────────────────            │
   │  Utilidad:   $ 3,000 (30%) 🟢       │
   │                                     │
   │  CXC: COBRADO                       │
   │  CXP: CONCILIADO                    │
   │  Trip: COMPLETED                    │
   │  Review: 5 ⭐                       │
   │                                     │
   └─────────────────────────────────────┘
```

**Timeline:**
- Día 1: Reserva
- Día 3: Pago completo
- Día 13: Recordatorio
- Día 14: Asignar guía
- Día 15: Tour (8 AM - 6 PM)
- Día 16: Pago a operador
- Día 17: Conciliación

---

## 🚨 DIAGRAMA 5: Flujo de Cancelación con Reembolso

```
CANCELACIÓN INICIADA
══════════════════

   Cliente
      │
      │ "Necesito cancelar"
      ▼
   [Agente recibe llamada]
      │
      │ Busca folio en sistema
      ▼
   ┌─────────────────────────┐
   │ Trip Status: UPCOMING   │
   │ Paid: $10,000           │
   │ Departure: 10 días      │
   └───────────┬─────────────┘
               │
               │ Agente marca como cancelado
               ▼


CÁLCULO AUTOMÁTICO
═════════════════

   [Sistema calcula]
      │
      ├─ Días hasta salida: 10
      ├─ Política aplicable: 75% (7-13 días)
      ├─ Reembolso: $7,500
      └─ Retención: $2,500
      │
      ▼
   ┌─────────────────────────┐
   │ Trip: CANCELLED         │
   │ Refund Amount: $7,500   │
   │ Retention: $2,500       │
   └───────────┬─────────────┘
               │
               │ Sistema crea automáticamente:
               │
               ├──► ┌──────────────────┐
               │    │ CXC: CANCELADA   │
               │    └──────────────────┘
               │
               └──► ┌──────────────────────┐
                    │ Reembolso: PENDIENTE │
                    └──────────┬───────────┘
                               │
                               │ Email a cliente
                               ▼
                    [Cliente informado]


AUTORIZACIÓN
══════════

   [Gerente revisa]
      │
      │ Verifica:
      ├─ Política aplicada correcta ✅
      ├─ Cálculo correcto ✅
      └─ CXP operador no pagado ✅
      │
      │ Gerente autoriza
      ▼
   ┌──────────────────────────┐
   │ Reembolso: AUTORIZADO    │
   └───────────┬──────────────┘
               │
               │ Notifica a contabilidad
               ▼
   [Contador recibe alerta]


EJECUCIÓN
════════

   Contador
      │
      │ Ejecuta transferencia
      ▼
   [Banco procesa]
      │
      │ Confirmación
      ▼
   ┌──────────────────────────┐
   │ Reembolso: PROCESADO ✅  │
   │ Trip: REFUNDED          │
   └───────────┬──────────────┘
               │
               │ Email a cliente
               ▼
   [Cliente recibe dinero en 24-48h]


CANCELACIÓN OPERADOR
═══════════════════

   [Verificar CXP operador]
      │
      ├─ ¿Ya se pagó?
      │
      ├─ NO ───► ┌─────────────────┐
      │          │ CXP: CANCELADA  │
      │          └─────────────────┘
      │          ✅ No hay que recuperar
      │
      └─ SÍ ───► ┌──────────────────────┐
                 │ Crear CXC a Operador │
                 └──────────┬───────────┘
                            │
                            │ Solicitar devolución
                            ▼
                 [Email a operador]
                            │
                            │ Operador devuelve
                            ▼
                 ┌──────────────────────┐
                 │ CXC: COBRADA ✅      │
                 └──────────────────────┘


RESULTADO FINAL
══════════════

   ┌──────────────────────────────────────┐
   │  RESUMEN FINANCIERO CANCELACIÓN      │
   ├──────────────────────────────────────┤
   │                                      │
   │  Ingreso Original:    $10,000        │
   │  Reembolsado:         $ 7,500 (75%)  │
   │  Retenido:            $ 2,500 (25%)  │
   │                                      │
   │  Costo Operador:      $     0        │
   │  (Cancelado a tiempo)                │
   │                                      │
   │  ───────────────────────────         │
   │  Resultado Neto:      $ 2,500 🟢     │
   │  ───────────────────────────         │
   │                                      │
   │  ✅ Sin pérdidas                     │
   │  ✅ Política aplicada correctamente  │
   │  ✅ Cliente informado en todo momento│
   │                                      │
   └──────────────────────────────────────┘
```

**Política de Reembolsos:**

```
╔════════════════════════════════════════════════════╗
║         POLÍTICA DE CANCELACIÓN                    ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║  Días antes    │ Reembolso │ Retención            ║
║  ─────────────────────────────────────────        ║
║  30+ días      │   100%    │    0%                ║
║  14-29 días    │    90%    │   10%                ║
║  7-13 días     │    75%    │   25%  ◄── Este caso ║
║  2-6 días      │    50%    │   50%                ║
║  0-1 días      │     0%    │  100%                ║
║                                                    ║
╚════════════════════════════════════════════════════╝
```

---

## 🔍 DIAGRAMA 6: Detección de Discrepancia en Pago

```
FACTURA LLEGA
════════════

   Operador
      │
      │ Envía factura $4,200
      ▼
   [Email a cuentaspagar@spirittours.com]
      │
      │ Contador descarga PDF
      ▼


REGISTRO EN SISTEMA
═════════════════

   Contador
      │
      │ Crea CXP en sistema
      ▼
   ┌─────────────────────────────┐
   │ CXP Nueva                   │
   │ Monto: $4,200               │
   │ Proveedor: Xcaret Tours     │
   │ Trip: ST-2024-9999          │
   └──────────┬──────────────────┘
              │
              │ Trigger automático BEFORE INSERT
              ▼


VERIFICACIÓN AUTOMÁTICA
══════════════════════

   [Sistema compara]
      │
      ├─ Factura dice: $4,200
      └─ Contrato dice: $3,600
      │
      │ Diferencia: $600 🚨
      │
      ▼
   ┌─────────────────────────────┐
   │ ⚠️ DISCREPANCIA DETECTADA   │
   │ Status: PENDIENTE_REVISION  │
   └──────────┬──────────────────┘
              │
              │ Alerta automática
              ▼
   [Gerente recibe notificación]
      │
      │ SMS + Email + Dashboard
      ▼


INVESTIGACIÓN
════════════

   Gerente
      │
      │ Abre dashboard
      ▼
   ┌─────────────────────────────────────┐
   │  🚨 ALERTA DISCREPANCIA            │
   ├─────────────────────────────────────┤
   │                                     │
   │  CXP: CXP-2024-7890                │
   │  Proveedor: Xcaret Tours            │
   │  Tour: 6 personas                   │
   │                                     │
   │  Facturado:  $4,200                │
   │  Acordado:   $3,600                │
   │  ─────────────────                 │
   │  DIFERENCIA: $  600 🔴              │
   │                                     │
   │  [Ver Contrato]  [Contactar]       │
   └─────────────────────────────────────┘
      │
      │ Gerente revisa contrato
      ▼
   [Contrato: $600/persona]
      │
      │ Confirma error del operador
      │
      │ Gerente contacta operador
      ▼
   [Email/Llamada]
      │
      │ Operador acepta error
      │
      │ "Enviaré factura correcta"
      ▼


CORRECCIÓN
═════════

   Operador
      │
      │ Envía nueva factura $3,600
      ▼
   [Factura corregida]
      │
      │ Contador actualiza sistema
      ▼
   ┌─────────────────────────────┐
   │ CXP Anterior: CANCELADA     │
   │ Motivo: Factura incorrecta  │
   └─────────────────────────────┘
      │
      ▼
   ┌─────────────────────────────┐
   │ CXP Nueva: PENDIENTE        │
   │ Monto: $3,600 ✅            │
   │ Nota: Factura corregida     │
   └──────────┬──────────────────┘
              │
              │ Flujo normal continúa
              ▼
   [Autorización → Pago]


RESULTADO
════════

   ┌────────────────────────────────────┐
   │  PREVENCIÓN DE PÉRDIDA            │
   ├────────────────────────────────────┤
   │                                    │
   │  ❌ Sin Sistema:                   │
   │  └─ Se habría pagado: $4,200      │
   │                                    │
   │  ✅ Con Sistema:                   │
   │  └─ Se pagó correcto:  $3,600     │
   │                                    │
   │  ═════════════════════════         │
   │  AHORRO:              $  600 🟢    │
   │  ═════════════════════════         │
   │                                    │
   │  Tiempo resolución: 2 días         │
   │  Registro auditoría: 8 entradas    │
   │                                    │
   └────────────────────────────────────┘
```

**Lógica del Trigger:**

```sql
IF (monto_factura - monto_contrato) > $100 THEN
    -- Bloquear pago automático
    status = 'pendiente_revision'
    
    -- Crear alerta
    INSERT INTO alertas_sistema (
        tipo: 'discrepancia_pago',
        gravedad: 'alta',
        destinatario: 'gerente'
    )
    
    -- Enviar notificaciones
    CALL enviar_sms_gerente()
    CALL enviar_email_gerente()
    CALL actualizar_dashboard()
END IF
```

---

## 🏢 DIAGRAMA 7: Flujo Multi-Sucursal

```
VENTA MULTI-SUCURSAL
═══════════════════

   Agencia (Cliente B2B)
   en CDMX
      │
      │ Quiere tour en Cancún
      │ Llama a oficina CDMX
      ▼
   ┌────────────────────┐
   │  Agente CDMX       │
   │  Registra reserva  │
   └──────────┬─────────┘
              │
              │ Trip:
              ├─ Sucursal Venta: CDMX
              ├─ Sucursal Opera: Cancún
              └─ Comisión: 12%
              │
              ▼


CREACIÓN AUTOMÁTICA DE CUENTAS
═════════════════════════════

   Sistema crea automáticamente:

   ┌─────────────────────────────────────────────────┐
   │                                                 │
   │  EN SUCURSAL CDMX:                              │
   │                                                 │
   │  1️⃣ CXC (Cobrar a agencia)                     │
   │     Monto: $25,000                              │
   │     Estado: PENDIENTE                           │
   │                                                 │
   │  2️⃣ CXP (Pagar a Cancún)                       │
   │     Monto: $22,000 ($25K - 12% comisión)        │
   │     Estado: PENDIENTE                           │
   │                                                 │
   └─────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────┐
   │                                                 │
   │  EN SUCURSAL CANCÚN:                            │
   │                                                 │
   │  3️⃣ CXC (Cobrar de CDMX)                       │
   │     Monto: $22,000                              │
   │     Estado: PENDIENTE                           │
   │                                                 │
   │  4️⃣ CXP (Pagar a operador)                     │
   │     Monto: $16,000                              │
   │     Estado: PENDIENTE                           │
   │                                                 │
   └─────────────────────────────────────────────────┘


FLUJO DE DINERO
══════════════

        Agencia Vamos Tour
               │
               │ $25,000
               ▼
        ┌──────────────┐
        │ Sucursal CDMX│
        └──────┬───────┘
               │
               ├─ Retiene: $3,000 (12%)
               │  └─► [Comisión CDMX]
               │
               └─ Transfiere: $22,000
                      │
                      ▼
               ┌──────────────┐
               │Sucursal Cancún│
               └──────┬────────┘
                      │
                      ├─ Paga: $16,000
                      │  └─► [Operador Local]
                      │
                      └─ Retiene: $6,000
                         └─► [Utilidad Cancún]


TIMELINE DE PAGOS
════════════════

DÍA 1: Reserva
   │
   └─► CXC CDMX: PENDIENTE

DÍA 3: Agencia paga a CDMX
   │
   ├─► CXC CDMX: COBRADO ✅
   │
   └─► Trigger: CXP CDMX → AUTORIZADO

DÍA 5: CDMX transfiere a Cancún
   │
   ├─► CXP CDMX: PAGADO ✅
   │
   └─► CXC CANCÚN: COBRADO ✅

DÍA 15: Tour se completa
   │
   └─► CXP CANCÚN → AUTORIZADO

DÍA 16: Cancún paga operador
   │
   └─► CXP CANCÚN: PAGADO ✅


ESTADOS FINALES
══════════════

   SUCURSAL CDMX:
   ┌─────────────────────────────┐
   │ Ingreso:    $25,000         │
   │ Egreso:     $22,000         │
   │ ─────────────────           │
   │ Utilidad:   $ 3,000 (12%) ✅│
   └─────────────────────────────┘

   SUCURSAL CANCÚN:
   ┌─────────────────────────────┐
   │ Ingreso:    $22,000         │
   │ Egreso:     $16,000         │
   │ ─────────────────           │
   │ Utilidad:   $ 6,000 (27%) ✅│
   └─────────────────────────────┘

   CONSOLIDADO CORPORATIVO:
   ┌─────────────────────────────┐
   │ Ingreso:    $25,000         │
   │ Egreso:     $16,000         │
   │ ─────────────────           │
   │ Utilidad:   $ 9,000 (36%) ✅│
   └─────────────────────────────┘

   Distribución Utilidad:
   - CDMX:   $3,000 (33%)
   - Cancún: $6,000 (67%)

   ✅ Ambas sucursales rentables
   ✅ Incentivo correcto (operación gana más)
```

---

## 🔄 DIAGRAMA 8: Conciliación Bancaria Diaria

```
CADA DÍA A LAS 11 PM
═══════════════════

   [Cron Job Automático]
      │
      ▼
   ┌─────────────────────────────┐
   │ 1. RECOPILAR DATOS          │
   └──────────┬──────────────────┘
              │
              ├─► Ingresos según sistema
              ├─► Egresos según sistema
              ├─► Movimientos bancarios
              └─► Saldo anterior
              │
              ▼
   ┌─────────────────────────────┐
   │ 2. CALCULAR                 │
   └──────────┬──────────────────┘
              │
              │ Ingresos Sistema: $26,000
              │ Ingresos Banco:   $26,000
              │ Diferencia:       $     0 ✅
              │
              │ Egresos Sistema:  $17,500
              │ Egresos Banco:    $17,500
              │ Diferencia:       $     0 ✅
              │
              ▼
   ┌─────────────────────────────┐
   │ 3. COMPARAR                 │
   └──────────┬──────────────────┘
              │
              │ ¿Diferencias?
              │
       ┌──────┴──────┐
       │             │
      SÍ            NO
       │             │
       ▼             ▼
   [ALERTA]    [TODO OK]
       │             │
       │             └─► Email confirmación
       │
       └─► [Investigar]
              │
              ├─► ¿Pago en tránsito?
              ├─► ¿Error de registro?
              ├─► ¿Fraude?
              │
              ▼
       [Acción correctiva]
```

**Ejemplo de Reporte Diario:**

```
╔════════════════════════════════════════════════════════╗
║     CONCILIACIÓN BANCARIA - 16 Noviembre 2024         ║
║            Sucursal Cancún                             ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  📊 RESUMEN                                            ║
║  ─────────────────────────────────────────            ║
║                                                        ║
║  Saldo Inicial (15-Nov):      $125,000                ║
║                                                        ║
║  INGRESOS:                                             ║
║  ┌────────────────────────────────────┐               ║
║  │         Sistema    │    Banco      │               ║
║  ├────────────────────────────────────┤               ║
║  │ Efectivo    $ 5,500│   $ 5,500  ✅ │               ║
║  │ Transfer.   $12,500│   $12,500  ✅ │               ║
║  │ Tarjetas    $ 8,000│   $ 8,000  ✅ │               ║
║  ├────────────────────────────────────┤               ║
║  │ TOTAL       $26,000│   $26,000  ✅ │               ║
║  └────────────────────────────────────┘               ║
║                                                        ║
║  EGRESOS:                                              ║
║  ┌────────────────────────────────────┐               ║
║  │         Sistema    │    Banco      │               ║
║  ├────────────────────────────────────┤               ║
║  │ Operadores  $ 8,000│   $ 8,000  ✅ │               ║
║  │ Hoteles     $ 6,500│   $ 6,500  ✅ │               ║
║  │ Transport   $ 3,000│   $ 3,000  ✅ │               ║
║  ├────────────────────────────────────┤               ║
║  │ TOTAL       $17,500│   $17,500  ✅ │               ║
║  └────────────────────────────────────┘               ║
║                                                        ║
║  FLUJO NETO:          $ 8,500                          ║
║  Saldo Final (16-Nov): $133,500                        ║
║                                                        ║
║  ═══════════════════════════════════                  ║
║  ✅ CONCILIADO - Sin diferencias                       ║
║  ═══════════════════════════════════                  ║
║                                                        ║
║  Procesado: 16-Nov-2024 23:15:00                       ║
║  Por: Sistema Automático                               ║
╚════════════════════════════════════════════════════════╝
```

**Si hay diferencia:**

```
╔════════════════════════════════════════════════════════╗
║     🚨 DESCUADRE DETECTADO                             ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  Ingresos Sistema:    $26,000                          ║
║  Ingresos Banco:      $24,500                          ║
║  ─────────────────────────────                        ║
║  DIFERENCIA:          $ 1,500 🔴                       ║
║                                                        ║
║  Movimientos sin conciliar:                            ║
║  • PAG-IN-3047: $1,500 (Efectivo)                     ║
║    ⚠️ No aparece en estado de cuenta                  ║
║                                                        ║
║  Acciones:                                             ║
║  1. SMS enviado a: Gerente + Contador                 ║
║  2. Email detallado enviado                            ║
║  3. Dashboard marcado con alerta                       ║
║  4. Requiere investigación URGENTE                     ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

## 📊 DIAGRAMA 9: Dashboard Gerente en Tiempo Real

```
╔════════════════════════════════════════════════════════════════════╗
║                     🏠 DASHBOARD GERENTE                           ║
║                     Sucursal Cancún                                ║
║                     Gerente: Carlos Méndez                         ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  📅 HOY: 16 Noviembre 2024, 14:35                                 ║
║                                                                    ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │  🚨 ALERTAS ACTIVAS (4)                                     │  ║
║  ├─────────────────────────────────────────────────────────────┤  ║
║  │  🔴 CRÍTICA (1)                                             │  ║
║  │  └─ Descuadre caja: $1,500 → [INVESTIGAR]                  │  ║
║  │                                                             │  ║
║  │  🟡 MEDIA (3)                                               │  ║
║  │  ├─ 5 pagos vencen hoy → [VER LISTA]                       │  ║
║  │  ├─ Reembolso $8,500 pendiente autorización → [REVISAR]    │  ║
║  │  └─ Saldo banco < $50K → [NOTA: Transferencia pendiente]   │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
║  ┌──────────────────┬──────────────────┬──────────────────────┐   ║
║  │  💰 POR COBRAR   │  💸 POR PAGAR    │  🔄 REEMBOLSOS      │   ║
║  ├──────────────────┼──────────────────┼──────────────────────┤   ║
║  │                  │                  │                      │   ║
║  │  Total: $120K    │  Total: $85K     │  Total: $12K        │   ║
║  │                  │                  │                      │   ║
║  │  Vence hoy:      │  Pagar hoy:      │  Pendientes:        │   ║
║  │  $25K [5] 🔴     │  $30K [3] 🔴     │  $8K [2] 🟡         │   ║
║  │                  │                  │                      │   ║
║  │  Vencido:        │  Autorizar:      │  En proceso:        │   ║
║  │  $15K [3] 🔴     │  $20K [4] 🟡     │  $4K [1] 🟢         │   ║
║  │                  │                  │                      │   ║
║  │  [VER DETALLE]   │  [VER DETALLE]   │  [VER DETALLE]      │   ║
║  └──────────────────┴──────────────────┴──────────────────────┘   ║
║                                                                    ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │  📊 MÉTRICAS DEL MES (Noviembre)                           │  ║
║  ├─────────────────────────────────────────────────────────────┤  ║
║  │                                                             │  ║
║  │  Ingresos:        $680,000  [85% de meta $800K]            │  ║
║  │  ███████████████████████░░░░                                │  ║
║  │                                                             │  ║
║  │  Egresos:         $595,000                                  │  ║
║  │  ███████████████████████                                    │  ║
║  │                                                             │  ║
║  │  Utilidad:        $ 85,000  (12.5% margen) 🟢              │  ║
║  │                                                             │  ║
║  │  Tours completados: 127 (↑ 15% vs mes anterior)            │  ║
║  │  Rating promedio: 4.8 ⭐                                    │  ║
║  │  Tasa cancelación: 6.2% 🟢                                  │  ║
║  │                                                             │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │  📅 FLUJO DE CAJA PROYECTADO (Próximos 30 días)            │  ║
║  ├─────────────────────────────────────────────────────────────┤  ║
║  │                                                             │  ║
║  │  Saldo Actual:           $133,500                           │  ║
║  │                                                             │  ║
║  │  Entradas esperadas:     $205,000                           │  ║
║  │  Salidas programadas:    $245,000                           │  ║
║  │  ─────────────────────────────                             │  ║
║  │  Saldo proyectado:       $ 93,500  ⚠️                       │  ║
║  │                                                             │  ║
║  │  ⚠️ ALERTA: Saldo proyectado cerca del mínimo ($100K)      │  ║
║  │                                                             │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                    ║
║  [🔄 ACTUALIZAR]  [📊 REPORTES]  [⚙️ CONFIGURACIÓN]              ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
```

**Actualización automática cada 30 segundos vía WebSocket**

---

## 🎯 DIAGRAMA 10: Matriz de Responsabilidades

```
╔═══════════════════════════════════════════════════════════════════╗
║              MATRIZ DE ROLES Y RESPONSABILIDADES                  ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Acción                  │ Empleado │ Supervisor │ Gerente │ Contador │ Director ║
║  ────────────────────────┼──────────┼────────────┼─────────┼──────────┼──────────║
║                          │          │            │         │          │          ║
║  📝 CREACIÓN             │          │            │         │          │          ║
║  ────────────────────────┼──────────┼────────────┼─────────┼──────────┼──────────║
║  Crear CXC (reserva)     │    ✅    │     ✅     │   ✅    │    ✅    │    ✅    ║
║  Crear CXP (factura)     │    ❌    │     ❌     │   ❌    │    ✅    │    ✅    ║
║  Crear reembolso         │    ❌    │     ❌     │   ✅    │    ✅    │    ✅    ║
║                          │          │            │         │          │          ║
║  ✅ AUTORIZACIÓN         │          │            │         │          │          ║
║  ────────────────────────┼──────────┼────────────┼─────────┼──────────┼──────────║
║  Autorizar CXP < $5K     │    ❌    │     ✅     │   ✅    │    ❌    │    ✅    ║
║  Autorizar CXP $5K-$20K  │    ❌    │     ❌     │   ✅    │    ❌    │    ✅    ║
║  Autorizar CXP > $20K    │    ❌    │     ❌     │   ❌    │    ❌    │    ✅    ║
║  Autorizar reembolso     │    ❌    │     ❌     │   ✅    │    ❌    │    ✅    ║
║                          │          │            │         │          │          ║
║  💸 EJECUCIÓN            │          │            │         │          │          ║
║  ────────────────────────┼──────────┼────────────┼─────────┼──────────┼──────────║
║  Registrar pago recibido │    ❌    │     ❌     │   ❌    │    ✅    │    ✅    ║
║  Ejecutar pago proveedor │    ❌    │     ❌     │   ❌    │    ✅    │    ❌    ║
║  Ejecutar reembolso      │    ❌    │     ❌     │   ❌    │    ✅    │    ❌    ║
║                          │          │            │         │          │          ║
║  🔍 REVISIÓN             │          │            │         │          │          ║
║  ────────────────────────┼──────────┼────────────┼─────────┼──────────┼──────────║
║  Ver CXC propias         │    ✅    │     ✅     │   ✅    │    ✅    │    ✅    ║
║  Ver CXC todas           │    ❌    │     ✅     │   ✅    │    ✅    │    ✅    ║
║  Ver CXP                 │    ❌    │     ❌     │   ✅    │    ✅    │    ✅    ║
║  Ver reembolsos          │    ❌    │     ❌     │   ✅    │    ✅    │    ✅    ║
║  Conciliar banco         │    ❌    │     ❌     │   ✅    │    ✅    │    ✅    ║
║                          │          │            │         │          │          ║
║  📊 REPORTES             │          │            │         │          │          ║
║  ────────────────────────┼──────────┼────────────┼─────────┼──────────┼──────────║
║  Reporte sucursal        │    ❌    │     ❌     │   ✅    │    ✅    │    ✅    ║
║  Reporte consolidado     │    ❌    │     ❌     │   ❌    │    ❌    │    ✅    ║
║  Auditoría financiera    │    ❌    │     ❌     │   ❌    │    ✅    │    ✅    ║
║                          │          │            │         │          │          ║
╚═══════════════════════════════════════════════════════════════════╝

🔒 REGLA DE ORO:
   Nadie puede AUTORIZAR y EJECUTAR el mismo pago
   
   Ejemplo correcto:
   ✅ Gerente AUTORIZA → Contador EJECUTA
   
   Ejemplo incorrecto:
   ❌ Gerente AUTORIZA y EJECUTA (bloqueado por sistema)
```

---

## 🎯 Resumen de Beneficios Visualizados

```
╔════════════════════════════════════════════════════════════════╗
║         POR QUÉ ESTE SISTEMA PREVIENE PÉRDIDAS                 ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  1️⃣  DETECCIÓN AUTOMÁTICA                                     ║
║      • Discrepancias detectadas antes de pagar                ║
║      • Comparación automática con contratos                    ║
║      • Alertas en tiempo real                                  ║
║                                                                ║
║  2️⃣  FLUJOS ESTRUCTURADOS                                     ║
║      • Cada paso tiene validaciones                            ║
║      • Estados bien definidos                                  ║
║      • Imposible saltarse pasos                                ║
║                                                                ║
║  3️⃣  SEGREGACIÓN DE FUNCIONES                                 ║
║      • Quien autoriza ≠ quien ejecuta                          ║
║      • Control de 4 ojos en pagos importantes                  ║
║      • Auditoría completa de quién hizo qué                    ║
║                                                                ║
║  4️⃣  CONCILIACIÓN DIARIA                                      ║
║      • Verificación automática cada noche                      ║
║      • Descuadres detectados inmediatamente                    ║
║      • Alertas antes de que se vuelva problema                 ║
║                                                                ║
║  5️⃣  TRAZABILIDAD 100%                                        ║
║      • Cada peso rastreado                                     ║
║      • Auditoría completa de cambios                           ║
║      • Imposible perder track del dinero                       ║
║                                                                ║
║  6️⃣  POLÍTICAS AUTOMÁTICAS                                    ║
║      • Reembolsos calculados automáticamente                   ║
║      • No depende de memoria humana                            ║
║      • Aplicación consistente de reglas                        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

**Estos diagramas te dan una visión completa de cómo funciona cada proceso del sistema contable. ¿Quieres que explique algún flujo específico con más detalle?**
