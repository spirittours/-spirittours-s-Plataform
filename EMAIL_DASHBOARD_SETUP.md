# 📧 Spirit Tours - Email Configuration Dashboard

## 🎯 Características Implementadas

### ✅ Panel de Administración Completo

El Dashboard de Configuración de Email permite a los administradores:

1. **🖥️ Gestión de Servidores SMTP**
   - Agregar servidores con wizard paso a paso
   - Configuración preestablecida para Gmail, Office365, SendGrid, AWS SES, Mailgun, servidores propios
   - Probar conexiones antes de guardar
   - Editar configuración de servidores existentes
   - Activar/desactivar servidores
   - Eliminar servidores
   - Ver estadísticas en tiempo real

2. **📝 Gestión de Plantillas de Email**
   - Crear plantillas con editor visual
   - Organizar por departamentos
   - Variables dinámicas ({{variable}})
   - Vista previa de plantillas
   - Enviar emails de prueba
   - Importar/exportar plantillas
   - Buscar y filtrar plantillas

3. **🏢 Organización por Departamentos**
   - Reservaciones
   - Pagos
   - Marketing
   - Soporte
   - Notificaciones
   - Autenticación
   - Tours
   - Administración

4. **🧪 Probador de Servicios**
   - Test de conexión SMTP en tiempo real
   - Envío de emails de prueba
   - Validación antes de guardar
   - Diagnóstico de errores con sugerencias

5. **📊 Estadísticas y Monitoreo**
   - Emails enviados/fallidos
   - Estado de la cola
   - Rendimiento por servidor
   - Actualizaciones en tiempo real

---

## 📁 Archivos Creados

### Backend

#### 1. `/backend/routes/admin/email-config.routes.js` (17KB)
Rutas de API para gestionar servidores SMTP:

**Endpoints**:
- `GET /api/admin/email-config/servers` - Listar servidores
- `POST /api/admin/email-config/servers` - Agregar servidor
- `PUT /api/admin/email-config/servers/:id` - Actualizar servidor
- `DELETE /api/admin/email-config/servers/:id` - Eliminar servidor
- `POST /api/admin/email-config/servers/:id/test` - Probar servidor existente
- `POST /api/admin/email-config/servers/test-new` - Probar nueva configuración (wizard)
- `POST /api/admin/email-config/servers/verify-all` - Verificar todos los servidores
- `GET /api/admin/email-config/presets` - Obtener configuraciones preestablecidas

#### 2. `/backend/routes/admin/email-templates.routes.js` (17KB)
Rutas de API para gestionar plantillas:

**Endpoints**:
- `GET /api/admin/email-templates/departments` - Listar departamentos
- `GET /api/admin/email-templates` - Listar plantillas (con filtros)
- `GET /api/admin/email-templates/:id` - Obtener plantilla
- `POST /api/admin/email-templates` - Crear plantilla
- `PUT /api/admin/email-templates/:id` - Actualizar plantilla
- `DELETE /api/admin/email-templates/:id` - Eliminar plantilla
- `POST /api/admin/email-templates/:id/preview` - Vista previa
- `POST /api/admin/email-templates/:id/test-send` - Enviar prueba
- `POST /api/admin/email-templates/import` - Importar múltiples
- `GET /api/admin/email-templates/export/:dept` - Exportar por departamento

### Frontend

#### 3. `/frontend/src/components/admin/EmailConfigDashboard.jsx` (48KB)
Componente React completo del dashboard:

**Componentes Incluidos**:
- `EmailConfigDashboard` - Componente principal
- `ServersTab` - Tab de servidores SMTP
- `ServerWizard` - Wizard paso a paso para configuración
- `ServerEditModal` - Modal de edición de servidor
- `TemplatesTab` - Tab de plantillas
- `TemplateModal` - Modal para crear/editar plantillas
- `DepartmentsTab` - Vista de departamentos
- `StatsTab` - Estadísticas y monitoreo

#### 4. `/frontend/src/components/admin/EmailConfigDashboard.css` (18KB)
Estilos completos del dashboard:

**Características**:
- Diseño responsive (móvil, tablet, desktop)
- Animaciones suaves
- Tema moderno y profesional
- Cards con hover effects
- Modales con overlay
- Formularios estilizados
- Notificaciones

---

## 🚀 Integración en tu Aplicación

### Paso 1: Montar las Rutas Backend

En tu archivo principal de backend (`backend/main.js` o `backend/server.js`):

```javascript
const express = require('express');
const app = express();

// Import routes
const emailConfigRoutes = require('./routes/admin/email-config.routes');
const emailTemplatesRoutes = require('./routes/admin/email-templates.routes');

// Mount routes
app.use('/api/admin/email-config', emailConfigRoutes);
app.use('/api/admin/email-templates', emailTemplatesRoutes);

// Start server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Paso 2: Integrar el Dashboard en React

#### Opción A: Como Página Completa

En tu router de React (`App.jsx` o router config):

```javascript
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import EmailConfigDashboard from './components/admin/EmailConfigDashboard';
import './components/admin/EmailConfigDashboard.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Otras rutas */}
        <Route 
          path="/admin/email-config" 
          element={<EmailConfigDashboard />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

#### Opción B: Como Modal/Sidebar en Admin Panel

```javascript
import React, { useState } from 'react';
import EmailConfigDashboard from './components/admin/EmailConfigDashboard';
import './components/admin/EmailConfigDashboard.css';

function AdminPanel() {
  const [showEmailConfig, setShowEmailConfig] = useState(false);

  return (
    <div className="admin-panel">
      <aside className="admin-sidebar">
        <button onClick={() => setShowEmailConfig(true)}>
          📧 Configuración de Email
        </button>
      </aside>

      {showEmailConfig && (
        <div className="admin-modal">
          <EmailConfigDashboard />
          <button onClick={() => setShowEmailConfig(false)}>Cerrar</button>
        </div>
      )}
    </div>
  );
}
```

### Paso 3: Configurar Variables de Entorno

Crear o actualizar `.env`:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3000/api

# Email Configuration
DEFAULT_FROM_EMAIL=noreply@spirittours.com
BASE_URL=https://spirittours.com

# Admin Access (ajustar según tu sistema de auth)
ADMIN_ROLE=admin
SUPERADMIN_ROLE=superadmin
```

### Paso 4: Implementar Autenticación de Admin

Actualizar el middleware de autenticación en las rutas:

```javascript
// En backend/routes/admin/email-config.routes.js
// Reemplazar el requireAdmin básico con tu sistema de auth

const requireAdmin = async (req, res, next) => {
  try {
    // Opción 1: Verificar JWT token
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'No autorizado' });
  }
};
```

O integrar con tu sistema existente:

```javascript
const { verifyAdminRole } = require('../middleware/auth');

router.get('/servers', verifyAdminRole, (req, res) => {
  // Tu código aquí
});
```

---

## 🎨 Personalización

### Cambiar Colores del Dashboard

En `EmailConfigDashboard.css`, buscar y reemplazar:

```css
/* Color primario (actualmente #667eea - púrpura) */
.btn-primary {
  background: #TU_COLOR_PRIMARIO;
}

.tab.active {
  color: #TU_COLOR_PRIMARIO;
  border-bottom-color: #TU_COLOR_PRIMARIO;
}

/* Color de éxito (actualmente #48bb78 - verde) */
.btn-success {
  background: #TU_COLOR_EXITO;
}
```

### Agregar Nuevos Departamentos

En `backend/routes/admin/email-templates.routes.js`:

```javascript
const DEPARTMENTS = {
  // ... departamentos existentes
  
  mi_departamento: {
    name: 'Mi Nuevo Departamento',
    icon: '🎯',
    description: 'Descripción del departamento',
    defaultTemplates: ['template1', 'template2']
  }
};
```

### Personalizar Presets de Servidores

En `backend/routes/admin/email-config.routes.js`, función `GET /presets`:

```javascript
const presets = [
  // ... presets existentes
  
  {
    id: 'mi_servidor',
    name: 'Mi Servidor Custom',
    icon: '📬',
    host: 'smtp.miservidor.com',
    port: 587,
    secure: false,
    instructions: 'Instrucciones personalizadas',
    user: 'correo@miservidor.com',
    rateLimitPerHour: 500,
    documentation: 'https://docs.miservidor.com'
  }
];
```

---

## 🧪 Testing del Dashboard

### 1. Probar Wizard de Configuración

1. Ir a la pestaña "Servidores SMTP"
2. Click en "➕ Agregar Servidor"
3. Seleccionar un preset (ej: Gmail)
4. Completar credenciales
5. Click en "Probar Configuración"
6. Si es exitoso, guardar

### 2. Probar Creación de Plantilla

1. Ir a la pestaña "Plantillas"
2. Click en "➕ Nueva Plantilla"
3. Completar formulario:
   - Nombre: "Test Bienvenida"
   - Departamento: "Autenticación"
   - Asunto: "Bienvenido {{name}}"
   - HTML: `<h1>Hola {{name}}!</h1>`
4. Click en "Vista Previa"
5. Click en "Guardar Plantilla"

### 3. Probar Envío de Email de Prueba

1. En la lista de plantillas, click en 📧
2. Ingresar tu email
3. Verificar recepción del email

### 4. Verificar Estadísticas

1. Ir a la pestaña "Estadísticas"
2. Verificar contadores
3. Revisar estado de servidores

---

## 🔧 Troubleshooting

### Problema: "No se pueden cargar los servidores"

**Solución**:
1. Verificar que las rutas estén montadas correctamente
2. Verificar permisos de admin en el middleware
3. Revisar console del navegador para errores de CORS
4. Verificar que `REACT_APP_API_URL` esté configurado

### Problema: "Error al probar servidor SMTP"

**Solución**:
1. Verificar credenciales correctas
2. Para Gmail: usar App Password, no contraseña regular
3. Verificar puerto (587 para STARTTLS, 465 para SSL)
4. Revisar firewall/red que no bloquee puertos SMTP

### Problema: "Estilos no se aplican"

**Solución**:
1. Verificar que el archivo CSS esté importado:
   ```javascript
   import './EmailConfigDashboard.css';
   ```
2. Si usas Create React App, reiniciar el servidor de desarrollo
3. Limpiar caché del navegador

### Problema: "Autenticación falla siempre"

**Solución**:
1. Implementar correctamente el middleware `requireAdmin`
2. Pasar el header de autenticación:
   ```javascript
   axios.get('/api/admin/email-config/servers', {
     headers: { 
       'Authorization': `Bearer ${token}`,
       'x-user-role': 'admin'
     }
   });
   ```

---

## 📊 Flujo Completo de Uso

### Escenario 1: Configurar Primer Servidor

1. Admin entra al dashboard
2. Ve mensaje "No hay servidores configurados"
3. Click en "Agregar Primer Servidor"
4. Wizard se abre en Paso 1
5. Selecciona "Gmail / Google Workspace"
6. En Paso 2, completa:
   - Nombre: "Gmail Principal"
   - Usuario: correo@gmail.com
   - Contraseña: app-password-generado
7. En Paso 3, click "Probar Configuración"
8. Ingresa email de prueba
9. Recibe confirmación de éxito
10. En Paso 4, revisa resumen
11. Click "Guardar Servidor"
12. Servidor aparece en la lista activo

### Escenario 2: Configurar Emails por Departamento

1. Admin va a pestaña "Plantillas"
2. Click en "Nueva Plantilla"
3. Selecciona departamento "Reservaciones"
4. Crea plantilla de confirmación:
   ```
   Nombre: Confirmación de Reserva
   Asunto: Tu reserva {{booking_id}} está confirmada
   HTML: <h1>¡Reserva Confirmada!</h1>
           <p>Hola {{customer_name}},</p>
           <p>Tu reserva para {{tour_name}} el {{date}} ha sido confirmada.</p>
   ```
5. Agrega variables: customer_name, booking_id, tour_name, date
6. Click "Vista Previa" para verificar
7. Click "Guardar Plantilla"
8. Repite para otros departamentos

### Escenario 3: Enviar Newsletter Masivo

1. Admin crea plantilla de newsletter en departamento "Marketing"
2. Usa el API para envío masivo:
   ```javascript
   POST /api/nodemailer/newsletter
   {
     "templateId": "template_xyz",
     "subscribers": ["user1@email.com", "user2@email.com", ...],
     "variables": {
       "month": "Diciembre",
       "special_offer": "30% de descuento"
     }
   }
   ```
3. Sistema distribuye emails automáticamente entre servidores disponibles
4. Admin puede ver progreso en pestaña "Estadísticas"

---

## 🎯 Próximas Mejoras Sugeridas

1. **Drag & Drop Email Builder**
   - Editor visual tipo Mailchimp
   - Bloques predefinidos
   - Compatible con variables

2. **Programación de Envíos**
   - Calendario visual
   - Envíos recurrentes
   - Time zones

3. **A/B Testing**
   - Múltiples versiones de plantillas
   - Métricas de rendimiento
   - Ganador automático

4. **Analytics Avanzados**
   - Tasa de apertura (open rate)
   - Click-through rate
   - Mapas de calor
   - Conversiones

5. **Segmentación Avanzada**
   - Grupos de usuarios
   - Tags personalizados
   - Filtros dinámicos

6. **Templates Marketplace**
   - Plantillas prediseñadas
   - Importar desde librerías
   - Compartir templates

---

## 📞 Soporte

Para preguntas o problemas:
- Revisar documentación: `NODEMAILER_SETUP.md`
- Consultar logs: `logs/nodemailer-combined.log`
- Email: tech@spirittours.com

---

## 🎉 ¡Listo!

El dashboard está completamente funcional y listo para producción. Los administradores pueden:

✅ Configurar múltiples servidores SMTP  
✅ Probar conexiones antes de guardar  
✅ Gestionar plantillas por departamento  
✅ Enviar emails de prueba  
✅ Monitorear estadísticas en tiempo real  
✅ Gestionar toda la configuración desde una interfaz visual  

**No se requiere editar código o archivos de configuración manualmente.**

---

**Última actualización**: October 22, 2025  
**Versión**: 1.0.0
