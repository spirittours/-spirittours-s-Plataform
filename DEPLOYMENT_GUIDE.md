# 🚀 **SPIRIT TOURS - GUÍA COMPLETA DE DEPLOYMENT**

## **📋 TABLA DE CONTENIDOS**
1. [Requisitos Previos](#requisitos-previos)
2. [Instalación Rápida (5 minutos)](#instalación-rápida)
3. [Configuración Detallada](#configuración-detallada)
4. [Deployment en Producción](#deployment-en-producción)
5. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)
6. [Troubleshooting](#troubleshooting)
7. [Seguridad](#seguridad)
8. [Backup y Recuperación](#backup-y-recuperación)

---

## **📌 REQUISITOS PREVIOS**

### **Hardware Mínimo**
- **CPU:** 4 cores
- **RAM:** 8 GB (16 GB recomendado)
- **Disco:** 50 GB SSD
- **Red:** 100 Mbps

### **Software Requerido**
- **OS:** Ubuntu 20.04 LTS o superior
- **Docker:** 20.10+
- **Docker Compose:** 2.0+
- **Git:** 2.25+
- **Node.js:** 18+ (para desarrollo frontend)
- **Python:** 3.11+ (para desarrollo backend)

### **Dominios y DNS**
- Dominio registrado (ej: spirittours.com)
- DNS configurado apuntando a tu servidor
- Certificado SSL (Let's Encrypt gratuito)

---

## **⚡ INSTALACIÓN RÁPIDA**

### **Opción 1: Instalación Automática (5 minutos)**

```bash
# 1. Clonar repositorio
git clone https://github.com/your-repo/spirit-tours.git
cd spirit-tours

# 2. Ejecutar script de instalación
chmod +x scripts/start_dev.sh
./scripts/start_dev.sh

# 3. Sistema listo en:
# - Frontend: http://localhost:3000
# - API: http://localhost:8000/api/docs
```

### **Opción 2: Docker Compose (10 minutos)**

```bash
# 1. Copiar y configurar .env
cp .env.example .env
nano .env  # Editar con tus valores

# 2. Construir e iniciar servicios
docker-compose up -d

# 3. Inicializar base de datos
docker-compose exec backend python database/init_quotation_db.py

# 4. Verificar estado
docker-compose ps
```

---

## **⚙️ CONFIGURACIÓN DETALLADA**

### **1. Variables de Entorno Críticas**

```bash
# .env - Configuración mínima requerida

# Base de datos
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/spirit_tours

# Seguridad
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=${SECRET_KEY}

# Email (requerido para notificaciones)
SENDGRID_API_KEY=SG.xxxxx  # O configurar SMTP

# Pagos (al menos uno requerido)
STRIPE_SECRET_KEY=sk_test_xxxxx
# O
PAYPAL_CLIENT_ID=xxxxx
```

### **2. Configuración de Base de Datos**

```sql
-- Crear base de datos manualmente si es necesario
CREATE DATABASE spirit_tours;
CREATE USER spirit_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE spirit_tours TO spirit_user;
```

### **3. Configuración de Redis**

```bash
# redis.conf personalizado
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

---

## **🌍 DEPLOYMENT EN PRODUCCIÓN**

### **Paso 1: Preparar Servidor**

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### **Paso 2: Configurar SSL**

```bash
# Obtener certificado SSL con Let's Encrypt
sudo certbot --nginx -d spirittours.com -d www.spirittours.com

# Auto-renovación
sudo systemctl enable certbot.timer
```

### **Paso 3: Deploy con Script Automatizado**

```bash
# Ejecutar deployment completo
sudo ./scripts/deploy.sh production

# El script automáticamente:
# ✅ Hace backup del estado actual
# ✅ Instala dependencias
# ✅ Configura SSL
# ✅ Despliega containers
# ✅ Inicializa base de datos
# ✅ Configura monitoreo
# ✅ Configura backups automáticos
```

### **Paso 4: Configurar Nginx**

```bash
# Copiar configuración
sudo cp nginx.conf /etc/nginx/nginx.conf

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

---

## **📊 MONITOREO Y MANTENIMIENTO**

### **Dashboard de Monitoreo**

```bash
# Ver estado de servicios
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de servicio específico
docker-compose logs -f backend

# Estadísticas de recursos
docker stats
```

### **Health Checks**

```bash
# Check manual
curl http://localhost:8000/health | jq

# Configurar monitoreo automático
crontab -e
*/5 * * * * /home/user/webapp/scripts/health_monitor.sh
```

### **Alertas**

Configurar en `.env`:
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
ALERT_EMAIL=admin@spirittours.com
```

---

## **🔧 TROUBLESHOOTING**

### **Problema: Base de datos no conecta**

```bash
# Verificar estado
docker-compose exec postgres pg_isready

# Ver logs
docker-compose logs postgres

# Reiniciar servicio
docker-compose restart postgres
```

### **Problema: Frontend no carga**

```bash
# Reconstruir frontend
docker-compose build --no-cache frontend

# Limpiar cache
docker-compose exec frontend npm cache clean --force
```

### **Problema: WebSocket no funciona**

```bash
# Verificar Nginx config
grep -A 10 "location /ws/" /etc/nginx/nginx.conf

# Verificar Redis
docker-compose exec redis redis-cli ping
```

### **Problema: Emails no se envían**

```bash
# Verificar configuración
docker-compose exec backend python -c "
from integrations.email_service import email_service
print(email_service.provider)
"

# Test manual
docker-compose exec backend python -c "
import asyncio
from integrations.email_service import email_service
asyncio.run(email_service.send_test_email('test@example.com'))
"
```

---

## **🔒 SEGURIDAD**

### **Checklist de Seguridad**

- [ ] Cambiar todas las contraseñas por defecto
- [ ] Configurar firewall (ufw/iptables)
- [ ] Habilitar fail2ban
- [ ] Configurar SSL/TLS
- [ ] Rotar SECRET_KEY regularmente
- [ ] Limitar acceso SSH
- [ ] Configurar rate limiting
- [ ] Habilitar logs de auditoría
- [ ] Backup automático configurado
- [ ] Monitoreo de seguridad activo

### **Firewall Configuration**

```bash
# Configurar UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### **Hardening SSH**

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
```

---

## **💾 BACKUP Y RECUPERACIÓN**

### **Backup Automático**

```bash
# Configurar backup diario a las 2 AM
crontab -e
0 2 * * * /home/user/webapp/scripts/backup.sh

# Backup manual
./scripts/backup.sh
```

### **Restauración**

```bash
# 1. Detener servicios
docker-compose down

# 2. Restaurar base de datos
gunzip < /backups/backup-20241015/database.sql.gz | \
  docker exec -i spirit_tours_db psql -U postgres spirit_tours

# 3. Restaurar archivos
tar -xzf /backups/backup-20241015/application.tar.gz -C /

# 4. Reiniciar servicios
docker-compose up -d
```

---

## **📈 OPTIMIZACIÓN DE RENDIMIENTO**

### **Frontend**
- Habilitar CDN (Cloudflare)
- Comprimir assets
- Lazy loading de componentes
- Cache de browser optimizado

### **Backend**
- Índices de base de datos optimizados
- Connection pooling configurado
- Redis cache activado
- Query optimization

### **Infraestructura**
- Auto-scaling configurado
- Load balancer (si necesario)
- CDN para static files
- Compresión gzip habilitada

---

## **📞 SOPORTE Y CONTACTO**

### **Logs Importantes**
- **API Logs:** `/var/log/spirit_tours/app.log`
- **Nginx Logs:** `/var/log/nginx/access.log`
- **Database Logs:** `docker-compose logs postgres`
- **Health Checks:** `/var/log/spirit_tours/health.log`

### **Comandos Útiles**

```bash
# Estado general del sistema
./scripts/status.sh

# Reiniciar todo
docker-compose restart

# Actualizar código
git pull && docker-compose build && docker-compose up -d

# Limpiar sistema
docker system prune -a
```

---

## **✅ VERIFICACIÓN FINAL**

### **Lista de Verificación Post-Deployment**

- [ ] Todos los servicios están running
- [ ] Health check retorna "healthy"
- [ ] Frontend carga correctamente
- [ ] API Docs accesible
- [ ] WebSocket conecta
- [ ] Emails se envían
- [ ] Pagos procesan (test mode)
- [ ] SSL certificado válido
- [ ] Backups automáticos funcionando
- [ ] Monitoreo activo
- [ ] Logs rotando correctamente

### **Test de Funcionalidad Completa**

```bash
# Test automático completo
docker-compose exec backend pytest tests/

# Test manual de flujo completo
curl -X POST http://localhost:8000/api/v1/quotations/test
```

---

## **🎉 CONCLUSIÓN**

¡Felicidades! Spirit Tours está desplegado y funcionando.

**URLs de Acceso:**
- **Producción:** https://spirittours.com
- **API:** https://spirittours.com/api
- **Docs:** https://spirittours.com/api/docs
- **Admin:** https://spirittours.com/admin

**Próximos Pasos:**
1. Configurar analytics (Google Analytics)
2. Integrar CRM externo si necesario
3. Configurar CDN para mejor rendimiento
4. Implementar A/B testing
5. Configurar staging environment

---

*Última actualización: 15 de Octubre de 2024*  
*Versión: 2.0.0*  
*Status: PRODUCTION READY* ✅