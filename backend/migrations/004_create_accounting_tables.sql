-- ============================================================================
-- MIGRATION 004: Sistema de Contabilidad Multi-Sucursal
-- Descripción: Tablas para control completo de cobros, pagos y reembolsos
-- Fecha: 2024-10-25
-- Autor: Spirit Tours Dev Team
-- ============================================================================

-- ============================================================================
-- TABLA 1: SUCURSALES (Catálogo de sucursales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    direccion TEXT,
    ciudad VARCHAR(100),
    estado VARCHAR(100),
    pais VARCHAR(100) DEFAULT 'México',
    telefono VARCHAR(50),
    email VARCHAR(100),
    
    -- Información bancaria
    banco VARCHAR(100),
    cuenta_bancaria VARCHAR(50),
    clabe VARCHAR(18),
    
    -- Status
    activa BOOLEAN DEFAULT true,
    es_matriz BOOLEAN DEFAULT false,
    
    -- Configuración
    moneda VARCHAR(3) DEFAULT 'MXN',
    timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
    
    -- Límites financieros
    limite_autorizacion_gerente NUMERIC(10, 2) DEFAULT 20000.00,
    limite_autorizacion_director NUMERIC(10, 2) DEFAULT 50000.00,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_clabe CHECK (LENGTH(clabe) = 18 OR clabe IS NULL)
);

-- Índices
CREATE INDEX idx_sucursales_codigo ON sucursales(codigo);
CREATE INDEX idx_sucursales_activa ON sucursales(activa);

-- Comentarios
COMMENT ON TABLE sucursales IS 'Catálogo de sucursales de Spirit Tours';
COMMENT ON COLUMN sucursales.codigo IS 'Código único de sucursal (ej: CANCUN, CDMX, GDL)';
COMMENT ON COLUMN sucursales.es_matriz IS 'Indica si es la sucursal corporativa';


-- ============================================================================
-- TABLA 2: CUENTAS POR COBRAR (CXC)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cuentas_por_cobrar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio VARCHAR(50) UNIQUE NOT NULL,
    
    -- Referencias
    trip_id UUID REFERENCES trips(trip_id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE RESTRICT,
    
    -- En caso de CXC a proveedor (recuperación)
    proveedor_id UUID REFERENCES proveedores(id) ON DELETE RESTRICT,
    sucursal_origen UUID REFERENCES sucursales(id) ON DELETE RESTRICT,
    tipo VARCHAR(30) DEFAULT 'cliente', -- 'cliente', 'proveedor', 'transferencia_interna'
    
    -- Montos
    monto_total NUMERIC(10, 2) NOT NULL,
    monto_pagado NUMERIC(10, 2) DEFAULT 0.00,
    monto_pendiente NUMERIC(10, 2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'MXN',
    
    -- Fechas
    fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL,
    ultimo_pago TIMESTAMP WITH TIME ZONE,
    fecha_cobro_total TIMESTAMP WITH TIME ZONE,
    fecha_cancelacion TIMESTAMP WITH TIME ZONE,
    
    -- Estados: pendiente, parcial, cobrado, vencido, incobrable, cancelada
    status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    
    -- Tracking
    dias_vencido INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN status IN ('vencido', 'incobrable') 
            THEN EXTRACT(DAY FROM (NOW() - fecha_vencimiento))
            ELSE 0 
        END
    ) STORED,
    
    -- Notas
    concepto TEXT,
    nota_cancelacion TEXT,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_status_cxc CHECK (
        status IN ('pendiente', 'parcial', 'cobrado', 'vencido', 'incobrable', 'cancelada')
    ),
    CONSTRAINT valid_montos_cxc CHECK (
        monto_total >= 0 AND 
        monto_pagado >= 0 AND 
        monto_pendiente >= 0 AND
        monto_pagado + monto_pendiente = monto_total
    ),
    CONSTRAINT valid_tipo_cxc CHECK (
        tipo IN ('cliente', 'proveedor', 'transferencia_interna')
    )
);

-- Índices
CREATE INDEX idx_cxc_folio ON cuentas_por_cobrar(folio);
CREATE INDEX idx_cxc_trip ON cuentas_por_cobrar(trip_id);
CREATE INDEX idx_cxc_customer ON cuentas_por_cobrar(customer_id);
CREATE INDEX idx_cxc_sucursal ON cuentas_por_cobrar(sucursal_id);
CREATE INDEX idx_cxc_status ON cuentas_por_cobrar(status);
CREATE INDEX idx_cxc_vencimiento ON cuentas_por_cobrar(fecha_vencimiento);
CREATE INDEX idx_cxc_pendiente ON cuentas_por_cobrar(monto_pendiente) WHERE monto_pendiente > 0;

-- Comentarios
COMMENT ON TABLE cuentas_por_cobrar IS 'Registro de todas las cuentas por cobrar';
COMMENT ON COLUMN cuentas_por_cobrar.tipo IS 'Tipo de CXC: cliente (normal), proveedor (recuperación), transferencia_interna';


-- ============================================================================
-- TABLA 3: PAGOS RECIBIDOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS pagos_recibidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio VARCHAR(50) UNIQUE NOT NULL,
    
    -- Referencia a CXC
    cxc_id UUID NOT NULL REFERENCES cuentas_por_cobrar(id) ON DELETE RESTRICT,
    
    -- Monto
    monto NUMERIC(10, 2) NOT NULL,
    monto_recibido NUMERIC(10, 2), -- Puede ser diferente por comisiones bancarias
    comision_bancaria NUMERIC(10, 2) DEFAULT 0.00,
    moneda VARCHAR(3) DEFAULT 'MXN',
    
    -- Método de pago
    metodo_pago VARCHAR(30) NOT NULL, -- efectivo, transferencia, tarjeta_credito, tarjeta_debito, cheque
    referencia VARCHAR(100), -- Número de referencia bancaria
    banco VARCHAR(100),
    cuenta_origen VARCHAR(50),
    gateway VARCHAR(50), -- stripe, paypal, etc.
    
    -- Fechas
    fecha_pago TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Comprobantes
    comprobante_url TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'aplicado', -- aplicado, cancelado, pendiente_conciliar
    conciliado BOOLEAN DEFAULT false,
    fecha_conciliacion TIMESTAMP WITH TIME ZONE,
    
    -- Si es efectivo
    turno_caja VARCHAR(50),
    
    -- Tipo de pago (para multi-sucursal)
    tipo VARCHAR(30) DEFAULT 'normal', -- normal, inter_sucursal
    
    -- Cancelación
    cancelado_por UUID REFERENCES users(id),
    fecha_cancelacion TIMESTAMP WITH TIME ZONE,
    motivo_cancelacion TEXT,
    
    -- Metadata
    sucursal_id UUID NOT NULL REFERENCES sucursales(id),
    recibido_por UUID REFERENCES users(id),
    registrado_automatico BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_monto_pago CHECK (monto > 0),
    CONSTRAINT valid_status_pago CHECK (
        status IN ('aplicado', 'cancelado', 'pendiente_conciliar')
    ),
    CONSTRAINT valid_metodo_pago CHECK (
        metodo_pago IN ('efectivo', 'transferencia', 'tarjeta_credito', 'tarjeta_debito', 'cheque', 'transferencia_interna')
    )
);

-- Índices
CREATE INDEX idx_pago_recibido_folio ON pagos_recibidos(folio);
CREATE INDEX idx_pago_recibido_cxc ON pagos_recibidos(cxc_id);
CREATE INDEX idx_pago_recibido_fecha ON pagos_recibidos(fecha_pago);
CREATE INDEX idx_pago_recibido_metodo ON pagos_recibidos(metodo_pago);
CREATE INDEX idx_pago_recibido_sucursal ON pagos_recibidos(sucursal_id);
CREATE INDEX idx_pago_recibido_status ON pagos_recibidos(status);
CREATE INDEX idx_pago_recibido_conciliado ON pagos_recibidos(conciliado) WHERE conciliado = false;

-- Constraint único para prevenir duplicados
CREATE UNIQUE INDEX idx_pago_unico ON pagos_recibidos(
    metodo_pago, referencia, monto, fecha_pago
) WHERE status = 'aplicado' AND referencia IS NOT NULL;

COMMENT ON TABLE pagos_recibidos IS 'Registro de todos los pagos recibidos de clientes';


-- ============================================================================
-- TABLA 4: PROVEEDORES (Catálogo)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    razon_social VARCHAR(200),
    rfc VARCHAR(20),
    
    -- Tipo
    tipo VARCHAR(50) NOT NULL, -- operador_turistico, hotel, transporte, restaurante, otro
    categoria VARCHAR(100),
    
    -- Contacto
    telefono VARCHAR(50),
    email VARCHAR(100),
    direccion TEXT,
    ciudad VARCHAR(100),
    estado VARCHAR(100),
    pais VARCHAR(100) DEFAULT 'México',
    
    -- Información bancaria
    banco VARCHAR(100),
    cuenta_bancaria VARCHAR(50),
    clabe VARCHAR(18),
    swift VARCHAR(20),
    
    -- Términos comerciales
    dias_credito INTEGER DEFAULT 15,
    descuento_pronto_pago NUMERIC(5, 2) DEFAULT 0.00,
    comision_porcentaje NUMERIC(5, 2) DEFAULT 0.00,
    
    -- Contacto de pagos
    contacto_pagos_nombre VARCHAR(100),
    contacto_pagos_email VARCHAR(100),
    contacto_pagos_telefono VARCHAR(50),
    
    -- Status
    activo BOOLEAN DEFAULT true,
    fecha_inicio_relacion DATE,
    calificacion NUMERIC(3, 2), -- 0.00 - 5.00
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_calificacion CHECK (calificacion >= 0 AND calificacion <= 5)
);

-- Índices
CREATE INDEX idx_proveedores_codigo ON proveedores(codigo);
CREATE INDEX idx_proveedores_nombre ON proveedores(nombre);
CREATE INDEX idx_proveedores_tipo ON proveedores(tipo);
CREATE INDEX idx_proveedores_activo ON proveedores(activo);

COMMENT ON TABLE proveedores IS 'Catálogo de proveedores y operadores turísticos';


-- ============================================================================
-- TABLA 5: CUENTAS POR PAGAR (CXP)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cuentas_por_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio VARCHAR(50) UNIQUE NOT NULL,
    
    -- Referencias
    trip_id UUID REFERENCES trips(trip_id) ON DELETE RESTRICT,
    proveedor_id UUID REFERENCES proveedores(id) ON DELETE RESTRICT,
    sucursal_id UUID NOT NULL REFERENCES sucursales(id),
    
    -- Para transferencias inter-sucursales
    sucursal_destino UUID REFERENCES sucursales(id),
    tipo VARCHAR(30) DEFAULT 'proveedor', -- proveedor, transferencia_interna, gasto_operativo
    
    -- Montos
    monto_original NUMERIC(10, 2),
    descuento_porcentaje NUMERIC(5, 2) DEFAULT 0.00,
    descuento_monto NUMERIC(10, 2) DEFAULT 0.00,
    monto_total NUMERIC(10, 2) NOT NULL,
    monto_pagado NUMERIC(10, 2) DEFAULT 0.00,
    monto_pendiente NUMERIC(10, 2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'MXN',
    
    -- Fechas
    fecha_emision TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_pago TIMESTAMP WITH TIME ZONE,
    fecha_cancelacion TIMESTAMP WITH TIME ZONE,
    
    -- Estados: pendiente, pendiente_revision, autorizado, pagado, conciliado, cancelada, rechazada
    status VARCHAR(30) NOT NULL DEFAULT 'pendiente',
    
    -- Autorización
    requiere_autorizacion BOOLEAN DEFAULT true,
    autorizado_por UUID REFERENCES users(id),
    fecha_autorizacion TIMESTAMP WITH TIME ZONE,
    comentario_autorizacion TEXT,
    
    -- Facturación
    factura_numero VARCHAR(100),
    factura_url TEXT,
    
    -- Descripción
    concepto TEXT NOT NULL,
    motivo_descuento TEXT,
    nota TEXT,
    
    -- Cancelación
    cancelado_por UUID REFERENCES users(id),
    motivo_cancelacion TEXT,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_status_cxp CHECK (
        status IN ('pendiente', 'pendiente_revision', 'autorizado', 'pagado', 'conciliado', 'cancelada', 'rechazada')
    ),
    CONSTRAINT valid_montos_cxp CHECK (
        monto_total >= 0 AND 
        monto_pagado >= 0 AND 
        monto_pendiente >= 0 AND
        monto_pagado + monto_pendiente = monto_total
    ),
    CONSTRAINT valid_tipo_cxp CHECK (
        tipo IN ('proveedor', 'transferencia_interna', 'gasto_operativo', 'comision', 'reembolso')
    )
);

-- Índices
CREATE INDEX idx_cxp_folio ON cuentas_por_pagar(folio);
CREATE INDEX idx_cxp_trip ON cuentas_por_pagar(trip_id);
CREATE INDEX idx_cxp_proveedor ON cuentas_por_pagar(proveedor_id);
CREATE INDEX idx_cxp_sucursal ON cuentas_por_pagar(sucursal_id);
CREATE INDEX idx_cxp_status ON cuentas_por_pagar(status);
CREATE INDEX idx_cxp_vencimiento ON cuentas_por_pagar(fecha_vencimiento);
CREATE INDEX idx_cxp_pendiente ON cuentas_por_pagar(monto_pendiente) WHERE monto_pendiente > 0;
CREATE INDEX idx_cxp_autorizacion ON cuentas_por_pagar(requiere_autorizacion) WHERE requiere_autorizacion = true AND status = 'pendiente';

COMMENT ON TABLE cuentas_por_pagar IS 'Registro de todas las cuentas por pagar';


-- ============================================================================
-- TABLA 6: PAGOS REALIZADOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS pagos_realizados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio VARCHAR(50) UNIQUE NOT NULL,
    
    -- Referencia a CXP
    cxp_id UUID NOT NULL REFERENCES cuentas_por_pagar(id) ON DELETE RESTRICT,
    
    -- Monto
    monto NUMERIC(10, 2) NOT NULL,
    comision_bancaria NUMERIC(10, 2) DEFAULT 0.00,
    moneda VARCHAR(3) DEFAULT 'MXN',
    
    -- Método de pago
    metodo_pago VARCHAR(30) NOT NULL,
    referencia VARCHAR(100),
    cuenta_origen VARCHAR(50),
    cuenta_destino VARCHAR(50),
    banco_origen VARCHAR(100),
    banco_destino VARCHAR(100),
    
    -- Fechas
    fecha_pago TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Comprobantes
    comprobante_url TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'ejecutado',
    conciliado BOOLEAN DEFAULT false,
    fecha_conciliacion TIMESTAMP WITH TIME ZONE,
    estado_cuenta_ref VARCHAR(100),
    
    -- Tipo (para multi-sucursal)
    tipo VARCHAR(30) DEFAULT 'normal', -- normal, inter_sucursal
    
    -- Metadata
    sucursal_id UUID NOT NULL REFERENCES sucursales(id),
    ejecutado_por UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_monto_pago_realizado CHECK (monto > 0),
    CONSTRAINT valid_status_pago_realizado CHECK (
        status IN ('ejecutado', 'cancelado', 'error', 'pendiente_conciliar')
    )
);

-- Índices
CREATE INDEX idx_pago_realizado_folio ON pagos_realizados(folio);
CREATE INDEX idx_pago_realizado_cxp ON pagos_realizados(cxp_id);
CREATE INDEX idx_pago_realizado_fecha ON pagos_realizados(fecha_pago);
CREATE INDEX idx_pago_realizado_sucursal ON pagos_realizados(sucursal_id);
CREATE INDEX idx_pago_realizado_conciliado ON pagos_realizados(conciliado) WHERE conciliado = false;

COMMENT ON TABLE pagos_realizados IS 'Registro de todos los pagos realizados a proveedores';


-- ============================================================================
-- TABLA 7: REEMBOLSOS POR PAGAR
-- ============================================================================

CREATE TABLE IF NOT EXISTS reembolsos_por_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio VARCHAR(50) UNIQUE NOT NULL,
    
    -- Referencias
    trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    sucursal_id UUID NOT NULL REFERENCES sucursales(id),
    
    -- Montos
    monto_reembolso NUMERIC(10, 2) NOT NULL,
    monto_retenido NUMERIC(10, 2) NOT NULL,
    porcentaje_reembolsado NUMERIC(5, 2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'MXN',
    
    -- Fechas
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_reembolso TIMESTAMP WITH TIME ZONE,
    
    -- Estados: pendiente_autorizacion, autorizado, procesando, reembolsado, rechazado, cancelado
    status VARCHAR(30) NOT NULL DEFAULT 'pendiente_autorizacion',
    
    -- Autorización
    autorizado_por UUID REFERENCES users(id),
    fecha_autorizacion TIMESTAMP WITH TIME ZONE,
    comentario_autorizacion TEXT,
    
    -- Ejecución
    ejecutado_por UUID REFERENCES users(id),
    
    -- Método de reembolso
    metodo_reembolso VARCHAR(30), -- transferencia, tarjeta_credito (reversa), cheque
    cuenta_destino VARCHAR(50),
    banco_destino VARCHAR(100),
    referencia VARCHAR(100),
    comprobante_url TEXT,
    
    -- Metadata
    motivo_reembolso TEXT,
    politica_aplicada VARCHAR(100),
    prioridad VARCHAR(20) DEFAULT 'normal', -- normal, urgente, critica
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status_reembolso CHECK (
        status IN ('pendiente_autorizacion', 'autorizado', 'procesando', 'reembolsado', 'rechazado', 'cancelado')
    ),
    CONSTRAINT valid_montos_reembolso CHECK (
        monto_reembolso >= 0 AND monto_retenido >= 0
    ),
    CONSTRAINT valid_prioridad CHECK (
        prioridad IN ('normal', 'urgente', 'critica')
    )
);

-- Índices
CREATE INDEX idx_reembolso_folio ON reembolsos_por_pagar(folio);
CREATE INDEX idx_reembolso_trip ON reembolsos_por_pagar(trip_id);
CREATE INDEX idx_reembolso_customer ON reembolsos_por_pagar(customer_id);
CREATE INDEX idx_reembolso_sucursal ON reembolsos_por_pagar(sucursal_id);
CREATE INDEX idx_reembolso_status ON reembolsos_por_pagar(status);
CREATE INDEX idx_reembolso_pendientes ON reembolsos_por_pagar(status, prioridad) 
    WHERE status IN ('pendiente_autorizacion', 'autorizado');

COMMENT ON TABLE reembolsos_por_pagar IS 'Registro de todos los reembolsos a clientes';


-- ============================================================================
-- TABLA 8: COMISIONES POR PAGAR
-- ============================================================================

CREATE TABLE IF NOT EXISTS comisiones_por_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio VARCHAR(50) UNIQUE NOT NULL,
    
    -- Referencias
    trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE RESTRICT,
    beneficiario_id UUID NOT NULL, -- Puede ser agencia, guía, vendedor
    beneficiario_tipo VARCHAR(30) NOT NULL, -- agencia, guia, vendedor, sucursal
    sucursal_id UUID NOT NULL REFERENCES sucursales(id),
    
    -- Montos
    monto_base NUMERIC(10, 2) NOT NULL, -- Monto sobre el que se calcula
    porcentaje_comision NUMERIC(5, 2) NOT NULL,
    monto_comision NUMERIC(10, 2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'MXN',
    
    -- Fechas
    fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_pago TIMESTAMP WITH TIME ZONE,
    
    -- Estados: pendiente, autorizada, pagada, cancelada
    status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    
    -- Pago
    metodo_pago VARCHAR(30),
    referencia_pago VARCHAR(100),
    
    -- Metadata
    concepto TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status_comision CHECK (
        status IN ('pendiente', 'autorizada', 'pagada', 'cancelada')
    ),
    CONSTRAINT valid_beneficiario_tipo CHECK (
        beneficiario_tipo IN ('agencia', 'guia', 'vendedor', 'sucursal')
    )
);

-- Índices
CREATE INDEX idx_comision_folio ON comisiones_por_pagar(folio);
CREATE INDEX idx_comision_trip ON comisiones_por_pagar(trip_id);
CREATE INDEX idx_comision_beneficiario ON comisiones_por_pagar(beneficiario_id, beneficiario_tipo);
CREATE INDEX idx_comision_sucursal ON comisiones_por_pagar(sucursal_id);
CREATE INDEX idx_comision_status ON comisiones_por_pagar(status);

COMMENT ON TABLE comisiones_por_pagar IS 'Registro de comisiones a pagar a agencias, guías y vendedores';


-- ============================================================================
-- TABLA 9: MOVIMIENTOS CONTABLES (Libro Mayor)
-- ============================================================================

CREATE TABLE IF NOT EXISTS movimientos_contables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio VARCHAR(50) UNIQUE NOT NULL,
    
    -- Referencia
    sucursal_id UUID NOT NULL REFERENCES sucursales(id),
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Tipo
    tipo VARCHAR(30) NOT NULL, -- ingreso, egreso, transferencia, ajuste
    categoria VARCHAR(50) NOT NULL, -- ventas_tours, costos_tours, gastos_operativos, etc.
    
    -- Cuentas contables
    cuenta VARCHAR(50) NOT NULL,
    subcuenta VARCHAR(50),
    
    -- Montos (doble entrada)
    debe NUMERIC(12, 2) DEFAULT 0.00,
    haber NUMERIC(12, 2) DEFAULT 0.00,
    
    -- Referencias a otras tablas
    referencia_tipo VARCHAR(50), -- cxc, cxp, pago_recibido, pago_realizado, reembolso
    referencia_id UUID,
    referencia_folio VARCHAR(50),
    
    -- Descripción
    concepto TEXT NOT NULL,
    notas TEXT,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_tipo_movimiento CHECK (
        tipo IN ('ingreso', 'egreso', 'transferencia', 'ajuste')
    ),
    CONSTRAINT valid_doble_entrada CHECK (
        (debe > 0 AND haber = 0) OR (debe = 0 AND haber > 0)
    )
);

-- Índices
CREATE INDEX idx_movimiento_folio ON movimientos_contables(folio);
CREATE INDEX idx_movimiento_sucursal ON movimientos_contables(sucursal_id);
CREATE INDEX idx_movimiento_fecha ON movimientos_contables(fecha);
CREATE INDEX idx_movimiento_tipo ON movimientos_contables(tipo);
CREATE INDEX idx_movimiento_categoria ON movimientos_contables(categoria);
CREATE INDEX idx_movimiento_cuenta ON movimientos_contables(cuenta);
CREATE INDEX idx_movimiento_referencia ON movimientos_contables(referencia_tipo, referencia_id);

COMMENT ON TABLE movimientos_contables IS 'Libro mayor contable - Registro de todos los movimientos financieros';


-- ============================================================================
-- TABLA 10: CONCILIACIONES BANCARIAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS conciliaciones_bancarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio VARCHAR(50) UNIQUE NOT NULL,
    
    -- Referencia
    sucursal_id UUID NOT NULL REFERENCES sucursales(id),
    fecha DATE NOT NULL,
    
    -- Saldos
    saldo_inicial NUMERIC(12, 2) NOT NULL,
    saldo_final NUMERIC(12, 2) NOT NULL,
    
    -- Movimientos del día
    total_ingresos_sistema NUMERIC(12, 2) DEFAULT 0.00,
    total_egresos_sistema NUMERIC(12, 2) DEFAULT 0.00,
    total_ingresos_banco NUMERIC(12, 2) DEFAULT 0.00,
    total_egresos_banco NUMERIC(12, 2) DEFAULT 0.00,
    
    -- Diferencias
    diferencia_ingresos NUMERIC(12, 2) GENERATED ALWAYS AS (
        total_ingresos_sistema - total_ingresos_banco
    ) STORED,
    diferencia_egresos NUMERIC(12, 2) GENERATED ALWAYS AS (
        total_egresos_sistema - total_egresos_banco
    ) STORED,
    
    -- Status
    conciliado BOOLEAN DEFAULT false,
    tiene_diferencias BOOLEAN GENERATED ALWAYS AS (
        ABS(total_ingresos_sistema - total_ingresos_banco) > 0.01 OR
        ABS(total_egresos_sistema - total_egresos_banco) > 0.01
    ) STORED,
    
    -- Detalles
    num_movimientos_sistema INTEGER DEFAULT 0,
    num_movimientos_banco INTEGER DEFAULT 0,
    
    -- Resolución de diferencias
    diferencias_resueltas BOOLEAN DEFAULT false,
    resolucion_notas TEXT,
    resuelto_por UUID REFERENCES users(id),
    fecha_resolucion TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    conciliado_por UUID REFERENCES users(id),
    fecha_conciliacion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_conciliacion UNIQUE (sucursal_id, fecha)
);

-- Índices
CREATE INDEX idx_conciliacion_sucursal ON conciliaciones_bancarias(sucursal_id);
CREATE INDEX idx_conciliacion_fecha ON conciliaciones_bancarias(fecha);
CREATE INDEX idx_conciliacion_pendientes ON conciliaciones_bancarias(conciliado) WHERE conciliado = false;
CREATE INDEX idx_conciliacion_diferencias ON conciliaciones_bancarias(tiene_diferencias) WHERE tiene_diferencias = true;

COMMENT ON TABLE conciliaciones_bancarias IS 'Registro de conciliaciones bancarias diarias';


-- ============================================================================
-- TABLA 11: MOVIMIENTOS CAJA (Caja Chica)
-- ============================================================================

CREATE TABLE IF NOT EXISTS movimientos_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio VARCHAR(50) UNIQUE NOT NULL,
    
    -- Referencia
    sucursal_id UUID NOT NULL REFERENCES sucursales(id),
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    turno VARCHAR(50) NOT NULL, -- matutino, vespertino, nocturno
    
    -- Tipo
    tipo VARCHAR(20) NOT NULL, -- ingreso, egreso, apertura, cierre, deposito
    
    -- Monto
    monto NUMERIC(10, 2) NOT NULL,
    
    -- Descripción
    concepto TEXT NOT NULL,
    categoria VARCHAR(50),
    
    -- Referencias
    folio_relacionado VARCHAR(50),
    
    -- Denominaciones (para cierre de caja)
    denominaciones JSONB,
    
    -- Metadata
    cajero_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_tipo_movimiento_caja CHECK (
        tipo IN ('ingreso', 'egreso', 'apertura', 'cierre', 'deposito')
    )
);

-- Índices
CREATE INDEX idx_caja_sucursal ON movimientos_caja(sucursal_id);
CREATE INDEX idx_caja_fecha ON movimientos_caja(fecha);
CREATE INDEX idx_caja_turno ON movimientos_caja(turno);
CREATE INDEX idx_caja_cajero ON movimientos_caja(cajero_id);

COMMENT ON TABLE movimientos_caja IS 'Registro de movimientos de caja chica';


-- ============================================================================
-- TABLA 12: CORTES DE CAJA
-- ============================================================================

CREATE TABLE IF NOT EXISTS cortes_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio VARCHAR(50) UNIQUE NOT NULL,
    
    -- Referencia
    sucursal_id UUID NOT NULL REFERENCES sucursales(id),
    fecha DATE NOT NULL,
    turno VARCHAR(50) NOT NULL,
    
    -- Montos
    saldo_inicial NUMERIC(10, 2) NOT NULL,
    total_ingresos NUMERIC(10, 2) NOT NULL,
    total_egresos NUMERIC(10, 2) NOT NULL,
    saldo_esperado NUMERIC(10, 2) GENERATED ALWAYS AS (
        saldo_inicial + total_ingresos - total_egresos
    ) STORED,
    saldo_contado NUMERIC(10, 2) NOT NULL,
    diferencia NUMERIC(10, 2) GENERATED ALWAYS AS (
        saldo_contado - (saldo_inicial + total_ingresos - total_egresos)
    ) STORED,
    
    -- Detalles
    num_transacciones INTEGER DEFAULT 0,
    denominaciones JSONB NOT NULL, -- Detalle de billetes y monedas
    
    -- Status
    cuadrado BOOLEAN GENERATED ALWAYS AS (ABS(saldo_contado - (saldo_inicial + total_ingresos - total_egresos)) < 0.01) STORED,
    
    -- Supervisión
    cajero_id UUID NOT NULL REFERENCES users(id),
    supervisor_id UUID REFERENCES users(id),
    aprobado BOOLEAN DEFAULT false,
    fecha_aprobacion TIMESTAMP WITH TIME ZONE,
    
    -- Notas
    notas TEXT,
    explicacion_diferencia TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_corte UNIQUE (sucursal_id, fecha, turno)
);

-- Índices
CREATE INDEX idx_corte_sucursal ON cortes_caja(sucursal_id);
CREATE INDEX idx_corte_fecha ON cortes_caja(fecha);
CREATE INDEX idx_corte_cajero ON cortes_caja(cajero_id);
CREATE INDEX idx_corte_cuadrado ON cortes_caja(cuadrado);
CREATE INDEX idx_corte_diferencias ON cortes_caja(ABS(diferencia)) WHERE ABS(diferencia) > 0.01;

COMMENT ON TABLE cortes_caja IS 'Registro de cortes de caja diarios por turno';


-- ============================================================================
-- TABLA 13: AUDITORIA FINANCIERA
-- ============================================================================

CREATE TABLE IF NOT EXISTS auditoria_financiera (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Qué se modificó
    tabla_afectada VARCHAR(50) NOT NULL,
    registro_id UUID NOT NULL,
    accion VARCHAR(20) NOT NULL, -- insert, update, delete, autorizacion, cancelacion
    
    -- Quién lo hizo
    usuario_id UUID REFERENCES users(id),
    usuario_nombre VARCHAR(100),
    usuario_role VARCHAR(50),
    
    -- Cuándo y dónde
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sucursal_id UUID REFERENCES sucursales(id),
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    -- Qué cambió
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    
    -- Por qué
    comentario TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_auditoria_tabla ON auditoria_financiera(tabla_afectada);
CREATE INDEX idx_auditoria_registro ON auditoria_financiera(registro_id);
CREATE INDEX idx_auditoria_usuario ON auditoria_financiera(usuario_id);
CREATE INDEX idx_auditoria_timestamp ON auditoria_financiera(timestamp);
CREATE INDEX idx_auditoria_sucursal ON auditoria_financiera(sucursal_id);
CREATE INDEX idx_auditoria_accion ON auditoria_financiera(accion);

COMMENT ON TABLE auditoria_financiera IS 'Registro completo de auditoría de todos los cambios financieros';


-- ============================================================================
-- TABLA 14: ALERTAS SISTEMA
-- ============================================================================

CREATE TABLE IF NOT EXISTS alertas_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tipo de alerta
    tipo VARCHAR(50) NOT NULL, -- discrepancia_pago, descuadre_caja, pago_vencido, etc.
    gravedad VARCHAR(20) NOT NULL, -- baja, media, alta, critica
    
    -- Título y mensaje
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    
    -- Entidad afectada
    entidad_afectada UUID,
    entidad_tipo VARCHAR(50),
    
    -- Destinatarios
    destinatario_role VARCHAR(50), -- gerente, contador, director
    destinatario_usuario UUID REFERENCES users(id),
    
    -- Sucursal
    sucursal_id UUID REFERENCES sucursales(id),
    
    -- Status
    leida BOOLEAN DEFAULT false,
    fecha_leida TIMESTAMP WITH TIME ZONE,
    resuelta BOOLEAN DEFAULT false,
    fecha_resolucion TIMESTAMP WITH TIME ZONE,
    resuelto_por UUID REFERENCES users(id),
    notas_resolucion TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_gravedad CHECK (
        gravedad IN ('baja', 'media', 'alta', 'critica')
    )
);

-- Índices
CREATE INDEX idx_alerta_tipo ON alertas_sistema(tipo);
CREATE INDEX idx_alerta_gravedad ON alertas_sistema(gravedad);
CREATE INDEX idx_alerta_sucursal ON alertas_sistema(sucursal_id);
CREATE INDEX idx_alerta_destinatario ON alertas_sistema(destinatario_usuario);
CREATE INDEX idx_alerta_pendientes ON alertas_sistema(resuelta, gravedad) WHERE resuelta = false;
CREATE INDEX idx_alerta_fecha ON alertas_sistema(created_at);

COMMENT ON TABLE alertas_sistema IS 'Sistema de alertas automáticas para eventos financieros importantes';


-- ============================================================================
-- TABLA 15: TARIFAS CONTRATADAS (Para verificación de precios)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tarifas_contratadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Proveedor
    proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE RESTRICT,
    
    -- Servicio
    servicio VARCHAR(200) NOT NULL,
    descripcion TEXT,
    
    -- Tarifas
    precio_por_persona NUMERIC(10, 2),
    precio_total NUMERIC(10, 2),
    precio_minimo NUMERIC(10, 2),
    precio_maximo NUMERIC(10, 2),
    
    -- Vigencia
    vigencia_desde DATE NOT NULL,
    vigencia_hasta DATE NOT NULL,
    
    -- Condiciones
    personas_minimo INTEGER,
    personas_maximo INTEGER,
    dias_anticipacion INTEGER,
    
    -- Documentos
    contrato_url TEXT,
    
    -- Status
    activa BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_vigencia CHECK (vigencia_hasta > vigencia_desde)
);

-- Índices
CREATE INDEX idx_tarifa_proveedor ON tarifas_contratadas(proveedor_id);
CREATE INDEX idx_tarifa_servicio ON tarifas_contratadas(servicio);
CREATE INDEX idx_tarifa_vigencia ON tarifas_contratadas(vigencia_desde, vigencia_hasta);
CREATE INDEX idx_tarifa_activa ON tarifas_contratadas(activa) WHERE activa = true;

COMMENT ON TABLE tarifas_contratadas IS 'Catálogo de tarifas contratadas con proveedores para verificación automática';


-- ============================================================================
-- TRIGGERS Y FUNCIONES
-- ============================================================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas relevantes
CREATE TRIGGER update_sucursales_updated_at BEFORE UPDATE ON sucursales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cxc_updated_at BEFORE UPDATE ON cuentas_por_cobrar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cxp_updated_at BEFORE UPDATE ON cuentas_por_pagar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reembolsos_updated_at BEFORE UPDATE ON reembolsos_por_pagar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comisiones_updated_at BEFORE UPDATE ON comisiones_por_pagar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- DATOS INICIALES
-- ============================================================================

-- Insertar sucursal matriz
INSERT INTO sucursales (
    codigo,
    nombre,
    direccion,
    ciudad,
    estado,
    pais,
    telefono,
    email,
    activa,
    es_matriz
) VALUES (
    'MATRIZ',
    'Spirit Tours - Corporativo',
    'Av. Principal 123',
    'Ciudad de México',
    'CDMX',
    'México',
    '+52-55-1234-5678',
    'corporativo@spirittours.com',
    true,
    true
) ON CONFLICT (codigo) DO NOTHING;


-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista de cuentas por cobrar vencidas
CREATE OR REPLACE VIEW v_cxc_vencidas AS
SELECT 
    cxc.*,
    c.name as customer_name,
    c.email as customer_email,
    s.nombre as sucursal_nombre,
    EXTRACT(DAY FROM (NOW() - cxc.fecha_vencimiento)) as dias_vencido
FROM cuentas_por_cobrar cxc
JOIN customers c ON cxc.customer_id = c.id
JOIN sucursales s ON cxc.sucursal_id = s.id
WHERE cxc.status IN ('vencido', 'incobrable')
AND cxc.monto_pendiente > 0
ORDER BY cxc.fecha_vencimiento;

-- Vista de pagos pendientes de conciliar
CREATE OR REPLACE VIEW v_pagos_pendientes_conciliar AS
SELECT 
    'ingreso' as tipo,
    pr.folio,
    pr.monto,
    pr.fecha_pago,
    pr.sucursal_id,
    s.nombre as sucursal_nombre
FROM pagos_recibidos pr
JOIN sucursales s ON pr.sucursal_id = s.id
WHERE pr.conciliado = false
AND pr.status = 'aplicado'
UNION ALL
SELECT 
    'egreso' as tipo,
    prz.folio,
    prz.monto,
    prz.fecha_pago,
    prz.sucursal_id,
    s.nombre as sucursal_nombre
FROM pagos_realizados prz
JOIN sucursales s ON prz.sucursal_id = s.id
WHERE prz.conciliado = false
AND prz.status = 'ejecutado'
ORDER BY fecha_pago DESC;


-- ============================================================================
-- FIN MIGRATION 004
-- ============================================================================
