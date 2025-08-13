CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS translation_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    config_json JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    supported_languages JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON translation_services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
