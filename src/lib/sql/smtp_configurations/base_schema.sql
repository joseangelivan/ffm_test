CREATE TABLE IF NOT EXISTS smtp_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN NOT NULL,
    auth_user VARCHAR(255) NOT NULL,
    auth_pass TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_smtp_configurations ON smtp_configurations;
CREATE TRIGGER set_timestamp_smtp_configurations
BEFORE UPDATE ON smtp_configurations
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
