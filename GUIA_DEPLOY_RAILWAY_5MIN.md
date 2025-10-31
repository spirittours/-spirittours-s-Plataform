# 🚀 GUÍA DEPLOY RAILWAY - 5 MINUTOS

## ⚡ DEPLOY ULTRA RÁPIDO DE SPIRIT TOURS

Esta guía te permite tener tu sistema **FUNCIONANDO EN PRODUCCIÓN** en menos de 5 minutos.

---

## 📋 PRERREQUISITOS

- ✅ Cuenta GitHub (ya tienes)
- ✅ Código pusheado a GitHub (ya está)
- ✅ Tarjeta de crédito (para Railway, plan desde $5/mes)

---

## 🎯 PASO 1: CREAR CUENTA RAILWAY (1 minuto)

### 1.1 Ir a Railway
```
🌐 https://railway.app
```

### 1.2 Sign Up
```
• Click "Start a New Project"
• Sign up with GitHub
• Autorizar Railway a acceder a tus repos
```

### 1.3 Crédito Gratis
```
✅ Railway te da $5 USD gratis para probar
✅ Sin necesidad de tarjeta para empezar
```

---

## 🗄️ PASO 2: CREAR BASE DE DATOS (30 segundos)

### 2.1 En tu proyecto Railway:
```
1. Click "+ New"
2. Seleccionar "Database"
3. Click "PostgreSQL"
4. Esperar 10 segundos
```

### 2.2 Listo! 
```
✅ PostgreSQL creado
✅ Credenciales generadas automáticamente
✅ Variable DATABASE_URL disponible
```

---

## 🐍 PASO 3: DEPLOY BACKEND (2 minutos)

### 3.1 Conectar Repositorio:
```
1. Click "+ New"
2. "Deploy from GitHub repo"
3. Buscar: "spirittours/-spirittours-s-Plataform"
4. Click en tu repo
```

### 3.2 Railway Detecta Automáticamente:
```
✅ Detecta Python
✅ Detecta requirements.txt
✅ Configura build automático
```

### 3.3 Configurar Variables de Entorno:

En la sección "Variables", agregar:

```env
# Base de datos (Railway lo genera automáticamente)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Python
PYTHON_VERSION=3.11

# App
PORT=8000
DEBUG=false

# OpenAI (opcional, para features IA)
OPENAI_API_KEY=sk-tu-api-key-aqui

# WhatsApp (opcional)
WHATSAPP_ENABLED=false
```

### 3.4 Deploy Automático
```
✅ Railway hace build automáticamente
✅ Instala dependencias
✅ Inicia uvicorn
✅ Genera URL pública
```

**Tu backend estará en:** `https://tu-proyecto-production.up.railway.app`

---

## 🔧 PASO 4: CONFIGURAR BACKEND (1 minuto)

### 4.1 Crear archivo railway.json en tu repo:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "cd /app && python backend/migrations/create_operations_tables.py && uvicorn backend.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 4.2 O usar Procfile (más simple):

```procfile
web: python backend/migrations/create_operations_tables.py && uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

### 4.3 Push a GitHub:
```bash
git add railway.json
git commit -m "feat: Agregar config Railway"
git push origin main
```

Railway detectará el cambio y hará redeploy automáticamente.

---

## 🌐 PASO 5: DEPLOY FRONTEND (1 minuto)

### 5.1 Ir a Cloudflare Pages:
```
🌐 https://pages.cloudflare.com
```

### 5.2 Conectar GitHub:
```
1. Sign up con GitHub
2. Click "Create a project"
3. Seleccionar tu repo: spirittours/-spirittours-s-Plataform
```

### 5.3 Configurar Build:

```yaml
Framework preset: React
Build command: npm run build
Build output directory: /frontend/dist
Root directory: /frontend

Environment variables:
NEXT_PUBLIC_API_URL=https://tu-proyecto-production.up.railway.app
```

### 5.4 Deploy:
```
✅ Click "Save and Deploy"
✅ Cloudflare hace build
✅ Tu frontend estará en: https://spirittours.pages.dev
```

---

## ✅ PASO 6: VERIFICAR QUE TODO FUNCIONA (30 segundos)

### 6.1 Probar Backend:
```bash
# Health check
curl https://tu-proyecto-production.up.railway.app/health

# Operations endpoints
curl https://tu-proyecto-production.up.railway.app/api/operations/providers

# Documentación interactiva
https://tu-proyecto-production.up.railway.app/docs
```

### 6.2 Probar Frontend:
```
1. Abrir: https://spirittours.pages.dev
2. Verificar que carga correctamente
3. Probar login/navegación
```

---

## 🎉 ¡LISTO! SISTEMA EN PRODUCCIÓN

```
┌──────────────────────────────────────────────┐
│  ✅ Backend funcionando en Railway           │
│  ✅ Frontend funcionando en Cloudflare       │
│  ✅ PostgreSQL configurado                   │
│  ✅ SSL automático                           │
│  ✅ Deploy automático desde GitHub           │
│  ✅ Logs en tiempo real                      │
└──────────────────────────────────────────────┘
```

---

## 💰 COSTOS

### Estimado Mensual:
```
Railway Backend:     $5-10/mes
Cloudflare Pages:    $0/mes
PostgreSQL:          Incluido
SSL/CDN:             Incluido
──────────────────────────────
TOTAL:               $5-10/mes
```

---

## 🔄 ACTUALIZACIONES FUTURAS

### Deploy Automático:
```bash
# Cada vez que hagas push a main:
git add .
git commit -m "feat: Nueva funcionalidad"
git push origin main

# Railway y Cloudflare hacen deploy automático
# ¡No necesitas hacer nada más!
```

---

## 📊 MONITOREO

### Ver Logs en Railway:
```
1. Ir a tu proyecto en Railway
2. Click en el servicio backend
3. Ver tab "Logs"
4. Logs en tiempo real
```

### Métricas:
```
1. Tab "Metrics"
2. Ver CPU, RAM, Network
3. Alertas automáticas si hay problemas
```

---

## 🔧 TROUBLESHOOTING RÁPIDO

### Error: Build Failed
```bash
# Verificar requirements.txt tiene todas las dependencias:
sqlalchemy
fastapi
uvicorn
psycopg2-binary
python-dotenv
pydantic-settings
```

### Error: Database Connection
```bash
# Verificar variable DATABASE_URL está configurada:
# En Railway → Variables → DATABASE_URL
```

### Error: Frontend no conecta con Backend
```bash
# Verificar NEXT_PUBLIC_API_URL en Cloudflare:
# Settings → Environment variables
# NEXT_PUBLIC_API_URL = https://tu-backend.railway.app
```

---

## 🎯 PRÓXIMOS PASOS

Una vez funcionando:

### 1. Configurar Dominio Custom (Opcional)
```
# En Cloudflare Pages:
• Agregar dominio: operations.spirittours.com
• DNS automático
• SSL automático
```

### 2. Habilitar Features Avanzados
```
# Agregar en Railway variables:
OPENAI_API_KEY=sk-tu-key          # Para IA
WHATSAPP_ACCESS_TOKEN=tu-token    # Para WhatsApp
```

### 3. Importar Datos Históricos
```bash
# Desde Railway CLI:
railway run python scripts/import_historical_data.py --file datos.xlsx
```

### 4. Capacitar Equipo
```
• Compartir URLs de producción
• Entregar manual: MANUAL_CAPACITACION_OPERACIONES.md
• Crear cuentas de usuario
```

---

## 🆘 SOPORTE

### Railway:
- 📚 Docs: https://docs.railway.app
- 💬 Discord: https://discord.gg/railway
- 🐦 Twitter: @Railway

### Cloudflare:
- 📚 Docs: https://developers.cloudflare.com/pages
- 💬 Community: https://community.cloudflare.com
- 🐦 Twitter: @Cloudflare

---

## 📱 RAILWAY CLI (Opcional)

### Instalar:
```bash
npm i -g @railway/cli
```

### Login:
```bash
railway login
```

### Comandos Útiles:
```bash
railway link                    # Vincular proyecto
railway logs                    # Ver logs
railway run python script.py    # Ejecutar comando
railway variables               # Ver variables
railway status                  # Ver estado
```

---

## 🎊 RESUMEN VISUAL

```
PASO 1: Railway Account           [1 min]  ✅
PASO 2: PostgreSQL Database        [30 seg] ✅
PASO 3: Deploy Backend             [2 min]  ✅
PASO 4: Configurar Backend         [1 min]  ✅
PASO 5: Deploy Frontend            [1 min]  ✅
PASO 6: Verificar Todo             [30 seg] ✅
─────────────────────────────────────────────
TOTAL:                             5 minutos ✅

RESULTADO:
✅ Sistema en producción
✅ URL pública funcionando
✅ SSL/HTTPS automático
✅ Deploy automático
✅ Backups automáticos
✅ Listo para usar
```

---

**🚀 ¡Tu Sistema de Operaciones está LIVE en 5 minutos!**

**URLs de Ejemplo:**
- Backend: `https://spirittours-ops.up.railway.app`
- Frontend: `https://spirittours.pages.dev`
- Docs API: `https://spirittours-ops.up.railway.app/docs`

**¿Listo para empezar? ¡Crea tu cuenta Railway ahora! 🎉**
