
CREATE TABLE IF NOT EXISTS smtp_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN NOT NULL,
    auth_user VARCHAR(255) NOT NULL,
    auth_pass TEXT NOT NULL, -- Should be encrypted in a real app
    priority INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON smtp_configurations
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
