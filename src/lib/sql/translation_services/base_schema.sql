CREATE TABLE IF NOT EXISTS translation_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    config_json JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    supported_languages JSONB,
    created_at TIMESTAMptZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_timestamp_translation_services ON translation_services;
CREATE TRIGGER set_timestamp_translation_services
BEFORE UPDATE ON translation_services
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
