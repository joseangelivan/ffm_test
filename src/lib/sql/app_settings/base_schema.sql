CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(255) PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_app_settings ON app_settings;
CREATE TRIGGER set_timestamp_app_settings
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
