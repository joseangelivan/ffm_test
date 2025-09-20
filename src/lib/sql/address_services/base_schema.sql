
CREATE TABLE IF NOT EXISTS address_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    config_json JSONB NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_update_address_services_updated_at ON address_services;
CREATE TRIGGER trigger_update_address_services_updated_at
BEFORE UPDATE ON address_services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
