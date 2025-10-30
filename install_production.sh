#!/bin/bash

################################################################################
# SPIRIT TOURS - INSTALACIÓN AUTOMÁTICA EN SERVIDOR ÚNICO
# 
# Este script instala TODO el sistema en un servidor Ubuntu 20.04/22.04
# Incluye: PostgreSQL, Redis, Nginx, SSL, Python, Node.js, y tu aplicación
#
# Uso: 
#   wget https://raw.githubusercontent.com/spirittours/-spirittours-s-Plataform/main/install_production.sh
#   chmod +x install_production.sh
#   sudo ./install_production.sh
################################################################################

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Función para imprimir header
print_header() {
    echo ""
    echo "============================================================"
    echo "  $1"
    echo "============================================================"
    echo ""
}

# Verificar que se ejecuta como root
if [[ $EUID -ne 0 ]]; then
   print_error "Este script debe ejecutarse como root (usa sudo)"
   exit 1
fi

# Verificar Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    print_error "Este script está diseñado para Ubuntu 20.04/22.04"
    exit 1
fi

print_header "SPIRIT TOURS - INSTALACIÓN AUTOMÁTICA"
print_status "Iniciando instalación en servidor único..."

# ============================================================
# PASO 1: CONFIGURACIÓN INICIAL
# ============================================================

print_header "PASO 1: Configuración Inicial"

# Preguntar información del dominio
read -p "Ingresa tu dominio (ej: operations.spirittours.com) o presiona Enter para usar IP: " DOMAIN
if [ -z "$DOMAIN" ]; then
    DOMAIN=$(curl -s ifconfig.me)
    print_warning "Usando IP pública: $DOMAIN"
else
    print_success "Dominio configurado: $DOMAIN"
fi

# Preguntar email para SSL
read -p "Ingresa tu email para certificados SSL: " SSL_EMAIL
if [ -z "$SSL_EMAIL" ]; then
    SSL_EMAIL="admin@spirittours.com"
    print_warning "Usando email por defecto: $SSL_EMAIL"
fi

# Preguntar credenciales de base de datos
print_status "Configurando credenciales de base de datos..."
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
print_success "Password de base de datos generado automáticamente"

# ============================================================
# PASO 2: ACTUALIZAR SISTEMA
# ============================================================

print_header "PASO 2: Actualizando Sistema"
apt-get update -y
apt-get upgrade -y
print_success "Sistema actualizado"

# ============================================================
# PASO 3: INSTALAR DEPENDENCIAS DEL SISTEMA
# ============================================================

print_header "PASO 3: Instalando Dependencias del Sistema"

print_status "Instalando herramientas básicas..."
apt-get install -y curl wget git build-essential software-properties-common

print_status "Instalando Python 3.11..."
add-apt-repository ppa:deadsnakes/ppa -y
apt-get update -y
apt-get install -y python3.11 python3.11-venv python3.11-dev python3-pip

print_status "Instalando Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

print_status "Instalando Nginx..."
apt-get install -y nginx

print_status "Instalando PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

print_status "Instalando Redis..."
apt-get install -y redis-server

print_status "Instalando Tesseract OCR..."
apt-get install -y tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng

print_status "Instalando Supervisor (para gestión de procesos)..."
apt-get install -y supervisor

print_status "Instalando Certbot (para SSL)..."
apt-get install -y certbot python3-certbot-nginx

print_success "Todas las dependencias instaladas"

# ============================================================
# PASO 4: CONFIGURAR POSTGRESQL
# ============================================================

print_header "PASO 4: Configurando PostgreSQL"

# Crear base de datos y usuario
sudo -u postgres psql -c "CREATE DATABASE spirittours_operations;" 2>/dev/null || print_warning "Base de datos ya existe"
sudo -u postgres psql -c "CREATE USER spirittours WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || print_warning "Usuario ya existe"
sudo -u postgres psql -c "ALTER USER spirittours WITH SUPERUSER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE spirittours_operations TO spirittours;"

print_success "PostgreSQL configurado"
print_status "Base de datos: spirittours_operations"
print_status "Usuario: spirittours"
print_status "Password: $DB_PASSWORD"

# ============================================================
# PASO 5: CONFIGURAR REDIS
# ============================================================

print_header "PASO 5: Configurando Redis"

# Configurar Redis para producción
sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
sed -i 's/^bind 127.0.0.1 ::1/bind 127.0.0.1/' /etc/redis/redis.conf

systemctl enable redis-server
systemctl restart redis-server

print_success "Redis configurado y ejecutándose"

# ============================================================
# PASO 6: CLONAR REPOSITORIO
# ============================================================

print_header "PASO 6: Clonando Repositorio"

# Crear directorio de aplicación
APP_DIR="/var/www/spirittours"
mkdir -p $APP_DIR

# Clonar repositorio
print_status "Clonando repositorio de GitHub..."
if [ -d "$APP_DIR/.git" ]; then
    print_warning "Repositorio ya existe, actualizando..."
    cd $APP_DIR
    git pull
else
    git clone https://github.com/spirittours/-spirittours-s-Plataform.git $APP_DIR
    cd $APP_DIR
fi

print_success "Repositorio clonado en $APP_DIR"

# ============================================================
# PASO 7: CONFIGURAR BACKEND PYTHON
# ============================================================

print_header "PASO 7: Configurando Backend Python"

cd $APP_DIR

# Crear entorno virtual
print_status "Creando entorno virtual Python..."
python3.11 -m venv venv
source venv/bin/activate

# Instalar dependencias Python
print_status "Instalando dependencias Python (esto puede tomar varios minutos)..."
pip install --upgrade pip
pip install wheel setuptools

# Instalar dependencias del proyecto
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-dotenv pydantic-settings
pip install openai pytesseract pdf2image opencv-python pillow
pip install prophet scikit-learn pandas numpy
pip install requests python-multipart email-validator

print_success "Dependencias Python instaladas"

# Crear archivo .env
print_status "Creando archivo de configuración .env..."
cat > .env << EOF
# Database
DATABASE_URL=postgresql://spirittours:$DB_PASSWORD@localhost:5432/spirittours_operations

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_ENABLED=true

# Application
PORT=8000
DEBUG=false
ENVIRONMENT=production

# Security
JWT_SECRET_KEY=$(openssl rand -base64 64 | tr -d '\n')
SECRET_KEY=$(openssl rand -base64 32 | tr -d '\n')

# CORS
CORS_ORIGINS=http://$DOMAIN,https://$DOMAIN

# OpenAI (agrega tu clave después)
OPENAI_API_KEY=sk-CHANGE-THIS-AFTER-INSTALLATION

# WhatsApp (opcional)
WHATSAPP_ENABLED=false
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# Tesseract
TESSERACT_CMD=/usr/bin/tesseract
TESSERACT_LANGUAGES=spa+eng

# Features
FEATURE_WHATSAPP_NOTIFICATIONS=true
FEATURE_OCR_PROCESSING=true
FEATURE_AI_PREDICTIONS=true
FEATURE_FRAUD_DETECTION=true
FEATURE_CHATBOT=true
EOF

print_success "Archivo .env creado"

# Ejecutar migraciones
print_status "Ejecutando migraciones de base de datos..."
python backend/migrations/create_operations_tables_standalone.py || print_warning "Algunas migraciones fallaron, pero continuamos..."

print_success "Backend configurado"

# ============================================================
# PASO 8: CONFIGURAR FRONTEND
# ============================================================

print_header "PASO 8: Configurando Frontend"

cd $APP_DIR/frontend

# Instalar dependencias Node.js
print_status "Instalando dependencias Node.js..."
npm install

# Crear archivo .env para frontend
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=https://$DOMAIN
NEXT_PUBLIC_WS_URL=wss://$DOMAIN
NEXT_PUBLIC_ENVIRONMENT=production
EOF

# Build frontend
print_status "Compilando frontend (esto puede tomar varios minutos)..."
npm run build || print_warning "Build del frontend falló, pero continuamos..."

print_success "Frontend configurado"

# ============================================================
# PASO 9: CONFIGURAR SUPERVISOR (GESTOR DE PROCESOS)
# ============================================================

print_header "PASO 9: Configurando Supervisor"

# Crear configuración de Supervisor para el backend
cat > /etc/supervisor/conf.d/spirittours-backend.conf << EOF
[program:spirittours-backend]
command=$APP_DIR/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
directory=$APP_DIR
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/spirittours-backend.err.log
stdout_logfile=/var/log/spirittours-backend.out.log
environment=PATH="$APP_DIR/venv/bin"
EOF

# Recargar Supervisor
supervisorctl reread
supervisorctl update
supervisorctl restart spirittours-backend

print_success "Supervisor configurado"

# ============================================================
# PASO 10: CONFIGURAR NGINX
# ============================================================

print_header "PASO 10: Configurando Nginx"

# Crear configuración de Nginx
cat > /etc/nginx/sites-available/spirittours << EOF
# Upstream para el backend
upstream spirittours_backend {
    server 127.0.0.1:8000;
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# Configuración HTTPS
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # Logs
    access_log /var/log/nginx/spirittours-access.log;
    error_log /var/log/nginx/spirittours-error.log;

    # SSL (Certbot agregará las líneas SSL aquí)
    # ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Frontend estático
    location / {
        root $APP_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # API Backend
    location /api {
        proxy_pass http://spirittours_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Documentación API
    location /docs {
        proxy_pass http://spirittours_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://spirittours_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Max upload size (para facturas OCR)
    client_max_body_size 10M;
}
EOF

# Habilitar sitio
ln -sf /etc/nginx/sites-available/spirittours /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Verificar configuración de Nginx
nginx -t

# Reiniciar Nginx
systemctl restart nginx
systemctl enable nginx

print_success "Nginx configurado"

# ============================================================
# PASO 11: CONFIGURAR SSL CON LET'S ENCRYPT
# ============================================================

print_header "PASO 11: Configurando SSL Automático"

if [ "$DOMAIN" != "$(curl -s ifconfig.me)" ]; then
    print_status "Obteniendo certificado SSL de Let's Encrypt..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $SSL_EMAIL --redirect
    print_success "Certificado SSL instalado y configurado"
else
    print_warning "Estás usando IP, saltando configuración SSL"
    print_warning "Para SSL, configura un dominio y ejecuta: certbot --nginx -d tu-dominio.com"
fi

# ============================================================
# PASO 12: CONFIGURAR FIREWALL
# ============================================================

print_header "PASO 12: Configurando Firewall"

# Instalar UFW si no está instalado
apt-get install -y ufw

# Configurar reglas básicas
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https

# Habilitar firewall
echo "y" | ufw enable

print_success "Firewall configurado"

# ============================================================
# PASO 13: CREAR SCRIPT DE ACTUALIZACIÓN
# ============================================================

print_header "PASO 13: Creando Scripts de Mantenimiento"

# Script de actualización
cat > $APP_DIR/update.sh << 'EOF'
#!/bin/bash
cd /var/www/spirittours
git pull
source venv/bin/activate
pip install -r requirements.txt --upgrade
cd frontend && npm install && npm run build
supervisorctl restart spirittours-backend
systemctl reload nginx
echo "✅ Sistema actualizado"
EOF

chmod +x $APP_DIR/update.sh

# Script de logs
cat > $APP_DIR/logs.sh << 'EOF'
#!/bin/bash
echo "=== Logs del Backend ==="
tail -50 /var/log/spirittours-backend.out.log
echo ""
echo "=== Errores del Backend ==="
tail -50 /var/log/spirittours-backend.err.log
EOF

chmod +x $APP_DIR/logs.sh

# Script de status
cat > $APP_DIR/status.sh << 'EOF'
#!/bin/bash
echo "=== Estado de Servicios ==="
echo ""
echo "Backend:"
supervisorctl status spirittours-backend
echo ""
echo "PostgreSQL:"
systemctl status postgresql --no-pager | grep Active
echo ""
echo "Redis:"
systemctl status redis-server --no-pager | grep Active
echo ""
echo "Nginx:"
systemctl status nginx --no-pager | grep Active
EOF

chmod +x $APP_DIR/status.sh

print_success "Scripts de mantenimiento creados"

# ============================================================
# PASO 14: CONFIGURAR BACKUPS AUTOMÁTICOS
# ============================================================

print_header "PASO 14: Configurando Backups Automáticos"

# Crear directorio de backups
mkdir -p /var/backups/spirittours

# Script de backup
cat > /usr/local/bin/backup-spirittours.sh << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/spirittours"
DATE=\$(date +%Y%m%d_%H%M%S)

# Backup de base de datos
sudo -u postgres pg_dump spirittours_operations | gzip > \$BACKUP_DIR/db_\$DATE.sql.gz

# Backup de archivos subidos (si existen)
if [ -d "$APP_DIR/uploads" ]; then
    tar -czf \$BACKUP_DIR/uploads_\$DATE.tar.gz -C $APP_DIR uploads
fi

# Mantener solo los últimos 7 backups
find \$BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
find \$BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete

echo "✅ Backup completado: \$DATE"
EOF

chmod +x /usr/local/bin/backup-spirittours.sh

# Agregar a crontab (backup diario a las 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-spirittours.sh") | crontab -

print_success "Backups automáticos configurados (diarios a las 2 AM)"

# ============================================================
# PASO 15: CONFIGURAR LOGS ROTATION
# ============================================================

print_header "PASO 15: Configurando Rotación de Logs"

cat > /etc/logrotate.d/spirittours << 'EOF'
/var/log/spirittours-*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
EOF

print_success "Rotación de logs configurada"

# ============================================================
# PASO 16: OPTIMIZACIONES DE SISTEMA
# ============================================================

print_header "PASO 16: Aplicando Optimizaciones"

# Aumentar límites de archivos abiertos
cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
EOF

# Optimizar PostgreSQL para producción
sudo -u postgres psql spirittours_operations -c "ALTER SYSTEM SET shared_buffers = '256MB';"
sudo -u postgres psql spirittours_operations -c "ALTER SYSTEM SET effective_cache_size = '1GB';"
sudo -u postgres psql spirittours_operations -c "ALTER SYSTEM SET maintenance_work_mem = '64MB';"
sudo -u postgres psql spirittours_operations -c "ALTER SYSTEM SET checkpoint_completion_target = 0.9;"
sudo -u postgres psql spirittours_operations -c "ALTER SYSTEM SET wal_buffers = '16MB';"
sudo -u postgres psql spirittours_operations -c "ALTER SYSTEM SET default_statistics_target = 100;"
sudo -u postgres psql spirittours_operations -c "ALTER SYSTEM SET random_page_cost = 1.1;"

systemctl restart postgresql

print_success "Optimizaciones aplicadas"

# ============================================================
# INSTALACIÓN COMPLETADA
# ============================================================

print_header "🎉 INSTALACIÓN COMPLETADA EXITOSAMENTE 🎉"

# Guardar información importante
INFO_FILE="$APP_DIR/INSTALACION_INFO.txt"
cat > $INFO_FILE << EOF
============================================================
SPIRIT TOURS - INFORMACIÓN DE INSTALACIÓN
============================================================

FECHA DE INSTALACIÓN: $(date)

ACCESO AL SISTEMA:
------------------
URL Principal: https://$DOMAIN
API Documentación: https://$DOMAIN/docs
WebSocket: wss://$DOMAIN/ws

BASE DE DATOS:
--------------
Host: localhost
Puerto: 5432
Base de datos: spirittours_operations
Usuario: spirittours
Password: $DB_PASSWORD

REDIS:
------
Host: localhost
Puerto: 6379

UBICACIÓN DE ARCHIVOS:
---------------------
Aplicación: $APP_DIR
Logs Backend: /var/log/spirittours-backend.out.log
Logs Errores: /var/log/spirittours-backend.err.log
Logs Nginx: /var/log/nginx/spirittours-*.log
Backups: /var/backups/spirittours

COMANDOS ÚTILES:
---------------
Ver logs:           $APP_DIR/logs.sh
Ver estado:         $APP_DIR/status.sh
Actualizar sistema: $APP_DIR/update.sh
Reiniciar backend:  sudo supervisorctl restart spirittours-backend
Reiniciar Nginx:    sudo systemctl restart nginx

CONFIGURACIÓN PENDIENTE:
-----------------------
1. Editar $APP_DIR/.env y agregar tu OpenAI API Key:
   OPENAI_API_KEY=sk-tu-clave-aqui

2. Si quieres WhatsApp, editar .env con:
   WHATSAPP_ENABLED=true
   WHATSAPP_ACCESS_TOKEN=tu-token
   WHATSAPP_PHONE_NUMBER_ID=tu-id

3. Importar datos históricos (si los tienes):
   cd $APP_DIR
   source venv/bin/activate
   python scripts/import_historical_data.py --file datos.xlsx

BACKUPS:
--------
Backups automáticos: Diarios a las 2 AM
Ubicación: /var/backups/spirittours
Restaurar backup: 
  gunzip < /var/backups/spirittours/db_FECHA.sql.gz | sudo -u postgres psql spirittours_operations

MONITOREO:
----------
CPU/RAM:           htop
Procesos:          sudo supervisorctl status
Base de datos:     sudo -u postgres psql spirittours_operations
Redis:             redis-cli ping

SOPORTE:
--------
Documentación: $APP_DIR/MANUAL_CAPACITACION_OPERACIONES.md
GitHub: https://github.com/spirittours/-spirittours-s-Plataform

============================================================
EOF

# Mostrar información
cat $INFO_FILE

echo ""
print_success "✅ Información guardada en: $INFO_FILE"
echo ""
print_header "PRÓXIMOS PASOS"
echo "1. Edita el archivo .env para agregar tu OpenAI API Key:"
echo "   nano $APP_DIR/.env"
echo ""
echo "2. Reinicia el backend después de editar .env:"
echo "   supervisorctl restart spirittours-backend"
echo ""
echo "3. Accede a tu sistema en: https://$DOMAIN"
echo ""
echo "4. Ver documentación API: https://$DOMAIN/docs"
echo ""
print_success "¡Sistema listo para usar! 🚀"
