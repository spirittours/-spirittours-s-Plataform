# 📱 Guía Completa: Configuración WhatsApp Business API

## Paso 1.1: Crear Facebook Business Manager (5 min)

### 1. Acceder a Facebook Business
```
🔗 URL: https://business.facebook.com
```

**Acciones:**
1. Login con tu cuenta de Facebook
2. Click en "Crear cuenta empresarial"
3. Completar información:
   - Nombre del negocio: **Spirit Tours**
   - Tu nombre completo
   - Email de negocio: **tu_email@spirittours.com**
4. Click "Siguiente" y completar verificación

✅ **Resultado**: Cuenta empresarial creada

---

## Paso 1.2: Solicitar WhatsApp Business API (10 min)

### 1. Acceder a WhatsApp Manager
```
🔗 URL: https://business.facebook.com/wa/manage/home
```

**Acciones:**
1. En el menú lateral, buscar "WhatsApp"
2. Click en "Empezar"
3. Seleccionar "Crear cuenta de WhatsApp Business"

### 2. Configurar número de teléfono

**⚠️ IMPORTANTE: Necesitas un número que NO esté registrado en WhatsApp**

**Opciones:**
- **Opción A**: Comprar nuevo número de teléfono
- **Opción B**: Usar número existente no registrado
- **Opción C**: Usar número de prueba de Meta (para testing)

**Pasos:**
1. Click "Agregar número de teléfono"
2. Seleccionar país: **México (+52)**
3. Ingresar número (ej: 55 1234 5678)
4. Método de verificación: **SMS** o **Llamada**
5. Ingresar código de verificación recibido
6. Confirmar

✅ **Resultado**: Número verificado y asociado

### 3. Crear Perfil de Negocio

**Completar información:**
```
Nombre del negocio: Spirit Tours
Categoría: Travel Agency
Descripción: 
"Expertos en experiencias de viaje inolvidables por México. 
Paquetes todo incluido a Cancún, Riviera Maya, CDMX y más. 
¡Conversemos por WhatsApp! 🏖️✈️"

Website: https://spirittours.com
Email: contacto@spirittours.com
Dirección: Tu dirección física
Horario: 24/7 (con AI Agent)
```

**Logo:**
- Subir logo de Spirit Tours (cuadrado, min 640x640px)

✅ **Resultado**: Perfil completado

---

## Paso 1.3: Obtener Credenciales de API (5 min)

### 1. Acceder a Configuración de API

**Navegación:**
```
Business Manager → WhatsApp Manager → Configuración de API
```

### 2. Obtener Phone Number ID

**Pasos:**
1. Click en tu número de teléfono
2. Copiar el **Phone Number ID**
   - Ejemplo: `123456789012345`
3. Guardar en lugar seguro

### 3. Generar Access Token

**Pasos:**
1. En la misma pantalla, buscar "Access Tokens"
2. Click "Generar token"
3. Seleccionar permisos:
   - ✅ `whatsapp_business_messaging`
   - ✅ `whatsapp_business_management`
4. Click "Generar"
5. **⚠️ COPIAR TOKEN INMEDIATAMENTE** (solo se muestra una vez)
   - Ejemplo: `EAAG7xZBz...` (muy largo)
6. Guardar en lugar MUY seguro

### 4. Configurar Webhook Verify Token

**Crear tu propio token secreto:**
```
Ejemplo: spirit_tours_webhook_2025_secure_token_xyz123
```

**Características:**
- Mínimo 20 caracteres
- Incluir letras, números y símbolos
- NO compartir con nadie
- Usarás este mismo token en tu servidor

✅ **Resultado**: 3 credenciales obtenidas

**Guárdalas así:**
```
PHONE_NUMBER_ID=123456789012345
ACCESS_TOKEN=EAAG7xZBz... (token largo)
WEBHOOK_VERIFY_TOKEN=spirit_tours_webhook_2025_secure_token_xyz123
```

---

## Paso 1.4: Configurar Variables de Entorno (5 min)

### 1. Crear archivo .env

En tu servidor, editar o crear archivo `.env`:

```bash
cd /home/user/webapp/backend
```

Agregar estas líneas al archivo `.env`:

```bash
# WhatsApp Business API Configuration
WHATSAPP_PHONE_NUMBER_ID=TU_PHONE_NUMBER_ID_AQUI
WHATSAPP_ACCESS_TOKEN=TU_ACCESS_TOKEN_AQUI
WHATSAPP_WEBHOOK_VERIFY_TOKEN=TU_VERIFY_TOKEN_AQUI

# OpenAI API (para GPT-4)
OPENAI_API_KEY=TU_OPENAI_KEY_AQUI
```

### 2. Verificar permisos del archivo

```bash
# Proteger el archivo .env
chmod 600 .env

# Verificar que esté en .gitignore
echo ".env" >> .gitignore
```

✅ **Resultado**: Variables configuradas y seguras

---

## Paso 1.5: Configurar Webhook en Meta (5 min)

### 1. Preparar URL de Webhook

**Tu webhook URL será:**
```
https://TU_DOMINIO.com/webhook/whatsapp
```

**Opciones de dominio:**
- **Producción**: `https://api.spirittours.com/webhook/whatsapp`
- **Testing**: `https://tu-server.ngrok.io/webhook/whatsapp` (usando ngrok)

### 2. Registrar Webhook en Meta

**Navegación:**
```
WhatsApp Manager → Configuración → Webhook
```

**Pasos:**
1. Click "Editar"
2. Callback URL: Ingresar tu URL webhook
3. Verify Token: Ingresar tu `WEBHOOK_VERIFY_TOKEN`
4. Click "Verificar y guardar"

**⚠️ IMPORTANTE**: Tu servidor debe estar corriendo para que la verificación funcione

### 3. Suscribir a Eventos

**Seleccionar estos eventos:**
- ✅ `messages` - Mensajes entrantes
- ✅ `message_status` - Estados de entrega
- ✅ `message_echoes` - Confirmaciones

Click "Guardar"

✅ **Resultado**: Webhook configurado y verificado

---

## ✅ VERIFICACIÓN FINAL DEL PASO 1

Deberías tener:

- [x] Facebook Business Manager creado
- [x] Número de WhatsApp verificado
- [x] Perfil de negocio completado
- [x] Phone Number ID obtenido
- [x] Access Token generado
- [x] Verify Token creado
- [x] Variables de entorno configuradas
- [x] Webhook registrado en Meta

**Archivo .env completo:**
```bash
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAG7xZBz...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=spirit_tours_webhook_2025...
OPENAI_API_KEY=sk-...
```

---

## 🧪 PROBAR CONFIGURACIÓN

### Test 1: Verificar credenciales

```bash
# En terminal del servidor
cd /home/user/webapp/backend
node -e "
const dotenv = require('dotenv');
dotenv.config();
console.log('Phone ID:', process.env.WHATSAPP_PHONE_NUMBER_ID ? '✅ OK' : '❌ FALTA');
console.log('Access Token:', process.env.WHATSAPP_ACCESS_TOKEN ? '✅ OK' : '❌ FALTA');
console.log('Verify Token:', process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ? '✅ OK' : '❌ FALTA');
"
```

**Resultado esperado:**
```
Phone ID: ✅ OK
Access Token: ✅ OK
Verify Token: ✅ OK
```

### Test 2: Enviar mensaje de prueba (API)

```bash
curl -X POST \
  "https://graph.facebook.com/v18.0/TU_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "52TU_NUMERO_PERSONAL",
    "type": "text",
    "text": {
      "body": "¡Hola! Este es un mensaje de prueba de Spirit Tours 🏖️"
    }
  }'
```

**Resultado esperado:**
- Recibes el mensaje en tu WhatsApp personal
- Response JSON con `"status": "sent"`

---

## 🚨 TROUBLESHOOTING

### Problema 1: "Invalid phone number"
**Solución:** 
- Verificar que el número NO esté registrado en WhatsApp personal
- Usar formato internacional: +52 55 1234 5678

### Problema 2: "Token inválido"
**Solución:**
- Regenerar Access Token en Meta
- Asegurarse de copiar el token completo
- Verificar que no tenga espacios extras

### Problema 3: "Webhook verification failed"
**Solución:**
- Verificar que el servidor esté corriendo
- Confirmar que WEBHOOK_VERIFY_TOKEN coincida exactamente
- Ver logs del servidor para detalles

### Problema 4: "Rate limit exceeded"
**Solución:**
- En testing: Máximo 1,000 mensajes/día
- Solicitar aumento de límite en Meta
- Para producción: Verificar cuenta empresarial

---

## 📞 SOPORTE META

Si tienes problemas:

1. **Documentación oficial:**
   - https://developers.facebook.com/docs/whatsapp

2. **Business Help Center:**
   - https://business.facebook.com/help

3. **Developer Community:**
   - https://developers.facebook.com/community

---

## ✅ CHECKLIST FINAL

Antes de continuar al Paso 2, verificar:

- [ ] Facebook Business Manager activo
- [ ] WhatsApp Business API aprobado
- [ ] Número verificado y funcionando
- [ ] Phone Number ID copiado
- [ ] Access Token generado y guardado
- [ ] Verify Token creado
- [ ] Archivo .env configurado
- [ ] Webhook registrado en Meta
- [ ] Test de API exitoso (mensaje enviado)

**Si todo está ✅, continúa al Paso 2: Crear Templates**

---

## 💡 TIPS IMPORTANTES

1. **Guarda backups de tokens**: Si pierdes el Access Token, deberás regenerar uno nuevo

2. **Seguridad**: NUNCA subas el archivo .env a GitHub

3. **Testing**: Usa un número personal primero para probar antes de usar número oficial

4. **Límites**: En sandbox mode tienes 1,000 mensajes/día. Para más, solicita Business Verification

5. **Costos**: 
   - Primeros 1,000 conversaciones/mes: GRATIS
   - Después: ~$0.005-$0.009 por conversación
   - Marketing messages: ~$0.027-$0.098

---

**🎉 ¡Paso 1 Completado!**

**Tiempo invertido:** ~30 minutos  
**Status:** ✅ WhatsApp Business API configurado  

**Siguiente:** Paso 2 - Crear Templates en Meta
