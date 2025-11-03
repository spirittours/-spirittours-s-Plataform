/**
 * Checklist Manager - AI-Powered Accounting Checklists
 * 
 * Sistema de gestión de checklists contables con validación automática por IA.
 * Incluye 5 checklists predefinidos para procesos contables críticos.
 * 
 * Checklists incluidos:
 * 1. Customer Invoice (Facturación a Cliente)
 * 2. Vendor Payment (Pago a Proveedor)
 * 3. Expense Reimbursement (Reembolso de Gastos)
 * 4. Bank Reconciliation (Conciliación Bancaria)
 * 5. Monthly Closing (Cierre Contable Mensual)
 * 
 * @module ChecklistManager
 * @requires openai
 * @requires anthropic
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const mongoose = require('mongoose');
const logger = require('../../utils/logger');

/**
 * Schema para seguimiento de checklist completados
 */
const ChecklistExecutionSchema = new mongoose.Schema({
  checklistType: {
    type: String,
    enum: ['customerInvoice', 'vendorPayment', 'expenseReimbursement', 'bankReconciliation', 'monthlyClosing'],
    required: true
  },
  transactionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  transactionType: { type: String, required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  
  // Progreso del checklist
  progress: {
    total: { type: Number, required: true },
    completed: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 }
  },
  
  // Items del checklist con resultados
  items: [{
    itemId: { type: Number, required: true },
    check: { type: String, required: true },
    critical: { type: Boolean, default: false },
    checked: { type: Boolean, default: false },
    aiValidation: { type: Boolean, default: false },
    aiResult: {
      passed: { type: Boolean },
      message: { type: String },
      details: { type: String },
      issues: [{ type: String }],
      suggestions: [{ type: String }],
      confidence: { type: Number, min: 0, max: 100 }
    },
    notes: { type: String },
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    checkedAt: { type: Date }
  }],
  
  // Estado general
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'failed'],
    default: 'not_started'
  },
  
  // Tiempo
  startedAt: { type: Date },
  completedAt: { type: Date },
  estimatedTime: { type: String },
  actualTime: { type: Number }, // Minutos
  
  // Auditoría
  startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

ChecklistExecutionSchema.index({ transactionId: 1, checklistType: 1 });
ChecklistExecutionSchema.index({ organizationId: 1, status: 1 });
ChecklistExecutionSchema.index({ status: 1, createdAt: -1 });

const ChecklistExecution = mongoose.model('ChecklistExecution', ChecklistExecutionSchema);

/**
 * Definiciones de checklists predefinidos
 */
const CHECKLIST_DEFINITIONS = {
  // 1. FACTURACIÓN A CLIENTE (Ingreso)
  customerInvoice: {
    id: 'CHK-INV-001',
    name: 'Verificación de Factura a Cliente',
    category: 'Ingresos',
    items: [
      {
        id: 1,
        check: 'Cliente existe y está activo en el sistema',
        critical: true,
        aiValidation: true,
        validationRules: ['Cliente registrado', 'RFC válido (México)', 'Datos fiscales completos']
      },
      {
        id: 2,
        check: 'Productos/Servicios tienen precios correctos',
        critical: true,
        aiValidation: true,
        validationRules: ['Precios coinciden con lista', 'Descuentos autorizados', 'IVA calculado correctamente']
      },
      {
        id: 3,
        check: 'Uso de CFDI correcto (México)',
        critical: true,
        aiValidation: true,
        validationRules: ['Uso CFDI apropiado', 'Régimen fiscal correcto', 'Forma de pago válida']
      },
      {
        id: 4,
        check: 'Términos de pago definidos',
        critical: true,
        aiValidation: true,
        validationRules: ['Fecha de vencimiento', 'Condiciones de crédito', 'Penalizaciones por retraso']
      },
      {
        id: 5,
        check: 'Orden de venta o contrato existe',
        critical: false,
        aiValidation: true,
        validationRules: ['OV aprobada', 'Términos acordados', 'Firma del cliente']
      },
      {
        id: 6,
        check: 'Cuentas contables asignadas correctamente',
        critical: true,
        aiValidation: true,
        validationRules: ['Cuenta de ingreso', 'Centro de costo', 'Proyecto/Cliente']
      },
      {
        id: 7,
        check: 'Documentos adjuntos completos',
        critical: false,
        aiValidation: false,
        validationRules: ['Orden de venta', 'Evidencia de entrega', 'Contratos']
      },
      {
        id: 8,
        check: 'Revisión de segundo nivel (si aplica)',
        critical: false,
        aiValidation: false,
        validationRules: ['Facturas > límite', 'Clientes nuevos', 'Descuentos especiales']
      },
      {
        id: 9,
        check: 'CFDI timbrado correctamente (México)',
        critical: true,
        aiValidation: true,
        validationRules: ['UUID válido', 'Sello digital SAT', 'Fecha de timbrado']
      },
      {
        id: 10,
        check: 'Factura enviada al cliente',
        critical: true,
        aiValidation: false,
        validationRules: ['Email confirmado', 'XML + PDF adjuntos', 'Acuse de recibo']
      }
    ],
    estimatedTime: '3-5 minutos',
    requiredFor: ['Todas las facturas > $1,000', 'Clientes nuevos', 'Transacciones internacionales']
  },

  // 2. PAGO A PROVEEDOR (Egreso)
  vendorPayment: {
    id: 'CHK-PAY-001',
    name: 'Verificación de Pago a Proveedor',
    category: 'Egresos',
    items: [
      {
        id: 1,
        check: 'Proveedor registrado y verificado',
        critical: true,
        aiValidation: true,
        validationRules: ['Proveedor existe en sistema', 'Datos bancarios verificados', 'No está en lista negra']
      },
      {
        id: 2,
        check: 'Factura del proveedor recibida y válida',
        critical: true,
        aiValidation: true,
        validationRules: ['XML + PDF (México)', 'Timbrado SAT válido', 'Datos coinciden con orden']
      },
      {
        id: 3,
        check: 'Orden de compra o contrato existe',
        critical: true,
        aiValidation: true,
        validationRules: ['OC aprobada', 'Monto dentro de límite', 'Autorizada por responsable']
      },
      {
        id: 4,
        check: 'Monto de pago coincide con factura',
        critical: true,
        aiValidation: true,
        validationRules: ['Monto exacto', 'Descuentos aplicados', 'Retenciones calculadas']
      },
      {
        id: 5,
        check: 'Autorización de pago obtenida',
        critical: true,
        aiValidation: false,
        validationRules: ['Firma digital del aprobador', 'Nivel de autorización correcto', 'No excede límite del rol']
      },
      {
        id: 6,
        check: 'Retenciones calculadas correctamente (México)',
        critical: true,
        aiValidation: true,
        validationRules: ['IVA retenido si aplica', 'ISR retenido si aplica', 'Complemento de pago generado']
      },
      {
        id: 7,
        check: 'Método de pago seguro configurado',
        critical: true,
        aiValidation: false,
        validationRules: ['Transferencia bancaria', 'Datos cuenta destino verificados', 'No es pago en efectivo > límite']
      },
      {
        id: 8,
        check: 'No hay indicadores de fraude',
        critical: true,
        aiValidation: true,
        validationRules: ['Score de fraude < 20%', 'Proveedor no duplicado', 'Patrón de pago normal']
      },
      {
        id: 9,
        check: 'Cuenta contable asignada correctamente',
        critical: true,
        aiValidation: true,
        validationRules: ['Cuenta de gastos válida', 'Centro de costo correcto', 'Categoría adecuada']
      },
      {
        id: 10,
        check: 'Documentos adjuntos completos',
        critical: false,
        aiValidation: false,
        validationRules: ['Factura PDF/XML', 'OC', 'Evidencia de servicio', 'Autorización']
      }
    ],
    estimatedTime: '5-8 minutos',
    requiredFor: ['Todos los pagos > $500', 'Proveedores nuevos', 'Pagos internacionales']
  },

  // 3. REEMBOLSO DE GASTOS
  expenseReimbursement: {
    id: 'CHK-EXP-001',
    name: 'Verificación de Reembolso de Gastos',
    category: 'Egresos',
    items: [
      {
        id: 1,
        check: 'Empleado existe y está activo',
        critical: true,
        aiValidation: true,
        validationRules: ['Empleado registrado', 'Cuenta bancaria verificada', 'No suspendido']
      },
      {
        id: 2,
        check: 'Gastos dentro de política de empresa',
        critical: true,
        aiValidation: true,
        validationRules: ['Categorías permitidas', 'Montos dentro de límites', 'Fechas dentro de periodo']
      },
      {
        id: 3,
        check: 'Comprobantes fiscales válidos adjuntos',
        critical: true,
        aiValidation: true,
        validationRules: ['Facturas a nombre de empresa', 'CFDI válido (México)', 'Recibos escaneados legibles']
      },
      {
        id: 4,
        check: 'Descripción de gastos clara y detallada',
        critical: false,
        aiValidation: true,
        validationRules: ['Motivo del gasto', 'Proyecto/cliente asociado', 'Justificación de negocio']
      },
      {
        id: 5,
        check: 'Autorización del supervisor obtenida',
        critical: true,
        aiValidation: false,
        validationRules: ['Aprobación digital', 'Supervisor con autoridad', 'Dentro de límite aprobación']
      },
      {
        id: 6,
        check: 'No hay duplicación de gastos',
        critical: true,
        aiValidation: true,
        validationRules: ['Fechas y montos únicos', 'No solicitado previamente', 'Comprobantes no usados']
      },
      {
        id: 7,
        check: 'Cálculo de reembolso correcto',
        critical: true,
        aiValidation: true,
        validationRules: ['Suma correcta', 'IVA deducible calculado', 'Conversión de moneda si aplica']
      },
      {
        id: 8,
        check: 'Categorización contable correcta',
        critical: true,
        aiValidation: true,
        validationRules: ['Cuenta contable apropiada', 'Centro de costo asignado', 'Proyecto vinculado']
      }
    ],
    estimatedTime: '4-6 minutos',
    requiredFor: ['Todos los reembolsos', 'Especialmente gastos ejecutivos']
  },

  // 4. CONCILIACIÓN BANCARIA
  bankReconciliation: {
    id: 'CHK-BNK-001',
    name: 'Verificación de Conciliación Bancaria',
    category: 'Conciliación',
    items: [
      {
        id: 1,
        check: 'Estado de cuenta bancario descargado',
        critical: true,
        aiValidation: false,
        validationRules: ['Archivo oficial del banco', 'Fechas correctas', 'Formato compatible']
      },
      {
        id: 2,
        check: 'Todos los movimientos importados',
        critical: true,
        aiValidation: true,
        validationRules: ['Conteo coincide', 'Sin errores de importación', 'Fechas en rango']
      },
      {
        id: 3,
        check: 'Movimientos emparejados con registros contables',
        critical: true,
        aiValidation: true,
        validationRules: ['% de emparejamiento > 95%', 'Diferencias identificadas', 'Tolerancia de centavos']
      },
      {
        id: 4,
        check: 'Partidas en tránsito identificadas',
        critical: true,
        aiValidation: true,
        validationRules: ['Cheques no cobrados', 'Depósitos no reflejados', 'Fechas de emisión']
      },
      {
        id: 5,
        check: 'Cargos bancarios registrados',
        critical: true,
        aiValidation: true,
        validationRules: ['Comisiones', 'Intereses', 'Otros cargos automáticos']
      },
      {
        id: 6,
        check: 'Diferencias explicadas y documentadas',
        critical: true,
        aiValidation: false,
        validationRules: ['Notas de explicación', 'Evidencia adjunta', 'Ajustes propuestos']
      },
      {
        id: 7,
        check: 'Saldo conciliado correcto',
        critical: true,
        aiValidation: true,
        validationRules: ['Saldo libro + ajustes = Saldo banco', 'Diferencia = $0.00', 'Fórmula correcta']
      },
      {
        id: 8,
        check: 'Revisión de segundo nivel completada',
        critical: true,
        aiValidation: false,
        validationRules: ['Revisor diferente', 'Firma de aprobación', 'Fecha de revisión']
      }
    ],
    estimatedTime: '15-30 minutos',
    requiredFor: ['Mensual obligatorio', 'Todas las cuentas bancarias']
  },

  // 5. CIERRE CONTABLE MENSUAL
  monthlyClosing: {
    id: 'CHK-CLS-001',
    name: 'Checklist de Cierre Contable Mensual',
    category: 'Cierre',
    items: [
      {
        id: 1,
        check: 'Todas las facturas del mes registradas',
        critical: true,
        aiValidation: true,
        validationRules: ['Sin pendientes', 'Fechas dentro del mes', 'Ingresos completos']
      },
      {
        id: 2,
        check: 'Todos los pagos del mes registrados',
        critical: true,
        aiValidation: true,
        validationRules: ['Gastos completos', 'Proveedores pagados', 'Nómina registrada']
      },
      {
        id: 3,
        check: 'Conciliaciones bancarias completadas',
        critical: true,
        aiValidation: true,
        validationRules: ['Todas las cuentas conciliadas', 'Diferencias = $0', 'Aprobadas']
      },
      {
        id: 4,
        check: 'Asientos de ajuste registrados',
        critical: true,
        aiValidation: true,
        validationRules: ['Depreciación', 'Amortización', 'Provisiones', 'Acumulaciones']
      },
      {
        id: 5,
        check: 'Inventarios actualizados (si aplica)',
        critical: false,
        aiValidation: true,
        validationRules: ['Conteo físico', 'Ajustes registrados', 'Valoración correcta']
      },
      {
        id: 6,
        check: 'Balance de comprobación cuadrado',
        critical: true,
        aiValidation: true,
        validationRules: ['Debe = Haber', 'Sin diferencias', 'Todas las cuentas']
      },
      {
        id: 7,
        check: 'Estados financieros generados',
        critical: true,
        aiValidation: true,
        validationRules: ['Balance General', 'Estado de Resultados', 'Flujo de Efectivo']
      },
      {
        id: 8,
        check: 'Análisis de variaciones completado',
        critical: false,
        aiValidation: true,
        validationRules: ['vs Mes anterior', 'vs Presupuesto', 'Variaciones > 10% explicadas']
      },
      {
        id: 9,
        check: 'Revisión de cuentas por cobrar',
        critical: true,
        aiValidation: true,
        validationRules: ['Antigüedad analizada', 'Cuentas incobrables provisionadas', 'Seguimiento activo']
      },
      {
        id: 10,
        check: 'Revisión de cuentas por pagar',
        critical: true,
        aiValidation: true,
        validationRules: ['Antigüedad revisada', 'Compromisos futuros identificados', 'Pagos programados']
      },
      {
        id: 11,
        check: 'Cumplimiento regulatorio verificado',
        critical: true,
        aiValidation: true,
        validationRules: ['Declaraciones preparadas', 'Impuestos calculados', 'Fechas límite identificadas']
      },
      {
        id: 12,
        check: 'Respaldo de datos completado',
        critical: true,
        aiValidation: false,
        validationRules: ['Backup de base de datos', 'Documentos archivados', 'Verificación de restore']
      },
      {
        id: 13,
        check: 'Revisión gerencial completada',
        critical: true,
        aiValidation: false,
        validationRules: ['Reunión de cierre', 'KPIs revisados', 'Firma CFO/Controller']
      }
    ],
    estimatedTime: '2-4 horas',
    requiredFor: ['Obligatorio mensual', 'Antes de cualquier reporte externo']
  }
};

/**
 * Checklist Manager Class
 */
class ChecklistManager {
  constructor(config = {}) {
    this.config = {
      primaryProvider: config.primaryProvider || 'openai',
      fallbackProvider: config.fallbackProvider || 'anthropic',
      temperature: config.temperature || 0.1, // Muy bajo para respuestas consistentes
      ...config
    };

    // Inicializar clientes AI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Estadísticas
    this.stats = {
      checklistsStarted: 0,
      checklistsCompleted: 0,
      aiValidationsRun: 0,
      aiValidationsPassed: 0,
      avgCompletionTime: 0
    };
  }

  /**
   * Obtener definición de checklist
   */
  getChecklistDefinition(checklistType) {
    const definition = CHECKLIST_DEFINITIONS[checklistType];
    if (!definition) {
      throw new Error(`Checklist type not found: ${checklistType}`);
    }
    return definition;
  }

  /**
   * Listar todos los checklists disponibles
   */
  listAvailableChecklists() {
    return Object.keys(CHECKLIST_DEFINITIONS).map(key => ({
      type: key,
      ...CHECKLIST_DEFINITIONS[key]
    }));
  }

  /**
   * Iniciar un nuevo checklist
   */
  async startChecklist(checklistType, transactionId, transactionType, organizationId, branchId, userId) {
    try {
      const definition = this.getChecklistDefinition(checklistType);
      
      // Crear ejecución de checklist
      const execution = new ChecklistExecution({
        checklistType,
        transactionId,
        transactionType,
        organizationId,
        branchId,
        progress: {
          total: definition.items.length,
          completed: 0,
          percentage: 0
        },
        items: definition.items.map(item => ({
          itemId: item.id,
          check: item.check,
          critical: item.critical,
          checked: false,
          aiValidation: item.aiValidation,
          notes: ''
        })),
        status: 'in_progress',
        startedAt: new Date(),
        estimatedTime: definition.estimatedTime,
        startedBy: userId
      });

      await execution.save();
      
      this.stats.checklistsStarted++;
      logger.info(`Checklist iniciado: ${checklistType} para transacción ${transactionId}`);

      // Ejecutar validaciones AI automáticas en background
      this.runAIValidations(execution._id, transactionId);

      return execution;
      
    } catch (error) {
      logger.error('Error al iniciar checklist:', error);
      throw error;
    }
  }

  /**
   * Ejecutar validaciones AI automáticas
   */
  async runAIValidations(executionId, transactionId) {
    try {
      const execution = await ChecklistExecution.findById(executionId);
      if (!execution) return;

      const definition = this.getChecklistDefinition(execution.checklistType);
      
      // Obtener datos de la transacción
      const Transaction = mongoose.model('Transaction');
      const transaction = await Transaction.findById(transactionId)
        .populate('customer')
        .populate('vendor')
        .populate('lineItems')
        .populate('attachments');

      if (!transaction) {
        logger.error(`Transacción no encontrada: ${transactionId}`);
        return;
      }

      // Ejecutar validación para cada item que requiere AI
      for (let i = 0; i < execution.items.length; i++) {
        const item = execution.items[i];
        const itemDef = definition.items.find(d => d.id === item.itemId);
        
        if (itemDef && itemDef.aiValidation) {
          try {
            const result = await this.validateChecklistItem(itemDef, transaction);
            
            // Actualizar item con resultado
            execution.items[i].aiResult = result;
            this.stats.aiValidationsRun++;
            if (result.passed) {
              this.stats.aiValidationsPassed++;
            }
            
          } catch (error) {
            logger.error(`Error en validación AI del item ${item.itemId}:`, error);
            execution.items[i].aiResult = {
              passed: false,
              message: 'Error en validación AI',
              details: error.message,
              confidence: 0
            };
          }
        }
      }

      execution.updatedAt = new Date();
      await execution.save();
      
      logger.info(`Validaciones AI completadas para checklist ${executionId}`);
      
    } catch (error) {
      logger.error('Error ejecutando validaciones AI:', error);
    }
  }

  /**
   * Validar un item específico del checklist con AI
   */
  async validateChecklistItem(item, transaction) {
    const prompt = `
Actúa como un contador experto certificado. Valida el siguiente punto de un checklist contable:

**Punto a validar**: ${item.check}

**Reglas de validación**:
${item.validationRules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

**Datos de la transacción**:
${JSON.stringify({
  id: transaction._id,
  type: transaction.type,
  amount: transaction.amount,
  currency: transaction.currency,
  date: transaction.date,
  description: transaction.description,
  customer: transaction.customer ? {
    name: transaction.customer.name,
    rfc: transaction.customer.rfc,
    isActive: transaction.customer.isActive
  } : null,
  vendor: transaction.vendor ? {
    name: transaction.vendor.name,
    rfc: transaction.vendor.rfc,
    isActive: transaction.vendor.isActive
  } : null,
  lineItems: transaction.lineItems,
  status: transaction.status
}, null, 2)}

**Instrucciones**:
1. Verifica si la transacción cumple TODAS las reglas de validación
2. Identifica cualquier problema o irregularidad
3. Proporciona una explicación clara del resultado
4. Si hay problemas, sugiere cómo corregirlos
5. Asigna un nivel de confianza (0-100) a tu validación

**Formato de respuesta** (JSON):
{
  "passed": true/false,
  "message": "Explicación breve del resultado",
  "details": "Detalles adicionales",
  "issues": ["problema1", "problema2"],
  "suggestions": ["sugerencia1", "sugerencia2"],
  "confidence": 0-100
}
`;

    try {
      // Intentar con OpenAI primero
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'Eres un contador experto que valida checklists contables.' },
          { role: 'user', content: prompt }
        ],
        temperature: this.config.temperature,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result;
      
    } catch (error) {
      logger.error('Error en validación AI (intentando fallback):', error);
      
      // Fallback a Anthropic
      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          temperature: this.config.temperature,
          messages: [
            { role: 'user', content: prompt }
          ]
        });

        const result = JSON.parse(response.content[0].text);
        return result;
        
      } catch (fallbackError) {
        logger.error('Error en fallback AI:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Marcar un item como completado
   */
  async checkItem(executionId, itemId, checked, notes, userId) {
    try {
      const execution = await ChecklistExecution.findById(executionId);
      if (!execution) {
        throw new Error('Checklist execution not found');
      }

      const itemIndex = execution.items.findIndex(i => i.itemId === itemId);
      if (itemIndex === -1) {
        throw new Error(`Item ${itemId} not found in checklist`);
      }

      // Actualizar item
      execution.items[itemIndex].checked = checked;
      execution.items[itemIndex].notes = notes || execution.items[itemIndex].notes;
      execution.items[itemIndex].checkedBy = userId;
      execution.items[itemIndex].checkedAt = new Date();

      // Actualizar progreso
      const completedCount = execution.items.filter(i => i.checked).length;
      execution.progress.completed = completedCount;
      execution.progress.percentage = (completedCount / execution.progress.total) * 100;

      // Si todos los críticos están completados y todos los items están completados
      const allCriticalChecked = execution.items
        .filter(i => i.critical)
        .every(i => i.checked);
      
      const allChecked = execution.items.every(i => i.checked);

      if (allChecked && allCriticalChecked) {
        execution.status = 'completed';
        execution.completedAt = new Date();
        execution.completedBy = userId;
        
        // Calcular tiempo real
        const startTime = new Date(execution.startedAt).getTime();
        const endTime = new Date().getTime();
        execution.actualTime = Math.round((endTime - startTime) / 60000); // Minutos
        
        this.stats.checklistsCompleted++;
        this.updateAvgCompletionTime(execution.actualTime);
      }

      execution.updatedAt = new Date();
      await execution.save();

      logger.info(`Item ${itemId} del checklist ${executionId} marcado como ${checked ? 'completado' : 'pendiente'}`);
      
      return execution;
      
    } catch (error) {
      logger.error('Error al marcar item:', error);
      throw error;
    }
  }

  /**
   * Obtener checklist en ejecución
   */
  async getChecklistExecution(executionId) {
    try {
      const execution = await ChecklistExecution.findById(executionId)
        .populate('startedBy', 'name email')
        .populate('completedBy', 'name email')
        .lean();
      
      if (!execution) {
        throw new Error('Checklist execution not found');
      }

      // Agregar definición del checklist
      const definition = this.getChecklistDefinition(execution.checklistType);
      execution.definition = definition;

      return execution;
      
    } catch (error) {
      logger.error('Error al obtener checklist:', error);
      throw error;
    }
  }

  /**
   * Listar checklists por transacción
   */
  async getChecklistsByTransaction(transactionId) {
    try {
      const executions = await ChecklistExecution.find({ transactionId })
        .sort({ createdAt: -1 })
        .populate('startedBy', 'name email')
        .populate('completedBy', 'name email')
        .lean();
      
      return executions;
      
    } catch (error) {
      logger.error('Error al listar checklists:', error);
      throw error;
    }
  }

  /**
   * Listar checklists por organización
   */
  async getChecklistsByOrganization(organizationId, filters = {}) {
    try {
      const query = { organizationId };
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.checklistType) {
        query.checklistType = filters.checklistType;
      }
      
      if (filters.branchId) {
        query.branchId = filters.branchId;
      }

      const executions = await ChecklistExecution.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100)
        .populate('startedBy', 'name email')
        .populate('completedBy', 'name email')
        .lean();
      
      return executions;
      
    } catch (error) {
      logger.error('Error al listar checklists por organización:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de checklists
   */
  async getStatistics(organizationId, dateRange = {}) {
    try {
      const query = { organizationId };
      
      if (dateRange.start && dateRange.end) {
        query.createdAt = {
          $gte: new Date(dateRange.start),
          $lte: new Date(dateRange.end)
        };
      }

      const stats = await ChecklistExecution.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              status: '$status',
              checklistType: '$checklistType'
            },
            count: { $sum: 1 },
            avgProgress: { $avg: '$progress.percentage' },
            avgCompletionTime: { $avg: '$actualTime' }
          }
        }
      ]);

      // Estadísticas de validaciones AI
      const aiStats = await ChecklistExecution.aggregate([
        { $match: query },
        { $unwind: '$items' },
        {
          $group: {
            _id: null,
            totalAIValidations: {
              $sum: { $cond: ['$items.aiValidation', 1, 0] }
            },
            aiValidationsPassed: {
              $sum: { $cond: ['$items.aiResult.passed', 1, 0] }
            },
            avgConfidence: { $avg: '$items.aiResult.confidence' }
          }
        }
      ]);

      return {
        byStatusAndType: stats,
        aiValidations: aiStats[0] || {
          totalAIValidations: 0,
          aiValidationsPassed: 0,
          avgConfidence: 0
        },
        inMemoryStats: this.stats
      };
      
    } catch (error) {
      logger.error('Error al obtener estadísticas:', error);
      throw error;
    }
  }

  /**
   * Actualizar tiempo promedio de completación
   */
  updateAvgCompletionTime(actualTime) {
    if (this.stats.avgCompletionTime === 0) {
      this.stats.avgCompletionTime = actualTime;
    } else {
      // Promedio móvil
      this.stats.avgCompletionTime = 
        (this.stats.avgCompletionTime * 0.9) + (actualTime * 0.1);
    }
  }

  /**
   * Obtener checklist más apropiado para una transacción
   */
  suggestChecklist(transaction) {
    const type = transaction.type.toLowerCase();
    
    if (type.includes('invoice') || type.includes('factura')) {
      return 'customerInvoice';
    } else if (type.includes('payment') || type.includes('pago')) {
      return 'vendorPayment';
    } else if (type.includes('expense') || type.includes('gasto') || type.includes('reembolso')) {
      return 'expenseReimbursement';
    } else if (type.includes('reconciliation') || type.includes('conciliacion')) {
      return 'bankReconciliation';
    } else if (type.includes('closing') || type.includes('cierre')) {
      return 'monthlyClosing';
    }
    
    return null;
  }
}

// Exportar clase y modelos
module.exports = ChecklistManager;
module.exports.ChecklistExecution = ChecklistExecution;
module.exports.CHECKLIST_DEFINITIONS = CHECKLIST_DEFINITIONS;
