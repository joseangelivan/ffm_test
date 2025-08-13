CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS smtp_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL,
    secure BOOLEAN DEFAULT TRUE,
    auth_user VARCHAR(255) NOT NULL,
    auth_pass TEXT NOT NULL,
    priority INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON smtp_configurations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
