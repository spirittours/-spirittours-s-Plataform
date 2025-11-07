# Sistema de Permisos Basado en Roles (RBAC)
## Control de Acceso para Tour Operators B2B

### 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Roles Disponibles](#roles-disponibles)
3. [Permisos por Rol](#permisos-por-rol)
4. [Configuración de Credenciales](#configuración-de-credenciales)
5. [Ejemplos de Uso](#ejemplos-de-uso)
6. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Visión General

El sistema de permisos basado en roles (RBAC) permite controlar quién puede acceder y modificar la información de los tour operators, incluyendo sus credenciales de integración.

### ✅ Características Principales

- **Permisos Granulares**: Control detallado por operación
- **Validación de Propiedad**: Los operadores solo pueden gestionar su propia información
- **Seguridad de Credenciales**: Las credenciales están encriptadas y enmascaradas
- **Auditoría Completa**: Todos los cambios se registran
- **Multi-Tenant**: Soporte para múltiples operadores independientes

---

## Roles Disponibles

### 1. System Administrator (`system_admin`)

**Descripción**: Administrador del sistema con acceso completo.

**Capacidades**:
- ✅ Crear, leer, actualizar y eliminar **cualquier** tour operator
- ✅ Ver y modificar **todas** las credenciales
- ✅ Activar/desactivar cualquier operador
- ✅ Realizar pruebas de conexión
- ✅ Gestionar configuraciones globales

**Casos de Uso**:
- Personal técnico de Spirit Tours
- Administradores de infraestructura
- Soporte técnico de nivel 3

---

### 2. Operator Admin (`operator_admin`)

**Descripción**: Administrador de un tour operator específico.

**Capacidades**:
- ✅ Ver información de **su propio** operador
- ✅ Actualizar datos de **su propio** operador
- ✅ **Configurar credenciales** de su operador
- ✅ Activar/desactivar **su propia** integración
- ✅ Realizar pruebas de conexión
- ✅ Buscar y reservar servicios
- ❌ No puede ver otros operadores
- ❌ No puede crear nuevos operadores
- ❌ No puede eliminar operadores

**Casos de Uso**:
- Administrador de Euroriente que gestiona sus credenciales de Juniper
- Administrador de otro operador que configura su API
- Gerente de operaciones de un tour operator

---

### 3. Operator User (`operator_user`)

**Descripción**: Usuario de solo lectura de un tour operator.

**Capacidades**:
- ✅ Ver información de **su propio** operador
- ✅ Ver credenciales enmascaradas
- ✅ Buscar disponibilidad
- ✅ Ver reservas
- ❌ No puede modificar credenciales
- ❌ No puede activar/desactivar integración
- ❌ No puede realizar reservas

**Casos de Uso**:
- Staff de visualización y reportes
- Usuarios de consulta
- Roles de auditoría interna

---

### 4. Agent (`agent`)

**Descripción**: Agente de viajes con permisos de búsqueda y reserva.

**Capacidades**:
- ✅ Buscar disponibilidad en operadores activos
- ✅ Crear reservas
- ✅ Ver sus propias reservas
- ❌ No puede ver credenciales
- ❌ No puede gestionar operadores

---

### 5. Customer (`customer`)

**Descripción**: Cliente final sin acceso a gestión B2B.

**Capacidades**:
- ✅ Ver sus propias reservas
- ❌ Sin acceso a gestión de operadores

---

## Permisos por Rol

### Matriz de Permisos

| Operación | System Admin | Operator Admin | Operator User | Agent | Customer |
|-----------|:------------:|:--------------:|:-------------:|:-----:|:--------:|
| **Tour Operators** |
| Crear operador | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver todos los operadores | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver su operador | ✅ | ✅ | ✅ | ❌ | ❌ |
| Actualizar cualquier operador | ✅ | ❌ | ❌ | ❌ | ❌ |
| Actualizar su operador | ✅ | ✅ | ❌ | ❌ | ❌ |
| Eliminar operador | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Credenciales** |
| Ver todas las credenciales | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver sus credenciales | ✅ | ✅ (enmascaradas) | ✅ (enmascaradas) | ❌ | ❌ |
| Modificar todas las credenciales | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modificar sus credenciales | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Integración** |
| Activar/desactivar cualquier operador | ✅ | ❌ | ❌ | ❌ | ❌ |
| Activar/desactivar su operador | ✅ | ✅ | ❌ | ❌ | ❌ |
| Test de conexión (cualquiera) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Test de conexión (propio) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Buscar disponibilidad | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Reservas B2B** |
| Crear reserva | ✅ | ✅ | ❌ | ✅ | ❌ |
| Ver reservas | ✅ | ✅ | ✅ | ✅ | ✅ (propias) |
| Cancelar reserva | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## Configuración de Credenciales

### 🔑 Respuesta a tu Pregunta Principal

**"¿Las credenciales de Juniper y otros se pueden configurar desde el panel de control del administrador o el panel de control del admin del tour operador receptivo/masivo según los permisos que tiene?"**

**Respuesta: SÍ, depende del rol:**

#### Desde Panel de System Administrator
```http
PUT /api/admin/tour-operators/:operatorId/credentials
Authorization: Bearer {token_system_admin}
```

El **System Admin** puede:
- Configurar credenciales de **cualquier operador**
- Ver credenciales sin enmascarar (si es necesario)
- Modificar cualquier configuración

#### Desde Panel de Operator Administrator
```http
PUT /api/admin/tour-operators/:operatorId/credentials
Authorization: Bearer {token_operator_admin}
```

El **Operator Admin** puede:
- Configurar credenciales **solo de su operador**
- Ver sus credenciales enmascaradas
- Activar/desactivar su integración
- Hacer pruebas de conexión

---

### Flujo de Configuración de Credenciales

#### Para System Administrator

1. **Crear Operador** (solo system_admin)
```bash
POST /api/admin/tour-operators
{
  "name": "Euroriente",
  "code": "EURORIENTE",
  "type": "receptive",
  "relationship": "supplier",
  "apiSystem": {
    "type": "ejuniper"
  }
}
```

2. **Configurar Credenciales**
```bash
PUT /api/admin/tour-operators/{operatorId}/credentials
{
  "apiSystem": {
    "credentials": {
      "username": "spirit_tours_user",
      "password": "secure_password_123",
      "agencyCode": "AGENCY123"
    },
    "endpoints": {
      "wsdl": "https://xml-uat.bookingengine.es/WebService/JP/WebServiceJP.asmx?WSDL",
      "production": "https://xml.bookingengine.es",
      "sandbox": "https://xml-uat.bookingengine.es"
    },
    "config": {
      "environment": "sandbox",
      "timeout": 30000,
      "retryAttempts": 3
    }
  }
}
```

3. **Probar Conexión**
```bash
POST /api/admin/tour-operators/{operatorId}/test
```

4. **Activar Operador**
```bash
POST /api/admin/tour-operators/{operatorId}/activate
```

---

#### Para Operator Administrator

**Requisitos Previos**:
- Usuario debe tener role: `operator_admin`
- Usuario debe estar asociado al operador (campo `organization`)

1. **Ver su Operador**
```bash
GET /api/admin/tour-operators/{operatorId}
# Retorna solo si operatorId === user.organization
```

2. **Actualizar sus Credenciales**
```bash
PUT /api/admin/tour-operators/{operatorId}/credentials
Authorization: Bearer {token_operator_admin}
{
  "apiSystem": {
    "credentials": {
      "username": "mi_usuario_ejuniper",
      "password": "mi_password",
      "agencyCode": "MI_AGENCIA"
    }
  }
}
```

3. **Probar Conexión**
```bash
POST /api/admin/tour-operators/{operatorId}/test
```

4. **Activar su Integración**
```bash
POST /api/admin/tour-operators/{operatorId}/activate
```

---

### Validación de Propiedad

El middleware `checkOperatorOwnership` valida automáticamente:

```javascript
// System Admin: puede acceder a CUALQUIER operador
if (user.role === 'system_admin') {
  return next(); // Acceso permitido
}

// Operator Admin: solo su propio operador
if (user.role === 'operator_admin') {
  if (user.organization.toString() === operatorId.toString()) {
    return next(); // Acceso permitido
  } else {
    return 403; // Acceso denegado
  }
}
```

---

## Ejemplos de Uso

### Ejemplo 1: System Admin configura Euroriente

```javascript
// 1. Crear usuario system_admin
const systemAdmin = {
  email: 'admin@spirittours.us',
  role: 'system_admin',
  organization: null // No está asociado a ningún operador
};

// 2. Crear operador Euroriente
const response = await axios.post('/api/admin/tour-operators', {
  name: 'Euroriente',
  code: 'EURORIENTE',
  apiSystem: { type: 'ejuniper' }
}, {
  headers: { Authorization: `Bearer ${systemAdminToken}` }
});

const operatorId = response.data.data._id;

// 3. Configurar credenciales Juniper
await axios.put(`/api/admin/tour-operators/${operatorId}/credentials`, {
  apiSystem: {
    credentials: {
      username: 'euroriente_user',
      password: 'secure_pass',
      agencyCode: 'EUR001'
    }
  }
}, {
  headers: { Authorization: `Bearer ${systemAdminToken}` }
});

// 4. Activar
await axios.post(`/api/admin/tour-operators/${operatorId}/activate`, {}, {
  headers: { Authorization: `Bearer ${systemAdminToken}` }
});
```

---

### Ejemplo 2: Operator Admin gestiona sus credenciales

```javascript
// 1. Crear usuario operator_admin para Euroriente
const operatorAdmin = {
  email: 'admin@euroriente.com',
  role: 'operator_admin',
  organization: '507f1f77bcf86cd799439011' // ID del operador Euroriente
};

// 2. Operator admin actualiza sus credenciales
await axios.put('/api/admin/tour-operators/507f1f77bcf86cd799439011/credentials', {
  apiSystem: {
    credentials: {
      username: 'nuevo_usuario',
      password: 'nuevo_password',
      agencyCode: 'NUEVA_AGENCIA'
    }
  }
}, {
  headers: { Authorization: `Bearer ${operatorAdminToken}` }
});

// 3. Probar conexión
const testResult = await axios.post('/api/admin/tour-operators/507f1f77bcf86cd799439011/test', {}, {
  headers: { Authorization: `Bearer ${operatorAdminToken}` }
});

// 4. Si la prueba es exitosa, activar
if (testResult.data.success) {
  await axios.post('/api/admin/tour-operators/507f1f77bcf86cd799439011/activate', {}, {
    headers: { Authorization: `Bearer ${operatorAdminToken}` }
  });
}
```

---

### Ejemplo 3: Operator Admin intenta acceder a otro operador (FALLA)

```javascript
// Usuario operator_admin de Euroriente
const operatorAdmin = {
  email: 'admin@euroriente.com',
  role: 'operator_admin',
  organization: '507f1f77bcf86cd799439011' // Euroriente ID
};

// Intenta acceder a otro operador (ejemplo: HotelBeds)
const otherOperatorId = '507f1f77bcf86cd799439099';

try {
  await axios.get(`/api/admin/tour-operators/${otherOperatorId}`, {
    headers: { Authorization: `Bearer ${operatorAdminToken}` }
  });
} catch (error) {
  // Error 403: No tiene permisos para acceder a este operador
  console.error(error.response.data);
  /*
  {
    success: false,
    error: 'No tiene permisos para acceder a este operador',
    code: 'OPERATOR_ACCESS_DENIED',
    userOperator: '507f1f77bcf86cd799439011',
    requestedOperator: '507f1f77bcf86cd799439099'
  }
  */
}
```

---

### Ejemplo 4: Listar operadores según rol

```javascript
// System Admin: ve TODOS los operadores
const systemAdminResponse = await axios.get('/api/admin/tour-operators', {
  headers: { Authorization: `Bearer ${systemAdminToken}` }
});
// Retorna: [Euroriente, HotelBeds, Amadeus, Sabre, ...]

// Operator Admin de Euroriente: ve SOLO su operador
const operatorAdminResponse = await axios.get('/api/admin/tour-operators', {
  headers: { Authorization: `Bearer ${operatorAdminToken}` }
});
// Retorna: [Euroriente] (solo el suyo)
```

---

## Seguridad de Credenciales

### Encriptación

Las credenciales se almacenan **encriptadas** en la base de datos usando AES-256:

```javascript
// En TourOperator model
const crypto = require('crypto');

// Encriptar antes de guardar
tourOperatorSchema.pre('save', function(next) {
  if (this.isModified('apiSystem.credentials')) {
    this.apiSystem.credentials = encryptCredentials(this.apiSystem.credentials);
  }
  next();
});

// Desencriptar al obtener (solo para uso interno)
tourOperatorSchema.methods.getDecryptedCredentials = function() {
  return decryptCredentials(this.apiSystem.credentials);
};
```

### Enmascaramiento

Cuando los usuarios consultan credenciales, se retornan **enmascaradas**:

```javascript
// Credencial original
password: "MySecurePassword123"

// Credencial enmascarada en respuesta API
password: "MyS*****123"
```

### Auditoría

Todos los cambios de credenciales se registran:

```javascript
{
  action: 'credentials_updated',
  userId: '507f1f77bcf86cd799439011',
  timestamp: '2024-01-15T10:30:00Z',
  changes: {
    credentialsUpdated: true,
    updatedBy: 'operator_admin'
  },
  userAgent: 'Mozilla/5.0...',
  ip: '192.168.1.100'
}
```

---

## Preguntas Frecuentes

### 1. ¿Cómo crear un usuario Operator Admin?

```javascript
// Crear usuario con role operator_admin
const User = require('./models/User');

const operatorAdminUser = new User({
  email: 'admin@euroriente.com',
  password: await hashPassword('secure_password'),
  firstName: 'Juan',
  lastName: 'García',
  role: 'operator_admin',
  organization: euroOrienteOperatorId, // Asociar al operador
});

await operatorAdminUser.save();
```

### 2. ¿Un operador puede tener múltiples admins?

**Sí**, múltiples usuarios pueden tener el role `operator_admin` con el mismo `organization`:

```javascript
const admin1 = { role: 'operator_admin', organization: euroOrienteId };
const admin2 = { role: 'operator_admin', organization: euroOrienteId };
const admin3 = { role: 'operator_admin', organization: euroOrienteId };
// Todos pueden gestionar las credenciales de Euroriente
```

### 3. ¿Qué pasa si un operator_admin intenta ver credenciales de otro operador?

El middleware `checkCredentialsAccess` retorna **403 Forbidden**:

```json
{
  "success": false,
  "error": "Solo puede acceder a las credenciales de su operador",
  "code": "CREDENTIALS_OWNERSHIP_DENIED"
}
```

### 4. ¿Puede un system_admin ver credenciales sin encriptar?

Sí, pero debe usar el método interno:

```javascript
// Para system_admin con acceso directo a la base de datos
const operator = await TourOperator.findById(operatorId);
const decryptedCredentials = operator.getDecryptedCredentials();
```

Por seguridad, las rutas API siempre retornan credenciales enmascaradas.

### 5. ¿Cómo cambiar el rol de un usuario?

```javascript
const user = await User.findById(userId);
user.role = 'operator_admin';
user.organization = operatorId;
await user.save();
```

### 6. ¿Puede un operator_admin activar/desactivar su integración?

**Sí**, los operator_admin tienen permiso de activar/desactivar:

```javascript
// Operator admin puede activar su integración
POST /api/admin/tour-operators/{ownOperatorId}/activate

// Y desactivar
POST /api/admin/tour-operators/{ownOperatorId}/deactivate
```

### 7. ¿Qué validaciones se hacen antes de activar?

```javascript
// 1. Debe estar configurado
if (!operator.integrationStatus.isConfigured) {
  return 400; // Debe configurar credenciales primero
}

// 2. Debe pasar el ownership check
if (user.role === 'operator_admin' && user.organization !== operatorId) {
  return 403; // No puede activar operador de otro
}

// 3. Test de conexión opcional pero recomendado
const testResult = await adapter.healthCheck(operatorId);
if (testResult.status !== 'healthy') {
  // Advertencia pero puede continuar
}
```

---

## Diagrama de Flujo de Permisos

```
┌─────────────────────────────────────────────────┐
│           Usuario hace Request                  │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│       authMiddleware: Verifica JWT Token        │
│       Extrae: user.id, user.role,               │
│                user.organization                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│    requirePermission: Verifica si el rol        │
│    tiene el permiso requerido                   │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
    ✅ Tiene           ❌ No tiene
        │                   │
        │                   ▼
        │         ┌──────────────────┐
        │         │  Return 403       │
        │         │  Forbidden        │
        │         └──────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────┐
│  checkOperatorOwnership: Si no es system_admin, │
│  verifica que user.organization === operatorId   │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
    ✅ Es dueño        ❌ No es dueño
        │                   │
        │                   ▼
        │         ┌──────────────────┐
        │         │  Return 403       │
        │         │  Access Denied    │
        │         └──────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────┐
│         Ejecutar Operación Solicitada           │
│         (Actualizar credenciales, etc.)         │
└─────────────────────────────────────────────────┘
```

---

## Resumen Final

### ✅ Respuesta Directa a tu Pregunta

**"¿Las credenciales se pueden configurar desde el panel del administrador o del admin del tour operador según permisos?"**

**SÍ, implementado completamente:**

| Tipo de Usuario | Puede Configurar Credenciales | Alcance |
|----------------|-------------------------------|---------|
| **System Administrator** | ✅ SÍ | **Todos los operadores** |
| **Operator Administrator** | ✅ SÍ | **Solo su operador** |
| **Operator User** | ❌ No | Solo lectura |
| **Agent** | ❌ No | Sin acceso |
| **Customer** | ❌ No | Sin acceso |

### 🔐 Seguridad Garantizada

- ✅ Credenciales encriptadas en base de datos (AES-256)
- ✅ Credenciales enmascaradas en respuestas API
- ✅ Validación de propiedad automática
- ✅ Auditoría completa de cambios
- ✅ Tokens JWT con expiración

### 📊 Endpoints Clave

```
PUT  /api/admin/tour-operators/:id/credentials     # Actualizar credenciales
GET  /api/admin/tour-operators/:id/credentials     # Ver credenciales (enmascaradas)
POST /api/admin/tour-operators/:id/test            # Probar conexión
POST /api/admin/tour-operators/:id/activate        # Activar integración
POST /api/admin/tour-operators/:id/deactivate      # Desactivar integración
```

Todos con validación automática de permisos y propiedad.

---

## Soporte

Para más información, consultar:
- `backend/middleware/permissions.js` - Definiciones de permisos
- `backend/models/User.js` - Modelo de usuario con roles
- `backend/routes/admin/tour-operators.routes.js` - Rutas con permisos aplicados
- `GUIA_RAPIDA_B2B_INTEGRATION.md` - Guía de integración B2B
