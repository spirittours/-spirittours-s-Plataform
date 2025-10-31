-- ============================================================================
-- Spirit Tours - Rollback All Migrations
-- 
-- WARNING: This will DROP all tables created by the migrations
-- Use with extreme caution in production environments!
-- 
-- Usage:
--   psql -U postgres -d spirit_tours -f 999_rollback_all.sql
-- ============================================================================

\echo '================================'
\echo 'Spirit Tours - ROLLBACK ALL MIGRATIONS'
\echo '================================'
\echo ''
\echo 'WARNING: This will delete all data in trips, notifications, and WhatsApp tables!'
\echo 'Press Ctrl+C to cancel, or wait 5 seconds to continue...'
\echo ''

-- Give user time to cancel
SELECT pg_sleep(5);

\echo 'Starting rollback...'
\echo ''

-- ============================================================================
-- Drop Views First (dependencies)
-- ============================================================================
\echo '>>> Dropping Views'
DROP VIEW IF EXISTS v_whatsapp_availability_stats CASCADE;
DROP VIEW IF EXISTS v_whatsapp_template_stats CASCADE;
DROP VIEW IF EXISTS v_whatsapp_message_stats CASCADE;
DROP VIEW IF EXISTS v_user_notification_summary CASCADE;
DROP VIEW IF EXISTS v_daily_notification_stats CASCADE;
\echo '✓ Views dropped'
\echo ''

-- ============================================================================
-- Drop Functions
-- ============================================================================
\echo '>>> Dropping Functions'
DROP FUNCTION IF EXISTS increment_template_usage() CASCADE;
DROP FUNCTION IF EXISTS reset_whatsapp_daily_counter() CASCADE;
DROP FUNCTION IF EXISTS clean_expired_whatsapp_cache() CASCADE;
DROP FUNCTION IF EXISTS reset_monthly_sms_budget() CASCADE;
DROP FUNCTION IF EXISTS calculate_monthly_notification_savings() CASCADE;
DROP FUNCTION IF EXISTS update_user_prefs_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_whatsapp_config_updated_at() CASCADE;
DROP FUNCTION IF EXISTS log_trip_status_change() CASCADE;
DROP FUNCTION IF EXISTS update_trips_updated_at() CASCADE;
\echo '✓ Functions dropped'
\echo ''

-- ============================================================================
-- Drop WhatsApp Tables
-- ============================================================================
\echo '>>> Dropping WhatsApp Tables'
DROP TABLE IF EXISTS whatsapp_webhook_events CASCADE;
DROP TABLE IF EXISTS whatsapp_incoming_messages CASCADE;
DROP TABLE IF EXISTS whatsapp_availability_cache CASCADE;
DROP TABLE IF EXISTS whatsapp_templates CASCADE;
DROP TABLE IF EXISTS whatsapp_messages CASCADE;
DROP TABLE IF EXISTS whatsapp_config CASCADE;
\echo '✓ WhatsApp tables dropped'
\echo ''

-- ============================================================================
-- Drop Notification Tables
-- ============================================================================
\echo '>>> Dropping Notification Tables'
DROP TABLE IF EXISTS smart_notification_logs CASCADE;
DROP TABLE IF EXISTS user_notification_preferences CASCADE;
DROP TABLE IF EXISTS notification_settings CASCADE;
\echo '✓ Notification tables dropped'
\echo ''

-- ============================================================================
-- Drop Trips Tables (in reverse order due to dependencies)
-- ============================================================================
\echo '>>> Dropping Trips Tables'
DROP TABLE IF EXISTS trip_metrics CASCADE;
DROP TABLE IF EXISTS trip_documents CASCADE;
DROP TABLE IF EXISTS trip_tracking CASCADE;
DROP TABLE IF EXISTS trip_chats CASCADE;
DROP TABLE IF EXISTS trip_notifications CASCADE;
DROP TABLE IF EXISTS trip_status_history CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
\echo '✓ Trips tables dropped'
\echo ''

-- ============================================================================
-- Verify Cleanup
-- ============================================================================
\echo '>>> Verifying Cleanup'
\echo ''

\echo 'Remaining Trip-related Tables:'
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'trip%';
\echo ''

\echo 'Remaining WhatsApp Tables:'
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'whatsapp%';
\echo ''

\echo 'Remaining Notification Tables:'
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('notification_settings', 'user_notification_preferences', 'smart_notification_logs');
\echo ''

\echo '================================'
\echo 'Rollback Completed ✓'
\echo '================================'
\echo ''
\echo 'To re-apply migrations, run: 000_run_all_migrations.sql'
