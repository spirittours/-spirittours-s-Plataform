-- Spirit Tours Database Initialization
-- Schema para la plataforma IA completa

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Agents table - Track de todos los agentes IA
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name VARCHAR(100) NOT NULL UNIQUE,
    agent_type VARCHAR(50) NOT NULL,
    track VARCHAR(10) NOT NULL CHECK (track IN ('track1', 'track2')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    config JSONB,
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table - Historial de conversaciones multi-canal
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id VARCHAR(100) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    participant_id VARCHAR(100) NOT NULL,
    participant_name VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active',
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, channel)
);

-- Messages table - Mensajes de todas las conversaciones
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_id VARCHAR(200) NOT NULL,
    sender_id VARCHAR(100) NOT NULL,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'agent', 'system')),
    channel VARCHAR(50) NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Bookings table - Reservas y tours
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID,
    tour_id UUID,
    status VARCHAR(20) DEFAULT 'pending',
    participants INTEGER DEFAULT 1,
    total_amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tour_date TIMESTAMP WITH TIME ZONE,
    special_requests TEXT,
    ai_agent_used VARCHAR(100),
    metadata JSONB DEFAULT '{}'
);

-- Tours table - Catálogo de tours
CREATE TABLE tours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    destination VARCHAR(100) NOT NULL,
    duration_hours INTEGER,
    max_participants INTEGER,
    base_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    availability JSONB DEFAULT '{}',
    features JSONB DEFAULT '[]',
    images JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT true
);

-- Customers table - Base de clientes
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    preferred_language VARCHAR(10) DEFAULT 'en',
    preferences JSONB DEFAULT '{}',
    channel_history JSONB DEFAULT '{}',
    total_bookings INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Analytics table - Métricas de performance de agentes
CREATE TABLE ai_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10,4),
    metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content generated table - Contenido generado por ContentMaster AI
CREATE TABLE generated_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(50) NOT NULL,
    title VARCHAR(300),
    content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    target_channel VARCHAR(50),
    seo_keywords JSONB DEFAULT '[]',
    performance_metrics JSONB DEFAULT '{}',
    generated_by VARCHAR(100) DEFAULT 'ContentMaster',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'draft'
);

-- Competitive intelligence table - Data de CompetitiveIntel AI
CREATE TABLE competitive_intelligence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_name VARCHAR(100) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    source_url VARCHAR(500),
    data JSONB NOT NULL,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    relevance_score DECIMAL(3,2),
    action_items JSONB DEFAULT '[]'
);

-- Indexes for performance
CREATE INDEX idx_conversations_channel ON conversations(channel);
CREATE INDEX idx_conversations_participant ON conversations(participant_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_channel ON messages(channel);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_tours_destination ON tours(destination);
CREATE INDEX idx_tours_active ON tours(active);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_ai_analytics_agent ON ai_analytics(agent_name);
CREATE INDEX idx_ai_analytics_recorded ON ai_analytics(recorded_at);
CREATE INDEX idx_content_type ON generated_content(content_type);
CREATE INDEX idx_content_status ON generated_content(status);
CREATE INDEX idx_competitive_data_type ON competitive_intelligence(data_type);

-- Insert initial agents data
INSERT INTO agents (agent_name, agent_type, track, status) VALUES
-- Track 1 Agents
('MultiChannelAgent', 'communication', 'track1', 'in_development'),
('ContentMasterAgent', 'content', 'track1', 'pending'),
('CompetitiveIntelAgent', 'intelligence', 'track1', 'pending'),
-- Track 2 Agents
('SecurityGuardAgent', 'security', 'track2', 'pending'),
('MarketEntryAgent', 'expansion', 'track2', 'pending'),
('InfluencerMatchAgent', 'marketing', 'track2', 'pending'),
('LuxuryUpsellAgent', 'sales', 'track2', 'pending'),
('RouteGeniusAgent', 'logistics', 'track2', 'pending');

-- Insert sample tours
INSERT INTO tours (title, description, destination, duration_hours, max_participants, base_price) VALUES
('City Walking Tour', 'Explore the historic city center with expert local guides', 'Barcelona', 3, 15, 45.00),
('Sunset Beach Experience', 'Romantic sunset tour with cocktails and local music', 'Santorini', 4, 20, 85.00),
('Mountain Adventure', 'Hiking and nature photography in stunning landscapes', 'Swiss Alps', 8, 12, 150.00),
('Cultural Immersion', 'Authentic local experiences with family homestay', 'Kyoto', 6, 8, 120.00),
('Culinary Discovery', 'Food tour with cooking class and market visit', 'Bangkok', 5, 10, 75.00);

-- Functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tours_updated_at BEFORE UPDATE ON tours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();