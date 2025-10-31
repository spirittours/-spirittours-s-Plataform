-- Database initialization script
-- This script runs when the PostgreSQL container is first created

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS accounting;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS audit;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA accounting TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA analytics TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA audit TO postgres;

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit.audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit.audit_logs(resource_type, resource_id);

-- Create performance monitoring table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time_ms FLOAT NOT NULL,
    status_code INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    user_id VARCHAR(255),
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_perf_endpoint ON public.performance_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_perf_timestamp ON public.performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_perf_status ON public.performance_metrics(status_code);

-- Create health check function
CREATE OR REPLACE FUNCTION public.health_check()
RETURNS TABLE(status TEXT, database TEXT, timestamp TIMESTAMP) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'healthy'::TEXT as status,
        current_database()::TEXT as database,
        NOW() as timestamp;
END;
$$ LANGUAGE plpgsql;

-- Logging
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully';
    RAISE NOTICE 'Extensions: uuid-ossp, pg_trgm, btree_gin';
    RAISE NOTICE 'Schemas: public, accounting, analytics, audit';
END $$;
