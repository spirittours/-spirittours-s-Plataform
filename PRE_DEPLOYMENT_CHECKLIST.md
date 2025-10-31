# ✅ Spirit Tours - Pre-Deployment Checklist

**Versión:** 1.0.0  
**Fecha:** Octubre 2024  
**Propósito:** Verificación completa antes de deployment en producción

---

## 📋 CHECKLIST COMPLETO

### 1. SERVIDOR Y INFRAESTRUCTURA

- [ ] Servidor con Ubuntu 22.04 LTS o CentOS Stream 9
- [ ] Mínimo 8 CPU cores, 32 GB RAM, 500 GB SSD
- [ ] Acceso root o sudo configurado
- [ ] Firewall configurado (puertos 80, 443, 22)
- [ ] DNS apuntando al servidor
- [ ] Dominio principal (app.spirittours.com)
- [ ] Subdominio API (api.spirittours.com)

### 2. SOFTWARE INSTALADO

- [ ] Git 2.x
- [ ] Python 3.11+
- [ ] Node.js 18.x+
- [ ] PostgreSQL 15
- [ ] Redis 7.0
- [ ] Nginx 1.24+
- [ ] Docker 24.x
- [ ] Docker Compose 2.x
- [ ] Certbot (Let's Encrypt)
- [ ] Postfix (SMTP server)
- [ ] OpenDKIM

### 3. CONFIGURACIÓN

- [ ] Archivo `.env.production` creado y configurado
- [ ] Todas las variables de entorno definidas (100+)
- [ ] JWT_SECRET generado (64+ caracteres)
- [ ] ENCRYPTION_KEY generado (32 caracteres)
- [ ] SESSION_SECRET generado
- [ ] Database credentials configuradas
- [ ] Redis password configurado
- [ ] SMTP credentials configuradas

### 4. CERTIFICADOS SSL

- [ ] Certificados SSL obtenidos (Let's Encrypt)
- [ ] Certificados para app.spirittours.com
- [ ] Certificados para api.spirittours.com
- [ ] Auto-renovación configurada
- [ ] HTTPS redirect habilitado
- [ ] HSTS headers configurados
- [ ] SSL Labs test: A+ rating

### 5. EMAIL/SMTP

- [ ] Postfix instalado y configurado
- [ ] OpenDKIM instalado y configurado
- [ ] Claves DKIM generadas
- [ ] Registro DNS DKIM agregado
- [ ] Registro DNS SPF agregado
- [ ] Registro DNS DMARC agregado
- [ ] Email de prueba enviado exitosamente
- [ ] Mail-tester.com score: 10/10

### 6. BASE DE DATOS

- [ ] PostgreSQL corriendo
- [ ] Base de datos creada
- [ ] Usuario y permisos configurados
- [ ] Extensiones instaladas (uuid-ossp, pg_trgm, etc.)
- [ ] Migraciones ejecutadas
- [ ] Datos iniciales poblados
- [ ] Usuario admin creado
- [ ] Backup automático configurado (cron)
- [ ] Test de restore ejecutado

### 7. REDIS CACHE

- [ ] Redis corriendo
- [ ] Password configurado
- [ ] Maxmemory policy: allkeys-lru
- [ ] Persistencia RDB configurada
- [ ] Save intervals configurados
- [ ] Redis connection test: OK

### 8. APLICACIÓN BACKEND

- [ ] Código clonado desde Git
- [ ] Virtual environment creado
- [ ] Dependencies instaladas (requirements.txt)
- [ ] Systemd service configurado (spirit-tours-api)
- [ ] Gunicorn workers configurados (4+)
- [ ] Logs configurados
- [ ] Health endpoint funcional (/health)
- [ ] API docs accesibles (/api/docs)

### 9. EMAIL MARKETING WORKER

- [ ] Systemd service configurado (spirit-tours-email-worker)
- [ ] Worker corriendo
- [ ] Queue conectado a Redis
- [ ] Rate limiting configurado
- [ ] Logs configurados
- [ ] Test email enviado

### 10. APLICACIÓN FRONTEND

- [ ] Dependencies instaladas (npm ci)
- [ ] Production build generado (npm run build)
- [ ] Build optimizado (<5 MB)
- [ ] Static files en /opt/spirit-tours/frontend/build
- [ ] Nginx sirviendo static files
- [ ] Gzip compression habilitado
- [ ] Cache headers configurados

### 11. NGINX

- [ ] Configuración creada (/etc/nginx/sites-available/spirit-tours)
- [ ] Symlink creado (sites-enabled)
- [ ] Syntax test: nginx -t OK
- [ ] Rate limiting configurado
- [ ] Proxy headers configurados
- [ ] WebSocket support habilitado
- [ ] Security headers agregados
- [ ] Nginx recargado

### 12. MONITORING

- [ ] Prometheus configurado
- [ ] Grafana configurado
- [ ] Dashboards importados
- [ ] Alertas configuradas
- [ ] Logs rotation configurado
- [ ] ELK Stack (opcional)

### 13. BACKUP Y DISASTER RECOVERY

- [ ] Backup script instalado (/usr/local/bin/backup-spirit-db.sh)
- [ ] Cron job configurado (diario 2 AM)
- [ ] Retención 30 días configurada
- [ ] Backup directory: /var/backups/spirit-tours
- [ ] Test de restore ejecutado
- [ ] Offsite backup configurado (opcional)

### 14. SEGURIDAD

- [ ] Firewall activo (ufw o firewalld)
- [ ] Fail2ban instalado y configurado
- [ ] SSH keys configuradas
- [ ] Password authentication deshabilitado
- [ ] Root login deshabilitado
- [ ] Security updates habilitados
- [ ] ModSecurity (WAF) instalado (opcional)
- [ ] Audit trail habilitado

### 15. TESTING

- [ ] Unit tests ejecutados (85%+ coverage)
- [ ] Integration tests ejecutados
- [ ] API endpoints testeados
- [ ] Email sending testeado
- [ ] Payment flow testeado (sandbox)
- [ ] Load testing ejecutado (10,000+ users)
- [ ] Security scan ejecutado
- [ ] Performance test: API < 50ms

### 16. DOCUMENTACIÓN

- [ ] README.md actualizado
- [ ] DEPLOYMENT_PRODUCTION_GUIDE.md revisado
- [ ] API documentation generada
- [ ] Runbook creado
- [ ] Team training completado
- [ ] Emergency contacts documentados

### 17. INTEGRATIONS

- [ ] Amadeus GDS credentials configurados
- [ ] Sabre GDS credentials configurados
- [ ] Stripe API keys (production)
- [ ] PayPal credentials (production)
- [ ] Twilio credentials configurados
- [ ] OpenAI API key configurado
- [ ] Airbnb API credentials
- [ ] Agoda credentials
- [ ] HostelWorld credentials

### 18. SERVICIOS SYSTEMD

- [ ] spirit-tours-api.service habilitado
- [ ] spirit-tours-email-worker.service habilitado
- [ ] Todos los servicios iniciados
- [ ] Auto-restart configurado
- [ ] Logs accesibles (journalctl)

### 19. DNS

- [ ] Registro A para app.spirittours.com
- [ ] Registro A para api.spirittours.com
- [ ] Registro MX para correo
- [ ] Registro TXT para SPF
- [ ] Registro TXT para DKIM
- [ ] Registro TXT para DMARC
- [ ] TTL configurado (300-3600)
- [ ] Propagación verificada

### 20. FINAL CHECKS

- [ ] Health check script ejecutado: OK
- [ ] Todos los servicios corriendo
- [ ] CPU usage < 50%
- [ ] Memory usage < 70%
- [ ] Disk space > 30% libre
- [ ] No errors en logs
- [ ] API response time < 50ms
- [ ] Frontend carga < 2s
- [ ] Email delivery < 5s

---

## 🚀 DEPLOYMENT COMMANDS

### Quick Start
```bash
# 1. Deploy completo
sudo ./scripts/deploy-production.sh

# 2. Health check
./scripts/health-check.sh

# 3. Ver logs
journalctl -u spirit-tours-api -f
```

### Individual Setup Scripts
```bash
# Database
sudo ./scripts/init-database.sh

# SSL/TLS
sudo ./scripts/setup-ssl.sh

# Email/SMTP
sudo ./scripts/setup-email.sh
```

---

## 📞 POST-DEPLOYMENT

### Primeras 24 horas:
- [ ] Monitoreo intensivo de logs
- [ ] Verificar todos los endpoints
- [ ] Probar flujo de email marketing
- [ ] Verificar integraciones OTA
- [ ] Revisar métricas de performance
- [ ] Confirmar backups funcionando

### Primera semana:
- [ ] User acceptance testing
- [ ] Optimización de performance
- [ ] Ajustes según feedback
- [ ] Documentación de incidentes
- [ ] Review de seguridad

---

## ⚠️ ROLLBACK PLAN

Si algo falla:
```bash
# Rollback automático
sudo ./scripts/deploy-production.sh --rollback

# O manual:
# 1. Restaurar último backup
# 2. Revertir código: git reset --hard HEAD~1
# 3. Reiniciar servicios
```

---

## ✅ SIGN-OFF

**Responsables del Deployment:**

- [ ] DevOps Lead: _______________  Fecha: ___________
- [ ] Backend Lead: _______________  Fecha: ___________
- [ ] Frontend Lead: _______________  Fecha: ___________
- [ ] QA Lead: _______________  Fecha: ___________
- [ ] Product Owner: _______________  Fecha: ___________

**Aprobación Final:**

- [ ] CTO: _______________  Fecha: ___________

---

**Notas adicionales:**
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________

---

**¡Deployment Ready! 🚀**
