# 📧 GUÍA DE CONFIGURACIÓN DE CUENTAS DE EMAIL
## Spirit Tours - spirittours.us

---

## 📋 LISTADO COMPLETO DE EMAILS A CREAR

### PRIORIDAD 1: ESENCIALES (Crear Primero) ✅

#### Servicio al Cliente
```
1. info@spirittours.us              - Información general y primer contacto
2. support@spirittours.us           - Soporte técnico y ayuda
3. bookings@spirittours.us          - Gestión de reservaciones
4. reservations@spirittours.us      - Confirmaciones y cambios de reservas
```

#### Sistema y Automatización
```
5. noreply@spirittours.us           - Emails automáticos del sistema
6. notifications@spirittours.us     - Notificaciones automáticas
7. admin@spirittours.us             - Administración general
```

---

### PRIORIDAD 2: OPERACIONALES (Crear Esta Semana)

#### Ventas y Marketing
```
8. sales@spirittours.us             - Equipo de ventas
9. quotes@spirittours.us            - Solicitudes de cotización
10. partnerships@spirittours.us     - Alianzas B2B
11. marketing@spirittours.us        - Departamento de marketing
```

#### Operaciones
```
12. operations@spirittours.us       - Gestión operativa
13. dispatch@spirittours.us         - Despacho de tours
14. logistics@spirittours.us        - Logística y coordinación
15. quality@spirittours.us          - Control de calidad
```

#### Finanzas
```
16. billing@spirittours.us          - Facturación
17. payments@spirittours.us         - Procesamiento de pagos
18. accounting@spirittours.us       - Contabilidad
19. refunds@spirittours.us          - Reembolsos
```

---

### PRIORIDAD 3: DEPARTAMENTALES (Crear Este Mes)

#### Tecnología e IA
```
20. tech@spirittours.us             - Soporte técnico
21. ai@spirittours.us               - Servicios de IA
22. developers@spirittours.us       - Equipo de desarrollo
23. api@spirittours.us              - Integraciones API
```

#### Recursos Humanos
```
24. hr@spirittours.us               - RRHH principal
25. careers@spirittours.us          - Oportunidades laborales
26. training@spirittours.us         - Capacitación
```

#### Otros Departamentos
```
27. confirmations@spirittours.us    - Confirmaciones automáticas
28. cancellations@spirittours.us    - Gestión de cancelaciones
29. feedback@spirittours.us         - Retroalimentación de clientes
30. complaints@spirittours.us       - Quejas y reclamos
```

---

### PRIORIDAD 4: ESPECIALIZADOS (Opcional)

#### Servicios Premium
```
31. vip@spirittours.us              - Clientes VIP
32. corporate@spirittours.us        - Cuentas corporativas
33. groups@spirittours.us           - Reservas grupales
34. pilgrimage@spirittours.us       - Tours religiosos
```

#### Sucursales Internacionales
```
35. usa@spirittours.us              - Estados Unidos
36. europe@spirittours.us           - Europa
37. asia@spirittours.us             - Asia
38. latam@spirittours.us            - Latinoamérica
```

---

## 🔧 CONFIGURACIÓN TÉCNICA

### Paso 1: Crear Cuentas en Google Workspace

#### Opción A: Google Workspace (Recomendado)
```bash
1. Ir a admin.google.com
2. Usuarios → Agregar nuevo usuario
3. Crear cada cuenta con contraseña fuerte
4. Asignar permisos apropiados
5. Configurar alias si es necesario
```

**Costo:** ~$6 USD/usuario/mes (Business Starter)

#### Opción B: Email Propio con SendGrid/Mailgun
```bash
Solo para emails transaccionales (noreply, notifications)
Costo: ~$15-50/mes dependiendo del volumen
```

---

### Paso 2: Configurar DNS

#### MX Records (Requerido)
```dns
Nombre: spirittours.us
Tipo: MX
Prioridad: 1
Valor: aspmx.l.google.com

Prioridad: 5
Valor: alt1.aspmx.l.google.com

Prioridad: 5
Valor: alt2.aspmx.l.google.com

Prioridad: 10
Valor: alt3.aspmx.l.google.com

Prioridad: 10
Valor: alt4.aspmx.l.google.com
```

#### SPF Record (Requerido)
```dns
Nombre: spirittours.us
Tipo: TXT
Valor: v=spf1 include:_spf.google.com include:sendgrid.net ~all
```

#### DKIM Record (Requerido)
```dns
Nombre: google._domainkey.spirittours.us
Tipo: TXT
Valor: [Obtener de Google Workspace Admin Console]
```

#### DMARC Record (Recomendado)
```dns
Nombre: _dmarc.spirittours.us
Tipo: TXT
Valor: v=DMARC1; p=quarantine; rua=mailto:dmarc@spirittours.us; pct=100
```

---

### Paso 3: Configurar en el Sistema

#### Actualizar .env
```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@spirittours.us
SMTP_PASSWORD=[App Password from Google]
SMTP_FROM=Spirit Tours <noreply@spirittours.us>

# SendGrid (Backup/Transaccional)
SENDGRID_API_KEY=[Your SendGrid API Key]
SENDGRID_FROM_EMAIL=noreply@spirittours.us
SENDGRID_FROM_NAME=Spirit Tours

# Email Categories
EMAIL_SUPPORT=support@spirittours.us
EMAIL_SALES=sales@spirittours.us
EMAIL_INFO=info@spirittours.us
EMAIL_BOOKING=bookings@spirittours.us
```

#### Crear App Password en Google
```
1. Ir a myaccount.google.com
2. Seguridad → Verificación en 2 pasos (activar)
3. Seguridad → Contraseñas de aplicaciones
4. Generar contraseña para "Spirit Tours System"
5. Copiar la contraseña de 16 caracteres
6. Usar en SMTP_PASSWORD
```

---

## 📨 CONFIGURACIÓN DE RESPUESTAS AUTOMÁTICAS

### Para info@spirittours.us
```
Asunto: Gracias por contactar Spirit Tours

Estimado/a cliente,

Hemos recibido tu mensaje y nuestro equipo te responderá dentro de las próximas 24 horas.

Horario de atención:
Lunes a Viernes: 9:00 AM - 6:00 PM EST
Sábado: 10:00 AM - 2:00 PM EST

Para asuntos urgentes:
📞 +1-800-SPIRIT-1
💬 Chat en vivo: spirittours.us/chat

Saludos,
Equipo Spirit Tours
```

### Para support@spirittours.us
```
Asunto: Ticket de soporte creado - #[AUTO]

Estimado/a cliente,

Tu solicitud de soporte ha sido registrada con el número: #[TICKET_ID]

Nuestro equipo técnico la revisará y te contactará en las próximas 4 horas.

Estado del ticket: spirittours.us/support/[TICKET_ID]

Equipo de Soporte
Spirit Tours
```

---

## 🔀 CONFIGURACIÓN DE ALIASES Y FORWARDING

### Aliases Recomendados

#### Para info@spirittours.us:
```
- contact@spirittours.us → info@spirittours.us
- contacto@spirittours.us → info@spirittours.us
- hello@spirittours.us → info@spirittours.us
```

#### Para support@spirittours.us:
```
- help@spirittours.us → support@spirittours.us
- ayuda@spirittours.us → support@spirittours.us
- soporte@spirittours.us → support@spirittours.us
```

#### Para sales@spirittours.us:
```
- ventas@spirittours.us → sales@spirittours.us
- buy@spirittours.us → sales@spirittours.us
```

---

## 📊 DISTRIBUCIÓN DE RESPONSABILIDADES

### Equipo de Servicio al Cliente (4 personas)
- Monitorean: info@, support@, bookings@, feedback@
- Herramientas: Sistema CRM, Base de conocimientos
- Responden en: < 4 horas

### Equipo de Ventas (3 personas)
- Monitorean: sales@, quotes@, partnerships@
- Herramientas: CRM de ventas, Sistema de cotizaciones
- Responden en: < 2 horas

### Equipo de Operaciones (3 personas)
- Monitorean: operations@, dispatch@, logistics@
- Herramientas: Sistema de operaciones, GPS tracking
- Responden en: < 1 hora

### Equipo de Finanzas (2 personas)
- Monitorean: billing@, payments@, accounting@, refunds@
- Herramientas: Sistema contable, Gateway de pagos
- Responden en: < 24 horas

### Equipo de Tecnología (2 personas)
- Monitorean: tech@, api@, developers@
- Herramientas: Monitoring, Logs, GitHub
- Responden en: < 2 horas (urgencias < 30 min)

---

## 🔐 SEGURIDAD Y MEJORES PRÁCTICAS

### Contraseñas
```
✅ Mínimo 16 caracteres
✅ Incluir mayúsculas, minúsculas, números, símbolos
✅ Única para cada cuenta
✅ Almacenar en gestor de contraseñas (1Password, LastPass)
✅ Cambiar cada 90 días
✅ Activar 2FA en todas las cuentas
```

### Permisos
```
✅ Principio de menor privilegio
✅ Solo admins pueden crear/eliminar cuentas
✅ Managers pueden ver todas las bandejas
✅ Staff solo ve su departamento
✅ Auditar accesos trimestralmente
```

### Backup
```
✅ Exportar emails importantes semanalmente
✅ Backup automático con Google Vault
✅ Retención de 7 años para cumplimiento
✅ Plan de recuperación ante desastres
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Semana 1: Configuración Básica
- [ ] Contratar Google Workspace (4-7 usuarios iniciales)
- [ ] Crear 7 cuentas esenciales (Prioridad 1)
- [ ] Configurar DNS (MX, SPF, DKIM, DMARC)
- [ ] Verificar entrega de emails (test a Gmail, Outlook, Yahoo)
- [ ] Configurar en sistema (.env actualizado)
- [ ] Configurar respuestas automáticas
- [ ] Crear aliases principales

### Semana 2: Expansión
- [ ] Crear 12 cuentas operacionales (Prioridad 2)
- [ ] Configurar reglas de forwarding
- [ ] Integrar con CRM
- [ ] Configurar firmas de email corporativas
- [ ] Entrenar al equipo
- [ ] Documentar procedimientos

### Semana 3: Optimización
- [ ] Crear cuentas departamentales restantes
- [ ] Configurar filtros y etiquetas
- [ ] Implementar plantillas de respuesta
- [ ] Configurar SLAs por departamento
- [ ] Auditar permisos
- [ ] Revisar métricas de respuesta

### Semana 4: Refinamiento
- [ ] Crear cuentas especializadas si es necesario
- [ ] Optimizar flujos de trabajo
- [ ] Implementar automatizaciones
- [ ] Configurar reportes
- [ ] Obtener feedback del equipo
- [ ] Ajustar configuración

---

## 📞 SOPORTE Y CONTACTO

### Para Configuración Técnica
- **Google Workspace Support:** support.google.com/a
- **DNS Provider Support:** (tu proveedor de dominio)
- **SendGrid Support:** support.sendgrid.com

### Para Consultas Internas
- **Admin del Sistema:** admin@spirittours.us
- **Equipo Técnico:** tech@spirittours.us
- **Documentación:** Ver archivos en /docs

---

## 💰 ESTIMACIÓN DE COSTOS

### Google Workspace
```
Business Starter: $6/usuario/mes
- 30 GB almacenamiento
- Gmail profesional
- Meet (100 participantes)
- Calendar, Drive compartido

Para 10 usuarios: $60/mes = $720/año
```

### SendGrid (Transaccional)
```
Free: 100 emails/día
Essentials: $15/mes - 50,000 emails/mes
Pro: $90/mes - 1.5M emails/mes

Recomendado: Essentials ($15/mes)
```

### Total Estimado
```
Año 1: ~$900 (Google + SendGrid)
Incluye: 10 cuentas + emails transaccionales ilimitados
```

---

## 🎯 MÉTRICAS A MONITOREAR

### KPIs de Email
```
📊 Tiempo de respuesta promedio
📊 Emails respondidos/recibidos
📊 Tasa de resolución en primer contacto
📊 Satisfacción del cliente (CSAT)
📊 Tasa de rebote de emails
📊 Tasa de apertura (campañas)
```

### Herramientas de Monitoreo
```
- Google Workspace Admin Console
- Gmail Analytics
- CRM integrado
- Dashboard personalizado
```

---

**✅ SISTEMA DE EMAILS PROFESIONAL LISTO PARA IMPLEMENTACIÓN**

*Guía creada: 6 de Noviembre, 2025*  
*Última actualización: 6 de Noviembre, 2025*