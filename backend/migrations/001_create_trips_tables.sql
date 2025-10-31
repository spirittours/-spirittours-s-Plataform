-- ============================================================================
-- Spirit Tours - Trips Management System
-- Migration 001: Create Trips Tables
-- 
-- Purpose: Superior trip management system exceeding Expedia TAAP
-- Features:
--   - 10 granular trip states (vs 4 in Expedia)
--   - Multi-channel support (B2C, B2B, B2B2C)
--   - Real-time GPS tracking
--   - Integrated chat system
--   - Complete audit trail
--   - Advanced analytics
-- ============================================================================

-- Enable PostGIS extension for geographic data types
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- Main Trip Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS trips (
    trip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    
    -- Estado y canal
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    channel VARCHAR(10) NOT NULL,
    
    -- Relaciones (FKs a tablas existentes)
    customer_id UUID NOT NULL REFERENCES users(id),
    agency_id UUID REFERENCES agencies(id),
    operator_id UUID REFERENCES operators(id),
    tour_id UUID NOT NULL REFERENCES tours(id),
    guide_id UUID REFERENCES guides(id),
    
    -- Fechas
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    departure_date TIMESTAMP WITH TIME ZONE NOT NULL,
    return_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Financiero
    total_amount NUMERIC(10, 2) NOT NULL,
    paid_amount NUMERIC(10, 2) DEFAULT 0,
    commission_amount NUMERIC(10, 2) DEFAULT 0,
    refund_amount NUMERIC(10, 2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Participantes
    participants_count INTEGER DEFAULT 1,
    participants JSONB NOT NULL,
    lead_traveler_name VARCHAR(255) NOT NULL,
    lead_traveler_email VARCHAR(255) NOT NULL,
    lead_traveler_phone VARCHAR(50),
    
    -- Operacional
    special_requirements TEXT,
    dietary_restrictions JSONB,
    accessibility_needs JSONB,
    pickup_location JSONB,
    dropoff_location JSONB,
    
    -- Tracking en tiempo real (PostGIS)
    current_location GEOGRAPHY(POINT, 4326),
    last_location_update TIMESTAMP WITH TIME ZONE,
    tracking_enabled BOOLEAN DEFAULT FALSE,
    
    -- Comunicación
    notifications_sent JSONB DEFAULT '[]'::jsonb,
    last_notification_sent TIMESTAMP WITH TIME ZONE,
    chat_thread_id VARCHAR(50),
    
    -- Calidad y feedback
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    review_date TIMESTAMP WITH TIME ZONE,
    nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
    
    -- Cancelación/Modificación
    cancellation_reason TEXT,
    cancelled_by UUID,
    modification_history JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    source VARCHAR(50),
    device_type VARCHAR(50),
    ip_address VARCHAR(50),
    user_agent VARCHAR(255),
    utm_params JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'upcoming', 'in_progress', 'completed', 
        'cancelled', 'refunded', 'no_show', 'modified', 
        'waiting_list', 'priority'
    )),
    CONSTRAINT valid_channel CHECK (channel IN ('b2c', 'b2b', 'b2b2c')),
    CONSTRAINT valid_payment_status CHECK (payment_status IN (
        'pending', 'partial', 'paid', 'refunded', 'failed'
    ))
);

-- ============================================================================
-- Trip Status History (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
    
    from_status VARCHAR(20) NOT NULL,
    to_status VARCHAR(20) NOT NULL,
    
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    changed_by UUID REFERENCES users(id),
    reason TEXT,
    
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- Trip Notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
    
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    delivered BOOLEAN DEFAULT FALSE,
    opened BOOLEAN DEFAULT FALSE,
    clicked BOOLEAN DEFAULT FALSE,
    
    subject VARCHAR(255),
    content TEXT,
    
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_notification_channel CHECK (channel IN (
        'email', 'sms', 'push', 'whatsapp'
    ))
);

-- ============================================================================
-- Trip Chat (Real-time Communication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
    
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_type VARCHAR(20) NOT NULL,
    
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    location GEOGRAPHY(POINT, 4326),
    attachment_url VARCHAR(500),
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_sender_type CHECK (sender_type IN (
        'customer', 'guide', 'agent', 'support'
    ))
);

-- ============================================================================
-- Trip Tracking (GPS History)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
    
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    speed NUMERIC(5, 2),
    altitude NUMERIC(7, 2),
    accuracy NUMERIC(6, 2),
    
    activity VARCHAR(50),
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_activity CHECK (activity IS NULL OR activity IN (
        'walking', 'driving', 'stopped', 'unknown'
    ))
);

-- ============================================================================
-- Trip Documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
    
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_url VARCHAR(500) NOT NULL,
    
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    downloaded BOOLEAN DEFAULT FALSE,
    downloaded_at TIMESTAMP WITH TIME ZONE,
    
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT valid_document_type CHECK (document_type IN (
        'voucher', 'invoice', 'ticket', 'insurance', 'confirmation', 'other'
    ))
);

-- ============================================================================
-- Trip Metrics (Analytics & AI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL UNIQUE REFERENCES trips(trip_id) ON DELETE CASCADE,
    
    -- Tiempos
    booking_to_departure_days INTEGER,
    total_duration_minutes INTEGER,
    
    -- Engagement
    page_views INTEGER DEFAULT 0,
    documents_downloaded INTEGER DEFAULT 0,
    chat_messages_sent INTEGER DEFAULT 0,
    
    -- Quality
    on_time_departure BOOLEAN,
    on_time_return BOOLEAN,
    incidents_reported INTEGER DEFAULT 0,
    
    -- Financial
    profit_margin NUMERIC(5, 2),
    commission_paid NUMERIC(10, 2),
    
    -- Satisfaction
    nps_score INTEGER CHECK (nps_score IS NULL OR (nps_score >= 0 AND nps_score <= 10)),
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    review_sentiment VARCHAR(20) CHECK (review_sentiment IS NULL OR review_sentiment IN (
        'positive', 'neutral', 'negative'
    )),
    
    -- Predictions (IA)
    cancellation_risk_score NUMERIC(3, 2) CHECK (cancellation_risk_score IS NULL OR 
        (cancellation_risk_score >= 0 AND cancellation_risk_score <= 1)),
    upsell_opportunity_score NUMERIC(3, 2) CHECK (upsell_opportunity_score IS NULL OR 
        (upsell_opportunity_score >= 0 AND upsell_opportunity_score <= 1)),
    repeat_booking_probability NUMERIC(3, 2) CHECK (repeat_booking_probability IS NULL OR 
        (repeat_booking_probability >= 0 AND repeat_booking_probability <= 1)),
    
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Trips table indexes
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_channel ON trips(channel);
CREATE INDEX IF NOT EXISTS idx_trips_departure ON trips(departure_date);
CREATE INDEX IF NOT EXISTS idx_trips_customer ON trips(customer_id);
CREATE INDEX IF NOT EXISTS idx_trips_agency ON trips(agency_id);
CREATE INDEX IF NOT EXISTS idx_trips_operator ON trips(operator_id);
CREATE INDEX IF NOT EXISTS idx_trips_booking_ref ON trips(booking_reference);
CREATE INDEX IF NOT EXISTS idx_trips_payment_status ON trips(payment_status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at);
CREATE INDEX IF NOT EXISTS idx_trips_location ON trips USING GIST (current_location);

-- Trip status history indexes
CREATE INDEX IF NOT EXISTS idx_trip_status_history_trip ON trip_status_history(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_status_history_date ON trip_status_history(changed_at);

-- Trip notifications indexes
CREATE INDEX IF NOT EXISTS idx_trip_notifications_trip ON trip_notifications(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_type ON trip_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_trip_notifications_channel ON trip_notifications(channel);

-- Trip chats indexes
CREATE INDEX IF NOT EXISTS idx_trip_chats_trip ON trip_chats(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_chats_sender ON trip_chats(sender_id);
CREATE INDEX IF NOT EXISTS idx_trip_chats_sent_at ON trip_chats(sent_at);

-- Trip tracking indexes
CREATE INDEX IF NOT EXISTS idx_trip_tracking_trip ON trip_tracking(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_tracking_timestamp ON trip_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_trip_tracking_location ON trip_tracking USING GIST (location);

-- Trip documents indexes
CREATE INDEX IF NOT EXISTS idx_trip_documents_trip ON trip_documents(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_documents_type ON trip_documents(document_type);

-- Trip metrics indexes
CREATE INDEX IF NOT EXISTS idx_trip_metrics_trip ON trip_metrics(trip_id);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for trips table
CREATE TRIGGER trigger_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_trips_updated_at();

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_trip_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO trip_status_history (
            trip_id,
            from_status,
            to_status,
            changed_at,
            reason
        ) VALUES (
            NEW.trip_id,
            OLD.status,
            NEW.status,
            NOW(),
            'Automatic status change'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic status history
CREATE TRIGGER trigger_log_trip_status_change
    AFTER UPDATE ON trips
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION log_trip_status_change();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE trips IS 'Main trips/bookings table - Superior to Expedia TAAP with 10 states, multi-channel support, and real-time tracking';
COMMENT ON COLUMN trips.status IS '10 granular states: pending, upcoming, in_progress, completed, cancelled, refunded, no_show, modified, waiting_list, priority';
COMMENT ON COLUMN trips.channel IS 'Booking channel: b2c (direct), b2b (agency), b2b2c (operator via agency)';
COMMENT ON COLUMN trips.current_location IS 'Real-time GPS location using PostGIS geography type';
COMMENT ON TABLE trip_status_history IS 'Complete audit trail of all status changes';
COMMENT ON TABLE trip_chats IS 'Integrated real-time chat system (feature not in Expedia)';
COMMENT ON TABLE trip_tracking IS 'GPS tracking history updated every 30 seconds (feature not in Expedia)';
COMMENT ON TABLE trip_metrics IS 'Advanced analytics with AI predictions';

-- ============================================================================
-- Migration Complete
-- ============================================================================
