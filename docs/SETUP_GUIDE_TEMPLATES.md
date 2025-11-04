# 📝 Guía Paso a Paso: Crear Templates de WhatsApp

## PASO 2: CREAR TEMPLATES EN META (15 min)

Los templates son mensajes pre-aprobados por Meta que puedes enviar para iniciar conversaciones.

---

## 🎯 Templates que Crearemos

Vamos a crear 4 templates esenciales:

1. **spirit_tours_intro** - Saludo inicial B2C
2. **b2b_agency_intro** - Saludo para agencias
3. **follow_up_offer** - Follow-up con oferta
4. **closing_urgency** - Cierre con urgencia

---

## Paso 2.1: Acceder a Message Templates

### 1. Navegar a Templates

```
🔗 Facebook Business Manager
   → WhatsApp Manager
   → Message Templates
   → Create Template
```

---

## Paso 2.2: Template #1 - Spirit Tours Intro (B2C)

### Configuración Básica

```
Template Name: spirit_tours_intro
Category: MARKETING
Language: Spanish (es)
```

### Contenido del Template

**Header (Opcional):**
```
Type: TEXT
Text: ¡Bienvenido a Spirit Tours! ✈️
```

**Body:**
```
Hola {{1}}! 👋

Gracias por tu interés en Spirit Tours.

Somos expertos en crear experiencias de viaje inolvidables por México 🇲🇽

Tenemos paquetes especiales a:
🏖️ Cancún & Riviera Maya
🏛️ Ciudad de México
🌴 Oaxaca & Chiapas

¿En qué destino estás interesado?
```

**Footer (Opcional):**
```
Spirit Tours - Tu mejor experiencia de viaje
```

**Buttons:**
```
Button 1: 
  Type: Quick Reply
  Text: Ver Paquetes

Button 2:
  Type: Quick Reply
  Text: Hablar con Asesor

Button 3:
  Type: Quick Reply
  Text: Más Información
```

### Variables (Body)

```
{{1}} = Nombre del prospecto
```

**Ejemplo de uso:**
```javascript
// En el código
{
  type: 'body',
  parameters: [
    { type: 'text', text: 'María' }
  ]
}

// Resultado:
"Hola María! 👋"
```

### Preview

```
┌─────────────────────────────────────┐
│ ¡Bienvenido a Spirit Tours! ✈️      │
├─────────────────────────────────────┤
│ Hola María! 👋                      │
│                                      │
│ Gracias por tu interés en Spirit    │
│ Tours.                               │
│                                      │
│ Somos expertos en crear experiencias│
│ de viaje inolvidables por México 🇲🇽│
│                                      │
│ Tenemos paquetes especiales a:      │
│ 🏖️ Cancún & Riviera Maya            │
│ 🏛️ Ciudad de México                 │
│ 🌴 Oaxaca & Chiapas                 │
│                                      │
│ ¿En qué destino estás interesado?   │
├─────────────────────────────────────┤
│ Spirit Tours - Tu mejor experiencia │
├─────────────────────────────────────┤
│ [ Ver Paquetes ]                    │
│ [ Hablar con Asesor ]               │
│ [ Más Información ]                 │
└─────────────────────────────────────┘
```

**Click "Submit"** → Esperar aprobación de Meta (1-24 horas)

✅ Template #1 enviado para aprobación

---

## Paso 2.3: Template #2 - B2B Agency Intro

### Configuración Básica

```
Template Name: b2b_agency_intro
Category: UTILITY
Language: Spanish (es)
```

**⚠️ Nota:** Usamos UTILITY porque es para B2B, no marketing masivo

### Contenido del Template

**Header:**
```
Type: TEXT
Text: Oportunidad de Colaboración 🤝
```

**Body:**
```
Hola {{1}}! 👋

Vi que manejas una {{2}}.

En Spirit Tours tenemos una propuesta para ti:

✅ Comisiones competitivas: 15-20%
✅ Soporte 24/7 para tus clientes
✅ Sistema de reservas online
✅ Material de marketing gratuito
✅ Capacitación para tu equipo

Trabajamos con más de 50 agencias en México.

¿Te interesa conocer los detalles?
```

**Footer:**
```
Spirit Tours - Partner Confiable desde 2015
```

**Buttons:**
```
Button 1:
  Type: Quick Reply
  Text: Sí, me interesa

Button 2:
  Type: Quick Reply
  Text: Envíenme información
```

### Variables (Body)

```
{{1}} = Nombre del contacto
{{2}} = Tipo de empresa (agencia de viajes, tour operator, etc.)
```

**Ejemplo de uso:**
```javascript
{
  type: 'body',
  parameters: [
    { type: 'text', text: 'Carlos' },
    { type: 'text', text: 'agencia de viajes' }
  ]
}

// Resultado:
"Hola Carlos! 👋
Vi que manejas una agencia de viajes."
```

**Click "Submit"**

✅ Template #2 enviado para aprobación

---

## Paso 2.4: Template #3 - Follow-up Offer

### Configuración Básica

```
Template Name: follow_up_offer
Category: MARKETING
Language: Spanish (es)
```

### Contenido del Template

**Header:**
```
Type: TEXT
Text: 🎁 Oferta Especial para Ti
```

**Body:**
```
Hola {{1}}! 👋

Veo que estuviste interesado en nuestros paquetes a {{2}}.

Tengo una oferta especial solo para ti:

💰 {{3}}% de descuento
🎁 Upgrade gratis a habitación superior
✈️ Traslados aeropuerto incluidos

Esta oferta es válida solo por 48 horas.

¿Te gustaría aprovecharla?
```

**Footer:**
```
Oferta válida 48 horas
```

**Buttons:**
```
Button 1:
  Type: Quick Reply
  Text: ¡Sí, quiero reservar!

Button 2:
  Type: Quick Reply
  Text: Necesito más información
```

### Variables (Body)

```
{{1}} = Nombre
{{2}} = Destino (Cancún, CDMX, etc.)
{{3}} = Porcentaje de descuento
```

**Ejemplo de uso:**
```javascript
{
  type: 'body',
  parameters: [
    { type: 'text', text: 'Ana' },
    { type: 'text', text: 'Cancún' },
    { type: 'text', text: '15' }
  ]
}

// Resultado:
"Hola Ana! 👋
Veo que estuviste interesado en nuestros paquetes a Cancún.
...
💰 15% de descuento"
```

**Click "Submit"**

✅ Template #3 enviado para aprobación

---

## Paso 2.5: Template #4 - Closing Urgency

### Configuración Básica

```
Template Name: closing_urgency
Category: MARKETING
Language: Spanish (es)
```

### Contenido del Template

**Header:**
```
Type: TEXT
Text: ⏰ ¡Últimos Espacios Disponibles!
```

**Body:**
```
{{1}}, no quiero que te quedes sin tu viaje a {{2}}! 😊

Estado actual:
📍 Solo quedan {{3}} espacios disponibles
⏰ Oferta expira en {{4}} horas
💰 Precio especial: ${{5}} USD

Este es el paquete que te interesó:
✈️ Vuelos incluidos
🏨 Hotel {{6}}
🎫 Tours y actividades

¿Aseguro tu reserva ahora?
```

**Footer:**
```
Spirit Tours - No te quedes sin tu viaje
```

**Buttons:**
```
Button 1:
  Type: Quick Reply
  Text: ¡Reservar ahora!

Button 2:
  Type: Quick Reply
  Text: Necesito pensarlo
```

### Variables (Body)

```
{{1}} = Nombre
{{2}} = Destino
{{3}} = Número de espacios disponibles
{{4}} = Horas restantes
{{5}} = Precio
{{6}} = Categoría de hotel (5 estrellas, etc.)
```

**Ejemplo de uso:**
```javascript
{
  type: 'body',
  parameters: [
    { type: 'text', text: 'Roberto' },
    { type: 'text', text: 'Riviera Maya' },
    { type: 'text', text: '3' },
    { type: 'text', text: '12' },
    { type: 'text', text: '1,599' },
    { type: 'text', text: '5 estrellas Todo Incluido' }
  ]
}
```

**Click "Submit"**

✅ Template #4 enviado para aprobación

---

## ✅ VERIFICACIÓN DE TEMPLATES

### Revisar Status

```
WhatsApp Manager → Message Templates
```

**Verás lista de templates:**

```
┌────────────────────────────────────────────────┐
│ Template Name          │ Status    │ Category  │
├────────────────────────────────────────────────┤
│ spirit_tours_intro     │ PENDING   │ MARKETING │
│ b2b_agency_intro       │ PENDING   │ UTILITY   │
│ follow_up_offer        │ PENDING   │ MARKETING │
│ closing_urgency        │ PENDING   │ MARKETING │
└────────────────────────────────────────────────┘
```

**Status posibles:**
- 🟡 **PENDING** - En revisión (1-24 horas)
- 🟢 **APPROVED** - Aprobado, listo para usar
- 🔴 **REJECTED** - Rechazado, ver razón

### Tiempos de Aprobación

- Promedio: 2-4 horas
- Máximo: 24 horas
- Horario laborable de Meta: Más rápido

### Si es RECHAZADO

**Razones comunes:**
1. Contenido promocional muy agresivo
2. Variables mal ubicadas
3. Información faltante
4. Promesas no respaldadas

**Solución:**
1. Ver el motivo del rechazo
2. Editar el template
3. Re-enviar para aprobación

---

## 🧪 PROBAR TEMPLATES (Después de Aprobación)

### Test Manual desde Meta

1. Ir a **Message Templates**
2. Seleccionar template aprobado
3. Click "Send Test Message"
4. Ingresar tu número personal
5. Llenar variables de ejemplo
6. Click "Send"

### Test desde API

```bash
curl -X POST \
  "https://graph.facebook.com/v18.0/YOUR_PHONE_ID/messages" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "52YOUR_NUMBER",
    "type": "template",
    "template": {
      "name": "spirit_tours_intro",
      "language": {
        "code": "es"
      },
      "components": [
        {
          "type": "body",
          "parameters": [
            {
              "type": "text",
              "text": "María"
            }
          ]
        }
      ]
    }
  }'
```

**Resultado esperado:**
- ✅ Recibes el mensaje en WhatsApp
- ✅ Response JSON: `{"messages": [{"id": "wamid.XXX"}]}`

---

## 📋 TEMPLATES ADICIONALES (Opcional)

Si quieres crear más templates especializados:

### Template: Booking Confirmation

```
Name: booking_confirmation
Category: UTILITY

Body:
"¡Reserva confirmada! ✅

Hola {{1}}, tu reserva está lista:

📍 Destino: {{2}}
📅 Fechas: {{3}}
👥 Personas: {{4}}
💰 Total: ${{5}} USD

Código de reserva: {{6}}

Te enviaremos más detalles por email.

¿Tienes alguna pregunta?"
```

### Template: Payment Reminder

```
Name: payment_reminder
Category: UTILITY

Body:
"Recordatorio de Pago 💳

Hola {{1}}, tu viaje a {{2}} está muy cerca!

Falta un pago pendiente:
💰 Monto: ${{3}} USD
📅 Fecha límite: {{4}}

Link de pago: {{5}}

¿Necesitas ayuda?"
```

---

## 🎨 MEJORES PRÁCTICAS

### 1. Personalización
```
❌ MAL: "Hola, tenemos ofertas"
✅ BIEN: "Hola {{1}}, tenemos una oferta especial para {{2}}"
```

### 2. Call-to-Action Claro
```
❌ MAL: "¿Qué opinas?"
✅ BIEN: "¿Te gustaría reservar ahora?"
```

### 3. Emojis con Moderación
```
❌ MAL: "🎉🎊🥳✨💫⭐🌟" (exceso)
✅ BIEN: "¡Oferta especial! 🎁" (1-2 relevantes)
```

### 4. Longitud Apropiada
```
❌ MAL: 1,000+ caracteres (muy largo)
✅ BIEN: 300-500 caracteres (conciso)
```

### 5. Variables Útiles
```
❌ MAL: {{1}} {{2}} {{3}} (sin contexto)
✅ BIEN: {{nombre}} {{destino}} {{fecha}}
```

---

## 🚨 TROUBLESHOOTING

### Problema: Template Rechazado

**Razón común:** "Promotional content not allowed"

**Solución:**
- Cambiar categoría a UTILITY si es transaccional
- Remover lenguaje muy agresivo de venta
- Ser más informativo, menos promocional

### Problema: Variables no funcionan

**Razón:** Formato incorrecto

**Solución:**
```javascript
// ❌ MAL
"{{nombre}}"  // Sin índice numérico

// ✅ BIEN
"{{1}}"       // Con índice numérico
```

### Problema: Botones no aparecen

**Razón:** Template aún pendiente o rechazado

**Solución:**
- Verificar que status sea APPROVED
- Los botones solo funcionan en templates aprobados

---

## ✅ CHECKLIST FINAL PASO 2

Antes de continuar al Paso 3:

- [ ] Template #1 (intro) - Enviado ✅
- [ ] Template #2 (b2b) - Enviado ✅
- [ ] Template #3 (follow-up) - Enviado ✅
- [ ] Template #4 (closing) - Enviado ✅
- [ ] Todos en status PENDING o APPROVED
- [ ] Tested al menos un template
- [ ] Template funciona correctamente

---

## ⏰ TIEMPOS

| Acción | Tiempo |
|--------|--------|
| Crear 4 templates | 10 min |
| Esperar aprobación | 2-24h |
| Probar templates | 5 min |
| **TOTAL** | **15 min + espera** |

---

## 💡 SIGUIENTE PASO

Mientras esperas la aprobación de templates (puede ser 2-24 horas), puedes:

1. ✅ **Continuar al Paso 3** - Configurar el código del servidor
2. 🧪 Probar con templates de prueba de Meta
3. 📖 Leer documentación adicional
4. ☕ Tomar un café y esperar

**Una vez que templates estén APPROVED:**
- Recibirás notificación por email
- Status cambiará a APPROVED en dashboard
- Podrás usarlos en producción

---

## 📞 RECURSOS

**Documentación de Templates:**
- https://developers.facebook.com/docs/whatsapp/message-templates

**Message Template Guidelines:**
- https://developers.facebook.com/docs/whatsapp/message-templates/guidelines

**Template Samples:**
- https://developers.facebook.com/docs/whatsapp/message-templates/samples

---

**🎉 ¡Paso 2 Completado!**

**Templates creados:** 4  
**Status:** 🟡 Pending Approval  
**Próximo paso:** Activar Sistema (mientras esperas aprobación)

---

**✨ TIP:** No necesitas esperar la aprobación para configurar el código. Puedes continuar al Paso 3 y cuando los templates se aprueben, todo estará listo para funcionar!
