# 🌍 Spirit Tours - Sistema de Guía Virtual IA con Multiperspectiva

## 📋 Descripción General

Sistema avanzado de guía turístico virtual con inteligencia artificial que ofrece explicaciones culturales/religiosas desde múltiples perspectivas, rutas interactivas tipo metro, y gestión completa de tours con conductores geolocalizados.

## 🎯 Características Principales

### 1️⃣ **Sistema de Perspectivas Religiosas/Culturales**
- ✅ Explicaciones dinámicas según perspectiva seleccionada
- ✅ Perspectivas disponibles:
  - 🕌 Islámica
  - ✡️ Judía
  - ✝️ Cristiana
  - 🏛️ Histórica/Académica
  - 🌐 Cultural general
- ✅ Selector interactivo en cada punto de interés
- ✅ Contenido adaptativo y contextual

**Ejemplo: Muro de los Lamentos / Al-Buraq**
```javascript
{
  location: "Muro de los Lamentos",
  perspectives: {
    jewish: "El lugar más sagrado del judaísmo, último remanente del Segundo Templo...",
    islamic: "Sitio donde el Profeta Muhammad (PBUH) ató a Al-Buraq durante el viaje nocturno...",
    christian: "Lugar de oración significativo mencionado en los Evangelios...",
    historical: "Muro de contención del Monte del Templo, construido por Herodes el Grande..."
  }
}
```

### 2️⃣ **Sistema Multi-IA Inteligente**
- ✅ Integración de múltiples proveedores de IA:
  - 🤖 OpenAI GPT-4 (premium, alta calidad)
  - ⚡ Grok AI (rápido, económico)
  - 🧠 Meta Llama (código abierto, privacidad)
  - 🌟 Qwen (multilingüe, chino excelente)
  - 💡 DeepSeek (matemáticas, lógica)
  - 🔮 Claude (contexto largo, análisis)
  - 🎨 Gemini (multimodal, imágenes)

- ✅ Panel administrativo para selección de IA:
  - Selección manual por caso de uso
  - Modo "auto-optimización" para mejor costo/calidad
  - Distribución de carga entre modelos
  - Análisis de costos en tiempo real

- ✅ Estrategias de optimización:
  - **Cascada**: Intenta modelos económicos primero, escala si falla
  - **Paralelo**: Múltiples modelos simultáneos, mejor respuesta gana
  - **Especializado**: Asigna modelo según tipo de consulta
  - **Round-robin**: Distribución equitativa de carga

### 3️⃣ **Perfiles de Conductores/Guías**
- ✅ Información completa del conductor:
  - 📸 Foto de perfil en alta resolución
  - 👤 Nombre completo y apodo
  - 🗣️ Idiomas hablados (nivel de dominio)
  - ⭐ Rating y reseñas
  - 📱 Contacto directo (WhatsApp/Telegram)
  - 🎓 Certificaciones y experiencia

- ✅ Geolocalización en tiempo real:
  - Ubicación actual del conductor
  - ETA (tiempo estimado de llegada)
  - Tracking en vivo en el mapa
  - Notificaciones de proximidad

- ✅ Sistema de reconocimiento:
  - Código QR para verificación
  - Pin de seguridad compartido
  - Foto actualizada el día del tour

### 4️⃣ **Engagement y Redes Sociales**
- ✅ Solicitudes automáticas de engagement:
  - Pedido de likes en momentos estratégicos
  - Invitación a seguir redes sociales
  - Compartir experiencias con hashtags
  - Mensajes personalizados de agradecimiento

- ✅ Sistema de recompensas:
  - Descuentos por compartir en redes
  - Puntos de fidelidad por engagement
  - Badges especiales para embajadores
  - Acceso anticipado a nuevos tours

- ✅ Integración con plataformas:
  - Instagram Stories
  - TikTok
  - Facebook
  - Twitter/X
  - YouTube Shorts

### 5️⃣ **Desviaciones de Ruta Inteligentes**
- ✅ Detección automática de desviaciones:
  - Monitoreo GPS en tiempo real
  - Algoritmo de detección de desvíos
  - Umbral configurable (50m-500m)

- ✅ Contenido contextual durante desvíos:
  - Historias locales del área actual
  - Datos curiosos sobre el entorno
  - Leyendas y anécdotas
  - Música/sonidos ambientales

- ✅ Notificaciones proactivas:
  - Alerta automática a pasajeros
  - Razón del desvío (tráfico, cierre, etc.)
  - Nuevo tiempo estimado
  - Contenido de entretenimiento

### 6️⃣ **Progressive Web App (PWA)**
- ✅ Instalación automática:
  - Prompt de instalación inteligente
  - Compatible con iOS y Android
  - Funciona sin conexión
  - Actualización automática

- ✅ Características offline:
  - Mapas descargados
  - Contenido de audio pre-cargado
  - Itinerarios guardados
  - Información de emergencia

- ✅ Optimizaciones:
  - Service Worker avanzado
  - Cache inteligente de recursos
  - Lazy loading de imágenes
  - Compresión de datos

### 7️⃣ **Sistema de Notificaciones Granular**
- ✅ Niveles de notificación:
  - **Global**: Admin a todos los usuarios
  - **Grupo**: Notificación a tour específico
  - **Individual**: Mensajes personalizados

- ✅ Gestión de permisos:
  - Admin tiene todos los permisos
  - Coordinador: Solo sus grupos asignados
  - Guía: Solo su grupo activo
  - Sistema de delegación temporal

- ✅ Tipos de notificaciones:
  - 🚨 Alertas urgentes (rojas)
  - ℹ️ Información general (azules)
  - 📍 Actualizaciones de ubicación (verdes)
  - 🎉 Eventos especiales (amarillas)

- ✅ Programación avanzada:
  - Notificaciones programadas
  - Recordatorios automáticos
  - Notificaciones basadas en ubicación
  - Notificaciones condicionales

### 8️⃣ **WhatsApp Business Integration**
- ✅ Comunicación bidireccional automatizada:
  - 📲 Confirmaciones de tour por WhatsApp
  - ⏰ Recordatorios automáticos (24h y 1h antes)
  - 🚗 Notificación de conductor asignado
  - 📍 Actualizaciones de ubicación en tiempo real
  - ⭐ Solicitudes de rating post-tour

- ✅ Tipos de mensajes soportados:
  - Mensajes de plantilla pre-aprobados
  - Mensajes de texto simples
  - Imágenes con caption (perfil conductor, QR)
  - Ubicaciones GPS en vivo
  - Botones interactivos (hasta 3 opciones)
  - Listas desplegables (selección de perspectivas)

- ✅ Gestión de conversaciones:
  - Historial completo de mensajes
  - Sistema de opt-in/opt-out
  - Enrutamiento inteligente a agentes humanos
  - Respuestas automáticas con IA
  - Seguimiento de estado (enviado, entregado, leído)

- ✅ Integración empresarial:
  - WhatsApp Business API oficial (Meta)
  - Cumplimiento de rate limits (80 msg/seg)
  - Cola de mensajes con Redis
  - Reintentos automáticos en fallos
  - Estadísticas detalladas de uso

### 9️⃣ **Mapa Interactivo con Rutas de Colores**
- ✅ Visualización tipo metro/subway:
  - Rutas diferenciadas por color según tour
  - Líneas visuales conectando puntos
  - Estaciones (puntos de interés) destacadas
  - Nomenclatura clara (R1, R2, R3...)

- ✅ Tracking en tiempo real:
  - Posición actual del vehículo
  - Puntos visitados (checkpoints)
  - Progreso del tour (%)
  - ETA a próximo punto

- ✅ Información contextual:
  - Pop-ups con detalles del punto
  - Duración estimada en cada parada
  - Servicios disponibles (baños, tiendas, etc.)
  - Accesibilidad y restricciones

- ✅ Rutas recomendadas:
  - Algoritmo de optimización de ruta
  - Consideración de tráfico en tiempo real
  - Alternativas en caso de cierres
  - Rutas temáticas personalizadas

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
```
Frontend:
- React 18 + TypeScript
- Tailwind CSS + Shadcn/ui
- Leaflet.js (mapas)
- Socket.io-client (tiempo real)
- PWA capabilities

Backend:
- Node.js + Express
- Socket.io (WebSockets)
- PostgreSQL (datos principales)
- Redis (cache y sesiones)
- MongoDB (logs y contenido)

Mobile PWA:
- Workbox (Service Workers)
- IndexedDB (storage local)
- Web Push API
- Geolocation API

IA/ML:
- LangChain (orquestación)
- Múltiples LLM providers
- Vector embeddings
- Sentiment analysis
```

### Integración con APIs Externas
- OpenAI API
- Anthropic Claude API
- Google Gemini API
- Meta Llama API
- Grok API
- Mapbox/Google Maps
- Twilio (SMS/WhatsApp)
- OneSignal (Push notifications)

## 📱 Flujo de Usuario

### Para Turistas/Pasajeros:

1. **Pre-Tour**:
   ```
   Reserva → Recibe credenciales → Instala PWA → Ve perfil del conductor
   ```

2. **Día del Tour**:
   ```
   Tracking del conductor → Encuentro con código QR → Selección de perspectiva
   ```

3. **Durante el Tour**:
   ```
   Seguimiento en mapa → Audio guía IA → Desviaciones con contenido →
   Solicitudes de engagement → Notificaciones del grupo
   ```

4. **Post-Tour**:
   ```
   Rating del conductor → Compartir en redes → Descuentos por engagement →
   Recepción de fotos/videos del tour
   ```

### Para Conductores/Guías:

1. **Pre-Tour**:
   ```
   Ver asignaciones → Revisar itinerario → Actualizar perfil
   ```

2. **Durante el Tour**:
   ```
   Activar tracking GPS → Marcar checkpoints → Enviar notificaciones al grupo →
   Gestionar desviaciones
   ```

3. **Post-Tour**:
   ```
   Cerrar tour → Ver estadísticas → Recibir propinas digitales
   ```

### Para Administradores:

1. **Gestión de Tours**:
   ```
   Crear rutas → Asignar conductores → Configurar perspectivas → Monitorear en vivo
   ```

2. **Gestión de IA**:
   ```
   Seleccionar modelos → Configurar fallbacks → Ver costos → Optimizar rendimiento
   ```

3. **Comunicación**:
   ```
   Enviar notificaciones globales → Gestionar permisos → Programar mensajes
   ```

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- MongoDB 6+

### Variables de Entorno
```bash
# APIs de IA
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
GROK_API_KEY=...
META_LLAMA_API_KEY=...

# Base de datos
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
MONGODB_URL=mongodb://...

# Mapas
MAPBOX_TOKEN=pk.eyJ1...
GOOGLE_MAPS_API_KEY=AIza...

# Notificaciones
ONESIGNAL_APP_ID=...
ONESIGNAL_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# PWA
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

### Comandos de Instalación
```bash
# Instalar dependencias
npm install

# Configurar base de datos
npm run db:migrate
npm run db:seed

# Iniciar desarrollo
npm run dev

# Build para producción
npm run build

# Deploy
npm run deploy
```

## 📊 Métricas y KPIs

### Métricas de Engagement
- Tasa de instalación de PWA
- Likes/shares en redes sociales
- Tiempo promedio en la app
- Interacciones con el mapa

### Métricas de Satisfacción
- Rating promedio de conductores
- Feedback sobre perspectivas
- NPS (Net Promoter Score)
- Tasa de repetición de clientes

### Métricas de IA
- Latencia de respuesta
- Costo por request
- Tasa de éxito de modelos
- Precisión de contenido

### Métricas Operacionales
- Desviaciones de ruta detectadas
- Tiempo de respuesta a notificaciones
- Uptime del sistema
- Usuarios activos simultáneos

## 🔐 Seguridad y Privacidad

- Encriptación end-to-end para mensajes
- GDPR compliant
- Anonimización de datos de ubicación
- Autenticación multi-factor
- Rate limiting en APIs
- Auditoría de accesos

## 📈 Roadmap Futuro

### Fase 1 (Actual)
- ✅ Perspectivas religiosas/culturales
- ✅ Multi-IA con optimización
- ✅ Perfiles de conductores
- ✅ Mapa con rutas de colores

### Fase 2 (Q1 2026)
- [ ] Realidad Aumentada en puntos de interés
- [ ] Traducción en tiempo real con IA
- [ ] Gamificación avanzada
- [ ] Marketplace de tours

### Fase 3 (Q2 2026)
- [ ] IA generativa para tour personalizados
- [ ] Blockchain para certificados de tours
- [ ] Metaverso tours virtuales
- [ ] Integración con dispositivos wearables

## 👥 Equipo y Contribución

- **Lead Developer**: Sistema completo
- **IA Specialist**: Integración de modelos
- **UX Designer**: Interfaces y flujos
- **DevOps**: Infraestructura y deploy

## 📄 Licencia

MIT License - Spirit Tours © 2025

---

**¿Listo para revolucionar la experiencia turística? 🚀**

Para más información, consulta la documentación técnica completa en `/docs`.
