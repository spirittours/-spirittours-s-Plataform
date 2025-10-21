# 📖 Guía de Instalación - Spirit Tours Guide AI

## 📋 Requisitos Previos

### Software Requerido
- **Node.js** 18.0.0 o superior
- **npm** 8.0.0 o superior
- **PostgreSQL** 14 o superior
- **Redis** 7 o superior
- **MongoDB** 6 o superior (opcional, para logs)

### APIs Necesarias
- **OpenAI API Key** (requerida)
- **Al menos una API adicional** de: Grok, Meta Llama, Qwen, DeepSeek, Claude, o Gemini
- **Mapbox Token** o **Google Maps API Key**
- **VAPID Keys** para notificaciones push

## 🚀 Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone https://github.com/spirit-tours/guide-ai.git
cd guide-ai
```

### 2. Instalar Dependencias

```bash
# Instalar dependencias del backend
npm install

# Instalar dependencias del frontend
cd frontend
npm install
cd ..
```

### 3. Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar con tus credenciales
nano .env  # o tu editor preferido
```

**Variables críticas a configurar:**
```env
# Al menos una API de IA
OPENAI_API_KEY=sk-your-key-here
GROK_API_KEY=your-key-here  # Recomendado para ahorro de costos

# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/spirit_tours

# Mapas (al menos una)
MAPBOX_TOKEN=pk.your-token
# O
GOOGLE_MAPS_API_KEY=your-key

# Notificaciones Push
VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key
```

### 4. Generar VAPID Keys (para Push Notifications)

```bash
# Instalar web-push globalmente
npm install -g web-push

# Generar keys
web-push generate-vapid-keys

# Copiar las keys al archivo .env
```

### 5. Configurar Base de Datos

#### PostgreSQL

```bash
# Crear base de datos
createdb spirit_tours

# Ejecutar migraciones (si las hay)
npm run migrate
```

#### Redis

```bash
# Iniciar Redis
redis-server

# Verificar conexión
redis-cli ping
# Debería responder: PONG
```

### 6. Generar Iconos PWA

```bash
# Ejecutar script de generación de iconos
npm run pwa:generate-icons
```

### 7. Compilar Frontend

```bash
# Desarrollo
npm run dev

# Producción
npm run build
```

## ⚙️ Configuración Avanzada

### Multi-IA Orchestrator

Edita `backend/multi-ai-orchestrator.js` para configurar:

```javascript
const aiOrchestrator = new MultiAIOrchestrator({
  defaultStrategy: 'cascade',  // cascade, parallel, specialized
  fallbackChain: ['grok', 'meta', 'qwen', 'openai'],
  costLimit: 0.05,  // Límite de costo por request en USD
  maxRetries: 3,
  timeout: 30000  // 30 segundos
});
```

### Estrategias de Optimización

**1. Mínimo Costo (Recomendado para inicio):**
```javascript
fallbackChain: ['grok', 'meta', 'qwen', 'gemini']
costLimit: 0.01
```

**2. Máxima Calidad:**
```javascript
fallbackChain: ['openai', 'claude', 'deepseek']
costLimit: 0.10
```

**3. Balanceado:**
```javascript
fallbackChain: ['grok', 'meta', 'qwen', 'openai', 'claude']
costLimit: 0.05
```

### Routes Manager

Configurar threshold de desviación en `.env`:
```env
ROUTE_DEVIATION_THRESHOLD=100  # metros
ROUTE_DEFAULT_AVG_SPEED=30     # km/h
```

## 🏃 Ejecutar la Aplicación

### Modo Desarrollo

```bash
# Iniciar backend y frontend simultáneamente
npm run dev

# O por separado:
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

La aplicación estará disponible en:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **WebSocket:** ws://localhost:3001

### Modo Producción

```bash
# Compilar
npm run build

# Iniciar con PM2
npm run deploy

# O manualmente
NODE_ENV=production node backend/server.js
```

## 🧪 Verificación de Instalación

### 1. Health Check

```bash
curl http://localhost:3001/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-21T10:00:00.000Z",
  "uptime": 10.5,
  "environment": "development"
}
```

### 2. Verificar APIs de IA

```bash
curl http://localhost:3001/api/stats
```

Verifica que los modelos estén configurados correctamente en la respuesta.

### 3. Test de Perspectivas

```bash
curl http://localhost:3001/api/perspectives
```

Debería retornar lista de perspectivas disponibles.

### 4. Test de Rutas

```bash
curl http://localhost:3001/api/routes
```

Debería retornar las rutas de tours configuradas.

## 📱 Instalación PWA en Dispositivos

### Android (Chrome)

1. Abrir la app en Chrome
2. Tocar el menú (tres puntos)
3. Seleccionar "Instalar app" o "Añadir a pantalla de inicio"
4. Confirmar instalación

### iOS (Safari)

1. Abrir la app en Safari
2. Tocar el botón de compartir (cuadro con flecha)
3. Seleccionar "Añadir a pantalla de inicio"
4. Darle un nombre y confirmar

### Desktop (Chrome/Edge)

1. Abrir la app en el navegador
2. Ver ícono de instalación en la barra de direcciones
3. Click en "Instalar"
4. La app se abrirá en ventana standalone

## 🔧 Troubleshooting

### Error: VAPID keys not configured

**Solución:**
```bash
web-push generate-vapid-keys
# Copiar keys al .env
```

### Error: Cannot connect to database

**Solución:**
```bash
# Verificar PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar credenciales en .env
psql -U user -d spirit_tours -h localhost
```

### Error: AI API key invalid

**Solución:**
1. Verificar que la key esté correcta en `.env`
2. Verificar que la API key tenga créditos/saldo
3. Verificar que la API key tenga permisos correctos

### Error: WebSocket connection failed

**Solución:**
1. Verificar que el servidor backend esté corriendo
2. Verificar firewall no bloquea puerto 3001
3. Verificar configuración CORS en `backend/server.js`

### PWA no instala

**Solución:**
1. Verificar `manifest.json` está correctamente configurado
2. Verificar HTTPS está habilitado (requerido en producción)
3. Verificar Service Worker está registrado:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(console.log)
   ```

### Notificaciones no funcionan

**Solución:**
1. Verificar permisos de notificación en el navegador
2. Verificar VAPID keys configuradas correctamente
3. Verificar Service Worker activo
4. En Chrome DevTools: Application > Service Workers

## 🔐 Seguridad

### Producción Checklist

- [ ] Cambiar `JWT_SECRET` a un valor seguro y único
- [ ] Configurar `CORS_ORIGIN` con dominios específicos
- [ ] Habilitar HTTPS
- [ ] Configurar firewall apropiadamente
- [ ] Rotar API keys regularmente
- [ ] Implementar rate limiting estricto
- [ ] Habilitar Helmet.js (ya incluido)
- [ ] Configurar logs seguros (no guardar datos sensibles)
- [ ] Implementar autenticación robusta
- [ ] Auditar dependencias: `npm audit`

### Variables Sensibles

**NUNCA** commitear al repositorio:
- Archivos `.env`
- API keys
- Contraseñas
- Tokens de acceso
- Certificados SSL

## 📊 Monitoreo

### PM2 Dashboard

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs

# Monitoreo en tiempo real
pm2 monit
```

### Logs

Ubicación de logs:
```
logs/
├── error.log       # Solo errores
├── combined.log    # Todos los logs
└── access.log      # Logs de acceso HTTP
```

Ver logs en tiempo real:
```bash
tail -f logs/combined.log
```

## 🚀 Deploy a Producción

### Usando PM2

```bash
# Compilar
npm run build

# Deploy con PM2
pm2 start ecosystem.config.js --env production

# Guardar configuración
pm2 save

# Auto-start en reboot
pm2 startup
```

### Usando Docker

```bash
# Build image
docker build -t spirit-tours-guide-ai .

# Run container
docker run -d \
  -p 3001:3001 \
  --env-file .env \
  --name spirit-tours \
  spirit-tours-guide-ai
```

### Usando Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

## 📚 Recursos Adicionales

- [Documentación API](./API_DOCUMENTATION.md)
- [Guía de Contribución](./CONTRIBUTING.md)
- [Arquitectura del Sistema](./ARCHITECTURE.md)
- [FAQ](./FAQ.md)

## 🆘 Soporte

- **Issues:** https://github.com/spirit-tours/guide-ai/issues
- **Email:** support@spirit-tours.com
- **Discord:** https://discord.gg/spirit-tours

---

**¡Listo para comenzar! 🎉**

Si todo está configurado correctamente, deberías tener un sistema completo de guía turístico virtual con IA multiperspectiva funcionando perfectamente.
