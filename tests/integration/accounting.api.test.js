/**
 * Integration Tests for Accounting API Endpoints
 * Tests the complete HTTP request/response cycle for accounting routes
 */

const request = require('supertest');
const express = require('express');
const accountingRoutes = require('../../backend/routes/accounting.routes');
const AccountingService = require('../../backend/services/accounting.service');
const ReconciliationService = require('../../backend/services/reconciliation.service');

// Mock services
jest.mock('../../backend/services/accounting.service');
jest.mock('../../backend/services/reconciliation.service');

// Mock authentication middleware - now it exists, so we override it
jest.mock('../../backend/middleware/auth', () => (req, res, next) => {
  req.user = { id: 'user-123', role: 'gerente', sucursal_id: 'sucursal-123' };
  next();
});

jest.mock('../../backend/middleware/role', () => (roles) => (req, res, next) => {
  next();
});

// Create Express app for testing
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/accounting', accountingRoutes);
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error',
    });
  });
  
  return app;
}

describe('Accounting API Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  // Note: Some tests will fail because routes are not fully implemented yet
  // These tests serve as specification for expected API behavior

  describe('POST /api/accounting/cxc', () => {
    test('should create CXC successfully with valid data', async () => {
      const mockCXC = {
        cxc_id: 'cxc-uuid-123',
        folio_cxc: 'CXC-202510-000125',
        sucursal_id: 'sucursal-uuid-789',
        reservacion_id: 'reservacion-uuid-456',
        cliente_nombre: 'Juan Pérez',
        monto_total: 12000,
        monto_pendiente: 12000,
        estado_cxc: 'pendiente',
        fecha_emision: new Date(),
      };

      AccountingService.prototype.createCXC = jest.fn().mockResolvedValue(mockCXC);

      const response = await request(app)
        .post('/api/accounting/cxc')
        .send({
          sucursal_id: 'sucursal-uuid-789',
          reservacion_id: 'reservacion-uuid-456',
          cliente_nombre: 'Juan Pérez',
          cliente_email: 'juan@example.com',
          monto_total: 12000,
          tipo_tarifa: 'menudeo',
          descripcion: 'Tour a Cancún',
          fecha_salida: '2025-02-15',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.folio_cxc).toBe('CXC-202510-000125');
      expect(AccountingService.prototype.createCXC).toHaveBeenCalledTimes(1);
    });

    test('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/accounting/cxc')
        .send({
          sucursal_id: 'sucursal-uuid-789',
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle service errors', async () => {
      AccountingService.prototype.createCXC = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/accounting/cxc')
        .send({
          sucursal_id: 'sucursal-uuid-789',
          reservacion_id: 'reservacion-uuid-456',
          cliente_nombre: 'Juan Pérez',
          cliente_email: 'juan@example.com',
          monto_total: 12000,
          tipo_tarifa: 'menudeo',
          descripcion: 'Tour a Cancún',
          fecha_salida: '2025-02-15',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Database connection failed');
    });
  });

  describe('POST /api/accounting/cxc/:id/payment', () => {
    test('should register payment successfully', async () => {
      const mockPayment = {
        payment_id: 'payment-uuid-123',
        folio_pago: 'PAGO-202510-000048',
        cxc_id: 'cxc-uuid-123',
        monto: 5000,
        forma_pago: 'transferencia',
        fecha_pago: new Date(),
      };

      AccountingService.prototype.registerPaymentReceived = jest
        .fn()
        .mockResolvedValue(mockPayment);

      const response = await request(app)
        .post('/api/accounting/cxc/cxc-uuid-123/payment')
        .send({
          monto: 5000,
          forma_pago: 'transferencia',
          referencia: 'TRANSFER-12345',
          fecha_pago: '2025-10-28',
          notas: 'Pago parcial',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.folio_pago).toBe('PAGO-202510-000048');
      expect(response.body.data.monto).toBe(5000);
    });

    test('should reject duplicate payment', async () => {
      AccountingService.prototype.registerPaymentReceived = jest
        .fn()
        .mockRejectedValue(new Error('Duplicate payment detected within 24 hours'));

      const response = await request(app)
        .post('/api/accounting/cxc/cxc-uuid-123/payment')
        .send({
          monto: 5000,
          forma_pago: 'transferencia',
          referencia: 'TRANSFER-12345',
          fecha_pago: '2025-10-28',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Duplicate payment');
    });
  });

  describe('GET /api/accounting/cxc/:id', () => {
    test('should retrieve CXC by ID', async () => {
      const mockCXC = {
        cxc_id: 'cxc-uuid-123',
        folio_cxc: 'CXC-202510-000125',
        cliente_nombre: 'Juan Pérez',
        monto_total: 12000,
        monto_pendiente: 7000,
        estado_cxc: 'parcial',
      };

      AccountingService.prototype.getCXCById = jest.fn().mockResolvedValue(mockCXC);

      const response = await request(app)
        .get('/api/accounting/cxc/cxc-uuid-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.folio_cxc).toBe('CXC-202510-000125');
      expect(response.body.data.estado_cxc).toBe('parcial');
    });

    test('should return 404 if CXC not found', async () => {
      AccountingService.prototype.getCXCById = jest
        .fn()
        .mockResolvedValue(null);

      const response = await request(app)
        .get('/api/accounting/cxc/nonexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/accounting/cxp', () => {
    test('should create CXP successfully', async () => {
      const mockCXP = {
        cxp_id: 'cxp-uuid-123',
        folio_cxp: 'CXP-202510-000050',
        proveedor_id: 'proveedor-uuid-456',
        monto_total: 25000,
        estado_cxp: 'pendiente_revision',
        fecha_emision: new Date(),
      };

      AccountingService.prototype.createCXP = jest.fn().mockResolvedValue(mockCXP);

      const response = await request(app)
        .post('/api/accounting/cxp')
        .send({
          sucursal_id: 'sucursal-uuid-789',
          proveedor_id: 'proveedor-uuid-456',
          tipo_gasto: 'operativo',
          concepto: 'Pago a hotel',
          monto_total: 25000,
          fecha_vencimiento: '2025-11-15',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.folio_cxp).toBe('CXP-202510-000050');
    });
  });

  describe('POST /api/accounting/cxp/:id/authorize', () => {
    test('should authorize CXP successfully', async () => {
      const mockAuthorization = {
        cxp_id: 'cxp-uuid-123',
        estado_cxp: 'autorizada',
        fecha_autorizacion: new Date(),
        usuario_autorizador_id: 'user-123',
      };

      AccountingService.prototype.authorizeCXP = jest
        .fn()
        .mockResolvedValue(mockAuthorization);

      const response = await request(app)
        .post('/api/accounting/cxp/cxp-uuid-123/authorize')
        .send({
          comentario: 'Autorizado por gerente',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.estado_cxp).toBe('autorizada');
    });

    test('should reject authorization if insufficient privileges', async () => {
      AccountingService.prototype.authorizeCXP = jest
        .fn()
        .mockRejectedValue(new Error('User does not have sufficient authorization level'));

      const response = await request(app)
        .post('/api/accounting/cxp/cxp-uuid-123/authorize')
        .send({
          comentario: 'Intentando autorizar',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('authorization level');
    });
  });

  describe('POST /api/accounting/refunds', () => {
    test('should create refund with automatic calculation', async () => {
      const mockRefund = {
        reembolso_id: 'refund-uuid-123',
        folio_reembolso: 'REMB-202510-000020',
        cxc_id: 'cxc-uuid-123',
        monto_pagado: 10000,
        monto_reembolso: 9000,
        monto_retenido: 1000,
        porcentaje_reembolsado: 90,
        estado_reembolso: 'pendiente_autorizacion',
      };

      AccountingService.prototype.createRefund = jest.fn().mockResolvedValue(mockRefund);

      const response = await request(app)
        .post('/api/accounting/refunds')
        .send({
          cxc_id: 'cxc-uuid-123',
          motivo_cancelacion: 'Emergencia familiar',
          fecha_salida: '2025-12-15',
          monto_pagado: 10000,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.monto_reembolso).toBe(9000);
      expect(response.body.data.porcentaje_reembolsado).toBe(90);
    });
  });

  describe('POST /api/accounting/reconciliation/bank', () => {
    test('should perform bank reconciliation', async () => {
      const mockReconciliation = {
        reconciliacion_id: 'recon-uuid-123',
        sucursal_id: 'sucursal-uuid-789',
        fecha_conciliacion: new Date(),
        total_sistema: 150000,
        total_banco: 150000,
        diferencia: 0,
        estado_conciliacion: 'conciliado',
      };

      ReconciliationService.prototype.performBankReconciliation = jest
        .fn()
        .mockResolvedValue(mockReconciliation);

      const response = await request(app)
        .post('/api/accounting/reconciliation/bank')
        .send({
          sucursal_id: 'sucursal-uuid-789',
          fecha: '2025-10-28',
          saldo_inicial_banco: 100000,
          saldo_final_banco: 150000,
          movimientos_banco: [
            { fecha: '2025-10-28', concepto: 'Depósito', monto: 50000, tipo: 'ingreso' },
          ],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.diferencia).toBe(0);
      expect(response.body.data.estado_conciliacion).toBe('conciliado');
    });

    test('should detect discrepancies in reconciliation', async () => {
      const mockReconciliation = {
        reconciliacion_id: 'recon-uuid-123',
        sucursal_id: 'sucursal-uuid-789',
        diferencia: 5000,
        estado_conciliacion: 'con_diferencias',
        movimientos_no_conciliados: [
          { concepto: 'Transferencia no registrada', monto: 5000 },
        ],
      };

      ReconciliationService.prototype.performBankReconciliation = jest
        .fn()
        .mockResolvedValue(mockReconciliation);

      const response = await request(app)
        .post('/api/accounting/reconciliation/bank')
        .send({
          sucursal_id: 'sucursal-uuid-789',
          fecha: '2025-10-28',
          saldo_inicial_banco: 100000,
          saldo_final_banco: 155000,
          movimientos_banco: [
            { fecha: '2025-10-28', concepto: 'Depósito', monto: 50000, tipo: 'ingreso' },
            { fecha: '2025-10-28', concepto: 'Transferencia', monto: 5000, tipo: 'ingreso' },
          ],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.diferencia).toBe(5000);
      expect(response.body.data.estado_conciliacion).toBe('con_diferencias');
    });
  });

  describe('GET /api/accounting/reports/accounts-receivable', () => {
    test('should generate CXC report with filters', async () => {
      const mockReport = {
        total_cxc: 50,
        monto_total_pendiente: 250000,
        monto_total_vencido: 50000,
        cxc_por_estado: {
          pendiente: 20,
          parcial: 15,
          cobrado: 10,
          vencido: 5,
        },
        cxc_list: [
          {
            cxc_id: 'cxc-1',
            folio_cxc: 'CXC-202510-000100',
            cliente_nombre: 'Cliente A',
            monto_pendiente: 5000,
            estado_cxc: 'pendiente',
          },
        ],
      };

      AccountingService.prototype.generateCXCReport = jest
        .fn()
        .mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/accounting/reports/accounts-receivable')
        .query({
          fecha_inicio: '2025-10-01',
          fecha_fin: '2025-10-31',
          sucursal_id: 'sucursal-uuid-789',
          estado: 'pendiente',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total_cxc).toBe(50);
      expect(response.body.data.monto_total_pendiente).toBe(250000);
    });
  });

  describe('GET /api/accounting/alerts', () => {
    test('should retrieve system alerts', async () => {
      const mockAlerts = [
        {
          alerta_id: 'alert-1',
          tipo_alerta: 'cuentas_vencidas',
          severidad: 'high',
          mensaje: '5 cuentas vencidas requieren atención',
          fecha_alerta: new Date(),
          estado_alerta: 'activa',
        },
        {
          alerta_id: 'alert-2',
          tipo_alerta: 'autorizacion_pendiente',
          severidad: 'medium',
          mensaje: '3 CXP pendientes de autorización',
          fecha_alerta: new Date(),
          estado_alerta: 'activa',
        },
      ];

      AccountingService.prototype.getActiveAlerts = jest
        .fn()
        .mockResolvedValue(mockAlerts);

      const response = await request(app)
        .get('/api/accounting/alerts')
        .query({
          sucursal_id: 'sucursal-uuid-789',
          severidad: 'high',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].tipo_alerta).toBe('cuentas_vencidas');
    });
  });

  describe('PUT /api/accounting/alerts/:id/acknowledge', () => {
    test('should acknowledge alert', async () => {
      const mockAcknowledgedAlert = {
        alerta_id: 'alert-1',
        estado_alerta: 'reconocida',
        fecha_reconocimiento: new Date(),
        usuario_reconocimiento_id: 'user-123',
      };

      AccountingService.prototype.acknowledgeAlert = jest
        .fn()
        .mockResolvedValue(mockAcknowledgedAlert);

      const response = await request(app)
        .put('/api/accounting/alerts/alert-1/acknowledge')
        .send({
          comentario: 'Revisado y en seguimiento',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.estado_alerta).toBe('reconocida');
    });
  });

  describe('Error handling middleware', () => {
    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/accounting/nonexistent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/accounting/cxc')
        .send({
          // Invalid/incomplete data
          monto_total: -1000, // Negative amount
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
