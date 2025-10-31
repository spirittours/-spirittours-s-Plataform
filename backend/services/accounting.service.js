/**
 * Spirit Tours - Accounting Service
 * 
 * Comprehensive multi-branch accounting system with:
 * - Accounts Receivable (CXC) management with 6 states
 * - Accounts Payable (CXP) management with 7 states + authorization workflow
 * - Automatic refund calculation based on cancellation policies
 * - Payment duplicate detection
 * - Discrepancy detection (invoice vs contracted rate)
 * - Commission calculation (agents, guides, agencies)
 * - Multi-branch financial operations
 * - Complete audit trail
 * - Automatic alert generation
 * 
 * @module accounting.service
 */

const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AccountingService {
  constructor(pool) {
    if (!pool) {
      throw new Error('Database pool is required');
    }
    this.pool = pool;
  }

  // ========================================
  // ACCOUNTS RECEIVABLE (CXC) MANAGEMENT
  // ========================================

  /**
   * Create new Accounts Receivable (CXC)
   * Automatically validates against contracted rates and generates alerts
   * 
   * @param {Object} cxcData - CXC data
   * @param {UUID} cxcData.trip_id - Associated trip ID
   * @param {UUID} cxcData.customer_id - Customer ID
   * @param {UUID} cxcData.sucursal_id - Branch ID
   * @param {UUID} cxcData.proveedor_id - Provider ID (optional, for recovery)
   * @param {string} cxcData.tipo - Type: cliente, proveedor, transferencia_interna
   * @param {number} cxcData.monto_total - Total amount
   * @param {Date} cxcData.fecha_vencimiento - Due date
   * @param {UUID} cxcData.usuario_id - User creating the CXC
   * @returns {Object} Created CXC with folio
   */
  async createCXC(cxcData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const folio = await this._generateFolio(client, 'CXC');

      // Validate against contracted rates if trip_id provided
      if (cxcData.trip_id) {
        await this._validateAgainstContractedRates(client, cxcData.trip_id, cxcData.monto_total);
      }

      const insertQuery = `
        INSERT INTO cuentas_por_cobrar (
          folio, trip_id, customer_id, sucursal_id, proveedor_id, tipo,
          monto_total, monto_pagado, monto_pendiente, fecha_vencimiento, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0.00, $7, $8, 'pendiente')
        RETURNING *
      `;

      const values = [
        folio,
        cxcData.trip_id || null,
        cxcData.customer_id || null,
        cxcData.sucursal_id,
        cxcData.proveedor_id || null,
        cxcData.tipo || 'cliente',
        cxcData.monto_total,
        cxcData.fecha_vencimiento
      ];

      const result = await client.query(insertQuery, values);
      const cxc = result.rows[0];

      // Create accounting entries (double-entry bookkeeping)
      await this._createAccountingEntry(client, {
        sucursal_id: cxcData.sucursal_id,
        tipo: 'ingreso_pendiente',
        cuenta: 'CXC',
        debe: cxcData.monto_total,
        haber: 0,
        referencia_tipo: 'cuentas_por_cobrar',
        referencia_id: cxc.id,
        concepto: `CXC ${folio} - Cliente`
      });

      // Log audit
      await this._logAudit(client, {
        tabla_afectada: 'cuentas_por_cobrar',
        registro_id: cxc.id,
        accion: 'INSERT',
        usuario_id: cxcData.usuario_id,
        datos_nuevos: cxc
      });

      await client.query('COMMIT');

      logger.info(`CXC created successfully: ${folio}`, {
        cxc_id: cxc.id,
        monto: cxcData.monto_total,
        sucursal_id: cxcData.sucursal_id
      });

      return cxc;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating CXC:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get CXC with filters (status, branch, date range, overdue)
   * 
   * @param {Object} filters - Filter options
   * @param {UUID} filters.sucursal_id - Filter by branch
   * @param {string} filters.status - Filter by status
   * @param {boolean} filters.overdue_only - Show only overdue
   * @param {Date} filters.fecha_desde - Date from
   * @param {Date} filters.fecha_hasta - Date until
   * @param {number} filters.page - Page number (default: 1)
   * @param {number} filters.limit - Items per page (default: 50)
   * @returns {Object} { cxc: [], total: number, page: number, pages: number }
   */
  async getCXC(filters = {}) {
    const client = await this.pool.connect();
    try {
      const {
        sucursal_id,
        status,
        overdue_only = false,
        fecha_desde,
        fecha_hasta,
        page = 1,
        limit = 50
      } = filters;

      const offset = (page - 1) * limit;
      const whereClauses = [];
      const params = [];
      let paramIndex = 1;

      if (sucursal_id) {
        whereClauses.push(`cxc.sucursal_id = $${paramIndex++}`);
        params.push(sucursal_id);
      }

      if (status) {
        whereClauses.push(`cxc.status = $${paramIndex++}`);
        params.push(status);
      }

      if (overdue_only) {
        whereClauses.push(`cxc.status = 'vencido'`);
      }

      if (fecha_desde) {
        whereClauses.push(`cxc.created_at >= $${paramIndex++}`);
        params.push(fecha_desde);
      }

      if (fecha_hasta) {
        whereClauses.push(`cxc.created_at <= $${paramIndex++}`);
        params.push(fecha_hasta);
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM cuentas_por_cobrar cxc ${whereClause}`;
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated data
      const query = `
        SELECT 
          cxc.*,
          s.nombre as sucursal_nombre,
          c.nombre as customer_nombre,
          c.email as customer_email,
          t.tour_name,
          p.nombre as proveedor_nombre
        FROM cuentas_por_cobrar cxc
        LEFT JOIN sucursales s ON cxc.sucursal_id = s.id
        LEFT JOIN customers c ON cxc.customer_id = c.id
        LEFT JOIN trips t ON cxc.trip_id = t.trip_id
        LEFT JOIN proveedores p ON cxc.proveedor_id = p.id
        ${whereClause}
        ORDER BY cxc.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result = await client.query(query, params);

      return {
        cxc: result.rows,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error getting CXC:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Register payment received for a CXC
   * Automatically updates CXC status and creates accounting entries
   * Prevents duplicate payments
   * 
   * @param {UUID} cxc_id - CXC ID
   * @param {Object} paymentData - Payment data
   * @param {number} paymentData.monto - Payment amount
   * @param {string} paymentData.metodo_pago - Payment method
   * @param {string} paymentData.referencia - Payment reference
   * @param {number} paymentData.comision_bancaria - Bank commission (optional)
   * @param {UUID} paymentData.usuario_id - User registering payment
   * @returns {Object} Payment record and updated CXC
   */
  async registerPaymentReceived(cxc_id, paymentData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get CXC
      const cxcResult = await client.query(
        'SELECT * FROM cuentas_por_cobrar WHERE id = $1 FOR UPDATE',
        [cxc_id]
      );

      if (cxcResult.rows.length === 0) {
        throw new Error('CXC not found');
      }

      const cxc = cxcResult.rows[0];

      if (cxc.status === 'cobrado') {
        throw new Error('CXC already fully paid');
      }

      if (cxc.status === 'cancelada') {
        throw new Error('CXC is cancelled');
      }

      if (paymentData.monto > cxc.monto_pendiente) {
        throw new Error('Payment amount exceeds pending amount');
      }

      // Check for duplicate payment
      await this._checkDuplicatePayment(client, paymentData);

      const folio = await this._generateFolio(client, 'PAGO');

      const monto_recibido = paymentData.monto - (paymentData.comision_bancaria || 0);

      // Insert payment
      const insertQuery = `
        INSERT INTO pagos_recibidos (
          folio, cxc_id, monto, monto_recibido, comision_bancaria,
          metodo_pago, referencia, sucursal_id, fecha_pago
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `;

      const paymentResult = await client.query(insertQuery, [
        folio,
        cxc_id,
        paymentData.monto,
        monto_recibido,
        paymentData.comision_bancaria || 0,
        paymentData.metodo_pago,
        paymentData.referencia || null,
        cxc.sucursal_id
      ]);

      const payment = paymentResult.rows[0];

      // Update CXC
      const new_monto_pagado = parseFloat(cxc.monto_pagado) + paymentData.monto;
      const new_monto_pendiente = parseFloat(cxc.monto_pendiente) - paymentData.monto;
      let new_status = cxc.status;

      if (new_monto_pendiente <= 0.01) {
        new_status = 'cobrado';
      } else if (new_monto_pagado > 0 && new_status === 'pendiente') {
        new_status = 'parcial';
      }

      await client.query(
        `UPDATE cuentas_por_cobrar 
         SET monto_pagado = $1, monto_pendiente = $2, status = $3 
         WHERE id = $4`,
        [new_monto_pagado, new_monto_pendiente, new_status, cxc_id]
      );

      // Create accounting entries
      await this._createAccountingEntry(client, {
        sucursal_id: cxc.sucursal_id,
        tipo: 'ingreso',
        cuenta: paymentData.metodo_pago === 'efectivo' ? 'CAJA' : 'BANCO',
        debe: monto_recibido,
        haber: 0,
        referencia_tipo: 'pagos_recibidos',
        referencia_id: payment.id,
        concepto: `Pago recibido ${folio} - ${paymentData.metodo_pago}`
      });

      // If bank commission, record it
      if (paymentData.comision_bancaria > 0) {
        await this._createAccountingEntry(client, {
          sucursal_id: cxc.sucursal_id,
          tipo: 'gasto',
          cuenta: 'GASTOS_BANCARIOS',
          debe: 0,
          haber: paymentData.comision_bancaria,
          referencia_tipo: 'pagos_recibidos',
          referencia_id: payment.id,
          concepto: `Comisión bancaria ${folio}`
        });
      }

      // Credit the CXC account
      await this._createAccountingEntry(client, {
        sucursal_id: cxc.sucursal_id,
        tipo: 'ingreso',
        cuenta: 'CXC',
        debe: 0,
        haber: paymentData.monto,
        referencia_tipo: 'pagos_recibidos',
        referencia_id: payment.id,
        concepto: `Abono a CXC ${cxc.folio}`
      });

      // Log audit
      await this._logAudit(client, {
        tabla_afectada: 'pagos_recibidos',
        registro_id: payment.id,
        accion: 'INSERT',
        usuario_id: paymentData.usuario_id,
        datos_nuevos: payment
      });

      await client.query('COMMIT');

      logger.info(`Payment registered successfully: ${folio}`, {
        payment_id: payment.id,
        cxc_id,
        monto: paymentData.monto,
        new_status
      });

      return {
        payment,
        cxc: { ...cxc, status: new_status, monto_pagado: new_monto_pagado, monto_pendiente: new_monto_pendiente }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error registering payment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ========================================
  // ACCOUNTS PAYABLE (CXP) MANAGEMENT
  // ========================================

  /**
   * Create new Accounts Payable (CXP)
   * 
   * @param {Object} cxpData - CXP data
   * @param {UUID} cxpData.proveedor_id - Provider ID
   * @param {UUID} cxpData.sucursal_id - Branch ID
   * @param {UUID} cxpData.sucursal_destino - Destination branch (for inter-branch transfers)
   * @param {string} cxpData.tipo - Type: proveedor, transferencia_interna, gasto
   * @param {number} cxpData.monto_total - Total amount
   * @param {Date} cxpData.fecha_vencimiento - Due date
   * @param {string} cxpData.concepto - Concept/description
   * @param {boolean} cxpData.requiere_autorizacion - Requires authorization
   * @param {UUID} cxpData.usuario_id - User creating the CXP
   * @returns {Object} Created CXP with folio
   */
  async createCXP(cxpData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const folio = await this._generateFolio(client, 'CXP');

      // Check authorization requirements based on amount
      const requiere_autorizacion = await this._checkAuthorizationRequired(
        client,
        cxpData.sucursal_id,
        cxpData.monto_total
      );

      const insertQuery = `
        INSERT INTO cuentas_por_pagar (
          folio, proveedor_id, sucursal_id, sucursal_destino, tipo,
          monto_total, monto_pendiente, fecha_vencimiento, concepto,
          requiere_autorizacion, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const status = requiere_autorizacion ? 'pendiente_revision' : 'pendiente';

      const values = [
        folio,
        cxpData.proveedor_id || null,
        cxpData.sucursal_id,
        cxpData.sucursal_destino || null,
        cxpData.tipo || 'proveedor',
        cxpData.monto_total,
        cxpData.fecha_vencimiento,
        cxpData.concepto,
        requiere_autorizacion,
        status
      ];

      const result = await client.query(insertQuery, values);
      const cxp = result.rows[0];

      // Create accounting entry
      await this._createAccountingEntry(client, {
        sucursal_id: cxpData.sucursal_id,
        tipo: 'egreso_pendiente',
        cuenta: 'CXP',
        debe: 0,
        haber: cxpData.monto_total,
        referencia_tipo: 'cuentas_por_pagar',
        referencia_id: cxp.id,
        concepto: `CXP ${folio} - ${cxpData.concepto}`
      });

      // Generate alert if authorization required
      if (requiere_autorizacion) {
        await this._createAlert(client, {
          tipo: 'cxp_requiere_autorizacion',
          gravedad: 'media',
          titulo: 'CXP Requiere Autorización',
          mensaje: `La cuenta por pagar ${folio} por $${cxpData.monto_total.toFixed(2)} requiere autorización`,
          referencia_id: cxp.id,
          destinatario_role: 'gerente'
        });
      }

      // Log audit
      await this._logAudit(client, {
        tabla_afectada: 'cuentas_por_pagar',
        registro_id: cxp.id,
        accion: 'INSERT',
        usuario_id: cxpData.usuario_id,
        datos_nuevos: cxp
      });

      await client.query('COMMIT');

      logger.info(`CXP created successfully: ${folio}`, {
        cxp_id: cxp.id,
        monto: cxpData.monto_total,
        requiere_autorizacion
      });

      return cxp;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating CXP:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Authorize CXP for payment
   * Validates user authorization level against amount
   * 
   * @param {UUID} cxp_id - CXP ID
   * @param {UUID} usuario_id - User authorizing
   * @param {string} comentario - Authorization comment
   * @returns {Object} Updated CXP
   */
  async authorizeCXP(cxp_id, usuario_id, comentario = '') {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get CXP
      const cxpResult = await client.query(
        'SELECT cxp.*, s.limite_autorizacion_gerente, s.limite_autorizacion_director FROM cuentas_por_pagar cxp JOIN sucursales s ON cxp.sucursal_id = s.id WHERE cxp.id = $1 FOR UPDATE',
        [cxp_id]
      );

      if (cxpResult.rows.length === 0) {
        throw new Error('CXP not found');
      }

      const cxp = cxpResult.rows[0];

      if (cxp.status !== 'pendiente_revision') {
        throw new Error(`CXP cannot be authorized in status: ${cxp.status}`);
      }

      // Get user role
      const userResult = await client.query(
        'SELECT role FROM users WHERE id = $1',
        [usuario_id]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const userRole = userResult.rows[0].role;

      // Validate authorization level
      const monto = parseFloat(cxp.monto_total);
      const limite_gerente = parseFloat(cxp.limite_autorizacion_gerente);
      const limite_director = parseFloat(cxp.limite_autorizacion_director);

      if (userRole === 'gerente' && monto > limite_gerente) {
        throw new Error(`Amount exceeds manager authorization limit ($${limite_gerente.toFixed(2)}). Requires director approval.`);
      }

      if (userRole !== 'director' && monto > limite_director) {
        throw new Error(`Amount exceeds director authorization limit ($${limite_director.toFixed(2)}). Requires special approval.`);
      }

      // Update CXP
      await client.query(
        `UPDATE cuentas_por_pagar 
         SET status = 'autorizado', autorizado_por = $1, fecha_autorizacion = NOW() 
         WHERE id = $2`,
        [usuario_id, cxp_id]
      );

      // Log audit
      await this._logAudit(client, {
        tabla_afectada: 'cuentas_por_pagar',
        registro_id: cxp_id,
        accion: 'UPDATE',
        usuario_id,
        datos_anteriores: { status: cxp.status },
        datos_nuevos: { status: 'autorizado', autorizado_por: usuario_id },
        comentario
      });

      await client.query('COMMIT');

      logger.info(`CXP authorized successfully: ${cxp.folio}`, {
        cxp_id,
        usuario_id,
        monto: cxp.monto_total
      });

      return { ...cxp, status: 'autorizado', autorizado_por: usuario_id };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error authorizing CXP:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute payment for authorized CXP
   * Creates accounting entries and updates CXP status
   * 
   * @param {UUID} cxp_id - CXP ID
   * @param {Object} paymentData - Payment data
   * @param {number} paymentData.monto - Payment amount
   * @param {string} paymentData.metodo_pago - Payment method
   * @param {string} paymentData.referencia - Payment reference
   * @param {UUID} paymentData.usuario_id - User executing payment
   * @returns {Object} Payment record and updated CXP
   */
  async executePayment(cxp_id, paymentData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get CXP
      const cxpResult = await client.query(
        'SELECT * FROM cuentas_por_pagar WHERE id = $1 FOR UPDATE',
        [cxp_id]
      );

      if (cxpResult.rows.length === 0) {
        throw new Error('CXP not found');
      }

      const cxp = cxpResult.rows[0];

      if (cxp.status !== 'autorizado' && cxp.status !== 'pendiente') {
        throw new Error(`CXP cannot be paid in status: ${cxp.status}`);
      }

      if (cxp.requiere_autorizacion && cxp.status !== 'autorizado') {
        throw new Error('CXP requires authorization before payment');
      }

      if (paymentData.monto > parseFloat(cxp.monto_pendiente)) {
        throw new Error('Payment amount exceeds pending amount');
      }

      const folio = await this._generateFolio(client, 'PAGO_PROV');

      // Insert payment
      const insertQuery = `
        INSERT INTO pagos_realizados (
          folio, cxp_id, monto, metodo_pago, referencia, sucursal_id, fecha_pago
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `;

      const paymentResult = await client.query(insertQuery, [
        folio,
        cxp_id,
        paymentData.monto,
        paymentData.metodo_pago,
        paymentData.referencia || null,
        cxp.sucursal_id
      ]);

      const payment = paymentResult.rows[0];

      // Update CXP
      const new_monto_pendiente = parseFloat(cxp.monto_pendiente) - paymentData.monto;
      const new_status = new_monto_pendiente <= 0.01 ? 'pagado' : cxp.status;

      await client.query(
        `UPDATE cuentas_por_pagar 
         SET monto_pendiente = $1, status = $2 
         WHERE id = $3`,
        [new_monto_pendiente, new_status, cxp_id]
      );

      // Create accounting entries
      await this._createAccountingEntry(client, {
        sucursal_id: cxp.sucursal_id,
        tipo: 'egreso',
        cuenta: paymentData.metodo_pago === 'efectivo' ? 'CAJA' : 'BANCO',
        debe: 0,
        haber: paymentData.monto,
        referencia_tipo: 'pagos_realizados',
        referencia_id: payment.id,
        concepto: `Pago a proveedor ${folio} - ${paymentData.metodo_pago}`
      });

      await this._createAccountingEntry(client, {
        sucursal_id: cxp.sucursal_id,
        tipo: 'egreso',
        cuenta: 'CXP',
        debe: paymentData.monto,
        haber: 0,
        referencia_tipo: 'pagos_realizados',
        referencia_id: payment.id,
        concepto: `Pago a CXP ${cxp.folio}`
      });

      // Log audit
      await this._logAudit(client, {
        tabla_afectada: 'pagos_realizados',
        registro_id: payment.id,
        accion: 'INSERT',
        usuario_id: paymentData.usuario_id,
        datos_nuevos: payment
      });

      await client.query('COMMIT');

      logger.info(`Payment executed successfully: ${folio}`, {
        payment_id: payment.id,
        cxp_id,
        monto: paymentData.monto,
        new_status
      });

      return {
        payment,
        cxp: { ...cxp, status: new_status, monto_pendiente: new_monto_pendiente }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error executing payment:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ========================================
  // REFUNDS MANAGEMENT
  // ========================================

  /**
   * Calculate refund amount based on cancellation policy
   * 
   * Policy:
   * - 30+ days: 100% refund
   * - 14-29 days: 90% refund
   * - 7-13 days: 75% refund
   * - 2-6 days: 50% refund
   * - 0-1 days: 0% refund
   * 
   * @param {number} days_until_departure - Days until tour departure
   * @param {number} paid_amount - Amount paid by customer
   * @returns {Object} { monto_reembolso, monto_retenido, porcentaje_reembolsado, politica_aplicada }
   */
  calculateRefundAmount(days_until_departure, paid_amount) {
    let porcentaje_reembolsado = 0;
    let politica_aplicada = '';

    if (days_until_departure >= 30) {
      porcentaje_reembolsado = 100;
      politica_aplicada = '30+ días: 100% reembolso';
    } else if (days_until_departure >= 14) {
      porcentaje_reembolsado = 90;
      politica_aplicada = '14-29 días: 90% reembolso';
    } else if (days_until_departure >= 7) {
      porcentaje_reembolsado = 75;
      politica_aplicada = '7-13 días: 75% reembolso';
    } else if (days_until_departure >= 2) {
      porcentaje_reembolsado = 50;
      politica_aplicada = '2-6 días: 50% reembolso';
    } else {
      porcentaje_reembolsado = 0;
      politica_aplicada = '0-1 días: sin reembolso';
    }

    const monto_reembolso = (paid_amount * porcentaje_reembolsado) / 100;
    const monto_retenido = paid_amount - monto_reembolso;

    return {
      monto_reembolso: parseFloat(monto_reembolso.toFixed(2)),
      monto_retenido: parseFloat(monto_retenido.toFixed(2)),
      porcentaje_reembolsado,
      politica_aplicada
    };
  }

  /**
   * Create refund payable for cancelled trip
   * Automatically calculates refund amount based on cancellation policy
   * 
   * @param {Object} refundData - Refund data
   * @param {UUID} refundData.trip_id - Trip ID
   * @param {number} refundData.monto_pagado - Amount paid by customer
   * @param {Date} refundData.fecha_viaje - Trip departure date
   * @param {string} refundData.motivo - Cancellation reason
   * @param {UUID} refundData.usuario_id - User creating refund
   * @returns {Object} Created refund
   */
  async createRefund(refundData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Calculate days until departure
      const now = new Date();
      const departure = new Date(refundData.fecha_viaje);
      const days_until = Math.ceil((departure - now) / (1000 * 60 * 60 * 24));

      // Calculate refund
      const refundCalculation = this.calculateRefundAmount(days_until, refundData.monto_pagado);

      const folio = await this._generateFolio(client, 'REMB');

      // Check if high priority (large amount or short notice)
      const prioridad = refundData.monto_pagado >= 10000 || days_until <= 3 ? 'alta' : 'normal';

      const insertQuery = `
        INSERT INTO reembolsos_por_pagar (
          folio, trip_id, customer_id, sucursal_id,
          monto_pagado, monto_reembolso, monto_retenido, porcentaje_reembolsado,
          dias_anticipacion, motivo_cancelacion, politica_aplicada, prioridad, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pendiente_autorizacion')
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        folio,
        refundData.trip_id,
        refundData.customer_id,
        refundData.sucursal_id,
        refundData.monto_pagado,
        refundCalculation.monto_reembolso,
        refundCalculation.monto_retenido,
        refundCalculation.porcentaje_reembolsado,
        days_until,
        refundData.motivo || 'Cancelación de viaje',
        refundCalculation.politica_aplicada,
        prioridad
      ]);

      const refund = result.rows[0];

      // Create alert
      await this._createAlert(client, {
        tipo: 'reembolso_pendiente',
        gravedad: prioridad === 'alta' ? 'alta' : 'media',
        titulo: 'Reembolso Pendiente de Autorización',
        mensaje: `Reembolso ${folio} por $${refundCalculation.monto_reembolso.toFixed(2)} requiere autorización`,
        referencia_id: refund.id,
        destinatario_role: 'gerente'
      });

      // Log audit
      await this._logAudit(client, {
        tabla_afectada: 'reembolsos_por_pagar',
        registro_id: refund.id,
        accion: 'INSERT',
        usuario_id: refundData.usuario_id,
        datos_nuevos: refund
      });

      await client.query('COMMIT');

      logger.info(`Refund created successfully: ${folio}`, {
        refund_id: refund.id,
        monto_reembolso: refundCalculation.monto_reembolso,
        porcentaje: refundCalculation.porcentaje_reembolsado
      });

      return refund;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating refund:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ========================================
  // COMMISSIONS MANAGEMENT
  // ========================================

  /**
   * Calculate and create commissions for a tour
   * 
   * @param {Object} commissionData - Commission data
   * @param {UUID} commissionData.trip_id - Trip ID
   * @param {UUID} commissionData.sucursal_venta - Sales branch
   * @param {UUID} commissionData.sucursal_operacion - Operations branch
   * @param {number} commissionData.monto_venta - Sale amount
   * @param {UUID} commissionData.vendedor_id - Salesperson ID
   * @param {UUID} commissionData.guia_id - Guide ID (optional)
   * @param {UUID} commissionData.agencia_id - Agency ID (optional)
   * @returns {Array} Created commission records
   */
  async createCommissions(commissionData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const commissions = [];

      // Salesperson commission: 5% of sale
      if (commissionData.vendedor_id) {
        const comision_vendedor = (commissionData.monto_venta * 0.05);
        const folio = await this._generateFolio(client, 'COM_VEND');

        const result = await client.query(
          `INSERT INTO comisiones_por_pagar (
            folio, trip_id, tipo_comision, beneficiario_id, sucursal_id,
            monto_base, porcentaje, monto_comision, status
          ) VALUES ($1, $2, 'vendedor', $3, $4, $5, 5.00, $6, 'pendiente')
          RETURNING *`,
          [folio, commissionData.trip_id, commissionData.vendedor_id, 
           commissionData.sucursal_venta, commissionData.monto_venta, comision_vendedor]
        );

        commissions.push(result.rows[0]);
      }

      // Guide commission: 3% of sale
      if (commissionData.guia_id) {
        const comision_guia = (commissionData.monto_venta * 0.03);
        const folio = await this._generateFolio(client, 'COM_GUIA');

        const result = await client.query(
          `INSERT INTO comisiones_por_pagar (
            folio, trip_id, tipo_comision, beneficiario_id, sucursal_id,
            monto_base, porcentaje, monto_comision, status
          ) VALUES ($1, $2, 'guia', $3, $4, $5, 3.00, $6, 'pendiente')
          RETURNING *`,
          [folio, commissionData.trip_id, commissionData.guia_id,
           commissionData.sucursal_operacion, commissionData.monto_venta, comision_guia]
        );

        commissions.push(result.rows[0]);
      }

      // Multi-branch commission split
      if (commissionData.sucursal_venta !== commissionData.sucursal_operacion) {
        // Sales office: 12-15%
        const comision_venta = (commissionData.monto_venta * 0.12);
        const folio_venta = await this._generateFolio(client, 'COM_SUC');

        const result_venta = await client.query(
          `INSERT INTO comisiones_por_pagar (
            folio, trip_id, tipo_comision, sucursal_id, sucursal_destino,
            monto_base, porcentaje, monto_comision, status
          ) VALUES ($1, $2, 'sucursal_venta', $3, $4, $5, 12.00, $6, 'pendiente')
          RETURNING *`,
          [folio_venta, commissionData.trip_id, commissionData.sucursal_venta,
           commissionData.sucursal_operacion, commissionData.monto_venta, comision_venta]
        );

        commissions.push(result_venta.rows[0]);
      }

      await client.query('COMMIT');

      logger.info('Commissions created successfully', {
        trip_id: commissionData.trip_id,
        count: commissions.length
      });

      return commissions;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating commissions:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ========================================
  // DASHBOARD & REPORTS
  // ========================================

  /**
   * Get manager dashboard data for a branch
   * 
   * @param {UUID} sucursal_id - Branch ID
   * @returns {Object} Dashboard data with CXC, CXP, refunds, commissions summary
   */
  async getManagerDashboard(sucursal_id) {
    const client = await this.pool.connect();
    try {
      // CXC Summary
      const cxcSummary = await client.query(`
        SELECT 
          COUNT(*) as total_cxc,
          COALESCE(SUM(monto_total), 0) as total_monto,
          COALESCE(SUM(monto_pendiente), 0) as total_pendiente,
          COALESCE(SUM(CASE WHEN status = 'vencido' THEN monto_pendiente ELSE 0 END), 0) as total_vencido
        FROM cuentas_por_cobrar
        WHERE sucursal_id = $1 AND status NOT IN ('cobrado', 'cancelada')
      `, [sucursal_id]);

      // CXP Summary
      const cxpSummary = await client.query(`
        SELECT 
          COUNT(*) as total_cxp,
          COALESCE(SUM(monto_total), 0) as total_monto,
          COALESCE(SUM(monto_pendiente), 0) as total_pendiente,
          COUNT(CASE WHEN status = 'pendiente_revision' THEN 1 END) as pendientes_autorizacion
        FROM cuentas_por_pagar
        WHERE sucursal_id = $1 AND status NOT IN ('pagado', 'cancelada')
      `, [sucursal_id]);

      // Refunds Summary
      const refundsSummary = await client.query(`
        SELECT 
          COUNT(*) as total_reembolsos,
          COALESCE(SUM(monto_reembolso), 0) as total_monto,
          COUNT(CASE WHEN status = 'pendiente_autorizacion' THEN 1 END) as pendientes_autorizacion
        FROM reembolsos_por_pagar
        WHERE sucursal_id = $1 AND status NOT IN ('reembolsado', 'cancelado')
      `, [sucursal_id]);

      // Active Alerts
      const alerts = await client.query(`
        SELECT *
        FROM alertas_sistema
        WHERE sucursal_id = $1 AND resuelta = false
        ORDER BY gravedad DESC, created_at DESC
        LIMIT 10
      `, [sucursal_id]);

      // Recent Transactions
      const recentTransactions = await client.query(`
        (SELECT 'pago_recibido' as tipo, folio, monto, fecha_pago as fecha FROM pagos_recibidos WHERE sucursal_id = $1)
        UNION ALL
        (SELECT 'pago_realizado' as tipo, folio, monto, fecha_pago as fecha FROM pagos_realizados WHERE sucursal_id = $1)
        ORDER BY fecha DESC
        LIMIT 10
      `, [sucursal_id]);

      return {
        cxc: cxcSummary.rows[0],
        cxp: cxpSummary.rows[0],
        refunds: refundsSummary.rows[0],
        alerts: alerts.rows,
        recent_transactions: recentTransactions.rows
      };
    } catch (error) {
      logger.error('Error getting manager dashboard:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Generate unique folio for accounting document
   * 
   * @param {Object} client - Database client
   * @param {string} prefix - Folio prefix (CXC, CXP, PAGO, etc.)
   * @returns {string} Generated folio
   */
  async _generateFolio(client, prefix) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Get last folio number for this prefix and month
    const result = await client.query(
      `SELECT folio FROM (
        SELECT folio FROM cuentas_por_cobrar WHERE folio LIKE $1
        UNION ALL
        SELECT folio FROM cuentas_por_pagar WHERE folio LIKE $1
        UNION ALL
        SELECT folio FROM pagos_recibidos WHERE folio LIKE $1
        UNION ALL
        SELECT folio FROM pagos_realizados WHERE folio LIKE $1
        UNION ALL
        SELECT folio FROM reembolsos_por_pagar WHERE folio LIKE $1
      ) AS all_folios
      ORDER BY folio DESC
      LIMIT 1`,
      [`${prefix}-${year}${month}%`]
    );

    let number = 1;
    if (result.rows.length > 0) {
      const lastFolio = result.rows[0].folio;
      const lastNumber = parseInt(lastFolio.split('-').pop());
      number = lastNumber + 1;
    }

    return `${prefix}-${year}${month}-${String(number).padStart(6, '0')}`;
  }

  /**
   * Validate invoice amount against contracted rates
   * Generates alert if discrepancy > $100
   * 
   * @param {Object} client - Database client
   * @param {UUID} trip_id - Trip ID
   * @param {number} invoice_amount - Invoice amount
   */
  async _validateAgainstContractedRates(client, trip_id, invoice_amount) {
    const result = await client.query(`
      SELECT tc.precio_contratado * t.number_of_guests as monto_esperado
      FROM trips t
      JOIN tarifas_contratadas tc ON t.tour_name = tc.servicio
      WHERE t.trip_id = $1
    `, [trip_id]);

    if (result.rows.length === 0) return; // No contracted rate found

    const monto_esperado = parseFloat(result.rows[0].monto_esperado);
    const diferencia = Math.abs(invoice_amount - monto_esperado);

    if (diferencia > 100) {
      await this._createAlert(client, {
        tipo: 'discrepancia_factura',
        gravedad: 'alta',
        titulo: 'Discrepancia en Factura',
        mensaje: `La factura de $${invoice_amount.toFixed(2)} difiere del monto esperado $${monto_esperado.toFixed(2)} por $${diferencia.toFixed(2)}`,
        referencia_id: trip_id,
        destinatario_role: 'gerente'
      });
    }
  }

  /**
   * Check if authorization is required based on amount and branch limits
   * 
   * @param {Object} client - Database client
   * @param {UUID} sucursal_id - Branch ID
   * @param {number} monto - Amount
   * @returns {boolean} True if authorization required
   */
  async _checkAuthorizationRequired(client, sucursal_id, monto) {
    const result = await client.query(
      'SELECT limite_autorizacion_gerente FROM sucursales WHERE id = $1',
      [sucursal_id]
    );

    if (result.rows.length === 0) return true;

    const limite = parseFloat(result.rows[0].limite_autorizacion_gerente);
    return monto >= limite;
  }

  /**
   * Check for duplicate payment within last 24 hours
   * 
   * @param {Object} client - Database client
   * @param {Object} paymentData - Payment data
   */
  async _checkDuplicatePayment(client, paymentData) {
    if (!paymentData.referencia) return; // No reference, can't check

    const result = await client.query(`
      SELECT COUNT(*) FROM pagos_recibidos
      WHERE metodo_pago = $1 
        AND referencia = $2 
        AND monto = $3 
        AND fecha_pago > NOW() - INTERVAL '24 hours'
        AND status = 'aplicado'
    `, [paymentData.metodo_pago, paymentData.referencia, paymentData.monto]);

    const count = parseInt(result.rows[0].count);
    if (count > 0) {
      throw new Error('Duplicate payment detected. This payment may have already been registered.');
    }
  }

  /**
   * Create accounting entry (double-entry bookkeeping)
   * 
   * @param {Object} client - Database client
   * @param {Object} entryData - Entry data
   */
  async _createAccountingEntry(client, entryData) {
    const folio = await this._generateFolio(client, 'CONT');

    await client.query(`
      INSERT INTO movimientos_contables (
        folio, sucursal_id, tipo, cuenta, debe, haber,
        referencia_tipo, referencia_id, concepto, fecha
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      folio,
      entryData.sucursal_id,
      entryData.tipo,
      entryData.cuenta,
      entryData.debe,
      entryData.haber,
      entryData.referencia_tipo || null,
      entryData.referencia_id || null,
      entryData.concepto
    ]);
  }

  /**
   * Create system alert
   * 
   * @param {Object} client - Database client
   * @param {Object} alertData - Alert data
   */
  async _createAlert(client, alertData) {
    await client.query(`
      INSERT INTO alertas_sistema (
        tipo, gravedad, titulo, mensaje, referencia_id, 
        sucursal_id, destinatario_role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      alertData.tipo,
      alertData.gravedad,
      alertData.titulo,
      alertData.mensaje,
      alertData.referencia_id || null,
      alertData.sucursal_id || null,
      alertData.destinatario_role || null
    ]);
  }

  /**
   * Log audit entry
   * 
   * @param {Object} client - Database client
   * @param {Object} auditData - Audit data
   */
  async _logAudit(client, auditData) {
    await client.query(`
      INSERT INTO auditoria_financiera (
        tabla_afectada, registro_id, accion, usuario_id,
        datos_anteriores, datos_nuevos, comentario
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      auditData.tabla_afectada,
      auditData.registro_id,
      auditData.accion,
      auditData.usuario_id || null,
      auditData.datos_anteriores ? JSON.stringify(auditData.datos_anteriores) : null,
      auditData.datos_nuevos ? JSON.stringify(auditData.datos_nuevos) : null,
      auditData.comentario || null
    ]);
  }
}

module.exports = AccountingService;
