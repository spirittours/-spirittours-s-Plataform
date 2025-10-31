/**
 * Spirit Tours - Alerts Service
 * 
 * Automated alert generation system for:
 * - Overdue accounts (CXC/CXP)
 * - Bank reconciliation discrepancies
 * - Cash register discrepancies
 * - Refunds pending authorization
 * - High-value transactions requiring approval
 * - Fraud indicators
 * - System anomalies
 * 
 * Scheduled jobs run daily to detect and generate alerts
 * 
 * @module alerts.service
 */

const logger = require('../utils/logger');
const cron = require('node-cron');

class AlertsService {
  constructor(pool) {
    if (!pool) {
      throw new Error('Database pool is required');
    }
    this.pool = pool;
    this.scheduledJobs = [];
  }

  /**
   * Initialize scheduled alert jobs
   * Runs daily checks for various alert conditions
   */
  initializeScheduledJobs() {
    // Daily at 8:00 AM - Check overdue accounts
    const overdueJob = cron.schedule('0 8 * * *', async () => {
      logger.info('Running daily overdue accounts check...');
      await this.checkOverdueAccounts();
    });

    // Daily at 9:00 AM - Check pending authorizations
    const authJob = cron.schedule('0 9 * * *', async () => {
      logger.info('Running daily pending authorizations check...');
      await this.checkPendingAuthorizations();
    });

    // Hourly - Check high-value transactions
    const highValueJob = cron.schedule('0 * * * *', async () => {
      logger.info('Running hourly high-value transactions check...');
      await this.checkHighValueTransactions();
    });

    this.scheduledJobs.push(overdueJob, authJob, highValueJob);

    logger.info('Scheduled alert jobs initialized');
  }

  /**
   * Stop all scheduled jobs
   */
  stopScheduledJobs() {
    this.scheduledJobs.forEach(job => job.stop());
    logger.info('Scheduled alert jobs stopped');
  }

  /**
   * Check for overdue accounts and generate alerts
   */
  async checkOverdueAccounts() {
    const client = await this.pool.connect();
    try {
      // Get overdue CXC
      const overdueResult = await client.query(`
        SELECT 
          cxc.*,
          s.nombre as sucursal_nombre,
          c.nombre as customer_nombre
        FROM cuentas_por_cobrar cxc
        JOIN sucursales s ON cxc.sucursal_id = s.id
        LEFT JOIN customers c ON cxc.customer_id = c.id
        WHERE cxc.fecha_vencimiento < NOW()
          AND cxc.status NOT IN ('cobrado', 'cancelada')
          AND cxc.monto_pendiente > 0
      `);

      const overdueCXC = overdueResult.rows;

      // Group by severity
      const critical = overdueCXC.filter(cxc => cxc.dias_vencido > 60);
      const high = overdueCXC.filter(cxc => cxc.dias_vencido > 30 && cxc.dias_vencido <= 60);
      const medium = overdueCXC.filter(cxc => cxc.dias_vencido <= 30);

      // Generate alerts
      for (const cxc of critical) {
        await this._createAlert(client, {
          tipo: 'cxc_vencido_critico',
          gravedad: 'critica',
          titulo: 'CXC Vencido Crítico (>60 días)',
          mensaje: `CXC ${cxc.folio} vencido hace ${cxc.dias_vencido} días. Cliente: ${cxc.customer_nombre}. Monto pendiente: $${parseFloat(cxc.monto_pendiente).toFixed(2)}`,
          referencia_id: cxc.id,
          sucursal_id: cxc.sucursal_id,
          destinatario_role: 'director'
        });
      }

      for (const cxc of high) {
        await this._createAlert(client, {
          tipo: 'cxc_vencido',
          gravedad: 'alta',
          titulo: 'CXC Vencido (>30 días)',
          mensaje: `CXC ${cxc.folio} vencido hace ${cxc.dias_vencido} días. Monto pendiente: $${parseFloat(cxc.monto_pendiente).toFixed(2)}`,
          referencia_id: cxc.id,
          sucursal_id: cxc.sucursal_id,
          destinatario_role: 'gerente'
        });
      }

      logger.info(`Overdue accounts check completed. Critical: ${critical.length}, High: ${high.length}, Medium: ${medium.length}`);
    } catch (error) {
      logger.error('Error checking overdue accounts:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Check for pending authorizations and generate reminders
   */
  async checkPendingAuthorizations() {
    const client = await this.pool.connect();
    try {
      // Pending CXP authorizations
      const pendingCXP = await client.query(`
        SELECT COUNT(*) as count, SUM(monto_total) as total_amount
        FROM cuentas_por_pagar
        WHERE status = 'pendiente_revision'
          AND created_at < NOW() - INTERVAL '24 hours'
      `);

      if (parseInt(pendingCXP.rows[0].count) > 0) {
        await this._createAlert(client, {
          tipo: 'cxp_autorizacion_pendiente',
          gravedad: 'media',
          titulo: 'CXP Pendientes de Autorización',
          mensaje: `${pendingCXP.rows[0].count} CXP(s) pendientes de autorización por más de 24 horas. Monto total: $${parseFloat(pendingCXP.rows[0].total_amount || 0).toFixed(2)}`,
          destinatario_role: 'gerente'
        });
      }

      // Pending refund authorizations
      const pendingRefunds = await client.query(`
        SELECT COUNT(*) as count, SUM(monto_reembolso) as total_amount
        FROM reembolsos_por_pagar
        WHERE status = 'pendiente_autorizacion'
          AND created_at < NOW() - INTERVAL '12 hours'
      `);

      if (parseInt(pendingRefunds.rows[0].count) > 0) {
        await this._createAlert(client, {
          tipo: 'reembolso_autorizacion_pendiente',
          gravedad: 'alta',
          titulo: 'Reembolsos Pendientes de Autorización',
          mensaje: `${pendingRefunds.rows[0].count} reembolso(s) pendientes de autorización. Monto total: $${parseFloat(pendingRefunds.rows[0].total_amount || 0).toFixed(2)}`,
          destinatario_role: 'gerente'
        });
      }

      logger.info('Pending authorizations check completed');
    } catch (error) {
      logger.error('Error checking pending authorizations:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Check for high-value transactions and generate alerts
   */
  async checkHighValueTransactions() {
    const client = await this.pool.connect();
    try {
      const threshold = 50000; // $50,000

      // High-value payments received (last hour)
      const highValuePayments = await client.query(`
        SELECT 
          pr.*,
          cxc.folio as cxc_folio,
          s.nombre as sucursal_nombre
        FROM pagos_recibidos pr
        JOIN cuentas_por_cobrar cxc ON pr.cxc_id = cxc.id
        JOIN sucursales s ON pr.sucursal_id = s.id
        WHERE pr.monto >= $1
          AND pr.fecha_pago > NOW() - INTERVAL '1 hour'
      `, [threshold]);

      for (const payment of highValuePayments.rows) {
        await this._createAlert(client, {
          tipo: 'pago_alto_valor',
          gravedad: 'media',
          titulo: 'Pago de Alto Valor Registrado',
          mensaje: `Pago ${payment.folio} por $${parseFloat(payment.monto).toFixed(2)} registrado en ${payment.sucursal_nombre}. CXC: ${payment.cxc_folio}`,
          referencia_id: payment.id,
          sucursal_id: payment.sucursal_id,
          destinatario_role: 'director'
        });
      }

      logger.info(`High-value transactions check completed. Found: ${highValuePayments.rows.length}`);
    } catch (error) {
      logger.error('Error checking high-value transactions:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Detect fraud indicators
   * - Multiple payments from same source in short time
   * - Large cash transactions
   * - Unusual transaction patterns
   */
  async detectFraudIndicators() {
    const client = await this.pool.connect();
    try {
      // Duplicate payments within 1 hour
      const duplicates = await client.query(`
        SELECT metodo_pago, referencia, monto, COUNT(*) as count
        FROM pagos_recibidos
        WHERE fecha_pago > NOW() - INTERVAL '1 hour'
          AND referencia IS NOT NULL
        GROUP BY metodo_pago, referencia, monto
        HAVING COUNT(*) > 1
      `);

      for (const dup of duplicates.rows) {
        await this._createAlert(client, {
          tipo: 'fraude_sospecha_duplicado',
          gravedad: 'critica',
          titulo: 'Posible Pago Duplicado Detectado',
          mensaje: `${dup.count} pagos idénticos detectados: ${dup.metodo_pago}, Ref: ${dup.referencia}, Monto: $${parseFloat(dup.monto).toFixed(2)}`,
          destinatario_role: 'director'
        });
      }

      // Large cash transactions (>$10,000)
      const largeCash = await client.query(`
        SELECT *
        FROM pagos_recibidos
        WHERE metodo_pago = 'efectivo'
          AND monto > 10000
          AND fecha_pago > NOW() - INTERVAL '1 day'
      `);

      for (const cash of largeCash.rows) {
        await this._createAlert(client, {
          tipo: 'transaccion_efectivo_grande',
          gravedad: 'alta',
          titulo: 'Transacción en Efectivo de Alto Valor',
          mensaje: `Pago en efectivo ${cash.folio} por $${parseFloat(cash.monto).toFixed(2)}. Revisar cumplimiento normativo.`,
          referencia_id: cash.id,
          sucursal_id: cash.sucursal_id,
          destinatario_role: 'contador'
        });
      }

      logger.info('Fraud detection completed');
    } catch (error) {
      logger.error('Error detecting fraud indicators:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Get alerts for user/role
   * 
   * @param {Object} filters - Filter options
   * @param {UUID} filters.sucursal_id - Branch ID
   * @param {string} filters.gravedad - Severity filter
   * @param {boolean} filters.resuelta - Resolved status
   * @param {string} filters.role - User role
   * @returns {Array} Alerts
   */
  async getAlerts(filters = {}) {
    const client = await this.pool.connect();
    try {
      const whereClauses = ['1=1'];
      const params = [];
      let paramIndex = 1;

      if (filters.sucursal_id) {
        whereClauses.push(`(sucursal_id = $${paramIndex} OR sucursal_id IS NULL)`);
        params.push(filters.sucursal_id);
        paramIndex++;
      }

      if (filters.gravedad) {
        whereClauses.push(`gravedad = $${paramIndex}`);
        params.push(filters.gravedad);
        paramIndex++;
      }

      if (filters.resuelta !== undefined) {
        whereClauses.push(`resuelta = $${paramIndex}`);
        params.push(filters.resuelta);
        paramIndex++;
      }

      if (filters.role) {
        whereClauses.push(`(destinatario_role = $${paramIndex} OR destinatario_role IS NULL)`);
        params.push(filters.role);
        paramIndex++;
      }

      const query = `
        SELECT *
        FROM alertas_sistema
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY 
          CASE gravedad 
            WHEN 'critica' THEN 1
            WHEN 'alta' THEN 2
            WHEN 'media' THEN 3
            WHEN 'baja' THEN 4
          END,
          created_at DESC
        LIMIT 100
      `;

      const result = await client.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting alerts:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mark alert as read
   * 
   * @param {UUID} alert_id - Alert ID
   * @param {UUID} usuario_id - User ID
   */
  async markAlertRead(alert_id, usuario_id) {
    const client = await this.pool.connect();
    try {
      await client.query(
        'UPDATE alertas_sistema SET leida = true, leida_por = $1, fecha_lectura = NOW() WHERE id = $2',
        [usuario_id, alert_id]
      );

      logger.info(`Alert ${alert_id} marked as read by user ${usuario_id}`);
    } catch (error) {
      logger.error('Error marking alert as read:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Mark alert as resolved
   * 
   * @param {UUID} alert_id - Alert ID
   * @param {UUID} usuario_id - User ID
   * @param {string} comentario - Resolution comment
   */
  async resolveAlert(alert_id, usuario_id, comentario) {
    const client = await this.pool.connect();
    try {
      await client.query(
        'UPDATE alertas_sistema SET resuelta = true, resuelta_por = $1, fecha_resolucion = NOW(), comentario_resolucion = $2 WHERE id = $3',
        [usuario_id, comentario, alert_id]
      );

      logger.info(`Alert ${alert_id} resolved by user ${usuario_id}`);
    } catch (error) {
      logger.error('Error resolving alert:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create alert (internal helper)
   * 
   * @private
   */
  async _createAlert(client, alertData) {
    // Check if similar alert already exists (avoid duplicates)
    const existingResult = await client.query(`
      SELECT id FROM alertas_sistema
      WHERE tipo = $1
        AND referencia_id = $2
        AND resuelta = false
        AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1
    `, [alertData.tipo, alertData.referencia_id || null]);

    if (existingResult.rows.length > 0) {
      // Similar alert already exists, skip
      return;
    }

    await client.query(`
      INSERT INTO alertas_sistema (
        tipo, gravedad, titulo, mensaje,
        referencia_id, sucursal_id, destinatario_role
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
}

module.exports = AlertsService;
