# RBAC Quick Reference Guide
## Tour Operator Management Permissions

### 🎯 Quick Answer to Your Question

**"¿Las credenciales de Juniper y otros se pueden configurar desde el panel de control del administrador o el panel de control del admin del tour operador receptivo/masivo según los permisos que tiene?"**

**✅ SÍ - Implementado completamente:**

| Usuario | Puede Configurar Credenciales | Alcance |
|---------|-------------------------------|---------|
| **System Admin** | ✅ SÍ | **TODOS** los operadores |
| **Operator Admin** | ✅ SÍ | **SOLO su operador** |
| **Otros roles** | ❌ NO | Sin acceso |

---

## 🔐 Roles Definidos

```javascript
// backend/middleware/permissions.js

const ROLES = {
  SYSTEM_ADMIN: 'system_admin',      // Acceso total
  OPERATOR_ADMIN: 'operator_admin',  // Gestiona su operador
  OPERATOR_USER: 'operator_user',    // Solo lectura
  AGENT: 'agent',                    // Búsqueda y reserva
  CUSTOMER: 'customer',              // Sin acceso B2B
};
```

---

## 📋 Permisos Clave

### Credenciales
```javascript
CREDENTIALS_UPDATE_ALL: 'credentials:update:all'    // System Admin
CREDENTIALS_UPDATE_OWN: 'credentials:update:own'    // Operator Admin
CREDENTIALS_VIEW_ALL: 'credentials:view:all'        // System Admin
CREDENTIALS_VIEW_OWN: 'credentials:view:own'        // Operator Admin + User
```

### Tour Operators
```javascript
TOUR_OPERATORS_CREATE: 'tour_operators:create'           // System Admin
TOUR_OPERATORS_READ_ALL: 'tour_operators:read:all'       // System Admin
TOUR_OPERATORS_READ_OWN: 'tour_operators:read:own'       // Operator Admin + User
TOUR_OPERATORS_UPDATE_ALL: 'tour_operators:update:all'   // System Admin
TOUR_OPERATORS_UPDATE_OWN: 'tour_operators:update:own'   // Operator Admin
TOUR_OPERATORS_ACTIVATE: 'tour_operators:activate'       // System/Operator Admin
```

---

## 🚀 Uso en Rutas

### Aplicar Autenticación
```javascript
const authMiddleware = require('../../middleware/auth');
const { requirePermission, checkOperatorOwnership } = require('../../middleware/permissions');

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);
```

### Endpoint con Permisos
```javascript
router.put('/:id/credentials', 
  // Requiere uno de estos permisos
  requirePermission(
    PERMISSIONS.CREDENTIALS_UPDATE_ALL,  // System admin
    PERMISSIONS.CREDENTIALS_UPDATE_OWN   // Operator admin
  ),
  // Valida ownership (operator admin solo su operador)
  checkCredentialsAccess('update'),
  async (req, res) => {
    // Lógica del endpoint
  }
);
```

---

## 🔧 Middleware Disponibles

### 1. requireAuth
```javascript
router.get('/protected', requireAuth, (req, res) => {
  // Usuario autenticado en req.user
});
```

### 2. requireRole
```javascript
router.post('/admin-only', requireRole(ROLES.SYSTEM_ADMIN), (req, res) => {
  // Solo system_admin
});
```

### 3. requirePermission
```javascript
router.put('/update', 
  requirePermission(
    PERMISSIONS.TOUR_OPERATORS_UPDATE_ALL,
    PERMISSIONS.TOUR_OPERATORS_UPDATE_OWN
  ), 
  (req, res) => {
    // Usuario con cualquiera de los permisos
  }
);
```

### 4. checkOperatorOwnership
```javascript
router.get('/:id', 
  requirePermission(PERMISSIONS.TOUR_OPERATORS_READ_OWN),
  checkOperatorOwnership,  // Valida que user.organization === params.id
  (req, res) => {
    // Solo accede si es su operador (o system admin)
  }
);
```

### 5. checkCredentialsAccess
```javascript
router.put('/:id/credentials',
  requirePermission(PERMISSIONS.CREDENTIALS_UPDATE_OWN),
  checkCredentialsAccess('update'),  // 'update' o 'view'
  (req, res) => {
    // Actualizar credenciales
  }
);
```

---

## 💻 Ejemplos de Código

### Crear Usuario System Admin
```javascript
const User = require('./models/User');

const systemAdmin = new User({
  email: 'admin@spirittours.us',
  password: await bcrypt.hash('secure_password', 10),
  firstName: 'Admin',
  lastName: 'System',
  role: 'system_admin',
  organization: null,  // Sin organización
});

await systemAdmin.save();
```

### Crear Usuario Operator Admin
```javascript
// 1. Obtener ID del operador
const operator = await TourOperator.findOne({ code: 'EURORIENTE' });

// 2. Crear usuario asociado
const operatorAdmin = new User({
  email: 'admin@euroriente.com',
  password: await bcrypt.hash('secure_password', 10),
  firstName: 'Juan',
  lastName: 'García',
  role: 'operator_admin',
  organization: operator._id,  // Asociar al operador
});

await operatorAdmin.save();
```

### Verificar Permisos en Código
```javascript
const { hasPermission } = require('./middleware/permissions');

if (hasPermission(req.user, PERMISSIONS.CREDENTIALS_UPDATE_OWN)) {
  // Usuario puede actualizar credenciales
}

// O usar método del modelo
if (req.user.canManageOperator(operatorId)) {
  // Usuario puede gestionar este operador
}
```

### Filtrar Operadores por Usuario
```javascript
const { buildOperatorAccessFilter } = require('./middleware/permissions');

// Base filter
let filter = { status: 'active' };

// Aplicar filtro de acceso según rol
filter = buildOperatorAccessFilter(req.user, filter);

// System admin: ve todos
// Operator admin: ve solo el suyo
const operators = await TourOperator.find(filter);
```

---

## 🔗 Endpoints de Credenciales

### Ver Credenciales (enmascaradas)
```http
GET /api/admin/tour-operators/:id/credentials
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "operatorId": "...",
    "operatorName": "Euroriente",
    "apiSystem": {
      "type": "ejuniper",
      "credentials": {
        "username": "eur*****ser",
        "password": "***",
        "agencyCode": "AGE***123"
      }
    }
  }
}
```

### Actualizar Credenciales
```http
PUT /api/admin/tour-operators/:id/credentials
Authorization: Bearer {token}
Content-Type: application/json

{
  "apiSystem": {
    "credentials": {
      "username": "nuevo_usuario",
      "password": "nuevo_password",
      "agencyCode": "NUEVA_AGENCIA"
    },
    "endpoints": {
      "wsdl": "https://xml-uat.bookingengine.es/WebService/JP/WebServiceJP.asmx?WSDL",
      "production": "https://xml.bookingengine.es",
      "sandbox": "https://xml-uat.bookingengine.es"
    },
    "config": {
      "environment": "sandbox",
      "timeout": 30000
    }
  }
}

Response:
{
  "success": true,
  "message": "Credenciales actualizadas exitosamente",
  "data": { ... }
}
```

---

## 🧪 Testing con Roles

### Test 1: System Admin ve todos los operadores
```javascript
const response = await axios.get('/api/admin/tour-operators', {
  headers: { Authorization: `Bearer ${systemAdminToken}` }
});

expect(response.data.data).toHaveLength(5);  // Todos los operadores
```

### Test 2: Operator Admin ve solo el suyo
```javascript
const response = await axios.get('/api/admin/tour-operators', {
  headers: { Authorization: `Bearer ${operatorAdminToken}` }
});

expect(response.data.data).toHaveLength(1);  // Solo su operador
expect(response.data.data[0].code).toBe('EURORIENTE');
```

### Test 3: Operator Admin no puede acceder a otro operador
```javascript
const otherOperatorId = '507f1f77bcf86cd799439099';

await expect(
  axios.get(`/api/admin/tour-operators/${otherOperatorId}`, {
    headers: { Authorization: `Bearer ${operatorAdminToken}` }
  })
).rejects.toThrow();  // 403 Forbidden
```

### Test 4: Operator Admin puede actualizar sus credenciales
```javascript
const response = await axios.put(
  `/api/admin/tour-operators/${ownOperatorId}/credentials`,
  {
    apiSystem: {
      credentials: {
        username: 'new_user',
        password: 'new_pass'
      }
    }
  },
  { headers: { Authorization: `Bearer ${operatorAdminToken}` }}
);

expect(response.data.success).toBe(true);
```

---

## 🔒 Validación de Ownership

El middleware `checkOperatorOwnership` valida automáticamente:

```javascript
// System Admin: SIEMPRE permitido
if (req.user.role === 'system_admin') {
  return next();
}

// Operator Admin: Solo su operador
if (req.user.role === 'operator_admin') {
  const userOrgId = req.user.organization.toString();
  const requestedOpId = req.params.id.toString();
  
  if (userOrgId === requestedOpId) {
    return next();  // ✅ Permitido
  } else {
    return res.status(403).json({
      error: 'No tiene permisos para acceder a este operador',
      code: 'OPERATOR_ACCESS_DENIED'
    });
  }
}
```

---

## 📝 User Model Extensions

```javascript
// backend/models/User.js

// Nuevos campos añadidos
role: {
  type: String,
  enum: ['system_admin', 'operator_admin', 'operator_user', 'agent', 'customer'],
  default: 'customer',
},

organization: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'TourOperator',
},

permissions: [String],  // Permisos custom adicionales

// Métodos añadidos
user.hasRole('system_admin')
user.hasAnyRole(['system_admin', 'operator_admin'])
user.hasPermission('credentials:update:own')
user.isSystemAdmin()
user.isOperatorAdmin()
user.canManageOperator(operatorId)
```

---

## 🎯 Matriz Rápida de Permisos

| Acción | System Admin | Operator Admin | Operator User | Agent | Customer |
|--------|:------------:|:--------------:|:-------------:|:-----:|:--------:|
| **Ver todos los operadores** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ver su operador** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Crear operador** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Actualizar su operador** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Eliminar operador** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ver sus credenciales** | ✅ | ✅ (masked) | ✅ (masked) | ❌ | ❌ |
| **Actualizar sus credenciales** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Activar su integración** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Test de conexión** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Buscar disponibilidad** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Crear reserva** | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## 📚 Archivos Clave

```
backend/
├── middleware/
│   ├── auth.js                          # JWT authentication
│   └── permissions.js                   # RBAC middleware (NUEVO)
├── models/
│   ├── User.js                          # User model (ACTUALIZADO)
│   └── TourOperator.js                  # Tour operator model
└── routes/
    └── admin/
        └── tour-operators.routes.js     # Routes with permissions (ACTUALIZADO)

ROLE_BASED_PERMISSIONS.md                # Documentación completa
RBAC_QUICK_REFERENCE.md                  # Esta guía rápida
```

---

## 🚦 Estado de Implementación

### ✅ Completado
- [x] Middleware de permisos (`permissions.js`)
- [x] 5 roles definidos
- [x] Permisos granulares por operación
- [x] Validación de ownership automática
- [x] Extensión del modelo User
- [x] Aplicación de permisos en rutas
- [x] Endpoints de credenciales
- [x] Documentación completa

### ⏳ Pendiente
- [ ] Frontend admin panel
- [ ] Tests automatizados
- [ ] Integración con AI agents

---

## 💡 Tips

1. **Crear usuarios con rol correcto**
   ```javascript
   user.role = 'operator_admin';
   user.organization = operatorId;
   ```

2. **Verificar permisos en frontend antes de mostrar opciones**
   ```javascript
   if (currentUser.role === 'system_admin' || currentUser.role === 'operator_admin') {
     // Mostrar botón "Configurar Credenciales"
   }
   ```

3. **Siempre usar middleware de permisos en rutas sensibles**
   ```javascript
   router.put('/:id/credentials',
     requirePermission(PERMISSIONS.CREDENTIALS_UPDATE_OWN),
     checkCredentialsAccess('update'),
     handler
   );
   ```

4. **Enmascarar credenciales en logs y respuestas**
   ```javascript
   const response = operator.toObject();
   delete response.apiSystem.credentials;  // Nunca enviar sin procesar
   ```

---

## 🆘 Resolución de Problemas

### Error: "No tiene permisos suficientes"
**Causa**: Usuario no tiene el permiso requerido
**Solución**: Verificar `user.role` y `ROLE_PERMISSIONS` en `permissions.js`

### Error: "OPERATOR_ACCESS_DENIED"
**Causa**: Operator admin intenta acceder a operador que no le pertenece
**Solución**: Verificar que `user.organization === operatorId`

### Error: "CREDENTIALS_OWNERSHIP_DENIED"
**Causa**: Usuario intenta ver/modificar credenciales de otro operador
**Solución**: Solo system_admin puede ver todas las credenciales

### Error: "AUTH_REQUIRED"
**Causa**: Token JWT no proporcionado o inválido
**Solución**: Incluir header `Authorization: Bearer {token}`

---

## 📞 Soporte

Para más detalles, consultar:
- **Documentación completa**: `ROLE_BASED_PERMISSIONS.md`
- **Código fuente**: `backend/middleware/permissions.js`
- **Rutas**: `backend/routes/admin/tour-operators.routes.js`
