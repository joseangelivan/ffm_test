
CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(255) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_update_app_settings_updated_at ON app_settings;
CREATE TRIGGER trigger_update_app_settings_updated_at
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
