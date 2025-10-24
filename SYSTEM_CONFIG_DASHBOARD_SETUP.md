# Spirit Tours - Sistema de Configuración Centralizado

## 📋 Descripción General

El **Sistema de Configuración Centralizado** permite a los administradores y superadministradores gestionar TODAS las configuraciones del sistema desde un dashboard unificado, incluyendo:

- 🗄️ **Base de Datos**: PostgreSQL, Redis, MongoDB
- 📧 **Email**: SMTP, SendGrid, configuración de múltiples servidores
- 💳 **Pagos**: Stripe, PayPal, MercadoPago
- 🔐 **Autenticación**: JWT, Google OAuth, Facebook OAuth
- 📦 **Almacenamiento**: AWS S3, configuración de archivos
- 📊 **Monitoreo**: Logging, Sentry, Prometheus
- 🛡️ **Seguridad**: Rate limiting, CORS, políticas de seguridad
- 🔌 **Integraciones**: Google Analytics, APIs de redes sociales
- 🎯 **Features**: Feature flags para habilitar/deshabilitar funcionalidades

## ✨ Características Principales

### 1. **Dashboard Unificado**
- Vista general de todas las categorías de configuración
- Indicadores de progreso por categoría
- Estadísticas del sistema en tiempo real

### 2. **Configuración por Categorías**
- 9 categorías organizadas
- 70+ campos de configuración
- Agrupación inteligente de campos relacionados

### 3. **Pruebas en Tiempo Real**
- Probar conexiones antes de guardar
- Validación de configuraciones
- Feedback inmediato de errores

### 4. **Asistente de Configuración (Wizard)**
- Guía paso a paso para configuración inicial
- Pruebas automáticas en cada paso
- Configuración completa del sistema de forma fácil

### 5. **Seguridad**
- Encriptación AES-256-GCM para valores sensibles
- Control de acceso basado en roles (RBAC)
- Audit trail completo de cambios

### 6. **Gestión de Cambios**
- Historial de modificaciones
- Rollback a versiones anteriores
- Tracking de quién hizo cada cambio

### 7. **Import/Export**
- Exportar configuraciones para backup
- Importar configuraciones desde archivo
- Migración entre ambientes

## 🏗️ Arquitectura

```
Sistema de Configuración Centralizado
├── Backend
│   ├── services/
│   │   └── config_manager.js          # Gestor de configuración
│   ├── routes/admin/
│   │   └── system-config.routes.js    # API REST endpoints
│   ├── migrations/
│   │   └── create_system_configurations_table.sql  # Schema DB
│   └── server.js                       # Servidor Node.js
│
└── Frontend
    └── src/components/admin/
        ├── SystemConfigDashboard.jsx   # Dashboard principal
        └── SystemConfigDashboard.css   # Estilos
```

## 📦 Archivos Creados

### Backend

1. **`backend/services/config_manager.js`** (25KB)
   - Clase ConfigurationManager
   - Gestión de 9 categorías
   - 70+ campos de configuración
   - Encriptación/desencriptación
   - Validación de valores
   - Testing de conexiones
   - Import/export

2. **`backend/routes/admin/system-config.routes.js`** (12KB)
   - 15+ endpoints REST
   - CRUD completo de configuraciones
   - Testing de conexiones
   - Import/export
   - Validación
   - Rollback

3. **`backend/migrations/create_system_configurations_table.sql`** (6KB)
   - Tabla system_configurations
   - Tabla configuration_history (audit trail)
   - Tabla configuration_categories
   - Índices y triggers
   - Funciones PostgreSQL

4. **`backend/server.js`** (4.5KB)
   - Servidor Express.js
   - Registro de rutas
   - Inicialización de config manager
   - Manejo de errores

### Frontend

5. **`frontend/src/components/admin/SystemConfigDashboard.jsx`** (21KB)
   - Dashboard principal
   - Vista general de categorías
   - Editor de configuraciones
   - Asistente de configuración
   - Tab de auditoría
   - Tab de validación
   - Import/export UI

6. **`frontend/src/components/admin/SystemConfigDashboard.css`** (13KB)
   - Estilos completos
   - Diseño responsive
   - Animaciones
   - Tema consistente

## 🚀 Instalación y Configuración

### Paso 1: Configurar Variables de Entorno

Editar `.env` y agregar:

```bash
# Configuration Manager Encryption Key (32 bytes hex)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CONFIG_ENCRYPTION_KEY=your-encryption-key-32-bytes-hex-format-change-this

# Node.js Backend Server
NODE_PORT=5001
NODE_API_URL=http://localhost:5001
```

**Generar clave de encriptación:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Paso 2: Ejecutar Migraciones de Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres -d spirit_tours

# Ejecutar script de migración
\i backend/migrations/create_system_configurations_table.sql
```

Esto creará:
- Tabla `system_configurations`
- Tabla `configuration_history`
- Tabla `configuration_categories`
- Índices y triggers automáticos

### Paso 3: Instalar Dependencias de Node.js

```bash
# Instalar dependencias del proyecto
npm install

# Dependencias específicas necesarias:
npm install express cors morgan nodemailer axios pg aws-sdk stripe
```

### Paso 4: Iniciar el Servidor Backend

```bash
# Desarrollo
npm run start:dev

# Producción
npm start

# Con PM2
pm2 start backend/server.js --name spirit-tours-backend
```

El servidor se iniciará en el puerto configurado (default: 5001).

### Paso 5: Verificar la Instalación

**Health Check:**
```bash
curl http://localhost:5001/health
```

**API Info:**
```bash
curl http://localhost:5001/api
```

**Listar categorías:**
```bash
curl http://localhost:5001/api/admin/system-config/categories
```

## 📡 API Endpoints

### Categorías

```http
GET /api/admin/system-config/categories
# Obtener todas las categorías con estadísticas

GET /api/admin/system-config/categories/:category?includeValues=true
# Obtener configuraciones de una categoría específica
```

### Configuraciones

```http
GET /api/admin/system-config/:key
# Obtener una configuración específica

PUT /api/admin/system-config/:key
Body: { "value": "nuevo_valor" }
# Actualizar una configuración

PUT /api/admin/system-config/batch
Body: { "configs": { "KEY1": "value1", "KEY2": "value2" } }
# Actualizar múltiples configuraciones
```

### Testing

```http
POST /api/admin/system-config/test/:category
Body: { "DB_HOST": "localhost", "DB_PORT": 5432, ... }
# Probar conexión de una categoría

POST /api/admin/system-config/test-connection
Body: { "category": "database", "configs": {...} }
# Probar conexión sin guardar

POST /api/admin/system-config/bulk-test
Body: { "tests": [{ "category": "database", "configs": {...} }, ...] }
# Probar múltiples categorías
```

### Gestión de Cambios

```http
POST /api/admin/system-config/rollback/:key
# Revertir configuración a valor anterior

GET /api/admin/system-config/history/:key
# Obtener historial de cambios

GET /api/admin/system-config/stats
# Obtener estadísticas del sistema
```

### Import/Export

```http
GET /api/admin/system-config/export?includeEncrypted=true
# Exportar configuraciones (JSON)

POST /api/admin/system-config/import
Body: { "version": "1.0.0", "configurations": {...} }
# Importar configuraciones desde backup
```

### Validación

```http
GET /api/admin/system-config/validate
# Validar todas las configuraciones requeridas
```

## 🎨 Uso del Dashboard

### 1. Acceder al Dashboard

Navegar a: `http://localhost:3000/admin/system-config`

### 2. Vista General

- Visualizar todas las categorías
- Ver progreso de configuración
- Estadísticas globales del sistema

### 3. Configurar una Categoría

1. Click en una tarjeta de categoría
2. Click en **"✏️ Editar"**
3. Modificar los valores necesarios
4. Click en **"🧪 Probar Conexión"** (opcional)
5. Click en **"💾 Guardar Cambios"**

### 4. Usar el Asistente de Configuración

1. Click en **"🧙‍♂️ Asistente de Configuración"**
2. Seleccionar categorías a configurar
3. Seguir los pasos guiados
4. El sistema probará cada configuración
5. Finalizar y guardar

### 5. Exportar Configuraciones

1. Click en **"💾 Exportar"**
2. Se descargará un archivo JSON
3. Guardar para backup o migración

### 6. Importar Configuraciones

1. Click en **"📥 Importar"**
2. Seleccionar archivo JSON previamente exportado
3. Confirmar importación

## 🔐 Seguridad

### Encriptación

Campos sensibles se encriptan automáticamente:
- Contraseñas de bases de datos
- API keys
- Tokens de OAuth
- Secrets de webhooks
- Claves de acceso AWS

**Algoritmo:** AES-256-GCM

### Control de Acceso

**Roles disponibles:**
- **Admin**: Puede ver y editar configuraciones no sensibles
- **Superadmin**: Acceso completo, incluidas configuraciones encriptadas
- **Usuario Autorizado**: Acceso a categorías específicas

### Audit Trail

Todos los cambios se registran:
- Qué se cambió
- Quién lo cambió
- Cuándo se cambió
- Valor anterior
- IP y User Agent (opcional)

## 🔧 Configuraciones por Categoría

### 1. Base de Datos (database)
- PostgreSQL: host, puerto, nombre DB, usuario, contraseña, pool size
- Redis: host, puerto, contraseña
- MongoDB: URI, opciones de conexión

### 2. Email (email)
- Proveedor: SendGrid, SMTP, Nodemailer
- SendGrid API Key
- SMTP: host, puerto, usuario, contraseña
- Remitente predeterminado

### 3. Pagos (payments)
- **Stripe**: Publishable Key, Secret Key, Webhook Secret
- **PayPal**: Mode, Client ID, Client Secret
- **MercadoPago**: Public Key, Access Token

### 4. Autenticación (authentication)
- **JWT**: Secret Key, Algorithm, Token expiration
- **Google OAuth**: Client ID, Client Secret
- **Facebook OAuth**: App ID, App Secret

### 5. Almacenamiento (storage)
- Tamaño máximo de uploads
- Extensiones permitidas
- **AWS S3**: Access Key ID, Secret Access Key, Bucket, Region

### 6. Monitoreo (monitoring)
- **Logging**: Nivel, tamaño máximo, archivos de backup
- **Sentry**: DSN, Environment
- **Prometheus**: Métricas habilitadas, puerto

### 7. Seguridad (security)
- Bcrypt rounds
- Password mínima longitud
- Máximos intentos de login
- **Rate Limiting**: Requests por minuto/hora
- **CORS**: Origins permitidos, Allowed hosts

### 8. Integraciones (integrations)
- **Google Analytics**: Tracking ID, GTM Container ID
- **Twitter**: API Key, API Secret
- **Instagram**: Client ID, Client Secret

### 9. Features (features)
- WebSocket habilitado
- Email habilitado
- Pagos habilitados
- Multi-idioma
- Modo oscuro
- **Backups**: Habilitados, Intervalo, Retención

## 🧪 Testing de Configuraciones

### Database Testing
Prueba conexión a PostgreSQL y ejecuta query de verificación.

### Email Testing
Prueba conexión SMTP o valida API key de SendGrid.

### Payment Gateway Testing
Valida credenciales de Stripe, PayPal o MercadoPago.

### Storage Testing
Prueba conexión a AWS S3 y lista buckets.

## 📊 Monitoreo y Estadísticas

El dashboard muestra:
- **Porcentaje configurado**: % del sistema configurado
- **Configuraciones totales**: X/Y configuraciones definidas
- **Valores encriptados**: Cantidad de credenciales protegidas
- **Categorías**: Número de categorías del sistema

## 🔄 Workflow de Actualización

### Cambio de Servidor de Email

1. Acceder a categoría **Email**
2. Click en **Editar**
3. Modificar SMTP_HOST, SMTP_PORT, credenciales
4. Click en **Probar Conexión**
5. Si exitoso, **Guardar Cambios**
6. Sistema automáticamente usa nuevas credenciales

### Rotación de API Keys

1. Acceder a categoría correspondiente (Payments, Integrations, etc.)
2. **Editar** campo de API key
3. Ingresar nueva key
4. **Probar** si disponible
5. **Guardar**
6. Sistema registra cambio en audit trail

### Migración de Ambiente

1. **Exportar** configuraciones del ambiente origen
2. En ambiente destino, **Importar** archivo JSON
3. Sistema aplica todas las configuraciones
4. Revisar log de importación
5. **Validar** que todo esté correcto

## ⚠️ Mejores Prácticas

### 1. Backups Regulares
- Exportar configuraciones semanalmente
- Guardar en ubicación segura
- Versionar backups

### 2. Testing Antes de Guardar
- Siempre probar conexiones antes de guardar
- Verificar credenciales en ambiente de test primero

### 3. Documentar Cambios
- Usar campo "change_reason" en cambios críticos
- Mantener log de por qué se hicieron cambios

### 4. Control de Acceso
- Solo superadmins deben tener acceso a configuraciones sensibles
- Revisar permisos regularmente

### 5. Encriptación
- NUNCA almacenar CONFIG_ENCRYPTION_KEY en repositorio
- Usar gestores de secretos en producción (AWS Secrets Manager, HashiCorp Vault)

## 🐛 Troubleshooting

### Error: "Configuration key not found"
**Solución:** La clave no existe en CONFIG_CATEGORIES. Agregar en config_manager.js.

### Error: "Encryption failed"
**Solución:** Verificar que CONFIG_ENCRYPTION_KEY esté configurada correctamente (32 bytes hex).

### Error: "Database connection failed"
**Solución:** 
1. Verificar que PostgreSQL esté corriendo
2. Ejecutar migraciones: `\i backend/migrations/create_system_configurations_table.sql`
3. Verificar permisos de usuario

### Error: "Test failed" al probar configuración
**Solución:** 
1. Verificar que los valores sean correctos
2. Verificar conectividad de red
3. Verificar que el servicio externo esté disponible

### Dashboard no carga categorías
**Solución:**
1. Verificar que backend esté corriendo: `curl http://localhost:5001/health`
2. Verificar CORS configurado correctamente
3. Ver logs del servidor: `pm2 logs spirit-tours-backend`

## 📚 Referencias

### Documentos Relacionados
- `EMAIL_DASHBOARD_SETUP.md` - Configuración de Email Dashboard
- `NODEMAILER_SETUP.md` - Configuración de Nodemailer
- `DEPLOYMENT_GUIDE.md` - Guía de despliegue

### Código Fuente
- ConfigurationManager: `backend/services/config_manager.js`
- API Routes: `backend/routes/admin/system-config.routes.js`
- Dashboard: `frontend/src/components/admin/SystemConfigDashboard.jsx`

## 🤝 Soporte

Para soporte o reportar issues:
- Email: support@spirit-tours.com
- Documentación: [Wiki del proyecto]
- Issues: [GitHub Issues]

---

**Versión:** 1.0.0  
**Última actualización:** Octubre 2025  
**Autor:** Spirit Tours Development Team
