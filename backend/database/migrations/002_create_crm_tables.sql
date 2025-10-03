-- CRM Enterprise Tables Migration
-- Creación de tablas para integración completa con SuiteCRM
-- Incluye sync_history, crm_activities, y todas las entidades CRM

-- ===== ENUM TYPES =====

-- Tipo de entidad CRM
DO $$ BEGIN
    CREATE TYPE crm_entity_type AS ENUM (
        'contact', 'lead', 'opportunity', 'account', 'task', 'meeting', 'call', 'email', 'note'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Estado de sincronización
DO $$ BEGIN
    CREATE TYPE sync_status AS ENUM (
        'pending', 'in_progress', 'success', 'failed', 'partial', 'skipped'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tipo de actividad
DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM (
        'create', 'update', 'delete', 'view', 'sync', 'export', 'import',
        'email_sent', 'call_made', 'meeting_scheduled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Estado de lead
DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM (
        'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Etapa de oportunidad
DO $$ BEGIN
    CREATE TYPE opportunity_stage AS ENUM (
        'prospecting', 'qualification', 'needs_analysis', 'proposal',
        'negotiation', 'closed_won', 'closed_lost'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===== TABLA PRINCIPAL DE SINCRONIZACIÓN =====

CREATE TABLE IF NOT EXISTS crm_sync_history (
    id SERIAL PRIMARY KEY,
    
    -- Identificación de la sincronización
    sync_batch_id VARCHAR(255) NOT NULL,
    entity_type crm_entity_type NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    suitecrm_id VARCHAR(255) NULL,
    
    -- Tipo de operación
    operation VARCHAR(50) NOT NULL, -- create, update, delete, sync
    sync_direction VARCHAR(50) NOT NULL, -- to_suitecrm, from_suitecrm, bidirectional
    
    -- Estado de la sincronización
    status sync_status NOT NULL DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Datos de la sincronización
    data_before JSONB NULL,
    data_after JSONB NULL,
    changes_detected JSONB NULL,
    
    -- Metadatos
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    last_attempt_at TIMESTAMP WITH TIME ZONE NULL,
    next_retry_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Error handling
    error_message TEXT NULL,
    error_code VARCHAR(100) NULL,
    error_details JSONB NULL,
    
    -- Tracking de usuario
    triggered_by_user_id INTEGER NULL,
    triggered_by_system BOOLEAN DEFAULT FALSE,
    
    -- Configuración de sincronización
    sync_config JSONB NULL,
    priority INTEGER DEFAULT 5 -- 1-10, siendo 10 máxima prioridad
);

-- Índices para crm_sync_history
CREATE INDEX IF NOT EXISTS idx_crm_sync_history_batch_id ON crm_sync_history(sync_batch_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_history_entity_type ON crm_sync_history(entity_type);
CREATE INDEX IF NOT EXISTS idx_crm_sync_history_entity_id ON crm_sync_history(entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_history_suitecrm_id ON crm_sync_history(suitecrm_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_history_status ON crm_sync_history(status);
CREATE INDEX IF NOT EXISTS idx_crm_sync_history_started_at ON crm_sync_history(started_at);

-- ===== TABLA DE ACTIVIDADES CRM =====

CREATE TABLE IF NOT EXISTS crm_activities (
    id SERIAL PRIMARY KEY,
    
    -- Identificación de la actividad
    activity_id VARCHAR(255) NOT NULL UNIQUE,
    activity_type activity_type NOT NULL,
    
    -- Entidad relacionada
    entity_type crm_entity_type NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    suitecrm_id VARCHAR(255) NULL,
    
    -- Usuario y contexto
    user_id INTEGER NULL,
    user_email VARCHAR(255) NULL,
    user_name VARCHAR(255) NULL,
    user_role VARCHAR(100) NULL,
    
    -- Detalles de la actividad
    activity_title VARCHAR(500) NOT NULL,
    activity_description TEXT NULL,
    activity_data JSONB NULL,
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    session_id VARCHAR(255) NULL,
    
    -- Contexto empresarial
    department VARCHAR(100) NULL,
    branch_id INTEGER NULL,
    campaign_id VARCHAR(255) NULL,
    
    -- Resultados y métricas
    result_status VARCHAR(50) NULL, -- success, failed, pending
    duration_ms INTEGER NULL,
    response_size_bytes INTEGER NULL,
    
    -- Clasificación y tags
    tags JSONB NULL,
    priority VARCHAR(20) NULL,
    sensitivity VARCHAR(20) NULL -- public, internal, confidential
);

-- Índices para crm_activities
CREATE INDEX IF NOT EXISTS idx_crm_activities_activity_id ON crm_activities(activity_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_activity_type ON crm_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_entity_type ON crm_activities(entity_type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_entity_id ON crm_activities(entity_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_suitecrm_id ON crm_activities(suitecrm_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_user_id ON crm_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_created_at ON crm_activities(created_at);

-- ===== MODELOS DE ENTIDADES CRM =====

-- Contactos empresariales
CREATE TABLE IF NOT EXISTS crm_contacts (
    id SERIAL PRIMARY KEY,
    
    -- IDs de sincronización
    suitecrm_id VARCHAR(255) UNIQUE NULL,
    external_id VARCHAR(255) NULL,
    
    -- Datos personales
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NULL,
    salutation VARCHAR(50) NULL,
    
    -- Contacto
    email VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    mobile VARCHAR(50) NULL,
    fax VARCHAR(50) NULL,
    
    -- Información profesional
    title VARCHAR(255) NULL,
    department VARCHAR(255) NULL,
    account_name VARCHAR(255) NULL,
    account_id VARCHAR(255) NULL,
    
    -- Dirección
    primary_address_street VARCHAR(255) NULL,
    primary_address_city VARCHAR(100) NULL,
    primary_address_state VARCHAR(100) NULL,
    primary_address_country VARCHAR(100) NULL,
    primary_address_postalcode VARCHAR(20) NULL,
    
    -- Datos adicionales
    lead_source VARCHAR(255) NULL,
    description TEXT NULL,
    birthdate DATE NULL,
    
    -- Estados y flags
    is_active BOOLEAN DEFAULT TRUE,
    do_not_call BOOLEAN DEFAULT FALSE,
    email_opt_out BOOLEAN DEFAULT FALSE,
    
    -- Sincronización
    last_sync_at TIMESTAMP WITH TIME ZONE NULL,
    sync_status sync_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Datos personalizados
    custom_fields JSONB NULL,
    tags JSONB NULL
);

-- Índices para crm_contacts
CREATE INDEX IF NOT EXISTS idx_crm_contacts_suitecrm_id ON crm_contacts(suitecrm_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_external_id ON crm_contacts(external_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_account_id ON crm_contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_full_name ON crm_contacts(full_name);

-- Leads empresariales
CREATE TABLE IF NOT EXISTS crm_leads (
    id SERIAL PRIMARY KEY,
    
    -- IDs de sincronización
    suitecrm_id VARCHAR(255) UNIQUE NULL,
    external_id VARCHAR(255) NULL,
    
    -- Datos básicos
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NULL,
    salutation VARCHAR(50) NULL,
    
    -- Contacto
    email VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    mobile VARCHAR(50) NULL,
    
    -- Información profesional
    title VARCHAR(255) NULL,
    company VARCHAR(255) NULL,
    industry VARCHAR(100) NULL,
    
    -- Estado del lead
    status lead_status DEFAULT 'new',
    lead_source VARCHAR(255) NULL,
    rating VARCHAR(50) NULL, -- Hot, Warm, Cold
    
    -- Datos financieros
    annual_revenue DECIMAL(15, 2) NULL,
    employees INTEGER NULL,
    
    -- Dirección
    primary_address_street VARCHAR(255) NULL,
    primary_address_city VARCHAR(100) NULL,
    primary_address_state VARCHAR(100) NULL,
    primary_address_country VARCHAR(100) NULL,
    primary_address_postalcode VARCHAR(20) NULL,
    
    -- Descripción e intereses
    description TEXT NULL,
    campaign_id VARCHAR(255) NULL,
    
    -- Asignación
    assigned_user_id VARCHAR(255) NULL,
    assigned_user_name VARCHAR(255) NULL,
    
    -- Estados y flags
    is_active BOOLEAN DEFAULT TRUE,
    converted BOOLEAN DEFAULT FALSE,
    do_not_call BOOLEAN DEFAULT FALSE,
    email_opt_out BOOLEAN DEFAULT FALSE,
    
    -- Conversión
    contact_id VARCHAR(255) NULL,
    account_id VARCHAR(255) NULL,
    opportunity_id VARCHAR(255) NULL,
    converted_date TIMESTAMP WITH TIME ZONE NULL,
    
    -- Sincronización
    last_sync_at TIMESTAMP WITH TIME ZONE NULL,
    sync_status sync_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Datos personalizados
    custom_fields JSONB NULL,
    tags JSONB NULL
);

-- Índices para crm_leads
CREATE INDEX IF NOT EXISTS idx_crm_leads_suitecrm_id ON crm_leads(suitecrm_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_external_id ON crm_leads(external_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_email ON crm_leads(email);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_campaign_id ON crm_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_assigned_user_id ON crm_leads(assigned_user_id);

-- Oportunidades de negocio
CREATE TABLE IF NOT EXISTS crm_opportunities (
    id SERIAL PRIMARY KEY,
    
    -- IDs de sincronización
    suitecrm_id VARCHAR(255) UNIQUE NULL,
    external_id VARCHAR(255) NULL,
    
    -- Datos básicos
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    
    -- Relaciones
    account_id VARCHAR(255) NULL,
    account_name VARCHAR(255) NULL,
    contact_id VARCHAR(255) NULL,
    lead_id VARCHAR(255) NULL,
    
    -- Estado y progreso
    sales_stage opportunity_stage DEFAULT 'prospecting',
    probability INTEGER DEFAULT 0, -- 0-100%
    
    -- Datos financieros
    amount DECIMAL(15, 2) NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Fechas importantes
    date_closed DATE NULL,
    expected_close_date DATE NULL,
    
    -- Asignación
    assigned_user_id VARCHAR(255) NULL,
    assigned_user_name VARCHAR(255) NULL,
    
    -- Origen y clasificación
    lead_source VARCHAR(255) NULL,
    opportunity_type VARCHAR(100) NULL,
    campaign_id VARCHAR(255) NULL,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_closed BOOLEAN DEFAULT FALSE,
    is_won BOOLEAN DEFAULT FALSE,
    
    -- Sincronización
    last_sync_at TIMESTAMP WITH TIME ZONE NULL,
    sync_status sync_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Datos personalizados
    custom_fields JSONB NULL,
    tags JSONB NULL
);

-- Índices para crm_opportunities
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_suitecrm_id ON crm_opportunities(suitecrm_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_account_id ON crm_opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_contact_id ON crm_opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_lead_id ON crm_opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_sales_stage ON crm_opportunities(sales_stage);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_expected_close_date ON crm_opportunities(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_assigned_user_id ON crm_opportunities(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_campaign_id ON crm_opportunities(campaign_id);

-- Cuentas empresariales
CREATE TABLE IF NOT EXISTS crm_accounts (
    id SERIAL PRIMARY KEY,
    
    -- IDs de sincronización
    suitecrm_id VARCHAR(255) UNIQUE NULL,
    external_id VARCHAR(255) NULL,
    
    -- Datos básicos
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(100) NULL,
    industry VARCHAR(100) NULL,
    
    -- Contacto
    phone_office VARCHAR(50) NULL,
    phone_fax VARCHAR(50) NULL,
    email VARCHAR(255) NULL,
    website VARCHAR(255) NULL,
    
    -- Dirección de facturación
    billing_address_street VARCHAR(255) NULL,
    billing_address_city VARCHAR(100) NULL,
    billing_address_state VARCHAR(100) NULL,
    billing_address_country VARCHAR(100) NULL,
    billing_address_postalcode VARCHAR(20) NULL,
    
    -- Dirección de envío
    shipping_address_street VARCHAR(255) NULL,
    shipping_address_city VARCHAR(100) NULL,
    shipping_address_state VARCHAR(100) NULL,
    shipping_address_country VARCHAR(100) NULL,
    shipping_address_postalcode VARCHAR(20) NULL,
    
    -- Datos financieros
    annual_revenue DECIMAL(15, 2) NULL,
    employees INTEGER NULL,
    
    -- Información adicional
    description TEXT NULL,
    rating VARCHAR(50) NULL,
    
    -- Asignación
    assigned_user_id VARCHAR(255) NULL,
    assigned_user_name VARCHAR(255) NULL,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Sincronización
    last_sync_at TIMESTAMP WITH TIME ZONE NULL,
    sync_status sync_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Datos personalizados
    custom_fields JSONB NULL,
    tags JSONB NULL
);

-- Índices para crm_accounts
CREATE INDEX IF NOT EXISTS idx_crm_accounts_suitecrm_id ON crm_accounts(suitecrm_id);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_external_id ON crm_accounts(external_id);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_name ON crm_accounts(name);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_assigned_user_id ON crm_accounts(assigned_user_id);

-- ===== TABLAS DE CONFIGURACIÓN =====

-- Configuración de webhooks
CREATE TABLE IF NOT EXISTS crm_webhook_config (
    id SERIAL PRIMARY KEY,
    
    -- Identificación
    webhook_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    
    -- Configuración del webhook
    entity_type crm_entity_type NOT NULL,
    event_types JSONB NOT NULL, -- ['create', 'update', 'delete']
    endpoint_url VARCHAR(500) NOT NULL,
    
    -- Autenticación
    auth_type VARCHAR(50) NOT NULL DEFAULT 'bearer', -- bearer, basic, oauth2
    auth_config JSONB NULL,
    
    -- Configuración de envío
    retry_attempts INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,
    timeout_seconds INTEGER DEFAULT 30,
    
    -- Filtros y transformaciones
    filters JSONB NULL,
    field_mapping JSONB NULL,
    transform_rules JSONB NULL,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_bidirectional BOOLEAN DEFAULT FALSE,
    
    -- Métricas
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    last_success_at TIMESTAMP WITH TIME ZONE NULL,
    last_failure_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id INTEGER NULL
);

-- Configuración global de sincronización CRM
CREATE TABLE IF NOT EXISTS crm_sync_settings (
    id SERIAL PRIMARY KEY,
    
    -- Identificación
    setting_key VARCHAR(255) NOT NULL UNIQUE,
    setting_name VARCHAR(255) NOT NULL,
    setting_description TEXT NULL,
    
    -- Valor de configuración
    setting_value JSONB NOT NULL,
    default_value JSONB NULL,
    
    -- Metadatos
    setting_type VARCHAR(50) NOT NULL, -- string, integer, boolean, json, array
    is_encrypted BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    
    -- Validación
    validation_rules JSONB NULL,
    allowed_values JSONB NULL,
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by_user_id INTEGER NULL
);

-- ===== TRIGGERS PARA UPDATED_AT =====

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para todas las tablas CRM
CREATE TRIGGER update_crm_contacts_updated_at BEFORE UPDATE ON crm_contacts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_crm_leads_updated_at BEFORE UPDATE ON crm_leads FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_crm_opportunities_updated_at BEFORE UPDATE ON crm_opportunities FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_crm_accounts_updated_at BEFORE UPDATE ON crm_accounts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_crm_webhook_config_updated_at BEFORE UPDATE ON crm_webhook_config FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_crm_sync_settings_updated_at BEFORE UPDATE ON crm_sync_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ===== DATOS INICIALES =====

-- Configuraciones iniciales de sincronización
INSERT INTO crm_sync_settings (setting_key, setting_name, setting_description, setting_value, setting_type) VALUES
('sync_interval_contacts', 'Intervalo de Sincronización - Contactos', 'Intervalo en minutos para sincronizar contactos', '"15"', 'integer'),
('sync_interval_leads', 'Intervalo de Sincronización - Leads', 'Intervalo en minutos para sincronizar leads', '"10"', 'integer'),
('sync_interval_opportunities', 'Intervalo de Sincronización - Oportunidades', 'Intervalo en minutos para sincronizar oportunidades', '"20"', 'integer'),
('sync_interval_accounts', 'Intervalo de Sincronización - Cuentas', 'Intervalo en minutos para sincronizar cuentas', '"30"', 'integer'),
('max_retry_attempts', 'Máximo Intentos de Reintento', 'Número máximo de intentos para sincronización fallida', '"3"', 'integer'),
('retry_delay_minutes', 'Retraso entre Reintentos', 'Minutos de espera entre reintentos', '"5"', 'integer'),
('enable_webhooks', 'Habilitar Webhooks', 'Activar sistema de webhooks bidireccionales', 'true', 'boolean'),
('webhook_secret_key', 'Clave Secreta de Webhooks', 'Clave para validar webhooks entrantes', '"crm_webhook_secret_2024"', 'string'),
('suitecrm_api_timeout', 'Timeout API SuiteCRM', 'Timeout en segundos para llamadas a SuiteCRM', '"30"', 'integer'),
('enable_real_time_sync', 'Sincronización en Tiempo Real', 'Activar sincronización inmediata por webhooks', 'true', 'boolean')
ON CONFLICT (setting_key) DO NOTHING;

-- Webhook de configuración inicial
INSERT INTO crm_webhook_config (
    webhook_id, 
    name, 
    description, 
    entity_type, 
    event_types, 
    endpoint_url, 
    auth_type, 
    is_active
) VALUES (
    'suitecrm_contacts_webhook',
    'SuiteCRM Contacts Webhook',
    'Webhook bidireccional para sincronización de contactos con SuiteCRM',
    'contact',
    '["create", "update", "delete"]',
    '/api/crm/webhook/suitecrm/contacts',
    'bearer',
    true
), (
    'suitecrm_leads_webhook',
    'SuiteCRM Leads Webhook', 
    'Webhook bidireccional para sincronización de leads con SuiteCRM',
    'lead',
    '["create", "update", "delete", "convert"]',
    '/api/crm/webhook/suitecrm/leads',
    'bearer',
    true
), (
    'suitecrm_opportunities_webhook',
    'SuiteCRM Opportunities Webhook',
    'Webhook bidireccional para sincronización de oportunidades con SuiteCRM',
    'opportunity',
    '["create", "update", "delete", "close"]',
    '/api/crm/webhook/suitecrm/opportunities',
    'bearer',
    true
)
ON CONFLICT (webhook_id) DO NOTHING;

-- ===== COMENTARIOS DE DOCUMENTACIÓN =====

COMMENT ON TABLE crm_sync_history IS 'Historial completo de sincronización bidireccional con SuiteCRM';
COMMENT ON TABLE crm_activities IS 'Registro de todas las actividades y auditoría del sistema CRM';
COMMENT ON TABLE crm_contacts IS 'Contactos empresariales sincronizados con SuiteCRM';
COMMENT ON TABLE crm_leads IS 'Leads de ventas sincronizados con SuiteCRM';
COMMENT ON TABLE crm_opportunities IS 'Oportunidades de negocio sincronizadas con SuiteCRM';
COMMENT ON TABLE crm_accounts IS 'Cuentas empresariales sincronizadas con SuiteCRM';
COMMENT ON TABLE crm_webhook_config IS 'Configuración de webhooks para sincronización en tiempo real';
COMMENT ON TABLE crm_sync_settings IS 'Configuración global del sistema de sincronización CRM';

-- Migración completada exitosamente
SELECT 'CRM Enterprise Tables Migration completed successfully' AS migration_status;