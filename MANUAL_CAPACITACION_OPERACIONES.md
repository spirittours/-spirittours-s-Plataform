# 📚 Manual de Capacitación - Sistema de Operaciones

## Bienvenido al Sistema de Control de Operaciones de Spirit Tours

Este manual te guiará paso a paso en el uso del nuevo sistema de operaciones.

---

## 🎯 Objetivos del Sistema

El sistema de operaciones te permitirá:
- ✅ Gestionar todas las reservas con proveedores
- ✅ Confirmar reservas automáticamente
- ✅ Validar facturas con IA
- ✅ Cerrar grupos de manera eficiente
- ✅ Recibir alertas de anomalías
- ✅ Obtener ayuda 24/7 del chatbot

---

## 📱 Módulo 1: Acceso al Sistema

### 1.1 Inicio de Sesión
1. Abre tu navegador y ve a: `http://localhost:3000/operations`
2. Ingresa tu usuario y contraseña
3. El sistema te redirigirá al Dashboard de Operaciones

### 1.2 Permisos por Rol
- **Director**: Acceso total
- **Jefe de Operaciones**: Gestión completa, no puede modificar proveedores
- **Agente de Operaciones**: Crear y editar reservas
- **Contador**: Solo ver y validar facturas

---

## 🎨 Módulo 2: Dashboard Principal

### 2.1 Métricas en Tiempo Real
El dashboard muestra:
- **Grupos Activos**: Grupos en curso
- **Reservas Pendientes**: Esperando confirmación
- **Próximos Servicios**: Servicios en los próximos 7 días
- **Pagos Pendientes**: Facturas sin pagar

### 2.2 Panel de Alertas
Las alertas se clasifican por color:
- 🔴 **Rojo**: Críticas - Requieren acción inmediata
- 🟠 **Naranja**: Altas - Atención prioritaria
- 🟡 **Amarillo**: Medias - Revisar pronto
- 🔵 **Azul**: Informativas

### 2.3 Acciones Rápidas
Tres botones de acceso rápido:
1. **Nueva Reserva**: Crear reserva con proveedor
2. **Cerrar Grupos**: Ver grupos pendientes de cierre
3. **Validar Facturas**: Procesar facturas pendientes

---

## 📝 Módulo 3: Gestión de Reservas

### 3.1 Crear Nueva Reserva

**Paso 1**: Click en "Nueva Reserva"

**Paso 2**: Completa el formulario:
```
- Proveedor: Selecciona de la lista
- Grupo: Selecciona el grupo
- Tipo de Servicio: Hotel, Transporte, etc.
- Fecha Inicio: Cuándo comienza el servicio
- Fecha Fin: Cuándo termina
- Cantidad: Habitaciones, asientos, etc.
- Precio: Unitario y total
```

**Paso 3**: Click en "Crear Reserva"

El sistema creará automáticamente un item en el checklist del grupo.

### 3.2 Confirmar Reserva

**Paso 1**: En la lista de reservas, encuentra la reserva

**Paso 2**: Click en el icono de confirmación (✓)

**Paso 3**: Ingresa:
```
- Número de Confirmación: Del proveedor
- Confirmado Por: Nombre del contacto
- Email de Confirmación: Email del contacto
- Notas: Cualquier información adicional
```

**Paso 4**: Click en "Confirmar"

💡 **Tip**: Si WhatsApp está activado para el proveedor, se enviará automáticamente una notificación.

### 3.3 Búsqueda de Reservas

Usa los filtros disponibles:
- **Búsqueda por texto**: Número de confirmación, proveedor
- **Por estado**: Pendiente, Confirmado, etc.
- **Por fecha**: Rango de fechas
- **Por grupo**: Reservas de un grupo específico

---

## 📄 Módulo 4: Validación de Facturas con OCR

### 4.1 Subir Factura PDF

**Paso 1**: En la reserva, click en "Subir Factura"

**Paso 2**: Selecciona el archivo PDF

**Paso 3**: El sistema automáticamente:
- ✅ Lee la factura con OCR
- ✅ Extrae número, fecha, monto
- ✅ Compara con la reserva
- ✅ Detecta discrepancias

### 4.2 Revisar Resultados de OCR

El sistema mostrará:
```
✓ Número de Factura: INV-2024-123
✓ Fecha: 15/03/2024
✓ Monto Total: $3,000.00
✓ Coincide con Reserva: Sí

Score de Confianza: 95%
```

### 4.3 Validación Manual

Si hay discrepancias:
1. Revisa los detalles resaltados en rojo
2. Verifica con el proveedor
3. Marca como "Validado" o "Requiere Corrección"

**Ejemplo de Discrepancia**:
```
⚠️ ALERTA: Discrepancia detectada

Esperado: 25 habitaciones × $120 = $3,000
Facturado: 26 habitaciones × $120 = $3,120

Acción requerida: Contactar al proveedor
```

---

## ✅ Módulo 5: Cierre de Grupos

### 5.1 Iniciar Proceso de Cierre

**Paso 1**: Cuando un grupo termina su tour, aparecerá en "Grupos a Cerrar"

**Paso 2**: Click en el grupo

**Paso 3**: Verás el Checklist de Cierre:

```
GRUPO: TS-2024-001
Estado: ⚠️ Pendiente de Cierre
Progreso: ████████░░ 80%

☑️ Hotel Jerusalem Gold - Factura recibida ✓
☑️ Hotel Jerusalem Gold - Pago realizado ✓
☐ Hotel Bethlehem Star - Factura pendiente ✗
☑️ Transporte - Todo completo ✓
☑️ Entradas - Todo completo ✓
```

### 5.2 Completar Items Pendientes

Para cada item pendiente:
1. Click en el item
2. Sube la factura o comprobante
3. El sistema valida automáticamente
4. Marca como "Completo"

### 5.3 Cerrar el Grupo

Cuando todos los items estén completos (verde):
1. Click en "Cerrar Grupo"
2. Confirma la acción
3. El sistema:
   - Marca el grupo como cerrado
   - Envía notificación
   - Genera reporte final
   - Archiva toda la información

⚠️ **Importante**: NO puedes cerrar un grupo con items pendientes

---

## 🤖 Módulo 6: Chatbot IA 24/7

### 6.1 Acceder al Chatbot

El chatbot está disponible en la esquina inferior derecha (💬)

### 6.2 Preguntas Frecuentes

**Ejemplo 1: Cómo crear reserva**
```
Tú: ¿Cómo creo una nueva reserva?

Bot: Para crear una reserva:
1. Ve a Operaciones > Nueva Reserva
2. Selecciona el proveedor y grupo
3. Completa los detalles del servicio
4. Confirma y guarda

[Botón: Nueva Reserva]
```

**Ejemplo 2: Problema con factura**
```
Tú: La factura del hotel no coincide con mi reserva

Bot: Entiendo. Vamos a resolver esto:
1. ¿Cuál es el número de reserva?
2. ¿Qué discrepancia detectaste?
3. ¿Ya contactaste al proveedor?

Te recomiendo:
- Revisar el rooming list
- Verificar las fechas
- Contactar al hotel si la diferencia es mayor al 5%

[Botón: Ver Detalles de Reserva]
```

### 6.3 Análisis de Situaciones

Puedes pedirle al chatbot que analice situaciones:
```
Tú: Tengo un grupo que termina mañana pero faltan 3 facturas

Bot: Analicemos la situación:

📊 Estado actual:
- Grupo: Termina en 24 horas
- Facturas pendientes: 3
- Riesgo: ALTO

🎯 Acciones recomendadas:
1. URGENTE: Contactar proveedores hoy
2. Solicitar facturas por WhatsApp
3. Si no llegan hoy, solicitar por email
4. Escalar a supervisor si no hay respuesta

¿Quieres que envíe recordatorios por WhatsApp?
[Botón: Enviar WhatsApp]
```

---

## 📞 Módulo 7: WhatsApp Business

### 7.1 Activar WhatsApp para Proveedor

Solo administradores pueden activar:
1. Ve a Proveedores
2. Selecciona el proveedor
3. Click en "Configuración de WhatsApp"
4. Toggle "Activar" (por defecto está desactivado)
5. Confirma el número de teléfono

### 7.2 Enviar Notificaciones

Una vez activado, puedes enviar:
- ✉️ **Confirmación de Reserva**: Automática al confirmar
- 📄 **Solicitud de Factura**: Click en "Solicitar Factura"
- 💰 **Recordatorio de Pago**: En reservas con pago pendiente
- 📋 **Solicitud de Rooming**: Para hoteles

**Ejemplo de Mensaje Automático**:
```
Confirmación de reserva para Tierra Santa Marzo 2024.
Número de confirmación: CONF-2024-12345
Fecha: 15/03/2024
Cantidad: 25 habitaciones
```

---

## 🔍 Módulo 8: Detección de Fraudes

### 8.1 Alertas Automáticas

El sistema detecta automáticamente:
- 🚨 Precios inusualmente altos o bajos
- 🚨 Números de confirmación duplicados
- 🚨 Facturas con discrepancias >10%
- 🚨 Modificaciones rápidas (sospechosas)

### 8.2 Qué Hacer con una Alerta de Fraude

**Paso 1**: Revisa la alerta en detalle

**Paso 2**: El sistema mostrará:
```
⚠️ ALERTA DE FRAUDE DETECTADA

Tipo: PRECIO_ANOMALO
Severidad: ALTA
Risk Score: 75/100

Detalles:
- Precio esperado: $120/habitación
- Precio facturado: $180/habitación
- Diferencia: +50%

Recomendación:
- Verificar con el proveedor
- Solicitar justificación por escrito
- No procesar pago sin aprobación de supervisor
```

**Paso 3**: Toma acción según la severidad

---

## 💡 Módulo 9: Tips y Mejores Prácticas

### 9.1 Workflow Diario Recomendado

**Mañana (9:00 AM)**:
1. Revisa el dashboard
2. Verifica alertas críticas
3. Confirma reservas del día

**Durante el día**:
1. Responde a alertas
2. Valida facturas recibidas
3. Actualiza estados de pago

**Tarde (5:00 PM)**:
1. Revisa grupos que terminan pronto
2. Prepara cierres para mañana
3. Verifica pendientes

### 9.2 Atajos de Teclado

- `Ctrl + N`: Nueva reserva
- `Ctrl + F`: Buscar
- `Ctrl + /`: Abrir chatbot
- `Esc`: Cerrar modal

### 9.3 Prevención de Errores

✅ **Haz esto**:
- Confirma reservas inmediatamente
- Sube facturas apenas las recibes
- Valida rooming lists antes de check-in
- Cierra grupos dentro de 3 días

❌ **Evita esto**:
- Dejar reservas sin confirmar más de 24h
- Acumular facturas para validar después
- Cerrar grupos sin revisar el checklist
- Ignorar alertas de validación

---

## 📊 Módulo 10: Reportes y Análisis

### 10.1 Reportes Disponibles

1. **Reporte de Grupo**: Resumen completo de un grupo
2. **Reporte de Proveedor**: Servicios con un proveedor
3. **Reporte Financiero**: Estado de pagos y facturas
4. **Reporte de Anomalías**: Problemas detectados

### 10.2 Exportar Datos

Puedes exportar en:
- 📄 PDF - Para imprimir
- 📊 Excel - Para análisis
- 📧 Email - Para compartir

---

## 🆘 Módulo 11: Solución de Problemas

### Problema 1: No puedo crear una reserva
**Solución**:
1. Verifica que tienes permisos
2. Asegúrate de llenar todos los campos obligatorios
3. Verifica que las fechas sean futuras
4. Contacta a soporte si persiste

### Problema 2: El OCR no lee mi factura
**Solución**:
1. Asegúrate de que el PDF sea de buena calidad
2. Si es escaneado, que esté derecho (no torcido)
3. Intenta con mejor resolución
4. Como último recurso, ingresa los datos manualmente

### Problema 3: No recibo notificaciones de WhatsApp
**Solución**:
1. Verifica que WhatsApp esté activado para el proveedor
2. Confirma el número de teléfono
3. Revisa los logs de notificaciones
4. Contacta al administrador

---

## 📞 Contacto y Soporte

### Soporte Técnico
- 📧 Email: soporte@spirittours.com
- 📱 WhatsApp: +1-XXX-XXX-XXXX
- 🕐 Horario: Lunes a Viernes, 9AM - 6PM

### Documentación Adicional
- Manual técnico: `/docs/SISTEMA_OPERACIONES_COMPLETO_FINAL.md`
- API Documentation: `http://localhost:8000/docs`

---

## ✅ Checklist de Certificación

Para ser certificado en el sistema, debes completar:

- [ ] Crear 5 reservas exitosamente
- [ ] Confirmar 3 reservas con proveedores
- [ ] Validar 2 facturas con OCR
- [ ] Cerrar 1 grupo completamente
- [ ] Resolver 3 alertas
- [ ] Usar el chatbot para obtener ayuda
- [ ] Exportar 1 reporte

Una vez completado, serás un **Operador Certificado** ✨

---

¡Felicidades! Ahora estás listo para usar el Sistema de Operaciones de Spirit Tours.

*Para cualquier duda, recuerda que el chatbot está disponible 24/7.* 🤖