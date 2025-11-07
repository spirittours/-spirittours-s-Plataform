# Email Campaign Dashboard - React Components

## 📦 Componentes Incluidos

Este paquete incluye 5 componentes React para el dashboard completo de gestión de campañas de email:

### 1. **MainDashboard.jsx**
Dashboard principal con navegación lateral y tabs.

**Características:**
- Navegación entre secciones
- App bar con notificaciones
- Vista general del sistema
- Acceso a configuración guiada

**Uso:**
```jsx
import { MainDashboard } from './components/email-campaign-dashboard';

function App() {
  return <MainDashboard />;
}
```

---

### 2. **WizardSetup.jsx**
Asistente de configuración guiada (5 pasos).

**Características:**
- Stepper interactivo
- Recomendaciones automáticas
- Validación de datos
- Confirmación visual

**Uso:**
```jsx
import { WizardSetup } from './components/email-campaign-dashboard';

function SetupPage() {
  const handleComplete = (config) => {
    console.log('Setup completed:', config);
    // Redirect to dashboard
  };

  return <WizardSetup onComplete={handleComplete} />;
}
```

**API:**
- `POST /api/email-config/wizard/start` - Iniciar wizard
- `POST /api/email-config/wizard/complete` - Completar setup

---

### 3. **CostOptimizationDashboard.jsx**
Panel de control de optimización de costos.

**Características:**
- 6 estrategias de optimización
- Monitoreo de presupuesto en tiempo real
- Opciones de ahorro configurables
- Estadísticas de uso

**Uso:**
```jsx
import { CostOptimizationDashboard } from './components/email-campaign-dashboard';

function CostPage() {
  return <CostOptimizationDashboard />;
}
```

**API:**
- `GET /api/email-config/stats` - Obtener estadísticas
- `PUT /api/email-config/cost/strategy` - Cambiar estrategia
- `PUT /api/email-config/cost/savings-options` - Actualizar opciones

---

### 4. **HybridAgentControl.jsx**
Control de agentes híbridos (IA + Humanos).

**Características:**
- 4 modos operativos
- Comparación de rendimiento
- Gestión de agentes humanos
- Visualización de tareas

**Uso:**
```jsx
import { HybridAgentControl } from './components/email-campaign-dashboard';

function AgentsPage() {
  return <HybridAgentControl />;
}
```

**API:**
- `GET /api/email-config/agent/stats` - Estadísticas de agentes
- `GET /api/email-config/agent/humans` - Lista de agentes humanos
- `PUT /api/email-config/agent/mode` - Cambiar modo
- `GET /api/email-config/agent/tasks/recent` - Tareas recientes

---

### 5. **MultiServerManager.jsx**
Gestor de múltiples servidores SMTP.

**Características:**
- Agregar/eliminar servidores
- Probar conectividad
- Cargar presets predefinidos
- Monitoreo de salud

**Uso:**
```jsx
import { MultiServerManager } from './components/email-campaign-dashboard';

function ServersPage() {
  return <MultiServerManager />;
}
```

**API:**
- `GET /api/email-config/smtp/servers` - Lista de servidores
- `POST /api/email-config/smtp/server` - Agregar servidor
- `DELETE /api/email-config/smtp/server/:id` - Eliminar
- `POST /api/email-config/smtp/server/:id/test` - Probar
- `GET /api/email-config/multi-server/presets` - Presets disponibles
- `POST /api/email-config/multi-server/preset` - Cargar preset

---

## 🎨 Dependencias Requeridas

Asegúrate de tener instaladas estas dependencias:

```bash
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
```

---

## 🚀 Instalación y Uso

### Paso 1: Copiar componentes
```bash
cp -r email-campaign-dashboard/ src/components/
```

### Paso 2: Agregar al router
```jsx
// App.js o router principal
import { MainDashboard } from './components/email-campaign-dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard" element={<MainDashboard />} />
        {/* otras rutas */}
      </Routes>
    </BrowserRouter>
  );
}
```

### Paso 3: Opcional - Usar componentes individuales
```jsx
import {
  WizardSetup,
  CostOptimizationDashboard,
  HybridAgentControl,
  MultiServerManager
} from './components/email-campaign-dashboard';

function CustomDashboard() {
  return (
    <div>
      <CostOptimizationDashboard />
      <HybridAgentControl />
    </div>
  );
}
```

---

## 📊 Estructura de Datos (API Responses)

### Stats Response
```json
{
  "costs": {
    "today": 2.50,
    "thisMonth": 67.50,
    "monthlyBudget": 95,
    "dailyBudget": 5,
    "projectedMonth": 93.75,
    "savingsThisMonth": 156.25,
    "aiCostsToday": 1.20
  },
  "usage": {
    "smtpToday": 2450,
    "smtpLimit": 3000,
    "sendgridToday": 350,
    "sendgridLimit": 5000,
    "aiRequestsToday": 850
  },
  "agentStats": {
    "aiStats": {
      "tasksCompleted": 2800,
      "successRate": 94,
      "avgTime": 2.3,
      "costPerTask": 0.005
    },
    "humanStats": {
      "tasksCompleted": 350,
      "successRate": 98,
      "avgTime": 180,
      "costPerTask": 0.50
    }
  },
  "distribution": {
    "aiPercentage": 80,
    "humanPercentage": 20
  }
}
```

### Server Response
```json
{
  "servers": [
    {
      "id": "server-1",
      "name": "Gmail Server 1",
      "host": "smtp.gmail.com",
      "port": 587,
      "ipAddress": "203.0.113.45",
      "dailyLimit": 500,
      "usedToday": 350,
      "health": "healthy",
      "warmup": {
        "enabled": true,
        "currentDay": 3
      }
    }
  ]
}
```

### Human Agent Response
```json
{
  "agents": [
    {
      "id": "agent-1",
      "name": "Juan Pérez",
      "available": true,
      "assignedTasks": 5,
      "currentCapacity": 5,
      "maxCapacity": 20
    }
  ]
}
```

---

## 🎯 Ejemplos de Uso Completos

### Ejemplo 1: Setup Inicial
```jsx
import React, { useState } from 'react';
import { WizardSetup, MainDashboard } from './components/email-campaign-dashboard';

function App() {
  const [isConfigured, setIsConfigured] = useState(false);

  if (!isConfigured) {
    return (
      <WizardSetup
        onComplete={(config) => {
          console.log('Configuration:', config);
          setIsConfigured(true);
        }}
      />
    );
  }

  return <MainDashboard />;
}
```

### Ejemplo 2: Dashboard Personalizado
```jsx
import React from 'react';
import { Box, Grid } from '@mui/material';
import {
  CostOptimizationDashboard,
  HybridAgentControl
} from './components/email-campaign-dashboard';

function CustomDashboard() {
  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <CostOptimizationDashboard />
        </Grid>
        <Grid item xs={12} lg={4}>
          <HybridAgentControl />
        </Grid>
      </Grid>
    </Box>
  );
}
```

### Ejemplo 3: Con Autenticación
```jsx
import React from 'react';
import { MainDashboard } from './components/email-campaign-dashboard';
import { useAuth } from './hooks/useAuth';

function ProtectedDashboard() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!user.roles.includes('admin')) return <div>Acceso denegado</div>;

  return <MainDashboard />;
}
```

---

## 🔧 Personalización

### Cambiar Colores del Tema
```jsx
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Tu color primario
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <MainDashboard />
    </ThemeProvider>
  );
}
```

### Modificar Intervalos de Actualización
```jsx
// En CostOptimizationDashboard.jsx, línea ~36
useEffect(() => {
  fetchStats();
  const interval = setInterval(fetchStats, 30000); // 30 segundos (cambiar aquí)
  return () => clearInterval(interval);
}, []);
```

---

## 📱 Responsive Design

Todos los componentes son **completamente responsive**:

- **Desktop (>960px)**: Layout completo con sidebars
- **Tablet (600-960px)**: Layout adaptado con grid reducido
- **Mobile (<600px)**: Stack vertical, navegación colapsable

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@mui/material'"
```bash
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
```

### Error: API endpoints no responden
Verifica que el backend esté corriendo y que las rutas estén registradas:
```javascript
// backend/server.js
const emailConfigRoutes = require('./routes/email-campaign-config.routes');
app.use('/api', emailConfigRoutes);
```

### Error: CORS
Agrega configuración CORS en el backend:
```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

---

## 📚 Recursos Adicionales

- **Documentación completa**: `/docs/COMPLETE_SYSTEM_GUIDE.md`
- **API Reference**: `/docs/API_REFERENCE.md`
- **Material-UI Docs**: https://mui.com/
- **React Docs**: https://react.dev/

---

## 🎉 ¡Listo!

Tu dashboard está completo y listo para usar. Si necesitas ayuda adicional, consulta la documentación o contacta al equipo de desarrollo.

**Configuración Recomendada para Spirit Tours:**
- Wizard Setup inicial (5 minutos)
- Preset: Hybrid Basic
- Estrategia: Balanced
- Modo: Hybrid

**Resultado esperado:**
- Costo: $95/mes
- Capacidad: 3,000 emails/día
- Ahorro: ~$155/mes
