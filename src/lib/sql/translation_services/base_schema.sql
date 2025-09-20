
CREATE TABLE IF NOT EXISTS translation_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    config_json JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    supported_languages JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON translation_services
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
