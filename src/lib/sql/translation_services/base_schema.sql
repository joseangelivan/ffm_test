
CREATE TABLE IF NOT EXISTS translation_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    config_json JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    supported_languages JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_update_translation_services_updated_at ON translation_services;
CREATE TRIGGER trigger_update_translation_services_updated_at
BEFORE UPDATE ON translation_services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
