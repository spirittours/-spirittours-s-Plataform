-- ============================================================================
-- SEED DATA: Sistema de Contabilidad Multi-Sucursal
-- Descripción: Datos de ejemplo para pruebas y desarrollo
-- Fecha: 2024-10-25
-- ============================================================================

-- ============================================================================
-- 1. SUCURSALES
-- ============================================================================

INSERT INTO sucursales (id, codigo, nombre, direccion, ciudad, estado, telefono, email, banco, cuenta_bancaria, clabe, activa, es_matriz, limite_autorizacion_gerente, limite_autorizacion_director) VALUES
('11111111-1111-1111-1111-111111111111', 'CANCUN', 'Spirit Tours - Cancún', 'Blvd. Kukulcán Km 9', 'Cancún', 'Quintana Roo', '+52-998-123-4567', 'cancun@spirittours.com', 'BBVA', '012345678901234567', '012180001234567890', true, false, 20000.00, 50000.00),
('22222222-2222-2222-2222-222222222222', 'CDMX', 'Spirit Tours - Ciudad de México', 'Av. Reforma 250', 'Ciudad de México', 'CDMX', '+52-55-987-6543', 'cdmx@spirittours.com', 'Santander', '098765432109876543', '014180009876543210', true, false, 20000.00, 50000.00),
('33333333-3333-3333-3333-333333333333', 'GDL', 'Spirit Tours - Guadalajara', 'Av. Vallarta 3200', 'Guadalajara', 'Jalisco', '+52-33-555-1234', 'guadalajara@spirittours.com', 'Banorte', '111222333444555666', '072180001112223334', true, false, 15000.00, 40000.00)
ON CONFLICT (codigo) DO NOTHING;


-- ============================================================================
-- 2. PROVEEDORES
-- ============================================================================

INSERT INTO proveedores (id, codigo, nombre, razon_social, rfc, tipo, telefono, email, banco, cuenta_bancaria, clabe, dias_credito, activo) VALUES
('aa111111-1111-1111-1111-111111111111', 'MAYA-001', 'Maya Tours', 'Maya Tours S.A. de C.V.', 'MAY010101ABC', 'operador_turistico', '+52-998-111-2222', 'pagos@mayatours.com', 'BBVA', '123456789012345678', '012180001234567891', 15, true),
('aa222222-2222-2222-2222-222222222222', 'XCARET-001', 'Xcaret Operador', 'Xcaret Operaciones S.A.', 'XCA020202DEF', 'operador_turistico', '+52-998-222-3333', 'facturacion@xcaret.com', 'Santander', '234567890123456789', '014180002345678901', 15, true),
('aa333333-3333-3333-3333-333333333333', 'RIVIERA-001', 'Riviera Tours', 'Riviera Tours México', 'RIV030303GHI', 'operador_turistico', '+52-998-333-4444', 'finanzas@rivieratours.com', 'Banorte', '345678901234567890', '072180003456789012', 15, true),
('aa444444-4444-4444-4444-444444444444', 'HOTEL-ABC', 'Hotel Paraíso', 'Hotelera Paraíso S.A.', 'HPA040404JKL', 'hotel', '+52-998-444-5555', 'reservas@hotelparaiso.com', 'BBVA', '456789012345678901', '012180004567890123', 30, true),
('aa555555-5555-5555-5555-555555555555', 'TRANS-DEF', 'Transportes Express', 'Transportes Express del Caribe', 'TEC050505MNO', 'transporte', '+52-998-555-6666', 'admin@transexpress.com', 'Santander', '567890123456789012', '014180005678901234', 15, true)
ON CONFLICT (codigo) DO NOTHING;


-- ============================================================================
-- 3. TARIFAS CONTRATADAS
-- ============================================================================

INSERT INTO tarifas_contratadas (proveedor_id, servicio, descripcion, precio_por_persona, vigencia_desde, vigencia_hasta, activa) VALUES
('aa111111-1111-1111-1111-111111111111', 'Tour Chichén Itzá', 'Tour completo a Chichén Itzá con guía y comida', 600.00, '2024-01-01', '2024-12-31', true),
('aa222222-2222-2222-2222-222222222222', 'Tour Xcaret', 'Pase completo a Xcaret con transportación', 700.00, '2024-01-01', '2024-12-31', true),
('aa333333-3333-3333-3333-333333333333', 'Tour Tulum + Playa', 'Tour a Tulum y playa del Carmen', 550.00, '2024-01-01', '2024-12-31', true),
('aa444444-4444-4444-4444-444444444444', 'Habitación Doble', 'Habitación doble vista al mar', 1200.00, '2024-01-01', '2024-12-31', true),
('aa555555-5555-5555-5555-555555555555', 'Transporte Aeropuerto', 'Traslado aeropuerto-hotel-aeropuerto', 350.00, '2024-01-01', '2024-12-31', true);


-- ============================================================================
-- 4. CUENTAS POR COBRAR (Ejemplos de diferentes estados)
-- ============================================================================

-- CXC Pendiente
INSERT INTO cuentas_por_cobrar (
    id, folio, trip_id, customer_id, sucursal_id, tipo,
    monto_total, monto_pagado, monto_pendiente,
    fecha_emision, fecha_vencimiento,
    status, concepto
) VALUES (
    'cxc11111-1111-1111-1111-111111111111',
    'CXC-CANCUN-2024-001',
    (SELECT trip_id FROM trips WHERE booking_reference = 'ST-2024-001' LIMIT 1),
    (SELECT id FROM customers LIMIT 1 OFFSET 0),
    '11111111-1111-1111-1111-111111111111',
    'cliente',
    12000.00,
    0.00,
    12000.00,
    NOW() - INTERVAL '2 days',
    NOW() + INTERVAL '5 days',
    'pendiente',
    'Tour Chichén Itzá + Cenote - 2 personas'
);

-- CXC Parcial
INSERT INTO cuentas_por_cobrar (
    id, folio, trip_id, customer_id, sucursal_id, tipo,
    monto_total, monto_pagado, monto_pendiente,
    fecha_emision, fecha_vencimiento, ultimo_pago,
    status, concepto
) VALUES (
    'cxc22222-2222-2222-2222-222222222222',
    'CXC-CANCUN-2024-002',
    (SELECT trip_id FROM trips WHERE booking_reference = 'ST-2024-002' LIMIT 1),
    (SELECT id FROM customers LIMIT 1 OFFSET 1),
    '11111111-1111-1111-1111-111111111111',
    'cliente',
    8000.00,
    4000.00,
    4000.00,
    NOW() - INTERVAL '5 days',
    NOW() + INTERVAL '2 days',
    NOW() - INTERVAL '3 days',
    'parcial',
    'Tour Xcaret - 1 persona'
);

-- CXC Cobrada
INSERT INTO cuentas_por_cobrar (
    id, folio, trip_id, customer_id, sucursal_id, tipo,
    monto_total, monto_pagado, monto_pendiente,
    fecha_emision, fecha_vencimiento, ultimo_pago, fecha_cobro_total,
    status, concepto
) VALUES (
    'cxc33333-3333-3333-3333-333333333333',
    'CXC-CANCUN-2024-003',
    (SELECT trip_id FROM trips WHERE booking_reference = 'ST-2024-003' LIMIT 1),
    (SELECT id FROM customers LIMIT 1 OFFSET 2),
    '11111111-1111-1111-1111-111111111111',
    'cliente',
    15000.00,
    15000.00,
    0.00,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days',
    'cobrado',
    'Tour Tulum + Playa - 3 personas'
);

-- CXC Vencida
INSERT INTO cuentas_por_cobrar (
    id, folio, trip_id, customer_id, sucursal_id, tipo,
    monto_total, monto_pagado, monto_pendiente,
    fecha_emision, fecha_vencimiento,
    status, concepto
) VALUES (
    'cxc44444-4444-4444-4444-444444444444',
    'CXC-CDMX-2024-001',
    (SELECT trip_id FROM trips LIMIT 1 OFFSET 3),
    (SELECT id FROM customers LIMIT 1 OFFSET 3),
    '22222222-2222-2222-2222-222222222222',
    'cliente',
    6500.00,
    0.00,
    6500.00,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '5 days',
    'vencido',
    'Tour ciudad de México - 2 personas'
);


-- ============================================================================
-- 5. PAGOS RECIBIDOS
-- ============================================================================

-- Pago parcial para CXC-CANCUN-2024-002
INSERT INTO pagos_recibidos (
    id, folio, cxc_id, monto, monto_recibido, metodo_pago,
    referencia, banco, fecha_pago, sucursal_id, status, conciliado
) VALUES (
    'pr111111-1111-1111-1111-111111111111',
    'PAG-IN-CANCUN-2024-001',
    'cxc22222-2222-2222-2222-222222222222',
    4000.00,
    4000.00,
    'transferencia',
    'BBVA-REF-123456789',
    'BBVA',
    NOW() - INTERVAL '3 days',
    '11111111-1111-1111-1111-111111111111',
    'aplicado',
    true
);

-- Pagos completos para CXC-CANCUN-2024-003
INSERT INTO pagos_recibidos (
    id, folio, cxc_id, monto, monto_recibido, metodo_pago,
    referencia, banco, fecha_pago, sucursal_id, status, conciliado
) VALUES 
(
    'pr222222-2222-2222-2222-222222222222',
    'PAG-IN-CANCUN-2024-002',
    'cxc33333-3333-3333-3333-333333333333',
    7500.00,
    7500.00,
    'tarjeta_credito',
    'STRIPE-ch_1234567890',
    'Stripe',
    NOW() - INTERVAL '10 days',
    '11111111-1111-1111-1111-111111111111',
    'aplicado',
    true
),
(
    'pr333333-3333-3333-3333-333333333333',
    'PAG-IN-CANCUN-2024-003',
    'cxc33333-3333-3333-3333-333333333333',
    7500.00,
    7500.00,
    'transferencia',
    'BBVA-REF-987654321',
    'BBVA',
    NOW() - INTERVAL '5 days',
    '11111111-1111-1111-1111-111111111111',
    'aplicado',
    true
);


-- ============================================================================
-- 6. CUENTAS POR PAGAR
-- ============================================================================

-- CXP Pendiente
INSERT INTO cuentas_por_pagar (
    id, folio, trip_id, proveedor_id, sucursal_id, tipo,
    monto_total, monto_pendiente,
    fecha_emision, fecha_vencimiento,
    status, concepto, requiere_autorizacion
) VALUES (
    'cxp11111-1111-1111-1111-111111111111',
    'CXP-CANCUN-2024-001',
    (SELECT trip_id FROM trips WHERE booking_reference = 'ST-2024-001' LIMIT 1),
    'aa111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'proveedor',
    8000.00,
    8000.00,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '14 days',
    'pendiente',
    'Tour Chichén Itzá - 2 pax @ $600 c/u + extras',
    true
);

-- CXP Autorizada
INSERT INTO cuentas_por_pagar (
    id, folio, trip_id, proveedor_id, sucursal_id, tipo,
    monto_total, monto_pendiente,
    fecha_emision, fecha_vencimiento, fecha_autorizacion,
    status, concepto, requiere_autorizacion, autorizado_por
) VALUES (
    'cxp22222-2222-2222-2222-222222222222',
    'CXP-CANCUN-2024-002',
    (SELECT trip_id FROM trips WHERE booking_reference = 'ST-2024-003' LIMIT 1),
    'aa333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'proveedor',
    16500.00,
    16500.00,
    NOW() - INTERVAL '6 days',
    NOW() + INTERVAL '9 days',
    NOW() - INTERVAL '4 days',
    'autorizado',
    'Tour Tulum + Playa - 3 pax @ $550 c/u',
    true,
    (SELECT id FROM users WHERE role = 'manager' LIMIT 1)
);

-- CXP Pagada
INSERT INTO cuentas_por_pagar (
    id, folio, trip_id, proveedor_id, sucursal_id, tipo,
    monto_total, monto_pagado, monto_pendiente,
    fecha_emision, fecha_vencimiento, fecha_autorizacion, fecha_pago,
    status, concepto, requiere_autorizacion, autorizado_por
) VALUES (
    'cxp33333-3333-3333-3333-333333333333',
    'CXP-CANCUN-2024-003',
    (SELECT trip_id FROM trips WHERE status = 'completed' LIMIT 1),
    'aa222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'proveedor',
    5600.00,
    5600.00,
    0.00,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '18 days',
    NOW() - INTERVAL '6 days',
    'pagado',
    'Tour Xcaret - 8 pax @ $700 c/u',
    true,
    (SELECT id FROM users WHERE role = 'manager' LIMIT 1)
);


-- ============================================================================
-- 7. PAGOS REALIZADOS
-- ============================================================================

INSERT INTO pagos_realizados (
    id, folio, cxp_id, monto, metodo_pago,
    referencia, cuenta_origen, cuenta_destino,
    banco_origen, banco_destino,
    fecha_pago, sucursal_id, status, conciliado,
    ejecutado_por
) VALUES (
    'prz11111-1111-1111-1111-111111111111',
    'PAG-OUT-CANCUN-2024-001',
    'cxp33333-3333-3333-3333-333333333333',
    5600.00,
    'transferencia',
    'SPEI-987654321',
    '012345678901234567',
    '234567890123456789',
    'BBVA',
    'Santander',
    NOW() - INTERVAL '6 days',
    '11111111-1111-1111-1111-111111111111',
    'ejecutado',
    true,
    (SELECT id FROM users WHERE role = 'accountant' LIMIT 1)
);


-- ============================================================================
-- 8. REEMBOLSOS
-- ============================================================================

-- Reembolso pendiente autorización
INSERT INTO reembolsos_por_pagar (
    id, folio, trip_id, customer_id, sucursal_id,
    monto_reembolso, monto_retenido, porcentaje_reembolsado,
    fecha_solicitud, fecha_vencimiento,
    status, motivo_reembolso, politica_aplicada, prioridad
) VALUES (
    'rem11111-1111-1111-1111-111111111111',
    'REM-CANCUN-2024-001',
    (SELECT trip_id FROM trips WHERE status = 'cancelled' LIMIT 1),
    (SELECT customer_id FROM trips WHERE status = 'cancelled' LIMIT 1),
    '11111111-1111-1111-1111-111111111111',
    7500.00,
    2500.00,
    75.00,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '9 days',
    'pendiente_autorizacion',
    'Cliente canceló por emergencia familiar',
    '75% - Cancelación con 10 días de anticipación',
    'normal'
);

-- Reembolso autorizado
INSERT INTO reembolsos_por_pagar (
    id, folio, trip_id, customer_id, sucursal_id,
    monto_reembolso, monto_retenido, porcentaje_reembolsado,
    fecha_solicitud, fecha_vencimiento, fecha_autorizacion,
    status, motivo_reembolso, politica_aplicada, prioridad,
    autorizado_por, comentario_autorizacion
) VALUES (
    'rem22222-2222-2222-2222-222222222222',
    'REM-CDMX-2024-001',
    (SELECT trip_id FROM trips WHERE status = 'cancelled' LIMIT 1 OFFSET 1),
    (SELECT customer_id FROM trips WHERE status = 'cancelled' LIMIT 1 OFFSET 1),
    '22222222-2222-2222-2222-222222222222',
    9000.00,
    1000.00,
    90.00,
    NOW() - INTERVAL '3 days',
    NOW() + INTERVAL '7 days',
    NOW() - INTERVAL '2 days',
    'autorizado',
    'Cliente canceló con 20 días de anticipación',
    '90% - Cancelación con 14-29 días de anticipación',
    'normal',
    (SELECT id FROM users WHERE role = 'manager' LIMIT 1),
    'Política aplicada correctamente. Proceder con reembolso.'
);


-- ============================================================================
-- 9. COMISIONES
-- ============================================================================

-- Comisión a vendedor
INSERT INTO comisiones_por_pagar (
    id, folio, trip_id, beneficiario_id, beneficiario_tipo,
    sucursal_id, monto_base, porcentaje_comision, monto_comision,
    fecha_generacion, fecha_vencimiento, status, concepto
) VALUES (
    'com11111-1111-1111-1111-111111111111',
    'COM-CANCUN-2024-001',
    (SELECT trip_id FROM trips WHERE status = 'completed' LIMIT 1),
    (SELECT id FROM users WHERE role = 'agent' LIMIT 1),
    'vendedor',
    '11111111-1111-1111-1111-111111111111',
    15000.00,
    5.00,
    750.00,
    NOW() - INTERVAL '5 days',
    NOW() + INTERVAL '25 days',
    'pendiente',
    'Comisión venta directa tour completado'
);

-- Comisión a guía
INSERT INTO comisiones_por_pagar (
    id, folio, trip_id, beneficiario_id, beneficiario_tipo,
    sucursal_id, monto_base, porcentaje_comision, monto_comision,
    fecha_generacion, fecha_vencimiento, status, concepto
) VALUES (
    'com22222-2222-2222-2222-222222222222',
    'COM-CANCUN-2024-002',
    (SELECT trip_id FROM trips WHERE status = 'completed' LIMIT 1),
    (SELECT guide_id FROM trips WHERE status = 'completed' AND guide_id IS NOT NULL LIMIT 1),
    'guia',
    '11111111-1111-1111-1111-111111111111',
    15000.00,
    3.00,
    450.00,
    NOW() - INTERVAL '5 days',
    NOW() + INTERVAL '10 days',
    'pendiente',
    'Comisión guía tour completado'
);


-- ============================================================================
-- 10. MOVIMIENTOS CAJA
-- ============================================================================

-- Apertura de caja
INSERT INTO movimientos_caja (
    id, folio, sucursal_id, fecha, turno, tipo,
    monto, concepto, cajero_id
) VALUES (
    'mcaj1111-1111-1111-1111-111111111111',
    'CAJA-CANCUN-2024-001-APERTURA',
    '11111111-1111-1111-1111-111111111111',
    CURRENT_DATE + INTERVAL '8 hours',
    'matutino',
    'apertura',
    5000.00,
    'Apertura de caja turno matutino',
    (SELECT id FROM users WHERE role = 'agent' LIMIT 1)
);

-- Ingreso efectivo
INSERT INTO movimientos_caja (
    id, folio, sucursal_id, fecha, turno, tipo,
    monto, concepto, categoria, folio_relacionado, cajero_id
) VALUES (
    'mcaj2222-2222-2222-2222-222222222222',
    'CAJA-CANCUN-2024-002',
    '11111111-1111-1111-1111-111111111111',
    NOW(),
    'matutino',
    'ingreso',
    3500.00,
    'Pago cliente efectivo',
    'ventas',
    'PAG-IN-CANCUN-2024-010',
    (SELECT id FROM users WHERE role = 'agent' LIMIT 1)
);


-- ============================================================================
-- 11. CORTES DE CAJA
-- ============================================================================

INSERT INTO cortes_caja (
    id, folio, sucursal_id, fecha, turno,
    saldo_inicial, total_ingresos, total_egresos, saldo_contado,
    num_transacciones, denominaciones,
    cajero_id, aprobado
) VALUES (
    'corte111-1111-1111-1111-111111111111',
    'CORTE-CANCUN-2024-001',
    '11111111-1111-1111-1111-111111111111',
    CURRENT_DATE - INTERVAL '1 day',
    'matutino',
    5000.00,
    12500.00,
    3000.00,
    14500.00,
    18,
    '{"billetes_1000": 8, "billetes_500": 9, "billetes_200": 5, "billetes_100": 5, "billetes_50": 0, "monedas_20": 0, "monedas_10": 0, "monedas_5": 0, "monedas_2": 0, "monedas_1": 0}'::jsonb,
    (SELECT id FROM users WHERE role = 'agent' LIMIT 1),
    true
);


-- ============================================================================
-- 12. CONCILIACIONES BANCARIAS
-- ============================================================================

-- Conciliación sin diferencias
INSERT INTO conciliaciones_bancarias (
    id, folio, sucursal_id, fecha,
    saldo_inicial, saldo_final,
    total_ingresos_sistema, total_egresos_sistema,
    total_ingresos_banco, total_egresos_banco,
    num_movimientos_sistema, num_movimientos_banco,
    conciliado, conciliado_por, fecha_conciliacion
) VALUES (
    'conc1111-1111-1111-1111-111111111111',
    'CONC-CANCUN-2024-001',
    '11111111-1111-1111-1111-111111111111',
    CURRENT_DATE - INTERVAL '1 day',
    125000.00,
    133500.00,
    26000.00,
    17500.00,
    26000.00,
    17500.00,
    12,
    12,
    true,
    (SELECT id FROM users WHERE role = 'accountant' LIMIT 1),
    NOW() - INTERVAL '12 hours'
);

-- Conciliación con diferencias
INSERT INTO conciliaciones_bancarias (
    id, folio, sucursal_id, fecha,
    saldo_inicial, saldo_final,
    total_ingresos_sistema, total_egresos_sistema,
    total_ingresos_banco, total_egresos_banco,
    num_movimientos_sistema, num_movimientos_banco,
    conciliado
) VALUES (
    'conc2222-2222-2222-2222-222222222222',
    'CONC-CDMX-2024-001',
    '22222222-2222-2222-2222-222222222222',
    CURRENT_DATE,
    98000.00,
    103500.00,
    18000.00,
    12500.00,
    16500.00,
    12500.00,
    10,
    9,
    false
);


-- ============================================================================
-- 13. ALERTAS SISTEMA
-- ============================================================================

-- Alerta de descuadre
INSERT INTO alertas_sistema (
    id, tipo, gravedad, titulo, mensaje,
    entidad_afectada, entidad_tipo,
    destinatario_role, sucursal_id,
    leida, resuelta
) VALUES (
    'alert111-1111-1111-1111-111111111111',
    'descuadre_conciliacion',
    'alta',
    '⚠️ Descuadre en Conciliación Bancaria',
    'La conciliación de CDMX del día de hoy tiene una diferencia de $1,500 en ingresos. Requiere investigación inmediata.',
    'conc2222-2222-2222-2222-222222222222',
    'conciliacion_bancaria',
    'gerente',
    '22222222-2222-2222-2222-222222222222',
    false,
    false
);

-- Alerta de CXC vencida
INSERT INTO alertas_sistema (
    id, tipo, gravedad, titulo, mensaje,
    entidad_afectada, entidad_tipo,
    destinatario_role, sucursal_id,
    leida, resuelta
) VALUES (
    'alert222-2222-2222-2222-222222222222',
    'cxc_vencida',
    'media',
    '🔴 Cuenta por Cobrar Vencida',
    'CXC-CDMX-2024-001 está vencida por 5 días. Monto pendiente: $6,500. Contactar cliente inmediatamente.',
    'cxc44444-4444-4444-4444-444444444444',
    'cuenta_por_cobrar',
    'gerente',
    '22222222-2222-2222-2222-222222222222',
    false,
    false
);

-- Alerta de reembolso pendiente autorización
INSERT INTO alertas_sistema (
    id, tipo, gravedad, titulo, mensaje,
    entidad_afectada, entidad_tipo,
    destinatario_role, sucursal_id,
    leida, resuelta
) VALUES (
    'alert333-3333-3333-3333-333333333333',
    'reembolso_pendiente',
    'media',
    '🟡 Reembolso Pendiente Autorización',
    'REM-CANCUN-2024-001 requiere autorización. Monto: $7,500 (75% de reembolso). Cliente canceló por emergencia familiar.',
    'rem11111-1111-1111-1111-111111111111',
    'reembolso',
    'gerente',
    '11111111-1111-1111-1111-111111111111',
    false,
    false
);


-- ============================================================================
-- 14. MOVIMIENTOS CONTABLES (Ejemplos)
-- ============================================================================

-- Movimiento: Ingreso por venta
INSERT INTO movimientos_contables (
    id, folio, sucursal_id, fecha,
    tipo, categoria, cuenta, subcuenta,
    debe, haber,
    referencia_tipo, referencia_id, referencia_folio,
    concepto
) VALUES (
    'mov11111-1111-1111-1111-111111111111',
    'MOV-CANCUN-2024-001',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '5 days',
    'ingreso',
    'ventas_tours',
    'bancos',
    'bbva_cuenta_principal',
    15000.00,
    0.00,
    'pago_recibido',
    'pr222222-2222-2222-2222-222222222222',
    'PAG-IN-CANCUN-2024-002',
    'Ingreso por pago tour Tulum (pago 1 de 2)'
);

INSERT INTO movimientos_contables (
    id, folio, sucursal_id, fecha,
    tipo, categoria, cuenta, subcuenta,
    debe, haber,
    referencia_tipo, referencia_id, referencia_folio,
    concepto
) VALUES (
    'mov22222-2222-2222-2222-222222222222',
    'MOV-CANCUN-2024-002',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '5 days',
    'ingreso',
    'ventas_tours',
    'ingresos',
    'venta_tours',
    0.00,
    15000.00,
    'pago_recibido',
    'pr222222-2222-2222-2222-222222222222',
    'PAG-IN-CANCUN-2024-002',
    'Ingreso registrado en ventas'
);

-- Movimiento: Egreso pago a proveedor
INSERT INTO movimientos_contables (
    id, folio, sucursal_id, fecha,
    tipo, categoria, cuenta, subcuenta,
    debe, haber,
    referencia_tipo, referencia_id, referencia_folio,
    concepto
) VALUES (
    'mov33333-3333-3333-3333-333333333333',
    'MOV-CANCUN-2024-003',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '6 days',
    'egreso',
    'costos_tours',
    'costos_directos',
    'operadores',
    5600.00,
    0.00,
    'pago_realizado',
    'prz11111-1111-1111-1111-111111111111',
    'PAG-OUT-CANCUN-2024-001',
    'Costo directo operador Xcaret'
);

INSERT INTO movimientos_contables (
    id, folio, sucursal_id, fecha,
    tipo, categoria, cuenta, subcuenta,
    debe, haber,
    referencia_tipo, referencia_id, referencia_folio,
    concepto
) VALUES (
    'mov44444-4444-4444-4444-444444444444',
    'MOV-CANCUN-2024-004',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '6 days',
    'egreso',
    'costos_tours',
    'bancos',
    'bbva_cuenta_principal',
    0.00,
    5600.00,
    'pago_realizado',
    'prz11111-1111-1111-1111-111111111111',
    'PAG-OUT-CANCUN-2024-001',
    'Salida de banco por pago a operador'
);


-- ============================================================================
-- 15. AUDITORÍA (Ejemplos de registros)
-- ============================================================================

INSERT INTO auditoria_financiera (
    id, tabla_afectada, registro_id, accion,
    usuario_id, usuario_nombre, usuario_role,
    sucursal_id, ip_address,
    datos_anteriores, datos_nuevos,
    comentario
) VALUES (
    'audit111-1111-1111-1111-111111111111',
    'cuentas_por_pagar',
    'cxp22222-2222-2222-2222-222222222222',
    'autorizacion',
    (SELECT id FROM users WHERE role = 'manager' LIMIT 1),
    'Carlos Méndez',
    'manager',
    '11111111-1111-1111-1111-111111111111',
    '192.168.1.100',
    '{"status": "pendiente"}'::jsonb,
    '{"status": "autorizado", "autorizado_por": "manager-uuid", "fecha_autorizacion": "2024-10-20T10:30:00Z"}'::jsonb,
    'CXP autorizada por gerente - Factura verificada contra contrato'
);

INSERT INTO auditoria_financiera (
    id, tabla_afectada, registro_id, accion,
    usuario_id, usuario_nombre, usuario_role,
    sucursal_id, ip_address,
    datos_anteriores, datos_nuevos,
    comentario
) VALUES (
    'audit222-2222-2222-2222-222222222222',
    'pagos_realizados',
    'prz11111-1111-1111-1111-111111111111',
    'insert',
    (SELECT id FROM users WHERE role = 'accountant' LIMIT 1),
    'María González',
    'accountant',
    '11111111-1111-1111-1111-111111111111',
    '192.168.1.105',
    NULL,
    '{"folio": "PAG-OUT-CANCUN-2024-001", "monto": 5600.00, "metodo_pago": "transferencia", "referencia": "SPEI-987654321"}'::jsonb,
    'Pago ejecutado a proveedor Xcaret Operador'
);


-- ============================================================================
-- FIN SEED DATA
-- ============================================================================

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Seed data de contabilidad insertado exitosamente';
    RAISE NOTICE '📊 Sucursales: 3 (Cancún, CDMX, Guadalajara)';
    RAISE NOTICE '🏢 Proveedores: 5';
    RAISE NOTICE '💰 CXC: 4 (pendiente, parcial, cobrado, vencido)';
    RAISE NOTICE '💸 CXP: 3 (pendiente, autorizado, pagado)';
    RAISE NOTICE '🔄 Reembolsos: 2 (pendiente, autorizado)';
    RAISE NOTICE '💵 Comisiones: 2';
    RAISE NOTICE '🏦 Conciliaciones: 2 (con y sin diferencias)';
    RAISE NOTICE '🚨 Alertas: 3 activas';
    RAISE NOTICE '📖 Movimientos contables: 4';
    RAISE NOTICE '🔍 Registros auditoría: 2';
END $$;
