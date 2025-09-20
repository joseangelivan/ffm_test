CREATE TABLE IF NOT EXISTS geocoding_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    config_json JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trigger_update_geocoding_services_updated_at
BEFORE UPDATE ON geocoding_services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
