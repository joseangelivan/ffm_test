CREATE TABLE IF NOT EXISTS smtp_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN NOT NULL DEFAULT TRUE,
    auth_user TEXT NOT NULL,
    auth_pass TEXT NOT NULL,
    priority INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_smtp_configurations_updated_at
BEFORE UPDATE ON smtp_configurations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
