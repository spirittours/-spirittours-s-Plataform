# 🔐 Credenciales Production - Checklist Completo

## USA ERPs

### QuickBooks Online USA

**Paso 1: Acceder al Developer Portal**
```
URL: https://developer.intuit.com
Login: [Tu cuenta Intuit/QuickBooks]
```

**Paso 2: Crear App de Producción**
1. Dashboard → My Apps → Create an app
2. Seleccionar: "QuickBooks Online and Payments"
3. Nombre: "Spirit Tours ERP Hub - Production"
4. Describir: "ERP integration for automatic invoice sync"

**Paso 3: Configurar App**
```
App Settings:
├─ Redirect URIs:
│  └─ https://erp-hub.spirittours.com/oauth/quickbooks/callback
│
├─ Scopes requeridos:
│  ✓ com.intuit.quickbooks.accounting (Full access)
│  ✓ com.intuit.quickbooks.payment (Payment processing)
│
└─ Environment: Production
```

**Paso 4: Obtener Credenciales**
```bash
# Estas aparecerán en el dashboard
QB_USA_CLIENT_ID="ABxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
QB_USA_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Guardar temporalmente
echo "QB_USA_CLIENT_ID=$QB_USA_CLIENT_ID" >> .env.production.temp
echo "QB_USA_CLIENT_SECRET=$QB_USA_CLIENT_SECRET" >> .env.production.temp
```

**Paso 5: Solicitar Aprobación Production (si es primera vez)**
- QuickBooks revisa nuevas apps en 1-2 días hábiles
- Te contactarán si necesitan más info
- Una vez aprobado, podrás conectar cuentas reales

**Estado:** □ Pendiente | □ En Proceso | □ Completado

---

### Xero USA

**Paso 1: Acceder al Developer Portal**
```
URL: https://developer.xero.com/app/manage
Login: [Tu cuenta Xero]
```

**Paso 2: Crear App de Producción**
1. My Apps → New app
2. Tipo: "Web app"
3. Nombre: "Spirit Tours ERP Hub"
4. Company URL: https://spirittours.com
5. Privacy policy URL: https://spirittours.com/privacy
6. Terms of service URL: https://spirittours.com/terms

**Paso 3: Configurar OAuth 2.0**
```
OAuth 2.0 Settings:
├─ Redirect URIs:
│  └─ https://erp-hub.spirittours.com/oauth/xero/callback
│
├─ Scopes:
│  ✓ accounting.transactions (Read and write)
│  ✓ accounting.contacts (Read and write)
│  ✓ accounting.settings (Read only)
│  ✓ offline_access (Refresh tokens)
│
└─ Auth method: OAuth 2.0 with PKCE
```

**Paso 4: Obtener Credenciales**
```bash
XERO_USA_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
XERO_USA_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Guardar
echo "XERO_USA_CLIENT_ID=$XERO_USA_CLIENT_ID" >> .env.production.temp
echo "XERO_USA_CLIENT_SECRET=$XERO_USA_CLIENT_SECRET" >> .env.production.temp
```

**Estado:** □ Pendiente | □ En Proceso | □ Completado

---

### FreshBooks

**Paso 1: Acceder al Developer Portal**
```
URL: https://my.freshbooks.com/#/developer
Login: [Tu cuenta FreshBooks]
```

**Paso 2: Crear App**
1. Create New App
2. App Name: "Spirit Tours ERP Hub"
3. Description: "Automatic invoice synchronization"
4. Website: https://spirittours.com

**Paso 3: Configurar OAuth**
```
OAuth Settings:
├─ Redirect URI:
│  └─ https://erp-hub.spirittours.com/oauth/freshbooks/callback
│
└─ Scopes:
   ✓ admin (Full access)
```

**Paso 4: Obtener Credenciales**
```bash
FRESHBOOKS_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"
FRESHBOOKS_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxx"

# Guardar
echo "FRESHBOOKS_CLIENT_ID=$FRESHBOOKS_CLIENT_ID" >> .env.production.temp
echo "FRESHBOOKS_CLIENT_SECRET=$FRESHBOOKS_CLIENT_SECRET" >> .env.production.temp
```

**Estado:** □ Pendiente | □ En Proceso | □ Completado

---

## MÉXICO ERPs

### CONTPAQi

**Paso 1: Contactar Representante**
```
Contacto CONTPAQi:
├─ Teléfono: +52 55 4000 3456
├─ Email: atencion@contpaqi.com.mx
└─ Website: https://www.contpaqi.com.mx/contacto
```

**Paso 2: Solicitar Credenciales API**
Información necesaria:
- Razón Social: SPIRIT TOURS MEXICO SA DE CV
- RFC: [Tu RFC]
- Producto: CONTPAQi Contabilidad + Factura Electrónica
- Licencia #: [Tu número de licencia]
- Usuarios simultáneos: 5

**Paso 3: Setup Company Database**
```
En CONTPAQi Admin:
1. Sistema → Empresas → Crear Nueva Empresa
2. Nombre: SPIRIT_TOURS_MEXICO
3. RFC: [Tu RFC]
4. Régimen Fiscal: 601 (General de Ley Personas Morales)
```

**Paso 4: Obtener Credenciales**
```bash
CONTPAQI_API_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
CONTPAQI_LICENSE_KEY="xxxx-xxxx-xxxx-xxxx"
CONTPAQI_USER_ID="admin_spirittours"
CONTPAQI_PASSWORD="[secure_password]"
CONTPAQI_COMPANY_DATABASE="SPIRIT_TOURS_MEXICO"
CONTPAQI_API_ENDPOINT="https://api.contpaqi.com/v1"

# Guardar
cat >> .env.production.temp << EOF
CONTPAQI_API_KEY=$CONTPAQI_API_KEY
CONTPAQI_LICENSE_KEY=$CONTPAQI_LICENSE_KEY
CONTPAQI_USER_ID=$CONTPAQI_USER_ID
CONTPAQI_PASSWORD=$CONTPAQI_PASSWORD
CONTPAQI_COMPANY_DATABASE=$CONTPAQI_COMPANY_DATABASE
EOF
```

**Estado:** □ Pendiente | □ En Proceso | □ Completado

---

### QuickBooks México

**Proceso idéntico a QuickBooks USA, pero:**
```
App Name: "Spirit Tours ERP Hub - México"
Region: México
Currency: MXN
Tax Settings: IVA 16%
```

**Credenciales:**
```bash
QB_MX_CLIENT_ID="ABxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
QB_MX_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Guardar
echo "QB_MX_CLIENT_ID=$QB_MX_CLIENT_ID" >> .env.production.temp
echo "QB_MX_CLIENT_SECRET=$QB_MX_CLIENT_SECRET" >> .env.production.temp
```

**Estado:** □ Pendiente | □ En Proceso | □ Completado

---

### Alegra México

**Paso 1: Login a Alegra**
```
URL: https://app.alegra.com
Login: [Tu cuenta Alegra]
```

**Paso 2: Generar API Token**
1. Menú → Configuración → Integraciones
2. API Token → Generar Nuevo Token
3. Nombre: "Spirit Tours ERP Hub"
4. Permisos: Full access

**Paso 3: Obtener Credenciales**
```bash
ALEGRA_USERNAME="[tu_email@spirittours.com]"
ALEGRA_API_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Guardar
echo "ALEGRA_USERNAME=$ALEGRA_USERNAME" >> .env.production.temp
echo "ALEGRA_API_TOKEN=$ALEGRA_API_TOKEN" >> .env.production.temp
```

**Estado:** □ Pendiente | □ En Proceso | □ Completado

---

## MÉXICO - CFDI 4.0

### CSD (Certificado de Sello Digital)

**Paso 1: Obtener e.firma del SAT** (si no la tienes)
```
Portal SAT: https://www.sat.gob.mx
Menú: Trámites → Genera tu e.firma

Requisitos:
- CURP
- RFC
- Correo electrónico
- Identificación oficial
```

**Paso 2: Solicitar CSD**
```
Portal SAT: https://www.sat.gob.mx
Ruta: Trámites → Certificado de Sello Digital

Proceso:
1. Login con e.firma
2. Seleccionar: Generar nuevo certificado
3. Descargar:
   - certificado.cer (público)
   - clave_privada.key (privada)
   - Anotar contraseña de la llave privada
```

**Paso 3: Convertir a PEM**
```bash
# En tu computadora local (requiere OpenSSL)

# Convertir certificado
openssl x509 -inform DER -in certificado.cer -out certificado.pem

# Convertir llave privada
openssl pkcs8 -inform DER -in clave_privada.key -out clave_privada.pem

# Verificar
openssl x509 -in certificado.pem -text -noout
# Debe mostrar: CN=Spirit Tours México, serialNumber=AAA010101AAA
```

**Paso 4: Guardar Archivos de Forma Segura**
```bash
# NO subir a Git
# Guardar en:
CSD_CERTIFICATE=/secure/cfdi/certificado.pem
CSD_PRIVATE_KEY=/secure/cfdi/clave_privada.pem
CSD_PRIVATE_KEY_PASSWORD="[contraseña_del_sat]"

# Anotar datos del certificado
CSD_NUMERO_CERTIFICADO="20001000000300022815"
CSD_VALID_FROM="2025-01-15"
CSD_VALID_UNTIL="2029-01-15"

# Guardar paths (no los archivos)
echo "CSD_CERTIFICATE_PATH=$CSD_CERTIFICATE" >> .env.production.temp
echo "CSD_PRIVATE_KEY_PATH=$CSD_PRIVATE_KEY" >> .env.production.temp
echo "CSD_PRIVATE_KEY_PASSWORD=$CSD_PRIVATE_KEY_PASSWORD" >> .env.production.temp
```

**Estado:** □ Pendiente | □ En Proceso | □ Completado

---

### PAC (Proveedor Autorizado de Certificación)

**Opción Recomendada: Finkok**

**Paso 1: Cotización**
```
Website: https://www.finkok.com
Contacto: ventas@finkok.com
Teléfono: +52 55 4333 2398
```

**Paso 2: Solicitar Cotización**
Email a ventas@finkok.com:
```
Asunto: Cotización Timbrado CFDI - Spirit Tours México

Estimados,

Somos Spirit Tours México, operador turístico con RFC: [TU_RFC]

Solicitamos cotización para timbrado CFDI 4.0:
- Volumen estimado: 500-1,000 facturas/mes
- Tipo de CFDIs: Ingreso, Egreso, Pago
- Requerimos API REST
- Ambiente de pruebas (sandbox)
- SLA 99.9%

¿Pueden enviarnos información de planes y precios?

Gracias,
[Tu nombre]
[Tu teléfono]
```

**Paso 3: Planes y Precios (referencia)**
```
Plan Básico:
├─ $1.00 - $1.50 MXN por timbre
├─ 1,000 timbres mínimo
├─ Costo: ~$1,200 MXN/mes
└─ Incluye: API, soporte, reportes

Plan Empresarial:
├─ $0.80 - $1.20 MXN por timbre
├─ 5,000 timbres mínimo
├─ Costo: ~$5,000 MXN/mes
└─ Incluye: API, soporte prioritario, SLA 99.9%
```

**Paso 4: Contratar Servicio**
1. Firmar contrato
2. Realizar pago
3. Recibir credenciales:

```bash
PAC_PROVIDER="finkok"
PAC_USERNAME="usuario_spirittours"
PAC_PASSWORD="[password_seguro]"
PAC_ENDPOINT="https://facturacion.finkok.com/servicios/soap/stamp"
PAC_ENVIRONMENT="production"

# Guardar
cat >> .env.production.temp << EOF
PAC_PROVIDER=$PAC_PROVIDER
PAC_USERNAME=$PAC_USERNAME
PAC_PASSWORD=$PAC_PASSWORD
PAC_ENDPOINT=$PAC_ENDPOINT
EOF
```

**Paso 5: Configurar PAC de Respaldo (SW)**
```
Website: https://www.sw.com.mx
Email: ventas@sw.com.mx

Credenciales backup:
PAC_BACKUP_PROVIDER="sw"
PAC_BACKUP_USERNAME="usuario_spirittours_sw"
PAC_BACKUP_PASSWORD="[password_backup]"
PAC_BACKUP_ENDPOINT="https://services.sw.com.mx/cfdi/stamp"

# Guardar
cat >> .env.production.temp << EOF
PAC_BACKUP_PROVIDER=$PAC_BACKUP_PROVIDER
PAC_BACKUP_USERNAME=$PAC_BACKUP_USERNAME
PAC_BACKUP_PASSWORD=$PAC_BACKUP_PASSWORD
EOF
```

**Estado:** □ Pendiente | □ En Proceso | □ Completado

---

## Datos de Empresa (México)

```bash
# RFC de Spirit Tours México
SAT_RFC="AAA010101AAA"  # ← Reemplazar con tu RFC real

# Razón Social
SAT_NOMBRE="SPIRIT TOURS MEXICO SA DE CV"

# Régimen Fiscal
SAT_REGIMEN_FISCAL="601"  # General de Ley Personas Morales
# Otros comunes:
# 603 = Personas Morales con Fines no Lucrativos
# 612 = Personas Físicas con Actividades Empresariales

# Domicilio Fiscal
SAT_DOMICILIO_CP="06000"  # Código postal de CDMX (ejemplo)

# Guardar
cat >> .env.production.temp << EOF
SAT_RFC=$SAT_RFC
SAT_NOMBRE="$SAT_NOMBRE"
SAT_REGIMEN_FISCAL=$SAT_REGIMEN_FISCAL
EOF
```

**Estado:** □ Pendiente | □ En Proceso | □ Completado

---

## OTROS SERVICIOS

### AWS Secrets Manager

**Una vez que tengas TODAS las credenciales:**

```bash
# Crear secret en AWS
aws secretsmanager create-secret \
    --name spirit-tours-erp-production \
    --description "ERP Hub production credentials" \
    --secret-string file://.env.production.temp \
    --region us-east-1

# Verificar
aws secretsmanager get-secret-value \
    --secret-id spirit-tours-erp-production \
    --region us-east-1

# IMPORTANTE: Eliminar archivo temporal
shred -vfz -n 10 .env.production.temp
```

**Estado:** □ Pendiente | □ En Proceso | □ Completado

---

### Email (SendGrid o AWS SES)

**SendGrid:**
```
URL: https://app.sendgrid.com
Plan: Essentials ($19.95/mes, 50k emails)

API Key:
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASSWORD="SG.xxxxxxxxxxxxxxxxxxxxxx"
```

**AWS SES:**
```
Service: Amazon Simple Email Service
Region: us-east-1

Credentials:
SES_ACCESS_KEY_ID="AKIAxxxxxxxxxxxx"
SES_SECRET_ACCESS_KEY="xxxxxxxxxxxxxxxx"
SES_REGION="us-east-1"
```

**Estado:** □ Pendiente | □ En Proceso | □ Completado

---

### Slack Webhooks

```bash
# Crear webhook en Slack
URL: https://api.slack.com/apps
1. Create New App
2. Incoming Webhooks → Activate
3. Add New Webhook to Workspace
4. Select channel: #erp-hub-prod-alerts

SLACK_WEBHOOK_URL="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
SLACK_CHANNEL="#erp-hub-prod-alerts"

# Guardar
echo "SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL" >> .env.production.temp
```

**Estado:** □ Pendiente | □ En Proceso | □ Completado

---

## 📊 RESUMEN DE CREDENCIALES

| Servicio | Credenciales Requeridas | Tiempo Estimado | Estado |
|----------|------------------------|-----------------|--------|
| QuickBooks USA | Client ID + Secret | 30 min | □ |
| Xero USA | Client ID + Secret | 30 min | □ |
| FreshBooks | Client ID + Secret | 20 min | □ |
| CONTPAQi | API Key + License | 2-3 días | □ |
| QuickBooks MX | Client ID + Secret | 30 min | □ |
| Alegra | Username + Token | 15 min | □ |
| CSD SAT | Certificados PEM | 2-4 horas | □ |
| PAC Finkok | User + Password | 2-3 días | □ |
| PAC SW (backup) | User + Password | 2-3 días | □ |
| AWS Secrets | N/A (container) | 15 min | □ |
| SendGrid | API Key | 15 min | □ |
| Slack | Webhook URL | 10 min | □ |

**Tiempo Total Estimado:** 
- Configuraciones rápidas: ~3 horas
- Contrataciones (CONTPAQi, PAC): 3-5 días hábiles
- CSD del SAT: 2-4 horas (si ya tienes e.firma)

**TOTAL: ~1 semana** incluyendo esperas de aprobación

---

## ✅ CHECKLIST FINAL

Una vez completado todo:

```bash
# Verificar que tienes TODAS estas variables:

□ QB_USA_CLIENT_ID
□ QB_USA_CLIENT_SECRET
□ XERO_USA_CLIENT_ID
□ XERO_USA_CLIENT_SECRET
□ FRESHBOOKS_CLIENT_ID
□ FRESHBOOKS_CLIENT_SECRET
□ CONTPAQI_API_KEY
□ CONTPAQI_LICENSE_KEY
□ QB_MX_CLIENT_ID
□ QB_MX_CLIENT_SECRET
□ ALEGRA_USERNAME
□ ALEGRA_API_TOKEN
□ CSD_CERTIFICATE_PATH
□ CSD_PRIVATE_KEY_PATH
□ CSD_PRIVATE_KEY_PASSWORD
□ SAT_RFC
□ PAC_PROVIDER
□ PAC_USERNAME
□ PAC_PASSWORD
□ PAC_BACKUP_PROVIDER
□ PAC_BACKUP_USERNAME
□ PAC_BACKUP_PASSWORD
□ SMTP_HOST
□ SMTP_PASSWORD
□ SLACK_WEBHOOK_URL

TOTAL: 25 credenciales requeridas
```

---

## 🎯 PRÓXIMO PASO

Una vez que tengas TODAS las credenciales:

**→ PASAR A FASE 2: DEPLOY A STAGING**

¿Ya tienes algunas credenciales o necesitas ayuda para empezar con alguna en específico?
