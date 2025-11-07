# 📧 Guía Completa: Sistema Multi-Servidor con Rotación de IPs

## 🎯 Descripción General

Sistema avanzado de envío de emails con **rotación automática de IPs y servidores múltiples** para evitar blacklisting y maximizar la entregabilidad.

### ✨ Características Principales

- **15+ Configuraciones Predefinidas**: Desde starter (1 servidor) hasta enterprise (25 servidores)
- **Rotación Inteligente**: Round-robin, random, least-used, best-performance
- **Health Monitoring**: Detección automática de servidores caídos
- **Warm-up Automático**: Calentamiento progresivo de IPs nuevas
- **Blacklist Detection**: Monitoreo continuo de listas negras
- **Load Balancing**: Distribución equitativa de carga
- **Geographic Routing**: Enrutamiento por región geográfica
- **Failover Automático**: Cambio a servidores de respaldo
- **Performance Tracking**: Métricas por servidor y reputación

---

## 📋 Configuraciones Predefinidas

### TIER 1: STARTER (1-3 Servidores) 💰 $25-75/mes

#### 1. **STARTER - Recomendado para Empezar** ⭐
```javascript
Preset: 'starter'
- Servidores: 1 SMTP
- Capacidad: 500 emails/día (15,000/mes)
- IPs Dedicadas: 1
- Costo: $25/mes
- Mejor para: Comenzar, testear sistema, volumen bajo
```

#### 2. **BASIC DUAL**
```javascript
Preset: 'basic-dual'
- Servidores: 2 SMTP
- Capacidad: 1,000 emails/día (30,000/mes)
- IPs Dedicadas: 2
- Costo: $50/mes
- Mejor para: Redundancia básica, duplicar capacidad
```

#### 3. **STARTER TRIPLE**
```javascript
Preset: 'starter-triple'
- Servidores: 3 SMTP
- Capacidad: 1,500 emails/día (45,000/mes)
- IPs Dedicadas: 3
- Costo: $75/mes
- Mejor para: Mayor distribución de carga
```

---

### TIER 2: PROFESSIONAL (4-7 Servidores) 💼 $125-175/mes

#### 4. **PROFESSIONAL - Recomendado Profesional** ⭐
```javascript
Preset: 'professional'
- Servidores: 5 SMTP
- Capacidad: 2,500 emails/día (75,000/mes)
- IPs Dedicadas: 5
- Costo: $125/mes + $50 setup
- Mejor para: Empresas medianas, campañas regulares
```

#### 5. **PROFESSIONAL PLUS**
```javascript
Preset: 'professional-plus'
- Servidores: 7 SMTP
- Capacidad: 3,500 emails/día (105,000/mes)
- IPs Dedicadas: 7
- Costo: $175/mes + $70 setup
- Mejor para: Mayor capacidad profesional
```

---

### TIER 3: BUSINESS (8-12 Servidores) 🏢 $250-300/mes

#### 6. **BUSINESS - Recomendado Empresarial** ⭐
```javascript
Preset: 'business'
- Servidores: 10 SMTP
- Capacidad: 5,000 emails/día (150,000/mes)
- IPs Dedicadas: 10
- Costo: $250/mes + $100 setup
- Mejor para: Empresas grandes, alto volumen
```

#### 7. **BUSINESS ADVANCED**
```javascript
Preset: 'business-advanced'
- Servidores: 12 SMTP
- Capacidad: 6,000 emails/día (180,000/mes)
- IPs Dedicadas: 12
- Costo: $300/mes + $120 setup
- Mejor para: Volumen muy alto, múltiples campañas
```

---

### TIER 4: ENTERPRISE (15-25 Servidores) 🚀 $375-625/mes

#### 8. **ENTERPRISE - Recomendado Enterprise** ⭐
```javascript
Preset: 'enterprise'
- Servidores: 15 SMTP
- Capacidad: 7,500 emails/día (225,000/mes)
- IPs Dedicadas: 15
- Costo: $375/mes + $150 setup
- Mejor para: Corporaciones, volumen masivo
```

#### 9. **ENTERPRISE PLUS**
```javascript
Preset: 'enterprise-plus'
- Servidores: 20 SMTP
- Capacidad: 10,000 emails/día (300,000/mes)
- IPs Dedicadas: 20
- Costo: $500/mes + $200 setup
- Mejor para: Máxima capacidad
```

#### 10. **ENTERPRISE ULTIMATE**
```javascript
Preset: 'enterprise-ultimate'
- Servidores: 25 SMTP
- Capacidad: 12,500 emails/día (375,000/mes)
- IPs Dedicadas: 25
- Costo: $625/mes + $250 setup
- Mejor para: Volumen extremo, múltiples marcas
```

---

### TIER 5: HYBRID (SMTP + SendGrid) 🔄 $95-215/mes

#### 11. **HYBRID BASIC - Recomendado Hybrid** ⭐
```javascript
Preset: 'hybrid-basic'
- Servidores: 3 SMTP + SendGrid
- Capacidad: 3,000 emails/día (90,000/mes)
  * 1,500 vía SMTP propio
  * 1,500 vía SendGrid (overflow)
- IPs Dedicadas: 3 propias + Cloud SendGrid
- Costo: $95/mes ($75 SMTP + $20 SendGrid)
- Mejor para: Flexibilidad, picos de demanda
```

#### 12. **HYBRID PROFESSIONAL**
```javascript
Preset: 'hybrid-professional'
- Servidores: 5 SMTP + SendGrid Pro
- Capacidad: 6,000 emails/día (180,000/mes)
  * 2,500 vía SMTP propio
  * 3,500 vía SendGrid Pro
- IPs Dedicadas: 5 propias + Cloud SendGrid
- Costo: $215/mes ($125 SMTP + $90 SendGrid)
- Mejor para: Máxima flexibilidad y escalabilidad
```

---

### TIER 6: SPECIALIZED (Casos Especiales) 🎯 $300-450/mes

#### 13. **GEOGRAPHIC DISTRIBUTED**
```javascript
Preset: 'geographic-distributed'
- Servidores: 12 SMTP (4 US + 4 EU + 4 LATAM)
- Capacidad: 6,000 emails/día (180,000/mes)
- IPs Dedicadas: 12 (distribuidas geográficamente)
- Costo: $300/mes + $150 setup
- Routing Rules:
  * .com → US East
  * .eu, .es → EU West
  * .mx, .br, .ar → LATAM
- Mejor para: Audiencia internacional, mejor latencia
```

#### 14. **HIGH VOLUME BURST**
```javascript
Preset: 'high-volume-burst'
- Servidores: 15 SMTP + SendGrid Pro
- Capacidad: 20,000 emails/día (600,000/mes)
- IPs Dedicadas: 15
- Daily Limit por Servidor: 800 (más alto que normal)
- Costo: $450/mes + $200 setup
- Mejor para: Campañas masivas en períodos cortos
```

#### 15. **ULTRA SECURE**
```javascript
Preset: 'ultra-secure'
- Servidores: 20 SMTP
- Capacidad: 4,000 emails/día (120,000/mes)
- IPs Dedicadas: 20
- Daily Limit por Servidor: 200 (más bajo, más servidores)
- Warmup Extendido: 10 días
- Delay: 2 segundos entre emails (más lento)
- Costo: $400/mes + $150 setup
- Mejor para: Máxima entregabilidad, reputación crítica
```

---

## 🚀 Cómo Usar el Sistema

### Opción 1: Usar Configuración Predefinida (Recomendado)

```javascript
const multiServerManager = require('./services/travel-agency-prospecting/multi-server-manager.service');

// Ver todas las configuraciones disponibles
const presets = multiServerManager.getPresets();
console.log(Object.keys(presets));
// ['starter', 'basic-dual', 'starter-triple', 'professional', ...]

// Cargar configuración predefinida
multiServerManager.loadPreset('professional');

// Enviar email (rotación automática)
const result = await multiServerManager.sendEmail({
  to: 'agency@example.com',
  subject: 'Spirit Tours - Partnership Opportunity',
  html: '<p>Email content...</p>',
  text: 'Email content...',
});

console.log(result);
// {
//   success: true,
//   server: 'SMTP Server 3',
//   messageId: '<unique-id>',
//   ipAddress: '192.168.1.3'
// }
```

### Opción 2: Crear Configuración Personalizada

```javascript
// Crear configuración custom con 8 servidores
const customConfig = multiServerManager.createCustomConfig({
  name: 'Mi Configuración Personalizada',
  serverCount: 8,
  dailyLimitPerServer: 600,
  includeSendGrid: true,
  sendGridDailyLimit: 2000,
  warmupEnabled: true,
});

console.log(customConfig);
// {
//   name: 'Mi Configuración Personalizada',
//   tier: 'custom',
//   capacity: {
//     emailsPerDay: 6800, // 8*600 + 2000
//     emailsPerMonth: 204000
//   },
//   servers: [...] // 8 SMTP + 1 SendGrid
// }
```

### Opción 3: Configuración Geográficamente Distribuida

```javascript
// Servidores distribuidos en 3 regiones
const geoConfig = multiServerManager.createCustomConfig({
  name: 'Global Distribution',
  serverCount: 9,
  dailyLimitPerServer: 500,
  regions: ['US', 'EU', 'LATAM'], // 3 servidores por región
  warmupEnabled: true,
});

// El sistema enrutará automáticamente según el dominio:
// - .com → servidores US
// - .eu, .es → servidores EU
// - .mx, .br, .ar → servidores LATAM
```

---

## ⚙️ Estrategias de Rotación

### 1. Round-Robin (Predeterminado)
```javascript
multiServerManager.config.globalSettings.rotationStrategy = 'round-robin';
// Rotación circular: Server 1 → 2 → 3 → ... → N → 1
// Mejor para: Distribución equitativa
```

### 2. Random
```javascript
multiServerManager.config.globalSettings.rotationStrategy = 'random';
// Selección aleatoria
// Mejor para: Evitar patrones detectables
```

### 3. Least-Used
```javascript
multiServerManager.config.globalSettings.rotationStrategy = 'least-used';
// Selecciona el servidor con menos uso
// Mejor para: Balanceo de carga dinámico
```

### 4. Best-Performance
```javascript
multiServerManager.config.globalSettings.rotationStrategy = 'best-performance';
// Selecciona el servidor con mejor reputación
// Mejor para: Maximizar entregabilidad
```

---

## 📊 Monitoreo y Estadísticas

### Ver Estadísticas Globales

```javascript
const stats = multiServerManager.getStatistics();

console.log(stats.global);
// {
//   totalServers: 10,
//   activeServers: 9,
//   totalIPs: 10,
//   totalSent: 1234,
//   totalDelivered: 1180,
//   totalFailed: 54,
//   averageReputation: 92.5
// }
```

### Ver Estadísticas por Servidor

```javascript
console.log(stats.servers);
// [
//   {
//     name: 'SMTP Server 1',
//     totalSent: 120,
//     totalDelivered: 115,
//     totalFailed: 5,
//     reputation: 95.8,
//     health: 'up',
//     warmup: { day: 5, sentToday: 85, dailyLimit: 400 }
//   },
//   ...
// ]
```

### Obtener Recomendaciones

```javascript
const recommendations = multiServerManager.getRecommendations();

console.log(recommendations);
// [
//   {
//     level: 'warning',
//     message: 'La reputación promedio está por debajo del 80%. Reduce la velocidad.'
//   },
//   {
//     level: 'info',
//     message: '3 servidores están en warmup. Capacidad completa pronto.'
//   }
// ]
```

---

## 🔥 Sistema de Warm-up Automático

El sistema calienta automáticamente las IPs nuevas:

```javascript
// Schedule de warmup predeterminado (6 días):
Day 1: 50 emails
Day 2: 100 emails
Day 3: 200 emails
Day 4: 300 emails
Day 5: 400 emails
Day 6+: 500 emails (capacidad completa)

// El sistema automáticamente:
// 1. Limita los emails por día según el schedule
// 2. Avanza al siguiente día automáticamente
// 3. Alcanza capacidad completa progresivamente
```

### Avanzar Warmup Manualmente

```javascript
// Si quieres acelerar el warmup (no recomendado)
multiServerManager.advanceWarmupDay('SMTP Server 1');
```

---

## 🏥 Health Monitoring Automático

El sistema verifica la salud de todos los servidores cada 5 minutos:

```javascript
// Health check automático detecta:
// - Servidores caídos
// - Problemas de autenticación
// - Timeouts de conexión
// - Errores SMTP

// Escuchar eventos de salud
multiServerManager.on('server-down', (event) => {
  console.error(`⚠️ Servidor caído: ${event.server}`);
  console.error(`Error: ${event.error}`);
  // Enviar alerta a administradores
});

multiServerManager.on('health-check-failed', (event) => {
  console.warn(`⚠️ Health check falló: ${event.server}`);
});
```

---

## 🎯 Casos de Uso Recomendados

### Caso 1: Startup Comenzando
```javascript
Recomendación: STARTER
- 1 servidor, $25/mes
- 500 emails/día
- Warmup de 1 semana
- Upgrade cuando llegues a 80% de capacidad
```

### Caso 2: Agencia de Viajes Mediana
```javascript
Recomendación: PROFESSIONAL
- 5 servidores, $125/mes
- 2,500 emails/día
- Redundancia y rotación
- Suficiente para 100-200 agencias contactadas/día
```

### Caso 3: Tour Operator Grande
```javascript
Recomendación: BUSINESS
- 10 servidores, $250/mes
- 5,000 emails/día
- Alta disponibilidad
- Múltiples campañas simultáneas
```

### Caso 4: Red Internacional de Agencias
```javascript
Recomendación: GEOGRAPHIC DISTRIBUTED
- 12 servidores (4 por región), $300/mes
- 6,000 emails/día
- Routing geográfico automático
- Mejor latencia y entregabilidad por región
```

### Caso 5: Campaña Masiva Temporal
```javascript
Recomendación: HIGH VOLUME BURST
- 15 servidores + SendGrid, $450/mes
- 20,000 emails/día
- Para lanzamientos de productos
- Escala rápidamente
```

### Caso 6: Necesitas Flexibilidad
```javascript
Recomendación: HYBRID BASIC
- 3 SMTP + SendGrid, $95/mes
- 3,000 emails/día
- Servidores propios para control
- SendGrid para picos de demanda
```

---

## 💡 Mejores Prácticas

### 1. Comenzar Pequeño, Escalar Gradualmente
```javascript
// Mes 1-2: Starter (1 servidor)
multiServerManager.loadPreset('starter');

// Mes 3-4: Professional (5 servidores)
multiServerManager.loadPreset('professional');

// Mes 5+: Business (10 servidores)
multiServerManager.loadPreset('business');
```

### 2. Monitorear Reputación Constantemente
```javascript
setInterval(() => {
  const stats = multiServerManager.getStatistics();
  
  if (stats.global.averageReputation < 80) {
    console.warn('⚠️ Reputación baja! Reducir velocidad');
    // Cambiar a configuración más conservadora
  }
}, 3600000); // Cada hora
```

### 3. Respetar Warm-up
```javascript
// ❌ NO hagas esto:
// Enviar 500 emails en el día 1 de warmup

// ✅ Haz esto:
// Dejar que el sistema respete el schedule automático
// Day 1: 50, Day 2: 100, etc.
```

### 4. Distribuir Geográficamente para Internacional
```javascript
// Si envías a:
// - Europa: 40% del volumen
// - América: 40% del volumen
// - Asia/Otros: 20% del volumen

// Usa: geographic-distributed
// Con servidores en cada región
```

### 5. Tener Failover con Hybrid
```javascript
// Configuración ideal:
// - Servidores SMTP propios como principal (prioridad 1)
// - SendGrid como backup (prioridad 2)

// Si SMTP falla, SendGrid toma el control automáticamente
```

---

## 📈 Comparación de Costos

| Preset | Servidores | Emails/Día | Emails/Mes | Costo/Mes | Costo/1000 Emails |
|--------|-----------|------------|------------|-----------|-------------------|
| Starter | 1 | 500 | 15,000 | $25 | $1.67 |
| Basic Dual | 2 | 1,000 | 30,000 | $50 | $1.67 |
| Professional | 5 | 2,500 | 75,000 | $125 | $1.67 |
| Business | 10 | 5,000 | 150,000 | $250 | $1.67 |
| Enterprise | 15 | 7,500 | 225,000 | $375 | $1.67 |
| Hybrid Basic | 3+SG | 3,000 | 90,000 | $95 | $1.06 |
| Hybrid Pro | 5+SG | 6,000 | 180,000 | $215 | $1.19 |

**Conclusión**: El costo por email se mantiene constante (~$1.67/1000) para SMTP puro. Las opciones híbridas son más económicas a mayor escala.

---

## 🔧 Configuración en Dashboard

### Endpoint para Cambiar Configuración

```javascript
// API endpoint sugerido:
POST /api/email-config/multi-server

// Body para preset:
{
  "type": "preset",
  "config": "professional"
}

// Body para custom:
{
  "type": "custom",
  "config": {
    "name": "My Custom Setup",
    "serverCount": 8,
    "dailyLimitPerServer": 600,
    "includeSendGrid": true
  }
}

// Response:
{
  "success": true,
  "configuration": {
    "name": "Professional - Five Servers",
    "tier": "professional",
    "capacity": {
      "emailsPerDay": 2500,
      "emailsPerMonth": 75000
    },
    "servers": 5,
    "cost": {
      "monthly": 125,
      "setup": 50
    }
  }
}
```

---

## ❓ Preguntas Frecuentes

### ¿Cuántos servidores necesito?
**Respuesta**: Depende de tu volumen diario:
- 0-500 emails/día: 1 servidor (Starter)
- 500-1,500 emails/día: 3 servidores (Starter Triple)
- 1,500-3,000 emails/día: 5 servidores (Professional)
- 3,000-6,000 emails/día: 10 servidores (Business)
- 6,000+ emails/día: 15+ servidores (Enterprise)

### ¿Puedo cambiar de configuración después?
**Respuesta**: Sí! Puedes cambiar en cualquier momento:
```javascript
multiServerManager.changeConfiguration('preset', 'business');
```

### ¿Qué pasa si un servidor falla?
**Respuesta**: El sistema automáticamente:
1. Detecta el servidor caído (health check)
2. Lo marca como "down"
3. Excluye de rotación
4. Usa servidores restantes
5. Envía alerta a administradores

### ¿Cómo evito blacklisting?
**Respuesta**: El sistema implementa:
- Warmup automático de IPs nuevas
- Rotación para distribuir carga
- Delays entre emails
- Monitoreo de reputación
- Detección de bounces
- Límites diarios por IP

### ¿Puedo usar mis propios servidores SMTP?
**Respuesta**: Sí! Configura las variables de entorno:
```bash
SMTP_HOST_1=smtp1.tudominio.com
SMTP_USER_1=usuario@tudominio.com
SMTP_PASSWORD_1=tupassword
SMTP_IP_1=123.456.789.1
# ... repetir para cada servidor
```

---

## 🎓 Conclusión

Este sistema multi-servidor te permite:

✅ **Escalar de 500 a 12,500+ emails/día**  
✅ **Evitar blacklisting** con rotación inteligente  
✅ **Minimizar costos** con precios predecibles  
✅ **Maximizar entregabilidad** con warmup y monitoring  
✅ **Flexibilidad** para cambiar configuración cuando necesites  
✅ **Failover automático** si servidores fallan  
✅ **Routing geográfico** para audiencia internacional  

**Recomendación Final**: Comienza con **Starter** o **Hybrid Basic** y escala según necesidad. El sistema hace el resto automáticamente.

---

**¿Necesitas ayuda?** Revisa `multi-server-manager.service.js` para más detalles técnicos.
