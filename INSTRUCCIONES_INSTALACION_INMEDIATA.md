# 🚀 INSTALACIÓN INMEDIATA - SPIRIT TOURS EN DIGITALOCEAN

## ✅ TUS DATOS CONFIGURADOS:
- **Token DigitalOcean:** Configurado ✓
- **Dominio:** platform.spirittours.us ✓  
- **Email:** spirittoursus@gmail.com ✓
- **Configuración:** MÍNIMA (4 vCPUs, 8GB RAM, $63/mes) ✓

---

## 📦 ARCHIVO CREADO: `deploy-spirittours-minimal.sh`

He creado un script **100% PERSONALIZADO** con tus datos que:
- ✅ Crea automáticamente el Droplet en DigitalOcean
- ✅ Instala PostgreSQL managed ($15/mes)
- ✅ Configura tu dominio platform.spirittours.us
- ✅ Instala SSL/HTTPS automáticamente
- ✅ Despliega toda la aplicación
- ✅ Configura backups automáticos

---

## 🎯 INSTALACIÓN EN 3 PASOS SIMPLES:

### **PASO 1: Descargar el Script**
Desde tu computadora (Mac, Linux o Windows con WSL):

```bash
# Opción A: Si tienes el archivo
chmod +x deploy-spirittours-minimal.sh

# Opción B: Descargarlo directamente
curl -O https://raw.githubusercontent.com/tu-repo/deploy-spirittours-minimal.sh
chmod +x deploy-spirittours-minimal.sh
```

### **PASO 2: Ejecutar el Script**
```bash
./deploy-spirittours-minimal.sh
```

El script te preguntará:
```
¿Deseas continuar? (s/n): s
```

### **PASO 3: Esperar 15-20 minutos**
El script hace TODO automáticamente:
- ✅ Instala doctl (si no lo tienes)
- ✅ Se autentica con tu token
- ✅ Crea el servidor
- ✅ Configura la base de datos
- ✅ Configura el dominio
- ✅ Instala SSL
- ✅ Despliega la aplicación

---

## 📊 QUÉ SE VA A CREAR:

### **Recursos en DigitalOcean:**
| Recurso | Especificaciones | Costo/mes |
|---------|-----------------|-----------|
| **Droplet** | 4 vCPUs, 8 GB RAM, 160 GB SSD | $48 |
| **PostgreSQL** | 1 vCPU, 1 GB RAM, 10 GB SSD | $15 |
| **Backups** | Automáticos semanales | $9.60 |
| **Total** | | **~$72.60/mes** |

### **Servicios Configurados:**
- ✅ Ubuntu 22.04 LTS
- ✅ Docker y Docker Compose
- ✅ PostgreSQL 15 (Managed)
- ✅ Redis (Local)
- ✅ Nginx con SSL
- ✅ Node.js 18 + PM2
- ✅ Python 3.11
- ✅ Firewall configurado
- ✅ Backups diarios automáticos

---

## 🌐 ACCESOS DESPUÉS DE LA INSTALACIÓN:

### **URLs de tu Aplicación:**
```
Frontend: https://platform.spirittours.us
API: https://api.platform.spirittours.us
API Docs: https://api.platform.spirittours.us/docs
```

### **Acceso SSH al Servidor:**
```bash
ssh -i ~/.ssh/spirit-tours-key-development root@[IP_DEL_SERVIDOR]
```

---

## ⚠️ IMPORTANTE - CONFIGURACIÓN POST-INSTALACIÓN:

### **1. Actualizar API Keys (REQUERIDO):**
Una vez instalado, debes actualizar las API keys:

```bash
# Conectar al servidor
ssh -i ~/.ssh/spirit-tours-key-development root@[IP_DEL_SERVIDOR]

# Editar archivo de configuración
nano /home/spirittours/app/.env.production
```

Actualizar estas líneas:
```env
# Stripe (para pagos)
STRIPE_SECRET_KEY=sk_test_TU_CLAVE_AQUI
STRIPE_PUBLISHABLE_KEY=pk_test_TU_CLAVE_AQUI

# Google Maps
GOOGLE_MAPS_API_KEY=TU_CLAVE_GOOGLE_MAPS

# OpenAI (para IA)
OPENAI_API_KEY=TU_CLAVE_OPENAI

# Email (Gmail App Password)
SMTP_PASSWORD=TU_APP_PASSWORD_GMAIL
```

### **2. Configurar Gmail para Envío de Emails:**
1. Ve a: https://myaccount.google.com/security
2. Activa verificación en 2 pasos
3. Genera una "App Password" para la aplicación
4. Usa esa contraseña en `SMTP_PASSWORD`

### **3. Configurar DNS Externo (si usas otro proveedor):**
Si tu dominio NO está en DigitalOcean, configura estos registros:
```
A Record: @ -> [IP_DEL_SERVIDOR]
A Record: www -> [IP_DEL_SERVIDOR]
A Record: api -> [IP_DEL_SERVIDOR]
```

---

## 🔍 MONITOREO Y COMANDOS ÚTILES:

### **Ver el Estado de los Servicios:**
```bash
# Conectar al servidor
ssh -i ~/.ssh/spirit-tours-key-development root@[IP]

# Ver contenedores Docker
docker ps

# Ver logs de la API
docker logs -f spirit-tours-api

# Ver logs del Frontend
docker logs -f spirit-tours-frontend
```

### **Reiniciar Servicios:**
```bash
cd /home/spirittours/app
docker-compose restart
```

### **Hacer Backup Manual:**
```bash
/home/spirittours/backup.sh
```

### **Actualizar la Aplicación:**
```bash
cd /home/spirittours/app
git pull origin main
docker-compose down
docker-compose up -d
```

---

## 📋 CHECKLIST DE VERIFICACIÓN:

Después de la instalación, verifica:

- [ ] El script completó sin errores
- [ ] Puedes acceder a https://platform.spirittours.us
- [ ] La API responde en https://api.platform.spirittours.us/health
- [ ] El SSL/HTTPS funciona correctamente
- [ ] Actualizaste las API keys en .env.production
- [ ] Configuraste el Gmail App Password
- [ ] Los backups automáticos están programados

---

## 🆘 SOLUCIÓN DE PROBLEMAS:

### **Si el dominio no funciona:**
- Espera 5-10 minutos para propagación DNS
- Verifica en: https://dnschecker.org/#A/platform.spirittours.us
- Usa la IP directa mientras tanto: http://[IP]:3000

### **Si hay error de SSL:**
```bash
# Renovar certificado manualmente
ssh -i ~/.ssh/spirit-tours-key-development root@[IP]
certbot renew --nginx
```

### **Si la aplicación no carga:**
```bash
# Verificar logs
docker logs spirit-tours-api
docker logs spirit-tours-frontend

# Reiniciar servicios
docker-compose -C /home/spirittours/app restart
```

### **Ver el reporte completo:**
El script genera un archivo con todos los detalles:
```
spirit-tours-deployment-[TIMESTAMP].txt
```

---

## 💡 RESUMEN EJECUTIVO:

**Con UN SOLO COMANDO** tendrás:
1. ✅ Servidor en DigitalOcean creado
2. ✅ Base de datos PostgreSQL configurada
3. ✅ Aplicación Spirit Tours funcionando
4. ✅ Dominio platform.spirittours.us configurado
5. ✅ SSL/HTTPS activado
6. ✅ Backups automáticos
7. ✅ Todo listo para producción

**Tiempo total: 15-20 minutos**
**Costo mensual: ~$72.60**

---

## 🎉 ¡EJECUTA EL SCRIPT AHORA!

```bash
./deploy-spirittours-minimal.sh
```

**¡Tu plataforma estará lista en menos de 20 minutos!**

Si necesitas ayuda durante la instalación, los puntos clave son:
1. El script hace TODO automáticamente
2. Solo necesitas confirmar con "s" al inicio
3. Esperar 15-20 minutos
4. Actualizar las API keys después

---

**Documento creado el**: 7 de Noviembre, 2024  
**Estado**: LISTO PARA EJECUTAR