# 📘 Spirit Tours - Documentación de API de Contabilidad

## 📑 Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Cuentas por Cobrar (CXC)](#cuentas-por-cobrar-cxc)
3. [Cuentas por Pagar (CXP)](#cuentas-por-pagar-cxp)
4. [Reembolsos](#reembolsos)
5. [Comisiones](#comisiones)
6. [Dashboard y Reportes](#dashboard-y-reportes)
7. [Alertas](#alertas)
8. [Conciliación Bancaria](#conciliación-bancaria)
9. [Códigos de Error](#códigos-de-error)
10. [Webhooks](#webhooks)

---

## 🔐 Autenticación

Todos los endpoints requieren autenticación mediante JWT token en el header `Authorization`:

```http
Authorization: Bearer <jwt_token>
```

### Roles y Permisos

| Rol | Permisos |
|-----|----------|
| `director` | Acceso completo a todas las operaciones y sucursales |
| `gerente` | Gestión de CXC/CXP, autorización de pagos, visualización de sucursal |
| `contador` | Registro de pagos, conciliación bancaria, reportes |
| `cajero` | Registro de pagos recibidos, cortes de caja |

---

## 💰 Cuentas por Cobrar (CXC)

### GET /api/accounting/cxc

Obtiene lista de CXC con filtros.

**Autenticación:** Requerida (gerente, director, contador)

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `sucursal_id` | UUID | No | Filtrar por sucursal |
| `status` | string | No | Filtrar por estado: `pendiente`, `parcial`, `cobrado`, `vencido`, `incobrable`, `cancelada` |
| `overdue_only` | boolean | No | Mostrar solo cuentas vencidas |
| `fecha_desde` | date | No | Fecha inicio (ISO 8601) |
| `fecha_hasta` | date | No | Fecha fin (ISO 8601) |
| `page` | integer | No | Número de página (default: 1) |
| `limit` | integer | No | Registros por página (default: 50, max: 100) |

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "data": {
    "cxc": [
      {
        "id": "uuid",
        "folio": "CXC-202510-000123",
        "trip_id": "uuid",
        "customer_id": "uuid",
        "sucursal_id": "uuid",
        "tipo": "cliente",
        "monto_total": 12000.00,
        "monto_pagado": 5000.00,
        "monto_pendiente": 7000.00,
        "fecha_vencimiento": "2025-11-15T00:00:00Z",
        "status": "parcial",
        "dias_vencido": 0,
        "sucursal_nombre": "Spirit Tours - Cancún",
        "customer_nombre": "Juan Pérez",
        "customer_email": "juan@example.com",
        "tour_name": "Chichén Itzá Premium",
        "created_at": "2025-10-20T10:30:00Z",
        "updated_at": "2025-10-27T14:20:00Z"
      }
    ],
    "total": 150,
    "page": 1,
    "pages": 3
  }
}
```

**Ejemplo de Uso:**

```bash
curl -X GET "https://api.spirittours.com/api/accounting/cxc?sucursal_id=abc123&status=pendiente&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

---

### POST /api/accounting/cxc

Crea una nueva cuenta por cobrar.

**Autenticación:** Requerida (gerente, director, contador)

**Request Body:**

```json
{
  "trip_id": "uuid",
  "customer_id": "uuid",
  "sucursal_id": "uuid",
  "proveedor_id": "uuid",
  "tipo": "cliente",
  "monto_total": 12000.00,
  "fecha_vencimiento": "2025-11-15T00:00:00Z"
}
```

**Campos:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `trip_id` | UUID | No | ID del viaje asociado |
| `customer_id` | UUID | No* | ID del cliente (*requerido si tipo=cliente) |
| `sucursal_id` | UUID | Sí | ID de la sucursal |
| `proveedor_id` | UUID | No | ID del proveedor (para recuperación) |
| `tipo` | string | No | `cliente`, `proveedor`, `transferencia_interna` (default: cliente) |
| `monto_total` | decimal | Sí | Monto total de la cuenta (> 0) |
| `fecha_vencimiento` | datetime | Sí | Fecha de vencimiento |

**Validaciones Automáticas:**

- Si se proporciona `trip_id`, el sistema valida el monto contra las tarifas contratadas
- Si la diferencia es > $100, se genera una alerta automática
- Se crea automáticamente un asiento contable de doble entrada
- Se registra en la auditoría financiera

**Respuesta Exitosa (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "folio": "CXC-202510-000124",
    "trip_id": "uuid",
    "customer_id": "uuid",
    "sucursal_id": "uuid",
    "tipo": "cliente",
    "monto_total": 12000.00,
    "monto_pagado": 0.00,
    "monto_pendiente": 12000.00,
    "fecha_vencimiento": "2025-11-15T00:00:00Z",
    "status": "pendiente",
    "created_at": "2025-10-27T15:30:00Z"
  },
  "message": "CXC CXC-202510-000124 created successfully"
}
```

**Errores Comunes:**

- `400 Bad Request`: Datos de entrada inválidos
- `409 Conflict`: Discrepancia significativa con tarifas contratadas
- `500 Internal Server Error`: Error en la base de datos

---

### POST /api/accounting/cxc/:id/payment

Registra un pago recibido para una CXC.

**Autenticación:** Requerida (gerente, director, contador, cajero)

**URL Parameters:**

- `id`: UUID de la CXC

**Request Body:**

```json
{
  "monto": 5000.00,
  "metodo_pago": "transferencia",
  "referencia": "TRF20251027-001",
  "comision_bancaria": 50.00
}
```

**Campos:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `monto` | decimal | Sí | Monto del pago (> 0, <= monto_pendiente) |
| `metodo_pago` | string | Sí | `efectivo`, `transferencia`, `tarjeta_credito`, `tarjeta_debito`, `cheque` |
| `referencia` | string | No | Referencia bancaria o número de transacción |
| `comision_bancaria` | decimal | No | Comisión cobrada por el banco (default: 0) |

**Validaciones Automáticas:**

- Verifica que el monto no exceda el monto pendiente
- Detecta pagos duplicados (mismo método, referencia, monto en últimas 24 horas)
- Actualiza automáticamente el estado de la CXC:
  - `pendiente` → `parcial` (si monto_pagado > 0 y monto_pendiente > 0)
  - `parcial` → `cobrado` (si monto_pendiente <= 0.01)
- Crea asientos contables automáticos (ingreso a caja/banco, abono a CXC)

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "folio": "PAGO-202510-000045",
      "cxc_id": "uuid",
      "monto": 5000.00,
      "monto_recibido": 4950.00,
      "comision_bancaria": 50.00,
      "metodo_pago": "transferencia",
      "referencia": "TRF20251027-001",
      "sucursal_id": "uuid",
      "fecha_pago": "2025-10-27T15:45:00Z",
      "status": "aplicado",
      "conciliado": false
    },
    "cxc": {
      "id": "uuid",
      "folio": "CXC-202510-000123",
      "status": "parcial",
      "monto_pagado": 5000.00,
      "monto_pendiente": 7000.00
    }
  },
  "message": "Payment PAGO-202510-000045 registered successfully"
}
```

**Errores Comunes:**

- `404 Not Found`: CXC no encontrada
- `400 Bad Request`: Monto excede el pendiente
- `409 Conflict`: Pago duplicado detectado
- `403 Forbidden`: CXC ya está cobrada o cancelada

---

## 💸 Cuentas por Pagar (CXP)

### POST /api/accounting/cxp

Crea una nueva cuenta por pagar.

**Autenticación:** Requerida (gerente, director, contador)

**Request Body:**

```json
{
  "proveedor_id": "uuid",
  "sucursal_id": "uuid",
  "sucursal_destino": "uuid",
  "tipo": "proveedor",
  "monto_total": 8000.00,
  "fecha_vencimiento": "2025-11-10T00:00:00Z",
  "concepto": "Pago operador turístico Chichén Itzá"
}
```

**Campos:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `proveedor_id` | UUID | No* | ID del proveedor (*requerido si tipo=proveedor) |
| `sucursal_id` | UUID | Sí | Sucursal que registra la cuenta |
| `sucursal_destino` | UUID | No | Sucursal destino (para transferencias internas) |
| `tipo` | string | No | `proveedor`, `transferencia_interna`, `gasto` (default: proveedor) |
| `monto_total` | decimal | Sí | Monto total de la cuenta |
| `fecha_vencimiento` | datetime | Sí | Fecha de vencimiento |
| `concepto` | string | Sí | Descripción del gasto/servicio |

**Lógica de Autorización Automática:**

El sistema determina automáticamente si requiere autorización según límites de la sucursal:

| Monto | Nivel Requerido |
|-------|----------------|
| < $5,000 | Sin autorización (supervisor puede aprobar) |
| $5,000 - $20,000 | Autorización de gerente |
| $20,000 - $50,000 | Autorización de gerente + 2 firmas |
| > $50,000 | Autorización de director |

**Estado Inicial:**

- Si requiere autorización: `pendiente_revision`
- Si no requiere autorización: `pendiente`

**Respuesta Exitosa (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "folio": "CXP-202510-000078",
    "proveedor_id": "uuid",
    "sucursal_id": "uuid",
    "tipo": "proveedor",
    "monto_total": 8000.00,
    "monto_pendiente": 8000.00,
    "fecha_vencimiento": "2025-11-10T00:00:00Z",
    "concepto": "Pago operador turístico Chichén Itzá",
    "requiere_autorizacion": true,
    "status": "pendiente_revision",
    "created_at": "2025-10-27T16:00:00Z"
  },
  "message": "CXP CXP-202510-000078 created successfully"
}
```

---

### POST /api/accounting/cxp/:id/authorize

Autoriza una CXP para pago.

**Autenticación:** Requerida (gerente, director)

**URL Parameters:**

- `id`: UUID de la CXP

**Request Body:**

```json
{
  "comentario": "Proveedor verificado, servicios confirmados"
}
```

**Validaciones de Autorización:**

- El sistema verifica que el usuario tenga el nivel de autorización suficiente según el monto
- Gerente puede autorizar hasta el límite de autorización de la sucursal (default: $20,000)
- Director puede autorizar hasta su límite (default: $50,000)
- Montos superiores requieren aprobación especial

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "folio": "CXP-202510-000078",
    "status": "autorizado",
    "autorizado_por": "uuid",
    "fecha_autorizacion": "2025-10-27T16:10:00Z"
  },
  "message": "CXP CXP-202510-000078 authorized successfully"
}
```

**Errores Comunes:**

- `403 Forbidden`: Usuario no tiene nivel de autorización suficiente
- `400 Bad Request`: CXP no está en estado `pendiente_revision`

---

### POST /api/accounting/cxp/:id/pay

Ejecuta el pago de una CXP autorizada.

**Autenticación:** Requerida (contador)

**URL Parameters:**

- `id`: UUID de la CXP

**Request Body:**

```json
{
  "monto": 8000.00,
  "metodo_pago": "transferencia",
  "referencia": "TRF20251027-002"
}
```

**Segregación de Funciones:**

⚠️ **Importante:** Por control interno, el contador que ejecuta el pago **NO puede ser la misma persona** que autorizó la CXP.

**Validaciones:**

- La CXP debe estar en estado `autorizado` o `pendiente` (si no requiere autorización)
- El monto no debe exceder el monto pendiente
- Se verifica que haya sido autorizada si `requiere_autorizacion = true`

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "folio": "PAGO_PROV-202510-000032",
      "cxp_id": "uuid",
      "monto": 8000.00,
      "metodo_pago": "transferencia",
      "referencia": "TRF20251027-002",
      "sucursal_id": "uuid",
      "fecha_pago": "2025-10-27T16:20:00Z"
    },
    "cxp": {
      "id": "uuid",
      "folio": "CXP-202510-000078",
      "status": "pagado",
      "monto_pendiente": 0.00
    }
  },
  "message": "Payment PAGO_PROV-202510-000032 executed successfully"
}
```

---

## 💵 Reembolsos

### POST /api/accounting/refunds

Crea un reembolso por cancelación de viaje.

**Autenticación:** Requerida (gerente, director)

**Request Body:**

```json
{
  "trip_id": "uuid",
  "customer_id": "uuid",
  "sucursal_id": "uuid",
  "monto_pagado": 10000.00,
  "fecha_viaje": "2025-11-20T09:00:00Z",
  "motivo": "Cancelación por enfermedad familiar"
}
```

**Cálculo Automático de Reembolso:**

El sistema calcula automáticamente el monto de reembolso según la política de cancelación:

| Días de Anticipación | % Reembolso | % Retención |
|---------------------|-------------|-------------|
| 30+ días | 100% | 0% |
| 14-29 días | 90% | 10% |
| 7-13 días | 75% | 25% |
| 2-6 días | 50% | 50% |
| 0-1 días | 0% | 100% |

**Prioridad Automática:**

- `alta`: Si monto >= $10,000 O días de anticipación <= 3
- `normal`: Otros casos

**Respuesta Exitosa (201):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "folio": "REMB-202510-000015",
    "trip_id": "uuid",
    "customer_id": "uuid",
    "sucursal_id": "uuid",
    "monto_pagado": 10000.00,
    "monto_reembolso": 7500.00,
    "monto_retenido": 2500.00,
    "porcentaje_reembolsado": 75,
    "dias_anticipacion": 10,
    "motivo_cancelacion": "Cancelación por enfermedad familiar",
    "politica_aplicada": "7-13 días: 75% reembolso",
    "prioridad": "normal",
    "status": "pendiente_autorizacion",
    "created_at": "2025-10-27T16:30:00Z"
  },
  "message": "Refund REMB-202510-000015 created successfully. Refund amount: $7500.00 (75%)"
}
```

---

### GET /api/accounting/refunds/calculate

Calcula el monto de reembolso sin crear el registro.

**Autenticación:** Requerida

**Query Parameters:**

- `days_until_departure`: Días hasta la salida del viaje
- `paid_amount`: Monto pagado por el cliente

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "data": {
    "monto_reembolso": 7500.00,
    "monto_retenido": 2500.00,
    "porcentaje_reembolsado": 75,
    "politica_aplicada": "7-13 días: 75% reembolso"
  }
}
```

---

## 📊 Dashboard y Reportes

### GET /api/accounting/dashboard/:sucursalId

Obtiene datos agregados para el dashboard de gerente.

**Autenticación:** Requerida (gerente, director)

**URL Parameters:**

- `sucursalId`: UUID de la sucursal

**Control de Acceso:**

- Gerentes solo pueden ver el dashboard de su sucursal asignada
- Directores pueden ver cualquier sucursal

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "data": {
    "cxc": {
      "total_cxc": 45,
      "total_monto": 450000.00,
      "total_pendiente": 180000.00,
      "total_vencido": 25000.00
    },
    "cxp": {
      "total_cxp": 32,
      "total_monto": 280000.00,
      "total_pendiente": 95000.00,
      "pendientes_autorizacion": 5
    },
    "refunds": {
      "total_reembolsos": 8,
      "total_monto": 45000.00,
      "pendientes_autorizacion": 3
    },
    "alerts": [
      {
        "id": "uuid",
        "tipo": "cxc_vencido",
        "gravedad": "alta",
        "titulo": "CXC Vencido (>30 días)",
        "mensaje": "CXC CXC-202510-000050 vencido hace 35 días...",
        "created_at": "2025-10-27T08:00:00Z",
        "leida": false
      }
    ],
    "recent_transactions": [
      {
        "tipo": "pago_recibido",
        "folio": "PAGO-202510-000045",
        "monto": 5000.00,
        "fecha": "2025-10-27T15:45:00Z"
      }
    ]
  }
}
```

---

## 🚨 Alertas

### GET /api/accounting/alerts

Obtiene alertas del sistema.

**Autenticación:** Requerida (gerente, director, contador)

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `sucursal_id` | UUID | Filtrar por sucursal |
| `gravedad` | string | `baja`, `media`, `alta`, `critica` |
| `resuelta` | boolean | true=resueltas, false=pendientes |

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tipo": "conciliacion_bancaria_discrepancia",
      "gravedad": "alta",
      "titulo": "Discrepancia en Conciliación Bancaria",
      "mensaje": "Se encontraron diferencias en la conciliación del 2025-10-26...",
      "referencia_id": "uuid",
      "sucursal_id": "uuid",
      "destinatario_role": "gerente",
      "leida": false,
      "resuelta": false,
      "created_at": "2025-10-27T08:30:00Z"
    }
  ]
}
```

---

## 🔄 Conciliación Bancaria

### POST /api/accounting/reconciliation

Realiza conciliación bancaria diaria.

**Autenticación:** Requerida (contador, gerente, director)

**Request Body:**

```json
{
  "sucursal_id": "uuid",
  "fecha": "2025-10-26",
  "bank_data": {
    "ingresos": [
      {
        "monto": 12000.00,
        "referencia": "TRF001",
        "fecha": "2025-10-26T10:30:00Z"
      }
    ],
    "egresos": [
      {
        "monto": 8000.00,
        "referencia": "TRF002",
        "fecha": "2025-10-26T14:00:00Z"
      }
    ]
  }
}
```

**Proceso Automático:**

1. Obtiene transacciones del sistema para la fecha
2. Compara con transacciones bancarias
3. Detecta diferencias (transacciones sin conciliar)
4. Marca transacciones coincidentes como `conciliado = true`
5. Genera alertas si hay discrepancias
6. Crea registro de conciliación

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "data": {
    "reconciliation": {
      "id": "uuid",
      "sucursal_id": "uuid",
      "fecha": "2025-10-26",
      "total_ingresos_sistema": 142500.00,
      "total_ingresos_banco": 141000.00,
      "diferencia_ingresos": 1500.00,
      "total_egresos_sistema": 85000.00,
      "total_egresos_banco": 85000.00,
      "diferencia_egresos": 0.00,
      "tiene_diferencias": true,
      "conciliado": false,
      "created_at": "2025-10-27T17:00:00Z"
    },
    "discrepancies": {
      "ingresos": {
        "sistema": 142500.00,
        "banco": 141000.00,
        "diferencia": 1500.00,
        "unmatched": [
          {
            "id": "uuid",
            "folio": "PAGO-202510-000040",
            "monto": 1500.00,
            "referencia": "TRF999"
          }
        ]
      },
      "egresos": {
        "sistema": 85000.00,
        "banco": 85000.00,
        "diferencia": 0.00,
        "unmatched": []
      }
    }
  }
}
```

---

## ❌ Códigos de Error

### Códigos HTTP

| Código | Significado | Descripción |
|--------|-------------|-------------|
| 200 | OK | Solicitud exitosa |
| 201 | Created | Recurso creado exitosamente |
| 400 | Bad Request | Datos de entrada inválidos |
| 401 | Unauthorized | Token JWT faltante o inválido |
| 403 | Forbidden | Usuario no tiene permisos suficientes |
| 404 | Not Found | Recurso no encontrado |
| 409 | Conflict | Conflicto (ej: pago duplicado) |
| 500 | Internal Server Error | Error del servidor |

### Estructura de Respuesta de Error

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "details": {
    "field": "Field-specific error"
  }
}
```

---

## 🔔 Webhooks

El sistema puede enviar notificaciones webhook para eventos importantes:

### Eventos Disponibles

1. `cxc.overdue` - CXC vencida
2. `cxp.requires_authorization` - CXP requiere autorización
3. `refund.created` - Reembolso creado
4. `payment.received` - Pago recibido
5. `reconciliation.discrepancy` - Discrepancia en conciliación
6. `alert.critical` - Alerta crítica generada

### Configuración

```json
{
  "webhook_url": "https://your-domain.com/webhooks/accounting",
  "events": ["payment.received", "alert.critical"],
  "secret": "your_webhook_secret"
}
```

### Payload de Webhook

```json
{
  "event": "payment.received",
  "timestamp": "2025-10-27T15:45:00Z",
  "data": {
    "payment_id": "uuid",
    "folio": "PAGO-202510-000045",
    "monto": 5000.00,
    "sucursal_id": "uuid"
  },
  "signature": "sha256_signature"
}
```

---

## 📝 Notas Importantes

### Rate Limiting

- Límite: 1000 requests/hora por usuario
- Header de respuesta: `X-RateLimit-Remaining`

### Paginación

Todos los endpoints que retornan listas soportan paginación:

```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "pages": 3,
  "limit": 50
}
```

### Fechas

Todas las fechas usan formato ISO 8601 con zona horaria:

```
2025-10-27T15:45:00Z
```

### Montos Decimales

Los montos monetarios se representan con 2 decimales:

```json
{
  "monto": 12345.67
}
```

---

## 🆘 Soporte

Para soporte técnico o preguntas sobre la API:

- **Email:** soporte@spirittours.com
- **Documentación:** https://docs.spirittours.com
- **Status:** https://status.spirittours.com

---

**Última actualización:** 27 de octubre de 2025  
**Versión de API:** v1.0
