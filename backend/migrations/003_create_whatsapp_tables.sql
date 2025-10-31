-- ============================================================================
-- Spirit Tours - WhatsApp Business API Integration
-- Migration 003: Create WhatsApp Tables
-- 
-- Purpose: Complete WhatsApp Business API integration
-- Features:
--   - Configuration storage for WhatsApp Business credentials
--   - Message tracking and history
--   - Template management
--   - Availability cache (24-hour TTL)
--   - Webhook message storage
--   - Status tracking for all messages
-- ============================================================================

-- ============================================================================
-- WhatsApp Configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id SERIAL PRIMARY KEY,
    
    -- Meta Business API Credentials
    phone_number_id VARCHAR(100) UNIQUE NOT NULL,
    business_account_id VARCHAR(100) NOT NULL,
    access_token TEXT NOT NULL,
    
    -- Webhook Configuration
    webhook_url VARCHAR(500),
    webhook_verify_token VARCHAR(100),
    
    -- Status
    enabled BOOLEAN DEFAULT TRUE,
    verified BOOLEAN DEFAULT FALSE,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Rate Limiting
    daily_message_limit INTEGER DEFAULT 1000,
    messages_sent_today INTEGER DEFAULT 0,
    last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- API Version
    api_version VARCHAR(20) DEFAULT 'v18.0',
    
    -- Metadata
    display_name VARCHAR(255),
    phone_number VARCHAR(20),
    quality_rating VARCHAR(20),  -- GREEN, YELLOW, RED
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_quality_rating CHECK (quality_rating IS NULL OR quality_rating IN (
        'GREEN', 'YELLOW', 'RED', 'UNKNOWN'
    ))
);

-- ============================================================================
-- WhatsApp Messages (Sent & Received)
-- ============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,
    
    -- Message Identification
    message_id VARCHAR(100) UNIQUE,  -- WhatsApp API message ID
    wamid VARCHAR(200),  -- WhatsApp message ID (alternative format)
    
    -- Direction
    direction VARCHAR(20) NOT NULL,  -- outbound, inbound
    
    -- Recipient/Sender
    recipient VARCHAR(50),  -- Para mensajes salientes
    sender VARCHAR(50),     -- Para mensajes entrantes
    
    -- Content
    message_type VARCHAR(50) DEFAULT 'text',
    message_text TEXT,
    template_name VARCHAR(100),
    template_language VARCHAR(10),
    
    -- Media (if applicable)
    media_url VARCHAR(500),
    media_type VARCHAR(50),  -- image, video, audio, document
    caption TEXT,
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error Handling
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Context (for replies)
    context_message_id VARCHAR(100),  -- ID del mensaje al que responde
    
    -- Cost Tracking
    cost NUMERIC(10, 4) DEFAULT 0.0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_direction CHECK (direction IN ('outbound', 'inbound')),
    CONSTRAINT valid_message_type CHECK (message_type IN (
        'text', 'template', 'image', 'video', 'audio', 'document', 'location', 'contacts'
    )),
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'queued', 'sent', 'delivered', 'read', 'failed', 'deleted'
    ))
);

-- ============================================================================
-- WhatsApp Templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id SERIAL PRIMARY KEY,
    
    -- Template Identification
    template_name VARCHAR(100) UNIQUE NOT NULL,
    template_id VARCHAR(100),
    
    -- Content
    category VARCHAR(50) NOT NULL,
    language VARCHAR(10) DEFAULT 'es',
    
    -- Template Structure
    header_type VARCHAR(20),  -- text, image, video, document
    header_content TEXT,
    body_content TEXT NOT NULL,
    footer_content TEXT,
    
    -- Buttons (JSON array)
    buttons JSONB,
    
    -- Variables
    variables JSONB,  -- Lista de variables en el template
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Usage Stats
    times_sent INTEGER DEFAULT 0,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_template_category CHECK (category IN (
        'MARKETING', 'UTILITY', 'AUTHENTICATION'
    )),
    CONSTRAINT valid_template_status CHECK (status IN (
        'pending', 'approved', 'rejected', 'paused', 'disabled'
    )),
    CONSTRAINT valid_header_type CHECK (header_type IS NULL OR header_type IN (
        'text', 'image', 'video', 'document'
    ))
);

-- ============================================================================
-- WhatsApp Availability Cache
-- ============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_availability_cache (
    id SERIAL PRIMARY KEY,
    
    phone_number VARCHAR(50) UNIQUE NOT NULL,
    has_whatsapp BOOLEAN NOT NULL,
    
    -- TTL: 24 horas
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Verification Method
    verification_method VARCHAR(50) DEFAULT 'api',
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_verification_method CHECK (verification_method IN (
        'api', 'manual', 'webhook', 'user_reported'
    ))
);

-- ============================================================================
-- WhatsApp Incoming Messages (Webhook)
-- ============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_incoming_messages (
    id SERIAL PRIMARY KEY,
    
    -- Message Details
    message_id VARCHAR(100) UNIQUE NOT NULL,
    from_number VARCHAR(50) NOT NULL,
    
    -- Content
    message_type VARCHAR(50) DEFAULT 'text',
    message_body TEXT,
    
    -- Media
    media_id VARCHAR(100),
    media_url VARCHAR(500),
    mime_type VARCHAR(100),
    
    -- Context
    context_message_id VARCHAR(100),
    
    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Raw Webhook Data
    raw_data JSONB,
    
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_incoming_message_type CHECK (message_type IN (
        'text', 'image', 'video', 'audio', 'document', 'location', 'contacts', 'button', 'interactive'
    ))
);

-- ============================================================================
-- WhatsApp Webhook Events
-- ============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
    id SERIAL PRIMARY KEY,
    
    event_type VARCHAR(50) NOT NULL,
    
    -- Message Reference
    message_id VARCHAR(100),
    
    -- Status Updates
    status VARCHAR(50),
    timestamp BIGINT,
    
    -- Error Information
    error_code VARCHAR(50),
    error_title VARCHAR(200),
    error_message TEXT,
    
    -- Raw Event Data
    raw_event JSONB NOT NULL,
    
    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_webhook_event_type CHECK (event_type IN (
        'message_status', 'message_received', 'message_read', 'message_delivered', 
        'message_failed', 'account_review', 'template_status'
    ))
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- WhatsApp messages indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_message_id ON whatsapp_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_recipient ON whatsapp_messages(recipient);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sender ON whatsapp_messages(sender);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at);

-- WhatsApp templates indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_name ON whatsapp_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON whatsapp_templates(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_category ON whatsapp_templates(category);

-- Availability cache indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_availability_phone ON whatsapp_availability_cache(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_availability_expires ON whatsapp_availability_cache(expires_at);

-- Incoming messages indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_message_id ON whatsapp_incoming_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_from ON whatsapp_incoming_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_incoming_processed ON whatsapp_incoming_messages(processed);

-- Webhook events indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_type ON whatsapp_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_message_id ON whatsapp_webhook_events(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_processed ON whatsapp_webhook_events(processed);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update whatsapp_config timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whatsapp_config_updated_at
    BEFORE UPDATE ON whatsapp_config
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_config_updated_at();

-- Function to clean expired availability cache
CREATE OR REPLACE FUNCTION clean_expired_whatsapp_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM whatsapp_availability_cache
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily message counter
CREATE OR REPLACE FUNCTION reset_whatsapp_daily_counter()
RETURNS void AS $$
BEGIN
    UPDATE whatsapp_config
    SET messages_sent_today = 0,
        last_reset_at = NOW()
    WHERE DATE(last_reset_at) < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to increment template usage counter
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.template_name IS NOT NULL AND NEW.status = 'sent' THEN
        UPDATE whatsapp_templates
        SET times_sent = times_sent + 1,
            last_sent_at = NOW()
        WHERE template_name = NEW.template_name;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_template_usage
    AFTER INSERT ON whatsapp_messages
    FOR EACH ROW
    WHEN (NEW.template_name IS NOT NULL AND NEW.status = 'sent')
    EXECUTE FUNCTION increment_template_usage();

-- ============================================================================
-- Views for Analytics
-- ============================================================================

-- View: WhatsApp message statistics
CREATE OR REPLACE VIEW v_whatsapp_message_stats AS
SELECT 
    DATE(created_at) as date,
    direction,
    COUNT(*) as message_count,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
    COUNT(*) FILTER (WHERE status = 'read') as read_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    SUM(cost) as total_cost,
    AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))) as avg_delivery_time_seconds
FROM whatsapp_messages
WHERE created_at IS NOT NULL
GROUP BY DATE(created_at), direction
ORDER BY date DESC, direction;

-- View: Template usage statistics
CREATE OR REPLACE VIEW v_whatsapp_template_stats AS
SELECT 
    template_name,
    category,
    status,
    times_sent,
    last_sent_at,
    CASE 
        WHEN last_sent_at > NOW() - INTERVAL '7 days' THEN 'active'
        WHEN last_sent_at > NOW() - INTERVAL '30 days' THEN 'occasional'
        ELSE 'inactive'
    END as usage_status
FROM whatsapp_templates
ORDER BY times_sent DESC;

-- View: WhatsApp availability cache status
CREATE OR REPLACE VIEW v_whatsapp_availability_stats AS
SELECT 
    COUNT(*) as total_cached,
    COUNT(*) FILTER (WHERE has_whatsapp = TRUE) as has_whatsapp_count,
    COUNT(*) FILTER (WHERE has_whatsapp = FALSE) as no_whatsapp_count,
    COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_count,
    COUNT(*) FILTER (WHERE expires_at >= NOW()) as valid_count
FROM whatsapp_availability_cache;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE whatsapp_config IS 'WhatsApp Business API configuration and credentials';
COMMENT ON COLUMN whatsapp_config.quality_rating IS 'WhatsApp Business account quality rating affects message limits';

COMMENT ON TABLE whatsapp_messages IS 'Complete history of all WhatsApp messages sent and received';
COMMENT ON COLUMN whatsapp_messages.cost IS 'Cost per message (typically $0.00 for conversation-based pricing)';

COMMENT ON TABLE whatsapp_templates IS 'Pre-approved message templates for WhatsApp Business API';
COMMENT ON COLUMN whatsapp_templates.category IS 'MARKETING=promotional, UTILITY=transactional, AUTHENTICATION=OTP';

COMMENT ON TABLE whatsapp_availability_cache IS 'Cache of WhatsApp availability checks (24-hour TTL) to reduce API calls';
COMMENT ON COLUMN whatsapp_availability_cache.expires_at IS 'Cache entry expires after 24 hours';

COMMENT ON TABLE whatsapp_incoming_messages IS 'Messages received via webhook from customers';
COMMENT ON TABLE whatsapp_webhook_events IS 'All webhook events from WhatsApp API (status updates, errors, etc.)';

COMMENT ON FUNCTION clean_expired_whatsapp_cache() IS 'Removes expired entries from availability cache';
COMMENT ON FUNCTION reset_whatsapp_daily_counter() IS 'Resets daily message counter for rate limiting';

-- ============================================================================
-- Migration Complete
-- ============================================================================
