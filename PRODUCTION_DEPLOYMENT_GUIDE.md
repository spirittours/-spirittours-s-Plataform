# 🚀 GUÍA DE DESPLIEGUE EN PRODUCCIÓN
## Spirit Tours Platform - Paso a Paso

---

## 📋 PRE-REQUISITOS

### Servidores Requeridos
```
1. Servidor de Aplicación (Backend + Frontend)
   - CPU: 4 cores
   - RAM: 8 GB
   - Disco: 100 GB SSD
   - SO: Ubuntu 22.04 LTS

2. Servidor de Base de Datos (MongoDB)
   - CPU: 2 cores
   - RAM: 4 GB
   - Disco: 50 GB SSD
   - SO: Ubuntu 22.04 LTS

3. Servidor de Cache (Redis)
   - CPU: 2 cores
   - RAM: 4 GB
   - Disco: 20 GB SSD
   - SO: Ubuntu 22.04 LTS
```

### Dominios y DNS
```
✅ spirittours.us configurado
✅ Certificado SSL/TLS activo
✅ DNS records configurados (MX, SPF, DKIM, DMARC)
```

---

## 🔧 OPCIÓN 1: DESPLIEGUE CON DOCKER (RECOMENDADO)

### Paso 1: Preparar Servidor
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
docker --version
docker-compose --version
```

### Paso 2: Clonar Repositorio
```bash
# Crear directorio para la aplicación
sudo mkdir -p /var/www/spirittours
cd /var/www/spirittours

# Clonar desde Git
git clone https://github.com/your-org/spirit-tours.git .

# O subir archivos via SCP/SFTP
```

### Paso 3: Configurar Variables de Entorno
```bash
# Copiar template seguro
cp .env.secure .env

# Editar con credenciales reales
sudo nano .env

# Cambiar:
# - MONGODB_URI (URI de MongoDB en producción)
# - REDIS_PASSWORD (password de Redis)
# - JWT_SECRET (secreto único de producción)
# - SMTP_PASSWORD (App password de Google)
# - API keys reales (OpenAI, SendGrid, etc.)
```

### Paso 4: Construir y Ejecutar
```bash
# Construir imágenes Docker
docker-compose build

# Iniciar servicios
docker-compose up -d

# Verificar estado
docker-compose ps

# Ver logs
docker-compose logs -f
```

### Paso 5: Configurar Nginx (Reverse Proxy)
```bash
# Instalar Nginx
sudo apt install nginx -y

# Crear configuración
sudo nano /etc/nginx/sites-available/spirittours
```

```nginx
server {
    listen 80;
    server_name spirittours.us www.spirittours.us;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name spirittours.us www.spirittours.us;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/spirittours.us/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/spirittours.us/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
# Activar configuración
sudo ln -s /etc/nginx/sites-available/spirittours /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Paso 6: Configurar SSL con Let's Encrypt
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado
sudo certbot --nginx -d spirittours.us -d www.spirittours.us

# Renovación automática
sudo certbot renew --dry-run
```

---

## 💻 OPCIÓN 2: DESPLIEGUE MANUAL (SIN DOCKER)

### Paso 1: Instalar Dependencias
```bash
# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Redis
sudo apt install redis-server -y

# Python (para scripts)
sudo apt install python3 python3-pip -y
```

### Paso 2: Configurar MongoDB
```bash
# Editar configuración
sudo nano /etc/mongod.conf

# Cambiar:
# security:
#   authorization: enabled

# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Crear usuario admin
mongosh
use admin
db.createUser({
  user: "admin",
  pwd: "SpiritTours_DB_Prod_2025_Secure",
  roles: ["root"]
})
exit

# Reiniciar con autenticación
sudo systemctl restart mongod
```

### Paso 3: Configurar Redis
```bash
# Editar configuración
sudo nano /etc/redis/redis.conf

# Cambiar:
# requirepass SpiritTours_Redis_Prod_2025

# Reiniciar
sudo systemctl restart redis
sudo systemctl enable redis
```

### Paso 4: Desplegar Aplicación
```bash
# Clonar repositorio
cd /var/www
git clone https://github.com/your-org/spirit-tours.git spirittours
cd spirittours

# Instalar dependencias
npm install

# Configurar .env
cp .env.secure .env
nano .env

# Ejecutar optimización de DB
node scripts/optimize-mongodb.js

# Construir frontend
cd frontend
npm install
npm run build
cd ..
```

### Paso 5: Configurar PM2
```bash
# Instalar PM2
sudo npm install -g pm2

# Crear archivo ecosystem
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'spirit-tours-backend',
      script: 'backend/server.js',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'spirit-tours-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

```bash
# Iniciar aplicación
pm2 start ecosystem.config.js

# Configurar inicio automático
pm2 startup
pm2 save

# Ver logs
pm2 logs

# Ver estado
pm2 status
```

---

## 🔒 SEGURIDAD POST-DESPLIEGUE

### Firewall (UFW)
```bash
# Habilitar firewall
sudo ufw enable

# Permitir puertos necesarios
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Verificar
sudo ufw status
```

### Fail2Ban (Protección contra ataques)
```bash
# Instalar
sudo apt install fail2ban -y

# Configurar
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Iniciar
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### Backups Automáticos
```bash
# Crear script de backup
sudo nano /usr/local/bin/backup-spirittours.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/spirittours"

mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --uri="mongodb://admin:password@localhost:27017" --out=$BACKUP_DIR/mongo_$DATE

# Backup archivos
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/spirittours

# Eliminar backups antiguos (> 30 días)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completado: $DATE"
```

```bash
# Hacer ejecutable
sudo chmod +x /usr/local/bin/backup-spirittours.sh

# Programar con cron (diario a las 2 AM)
sudo crontab -e
# Agregar: 0 2 * * * /usr/local/bin/backup-spirittours.sh
```

---

## 📊 MONITOREO Y LOGS

### Configurar Logs
```bash
# Logs de Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Logs de aplicación
tail -f /var/www/spirittours/logs/combined.log
tail -f /var/www/spirittours/logs/error.log

# Logs de MongoDB
tail -f /var/log/mongodb/mongod.log

# Logs de PM2
pm2 logs spirit-tours-backend
```

### Monitoreo con PM2
```bash
# Dashboard en tiempo real
pm2 monit

# Métricas
pm2 status

# Uso de memoria
pm2 describe spirit-tours-backend
```

---

## ✅ CHECKLIST POST-DESPLIEGUE

### Verificaciones Inmediatas
- [ ] Aplicación accesible en https://spirittours.us
- [ ] API respondiendo en https://spirittours.us/api/health
- [ ] WebSocket conectando correctamente
- [ ] MongoDB conectado y optimizado
- [ ] Redis funcionando
- [ ] Certificado SSL válido
- [ ] Emails enviándose correctamente
- [ ] Sin errores en logs

### Pruebas Funcionales
- [ ] Login de usuarios funciona
- [ ] Crear nueva reservación
- [ ] Procesar pago de prueba
- [ ] Envío de email de confirmación
- [ ] Dashboard carga correctamente
- [ ] Reportes se generan
- [ ] API externa integrada (si aplica)

### Seguridad
- [ ] Firewall configurado
- [ ] Fail2Ban activo
- [ ] SSL/TLS funcionando
- [ ] Backups programados
- [ ] Logs rotando correctamente
- [ ] Credenciales únicas en producción
- [ ] 2FA activado en cuentas admin

### Performance
- [ ] Tiempo de respuesta < 100ms
- [ ] Cache hit rate > 80%
- [ ] CPU usage < 70%
- [ ] Memory usage estable
- [ ] Sin memory leaks
- [ ] Base de datos indexada

---

## 🚨 TROUBLESHOOTING

### Aplicación No Inicia
```bash
# Ver logs detallados
pm2 logs --err

# Verificar puerto
netstat -tulpn | grep :5000

# Verificar variables de entorno
cat .env | grep -v "^#"

# Reiniciar
pm2 restart all
```

### MongoDB No Conecta
```bash
# Verificar estado
sudo systemctl status mongod

# Ver logs
tail -f /var/log/mongodb/mongod.log

# Probar conexión
mongosh mongodb://localhost:27017

# Reiniciar
sudo systemctl restart mongod
```

### Redis No Conecta
```bash
# Verificar estado
sudo systemctl status redis

# Probar conexión
redis-cli ping

# Ver logs
tail -f /var/log/redis/redis-server.log

# Reiniciar
sudo systemctl restart redis
```

### SSL/HTTPS No Funciona
```bash
# Verificar certificado
sudo certbot certificates

# Renovar si es necesario
sudo certbot renew

# Verificar configuración Nginx
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 📞 SOPORTE POST-DESPLIEGUE

### Contactos de Emergencia
- **DevOps Lead:** devops@spirittours.us
- **Tech Support:** tech@spirittours.us
- **System Admin:** admin@spirittours.us

### Documentación Adicional
- Guía de Operaciones: `/docs/operations.md`
- Runbook DevOps: `DEVOPS_RUNBOOK.md`
- FAQ Técnico: `/docs/faq-technical.md`

---

## 🎯 SIGUIENTES PASOS

### Primera Semana
1. Monitorear logs diariamente
2. Verificar performance metrics
3. Revisar backups
4. Probar recuperación ante desastres
5. Optimizar según carga real

### Primer Mes
1. Escalar si es necesario (horizontal/vertical)
2. Implementar CDN (Cloudflare)
3. Configurar alertas automáticas
4. Auditoría de seguridad
5. Documentar lecciones aprendidas

---

**✅ SISTEMA LISTO PARA PRODUCCIÓN**

*Guía creada: 6 de Noviembre, 2025*  
*Para: Spirit Tours Platform v2.0*