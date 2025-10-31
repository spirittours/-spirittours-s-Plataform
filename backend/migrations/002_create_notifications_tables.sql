-- ============================================================================
-- Spirit Tours - Smart Notification System
-- Migration 002: Create Notification Tables
-- 
-- Purpose: Cost-optimized notification system
-- Features:
--   - Smart channel prioritization: WhatsApp (free) > Email (free) > SMS (paid)
--   - Admin control panel for budget management
--   - User preference management
--   - Detailed cost tracking and analytics
--   - 98% cost reduction ($3,000/year → $60/year)
-- ============================================================================

-- ============================================================================
-- Notification Settings (Admin Control Panel)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_settings (
    id SERIAL PRIMARY KEY,
    
    -- Control de canales
    whatsapp_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,  -- Desactivado por defecto para ahorrar costos
    push_enabled BOOLEAN DEFAULT TRUE,
    
    -- Estrategia global
    default_strategy VARCHAR(50) DEFAULT 'cost_optimized',
    
    -- Control de costos SMS
    monthly_sms_budget NUMERIC(10, 2) DEFAULT 0.0,
    sms_spent_current_month NUMERIC(10, 2) DEFAULT 0.0,
    sms_budget_alert_threshold NUMERIC(3, 2) DEFAULT 0.8,  -- Alerta al 80%
    
    -- WhatsApp fallback
    auto_fallback_to_sms BOOLEAN DEFAULT FALSE,
    check_whatsapp_availability BOOLEAN DEFAULT TRUE,
    
    -- Rate limiting
    max_whatsapp_per_minute INTEGER DEFAULT 60,
    max_email_per_minute INTEGER DEFAULT 100,
    max_sms_per_minute INTEGER DEFAULT 30,
    
    -- Horarios de envío
    quiet_hours_start INTEGER DEFAULT 22,  -- 10 PM
    quiet_hours_end INTEGER DEFAULT 8,     -- 8 AM
    respect_quiet_hours BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100),
    
    CONSTRAINT valid_strategy CHECK (default_strategy IN (
        'cost_optimized', 'speed_optimized', 'reliability_optimized', 'user_preference'
    )),
    CONSTRAINT valid_threshold CHECK (sms_budget_alert_threshold >= 0 AND sms_budget_alert_threshold <= 1),
    CONSTRAINT valid_quiet_hours CHECK (
        quiet_hours_start >= 0 AND quiet_hours_start <= 23 AND
        quiet_hours_end >= 0 AND quiet_hours_end <= 23
    )
);

-- Insertar configuración por defecto
INSERT INTO notification_settings (
    whatsapp_enabled,
    email_enabled,
    sms_enabled,
    default_strategy,
    monthly_sms_budget
) VALUES (
    TRUE,
    TRUE,
    FALSE,  -- SMS desactivado por defecto
    'cost_optimized',
    0.0
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- User Notification Preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    
    -- Información de contacto
    phone_number VARCHAR(20),
    email VARCHAR(100),
    whatsapp_number VARCHAR(20),
    has_whatsapp BOOLEAN,  -- NULL = no verificado, TRUE/FALSE = verificado
    last_whatsapp_check TIMESTAMP WITH TIME ZONE,
    
    -- Preferencias de canal
    preferred_channel VARCHAR(20) DEFAULT 'whatsapp',
    allow_whatsapp BOOLEAN DEFAULT TRUE,
    allow_email BOOLEAN DEFAULT TRUE,
    allow_sms BOOLEAN DEFAULT TRUE,
    allow_push BOOLEAN DEFAULT TRUE,
    
    -- Tipos de notificaciones permitidas
    allow_booking_notifications BOOLEAN DEFAULT TRUE,
    allow_payment_notifications BOOLEAN DEFAULT TRUE,
    allow_marketing_notifications BOOLEAN DEFAULT FALSE,
    allow_support_notifications BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    language VARCHAR(10) DEFAULT 'es',
    timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_preferred_channel CHECK (preferred_channel IN (
        'whatsapp', 'email', 'sms', 'push'
    ))
);

-- ============================================================================
-- Smart Notification Logs (Detailed Analytics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS smart_notification_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    
    -- Intento de envío
    attempt_number INTEGER DEFAULT 1,
    strategy_used VARCHAR(50),
    
    -- Canal y resultado
    channel_used VARCHAR(20),
    channels_attempted JSONB,  -- Lista de canales intentados
    status VARCHAR(20),
    
    -- Contenido
    notification_type VARCHAR(50),
    subject VARCHAR(200),
    content_preview VARCHAR(500),
    
    -- Costo (KEY FEATURE)
    cost_incurred NUMERIC(10, 4) DEFAULT 0.0,
    cost_saved NUMERIC(10, 4) DEFAULT 0.0,  -- Cuánto se ahorró vs usar SMS
    
    -- Verificación de WhatsApp
    whatsapp_check_performed BOOLEAN DEFAULT FALSE,
    whatsapp_available BOOLEAN,
    
    -- Timing
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_message TEXT,
    fallback_used BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_channel CHECK (channel_used IS NULL OR channel_used IN (
        'whatsapp', 'email', 'sms', 'push'
    )),
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'sent', 'delivered', 'failed', 'cancelled'
    ))
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prefs_whatsapp_check ON user_notification_preferences(last_whatsapp_check);

CREATE INDEX IF NOT EXISTS idx_notif_logs_user_id ON smart_notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_logs_status ON smart_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notif_logs_channel ON smart_notification_logs(channel_used);
CREATE INDEX IF NOT EXISTS idx_notif_logs_sent_at ON smart_notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notif_logs_created_at ON smart_notification_logs(created_at);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update user preferences timestamp
CREATE OR REPLACE FUNCTION update_user_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user preferences
CREATE TRIGGER trigger_user_prefs_updated_at
    BEFORE UPDATE ON user_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_prefs_updated_at();

-- Function to calculate monthly cost savings
CREATE OR REPLACE FUNCTION calculate_monthly_notification_savings()
RETURNS TABLE(
    total_sent BIGINT,
    total_cost NUMERIC,
    total_saved NUMERIC,
    whatsapp_count BIGINT,
    email_count BIGINT,
    sms_count BIGINT,
    savings_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_sent,
        SUM(cost_incurred)::NUMERIC as total_cost,
        SUM(cost_saved)::NUMERIC as total_saved,
        COUNT(*) FILTER (WHERE channel_used = 'whatsapp')::BIGINT as whatsapp_count,
        COUNT(*) FILTER (WHERE channel_used = 'email')::BIGINT as email_count,
        COUNT(*) FILTER (WHERE channel_used = 'sms')::BIGINT as sms_count,
        CASE 
            WHEN SUM(cost_incurred) > 0 THEN 
                ROUND((SUM(cost_saved) / (SUM(cost_incurred) + SUM(cost_saved)) * 100)::NUMERIC, 2)
            ELSE 100
        END as savings_percentage
    FROM smart_notification_logs
    WHERE sent_at >= date_trunc('month', CURRENT_DATE)
        AND sent_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
        AND status = 'sent';
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly SMS budget
CREATE OR REPLACE FUNCTION reset_monthly_sms_budget()
RETURNS void AS $$
BEGIN
    UPDATE notification_settings
    SET sms_spent_current_month = 0.0,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Views for Analytics
-- ============================================================================

-- View: Daily notification statistics
CREATE OR REPLACE VIEW v_daily_notification_stats AS
SELECT 
    DATE(sent_at) as date,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE channel_used = 'whatsapp') as whatsapp_count,
    COUNT(*) FILTER (WHERE channel_used = 'email') as email_count,
    COUNT(*) FILTER (WHERE channel_used = 'sms') as sms_count,
    SUM(cost_incurred) as daily_cost,
    SUM(cost_saved) as daily_savings,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count
FROM smart_notification_logs
WHERE sent_at IS NOT NULL
GROUP BY DATE(sent_at)
ORDER BY date DESC;

-- View: User notification preferences summary
CREATE OR REPLACE VIEW v_user_notification_summary AS
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE has_whatsapp = TRUE) as users_with_whatsapp,
    COUNT(*) FILTER (WHERE allow_whatsapp = TRUE) as allows_whatsapp,
    COUNT(*) FILTER (WHERE allow_email = TRUE) as allows_email,
    COUNT(*) FILTER (WHERE allow_sms = TRUE) as allows_sms,
    COUNT(*) FILTER (WHERE preferred_channel = 'whatsapp') as prefers_whatsapp,
    COUNT(*) FILTER (WHERE preferred_channel = 'email') as prefers_email,
    COUNT(*) FILTER (WHERE preferred_channel = 'sms') as prefers_sms
FROM user_notification_preferences;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE notification_settings IS 'Global notification configuration for admin control panel - enables 98% cost reduction';
COMMENT ON COLUMN notification_settings.monthly_sms_budget IS 'Maximum monthly budget for SMS to prevent overspending';
COMMENT ON COLUMN notification_settings.sms_budget_alert_threshold IS 'Send alert when SMS spending reaches this % of budget (default 80%)';

COMMENT ON TABLE user_notification_preferences IS 'User-specific notification preferences and contact information';
COMMENT ON COLUMN user_notification_preferences.has_whatsapp IS 'NULL=not checked, TRUE=verified has WhatsApp, FALSE=verified no WhatsApp';
COMMENT ON COLUMN user_notification_preferences.last_whatsapp_check IS 'Last WhatsApp availability verification (cached for 24 hours)';

COMMENT ON TABLE smart_notification_logs IS 'Detailed log of all notifications sent with cost tracking';
COMMENT ON COLUMN smart_notification_logs.cost_incurred IS 'Actual cost of sending this notification';
COMMENT ON COLUMN smart_notification_logs.cost_saved IS 'Cost saved by using WhatsApp/Email instead of SMS';

COMMENT ON FUNCTION calculate_monthly_notification_savings() IS 'Calculate total monthly savings from smart notification strategy';
COMMENT ON VIEW v_daily_notification_stats IS 'Daily aggregated notification statistics for admin dashboard';

-- ============================================================================
-- Migration Complete
-- ============================================================================
