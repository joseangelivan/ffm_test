-- SMTP Configurations Table
CREATE TABLE IF NOT EXISTS smtp_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN DEFAULT TRUE,
    auth_user VARCHAR(255) NOT NULL,
    auth_pass TEXT NOT NULL, -- Storing as text, should be encrypted in a real app
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for smtp_configurations table
DROP TRIGGER IF EXISTS update_smtp_configurations_updated_at ON smtp_configurations;
CREATE TRIGGER update_smtp_configurations_updated_at
BEFORE UPDATE ON smtp_configurations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
