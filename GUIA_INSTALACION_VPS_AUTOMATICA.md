# 🚀 INSTALACIÓN AUTOMÁTICA EN SERVIDOR ÚNICO (VPS)

## ✅ LA FORMA MÁS FÁCIL - UN SOLO COMANDO

Esta guía te permite instalar **TODO** el sistema Spirit Tours en un servidor Ubuntu en **10-15 minutos** con un solo script automático.

---

## 📋 REQUISITOS

### Servidor VPS:
- **OS**: Ubuntu 20.04 o 22.04 LTS
- **RAM**: Mínimo 2GB (recomendado 4GB)
- **Storage**: Mínimo 20GB
- **CPU**: 1 vCPU (recomendado 2 vCPU)

### Proveedores Recomendados:
| Proveedor | Precio/mes | Specs | Link |
|-----------|------------|-------|------|
| **DigitalOcean** | $12-24 | 2GB RAM, 50GB SSD | digitalocean.com |
| **Linode** | $12-24 | 2GB RAM, 50GB SSD | linode.com |
| **Vultr** | $12-24 | 2GB RAM, 55GB SSD | vultr.com |
| **Hetzner** | €5-10 | 2GB RAM, 40GB SSD | hetzner.com |
| **Contabo** | €5-8 | 4GB RAM, 50GB SSD | contabo.com |

💡 **Recomendación**: DigitalOcean por su facilidad de uso y documentación.

---

## 🎯 INSTALACIÓN EN 3 PASOS

### PASO 1: Crear Droplet/VPS (5 minutos)

#### En DigitalOcean:
```
1. Ir a: https://www.digitalocean.com
2. Click "Create Droplet"
3. Seleccionar:
   - Ubuntu 22.04 LTS
   - Regular (2GB RAM / $12/mes o 4GB RAM / $24/mes)
   - Datacenter más cercano a ti
   - SSH Key (o password)
4. Click "Create Droplet"
5. Esperar 60 segundos
6. Copiar la IP del servidor
```

#### En Linode/Vultr (similar):
```
1. Create Linode/Instance
2. Ubuntu 22.04
3. Plan de 2GB+ RAM
4. Deploy
```

### PASO 2: Conectar por SSH (30 segundos)

```bash
# Reemplaza YOUR_SERVER_IP con tu IP
ssh root@YOUR_SERVER_IP

# Ejemplo:
ssh root@142.93.45.123
```

### PASO 3: Ejecutar Script de Instalación (10-15 minutos)

Una vez conectado al servidor, ejecuta:

```bash
# Descargar script
wget https://raw.githubusercontent.com/spirittours/-spirittours-s-Plataform/main/install_production.sh

# Dar permisos de ejecución
chmod +x install_production.sh

# Ejecutar instalación
sudo ./install_production.sh
```

El script te preguntará:
1. **Dominio**: Tu dominio (ej: operations.spirittours.com) o presiona Enter para usar IP
2. **Email**: Tu email para certificados SSL

¡Y listo! El script instala TODO automáticamente.

---

## 🎉 ¿QUÉ INSTALA EL SCRIPT?

El script automáticamente instala y configura:

### ✅ Software Base:
- Python 3.11
- Node.js 18
- PostgreSQL (base de datos)
- Redis (cache)
- Nginx (servidor web)
- Certbot (SSL automático)
- Tesseract OCR
- Supervisor (gestor de procesos)

### ✅ Tu Aplicación:
- Backend FastAPI (puerto 8000)
- Frontend React (compilado)
- Base de datos creada y migrada
- Configuraciones de seguridad
- SSL/HTTPS automático
- Firewall configurado
- Backups automáticos diarios

### ✅ Optimizaciones:
- PostgreSQL optimizado para producción
- Nginx con compresión y cache
- Logs automáticos con rotación
- Límites del sistema ajustados
- WebSocket habilitado

---

## 📊 DURANTE LA INSTALACIÓN

Verás algo como esto:

```
============================================================
  SPIRIT TOURS - INSTALACIÓN AUTOMÁTICA
============================================================

Ingresa tu dominio (ej: operations.spirittours.com) o presiona Enter para usar IP: 
operations.spirittours.com

Ingresa tu email para certificados SSL: 
admin@spirittours.com

============================================================
  PASO 1: Configuración Inicial
============================================================
[INFO] Dominio configurado: operations.spirittours.com
[SUCCESS] Password de base de datos generado automáticamente

============================================================
  PASO 2: Actualizando Sistema
============================================================
[SUCCESS] Sistema actualizado

============================================================
  PASO 3: Instalando Dependencias del Sistema
============================================================
[INFO] Instalando herramientas básicas...
[INFO] Instalando Python 3.11...
[INFO] Instalando Node.js 18...
[INFO] Instalando Nginx...
[INFO] Instalando PostgreSQL...
[INFO] Instalando Redis...
[INFO] Instalando Tesseract OCR...
[INFO] Instalando Supervisor...
[INFO] Instalando Certbot...
[SUCCESS] Todas las dependencias instaladas

... (continúa por 10-15 minutos)

============================================================
  🎉 INSTALACIÓN COMPLETADA EXITOSAMENTE 🎉
============================================================

ACCESO AL SISTEMA:
------------------
URL Principal: https://operations.spirittours.com
API Documentación: https://operations.spirittours.com/docs

BASE DE DATOS:
--------------
Usuario: spirittours
Password: AbCdEfGh123456789XyZ

COMANDOS ÚTILES:
---------------
Ver logs:     /var/www/spirittours/logs.sh
Ver estado:   /var/www/spirittours/status.sh
Actualizar:   /var/www/spirittours/update.sh

✅ ¡Sistema listo para usar! 🚀
```

---

## 🔑 ACCESO AL SISTEMA

Una vez completada la instalación:

### 1. Accede a tu sistema:
```
URL: https://tu-dominio.com
(o http://tu-ip si no configuraste dominio)
```

### 2. Documentación API:
```
URL: https://tu-dominio.com/docs
```

### 3. Ver logs en tiempo real:
```bash
/var/www/spirittours/logs.sh
```

### 4. Ver estado de servicios:
```bash
/var/www/spirittours/status.sh
```

---

## ⚙️ CONFIGURACIÓN POST-INSTALACIÓN

### 1. Agregar OpenAI API Key (Obligatorio para IA)

```bash
# Editar archivo .env
nano /var/www/spirittours/.env

# Buscar la línea:
OPENAI_API_KEY=sk-CHANGE-THIS-AFTER-INSTALLATION

# Cambiar por tu clave real:
OPENAI_API_KEY=sk-tu-clave-real-aqui

# Guardar: Ctrl+O, Enter, Ctrl+X

# Reiniciar backend
supervisorctl restart spirittours-backend
```

### 2. Configurar WhatsApp (Opcional)

```bash
# Editar .env
nano /var/www/spirittours/.env

# Cambiar:
WHATSAPP_ENABLED=true
WHATSAPP_ACCESS_TOKEN=tu-token-de-facebook
WHATSAPP_PHONE_NUMBER_ID=tu-phone-id

# Reiniciar
supervisorctl restart spirittours-backend
```

### 3. Importar Datos Históricos (Opcional)

```bash
cd /var/www/spirittours
source venv/bin/activate
python scripts/import_historical_data.py --file /ruta/a/datos.xlsx
```

---

## 🔧 COMANDOS DE MANTENIMIENTO

### Ver Logs:
```bash
# Logs del backend
/var/www/spirittours/logs.sh

# O manualmente:
tail -f /var/log/spirittours-backend.out.log
tail -f /var/log/spirittours-backend.err.log
```

### Reiniciar Servicios:
```bash
# Backend
supervisorctl restart spirittours-backend

# Nginx
systemctl restart nginx

# PostgreSQL
systemctl restart postgresql

# Redis
systemctl restart redis-server

# Todos
supervisorctl restart all && systemctl restart nginx
```

### Actualizar Sistema:
```bash
# Ejecutar script de actualización
/var/www/spirittours/update.sh

# Esto hace:
# 1. git pull (última versión)
# 2. pip install (nuevas dependencias)
# 3. npm install && build (frontend)
# 4. Reinicia servicios
```

### Ver Estado:
```bash
/var/www/spirittours/status.sh
```

### Backups Manuales:
```bash
# El script hace backups automáticos diarios a las 2 AM
# Ubicación: /var/backups/spirittours/

# Backup manual:
/usr/local/bin/backup-spirittours.sh

# Listar backups:
ls -lh /var/backups/spirittours/

# Restaurar backup:
gunzip < /var/backups/spirittours/db_20241030_140000.sql.gz | \
sudo -u postgres psql spirittours_operations
```

---

## 🐛 TROUBLESHOOTING

### Backend no responde:
```bash
# Ver logs
tail -50 /var/log/spirittours-backend.err.log

# Reiniciar
supervisorctl restart spirittours-backend

# Ver status
supervisorctl status
```

### Error 502 Bad Gateway:
```bash
# Verificar que el backend esté corriendo
supervisorctl status spirittours-backend

# Si está stopped, iniciarlo:
supervisorctl start spirittours-backend

# Ver logs de Nginx
tail -50 /var/log/nginx/spirittours-error.log
```

### Error de base de datos:
```bash
# Verificar PostgreSQL
systemctl status postgresql

# Conectar a la base de datos
sudo -u postgres psql spirittours_operations

# Ver tablas
\dt

# Salir
\q
```

### SSL no funciona:
```bash
# Verificar certificados
certbot certificates

# Renovar manualmente
certbot renew --dry-run

# Si falla, verificar que el dominio apunte a tu IP
dig +short tu-dominio.com
```

---

## 💰 ESTIMACIÓN DE COSTOS

### DigitalOcean Droplet:
| Plan | Precio/mes | Specs | Capacidad |
|------|------------|-------|-----------|
| Basic | $12 | 2GB RAM, 1 vCPU | ~100 usuarios concurrentes |
| Standard | $24 | 4GB RAM, 2 vCPU | ~500 usuarios concurrentes |
| Optimized | $48 | 8GB RAM, 4 vCPU | ~2000 usuarios concurrentes |

**Para empezar**: Plan de $12-24/mes es suficiente.

### Total Mensual:
```
Servidor:        $12-24/mes
OpenAI API:      $10-50/mes (según uso)
WhatsApp (opt):  $0/mes (hasta cierto volumen)
──────────────────────────────
TOTAL:           $22-74/mes
```

Mucho más económico que Railway + servicios separados si tienes alto tráfico.

---

## 📈 COMPARACIÓN: VPS vs RAILWAY

| Aspecto | VPS (Este script) | Railway |
|---------|-------------------|---------|
| **Setup** | 10-15 min | 5 min |
| **Facilidad** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Costo inicial** | $12/mes | $5/mes |
| **Costo con tráfico** | $12-24/mes (fijo) | $20-50/mes (variable) |
| **Control total** | ✅ Completo | ⚠️ Limitado |
| **Escalabilidad** | Manual | Automática |
| **Backups** | ✅ Incluidos | ✅ Incluidos |
| **SSL** | ✅ Automático | ✅ Automático |
| **Mejor para** | Empresas establecidas | Startups rápidas |

### Cuándo usar VPS:
- ✅ Quieres control total
- ✅ Tráfico alto/constante
- ✅ Budget predecible
- ✅ Equipo técnico disponible

### Cuándo usar Railway:
- ✅ Necesitas deploy ultra rápido
- ✅ Startup/MVP
- ✅ Tráfico variable/bajo
- ✅ No quieres gestionar servidor

---

## 🔐 SEGURIDAD

El script automáticamente configura:

✅ **Firewall (UFW)**:
- Solo permite puertos 22 (SSH), 80 (HTTP), 443 (HTTPS)
- Bloquea todo lo demás

✅ **SSL/HTTPS**:
- Certificados automáticos de Let's Encrypt
- Renovación automática cada 90 días

✅ **PostgreSQL**:
- Password fuerte generado aleatoriamente
- Solo accesible desde localhost

✅ **Redis**:
- Solo accesible desde localhost

✅ **Nginx**:
- Headers de seguridad
- Rate limiting
- Compresión gzip

### Recomendaciones Adicionales:

```bash
# 1. Cambiar puerto SSH (opcional)
nano /etc/ssh/sshd_config
# Cambiar Port 22 a Port 2222
systemctl restart sshd

# 2. Instalar Fail2ban (protección contra ataques)
apt-get install fail2ban
systemctl enable fail2ban

# 3. Configurar monitoreo
# Instalar Netdata para monitoreo visual:
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
# Acceder en: http://tu-ip:19999
```

---

## 📞 SOPORTE Y DOCUMENTACIÓN

### Documentación en el Servidor:
```
/var/www/spirittours/INSTALACION_INFO.txt        # Info de instalación
/var/www/spirittours/MANUAL_CAPACITACION_OPERACIONES.md  # Manual completo
/var/www/spirittours/INSTRUCCIONES_FINALES.md    # Guía de uso
```

### Comandos Útiles Rápidos:
```bash
# Ver info de instalación
cat /var/www/spirittours/INSTALACION_INFO.txt

# Logs en tiempo real
tail -f /var/log/spirittours-backend.out.log

# Status de todo
/var/www/spirittours/status.sh

# Reiniciar todo
supervisorctl restart all && systemctl restart nginx
```

---

## 🎯 RESUMEN

### ✅ Ventajas de esta Solución:

1. **Un Solo Comando**: Todo se instala automáticamente
2. **Completamente Funcional**: Backend + Frontend + DB + SSL
3. **Producción Ready**: Optimizado para producción
4. **Backups Automáticos**: Diarios a las 2 AM
5. **Monitoreo**: Logs y scripts de status
6. **Económico**: $12-24/mes precio fijo
7. **Control Total**: Acceso completo al servidor
8. **Actualización Fácil**: Un solo comando

### ⚠️ Consideraciones:

1. Requiere conocimientos básicos de Linux
2. Tú eres responsable del mantenimiento
3. Necesitas monitorear el servidor
4. Escalabilidad manual (no automática)

---

## 🚀 ¡LISTO PARA EMPEZAR!

```bash
# 1. Crear VPS en DigitalOcean/Linode/Vultr
# 2. Conectar por SSH
# 3. Ejecutar:

wget https://raw.githubusercontent.com/spirittours/-spirittours-s-Plataform/main/install_production.sh
chmod +x install_production.sh
sudo ./install_production.sh

# ¡Esperar 10-15 minutos y listo! 🎉
```

---

**¿Tienes dudas? Consulta:**
- `INSTALACION_INFO.txt` en tu servidor
- Manual de capacitación
- GitHub Issues

**¡Tu sistema estará funcionando en menos de 15 minutos! 🚀**
