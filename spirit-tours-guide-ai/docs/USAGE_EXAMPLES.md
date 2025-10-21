# 💡 Ejemplos de Uso - Spirit Tours Guide AI

## 📚 Tabla de Contenidos

1. [Uso Básico](#uso-básico)
2. [Multi-IA Orchestrator](#multi-ia-orchestrator)
3. [Sistema de Perspectivas](#sistema-de-perspectivas)
4. [Mapa y Rutas](#mapa-y-rutas)
5. [Notificaciones PWA](#notificaciones-pwa)
6. [Tracking en Tiempo Real](#tracking-en-tiempo-real)
7. [Integración Frontend](#integración-frontend)

---

## Uso Básico

### Iniciar el Sistema

```javascript
// backend/server.js se inicia automáticamente con:
npm run dev

// O en producción:
npm run start
```

---

## Multi-IA Orchestrator

### Ejemplo 1: Generación Simple

```javascript
const { MultiAIOrchestrator } = require('./backend/multi-ai-orchestrator');

const orchestrator = new MultiAIOrchestrator({
  defaultStrategy: 'cascade',
  fallbackChain: ['grok', 'meta', 'qwen', 'openai']
});

// Generar explicación
const response = await orchestrator.generate(
  'Explica la importancia del Muro de los Lamentos',
  {
    language: 'es',
    maxTokens: 500,
    temperature: 0.7
  }
);

console.log(response.content);
console.log(`Modelo usado: ${response.model}`);
console.log(`Costo: $${response.cost.toFixed(4)}`);
```

### Ejemplo 2: Estrategia Especializada

```javascript
// Usar modelo específico según el caso de uso
const response = await orchestrator.generate(
  'Dame datos arqueológicos del Segundo Templo',
  {
    strategy: 'specialized',
    useCase: 'historical-context',
    language: 'es',
    maxTokens: 1000
  }
);
```

### Ejemplo 3: Modo Paralelo (Mejor Calidad)

```javascript
// Llama a múltiples modelos y retorna la mejor respuesta
const response = await orchestrator.generate(
  'Explica las diferencias entre perspectivas religiosas del Monte del Templo',
  {
    strategy: 'parallel',
    language: 'es',
    maxTokens: 800
  }
);

// El sistema automáticamente eligió la mejor respuesta
console.log(`Mejor respuesta de: ${response.model}`);
```

### Ejemplo 4: Optimización de Costos

```javascript
const orchestrator = new MultiAIOrchestrator({
  defaultStrategy: 'cost_optimized',
  costLimit: 0.01  // Máximo $0.01 por request
});

const response = await orchestrator.generate(prompt, options);

// Si excede el límite, usa modelos más económicos
```

### Ejemplo 5: Obtener Recomendación de Modelo

```javascript
const recommendedModel = orchestrator.getRecommendedModel(
  'multilingual',
  {
    maxCost: 0.002,
    requiredSpeed: 'fast',
    language: 'chinese'
  }
);

console.log(`Modelo recomendado: ${recommendedModel}`);
// Output: "qwen" (especializado en chino, rápido y económico)
```

---

## Sistema de Perspectivas

### Ejemplo 1: Obtener Explicación desde una Perspectiva

```javascript
const { PerspectivesManager } = require('./backend/perspectives-manager');

const manager = new PerspectivesManager();

// Obtener explicación judía del Muro de los Lamentos
const explanation = await manager.getExplanation(
  'western-wall',
  'jewish',
  {
    language: 'es',
    length: 'medium',
    useAI: true,  // Usar IA para generar contenido dinámico
    includeReferences: true
  }
);

console.log(explanation.perspective.name);  // "Perspectiva Judía"
console.log(explanation.explanation.content);
console.log(explanation.explanation.references);  // ["Torá", "Talmud", ...]
```

### Ejemplo 2: Múltiples Perspectivas Simultáneas

```javascript
const perspectives = await manager.getMultiplePerspectives(
  'western-wall',
  ['jewish', 'islamic', 'historical'],
  {
    language: 'es',
    useAI: false  // Usar contenido predefinido (más rápido)
  }
);

perspectives.perspectives.forEach(p => {
  if (!p.error) {
    console.log(`${p.perspective.name}: ${p.explanation.short}`);
  }
});
```

### Ejemplo 3: Buscar Puntos de Interés Cercanos

```javascript
// Buscar POIs cerca de las coordenadas actuales
const nearbyPoints = manager.findNearbyPoints(
  31.7767,  // lat
  35.2287,  // lng
  2  // radio en km
);

nearbyPoints.forEach(poi => {
  console.log(`${poi.names.es} - ${poi.category}`);
  console.log(`  Perspectivas: ${Object.keys(poi.perspectives).join(', ')}`);
});
```

### Ejemplo 4: API REST

```javascript
// GET request desde frontend
const response = await fetch(
  'http://localhost:3001/api/perspectives/western-wall/jewish?useAI=true&language=es'
);

const data = await response.json();
console.log(data.explanation.content);
```

---

## Mapa y Rutas

### Ejemplo 1: Obtener Todas las Rutas

```javascript
const { RoutesManager } = require('./backend/routes-manager');

const manager = new RoutesManager();

const routes = manager.getAllRoutes();

routes.forEach(route => {
  console.log(`${route.code} - ${route.name}`);
  console.log(`  Color: ${route.colorName}`);
  console.log(`  Duración: ${route.duration} min`);
  console.log(`  Paradas: ${route.waypoints.length}`);
});
```

### Ejemplo 2: Iniciar un Tour

```javascript
const tour = manager.startTour({
  tourId: 'tour-123',
  routeId: 'jerusalem-religious',
  vehicleId: 'bus-456',
  driverId: 'driver-789',
  passengers: ['user-1', 'user-2', 'user-3'],
  startTime: new Date()
});

console.log(`Tour iniciado: ${tour.tourId}`);
console.log(`Ruta: ${tour.route.name}`);
console.log(`Primera parada: ${tour.route.waypoints[0].name}`);
```

### Ejemplo 3: Actualizar Posición del Vehículo

```javascript
// Actualizar posición cada 5 segundos
setInterval(() => {
  const position = manager.updateVehiclePosition('bus-456', {
    lat: 31.7767 + Math.random() * 0.001,
    lng: 35.2287 + Math.random() * 0.001,
    speed: 25,  // km/h
    heading: 90  // grados
  });

  console.log(`Posición actualizada: ${position.lat}, ${position.lng}`);
}, 5000);
```

### Ejemplo 4: Detectar Desviaciones

```javascript
// El sistema automáticamente detecta desviaciones
manager.on('route-deviation', (data) => {
  console.log(`⚠️ Desviación detectada en tour ${data.tourId}`);
  console.log(`Distancia de desviación: ${data.deviation.distance.toFixed(2)} km`);
  console.log(`Contenido sugerido:`, data.suggestedContent);
});
```

### Ejemplo 5: Monitorear Llegadas a Waypoints

```javascript
manager.on('waypoint-reached', (data) => {
  console.log(`✅ Llegada a: ${data.waypoint.name}`);
  console.log(`Progreso del tour: ${data.progress.percentage}%`);
  console.log(`Siguiente parada en ${data.waypoint.duration} minutos`);
});
```

---

## Notificaciones PWA

### Ejemplo 1: Inicializar Sistema de Notificaciones

```javascript
import notificationSystem from './mobile-pwa/notification-system';

// Inicializar en el frontend
const result = await notificationSystem.initialize({
  vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY',
  apiUrl: 'http://localhost:3001/api',
  tourId: 'tour-123',
  userRole: 'passenger'
});

if (result.success) {
  console.log('✅ Notificaciones activadas');
} else {
  console.log('❌ Error:', result.error);
}
```

### Ejemplo 2: Enviar Notificación de Llegada a Waypoint

```javascript
await notificationSystem.notifyWaypointReached(
  {
    id: 'western-wall',
    name: 'Muro de los Lamentos',
    description: 'Lugar más sagrado del judaísmo',
    duration: 60
  },
  {
    tourId: 'tour-123'
  }
);
```

### Ejemplo 3: Notificación de Emergencia

```javascript
await notificationSystem.notifyEmergency(
  'Evacuación necesaria por motivos de seguridad',
  {
    lat: 31.7767,
    lng: 35.2287
  }
);

// Se envía a TODOS los usuarios con prioridad urgente
// Vibración intensa y requiere interacción
```

### Ejemplo 4: Notificación de Engagement Social

```javascript
// Solicitar a usuarios compartir en redes al final del tour
await notificationSystem.notifySocialEngagement();

// Incluye acciones:
// - 👍 Like
// - ➕ Seguir
// - 📤 Compartir
```

### Ejemplo 5: Notificación Programada

```javascript
await notificationSystem.sendNotification({
  title: '⏰ Recordatorio',
  message: 'Tu tour comienza en 1 hora. ¡Prepárate!',
  type: 'info',
  priority: 'medium',
  target: 'individual',
  recipients: ['user-123'],
  scheduledTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hora
});
```

---

## Tracking en Tiempo Real

### Ejemplo 1: Conectar al WebSocket (Frontend)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

// Unirse a un tour
socket.emit('join-tour', 'tour-123');

// Escuchar actualizaciones de posición
socket.on('position-updated', (data) => {
  console.log('Nueva posición:', data.position);
  console.log('Progreso:', data.progress.percentage + '%');
  
  // Actualizar mapa
  updateMapMarker(data.position);
});

// Escuchar llegadas a waypoints
socket.on('waypoint-reached', (data) => {
  console.log(`Llegamos a: ${data.waypoint.name}`);
  showNotification(data.waypoint);
});

// Escuchar desviaciones
socket.on('route-deviation', (data) => {
  showDeviationMessage(data.deviation);
  displaySuggestedContent(data.suggestedContent);
});
```

### Ejemplo 2: Enviar Posición desde Conductor

```javascript
// En app del conductor
const watchId = navigator.geolocation.watchPosition((position) => {
  socket.emit('update-position', {
    vehicleId: 'bus-456',
    position: {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      speed: position.coords.speed || 0,
      heading: position.coords.heading || 0,
      accuracy: position.coords.accuracy
    }
  });
}, {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0
});
```

---

## Integración Frontend

### Ejemplo 1: Componente de Mapa Interactivo

```tsx
import InteractiveMapComponent from './frontend/InteractiveMapComponent';

function TourPage() {
  const [selectedRoute, setSelectedRoute] = useState('jerusalem-religious');
  
  const handleWaypointClick = (waypoint) => {
    console.log('Waypoint clicked:', waypoint.name);
    // Abrir modal con perspectivas
    openPerspectivesModal(waypoint);
  };

  return (
    <div className="h-screen">
      <InteractiveMapComponent
        routes={routes}
        selectedRouteId={selectedRoute}
        activeTourId="tour-123"
        enableTracking={true}
        onWaypointClick={handleWaypointClick}
        socketUrl="http://localhost:3001"
      />
    </div>
  );
}
```

### Ejemplo 2: Selector de Perspectivas

```tsx
import PerspectiveSelector from './frontend/PerspectiveSelector';

function POIDetailPage({ poiId }) {
  const handlePerspectiveChange = (perspective, data) => {
    console.log(`Cambiado a perspectiva: ${perspective}`);
    console.log('Datos:', data);
    
    // Guardar en analytics
    trackPerspectiveView(poiId, perspective);
  };

  return (
    <div className="container mx-auto p-4">
      <PerspectiveSelector
        poiId={poiId}
        availablePerspectives={['jewish', 'islamic', 'christian', 'historical']}
        defaultPerspective="historical"
        language="es"
        useAI={true}
        onPerspectiveChange={handlePerspectiveChange}
        showAudioPlayer={true}
        showSocialShare={true}
      />
    </div>
  );
}
```

### Ejemplo 3: Perfil de Conductor

```tsx
import DriverProfileComponent from './frontend/DriverProfileComponent';

function DriverPage({ driverId }) {
  const [driverLocation, setDriverLocation] = useState(null);

  useEffect(() => {
    // Actualizar ubicación en tiempo real
    const socket = io('http://localhost:3001');
    
    socket.on('position-updated', (data) => {
      if (data.vehicleId === driver.vehicle.id) {
        setDriverLocation({
          lat: data.position.lat,
          lng: data.position.lng,
          timestamp: new Date(),
          accuracy: 10
        });
      }
    });

    return () => socket.disconnect();
  }, []);

  return (
    <DriverProfileComponent
      driver={driver}
      currentLocation={driverLocation}
      showQRCode={true}
      showContact={true}
      showVehicle={true}
      enableTracking={true}
      estimatedArrival={{
        minutes: 5,
        distance: '1.2 km'
      }}
      onVerify={(code) => {
        console.log('✅ Conductor verificado con código:', code);
      }}
    />
  );
}
```

---

## 🎯 Casos de Uso Completos

### Caso 1: Tour Completo con Todas las Funcionalidades

```javascript
// 1. Iniciar tour
const tour = routesManager.startTour({
  tourId: 'tour-2025-001',
  routeId: 'jerusalem-religious',
  vehicleId: 'bus-001',
  driverId: 'driver-john',
  passengers: ['user-1', 'user-2', 'user-3', 'user-4']
});

// 2. Configurar notificaciones
await notificationSystem.initialize({
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  tourId: tour.tourId,
  userRole: 'passenger'
});

// 3. Iniciar tracking
const trackingInterval = setInterval(async () => {
  const position = getCurrentGPSPosition();
  
  routesManager.updateVehiclePosition(tour.vehicleId, position);
}, 5000);

// 4. Escuchar eventos
routesManager.on('waypoint-reached', async (data) => {
  // Notificar llegada
  await notificationSystem.notifyWaypointReached(
    data.waypoint,
    { tourId: tour.tourId }
  );

  // Obtener perspectivas del punto
  const perspectives = await perspectivesManager.getMultiplePerspectives(
    data.waypoint.pointsOfInterest[0],
    data.waypoint.perspectives || ['historical'],
    { language: 'es', useAI: true }
  );

  // Enviar contenido a los pasajeros
  io.to(`tour-${tour.tourId}`).emit('waypoint-content', {
    waypoint: data.waypoint,
    perspectives
  });
});

// 5. Manejar desviaciones
routesManager.on('route-deviation', async (data) => {
  await notificationSystem.notifyRouteDeviation(
    data.deviation,
    { tourId: tour.tourId }
  );

  // Obtener contenido contextual
  const contextContent = await aiOrchestrator.generate(
    `Dame una historia interesante sobre el área cercana a ${data.deviation.location.lat}, ${data.deviation.location.lng}`,
    {
      strategy: 'cost_optimized',
      language: 'es',
      maxTokens: 300
    }
  );

  // Enviar contenido
  io.to(`tour-${tour.tourId}`).emit('deviation-content', {
    content: contextContent.content
  });
});

// 6. Finalizar tour
setTimeout(async () => {
  const completedTour = routesManager.endTour(tour.tourId);
  
  await notificationSystem.notifyTourEnd({ tourId: tour.tourId });
  await notificationSystem.notifySocialEngagement();

  clearInterval(trackingInterval);
  
  console.log(`Tour completado en ${completedTour.actualDuration} minutos`);
}, tour.route.duration * 60000);
```

---

## 📊 Monitoreo y Estadísticas

```javascript
// Obtener estadísticas del sistema
const stats = {
  ai: aiOrchestrator.getStats(),
  perspectives: perspectivesManager.getStats(),
  routes: routesManager.getStats(),
  notifications: notificationSystem.getStats()
};

console.log('=== Estadísticas del Sistema ===');
console.log(`Total de requests IA: ${stats.ai.requests}`);
console.log(`Tasa de éxito: ${stats.ai.successRate}`);
console.log(`Costo total: $${stats.ai.totalCost.toFixed(2)}`);
console.log(`Tours activos: ${stats.routes.activeTours}`);
console.log(`Notificaciones pendientes: ${stats.notifications.pendingNotifications}`);
```

---

¡Estos ejemplos te permitirán implementar todas las funcionalidades del sistema Spirit Tours Guide AI! 🚀
