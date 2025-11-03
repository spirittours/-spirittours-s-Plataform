# 🎓 FASE 3: TRAINING DEL EQUIPO

## Objetivo
Capacitar a los equipos de USA y México en el uso del ERP Hub, troubleshooting y best practices.

---

## SCHEDULE OVERVIEW

```
┌─────────────────────────────────────────────────────┐
│  TRAINING SCHEDULE - 2 WEEKS                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  WEEK 1: USA TEAM                                   │
│  ├─ Monday-Tuesday: Core Training (2 days)         │
│  ├─ Wednesday: Hands-on Practice                   │
│  ├─ Thursday: Advanced Topics                      │
│  └─ Friday: Certification Exam                     │
│                                                      │
│  WEEK 2: MÉXICO TEAM                                │
│  ├─ Monday-Tuesday: Core Training (2 days)         │
│  ├─ Wednesday: CFDI 4.0 Deep Dive                  │
│  ├─ Thursday: Advanced Topics                      │
│  └─ Friday: Certification Exam                     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## USA TEAM TRAINING (Week 1)

### Prerequisites

**Participants:**
- ✅ 20 Operations Team members
- ✅ 10 IT Support members
- ✅ 5 Managers

**Materials:**
- ✅ `docs/TRAINING_GUIDE_USA.md` (56KB, 8 módulos)
- ✅ Access to staging environment
- ✅ Sandbox ERP accounts (QB, Xero, FreshBooks)
- ✅ Laptops with browsers
- ✅ Zoom/Teams para training remoto (si aplica)

### Day 1: Fundamentals & QuickBooks USA

**Morning Session (9:00 AM - 12:00 PM)**

**9:00 - 10:00**: Módulo 1 - Fundamentos del ERP Hub
- ✅ ¿Qué es el ERP Hub?
- ✅ Arquitectura del sistema
- ✅ Unified Models
- ✅ Adapter Pattern
- ✅ Flujo de sincronización

**10:00 - 10:15**: Break ☕

**10:15 - 12:00**: Módulo 2 - QuickBooks USA Integration (Part 1)
- ✅ Introducción a QuickBooks Online
- ✅ OAuth 2.0 authentication flow
- ✅ Conectar QuickBooks desde Admin Panel
  - **Hands-on:** Cada participante conecta QB Sandbox

**12:00 - 1:00 PM**: Lunch 🍴

**Afternoon Session (1:00 PM - 5:00 PM)**

**1:00 - 3:00**: Módulo 2 - QuickBooks USA Integration (Part 2)
- ✅ Sincronizar Customer
  - **Hands-on:** Crear y sincronizar 3 customers
- ✅ Sincronizar Invoice
  - **Hands-on:** Crear y sincronizar 3 invoices
- ✅ Sincronizar Payment
  - **Hands-on:** Aplicar 3 payments

**3:00 - 3:15**: Break ☕

**3:15 - 5:00**: Módulo 2 - QuickBooks USA (Part 3)
- ✅ Troubleshooting común
  - Token expired
  - Duplicate customer
  - Rate limit exceeded
- ✅ **Exercise:** Resolver 5 problemas simulados

**End of Day 1**
- ✅ Homework: Leer Módulo 3 (Xero USA)
- ✅ Quiz online (10 preguntas) sobre Day 1

---

### Day 2: Xero, FreshBooks & React Panel

**Morning Session (9:00 AM - 12:00 PM)**

**9:00 - 9:15**: Review & Q&A Day 1

**9:15 - 10:30**: Módulo 3 - Xero USA Integration
- ✅ Introducción a Xero
- ✅ OAuth 2.0 con PKCE (seguridad mejorada)
- ✅ Multi-tenancy (organizations)
- ✅ **Hands-on:** Conectar Xero Demo Company
- ✅ **Hands-on:** Sincronizar contacts, invoices, payments
- ✅ Tracking categories

**10:30 - 10:45**: Break ☕

**10:45 - 12:00**: Módulo 4 - FreshBooks Integration
- ✅ Introducción a FreshBooks
- ✅ Diferencias vs QuickBooks/Xero
- ✅ **Hands-on:** Conectar FreshBooks Test Account
- ✅ **Hands-on:** Sincronizar clients, invoices
- ✅ Cuándo usar FreshBooks

**12:00 - 1:00 PM**: Lunch 🍴

**Afternoon Session (1:00 PM - 5:00 PM)**

**1:00 - 3:00**: Módulo 5 - Panel de Administración React
- ✅ Navegación del panel
- ✅ Dashboard Overview
  - Métricas en tiempo real
  - Gráficos de éxito
- ✅ Connections Manager
  - **Hands-on:** Conectar nuevo ERP
  - **Hands-on:** Editar configuración
  - **Hands-on:** Test connection
- ✅ Sync Monitor
  - **Hands-on:** Ver syncs en tiempo real
  - **Hands-on:** Retry failed sync

**3:00 - 3:15**: Break ☕

**3:15 - 5:00**: Módulo 5 - React Panel (Part 2)
- ✅ Account Mapping Manager
  - **Hands-on:** Mapear cuentas contables
  - **Hands-on:** Export/Import configuration
- ✅ Logs Viewer
  - **Hands-on:** Filtrar logs por ERP
  - **Hands-on:** Search specific error
  - **Hands-on:** Export to CSV

**End of Day 2**
- ✅ Homework: Leer Módulos 6-8
- ✅ Quiz online (15 preguntas) sobre Day 2

---

### Day 3: Workflows & Practice

**Full Day Hands-On (9:00 AM - 5:00 PM)**

**9:00 - 10:30**: Módulo 6 - Workflows de Operación
- ✅ Daily morning routine
- ✅ During day operations
- ✅ End of day routine
- ✅ **Exercise:** Simular día completo
  - 10 reservas
  - 10 invoices
  - 10 payments
  - Verificar en 3 ERPs

**10:30 - 10:45**: Break ☕

**10:45 - 12:00**: Módulo 6 - Workflows (Part 2)
- ✅ Workflow de creación de reserva
- ✅ Timeline completo (customer → invoice → payment)
- ✅ **Exercise:** Crear 5 reservas end-to-end

**12:00 - 1:00 PM**: Lunch 🍴

**1:00 - 3:00**: Módulo 6 - Workflows (Part 3)
- ✅ Workflow de resolución de errores
- ✅ Error severity levels
- ✅ Proceso de troubleshooting
- ✅ **Exercise:** Resolver 10 casos reales
  - Token expired → Re-auth
  - Duplicate customer → Merge
  - Rate limit → Wait
  - Validation error → Fix data
  - Sync stuck → Force cancel + retry

**3:00 - 3:15**: Break ☕

**3:15 - 5:00**: Módulo 6 - Reconciliation
- ✅ Monthly reconciliation workflow
- ✅ **Exercise:** Reconciliar mes completo
  - Export Spirit Tours data
  - Export from each ERP
  - Compare totals
  - Identify discrepancies
  - Document results

---

### Day 4: Advanced Topics

**Morning Session (9:00 AM - 12:00 PM)**

**9:00 - 10:30**: Módulo 7 - Troubleshooting y Soporte
- ✅ 5 Common issues & solutions (deep dive)
- ✅ Escalation matrix
- ✅ Contact information
- ✅ Knowledge base resources
- ✅ **Exercise:** Troubleshooting Olympics
  - 10 problemas complejos
  - Trabajo en equipos
  - Competencia de velocidad

**10:30 - 10:45**: Break ☕

**10:45 - 12:00**: Módulo 8 - Mejores Prácticas
- ✅ Data quality best practices
- ✅ Security best practices
- ✅ Performance best practices
- ✅ Error handling best practices
- ✅ Documentation best practices

**12:00 - 1:00 PM**: Lunch 🍴

**Afternoon Session (1:00 PM - 5:00 PM)**

**1:00 - 3:00**: Advanced Scenarios
- ✅ Bulk imports (100+ customers)
- ✅ Data migration from legacy system
- ✅ Multi-branch configuration
- ✅ Custom account mappings
- ✅ Webhook configuration
- ✅ API access for custom integrations

**3:00 - 3:15**: Break ☕

**3:15 - 5:00**: Q&A Session & Review
- ✅ Open floor questions
- ✅ Review key concepts
- ✅ Prepare for certification

**End of Day 4**
- ✅ Study for certification exam
- ✅ Review all modules

---

### Day 5: Certification

**Morning (9:00 AM - 12:00 PM)**

**9:00 - 10:00**: Written Exam (60 minutes)
```
20 questions covering:
├─ 5 questions: Fundamentos
├─ 5 questions: ERP Integration
├─ 5 questions: Workflows
└─ 5 questions: Troubleshooting

Passing score: 16/20 (80%)
```

**10:00 - 10:15**: Break ☕

**10:15 - 12:00**: Practical Exam (individual, 30 min each)
```
Scenario:
Customer Jane Doe hace una reserva para "Orlando Adventure" 
por $899.99 + $72 tax. Paga con tarjeta de crédito.

Tasks (30 minutos):
1. Sincronizar customer a QuickBooks Sandbox
2. Sincronizar invoice
3. Sincronizar payment
4. Validar en QuickBooks
5. Verificar en panel admin
6. Export logs
7. Presentar resultado al instructor

Grading:
├─ Customer sincronizado: 3 pts
├─ Invoice sincronizada: 3 pts
├─ Payment sincronizado: 3 pts
├─ Datos validados en QB: 3 pts
├─ Logs exportados: 3 pts
└─ Explicación clara: 5 pts

Total: 20 pts (passing: 16+)
```

**12:00 - 1:00 PM**: Lunch 🍴

**Afternoon (1:00 PM - 3:00 PM)**

**1:00 - 2:00**: Results & Certificates
- ✅ Announce results
- ✅ Issue certificates
- ✅ Digital badges (LinkedIn)
- ✅ Add to certified operators list

**2:00 - 3:00**: Graduation & Feedback
- ✅ Group photo
- ✅ Feedback survey
- ✅ Next steps discussion
- ✅ Celebration! 🎉

---

## MÉXICO TEAM TRAINING (Week 2)

### Differences from USA Training

**Same as USA:**
- ✅ Módulos 1, 5, 6, 7, 8 (identical)
- ✅ Panel React (same UI)
- ✅ Workflows (same process)

**México-Specific Additions:**

### Day 1: Fundamentos + CONTPAQi

**Morning:** Same as USA Day 1 Morning (Módulo 1)

**Afternoon:** 
- ✅ Módulo 2-MX: CONTPAQi Integration
  - ✅ Introducción a CONTPAQi (líder México 60%)
  - ✅ Session-based authentication (24 hours)
  - ✅ Company database selection
  - ✅ **Hands-on:** Conectar CONTPAQi test DB
  - ✅ **Hands-on:** Sincronizar clientes
  - ✅ **Hands-on:** Crear documentos (facturas)

### Day 2: QuickBooks MX + Alegra + React Panel

**Morning:**
- ✅ Módulo 3-MX: QuickBooks México
  - ✅ Diferencias vs QuickBooks USA
  - ✅ CFDI fields en CustomFields
  - ✅ SAT catalogs integration
  - ✅ **Hands-on:** Conectar QB MX Sandbox
  - ✅ **Hands-on:** Crear invoice con CFDI fields

- ✅ Módulo 4-MX: Alegra
  - ✅ Platform LATAM moderna
  - ✅ Basic Authentication
  - ✅ **Hands-on:** Conectar Alegra Test
  - ✅ **Hands-on:** Crear contactos e invoices

**Afternoon:** Same as USA Day 2 Afternoon (React Panel)

### Day 3: CFDI 4.0 Deep Dive

**Full Day CFDI (9:00 AM - 5:00 PM)**

**9:00 - 10:30**: ¿Qué es CFDI 4.0?
- ✅ Historia del CFDI (1.0 → 4.0)
- ✅ Requisitos del SAT
- ✅ Componentes de un CFDI
- ✅ Diferencias con factura tradicional

**10:30 - 10:45**: Break ☕

**10:45 - 12:00**: Estructura del CFDI XML
- ✅ Comprobante (root)
- ✅ Emisor (Spirit Tours)
- ✅ Receptor (Cliente)
- ✅ Conceptos (line items)
- ✅ Impuestos (IVA, retenciones)
- ✅ **Hands-on:** Ver XML de ejemplo
- ✅ **Hands-on:** Identificar cada sección

**12:00 - 1:00 PM**: Lunch 🍴

**1:00 - 2:30**: Catálogos SAT
- ✅ UsoCFDI (G01, G03, P01)
- ✅ MetodoPago (PUE, PPD)
- ✅ FormaPago (01-99)
- ✅ TipoComprobante (I, E, T, P)
- ✅ RegimenFiscal
- ✅ **Exercise:** Clasificar 20 casos reales
  - Cliente compra tour → ¿Qué CFDI usar?
  - Pago en parcialidades → ¿PUE o PPD?
  - Efectivo vs tarjeta → ¿Forma de pago?

**2:30 - 2:45**: Break ☕

**2:45 - 4:00**: Proceso de Timbrado
- ✅ CSD (Certificado de Sello Digital)
- ✅ Sellado digital
- ✅ PAC (Proveedor Autorizado)
- ✅ UUID único
- ✅ QR Code
- ✅ **Hands-on:** Generar CFDI de prueba
  - Desde panel admin
  - Ver XML generado
  - Verificar firma digital
  - Ver UUID
  - Escanear QR code

**4:00 - 5:00**: Validación y Cancelación
- ✅ Validar CFDI en portal SAT
- ✅ **Hands-on:** Validar 5 CFDIs
- ✅ Proceso de cancelación
- ✅ **Hands-on:** Cancelar CFDI de prueba
- ✅ Notas de crédito
- ✅ Complemento de Pago

### Day 4-5: Same as USA (Advanced + Certification)

**Certification includes:**
- ✅ 25 questions (20 general + 5 CFDI)
- ✅ Practical exam includes CFDI validation

---

## TRAINING MATERIALS

### Provided to Each Participant

```
📦 Training Package:
├─ 📘 TRAINING_GUIDE_USA.md (printed, 200 pages)
├─ 💾 USB drive with:
│  ├─ All documentation
│  ├─ Video tutorials
│  ├─ Troubleshooting flowcharts
│  └─ Cheat sheets
├─ 🖊️ Notebook + pen
├─ 🎫 Sandbox credentials (QB, Xero, FB)
└─ ☕ Coffee + snacks (all days)
```

### Online Resources

```
Portal: https://training.spirittours.com/erp-hub

Access:
├─ Video recordings of all sessions
├─ Interactive quizzes
├─ Troubleshooting simulator
├─ Certificate download
└─ Slack community #erp-certified-operators
```

---

## POST-TRAINING SUPPORT

### Week 1 After Training
- ✅ Daily standup calls (30 min)
- ✅ Slack support channel active
- ✅ Instructor available for questions

### Week 2-4 After Training
- ✅ Weekly check-ins
- ✅ Q&A sessions (Friday 4 PM)
- ✅ Knowledge base updates

### Ongoing
- ✅ Quarterly refresher sessions
- ✅ New features training
- ✅ Annual re-certification

---

## SUCCESS METRICS

```
Target Certification Rates:
├─ USA Team: 90%+ (18/20 operations)
├─ México Team: 85%+ (13/15 operations)
└─ IT Support: 100% (10/10)

Post-Training Performance:
├─ Error resolution time: < 15 min (from 45 min)
├─ Sync success rate: > 98% (from 85%)
├─ User satisfaction: > 4.5/5
└─ Support tickets: -70%
```

---

## BUDGET

```
USA Training (Week 1):
├─ Instructor (5 days): $5,000
├─ Venue rental: $2,000
├─ Materials (35 participants): $1,750
├─ Catering (5 days): $3,500
├─ Certificates: $350
└─ Total: $12,600

México Training (Week 2):
├─ Instructor (5 days): $5,000
├─ Venue rental: $2,000
├─ Materials (30 participants): $1,500
├─ Catering (5 days): $3,000
├─ Certificates: $300
└─ Total: $11,800

GRAND TOTAL: $24,400
```

---

## 🎯 DELIVERABLES

At end of training:
- ✅ 50+ certified operators
- ✅ Digital certificates issued
- ✅ Training completion reports
- ✅ Feedback analysis
- ✅ Knowledge base updated
- ✅ Video library created

**→ READY FOR PHASE 4: PRODUCTION DEPLOYMENT**

¿Necesitas detalles sobre algún módulo específico del training?
