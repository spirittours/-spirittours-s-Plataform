# 🚀 Production Deployment Guide - Spirit Tours Frontend

## 📋 Tabla de Contenidos

1. [Pre-requisitos](#pre-requisitos)
2. [Configuración de Entorno](#configuración-de-entorno)
3. [Build para Producción](#build-para-producción)
4. [Opciones de Deployment](#opciones-de-deployment)
5. [Optimizaciones](#optimizaciones)
6. [Monitoreo](#monitoreo)
7. [Rollback](#rollback)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-requisitos

### Software Requerido

- **Node.js**: v18.x o superior
- **npm**: v9.x o superior
- **Git**: Para control de versiones

### Verificación del Sistema

```bash
# Verificar versiones
node --version  # debe ser >= 18.x
npm --version   # debe ser >= 9.x
git --version

# Verificar que el proyecto se puede construir localmente
cd /home/user/webapp/frontend
npm install
npm run build
```

### Dependencias del Proyecto

Todas las dependencias están definidas en `package.json`:

- **React**: 19.1.1
- **TypeScript**: 4.9.5
- **Material-UI**: 7.3.4
- **Axios**: 1.12.2
- **Recharts**: 2.12.1
- **React Router**: 7.9.1

---

## 🔧 Configuración de Entorno

### 1. Variables de Entorno

Crear archivo `.env.production` en `frontend/`:

```bash
# API Configuration
VITE_API_URL=https://api.spirittours.com/api
VITE_WS_URL=wss://api.spirittours.com/ws

# Stripe Configuration (Production)
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# PayPal Configuration (Production)
VITE_PAYPAL_CLIENT_ID=...

# Feature Flags
VITE_ENABLE_AI_AGENTS=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PORTALS=true
VITE_ENABLE_PAYMENTS=true
VITE_ENABLE_FILES=true
VITE_ENABLE_NOTIFICATIONS=true

# Analytics (opcional)
VITE_GOOGLE_ANALYTICS_ID=G-...
VITE_SENTRY_DSN=https://...

# Build Configuration
VITE_APP_VERSION=2.0.0
VITE_BUILD_DATE=$(date +%Y-%m-%d)
```

### 2. Configuración de CORS en Backend

Asegurarse de que el backend permita el dominio de producción:

```python
# backend/config.py
allowed_origins = [
    "https://spirittours.com",
    "https://www.spirittours.com",
    "https://app.spirittours.com"
]
```

### 3. Configuración de Proxy (si aplica)

Si se usa Nginx como proxy inverso:

```nginx
# /etc/nginx/sites-available/spirittours
server {
    listen 80;
    server_name spirittours.com www.spirittours.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name spirittours.com www.spirittours.com;

    ssl_certificate /etc/letsencrypt/live/spirittours.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/spirittours.com/privkey.pem;

    root /var/www/spirittours/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;

    # Frontend static files
    location / {
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:8000/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:8000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:;" always;
}
```

---

## 🏗️ Build para Producción

### Paso 1: Preparar el Entorno

```bash
cd /home/user/webapp/frontend

# Limpiar builds anteriores
rm -rf build/
rm -rf node_modules/

# Instalar dependencias limpias
npm ci  # usa package-lock.json exacto
```

### Paso 2: Ejecutar Build

```bash
# Build optimizado para producción
npm run build

# Output esperado:
# ✓ Creating an optimized production build...
# ✓ Compiled successfully!
# 
# File sizes after gzip:
#   XX.XX KB  build/static/js/main.xxxxxxxx.js
#   XX.XX KB  build/static/css/main.xxxxxxxx.css
```

### Paso 3: Verificar Build

```bash
# Verificar estructura de archivos
ls -la build/

# Debe contener:
# - index.html
# - asset-manifest.json
# - static/js/
# - static/css/
# - static/media/

# Probar build localmente
npx serve -s build -p 3000

# Abrir http://localhost:3000 y verificar funcionamiento
```

### Paso 4: Análisis del Bundle (opcional)

```bash
# Instalar herramienta de análisis
npm install --save-dev source-map-explorer

# Agregar script a package.json
"scripts": {
  "analyze": "source-map-explorer 'build/static/js/*.js'"
}

# Ejecutar análisis
npm run analyze
```

---

## 🌐 Opciones de Deployment

### Opción 1: Vercel (Recomendado para Frontend)

#### A. Deployment desde CLI

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend/
vercel --prod

# Configurar variables de entorno en Vercel Dashboard
# https://vercel.com/spirittours/settings/environment-variables
```

#### B. Deployment desde GitHub

1. Conectar repositorio en Vercel Dashboard
2. Configurar build settings:
   - Framework Preset: Create React App
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Root Directory: `frontend`
3. Agregar variables de entorno
4. Deploy automático en cada push a `main`

**Ventajas**:
- ✅ CDN global automático
- ✅ HTTPS automático
- ✅ Zero-config
- ✅ Rollback fácil

---

### Opción 2: Netlify

#### A. Deployment desde CLI

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Inicializar
cd frontend/
netlify init

# Deploy
netlify deploy --prod
```

#### B. Configuración netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "build"
  base = "frontend"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "https://api.spirittours.com/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "no-referrer-when-downgrade"

[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

**Ventajas**:
- ✅ CDN global
- ✅ HTTPS automático
- ✅ Forms y Functions integrados
- ✅ Split testing A/B

---

### Opción 3: AWS S3 + CloudFront

#### Paso 1: Crear S3 Bucket

```bash
# Crear bucket
aws s3 mb s3://spirittours-frontend

# Configurar como website
aws s3 website s3://spirittours-frontend \
  --index-document index.html \
  --error-document index.html

# Configurar política de acceso público
aws s3api put-bucket-policy \
  --bucket spirittours-frontend \
  --policy file://bucket-policy.json
```

`bucket-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::spirittours-frontend/*"
    }
  ]
}
```

#### Paso 2: Upload Build

```bash
# Build
npm run build

# Sync to S3
aws s3 sync build/ s3://spirittours-frontend \
  --delete \
  --cache-control "max-age=31536000" \
  --exclude "index.html" \
  --exclude "asset-manifest.json"

# Upload index.html sin cache
aws s3 cp build/index.html s3://spirittours-frontend/index.html \
  --cache-control "max-age=0, no-cache, no-store, must-revalidate"
```

#### Paso 3: CloudFront Distribution

1. Crear CloudFront distribution
2. Origin: S3 bucket
3. Default Root Object: `index.html`
4. Error Pages: 403, 404 → `/index.html` (200)
5. SSL Certificate: Request from ACM

**Ventajas**:
- ✅ Control total
- ✅ CDN global
- ✅ Escalabilidad ilimitada
- ✅ Bajo costo

---

### Opción 4: Docker + Kubernetes

#### Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build
COPY . .
RUN npm run build

# Production stage con nginx
FROM nginx:alpine

# Copy build
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /static {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

#### Build y Deploy

```bash
# Build image
docker build -t spirittours-frontend:latest .

# Test locally
docker run -p 8080:80 spirittours-frontend:latest

# Push to registry
docker tag spirittours-frontend:latest registry.example.com/spirittours-frontend:latest
docker push registry.example.com/spirittours-frontend:latest

# Deploy to Kubernetes
kubectl apply -f k8s-deployment.yaml
```

---

### Opción 5: VPS Tradicional (DigitalOcean, Linode)

```bash
# SSH al servidor
ssh user@server-ip

# Instalar dependencias
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx

# Clonar repositorio
git clone https://github.com/spirittours/-spirittours-s-Plataform.git
cd -spirittours-s-Plataform/frontend

# Build
npm ci
npm run build

# Mover build a nginx
sudo mkdir -p /var/www/spirittours
sudo cp -r build/* /var/www/spirittours/

# Configurar nginx (ver sección anterior)
sudo nano /etc/nginx/sites-available/spirittours
sudo ln -s /etc/nginx/sites-available/spirittours /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL con Let's Encrypt
sudo certbot --nginx -d spirittours.com -d www.spirittours.com
```

---

## ⚡ Optimizaciones

### 1. Code Splitting

El proyecto ya usa React.lazy() para code splitting. Verificar con:

```bash
npm run build
# Verificar múltiples chunks en build/static/js/
```

### 2. Image Optimization

```bash
# Instalar herramienta
npm install --save-dev imagemin imagemin-webp

# Script para optimizar imágenes
node scripts/optimize-images.js
```

### 3. Service Worker (PWA)

El proyecto incluye service worker. Para habilitarlo en producción:

```typescript
// frontend/src/index.tsx
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

serviceWorkerRegistration.register();
```

### 4. Bundle Optimization

```json
// frontend/package.json
"scripts": {
  "build": "GENERATE_SOURCEMAP=false react-scripts build"
}
```

### 5. Caching Strategy

Headers de cache recomendados:

```
# Static assets (con hash en nombre)
Cache-Control: public, max-age=31536000, immutable

# index.html
Cache-Control: no-cache, no-store, must-revalidate

# API requests
Cache-Control: private, max-age=0, must-revalidate
```

---

## 📊 Monitoreo

### 1. Error Tracking con Sentry

```bash
npm install @sentry/react

# frontend/src/index.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 2. Analytics con Google Analytics

```bash
npm install react-ga4

# frontend/src/index.tsx
import ReactGA from 'react-ga4';

ReactGA.initialize(process.env.VITE_GOOGLE_ANALYTICS_ID);
```

### 3. Performance Monitoring

```typescript
// frontend/src/reportWebVitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 4. Uptime Monitoring

Servicios recomendados:
- **UptimeRobot** (gratis para 50 monitores)
- **Pingdom**
- **StatusCake**

---

## 🔄 Rollback

### Vercel/Netlify

```bash
# Ver deployments
vercel ls
netlify sites:list

# Rollback a deployment anterior
vercel rollback deployment-url
netlify sites:rollback site-id
```

### S3 + CloudFront

```bash
# Habilitar versioning en S3
aws s3api put-bucket-versioning \
  --bucket spirittours-frontend \
  --versioning-configuration Status=Enabled

# Restaurar versión anterior
aws s3api list-object-versions --bucket spirittours-frontend
aws s3api copy-object \
  --bucket spirittours-frontend \
  --copy-source spirittours-frontend/index.html?versionId=VERSION_ID \
  --key index.html

# Invalidar CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

### Docker/Kubernetes

```bash
# Rollback deployment
kubectl rollout undo deployment/spirittours-frontend

# Ver historial
kubectl rollout history deployment/spirittours-frontend

# Rollback a versión específica
kubectl rollout undo deployment/spirittours-frontend --to-revision=2
```

---

## 🐛 Troubleshooting

### Problema 1: Blank Page después del deploy

**Causa**: Rutas incorrectas en build

**Solución**:
```json
// frontend/package.json
{
  "homepage": "."  // Para deployment en subdirectorio
}
```

### Problema 2: 404 en rutas de React Router

**Causa**: Servidor no redirige a index.html

**Solución Nginx**:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Problema 3: CORS errors

**Causa**: Backend no permite origen del frontend

**Solución Backend**:
```python
allowed_origins = [
    "https://spirittours.com",
    "https://www.spirittours.com"
]
```

### Problema 4: WebSocket no conecta

**Causa**: Proxy no configurado para WebSocket

**Solución Nginx**:
```nginx
location /ws {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Problema 5: Build falla con memory error

**Solución**:
```bash
# Aumentar memoria de Node.js
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

---

## 📝 Checklist Pre-Deployment

- [ ] Build local exitoso
- [ ] Variables de entorno configuradas
- [ ] SSL configurado (HTTPS)
- [ ] CORS configurado en backend
- [ ] WebSocket proxy configurado
- [ ] Caching headers configurados
- [ ] Error tracking configurado (Sentry)
- [ ] Analytics configurado (GA4)
- [ ] Backup strategy definida
- [ ] Rollback plan documentado
- [ ] Monitoreo de uptime configurado
- [ ] Performance baseline establecida

---

## 🎯 Post-Deployment

1. **Verificar funcionalidad**:
   - Login/Logout
   - Navegación entre páginas
   - API calls funcionan
   - WebSocket conecta
   - File uploads funcionan
   - Payments funcionan (test mode primero)

2. **Performance tests**:
   - Lighthouse score >90
   - First Contentful Paint <1.8s
   - Time to Interactive <3.8s
   - Largest Contentful Paint <2.5s

3. **Monitoreo continuo**:
   - Revisar errores en Sentry
   - Revisar analytics en GA4
   - Revisar uptime en UptimeRobot
   - Revisar logs del servidor

---

## 📞 Soporte

Para problemas de deployment:
- Revisar logs del servidor: `nginx -t && tail -f /var/log/nginx/error.log`
- Revisar build logs
- Verificar variables de entorno
- Verificar conectividad backend

---

**Última actualización**: 31 de Octubre, 2025
**Versión del Frontend**: 2.0.0
**Estado**: ✅ Listo para deployment a producción
