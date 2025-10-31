-- ============================================================================
-- Spirit Tours - Seed Data Script
-- Generate realistic test data for development and testing
-- 
-- Usage:
--   psql -U postgres -d spirit_tours -f backend/migrations/seed_data.sql
-- 
-- WARNING: This will INSERT data. Make sure migrations are run first.
-- ============================================================================

\echo '================================'
\echo 'Spirit Tours - Seeding Test Data'
\echo '================================'
\echo ''

-- ============================================================================
-- ASSUMPTION: Base tables exist (users, agencies, operators, tours, guides)
-- If these don't exist, you'll need to create them first or comment out FKs
-- ============================================================================

-- ============================================================================
-- 1. Notification Settings (Admin Configuration)
-- ============================================================================
\echo '>>> Seeding Notification Settings'

INSERT INTO notification_settings (
    id,
    whatsapp_enabled,
    email_enabled,
    sms_enabled,
    default_strategy,
    monthly_sms_budget,
    sms_spent_current_month,
    sms_budget_alert_threshold,
    auto_fallback_to_sms,
    check_whatsapp_availability,
    max_whatsapp_per_minute,
    max_email_per_minute,
    max_sms_per_minute,
    quiet_hours_start,
    quiet_hours_end,
    respect_quiet_hours,
    updated_by
) VALUES (
    1,
    true,
    true,
    false,  -- SMS disabled by default to save costs
    'cost_optimized',
    100.00,  -- $100/month SMS budget
    12.50,   -- $12.50 spent so far
    0.80,    -- Alert at 80%
    false,
    true,
    60,
    100,
    30,
    22,  -- 10 PM
    8,   -- 8 AM
    true,
    'admin@spirit-tours.com'
) ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW(),
    updated_by = EXCLUDED.updated_by;

\echo '✓ Notification settings seeded'
\echo ''

-- ============================================================================
-- 2. User Notification Preferences (Sample Users)
-- ============================================================================
\echo '>>> Seeding User Notification Preferences'

INSERT INTO user_notification_preferences (
    user_id,
    phone_number,
    email,
    whatsapp_number,
    has_whatsapp,
    last_whatsapp_check,
    preferred_channel,
    allow_whatsapp,
    allow_email,
    allow_sms,
    allow_push,
    allow_booking_notifications,
    allow_payment_notifications,
    allow_marketing_notifications,
    allow_support_notifications,
    language,
    timezone
) VALUES
    -- User 1: WhatsApp user
    (
        'user-001',
        '+52-555-1234567',
        'juan.perez@email.com',
        '+52-555-1234567',
        true,
        NOW() - INTERVAL '2 hours',
        'whatsapp',
        true, true, true, true,
        true, true, false, true,
        'es',
        'America/Mexico_City'
    ),
    -- User 2: Email only user
    (
        'user-002',
        '+1-555-9876543',
        'maria.garcia@email.com',
        NULL,
        false,
        NOW() - INTERVAL '12 hours',
        'email',
        false, true, true, true,
        true, true, true, true,
        'en',
        'America/New_York'
    ),
    -- User 3: All channels
    (
        'user-003',
        '+52-555-5555555',
        'carlos.lopez@email.com',
        '+52-555-5555555',
        true,
        NOW() - INTERVAL '6 hours',
        'whatsapp',
        true, true, true, true,
        true, true, true, true,
        'es',
        'America/Mexico_City'
    ),
    -- User 4: No WhatsApp, SMS fallback
    (
        'user-004',
        '+1-555-1112222',
        'emily.smith@email.com',
        NULL,
        false,
        NOW() - INTERVAL '18 hours',
        'email',
        false, true, true, false,
        true, true, false, true,
        'en',
        'America/Los_Angeles'
    ),
    -- User 5: VIP user with all notifications
    (
        'user-005',
        '+52-555-9999999',
        'ricardo.vip@email.com',
        '+52-555-9999999',
        true,
        NOW() - INTERVAL '1 hour',
        'whatsapp',
        true, true, true, true,
        true, true, true, true,
        'es',
        'America/Mexico_City'
    )
ON CONFLICT (user_id) DO NOTHING;

\echo '✓ User notification preferences seeded (5 users)'
\echo ''

-- ============================================================================
-- 3. Sample Trips (Various States)
-- ============================================================================
\echo '>>> Seeding Sample Trips'

-- Note: Adjust UUIDs to match your actual users/agencies/tours/guides
INSERT INTO trips (
    booking_reference,
    status,
    channel,
    customer_id,
    tour_id,
    departure_date,
    return_date,
    total_amount,
    paid_amount,
    payment_status,
    participants_count,
    participants,
    lead_traveler_name,
    lead_traveler_email,
    lead_traveler_phone,
    tracking_enabled,
    source
) VALUES
    -- Trip 1: Upcoming trip
    (
        'ST-2024-001',
        'upcoming',
        'b2c',
        gen_random_uuid(),  -- Replace with actual customer_id
        gen_random_uuid(),  -- Replace with actual tour_id
        NOW() + INTERVAL '7 days',
        NOW() + INTERVAL '9 days',
        1500.00,
        1500.00,
        'paid',
        2,
        '[{"name": "Juan Pérez", "age": 35, "document": "ABC123"}, {"name": "María Pérez", "age": 32, "document": "DEF456"}]'::jsonb,
        'Juan Pérez',
        'juan.perez@email.com',
        '+52-555-1234567',
        true,
        'web'
    ),
    -- Trip 2: In progress trip
    (
        'ST-2024-002',
        'in_progress',
        'b2c',
        gen_random_uuid(),
        gen_random_uuid(),
        NOW() - INTERVAL '2 hours',
        NOW() + INTERVAL '4 hours',
        800.00,
        800.00,
        'paid',
        4,
        '[{"name": "Carlos López", "age": 45}, {"name": "Ana López", "age": 42}, {"name": "Pedro López", "age": 15}, {"name": "Sofia López", "age": 12}]'::jsonb,
        'Carlos López',
        'carlos.lopez@email.com',
        '+52-555-5555555',
        true,
        'mobile'
    ),
    -- Trip 3: Completed trip
    (
        'ST-2024-003',
        'completed',
        'b2b',
        gen_random_uuid(),
        gen_random_uuid(),
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '1 day',
        2500.00,
        2500.00,
        'paid',
        6,
        '[{"name": "Emily Smith", "age": 28}, {"name": "John Doe", "age": 30}]'::jsonb,
        'Emily Smith',
        'emily.smith@email.com',
        '+1-555-1112222',
        false,
        'web'
    ),
    -- Trip 4: Cancelled trip
    (
        'ST-2024-004',
        'cancelled',
        'b2c',
        gen_random_uuid(),
        gen_random_uuid(),
        NOW() + INTERVAL '14 days',
        NOW() + INTERVAL '16 days',
        1200.00,
        1200.00,
        'refunded',
        3,
        '[{"name": "Ricardo VIP", "age": 50}]'::jsonb,
        'Ricardo VIP',
        'ricardo.vip@email.com',
        '+52-555-9999999',
        false,
        'api'
    ),
    -- Trip 5: Pending payment
    (
        'ST-2024-005',
        'pending',
        'b2c',
        gen_random_uuid(),
        gen_random_uuid(),
        NOW() + INTERVAL '30 days',
        NOW() + INTERVAL '32 days',
        3200.00,
        1600.00,
        'partial',
        8,
        '[{"name": "María García", "age": 40}]'::jsonb,
        'María García',
        'maria.garcia@email.com',
        '+1-555-9876543',
        false,
        'web'
    )
ON CONFLICT (booking_reference) DO NOTHING;

\echo '✓ Sample trips seeded (5 trips)'
\echo ''

-- ============================================================================
-- 4. Trip Status History (Audit Trail)
-- ============================================================================
\echo '>>> Seeding Trip Status History'

-- Get trip IDs for history (using booking references)
DO $$
DECLARE
    trip_id_1 UUID;
    trip_id_2 UUID;
    trip_id_3 UUID;
BEGIN
    -- Get trip IDs
    SELECT trip_id INTO trip_id_1 FROM trips WHERE booking_reference = 'ST-2024-001';
    SELECT trip_id INTO trip_id_2 FROM trips WHERE booking_reference = 'ST-2024-002';
    SELECT trip_id INTO trip_id_3 FROM trips WHERE booking_reference = 'ST-2024-003';

    -- Trip 1 history: pending -> upcoming
    INSERT INTO trip_status_history (trip_id, from_status, to_status, changed_at, reason)
    VALUES (trip_id_1, 'pending', 'upcoming', NOW() - INTERVAL '2 days', 'Payment confirmed');

    -- Trip 2 history: pending -> upcoming -> in_progress
    INSERT INTO trip_status_history (trip_id, from_status, to_status, changed_at, reason)
    VALUES 
        (trip_id_2, 'pending', 'upcoming', NOW() - INTERVAL '5 days', 'Payment confirmed'),
        (trip_id_2, 'upcoming', 'in_progress', NOW() - INTERVAL '2 hours', 'Trip started');

    -- Trip 3 history: full cycle
    INSERT INTO trip_status_history (trip_id, from_status, to_status, changed_at, reason)
    VALUES 
        (trip_id_3, 'pending', 'upcoming', NOW() - INTERVAL '10 days', 'Payment confirmed'),
        (trip_id_3, 'upcoming', 'in_progress', NOW() - INTERVAL '3 days', 'Trip started'),
        (trip_id_3, 'in_progress', 'completed', NOW() - INTERVAL '1 day', 'Trip completed successfully');
END $$;

\echo '✓ Trip status history seeded'
\echo ''

-- ============================================================================
-- 5. Smart Notification Logs (Sample Notifications)
-- ============================================================================
\echo '>>> Seeding Smart Notification Logs'

INSERT INTO smart_notification_logs (
    user_id,
    attempt_number,
    strategy_used,
    channel_used,
    channels_attempted,
    status,
    notification_type,
    subject,
    content_preview,
    cost_incurred,
    cost_saved,
    whatsapp_check_performed,
    whatsapp_available,
    sent_at,
    delivered_at
) VALUES
    -- WhatsApp notification (successful)
    (
        'user-001',
        1,
        'cost_optimized',
        'whatsapp',
        '["whatsapp"]'::jsonb,
        'delivered',
        'booking_confirmation',
        'Confirmación de Reserva ST-2024-001',
        'Tu reserva ha sido confirmada...',
        0.00,  -- Free
        0.06,  -- Saved SMS cost
        true,
        true,
        NOW() - INTERVAL '1 hour',
        NOW() - INTERVAL '58 minutes'
    ),
    -- Email notification (WhatsApp not available)
    (
        'user-002',
        2,
        'cost_optimized',
        'email',
        '["whatsapp", "email"]'::jsonb,
        'delivered',
        'payment_reminder',
        'Payment Reminder',
        'Your payment is due...',
        0.00,  -- Free
        0.06,  -- Saved SMS cost
        true,
        false,
        NOW() - INTERVAL '3 hours',
        NOW() - INTERVAL '3 hours'
    ),
    -- SMS notification (fallback, cost incurred)
    (
        'user-004',
        3,
        'cost_optimized',
        'sms',
        '["whatsapp", "email", "sms"]'::jsonb,
        'delivered',
        'urgent_update',
        'Urgent Trip Update',
        'Important update regarding your trip...',
        0.06,  -- SMS cost
        0.00,
        true,
        false,
        NOW() - INTERVAL '30 minutes',
        NOW() - INTERVAL '29 minutes'
    ),
    -- WhatsApp notification (booking update)
    (
        'user-003',
        1,
        'cost_optimized',
        'whatsapp',
        '["whatsapp"]'::jsonb,
        'delivered',
        'trip_update',
        'Actualización de Viaje',
        'Tu viaje ha sido actualizado...',
        0.00,
        0.06,
        true,
        true,
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '115 minutes'
    ),
    -- Failed notification (all channels)
    (
        'user-005',
        3,
        'cost_optimized',
        'email',
        '["whatsapp", "email", "sms"]'::jsonb,
        'failed',
        'marketing',
        'Special Offer',
        'Exclusive offer for VIP customers...',
        0.00,
        0.00,
        true,
        true,
        NOW() - INTERVAL '1 day',
        NULL
    )
ON CONFLICT DO NOTHING;

\echo '✓ Smart notification logs seeded (5 notifications)'
\echo ''

-- ============================================================================
-- 6. WhatsApp Configuration (Sample Config)
-- ============================================================================
\echo '>>> Seeding WhatsApp Configuration'

INSERT INTO whatsapp_config (
    phone_number_id,
    business_account_id,
    access_token,
    webhook_url,
    webhook_verify_token,
    enabled,
    verified,
    last_verified_at,
    daily_message_limit,
    messages_sent_today,
    api_version,
    display_name,
    phone_number,
    quality_rating
) VALUES (
    '123456789012345',
    '987654321098765',
    'EAAG...sample_token...XYZ',  -- Replace with actual token in production
    'https://your-domain.com/api/whatsapp/webhook',
    'your_verify_token_12345',
    true,
    true,
    NOW() - INTERVAL '1 day',
    1000,
    47,
    'v18.0',
    'Spirit Tours',
    '+52-555-0001111',
    'GREEN'
) ON CONFLICT (phone_number_id) DO UPDATE SET
    updated_at = NOW();

\echo '✓ WhatsApp configuration seeded'
\echo ''

-- ============================================================================
-- 7. WhatsApp Templates (Sample Templates)
-- ============================================================================
\echo '>>> Seeding WhatsApp Templates'

INSERT INTO whatsapp_templates (
    template_name,
    template_id,
    category,
    language,
    header_type,
    body_content,
    footer_content,
    status,
    approved_at,
    times_sent
) VALUES
    -- Booking confirmation template
    (
        'booking_confirmation',
        'template_001',
        'UTILITY',
        'es',
        'text',
        'Hola {{1}}, tu reserva {{2}} ha sido confirmada para el {{3}}. ¡Nos vemos pronto!',
        'Spirit Tours - Experiencias Inolvidables',
        'approved',
        NOW() - INTERVAL '30 days',
        145
    ),
    -- Payment reminder template
    (
        'payment_reminder',
        'template_002',
        'UTILITY',
        'es',
        'text',
        'Hola {{1}}, te recordamos que el pago de tu reserva {{2}} vence el {{3}}.',
        'Spirit Tours',
        'approved',
        NOW() - INTERVAL '25 days',
        89
    ),
    -- Trip update template
    (
        'trip_update',
        'template_003',
        'UTILITY',
        'es',
        'text',
        'Actualización importante sobre tu viaje {{1}}: {{2}}',
        'Cualquier duda, contáctanos',
        'approved',
        NOW() - INTERVAL '20 days',
        67
    ),
    -- Welcome message template
    (
        'welcome_message',
        'template_004',
        'UTILITY',
        'en',
        'text',
        'Welcome to Spirit Tours, {{1}}! We are excited to have you join us.',
        'Spirit Tours - Unforgettable Experiences',
        'approved',
        NOW() - INTERVAL '45 days',
        234
    )
ON CONFLICT (template_name) DO UPDATE SET
    times_sent = whatsapp_templates.times_sent + 1;

\echo '✓ WhatsApp templates seeded (4 templates)'
\echo ''

-- ============================================================================
-- 8. WhatsApp Availability Cache (Sample Cache)
-- ============================================================================
\echo '>>> Seeding WhatsApp Availability Cache'

INSERT INTO whatsapp_availability_cache (
    phone_number,
    has_whatsapp,
    checked_at,
    expires_at,
    verification_method
) VALUES
    ('+52-555-1234567', true, NOW() - INTERVAL '2 hours', NOW() + INTERVAL '22 hours', 'api'),
    ('+1-555-9876543', false, NOW() - INTERVAL '12 hours', NOW() + INTERVAL '12 hours', 'api'),
    ('+52-555-5555555', true, NOW() - INTERVAL '6 hours', NOW() + INTERVAL '18 hours', 'api'),
    ('+1-555-1112222', false, NOW() - INTERVAL '18 hours', NOW() + INTERVAL '6 hours', 'api'),
    ('+52-555-9999999', true, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '23 hours', 'api')
ON CONFLICT (phone_number) DO UPDATE SET
    has_whatsapp = EXCLUDED.has_whatsapp,
    checked_at = EXCLUDED.checked_at,
    expires_at = EXCLUDED.expires_at;

\echo '✓ WhatsApp availability cache seeded (5 entries)'
\echo ''

-- ============================================================================
-- Verification Queries
-- ============================================================================
\echo '>>> Verification'
\echo ''

\echo 'Notification Settings:'
SELECT id, whatsapp_enabled, email_enabled, sms_enabled, monthly_sms_budget 
FROM notification_settings;
\echo ''

\echo 'User Preferences Count:'
SELECT COUNT(*) as user_prefs_count FROM user_notification_preferences;
\echo ''

\echo 'Trips by Status:'
SELECT status, COUNT(*) as count FROM trips GROUP BY status ORDER BY status;
\echo ''

\echo 'Notification Logs Summary:'
SELECT 
    channel_used,
    COUNT(*) as count,
    SUM(cost_incurred) as total_cost,
    SUM(cost_saved) as total_saved
FROM smart_notification_logs
GROUP BY channel_used
ORDER BY count DESC;
\echo ''

\echo 'WhatsApp Templates:'
SELECT template_name, category, status, times_sent FROM whatsapp_templates ORDER BY times_sent DESC;
\echo ''

\echo '================================'
\echo 'Seed Data Complete! ✓'
\echo '================================'
\echo ''
\echo 'Summary:'
\echo '- Notification settings configured'
\echo '- 5 user preferences'
\echo '- 5 sample trips (various states)'
\echo '- Trip status history'
\echo '- 5 notification logs'
\echo '- WhatsApp config and templates'
\echo '- Availability cache'
\echo ''
\echo 'You can now test the system with realistic data!'
