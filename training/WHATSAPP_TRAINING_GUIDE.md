# 📱 GUÍA DE TRAINING - WHATSAPP BUSINESS INTEGRATION
**Spirit Tours Platform - WhatsApp Business**  
**Versión:** 1.0  
**Fecha:** Octubre 2024

---

## 📚 TABLA DE CONTENIDOS

1. [Introducción](#introducción)
2. [Configuración Inicial](#configuración-inicial)
3. [Comandos Disponibles](#comandos-disponibles)
4. [Casos de Uso](#casos-de-uso)
5. [Administración](#administración)
6. [Troubleshooting](#troubleshooting)
7. [Ejercicios Prácticos](#ejercicios-prácticos)

---

## 🎯 INTRODUCCIÓN

### ¿Qué es WhatsApp Business Integration?

WhatsApp Business Integration permite a los usuarios de Spirit Tours interactuar con la plataforma mediante WhatsApp para:
- Consultar reportes de ventas
- Ver comisiones
- Recibir alertas automáticas
- Consultar reservas
- Obtener KPIs en tiempo real

### Beneficios

✅ **Acceso Inmediato:** Información al instante sin abrir el navegador  
✅ **Notificaciones Proactivas:** Alertas automáticas de eventos importantes  
✅ **Conveniencia:** Usa la app que ya conoces  
✅ **Seguridad:** Autenticación por número de teléfono  

---

## ⚙️ CONFIGURACIÓN INICIAL

### Paso 1: Registrar tu Número

1. Contacta al administrador con tu número de WhatsApp
2. Proporciona tu rol en la empresa
3. Espera confirmación de registro

### Paso 2: Verificar Acceso

Envía tu primer mensaje al número de WhatsApp Business:

```
+1 415 523 8886 (Sandbox Twilio)
```

O al número oficial de Spirit Tours (cuando esté configurado).

Mensaje de prueba:
```
AYUDA
```

Deberías recibir el menú de comandos disponibles.

### Paso 3: Configurar Notificaciones

Para recibir notificaciones automáticas:
```
SUSCRIBIR DIARIO
```

---

## 📝 COMANDOS DISPONIBLES

### Comandos Básicos

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| **AYUDA** | Muestra menú de comandos | `AYUDA` |
| **ESTADO** | Estado del sistema | `ESTADO` |
| **DASHBOARD** | Link al dashboard web | `DASHBOARD` |

### Reportes de Ventas

| Comando | Parámetros | Ejemplo |
|---------|------------|---------|
| **VENTAS** | HOY/AYER/SEMANA/MES | `VENTAS HOY` |
| | | `VENTAS SEMANA` |
| | | `VENTAS MES` |

**Respuesta ejemplo:**
```
📊 REPORTE DE VENTAS
📅 Periodo: Hoy

💰 Resumen
• Ventas Brutas: $45,320.00
• Ventas Netas: $40,788.00
• Comisiones: $4,532.00
• Transacciones: 23
• Ticket Promedio: $1,773.48

📈 Tendencia
• 📈 Increasing
• Variación: +12.5%
```

### Comisiones

| Comando | Parámetros | Ejemplo |
|---------|------------|---------|
| **COMISIONES** | SEMANA/QUINCENA/MES | `COMISIONES MES` |
| | | `COMISIONES QUINCENA` |

**Respuesta ejemplo:**
```
💵 REPORTE DE COMISIONES
📅 Periodo: Último Mes

💰 Resumen General
• Total Comisiones: $8,450.00
• Empleados: 15
• Promedio: $563.33

📊 Tus Comisiones
• Total: $1,250.00
• Ventas: 18
• Promedio: $69.44
• Máxima: $150.00
```

### Reservas

| Comando | Parámetros | Ejemplo |
|---------|------------|---------|
| **RESERVAS** | [fecha YYYY-MM-DD] | `RESERVAS` |
| | | `RESERVAS 2024-10-15` |

**Respuesta ejemplo:**
```
🎫 RESERVAS - 15/10/2024

📊 Resumen
• Total Reservas: 34
• Pasajeros: 89
• Valor Total: $125,600.00

📈 Por Estado
• ✅ Confirmadas: 28
• ⏳ Pendientes: 4
• ❌ Canceladas: 2

📋 Últimas Reservas
• RES-2024-1001 - Juan Pérez (confirmed)
• RES-2024-1002 - María López (pending)
```

### KPIs y Analytics

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| **KPI** | Indicadores clave del mes | `KPI` |
| **PREDICCION** | Forecast de ventas | `PREDICCION 30` |

**KPI Respuesta ejemplo:**
```
📈 KPIs - Octubre 2024

💰 Ventas
• Total: $850,000.00
• Cantidad: 423
• Promedio: $2,009.46

🎫 Reservas
• Total: 512
• Pasajeros: 1,847

🎯 Performance
• Conversión: 75.5%
• Meta Mensual: 85% alcanzado

🏆 Top Cliente
• Empresa ABC Corp
• $125,000.00
```

### Alertas y Suscripciones

| Comando | Parámetros | Ejemplo |
|---------|------------|---------|
| **ALERTA** | VENTAS/RESERVAS/META | `ALERTA VENTAS 10000` |
| **SUSCRIBIR** | DIARIO/SEMANAL/MENSUAL | `SUSCRIBIR DIARIO` |
| **CANCELAR** | DIARIO/SEMANAL/MENSUAL | `CANCELAR DIARIO` |

---

## 💼 CASOS DE USO

### Caso 1: Vendedor consultando sus ventas del día

**Situación:** Juan, vendedor, quiere ver sus ventas antes de la reunión diaria.

**Pasos:**
1. Abre WhatsApp
2. Envía: `VENTAS HOY`
3. Recibe resumen instantáneo
4. Si necesita más detalle: `DASHBOARD`

### Caso 2: Gerente monitoreando comisiones

**Situación:** María, gerente, necesita revisar comisiones de la quincena.

**Pasos:**
1. Envía: `COMISIONES QUINCENA`
2. Revisa top performers
3. Para reporte completo: `DASHBOARD`

### Caso 3: Director configurando alertas

**Situación:** Carlos, director, quiere alertas cuando las ventas superen $50,000.

**Pasos:**
1. Envía: `ALERTA VENTAS 50000`
2. Confirma configuración
3. Recibe notificaciones automáticas

### Caso 4: Recepcionista verificando reservas

**Situación:** Ana necesita verificar reservas de mañana.

**Pasos:**
1. Envía: `RESERVAS 2024-10-16`
2. Revisa lista de reservas
3. Confirma con clientes

---

## 🔧 ADMINISTRACIÓN

### Para Administradores

#### Agregar Nuevo Usuario

1. Acceder al panel de administración
2. Ir a Usuarios > WhatsApp Access
3. Agregar número de teléfono
4. Asignar rol y permisos
5. Guardar cambios

#### Configurar Mensajes Automáticos

1. Ir a Configuración > WhatsApp
2. Seleccionar tipo de mensaje
3. Personalizar plantilla
4. Programar envío
5. Activar

#### Monitorear Uso

```sql
-- Query para estadísticas de uso
SELECT 
    user_phone,
    COUNT(*) as messages_count,
    DATE(created_at) as date
FROM whatsapp_messages
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY user_phone, DATE(created_at)
ORDER BY date DESC;
```

### Permisos por Rol

| Rol | Comandos Permitidos | Restricciones |
|-----|---------------------|---------------|
| **Admin** | Todos | Ninguna |
| **Director** | Todos excepto admin | Por empresa |
| **Gerente** | Reportes, KPIs | Por sucursal |
| **Supervisor** | Reportes equipo | Por equipo |
| **Vendedor** | Ventas propias | Solo sus datos |
| **Cliente VIP** | Reservas propias | Solo sus reservas |

---

## 🚨 TROUBLESHOOTING

### Problemas Comunes

#### 1. "Número no autorizado"

**Problema:** El sistema no reconoce tu número.

**Solución:**
1. Verifica que tu número esté registrado
2. Confirma formato: sin espacios ni caracteres especiales
3. Contacta al administrador

#### 2. "Error generando reporte"

**Problema:** El reporte no se genera.

**Solución:**
1. Verifica sintaxis del comando
2. Espera 30 segundos y reintenta
3. Usa comando `ESTADO` para verificar sistema
4. Si persiste, reporta al soporte

#### 3. No recibo respuestas

**Problema:** Envías mensajes pero no recibes respuesta.

**Solución:**
1. Verifica conexión a internet
2. Confirma número correcto de WhatsApp Business
3. Revisa que WhatsApp no esté bloqueado
4. Prueba con comando simple: `AYUDA`

#### 4. Datos incorrectos

**Problema:** Los datos mostrados no coinciden.

**Solución:**
1. Verifica período consultado
2. Confirma tu nivel de acceso
3. Los datos se actualizan cada 5 minutos
4. Usa `DASHBOARD` para vista completa

### Códigos de Error

| Código | Significado | Acción |
|--------|-------------|--------|
| ERR_AUTH | Autenticación fallida | Verificar registro |
| ERR_PERM | Sin permisos | Contactar admin |
| ERR_DATA | Error de datos | Reintentar |
| ERR_LIMIT | Límite excedido | Esperar 1 hora |

---

## 📝 EJERCICIOS PRÁCTICOS

### Ejercicio 1: Configuración Inicial
**Objetivo:** Verificar acceso y familiarizarse con comandos básicos.

1. Envía `AYUDA` al WhatsApp Business
2. Revisa los comandos disponibles
3. Prueba `ESTADO` para verificar sistema
4. Solicita `DASHBOARD` para obtener link

### Ejercicio 2: Consulta de Ventas
**Objetivo:** Practicar consultas de reportes.

1. Consulta ventas de hoy: `VENTAS HOY`
2. Consulta ventas de la semana: `VENTAS SEMANA`
3. Compara ambos resultados
4. Identifica la tendencia

### Ejercicio 3: Análisis de Comisiones
**Objetivo:** Entender reportes de comisiones.

1. Consulta comisiones del mes: `COMISIONES MES`
2. Identifica tu total de comisiones
3. Calcula tu promedio por venta
4. Compara con el promedio general

### Ejercicio 4: Configurar Alertas
**Objetivo:** Automatizar notificaciones.

1. Suscríbete a reporte diario: `SUSCRIBIR DIARIO`
2. Configura alerta de ventas: `ALERTA VENTAS 5000`
3. Verifica configuración con `AYUDA`
4. Cancela una suscripción: `CANCELAR DIARIO`

### Ejercicio 5: KPIs y Predicciones
**Objetivo:** Usar analytics avanzados.

1. Consulta KPIs actuales: `KPI`
2. Solicita predicción 30 días: `PREDICCION 30`
3. Analiza la confianza del modelo
4. Compara con metas establecidas

---

## 📊 MÉTRICAS DE ÉXITO

### Para Usuarios
- ✅ Reducción 50% en tiempo de consulta de reportes
- ✅ Acceso 24/7 a información crítica
- ✅ Alertas proactivas de eventos importantes

### Para la Empresa
- ✅ Mayor engagement con la plataforma
- ✅ Decisiones más informadas y rápidas
- ✅ Reducción de carga en soporte

---

## 🆘 SOPORTE

### Canales de Soporte

**WhatsApp Soporte:** +1234567890  
**Email:** soporte@spirit-tours.com  
**Portal:** https://help.spirit-tours.com  
**Horario:** Lun-Vie 8:00-18:00  

### Recursos Adicionales

- [Manual de Usuario Completo](https://docs.spirit-tours.com)
- [Video Tutoriales](https://videos.spirit-tours.com/whatsapp)
- [FAQ](https://faq.spirit-tours.com)
- [Actualizaciones](https://updates.spirit-tours.com)

---

## 🎓 CERTIFICACIÓN

Al completar este training, el usuario debe poder:

- [ ] Configurar su acceso a WhatsApp Business
- [ ] Ejecutar todos los comandos básicos
- [ ] Interpretar reportes de ventas y comisiones
- [ ] Configurar alertas y suscripciones
- [ ] Resolver problemas comunes
- [ ] Usar el sistema eficientemente en su trabajo diario

---

**Documento de Training v1.0**  
**Spirit Tours Platform**  
**Última actualización:** Octubre 2024

---

*"Información al alcance de tu WhatsApp"* 📱