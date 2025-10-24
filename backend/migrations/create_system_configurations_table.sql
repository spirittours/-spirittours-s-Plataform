-- Spirit Tours - System Configurations Table
-- Stores all system configuration values with encryption support and audit trail

-- Main configurations table
CREATE TABLE IF NOT EXISTS system_configurations (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(255) UNIQUE NOT NULL,
  config_value TEXT,
  category VARCHAR(50) NOT NULL,
  is_encrypted BOOLEAN DEFAULT FALSE,
  is_required BOOLEAN DEFAULT FALSE,
  field_type VARCHAR(50) DEFAULT 'text',
  description TEXT,
  updated_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configuration history table for audit trail
CREATE TABLE IF NOT EXISTS configuration_history (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(255) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  category VARCHAR(50),
  is_encrypted BOOLEAN DEFAULT FALSE,
  changed_by VARCHAR(255) NOT NULL,
  change_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_configurations_category ON system_configurations(category);
CREATE INDEX IF NOT EXISTS idx_system_configurations_key ON system_configurations(config_key);
CREATE INDEX IF NOT EXISTS idx_configuration_history_key ON configuration_history(config_key);
CREATE INDEX IF NOT EXISTS idx_configuration_history_changed_by ON configuration_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_configuration_history_created_at ON configuration_history(created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_system_configurations_updated_at ON system_configurations;
CREATE TRIGGER trigger_update_system_configurations_updated_at
  BEFORE UPDATE ON system_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_system_configurations_updated_at();

-- Function to log configuration changes to history
CREATE OR REPLACE FUNCTION log_configuration_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log to history table
  INSERT INTO configuration_history (
    config_key,
    old_value,
    new_value,
    category,
    is_encrypted,
    changed_by
  ) VALUES (
    COALESCE(NEW.config_key, OLD.config_key),
    OLD.config_value,
    NEW.config_value,
    COALESCE(NEW.category, OLD.category),
    COALESCE(NEW.is_encrypted, OLD.is_encrypted, FALSE),
    COALESCE(NEW.updated_by, 'system')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically log changes
DROP TRIGGER IF EXISTS trigger_log_configuration_change ON system_configurations;
CREATE TRIGGER trigger_log_configuration_change
  AFTER UPDATE ON system_configurations
  FOR EACH ROW
  WHEN (OLD.config_value IS DISTINCT FROM NEW.config_value)
  EXECUTE FUNCTION log_configuration_change();

-- Insert default configuration categories metadata
CREATE TABLE IF NOT EXISTS configuration_categories (
  id SERIAL PRIMARY KEY,
  category_key VARCHAR(50) UNIQUE NOT NULL,
  category_name VARCHAR(255) NOT NULL,
  icon VARCHAR(10),
  description TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert predefined categories
INSERT INTO configuration_categories (category_key, category_name, icon, description, display_order) VALUES
  ('database', 'Base de Datos', '🗄️', 'Configuración de PostgreSQL, Redis y MongoDB', 1),
  ('email', 'Email', '📧', 'Configuración de servicios de email (SMTP, SendGrid)', 2),
  ('payments', 'Pagos', '💳', 'Configuración de pasarelas de pago', 3),
  ('authentication', 'Autenticación', '🔐', 'JWT, OAuth y configuración de seguridad', 4),
  ('storage', 'Almacenamiento', '📦', 'AWS S3 y configuración de archivos', 5),
  ('monitoring', 'Monitoreo', '📊', 'Logging, Sentry, métricas', 6),
  ('security', 'Seguridad', '🛡️', 'Rate limiting, CORS, seguridad general', 7),
  ('integrations', 'Integraciones', '🔌', 'APIs externas y servicios de terceros', 8),
  ('features', 'Features', '🎯', 'Feature flags y configuración de funcionalidades', 9)
ON CONFLICT (category_key) DO NOTHING;

-- Configuration validation rules table
CREATE TABLE IF NOT EXISTS configuration_validation_rules (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(255) UNIQUE NOT NULL,
  validation_type VARCHAR(50), -- 'regex', 'range', 'enum', 'custom'
  validation_rule TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments for documentation
COMMENT ON TABLE system_configurations IS 'Stores all system configuration values';
COMMENT ON COLUMN system_configurations.config_key IS 'Unique configuration key (e.g., DB_HOST)';
COMMENT ON COLUMN system_configurations.config_value IS 'Configuration value (encrypted if sensitive)';
COMMENT ON COLUMN system_configurations.category IS 'Configuration category (database, email, etc.)';
COMMENT ON COLUMN system_configurations.is_encrypted IS 'Whether the value is encrypted';
COMMENT ON COLUMN system_configurations.is_required IS 'Whether this configuration is required for system operation';

COMMENT ON TABLE configuration_history IS 'Audit trail of all configuration changes';
COMMENT ON COLUMN configuration_history.changed_by IS 'User who made the change';
COMMENT ON COLUMN configuration_history.change_reason IS 'Optional reason for the change';

-- Sample query to get all configurations by category
-- SELECT config_key, config_value, is_encrypted, updated_at, updated_by
-- FROM system_configurations
-- WHERE category = 'database'
-- ORDER BY config_key;

-- Sample query to get configuration history
-- SELECT ch.config_key, ch.old_value, ch.new_value, ch.changed_by, ch.created_at
-- FROM configuration_history ch
-- WHERE ch.config_key = 'DB_HOST'
-- ORDER BY ch.created_at DESC
-- LIMIT 10;
