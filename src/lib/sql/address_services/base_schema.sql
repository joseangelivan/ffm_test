CREATE TABLE IF NOT EXISTS address_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    config_json JSONB NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_address_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row modification
CREATE TRIGGER address_services_updated_at_trigger
BEFORE UPDATE ON address_services
FOR EACH ROW
EXECUTE FUNCTION update_address_services_updated_at();

-- Ensure only one service can be default
CREATE UNIQUE INDEX one_default_address_service
ON address_services (is_default)
WHERE is_default = TRUE;

    