-- ============================================================================
-- Spirit Tours - Master Migration Script
-- Run All Migrations in Order
-- 
-- Usage:
--   psql -U postgres -d spirit_tours -f 000_run_all_migrations.sql
-- 
-- Or from Node.js:
--   const { Pool } = require('pg');
--   const fs = require('fs');
--   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
--   const sql = fs.readFileSync('000_run_all_migrations.sql', 'utf8');
--   await pool.query(sql);
-- ============================================================================

\echo '================================'
\echo 'Spirit Tours - Running Migrations'
\echo '================================'
\echo ''

-- Check PostgreSQL version
\echo 'PostgreSQL Version:'
SELECT version();
\echo ''

-- Check current database
\echo 'Current Database:'
SELECT current_database();
\echo ''

-- ============================================================================
-- Migration 001: Trips Tables
-- ============================================================================
\echo '>>> Running Migration 001: Trips Tables'
\i 001_create_trips_tables.sql
\echo '✓ Migration 001 completed'
\echo ''

-- ============================================================================
-- Migration 002: Notifications Tables
-- ============================================================================
\echo '>>> Running Migration 002: Notifications Tables'
\i 002_create_notifications_tables.sql
\echo '✓ Migration 002 completed'
\echo ''

-- ============================================================================
-- Migration 003: WhatsApp Tables
-- ============================================================================
\echo '>>> Running Migration 003: WhatsApp Tables'
\i 003_create_whatsapp_tables.sql
\echo '✓ Migration 003 completed'
\echo ''

-- ============================================================================
-- Verify All Tables Created
-- ============================================================================
\echo '>>> Verifying All Tables'
\echo ''
\echo 'Trips System Tables:'
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'trip%'
ORDER BY tablename;
\echo ''

\echo 'Notification System Tables:'
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('notification_settings', 'user_notification_preferences', 'smart_notification_logs')
ORDER BY tablename;
\echo ''

\echo 'WhatsApp System Tables:'
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'whatsapp%'
ORDER BY tablename;
\echo ''

-- ============================================================================
-- Summary Statistics
-- ============================================================================
\echo '>>> Migration Summary'
\echo ''
\echo 'Total Tables Created:'
SELECT COUNT(*) as table_count FROM pg_tables 
WHERE schemaname = 'public' 
AND (
    tablename LIKE 'trip%' OR 
    tablename LIKE 'whatsapp%' OR
    tablename IN ('notification_settings', 'user_notification_preferences', 'smart_notification_logs')
);
\echo ''

\echo 'Total Indexes Created:'
SELECT COUNT(*) as index_count FROM pg_indexes 
WHERE schemaname = 'public'
AND (
    tablename LIKE 'trip%' OR 
    tablename LIKE 'whatsapp%' OR
    tablename IN ('notification_settings', 'user_notification_preferences', 'smart_notification_logs')
);
\echo ''

\echo 'Total Views Created:'
SELECT COUNT(*) as view_count FROM pg_views
WHERE schemaname = 'public'
AND viewname LIKE 'v_%';
\echo ''

\echo '================================'
\echo 'All Migrations Completed Successfully! ✓'
\echo '================================'
