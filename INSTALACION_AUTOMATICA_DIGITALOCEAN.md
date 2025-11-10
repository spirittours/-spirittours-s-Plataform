# 🚀 INSTALACIÓN AUTOMÁTICA EN DIGITALOCEAN

## 📋 RESUMEN EJECUTIVO

He creado **4 métodos diferentes** para instalar automáticamente tu sistema Spirit Tours en DigitalOcean:

### ✅ **Métodos de Instalación Disponibles:**

1. **🔧 Script Bash Completo** - Instalación total en servidor existente
2. **🏗️ Terraform** - Infraestructura como código
3. **☁️ Cloud-Init** - Configuración automática al crear Droplet
4. **💻 DigitalOcean CLI** - Creación y despliegue con doctl

---

## 🎯 MÉTODO 1: SCRIPT BASH AUTOMÁTICO (RECOMENDADO)

### **Archivo:** `deploy-digitalocean-auto.sh`

Este script instala TODO automáticamente en un servidor DigitalOcean existente.

### **Características:**
- ✅ Instala todas las dependencias (Docker, Node.js, Python, etc.)
- ✅ Configura firewall y seguridad
- ✅ Clona el repositorio
- ✅ Configura bases de datos
- ✅ Despliega con Docker Compose
- ✅ Configura SSL/HTTPS
- ✅ Configura backups automáticos
- ✅ Configura monitoreo

### **Cómo usar:**

```bash
# 1. Crear un Droplet en DigitalOcean (Ubuntu 22.04, 8GB RAM mínimo)

# 2. Conectar por SSH al servidor
ssh root@TU_IP_DROPLET

# 3. Descargar el script
wget https://raw.githubusercontent.com/tu-repo/deploy-digitalocean-auto.sh

# 4. Dar permisos de ejecución
chmod +x deploy-digitalocean-auto.sh

# 5. Ejecutar el script
./deploy-digitalocean-auto.sh

# El script te pedirá:
# - Dominio (opcional)
# - Email para SSL
# - Confirmación para continuar
```

**⏱️ Tiempo de instalación: ~15-20 minutos**

---

## 🏗️ MÉTODO 2: TERRAFORM (INFRAESTRUCTURA COMO CÓDIGO)

### **Archivo:** `digitalocean-terraform-deploy.tf`

Crea TODA la infraestructura automáticamente usando Terraform.

### **Recursos que crea:**
- ✅ Droplet principal (8 vCPUs, 16GB RAM)
- ✅ PostgreSQL Managed Database
- ✅ Redis Managed Cache
- ✅ Load Balancer
- ✅ Spaces (S3 compatible)
- ✅ VPC privada
- ✅ Firewall rules
- ✅ DNS y SSL
- ✅ Monitoring alerts

### **Cómo usar:**

```bash
# 1. Instalar Terraform
brew install terraform  # Mac
# o
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# 2. Obtener token de DigitalOcean
# Ve a: https://cloud.digitalocean.com/account/api/tokens
# Crea un token con permisos de lectura y escritura

# 3. Configurar variables
export TF_VAR_do_token="tu-token-aqui"
export TF_VAR_domain_name="tudominio.com"
export TF_VAR_ssh_fingerprint="tu-ssh-fingerprint"

# 4. Inicializar Terraform
terraform init

# 5. Ver plan de ejecución
terraform plan

# 6. Aplicar configuración
terraform apply -auto-approve

# 7. Ver outputs (IPs, URLs, etc.)
terraform output
```

**⏱️ Tiempo de creación: ~10-15 minutos**

### **Costo estimado con Terraform:**
- Droplet: $96/mes
- PostgreSQL: $60/mes
- Redis: $15/mes
- Load Balancer: $12/mes
- **Total: ~$183/mes**

---

## ☁️ MÉTODO 3: CLOUD-INIT (CONFIGURACIÓN AUTOMÁTICA)

### **Archivo:** `cloud-init.yaml`

Configura automáticamente el servidor cuando se crea el Droplet.

### **Características:**
- ✅ Se ejecuta automáticamente al crear el Droplet
- ✅ Instala todas las dependencias
- ✅ Configura seguridad y firewall
- ✅ Crea usuarios y directorios
- ✅ Configura Nginx
- ✅ Instala Docker y Docker Compose
- ✅ Clona repositorio y despliega

### **Cómo usar:**

#### Opción A: Desde el Panel de DigitalOcean

1. Ve a **Create Droplet**
2. Selecciona **Ubuntu 22.04**
3. Elige plan: **8 GB RAM mínimo**
4. En **Advanced Options** > **Add Initialization scripts**
5. Pega el contenido de `cloud-init.yaml`
6. Crea el Droplet
7. Espera 10-15 minutos para que se configure

#### Opción B: Con DigitalOcean CLI

```bash
doctl compute droplet create spirit-tours \
  --size s-4vcpu-8gb \
  --image ubuntu-22-04-x64 \
  --region nyc3 \
  --user-data-file cloud-init.yaml \
  --ssh-keys [tu-ssh-key-id]
```

**⏱️ Tiempo de configuración: ~10-15 minutos**

---

## 💻 MÉTODO 4: DIGITALOCEAN CLI COMPLETO

### **Archivo:** `deploy-digitalocean-cli.sh`

Script que usa `doctl` para crear y configurar TODO.

### **Características:**
- ✅ Crea Droplet automáticamente
- ✅ Crea base de datos PostgreSQL managed
- ✅ Crea Redis managed
- ✅ Configura VPC privada
- ✅ Configura firewall
- ✅ Configura DNS
- ✅ Despliega aplicación
- ✅ Configura monitoring

### **Cómo usar:**

```bash
# 1. Instalar doctl (DigitalOcean CLI)
# Mac
brew install doctl

# Linux
cd ~
wget https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz
tar xf doctl-1.104.0-linux-amd64.tar.gz
sudo mv doctl /usr/local/bin

# 2. Autenticar con DigitalOcean
doctl auth init
# (Te pedirá tu API token)

# 3. Ejecutar el script
chmod +x deploy-digitalocean-cli.sh
./deploy-digitalocean-cli.sh

# El script te pedirá:
# - Ambiente (staging/production)
# - Dominio (opcional)
# - Email para notificaciones
```

**⏱️ Tiempo total: ~20-25 minutos**

---

## 🎯 COMPARACIÓN DE MÉTODOS

| Método | Tiempo | Complejidad | Costo | Mejor Para |
|--------|--------|-------------|-------|------------|
| **Script Bash** | 15-20 min | Fácil | Manual | Servidor existente |
| **Terraform** | 10-15 min | Media | Automático | Producción, IaC |
| **Cloud-Init** | 10-15 min | Fácil | Manual | Nuevos Droplets |
| **CLI Script** | 20-25 min | Fácil | Automático | Automatización total |

---

## 📝 PASOS DESPUÉS DE LA INSTALACIÓN

### 1. **Actualizar Variables de Entorno**
```bash
ssh root@TU_IP
cd /home/spirittours/app/spirit-tours
nano .env.production

# Actualizar:
# - STRIPE_SECRET_KEY
# - SENDGRID_API_KEY
# - GOOGLE_MAPS_API_KEY
# - OPENAI_API_KEY
# - Otros API keys
```

### 2. **Configurar Dominio**
```bash
# Si tienes dominio, configurar DNS:
# A Record: @ -> TU_IP_DROPLET
# A Record: www -> TU_IP_DROPLET
# A Record: api -> TU_IP_DROPLET
```

### 3. **Activar SSL**
```bash
certbot --nginx -d tudominio.com -d www.tudominio.com
```

### 4. **Verificar Servicios**
```bash
# Ver estado de contenedores
docker-compose -f docker-compose.production.yml ps

# Ver logs
docker-compose -f docker-compose.production.yml logs -f

# Verificar API
curl http://TU_IP:8000/health
```

---

## 🔧 COMANDOS ÚTILES POST-INSTALACIÓN

```bash
# Reiniciar servicios
docker-compose -f docker-compose.production.yml restart

# Ver logs en tiempo real
docker-compose -f docker-compose.production.yml logs -f

# Backup manual
/home/spirittours/backup.sh

# Actualizar aplicación
git pull origin main
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Ver uso de recursos
docker stats
htop

# Verificar espacio en disco
df -h

# Ver logs de Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 💰 RESUMEN DE COSTOS

### **Opción Económica (Desarrollo)**
- Droplet: 4 vCPU, 8GB RAM - $48/mes
- Database: Compartida - $15/mes
- **Total: $63/mes**

### **Opción Recomendada (Producción)**
- Droplet: 8 vCPU, 16GB RAM - $96/mes
- PostgreSQL Managed: $60/mes
- Redis Managed: $15/mes
- Backups: $20/mes
- **Total: $191/mes**

### **Opción Enterprise (Alta Disponibilidad)**
- Kubernetes Cluster: $150/mes
- Database HA Cluster: $180/mes
- Redis Cluster: $45/mes
- Load Balancer: $60/mes
- **Total: $435/mes**

---

## 🆘 TROUBLESHOOTING

### Error: "Connection refused"
```bash
# Verificar que Docker esté corriendo
systemctl status docker
systemctl start docker

# Verificar firewall
ufw status
ufw allow 8000
```

### Error: "Database connection failed"
```bash
# Verificar credenciales en .env
cat .env.production | grep DB_

# Test conexión
docker exec -it spirit-tours-postgres psql -U spirit_admin -d spirit_tours_prod
```

### Error: "Out of memory"
```bash
# Crear swap file
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

---

## ✅ CONCLUSIÓN

Con estos scripts de instalación automática, puedes tener tu sistema Spirit Tours funcionando en DigitalOcean en **menos de 30 minutos**.

### **Recomendación:**
1. **Para empezar rápido**: Usa el **Script Bash** en un Droplet existente
2. **Para producción**: Usa **Terraform** para gestión profesional
3. **Para múltiples ambientes**: Usa **CLI Script** para automatización completa

**El sistema está 100% listo para instalación automática. Solo necesitas:**
1. Cuenta de DigitalOcean
2. Ejecutar uno de los scripts
3. Configurar tus API keys
4. ¡Listo para producción!

---

**¿Necesitas ayuda con algún paso específico?** El sistema está completamente preparado para desplegarse automáticamente.