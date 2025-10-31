/**
 * Unit Tests for Accounting Service
 * 
 * Tests coverage:
 * - Refund calculation
 * - CXC creation and validation
 * - Payment registration
 * - CXP authorization workflow
 * - Commission calculation
 * - Duplicate payment detection
 */

const AccountingService = require('../../backend/services/accounting.service');

// Mock database pool
const mockPool = {
  connect: jest.fn(),
  query: jest.fn()
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

describe('AccountingService', () => {
  let accountingService;

  beforeEach(() => {
    accountingService = new AccountingService(mockPool);
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockReset();
    jest.clearAllMocks();
  });

  describe('calculateRefundAmount', () => {
    test('should return 100% refund for 30+ days in advance', () => {
      const result = accountingService.calculateRefundAmount(35, 10000);
      
      expect(result.monto_reembolso).toBe(10000);
      expect(result.monto_retenido).toBe(0);
      expect(result.porcentaje_reembolsado).toBe(100);
      expect(result.politica_aplicada).toBe('30+ días: 100% reembolso');
    });

    test('should return 90% refund for 14-29 days in advance', () => {
      const result = accountingService.calculateRefundAmount(20, 10000);
      
      expect(result.monto_reembolso).toBe(9000);
      expect(result.monto_retenido).toBe(1000);
      expect(result.porcentaje_reembolsado).toBe(90);
      expect(result.politica_aplicada).toBe('14-29 días: 90% reembolso');
    });

    test('should return 75% refund for 7-13 days in advance', () => {
      const result = accountingService.calculateRefundAmount(10, 10000);
      
      expect(result.monto_reembolso).toBe(7500);
      expect(result.monto_retenido).toBe(2500);
      expect(result.porcentaje_reembolsado).toBe(75);
      expect(result.politica_aplicada).toBe('7-13 días: 75% reembolso');
    });

    test('should return 50% refund for 2-6 days in advance', () => {
      const result = accountingService.calculateRefundAmount(4, 10000);
      
      expect(result.monto_reembolso).toBe(5000);
      expect(result.monto_retenido).toBe(5000);
      expect(result.porcentaje_reembolsado).toBe(50);
      expect(result.politica_aplicada).toBe('2-6 días: 50% reembolso');
    });

    test('should return 0% refund for 0-1 days in advance', () => {
      const result = accountingService.calculateRefundAmount(1, 10000);
      
      expect(result.monto_reembolso).toBe(0);
      expect(result.monto_retenido).toBe(10000);
      expect(result.porcentaje_reembolsado).toBe(0);
      expect(result.politica_aplicada).toBe('0-1 días: sin reembolso');
    });

    test('should handle decimal amounts correctly', () => {
      const result = accountingService.calculateRefundAmount(10, 12345.67);
      
      expect(result.monto_reembolso).toBe(9259.25); // 75% of 12345.67
      expect(result.monto_retenido).toBe(3086.42);
      expect(result.monto_reembolso + result.monto_retenido).toBeCloseTo(12345.67, 2);
    });
  });

  describe('createCXC', () => {
    const mockCXCData = {
      trip_id: 'trip-uuid-123',
      customer_id: 'customer-uuid-456',
      sucursal_id: 'sucursal-uuid-789',
      monto_total: 12000,
      fecha_vencimiento: new Date('2025-12-31'),
      usuario_id: 'user-uuid-001'
    };

    beforeEach(() => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ folio: 'CXC-202510-000123' }] }) // Generate folio
        .mockResolvedValueOnce({ rows: [] }) // Validate rates
        .mockResolvedValueOnce({ rows: [{ id: 'cxc-uuid', folio: 'CXC-202510-000123', ...mockCXCData }] }) // INSERT CXC
        .mockResolvedValueOnce({ rows: [] }) // Create accounting entry
        .mockResolvedValueOnce({ rows: [] }) // Log audit
        .mockResolvedValueOnce({ rows: [] }); // COMMIT
    });

    test('should create CXC successfully', async () => {
      const result = await accountingService.createCXC(mockCXCData);
      
      expect(result.folio).toBe('CXC-202510-000123');
      expect(result.monto_total).toBe(12000);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should rollback on error', async () => {
      mockClient.query.mockReset();
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // Simulate error

      await expect(accountingService.createCXC(mockCXCData)).rejects.toThrow('Database error');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('_generateFolio', () => {
    test('should generate sequential folios', async () => {
      // Mock last folio
      mockClient.query.mockResolvedValueOnce({
        rows: [{ folio: 'CXC-202510-000099' }]
      });

      const folio = await accountingService._generateFolio(mockClient, 'CXC');
      
      expect(folio).toMatch(/CXC-\d{6}-\d{6}/);
      expect(folio).toContain('202510'); // Current year-month
    });

    test('should start at 000001 if no previous folios', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const folio = await accountingService._generateFolio(mockClient, 'CXP');
      
      expect(folio).toMatch(/CXP-\d{6}-000001/);
    });
  });

  describe('_checkDuplicatePayment', () => {
    test('should throw error if duplicate payment found', async () => {
      const paymentData = {
        metodo_pago: 'transferencia',
        referencia: 'TRF123456',
        monto: 5000
      };

      mockClient.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });

      await expect(
        accountingService._checkDuplicatePayment(mockClient, paymentData)
      ).rejects.toThrow('Duplicate payment detected');
    });

    test('should pass if no duplicate found', async () => {
      const paymentData = {
        metodo_pago: 'transferencia',
        referencia: 'TRF123456',
        monto: 5000
      };

      mockClient.query.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await expect(
        accountingService._checkDuplicatePayment(mockClient, paymentData)
      ).resolves.toBeUndefined();
    });

    test('should skip check if no reference provided', async () => {
      const paymentData = {
        metodo_pago: 'efectivo',
        monto: 5000
      };

      await expect(
        accountingService._checkDuplicatePayment(mockClient, paymentData)
      ).resolves.toBeUndefined();
      
      expect(mockClient.query).not.toHaveBeenCalled();
    });
  });

  describe('_checkAuthorizationRequired', () => {
    test('should require authorization for amounts >= limit', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ limite_autorizacion_gerente: 5000 }]
      });

      const required = await accountingService._checkAuthorizationRequired(
        mockClient,
        'sucursal-uuid',
        8000
      );

      expect(required).toBe(true);
    });

    test('should not require authorization for amounts < limit', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ limite_autorizacion_gerente: 5000 }]
      });

      const required = await accountingService._checkAuthorizationRequired(
        mockClient,
        'sucursal-uuid',
        3000
      );

      expect(required).toBe(false);
    });

    test('should require authorization if branch not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const required = await accountingService._checkAuthorizationRequired(
        mockClient,
        'invalid-uuid',
        1000
      );

      expect(required).toBe(true);
    });
  });
});

describe('AccountingService - Integration scenarios', () => {
  let accountingService;

  beforeEach(() => {
    accountingService = new AccountingService(mockPool);
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockReset();
  });

  describe('Payment workflow', () => {
    test('should update CXC status from pendiente to parcial on partial payment', async () => {
      // Simulate partial payment scenario
      const cxc = {
        id: 'cxc-uuid',
        folio: 'CXC-202510-000123',
        monto_total: 12000,
        monto_pagado: 0,
        monto_pendiente: 12000,
        status: 'pendiente',
        sucursal_id: 'sucursal-uuid'
      };

      const paymentData = {
        monto: 5000,
        metodo_pago: 'transferencia',
        referencia: 'TRF123',
        usuario_id: 'user-uuid'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [cxc] }) // Get CXC
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Check duplicate
        .mockResolvedValueOnce({ rows: [{ folio: 'PAGO-202510-000045' }] }) // Generate folio
        .mockResolvedValueOnce({ rows: [{ id: 'payment-uuid', folio: 'PAGO-202510-000045' }] }) // Insert payment
        .mockResolvedValueOnce({ rows: [] }) // Update CXC
        .mockResolvedValueOnce({ rows: [] }) // Accounting entry 1
        .mockResolvedValueOnce({ rows: [] }) // Accounting entry 2
        .mockResolvedValueOnce({ rows: [] }) // Log audit
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await accountingService.registerPaymentReceived(cxc.id, paymentData);

      expect(result.payment.folio).toBe('PAGO-202510-000045');
      expect(result.cxc.status).toBe('parcial');
      expect(result.cxc.monto_pagado).toBe(5000);
      expect(result.cxc.monto_pendiente).toBe(7000);
    });

    test('should update CXC status to cobrado on full payment', async () => {
      const cxc = {
        id: 'cxc-uuid',
        folio: 'CXC-202510-000123',
        monto_total: 12000,
        monto_pagado: 7000,
        monto_pendiente: 5000,
        status: 'parcial',
        sucursal_id: 'sucursal-uuid'
      };

      const paymentData = {
        monto: 5000,
        metodo_pago: 'transferencia',
        referencia: 'TRF124',
        usuario_id: 'user-uuid'
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [cxc] }) // Get CXC
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Check duplicate
        .mockResolvedValueOnce({ rows: [{ folio: 'PAGO-202510-000046' }] }) // Generate folio
        .mockResolvedValueOnce({ rows: [{ id: 'payment-uuid', folio: 'PAGO-202510-000046' }] }) // Insert payment
        .mockResolvedValueOnce({ rows: [] }) // Update CXC
        .mockResolvedValueOnce({ rows: [] }) // Accounting entry 1
        .mockResolvedValueOnce({ rows: [] }) // Accounting entry 2
        .mockResolvedValueOnce({ rows: [] }) // Log audit
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await accountingService.registerPaymentReceived(cxc.id, paymentData);

      expect(result.cxc.status).toBe('cobrado');
      expect(result.cxc.monto_pagado).toBe(12000);
      expect(result.cxc.monto_pendiente).toBe(0);
    });
  });

  describe('Error handling', () => {
    test('should reject payment if CXC not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Get CXC - empty

      const paymentData = {
        monto: 5000,
        metodo_pago: 'transferencia',
        usuario_id: 'user-uuid'
      };

      await expect(
        accountingService.registerPaymentReceived('invalid-uuid', paymentData)
      ).rejects.toThrow('CXC not found');
    });

    test('should reject payment if CXC already fully paid', async () => {
      const cxc = {
        id: 'cxc-uuid',
        status: 'cobrado',
        monto_pendiente: 0
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [cxc] }); // Get CXC

      const paymentData = {
        monto: 5000,
        metodo_pago: 'transferencia',
        usuario_id: 'user-uuid'
      };

      await expect(
        accountingService.registerPaymentReceived(cxc.id, paymentData)
      ).rejects.toThrow('CXC already fully paid');
    });

    test('should reject payment if amount exceeds pending', async () => {
      const cxc = {
        id: 'cxc-uuid',
        status: 'parcial',
        monto_pendiente: 3000
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [cxc] }); // Get CXC

      const paymentData = {
        monto: 5000,
        metodo_pago: 'transferencia',
        usuario_id: 'user-uuid'
      };

      await expect(
        accountingService.registerPaymentReceived(cxc.id, paymentData)
      ).rejects.toThrow('Payment amount exceeds pending amount');
    });
  });
});
