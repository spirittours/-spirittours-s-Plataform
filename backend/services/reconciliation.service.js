/**
 * Spirit Tours - Bank Reconciliation Service
 * 
 * Automated daily bank reconciliation system with:
 * - Automatic comparison of system vs bank transactions
 * - Detection of discrepancies (missing transactions, amount differences)
 * - Automatic alert generation for unreconciled items
 * - Historical reconciliation tracking
 * - Multi-branch support
 * - Cash register reconciliation
 * 
 * @module reconciliation.service
 */

const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ReconciliationService {
  constructor(pool) {
    if (!pool) {
      throw new Error('Database pool is required');
    }
    this.pool = pool;
  }

  // ========================================
  // BANK RECONCILIATION
  // ========================================

  /**
   * Perform daily bank reconciliation for a branch
   * Compares system transactions vs bank statement
   * 
   * @param {UUID} sucursal_id - Branch ID
   * @param {Date} fecha - Reconciliation date
   * @param {Object} bankData - Bank statement data
   * @param {Array} bankData.ingresos - Bank income transactions
   * @param {Array} bankData.egresos - Bank expense transactions
   * @param {UUID} usuario_id - User performing reconciliation
   * @returns {Object} Reconciliation result with discrepancies
   */
  async performBankReconciliation(sucursal_id, fecha, bankData, usuario_id) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if reconciliation already exists for this date
      const existingResult = await client.query(
        'SELECT * FROM conciliaciones_bancarias WHERE sucursal_id = $1 AND fecha = $2',
        [sucursal_id, fecha]
      );

      if (existingResult.rows.length > 0) {
        throw new Error('Reconciliation already exists for this date. Please delete it first if you want to re-reconcile.');
      }

      // Get system transactions for the date
      const systemTransactions = await this._getSystemTransactions(client, sucursal_id, fecha);

      // Calculate system totals
      const total_ingresos_sistema = systemTransactions.ingresos.reduce((sum, t) => sum + parseFloat(t.monto), 0);
      const total_egresos_sistema = systemTransactions.egresos.reduce((sum, t) => sum + parseFloat(t.monto), 0);

      // Calculate bank totals
      const total_ingresos_banco = bankData.ingresos.reduce((sum, t) => sum + parseFloat(t.monto), 0);
      const total_egresos_banco = bankData.egresos.reduce((sum, t) => sum + parseFloat(t.monto), 0);

      // Calculate differences
      const diferencia_ingresos = total_ingresos_sistema - total_ingresos_banco;
      const diferencia_egresos = total_egresos_sistema - total_egresos_banco;

      // Identify unmatched transactions
      const unmatchedIngresos = this._findUnmatchedTransactions(
        systemTransactions.ingresos,
        bankData.ingresos
      );

      const unmatchedEgresos = this._findUnmatchedTransactions(
        systemTransactions.egresos,
        bankData.egresos
      );

      // Create reconciliation record
      const insertQuery = `
        INSERT INTO conciliaciones_bancarias (
          sucursal_id, fecha,
          total_ingresos_sistema, total_ingresos_banco,
          total_egresos_sistema, total_egresos_banco,
          total_transacciones_sistema, total_transacciones_banco,
          transacciones_sin_conciliar, notas, realizado_por, conciliado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const tiene_diferencias = Math.abs(diferencia_ingresos) > 0.01 || Math.abs(diferencia_egresos) > 0.01;

      const values = [
        sucursal_id,
        fecha,
        total_ingresos_sistema,
        total_ingresos_banco,
        total_egresos_sistema,
        total_egresos_banco,
        systemTransactions.ingresos.length + systemTransactions.egresos.length,
        bankData.ingresos.length + bankData.egresos.length,
        unmatchedIngresos.length + unmatchedEgresos.length,
        this._generateReconciliationNotes(unmatchedIngresos, unmatchedEgresos, diferencia_ingresos, diferencia_egresos),
        usuario_id,
        !tiene_diferencias
      ];

      const result = await client.query(insertQuery, values);
      const reconciliation = result.rows[0];

      // Mark matched transactions as reconciled
      await this._markTransactionsReconciled(client, systemTransactions.ingresos, bankData.ingresos);
      await this._markTransactionsReconciled(client, systemTransactions.egresos, bankData.egresos);

      // Generate alerts if discrepancies found
      if (tiene_diferencias) {
        await this._createReconciliationAlert(client, {
          sucursal_id,
          reconciliation_id: reconciliation.id,
          fecha,
          diferencia_ingresos,
          diferencia_egresos,
          unmatched_count: unmatchedIngresos.length + unmatchedEgresos.length
        });
      }

      // Log audit
      await this._logAudit(client, {
        tabla_afectada: 'conciliaciones_bancarias',
        registro_id: reconciliation.id,
        accion: 'INSERT',
        usuario_id,
        datos_nuevos: reconciliation
      });

      await client.query('COMMIT');

      logger.info(`Bank reconciliation completed for ${fecha}`, {
        sucursal_id,
        tiene_diferencias,
        diferencia_ingresos,
        diferencia_egresos
      });

      return {
        reconciliation,
        discrepancies: {
          ingresos: {
            sistema: total_ingresos_sistema,
            banco: total_ingresos_banco,
            diferencia: diferencia_ingresos,
            unmatched: unmatchedIngresos
          },
          egresos: {
            sistema: total_egresos_sistema,
            banco: total_egresos_banco,
            diferencia: diferencia_egresos,
            unmatched: unmatchedEgresos
          }
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error performing bank reconciliation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get reconciliation history for a branch
   * 
   * @param {UUID} sucursal_id - Branch ID
   * @param {Date} fecha_desde - Start date
   * @param {Date} fecha_hasta - End date
   * @returns {Array} Reconciliation records
   */
  async getReconciliationHistory(sucursal_id, fecha_desde, fecha_hasta) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT 
          cb.*,
          u.nombre as realizado_por_nombre
        FROM conciliaciones_bancarias cb
        LEFT JOIN users u ON cb.realizado_por = u.id
        WHERE cb.sucursal_id = $1 
          AND cb.fecha >= $2 
          AND cb.fecha <= $3
        ORDER BY cb.fecha DESC
      `;

      const result = await client.query(query, [sucursal_id, fecha_desde, fecha_hasta]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting reconciliation history:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pending reconciliation items (unreconciled transactions)
   * 
   * @param {UUID} sucursal_id - Branch ID
   * @param {Date} fecha - Date
   * @returns {Object} { ingresos: [], egresos: [] }
   */
  async getPendingReconciliation(sucursal_id, fecha) {
    const client = await this.pool.connect();
    try {
      const ingresos = await client.query(`
        SELECT *
        FROM pagos_recibidos
        WHERE sucursal_id = $1 
          AND DATE(fecha_pago) = $2
          AND conciliado = false
        ORDER BY fecha_pago
      `, [sucursal_id, fecha]);

      const egresos = await client.query(`
        SELECT *
        FROM pagos_realizados
        WHERE sucursal_id = $1 
          AND DATE(fecha_pago) = $2
          AND conciliado = false
        ORDER BY fecha_pago
      `, [sucursal_id, fecha]);

      return {
        ingresos: ingresos.rows,
        egresos: egresos.rows
      };
    } catch (error) {
      logger.error('Error getting pending reconciliation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ========================================
  // CASH REGISTER RECONCILIATION
  // ========================================

  /**
   * Create cash register closure (corte de caja)
   * 
   * @param {UUID} sucursal_id - Branch ID
   * @param {UUID} caja_id - Cash register ID (optional, defaults to main)
   * @param {Object} closureData - Closure data
   * @param {number} closureData.monto_sistema - System calculated amount
   * @param {number} closureData.monto_fisico - Physical cash counted
   * @param {Object} closureData.denominaciones - Cash denominations count
   * @param {UUID} closureData.usuario_id - User performing closure
   * @returns {Object} Cash closure record
   */
  async createCashClosure(sucursal_id, caja_id, closureData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Calculate cash movements for the day
      const fecha = new Date().toISOString().split('T')[0];
      
      const movimientosResult = await client.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN monto ELSE 0 END), 0) as total_ingresos,
          COALESCE(SUM(CASE WHEN tipo_movimiento = 'egreso' THEN monto ELSE 0 END), 0) as total_egresos,
          COUNT(*) as total_movimientos
        FROM movimientos_caja
        WHERE sucursal_id = $1 
          AND caja_id = $2
          AND DATE(fecha) = $3
      `, [sucursal_id, caja_id || 'MAIN', fecha]);

      const movimientos = movimientosResult.rows[0];

      // Get opening balance
      const lastClosureResult = await client.query(`
        SELECT monto_cierre
        FROM cortes_caja
        WHERE sucursal_id = $1 AND caja_id = $2
        ORDER BY fecha_cierre DESC
        LIMIT 1
      `, [sucursal_id, caja_id || 'MAIN']);

      const monto_apertura = lastClosureResult.rows.length > 0 
        ? parseFloat(lastClosureResult.rows[0].monto_cierre)
        : 0;

      const monto_sistema = monto_apertura + parseFloat(movimientos.total_ingresos) - parseFloat(movimientos.total_egresos);
      const monto_fisico = closureData.monto_fisico;
      const diferencia = monto_fisico - monto_sistema;

      // Create closure record
      const insertQuery = `
        INSERT INTO cortes_caja (
          sucursal_id, caja_id, fecha_cierre,
          monto_apertura, monto_ingresos, monto_egresos,
          monto_sistema, monto_fisico, diferencia,
          denominaciones, total_movimientos,
          realizado_por, supervisor_id, notas
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const values = [
        sucursal_id,
        caja_id || 'MAIN',
        monto_apertura,
        movimientos.total_ingresos,
        movimientos.total_egresos,
        monto_sistema,
        monto_fisico,
        diferencia,
        JSON.stringify(closureData.denominaciones || {}),
        movimientos.total_movimientos,
        closureData.usuario_id,
        closureData.supervisor_id || null,
        closureData.notas || null
      ];

      const result = await client.query(insertQuery, values);
      const closure = result.rows[0];

      // Generate alert if significant difference
      if (Math.abs(diferencia) > 50) {
        await this._createCashDiscrepancyAlert(client, {
          sucursal_id,
          closure_id: closure.id,
          diferencia,
          monto_sistema,
          monto_fisico
        });
      }

      // Log audit
      await this._logAudit(client, {
        tabla_afectada: 'cortes_caja',
        registro_id: closure.id,
        accion: 'INSERT',
        usuario_id: closureData.usuario_id,
        datos_nuevos: closure
      });

      await client.query('COMMIT');

      logger.info('Cash closure created', {
        sucursal_id,
        caja_id,
        diferencia,
        tiene_diferencia: Math.abs(diferencia) > 1
      });

      return closure;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating cash closure:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get cash closure history
   * 
   * @param {UUID} sucursal_id - Branch ID
   * @param {Date} fecha_desde - Start date
   * @param {Date} fecha_hasta - End date
   * @returns {Array} Cash closure records
   */
  async getCashClosureHistory(sucursal_id, fecha_desde, fecha_hasta) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT 
          cc.*,
          u.nombre as realizado_por_nombre,
          s.nombre as supervisor_nombre
        FROM cortes_caja cc
        LEFT JOIN users u ON cc.realizado_por = u.id
        LEFT JOIN users s ON cc.supervisor_id = s.id
        WHERE cc.sucursal_id = $1 
          AND DATE(cc.fecha_cierre) >= $2 
          AND DATE(cc.fecha_cierre) <= $3
        ORDER BY cc.fecha_cierre DESC
      `;

      const result = await client.query(query, [sucursal_id, fecha_desde, fecha_hasta]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting cash closure history:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Get system transactions for a date
   * 
   * @private
   * @param {Object} client - Database client
   * @param {UUID} sucursal_id - Branch ID
   * @param {Date} fecha - Date
   * @returns {Object} { ingresos: [], egresos: [] }
   */
  async _getSystemTransactions(client, sucursal_id, fecha) {
    const ingresos = await client.query(`
      SELECT 
        id, folio, monto, monto_recibido, comision_bancaria,
        metodo_pago, referencia, fecha_pago, conciliado
      FROM pagos_recibidos
      WHERE sucursal_id = $1 
        AND DATE(fecha_pago) = $2
        AND status = 'aplicado'
      ORDER BY fecha_pago
    `, [sucursal_id, fecha]);

    const egresos = await client.query(`
      SELECT 
        id, folio, monto, metodo_pago, referencia,
        fecha_pago, conciliado
      FROM pagos_realizados
      WHERE sucursal_id = $1 
        AND DATE(fecha_pago) = $2
      ORDER BY fecha_pago
    `, [sucursal_id, fecha]);

    return {
      ingresos: ingresos.rows,
      egresos: egresos.rows
    };
  }

  /**
   * Find unmatched transactions between system and bank
   * 
   * @private
   * @param {Array} systemTxns - System transactions
   * @param {Array} bankTxns - Bank transactions
   * @returns {Array} Unmatched system transactions
   */
  _findUnmatchedTransactions(systemTxns, bankTxns) {
    const unmatched = [];
    const tolerance = 0.01; // $0.01 tolerance for floating point comparison

    for (const sysTxn of systemTxns) {
      const matchFound = bankTxns.some(bankTxn => {
        const amountMatch = Math.abs(parseFloat(sysTxn.monto) - parseFloat(bankTxn.monto)) <= tolerance;
        const referenceMatch = sysTxn.referencia && bankTxn.referencia 
          ? sysTxn.referencia === bankTxn.referencia
          : true;
        
        return amountMatch && referenceMatch;
      });

      if (!matchFound) {
        unmatched.push(sysTxn);
      }
    }

    return unmatched;
  }

  /**
   * Mark transactions as reconciled
   * 
   * @private
   * @param {Object} client - Database client
   * @param {Array} systemTxns - System transactions
   * @param {Array} bankTxns - Bank transactions
   */
  async _markTransactionsReconciled(client, systemTxns, bankTxns) {
    const tolerance = 0.01;
    const reconciledIds = [];

    for (const sysTxn of systemTxns) {
      const matchFound = bankTxns.some(bankTxn => {
        const amountMatch = Math.abs(parseFloat(sysTxn.monto) - parseFloat(bankTxn.monto)) <= tolerance;
        const referenceMatch = sysTxn.referencia && bankTxn.referencia 
          ? sysTxn.referencia === bankTxn.referencia
          : true;
        
        return amountMatch && referenceMatch;
      });

      if (matchFound) {
        reconciledIds.push(sysTxn.id);
      }
    }

    if (reconciledIds.length > 0) {
      // Mark as reconciled in pagos_recibidos
      await client.query(`
        UPDATE pagos_recibidos
        SET conciliado = true, fecha_conciliacion = NOW()
        WHERE id = ANY($1)
      `, [reconciledIds]);

      // Also check pagos_realizados
      await client.query(`
        UPDATE pagos_realizados
        SET conciliado = true, fecha_conciliacion = NOW()
        WHERE id = ANY($1)
      `, [reconciledIds]);
    }
  }

  /**
   * Generate reconciliation notes
   * 
   * @private
   */
  _generateReconciliationNotes(unmatchedIngresos, unmatchedEgresos, difIngresos, difEgresos) {
    const notes = [];

    if (Math.abs(difIngresos) > 0.01) {
      notes.push(`Diferencia en ingresos: $${difIngresos.toFixed(2)}`);
    }

    if (Math.abs(difEgresos) > 0.01) {
      notes.push(`Diferencia en egresos: $${difEgresos.toFixed(2)}`);
    }

    if (unmatchedIngresos.length > 0) {
      notes.push(`${unmatchedIngresos.length} ingreso(s) sin conciliar en sistema`);
    }

    if (unmatchedEgresos.length > 0) {
      notes.push(`${unmatchedEgresos.length} egreso(s) sin conciliar en sistema`);
    }

    return notes.length > 0 ? notes.join('; ') : 'Conciliación exitosa sin diferencias';
  }

  /**
   * Create reconciliation alert
   * 
   * @private
   */
  async _createReconciliationAlert(client, alertData) {
    await client.query(`
      INSERT INTO alertas_sistema (
        tipo, gravedad, titulo, mensaje,
        referencia_id, sucursal_id, destinatario_role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      'conciliacion_bancaria_discrepancia',
      'alta',
      'Discrepancia en Conciliación Bancaria',
      `Se encontraron diferencias en la conciliación del ${alertData.fecha}: Ingresos: $${alertData.diferencia_ingresos.toFixed(2)}, Egresos: $${alertData.diferencia_egresos.toFixed(2)}. ${alertData.unmatched_count} transacciones sin conciliar.`,
      alertData.reconciliation_id,
      alertData.sucursal_id,
      'gerente'
    ]);
  }

  /**
   * Create cash discrepancy alert
   * 
   * @private
   */
  async _createCashDiscrepancyAlert(client, alertData) {
    const gravedad = Math.abs(alertData.diferencia) > 100 ? 'alta' : 'media';

    await client.query(`
      INSERT INTO alertas_sistema (
        tipo, gravedad, titulo, mensaje,
        referencia_id, sucursal_id, destinatario_role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      'corte_caja_discrepancia',
      gravedad,
      'Diferencia en Corte de Caja',
      `Diferencia de $${alertData.diferencia.toFixed(2)} encontrada en corte de caja (Sistema: $${alertData.monto_sistema.toFixed(2)}, Físico: $${alertData.monto_fisico.toFixed(2)})`,
      alertData.closure_id,
      alertData.sucursal_id,
      'gerente'
    ]);
  }

  /**
   * Log audit entry
   * 
   * @private
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

module.exports = ReconciliationService;
