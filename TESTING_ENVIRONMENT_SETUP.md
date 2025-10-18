# Testing Environment Setup - Spirit Tours Platform

## 📋 Tabla de Contenidos

1. [Requisitos del Sistema](#requisitos-del-sistema)
2. [Configuración de Base de Datos](#configuración-de-base-de-datos)
3. [Variables de Entorno](#variables-de-entorno)
4. [Instalación de Dependencias](#instalación-de-dependencias)
5. [Configuración del Backend](#configuración-del-backend)
6. [Configuración del Frontend](#configuración-del-frontend)
7. [Seeding de Datos Iniciales](#seeding-de-datos-iniciales)
8. [Ejecución del Sistema](#ejecución-del-sistema)
9. [Pruebas del Sistema](#pruebas-del-sistema)
10. [Troubleshooting](#troubleshooting)

---

## 🖥️ Requisitos del Sistema

### Software Requerido

| Componente | Versión Mínima | Versión Recomendada | Notas |
|------------|----------------|---------------------|-------|
| **Python** | 3.9+ | 3.11+ | Con pip |
| **Node.js** | 16.x | 18.x LTS | Con npm |
| **PostgreSQL** | 12+ | 14+ | Base de datos principal |
| **Git** | 2.30+ | Latest | Control de versiones |
| **Docker** (opcional) | 20.10+ | Latest | Para contenedores |

### Recursos de Hardware

**Desarrollo Local:**
- **CPU:** 2 cores mínimo, 4+ recomendado
- **RAM:** 8GB mínimo, 16GB recomendado
- **Disco:** 20GB espacio libre mínimo
- **Internet:** Conexión estable para descargas

**Servidor de Staging:**
- **CPU:** 4 cores
- **RAM:** 16GB
- **Disco:** 50GB SSD
- **Bandwidth:** 100Mbps

---

## 🗄️ Configuración de Base de Datos

### Opción 1: PostgreSQL Local

#### Instalación en Ubuntu/Debian:
```bash
# Actualizar repositorios
sudo apt update

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Verificar instalación
psql --version
```

#### Instalación en macOS:
```bash
# Con Homebrew
brew install postgresql@14

# Iniciar servicio
brew services start postgresql@14
```

#### Instalación en Windows:
1. Descargar instalador desde [PostgreSQL.org](https://www.postgresql.org/download/windows/)
2. Ejecutar instalador
3. Configurar password para usuario `postgres`
4. Iniciar servicio desde Services

#### Crear Base de Datos:
```bash
# Conectar como superusuario
sudo -u postgres psql

# Dentro de psql:
CREATE DATABASE spirittours;
CREATE USER spirittours_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE spirittours TO spirittours_user;

# Salir
\q
```

### Opción 2: PostgreSQL con Docker

```bash
# Crear y ejecutar contenedor PostgreSQL
docker run --name spirittours-postgres \
  -e POSTGRES_DB=spirittours \
  -e POSTGRES_USER=spirittours_user \
  -e POSTGRES_PASSWORD=your_secure_password_here \
  -p 5432:5432 \
  -v spirittours_data:/var/lib/postgresql/data \
  -d postgres:14

# Verificar que está corriendo
docker ps
```

### Opción 3: Base de Datos en la Nube

**Heroku Postgres:**
```bash
# Instalar Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Crear app y agregar Postgres
heroku create spirittours-staging
heroku addons:create heroku-postgresql:hobby-dev

# Obtener DATABASE_URL
heroku config:get DATABASE_URL
```

**AWS RDS:**
1. Ir a AWS Console → RDS
2. Create Database → PostgreSQL
3. Configurar:
   - Instance type: db.t3.micro (free tier)
   - Storage: 20GB
   - Public access: Yes (solo para testing)
   - VPC security group: Permitir puerto 5432
4. Anotar endpoint y credenciales

---

## 🔐 Variables de Entorno

### Crear archivo `.env`

En la raíz del proyecto (`/home/user/webapp/`), crear archivo `.env`:

```bash
# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
DATABASE_URL=postgresql://spirittours_user:your_secure_password_here@localhost:5432/spirittours

# ============================================================================
# SECURITY & AUTHENTICATION
# ============================================================================
# Generar con: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your_fernet_key_here

# Generar con: openssl rand -hex 32
SECRET_KEY=your_secret_key_for_jwt_here

JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# ============================================================================
# API CONFIGURATION
# ============================================================================
API_TITLE="Spirit Tours Platform API"
API_VERSION="1.0.0"
API_DESCRIPTION="Training and Management System for Spirit Tours"

# Entorno: development, staging, production
ENVIRONMENT=staging

# ============================================================================
# SMTP CONFIGURATION (Opcional - Se puede configurar en UI después)
# ============================================================================
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USERNAME=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
# SMTP_FROM_EMAIL=noreply@spirittours.com
# SMTP_FROM_NAME="Spirit Tours"
# SMTP_USE_TLS=true

# ============================================================================
# AI PROVIDER CONFIGURATION (Opcional - Se puede configurar en UI después)
# ============================================================================
# OPENAI_API_KEY=sk-...
# GOOGLE_AI_API_KEY=...
# ANTHROPIC_API_KEY=...

# ============================================================================
# FRONTEND CONFIGURATION
# ============================================================================
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENVIRONMENT=staging

# ============================================================================
# CORS CONFIGURATION
# ============================================================================
CORS_ORIGINS=http://localhost:3000,http://localhost:8000

# ============================================================================
# LOGGING
# ============================================================================
LOG_LEVEL=INFO
LOG_FILE=logs/spirittours.log

# ============================================================================
# REDIS (Opcional - Para caché)
# ============================================================================
# REDIS_URL=redis://localhost:6379/0

# ============================================================================
# FILE STORAGE (Opcional)
# ============================================================================
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# AWS_S3_BUCKET=spirittours-media
# AWS_REGION=us-east-1
```

### Generar Claves de Seguridad

```bash
# Generar ENCRYPTION_KEY (Fernet)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Generar SECRET_KEY (JWT)
openssl rand -hex 32
```

---

## 📦 Instalación de Dependencias

### Backend (Python)

```bash
cd /home/user/webapp

# Crear entorno virtual
python3 -m venv venv

# Activar entorno virtual
# En Linux/macOS:
source venv/bin/activate
# En Windows:
venv\Scripts\activate

# Instalar dependencias
pip install --upgrade pip
pip install -r backend/requirements.txt

# Verificar instalación
python -c "import fastapi, sqlalchemy, pydantic; print('✅ Backend dependencies installed')"
```

#### `backend/requirements.txt` debe incluir:
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
cryptography==41.0.7
apscheduler==3.10.4
requests==2.31.0
python-dotenv==1.0.0
alembic==1.13.0
```

### Frontend (React)

```bash
cd /home/user/webapp/frontend

# Instalar dependencias
npm install

# Verificar instalación
npm list react react-dom @mui/material
```

#### `frontend/package.json` debe incluir:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@mui/material": "^5.14.0",
    "@mui/icons-material": "^5.14.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "axios": "^1.6.0",
    "react-router-dom": "^6.20.0",
    "typescript": "^5.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "vite": "^5.0.0"
  }
}
```

---

## ⚙️ Configuración del Backend

### 1. Configurar Alembic (Migraciones)

```bash
cd /home/user/webapp

# Inicializar Alembic (si no existe)
alembic init alembic

# Editar alembic.ini - Cambiar sqlalchemy.url
# Comentar la línea existente y agregar:
# sqlalchemy.url = 

# Editar alembic/env.py - Agregar después de imports:
import sys
import os
from pathlib import Path

# Agregar path del proyecto
sys.path.insert(0, str(Path(__file__).parent.parent))

# Importar Base y modelos
from backend.models.rbac_models import Base
from backend.models.training_models import *
from backend.models.system_configuration_models import *
from backend.models.ticketing_models import *

# En la función run_migrations_online(), modificar:
config.set_main_option('sqlalchemy.url', os.getenv('DATABASE_URL'))

# Y agregar target_metadata:
target_metadata = Base.metadata
```

### 2. Generar Migraciones

```bash
# Generar migración inicial
alembic revision --autogenerate -m "Initial schema - Training, Configuration, Ticketing systems"

# Revisar el archivo generado en alembic/versions/

# Aplicar migraciones
alembic upgrade head

# Verificar tablas creadas
psql -U spirittours_user -d spirittours -c "\dt"
```

### 3. Crear Usuario Administrador

```bash
# Crear script temporal: create_admin.py
cat > create_admin.py << 'EOF'
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os
from backend.models.rbac_models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin():
    DATABASE_URL = os.getenv('DATABASE_URL').replace('postgresql://', 'postgresql+asyncpg://')
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Crear usuario admin
        admin = User(
            email="admin@spirittours.com",
            username="admin",
            hashed_password=pwd_context.hash("Admin123!"),
            full_name="Administrator",
            is_active=True,
            is_superuser=True
        )
        session.add(admin)
        await session.commit()
        print("✅ Usuario administrador creado:")
        print(f"   Email: admin@spirittours.com")
        print(f"   Password: Admin123!")
        print(f"   ⚠️  CAMBIAR ESTA CONTRASEÑA EN PRODUCCIÓN")

if __name__ == "__main__":
    asyncio.run(create_admin())
EOF

# Ejecutar script
python create_admin.py

# Eliminar script
rm create_admin.py
```

---

## 🎨 Configuración del Frontend

### 1. Configurar Variables de Entorno

Crear `frontend/.env`:
```bash
VITE_API_URL=http://localhost:8000
VITE_ENVIRONMENT=staging
```

### 2. Verificar Configuración de Vite

Editar `frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

---

## 🌱 Seeding de Datos Iniciales

### 1. Ejecutar Script de Seeding de Capacitación

```bash
cd /home/user/webapp

# Activar entorno virtual
source venv/bin/activate

# Ejecutar seeding
python -m backend.scripts.seed_training_content

# Verificar datos creados
psql -U spirittours_user -d spirittours -c "SELECT COUNT(*) FROM training_modules;"
psql -U spirittours_user -d spirittours -c "SELECT COUNT(*) FROM training_lessons;"
psql -U spirittours_user -d spirittours -c "SELECT COUNT(*) FROM training_quizzes;"
```

### 2. Datos Creados

✅ **Módulos:** 3 módulos (Introducción, Destinos, Ventas)
✅ **Lecciones:** 9 lecciones con contenido HTML rico
✅ **Quizzes:** 3 quizzes con 30 preguntas total
✅ **Horas de Contenido:** 11 horas

### 3. Crear Datos de Prueba Adicionales (Opcional)

```bash
# Script para crear usuarios de prueba
cat > create_test_users.py << 'EOF'
# Similar al script create_admin.py pero creando múltiples usuarios
EOF

python create_test_users.py
```

---

## 🚀 Ejecución del Sistema

### Opción 1: Ejecución Manual (Desarrollo)

#### Terminal 1 - Backend:
```bash
cd /home/user/webapp
source venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

#### Terminal 2 - Frontend:
```bash
cd /home/user/webapp/frontend
npm run dev
```

#### Terminal 3 - Scheduler (Recordatorios):
```bash
cd /home/user/webapp
source venv/bin/activate
python backend/services/training_scheduler.py
```

### Opción 2: Docker Compose (Staging)

Crear `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: spirittours
      POSTGRES_USER: spirittours_user
      POSTGRES_PASSWORD: your_password_here
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://spirittours_user:your_password_here@postgres:5432/spirittours
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - postgres
    command: uvicorn backend.main:app --host 0.0.0.0 --port 8000

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend

volumes:
  postgres_data:
```

```bash
# Construir y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

### Opción 3: PM2 (Producción)

```bash
# Instalar PM2
npm install -g pm2

# Crear ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'spirittours-backend',
      script: 'uvicorn',
      args: 'backend.main:app --host 0.0.0.0 --port 8000',
      interpreter: 'python',
      cwd: '/home/user/webapp',
      env: {
        PYTHON_PATH: '/home/user/webapp/venv/bin/python'
      }
    },
    {
      name: 'spirittours-scheduler',
      script: 'python',
      args: 'backend/services/training_scheduler.py',
      cwd: '/home/user/webapp',
      env: {
        PYTHON_PATH: '/home/user/webapp/venv/bin/python'
      }
    }
  ]
}
EOF

# Iniciar servicios
pm2 start ecosystem.config.js

# Ver estado
pm2 status

# Ver logs
pm2 logs

# Guardar configuración
pm2 save

# Autostart en boot
pm2 startup
```

---

## 🧪 Pruebas del Sistema

### 1. Pruebas de Salud del Backend

```bash
# Health check
curl http://localhost:8000/health

# Docs interactivas
open http://localhost:8000/docs

# Redoc
open http://localhost:8000/redoc
```

### 2. Pruebas de Autenticación

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@spirittours.com&password=Admin123!"

# Obtener token y guardarlo
export TOKEN="eyJ..."

# Probar endpoint protegido
curl http://localhost:8000/api/training/modules \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Pruebas del Frontend

```bash
# Abrir en navegador
open http://localhost:3000

# Credenciales:
# Email: admin@spirittours.com
# Password: Admin123!
```

### 4. Checklist de Funcionalidades

#### Sistema de Capacitación:
- [ ] Ver módulos en dashboard de empleado
- [ ] Iniciar módulo
- [ ] Ver lección (video, documento, artículo)
- [ ] Tomar quiz
- [ ] Ver progreso
- [ ] Ver certificados

#### Panel de Administración:
- [ ] Crear módulo
- [ ] Crear lección
- [ ] Crear quiz
- [ ] Ver progreso de usuarios
- [ ] Enviar recordatorios manuales

#### Sistema de Configuración:
- [ ] Acceder a Configuration Dashboard
- [ ] Seleccionar modo Wizard
- [ ] Configurar SMTP (probar conexión)
- [ ] Configurar proveedor AI (probar conexión)
- [ ] Completar wizard
- [ ] Acceder a modo Manual
- [ ] CRUD de configuraciones SMTP
- [ ] CRUD de proveedores AI
- [ ] Ajustar prioridades

#### Chatbot de Práctica:
- [ ] Seleccionar persona
- [ ] Seleccionar escenario
- [ ] Enviar mensajes
- [ ] Recibir respuestas del AI
- [ ] Ver puntuación en tiempo real
- [ ] Completar conversación
- [ ] Ver evaluación final

---

## 🔧 Troubleshooting

### Problema: No se puede conectar a la base de datos

**Síntomas:**
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Soluciones:**
1. Verificar que PostgreSQL está corriendo:
   ```bash
   # Linux
   sudo systemctl status postgresql
   
   # macOS
   brew services list
   
   # Docker
   docker ps
   ```

2. Verificar credenciales en `.env`
3. Verificar que el puerto 5432 está abierto:
   ```bash
   sudo netstat -tuln | grep 5432
   ```

4. Verificar que el usuario tiene permisos:
   ```bash
   psql -U spirittours_user -d spirittours -c "SELECT 1;"
   ```

### Problema: Error de migración Alembic

**Síntomas:**
```
alembic.util.exc.CommandError: Target database is not up to date
```

**Soluciones:**
```bash
# Ver estado actual
alembic current

# Ver historial
alembic history

# Revertir una migración
alembic downgrade -1

# Aplicar todas las migraciones
alembic upgrade head

# Si hay conflictos, generar nueva migración
alembic revision --autogenerate -m "Fix conflicts"
```

### Problema: Frontend no se conecta al Backend

**Síntomas:**
```
Network Error: Failed to fetch
```

**Soluciones:**
1. Verificar que el backend está corriendo:
   ```bash
   curl http://localhost:8000/health
   ```

2. Verificar configuración CORS en backend:
   ```python
   # En backend/main.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:3000"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. Verificar `.env` del frontend:
   ```bash
   cat frontend/.env
   # Debe tener: VITE_API_URL=http://localhost:8000
   ```

4. Limpiar caché y rebuild:
   ```bash
   cd frontend
   rm -rf node_modules .vite
   npm install
   npm run dev
   ```

### Problema: SMTP no envía correos

**Síntomas:**
```
SMTPAuthenticationError: (535, b'5.7.8 Username and Password not accepted')
```

**Soluciones:**
1. **Gmail:** Usar contraseña de aplicación, no contraseña normal
   - Ir a cuenta Google → Seguridad → Verificación en dos pasos
   - Contraseñas de aplicaciones → Generar nueva

2. **Verificar configuración:**
   ```python
   # Probar SMTP manualmente
   import smtplib
   server = smtplib.SMTP('smtp.gmail.com', 587)
   server.starttls()
   server.login('your-email@gmail.com', 'your-app-password')
   server.quit()
   print("✅ SMTP OK")
   ```

3. **Permitir apps menos seguras** (no recomendado para producción)

### Problema: API Key de AI Provider inválida

**Síntomas:**
```
AuthenticationError: Invalid API key
```

**Soluciones:**
1. Verificar que la key es correcta (copiar-pegar completa)
2. Verificar que la key está activa en el dashboard del proveedor
3. Verificar que hay créditos/cuota disponible
4. Probar con API key nueva
5. Revisar logs del backend para más detalles

### Problema: Módulos de capacitación no aparecen

**Síntomas:**
```
[]  # Array vacío en respuesta
```

**Soluciones:**
```bash
# Verificar que existen módulos en DB
psql -U spirittours_user -d spirittours -c "SELECT id, title FROM training_modules;"

# Si no hay módulos, ejecutar seeding
python -m backend.scripts.seed_training_content

# Verificar permisos del usuario
# Asegurarse de que is_active=True
```

---

## 📊 Métricas de Testing

### Performance Benchmarks

| Métrica | Target | Método de Medición |
|---------|--------|-------------------|
| Tiempo de carga inicial | < 3s | Lighthouse |
| API response time | < 200ms | Postman |
| Database query time | < 100ms | pg_stat_statements |
| Memory usage (backend) | < 512MB | htop |
| Memory usage (frontend) | < 100MB | Chrome DevTools |

### Cobertura de Pruebas

| Componente | Cobertura Mínima |
|------------|------------------|
| Backend Models | 80% |
| Backend Services | 70% |
| Backend APIs | 60% |
| Frontend Components | 50% |

---

## 📚 Recursos Adicionales

### Documentación:
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Material-UI Documentation](https://mui.com/)

### Herramientas de Desarrollo:
- **Postman:** Pruebas de API - https://www.postman.com/
- **DBeaver:** Cliente de base de datos - https://dbeaver.io/
- **React DevTools:** Extensión Chrome para debugging
- **Redux DevTools:** Si usas Redux

### Monitoreo:
- **Sentry:** Error tracking - https://sentry.io/
- **Datadog:** Application monitoring
- **New Relic:** Performance monitoring

---

## ✅ Checklist de Configuración Completa

- [ ] PostgreSQL instalado y corriendo
- [ ] Base de datos `spirittours` creada
- [ ] Usuario de BD con permisos correctos
- [ ] Archivo `.env` configurado con todas las variables
- [ ] Claves de seguridad generadas (ENCRYPTION_KEY, SECRET_KEY)
- [ ] Dependencias Python instaladas
- [ ] Dependencias Node.js instaladas
- [ ] Migraciones Alembic ejecutadas
- [ ] Usuario administrador creado
- [ ] Seeding de módulos de capacitación ejecutado
- [ ] Backend corriendo en puerto 8000
- [ ] Frontend corriendo en puerto 3000
- [ ] Login exitoso con credenciales de admin
- [ ] Módulos de capacitación visibles
- [ ] Configuración SMTP funcional
- [ ] Configuración AI Provider funcional
- [ ] Chatbot respondiendo correctamente
- [ ] Tests de salud pasando

---

**Última actualización:** October 18, 2025
**Mantenido por:** Spirit Tours Development Team
**Contacto:** dev@spirittours.com

---

## 🎉 ¡Sistema Listo para Testing!

Si completaste todos los pasos de este documento, tu ambiente de testing debería estar completamente funcional. 

**Próximos pasos:**
1. Realizar pruebas de aceptación usuario (UAT)
2. Recopilar feedback
3. Ajustar configuraciones según necesidades
4. Preparar para despliegue a producción

**¡Buena suerte con las pruebas!** 🚀
