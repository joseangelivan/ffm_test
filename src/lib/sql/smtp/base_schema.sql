CREATE TABLE IF NOT EXISTS smtp_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN DEFAULT TRUE,
    auth_user VARCHAR(255) NOT NULL,
    auth_pass VARCHAR(255) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para la tabla smtp_configurations
DROP TRIGGER IF EXISTS set_timestamp_smtp_configurations ON smtp_configurations;
CREATE TRIGGER set_timestamp_smtp_configurations
BEFORE UPDATE ON smtp_configurations
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
