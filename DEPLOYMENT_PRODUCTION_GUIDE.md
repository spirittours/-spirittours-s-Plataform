# 🚀 Spirit Tours - Guía Completa de Deployment a Producción

**Versión:** 1.0.0  
**Última actualización:** Octubre 2024  
**Estado del Sistema:** 100% Completo - Production Ready

---

## 📋 Tabla de Contenidos

1. [Pre-requisitos](#pre-requisitos)
2. [Configuración del Servidor](#configuración-del-servidor)
3. [Variables de Entorno](#variables-de-entorno)
4. [Despliegue del Backend](#despliegue-del-backend)
5. [Despliegue del Frontend](#despliegue-del-frontend)
6. [Sistema de Email Marketing](#sistema-de-email-marketing)
7. [Base de Datos](#base-de-datos)
8. [Configuración de Redis](#configuración-de-redis)
9. [Configuración SMTP](#configuración-smtp)
10. [SSL/TLS](#ssltls)
11. [Monitoreo](#monitoreo)
12. [Backup y Recuperación](#backup-y-recuperación)
13. [Troubleshooting](#troubleshooting)

---

## 🔧 Pre-requisitos

### Hardware Mínimo Recomendado

```yaml
Producción:
  CPU: 8 cores (16 threads)
  RAM: 32 GB
  Storage: 500 GB SSD
  Network: 1 Gbps

Staging:
  CPU: 4 cores
  RAM: 16 GB
  Storage: 250 GB SSD
  Network: 100 Mbps
```

### Software Requerido

```bash
# Sistema Operativo
Ubuntu 22.04 LTS (recomendado)
# O
CentOS Stream 9

# Runtime Environments
Node.js 18.x o superior
Python 3.11 o superior

# Bases de Datos
PostgreSQL 15
Redis 7.0

# Web Server
Nginx 1.24 o superior

# Herramientas
Docker 24.x
Docker Compose 2.x
Git 2.x
```

---

## 🖥️ Configuración del Servidor

### 1. Actualizar Sistema

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl git nginx postgresql redis-server

# CentOS/RHEL
sudo dnf update -y
sudo dnf install -y gcc make curl git nginx postgresql-server redis
```

### 2. Instalar Node.js

```bash
# Usar nvm (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 3. Instalar Python

```bash
# Ubuntu
sudo apt install python3.11 python3.11-venv python3.11-dev

# Crear alias
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
```

### 4. Configurar Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable

# Firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

---

## 🔐 Variables de Entorno

### Archivo: `.env.production`

```bash
# ==================== APPLICATION ====================
NODE_ENV=production
APP_NAME=Spirit Tours
APP_URL=https://app.spirittours.com
API_URL=https://api.spirittours.com
PORT=3000

# ==================== DATABASE ====================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spirit_tours_prod
DB_USER=spirit_admin
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=20

# ==================== REDIS ====================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD
REDIS_DB=0
REDIS_TLS=true

# ==================== EMAIL MARKETING SMTP ====================
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@spirittours.com
SMTP_PASSWORD=CHANGE_THIS_SMTP_PASSWORD
SMTP_FROM_EMAIL=noreply@spirittours.com
SMTP_FROM_NAME=Spirit Tours
SMTP_USE_TLS=true
SMTP_RATE_LIMIT=100  # Emails por minuto

# DKIM Configuration (para anti-spam)
DKIM_PRIVATE_KEY_PATH=/etc/spirit-tours/dkim_private.key
DKIM_SELECTOR=default
DKIM_DOMAIN=spirittours.com

# ==================== JWT & SECURITY ====================
JWT_SECRET=CHANGE_THIS_VERY_LONG_RANDOM_SECRET_KEY_MIN_64_CHARS
JWT_EXPIRATION=86400  # 24 hours
SESSION_SECRET=CHANGE_THIS_SESSION_SECRET_KEY
ENCRYPTION_KEY=CHANGE_THIS_32_CHAR_ENCRYPTION_KEY

# ==================== CORS ====================
CORS_ORIGIN=https://app.spirittours.com,https://www.spirittours.com
CORS_CREDENTIALS=true

# ==================== AI PROVIDERS ====================
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_AI_API_KEY=your-google-ai-key

# ==================== PAYMENT GATEWAYS ====================
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET=your_paypal_secret
PAYPAL_MODE=live

# ==================== GDS INTEGRATIONS ====================
AMADEUS_API_KEY=your_amadeus_key
AMADEUS_API_SECRET=your_amadeus_secret
AMADEUS_ENVIRONMENT=production

SABRE_CLIENT_ID=your_sabre_id
SABRE_CLIENT_SECRET=your_sabre_secret
SABRE_ENVIRONMENT=production

# ==================== OTA CHANNELS ====================
AIRBNB_ACCESS_TOKEN=your_airbnb_token
AIRBNB_API_KEY=your_airbnb_api_key

AGODA_HOTEL_CODE=your_hotel_code
AGODA_USERNAME=your_username
AGODA_PASSWORD=your_password

BOOKING_COM_HOTEL_ID=your_hotel_id
BOOKING_COM_API_KEY=your_booking_api_key

HOSTELWORLD_PROPERTY_ID=your_property_id
HOSTELWORLD_API_KEY=your_hw_api_key

# ==================== TWILIO ====================
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# ==================== AWS (Optional for S3, etc) ====================
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=spirit-tours-assets

# ==================== MONITORING ====================
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NEW_RELIC_LICENSE_KEY=your_newrelic_key
PROMETHEUS_PORT=9090

# ==================== LOGGING ====================
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/spirit-tours/app.log
LOG_MAX_SIZE=100M
LOG_MAX_FILES=30
```

### Generar Secrets Seguros

```bash
# JWT Secret (64 caracteres)
openssl rand -base64 48

# Encryption Key (32 caracteres para AES-256)
openssl rand -base64 32 | cut -c1-32

# Session Secret
openssl rand -hex 32
```

---

## 🐍 Despliegue del Backend

### 1. Clonar Repositorio

```bash
cd /opt
sudo git clone https://github.com/spirittours/platform.git spirit-tours
cd spirit-tours
```

### 2. Configurar Python Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configurar Backend con Gunicorn

```bash
# Instalar Gunicorn
pip install gunicorn uvicorn[standard]

# Crear archivo de servicio systemd
sudo nano /etc/systemd/system/spirit-tours-api.service
```

**Contenido del archivo:**

```ini
[Unit]
Description=Spirit Tours API
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/spirit-tours/backend
Environment="PATH=/opt/spirit-tours/venv/bin"
EnvironmentFile=/opt/spirit-tours/.env.production
ExecStart=/opt/spirit-tours/venv/bin/gunicorn \
    -k uvicorn.workers.UvicornWorker \
    -w 4 \
    -b 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile /var/log/spirit-tours/access.log \
    --error-logfile /var/log/spirit-tours/error.log \
    main:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 4. Iniciar Servicio

```bash
# Crear directorios de logs
sudo mkdir -p /var/log/spirit-tours
sudo chown www-data:www-data /var/log/spirit-tours

# Habilitar e iniciar servicio
sudo systemctl daemon-reload
sudo systemctl enable spirit-tours-api
sudo systemctl start spirit-tours-api

# Verificar estado
sudo systemctl status spirit-tours-api
```

---

## ⚛️ Despliegue del Frontend

### 1. Build de Producción

```bash
cd /opt/spirit-tours/frontend
npm install --production
npm run build
```

### 2. Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/spirit-tours
```

**Contenido del archivo:**

```nginx
# Frontend App
server {
    listen 80;
    listen [::]:80;
    server_name app.spirittours.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.spirittours.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/app.spirittours.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.spirittours.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:;" always;
    
    # Root Directory
    root /opt/spirit-tours/frontend/build;
    index index.html;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
    
    # Cache Control
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# API Backend
server {
    listen 80;
    server_name api.spirittours.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.spirittours.com;
    
    # SSL Configuration (same as above)
    ssl_certificate /etc/letsencrypt/live/api.spirittours.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.spirittours.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req zone=api_limit burst=200 nodelay;
    
    # Proxy to Backend
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
    }
    
    # WebSocket Support
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 3. Activar Configuración

```bash
sudo ln -s /etc/nginx/sites-available/spirit-tours /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📧 Sistema de Email Marketing

### 1. Configurar Servidor SMTP Propio

```bash
# Instalar Postfix
sudo apt install postfix

# Configurar durante instalación:
# - Internet Site
# - Dominio: spirittours.com
```

### 2. Configurar DKIM (Anti-Spam)

```bash
# Instalar OpenDKIM
sudo apt install opendkim opendkim-tools

# Generar keys DKIM
sudo mkdir -p /etc/opendkim/keys/spirittours.com
cd /etc/opendkim/keys/spirittours.com
sudo opendkim-genkey -s default -d spirittours.com
sudo chown opendkim:opendkim default.private

# Agregar DNS TXT record con contenido de default.txt
cat default.txt
```

### 3. Configurar SPF y DMARC

```bash
# DNS TXT Records a agregar:

# SPF
spirittours.com. IN TXT "v=spf1 mx a ip4:YOUR_SERVER_IP ~all"

# DMARC
_dmarc.spirittours.com. IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@spirittours.com"
```

### 4. Iniciar Email Marketing Engine

```bash
# Crear servicio para Email Marketing Worker
sudo nano /etc/systemd/system/spirit-tours-email-worker.service
```

**Contenido:**

```ini
[Unit]
Description=Spirit Tours Email Marketing Worker
After=network.target redis.service postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/spirit-tours/backend
Environment="PATH=/opt/spirit-tours/venv/bin"
EnvironmentFile=/opt/spirit-tours/.env.production
ExecStart=/opt/spirit-tours/venv/bin/python -m email_marketing.core.worker
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable spirit-tours-email-worker
sudo systemctl start spirit-tours-email-worker
```

---

## 🗄️ Base de Datos

### 1. Configurar PostgreSQL

```bash
# Inicializar (si es primera vez)
sudo postgresql-setup --initdb

# Iniciar servicio
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 2. Crear Base de Datos y Usuario

```bash
sudo -u postgres psql
```

```sql
-- Crear usuario
CREATE USER spirit_admin WITH PASSWORD 'STRONG_PASSWORD_HERE';

-- Crear base de datos
CREATE DATABASE spirit_tours_prod OWNER spirit_admin;

-- Otorgar privilegios
GRANT ALL PRIVILEGES ON DATABASE spirit_tours_prod TO spirit_admin;

-- Habilitar extensiones
\c spirit_tours_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

\q
```

### 3. Ejecutar Migraciones

```bash
cd /opt/spirit-tours/backend
source ../venv/bin/activate
python init_database.py
```

### 4. Configurar Backup Automático

```bash
# Crear script de backup
sudo nano /usr/local/bin/backup-spirit-db.sh
```

**Contenido:**

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/spirit-tours"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="spirit_tours_prod_${DATE}.sql.gz"

mkdir -p $BACKUP_DIR

# Dump database
pg_dump -U spirit_admin spirit_tours_prod | gzip > "${BACKUP_DIR}/${FILENAME}"

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${FILENAME}"
```

```bash
sudo chmod +x /usr/local/bin/backup-spirit-db.sh

# Agregar a crontab (backup diario a las 2 AM)
sudo crontab -e
```

Agregar línea:
```
0 2 * * * /usr/local/bin/backup-spirit-db.sh >> /var/log/spirit-tours/backup.log 2>&1
```

---

## 🔴 Configuración de Redis

```bash
# Editar configuración
sudo nano /etc/redis/redis.conf
```

**Configuraciones importantes:**

```conf
# Seguridad
bind 127.0.0.1
requirepass CHANGE_THIS_REDIS_PASSWORD
protected-mode yes

# Persistencia
save 900 1
save 300 10
save 60 10000

# Memoria
maxmemory 2gb
maxmemory-policy allkeys-lru

# Performance
tcp-backlog 511
timeout 300
```

```bash
# Reiniciar Redis
sudo systemctl restart redis
```

---

## 🔒 SSL/TLS con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificados
sudo certbot --nginx -d app.spirittours.com -d api.spirittours.com

# Renovación automática (ya configurado por defecto)
sudo certbot renew --dry-run
```

---

## 📊 Monitoreo

### 1. Prometheus + Grafana

```bash
# Docker Compose para monitoring stack
cd /opt/spirit-tours
nano docker-compose.monitoring.yml
```

**Contenido:**

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    restart: always

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana-data:/var/lib/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=CHANGE_THIS
    restart: always

volumes:
  prometheus-data:
  grafana-data:
```

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

---

## 💾 Backup y Recuperación

### Estrategia de Backup

1. **Base de Datos**: Diario a las 2 AM (configurado arriba)
2. **Archivos**: Semanal
3. **Configuraciones**: Cada cambio

### Restaurar Base de Datos

```bash
# Descomprimir backup
gunzip spirit_tours_prod_20241015_020000.sql.gz

# Restaurar
psql -U spirit_admin spirit_tours_prod < spirit_tours_prod_20241015_020000.sql
```

---

## 🔧 Troubleshooting

### Problemas Comunes

#### 1. API no responde

```bash
# Verificar servicio
sudo systemctl status spirit-tours-api

# Ver logs
sudo journalctl -u spirit-tours-api -f

# Verificar puerto
sudo netstat -tulpn | grep 8000
```

#### 2. Emails no se envían

```bash
# Verificar worker
sudo systemctl status spirit-tours-email-worker

# Verificar cola de Redis
redis-cli
> AUTH your_redis_password
> LLEN email_queue

# Ver logs SMTP
tail -f /var/log/mail.log
```

#### 3. Alto uso de memoria

```bash
# Ver procesos
htop

# Verificar Redis memory
redis-cli INFO memory
```

---

## ✅ Checklist Post-Deployment

- [ ] Todas las variables de entorno configuradas
- [ ] Base de datos migrada y poblada
- [ ] Certificados SSL activos
- [ ] Backups automáticos configurados
- [ ] Monitoreo funcionando
- [ ] Logs rotando correctamente
- [ ] Email marketing SMTP configured
- [ ] DKIM/SPF/DMARC configurados
- [ ] Rate limiting activo
- [ ] Firewall configurado
- [ ] Health checks funcionando
- [ ] Documentación actualizada

---

## 📞 Soporte

**Equipo DevOps**: devops@spirittours.com  
**Documentación**: https://docs.spirittours.com  
**Status Page**: https://status.spirittours.com

---

**¡Deployment Exitoso!** 🎉

*Spirit Tours Platform - Production Ready*
